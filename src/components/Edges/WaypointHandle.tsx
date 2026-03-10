// ---------------------------------------------------------------------------
// WaypointHandle.tsx -- Draggable circle at a waypoint position on an edge
// ---------------------------------------------------------------------------

import React, { useCallback, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useFlowStore } from '../../store/flowStore';
import { CURSOR_OPEN_HAND, CURSOR_SELECT } from '../../assets/cursors/cursors';

interface WaypointHandleProps {
  /** Edge ID this waypoint belongs to */
  edgeId: string;
  /** Index of this waypoint in the waypoints array */
  index: number;
  /** Center X in flow coords */
  cx: number;
  /** Center Y in flow coords */
  cy: number;
  /** Edge stroke color */
  color: string;
  /** Whether this is an auto-computed elbow (not yet persisted) */
  isAutoElbow?: boolean;
  /** All auto-elbow positions (needed to persist on first drag) */
  autoElbows?: Array<{ x: number; y: number }>;
  /** Previous point (source or prior waypoint) for angle + snap */
  prevPoint?: { x: number; y: number };
  /** Next point (target or next waypoint) for angle + snap */
  nextPoint?: { x: number; y: number };
}

const HANDLE_RADIUS = 5;
/** Distance (in flow coords) within which waypoint snaps to adjacent axis */
const SNAP_THRESHOLD = 8;

/** Compute the interior angle (in degrees) at point B given A→B→C */
const computeAngle = (
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
): number => {
  const ba = { x: a.x - b.x, y: a.y - b.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };
  const dot = ba.x * bc.x + ba.y * bc.y;
  const magBA = Math.sqrt(ba.x * ba.x + ba.y * ba.y);
  const magBC = Math.sqrt(bc.x * bc.x + bc.y * bc.y);
  if (magBA === 0 || magBC === 0) return 0;
  const cos = Math.max(-1, Math.min(1, dot / (magBA * magBC)));
  return Math.round(Math.acos(cos) * (180 / Math.PI));
};

const WaypointHandle: React.FC<WaypointHandleProps> = ({
  edgeId,
  index,
  cx,
  cy,
  color,
  isAutoElbow,
  autoElbows,
  prevPoint,
  nextPoint,
}) => {
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const { screenToFlowPosition } = useReactFlow();

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();

      // If this is an auto-elbow, persist all auto-elbows as real waypoints first
      if (isAutoElbow && autoElbows) {
        useFlowStore.getState().updateEdgeData(edgeId, {
          waypoints: autoElbows.map(wp => ({ ...wp })),
        });
      }

      const startFlow = screenToFlowPosition({ x: e.clientX, y: e.clientY });

      // Apply grab cursor to body during drag
      document.body.style.cursor = CURSOR_OPEN_HAND;
      setDragging(true);

      // Collect adjacent snap targets (prev/next point X and Y values)
      const edge = useFlowStore.getState().edges.find((ed) => ed.id === edgeId);
      const allWps = edge?.data?.waypoints as Array<{ x: number; y: number }> | undefined;
      const snapTargetsX: number[] = [];
      const snapTargetsY: number[] = [];
      if (prevPoint) { snapTargetsX.push(prevPoint.x); snapTargetsY.push(prevPoint.y); }
      if (nextPoint) { snapTargetsX.push(nextPoint.x); snapTargetsY.push(nextPoint.y); }
      if (allWps) {
        if (index > 0) { snapTargetsX.push(allWps[index - 1].x); snapTargetsY.push(allWps[index - 1].y); }
        if (index < allWps.length - 1) { snapTargetsX.push(allWps[index + 1].x); snapTargetsY.push(allWps[index + 1].y); }
      }

      const handleMouseMove = (ev: MouseEvent) => {
        const currentFlow = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
        const dx = currentFlow.x - startFlow.x;
        const dy = currentFlow.y - startFlow.y;

        let newX = cx + dx;
        let newY = cy + dy;

        // Shift held → snap angle from prevPoint to 15° increments
        if (ev.shiftKey && prevPoint) {
          const rawAngle = Math.atan2(newY - prevPoint.y, newX - prevPoint.x);
          const deg = rawAngle * (180 / Math.PI);
          const snappedDeg = Math.round(deg / 15) * 15;
          const snappedRad = snappedDeg * (Math.PI / 180);
          const dist = Math.sqrt((newX - prevPoint.x) ** 2 + (newY - prevPoint.y) ** 2);
          newX = prevPoint.x + dist * Math.cos(snappedRad);
          newY = prevPoint.y + dist * Math.sin(snappedRad);
        } else {
          // Snap to adjacent point axes when close
          for (const sx of snapTargetsX) {
            if (Math.abs(newX - sx) < SNAP_THRESHOLD) { newX = sx; break; }
          }
          for (const sy of snapTargetsY) {
            if (Math.abs(newY - sy) < SNAP_THRESHOLD) { newY = sy; break; }
          }
        }

        const currentEdge = useFlowStore.getState().edges.find((ed) => ed.id === edgeId);
        if (!currentEdge?.data?.waypoints) return;
        const wps = [...(currentEdge.data.waypoints as Array<{ x: number; y: number }>)];
        wps[index] = { x: newX, y: newY };
        useFlowStore.getState().updateEdgeData(edgeId, { waypoints: wps });
      };

      const handleMouseUp = () => {
        document.body.style.cursor = '';
        setDragging(false);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [edgeId, index, cx, cy, screenToFlowPosition, isAutoElbow, autoElbows, prevPoint, nextPoint],
  );

  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      if (isAutoElbow && autoElbows) {
        // Persist auto-elbows minus the clicked one
        const wps = autoElbows.filter((_, i) => i !== index);
        useFlowStore.getState().updateEdgeData(edgeId, {
          waypoints: wps.length > 0 ? wps : undefined,
        });
        return;
      }

      // Remove this waypoint
      const edge = useFlowStore.getState().edges.find((ed) => ed.id === edgeId);
      if (!edge?.data?.waypoints) return;
      const wps = (edge.data.waypoints as Array<{ x: number; y: number }>).filter(
        (_, i) => i !== index,
      );
      useFlowStore.getState().updateEdgeData(edgeId, {
        waypoints: wps.length > 0 ? wps : undefined,
      });
    },
    [edgeId, index, isAutoElbow, autoElbows],
  );

  // Compute angle for display
  const showAngle = dragging && prevPoint && nextPoint;
  const angle = showAngle ? computeAngle(prevPoint, { x: cx, y: cy }, nextPoint) : 0;

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={HANDLE_RADIUS}
        style={{
          fill: 'white',
          stroke: color,
          strokeWidth: 1.5,
          opacity: hovered || dragging ? 1 : 0.7,
          cursor: CURSOR_SELECT,
          transition: 'opacity 0.15s',
          pointerEvents: 'all',
        }}
        onMouseDown={onMouseDown}
        onDoubleClick={onDoubleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      {/* Angle badge — shown while dragging */}
      {showAngle && (
        <g transform={`translate(${cx + 12}, ${cy - 12})`} style={{ pointerEvents: 'none' }}>
          <rect
            x={-2}
            y={-11}
            width={36}
            height={16}
            rx={4}
            fill="rgba(0,0,0,0.75)"
          />
          <text
            x={16}
            y={1}
            textAnchor="middle"
            fill="white"
            fontSize={10}
            fontFamily="monospace"
            fontWeight={600}
          >
            {angle}°
          </text>
        </g>
      )}
    </g>
  );
};

export default React.memo(WaypointHandle);
