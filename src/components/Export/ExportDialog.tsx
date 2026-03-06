// ---------------------------------------------------------------------------
// ExportDialog.tsx -- Full export modal for Chart Hero
// ---------------------------------------------------------------------------

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Download,
  Image as ImageIcon,
  FileCode,
  FileText,
  Presentation,
  Braces,
  Loader2,
  Check,
  AlertCircle,
  Maximize2,
  MousePointerSquareDashed,
  ClipboardCopy,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { getNodesBounds, getViewportForBounds } from '@xyflow/react';

import {
  useExportStore,
  type ExportFormat,
} from '../../store/exportStore';
import { useFlowStore } from '../../store/flowStore';
import { useStyleStore } from '../../store/styleStore';
import { useSwimlaneStore } from '../../store/swimlaneStore';
import { getReactFlowInstance } from '../Canvas/FlowCanvas';
import {
  runExport,
  getReactFlowElement,
  estimateFileSize,
  copyJsonToClipboard,
} from '../../utils/exportUtils';
import { log } from '../../utils/logger';

// ---------------------------------------------------------------------------
// Format tab config
// ---------------------------------------------------------------------------

interface FormatTab {
  id: ExportFormat;
  label: string;
  icon: React.ReactNode;
}

const FORMAT_TABS: FormatTab[] = [
  { id: 'png', label: 'PNG', icon: <ImageIcon size={14} /> },
  { id: 'jpg', label: 'JPG', icon: <ImageIcon size={14} /> },
  { id: 'svg', label: 'SVG', icon: <FileCode size={14} /> },
  { id: 'pdf', label: 'PDF', icon: <FileText size={14} /> },
  { id: 'pptx', label: 'PPTX', icon: <Presentation size={14} /> },
  { id: 'json', label: 'JSON', icon: <Braces size={14} /> },
];

// ---------------------------------------------------------------------------
// Options panels
// ---------------------------------------------------------------------------

const PngOptionsPanel: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const options = useExportStore((s) => s.options.png);
  const setOpts = useExportStore((s) => s.setExportOptions);

  return (
    <div className="space-y-4">
      {/* Scale */}
      <OptionGroup label="Scale" darkMode={darkMode}>
        <select
          value={options.scale}
          onChange={(e) => setOpts('png', { scale: Number(e.target.value) })}
          className={selectClass(darkMode)}
        >
          <option value={1}>1x (Standard)</option>
          <option value={2}>2x (Retina)</option>
          <option value={3}>3x (High DPI)</option>
          <option value={4}>4x (Ultra)</option>
        </select>
      </OptionGroup>

      {/* Transparent background */}
      <OptionGroup label="Background" darkMode={darkMode}>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={options.transparentBackground}
            onChange={(e) =>
              setOpts('png', { transparentBackground: e.target.checked })
            }
            className="rounded accent-blue-500"
          />
          <span className={`text-sm ${darkMode ? 'text-dk-muted' : 'text-gray-600'}`}>
            Transparent background
          </span>
        </label>
      </OptionGroup>

      {/* Padding */}
      <OptionGroup label="Padding" darkMode={darkMode}>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            value={options.padding}
            onChange={(e) => setOpts('png', { padding: Number(e.target.value) })}
            className="flex-1 accent-blue-500"
          />
          <span className={`text-sm w-10 text-right ${darkMode ? 'text-dk-muted' : 'text-gray-600'}`}>
            {options.padding}px
          </span>
        </div>
      </OptionGroup>
    </div>
  );
};

const JpgOptionsPanel: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const options = useExportStore((s) => s.options.jpg);
  const setOpts = useExportStore((s) => s.setExportOptions);

  return (
    <div className="space-y-4">
      {/* Scale */}
      <OptionGroup label="Scale" darkMode={darkMode}>
        <select
          value={options.scale}
          onChange={(e) => setOpts('jpg', { scale: Number(e.target.value) })}
          className={selectClass(darkMode)}
        >
          <option value={1}>1x (Standard)</option>
          <option value={2}>2x (Retina)</option>
          <option value={3}>3x (High DPI)</option>
          <option value={4}>4x (Ultra)</option>
        </select>
      </OptionGroup>

      {/* Quality */}
      <OptionGroup label="Quality" darkMode={darkMode}>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={Math.round(options.quality * 100)}
            onChange={(e) =>
              setOpts('jpg', { quality: Number(e.target.value) / 100 })
            }
            className="flex-1 accent-blue-500"
          />
          <span className={`text-sm w-12 text-right ${darkMode ? 'text-dk-muted' : 'text-gray-600'}`}>
            {Math.round(options.quality * 100)}%
          </span>
        </div>
      </OptionGroup>

      {/* Background color */}
      <OptionGroup label="Background Color" darkMode={darkMode}>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={options.backgroundColor}
            onChange={(e) =>
              setOpts('jpg', { backgroundColor: e.target.value })
            }
            className="w-8 h-8 rounded border-0 cursor-pointer"
          />
          <span className={`text-sm font-mono ${darkMode ? 'text-dk-muted' : 'text-gray-600'}`}>
            {options.backgroundColor}
          </span>
        </div>
      </OptionGroup>

      {/* Padding */}
      <OptionGroup label="Padding" darkMode={darkMode}>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            value={options.padding}
            onChange={(e) => setOpts('jpg', { padding: Number(e.target.value) })}
            className="flex-1 accent-blue-500"
          />
          <span className={`text-sm w-10 text-right ${darkMode ? 'text-dk-muted' : 'text-gray-600'}`}>
            {options.padding}px
          </span>
        </div>
      </OptionGroup>
    </div>
  );
};

