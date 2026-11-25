import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export type SDUICondition = {
  path: string;
  equals?: string | number | boolean;
  notEquals?: string | number | boolean;
  in?: Array<string | number | boolean>;
  truthy?: boolean;
  falsy?: boolean;
  gt?: number;
  lt?: number;
};

export type SDUIAction = {
  type:
    | 'api_call'
    | 'navigate'
    | 'open_modal'
    | 'dismiss_modal'
    | 'open_sms'
    | 'call_phone'
    | 'open_url'
    | 'copy_text'
    | 'set_field'
    | 'show_toast'
    | 'confirm_slide';
  endpoint?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  target?: string;
  field?: string;
  value?: unknown;
  params?: Record<string, unknown>;
  onSuccess?: SDUIAction[];
};

export interface SDUIComponentNode {
  id: string;
  type: string;
  field?: string;
  visibleWhen?: SDUICondition;
  props?: Record<string, any>;
  children?: SDUIComponentNode[];
  action?: SDUIAction;
}

export interface SDUIRendererProps {
  node: SDUIComponentNode;
  contextData?: Record<string, any>;
  formState?: Record<string, any>;
  busyNodeId?: string | null;
  onFieldChange?: (field: string, value: any) => void;
  onAction?: (action: SDUIAction, node: SDUIComponentNode) => void;
  customComponents?: Record<string, React.ComponentType<any>>;
  themeTokens?: Record<string, string>;
}

const DEFAULT_TOKENS: Record<string, string> = {
  surfaceBackground: '#FFFFFF',
  surfaceSolid: '#F8FAFC',
  surfaceSubtle: '#F1F5F9',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  border: '#CBD5E1',
  primary: '#059669',
  primaryText: '#FFFFFF',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  info: '#0284C7',
};

export function readPath(obj: Record<string, any>, path: string): unknown {
  return path.split('.').reduce<any>((acc, key) => (acc != null && typeof acc === 'object' ? acc[key] : undefined), obj);
}

export function evaluateCondition(cond: SDUICondition | undefined, scope: Record<string, any>): boolean {
  if (!cond) return true;
  const val = readPath(scope, cond.path);
  if (cond.equals !== undefined && val !== cond.equals) return false;
  if (cond.notEquals !== undefined && val === cond.notEquals) return false;
  if (cond.in !== undefined && !cond.in.includes(val as any)) return false;
  if (cond.truthy && !val) return false;
  if (cond.falsy && val) return false;
  if (cond.gt !== undefined && !(typeof val === 'number' && val > cond.gt)) return false;
  if (cond.lt !== undefined && !(typeof val === 'number' && val < cond.lt)) return false;
  return true;
}

export function resolveTemplate(value: unknown, scope: Record<string, any>): any {
  if (typeof value !== 'string') return value;
  return value.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_m, path) => {
    const resolved = readPath(scope, path);
    return resolved == null ? '' : String(resolved);
  });
}

function resolveStyleObject(rawStyle: any, tokens: Record<string, string>): any {
  if (Array.isArray(rawStyle)) {
    return rawStyle.map((item) => resolveStyleObject(item, tokens));
  }
  if (!rawStyle || typeof rawStyle !== 'object') return rawStyle;
  const styleObj: Record<string, any> = { ...rawStyle };
  for (const [sk, sv] of Object.entries(styleObj)) {
    if (typeof sv === 'string' && sv.startsWith('theme.')) {
      const tokenKey = sv.slice(6);
      if (tokens[tokenKey]) {
        styleObj[sk] = tokens[tokenKey];
      }
    }
  }
  return styleObj;
}

function resolveDeepValue(val: unknown, tokens: Record<string, string>, scope: Record<string, any>): any {
  if (typeof val === 'string') {
    if (val.startsWith('theme.')) {
      return tokens[val.slice(6)] || val;
    }
    return resolveTemplate(val, scope);
  }
  if (Array.isArray(val)) {
    return val.map((item) => resolveDeepValue(item, tokens, scope));
  }
  if (val && typeof val === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      out[k] = resolveDeepValue(v, tokens, scope);
    }
    return out;
  }
  return val;
}

