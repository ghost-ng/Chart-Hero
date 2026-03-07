# Chart Hero JSON Import Rulebook

> **Purpose:** This document is a complete specification for AI models to generate valid Chart Hero JSON files that can be imported and auto-build diagrams.

> **CRITICAL: The output MUST be strict JSON.** No comments (`//`, `/* */`), no trailing commas, no unquoted keys. JSON does not support comments — the parser will reject the entire file if comments are present. If you need to annotate sections, use a `"_comment"` key inside an object (it will be silently ignored by the importer).

## 1. File Structure

A Chart Hero JSON file is a single object with these top-level keys:

```json
{
  "version": "1.0",
  "nodes": [ ... ],
  "edges": [ ... ],
  "viewport": { ... },
  "styles": { ... },
  "swimlanes": { ... },
  "layers": [ ... ],
  "nodeLegend": { ... },
  "swimlaneLegend": { ... },
  "legend": { ... },
  "metadata": { ... }
}
```

| Key | Required | Description |
|-----|----------|-------------|
| `version` | No | Schema version string (currently `"1.0"`) |
| `nodes` | **Yes** | Array of node objects (the blocks/shapes on the canvas) |
| `edges` | No | Array of edge objects (connectors between nodes) |
| `viewport` | No | Camera position `{ x, y, zoom }` |
| `styles` | No | Visual theme settings |
| `swimlanes` | No | Swimlane configuration |
| `layers` | No | Layer management data |
| `nodeLegend` | No | Node/edge legend overlay configuration (preferred) |
| `swimlaneLegend` | No | Swimlane legend overlay configuration |
| `legend` | No | Legacy single legend (imported as node legend if `nodeLegend` is absent) |
| `metadata` | No | Informational only (node/edge counts) |

---

## 2. Nodes

Each node represents a shape on the canvas.

### 2.1 Required Node Fields

```json
{
  "id": "node_1",
  "position": { "x": 100, "y": 200 },
  "data": {
    "label": "Start Process",
    "shape": "rectangle"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes* | Unique node identifier. Auto-generated if missing. |
| `position` | `{ x: number, y: number }` | Yes | Position in canvas coordinates (pixels). `(0,0)` is top-left. |
| `data` | object | Yes | Node data payload (see below) |
| `type` | string | No | Node renderer type. Use `"shapeNode"` (default) or `"groupNode"` |
| `parentId` | string | No | ID of parent group node (for grouped nodes) |
| `extent` | string | No | Set to `"parent"` when node is inside a group |

*If `id` is omitted, one is auto-generated. Duplicate IDs are automatically renamed.

### 2.2 Node Data (`data` object)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `label` | string | `"Node N"` | Display text on the shape |
| `shape` | string | `"rectangle"` | Shape type (see valid shapes below) |
| `description` | string | — | Optional description/notes |
| `color` | string (hex) | Shape default | Fill/background color. Example: `"#3b82f6"` |
| `borderColor` | string (hex) | Darkened fill | Border/outline color |
| `textColor` | string (hex) | `"#ffffff"` | Label text color |
| `fontSize` | number | `14` | Font size in pixels |
| `fontWeight` | number | `500` | Font weight (100-900) |
| `fontFamily` | string | `"'Inter', sans-serif"` | CSS font-family |
| `textAlign` | string | `"center"` | Text alignment: `"left"`, `"center"`, or `"right"` |
| `width` | number | Shape default | Width in pixels |
| `height` | number | Shape default | Height in pixels |
| `opacity` | number | `1` | Opacity (0-1) |
| `borderStyle` | string | `"solid"` | `"solid"`, `"dashed"`, or `"dotted"` |
| `borderWidth` | number | `2` | Border thickness in pixels |
| `borderRadius` | number | Shape default | Corner radius override in pixels |
| `icon` | string | — | Lucide icon name (e.g. `"Check"`, `"AlertTriangle"`, `"Database"`) |
| `iconColor` | string (hex) | text color | Icon color |
| `iconSize` | number | font size + 2 | Icon size in pixels |
| `iconPosition` | string | `"left"` | `"left"` or `"right"` relative to label |
| `iconBgColor` | string (hex) | — | Background color behind the icon |
| `iconBorderColor` | string (hex) | — | Border color around the icon wrapper |
| `iconBorderWidth` | number | `0` | Border width around the icon wrapper |
| `iconOnly` | boolean | `false` | If `true`, renders only the icon with no shape background |
| `groupId` | string | — | ID of the parent group node |
| `linkGroupId` | string | — | Logical group ID (nodes in the same link group move together) |
| `layerId` | string | — | Layer ID for z-ordering |
| `swimlaneId` | string | — | Swimlane ID the node belongs to |
| `statusIndicators` | array | — | Array of status pucks (see Section 4) |
| `dependsOn` | string[] | — | Array of node IDs this node depends on |
| `blockedBy` | string[] | — | Array of node IDs that block this node |

### 2.3 Valid Shapes

**Standard shapes:**
| Shape ID | Description | Default Size (w×h) |
|----------|-------------|-------------------|
| `rectangle` | Standard rectangle | 160×60 |
| `roundedRectangle` | Rectangle with rounded corners | 160×60 |
| `diamond` | Decision/conditional diamond (⚠️ see note below) | 100×100 |
| `circle` | Circle | 100×100 |
| `ellipse` | Ellipse (alias for circle) | 100×100 |
| `parallelogram` | Input/output parallelogram | 160×60 |
| `hexagon` | Hexagonal shape | 160×60 |
| `triangle` | Triangle | 160×60 |
| `star` | 5-point star | 160×60 |
| `cloud` | Cloud shape | 160×60 |
| `document` | Document with wavy bottom | 160×60 |
| `stickyNote` | Sticky note with folded corner | 160×60 |
| `textbox` | Transparent text box with dashed border (ideal for annotations) | 160×60 |
| `arrow` | Simple arrow shape | 160×80 |

**Flowchart-specific shapes:**
| Shape ID | Description | Default Size |
|----------|-------------|-------------|
| `predefinedProcess` | Process with double side lines | 160×60 |
| `manualInput` | Manual input (skewed top) | 160×60 |
| `preparation` | Preparation hexagon | 160×60 |
| `data` | Data I/O parallelogram | 160×60 |
| `database` | Database cylinder | 160×60 |
| `internalStorage` | Internal storage | 160×60 |
| `display` | Display shape | 160×60 |
| `callout` | Callout bubble | 160×60 |

**Arrow shapes:**
| Shape ID | Description | Default Size |
|----------|-------------|-------------|
| `blockArrow` | Block arrow pointing right | 160×80 |
| `chevronArrow` | Chevron/pentagon arrow | 160×80 |
| `doubleArrow` | Bidirectional arrow | 160×80 |
| `circularArrow` | Circular/recycling arrow | 100×100 |

**Container:**
| Shape ID | Description | Default Size |
|----------|-------------|-------------|
| `group` | Group container (use `type: "groupNode"`) | 300×200 |

> **⚠️ Diamond Shape Warning:** Diamonds render text inside a rotated square, so the usable text area is roughly **50% of the bounding box**. A 100×100 diamond can only fit ~5-6 characters per line. **Rules:**
> - Labels MUST be 1-2 words max (e.g., `"Valid?"`, `"Approve"`, `"Gate"`)
> - For 2-word labels, set `width: 120, height: 120` and `fontSize: 12`
> - NEVER put a 3+ word label in a diamond — use `rectangle` or `hexagon` instead
> - Example of what NOT to do: `"Formalize Governance Board"` in a diamond will produce broken, unreadable text

### 2.4 Default Shape Colors

If `color` is omitted, the shape type determines the fill:

| Shape | Default Color |
|-------|--------------|
| `rectangle`, `roundedRectangle` | `#3b82f6` (blue) |
| `diamond` | `#f59e0b` (amber) |
| `circle` | `#10b981` (green) |
| `parallelogram` | `#8b5cf6` (purple) |
| `hexagon` | `#ef4444` (red) |
| `document` | `#ec4899` (pink) |
| `cloud` | `#6366f1` (indigo) |
| `stickyNote` | `#fbbf24` (yellow) |
| `textbox` | transparent (no fill) |
| `blockArrow` | `#3b82f6` (blue) |
| `chevronArrow` | `#8b5cf6` (purple) |
| `doubleArrow` | `#f59e0b` (amber) |
| `circularArrow` | `#10b981` (green) |

---

## 3. Edges (Connectors)

Each edge connects two nodes. Edges support full styling including color, thickness, dash patterns, labels, and arrowhead markers.

