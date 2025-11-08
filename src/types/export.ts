export type ExportFormat = 'png' | 'jpeg' | 'psd' | 'tiff' | 'svg';

export interface ExportOptions {
  format: ExportFormat;
  width?: number;
  height?: number;
  quality?: number; // JPEG only, 0-100
  preserveTransparency?: boolean; // PNG only
  includeLayers?: boolean; // PSD only
  dpi?: number;
  filename: string;
}

export interface ExportProgress {
  stage: 'flattening' | 'compressing' | 'encoding' | 'writing';
  progress: number; // 0-100
}
