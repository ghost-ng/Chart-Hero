import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import { icons } from 'lucide-react';
import { useFlowStore, type FlowNodeData, type StatusIndicator, getStatusIndicators } from '../../store/flowStore';
import { useUIStore } from '../../store/uiStore';
import { useSettingsStore } from '../../store/settingsStore';
import { DependencyBadge } from '../Dependencies';
import { ensureReadableText } from '../../utils/colorUtils';
import chroma from 'chroma-js';
import { resolveNodeStyle } from '../../utils/themeResolver';
import { useStyleStore } from '../../store/styleStore';
import { diagramStyles } from '../../styles/diagramStyles';
import {
  CURSOR_SELECT,
  CURSOR_RESIZE_WIDTH,
  CURSOR_RESIZE_HEIGHT,
  CURSOR_RESIZE_CORNER,
} from '../../assets/cursors/cursors';
import { ColorSwatchSidebar } from '../ContextMenu/menuUtils';
import { resolveActivePalette } from '../../styles/palettes';

// ---------------------------------------------------------------------------
// Shape SVG paths (clip-path / outline)
// ---------------------------------------------------------------------------

const ARROW_SHAPES = new Set(['blockArrow', 'chevronArrow', 'doubleArrow', 'circularArrow']);

// ---------------------------------------------------------------------------
// Inline SVG renderers for arrow shapes (all pointing right, viewBox 0 0 160 80)
// ---------------------------------------------------------------------------

interface ArrowSvgProps {
  fill: string;
  stroke: string;
  strokeW: number;
}

const ArrowSvgs: Record<string, React.FC<ArrowSvgProps>> = {
  blockArrow: ({ fill, stroke, strokeW }) => (
    <path
      d="M 0 20 L 100 20 L 100 5 L 155 40 L 100 75 L 100 60 L 0 60 Z"
      fill={fill} stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round"
    />
  ),
  chevronArrow: ({ fill, stroke, strokeW }) => (
    <path
      d="M 0 5 L 115 5 L 155 40 L 115 75 L 0 75 L 40 40 Z"
      fill={fill} stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round"
    />
  ),
  doubleArrow: ({ fill, stroke, strokeW }) => (
    <path
      d="M 40 5 L 0 40 L 40 75 L 40 55 L 120 55 L 120 75 L 160 40 L 120 5 L 120 25 L 40 25 Z"
      fill={fill} stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round"
    />
  ),
  circularArrow: ({ fill, stroke, strokeW }) => (
    <>
      {/* Circular arc (~300° around center 50,50, radius 34) */}
      <path
        d="M 72 22 A 34 34 0 1 1 34 26"
        fill="none" stroke={fill} strokeWidth={8} strokeLinecap="round"
      />
      {/* Arrowhead at the gap */}
      <polygon
        points="18,10 44,28 18,34"
        fill={fill} stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round"
      />
    </>
  ),
};

// ---------------------------------------------------------------------------
// Inline SVG renderers for non-rectangular shapes (viewBox 0 0 160 80)
// ---------------------------------------------------------------------------

const SVG_SHAPES = new Set(['parallelogram', 'cloud', 'hexagon', 'document', 'stickyNote']);

interface ShapeSvgProps {
  fill: string;
  stroke: string;
  strokeW: number;
}

const ShapeSvgs: Record<string, React.FC<ShapeSvgProps>> = {
  parallelogram: ({ fill, stroke, strokeW }) => (
    <polygon points="25,0 160,0 135,80 0,80" fill={fill} stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" />
  ),
  cloud: ({ fill, stroke, strokeW }) => (
    <path
      d="M 30 60 C 5 60 0 45 10 35 C 0 20 15 5 35 10 C 40 -5 65 -5 75 10 C 85 0 110 0 115 15 C 135 10 155 20 145 40 C 160 50 150 65 130 60 Z"
      fill={fill} stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round"
      transform="translate(0, 5) scale(1, 0.95)"
    />
  ),
  hexagon: ({ fill, stroke, strokeW }) => (
    <polygon points="25,0 135,0 160,40 135,80 25,80 0,40" fill={fill} stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" />
  ),
  document: ({ fill, stroke, strokeW }) => (
    <path
      d="M 0 0 L 160 0 L 160 65 Q 120 55 80 65 Q 40 75 0 65 Z"
      fill={fill} stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round"
    />
  ),
  stickyNote: ({ fill, stroke, strokeW }) => (
    <>
      {/* Main body with clipped top-right corner */}
      <path
        d="M 0,0 L 145,0 L 160,15 L 160,80 L 0,80 Z"
        fill={fill} stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round"
      />
      {/* Folded corner triangle (slightly darker) */}
      <path
        d="M 145,0 L 145,15 L 160,15 Z"
        fill={stroke} opacity={0.25}
        stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round"
      />
    </>
  ),
};

const shapeStyles: Record<string, React.CSSProperties> = {
  rectangle: { borderRadius: 4 },
  roundedRectangle: { borderRadius: 12 },
  // diamond is rendered via SVG (like hexagon/parallelogram) — no CSS entry needed
  circle: { borderRadius: '50%' },
  parallelogram: { borderRadius: 4 },
  hexagon: { borderRadius: 4 },
  document: { borderRadius: 4 },
  cloud: { borderRadius: 24 },
  stickyNote: { borderRadius: 2 },
  textbox: { borderRadius: 2 },
};


// ---------------------------------------------------------------------------
// StatusBadge – renders a small status indicator circle on a node corner
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  'not-started': '#94a3b8',
  'in-progress': '#3b82f6',
  'completed': '#10b981',
  'blocked': '#ef4444',
  'review': '#f59e0b',
};

interface StatusBadgeProps {
  statusIndicator?: StatusIndicator;
  nodeId?: string;
  puckId: string;
  shape?: string;
  onUpdatePosition?: (position: string) => void;
}

const CLICK_THRESHOLD = 4; // px – movement below this is treated as a click, not a drag

// ---------------------------------------------------------------------------
// Puck edge-snap positions for non-rectangular shapes.
// Returns { left%, top% } for the puck center at each corner of the given shape.
// Shapes not listed here use standard rectangular corner positioning.
// ---------------------------------------------------------------------------

type PuckCorner = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
type EdgePositions = Record<PuckCorner, { left: number; top: number }>;

