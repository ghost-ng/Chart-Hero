import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  X,
  ChevronDown,
  ChevronRight,
  Plus,
  Minus,
  Trash2,
  Rows3,
  Columns3,
  Grid3X3,
  Check,
  Copy,
  ChevronsLeft,
  ChevronsRight,
  AArrowUp,
  AArrowDown,
  ListOrdered,
  Eye,
  EyeClosed,
  Type,
  Palette,
  RotateCcw,
  icons,
} from 'lucide-react';

import { useFlowStore, type FlowNodeData, type FlowEdgeData, type NodeShape, type StatusIndicator, getStatusIndicators, newPuckId } from '../../store/flowStore';
import { useUIStore, type PanelTab } from '../../store/uiStore';
import { useStyleStore } from '../../store/styleStore';
import { DependencyPanel } from '../Dependencies';
import EdgePropertiesTab from './EdgePropertiesTab';
import IconPicker from './IconPicker';
import {
  useSwimlaneStore,
  type SwimlaneOrientation,
  type SwimlaneItem,
  type BorderStyleType,
} from '../../store/swimlaneStore';
import { useLegendStore } from '../../store/legendStore';
import { generateId } from '../../utils/idGenerator';
import { log } from '../../utils/logger';
import { resolveNodeStyle } from '../../utils/themeResolver';
import { diagramStyles } from '../../styles/diagramStyles';
import Tip from '../UI/Tip';

// ---------------------------------------------------------------------------
// Helper: sanitize color for <input type="color"> which requires #rrggbb
// ---------------------------------------------------------------------------

const toHexColor = (c: string | undefined, fallback = '#ffffff'): string => {
  if (!c || c === 'transparent' || c === 'none') return fallback;
  return c;
};

// ---------------------------------------------------------------------------
// Panel tab definitions
// ---------------------------------------------------------------------------

const TABS: { id: PanelTab; label: string; collapsible?: boolean }[] = [
  { id: 'node', label: 'Node', collapsible: true },
  { id: 'edge', label: 'Edge', collapsible: true },
  { id: 'lane', label: 'Lane' },
  { id: 'deps', label: 'Deps' },
  { id: 'data', label: 'Data' },
];

