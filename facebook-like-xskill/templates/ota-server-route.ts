import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Router, Request, Response } from 'express';

/**
 * 📦 Two-Lane OTA & SDUI Server Route Template (Self-Hosted trên VPS)
 * - Làn A (/api/v1/ota/manifest & /assets/:hash): Expo Updates Protocol v1 + Chữ ký RSA.
 * - Làn B (/api/v1/sdui/check & /bundle): JSON Schema SDUI đổi form/banner/flags < 1 giây.
 */
export function createFacebookLikeRouter(options: {
  appId: string;
  otaStorageDir: string;
  loadSduiBundle: (role?: string) => Promise<{ version: string; featureFlags: Record<string, unknown>; themeTokens: Record<string, string>; screens: Record<string, unknown> }>;
}) {
  const router = Router();

  // =========================================================================
  // LÀN A: SELF-HOSTED SIGNED JS/HERMES BUNDLE OTA (EXPO UPDATES PROTOCOL v1)
  // =========================================================================
  router.get('/ota/manifest', (req: Request, res: Response) => {
    const platform = String(req.header('expo-platform') || req.query.platform || '').toLowerCase();
    const runtimeVersion = String(req.header('expo-runtime-version') || req.query.runtimeVersion || '');
    const currentUpdateId = String(req.header('expo-current-update-id') || '');
    const channel = String(req.header('expo-channel-name') || 'production');

    if (!platform || !runtimeVersion) {
      res.status(400).json({ error: 'Missing expo-platform or expo-runtime-version' });
      return;
    }

    const activeMetaPath = path.join(options.otaStorageDir, channel, runtimeVersion, platform, 'active.json');
    if (!fs.existsSync(activeMetaPath)) {
      res.status(204).end();
      return;
    }

    const release = JSON.parse(fs.readFileSync(activeMetaPath, 'utf8')) as {
      manifestRaw: string;
      manifestId: string;
      signatureHeader?: string;
    };

    if (currentUpdateId && currentUpdateId === release.manifestId) {
      res.status(204).end();
      return;
    }

    res.setHeader('expo-protocol-version', '1');
    res.setHeader('expo-sfv-version', '0');
    res.setHeader('cache-control', 'private, max-age=0, no-store');
    if (release.signatureHeader) {
      res.setHeader('expo-signature', release.signatureHeader);
    }
    res.type('application/json').send(release.manifestRaw);
  });

  router.get('/ota/assets/:hash', (req: Request, res: Response) => {
    const cleanHash = path.basename(String(req.params.hash || '')).replace(/[^a-zA-Z0-9._-]/g, '');
    const filePath = path.join(options.otaStorageDir, 'assets', cleanHash);
    if (!cleanHash || !fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.sendFile(filePath);
  });

  // =========================================================================
  // LÀN B: INSTANT SERVER-DRIVEN UI (SDUI JSON + OFFLINE CACHE SUPPORT)
  // =========================================================================
  router.get('/sdui/check', async (req: Request, res: Response) => {
    const role = typeof req.query.role === 'string' ? req.query.role : undefined;
    const clientHash = String(req.query.hash || '');
    const bundle = await options.loadSduiBundle(role);
    const payload = { appId: options.appId, schemaVersion: 2, ...bundle };
    const sha256 = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');

    res.json({
      hasUpdate: clientHash !== sha256,
      version: payload.version,
      sha256,
      bundleUrl: '/api/v1/sdui/bundle',
    });
  });

  router.get('/sdui/bundle', async (req: Request, res: Response) => {
    const role = typeof req.query.role === 'string' ? req.query.role : undefined;
    const bundle = await options.loadSduiBundle(role);
    const payload = { appId: options.appId, schemaVersion: 2, ...bundle, updatedAt: new Date().toISOString() };
    const sha256 = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');

    res.setHeader('ETag', `"${sha256}"`);
    res.setHeader('Cache-Control', 'private, max-age=30');
    res.json({
      ...payload,
      sha256,
    });
  });

  return router;
}
