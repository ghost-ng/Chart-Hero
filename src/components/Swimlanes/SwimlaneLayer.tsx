import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useViewport } from '@xyflow/react';

import {
  useSwimlaneStore,
  type SwimlaneItem,
  type SwimlaneOrientation,
} from '../../store/swimlaneStore';
import { useStyleStore } from '../../store/styleStore';
import LaneHeader from './LaneHeader';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_H_HEADER_WIDTH = 48; // px - default width of horizontal lane headers (left column)
const DEFAULT_V_HEADER_HEIGHT = 32; // px - default height of vertical lane headers (top row)
const TITLE_HEIGHT = 28; // px - container title bar height
const MIN_LANE_SIZE = 60; // px - minimum lane size when resizing
const RESIZE_HIT_AREA = 8; // px - width of the resize grab zone
const MIN_H_HEADER_WIDTH = 32; // px - minimum width of horizontal lane headers
const MIN_V_HEADER_HEIGHT = 24; // px - minimum height of vertical lane headers
const CORNER_HANDLE_SIZE = 10; // px - size of corner resize handles
const MIN_CONTAINER_WIDTH = 200; // px - minimum width when corner-resizing
const MIN_CONTAINER_HEIGHT = 150; // px - minimum height when corner-resizing

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build an array of lane bounds from the lane items. */
function computeBounds(
  lanes: SwimlaneItem[],
  _direction: 'horizontal' | 'vertical',
  headerOffset: number,
): Array<{ lane: SwimlaneItem; offset: number; size: number }> {
  const sorted = [...lanes].sort((a, b) => a.order - b.order);
  const result: Array<{ lane: SwimlaneItem; offset: number; size: number }> = [];
  let cursor = headerOffset;

  for (const lane of sorted) {
    if (lane.hidden) {
      result.push({ lane, offset: cursor, size: 0 });
      continue;
    }
    const effectiveSize = lane.collapsed ? 32 : lane.size;
    result.push({ lane, offset: cursor, size: effectiveSize });
    cursor += effectiveSize;
  }

  return result;
}

// ---------------------------------------------------------------------------
// LaneResizeHandle
// ---------------------------------------------------------------------------

interface LaneResizeHandleProps {
  orientation: SwimlaneOrientation;
  laneId: string;
  /** Position of the divider line in flow coordinates */
  dividerOffset: number;
  /** Total span perpendicular to the divider */
  span: number;
  /** Current viewport zoom for converting screen→flow deltas */
  zoom: number;
  /** If true, dragging resizes in the reverse direction (for first lane's leading edge) */
  reverse?: boolean;
}

const LaneResizeHandle: React.FC<LaneResizeHandleProps> = ({
  orientation,
  laneId,
  dividerOffset,
  span,
  zoom,
  reverse,
}) => {
  const startRef = useRef<{ clientPos: number; startSize: number; startOffset: { x: number; y: number } } | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      const store = useSwimlaneStore.getState();
      const lane = store
        .config[orientation === 'horizontal' ? 'horizontal' : 'vertical']
        .find((l) => l.id === laneId);
      if (!lane) return;

      const clientPos = orientation === 'horizontal' ? e.clientY : e.clientX;
      startRef.current = { clientPos, startSize: lane.size, startOffset: { ...store.containerOffset } };

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!startRef.current) return;
        const currentPos =
          orientation === 'horizontal' ? moveEvent.clientY : moveEvent.clientX;
        const deltaScreen = currentPos - startRef.current.clientPos;
        const deltaFlow = deltaScreen / zoom;

        if (reverse) {
          // Reverse: drag left/up = grow, drag right/down = shrink
          const newSize = Math.max(MIN_LANE_SIZE, startRef.current.startSize - deltaFlow);
          const actualDelta = startRef.current.startSize - newSize;
          useSwimlaneStore.getState().updateLane(orientation, laneId, { size: newSize });
          // Shift container offset to compensate so other lanes stay in place
          const newOffset = { ...startRef.current.startOffset };
          if (orientation === 'horizontal') {
            newOffset.y = startRef.current.startOffset.y + actualDelta;
          } else {
            newOffset.x = startRef.current.startOffset.x + actualDelta;
          }
          useSwimlaneStore.getState().setContainerOffset(newOffset);
        } else {
          const newSize = Math.max(MIN_LANE_SIZE, startRef.current.startSize + deltaFlow);
          useSwimlaneStore.getState().updateLane(orientation, laneId, { size: newSize });
        }
      };

      const onMouseUp = () => {
        startRef.current = null;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.body.style.cursor =
        orientation === 'horizontal' ? 'row-resize' : 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [orientation, laneId, zoom, reverse],
  );

  const isH = orientation === 'horizontal';

  const style: React.CSSProperties = isH
    ? {
        position: 'absolute',
        left: 0,
        top: dividerOffset - RESIZE_HIT_AREA / 2,
        width: span,
        height: RESIZE_HIT_AREA,
        cursor: 'row-resize',
        pointerEvents: 'auto',
        zIndex: 10,
      }
    : {
        position: 'absolute',
        left: dividerOffset - RESIZE_HIT_AREA / 2,
        top: 0,
        width: RESIZE_HIT_AREA,
        height: span,
        cursor: 'col-resize',
        pointerEvents: 'auto',
        zIndex: 10,
      };

  return <div style={style} onMouseDown={handleMouseDown} />;
};

