import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { NextFunction, Request, Response, Router } from 'express';

export interface SduiBundleInput {
  version: string;
  updatedAt?: string;
  featureFlags: Record<string, unknown>;
  themeTokens: Record<string, string>;
  screens: Record<string, unknown>;
}

export interface StoredOtaRelease {
  manifestRaw: string;
  manifestId: string;
  signatureHeader?: string;
  /** Rollout % từ 1..100 cho Canary Deployment (mặc định 100) */
  rolloutPercent?: number;
  /** 'active' | 'rolled_back' */
  status?: 'active' | 'rolled_back';
  /** Signed rollback directive JSON string nếu dùng RollBackToEmbedded */
  rollbackDirectiveRaw?: string;
  rollbackSignatureHeader?: string;
  /** Bản ổn định trước đó để phục vụ fallback/rollback tức thì */
  previousRelease?: {
    manifestRaw: string;
    manifestId: string;
    signatureHeader?: string;
  };
}

const SAFE_SEGMENT_RE = /^[a-zA-Z0-9._-]+$/;
const ALLOWED_PLATFORMS = new Set(['ios', 'android']);

function isSafeSegment(value: string): boolean {
  return Boolean(value) && value !== '.' && value !== '..' && SAFE_SEGMENT_RE.test(value);
}

function isInsideDir(baseDir: string, targetPath: string): boolean {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(targetPath);
  return resolvedTarget.startsWith(resolvedBase + path.sep);
}

function isDeviceInCanary(deviceId: string, manifestId: string, rolloutPercent: number): boolean {
  if (rolloutPercent >= 100) return true;
  if (rolloutPercent <= 0) return false;
  if (!deviceId) return false;
  const digest = crypto.createHash('sha256').update(`${manifestId}:${deviceId}`).digest();
  const bucket = digest.readUInt16BE(0) % 100;
  return bucket < rolloutPercent;
}

function buildCanonicalSdui(appId: string, bundle: SduiBundleInput) {
  const canonicalPayload = {
    appId,
    schemaVersion: 2,
    version: bundle.version,
    updatedAt: bundle.updatedAt || null,
    featureFlags: bundle.featureFlags || {},
    themeTokens: bundle.themeTokens || {},
    screens: bundle.screens || {},
  };
  const sha256 = crypto.createHash('sha256').update(JSON.stringify(canonicalPayload)).digest('hex');
  return { payload: canonicalPayload, sha256 };
}

function sendMultipartPart(
  res: Response,
  partName: 'manifest' | 'directive',
  bodyRaw: string,
  signatureHeader?: string
) {
  const boundary = `expo-updates-${crypto.randomBytes(12).toString('hex')}`;
  const partHeaders = [
    `Content-Disposition: form-data; name="${partName}"`,
    'Content-Type: application/json; charset=utf-8',
    ...(signatureHeader ? [`expo-signature: ${signatureHeader}`] : []),
  ].join('\r\n');

  const multipartBody = `--${boundary}\r\n${partHeaders}\r\n\r\n${bodyRaw}\r\n--${boundary}--\r\n`;

  res.setHeader('expo-protocol-version', '1');
  res.setHeader('expo-sfv-version', '0');
  res.setHeader('cache-control', 'private, max-age=0, no-store');
  res.setHeader('content-type', `multipart/mixed; boundary=${boundary}`);
  res.send(multipartBody);
}

/**
 * 📦 Two-Lane OTA & SDUI Server Route Template (Self-Hosted trên VPS)
 * - Làn A (/ota/manifest & /ota/assets/:hash): Expo Updates Protocol v1 + RSA Code Signing + Canary + Rollback.
 * - Làn B (/sdui/check & /sdui/bundle): JSON Schema SDUI nhất quán SHA-256 + ETag + Offline Cache.
 */