```json
{
  "id": "edge_1",
  "source": "node_1",
  "target": "node_2",
  "type": "smoothstep",
  "sourceHandle": "bottom",
  "targetHandle": "top",
  "animated": false,
  "label": "Yes",
  "markerEnd": "arrowclosed",
  "data": {
    "label": "Yes",
    "color": "#10b981",
    "thickness": 2,
    "strokeDasharray": "8 4"
  }
}
```

### 3.1 Edge Fields (top-level)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes* | Unique edge identifier |
| `source` | string | **Yes** | ID of the source node |
| `target` | string | **Yes** | ID of the target node |
| `type` | string | `"smoothstep"` | Edge routing type (see below) |
| `sourceHandle` | string | — | Source connection point: `"top"`, `"bottom"`, `"left"`, `"right"` |
| `targetHandle` | string | — | Target connection point: `"top"`, `"bottom"`, `"left"`, `"right"` |
| `animated` | boolean | `false` | Whether to animate the edge (React Flow top-level property) |
| `label` | string | — | Text label on the edge (alternative to `data.label`) |
| `markerEnd` | string | `"arrowclosed"` | End arrowhead marker (see markers below) |
| `markerStart` | string | — | Start arrowhead marker (see markers below) |
| `style` | object | — | CSS style overrides for the edge path (e.g. `{ "stroke": "#f00" }`) |
| `data` | object | — | Edge data payload (see below) |

### 3.2 Valid Edge Types

| Type | Description | Visual |
|------|-------------|--------|
| `default` | Default bezier curve | Smooth curved line |
| `straight` | Straight line | Direct line between nodes |
| `step` | Right-angle steps | Sharp 90° turns |
| `smoothstep` | Smooth right-angle curves (recommended) | Rounded 90° turns |
| `bezier` | Smooth bezier curve | S-curve line |
| `dependency` | Styled dependency connector | Colored by dependency type |
| `animated` | Animated dashed line | Moving dashes |

### 3.3 Edge Data (`data` object)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `label` | string | — | Text label shown on the edge |
| `color` | string (hex) | `"#94a3b8"` | Edge stroke color |
| `thickness` | number | `2` | Stroke width in pixels (range 1-6) |
| `animated` | boolean | `false` | Whether to animate the edge |
| `opacity` | number | `1` | Edge opacity (0-1) |
| `labelColor` | string (hex) | — | Color of the label text |
| `labelPosition` | number | `0.5` | Position of the label along the edge: `0` = near source, `0.5` = center (default), `1` = near target |
| `labelFontSize` | number | `11` | Label text size in pixels (range 8-24) |
| `labelBgColor` | string (hex) | `"#ffffff"` | Background color behind the label for readability |
| `strokeDasharray` | string | — | SVG dash pattern (e.g. `"8 4"` for dashed, `"2 4"` for dotted) |
| `notes` | string | — | Free-form notes or annotations for the edge |
| `dependencyType` | string | — | `"depends-on"`, `"blocks"`, `"related"`, `"triggers"`, `"optional"`, `"milestone-gate"`, or `"none"` |

### 3.4 Arrowhead Markers

| Marker Value | Description |
|-------------|-------------|
| `"arrowclosed"` | Filled triangle arrowhead (default for `markerEnd`) |
| `"arrow"` | Open triangle arrowhead |
| _(omit)_ | No marker |

### 3.5 Common Connector Patterns

**Dashed connector:**
```json
{ "id": "e1", "source": "a", "target": "b", "data": { "color": "#94a3b8", "strokeDasharray": "8 4" } }
```

**Thick colored connector with label:**
```json
{ "id": "e2", "source": "a", "target": "b", "data": { "label": "HTTPS", "color": "#3b82f6", "thickness": 3 } }
```

**Animated dependency edge:**
```json
{ "id": "e3", "source": "a", "target": "b", "type": "dependency", "data": { "dependencyType": "blocks", "color": "#ef4444" } }
```

**Connector with label near the source:**
```json
{ "id": "e4a", "source": "a", "target": "b", "data": { "label": "Out", "labelPosition": 0.15 } }
```

**Bidirectional arrows:**
```json
{ "id": "e4", "source": "a", "target": "b", "markerEnd": "arrowclosed", "markerStart": "arrowclosed" }
```

---

## 4. Status Pucks (Indicators)

Nodes can have status indicator badges. Set via `data.statusIndicators` array.

```json
{
  "statusIndicators": [
    {
      "id": "puck_1",
      "status": "in-progress",
      "position": "top-right",
      "color": "#3b82f6",
      "size": 12
    }
  ]
}
```

### 4.1 StatusIndicator Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | string | Auto-generated | Unique puck identifier |
| `status` | string | `"none"` | Status value (see below) |
| `color` | string (hex) | Status default | Override badge color |
| `size` | number | `12` | Badge diameter in pixels (6-40) |
| `position` | string | `"top-right"` | Corner placement |
| `borderColor` | string (hex) | `"#ffffff"` | Badge border color |
| `borderWidth` | number | `2` | Badge border width |
| `borderStyle` | string | `"solid"` | `"solid"`, `"dashed"`, `"dotted"`, `"none"` |
| `icon` | string | — | Lucide icon name inside the puck |

### 4.2 Status Values and Default Colors

| Status | Default Color | Description |
|--------|--------------|-------------|
| `none` | — | No indicator (hidden) |
| `not-started` | `#94a3b8` (gray) | Work not started |
| `in-progress` | `#3b82f6` (blue) | Currently in progress |
| `completed` | `#10b981` (green) | Completed |
| `blocked` | `#ef4444` (red) | Blocked |
| `review` | `#f59e0b` (amber) | Under review |

### 4.3 Position Values

| Position | Corner |
|----------|--------|
| `top-right` | Upper-right corner |
| `top-left` | Upper-left corner |
| `bottom-right` | Lower-right corner |
| `bottom-left` | Lower-left corner |

---

## 5. Viewport

Controls the initial camera position.

