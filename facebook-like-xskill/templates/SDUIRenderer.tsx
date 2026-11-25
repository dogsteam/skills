import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
};

function readPath(obj: Record<string, any>, path: string): unknown {
  return path.split('.').reduce<any>((acc, key) => (acc != null && typeof acc === 'object' ? acc[key] : undefined), obj);
}

function evaluateCondition(cond: SDUICondition | undefined, scope: Record<string, any>): boolean {
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

function resolveTemplate(value: unknown, scope: Record<string, any>): any {
  if (typeof value !== 'string') return value;
  return value.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_m, path) => {
    const resolved = readPath(scope, path);
    return resolved == null ? '' : String(resolved);
  });
}

function resolveProps(rawProps: Record<string, any> = {}, tokens: Record<string, string>, scope: Record<string, any>) {
  const mergedTokens = { ...DEFAULT_TOKENS, ...tokens };
  const resolved: Record<string, any> = {};
  for (const [k, v] of Object.entries(rawProps)) {
    resolved[k] = typeof v === 'string' ? resolveTemplate(v, scope) : v;
  }
  if (resolved.style && typeof resolved.style === 'object') {
    const styleObj: Record<string, any> = { ...resolved.style };
    for (const [sk, sv] of Object.entries(styleObj)) {
      if (typeof sv === 'string' && sv.startsWith('theme.')) {
        const tokenKey = sv.slice(6);
        if (mergedTokens[tokenKey]) {
          styleObj[sk] = mergedTokens[tokenKey];
        }
      }
    }
    resolved.style = styleObj;
  }
  return resolved;
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
        onFieldChange={onFieldChange}
        onAction={onAction}
        customComponents={customComponents}
        themeTokens={mergedTokens}
      />
    ));

  // 1. Custom Native Primitives (e.g., NativeSlideToConfirm, VoiceMicButton, MapPreview)
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

    case 'Text':
      return (
        <Text style={[{ fontSize: 14, color: mergedTokens.textPrimary }, props.style]} numberOfLines={props.numberOfLines}>
          {props.text ?? props.children}
        </Text>
      );

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
    case 'ActionButton':
      return (
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.button, { backgroundColor: mergedTokens.primary }, props.style]}
          onPress={() => node.action && onAction?.(node.action, node)}
        >
          <Text style={[styles.buttonText, { color: mergedTokens.primaryText }, props.textStyle]}>
            {props.title ?? props.text ?? 'Xác nhận'}
          </Text>
        </TouchableOpacity>
      );

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
