import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useReactFlow,
  SelectionMode,
  type NodeTypes,
  type IsValidConnection,
  type ReactFlowInstance,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useFlowStore, type FlowNode, type FlowEdge, type FlowNodeData, type NodeShape } from '../../store/flowStore';
import { useUIStore } from '../../store/uiStore';
import { useStyleStore } from '../../store/styleStore';
import { useDependencyStore } from '../../store/dependencyStore';
import { diagramStyles } from '../../styles/diagramStyles';
import { useSwimlaneStore, createDefaultContainer } from '../../store/swimlaneStore';
import GenericShapeNode from './GenericShapeNode';
import GroupNode from './GroupNode';
import EndpointNode from './EndpointNode';
import ExtensionNode from '../../extensions/ExtensionNode';
import { useExtensionStore } from '../../extensions/extensionStore';
import Ruler, { RulerCorner } from './Ruler';
import StatusBar from './StatusBar';
import PinnedExtensionsBar from '../Panels/PinnedExtensionsBar';
import { edgeTypes, MarkerDefs } from '../Edges';
import { SwimlaneLayer, SwimlaneHeaderLayer, SwimlaneResizeOverlay } from '../Swimlanes';
import { LegendOverlay, LegendButton } from '../Legend';
import AlignmentGuideOverlay from './AlignmentGuideOverlay';
import DistanceGuideOverlay from './DistanceGuideOverlay';
import MiniMapOverlays from './MiniMapOverlays';
import { findAlignmentGuides, snapToAlignmentGuides, findDistanceGuides, type SnapNode, type DistanceGuides } from '../../utils/snapUtils';
import { useLegendStore } from '../../store/legendStore';
import { useBannerStore } from '../../store/bannerStore';
import { BannerBar } from './CanvasBanner';
import { WalkModeBreadcrumb, ChainHighlight } from '../Dependencies';
import { CanvasContextMenu, NodeContextMenu, EdgeContextMenu, SelectionContextMenu } from '../ContextMenu';
import PresentationOverlay from '../PresentationMode/PresentationOverlay';
import FreehandDrawingOverlay from './FreehandDrawingOverlay';
import { LinkGroupEditorDialog } from '../LinkGroup';
import { log } from '../../utils/logger';
import { resolveCanvasBackground } from '../../utils/themeResolver';
import { useCollabStore } from '../../store/collabStore';
import RemoteCursors from '../Collaboration/RemoteCursors';
import RemoteSelectionHighlight from '../Collaboration/RemoteSelectionHighlight';
import {
  computeLaneBoundaries,
  getNodeLaneAssignment,
  type LaneDefinition,
} from '../../utils/swimlaneUtils';

// ---------------------------------------------------------------------------
// Module-level React Flow instance accessor
// Allows components rendered outside the ReactFlowProvider (e.g. ExportDialog)
// to call fitView / getViewport / setViewport before capturing.
// ---------------------------------------------------------------------------

let _rfInstance: ReturnType<typeof useReactFlow> | null = null;

/** Returns the current React Flow instance, or null if not yet initialized. */
export function getReactFlowInstance() {
  return _rfInstance;
}

// Custom paint-brush cursor for format painter mode (SVG data URL, hotspot at tip)
const FORMAT_PAINTER_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23333' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z'/%3E%3Cpath d='M9 8 5.5 11.5a2.12 2.12 0 1 0 3 3L12 11'/%3E%3Cpath d='M5 15 2 22l7-3'/%3E%3C/svg%3E") 2 22, crosshair`;

// ---------------------------------------------------------------------------
// Node types registry
// ---------------------------------------------------------------------------

const nodeTypes: NodeTypes = {
  shapeNode: GenericShapeNode,
  groupNode: GroupNode,
  endpointNode: EndpointNode,
  extensionNode: ExtensionNode,
};

const DEFAULT_EDGE_OPTIONS = {
  type: 'smoothstep' as const,
  animated: false,
};

// ---------------------------------------------------------------------------
// Unique ID generator
// ---------------------------------------------------------------------------

let idCounter = 0;
const nextId = () => `node_${Date.now()}_${++idCounter}`;

// ---------------------------------------------------------------------------
// Swimlane auto-assignment helper (reads stores directly — no hooks needed)
// ---------------------------------------------------------------------------

function assignSwimlaneToNode(
  nodeId: string,
  position: { x: number; y: number },
  nodeW = 160,
  nodeH = 60,
) {
  const { containers } = useSwimlaneStore.getState();
  if (containers.length === 0) return;

  let assignedLaneId: string | null = null;

  for (const container of containers) {
    const { config, containerOffset } = container;
    const hLanes = config.horizontal;
    const vLanes = config.vertical;
    if (hLanes.length === 0 && vLanes.length === 0) continue;

    const localX = position.x - containerOffset.x;
    const localY = position.y - containerOffset.y;

    const hHeaderW = config.hHeaderWidth ?? 48;
    const vHeaderH = config.vHeaderHeight ?? 32;

    const collapsedSize = 32;
    const totalHHeight = hLanes.reduce((sum, l) => sum + (l.collapsed ? collapsedSize : l.size), 0)
      + (vLanes.length > 0 ? vHeaderH : 0);
    const totalVWidth = vLanes.reduce((sum, l) => sum + (l.collapsed ? collapsedSize : l.size), 0)
      + (hLanes.length > 0 ? hHeaderW : 0);

    const cx = localX + nodeW / 2;
    const cy = localY + nodeH / 2;
    const containerW = vLanes.length > 0 ? totalVWidth : (hLanes.length > 0 ? hHeaderW + hLanes.reduce((sum, l) => sum + (l.collapsed ? collapsedSize : l.size), 0) : 0);
    const containerH = hLanes.length > 0 ? totalHHeight : (vLanes.length > 0 ? vHeaderH + vLanes.reduce((sum, l) => sum + (l.collapsed ? collapsedSize : l.size), 0) : 0);

    if (cx >= 0 && cy >= 0 && cx <= containerW && cy <= containerH) {
      if (hLanes.length > 0) {
        const headerOffset = vLanes.length > 0 ? vHeaderH : 0;
        const laneDefs: LaneDefinition[] = hLanes.map((l) => ({
          id: l.id, label: l.label, size: l.size, collapsed: l.collapsed, order: l.order,
        }));
        const boundaries = computeLaneBoundaries(laneDefs, 'horizontal', headerOffset);
        assignedLaneId = getNodeLaneAssignment({ x: localX, y: localY }, { width: nodeW, height: nodeH }, boundaries);
      }
      if (!assignedLaneId && vLanes.length > 0) {
        const headerOffset = hLanes.length > 0 ? hHeaderW : 0;
        const laneDefs: LaneDefinition[] = vLanes.map((l) => ({
          id: l.id, label: l.label, size: l.size, collapsed: l.collapsed, order: l.order,
        }));
        const boundaries = computeLaneBoundaries(laneDefs, 'vertical', headerOffset);
        assignedLaneId = getNodeLaneAssignment({ x: localX, y: localY }, { width: nodeW, height: nodeH }, boundaries);
      }
      if (assignedLaneId) break;
    }
  }

  // Update assignment (set lane or clear if moved outside)
  const store = useFlowStore.getState();
  const node = store.nodes.find((n) => n.id === nodeId);
  const currentLaneId = node ? (node.data as FlowNodeData).swimlaneId : undefined;
  if (assignedLaneId !== (currentLaneId || null)) {
    store.updateNodeData(nodeId, { swimlaneId: assignedLaneId || undefined });
  }
}

// ---------------------------------------------------------------------------
// Context menu state types
// ---------------------------------------------------------------------------

interface CanvasMenuState {
  x: number;
  y: number;
  flowX: number;
  flowY: number;
}

interface NodeMenuState {
  x: number;
  y: number;
  nodeId: string;
}

