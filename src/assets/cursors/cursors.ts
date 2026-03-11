// ---------------------------------------------------------------------------
// cursors.ts — Single source of truth for all custom cursor definitions.
//
// Every component that needs a custom cursor imports from HERE.
// CSS custom properties (--cursor-*) are defined in app.css alongside these
// values — when changing sizes/hotspots, update BOTH this file and app.css.
// ---------------------------------------------------------------------------

import imgDefault from './cursor_default.png';
import imgSelect from './cursor_select.png';
import imgDrag from './cursor_drag.png';
import imgCrosshair from './cursor_crosshair.png';
import imgElbowMove from './cursor_elbow_move.png';
import imgOpenHand from './open_hand.png';
import imgMove from './move_main.png';
import imgResizeWidth from './resize_width.png';
import imgResizeHeight from './resize_height.png';
import imgResizeCornerNWSE from './resize_corner_nw_se.png';
import imgResizeCornerNESW from './resize_corner_sw_ne.png';

// -- Ready-to-use CSS cursor value strings --------------------------------

/** Blue arrow — default canvas cursor (selection mode). */
export const CURSOR_DEFAULT = `url(${imgDefault}) 3 1, default`;

/** Blue pointing hand — hover over selectable items (nodes, edges, pucks). */
export const CURSOR_SELECT = `url(${imgSelect}) 7 2, pointer`;

/** Grab hand — panning the canvas (Ctrl+drag / middle-click). */
export const CURSOR_DRAG = `url(${imgDrag}) 10 10, grab`;

/** Grab hand (active) — actively dragging / panning. */
export const CURSOR_DRAG_ACTIVE = `url(${imgDrag}) 10 10, grabbing`;

/** Crosshair — creating connections from node handles. */
export const CURSOR_CROSSHAIR = `url(${imgCrosshair}) 14 14, crosshair`;

/** Open hand — hover over draggable elements (nodes, palette items). */
export const CURSOR_OPEN_HAND = `url(${imgOpenHand}) 10 10, grab`;

/** Elbow-move — drag-to-cycle connector type on edge midpoint (32×32). */
export const CURSOR_ELBOW_MOVE = `url(${imgElbowMove}) 16 16, grab`;

/** Move — dragging/moving containers (swimlane corner handle, etc.). */
export const CURSOR_MOVE = `url(${imgMove}) 14 14, move`;

/** Resize width — horizontal/side-edge resize handles. */
export const CURSOR_RESIZE_WIDTH = `url(${imgResizeWidth}) 12 12, ew-resize`;

/** Resize height — vertical/top-bottom-edge resize handles. */
export const CURSOR_RESIZE_HEIGHT = `url(${imgResizeHeight}) 12 12, ns-resize`;

/** Resize corner — diagonal NW↔SE (top-left / bottom-right). */
export const CURSOR_RESIZE_CORNER = `url(${imgResizeCornerNWSE}) 10 10, nwse-resize`;

/** Resize corner — diagonal NE↔SW (top-right / bottom-left). */
export const CURSOR_RESIZE_CORNER_NESW = `url(${imgResizeCornerNESW}) 10 10, nesw-resize`;

// -- Inject CSS custom properties for use in app.css overrides ---------------
// Vite resolves the PNG imports at build time, so we set them on :root here.
if (typeof document !== 'undefined') {
  const root = document.documentElement;
  root.style.setProperty('--cursor-resize-width', CURSOR_RESIZE_WIDTH);
  root.style.setProperty('--cursor-resize-height', CURSOR_RESIZE_HEIGHT);
  root.style.setProperty('--cursor-resize-corner', CURSOR_RESIZE_CORNER);
}
