import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { useFlowStore, type FlowNodeData } from '../store/flowStore';
import { useUIStore } from '../store/uiStore';
import { useSettingsStore } from '../store/settingsStore';
import { useStyleStore } from '../store/styleStore';
import { diagramStyles } from '../styles/diagramStyles';
import { resolveNodeStyle } from '../utils/themeResolver';
import { recolorSvg } from './recolorSvg';
import { DependencyBadge } from '../components/Dependencies';
import chroma from 'chroma-js';

// ---------------------------------------------------------------------------
// ExtensionNode — renders extension SVG shapes with recoloring and labels
// ---------------------------------------------------------------------------

const ExtensionNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const nodeData = data as FlowNodeData;
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const activeStyleId = useStyleStore((s) => s.activeStyleId);
  const activeStyle = activeStyleId ? diagramStyles[activeStyleId] ?? null : null;
  const isEditingNode = useUIStore((s) => s.isEditingNode);
  const setIsEditingNode = useUIStore((s) => s.setIsEditingNode);
  const selectionColor = useUIStore((s) => s.selectionColor);
  const selectionThickness = useUIStore((s) => s.selectionThickness);
  const presentationMode = useUIStore((s) => s.presentationMode);
  const defaultFontFamily = useSettingsStore((s) => s.nodeDefaults.fontFamily);

  const isSelected = selected && !presentationMode;
  const isEditing = isEditingNode === id;

  const [editValue, setEditValue] = useState(nodeData.label);
  const [isRotating, setIsRotating] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const labelPosition = nodeData.labelPosition || 'below';

  // Resolve styling via the theme resolver
  const resolved = resolveNodeStyle(nodeData as unknown as Record<string, unknown>, nodeData.shape || 'rectangle', activeStyle);
  const fillColor = resolved.fill;
  const borderColor = resolved.borderColor;
  const textColor = nodeData.textColor || resolved.textColor || '#1e293b';
  const fontSize = nodeData.fontSize || resolved.fontSize || 14;
  const fontWeight = nodeData.fontWeight || 500;
  const fontFamily = nodeData.fontFamily || defaultFontFamily || "'Inter', sans-serif";

  const width = nodeData.width || 80;
  const height = nodeData.height || 80;
  const opacity = nodeData.opacity ?? 1;
  const rotation = nodeData.rotation || 0;
  const flipH = nodeData.flipH || false;
  const flipV = nodeData.flipV || false;

  // ---- Focus on edit start ----
  useEffect(() => {
    if (isEditing && inputRef.current) {
      const ta = inputRef.current;
      ta.focus();
      ta.select();
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

  // ---- Double-click to edit ----
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
      if (e.key === 'Enter' && e.shiftKey) return; // Shift+Enter = newline
      if (e.key === 'Enter') {
        commitEdit();
      } else if (e.key === 'Escape') {
        setEditValue(nodeData.label);
        setIsEditingNode(null);
      }
    },
    [commitEdit, nodeData.label, setIsEditingNode],
  );

  // ---- Rotation handle ----
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
      const startMouseAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);

      const onMove = (me: MouseEvent) => {
        const mouseAngle = Math.atan2(me.clientY - centerY, me.clientX - centerX) * (180 / Math.PI);
        let newRotation = startAngle + (mouseAngle - startMouseAngle);
        // Snap to 15-degree increments when shift is held
        if (me.shiftKey) {
          newRotation = Math.round(newRotation / 15) * 15;
        }
        // Normalise to -180..180
        newRotation = ((newRotation + 180) % 360 + 360) % 360 - 180;
        updateNodeData(id, { rotation: newRotation });
      };

      const onUp = () => {
        setIsRotating(false);
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [id, nodeData.rotation, updateNodeData],
  );

  // ---- Bake opacity into colors ----
  const applyOpacity = (c: string, o: number): string => {
    if (o >= 1 || !c || c === 'transparent' || c === 'none') return c;
    try { return chroma(c).alpha(chroma(c).alpha() * o).css(); } catch { return c; }
  };

  const effectiveFill = applyOpacity(fillColor, opacity);
  const effectiveBorder = applyOpacity(borderColor, opacity);

  // ---- Recolor SVG ----
  const recoloredSvg = useMemo(() => {
    if (!nodeData.svgContent) return '';
    return recolorSvg(nodeData.svgContent, effectiveFill, effectiveBorder);
  }, [nodeData.svgContent, effectiveFill, effectiveBorder]);

  // ---- Selection shadow ----
  const selectionShadow = isSelected
    ? `0 0 0 ${selectionThickness + 0.5}px ${selectionColor}, 0 0 8px 2px ${selectionColor}40`
    : '';
  const boxShadow = selectionShadow || 'none';

  // ---- Wrapper transform (rotation) ----
  const wrapperTransformParts: string[] = [];
  if (rotation !== 0) wrapperTransformParts.push(`rotate(${rotation}deg)`);

  const wrapperStyle: React.CSSProperties = {
    width,
    height: labelPosition !== 'overlay' ? 'auto' : height,
    position: 'relative',
    overflow: 'visible',
    transform: wrapperTransformParts.length > 0 ? wrapperTransformParts.join(' ') : undefined,
    transition: 'transform 0.2s',
  };

  // ---- Flip transform for inner content ----
  const flipParts: string[] = [];
  if (flipH) flipParts.push('scaleX(-1)');
  if (flipV) flipParts.push('scaleY(-1)');
  const flipTransform = flipParts.length > 0 ? flipParts.join(' ') : undefined;

  // ---- SVG container style ----
  const svgContainerStyle: React.CSSProperties = {
    width: '100%',
    height: labelPosition === 'overlay' ? '100%' : height,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow,
    borderRadius: 4,
    position: 'relative',
    overflow: 'hidden',
    transform: flipTransform,
    transition: 'box-shadow 0.15s',
  };

  // ---- Label element ----
  const labelEl = (overlay: boolean) => {
    const baseStyle: React.CSSProperties = {
      color: textColor,
      fontSize,
      fontWeight,
      fontFamily,
      textAlign: 'center' as const,
      width: '100%',
      wordBreak: 'break-word' as const,
      overflowWrap: 'break-word' as const,
      lineHeight: 1.3,
    };

    if (overlay) {
      Object.assign(baseStyle, {
        position: 'absolute' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        padding: '2px 4px',
        zIndex: 10,
      });
    } else {
      Object.assign(baseStyle, {
        padding: '2px 4px',
        flexShrink: 0,
      });
    }

    if (isEditing) {
      return (
        <div style={baseStyle}>
          <textarea
            ref={inputRef}
            className="bg-transparent text-center outline-none border-none w-full px-1 resize-none"
            style={{
              color: textColor,
              fontSize,
              fontWeight,
              fontFamily,
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
              const ta = e.target;
              ta.style.height = 'auto';
              ta.style.height = `${ta.scrollHeight}px`;
            }}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
          />
        </div>
      );
    }

    // When no label, render nothing for above/below; still render empty overlay for consistent sizing
    if (!nodeData.label && !overlay) return null;

    return (
      <div style={baseStyle}>
        <span
          className="text-center select-none break-words leading-tight whitespace-pre-wrap"
          style={{ wordBreak: 'break-word', cursor: 'var(--cursor-select)' }}
        >
          {nodeData.label}
        </span>
      </div>
    );
  };

  return (
    <div ref={wrapperRef} style={wrapperStyle} onDoubleClick={handleDoubleClick}>
      <NodeResizer
        isVisible={!!isSelected}
        minWidth={40}
        minHeight={30}
        lineStyle={{ borderColor: selectionColor, borderWidth: selectionThickness * 0.5 }}
        handleStyle={{
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: 'white',
          border: `${Math.max(1.5, selectionThickness)}px solid ${selectionColor}`,
          zIndex: 50,
        }}
        onResize={(_event, params) => {
          updateNodeData(id, { width: params.width, height: params.height });
          const { selectedNodes } = useFlowStore.getState();
          if (selectedNodes.length > 1) {
            for (const nid of selectedNodes) {
              if (nid !== id) {
                updateNodeData(nid, { width: params.width, height: params.height });
              }
            }
          }
          window.dispatchEvent(new CustomEvent('charthero:node-resize', {
            detail: { nodeId: id, x: params.x, y: params.y, width: params.width, height: params.height },
          }));
        }}
        onResizeEnd={() => {
          window.dispatchEvent(new CustomEvent('charthero:node-resize-end'));
        }}
      />

      {/* Rotation handle -- visible only when selected */}
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
          <div
            className={`nodrag nopan charthero-rotate-handle${isRotating ? ' rotating' : ''}`}
            onMouseDown={handleRotateStart}
            data-tooltip={`${Math.round(rotation)}deg`}
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

      {/* Dependency badges overlay */}
      <DependencyBadge nodeId={id} />

      {/* Label above SVG */}
      {labelPosition === 'above' && labelEl(false)}

      {/* SVG artwork container */}
      <div style={svgContainerStyle}>
        {recoloredSvg && (
          <div
            style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            dangerouslySetInnerHTML={{ __html: recoloredSvg }}
          />
        )}
        {/* Overlay label (centered over SVG) */}
        {labelPosition === 'overlay' && labelEl(true)}
      </div>

      {/* Label below SVG */}
      {labelPosition === 'below' && labelEl(false)}

      {/* Connection handles -- each position has both source + target for bidirectional edges */}
      <Handle type="target" position={Position.Top} id="top" className="charthero-handle" />
      <Handle type="source" position={Position.Top} id="top" className="charthero-handle" style={{ left: '50%' }} />
      <Handle type="source" position={Position.Bottom} id="bottom" className="charthero-handle" />
      <Handle type="target" position={Position.Bottom} id="bottom" className="charthero-handle" style={{ left: '50%' }} />
      <Handle type="target" position={Position.Left} id="left" className="charthero-handle" />
      <Handle type="source" position={Position.Left} id="left" className="charthero-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="right" className="charthero-handle" />
      <Handle type="target" position={Position.Right} id="right" className="charthero-handle" style={{ top: '50%' }} />
    </div>
  );
};

export default React.memo(ExtensionNode);
