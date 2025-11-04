import { Skia, SkImage, SkCanvas } from '@shopify/react-native-skia';
import { Layer, BlendMode } from '../types';

export class LayerManager {
  private layers: Layer[] = [];
  private activeLayerId: string | null = null;

  constructor() {
    // Create default layer
    this.addLayer();
  }

  addLayer(position?: number): Layer {
    const layer: Layer = {
      id: `layer_${Date.now()}_${Math.random()}`,
      name: `Layer ${this.layers.length + 1}`,
      opacity: 1,
      blendMode: 'normal',
      visible: true,
      locked: false,
      x: 0,
      y: 0,
      width: 1080,
      height: 1080,
    };

    if (position !== undefined) {
      this.layers.splice(position, 0, layer);
    } else {
      this.layers.push(layer);
    }

    if (!this.activeLayerId) {
      this.activeLayerId = layer.id;
    }

    return layer;
  }

  deleteLayer(id: string): boolean {
    const index = this.layers.findIndex(l => l.id === id);
    if (index === -1 || this.layers.length === 1) {
      return false; // Can't delete last layer
    }

    this.layers.splice(index, 1);

    if (this.activeLayerId === id) {
      this.activeLayerId = this.layers[Math.max(0, index - 1)].id;
    }

    return true;
  }

  reorderLayer(id: string, newIndex: number): boolean {
    const currentIndex = this.layers.findIndex(l => l.id === id);
    if (currentIndex === -1) return false;

    const [layer] = this.layers.splice(currentIndex, 1);
    this.layers.splice(newIndex, 0, layer);

    return true;
  }

  getLayer(id: string): Layer | undefined {
    return this.layers.find(l => l.id === id);
  }

  getActiveLayer(): Layer | undefined {
    if (!this.activeLayerId) return undefined;
    return this.getLayer(this.activeLayerId);
  }

  setActiveLayer(id: string): boolean {
    const layer = this.getLayer(id);
    if (!layer) return false;

    this.activeLayerId = id;
    return true;
  }

  setLayerOpacity(id: string, opacity: number): boolean {
    const layer = this.getLayer(id);
    if (!layer) return false;

    layer.opacity = Math.max(0, Math.min(1, opacity));
    return true;
  }

  setLayerBlendMode(id: string, mode: BlendMode): boolean {
    const layer = this.getLayer(id);
    if (!layer) return false;

    layer.blendMode = mode;
    return true;
  }

  setLayerVisibility(id: string, visible: boolean): boolean {
    const layer = this.getLayer(id);
    if (!layer) return false;

    layer.visible = visible;
    return true;
  }

  setLayerLocked(id: string, locked: boolean): boolean {
    const layer = this.getLayer(id);
    if (!layer) return false;

    layer.locked = locked;
    return true;
  }

  setLayerName(id: string, name: string): boolean {
    const layer = this.getLayer(id);
    if (!layer) return false;

    layer.name = name;
    return true;
  }

  getLayers(): Layer[] {
    return [...this.layers];
  }

  getVisibleLayers(): Layer[] {
    return this.layers.filter(l => l.visible);
  }

  getLayerCount(): number {
    return this.layers.length;
  }

  duplicateLayer(id: string): Layer | null {
    const layer = this.getLayer(id);
    if (!layer) return null;

    const duplicate: Layer = {
      ...layer,
      id: `layer_${Date.now()}_${Math.random()}`,
      name: `${layer.name} Copy`,
    };

    const index = this.layers.findIndex(l => l.id === id);
    this.layers.splice(index + 1, 0, duplicate);

    return duplicate;
  }

  mergeDown(id: string): boolean {
    const index = this.layers.findIndex(l => l.id === id);
    if (index === 0 || index === -1) {
      return false; // Can't merge bottom layer or layer not found
    }

    // In a real implementation, this would merge the bitmap data
    // For now, just remove the upper layer
    this.layers.splice(index, 1);

    return true;
  }

  clear(): void {
    this.layers = [];
    this.activeLayerId = null;
    this.addLayer(); // Always have at least one layer
  }
}
