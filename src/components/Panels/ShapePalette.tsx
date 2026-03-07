import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronsLeft, ChevronsRight, ChevronDown, ChevronRight, Pen, Pin, PinOff, Puzzle, Rows3, Shapes, Trash2, Upload } from 'lucide-react';
import { useStyleStore } from '../../store/styleStore';
import { useUIStore } from '../../store/uiStore';
import { useSwimlaneStore } from '../../store/swimlaneStore';
import { useExtensionStore, type ExtensionPack } from '../../extensions/extensionStore';
import { parseSvgPack } from '../../extensions/parseSvgPack';
import FloatingIconPicker from './FloatingIconPicker';
import { CURSOR_OPEN_HAND, CURSOR_DRAG_ACTIVE } from '../../assets/cursors/cursors';

// ---------------------------------------------------------------------------
// Shape definitions
// ---------------------------------------------------------------------------

interface ShapeDefinition {
  type: string;
  label: string;
  icon: React.ReactNode;
}

/** Small SVG icon factory for each shape */
const mkIcon = (children: React.ReactNode) => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="shrink-0"
  >
    {children}
  </svg>
);

const shapes: ShapeDefinition[] = [
  {
    type: 'rectangle',
    label: 'Rectangle',
    icon: mkIcon(
      <rect x="4" y="8" width="24" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />,
    ),
  },
  {
    type: 'roundedRectangle',
    label: 'Rounded Rect',
    icon: mkIcon(
      <rect x="4" y="8" width="24" height="16" rx="8" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />,
    ),
  },
  {
    type: 'diamond',
    label: 'Diamond',
    icon: mkIcon(
      <path d="M16 4 L28 16 L16 28 L4 16 Z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />,
    ),
  },
  {
    type: 'circle',
    label: 'Circle',
    icon: mkIcon(
      <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />,
    ),
  },
  {
    type: 'parallelogram',
    label: 'Parallelogram',
    icon: mkIcon(
      <path d="M8 24 L4 8 L24 8 L28 24 Z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />,
    ),
  },
  {
    type: 'document',
    label: 'Document',
    icon: mkIcon(
      <path d="M5 6 L27 6 L27 23 C21 20 11 26 5 23 Z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />,
    ),
  },
  {
    type: 'hexagon',
    label: 'Hexagon',
    icon: mkIcon(
      <path d="M10 4 L22 4 L28 16 L22 28 L10 28 L4 16 Z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />,
    ),
  },
  {
    type: 'cloud',
    label: 'Cloud',
    icon: mkIcon(
      <path d="M8 24 C4 24 2 21 3 18 C2 15 4 12 8 12 C9 8 13 6 17 6 C21 6 24 8 25 12 C28 12 30 15 29 18 C30 21 28 24 24 24 Z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />,
    ),
  },
  {
    type: 'stickyNote',
    label: 'Sticky Note',
    icon: mkIcon(
      <>
        <rect x="4" y="4" width="24" height="24" rx="1" stroke="currentColor" strokeWidth="1.5" fill="#fbbf24" fillOpacity="0.3" />
        <path d="M20 28 L28 20 L20 20 Z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1" />
      </>,
    ),
  },
  {
    type: 'textbox',
    label: 'Text Box',
    icon: mkIcon(
      <>
        <rect x="4" y="8" width="24" height="16" rx="1" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" fill="none" />
        <text x="16" y="19" textAnchor="middle" fontSize="9" fill="currentColor" fontFamily="sans-serif">Aa</text>
      </>,
    ),
  },
];

// ---------------------------------------------------------------------------
// Arrow shape definitions
// ---------------------------------------------------------------------------

