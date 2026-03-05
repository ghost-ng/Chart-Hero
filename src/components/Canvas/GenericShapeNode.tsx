import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
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
import { CURSOR_SELECT } from '../../assets/cursors/cursors';

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
      <path
        d="M 75 12 A 32 32 0 1 1 38 20"
        fill="none" stroke={fill} strokeWidth={6} strokeLinecap="round"
      />
      <polygon
        points="24,4 48,20 22,28"
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

const StatusBadge: React.FC<StatusBadgeProps & { nodeId: string; puckId: string; indexInGroup: number; onUpdatePosition?: (position: string) => void; onUpdateSize?: (size: number) => void }> = ({ statusIndicator, nodeId, puckId, shape, indexInGroup, onUpdatePosition, onUpdateSize }) => {
  const isSelected = useUIStore((s) => s.selectedPuckIds.includes(puckId));
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const selectionColor = useUIStore((s) => s.selectionColor);
  const presentationMode = useUIStore((s) => s.presentationMode);

  if (!statusIndicator || statusIndicator.status === 'none') return null;

  const { status, color, size: badgeSize, position = 'top-right' } = statusIndicator;
  const size = badgeSize ?? 12;
  const bgColor = color || STATUS_COLORS[status] || '#94a3b8';
  const offset = -(size / 2);

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
  const isDiamondShape = shape === 'diamond';

  const positionStyle: React.CSSProperties = {};

  if (isDiamondShape) {
    // Diamond edge midpoints (percentage of bounding box):
    //   top-right  → midpoint of top→right edge → (75%, 25%)
    //   top-left   → midpoint of left→top edge  → (25%, 25%)
    //   bottom-right → midpoint of right→bottom → (75%, 75%)
    //   bottom-left  → midpoint of bottom→left  → (25%, 75%)
    // For multiple pucks, spread along the edge direction.
    const half = size / 2;
    const edgeSpread = sideOffset * 0.5; // half-speed spread along edge
    switch (position) {
      case 'top-right':
        positionStyle.left = `calc(75% - ${half}px + ${edgeSpread}px)`;
        positionStyle.top = `calc(25% - ${half}px + ${edgeSpread}px)`;
        break;
      case 'top-left':
        positionStyle.left = `calc(25% - ${half}px - ${edgeSpread}px)`;
        positionStyle.top = `calc(25% - ${half}px + ${edgeSpread}px)`;
        break;
      case 'bottom-right':
        positionStyle.left = `calc(75% - ${half}px + ${edgeSpread}px)`;
        positionStyle.top = `calc(75% - ${half}px - ${edgeSpread}px)`;
        break;
      case 'bottom-left':
      default:
        positionStyle.left = `calc(25% - ${half}px - ${edgeSpread}px)`;
        positionStyle.top = `calc(75% - ${half}px - ${edgeSpread}px)`;
        break;
    }
  } else {
    // Standard rectangular positioning
    if (isRight) {
      positionStyle.right = offset + sideOffset;
    } else {
      positionStyle.left = offset + sideOffset;
    }
    if (position === 'top-right' || position === 'top-left') {
      positionStyle.top = offset;
    } else {
      positionStyle.bottom = offset;
    }
  }

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

      // Click (no drag) → select puck only (deselect everything else)
      if (!didDrag && !isResize) {
        if (isMultiSelect) {
          useUIStore.getState().togglePuckSelection(puckId, nodeId);
        } else {
          useUIStore.getState().selectPuck(puckId, nodeId);
        }
        // Deselect all nodes and edges so only the puck is selected
        const { selectedNodes, selectedEdges, setSelectedNodes, setSelectedEdges } = useFlowStore.getState();
        if (selectedNodes.length > 0) setSelectedNodes([]);
        if (selectedEdges.length > 0) setSelectedEdges([]);
        return;
      }

      if (isResize) return;

      // Snap to the closest corner using a fresh bounding rect
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
  const hitOffset = -(hitSize / 2); // centre the hit zone on the node corner

  // Position the hit zone — for diamonds, use diamond edge midpoints
  const hitPositionStyle: React.CSSProperties = {};
  if (isDiamondShape) {
    const hitHalf = hitSize / 2;
    const edgeSpreadHit = sideOffset * 0.5;
    switch (position) {
      case 'top-right':
        hitPositionStyle.left = `calc(75% - ${hitHalf}px + ${edgeSpreadHit}px)`;
        hitPositionStyle.top = `calc(25% - ${hitHalf}px + ${edgeSpreadHit}px)`;
        break;
      case 'top-left':
        hitPositionStyle.left = `calc(25% - ${hitHalf}px - ${edgeSpreadHit}px)`;
        hitPositionStyle.top = `calc(25% - ${hitHalf}px + ${edgeSpreadHit}px)`;
        break;
      case 'bottom-right':
        hitPositionStyle.left = `calc(75% - ${hitHalf}px + ${edgeSpreadHit}px)`;
        hitPositionStyle.top = `calc(75% - ${hitHalf}px - ${edgeSpreadHit}px)`;
        break;
      case 'bottom-left':
      default:
        hitPositionStyle.left = `calc(25% - ${hitHalf}px - ${edgeSpreadHit}px)`;
        hitPositionStyle.top = `calc(75% - ${hitHalf}px - ${edgeSpreadHit}px)`;
        break;
    }
  } else {
    if (isRight) {
      hitPositionStyle.right = hitOffset + sideOffset;
    } else {
      hitPositionStyle.left = hitOffset + sideOffset;
    }
    if (position === 'top-right' || position === 'top-left') {
      hitPositionStyle.top = hitOffset;
    } else {
      hitPositionStyle.bottom = hitOffset;
    }
  }

  return (
    /* Invisible hit zone – larger clickable area centred on the same corner
       as the puck.  z-index 50 keeps it above React Flow interaction layers. */
    <div
      className="nodrag nopan"
      onPointerDown={handlePointerDown}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={handleContextMenu}
      data-tooltip="Click to select · Shift+click multi-select · Drag to move · Ctrl+drag to resize"
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
            className="fixed z-[9999] min-w-[180px] rounded-lg shadow-xl border bg-white dark:bg-dk-panel dark:border-dk-border py-1 text-xs"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
          >
            <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 dark:text-dk-faint uppercase tracking-wide">Select All Pucks</div>
            <button
              onClick={selectAllOnNode}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-dk-hover text-slate-700 dark:text-dk-text cursor-pointer"
            >
              <span className="w-3 h-3 rounded-full border border-slate-300" style={{ backgroundColor: bgColor }} />
              On this node
            </button>
            <button
              onClick={selectAllByColor}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-dk-hover text-slate-700 dark:text-dk-text cursor-pointer"
            >
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: bgColor }} />
              Same color
            </button>
            <button
              onClick={selectAllByBorder}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-dk-hover text-slate-700 dark:text-dk-text cursor-pointer"
            >
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: 'transparent', border: borderStr }} />
              Same outline
            </button>
            <div className="h-px bg-slate-200 dark:bg-dk-border my-0.5" />
            <button
              onClick={selectAllGlobal}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-dk-hover text-slate-700 dark:text-dk-text cursor-pointer"
            >
              All pucks (global)
            </button>
          </div>
        </>,
        document.body,
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const GenericShapeNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const nodeData = data as FlowNodeData;
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
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

  const shape = nodeData.shape || 'rectangle';
  const isIconOnly = !!nodeData.iconOnly;

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
    if (trimmed && trimmed !== nodeData.label) {
      updateNodeData(id, { label: trimmed });
    } else {
      setEditValue(nodeData.label);
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

  // Build box-shadow layers
  const borderShadow = (!noBox && borderColor !== 'transparent' && !hasDashedBorder)
    ? `0 0 0 ${borderW}px ${borderColor}`
    : '';
  // SVG-rendered shapes (parallelogram, hexagon, diamond, etc.) use SVG stroke
  // for selection — skip the rectangular box-shadow selection ring for those.
  const selectionShadow = (isSelected && !noBox)
    ? `0 0 0 ${selectionThickness + 0.5}px ${selectionColor}, 0 0 8px 2px ${selectionColor}40`
    : '';
  const isInEditedGroup = !!(linkGroupEditorId && nodeData.linkGroupId === linkGroupEditorId);
  const linkGroupShadow = isInEditedGroup && !isSelected
    ? '0 0 0 2px #3b82f6, 0 0 6px 1px #3b82f640'
    : '';
  const dropShadow = (!noBox && !isSelected && !isInEditedGroup)
    ? '0 1px 3px rgba(0,0,0,0.1)'
    : '';
  const combinedShadow = [borderShadow, selectionShadow, linkGroupShadow, dropShadow].filter(Boolean).join(', ') || 'none';

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
    height,
    position: 'relative',
    overflow: 'visible',
    transform: wrapperTransformParts.length > 0 ? wrapperTransformParts.join(' ') : undefined,
    transition: 'transform 0.2s',
  };

  // Inner shape: has the visual styling, clips text overflow
  const nodeStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    background: noBox ? 'transparent' : fillColor,
    border: 'none',
    outline: hasDashedBorder ? `${borderW}px ${borderStyleProp} ${borderColor}` : 'none',
    outlineOffset: hasDashedBorder ? '0px' : undefined,
    opacity,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: textColor,
    fontSize: scaledFontSize,
    fontWeight: nodeData.fontWeight || 500,
    fontFamily: nodeData.fontFamily || defaultFontFamily || "'Inter', sans-serif",
    boxShadow: combinedShadow,
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
    ? { fontSize: Math.min(12, scaledFontSize) }
    : {};

  const ArrowSvg = isArrowShape ? ArrowSvgs[shape] : null;
  const arrowViewBox = isCircularArrow ? '0 0 100 80' : '0 0 160 80';
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
      <NodeResizer
        isVisible={!!isSelected}
        minWidth={40}
        minHeight={30}
        keepAspectRatio={isCircle}
        lineStyle={{ borderColor: selectionColor, borderWidth: selectionThickness * 0.5 }}
        handleStyle={{ width: 12, height: 12, borderRadius: 6, backgroundColor: 'white', border: `${Math.max(1.5, selectionThickness)}px solid ${selectionColor}`, zIndex: 50 }}
        onResize={(_event, params) => {
          updateNodeData(id, { width: params.width, height: params.height });
          // Propagate resize to all other selected nodes
          const { selectedNodes } = useFlowStore.getState();
          if (selectedNodes.length > 1) {
            for (const nid of selectedNodes) {
              if (nid !== id) {
                updateNodeData(nid, { width: params.width, height: params.height });
              }
            }
          }
          // Notify FlowCanvas for alignment/distance guide computation
          window.dispatchEvent(new CustomEvent('charthero:node-resize', {
            detail: { nodeId: id, x: params.x, y: params.y, width: params.width, height: params.height },
          }));
        }}
        onResizeEnd={() => {
          window.dispatchEvent(new CustomEvent('charthero:node-resize-end'));
        }}
      />

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

      {/* Inner shape div */}
      <div style={nodeStyle}>

      {/* Arrow shape SVG layer */}
      {isArrowShape && ArrowSvg && (
        <svg
          width="100%"
          height="100%"
          viewBox={arrowViewBox}
          preserveAspectRatio="none"
          className="absolute inset-0 pointer-events-none"
        >
          <ArrowSvg
            fill={fillColor}
            stroke={isSelected ? selectionColor : borderColor}
            strokeW={isSelected ? Math.max(borderW, selectionThickness) : borderColor !== 'transparent' ? borderW : 0}
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
          className="absolute inset-0 pointer-events-none"
        >
          <ShapeSvg
            fill={fillColor}
            stroke={isSelected ? selectionColor : borderColor}
            strokeW={isSelected ? Math.max(borderW, selectionThickness) : borderColor !== 'transparent' ? borderW : 0}
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
          className="absolute inset-0 pointer-events-none"
        >
          <polygon
            points="50,0 100,50 50,100 0,50"
            fill={fillColor}
            stroke={isSelected ? selectionColor : borderColor}
            strokeWidth={isSelected ? Math.max(borderW, selectionThickness) : borderColor !== 'transparent' ? borderW : 0}
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
            stroke={isSelected ? selectionColor : (nodeData.svgStrokeColor || borderColor || '#000000')}
            strokeWidth={nodeData.svgStrokeWidth || 3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {/* Label with optional icon */}
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
            className={`flex items-center gap-1.5 w-full h-full relative z-10 overflow-hidden px-1 ${iconPosition === 'right' ? 'flex-row-reverse' : ''} ${
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
      })()}
      </div>{/* end inner shape div */}
    </div>
  );
};

export default React.memo(GenericShapeNode);
