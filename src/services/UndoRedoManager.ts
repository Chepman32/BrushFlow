import { Layer } from '../types';

interface CanvasState {
  layers: Layer[];
  timestamp: number;
}

export class UndoRedoManager {
  private static instance: UndoRedoManager;
  private undoStack: CanvasState[] = [];
  private redoStack: CanvasState[] = [];
  private maxHistorySize: number = 50;

  private constructor() {}

  static getInstance(): UndoRedoManager {
    if (!UndoRedoManager.instance) {
      UndoRedoManager.instance = new UndoRedoManager();
    }
    return UndoRedoManager.instance;
  }

  setMaxHistorySize(size: number): void {
    this.maxHistorySize = size;
    this.trimStack(this.undoStack);
  }

  saveState(layers: Layer[]): void {
    const state: CanvasState = {
      layers: this.deepCloneLayers(layers),
      timestamp: Date.now(),
    };

    this.undoStack.push(state);
    this.trimStack(this.undoStack);

    // Clear redo stack when new action is performed
    this.redoStack = [];
  }

  undo(): Layer[] | null {
    if (this.undoStack.length === 0) {
      return null;
    }

    const currentState = this.undoStack.pop()!;
    this.redoStack.push(currentState);
    this.trimStack(this.redoStack);

    // Return the previous state (or empty if no more states)
    if (this.undoStack.length > 0) {
      return this.deepCloneLayers(
        this.undoStack[this.undoStack.length - 1].layers,
      );
    }

    return [];
  }

  redo(): Layer[] | null {
    if (this.redoStack.length === 0) {
      return null;
    }

    const state = this.redoStack.pop()!;
    this.undoStack.push(state);
    this.trimStack(this.undoStack);

    return this.deepCloneLayers(state.layers);
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  getUndoStackSize(): number {
    return this.undoStack.length;
  }

  getRedoStackSize(): number {
    return this.redoStack.length;
  }

  private deepCloneLayers(layers: Layer[]): Layer[] {
    return layers.map(layer => ({
      ...layer,
      strokes: layer.strokes
        ? layer.strokes.map(stroke => ({
            ...stroke,
            path:
              stroke?.path && typeof stroke.path.copy === 'function'
                ? stroke.path.copy()
                : stroke.path,
          }))
        : [],
    }));
  }

  private trimStack(stack: CanvasState[]): void {
    while (stack.length > this.maxHistorySize) {
      stack.shift();
    }
  }
}
