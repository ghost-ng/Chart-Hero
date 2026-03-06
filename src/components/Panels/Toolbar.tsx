import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FilePlus,
  ExternalLink,
  FolderOpen,
  Save,
  Undo2,
  Redo2,
  Copy,
  Clipboard,
  Trash2,
  Maximize,
  Grid3X3,
  Magnet,
  LayoutDashboard,
  ArrowDownUp,
  ArrowLeftRight,
  Palette,
  // Moon, Sun — keep for dark mode toggle (hidden for now)
  Image,
  Code,
  Upload,
  Workflow,
  LayoutTemplate,
  Paintbrush,
  PaintBucket,
  MousePointer2,
  Ruler,
  AlignLeft,
  AlignCenterHorizontal,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  FlipHorizontal2,
  FlipVertical2,
  RotateCw,
  RotateCcw,
  GitBranch,
  MousePointerClick,
  ClipboardPaste,
  Github,
  Lock,
  Unlock,
  GripVertical,
  MoveHorizontal,
  PanelTop,
  PanelLeft,
  FileText,
  ChevronDown,
  ChevronUp,
  Type,
  AArrowUp,
  AArrowDown,
  Download,
  Flag,
  HelpCircle,
  Crosshair,
  Layers,
  PointerOff,
  BoxSelect,
} from 'lucide-react';

import { useUIStore } from '../../store/uiStore';
import { useStyleStore } from '../../store/styleStore';
import { useFlowStore } from '../../store/flowStore';
import { useBannerStore } from '../../store/bannerStore';
import { useExportStore } from '../../store/exportStore';
import { copySvgToClipboard, copySvgForPaste, importFromJson, exportAsJson } from '../../utils/exportUtils';
import { useDependencyStore } from '../../store/dependencyStore';
import { useSwimlaneStore } from '../../store/swimlaneStore';
import { useLegendStore } from '../../store/legendStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useAutoLayout } from '../../hooks/useAutoLayout';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import * as alignment from '../../utils/alignmentUtils';
import { mirrorHorizontal, mirrorVertical, rotateArrangement } from '../../utils/transformUtils';
import DiagramStylePicker from '../StylePicker/DiagramStylePicker';
import ImportJsonDialog from '../Import/ImportJsonDialog';
import OrderModal from './OrderModal';
import AIButton from '../AI/AIButton';
// import { CollabToolbarButton } from '../Collaboration'; // WIP: needs self-hosted signaling server
import { log } from '../../utils/logger';

// ---------------------------------------------------------------------------
// Toolbar button
// ---------------------------------------------------------------------------

interface ToolbarButtonProps {
  icon: React.ReactNode;
  tooltip: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  label?: string;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = React.memo(
  ({ icon, tooltip, onClick, active, disabled, label }) => (
    <button
      data-tooltip={tooltip}
      onClick={onClick}
      disabled={disabled}
      className={`
        relative flex items-center gap-1 px-1.5 py-1 rounded text-xs
        transition-colors duration-100
        ${disabled
          ? 'cursor-not-allowed text-slate-300 dark:text-slate-600'
          : `cursor-pointer ${active
              ? 'bg-primary/10 text-primary'
              : 'text-text-muted hover:bg-slate-100 dark:hover:bg-dk-hover hover:text-text dark:hover:text-dk-text'
            }`
        }
      `}
    >
      {icon}
      {label && <span className="hidden xl:inline text-[11px]">{label}</span>}
    </button>
  ),
);

ToolbarButton.displayName = 'ToolbarButton';

// ---------------------------------------------------------------------------
// Z-Order button — click = step one, long-press = show send-to-back/front
// ---------------------------------------------------------------------------

interface ZOrderButtonProps {
  icon: React.ReactNode;
  tooltip: string;
  onClick: () => void;
  onSendAll: () => void;
  sendAllLabel: string;
  disabled?: boolean;
}

const ZOrderButton: React.FC<ZOrderButtonProps> = React.memo(
  ({ icon, tooltip, onClick, onSendAll, sendAllLabel, disabled }) => {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const didLongPress = useRef(false);
    const [showMenu, setShowMenu] = useState(false);
    const darkMode = useStyleStore((s) => s.darkMode);

    const handleMouseDown = useCallback(() => {
      if (disabled) return;
      didLongPress.current = false;
      timerRef.current = setTimeout(() => {
        didLongPress.current = true;
        setShowMenu(true);
      }, 400);
    }, [disabled]);

    const handleMouseUp = useCallback(() => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (!didLongPress.current && !disabled) {
        onClick();
      }
    }, [onClick, disabled]);

    const handleMouseLeave = useCallback(() => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }, []);

    useEffect(() => {
      if (!showMenu) return;
      const close = () => setShowMenu(false);
      document.addEventListener('mousedown', close);
      return () => document.removeEventListener('mousedown', close);
    }, [showMenu]);

