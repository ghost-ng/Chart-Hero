import React, { useCallback, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useViewport } from '@xyflow/react';
import { useLegendStore, type LegendKind, type LegendItemKind } from '../../store/legendStore';
import { useStyleStore } from '../../store/styleStore';
import { diagramStyles } from '../../styles/diagramStyles';
import { generateId } from '../../utils/idGenerator';
import { Trash2, Plus, GripVertical, Eye, EyeClosed, X } from 'lucide-react';

// ---------------------------------------------------------------------------
// Visual swatch renderers per LegendItemKind
// ---------------------------------------------------------------------------

interface SwatchProps {
  color: string;
  kind: LegendItemKind;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  darkMode: boolean;
  /** Swatch size in px (scales with legend font size) */
  size?: number;
}

/** Renders the appropriate visual indicator for each legend item kind */
const LegendSwatch: React.FC<SwatchProps> = ({ color, kind, borderStyle, darkMode, size }) => {
  const dim = size ?? 14;
  const border = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  switch (kind) {
    // Filled rectangle — standard node color
    case 'fill':
    case 'lane':
      return (
        <div
          style={{
            width: dim,
            height: dim,
            backgroundColor: color,
            borderRadius: 2,
            flexShrink: 0,
            border: `1px solid ${border}`,
          }}
        />
      );

    // Outlined rectangle with border style
    case 'border':
      return (
        <div
          style={{
            width: dim,
            height: dim,
            backgroundColor: 'transparent',
            borderRadius: 2,
            flexShrink: 0,
            border: `2px ${borderStyle || 'solid'} ${color}`,
          }}
        />
      );

    // Circular puck (status indicator)
    case 'puck':
      return (
        <div
          style={{
            width: dim,
            height: dim,
            backgroundColor: color,
            borderRadius: '50%',
            flexShrink: 0,
            border: `1px solid ${border}`,
          }}
        />
      );

    // Horizontal line (edge / connector)
    case 'edge':
      return (
        <svg width={dim + 4} height={dim} viewBox={`0 0 ${dim + 4} ${dim}`} style={{ flexShrink: 0 }}>
          <line
            x1={0}
            y1={dim / 2}
            x2={dim + 4}
            y2={dim / 2}
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          {/* arrowhead */}
          <polygon
            points={`${dim + 4},${dim / 2} ${dim - 2},${dim / 2 - 3} ${dim - 2},${dim / 2 + 3}`}
            fill={color}
          />
        </svg>
      );

    default:
      return (
        <div
          style={{
            width: dim,
            height: dim,
            backgroundColor: color,
            borderRadius: 2,
            flexShrink: 0,
            border: `1px solid ${border}`,
          }}
        />
      );
  }
};

// ---------------------------------------------------------------------------
// Legend Editor — floating panel with all items editable at once
// ---------------------------------------------------------------------------

const KIND_OPTIONS: { value: LegendItemKind; label: string }[] = [
  { value: 'fill', label: 'Fill' },
  { value: 'border', label: 'Border' },
  { value: 'puck', label: 'Puck' },
  { value: 'edge', label: 'Edge' },
  { value: 'lane', label: 'Lane' },
];

const QUICK_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#94a3b8', '#0f172a'];

interface LegendEditorProps {
  which: LegendKind;
  darkMode: boolean;
  onClose: () => void;
}

