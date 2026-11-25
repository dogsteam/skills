#!/usr/bin/env node

/**
 * 🚀 publish-ota.mjs
 * Công cụ tạo Chứng chỉ Ký số RSA-2048 (X.509 CodeSigning) & Đóng gói/Ký số JS/Hermes OTA Bundle
 * chuẩn Expo Updates Protocol v1 cho kiến trúc Facebook-like (Self-Hosted VPS).
 *
 * Cách dùng:
 *   1. Tạo cặp khóa X.509 hợp chuẩn expo-updates (chạy 1 lần):
 *      node publish-ota.mjs --keygen --cert-out ./credentials/ota-cert.pem --key-out /secure-local/ota-private.pem
 *
 *   2. Export & Ký gói JS/Hermes OTA để đẩy lên VPS:
 *      node publish-ota.mjs --publish \
 *        --project . \
 *        --runtime native-1 \
 *        --channel production \
 *        --base-url https://api.example.com/api/v1 \
 *        --private-key /secure-local/ota-private.pem \
 *        --out ./dist-ota \
 *        --rollout 100
 */

import crypto from 'node:crypto';
import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const argv = process.argv.slice(2);

function getArg(flag, fallback = '') {
  const idx = argv.indexOf(flag);
  if (idx !== -1 && argv[idx + 1] && !argv[idx + 1].startsWith('--')) {
    return argv[idx + 1];
  }
  return fallback;
}

if (argv.includes('--help') || argv.length === 0) {
  console.log(`
Usage:
  Keygen (RSA-2048 X.509 CodeSigning):
    node publish-ota.mjs --keygen --cert-out ./credentials/ota-cert.pem --key-out ~/.secrets/ota-private.pem [--cn "MyApp OTA"]

  Build & Sign Expo Updates v1 OTA Bundle:
    node publish-ota.mjs --publish \\
      --project . \\
      --runtime native-1 \\
      --channel production \\
      --base-url https://domain.com/api/v1 \\
      --private-key ~/.secrets/ota-private.pem \\
      --out ./dist-ota \\
      [--rollout 100] [--keyid main]
  `);
  process.exit(0);
}