```json
{
  "viewport": {
    "x": 0,
    "y": 0,
    "zoom": 1
  }
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `x` | number | `0` | Horizontal pan offset |
| `y` | number | `0` | Vertical pan offset |
| `zoom` | number | `1` | Zoom level (0.1 = zoomed out, 2 = zoomed in) |

---

## 6. Styles

Apply a visual theme to the entire diagram.

```json
{
  "styles": {
    "activeStyleId": "cleanMinimal",
    "activePaletteId": "ocean",
    "canvasColorOverride": null
  }
}
```

- `activeStyleId` can be a style ID string or `null` (no theme active)
- `canvasColorOverride` can be a hex color string or `null` (use theme default)

### 6.1 Available Style IDs

| Style ID | Description |
|----------|-------------|
| `cleanMinimal` | Clean, minimal design (default) |
| `corporateProfessional` | Professional corporate look |
| `blueprint` | Technical blueprint style |
| `whiteboardSketch` | Hand-drawn whiteboard feel |
| `neonDark` | Neon colors on dark background |
| `pastelSoft` | Soft pastel colors |
| `flatMaterial` | Material Design flat style |
| `monochromeInk` | Black and white ink style |
| `retroTerminal` | Retro green-on-black terminal |
| `watercolor` | Watercolor painting effect |
| `glassMorphism` | Frosted glass effect |
| `wireframe` | Minimal wireframe style |
| `militaryC2` | Military command & control |
| `infographicBold` | Bold infographic style |
| `colorfulGradient` | Colorful gradient fills |
| `darkNeonGlow` | Dark theme with neon glow |
| `notebook` | Lined notebook paper style |
| `gradientCards` | Gradient card design |
| `cyberC2` | Cyberpunk command & control |
| `zincModern` | Ultra-clean SaaS look, zinc/gray tones |
| `softGradient` | Pastel gradient bg, soft editorial feel |
| `midnightLuxe` | Dark luxury with gold accents |
| `paperPrint` | Warm off-white, book typography |
| `auroraBorealis` | Dark gradient with neon aurora accents |
| `neonGlass` | Dark frosted glass with neon green accents |
| `osxAqua` | Light macOS-inspired clean design |
| `solarizedDark` | Solarized dark color scheme |
| `claudeAI` | Anthropic Claude warm terracotta tones |
| `openAI` | OpenAI light canvas with dark blocks and green accents |

### 6.2 Available Palette IDs

Color palettes control the colors assigned to nodes via number keys (1-9).

| Palette ID | Description |
|-----------|-------------|
| `ocean` | Blue/teal ocean tones (default) |
| `berry` | Purple/pink berry tones |
| `forest` | Green/brown earth tones |
| `sunset` | Orange/red warm tones |
| `grayscale` | Gray shades only |
| `cyber` | Neon/cyberpunk colors |
| `pastelDream` | Soft pastel colors |
| `earthTone` | Warm earth/terracotta |
| `military` | Olive/khaki/navy |
| `accessible` | High-contrast accessible colors |
| `cyberC2` | Cyberpunk command & control colors |
| `midnightAurora` | Deep purples, aurora greens/teals |
| `roseGold` | Pinks, warm gold, soft neutrals |
| `nordicFrost` | Icy blues, cool grays |
| `terracotta` | Warm reds, ochre, sage green |
| `lavenderFields` | Soft purples, mint, warm tones |
| `tropical` | Vivid greens, turquoise, sunset |
| `candyPop` | Bright pinks, yellows, mint |
| `tokyoNight` | Neon purples, magentas, deep blues |
| `coralReef` | Ocean blues, corals, seafoam |
| `vintageSage` | Muted sage, dusty rose, cream |

---

## 7. Swimlanes

Organize nodes into horizontal and/or vertical lanes.

```json
{
  "swimlanes": {
    "orientation": "horizontal",
    "containerTitle": "Process Phases",
    "horizontal": [
      {
        "id": "lane_design",
        "label": "Design",
        "color": "#dbeafe",
        "size": 250,
        "order": 0,
        "collapsed": false
      },
      {
        "id": "lane_develop",
        "label": "Development",
        "color": "#dcfce7",
        "size": 300,
        "order": 1,
        "collapsed": false
      }
    ],
    "vertical": [],
    "containerBorder": {
      "color": "#94a3b8",
      "width": 1,
      "style": "solid",
      "radius": 4
    },
    "dividerStyle": {
      "color": "#cbd5e1",
      "width": 1,
      "style": "dashed"
    },
    "labelFontSize": 10,
    "labelRotation": 0
  }
}
```

### 7.1 Swimlane Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `orientation` | string | `"horizontal"` | `"horizontal"` or `"vertical"` |
| `containerTitle` | string | `""` | Title displayed above the swimlane container |
| `horizontal` | array | `[]` | Array of horizontal lane objects |
| `vertical` | array | `[]` | Array of vertical lane objects |
| `containerOffset` | `{ x, y }` | `{ x: 0, y: 0 }` | Pixel offset of the swimlane container on the canvas |
| `containerBorder` | object | — | Border customization for the swimlane container (see below) |
| `dividerStyle` | object | — | Styling for lane divider lines (see below) |
| `labelFontSize` | number | `10` | Font size for lane header labels (8-18) |
| `labelRotation` | number | `0` | Label rotation in degrees (-90 to 90, step 15). `0` = default vertical writing for horizontal lanes |

### 7.2 Lane Object

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | string | Auto-generated | Unique lane identifier |
| `label` | string | `"Lane"` | Display label |
| `color` | string (hex) | `"#e2e8f0"` | Lane background color |
| `size` | number | `200` | Lane width (vertical) or height (horizontal) in pixels |
| `order` | number | `0` | Sort order (lower = first) |
| `collapsed` | boolean | `false` | Whether the lane is collapsed |
| `showLabel` | boolean | `true` | Whether the lane label is visible on the canvas |
| `showColor` | boolean | `true` | Whether the lane color indicator is visible on the canvas |
| `hidden` | boolean | `false` | When true, the lane background, header, and assigned nodes are hidden |

### 7.3 Container Border (`containerBorder` object)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `color` | string (CSS color) | `"#94a3b8"` | Border color |
| `width` | number | `1` | Border width in pixels (1-5) |
| `style` | string | `"solid"` | `"solid"`, `"dashed"`, `"dotted"`, or `"none"` |
| `radius` | number | `4` | Corner radius in pixels (0-12) |

### 7.4 Divider Style (`dividerStyle` object)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `color` | string (CSS color) | Auto from theme | Divider line color |
| `width` | number | `1` | Divider line width in pixels (1-5) |
| `style` | string | `"solid"` | `"solid"`, `"dashed"`, `"dotted"`, or `"none"` |

To assign a node to a swimlane, set `data.swimlaneId` on the node to match a lane's `id`.

---

## 8. Layers

Z-ordering layers for organizing nodes by visibility and depth.

```json
{
  "layers": [
    {
      "id": "default",
      "name": "Default Layer",
      "visible": true,
      "locked": false,
      "opacity": 1,
      "color": "#6366f1",
      "order": 0
    },
    {
      "id": "layer_annotations",
      "name": "Annotations",
      "visible": true,
      "locked": false,
      "opacity": 0.7,
      "color": "#f59e0b",
      "order": 1
    }
  ]
}
```

### 8.1 Layer Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | string | Required | Unique layer identifier. `"default"` always exists. |
| `name` | string | `"Layer"` | Display name |
| `visible` | boolean | `true` | Whether nodes on this layer are visible |
| `locked` | boolean | `false` | Whether nodes on this layer can be moved |
| `opacity` | number | `1` | Layer opacity (0-1) |
| `color` | string (hex) | `"#6366f1"` | Layer color indicator in UI |
| `order` | number | `0` | Sort order |

To assign a node to a layer, set `data.layerId` on the node to match a layer's `id`.

---

## 9. Legends (Dual Legend System)

Chart Hero supports **two independent legend overlays**: one for nodes/edges and one for swimlanes. Each has its own position, style, and items.

Use `nodeLegend` for node fill colors, borders, status pucks, and edge colors. Use `swimlaneLegend` for swimlane lane colors. For backwards compatibility, the importer also accepts a single `legend` field (imported as the node legend if `nodeLegend` is absent).

```json
{
  "nodeLegend": {
    "title": "Legend",
    "visible": true,
    "position": { "x": 50, "y": 50 },
    "style": {
      "bgColor": "#ffffff",
      "borderColor": "#e2e8f0",
      "borderWidth": 1,
      "fontSize": 11,
      "opacity": 1,
      "width": 180
    },
    "items": [
      {
        "id": "leg_1",
        "label": "Active",
        "color": "#10b981",
        "kind": "fill",
        "order": 0
      },
      {
        "id": "leg_2",
        "label": "Dashed border",
        "color": "#ef4444",
        "kind": "border",
        "borderStyle": "dashed",
        "order": 1
      },
      {
        "id": "leg_3",
        "label": "In Progress",
        "color": "#3b82f6",
        "kind": "puck",
        "order": 2
      },
      {
        "id": "leg_4",
        "label": "Data Flow",
        "color": "#94a3b8",
        "kind": "edge",
        "order": 3
      }
    ]
  },
  "swimlaneLegend": {
    "title": "Swimlanes",
    "visible": true,
    "position": { "x": 50, "y": 300 },
    "style": { "bgColor": "#ffffff", "borderColor": "#e2e8f0", "borderWidth": 1, "fontSize": 11, "opacity": 1, "width": 180 },
    "items": [
      { "id": "lane-design", "label": "Design", "color": "#dbeafe", "kind": "lane", "order": 0 },
      { "id": "lane-dev", "label": "Development", "color": "#dcfce7", "kind": "lane", "order": 1 }
    ]
  }
}
```

### 9.1 Legend Fields (same structure for `nodeLegend` and `swimlaneLegend`)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"Legend"` / `"Swimlanes"` | Title displayed at the top of the legend |
| `visible` | boolean | `true` | Whether the legend is visible on the canvas |
| `position` | `{ x: number, y: number }` | Node: `{ x: 50, y: 50 }`, Swimlane: `{ x: 50, y: 300 }` | Position in flow coordinates |
| `style` | object | — | Visual style settings (see below) |
| `items` | array | `[]` | Array of legend item objects (see below) |

### 9.2 Legend Style

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `bgColor` | string (CSS color) | `"#ffffff"` | Background color |
| `borderColor` | string (CSS color) | `"#e2e8f0"` | Border color |
| `borderWidth` | number | `1` | Border width in pixels |
| `fontSize` | number | `11` | Font size in pixels |
| `opacity` | number | `1` | Opacity (0-1) |
| `width` | number | `180` | Legend panel width in pixels (120-300) |

### 9.3 Legend Item

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique item identifier |
| `label` | string | Yes | Display label text |
| `color` | string (CSS color) | Yes | Color swatch shown beside the label |
| `kind` | string | No | Visual indicator kind: `"fill"` (filled rectangle), `"border"` (outlined rectangle), `"puck"` (circle), `"edge"` (line with arrowhead), `"lane"` (filled rectangle for swimlanes). Default: `"fill"` |
| `borderStyle` | string | No | Border style for `"border"` kind items: `"solid"`, `"dashed"`, or `"dotted"` |
| `shape` | string | No | Shape name (renders a small shape icon) |
| `icon` | string | No | Lucide icon name (renders inside the swatch) |
| `order` | number | No | Display order (lower = first) |
| `hidden` | boolean | No | When true, item is hidden from the canvas overlay but kept in the editor |