// ---------------------------------------------------------------------------
// HeaderResizeHandle — drag to resize the header area width/height
// ---------------------------------------------------------------------------

interface HeaderResizeHandleProps {
  /** 'horizontal' means we're resizing the LEFT header column (drag its right edge) */
  orientation: SwimlaneOrientation;
  /** Position of the resize edge in flow coords */
  edgeOffset: number;
  /** Total span perpendicular to the drag direction */
  span: number;
  /** Current viewport zoom */
  zoom: number;
  /** Current header size (width for horizontal, height for vertical) */
  currentSize: number;
}

const HeaderResizeHandle: React.FC<HeaderResizeHandleProps> = ({
  orientation,
  edgeOffset,
  span,
  zoom,
  currentSize,
}) => {
  const startRef = useRef<{ clientPos: number; startSize: number } | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      const clientPos = orientation === 'horizontal' ? e.clientX : e.clientY;
      startRef.current = { clientPos, startSize: currentSize };

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!startRef.current) return;
        const currentClientPos =
          orientation === 'horizontal' ? moveEvent.clientX : moveEvent.clientY;
        const deltaScreen = currentClientPos - startRef.current.clientPos;
        const deltaFlow = deltaScreen / zoom;

        const minSize = orientation === 'horizontal' ? MIN_H_HEADER_WIDTH : MIN_V_HEADER_HEIGHT;
        const newSize = Math.max(minSize, Math.round(startRef.current.startSize + deltaFlow));

        if (orientation === 'horizontal') {
          useSwimlaneStore.getState().updateLabelConfig({ hHeaderWidth: newSize });
        } else {
          useSwimlaneStore.getState().updateLabelConfig({ vHeaderHeight: newSize });
        }
      };

      const onMouseUp = () => {
        startRef.current = null;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.body.style.cursor =
        orientation === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [orientation, zoom, currentSize],
  );

  // For horizontal lanes: the header is on the left, so the resize handle is a vertical
  // strip at the right edge of the header column (drag left/right = col-resize).
  // For vertical lanes: the header is on top, so the resize handle is a horizontal
  // strip at the bottom edge of the header row (drag up/down = row-resize).
  const isH = orientation === 'horizontal';

  const style: React.CSSProperties = isH
    ? {
        position: 'absolute',
        left: edgeOffset - RESIZE_HIT_AREA / 2,
        top: 0,
        width: RESIZE_HIT_AREA,
        height: span,
        cursor: 'col-resize',
        pointerEvents: 'auto',
        zIndex: 12,
      }
    : {
        position: 'absolute',
        left: 0,
        top: edgeOffset - RESIZE_HIT_AREA / 2,
        width: span,
        height: RESIZE_HIT_AREA,
        cursor: 'row-resize',
        pointerEvents: 'auto',
        zIndex: 12,
      };

  return <div style={style} onMouseDown={handleMouseDown} />;
};

// ---------------------------------------------------------------------------
// MatrixCornerHandle — move/resize handle in the top-left corner of matrix mode
// ---------------------------------------------------------------------------

interface MatrixCornerHandleProps {
  width: number;
  height: number;
  zoom: number;
}

const MatrixCornerHandle: React.FC<MatrixCornerHandleProps> = ({
  width,
  height,
  zoom,
}) => {
  const startRef = useRef<{
    clientX: number;
    clientY: number;
    startOffset: { x: number; y: number };
  } | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      const startOffset = useSwimlaneStore.getState().containerOffset;
      startRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        startOffset: { ...startOffset },
      };

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!startRef.current) return;
        const dx = (moveEvent.clientX - startRef.current.clientX) / zoom;
        const dy = (moveEvent.clientY - startRef.current.clientY) / zoom;
        useSwimlaneStore.getState().setContainerOffset({
          x: startRef.current.startOffset.x + dx,
          y: startRef.current.startOffset.y + dy,
        });
      };

      const onMouseUp = () => {
        startRef.current = null;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.body.style.cursor = 'var(--cursor-move)';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [zoom],
  );

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width,
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'var(--cursor-move)',
        pointerEvents: 'auto',
        zIndex: 11,
        backgroundColor: 'transparent',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Grip dots rendered in visual layer (SwimlaneLayer z:0) — this is interaction-only */}
    </div>
  );
};