function resolveProps(rawProps: Record<string, any> = {}, tokens: Record<string, string>, scope: Record<string, any>) {
  const mergedTokens = { ...DEFAULT_TOKENS, ...tokens };
  const resolved = resolveDeepValue(rawProps, mergedTokens, scope) as Record<string, any>;
  for (const styleKey of ['style', 'textStyle', 'contentContainerStyle']) {
    if (resolved[styleKey]) {
      resolved[styleKey] = resolveStyleObject(resolved[styleKey], mergedTokens);
    }
  }
  return resolved;
}

function resolveVariantColor(variant: string | undefined, tokens: Record<string, string>): string {
  if (variant && tokens[variant]) return tokens[variant];
  return tokens.primary;
}

/**
 * 🛡️ ErrorBoundary bọc ngoài SDUI: Không bao giờ crash trắng màn hình nếu Server trả sai schema.
 */
export class SDUIErrorBoundary extends React.Component<
  { fallback: React.ReactNode; onError?: (err: Error) => void; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

/**
 * ⚡ SDUIRenderer v2 — Trình thông dịch UI động an toàn (Zero eval, Theme Tokens, VisibleWhen)
 */
export const SDUIRenderer: React.FC<SDUIRendererProps> = ({
  node,
  contextData = {},
  formState = {},
  busyNodeId,
  onFieldChange,
  onAction,
  customComponents = {},
  themeTokens = {},
}) => {
  if (!node) return null;

  const scope = { ...contextData, form: formState };
  if (!evaluateCondition(node.visibleWhen, scope)) {
    return null;
  }

  const mergedTokens = { ...DEFAULT_TOKENS, ...themeTokens };
  const props = resolveProps(node.props, mergedTokens, scope);

  const renderChildren = () =>
    node.children?.map((child) => (
      <SDUIRenderer
        key={child.id}
        node={child}
        contextData={contextData}
        formState={formState}
        busyNodeId={busyNodeId}
        onFieldChange={onFieldChange}
        onAction={onAction}
        customComponents={customComponents}
        themeTokens={mergedTokens}
      />
    ));

  // 1. Custom Native Primitives (NativeSlideToConfirm, VoiceMicButton, MapPreview, UnifiedModalHeader...)
  if (customComponents[node.type]) {
    const CustomComp = customComponents[node.type];
    return (
      <CustomComp
        {...props}
        id={node.id}
        field={node.field}
        value={node.field ? formState[node.field] : undefined}
        onChangeValue={node.field ? (val: any) => onFieldChange?.(node.field!, val) : undefined}
        action={node.action}
        onAction={onAction}
        node={node}
        themeTokens={mergedTokens}
      >
        {renderChildren()}
      </CustomComp>
    );
  }

  // 2. Built-in Native Primitives
  switch (node.type) {
    case 'Container':
    case 'Column':
    case 'Card':
    case 'Row':
      return (
        <View
          style={[
            node.type === 'Card' && [
              styles.card,
              { backgroundColor: mergedTokens.surfaceSolid, borderColor: mergedTokens.border },
            ],
            node.type === 'Row' && styles.row,
            props.style,
          ]}
        >
          {renderChildren()}
        </View>
      );

    case 'ScrollContainer':
      return (
        <ScrollView style={[{ flex: 1 }, props.style]} contentContainerStyle={props.contentContainerStyle}>
          {renderChildren()}
        </ScrollView>
      );

    case 'Spacer':
      return <View style={{ height: Number(props.size ?? props.height ?? 12), width: Number(props.width ?? 0) }} />;

    case 'Divider':
      return (
        <View
          style={[
            styles.divider,
            { backgroundColor: props.color || mergedTokens.border },
            props.style,
          ]}
        />
      );

    case 'Text':
      return (
        <Text style={[{ fontSize: 14, color: mergedTokens.textPrimary }, props.style]} numberOfLines={props.numberOfLines}>
          {props.text ?? props.children}
        </Text>
      );

    case 'Badge': {
      const badgeBg = resolveVariantColor(props.variant, mergedTokens);
      return (
        <View style={[styles.badge, { backgroundColor: `${badgeBg}20`, borderColor: badgeBg }, props.style]}>
          <Text style={[styles.badgeText, { color: badgeBg }, props.textStyle]}>{props.text ?? props.label}</Text>
        </View>
      );
    }

    case 'Banner': {
      const toneColor = resolveVariantColor(props.variant || 'info', mergedTokens);
      return (
        <View style={[styles.banner, { backgroundColor: `${toneColor}16`, borderColor: `${toneColor}55` }, props.style]}>
          {props.title ? <Text style={[styles.bannerTitle, { color: toneColor }]}>{props.title}</Text> : null}
          {props.text ? <Text style={[styles.bannerText, { color: mergedTokens.textPrimary }]}>{props.text}</Text> : null}
          {renderChildren()}
        </View>
      );
    }

    case 'StatCard':
      return (
        <View style={[styles.card, { backgroundColor: mergedTokens.surfaceSolid, borderColor: mergedTokens.border }, props.style]}>
          {props.label ? <Text style={[styles.statLabel, { color: mergedTokens.textSecondary }]}>{props.label}</Text> : null}
          <Text style={[styles.statValue, { color: mergedTokens.textPrimary }]}>{props.value ?? '0'}</Text>
        </View>
      );

    case 'ChipSelector': {
      const options = Array.isArray(props.options) ? props.options : [];
      const selected = node.field ? formState[node.field] : undefined;
      return (
        <View style={[styles.chipRow, props.style]}>
          {options.map((opt: any) => {
            const val = typeof opt === 'object' ? opt.value : opt;
            const label = typeof opt === 'object' ? opt.label : String(opt);
            const active = selected === val;
            return (
              <TouchableOpacity
                key={String(val)}
                activeOpacity={0.75}
                onPress={() => node.field && onFieldChange?.(node.field, val)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? mergedTokens.primary : mergedTokens.surfaceSubtle,
                    borderColor: active ? mergedTokens.primary : mergedTokens.border,
                  },
                ]}
              >
                <Text style={[styles.chipText, { color: active ? mergedTokens.primaryText : mergedTokens.textPrimary }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }

    case 'SwitchToggle': {
      const checked = Boolean(node.field ? formState[node.field] : props.value);
      return (
        <View style={[styles.switchRow, props.style]}>
          <Text style={[styles.switchLabel, { color: mergedTokens.textPrimary }]}>{props.label ?? ''}</Text>
          <Switch
            value={checked}
            onValueChange={(nextVal) => {
              if (node.field) onFieldChange?.(node.field, nextVal);
            }}
            trackColor={{ false: mergedTokens.border, true: mergedTokens.primary }}
          />
        </View>
      );
    }

    case 'TextInput':
    case 'PhoneInput':
    case 'MoneyInput':
      return (
        <TextInput
          keyboardType={
            node.type === 'PhoneInput'
              ? 'phone-pad'
              : node.type === 'MoneyInput'
              ? 'numeric'
              : (props.keyboardType ?? 'default')
          }
          editable={props.editable !== false}
          maxLength={props.maxLength}
          multiline={Boolean(props.multiline)}
          secureTextEntry={Boolean(props.secureTextEntry)}
          onChangeText={(val) => node.field && onFieldChange?.(node.field, val)}
          placeholder={props.placeholder}
          placeholderTextColor={mergedTokens.textSecondary}
          style={[
            styles.input,
            {
              color: mergedTokens.textPrimary,
              backgroundColor: mergedTokens.surfaceBackground,
              borderColor: mergedTokens.border,
            },
            props.style,
          ]}
          value={node.field ? String(formState[node.field] ?? '') : undefined}
        />
      );

    case 'Button':
    case 'ActionButton': {
      const isBusy = busyNodeId === node.id;
      const isDisabled = Boolean(props.disabled) || isBusy;
      const btnBg = resolveVariantColor(props.variant, mergedTokens);
      return (
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={isDisabled}
          style={[
            styles.button,
            { backgroundColor: btnBg, opacity: isDisabled ? 0.55 : 1 },
            props.style,
          ]}
          onPress={() => !isDisabled && node.action && onAction?.(node.action, node)}
        >
          {isBusy ? (
            <ActivityIndicator size="small" color={mergedTokens.primaryText} />
          ) : (
            <Text style={[styles.buttonText, { color: mergedTokens.primaryText }, props.textStyle]}>
              {props.title ?? props.text ?? 'Xác nhận'}
            </Text>
          )}
        </TouchableOpacity>
      );
    }

    default:
      return <View style={props.style}>{renderChildren()}</View>;
  }
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
    marginVertical: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  banner: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  bannerText: {
    fontSize: 13,
    lineHeight: 18,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    paddingRight: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  button: {
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
