import { File, Paths } from 'expo-file-system';
import type { SDUIComponentNode } from './SDUIRenderer';

export interface SDUIBundle {
  appId: string;
  schemaVersion: number;
  version: string;
  sha256?: string;
  updatedAt?: string | null;
  featureFlags: Record<string, unknown>;
  themeTokens: Record<string, string>;
  screens: Record<string, SDUIComponentNode>;
}

export interface CacheStorageAdapter {
  read(): Promise<string | null>;
  write(content: string): Promise<void>;
}

/**
 * 💾 Adapter lưu Cache bằng expo-file-system (SDK 54+)
 * Ghi xuống Document directory để không bị OS xóa khi cạn bộ nhớ tạm.
 */
export function createExpoFileCacheAdapter(fileName = 'sdui-bundle-cache.json'): CacheStorageAdapter {
  const file = new File(Paths.document, fileName);
  return {
    async read() {
      try {
        if (!file.exists) return null;
        return await file.text();
      } catch {
        return null;
      }
    },
    async write(content: string) {
      file.create({ intermediates: true, overwrite: true });
      file.write(content);
    },
  };
}

/**
 * 🛡️ Kiểm tra tính hợp lệ cấu trúc Bundle SDUI trước khi nạp vào UI & lưu cache.
 * Tránh lưu đè schema lỗi gây crash vòng lặp khi khởi động lại.
 */
export function validateSduiBundle(candidate: unknown): candidate is SDUIBundle {
  if (!candidate || typeof candidate !== 'object') return false;
  const obj = candidate as Record<string, unknown>;
  if (typeof obj.appId !== 'string' || typeof obj.version !== 'string') return false;
  if (typeof obj.schemaVersion !== 'number' || obj.schemaVersion < 2) return false;
  if (!obj.screens || typeof obj.screens !== 'object') return false;
  return true;
}

/**
 * ⚡ SDUICacheManager
 * - Instant Boot (< 0.1s): Trả ngay fallback tĩnh hoặc cache cục bộ trên đĩa khi vừa mở app.
 * - Background Sync: Âm thầm gọi /sdui/check?hash=... để chỉ tải /sdui/bundle khi SHA-256 thay đổi.
 */
export class SDUICacheManager {
  private readonly baseUrl: string;
  private readonly storage: CacheStorageAdapter;
  private readonly fallbackBundle: SDUIBundle;

  constructor(options: {
    apiBaseUrl: string;
    fallbackBundle: SDUIBundle;
    storage?: CacheStorageAdapter;
  }) {
    this.baseUrl = options.apiBaseUrl.replace(/\/+$/, '');
    this.fallbackBundle = options.fallbackBundle;
    this.storage = options.storage || createExpoFileCacheAdapter();
  }

  /** Đọc nhanh cache đĩa hoặc fallback tĩnh để render ngay lập tức */
  async loadInstant(): Promise<SDUIBundle> {
    try {
      const raw = await this.storage.read();
      if (raw) {
        const parsed = JSON.parse(raw);
        if (validateSduiBundle(parsed)) {
          return parsed;
        }
      }
    } catch {
      // Cache lỗi -> rớt về fallback an toàn tuyệt đối
    }
    return this.fallbackBundle;
  }

  /** Đồng bộ ngầm từ Server (chỉ tải toàn bộ bundle khi SHA-256 thay đổi) */
  async syncFromServer(currentBundle: SDUIBundle, role?: string): Promise<SDUIBundle | null> {
    const queryRole = role ? `&role=${encodeURIComponent(role)}` : '';
    const currentHash = encodeURIComponent(currentBundle.sha256 || '');

    const checkRes = await fetch(`${this.baseUrl}/sdui/check?hash=${currentHash}${queryRole}`);
    if (!checkRes.ok) return null;

    const checkJson = (await checkRes.json()) as { hasUpdate?: boolean };
    if (!checkJson.hasUpdate) return null;

    const bundleRes = await fetch(
      `${this.baseUrl}/sdui/bundle${role ? `?role=${encodeURIComponent(role)}` : ''}`,
      currentBundle.sha256 ? { headers: { 'If-None-Match': `"${currentBundle.sha256}"` } } : undefined
    );
    if (bundleRes.status === 304 || !bundleRes.ok) return null;

    const nextBundle = (await bundleRes.json()) as unknown;
    if (!validateSduiBundle(nextBundle)) {
      return null;
    }

    await this.storage.write(JSON.stringify(nextBundle));
    return nextBundle;
  }
}
