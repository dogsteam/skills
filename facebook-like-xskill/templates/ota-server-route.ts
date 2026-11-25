import { Router, Request, Response } from 'express';
import crypto from 'crypto';

export const otaRouter = Router();

// Mô hình Schema Bundle mẫu cho toàn bộ màn hình
const CURRENT_BUNDLE = {
  appId: 'xechung',
  version: '2.0.0',
  updatedAt: new Date().toISOString(),
  themeTokens: {
    surfaceBackground: '#020617',
    surfaceSolid: '#0f172a',
    surfaceSubtle: '#1e293b',
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    border: '#334155',
    accent: '#059669',
  },
  screens: {
    passengerBooking: {
      id: 'passenger_root',
      type: 'Container',
      props: { style: { flex: 1, backgroundColor: 'theme.surfaceBackground' } },
      children: [
        {
          id: 'booking_title',
          type: 'Text',
          props: { text: '🚗 Đặt Xe Ghép & Tiện Chuyến', style: { fontSize: 20, fontWeight: 'bold' } },
        },
      ],
    },
    driverFeed: {
      id: 'driver_feed_root',
      type: 'Container',
      props: { style: { flex: 1, backgroundColor: 'theme.surfaceBackground' } },
      children: [
        {
          id: 'feed_title',
          type: 'Text',
          props: { text: '⚡ Sàn Cuốc Tiện Chuyến 2 Đầu', style: { fontSize: 18, fontWeight: 'bold' } },
        },
      ],
    },
  },
};

// Tính toán checksum SHA256 cho bundle
const bundleJsonString = JSON.stringify(CURRENT_BUNDLE);
const CURRENT_BUNDLE_HASH = crypto.createHash('sha256').update(bundleJsonString).digest('hex');

/**
 * 📡 GET /api/v1/ota/check
 * Client gọi kiểm tra khi vừa mở app
 */
otaRouter.get('/check', (req: Request, res: Response) => {
  const clientVersion = req.query.version as string;
  const clientHash = req.query.hash as string;

  const hasUpdate = clientHash !== CURRENT_BUNDLE_HASH;

  res.json({
    success: true,
    hasUpdate,
    latestVersion: CURRENT_BUNDLE.version,
    bundleHash: CURRENT_BUNDLE_HASH,
    updatedAt: CURRENT_BUNDLE.updatedAt,
    mandatory: false,
    downloadUrl: '/api/v1/ota/bundle',
  });
});

/**
 * 📦 GET /api/v1/ota/bundle
 * Trả về toàn bộ schema bundle động
 */
otaRouter.get('/bundle', (req: Request, res: Response) => {
  res.setHeader('ETag', `"${CURRENT_BUNDLE_HASH}"`);
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.json({
    success: true,
    bundleHash: CURRENT_BUNDLE_HASH,
    data: CURRENT_BUNDLE,
  });
});
