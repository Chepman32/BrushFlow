import React, { useMemo } from 'react';
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
import { useSettings } from '../contexts/SettingsContext';
import type { AppTheme } from '../theme/themes';
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

interface ProjectMenuItem {
  id: string;
  label: string;
  count?: number;
  isDefault?: boolean;
}

interface ProjectsSectionProps {
  items: ProjectMenuItem[];
  selectedId: string;
  expanded: boolean;
  onToggle: () => void;
  onSelect: (projectId: string) => void;
  onAddProject: () => void;
  onItemOptions?: (projectId: string) => void;
}

interface SideMenuProps {
  visible: boolean;
  onClose: () => void;
  isPremiumUser: boolean;
  userName?: string;
  menuItems: MenuItem[];
  projectsSection?: ProjectsSectionProps;
}

export const SideMenu: React.FC<SideMenuProps> = ({
  visible,
  onClose,
  isPremiumUser,
  userName = 'Creative Artist',
  menuItems,
  projectsSection,
}) => {
  const insets = useSafeAreaInsets();
  const translateX = useSharedValue(-MENU_WIDTH);
  const { theme } = useSettings();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
                <Icon name="user" size={40} color={theme.colors.primaryText} />
              </View>
              <Text style={styles.userName}>{userName}</Text>
              {isPremiumUser && (
                <View style={styles.proBadge}>
                  <Icon name="star" size={16} color={colors.premium.gold} />
                  <Text style={styles.proBadgeText}>PRO</Text>
                </View>
              )}
            </View>

            {/* Projects Section */}
            {projectsSection ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <TouchableOpacity
                    style={styles.sectionHeaderLeft}
                    onPress={projectsSection.onToggle}
                    activeOpacity={0.7}
                  >
                    <Icon
                      name={projectsSection.expanded ? 'chevron-down' : 'chevron-right'}
                      size={18}
                      color={withOpacity(theme.colors.primaryText, 0.7)}
                    />
                    <Text style={styles.sectionTitle}>Projects</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={projectsSection.onAddProject}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Icon name="plus" size={18} color={withOpacity(theme.colors.primaryText, 0.7)} />
                  </TouchableOpacity>
                </View>
                {projectsSection.expanded && (
                  <View style={styles.projectList}>
                    {projectsSection.items.map(item => (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.projectRow,
                          item.id === projectsSection.selectedId && styles.projectRowActive,
                          item.isDefault && styles.projectRowDefault,
                        ]}
                        onPress={() => projectsSection.onSelect(item.id)}
                        onLongPress={() => {
                          if (!item.isDefault) {
                            projectsSection.onItemOptions?.(item.id);
                          }
                        }}
                        delayLongPress={250}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.projectName,
                            item.id === projectsSection.selectedId && styles.projectNameActive,
                          ]}
                          numberOfLines={1}
                        >
                          {item.label}
                        </Text>
                        <View style={styles.projectCountBadge}>
                          <Text style={styles.projectCountText}>{item.count ?? 0}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                    {!projectsSection.items.some(item => !item.isDefault) && (
                      <Text style={styles.projectEmptyState}>
                        Create your first project to keep things organized.
                      </Text>
                    )}
                  </View>
                )}
              </View>
            ) : null}

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
                        : theme.colors.primaryText
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

const withOpacity = (color: string, opacity: number) => {
  // Simple helper to add opacity to hex colors
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.overlay,
  },
  menu: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: MENU_WIDTH,
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: theme.isDark ? 0.5 : 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: withOpacity(theme.colors.accent, 0.2),
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: withOpacity(theme.colors.accent, 0.3),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  userName: {
    fontSize: typography.fontSize.title,
    color: theme.colors.primaryText,
    marginBottom: 8,
    fontWeight: '600',
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: withOpacity(colors.premium.gold, 0.2),
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  proBadgeText: {
    fontSize: typography.fontSize.caption,
    color: colors.premium.gold,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    color: withOpacity(theme.colors.primaryText, 0.8),
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 8,
  },
  projectList: {
    gap: 8,
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: withOpacity(theme.colors.primaryText, 0.05),
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  projectRowDefault: {
    backgroundColor: withOpacity(theme.colors.primaryText, 0.03),
  },
  projectRowActive: {
    backgroundColor: withOpacity(theme.colors.accent, 0.25),
  },
  projectName: {
    fontSize: typography.fontSize.body,
    color: withOpacity(theme.colors.primaryText, 0.8),
    flex: 1,
    marginRight: 12,
  },
  projectNameActive: {
    color: theme.colors.primaryText,
    fontWeight: '600',
  },
  projectCountBadge: {
    minWidth: 32,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: withOpacity(theme.colors.primaryText, 0.12),
    alignItems: 'center',
  },
  projectCountText: {
    fontSize: typography.fontSize.caption,
    color: theme.colors.primaryText,
    fontWeight: '600',
  },
  projectEmptyState: {
    fontSize: typography.fontSize.caption,
    color: theme.colors.mutedText,
    marginTop: 8,
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
    borderBottomColor: withOpacity(theme.colors.border, 0.5),
  },
  menuItemActive: {
    backgroundColor: withOpacity(theme.colors.accent, 0.15),
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent,
  },
  menuIcon: {
    marginRight: 16,
  },
  menuItemText: {
    fontSize: typography.fontSize.body,
    color: theme.colors.primaryText,
    flex: 1,
  },
  menuItemTextPremium: {
    color: colors.premium.gold,
  },
  badge: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: typography.fontSize.caption,
    color: theme.isDark ? theme.colors.primaryText : '#FFFFFF',
    fontWeight: '600',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: typography.fontSize.small,
    color: theme.colors.mutedText,
    marginBottom: 4,
  },
});
