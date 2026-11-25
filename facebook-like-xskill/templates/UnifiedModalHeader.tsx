import React, { useRef } from 'react';
import { Animated, PanResponder, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

export interface UnifiedModalHeaderProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  showHandleBar?: boolean;
  insideModal?: boolean;
  theme?: {
    surfaceSubtle?: string;
    surfaceBackground?: string;
    textPrimary?: string;
    textSecondary?: string;
    border?: string;
  };
}

/**
 * 🛡️ UnifiedModalHeader (4 Lớp Thoát Hiểm + Safe Area Tai Thỏ / Dynamic Island)
 * - Lớp 1: Nút X tương phản cao, hitSlop 16px, zIndex 9999 / elevation 20.
 * - Lớp 2: Kéo vuốt xuống PanResponder có lò xo vật lý (> 80px hoặc vy > 0.8 tự đóng).
 * - Lớp 3: Kết hợp backdropTouch ở container ngoài modal.
 * - Lớp 4: Tương thích phím cứng Back Android (onRequestClose).
 * - Safe Area: Tự bù inset an toàn bên trong React Native <Modal> (UIWindow độc lập trên iOS).
 */
export const UnifiedModalHeader: React.FC<UnifiedModalHeaderProps> = ({
  title,
  subtitle,
  onClose,
  showHandleBar = true,
  insideModal = true,
  theme = {
    surfaceSubtle: '#F1F5F9',
    surfaceBackground: '#FFFFFF',
    textPrimary: '#0F172A',
    textSecondary: '#64748B',
    border: '#CBD5E1',
  },
}) => {
  const insets = useSafeAreaInsets();
  const safeTop = insideModal
    ? Math.max(insets.top || 0, initialWindowMetrics?.insets.top || 0, Platform.OS === 'ios' ? 52 : 28)
    : 8;

  const panY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 8 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 80 || gestureState.vy > 0.8) {
          Animated.timing(panY, {
            toValue: 400,
            duration: 150,
            useNativeDriver: true,
          }).start(onClose);
        } else {
          Animated.spring(panY, {
            toValue: 0,
            bounciness: 6,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.headerContainer,
        {
          paddingTop: safeTop + 6,
          backgroundColor: theme.surfaceBackground,
          borderBottomColor: theme.border,
          transform: [{ translateY: panY }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      {showHandleBar && (
        <View style={styles.handleContainer}>
          <View style={[styles.handleBar, { backgroundColor: theme.border }]} />
        </View>
      )}

      <View style={styles.contentRow}>
        <View style={styles.titleWrapper}>
          <Text style={[styles.titleText, { color: theme.textPrimary }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitleText, { color: theme.textSecondary }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          accessibilityLabel="Đóng cửa sổ"
          onPress={onClose}
          activeOpacity={0.7}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          style={[
            styles.closeButton,
            {
              backgroundColor: theme.surfaceSubtle,
              borderColor: theme.border,
            },
          ]}
        >
          <X size={20} color={theme.textPrimary} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  handleBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  titleWrapper: {
    flex: 1,
    paddingRight: 12,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitleText: {
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    zIndex: 9999,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.16,
        shadowRadius: 4,
      },
      android: {
        elevation: 20,
      },
    }),
  },
});
