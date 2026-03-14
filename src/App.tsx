import React, { useState, useCallback, useRef, useEffect } from 'react';
import FlowCanvas from './components/Canvas/FlowCanvas';
import Toolbar from './components/Panels/Toolbar';
import ShapePalette from './components/Panels/ShapePalette';
import PropertiesPanel from './components/Panels/PropertiesPanel';
import { ExportDialog } from './components/Export';
import { SwimlaneCreationDialog } from './components/Swimlanes';
import TemplateGallery from './components/Templates/TemplateGallery';
import KeyboardShortcutsDialog from './components/Panels/KeyboardShortcutsDialog';
import { useStyleStore } from './store/styleStore';
import { useUIStore } from './store/uiStore';
import { useExportStore } from './store/exportStore';
import { useFlowStore } from './store/flowStore';
import { useSettingsStore } from './store/settingsStore';
import { useAIStore } from './store/aiStore';
import { useSwimlaneStore, type SwimlaneContainer, type SwimlaneConfig } from './store/swimlaneStore';
import { generateId } from './utils/idGenerator';
import { useLegendStore } from './store/legendStore';
import { useLayerStore } from './store/layerStore';
import type { Layer } from './store/layerStore';
import { useBannerStore } from './store/bannerStore';
import { useTimerStore } from './store/timerStore';

const AIChatPanel = React.lazy(() => import('./components/AI/AIChatPanel'));
const AISettingsDialog = React.lazy(() => import('./components/AI/AISettingsDialog'));
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useHistoryStore } from './store/historyStore';
import { useAutoLayout } from './hooks/useAutoLayout';
import ScreenshotOverlay from './components/Screenshot/ScreenshotOverlay';
import { log } from './utils/logger';
import { computeBoundingBox } from './utils/groupUtils';
import { mirrorHorizontal, mirrorVertical } from './utils/transformUtils';
import * as alignment from './utils/alignmentUtils';
import type { FlowNode, FlowEdge, FlowNodeData, StatusIndicator } from './store/flowStore';
import { newPuckId, getStatusIndicators } from './store/flowStore';
import { resolveActivePalette } from './styles/palettes';

// ---------------------------------------------------------------------------
// Module-level clipboard for copy/paste (nodes or pucks)
// ---------------------------------------------------------------------------

type ClipboardContent =
  | { type: 'nodes'; nodes: FlowNode[]; edges: FlowEdge[] }
  | { type: 'pucks'; pucks: StatusIndicator[] };

let clipboard: ClipboardContent | null = null;

// Custom paint-brush cursor for format painter mode (SVG data URL, hotspot at tip)
const FORMAT_PAINTER_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23333' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z'/%3E%3Cpath d='M9 8 5.5 11.5a2.12 2.12 0 1 0 3 3L12 11'/%3E%3Cpath d='M5 15 2 22l7-3'/%3E%3C/svg%3E") 2 22, crosshair`;

