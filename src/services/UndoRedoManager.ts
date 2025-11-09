import { Layer } from '../types';

export interface SelectionSnapshot {
  rect: { x: number; y: number; width: number; height: number } | null;
  strokeId: string | null;
}

interface CanvasState {
  layers: Layer[];
  selection?: SelectionSnapshot;
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

  initialize(initialLayers: Layer[], selection?: SelectionSnapshot): void {
    const snapshot: CanvasState = {
      layers: this.deepCloneLayers(initialLayers),
      selection: this.cloneSelection(selection),
      timestamp: Date.now(),
    };

    this.undoStack = [snapshot];
    this.redoStack = [];
  }

  saveState(layers: Layer[], selection?: SelectionSnapshot): void {
    const state: CanvasState = {
      layers: this.deepCloneLayers(layers),
      selection:
        this.cloneSelection(selection) ??
        this.cloneSelection(this.getLatestSelection()),
      timestamp: Date.now(),
    };

    this.undoStack.push(state);
    this.trimStack(this.undoStack);

    // Clear redo stack when new action is performed
    this.redoStack = [];
  }

  undo(): CanvasState | null {
    if (this.undoStack.length <= 1) {
      return null;
    }

    const currentState = this.undoStack.pop()!;
    this.redoStack.push(currentState);
    this.trimStack(this.redoStack);

    const previous = this.undoStack[this.undoStack.length - 1];
    return {
      layers: this.deepCloneLayers(previous.layers),
      selection: this.cloneSelection(previous.selection),
      timestamp: previous.timestamp,
    };
  }

  redo(): CanvasState | null {
    if (this.redoStack.length === 0) {
      return null;
    }

    const state = this.redoStack.pop()!;
    this.undoStack.push(state);
    this.trimStack(this.undoStack);

    return {
      layers: this.deepCloneLayers(state.layers),
      selection: this.cloneSelection(state.selection),
      timestamp: state.timestamp,
    };
  }

  canUndo(): boolean {
    return this.undoStack.length > 1;
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
            clipPath:
              stroke?.clipPath && typeof stroke.clipPath.copy === 'function'
                ? stroke.clipPath.copy()
                : stroke.clipPath,
          }))
        : [],
    }));
  }

  private trimStack(stack: CanvasState[]): void {
    while (stack.length > this.maxHistorySize) {
      stack.shift();
    }
  }

  private getLatestSelection(): SelectionSnapshot | undefined {
    if (this.undoStack.length === 0) {
      return undefined;
    }
    return this.undoStack[this.undoStack.length - 1].selection;
  }

  private cloneSelection(
    selection?: SelectionSnapshot | null,
  ): SelectionSnapshot | undefined {
    if (!selection) {
      return selection ?? undefined;
    }
    return {
      rect: selection.rect ? { ...selection.rect } : null,
      strokeId: selection.strokeId ?? null,
    };
  }
}