    return (
      <div className="relative">
        <button
          data-tooltip={tooltip}
          disabled={disabled}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          className={`
            relative flex items-center gap-1 px-1.5 py-1 rounded text-xs
            transition-colors duration-100
            ${disabled
              ? 'cursor-not-allowed text-slate-300 dark:text-slate-600'
              : 'cursor-pointer text-text-muted hover:bg-slate-100 dark:hover:bg-dk-hover hover:text-text dark:hover:text-dk-text'
            }
          `}
        >
          {icon}
        </button>
        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onMouseDown={() => setShowMenu(false)} />
            <div
              className={`absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 min-w-[140px] rounded-lg shadow-xl border p-1 ${
                darkMode ? 'bg-dk-panel border-dk-border' : 'bg-white border-slate-200'
              }`}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => { onSendAll(); setShowMenu(false); }}
                className={`flex items-center gap-2 w-full px-3 py-1.5 text-left text-sm rounded transition-colors cursor-pointer ${
                  darkMode ? 'hover:bg-dk-hover text-dk-text' : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                {sendAllLabel}
              </button>
            </div>
          </>
        )}
      </div>
    );
  },
);

ZOrderButton.displayName = 'ZOrderButton';

/** Small right-aligned keyboard shortcut hint for dropdown menu items */
const Kbd: React.FC<{ shortcut: string }> = ({ shortcut }) => (
  <span className="ml-auto text-[10px] text-slate-400 dark:text-dk-faint font-mono whitespace-nowrap pl-3">
    {shortcut}
  </span>
);

// (Separators are rendered inline via the orientation-aware Sep component)

// ---------------------------------------------------------------------------
// Font families (PPT-compatible, widely available)
// ---------------------------------------------------------------------------

interface FontOption { label: string; value: string; category: string }

const FONT_OPTIONS: FontOption[] = [
  // Modern Sans-Serif
  { label: 'Inter', value: "Inter, system-ui, sans-serif", category: 'Sans-Serif' },
  { label: 'Aptos', value: "Aptos, Calibri, sans-serif", category: 'Sans-Serif' },
  { label: 'Calibri', value: "Calibri, 'Gill Sans', sans-serif", category: 'Sans-Serif' },
  { label: 'Segoe UI', value: "'Segoe UI', Tahoma, sans-serif", category: 'Sans-Serif' },
  { label: 'Arial', value: "Arial, Helvetica, sans-serif", category: 'Sans-Serif' },
  { label: 'Helvetica', value: "Helvetica, Arial, sans-serif", category: 'Sans-Serif' },
  // Classic Sans-Serif
  { label: 'Verdana', value: "Verdana, Geneva, sans-serif", category: 'Sans-Serif' },
  { label: 'Tahoma', value: "Tahoma, Geneva, sans-serif", category: 'Sans-Serif' },
  { label: 'Trebuchet MS', value: "'Trebuchet MS', Helvetica, sans-serif", category: 'Sans-Serif' },
  { label: 'Franklin Gothic', value: "'Franklin Gothic Medium', 'Franklin Gothic', Arial, sans-serif", category: 'Sans-Serif' },
  { label: 'Franklin Gothic Book', value: "'Franklin Gothic Book', 'Franklin Gothic', Arial, sans-serif", category: 'Sans-Serif' },
  { label: 'Century Gothic', value: "'Century Gothic', 'Apple Gothic', sans-serif", category: 'Sans-Serif' },
  { label: 'Candara', value: "Candara, Optima, sans-serif", category: 'Sans-Serif' },
  { label: 'Corbel', value: "Corbel, 'Lucida Grande', sans-serif", category: 'Sans-Serif' },
  { label: 'Gill Sans MT', value: "'Gill Sans MT', 'Gill Sans', Calibri, sans-serif", category: 'Sans-Serif' },
  { label: 'Lucida Sans', value: "'Lucida Sans Unicode', 'Lucida Grande', sans-serif", category: 'Sans-Serif' },
  // Serif
  { label: 'Cambria', value: "Cambria, Georgia, serif", category: 'Serif' },
  { label: 'Georgia', value: "Georgia, 'Times New Roman', serif", category: 'Serif' },
  { label: 'Times New Roman', value: "'Times New Roman', Times, serif", category: 'Serif' },
  { label: 'Garamond', value: "Garamond, 'Times New Roman', serif", category: 'Serif' },
  { label: 'Palatino', value: "'Palatino Linotype', Palatino, 'Book Antiqua', serif", category: 'Serif' },
  { label: 'Book Antiqua', value: "'Book Antiqua', Palatino, Georgia, serif", category: 'Serif' },
  { label: 'Constantia', value: "Constantia, Georgia, serif", category: 'Serif' },
  // Monospace
  { label: 'Consolas', value: "Consolas, 'Courier New', monospace", category: 'Monospace' },
  { label: 'Courier New', value: "'Courier New', Courier, monospace", category: 'Monospace' },
  // Display
  { label: 'Impact', value: "Impact, 'Arial Black', sans-serif", category: 'Display' },
  { label: 'Arial Black', value: "'Arial Black', 'Arial Bold', Gadget, sans-serif", category: 'Display' },
  { label: 'Comic Sans MS', value: "'Comic Sans MS', cursive, sans-serif", category: 'Display' },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ToolbarProps {
  /** Fit all nodes in view (from useReactFlow) */
  onFitView?: () => void;
  /** Undo last action */
  onUndo?: () => void;
  /** Redo last undone action */
  onRedo?: () => void;
  /** Whether undo is available */
  canUndo?: boolean;
  /** Whether redo is available */
  canRedo?: boolean;
  /** Open the template gallery */
  onOpenTemplates?: () => void;
}

// ---------------------------------------------------------------------------
// Main Toolbar
// ---------------------------------------------------------------------------

const Toolbar: React.FC<ToolbarProps> = ({
  onFitView,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onOpenTemplates,
}) => {
  // UI store
  const gridVisible = useUIStore((s) => s.gridVisible);
  const toggleGrid = useUIStore((s) => s.toggleGrid);
  const snapEnabled = useUIStore((s) => s.snapEnabled);
  const toggleSnap = useUIStore((s) => s.toggleSnap);
  const propertiesPanelOpen = useUIStore((s) => s.propertiesPanelOpen);
  const togglePropertiesPanel = useUIStore((s) => s.togglePropertiesPanel);
  const rulerVisible = useUIStore((s) => s.rulerVisible);
  const toggleRuler = useUIStore((s) => s.toggleRuler);
  const gridStyle = useUIStore((s) => s.gridStyle);
  const setGridStyle = useUIStore((s) => s.setGridStyle);
  const gridSpacing = useUIStore((s) => s.gridSpacing);
  const setGridSpacing = useUIStore((s) => s.setGridSpacing);
  const gridColor = useUIStore((s) => s.gridColor);
  const setGridColor = useUIStore((s) => s.setGridColor);
  const snapDistance = useUIStore((s) => s.snapDistance);
  const setSnapDistance = useUIStore((s) => s.setSnapDistance);
  const showAlignmentGuides = useUIStore((s) => s.showAlignmentGuides);
  const toggleAlignmentGuides = useUIStore((s) => s.toggleAlignmentGuides);

  // Style store
  const darkMode = useStyleStore((s) => s.darkMode);
  // Keep for later: const toggleDarkMode = useStyleStore((s) => s.toggleDarkMode);

  // Settings store
  const toolbarGroupOrder = useSettingsStore((s) => s.toolbarGroupOrder);
  const { canInstall, isInstalled, install: installPwa } = usePwaInstall();
  const setToolbarGroupOrder = useSettingsStore((s) => s.setToolbarGroupOrder);
  const toolbarLocked = useSettingsStore((s) => s.toolbarLocked);
  const toggleToolbarLocked = useSettingsStore((s) => s.toggleToolbarLocked);
  const toolbarOrientation = useSettingsStore((s) => s.toolbarOrientation);
  const toggleToolbarOrientation = useSettingsStore((s) => s.toggleToolbarOrientation);

  // Flow store
  const selectedNodes = useFlowStore((s) => s.selectedNodes);
  const selectedEdges = useFlowStore((s) => s.selectedEdges);
  const removeNode = useFlowStore((s) => s.removeNode);
  const clearSelection = useFlowStore((s) => s.clearSelection);
  const setNodes = useFlowStore((s) => s.setNodes);
  const setEdges = useFlowStore((s) => s.setEdges);

  // Export store
  const setExportDialogOpen = useExportStore((s) => s.setDialogOpen);

  // Dependency store
  const showBadges = useDependencyStore((s) => s.showBadges);
  const toggleBadges = useDependencyStore((s) => s.toggleBadges);

  // Banner store
  const topBannerEnabled = useBannerStore((s) => s.topBanner.enabled);
  const bottomBannerEnabled = useBannerStore((s) => s.bottomBanner.enabled);
  const setTopBannerEnabled = useBannerStore((s) => s.setTopEnabled);
  const setBottomBannerEnabled = useBannerStore((s) => s.setBottomEnabled);
  // Auto layout
  const { applyLayout } = useAutoLayout();

  // Selection color & thickness
  const selectionColor = useUIStore((s) => s.selectionColor);
  const setSelectionColor = useUIStore((s) => s.setSelectionColor);
  const selectionThickness = useUIStore((s) => s.selectionThickness);
  const setSelectionThickness = useUIStore((s) => s.setSelectionThickness);

  // Format painter state
  const formatPainterActive = useUIStore((s) => s.formatPainterActive);
  const setFormatPainterActive = useUIStore((s) => s.setFormatPainterActive);
  const setFormatPainterNodeStyle = useUIStore((s) => s.setFormatPainterNodeStyle);
  const setFormatPainterEdgeStyle = useUIStore((s) => s.setFormatPainterEdgeStyle);
  const clearFormatPainter = useUIStore((s) => s.clearFormatPainter);

  // Style picker state
  const [stylePickerOpen, setStylePickerOpen] = useState(false);

  // Order modal state
  const [orderModalOpen, setOrderModalOpen] = useState(false);

  // Grid options dropdown state
  const [gridOptionsOpen, setGridOptionsOpen] = useState(false);
  // Snap options dropdown state
  const [snapOptionsOpen, setSnapOptionsOpen] = useState(false);
  // Select menu dropdown state
  const [selectMenuOpen, setSelectMenuOpen] = useState(false);
  const gridDropdownRef = useRef<HTMLDivElement>(null);
  const snapDropdownRef = useRef<HTMLDivElement>(null);
  const selectMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    if (!gridOptionsOpen && !snapOptionsOpen && !selectMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (gridOptionsOpen && gridDropdownRef.current && !gridDropdownRef.current.contains(e.target as Node)) {
        setGridOptionsOpen(false);
      }
      if (snapOptionsOpen && snapDropdownRef.current && !snapDropdownRef.current.contains(e.target as Node)) {
        setSnapOptionsOpen(false);
      }
      if (selectMenuOpen && selectMenuRef.current && !selectMenuRef.current.contains(e.target as Node)) {
        setSelectMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [gridOptionsOpen, snapOptionsOpen, selectMenuOpen]);

  // Layout menu state (replaces separate transform dropdowns)
  const [layoutMenuOpen, setLayoutMenuOpen] = useState(false);
  const [alignDropdownOpen, setAlignDropdownOpen] = useState(false);
  const [mirrorDropdownOpen, setMirrorDropdownOpen] = useState(false);
  const [rotateCustomOpen, setRotateCustomOpen] = useState(false);

  // Selection color picker state
  const [selectionColorOpen, setSelectionColorOpen] = useState(false);

  // Import dialog state
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // SVG copy dropdown state
  const [svgCopyOpen, setSvgCopyOpen] = useState(false);

  // File menu dropdown state
  const [fileMenuOpen, setFileMenuOpen] = useState(false);

  // Font picker dropdown state
  const [fontPickerOpen, setFontPickerOpen] = useState(false);
  const fontPickerRef = useRef<HTMLDivElement>(null);

  // Drag-and-drop state
  const dragRef = useRef<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  // Refs for layout/align/mirror menus to detect click-outside
  const layoutMenuRef = useRef<HTMLDivElement>(null);
  const alignMenuRef = useRef<HTMLDivElement>(null);
  const mirrorMenuRef = useRef<HTMLDivElement>(null);

  // Custom rotation angle state — persists between uses
  const [customRotateAngle, setCustomRotateAngle] = useState('');
  const rotateIncrement = customRotateAngle ? parseFloat(customRotateAngle) : 15;
  const rotateLongPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rotateCustomRef = useRef<HTMLDivElement>(null);

  // Close layout/align/mirror dropdowns + rotate custom popover on click-outside
  useEffect(() => {
    if (!layoutMenuOpen && !alignDropdownOpen && !mirrorDropdownOpen && !rotateCustomOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (layoutMenuOpen && layoutMenuRef.current && !layoutMenuRef.current.contains(target)) {
        setLayoutMenuOpen(false);
      }
      if (alignDropdownOpen && alignMenuRef.current && !alignMenuRef.current.contains(target)) {
        setAlignDropdownOpen(false);
      }
      if (mirrorDropdownOpen && mirrorMenuRef.current && !mirrorMenuRef.current.contains(target)) {
        setMirrorDropdownOpen(false);
      }
      if (rotateCustomOpen && rotateCustomRef.current && !rotateCustomRef.current.contains(target)) {
        setRotateCustomOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [layoutMenuOpen, alignDropdownOpen, mirrorDropdownOpen, rotateCustomOpen]);

  // Close font picker on click-outside
  useEffect(() => {
    if (!fontPickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (fontPickerRef.current && !fontPickerRef.current.contains(e.target as Node)) {
        setFontPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [fontPickerOpen]);

  const multiSelected = selectedNodes.length >= 2;

  // ---- Actions ------------------------------------------------------------

  const handleGlobalFontSize = useCallback((delta: number) => {
    const { nodes } = useFlowStore.getState();
    if (nodes.length === 0) return;
    const updated = nodes.map((n) => {
      const d = n.data as Record<string, unknown>;
      const oldSize = (d.fontSize as number) || 14;
      const newSize = Math.max(8, Math.min(48, oldSize + delta));
      if (newSize === oldSize) return n;
      const ratio = newSize / oldSize;
      const oldW = (d.width as number) || 160;
      const oldH = (d.height as number) || 60;
      return {
        ...n,
        data: {
          ...d,
          fontSize: newSize,
          width: Math.round(oldW * ratio),
          height: Math.round(oldH * ratio),
        },
      };
    });
    useFlowStore.getState().setNodes(updated as typeof nodes);
  }, []);

  const handleFontChange = useCallback((fontValue: string) => {
    // Update global default
    useSettingsStore.getState().updateNodeDefaults({ fontFamily: fontValue });
    // Apply to ALL existing nodes
    const { nodes } = useFlowStore.getState();
    const updated = nodes.map((n) => ({
      ...n,
      data: { ...n.data, fontFamily: fontValue },
    }));
    useFlowStore.getState().setNodes(updated as typeof nodes);
    setFontPickerOpen(false);
    useUIStore.getState().showToast('Font updated for all nodes', 'success');
  }, []);

  const handleCopySvgForPaste = useCallback(async () => {
    try {
      await copySvgForPaste();
    } catch (e) {
      log.error('Copy SVG for paste failed', e);
    }
  }, []);

  const handleCopySvg = useCallback(async () => {
    try {
      await copySvgToClipboard();
    } catch (e) {
      log.error('Copy SVG to clipboard failed', e);
    }
  }, []);

  const handleOpenExport = useCallback(() => {
    setExportDialogOpen(true);
  }, [setExportDialogOpen]);

  const handleNew = useCallback(async () => {
    const confirmed = await useUIStore.getState().showConfirm(

      'Start a new diagram? Unsaved changes will be lost.',
      { title: 'New Diagram', confirmLabel: 'New Diagram', cancelLabel: 'Cancel' },
    );
    if (confirmed) {
      setNodes([]);
      setEdges([]);
      // Reset swimlanes
      useSwimlaneStore.setState({
        config: { orientation: 'horizontal', containerTitle: '', horizontal: [], vertical: [] },
        isCreating: false,
        editingLaneId: null,
        containerOffset: { x: 0, y: 0 },
      });
      // Reset legends
      useLegendStore.getState().resetLegend('node');
      useLegendStore.getState().resetLegend('swimlane');
      // Reset dependency highlights
      useDependencyStore.getState().clearHighlightedChain();
      // Reset banners
      useBannerStore.getState().updateTopBanner({ enabled: false, height: 40, label: '', color: '#1e293b', textColor: '#ffffff', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14 });
      useBannerStore.getState().updateBottomBanner({ enabled: false, height: 40, label: '', color: '#1e293b', textColor: '#ffffff', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14 });
    }
  }, [setNodes, setEdges]);

  const handleDelete = useCallback(() => {
    for (const nodeId of selectedNodes) {
      removeNode(nodeId);
    }
  }, [selectedNodes, removeNode]);

  const handleDeselectAll = useCallback(() => {
    clearSelection();
    useSwimlaneStore.getState().setSwimlaneSelected(false);
  }, [clearSelection]);

  const handleSelectAll = useCallback(() => {
    const { nodes, edges } = useFlowStore.getState();
    useFlowStore.getState().setSelectedNodes(nodes.map(n => n.id));
    useFlowStore.getState().setSelectedEdges(edges.map(e => e.id));
  }, []);

  // Z-order: step backward/forward (for selected nodes)
  const handleSendBackward = useCallback(() => {
    if (selectedNodes.length === 0) return;
    const { nodes } = useFlowStore.getState();
    const moved = [...nodes];
    const idSet = new Set(selectedNodes);
    // Move each selected node one position earlier (from front to back to preserve relative order)
    for (let i = 1; i < moved.length; i++) {
      if (idSet.has(moved[i].id) && !idSet.has(moved[i - 1].id)) {
        [moved[i - 1], moved[i]] = [moved[i], moved[i - 1]];
      }
    }
    setNodes(moved);
  }, [selectedNodes, setNodes]);

  const handleBringForward = useCallback(() => {
    if (selectedNodes.length === 0) return;
    const { nodes } = useFlowStore.getState();
    const idSet = new Set(selectedNodes);
    // Clear negative zIndex on selected nodes (they're being moved forward)
    const moved = nodes.map((n) => {
      if (idSet.has(n.id) && n.zIndex !== undefined && n.zIndex < 0) {
        const { zIndex: _z, ...rest } = n;
        return rest;
      }
      return n;
    });
    // Move each selected node one position later (from back to front to preserve relative order)
    for (let i = moved.length - 2; i >= 0; i--) {
      if (idSet.has(moved[i].id) && !idSet.has(moved[i + 1].id)) {
        [moved[i], moved[i + 1]] = [moved[i + 1], moved[i]];
      }
    }
    setNodes(moved);
  }, [selectedNodes, setNodes]);

  const handleSendToBack = useCallback(() => {
    if (selectedNodes.length === 0) return;
    const { nodes } = useFlowStore.getState();
    const idSet = new Set(selectedNodes);
    // Move to beginning of array AND set negative zIndex so they render below edges
    const selected = nodes.filter((n) => idSet.has(n.id)).map((n) => ({ ...n, zIndex: -1 }));
    const rest = nodes.filter((n) => !idSet.has(n.id));
    setNodes([...selected, ...rest]);
  }, [selectedNodes, setNodes]);

  const handleSendToFront = useCallback(() => {
    if (selectedNodes.length === 0) return;
    const { nodes } = useFlowStore.getState();
    const idSet = new Set(selectedNodes);
    // Move to end of array AND clear any negative zIndex
    const selected = nodes.filter((n) => idSet.has(n.id)).map((n) => {
      const { zIndex: _z, ...rest } = n;
      return rest;
    });
    const rest = nodes.filter((n) => !idSet.has(n.id));
    setNodes([...rest, ...selected]);
  }, [selectedNodes, setNodes]);

  const handleSave = useCallback(() => {
    exportAsJson({ includeViewport: true, includeStyles: true, includeMetadata: true, pretty: true });
  }, []);

  const handleOpen = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.fc,.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const result = importFromJson(text);
        const msg = `Imported ${result.nodeCount} nodes and ${result.edgeCount} edges`;
        if (result.warnings.length > 0) {
          log.warn('Import warnings', result.warnings);
          useUIStore.getState().showToast(`${msg} (${result.warnings.length} warnings — see console)`, 'warning');
        } else {
          useUIStore.getState().showToast(msg, 'success');
        }
      } catch (err) {
        log.error('Failed to load file', err);
        useUIStore.getState().showToast(`Failed to load file: ${err instanceof Error ? err.message : 'unknown error'}`, 'error');
      }
    };
    input.click();
  }, []);

  const handleAutoArrange = useCallback(() => {
    applyLayout('TB');
  }, [applyLayout]);

  const handleVerticalLayout = useCallback(() => {
    applyLayout('TB');
  }, [applyLayout]);

  const handleHorizontalLayout = useCallback(() => {
    applyLayout('LR');
  }, [applyLayout]);

  // Double-click format painter = persistent mode (stays active after applying)
  const setFormatPainterPersistent = useUIStore((s) => s.setFormatPainterPersistent);
  const formatPainterClickCount = useRef(0);
  const formatPainterClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activateFormatPainter = useCallback(() => {
    const { nodes, edges } = useFlowStore.getState();
    if (selectedNodes.length > 0) {
      const node = nodes.find((n) => n.id === selectedNodes[0]);
      if (node) {
        const d = node.data;
        // Resolve actual visual values — use explicit data, fall back to shape defaults
        const shapeDefaults: Record<string, string> = {
          rectangle: '#3b82f6', roundedRectangle: '#3b82f6', diamond: '#f59e0b',
          circle: '#10b981', parallelogram: '#8b5cf6', hexagon: '#ef4444',
          document: '#ec4899', cloud: '#6366f1', stickyNote: '#fbbf24',
          blockArrow: '#3b82f6', chevronArrow: '#8b5cf6', doubleArrow: '#f59e0b',
          circularArrow: '#10b981',
        };
        const resolvedColor = d.color || shapeDefaults[d.shape as string] || '#3b82f6';
        setFormatPainterNodeStyle({
          color: resolvedColor,
          borderColor: d.borderColor || undefined,
          textColor: d.textColor || undefined,
          fontSize: d.fontSize ?? undefined,
          fontWeight: d.fontWeight ?? undefined,
          fontFamily: d.fontFamily || undefined,
          borderStyle: d.borderStyle || undefined,
          borderWidth: d.borderWidth ?? undefined,
          borderRadius: d.borderRadius ?? undefined,
          opacity: d.opacity ?? undefined,
          textAlign: (d as Record<string, unknown>).textAlign as string | undefined,
        });
        setFormatPainterActive(true);
      }
    } else if (edges.length > 0 && selectedEdges.length > 0) {
      const edge = edges.find((e) => e.id === selectedEdges[0]);
      if (edge) {
        const d = (edge.data || {}) as Record<string, unknown>;
        setFormatPainterEdgeStyle({
          color: d.color as string | undefined,
          thickness: d.thickness as number | undefined,
          opacity: d.opacity as number | undefined,
          strokeDasharray: d.strokeDasharray as string | undefined,
          labelColor: d.labelColor as string | undefined,
        });
        setFormatPainterActive(true);
      }
    }
  }, [selectedNodes, selectedEdges, setFormatPainterActive, setFormatPainterNodeStyle, setFormatPainterEdgeStyle]);

  const handleFormatPainter = useCallback(() => {
    if (formatPainterActive) {
      // Toggle off
      clearFormatPainter();
      formatPainterClickCount.current = 0;
      return;
    }

    // Detect double-click for persistent mode
    formatPainterClickCount.current += 1;
    if (formatPainterClickCount.current === 1) {
      formatPainterClickTimer.current = setTimeout(() => {
        // Single click — activate in single-apply mode
        formatPainterClickCount.current = 0;
        setFormatPainterPersistent(false);
        activateFormatPainter();
        useUIStore.getState().showToast('Style copied — click a node to apply', 'info');
      }, 250);
    } else if (formatPainterClickCount.current >= 2) {
      // Double click — activate in persistent mode
      if (formatPainterClickTimer.current) clearTimeout(formatPainterClickTimer.current);
      formatPainterClickCount.current = 0;
      setFormatPainterPersistent(true);
      activateFormatPainter();
      useUIStore.getState().showToast('Persistent mode — click multiple nodes (Esc to stop)', 'info');
    }
  }, [formatPainterActive, clearFormatPainter, activateFormatPainter, setFormatPainterPersistent]);


  // ---- Transform helpers ---------------------------------------------------

  /** Always read selection fresh from the store to avoid stale closures */
  const getSelectedFlowNodes = useCallback(() => {
    const { nodes, selectedNodes: sel } = useFlowStore.getState();
    const idSet = new Set(sel);
    return nodes.filter((n) => idSet.has(n.id));
  }, []);

  /** Batch-update positions via immer (preserves React Flow node identity) */
  const applyPositions = useCallback((positions: Map<string, { x: number; y: number }>) => {
    useFlowStore.getState().batchUpdatePositions(positions);
  }, []);

  const handleAlign = useCallback((fn: typeof alignment.alignLeft) => {
    const nodes = getSelectedFlowNodes();
    if (nodes.length < 2) return;
    applyPositions(fn(nodes));
    setAlignDropdownOpen(false);
  }, [getSelectedFlowNodes, applyPositions]);

  const handleDistribute = useCallback((fn: typeof alignment.distributeH) => {
    const nodes = getSelectedFlowNodes();
    if (nodes.length < 3) return;
    applyPositions(fn(nodes));
    setAlignDropdownOpen(false);
  }, [getSelectedFlowNodes, applyPositions]);

  const handleMirror = useCallback((fn: typeof mirrorHorizontal) => {
    const nodes = getSelectedFlowNodes();
    if (nodes.length === 0) return;
    const isHorizontal = fn === mirrorHorizontal;
    const store = useFlowStore.getState();
    // Toggle CSS flip on each selected node
    for (const n of nodes) {
      if (isHorizontal) {
        store.updateNodeData(n.id, { flipH: !n.data.flipH });
      } else {
        store.updateNodeData(n.id, { flipV: !n.data.flipV });
      }
    }
    // For multi-node, also mirror positions
    if (nodes.length >= 2) {
      applyPositions(fn(nodes));
    }
    setMirrorDropdownOpen(false);
  }, [getSelectedFlowNodes, applyPositions]);

  const handleRotate = useCallback((angleDeg: number) => {
    const nodes = getSelectedFlowNodes();
    if (nodes.length === 0) return;
    const store = useFlowStore.getState();
    // Apply visual CSS rotation to each selected node (cumulative)
    for (const n of nodes) {
      const current = (n.data.rotation as number) || 0;
      store.updateNodeData(n.id, { rotation: (current + angleDeg) % 360 });
    }
    // For multi-node, also rotate positions around center
    if (nodes.length >= 2) {
      applyPositions(rotateArrangement(nodes, angleDeg));
    }
  }, [getSelectedFlowNodes, applyPositions]);

  const handleRotateLongPress = useCallback((_direction: 'cw' | 'ccw') => {
    rotateLongPressTimer.current = setTimeout(() => {
      rotateLongPressTimer.current = null;
      setRotateCustomOpen(true);
    }, 500);
  }, []);

  const handleRotateMouseUp = useCallback((direction: 'cw' | 'ccw') => {
    if (rotateLongPressTimer.current !== null) {
      // Short click — timer didn't fire, so do the rotation
      clearTimeout(rotateLongPressTimer.current);
      rotateLongPressTimer.current = null;
      const angle = isNaN(rotateIncrement) || rotateIncrement === 0 ? 15 : Math.abs(rotateIncrement);
      handleRotate(direction === 'cw' ? angle : -angle);
    }
  }, [handleRotate, rotateIncrement]);

  // ---- Drag-and-drop handlers ---------------------------------------------

  const handleDragStart = useCallback((e: React.DragEvent, groupId: string) => {
    dragRef.current = groupId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', groupId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragRef.current !== groupId) {
      setDragOver(groupId);
    }
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetGroupId: string) => {
    e.preventDefault();
    setDragOver(null);
    const sourceId = dragRef.current;
    if (!sourceId || sourceId === targetGroupId) return;
    const next = [...toolbarGroupOrder];
    const fromIdx = next.indexOf(sourceId);
    const toIdx = next.indexOf(targetGroupId);
    if (fromIdx === -1 || toIdx === -1) return;
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, sourceId);
    setToolbarGroupOrder(next);
    dragRef.current = null;
  }, [toolbarGroupOrder, setToolbarGroupOrder]);

  const handleDragEnd = useCallback(() => {
    dragRef.current = null;
    setDragOver(null);
  }, []);

  const hasSelection = selectedNodes.length > 0 || selectedEdges.length > 0;
  const iconSize = 16;

  // ---- Group content lookup -----------------------------------------------

  const groups: Record<string, React.ReactNode> = {
    file: (
      <>
      <div className="relative">
        <ToolbarButton
          icon={<FileText size={iconSize} />}
          tooltip="File"
          label={toolbarOrientation === 'horizontal' ? 'File' : undefined}
          onClick={() => setFileMenuOpen((o) => !o)}
          active={fileMenuOpen}
        />
        {fileMenuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setFileMenuOpen(false)} />
            <div className={`absolute ${toolbarOrientation === 'horizontal' ? 'top-full left-0 mt-1' : 'left-full top-0 ml-1'} z-50 min-w-[180px] rounded-lg shadow-xl border p-1 max-h-[calc(100vh-80px)] overflow-y-auto ${darkMode ? 'bg-dk-panel border-dk-border' : 'bg-white border-slate-200'}`}>
              <button onClick={() => { handleNew(); setFileMenuOpen(false); }} className={`flex items-center gap-2 w-full px-3 py-1.5 text-left text-sm rounded whitespace-nowrap transition-colors cursor-pointer ${darkMode ? 'hover:bg-dk-hover text-dk-text' : 'hover:bg-slate-100 text-slate-700'}`}>
                <FilePlus size={14} className="text-slate-400 dark:text-dk-faint" /> New Diagram
              </button>
              <button onClick={() => { window.open(window.location.href, '_blank'); setFileMenuOpen(false); }} className={`flex items-center gap-2 w-full px-3 py-1.5 text-left text-sm rounded whitespace-nowrap transition-colors cursor-pointer ${darkMode ? 'hover:bg-dk-hover text-dk-text' : 'hover:bg-slate-100 text-slate-700'}`}>
                <ExternalLink size={14} className="text-slate-400 dark:text-dk-faint" /> New Tab
              </button>
              <button onClick={() => { handleOpen(); setFileMenuOpen(false); }} className={`flex items-center gap-2 w-full px-3 py-1.5 text-left text-sm rounded whitespace-nowrap transition-colors cursor-pointer ${darkMode ? 'hover:bg-dk-hover text-dk-text' : 'hover:bg-slate-100 text-slate-700'}`}>
                <FolderOpen size={14} className="text-slate-400 dark:text-dk-faint" /> Open (.fc)
              </button>
              <button onClick={() => { handleSave(); setFileMenuOpen(false); }} className={`flex items-center gap-2 w-full px-3 py-1.5 text-left text-sm rounded whitespace-nowrap transition-colors cursor-pointer ${darkMode ? 'hover:bg-dk-hover text-dk-text' : 'hover:bg-slate-100 text-slate-700'}`}>
                <Save size={14} className="text-slate-400 dark:text-dk-faint" /> Save (.fc) <Kbd shortcut="Ctrl+S" />
              </button>
              <div className={`my-1 h-px ${darkMode ? 'bg-dk-hover' : 'bg-slate-200'}`} />
              <button onClick={() => { onOpenTemplates?.(); setFileMenuOpen(false); }} className={`flex items-center gap-2 w-full px-3 py-1.5 text-left text-sm rounded whitespace-nowrap transition-colors cursor-pointer ${darkMode ? 'hover:bg-dk-hover text-dk-text' : 'hover:bg-slate-100 text-slate-700'}`}>
                <LayoutTemplate size={14} className="text-slate-400 dark:text-dk-faint" /> Templates
              </button>
              <div className={`my-1 h-px ${darkMode ? 'bg-dk-hover' : 'bg-slate-200'}`} />
              <button
                onClick={() => { if (canInstall) { installPwa(); setFileMenuOpen(false); } }}
                disabled={!canInstall}
                className={`flex items-center gap-2 w-full px-3 py-1.5 text-left text-sm rounded whitespace-nowrap transition-colors ${canInstall ? `cursor-pointer ${darkMode ? 'hover:bg-dk-hover text-dk-text' : 'hover:bg-slate-100 text-slate-700'}` : 'opacity-40 cursor-not-allowed'} ${!canInstall ? (darkMode ? 'text-dk-muted' : 'text-slate-400') : ''}`}
              >
                <Download size={14} className="text-slate-400 dark:text-dk-faint" /> {isInstalled ? 'Installed' : 'Install as App'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Layout dropdown — auto-layout only */}
      <div ref={layoutMenuRef} className="relative">
        <ToolbarButton
          icon={<LayoutDashboard size={iconSize} />}
          tooltip="Layout"
          label={toolbarOrientation === 'horizontal' ? 'Layout' : undefined}
          onClick={() => { setLayoutMenuOpen(!layoutMenuOpen); }}
          active={layoutMenuOpen}
        />
        {layoutMenuOpen && (
          <div className={`absolute ${toolbarOrientation === 'horizontal' ? 'top-full left-0 mt-1' : 'left-full top-0 ml-1'} z-50 min-w-[180px] rounded-lg shadow-xl border p-1 max-h-[calc(100vh-80px)] overflow-y-auto ${darkMode ? 'bg-dk-panel border-dk-border' : 'bg-white border-slate-200'}`}>
            <button onClick={() => { handleAutoArrange(); setLayoutMenuOpen(false); }} className={`flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded cursor-pointer ${darkMode ? 'hover:bg-dk-hover text-dk-text' : 'hover:bg-slate-100 text-slate-700'}`}>
              <LayoutDashboard size={13} className="text-slate-400 dark:text-dk-faint" /> Auto Arrange <Kbd shortcut="Ctrl+Shift+L" />
            </button>
            <button onClick={() => { handleVerticalLayout(); setLayoutMenuOpen(false); }} className={`flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded cursor-pointer ${darkMode ? 'hover:bg-dk-hover text-dk-text' : 'hover:bg-slate-100 text-slate-700'}`}>
              <ArrowDownUp size={13} className="text-slate-400 dark:text-dk-faint" /> Vertical Layout
            </button>
            <button onClick={() => { handleHorizontalLayout(); setLayoutMenuOpen(false); }} className={`flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded cursor-pointer ${darkMode ? 'hover:bg-dk-hover text-dk-text' : 'hover:bg-slate-100 text-slate-700'}`}>
              <ArrowLeftRight size={13} className="text-slate-400 dark:text-dk-faint" /> Horizontal Layout
            </button>

            <div className={`my-1 h-px ${darkMode ? 'bg-dk-border' : 'bg-slate-200'}`} />
            <div className={`text-[10px] font-semibold uppercase tracking-wider px-2 pt-1 pb-0.5 ${darkMode ? 'text-dk-muted' : 'text-slate-500'}`}>Banner</div>

            <button
              onClick={() => setTopBannerEnabled(!topBannerEnabled)}
              className={`flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded cursor-pointer ${darkMode ? 'hover:bg-dk-hover text-dk-text' : 'hover:bg-slate-100 text-slate-700'}`}
            >
              <Flag size={13} className="text-slate-400 dark:text-dk-faint" />
              Top Banner
              <span className="ml-auto">
                <input
                  type="checkbox"
                  checked={topBannerEnabled}
                  onChange={() => setTopBannerEnabled(!topBannerEnabled)}
                  className="accent-primary cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                />
              </span>
            </button>

            <button
              onClick={() => setBottomBannerEnabled(!bottomBannerEnabled)}
              className={`flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded cursor-pointer ${darkMode ? 'hover:bg-dk-hover text-dk-text' : 'hover:bg-slate-100 text-slate-700'}`}
            >
              <Flag size={13} className="text-slate-400 rotate-180" />
              Bottom Banner
              <span className="ml-auto">
                <input
                  type="checkbox"
                  checked={bottomBannerEnabled}
                  onChange={() => setBottomBannerEnabled(!bottomBannerEnabled)}
                  className="accent-primary cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                />
              </span>
            </button>
          </div>
        )}
      </div>
      </>
    ),

    arrange: (
      <>
      {/* Align dropdown */}
      <div ref={alignMenuRef} className="relative">
        <ToolbarButton
          icon={<AlignCenterHorizontal size={iconSize} />}
          tooltip="Align & Distribute"
          onClick={() => { setAlignDropdownOpen(!alignDropdownOpen); setMirrorDropdownOpen(false); setRotateCustomOpen(false); }}
          active={alignDropdownOpen}
          disabled={!multiSelected}
        />
        {alignDropdownOpen && (
          <div className={`absolute ${toolbarOrientation === 'horizontal' ? 'top-full left-0 mt-1' : 'left-full top-0 ml-1'} z-50 min-w-[180px] rounded-lg shadow-xl border p-1 max-h-[calc(100vh-80px)] overflow-y-auto ${darkMode ? 'bg-dk-panel border-dk-border' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-semibold text-slate-500 dark:text-dk-muted px-2 pt-0.5 pb-0 uppercase tracking-wider">Horizontal</div>
            <button onClick={() => handleAlign(alignment.alignLeft)} className={`flex items-center gap-2 w-full px-2 py-1 text-xs rounded cursor-pointer ${darkMode ? 'hover:bg-dk-hover text-dk-text' : 'hover:bg-slate-100 text-slate-700'}`}>
              <AlignLeft size={13} className="text-slate-400 dark:text-dk-faint" /> Left <Kbd shortcut="Ctrl+Alt+L" />
            </button>
            <button onClick={() => handleAlign(alignment.alignCenterH)} className={`flex items-center gap-2 w-full px-2 py-1 text-xs rounded cursor-pointer ${darkMode ? 'hover:bg-dk-hover text-dk-text' : 'hover:bg-slate-100 text-slate-700'}`}>
              <AlignCenterVertical size={13} className="text-slate-400 dark:text-dk-faint" /> Center <Kbd shortcut="Ctrl+Alt+E" />
            </button>
            <button onClick={() => handleAlign(alignment.alignRight)} className={`flex items-center gap-2 w-full px-2 py-1 text-xs rounded cursor-pointer ${darkMode ? 'hover:bg-dk-hover text-dk-text' : 'hover:bg-slate-100 text-slate-700'}`}>
              <AlignRight size={13} className="text-slate-400 dark:text-dk-faint" /> Right <Kbd shortcut="Ctrl+Alt+R" />
            </button>
            <div className="my-0.5 h-px bg-slate-200 dark:bg-dk-border" />
            <div className="text-[10px] font-semibold text-slate-500 dark:text-dk-muted px-2 pt-0.5 pb-0 uppercase tracking-wider">Vertical</div>
            <button onClick={() => handleAlign(alignment.alignTop)} className={`flex items-center gap-2 w-full px-2 py-1 text-xs rounded cursor-pointer ${darkMode ? 'hover:bg-dk-hover text-dk-text' : 'hover:bg-slate-100 text-slate-700'}`}>
              <AlignStartVertical size={13} className="text-slate-400 dark:text-dk-faint" /> Top <Kbd shortcut="Ctrl+Alt+T" />
            </button>
            <button onClick={() => handleAlign(alignment.alignCenterV)} className={`flex items-center gap-2 w-full px-2 py-1 text-xs rounded cursor-pointer ${darkMode ? 'hover:bg-dk-hover text-dk-text' : 'hover:bg-slate-100 text-slate-700'}`}>
              <AlignCenterHorizontal size={13} className="text-slate-400 dark:text-dk-faint" /> Center <Kbd shortcut="Ctrl+Alt+M" />
            </button>
            <button onClick={() => handleAlign(alignment.alignBottom)} className={`flex items-center gap-2 w-full px-2 py-1 text-xs rounded cursor-pointer ${darkMode ? 'hover:bg-dk-hover text-dk-text' : 'hover:bg-slate-100 text-slate-700'}`}>
              <AlignEndVertical size={13} className="text-slate-400 dark:text-dk-faint" /> Bottom <Kbd shortcut="Ctrl+Alt+B" />
            </button>
            {selectedNodes.length >= 3 && (
              <>
                <div className="my-1 h-px bg-slate-200 dark:bg-dk-border" />
                <div className="text-[10px] font-semibold text-slate-500 dark:text-dk-muted px-2 pt-1 pb-0.5 uppercase tracking-wider">Distribute</div>
                <button onClick={() => handleDistribute(alignment.distributeH)} className={`flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded cursor-pointer ${darkMode ? 'hover:bg-dk-hover text-dk-text' : 'hover:bg-slate-100 text-slate-700'}`}>
                  <ArrowLeftRight size={13} className="text-slate-400 dark:text-dk-faint" /> Horizontal
                </button>
                <button onClick={() => handleDistribute(alignment.distributeV)} className={`flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded cursor-pointer ${darkMode ? 'hover:bg-dk-hover text-dk-text' : 'hover:bg-slate-100 text-slate-700'}`}>
                  <ArrowDownUp size={13} className="text-slate-400 dark:text-dk-faint" /> Vertical
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Mirror dropdown */}
      <div ref={mirrorMenuRef} className="relative">
        <ToolbarButton
          icon={<FlipHorizontal2 size={iconSize} />}
          tooltip="Mirror (Ctrl+Shift+H / Ctrl+Alt+V)"
          onClick={() => { setMirrorDropdownOpen(!mirrorDropdownOpen); setAlignDropdownOpen(false); setRotateCustomOpen(false); }}
          active={mirrorDropdownOpen}
          disabled={selectedNodes.length === 0}
        />
        {mirrorDropdownOpen && (
          <div className={`absolute ${toolbarOrientation === 'horizontal' ? 'top-full left-0 mt-1' : 'left-full top-0 ml-1'} z-50 min-w-[170px] rounded-lg shadow-xl border p-1 max-h-[calc(100vh-80px)] overflow-y-auto ${darkMode ? 'bg-dk-panel border-dk-border' : 'bg-white border-slate-200'}`}>
            <button onClick={() => { handleMirror(mirrorHorizontal); }} className={`flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded cursor-pointer ${darkMode ? 'hover:bg-dk-hover text-dk-text' : 'hover:bg-slate-100 text-slate-700'}`}>
              <FlipHorizontal2 size={13} className="text-slate-400 dark:text-dk-faint" /> Horizontal <Kbd shortcut="Ctrl+Shift+H" />
            </button>
            <button onClick={() => { handleMirror(mirrorVertical); }} className={`flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded cursor-pointer ${darkMode ? 'hover:bg-dk-hover text-dk-text' : 'hover:bg-slate-100 text-slate-700'}`}>
              <FlipVertical2 size={13} className="text-slate-400 dark:text-dk-faint" /> Vertical <Kbd shortcut="Ctrl+Alt+V" />
            </button>
          </div>
        )}
      </div>

      {/* Rotate left (CCW) — click = rotate, long-press = custom angle */}
      <div ref={rotateCustomRef} className="relative flex items-center">
        <button
          data-tooltip={`Rotate Left ${isNaN(rotateIncrement) || rotateIncrement === 0 ? 15 : Math.abs(rotateIncrement)}°  (hold for custom)`}
          disabled={selectedNodes.length === 0}
          onMouseDown={() => handleRotateLongPress('ccw')}
          onMouseUp={() => handleRotateMouseUp('ccw')}
          onMouseLeave={() => { if (rotateLongPressTimer.current) { clearTimeout(rotateLongPressTimer.current); rotateLongPressTimer.current = null; } }}
          className={`
            relative flex items-center gap-1 px-1.5 py-1 rounded text-xs transition-colors duration-100
            ${selectedNodes.length === 0
              ? 'cursor-not-allowed text-slate-300 dark:text-slate-600'
              : 'cursor-pointer text-text-muted hover:bg-slate-100 dark:hover:bg-dk-hover hover:text-text dark:hover:text-dk-text'}
          `}
        >
          <RotateCcw size={iconSize} />
        </button>
        <button
          data-tooltip={`Rotate Right ${isNaN(rotateIncrement) || rotateIncrement === 0 ? 15 : Math.abs(rotateIncrement)}°  (hold for custom)`}
          disabled={selectedNodes.length === 0}
          onMouseDown={() => handleRotateLongPress('cw')}
          onMouseUp={() => handleRotateMouseUp('cw')}
          onMouseLeave={() => { if (rotateLongPressTimer.current) { clearTimeout(rotateLongPressTimer.current); rotateLongPressTimer.current = null; } }}
          className={`
            relative flex items-center gap-1 px-1.5 py-1 rounded text-xs transition-colors duration-100
            ${selectedNodes.length === 0
              ? 'cursor-not-allowed text-slate-300 dark:text-slate-600'
              : 'cursor-pointer text-text-muted hover:bg-slate-100 dark:hover:bg-dk-hover hover:text-text dark:hover:text-dk-text'}
          `}
        >
          <RotateCw size={iconSize} />
        </button>

        {/* Custom angle popover — shown on long-press */}
        {rotateCustomOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setRotateCustomOpen(false)} />
            <div className={`absolute ${toolbarOrientation === 'horizontal' ? 'top-full left-0 mt-1' : 'left-full top-0 ml-1'} z-50 rounded-lg shadow-xl border p-2 max-h-[calc(100vh-80px)] overflow-y-auto ${darkMode ? 'bg-dk-panel border-dk-border' : 'bg-white border-slate-200'}`}>
              <div className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${darkMode ? 'text-dk-muted' : 'text-slate-500'}`}>
                Rotation Increment
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={customRotateAngle}
                  onChange={(e) => setCustomRotateAngle(e.target.value)}
                  placeholder="15"
                  autoFocus
                  className={`w-16 text-xs px-1.5 py-1 rounded border ${darkMode ? 'bg-dk-input border-dk-border text-dk-text' : 'bg-white border-slate-200 text-slate-700'}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') {
                      setRotateCustomOpen(false);
                    }
                  }}
                />
                <span className={`text-xs ${darkMode ? 'text-dk-muted' : 'text-slate-400'}`}>deg</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Straighten All Edges */}
      <ToolbarButton
        icon={<MoveHorizontal size={iconSize} />}
        tooltip="Straighten All Edges (Ctrl+Alt+S)"
        onClick={() => useFlowStore.getState().straightenEdges()}
        disabled={useFlowStore.getState().edges.length === 0}
      />
      </>
    ),

    edit: (
      <>
        <ToolbarButton icon={<Undo2 size={iconSize} />} tooltip="Undo (Ctrl+Z)" onClick={onUndo} disabled={!canUndo} />
        <ToolbarButton icon={<Redo2 size={iconSize} />} tooltip="Redo (Ctrl+Shift+Z)" onClick={onRedo} disabled={!canRedo} />
        <ToolbarButton icon={<Copy size={iconSize} />} tooltip="Copy (Ctrl+C)" disabled={!hasSelection} />
        <ToolbarButton icon={<Clipboard size={iconSize} />} tooltip="Paste (Ctrl+V)" disabled />
        <ToolbarButton icon={<Trash2 size={iconSize} />} tooltip="Delete Selected (Del)" onClick={handleDelete} disabled={!hasSelection} />
      </>
    ),

    order: (
      <>
        <ZOrderButton icon={<ChevronDown size={iconSize} />} tooltip={"Send Backward (Ctrl+[)\nHold for Send to Back"} onClick={handleSendBackward} onSendAll={handleSendToBack} sendAllLabel="Send to Back" disabled={selectedNodes.length === 0} />
        <ZOrderButton icon={<ChevronUp size={iconSize} />} tooltip={"Bring Forward (Ctrl+])\nHold for Bring to Front"} onClick={handleBringForward} onSendAll={handleSendToFront} sendAllLabel="Bring to Front" disabled={selectedNodes.length === 0} />
        <ToolbarButton icon={<Layers size={iconSize} />} tooltip="Element Order" onClick={() => setOrderModalOpen(true)} />
      </>
    ),

    view: (
      <>
        {/* Select dropdown */}
        <div className="relative" ref={selectMenuRef}>
          <ToolbarButton
            icon={<MousePointer2 size={iconSize} />}
            tooltip="Select"
            onClick={() => setSelectMenuOpen(!selectMenuOpen)}
          />
          {selectMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setSelectMenuOpen(false)} />
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-dk-panel border border-slate-200 dark:border-dk-border rounded-lg shadow-lg p-1 z-50 w-44">
                <button
                  onClick={() => { handleSelectAll(); setSelectMenuOpen(false); }}
                  className="w-full flex items-center gap-2 text-left text-xs px-2 py-1.5 rounded transition-colors text-slate-600 dark:text-dk-muted hover:bg-slate-100 dark:hover:bg-dk-hover"
                >
                  <BoxSelect size={14} />
                  Select All
                </button>
                <button
                  onClick={() => { handleDeselectAll(); setSelectMenuOpen(false); }}
                  className={`w-full flex items-center gap-2 text-left text-xs px-2 py-1.5 rounded transition-colors ${
                    !hasSelection
                      ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                      : 'text-slate-600 dark:text-dk-muted hover:bg-slate-100 dark:hover:bg-dk-hover'
                  }`}
                  disabled={!hasSelection}
                >
                  <PointerOff size={14} />
                  Deselect All
                </button>
              </div>
            </>
          )}
        </div>
        <ToolbarButton icon={<Maximize size={iconSize} />} tooltip="Fit View" onClick={onFitView} />

        {/* Grid Options dropdown */}
        <div className="relative" ref={gridDropdownRef}>
          <ToolbarButton
            icon={<Grid3X3 size={iconSize} />}
            tooltip="Grid Options"
            onClick={() => setGridOptionsOpen(!gridOptionsOpen)}
            active={gridVisible}
          />
          {gridOptionsOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-dk-panel border border-slate-200 dark:border-dk-border rounded-lg shadow-lg p-3 z-50 w-48 max-h-[calc(100vh-80px)] overflow-y-auto">
              <button
                onClick={toggleGrid}
                className={`w-full text-left text-xs px-2 py-1.5 rounded mb-2 transition-colors ${
                  gridVisible
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-600 dark:text-dk-muted hover:bg-slate-100 dark:hover:bg-dk-hover'
                }`}
              >
                {gridVisible ? 'Hide Grid' : 'Show Grid'}
              </button>

              <div className="text-[10px] font-semibold text-slate-500 dark:text-dk-muted mb-1.5 uppercase tracking-wider">
                Grid Style
              </div>
              <div className="flex gap-1 mb-3">
                {(['dots', 'lines', 'cross'] as const).map((style) => (
                  <button
                    key={style}
                    onClick={() => setGridStyle(style)}
                    className={`flex-1 text-[11px] px-1.5 py-1 rounded transition-colors capitalize ${
                      gridStyle === style
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-slate-600 dark:text-dk-muted hover:bg-slate-100 dark:hover:bg-dk-hover'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>

              <div className="text-[10px] font-semibold text-slate-500 dark:text-dk-muted mb-1.5 uppercase tracking-wider">
                Grid Size
              </div>
              <div className="flex gap-1 mb-3">
                {[10, 20, 40, 80].map((size) => (
                  <button
                    key={size}
                    onClick={() => setGridSpacing(size)}
                    className={`flex-1 text-[11px] px-1 py-1 rounded transition-colors ${
                      gridSpacing === size
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-slate-600 dark:text-dk-muted hover:bg-slate-100 dark:hover:bg-dk-hover'
                    }`}
                  >
                    {size}px
                  </button>
                ))}
              </div>

              <div className="text-[10px] font-semibold text-slate-500 dark:text-dk-muted mb-1.5 uppercase tracking-wider">
                Grid Color
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={gridColor ?? (darkMode ? '#334155' : '#e5e7eb')}
                  onChange={(e) => setGridColor(e.target.value)}
                  className="w-6 h-6 rounded border border-slate-200 dark:border-dk-border cursor-pointer p-0"
                />
                <span className={`text-[11px] font-mono ${darkMode ? 'text-dk-muted' : 'text-slate-500'}`}>
                  {gridColor ?? 'Auto'}
                </span>
                {gridColor && (
                  <button
                    onClick={() => setGridColor(null)}
                    className="text-[10px] text-primary hover:underline ml-auto"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <ToolbarButton icon={<Ruler size={iconSize} />} tooltip="Toggle Rulers" onClick={toggleRuler} active={rulerVisible} />
        <div className="relative" ref={snapDropdownRef}>
          <ToolbarButton icon={<Magnet size={iconSize} />} tooltip="Snap Options" onClick={() => setSnapOptionsOpen(!snapOptionsOpen)} active={snapEnabled} />
          {snapOptionsOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-dk-panel border border-slate-200 dark:border-dk-border rounded-lg shadow-lg p-3 z-50 w-48 max-h-[calc(100vh-80px)] overflow-y-auto">
              <button
                onClick={toggleSnap}
                className={`w-full text-left text-xs px-2 py-1.5 rounded mb-2 transition-colors ${
                  snapEnabled
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-600 dark:text-dk-muted hover:bg-slate-100 dark:hover:bg-dk-hover'
                }`}
              >
                {snapEnabled ? 'Disable Snap' : 'Enable Snap'}
              </button>

              <div className="text-[10px] font-semibold text-slate-500 dark:text-dk-muted mb-1.5 uppercase tracking-wider">
                Snap Distance
              </div>
              <div className="flex gap-1">
                {[4, 8, 16, 32].map((dist) => (
                  <button
                    key={dist}
                    onClick={() => setSnapDistance(dist)}
                    className={`flex-1 text-[11px] px-1 py-1 rounded transition-colors ${
                      snapDistance === dist
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-slate-600 dark:text-dk-muted hover:bg-slate-100 dark:hover:bg-dk-hover'
                    }`}
                  >
                    {dist}px
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <ToolbarButton icon={<Crosshair size={iconSize} />} tooltip="Alignment Guides" onClick={toggleAlignmentGuides} active={showAlignmentGuides} />
        <ToolbarButton icon={<GitBranch size={iconSize} />} tooltip="Toggle Dependency Badges" onClick={toggleBadges} active={showBadges} />
      </>
    ),

    panels: (
      <>
        <ToolbarButton
          icon={<Palette size={iconSize} />}
          tooltip="Properties Panel"
          onClick={togglePropertiesPanel}
          active={propertiesPanelOpen}
        />
        <ToolbarButton
          icon={<PaintBucket size={iconSize} />}
          tooltip={formatPainterActive ? 'Cancel Format Painter (Esc)' : 'Format Painter'}
          onClick={handleFormatPainter}
          active={formatPainterActive}
          disabled={!hasSelection && !formatPainterActive}
        />
        <ToolbarButton
          icon={<MousePointerClick size={iconSize} />}
          tooltip="Select Same Type"
          onClick={() => {
            const { nodes, setSelectedNodes, edges, setSelectedEdges } = useFlowStore.getState();
            // Try nodes first
            const sourceNode = nodes.find((n) => n.selected);
            if (sourceNode && sourceNode.data.shape) {
              const sourceShape = sourceNode.data.shape;
              const sameShapeIds = nodes
                .filter((n) => n.data.shape === sourceShape)
                .map((n) => n.id);
              setSelectedNodes(sameShapeIds);
              return;
            }
            // Fall back to edges
            const sourceEdge = edges.find((e) => e.selected);
            if (sourceEdge) {
              const sourceType = sourceEdge.type || 'smoothstep';
              const sameTypeIds = edges
                .filter((e) => (e.type || 'smoothstep') === sourceType)
                .map((e) => e.id);
              setSelectedEdges(sameTypeIds);
            }
          }}
          disabled={!hasSelection}
        />
        {/* Font picker */}
        <div className="relative" ref={fontPickerRef}>
          <ToolbarButton
            icon={<Type size={iconSize} />}
            tooltip="Global Font"
            onClick={() => setFontPickerOpen((o) => !o)}
            active={fontPickerOpen}
          />
          {fontPickerOpen && (() => {
            const currentFont = useSettingsStore.getState().nodeDefaults.fontFamily;
            let lastCategory = '';
            return (
              <div className="absolute top-full right-0 mt-1 bg-white dark:bg-dk-panel border border-slate-200 dark:border-dk-border rounded-lg shadow-xl p-1 z-50 min-w-[210px] max-h-[min(400px,calc(100vh-80px))] overflow-y-auto">
                <div className="text-[10px] font-semibold text-slate-400 dark:text-dk-faint uppercase tracking-wide px-2 pt-1 pb-1">
                  Global Font
                </div>
                {FONT_OPTIONS.map((f) => {
                  const isActive = currentFont === f.value;
                  const showCategoryHeader = f.category !== lastCategory;
                  lastCategory = f.category;
                  return (
                    <React.Fragment key={f.value}>
                      {showCategoryHeader && (
                        <div className="text-[9px] font-semibold text-slate-400 dark:text-dk-faint uppercase tracking-wider px-2 pt-2 pb-0.5">
                          {f.category}
                        </div>
                      )}
                      <button
                        onClick={() => handleFontChange(f.value)}
                        className={`flex items-center gap-2 w-full px-2 py-1 text-xs rounded transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'hover:bg-slate-100 dark:hover:bg-dk-hover text-slate-700 dark:text-dk-text'
                        }`}
                      >
                        <span
                          className="text-sm w-[24px] text-center flex-shrink-0"
                          style={{ fontFamily: f.value }}
                        >
                          Aa
                        </span>
                        <span style={{ fontFamily: f.value }}>{f.label}</span>
                        {isActive && <span className="ml-auto text-primary text-[10px]">&#10003;</span>}
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Font size inc/dec */}
        <ToolbarButton
          icon={<AArrowUp size={iconSize} />}
          tooltip="Increase All Font Sizes"
          onClick={() => handleGlobalFontSize(2)}
        />
        <ToolbarButton
          icon={<AArrowDown size={iconSize} />}
          tooltip="Decrease All Font Sizes"
          onClick={() => handleGlobalFontSize(-2)}
        />
      </>
    ),

    export: (
      <>
        {/* SVG copy dropdown */}
        <div className="relative">
          <ToolbarButton
            icon={<Code size={iconSize} />}
            tooltip="Copy SVG"
            onClick={() => setSvgCopyOpen(!svgCopyOpen)}
            active={svgCopyOpen}
          />
          {svgCopyOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-dk-panel border border-slate-200 dark:border-dk-border rounded-lg shadow-lg p-1 z-50 min-w-[170px] max-h-[calc(100vh-80px)] overflow-y-auto">
              <button
                onClick={() => {
                  handleCopySvg();
                  setSvgCopyOpen(false);
                  useUIStore.getState().showToast('SVG code copied to clipboard', 'success');
                }}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-slate-100 dark:hover:bg-dk-hover text-slate-700 dark:text-dk-text"
              >
                <Code size={13} className="text-slate-400 dark:text-dk-faint" /> Copy Raw Code
              </button>
              <button
                onClick={() => {
                  handleCopySvgForPaste();
                  setSvgCopyOpen(false);
                  useUIStore.getState().showToast('SVG copied — paste into PPT/Slides', 'success');
                }}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-slate-100 dark:hover:bg-dk-hover text-slate-700 dark:text-dk-text"
              >
                <Image size={13} className="text-slate-400 dark:text-dk-faint" /> Copy for PPT
              </button>
            </div>
          )}
        </div>

        <ToolbarButton icon={<Upload size={iconSize} />} tooltip="Export (Ctrl+Shift+E)" onClick={handleOpenExport} />
        <ToolbarButton icon={<ClipboardPaste size={iconSize} />} tooltip="Import JSON" onClick={() => setImportDialogOpen(true)} />
      </>
    ),

  };

  // ---- Render -------------------------------------------------------------

  const isVertical = toolbarOrientation === 'vertical';

  // Orientation-aware separator
  const Sep = isVertical
    ? () => <div className="h-px w-full bg-border dark:bg-dk-border my-0.5 shrink-0" />
    : () => <div className="w-px h-5 bg-border dark:bg-dk-border mx-1 shrink-0" />;

  return (
    <div
      className={`
        relative select-none shrink-0
        ${isVertical
          ? 'toolbar-vertical flex flex-col items-center w-11 border-r py-1 overflow-y-auto overflow-x-hidden'
          : 'flex items-center min-h-11 px-3 border-b flex-wrap gap-y-1 py-1'
        }
        ${darkMode
          ? 'bg-surface-alt-dark border-border-dark'
          : 'bg-surface-alt border-border'
        }
      `}
    >
      {/* ---- Logo (pinned first) ---- */}
      <a href={window.location.origin + window.location.pathname} target="_blank" rel="noopener noreferrer" className={`flex items-center shrink-0 cursor-pointer ${isVertical ? 'py-1' : 'gap-2 mr-1'}`}>
        <Workflow size={20} className="text-primary" />
        {!isVertical && (
          <span className={`font-display font-semibold text-sm tracking-tight ${darkMode ? 'text-dk-text' : ''}`}>
            Chart Hero
          </span>
        )}
      </a>

      <Sep />

      {/* ---- Reorderable groups ---- */}
      {/* Ensure new groups added to code appear even if not in persisted order */}
      {(() => {
        const allGroupIds = Object.keys(groups);
        const missing = allGroupIds.filter((id) => !toolbarGroupOrder.includes(id));
        return [...toolbarGroupOrder, ...missing];
      })().map((groupId, idx, arr) => {
        const content = groups[groupId];
        if (!content) return null;
        return (
          <React.Fragment key={groupId}>
            <div
              onDragOver={toolbarLocked ? undefined : (e) => handleDragOver(e, groupId)}
              onDragLeave={toolbarLocked ? undefined : handleDragLeave}
              onDrop={toolbarLocked ? undefined : (e) => handleDrop(e, groupId)}
              className={`
                flex gap-0.5 rounded transition-all duration-150 shrink-0
                ${isVertical ? 'flex-col items-center px-0.5 py-0.5 w-full' : 'items-center px-0.5'}
                ${dragOver === groupId
                  ? 'ring-2 ring-blue-400/60 bg-blue-50/50 dark:bg-blue-800/10'
                  : ''
                }
              `}
            >
              {/* Drag handle — only visible when toolbar is unlocked */}
              {!toolbarLocked && (
                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, groupId)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center justify-center rounded cursor-grab hover:bg-slate-200 dark:hover:bg-dk-hover transition-colors shrink-0
                    ${isVertical ? 'w-6 h-3' : 'w-4 h-6'}`}
                  title={`Drag to reorder "${groupId}" group`}
                >
                  <GripVertical size={11} className={`text-slate-400 dark:text-dk-faint ${isVertical ? 'rotate-90' : ''}`} />
                </div>
              )}
              {content}
            </div>
            {idx < arr.length - 1 && <Sep />}
          </React.Fragment>
        );
      })}

      {/* ---- Spacer ---- */}
      <div className={isVertical ? 'flex-1 min-h-2' : 'flex-1 min-w-2'} />

      {/* ---- Pinned utility icons + Meta (permanent, not reorderable) ---- */}
      <div className={`flex items-center shrink-0 ${isVertical ? 'flex-col gap-0.5 pb-1' : ''}`}>
        <Sep />

        <span data-style-picker-toggle>
          <ToolbarButton
            icon={<Paintbrush size={14} />}
            tooltip="Style & Palette"
            onClick={() => setStylePickerOpen((o) => !o)}
            active={stylePickerOpen}
          />
        </span>

        {/* Selection color picker */}
        <div className="relative">
          <button
            data-tooltip="Selection Highlight Color"
            onClick={() => setSelectionColorOpen((o) => !o)}
            className="relative flex items-center gap-1 px-1.5 py-1 rounded text-xs cursor-pointer transition-colors duration-100 text-text-muted hover:bg-slate-100 hover:text-text dark:hover:bg-dk-hover dark:hover:text-dk-text"
          >
            <MousePointer2 size={14} />
            <span
              className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-[3px] rounded-full"
              style={{ width: 14, backgroundColor: selectionColor }}
            />
          </button>

          {selectionColorOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 p-3 rounded-lg shadow-xl border bg-white dark:bg-dk-panel dark:border-dk-border max-h-[calc(100vh-80px)] overflow-y-auto" style={{ minWidth: 160 }}>
              <div className="text-[10px] font-semibold text-slate-400 dark:text-dk-faint uppercase tracking-wide mb-2">Selection Color</div>
              <div className="grid grid-cols-5 gap-2">
                {['#d946ef', '#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#6b7280'].map((c) => (
                  <button
                    key={c}
                    onClick={() => { setSelectionColor(c); setSelectionColorOpen(false); }}
                    className="w-6 h-6 rounded-full cursor-pointer transition-transform hover:scale-125"
                    style={{
                      backgroundColor: c,
                      border: c === selectionColor ? '2px solid #fff' : '2px solid transparent',
                      boxShadow: c === selectionColor ? `0 0 0 2px ${c}` : 'none',
                    }}
                  />
                ))}
              </div>
              <div className="text-[10px] font-semibold text-slate-400 dark:text-dk-faint uppercase tracking-wide mt-3 mb-1.5">Thickness</div>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectionThickness(t)}
                    className={`flex-1 text-[11px] px-1 py-1 rounded transition-colors cursor-pointer ${
                      selectionThickness === t
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-slate-600 dark:text-dk-muted hover:bg-slate-100 dark:hover:bg-dk-hover'
                    }`}
                  >
                    {t}px
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <AIButton />

        {/* CollabToolbarButton — disabled (WIP: needs self-hosted signaling server) */}

        <Sep />

        <ToolbarButton
          icon={toolbarLocked ? <Lock size={14} /> : <Unlock size={14} />}
          tooltip={toolbarLocked ? 'Unlock Toolbar (allow reordering)' : 'Lock Toolbar'}
          onClick={toggleToolbarLocked}
          active={!toolbarLocked}
        />
        <ToolbarButton
          icon={isVertical ? <PanelTop size={14} /> : <PanelLeft size={14} />}
          tooltip={isVertical ? 'Switch to Horizontal Toolbar' : 'Switch to Vertical Toolbar'}
          onClick={toggleToolbarOrientation}
        />

        {!isVertical && (
          <>
            <Sep />
            <span className="text-[9px] text-text-muted/60 italic select-none px-1 tracking-wide">
              v{__APP_VERSION__}
            </span>
            <a
              href={`${import.meta.env.BASE_URL}user-guide.html`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded text-text-muted hover:text-text transition-colors"
              data-tooltip="User Guide"
            >
              <HelpCircle size={14} />
            </a>
            <a
              href="https://github.com/ghost-ng/Chart-Hero"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded text-text-muted hover:text-text transition-colors"
              data-tooltip="GitHub"
            >
              <Github size={14} />
            </a>
          </>
        )}
      </div>

      {/* ---- Floating dialogs/dropdowns ---- */}
      <ImportJsonDialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} />
      <DiagramStylePicker
        open={stylePickerOpen}
        onClose={() => setStylePickerOpen(false)}
      />
      {orderModalOpen && <OrderModal onClose={() => setOrderModalOpen(false)} />}
    </div>
  );
};

export default React.memo(Toolbar);
