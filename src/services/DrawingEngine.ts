import { Skia, SkPath, SkPaint } from '@shopify/react-native-skia';
import { Point, Stroke, BrushSettings } from '../types';

export class DrawingEngine {
  private static instance: DrawingEngine;
  private currentStroke: Stroke | null = null;
  private currentPath: SkPath | null = null;
  private currentPoints: Point[] = [];

  private constructor() {}

  static getInstance(): DrawingEngine {
    if (!DrawingEngine.instance) {
      DrawingEngine.instance = new DrawingEngine();
    }
    return DrawingEngine.instance;
  }

  startStroke(
    point: Point,
    brushSettings: BrushSettings,
    layerId: string,
  ): void {
    this.currentPoints = [point];
    this.currentPath = Skia.Path.Make();
    this.currentPath.moveTo(point.x, point.y);

    this.currentStroke = {
      id: `stroke_${Date.now()}_${Math.random()}`,
      points: [point],
      brushSettings: { ...brushSettings },
      layerId,
    };
  }

  addStrokePoint(point: Point, pressure: number = 1.0): void {
    if (!this.currentPath || !this.currentStroke) {
      return;
    }

    const pointWithPressure: Point = {
      ...point,
      pressure,
      timestamp: Date.now(),
    };

    this.currentPoints.push(pointWithPressure);
    this.currentStroke.points.push(pointWithPressure);

    // Use quadratic bezier for smooth curves
    if (this.currentPoints.length >= 3) {
      const lastPoint = this.currentPoints[this.currentPoints.length - 2];
      const controlPoint = {
        x: (lastPoint.x + point.x) / 2,
        y: (lastPoint.y + point.y) / 2,
      };
      this.currentPath.quadTo(
        lastPoint.x,
        lastPoint.y,
        controlPoint.x,
        controlPoint.y,
      );
    } else {
      this.currentPath.lineTo(point.x, point.y);
    }
  }

  endStroke(): Stroke | null {
    const stroke = this.currentStroke;

    // Reset current stroke
    this.currentStroke = null;
    this.currentPath = null;
    this.currentPoints = [];

    return stroke;
  }

  getCurrentPath(): SkPath | null {
    return this.currentPath;
  }

  getCurrentStroke(): Stroke | null {
    return this.currentStroke;
  }

  applySmoothing(points: Point[], strength: number = 50): Point[] {
    if (points.length < 3 || strength === 0) {
      return points;
    }

    const smoothed: Point[] = [points[0]];
    const factor = strength / 100;

    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];

      // Catmull-Rom spline interpolation
      const smoothedPoint: Point = {
        x: curr.x * (1 - factor) + ((prev.x + next.x) / 2) * factor,
        y: curr.y * (1 - factor) + ((prev.y + next.y) / 2) * factor,
        pressure: curr.pressure,
        timestamp: curr.timestamp,
      };

      smoothed.push(smoothedPoint);
    }

    smoothed.push(points[points.length - 1]);
    return smoothed;
  }

  createPaint(brushSettings: BrushSettings): SkPaint {
    const paint = Skia.Paint();
    paint.setColor(Skia.Color(brushSettings.color));
    paint.setStrokeWidth(brushSettings.size);
    paint.setStyle(1); // Stroke style
    paint.setStrokeCap(1); // Round cap
    paint.setStrokeJoin(1); // Round join
    paint.setAntiAlias(true);
    paint.setAlphaf(brushSettings.opacity);

    return paint;
  }

  calculateStrokeWidth(
    baseSize: number,
    pressure: number,
    pressureSensitivity: boolean,
  ): number {
    if (!pressureSensitivity) {
      return baseSize;
    }

    // Modulate width based on pressure (0.5x to 1.5x)
    const minMultiplier = 0.5;
    const maxMultiplier = 1.5;
    const multiplier =
      minMultiplier + pressure * (maxMultiplier - minMultiplier);

    return baseSize * multiplier;
  }

  clearCurrentStroke(): void {
    this.currentStroke = null;
    this.currentPath = null;
    this.currentPoints = [];
  }
}