### 9.4 Backwards Compatibility

If `nodeLegend` and `swimlaneLegend` are both absent, the importer falls back to reading the legacy `legend` field and imports it as the node legend. New exports always write all three fields (`nodeLegend`, `swimlaneLegend`, and `legend`) for maximum compatibility.

---

## 10. Icons

Chart Hero uses [Lucide icons](https://lucide.dev/icons/). When specifying an icon name, use the **PascalCase** component name from lucide-react.

### 10.1 Icon Properties on Nodes

Icons are configured via fields in the node `data` object:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `icon` | string | — | Lucide icon name in PascalCase (e.g. `"Database"`, `"Shield"`) |
| `iconColor` | string (hex) | text color | Icon color |
| `iconSize` | number | fontSize + 2 | Icon size in pixels |
| `iconPosition` | string | `"left"` | `"left"` or `"right"` relative to label |
| `iconBgColor` | string (hex) | — | Background color behind the icon (creates a colored badge) |
| `iconBorderColor` | string (hex) | — | Border color around the icon wrapper |
| `iconBorderWidth` | number | `0` | Border width around the icon wrapper |
| `iconOnly` | boolean | `false` | Renders only the icon with no shape background |

### 10.2 Icon Examples

**Node with icon next to label:**
```json
{
  "data": {
    "label": "Database",
    "shape": "database",
    "color": "#6366f1",
    "icon": "Database",
    "iconColor": "#ffffff",
    "iconSize": 18
  }
}
```

**Icon with colored background badge:**
```json
{
  "data": {
    "label": "Secure",
    "shape": "rectangle",
    "icon": "Shield",
    "iconBgColor": "#10b981",
    "iconColor": "#ffffff",
    "iconBorderColor": "#059669",
    "iconBorderWidth": 1
  }
}
```

**Icon-only node (no shape background):**
```json
{
  "data": {
    "label": "",
    "shape": "rectangle",
    "icon": "Cloud",
    "iconOnly": true,
    "iconSize": 40,
    "iconColor": "#6366f1"
  }
}
```

### 10.3 Common Icon Names

| Icon Name | Visual | Use Case |
|-----------|--------|----------|
| `Check` | Checkmark | Success/completion |
| `X` | X/close | Failure/cancel |
| `AlertTriangle` | Warning triangle | Warnings |
| `AlertCircle` | Alert circle | Errors |
| `Database` | Database cylinder | Data stores |
| `Server` | Server rack | Servers/infrastructure |
| `Cloud` | Cloud | Cloud services |
| `User` | Person silhouette | Users/accounts |
| `Users` | People silhouettes | Teams/groups |
| `Settings` | Gear | Configuration |
| `Lock` | Padlock | Security/locked |
| `Unlock` | Open padlock | Unlocked/public |
| `Shield` | Shield | Protection/security |
| `ShieldCheck` | Shield with check | Verified/secure |
| `Key` | Key | Authentication |
| `ArrowRight` | Right arrow | Flow direction |
| `ArrowDown` | Down arrow | Flow direction |
| `FileText` | Document with text | Documents |
| `FolderOpen` | Open folder | Folders/categories |
| `Globe` | Globe/world | Internet/web |
| `Mail` | Email envelope | Email/messaging |
| `Phone` | Telephone | Phone/communication |
| `Search` | Magnifying glass | Search |
| `Star` | Star | Favorites/important |
| `Zap` | Lightning bolt | Performance/speed |
| `Code` | Code brackets | Code/development |
| `Terminal` | Terminal window | CLI/command line |
| `Cpu` | CPU chip | Processing/compute |
| `Wifi` | WiFi signal | Network/connectivity |
| `Clock` | Clock face | Time/scheduling |
| `Calendar` | Calendar | Dates/deadlines |
| `BarChart3` | Bar chart | Analytics/metrics |
| `PieChart` | Pie chart | Reports |
| `GitBranch` | Git branch | Version control |
| `Workflow` | Workflow diagram | Processes |
| `Bug` | Bug | Issues/debugging |
| `Eye` | Eye | Visibility/monitoring |
| `EyeOff` | Eye with slash | Hidden |
| `RefreshCw` | Circular arrows | Refresh/retry |
| `Trash2` | Trash can | Delete |
| `Download` | Download arrow | Downloads |
| `Upload` | Upload arrow | Uploads |
| `ExternalLink` | Arrow out of box | External links |
| `Link` | Chain link | Connections |
| `Layers` | Stacked layers | Layers/tiers |

The full icon list is at https://lucide.dev/icons/

---

## 11. Layout Guidelines

### 11.1 Coordinate System
- `(0, 0)` is the top-left of the canvas
- X increases to the right
- Y increases downward
- Nodes should be spaced at least 40px apart (typically 80-150px)

### 11.2 Recommended Spacing

For a top-to-bottom flow:
- **Horizontal spacing:** 200px between side-by-side nodes
- **Vertical spacing:** 100px between sequential nodes
- **Group padding:** 20-30px inside group containers

For a left-to-right flow:
- **Horizontal spacing:** 250px between sequential nodes
- **Vertical spacing:** 120px between parallel nodes

### 11.3 Connection Points

Each node has 4 connection handles:
- `"top"` — center top
- `"bottom"` — center bottom
- `"left"` — center left
- `"right"` — center right

For top-to-bottom flows, connect `"bottom"` → `"top"`.
For left-to-right flows, connect `"right"` → `"left"`.

**IMPORTANT:** Always set `sourceHandle` and `targetHandle` explicitly based on the relative positions of the two nodes. If the source is to the left of the target, use `"right"` → `"left"`. If the source is above the target, use `"bottom"` → `"top"`. Omitting handles causes React Flow to guess, often producing awkward diagonal or overlapping edge routes — especially for cross-lane connections in swimlane diagrams.

---

## 12. Complete Examples

### 12.1 Simple Flowchart

```json
{
  "version": "1.0",
  "nodes": [
    {
      "id": "start",
      "position": { "x": 300, "y": 50 },
      "data": {
        "label": "Start",
        "shape": "roundedRectangle",
        "color": "#10b981"
      }
    },
    {
      "id": "process",
      "position": { "x": 300, "y": 200 },
      "data": {
        "label": "Process Data",
        "shape": "rectangle",
        "color": "#3b82f6"
      }
    },
    {
      "id": "decision",
      "position": { "x": 330, "y": 350 },
      "data": {
        "label": "Valid?",
        "shape": "diamond",
        "color": "#f59e0b",
        "width": 100,
        "height": 100
      }
    },
    {
      "id": "success",
      "position": { "x": 300, "y": 520 },
      "data": {
        "label": "Complete",
        "shape": "roundedRectangle",
        "color": "#10b981",
        "statusIndicators": [
          { "status": "completed", "position": "top-right" }
        ]
      }
    },
    {
      "id": "error",
      "position": { "x": 550, "y": 350 },
      "data": {
        "label": "Handle Error",
        "shape": "rectangle",
        "color": "#ef4444",
        "icon": "AlertTriangle"
      }
    }
  ],
  "edges": [
    { "id": "e1", "source": "start", "target": "process" },
    { "id": "e2", "source": "process", "target": "decision" },
    { "id": "e3", "source": "decision", "target": "success", "data": { "label": "Yes", "color": "#10b981" } },
    { "id": "e4", "source": "decision", "target": "error", "sourceHandle": "right", "targetHandle": "left", "data": { "label": "No", "color": "#ef4444" } },
    { "id": "e5", "source": "error", "target": "process", "sourceHandle": "top", "targetHandle": "right", "data": { "label": "Retry" } }
  ]
}
```

### 12.2 System Architecture Diagram

```json
{
  "version": "1.0",
  "nodes": [
    {
      "id": "client",
      "position": { "x": 300, "y": 50 },
      "data": {
        "label": "Web Client",
        "shape": "rectangle",
        "color": "#3b82f6",
        "icon": "Globe",
        "width": 180
      }
    },
    {
      "id": "lb",
      "position": { "x": 310, "y": 200 },
      "data": {
        "label": "Load Balancer",
        "shape": "hexagon",
        "color": "#8b5cf6",
        "width": 160,
        "height": 80
      }
    },
    {
      "id": "api1",
      "position": { "x": 100, "y": 380 },
      "data": {
        "label": "API Server 1",
        "shape": "rectangle",
        "color": "#10b981",
        "icon": "Server",
        "statusIndicators": [
          { "status": "completed", "position": "top-right", "size": 10 }
        ]
      }
    },
    {
      "id": "api2",
      "position": { "x": 500, "y": 380 },
      "data": {
        "label": "API Server 2",
        "shape": "rectangle",
        "color": "#10b981",
        "icon": "Server",
        "statusIndicators": [
          { "status": "completed", "position": "top-right", "size": 10 }
        ]
      }
    },
    {
      "id": "db",
      "position": { "x": 250, "y": 560 },
      "data": {
        "label": "PostgreSQL",
        "shape": "database",
        "color": "#6366f1",
        "icon": "Database",
        "width": 180
      }
    },
    {
      "id": "cache",
      "position": { "x": 500, "y": 560 },
      "data": {
        "label": "Redis Cache",
        "shape": "cloud",
        "color": "#ef4444",
        "icon": "Zap"
      }
    }
  ],
  "edges": [
    { "id": "e1", "source": "client", "target": "lb", "data": { "label": "HTTPS" } },
    { "id": "e2", "source": "lb", "target": "api1", "sourceHandle": "bottom", "targetHandle": "top" },
    { "id": "e3", "source": "lb", "target": "api2", "sourceHandle": "bottom", "targetHandle": "top" },
    { "id": "e4", "source": "api1", "target": "db", "data": { "label": "SQL" } },
    { "id": "e5", "source": "api2", "target": "db", "data": { "label": "SQL" } },
    { "id": "e6", "source": "api1", "target": "cache", "sourceHandle": "right", "targetHandle": "left", "type": "straight", "data": { "label": "Cache", "color": "#ef4444" } },
    { "id": "e7", "source": "api2", "target": "cache", "data": { "label": "Cache", "color": "#ef4444" } }
  ],
  "styles": {
    "activeStyleId": "cleanMinimal",
    "activePaletteId": "ocean"
  }
}
```

### 12.3 Project Kanban with Swimlanes

```json
{
  "version": "1.0",
  "nodes": [
    {
      "id": "task1",
      "position": { "x": 50, "y": 80 },
      "data": {
        "label": "Design UI",
        "shape": "stickyNote",
        "swimlaneId": "lane_todo",
        "statusIndicators": [{ "status": "not-started" }]
      }
    },
    {
      "id": "task2",
      "position": { "x": 50, "y": 160 },
      "data": {
        "label": "API Integration",
        "shape": "stickyNote",
        "swimlaneId": "lane_progress",
        "statusIndicators": [{ "status": "in-progress" }]
      }
    },
    {
      "id": "task3",
      "position": { "x": 50, "y": 240 },
      "data": {
        "label": "Database Setup",
        "shape": "stickyNote",
        "swimlaneId": "lane_done",
        "statusIndicators": [{ "status": "completed" }]
      }
    }
  ],
  "edges": [],
  "swimlanes": {
    "orientation": "horizontal",
    "containerTitle": "Sprint Board",
    "horizontal": [
      { "id": "lane_todo", "label": "To Do", "color": "#fef3c7", "size": 200, "order": 0 },
      { "id": "lane_progress", "label": "In Progress", "color": "#dbeafe", "size": 200, "order": 1 },
      { "id": "lane_done", "label": "Done", "color": "#dcfce7", "size": 200, "order": 2 }
    ],
    "vertical": []
  }
}
```

---

## 13. Validation Rules

The importer applies these rules automatically:

1. **Missing `id`**: Auto-generated as `"node_{timestamp}_{index}"`
2. **Duplicate `id`**: Renamed with `"_dup_{index}"` suffix
3. **Unknown `shape`**: Falls back to `"rectangle"` with a warning
4. **Unknown edge `type`**: Falls back to default `"smoothstep"` with a warning
5. **Missing `position`**: Defaults to `{ x: 0, y: 0 }`
6. **Missing `data.label`**: Defaults to `"Node {N}"`
7. **Invalid `source`/`target`**: Edge is imported but a warning is issued
8. **Missing `source` or `target`**: Edge is skipped
9. **Status indicators**: Missing `id` is auto-generated, invalid fields are dropped
10. **Extra/unknown fields**: Silently ignored (forward-compatible)

---

## 14. Sizing and Readability Guidelines

### 14.1 Font Sizing

Font sizes have a dramatic impact on diagram legibility. Get this wrong and the diagram is unreadable.

**Default `fontSize: 14`** works well for nodes sized 160×60 with 1-3 word labels. But you MUST adjust it based on context:

| Scenario | Recommended fontSize | Why |
|----------|---------------------|-----|
| Standard node (160×60) | `14` | Default, fits 2-3 words comfortably |
| Small node (100×50 or less) | `10-12` | Prevents text overflow |
| Large node (250×80+) | `16-18` | Fills space proportionally |
| Diamond (100×100) | `11-12` | Usable text area is ~50% of bounding box |
| Textbox/annotation | `11-13` | Annotations should be subtler than main nodes |
| Title/header node | `18-24` | Use sparingly for section headers |

**Font size scaling rule:** `fontSize` is in CSS pixels. For every 100px of node width, you can comfortably fit ~12 characters at `fontSize: 14`. So:
- 160px wide → ~19 characters at size 14
- 200px wide → ~24 characters at size 14
- 280px wide → ~33 characters at size 14

**NEVER leave `fontSize` at 14 for small shapes (diamonds, circles under 100px).** The text will overflow and look broken.

### 14.2 Block Sizing for Labels

Blocks (nodes) should be large enough to present their text/labels clearly without truncation or overflow. **You MUST set explicit `width` and `height` on any node whose label exceeds 2 words.** Follow these rules:

- **Short labels (1-2 words):** Default size is fine (160×60 for rectangles, 100×100 for diamonds/circles).
- **Medium labels (3-5 words):** Set `width: 200-250` explicitly. Example: `"Build Strategic Pipeline"` → `"width": 220`.
- **Long labels (6+ words):** Set `width: 280-360` and `height: 80-100`. Example: `"Launch Mentorship & Certification Validation"` → `"width": 320, "height": 80`.
- **With icons:** Add ~24px to the width to accommodate the icon beside the label.
- **Diamond shapes:** Keep labels to **1-2 words MAX** (diamonds have very limited interior space). Use `width: 120, height: 120` if the label is 2 words. Never put a long label in a diamond — use a `rectangle` or `hexagon` instead.
- **General rule:** When in doubt, make the block wider rather than taller — horizontal text is easier to read.
- **Rough formula:** `width ≈ (character count × 8) + 40` for default font size. So a 30-character label needs `width: 280`.
- **Multi-line labels:** For very long text, increase `height` proportionally. Each additional line of text at `fontSize: 14` needs ~20px of height.

**Quick reference — minimum node width by character count:**

| Characters | Min Width | Example Label |
|-----------|-----------|---------------|
| 5-10 | 120 | "Start", "Gateway" |
| 11-15 | 160 | "Process Data" |
| 16-20 | 200 | "Validate User Input" |
| 21-25 | 240 | "Handle Authentication" |
| 26-30 | 280 | "Deploy to Production Server" |
| 31+ | 320+ | Consider abbreviating or splitting |

### 14.2 Status Puck Sizing and Placement

When using status indicators (`statusIndicators`), consider the node size:

- **Default puck size (12px):** Works well on standard-sized nodes (160×60 and larger).
- **Small nodes (width < 100 or height < 50):** Use `size: 8` to avoid the puck dominating the node.
- **Large nodes (width > 250):** Consider `size: 14-16` so the puck remains visible.
- **Multiple pucks:** Place them in different corners to avoid overlap. For 2 pucks, use `top-right` and `top-left`. For 3-4, use all four corners.
- **Diamond shapes:** Pucks are automatically positioned at the diamond edge midpoints (not at bounding box corners), so all four positions work well.

### 14.3 Shape Selection Guide

Choosing the right shape communicates meaning before the reader even reads the label. **Use shapes consistently across your diagram.**

| Shape | Best Used For | Notes |
|-------|---------------|-------|
| `rectangle` | Actions, processes, tasks, generic steps | The workhorse — use this when in doubt |
| `roundedRectangle` | Start/end points, friendly actions, UI elements | Softer feel than rectangle; great for start/end terminators |
| `diamond` | Decisions, conditions, gates, yes/no branches | **1-2 word labels ONLY** — usable text area is ~50% of box |
| `circle` | Events, milestones, single-word concepts | Best at 100×100; keep labels very short |
| `hexagon` | Preparation steps, complex decisions, categories | Good alternative to diamond when labels are longer |
| `parallelogram` | Input/output, data flow, external data | Immediately signals data in/out |
| `database` | Databases, data stores, caches, queues | Recognizable cylinder shape |
| `cloud` | Cloud services, external systems, APIs | Good for anything "outside your system" |
| `document` | Documents, reports, files | Wavy bottom signals a document |
| `stickyNote` | Notes, comments, kanban cards | Yellow by default; informal feel |
| `textbox` | Annotations, callouts, explanatory text | No fill — just text with dashed border |
| `callout` | Callouts, speech bubbles, explanations | Has pointer tail |
| `star` | Important items, highlights, key decisions | Use sparingly for emphasis |
| `triangle` | Warnings, hierarchy indicators | Often used with `AlertTriangle` icon |
| `predefinedProcess` | Subroutines, library calls, reusable processes | Double-lined sides signal "defined elsewhere" |
| `blockArrow` | Direction indicators, flow arrows, migrations | Points right by default |

**Shape consistency rules:**
- All nodes of the same *type* (e.g., all API endpoints) should use the **same shape**
- Decisions should ALWAYS be diamonds (or hexagons for long labels)
- Start/end nodes should ALWAYS be `roundedRectangle`
- Data stores should ALWAYS be `database` or `cloud`
- Don't mix rectangle and roundedRectangle for the same category of node

### 14.4 Connector Best Practices

**Every diagram MUST have connectors (edges) unless it is explicitly a static layout like a kanban board.** Connectors are the primary way readers understand flow and relationships.

**CRITICAL: Diagrams without connectors are incomplete.** If nodes have logical relationships (A leads to B, A depends on B, data flows from A to B), you MUST create edge objects connecting them.

**Connector checklist:**
1. Every node (except pure annotation textboxes) should have at least one incoming or outgoing edge
2. Start nodes have only outgoing edges; end nodes have only incoming edges
3. Decision diamonds should have 2-3 outgoing edges (one per branch) with labels ("Yes", "No", "Error")
4. Always label branching edges to indicate which path they represent

**Connector type selection:**

| Edge Type | When to Use |
|-----------|-------------|
| `smoothstep` | **Default for most diagrams** — clean right-angle routes with rounded corners |
| `step` | Right-angle routes with sharp corners — formal/technical diagrams |
| `straight` | Direct point-to-point lines — simple diagrams with few crossings |
| `bezier` | Curved lines — organic or creative diagrams |
| `default` | Same as bezier |
| `dependency` | Semantic dependency edges with pill badges |
| `animated` | Animated dashes — active data flow, real-time connections |

**Connector styling best practices:**
- **Color connectors by meaning:** success paths in green (`#10b981`), error paths in red (`#ef4444`), data flow in blue (`#3b82f6`), default in gray (`#94a3b8`)
- **Use `thickness: 2-3`** for primary flow paths, `thickness: 1` for secondary/optional paths
- **Dashed edges** (`strokeDasharray: "8 4"`) for optional, async, or conditional paths
- **Bidirectional edges** (`markerEnd` + `markerStart`) only for truly two-way communication
- **Always set explicit `sourceHandle` and `targetHandle`** — see Section 11.3

**Example — properly connected decision diamond:**
```json
[
  { "id": "e_to_decision", "source": "process", "target": "decision", "sourceHandle": "bottom", "targetHandle": "top" },
  { "id": "e_yes", "source": "decision", "target": "success", "sourceHandle": "bottom", "targetHandle": "top", "data": { "label": "Yes", "color": "#10b981" } },
  { "id": "e_no", "source": "decision", "target": "error", "sourceHandle": "right", "targetHandle": "left", "data": { "label": "No", "color": "#ef4444" } }
]
```

### 14.5 Connector Labels and Short Edges

Edge labels can overlap or look cluttered on short connectors. Follow these guidelines:

- **Short edges (nodes < 120px apart):** Avoid labels, or use `labelPosition` to shift the label away from the midpoint (e.g., `0.2` or `0.8`).
- **Medium edges (120-250px):** Labels work well at the default center position (`0.5`).
- **Long edges (> 250px):** Labels are very readable; consider placing them near the source (`0.2`) or target (`0.8`) for clarity.
- **When labels overlap nodes:** Use `labelPosition: 0.3` or `0.7` to nudge the label away from the node.
- **Keep labels short:** 1-3 words is ideal (e.g., `"Yes"`, `"No"`, `"HTTPS"`, `"async"`). Long labels on edges look cluttered.
- **Dependency edges ("DEPENDS ON" pill):** The `dependency` edge type renders a pill badge ("DEPENDS ON", "BLOCKS", etc.) PLUS an optional custom label below it. This takes ~24px of vertical space at the edge midpoint. Ensure nodes connected by dependency edges are at least **180px apart** vertically, or use `labelPosition` to shift both labels away from nodes.

### 14.6 Node Overlap Prevention

Nodes must NEVER have overlapping bounding boxes. Calculate positions carefully:

- **Bounding box** = `(x, y)` to `(x + width, y + height)` using the node's actual or default dimensions.
- **Minimum gap:** Leave at least **40px** between the edges of adjacent node bounding boxes. 80-100px is preferred.
- **With edge labels:** If there is a labeled edge between two nodes, add extra spacing (at least **60px** beyond the label text height) to prevent the label from overlapping either node.
- **Common mistake:** Placing a node at `y: 200` with default height 60 means it occupies y 200-260. The next node below should start no earlier than `y: 320` (260 + 60px gap).

### 14.7 Swimlane Layout Guidelines

Swimlane headers have limited space for labels. Follow these rules:

- **Horizontal lane labels:** Rendered as vertical text in a 48px-wide left column. Keep labels to **2-3 words max** (~20 characters). Use abbreviations if needed (e.g., "Gov & Auth" not "Governance & Authorization").
- **Vertical lane labels:** Rendered horizontally in a 32px-tall top row. Keep labels to **3-4 words max**.
- **Lane sizing:** Set `size` large enough to contain all nodes assigned to that lane. A lane with 3 stacked nodes needs at least `size: 400` (3 nodes × ~60px height + 2 × ~100px spacing + margins).
- **Node positions in lanes:** When using swimlanes, position nodes within the lane's visual bounds. For horizontal lanes, nodes should be offset rightward by at least **60px** from the left edge (to clear the lane header).
- **Swimlane headers must not obscure blocks:** Ensure that the lane header area (left column for horizontal, top row for vertical) does not overlap or hide any node blocks. Position all nodes well clear of the header zone. For horizontal lanes, nodes should start at x ≥ header width + 20px padding. For vertical lanes, nodes should start at y ≥ header height + 20px padding. If nodes appear behind or under the headers, increase the offset or reduce header size.
- **Lane order:** Set `order` values sequentially (0, 1, 2...) to control which lane appears first.

### 14.8 Dark Mode and Dark Background Styles

When using dark styles (`darkMode: true` or dark diagram styles like `neonDark`, `retroTerminal`, `darkNeonGlow`, `cyberC2`), you MUST adjust colors for legibility on dark backgrounds.

**Color rules for dark mode:**

| Element | Light Mode Default | Dark Mode Recommendation |
|---------|-------------------|--------------------------|
| Node fill | Bright colors (`#3b82f6`) | Same bright colors work fine — they pop on dark bg |
| Node text | White (`#ffffff`) | White stays readable on colored fills |
| Node border | Darkened fill color | Lightened fill color or use bright accent (`#60a5fa`) |
| Edge color | Gray (`#94a3b8`) | Lighter gray (`#cbd5e1`) or bright accent |
| Edge labels | Gray | Light gray (`#e2e8f0`) or white for visibility |
| Swimlane labels | Dark text on light header | Light text (`#e2e8f0`) on dark header |
| Legend background | White (`#ffffff`) | Dark slate (`#1e293b`) |
| Legend text | Dark gray (`#475569`) | Light gray (`#94a3b8`) |
| Textbox border | Gray (`#94a3b8`) | Light gray (`#cbd5e1`) |
| StickyNote fill | Yellow (`#fbbf24`) | Darker yellow (`#d97706`) so it doesn't blind |

**Avoid these dark mode mistakes:**
- **Dark text on dark background** — If a node has a dark fill (navy, dark gray), ensure `textColor` is white or a light color
- **Low-contrast edges** — Gray edges on dark backgrounds become invisible. Use `"color": "#cbd5e1"` or brighter
- **Pastel fills** — Pale colors like `#dbeafe` look washed out on dark backgrounds. Use saturated versions (`#3b82f6`)
- **Default `textColor: "#ffffff"`** on light-filled nodes — If a node has `"color": "#fbbf24"` (yellow) in dark mode, the white text may lack contrast. Use `"textColor": "#1e293b"` (dark) instead

**Dark-friendly style IDs:** `neonDark`, `retroTerminal`, `darkNeonGlow`, `cyberC2`, `militaryC2`, `glassMorphism`, `midnightLuxe`, `auroraBorealis`, `neonGlass`, `solarizedDark`

**Example — dark mode system diagram:**
```json
{
  "styles": { "activeStyleId": "neonDark", "darkMode": true },
  "nodes": [
    {
      "id": "api",
      "position": { "x": 200, "y": 100 },
      "data": {
        "label": "API Gateway",
        "shape": "hexagon",
        "color": "#8b5cf6",
        "textColor": "#ffffff",
        "borderColor": "#a78bfa",
        "icon": "Shield",
        "iconColor": "#ffffff",
        "width": 180
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "client",
      "target": "api",
      "data": { "color": "#60a5fa", "thickness": 2, "label": "HTTPS", "labelColor": "#e2e8f0" }
    }
  ]
}
```

### 14.9 Overall Layout Quality Checklist

Before finalizing a diagram JSON, verify:

1. **No overlapping nodes** — Every node's bounding box is clear of all others.
2. **All nodes are connected** — Every non-annotation node has at least one edge. Orphan nodes indicate a broken diagram.
3. **Connectors have handles set** — `sourceHandle` and `targetHandle` are explicit on every edge.
4. **Decision nodes have labeled branches** — Every diamond/hexagon decision has 2+ outgoing edges with labels ("Yes"/"No", "Success"/"Failure").
5. **Edge labels don't collide with nodes** — Labels on short edges are shifted or omitted.
6. **Swimlane labels are short** — Under 20 characters for horizontal, under 30 for vertical.
7. **Consistent spacing** — Nodes in the same row/column are evenly spaced.
8. **Enough room for connectors** — Adjacent nodes have at least 100px between them vertically for edges/labels to render cleanly.
9. **Nodes fit their content** — `width`/`height` accommodate the label text, icon, and any status pucks.
10. **Font sizes are appropriate** — Small shapes (diamonds, circles < 100px) use `fontSize: 10-12`, not the default 14.
11. **Shapes are consistent** — All nodes of the same category use the same shape.
12. **Dark mode text is readable** — If `darkMode: true`, verify text colors contrast with both node fills and the dark slide background.
13. **Edge colors are visible** — Default gray edges (`#94a3b8`) are hard to see on dark backgrounds; use lighter colors.

---

## 15. Tips for AI Generation

### 15.1 Critical Rules (must follow)

1. **NO COMMENTS in JSON** — `//` and `/* */` are NOT valid JSON syntax. The parser will reject the entire file. Use `"_comment": "text"` inside objects if you must annotate.

2. **ALWAYS generate connectors (edges)** — A diagram without edges is incomplete. Every non-annotation node needs at least one connection. If nodes have any logical relationship (flow, dependency, data transfer, sequence), create an edge for it. The only exception is kanban/card layouts where position alone conveys meaning.

3. **ALWAYS set explicit `sourceHandle` and `targetHandle`** — Determine the relative positions of source and target nodes, then set handles accordingly: left-to-right → `"right"/"left"`, top-to-bottom → `"bottom"/"top"`. Omitting handles causes ugly auto-routed edges that cross over nodes.

4. **ALWAYS set explicit `width`/`height` for non-trivial labels** — Any label over 2 words MUST have explicit dimensions. Use the formula: `width ≈ (character count × 8) + 40`. A diamond with "Formalize Governance Board" will be unreadable — use a `rectangle` or `hexagon` instead.

5. **ALWAYS adjust `fontSize` for small shapes** — Diamonds and circles under 100px MUST use `fontSize: 10-12`. The default 14 will overflow.

6. **Use shapes consistently** — All nodes of the same category MUST use the same shape. Don't mix `rectangle` and `roundedRectangle` for the same type of node.

### 15.2 Best Practices

7. **Use unique, descriptive IDs** — e.g., `"node_auth_check"` not `"node_1"`. Makes edges easier to define and debug.

8. **Start with nodes, then edges** — Define all nodes first, then connect them. Reference node IDs in edge `source`/`target`.

9. **Consistent flow direction** — Pick either top-to-bottom or left-to-right and be consistent throughout.

10. **Use status indicators sparingly** — Only add them when the diagram tracks task status.

11. **Color coding with purpose** — Every distinct color in your diagram MUST convey meaning. Use consistent colors for node categories (e.g., green for success states, red for errors, blue for processing). Apply the same color to all nodes in the same category. Do NOT use random colors for visual variety — each color should map to a concept, and that mapping MUST be documented in the `nodeLegend`. If a diagram uses 4 fill colors, the legend must have 4 fill entries explaining what each color represents.

12. **Legend must match the diagram** — When generating a `nodeLegend`, ensure every color, border style, status puck, and edge color used in the diagram has a corresponding legend entry. Conversely, do not include legend items for colors not present in the diagram. Auto-generating the legend after building all nodes guarantees accuracy. Include `kind: "puck"` entries for any status indicator colors used.

13. **Group related nodes** — Use `group` nodes with `parentId`/`extent: "parent"` for visual grouping, or `linkGroupId` for move-together behavior.

14. **Edge labels** — Use short labels on edges (e.g., `"Yes"`, `"No"`, `"HTTPS"`, `"SQL"`). Label ALL branching edges from decisions.

15. **Icons enhance readability** — Add icons for common concepts: `Database`, `Server`, `Globe`, `Lock`, `User`, etc. Icons help readers identify node purpose at a glance.

16. **Spacing matters** — Well-spaced diagrams are more readable. Use 100-200px between nodes. Never crowd nodes together.

17. **Don't over-style** — Let the diagram style handle visual consistency. Only override colors/fonts when semantically meaningful.

### 15.3 Dark Mode Tips

18. **Set `darkMode: true` in styles** AND choose a dark-friendly style ID (`neonDark`, `darkNeonGlow`, `cyberC2`, `retroTerminal`, `midnightLuxe`, `auroraBorealis`, `neonGlass`, `solarizedDark`).

19. **Use saturated fill colors** — Pale/pastel fills look washed out on dark backgrounds. Use full-saturation colors (`#3b82f6` not `#dbeafe`).

20. **Make edges brighter** — Default gray (`#94a3b8`) edges are barely visible on dark backgrounds. Use `"color": "#cbd5e1"` or brighter.

21. **Edge labels need explicit `labelColor`** — Set `"labelColor": "#e2e8f0"` so labels are readable on the dark slide background.

22. **Light text on dark fills** — Ensure `textColor` is `"#ffffff"` or another light color when the node fill is dark.

### 15.4 Common Mistakes to Avoid

| Mistake | Consequence | Fix |
|---------|-------------|-----|
| No edges in diagram | Diagram looks like scattered boxes | Always generate edges for every relationship |
| Missing sourceHandle/targetHandle | Edges route through nodes, overlap | Always set handles explicitly |
| Default fontSize (14) on diamonds | Text overflows the diamond shape | Use `fontSize: 11` and keep labels to 1-2 words |
| Long labels without width override | Text truncated or overflows | Set `width` using formula: `(chars × 8) + 40` |
| Gray edges on dark background | Edges invisible | Use lighter edge colors (`#cbd5e1`) |
| Mixed shapes for same category | Inconsistent, confusing diagram | Pick one shape per node category |
| Overlapping nodes | Unreadable, messy | Calculate positions with bounding boxes; minimum 40px gap |
| No labels on decision branches | Reader can't follow the logic | Label every outgoing edge from a diamond |

---

## 16. Military COMREL (Command Relationships) Charts

COMREL charts visualize the command and support relationships between military units in a hierarchical structure. These follow doctrine from JP 1 (Joint Publication 1), FM 6-0, and standard military staff conventions.

### 16.1 Relationship Types & Visual Conventions

Each command/support relationship uses a distinct line style. **This is critical** — the line style IS the information.

| Relationship | Edge Type | strokeDasharray | Thickness | Color | Description |
|---|---|---|---|---|---|
| **COCOM** (Combatant Command) | `straight` | _(solid)_ | `3` | `#1e3a5f` | Full authority; cannot be delegated below CCDR |
| **Organic** | `straight` | _(solid)_ | `2` | `#000000` | Permanent assignment within the organization |
| **Assigned** | `straight` | _(solid)_ | `2` | `#1e3a5f` | Placed in an organization on a relatively permanent basis |
| **OPCON** (Operational Control) | `smoothstep` | `12 6` | `2` | `#1e3a5f` | Authority to organize/employ forces for missions |
| **TACON** (Tactical Control) | `smoothstep` | `4 4` | `2` | `#1e3a5f` | Limited to movement/maneuver direction |
| **ADCON** (Administrative Control) | `smoothstep` | `12 4 4 4` | `1.5` | `#6b7280` | Admin/logistics authority; stays in Service channels |
| **Attached** | `smoothstep` | `8 4` | `2` | `#374151` | Temporary placement in another organization |
| **Direct Support (DS)** | `smoothstep` | _(solid)_ | `2` | `#059669` | Support a specific unit; priorities set by supported unit |
| **General Support (GS)** | `smoothstep` | `8 4` | `2` | `#059669` | Support the force as a whole |

### 16.2 Node Conventions

- **All units use `rectangle` shape** — military org charts use rectangular unit symbols
- **Bold, abbreviated labels** — Use standard abbreviations: `"1st BDE"`, `"2/75 RGR"`, `"TF EAGLE"`, `"JSOC"`
- **Echelon in description** — Put echelon designator in description: `(CORPS)`, `(DIV)`, `(BDE)`, `(BN)`, `(CO)`, `(PLT)`
- **Color coding by component/service**:
  - Army: `#4b5320` (olive drab)
  - Navy/Marines: `#1e3a5f` (navy blue)
  - Air Force: `#4682b4` (steel blue)
  - Joint/Combined: `#6b21a8` (purple)
  - Allied/Coalition: `#059669` (green)
- **fontSize: 11-12** — military charts are dense; keep labels compact
- **width: 140-180** — uniform width for all unit nodes

### 16.3 Layout Rules

1. **Strict top-down hierarchy** — Commander/HQ at top center
2. **Echelons descend by row** — Each subordinate echelon 150-200px below
3. **Horizontal spread** — Units at the same echelon spread horizontally, 200-250px apart
4. **ADCON lines on the side** — ADCON relationships often run parallel to the hierarchy, offset to one side
5. **Support relationships below/beside** — Supporting units positioned near the units they support
6. **sourceHandle/targetHandle critical** — All command lines flow top-to-bottom: use `sourceHandle: "bottom"`, `targetHandle: "top"`. Lateral relationships use `"right"/"left"`.

### 16.4 Legend Requirements

A COMREL chart **MUST** include a legend explaining every line style:

```json
"nodeLegend": {
  "visible": true,
  "items": [
    { "label": "COCOM", "color": "#1e3a5f", "kind": "edge" },
    { "label": "OPCON", "color": "#1e3a5f", "kind": "edge", "borderStyle": "dashed" },
    { "label": "TACON", "color": "#1e3a5f", "kind": "edge", "borderStyle": "dotted" },
    { "label": "ADCON", "color": "#6b7280", "kind": "edge", "borderStyle": "dashed" },
    { "label": "Direct Support", "color": "#059669", "kind": "edge" },
    { "label": "General Support", "color": "#059669", "kind": "edge", "borderStyle": "dashed" }
  ]
}
```

### 16.5 Complete COMREL Chart Example

```json
{
  "nodes": [
    { "id": "jtf", "type": "rectangle", "position": { "x": 350, "y": 50 }, "data": { "label": "JTF THUNDER", "shape": "rectangle", "color": "#6b21a8", "width": 180, "height": 60, "fontSize": 13, "fontWeight": 700, "textColor": "#ffffff", "description": "Joint Task Force (JTF)" } },
    { "id": "army_div", "type": "rectangle", "position": { "x": 100, "y": 250 }, "data": { "label": "1st ARMORED DIV", "shape": "rectangle", "color": "#4b5320", "width": 170, "height": 55, "fontSize": 11, "fontWeight": 700, "textColor": "#ffffff", "description": "Division (DIV)" } },
    { "id": "mef", "type": "rectangle", "position": { "x": 350, "y": 250 }, "data": { "label": "II MEF", "shape": "rectangle", "color": "#1e3a5f", "width": 170, "height": 55, "fontSize": 11, "fontWeight": 700, "textColor": "#ffffff", "description": "Marine Expeditionary Force" } },
    { "id": "air_wing", "type": "rectangle", "position": { "x": 600, "y": 250 }, "data": { "label": "332nd AEW", "shape": "rectangle", "color": "#4682b4", "width": 170, "height": 55, "fontSize": 11, "fontWeight": 700, "textColor": "#ffffff", "description": "Air Expeditionary Wing" } },
    { "id": "bde1", "type": "rectangle", "position": { "x": 20, "y": 430 }, "data": { "label": "1st BDE", "shape": "rectangle", "color": "#4b5320", "width": 140, "height": 50, "fontSize": 11, "fontWeight": 600, "textColor": "#ffffff", "description": "Brigade (BDE)" } },
    { "id": "bde2", "type": "rectangle", "position": { "x": 190, "y": 430 }, "data": { "label": "2nd BDE", "shape": "rectangle", "color": "#4b5320", "width": 140, "height": 50, "fontSize": 11, "fontWeight": 600, "textColor": "#ffffff", "description": "Brigade (BDE)" } },
    { "id": "sof", "type": "rectangle", "position": { "x": 600, "y": 430 }, "data": { "label": "CJSOTF", "shape": "rectangle", "color": "#6b21a8", "width": 140, "height": 50, "fontSize": 11, "fontWeight": 600, "textColor": "#ffffff", "description": "Combined Joint SOF Task Force" } },
    { "id": "arfor", "type": "rectangle", "position": { "x": 810, "y": 120 }, "data": { "label": "ARFOR", "shape": "rectangle", "color": "#4b5320", "width": 130, "height": 50, "fontSize": 11, "fontWeight": 600, "textColor": "#ffffff", "description": "Army Forces (ADCON)" } }
  ],
  "edges": [
    { "id": "e_jtf_div", "source": "jtf", "target": "army_div", "sourceHandle": "bottom", "targetHandle": "top", "type": "straight", "data": { "label": "OPCON", "color": "#1e3a5f", "thickness": 2, "strokeDasharray": "12 6" } },
    { "id": "e_jtf_mef", "source": "jtf", "target": "mef", "sourceHandle": "bottom", "targetHandle": "top", "type": "straight", "data": { "label": "OPCON", "color": "#1e3a5f", "thickness": 2, "strokeDasharray": "12 6" } },
    { "id": "e_jtf_air", "source": "jtf", "target": "air_wing", "sourceHandle": "bottom", "targetHandle": "top", "type": "straight", "data": { "label": "TACON", "color": "#1e3a5f", "thickness": 2, "strokeDasharray": "4 4" } },
    { "id": "e_div_bde1", "source": "army_div", "target": "bde1", "sourceHandle": "bottom", "targetHandle": "top", "type": "straight", "data": { "color": "#000000", "thickness": 2 } },
    { "id": "e_div_bde2", "source": "army_div", "target": "bde2", "sourceHandle": "bottom", "targetHandle": "top", "type": "straight", "data": { "color": "#000000", "thickness": 2 } },
    { "id": "e_jtf_sof", "source": "jtf", "target": "sof", "sourceHandle": "bottom", "targetHandle": "top", "type": "smoothstep", "data": { "label": "TACON", "color": "#1e3a5f", "thickness": 2, "strokeDasharray": "4 4" } },
    { "id": "e_arfor_div", "source": "arfor", "target": "army_div", "sourceHandle": "left", "targetHandle": "right", "type": "smoothstep", "data": { "label": "ADCON", "color": "#6b7280", "thickness": 1.5, "strokeDasharray": "12 4 4 4" } }
  ],
  "styles": {
    "diagramStyle": "corporate",
    "colorPalette": "default"
  },
  "nodeLegend": {
    "visible": true,
    "items": [
      { "label": "Organic (Cmd)", "color": "#000000", "kind": "edge" },
      { "label": "OPCON", "color": "#1e3a5f", "kind": "edge", "borderStyle": "dashed" },
      { "label": "TACON", "color": "#1e3a5f", "kind": "edge", "borderStyle": "dotted" },
      { "label": "ADCON", "color": "#6b7280", "kind": "edge", "borderStyle": "dashed" },
      { "label": "Army", "color": "#4b5320", "kind": "fill" },
      { "label": "Navy/USMC", "color": "#1e3a5f", "kind": "fill" },
      { "label": "Air Force", "color": "#4682b4", "kind": "fill" },
      { "label": "Joint", "color": "#6b21a8", "kind": "fill" }
    ]
  }
}
```

### 16.6 Tips for Generating COMREL Charts

1. **Ask what echelon** — Is this a JTF-level chart? Division? Corps? This determines scope.
2. **Identify the relationships explicitly** — Don't guess. If the user says "1st BDE is OPCON to 3rd ID", that's dashed navy.
3. **ADCON always runs separately** — It's an administrative channel, not a command one. Show it as a side connection with gray dash-dot lines.
4. **Support relationships are directional** — "DS to 1st BDE" means the supporting unit answers to 1st BDE's requests. Use a labeled edge.
5. **Keep it clean** — COMREL charts can get complex. Use spacing generously (250px horizontal, 180px vertical) and keep labels short.
