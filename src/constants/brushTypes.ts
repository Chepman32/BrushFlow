import type { ImageSourcePropType } from 'react-native';
import type { BrushType } from '../types';

export type BrushTypeConfig = {
  id: BrushType;
  label: string;
  icon: string;
  iconImage?: ImageSourcePropType;
  description: string;
  strokeCap: 'butt' | 'round' | 'square';
  strokeJoin: 'miter' | 'round' | 'bevel';
  sizeMultiplier: number;
  opacityMultiplier: number;
};

export const BRUSH_TYPE_SEQUENCE: BrushType[] = [
  'pen',
  'marker',
  'pencil',
  'leftTip',
];

export const BRUSH_TYPES: Record<BrushType, BrushTypeConfig> = {
  pen: {
    id: 'pen',
    label: 'Pen',
    icon: 'edit-3',
    description: 'Standard round nib that keeps edges perfectly smooth.',
    strokeCap: 'round',
    strokeJoin: 'round',
    sizeMultiplier: 1,
    opacityMultiplier: 1,
  },
  marker: {
    id: 'marker',
    label: 'Marker',
    icon: 'edit',
    description: 'Broad chisel marker with squared edges and dense ink.',
    strokeCap: 'square',
    strokeJoin: 'bevel',
    sizeMultiplier: 1.35,
    opacityMultiplier: 0.95,
  },
  pencil: {
    id: 'pencil',
    label: 'Pencil',
    icon: 'feather',
    description: 'Softer graphite look with lower opacity for sketching.',
    strokeCap: 'round',
    strokeJoin: 'round',
    sizeMultiplier: 0.65,
    opacityMultiplier: 0.6,
  },
  leftTip: {
    id: 'leftTip',
    label: 'Felt-tip Pen',
    icon: 'italic',
    iconImage: require('../assets/icons/felt-tip-pen-icon.png'),
    description: 'Flat calligraphy nib with a left-leaning cut.',
    strokeCap: 'butt',
    strokeJoin: 'miter',
    sizeMultiplier: 1.1,
    opacityMultiplier: 1,
  },
};

export const getNextBrushType = (current: BrushType): BrushType => {
  const index = BRUSH_TYPE_SEQUENCE.indexOf(current);
  if (index === -1) {
    return BRUSH_TYPE_SEQUENCE[0];
  }
  const nextIndex = (index + 1) % BRUSH_TYPE_SEQUENCE.length;
  return BRUSH_TYPE_SEQUENCE[nextIndex];
};
