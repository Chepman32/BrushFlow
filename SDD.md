# Software Design Document: BrushFlow

## 1. Executive Summary

**Application Name:** BrushFlow

**Platform:** iOS (Primary), with React Native architecture allowing future Android expansion

**Core Purpose:** Professional-grade digital painting and illustration application optimized for mobile devices, offering intuitive gesture-based controls and a comprehensive suite of artistic tools.

**Monetization:** Free-to-download with premium features unlocked via In-App Purchases (IAP)

**Offline Capability:** Complete offline functionality with no internet dependency for core features

**Tech Stack:**
- React Native 0.73+
- React Native Reanimated 3.x
- React Native Skia
- React Native Gesture Handler
- AsyncStorage for local data persistence
- React Native IAP for monetization

---

## 2. Application Overview

### 2.1 Value Proposition

BrushFlow delivers a professional mobile painting experience that rivals desktop applications while embracing mobile-first interaction patterns. The application leverages gesture-based controls, physics-based animations, and a fluid interface to create an immersive creative environment that feels native to iOS devices.

### 2.2 Key Differentiators

- **Gesture-First Design:** Every major interaction can be performed through intuitive swipes, pinches, and multi-touch gestures
- **Physics-Based UI:** Interface elements respond with realistic momentum, bounce, and decay animations
- **Offline-Complete:** Zero dependency on network connectivity for any core functionality
- **Performance-Optimized:** Utilizes Skia rendering engine for 60fps canvas operations
- **Progressive Monetization:** Non-intrusive IAP system that enhances rather than gates functionality

---