const SHAPE_PUCK_POSITIONS: Record<string, EdgePositions> = {
  // Diamond: midpoints of each edge (viewBox 100x100, vertices at top/right/bottom/left)
  diamond: {
    'top-right':    { left: 75, top: 25 },
    'top-left':     { left: 25, top: 25 },
    'bottom-right': { left: 75, top: 75 },
    'bottom-left':  { left: 25, top: 75 },
  },
  // Circle/ellipse: 45° from center → 50% ± 35.35% ≈ 85%/15%
  circle: {
    'top-right':    { left: 85, top: 15 },
    'top-left':     { left: 15, top: 15 },
    'bottom-right': { left: 85, top: 85 },
    'bottom-left':  { left: 15, top: 85 },
  },
  // Parallelogram: polygon 25,0 160,0 135,80 0,80 (viewBox 160x80)
  // Pucks near each corner, slightly inward from vertices
  parallelogram: {
    'top-right':    { left: 97, top: 3 },
    'top-left':     { left: 18, top: 3 },
    'bottom-right': { left: 82, top: 97 },
    'bottom-left':  { left: 3,  top: 97 },
  },
  // Hexagon: polygon 25,0 135,0 160,40 135,80 25,80 0,40 (viewBox 160x80)
  // Midpoints of the angled edges
  hexagon: {
    'top-right':    { left: 92, top: 25 },
    'top-left':     { left: 8,  top: 25 },
    'bottom-right': { left: 92, top: 75 },
    'bottom-left':  { left: 8,  top: 75 },
  },
  // Cloud: organic shape, approximate boundary
  cloud: {
    'top-right':    { left: 85, top: 18 },
    'top-left':     { left: 15, top: 18 },
    'bottom-right': { left: 85, top: 78 },
    'bottom-left':  { left: 15, top: 78 },
  },
  // Document: rectangular top, wavy bottom ~81% height
  document: {
    'top-right':    { left: 97, top: 3 },
    'top-left':     { left: 3,  top: 3 },
    'bottom-right': { left: 97, top: 78 },
    'bottom-left':  { left: 3,  top: 78 },
  },
  // Sticky note: folded top-right corner (145,0→160,15 in viewBox 160x80)
  stickyNote: {
    'top-right':    { left: 93, top: 8 },
    'top-left':     { left: 3,  top: 3 },
    'bottom-right': { left: 97, top: 97 },
    'bottom-left':  { left: 3,  top: 97 },
  },
  // Block arrow: body from x:0-100, shaft y:20-60, tip at x:155
  blockArrow: {
    'top-right':    { left: 90, top: 10 },
    'top-left':     { left: 5,  top: 28 },
    'bottom-right': { left: 90, top: 90 },
    'bottom-left':  { left: 5,  top: 72 },
  },
  // Chevron arrow: notch at left x:0-40, point at right x:155
  chevronArrow: {
    'top-right':    { left: 90, top: 12 },
    'top-left':     { left: 5,  top: 10 },
    'bottom-right': { left: 90, top: 88 },
    'bottom-left':  { left: 5,  top: 90 },
  },
  // Double arrow: points on both sides at x:0 and x:160
  doubleArrow: {
    'top-right':    { left: 90, top: 12 },
    'top-left':     { left: 10, top: 12 },
    'bottom-right': { left: 90, top: 88 },
    'bottom-left':  { left: 10, top: 88 },
  },
  // Circular arrow: circular shape centered ~50,50 in 100x100 viewBox
  circularArrow: {
    'top-right':    { left: 85, top: 15 },
    'top-left':     { left: 15, top: 15 },
    'bottom-right': { left: 85, top: 85 },
    'bottom-left':  { left: 15, top: 85 },
  },
};
// Alias: ellipse uses the same positions as circle
SHAPE_PUCK_POSITIONS.ellipse = SHAPE_PUCK_POSITIONS.circle;

/** Compute the CSS position for a puck on a given shape and corner.
 *  Returns { style } with left/top in CSS calc() for percentage-based shapes,
 *  or right/bottom for standard rectangular corners. */
function computePuckPosition(
  shape: string,
  position: PuckCorner,
  halfSize: number,
  sideOffset: number,
  isRight: boolean,
): React.CSSProperties {
  const edgePositions = SHAPE_PUCK_POSITIONS[shape];
  if (edgePositions) {
    const { left, top } = edgePositions[position];
    const edgeSpread = sideOffset * 0.5;
    // Spread direction: right corners spread left-and-down, left corners spread right-and-down
    const spreadX = isRight ? edgeSpread : -edgeSpread;
    const spreadY = (position === 'top-right' || position === 'top-left') ? -edgeSpread : edgeSpread;
    return {
      left: `calc(${left}% - ${halfSize}px + ${spreadX}px)`,
      top: `calc(${top}% - ${halfSize}px + ${spreadY}px)`,
    };
  }
  // Standard rectangular positioning
  const offset = -halfSize;
  const style: React.CSSProperties = {};
  if (isRight) {
    style.right = offset + sideOffset;
  } else {
    style.left = offset + sideOffset;
  }
  if (position === 'top-right' || position === 'top-left') {
    style.top = offset;
  } else {
    style.bottom = offset;
  }
  return style;
}

