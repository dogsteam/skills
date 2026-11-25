import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

export interface SDUIComponentNode {
  id: string;
  type: string;
  props?: Record<string, any>;
  children?: SDUIComponentNode[];
  action?: {
    type: 'api_call' | 'navigate' | 'open_modal' | 'call_phone';
    endpoint?: string;
    method?: string;
    params?: Record<string, any>;
  };
}

export interface SDUIRendererProps {
  node: SDUIComponentNode;
  onAction?: (action: NonNullable<SDUIComponentNode['action']>, node: SDUIComponentNode) => void;
  customComponents?: Record<string, React.ComponentType<any>>;
  themeTokens?: Record<string, string>;
}

/**
 * ⚡ SDUIRenderer (Server-Driven UI Recursive Interpreter)
 * - Đọc Dynamic Schema JSON từ server và kết xuất thành Native Components thật
 * - Hỗ trợ phân giải Design Theme Tokens động
 * - Ánh xạ tương tác (action dispatching) linh hoạt
 */
export const SDUIRenderer: React.FC<SDUIRendererProps> = ({
  node,
  onAction,
  customComponents = {},
  themeTokens = {},
}) => {
  if (!node) return null;

  // 1. Phân giải theme token nếu có trong props style
  const resolveProps = (rawProps: Record<string, any> = {}) => {
    const resolved = { ...rawProps };
    if (resolved.style && typeof resolved.style === 'object') {
      const newStyle: Record<string, any> = { ...resolved.style };
      for (const [key, val] of Object.entries(newStyle)) {
        if (typeof val === 'string' && val.startsWith('theme.')) {
          const tokenKey = val.replace('theme.', '');
          if (themeTokens[tokenKey]) {
            newStyle[key] = themeTokens[tokenKey];
          }
        }
      }
      resolved.style = newStyle;
    }
    return resolved;
  };

  const props = resolveProps(node.props);

  // 2. Custom Component đăng ký từ Native Shell (như SlideToConfirm, MapView)
  if (customComponents[node.type]) {
    const CustomComp = customComponents[node.type];
    return (
      <CustomComp {...props} id={node.id} onAction={onAction}>
        {node.children?.map(child => (
          <SDUIRenderer
            key={child.id}
            node={child}
            onAction={onAction}
            customComponents={customComponents}
            themeTokens={themeTokens}
          />
        ))}
      </CustomComp>
    );
  }

  // 3. Fallback Native Components
  switch (node.type) {
    case 'Container':
      return (
        <View style={props.style || styles.defaultContainer}>
          {node.children?.map(child => (
            <SDUIRenderer
              key={child.id}
              node={child}
              onAction={onAction}
              customComponents={customComponents}
              themeTokens={themeTokens}
            />
          ))}
        </View>
      );

    case 'ScrollContainer':
      return (
        <ScrollView style={props.style || styles.defaultContainer} contentContainerStyle={props.contentContainerStyle}>
          {node.children?.map(child => (
            <SDUIRenderer
              key={child.id}
              node={child}
              onAction={onAction}
              customComponents={customComponents}
              themeTokens={themeTokens}
            />
          ))}
        </ScrollView>
      );

    case 'Text':
      return (
        <Text style={[styles.defaultText, props.style]} numberOfLines={props.numberOfLines}>
          {props.text || props.children}
        </Text>
      );

    case 'Button':
      return (
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.defaultButton, props.style]}
          onPress={() => {
            if (node.action && onAction) {
              onAction(node.action, node);
            }
          }}
        >
          <Text style={[styles.defaultButtonText, props.textStyle]}>
            {props.title || props.text || 'Submit'}
          </Text>
        </TouchableOpacity>
      );

    default:
      // Unknown type: render children an toàn
      return (
        <View style={props.style}>
          {node.children?.map(child => (
            <SDUIRenderer
              key={child.id}
              node={child}
              onAction={onAction}
              customComponents={customComponents}
              themeTokens={themeTokens}
            />
          ))}
        </View>
      );
  }
};

const styles = StyleSheet.create({
  defaultContainer: {
    flex: 1,
  },
  defaultText: {
    fontSize: 14,
    color: '#f8fafc',
  },
  defaultButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#059669',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
