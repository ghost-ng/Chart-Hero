// ---------------------------------------------------------------------------
// EdgeLabel.tsx -- Shared draggable edge label component
//
// Renders the label for an edge and allows the user to click-and-drag it
// along the connector path to reposition. The label position is stored as
// a `t` parameter (0 = source, 0.5 = center, 1 = target) in edge data.
//
// Positioning uses the actual SVG <path> element via getPointAtLength()
// so labels follow curves & right-angle bends accurately.
// ---------------------------------------------------------------------------

import React, { useCallback, useRef, useState, useEffect, useLayoutEffect } from 'react';
import { EdgeLabelRenderer, useReactFlow } from '@xyflow/react';
import { useFlowStore } from '../../store/flowStore';
import { CURSOR_SELECT, CURSOR_DRAG_ACTIVE } from '../../assets/cursors/cursors';
import InlineEdit from '../shared/InlineEdit';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EdgeLabelProps {
  /** Edge id -- used to update the store on drag end */
  edgeId: string;
  /** The label text to render */
  label: string;
  /** Source point of the edge path */
  sourceX: number;
  sourceY: number;
  /** Midpoint (labelX/labelY from React Flow's path helpers) */
  midX: number;
  midY: number;
  /** Target point of the edge path */
  targetX: number;
  targetY: number;
  /** Current label position parameter (0-1, default 0.5) */
  labelPosition: number;
  /** Label text color */
  labelColor: string;
  /** Label background color */
  labelBgColor: string;
  /** Label border color (usually matches stroke) */
  borderColor: string;
  /** Label font size */
  fontSize: number;
  /** Optional vertical offset in pixels (used by DependencyEdge to stack with pill badge) */
  offsetY?: number;
}

// ---------------------------------------------------------------------------
// SVG path helpers
// ---------------------------------------------------------------------------

/**
 * Get the SVG <path> element for an edge by its ID.
 * Returns null if the element doesn't exist or isn't an SVGPathElement.
 */
function getPathElement(edgeId: string): SVGPathElement | null {
  const el = document.getElementById(edgeId);
  if (el instanceof SVGPathElement) return el;
  return null;
}

/**
 * Compute (x, y) at position t (0-1) along the actual SVG path.
 * Falls back to piecewise linear interpolation if the DOM element isn't found.
 */
export function computeLabelXY(
  t: number,
  sourceX: number,
  sourceY: number,
  midX: number,
  midY: number,
  targetX: number,
  targetY: number,
  edgeId?: string,
): [number, number] {
  if (edgeId) {
    const pathEl = getPathElement(edgeId);
    if (pathEl) {
      const totalLen = pathEl.getTotalLength();
      const pt = pathEl.getPointAtLength(t * totalLen);
      return [pt.x, pt.y];
    }
  }
  // Fallback: piecewise linear through 3 points
  if (t <= 0.5) {
    const s = t * 2;
    return [
      sourceX + s * (midX - sourceX),
      sourceY + s * (midY - sourceY),
    ];
  } else {
    const s = (t - 0.5) * 2;
    return [
      midX + s * (targetX - midX),
      midY + s * (targetY - midY),
    ];
  }
}

/**
 * Given a mouse position in flow coordinates, find the nearest t (0-1)
 * along the actual SVG path by sampling.
 * Falls back to segment projection if the DOM element isn't found.
 */
function projectToT(
  px: number,
  py: number,
  sourceX: number,
  sourceY: number,
  midX: number,
  midY: number,
  targetX: number,
  targetY: number,
  edgeId?: string,
): number {
  if (edgeId) {
    const pathEl = getPathElement(edgeId);
    if (pathEl) {
      const totalLen = pathEl.getTotalLength();
      if (totalLen === 0) return 0.5;
      // Coarse pass: sample 40 points
      const COARSE = 40;
      let bestT = 0.5;
      let bestDist = Infinity;
      for (let i = 0; i <= COARSE; i++) {
        const sampleT = i / COARSE;
        const pt = pathEl.getPointAtLength(sampleT * totalLen);
        const dist = (px - pt.x) ** 2 + (py - pt.y) ** 2;
        if (dist < bestDist) {
          bestDist = dist;
          bestT = sampleT;
        }
      }
      // Fine pass: refine within ±1 coarse step
      const lo = Math.max(0, bestT - 1 / COARSE);
      const hi = Math.min(1, bestT + 1 / COARSE);
      const FINE = 20;
      for (let i = 0; i <= FINE; i++) {
        const sampleT = lo + (hi - lo) * (i / FINE);
        const pt = pathEl.getPointAtLength(sampleT * totalLen);
        const dist = (px - pt.x) ** 2 + (py - pt.y) ** 2;
        if (dist < bestDist) {
          bestDist = dist;
          bestT = sampleT;
        }
      }
      return bestT;
    }
  }
  // Fallback: piecewise segment projection
  return projectToTFallback(px, py, sourceX, sourceY, midX, midY, targetX, targetY);
}

/** Fallback projection onto source→mid→target segments */
function projectToTFallback(
  px: number, py: number,
  sourceX: number, sourceY: number,
  midX: number, midY: number,
  targetX: number, targetY: number,
): number {
  const tA = projectOntoSegment(px, py, sourceX, sourceY, midX, midY);
  const axA = sourceX + tA * (midX - sourceX);
  const ayA = sourceY + tA * (midY - sourceY);
  const distA = (px - axA) ** 2 + (py - ayA) ** 2;

  const tB = projectOntoSegment(px, py, midX, midY, targetX, targetY);
  const axB = midX + tB * (targetX - midX);
  const ayB = midY + tB * (targetY - midY);
  const distB = (px - axB) ** 2 + (py - ayB) ** 2;

  if (distA <= distB) return tA * 0.5;
  return 0.5 + tB * 0.5;
}