const SvgOptionsPanel: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const options = useExportStore((s) => s.options.svg);
  const setOpts = useExportStore((s) => s.setExportOptions);

  return (
    <div className="space-y-4">
      {/* Embed fonts */}
      <OptionGroup label="Fonts" darkMode={darkMode}>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={options.embedFonts}
            onChange={(e) => setOpts('svg', { embedFonts: e.target.checked })}
            className="rounded accent-blue-500"
          />
          <span className={`text-sm ${darkMode ? 'text-dk-muted' : 'text-gray-600'}`}>
            Embed fonts in SVG
          </span>
        </label>
      </OptionGroup>

      {/* Include styles */}
      <OptionGroup label="Styles" darkMode={darkMode}>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={options.includeStyles}
            onChange={(e) =>
              setOpts('svg', { includeStyles: e.target.checked })
            }
            className="rounded accent-blue-500"
          />
          <span className={`text-sm ${darkMode ? 'text-dk-muted' : 'text-gray-600'}`}>
            Include CSS styles
          </span>
        </label>
      </OptionGroup>

      {/* Padding */}
      <OptionGroup label="Padding" darkMode={darkMode}>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            value={options.padding}
            onChange={(e) => setOpts('svg', { padding: Number(e.target.value) })}
            className="flex-1 accent-blue-500"
          />
          <span className={`text-sm w-10 text-right ${darkMode ? 'text-dk-muted' : 'text-gray-600'}`}>
            {options.padding}px
          </span>
        </div>
      </OptionGroup>
    </div>
  );
};

const PdfOptionsPanel: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const options = useExportStore((s) => s.options.pdf);
  const setOpts = useExportStore((s) => s.setExportOptions);

  return (
    <div className="space-y-4">
      {/* Page size */}
      <OptionGroup label="Page Size" darkMode={darkMode}>
        <select
          value={options.pageSize}
          onChange={(e) =>
            setOpts('pdf', {
              pageSize: e.target.value as 'a4' | 'a3' | 'letter' | 'legal',
            })
          }
          className={selectClass(darkMode)}
        >
          <option value="a4">A4 (210 x 297 mm)</option>
          <option value="a3">A3 (297 x 420 mm)</option>
          <option value="letter">Letter (8.5 x 11 in)</option>
          <option value="legal">Legal (8.5 x 14 in)</option>
        </select>
      </OptionGroup>

      {/* Orientation */}
      <OptionGroup label="Orientation" darkMode={darkMode}>
        <div className="flex gap-2">
          <PillButton
            active={options.orientation === 'portrait'}
            onClick={() => setOpts('pdf', { orientation: 'portrait' })}
            darkMode={darkMode}
          >
            Portrait
          </PillButton>
          <PillButton
            active={options.orientation === 'landscape'}
            onClick={() => setOpts('pdf', { orientation: 'landscape' })}
            darkMode={darkMode}
          >
            Landscape
          </PillButton>
        </div>
      </OptionGroup>

      {/* Fit to page */}
      <OptionGroup label="Fit" darkMode={darkMode}>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={options.fitToPage}
            onChange={(e) => setOpts('pdf', { fitToPage: e.target.checked })}
            className="rounded accent-blue-500"
          />
          <span className={`text-sm ${darkMode ? 'text-dk-muted' : 'text-gray-600'}`}>
            Fit diagram to page
          </span>
        </label>
      </OptionGroup>

      {/* Margins */}
      <OptionGroup label="Margins" darkMode={darkMode}>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={50}
            value={options.margin}
            onChange={(e) => setOpts('pdf', { margin: Number(e.target.value) })}
            className="flex-1 accent-blue-500"
          />
          <span className={`text-sm w-12 text-right ${darkMode ? 'text-dk-muted' : 'text-gray-600'}`}>
            {options.margin}mm
          </span>
        </div>
      </OptionGroup>
    </div>
  );
};