function sha256Base64Url(buf) {
  return crypto.createHash('sha256').update(buf).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function signManifestRsa(rawString, privateKeyPem, keyId = 'main') {
  const sigBase64 = crypto.sign('sha256', Buffer.from(rawString, 'utf8'), privateKeyPem).toString('base64');
  return `sig=":${sigBase64}:", keyid="${keyId}", alg="rsa-v1_5-sha256"`;
}

function guessContentType(ext) {
  const map = {
    js: 'application/javascript',
    hbc: 'application/javascript',
    bundle: 'application/javascript',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    ttf: 'font/ttf',
    otf: 'font/otf',
    woff: 'font/woff',
    woff2: 'font/woff2',
    wav: 'audio/wav',
    mp3: 'audio/mpeg',
    json: 'application/json',
  };
  return map[String(ext || '').replace(/^\./, '').toLowerCase()] || 'application/octet-stream';
}

function runKeygen() {
  const certOut = path.resolve(getArg('--cert-out', './credentials/ota-cert.pem'));
  const keyOut = path.resolve(getArg('--key-out', './credentials/ota-private.pem'));
  const commonName = getArg('--cn', 'FacebookLike-OTA-Signer');

  fs.mkdirSync(path.dirname(certOut), { recursive: true });
  fs.mkdirSync(path.dirname(keyOut), { recursive: true, mode: 0o700 });

  const extConfigPath = path.join(os.tmpdir(), `ota-ext-${Date.now()}.cnf`);
  const extConfig = [
    '[req]',
    'distinguished_name = req_dn',
    'x509_extensions = v3_codesign',
    'prompt = no',
    '[req_dn]',
    `CN = ${commonName}`,
    '[v3_codesign]',
    'keyUsage = critical, digitalSignature',
    'extendedKeyUsage = critical, codeSigning',
  ].join('\n');
  fs.writeFileSync(extConfigPath, extConfig, 'utf8');

  try {
    execFileSync(
      'openssl',
      [
        'req',
        '-x509',
        '-newkey',
        'rsa:2048',
        '-nodes',
        '-sha256',
        '-days',
        '3650',
        '-keyout',
        keyOut,
        '-out',
        certOut,
        '-config',
        extConfigPath,
      ],
      { stdio: 'inherit' }
    );
    fs.chmodSync(keyOut, 0o600);
    console.log('\n✅ Đã tạo cặp khóa RSA-2048 X.509 hợp chuẩn expo-updates:');
    console.log(`   • Public Cert (nhúng vào app.config.js): ${certOut}`);
    console.log(`   • Private Key (GIỮ BÍ MẬT ngoài VPS!):  ${keyOut}`);
  } finally {
    if (fs.existsSync(extConfigPath)) fs.unlinkSync(extConfigPath);
  }
}

function runPublish() {
  const projectDir = path.resolve(getArg('--project', '.'));
  const runtimeVersion = getArg('--runtime', 'native-1');
  const channel = getArg('--channel', 'production');
  const baseUrl = getArg('--base-url', '').replace(/\/+$/, '');
  const privateKeyPath = path.resolve(getArg('--private-key', ''));
  const outDir = path.resolve(getArg('--out', './dist-ota'));
  const keyId = getArg('--keyid', 'main');
  const rolloutPercent = Math.max(0, Math.min(100, Number(getArg('--rollout', '100'))));

  if (!baseUrl || !fs.existsSync(privateKeyPath)) {
    console.error('❌ Thiếu --base-url hoặc file --private-key không tồn tại!');
    process.exit(1);
  }

  const privateKeyPem = fs.readFileSync(privateKeyPath, 'utf8');
  const tmpExportDir = fs.mkdtempSync(path.join(os.tmpdir(), 'expo-ota-export-'));

  try {
    console.log(`📦 Đang export bundle JS/Hermes từ ${projectDir}...`);
    execSync(`npx expo export --output-dir "${tmpExportDir}" --platform all`, {
      cwd: projectDir,
      stdio: 'inherit',
    });

    const metaPath = path.join(tmpExportDir, 'metadata.json');
    if (!fs.existsSync(metaPath)) {
      throw new Error(`Không tìm thấy ${metaPath} sau khi chạy expo export`);
    }

    const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    const assetsOutDir = path.join(outDir, 'assets');
    fs.mkdirSync(assetsOutDir, { recursive: true });

    const copyHashedAsset = (srcFileAbs, keyName, fileExtension, contentTypeOverride) => {
      const buf = fs.readFileSync(srcFileAbs);
      const b64urlHash = sha256Base64Url(buf);
      const fileDiskName = keyName;
      fs.copyFileSync(srcFileAbs, path.join(assetsOutDir, fileDiskName));
      return {
        hash: b64urlHash,
        key: keyName,
        contentType: contentTypeOverride || guessContentType(fileExtension),
        fileExtension: fileExtension.startsWith('.') ? fileExtension : `.${fileExtension}`,
        url: `${baseUrl}/ota/assets/${fileDiskName}`,
      };
    };

    const nowIso = new Date().toISOString();
    const rollbackDirectiveRaw = JSON.stringify({
      type: 'rollBackToEmbedded',
      parameters: { commitTime: nowIso },
    });
    const rollbackSignatureHeader = signManifestRsa(rollbackDirectiveRaw, privateKeyPem, keyId);

    for (const platform of ['ios', 'android']) {
      const pMeta = metadata?.fileMetadata?.[platform];
      if (!pMeta?.bundle) {
        console.log(`ℹ️ Bỏ qua ${platform} (không có trong metadata.json).`);
        continue;
      }

      const bundleSrcPath = path.join(tmpExportDir, pMeta.bundle);
      const bundleShaKey = crypto.createHash('md5').update(fs.readFileSync(bundleSrcPath)).digest('hex');
      const launchAsset = copyHashedAsset(bundleSrcPath, bundleShaKey, '.bundle', 'application/javascript');

      const assets = (pMeta.assets || []).map((a) => {
        const assetSrcPath = path.join(tmpExportDir, a.path);
        const assetKey = path.basename(a.path);
        return copyHashedAsset(assetSrcPath, assetKey, a.ext || 'bin');
      });

      const manifestId = crypto.randomUUID();
      const manifestObj = {
        id: manifestId,
        createdAt: nowIso,
        runtimeVersion,
        launchAsset,
        assets,
        metadata: {},
        extra: { expoClient: { runtimeVersion } },
      };

      const manifestRaw = JSON.stringify(manifestObj);
      const signatureHeader = signManifestRsa(manifestRaw, privateKeyPem, keyId);

      const targetMetaDir = path.join(outDir, channel, runtimeVersion, platform);
      fs.mkdirSync(targetMetaDir, { recursive: true });
      const activeJsonPath = path.join(targetMetaDir, 'active.json');

      let previousRelease;
      if (fs.existsSync(activeJsonPath)) {
        try {
          const prev = JSON.parse(fs.readFileSync(activeJsonPath, 'utf8'));
          if (prev?.status !== 'rolled_back' && prev?.manifestRaw && prev?.manifestId) {
            previousRelease = {
              manifestRaw: prev.manifestRaw,
              manifestId: prev.manifestId,
              signatureHeader: prev.signatureHeader,
            };
          } else if (prev?.previousRelease) {
            previousRelease = prev.previousRelease;
          }
        } catch {
          // ignore corrupt old active.json
        }
      }

      const storedRelease = {
        manifestId,
        createdAt: nowIso,
        status: 'active',
        rolloutPercent,
        manifestRaw,
        signatureHeader,
        rollbackDirectiveRaw,
        rollbackSignatureHeader,
        ...(previousRelease ? { previousRelease } : {}),
      };

      fs.writeFileSync(activeJsonPath, JSON.stringify(storedRelease, null, 2), 'utf8');
      console.log(`✅ [${platform.toUpperCase()}] Manifest ID: ${manifestId} | Assets: ${assets.length} | Rollout: ${rolloutPercent}%`);
    }

    console.log(`\n🎉 HOÀN TẤT ĐÓNG GÓI & KÝ SỐ OTA TẠI: ${outDir}`);
    console.log(`👉 Chỉ cần đồng bộ thư mục ${outDir} lên VPS vào options.otaStorageDir là App tự cập nhật!`);
  } finally {
    fs.rmSync(tmpExportDir, { recursive: true, force: true });
  }
}

if (argv.includes('--keygen')) {
  runKeygen();
} else if (argv.includes('--publish')) {
  runPublish();
} else {
  console.error('❌ Vui lòng truyền --keygen hoặc --publish (xem --help).');
  process.exit(1);
}
