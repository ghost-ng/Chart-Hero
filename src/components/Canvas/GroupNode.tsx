import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { icons } from 'lucide-react';
import chroma from 'chroma-js';
import { useFlowStore, type FlowNodeData, getStatusIndicators } from '../../store/flowStore';
import { useUIStore } from '../../store/uiStore';
import { StatusBadge } from './GenericShapeNode';

const GroupNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const nodeData = data as FlowNodeData;
  const selectionColor = useUIStore((s) => s.selectionColor);
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const label = nodeData.label || 'Group';
  const rawFillColor = nodeData.color || '#f1f5f9';
  const fillOpacity = nodeData.fillOpacity ?? 1;
  const fillColor = (fillOpacity < 1 && rawFillColor && rawFillColor !== 'transparent')
    ? (() => { try { return chroma(rawFillColor).alpha(fillOpacity).css(); } catch { return rawFillColor; } })()
    : rawFillColor;
  const borderColor = nodeData.borderColor || '#94a3b8';
  const textColor = nodeData.textColor || '#475569';
  const width = nodeData.width || 300;
  const height = nodeData.height || 200;
  const borderWidth = nodeData.borderWidth ?? 2;
  const borderStyle = selected ? 'solid' : (nodeData.borderStyle || 'dashed');
  const borderRadius = nodeData.borderRadius ?? 8;
  const fontSize = nodeData.fontSize ?? 12;
  const fontWeight = nodeData.fontWeight ?? 600;
  const fontFamily = nodeData.fontFamily || "'Inter', sans-serif";
  const textAlign = nodeData.textAlign || 'left';
  const opacity = nodeData.opacity ?? 0.6;
  const rotation = nodeData.rotation || 0;
  const flipH = nodeData.flipH || false;
  const flipV = nodeData.flipV || false;

  // Icon support
  const IconComponent = nodeData.icon
    ? (icons as Record<string, React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>>)[nodeData.icon]
    : null;
  const iconColor = nodeData.iconColor || textColor;
  const iconBgColor = nodeData.iconBgColor;
  const iconBorderColor = nodeData.iconBorderColor;
  const iconBorderWidth = nodeData.iconBorderWidth ?? 0;
  const iconSize = nodeData.iconSize || (fontSize + 2);

  const renderIcon = () => {
    if (!IconComponent) return null;
    const iconEl = <IconComponent size={iconSize} className="shrink-0 block" style={{ color: iconColor }} />;
    const hasWrapper = iconBgColor || (iconBorderColor && iconBorderWidth > 0);
    if (!hasWrapper) return iconEl;
    return (
      <span
        className="inline-flex items-center justify-center shrink-0 rounded"
        style={{
          backgroundColor: iconBgColor || 'transparent',
          border: iconBorderWidth > 0 && iconBorderColor ? `${iconBorderWidth}px solid ${iconBorderColor}` : undefined,
          padding: 2,
        }}
      >
        {iconEl}
      </span>
    );
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);
  const [isRotating, setIsRotating] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const commitEdit = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== label) {
      updateNodeData(id, { label: trimmed });
    }
    setIsEditing(false);
  }, [editValue, label, id, updateNodeData]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(label);
    setIsEditing(true);
  }, [label]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { commitEdit(); }
    if (e.key === 'Escape') { setIsEditing(false); }
  }, [commitEdit]);

  // Drag-to-rotate logic
  const handleRotateStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setIsRotating(true);

      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const startAngle = nodeData.rotation || 0;
      const initAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);

      const onMouseMove = (ev: MouseEvent) => {
        const currentAngle = Math.atan2(ev.clientY - centerY, ev.clientX - centerX) * (180 / Math.PI);
        let delta = currentAngle - initAngle;
        let newRotation = startAngle + delta;
        newRotation = ((newRotation % 360) + 360) % 360;
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

  // Visual transforms — rotation on wrapper, flip on inner
  const flipParts: string[] = [];
  if (flipH) flipParts.push('scaleX(-1)');
  if (flipV) flipParts.push('scaleY(-1)');

  return (
    <div
      ref={wrapperRef}
      style={{
        width,
        height,
        position: 'relative',
        overflow: 'visible',
        transform: rotation !== 0 ? `rotate(${rotation}deg)` : undefined,
        transition: 'transform 0.2s',
      }}
    >
      {/* Inner shape with flip transforms */}
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: fillColor,
          border: `${borderWidth}px ${selected ? `solid ${selectionColor}` : `${borderStyle} ${borderColor}`}`,
          borderRadius,
          opacity,
          position: 'relative',
          transform: flipParts.length > 0 ? flipParts.join(' ') : undefined,
          transition: 'box-shadow 0.15s, transform 0.2s',
          boxShadow: selected
            ? `0 0 0 ${1.5}px ${selectionColor}, 0 0 8px 2px ${selectionColor}40`
            : '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        {/* Group label at top — double-click to edit */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            style={{
              position: 'absolute',
              top: 2,
              left: 6,
              fontSize,
              fontWeight,
              color: textColor,
              fontFamily,
              backgroundColor: 'transparent',
              border: `1px solid ${selectionColor || '#3b82f6'}`,
              borderRadius: 3,
              outline: 'none',
              padding: '1px 3px',
              minWidth: 40,
              maxWidth: width - 16,
            }}
          />
        ) : (
          <div
            onDoubleClick={handleDoubleClick}
            style={{
              position: 'absolute',
              top: 4,
              left: textAlign === 'center' ? 0 : textAlign === 'right' ? undefined : 8,
              right: textAlign === 'right' ? 8 : undefined,
              width: textAlign === 'center' ? '100%' : undefined,
              textAlign: textAlign as 'left' | 'center' | 'right',
              fontSize,
              fontWeight,
              color: textColor,
              fontFamily,
              userSelect: 'none',
              cursor: 'var(--cursor-select)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start',
              gap: 4,
            }}
          >
            {renderIcon()}
            {label}
          </div>
        )}

        {/* Connection handles */}
        <Handle type="target" position={Position.Top} />
        <Handle type="source" position={Position.Bottom} />
        <Handle type="target" position={Position.Left} />
        <Handle type="source" position={Position.Right} />
      </div>

      <NodeResizer
        isVisible={!!selected}
        minWidth={100}
        minHeight={80}
        lineStyle={{ borderColor: selectionColor, borderWidth: 1 }}
        handleStyle={{
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: 'white',
          border: `2px solid ${selectionColor}`,
          zIndex: 50,
        }}
        onResize={(_event, params) => {
          updateNodeData(id, { width: params.width, height: params.height });
        }}
      />

      {/* Status puck badges */}
      {(() => {
        const pucks = getStatusIndicators(nodeData);
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
              shape="rectangle"
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

      {/* Rotation handle — visible only when selected */}
      {selected && (
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
    </div>
  );
};

export default React.memo(GroupNode);
