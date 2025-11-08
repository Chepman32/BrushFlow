import { Artwork, ExportFormat, ExportOptions } from '../types';
import RNFS from 'react-native-fs';
import {
  Skia,
  Image as SkiaImage,
  PaintStyle,
  StrokeCap,
  StrokeJoin,
} from '@shopify/react-native-skia';
import { Buffer } from 'buffer';
import {
  PermissionsAndroid,
  Platform,
  Share,
  Alert,
} from 'react-native';
import { HapticManager } from './HapticManager';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';

const DEFAULT_EXPORT_WIDTH = 1080;
const DEFAULT_EXPORT_HEIGHT = 1440;

export class ExportManager {
  private static instance: ExportManager;

  private constructor() {}

  static getInstance(): ExportManager {
    if (!ExportManager.instance) {
      ExportManager.instance = new ExportManager();
    }
    return ExportManager.instance;
  }

  async exportArtwork(
    artwork: Artwork,
    options: ExportOptions,
    onProgress?: (progress: number) => void,
  ): Promise<string> {
    try {
      onProgress?.(0);

      // Flatten layers based on format
      onProgress?.(20);
      const flattenedImage = await this.flattenLayers(artwork, options);

      // Apply format-specific compression
      onProgress?.(50);
      const exportPath = await this.saveToFormat(
        flattenedImage,
        artwork,
        options,
      );

      // Complete
      onProgress?.(100);

      const hapticManager = HapticManager.getInstance();
      hapticManager.exportComplete();

      return exportPath;
    } catch (error) {
      console.error('Export failed:', error);
      const hapticManager = HapticManager.getInstance();
      hapticManager.exportFailed();
      throw error;
    }
  }

  async shareArtwork(filePath: string, filename: string): Promise<void> {
    try {
      const normalizedPath = filePath.startsWith('file://')
        ? filePath
        : `file://${filePath}`;

      const shareOptions = {
        title: 'Share Artwork',
        message: `Check out my artwork: ${filename}`,
        url: normalizedPath,
      };

      await Share.share(shareOptions);
    } catch (error) {
      console.error('Share failed:', error);
      throw error;
    }
  }

  async saveToGallery(filePath: string): Promise<void> {
    try {
      const normalizedPath = filePath.startsWith('file://')
        ? filePath
        : `file://${filePath}`;

      if (Platform.OS === 'android') {
        await this.ensureAndroidGalleryPermissions();
      }

      console.log('[ExportManager] Attempting to save to gallery:', normalizedPath);

      try {
        await CameraRoll.save(normalizedPath, {
          type: 'photo',
          album: 'BrushFlow',
        });
        console.log('[ExportManager] Successfully saved to gallery');

        const hapticManager = HapticManager.getInstance();
        hapticManager.exportComplete();
      } catch (saveError) {
        console.error('[ExportManager] CameraRoll.save failed:', saveError);

        // Show error to user
        Alert.alert(
          'Save Failed',
          'Unable to save to photo library. Please rebuild the app after running pod install.',
          [{ text: 'OK' }]
        );
        throw saveError;
      }
    } catch (error) {
      console.error('[ExportManager] Save to gallery failed:', error);
      throw error;
    }
  }

  private async ensureAndroidGalleryPermissions(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    const requestedPermissions: string[] = [];
    const androidVersion = Number(Platform.Version) || 0;

    if (androidVersion >= 33) {
      const imagePermission = PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES;
      if (imagePermission) {
        requestedPermissions.push(imagePermission);
      }
    } else {
      const writePermission =
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE;
      const readPermission =
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

      if (writePermission) {
        requestedPermissions.push(writePermission);
      }
      if (readPermission) {
        requestedPermissions.push(readPermission);
      }
    }

    if (requestedPermissions.length === 0) {
      return;
    }

    const results = await PermissionsAndroid.requestMultiple(
      requestedPermissions,
    );

    const hasDeniedPermission = requestedPermissions.some(
      permission => results[permission] !== PermissionsAndroid.RESULTS.GRANTED,
    );

    if (hasDeniedPermission) {
      throw new Error('Gallery permission was denied.');
    }
  }

