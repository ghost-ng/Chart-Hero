import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, RotateCcw, X } from 'lucide-react';

import { useStyleStore } from '../../store/styleStore';
import { useFlowStore, type FlowNodeData } from '../../store/flowStore';
import { diagramStyles } from '../../styles/diagramStyles';
import { colorPalettes, STYLE_PALETTE_ID, resolveActivePalette } from '../../styles/palettes';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DiagramStylePickerProps {
  open: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Style card
// ---------------------------------------------------------------------------

interface StyleCardProps {
  styleId: string;
  displayName: string;
  accentColors: string[];
  nodeColor: string;
  edgeColor: string;
  bgColor: string;
  isActive: boolean;
  darkMode: boolean;
  onClick: () => void;
}

const StyleCard: React.FC<StyleCardProps> = React.memo(
  ({ displayName, accentColors, nodeColor, bgColor, isActive, darkMode, onClick }) => (
    <button
      onClick={onClick}
      title={displayName}
      className={`
        relative flex flex-col items-center rounded-lg border p-2 transition-all duration-150 cursor-pointer
        ${isActive
          ? 'border-blue-500 ring-2 ring-blue-500/30'
          : darkMode
            ? 'border-dk-border hover:border-slate-500'
            : 'border-slate-200 hover:border-slate-400'
        }
        ${darkMode ? 'bg-dk-panel' : 'bg-white'}
      `}
    >
      {/* Mini preview */}
      <div
        className="w-full h-12 rounded mb-1.5 flex items-center justify-center gap-1 overflow-hidden"
        style={{ backgroundColor: bgColor }}
      >
        {/* Simulated mini-nodes */}
        <div
          className="w-6 h-4 rounded-sm"
          style={{ backgroundColor: nodeColor }}
        />
        <div className="w-4 h-[2px]" style={{ backgroundColor: accentColors[0] || '#ccc' }} />
        <div
          className="w-6 h-4 rounded-sm"
          style={{ backgroundColor: accentColors[1] || nodeColor }}
        />
      </div>

      {/* Label */}
      <span
        className={`text-[11px] font-medium truncate w-full text-center ${
          darkMode ? 'text-dk-muted' : 'text-slate-600'
        }`}
      >
        {displayName}
      </span>

      {/* Active indicator */}
      {isActive && (
        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
          <Check size={10} className="text-white" />
        </div>
      )}
    </button>
  ),
);

StyleCard.displayName = 'StyleCard';

// ---------------------------------------------------------------------------
// Palette swatch
// ---------------------------------------------------------------------------

interface PaletteSwatchProps {
  paletteId: string;
  displayName: string;
  colors: string[];
  isActive: boolean;
  darkMode: boolean;
  onClick: () => void;
}

const PaletteSwatch: React.FC<PaletteSwatchProps> = React.memo(
  ({ displayName, colors, isActive, darkMode, onClick }) => (
    <button
      onClick={onClick}
      title={displayName}
      className={`
        flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-all duration-150 cursor-pointer
        ${isActive
          ? 'border-blue-500 ring-2 ring-blue-500/30'
          : darkMode
            ? 'border-dk-border hover:border-slate-500'
            : 'border-slate-200 hover:border-slate-400'
        }
      `}
    >
      <div className="flex gap-0.5">
        {colors.slice(0, 5).map((c, i) => (
          <div
            key={i}
            className="w-4 h-4 rounded-sm"
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <span
        className={`text-[10px] font-medium ${
          darkMode ? 'text-dk-muted' : 'text-slate-500'
        }`}
      >
        {displayName}
      </span>
    </button>
  ),
);

PaletteSwatch.displayName = 'PaletteSwatch';

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const MIN_WIDTH = 280;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 320;

const DiagramStylePicker: React.FC<DiagramStylePickerProps> = ({ open, onClose }) => {
  const darkMode = useStyleStore((s) => s.darkMode);
  const activeStyleId = useStyleStore((s) => s.activeStyleId);
  const activePaletteId = useStyleStore((s) => s.activePaletteId);
  const setStyle = useStyleStore((s) => s.setStyle);
  const setPalette = useStyleStore((s) => s.setPalette);
  const clearStyle = useStyleStore((s) => s.clearStyle);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);
  const isDragging = useRef(false);

  // Left-edge resize drag
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging.current = true;
    const startX = e.clientX;
    const startWidth = panelWidth;

    const onMouseMove = (ev: MouseEvent) => {
      // Dragging left increases width (right-anchored panel)
      const delta = startX - ev.clientX;
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth + delta));
      setPanelWidth(newWidth);
    };

    const onMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [panelWidth]);

  const handleResetStyle = useCallback(() => {
    clearStyle();

    // Reset dark mode and canvas background to defaults
    useStyleStore.getState().setDarkMode(false);

    const { nodes, updateNodeData } = useFlowStore.getState();
    for (const node of nodes) {
      const isTextbox = (node.data as FlowNodeData).shape === 'textbox';
      updateNodeData(node.id, {
        color: isTextbox ? 'transparent' : undefined,
        borderColor: isTextbox ? 'transparent' : undefined,
        textColor: undefined,
        fontFamily: undefined,
        fontSize: undefined,
        fontWeight: undefined,
      });
    }

    const { edges, updateEdgeData } = useFlowStore.getState();
    for (const edge of edges) {
      updateEdgeData(edge.id, { color: undefined });
    }
  }, [clearStyle]);

  const handleSetStyle = useCallback(
    (id: string) => {
      setStyle(id);
      const style = diagramStyles[id];

      // Clear all node style properties — resolver picks up new theme
      const { nodes, updateNodeData } = useFlowStore.getState();
      for (const node of nodes) {
        const isTextbox = (node.data as FlowNodeData).shape === 'textbox';
        updateNodeData(node.id, {
          color: isTextbox ? 'transparent' : undefined,
          borderColor: isTextbox ? 'transparent' : undefined,
          textColor: undefined,
          fontFamily: undefined,
          fontSize: undefined,
          fontWeight: undefined,
        });
      }

      // Clear all edge style properties
      const { edges, updateEdgeData } = useFlowStore.getState();
      for (const edge of edges) {
        updateEdgeData(edge.id, { color: undefined });
      }

      // Sync dark mode to match theme preference
      if (style?.dark) {
        useStyleStore.getState().setDarkMode(true);
      } else {
        useStyleStore.getState().setDarkMode(false);
      }
    },
    [setStyle, setPalette],
  );

  const handleSetPalette = useCallback(
    (id: string) => {
      // Only update the active palette — this changes the quick-change
      // color swatches in context menus and keyboard shortcuts (1-9).
      // Existing node colors are NOT modified.
      setPalette(id);
    },
    [setPalette],
  );

  // Close on click-outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      // Don't close while resizing
      if (isDragging.current) return;
      const target = e.target as HTMLElement;
      // Skip close if clicking the toggle button (avoids close-then-reopen race)
      if (target.closest('[data-style-picker-toggle]')) return;
      if (panelRef.current && !panelRef.current.contains(target)) {
        onClose();
      }
    };
    // Delay to avoid the opening click triggering close immediately
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handler);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
    };
  }, [open, onClose]);

  if (!open) return null;

  const styleEntries = Object.entries(diagramStyles);
  const staticPaletteEntries = Object.entries(colorPalettes);

  // Prepend dynamic Style Palette when a diagram style is active
  const stylePalette = activeStyleId ? resolveActivePalette(STYLE_PALETTE_ID, activeStyleId) : null;
  const paletteEntries: [string, { displayName: string; colors: string[] }][] = [
    ...(stylePalette ? [[STYLE_PALETTE_ID, stylePalette] as [string, { displayName: string; colors: string[] }]] : []),
    ...staticPaletteEntries,
  ];

  return (
    <div
      ref={panelRef}
      style={{ width: panelWidth }}
      className={`
        absolute top-12 right-4 max-h-[70vh] rounded-xl shadow-2xl border overflow-hidden flex flex-col z-50
        ${darkMode
          ? 'bg-dk-panel border-dk-border'
          : 'bg-white border-slate-200'
        }
      `}
    >
      {/* Left-edge resize handle */}
      <div
        onMouseDown={handleResizeStart}
        className={`absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize z-10
          hover:bg-blue-500/30 active:bg-blue-500/40 transition-colors`}
      />
      {/* Diagram Styles */}
      <div className="px-4 pt-4 pb-1 flex items-center justify-between">
        <h3
          className={`text-xs font-semibold uppercase tracking-wider ${
            darkMode ? 'text-dk-muted' : 'text-slate-500'
          }`}
        >
          Diagram Style
        </h3>
        <div className="flex items-center gap-0.5">
          {activeStyleId && (
            <button
              onClick={handleResetStyle}
              title="Reset to no theme"
              className={`p-1 rounded-md transition-colors cursor-pointer ${
                darkMode
                  ? 'hover:bg-dk-hover text-dk-muted hover:text-dk-text'
                  : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
              }`}
            >
              <RotateCcw size={13} />
            </button>
          )}
          <button
            onClick={onClose}
            title="Close"
            className={`p-1 rounded-md transition-colors cursor-pointer ${
              darkMode
                ? 'hover:bg-dk-hover text-dk-muted hover:text-dk-text'
                : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
            }`}
          >
            <X size={14} />
          </button>
        </div>
      </div>
      <div className="overflow-y-auto max-h-[35vh] px-4 pb-2">
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }}>
          {styleEntries.map(([id, style]) => (
            <StyleCard
              key={id}
              styleId={id}
              displayName={style.displayName}
              accentColors={style.accentColors}
              nodeColor={style.nodeDefaults.fill}
              edgeColor={style.edgeDefaults.stroke}
              bgColor={style.canvas.background}
              isActive={id === activeStyleId}
              darkMode={darkMode}
              onClick={() => handleSetStyle(id)}
            />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className={`mx-4 border-t ${darkMode ? 'border-dk-border' : 'border-slate-200'}`} />

      {/* Color Palettes */}
      <div className="px-4 pt-2 pb-1">
        <h3
          className={`text-xs font-semibold uppercase tracking-wider mb-2 ${
            darkMode ? 'text-dk-muted' : 'text-slate-500'
          }`}
        >
          Color Palette
        </h3>
      </div>
      <div className="overflow-y-auto max-h-[25vh] px-4 pb-4">
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
          {paletteEntries.map(([id, palette]) => (
            <PaletteSwatch
              key={id}
              paletteId={id}
              displayName={palette.displayName}
              colors={palette.colors}
              isActive={id === activePaletteId}
              darkMode={darkMode}
              onClick={() => handleSetPalette(id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(DiagramStylePicker);
