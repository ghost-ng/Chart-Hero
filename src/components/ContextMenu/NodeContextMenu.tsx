import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useMenuPosition, SubMenu, ColorSwatchSidebar } from './menuUtils';
import {
  Pencil,
  Copy,
  CopyPlus,
  Trash2,
  ArrowDownToLine,
  ArrowUpToLine,
  ChevronDown,
  ChevronUp,
  Layers,
  Shapes,
  Palette,
  Ungroup,
  Circle,
  MousePointerClick,
  Unlink,
  AlignLeft,
  AlignCenterHorizontal,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  Type,
  StickyNote,
  RotateCcw,
  Square,
  SquareDashed,
  AArrowDown,
} from 'lucide-react';

import { useStyleStore } from '../../store/styleStore';
import { useUIStore } from '../../store/uiStore';
import type { NodeShape, StatusIndicator, FlowNodeData } from '../../store/flowStore';
import { useFlowStore, newPuckId } from '../../store/flowStore';
import * as alignment from '../../utils/alignmentUtils';
import { resolveActivePalette } from '../../styles/palettes';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NodeContextMenuProps {
  /** Pixel position of the menu (screen coords) */
  x: number;
  y: number;
  /** ID of the right-clicked node */
  nodeId: string;
  /** Close callback */
  onClose: () => void;
  /** Start inline editing of the node label */
  onEditLabel: () => void;
  /** Duplicate the node */
  onDuplicate: () => void;
  /** Copy the node to clipboard */
  onCopy: () => void;
  /** Delete the node */
  onDelete: () => void;
  /** Change the node shape */
  onChangeShape: (shape: NodeShape) => void;
  /** Change the node color */
  onChangeColor: (color: string) => void;
  /** Send the node to back (lowest z-index) */
  onSendToBack: () => void;
  /** Bring the node to front (highest z-index) */
  onBringToFront: () => void;
  /** Send the node backward one step */
  onSendBackward: () => void;
  /** Bring the node forward one step */
  onBringForward: () => void;
  /** Whether the right-clicked node is a group node */
  isGroupNode?: boolean;
  /** Ungroup a group node (release children) */
  onUngroup?: () => void;
  /** Align selected nodes using an alignment function */
  onAlign?: (fn: (nodes: any[]) => Map<string, {x: number; y: number}>) => void;
  /** Whether multiple nodes are currently selected */
  hasMultipleSelected?: boolean;
  /** Whether the node is part of a link group */
  isInLinkGroup?: boolean;
  /** Open the link group editor for this node's group */
  onEditLinkGroup?: () => void;
  /** Whether the node is inside a visual group (has parentId) */
  isInVisualGroup?: boolean;
  /** Remove the node from its visual group */
  onRemoveFromVisualGroup?: () => void;
  /** Remove the node from its link group */
  onRemoveFromLinkGroup?: () => void;
}

// ---------------------------------------------------------------------------
// Shape options
// ---------------------------------------------------------------------------

const shapeOptions: { value: NodeShape; label: string }[] = [
  { value: 'rectangle', label: 'Rectangle' },
  { value: 'roundedRectangle', label: 'Rounded Rect' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'circle', label: 'Circle' },
  { value: 'parallelogram', label: 'Parallelogram' },
  { value: 'hexagon', label: 'Hexagon' },
  { value: 'document', label: 'Document' },
  { value: 'cloud', label: 'Cloud' },
];

// Fallback colors when no palette is selected
const defaultQuickColors = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#6b7280', '#f97316', '#14b8a6',
];

const fontOptions: { label: string; value: string }[] = [
  { label: 'Inter', value: "Inter, system-ui, sans-serif" },
  { label: 'Aptos', value: "Aptos, Calibri, sans-serif" },
  { label: 'Calibri', value: "Calibri, 'Gill Sans', sans-serif" },
  { label: 'Segoe UI', value: "'Segoe UI', Tahoma, sans-serif" },
  { label: 'Arial', value: "Arial, Helvetica, sans-serif" },
  { label: 'Franklin Gothic', value: "'Franklin Gothic Medium', 'Franklin Gothic', Arial, sans-serif" },
  { label: 'Franklin Gothic Book', value: "'Franklin Gothic Book', 'Franklin Gothic', Arial, sans-serif" },
  { label: 'Verdana', value: "Verdana, Geneva, sans-serif" },
  { label: 'Georgia', value: "Georgia, 'Times New Roman', serif" },
  { label: 'Times New Roman', value: "'Times New Roman', Times, serif" },
  { label: 'Consolas', value: "Consolas, 'Courier New', monospace" },
  { label: 'Comic Sans MS', value: "'Comic Sans MS', cursive, sans-serif" },
];

