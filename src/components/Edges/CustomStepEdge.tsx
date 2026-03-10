// ---------------------------------------------------------------------------
// CustomStepEdge.tsx -- Right-angle step edge with custom styling
// ---------------------------------------------------------------------------

import React, { useRef } from 'react';
import { type EdgeProps, getSmoothStepPath } from '@xyflow/react';
import { useUIStore } from '../../store/uiStore';
import { useStyleStore } from '../../store/styleStore';
import { useFlowStore } from '../../store/flowStore';
import { resolveEdgeStyle } from '../../utils/themeResolver';
import { diagramStyles } from '../../styles/diagramStyles';
import { useEdgeVisuals } from './useEdgeVisuals';
import { useEdgeTypeDrag } from './useEdgeTypeDrag';
import EdgeLabel from './EdgeLabel';
import EdgeTypeDragHandle from './EdgeTypeDragHandle';
import EdgeReconnectIndicator from './EdgeReconnectIndicator';
import WaypointHandle from './WaypointHandle';
import SegmentHandle from './SegmentHandle';
import { buildWaypointPath, computeStepElbows } from './waypointPath';
import { useAddWaypoint } from './useAddWaypoint';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INTERACTION_PATH_WIDTH = 20;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CustomStepEdge: React.FC<EdgeProps> = ({
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
  const autoElbowsRef = useRef<Array<{ x: number; y: number }>>([]);

  // Determine edge subtype from store (smoothstep vs step)
  const edgeType = (useFlowStore.getState().edges.find(e => e.id === id)?.type ?? 'smoothstep') as 'smoothstep' | 'step';

  let edgePath: string;
  let labelX: number;
  let labelY: number;

  if (waypoints && waypoints.length > 0) {
    [edgePath, labelX, labelY] = buildWaypointPath({
      sourceX, sourceY, targetX, targetY,
      sourcePosition, targetPosition,
      waypoints, edgeType,
    });
  } else {
    // Auto-compute elbow waypoints for step routing
    const autoElbows = computeStepElbows(
      sourceX, sourceY, sourcePosition,
      targetX, targetY, targetPosition,
    );
    autoElbowsRef.current = autoElbows;

    if (autoElbows.length > 0) {
      [edgePath, labelX, labelY] = buildWaypointPath({
        sourceX, sourceY, targetX, targetY,
        sourcePosition, targetPosition,
        waypoints: autoElbows,
        edgeType,
      });
    } else {
      [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX, sourceY, targetX, targetY,
        sourcePosition, targetPosition,
        borderRadius: 8,
      });
    }
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
          {/* Waypoint handles — stored waypoints or auto-computed elbows */}
          {(() => {
            const wps = waypoints && waypoints.length > 0 ? waypoints : autoElbowsRef.current;
            const isAuto = !(waypoints && waypoints.length > 0);
            if (wps.length === 0) return null;

            // Build full point list: source → waypoints → target
            const allPts = [
              { x: sourceX, y: sourceY },
              ...wps,
              { x: targetX, y: targetY },
            ];

            return (
              <>
                {/* Elbow corner handles */}
                {wps.map((wp, i) =>
                  isAuto ? (
                    <WaypointHandle key={`auto-${i}`} edgeId={id} index={i} cx={wp.x} cy={wp.y} color={strokeColor} isAutoElbow autoElbows={autoElbowsRef.current} prevPoint={allPts[i]} nextPoint={allPts[i + 2]} />
                  ) : (
                    <WaypointHandle key={i} edgeId={id} index={i} cx={wp.x} cy={wp.y} color={strokeColor} prevPoint={allPts[i]} nextPoint={allPts[i + 2]} />
                  )
                )}
                {/* Segment arm handles (midpoint of each segment between consecutive waypoints) */}
                {wps.length >= 2 && allPts.map((pt, i) => {
                  if (i >= allPts.length - 1) return null;
                  const next = allPts[i + 1];
                  // Only show segment handles between waypoint pairs (skip source→wp0 and wpN→target)
                  if (i === 0 || i >= allPts.length - 2) return null;
                  const midX = (pt.x + next.x) / 2;
                  const midY = (pt.y + next.y) / 2;
                  const isHoriz = Math.abs(pt.y - next.y) < Math.abs(pt.x - next.x);
                  // startIdx/endIdx refer to waypoint indices (allPts index - 1 for the offset from source)
                  const wpStartIdx = i - 1;
                  const wpEndIdx = i;
                  return (
                    <SegmentHandle
                      key={`seg-${i}`}
                      edgeId={id}
                      startIdx={wpStartIdx}
                      endIdx={wpEndIdx}
                      cx={midX}
                      cy={midY}
                      orientation={isHoriz ? 'horizontal' : 'vertical'}
                      color={strokeColor}
                      isAutoElbow={isAuto || undefined}
                      autoElbows={isAuto ? autoElbowsRef.current : undefined}
                    />
                  );
                })}
              </>
            );
          })()}
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

export default React.memo(CustomStepEdge);
