import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import { useFlowStore, type FlowNodeData } from '../store/flowStore';
import { useUIStore } from '../store/uiStore';
import { useSettingsStore } from '../store/settingsStore';
import { useStyleStore } from '../store/styleStore';
import { diagramStyles } from '../styles/diagramStyles';
import { resolveNodeStyle } from '../utils/themeResolver';
import { recolorSvg } from './recolorSvg';
import { DependencyBadge } from '../components/Dependencies';
import { StatusBadge } from '../components/Canvas/GenericShapeNode';
import { getStatusIndicators } from '../store/flowStore';
import chroma from 'chroma-js';
import {
  CURSOR_RESIZE_WIDTH,
  CURSOR_RESIZE_HEIGHT,
  CURSOR_RESIZE_CORNER,
  CURSOR_RESIZE_CORNER_NESW,
} from '../assets/cursors/cursors';

// ---------------------------------------------------------------------------
// ExtensionNode — renders extension SVG shapes with recoloring and labels
// ---------------------------------------------------------------------------

const MIN_WIDTH = 40;
const MIN_HEIGHT = 30;

const ExtensionNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const nodeData = data as FlowNodeData;
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const updateNodePosition = useFlowStore((s) => s.updateNodePosition);
  const activeStyleId = useStyleStore((s) => s.activeStyleId);
  const activeStyle = activeStyleId ? diagramStyles[activeStyleId] ?? null : null;
  const isEditingNode = useUIStore((s) => s.isEditingNode);
  const setIsEditingNode = useUIStore((s) => s.setIsEditingNode);
  const selectionColor = useUIStore((s) => s.selectionColor);
  const selectionThickness = useUIStore((s) => s.selectionThickness);
  const presentationMode = useUIStore((s) => s.presentationMode);
  const defaultFontFamily = useSettingsStore((s) => s.nodeDefaults.fontFamily);
  const reactFlowInstance = useReactFlow();

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
  // Extension SVGs are outline-only (fill="none"), so text must contrast with the
  // canvas background, not the node fill.  The theme fontColor (e.g. #ffffff in
  // Flat Material) assumes filled shapes, so we check contrast against the canvas
  // before using it.
  const darkMode = useStyleStore((s) => s.darkMode);
  const canvasBg = activeStyle?.canvas?.background || (darkMode ? '#1a1a2e' : '#ffffff');
  const themeFontColor = activeStyle?.nodeDefaults.fontColor;
  const fallbackTextColor = darkMode ? '#e2e8f0' : '#1e293b';
  let textColor: string;
  if (nodeData.textColor) {
    textColor = nodeData.textColor;
  } else if (themeFontColor) {
    // Only use the theme font color if it contrasts with the canvas background
    try {
      const contrast = chroma.contrast(themeFontColor, canvasBg);
      textColor = contrast >= 3 ? themeFontColor : fallbackTextColor;
    } catch {
      textColor = fallbackTextColor;
    }
  } else {
    textColor = fallbackTextColor;
  }
  // Use a fixed default size for extension labels so they stay consistent across
  // themes (theme fontSize varies 12-18 and is tuned for filled shapes, not icons).
  const fontSize = nodeData.fontSize || 14;
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

  // ---- Custom resize handles ----
  // Tracks which edges are being resized: 'left'|'right'|'top'|'bottom' or combos
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, edges: ('left' | 'right' | 'top' | 'bottom')[]) => {
      e.stopPropagation();
      e.preventDefault();

      const node = reactFlowInstance.getNode(id);
      if (!node) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const startW = nodeData.width || 80;
      const startH = nodeData.height || 80;
      const startPos = { x: node.position.x, y: node.position.y };
      const zoom = reactFlowInstance.getZoom();

      const onMove = (me: MouseEvent) => {
        const deltaX = (me.clientX - startX) / zoom;
        const deltaY = (me.clientY - startY) / zoom;

        let newW = startW;
        let newH = startH;
        let newX = startPos.x;
        let newY = startPos.y;

        for (const edge of edges) {
          if (edge === 'right') {
            newW = Math.max(MIN_WIDTH, startW + deltaX);
          } else if (edge === 'left') {
            const proposed = startW - deltaX;
            newW = Math.max(MIN_WIDTH, proposed);
            // Move position to keep right edge fixed
            newX = startPos.x + (startW - newW);
          } else if (edge === 'bottom') {
            newH = Math.max(MIN_HEIGHT, startH + deltaY);
          } else if (edge === 'top') {
            const proposed = startH - deltaY;
            newH = Math.max(MIN_HEIGHT, proposed);
            newY = startPos.y + (startH - newH);
          }
        }

        updateNodeData(id, { width: newW, height: newH });
        updateNodePosition(id, { x: newX, y: newY });

        // Broadcast resize for swimlane/group tracking
        window.dispatchEvent(new CustomEvent('charthero:node-resize', {
          detail: { nodeId: id, x: newX, y: newY, width: newW, height: newH },
        }));

        // Propagate to multi-selected nodes
        const { selectedNodes } = useFlowStore.getState();
        if (selectedNodes.length > 1) {
          for (const nid of selectedNodes) {
            if (nid !== id) {
              updateNodeData(nid, { width: newW, height: newH });
            }
          }
        }
      };

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        window.dispatchEvent(new CustomEvent('charthero:node-resize-end'));
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [id, nodeData.width, nodeData.height, reactFlowInstance, updateNodeData, updateNodePosition],
  );

  // ---- Bake opacity into colors ----
  const applyOpacity = (c: string, o: number): string => {
    if (o >= 1 || !c || c === 'transparent' || c === 'none') return c;
    try { return chroma(c).alpha(chroma(c).alpha() * o).css(); } catch { return c; }
  };

  const effectiveFill = applyOpacity(fillColor, opacity);
  // Extension SVGs are outline-based.  When the theme sets stroke to transparent
  // or none (e.g. Flat Material), use the fill color for strokes so outlines
  // remain visible.
  const isInvisibleBorder = !borderColor || borderColor === 'transparent' || borderColor === 'none';
  const effectiveBorder = isInvisibleBorder ? applyOpacity(fillColor, opacity) : applyOpacity(borderColor, opacity);

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
  // Label width can be wider than the icon via labelWidth; defaults to node width
  const labelW = (nodeData.labelWidth as number | undefined) || width;

  const labelEl = (overlay: boolean) => {
    const baseStyle: React.CSSProperties = {
      color: textColor,
      fontSize,
      fontWeight,
      fontFamily,
      textAlign: 'center' as const,
      width: labelW,
      wordBreak: 'break-word' as const,
      overflowWrap: 'break-word' as const,
      lineHeight: 1.3,
      // Centre the label under/over the icon even when wider
      marginLeft: overlay ? undefined : (width - labelW) / 2,
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
      {/* Custom resize handles + selection border */}
      {isSelected && (
        <>
          {/* Selection outline border */}
          <div
            style={{
              position: 'absolute',
              inset: -1,
              border: `${selectionThickness * 0.75}px solid ${selectionColor}`,
              borderRadius: 4,
              pointerEvents: 'none',
              zIndex: 40,
            }}
          />

          {/* ---- Edge handles (constrained to one dimension) ---- */}
          {/* Top edge → height only */}
          <div
            className="nodrag nopan"
            style={{
              position: 'absolute', top: -5, left: 6, right: 6, height: 10,
              cursor: CURSOR_RESIZE_HEIGHT, zIndex: 45,
            }}
            onMouseDown={(e) => handleResizeStart(e, ['top'])}
          />
          {/* Bottom edge → height only */}
          <div
            className="nodrag nopan"
            style={{
              position: 'absolute', bottom: -5, left: 6, right: 6, height: 10,
              cursor: CURSOR_RESIZE_HEIGHT, zIndex: 45,
            }}
            onMouseDown={(e) => handleResizeStart(e, ['bottom'])}
          />
          {/* Left edge → width only */}
          <div
            className="nodrag nopan"
            style={{
              position: 'absolute', left: -5, top: 6, bottom: 6, width: 10,
              cursor: CURSOR_RESIZE_WIDTH, zIndex: 45,
            }}
            onMouseDown={(e) => handleResizeStart(e, ['left'])}
          />
          {/* Right edge → width only */}
          <div
            className="nodrag nopan"
            style={{
              position: 'absolute', right: -5, top: 6, bottom: 6, width: 10,
              cursor: CURSOR_RESIZE_WIDTH, zIndex: 45,
            }}
            onMouseDown={(e) => handleResizeStart(e, ['right'])}
          />

          {/* ---- Corner handles (both dimensions) ---- */}
          {/* Top-left */}
          <div
            className="nodrag nopan"
            style={{
              position: 'absolute', top: -6, left: -6, width: 12, height: 12,
              cursor: CURSOR_RESIZE_CORNER, zIndex: 50,
              backgroundColor: 'white', borderRadius: 6,
              border: `${Math.max(1.5, selectionThickness)}px solid ${selectionColor}`,
            }}
            onMouseDown={(e) => handleResizeStart(e, ['top', 'left'])}
          />
          {/* Top-right */}
          <div
            className="nodrag nopan"
            style={{
              position: 'absolute', top: -6, right: -6, width: 12, height: 12,
              cursor: CURSOR_RESIZE_CORNER_NESW, zIndex: 50,
              backgroundColor: 'white', borderRadius: 6,
              border: `${Math.max(1.5, selectionThickness)}px solid ${selectionColor}`,
            }}
            onMouseDown={(e) => handleResizeStart(e, ['top', 'right'])}
          />
          {/* Bottom-left */}
          <div
            className="nodrag nopan"
            style={{
              position: 'absolute', bottom: -6, left: -6, width: 12, height: 12,
              cursor: CURSOR_RESIZE_CORNER_NESW, zIndex: 50,
              backgroundColor: 'white', borderRadius: 6,
              border: `${Math.max(1.5, selectionThickness)}px solid ${selectionColor}`,
            }}
            onMouseDown={(e) => handleResizeStart(e, ['bottom', 'left'])}
          />
          {/* Bottom-right */}
          <div
            className="nodrag nopan"
            style={{
              position: 'absolute', bottom: -6, right: -6, width: 12, height: 12,
              cursor: CURSOR_RESIZE_CORNER, zIndex: 50,
              backgroundColor: 'white', borderRadius: 6,
              border: `${Math.max(1.5, selectionThickness)}px solid ${selectionColor}`,
            }}
            onMouseDown={(e) => handleResizeStart(e, ['bottom', 'right'])}
          />
        </>
      )}

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