  private async flattenLayers(
    artwork: Artwork,
    options: ExportOptions,
  ): Promise<SkiaImage> {
    const targetWidth = Math.max(
      1,
      Math.round(
        options.width ??
          artwork.width ??
          DEFAULT_EXPORT_WIDTH,
      ),
    );
    const targetHeight = Math.max(
      1,
      Math.round(
        options.height ??
          artwork.height ??
          DEFAULT_EXPORT_HEIGHT,
      ),
    );

    const surface = Skia.Surface.Make(targetWidth, targetHeight);

    if (!surface) {
      throw new Error('Failed to create surface');
    }

    const canvas = surface.getCanvas();
    const viewportWidth = Math.max(
      1,
      artwork.viewportWidth ?? artwork.width ?? targetWidth,
    );
    const viewportHeight = Math.max(
      1,
      artwork.viewportHeight ?? artwork.height ?? targetHeight,
    );
    const scaleX = targetWidth / viewportWidth;
    const scaleY = targetHeight / viewportHeight;

    const backgroundPaint = Skia.Paint();
    backgroundPaint.setStyle(PaintStyle.Fill);
    backgroundPaint.setColor(
      Skia.Color(artwork.backgroundColor || '#FFFFFF'),
    );
    canvas.drawRect(Skia.XYWHRect(0, 0, targetWidth, targetHeight), backgroundPaint);

    canvas.save();
    canvas.scale(scaleX, scaleY);

    const layers = Array.isArray(artwork.layers) ? artwork.layers : [];
    for (const layer of layers) {
      if (!layer.visible) continue;
      if (!layer.strokes || layer.strokes.length === 0) {
        continue;
      }

      for (const stroke of layer.strokes) {
        const path =
          stroke.path ||
          (stroke.svgPath
            ? Skia.Path.MakeFromSVGString(stroke.svgPath)
            : null);
        if (!path) {
          continue;
        }

        const strokePaint = Skia.Paint();
        strokePaint.setStyle(PaintStyle.Stroke);
        strokePaint.setAntiAlias(true);
        const strokeWidth =
          typeof stroke.strokeWidth === 'number' ? stroke.strokeWidth : 1;
        strokePaint.setStrokeWidth(Math.max(strokeWidth, 0.1));
        strokePaint.setColor(Skia.Color(stroke.color || '#000000'));
        strokePaint.setAlphaf((stroke.opacity ?? 1) * (layer.opacity ?? 1));
        strokePaint.setStrokeCap(this.resolveStrokeCap(stroke.strokeCap));
        strokePaint.setStrokeJoin(this.resolveStrokeJoin(stroke.strokeJoin));

        canvas.drawPath(path, strokePaint);
      }
    }

    canvas.restore();
    this.drawWatermark(canvas, targetWidth, targetHeight);

    const image = surface.makeImageSnapshot();
    return image;
  }

  private resolveStrokeCap(
    cap?: 'butt' | 'round' | 'square',
  ): StrokeCap {
    switch (cap) {
      case 'butt':
        return StrokeCap.Butt;
      case 'square':
        return StrokeCap.Square;
      default:
        return StrokeCap.Round;
    }
  }

  private resolveStrokeJoin(
    join?: 'miter' | 'round' | 'bevel',
  ): StrokeJoin {
    switch (join) {
      case 'bevel':
        return StrokeJoin.Bevel;
      case 'miter':
        return StrokeJoin.Miter;
      default:
        return StrokeJoin.Round;
    }
  }

  private drawWatermark(canvas: any, width: number, height: number) {
    const watermarkText = 'BrushFlow';

    try {
      const typeface = this.getWatermarkTypeface();
      if (!typeface) {
        console.warn('Unable to create watermark font, skipping watermark.');
        return;
      }

      const fontSize = Math.max(width, height) * 0.035;
      const font = Skia.Font(typeface, fontSize);

      const paint = Skia.Paint();
      paint.setAntiAlias(true);
      paint.setStyle(PaintStyle.Fill);
      paint.setColor(Skia.Color('#FFFFFF'));
      paint.setAlphaf(0.4);

      const textBlob = Skia.TextBlob.MakeFromText?.(watermarkText, font);
      if (!textBlob) {
        console.warn('Unable to create watermark text blob, skipping watermark.');
        return;
      }

      const textWidth =
        font.getTextWidth?.(watermarkText) ??
        fontSize * watermarkText.length * 0.6;
      const margin = Math.max(width, height) * 0.035;
      const x = width - textWidth - margin;
      const y = height - margin;

      canvas.drawTextBlob(textBlob, x, y, paint);
    } catch (error) {
      console.warn('Skipping watermark rendering due to error.', error);
    }
  }

  private getWatermarkTypeface() {
    const fontMgr = Skia.FontMgr?.System?.();
    if (fontMgr) {
      const preferredFamilies = [
        'Inter',
        'Helvetica Neue',
        'Helvetica',
        'System',
        'sans-serif',
      ];
      for (const family of preferredFamilies) {
        try {
          const typeface =
            fontMgr.matchFamilyStyle?.(family, {
              weight: 400,
              width: 5,
              slant: 0,
            }) ?? null;
          if (typeface) {
            return typeface;
          }
        } catch (error) {
          console.warn('Failed to match font family', family, error);
        }
      }
    }

    return Skia.Typeface?.MakeDefault?.() ?? null;
  }