## 3. Application Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│  (React Native Components + Reanimated) │
├─────────────────────────────────────────┤
│          Business Logic Layer           │
│    (Drawing Engine, Tool Controllers)   │
├─────────────────────────────────────────┤
│         Rendering Layer (Skia)          │
│   (Canvas, Brush Strokes, Filters)     │
├─────────────────────────────────────────┤
│          Data Persistence Layer         │
│    (AsyncStorage, File System, IAP)    │
└─────────────────────────────────────────┘
```

### 3.2 Module Structure

**Core Modules:**
- **Canvas Module:** Manages drawing surface, layer composition, and stroke rendering
- **Tool Module:** Handles brush engines, color pickers, and drawing tools
- **Gesture Module:** Processes multi-touch input and gesture recognition
- **Animation Module:** Controls UI animations and transitions
- **Storage Module:** Manages artwork persistence and app preferences
- **IAP Module:** Handles purchase flows and premium feature unlocking
- **Gallery Module:** Organizes and displays saved artworks

---

## 4. Detailed Screen Specifications

### 4.1 Animated Splash Screen

**Purpose:** Create an impressive first impression while app initializes

**Visual Design:**
- Full-screen immersive experience
- Dark gradient background (from #0A0E27 to #1A1F3A)
- Custom animated logo featuring a stylized brush stroke forming the "B" in BrushFlow

**Animation Sequence:**

**Phase 1: Logo Materialization (0-1.2s)**
- Logo starts as scattered particles (approximately 200 individual elements)
- Particles are small circular dots with subtle glow effect
- Each particle has physics properties: mass, velocity, attraction force
- Particles accelerate toward center point using spring physics
- Spring configuration: damping 15, stiffness 180, mass 1
- As particles converge, they morph into the brush stroke logo shape
- Color gradient flows through particles during convergence (from #667EEA to #764BA2)

**Phase 2: Logo Solidification (1.2-1.8s)**
- Particles coalesce into solid logo form
- Glow effect intensifies around logo edges
- Logo scales up from 0.8 to 1.0 with elastic ease
- Subtle rotation wobble (-3° to +3°) adds playfulness

**Phase 3: Text Reveal (1.8-2.4s)**
- "BrushFlow" text appears below logo
- Text animated using character-by-character stagger
- Each character slides up from 20px below with opacity fade
- Stagger delay of 40ms between characters
- Text uses custom font (SF Pro Display Bold on iOS)
- Text color: #FFFFFF with subtle shadow

**Phase 4: Transition Out (2.4-2.8s)**
- Entire splash screen scales up to 1.1x
- Opacity fades from 1 to 0
- Simultaneous cross-fade to main gallery screen

**Technical Implementation:**
```javascript
// Using React Native Reanimated + Skia
- Particle system managed via shared values array
- Each particle position calculated via useAnimatedStyle
- Skia Canvas for particle rendering (better performance)
- Logo shape defined as SVG path, particles follow bezier curves
- Spring animations use Reanimated's withSpring()
- GPU-accelerated transforms for smooth 60fps rendering
```

**Loading States:**
- If app initialization takes longer than animation duration, show subtle pulse on logo
- Pulse animation: scale oscillates between 1.0 and 1.05 with 800ms cycle
- Never show static loading screen—animation loops seamlessly if needed

---

### 4.2 Gallery Screen (Home/Landing)

**Purpose:** Central hub for accessing saved artworks and creating new projects

**Layout Structure:**

**Top Navigation Bar (88px height including safe area):**
- Semi-transparent background with blur effect (UIBlurEffectStyleSystemChromeMaterialDark)
- Left side: Hamburger menu icon (vector icon: Feather "menu")
- Center: "BrushFlow" wordmark in SF Pro Display Medium, 18pt
- Right side: Search icon (Feather "search")
- Bottom border: 1px line with gradient (rgba(255,255,255,0.1))

**Masonry Grid Layout:**
- Artwork thumbnails displayed in staggered masonry grid (2 columns)
- Column width: (screen width - 48px) / 2
- Horizontal padding: 16px per side
- Vertical spacing between items: 12px
- Horizontal spacing between columns: 16px

**Artwork Card Design:**
- Rounded corners: 16px radius
- Shadow: 0px 4px 12px rgba(0,0,0,0.15)
- Thumbnail image fills card with aspect ratio preserved
- Hover/press state: scale down to 0.98 with spring animation
- Overlay on press: semi-transparent gradient from bottom (rgba(0,0,0,0) to rgba(0,0,0,0.6))

**Artwork Metadata Overlay (visible on long-press):**
- Slides up from bottom of card
- Shows: artwork title, creation date, canvas size, layer count
- Typography: SF Pro Text Regular, 12pt for metadata
- Background: rgba(0,0,0,0.85) with 20px padding
- Animation: translateY from 100% to 0% over 200ms

**Floating Action Button (FAB):**
- Position: bottom-right corner, 16px from edges (accounting for safe area)
- Size: 64px diameter circle
- Background: gradient from #667EEA to #764BA2
- Icon: Plus sign (Feather "plus"), white, 28px
- Shadow: 0px 8px 24px rgba(102,126,234,0.4)
- Ripple effect on press: expands from touch point
- Press animation: scales to 0.92, then bounces back to 1.05, settles at 1.0

**Gesture Interactions:**

**Vertical Scroll:**
- Standard iOS scrolling behavior with momentum
- Over-scroll bounce enabled with rubber-band effect
- Pull-to-refresh gesture reveals refresh indicator at -80px offset
- Refresh indicator: custom animated brush icon that rotates

**Swipe Right on Artwork Card:**
- Card slides right revealing action panel underneath
- Action panel width: 180px
- Action buttons appear staggered (each 40ms delay):
  - Share button (blue background, share icon)
  - Duplicate button (purple background, copy icon)
  - Delete button (red background, trash icon)
- Swipe threshold: 60px (triggers haptic feedback)
- Full swipe (>180px): auto-confirms first action (share)

**Swipe Left on Artwork Card:**
- Card slides left revealing favorite/archive actions
- Quick swipe adds to favorites with heart animation burst

**Long Press on Artwork Card:**
- Triggers after 400ms hold
- Card lifts up with scale 1.05 and shadow increase
- Contextual menu appears with blur backdrop
- Menu options: Open, Share, Duplicate, Rename, Delete, Details
- Haptic feedback: medium impact

**Pinch Gesture on Gallery:**
- Pinch out: transitions to expanded grid view (3 columns)
- Pinch in: transitions to list view with larger previews
- Animation: smooth interpolation of card positions and sizes
- Current view persists in user preferences

**Empty State (No Artworks):**
- Centered illustration: abstract brush stroke forming arrow pointing to FAB
- Illustration created with Skia paths and gradients
- Text: "Start Your Creative Journey"
- Subtext: "Tap the + button to create your first masterpiece"
- Subtle floating animation on illustration (2s cycle, Y-axis drift)

**Top Bar Interactions:**

**Search Icon Tap:**
- Expands search bar from right side with elastic ease
- Search bar slides in width from 0 to full width over 300ms
- Search icon morphs to close icon (X)
- Gallery dims with overlay (rgba(0,0,0,0.4))
- Search input auto-focuses with keyboard appearance
- Search results filter in real-time as user types
- Results highlight matching text in artwork names

**Menu Icon Tap:**
- Triggers slide-in menu from left (see Section 4.3)

---

### 4.3 Side Menu (Hamburger Menu)

**Purpose:** Access to settings, premium features, and app sections

**Presentation Style:**
- Slides in from left edge
- Menu width: 80% of screen width (max 320px)
- Background: gradient from #1A1F3A to #0A0E27
- Backdrop: dimmed gallery view with blur effect
- Slide animation: uses spring damping for natural deceleration

**Menu Structure:**

**Header Section (180px height):**
- User avatar placeholder (circular, 80px diameter)
- Background: subtle gradient (rgba(102,126,234,0.2))
- Username text: "Creative Artist" (default)
- Tap to customize name functionality
- Pro badge if premium unlocked (gold star icon, 24px)

**Menu Items List:**

1. **My Gallery** (with Feather "grid" icon)
   - Active state highlighted with accent gradient
   - Selected indicator: 4px colored bar on left edge

2. **Create New** (with Feather "plus-circle" icon)
   - Same functionality as FAB
   - Tap animation: icon rotates 90° clockwise

3. **Premium Features** (with Feather "star" icon)
   - Gold/yellow accent color
   - Shimmer animation on text (subtle)
   - Shows "Unlock" badge if not purchased

4. **Tutorials** (with Feather "book-open" icon)
   - Opens tutorial carousel view
   - Badge shows "3 New" if unread tutorials exist

5. **Settings** (with Feather "settings" icon)
   - Gear icon rotates on hover/press

6. **Export & Share** (with Feather "share-2" icon)
   - Bulk export functionality

7. **About** (with Feather "info" icon)
   - Version number displayed in gray
   - Build number in smaller text

**Menu Item Design:**
- Each item: 64px height
- Left padding: 24px
- Icon size: 24px
- Icon color: rgba(255,255,255,0.7)
- Text: SF Pro Text Regular, 16pt
- Text color: rgba(255,255,255,0.9)
- Horizontal separator: 1px line with rgba(255,255,255,0.05)

**Hover/Press States:**
- Background color change to rgba(255,255,255,0.08)
- Icon scales to 1.1x
- Haptic feedback on press
- Ripple effect emanates from touch point

**Gesture Interactions:**

**Swipe Right on Menu:**
- Closes menu (returns to gallery)
- Swipe threshold: 100px
- Animation mirrors opening animation in reverse

**Tap Outside Menu:**
- Closes menu with spring animation
- Backdrop fades out simultaneously

**Footer Section:**
- App version: "Version 1.0.0"
- Copyright text: "© 2025 BrushFlow"
- Social media icons: subtle and minimal
- Text color: rgba(255,255,255,0.4)
- Font size: 11pt

---

### 4.4 Canvas Screen (Main Drawing Interface)

**Purpose:** Primary workspace for digital painting and drawing

**Layout Philosophy:**
- Maximalist canvas space (90%+ of screen)
- Minimal persistent UI elements
- Auto-hiding toolbars activated by gestures
- Full immersion mode for distraction-free creation

**Canvas Area:**

**Background:**
- Default: white (#FFFFFF)
- Customizable: solid colors, gradients, or transparent checkerboard
- Checkerboard pattern (for transparency): 16px squares alternating #E0E0E0 and #F5F5F5
- Background rendered as Skia image for performance

**Canvas Behavior:**
- Infinite canvas conceptually, but viewport constrained to selected dimensions
- Support for common sizes: Square (1080x1080), Portrait (1080x1920), Landscape (1920x1080), Custom
- Canvas zoom range: 25% to 3200%
- Current zoom displayed temporarily (1s) on zoom gesture
- Grid overlay (toggleable): 50px squares with 1px lines at rgba(0,0,0,0.1)

**Layer System:**
- Multiple layers supported (free: 3 layers, premium: unlimited)
- Layers rendered composited via Skia
- Each layer maintains its own bitmap buffer
- Blend modes supported: Normal, Multiply, Screen, Overlay, etc.
- Layer opacity: 0-100% with real-time preview

**Drawing Engine:**
- Stroke rendering via Skia Path API
- Pressure sensitivity support (Apple Pencil integration)
- Stroke smoothing algorithm (Catmull-Rom spline)
- Real-time preview of stroke before commit
- Minimum input sampling rate: 120Hz on ProMotion displays
- Brush stroke anti-aliasing always enabled

**Persistent UI Elements:**

**Top Status Bar (translucent, auto-hides):**
- Height: 56px (plus safe area)
- Background: rgba(255,255,255,0.95) with blur effect
- Left side: Back arrow icon (Feather "arrow-left")
- Center: Artwork title (editable on tap)
- Right side: Undo icon, Redo icon, Menu icon (three dots)
- Auto-hide after 3s of inactivity
- Reappears on single tap at top 20% of screen

**Tool Panel (Bottom, Retractable):**
- Default state: minimized pill-shaped bar at bottom center
- Minimized size: 200px wide × 56px tall
- Minimized display: Currently selected tool icon, color preview circle, brush size indicator
- Background: dark gradient with blur (rgba(20,20,40,0.95))
- Rounded corners: 28px
- Shadow: 0px 4px 16px rgba(0,0,0,0.3)

**Expanded Tool Panel:**
- Expands upward to 320px height
- Expansion triggered by: upward swipe on minimized panel OR tap on panel
- Animation: spring ease with overshoot, 400ms duration
- Contains all drawing tools in horizontal scrollable row

**Gesture Interactions (Canvas-Specific):**

**Two-Finger Pinch Zoom:**
- Pinch in: zoom out (minimum 25%)
- Pinch out: zoom in (maximum 3200%)
- Zoom focal point: center of pinch gesture
- Smooth interpolation prevents jitter
- Zoom level badge appears during gesture (translucent overlay)
- Badge shows percentage: "150%" in SF Pro Display Semibold, 18pt

**Two-Finger Pan (while zoomed):**
- Translates canvas viewport
- Momentum scrolling with deceleration
- Rubber-band bounce at canvas edges
- Edge glow effect when hitting boundary

**Two-Finger Rotate:**
- Rotates canvas viewport for comfortable drawing angles
- Rotation snaps to 0°, 90°, 180°, 270° when within 5° threshold
- Haptic feedback on snap
- Rotation indicator appears (circular arc with angle degree)
- Indicator auto-hides after 1.5s

**Three-Finger Swipe Down:**
- Triggers undo operation
- Visual feedback: canvas briefly flashes white overlay
- Haptic feedback: light impact

**Three-Finger Swipe Up:**
- Triggers redo operation
- Same visual feedback as undo

**Three-Finger Tap:**
- Toggles full-screen mode (hides all UI)
- Status bar and tool panel slide out
- Canvas expands to full screen dimensions
- Single tap anywhere to restore UI

**Two-Finger Long Press:**
- Activates eyedropper tool (color picker from canvas)
- Magnified circle (100px diameter) appears under fingers
- Shows zoomed view of pixel area (8x magnification)
- Center crosshair indicates exact sampling point
- Release to select color
- Selected color fills active color slot with burst animation

**Single Finger Draw (default mode):**
- Standard drawing stroke with selected brush
- Stroke preview renders in real-time (lower opacity)
- On finger lift, stroke commits to current layer
- Pressure simulation based on touch radius (if no Apple Pencil)

**Palm Rejection:**
- Detects and ignores palm touches using touch size and position heuristics
- Apple Pencil touches prioritized over finger touches
- Configurable sensitivity in settings

---

### 4.5 Tool Panel (Expanded State)

**Layout Structure:**

**Tool Selector Row:**
- Horizontal scrollable row of tool buttons
- Each button: 64px × 64px
- Button spacing: 12px horizontal margin
- Snap scrolling to center active tool
- Scroll indicator dots below (subtle, 4px circles)

**Available Tools (Free Tier):**

1. **Brush Tool** (Feather "edit-3" icon)
   - Default selected tool
   - Icon color: white
   - Selected state: colored background gradient

2. **Pencil Tool** (Feather "pen-tool" icon)
   - Hard-edged drawing
   - No opacity fall-off

3. **Eraser Tool** (Feather "delete" icon)
   - Removes pixels from layer
   - Can erase with transparency

4. **Fill Tool** (custom bucket icon)
   - Flood-fill algorithm
   - Tolerance slider appears on selection

5. **Color Picker** (Feather "droplet" icon)
   - Activates eyedropper mode
   - Same as two-finger long press

6. **Selection Tool** (Feather "square" icon)
   - Lasso and rectangle selection modes
   - Cut, copy, transform selected area

**Premium Tools (IAP Locked):**

7. **Smudge Tool** (custom smudge icon with "PRO" badge)
8. **Blur Tool** (custom blur icon with "PRO" badge)
9. **Clone Stamp** (custom stamp icon with "PRO" badge)
10. **Symmetry Tool** (custom symmetry icon with "PRO" badge)

**Tool Button Design:**
- Circular shape
- Default background: rgba(255,255,255,0.1)
- Selected background: gradient from #667EEA to #764BA2
- Icon size: 28px
- Icon color: white (full opacity when selected, 0.6 when not)
- Press animation: scale to 0.9, spring back to 1.0
- Haptic feedback on press

**Locked Tool Indication:**
- Semi-transparent overlay with lock icon
- "PRO" badge in top-right corner (gold background)
- Tap on locked tool triggers premium upsell modal

**Brush Settings Section:**

Located below tool row, contains three main controls:

**Brush Size Slider:**
- Horizontal slider, full width of panel minus 32px padding
- Range: 1px to 200px
- Current value displayed above slider (e.g., "45px")
- Slider track: 6px height, rounded ends
- Track background: rgba(255,255,255,0.2)
- Track fill: gradient matching app accent colors
- Thumb: 32px circle, white with shadow
- Drag gesture updates size in real-time
- Preview brush cursor on canvas updates simultaneously

**Opacity Slider:**
- Same visual design as brush size slider
- Range: 0% to 100%
- Current value: "75%"
- Affects brush stroke transparency

**Brush Preview Circle:**
- Positioned center-left of sliders section
- Shows actual size preview of brush (scaled to fit if too large)
- Background: checkerboard for transparency indication
- Updates in real-time as size/opacity change
- Circle size: 80px × 80px container

**Color Selector:**

**Primary/Secondary Color Squares:**
- Two overlapping squares (32px each)
- Primary color (front square): currently active drawing color
- Secondary color (back square): secondary/background color
- Positioned at right side of tool panel
- Tap primary square: opens color picker modal
- Tap secondary square: swaps primary and secondary colors with flip animation
- Swap animation: 3D flip along horizontal axis, 300ms

**Quick Color Palette:**
- Row of 8 preset color circles below main color squares
- Each circle: 28px diameter
- Colors: curated palette (red, orange, yellow, green, blue, purple, white, black)
- Tap to instantly select color (no modal)
- Long press to customize palette slot

**Tool Panel Gestures:**

**Swipe Down on Panel:**
- Minimizes panel back to pill shape
- Animation mirrors expansion in reverse

**Drag Pill Bar (Minimized State):**
- Panel can be dragged left/right to reposition
- Snap to center, left, or right positions
- Position persists across sessions

---

### 4.6 Color Picker Modal

**Purpose:** Comprehensive color selection interface

**Presentation:**
- Modal slides up from bottom
- Occupies 70% of screen height
- Rounded top corners: 24px
- Background: dark gradient (rgba(20,20,40,0.98))
- Backdrop: dimmed canvas (rgba(0,0,0,0.5)) with blur

**Layout Sections:**

**Header (64px height):**
- Title: "Select Color" (SF Pro Display Semibold, 18pt)
- Close button: "X" icon top-right
- Drag handle: horizontal pill (36px wide, 5px tall) at top center
- Drag handle color: rgba(255,255,255,0.3)

**Color Wheel Section:**
- Circular HSV color wheel (280px diameter on standard iPhone)
- Wheel rendered with Skia using radial gradient + hue rotation
- Saturation: increases from center (white) to edge (full saturation)
- Hue: rotates around circumference (0° red → 360° red)
- Draggable selector: white circle (32px) with shadow and border
- Selector follows finger/pencil with smooth interpolation

**Brightness Slider:**
- Positioned below color wheel
- Full width minus 32px padding
- Visual: gradient from black to currently selected hue
- Slider design matches brush size slider

**Selected Color Preview:**
- Large circle (80px) positioned top-right of wheel
- Shows final selected color with current brightness
- Border: 2px white with shadow
- Background behind preview: checkerboard (for transparency)

**Hex Input Field:**
- Text input showing hex color code (e.g., "#FF5733")
- Positioned below brightness slider
- Width: 140px, centered
- Tap to edit manually with keyboard
- Auto-validates and updates wheel position

**RGB Sliders Section:**
- Three horizontal sliders for Red, Green, Blue channels
- Each slider labeled (R, G, B) on left side
- Value display on right (0-255)
- Slider tracks show gradient of that specific channel
- Adjusting RGB sliders updates wheel position

**Saved Colors Section:**
- Grid of saved/favorite colors (4×5 grid = 20 slots)
- Each slot: 44px × 44px rounded square
- Tap slot to apply color
- Long press to save current color to that slot
- Empty slots: dashed border with "+" icon
- Saved colors persist via AsyncStorage

**Presets Tab:**
- Swipeable tabs: "Recent" and "Presets"
- Recent: last 10 used colors in chronological order
- Presets: curated color palettes (Material Design, Pastel, Vibrant, etc.)
- Palette name displayed above grid
- Each palette contains 12-20 colors

**Gestures:**

**Swipe Down on Modal:**
- Dismisses modal with slide-out animation
- Spring deceleration

**Drag Header Handle:**
- Allows vertical dragging to resize or dismiss modal
- Drag down past threshold (100px): dismisses modal
- Rubber-band resistance applied

**Pinch on Color Wheel:**
- Pinch out: enlarges wheel for precision selection
- Pinch in: returns to default size
- Zoom range: 1.0x to 2.0x

---

### 4.7 Layers Panel

**Purpose:** Manage drawing layers, opacity, and blend modes

**Access Method:**
- Swipe left from right edge of canvas screen
- OR tap layers icon in top menu

**Presentation:**
- Slides in from right edge
- Panel width: 320px
- Full height of screen
- Background: dark translucent with blur (rgba(20,20,40,0.95))
- Canvas dims with backdrop overlay

**Panel Header:**
- Title: "Layers" (SF Pro Display Semibold, 18pt)
- Close button: "×" icon (tap or swipe right to dismiss)
- Add layer button: "+" icon (creates new layer)

**Layer List:**
- Vertically scrollable list of layer items
- Each layer item height: 88px
- Layers displayed in stack order (top = front-most)

**Layer Item Design:**

**Thumbnail Preview:**
- Left side of item
- Size: 64px × 64px
- Shows miniature preview of layer content
- Rendered at lower resolution for performance
- Checkerboard background for transparent areas
- Border: 1px rgba(255,255,255,0.2)

**Layer Info (Middle Section):**
- Layer name: "Layer 1", "Background", etc. (editable)
- Text: SF Pro Text Regular, 14pt
- Below name: layer stats (e.g., "RGB • 100%")
- Stats show: color mode, opacity percentage

**Action Buttons (Right Side):**
- Visibility toggle: eye icon (Feather "eye" / "eye-off")
  - Tap to show/hide layer
  - Animated icon transition
- Lock toggle: lock icon (Feather "lock" / "unlock")
  - Tap to lock/unlock layer editing
- More options: three dots icon
  - Opens context menu (Duplicate, Merge Down, Delete)

**Layer Item States:**

**Selected State:**
- Blue accent border (2px, #667EEA)
- Slightly elevated with shadow
- Background: rgba(102,126,234,0.15)

**Inactive State:**
- No border
- Background: rgba(255,255,255,0.05)

**Locked State:**
- Overlay: rgba(255,255,255,0.05)
- Lock icon prominently displayed
- Reduced opacity (0.6)

**Hidden State:**
- Reduced opacity (0.4)
- Preview thumbnail grayed out

**Blend Mode Dropdown:**
- Positioned below layer name (when layer selected)
- Shows current blend mode: "Normal"
- Tap to open blend mode picker modal
- Modes available: Normal, Multiply, Screen, Overlay, Soft Light, Hard Light, Color Dodge, Color Burn, Darken, Lighten, Difference, Exclusion

**Opacity Slider (Per Layer):**
- Appears when layer selected
- Horizontal slider below thumbnail
- Range: 0% to 100%
- Real-time preview on canvas as slider adjusts
- Current value displayed: "85%"

**Gestures (Layer-Specific):**

**Drag Layer Item Vertically:**
- Reorders layers in stack
- Item lifts up (scale 1.05) while dragging
- Other layers shift to make space
- Drop zone indicator: horizontal line between layers
- Haptic feedback on reorder
- Animation: smooth spring transition

**Swipe Right on Layer:**
- Quick action: deletes layer
- Confirmation prompt if layer has content
- Swipe distance threshold: 80px
- Red background revealed under swipe

**Swipe Left on Layer:**
- Quick action: duplicates layer
- Blue background revealed under swipe
- New layer appears above source with fade-in

**Long Press on Layer:**
- Enters multi-select mode
- Checkbox appears on each layer item
- Can select multiple layers for bulk operations
- Actions: merge, delete, group, lock/unlock

**Pinch on Layer List:**
- Pinch in: collapses all layers to compact view (32px height each)
- Pinch out: expands to full view with previews

**Add Layer Button Interaction:**
- Tap: creates new blank layer above current layer
- New layer animates in (slides from right + fades in)
- Automatically selects new layer
- Haptic feedback

**Layer Options Context Menu:**
- Triggered by three-dots icon tap
- Menu slides up from bottom as modal
- Options:
  - Duplicate Layer
  - Merge Down (disabled if bottom layer)
  - Clear Layer
  - Rename Layer
  - Layer Properties (shows size, memory usage)
  - Delete Layer

**Free vs Premium:**
- Free tier: maximum 3 layers
- Premium: unlimited layers
- Attempting to add 4th layer (free tier): triggers premium upsell modal

---

### 4.8 Premium Features Upsell Modal

**Purpose:** Encourage users to unlock premium features via IAP

**Trigger Scenarios:**
- Tapping locked premium tool
- Attempting to add 4th layer (free tier)
- Accessing advanced filters
- Trying to export in high-resolution

**Presentation:**
- Modal slides up from bottom
- Rounded top corners: 28px
- Background: dark gradient with subtle animated particles
- Particle animation: floating dots drifting upward (Skia particle system)
- Backdrop: heavy blur on canvas

**Modal Layout:**

**Header Section:**
- "Unlock Premium" title (SF Pro Display Bold, 24pt)
- Subtitle: "Take Your Art to the Next Level"
- Close button: "×" in top-right corner
- Premium badge icon: gold star with shimmer effect

**Feature List:**
- Scrollable vertical list of premium features
- Each feature item:
  - Checkmark icon (Feather "check-circle", gradient colored)
  - Feature name in bold
  - Short description below (1-2 lines)
  - Icon representing feature on right

**Premium Features:**
1. **Unlimited Layers**
   - Description: "Create complex artwork with unlimited layers"
   - Icon: layer stack illustration
   
2. **Advanced Brushes**
   - Description: "Access 50+ professional brush presets"
   - Icon: brush collection illustration
   
3. **Pro Tools**
   - Description: "Unlock Smudge, Blur, Clone, and Symmetry tools"
   - Icon: tool collection illustration
   
4. **High-Res Export**
   - Description: "Export up to 8K resolution (7680×4320)"
   - Icon: high-resolution icon
   
5. **Custom Brushes**
   - Description: "Create and import your own brushes"
   - Icon: custom brush icon
   
6. **Advanced Filters**
   - Description: "Apply professional filters and adjustments"
   - Icon: filter icon
   
7. **Cloud Sync** (future feature)
   - Description: "Sync artwork across devices"
   - Icon: cloud icon
   
8. **Priority Support**
   - Description: "Get help from our team within 24 hours"
   - Icon: support icon

**Pricing Section:**

Located below feature list, visually distinct:

**Pricing Card:**
- Rounded rectangle: 16px corners
- Background: gradient from #667EEA to #764BA2
- Padding: 24px
- Shadow: large, dramatic shadow

**Price Display:**
- Large text: "$9.99" (SF Pro Display Bold, 42pt)
- Subtext: "Lifetime Access" (14pt)
- Alternative: "Or $2.99/month" (crossed-out "introductory" offer style)

**Purchase Button:**
- Full width within pricing card
- Height: 56px
- Background: white
- Text: "Unlock Now" (SF Pro Display Semibold, 18pt, gradient text color)
- Press animation: scale to 0.96, haptic feedback
- Loading state: spinner replaces text during IAP process

**Restore Purchases Link:**
- Below purchase button
- Text: "Restore Purchases" (small, 13pt)
- Color: rgba(255,255,255,0.7)
- Tap functionality: calls IAP restore method

**Terms & Privacy:**
- Bottom of modal
- Small links: "Terms of Service" and "Privacy Policy"
- Opens in-app browser

**Gestures:**

**Swipe Down on Modal:**
- Dismisses modal (returns to canvas)

**Scroll Feature List:**
- Standard vertical scroll
- Momentum and rubber-band bounce

**Animation Details:**

**Shimmer Effect (Premium Badge):**
- Diagonal shimmer passes across badge every 3s
- Shimmer: linear gradient sweep from transparent to white
- Animation creates "sparkle" effect

**Particle Background:**
- Approximately 30 particles
- Each particle: 2-4px diameter circles
- Random spawn positions along bottom edge
- Float upward with slight horizontal drift
- Fade out as they reach top
- Continuous spawn cycle
- Color: subtle gradient matching theme

**Feature Item Entrance Animation:**
- Staggered appearance when modal opens
- Each item slides in from right with 60ms stagger delay
- Fade in simultaneously with slide
- Total animation duration: 800ms for all items

---

### 4.9 Canvas Export/Share Modal

**Purpose:** Export artwork in various formats and share to other apps

**Access Method:**
- Tap menu icon (three dots) in top bar → "Export"
- OR swipe up from bottom with three fingers while in canvas

**Presentation:**
- Modal sheet slides up from bottom
- Height: 60% of screen
- Rounded top corners: 28px
- Background: light gradient (for better format preview)

**Modal Header:**
- Title: "Export Artwork" (SF Pro Display Semibold, 20pt)
- Close button: "Done" text button (top-right)

**Export Format Section:**

**Format Selector (Segmented Control Style):**
- Horizontal row of format options
- Options: PNG, JPEG, PSD (Premium), TIFF (Premium), SVG (Premium)
- Each option: pill-shaped button
- Selected state: filled with accent gradient
- Unselected state: outline style

**Format-Specific Settings:**

**For PNG:**
- Transparency toggle: switch control
- Label: "Preserve Transparency"

**For JPEG:**
- Quality slider: range 0-100%
- Label shows current quality: "Quality: 85%"
- Preview file size updates in real-time: "~2.4 MB"

**For PSD (Premium):**
- Checkbox: "Include all layers"
- Checkbox: "Preserve blend modes"
- File size estimate displayed

**Resolution Section:**

**Resolution Dropdown:**
- Current selection button (e.g., "1080×1080")
- Tap to expand resolution options
- Options:
  - Original Size
  - 1080×1080 (Instagram)
  - 1080×1920 (Story)
  - 2048×2048 (High Quality)
  - 4096×4096 (Print Quality - Premium)
  - 7680×4320 (8K - Premium)
  - Custom Dimensions

**Custom Dimensions Modal:**
- Opens when "Custom Dimensions" selected
- Width and height number inputs
- Unit selector: px, in, cm
- DPI input field (default 300)
- Aspect ratio lock toggle
- Real-time file size calculation

**Preview Section:**

**Preview Thumbnail:**
- 200×200px thumbnail showing export result
- Checkerboard background if transparency enabled
- Border: 1px solid rgba(0,0,0,0.1)
- Updates in real-time as settings change

**File Information:**
- Filename: editable text input (default: "Artwork_YYYYMMDD")
- File size: "2.4 MB" (dynamically calculated)
- Dimensions: "1080×1080 px"

**Action Buttons:**

**Primary Actions (Bottom of Modal):**

**Share Button:**
- Full width (minus 32px padding)
- Height: 56px
- Background: gradient from #667EEA to #764BA2
- Text: "Share" with share icon
- Tap triggers iOS native share sheet
- Share sheet includes: Save to Photos, Messages, Mail, Instagram, etc.

**Save Button:**
- Same size and position as share button (if multiple buttons, arranged horizontally)
- Background: secondary color (gray)
- Text: "Save to Gallery"
- Saves exported file to app's internal gallery
- Success feedback: checkmark animation + haptic

**Export Process:**

**Progress Indicator:**
- Appears when export processing begins
- Circular progress ring (64px diameter)
- Shows percentage: "Processing... 45%"
- Gradient stroke on ring matches app accent
- Completion: ring fills completely, checkmark animates in

**Export Stages:**
1. Flattening layers (if applicable)
2. Applying format-specific compression
3. Encoding to selected format
4. Writing to file system

**Success State:**
- Modal content cross-fades to success message
- Large checkmark icon animates in (scale bounce)
- Message: "Exported Successfully!"
- Thumbnail of exported artwork
- "View in Gallery" button
- Auto-dismisses after 2.5s

**Gestures:**

**Swipe Down on Modal:**
- Dismisses export modal
- Returns to canvas

**Tap Outside Modal (on backdrop):**
- Dismisses modal

---

### 4.10 Tutorial/Onboarding Carousel

**Purpose:** Guide new users through app features and gestures

**Trigger:**
- First launch after installation
- Accessible from side menu anytime

**Presentation:**
- Full-screen carousel
- Dark background gradient
- Swipe-based navigation

**Carousel Slide Structure (5 Slides Total):**

**Slide 1: Welcome**
- Large animated illustration of BrushFlow logo
- Logo animates with particle formation effect (similar to splash)
- Heading: "Welcome to BrushFlow"
- Subheading: "Your mobile canvas for unlimited creativity"
- Visual shows sample artwork examples (masonry grid)

**Slide 2: Gesture Basics**
- Interactive demonstration area
- Shows hand gesture animations
- Heading: "Master the Gestures"
- Demonstrates:
  - Single finger: Draw
  - Two fingers: Pan and zoom
  - Three fingers down: Undo
  - Three fingers up: Redo
- Each gesture animates on screen with glowing finger touch points

**Slide 3: Tools & Brushes**
- Animated tool panel showcase
- Tools animate in one by one with stagger effect
- Heading: "Powerful Tools at Your Fingertips"
- Showcases: brush, pencil, eraser, fill, color picker
- Mini demo: brush stroke being drawn with different sizes

**Slide 4: Layers**
- Animated layer panel demonstration
- Shows layers stacking with transparency
- Heading: "Work with Multiple Layers"
- Visual: three layers combining to create final artwork
- Layers slide into position from sides

**Slide 5: Get Started**
- Call-to-action screen
- Heading: "Ready to Create?"
- Large "Start Drawing" button (gradient background)
- "Or watch video tutorials" link below
- Background: subtle animated brush strokes forming abstract pattern

**Navigation Elements:**

**Progress Indicators:**
- Bottom center of screen
- Five dots representing slides
- Current slide: larger, filled dot with gradient
- Inactive slides: smaller, outline dots
- Dots animate on slide change

**Skip Button:**
- Top-right corner
- Text: "Skip" (SF Pro Text Regular, 16pt)
- Color: rgba(255,255,255,0.7)
- Tap skips to last slide

**Next Button:**
- Bottom-right corner (floats above content)
- Text: "Next" with arrow icon
- Changes to "Get Started" on final slide
- Pulse animation every 3s if user inactive

**Gestures:**

**Swipe Left:**
- Advances to next slide
- Slide transition: horizontal slide with easing

**Swipe Right:**
- Returns to previous slide
- Not available on first slide

**Tap Progress Dot:**
- Jumps directly to that slide
- Transition: fade through black

**Animation Details:**

**Slide Transitions:**
- Duration: 400ms
- Easing: ease-in-out cubic bezier
- Current slide fades out slightly while sliding
- Next slide fades in while sliding in from right

**Interactive Elements:**
- Gesture demonstration uses Skia Canvas
- Finger touch points: glowing circles (32px diameter)
- Touch trails: fading path following finger movement
- Physics-based animations (springs) for responsive feel

**Auto-Advance (Optional):**
- Each slide auto-advances after 8s if no interaction
- Countdown subtle progress ring around next button
- User swipe cancels auto-advance

---

### 4.11 Settings Screen

**Purpose:** Configure app preferences and account settings

**Access Method:**
- Side menu → Settings

**Presentation:**
- Full-screen push transition from left
- White/light background (contrast to dark canvas)
- Standard iOS-style settings layout

**Header:**
- Title: "Settings" (large title, SF Pro Display Bold, 34pt)
- Back button: "< Menu" (top-left)

**Settings Sections (Grouped List Style):**

**Section 1: Canvas Settings**

Header: "CANVAS" (small caps, gray)

1. **Default Canvas Size**
   - Right detail: "1080×1080"
   - Tap opens size picker modal
   - Options: Square, Portrait, Landscape, Custom

2. **Canvas Background**
   - Right detail: color circle preview
   - Tap opens color picker
   - Default: white

3. **Grid Overlay**
   - Toggle switch on right
   - When enabled, shows grid on new canvases

4. **Stabilization**
   - Slider (0-100%)
   - Label: "Stroke Smoothing"
   - Higher values = more smoothing for cleaner lines

**Section 2: Drawing Settings**

Header: "DRAWING"

1. **Pressure Sensitivity**
   - Toggle switch
   - Only visible if Apple Pencil detected

2. **Palm Rejection**
   - Dropdown: Off / Low / Medium / High
   - Affects touch rejection sensitivity

3. **Auto-Save Interval**
   - Right detail: "30 seconds"
   - Tap opens interval picker
   - Options: 15s, 30s, 1min, 5min, Never

4. **Undo History**
   - Right detail: "50 steps"
   - Tap opens picker
   - Options: 20, 50, 100, 200 (higher requires more memory)

**Section 3: Interface**

Header: "INTERFACE"

1. **Theme**
   - Right detail: "Auto"
   - Options: Light, Dark, Auto (follows system)
   - Note: Canvas always adapts to artwork colors

2. **Gesture Hints**
   - Toggle switch
   - Shows subtle hints for gesture shortcuts

3. **Haptic Feedback**
   - Toggle switch
   - Enables/disables haptic feedback throughout app

4. **Animation Speed**
   - Dropdown: Slow / Normal / Fast / Instant
   - Affects UI transition speeds

**Section 4: Storage**

Header: "STORAGE"

1. **Cache Size**
   - Right detail: "245 MB"
   - Tap opens cache management
   - "Clear Cache" button

2. **Auto-Delete Old Thumbnails**
   - Toggle switch
   - Removes thumbnails after 30 days

3. **Storage Location**
   - Right detail: "iPhone"
   - Future: could support iCloud

**Section 5: Export Defaults**

Header: "EXPORT"

1. **Default Format**
   - Right detail: "PNG"
   - Tap opens format picker

2. **Default Quality**
   - Right detail: "High (90%)"
   - For JPEG exports

3. **Include Metadata**
   - Toggle switch
   - Embeds creation date, app info in exports

**Section 6: Premium**

Header: "PREMIUM"

1. **Subscription Status**
   - Right detail: "Active" (if premium) or "Free"
   - If free: "Upgrade" button with arrow
   - If premium: shows expiration or "Lifetime"

2. **Manage Subscription**
   - Opens iOS subscription management
   - Only visible if subscribed

3. **Restore Purchases**
   - Tap to restore from another device

**Section 7: About**

Header: "ABOUT"

1. **Version**
   - Right detail: "1.0.0 (Build 42)"
   - Tap 7 times rapidly: unlocks debug menu (Easter egg)

2. **Terms of Service**
   - Opens in-app browser

3. **Privacy Policy**
   - Opens in-app browser

4. **Rate BrushFlow**
   - Opens App Store review prompt

5. **Send Feedback**
   - Opens email composer with pre-filled template

6. **Follow Us**
   - Links to social media

**Debug Menu (Hidden, Easter Egg):**
- Unlocked by tapping version 7 times
- Shows performance metrics
- FPS counter toggle
- Memory usage
- Stroke rendering stats
- Export debug logs

**Visual Design:**

**List Items:**
- Height: 56px
- White background
- Separator lines: 1px, rgba(0,0,0,0.1)
- Left padding: 16px
- Right padding: 16px

**Item Press State:**
- Background color: rgba(0,0,0,0.05)
- Brief flash, returns to white

**Toggle Switches:**
- iOS native UISwitch component
- Accent color: #667EEA (matches app theme)

**Section Headers:**
- Height: 32px
- Background: rgba(0,0,0,0.02)
- Text: small caps, gray (#8E8E93)
- Padding: 16px left

---

## 5. Interaction Components & Micro-Interactions

### 5.1 Brush Cursor

**Purpose:** Visual feedback showing brush size, position, and preview

**Appearance:**
- Circular outline following finger/pencil position
- Circle diameter: matches current brush size (scaled to fit screen if too large)
- Circle stroke: 2px, dashed line
- Stroke color: contrasts with canvas background (inverted color)
- Center crosshair: small + symbol (8px)

**Behavior:**
- Follows touch input with 0 latency (directly coupled to gesture handler)
- Appears on touch down
- Fades out 200ms after touch up
- When brush size > 200px: shows scaled outline with size indicator label

**Pressure Visualization (Apple Pencil):**
- Inner fill circle opacity represents pressure
- 0% pressure: fully transparent inner circle
- 100% pressure: 30% opacity fill
- Smooth interpolation between pressure values

**Preview Mode:**
- When hovering (Apple Pencil hover capability on supported devices)
- Cursor shows at 50% opacity
- Allows user to see size before touching canvas

---

### 5.2 Color Burst Animation

**Purpose:** Visual feedback when selecting a color

**Trigger:**
- Color selected from palette
- Eyedropper color picked
- Swatch tapped

**Animation Sequence:**
1. Color circle scales from 0.5 to 1.2 with elastic ease
2. Particle burst: 12 small colored dots explode outward
3. Particles: 4px diameter, same color as selected
4. Particles travel 40px distance over 300ms
5. Particles fade out as they travel
6. Main color circle settles to 1.0 scale
7. Haptic feedback: light impact at burst moment

**Implementation:**
- Reanimated shared values for particle positions
- Skia Canvas for particle rendering (performance)
- Individual particles follow physics-based trajectories

---

### 5.3 Tool Selection Ripple

**Purpose:** Satisfying feedback when selecting a tool

**Trigger:**
- Tap on tool button in tool panel

**Animation:**
1. Ripple emanates from touch point
2. Ripple expands from 0 to fill button circle
3. Ripple color: white at 20% opacity
4. Expansion duration: 400ms
5. Ripple fades out during expansion
6. Simultaneously, button scales to 0.9 then bounces to 1.0
7. Selected state gradient fades in
8. Haptic feedback: medium impact

---

### 5.4 Stroke Commit Flash

**Purpose:** Visual confirmation that stroke has been saved to layer

**Trigger:**
- Touch up event after drawing stroke

**Animation:**
- Brief white flash overlay on stroke path
- Flash opacity: 0.4 peak
- Flash duration: 100ms
- Flash follows stroke geometry (not rectangular)
- Fade out with ease-out curve

---

### 5.5 Undo/Redo Wave Effect

**Purpose:** Directional visual feedback for undo/redo operations

**Trigger:**
- Three-finger swipe down (undo)
- Three-finger swipe up (redo)

**Animation:**

**Undo (Swipe Down):**
- Wave effect moves down across canvas
- Wave: semi-transparent gradient bar (white to transparent)
- Bar height: 40px
- Bar moves from top to bottom over 300ms
- Canvas content briefly shifts down 4px then bounces back

**Redo (Swipe Up):**
- Same as undo but wave moves upward
- Canvas content shifts up

**Alternative Visualization:**
- Canvas briefly rotates -2° (undo) or +2° (redo)
- Returns to 0° with spring animation
- Creates "time reversal" effect

---

### 5.6 Layer Reorder Ghost

**Purpose:** Clear visual feedback during layer drag-and-drop reordering

**Trigger:**
- Dragging layer item in layers panel

**Appearance:**
- Dragged layer item lifts up (scale 1.05)
- Shadow increases dramatically (0px 12px 32px rgba(0,0,0,0.5))
- Item follows finger position with slight lag (smooth spring)
- Other layers shift vertically to create space
- Drop zone indicator: 3px horizontal line, gradient colored
- Drop zone appears between layers where item will land

**Animation Details:**
- Lift animation: 200ms with ease-out
- Layer shifting: 300ms with spring animation
- Drop zone fade-in: 100ms
- Haptic feedback on layer order change

---

### 5.7 Brush Size Slider Live Preview

**Purpose:** Real-time visual feedback of brush size while adjusting slider

**Behavior:**
- As slider thumb is dragged, brush cursor on canvas updates live
- Cursor appears at canvas center (if not currently drawing)
- Cursor pulses gently (scale 1.0 to 1.1) every 1s while slider active
- Size value displays above slider thumb in floating bubble
- Bubble: rounded rectangle, 48px wide × 32px tall
- Bubble follows thumb with 20px vertical offset
- Bubble background: rgba(0,0,0,0.9)
- Bubble text: white, SF Pro Display Semibold, 16pt

---

### 5.8 Loading Skeleton Screens

**Purpose:** Reduce perceived loading time with skeleton placeholders

**Gallery Loading State:**
- Masonry grid of skeleton cards
- Each card: rounded rectangle with animated shimmer
- Shimmer: diagonal gradient sweep from left to right
- Shimmer duration: 1.5s, infinite loop
- Skeleton cards same size as actual artwork cards
- Gradual replacement as actual thumbnails load

**Canvas Loading State:**
- Blank canvas with tool panel skeleton
- Tool buttons show circular skeletons
- Shimmer effect on all placeholder elements

---

### 5.9 Pull-to-Refresh Animation

**Purpose:** Engaging refresh interaction for gallery

**Trigger:**
- Pull down gallery view beyond top edge

**Animation Sequence:**
1. As user pulls: brush icon appears and rotates
2. Pull distance 0-80px: brush rotates 0° to 360°
3. Pull distance >80px: brush fully visible, ready state
4. Release triggers refresh
5. Brush animates: continuous rotation + scale pulse
6. On completion: checkmark morphs from brush with scale bounce
7. List content refreshes with stagger animation

---

### 5.10 Premium Feature Shimmer

**Purpose:** Draw attention to premium features without being intrusive

**Appearance:**
- Subtle shimmer passes across "PRO" badge
- Shimmer: diagonal linear gradient (transparent → white → transparent)
- Gradient width: 30px
- Travel distance: badge width + 30px
- Travel duration: 2s
- Repeat interval: 5s (not continuous, gives breathing room)

**Badge Design:**
- Gold gradient background (#FFD700 to #FFA500)
- Text: "PRO" in white, SF Pro Display Bold, 10pt
- Border radius: 4px
- Size: 32px × 16px
- Positioned top-right of locked tool/feature

---

### 5.11 Haptic Feedback Patterns

**Purpose:** Enhance tactile interaction feedback

**Haptic Types Used:**

**Light Impact:**
- Tool selection
- Color selection
- Toggle switches

**Medium Impact:**
- Button presses
- Layer reorder
- Undo/redo confirmation

**Heavy Impact:**
- Stroke commit
- File save
- Purchase completion

**Selection Changed:**
- Slider value snapping
- Rotation angle snapping
- Scrolling through discrete items

**Success Notification:**
- Export complete
- Auto-save complete

**Warning Notification:**
- Attempting locked feature
- Low storage warning

**Error Notification:**
- Export failed
- Purchase failed

---

## 6. Gesture System Specification

### 6.1 Gesture Recognition Priority

**Priority Order (Highest to Lowest):**
1. Apple Pencil input (always highest priority)
2. Three-finger gestures (global shortcuts)
3. Two-finger gestures (canvas manipulation)
4. Tool-specific gestures
5. Single-finger drawing

**Conflict Resolution:**
- Pencil input cancels all other gestures
- Three-finger gestures cancel two-finger gestures
- Tool gestures are context-dependent

---

### 6.2 Canvas Gestures Detailed Specifications

**Two-Finger Pinch Zoom:**
- **Recognition threshold:** 10px minimum distance change between fingers
- **Velocity tracking:** calculates pinch speed for momentum
- **Scale calculation:** uses focal point of pinch as anchor
- **Limits:** min scale 0.25x, max scale 32x
- **Snap points:** 1.0x scale snaps with 0.05x tolerance
- **Animation:** spring interpolation (damping 20, stiffness 300)
- **Performance:** Skia transform applied to entire canvas layer

**Two-Finger Pan:**
- **Activation:** both fingers must move >15px in same direction
- **Recognition delay:** 50ms (prevents false positives)
- **Velocity:** tracked for momentum scrolling
- **Momentum decay:** exponential with 0.95 decay factor per frame
- **Bounds:** rubber-band effect at canvas edges
- **Rubber-band resistance:** increases exponentially with distance beyond bounds

**Two-Finger Rotate:**
- **Activation:** angular change >5° between fingers
- **Snap angles:** 0°, 90°, 180°, 270° with ±5° tolerance
- **Snap animation:** 150ms with ease-out
- **Free rotation:** smooth continuous rotation outside snap zones
- **Rotation indicator:** circular arc UI appears showing angle
- **Indicator timeout:** 1.5s after gesture ends

**Three-Finger Swipe Down (Undo):**
- **Recognition:** three touches moving down >60px within 200ms
- **Minimum velocity:** 0.5 pixels/ms
- **Direction tolerance:** ±30° from pure vertical
- **Activation:** triggers undo operation
- **Visual feedback:** canvas flash + wave effect
- **Haptic:** medium impact

**Three-Finger Swipe Up (Redo):**
- Same specifications as undo, but upward direction

**Three-Finger Tap (Full-Screen Toggle):**
- **Recognition:** three simultaneous touches <100ms duration
- **Position tolerance:** touches within 80px of each other
- **Movement threshold:** <10px movement for all touches
- **Action:** toggles UI visibility
- **Animation:** 300ms fade + slide for UI elements

**Two-Finger Long Press (Eyedropper):**
- **Recognition:** two touches held for >300ms
- **Movement threshold:** <15px movement during hold
- **Activation:** shows magnified color picker loupe
- **Loupe size:** 100px diameter circle
- **Magnification:** 8x zoom of canvas area
- **Center crosshair:** shows exact sampling pixel
- **Release:** selects color with burst animation

---

### 6.3 Tool Panel Gestures

**Swipe Up to Expand:**
- **Recognition threshold:** 30px upward movement
- **Velocity bonus:** faster swipe expands further
- **Animation:** spring ease with overshoot
- **Duration:** 400ms
- **Overshoot:** expands 10px beyond final position, settles back

**Swipe Down to Minimize:**
- **Recognition threshold:** 40px downward movement
- **Velocity factor:** high velocity triggers immediate minimize
- **Animation:** reverse of expansion

**Horizontal Drag (Minimized State):**
- **Activation:** horizontal movement >10px
- **Drag bounds:** can move across full screen width
- **Snap points:** left edge, center, right edge
- **Snap threshold:** 60px from snap point triggers snap
- **Snap animation:** 250ms spring
- **Haptic:** light impact on snap

**Tool Button Press:**
- **Press detection:** touch down on button
- **Hold time:** <50ms is tap, >400ms is long press
- **Tap action:** selects tool
- **Long press action:** shows tool options menu (if available)
- **Animation:** scale to 0.9, spring back to 1.0
- **Haptic:** light impact on tap

---

### 6.4 Gallery Gestures

**Pull-to-Refresh:**
- **Activation:** scroll beyond top edge while at scroll position 0
- **Pull threshold:** 80px
- **Ready state:** reached at threshold, shows visual indicator
- **Release:** triggers refresh if beyond threshold
- **Animation:** brush icon rotation during pull
- **Refresh duration:** minimum 800ms (prevents flash completion)

**Artwork Card Swipe Right:**
- **Recognition threshold:** 60px horizontal movement
- **Velocity requirement:** >0.3 pixels/ms
- **Action panel reveal:** slides card right, shows actions underneath
- **Panel width:** 180px
- **Snap points:** 0px (closed), 180px (open)
- **Full swipe threshold:** >240px triggers auto-action
- **Auto-action:** shares artwork (first action in panel)

**Artwork Card Swipe Left:**
- **Recognition threshold:** 60px horizontal movement
- **Action:** quick-favorite (toggle)
- **Animation:** heart icon burst
- **Haptic:** light impact

**Artwork Card Long Press:**
- **Recognition time:** 400ms hold
- **Movement tolerance:** <10px during hold
- **Activation:** shows context menu
- **Card animation:** lifts with scale 1.05 + shadow increase
- **Menu animation:** fades in with scale 0.95 to 1.0

**Pinch on Gallery:**
- **Pinch in (threshold: 0.8x):** transitions to list view
- **Pinch out (threshold: 1.2x):** transitions to expanded grid (3 columns)
- **Animation:** card positions and sizes interpolate smoothly
- **Duration:** 500ms with custom bezier curve

---

### 6.5 Layer Panel Gestures

**Vertical Drag to Reorder:**
- **Activation:** touch hold >200ms, then move >10px vertically
- **Lift animation:** scale 1.05, shadow increase
- **Drop zones:** horizontal lines between layers
- **Drop indicator:** 3px colored line
- **Auto-scroll:** when dragging near top/bottom edges
- **Scroll speed:** proportional to distance from edge

**Swipe Right to Delete:**
- **Recognition threshold:** 80px horizontal movement
- **Background color:** red (warning)
- **Full swipe:** >200px triggers delete (with confirmation if content exists)
- **Cancel:** swipe back left <40px cancels action

**Swipe Left to Duplicate:**
- **Recognition threshold:** 80px horizontal movement
- **Background color:** blue
- **Full swipe:** >200px triggers immediate duplication
- **Animation:** new layer fades in above source

**Long Press for Multi-Select:**
- **Recognition time:** 600ms hold
- **Activation:** enters multi-select mode
- **Visual change:** checkboxes appear on all layers
- **Selection:** tap layers to toggle selection
- **Exit:** tap "Done" or "Cancel" button

---

### 6.6 Gesture Conflict Prevention

**Simultaneous Gesture Handling:**
- Pencil input cancels all finger gestures immediately
- Three-finger gestures detected within first 100ms, block other gestures
- Two-finger gestures detected within first 150ms, block drawing
- Tool-specific gestures checked before general canvas gestures

**False Positive Prevention:**
- Minimum movement thresholds prevent accidental triggers
- Timing requirements ensure intentional gestures
- Direction tolerance allows slight hand wobble
- Velocity requirements distinguish deliberate vs. incidental movement

**Palm Rejection Algorithm:**
- Touch size analysis (palm touches are larger)
- Touch position (palms typically at edge or bottom)
- Touch timing (palm usually touches before/after pencil)
- Touch count (multiple simultaneous touches from palm)
- Machine learning model (trains on user's specific palm patterns over time)

---

## 7. Technical Implementation Details

### 7.1 React Native Skia Integration

**Canvas Rendering Pipeline:**

```javascript
// Conceptual architecture (not production code)

