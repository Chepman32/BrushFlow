export type Tool =
  | 'brush'
  | 'pencil'
  | 'eraser'
  | 'fill'
  | 'colorPicker'
  | 'selection'
  | 'smudge' // Premium
  | 'blur' // Premium
  | 'cloneStamp' // Premium
  | 'symmetry'; // Premium

export interface BrushSettings {
  size: number; // 1-200 pixels
  opacity: number; // 0-1
  color: string; // RGBA hex
  tool: Tool;
  smoothing: number; // 0-100%
  pressureSensitivity: boolean;
}

export interface CanvasTransform {
  scale: number; // 0.25-32
  translateX: number;
  translateY: number;
  rotation: number; // degrees
}

export interface Point {
  x: number;
  y: number;
  pressure?: number;
  timestamp?: number;
}

export interface Stroke {
  points: Point[];
  color: string;
  size: number;
  opacity: number;
  tool: Tool;
}
