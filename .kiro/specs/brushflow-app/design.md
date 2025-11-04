# Design Document: BrushFlow

## Overview

BrushFlow is a professional-grade digital painting application for iOS built with React Native. The architecture leverages high-performance native libraries (React Native Skia for rendering, Reanimated for animations, Gesture Handler for input) to deliver a 60fps+ drawing experience with intuitive gesture-based controls.

The application follows an offline-first architecture with all data stored locally. Premium features are unlocked via In-App Purchases, providing a freemium monetization model that doesn't gate core functionality.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Presentation Layer                         │
│  (React Native Components + Reanimated Animations)      │
├─────────────────────────────────────────────────────────┤
│              Business Logic Layer                       │
│  (Drawing Engine, Tool Controllers, State Management)   │
├─────────────────────────────────────────────────────────┤
│              Rendering Layer                            │
│  (React Native Skia - Canvas, Strokes, Filters)        │
├─────────────────────────────────────────────────────────┤
│              Data Persistence Layer                     │
│  (AsyncStorage, File System, IAP)                       │
└─────────────────────────────────────────────────────────┘
```

### Technology Stack

**Core Framework:**

- React Native 0.73+
- TypeScript for type safety

**Rendering:**

- React Native Skia (Shopify) - GPU-accelerated 2D graphics
- Skia Canvas API for drawing operations
- Skia Image Filters for effects

**Animations:**

- React Native Reanimated 3.x - UI thread animations
- Shared values for direct UI manipulation
- Worklets for animation logic

**Gestures:**

- React Native Gesture Handler - Multi-touch gesture recognition
- Simultaneous gesture handling
- Custom gesture compositions

**Storage:**

- AsyncStorage - User preferences and settings
- React Native File System - Artwork files and thumbnails
- Custom binary format (.bflow) for artwork data

**Monetization:**

- React Native IAP - In-App Purchase integration
- Non-consumable and subscription products

**Navigation:**

- React Navigation 6.x - Screen navigation
- Stack and drawer navigators

## Components and Interfaces

### Screen Components

#### 1. SplashScreen

**Purpose:** Animated app launch screen with particle logo animation

**Key Features:**

- Particle system with 200 elements using Skia Canvas
- Spring physics for particle convergence
- Character-by-character text reveal
- Cross-fade transition to Gallery

**State:**

- `animationProgress`: Shared value tracking animation phase
- `particlePositions`: Array of shared values for each particle

**Animations:**

- Phase 1 (0-1.2s): Particle convergence with spring physics
- Phase 2 (1.2-1.8s): Logo solidification with scale and rotation
- Phase 3 (1.8-2.4s): Text reveal with stagger
- Phase 4 (2.4-2.8s): Fade out transition

#### 2. GalleryScreen

**Purpose:** Main hub displaying saved artworks in masonry grid

**Key Features:**

- Two-column masonry layout with dynamic heights
- Virtualized list for performance
- Pull-to-refresh with custom animation
- Floating Action Button for new artwork

**State:**

- `artworks`: Array of artwork metadata
- `viewMode`: 'grid-2' | 'grid-3' | 'list'
- `searchQuery`: String for filtering
- `selectedArtwork`: Currently selected artwork ID

**Gestures:**

- Vertical scroll with momentum
- Pull-to-refresh (80px threshold)
- Pinch to change view mode
- Swipe on cards for actions
- Long press for context menu

**Components:**

- `ArtworkCard`: Individual artwork thumbnail with metadata
- `MasonryGrid`: Custom layout component
- `FloatingActionButton`: Animated FAB with ripple
- `SearchBar`: Expandable search interface

#### 3. CanvasScreen

**Purpose:** Main drawing workspace with maximalist canvas area

**Key Features:**

- Skia Canvas for drawing surface
- Layer composition and rendering
- Real-time stroke preview
- Auto-hiding UI elements

**State:**

- `layers`: Array of layer objects with bitmaps
- `currentLayer`: Active layer index
- `tool`: Currently selected tool
- `brushSettings`: Size, opacity, color
- `canvasTransform`: Zoom, pan, rotation values
- `undoStack`: Array of canvas states
- `redoStack`: Array of undone states

**Gestures:**

- Single finger/pencil: Draw
- Two-finger pinch: Zoom (0.25x - 32x)
- Two-finger pan: Translate viewport
- Two-finger rotate: Rotate canvas
- Two-finger long press: Eyedropper
- Three-finger swipe down: Undo
- Three-finger swipe up: Redo
- Three-finger tap: Toggle full-screen

**Components:**

- `SkiaCanvas`: Main drawing surface
- `ToolPanel`: Collapsible tool selector and settings
- `TopBar`: Auto-hiding navigation and actions
- `BrushCursor`: Visual feedback for brush size/position

#### 4. LayersPanel

**Purpose:** Layer management interface

**Key Features:**

- Vertical list of layers with thumbnails
- Drag-to-reorder functionality
- Blend mode and opacity controls
- Visibility and lock toggles

**State:**

- `layers`: Reference to canvas layers
- `selectedLayerId`: Currently active layer
- `draggedLayer`: Layer being reordered

**Gestures:**

- Vertical drag: Reorder layers
- Swipe right: Delete layer
- Swipe left: Duplicate layer
- Long press: Multi-select mode

**Components:**

- `LayerItem`: Individual layer with thumbnail and controls
- `BlendModeDropdown`: Blend mode selector
- `OpacitySlider`: Per-layer opacity control

#### 5. ColorPickerModal

**Purpose:** Comprehensive color selection interface

**Key Features:**

- HSV color wheel with Skia rendering
- Brightness slider
- RGB sliders
- Hex input
- Saved colors grid (20 slots)
- Recent colors

**State:**

- `selectedColor`: Current color in RGBA
- `hue`: 0-360 degrees
- `saturation`: 0-1
- `value`: 0-1 (brightness)
- `savedColors`: Array of saved colors

**Components:**

- `ColorWheel`: Circular HSV picker with Skia
- `BrightnessSlider`: Vertical gradient slider
- `RGBSliders`: Three channel sliders
- `HexInput`: Text input with validation
- `ColorGrid`: Saved colors grid

#### 6. ExportModal

**Purpose:** Artwork export and sharing interface

**Key Features:**

- Format selection (PNG, JPEG, PSD, TIFF, SVG)
- Resolution options
- Quality settings
- Real-time file size estimation
- Progress indicator

**State:**

- `format`: Selected export format
- `resolution`: Export dimensions
- `quality`: JPEG quality (0-100)
- `preserveTransparency`: Boolean for PNG
- `filename`: Editable filename
- `exportProgress`: 0-100 percentage

**Components:**

- `FormatSelector`: Segmented control for formats
- `ResolutionDropdown`: Resolution picker
- `QualitySlider`: JPEG quality control
- `ExportProgress`: Circular progress indicator

#### 7. PremiumModal

**Purpose:** Premium feature upsell and purchase flow

**Key Features:**

- Feature list with animations
- Pricing display
- Purchase button with loading state
- Restore purchases option
- Animated particle background

**State:**

- `isPurchasing`: Boolean loading state
- `purchaseStatus`: 'idle' | 'processing' | 'success' | 'error'

**Components:**

- `FeatureList`: Scrollable premium features
- `PricingCard`: Purchase options display
- `PurchaseButton`: IAP trigger button
- `ParticleBackground`: Skia particle animation

#### 8. SideMenu

**Purpose:** Navigation drawer for app sections

**Key Features:**

- Slide-in from left with spring animation
- User profile header
- Menu items with icons
- Premium badge if unlocked

**State:**

- `isOpen`: Boolean menu visibility
- `isPremium`: Premium status

**Components:**

- `MenuHeader`: User avatar and name
- `MenuItem`: Individual menu option with icon
- `MenuFooter`: Version and copyright info

#### 9. SettingsScreen

**Purpose:** App configuration and preferences

**Key Features:**

- Grouped settings sections
- Various input types (toggles, sliders, dropdowns)
- Persistent storage

**State:**

- `settings`: Object with all setting values

**Sections:**

- Canvas Settings
- Drawing Settings
- Interface Settings
- Storage Settings
- Export Defaults
- Premium Status
- About

#### 10. TutorialCarousel

**Purpose:** Onboarding and feature education

**Key Features:**

- 5 slides with animations
- Swipe navigation
- Progress indicators
- Skip option

**State:**

- `currentSlide`: 0-4 index
- `hasCompletedTutorial`: Boolean flag

**Components:**

- `TutorialSlide`: Individual slide with content
- `ProgressDots`: Slide position indicators
- `NavigationButtons`: Next/Skip buttons

### Core Engine Components

#### DrawingEngine

**Purpose:** Manages stroke rendering and canvas operations

**Responsibilities:**

- Convert touch points to Skia paths
- Apply stroke smoothing (Catmull-Rom spline)
- Handle pressure sensitivity
- Render stroke preview
- Commit strokes to layers

**Key Methods:**

```typescript
interface DrawingEngine {
  startStroke(point: Point, pressure: number): void;
  addStrokePoint(point: Point, pressure: number): void;
  endStroke(): void;
  renderStrokePreview(canvas: SkiaCanvas): void;
  commitStroke(layer: Layer): void;
  applySmoothing(points: Point[]): Point[];
}
```

**Stroke Smoothing Algorithm:**

- Catmull-Rom spline interpolation
- Configurable smoothing strength (0-100%)
- Minimum 3 points required for smoothing

#### LayerManager

**Purpose:** Manages layer stack and composition

**Responsibilities:**

- Create, delete, reorder layers
- Apply blend modes and opacity
- Composite layers for display
- Generate layer thumbnails

**Key Methods:**

```typescript
interface LayerManager {
  addLayer(position?: number): Layer;
  deleteLayer(id: string): void;
  reorderLayer(id: string, newIndex: number): void;
  setLayerOpacity(id: string, opacity: number): void;
  setLayerBlendMode(id: string, mode: BlendMode): void;
  compositeLayersToCanvas(canvas: SkiaCanvas): void;
  generateThumbnail(layer: Layer, size: number): SkiaImage;
}
```

**Layer Data Structure:**

```typescript
interface Layer {
  id: string;
  name: string;
  bitmap: SkiaImage;
  opacity: number; // 0-1
  blendMode: BlendMode;
  visible: boolean;
  locked: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}
