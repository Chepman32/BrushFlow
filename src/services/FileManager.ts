import RNFS from 'react-native-fs';
import { Buffer } from 'buffer';
import { Artwork, ArtworkMetadata, Layer, TrashedArtwork } from '../types/artwork';
import { PaintStyle, Skia, ImageFormat } from '@shopify/react-native-skia';

const ARTWORKS_DIR = `${RNFS.DocumentDirectoryPath}/Artworks`;
const THUMBNAILS_DIR = `${RNFS.DocumentDirectoryPath}/Thumbnails`;
const EXPORTS_DIR = `${RNFS.DocumentDirectoryPath}/Exports`;
const TRASH_DIR = `${RNFS.DocumentDirectoryPath}/Trash`;
const TRASH_THUMBNAILS_DIR = `${TRASH_DIR}/Thumbnails`;

export interface ExportOptions {
  format: 'png' | 'jpeg' | 'psd' | 'tiff' | 'svg';
  width?: number;
  height?: number;
  quality?: number;
  preserveTransparency?: boolean;
  includeLayers?: boolean;
  dpi?: number;
  filename: string;
}

export class FileManager {
  private static instance: FileManager;

  private constructor() {}

  static getInstance(): FileManager {
    if (!FileManager.instance) {
      FileManager.instance = new FileManager();
    }
    return FileManager.instance;
  }

  async initialize(): Promise<void> {
    await this.ensureCoreDirectories();
  }

  private async ensureDirectoryExists(path: string): Promise<void> {
    const exists = await RNFS.exists(path);
    if (!exists) {
      await RNFS.mkdir(path);
    }
  }

  private async ensureCoreDirectories(): Promise<void> {
    await this.ensureDirectoryExists(ARTWORKS_DIR);
    await this.ensureDirectoryExists(THUMBNAILS_DIR);
    await this.ensureDirectoryExists(EXPORTS_DIR);
    await this.ensureDirectoryExists(TRASH_DIR);
    await this.ensureDirectoryExists(TRASH_THUMBNAILS_DIR);
  }

  async saveArtwork(artwork: Artwork, customFilename?: string): Promise<string> {
    await this.ensureCoreDirectories();
    const filename = customFilename || `${artwork.id}.bflow`;
    const filePath = `${ARTWORKS_DIR}/${filename}`;

    // Serialize artwork to JSON (simplified version of .bflow format)
    const serializableArtwork = this.prepareArtworkForSerialization(artwork);
    const data = JSON.stringify({
      ...serializableArtwork,
      createdAt: artwork.createdAt.toISOString(),
      modifiedAt: artwork.modifiedAt.toISOString(),
    });

    await RNFS.writeFile(filePath, data, 'utf8');
    return filePath;
  }

  async loadArtwork(id: string): Promise<Artwork> {
    await this.ensureCoreDirectories();
    const filePath = await this.resolveArtworkFilePath(id);
    if (!filePath) {
      throw new Error('Artwork not found');
    }

    const data = await RNFS.readFile(filePath, 'utf8');
    const parsed = JSON.parse(data);

    return {
      ...parsed,
      createdAt: new Date(parsed.createdAt),
      modifiedAt: new Date(parsed.modifiedAt),
    };
  }

  /**
   * @deprecated Use moveToTrash() instead for soft delete, or permanentlyDeleteArtwork() for hard delete
   */
  async deleteArtwork(id: string): Promise<void> {
    // For backward compatibility, call moveToTrash
    await this.moveToTrash(id);
  }