/** Project point onto line segment, return clamped t in [0,1] */
function projectOntoSegment(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return 0;
  const t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  return Math.max(0, Math.min(1, t));
}

/** Snap t to nearest 0.05 increment, clamped to [0, 1] */
function snapT(t: number): number {
  const snapped = Math.round(t * 20) / 20;
  return Math.max(0, Math.min(1, snapped));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const EdgeLabel: React.FC<EdgeLabelProps> = ({
  edgeId,
  label,
  sourceX,
  sourceY,
  midX,
  midY,
  targetX,
  targetY,
  labelPosition,
  labelColor,
  labelBgColor,
  borderColor,
  fontSize,
  offsetY = 0,
}) => {
  const { screenToFlowPosition } = useReactFlow();
  const updateEdgeData = useFlowStore((s) => s.updateEdgeData);
  const [isDragging, setIsDragging] = useState(false);
  const [dragT, setDragT] = useState<number | null>(null);
  const isDraggingRef = useRef(false);
  const dragTRef = useRef<number | null>(null);

  // The effective t: use drag position while dragging, otherwise the stored value
  const effectiveT = dragT !== null ? dragT : labelPosition;

  // Compute position — initial render uses whatever is available (may fall back to linear)
  const initialPos = computeLabelXY(effectiveT, sourceX, sourceY, midX, midY, targetX, targetY, edgeId);
  const [pos, setPos] = useState<[number, number]>(initialPos);

  // After DOM commit, recompute using the actual SVG path element (handles edge type changes)
  useLayoutEffect(() => {
    const updated = computeLabelXY(effectiveT, sourceX, sourceY, midX, midY, targetX, targetY, edgeId);
    setPos((prev) => (prev[0] === updated[0] && prev[1] === updated[1]) ? prev : updated);
  }, [effectiveT, sourceX, sourceY, midX, midY, targetX, targetY, edgeId]);

  const [lx, ly] = pos;

  // Keep refs for values needed in window event handlers (to avoid stale closures)
  const edgeIdRef = useRef(edgeId);
  edgeIdRef.current = edgeId;
  const pathRef = useRef({ sourceX, sourceY, midX, midY, targetX, targetY });
  pathRef.current = { sourceX, sourceY, midX, midY, targetX, targetY };

  // ---- Drag handlers (attached to window during drag) ----

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();
      e.stopPropagation();

      // Convert screen coords to flow coords
      const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const p = pathRef.current;

      // Compute new t by projecting onto actual SVG path
      const rawT = projectToT(
        flowPos.x,
        flowPos.y,
        p.sourceX,
        p.sourceY,
        p.midX,
        p.midY,
        p.targetX,
        p.targetY,
        edgeIdRef.current,
      );
      const snapped = snapT(rawT);
      dragTRef.current = snapped;
      setDragT(snapped);
    },
    [screenToFlowPosition],
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();
      e.stopPropagation();

      isDraggingRef.current = false;
      setIsDragging(false);

      // Commit the final position to the store (read from ref to avoid stale closure)
      if (dragTRef.current !== null) {
        updateEdgeData(edgeIdRef.current, { labelPosition: dragTRef.current });
      }
      dragTRef.current = null;
      setDragT(null);

      // Remove listeners
      window.removeEventListener('mousemove', handleMouseMove, true);
      window.removeEventListener('mouseup', handleMouseUp, true);
    },
    [handleMouseMove, updateEdgeData],
  );

  // Attach/detach window listeners when dragging starts
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove, true);
      window.addEventListener('mouseup', handleMouseUp, true);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove, true);
        window.removeEventListener('mouseup', handleMouseUp, true);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // ---- Inline editing state ----
  const [isEditing, setIsEditing] = useState(false);

  const handleEditCommit = useCallback(
    (trimmed: string) => {
      setIsEditing(false);
      if (trimmed !== label) {
        updateEdgeData(edgeId, { label: trimmed || undefined });
      }
    },
    [label, edgeId, updateEdgeData],
  );

  const handleEditCancel = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Don't start drag if we're editing
      if (isEditing) return;
      // Only left button
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      isDraggingRef.current = true;
      dragTRef.current = labelPosition;
      setIsDragging(true);
      setDragT(labelPosition);
    },
    [labelPosition, isEditing],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsEditing(true);
    },
    [],
  );

  return (
    <EdgeLabelRenderer>
      <div
        className="absolute pointer-events-auto rounded px-2 py-0.5 font-medium shadow-sm border edge-label-container"
        style={{
          transform: `translate(-50%, -50%) translate(${lx}px, ${ly + offsetY}px)`,
          color: labelColor,
          backgroundColor: labelBgColor,
          borderColor: borderColor,
          fontSize,
          whiteSpace: 'nowrap',
          cursor: isDragging ? CURSOR_DRAG_ACTIVE : CURSOR_SELECT,
          zIndex: isDragging ? 1000 : undefined,
          userSelect: isEditing ? 'text' : 'none',
        }}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      >
        {isEditing ? (
          <InlineEdit
            value={label}
            onCommit={handleEditCommit}
            onCancel={handleEditCancel}
            color={labelColor}
            fontSize={fontSize}
            style={{ minWidth: 30 }}
          />
        ) : (
          label
        )}
      </div>
    </EdgeLabelRenderer>
  );
};

export default React.memo(EdgeLabel);
