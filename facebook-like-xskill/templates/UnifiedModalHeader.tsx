import React, { useEffect, useRef } from 'react';
import {
  Animated,
  GestureResponderHandlers,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

export interface UnifiedModalTheme {
  surfaceSubtle?: string;
  surfaceBackground?: string;
  textPrimary?: string;
  textSecondary?: string;
  border?: string;
  backdrop?: string;
}

export const DEFAULT_MODAL_THEME: Required<UnifiedModalTheme> = {
  surfaceSubtle: '#F1F5F9',
  surfaceBackground: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  border: '#CBD5E1',
  backdrop: 'rgba(2, 6, 23, 0.62)',
};

export interface UnifiedModalHeaderProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  showHandleBar?: boolean;
  insideModal?: boolean;
  /** Truyền từ QuadrupleDismissModal để vuốt kéo xuống đồng bộ cả sheet thân modal */
  externalPanHandlers?: GestureResponderHandlers;
  theme?: UnifiedModalTheme;
}

export function useSafeModalTopInset(insideModal = true): number {
  const insets = useSafeAreaInsets();
  return insideModal
    ? Math.max(insets.top || 0, initialWindowMetrics?.insets.top || 0, Platform.OS === 'ios' ? 52 : 28)
    : 8;
}

/**
 * 🛡️ UnifiedModalHeader (Header chuẩn hóa duy nhất — Single Source of Truth)
 * - Nút X độ tương phản cao, 44x44 + hitSlop 16px, zIndex 9999 / elevation 20.
 * - Tương thích kéo vuốt toàn sheet qua QuadrupleDismissModal (tránh rách/tách rời phần thân).
 */
export const UnifiedModalHeader: React.FC<UnifiedModalHeaderProps> = ({
  title,
  subtitle,
  onClose,
  showHandleBar = true,
  insideModal = true,
  externalPanHandlers,
  theme = DEFAULT_MODAL_THEME,
}) => {
  const t = { ...DEFAULT_MODAL_THEME, ...theme };
  const safeTop = useSafeModalTopInset(insideModal);

  return (
    <View
      style={[
        styles.headerContainer,
        {
          paddingTop: safeTop + 6,
          backgroundColor: t.surfaceBackground,
          borderBottomColor: t.border,
        },
      ]}
      {...(externalPanHandlers || {})}
    >
      {showHandleBar && (
        <View style={styles.handleContainer}>
          <View style={[styles.handleBar, { backgroundColor: t.border }]} />
        </View>
      )}

      <View style={styles.contentRow}>
        <View style={styles.titleWrapper}>
          <Text style={[styles.titleText, { color: t.textPrimary }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitleText, { color: t.textSecondary }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          accessibilityLabel="Đóng cửa sổ"
          accessibilityRole="button"
          onPress={onClose}
          activeOpacity={0.7}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          style={[
            styles.closeButton,
            {
              backgroundColor: t.surfaceSubtle,
              borderColor: t.border,
            },
          ]}
        >
          <X size={20} color={t.textPrimary} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export interface QuadrupleDismissModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  variant?: 'sheet' | 'fullscreen';
  theme?: UnifiedModalTheme;
  children: React.ReactNode;
}

/**
 * 🛡️ QuadrupleDismissModal (Container Modal Chuẩn 4 Lớp Thoát Hiểm Tuyệt Đối)
 * - Lớp 1: Nút X tương phản cao zIndex 9999 / elevation 20.
 * - Lớp 2: Kéo vuốt xuống toàn sheet 120 FPS (PanResponder Spring Physics, >80px hoặc vy>0.8 tự đóng).
 * - Lớp 3: Backdrop mờ StyleSheet.absoluteFillObject — chạm vùng trống để đóng.
 * - Lớp 4: Android hardware Back button (onRequestClose).
 */
export const QuadrupleDismissModal: React.FC<QuadrupleDismissModalProps> = ({
  visible,
  title,
  subtitle,
  onClose,
  variant = 'sheet',
  theme = DEFAULT_MODAL_THEME,
  children,
}) => {
  const t = { ...DEFAULT_MODAL_THEME, ...theme };
  const insets = useSafeAreaInsets();
  const panY = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (visible) {
      panY.setValue(0);
    }
  }, [visible, panY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 8 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) {
          panY.setValue(gs.dy);
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80 || gs.vy > 0.8) {
          Animated.timing(panY, {
            toValue: 480,
            duration: 150,
            useNativeDriver: true,
          }).start(() => onCloseRef.current());
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.modalRoot}>
        {/* Lớp 3: Backdrop phủ kín, chạm ra ngoài là đóng */}
        <Pressable style={[StyleSheet.absoluteFillObject, { backgroundColor: t.backdrop }]} onPress={onClose} />

        {/* Toàn bộ sheet trượt đồng bộ theo cử chỉ vuốt PanResponder */}
        <Animated.View
          style={[
            variant === 'fullscreen' ? styles.fullscreenContainer : styles.sheetContainer,
            {
              backgroundColor: t.surfaceBackground,
              paddingBottom: Math.max(insets.bottom || 0, 16),
              transform: [{ translateY: panY }],
            },
          ]}
        >
          <UnifiedModalHeader
            title={title}
            subtitle={subtitle}
            onClose={onClose}
            insideModal={variant === 'fullscreen'}
            externalPanHandlers={panResponder.panHandlers}
            theme={t}
          />
          <View style={styles.body}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    maxHeight: '90%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
  },
  fullscreenContainer: {
    flex: 1,
  },
  body: {
    flexShrink: 1,
  },
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