const arrowShapes: ShapeDefinition[] = [
  {
    type: 'blockArrow',
    label: 'Block Arrow',
    icon: mkIcon(
      <path
        d="M 4 12 L 18 12 L 18 7 L 28 16 L 18 25 L 18 20 L 4 20 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="currentColor"
        fillOpacity="0.1"
        strokeLinejoin="round"
      />,
    ),
  },
  {
    type: 'chevronArrow',
    label: 'Chevron Arrow',
    icon: mkIcon(
      <path
        d="M 4 6 L 20 6 L 28 16 L 20 26 L 4 26 L 12 16 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="currentColor"
        fillOpacity="0.1"
        strokeLinejoin="round"
      />,
    ),
  },
  {
    type: 'doubleArrow',
    label: 'Double Arrow',
    icon: mkIcon(
      <path
        d="M 10 7 L 4 16 L 10 25 L 10 20 L 22 20 L 22 25 L 28 16 L 22 7 L 22 12 L 10 12 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="currentColor"
        fillOpacity="0.1"
        strokeLinejoin="round"
      />,
    ),
  },
  {
    type: 'circularArrow',
    label: 'Circular Arrow',
    icon: mkIcon(
      <>
        <path
          d="M 18 6 A 10 10 0 1 1 10 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.4"
        />
        <polygon
          points="6,3 12,8 5,11"
          fill="currentColor"
          fillOpacity="0.5"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </>,
    ),
  },
];

// ---------------------------------------------------------------------------
// Connector type definitions (edges/lines)
// ---------------------------------------------------------------------------

interface ConnectorTypeDef {
  type: string;
  label: string;
  icon: React.ReactNode;
}

/** Arrowhead tip rendered at the end of each connector icon */
const arrowTip = (x: number, y: number, angle: number) => (
  <polygon
    points="-5,-3 0,0 -5,3"
    fill="currentColor"
    transform={`translate(${x},${y}) rotate(${angle})`}
  />
);

const connectorTypes: ConnectorTypeDef[] = [
  {
    type: 'smoothstep',
    label: 'Smooth Step',
    icon: mkIcon(
      <>
        <path d="M4 24 C4 24 4 16 16 16 C28 16 28 8 28 8" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        {arrowTip(28, 8, -90)}
      </>,
    ),
  },
  {
    type: 'bezier',
    label: 'Bezier',
    icon: mkIcon(
      <>
        <path d="M4 24 C4 8 28 24 28 8" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        {arrowTip(28, 8, -70)}
      </>,
    ),
  },
  {
    type: 'step',
    label: 'Step',
    icon: mkIcon(
      <>
        <path d="M4 24 L4 16 L28 16 L28 8" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {arrowTip(28, 8, -90)}
      </>,
    ),
  },
  {
    type: 'straight',
    label: 'Straight',
    icon: mkIcon(
      <>
        <line x1="4" y1="24" x2="28" y2="8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        {arrowTip(28, 8, -45)}
      </>,
    ),
  },
];

// ---------------------------------------------------------------------------
// Draggable shape item
// ---------------------------------------------------------------------------

interface ShapeItemProps {
  shape: ShapeDefinition;
  isSelected?: boolean;
  onSelect?: (type: string) => void;
}

const ShapeItem: React.FC<ShapeItemProps> = React.memo(({ shape, isSelected, onSelect }) => {
  const [pressing, setPressing] = useState(false);

  const onDragStart = useCallback(
    (event: React.DragEvent) => {
      event.dataTransfer.setData('application/charthero-shape', shape.type);
      event.dataTransfer.effectAllowed = 'move';
    },
    [shape.type],
  );

  const handleClick = useCallback(() => {
    onSelect?.(shape.type);
  }, [shape.type, onSelect]);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={handleClick}
      onPointerDown={() => setPressing(true)}
      onPointerUp={() => setPressing(false)}
      onPointerLeave={() => setPressing(false)}
      data-tooltip-right={shape.label}
      style={{ cursor: pressing ? CURSOR_DRAG_ACTIVE : CURSOR_OPEN_HAND }}
      className={`
        relative flex items-center justify-center w-10 min-h-0 flex-1 max-h-10 rounded-lg
        transition-all duration-100 group
        hover:bg-primary/10 hover:scale-105 active:scale-95
        ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-800/15' : ''}
      `}
    >
      <div className={`transition-colors ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-text-muted group-hover:text-primary'}`}>
        {shape.icon}
      </div>
    </div>
  );
});

ShapeItem.displayName = 'ShapeItem';

// ---------------------------------------------------------------------------
// Main ShapePalette
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Marker color picker popover
// ---------------------------------------------------------------------------