  async moveToTrash(id: string): Promise<void> {
    await this.ensureCoreDirectories();
    const artworkPath = await this.resolveArtworkFilePath(id);
    if (!artworkPath) {
      throw new Error('Artwork not found');
    }
    const thumbnailPath = `${THUMBNAILS_DIR}/thumb-${id}.jpg`;

    // Load artwork to save trash metadata
    const artwork = await this.loadArtwork(id);

    // Create trash metadata
    const trashedArtwork: TrashedArtwork = {
      id: artwork.id,
      name: artwork.name,
      createdAt: artwork.createdAt,
      modifiedAt: artwork.modifiedAt,
      width: artwork.width,
      height: artwork.height,
      layerCount: artwork.layers.length,
      thumbnailPath: `${TRASH_THUMBNAILS_DIR}/thumb-${id}.jpg`,
      deletedAt: new Date(),
      originalPath: artworkPath,
      originalThumbnailPath: thumbnailPath,
    };

    // Move artwork to trash
    const trashArtworkPath = `${TRASH_DIR}/${id}.bflow`;
    await RNFS.moveFile(artworkPath, trashArtworkPath);

    // Move thumbnail to trash
    const thumbnailExists = await RNFS.exists(thumbnailPath);
    if (thumbnailExists) {
      const trashThumbnailPath = `${TRASH_THUMBNAILS_DIR}/thumb-${id}.jpg`;
      await RNFS.moveFile(thumbnailPath, trashThumbnailPath);
    }

    // Save trash metadata
    const trashMetadataPath = `${TRASH_DIR}/${id}.meta`;
    await RNFS.writeFile(
      trashMetadataPath,
      JSON.stringify({
        ...trashedArtwork,
        deletedAt: trashedArtwork.deletedAt.toISOString(),
        createdAt: trashedArtwork.createdAt.toISOString(),
        modifiedAt: trashedArtwork.modifiedAt.toISOString(),
      }),
      'utf8'
    );
  }

  async listTrashedArtworks(): Promise<TrashedArtwork[]> {
    await this.ensureCoreDirectories();
    const files = await RNFS.readDir(TRASH_DIR);
    const metadataFiles = files.filter(file => file.name.endsWith('.meta'));

    const trashedList: TrashedArtwork[] = [];

    for (const file of metadataFiles) {
      try {
        const data = await RNFS.readFile(file.path, 'utf8');
        const metadata = JSON.parse(data);

        trashedList.push({
          ...metadata,
          createdAt: new Date(metadata.createdAt),
          modifiedAt: new Date(metadata.modifiedAt),
          deletedAt: new Date(metadata.deletedAt),
        });
      } catch (error) {
        console.error(`Failed to read trash metadata ${file.name}:`, error);
      }
    }

    // Sort by deleted date (newest first)
    return trashedList.sort(
      (a, b) => b.deletedAt.getTime() - a.deletedAt.getTime()
    );
  }

  async restoreFromTrash(id: string): Promise<void> {
    await this.ensureCoreDirectories();
    const trashArtworkPath = `${TRASH_DIR}/${id}.bflow`;
    const trashMetadataPath = `${TRASH_DIR}/${id}.meta`;
    const trashThumbnailPath = `${TRASH_THUMBNAILS_DIR}/thumb-${id}.jpg`;

    // Check if artwork exists in trash
    const exists = await RNFS.exists(trashArtworkPath);
    if (!exists) {
      throw new Error('Artwork not found in trash');
    }

    // Move artwork back to artworks directory
    const artworkPath = `${ARTWORKS_DIR}/${id}.bflow`;
    await RNFS.moveFile(trashArtworkPath, artworkPath);

    // Move thumbnail back
    const thumbnailExists = await RNFS.exists(trashThumbnailPath);
    if (thumbnailExists) {
      const thumbnailPath = `${THUMBNAILS_DIR}/thumb-${id}.jpg`;
      await RNFS.moveFile(trashThumbnailPath, thumbnailPath);
    }

    // Delete trash metadata
    const metadataExists = await RNFS.exists(trashMetadataPath);
    if (metadataExists) {
      await RNFS.unlink(trashMetadataPath);
    }
  }

  async permanentlyDeleteFromTrash(id: string): Promise<void> {
    await this.ensureCoreDirectories();
    const trashArtworkPath = `${TRASH_DIR}/${id}.bflow`;
    const trashMetadataPath = `${TRASH_DIR}/${id}.meta`;
    const trashThumbnailPath = `${TRASH_THUMBNAILS_DIR}/thumb-${id}.jpg`;

    // Delete artwork file
    const artworkExists = await RNFS.exists(trashArtworkPath);
    if (artworkExists) {
      await RNFS.unlink(trashArtworkPath);
    }

    // Delete thumbnail
    const thumbnailExists = await RNFS.exists(trashThumbnailPath);
    if (thumbnailExists) {
      await RNFS.unlink(trashThumbnailPath);
    }

    // Delete metadata
    const metadataExists = await RNFS.exists(trashMetadataPath);
    if (metadataExists) {
      await RNFS.unlink(trashMetadataPath);
    }
  }

  async emptyTrash(): Promise<void> {
    await this.ensureCoreDirectories();
    const trashedArtworks = await this.listTrashedArtworks();

    for (const artwork of trashedArtworks) {
      await this.permanentlyDeleteFromTrash(artwork.id);
    }
  }