Canvas Component Structure:
├── Skia Canvas (Root)
│   ├── Background Layer (Skia Image)
│   ├── Layer Stack (Skia Picture for each layer)
│   │   ├── Layer 1 (Skia Picture with Paint)
│   │   ├── Layer 2 (Skia Picture with Paint)
│   │   └── Layer N (Skia Picture with Paint)
│   ├── Current Stroke Preview (Skia Path)
│   └── UI Overlay (Skia Group)
│       ├── Grid (if enabled)
│       ├── Brush Cursor
│       └── Selection Marquee
```

**Brush Stroke Implementation:**
- Each stroke stored as Skia Path object
- Path built from touch points using quadratic bezier curves
- Catmull-Rom spline smoothing applied for natural curves
- Pressure data (if available) modulates stroke width along path
- Paint object defines stroke properties: color, blend mode, opacity

**Performance Optimizations:**
- Layer bitmaps cached as Skia Images
- Dirty rectangle tracking for partial redraws
- Stroke preview rendered on separate layer (composited)
- GPU acceleration via Metal (iOS)
- Off-screen rendering for expensive operations

**Memory Management:**
- Maximum canvas resolution: 4096×4096 (free), 8192×8192 (premium)
- Layer bitmap memory calculated: width × height × 4 bytes (RGBA)
- Memory warning triggers layer consolidation prompt
- Thumbnail generation at lower resolution for gallery

---

### 7.2 React Native Reanimated Architecture

**Animation Structure:**

**Shared Values:**
- All animated properties stored as shared values
- Direct manipulation on UI thread (not JS thread)
- Minimal JS bridge crossing for smooth 60fps

**Key Animated Properties:**
- Tool panel translateY (expansion/minimization)
- Canvas scale, translateX, translateY (zoom/pan)
- Canvas rotation (gesture-based rotation)
- Artwork card translateX (swipe gestures)
- Layer item translateY (reordering)
- Modal opacity and translateY (presentation)

**Animation Worklets:**
- Custom worklets for complex animations
- Particle system calculations (splash screen)
- Spring physics for natural motion
- Interpolation curves for smooth transitions

**Gesture Handler Integration:**
- React Native Gesture Handler provides raw gesture data
- Reanimated worklets process gestures on UI thread
- Direct manipulation of shared values without JS involvement

**Example Configuration (Conceptual):**

```javascript
// Spring animation config for tool panel
const springConfig = {
  damping: 20,
  stiffness: 300,
  mass: 1,
  overshootClamping: false,
  restSpeedThreshold: 0.001,
  restDisplacementThreshold: 0.001
};

