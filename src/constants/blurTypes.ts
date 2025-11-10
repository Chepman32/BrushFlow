import type { BlurType } from '../types';

export type BlurTypeConfig = {
  id: BlurType;
  label: string;
  icon: string;
  description: string;
  radiusMultiplier: number;
  overlayColor: string;
  overlayOpacity: number;
  highlightColor?: string;
  highlightStrokeWidthMultiplier?: number;
};

export const BLUR_TYPE_SEQUENCE: BlurType[] = ['gaussian', 'radial', 'lens'];

export const BLUR_TYPES: Record<BlurType, BlurTypeConfig> = {
  gaussian: {
    id: 'gaussian',
    label: 'Gaussian',
    icon: 'circle',
    description: 'Balanced soft blur that gently diffuses edges.',
    radiusMultiplier: 1,
    overlayColor: 'rgba(255,255,255,1)',
    overlayOpacity: 0.08,
  },
  radial: {
    id: 'radial',
    label: 'Radial',
    icon: 'radio',
    description: 'Creates a zoom-like blur that stays brightest at the center.',
    radiusMultiplier: 1.35,
    overlayColor: 'rgba(255,255,255,1)',
    overlayOpacity: 0.05,
    highlightColor: 'rgba(255,255,255,0.25)',
    highlightStrokeWidthMultiplier: 0.4,
  },
  lens: {
    id: 'lens',
    label: 'Lens',
    icon: 'aperture',
    description: 'Pronounced lens blur with a subtle glow and rim highlight.',
    radiusMultiplier: 1.65,
    overlayColor: 'rgba(255,255,255,1)',
    overlayOpacity: 0.15,
    highlightColor: 'rgba(255,255,255,0.35)',
    highlightStrokeWidthMultiplier: 0.7,
  },
};

export const getNextBlurType = (current?: BlurType): BlurType => {
  const fallback = BLUR_TYPE_SEQUENCE[0];
  const index = current ? BLUR_TYPE_SEQUENCE.indexOf(current) : -1;
  if (index === -1) {
    return fallback;
  }
  const nextIndex = (index + 1) % BLUR_TYPE_SEQUENCE.length;
  return BLUR_TYPE_SEQUENCE[nextIndex];
};
