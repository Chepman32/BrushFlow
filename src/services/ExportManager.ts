import { Artwork, ExportFormat, ExportOptions } from '../types';
import RNFS from 'react-native-fs';
import { Canvas, Skia, Image as SkiaImage } from '@shopify/react-native-skia';
import { Share, Platform } from 'react-native';
import { HapticManager } from './HapticManager';

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
      const shareOptions = {
        title: 'Share Artwork',
        message: `Check out my artwork: ${filename}`,
        url: Platform.OS === 'ios' ? filePath : `file://${filePath}`,
      };

      await Share.share(shareOptions);
    } catch (error) {
      console.error('Share failed:', error);
      throw error;
    }
  }

  async saveToGallery(filePath: string): Promise<void> {
    try {
      // On iOS, use CameraRoll or similar
      // On Android, copy to Pictures directory
      const destPath = `${
        RNFS.PicturesDirectoryPath
      }/BrushFlow/${Date.now()}.png`;
      await RNFS.mkdir(`${RNFS.PicturesDirectoryPath}/BrushFlow`);
      await RNFS.copyFile(filePath, destPath);

      const hapticManager = HapticManager.getInstance();
      hapticManager.exportComplete();
    } catch (error) {
      console.error('Save to gallery failed:', error);
      throw error;
    }
  }

  private async flattenLayers(
    artwork: Artwork,
    options: ExportOptions,
  ): Promise<SkiaImage> {
    // Create a surface with the export dimensions
    const surface = Skia.Surface.Make(
      options.width || artwork.width,
      options.height || artwork.height,
    );

    if (!surface) {
      throw new Error('Failed to create surface');
    }

    const canvas = surface.getCanvas();

    // Draw background
    const paint = Skia.Paint();
    paint.setColor(Skia.Color('white'));
    canvas.drawRect(Skia.XYWHRect(0, 0, artwork.width, artwork.height), paint);

    // Draw each visible layer
    for (const layer of artwork.layers) {
      if (!layer.visible) continue;

      // Apply layer opacity and blend mode
      paint.setAlphaf(layer.opacity);
      // Note: Blend mode would be set here based on layer.blendMode

      // Draw layer content
      // This would involve rendering all strokes in the layer
      // For now, this is a placeholder
    }

    const image = surface.makeImageSnapshot();
    return image;
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
    await RNFS.writeFile(
      filePath,
      Buffer.from(data).toString('base64'),
      'base64',
    );

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