const LegendEditor: React.FC<LegendEditorProps> = ({ which, darkMode, onClose }) => {
  const legend = useLegendStore((s) => which === 'node' ? s.nodeLegend : s.swimlaneLegend);
  const updateItem = useLegendStore((s) => s.updateItem);
  const removeItem = useLegendStore((s) => s.removeItem);
  const addItem = useLegendStore((s) => s.addItem);
  const setTitle = useLegendStore((s) => s.setTitle);
  const reorderItems = useLegendStore((s) => s.reorderItems);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const sortedItems = [...legend.items].sort((a, b) => a.order - b.order);

  const handleDragStart = (idx: number) => {
    dragIdx.current = idx;
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDrop = (idx: number) => {
    if (dragIdx.current === null || dragIdx.current === idx) {
      dragIdx.current = null;
      setDragOverIdx(null);
      return;
    }
    const newOrder = [...sortedItems];
    const [moved] = newOrder.splice(dragIdx.current, 1);
    newOrder.splice(idx, 0, moved);
    reorderItems(which, newOrder.map((i) => i.id));
    dragIdx.current = null;
    setDragOverIdx(null);
  };

  const bg = darkMode ? 'bg-dk-panel' : 'bg-white';
  const border = darkMode ? 'border-dk-border' : 'border-slate-200';
  const text = darkMode ? 'text-dk-text' : 'text-slate-700';
  const mutedText = darkMode ? 'text-dk-muted' : 'text-slate-400';
  const inputBg = darkMode ? 'bg-dk-surface' : 'bg-slate-50';
  const hoverBg = darkMode ? 'hover:bg-dk-hover' : 'hover:bg-slate-50';

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20" style={{ zIndex: 9998 }} onClick={onClose} />
      <div
        ref={panelRef}
        className={`fixed ${bg} border ${border} rounded-xl shadow-2xl flex flex-col`}
        style={{
          zIndex: 9999,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: Math.min(520, window.innerWidth - 40),
          maxHeight: Math.min(600, window.innerHeight - 80),
        }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${border}`}>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${text}`}>Edit Legend</span>
            <span className={`text-xs ${mutedText}`}>({which === 'node' ? 'Node' : 'Swimlane'})</span>
          </div>
          <button onClick={onClose} className={`p-1 rounded ${hoverBg} ${mutedText} cursor-pointer`}>
            <X size={16} />
          </button>
        </div>

        {/* Title row */}
        <div className={`flex items-center gap-2 px-4 py-2 border-b ${border}`}>
          <span className={`text-xs font-medium ${mutedText} w-12 shrink-0`}>Title:</span>
          <input
            type="text"
            value={legend.title}
            onChange={(e) => setTitle(which, e.target.value)}
            className={`flex-1 px-2 py-1 text-sm rounded border ${border} ${inputBg} ${text}
                       focus:outline-none focus:ring-1 focus:ring-primary/30`}
          />
        </div>

        {/* Column headers */}
        <div className={`flex items-center gap-1 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider ${mutedText} border-b ${border}`}>
          <span className="w-5" />
          <span className="w-8 text-center">Color</span>
          <span className="w-16 text-center">Kind</span>
          <span className="flex-1">Label</span>
          <span className="w-6 text-center">Vis</span>
          <span className="w-6" />
        </div>

        {/* Scrollable items */}
        <div className="flex-1 overflow-y-auto" style={{ minHeight: 60 }}>
          {sortedItems.map((item, idx) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={() => handleDrop(idx)}
              onDragEnd={() => { dragIdx.current = null; setDragOverIdx(null); }}
              className={`flex items-center gap-1 px-4 py-1.5 border-b ${border} ${hoverBg} transition-colors
                ${dragOverIdx === idx ? (darkMode ? 'bg-dk-hover' : 'bg-blue-50') : ''}`}
            >
              {/* Drag handle */}
              <GripVertical size={12} className={`${mutedText} cursor-grab shrink-0`} />

              {/* Color picker */}
              <input
                type="color"
                value={item.color}
                onChange={(e) => updateItem(which, item.id, { color: e.target.value })}
                className="w-7 h-6 rounded border border-slate-200 cursor-pointer shrink-0"
              />

              {/* Kind dropdown */}
              <select
                value={item.kind || 'fill'}
                onChange={(e) => updateItem(which, item.id, { kind: e.target.value as LegendItemKind })}
                className={`w-16 px-1 py-0.5 text-[10px] rounded border ${border} ${inputBg} ${text} focus:outline-none shrink-0`}
              >
                {KIND_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              {/* Label */}
              <input
                type="text"
                value={item.label}
                onChange={(e) => updateItem(which, item.id, { label: e.target.value })}
                className={`flex-1 min-w-0 px-2 py-0.5 text-xs rounded border ${border} ${inputBg} ${text}
                           focus:outline-none focus:ring-1 focus:ring-primary/30`}
              />

              {/* Visibility toggle */}
              <button
                onClick={() => updateItem(which, item.id, { hidden: !item.hidden })}
                className={`p-0.5 rounded ${hoverBg} cursor-pointer ${item.hidden ? 'text-red-400' : mutedText}`}
                title={item.hidden ? 'Show item' : 'Hide item'}
              >
                {item.hidden ? <EyeClosed size={13} /> : <Eye size={13} />}
              </button>

              {/* Delete */}
              <button
                onClick={() => removeItem(which, item.id)}
                className={`p-0.5 rounded ${hoverBg} text-red-400 cursor-pointer`}
                title="Remove item"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          {sortedItems.length === 0 && (
            <div className={`text-center py-6 text-xs ${mutedText}`}>
              No legend items. Click "Add Item" below.
            </div>
          )}
        </div>

        {/* Footer — add item */}
        <div className={`flex items-center gap-2 px-4 py-2.5 border-t ${border}`}>
          <button
            onClick={() => {
              addItem(which, {
                id: generateId('legend'),
                label: `Item ${legend.items.length + 1}`,
                color: QUICK_COLORS[legend.items.length % QUICK_COLORS.length],
                order: legend.items.length,
              });
            }}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md
                       border border-primary/30 text-primary hover:bg-primary/5 transition-colors cursor-pointer"
          >
            <Plus size={13} />
            Add Item
          </button>
          <div className="flex-1" />
          <span className={`text-[10px] ${mutedText}`}>{sortedItems.length} items</span>
        </div>
      </div>
    </>,
    document.body,
  );
};

// ---------------------------------------------------------------------------
// Right-click context menu for legend items / title
// ---------------------------------------------------------------------------

interface LegendContextMenuProps {
  x: number;
  y: number;
  darkMode: boolean;
  which: LegendKind;
  target:
    | { type: 'title' }
    | { type: 'item'; itemId: string }
    | { type: 'canvas' };
  onClose: () => void;
  onOpenEditor: () => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const LegendContextMenu: React.FC<LegendContextMenuProps> = ({
  x, y, darkMode, which, target, onClose, onOpenEditor,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const removeItem = useLegendStore((s) => s.removeItem);
  const addItem = useLegendStore((s) => s.addItem);
  const setVisible = useLegendStore((s) => s.setVisible);
  const generateNodeLegend = useLegendStore((s) => s.generateNodeLegend);
  const resetLegend = useLegendStore((s) => s.resetLegend);
  const legend = useLegendStore((s) => which === 'node' ? s.nodeLegend : s.swimlaneLegend);
  const itemCount = legend.items.length;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const menuW = 180;
  const menuH = 200;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const adjustedX = x + menuW > vw ? vw - menuW - 8 : x;
  const adjustedY = y + menuH > vh ? vh - menuH - 8 : y;

  const btnClass = `flex items-center gap-2 w-full px-3 py-1.5 text-left text-sm rounded transition-colors duration-75 cursor-pointer ${
    darkMode ? 'hover:bg-dk-hover text-dk-text' : 'hover:bg-slate-100 text-slate-700'
  }`;
  const dividerClass = `my-1 h-px ${darkMode ? 'bg-dk-hover' : 'bg-slate-200'}`;

  return (
    <div
      ref={menuRef}
      className={`fixed min-w-[170px] rounded-lg shadow-xl border p-1 ${
        darkMode ? 'bg-dk-panel border-dk-border' : 'bg-white border-slate-200'
      }`}
      style={{ left: adjustedX, top: adjustedY, zIndex: 10000 }}
    >
      {target.type === 'item' && (
        <>
          <button className={btnClass} onClick={() => {
            window.dispatchEvent(new CustomEvent(`legend-edit-item-${which}`, { detail: target.itemId }));
            onClose();
          }}>
            Edit Label
          </button>
          <button className={btnClass} onClick={() => {
            removeItem(which, target.itemId);
            onClose();
          }}>
            Remove Item
          </button>
          <div className={dividerClass} />
        </>
      )}
      {target.type === 'title' && (
        <>
          <button className={btnClass} onClick={() => {
            window.dispatchEvent(new CustomEvent(`legend-edit-title-${which}`));
            onClose();
          }}>
            Edit Title
          </button>
          <div className={dividerClass} />
        </>
      )}
      <button className={btnClass} onClick={() => {
        addItem(which, {
          id: generateId('legend'),
          label: `Item ${itemCount + 1}`,
          color: COLORS[itemCount % COLORS.length],
          order: itemCount,
        });
        onClose();
      }}>
        Add Item
      </button>
      <button className={btnClass} onClick={() => {
        onOpenEditor();
        onClose();
      }}>
        Edit All Items
      </button>
      {which === 'node' && (
        <button className={btnClass} onClick={() => {
          generateNodeLegend();
          onClose();
        }}>
          Auto-Generate
        </button>
      )}
      <div className={dividerClass} />
      <button className={btnClass} onClick={() => {
        setVisible(which, false);
        onClose();
      }}>
        Hide Legend
      </button>
      <button className={`${btnClass} text-red-500`} onClick={() => {
        resetLegend(which);
        onClose();
      }}>
        Clear Legend
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// LegendOverlay
// ---------------------------------------------------------------------------

interface LegendOverlayProps {
  which: LegendKind;
}

const LegendOverlay: React.FC<LegendOverlayProps> = ({ which }) => {
  const config = useLegendStore((s) => which === 'node' ? s.nodeLegend : s.swimlaneLegend);
  const setPosition = useLegendStore((s) => s.setPosition);
  const setTitle = useLegendStore((s) => s.setTitle);
  const updateItem = useLegendStore((s) => s.updateItem);
  const updateStyle = useLegendStore((s) => s.updateStyle);
  const globalDarkMode = useStyleStore((s) => s.darkMode);
  const activeStyleId = useStyleStore((s) => s.activeStyleId);
  const activeStyle = activeStyleId ? diagramStyles[activeStyleId] ?? null : null;
  // Theme is dark if user toggled dark mode OR the active diagram style is inherently dark
  const darkMode = globalDarkMode || (activeStyle?.dark === true);
  const viewport = useViewport();
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startWidth: number; startFontSize: number } | null>(null);

  // Context menu state
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; target: LegendContextMenuProps['target'] } | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  // Inline editing state
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const itemInputRef = useRef<HTMLInputElement>(null);

  // Listen for custom edit events scoped to this legend kind
  useEffect(() => {
    const handleEditTitle = () => setEditingTitle(true);
    const handleEditItem = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setEditingItemId(detail);
    };
    window.addEventListener(`legend-edit-title-${which}`, handleEditTitle);
    window.addEventListener(`legend-edit-item-${which}`, handleEditItem);
    return () => {
      window.removeEventListener(`legend-edit-title-${which}`, handleEditTitle);
      window.removeEventListener(`legend-edit-item-${which}`, handleEditItem);
    };
  }, [which]);

  // Focus inputs when editing starts
  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitle]);

  useEffect(() => {
    if (editingItemId && itemInputRef.current) {
      itemInputRef.current.focus();
      itemInputRef.current.select();
    }
  }, [editingItemId]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        posX: config.position.x,
        posY: config.position.y,
      };

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!dragRef.current) return;
        const dx = (moveEvent.clientX - dragRef.current.startX) / viewport.zoom;
        const dy = (moveEvent.clientY - dragRef.current.startY) / viewport.zoom;
        setPosition(which, {
          x: dragRef.current.posX + dx,
          y: dragRef.current.posY + dy,
        });
      };

      const onMouseUp = () => {
        dragRef.current = null;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
      };

      document.body.style.cursor = 'grabbing';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [config.position, viewport.zoom, setPosition, which],
  );

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();
      resizeRef.current = {
        startX: e.clientX,
        startWidth: config.style.width,
        startFontSize: config.style.fontSize,
      };

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!resizeRef.current) return;
        const dx = (moveEvent.clientX - resizeRef.current.startX) / viewport.zoom;
        const newWidth = Math.max(100, Math.min(600, resizeRef.current.startWidth + dx));
        const scale = newWidth / resizeRef.current.startWidth;
        const newFontSize = Math.max(7, Math.min(24, Math.round(resizeRef.current.startFontSize * scale)));
        updateStyle(which, { width: newWidth, fontSize: newFontSize });
      };

      const onMouseUp = () => {
        resizeRef.current = null;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
      };

      document.body.style.cursor = 'ew-resize';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [config.style.width, config.style.fontSize, viewport.zoom, updateStyle, which],
  );

  const handleContextMenu = useCallback((e: React.MouseEvent, target: LegendContextMenuProps['target']) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY, target });
  }, []);

  const visibleItems = config.items.filter((i) => !i.hidden);
  if (!config.visible || visibleItems.length === 0) return null;

  const { style } = config;
  // Use theme-aware legend colors: if the user hasn't customised the default white/light style,
  // replace with dark-appropriate colours when a dark theme or dark mode is active.
  const isDefaultBg = style.bgColor === '#ffffff';
  const isDefaultBorder = style.borderColor === '#e2e8f0';
  const bgColor = darkMode
    ? (isDefaultBg ? 'rgba(20,30,45,0.92)' : style.bgColor)
    : style.bgColor;
  const borderColor = darkMode
    ? (isDefaultBorder ? 'rgba(255,255,255,0.12)' : style.borderColor)
    : style.borderColor;
  const textColor = darkMode ? '#c8d1dc' : '#0f172a';
  const titleColor = darkMode ? '#8494a7' : '#64748b';
  // Scale swatch size proportionally with font size (base: 14 at fontSize 11)
  const swatchSize = Math.max(8, Math.round(style.fontSize * 14 / 11));
  const itemGap = Math.max(3, Math.round(style.fontSize * 4 / 11));
  const padding = Math.max(4, Math.round(style.fontSize * 6 / 11));

  return (
    <>
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{ zIndex: 4 }}
      >
        <div
          style={{
            position: 'absolute',
            transformOrigin: '0 0',
            transform: `translate(${viewport.x + config.position.x * viewport.zoom}px, ${viewport.y + config.position.y * viewport.zoom}px) scale(${viewport.zoom})`,
          }}
        >
          <div
            onContextMenu={(e) => handleContextMenu(e, { type: 'canvas' })}
            style={{
              position: 'relative',
              width: style.width,
              backgroundColor: bgColor,
              border: `${style.borderWidth}px solid ${borderColor}`,
              borderRadius: 6,
              opacity: style.opacity,
              boxShadow: darkMode
                ? '0 2px 8px rgba(0,0,0,0.3)'
                : '0 2px 8px rgba(0,0,0,0.08)',
              pointerEvents: 'auto',
            }}
          >
            {/* Title bar (draggable) */}
            <div
              onMouseDown={handleMouseDown}
              onDoubleClick={() => setEditingTitle(true)}
              onContextMenu={(e) => { e.stopPropagation(); handleContextMenu(e, { type: 'title' }); }}
              style={{
                padding: `${padding}px ${padding + 4}px`,
                fontSize: style.fontSize + 1,
                fontWeight: 600,
                color: titleColor,
                borderBottom: `1px solid ${borderColor}`,
                cursor: editingTitle ? 'text' : 'var(--cursor-drag)',
                userSelect: 'none',
              }}
            >
              {editingTitle ? (
                <input
                  ref={titleInputRef}
                  defaultValue={config.title}
                  onBlur={(e) => {
                    setTitle(which, e.target.value || config.title);
                    setEditingTitle(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setTitle(which, (e.target as HTMLInputElement).value || config.title);
                      setEditingTitle(false);
                    }
                    if (e.key === 'Escape') setEditingTitle(false);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{
                    width: '100%',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    font: 'inherit',
                    color: 'inherit',
                    padding: 0,
                    margin: 0,
                  }}
                />
              ) : (
                config.title
              )}
            </div>

            {/* Items */}
            <div style={{ padding: `${padding}px ${padding + 4}px`, display: 'flex', flexDirection: 'column', gap: itemGap }}>
              {[...visibleItems]
                .sort((a, b) => a.order - b.order)
                .map((item) => (
                  <div
                    key={item.id}
                    onDoubleClick={() => setEditingItemId(item.id)}
                    onContextMenu={(e) => { e.stopPropagation(); handleContextMenu(e, { type: 'item', itemId: item.id }); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'var(--cursor-default)',
                    }}
                  >
                    <LegendSwatch
                      color={item.color}
                      kind={item.kind || 'fill'}
                      borderStyle={item.borderStyle}
                      darkMode={darkMode}
                      size={swatchSize}
                    />
                    {editingItemId === item.id ? (
                      <input
                        ref={itemInputRef}
                        defaultValue={item.label}
                        onBlur={(e) => {
                          updateItem(which, item.id, { label: e.target.value || item.label });
                          setEditingItemId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updateItem(which, item.id, { label: (e.target as HTMLInputElement).value || item.label });
                            setEditingItemId(null);
                          }
                          if (e.key === 'Escape') setEditingItemId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          border: 'none',
                          outline: 'none',
                          background: 'transparent',
                          fontSize: style.fontSize,
                          color: textColor,
                          padding: 0,
                          margin: 0,
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: style.fontSize,
                          color: textColor,
                          lineHeight: 1.3,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.label}
                      </span>
                    )}
                  </div>
                ))}
            </div>
            {/* Resize handle (bottom-right corner) */}
            <div
              onMouseDown={handleResizeMouseDown}
              style={{
                position: 'absolute',
                right: 0,
                bottom: 0,
                width: 12,
                height: 12,
                cursor: 'ew-resize',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="8" height="8" viewBox="0 0 8 8" style={{ opacity: 0.3 }}>
                <path d="M7 1L1 7M7 4L4 7M7 7L7 7" stroke={textColor} strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Context menu portal */}
      {ctxMenu && (
        <LegendContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          darkMode={darkMode}
          which={which}
          target={ctxMenu.target}
          onClose={() => setCtxMenu(null)}
          onOpenEditor={() => setEditorOpen(true)}
        />
      )}

      {/* Legend editor modal */}
      {editorOpen && (
        <LegendEditor
          which={which}
          darkMode={darkMode}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </>
  );
};

export default React.memo(LegendOverlay);
