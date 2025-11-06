import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '../theme';
import Icon from 'react-native-vector-icons/Feather';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MENU_WIDTH = Math.min(SCREEN_WIDTH * 0.8, 320);

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  badge?: string;
  onPress: () => void;
  isPremium?: boolean;
}

interface SideMenuProps {
  visible: boolean;
  onClose: () => void;
  isPremiumUser: boolean;
  userName?: string;
  menuItems: MenuItem[];
}

export const SideMenu: React.FC<SideMenuProps> = ({
  visible,
  onClose,
  isPremiumUser,
  userName = 'Creative Artist',
  menuItems,
}) => {
  const insets = useSafeAreaInsets();
  const translateX = useSharedValue(-MENU_WIDTH);
  const backdropOpacity = useSharedValue(0);
  const [renderMenu, setRenderMenu] = React.useState(visible);

  React.useEffect(() => {
    if (visible) {
      setRenderMenu(true);
      translateX.value = withSpring(0, {
        damping: 20,
        stiffness: 300,
      });
      backdropOpacity.value = withTiming(1, { duration: 300 });
    } else {
      translateX.value = withSpring(-MENU_WIDTH, {
        damping: 20,
        stiffness: 300,
      }, finished => {
        if (finished) {
          runOnJS(setRenderMenu)(false);
        }
      });
      backdropOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [visible, translateX, backdropOpacity]);

  const menuStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const panGesture = Gesture.Pan()
    .onUpdate(event => {
      if (event.translationX < 0) {
        translateX.value = Math.max(-MENU_WIDTH, event.translationX);
      }
    })
    .onEnd(event => {
      if (event.translationX < -100 || event.velocityX < -500) {
        translateX.value = withSpring(-MENU_WIDTH);
        backdropOpacity.value = withTiming(0);
        runOnJS(onClose)();
      } else {
        translateX.value = withSpring(0);
      }
    });

  if (!renderMenu) {
    return null;
  }

  return (
    <Modal
      visible={renderMenu}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </Pressable>

        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.menu,
              menuStyle,
              { paddingTop: insets.top, paddingBottom: insets.bottom },
            ]}
          >
            {/* Header Section */}
            <View style={styles.header}>
              <View style={styles.avatar}>
                <Icon name="user" size={40} color={colors.text.light} />
              </View>
              <Text style={styles.userName}>{userName}</Text>
              {isPremiumUser && (
                <View style={styles.proBadge}>
                  <Icon name="star" size={16} color={colors.premium.gold} />
                  <Text style={styles.proBadgeText}>PRO</Text>
                </View>
              )}
            </View>

            {/* Menu Items */}
            <View style={styles.menuItems}>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.menuItem,
                    index === 0 && styles.menuItemActive,
                  ]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <Icon
                    name={item.icon}
                    size={24}
                    color={
                      item.isPremium
                        ? colors.premium.gold
                        : 'rgba(255,255,255,0.7)'
                    }
                    style={styles.menuIcon}
                  />
                  <Text
                    style={[
                      styles.menuItemText,
                      item.isPremium && styles.menuItemTextPremium,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.badge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.badge}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Version 1.0.0</Text>
              <Text style={styles.footerText}>© 2025 BrushFlow</Text>
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  menu: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: MENU_WIDTH,
    backgroundColor: colors.background.dark,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(102,126,234,0.2)',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(102,126,234,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  userName: {
    ...typography.title,
    color: colors.text.light,
    marginBottom: 8,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  proBadgeText: {
    ...typography.caption,
    color: colors.premium.gold,
    fontWeight: '700',
  },
  menuItems: {
    flex: 1,
    paddingTop: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  menuItemActive: {
    backgroundColor: 'rgba(102,126,234,0.15)',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary.blue,
  },
  menuIcon: {
    marginRight: 16,
  },
  menuItemText: {
    ...typography.body,
    color: 'rgba(255,255,255,0.9)',
    flex: 1,
  },
  menuItemTextPremium: {
    color: colors.premium.gold,
  },
  badge: {
    backgroundColor: colors.primary.blue,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    ...typography.caption,
    color: colors.text.light,
    fontWeight: '600',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    ...typography.small,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 4,
  },
});
