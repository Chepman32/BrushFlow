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
}

export interface Artwork {
  id: string;
  name: string;
  createdAt: Date;
  modifiedAt: Date;
  width: number;
  height: number;
  backgroundColor: string;
  layers: Layer[];
  thumbnailPath: string;
}

export interface ArtworkMetadata {
  id: string;
  name: string;
  createdAt: Date;
  modifiedAt: Date;
  width: number;
  height: number;
  layerCount: number;
  thumbnailPath: string;
}