```

#### ToolController

**Purpose:** Manages tool selection and behavior

**Responsibilities:**

- Switch between tools
- Configure tool settings
- Handle tool-specific gestures
- Apply tool effects

**Supported Tools:**

```typescript
type Tool =
  | 'brush'
  | 'pencil'
  | 'eraser'
  | 'fill'
  | 'colorPicker'
  | 'selection'
  | 'smudge' // Premium
  | 'blur' // Premium
  | 'cloneStamp' // Premium
  | 'symmetry'; // Premium
```

**Key Methods:**

```typescript
interface ToolController {
  selectTool(tool: Tool): void;
  getToolSettings(tool: Tool): ToolSettings;
  updateToolSettings(tool: Tool, settings: Partial<ToolSettings>): void;
  applyTool(canvas: SkiaCanvas, gesture: GestureData): void;
}
```

#### GestureProcessor

**Purpose:** Processes and routes multi-touch gestures

**Responsibilities:**

- Recognize gesture patterns
- Handle gesture conflicts
- Route gestures to appropriate handlers
- Implement palm rejection

**Gesture Priority:**

1. Apple Pencil input (highest)
2. Three-finger gestures
3. Two-finger gestures
4. Tool-specific gestures
5. Single-finger drawing

**Key Methods:**

```typescript
interface GestureProcessor {
  processTouch(event: TouchEvent): GestureType;
  handlePinch(scale: number, focal: Point): void;
  handlePan(translation: Point): void;
  handleRotate(angle: number): void;
  handleSwipe(direction: Direction, fingers: number): void;
  isPalmTouch(touch: Touch): boolean;
}
```

**Palm Rejection Algorithm:**

- Touch size analysis (palm > 20mm diameter)
- Touch position (edges and bottom)
- Touch timing (palm before/after pencil)
- Multiple simultaneous touches

#### FileManager

**Purpose:** Handles artwork file operations

**Responsibilities:**

- Save/load artwork files
- Generate thumbnails
- Manage file system
- Handle exports

**File Format (.bflow):**

```
Header (28 bytes):
- Magic: "BFLOW001" (8 bytes)
- Version: uint32 (4 bytes)
- Width: uint32 (4 bytes)
- Height: uint32 (4 bytes)
- Layer count: uint32 (4 bytes)
- Background: RGBA uint32 (4 bytes)

