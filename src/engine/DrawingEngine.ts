import { Skia, SkPath, SkPaint } from '@shopify/react-native-skia';
import { Point, Stroke, Tool } from '../types';

export class DrawingEngine {
  private currentPath: SkPath | null = null;
  private currentPoints: Point[] = [];
  private paint: SkPaint;

  constructor() {
    this.paint = Skia.Paint();
    this.paint.setAntiAlias(true);
    this.paint.setStyle(0); // Fill
  }

  startStroke(
    point: Point,
    color: string,
    size: number,
    opacity: number,
  ): void {
    this.currentPath = Skia.Path.Make();
    this.currentPoints = [point];
    this.currentPath.moveTo(point.x, point.y);

    // Configure paint
    const colorValue = Skia.Color(color);
    this.paint.setColor(colorValue);
    this.paint.setStrokeWidth(size);
    this.paint.setAlphaf(opacity);
    this.paint.setStyle(1); // Stroke
  }

  addStrokePoint(point: Point): void {
    if (!this.currentPath) return;

    this.currentPoints.push(point);

    if (this.currentPoints.length >= 2) {
      const prevPoint = this.currentPoints[this.currentPoints.length - 2];

      // Use quadratic bezier for smoother curves
      const midX = (prevPoint.x + point.x) / 2;
      const midY = (prevPoint.y + point.y) / 2;

      this.currentPath.quadTo(prevPoint.x, prevPoint.y, midX, midY);
    }
  }

  endStroke(): Stroke | null {
    if (!this.currentPath || this.currentPoints.length === 0) {
      return null;
    }

    const stroke: Stroke = {
      points: [...this.currentPoints],
      color: '#000000', // Will be set from paint
      size: this.paint.getStrokeWidth(),
      opacity: this.paint.getAlphaf(),
      tool: 'brush',
    };

    this.currentPath = null;
    this.currentPoints = [];

    return stroke;
  }

  getCurrentPath(): SkPath | null {
    return this.currentPath;
  }

  getCurrentPaint(): SkPaint {
    return this.paint;
  }

  applySmoothing(points: Point[], strength: number): Point[] {
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
      const smoothX = curr.x + (next.x - prev.x) * factor * 0.5;
      const smoothY = curr.y + (next.y - prev.y) * factor * 0.5;

      smoothed.push({
        x: smoothX,
        y: smoothY,
        pressure: curr.pressure,
        timestamp: curr.timestamp,
      });
    }

    smoothed.push(points[points.length - 1]);
    return smoothed;
  }

  createPathFromPoints(points: Point[]): SkPath {
    const path = Skia.Path.Make();

    if (points.length === 0) return path;

    path.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      const prevPoint = points[i - 1];
      const currPoint = points[i];

      const midX = (prevPoint.x + currPoint.x) / 2;
      const midY = (prevPoint.y + currPoint.y) / 2;

      path.quadTo(prevPoint.x, prevPoint.y, midX, midY);
    }

    return path;
  }
}