const statusOptions: { value: StatusIndicator['status']; label: string; color: string }[] = [
  { value: 'none', label: 'None', color: 'transparent' },
  { value: 'not-started', label: 'Not Started', color: '#94a3b8' },
  { value: 'in-progress', label: 'In Progress', color: '#3b82f6' },
  { value: 'completed', label: 'Completed', color: '#10b981' },
  { value: 'blocked', label: 'Blocked', color: '#ef4444' },
  { value: 'review', label: 'Review', color: '#f59e0b' },
];

// ---------------------------------------------------------------------------
// Shared components
// ---------------------------------------------------------------------------

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  darkMode: boolean;
  hasSubmenu?: boolean;
  shortcut?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  label,
  onClick,
  disabled,
  darkMode,
  hasSubmenu,
  shortcut,
  onMouseEnter,
  onMouseLeave,
}) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      if (!disabled) onClick();
    }}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    disabled={disabled}
    className={`
      flex items-center gap-2 w-full px-2.5 py-1 text-left text-xs rounded
      transition-colors duration-75 cursor-pointer
      disabled:opacity-40 disabled:cursor-not-allowed
      ${darkMode
        ? 'hover:bg-dk-hover text-dk-text'
        : 'hover:bg-slate-100 text-slate-700'
      }
    `}
  >
    <span className="shrink-0 w-3.5 h-3.5 flex items-center justify-center text-slate-400 dark:text-dk-faint">
      {icon}
    </span>
    <span className="flex-1">{label}</span>
    {shortcut && (
      <span className="text-[9px] text-slate-400 dark:text-dk-faint ml-auto font-mono">{shortcut}</span>
    )}
    {hasSubmenu && (
      <span className="text-slate-400 dark:text-dk-faint text-[10px] ml-1.5">&rsaquo;</span>
    )}
  </button>
);