// ---------------------------------------------------------------------------
// CornerResizeHandle — drag to resize the swimlane container from a corner
// ---------------------------------------------------------------------------

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface CornerResizeHandleProps {
  corner: Corner;
  totalWidth: number;
  totalHeight: number;
  zoom: number;
  darkMode: boolean;
  visible: boolean;
  /** Header offset that is not part of resizable lane area */
  headerOffsetX: number;
  headerOffsetY: number;
}

const CornerResizeHandle: React.FC<CornerResizeHandleProps> = ({
  corner,
  totalWidth,
  totalHeight,
  zoom,
  darkMode,
  visible,
  headerOffsetX,
  headerOffsetY,
}) => {
  const startRef = useRef<{
    clientX: number;
    clientY: number;
    startOffset: { x: number; y: number };
    startWidth: number;
    startHeight: number;
  } | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      const store = useSwimlaneStore.getState();
      startRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        startOffset: { ...store.containerOffset },
        startWidth: totalWidth,
        startHeight: totalHeight,
      };

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!startRef.current) return;
        const dx = (moveEvent.clientX - startRef.current.clientX) / zoom;
        const dy = (moveEvent.clientY - startRef.current.clientY) / zoom;
        const store = useSwimlaneStore.getState();

        let newWidth = startRef.current.startWidth;
        let newHeight = startRef.current.startHeight;
        const newOffset = { ...startRef.current.startOffset };

        switch (corner) {
          case 'bottom-right':
            newWidth = Math.max(MIN_CONTAINER_WIDTH, startRef.current.startWidth + dx);
            newHeight = Math.max(MIN_CONTAINER_HEIGHT, startRef.current.startHeight + dy);
            break;
          case 'bottom-left':
            newWidth = Math.max(MIN_CONTAINER_WIDTH, startRef.current.startWidth - dx);
            newHeight = Math.max(MIN_CONTAINER_HEIGHT, startRef.current.startHeight + dy);
            // Shift x so the right edge stays fixed
            newOffset.x = startRef.current.startOffset.x + (startRef.current.startWidth - newWidth);
            break;
          case 'top-right':
            newWidth = Math.max(MIN_CONTAINER_WIDTH, startRef.current.startWidth + dx);
            newHeight = Math.max(MIN_CONTAINER_HEIGHT, startRef.current.startHeight - dy);
            // Shift y so the bottom edge stays fixed
            newOffset.y = startRef.current.startOffset.y + (startRef.current.startHeight - newHeight);
            break;
          case 'top-left':
            newWidth = Math.max(MIN_CONTAINER_WIDTH, startRef.current.startWidth - dx);
            newHeight = Math.max(MIN_CONTAINER_HEIGHT, startRef.current.startHeight - dy);
            // Shift both x and y so the bottom-right corner stays fixed
            newOffset.x = startRef.current.startOffset.x + (startRef.current.startWidth - newWidth);
            newOffset.y = startRef.current.startOffset.y + (startRef.current.startHeight - newHeight);
            break;
        }

        // Compute the resizable lane area (total minus headers)
        const laneAreaWidth = newWidth - headerOffsetX;
        const laneAreaHeight = newHeight - headerOffsetY;

        // Proportionally resize vertical lanes (width)
        if (laneAreaWidth > 0 && store.config.vertical.length > 0) {
          store.resizeLanes('vertical', laneAreaWidth);
        }
        // Proportionally resize horizontal lanes (height)
        if (laneAreaHeight > 0 && store.config.horizontal.length > 0) {
          store.resizeLanes('horizontal', laneAreaHeight);
        }

        store.setContainerOffset(newOffset);
      };

      const onMouseUp = () => {
        startRef.current = null;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      const cursorMap: Record<Corner, string> = {
        'top-left': 'nwse-resize',
        'top-right': 'nesw-resize',
        'bottom-left': 'nesw-resize',
        'bottom-right': 'nwse-resize',
      };
      document.body.style.cursor = cursorMap[corner];
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [corner, totalWidth, totalHeight, zoom, headerOffsetX, headerOffsetY],
  );

  const cursorMap: Record<Corner, string> = {
    'top-left': 'nwse-resize',
    'top-right': 'nesw-resize',
    'bottom-left': 'nesw-resize',
    'bottom-right': 'nwse-resize',
  };

  // Position at the appropriate corner
  const positionStyle: React.CSSProperties = {};
  const half = CORNER_HANDLE_SIZE / 2;

  switch (corner) {
    case 'top-left':
      positionStyle.left = -half;
      positionStyle.top = -half;
      break;
    case 'top-right':
      positionStyle.left = totalWidth - half;
      positionStyle.top = -half;
      break;
    case 'bottom-left':
      positionStyle.left = -half;
      positionStyle.top = totalHeight - half;
      break;
    case 'bottom-right':
      positionStyle.left = totalWidth - half;
      positionStyle.top = totalHeight - half;
      break;
  }

  return (
    <div
      className="swimlane-corner-handle"
      style={{
        position: 'absolute',
        ...positionStyle,
        width: CORNER_HANDLE_SIZE,
        height: CORNER_HANDLE_SIZE,
        cursor: cursorMap[corner],
        pointerEvents: 'auto',
        zIndex: 15,
        backgroundColor: darkMode ? '#253345' : '#ffffff',
        border: `1.5px solid ${darkMode ? 'rgba(132,148,167,0.5)' : 'rgba(100,116,139,0.5)'}`,
        borderRadius: 2,
        opacity: visible ? 0.4 : 0,
        transition: 'opacity 150ms ease',
      }}
      onMouseDown={handleMouseDown}
    />
  );
};