// Timing animation config for fades
const timingConfig = {
  duration: 300,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1)
};
```

---

### 7.3 Data Persistence Architecture

**Storage Strategy:**

**AsyncStorage (Preferences):**
- User settings and preferences
- Premium purchase status
- Tutorial completion flags
- Tool panel position preference
- Last used colors and brush settings

**File System (Artwork Data):**
- Each artwork stored as separate file
- File format: custom binary format for efficiency
- Contains: layer bitmaps, layer metadata, canvas properties
- File location: app's documents directory

**File Structure:**
```
Documents/
├── Artworks/
│   ├── artwork-uuid-1.bflow
│   ├── artwork-uuid-2.bflow
│   └── ...
├── Thumbnails/
│   ├── thumb-uuid-1.jpg
│   ├── thumb-uuid-2.jpg
│   └── ...
└── Exports/
    ├── export-1.png
    └── ...
```

**Artwork File Format (.bflow):**
- Header: version, canvas dimensions, layer count
- Layer data blocks: sequential layer bitmaps + metadata
- Footer: checksum for integrity verification

**Auto-Save Implementation:**
- Background timer triggers save at specified interval
- Only saves if canvas modified since last save
- Diff-based saving (only changed layers)
- Atomic write operation (temp file → rename)
- UI shows subtle "Saving..." indicator during save

**Thumbnail Generation:**
- Created on artwork save
- Resolution: 512×512 (scaled maintaining aspect ratio)
- Format: JPEG, 80% quality
- Generated in background thread

---

### 7.4 In-App Purchase Implementation

**IAP Products:**

**Product ID:** `com.brushflow.premium.lifetime`
- **Type:** Non-consumable
- **Price:** $9.99 USD
- **Description:** "Lifetime Premium Access"

**Product ID:** `com.brushflow.premium.monthly`
- **Type:** Auto-renewable subscription
- **Price:** $2.99 USD/month
- **Description:** "Monthly Premium Subscription"

**Purchase Flow:**
1. User taps premium feature or "Unlock Premium" button
2. Premium modal presents with feature list
3. User taps "Unlock Now" button
4. React Native IAP initiates purchase request
5. iOS payment sheet appears (native)
6. User authenticates (Face ID/Touch ID/Password)
7. Purchase processes
8. Receipt validation (client-side, basic)
9. Premium features unlock immediately
10. Confirmation shown (success modal)

**Receipt Validation:**
- Basic client-side validation for instant unlock
- Receipt stored in AsyncStorage
- Server-side validation recommended for production (future enhancement)

**Restore Purchases:**
- User taps "Restore Purchases" in settings or premium modal
- React Native IAP queries App Store for previous purchases
- If valid purchase found, premium features unlock
- Confirmation shown

**Premium Feature Gating:**
- Premium features check purchase status before activation
- If not premium, show upsell modal instead of feature
- Purchase status checked on app launch and stored locally

**Family Sharing:**
- IAP products configured to support Family Sharing
- Purchase unlocks premium for all family members

---

### 7.5 Performance Optimization Strategies

**Canvas Rendering:**
- **Dirty Rectangle Optimization:** Only redraw changed regions
- **Layer Caching:** Pre-render static layers as Skia Images
- **Stroke Coalescing:** Combine multiple touch points into single path
- **Downsampling:** Render at lower resolution during gestures, upscale on release
- **GPU Overdraw Minimization:** Blend modes optimized for minimal overdraw

**Animation Performance:**
- **UI Thread Animations:** All animations run on UI thread via Reanimated
- **60 FPS Target:** Animations designed to hit 60fps on iPhone 11+
- **ProMotion Support:** 120fps on iPhone 13 Pro+ models
- **Lazy Loading:** Complex animations initialized only when needed
- **Animation Batching:** Multiple property changes batched per frame

**Gallery Performance:**
- **Virtualized List:** Only render visible artwork cards
- **Thumbnail Lazy Loading:** Load thumbnails as they enter viewport
- **Image Caching:** Thumbnails cached in memory and disk
- **Progressive JPEG:** Thumbnails load progressively for faster perceived load
- **Masonry Layout Caching:** Card positions pre-calculated and cached

**Memory Management:**
- **Bitmap Pooling:** Reuse bitmap objects where possible
- **Aggressive Thumbnail Cleanup:** Remove old thumbnails from memory
- **Layer Consolidation Prompt:** Suggest merging layers when memory pressure detected
- **Background Memory Cleanup:** Clear caches when app backgrounded

**Startup Performance:**
- **Splash Animation Preload:** Animation assets loaded during splash
- **Lazy Module Loading:** Feature modules loaded on-demand
- **AsyncStorage Batch Read:** All settings loaded in single operation
- **Thumbnail Index Caching:** Gallery thumbnail list cached for instant display

---

### 7.6 Offline Functionality Implementation

**Core Requirements:**
- **Zero Network Dependency:** App fully functional without internet
- **Local Storage:** All artwork and user data stored locally
- **No Cloud Features:** No sync, no online gallery (all local)

**Offline-First Architecture:**
- All operations execute on local data
- No API calls for core functionality
- Future: cloud sync as optional premium feature (requires network)

**Asset Management:**
- All UI assets bundled with app
- No CDN dependencies
- Vector icons from bundled icon library
- Tutorial images bundled

**Update Mechanism:**
- App updates via App Store only
- No over-the-air content updates
- No remote config required

---

## 8. Premium Features Deep Dive

### 8.1 Advanced Brush Engine (Premium)

**Custom Brush Creator:**
- Import brush shapes from images
- Adjust brush dynamics: size jitter, opacity jitter, scatter
- Texture overlay on brush strokes
- Dual brush blending
- Save custom brushes to library

**Professional Presets (50+ Brushes):**
- Watercolor brushes (wet-on-wet effects)
- Oil painting brushes (impasto texture)
- Charcoal and conte
- Airbrush variations
- Calligraphy pens
- Specialty: splatter, spray, smoke

**Brush Library UI:**
- Grid view of brush previews
- Each preview shows stroke sample
- Organized by category (tabs)
- Favorite/star brushes for quick access
- Search/filter functionality

---

### 8.2 Symmetry Tool (Premium)

**Symmetry Modes:**
- Horizontal symmetry (mirror left-right)
- Vertical symmetry (mirror top-bottom)
- Radial symmetry (2-32 segments)
- Mandala mode (combined radial + mirror)

**UI Control:**
- Symmetry axis displayed as dashed line
- Draggable to reposition axis
- Rotation handle for angled symmetry
- Toggle on/off with keyboard shortcut gesture

**Visual Feedback:**
- Ghost preview of mirrored strokes (lower opacity)
- Axis lines always visible when symmetry active
- Handle glow on manipulation

---

### 8.3 Advanced Filters (Premium)

**Filter Categories:**

**Adjustments:**
- Brightness/Contrast
- Hue/Saturation/Lightness
- Color Balance
- Levels (histogram control)
- Curves (RGB channel curves)
- Exposure and Gamma

**Effects:**
- Gaussian Blur (radius 0-100px)
- Motion Blur (angle and distance)
- Sharpen
- Noise (add grain)
- Pixelate
- Oil Painting effect

**Artistic:**
- Watercolor
- Sketch/Pencil
- Cartoon
- Posterize
- Edge Detection

**Filter Application UI:**
- Full-screen modal with live preview
- Split-view: before/after slider
- Real-time adjustment (via Skia shaders)
- "Apply" and "Cancel" buttons
- Filter history (can revert)

**Performance:**
- Filters implemented as Skia image filters
- GPU-accelerated where possible
- Progress indicator for expensive filters
- Preview at lower resolution, apply at full resolution

---

### 8.4 High-Resolution Export (Premium)

**Resolution Options:**
- Up to 8K (7680×4320) export
- Maintains quality for professional printing
- DPI selection (72, 150, 300, 600)

**Export Process:**
- Background processing (non-blocking)
- Progress indicator with percentage
- Estimated time remaining
- Cancel option during export

**Large File Handling:**
- Tiled rendering for memory efficiency
- Export in chunks, combine final image
- Temporary file cleanup after export

---

### 8.5 Clone Stamp Tool (Premium)

**Functionality:**
- Sample area of canvas, paint elsewhere
- Alt-touch to set clone source
- Visual indicator shows source point while cloning
- Adjustable brush size (clone brush inherits brush engine)
- Opacity control

**UI:**
- Clone source marked with target reticle
- Line connecting source to destination (while cloning)
- Offset preview (semi-transparent)

**Use Cases:**
- Remove imperfections
- Duplicate elements
- Texture replication

---

### 8.6 Smudge Tool (Premium)

**Behavior:**
- Blends pixels along stroke path
- Strength parameter (0-100%)
- Finger painting effect
- Respects layer boundaries

**Algorithm:**
- Samples pixels along stroke
- Applies weighted blur in stroke direction
- Strength affects blur kernel size

**UI Control:**
- Strength slider in tool panel
- Brush size determines smudge area
- Pressure affects strength (Apple Pencil)

---

## 9. Accessibility Considerations

### 9.1 VoiceOver Support

**Screen Reader Optimization:**
- All interactive elements labeled for VoiceOver
- Artwork thumbnails: descriptive labels ("Artwork created on [date]")
- Tool buttons: clear tool names and descriptions
- Sliders: announce current values
- Layer panel: announces layer names and order

**Gesture Accessibility:**
- VoiceOver gestures don't conflict with app gestures
- Alternative navigation paths for all features
- No gesture-only features (always alternative access method)

---

### 9.2 Dynamic Type Support

**Text Scaling:**
- All text respects iOS Dynamic Type settings
- UI layouts adjust to accommodate larger text
- Minimum touch targets: 44×44pt (per Apple guidelines)

**Layout Flexibility:**
- Flexible layouts accommodate text expansion
- Truncation only where necessary (with ellipsis)
- Important text never truncated

---

### 9.3 Color Accessibility

**Contrast Ratios:**
- Text contrast meets WCAG AA standards (4.5:1 minimum)
- UI elements distinguishable for color-blind users
- Important information not conveyed by color alone

**Color Blind Modes:**
- Settings option: "Color Blind Filter"
- Modes: Protanopia, Deuteranopia, Tritanopia
- Applies filter to UI (not canvas)

---

### 9.4 Motor Accessibility

**Gesture Alternatives:**
- All gestures have button alternatives
- Undo/redo accessible via menu buttons
- Zoom controls available as on-screen buttons
- Rotation snapping assists users with motor difficulties

**Adjustable Timing:**
- Settings option: "Gesture Speed"
- Increases gesture recognition time thresholds
- Slows animations for users who need more time

---

## 10. Quality Assurance & Testing Strategy

### 10.1 Unit Testing

**Test Coverage Areas:**
- Brush engine stroke calculations
- Color conversion utilities (RGB, HSV, Hex)
- Layer blending algorithms
- File save/load operations
- IAP purchase state management

**Testing Framework:**
- Jest for JavaScript unit tests
- React Native Testing Library for component tests

---

### 10.2 Integration Testing

**Test Scenarios:**
- Complete drawing workflow (create → draw → save → export)
- Layer manipulation (add, delete, reorder, blend)
- IAP flow (purchase, restore, feature unlock)
- Settings persistence across app restarts

---

### 10.3 Performance Testing

**Metrics:**
- Frame rate during drawing (target: 60fps)
- Canvas zoom/pan responsiveness
- Gallery scroll performance (target: 60fps)
- App launch time (target: <2s to interactive)
- Memory usage during typical session (target: <300MB)

**Testing Tools:**
- Xcode Instruments (Time Profiler, Core Animation)
- React Native performance monitor
- Manual testing on various devices

---

### 10.4 Device Testing Matrix

**Target Devices:**
- iPhone SE (3rd gen) - minimum spec device
- iPhone 13 - standard device
- iPhone 13 Pro - ProMotion testing
- iPhone 15 Pro Max - large screen + latest hardware
- iPad Pro 12.9" - tablet considerations (future)

**iOS Versions:**
- iOS 15.0 (minimum supported)
- iOS 16.x
- iOS 17.x (primary target)

---

### 10.5 User Acceptance Testing

**Beta Testing:**
- TestFlight distribution to 50-100 beta testers
- Feedback collection via in-app form
- Crash reporting enabled
- Analytics tracking (privacy-compliant)

**Testing Focus Areas:**
- Gesture intuitiveness
- Tool discoverability
- Premium conversion flow
- Export quality verification

---

## 11. Launch & Distribution

### 11.1 App Store Optimization (ASO)

**App Name:** BrushFlow - Digital Painting

**Subtitle:** Professional Art Studio for iPhone

**Keywords:**
- painting, drawing, art, sketch, brush, digital art, illustration, creative, artist, design

**Description (First Paragraph):**
"Transform your iPhone into a professional art studio with BrushFlow. Create stunning digital paintings, illustrations, and sketches with an intuitive gesture-based interface designed specifically for mobile artists. Whether you're a professional illustrator or just starting your creative journey, BrushFlow provides all the tools you need."

**App Previews (Videos):**
1. Splash screen animation showcase
2. Gesture-based navigation demonstration
3. Drawing and tool showcase
4. Layer manipulation
5. Color selection and brush customization

**Screenshots (6.5" Display):**
1. Canvas with stunning artwork sample
2. Gallery view showing diverse artworks
3. Tool panel expanded with brush options
4. Layer panel with multiple layers
5. Color picker interface
6. Premium features showcase

---

### 11.2 Pricing Strategy

**Free Tier:**
- 3 layers
- Basic brush set (6 brushes)
- Standard tools (brush, pencil, eraser, fill, selection)
- Export up to 2048×2048 resolution
- PNG and JPEG export

**Premium (One-Time Purchase: $9.99):**
- Unlimited layers
- 50+ professional brushes
- Pro tools (smudge, blur, clone, symmetry)
- Advanced filters
- High-res export (up to 8K)
- Custom brush creator
- All future premium features

**Alternative: Monthly Subscription ($2.99/mo):**
- Same features as lifetime purchase
- For users who prefer subscription model
- Cancel anytime

---

### 11.3 Marketing Channels

**Pre-Launch:**
- Landing page with email signup
- Social media teasers (Instagram, Twitter, TikTok)
- Beta tester testimonials
- Press kit for tech/art blogs

**Launch Day:**
- Product Hunt submission
- Reddit posts (r/iOSProgramming, r/digitalpainting, r/iosapps)
- Email to beta testers and waitlist
- Social media announcement
- Press outreach

**Post-Launch:**
- User-generated content encouragement
- Featured artwork gallery on social media
- Tutorial video series (YouTube)
- Influencer partnerships (digital artists)

---

### 11.4 Analytics & Metrics

**Key Performance Indicators:**

**User Engagement:**
- Daily Active Users (DAU)
- Monthly Active Users (MAU)
- Session duration (target: 15+ minutes)
- Artworks created per user
- Feature usage statistics

**Monetization:**
- Free to Premium conversion rate (target: 3-5%)
- Average revenue per user (ARPU)
- Lifetime value (LTV)
- Purchase funnel drop-off points

**Technical Performance:**
- Crash rate (target: <0.5%)
- ANR (Application Not Responding) rate
- Average app launch time
- Average frame rate during drawing

**User Retention:**
- Day 1 retention (target: 40%)
- Day 7 retention (target: 20%)
- Day 30 retention (target: 10%)

**Analytics Tools:**
- Firebase Analytics (privacy-compliant)
- Custom event tracking for feature usage
- Crash reporting (Crashlytics)

---

## 12. Future Roadmap

### Phase 1 (Months 1-3 Post-Launch):
- Bug fixes and stability improvements
- Performance optimization based on user feedback
- Additional brush presets
- Tutorial content expansion

### Phase 2 (Months 4-6):
- iPad version with optimized UI for larger screens
- Apple Pencil pro features (squeeze gesture support)
- Animation frame export (GIF creation)
- Time-lapse recording of drawing process

### Phase 3 (Months 7-12):
- Android version
- Cloud sync (optional premium feature)
- Collaborative drawing (shared canvases)
- Brush marketplace (community-created brushes)

### Phase 4 (Year 2+):
- Vector drawing tools
- 3D painting capabilities
- AI-powered features (smart fill, style transfer)
- Desktop companion app (macOS)

---

## 13. Appendix

### 13.1 Color Palette Reference

**App Primary Gradient:**
- Start: #667EEA
- End: #764BA2

**Accent Colors:**
- Blue: #667EEA
- Purple: #764BA2
- Green (Success): #10B981
- Red (Danger): #EF4444
- Yellow (Warning): #F59E0B
- Gold (Premium): #FFD700

**Neutral Colors:**
- Background Light: #FFFFFF
- Background Dark: #0A0E27
- Surface Light: #F5F5F5
- Surface Dark: #1A1F3A
- Text Light: #1F2937
- Text Dark: #F9FAFB
- Border Light: rgba(0,0,0,0.1)
- Border Dark: rgba(255,255,255,0.1)

---

### 13.2 Typography Scale

**Font Family:** SF Pro (iOS System Font)

**Type Scale:**
- Display Large: 34pt, Bold
- Display: 24pt, Bold
- Headline: 20pt, Semibold
- Title: 18pt, Semibold
- Body: 16pt, Regular
- Callout: 14pt, Regular
- Caption: 12pt, Regular
- Small: 11pt, Regular

**Line Heights:**
- Display: 1.2
- Headlines/Titles: 1.3
- Body text: 1.5
- Captions: 1.4

---

### 13.3 Icon Library

**Primary Icon Set:** Feather Icons (vector)
- Lightweight SVG icons
- Consistent 24px base size
- 2px stroke width
- Rounded corners style

**Common Icons Used:**
- menu: hamburger menu
- arrow-left: back navigation
- plus: add/create
- edit-3: brush tool
- pen-tool: pencil tool
- delete: eraser tool
- droplet: color picker
- layers: layers panel
- settings: settings
- share-2: share/export
- star: favorite/premium
- eye / eye-off: visibility toggle
- lock / unlock: lock layer
- check-circle: success confirmation
- x-circle: error/cancel

---

### 13.4 Remote Image Sources

**For graphics, illustrations, and sample artwork:**
- Unsplash: https://unsplash.com/
- Pexels: https://www.pexels.com/
- Pixabay: https://pixabay.com/

**Example Usage:**
```javascript
// Tutorial illustration images
const tutorialImages = {
  welcome: 'https://images.unsplash.com/photo-[id]?w=800',
  gestures: 'https://images.pexels.com/photos/[id].jpg?w=800',
  tools: 'https://pixabay.com/get/[id].jpg'
};

