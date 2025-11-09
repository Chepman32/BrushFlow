import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Switch,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { colors, typography } from '../theme';

type PaywallPlan = 'yearly' | 'weekly';

interface RemoveWatermarkModalProps {
  visible: boolean;
  onClose: () => void;
  onPurchase: (plan: PaywallPlan, options: { trialEnabled: boolean }) => Promise<void>;
  onRestore: () => Promise<void>;
  isProcessing?: boolean;
}

const FEATURES = [
  { icon: 'edit-3', label: '300+ sketches for practice' },
  { icon: 'aperture', label: 'Unlimited AI generated drawings' },
  { icon: 'smartphone', label: 'Access to Image Projector' },
  { icon: 'shield', label: 'Ad free experience' },
];

const PLAN_OPTIONS: Array<{
  id: PaywallPlan;
  title: string;
  priceLabel: string;
  priceSub: string;
  badge?: string;
  helper?: string;
}> = [
  {
    id: 'yearly',
    title: 'Yearly Plan',
    priceLabel: '$9.99',
    priceSub: 'Per year',
    badge: 'Save 95%',
  },
  {
    id: 'weekly',
    title: '7 days free trial',
    priceLabel: 'then $3.99',
    priceSub: 'per week',
    helper: 'Cancel anytime',
  },
];

export const RemoveWatermarkModal: React.FC<RemoveWatermarkModalProps> = ({
  visible,
  onClose,
  onPurchase,
  onRestore,
  isProcessing = false,
}) => {
  const [selectedPlan, setSelectedPlan] = React.useState<PaywallPlan>('yearly');
  const [trialEnabled, setTrialEnabled] = React.useState(false);

  React.useEffect(() => {
    if (!visible) {
      setSelectedPlan('yearly');
      setTrialEnabled(false);
    }
  }, [visible]);

  if (!visible) {
    return null;
  }

  const handleContinue = async () => {
    if (isProcessing) return;
    await onPurchase(selectedPlan, { trialEnabled });
  };

  const handleRestore = async () => {
    if (isProcessing) return;
    await onRestore();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.container}>
        <View style={styles.heroBackground}>
          <Image
            source={require('../assets/icons/felt-tip-pen-icon.png')}
            style={styles.heroImage}
          />
          <View style={styles.heroOverlay} />
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Icon name="x" size={20} color="#0F0F0F" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleRestore}>
              <Text style={styles.restoreText}>Restore purchase</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Practice Your{'\n'}Drawing Skills</Text>
            <Text style={styles.heroSubtitle}>Unlock watermark-free exports + premium perks</Text>
            <View style={styles.statsRow}>
              <Text style={styles.statsValue}>1,000,000+</Text>
              <Text style={styles.statsLabel}>artists trust BrushFlow</Text>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.featureList}>
            {FEATURES.map(feature => (
              <View key={feature.label} style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Icon name={feature.icon} size={16} color="#111" />
                </View>
                <Text style={styles.featureText}>{feature.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.planStack}>
            {PLAN_OPTIONS.map(plan => {
              const isActive = selectedPlan === plan.id;
              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[styles.planCard, isActive && styles.planCardActive]}
                  onPress={() => setSelectedPlan(plan.id)}
                  activeOpacity={0.9}
                >
                  <View style={styles.planLeft}>
                    <View
                      style={[
                        styles.radioOuter,
                        isActive && styles.radioOuterActive,
                      ]}
                    >
                      {isActive && <View style={styles.radioInner} />}
                    </View>
                    <View>
                      <Text style={styles.planTitle}>{plan.title}</Text>
                      {plan.helper ? (
                        <Text style={styles.planHelper}>{plan.helper}</Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.planRight}>
                    <Text style={styles.planPrice}>{plan.priceLabel}</Text>
                    <Text style={styles.planPriceSub}>{plan.priceSub}</Text>
                  </View>
                  {plan.badge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{plan.badge}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Enable the free trial</Text>
              <Text style={styles.toggleCaption}>Cancel anytime before renewal</Text>
            </View>
            <Switch
              value={trialEnabled}
              onValueChange={setTrialEnabled}
              thumbColor={trialEnabled ? '#fff' : '#fafafa'}
              trackColor={{ false: '#d9d9d9', true: '#2ECC71' }}
            />
          </View>
        </ScrollView>

        <View style={styles.ctaContainer}>
          <TouchableOpacity
            style={[styles.ctaButton, isProcessing && styles.ctaButtonDisabled]}
            activeOpacity={0.85}
            onPress={handleContinue}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.ctaText}>Continue</Text>
                <Icon name="arrow-right" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F6F6',
  },
  heroBackground: {
    height: 280,
    backgroundColor: '#f1f1f1',
    position: 'relative',
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  heroImage: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 220,
    height: 220,
    tintColor: '#d9d9d9',
    opacity: 0.35,
    transform: [{ rotate: '-15deg' }],
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  restoreText: {
    ...typography.body,
    color: '#0F0F0F',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  heroCopy: {
    marginTop: 32,
    zIndex: 2,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111',
    lineHeight: 36,
  },
  heroSubtitle: {
    marginTop: 12,
    fontSize: 15,
    color: '#4a4a4a',
  },
  statsRow: {
    marginTop: 20,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ececec',
  },
  statsValue: {
    fontWeight: '700',
    fontSize: 14,
    color: '#111',
  },
  statsLabel: {
    fontSize: 12,
    color: '#666',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  contentContainer: {
    paddingVertical: 24,
  },
  featureList: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 15,
    color: '#111',
    flex: 1,
  },
  planStack: {
    marginTop: 24,
    gap: 12,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    flexDirection: 'row',
    alignItems: 'center',
  },
  planCardActive: {
    borderColor: '#00C853',
    shadowColor: '#00C853',
    shadowOpacity: 0.15,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  planLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D0D0D0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterActive: {
    borderColor: '#12C36E',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#12C36E',
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  planHelper: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  planRight: {
    alignItems: 'flex-end',
  },
  planPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  planPriceSub: {
    fontSize: 12,
    color: '#666',
  },
  badge: {
    position: 'absolute',
    top: -10,
    left: 24,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  toggleRow: {
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  toggleCaption: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  ctaContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: '#F6F6F6',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  ctaButton: {
    backgroundColor: '#FF2D55',
    borderRadius: 24,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  ctaButtonDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});
