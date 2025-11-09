import type { SkPath } from '@shopify/react-native-skia';
import type { BrushType } from './brush';

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'softLight'
  | 'hardLight'
  | 'colorDodge'
  | 'colorBurn'
  | 'darken'
  | 'lighten'
  | 'difference'
  | 'exclusion';

export interface LayerStroke {
  id: string;
  color: string;
  opacity: number;
  strokeWidth: number;
  layerId: string;
  svgPath: string;
  path?: SkPath;
  brushType?: BrushType;
  strokeCap?: 'butt' | 'round' | 'square';
  strokeJoin?: 'miter' | 'round' | 'bevel';
  isEraser?: boolean;
  blendMode?: 'clear' | 'normal';
  isFilled?: boolean;
  clipPathSvg?: string;
}

export interface Layer {
  id: string;
  name: string;
  opacity: number; // 0-1
  blendMode: BlendMode;
  visible: boolean;
  locked: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  // Bitmap data will be stored as base64 string for serialization
  bitmapData?: string;
  strokes?: LayerStroke[];
}

export interface Artwork {
  id: string;
  name: string;
  createdAt: Date;
  modifiedAt: Date;
  projectId?: string | null;
  width: number;
  height: number;
  viewportWidth?: number;
  viewportHeight?: number;
  backgroundColor: string;
  layers: Layer[];
  thumbnailPath: string;
}

export interface ArtworkMetadata {
  id: string;
  name: string;
  createdAt: Date;
  modifiedAt: Date;
  projectId?: string | null;
  width: number;
  height: number;
  layerCount: number;
  thumbnailPath: string;
}

export interface TrashedArtwork extends ArtworkMetadata {
  deletedAt: Date;
  originalPath: string;
  originalThumbnailPath: string;
}

export type TrashRetentionDays = 7 | 30 | 60 | 90;

export interface TrashSettings {
  autoDeleteTrash: boolean;
  trashRetentionDays: TrashRetentionDays;
}