// Sample artwork for empty state
const sampleArtwork = {
  abstract: 'https://images.unsplash.com/photo-[id]?w=1080',
  landscape: 'https://images.pexels.com/photos/[id].jpg?w=1080'
};
```

**Note:** In production, images should be cached locally after first download to support offline functionality.

---

### 13.5 Animation Timing Reference

**Timing Functions (Cubic Bezier):**
- Ease-in-out: cubic-bezier(0.42, 0, 0.58, 1)
- Ease-out: cubic-bezier(0, 0, 0.58, 1)
- Ease-in: cubic-bezier(0.42, 0, 1, 1)
- Custom smooth: cubic-bezier(0.25, 0.1, 0.25, 1)

**Duration Standards:**
- Micro-interactions: 100-150ms
- Short transitions: 200-300ms
- Standard transitions: 300-400ms
- Long transitions: 400-600ms
- Deliberate transitions: 600-1000ms

**Spring Presets:**
- Tight spring: {damping: 25, stiffness: 400}
- Standard spring: {damping: 20, stiffness: 300}
- Loose spring: {damping: 15, stiffness: 180}
- Bouncy spring: {damping: 10, stiffness: 300}

---

### 13.6 File Format Specifications

**.bflow File Structure:**
```
Offset | Size | Description
-------|------|------------
0      | 8    | Magic number: "BFLOW001"
8      | 4    | Version number (uint32)
12     | 4    | Canvas width (uint32)
16     | 4    | Canvas height (uint32)
20     | 4    | Layer count (uint32)
24     | 4    | Background color (RGBA uint32)
28     | ?    | Layer data blocks (variable)
?      | 4    | Checksum (CRC32)

