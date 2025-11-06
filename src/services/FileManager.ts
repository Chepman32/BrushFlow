import RNFS from 'react-native-fs';
import { Buffer } from 'buffer';
import { Artwork, ArtworkMetadata, Layer } from '../types/artwork';
import { PaintStyle, Skia } from '@shopify/react-native-skia';

const ARTWORKS_DIR = `${RNFS.DocumentDirectoryPath}/Artworks`;
const THUMBNAILS_DIR = `${RNFS.DocumentDirectoryPath}/Thumbnails`;
const EXPORTS_DIR = `${RNFS.DocumentDirectoryPath}/Exports`;

export interface ExportOptions {
  format: 'png' | 'jpeg' | 'psd' | 'tiff' | 'svg';
  width: number;
  height: number;
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

  async deleteArtwork(id: string): Promise<void> {
    await this.ensureCoreDirectories();
    const artworkPath = await this.resolveArtworkFilePath(id);
    if (!artworkPath) {
      throw new Error('Artwork not found');
    }
    const thumbnailPath = `${THUMBNAILS_DIR}/thumb-${id}.jpg`;

    // Delete artwork file
    await RNFS.unlink(artworkPath);

    // Delete thumbnail
    const thumbnailExists = await RNFS.exists(thumbnailPath);
    if (thumbnailExists) {
      await RNFS.unlink(thumbnailPath);
    }
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
      const scaleX = thumbWidth / artwork.width;
      const scaleY = thumbHeight / artwork.height;

      // Scale the canvas to fit the thumbnail size
      canvas.scale(scaleX, scaleY);

      // Draw background
      const bgPaint = Skia.Paint();
      bgPaint.setColor(Skia.Color(artwork.backgroundColor || '#FFFFFF'));
      canvas.drawRect(
        Skia.XYWHRect(0, 0, artwork.width, artwork.height),
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
          base64Data = image.encodeToBase64('jpeg', 0.8);
        } catch (encodeError) {
          console.warn('JPEG encoding failed, falling back to PNG:', encodeError);
          base64Data = image.encodeToBase64('png');
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