Layer Blocks (variable):
- Layer ID: uint32 (4 bytes)
- Name: UTF-8 string (64 bytes)
- Dimensions: width, height, x, y (16 bytes)
- Opacity: float32 (4 bytes)
- Blend mode: uint32 (4 bytes)
- Bitmap size: uint32 (4 bytes)
- Bitmap data: raw RGBA (variable)

Footer:
- Checksum: CRC32 (4 bytes)
```

**Key Methods:**

```typescript
interface FileManager {
  saveArtwork(artwork: Artwork): Promise<string>;
  loadArtwork(id: string): Promise<Artwork>;
  deleteArtwork(id: string): Promise<void>;
  exportArtwork(artwork: Artwork, options: ExportOptions): Promise<string>;
  generateThumbnail(artwork: Artwork): Promise<string>;
  listArtworks(): Promise<ArtworkMetadata[]>;
}
```

#### IAPManager

**Purpose:** Manages In-App Purchase operations

**Responsibilities:**

- Initialize IAP connection
- Handle purchase flow
- Validate receipts
- Restore purchases
- Manage premium status

**Products:**

```typescript
const IAP_PRODUCTS = {
  LIFETIME: 'com.brushflow.premium.lifetime',
  MONTHLY: 'com.brushflow.premium.monthly',
};
```

**Key Methods:**

```typescript
interface IAPManager {
  initialize(): Promise<void>;
  getProducts(): Promise<Product[]>;
  purchaseProduct(productId: string): Promise<PurchaseResult>;
  restorePurchases(): Promise<void>;
  isPremium(): boolean;
  validateReceipt(receipt: string): Promise<boolean>;
}
```

## Data Models

### Artwork

```typescript
interface Artwork {
  id: string;
  name: string;
  createdAt: Date;
  modifiedAt: Date;
  width: number;
  height: number;
  backgroundColor: string;
  layers: Layer[];
  thumbnailPath: string;
}
```

### Layer

```typescript
interface Layer {
  id: string;
  name: string;
  bitmap: SkiaImage;
  opacity: number; // 0-1
  blendMode: BlendMode;
  visible: boolean;
  locked: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'softLight'
  | 'hardLight'
  | 'colorDodge'
  | 'colorBurn'
  | 'darken'
  | 'lighten'
  | 'difference'
  | 'exclusion';
```

### BrushSettings

```typescript
interface BrushSettings {
  size: number; // 1-200 pixels
  opacity: number; // 0-1
  color: string; // RGBA hex
  tool: Tool;
  smoothing: number; // 0-100%
  pressureSensitivity: boolean;
}
```

### CanvasTransform

```typescript
interface CanvasTransform {
  scale: number; // 0.25-32
  translateX: number;
  translateY: number;
  rotation: number; // degrees
}
```

### Settings

```typescript
interface AppSettings {
  canvas: {
    defaultSize: { width: number; height: number };
    backgroundColor: string;
    gridOverlay: boolean;
    stabilization: number; // 0-100%
  };
  drawing: {
    pressureSensitivity: boolean;
    palmRejection: 'off' | 'low' | 'medium' | 'high';
    autoSaveInterval: number; // seconds
    undoHistory: number; // steps
  };
  interface: {
    theme: 'light' | 'dark' | 'auto';
    gestureHints: boolean;
    hapticFeedback: boolean;
    animationSpeed: 'slow' | 'normal' | 'fast' | 'instant';
  };
  storage: {
    autoDeleteThumbnails: boolean;
  };
  export: {
    defaultFormat: 'png' | 'jpeg';
    defaultQuality: number; // 0-100
    includeMetadata: boolean;
  };
}
```

### ExportOptions

```typescript
interface ExportOptions {
  format: 'png' | 'jpeg' | 'psd' | 'tiff' | 'svg';
  width: number;
  height: number;
  quality?: number; // JPEG only
  preserveTransparency?: boolean; // PNG only
  includeLayers?: boolean; // PSD only
  dpi?: number;
  filename: string;
}
```

## Error Handling

### Error Categories

**1. File System Errors**

- Insufficient storage space
- File corruption
- Permission denied
- File not found

**Strategy:**

- Display user-friendly error messages
- Offer recovery options (free space, retry)
- Log errors for debugging
- Prevent data loss with atomic writes

**2. Rendering Errors**

- Out of memory
- GPU context loss
- Invalid layer data

**Strategy:**

- Graceful degradation (reduce quality)
- Prompt layer consolidation
- Auto-save before crash
- Crash reporting

**3. IAP Errors**

- Network unavailable
- Purchase cancelled
- Receipt validation failed
- Restore failed

**Strategy:**

- Clear error messages
- Retry mechanisms
- Offline purchase queue
- Support contact option

**4. Gesture Conflicts**

- Ambiguous gesture recognition
- Palm false positives

**Strategy:**

- Gesture priority system
- Configurable sensitivity
- Visual feedback for recognized gestures
- Undo capability

### Error Recovery

**Auto-Save Recovery:**

- Detect incomplete saves on launch
- Offer to recover or discard
- Display recovery UI with preview

**Memory Pressure:**

- Monitor memory usage
- Prompt layer merge when threshold reached
- Clear caches aggressively
- Reduce canvas resolution temporarily

**Crash Recovery:**

- Save canvas state periodically
- Detect crash on next launch
- Offer to restore last session
- Send crash report (with permission)

## Testing Strategy

### Unit Tests

**Components to Test:**

- Color conversion utilities (RGB ↔ HSV ↔ Hex)
- Stroke smoothing algorithm
- Layer blending calculations
- File format serialization/deserialization
- Gesture recognition logic
- IAP state management

**Testing Framework:**

- Jest for JavaScript/TypeScript
- React Native Testing Library for components

**Coverage Target:** 80%+ for business logic

### Integration Tests

**Test Scenarios:**

1. Complete drawing workflow
   - Create artwork → Draw strokes → Save → Load → Verify
2. Layer operations
   - Add layers → Reorder → Change blend modes → Composite
3. Export workflow
   - Draw → Export PNG → Verify file → Export JPEG → Compare
4. IAP flow
   - Mock purchase → Verify unlock → Restore → Verify persistence
5. Settings persistence
   - Change settings → Restart app → Verify loaded

### Performance Tests

**Metrics:**

- Drawing frame rate (target: 60fps, 120fps on ProMotion)
- Canvas zoom/pan responsiveness
- Gallery scroll performance
- App launch time (target: <2s)
- Memory usage (target: <300MB typical)

**Testing Tools:**

- Xcode Instruments (Time Profiler, Core Animation)
- React Native Performance Monitor
- Custom FPS counter overlay

**Test Devices:**

- iPhone SE (3rd gen) - minimum spec
- iPhone 13 - standard device
- iPhone 13 Pro - ProMotion testing
- iPhone 15 Pro Max - latest hardware

### UI/UX Tests

**Manual Testing:**

- Gesture intuitiveness
- Animation smoothness
- Visual polish
- Accessibility with VoiceOver
- Dynamic Type support

**User Testing:**

- Beta testing via TestFlight (50-100 users)
- Feedback collection
- Usage analytics
- Crash reporting

## Performance Optimization

### Rendering Optimizations

**1. Dirty Rectangle Tracking**

- Only redraw changed canvas regions
- Maintain dirty rect list per frame
- Coalesce overlapping rects

**2. Layer Caching**

- Cache static layers as Skia Images
- Invalidate cache on layer modification
- Composite cached layers efficiently

**3. Stroke Coalescing**

- Batch multiple touch points into single path
- Reduce path complexity
- Optimize bezier curve generation

**4. Downsampling During Gestures**

- Render at 50% resolution during zoom/pan
- Upscale with bilinear filtering
- Full resolution on gesture end

**5. GPU Optimization**

- Minimize overdraw
- Use optimal blend modes
- Batch draw calls
- Texture atlasing for UI elements

### Animation Optimizations

**1. UI Thread Execution**

- All animations via Reanimated worklets
- No JS bridge crossing during animation
- Direct shared value manipulation

**2. Frame Budget Management**

- Target 16.67ms per frame (60fps)
- Target 8.33ms per frame (120fps ProMotion)
- Prioritize critical animations
- Defer non-critical updates

**3. Animation Batching**

- Batch multiple property changes
- Single requestAnimationFrame per frame
- Coalesce layout updates

### Memory Optimizations

**1. Bitmap Pooling**

- Reuse bitmap objects
- Pool common sizes
- Lazy allocation

**2. Thumbnail Management**

- Lazy load thumbnails
- LRU cache with size limit
- Progressive JPEG loading
- Aggressive cleanup on background

**3. Layer Limits**

- Free tier: 3 layers max
- Premium: Reasonable limit based on canvas size
- Prompt consolidation at memory threshold

**4. Canvas Resolution Limits**

- Free: 4096×4096 max
- Premium: 8192×8192 max
- Validate on creation
- Warn about memory usage

### Startup Optimizations

**1. Lazy Module Loading**

- Load features on-demand
- Split bundles by screen
- Defer non-critical initialization

**2. Asset Preloading**

- Preload splash animation assets
- Bundle critical icons
- Lazy load tutorial images

**3. Data Loading**

- Batch AsyncStorage reads
- Cache thumbnail index
- Parallel initialization tasks

**4. Code Splitting**

- Separate premium feature code
- Load on first access
- Reduce initial bundle size

## Accessibility

### VoiceOver Support

**Implementation:**

- `accessibilityLabel` on all interactive elements
- `accessibilityHint` for complex actions
- `accessibilityRole` for semantic meaning
- `accessibilityState` for toggles and selections

**Examples:**

```typescript
<TouchableOpacity
  accessibilityLabel="Brush tool"
  accessibilityHint="Double tap to select brush for drawing"
  accessibilityRole="button"
  accessibilityState={{ selected: tool === 'brush' }}
>
```

### Dynamic Type

**Implementation:**

- Use `useWindowDimensions` for responsive sizing
- Scale text with `Platform.select` and `PixelRatio`
- Flexible layouts with `flexWrap` and `flexShrink`
- Test with largest accessibility sizes

### Color Contrast

**Standards:**

- WCAG AA: 4.5:1 for normal text
- WCAG AA: 3:1 for large text
- WCAG AA: 3:1 for UI components

**Implementation:**

- Use contrast checker during design
- Provide high-contrast mode option
- Don't rely solely on color for information

### Motor Accessibility

**Features:**

- Minimum 44×44pt touch targets
- Adjustable gesture timing
- Button alternatives for all gestures
- Rotation snapping assistance

### Keyboard Support (iPad)

**Shortcuts:**

- Cmd+Z: Undo
- Cmd+Shift+Z: Redo
- Cmd+N: New artwork
- Cmd+S: Save
- Cmd+E: Export
- B: Brush tool
- E: Eraser tool
- I: Eyedropper

## Security and Privacy

### Data Privacy

**Local Storage:**

- All artwork data stored locally
- No cloud sync in initial version
- No analytics without consent
- No third-party tracking

**IAP Privacy:**

- Receipt validation client-side only
- No personal data collected
- Apple handles payment processing

### Data Protection

**File Encryption:**

- Use iOS Data Protection API
- Files encrypted at rest
- Secure keychain for IAP receipts

**Secure Coding:**

- Input validation
- Bounds checking
- Memory safety (TypeScript)
- No eval() or dynamic code execution

## Deployment

### Build Configuration

**Development:**

- Debug mode enabled
- Source maps included
- Performance monitor visible
- Fast refresh enabled

**Production:**

- Release mode
- Code minification
- Source maps uploaded to crash reporting
- Performance monitoring enabled

### App Store Submission

**Requirements:**

- iOS 15.0 minimum
- iPhone and iPad support
- Portrait and landscape orientations
- Dark mode support

**Assets:**

- App icon (1024×1024)
- Launch screen
- Screenshots (6.5", 5.5", 12.9")
- App preview videos

**Metadata:**

- App name: "BrushFlow - Digital Painting"
- Subtitle: "Professional Art Studio for iPhone"
- Keywords: painting, drawing, art, sketch, brush, digital art
- Description: Compelling feature description
- Privacy policy URL
- Support URL

### Analytics

**Events to Track:**

- App launches
- Artwork created
- Tool usage frequency
- Feature usage
- Premium conversion funnel
- Export format preferences
- Crash events

**Privacy:**

- Opt-in analytics
- No PII collected
- Aggregate data only
- GDPR compliant

## Future Enhancements

### Phase 2 Features

**iPad Optimization:**

- Larger canvas support
- Split-view for layers panel
- Keyboard shortcuts
- Apple Pencil Pro features (squeeze gesture)

**Advanced Features:**

- Animation frame export (GIF)
- Time-lapse recording
- Custom brush marketplace
- Brush import/export

### Phase 3 Features

**Cross-Platform:**

- Android version
- Shared codebase
- Platform-specific optimizations

**Cloud Features:**

- Optional cloud sync (premium)
- Cross-device artwork access
- Backup and restore

### Phase 4 Features

**Collaboration:**

- Shared canvases
- Real-time co-drawing
- Comments and annotations

**AI Features:**

- Smart fill
- Style transfer
- Background removal
- Auto-colorization

**Desktop:**

- macOS companion app
- Larger canvas support
- Professional workflow integration