const PptxOptionsPanel: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const options = useExportStore((s) => s.options.pptx);
  const setOpts = useExportStore((s) => s.setExportOptions);

  return (
    <div className="space-y-4">
      {/* Slide size */}
      <OptionGroup label="Slide Size" darkMode={darkMode}>
        <div className="flex gap-2">
          <PillButton
            active={options.slideSize === 'standard'}
            onClick={() => setOpts('pptx', { slideSize: 'standard' })}
            darkMode={darkMode}
          >
            Standard (4:3)
          </PillButton>
          <PillButton
            active={options.slideSize === 'widescreen'}
            onClick={() => setOpts('pptx', { slideSize: 'widescreen' })}
            darkMode={darkMode}
          >
            Widescreen (16:9)
          </PillButton>
        </div>
      </OptionGroup>

      {/* Title slide */}
      <OptionGroup label="Title Slide" darkMode={darkMode}>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={options.oneSlidePerGroup}
            onChange={(e) =>
              setOpts('pptx', { oneSlidePerGroup: e.target.checked })
            }
            className="rounded accent-blue-500"
          />
          <span className={`text-sm ${darkMode ? 'text-dk-muted' : 'text-gray-600'}`}>
            Include title slide
          </span>
        </label>
      </OptionGroup>

      {/* Include notes */}
      <OptionGroup label="Speaker Notes" darkMode={darkMode}>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={options.includeNotes}
            onChange={(e) =>
              setOpts('pptx', { includeNotes: e.target.checked })
            }
            className="rounded accent-blue-500"
          />
          <span className={`text-sm ${darkMode ? 'text-dk-muted' : 'text-gray-600'}`}>
            Include node info as notes
          </span>
        </label>
      </OptionGroup>
    </div>
  );
};