interface EdgeMenuState {
  x: number;
  y: number;
  edgeId: string;
  /** Which end of the edge the click was closest to */
  closestEnd: 'source' | 'target';
  /** Snapshot of selected edges at the time the menu was opened */
  selectedEdgeIds: string[];
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface FlowCanvasProps {
  /** Called when the ReactFlow instance is initialized, passing view control functions */
  onInit?: (controls: {
    zoomIn: () => void;
    zoomOut: () => void;
    fitView: () => void;
  }) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

// ---------------------------------------------------------------------------
// Inner canvas (must be inside ReactFlowProvider)
// ---------------------------------------------------------------------------

const FlowCanvasInner: React.FC<FlowCanvasProps> = ({ onInit, onUndo, onRedo, canUndo, canRedo }) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const rfInstance = useReactFlow();
  _rfInstance = rfInstance;
  const { screenToFlowPosition, zoomIn, zoomOut, fitView } = rfInstance;

  // Flow store
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const onNodesChange = useFlowStore((s) => s.onNodesChange);
  const onEdgesChange = useFlowStore((s) => s.onEdgesChange);
  const onConnect = useFlowStore((s) => s.onConnect);
  const addNode = useFlowStore((s) => s.addNode);
  const removeNode = useFlowStore((s) => s.removeNode);
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const setNodes = useFlowStore((s) => s.setNodes);
  // Note: setSelectedNodes/setSelectedEdges are accessed via useFlowStore.getState()
  // when needed (select-all, edge context menu) to avoid subscribing to unused values.

  // UI store
  const minimapVisible = useUIStore((s) => s.minimapVisible);
  const gridVisible = useUIStore((s) => s.gridVisible);
  const snapEnabled = useUIStore((s) => s.snapEnabled);
  const snapDistance = useUIStore((s) => s.snapDistance);
  const gridSpacing = useUIStore((s) => s.gridSpacing);
  const gridStyle = useUIStore((s) => s.gridStyle);
  const gridColorOverride = useUIStore((s) => s.gridColor);
  const rulerVisible = useUIStore((s) => s.rulerVisible);
  const showAlignmentGuides = useUIStore((s) => s.showAlignmentGuides);
  const setIsEditingNode = useUIStore((s) => s.setIsEditingNode);

  // Presentation mode
  const presentationMode = useUIStore((s) => s.presentationMode);

  // Freehand drawing mode
  const drawingMode = useUIStore((s) => s.drawingMode);

  // Style store
  const darkMode = useStyleStore((s) => s.darkMode);
  const activeStyleId = useStyleStore((s) => s.activeStyleId);
  const canvasColorOverride = useStyleStore((s) => s.canvasColorOverride);
  const activeStyle = activeStyleId ? diagramStyles[activeStyleId] ?? diagramStyles.cleanMinimal : diagramStyles.cleanMinimal;

  // Track Ctrl key for pan-on-drag mode (Ctrl+drag = pan, default drag = select)
  const [ctrlPressed, setCtrlPressed] = useState(false);
  const ctrlRef = useRef(false);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control') { ctrlRef.current = true; setCtrlPressed(true); }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') { ctrlRef.current = false; setCtrlPressed(false); }
    };
    const onBlur = () => { ctrlRef.current = false; setCtrlPressed(false); };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // Manual Ctrl+drag panning — bypasses d3-zoom for reliable pan behavior
  const panState = useRef<{ active: boolean; startX: number; startY: number; startVp: { x: number; y: number; zoom: number } } | null>(null);
  useEffect(() => {
    const wrapper = reactFlowWrapper.current;
    if (!wrapper) return;

    const onPointerDown = (e: PointerEvent) => {
      if (!ctrlRef.current || e.button !== 0) return;
      // Only start pan if clicking on the pane itself (not on a node/edge)
      const target = e.target as HTMLElement;
      if (target.closest('.react-flow__node') || target.closest('.react-flow__edge')) return;

      e.preventDefault();
      e.stopPropagation();
      const vp = rfInstance.getViewport();
      panState.current = { active: true, startX: e.clientX, startY: e.clientY, startVp: vp };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!panState.current?.active) return;
      const dx = e.clientX - panState.current.startX;
      const dy = e.clientY - panState.current.startY;
      const { x, y, zoom } = panState.current.startVp;
      rfInstance.setViewport({ x: x + dx, y: y + dy, zoom }, { duration: 0 });
    };

    const onPointerUp = (_e: PointerEvent) => {
      if (panState.current?.active) {
        panState.current = null;
      }
    };

    wrapper.addEventListener('pointerdown', onPointerDown, { capture: true });
    wrapper.addEventListener('pointermove', onPointerMove);
    wrapper.addEventListener('pointerup', onPointerUp);
    return () => {
      wrapper.removeEventListener('pointerdown', onPointerDown, { capture: true });
      wrapper.removeEventListener('pointermove', onPointerMove);
      wrapper.removeEventListener('pointerup', onPointerUp);
    };
  }, [rfInstance]);

  // Dependency store
  const walkModeActive = useDependencyStore((s) => s.walkModeActive);
  const highlightedChain = useDependencyStore((s) => s.highlightedChain);

  // Swimlane store
  const containers = useSwimlaneStore((s) => s.containers);
  const allHLanes = useMemo(() => containers.flatMap((c) => c.config.horizontal), [containers]);
  const allVLanes = useMemo(() => containers.flatMap((c) => c.config.vertical), [containers]);
  const hasLanes = allHLanes.length > 0 || allVLanes.length > 0;
  const setIsCreatingSwimlanes = useSwimlaneStore((s) => s.setIsCreating);

  // Re-assign all nodes to swimlanes when lane config or container offset changes
  useEffect(() => {
    if (!hasLanes) return;
    const allNodes = useFlowStore.getState().nodes;
    for (const n of allNodes) {
      if (n.type === 'groupNode') continue;
      const w = (n.data as FlowNodeData).width || 160;
      const h = (n.data as FlowNodeData).height || 60;
      assignSwimlaneToNode(n.id, n.position, w, h);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containers]);

  // Compute hidden lane IDs and filter nodes/edges for hidden lanes
  const hiddenLaneIds = useMemo(() => {
    const ids = new Set<string>();
    for (const lane of allHLanes) if (lane.hidden) ids.add(lane.id);
    for (const lane of allVLanes) if (lane.hidden) ids.add(lane.id);
    return ids;
  }, [allHLanes, allVLanes]);

  const visibleNodes = useMemo(() => {
    if (hiddenLaneIds.size === 0) return nodes;
    return nodes.map((n) => {
      const laneId = (n.data as Record<string, unknown>)?.swimlaneId as string | undefined;
      if (laneId && hiddenLaneIds.has(laneId)) {
        return { ...n, hidden: true };
      }
      return n;
    });
  }, [nodes, hiddenLaneIds]);

  const visibleEdges = useMemo(() => {
    if (hiddenLaneIds.size === 0) return edges;
    // Build set of hidden node IDs
    const hiddenNodeIds = new Set<string>();
    for (const n of nodes) {
      const laneId = (n.data as Record<string, unknown>)?.swimlaneId as string | undefined;
      if (laneId && hiddenLaneIds.has(laneId)) hiddenNodeIds.add(n.id);
    }
    if (hiddenNodeIds.size === 0) return edges;
    return edges.map((e) => {
      if (hiddenNodeIds.has(e.source) || hiddenNodeIds.has(e.target)) {
        return { ...e, hidden: true };
      }
      return e;
    });
  }, [edges, nodes, hiddenLaneIds]);

  // Legend — two independent legends
  const nodeLegendVisible = useLegendStore((s) => s.nodeLegend.visible && s.nodeLegend.items.length > 0);
  const swimlaneLegendVisible = useLegendStore((s) => s.swimlaneLegend.visible && s.swimlaneLegend.items.length > 0);

  // Banner store
  const topBanner = useBannerStore((s) => s.topBanner);
  const bottomBanner = useBannerStore((s) => s.bottomBanner);

  // Collaboration store
  const isCollaborating = useCollabStore((s) => s.isCollaborating);

  // Broadcast cursor position to remote peers on mouse move
  const collabMouseMoveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isCollaborating) return;
    const handler = (e: MouseEvent) => {
      // Throttle to ~20fps via the awareness module's internal throttle
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      // Lazy-import to avoid loading collab code in solo mode
      import('../../collab').then(({ broadcastCursorPosition, getProvider }) => {
        const provider = getProvider();
        if (provider) broadcastCursorPosition(provider.awareness, pos);
      });
    };
    const wrapper = reactFlowWrapper.current;
    wrapper?.addEventListener('mousemove', handler);
    return () => {
      wrapper?.removeEventListener('mousemove', handler);
      if (collabMouseMoveRef.current) clearTimeout(collabMouseMoveRef.current);
    };
  }, [isCollaborating, screenToFlowPosition]);

  // Broadcast selection changes to remote peers
  const selectedNodes = useFlowStore((s) => s.selectedNodes);
  const selectedEdges = useFlowStore((s) => s.selectedEdges);
  useEffect(() => {
    if (!isCollaborating) return;
    import('../../collab').then(({ broadcastSelection, getProvider }) => {
      const provider = getProvider();
      if (provider) broadcastSelection(provider.awareness, selectedNodes, selectedEdges);
    });
  }, [isCollaborating, selectedNodes, selectedEdges]);

  // Hovered node tracking (for Ctrl+Wheel border-width adjustment)
  const hoveredNodeRef = useRef<string | null>(null);

  // Edge reconnect tracking
  const edgeReconnectSuccessful = useRef(true);

  // Link group drag tracking
  const linkGroupDragRef = useRef<{
    linkGroupId: string;
    startPositions: Map<string, { x: number; y: number }>;
    dragNodeId: string;
    dragStartPos: { x: number; y: number };
  } | null>(null);

  // Swimlane drag tracking — when swimlane is selected and nodes are dragged, move swimlane too
  const swimlaneDragRef = useRef<{
    dragNodeStartPos: { x: number; y: number };
    startContainerOffset: { x: number; y: number };
    containerId: string;
  } | null>(null);

  // Context menu state
  const [canvasMenu, setCanvasMenu] = useState<CanvasMenuState | null>(null);
  const [nodeMenu, setNodeMenu] = useState<NodeMenuState | null>(null);
  const [edgeMenu, setEdgeMenu] = useState<EdgeMenuState | null>(null);
  const [selectionMenu, setSelectionMenu] = useState<{ x: number; y: number; nodeIds: string[] } | null>(null);

  // Alignment guide lines (computed during drag)
  const [alignmentGuides, setAlignmentGuides] = useState<{ vertical: number[]; horizontal: number[] }>({ vertical: [], horizontal: [] });
  // Distance guide measurements (computed during drag)
  const [distanceGuides, setDistanceGuides] = useState<DistanceGuides>({ gaps: [] });

  // ---- Resize guide computation (custom events from NodeResizer) -----------

  useEffect(() => {
    const handleResize = (e: Event) => {
      if (!showAlignmentGuides) return;
      const { nodeId, x, y, width, height } = (e as CustomEvent).detail;
      const virtualNode: SnapNode = { id: nodeId, position: { x, y }, width, height };
      const allNodes = useFlowStore.getState().nodes as unknown as SnapNode[];
      const guides = findAlignmentGuides(virtualNode, allNodes, snapDistance);
      setAlignmentGuides(guides);
      const dGuides = findDistanceGuides(virtualNode, allNodes);
      setDistanceGuides(dGuides);
    };
    const handleResizeEnd = () => {
      setAlignmentGuides({ vertical: [], horizontal: [] });
      setDistanceGuides({ gaps: [] });
    };
    window.addEventListener('charthero:node-resize', handleResize);
    window.addEventListener('charthero:node-resize-end', handleResizeEnd);
    return () => {
      window.removeEventListener('charthero:node-resize', handleResize);
      window.removeEventListener('charthero:node-resize-end', handleResizeEnd);
    };
  }, [showAlignmentGuides, snapDistance]);

  // ---- Helpers ------------------------------------------------------------

  const createNodeAtPosition = useCallback(
    (x: number, y: number, shapeType: string = 'rectangle') => {
      const position = screenToFlowPosition({ x, y });
      const data: Record<string, unknown> = {
        label: shapeType === 'textbox' ? 'Text' : 'New Node',
        shape: shapeType as FlowNodeData['shape'],
      };
      // Textbox: transparent fill, no border — resolver handles text color
      if (shapeType === 'textbox') {
        data.color = 'transparent';
        data.borderColor = 'transparent';
        data.borderWidth = 0;
      }
      const newNode: FlowNode = {
        id: nextId(),
        type: 'shapeNode',
        position,
        data: data as FlowNodeData,
      };
      addNode(newNode);
      // Auto-assign to swimlane based on drop position
      assignSwimlaneToNode(newNode.id, position);
      // Auto-select the new node
      useFlowStore.getState().setSelectedNodes([newNode.id]);
      return newNode.id;
    },
    [screenToFlowPosition, addNode],
  );

  // ---- Drag & drop from palette -------------------------------------------

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (presentationMode) return;
      // Handle connector drop — create two tiny endpoint nodes + edge
      const connectorType = event.dataTransfer.getData('application/charthero-connector');
      if (connectorType) {
        const dropPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        const gap = 200;
        const edgeId = `edge_${Date.now()}`;
        const sourceId = nextId();
        const targetId = nextId();
        const sourceNode: FlowNode = {
          id: sourceId,
          type: 'endpointNode',
          position: { x: dropPos.x - gap / 2, y: dropPos.y - 6 },
          data: {
            label: '',
            shape: 'circle' as const,
            width: 12,
            height: 12,
            isConnectorEndpoint: true,
            connectorEdgeId: edgeId,
            endpointRole: 'source',
          },
        };
        const targetNode: FlowNode = {
          id: targetId,
          type: 'endpointNode',
          position: { x: dropPos.x + gap / 2, y: dropPos.y - 6 },
          data: {
            label: '',
            shape: 'circle' as const,
            width: 12,
            height: 12,
            isConnectorEndpoint: true,
            connectorEdgeId: edgeId,
            endpointRole: 'target',
          },
        };
        addNode(sourceNode);
        addNode(targetNode);

        const { edges, setEdges } = useFlowStore.getState();
        const newEdge: FlowEdge = {
          id: edgeId,
          source: sourceId,
          target: targetId,
          sourceHandle: 'center',
          targetHandle: 'center',
          type: connectorType,
          data: {},
        };
        setEdges([...edges, newEdge]);
        // Select the edge (not the endpoint nodes)
        useFlowStore.getState().setSelectedEdges([edgeId]);
        useUIStore.getState().setDefaultEdgeType(connectorType);
        return;
      }

      // Handle extension pack item drop — create an extensionNode (icon) + textbox (label)
      // linked together so they move as a unit but can be ungrouped independently.
      const extensionData = event.dataTransfer.getData('application/charthero-extension');
      if (extensionData) {
        try {
          const { packId, itemId } = JSON.parse(extensionData);
          const pack = useExtensionStore.getState().packs.find((p) => p.id === packId);
          const item = pack?.items.find((i) => i.id === itemId);
          if (item) {
            const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
            const iconId = nextId();
            const labelId = nextId();

            // Icon node — extensionNode with no label
            const iconNode: FlowNode = {
              id: iconId,
              type: 'extensionNode',
              position,
              data: {
                label: '',
                shape: 'rectangle' as NodeShape,
                extensionPackId: packId,
                extensionItemId: itemId,
                svgContent: item.svgContent,
                labelPosition: 'below',
                width: item.defaultWidth,
                height: item.defaultHeight,
              } as FlowNodeData,
            };

            // Label node — textbox positioned below the icon
            const labelNode: FlowNode = {
              id: labelId,
              type: 'shapeNode',
              position: {
                x: position.x + (item.defaultWidth / 2) - 50,
                y: position.y + item.defaultHeight + 4,
              },
              data: {
                label: item.name,
                shape: 'textbox' as NodeShape,
                width: 100,
                height: 24,
                fontSize: 14,
                textAlign: 'center',
                color: 'transparent',
                borderColor: 'transparent',
                borderWidth: 0,
                opacity: 0,
              } as FlowNodeData,
            };

            addNode(iconNode);
            addNode(labelNode);

            // Link-group them so they move together
            const lgId = useFlowStore.getState().createLinkGroup([iconId, labelId]);
            // Tag the icon so we know it has a paired label
            useFlowStore.getState().updateNodeData(iconId, { pairedLabelNodeId: labelId, linkGroupId: lgId });
            useFlowStore.getState().updateNodeData(labelId, { pairedIconNodeId: iconId, linkGroupId: lgId });

            useFlowStore.getState().setSelectedNodes([iconId, labelId]);
          }
        } catch { /* ignore parse errors */ }
        return;
      }

      // Handle swimlane container drop — create a new swimlane container at drop position
      const swimlaneDrop = event.dataTransfer.getData('application/charthero-swimlane');
      if (swimlaneDrop) {
        const dropPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        const swimStore = useSwimlaneStore.getState();
        const newContainer = createDefaultContainer(dropPos);
        swimStore.addContainer(newContainer);
        swimStore.setActiveContainerId(newContainer.id);
        // Signal that this is a drag-drop (create-new) workflow
        useSwimlaneStore.setState({ creatingForContainerId: newContainer.id });
        // Open creation dialog for this new container
        swimStore.setIsCreating(true);
        useUIStore.getState().setActivePanelTab('lane');
        if (!useUIStore.getState().propertiesPanelOpen) {
          useUIStore.getState().togglePropertiesPanel();
        }
        return;
      }

      const shapeType = event.dataTransfer.getData('application/charthero-shape');
      if (!shapeType) return;
      log.debug('onDrop shape', shapeType);

      // Handle group/container shape
      if (shapeType === 'group') {
        const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        const newNode: FlowNode = {
          id: nextId(),
          type: 'groupNode',
          position,
          data: {
            label: 'Group',
            shape: 'group',
            width: 300,
            height: 200,
          },
        };
        addNode(newNode);
        assignSwimlaneToNode(newNode.id, position, 300, 200);
        useFlowStore.getState().setSelectedNodes([newNode.id]);
        return;
      }

      const iconName = event.dataTransfer.getData('application/charthero-icon');
      if (iconName) {
        const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        const isIconOnly = shapeType === 'iconOnly';
        const newNode: FlowNode = {
          id: nextId(),
          type: 'shapeNode',
          position,
          data: {
            label: iconName,
            shape: isIconOnly ? 'circle' : (shapeType as FlowNodeData['shape']),
            icon: iconName,
            iconOnly: isIconOnly,
            ...(isIconOnly ? { width: 60, height: 60 } : {}),
          },
        };
        addNode(newNode);
        // Auto-assign to swimlane based on drop position
        assignSwimlaneToNode(newNode.id, position, isIconOnly ? 60 : 160, isIconOnly ? 60 : 60);
        // Auto-select the new node
        useFlowStore.getState().setSelectedNodes([newNode.id]);

        // Clear palette shape selection after icon drop
        useUIStore.getState().setSelectedPaletteShape(null);

        // Check if dropped inside a group
        const groupNodes = useFlowStore.getState().nodes.filter(
          (n) => n.type === 'groupNode' && n.id !== newNode.id,
        );
        for (const group of groupNodes) {
          const gw = group.data.width || 300;
          const gh = group.data.height || 200;
          if (
            position.x >= group.position.x &&
            position.y >= group.position.y &&
            position.x <= group.position.x + gw &&
            position.y <= group.position.y + gh
          ) {
            // Parent to this group
            const allNodes = useFlowStore.getState().nodes;
            const updated = allNodes.map((n) =>
              n.id === newNode.id
                ? {
                    ...n,
                    parentId: group.id,
                    extent: 'parent' as const,
                    position: { x: position.x - group.position.x, y: position.y - group.position.y },
                    data: { ...n.data, groupId: group.id },
                  }
                : n,
            );
            setNodes(updated);
            break;
          }
        }
      } else {
        const nodeId = createNodeAtPosition(event.clientX, event.clientY, shapeType);

        // Check if dropped inside a group
        const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        const groupNodes = useFlowStore.getState().nodes.filter(
          (n) => n.type === 'groupNode' && n.id !== nodeId,
        );
        for (const group of groupNodes) {
          const gw = group.data.width || 300;
          const gh = group.data.height || 200;
          if (
            position.x >= group.position.x &&
            position.y >= group.position.y &&
            position.x <= group.position.x + gw &&
            position.y <= group.position.y + gh
          ) {
            const allNodes = useFlowStore.getState().nodes;
            const updated = allNodes.map((n) =>
              n.id === nodeId
                ? {
                    ...n,
                    parentId: group.id,
                    extent: 'parent' as const,
                    position: { x: position.x - group.position.x, y: position.y - group.position.y },
                    data: { ...n.data, groupId: group.id },
                  }
                : n,
            );
            setNodes(updated);
            break;
          }
        }
      }
    },
    [createNodeAtPosition, screenToFlowPosition, addNode],
  );

  // ---- Double-click to add node -------------------------------------------

  const onDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      if (presentationMode) return;
      // Only if we clicked on the pane (not on a node, edge, or edge label)
      const target = event.target as HTMLElement;
      if (target.closest('.react-flow__node') || target.closest('.react-flow__edge') || target.closest('.react-flow__edgelabel') || target.closest('.edge-label-container')) return;
      const nodeId = createNodeAtPosition(event.clientX, event.clientY);
      // Start editing the label immediately
      setTimeout(() => setIsEditingNode(nodeId), 50);
    },
    [createNodeAtPosition, setIsEditingNode],
  );

  // ---- Right-click context menus ------------------------------------------

  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      if (presentationMode) return;
      // Close any existing menus
      setNodeMenu(null);
      setEdgeMenu(null);

      // If multiple nodes are selected, show selection context menu
      const selectedNodes = useFlowStore.getState().selectedNodes;
      if (selectedNodes.length > 1) {
        setSelectionMenu({ x: event.clientX, y: event.clientY, nodeIds: selectedNodes });
        setCanvasMenu(null);
        return;
      }

      const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      setCanvasMenu({
        x: event.clientX,
        y: event.clientY,
        flowX: flowPos.x,
        flowY: flowPos.y,
      });
    },
    [screenToFlowPosition],
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: FlowNode) => {
      event.preventDefault();
      if (presentationMode) return;
      // For connector endpoints, show the edge context menu instead
      if ((node.data as FlowNodeData).isConnectorEndpoint) {
        const edgeId = (node.data as FlowNodeData).connectorEdgeId as string | undefined;
        const role = (node.data as FlowNodeData).endpointRole as 'source' | 'target' | undefined;
        if (edgeId) {
          setEdgeMenu({ x: event.clientX, y: event.clientY, edgeId, closestEnd: role ?? 'source', selectedEdgeIds: useFlowStore.getState().selectedEdges });
          setNodeMenu(null);
          setCanvasMenu(null);
          setSelectionMenu(null);
        }
        return;
      }
      const selectedNodes = useFlowStore.getState().selectedNodes;
      if (selectedNodes.length > 1 && selectedNodes.includes(node.id)) {
        setSelectionMenu({ x: event.clientX, y: event.clientY, nodeIds: selectedNodes });
        setNodeMenu(null);
        setCanvasMenu(null);
      } else {
        setNodeMenu({
          x: event.clientX,
          y: event.clientY,
          nodeId: node.id,
        });
        setSelectionMenu(null);
        setCanvasMenu(null);
      }
    },
    [],
  );

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: FlowEdge) => {
      event.preventDefault();
      if (presentationMode) return;

      // Determine which end of the edge the click is closest to
      const store = useFlowStore.getState();
      const sourceNode = store.getNode(edge.source);
      const targetNode = store.getNode(edge.target);
      let closestEnd: 'source' | 'target' = 'target';

      if (sourceNode && targetNode && rfInstance) {
        const vp = rfInstance.getViewport();
        // Convert click position (screen) to flow coordinates
        const flowX = (event.clientX - vp.x) / vp.zoom;
        const flowY = (event.clientY - vp.y) / vp.zoom;
        // Compute center of source and target nodes
        const sx = sourceNode.position.x + (sourceNode.measured?.width ?? 100) / 2;
        const sy = sourceNode.position.y + (sourceNode.measured?.height ?? 60) / 2;
        const tx = targetNode.position.x + (targetNode.measured?.width ?? 100) / 2;
        const ty = targetNode.position.y + (targetNode.measured?.height ?? 60) / 2;
        const distSource = (flowX - sx) ** 2 + (flowY - sy) ** 2;
        const distTarget = (flowX - tx) ** 2 + (flowY - ty) ** 2;
        closestEnd = distSource < distTarget ? 'source' : 'target';
      }

      // Capture selected edges from both the store AND edge.selected flags (in case store hasn't synced yet)
      const storeSelected = new Set(store.selectedEdges);
      for (const e of store.edges) {
        if (e.selected) storeSelected.add(e.id);
      }
      storeSelected.add(edge.id);
      setEdgeMenu({ x: event.clientX, y: event.clientY, edgeId: edge.id, closestEnd, selectedEdgeIds: Array.from(storeSelected) });
      setCanvasMenu(null);
      setNodeMenu(null);
      setSelectionMenu(null);
    },
    [],
  );

  const closeContextMenus = useCallback(() => {
    setCanvasMenu(null);
    setNodeMenu(null);
    setEdgeMenu(null);
    setSelectionMenu(null);
    useUIStore.getState().clearPuckSelection();
    // Deselect all swimlane containers on pane click
    for (const c of useSwimlaneStore.getState().containers) {
      if (c.selected) useSwimlaneStore.getState().setSwimlaneSelected(false, c.id);
    }
  }, []);

  // ---- Canvas context menu handlers ----------------------------------------

  const handleAddNodeAtMenu = useCallback(() => {
    if (canvasMenu) {
      createNodeAtPosition(canvasMenu.x, canvasMenu.y);
    }
  }, [canvasMenu, createNodeAtPosition]);

  const handleSelectAll = useCallback(() => {
    const allNodeIds = nodes.map((n) => n.id);
    useFlowStore.getState().setSelectedNodes(allNodeIds);
  }, [nodes]);

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2 });
  }, [fitView]);

  const handleInsertSwimlanes = useCallback(() => {
    setIsCreatingSwimlanes(true);
  }, [setIsCreatingSwimlanes]);

  // ---- Node context menu handlers ------------------------------------------

  const handleEditLabel = useCallback(() => {
    if (nodeMenu) {
      setIsEditingNode(nodeMenu.nodeId);
    }
  }, [nodeMenu, setIsEditingNode]);

  const handleDuplicateNode = useCallback(() => {
    if (!nodeMenu) return;
    const original = useFlowStore.getState().getNode(nodeMenu.nodeId);
    if (!original) return;
    // Strip group memberships so the duplicate is independent
    const { linkGroupId: _lg, groupId: _gid, ...cleanData } = original.data;
    const newNode: FlowNode = {
      id: nextId(),
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
    };
    addNode(newNode);
  }, [nodeMenu, addNode]);

  const handleCopyNode = useCallback(() => {
    // Copy node data to clipboard as JSON
    if (!nodeMenu) return;
    const node = useFlowStore.getState().getNode(nodeMenu.nodeId);
    if (node) {
      navigator.clipboard.writeText(JSON.stringify(node)).catch((e) => log.error('Copy node to clipboard failed', e));
    }
  }, [nodeMenu]);

  const handleDeleteNode = useCallback(() => {
    if (nodeMenu) {
      removeNode(nodeMenu.nodeId);
    }
  }, [nodeMenu, removeNode]);

  const handleChangeShape = useCallback(
    (shape: NodeShape) => {
      if (!nodeMenu) return;
      const node = useFlowStore.getState().getNode(nodeMenu.nodeId);
      if (node?.type === 'groupNode') {
        // Convert group node to shape node, releasing children
        const currentNodes = useFlowStore.getState().nodes;
        const updated = currentNodes.map((n) => {
          if (n.id === nodeMenu.nodeId) {
            return {
              ...n,
              type: 'shapeNode',
              style: undefined,
              data: { ...n.data, shape, width: 160, height: 60 },
            };
          }
          // Release children from this group
          if (n.parentId === nodeMenu.nodeId) {
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
        setNodes(updated);
      } else {
        updateNodeData(nodeMenu.nodeId, { shape });
      }
    },
    [nodeMenu, updateNodeData, setNodes],
  );

  const handleChangeColor = useCallback(
    (color: string) => {
      if (nodeMenu) {
        updateNodeData(nodeMenu.nodeId, { color });
      }
    },
    [nodeMenu, updateNodeData],
  );

  const handleSendToBack = useCallback(() => {
    if (!nodeMenu) return;
    const currentNodes = useFlowStore.getState().nodes;
    const idx = currentNodes.findIndex((n) => n.id === nodeMenu.nodeId);
    if (idx >= 0) {
      const moved = [...currentNodes];
      const [node] = moved.splice(idx, 1);
      moved.unshift({ ...node, zIndex: -1 });
      setNodes(moved);
    }
  }, [nodeMenu, setNodes]);

  const handleBringToFront = useCallback(() => {
    if (!nodeMenu) return;
    const currentNodes = useFlowStore.getState().nodes;
    const idx = currentNodes.findIndex((n) => n.id === nodeMenu.nodeId);
    if (idx >= 0) {
      const moved = [...currentNodes];
      const [node] = moved.splice(idx, 1);
      const { zIndex: _z, ...rest } = node;
      moved.push(rest);
      setNodes(moved);
    }
  }, [nodeMenu, setNodes]);

  const handleSendBackward = useCallback(() => {
    if (!nodeMenu) return;
    const currentNodes = useFlowStore.getState().nodes;
    const idx = currentNodes.findIndex((n) => n.id === nodeMenu.nodeId);
    if (idx > 0) {
      const moved = [...currentNodes];
      [moved[idx - 1], moved[idx]] = [moved[idx], moved[idx - 1]];
      setNodes(moved);
    }
  }, [nodeMenu, setNodes]);

  const handleBringForward = useCallback(() => {
    if (!nodeMenu) return;
    const currentNodes = useFlowStore.getState().nodes;
    const idx = currentNodes.findIndex((n) => n.id === nodeMenu.nodeId);
    if (idx < currentNodes.length - 1) {
      const moved = [...currentNodes];
      // Clear negative zIndex when bringing forward
      if (moved[idx].zIndex !== undefined && moved[idx].zIndex! < 0) {
        const { zIndex: _z, ...rest } = moved[idx];
        moved[idx] = rest as (typeof moved)[number];
      }
      [moved[idx], moved[idx + 1]] = [moved[idx + 1], moved[idx]];
      setNodes(moved);
    }
  }, [nodeMenu, setNodes]);

  // ---- Ungroup a group node -------------------------------------------------

  const handleUngroupNode = useCallback(() => {
    if (!nodeMenu) return;
    const currentNodes = useFlowStore.getState().nodes;
    const groupNode = currentNodes.find((n) => n.id === nodeMenu.nodeId);
    if (!groupNode || groupNode.type !== 'groupNode') return;

    // Convert child positions back to absolute and remove parentId
    const updatedNodes = currentNodes
      .filter((n) => n.id !== nodeMenu.nodeId)
      .map((n) => {
        if (n.parentId === nodeMenu.nodeId) {
          return {
            ...n,
            parentId: undefined,
            extent: undefined,
            position: {
              x: n.position.x + groupNode.position.x,
              y: n.position.y + groupNode.position.y,
            },
          };
        }
        return n;
      });
    setNodes(updatedNodes);
  }, [nodeMenu, setNodes]);

  // ---- Edge context menu handlers -------------------------------------------

  /** Get all edge IDs that should be affected: the right-clicked edge + any other selected edges (snapshot from menu open) */
  const getTargetEdgeIds = useCallback(() => {
    if (!edgeMenu) return [];
    const ids = new Set(edgeMenu.selectedEdgeIds);
    ids.add(edgeMenu.edgeId);
    return Array.from(ids);
  }, [edgeMenu]);

  const handleEdgeChangeType = useCallback(
    (type: string) => {
      if (!edgeMenu) return;
      const targetIds = new Set(getTargetEdgeIds());
      const currentEdges = useFlowStore.getState().edges;
      const updated = currentEdges.map((e) =>
        targetIds.has(e.id) ? { ...e, type } : e,
      );
      useFlowStore.getState().setEdges(updated);
    },
    [edgeMenu, getTargetEdgeIds],
  );

  const handleEdgeChangeColor = useCallback(
    (color: string) => {
      if (!edgeMenu) return;
      const store = useFlowStore.getState();
      for (const eid of getTargetEdgeIds()) {
        const edge = store.getEdge(eid);
        const existing = (edge?.data as Record<string, unknown>)?.styleOverrides as Record<string, unknown> | undefined;
        store.updateEdgeData(eid, {
          color,
          styleOverrides: { ...existing, stroke: color },
        });
      }
    },
    [edgeMenu, getTargetEdgeIds],
  );

  const handleEdgeEditLabel = useCallback(() => {
    if (!edgeMenu) return;
    // Set label to trigger the label input in the properties panel
    const edge = useFlowStore.getState().getEdge(edgeMenu.edgeId);
    if (edge) {
      useFlowStore.getState().updateEdgeData(edgeMenu.edgeId, {
        label: edge.data?.label || 'Label',
      });
      // Select this edge so properties panel opens
      useFlowStore.getState().setSelectedEdges([edgeMenu.edgeId]);
    }
  }, [edgeMenu]);

  const handleEdgeDelete = useCallback(() => {
    if (!edgeMenu) return;
    const targetIds = new Set(getTargetEdgeIds());
    const currentEdges = useFlowStore.getState().edges;
    useFlowStore.getState().setEdges(currentEdges.filter((e) => !targetIds.has(e.id)));
  }, [edgeMenu, getTargetEdgeIds]);

  const handleEdgeStraighten = useCallback(() => {
    if (!edgeMenu) return;
    const store = useFlowStore.getState();
    for (const eid of getTargetEdgeIds()) {
      const edge = store.getEdge(eid);
      if (!edge) continue;
      const sourceNode = store.getNode(edge.source);
      const targetNode = store.getNode(edge.target);
      if (!sourceNode || !targetNode) continue;

      const srcW = (sourceNode.data as Record<string, unknown>).width as number || 160;
      const srcH = (sourceNode.data as Record<string, unknown>).height as number || 60;
      const tgtW = (targetNode.data as Record<string, unknown>).width as number || 160;
      const tgtH = (targetNode.data as Record<string, unknown>).height as number || 60;

      // Determine direction from handle positions; infer from node positions if no handles
      const sh = edge.sourceHandle || '';
      const th = edge.targetHandle || '';
      let isVertical: boolean;
      if (sh || th) {
        isVertical = sh.includes('top') || sh.includes('bottom') || th.includes('top') || th.includes('bottom');
      } else {
        const srcCx = sourceNode.position.x + srcW / 2;
        const srcCy = sourceNode.position.y + srcH / 2;
        const tgtCx = targetNode.position.x + tgtW / 2;
        const tgtCy = targetNode.position.y + tgtH / 2;
        isVertical = Math.abs(tgtCy - srcCy) >= Math.abs(tgtCx - srcCx);
      }

      if (isVertical) {
        const srcCenterX = sourceNode.position.x + srcW / 2;
        store.updateNodePosition(targetNode.id, {
          x: srcCenterX - tgtW / 2,
          y: targetNode.position.y,
        });
      } else {
        const srcCenterY = sourceNode.position.y + srcH / 2;
        store.updateNodePosition(targetNode.id, {
          x: targetNode.position.x,
          y: srcCenterY - tgtH / 2,
        });
      }
    }
  }, [edgeMenu, getTargetEdgeIds]);

  /** Check if the right-clicked node is a group node */
  const isNodeMenuGroupNode = nodeMenu
    ? nodes.find((n) => n.id === nodeMenu.nodeId)?.type === 'groupNode'
    : false;

  // ---- Valid connection check ----------------------------------------------

  const isValidConnection: IsValidConnection = useCallback((connection) => {
    // Prevent self-connections
    return connection.source !== connection.target;
  }, []);

  // ---- Expose view controls via onInit -----------------------------------

  const handleReactFlowInit = useCallback(
    (_instance: ReactFlowInstance<FlowNode>) => {
      onInit?.({
        zoomIn: () => zoomIn(),
        zoomOut: () => zoomOut(),
        fitView: () => fitView({ padding: 0.2 }),
      });
    },
    [onInit, zoomIn, zoomOut, fitView],
  );

  // ---- Format Painter: apply styles on node/edge click ----------------------

  const formatPainterActive = useUIStore((s) => s.formatPainterActive);
  const formatPainterNodeStyle = useUIStore((s) => s.formatPainterNodeStyle);
  const formatPainterEdgeStyle = useUIStore((s) => s.formatPainterEdgeStyle);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: FlowNode) => {
      // Shift-click selection is handled natively by React Flow via
      // multiSelectionKeyCode="Shift" — no custom logic needed here.
      if (_event.shiftKey) return;

      // Skip interactions for connector endpoint nodes
      if ((node.data as FlowNodeData).isConnectorEndpoint) return;
      // Link group add-mode: clicking a node adds it to the group
      const lgUI = useUIStore.getState();
      if (lgUI.linkGroupAddMode && lgUI.linkGroupEditorId) {
        // Defer to next tick so React Flow finishes its click/selection processing first
        const lgId = lgUI.linkGroupEditorId;
        const nId = node.id;
        queueMicrotask(() => {
          useFlowStore.getState().addNodeToLinkGroup(nId, lgId);
        });
        return;
      }

      if (!formatPainterActive || !formatPainterNodeStyle) return;
      log.debug('Format painter applied to node', node.id);
      // Build patch from copied style
      const patch: Record<string, unknown> = {};
      const s = formatPainterNodeStyle;
      if (s.color !== undefined) patch.color = s.color;
      if (s.borderColor !== undefined) patch.borderColor = s.borderColor;
      if (s.textColor !== undefined) patch.textColor = s.textColor;
      if (s.fontSize !== undefined) patch.fontSize = s.fontSize;
      if (s.fontWeight !== undefined) patch.fontWeight = s.fontWeight;
      if (s.fontFamily !== undefined) patch.fontFamily = s.fontFamily;
      if (s.borderStyle !== undefined) patch.borderStyle = s.borderStyle;
      if (s.borderWidth !== undefined) patch.borderWidth = s.borderWidth;
      if (s.borderRadius !== undefined) patch.borderRadius = s.borderRadius;
      if (s.opacity !== undefined) patch.opacity = s.opacity;
      if (s.textAlign !== undefined) patch.textAlign = s.textAlign;

      // Apply to the clicked node
      updateNodeData(node.id, patch as Partial<FlowNodeData>);

      // Also apply to all other selected nodes (bulk format)
      const { selectedNodes } = useFlowStore.getState();
      for (const id of selectedNodes) {
        if (id !== node.id) {
          updateNodeData(id, patch as Partial<FlowNodeData>);
        }
      }

      // In single-apply mode, deactivate after one use
      if (!useUIStore.getState().formatPainterPersistent) {
        useUIStore.getState().clearFormatPainter();
      }
    },
    [formatPainterActive, formatPainterNodeStyle, updateNodeData],
  );

  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: FlowEdge) => {
      // Shift-click selection is handled natively by React Flow via
      // multiSelectionKeyCode="Shift" — no custom logic needed here.
      if (_event.shiftKey) return;

      if (!formatPainterActive || !formatPainterEdgeStyle) return;
      const s = formatPainterEdgeStyle;
      const patch: Record<string, unknown> = {};
      if (s.color !== undefined) patch.color = s.color;
      if (s.thickness !== undefined) patch.thickness = s.thickness;
      if (s.opacity !== undefined) patch.opacity = s.opacity;
      if (s.strokeDasharray !== undefined) patch.strokeDasharray = s.strokeDasharray;
      if (s.labelColor !== undefined) patch.labelColor = s.labelColor;
      useFlowStore.getState().updateEdgeData(edge.id, patch);
    },
    [formatPainterActive, formatPainterEdgeStyle],
  );

  // Escape key to cancel format painter
  React.useEffect(() => {
    if (!formatPainterActive) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        useUIStore.getState().clearFormatPainter();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [formatPainterActive]);

  // ---- Link group drag handlers -----------------------------------------------

  const onNodeDragStart = useCallback(
    (_event: React.MouseEvent, node: FlowNode) => {
      // Swimlane drag: if any container is selected, save start state
      const slStore = useSwimlaneStore.getState();
      const selectedContainer = slStore.containers.find((c) => c.selected);
      if (selectedContainer) {
        swimlaneDragRef.current = {
          dragNodeStartPos: { ...node.position },
          startContainerOffset: { ...selectedContainer.containerOffset },
          containerId: selectedContainer.id,
        };
      } else {
        swimlaneDragRef.current = null;
      }

      const lgId = (node.data as FlowNodeData).linkGroupId;
      const allNodes = useFlowStore.getState().nodes;

      if (!lgId) {
        linkGroupDragRef.current = null;
        return;
      }
      // Store start positions of all siblings in this link group
      const startPositions = new Map<string, { x: number; y: number }>();
      for (const n of allNodes) {
        if ((n.data as FlowNodeData).linkGroupId === lgId && n.id !== node.id) {
          startPositions.set(n.id, { ...n.position });
        }
      }
      linkGroupDragRef.current = {
        linkGroupId: lgId,
        startPositions,
        dragNodeId: node.id,
        dragStartPos: { ...node.position },
      };
    },
    [],
  );

  // Track the last alignment-snapped position so we can re-apply it on drop.
  // React Flow's onNodeDragStop fires its own final position update from the
  // mouse + grid snap, which overwrites our custom snap. This ref lets us
  // correct that in onNodeDragStop.
  const alignSnapRef = useRef<{ nodeId: string; pos: { x: number; y: number } } | null>(null);

  const onNodeDrag = useCallback(
    (event: React.MouseEvent, node: FlowNode) => {
      // Swimlane drag: move swimlane container along with nodes
      const slDrag = swimlaneDragRef.current;
      if (slDrag) {
        const dx = node.position.x - slDrag.dragNodeStartPos.x;
        const dy = node.position.y - slDrag.dragNodeStartPos.y;
        useSwimlaneStore.getState().setContainerOffset({
          x: slDrag.startContainerOffset.x + dx,
          y: slDrag.startContainerOffset.y + dy,
        }, slDrag.containerId);
      }

      // Link group drag
      const ref = linkGroupDragRef.current;
      if (ref && node.id === ref.dragNodeId) {
        const dx = node.position.x - ref.dragStartPos.x;
        const dy = node.position.y - ref.dragStartPos.y;
        for (const [sibId, startPos] of ref.startPositions) {
          useFlowStore.getState().updateNodePosition(sibId, {
            x: startPos.x + dx,
            y: startPos.y + dy,
          });
        }
      }

      // Alignment guides
      if (showAlignmentGuides) {
        const allNodes = useFlowStore.getState().nodes;
        const guides = findAlignmentGuides(node as unknown as SnapNode, allNodes as unknown as SnapNode[], snapDistance);
        setAlignmentGuides(guides);

        // Distance guides (edge-to-edge measurements)
        const dGuides = findDistanceGuides(node as unknown as SnapNode, allNodes as unknown as SnapNode[]);
        setDistanceGuides(dGuides);

        // Shift-to-snap: when Shift is held and guides are visible, snap to guide
        if (event.shiftKey) {
          let snapPos: { x: number; y: number } | null = null;

          // Alignment snap
          if (guides.vertical.length > 0 || guides.horizontal.length > 0) {
            snapPos = snapToAlignmentGuides(node as unknown as SnapNode, guides, snapDistance);
          }

          // Equal-spacing snap (overrides alignment snap on matching axes)
          if (dGuides.equalSpacingSnap) {
            const eq = dGuides.equalSpacingSnap;
            snapPos = {
              x: eq.x !== node.position.x ? eq.x : (snapPos?.x ?? node.position.x),
              y: eq.y !== node.position.y ? eq.y : (snapPos?.y ?? node.position.y),
            };
          }

          if (snapPos && (snapPos.x !== node.position.x || snapPos.y !== node.position.y)) {
            useFlowStore.getState().updateNodePosition(node.id, snapPos);
            alignSnapRef.current = { nodeId: node.id, pos: snapPos };
          } else {
            alignSnapRef.current = null;
          }
        } else {
          alignSnapRef.current = null;
        }
      } else {
        alignSnapRef.current = null;
        setDistanceGuides({ gaps: [] });
      }
    },
    [showAlignmentGuides, snapDistance],
  );

  // Assign swimlane ID when a node is dropped
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: FlowNode) => {
      // Skip swimlane assignment for connector endpoint nodes
      if ((node.data as FlowNodeData).isConnectorEndpoint) {
        setAlignmentGuides({ vertical: [], horizontal: [] });
        setDistanceGuides({ gaps: [] });
        return;
      }
      const nodeW = (node.data as FlowNodeData).width || 160;
      const nodeH = (node.data as FlowNodeData).height || 60;

      // Re-apply alignment snap if active — React Flow's final position update
      // from the mouse overwrites our snap, so we correct it here.
      const snap = alignSnapRef.current;
      if (snap && snap.nodeId === node.id) {
        useFlowStore.getState().updateNodePosition(node.id, snap.pos);
        assignSwimlaneToNode(node.id, snap.pos, nodeW, nodeH);
        alignSnapRef.current = null;
      } else {
        assignSwimlaneToNode(node.id, node.position, nodeW, nodeH);
      }

      // Clear alignment and distance guides
      setAlignmentGuides({ vertical: [], horizontal: [] });
      setDistanceGuides({ gaps: [] });

    },
    [],
  );

  // ---- Edge reconnect handlers ------------------------------------------------

  const onReconnectStart = useCallback(() => {
    edgeReconnectSuccessful.current = false;
  }, []);

  const onReconnect = useCallback((oldEdge: FlowEdge, newConnection: Connection) => {
    edgeReconnectSuccessful.current = true;
    const { edges: currentEdges, setEdges: updateEdges } = useFlowStore.getState();
    updateEdges(currentEdges.map((e) => {
      if (e.id !== oldEdge.id) return e;
      return {
        ...e,
        source: newConnection.source,
        target: newConnection.target,
        sourceHandle: newConnection.sourceHandle ?? undefined,
        targetHandle: newConnection.targetHandle ?? undefined,
      };
    }));
  }, []);

  const onReconnectEnd = useCallback((_event: MouseEvent | TouchEvent, edge: FlowEdge) => {
    if (!edgeReconnectSuccessful.current) {
      // Edge was dragged off into empty space — delete it
      const { edges: currentEdges, setEdges: updateEdges } = useFlowStore.getState();
      updateEdges(currentEdges.filter((e) => e.id !== edge.id));
    }
    edgeReconnectSuccessful.current = true;
  }, []);

  // Selection tracking — onNodesChange/onEdgesChange already maintain
  // selectedNodes/selectedEdges via applyNodeChanges/applyEdgeChanges.
  // We MUST NOT call setSelectedNodes/setSelectedEdges here because that
  // mutates node.selected/edge.selected producing new array refs, which
  // triggers StoreUpdater → onEdgesChange → infinite loop.
  // This callback is only used for puck-selection housekeeping.
  const onSelectionChange = useCallback(({ nodes: selNodes }: { nodes: FlowNode[]; edges: FlowEdge[] }) => {
    // Clear puck selection only when a different node is actively selected
    // (not when all nodes are deselected — pane click handler clears pucks separately)
    const puckNode = useUIStore.getState().selectedPuckNodeId;
    if (puckNode && selNodes.length > 0 && !selNodes.some((n) => n.id === puckNode)) {
      useUIStore.getState().clearPuckSelection();
    }

    const slStore = useSwimlaneStore.getState();

    if (slStore.containers.length > 0 && selNodes.length >= 2) {
      // Compute bounding box of selected nodes
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const n of selNodes) {
        const nd = n.data as FlowNodeData;
        const w = nd.width || n.measured?.width || 100;
        const h = nd.height || n.measured?.height || 50;
        if (n.position.x < minX) minX = n.position.x;
        if (n.position.y < minY) minY = n.position.y;
        if (n.position.x + w > maxX) maxX = n.position.x + w;
        if (n.position.y + h > maxY) maxY = n.position.y + h;
      }

      // Auto-select each container whose bounds are fully encompassed by selection
      for (const container of slStore.containers) {
        const { config: slConfig, containerOffset: offset } = container;
        const hLanes = slConfig.horizontal;
        const vLanes = slConfig.vertical;
        if (hLanes.length === 0 && vLanes.length === 0) continue;

        const hHeaderW = slConfig.hHeaderWidth ?? 48;
        const vHeaderH = slConfig.vHeaderHeight ?? 32;
        let slTotalW = 0;
        let slTotalH = 0;
        if (vLanes.length > 0) {
          const vHeaderOffset = hLanes.length > 0 ? hHeaderW : 0;
          let pos = vHeaderOffset;
          for (const lane of vLanes) {
            if (!lane.hidden) pos += lane.size;
          }
          slTotalW = pos;
        } else {
          slTotalW = slConfig.containerWidth ?? 800;
        }
        if (hLanes.length > 0) {
          const hHeaderOffset = vLanes.length > 0 ? vHeaderH : 0;
          let pos = hHeaderOffset;
          for (const lane of hLanes) {
            if (!lane.hidden) pos += lane.size;
          }
          slTotalH = pos;
        } else {
          slTotalH = slConfig.containerHeight ?? 400;
        }
        const slLeft = offset.x;
        const slTop = offset.y;
        const slRight = offset.x + slTotalW;
        const slBottom = offset.y + slTotalH;

        if (minX <= slLeft && minY <= slTop && maxX >= slRight && maxY >= slBottom) {
          slStore.setSwimlaneSelected(true, container.id, true); // additive for marquee
        }
      }
    }
  }, []);

  const onWrapperContextMenu = useCallback((event: React.MouseEvent) => {
    // Only intercept if we have selected nodes and the right-click is in the flow area
    const selectedNodes = useFlowStore.getState().selectedNodes;
    if (selectedNodes.length > 1) {
      event.preventDefault();
      setSelectionMenu({ x: event.clientX, y: event.clientY, nodeIds: selectedNodes });
      setCanvasMenu(null);
      setNodeMenu(null);
      setEdgeMenu(null);
    }
  }, []);

  // ---- Ctrl+Wheel border-width on hovered node -----------------------------

  const onNodeMouseEnter = useCallback((_event: React.MouseEvent, node: FlowNode) => {
    hoveredNodeRef.current = node.id;
  }, []);

  const onNodeMouseLeave = useCallback(() => {
    hoveredNodeRef.current = null;
  }, []);

  const onWheelHandler = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey || !hoveredNodeRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const nodeId = hoveredNodeRef.current;
    const node = useFlowStore.getState().nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const currentWidth = node.data.borderWidth ?? 2;
    const delta = e.deltaY > 0 ? -0.5 : 0.5;
    const newWidth = Math.max(0, Math.min(8, currentWidth + delta));
    updateNodeData(nodeId, { borderWidth: newWidth });
  }, [updateNodeData]);

  return (
    <div ref={reactFlowWrapper} data-charthero-canvas className={`w-full h-full flex flex-col ${presentationMode ? 'presentation-mode' : ''}`} style={{ backgroundColor: resolveCanvasBackground(canvasColorOverride, darkMode, activeStyleId ? diagramStyles[activeStyleId] ?? null : null) }}>
      {/* Capture area — wraps banners + canvas for export capture (toPng targets this) */}
      <div data-charthero-capture-area className="flex-1 min-h-0 flex flex-col" style={{ isolation: 'isolate' }}>
      {/* Top banner */}
      {topBanner.enabled && <BannerBar position="top" config={topBanner} />}

      {/* Canvas area — viewport calculations and swimlane siblings live here */}
      <div data-charthero-canvas-area className="flex-1 min-h-0 relative" onContextMenu={presentationMode ? (e) => e.preventDefault() : onWrapperContextMenu} onWheel={presentationMode ? undefined : onWheelHandler} style={{ cursor: formatPainterActive ? FORMAT_PAINTER_CURSOR : undefined, isolation: 'isolate' }}>
      {/* Format painter active indicator */}
      {formatPainterActive && (
        <div data-export-ignore className="absolute top-3 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-white text-sm font-medium shadow-lg animate-pulse">
          <span className="w-2 h-2 rounded-full bg-white" />
          Format Painter Active — Click nodes to apply style
          <button
            onClick={() => useUIStore.getState().clearFormatPainter()}
            className="ml-2 px-2 py-0.5 text-xs bg-white/20 hover:bg-white/30 rounded-full transition-colors cursor-pointer"
          >
            Esc to cancel
          </button>
        </div>
      )}

      {/* Swimlane layer — rendered BEFORE ReactFlow so it sits behind everything
          (behind grid, behind nodes/edges). Z-order: swimlane → grid → canvas */}
      {hasLanes && <SwimlaneLayer />}

      {/* Swimlane headers — rendered BEFORE ReactFlow as a sibling.
          z-index 1 is below ReactFlow (z:2), so headers render behind nodes.
          Headers keep pointer-events for rename, color, drag interactions. */}
      {hasLanes && <SwimlaneHeaderLayer />}

      <ReactFlow
        nodes={visibleNodes}
        edges={visibleEdges}
        onNodesChange={presentationMode ? undefined : onNodesChange}
        onEdgesChange={presentationMode ? undefined : onEdgesChange}
        onConnect={presentationMode ? undefined : onConnect}
        edgesReconnectable={!presentationMode}
        onReconnect={presentationMode ? undefined : onReconnect}
        onReconnectStart={presentationMode ? undefined : onReconnectStart}
        onReconnectEnd={presentationMode ? undefined : onReconnectEnd}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onDrop={presentationMode ? undefined : onDrop}
        onDragOver={presentationMode ? undefined : onDragOver}
        onDoubleClick={presentationMode ? undefined : onDoubleClick}
        onPaneContextMenu={presentationMode ? undefined : onPaneContextMenu}
        onNodeContextMenu={presentationMode ? undefined : onNodeContextMenu}
        onEdgeContextMenu={presentationMode ? undefined : onEdgeContextMenu}
        onNodeClick={presentationMode ? undefined : onNodeClick}
        onEdgeClick={presentationMode ? undefined : onEdgeClick}
        onNodeDragStart={presentationMode ? undefined : onNodeDragStart}
        onNodeDrag={presentationMode ? undefined : onNodeDrag}
        onNodeDragStop={presentationMode ? undefined : onNodeDragStop}
        onNodeMouseEnter={presentationMode ? undefined : onNodeMouseEnter}
        onNodeMouseLeave={presentationMode ? undefined : onNodeMouseLeave}
        onPaneClick={presentationMode ? undefined : closeContextMenus}
        onSelectionChange={presentationMode ? undefined : onSelectionChange}
        onInit={handleReactFlowInit}
        isValidConnection={isValidConnection}
        nodesDraggable={!presentationMode && !drawingMode}
        nodesConnectable={!presentationMode && !drawingMode}
        elementsSelectable={!presentationMode && !drawingMode}
        snapToGrid={(presentationMode || drawingMode || ctrlPressed) ? false : snapEnabled}
        snapGrid={[snapDistance, snapDistance]}
        selectionOnDrag={!presentationMode && !drawingMode && !ctrlPressed}
        selectionMode={SelectionMode.Partial}
        selectionKeyCode={null}
        panOnDrag={presentationMode ? true : drawingMode ? false : [1]}
        deleteKeyCode={null}
        multiSelectionKeyCode={(presentationMode || drawingMode) ? null : "Shift"}
        elevateNodesOnSelect={false}
        minZoom={0.3}
        maxZoom={3}
        fitView
        attributionPosition="bottom-left"
        className={`${darkMode ? 'dark' : ''}${rulerVisible ? ' ruler-active' : ''}${ctrlPressed ? ' pan-mode' : ''}`}
        defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
      >
        {gridVisible && (
          <Background
            variant={
              gridStyle === 'lines' ? BackgroundVariant.Lines
              : gridStyle === 'cross' ? BackgroundVariant.Cross
              : BackgroundVariant.Dots
            }
            gap={gridSpacing}
            size={1}
            color={gridColorOverride ?? (darkMode ? '#334155' : activeStyle.canvas.gridColor)}
          />
        )}

        {/* Remote user cursors and selection highlights (collaboration) */}
        {isCollaborating && <RemoteCursors />}
        {isCollaborating && <RemoteSelectionHighlight />}

        {/* Alignment guide lines during drag */}
        {showAlignmentGuides && (alignmentGuides.vertical.length > 0 || alignmentGuides.horizontal.length > 0) && (
          <AlignmentGuideOverlay guides={alignmentGuides} />
        )}

        {/* Distance measurement guides during drag */}
        {showAlignmentGuides && distanceGuides.gaps.length > 0 && (
          <DistanceGuideOverlay guides={distanceGuides} />
        )}

        {/* Freehand drawing overlay */}
        {drawingMode && <FreehandDrawingOverlay />}

        {minimapVisible && (
          <MiniMap
            style={{ backgroundColor: resolveCanvasBackground(canvasColorOverride, darkMode, activeStyleId ? diagramStyles[activeStyleId] ?? null : null) }}
            nodeColor={(node) => {
              if ((node.data as FlowNodeData)?.isConnectorEndpoint) return 'transparent';
              const color = (node.data as Record<string, unknown>)?.color as string | undefined;
              if (color) return color;
              const fill = activeStyle.nodeDefaults.fill;
              return fill === '#ffffff' || fill === '#fff' ? '#3b82f6' : fill;
            }}
            nodeComponent={({ x, y, width, height, color, id }) => {
              const nodeData = useFlowStore.getState().nodes.find((n) => n.id === id)?.data;
              if ((nodeData as FlowNodeData)?.isConnectorEndpoint) return null;
              const shape = (nodeData?.shape) as string | undefined;
              const isCircular = shape === 'circle' || shape === 'ellipse';
              const isDiamond = shape === 'diamond';
              if (isCircular) {
                return (
                  <ellipse
                    cx={x + width / 2}
                    cy={y + height / 2}
                    rx={width / 2}
                    ry={height / 2}
                    fill={color}
                  />
                );
              }
              if (isDiamond) {
                const cx = x + width / 2;
                const cy = y + height / 2;
                return (
                  <polygon
                    points={`${cx},${y} ${x + width},${cy} ${cx},${y + height} ${x},${cy}`}
                    fill={color}
                  />
                );
              }
              return <rect x={x} y={y} width={width} height={height} rx={4} fill={color} />;
            }}
            maskColor={darkMode || activeStyle.dark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(248, 250, 252, 0.7)'}
            pannable
            zoomable
          />
        )}
        {minimapVisible && <MiniMapOverlays />}

        {!presentationMode && (
          <Controls
            showZoom
            showFitView
            showInteractive={false}
            position="top-left"
            style={rulerVisible ? { left: 28, top: 28 } : undefined}
          />
        )}

      </ReactFlow>

      {/* Floating undo/redo buttons */}
      {!presentationMode && onUndo && onRedo && (
        <div data-export-ignore className="absolute z-10 flex gap-1" style={{ top: rulerVisible ? 'calc(7rem + 24px)' : '7rem', left: rulerVisible ? 'calc(0.5rem + 24px)' : '0.5rem' }}>
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded-md border shadow-sm disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors ${darkMode ? 'bg-dk-panel/90 border-dk-border text-dk-text hover:bg-dk-hover' : 'bg-white/90 border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            data-tooltip="Undo (Ctrl+Z)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded-md border shadow-sm disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors ${darkMode ? 'bg-dk-panel/90 border-dk-border text-dk-text hover:bg-dk-hover' : 'bg-white/90 border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            data-tooltip="Redo (Ctrl+Shift+Z)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/></svg>
          </button>
        </div>
      )}

      {/* Legend floating buttons */}
      {!presentationMode && <div data-export-ignore><LegendButton /></div>}

      {/* SVG arrowhead marker definitions (must be in DOM for url(#...) refs) */}
      <MarkerDefs />

      {/* Legend overlays rendered ABOVE ReactFlow so they sit on top of the grid and are draggable */}
      {nodeLegendVisible && <LegendOverlay which="node" />}
      {swimlaneLegendVisible && <LegendOverlay which="swimlane" />}

      {/* Swimlane resize handles rendered ABOVE ReactFlow so they receive mouse events */}
      {hasLanes && <div data-export-ignore><SwimlaneResizeOverlay readOnly={presentationMode} /></div>}

      {/* Ruler overlays */}
      {rulerVisible && (
        <div data-export-ignore>
          <RulerCorner />
          <Ruler orientation="horizontal" />
          <Ruler orientation="vertical" />
        </div>
      )}

      {/* Walk mode breadcrumb overlay */}
      {walkModeActive && <div data-export-ignore><WalkModeBreadcrumb /></div>}

      {/* Chain highlight overlay */}
      {highlightedChain.size > 0 && <ChainHighlight />}

      {/* Canvas context menu */}
      {canvasMenu && (
        <CanvasContextMenu
          x={canvasMenu.x}
          y={canvasMenu.y}
          onClose={closeContextMenus}
          onAddNode={handleAddNodeAtMenu}
          onSelectAll={handleSelectAll}
          onFitView={handleFitView}
          onInsertSwimlanes={handleInsertSwimlanes}
        />
      )}

      {/* Node context menu */}
      {nodeMenu && (
        <NodeContextMenu
          x={nodeMenu.x}
          y={nodeMenu.y}
          nodeId={nodeMenu.nodeId}
          onClose={closeContextMenus}
          onEditLabel={handleEditLabel}
          onDuplicate={handleDuplicateNode}
          onCopy={handleCopyNode}
          onDelete={handleDeleteNode}
          onChangeShape={handleChangeShape}
          onChangeColor={handleChangeColor}
          onSendToBack={handleSendToBack}
          onBringToFront={handleBringToFront}
          onSendBackward={handleSendBackward}
          onBringForward={handleBringForward}
          isGroupNode={isNodeMenuGroupNode}
          onUngroup={handleUngroupNode}
          hasMultipleSelected={useFlowStore.getState().selectedNodes.length > 1}
          onAlign={(fn) => {
            const { nodes, selectedNodes, updateNodePosition } = useFlowStore.getState();
            const idSet = new Set(selectedNodes);
            const selected = nodes.filter((n) => idSet.has(n.id));
            if (selected.length < 2) return;
            const positions = fn(selected);
            for (const [id, pos] of positions) {
              updateNodePosition(id, pos);
            }
          }}
          isInLinkGroup={!!nodes.find((n) => n.id === nodeMenu.nodeId)?.data.linkGroupId}
          onEditLinkGroup={() => {
            const lgId = nodes.find((n) => n.id === nodeMenu.nodeId)?.data.linkGroupId;
            if (lgId) {
              useUIStore.getState().setLinkGroupEditorId(lgId);
              closeContextMenus();
            }
          }}
          isInVisualGroup={!!nodes.find((n) => n.id === nodeMenu.nodeId)?.parentId}
          onRemoveFromVisualGroup={() => {
            const nd = nodes.find((n) => n.id === nodeMenu.nodeId);
            if (!nd?.parentId) return;
            const parent = nodes.find((n) => n.id === nd.parentId);
            if (!parent) return;
            const absX = nd.position.x + parent.position.x;
            const absY = nd.position.y + parent.position.y;
            const store = useFlowStore.getState();
            store.setNodes(
              store.nodes.map((n) =>
                n.id === nodeMenu.nodeId
                  ? { ...n, parentId: undefined, extent: undefined, position: { x: absX, y: absY }, data: { ...n.data, groupId: undefined } }
                  : n
              )
            );
            closeContextMenus();
          }}
          onRemoveFromLinkGroup={() => {
            useFlowStore.getState().removeNodeFromLinkGroup(nodeMenu.nodeId);
            closeContextMenus();
          }}
        />
      )}

      {/* Edge context menu */}
      {edgeMenu && (
        <EdgeContextMenu
          x={edgeMenu.x}
          y={edgeMenu.y}
          edgeId={edgeMenu.edgeId}
          selectedEdgeIds={edgeMenu.selectedEdgeIds}
          closestEnd={edgeMenu.closestEnd}
          onClose={closeContextMenus}
          onChangeType={handleEdgeChangeType}
          onChangeColor={handleEdgeChangeColor}
          onEditLabel={handleEdgeEditLabel}
          onStraighten={handleEdgeStraighten}
          onDelete={handleEdgeDelete}
        />
      )}

      {/* Selection context menu (multi-select) */}
      {selectionMenu && (
        <SelectionContextMenu
          x={selectionMenu.x}
          y={selectionMenu.y}
          nodeIds={selectionMenu.nodeIds}
          onClose={closeContextMenus}
        />
      )}

      {/* Link Group Editor dialog */}
      <LinkGroupEditorDialog />

      {/* Presentation mode overlay (inside ReactFlowProvider for viewport access) */}
      <PresentationOverlay />

      </div>{/* end canvas-area */}

      {/* Bottom banner (hidden in presentation mode) */}
      {bottomBanner.enabled && <BannerBar position="bottom" config={bottomBanner} />}

      </div>{/* end capture-area */}

      {/* Pinned extensions bar — above status bar */}
      {!presentationMode && <PinnedExtensionsBar />}

      {/* Status bar at very bottom, below banners */}
      {!presentationMode && <StatusBar />}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Exported wrapper with provider
// ---------------------------------------------------------------------------

const FlowCanvas: React.FC<FlowCanvasProps> = ({ onInit, onUndo, onRedo, canUndo, canRedo }) => {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner onInit={onInit} onUndo={onUndo} onRedo={onRedo} canUndo={canUndo} canRedo={canRedo} />
    </ReactFlowProvider>
  );
};

export default React.memo(FlowCanvas);
