import { Skia, SkImage, SkCanvas } from '@shopify/react-native-skia';
import { Layer, BlendMode } from '../types';

export class LayerManager {
  private static instance: LayerManager;
  private layers: Layer[] = [];
  private activeLayerId: string | null = null;
  private listeners: Set<() => void> = new Set();

  private constructor() {}

  static getInstance(): LayerManager {
    if (!LayerManager.instance) {
      LayerManager.instance = new LayerManager();
    }
    return LayerManager.instance;
  }

  initializeLayers(width: number, height: number): void {
    // Create default background layer
    const backgroundLayer: Layer = {
      id: `layer_${Date.now()}`,
      name: 'Background',
      opacity: 1,
      blendMode: 'normal',
      visible: true,
      locked: false,
      x: 0,
      y: 0,
      width,
      height,
    };

    this.layers = [backgroundLayer];
    this.activeLayerId = backgroundLayer.id;
    this.notifyListeners();
  }

  addLayer(position?: number): Layer {
    const newLayer: Layer = {
      id: `layer_${Date.now()}_${Math.random()}`,
      name: `Layer ${this.layers.length + 1}`,
      opacity: 1,
      blendMode: 'normal',
      visible: true,
      locked: false,
      x: 0,
      y: 0,
      width: this.layers[0]?.width || 1080,
      height: this.layers[0]?.height || 1080,
    };

    if (
      position !== undefined &&
      position >= 0 &&
      position <= this.layers.length
    ) {
      this.layers.splice(position, 0, newLayer);
    } else {
      this.layers.push(newLayer);
    }

    this.activeLayerId = newLayer.id;
    this.notifyListeners();
    return newLayer;
  }

  deleteLayer(id: string): void {
    if (this.layers.length <= 1) {
      console.warn('Cannot delete the last layer');
      return;
    }

    const index = this.layers.findIndex(layer => layer.id === id);
    if (index !== -1) {
      this.layers.splice(index, 1);

      // Set active layer to the one below or above
      if (this.activeLayerId === id) {
        const newIndex = Math.min(index, this.layers.length - 1);
        this.activeLayerId = this.layers[newIndex].id;
      }

      this.notifyListeners();
    }
  }

  reorderLayer(id: string, newIndex: number): void {
    const currentIndex = this.layers.findIndex(layer => layer.id === id);
    if (currentIndex === -1 || newIndex < 0 || newIndex >= this.layers.length) {
      return;
    }

    const [layer] = this.layers.splice(currentIndex, 1);
    this.layers.splice(newIndex, 0, layer);
    this.notifyListeners();
  }

  setLayerOpacity(id: string, opacity: number): void {
    const layer = this.layers.find(l => l.id === id);
    if (layer) {
      layer.opacity = Math.max(0, Math.min(1, opacity));
      this.notifyListeners();
    }
  }

  setLayerBlendMode(id: string, mode: BlendMode): void {
    const layer = this.layers.find(l => l.id === id);
    if (layer) {
      layer.blendMode = mode;
      this.notifyListeners();
    }
  }

  setLayerVisibility(id: string, visible: boolean): void {
    const layer = this.layers.find(l => l.id === id);
    if (layer) {
      layer.visible = visible;
      this.notifyListeners();
    }
  }

  setLayerLocked(id: string, locked: boolean): void {
    const layer = this.layers.find(l => l.id === id);
    if (layer) {
      layer.locked = locked;
      this.notifyListeners();
    }
  }

  setLayerName(id: string, name: string): void {
    const layer = this.layers.find(l => l.id === id);
    if (layer) {
      layer.name = name;
      this.notifyListeners();
    }
  }

  setActiveLayer(id: string): void {
    if (this.layers.find(l => l.id === id)) {
      this.activeLayerId = id;
      this.notifyListeners();
    }
  }

  getActiveLayer(): Layer | null {
    return this.layers.find(l => l.id === this.activeLayerId) || null;
  }

  getLayer(id: string): Layer | null {
    return this.layers.find(l => l.id === id) || null;
  }

  getLayers(): Layer[] {
    return [...this.layers];
  }

  getActiveLayerId(): string | null {
    return this.activeLayerId;
  }

  duplicateLayer(id: string): Layer | null {
    const layer = this.layers.find(l => l.id === id);
    if (!layer) {
      return null;
    }

    const duplicated: Layer = {
      ...layer,
      id: `layer_${Date.now()}_${Math.random()}`,
      name: `${layer.name} Copy`,
    };

    const index = this.layers.findIndex(l => l.id === id);
    this.layers.splice(index + 1, 0, duplicated);
    this.activeLayerId = duplicated.id;
    this.notifyListeners();

    return duplicated;
  }

  mergeDown(id: string): void {
    const index = this.layers.findIndex(l => l.id === id);
    if (index === 0) {
      console.warn('Cannot merge down the bottom layer');
      return;
    }

    // TODO: Implement actual layer merging with Skia
    // For now, just remove the top layer
    this.layers.splice(index, 1);
    this.activeLayerId = this.layers[index - 1].id;
    this.notifyListeners();
  }

  clearLayer(id: string): void {
    const layer = this.layers.find(l => l.id === id);
    if (layer) {
      // TODO: Clear the layer's bitmap data
      this.notifyListeners();
    }
  }

  compositeLayersToCanvas(canvas: SkCanvas): void {
    // Render layers from bottom to top
    for (const layer of this.layers) {
      if (!layer.visible) {
        continue;
      }

      // TODO: Apply blend mode and opacity
      // TODO: Render layer bitmap to canvas
    }
  }

  generateThumbnail(layer: Layer, size: number): SkImage | null {
    // TODO: Generate thumbnail using Skia
    return null;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  reset(): void {
    this.layers = [];
    this.activeLayerId = null;
    this.notifyListeners();
  }
}
