import { CanvasTransform, Point } from '../types';

export type GestureType =
  | 'draw'
  | 'pinch'
  | 'pan'
  | 'rotate'
  | 'threeFingerSwipeDown'
  | 'threeFingerSwipeUp'
  | 'threeFingerTap'
  | 'twoFingerLongPress'
  | 'none';

export interface GestureData {
  type: GestureType;
  scale?: number;
  focal?: Point;
  translation?: Point;
  angle?: number;
  velocity?: Point;
}

export class GestureProcessor {
  private static instance: GestureProcessor;

  // Gesture thresholds
  private readonly PINCH_THRESHOLD = 10; // pixels
  private readonly PAN_THRESHOLD = 15; // pixels
  private readonly ROTATE_THRESHOLD = 5; // degrees
  private readonly SWIPE_THRESHOLD = 60; // pixels
  private readonly SWIPE_VELOCITY = 0.5; // pixels/ms
  private readonly LONG_PRESS_DURATION = 300; // ms
  private readonly TAP_DURATION = 100; // ms
  private readonly MOVEMENT_THRESHOLD = 10; // pixels

  // Snap angles for rotation
  private readonly SNAP_ANGLES = [0, 90, 180, 270];
  private readonly SNAP_TOLERANCE = 5; // degrees

  // Zoom limits
  private readonly MIN_SCALE = 0.25;
  private readonly MAX_SCALE = 32;

  private constructor() {}

  static getInstance(): GestureProcessor {
    if (!GestureProcessor.instance) {
      GestureProcessor.instance = new GestureProcessor();
    }
    return GestureProcessor.instance;
  }

  processTouch(numberOfTouches: number, hasApplePencil: boolean): GestureType {
    // Apple Pencil has highest priority
    if (hasApplePencil) {
      return 'draw';
    }

    // Three-finger gestures
    if (numberOfTouches === 3) {
      return 'threeFingerSwipeDown'; // Will be determined by movement
    }

    // Two-finger gestures
    if (numberOfTouches === 2) {
      return 'pinch'; // Could be pinch, pan, rotate, or long press
    }

    // Single finger drawing
    if (numberOfTouches === 1) {
      return 'draw';
    }

    return 'none';
  }

  calculatePinchScale(
    currentDistance: number,
    previousDistance: number,
    currentScale: number,
  ): number {
    const scaleDelta = currentDistance / previousDistance;
    let newScale = currentScale * scaleDelta;

    // Clamp to limits
    newScale = Math.max(this.MIN_SCALE, Math.min(this.MAX_SCALE, newScale));

    // Snap to 1.0 if within tolerance
    if (Math.abs(newScale - 1.0) < 0.05) {
      newScale = 1.0;
    }

    return newScale;
  }

  calculateRotation(angle: number): number {
    // Normalize angle to 0-360
    let normalizedAngle = angle % 360;
    if (normalizedAngle < 0) {
      normalizedAngle += 360;
    }

    // Check for snap angles
    for (const snapAngle of this.SNAP_ANGLES) {
      if (Math.abs(normalizedAngle - snapAngle) < this.SNAP_TOLERANCE) {
        return snapAngle;
      }
    }

    return normalizedAngle;
  }

  shouldSnapRotation(angle: number): boolean {
    const normalizedAngle = angle % 360;
    for (const snapAngle of this.SNAP_ANGLES) {
      if (Math.abs(normalizedAngle - snapAngle) < this.SNAP_TOLERANCE) {
        return true;
      }
    }
    return false;
  }

  isPalmTouch(
    touchSize: number,
    touchX: number,
    touchY: number,
    screenWidth: number,
    screenHeight: number,
  ): boolean {
    // Palm touches are typically larger (>20mm diameter)
    const PALM_SIZE_THRESHOLD = 40; // pixels (approximate)

    if (touchSize > PALM_SIZE_THRESHOLD) {
      return true;
    }

    // Palm touches often occur at edges or bottom
    const EDGE_THRESHOLD = 50; // pixels
    const isAtEdge =
      touchX < EDGE_THRESHOLD ||
      touchX > screenWidth - EDGE_THRESHOLD ||
      touchY > screenHeight - EDGE_THRESHOLD;

    if (isAtEdge && touchSize > PALM_SIZE_THRESHOLD * 0.7) {
      return true;
    }

    return false;
  }

  applyMomentum(velocity: Point, decay: number = 0.95): Point {
    return {
      x: velocity.x * decay,
      y: velocity.y * decay,
    };
  }

  calculateRubberBand(
    translation: number,
    bounds: number,
    resistance: number = 0.5,
  ): number {
    if (Math.abs(translation) <= bounds) {
      return translation;
    }

    const excess = Math.abs(translation) - bounds;
    const sign = translation > 0 ? 1 : -1;

    // Exponential resistance
    const rubberBanded = bounds + excess * Math.pow(resistance, excess / 100);

    return sign * rubberBanded;
  }

  getThresholds() {
    return {
      pinch: this.PINCH_THRESHOLD,
      pan: this.PAN_THRESHOLD,
      rotate: this.ROTATE_THRESHOLD,
      swipe: this.SWIPE_THRESHOLD,
      swipeVelocity: this.SWIPE_VELOCITY,
      longPress: this.LONG_PRESS_DURATION,
      tap: this.TAP_DURATION,
      movement: this.MOVEMENT_THRESHOLD,
    };
  }

  getZoomLimits() {
    return {
      min: this.MIN_SCALE,
      max: this.MAX_SCALE,
    };
  }
}
