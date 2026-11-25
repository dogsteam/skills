import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import { resolveTemplate, type SDUIAction, type SDUIComponentNode } from './SDUIRenderer';

export interface DispatcherCallbacks {
  apiBaseUrl: string;
  tokenSecureStoreKey?: string;
  getScope: () => Record<string, any>;
  onNavigate?: (target: string, params?: Record<string, unknown>) => void;
  onOpenModal?: (modalId: string, params?: Record<string, unknown>) => void;
  onDismissModal?: (modalId?: string) => void;
  onFieldChange?: (field: string, value: unknown) => void;
  onToast?: (message: string, variant?: string) => void;
  onSpeak?: (text: string) => void;
  onRefresh?: () => Promise<void> | void;
}

const ALLOWED_EXTERNAL_SCHEMES = /^(https:\/\/|http:\/\/|tel:|sms:|mailto:)/i;

function resolveDeepParams(input: unknown, scope: Record<string, any>): any {
  if (typeof input === 'string') return resolveTemplate(input, scope);
  if (Array.isArray(input)) return input.map((item) => resolveDeepParams(item, scope));
  if (input && typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      out[k] = resolveDeepParams(v, scope);
    }
    return out;
  }
  return input;
}

async function openSafeExternalUrl(rawUrl: string): Promise<boolean> {
  const url = String(rawUrl || '').trim();
  if (!ALLOWED_EXTERNAL_SCHEMES.test(url)) {
    return false;
  }
  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) return false;
  await Linking.openURL(url);
  return true;
}

/**
 * 🛡️ SDUIActionDispatcher (Whitelist-Only — Zero eval)
 * Điều phối toàn bộ hành động từ SDUI JSON qua danh sách whitelist an toàn.
 */
export function createSDUIActionDispatcher(callbacks: DispatcherCallbacks) {
  const baseUrl = callbacks.apiBaseUrl.replace(/\/+$/, '');
  const tokenKey = callbacks.tokenSecureStoreKey || 'auth_access_token';

  const dispatch = async (action: SDUIAction, node?: SDUIComponentNode): Promise<void> => {
    const scope = callbacks.getScope();
    const resolvedParams = (resolveDeepParams(action.params || {}, scope) || {}) as Record<string, unknown>;
    const resolvedTarget = typeof action.target === 'string' ? resolveTemplate(action.target, scope) : undefined;
    const resolvedValue = resolveDeepParams(action.value, scope);

    switch (action.type) {
      case 'set_field': {
        if (action.field) {
          callbacks.onFieldChange?.(action.field, resolvedValue);
        }
        return;
      }

      case 'navigate': {
        if (resolvedTarget) {
          callbacks.onNavigate?.(resolvedTarget, resolvedParams);
        }
        return;
      }

      case 'open_modal': {
        if (resolvedTarget) {
          callbacks.onOpenModal?.(resolvedTarget, resolvedParams);
        }
        return;
      }

      case 'dismiss_modal': {
        callbacks.onDismissModal?.(resolvedTarget);
        return;
      }

      case 'copy_text': {
        const text = String(resolvedValue ?? resolvedParams.text ?? '');
        if (text) {
          await Clipboard.setStringAsync(text);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          callbacks.onToast?.('Đã sao chép vào bộ nhớ tạm', 'success');
        }
        return;
      }

      case 'call_phone': {
        const phone = String(resolvedTarget ?? resolvedParams.phone ?? '').replace(/[^0-9+*#]/g, '');
        if (phone) {
          await openSafeExternalUrl(`tel:${phone}`);
        }
        return;
      }

      case 'open_sms': {
        const phone = String(resolvedTarget ?? resolvedParams.phone ?? '').replace(/[^0-9+*#]/g, '');
        const body = String(resolvedParams.body ?? '');
        if (phone) {
          const qs = body ? `?body=${encodeURIComponent(body)}` : '';
          await openSafeExternalUrl(`sms:${phone}${qs}`);
        }
        return;
      }

      case 'open_url': {
        if (resolvedTarget) {
          const ok = await openSafeExternalUrl(resolvedTarget);
          if (!ok) {
            callbacks.onToast?.('Liên kết không thuộc scheme an toàn cho phép', 'warning');
          }
        }
        return;
      }

      case 'show_toast': {
        const msg = String(resolvedValue ?? resolvedParams.message ?? '');
        if (msg) {
          callbacks.onToast?.(msg, String(resolvedParams.variant || 'info'));
        }
        if (resolvedParams.voicePrompt && callbacks.onSpeak) {
          callbacks.onSpeak(String(resolvedParams.voicePrompt));
        }
        return;
      }

      case 'confirm_slide':
      case 'api_call': {
        if (!action.endpoint || !action.endpoint.startsWith('/api/')) {
          callbacks.onToast?.('Endpoint không hợp lệ (chỉ chấp nhận relative /api/*)', 'danger');
          return;
        }
        const token = await SecureStore.getItemAsync(tokenKey).catch(() => null);
        const method = action.method || 'POST';
        const res = await fetch(`${baseUrl}${action.endpoint}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          ...(method !== 'GET' ? { body: JSON.stringify({ ...scope.form, ...resolvedParams, nodeId: node?.id }) } : {}),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.success === false) {
          callbacks.onToast?.(String(json.message || json.error || 'Thao tác thất bại'), 'danger');
          return;
        }
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        await callbacks.onRefresh?.();
        if (Array.isArray(action.onSuccess)) {
          for (const nextAction of action.onSuccess) {
            await dispatch(nextAction, node);
          }
        }
        return;
      }
    }
  };

  return { dispatch };
}
