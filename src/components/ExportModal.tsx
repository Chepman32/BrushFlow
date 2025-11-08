import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors, typography } from '../theme';
import Icon from 'react-native-vector-icons/Feather';
import { ExportFormat, ExportOptions } from '../types';
import Slider from '@react-native-community/slider';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.82;

type ResolutionPreset = {
  label: string;
  width?: number;
  height?: number;
  isPremium?: boolean;
};

interface ExportModalProps {
  visible: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => Promise<void>;
  onSaveToGallery?: (options: ExportOptions) => Promise<void>;
  isPremiumUser: boolean;
  artworkWidth: number;
  artworkHeight: number;
}

const FORMATS: Array<{ id: ExportFormat; label: string; isPremium?: boolean }> =
  [
    { id: 'png', label: 'PNG' },
    { id: 'jpeg', label: 'JPEG' },
    { id: 'psd', label: 'PSD' },
    { id: 'tiff', label: 'TIFF' },
    { id: 'svg', label: 'SVG', isPremium: true },
  ];

const RESOLUTIONS: ResolutionPreset[] = [
  { label: '2160×3840 (4K UHD / 2160p)', width: 2160, height: 3840 },
  { label: '1440×2560 (QHD / 1440p)', width: 1440, height: 2560 },
  { label: '1080×1920 (Full HD / 1080p)', width: 1080, height: 1920 },
  { label: '900×1600 (HD+ / 900p)', width: 900, height: 1600 },
  { label: '720×1280 (HD / 720p)', width: 720, height: 1280 },
  { label: '480×854 (SD / 480p)', width: 480, height: 854 },
];

const resolveDimensions = (
  preset: ResolutionPreset,
  fallbackWidth: number,
  fallbackHeight: number,
) => {
  const width =
    typeof preset.width === 'number' ? preset.width : fallbackWidth;
  const height =
    typeof preset.height === 'number' ? preset.height : fallbackHeight;
  return { width, height };
};