// ---------------------------------------------------------------------------
// Field components
// ---------------------------------------------------------------------------

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({ label, children }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[11px] font-medium text-text-muted uppercase tracking-wide">
      {label}
    </label>
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// ResetIcon – per-property reset-to-theme button
// ---------------------------------------------------------------------------

const ResetIcon: React.FC<{ visible: boolean; onReset: () => void }> = ({ visible, onReset }) => {
  if (!visible) return null;
  return (
    <button
      onClick={onReset}
      data-tooltip-left="Reset to default"
      className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-dk-hover text-slate-400 hover:text-slate-600 dark:text-dk-faint dark:hover:text-dk-text transition-colors cursor-pointer"
    >
      <RotateCcw size={12} />
    </button>
  );
};

// ---------------------------------------------------------------------------
// CopyHexButton — small clipboard copy button for hex color inputs
// ---------------------------------------------------------------------------

const CopyHexButton: React.FC<{ value: string }> = ({ value }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-dk-hover text-slate-400 hover:text-slate-600 dark:text-dk-muted dark:hover:text-dk-text transition-colors cursor-pointer"
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      data-tooltip-left={copied ? 'Copied!' : 'Copy hex'}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
};

// ---------------------------------------------------------------------------
// Shape options for the shape picker dropdown
// ---------------------------------------------------------------------------

/** Shapes available in the shape picker — matches the palette + renderable shapes only */
const SHAPE_OPTIONS: { value: NodeShape; label: string }[] = [
  { value: 'rectangle', label: 'Rectangle' },
  { value: 'roundedRectangle', label: 'Rounded Rect' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'circle', label: 'Circle' },
  { value: 'parallelogram', label: 'Parallelogram' },
  { value: 'document', label: 'Document' },
  { value: 'hexagon', label: 'Hexagon' },
  { value: 'cloud', label: 'Cloud' },
  { value: 'stickyNote', label: 'Sticky Note' },
  { value: 'textbox', label: 'Text Box' },
  { value: 'blockArrow', label: 'Block Arrow' },
  { value: 'chevronArrow', label: 'Chevron Arrow' },
  { value: 'doubleArrow', label: 'Double Arrow' },
  { value: 'circularArrow', label: 'Circular Arrow' },
];

// ---------------------------------------------------------------------------
// Node properties tab
// ---------------------------------------------------------------------------

interface NodePropsTabProps {
  nodeId: string;
  data: FlowNodeData;
  nodeType?: string;
  toggleAllSignal?: number;
}

const SectionHeader: React.FC<{ label: string; collapsed: boolean; onToggle: () => void }> = ({ label, collapsed, onToggle }) => (
  <button
    onClick={onToggle}
    className="flex items-center justify-between w-full text-xs font-bold uppercase tracking-wider text-text dark:text-dk-text border-b border-border pb-1.5 mt-2 cursor-pointer hover:text-primary transition-colors"
  >
    {label}
    <ChevronDown
      size={12}
      className={`transition-transform duration-150 ${collapsed ? '-rotate-90' : ''}`}
    />
  </button>
);

// ---------------------------------------------------------------------------
// Status Pucks section (multi-puck editor)
// ---------------------------------------------------------------------------

interface StatusPucksSectionProps {
  nodeId: string;
  data: FlowNodeData;
  collapsed: boolean;
  onToggle: () => void;
}

const StatusPucksSection: React.FC<StatusPucksSectionProps> = ({ nodeId, data, collapsed, onToggle }) => {
  const selectedPuckIds = useUIStore((s) => s.selectedPuckIds);
  const selectedPuckNodeId = useUIStore((s) => s.selectedPuckNodeId);

  const pucks = useMemo(() => getStatusIndicators(data), [data]);

  // The selected puck for the detail editor — works for both local and global selection
  const selectedPuck = useMemo(() => {
    if (selectedPuckIds.length === 0) return null;
    // If selection is on this node, find from local pucks
    if (selectedPuckNodeId === nodeId) {
      return pucks.find((p) => selectedPuckIds.includes(p.id)) ?? null;
    }
    // Global selection (selectedPuckNodeId === null): find from all nodes
    if (selectedPuckNodeId === null) {
      const allNodes = useFlowStore.getState().nodes;
      for (const n of allNodes) {
        const nodePucks = getStatusIndicators(n.data as FlowNodeData);
        const found = nodePucks.find((p) => selectedPuckIds.includes(p.id));
        if (found) return found;
      }
    }
    return null;
  }, [selectedPuckIds, selectedPuckNodeId, nodeId, pucks]);

  // Count of how many pucks are selected (for showing multi-edit indicator)
  const multiSelectCount = selectedPuckIds.length;

  const handleAddPuck = useCallback(() => {
    const newPuck: StatusIndicator = {
      id: newPuckId(),
      status: 'not-started',
      color: '#94a3b8',
      size: 12,
      position: 'top-right',
    };
    useFlowStore.getState().addStatusPuck(nodeId, newPuck);
    // Auto-select the newly created puck
    useUIStore.getState().selectPuck(newPuck.id, nodeId);
  }, [nodeId]);

  const handleRemovePuck = useCallback(
    (puckId: string) => {
      useFlowStore.getState().removeStatusPuck(nodeId, puckId);
      // Clear selection if the removed puck was selected
      if (selectedPuckIds.includes(puckId)) {
        useUIStore.getState().clearPuckSelection();
      }
    },
    [nodeId, selectedPuckIds],
  );

  const handleSelectPuck = useCallback(
    (puckId: string) => {
      useUIStore.getState().selectPuck(puckId, nodeId);
    },
    [nodeId],
  );

  const handleUpdatePuck = useCallback(
    (patch: Partial<StatusIndicator>) => {
      if (selectedPuckIds.length === 0) return;
      const store = useFlowStore.getState();
      // Apply the patch to ALL selected pucks, finding each puck's parent node
      for (const pId of selectedPuckIds) {
        // First check the current node
        if (pucks.some((p) => p.id === pId)) {
          store.updateStatusPuck(nodeId, pId, patch);
        } else {
          // Search other nodes for this puck
          for (const n of store.nodes) {
            const nodePucks = getStatusIndicators(n.data as FlowNodeData);
            if (nodePucks.some((p) => p.id === pId)) {
              store.updateStatusPuck(n.id, pId, patch);
              break;
            }
          }
        }
      }
    },
    [nodeId, selectedPuckIds, pucks],
  );

  const handleSelectAllOnNode = useCallback(() => {
    if (pucks.length === 0) return;
    // Select first puck normally, then toggle the rest
    useUIStore.getState().selectPuck(pucks[0].id, nodeId);
    for (let i = 1; i < pucks.length; i++) {
      useUIStore.getState().togglePuckSelection(pucks[i].id, nodeId);
    }
  }, [pucks, nodeId]);

  const handleSelectAllGlobal = useCallback(() => {
    const allNodes = useFlowStore.getState().nodes;
    let first = true;
    for (const n of allNodes) {
      const nodePucks = getStatusIndicators(n.data as FlowNodeData);
      for (const p of nodePucks) {
        if (first) {
          useUIStore.getState().selectPuck(p.id, n.id);
          first = false;
        } else {
          useUIStore.getState().togglePuckSelection(p.id, n.id);
        }
      }
    }
  }, []);

  const defaultColors: Record<string, string> = {
    'not-started': '#94a3b8',
    'in-progress': '#3b82f6',
    'completed': '#10b981',
    'blocked': '#ef4444',
    'review': '#f59e0b',
  };

  return (
    <>
      {/* Header with toggle and add button */}
      <div className="flex items-center gap-1">
        <div className="flex-1">
          <SectionHeader label="Status Pucks" collapsed={collapsed} onToggle={onToggle} />
        </div>
        <button
          onClick={handleAddPuck}
          className="p-1 rounded text-primary hover:bg-primary/10 transition-colors cursor-pointer shrink-0"
          data-tooltip-left="Add a status puck"
        >
          <Plus size={14} />
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Puck chips row */}
          {pucks.length === 0 ? (
            <div className="flex items-center gap-2 py-2">
              <span className="text-xs text-text-muted italic">Add a status puck</span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5 py-1">
              {pucks.map((puck) => {
                const isSelected = selectedPuckNodeId === nodeId && selectedPuckIds.includes(puck.id);
                return (
                  <div key={puck.id} className="relative group">
                    <button
                      onClick={() => handleSelectPuck(puck.id)}
                      className={`
                        w-6 h-6 rounded-full border-2 transition-all cursor-pointer
                        ${isSelected
                          ? 'ring-2 ring-blue-500 ring-offset-1'
                          : 'hover:ring-2 hover:ring-blue-300 hover:ring-offset-1'
                        }
                      `}
                      style={{
                        backgroundColor: puck.color || '#94a3b8',
                        borderColor: puck.borderColor || '#000000',
                      }}
                      data-tooltip-left={`${puck.status} — click to select`}
                    />
                    {/* Remove button on hover */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemovePuck(puck.id);
                      }}
                      className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-white
                                 flex items-center justify-center opacity-0 group-hover:opacity-100
                                 transition-opacity cursor-pointer"
                      data-tooltip-left="Remove puck"
                    >
                      <X size={8} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Selection helper buttons */}
          {pucks.length > 0 && (
            <div className="flex items-center gap-1">
              <button
                onClick={handleSelectAllOnNode}
                className="px-2 py-1 text-[10px] font-medium rounded border border-border dark:border-dk-border
                           text-text-muted hover:bg-slate-50 dark:hover:bg-dk-hover transition-colors cursor-pointer"
              >
                Select All on Node
              </button>
              <button
                onClick={handleSelectAllGlobal}
                className="px-2 py-1 text-[10px] font-medium rounded border border-border dark:border-dk-border
                           text-text-muted hover:bg-slate-50 dark:hover:bg-dk-hover transition-colors cursor-pointer"
              >
                Select All (Global)
              </button>
            </div>
          )}

          {/* Detail editor for the selected puck (single or bulk) */}
          {selectedPuck && (selectedPuckNodeId === nodeId || selectedPuckNodeId === null) && (
            <div className="flex flex-col gap-3 mt-1 pt-2 border-t border-border">
              {/* Multi-edit indicator */}
              {multiSelectCount > 1 && (
                <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[11px] font-medium">
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-800/40 flex items-center justify-center text-[10px] font-bold">{multiSelectCount}</span>
                  Editing {multiSelectCount} pucks — changes apply to all
                </div>
              )}
              {/* Status */}
              <Field label="Status">
                <select
                  value={selectedPuck.status || 'not-started'}
                  onChange={(e) => {
                    const status = e.target.value as StatusIndicator['status'];
                    handleUpdatePuck({
                      status,
                      color: selectedPuck.color || defaultColors[status] || '#94a3b8',
                    });
                  }}
                  className="w-full px-2 py-1.5 text-sm rounded border border-border bg-white dark:bg-dk-input dark:text-dk-text dark:border-dk-border
                             focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  <option value="not-started">Not Started</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="blocked">Blocked</option>
                  <option value="review">Review</option>
                </select>
              </Field>

              {/* Indicator Color */}
              <Field label="Indicator Color">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={selectedPuck.color || '#94a3b8'}
                    onChange={(e) => handleUpdatePuck({ color: e.target.value })}
                    className="w-8 h-8 rounded border border-border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={selectedPuck.color || '#94a3b8'}
                    onChange={(e) => handleUpdatePuck({ color: e.target.value })}
                    className="flex-1 px-2 py-1.5 text-xs font-mono rounded border border-border bg-white dark:bg-dk-input dark:text-dk-text dark:border-dk-border
                               focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              </Field>

              {/* Size */}
              <Field label="Indicator Size">
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={8}
                    max={20}
                    step={1}
                    value={selectedPuck.size || 12}
                    onChange={(e) => handleUpdatePuck({ size: Number(e.target.value) })}
                    className="flex-1 accent-primary"
                  />
                  <span className="text-xs text-text-muted w-8 text-right font-mono">
                    {selectedPuck.size || 12}px
                  </span>
                </div>
              </Field>

              {/* Position */}
              <Field label="Position">
                <div className="grid grid-cols-4 gap-1">
                  {([
                    { value: 'top-left', label: 'TL' },
                    { value: 'top-right', label: 'TR' },
                    { value: 'bottom-left', label: 'BL' },
                    { value: 'bottom-right', label: 'BR' },
                  ] as const).map((pos) => (
                    <button
                      key={pos.value}
                      onClick={() => handleUpdatePuck({ position: pos.value })}
                      className={`
                        py-1.5 text-[10px] font-semibold rounded border transition-colors cursor-pointer
                        ${(selectedPuck.position || 'top-right') === pos.value
                          ? 'bg-primary/10 border-primary/30 text-primary'
                          : 'border-border text-text-muted hover:bg-slate-50 dark:hover:bg-dk-hover'
                        }
                      `}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </Field>

              {/* Puck Icon */}
              <Field label="Puck Icon">
                <div className="flex items-center gap-2">
                  <select
                    value={selectedPuck.icon || ''}
                    onChange={(e) => handleUpdatePuck({ icon: e.target.value || undefined })}
                    className="flex-1 px-2 py-1.5 text-sm rounded border border-border bg-white dark:bg-dk-input dark:text-dk-text dark:border-dk-border
                               focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  >
                    <option value="">Default (Auto)</option>
                    <option value="blank">Blank (No Icon)</option>
                    <option value="Check">Checkmark</option>
                    <option value="Clock">Clock</option>
                    <option value="X">X Mark</option>
                    <option value="Eye">Eye</option>
                    <option value="AlertTriangle">Warning</option>
                    <option value="Star">Star</option>
                    <option value="Heart">Heart</option>
                    <option value="Flag">Flag</option>
                    <option value="Zap">Lightning</option>
                    <option value="ThumbsUp">Thumbs Up</option>
                    <option value="ThumbsDown">Thumbs Down</option>
                    <option value="Circle">Circle</option>
                    <option value="Square">Square</option>
                    <option value="Bell">Bell</option>
                    <option value="Bookmark">Bookmark</option>
                    <option value="Pin">Pin</option>
                  </select>
                </div>
              </Field>

              {/* Border Color */}
              <Field label="Border Color">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={selectedPuck.borderColor || '#000000'}
                    onChange={(e) => handleUpdatePuck({ borderColor: e.target.value })}
                    className="w-8 h-8 rounded border border-border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={selectedPuck.borderColor || '#000000'}
                    onChange={(e) => handleUpdatePuck({ borderColor: e.target.value })}
                    className="flex-1 px-2 py-1.5 text-xs font-mono rounded border border-border bg-white dark:bg-dk-input dark:text-dk-text dark:border-dk-border
                               focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              </Field>

              {/* Border Width */}
              <Field label="Border Width">
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={4}
                    step={0.5}
                    value={selectedPuck.borderWidth ?? 1}
                    onChange={(e) => handleUpdatePuck({ borderWidth: Number(e.target.value) })}
                    className="flex-1 accent-primary"
                  />
                  <span className="text-xs text-text-muted w-8 text-right font-mono">
                    {selectedPuck.borderWidth ?? 1}px
                  </span>
                </div>
              </Field>

              {/* Border Style */}
              <Field label="Border Style">
                <div className="flex items-center gap-1">
                  {(['solid', 'dashed', 'dotted', 'none'] as const).map((style) => (
                    <button
                      key={style}
                      onClick={() => handleUpdatePuck({ borderStyle: style })}
                      className={`flex-1 py-1.5 text-xs font-medium rounded border transition-colors cursor-pointer
                        ${(selectedPuck.borderStyle || 'solid') === style
                          ? 'bg-blue-50 border-blue-300 text-blue-600 dark:bg-blue-800/15 dark:border-blue-500/50 dark:text-blue-400'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-dk-border dark:text-dk-muted dark:hover:bg-dk-hover'
                        }`}
                    >
                      {style.charAt(0).toUpperCase() + style.slice(1)}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          )}
        </>
      )}
    </>
  );
};

const NodePropsTab: React.FC<NodePropsTabProps> = React.memo(({ nodeId, data, nodeType, toggleAllSignal }) => {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [allExpanded, setAllExpanded] = useState<boolean | null>(null);
  const toggleSection = useCallback((section: string) => {
    // When allExpanded override is active, sync individual states first
    if (allExpanded !== null) {
      const allCollapsed = !allExpanded;
      setCollapsedSections({
        block: allCollapsed,
        bodyStyle: allCollapsed,
        label: allCollapsed,
        icon: allCollapsed,
        status: allCollapsed,
        [section]: !allCollapsed, // toggle the clicked section
      });
      setAllExpanded(null); // Clear override — individual states now govern
    } else {
      setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
    }
  }, [allExpanded]);

  // Auto-expand relevant sections based on node properties when selection changes
  useEffect(() => {
    const pucks = getStatusIndicators(data);
    setAllExpanded(null);
    setCollapsedSections({
      block: false,  // always expanded
      bodyStyle: false,  // always expanded
      label: false,  // always expanded (has text settings)
      status: pucks.length === 0,  // expanded only if node has pucks
      icon: !data.icon,  // expanded only if node has an icon
    });
  }, [nodeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute effective collapsed state: allExpanded overrides individual sections
  const isSectionCollapsed = useCallback((section: string) => {
    if (allExpanded !== null) return !allExpanded;
    return !!collapsedSections[section];
  }, [allExpanded, collapsedSections]);

  // React to toggle-all signal from the tab bar chevron
  useEffect(() => {
    if (toggleAllSignal === undefined || toggleAllSignal === 0) return;
    setAllExpanded((prev) => (prev === false ? true : false));
  }, [toggleAllSignal]);

  const update = useCallback(
    (patch: Partial<FlowNodeData>) => {
      updateNodeData(nodeId, patch);
      // Propagate to all other selected nodes
      const { selectedNodes } = useFlowStore.getState();
      if (selectedNodes.length > 1) {
        for (const nid of selectedNodes) {
          if (nid !== nodeId) updateNodeData(nid, patch);
        }
      }
    },
    [nodeId, updateNodeData],
  );

  const activeStyleId = useStyleStore((s) => s.activeStyleId);
  const activeStyle = activeStyleId ? diagramStyles[activeStyleId] ?? null : null;
  const resolved = resolveNodeStyle(data as unknown as Record<string, unknown>, data.shape || 'rectangle', activeStyle);

  const fillColor = data.color || resolved.fill;
  const borderColor = data.borderColor || resolved.borderColor;

  // Check if ANY selected node has an explicit override (for showing reset buttons during multi-select)
  const selectedNodes = useFlowStore((s) => s.selectedNodes);
  const allNodes = useFlowStore((s) => s.nodes);
  const anyHasColorOverride = useMemo(() => {
    if (selectedNodes.length <= 1) return !!data.color;
    return selectedNodes.some((nid) => {
      const n = allNodes.find((nd) => nd.id === nid);
      return n && !!(n.data as FlowNodeData).color;
    });
  }, [selectedNodes, allNodes, data.color]);
  const anyHasBorderColorOverride = useMemo(() => {
    if (selectedNodes.length <= 1) return !!data.borderColor;
    return selectedNodes.some((nid) => {
      const n = allNodes.find((nd) => nd.id === nid);
      return n && !!(n.data as FlowNodeData).borderColor;
    });
  }, [selectedNodes, allNodes, data.borderColor]);
  const textColor = data.textColor || resolved.textColor;
  const fontSize = data.fontSize || resolved.fontSize;
  const fontWeight = data.fontWeight || resolved.fontWeight;
  const textAlign = (data as Record<string, unknown>).textAlign as string || 'center';

  const currentIcon = data.icon;
  const CurrentIconComponent = currentIcon
    ? (icons as Record<string, React.ComponentType<{ size?: number; className?: string }>>)[currentIcon]
    : null;

  return (
    <div className="flex flex-col gap-3">
      {/* ============ BLOCK PROPERTIES ============ */}
      <SectionHeader label="Block" collapsed={isSectionCollapsed('block')} onToggle={() => toggleSection('block')} />

      {!isSectionCollapsed('block') && (
        <>
          {/* Shape type selector — hidden for extension nodes */}
          {nodeType !== 'extensionNode' && (
            <Field label="Shape">
              <select
                value={data.shape || 'rectangle'}
                onChange={(e) => {
                  const newShape = e.target.value as NodeShape;
                  const { selectedNodes, updateNodeData: bulkUpdate } = useFlowStore.getState();
                  for (const nid of selectedNodes) {
                    bulkUpdate(nid, { shape: newShape } as Partial<FlowNodeData>);
                  }
                }}
                className="w-full px-2 py-1.5 rounded bg-slate-50 dark:bg-dk-hover dark:text-dk-text border border-border dark:border-dk-border text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                {SHAPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </Field>
          )}

          {/* Block Size */}
          <Field label="Block Size">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const { selectedNodes, nodes: allNodes, updateNodeData: bulkUpdate } = useFlowStore.getState();
                  for (const nid of selectedNodes) {
                    const node = allNodes.find(n => n.id === nid);
                    if (node) {
                      const nd = node.data as FlowNodeData;
                      const curW = (nd as Record<string, unknown>).width as number || 160;
                      const curH = (nd as Record<string, unknown>).height as number || 60;
                      bulkUpdate(nid, { width: Math.max(40, curW - 20), height: Math.max(20, curH - 15) } as Partial<FlowNodeData>);
                    }
                  }
                }}
                className="flex items-center justify-center gap-1 flex-1 py-1.5 text-xs font-medium rounded border border-border
                           text-text-muted hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                data-tooltip-left="Decrease block size"
              >
                <Minus size={12} /> Smaller
              </button>
              <button
                onClick={() => {
                  const { selectedNodes, nodes: allNodes, updateNodeData: bulkUpdate } = useFlowStore.getState();
                  for (const nid of selectedNodes) {
                    const node = allNodes.find(n => n.id === nid);
                    if (node) {
                      const nd = node.data as FlowNodeData;
                      const curW = (nd as Record<string, unknown>).width as number || 160;
                      const curH = (nd as Record<string, unknown>).height as number || 60;
                      bulkUpdate(nid, { width: curW + 20, height: curH + 15 } as Partial<FlowNodeData>);
                    }
                  }
                }}
                className="flex items-center justify-center gap-1 flex-1 py-1.5 text-xs font-medium rounded border border-border
                           text-text-muted hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                data-tooltip-left="Increase block size"
              >
                <Plus size={12} /> Larger
              </button>
            </div>
          </Field>

          {/* Corner Radius */}
          <Field label="Corner Radius">
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={50}
                step={1}
                value={data.borderRadius ?? 4}
                onChange={(e) => update({ borderRadius: Number(e.target.value) })}
                className="flex-1 accent-primary"
              />
              <span className="text-xs text-text-muted w-8 text-right font-mono">
                {data.borderRadius ?? 4}px
              </span>
            </div>
          </Field>

          {/* Opacity */}
          <Field label="Opacity">
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={data.opacity ?? 1}
                onChange={(e) => update({ opacity: Number(e.target.value) })}
                className="flex-1 h-1.5 accent-primary"
              />
              <span className="text-xs text-text-muted w-8 text-right font-mono">
                {Math.round((data.opacity ?? 1) * 100)}%
              </span>
            </div>
          </Field>

          {/* Rotation */}
          <Field label="Rotation">
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={359}
                step={1}
                value={Math.round(data.rotation ?? 0)}
                onChange={(e) => update({ rotation: Number(e.target.value) })}
                className="flex-1 accent-primary"
              />
              <input
                type="number"
                min={0}
                max={359}
                step={1}
                value={Math.round(data.rotation ?? 0)}
                onChange={(e) => {
                  let val = Number(e.target.value);
                  val = ((val % 360) + 360) % 360;
                  update({ rotation: val });
                }}
                className="w-12 text-xs text-center rounded border border-border dark:border-dk-border bg-white dark:bg-dk-input px-1 py-0.5 font-mono"
              />
              <span className="text-xs text-text-muted">°</span>
              <ResetIcon
                visible={(data.rotation ?? 0) !== 0}
                onReset={() => update({ rotation: 0 })}
              />
            </div>
          </Field>
        </>
      )}

      {/* ============ BODY STYLE ============ */}
      <SectionHeader label="Body Style" collapsed={isSectionCollapsed('bodyStyle')} onToggle={() => toggleSection('bodyStyle')} />

      {!isSectionCollapsed('bodyStyle') && (
        <>
          {/* Fill color */}
          <Field label="Fill Color">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={toHexColor(fillColor, '#3b82f6')}
                onChange={(e) => update({ color: e.target.value })}
                className="w-8 h-8 rounded border border-border cursor-pointer"
              />
              <input
                type="text"
                value={fillColor}
                onChange={(e) => update({ color: e.target.value })}
                className="flex-1 px-2 py-1.5 text-xs font-mono rounded border border-border bg-white dark:bg-dk-input dark:text-dk-text dark:border-dk-border
                           focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              <CopyHexButton value={fillColor} />
              <ResetIcon
                visible={anyHasColorOverride}
                onReset={() => update({ color: undefined })}
              />
            </div>
          </Field>

          {/* Fill Opacity */}
          <Field label="Fill Opacity">
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={data.fillOpacity ?? 1}
                onChange={(e) => update({ fillOpacity: Number(e.target.value) })}
                className="flex-1 accent-primary"
              />
              <span className="text-xs text-muted dark:text-dk-muted w-10 text-right">
                {Math.round((data.fillOpacity ?? 1) * 100)}%
              </span>
              <ResetIcon
                visible={(data.fillOpacity ?? 1) < 1}
                onReset={() => update({ fillOpacity: undefined })}
              />
            </div>
          </Field>

          {/* Border color */}
          <Field label="Border Color">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={toHexColor(borderColor, '#334155')}
                onChange={(e) => update({ borderColor: e.target.value })}
                className="w-8 h-8 rounded border border-border cursor-pointer"
              />
              <input
                type="text"
                value={borderColor}
                onChange={(e) => update({ borderColor: e.target.value })}
                className="flex-1 px-2 py-1.5 text-xs font-mono rounded border border-border bg-white dark:bg-dk-input dark:text-dk-text dark:border-dk-border
                           focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              <CopyHexButton value={borderColor} />
              <ResetIcon
                visible={anyHasBorderColorOverride}
                onReset={() => update({ borderColor: undefined })}
              />
            </div>
          </Field>

          {/* Border Width */}
          <Field label="Border Width">
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={8}
                step={0.5}
                value={data.borderWidth ?? 2}
                onChange={(e) => update({ borderWidth: Number(e.target.value) })}
                className="flex-1 accent-primary"
              />
              <span className="text-xs text-text-muted w-8 text-right font-mono">
                {data.borderWidth ?? 2}px
              </span>
            </div>
          </Field>

          {/* Border Style */}
          <Field label="Border Style">
            <div className="flex items-center gap-1">
              {(['solid', 'dashed', 'dotted'] as const).map((style) => (
                <button
                  key={style}
                  onClick={() => update({ borderStyle: style })}
                  className={`flex-1 py-1.5 text-xs font-medium rounded border transition-colors cursor-pointer
                    ${(data.borderStyle || 'solid') === style
                      ? 'bg-blue-50 border-blue-300 text-blue-600 dark:bg-blue-800/15 dark:border-blue-500/50 dark:text-blue-400'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-dk-border dark:text-dk-muted dark:hover:bg-dk-hover'
                    }`}
                >
                  {style.charAt(0).toUpperCase() + style.slice(1)}
                </button>
              ))}
            </div>
          </Field>
        </>
      )}

      {/* ============ LABEL PROPERTIES ============ */}
      <SectionHeader label="Label" collapsed={isSectionCollapsed('label')} onToggle={() => toggleSection('label')} />

      {!isSectionCollapsed('label') && (
        <>
          {/* Label — show \n escape chars in the field, render as actual newlines on canvas */}
          <Field label="Text">
            <input
              type="text"
              value={(data.label || '').replace(/\n/g, '\\n')}
              onChange={(e) => update({ label: e.target.value.replace(/\\n/g, '\n') })}
              className="w-full px-2 py-1.5 text-sm rounded border border-border bg-white dark:bg-dk-input dark:text-dk-text dark:border-dk-border
                         focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </Field>

          {/* Text color */}
          <Field label="Text Color">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={toHexColor(textColor, '#ffffff')}
                onChange={(e) => update({ textColor: e.target.value })}
                className="w-8 h-8 rounded border border-border cursor-pointer"
              />
              <input
                type="text"
                value={textColor}
                onChange={(e) => update({ textColor: e.target.value })}
                className="flex-1 px-2 py-1.5 text-xs font-mono rounded border border-border bg-white dark:bg-dk-input dark:text-dk-text dark:border-dk-border
                           focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              <CopyHexButton value={textColor} />
              <ResetIcon
                visible={!!activeStyleId && !!data.textColor}
                onReset={() => update({ textColor: undefined })}
              />
            </div>
          </Field>

          {/* Font size */}
          <Field label="Font Size">
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={8}
                max={32}
                value={fontSize}
                onChange={(e) => {
                  const newSize = Number(e.target.value);
                  update({ fontSize: newSize });
                  // Apply to all other selected nodes too
                  const { selectedNodes, updateNodeData: bulkUpdate } = useFlowStore.getState();
                  for (const nid of selectedNodes) {
                    if (nid !== nodeId) bulkUpdate(nid, { fontSize: newSize });
                  }
                }}
                className="flex-1 accent-primary"
              />
              <span className="text-xs text-text-muted w-8 text-right font-mono">
                {fontSize}
              </span>
              <button
                onClick={() => {
                  const { selectedNodes, nodes: allNodes, updateNodeData: bulkUpdate } = useFlowStore.getState();
                  for (const nid of selectedNodes) {
                    const node = allNodes.find(n => n.id === nid);
                    if (node) {
                      const currentSize = (node.data as FlowNodeData).fontSize || 14;
                      bulkUpdate(nid, { fontSize: Math.min(32, currentSize + 1) });
                    }
                  }
                }}
                className="p-1 rounded border border-border text-text-muted hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                data-tooltip-left="Increase font size"
              >
                <AArrowUp size={14} />
              </button>
              <button
                onClick={() => {
                  const { selectedNodes, nodes: allNodes, updateNodeData: bulkUpdate } = useFlowStore.getState();
                  for (const nid of selectedNodes) {
                    const node = allNodes.find(n => n.id === nid);
                    if (node) {
                      const currentSize = (node.data as FlowNodeData).fontSize || 14;
                      bulkUpdate(nid, { fontSize: Math.max(8, currentSize - 1) });
                    }
                  }
                }}
                className="p-1 rounded border border-border text-text-muted hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                data-tooltip-left="Decrease font size"
              >
                <AArrowDown size={14} />
              </button>
              <ResetIcon
                visible={!!activeStyleId && !!data.fontSize}
                onReset={() => update({ fontSize: undefined })}
              />
            </div>
          </Field>

          {/* Font weight */}
          <Field label="Font Weight">
            <div className="flex items-center gap-1">
              {([
                { value: 300, label: 'Light' },
                { value: 400, label: 'Normal' },
                { value: 600, label: 'Semi' },
                { value: 700, label: 'Bold' },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => update({ fontWeight: opt.value })}
                  className={`flex-1 py-1.5 text-xs rounded border transition-colors cursor-pointer
                    ${fontWeight === opt.value
                      ? 'bg-blue-50 border-blue-300 text-blue-600 dark:bg-blue-800/15 dark:border-blue-500/50 dark:text-blue-400'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-dk-border dark:text-dk-muted dark:hover:bg-dk-hover'
                    }`}
                  style={{ fontWeight: opt.value }}
                >
                  {opt.label}
                </button>
              ))}
              <ResetIcon
                visible={!!activeStyleId && !!data.fontWeight}
                onReset={() => update({ fontWeight: undefined })}
              />
            </div>
          </Field>

          {/* Text alignment */}
          <Field label="Text Align">
            <div className="flex items-center gap-1">
              {[
                { icon: <AlignLeft size={16} />, value: 'left' },
                { icon: <AlignCenter size={16} />, value: 'center' },
                { icon: <AlignRight size={16} />, value: 'right' },
              ].map(({ icon, value }) => (
                <button
                  key={value}
                  onClick={() => update({ textAlign: value } as Partial<FlowNodeData>)}
                  className={`
                    flex items-center justify-center w-8 h-8 rounded border
                    transition-colors cursor-pointer
                    ${textAlign === value
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'border-border text-text-muted hover:bg-slate-50 dark:hover:bg-dk-hover'
                    }
                  `}
                  data-tooltip-left={`Align ${value.charAt(0).toUpperCase() + value.slice(1)}`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </Field>

          {/* Label position */}
          <Field label="Label Position">
            <div className="flex items-center gap-1">
              {(['above', 'overlay', 'below'] as const).map((pos) => (
                <button
                  key={pos}
                  onClick={() => update({ labelPosition: pos })}
                  className={`flex-1 py-1.5 text-xs font-medium rounded border transition-colors cursor-pointer
                    ${(data.labelPosition || (nodeType === 'extensionNode' ? 'below' : 'overlay')) === pos
                      ? 'bg-blue-50 border-blue-300 text-blue-600 dark:bg-blue-800/15 dark:border-blue-500/50 dark:text-blue-400'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-dk-border dark:text-dk-muted dark:hover:bg-dk-hover'
                    }`}
                >
                  {pos.charAt(0).toUpperCase() + pos.slice(1)}
                </button>
              ))}
            </div>
          </Field>

        </>
      )}

      {/* ============ ICON ============ */}
      <SectionHeader label="Icon" collapsed={isSectionCollapsed('icon')} onToggle={() => toggleSection('icon')} />

      {!isSectionCollapsed('icon') && (
        <>
          {/* Icon selector */}
          <Field label="Icon">
            <div className="flex items-center gap-2">
              {CurrentIconComponent && (
                <div className="flex items-center justify-center w-8 h-8 rounded border border-border dark:border-dk-border bg-slate-50 dark:bg-dk-hover">
                  <CurrentIconComponent size={18} className="text-slate-600 dark:text-dk-muted" />
                </div>
              )}
              <button
                onClick={() => setIconPickerOpen(!iconPickerOpen)}
                className="px-3 py-1.5 text-xs font-medium rounded border border-border dark:border-dk-border
                           text-text-muted hover:bg-slate-50 dark:hover:bg-dk-hover hover:text-text transition-colors cursor-pointer"
              >
                {currentIcon ? 'Change Icon' : 'Add Icon'}
              </button>
              {currentIcon && (
                <button
                  onClick={() => update({ icon: undefined })}
                  className="text-xs text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                >
                  Remove
                </button>
              )}
            </div>
            {iconPickerOpen && (
              <IconPicker
                currentIcon={currentIcon}
                onSelect={(iconName) => {
                  if (iconName === '') {
                    update({ icon: undefined });
                    // Collapse icon section when removing icon
                    setAllExpanded(null);
                    setCollapsedSections((prev) => ({ ...prev, icon: true }));
                  } else {
                    update({ icon: iconName });
                  }
                  setIconPickerOpen(false);
                }}
                onClose={() => setIconPickerOpen(false)}
              />
            )}
          </Field>

          {currentIcon && (
            <>
              {/* Icon Position */}
              <Field label="Icon Position">
                <div className="flex items-center gap-1">
                  {[
                    { value: 'left', label: 'Left' },
                    { value: 'right', label: 'Right' },
                  ].map((pos) => (
                    <button
                      key={pos.value}
                      onClick={() => update({ iconPosition: pos.value as 'left' | 'right' })}
                      className={`
                        flex-1 py-1.5 text-xs font-medium rounded border transition-colors cursor-pointer
                        ${(data.iconPosition || 'left') === pos.value
                          ? 'bg-blue-50 border-blue-300 text-blue-600 dark:bg-blue-800/15 dark:border-blue-500/50 dark:text-blue-400'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-dk-border dark:text-dk-muted dark:hover:bg-dk-hover'
                        }
                      `}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </Field>

              {/* Icon Color */}
              <Field label="Icon Color">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={toHexColor(data.iconColor || textColor, '#ffffff')}
                    onChange={(e) => update({ iconColor: e.target.value })}
                    className="w-8 h-8 shrink-0 rounded border border-border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={data.iconColor || textColor}
                    onChange={(e) => update({ iconColor: e.target.value })}
                    className="flex-1 min-w-0 px-2 py-1.5 text-xs font-mono rounded border border-border bg-white dark:bg-dk-input dark:text-dk-text dark:border-dk-border
                               focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                  {data.iconColor && (
                    <button
                      onClick={() => update({ iconColor: undefined })}
                      className="text-xs text-red-500 hover:text-red-700 cursor-pointer shrink-0"
                      data-tooltip-left="Reset to default"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </Field>

              {/* Icon Background Color */}
              <Field label="Background">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={toHexColor(data.iconBgColor, '#ffffff')}
                    onChange={(e) => update({ iconBgColor: e.target.value })}
                    className="w-8 h-8 shrink-0 rounded border border-border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={data.iconBgColor || ''}
                    placeholder="None"
                    onChange={(e) => update({ iconBgColor: e.target.value || undefined })}
                    className="flex-1 min-w-0 px-2 py-1.5 text-xs font-mono rounded border border-border bg-white dark:bg-dk-input dark:text-dk-text dark:border-dk-border
                               focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                  {data.iconBgColor && (
                    <button
                      onClick={() => update({ iconBgColor: undefined })}
                      className="text-xs text-red-500 hover:text-red-700 cursor-pointer shrink-0"
                      data-tooltip-left="Remove background"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </Field>

              {/* Icon Border Color */}
              <Field label="Outline Color">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={toHexColor(data.iconBorderColor, '#94a3b8')}
                    onChange={(e) => update({ iconBorderColor: e.target.value })}
                    className="w-8 h-8 shrink-0 rounded border border-border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={data.iconBorderColor || ''}
                    placeholder="None"
                    onChange={(e) => update({ iconBorderColor: e.target.value || undefined })}
                    className="flex-1 min-w-0 px-2 py-1.5 text-xs font-mono rounded border border-border bg-white dark:bg-dk-input dark:text-dk-text dark:border-dk-border
                               focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              </Field>

              {/* Icon Border Width */}
              <Field label="Outline Width">
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={4}
                    step={0.5}
                    value={data.iconBorderWidth ?? 0}
                    onChange={(e) => update({ iconBorderWidth: Number(e.target.value) })}
                    className="flex-1 accent-primary"
                  />
                  <span className="text-xs text-text-muted w-8 text-right font-mono">
                    {data.iconBorderWidth ?? 0}px
                  </span>
                </div>
              </Field>

              {/* Icon Size */}
              <Field label="Size">
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={10}
                    max={64}
                    step={1}
                    value={data.iconSize || (fontSize + 2)}
                    onChange={(e) => update({ iconSize: Number(e.target.value) })}
                    className="flex-1 accent-primary"
                  />
                  <span className="text-xs text-text-muted w-8 text-right font-mono">
                    {data.iconSize || (fontSize + 2)}px
                  </span>
                  {data.iconSize && (
                    <button
                      onClick={() => update({ iconSize: undefined })}
                      className="text-xs text-red-500 hover:text-red-700 cursor-pointer"
                      data-tooltip-left="Reset to auto"
                    >
                      Auto
                    </button>
                  )}
                </div>
              </Field>
            </>
          )}
        </>
      )}

      {/* ============ STATUS PUCKS ============ */}
      <StatusPucksSection nodeId={nodeId} data={data} collapsed={isSectionCollapsed('status')} onToggle={() => toggleSection('status')} />
    </div>
  );
});

NodePropsTab.displayName = 'NodePropsTab';

// ---------------------------------------------------------------------------
// Placeholder tabs
// ---------------------------------------------------------------------------

const PlaceholderTab: React.FC<{ name: string }> = ({ name }) => (
  <div className="flex items-center justify-center h-32 text-sm text-text-muted">
    {name} settings coming soon
  </div>
);

// ---------------------------------------------------------------------------
// Read-only field with optional copy
// ---------------------------------------------------------------------------

const ReadOnlyField: React.FC<{ label: string; value: string; copyable?: boolean }> = ({
  label,
  value,
  copyable,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch((e) => log.error('Copy to clipboard failed', e));
  }, [value]);

  return (
    <Field label={label}>
      <div className="flex items-center gap-1.5">
        <span className="flex-1 px-2 py-1.5 text-xs font-mono rounded bg-slate-50 dark:bg-dk-hover dark:text-dk-text border border-border dark:border-dk-border text-text truncate">
          {value}
        </span>
        {copyable && (
          <button
            onClick={handleCopy}
            className="p-1 rounded text-text-muted hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer shrink-0"
            title={copied ? 'Copied!' : 'Copy to clipboard'}
          >
            <Copy size={12} />
          </button>
        )}
      </div>
    </Field>
  );
};

// ---------------------------------------------------------------------------
// Data Tab - shows metadata for selected node
// ---------------------------------------------------------------------------

interface DataTabProps {
  nodeId: string;
  data: FlowNodeData;
  position: { x: number; y: number };
  measured?: { width?: number; height?: number };
}

const DataTab: React.FC<DataTabProps> = React.memo(({ nodeId, data, position, measured }) => {
  const edges = useFlowStore((s) => s.edges);
  const nodes = useFlowStore((s) => s.nodes);
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const setSelectedNodes = useFlowStore((s) => s.setSelectedNodes);
  const setNodes = useFlowStore((s) => s.setNodes);
  const [localNotes, setLocalNotes] = useState(data.notes || '');

  // Sync local notes when the selected node changes or external updates arrive
  useEffect(() => {
    setLocalNotes(data.notes || '');
  }, [nodeId, data.notes]);

  // Detect if this is a group node and find its members
  const thisNode = useMemo(() => nodes.find((n) => n.id === nodeId), [nodes, nodeId]);
  const isGroupNode = thisNode?.type === 'groupNode';
  const groupMembers = useMemo(() => {
    if (!isGroupNode) return [];
    return nodes.filter((n) => (n.data as FlowNodeData).groupId === nodeId);
  }, [isGroupNode, nodes, nodeId]);

  // Compute connected nodes from edges
  const connectedTo = useMemo(() => {
    const connectedIds = new Set<string>();
    for (const edge of edges) {
      if (edge.source === nodeId) connectedIds.add(edge.target);
      if (edge.target === nodeId) connectedIds.add(edge.source);
    }
    return Array.from(connectedIds).map(id => {
      const node = nodes.find(n => n.id === id);
      return node ? `${node.data.label} (${id})` : id;
    });
  }, [edges, nodes, nodeId]);

  // Upstream (depends on)
  const upstream = useMemo(() => {
    if (!data.dependsOn || data.dependsOn.length === 0) return [];
    return data.dependsOn.map(id => {
      const node = nodes.find(n => n.id === id);
      return node ? `${node.data.label} (${id})` : id;
    });
  }, [data.dependsOn, nodes]);

  // Downstream (blocked by)
  const downstream = useMemo(() => {
    if (!data.blockedBy || data.blockedBy.length === 0) return [];
    return data.blockedBy.map(id => {
      const node = nodes.find(n => n.id === id);
      return node ? `${node.data.label} (${id})` : id;
    });
  }, [data.blockedBy, nodes]);

  // Resolve swimlane label from ID
  const swimlaneLabel = (() => {
    if (!data.swimlaneId) return 'None';
    const { containers } = useSwimlaneStore.getState();
    const allLanes = containers.flatMap((c) => [...c.config.horizontal, ...c.config.vertical]);
    const lane = allLanes.find((l) => l.id === data.swimlaneId);
    return lane ? lane.label : 'None';
  })();

  // Resolve group(s) the node is physically inside (by bounding-box containment)
  const groupLabel = useMemo(() => {
    if (!thisNode || thisNode.type === 'groupNode') return 'None';
    const nx = thisNode.position.x;
    const ny = thisNode.position.y;
    const containing: string[] = [];
    for (const n of nodes) {
      if (n.type !== 'groupNode' || n.id === nodeId) continue;
      const gd = n.data as FlowNodeData;
      const gw = gd.width || 300;
      const gh = gd.height || 200;
      if (nx >= n.position.x && ny >= n.position.y &&
          nx <= n.position.x + gw && ny <= n.position.y + gh) {
        containing.push(gd.label || 'Group');
      }
    }
    return containing.length > 0 ? containing.join(', ') : 'None';
  }, [thisNode, nodes, nodeId]);
  const posStr = `${Math.round(position.x)}, ${Math.round(position.y)}`;
  const dimStr = measured
    ? `${Math.round(measured.width ?? 0)} x ${Math.round(measured.height ?? 0)}`
    : 'N/A';

  return (
    <div className="flex flex-col gap-4">
      <ReadOnlyField label="Node ID" value={nodeId} copyable />
      <ReadOnlyField label="Position" value={posStr} />
      <ReadOnlyField label="Dimensions" value={dimStr} />
      <ReadOnlyField label="Swimlane" value={swimlaneLabel} />
      <ReadOnlyField label="Group" value={groupLabel} />

      {/* Group Members — only shown for group nodes */}
      {isGroupNode && (
        <Field label={`Group Members (${groupMembers.length})`}>
          {groupMembers.length === 0 ? (
            <span className="text-xs text-text-muted italic px-2 py-1.5">No members in this group</span>
          ) : (
            <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto">
              {groupMembers.map((member) => {
                const memberData = member.data as FlowNodeData;
                const isHidden = !!member.hidden;
                return (
                  <div
                    key={member.id}
                    className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded border border-border dark:border-dk-border ${
                      isHidden ? 'opacity-50 bg-slate-50 dark:bg-dk-hover' : 'bg-white dark:bg-dk-surface'
                    }`}
                  >
                    {/* Color dot */}
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: memberData.color || '#3b82f6' }}
                    />
                    {/* Label */}
                    <span className="flex-1 truncate text-text dark:text-dk-text">
                      {memberData.label || member.id}
                    </span>
                    {/* Select on canvas */}
                    <button
                      onClick={() => setSelectedNodes([member.id])}
                      className="p-0.5 rounded text-text-muted hover:text-primary transition-colors cursor-pointer shrink-0"
                      data-tooltip-left="Select"
                    >
                      <ChevronRight size={12} />
                    </button>
                    {/* Toggle visibility */}
                    <button
                      onClick={() => {
                        const updated = nodes.map((n) =>
                          n.id === member.id ? { ...n, hidden: !isHidden } : n
                        );
                        setNodes(updated);
                      }}
                      className={`p-0.5 rounded transition-colors cursor-pointer shrink-0 ${
                        isHidden ? 'text-slate-300 dark:text-dk-faint hover:text-text-muted' : 'text-text-muted hover:text-primary'
                      }`}
                      data-tooltip-left={isHidden ? 'Show' : 'Hide'}
                    >
                      {isHidden ? <EyeClosed size={12} /> : <Eye size={12} />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Field>
      )}

      {/* Connected To */}
      <Field label={`Connected To (${connectedTo.length})`}>
        {connectedTo.length === 0 ? (
          <span className="text-xs text-text-muted italic px-2 py-1.5">No connections</span>
        ) : (
          <div className="flex flex-col gap-1">
            {connectedTo.map((name, i) => (
              <span
                key={i}
                className="px-2 py-1 text-xs rounded bg-slate-50 dark:bg-dk-hover dark:text-dk-text border border-border dark:border-dk-border text-text truncate"
              >
                {name}
              </span>
            ))}
          </div>
        )}
      </Field>

      {/* Upstream (prerequisites) */}
      <Field label={`Upstream - Prerequisites (${upstream.length})`}>
        {upstream.length === 0 ? (
          <span className="text-xs text-text-muted italic px-2 py-1.5">None</span>
        ) : (
          <div className="flex flex-col gap-1">
            {upstream.map((name, i) => (
              <span
                key={i}
                className="px-2 py-1 text-xs rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-300 truncate"
              >
                {name}
              </span>
            ))}
          </div>
        )}
      </Field>

      {/* Downstream (this enables) */}
      <Field label={`Downstream - Enables (${downstream.length})`}>
        {downstream.length === 0 ? (
          <span className="text-xs text-text-muted italic px-2 py-1.5">None</span>
        ) : (
          <div className="flex flex-col gap-1">
            {downstream.map((name, i) => (
              <span
                key={i}
                className="px-2 py-1 text-xs rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-300 truncate"
              >
                {name}
              </span>
            ))}
          </div>
        )}
      </Field>

      {/* Start On */}
      <Field label="Start On">
        <input
          type="date"
          value={data.startOn || ''}
          onChange={(e) => updateNodeData(nodeId, { startOn: e.target.value || undefined })}
          className="w-full px-2 py-1.5 text-xs rounded border border-border bg-surface text-text
                     focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </Field>

      {/* Completed By */}
      <Field label="Completed By">
        <input
          type="date"
          value={data.completedBy || ''}
          onChange={(e) => updateNodeData(nodeId, { completedBy: e.target.value || undefined })}
          className="w-full px-2 py-1.5 text-xs rounded border border-border bg-surface text-text
                     focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </Field>

      {/* Notes */}
      <Field label="Notes">
        <textarea
          id="node-notes-textarea"
          value={localNotes}
          onChange={(e) => setLocalNotes(e.target.value)}
          onBlur={() => updateNodeData(nodeId, { notes: localNotes || undefined })}
          placeholder="Add notes..."
          rows={3}
          className="w-full px-2 py-1.5 text-xs rounded border border-border bg-surface text-text placeholder:text-text-muted resize-y min-h-[60px] focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </Field>
    </div>
  );
});

DataTab.displayName = 'DataTab';

// ---------------------------------------------------------------------------
// Edge Data Tab - shows metadata + notes for selected edge
// ---------------------------------------------------------------------------

interface EdgeDataTabProps {
  edgeId: string;
  data: FlowEdgeData;
  source: string;
  target: string;
  type?: string;
}

const EdgeDataTab: React.FC<EdgeDataTabProps> = React.memo(({ edgeId, data, source, target, type }) => {
  const nodes = useFlowStore((s) => s.nodes);
  const updateEdgeData = useFlowStore((s) => s.updateEdgeData);
  const [localNotes, setLocalNotes] = useState(data.notes || '');

  useEffect(() => {
    setLocalNotes(data.notes || '');
  }, [edgeId, data.notes]);

  const sourceLabel = useMemo(() => {
    const node = nodes.find((n) => n.id === source);
    return node ? `${node.data.label} (${source})` : source;
  }, [nodes, source]);

  const targetLabel = useMemo(() => {
    const node = nodes.find((n) => n.id === target);
    return node ? `${node.data.label} (${target})` : target;
  }, [nodes, target]);

  return (
    <div className="flex flex-col gap-4">
      <ReadOnlyField label="Edge ID" value={edgeId} copyable />
      <ReadOnlyField label="Type" value={type || 'default'} />
      <ReadOnlyField label="Source" value={sourceLabel} />
      <ReadOnlyField label="Target" value={targetLabel} />
      {data.label && <ReadOnlyField label="Label" value={data.label} />}

      {/* Notes */}
      <Field label="Notes">
        <textarea
          id="edge-notes-textarea"
          value={localNotes}
          onChange={(e) => setLocalNotes(e.target.value)}
          onBlur={() => updateEdgeData(edgeId, { notes: localNotes || undefined })}
          placeholder="Add notes..."
          rows={3}
          className="w-full px-2 py-1.5 text-xs rounded border border-border bg-surface text-text placeholder:text-text-muted resize-y min-h-[60px] focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </Field>
    </div>
  );
});

EdgeDataTab.displayName = 'EdgeDataTab';

// ---------------------------------------------------------------------------
// Lane palette for new lanes
// ---------------------------------------------------------------------------

const LANE_PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

// ---------------------------------------------------------------------------
// SwimlanePanel (replaces placeholder)
// ---------------------------------------------------------------------------

const BORDER_STYLE_OPTIONS: { value: BorderStyleType; label: string }[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'none', label: 'None' },
];

const SwimlanePanel: React.FC = React.memo(() => {
  const config = useSwimlaneStore((s) => {
    const c = s.containers.find((c) => c.id === s.activeContainerId);
    return c?.config ?? { orientation: 'horizontal' as const, containerTitle: '', horizontal: [], vertical: [] };
  });
  const addLane = useSwimlaneStore((s) => s.addLane);
  const removeLane = useSwimlaneStore((s) => s.removeLane);
  const updateLane = useSwimlaneStore((s) => s.updateLane);
  const setOrientation = useSwimlaneStore((s) => s.setOrientation);
  const setContainerTitle = useSwimlaneStore((s) => s.setContainerTitle);
  const setIsCreating = useSwimlaneStore((s) => s.setIsCreating);
  const updateContainerBorder = useSwimlaneStore((s) => s.updateContainerBorder);
  const updateDividerStyle = useSwimlaneStore((s) => s.updateDividerStyle);
  const updateLabelConfig = useSwimlaneStore((s) => s.updateLabelConfig);
  const updateTitleConfig = useSwimlaneStore((s) => s.updateTitleConfig);
  const darkMode = useStyleStore((s) => s.darkMode);

  const hLanes = config.horizontal;
  const vLanes = config.vertical;
  const hasHLanes = hLanes.length > 0;
  const hasVLanes = vLanes.length > 0;
  const isMatrix = hasHLanes && hasVLanes;
  const hasAnyLanes = hasHLanes || hasVLanes;

  // Determine current mode string
  const modeLabel = isMatrix ? 'Matrix' : hasVLanes ? 'Vertical' : hasHLanes ? 'Horizontal' : 'None';

  const handleAddLane = useCallback(
    (orientation: SwimlaneOrientation) => {
      const lanes = orientation === 'horizontal' ? hLanes : vLanes;
      const prefix = orientation === 'horizontal' ? 'Row' : 'Column';
      const newLane: SwimlaneItem = {
        id: generateId('lane'),
        label: `${prefix} ${lanes.length + 1}`,
        color: LANE_PALETTE[lanes.length % LANE_PALETTE.length],
        collapsed: false,
        size: orientation === 'horizontal' ? 200 : 250,
        order: lanes.length,
        ...(darkMode ? { colorOpacity: 30 } : {}),
      };
      addLane(orientation, newLane);
    },
    [hLanes, vLanes, addLane, darkMode],
  );

  const handleToggleMatrix = useCallback(() => {
    if (isMatrix) {
      // Remove all vertical lanes to exit matrix mode
      for (const lane of vLanes) {
        removeLane('vertical', lane.id);
      }
    } else if (hasHLanes) {
      // Add vertical lanes to enter matrix mode
      for (let i = 0; i < 2; i++) {
        const newLane: SwimlaneItem = {
          id: generateId('lane'),
          label: `Col ${i + 1}`,
          color: LANE_PALETTE[(hLanes.length + i) % LANE_PALETTE.length],
          collapsed: false,
          size: 250,
          order: i,
          ...(darkMode ? { colorOpacity: 30 } : {}),
        };
        addLane('vertical', newLane);
      }
    } else if (hasVLanes) {
      // Add horizontal lanes to enter matrix mode
      for (let i = 0; i < 2; i++) {
        const newLane: SwimlaneItem = {
          id: generateId('lane'),
          label: `Row ${i + 1}`,
          color: LANE_PALETTE[(vLanes.length + i) % LANE_PALETTE.length],
          collapsed: false,
          size: 200,
          order: i,
          ...(darkMode ? { colorOpacity: 30 } : {}),
        };
        addLane('horizontal', newLane);
      }
    }
  }, [isMatrix, hasHLanes, hasVLanes, hLanes, vLanes, addLane, removeLane, darkMode]);

  // Render a lane list for a given orientation
  const renderLaneList = (lanes: SwimlaneItem[], orientation: SwimlaneOrientation) => (
    <div className="flex flex-col gap-1.5">
      {[...lanes].sort((a, b) => a.order - b.order).map((lane) => (
        <div
          key={lane.id}
          className={`flex flex-col gap-1 px-2 py-1.5 rounded-md border border-border dark:border-dk-border bg-white/50 dark:bg-dk-hover/80 ${lane.hidden ? 'opacity-50' : ''}`}
        >
          {/* Row 1: Label */}
          <input
            type="text"
            value={lane.label}
            onChange={(e) => updateLane(orientation, lane.id, { label: e.target.value })}
            className="w-full px-1.5 py-0.5 text-xs font-medium rounded border border-transparent
                       hover:border-border focus:border-primary focus:outline-none
                       bg-transparent text-text dark:text-text-dark"
          />
          {/* Row 2: Attribute controls */}
          <div className="flex items-center gap-0.5">
            {/* Hide lane + all contents toggle */}
            <Tip label={lane.hidden ? 'Show lane & contents' : 'Hide lane & contents'}>
              <button
                onClick={() => updateLane(orientation, lane.id, { hidden: !lane.hidden })}
                className={`p-0.5 rounded transition-colors cursor-pointer shrink-0
                  ${lane.hidden
                    ? 'text-slate-300 dark:text-dk-faint hover:text-text-muted'
                    : 'text-text-muted hover:text-primary'
                  }`}
              >
                {lane.hidden ? <EyeClosed size={12} /> : <Eye size={12} />}
              </button>
            </Tip>
            {/* Color picker */}
            <Tip label="Lane color">
              <input
                type="color"
                value={lane.color}
                onChange={(e) => updateLane(orientation, lane.id, { color: e.target.value })}
                className="w-4 h-4 rounded border border-border cursor-pointer shrink-0"
              />
            </Tip>
            {/* Opacity slider */}
            <Tip label={`Opacity: ${lane.colorOpacity ?? (darkMode ? 35 : 15)}%`}>
              <input
                type="range"
                min={0}
                max={100}
                value={lane.colorOpacity ?? (darkMode ? 35 : 15)}
                onChange={(e) => updateLane(orientation, lane.id, { colorOpacity: Number(e.target.value) })}
                className="flex-1 min-w-0 h-3 cursor-pointer accent-primary"
              />
            </Tip>
            {/* Toggle label visibility */}
            <Tip label={(lane.showLabel ?? true) ? 'Hide label' : 'Show label'}>
              <button
                onClick={() => updateLane(orientation, lane.id, { showLabel: !(lane.showLabel ?? true) })}
                className={`p-0.5 rounded transition-colors cursor-pointer shrink-0
                  ${(lane.showLabel ?? true)
                    ? 'text-text-muted hover:text-primary'
                    : 'text-slate-300 dark:text-dk-faint hover:text-text-muted'
                  }`}
              >
                <Type size={12} />
              </button>
            </Tip>
            {/* Toggle color indicator visibility */}
            <Tip label={(lane.showColor ?? true) ? 'Hide color indicator' : 'Show color indicator'}>
              <button
                onClick={() => updateLane(orientation, lane.id, { showColor: !(lane.showColor ?? true) })}
                className={`p-0.5 rounded transition-colors cursor-pointer shrink-0
                  ${(lane.showColor ?? true)
                    ? 'text-text-muted hover:text-primary'
                    : 'text-slate-300 dark:text-dk-faint hover:text-text-muted'
                  }`}
              >
                <Palette size={12} />
              </button>
            </Tip>
            {/* Remove button */}
            <Tip label="Remove lane">
              <button
                onClick={() => removeLane(orientation, lane.id)}
                className="p-0.5 rounded text-text-muted hover:text-danger hover:bg-danger/10
                           transition-colors cursor-pointer shrink-0"
              >
                <Trash2 size={12} />
              </button>
            </Tip>
          </div>
        </div>
      ))}
      {/* Add lane button */}
      <button
        onClick={() => handleAddLane(orientation)}
        disabled={lanes.length >= 10}
        className="flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium
                   text-primary hover:bg-primary/5 rounded-md border border-dashed border-primary/30
                   transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Plus size={12} />
        Add {orientation === 'horizontal' ? 'Row' : 'Column'}
      </button>
    </div>
  );

  if (!hasAnyLanes) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-dk-hover flex items-center justify-center">
          <Rows3 size={20} className="text-text-muted" />
        </div>
        <p className="text-sm text-text-muted leading-relaxed">
          No swimlanes configured
        </p>
        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-1.5 text-xs font-medium rounded-md bg-primary text-white
                     hover:bg-primary-hover transition-colors cursor-pointer"
        >
          Create Swimlanes
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Current config info */}
      <Field label="Mode">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-50 dark:bg-dk-hover dark:text-dk-text border border-border dark:border-dk-border text-xs font-medium">
            {isMatrix ? (
              <Grid3X3 size={12} />
            ) : hasVLanes ? (
              <Columns3 size={12} />
            ) : (
              <Rows3 size={12} />
            )}
            {modeLabel}
          </span>
          {hasAnyLanes && (
            <button
              onClick={handleToggleMatrix}
              className="px-2 py-1 text-[10px] font-medium rounded border border-border dark:border-dk-border
                         text-text-muted hover:bg-slate-50 dark:hover:bg-dk-hover transition-colors cursor-pointer"
            >
              {isMatrix ? 'Exit Matrix' : 'Matrix Mode'}
            </button>
          )}
        </div>
      </Field>

      {/* Container title */}
      <Field label="Container Title">
        <input
          type="text"
          value={config.containerTitle}
          onChange={(e) => setContainerTitle(e.target.value)}
          placeholder="Optional title"
          className="w-full px-2 py-1.5 text-sm rounded border border-border bg-white dark:bg-dk-input dark:text-dk-text dark:border-dk-border
                     focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </Field>
      {config.containerTitle && (
        <>
          <Field label="Title Font Size">
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={8}
                max={40}
                step={1}
                value={config.titleFontSize ?? 13}
                onChange={(e) => updateTitleConfig({ titleFontSize: Number(e.target.value) })}
                className="flex-1"
              />
              <span className="text-xs text-text-muted w-6 text-right">{config.titleFontSize ?? 13}</span>
            </div>
          </Field>
          <Field label="Title Color">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={config.titleColor ?? '#0f172a'}
                onChange={(e) => updateTitleConfig({ titleColor: e.target.value })}
                className="w-7 h-7 rounded border border-border cursor-pointer shrink-0"
              />
              <span className="text-xs text-text-muted">{config.titleColor ?? 'Auto'}</span>
            </div>
          </Field>
          <Field label="Title Font">
            <select
              value={config.titleFontFamily ?? ''}
              onChange={(e) => updateTitleConfig({ titleFontFamily: e.target.value || undefined })}
              className="w-full px-2 py-1.5 text-xs rounded border border-border bg-white dark:bg-dk-input dark:text-dk-text dark:border-dk-border focus:outline-none"
            >
              <option value="">Default (Inter)</option>
              <option value="Inter, system-ui, sans-serif">Inter</option>
              <option value="Aptos, Calibri, sans-serif">Aptos</option>
              <option value="Calibri, 'Gill Sans', sans-serif">Calibri</option>
              <option value="'Segoe UI', Tahoma, sans-serif">Segoe UI</option>
              <option value="Arial, Helvetica, sans-serif">Arial</option>
              <option value="Verdana, Geneva, sans-serif">Verdana</option>
              <option value="'Trebuchet MS', Helvetica, sans-serif">Trebuchet MS</option>
              <option value="Georgia, 'Times New Roman', serif">Georgia</option>
              <option value="Cambria, Georgia, serif">Cambria</option>
              <option value="'Courier New', Courier, monospace">Courier New</option>
              <option value="Consolas, 'Courier New', monospace">Consolas</option>
              <option value="Impact, Haettenschweiler, sans-serif">Impact</option>
            </select>
          </Field>
        </>
      )}

      {/* Orientation toggle (only if not matrix) */}
      {!isMatrix && (
        <Field label="Orientation">
          <div className="flex gap-1">
            <button
              onClick={() => {
                if (hasVLanes && !hasHLanes) {
                  // Switch vertical lanes to horizontal
                  const currentLanes = [...vLanes];
                  for (const lane of currentLanes) removeLane('vertical', lane.id);
                  for (const lane of currentLanes) {
                    addLane('horizontal', { ...lane, size: 200 });
                  }
                }
                setOrientation('horizontal');
              }}
              className={`
                flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium
                rounded-md border transition-colors cursor-pointer
                ${hasHLanes
                  ? 'bg-primary/10 border-primary/40 text-primary'
                  : 'border-border text-text-muted hover:bg-slate-50 dark:hover:bg-dk-hover'
                }
              `}
            >
              <Rows3 size={12} /> Horizontal
            </button>
            <button
              onClick={() => {
                if (hasHLanes && !hasVLanes) {
                  // Switch horizontal lanes to vertical
                  const currentLanes = [...hLanes];
                  for (const lane of currentLanes) removeLane('horizontal', lane.id);
                  for (const lane of currentLanes) {
                    addLane('vertical', { ...lane, size: 250 });
                  }
                }
                setOrientation('vertical');
              }}
              className={`
                flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium
                rounded-md border transition-colors cursor-pointer
                ${hasVLanes
                  ? 'bg-primary/10 border-primary/40 text-primary'
                  : 'border-border text-text-muted hover:bg-slate-50 dark:hover:bg-dk-hover'
                }
              `}
            >
              <Columns3 size={12} /> Vertical
            </button>
          </div>
        </Field>
      )}

      {/* Horizontal lanes */}
      {hasHLanes && (
        <Field label={`Rows (${hLanes.length})`}>
          {renderLaneList(hLanes, 'horizontal')}
        </Field>
      )}

      {/* Vertical lanes */}
      {hasVLanes && (
        <Field label={`Columns (${vLanes.length})`}>
          {renderLaneList(vLanes, 'vertical')}
        </Field>
      )}

      {/* ---- Label Settings ---- */}
      {hasAnyLanes && (
        <>
          <div className="border-t border-border pt-3 mt-1" />
          <Field label="Label Font Size">
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={8}
                max={40}
                step={1}
                value={config.labelFontSize ?? 10}
                onChange={(e) => updateLabelConfig({ labelFontSize: Number(e.target.value) })}
                className="flex-1"
              />
              <span className="text-xs text-text-muted w-6 text-right">{config.labelFontSize ?? 10}</span>
            </div>
          </Field>
          <Field label="Label Rotation">
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={-90}
                max={90}
                step={15}
                value={config.labelRotation ?? 0}
                onChange={(e) => updateLabelConfig({ labelRotation: Number(e.target.value) })}
                className="flex-1"
              />
              <span className="text-xs text-text-muted w-8 text-right">{config.labelRotation ?? 0}°</span>
            </div>
          </Field>
          <Field label="Header Size">
            <button
              onClick={() => {
                const fs = config.labelFontSize ?? 10;
                const rot = config.labelRotation ?? 0;
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                ctx.font = `600 ${fs}px Inter, system-ui, sans-serif`;
                const padding = 28;

                // Calculate horizontal lane header width separately
                if (hasHLanes) {
                  let maxTextW = 0;
                  for (const l of hLanes) {
                    maxTextW = Math.max(maxTextW, ctx.measureText(l.label).width);
                  }
                  const textH = fs * 1.3; // approximate line height
                  // For horizontal lanes: header is on the LEFT. Rotation affects layout:
                  // rot=-90: text is vertical, header width = text height, lane height needs text width
                  // rot=0: text is horizontal, header width = text width
                  let hWidth: number;
                  if (rot === -90) {
                    hWidth = Math.max(48, Math.ceil(textH + padding));
                  } else if (Math.abs(rot) > 0) {
                    const radians = Math.abs(rot) * Math.PI / 180;
                    hWidth = Math.max(48, Math.ceil(
                      maxTextW * Math.abs(Math.cos(radians)) + textH * Math.abs(Math.sin(radians)) + padding
                    ));
                  } else {
                    hWidth = Math.max(48, Math.ceil(textH + padding));
                  }
                  updateLabelConfig({ hHeaderWidth: hWidth });

                  // Ensure each lane is tall enough to contain the rotated label
                  if (rot === -90) {
                    for (const l of hLanes) {
                      const lw = ctx.measureText(l.label).width;
                      const minLaneH = Math.ceil(lw + padding + 8);
                      if (l.size < minLaneH) {
                        updateLane('horizontal', l.id, { size: minLaneH });
                      }
                    }
                  } else if (Math.abs(rot) > 0) {
                    const radians = Math.abs(rot) * Math.PI / 180;
                    for (const l of hLanes) {
                      const lw = ctx.measureText(l.label).width;
                      const minLaneH = Math.ceil(
                        lw * Math.abs(Math.sin(radians)) + textH * Math.abs(Math.cos(radians)) + padding
                      );
                      if (l.size < minLaneH) {
                        updateLane('horizontal', l.id, { size: minLaneH });
                      }
                    }
                  }
                }

                // Calculate vertical lane header height separately
                if (hasVLanes) {
                  let maxTextW = 0;
                  for (const l of vLanes) {
                    maxTextW = Math.max(maxTextW, ctx.measureText(l.label).width);
                  }
                  const textH = fs * 1.3;
                  // For vertical lanes: header is on TOP. Text is usually horizontal.
                  const vHeight = Math.max(32, Math.ceil(textH + padding));
                  updateLabelConfig({ vHeaderHeight: vHeight });

                  // Ensure each lane is wide enough to contain its label
                  for (const l of vLanes) {
                    const lw = ctx.measureText(l.label).width;
                    const minLaneW = Math.ceil(lw + padding + 16);
                    if (l.size < minLaneW) {
                      updateLane('vertical', l.id, { size: minLaneW });
                    }
                  }
                }
              }}
              className="px-3 py-1.5 text-[11px] font-medium rounded-md border border-border dark:border-dk-border
                         text-text-muted hover:bg-slate-50 dark:hover:bg-dk-hover hover:text-primary transition-colors cursor-pointer w-full"
            >
              Auto-fit to Labels
            </button>
          </Field>
        </>
      )}

      {/* ---- Border Settings ---- */}
      {hasAnyLanes && (
        <>
          <div className="border-t border-border pt-3 mt-1" />
          <Field label="Container Border">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.containerBorder?.color ?? '#94a3b8'}
                  onChange={(e) => updateContainerBorder({ color: e.target.value })}
                  className="w-5 h-5 rounded border border-border cursor-pointer shrink-0"
                />
                <select
                  value={config.containerBorder?.style ?? 'solid'}
                  onChange={(e) => updateContainerBorder({ style: e.target.value as BorderStyleType })}
                  className="flex-1 px-1.5 py-1 text-xs rounded border border-border bg-white dark:bg-dk-input dark:text-dk-text dark:border-dk-border focus:outline-none"
                >
                  {BORDER_STYLE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-text-muted w-10">Width</span>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={1}
                  value={config.containerBorder?.width ?? 1}
                  onChange={(e) => updateContainerBorder({ width: Number(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-xs text-text-muted w-4 text-right">{config.containerBorder?.width ?? 1}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-text-muted w-10">Radius</span>
                <input
                  type="range"
                  min={0}
                  max={12}
                  step={1}
                  value={config.containerBorder?.radius ?? 4}
                  onChange={(e) => updateContainerBorder({ radius: Number(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-xs text-text-muted w-4 text-right">{config.containerBorder?.radius ?? 4}</span>
              </div>
            </div>
          </Field>
          <Field label="Divider Lines">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.dividerStyle?.color || '#94a3b8'}
                  onChange={(e) => updateDividerStyle({ color: e.target.value })}
                  className="w-5 h-5 rounded border border-border cursor-pointer shrink-0"
                />
                <select
                  value={config.dividerStyle?.style ?? 'solid'}
                  onChange={(e) => updateDividerStyle({ style: e.target.value as BorderStyleType })}
                  className="flex-1 px-1.5 py-1 text-xs rounded border border-border bg-white dark:bg-dk-input dark:text-dk-text dark:border-dk-border focus:outline-none"
                >
                  {BORDER_STYLE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-text-muted w-10">Width</span>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={1}
                  value={config.dividerStyle?.width ?? 1}
                  onChange={(e) => updateDividerStyle({ width: Number(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-xs text-text-muted w-4 text-right">{config.dividerStyle?.width ?? 1}</span>
              </div>
            </div>
          </Field>
        </>
      )}

      {/* Generate Lane Legend button */}
      {hasAnyLanes && (
        <div className="border-t border-border pt-3 mt-1 flex flex-col gap-2">
          <button
            onClick={() => {
              const allLanes = [...config.horizontal, ...config.vertical];
              useLegendStore.getState().generateSwimlaneLegend(allLanes);
            }}
            className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-medium
                       rounded-md border border-primary/30 text-primary hover:bg-primary/5
                       transition-colors cursor-pointer"
          >
            <ListOrdered size={14} />
            Generate Lane Legend
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-medium
                       rounded-md border border-border text-text-muted hover:bg-slate-50
                       dark:hover:bg-dk-hover dark:border-dk-border transition-colors cursor-pointer"
          >
            <Plus size={14} />
            Recreate Swimlanes
          </button>
        </div>
      )}

    </div>
  );
});

SwimlanePanel.displayName = 'SwimlanePanel';

// ---------------------------------------------------------------------------
// BulkPuckEditor — standalone puck editor shown when pucks are selected
//   without a node being selected (e.g. global "Select All" via context menu)
// ---------------------------------------------------------------------------

const BulkPuckEditor: React.FC = () => {
  const selectedPuckIds = useUIStore((s) => s.selectedPuckIds);
  const allNodes = useFlowStore((s) => s.nodes);

  // Find the first selected puck as the "representative" for displaying values
  const representativePuck = useMemo(() => {
    for (const n of allNodes) {
      const pucks = getStatusIndicators(n.data as FlowNodeData);
      const found = pucks.find((p) => selectedPuckIds.includes(p.id));
      if (found) return found;
    }
    return null;
  }, [allNodes, selectedPuckIds]);

  const handleUpdate = useCallback(
    (patch: Partial<StatusIndicator>) => {
      const store = useFlowStore.getState();
      for (const pId of selectedPuckIds) {
        for (const n of store.nodes) {
          const pucks = getStatusIndicators(n.data as FlowNodeData);
          if (pucks.some((p) => p.id === pId)) {
            store.updateStatusPuck(n.id, pId, patch);
            break;
          }
        }
      }
    },
    [selectedPuckIds],
  );

  const handleClearSelection = useCallback(() => {
    useUIStore.getState().clearPuckSelection();
  }, []);

  if (!representativePuck) return null;

  const defaultColors: Record<string, string> = {
    'not-started': '#94a3b8',
    'in-progress': '#3b82f6',
    'completed': '#10b981',
    'blocked': '#ef4444',
    'review': '#f59e0b',
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40">
        <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-800/40 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400">
          {selectedPuckIds.length}
        </span>
        <span className="text-xs font-medium text-blue-700 dark:text-blue-300 flex-1">
          {selectedPuckIds.length === 1 ? '1 puck selected' : `${selectedPuckIds.length} pucks selected`}
        </span>
        <button
          onClick={handleClearSelection}
          className="p-0.5 rounded text-blue-400 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-800/30 transition-colors cursor-pointer"
          data-tooltip-left="Clear selection"
        >
          <X size={14} />
        </button>
      </div>

      {/* Status */}
      <Field label="Status">
        <select
          value={representativePuck.status || 'not-started'}
          onChange={(e) => {
            const status = e.target.value as StatusIndicator['status'];
            handleUpdate({ status, color: defaultColors[status] || '#94a3b8' });
          }}
          className="w-full px-2 py-1.5 text-sm rounded border border-border bg-white dark:bg-dk-input dark:text-dk-text dark:border-dk-border
                     focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        >
          <option value="not-started">Not Started</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="blocked">Blocked</option>
          <option value="review">Review</option>
        </select>
      </Field>

      {/* Color */}
      <Field label="Color">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={representativePuck.color || '#94a3b8'}
            onChange={(e) => handleUpdate({ color: e.target.value })}
            className="w-8 h-8 rounded border border-border cursor-pointer"
          />
          <input
            type="text"
            value={representativePuck.color || '#94a3b8'}
            onChange={(e) => handleUpdate({ color: e.target.value })}
            className="flex-1 px-2 py-1.5 text-xs font-mono rounded border border-border bg-white dark:bg-dk-input dark:text-dk-text dark:border-dk-border
                       focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
      </Field>

      {/* Size */}
      <Field label="Size">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={8}
            max={20}
            step={1}
            value={representativePuck.size || 12}
            onChange={(e) => handleUpdate({ size: Number(e.target.value) })}
            className="flex-1 accent-primary"
          />
          <span className="text-xs text-text-muted w-8 text-right font-mono">
            {representativePuck.size || 12}px
          </span>
        </div>
      </Field>

      {/* Position */}
      <Field label="Position">
        <div className="grid grid-cols-4 gap-1">
          {([
            { value: 'top-left', label: 'TL' },
            { value: 'top-right', label: 'TR' },
            { value: 'bottom-left', label: 'BL' },
            { value: 'bottom-right', label: 'BR' },
          ] as const).map((pos) => (
            <button
              key={pos.value}
              onClick={() => handleUpdate({ position: pos.value })}
              className={`
                py-1.5 text-[10px] font-semibold rounded border transition-colors cursor-pointer
                ${(representativePuck.position || 'top-right') === pos.value
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'border-border text-text-muted hover:bg-slate-50 dark:hover:bg-dk-hover'
                }
              `}
            >
              {pos.label}
            </button>
          ))}
        </div>
      </Field>

      {/* Icon */}
      <Field label="Icon">
        <select
          value={representativePuck.icon || ''}
          onChange={(e) => handleUpdate({ icon: e.target.value || undefined })}
          className="w-full px-2 py-1.5 text-sm rounded border border-border bg-white dark:bg-dk-input dark:text-dk-text dark:border-dk-border
                     focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        >
          <option value="">Default (Auto)</option>
          <option value="blank">Blank (No Icon)</option>
          <option value="Check">Checkmark</option>
          <option value="Clock">Clock</option>
          <option value="X">X Mark</option>
          <option value="Eye">Eye</option>
          <option value="AlertTriangle">Warning</option>
          <option value="Star">Star</option>
          <option value="Heart">Heart</option>
          <option value="Flag">Flag</option>
          <option value="Zap">Lightning</option>
          <option value="ThumbsUp">Thumbs Up</option>
          <option value="ThumbsDown">Thumbs Down</option>
          <option value="Circle">Circle</option>
          <option value="Square">Square</option>
          <option value="Bell">Bell</option>
          <option value="Bookmark">Bookmark</option>
          <option value="Pin">Pin</option>
        </select>
      </Field>

      {/* Border Color */}
      <Field label="Border Color">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={representativePuck.borderColor || '#000000'}
            onChange={(e) => handleUpdate({ borderColor: e.target.value })}
            className="w-8 h-8 rounded border border-border cursor-pointer"
          />
          <input
            type="text"
            value={representativePuck.borderColor || '#000000'}
            onChange={(e) => handleUpdate({ borderColor: e.target.value })}
            className="flex-1 px-2 py-1.5 text-xs font-mono rounded border border-border bg-white dark:bg-dk-input dark:text-dk-text dark:border-dk-border
                       focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
      </Field>

      {/* Border Width */}
      <Field label="Border Width">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={4}
            step={0.5}
            value={representativePuck.borderWidth ?? 1}
            onChange={(e) => handleUpdate({ borderWidth: Number(e.target.value) })}
            className="flex-1 accent-primary"
          />
          <span className="text-xs text-text-muted w-8 text-right font-mono">
            {representativePuck.borderWidth ?? 1}px
          </span>
        </div>
      </Field>

      {/* Border Style */}
      <Field label="Border Style">
        <div className="flex items-center gap-1">
          {(['solid', 'dashed', 'dotted', 'none'] as const).map((style) => (
            <button
              key={style}
              onClick={() => handleUpdate({ borderStyle: style })}
              className={`flex-1 py-1.5 text-xs font-medium rounded border transition-colors cursor-pointer
                ${(representativePuck.borderStyle || 'solid') === style
                  ? 'bg-blue-50 border-blue-300 text-blue-600 dark:bg-blue-800/15 dark:border-blue-500/50 dark:text-blue-400'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-dk-border dark:text-dk-muted dark:hover:bg-dk-hover'
                }`}
            >
              {style.charAt(0).toUpperCase() + style.slice(1)}
            </button>
          ))}
        </div>
      </Field>

      {/* Delete selected pucks */}
      <button
        onClick={() => {
          const store = useFlowStore.getState();
          for (const pId of selectedPuckIds) {
            for (const n of store.nodes) {
              const pucks = getStatusIndicators(n.data as FlowNodeData);
              if (pucks.some((p) => p.id === pId)) {
                store.removeStatusPuck(n.id, pId);
                break;
              }
            }
          }
          useUIStore.getState().clearPuckSelection();
        }}
        className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-medium rounded border
                   border-red-200 text-red-500 hover:bg-red-50 dark:border-red-700/40 dark:text-red-400
                   dark:hover:bg-red-900/20 transition-colors cursor-pointer mt-1"
      >
        <Trash2 size={12} />
        Delete {selectedPuckIds.length > 1 ? `${selectedPuckIds.length} pucks` : 'puck'}
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main PropertiesPanel
// ---------------------------------------------------------------------------

const PropertiesPanel: React.FC = () => {
  const darkMode = useStyleStore((s) => s.darkMode);
  const activePanelTab = useUIStore((s) => s.activePanelTab);
  const setActivePanelTab = useUIStore((s) => s.setActivePanelTab);
  const propertiesPanelOpen = useUIStore((s) => s.propertiesPanelOpen);
  const togglePropertiesPanel = useUIStore((s) => s.togglePropertiesPanel);

  // Selection
  const selectedNodes = useFlowStore((s) => s.selectedNodes);
  const selectedEdges = useFlowStore((s) => s.selectedEdges);
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);

  // Find the first selected node (skip connector endpoint nodes)
  const selectedNode = useMemo(() => {
    if (selectedNodes.length === 0) return null;
    const node = nodes.find((n) => n.id === selectedNodes[0]) ?? null;
    if (node?.data.isConnectorEndpoint) return null;
    return node;
  }, [selectedNodes, nodes]);

  // Find the first selected edge
  const selectedEdge = useMemo(() => {
    if (selectedEdges.length === 0) return null;
    return edges.find((e) => e.id === selectedEdges[0]) ?? null;
  }, [selectedEdges, edges]);

  // Puck selection state
  const selectedPuckIds = useUIStore((s) => s.selectedPuckIds);

  // Toggle-all-sections signals (counter-based; child components react to changes)
  const [nodeToggleSignal, setNodeToggleSignal] = useState(0);
  const [edgeToggleSignal, setEdgeToggleSignal] = useState(0);

  // Auto-switch panel tab when selection changes (not on manual tab switch)
  const swimlaneSelected = useSwimlaneStore((s) => s.containers.some((c) => c.selected));
  const prevSelRef = useRef({ nodes: selectedNodes.length, edges: selectedEdges.length, swimlane: false });
  useEffect(() => {
    const prev = prevSelRef.current;
    const changed = selectedNodes.length !== prev.nodes || selectedEdges.length !== prev.edges || swimlaneSelected !== prev.swimlane;
    prevSelRef.current = { nodes: selectedNodes.length, edges: selectedEdges.length, swimlane: swimlaneSelected };
    if (!changed) return;
    // Check if all selected nodes are connector endpoints (treat as edge selection)
    const allEndpoints = selectedNodes.length > 0 && selectedNodes.every(id => {
      const n = nodes.find(nn => nn.id === id);
      return n?.data.isConnectorEndpoint;
    });
    if (swimlaneSelected && selectedNodes.length === 0 && selectedEdges.length === 0) {
      setActivePanelTab('lane');
    } else if (selectedEdges.length > 0 || allEndpoints) {
      setActivePanelTab('edge');
    } else if (selectedNodes.length > 0) {
      setActivePanelTab('node');
    }
  }, [selectedEdges.length, selectedNodes, nodes, swimlaneSelected, activePanelTab, setActivePanelTab]);

  return (
    <div className="flex shrink-0">
      {/* Toggle — sits in a zero-width gutter before the panel; button extends left over canvas */}
      <div className="relative w-0 self-stretch shrink-0">
        <button
          onClick={togglePropertiesPanel}
          style={{ left: '-20px', top: '50%', transform: 'translateY(-50%)' }}
          className={`
            absolute z-20
            flex items-center justify-center w-5 h-8
            rounded-l cursor-pointer
            transition-colors duration-150 opacity-40 hover:opacity-100
            ${darkMode
              ? 'text-dk-muted hover:bg-dk-hover/90 hover:text-dk-text'
              : 'text-slate-400 hover:bg-white/90 hover:text-slate-600 hover:shadow-sm'
            }
          `}
          data-tooltip-left={propertiesPanelOpen ? 'Collapse panel' : 'Expand panel'}
        >
          {propertiesPanelOpen
            ? <ChevronsRight size={14} />
            : <ChevronsLeft size={14} />
          }
        </button>
      </div>

      {propertiesPanelOpen && (
    <div
      className={`
        flex flex-col w-[280px] shrink-0 border-l overflow-hidden
        ${darkMode
          ? 'bg-surface-alt-dark border-border-dark'
          : 'bg-surface-alt border-border'
        }
      `}
    >
      {/* Tab bar */}
      <div className="flex border-b border-inherit shrink-0">
        {TABS.map((tab) => {
          const isActive = activePanelTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (isActive && tab.collapsible) {
                  if (tab.id === 'node') setNodeToggleSignal((s) => s + 1);
                  if (tab.id === 'edge') setEdgeToggleSignal((s) => s + 1);
                } else {
                  setActivePanelTab(tab.id);
                }
              }}
              className={`
                flex-1 py-2 text-[11px] font-medium tracking-wide uppercase
                transition-colors cursor-pointer
                ${isActive
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-text-muted hover:text-text'
                }
              `}
            >
              <span className="flex items-center justify-center gap-1">
                {isActive && tab.collapsible && (
                  <ChevronDown size={12} className="transition-transform" />
                )}
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Multi-selection banner */}
      {(selectedNodes.length > 1 || selectedEdges.length > 1) && (
        <div className={`flex items-center gap-2 px-4 py-1.5 text-[11px] font-medium border-b shrink-0 ${
          darkMode
            ? 'bg-primary/10 border-dk-border text-primary'
            : 'bg-primary/5 border-primary/20 text-primary'
        }`}>
          <Copy size={12} />
          {selectedNodes.length > 1 && `${selectedNodes.length} nodes`}
          {selectedNodes.length > 1 && selectedEdges.length > 1 && ', '}
          {selectedEdges.length > 1 && `${selectedEdges.length} edges`}
          {' '}selected — changes apply to all
        </div>
      )}

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto panel-scroll p-4 pb-8">
        {!selectedNode && activePanelTab === 'node' && selectedPuckIds.length > 0 ? (
          <BulkPuckEditor />
        ) : !selectedNode && activePanelTab === 'node' ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-12">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-dk-hover flex items-center justify-center">
              <ChevronRight size={20} className="text-text-muted" />
            </div>
            <p className="text-sm text-text-muted leading-relaxed">
              Select a node or connector to edit its properties
            </p>
          </div>
        ) : activePanelTab === 'node' && selectedNode ? (
          <NodePropsTab
            nodeId={selectedNode.id}
            data={selectedNode.data as FlowNodeData}
            nodeType={selectedNode.type}
            toggleAllSignal={nodeToggleSignal}
          />
        ) : activePanelTab === 'edge' ? (
          selectedEdge ? (
            <EdgePropertiesTab
              edgeId={selectedEdge.id}
              edgeData={(selectedEdge.data || {}) as FlowEdgeData}
              edgeType={selectedEdge.type}
              selectedEdgeIds={selectedEdges}
              toggleAllSignal={edgeToggleSignal}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-12">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                <ChevronRight size={20} className="text-text-muted" />
              </div>
              <p className="text-sm text-text-muted leading-relaxed">
                Select a connector to edit its properties
              </p>
            </div>
          )
        ) : activePanelTab === 'deps' ? (
          selectedNode ? (
            <DependencyPanel
              nodeId={selectedNode.id}
              data={selectedNode.data as FlowNodeData}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-12">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                <ChevronRight size={20} className="text-text-muted" />
              </div>
              <p className="text-sm text-text-muted leading-relaxed">
                Select a node to view its dependencies
              </p>
            </div>
          )
        ) : activePanelTab === 'lane' ? (
          <SwimlanePanel />
        ) : activePanelTab === 'data' ? (
          selectedNode ? (
            <DataTab
              nodeId={selectedNode.id}
              data={selectedNode.data as FlowNodeData}
              position={selectedNode.position}
              measured={selectedNode.measured}
            />
          ) : selectedEdge ? (
            <EdgeDataTab
              edgeId={selectedEdge.id}
              data={(selectedEdge.data || {}) as FlowEdgeData}
              source={selectedEdge.source}
              target={selectedEdge.target}
              type={selectedEdge.type}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-12">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                <ChevronRight size={20} className="text-text-muted" />
              </div>
              <p className="text-sm text-text-muted leading-relaxed">
                Select a node or edge to view its metadata
              </p>
            </div>
          )
        ) : (
          <PlaceholderTab name="Data" />
        )}
      </div>
    </div>
      )}

    </div>
  );
};

export default React.memo(PropertiesPanel);