Layer Data Block:
Offset | Size | Description
-------|------|------------
0      | 4    | Layer ID (uint32)
4      | 64   | Layer name (UTF-8, null-terminated)
68     | 4    | Layer width (uint32)
72     | 4    | Layer height (uint32)
76     | 4    | Layer X offset (int32)
80     | 4    | Layer Y offset (int32)
84     | 4    | Layer opacity (float32, 0-1)
88     | 4    | Blend mode (uint32 enum)
92     | 4    | Bitmap data size (uint32)
96     | ?    | Bitmap data (raw RGBA, uncompressed)
```

---

## 14. Conclusion

BrushFlow represents a comprehensive, production-ready digital painting application optimized for iOS devices. The design prioritizes gesture-based interactions, smooth animations, and professional-grade tools while maintaining accessibility and performance across device ranges.

The technical architecture leverages React Native's ecosystem while utilizing native performance optimizations through Skia rendering and Reanimated animations. The monetization strategy balances free access to core functionality with compelling premium features that enhance the creative experience without limiting basic usability.

The gesture-first interaction model, inspired by modern mobile apps, ensures BrushFlow feels native and intuitive to iOS users while providing power-user features through progressive disclosure. Every interaction, from the physics-based splash screen to the layer reordering gestures, has been designed to feel responsive, natural, and delightful.

With a clear roadmap for expansion and a solid foundation for offline-first functionality, BrushFlow is positioned to serve as a professional creative tool for mobile artists while maintaining the simplicity and accessibility expected of modern iOS applications.

---

**Document Version:** 1.0  
**Last Updated:** October 2025  
**Document Status:** Ready for Development