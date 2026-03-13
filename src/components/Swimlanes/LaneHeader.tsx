import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { GripVertical, Eye, Palette, Pencil, Trash2, EyeClosed, ChevronRight, Check } from 'lucide-react';
import { useSwimlaneStore, type SwimlaneOrientation } from '../../store/swimlaneStore';
import { useUIStore } from '../../store/uiStore';
import { useMenuPosition } from '../ContextMenu/menuUtils';
import InlineEdit from '../shared/InlineEdit';

// ---------------------------------------------------------------------------
// Color palette for quick lane color changes
// ---------------------------------------------------------------------------

const LANE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#a855f7',
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LaneHeaderProps {
  laneId: string;
  label: string;
  color: string;
  /** Lane background opacity (0-100, undefined = theme default) */
  colorOpacity?: number;
  orientation: SwimlaneOrientation;
  /** Position offset in pixels (x for vertical, y for horizontal) */
  offset: number;
  /** Size in pixels (width for vertical header, height for horizontal header) */
  size: number;
  darkMode: boolean;
  /** Font size for label text (default 10) */
  fontSize?: number;
  /** Label rotation in degrees (-90 to 90, step 15). 0 = default for lane type */
  rotation?: number;
  /** Whether the label is visible (default true) */
  showLabel?: boolean;
  /** Whether the color indicator is visible (default true) */
  showColor?: boolean;
  /** Header width for horizontal lanes / height for vertical lanes (from store) */
  headerSize?: number;
  /** When true, render full visuals but no interactivity (for the z:0 visual layer) */
  visualOnly?: boolean;
}

// ---------------------------------------------------------------------------
// LaneContextMenu
// ---------------------------------------------------------------------------

interface LaneContextMenuProps {
  x: number;
  y: number;
  laneId: string;
  orientation: SwimlaneOrientation;
  darkMode: boolean;
  onClose: () => void;
  onStartEdit: () => void;
}

const LaneContextMenu: React.FC<LaneContextMenuProps> = ({
  x, y, laneId, orientation, darkMode, onClose, onStartEdit,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const updateLane = useSwimlaneStore((s) => s.updateLane);
  const removeLane = useSwimlaneStore((s) => s.removeLane);
  const lane = useSwimlaneStore((s) => {
    for (const c of s.containers) {
      const lanes = orientation === 'horizontal' ? c.config.horizontal : c.config.vertical;
      const found = lanes.find((l: { id: string }) => l.id === laneId);
      if (found) return found;
    }
    return undefined;
  });
  const [showColors, setShowColors] = useState(false);
  const [showVisibility, setShowVisibility] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const menuStyle = useMenuPosition(x, y, menuRef);

  if (!lane) return null;

  const labelVisible = lane.showLabel ?? true;
  const colorVisible = lane.showColor ?? true;
  const laneHidden = lane.hidden ?? false;

  const btnClass = `flex items-center gap-2 w-full px-3 py-1.5 text-left text-sm rounded transition-colors duration-75 cursor-pointer ${
    darkMode ? 'hover:bg-dk-hover text-dk-text' : 'hover:bg-slate-100 text-slate-700'
  }`;
  const dividerClass = `my-1 h-px ${darkMode ? 'bg-dk-hover' : 'bg-slate-200'}`;

  return (
    <>
    {/* Invisible backdrop to capture outside clicks */}
    <div className="fixed inset-0" style={{ zIndex: 9999 }} onMouseDown={onClose} />
    <div
      ref={menuRef}
      className={`min-w-[180px] rounded-lg shadow-xl border p-1 ${
        darkMode ? 'bg-dk-panel border-dk-border' : 'bg-white border-slate-200'
      }`}
      style={menuStyle}
    >
      {/* Lane label at top */}
      <div className={`px-3 py-1.5 text-xs font-semibold ${darkMode ? 'text-dk-muted' : 'text-slate-400'} uppercase tracking-wider`}>
        {lane.label}
      </div>
      <div className={dividerClass} />

      {/* Rename */}
      <button className={btnClass} onClick={() => { onStartEdit(); onClose(); }}>
        <Pencil size={14} />
        Rename Lane
      </button>

      {/* Show submenu — toggle visibility of label and color */}
      <button className={btnClass} onClick={() => setShowVisibility(!showVisibility)}>
        <Eye size={14} />
        <span className="flex-1">Show</span>
        <ChevronRight size={12} className={`transition-transform ${showVisibility ? 'rotate-90' : ''}`} />
      </button>
      {showVisibility && (
        <div className="pl-3">
          <button className={btnClass} onClick={() => {
            updateLane(orientation, laneId, { showLabel: !labelVisible });
          }}>
            {labelVisible ? <Check size={14} /> : <span className="w-[14px]" />}
            Label
          </button>
          <button className={btnClass} onClick={() => {
            updateLane(orientation, laneId, { showColor: !colorVisible });
          }}>
            {colorVisible ? <Check size={14} /> : <span className="w-[14px]" />}
            Color
          </button>
        </div>
      )}

      {/* Toggle lane visibility (hide lane + contents) */}
      <button className={btnClass} onClick={() => {
        updateLane(orientation, laneId, { hidden: !laneHidden });
        onClose();
      }}>
        {laneHidden ? <Eye size={14} /> : <EyeClosed size={14} />}
        {laneHidden ? 'Show Lane & Contents' : 'Hide Lane & Contents'}
      </button>

      <div className={dividerClass} />

      {/* Color picker */}
      <button className={btnClass} onClick={() => setShowColors(!showColors)}>
        <Palette size={14} />
        Change Color
      </button>
      {showColors && (
        <div className="px-3 py-1.5">
          <div className="flex flex-wrap gap-1">
            {LANE_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  updateLane(orientation, laneId, { color: c });
                  onClose();
                }}
                className="w-5 h-5 rounded border border-slate-200 cursor-pointer transition-transform hover:scale-110"
                style={{ backgroundColor: c, outline: c === lane.color ? '2px solid #3b82f6' : 'none', outlineOffset: 1 }}
              />
            ))}
          </div>
          {/* Opacity slider */}
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className={`text-[10px] shrink-0 ${darkMode ? 'text-dk-muted' : 'text-slate-400'}`}>
              Opacity
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={lane.colorOpacity ?? (darkMode ? 12 : 15)}
              onChange={(e) => {
                updateLane(orientation, laneId, { colorOpacity: Number(e.target.value) });
              }}
              className="flex-1 min-w-0 h-3 cursor-pointer accent-primary"
            />
            <span className={`text-[10px] w-7 shrink-0 text-right tabular-nums ${darkMode ? 'text-dk-muted' : 'text-slate-400'}`}>
              {lane.colorOpacity ?? (darkMode ? 12 : 15)}%
            </span>
          </div>
        </div>
      )}

      <div className={dividerClass} />

      {/* Remove */}
      <button className={`${btnClass} text-red-500`} onClick={() => {
        removeLane(orientation, laneId);
        onClose();
      }}>
        <Trash2 size={14} />
        Remove Lane
      </button>
    </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// LaneHeader