  private async saveToFormat(
    image: SkiaImage,
    artwork: Artwork,
    options: ExportOptions,
  ): Promise<string> {
    const timestamp = Date.now();
    const filename = options.filename || `artwork_${timestamp}`;
    let filePath: string;
    let data: Uint8Array;

    switch (options.format) {
      case 'png':
        filePath = `${RNFS.DocumentDirectoryPath}/Exports/${filename}.png`;
        data = image.encodeToBytes();
        break;

      case 'jpeg':
        filePath = `${RNFS.DocumentDirectoryPath}/Exports/${filename}.jpg`;
        // JPEG encoding with quality
        const quality = options.quality || 90;
        data = image.encodeToBytes(Skia.ImageFormat.JPEG, quality);
        break;

      case 'webp':
        filePath = `${RNFS.DocumentDirectoryPath}/Exports/${filename}.webp`;
        data = image.encodeToBytes(
          Skia.ImageFormat.WEBP,
          options.quality || 90,
        );
        break;

      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }

    // Ensure exports directory exists
    await RNFS.mkdir(`${RNFS.DocumentDirectoryPath}/Exports`);

    // Write file
    const base64Data = Buffer.from(data).toString('base64');
    await RNFS.writeFile(filePath, base64Data, 'base64');

    return filePath;
  }

  async exportHighResolution(
    artwork: Artwork,
    options: ExportOptions,
    onProgress?: (progress: number) => void,
  ): Promise<string> {
    // For high-resolution exports, use tiled rendering
    const tileSize = 1024;
    const tilesX = Math.ceil((options.width || artwork.width) / tileSize);
    const tilesY = Math.ceil((options.height || artwork.height) / tileSize);
    const totalTiles = tilesX * tilesY;

    const tiles: SkiaImage[] = [];

    for (let y = 0; y < tilesY; y++) {
      for (let x = 0; x < tilesX; x++) {
        const tileIndex = y * tilesX + x;
        onProgress?.((tileIndex / totalTiles) * 80);

        // Render tile
        const tile = await this.renderTile(
          artwork,
          x * tileSize,
          y * tileSize,
          tileSize,
          tileSize,
        );
        tiles.push(tile);
      }
    }

    // Combine tiles
    onProgress?.(90);
    const combinedImage = await this.combineTiles(
      tiles,
      tilesX,
      tilesY,
      tileSize,
    );

    // Save
    onProgress?.(95);
    const filePath = await this.saveToFormat(combinedImage, artwork, options);

    onProgress?.(100);
    return filePath;
  }

  private async renderTile(
    artwork: Artwork,
    x: number,
    y: number,
    width: number,
    height: number,
  ): Promise<SkiaImage> {
    const surface = Skia.Surface.Make(width, height);
    if (!surface) {
      throw new Error('Failed to create tile surface');
    }

    const canvas = surface.getCanvas();
    canvas.translate(-x, -y);

    // Render artwork content for this tile region
    // This is a placeholder - actual implementation would render strokes

    return surface.makeImageSnapshot();
  }

  private async combineTiles(
    tiles: SkiaImage[],
    tilesX: number,
    tilesY: number,
    tileSize: number,
  ): Promise<SkiaImage> {
    const totalWidth = tilesX * tileSize;
    const totalHeight = tilesY * tileSize;

    const surface = Skia.Surface.Make(totalWidth, totalHeight);
    if (!surface) {
      throw new Error('Failed to create combined surface');
    }

    const canvas = surface.getCanvas();

    for (let y = 0; y < tilesY; y++) {
      for (let x = 0; x < tilesX; x++) {
        const tileIndex = y * tilesX + x;
        const tile = tiles[tileIndex];

        canvas.drawImage(tile, x * tileSize, y * tileSize);
      }
    }

    return surface.makeImageSnapshot();
  }

  calculateFileSize(
    width: number,
    height: number,
    format: ExportFormat,
    quality?: number,
  ): number {
    // Rough estimation
    const pixels = width * height;

    switch (format) {
      case 'png':
        return pixels * 4; // RGBA
      case 'jpeg':
        const q = quality || 90;
        return (pixels * 3 * q) / 100; // RGB with quality factor
      case 'webp':
        return (pixels * 3 * (quality || 90)) / 100;
      default:
        return pixels * 4;
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
