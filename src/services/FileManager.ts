import RNFS from 'react-native-fs';
import { Artwork, ArtworkMetadata, Layer } from '../types/artwork';

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
    // Create directories if they don't exist
    await this.ensureDirectoryExists(ARTWORKS_DIR);
    await this.ensureDirectoryExists(THUMBNAILS_DIR);
    await this.ensureDirectoryExists(EXPORTS_DIR);
  }

  private async ensureDirectoryExists(path: string): Promise<void> {
    const exists = await RNFS.exists(path);
    if (!exists) {
      await RNFS.mkdir(path);
    }
  }

  async saveArtwork(artwork: Artwork): Promise<string> {
    const filePath = `${ARTWORKS_DIR}/${artwork.id}.bflow`;

    // Serialize artwork to JSON (simplified version of .bflow format)
    const data = JSON.stringify({
      ...artwork,
      createdAt: artwork.createdAt.toISOString(),
      modifiedAt: artwork.modifiedAt.toISOString(),
    });

    await RNFS.writeFile(filePath, data, 'utf8');
    return filePath;
  }

  async loadArtwork(id: string): Promise<Artwork> {
    const filePath = `${ARTWORKS_DIR}/${id}.bflow`;
    const data = await RNFS.readFile(filePath, 'utf8');
    const parsed = JSON.parse(data);

    return {
      ...parsed,
      createdAt: new Date(parsed.createdAt),
      modifiedAt: new Date(parsed.modifiedAt),
    };
  }

  async deleteArtwork(id: string): Promise<void> {
    const artworkPath = `${ARTWORKS_DIR}/${id}.bflow`;
    const thumbnailPath = `${THUMBNAILS_DIR}/thumb-${id}.jpg`;

    // Delete artwork file
    const artworkExists = await RNFS.exists(artworkPath);
    if (artworkExists) {
      await RNFS.unlink(artworkPath);
    }

    // Delete thumbnail
    const thumbnailExists = await RNFS.exists(thumbnailPath);
    if (thumbnailExists) {
      await RNFS.unlink(thumbnailPath);
    }
  }

  async listArtworks(): Promise<ArtworkMetadata[]> {
    const files = await RNFS.readDir(ARTWORKS_DIR);
    const artworkFiles = files.filter(file => file.name.endsWith('.bflow'));

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
    const thumbnailPath = `${THUMBNAILS_DIR}/thumb-${artwork.id}.jpg`;

    // TODO: Implement actual thumbnail generation using Skia
    // For now, we'll just create a placeholder
    // In a real implementation, this would:
    // 1. Composite all visible layers
    // 2. Scale down to 512x512
    // 3. Save as JPEG at 80% quality

    return thumbnailPath;
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
}