const MARKER_PRESETS = ['#000000', '#ffffff', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f97316'];

interface MarkerColorPickerProps {
  anchorRect: DOMRect;
  onClose: () => void;
}

const MarkerColorPicker: React.FC<MarkerColorPickerProps> = ({ anchorRect, onClose }) => {
  const darkMode = useStyleStore((s) => s.darkMode);
  const markerColor = useUIStore((s) => s.markerColor);
  const markerThickness = useUIStore((s) => s.markerThickness);
  const setMarkerColor = useUIStore((s) => s.setMarkerColor);
  const setMarkerThickness = useUIStore((s) => s.setMarkerThickness);

  return (
    <>
      {/* Fixed backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className={`fixed z-50 rounded-lg shadow-lg border p-2 w-44 ${
          darkMode ? 'bg-dk-panel border-dk-border' : 'bg-white border-border'
        }`}
        style={{ top: anchorRect.top, left: anchorRect.right + 8 }}
      >
        <div className="text-xs font-semibold mb-1.5 text-text-muted dark:text-dk-muted">Marker Color</div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {MARKER_PRESETS.map((c) => (
            <button
              key={c}
              onClick={() => setMarkerColor(c)}
              className="w-6 h-6 rounded-full border-2 cursor-pointer transition-transform hover:scale-110"
              style={{
                backgroundColor: c,
                borderColor: markerColor === c ? '#3b82f6' : (c === '#ffffff' ? '#d1d5db' : 'transparent'),
              }}
            />
          ))}
        </div>
        <div className="text-xs font-semibold mb-1 text-text-muted dark:text-dk-muted">Thickness</div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={1}
            max={12}
            step={1}
            value={markerThickness}
            onChange={(e) => setMarkerThickness(Number(e.target.value))}
            className="flex-1 accent-primary"
          />
          <span className="text-xs w-5 text-center text-text-muted dark:text-dk-muted">{markerThickness}</span>
        </div>
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// Extensions popover
// ---------------------------------------------------------------------------

interface ExtensionsPopoverProps {
  anchorRect: DOMRect;
  onClose: () => void;
}

const ExtensionsPopover: React.FC<ExtensionsPopoverProps> = ({ anchorRect, onClose }) => {
  const darkMode = useStyleStore((s) => s.darkMode);
  const packs = useExtensionStore((s) => s.packs);
  const pinnedPackIds = useExtensionStore((s) => s.pinnedPackIds);
  const togglePin = useExtensionStore((s) => s.togglePin);
  const removePack = useExtensionStore((s) => s.removePack);
  const addPack = useExtensionStore((s) => s.addPack);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [contextMenu, setContextMenu] = useState<{ packId: string; x: number; y: number } | null>(null);

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const pack = await parseSvgPack(file);
      addPack(pack);
    } catch (err) {
      console.error('Failed to parse SVG pack:', err);
    }
    // Reset input so re-importing the same file triggers onChange
    e.target.value = '';
  }, [addPack]);

  const handleContextMenu = useCallback((e: React.MouseEvent, pack: ExtensionPack) => {
    if (pack.builtIn) return;
    e.preventDefault();
    setContextMenu({ packId: pack.id, x: e.clientX, y: e.clientY });
  }, []);

  return (
    <>
      {/* Fixed backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className={`fixed z-50 rounded-lg shadow-lg border p-2 w-56 max-h-80 overflow-y-auto ${
          darkMode ? 'bg-dk-panel border-dk-border' : 'bg-white border-border'
        }`}
        style={{ top: anchorRect.top, left: anchorRect.right + 8 }}
      >
        <div className="text-xs font-semibold mb-1.5 text-text-muted dark:text-dk-muted">Extension Packs</div>

        {packs.length === 0 && (
          <div className="text-xs text-text-muted dark:text-dk-muted py-2 text-center">No packs loaded</div>
        )}

        {packs.map((pack) => {
          const isPinned = pinnedPackIds.includes(pack.id);
          return (
            <button
              key={pack.id}
              onClick={() => togglePin(pack.id)}
              onContextMenu={(e) => handleContextMenu(e, pack)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs cursor-pointer transition-colors ${
                darkMode ? 'hover:bg-dk-hover' : 'hover:bg-slate-100'
              }`}
            >
              {/* Pack icon thumbnail */}
              <div
                className="w-5 h-5 shrink-0 text-text-muted dark:text-dk-muted"
                dangerouslySetInnerHTML={{ __html: pack.icon }}
              />
              {/* Pack name + count */}
              <div className="flex-1 min-w-0 truncate text-text dark:text-dk-text">
                {pack.name}
                <span className="ml-1 text-text-muted dark:text-dk-muted">({pack.items.length})</span>
              </div>
              {/* Pin indicator */}
              {isPinned
                ? <Pin size={14} className="shrink-0 text-blue-500" />
                : <PinOff size={14} className="shrink-0 text-text-muted dark:text-dk-muted opacity-40" />
              }
            </button>
          );
        })}

        {/* Import button */}
        <div className="border-t border-border dark:border-dk-border mt-1.5 pt-1.5">
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer transition-colors ${
              darkMode ? 'hover:bg-dk-hover text-dk-text' : 'hover:bg-slate-100 text-text'
            }`}
          >
            <Upload size={14} className="shrink-0" />
            Import Pack...
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
        </div>
      </div>

      {/* Right-click context menu for removing custom packs */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setContextMenu(null)} />
          <div
            className={`fixed z-[70] rounded shadow-lg border py-1 ${
              darkMode ? 'bg-dk-panel border-dk-border' : 'bg-white border-border'
            }`}
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              onClick={() => { removePack(contextMenu.packId); setContextMenu(null); }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer transition-colors ${
                darkMode ? 'hover:bg-dk-hover text-red-400' : 'hover:bg-red-50 text-red-600'
              }`}
            >
              <Trash2 size={13} />
              Remove
            </button>
          </div>
        </>
      )}
    </>
  );
};