// ---------------------------------------------------------------------------

const LaneHeader: React.FC<LaneHeaderProps> = ({
  laneId,
  label,
  color,
  colorOpacity,
  orientation,
  offset,
  size,
  darkMode,
  fontSize: fontSizeProp,
  rotation: rotationProp,
  showLabel: showLabelProp,
  showColor: showColorProp,
  headerSize: headerSizeProp,
  visualOnly = false,
}) => {
  const labelVisible = showLabelProp ?? true;
  const colorVisible = showColorProp ?? true;
  const fs = fontSizeProp ?? 10;
  const rotDeg = rotationProp ?? 0;
  const isHorizontal = orientation === 'horizontal';
  const hdrSize = headerSizeProp ?? (isHorizontal ? 48 : 32);

  // For horizontal lanes: rotation=-90 = vertical text via writingMode.
  // rotation=0 (default) = horizontal text. Other angles use CSS rotate.
  const useWritingMode = isHorizontal && rotDeg === -90;
  const rotateAngle = isHorizontal
    ? (rotDeg === -90 ? 0 : rotDeg)  // -90 uses writingMode; others use CSS rotate
    : rotDeg;                          // vertical lanes: apply angle directly

  const [isEditing, setIsEditing] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const colorSwatchRef = useRef<HTMLDivElement>(null);
  const updateLane = useSwimlaneStore((s) => s.updateLane);

  // Close color picker on outside click or Escape
  useEffect(() => {
    if (!showColorPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (
        colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node) &&
        colorSwatchRef.current && !colorSwatchRef.current.contains(e.target as Node)
      ) {
        setShowColorPicker(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowColorPicker(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [showColorPicker]);

  const handleColorSwatchDblClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Don't trigger label edit
    setShowColorPicker((v) => !v);
  }, []);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleEditCommit = useCallback((trimmed: string) => {
    if (trimmed && trimmed !== label) {
      updateLane(orientation, laneId, { label: trimmed });
    }
    setIsEditing(false);
  }, [label, orientation, laneId, updateLane]);

  const handleEditCancel = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left-click initiates drag
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const activeC = useSwimlaneStore.getState().containers.find((c) => c.id === useSwimlaneStore.getState().activeContainerId);
    const startOffset = activeC?.containerOffset ?? { x: 0, y: 0 };

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      useSwimlaneStore.getState().setContainerOffset({
        x: startOffset.x + dx,
        y: startOffset.y + dy,
      });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  }, []);

  // For horizontal lanes: header on the left side, positioned vertically
  // For vertical lanes: header on top, positioned horizontally
  // Widen the header when label is rotated so angled text has room
  const rotBuffer = Math.abs(rotateAngle) > 0 ? Math.ceil(Math.abs(rotateAngle) * 0.3) : 0;

  // visualOnly = full visuals, no interactivity (rendered at z:0 behind nodes)
  // interactive (default) = transparent visuals, full interactivity (rendered at z:3 above ReactFlow)
  const bgColor = visualOnly
    ? (darkMode ? 'rgba(37,51,69,0.9)' : 'rgba(255,255,255,0.9)')
    : 'transparent';

  const style: React.CSSProperties = isHorizontal
    ? {
        position: 'absolute',
        left: 0,
        top: offset,
        width: hdrSize + rotBuffer,
        height: size,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderRight: visualOnly ? `2px solid ${color}` : 'none',
        backgroundColor: bgColor,
        zIndex: 1,
        overflow: 'visible',
        padding: '4px 2px',
        pointerEvents: visualOnly ? 'none' : 'auto',
      }
    : {
        position: 'absolute',
        left: offset,
        top: 0,
        width: size,
        height: hdrSize + rotBuffer,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottom: visualOnly ? `2px solid ${color}` : 'none',
        backgroundColor: bgColor,
        zIndex: 1,
        overflow: 'visible',
        padding: '2px 4px',
        pointerEvents: visualOnly ? 'none' : 'auto',
      };

  const textColor = darkMode ? '#c8d1dc' : '#0f172a';

  // Text styling depending on writing mode vs rotation
  const textStyle: React.CSSProperties = useWritingMode
    ? {
        fontSize: fs,
        fontWeight: 600,
        color: textColor,
        writingMode: 'vertical-rl',
        textOrientation: 'mixed',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'normal',
        maxWidth: hdrSize - 16,
        maxHeight: size - 20,
        lineHeight: 1.2,
        textAlign: 'center',
        userSelect: 'none' as const,
      }
    : {
        fontSize: fs,
        fontWeight: 600,
        color: textColor,
        transform: rotateAngle !== 0 ? `rotate(${rotateAngle}deg)` : undefined,
        transformOrigin: 'center center',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        // Reduce maxWidth when rotated so the label stays within the header bounds
        maxWidth: isHorizontal
          ? Math.max(20, size - 10 - Math.abs(rotateAngle) * 0.4)
          : Math.max(40, size - 50 - Math.abs(rotateAngle) * 0.5),
        userSelect: 'none' as const,
        lineHeight: 1.2,
        padding: rotateAngle !== 0 ? '2px 4px' : undefined,
      };

  const editStyle: React.CSSProperties = useWritingMode
    ? {
        width: hdrSize - 12,
        fontSize: fs,
        fontWeight: 600,
        textAlign: 'center' as const,
        color: textColor,
        backgroundColor: 'transparent',
        border: `1px solid ${color}`,
        borderRadius: 2,
        outline: 'none',
        padding: '1px 2px',
        writingMode: 'vertical-rl',
        textOrientation: 'mixed',
      }
    : {
        width: isHorizontal ? hdrSize - 12 : Math.max(60, size - 60),
        fontSize: fs,
        fontWeight: 600,
        textAlign: 'center' as const,
        color: textColor,
        backgroundColor: 'transparent',
        border: `1px solid ${color}`,
        borderRadius: 2,
        outline: 'none',
        padding: '1px 2px',
        transform: rotateAngle !== 0 ? `rotate(${rotateAngle}deg)` : undefined,
      };

  // ---- Visual-only mode: render static content behind nodes (z:0) ----
  if (visualOnly) {
    return (
      <div style={style} data-lane-header={laneId}>
        {colorVisible && (
          <div
            style={{
              width: isHorizontal ? 24 : 8,
              height: isHorizontal ? 8 : 20,
              backgroundColor: color,
              borderRadius: 2,
              flexShrink: 0,
              marginBottom: isHorizontal ? 4 : 0,
              marginRight: isHorizontal ? 0 : 6,
            }}
          />
        )}
        {(labelVisible && colorVisible) && (
          <GripVertical
            size={12}
            style={{
              color: darkMode ? '#7e8d9f' : '#94a3b8',
              flexShrink: 0,
              marginBottom: isHorizontal ? 2 : 0,
              marginRight: isHorizontal ? 0 : 4,
              transform: isHorizontal ? 'rotate(90deg)' : undefined,
            }}
          />
        )}
        {labelVisible && (
          <span style={textStyle}>{label}</span>
        )}
      </div>
    );
  }

  // Select swimlane on single-click (deliberate action on header)
  const handleSingleClick = useCallback((e: React.MouseEvent) => {
    // Don't select on double-click (that edits label)
    if (e.detail >= 2) return;
    const activeId = useSwimlaneStore.getState().activeContainerId;
    if (activeId) useSwimlaneStore.getState().setSwimlaneSelected(true, activeId);
    // Switch properties panel to swimlane tab
    useUIStore.getState().setActivePanelTab('lane');
  }, []);

  // ---- Interactive mode: invisible content above ReactFlow (z:3) ----
  return (
    <>
      <div
        style={style}
        onClick={handleSingleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        data-lane-header={laneId}
      >
        {/* Color indicator — double-click to change color */}
        {colorVisible && (
          <div
            ref={colorSwatchRef}
            onDoubleClick={handleColorSwatchDblClick}
            data-tooltip={isHorizontal ? undefined : 'Double-click to change color'}
            data-tooltip-left={isHorizontal ? 'Double-click to change color' : undefined}
            style={{
              width: isHorizontal ? 24 : 8,
              height: isHorizontal ? 8 : 20,
              backgroundColor: color,
              borderRadius: 2,
              flexShrink: 0,
              marginBottom: isHorizontal ? 4 : 0,
              marginRight: isHorizontal ? 0 : 6,
              cursor: 'var(--cursor-select)',
              position: 'relative',
              opacity: 0,
            }}
          />
        )}

        {/* Drag handle — shown when both label and color are visible */}
        {(labelVisible && colorVisible) && (
          <GripVertical
            size={12}
            onMouseDown={handleDragStart}
            onContextMenu={handleContextMenu}
            style={{
              color: darkMode ? '#7e8d9f' : '#94a3b8',
              flexShrink: 0,
              marginBottom: isHorizontal ? 2 : 0,
              marginRight: isHorizontal ? 0 : 4,
              transform: isHorizontal ? 'rotate(90deg)' : undefined,
              pointerEvents: 'auto',
              cursor: 'var(--cursor-open-hand)',
              opacity: 0,
            }}
          />
        )}

        {/* Label or edit input */}
        {isEditing ? (
          <InlineEdit
            value={label}
            onCommit={handleEditCommit}
            onCancel={handleEditCancel}
            color={textColor}
            fontSize={fs}
            fontWeight={600}
            style={editStyle}
          />
        ) : labelVisible ? (
          <span style={{ ...textStyle, cursor: 'var(--cursor-select)', opacity: 0 }}>
            {label}
          </span>
        ) : null}
      </div>

      {/* Context menu — portaled to document.body to escape transformed parent */}
      {ctxMenu && createPortal(
        <LaneContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          laneId={laneId}
          orientation={orientation}
          darkMode={darkMode}
          onClose={() => setCtxMenu(null)}
          onStartEdit={() => {
            setIsEditing(true);
          }}
        />,
        document.body,
      )}

      {/* Color picker popover — portaled to document.body */}
      {showColorPicker && colorSwatchRef.current && createPortal(
        (() => {
          const rect = colorSwatchRef.current!.getBoundingClientRect();
          const popX = rect.right + 6;
          const popY = rect.top - 4;
          return (
            <>
              <div className="fixed inset-0" style={{ zIndex: 9999 }} onMouseDown={() => setShowColorPicker(false)} />
              <div
                ref={colorPickerRef}
                className={`fixed rounded-lg shadow-xl border p-2 ${
                  darkMode ? 'bg-dk-panel border-dk-border' : 'bg-white border-slate-200'
                }`}
                style={{ left: popX, top: popY, zIndex: 10000, width: 184 }}
              >
                <div className="flex flex-wrap gap-1">
                  {LANE_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        updateLane(orientation, laneId, { color: c });
                        setShowColorPicker(false);
                      }}
                      className="w-5 h-5 rounded border border-slate-200 cursor-pointer transition-transform hover:scale-110"
                      style={{
                        backgroundColor: c,
                        outline: c === color ? '2px solid #3b82f6' : 'none',
                        outlineOffset: 1,
                      }}
                    />
                  ))}
                </div>
                {/* Opacity slider */}
                <div className="mt-2 flex items-center gap-1.5">
                  <span className={`text-[10px] shrink-0 ${darkMode ? 'text-dk-muted' : 'text-slate-400'}`}>
                    Opacity
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={colorOpacity ?? (darkMode ? 12 : 15)}
                    onChange={(e) => {
                      updateLane(orientation, laneId, { colorOpacity: Number(e.target.value) });
                    }}
                    className="flex-1 min-w-0 h-3 cursor-pointer accent-primary"
                  />
                  <span className={`text-[10px] w-7 shrink-0 text-right tabular-nums ${darkMode ? 'text-dk-muted' : 'text-slate-400'}`}>
                    {colorOpacity ?? (darkMode ? 12 : 15)}%
                  </span>
                </div>
              </div>
            </>
          );
        })(),
        document.body,
      )}
    </>
  );
};

export default React.memo(LaneHeader);
