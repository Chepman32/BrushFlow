import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { colors, typography } from '../theme';
import Icon from 'react-native-vector-icons/Feather';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.85;

interface PremiumFeature {
  icon: string;
  title: string;
  description: string;
}

interface PremiumModalProps {
  visible: boolean;
  onClose: () => void;
  onPurchase: () => Promise<void>;
  onRestore: () => Promise<void>;
  price?: string;
}

const PREMIUM_FEATURES: PremiumFeature[] = [
  {
    icon: 'layers',
    title: 'Unlimited Layers',
    description: 'Create complex artwork with unlimited layers',
  },
  {
    icon: 'edit-3',
    title: 'Advanced Brushes',
    description: 'Access 50+ professional brush presets',
  },
  {
    icon: 'tool',
    title: 'Pro Tools',
    description: 'Unlock Smudge, Blur, Clone, and Symmetry tools',
  },
  {
    icon: 'maximize',
    title: 'High-Res Export',
    description: 'Export up to 8K resolution (7680×4320)',
  },
  {
    icon: 'sliders',
    title: 'Custom Brushes',
    description: 'Create and import your own brushes',
  },
  {
    icon: 'filter',
    title: 'Advanced Filters',
    description: 'Apply professional filters and adjustments',
  },
  {
    icon: 'cloud',
    title: 'Cloud Sync',
    description: 'Sync artwork across devices (coming soon)',
  },
  {
    icon: 'headphones',
    title: 'Priority Support',
    description: 'Get help from our team within 24 hours',
  },
];

export const PremiumModal: React.FC<PremiumModalProps> = ({
  visible,
  onClose,
  onPurchase,
  onRestore,
  price = '$9.99',
}) => {
  const [isPurchasing, setIsPurchasing] = React.useState(false);
  const [isRestoring, setIsRestoring] = React.useState(false);

  const translateY = useSharedValue(MODAL_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const shimmerX = useSharedValue(-100);

  React.useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
      backdropOpacity.value = withTiming(1, { duration: 300 });
      shimmerX.value = withRepeat(
        withSequence(
          withTiming(100, { duration: 2000 }),
          withTiming(-100, { duration: 0 }),
        ),
        -1,
        false,
      );
    } else {
      translateY.value = withSpring(MODAL_HEIGHT);
      backdropOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [visible]);

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  const handlePurchase = async () => {
    setIsPurchasing(true);
    try {
      await onPurchase();
    } catch (error) {
      console.error('Purchase failed:', error);
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      await onRestore();
    } catch (error) {
      console.error('Restore failed:', error);
    } finally {
      setIsRestoring(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.container}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        >
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </TouchableOpacity>

        <Animated.View style={[styles.modal, modalStyle]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.badgeContainer}>
              <Animated.View style={[styles.shimmer, shimmerStyle]} />
              <Icon name="star" size={32} color={colors.premium.gold} />
            </View>
            <Text style={styles.title}>Unlock Premium</Text>
            <Text style={styles.subtitle}>Take Your Art to the Next Level</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Icon name="x" size={24} color={colors.text.light} />
            </TouchableOpacity>
          </View>

          {/* Features List */}
          <ScrollView
            style={styles.featuresList}
            showsVerticalScrollIndicator={false}
          >
            {PREMIUM_FEATURES.map((feature, index) => (
              <Animated.View
                key={feature.title}
                style={[
                  styles.featureItem,
                  {
                    opacity: visible ? 1 : 0,
                    transform: [
                      {
                        translateX: visible ? 0 : 50,
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.featureIcon}>
                  <Icon
                    name={feature.icon}
                    size={24}
                    color={colors.primary.blue}
                  />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>
                    {feature.description}
                  </Text>
                </View>
                <Icon
                  name="check-circle"
                  size={24}
                  color={colors.success.green}
                />
              </Animated.View>
            ))}
          </ScrollView>

          {/* Pricing Section */}
          <View style={styles.pricingSection}>
            <View style={styles.pricingCard}>
              <Text style={styles.price}>{price}</Text>
              <Text style={styles.priceSubtext}>Lifetime Access</Text>
              <Text style={styles.priceAlt}>Or $2.99/month</Text>
            </View>

            {/* Purchase Button */}
            <TouchableOpacity
              style={[
                styles.purchaseButton,
                isPurchasing && styles.purchaseButtonDisabled,
              ]}
              onPress={handlePurchase}
              disabled={isPurchasing}
            >
              {isPurchasing ? (
                <ActivityIndicator color={colors.primary.blue} />
              ) : (
                <Text style={styles.purchaseButtonText}>Unlock Now</Text>
              )}
            </TouchableOpacity>

            {/* Restore Button */}
            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestore}
              disabled={isRestoring}
            >
              {isRestoring ? (
                <ActivityIndicator color="rgba(255,255,255,0.7)" size="small" />
              ) : (
                <Text style={styles.restoreButtonText}>Restore Purchases</Text>
              )}
            </TouchableOpacity>

            {/* Terms */}
            <View style={styles.termsContainer}>
              <TouchableOpacity>
                <Text style={styles.termsText}>Terms of Service</Text>
              </TouchableOpacity>
              <Text style={styles.termsSeparator}>•</Text>
              <TouchableOpacity>
                <Text style={styles.termsText}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modal: {
    height: MODAL_HEIGHT,
    backgroundColor: colors.background.dark,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: 'rgba(102,126,234,0.1)',
  },
  badgeContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,215,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    width: 30,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.3)',
    transform: [{ skewX: '-20deg' }],
  },
  title: {
    ...typography.display,
    color: colors.text.light,
    marginBottom: 8,
  },
  subtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.7)',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuresList: {
    flex: 1,
    padding: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(102,126,234,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureContent: {
    flex: 1,
    gap: 4,
  },
  featureTitle: {
    ...typography.body,
    color: colors.text.light,
    fontWeight: '700',
  },
  featureDescription: {
    ...typography.callout,
    color: 'rgba(255,255,255,0.6)',
  },
  pricingSection: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  pricingCard: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(102,126,234,0.2)',
    borderRadius: 16,
    marginBottom: 16,
  },
  price: {
    fontSize: 42,
    fontWeight: '700',
    color: colors.text.light,
    marginBottom: 4,
  },
  priceSubtext: {
    ...typography.body,
    color: colors.text.light,
    marginBottom: 8,
  },
  priceAlt: {
    ...typography.callout,
    color: 'rgba(255,255,255,0.6)',
    textDecorationLine: 'line-through',
  },
  purchaseButton: {
    height: 56,
    backgroundColor: colors.text.light,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    ...typography.title,
    color: colors.primary.blue,
    fontWeight: '700',
  },
  restoreButton: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  restoreButtonText: {
    ...typography.callout,
    color: 'rgba(255,255,255,0.7)',
  },
  termsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  termsText: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.5)',
    textDecorationLine: 'underline',
  },
  termsSeparator: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.5)',
  },
});