// ---------------------------------------------------------------------------
// Pinned extension pack section
// ---------------------------------------------------------------------------

interface PinnedPackSectionProps {
  pack: ExtensionPack;
}

const PinnedPackSection: React.FC<PinnedPackSectionProps> = React.memo(({ pack }) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="w-full">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-0.5 px-1 py-0.5 text-[10px] font-semibold text-text-muted dark:text-dk-muted truncate cursor-pointer hover:text-primary dark:hover:text-dk-text transition-colors"
        data-tooltip-right={pack.name}
      >
        {expanded ? <ChevronDown size={10} className="shrink-0" /> : <ChevronRight size={10} className="shrink-0" />}
        <span className="truncate">{pack.name}</span>
      </button>
      {expanded && (
        <div className="flex flex-wrap gap-0.5 px-0.5 pb-1">
          {pack.items.map((item) => (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/charthero-extension', JSON.stringify({ packId: pack.id, itemId: item.id }));
                e.dataTransfer.effectAllowed = 'move';
              }}
              data-tooltip-right={item.name}
              style={{ cursor: CURSOR_OPEN_HAND }}
              className="w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-100 hover:bg-primary/10 hover:scale-105 active:scale-95"
            >
              <div
                className="w-8 h-8 text-text-muted dark:text-dk-muted"
                dangerouslySetInnerHTML={{ __html: item.svgContent }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

PinnedPackSection.displayName = 'PinnedPackSection';

// ---------------------------------------------------------------------------
// Main ShapePalette
// ---------------------------------------------------------------------------

const ShapePalette: React.FC = () => {
  const darkMode = useStyleStore((s) => s.darkMode);
  const shapePaletteOpen = useUIStore((s) => s.shapePaletteOpen);
  const toggleShapePalette = useUIStore((s) => s.toggleShapePalette);
  const selectedPaletteShape = useUIStore((s) => s.selectedPaletteShape);
  const setSelectedPaletteShape = useUIStore((s) => s.setSelectedPaletteShape);
  const drawingMode = useUIStore((s) => s.drawingMode);
  const setDrawingMode = useUIStore((s) => s.setDrawingMode);
  const defaultEdgeType = useUIStore((s) => s.defaultEdgeType);
  const setDefaultEdgeType = useUIStore((s) => s.setDefaultEdgeType);
  const markerColor = useUIStore((s) => s.markerColor);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [markerPickerOpen, setMarkerPickerOpen] = useState(false);
  const [extensionsOpen, setExtensionsOpen] = useState(false);
  const markerBtnRef = useRef<HTMLButtonElement>(null);
  const extensionsBtnRef = useRef<HTMLButtonElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Extension store
  const packs = useExtensionStore((s) => s.packs);
  const pinnedPackIds = useExtensionStore((s) => s.pinnedPackIds);

  // Load built-in packs on mount
  useEffect(() => {
    useExtensionStore.getState().loadBuiltInPacks();
  }, []);

  const pinnedPacks = packs.filter((p) => pinnedPackIds.includes(p.id));

  const handleShapeSelect = useCallback((type: string) => {
    // Toggle: click same shape to deselect
    setSelectedPaletteShape(selectedPaletteShape === type ? null : type);
  }, [selectedPaletteShape, setSelectedPaletteShape]);

  const handleMarkerClick = useCallback(() => {
    setDrawingMode(!drawingMode);
  }, [drawingMode, setDrawingMode]);

  const handleMarkerPointerDown = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      setMarkerPickerOpen(true);
      longPressTimer.current = null;
    }, 500);
  }, []);

  const handleMarkerPointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  return (
    <div className="relative flex shrink-0">
      {/* Panel content (only when open) */}
      {shapePaletteOpen && (
        <div
          className={`flex flex-col w-14 shrink-0 overflow-hidden ${
            darkMode ? 'bg-surface-alt-dark' : 'bg-white'
          }`}
        >
          {/* Shape list — no scroll, items shrink to fit */}
          <div className="flex-1 py-1">
            <div className="flex flex-col items-center gap-0 px-1 h-full">
              {shapes.map((shape) => (
                <ShapeItem key={shape.type} shape={shape} isSelected={selectedPaletteShape === shape.type} onSelect={handleShapeSelect} />
              ))}

              {/* Arrows section separator */}
              <div className="w-full border-t border-border dark:border-dk-border my-1" />

              {arrowShapes.map((shape) => (
                <ShapeItem key={shape.type} shape={shape} isSelected={selectedPaletteShape === shape.type} onSelect={handleShapeSelect} />
              ))}

              {/* Connectors section separator */}
              <div className="w-full border-t border-border dark:border-dk-border my-1" />

              {connectorTypes.map((ct) => (
                <div
                  key={ct.type}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/charthero-connector', ct.type);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onClick={() => setDefaultEdgeType(ct.type)}
                  data-tooltip-right={ct.label}
                  style={{ cursor: CURSOR_OPEN_HAND }}
                  className={`
                    relative flex items-center justify-center w-10 min-h-0 flex-1 max-h-10 rounded-lg
                    transition-all duration-100
                    hover:bg-primary/10 hover:scale-105 active:scale-95
                    ${defaultEdgeType === ct.type
                      ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-800/15 text-blue-600 dark:text-blue-400'
                      : 'text-text-muted hover:text-primary'}
                  `}
                >
                  {ct.icon}
                </div>
              ))}

              {/* Marker (freehand drawing) button */}
              <div className="w-full border-t border-border dark:border-dk-border my-1" />
              <button
                ref={markerBtnRef}
                onClick={handleMarkerClick}
                onPointerDown={handleMarkerPointerDown}
                onPointerUp={handleMarkerPointerUp}
                onPointerLeave={handleMarkerPointerUp}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMarkerPickerOpen(true);
                }}
                data-tooltip-right="Marker (hold for options)"
                className={`relative flex items-center justify-center w-10 min-h-0 flex-1 max-h-10 rounded-lg
                           transition-all duration-100 cursor-pointer
                           hover:bg-primary/10 hover:scale-105
                           ${drawingMode ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-800/15 text-blue-600 dark:text-blue-400' : 'text-text-muted hover:text-primary'}`}
              >
                <div className="relative">
                  <Pen size={20} />
                  {/* Small color dot indicator */}
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white dark:border-dk-panel"
                    style={{ backgroundColor: markerColor }}
                  />
                </div>
              </button>

              {/* Icons button */}
              <div className="w-full border-t border-border dark:border-dk-border my-1" />
              <button
                onClick={() => setIconPickerOpen(true)}
                data-tooltip-right="Icon Library"
                className="relative flex items-center justify-center w-10 min-h-0 flex-1 max-h-8 rounded-lg
                           transition-all duration-100
                           hover:bg-primary/10 text-text-muted hover:text-primary cursor-pointer"
              >
                <Shapes size={22} />
              </button>

              {/* Containers section separator */}
              <div className="w-full border-t border-border dark:border-dk-border my-1" />

              <div
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/charthero-shape', 'group');
                  e.dataTransfer.effectAllowed = 'move';
                }}
                data-tooltip-right="Group"
                style={{ cursor: CURSOR_OPEN_HAND }}
                className="relative flex items-center justify-center w-10 min-h-0 flex-1 max-h-10 rounded-lg
                           transition-all duration-100 group
                           hover:bg-primary/10 hover:scale-105 active:scale-95"
              >
                <div className="text-text-muted group-hover:text-primary transition-colors">
                  <svg width="28" height="28" viewBox="0 0 40 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                    <rect x="1" y="1" width="38" height="30" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
                  </svg>
                </div>
              </div>

              {/* Swimlanes — drag to create new container */}
              <div
                draggable
                data-swimlane-action
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/charthero-swimlane', 'swimlane');
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onClick={() => {
                  const store = useSwimlaneStore.getState();
                  store.setIsCreating(true);
                  useUIStore.getState().setActivePanelTab('lane');
                  if (!useUIStore.getState().propertiesPanelOpen) {
                    useUIStore.getState().togglePropertiesPanel();
                  }
                }}
                data-tooltip-right="Click: add lanes · Drag: new container"
                style={{ cursor: CURSOR_OPEN_HAND }}
                className="relative flex items-center justify-center w-10 min-h-0 flex-1 max-h-10 rounded-lg
                           transition-all duration-100 group
                           hover:bg-primary/10 hover:scale-105 active:scale-95"
              >
                <div className="text-text-muted group-hover:text-primary transition-colors">
                  <Rows3 size={26} />
                </div>
              </div>

              {/* Extensions button */}
              <div className="w-full border-t border-border dark:border-dk-border my-1" />
              <button
                ref={extensionsBtnRef}
                onClick={() => setExtensionsOpen(!extensionsOpen)}
                data-tooltip-right="Extensions"
                className={`relative flex items-center justify-center w-10 min-h-0 flex-1 max-h-10 rounded-lg
                           transition-all duration-100 cursor-pointer
                           hover:bg-primary/10 hover:scale-105
                           ${extensionsOpen ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-800/15 text-blue-600 dark:text-blue-400' : 'text-text-muted hover:text-primary'}`}
              >
                <Puzzle size={20} />
              </button>

              {/* Pinned extension pack grids */}
              {pinnedPacks.length > 0 && (
                <>
                  <div className="w-full border-t border-border dark:border-dk-border my-1" />
                  {pinnedPacks.map((pack) => (
                    <PinnedPackSection key={pack.id} pack={pack} />
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Zero-width wrapper keeps toggle out of flex layout */}
      <div className="relative w-0 self-stretch shrink-0">
        <button
          onClick={toggleShapePalette}
          className={`
            absolute top-1/2 -translate-y-1/2 left-0 z-20
            flex items-center justify-center w-5 h-8
            rounded-r cursor-pointer
            transition-colors duration-150 opacity-40 hover:opacity-100
            ${darkMode
              ? 'text-dk-muted hover:bg-dk-hover/90 hover:text-dk-text'
              : 'text-slate-400 hover:bg-white/90 hover:text-slate-600 hover:shadow-sm'
            }
          `}
          data-tooltip-right={shapePaletteOpen ? 'Collapse palette' : 'Expand palette'}
        >
          {shapePaletteOpen
            ? <ChevronsLeft size={14} />
            : <ChevronsRight size={14} />
          }
        </button>
      </div>

      {/* Floating icon picker */}
      {iconPickerOpen && (
        <FloatingIconPicker onClose={() => setIconPickerOpen(false)} />
      )}

      {/* Marker color/thickness picker */}
      {markerPickerOpen && markerBtnRef.current && (
        <MarkerColorPicker
          anchorRect={markerBtnRef.current.getBoundingClientRect()}
          onClose={() => setMarkerPickerOpen(false)}
        />
      )}

      {/* Extensions popover */}
      {extensionsOpen && extensionsBtnRef.current && (
        <ExtensionsPopover
          anchorRect={extensionsBtnRef.current.getBoundingClientRect()}
          onClose={() => setExtensionsOpen(false)}
        />
      )}
    </div>
  );
};

export default React.memo(ShapePalette);