const MenuDivider: React.FC<{ darkMode: boolean }> = ({ darkMode }) => (
  <div className={`my-1 h-px ${darkMode ? 'bg-dk-hover' : 'bg-slate-200'}`} />
);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const NodeContextMenu: React.FC<NodeContextMenuProps> = ({
  x,
  y,
  nodeId,
  onClose,
  onEditLabel,
  onDuplicate,
  onCopy,
  onDelete,
  onChangeShape,
  onChangeColor,
  onSendToBack,
  onBringToFront,
  onSendBackward,
  onBringForward,
  isGroupNode,
  onUngroup,
  onAlign,
  hasMultipleSelected,
  isInLinkGroup,
  onEditLinkGroup: _onEditLinkGroup,
  isInVisualGroup,
  onRemoveFromVisualGroup,
  onRemoveFromLinkGroup,
}) => {
  const darkMode = useStyleStore((s) => s.darkMode);
  const activeStyleId = useStyleStore((s) => s.activeStyleId);
  const activePaletteId = useStyleStore((s) => s.activePaletteId);
  const quickColors = resolveActivePalette(activePaletteId, activeStyleId).colors ?? defaultQuickColors;
  const menuRef = useRef<HTMLDivElement>(null);
  const [submenu, setSubmenu] = useState<'shape' | 'status' | 'align' | 'select' | 'font' | 'fontSize' | 'borderWidth' | 'borderStyle' | null>(null);

  // Close on click-outside or Escape (but not when clicking the color sidebar)
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest?.('[data-color-sidebar]')) return;
      if (menuRef.current && !menuRef.current.contains(target)) {
        onClose();
      }
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

  const menuStyle = useMenuPosition(x, y, menuRef);

  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const currentFontSize = useFlowStore((s) => {
    const n = s.nodes.find(nd => nd.id === nodeId);
    return (n?.data as FlowNodeData | undefined)?.fontSize as number || 14;
  });
  const currentBorderWidth = useFlowStore((s) => {
    const n = s.nodes.find(nd => nd.id === nodeId);
    return (n?.data as FlowNodeData | undefined)?.borderWidth as number ?? 2;
  });
  const currentBorderStyle = useFlowStore((s) => {
    const n = s.nodes.find(nd => nd.id === nodeId);
    return (n?.data as FlowNodeData | undefined)?.borderStyle || 'solid';
  });
  const currentFillOpacity = useFlowStore((s) => {
    const n = s.nodes.find(nd => nd.id === nodeId);
    return (n?.data as FlowNodeData | undefined)?.fillOpacity ?? 1;
  });
  const currentBorderOpacity = useFlowStore((s) => {
    const n = s.nodes.find(nd => nd.id === nodeId);
    return (n?.data as FlowNodeData | undefined)?.borderOpacity ?? 1;
  });
  const handleSetStatus = useCallback((status: StatusIndicator['status']) => {
    if (status === 'none') {
      // Remove all pucks
      updateNodeData(nodeId, { statusIndicators: [], statusIndicator: undefined });
    } else {
      const defaultColors: Record<string, string> = {
        'not-started': '#94a3b8',
        'in-progress': '#3b82f6',
        'completed': '#10b981',
        'blocked': '#ef4444',
        'review': '#f59e0b',
      };
      // Import newPuckId from flowStore
      const { addStatusPuck } = useFlowStore.getState();
      addStatusPuck(nodeId, {
        id: newPuckId(),
        status,
        color: defaultColors[status],
        size: 12,
        position: 'top-right',
      });
    }
    onClose();
  }, [nodeId, onClose]);

  const handleResetToTheme = useCallback(() => {
    const node = useFlowStore.getState().nodes.find((n) => n.id === nodeId);
    const isTextbox = (node?.data as FlowNodeData | undefined)?.shape === 'textbox';
    useFlowStore.getState().updateNodeData(nodeId, {
      color: isTextbox ? 'transparent' : undefined,
      borderColor: isTextbox ? 'transparent' : undefined,
      borderWidth: undefined,
      textColor: undefined,
      fontFamily: undefined,
      fontSize: undefined,
      fontWeight: undefined,
    });
    onClose();
  }, [nodeId, onClose]);

  return (
    <div ref={menuRef} style={menuStyle} className="relative">
      {/* Main menu */}
      <div
        className={`
          min-w-[180px] rounded-lg shadow-xl border p-1
          ${darkMode ? 'bg-dk-panel border-dk-border' : 'bg-white border-slate-200'}
        `}
      >
        {/* Quick actions row: Edit, Copy, Duplicate, Notes, Reset */}
        <div className="flex items-center gap-0.5 px-1 py-0.5" onMouseEnter={() => setSubmenu(null)}>
          {[
            { icon: <Pencil size={13} />, tooltip: 'Edit Label\nF2', onClick: () => { onEditLabel(); onClose(); } },
            { icon: <Copy size={13} />, tooltip: 'Copy\nCtrl+C', onClick: () => { onCopy(); onClose(); } },
            { icon: <CopyPlus size={13} />, tooltip: 'Duplicate\nCtrl+D', onClick: () => { onDuplicate(); onClose(); } },
            { icon: <StickyNote size={13} />, tooltip: 'Notes', onClick: () => {
              useUIStore.getState().setActivePanelTab('data');
              useUIStore.getState().setPropertiesPanelOpen(true);
              onClose();
              setTimeout(() => {
                const textarea = document.getElementById('node-notes-textarea');
                if (textarea) textarea.focus();
              }, 100);
            }},
            ...(activeStyleId ? [{ icon: <RotateCcw size={13} />, tooltip: 'Reset to Theme', onClick: handleResetToTheme }] : []),
          ].map(({ icon, tooltip, onClick }) => (
            <button
              key={tooltip}
              data-tooltip={tooltip}
              onClick={(e) => { e.stopPropagation(); onClick(); }}
              className={`
                flex items-center justify-center w-7 h-7 rounded cursor-pointer
                transition-colors duration-75
                ${darkMode ? 'hover:bg-dk-hover text-dk-faint hover:text-dk-text' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'}
              `}
            >
              {icon}
            </button>
          ))}
        </div>

        <MenuDivider darkMode={darkMode} />

        {/* 5. Change Shape submenu */}
        <div className="relative" onMouseLeave={() => setSubmenu(null)}>
          <MenuItem
            icon={<Shapes size={14} />}
            label="Change Shape"
            onClick={() => setSubmenu(submenu === 'shape' ? null : 'shape')}
            darkMode={darkMode}
            hasSubmenu
            onMouseEnter={() => setSubmenu('shape')}
          />
          {submenu === 'shape' && (
            <SubMenu darkMode={darkMode} className="p-1 min-w-[160px]">
              {shapeOptions.map(({ value, label }) => (
                <MenuItem
                  key={value}
                  icon={<Shapes size={14} />}
                  label={label}
                  onClick={() => { onChangeShape(value); onClose(); }}
                  darkMode={darkMode}
                />
              ))}
            </SubMenu>
          )}
        </div>

        {/* 6. Add Status submenu */}
        <div className="relative" onMouseLeave={() => setSubmenu(null)}>
          <MenuItem
            icon={<Circle size={14} />}
            label="Add Status"
            onClick={() => setSubmenu(submenu === 'status' ? null : 'status')}
            darkMode={darkMode}
            hasSubmenu
            onMouseEnter={() => setSubmenu('status')}
          />
          {submenu === 'status' && (
            <SubMenu darkMode={darkMode} className="p-1 min-w-[160px]">
              {statusOptions.map(({ value, label, color }) => (
                <button
                  key={value}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSetStatus(value);
                  }}
                  className={`
                    flex items-center gap-2 w-full px-2.5 py-1 text-left text-xs rounded
                    transition-colors duration-75 cursor-pointer
                    ${darkMode ? 'hover:bg-dk-hover text-dk-text' : 'hover:bg-slate-100 text-slate-700'}
                  `}
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0 border"
                    style={{ backgroundColor: color, borderColor: color === 'transparent' ? '#94a3b8' : color }}
                  />
                  <span>{label}</span>
                </button>
              ))}
            </SubMenu>
          )}
        </div>

        {/* 7. Change Font submenu */}
        <div className="relative" onMouseLeave={() => setSubmenu(null)}>
          <MenuItem
            icon={<Type size={14} />}
            label="Change Font"
            onClick={() => setSubmenu(submenu === 'font' ? null : 'font')}
            darkMode={darkMode}
            hasSubmenu
            onMouseEnter={() => setSubmenu('font')}
          />
          {submenu === 'font' && (
            <SubMenu darkMode={darkMode} className="p-1 min-w-[200px] max-h-[300px] overflow-y-auto">
              {fontOptions.map(({ label, value }) => {
                const node = useFlowStore.getState().nodes.find((n) => n.id === nodeId);
                const currentFont = node?.data?.fontFamily || '';
                const isActive = currentFont === value;
                return (
                  <button
                    key={value}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateNodeData(nodeId, { fontFamily: value });
                      onClose();
                    }}
                    className={`
                      flex items-center gap-2 w-full px-2.5 py-1 text-left text-xs rounded
                      transition-colors duration-75 cursor-pointer
                      ${isActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : darkMode ? 'hover:bg-dk-hover text-dk-text' : 'hover:bg-slate-100 text-slate-700'
                      }
                    `}
                  >
                    <span className="text-xs w-[20px] text-center flex-shrink-0" style={{ fontFamily: value }}>Aa</span>
                    <span style={{ fontFamily: value }}>{label}</span>
                    {isActive && <span className="ml-auto text-primary text-[10px]">&#10003;</span>}
                  </button>
                );
              })}
            </SubMenu>
          )}
        </div>

        {/* Label Font Size submenu */}
        <div className="relative" onMouseLeave={() => setSubmenu(null)}>
          <MenuItem
            icon={<AArrowDown size={14} />}
            label="Label Font Size"
            onClick={() => setSubmenu(submenu === 'fontSize' ? null : 'fontSize')}
            darkMode={darkMode}
            hasSubmenu
            onMouseEnter={() => setSubmenu('fontSize')}
          />
          {submenu === 'fontSize' && (
            <SubMenu darkMode={darkMode} className="p-2 min-w-[160px]">
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={6}
                  max={32}
                  value={currentFontSize}
                  onChange={(e) => {
                    updateNodeData(nodeId, { fontSize: Number(e.target.value) });
                  }}
                  className="flex-1 h-3 cursor-pointer accent-primary"
                />
                <span className={`text-xs w-8 text-right tabular-nums ${darkMode ? 'text-dk-muted' : 'text-slate-500'}`}>
                  {currentFontSize}px
                </span>
              </div>
            </SubMenu>
          )}
        </div>

        {/* Border Size submenu */}
        <div className="relative" onMouseLeave={() => setSubmenu(null)}>
          <MenuItem
            icon={<Square size={14} />}
            label="Border Size"
            onClick={() => setSubmenu(submenu === 'borderWidth' ? null : 'borderWidth')}
            darkMode={darkMode}
            hasSubmenu
            onMouseEnter={() => setSubmenu('borderWidth')}
          />
          {submenu === 'borderWidth' && (
            <SubMenu darkMode={darkMode} className="p-2 min-w-[160px]">
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={currentBorderWidth}
                  onChange={(e) => {
                    updateNodeData(nodeId, { borderWidth: Number(e.target.value) });
                  }}
                  className="flex-1 h-3 cursor-pointer accent-primary"
                />
                <span className={`text-xs w-8 text-right tabular-nums ${darkMode ? 'text-dk-muted' : 'text-slate-500'}`}>
                  {currentBorderWidth}px
                </span>
              </div>
            </SubMenu>
          )}
        </div>

        {/* Border Type submenu */}
        <div className="relative" onMouseLeave={() => setSubmenu(null)}>
          <MenuItem
            icon={<SquareDashed size={14} />}
            label="Border Type"
            onClick={() => setSubmenu(submenu === 'borderStyle' ? null : 'borderStyle')}
            darkMode={darkMode}
            hasSubmenu
            onMouseEnter={() => setSubmenu('borderStyle')}
          />
          {submenu === 'borderStyle' && (
            <SubMenu darkMode={darkMode} className="p-1 min-w-[140px]">
              {([
                { value: 'solid', label: 'Solid' },
                { value: 'dashed', label: 'Dashed' },
                { value: 'dotted', label: 'Dotted' },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateNodeData(nodeId, { borderStyle: opt.value });
                    onClose();
                  }}
                  className={`
                    flex items-center gap-2 w-full px-2.5 py-1 text-left text-xs rounded
                    transition-colors duration-75 cursor-pointer
                    ${opt.value === currentBorderStyle
                      ? 'bg-primary/10 text-primary font-medium'
                      : darkMode ? 'hover:bg-dk-hover text-dk-text' : 'hover:bg-slate-100 text-slate-700'
                    }
                  `}
                >
                  <span className="w-8 flex items-center">
                    <span
                      className="w-full h-0 border-t-2"
                      style={{
                        borderStyle: opt.value,
                        borderColor: darkMode ? '#94a3b8' : '#475569',
                      }}
                    />
                  </span>
                  <span>{opt.label}</span>
                  {opt.value === currentBorderStyle && <span className="ml-auto text-primary text-[10px]">&#10003;</span>}
                </button>
              ))}
            </SubMenu>
          )}
        </div>

        <MenuDivider darkMode={darkMode} />

        {/* 9. Align submenu (conditional) */}
        {hasMultipleSelected && (
          <div className="relative" onMouseLeave={() => setSubmenu(null)}>
            <MenuItem
              icon={<AlignLeft size={14} />}
              label="Align"
              onClick={() => setSubmenu(submenu === 'align' ? null : 'align')}
              darkMode={darkMode}
              hasSubmenu
              onMouseEnter={() => setSubmenu('align')}
            />
            {submenu === 'align' && onAlign && (
              <SubMenu darkMode={darkMode} className="p-1 min-w-[200px]">
                <MenuItem icon={<AlignLeft size={14} />} label="Align Left" shortcut="Alt+L" onClick={() => { onAlign(alignment.alignLeft); onClose(); }} darkMode={darkMode} />
                <MenuItem icon={<AlignCenterVertical size={14} />} label="Align Center" shortcut="Alt+C" onClick={() => { onAlign(alignment.alignCenterH); onClose(); }} darkMode={darkMode} />
                <MenuItem icon={<AlignRight size={14} />} label="Align Right" shortcut="Alt+R" onClick={() => { onAlign(alignment.alignRight); onClose(); }} darkMode={darkMode} />
                <MenuDivider darkMode={darkMode} />
                <MenuItem icon={<AlignStartVertical size={14} />} label="Align Top" shortcut="Alt+T" onClick={() => { onAlign(alignment.alignTop); onClose(); }} darkMode={darkMode} />
                <MenuItem icon={<AlignCenterHorizontal size={14} />} label="Align Middle" shortcut="Alt+M" onClick={() => { onAlign(alignment.alignCenterV); onClose(); }} darkMode={darkMode} />
                <MenuItem icon={<AlignEndVertical size={14} />} label="Align Bottom" shortcut="Alt+B" onClick={() => { onAlign(alignment.alignBottom); onClose(); }} darkMode={darkMode} />
              </SubMenu>
            )}
          </div>
        )}

        {/* 10. Order — inline icon row */}
        <div className="flex items-center gap-0.5 px-1 py-0.5" onMouseEnter={() => setSubmenu(null)}>
          <span className={`text-[10px] mr-0.5 ${darkMode ? 'text-dk-faint' : 'text-slate-400'}`}>
            <Layers size={12} />
          </span>
          {[
            { icon: <ChevronUp size={13} />, tooltip: 'Forward\nCtrl+]', onClick: () => { onBringForward(); } },
            { icon: <ChevronDown size={13} />, tooltip: 'Backward\nCtrl+[', onClick: () => { onSendBackward(); } },
            { icon: <ArrowUpToLine size={13} />, tooltip: 'Front\nCtrl+Shift+]', onClick: () => { onBringToFront(); } },
            { icon: <ArrowDownToLine size={13} />, tooltip: 'Back\nCtrl+Shift+[', onClick: () => { onSendToBack(); } },
          ].map(({ icon, tooltip, onClick }) => (
            <button
              key={tooltip}
              data-tooltip={tooltip}
              onClick={(e) => { e.stopPropagation(); onClick(); }}
              className={`
                flex items-center justify-center w-7 h-7 rounded cursor-pointer
                transition-colors duration-75
                ${darkMode ? 'hover:bg-dk-hover text-dk-faint hover:text-dk-text' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'}
              `}
            >
              {icon}
            </button>
          ))}
        </div>

        <MenuDivider darkMode={darkMode} />

        {/* 12. Select submenu */}
        <div className="relative" onMouseLeave={() => setSubmenu(null)}>
          <MenuItem
            icon={<MousePointerClick size={14} />}
            label="Select"
            onClick={() => setSubmenu(submenu === 'select' ? null : 'select')}
            darkMode={darkMode}
            hasSubmenu
            onMouseEnter={() => setSubmenu('select')}
          />
          {submenu === 'select' && (
            <SubMenu darkMode={darkMode} className="p-1 min-w-[180px]">
              <MenuItem
                icon={<Shapes size={14} />}
                label="Same Shape"
                onClick={() => {
                  const { nodes, setSelectedNodes } = useFlowStore.getState();
                  const sourceNode = nodes.find((n) => n.id === nodeId);
                  if (!sourceNode) return;
                  const ids = nodes.filter((n) => n.data.shape === sourceNode.data.shape).map((n) => n.id);
                  setSelectedNodes(ids);
                  onClose();
                }}
                darkMode={darkMode}
              />
              <MenuItem
                icon={<Palette size={14} />}
                label="Same Color"
                onClick={() => {
                  const { nodes, setSelectedNodes } = useFlowStore.getState();
                  const sourceNode = nodes.find((n) => n.id === nodeId);
                  if (!sourceNode) return;
                  const srcColor = sourceNode.data.color || '#3b82f6';
                  const ids = nodes.filter((n) => (n.data.color || '#3b82f6') === srcColor).map((n) => n.id);
                  setSelectedNodes(ids);
                  onClose();
                }}
                darkMode={darkMode}
              />
              <MenuItem
                icon={<Circle size={14} />}
                label="Same Outline"
                onClick={() => {
                  const { nodes, setSelectedNodes } = useFlowStore.getState();
                  const sourceNode = nodes.find((n) => n.id === nodeId);
                  if (!sourceNode) return;
                  const srcBorder = sourceNode.data.borderColor || '';
                  const srcStyle = sourceNode.data.borderStyle || 'solid';
                  const ids = nodes.filter((n) => {
                    return (n.data.borderColor || '') === srcBorder && (n.data.borderStyle || 'solid') === srcStyle;
                  }).map((n) => n.id);
                  setSelectedNodes(ids);
                  onClose();
                }}
                darkMode={darkMode}
              />
              <MenuDivider darkMode={darkMode} />
              <MenuItem
                icon={<MousePointerClick size={14} />}
                label="All Nodes"
                onClick={() => {
                  const { nodes, setSelectedNodes } = useFlowStore.getState();
                  setSelectedNodes(nodes.map((n) => n.id));
                  onClose();
                }}
                darkMode={darkMode}
              />
            </SubMenu>
          )}
        </div>

        {/* 15-17. Group items (conditional) with shared divider */}
        {(isGroupNode && onUngroup) || (isInVisualGroup && onRemoveFromVisualGroup) || (isInLinkGroup && onRemoveFromLinkGroup) ? (
          <>
            <MenuDivider darkMode={darkMode} />
            {isGroupNode && onUngroup && (
              <MenuItem
                icon={<Ungroup size={14} />}
                label="Ungroup"
                onClick={() => { onUngroup(); onClose(); }}
                darkMode={darkMode}
              />
            )}
            {isInVisualGroup && onRemoveFromVisualGroup && (
              <MenuItem
                icon={<Ungroup size={14} />}
                label="Remove from Group"
                onClick={() => { onRemoveFromVisualGroup(); onClose(); }}
                darkMode={darkMode}
              />
            )}
            {isInLinkGroup && onRemoveFromLinkGroup && (
              <MenuItem
                icon={<Unlink size={14} />}
                label="Remove from Link Group"
                onClick={() => { onRemoveFromLinkGroup(); onClose(); }}
                darkMode={darkMode}
              />
            )}
          </>
        ) : null}

        <MenuDivider darkMode={darkMode} />

        {/* 21. Delete — ALWAYS LAST */}
        <MenuItem
          icon={<Trash2 size={14} />}
          label="Delete"
          onClick={() => { onDelete(); onClose(); }}
          darkMode={darkMode}
          shortcut="Del"
          onMouseEnter={() => setSubmenu(null)}
        />
      </div>

      {/* Color swatches sidebar */}
      <ColorSwatchSidebar
        darkMode={darkMode}
        menuRef={menuRef}
        colors={quickColors}
        onSelectColor={(color) => { onChangeColor(color); }}
        onSelectColor2={(color) => { updateNodeData(nodeId, { borderColor: color }); }}
        fillOpacity={currentFillOpacity}
        onFillOpacityChange={(v) => { updateNodeData(nodeId, { fillOpacity: v }); }}
        borderOpacity={currentBorderOpacity}
        onBorderOpacityChange={(v) => { updateNodeData(nodeId, { borderOpacity: v }); }}
        onResetFill={() => { updateNodeData(nodeId, { color: undefined, fillOpacity: undefined }); }}
        onResetBorder={() => { updateNodeData(nodeId, { borderColor: undefined, borderOpacity: undefined }); }}
      />
    </div>
  );
};

export default React.memo(NodeContextMenu);