const App: React.FC = () => {
  const darkMode = useStyleStore((s) => s.darkMode);
  const toggleDarkMode = useStyleStore((s) => s.toggleDarkMode);
  const exportDialogOpen = useExportStore((s) => s.dialogOpen);
  const presentationMode = useUIStore((s) => s.presentationMode);
  const toolbarOrientation = useSettingsStore((s) => s.toolbarOrientation);

  // AI panel state
  const aiPanelOpen = useAIStore((s) => s.isPanelOpen);
  const aiSettingsOpen = useAIStore((s) => s.isSettingsOpen);

  // Template gallery state
  const [templateGalleryOpen, setTemplateGalleryOpen] = useState(false);

  // Keyboard shortcuts dialog state (from uiStore)
  const shortcutsDialogOpen = useUIStore((s) => s.shortcutsDialogOpen);
  const setShortcutsDialogOpen = useUIStore((s) => s.setShortcutsDialogOpen);

  // Undo/redo — automatic via historyStore subscription to flowStore
  const canUndo = useHistoryStore((s) => s.canUndo);
  const canRedo = useHistoryStore((s) => s.canRedo);
  const handleUndo = useCallback(() => useHistoryStore.getState().undo(), []);
  const handleRedo = useCallback(() => useHistoryStore.getState().redo(), []);

  // Auto layout
  const { applyLayout } = useAutoLayout();

  // Store refs for ReactFlow view controls passed from FlowCanvas
  const viewControlsRef = useRef<{
    zoomIn: () => void;
    zoomOut: () => void;
    fitView: () => void;
  } | null>(null);

  const handleCanvasInit = useCallback(
    (controls: { zoomIn: () => void; zoomOut: () => void; fitView: () => void }) => {
      viewControlsRef.current = controls;
    },
    [],
  );

  // Delete selected
  const handleDeleteSelected = useCallback(() => {
    // Delete selected pucks first (if any are selected)
    const uiState = useUIStore.getState();
    if (uiState.selectedPuckIds.length > 0) {
      const { nodes, removeStatusPuck } = useFlowStore.getState();
      for (const puckId of uiState.selectedPuckIds) {
        if (uiState.selectedPuckNodeId) {
          // Pucks selected on a single node
          removeStatusPuck(uiState.selectedPuckNodeId, puckId);
        } else {
          // Global selection — find which node owns this puck
          for (const n of nodes) {
            const pucks = getStatusIndicators(n.data);
            if (pucks.some((p) => p.id === puckId)) {
              removeStatusPuck(n.id, puckId);
              break;
            }
          }
        }
      }
      uiState.clearPuckSelection();
      return; // Don't also delete nodes
    }

    // Existing node + edge deletion
    const { selectedNodes, selectedEdges, removeNode } = useFlowStore.getState();
    // Remove selected edges that aren't connected to selected nodes (those get cleaned up by removeNode)
    if (selectedEdges.length > 0) {
      const nodeSet = new Set(selectedNodes);
      useFlowStore.setState((draft: any) => {
        const edgesToRemove = draft.selectedEdges.filter(
          (eid: string) => !draft.edges.find((e: any) => e.id === eid && (nodeSet.has(e.source) || nodeSet.has(e.target)))
        );
        if (edgesToRemove.length > 0) {
          const removeSet = new Set(edgesToRemove);
          // Also remove associated endpoint nodes
          for (const eid of edgesToRemove) {
            const edge = draft.edges.find((e: any) => e.id === eid);
            if (edge) {
              const srcNode = draft.nodes.find((n: any) => n.id === edge.source);
              const tgtNode = draft.nodes.find((n: any) => n.id === edge.target);
              if (srcNode?.data?.isConnectorEndpoint) draft.nodes = draft.nodes.filter((n: any) => n.id !== srcNode.id);
              if (tgtNode?.data?.isConnectorEndpoint) draft.nodes = draft.nodes.filter((n: any) => n.id !== tgtNode.id);
            }
          }
          draft.edges = draft.edges.filter((e: any) => !removeSet.has(e.id));
          draft.selectedEdges = draft.selectedEdges.filter((eid: string) => !removeSet.has(eid));
        }
      });
    }
    for (const id of selectedNodes) {
      removeNode(id);
    }
    // Also clear swimlanes if any container is selected
    const slStore = useSwimlaneStore.getState();
    const selectedContainers = slStore.containers.filter((c) => c.selected);
    for (const c of selectedContainers) {
      slStore.removeContainer(c.id);
    }
  }, []);

  // Select all
  const handleSelectAll = useCallback(() => {
    const { nodes, setSelectedNodes } = useFlowStore.getState();
    setSelectedNodes(nodes.map((n) => n.id));
  }, []);

  // Save
  const handleSave = useCallback(() => {
    const state = useFlowStore.getState();
    const data = JSON.stringify({ nodes: state.nodes, edges: state.edges }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'charthero-diagram.json';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Auto layout
  const handleAutoLayout = useCallback(() => {
    applyLayout('TB');
  }, [applyLayout]);

  // Group selected nodes (region container)
  const handleGroup = useCallback(() => {
    const { nodes, selectedNodes, addNode, setNodes } = useFlowStore.getState();
    if (selectedNodes.length < 2) return;

    const selected = nodes.filter((n) => selectedNodes.includes(n.id));
    const bbox = computeBoundingBox(selected, 30, 25);

    const groupId = `group_${Date.now()}`;
    const groupNode: FlowNode = {
      id: groupId,
      type: 'groupNode',
      position: { x: bbox.x, y: bbox.y },
      data: {
        label: 'Group',
        shape: 'group',
        width: bbox.width,
        height: bbox.height,
        color: '#f1f5f9',
        borderColor: '#94a3b8',
      },
    };
    addNode(groupNode);

    // Ensure array order: other nodes → group → children (group renders behind children)
    const currentNodes = useFlowStore.getState().nodes;
    const childIds = new Set(selectedNodes);
    const otherNodes = currentNodes.filter((n) => n.id !== groupId && !childIds.has(n.id));
    const theGroup = currentNodes.find((n) => n.id === groupId)!;
    const childNodes = currentNodes
      .filter((n) => childIds.has(n.id))
      .map((n) => ({
        ...n,
        parentId: groupId,
        extent: 'parent' as const,
        position: { x: n.position.x - bbox.x, y: n.position.y - bbox.y },
        data: { ...n.data, groupId },
      }));
    setNodes([...otherNodes, theGroup, ...childNodes]);
    useFlowStore.getState().setSelectedNodes([groupId]);
  }, []);

  // Link group selected nodes (logical, no container)
  const handleLinkGroup = useCallback(() => {
    const { selectedNodes, createLinkGroup } = useFlowStore.getState();
    if (selectedNodes.length < 2) return;
    createLinkGroup(selectedNodes);
  }, []);

  // Ungroup selected node (visual group or link group)
  const handleUngroup = useCallback(() => {
    const { selectedNodes, nodes, setNodes, removeNodeFromLinkGroup } = useFlowStore.getState();
    if (selectedNodes.length !== 1) return;
    const nodeId = selectedNodes[0];
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    if (node.type === 'groupNode') {
      // Ungroup: convert children to absolute positions and remove group
      const updatedNodes = nodes
        .filter((n) => n.id !== nodeId) // remove group node
        .map((n) => {
          if (n.parentId === nodeId) {
            return {
              ...n,
              parentId: undefined,
              extent: undefined,
              position: {
                x: n.position.x + node.position.x,
                y: n.position.y + node.position.y,
              },
              data: { ...n.data, groupId: undefined },
            };
          }
          return n;
        });
      setNodes(updatedNodes);
    } else if (node.parentId) {
      // Remove this node from its visual group
      const parent = nodes.find((n) => n.id === node.parentId);
      if (!parent) return;
      const updatedNodes = nodes.map((n) => {
        if (n.id === nodeId) {
          return {
            ...n,
            parentId: undefined,
            extent: undefined,
            position: {
              x: n.position.x + parent.position.x,
              y: n.position.y + parent.position.y,
            },
            data: { ...n.data, groupId: undefined },
          };
        }
        return n;
      });
      setNodes(updatedNodes);
    } else if (node.data.linkGroupId) {
      // Remove from link group
      removeNodeFromLinkGroup(nodeId);
    }
  }, []);

  // Mirror / Rotate helpers
  const applyPositions = useCallback((positions: Map<string, { x: number; y: number }>) => {
    const { updateNodePosition } = useFlowStore.getState();
    for (const [id, pos] of positions) {
      updateNodePosition(id, pos);
    }
  }, []);

  const getSelectedFlowNodes = useCallback(() => {
    const { nodes, selectedNodes } = useFlowStore.getState();
    const idSet = new Set(selectedNodes);
    return nodes.filter((n) => idSet.has(n.id));
  }, []);

  const handleMirrorH = useCallback(() => {
    const nodes = getSelectedFlowNodes();
    if (nodes.length < 2) return;
    applyPositions(mirrorHorizontal(nodes));
  }, [getSelectedFlowNodes, applyPositions]);

  const handleMirrorV = useCallback(() => {
    const nodes = getSelectedFlowNodes();
    if (nodes.length < 2) return;
    applyPositions(mirrorVertical(nodes));
  }, [getSelectedFlowNodes, applyPositions]);

  // Alignment keyboard shortcut handlers
  const handleAlignLeft = useCallback(() => {
    const nodes = getSelectedFlowNodes();
    if (nodes.length < 2) return;
    applyPositions(alignment.alignLeft(nodes));
  }, [getSelectedFlowNodes, applyPositions]);

  const handleAlignCenterH = useCallback(() => {
    const nodes = getSelectedFlowNodes();
    if (nodes.length < 2) return;
    applyPositions(alignment.alignCenterH(nodes));
  }, [getSelectedFlowNodes, applyPositions]);

  const handleAlignRight = useCallback(() => {
    const nodes = getSelectedFlowNodes();
    if (nodes.length < 2) return;
    applyPositions(alignment.alignRight(nodes));
  }, [getSelectedFlowNodes, applyPositions]);

  const handleAlignTop = useCallback(() => {
    const nodes = getSelectedFlowNodes();
    if (nodes.length < 2) return;
    applyPositions(alignment.alignTop(nodes));
  }, [getSelectedFlowNodes, applyPositions]);

  const handleAlignCenterV = useCallback(() => {
    const nodes = getSelectedFlowNodes();
    if (nodes.length < 2) return;
    applyPositions(alignment.alignCenterV(nodes));
  }, [getSelectedFlowNodes, applyPositions]);

  const handleAlignBottom = useCallback(() => {
    const nodes = getSelectedFlowNodes();
    if (nodes.length < 2) return;
    applyPositions(alignment.alignBottom(nodes));
  }, [getSelectedFlowNodes, applyPositions]);

  // Z-order: keyboard shortcut handlers (operate on all selected nodes)
  const handleSendBackward = useCallback(() => {
    const { nodes, selectedNodes, setNodes } = useFlowStore.getState();
    if (selectedNodes.length === 0) return;
    const moved = [...nodes];
    const idSet = new Set(selectedNodes);
    for (let i = 1; i < moved.length; i++) {
      if (idSet.has(moved[i].id) && !idSet.has(moved[i - 1].id)) {
        [moved[i - 1], moved[i]] = [moved[i], moved[i - 1]];
      }
    }
    setNodes(moved);
  }, []);

  const handleBringForward = useCallback(() => {
    const { nodes, selectedNodes, setNodes } = useFlowStore.getState();
    if (selectedNodes.length === 0) return;
    const moved = [...nodes];
    const idSet = new Set(selectedNodes);
    for (let i = moved.length - 2; i >= 0; i--) {
      if (idSet.has(moved[i].id) && !idSet.has(moved[i + 1].id)) {
        [moved[i], moved[i + 1]] = [moved[i + 1], moved[i]];
      }
    }
    setNodes(moved);
  }, []);

  const handleSendToBack = useCallback(() => {
    const { nodes, selectedNodes, setNodes } = useFlowStore.getState();
    if (selectedNodes.length === 0) return;
    const idSet = new Set(selectedNodes);
    const selected = nodes.filter((n) => idSet.has(n.id));
    const rest = nodes.filter((n) => !idSet.has(n.id));
    setNodes([...selected, ...rest]);
  }, []);

  const handleBringToFront = useCallback(() => {
    const { nodes, selectedNodes, setNodes } = useFlowStore.getState();
    if (selectedNodes.length === 0) return;
    const idSet = new Set(selectedNodes);
    const selected = nodes.filter((n) => idSet.has(n.id));
    const rest = nodes.filter((n) => !idSet.has(n.id));
    setNodes([...rest, ...selected]);
  }, []);

  // Duplicate selected nodes
  const handleDuplicate = useCallback(() => {
    const { nodes, selectedNodes, addNode } = useFlowStore.getState();
    const newIds: string[] = [];
    for (const id of selectedNodes) {
      const original = nodes.find((n) => n.id === id);
      if (!original) continue;
      const newId = `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      // Strip group memberships so the duplicate is independent
      const { linkGroupId: _lg, groupId: _gid, ...cleanData } = original.data;
      addNode({
        id: newId,
        type: original.type,
        position: {
          x: (original.parentId
            ? original.position.x + (nodes.find(n => n.id === original.parentId)?.position.x ?? 0)
            : original.position.x) + 30,
          y: (original.parentId
            ? original.position.y + (nodes.find(n => n.id === original.parentId)?.position.y ?? 0)
            : original.position.y) + 30,
        },
        data: cleanData,
      });
      newIds.push(newId);
    }
    if (newIds.length) useFlowStore.getState().setSelectedNodes(newIds);
  }, []);

  // Edit label of first selected node
  const handleEditLabel = useCallback(() => {
    const { selectedNodes } = useFlowStore.getState();
    if (selectedNodes.length > 0) {
      useUIStore.getState().setIsEditingNode(selectedNodes[0]);
    }
  }, []);

  // Add node at canvas center (via view controls)
  const handleAddNode = useCallback(() => {
    const { addNode } = useFlowStore.getState();
    addNode({
      id: `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'shapeNode',
      position: { x: 400, y: 300 },
      data: { label: 'New Node', shape: 'rectangle' },
    });
  }, []);

  // Open export dialog
  const handleExport = useCallback(() => {
    useExportStore.getState().setDialogOpen(true);
  }, []);

  // Toggle AI panel
  const handleToggleAI = useCallback(() => {
    useAIStore.getState().togglePanel();
  }, []);

  // Nudge selected nodes by (dx, dy) pixels
  const handleNudge = useCallback((dx: number, dy: number) => {
    const { selectedNodes, nodes, updateNodePosition } = useFlowStore.getState();
    if (selectedNodes.length === 0) return;
    for (const id of selectedNodes) {
      const node = nodes.find((n) => n.id === id);
      if (node) {
        updateNodePosition(id, { x: node.position.x + dx, y: node.position.y + dy });
      }
    }
  }, []);

  // Apply palette color by index (1-9 keys) — uses the active color palette
  const handleApplyPaletteColor = useCallback((index: number) => {
    const { selectedNodes, updateNodeData } = useFlowStore.getState();
    const { activePaletteId, activeStyleId } = useStyleStore.getState();
    const palette = resolveActivePalette(activePaletteId, activeStyleId);
    const colors = palette?.colors;
    if (!colors || index < 0 || index >= colors.length) return;
    const color = colors[index];
    for (const id of selectedNodes) {
      updateNodeData(id, { color });
    }
  }, []);

  // Copy style (same as format painter copy)
  const handleCopyStyle = useCallback(() => {
    const { nodes, selectedNodes } = useFlowStore.getState();
    if (selectedNodes.length === 0) return;
    const node = nodes.find((n) => n.id === selectedNodes[0]);
    if (!node) return;
    const d = node.data;
    useUIStore.getState().setFormatPainterNodeStyle({
      color: d.color,
      borderColor: d.borderColor,
      textColor: d.textColor,
      fontSize: d.fontSize,
      fontWeight: d.fontWeight,
      fontFamily: d.fontFamily,
      borderStyle: d.borderStyle,
      borderWidth: d.borderWidth,
      borderRadius: d.borderRadius,
      opacity: d.opacity,
      textAlign: (d as Record<string, unknown>).textAlign as string | undefined,
    });
    useUIStore.getState().setFormatPainterActive(true);
  }, []);

  // Paste style to all selected nodes
  const handlePasteStyle = useCallback(() => {
    const style = useUIStore.getState().formatPainterNodeStyle;
    if (!style) return;
    const { selectedNodes, updateNodeData } = useFlowStore.getState();
    const patch: Record<string, unknown> = {};
    if (style.color !== undefined) patch.color = style.color;
    if (style.borderColor !== undefined) patch.borderColor = style.borderColor;
    if (style.textColor !== undefined) patch.textColor = style.textColor;
    if (style.fontSize !== undefined) patch.fontSize = style.fontSize;
    if (style.fontWeight !== undefined) patch.fontWeight = style.fontWeight;
    if (style.fontFamily !== undefined) patch.fontFamily = style.fontFamily;
    if (style.borderStyle !== undefined) patch.borderStyle = style.borderStyle;
    if (style.borderWidth !== undefined) patch.borderWidth = style.borderWidth;
    if (style.borderRadius !== undefined) patch.borderRadius = style.borderRadius;
    if (style.opacity !== undefined) patch.opacity = style.opacity;
    if (style.textAlign !== undefined) patch.textAlign = style.textAlign;
    for (const id of selectedNodes) {
      updateNodeData(id, patch as Partial<FlowNodeData>);
    }
  }, []);

  // Copy: selected pucks OR selected nodes (with connected edges)
  const handleCopy = useCallback(() => {
    const { selectedPuckIds, selectedPuckNodeId } = useUIStore.getState();

    // If pucks are selected, copy them
    if (selectedPuckIds.length > 0 && selectedPuckNodeId) {
      const node = useFlowStore.getState().nodes.find((n) => n.id === selectedPuckNodeId);
      if (node) {
        const allPucks = getStatusIndicators(node.data);
        const copied = allPucks.filter((p) => selectedPuckIds.includes(p.id));
        if (copied.length > 0) {
          clipboard = { type: 'pucks', pucks: copied };
          useUIStore.getState().showToast(`Copied ${copied.length} puck${copied.length > 1 ? 's' : ''}`, 'success');
          return;
        }
      }
    }

    // Otherwise copy selected nodes + their connected edges
    const { nodes, edges, selectedNodes } = useFlowStore.getState();
    if (selectedNodes.length === 0) return;
    const idSet = new Set(selectedNodes);
    const copiedNodes = nodes.filter((n) => idSet.has(n.id));
    const copiedEdges = edges.filter((e) => idSet.has(e.source) && idSet.has(e.target));
    clipboard = { type: 'nodes', nodes: copiedNodes, edges: copiedEdges };
    useUIStore.getState().showToast(`Copied ${copiedNodes.length} block${copiedNodes.length > 1 ? 's' : ''}`, 'success');
  }, []);

  // Paste: pucks onto selected node, or nodes at offset
  const handlePaste = useCallback(() => {
    if (!clipboard) return;

    if (clipboard.type === 'pucks') {
      // Paste pucks onto the first selected node
      const { nodes, selectedNodes, updateNodeData } = useFlowStore.getState();
      if (selectedNodes.length === 0) {
        useUIStore.getState().showToast('Select a block to paste pucks onto', 'warning');
        return;
      }
      const targetNode = nodes.find((n) => n.id === selectedNodes[0]);
      if (!targetNode) return;
      const existing = getStatusIndicators(targetNode.data);
      const newPucks = clipboard.pucks.map((p) => ({ ...p, id: newPuckId() }));
      updateNodeData(targetNode.id, {
        statusIndicators: [...existing, ...newPucks],
      } as Partial<FlowNodeData>);
      useUIStore.getState().showToast(`Pasted ${newPucks.length} puck${newPucks.length > 1 ? 's' : ''}`, 'success');
      return;
    }

    // Paste nodes at offset
    const state = useFlowStore.getState();
    const idMap = new Map<string, string>();
    const newIds: string[] = [];
    const offset = 40;

    for (const node of clipboard.nodes) {
      const newId = `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      idMap.set(node.id, newId);
      // Deep-clone pucks with new IDs, strip group memberships
      const { linkGroupId: _lg, groupId: _gid, ...restData } = node.data;
      const data = { ...restData };
      if (data.statusIndicators) {
        data.statusIndicators = data.statusIndicators.map((p: StatusIndicator) => ({
          ...p,
          id: newPuckId(),
        }));
      }
      state.addNode({
        id: newId,
        type: node.type,
        position: { x: node.position.x + offset, y: node.position.y + offset },
        data,
      });
      newIds.push(newId);
    }

    // Recreate edges between pasted nodes
    const newEdges: FlowEdge[] = [];
    for (const edge of clipboard.edges) {
      const newSource = idMap.get(edge.source);
      const newTarget = idMap.get(edge.target);
      if (newSource && newTarget) {
        newEdges.push({
          ...edge,
          id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          source: newSource,
          target: newTarget,
        });
      }
    }
    if (newEdges.length > 0) {
      const currentEdges = useFlowStore.getState().edges;
      state.setEdges([...currentEdges, ...newEdges]);
    }

    state.setSelectedNodes(newIds);
    useUIStore.getState().showToast(`Pasted ${newIds.length} block${newIds.length > 1 ? 's' : ''}`, 'success');
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onDelete: handleDeleteSelected,
    onUndo: handleUndo,
    onRedo: handleRedo,
    onCopy: handleCopy,
    onPaste: handlePaste,
    onSelectAll: handleSelectAll,
    onSave: handleSave,
    onAutoLayout: handleAutoLayout,
    onToggleDarkMode: toggleDarkMode,
    onGroup: handleGroup,
    onLinkGroup: handleLinkGroup,
    onUngroup: handleUngroup,
    onMirrorHorizontal: handleMirrorH,
    onMirrorVertical: handleMirrorV,
    onBringForward: handleBringForward,
    onSendBackward: handleSendBackward,
    onBringToFront: handleBringToFront,
    onSendToBack: handleSendToBack,
    onShowShortcuts: () => setShortcutsDialogOpen(true),
    onDuplicate: handleDuplicate,
    onEditLabel: handleEditLabel,
    onAddNode: handleAddNode,
    onExport: handleExport,
    onNudge: handleNudge,
    onApplyPaletteColor: handleApplyPaletteColor,
    onCopyStyle: handleCopyStyle,
    onPasteStyle: handlePasteStyle,
    onStraightenEdges: () => useFlowStore.getState().straightenEdges(),
    onToggleAI: handleToggleAI,
    onAlignLeft: handleAlignLeft,
    onAlignCenterH: handleAlignCenterH,
    onAlignRight: handleAlignRight,
    onAlignTop: handleAlignTop,
    onAlignCenterV: handleAlignCenterV,
    onAlignBottom: handleAlignBottom,
  }, !presentationMode);

  // Global format painter cursor – inject a <style> with !important so it
  // overrides every element's own cursor, not just the body.
  const formatPainterActive = useUIStore((s) => s.formatPainterActive);
  useEffect(() => {
    if (formatPainterActive) {
      const style = document.createElement('style');
      style.id = 'fc-format-painter-cursor';
      style.textContent = `* { cursor: ${FORMAT_PAINTER_CURSOR} !important; }`;
      document.head.appendChild(style);
      return () => { style.remove(); };
    }
  }, [formatPainterActive]);

  // Auto-save to localStorage — saves all diagram-specific state
  useEffect(() => {
    const SAVE_KEY = 'charthero-autosave';

    // Snapshot all diagram state into one blob
    const buildSnapshot = () => {
      const flow = useFlowStore.getState();
      const swim = useSwimlaneStore.getState();
      const legend = useLegendStore.getState();
      const layer = useLayerStore.getState();
      const banner = useBannerStore.getState();
      const timer = useTimerStore.getState();
      return {
        nodes: flow.nodes,
        edges: flow.edges,
        swimlanes: {
          containers: swim.containers,
        },
        legends: {
          nodeLegend: legend.nodeLegend,
          swimlaneLegend: legend.swimlaneLegend,
        },
        layers: {
          layers: layer.layers,
          activeLayerId: layer.activeLayerId,
        },
        banners: {
          topBanner: banner.topBanner,
          bottomBanner: banner.bottomBanner,
        },
        timeSpent: timer.getElapsed(),
      };
    };

    // Restore all diagram state from saved blob
    const restoreSnapshot = (saved: Record<string, unknown>) => {
      // Nodes + edges
      const nodes = saved.nodes as FlowNode[] | undefined;
      const edges = saved.edges as FlowEdge[] | undefined;
      if (nodes && nodes.length > 0) {
        // Migrate legacy node types — older versions stored shape name as
        // the React Flow type (e.g. "rectangle") instead of "shapeNode".
        for (const n of nodes) {
          if (n.type && n.type !== 'shapeNode' && n.type !== 'endpointNode' && n.type !== 'groupNode') {
            n.type = 'shapeNode';
          }
        }
        useFlowStore.getState().setNodes(nodes);
        useFlowStore.getState().setEdges(edges || []);
      }

      // Swimlanes
      const sw = saved.swimlanes as Record<string, unknown> | undefined;
      if (sw) {
        if (Array.isArray(sw.containers)) {
          // New multi-container format
          useSwimlaneStore.setState({
            containers: sw.containers as SwimlaneContainer[],
            activeContainerId: (sw.containers as SwimlaneContainer[])[0]?.id ?? null,
          });
        } else if (sw.config) {
          // Legacy single-container format — wrap into containers array
          const legacyContainer: SwimlaneContainer = {
            id: generateId('swimlane'),
            config: sw.config as SwimlaneConfig,
            containerOffset: (sw.containerOffset as { x: number; y: number }) || { x: 0, y: 0 },
            selected: false,
          };
          useSwimlaneStore.setState({
            containers: [legacyContainer],
            activeContainerId: legacyContainer.id,
          });
        }
      }

      // Legends
      const lg = saved.legends as Record<string, unknown> | undefined;
      if (lg) {
        if (lg.nodeLegend) {
          useLegendStore.setState({ nodeLegend: lg.nodeLegend as ReturnType<typeof useLegendStore.getState>['nodeLegend'] });
        }
        if (lg.swimlaneLegend) {
          useLegendStore.setState({ swimlaneLegend: lg.swimlaneLegend as ReturnType<typeof useLegendStore.getState>['swimlaneLegend'] });
        }
      }

      // Layers
      const ly = saved.layers as Record<string, unknown> | undefined;
      if (ly?.layers && Array.isArray(ly.layers)) {
        useLayerStore.setState({
          layers: ly.layers as Layer[],
          activeLayerId: (ly.activeLayerId as string) || 'default',
        });
      }

      // Banners
      const bn = saved.banners as Record<string, unknown> | undefined;
      if (bn) {
        if (bn.topBanner) useBannerStore.setState({ topBanner: bn.topBanner as ReturnType<typeof useBannerStore.getState>['topBanner'] });
        if (bn.bottomBanner) useBannerStore.setState({ bottomBanner: bn.bottomBanner as ReturnType<typeof useBannerStore.getState>['bottomBanner'] });
      }

      // Timer — restore accumulated time spent
      if (typeof saved.timeSpent === 'number' && saved.timeSpent > 0) {
        useTimerStore.getState().start(saved.timeSpent);
      } else {
        useTimerStore.getState().start(0);
      }
    };

    // Load on mount
    let didRestore = false;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        restoreSnapshot(saved);
        didRestore = true;
      }
    } catch (e) {
      log.error('Autosave load failed', e);
    }
    // Start the timer if restoreSnapshot didn't already (i.e. fresh session)
    if (!didRestore) {
      useTimerStore.getState().start(0);
    }
    // Clear history so the initial load isn't an undo-able action
    useHistoryStore.getState().clearHistory();

    // Debounced save — triggers on changes to any subscribed store
    let timeout: ReturnType<typeof setTimeout>;
    const debouncedSave = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        try {
          localStorage.setItem(SAVE_KEY, JSON.stringify(buildSnapshot()));
        } catch (e) {
          log.error('Autosave write failed', e);
        }
      }, 1000);
    };

    // Subscribe to all diagram-specific stores
    const unsubs = [
      useFlowStore.subscribe(debouncedSave),
      useSwimlaneStore.subscribe(debouncedSave),
      useLegendStore.subscribe(debouncedSave),
      useLayerStore.subscribe(debouncedSave),
      useBannerStore.subscribe(debouncedSave),
    ];

    // Periodic save every 30s to capture elapsed time even when no stores change
    const timerInterval = setInterval(() => {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(buildSnapshot()));
      } catch (e) {
        log.error('Autosave timer write failed', e);
      }
    }, 30_000);

    // Save on page unload so timer is never lost; also leave collab room
    const handleBeforeUnload = () => {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(buildSnapshot()));
      } catch {
        // Best-effort — ignore errors during unload
      }
      // Cleanly disconnect from collaboration room if active
      import('./collab').then(({ leaveRoom }) => leaveRoom()).catch(() => {});
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Auto-join collaboration room if URL contains #room=<md5hash>
    import('./collab').then(({ getRoomIdFromUrl, joinRoom }) => {
      const roomId = getRoomIdFromUrl();
      if (roomId) {
        const name = localStorage.getItem('charthero-collab-name') || 'Guest';
        joinRoom({ roomId, userName: name }).catch((err) => {
          console.error('Auto-join failed:', err);
        });
      }
    }).catch(() => {});

    return () => {
      unsubs.forEach((u) => u());
      clearTimeout(timeout);
      clearInterval(timerInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const isVerticalToolbar = toolbarOrientation === 'vertical';

  const toolbarEl = !presentationMode && (
    <Toolbar
      onFitView={() => viewControlsRef.current?.fitView()}
      onUndo={handleUndo}
      onRedo={handleRedo}
      canUndo={canUndo}
      canRedo={canRedo}
      onOpenTemplates={() => setTemplateGalleryOpen(true)}
    />
  );

  return (
    <div
      className={`
        flex flex-col w-screen h-screen overflow-hidden
        ${darkMode ? 'dark' : ''}
      `}
    >
      {/* Top toolbar (horizontal mode) */}
      {!isVerticalToolbar && toolbarEl}

      {/* Main content area */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Vertical toolbar (vertical mode) — before shape palette */}
        {isVerticalToolbar && toolbarEl}

        {/* Left: Shape palette - hidden in presentation mode */}
        {!presentationMode && <ShapePalette />}

        {/* Center: Canvas */}
        <div className="flex-1 min-w-0 relative">
          <FlowCanvas onInit={handleCanvasInit} onUndo={handleUndo} onRedo={handleRedo} canUndo={canUndo} canRedo={canRedo} />
        </div>

        {/* Right: Properties panel - hidden in presentation mode */}
        {!presentationMode && <PropertiesPanel />}
      </div>

      {/* Presentation mode overlay rendered inside FlowCanvas (ReactFlowProvider) */}

      {/* Swimlane creation dialog (modal) */}
      <SwimlaneCreationDialog />

      {/* Export dialog overlay */}
      {exportDialogOpen && <ExportDialog />}

      {/* Template Gallery modal */}
      <TemplateGallery
        open={templateGalleryOpen}
        onClose={() => setTemplateGalleryOpen(false)}
      />

      {/* Keyboard Shortcuts dialog */}
      <KeyboardShortcutsDialog
        open={shortcutsDialogOpen}
        onClose={() => setShortcutsDialogOpen(false)}
      />

      {/* AI Chat */}
      <React.Suspense fallback={null}>
        {aiPanelOpen && <AIChatPanel />}
        {aiSettingsOpen && (
          <AISettingsDialog
            open={aiSettingsOpen}
            onClose={() => useAIStore.getState().setSettingsOpen(false)}
          />
        )}
      </React.Suspense>

      {/* Screenshot region selector overlay */}
      <ScreenshotOverlay />

      {/* Toast notification */}
      <Toast />

      {/* Confirm dialog */}
      <ConfirmDialog />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Toast notification component
// ---------------------------------------------------------------------------

const TOAST_COLORS = {
  info: 'bg-blue-500',
  success: 'bg-emerald-500',
  error: 'bg-red-500',
  warning: 'bg-amber-500',
};

const Toast: React.FC = () => {
  const toast = useUIStore((s) => s.toast);
  const clearToast = useUIStore((s) => s.clearToast);

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] animate-[slideUp_0.2s_ease-out]">
      <div
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-white text-sm font-medium ${TOAST_COLORS[toast.type]}`}
      >
        <span>{toast.message}</span>
        <button onClick={clearToast} className="ml-2 opacity-70 hover:opacity-100 cursor-pointer">
          &times;
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Confirm dialog component
// ---------------------------------------------------------------------------

const ConfirmDialog: React.FC = () => {
  const confirmDialog = useUIStore((s) => s.confirmDialog);
  const resolveConfirm = useUIStore((s) => s.resolveConfirm);

  if (!confirmDialog) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-dk-panel rounded-xl shadow-2xl border border-gray-200 dark:border-dk-border w-full max-w-sm mx-4 overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-dk-text">
            {confirmDialog.title || 'Confirm'}
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-dk-muted">
            {confirmDialog.message}
          </p>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 bg-gray-50 dark:bg-dk/50">
          <button
            onClick={() => resolveConfirm(false)}
            className="px-4 py-1.5 rounded-md text-sm font-medium text-gray-600 dark:text-dk-muted hover:bg-gray-200 dark:hover:bg-dk-hover transition-colors"
          >
            {confirmDialog.cancelLabel || 'Cancel'}
          </button>
          <button
            onClick={() => resolveConfirm(true)}
            className="px-4 py-1.5 rounded-md text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            {confirmDialog.confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