export const StatusBadge: React.FC<StatusBadgeProps & { nodeId: string; puckId: string; indexInGroup: number; onUpdatePosition?: (position: string) => void; onUpdateSize?: (size: number) => void }> = ({ statusIndicator, nodeId, puckId, shape, indexInGroup, onUpdatePosition, onUpdateSize }) => {
  const isSelected = useUIStore((s) => s.selectedPuckIds.includes(puckId));
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const puckMenuRef = useRef<HTMLDivElement>(null);
  const selectionColor = useUIStore((s) => s.selectionColor);
  const presentationMode = useUIStore((s) => s.presentationMode);
  const darkMode = useStyleStore((s) => s.darkMode);
  const activePaletteId = useStyleStore((s) => s.activePaletteId);
  const activeStyleId = useStyleStore((s) => s.activeStyleId);
  const puckQuickColors = resolveActivePalette(activePaletteId, activeStyleId).colors ?? ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899','#6b7280','#0ea5e9','#10b981'];

  if (!statusIndicator || statusIndicator.status === 'none') return null;

  const { status, color, size: badgeSize, position = 'top-right' } = statusIndicator;
  const size = badgeSize ?? 12;
  const bgColor = color || STATUS_COLORS[status] || '#94a3b8';

  // Border customisation
  const bColor = statusIndicator.borderColor ?? '#000000';
  const bWidth = statusIndicator.borderWidth ?? 1;
  const bStyle = statusIndicator.borderStyle ?? 'solid';
  const borderStr = bStyle === 'none' ? 'none' : `${bWidth}px ${bStyle} ${bColor}`;

  // Side-by-side offset when multiple pucks share the same corner.
  // Right corners spread leftward; left corners spread rightward.
  const spacing = size + bWidth * 2 + 2; // puck diameter + border + 2px gap
  const sideOffset = indexInGroup * spacing;
  const isRight = position === 'top-right' || position === 'bottom-right';

  // Helper: compute which corner the cursor is closest to
  const getSnapCorner = (clientX: number, clientY: number, rect: DOMRect) => {
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;
    const midX = rect.width / 2;
    const midY = rect.height / 2;
    if (relX < midX && relY < midY) return 'top-left';
    if (relX >= midX && relY < midY) return 'top-right';
    if (relX < midX && relY >= midY) return 'bottom-left';
    return 'bottom-right';
  };

  // Normal drag → snap to corners; Shift+drag → resize; Click → select
  //
  // NOTE: We never move the real badge element — position: fixed is broken
  // inside React Flow's CSS-transformed container. Instead we hide the badge
  // and create overlay elements on document.body for the drag preview + ghost.
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (presentationMode) return; // no puck interaction in presentation mode
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const isResize = e.ctrlKey || e.metaKey; // Ctrl+drag to resize
    const isMultiSelect = e.shiftKey;         // Shift+click to add to selection
    const startSize = size;
    const badge = e.currentTarget as HTMLElement;
    const nodeEl = badge.parentElement;
    if (!nodeEl) return;

    let didDrag = false;
    let ghost: HTMLElement | null = null;     // snap-target indicator
    let dragPreview: HTMLElement | null = null; // follows cursor

    // Position a fixed element at a node corner (using fresh rect)
    const positionAtCorner = (el: HTMLElement, corner: string) => {
      const rect = nodeEl.getBoundingClientRect();
      const half = size / 2;
      let x: number, y: number;
      if (corner === 'top-left')      { x = rect.left - half; y = rect.top - half; }
      else if (corner === 'top-right') { x = rect.right - half; y = rect.top - half; }
      else if (corner === 'bottom-left') { x = rect.left - half; y = rect.bottom - half; }
      else                              { x = rect.right - half; y = rect.bottom - half; }
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    };

    // Create the drag preview (solid, follows cursor) on document.body
    const startDrag = () => {
      dragPreview = document.createElement('div');
      dragPreview.style.cssText = `
        position: fixed; width: ${size}px; height: ${size}px; border-radius: 50%;
        background: ${bgColor}; border: ${bWidth}px ${bStyle} ${bColor};
        pointer-events: none; z-index: 100000; cursor: grabbing;
        box-sizing: content-box;
      `;
      document.body.appendChild(dragPreview);

      ghost = document.createElement('div');
      ghost.style.cssText = `
        position: fixed; width: ${size}px; height: ${size}px; border-radius: 50%;
        background: ${bgColor}; opacity: 0.35; border: 2px dashed ${useUIStore.getState().selectionColor};
        pointer-events: none; z-index: 99999; transition: top 0.08s, left 0.08s;
      `;
      document.body.appendChild(ghost);

      badge.style.opacity = '0'; // hide original
    };

    const handleMove = (moveE: PointerEvent) => {
      moveE.preventDefault();
      const dx = moveE.clientX - startX;
      const dy = moveE.clientY - startY;

      if (!didDrag && Math.sqrt(dx * dx + dy * dy) >= CLICK_THRESHOLD) {
        didDrag = true;
        if (!isResize) startDrag();
      }

      if (isResize && onUpdateSize) {
        const delta = Math.abs(dx) > Math.abs(dy) ? dx : -dy;
        const newSize = Math.round(Math.max(6, Math.min(40, startSize + delta)));
        onUpdateSize(newSize);
      } else if (didDrag && dragPreview && ghost) {
        // Move drag preview to follow cursor
        dragPreview.style.left = `${moveE.clientX - size / 2}px`;
        dragPreview.style.top = `${moveE.clientY - size / 2}px`;
        // Show ghost at the snap-target corner (fresh rect each time)
        const rect = nodeEl.getBoundingClientRect();
        const corner = getSnapCorner(moveE.clientX, moveE.clientY, rect);
        positionAtCorner(ghost, corner);
      }
    };

    const handleUp = (upE: PointerEvent) => {
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);

      // Clean up overlays
      if (dragPreview) { dragPreview.remove(); dragPreview = null; }
      if (ghost) { ghost.remove(); ghost = null; }
      badge.style.opacity = ''; // restore original

      // Click (no drag) → select puck, keep parent node selected
      if (!didDrag && !isResize) {
        if (isMultiSelect) {
          useUIStore.getState().togglePuckSelection(puckId, nodeId);
        } else {
          useUIStore.getState().selectPuck(puckId, nodeId);
        }
        // Keep the parent node selected so NodePropsTab stays visible;
        // deselect other nodes and all edges.
        const { setSelectedNodes, setSelectedEdges, selectedEdges } = useFlowStore.getState();
        // Update React Flow node selection — mark only parent as selected
        useFlowStore.setState((draft: any) => {
          for (const n of draft.nodes) {
            n.selected = n.id === nodeId;
          }
        });
        setSelectedNodes([nodeId]);
        if (selectedEdges.length > 0) setSelectedEdges([]);
        return;
      }

      if (isResize) return;

      // Temporarily hide badge hit zone so elementFromPoint hits the node underneath
      badge.style.pointerEvents = 'none';
      badge.style.display = 'none';
      const dropTarget = document.elementFromPoint(upE.clientX, upE.clientY);
      badge.style.display = '';
      badge.style.pointerEvents = '';
      const targetNodeEl = dropTarget?.closest('.react-flow__node') as HTMLElement | null;
      const targetNodeId = targetNodeEl?.dataset?.id ?? targetNodeEl?.getAttribute('data-id');

      if (targetNodeId && targetNodeId !== nodeId) {
        // Move puck to the target node
        const store = useFlowStore.getState();
        const srcNode = store.nodes.find(n => n.id === nodeId);
        if (srcNode) {
          const puck = getStatusIndicators(srcNode.data as FlowNodeData).find(p => p.id === puckId);
          if (puck) {
            // Determine corner on target node
            const tgtRect = targetNodeEl!.getBoundingClientRect();
            const newPos = getSnapCorner(upE.clientX, upE.clientY, tgtRect);
            store.removeStatusPuck(nodeId, puckId);
            store.addStatusPuck(targetNodeId, { ...puck, position: newPos });
          }
        }
        return;
      }

      // Snap to the closest corner on the same node
      const freshRect = nodeEl.getBoundingClientRect();
      const newPosition = getSnapCorner(upE.clientX, upE.clientY, freshRect);
      if (onUpdatePosition) {
        onUpdatePosition(newPosition);
      }
    };

    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
  }, [position, onUpdatePosition, onUpdateSize, size, bgColor, bColor, bWidth, bStyle, puckId, nodeId, presentationMode]);

  // Right-click → open "Select All" context menu (disabled in presentation mode)
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (presentationMode) return;
    setCtxMenu({ x: e.clientX, y: e.clientY });
  }, [presentationMode]);

  // Select-all helpers — gather puck IDs from flowStore that match criteria
  const selectAllOnNode = useCallback(() => {
    const node = useFlowStore.getState().nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const pucks = getStatusIndicators(node.data as FlowNodeData);
    useUIStore.getState().selectPucks(pucks.map((p) => p.id!).filter(Boolean), nodeId);
    setCtxMenu(null);
  }, [nodeId]);

  const selectAllByColor = useCallback(() => {
    const allNodes = useFlowStore.getState().nodes;
    const ids: string[] = [];
    for (const n of allNodes) {
      for (const p of getStatusIndicators(n.data as FlowNodeData)) {
        if ((p.color || '#94a3b8') === bgColor && p.id) ids.push(p.id);
      }
    }
    useUIStore.getState().selectPucks(ids, null);
    setCtxMenu(null);
  }, [bgColor]);

  const selectAllByBorder = useCallback(() => {
    const allNodes = useFlowStore.getState().nodes;
    const ids: string[] = [];
    for (const n of allNodes) {
      for (const p of getStatusIndicators(n.data as FlowNodeData)) {
        const pBColor = p.borderColor ?? '#000000';
        const pBWidth = p.borderWidth ?? 1;
        const pBStyle = p.borderStyle ?? 'solid';
        if (pBColor === bColor && pBWidth === bWidth && pBStyle === bStyle && p.id) ids.push(p.id);
      }
    }
    useUIStore.getState().selectPucks(ids, null);
    setCtxMenu(null);
  }, [bColor, bWidth, bStyle]);

  const selectAllGlobal = useCallback(() => {
    const allNodes = useFlowStore.getState().nodes;
    const ids: string[] = [];
    for (const n of allNodes) {
      for (const p of getStatusIndicators(n.data as FlowNodeData)) {
        if (p.id) ids.push(p.id);
      }
    }
    useUIStore.getState().selectPucks(ids, null);
    setCtxMenu(null);
  }, []);

  // Selection ring via box-shadow
  const selectionShadow = isSelected ? `0 0 0 2px ${selectionColor}` : undefined;

  // Minimum 24×24 invisible hit zone for easier clicking
  const hitSize = Math.max(24, size + bWidth * 2);
  // Hit zone uses the same shape edge-snap positioning as the visual puck
  const hitPositionStyle = computePuckPosition(shape ?? '', position as PuckCorner, hitSize / 2, sideOffset, isRight);

  return (
    /* Invisible hit zone – larger clickable area centred on the same corner
       as the puck.  z-index 50 keeps it above React Flow interaction layers. */
    <div
      className="nodrag nopan"
      onPointerDown={handlePointerDown}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={handleContextMenu}
      style={{
        position: 'absolute',
        ...hitPositionStyle,
        width: hitSize,
        height: hitSize,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: CURSOR_SELECT,
        borderRadius: '50%',
      }}
    >
      {/* Visible puck circle */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: bgColor,
          border: borderStr,
          boxSizing: 'content-box',
          boxShadow: selectionShadow,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        {/* Only render icon if explicitly set (not default blank pucks) */}
        {statusIndicator.icon && statusIndicator.icon !== '' && statusIndicator.icon !== 'blank' && (() => {
          const CustomIcon = (icons as Record<string, React.ComponentType<{ size?: number; className?: string }>>)[statusIndicator.icon];
          return CustomIcon ? <CustomIcon size={Math.round(size * 0.6)} className="text-white block" /> : null;
        })()}
      </div>

      {/* Right-click "Select All" context menu — portaled to document.body
           because position:fixed is broken inside React Flow's CSS-transformed container */}
      {ctxMenu && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setCtxMenu(null)} onContextMenu={(e) => { e.preventDefault(); setCtxMenu(null); }} />
          <div
            ref={puckMenuRef}
            className="fixed z-[9999] min-w-[180px] rounded-lg shadow-xl border bg-white dark:bg-dk-panel border-slate-200 dark:border-dk-border p-1 text-xs"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
          >
            <div className="px-2.5 py-0.5 text-[9px] font-semibold text-slate-400 dark:text-dk-faint uppercase tracking-wide">Select All Pucks</div>
            <button
              onClick={selectAllOnNode}
              className="flex items-center gap-2 w-full px-2.5 py-1 text-left text-xs rounded hover:bg-slate-100 dark:hover:bg-dk-hover text-slate-700 dark:text-dk-text cursor-pointer transition-colors duration-75"
            >
              <span className="shrink-0 w-3 h-3 rounded-full border border-slate-300" style={{ backgroundColor: bgColor }} />
              On this node
            </button>
            <button
              onClick={selectAllByColor}
              className="flex items-center gap-2 w-full px-2.5 py-1 text-left text-xs rounded hover:bg-slate-100 dark:hover:bg-dk-hover text-slate-700 dark:text-dk-text cursor-pointer transition-colors duration-75"
            >
              <span className="shrink-0 w-3 h-3 rounded-full" style={{ backgroundColor: bgColor }} />
              Same color
            </button>
            <button
              onClick={selectAllByBorder}
              className="flex items-center gap-2 w-full px-2.5 py-1 text-left text-xs rounded hover:bg-slate-100 dark:hover:bg-dk-hover text-slate-700 dark:text-dk-text cursor-pointer transition-colors duration-75"
            >
              <span className="shrink-0 w-3 h-3 rounded-full" style={{ backgroundColor: 'transparent', border: borderStr }} />
              Same outline
            </button>
            <div className="my-1 h-px bg-slate-200 dark:bg-dk-border" />
            <button
              onClick={selectAllGlobal}
              className="flex items-center gap-2 w-full px-2.5 py-1 text-left text-xs rounded hover:bg-slate-100 dark:hover:bg-dk-hover text-slate-700 dark:text-dk-text cursor-pointer transition-colors duration-75"
            >
              All pucks (global)
            </button>
            <div className="my-1 h-px bg-slate-200 dark:bg-dk-border" />
            <button
              onClick={() => {
                useFlowStore.getState().removeStatusPuck(nodeId, puckId);
                useUIStore.getState().clearPuckSelection();
                setCtxMenu(null);
              }}
              className="flex items-center gap-2 w-full px-2.5 py-1 text-left text-xs rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 cursor-pointer transition-colors duration-75"
            >
              Delete Puck
            </button>
          </div>
          <ColorSwatchSidebar
            darkMode={darkMode}
            menuRef={puckMenuRef}
            colors={puckQuickColors}
            onSelectColor={(c) => {
              useFlowStore.getState().updateStatusPuck(nodeId, puckId, { color: c });
            }}
          />
        </>,
        document.body,
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const MIN_NODE_WIDTH = 40;
const MIN_NODE_HEIGHT = 30;

const GenericShapeNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const nodeData = data as FlowNodeData;
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const updateNodePosition = useFlowStore((s) => s.updateNodePosition);
  const reactFlowInstance = useReactFlow();
  const activeStyleId = useStyleStore((s) => s.activeStyleId);
  const activeStyle = activeStyleId ? diagramStyles[activeStyleId] ?? null : null;
  const isEditingNode = useUIStore((s) => s.isEditingNode);
  const setIsEditingNode = useUIStore((s) => s.setIsEditingNode);
  const selectionColor = useUIStore((s) => s.selectionColor);
  const selectionThickness = useUIStore((s) => s.selectionThickness);
  const linkGroupEditorId = useUIStore((s) => s.linkGroupEditorId);
  const presentationMode = useUIStore((s) => s.presentationMode);
  const defaultFontFamily = useSettingsStore((s) => s.nodeDefaults.fontFamily);

  // Suppress selection visuals in presentation mode
  const isSelected = selected && !presentationMode;

  const isEditing = isEditingNode === id;
  const iconPosition = nodeData.iconPosition || 'left';
  const [editValue, setEditValue] = useState(nodeData.label);
  const [autoFitFontSize, setAutoFitFontSize] = useState<number | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const resizeStartRef = useRef<{ width: number; height: number; borderWidth: number; pucks: { id: string; size: number; borderWidth: number }[] } | null>(null);

  const shape = nodeData.shape || 'rectangle';
  const isIconOnly = !!nodeData.iconOnly;
  const labelPosition = (nodeData.labelPosition as 'above' | 'below' | 'overlay' | undefined) || 'overlay';
  const isExternalLabel = labelPosition === 'above' || labelPosition === 'below';

  // Resolve styling via the theme resolver
  const resolved = resolveNodeStyle(nodeData as unknown as Record<string, unknown>, shape, activeStyle);
  const rawFillColor = isIconOnly ? 'transparent' : resolved.fill;
  const fillOpacity = nodeData.fillOpacity ?? 1;
  // Apply fillOpacity as alpha channel on the fill color
  const fillColor = (!isIconOnly && rawFillColor && rawFillColor !== 'transparent' && rawFillColor !== 'none' && fillOpacity < 1)
    ? (() => { try { return chroma(rawFillColor).alpha(fillOpacity).css(); } catch { return rawFillColor; } })()
    : rawFillColor;
  const borderColor = isIconOnly ? 'transparent' : resolved.borderColor;
  const isTransparentFill = !fillColor || fillColor === 'transparent' || fillColor === 'none';
  // For transparent fills (textbox, free-floating labels), check text readability
  // against the canvas background instead of the (non-existent) fill colour.
  let canvasBg = activeStyle?.canvas.background || '#ffffff';
  if (canvasBg.includes('gradient') || canvasBg.includes('url(')) {
    canvasBg = activeStyle?.dark ? '#1a1a1a' : '#ffffff';
  }
  const textColor = isIconOnly
    ? (nodeData.textColor || '#475569')
    : (!isTransparentFill ? ensureReadableText(fillColor, resolved.textColor) : ensureReadableText(canvasBg, resolved.textColor));
  const fontSize = resolved.fontSize;

  // Focus the input when editing starts and auto-size
  useEffect(() => {
    if (isEditing && inputRef.current) {
      const ta = inputRef.current;
      ta.focus();
      ta.select();
      // Auto-size to fit existing content
      ta.style.height = 'auto';
      ta.style.height = `${ta.scrollHeight}px`;
    }
  }, [isEditing]);

  // Sync edit value when data changes externally
  useEffect(() => {
    if (!isEditing) {
      setEditValue(nodeData.label);
    }
  }, [nodeData.label, isEditing]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsEditingNode(id);
    },
    [id, setIsEditingNode],
  );

  const commitEdit = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed !== nodeData.label) {
      updateNodeData(id, { label: trimmed });
    }
    setIsEditingNode(null);
  }, [editValue, nodeData.label, id, updateNodeData, setIsEditingNode]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && e.shiftKey) {
        // Shift+Enter inserts a newline (textarea handles this natively)
        return;
      }
      if (e.key === 'Enter') {
        commitEdit();
      } else if (e.key === 'Escape') {
        setEditValue(nodeData.label);
        setIsEditingNode(null);
      }
    },
    [commitEdit, nodeData.label, setIsEditingNode],
  );

  // ---------------------------------------------------------------------------
  // Rotation handle – drag to rotate the node around its center
  // ---------------------------------------------------------------------------
  const handleRotateStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setIsRotating(true);

      // Determine node center in screen coordinates by using the wrapper element
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const startAngle = nodeData.rotation || 0;

      // Calculate the initial angle from center to mouse position
      const initAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);

      const onMouseMove = (ev: MouseEvent) => {
        const currentAngle = Math.atan2(ev.clientY - centerY, ev.clientX - centerX) * (180 / Math.PI);
        let delta = currentAngle - initAngle;
        let newRotation = startAngle + delta;

        // Normalise to 0–360
        newRotation = ((newRotation % 360) + 360) % 360;

        // Snap to 15-degree increments when Shift is held
        if (ev.shiftKey) {
          newRotation = Math.round(newRotation / 15) * 15;
        }

        updateNodeData(id, { rotation: newRotation });
      };

      const onMouseUp = () => {
        setIsRotating(false);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [id, nodeData.rotation, updateNodeData],
  );

  // Build wrapper styles based on shape
  const isArrowShape = ARROW_SHAPES.has(shape);
  const isSvgShape = SVG_SHAPES.has(shape);
  const isDiamond = shape === 'diamond';
  // Diamond uses SVG rendering (like hexagon/parallelogram) — treat it as noBox
  const isCircle = shape === 'circle';
  const isCircularArrow = shape === 'circularArrow';
  const defaultWidth = isArrowShape
    ? (isCircularArrow ? 100 : 160)
    : isCircle ? 100 : isDiamond ? 100 : 160;
  const defaultHeight = isArrowShape
    ? (isCircularArrow ? 100 : 80)
    : isCircle ? 100 : isDiamond ? 100 : 60;

  let width = nodeData.width || defaultWidth;
  let height = nodeData.height || defaultHeight;

  // Circles must stay square — use the larger dimension for both axes
  if (isCircle) {
    const side = Math.max(width, height);
    width = side;
    height = side;
  }

  // Scale font size proportionally with node dimensions
  // Use a blend of width and height ratios (weighted toward the larger ratio)
  // so font doesn't shrink too aggressively when one dimension is constrained
  const widthRatio = width / defaultWidth;
  const heightRatio = height / defaultHeight;
  const minR = Math.min(widthRatio, heightRatio);
  const maxR = Math.max(widthRatio, heightRatio);
  const sizeRatio = minR * 0.4 + maxR * 0.6;
  const proportionalFontSize = Math.max(8, Math.min(48, Math.round(fontSize * sizeRatio)));
  const scaledFontSize = autoFitFontSize ?? proportionalFontSize;

  // Auto-shrink font if text overflows the node
  useEffect(() => {
    if (isEditing || !labelRef.current) {
      setAutoFitFontSize(null);
      return;
    }
    const el = labelRef.current;
    let trySize = proportionalFontSize;
    const minSize = 8;
    // Reset to measure at the proportional size
    el.style.fontSize = `${trySize}px`;
    // Shrink until text fits or we hit minimum
    while (trySize > minSize && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)) {
      trySize -= 1;
      el.style.fontSize = `${trySize}px`;
    }
    if (trySize < proportionalFontSize) {
      setAutoFitFontSize(trySize);
    } else {
      setAutoFitFontSize(null);
    }
  }, [nodeData.label, width, height, proportionalFontSize, isEditing]);

  // For arrow / SVG / diamond / icon-only / freehand shapes, we use transparent background
  const isFreehand = shape === 'freehand';
  const noBox = isArrowShape || isSvgShape || isDiamond || isIconOnly || isFreehand;
  const opacity = nodeData.opacity ?? 1;
  const borderStyleProp = nodeData.borderStyle || 'solid';
  const borderW = nodeData.borderWidth ?? 2;
  const hasDashedBorder = borderStyleProp !== 'solid' && !noBox && borderColor !== 'transparent';
  // User-configurable corner radius (overrides shape defaults)
  const userBorderRadius = nodeData.borderRadius;

  // ---- Custom resize handler (replaces NodeResizer) ----
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, edges: ('left' | 'right' | 'top' | 'bottom')[]) => {
      e.stopPropagation();
      e.preventDefault();

      const node = reactFlowInstance.getNode(id);
      if (!node) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const startW = nodeData.width || width;
      const startH = nodeData.height || height;
      const startPos = { x: node.position.x, y: node.position.y };
      const zoom = reactFlowInstance.getZoom();
      const aspectRatio = startW / startH;

      // Snapshot for proportional puck/border scaling
      resizeStartRef.current = {
        width: startW,
        height: startH,
        borderWidth: borderW,
        pucks: getStatusIndicators(nodeData).map(p => ({ id: p.id!, size: p.size ?? 12, borderWidth: p.borderWidth ?? 1 })),
      };

      const onMove = (me: MouseEvent) => {
        const deltaX = (me.clientX - startX) / zoom;
        const deltaY = (me.clientY - startY) / zoom;
        const shiftHeld = me.shiftKey;

        let newW = startW;
        let newH = startH;
        let newX = startPos.x;
        let newY = startPos.y;

        for (const edge of edges) {
          if (edge === 'right') newW = Math.max(MIN_NODE_WIDTH, startW + deltaX);
          else if (edge === 'left') {
            newW = Math.max(MIN_NODE_WIDTH, startW - deltaX);
            newX = startPos.x + (startW - newW);
          } else if (edge === 'bottom') newH = Math.max(MIN_NODE_HEIGHT, startH + deltaY);
          else if (edge === 'top') {
            newH = Math.max(MIN_NODE_HEIGHT, startH - deltaY);
            newY = startPos.y + (startH - newH);
          }
        }

        // Shift = maintain aspect ratio; circles always maintain it
        if (shiftHeld || isCircle) {
          if (edges.length === 1) {
            // Single edge: derive the other dimension from aspect ratio
            if (edges[0] === 'left' || edges[0] === 'right') {
              newH = newW / aspectRatio;
            } else {
              newW = newH * aspectRatio;
            }
          } else {
            // Corner: pick the dominant axis
            const dw = Math.abs(newW - startW);
            const dh = Math.abs(newH - startH);
            if (dw >= dh) {
              newH = newW / aspectRatio;
            } else {
              newW = newH * aspectRatio;
            }
            // Adjust position for top/left edges
            if (edges.includes('left')) newX = startPos.x + (startW - newW);
            if (edges.includes('top')) newY = startPos.y + (startH - newH);
          }
        }

        updateNodeData(id, { width: newW, height: newH });
        updateNodePosition(id, { x: newX, y: newY });

        // Scale pucks/border proportionally
        const start = resizeStartRef.current;
        if (start) {
          const scale = Math.max(newW / start.width, newH / start.height);
          const newBW = Math.max(1, Math.round(start.borderWidth * scale));
          if (newBW !== borderW) {
            updateNodeData(id, { borderWidth: newBW } as Partial<FlowNodeData>);
          }
          for (const sp of start.pucks) {
            const ns = Math.max(4, Math.round(sp.size * scale));
            const nb = Math.max(1, Math.round(sp.borderWidth * scale));
            useFlowStore.getState().updateStatusPuck(id, sp.id, { size: ns, borderWidth: nb });
          }
        }

        // Propagate to other selected nodes
        const { selectedNodes } = useFlowStore.getState();
        if (selectedNodes.length > 1) {
          for (const nid of selectedNodes) {
            if (nid !== id) updateNodeData(nid, { width: newW, height: newH });
          }
        }

        window.dispatchEvent(new CustomEvent('charthero:node-resize', {
          detail: { nodeId: id, x: newX, y: newY, width: newW, height: newH },
        }));
      };

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        resizeStartRef.current = null;
        window.dispatchEvent(new CustomEvent('charthero:node-resize-end'));
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [id, nodeData.width, nodeData.height, width, height, borderW, isCircle, reactFlowInstance, updateNodeData, updateNodePosition, nodeData],
  );

  // Build box-shadow layers
  // SVG-rendered shapes (parallelogram, hexagon, diamond, etc.) use SVG stroke
  // for selection — skip the rectangular box-shadow selection ring for those.
  // Selection is rendered via a dedicated outline div with negative inset
  // (outside the node border) — no box-shadow needed for selection.
  const selectionShadow = '';
  const isInEditedGroup = !!(linkGroupEditorId && nodeData.linkGroupId === linkGroupEditorId);
  const linkGroupShadow = isInEditedGroup && !isSelected
    ? '0 0 0 2px #3b82f6, 0 0 6px 1px #3b82f640'
    : '';

  // Group sibling highlight: show dotted outline when a fellow group member is selected
  const isGroupSiblingSelected = useFlowStore((s) => {
    if (isSelected) return false; // don't highlight self
    const gId = nodeData.groupId;
    const lgId = nodeData.linkGroupId;
    if (!gId && !lgId) return false;
    return s.selectedNodes.some((selId) => {
      if (selId === id) return false;
      const n = s.nodes.find((nd) => nd.id === selId);
      if (!n) return false;
      const nd = n.data as FlowNodeData;
      return (gId && nd.groupId === gId) || (lgId && nd.linkGroupId === lgId);
    });
  });

  // Visual transforms
  const rotation = nodeData.rotation || 0;
  const flipH = nodeData.flipH || false;
  const flipV = nodeData.flipV || false;

  // Build wrapper transform (rotation goes here so selection outline rotates with the shape)
  const wrapperTransformParts: string[] = [];
  if (rotation !== 0) wrapperTransformParts.push(`rotate(${rotation}deg)`);

  // Outer wrapper: holds resizer + handles, never clips
  const wrapperStyle: React.CSSProperties = {
    width,
    height: isExternalLabel ? 'auto' : height,
    position: 'relative',
    overflow: 'visible',
    transform: wrapperTransformParts.length > 0 ? wrapperTransformParts.join(' ') : undefined,
    transition: 'transform 0.2s',
    ...(isExternalLabel ? { display: 'flex', flexDirection: 'column', alignItems: 'center' } : {}),
  };

  // Bake node-level opacity into fill & border colors so text remains fully visible.
  // CSS `opacity` on the container would fade the label too, which is not the intent.
  const applyOpacity = (c: string, o: number): string => {
    if (o >= 1 || !c || c === 'transparent' || c === 'none') return c;
    try { return chroma(c).alpha(chroma(c).alpha() * o).css(); } catch { return c; }
  };
  const effectiveFill = noBox ? 'transparent' : applyOpacity(fillColor, opacity);
  const effectiveBorder = applyOpacity(borderColor, opacity);
  // Apply border opacity
  const borderOpacity = nodeData.borderOpacity ?? 1;
  const effectiveBorderFinal = (borderOpacity < 1 && effectiveBorder && effectiveBorder !== 'transparent')
    ? (() => { try { return chroma(effectiveBorder).alpha(chroma(effectiveBorder).alpha() * borderOpacity).css(); } catch { return effectiveBorder; } })()
    : effectiveBorder;
  const effectiveOutline = hasDashedBorder
    ? `${borderW}px ${borderStyleProp} ${effectiveBorderFinal}`
    : 'none';
  // Rebuild shadow with opacity-adjusted colors
  const oBorderShadow = (!noBox && borderColor !== 'transparent' && !hasDashedBorder)
    ? `0 0 0 ${borderW}px ${effectiveBorderFinal}`
    : '';
  const oDropShadow = (!noBox && !isSelected && !isInEditedGroup && opacity >= 0.3)
    ? '0 1px 3px rgba(0,0,0,0.1)'
    : '';
  const opacityShadow = [oBorderShadow, selectionShadow, linkGroupShadow, oDropShadow].filter(Boolean).join(', ') || 'none';

  // Inner shape: has the visual styling, clips text overflow
  const nodeStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    background: effectiveFill,
    border: 'none',
    outline: effectiveOutline,
    outlineOffset: hasDashedBorder ? '0px' : undefined,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: textColor,
    fontSize: scaledFontSize,
    fontWeight: nodeData.fontWeight || 500,
    fontFamily: nodeData.fontFamily || defaultFontFamily || "'Inter', sans-serif",
    boxShadow: opacityShadow,
    backdropFilter: (!noBox && activeStyle?.nodeDefaults.backdropFilter) || undefined,
    WebkitBackdropFilter: (!noBox && activeStyle?.nodeDefaults.backdropFilter) || undefined,
    transition: 'box-shadow 0.15s, transform 0.2s',
    overflow: noBox ? 'visible' : 'hidden',
    position: 'relative',
    ...(noBox ? {} : shapeStyles[shape]),
    // User-set border radius overrides the shape default
    ...(userBorderRadius !== undefined && !noBox ? { borderRadius: userBorderRadius } : {}),
    // Apply flip transforms (rotation is on the wrapper so selection outline rotates too)
    ...(() => {
      const parts: string[] = [];
      if (flipH) parts.push('scaleX(-1)');
      if (flipV) parts.push('scaleY(-1)');
      return parts.length > 0 ? { transform: parts.join(' ') } : {};
    })(),
  };

  const labelStyle: React.CSSProperties = isDiamond
    ? { fontSize: Math.min(12, scaledFontSize), paddingLeft: '20%', paddingRight: '20%' }
    : {};

  const ArrowSvg = isArrowShape ? ArrowSvgs[shape] : null;
  const arrowViewBox = isCircularArrow ? '0 0 100 100' : '0 0 160 80';
  const ShapeSvg = isSvgShape ? ShapeSvgs[shape] : null;

  // Handle position overrides for SVG shapes whose edges don't align with the bounding box.
  // Each override fully specifies left/top/transform so the handle sits on the shape boundary.
  const handleStyles = useMemo(() => {
    const none = { top: undefined as React.CSSProperties | undefined, bottom: undefined as React.CSSProperties | undefined, left: undefined as React.CSSProperties | undefined, right: undefined as React.CSSProperties | undefined };

    if (shape === 'parallelogram') {
      // Parallelogram polygon: 25,0 160,0 135,80 0,80 (viewBox 0 0 160 80)
      // Left edge at y=50%: x = lerp(25,0, 0.5) = 12.5 → 12.5/160 ≈ 7.8%
      // Right edge at y=50%: x = lerp(160,135, 0.5) = 147.5 → 147.5/160 ≈ 92.2%
      return {
        ...none,
        left: { left: '7.8%', top: '50%', transform: 'translate(-50%, -50%)' } as React.CSSProperties,
        right: { left: '92.2%', top: '50%', transform: 'translate(-50%, -50%)' } as React.CSSProperties,
      };
    }
    if (shape === 'document') {
      // Document path bottom curve at x=50%: y = 65 in viewBox 80 → 65/80 = 81.25%
      return {
        ...none,
        bottom: { left: '50%', top: '81.25%', transform: 'translate(-50%, -50%)' } as React.CSSProperties,
      };
    }
    if (shape === 'cloud') {
      // Cloud is organic — approximate boundary positions along cardinal axes
      return {
        top: { left: '50%', top: '12%', transform: 'translate(-50%, -50%)' } as React.CSSProperties,
        bottom: { left: '50%', top: '78%', transform: 'translate(-50%, -50%)' } as React.CSSProperties,
        left: { left: '6%', top: '50%', transform: 'translate(-50%, -50%)' } as React.CSSProperties,
        right: { left: '91%', top: '50%', transform: 'translate(-50%, -50%)' } as React.CSSProperties,
      };
    }
    // Diamond and hexagon vertices align with bounding box midpoints — no override needed
    return none;
  }, [shape]);

  return (
    <div ref={wrapperRef} style={wrapperStyle} onDoubleClick={handleDoubleClick}>
      {/* Custom resize handles + selection outline — positioned outside the border */}
      {isSelected && (() => {
        const selBorderW = selectionThickness * 0.75;
        // borderW is rendered as box-shadow spread outside the bounding box,
        // so the outline must clear it: borderW + 1px gap + outline thickness
        const outset = borderW + 1 + selBorderW;
        const handleSize = 14;
        const handleHalf = handleSize / 2;
        const handleBorder = `${Math.max(1.5, selectionThickness)}px solid ${selectionColor}`;
        const handleBase: React.CSSProperties = {
          position: 'absolute', backgroundColor: 'white', borderRadius: handleHalf,
          width: handleSize, height: handleSize, border: handleBorder, zIndex: 50,
        };
        const br = noBox ? 4 : (userBorderRadius ?? (shapeStyles[shape] as Record<string, unknown>)?.borderRadius as number ?? 8) + borderW + 2;

        return (
          <>
            {/* Selection outline */}
            <div
              style={{
                position: 'absolute', inset: -outset,
                border: `${selBorderW}px solid ${selectionColor}`,
                borderRadius: br, pointerEvents: 'none', zIndex: 40,
              }}
            />

            {/* Edge handles — single axis, aligned to the selection outline */}
            <div className="nodrag nopan" style={{ position: 'absolute', top: -outset - 4, left: outset, right: outset, height: 10, cursor: CURSOR_RESIZE_HEIGHT, zIndex: 45 }} onMouseDown={(e) => handleResizeStart(e, ['top'])} />
            <div className="nodrag nopan" style={{ position: 'absolute', bottom: -outset - 4, left: outset, right: outset, height: 10, cursor: CURSOR_RESIZE_HEIGHT, zIndex: 45 }} onMouseDown={(e) => handleResizeStart(e, ['bottom'])} />
            <div className="nodrag nopan" style={{ position: 'absolute', left: -outset - 4, top: outset, bottom: outset, width: 10, cursor: CURSOR_RESIZE_WIDTH, zIndex: 45 }} onMouseDown={(e) => handleResizeStart(e, ['left'])} />
            <div className="nodrag nopan" style={{ position: 'absolute', right: -outset - 4, top: outset, bottom: outset, width: 10, cursor: CURSOR_RESIZE_WIDTH, zIndex: 45 }} onMouseDown={(e) => handleResizeStart(e, ['right'])} />

            {/* Corner handles — both axes */}
            <div className="nodrag nopan" style={{ ...handleBase, top: -outset - handleHalf, left: -outset - handleHalf, cursor: CURSOR_RESIZE_CORNER }} onMouseDown={(e) => handleResizeStart(e, ['top', 'left'])} />
            <div className="nodrag nopan" style={{ ...handleBase, top: -outset - handleHalf, right: -outset - handleHalf, cursor: CURSOR_RESIZE_CORNER }} onMouseDown={(e) => handleResizeStart(e, ['top', 'right'])} />
            <div className="nodrag nopan" style={{ ...handleBase, bottom: -outset - handleHalf, left: -outset - handleHalf, cursor: CURSOR_RESIZE_CORNER }} onMouseDown={(e) => handleResizeStart(e, ['bottom', 'left'])} />
            <div className="nodrag nopan" style={{ ...handleBase, bottom: -outset - handleHalf, right: -outset - handleHalf, cursor: CURSOR_RESIZE_CORNER }} onMouseDown={(e) => handleResizeStart(e, ['bottom', 'right'])} />
          </>
        );
      })()}

      {/* Group sibling dotted outline when a fellow group member is selected */}
      {isGroupSiblingSelected && (
        <div
          style={{
            position: 'absolute',
            inset: -3,
            border: `1.5px dashed ${selectionColor}`,
            borderRadius: noBox ? 4 : (userBorderRadius ?? (shapeStyles[shape] as Record<string, unknown>)?.borderRadius as number ?? 8),
            pointerEvents: 'none',
            zIndex: 49,
            opacity: 0.7,
          }}
        />
      )}

      {/* Rotation handle — visible only when selected */}
      {isSelected && (
        <div
          className="charthero-rotate-handle-group"
          style={{
            position: 'absolute',
            left: '50%',
            top: -32,
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            pointerEvents: 'none',
            zIndex: 60,
          }}
        >
          {/* Rotate handle circle */}
          <div
            className={`nodrag nopan charthero-rotate-handle${isRotating ? ' rotating' : ''}`}
            onMouseDown={handleRotateStart}
            data-tooltip={`${Math.round(rotation)}°`}
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: 'white',
              border: `2px solid ${selectionColor}`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              pointerEvents: 'auto',
              flexShrink: 0,
            }}
          />
          {/* Connecting line from handle down to node top edge */}
          <div
            style={{
              width: 1,
              height: 18,
              backgroundColor: selectionColor,
              opacity: 0.6,
            }}
          />
        </div>
      )}

      {/* Dependency badges overlay */}
      <DependencyBadge nodeId={id} />
      {(() => {
        const pucks = getStatusIndicators(nodeData);
        // Count how many pucks share each corner so they can be laid out side-by-side
        const positionCounters: Record<string, number> = {};
        return pucks.map((puck) => {
          const pos = puck.position ?? 'top-right';
          const idx = positionCounters[pos] ?? 0;
          positionCounters[pos] = idx + 1;
          return (
            <StatusBadge
              key={puck.id}
              statusIndicator={puck}
              nodeId={id}
              puckId={puck.id!}
              indexInGroup={idx}
              shape={shape}
              onUpdatePosition={(newPos) => {
                useFlowStore.getState().updateStatusPuck(id, puck.id!, { position: newPos as any });
              }}
              onUpdateSize={(newSize) => {
                useFlowStore.getState().updateStatusPuck(id, puck.id!, { size: newSize });
              }}
            />
          );
        });
      })()}

      {/* Connection handles — each position has both source + target for bidirectional edges.
          SVG shapes get custom offsets so handles sit on the actual shape boundary. */}
      <Handle type="target" position={Position.Top} id="top" className="charthero-handle" style={handleStyles.top} />
      <Handle type="source" position={Position.Top} id="top" className="charthero-handle" style={handleStyles.top || { left: '50%' }} />
      <Handle type="source" position={Position.Bottom} id="bottom" className="charthero-handle" style={handleStyles.bottom} />
      <Handle type="target" position={Position.Bottom} id="bottom" className="charthero-handle" style={handleStyles.bottom || { left: '50%' }} />
      <Handle type="target" position={Position.Left} id="left" className="charthero-handle" style={handleStyles.left} />
      <Handle type="source" position={Position.Left} id="left" className="charthero-handle" style={handleStyles.left || { top: '50%' }} />
      <Handle type="source" position={Position.Right} id="right" className="charthero-handle" style={handleStyles.right} />
      <Handle type="target" position={Position.Right} id="right" className="charthero-handle" style={handleStyles.right || { top: '50%' }} />

      {/* Label element builder (shared by overlay and external positions) */}
      {(() => {
        const IconComponent = nodeData.icon
          ? (icons as Record<string, React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>>)[nodeData.icon]
          : null;

        // Icon styling props
        const iColor = nodeData.iconColor || textColor;
        const iBgColor = nodeData.iconBgColor;
        const iBorderColor = nodeData.iconBorderColor;
        const iBorderWidth = nodeData.iconBorderWidth ?? 0;

        const renderStyledIcon = (iconSz: number) => {
          if (!IconComponent) return null;
          const hasWrapper = iBgColor || (iBorderColor && iBorderWidth > 0);
          const iconEl = <IconComponent size={iconSz} className="shrink-0 block" style={{ color: iColor }} />;
          if (!hasWrapper) return iconEl;
          return (
            <span
              className="inline-flex items-center justify-center shrink-0 rounded"
              style={{
                backgroundColor: iBgColor || 'transparent',
                border: iBorderWidth > 0 && iBorderColor ? `${iBorderWidth}px solid ${iBorderColor}` : undefined,
                padding: 2,
              }}
            >
              {iconEl}
            </span>
          );
        };

        // Build the label content (used for both overlay and external positions)
        const renderLabelContent = (isOverlay: boolean) => {
          // Icon-only mode: render just the icon centered, no label text
          if (isIconOnly && IconComponent) {
            const iconSize = nodeData.iconSize || Math.min(width, height) * 0.6;
            return (
              <div className="flex items-center justify-center w-full h-full relative z-10">
                {renderStyledIcon(iconSize)}
              </div>
            );
          }

          const actualIconSize = nodeData.iconSize || (scaledFontSize + 2);

          return (
            <div
              ref={labelRef}
              className={`flex items-center gap-1.5 w-full relative z-10 overflow-hidden px-1 ${isOverlay ? 'h-full' : ''} ${iconPosition === 'right' ? 'flex-row-reverse' : ''} ${
                (nodeData as Record<string, unknown>).textAlign === 'left' ? 'justify-start' :
                (nodeData as Record<string, unknown>).textAlign === 'right' ? 'justify-end' :
                'justify-center'
              }`}
              style={{ ...labelStyle, fontSize: scaledFontSize }}
            >
              {IconComponent && renderStyledIcon(actualIconSize)}
              {isEditing ? (
                <textarea
                  ref={inputRef}
                  className="bg-transparent text-center outline-none border-none w-full px-1 resize-none"
                  style={{
                    color: textColor,
                    fontSize: scaledFontSize,
                    lineHeight: 1.3,
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                    whiteSpace: 'pre-wrap',
                    overflow: 'hidden',
                    minHeight: '1.3em',
                  }}
                  value={editValue}
                  rows={Math.max(1, (editValue || '').split('\n').length)}
                  onChange={(e) => {
                    setEditValue(e.target.value);
                    // Auto-resize textarea to fit content
                    const ta = e.target;
                    ta.style.height = 'auto';
                    ta.style.height = `${ta.scrollHeight}px`;
                  }}
                  onBlur={commitEdit}
                  onKeyDown={handleKeyDown}
                />
              ) : (
                <span className="text-center select-none break-words leading-tight whitespace-pre-wrap" style={{ wordBreak: 'break-word', cursor: 'var(--cursor-select)' }}>
                  {nodeData.label}
                </span>
              )}
            </div>
          );
        };

        // External label element (above/below the shape)
        const externalLabelEl = (
          <div
            style={{
              width: '100%',
              textAlign: 'center',
              color: textColor,
              fontSize: scaledFontSize,
              fontWeight: nodeData.fontWeight || 500,
              fontFamily: nodeData.fontFamily || defaultFontFamily || "'Inter', sans-serif",
              ...(labelPosition === 'above' ? { marginBottom: 4 } : { marginTop: 4 }),
            }}
            onDoubleClick={handleDoubleClick}
          >
            {renderLabelContent(false)}
          </div>
        );

        return (
          <>
            {/* External label above the shape */}
            {labelPosition === 'above' && externalLabelEl}

            {/* Inner shape div */}
            <div style={{ ...nodeStyle, ...(isExternalLabel ? { width, height } : {}) }}>

            {/* Arrow shape SVG layer */}
            {isArrowShape && ArrowSvg && (
              <svg
                width="100%"
                height="100%"
                viewBox={arrowViewBox}
                preserveAspectRatio="none"
                overflow="visible"
                className="absolute inset-0 pointer-events-none"
              >
                <ArrowSvg
                  fill={applyOpacity(fillColor, opacity)}
                  stroke={applyOpacity(borderColor, opacity)}
                  strokeW={borderColor !== 'transparent' ? borderW : 0}
                />
              </svg>
            )}

            {/* Non-rectangular shape SVG layer */}
            {isSvgShape && ShapeSvg && (
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 160 80"
                preserveAspectRatio="none"
                overflow="visible"
                className="absolute inset-0 pointer-events-none"
              >
                <ShapeSvg
                  fill={applyOpacity(fillColor, opacity)}
                  stroke={applyOpacity(borderColor, opacity)}
                  strokeW={borderColor !== 'transparent' ? borderW : 0}
                />
              </svg>
            )}

            {/* Diamond SVG layer — rendered as a proper polygon so selection
                borders, NodeResizer, and pucks all track the bounding box correctly
                instead of relying on a CSS rotate(45deg) hack. */}
            {isDiamond && (
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                overflow="visible"
                className="absolute inset-0 pointer-events-none"
              >
                <polygon
                  points="50,0 100,50 50,100 0,50"
                  fill={applyOpacity(fillColor, opacity)}
                  stroke={applyOpacity(borderColor, opacity)}
                  strokeWidth={borderColor !== 'transparent' ? borderW : 0}
                  strokeLinejoin="round"
                />
              </svg>
            )}

            {/* Freehand drawing SVG layer */}
            {shape === 'freehand' && nodeData.svgPath && (
              <svg
                width="100%"
                height="100%"
                viewBox={nodeData.svgViewBox || '0 0 100 100'}
                preserveAspectRatio="xMidYMid meet"
                className="absolute inset-0 pointer-events-none"
              >
                <path
                  d={nodeData.svgPath}
                  fill="none"
                  stroke={applyOpacity(nodeData.svgStrokeColor || borderColor || '#000000', opacity)}
                  strokeWidth={nodeData.svgStrokeWidth || 3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}

            {/* Label overlay (default — inside the shape) */}
            {!isExternalLabel && renderLabelContent(true)}

            </div>{/* end inner shape div */}

            {/* External label below the shape */}
            {labelPosition === 'below' && externalLabelEl}
          </>
        );
      })()}
    </div>
  );
};

export default React.memo(GenericShapeNode);
