// ---------------------------------------------------------------------------
// CustomBezierEdge.tsx -- Bezier curve edge with custom styling
// ---------------------------------------------------------------------------

import React from 'react';
import { type EdgeProps, getBezierPath } from '@xyflow/react';
import { useUIStore } from '../../store/uiStore';
import { useStyleStore } from '../../store/styleStore';
import { resolveEdgeStyle } from '../../utils/themeResolver';
import { diagramStyles } from '../../styles/diagramStyles';
import { useEdgeVisuals } from './useEdgeVisuals';
import { useEdgeTypeDrag } from './useEdgeTypeDrag';
import EdgeLabel from './EdgeLabel';
import EdgeTypeDragHandle from './EdgeTypeDragHandle';
import EdgeReconnectIndicator from './EdgeReconnectIndicator';
import WaypointHandle from './WaypointHandle';
import { buildWaypointPath } from './waypointPath';
import { useAddWaypoint } from './useAddWaypoint';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INTERACTION_PATH_WIDTH = 20;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CustomBezierEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style: _style,
  selected,
  markerEnd: markerEndProp,
  markerStart: markerStartProp,
}) => {
  void _style; // read from store via useEdgeVisuals instead (bypasses React Flow memo)
  const ev = useEdgeVisuals(id);
  const darkMode = useStyleStore((s) => s.darkMode);
  const activeStyleId = useStyleStore((s) => s.activeStyleId);
  const activeStyle = activeStyleId ? diagramStyles[activeStyleId] ?? null : null;
  const resolved = resolveEdgeStyle(ev as unknown as Record<string, unknown>, activeStyle);
  const selectionColor = useUIStore((s) => s.selectionColor);
  const selectionThickness = useUIStore((s) => s.selectionThickness);
  const strokeColor = ev.color ?? ev.overrideStroke ?? ev.styleStroke ?? resolved.stroke;
  const strokeWidth = ev.thickness ?? ev.overrideStrokeWidth ?? ev.styleStrokeWidth ?? resolved.strokeWidth;
  const strokeDasharray = ev.strokeDasharray ?? ev.overrideDash ?? ev.styleDash ?? undefined;
  const opacity = ev.opacity ?? ev.overrideOpacity ?? ev.styleOpacity ?? 1;
  const isAnimated = ev.animated;
  const label = ev.label;
  const markerEnd = ev.markerEnd ?? markerEndProp;
  const markerStart = ev.markerStart ?? markerStartProp;
  const onInteractionMouseDown = useEdgeTypeDrag(id, sourceX, sourceY, targetX, targetY);
  const onAddWaypoint = useAddWaypoint(id, sourceX, sourceY, targetX, targetY);
  const waypoints = ev.waypoints;

  let edgePath: string;
  let labelX: number;
  let labelY: number;

  if (waypoints && waypoints.length > 0) {
    [edgePath, labelX, labelY] = buildWaypointPath({
      sourceX, sourceY, targetX, targetY,
      sourcePosition, targetPosition,
      waypoints, edgeType: 'bezier',
    });
  } else {
    [edgePath, labelX, labelY] = getBezierPath({
      sourceX, sourceY, targetX, targetY,
      sourcePosition, targetPosition,
    });
  }

  return (
    <>
      {/* Invisible wider interaction path for easier clicking + drag-to-cycle type */}
      <path
        id={`${id}-interaction`}
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={INTERACTION_PATH_WIDTH}
        className="react-flow__edge-interaction"
        onMouseDown={onInteractionMouseDown}
        onDoubleClick={onAddWaypoint}
      />

      {/* Visible edge path — stroke/strokeWidth MUST be inline styles
           to override React Flow's CSS variables on .react-flow__edge-path */}
      <path
        id={id}
        d={edgePath}
        markerEnd={markerEnd}
        markerStart={markerStart}
        className={`react-flow__edge-path ${selected ? 'selected' : ''}`}
        style={{
          fill: 'none',
          stroke: strokeColor,
          strokeWidth,
          strokeDasharray: isAnimated ? (strokeDasharray ?? '8 4') : strokeDasharray,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          opacity,
          ...(isAnimated ? { animation: 'charthero-edge-dash 0.6s linear infinite' } : {}),
        }}
      />

      {/* Selection highlight */}
      {selected && (
        <path
          d={edgePath}
          className="pointer-events-none"
          style={{
            fill: 'none',
            stroke: selectionColor,
            strokeWidth: strokeWidth + selectionThickness + 1,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            opacity: 0.25,
          }}
        />
      )}

      {/* Selected-only indicators */}
      {selected && (
        <>
          {/* Drag-to-cycle type handle at midpoint */}
          <EdgeTypeDragHandle cx={labelX} cy={labelY} color={strokeColor} onMouseDown={onInteractionMouseDown} />
          {/* Reconnect triangles at endpoints */}
          <EdgeReconnectIndicator cx={sourceX} cy={sourceY} position={sourcePosition} color={strokeColor} />
          <EdgeReconnectIndicator cx={targetX} cy={targetY} position={targetPosition} color={strokeColor} />
          {/* Waypoint handles */}
          {waypoints?.map((wp, i) => {
            const prev = i === 0 ? { x: sourceX, y: sourceY } : waypoints[i - 1];
            const next = i === waypoints.length - 1 ? { x: targetX, y: targetY } : waypoints[i + 1];
            return <WaypointHandle key={i} edgeId={id} index={i} cx={wp.x} cy={wp.y} color={strokeColor} prevPoint={prev} nextPoint={next} />;
          })}
        </>
      )}

      {/* Label (draggable along the path) */}
      {label && (
        <EdgeLabel
          edgeId={id}
          label={label}
          sourceX={sourceX}
          sourceY={sourceY}
          midX={labelX}
          midY={labelY}
          targetX={targetX}
          targetY={targetY}
          labelPosition={ev.labelPosition ?? 0.5}
          labelColor={ev.labelColor ?? ev.overrideLabelFontColor ?? (darkMode ? '#c8d1dc' : '#475569')}
          labelBgColor={ev.labelBgColor ?? ev.overrideLabelBgColor ?? (darkMode ? '#253345' : '#ffffff')}
          borderColor={strokeColor}
          fontSize={ev.labelFontSize ?? ev.overrideLabelFontSize ?? 11}
        />
      )}
    </>
  );
};

export default React.memo(CustomBezierEdge);
