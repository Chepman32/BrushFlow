import { Tool, BrushSettings } from '../types';

export class ToolController {
  private currentTool: Tool = 'brush';
  private brushSettings: BrushSettings = {
    size: 10,
    opacity: 1,
    color: '#000000',
    tool: 'brush',
    smoothing: 50,
    pressureSensitivity: true,
    brushType: 'pen',
  };

  selectTool(tool: Tool): void {
    this.currentTool = tool;
    this.brushSettings.tool = tool;
  }

  getCurrentTool(): Tool {
    return this.currentTool;
  }

  getBrushSettings(): BrushSettings {
    return { ...this.brushSettings };
  }

  updateBrushSettings(updates: Partial<BrushSettings>): void {
    this.brushSettings = { ...this.brushSettings, ...updates };
  }

  setBrushSize(size: number): void {
    this.brushSettings.size = Math.max(1, Math.min(200, size));
  }

  setBrushOpacity(opacity: number): void {
    this.brushSettings.opacity = Math.max(0, Math.min(1, opacity));
  }

  setBrushColor(color: string): void {
    this.brushSettings.color = color;
  }

  setSmoothing(smoothing: number): void {
    this.brushSettings.smoothing = Math.max(0, Math.min(100, smoothing));
  }

  setPressureSensitivity(enabled: boolean): void {
    this.brushSettings.pressureSensitivity = enabled;
  }

  isToolLocked(tool: Tool, isPremium: boolean): boolean {
    // Premium gating disabled – all tools are always available
    return false;
  }
}