export function createFacebookLikeRouter(options: {
  appId: string;
  otaStorageDir: string;
  loadSduiBundle: (role?: string) => Promise<SduiBundleInput>;
  requireAdmin?: (req: Request, res: Response, next: NextFunction) => void;
}) {
  const router = Router();
  const storageRoot = path.resolve(options.otaStorageDir);

  // =========================================================================
  // LÀN A: SELF-HOSTED SIGNED JS/HERMES BUNDLE OTA (EXPO UPDATES PROTOCOL v1)
  // =========================================================================
  router.get('/ota/manifest', (req: Request, res: Response) => {
    const platform = String(req.header('expo-platform') || req.query.platform || '').toLowerCase();
    const runtimeVersion = String(req.header('expo-runtime-version') || req.query.runtimeVersion || '');
    const currentUpdateId = String(req.header('expo-current-update-id') || '');
    const channel = String(req.header('expo-channel-name') || 'production');
    const deviceId = String(req.header('expo-device-id') || req.header('x-device-id') || '');
    const acceptHeader = String(req.header('accept') || '');

    if (!ALLOWED_PLATFORMS.has(platform) || !isSafeSegment(runtimeVersion) || !isSafeSegment(channel)) {
      res.status(400).json({ error: 'Invalid expo-platform, expo-runtime-version, or expo-channel-name' });
      return;
    }

    const activeMetaPath = path.join(storageRoot, channel, runtimeVersion, platform, 'active.json');
    if (!isInsideDir(storageRoot, activeMetaPath) || !fs.existsSync(activeMetaPath)) {
      res.status(204).end();
      return;
    }

    let release: StoredOtaRelease;
    try {
      release = JSON.parse(fs.readFileSync(activeMetaPath, 'utf8')) as StoredOtaRelease;
    } catch {
      res.status(500).json({ error: 'Corrupt OTA metadata on server' });
      return;
    }

    // 1. Xử lý khi bản mới nhất bị Admin đánh dấu Rollback
    if (release.status === 'rolled_back') {
      if (release.previousRelease?.manifestRaw) {
        if (currentUpdateId && currentUpdateId === release.previousRelease.manifestId) {
          res.status(204).end();
          return;
        }
        res.setHeader('expo-protocol-version', '1');
        res.setHeader('expo-sfv-version', '0');
        res.setHeader('cache-control', 'private, max-age=0, no-store');
        if (release.previousRelease.signatureHeader) {
          res.setHeader('expo-signature', release.previousRelease.signatureHeader);
        }
        res.type('application/json').send(release.previousRelease.manifestRaw);
        return;
      }

      // RollBackToEmbedded Directive (Chỉ hợp lệ theo Expo Updates v1 khi client Accept multipart/mixed)
      if (release.rollbackDirectiveRaw && acceptHeader.includes('multipart/mixed')) {
        sendMultipartPart(res, 'directive', release.rollbackDirectiveRaw, release.rollbackSignatureHeader);
        return;
      }

      res.status(204).end();
      return;
    }

    // 2. Xử lý Canary Rollout % (Nếu device không nằm trong nhóm canary, phục vụ bản ổn định trước đó nếu có)
    const rolloutPercent = typeof release.rolloutPercent === 'number' ? release.rolloutPercent : 100;
    const targetRelease =
      isDeviceInCanary(deviceId, release.manifestId, rolloutPercent) || !release.previousRelease
        ? release
        : release.previousRelease;

    if (!targetRelease?.manifestRaw || (currentUpdateId && currentUpdateId === targetRelease.manifestId)) {
      res.status(204).end();
      return;
    }

    if (acceptHeader.includes('multipart/mixed')) {
      sendMultipartPart(res, 'manifest', targetRelease.manifestRaw, targetRelease.signatureHeader);
      return;
    }

    res.setHeader('expo-protocol-version', '1');
    res.setHeader('expo-sfv-version', '0');
    res.setHeader('cache-control', 'private, max-age=0, no-store');
    if (targetRelease.signatureHeader) {
      res.setHeader('expo-signature', targetRelease.signatureHeader);
    }
    res.type('application/json').send(targetRelease.manifestRaw);
  });

  router.get('/ota/assets/:hash', (req: Request, res: Response) => {
    const cleanHash = String(req.params.hash || '');
    const assetsDir = path.join(storageRoot, 'assets');
    const filePath = path.join(assetsDir, cleanHash);

    if (!isSafeSegment(cleanHash) || !isInsideDir(assetsDir, filePath) || !fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }

    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.sendFile(path.resolve(filePath));
  });

  // Admin Rollback 1-click endpoint (Khuyến nghị truyền options.requireAdmin xác thực quyền Admin)
  const adminGuard = options.requireAdmin || ((_req: Request, _res: Response, next: NextFunction) => next());

  router.post('/ota/rollback', adminGuard, (req: Request, res: Response) => {
    const platform = String(req.body?.platform || '').toLowerCase();
    const runtimeVersion = String(req.body?.runtimeVersion || '');
    const channel = String(req.body?.channel || 'production');

    if (!ALLOWED_PLATFORMS.has(platform) || !isSafeSegment(runtimeVersion) || !isSafeSegment(channel)) {
      res.status(400).json({ error: 'Invalid platform, runtimeVersion, or channel' });
      return;
    }

    const activeMetaPath = path.join(storageRoot, channel, runtimeVersion, platform, 'active.json');
    if (!isInsideDir(storageRoot, activeMetaPath) || !fs.existsSync(activeMetaPath)) {
      res.status(404).json({ error: 'No active release found for target' });
      return;
    }

    try {
      const release = JSON.parse(fs.readFileSync(activeMetaPath, 'utf8')) as StoredOtaRelease;
      release.status = 'rolled_back';
      fs.writeFileSync(activeMetaPath, JSON.stringify(release, null, 2), 'utf8');
      res.json({ success: true, rolledBackManifestId: release.manifestId });
    } catch {
      res.status(500).json({ error: 'Failed to update active release metadata' });
    }
  });

  // =========================================================================
  // LÀN B: INSTANT SERVER-DRIVEN UI (SDUI JSON + DETERMINISTIC SHA-256)
  // =========================================================================
  router.get('/sdui/check', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const role = typeof req.query.role === 'string' ? req.query.role : undefined;
      const clientHash = String(req.query.hash || '');
      const bundle = await options.loadSduiBundle(role);
      const { payload, sha256 } = buildCanonicalSdui(options.appId, bundle);

      res.json({
        hasUpdate: clientHash !== sha256,
        version: payload.version,
        sha256,
        bundleUrl: '/api/v1/sdui/bundle',
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/sdui/bundle', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const role = typeof req.query.role === 'string' ? req.query.role : undefined;
      const bundle = await options.loadSduiBundle(role);
      const { payload, sha256 } = buildCanonicalSdui(options.appId, bundle);
      const etag = `"${sha256}"`;

      if (req.header('if-none-match') === etag) {
        res.status(304).end();
        return;
      }

      res.setHeader('ETag', etag);
      res.setHeader('X-SDUI-SHA256', sha256);
      res.setHeader('Cache-Control', 'private, max-age=30');
      res.json({
        ...payload,
        sha256,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