export const ExportModal: React.FC<ExportModalProps> = ({
  visible,
  onClose,
  onExport,
  onSaveToGallery,
  isPremiumUser,
  artworkWidth,
  artworkHeight,
}) => {
  const [format, setFormat] = useState<ExportFormat>('png');
  const [quality, setQuality] = useState(90);
  const [preserveTransparency, setPreserveTransparency] = useState(true);
  const [filename, setFilename] = useState(
    `artwork_${new Date().toISOString().split('T')[0]}`,
  );
  const [selectedResolution, setSelectedResolution] = useState(0);
  const [resolutionPickerOpen, setResolutionPickerOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const safeArtworkWidth =
    Number.isFinite(artworkWidth) && artworkWidth > 0
      ? Math.round(artworkWidth)
      : 1080;
  const safeArtworkHeight =
    Number.isFinite(artworkHeight) && artworkHeight > 0
      ? Math.round(artworkHeight)
      : 1080;

  const translateY = useSharedValue(MODAL_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
      backdropOpacity.value = withTiming(1, { duration: 300 });
    } else {
      translateY.value = withSpring(MODAL_HEIGHT);
      backdropOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [visible]);

  React.useEffect(() => {
    if (!visible) {
      setResolutionPickerOpen(false);
    }
  }, [visible]);

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const getExportOptions = (): ExportOptions => {
    const resolution = RESOLUTIONS[selectedResolution];
    return {
      format,
      quality: format === 'jpeg' ? quality : undefined,
      preserveTransparency:
        format === 'png' ? preserveTransparency : undefined,
      filename,
      width:
        typeof resolution.width === 'number' ? resolution.width : undefined,
      height:
        typeof resolution.height === 'number' ? resolution.height : undefined,
    };
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      await onExport(getExportOptions());
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const handleSaveToGallery = async () => {
    if (!onSaveToGallery) return;

    setIsExporting(true);
    setExportProgress(0);

    try {
      await onSaveToGallery(getExportOptions());
      onClose();
    } catch (error) {
      console.error('Save to gallery failed:', error);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const estimatedFileSize = React.useMemo(() => {
    const resolution = RESOLUTIONS[selectedResolution];
    const { width, height } = resolveDimensions(
      resolution,
      safeArtworkWidth,
      safeArtworkHeight,
    );
    const pixels = width * height;

    let size = 0;
    switch (format) {
      case 'png':
        size = pixels * 4;
        break;
      case 'jpeg':
        size = (pixels * 3 * quality) / 100;
        break;
      default:
        size = pixels * 4;
    }

    if (size < 1024 * 1024) {
      return `~${(size / 1024).toFixed(0)} KB`;
    }
    return `~${(size / (1024 * 1024)).toFixed(1)} MB`;
  }, [
    format,
    quality,
    selectedResolution,
    safeArtworkWidth,
    safeArtworkHeight,
  ]);

  const currentDimensions = React.useMemo(
    () =>
      resolveDimensions(
        RESOLUTIONS[selectedResolution],
        safeArtworkWidth,
        safeArtworkHeight,
      ),
    [selectedResolution, safeArtworkWidth, safeArtworkHeight],
  );

  const toggleResolutionPicker = () => {
    setResolutionPickerOpen(prev => !prev);
  };

  const handleResolutionSelect = (index: number) => {
    const preset = RESOLUTIONS[index];
    if (preset?.isPremium && !isPremiumUser) {
      return;
    }
    setSelectedResolution(index);
    setResolutionPickerOpen(false);
  };

  const selectedResolutionLabel =
    RESOLUTIONS[selectedResolution]?.label ?? 'Custom';

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
            <Text style={styles.title}>Export Artwork</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="x" size={24} color={colors.text.dark} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Format Selector */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Format</Text>
              <View style={styles.formatButtons}>
                {FORMATS.map(fmt => {
                  const isLocked = fmt.isPremium && !isPremiumUser;
                  const isSelected = format === fmt.id;

                  return (
                    <TouchableOpacity
                      key={fmt.id}
                      style={[
                        styles.formatButton,
                        isSelected && styles.formatButtonSelected,
                        isLocked && styles.formatButtonLocked,
                      ]}
                      onPress={() => !isLocked && setFormat(fmt.id)}
                      disabled={isLocked}
                    >
                      <Text
                        style={[
                          styles.formatButtonText,
                          isSelected && styles.formatButtonTextSelected,
                        ]}
                      >
                        {fmt.label}
                      </Text>
                      {fmt.isPremium && (
                        <View style={styles.premiumBadge}>
                          <Text style={styles.premiumBadgeText}>PRO</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Format-specific settings */}
            {format === 'png' && (
              <View style={styles.section}>
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Preserve Transparency</Text>
                  <TouchableOpacity
                    style={[
                      styles.toggle,
                      preserveTransparency && styles.toggleActive,
                    ]}
                    onPress={() =>
                      setPreserveTransparency(!preserveTransparency)
                    }
                  >
                    <View
                      style={[
                        styles.toggleThumb,
                        preserveTransparency && styles.toggleThumbActive,
                      ]}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {format === 'jpeg' && (
              <View style={styles.section}>
                <Text style={styles.settingLabel}>Quality: {quality}%</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={1}
                  maximumValue={100}
                  value={quality}
                  onValueChange={value => setQuality(Math.round(value))}
                  minimumTrackTintColor={colors.primary.blue}
                  maximumTrackTintColor="rgba(0,0,0,0.1)"
                />
                <Text style={styles.fileSizeText}>{estimatedFileSize}</Text>
              </View>
            )}

            {/* Resolution */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Resolution</Text>
              <TouchableOpacity
                style={[
                  styles.resolutionDropdown,
                  resolutionPickerOpen && styles.resolutionDropdownOpen,
                ]}
                onPress={toggleResolutionPicker}
                activeOpacity={0.9}
              >
                <Text style={styles.resolutionDropdownText}>
                  {selectedResolutionLabel}
                </Text>
                <Icon
                  name={resolutionPickerOpen ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.primary.blue}
                />
              </TouchableOpacity>
            </View>

            {/* Filename */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Filename</Text>
              <TextInput
                style={styles.filenameInput}
                value={filename}
                onChangeText={setFilename}
                placeholder="Enter filename"
                placeholderTextColor="rgba(0,0,0,0.4)"
              />
            </View>

            {/* File Info */}
            <View style={styles.fileInfo}>
              <Text style={styles.fileInfoText}>
                Estimated size: {estimatedFileSize}
              </Text>
              <Text style={styles.fileInfoText}>
                Dimensions: {currentDimensions.width} ×{' '}
                {currentDimensions.height}
              </Text>
            </View>
          </ScrollView>

          {/* Resolution Picker Overlay */}
          {resolutionPickerOpen && (
            <View style={styles.resolutionPickerOverlay}>
              <TouchableOpacity
                style={styles.resolutionPickerBackdrop}
                activeOpacity={1}
                onPress={() => setResolutionPickerOpen(false)}
              />
              <View style={styles.resolutionListContainer}>
                <View style={styles.resolutionListHeader}>
                  <Text style={styles.resolutionListTitle}>Select Resolution</Text>
                  <TouchableOpacity
                    onPress={() => setResolutionPickerOpen(false)}
                    style={styles.resolutionCloseButton}
                  >
                    <Icon name="x" size={24} color={colors.text.dark} />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  style={styles.resolutionScrollView}
                  showsVerticalScrollIndicator={true}
                  bounces={false}
                >
                  {RESOLUTIONS.map((res, index) => {
                    const isLocked = res.isPremium && !isPremiumUser;
                    const isSelected = selectedResolution === index;
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.resolutionOption,
                          isSelected && styles.resolutionOptionSelected,
                          index !== RESOLUTIONS.length - 1 &&
                            styles.resolutionOptionDivider,
                        ]}
                        onPress={() => !isLocked && handleResolutionSelect(index)}
                        disabled={isLocked}
                      >
                        <View style={styles.resolutionInfo}>
                          <Text
                            style={[
                              styles.resolutionLabel,
                              isLocked && styles.resolutionLabelLocked,
                            ]}
                          >
                            {res.label}
                          </Text>
                          {res.isPremium && (
                            <View style={styles.premiumBadgeSmall}>
                              <Text style={styles.premiumBadgeText}>PRO</Text>
                            </View>
                          )}
                        </View>
                        {isSelected && (
                          <Icon
                            name="check"
                            size={20}
                            color={colors.primary.blue}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          )}

          {/* Export Buttons */}
          <View style={styles.footer}>
            {isExporting ? (
              <View style={styles.exportingContainer}>
                <ActivityIndicator size="large" color={colors.primary.blue} />
                <Text style={styles.exportingText}>
                  Exporting... {exportProgress}%
                </Text>
              </View>
            ) : (
              <View style={styles.buttonRow}>
                {onSaveToGallery && (
                  <TouchableOpacity
                    style={[styles.exportButton, styles.saveButton]}
                    onPress={handleSaveToGallery}
                  >
                    <Icon name="image" size={20} color={colors.text.light} />
                    <Text style={styles.exportButtonText}>Save to Gallery</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.exportButton, onSaveToGallery && styles.shareButton]}
                  onPress={handleExport}
                >
                  <Icon name="share" size={20} color={colors.text.light} />
                  <Text style={styles.exportButtonText}>
                    {onSaveToGallery ? 'Share' : 'Export'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
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
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modal: {
    height: MODAL_HEIGHT,
    backgroundColor: colors.background.light,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  title: {
    ...typography.headline,
    color: colors.text.dark,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    ...typography.body,
    color: colors.text.dark,
    fontWeight: '700',
    marginBottom: 12,
  },
  formatButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  formatButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.2)',
    backgroundColor: colors.background.light,
  },
  formatButtonSelected: {
    borderColor: colors.primary.blue,
    backgroundColor: colors.primary.blue,
  },
  formatButtonLocked: {
    opacity: 0.5,
  },
  formatButtonText: {
    ...typography.callout,
    color: colors.text.dark,
    fontWeight: '600',
  },
  formatButtonTextSelected: {
    color: colors.text.light,
  },
  premiumBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.premium.gold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  premiumBadgeSmall: {
    backgroundColor: colors.premium.gold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  premiumBadgeText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.text.dark,
    fontWeight: '700',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    ...typography.body,
    color: colors.text.dark,
    fontWeight: '600',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.1)',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: colors.primary.blue,
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.text.light,
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  slider: {
    width: '100%',
    height: 40,
    marginVertical: 8,
  },
  fileSizeText: {
    ...typography.callout,
    color: 'rgba(0,0,0,0.6)',
    textAlign: 'right',
  },
  resolutionDropdown: {
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.08)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.03)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  resolutionDropdownOpen: {
    borderColor: colors.primary.blue,
    backgroundColor: 'rgba(102,126,234,0.12)',
  },
  resolutionDropdownText: {
    ...typography.body,
    color: colors.text.dark,
    fontWeight: '600',
  },
  resolutionPickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  resolutionPickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  resolutionListContainer: {
    width: '100%',
    maxHeight: MODAL_HEIGHT * 0.6,
    backgroundColor: colors.background.light,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  resolutionListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  resolutionListTitle: {
    ...typography.body,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.dark,
  },
  resolutionCloseButton: {
    padding: 4,
  },
  resolutionScrollView: {
    maxHeight: MODAL_HEIGHT * 0.5,
  },
  resolutionOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 0,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  resolutionOptionSelected: {
    backgroundColor: 'rgba(102,126,234,0.12)',
  },
  resolutionOptionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  resolutionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resolutionLabel: {
    ...typography.body,
    color: colors.text.dark,
  },
  resolutionLabelLocked: {
    opacity: 0.5,
  },
  filenameInput: {
    height: 48,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    ...typography.body,
    color: colors.text.dark,
  },
  fileInfo: {
    padding: 16,
    backgroundColor: 'rgba(102,126,234,0.1)',
    borderRadius: 12,
    gap: 8,
  },
  fileInfoText: {
    ...typography.callout,
    color: colors.text.dark,
  },
  footer: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    height: 56,
    backgroundColor: colors.primary.blue,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  saveButton: {
    backgroundColor: colors.accent.green,
  },
  shareButton: {
    flex: 1,
  },
  exportButtonText: {
    ...typography.title,
    color: colors.text.light,
    fontWeight: '600',
  },
  exportingContainer: {
    alignItems: 'center',
    gap: 12,
  },
  exportingText: {
    ...typography.body,
    color: colors.text.dark,
  },
});