  async cleanupOldTrash(retentionDays: number): Promise<number> {
    await this.ensureCoreDirectories();
    const trashedArtworks = await this.listTrashedArtworks();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    let deletedCount = 0;

    for (const artwork of trashedArtworks) {
      if (artwork.deletedAt < cutoffDate) {
        await this.permanentlyDeleteFromTrash(artwork.id);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  async getTrashStorageSize(): Promise<number> {
    await this.ensureCoreDirectories();
    const files = await RNFS.readDir(TRASH_DIR);
    const thumbnails = await RNFS.readDir(TRASH_THUMBNAILS_DIR);

    let size = 0;
    for (const file of [...files, ...thumbnails]) {
      size += file.size;
    }

    return size;
  }

  async renameArtwork(id: string, newName: string): Promise<void> {
    await this.ensureCoreDirectories();
    const artworkPath = await this.resolveArtworkFilePath(id);
    if (!artworkPath) {
      throw new Error('Artwork not found');
    }

    const data = await RNFS.readFile(artworkPath, 'utf8');
    const artwork = JSON.parse(data);

    artwork.name = newName;
    artwork.modifiedAt = new Date().toISOString();

    await RNFS.writeFile(artworkPath, JSON.stringify(artwork), 'utf8');
  }

  async listArtworks(): Promise<ArtworkMetadata[]> {
    await this.ensureCoreDirectories();
    const files = await RNFS.readDir(ARTWORKS_DIR);
    const artworkFiles = files.filter(
      file =>
        file.name.endsWith('.bflow') &&
        !file.name.endsWith('_temp.bflow'),
    );

    const metadataList: ArtworkMetadata[] = [];

    for (const file of artworkFiles) {
      try {
        const data = await RNFS.readFile(file.path, 'utf8');
        const artwork = JSON.parse(data);

        metadataList.push({
          id: artwork.id,
          name: artwork.name,
          createdAt: new Date(artwork.createdAt),
          modifiedAt: new Date(artwork.modifiedAt),
          width: artwork.width,
          height: artwork.height,
          layerCount: artwork.layers.length,
          thumbnailPath: `${THUMBNAILS_DIR}/thumb-${artwork.id}.jpg`,
        });
      } catch (error) {
        console.error(`Failed to read artwork ${file.name}:`, error);
      }
    }

    // Sort by modified date (newest first)
    return metadataList.sort(
      (a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime(),
    );
  }

  async generateThumbnail(artwork: Artwork): Promise<string> {
    await this.ensureCoreDirectories();
    const thumbnailPath = `${THUMBNAILS_DIR}/thumb-${artwork.id}.jpg`;

    try {
      // Create a thumbnail surface (512x512 or proportional)
      const thumbnailSize = 512;
      const aspectRatio = artwork.width / artwork.height;
      let thumbWidth = thumbnailSize;
      let thumbHeight = thumbnailSize;

      if (aspectRatio > 1) {
        thumbHeight = thumbnailSize / aspectRatio;
      } else {
        thumbWidth = thumbnailSize * aspectRatio;
      }

      const surface = Skia.Surface.Make(Math.round(thumbWidth), Math.round(thumbHeight));

      if (!surface) {
        console.error('Failed to create thumbnail surface');
        return thumbnailPath;
      }

      const canvas = surface.getCanvas();
      const sourceWidth = artwork.viewportWidth ?? artwork.width;
      const sourceHeight = artwork.viewportHeight ?? artwork.height;
      const scaleX = thumbWidth / sourceWidth;
      const scaleY = thumbHeight / sourceHeight;

      // Scale the canvas to fit the thumbnail size
      canvas.scale(scaleX, scaleY);

      // Draw background
      const bgPaint = Skia.Paint();
      bgPaint.setColor(Skia.Color(artwork.backgroundColor || '#FFFFFF'));
      canvas.drawRect(
        Skia.XYWHRect(0, 0, sourceWidth, sourceHeight),
        bgPaint
      );

      // Draw all visible layers with their strokes
      for (const layer of artwork.layers) {
        if (!layer.visible) continue;

        const paint = Skia.Paint();
        paint.setStyle(PaintStyle.Stroke);
        paint.setAntiAlias(true);

        // Draw each stroke in the layer
        if (layer.strokes) {
          for (const stroke of layer.strokes) {
            if (stroke.svgPath) {
              const path = Skia.Path.MakeFromSVGString(stroke.svgPath);
              if (path) {
                paint.setColor(Skia.Color(stroke.color));
                paint.setStrokeWidth(stroke.strokeWidth);
                paint.setAlphaf(layer.opacity * stroke.opacity);
                canvas.drawPath(path, paint);
              }
            }
          }
        }
      }

      const image = surface.makeImageSnapshot();
      if (!image) {
        throw new Error('Failed to snapshot artwork surface');
      }

      let base64Data: string;
      if (typeof image.encodeToBase64 === 'function') {
        try {
          base64Data = image.encodeToBase64(ImageFormat.JPEG, 80);
        } catch (encodeError) {
          console.warn('JPEG encoding failed, falling back to PNG:', encodeError);
          base64Data = image.encodeToBase64(ImageFormat.PNG);
        }
      } else {
        const bytes = image.encodeToBytes();
        base64Data = Buffer.from(bytes).toString('base64');
      }

      await RNFS.writeFile(thumbnailPath, base64Data, 'base64');

      return thumbnailPath;
    } catch (error) {
      console.error('Thumbnail generation failed:', error);
      return thumbnailPath;
    }
  }

  async exportArtwork(
    artwork: Artwork,
    options: ExportOptions,
  ): Promise<string> {
    const exportPath = `${EXPORTS_DIR}/${options.filename}.${options.format}`;

    // TODO: Implement actual export logic
    // This would:
    // 1. Composite layers based on format
    // 2. Apply format-specific settings
    // 3. Encode to selected format
    // 4. Write to file system

    return exportPath;
  }

  private prepareArtworkForSerialization(artwork: Artwork): Artwork {
    return {
      ...artwork,
      layers: artwork.layers.map(layer => {
        const serializedStrokes = layer.strokes
          ? layer.strokes.map(stroke => {
              const { path, ...strokeRest } = stroke as any;
              return {
                ...strokeRest,
                svgPath:
                  strokeRest.svgPath ??
                  (path && typeof path.toSVGString === 'function'
                    ? path.toSVGString()
                    : ''),
              };
            })
          : [];

        return {
          ...layer,
          strokes: serializedStrokes,
        };
      }),
    };
  }

  async getStorageInfo(): Promise<{ used: number; available: number }> {
    const artworkFiles = await RNFS.readDir(ARTWORKS_DIR);
    const thumbnailFiles = await RNFS.readDir(THUMBNAILS_DIR);

    let used = 0;
    for (const file of [...artworkFiles, ...thumbnailFiles]) {
      used += file.size;
    }

    const freeSpace = await RNFS.getFSInfo();

    return {
      used,
      available: freeSpace.freeSpace,
    };
  }

  async clearCache(): Promise<void> {
    await this.ensureDirectoryExists(THUMBNAILS_DIR);
    // Clear old thumbnails
    const thumbnailFiles = await RNFS.readDir(THUMBNAILS_DIR);
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    for (const file of thumbnailFiles) {
      if (file.mtime && file.mtime.getTime() < thirtyDaysAgo) {
        await RNFS.unlink(file.path);
      }
    }
  }

  private async resolveArtworkFilePath(id: string): Promise<string | null> {
    await this.ensureCoreDirectories();
    const directPath = `${ARTWORKS_DIR}/${id}.bflow`;
    if (await RNFS.exists(directPath)) {
      return directPath;
    }

    try {
      const files = await RNFS.readDir(ARTWORKS_DIR);
      for (const file of files) {
        if (!file.isFile() || !file.name.endsWith('.bflow')) {
          continue;
        }
        try {
          const data = await RNFS.readFile(file.path, 'utf8');
          const parsed = JSON.parse(data);
          if (parsed.id === id) {
            return file.path;
          }
        } catch (error) {
          console.warn('Failed to inspect artwork file during lookup:', file.name, error);
        }
      }
    } catch (error) {
      console.error('Failed to scan artwork directory:', error);
    }

    return null;
  }

  async removeTemporaryArtworkFile(id: string, fallbackPath?: string): Promise<void> {
    await this.ensureDirectoryExists(ARTWORKS_DIR);
    const tempPath = fallbackPath ?? `${ARTWORKS_DIR}/${id}_temp.bflow`;
    try {
      const exists = await RNFS.exists(tempPath);
      if (exists) {
        await RNFS.unlink(tempPath);
      }
    } catch (error) {
      console.warn('Failed to remove temporary artwork file:', tempPath, error);
    }
  }
}