// ---------------------------------------------------------------------------
// SwimlaneLayer
// ---------------------------------------------------------------------------

const SwimlaneLayer: React.FC = () => {
  const config = useSwimlaneStore((s) => s.config);
  const containerOffset = useSwimlaneStore((s) => s.containerOffset);
  const darkMode = useStyleStore((s) => s.darkMode);
  const viewport = useViewport();

  const hLanes = config.horizontal;
  const vLanes = config.vertical;
  const hasHLanes = hLanes.length > 0;
  const hasVLanes = vLanes.length > 0;

  const H_HEADER_WIDTH = config.hHeaderWidth ?? DEFAULT_H_HEADER_WIDTH;
  const V_HEADER_HEIGHT = config.vHeaderHeight ?? DEFAULT_V_HEADER_HEIGHT;

  // Determine the active rendering mode
  const isMatrix = hasHLanes && hasVLanes;

  // Compute lane bounds
  const hBounds = useMemo(() => {
    if (!hasHLanes) return [];
    const headerOffset = hasVLanes ? V_HEADER_HEIGHT : 0;
    return computeBounds(hLanes, 'horizontal', headerOffset);
  }, [hLanes, hasVLanes, hasHLanes, V_HEADER_HEIGHT]);

  const vBounds = useMemo(() => {
    if (!hasVLanes) return [];
    const headerOffset = hasHLanes ? H_HEADER_WIDTH : 0;
    return computeBounds(vLanes, 'vertical', headerOffset);
  }, [vLanes, hasHLanes, hasVLanes, H_HEADER_WIDTH]);

  // If no lanes at all, render nothing
  if (!hasHLanes && !hasVLanes) return null;

  // Total dimensions
  const totalWidth = hasVLanes
    ? vBounds.reduce((sum, b) => Math.max(sum, b.offset + b.size), 0)
    : 800;
  const totalHeight = hasHLanes
    ? hBounds.reduce((sum, b) => Math.max(sum, b.offset + b.size), 0)
    : 800;

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0, isolation: 'isolate' }}
    >
      {/* This inner div transforms with the ReactFlow viewport */}
      <div
        style={{
          position: 'absolute',
          transformOrigin: '0 0',
          transform: `translate(${viewport.x + containerOffset.x * viewport.zoom}px, ${viewport.y + containerOffset.y * viewport.zoom}px) scale(${viewport.zoom})`,
          width: totalWidth,
          height: totalHeight,
        }}
      >
        {/* ---- Container title ---- */}
        {config.containerTitle && (() => {
          const titleFs = config.titleFontSize ?? 13;
          const titleH = Math.max(TITLE_HEIGHT, titleFs + 14);
          return (
            <div
              style={{
                position: 'absolute',
                top: -titleH,
                left: hasHLanes ? H_HEADER_WIDTH : 0,
                height: titleH,
                display: 'flex',
                alignItems: 'center',
                paddingLeft: 8,
                fontSize: titleFs,
                fontWeight: 700,
                fontFamily: config.titleFontFamily || undefined,
                color: config.titleColor || (darkMode ? '#c8d1dc' : '#0f172a'),
                whiteSpace: 'nowrap',
                userSelect: 'none',
              }}
            >
              {config.containerTitle}
            </div>
          );
        })()}

        {/* ---- Horizontal lane backgrounds and dividers ---- */}
        {hasHLanes &&
          hBounds.map(({ lane, offset, size }, idx) => {
            if (lane.hidden) return null;
            const ds = config.dividerStyle;
            const divColor = ds?.color || (darkMode ? 'rgba(132,148,167,0.25)' : 'rgba(100,116,139,0.25)');
            const divWidth = ds?.width ?? 1;
            const divStyle = ds?.style ?? 'solid';
            // Check if there's a visible lane before this one (for divider rendering)
            const hasPrevVisible = hBounds.slice(0, idx).some((b) => !b.lane.hidden);
            return (
              <React.Fragment key={`h-${lane.id}`}>
                {/* Background band */}
                <div
                  style={{
                    position: 'absolute',
                    left: hasVLanes ? H_HEADER_WIDTH : H_HEADER_WIDTH,
                    top: offset,
                    width: totalWidth - (hasVLanes ? H_HEADER_WIDTH : H_HEADER_WIDTH),
                    height: size,
                    backgroundColor: lane.color,
                    opacity: lane.colorOpacity != null ? lane.colorOpacity / 100 : (darkMode ? 0.12 : 0.15),
                    pointerEvents: 'none',
                  }}
                />
                {/* Divider line (between visible lanes, not before the first visible) */}
                {hasPrevVisible && divStyle !== 'none' && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: offset - Math.floor(divWidth / 2),
                      width: totalWidth,
                      height: 0,
                      borderTop: `${divWidth}px ${divStyle} ${divColor}`,
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}

        {/* Resize handles are rendered by SwimlaneResizeOverlay (above ReactFlow) */}

        {/* ---- Vertical lane backgrounds and dividers ---- */}
        {hasVLanes &&
          vBounds.map(({ lane, offset, size }, idx) => {
            if (lane.hidden) return null;
            const ds = config.dividerStyle;
            const divColor = ds?.color || (darkMode ? 'rgba(132,148,167,0.25)' : 'rgba(100,116,139,0.25)');
            const divWidth = ds?.width ?? 1;
            const divStyle = ds?.style ?? 'solid';
            const hasPrevVisible = vBounds.slice(0, idx).some((b) => !b.lane.hidden);
            return (
              <React.Fragment key={`v-${lane.id}`}>
                {/* Background band */}
                <div
                  style={{
                    position: 'absolute',
                    left: offset,
                    top: hasHLanes ? V_HEADER_HEIGHT : V_HEADER_HEIGHT,
                    width: size,
                    height: totalHeight - (hasHLanes ? V_HEADER_HEIGHT : V_HEADER_HEIGHT),
                    backgroundColor: lane.color,
                    opacity: lane.colorOpacity != null ? lane.colorOpacity / 100 : (darkMode ? 0.1 : 0.12),
                    pointerEvents: 'none',
                  }}
                />
                {/* Divider line (between visible lanes) */}
                {hasPrevVisible && divStyle !== 'none' && (
                  <div
                    style={{
                      position: 'absolute',
                      left: offset - Math.floor(divWidth / 2),
                      top: 0,
                      width: 0,
                      height: totalHeight,
                      borderLeft: `${divWidth}px ${divStyle} ${divColor}`,
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}

        {/* Resize handles are rendered by SwimlaneResizeOverlay (above ReactFlow) */}

        {/* ---- Matrix cell borders (when both H and V exist) ---- */}
        {isMatrix &&
          hBounds.map(({ lane: hLane, offset: hOffset, size: hSize }) =>
            vBounds.map(({ lane: vLane, offset: vOffset, size: vSize }) => {
              if (hLane.hidden || vLane.hidden) return null;
              return (
                <div
                  key={`cell-${hLane.id}-${vLane.id}`}
                  style={{
                    position: 'absolute',
                    left: vOffset,
                    top: hOffset,
                    width: vSize,
                    height: hSize,
                    border: `1px solid ${
                      darkMode
                        ? 'rgba(148,163,184,0.12)'
                        : 'rgba(100,116,139,0.1)'
                    }`,
                    pointerEvents: 'none',
                  }}
                />
              );
            }),
          )}

        {/* ---- Visual-only headers (rendered behind nodes at z:0) ---- */}
        {hasHLanes && hBounds.map(({ lane, offset, size }) => {
          if (lane.hidden) return null;
          return (
            <LaneHeader
              key={`hdr-vis-h-${lane.id}`}
              laneId={lane.id}
              label={lane.label}
              color={lane.color}
              colorOpacity={lane.colorOpacity}
              orientation="horizontal"
              offset={offset}
              size={size}
              darkMode={darkMode}
              fontSize={config.labelFontSize}
              rotation={config.labelRotation}
              showLabel={lane.showLabel}
              showColor={lane.showColor}
              headerSize={H_HEADER_WIDTH}
              visualOnly
            />
          );
        })}
        {hasVLanes && vBounds.map(({ lane, offset, size }) => {
          if (lane.hidden) return null;
          return (
            <LaneHeader
              key={`hdr-vis-v-${lane.id}`}
              laneId={lane.id}
              label={lane.label}
              color={lane.color}
              colorOpacity={lane.colorOpacity}
              orientation="vertical"
              offset={offset}
              size={size}
              darkMode={darkMode}
              fontSize={config.labelFontSize}
              showLabel={lane.showLabel}
              showColor={lane.showColor}
              headerSize={V_HEADER_HEIGHT}
              visualOnly
            />
          );
        })}

        {/* ---- Matrix corner background + grip dots (visual only, behind nodes) ---- */}
        {isMatrix && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: H_HEADER_WIDTH,
              height: V_HEADER_HEIGHT,
              backgroundColor: darkMode ? 'rgba(37,51,69,0.9)' : 'rgba(255,255,255,0.9)',
              borderRight: `1px solid ${darkMode ? 'rgba(132,148,167,0.3)' : 'rgba(100,116,139,0.25)'}`,
              borderBottom: `1px solid ${darkMode ? 'rgba(132,148,167,0.3)' : 'rgba(100,116,139,0.25)'}`,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width={Math.min(20, H_HEADER_WIDTH - 4)} height={Math.min(20, V_HEADER_HEIGHT - 4)} viewBox="0 0 20 20" fill="none">
              <circle cx="6" cy="6" r="1.5" fill={darkMode ? '#7e8d9f' : '#94a3b8'} />
              <circle cx="14" cy="6" r="1.5" fill={darkMode ? '#7e8d9f' : '#94a3b8'} />
              <circle cx="6" cy="14" r="1.5" fill={darkMode ? '#7e8d9f' : '#94a3b8'} />
              <circle cx="14" cy="14" r="1.5" fill={darkMode ? '#7e8d9f' : '#94a3b8'} />
              <circle cx="10" cy="10" r="1.5" fill={darkMode ? '#7e8d9f' : '#94a3b8'} />
            </svg>
          </div>
        )}

        {/* ---- Outer border ---- */}
        {(() => {
          const cb = config.containerBorder;
          const cbColor = cb?.color || (darkMode ? 'rgba(132,148,167,0.2)' : 'rgba(100,116,139,0.2)');
          const cbWidth = cb?.width ?? 1;
          const cbStyle = cb?.style ?? 'solid';
          const cbRadius = cb?.radius ?? 4;
          if (cbStyle === 'none') return null;
          return (
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: totalWidth,
                height: totalHeight,
                border: `${cbWidth}px ${cbStyle} ${cbColor}`,
                borderRadius: cbRadius,
                pointerEvents: 'none',
              }}
            />
          );
        })()}
      </div>
    </div>
  );
};

export default React.memo(SwimlaneLayer);

// ---------------------------------------------------------------------------
// SwimlaneHeaderLayer — rendered BETWEEN SwimlaneLayer and ReactFlow
// Headers sit below nodes (z-index: 2) but above backgrounds (z-index: 0).
// ---------------------------------------------------------------------------

const SwimlaneHeaderLayerInner: React.FC = () => {
  const config = useSwimlaneStore((s) => s.config);
  const containerOffset = useSwimlaneStore((s) => s.containerOffset);
  const darkMode = useStyleStore((s) => s.darkMode);
  const viewport = useViewport();

  const hLanes = config.horizontal;
  const vLanes = config.vertical;
  const hasHLanes = hLanes.length > 0;
  const hasVLanes = vLanes.length > 0;

  const H_HEADER_WIDTH = config.hHeaderWidth ?? DEFAULT_H_HEADER_WIDTH;
  const V_HEADER_HEIGHT = config.vHeaderHeight ?? DEFAULT_V_HEADER_HEIGHT;

  const hBounds = useMemo(() => {
    if (!hasHLanes) return [];
    const headerOffset = hasVLanes ? V_HEADER_HEIGHT : 0;
    return computeBounds(hLanes, 'horizontal', headerOffset);
  }, [hLanes, hasVLanes, hasHLanes, V_HEADER_HEIGHT]);

  const vBounds = useMemo(() => {
    if (!hasVLanes) return [];
    const headerOffset = hasHLanes ? H_HEADER_WIDTH : 0;
    return computeBounds(vLanes, 'vertical', headerOffset);
  }, [vLanes, hasHLanes, hasVLanes, H_HEADER_WIDTH]);

  if (!hasHLanes && !hasVLanes) return null;

  const totalWidth = hasVLanes
    ? vBounds.reduce((sum, b) => Math.max(sum, b.offset + b.size), 0)
    : 800;
  const totalHeight = hasHLanes
    ? hBounds.reduce((sum, b) => Math.max(sum, b.offset + b.size), 0)
    : 800;

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 3 }}
    >
      <div
        style={{
          position: 'absolute',
          transformOrigin: '0 0',
          transform: `translate(${viewport.x + containerOffset.x * viewport.zoom}px, ${viewport.y + containerOffset.y * viewport.zoom}px) scale(${viewport.zoom})`,
          width: totalWidth,
          height: totalHeight,
        }}
      >
        {hasHLanes &&
          hBounds.map(({ lane, offset, size }) => {
            if (lane.hidden) return null;
            return (
              <LaneHeader
                key={`hdr-h-${lane.id}`}
                laneId={lane.id}
                label={lane.label}
                color={lane.color}
                colorOpacity={lane.colorOpacity}
                orientation="horizontal"
                offset={offset}
                size={size}
                darkMode={darkMode}
                fontSize={config.labelFontSize}
                rotation={config.labelRotation}
                showLabel={lane.showLabel}
                showColor={lane.showColor}
                headerSize={H_HEADER_WIDTH}
              />
            );
          })}
        {hasVLanes &&
          vBounds.map(({ lane, offset, size }) => {
            if (lane.hidden) return null;
            return (
              <LaneHeader
                key={`hdr-v-${lane.id}`}
                laneId={lane.id}
                label={lane.label}
                color={lane.color}
                colorOpacity={lane.colorOpacity}
                orientation="vertical"
                offset={offset}
                size={size}
                darkMode={darkMode}
                fontSize={config.labelFontSize}
                showLabel={lane.showLabel}
                showColor={lane.showColor}
                headerSize={V_HEADER_HEIGHT}
              />
            );
          })}

        {/* Matrix corner move handle — same layer as headers for consistent interactivity */}
        {hasHLanes && hasVLanes && (
          <MatrixCornerHandle
            width={H_HEADER_WIDTH}
            height={V_HEADER_HEIGHT}
            zoom={viewport.zoom}
          />
        )}
      </div>
    </div>
  );
};

export const SwimlaneHeaderLayer = React.memo(SwimlaneHeaderLayerInner);

// ---------------------------------------------------------------------------
// SwimlaneResizeOverlay — rendered ABOVE ReactFlow so handles receive events
// ---------------------------------------------------------------------------


const SwimlaneResizeOverlayInner: React.FC<{ readOnly?: boolean }> = ({ readOnly }) => {
  const config = useSwimlaneStore((s) => s.config);
  const containerOffset = useSwimlaneStore((s) => s.containerOffset);
  const selected = useSwimlaneStore((s) => s.swimlaneSelected);
  const setSwimlaneSelected = useSwimlaneStore((s) => s.setSwimlaneSelected);
  const darkMode = useStyleStore((s) => s.darkMode);
  const viewport = useViewport();
  const containerRef = useRef<HTMLDivElement>(null);

  // Deselect when clicking outside the swimlane container
  useEffect(() => {
    if (!selected) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSwimlaneSelected(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [selected, setSwimlaneSelected]);

  const hLanes = config.horizontal;
  const vLanes = config.vertical;
  const hasHLanes = hLanes.length > 0;
  const hasVLanes = vLanes.length > 0;

  const H_HEADER_WIDTH = config.hHeaderWidth ?? DEFAULT_H_HEADER_WIDTH;
  const V_HEADER_HEIGHT = config.vHeaderHeight ?? DEFAULT_V_HEADER_HEIGHT;

  const hBounds = useMemo(() => {
    if (!hasHLanes) return [];
    const headerOffset = hasVLanes ? V_HEADER_HEIGHT : 0;
    return computeBounds(hLanes, 'horizontal', headerOffset);
  }, [hLanes, hasVLanes, hasHLanes, V_HEADER_HEIGHT]);

  const vBounds = useMemo(() => {
    if (!hasVLanes) return [];
    const headerOffset = hasHLanes ? H_HEADER_WIDTH : 0;
    return computeBounds(vLanes, 'vertical', headerOffset);
  }, [vLanes, hasHLanes, hasVLanes, H_HEADER_WIDTH]);

  if (!hasHLanes && !hasVLanes) return null;

  const totalWidth = hasVLanes
    ? vBounds.reduce((sum, b) => Math.max(sum, b.offset + b.size), 0)
    : 800;
  const totalHeight = hasHLanes
    ? hBounds.reduce((sum, b) => Math.max(sum, b.offset + b.size), 0)
    : 800;

  // Compute header offsets for corner resize proportional calculation
  const headerOffsetX = hasVLanes ? (hasHLanes ? H_HEADER_WIDTH : 0) : 0;
  const headerOffsetY = hasHLanes ? (hasVLanes ? V_HEADER_HEIGHT : 0) : 0;

  // Move handle dimensions for all modes (matrix and non-matrix)
  // Move handle is now rendered in SwimlaneHeaderLayer

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 5 }}
    >
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          transformOrigin: '0 0',
          transform: `translate(${viewport.x + containerOffset.x * viewport.zoom}px, ${viewport.y + containerOffset.y * viewport.zoom}px) scale(${viewport.zoom})`,
          width: totalWidth,
          height: totalHeight,
          outline: selected ? `2px dashed ${darkMode ? 'rgba(96,165,250,0.5)' : 'rgba(59,130,246,0.5)'}` : 'none',
          outlineOffset: 2,
        }}
      >
        {/* ---- Corner click zones to select the swimlane (always present) ---- */}
        {/* pointer-events: none — these zones don't block nodes above.
            Swimlane selection is handled via Shift+click on resize handles
            or marquee selection in FlowCanvas. */}

        {/* ---- Corner resize handles (only visible when swimlane is selected) ---- */}
        {!readOnly && selected && (['top-left', 'top-right', 'bottom-left', 'bottom-right'] as Corner[]).map(
          (corner) => (
            <CornerResizeHandle
              key={`corner-${corner}`}
              corner={corner}
              totalWidth={totalWidth}
              totalHeight={totalHeight}
              zoom={viewport.zoom}
              darkMode={darkMode}
              visible={true}
              headerOffsetX={headerOffsetX}
              headerOffsetY={headerOffsetY}
            />
          ),
        )}

        {/* Lane headers are now rendered by SwimlaneHeaderLayer (below nodes, above backgrounds) */}

        {!readOnly && (<>
        {/* Handle at the top edge of the first visible horizontal lane */}
        {hasHLanes && (() => {
          const first = hBounds.find((b) => !b.lane.hidden && !b.lane.collapsed);
          if (!first) return null;
          return (
            <LaneResizeHandle
              key={`resize-h-first-${first.lane.id}`}
              orientation="horizontal"
              laneId={first.lane.id}
              dividerOffset={first.offset}
              span={totalWidth}
              zoom={viewport.zoom}
              reverse
            />
          );
        })()}
        {/* Horizontal lane resize handles (between visible lanes) */}
        {hasHLanes &&
          hBounds.map(({ lane, offset }, idx) => {
            if (idx === 0 || lane.collapsed || lane.hidden) return null;
            // Find the previous visible lane
            let prevIdx = idx - 1;
            while (prevIdx >= 0 && (hBounds[prevIdx].lane.hidden || hBounds[prevIdx].lane.collapsed)) prevIdx--;
            if (prevIdx < 0) return null;
            return (
              <LaneResizeHandle
                key={`resize-h-${lane.id}`}
                orientation="horizontal"
                laneId={hBounds[prevIdx].lane.id}
                dividerOffset={offset}
                span={totalWidth}
                zoom={viewport.zoom}
              />
            );
          })}
        {/* Handle at the bottom edge of the last visible horizontal lane */}
        {hasHLanes && (() => {
          const visibleH = hBounds.filter((b) => !b.lane.hidden && !b.lane.collapsed);
          if (visibleH.length === 0) return null;
          const last = visibleH[visibleH.length - 1];
          return (
            <LaneResizeHandle
              key={`resize-h-last-${last.lane.id}`}
              orientation="horizontal"
              laneId={last.lane.id}
              dividerOffset={last.offset + last.size}
              span={totalWidth}
              zoom={viewport.zoom}
            />
          );
        })()}

        {/* Handle at the left edge of the first visible vertical lane */}
        {hasVLanes && (() => {
          const first = vBounds.find((b) => !b.lane.hidden && !b.lane.collapsed);
          if (!first) return null;
          return (
            <LaneResizeHandle
              key={`resize-v-first-${first.lane.id}`}
              orientation="vertical"
              laneId={first.lane.id}
              dividerOffset={first.offset}
              span={totalHeight}
              zoom={viewport.zoom}
              reverse
            />
          );
        })()}
        {/* Vertical lane resize handles (between visible lanes) */}
        {hasVLanes &&
          vBounds.map(({ lane, offset }, idx) => {
            if (idx === 0 || lane.collapsed || lane.hidden) return null;
            let prevIdx = idx - 1;
            while (prevIdx >= 0 && (vBounds[prevIdx].lane.hidden || vBounds[prevIdx].lane.collapsed)) prevIdx--;
            if (prevIdx < 0) return null;
            return (
              <LaneResizeHandle
                key={`resize-v-${lane.id}`}
                orientation="vertical"
                laneId={vBounds[prevIdx].lane.id}
                dividerOffset={offset}
                span={totalHeight}
                zoom={viewport.zoom}
              />
            );
          })}
        {/* Handle at the right edge of the last visible vertical lane */}
        {hasVLanes && (() => {
          const visibleV = vBounds.filter((b) => !b.lane.hidden && !b.lane.collapsed);
          if (visibleV.length === 0) return null;
          const last = visibleV[visibleV.length - 1];
          return (
            <LaneResizeHandle
              key={`resize-v-last-${last.lane.id}`}
              orientation="vertical"
              laneId={last.lane.id}
              dividerOffset={last.offset + last.size}
              span={totalHeight}
              zoom={viewport.zoom}
            />
          );
        })()}

        {/* ---- Header resize handles ---- */}
        {/* Horizontal header: drag right edge to change header column width */}
        {hasHLanes && (
          <HeaderResizeHandle
            orientation="horizontal"
            edgeOffset={H_HEADER_WIDTH}
            span={totalHeight}
            zoom={viewport.zoom}
            currentSize={H_HEADER_WIDTH}
          />
        )}
        {/* Vertical header: drag bottom edge to change header row height */}
        {hasVLanes && (
          <HeaderResizeHandle
            orientation="vertical"
            edgeOffset={V_HEADER_HEIGHT}
            span={totalWidth}
            zoom={viewport.zoom}
            currentSize={V_HEADER_HEIGHT}
          />
        )}

        {/* Move handle is now rendered in SwimlaneHeaderLayer for correct z-ordering */}
        </>)}
      </div>
    </div>
  );
};

export const SwimlaneResizeOverlay = React.memo(SwimlaneResizeOverlayInner);
