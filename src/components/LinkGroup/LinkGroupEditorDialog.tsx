// ---------------------------------------------------------------------------
// LinkGroupEditorDialog.tsx -- Floating dialog to manage a linked group
// ---------------------------------------------------------------------------

import React, { useCallback, useEffect } from 'react';
import { X, Plus, Unlink } from 'lucide-react';

import { useFlowStore, type FlowNode } from '../../store/flowStore';
import { useUIStore } from '../../store/uiStore';
import { useStyleStore } from '../../store/styleStore';

// ---------------------------------------------------------------------------
// Shape label helper
// ---------------------------------------------------------------------------

const SHAPE_LABELS: Record<string, string> = {
  rectangle: 'Rect',
  roundedRectangle: 'Rounded',
  diamond: 'Diamond',
  circle: 'Circle',
  ellipse: 'Ellipse',
  parallelogram: 'Parallel',
  hexagon: 'Hexagon',
  triangle: 'Triangle',
  star: 'Star',
  cloud: 'Cloud',
  arrow: 'Arrow',
  callout: 'Callout',
  document: 'Doc',
  predefinedProcess: 'Process',
  manualInput: 'Manual',
  preparation: 'Prep',
  data: 'Data',
  database: 'Database',
  internalStorage: 'Storage',
  display: 'Display',
  blockArrow: 'Block Arrow',
  chevronArrow: 'Chevron',
  doubleArrow: 'Dbl Arrow',
  circularArrow: 'Circ Arrow',
  group: 'Group',
  stickyNote: 'Sticky',
  textbox: 'Textbox',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const LinkGroupEditorDialog: React.FC = () => {
  const linkGroupId = useUIStore((s) => s.linkGroupEditorId);
  const addMode = useUIStore((s) => s.linkGroupAddMode);
  const closeLinkGroupEditor = useUIStore((s) => s.closeLinkGroupEditor);
  const setLinkGroupAddMode = useUIStore((s) => s.setLinkGroupAddMode);
  const darkMode = useStyleStore((s) => s.darkMode);

  const nodes = useFlowStore((s) => s.nodes);
  const removeNodeFromLinkGroup = useFlowStore((s) => s.removeNodeFromLinkGroup);
  const removeLinkGroup = useFlowStore((s) => s.removeLinkGroup);
  const setSelectedNodes = useFlowStore((s) => s.setSelectedNodes);

  // Filter group members
  const members: FlowNode[] = linkGroupId
    ? nodes.filter((n) => n.data.linkGroupId === linkGroupId)
    : [];

  // Auto-close when group becomes empty
  useEffect(() => {
    if (linkGroupId && members.length === 0) {
      closeLinkGroupEditor();
    }
  }, [linkGroupId, members.length, closeLinkGroupEditor]);

  // Escape key handler
  useEffect(() => {
    if (!linkGroupId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (addMode) {
          setLinkGroupAddMode(false);
        } else {
          closeLinkGroupEditor();
        }
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [linkGroupId, addMode, setLinkGroupAddMode, closeLinkGroupEditor]);

  const handleRemoveNode = useCallback(
    (nodeId: string) => {
      removeNodeFromLinkGroup(nodeId);
    },
    [removeNodeFromLinkGroup],
  );

  const handleDissolve = useCallback(() => {
    if (linkGroupId) {
      removeLinkGroup(linkGroupId);
      closeLinkGroupEditor();
    }
  }, [linkGroupId, removeLinkGroup, closeLinkGroupEditor]);

  const handleSelectNode = useCallback(
    (nodeId: string) => {
      setSelectedNodes([nodeId]);
    },
    [setSelectedNodes],
  );

  if (!linkGroupId) return null;

  const bg = darkMode ? 'bg-dk-panel border-dk-border' : 'bg-white border-slate-300';
  const textPrimary = darkMode ? 'text-dk-text' : 'text-slate-800';
  const textSecondary = darkMode ? 'text-dk-muted' : 'text-slate-500';
  const hoverBg = darkMode ? 'hover:bg-dk-hover' : 'hover:bg-slate-100';
  const itemBg = darkMode ? 'bg-dk-hover' : 'bg-gray-50';

  return (
    <div className="fixed inset-0 pointer-events-auto" style={{ zIndex: 1000 }}>
      {/* Backdrop — blocks canvas clicks, closes editor on click */}
      <div
        className="absolute inset-0 bg-black/10"
        onClick={closeLinkGroupEditor}
      />
      {/* Dialog positioned top-right */}
      <div
        className={`pointer-events-auto absolute top-16 right-4 w-72 rounded-lg border shadow-xl ${bg} ${textPrimary}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-inherit">
          <span className="text-sm font-semibold">Link Group Editor</span>
          <button
            className={`p-1 rounded ${hoverBg} ${textSecondary}`}
            onClick={closeLinkGroupEditor}
            data-tooltip="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* Member list */}
        <div className="max-h-64 overflow-y-auto px-2 py-1.5 space-y-1">
          {members.length === 0 && (
            <div className={`text-xs text-center py-4 ${textSecondary}`}>
              No members
            </div>
          )}
          {members.map((node) => (
            <div
              key={node.id}
              className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs ${itemBg} ${hoverBg} cursor-pointer group`}
              onClick={() => handleSelectNode(node.id)}
              data-tooltip={`Click to select "${node.data.label}"`}
            >
              {/* Color swatch */}
              <div
                className="w-3 h-3 rounded-sm shrink-0 border border-black/10"
                style={{ backgroundColor: node.data.color ?? '#94a3b8' }}
              />

              {/* Label */}
              <span className="flex-1 truncate font-medium">
                {node.data.label || 'Untitled'}
              </span>

              {/* Shape badge */}
              <span className={`text-[10px] ${textSecondary} shrink-0`}>
                {SHAPE_LABELS[node.data.shape] ?? node.data.shape}
              </span>

              {/* Remove button */}
              <button
                className={`opacity-0 group-hover:opacity-100 p-0.5 rounded ${hoverBg} text-red-500 hover:text-red-600 transition-opacity`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveNode(node.id);
                }}
                data-tooltip="Remove from group"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-1.5 px-2 py-2 border-t border-inherit">
          {/* Add mode toggle */}
          <button
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              addMode
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : darkMode
                  ? 'bg-dk-hover text-dk-text hover:bg-dk-panel'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            onClick={() => setLinkGroupAddMode(!addMode)}
            data-tooltip={addMode ? 'Stop adding nodes' : 'Click nodes on canvas to add them'}
          >
            <Plus size={12} />
            {addMode ? 'Adding...' : 'Add Nodes'}
          </button>

          <div className="flex-1" />

          {/* Dissolve group */}
          <button
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-red-500 ${hoverBg} hover:text-red-600`}
            onClick={handleDissolve}
            data-tooltip="Remove all nodes from this group"
          >
            <Unlink size={12} />
            Dissolve
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(LinkGroupEditorDialog);
