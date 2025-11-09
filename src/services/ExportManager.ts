import { Artwork, ExportFormat, ExportOptions } from '../types';
import RNFS from 'react-native-fs';
import {
  Skia,
  Image as SkiaImage,
  PaintStyle,
  StrokeCap,
  StrokeJoin,
  ColorType,
  AlphaType,
  ImageFormat,
  ClipOp,
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
import { writePsdUint8Array, ColorMode, type Layer as PsdLayer, type Psd } from 'ag-psd';
import * as UTIF from 'utif';

const DEFAULT_EXPORT_WIDTH = 1080;
const DEFAULT_EXPORT_HEIGHT = 1440;
const EXPORTS_DIR = `${RNFS.DocumentDirectoryPath}/Exports`;

type RasterPixelData = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

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

      if (options.format === 'svg') {
        onProgress?.(30);
        const exportPath = await this.exportToSvg(artwork, options);
        onProgress?.(100);

        const hapticManager = HapticManager.getInstance();
        hapticManager.exportComplete();
        return exportPath;
      }

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
    const supportsTransparency = ['png', 'psd', 'tiff', 'svg'].includes(options.format);
    const shouldPreserveTransparency = supportsTransparency
      ? options.preserveTransparency !== false
      : false;
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

    if (shouldPreserveTransparency) {
      canvas.clear(Skia.Color('rgba(0,0,0,0)'));
    } else {
      const backgroundPaint = Skia.Paint();
      backgroundPaint.setStyle(PaintStyle.Fill);
      backgroundPaint.setColor(
        Skia.Color(artwork.backgroundColor || '#FFFFFF'),
      );
      canvas.drawRect(
        Skia.XYWHRect(0, 0, targetWidth, targetHeight),
        backgroundPaint,
      );
    }

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

        let clipPath = null;
        if (stroke.clipPathSvg) {
          clipPath = Skia.Path.MakeFromSVGString(stroke.clipPathSvg);
          if (clipPath) {
            canvas.save();
            canvas.clipPath(clipPath, ClipOp.Intersect, true);
          }
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

        if (clipPath) {
          canvas.restore();
        }
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
    const exportDir = await this.ensureExportsDirectory();
    let filePath: string | null = null;
    let data: Uint8Array | null = null;

    switch (options.format) {
      case 'png': {
        filePath = `${exportDir}/${filename}.png`;
        data = image.encodeToBytes(ImageFormat.PNG);
        break;
      }
      case 'jpeg': {
        filePath = `${exportDir}/${filename}.jpg`;
        const quality = Math.min(100, Math.max(1, options.quality ?? 90));
        data = image.encodeToBytes(ImageFormat.JPEG, quality);
        break;
      }
      case 'svg':
        return this.exportToSvg(artwork, options);
      case 'psd':
        return this.exportToPsd(image, artwork, options);
      case 'tiff':
        return this.exportToTiff(image, options);
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }

    if (!filePath || !data) {
      throw new Error(`Failed to encode format: ${options.format}`);
    }

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

  private readImagePixels(image: SkiaImage): RasterPixelData {
    const width = Math.max(1, image.width());
    const height = Math.max(1, image.height());
    const imageInfo = {
      width,
      height,
      colorType: ColorType.RGBA_8888,
      alphaType: AlphaType.Unpremul,
    };
    const pixels = image.readPixels(0, 0, imageInfo);
    if (!pixels) {
      throw new Error('Unable to read image pixels for export.');
    }

    let uintArray: Uint8Array | Uint8ClampedArray;
    if (pixels instanceof Uint8Array || pixels instanceof Uint8ClampedArray) {
      uintArray = pixels;
    } else {
      uintArray = new Uint8Array(pixels.length);
      for (let i = 0; i < pixels.length; i++) {
        const value = pixels[i];
        const normalized = Number.isFinite(value)
          ? Math.max(0, Math.min(1, value))
          : 0;
        uintArray[i] = Math.round(normalized * 255);
      }
    }

    const clamped =
      uintArray instanceof Uint8ClampedArray
        ? uintArray
        : new Uint8ClampedArray(uintArray);

    return {
      width,
      height,
      data: clamped,
    };
  }

  private async exportToPsd(
    image: SkiaImage,
    artwork: Artwork,
    options: ExportOptions,
  ): Promise<string> {
    const raster = this.readImagePixels(image);
    const exportDir = await this.ensureExportsDirectory();
    const baseFilename =
      options.filename?.replace(/\.psd$/i, '') || `artwork_${Date.now()}`;
    const filePath = `${exportDir}/${baseFilename}.psd`;

    const layerName = options.filename || artwork.name || 'Artwork';
    const baseLayer: PsdLayer = {
      name: layerName,
      opacity: 255,
      visible: true,
      blendMode: 'normal',
      top: 0,
      left: 0,
      right: raster.width,
      bottom: raster.height,
      imageData: raster,
    };
    const psdDocument: Psd = {
      width: raster.width,
      height: raster.height,
      bitsPerChannel: 8,
      colorMode: ColorMode.RGB,
      channels: 3,
      imageData: raster,
      children: [baseLayer],
    };

    const psdBytes = writePsdUint8Array(psdDocument);
    const base64Data = Buffer.from(psdBytes).toString('base64');
    await RNFS.writeFile(filePath, base64Data, 'base64');

    return filePath;
  }

  private async exportToTiff(
    image: SkiaImage,
    options: ExportOptions,
  ): Promise<string> {
    const raster = this.readImagePixels(image);
    const exportDir = await this.ensureExportsDirectory();
    const baseFilename =
      options.filename?.replace(/\.tiff?$/i, '') || `artwork_${Date.now()}`;
    const filePath = `${exportDir}/${baseFilename}.tiff`;

    const metadata =
      options.dpi && options.dpi > 0
        ? {
            t282: [options.dpi],
            t283: [options.dpi],
          }
        : undefined;

    const tiffBuffer = UTIF.encodeImage(
      raster.data,
      raster.width,
      raster.height,
      metadata,
    );
    const bytes = new Uint8Array(tiffBuffer);
    const base64Data = Buffer.from(bytes).toString('base64');
    await RNFS.writeFile(filePath, base64Data, 'base64');

    return filePath;
  }

  private async ensureExportsDirectory(): Promise<string> {
    const exists = await RNFS.exists(EXPORTS_DIR);
    if (!exists) {
      await RNFS.mkdir(EXPORTS_DIR);
    }
    return EXPORTS_DIR;
  }

  private normalizeColorForSvg(color?: string): { color: string; alpha: number } {
    if (!color) {
      return { color: '#000000', alpha: 1 };
    }

    const hexMatch = color.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i);
    if (hexMatch) {
      const base = `#${hexMatch[1]}`;
      const alphaHex = hexMatch[2];
      const alpha = alphaHex ? parseInt(alphaHex, 16) / 255 : 1;
      const safeAlpha = Number.isFinite(alpha) ? Math.min(Math.max(alpha, 0), 1) : 1;
      return { color: base, alpha: safeAlpha };
    }

    const rgbaMatch = color.match(/^rgba?\(([^)]+)\)$/i);
    if (rgbaMatch) {
      const parts = rgbaMatch[1].split(',').map(part => part.trim());
      const [r = '0', g = '0', b = '0', a] = parts;
      const alpha = a !== undefined ? parseFloat(a) : 1;
      const safeAlpha = Number.isFinite(alpha) ? Math.min(Math.max(alpha, 0), 1) : 1;
      return {
        color: `rgb(${r}, ${g}, ${b})`,
        alpha: safeAlpha,
      };
    }

    return { color, alpha: 1 };
  }

  private async exportToSvg(
    artwork: Artwork,
    options: ExportOptions,
  ): Promise<string> {
    const targetWidth = Math.max(
      1,
      Math.round(options.width ?? artwork.width ?? DEFAULT_EXPORT_WIDTH),
    );
    const targetHeight = Math.max(
      1,
      Math.round(options.height ?? artwork.height ?? DEFAULT_EXPORT_HEIGHT),
    );
    const viewBoxWidth = Math.max(
      1,
      artwork.viewportWidth ?? artwork.width ?? targetWidth,
    );
    const viewBoxHeight = Math.max(
      1,
      artwork.viewportHeight ?? artwork.height ?? targetHeight,
    );

    const preserveTransparency = options.preserveTransparency !== false;
    const backgroundColor = preserveTransparency
      ? null
      : artwork.backgroundColor || '#FFFFFF';

    const svgLines: string[] = [];
    svgLines.push('<?xml version="1.0" encoding="UTF-8"?>');
    svgLines.push(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${targetWidth}" height="${targetHeight}" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" fill="none">`,
    );

    if (backgroundColor) {
      svgLines.push(
        `  <rect width="100%" height="100%" fill="${backgroundColor}" />`,
      );
    }

    const layers = Array.isArray(artwork.layers) ? artwork.layers : [];
    for (const layer of layers) {
      if (layer.visible === false) {
        continue;
      }

      const strokes = Array.isArray(layer.strokes) ? layer.strokes : [];
      for (const stroke of strokes) {
        const pathData =
          stroke.svgPath ||
          (stroke.path &&
          typeof stroke.path.toSVGString === 'function'
            ? stroke.path.toSVGString()
            : null);
        if (!pathData) {
          continue;
        }

        const strokeWidth = Math.max(0.1, stroke.strokeWidth ?? 1);
        const strokeCap = stroke.strokeCap ?? 'round';
        const strokeJoin = stroke.strokeJoin ?? 'round';
        const opacityMultiplier =
          (typeof stroke.opacity === 'number' ? stroke.opacity : 1) *
          (typeof layer.opacity === 'number' ? layer.opacity : 1);
        const { color, alpha } = this.normalizeColorForSvg(stroke.color);
        const combinedOpacity = Math.min(
          1,
          Math.max(0, opacityMultiplier * alpha),
        );
        const opacityAttribute =
          combinedOpacity < 1
            ? ` stroke-opacity="${combinedOpacity.toFixed(3)}"`
            : '';

        svgLines.push(
          `  <path d="${pathData}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="${strokeCap}" stroke-linejoin="${strokeJoin}"${opacityAttribute} />`,
        );
      }
    }

    svgLines.push('</svg>');

    const exportDir = await this.ensureExportsDirectory();
    const baseFilename =
      options.filename?.replace(/\.svg$/i, '') ||
      `artwork_${Date.now()}`;
    const filePath = `${exportDir}/${baseFilename}.svg`;
    await RNFS.writeFile(filePath, svgLines.join('\n'), 'utf8');

    return filePath;
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
      case 'psd':
      case 'tiff':
        return pixels * 4; // RGBA
      case 'jpeg':
        const q = quality || 90;
        return (pixels * 3 * q) / 100; // RGB with quality factor
      case 'svg':
        return Math.max(50000, pixels * 0.5);
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