const JsonOptionsPanel: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const options = useExportStore((s) => s.options.json);
  const setOpts = useExportStore((s) => s.setExportOptions);

  return (
    <div className="space-y-4">
      {/* Pretty print */}
      <OptionGroup label="Formatting" darkMode={darkMode}>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={options.pretty}
            onChange={(e) => setOpts('json', { pretty: e.target.checked })}
            className="rounded accent-blue-500"
          />
          <span className={`text-sm ${darkMode ? 'text-dk-muted' : 'text-gray-600'}`}>
            Pretty print (indented)
          </span>
        </label>
      </OptionGroup>

      {/* Include viewport */}
      <OptionGroup label="Viewport" darkMode={darkMode}>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={options.includeViewport}
            onChange={(e) =>
              setOpts('json', { includeViewport: e.target.checked })
            }
            className="rounded accent-blue-500"
          />
          <span className={`text-sm ${darkMode ? 'text-dk-muted' : 'text-gray-600'}`}>
            Include viewport state
          </span>
        </label>
      </OptionGroup>

      {/* Include styles */}
      <OptionGroup label="Styles" darkMode={darkMode}>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={options.includeStyles}
            onChange={(e) =>
              setOpts('json', { includeStyles: e.target.checked })
            }
            className="rounded accent-blue-500"
          />
          <span className={`text-sm ${darkMode ? 'text-dk-muted' : 'text-gray-600'}`}>
            Include style settings
          </span>
        </label>
      </OptionGroup>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Shared UI primitives
// ---------------------------------------------------------------------------

function selectClass(darkMode: boolean): string {
  return `w-full px-3 py-1.5 rounded-md text-sm border transition-colors ${
    darkMode
      ? 'bg-dk-hover border-dk-border text-dk-text focus:border-blue-400'
      : 'bg-white border-gray-300 text-gray-700 focus:border-blue-500'
  } outline-none focus:ring-1 focus:ring-blue-500/30`;
}

const OptionGroup: React.FC<{
  label: string;
  darkMode: boolean;
  children: React.ReactNode;
}> = ({ label, darkMode, children }) => (
  <div>
    <label
      className={`block text-xs font-medium mb-1.5 ${
        darkMode ? 'text-dk-muted' : 'text-gray-500'
      }`}
    >
      {label}
    </label>
    {children}
  </div>
);

const PillButton: React.FC<{
  active: boolean;
  onClick: () => void;
  darkMode: boolean;
  children: React.ReactNode;
}> = ({ active, onClick, darkMode, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
      active
        ? 'bg-blue-500 text-white'
        : darkMode
          ? 'bg-dk-hover text-dk-muted hover:bg-dk-border'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`}
  >
    {children}
  </button>
);

// ---------------------------------------------------------------------------
// Selection-export helper: hides non-selected elements + selection UI chrome
// Returns a cleanup function that restores everything.
// ---------------------------------------------------------------------------

function hideForSelectionExport(
  selectedNodeIds: string[],
  opts: { includeGrid: boolean; includeMinimap: boolean; elementsOnly: boolean },
): () => void {
  const restorers: (() => void)[] = [];

  // 1. Inject a temporary <style> to suppress selection visuals in the capture
  const style = document.createElement('style');
  style.textContent = `
    .react-flow__node.selected { box-shadow: none !important; outline: none !important; }
    .react-flow__handle { opacity: 0 !important; }
    .react-flow__resize-control { opacity: 0 !important; display: none !important; }
    .react-flow__nodesselection { display: none !important; }
    .react-flow__edgeupdater { display: none !important; }
  `;
  document.head.appendChild(style);
  restorers.push(() => document.head.removeChild(style));

  // Helper: hide an element and remember how to restore it
  const hide = (el: HTMLElement | null) => {
    if (!el) return;
    const prev = el.style.display;
    el.style.display = 'none';
    restorers.push(() => { el.style.display = prev; });
  };

  // Helper: set visibility hidden (works better for SVG <g> elements)
  const hideVis = (el: HTMLElement | SVGElement | null) => {
    if (!el) return;
    const prev = (el as HTMLElement).style.visibility;
    (el as HTMLElement).style.visibility = 'hidden';
    restorers.push(() => { (el as HTMLElement).style.visibility = prev; });
  };

  // 2. Always hide panels (zoom controls, attribution)
  document.querySelectorAll<HTMLElement>('.react-flow__panel').forEach(hide);

  // 3. Grid / minimap
  if (!opts.includeGrid) hide(document.querySelector<HTMLElement>('.react-flow__background'));
  if (!opts.includeMinimap) hide(document.querySelector<HTMLElement>('.react-flow__minimap'));

  // 4. Hide non-selected nodes
  const selectedSet = new Set(selectedNodeIds);
  document.querySelectorAll<HTMLElement>('.react-flow__node').forEach((el) => {
    const nodeId = el.getAttribute('data-id');
    if (nodeId && !selectedSet.has(nodeId)) hide(el);
  });

  // 5. Hide edges not connecting two selected nodes (use visibility for SVG)
  const { edges } = useFlowStore.getState();
  const connectedEdgeIds = new Set(
    edges
      .filter((e) => selectedSet.has(e.source) && selectedSet.has(e.target))
      .map((e) => e.id),
  );
  document.querySelectorAll<SVGElement>('.react-flow__edge').forEach((el) => {
    const testId = el.getAttribute('data-testid') ?? '';
    const edgeId = testId.startsWith('rf__edge-') ? testId.slice(9) : el.getAttribute('data-id');
    if (!edgeId || !connectedEdgeIds.has(edgeId)) hideVis(el);
  });

  // 6. Hide swimlane layers for selection scope — UNLESS the swimlane is selected.
  //    Swimlane layers are siblings of .react-flow inside [data-charthero-canvas-area].
  const swimlaneIsSelected = useSwimlaneStore.getState().swimlaneSelected;
  const canvasArea = document.querySelector<HTMLElement>('[data-charthero-canvas-area]');
  if (canvasArea && !swimlaneIsSelected) {
    Array.from(canvasArea.children).forEach((child) => {
      const el = child as HTMLElement;
      if (!el.classList.contains('react-flow')) {
        hide(el);
      }
    });
  }

  // Also hide any non-standard children inside .react-flow (e.g. injected overlays)
  document.querySelectorAll<HTMLElement>('.react-flow > *').forEach((el) => {
    const cl = el.classList;
    if (
      !cl.contains('react-flow__viewport') &&
      !cl.contains('react-flow__background') &&
      !cl.contains('react-flow__minimap') &&
      !cl.contains('react-flow__panel') &&
      !cl.contains('react-flow__renderer') &&
      !cl.contains('react-flow__zoompane')
    ) {
      hide(el);
    }
  });

  // 7. If elementsOnly, also hide background
  if (opts.elementsOnly) {
    hide(document.querySelector<HTMLElement>('.react-flow__background'));
  }

  return () => {
    // Restore in reverse order
    for (let i = restorers.length - 1; i >= 0; i--) restorers[i]();
  };
}

// ---------------------------------------------------------------------------
// Viewport override: temporarily re-frame the viewport via direct DOM
// manipulation so the canvas doesn't visibly zoom during capture.
// ---------------------------------------------------------------------------

function overrideViewportForCapture(
  scope: 'all' | 'selected',
  selectedNodeIds: string[],
): (() => void) | null {
  const rf = getReactFlowInstance();
  if (!rf) return null;

  // Always use canvas-area for viewport sizing (not capture-area which includes banners)
  const captureElement = document.querySelector<HTMLElement>('[data-charthero-canvas-area]')
    ?? document.querySelector<HTMLElement>('.react-flow');
  const vpElement = document.querySelector<HTMLElement>('.react-flow__viewport');
  if (!captureElement || !vpElement) return null;

  const allNodes = rf.getNodes();
  const targetNodes = scope === 'selected'
    ? allNodes.filter((n) => selectedNodeIds.includes(n.id))
    : allNodes;

  // When swimlane is selected and scope is 'selected', include all nodes
  const swimlaneIsSelected = useSwimlaneStore.getState().swimlaneSelected;
  const effectiveNodes = (scope === 'selected' && swimlaneIsSelected && targetNodes.length === 0)
    ? allNodes
    : targetNodes;
  if (effectiveNodes.length === 0) return null;

  const bounds = getNodesBounds(effectiveNodes);

  // Extend bounds to include swimlane container when lanes exist
  const slState = useSwimlaneStore.getState();
  const hasLanes = slState.config.horizontal.length > 0 || slState.config.vertical.length > 0;
  if (hasLanes && scope === 'all') {
    const co = slState.containerOffset;
    // Compute swimlane total size from lane items
    const hLanes = slState.config.horizontal.filter(l => !l.hidden);
    const vLanes = slState.config.vertical.filter(l => !l.hidden);
    const hHeaderW = slState.config.hHeaderWidth ?? 48;
    const vHeaderH = slState.config.vHeaderHeight ?? 32;
    const totalH = hLanes.reduce((s, l) => s + (l.collapsed ? 32 : l.size), 0);
    const totalW = vLanes.reduce((s, l) => s + (l.collapsed ? 32 : l.size), 0);
    const slWidth = vLanes.length > 0 ? totalW : (slState.config.containerWidth ?? 800);
    const slHeight = hLanes.length > 0 ? totalH : (slState.config.containerHeight ?? 400);
    // Swimlane bounding box in flow coordinates (include headers)
    const slLeft = co.x - (hLanes.length > 0 ? hHeaderW : 0);
    const slTop = co.y - (vLanes.length > 0 ? vHeaderH : 0);
    const slRight = co.x + slWidth;
    const slBottom = co.y + slHeight;
    // Extend bounds to encompass the swimlane container
    const bLeft = Math.min(bounds.x, slLeft);
    const bTop = Math.min(bounds.y, slTop);
    const bRight = Math.max(bounds.x + bounds.width, slRight);
    const bBottom = Math.max(bounds.y + bounds.height, slBottom);
    bounds.x = bLeft;
    bounds.y = bTop;
    bounds.width = bRight - bLeft;
    bounds.height = bBottom - bTop;
  }

  const { width, height } = captureElement.getBoundingClientRect();
  const padding = scope === 'selected' ? 0.1 : 0.05;
  const { x, y, zoom } = getViewportForBounds(bounds, width, height, 0.1, 2, padding);

  const originalTransform = vpElement.style.transform;
  vpElement.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`;

  // Also override swimlane layer transforms — they compute their own transform
  // from useViewport() React state, but we only changed the DOM. Recompute to match.
  const containerOffset = slState.containerOffset;
  const swimlaneTransform = `translate(${x + containerOffset.x * zoom}px, ${y + containerOffset.y * zoom}px) scale(${zoom})`;
  const swimlaneVpEls = document.querySelectorAll<HTMLElement>('[data-swimlane-viewport]');
  const originalSwimlaneTransforms: string[] = [];
  swimlaneVpEls.forEach((el) => {
    originalSwimlaneTransforms.push(el.style.transform);
    el.style.transform = swimlaneTransform;
  });

  // Temporarily remove overflow:hidden from swimlane layer roots so content isn't clipped
  const overflowRestorers: (() => void)[] = [];
  swimlaneVpEls.forEach((vpEl) => {
    const root = vpEl.parentElement;
    if (root) {
      const prev = root.style.overflow;
      root.style.overflow = 'visible';
      overflowRestorers.push(() => { root.style.overflow = prev; });
    }
  });

  return () => {
    vpElement.style.transform = originalTransform;
    swimlaneVpEls.forEach((el, i) => {
      el.style.transform = originalSwimlaneTransforms[i];
    });
    for (const r of overflowRestorers) r();
  };
}

// ---------------------------------------------------------------------------
// Main ExportDialog component
// ---------------------------------------------------------------------------

const ExportDialog: React.FC = () => {
  const dialogOpen = useExportStore((s) => s.dialogOpen);
  const setDialogOpen = useExportStore((s) => s.setDialogOpen);
  const lastFormat = useExportStore((s) => s.lastFormat);
  const setFormat = useExportStore((s) => s.setFormat);
  const exportInProgress = useExportStore((s) => s.exportInProgress);
  const setExportInProgress = useExportStore((s) => s.setExportInProgress);
  const options = useExportStore((s) => s.options);

  const darkMode = useStyleStore((s) => s.darkMode);
  const nodeCount = useFlowStore((s) => s.nodes.length);
  const edgeCount = useFlowStore((s) => s.edges.length);
  const selectedNodeIds = useFlowStore((s) => s.selectedNodes);
  const swimlaneSelected = useSwimlaneStore((s) => s.swimlaneSelected);
  const hasSelection = selectedNodeIds.length > 0 || swimlaneSelected;
  // Scope: 'all' fits the entire diagram; 'selection' = current viewport; 'selected' = selected nodes only
  const [scope, setScope] = useState<'all' | 'selection' | 'selected'>('all');
  // Whether to export only the selected elements (no background/grid/minimap)
  const [elementsOnly, setElementsOnly] = useState(false);
  // Whether to include grid lines in the exported image (off by default)
  const [includeGrid, setIncludeGrid] = useState(false);
  // Whether to include minimap in the exported image (off by default)
  const [includeMinimap, setIncludeMinimap] = useState(false);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [clipboardCopied, setClipboardCopied] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Serialize current format options for dependency tracking
  const currentOpts = options[lastFormat];
  const optsKey = JSON.stringify(currentOpts);

  // Auto-select 'selected' scope when nodes are selected on dialog open
  useEffect(() => {
    if (dialogOpen && hasSelection) {
      setScope('selected');
    }
  }, [dialogOpen, hasSelection]);

  // Fall back to 'all' if selection is cleared while 'selected' scope is active
  useEffect(() => {
    if (scope === 'selected' && !hasSelection) setScope('all');
  }, [scope, hasSelection]);

  // Generate preview thumbnail (debounced on option changes)
  useEffect(() => {
    if (!dialogOpen) return;

    let cancelled = false;

    const timer = setTimeout(async () => {
      // Hide elements for preview capture
      let restorePreview: (() => void) | null = null;

      if (scope === 'selected') {
        // Use the unified helper for selection exports
        restorePreview = hideForSelectionExport(selectedNodeIds, { includeGrid, includeMinimap, elementsOnly });
      } else {
        // For non-selection scopes, just hide panels/grid/minimap
        const previewHidden: { el: HTMLElement; prev: string }[] = [];
        const hideEl = (el: HTMLElement | null) => {
          if (!el) return;
          previewHidden.push({ el, prev: el.style.display });
          el.style.display = 'none';
        };
        document.querySelectorAll<HTMLElement>('.react-flow__panel').forEach(hideEl);
        if (!includeGrid) hideEl(document.querySelector<HTMLElement>('.react-flow__background'));
        if (!includeMinimap) hideEl(document.querySelector<HTMLElement>('.react-flow__minimap'));
        // Hide UI-only elements (undo/redo, legend button, rulers, resize handles)
        document.querySelectorAll<HTMLElement>('[data-export-ignore]').forEach(hideEl);
        restorePreview = () => { for (const { el, prev } of previewHidden) el.style.display = prev; };
      }

      // Override viewport transform directly on the DOM (no visible zoom flash)
      let restoreViewport: (() => void) | null = null;
      if (scope === 'all' || scope === 'selected') {
        restoreViewport = overrideViewportForCapture(scope, selectedNodeIds);
        // Wait one frame for the browser to apply the new transform
        await new Promise((r) => requestAnimationFrame(r));
      }

      try {
        const element = getReactFlowElement(true);
        // Use transparent bg if PNG with transparentBackground checked
        const bgColor =
          lastFormat === 'png' && (currentOpts as { transparentBackground?: boolean }).transparentBackground
            ? undefined
            : lastFormat === 'jpg'
              ? (currentOpts as { backgroundColor?: string }).backgroundColor || '#ffffff'
              : darkMode ? '#253345' : '#ffffff';

        const url = await toPng(element, {
          pixelRatio: 0.5,
          backgroundColor: bgColor,
        });
        if (!cancelled) setPreviewUrl(url);
      } catch (e) {
        log.warn('Export preview generation failed', e);
        if (!cancelled) setPreviewUrl(null);
      } finally {
        if (restoreViewport) restoreViewport();
        if (restorePreview) restorePreview();
      }
    }, 200); // 200ms debounce

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [dialogOpen, darkMode, includeGrid, includeMinimap, elementsOnly, scope, lastFormat, optsKey, selectedNodeIds]);

  // Close on Escape
  useEffect(() => {
    if (!dialogOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDialogOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialogOpen, setDialogOpen]);

  // Close on backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) {
        setDialogOpen(false);
      }
    },
    [setDialogOpen],
  );

  // Handle export -- override the viewport via DOM (no visible zoom flash),
  // hide unwanted elements, capture, then restore everything.
  const handleExport = useCallback(async () => {
    setExportInProgress(true);
    setExportStatus('idle');
    setErrorMessage('');

    // Hide elements for export capture
    let restoreExport: (() => void) | null = null;

    if (scope === 'selected') {
      restoreExport = hideForSelectionExport(selectedNodeIds, { includeGrid, includeMinimap, elementsOnly });
    } else {
      const hiddenEls: { el: HTMLElement; prev: string }[] = [];
      const hide = (el: HTMLElement | null) => {
        if (!el) return;
        hiddenEls.push({ el, prev: el.style.display });
        el.style.display = 'none';
      };
      document.querySelectorAll<HTMLElement>('.react-flow__panel').forEach(hide);
      if (!includeGrid) hide(document.querySelector<HTMLElement>('.react-flow__background'));
      if (!includeMinimap) hide(document.querySelector<HTMLElement>('.react-flow__minimap'));
      // Hide UI-only elements (undo/redo, legend button, rulers, resize handles)
      document.querySelectorAll<HTMLElement>('[data-export-ignore]').forEach(hide);
      restoreExport = () => { for (const { el, prev } of hiddenEls) el.style.display = prev; };
    }

    // Override viewport transform directly (no visible zoom flash)
    let restoreViewport: (() => void) | null = null;

    try {
      if (scope === 'all' || scope === 'selected') {
        restoreViewport = overrideViewportForCapture(scope, selectedNodeIds);
        await new Promise((r) => requestAnimationFrame(r));
      }

      await runExport(lastFormat, options[lastFormat] as unknown as Record<string, unknown>);
      setExportStatus('success');
      setTimeout(() => {
        setDialogOpen(false);
        setExportStatus('idle');
      }, 1200);
    } catch (err) {
      setExportStatus('error');
      setErrorMessage(
        err instanceof Error ? err.message : 'Export failed. Please try again.',
      );
    } finally {
      if (restoreViewport) restoreViewport();
      if (restoreExport) restoreExport();
      setExportInProgress(false);
    }
  }, [lastFormat, options, scope, includeGrid, includeMinimap, elementsOnly, selectedNodeIds, setExportInProgress, setDialogOpen]);

  // Copy JSON to clipboard
  const handleCopyToClipboard = useCallback(async () => {
    try {
      await copyJsonToClipboard(options.json);
      setClipboardCopied(true);
      setTimeout(() => setClipboardCopied(false), 2000);
    } catch (err) {
      log.error('Copy to clipboard failed', err);
    }
  }, [options.json]);

  // Estimated file size
  const scale =
    lastFormat === 'png'
      ? options.png.scale
      : lastFormat === 'jpg'
        ? options.jpg.scale
        : 2;
  const estSize = estimateFileSize(lastFormat, nodeCount, edgeCount, scale);

  if (!dialogOpen) return null;

  // Determine which options panel to render
  const currentTab = lastFormat === 'csv' ? 'json' : lastFormat;

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <div
        className={`
          relative w-full max-w-3xl mx-4 rounded-xl shadow-2xl border overflow-hidden
          ${darkMode
            ? 'bg-dk-panel border-dk-border'
            : 'bg-white border-gray-200'
          }
        `}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            darkMode ? 'border-dk-border' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Download size={18} className="text-blue-500" />
            <h2
              className={`text-lg font-semibold ${
                darkMode ? 'text-dk-text' : 'text-gray-900'
              }`}
            >
              Export Diagram
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setDialogOpen(false)}
            className={`p-1 rounded-md transition-colors ${
              darkMode
                ? 'hover:bg-dk-hover text-dk-muted'
                : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Format tabs */}
        <div
          className={`flex gap-1 px-6 pt-4 pb-2 ${
            darkMode ? 'border-dk-border' : 'border-gray-200'
          }`}
        >
          {FORMAT_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFormat(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                lastFormat === tab.id
                  ? 'bg-blue-500 text-white shadow-sm'
                  : darkMode
                    ? 'bg-dk-hover text-dk-muted hover:bg-dk-border'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scope selector */}
        <div
          className={`flex items-center gap-3 px-6 pb-2 ${
            darkMode ? 'border-dk-border' : 'border-gray-200'
          }`}
        >
          <span
            className={`text-xs font-medium ${
              darkMode ? 'text-dk-muted' : 'text-gray-500'
            }`}
          >
            Scope
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                scope === 'all'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : darkMode
                    ? 'bg-dk-hover text-dk-muted hover:bg-dk-border'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Maximize2 size={12} />
              Entire Diagram
            </button>
            <button
              type="button"
              onClick={() => setScope('selection')}
              data-tooltip="Export the current viewport (what you see)"
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                scope === 'selection'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : darkMode
                    ? 'bg-dk-hover text-dk-muted hover:bg-dk-border'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <MousePointerSquareDashed size={12} />
              Current View
            </button>
            {hasSelection && (
              <button
                type="button"
                onClick={() => setScope('selected')}
                data-tooltip={`Export ${selectedNodeIds.length} selected node${selectedNodeIds.length > 1 ? 's' : ''}`}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  scope === 'selected'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : darkMode
                      ? 'bg-dk-hover text-dk-muted hover:bg-dk-border'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <MousePointerSquareDashed size={12} />
                Selection ({selectedNodeIds.length})
              </button>
            )}
          </div>

        </div>

        {/* Body: Preview + Options */}
        <div className="flex px-6 py-4 gap-6 min-h-[300px]">
          {/* Left: Preview */}
          <div
            className={`flex-1 flex items-center justify-center rounded-lg border overflow-hidden ${
              darkMode
                ? 'bg-dk border-dk-border'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Diagram preview"
                className="max-w-full max-h-[260px] object-contain p-2"
              />
            ) : (
              <div
                className={`text-sm ${
                  darkMode ? 'text-dk-faint' : 'text-gray-400'
                }`}
              >
                {nodeCount === 0
                  ? 'No nodes to export'
                  : 'Generating preview...'}
              </div>
            )}
          </div>

          {/* Right: Options */}
          <div className="w-56 shrink-0 overflow-y-auto max-h-[340px]">
            {currentTab === 'png' && <PngOptionsPanel darkMode={darkMode} />}
            {currentTab === 'jpg' && <JpgOptionsPanel darkMode={darkMode} />}
            {currentTab === 'svg' && <SvgOptionsPanel darkMode={darkMode} />}
            {currentTab === 'pdf' && <PdfOptionsPanel darkMode={darkMode} />}
            {currentTab === 'pptx' && <PptxOptionsPanel darkMode={darkMode} />}
            {currentTab === 'json' && <JsonOptionsPanel darkMode={darkMode} />}

            {/* Include section — shared across image/pdf formats */}
            {lastFormat !== 'json' && (
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-dk-border">
                <OptionGroup label="Include" darkMode={darkMode}>
                  <div className="space-y-1.5">
                    {scope === 'selected' && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!elementsOnly}
                          onChange={(e) => setElementsOnly(!e.target.checked)}
                          className="rounded accent-blue-500"
                        />
                        <span className={`text-sm ${darkMode ? 'text-dk-muted' : 'text-gray-600'}`}>
                          Background
                        </span>
                      </label>
                    )}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeGrid}
                        onChange={(e) => setIncludeGrid(e.target.checked)}
                        className="rounded accent-blue-500"
                      />
                      <span className={`text-sm ${darkMode ? 'text-dk-muted' : 'text-gray-600'}`}>
                        Grid
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeMinimap}
                        onChange={(e) => setIncludeMinimap(e.target.checked)}
                        className="rounded accent-blue-500"
                      />
                      <span className={`text-sm ${darkMode ? 'text-dk-muted' : 'text-gray-600'}`}>
                        Minimap
                      </span>
                    </label>
                  </div>
                </OptionGroup>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-between px-6 py-3 border-t ${
            darkMode ? 'border-dk-border' : 'border-gray-200'
          }`}
        >
          {/* File size estimate + status */}
          <div className="flex items-center gap-3">
            <span
              className={`text-xs ${
                darkMode ? 'text-dk-muted' : 'text-gray-500'
              }`}
            >
              Est. size: <strong>{estSize}</strong>
            </span>
            <span
              className={`text-xs ${
                darkMode ? 'text-dk-faint' : 'text-gray-400'
              }`}
            >
              {nodeCount} nodes, {edgeCount} connectors
            </span>

            {exportStatus === 'success' && (
              <span className="flex items-center gap-1 text-xs text-green-500">
                <Check size={14} /> Exported
              </span>
            )}
            {exportStatus === 'error' && (
              <span className="flex items-center gap-1 text-xs text-red-500">
                <AlertCircle size={14} /> {errorMessage || 'Failed'}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDialogOpen(false)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                darkMode
                  ? 'text-dk-muted hover:bg-dk-hover'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Cancel
            </button>
            {lastFormat === 'json' && (
              <button
                type="button"
                onClick={handleCopyToClipboard}
                disabled={nodeCount === 0}
                className={`
                  flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium
                  transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                  ${darkMode
                    ? 'bg-dk-hover text-dk-text hover:bg-dk-border'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                {clipboardCopied ? (
                  <>
                    <Check size={14} className="text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <ClipboardCopy size={14} />
                    To clipboard
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={handleExport}
              disabled={exportInProgress || nodeCount === 0}
              className={`
                flex items-center gap-2 px-5 py-1.5 rounded-md text-sm font-medium
                transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700
              `}
            >
              {exportInProgress ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download size={14} />
                  To {lastFormat.toUpperCase()}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ExportDialog);
