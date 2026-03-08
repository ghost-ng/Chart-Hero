import { create, type StoreApi } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type NodeChange,
  type EdgeChange,
  type Viewport,
  type Node,
  type Edge,
  type XYPosition,
} from '@xyflow/react';
import { useUIStore } from './uiStore';
import { log } from '../utils/logger';

// ---------------------------------------------------------------------------
// Inline types  (will move to ../types/ later)
// ---------------------------------------------------------------------------

/** Possible node shape identifiers */
export type NodeShape =
  | 'rectangle'
  | 'roundedRectangle'
  | 'diamond'
  | 'circle'
  | 'ellipse'
  | 'parallelogram'
  | 'hexagon'
  | 'triangle'
  | 'star'
  | 'cloud'
  | 'arrow'
  | 'callout'
  | 'document'
  | 'predefinedProcess'
  | 'manualInput'
  | 'preparation'
  | 'data'
  | 'database'
  | 'internalStorage'
  | 'display'
  | 'blockArrow'
  | 'chevronArrow'
  | 'doubleArrow'
  | 'circularArrow'
  | 'group'
  | 'stickyNote'
  | 'textbox'
  | 'freehand';

/** Status indicator for tracking node progress */
export interface StatusIndicator {
  id: string;
  status: 'none' | 'not-started' | 'in-progress' | 'completed' | 'blocked' | 'review';
  color?: string;
  size?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  icon?: string;
}

/** Generate a unique puck ID */
export const newPuckId = () => `puck_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

/** Migrate legacy singular statusIndicator → statusIndicators array */
export function getStatusIndicators(data: FlowNodeData): StatusIndicator[] {
  if (data.statusIndicators && data.statusIndicators.length > 0) return data.statusIndicators;
  if (data.statusIndicator) {
    return [{ ...data.statusIndicator, id: (data.statusIndicator as StatusIndicator).id || newPuckId() }];
  }
  return [];
}

/** Data payload stored on every Chart Hero node */
export interface FlowNodeData {
  label: string;
  shape: NodeShape;
  description?: string;
  color?: string;
  borderColor?: string;
  textColor?: string;
  fontSize?: number;
  fontWeight?: number;
  fontFamily?: string;
  icon?: string;
  iconColor?: string;
  iconBgColor?: string;
  iconBorderColor?: string;
  iconBorderWidth?: number;
  iconSize?: number;
  iconPosition?: 'left' | 'right';
  layerId?: string;
  swimlaneId?: string;
  width?: number;
  height?: number;
  /** Visual rotation angle in degrees (applied via CSS transform) */
  rotation?: number;
  /** Horizontal flip (mirror via CSS scaleX(-1)) */
  flipH?: boolean;
  /** Vertical flip (mirror via CSS scaleY(-1)) */
  flipV?: boolean;
  opacity?: number;
  /** Fill color opacity (0–1). Applied as alpha channel on the fill color only. */
  fillOpacity?: number;
  /** Border color opacity (0–1). Applied as alpha channel on the border color only. */
  borderOpacity?: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  borderWidth?: number;
  /** Corner radius override (px) */
  borderRadius?: number;
  /** Icon-only mode: render just the icon with no shape background */
  iconOnly?: boolean;
  /** ID of the group node this node belongs to */
  groupId?: string;
  /** Link group ID for logical grouping (move-together) */
  linkGroupId?: string;
  /** @deprecated Use statusIndicators instead */
  statusIndicator?: StatusIndicator;
  /** Array of status indicator badges on the node */
  statusIndicators?: StatusIndicator[];
  /** Dependency metadata */
  dependsOn?: string[];
  blockedBy?: string[];
  /** Free-form notes / annotations for this node */
  notes?: string;
  /** Person / team who completed or owns this node */
  completedBy?: string;
  /** Start date for this node (ISO string or free text) */
  startOn?: string;
  /** Freehand drawing SVG path data (shape: 'freehand') */
  svgPath?: string;
  /** Freehand drawing viewBox (e.g. "0 0 200 150") */
  svgViewBox?: string;
  /** Freehand stroke color */
  svgStrokeColor?: string;
  /** Freehand stroke width */
  svgStrokeWidth?: number;
  /** True if this node is a connector endpoint (tiny handle dot) */
  isConnectorEndpoint?: boolean;
  /** Edge ID this endpoint anchors (for cascade delete) */
  connectorEdgeId?: string;
  /** Whether this endpoint is source or target */
  endpointRole?: 'source' | 'target';
  /** Extension pack ID this node came from */
  extensionPackId?: string;
  /** Extension item ID within the pack */
  extensionItemId?: string;
  /** Raw SVG content for extension nodes (embedded for export portability) */
  svgContent?: string;
  /** Label position: above/below the shape or overlaid inside */
  labelPosition?: 'above' | 'below' | 'overlay';
  [key: string]: unknown;
}

/** A typed React Flow node used throughout Chart Hero */
export type FlowNode = Node<FlowNodeData, string>;

/** Data payload stored on every Chart Hero edge */
export interface FlowEdgeData {
  label?: string;
  color?: string;
  thickness?: number;
  animated?: boolean;
  opacity?: number;
  labelColor?: string;
  /** Position of the label along the edge (0 = source, 0.5 = center, 1 = target). Default 0.5. */
  labelPosition?: number;
  /** Font size for the edge label (px). Default 11. */
  labelFontSize?: number;
  /** Background color for the edge label */
  labelBgColor?: string;
  dependencyType?: 'depends-on' | 'blocks' | 'related';
  /** Free-form notes / annotations for this edge */
  notes?: string;
  /** Draggable waypoints for custom edge routing */
  waypoints?: Array<{ x: number; y: number }>;
  [key: string]: unknown;
}

/** A typed React Flow edge used throughout Chart Hero */
export type FlowEdge = Edge<FlowEdgeData>;

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

export interface FlowState {
  // ---- state --------------------------------------------------
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport: Viewport;
  selectedNodes: string[];
  selectedEdges: string[];

  // ---- React Flow event handlers ------------------------------
  onNodesChange: (changes: NodeChange<FlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<FlowEdge>[]) => void;
  onConnect: (connection: Connection) => void;

  // ---- node CRUD ----------------------------------------------
  addNode: (node: FlowNode) => void;
  removeNode: (nodeId: string) => void;
  updateNodeData: (nodeId: string, data: Partial<FlowNodeData>) => void;
  updateNodePosition: (nodeId: string, position: XYPosition) => void;
  /** Batch-update positions for multiple nodes in a single immer draft */
  batchUpdatePositions: (positions: Map<string, { x: number; y: number }>) => void;
  setNodes: (nodes: FlowNode[]) => void;
  getNode: (nodeId: string) => FlowNode | undefined;

  // ---- edge CRUD ----------------------------------------------
  setEdges: (edges: FlowEdge[]) => void;
  getEdge: (edgeId: string) => FlowEdge | undefined;
  updateEdgeData: (edgeId: string, data: Partial<FlowEdgeData>) => void;
  /** Patch any edge properties (data, style, markers, type) via immer draft mutation */
  updateEdge: (edgeId: string, patch: Partial<FlowEdge>) => void;
  /** Straighten all (or selected) edges by aligning connected nodes */
  straightenEdges: (edgeIds?: string[]) => void;

  // ---- status puck CRUD --------------------------------------
  addStatusPuck: (nodeId: string, puck: StatusIndicator) => void;
  updateStatusPuck: (nodeId: string, puckId: string, patch: Partial<StatusIndicator>) => void;
  removeStatusPuck: (nodeId: string, puckId: string) => void;

  // ---- link group helpers ------------------------------------
  createLinkGroup: (nodeIds: string[]) => string;
  removeLinkGroup: (linkGroupId: string) => void;
  addNodeToLinkGroup: (nodeId: string, linkGroupId: string) => void;
  removeNodeFromLinkGroup: (nodeId: string) => void;

  // ---- selection helpers --------------------------------------
  setSelectedNodes: (ids: string[]) => void;
  setSelectedEdges: (ids: string[]) => void;
  clearSelection: () => void;

  // ---- viewport -----------------------------------------------
  setViewport: (vp: Viewport) => void;
}

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------

const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

// ---------------------------------------------------------------------------
// Store creation (immer middleware for easy immutable updates)
// ---------------------------------------------------------------------------

export const useFlowStore = create<FlowState>()(
  immer((set, get) => ({
    // -- initial state -------------------------------------------
    nodes: [],
    edges: [],
    viewport: DEFAULT_VIEWPORT,
    selectedNodes: [],
    selectedEdges: [],

    // -- React Flow handlers ------------------------------------
    onNodesChange: (changes) => {
      set((state) => {
        // Before applying changes, cascade-delete endpoint peers + edges
        const removedIds = changes
          .filter((c) => c.type === 'remove')
          .map((c) => c.id);
        const extraNodeRemovals = new Set<string>();
        for (const id of removedIds) {
          const node = state.nodes.find(n => n.id === id);
          if (node?.data.isConnectorEndpoint) {
            const edgeId = node.data.connectorEdgeId as string | undefined;
            if (edgeId) {
              const edge = state.edges.find(e => e.id === edgeId);
              state.edges = state.edges.filter(e => e.id !== edgeId);
              state.selectedEdges = state.selectedEdges.filter(eid => eid !== edgeId);
              if (edge) {
                const peerId = edge.source === id ? edge.target : edge.source;
                const peer = state.nodes.find(n => n.id === peerId);
                if (peer?.data.isConnectorEndpoint) extraNodeRemovals.add(peerId);
              }
            }
          }
        }

        state.nodes = applyNodeChanges(changes, state.nodes) as FlowNode[];
        // Remove peer endpoint nodes that weren't in the original change set
        if (extraNodeRemovals.size > 0) {
          state.nodes = state.nodes.filter(n => !extraNodeRemovals.has(n.id));
        }

        // Keep selectedNodes in sync with selection and removal changes
        const selectionChanges = changes.filter(
          (c): c is NodeChange<FlowNode> & { type: 'select' } => c.type === 'select',
        );

        if (selectionChanges.length > 0 || removedIds.length > 0 || extraNodeRemovals.size > 0) {
          const selected = new Set(state.selectedNodes);
          for (const change of selectionChanges) {
            if (change.selected) {
              selected.add(change.id);
            } else {
              selected.delete(change.id);
            }
          }
          for (const id of removedIds) {
            selected.delete(id);
          }
          for (const id of extraNodeRemovals) {
            selected.delete(id);
          }
          state.selectedNodes = Array.from(selected);
        }
      });
    },

    onEdgesChange: (changes) => {
      set((state) => {
        // Find edges being removed before applying changes
        const removedEdges = changes
          .filter((c): c is EdgeChange<FlowEdge> & { type: 'remove' } => c.type === 'remove')
          .map(c => state.edges.find(e => e.id === c.id))
          .filter(Boolean);

        state.edges = applyEdgeChanges(changes, state.edges) as FlowEdge[];

        // Clean up dependency metadata and connector endpoints for removed edges
        const endpointIdsToRemove = new Set<string>();
        for (const edge of removedEdges) {
          if (!edge) continue;
          const targetNode = state.nodes.find(n => n.id === edge.target);
          const sourceNode = state.nodes.find(n => n.id === edge.source);
          if (targetNode && targetNode.data.dependsOn) {
            targetNode.data = {
              ...targetNode.data,
              dependsOn: targetNode.data.dependsOn.filter(id => id !== edge.source),
            };
          }
          if (sourceNode && sourceNode.data.blockedBy) {
            sourceNode.data = {
              ...sourceNode.data,
              blockedBy: sourceNode.data.blockedBy.filter(id => id !== edge.target),
            };
          }
          // Cascade-delete connector endpoint nodes
          if (sourceNode?.data.isConnectorEndpoint) endpointIdsToRemove.add(edge.source);
          if (targetNode?.data.isConnectorEndpoint) endpointIdsToRemove.add(edge.target);
        }
        if (endpointIdsToRemove.size > 0) {
          state.nodes = state.nodes.filter(n => !endpointIdsToRemove.has(n.id));
          state.selectedNodes = state.selectedNodes.filter(id => !endpointIdsToRemove.has(id));
        }

        const selectionChanges = changes.filter(
          (c): c is EdgeChange<FlowEdge> & { type: 'select' } => c.type === 'select',
        );
        const removedEdgeIds = changes
          .filter((c) => c.type === 'remove')
          .map((c) => c.id);

        if (selectionChanges.length > 0 || removedEdgeIds.length > 0) {
          const selected = new Set(state.selectedEdges);
          for (const change of selectionChanges) {
            if (change.selected) {
              selected.add(change.id);
            } else {
              selected.delete(change.id);
            }
          }
          for (const id of removedEdgeIds) {
            selected.delete(id);
          }
          state.selectedEdges = Array.from(selected);
        }
      });
    },

    onConnect: (connection) => {
      log.debug('onConnect', connection.source, '->', connection.target);
      set((state) => {
        state.edges = addEdge(connection, state.edges) as FlowEdge[];

        // Auto-update dependency metadata on connected nodes
        if (connection.source && connection.target) {
          const targetNode = state.nodes.find(n => n.id === connection.target);
          const sourceNode = state.nodes.find(n => n.id === connection.source);
          if (targetNode) {
            const deps = new Set(targetNode.data.dependsOn || []);
            deps.add(connection.source);
            targetNode.data = { ...targetNode.data, dependsOn: Array.from(deps) };
          }
          if (sourceNode) {
            const blocked = new Set(sourceNode.data.blockedBy || []);
            blocked.add(connection.target);
            sourceNode.data = { ...sourceNode.data, blockedBy: Array.from(blocked) };
          }
        }

        // Apply user-selected default edge type
        const defaultType = useUIStore.getState().defaultEdgeType || 'smoothstep';
        const newEdge = state.edges[state.edges.length - 1];
        if (newEdge) {
          newEdge.type = defaultType;
        }
      });
    },

    // -- node CRUD -----------------------------------------------
    addNode: (node) => {
      log.debug('addNode', node.id, node.data?.shape);
      set((state) => {
        state.nodes.push(node);
      });
    },

    removeNode: (nodeId) => {
      log.debug('removeNode', nodeId);
      set((state) => {
        const node = state.nodes.find(n => n.id === nodeId);

        // Collect all node IDs to remove (includes link group siblings)
        const idsToRemove = new Set<string>([nodeId]);
        if (node?.data.linkGroupId) {
          for (const n of state.nodes) {
            if (n.data.linkGroupId === node.data.linkGroupId) {
              idsToRemove.add(n.id);
            }
          }
        }

        // If removing a connector endpoint, also remove the edge + peer endpoint
        for (const removeId of idsToRemove) {
          const rmNode = state.nodes.find(n => n.id === removeId);
          if (rmNode?.data.isConnectorEndpoint) {
            const edgeId = rmNode.data.connectorEdgeId as string | undefined;
            if (edgeId) {
              const edge = state.edges.find(e => e.id === edgeId);
              state.edges = state.edges.filter(e => e.id !== edgeId);
              state.selectedEdges = state.selectedEdges.filter(id => id !== edgeId);
              if (edge) {
                const peerId = edge.source === removeId ? edge.target : edge.source;
                const peer = state.nodes.find(n => n.id === peerId);
                if (peer?.data.isConnectorEndpoint) {
                  idsToRemove.add(peerId);
                }
              }
            }
          }
        }

        state.nodes = state.nodes.filter((n) => !idsToRemove.has(n.id));
        // Also remove connected edges
        state.edges = state.edges.filter(
          (e) => !idsToRemove.has(e.source) && !idsToRemove.has(e.target),
        );
        state.selectedNodes = state.selectedNodes.filter((id) => !idsToRemove.has(id));

        // Clean up dependency references from remaining nodes
        for (const node of state.nodes) {
          if (node.data.dependsOn?.some(id => idsToRemove.has(id))) {
            node.data = {
              ...node.data,
              dependsOn: node.data.dependsOn.filter(id => !idsToRemove.has(id)),
            };
          }
          if (node.data.blockedBy?.some(id => idsToRemove.has(id))) {
            node.data = {
              ...node.data,
              blockedBy: node.data.blockedBy.filter(id => !idsToRemove.has(id)),
            };
          }
        }
      });
    },

    updateNodeData: (nodeId, data) => {
      set((state) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (node) {
          node.data = { ...node.data, ...data };
        }
      });
    },

    updateNodePosition: (nodeId, position) => {
      set((state) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (node) {
          node.position = position;
        }
      });
    },

    batchUpdatePositions: (positions) => {
      set((state) => {
        for (const [id, pos] of positions) {
          const node = state.nodes.find((n) => n.id === id);
          if (node) node.position = pos;
        }
      });
    },

    setNodes: (nodes) => {
      set((state) => {
        state.nodes = nodes;
      });
    },

    getNode: (nodeId) => {
      return get().nodes.find((n) => n.id === nodeId);
    },

    // -- edge CRUD -----------------------------------------------
    setEdges: (edges) => {
      set((state) => {
        state.edges = edges;
      });
    },

    getEdge: (edgeId) => {
      return get().edges.find((e) => e.id === edgeId);
    },

    updateEdgeData: (edgeId, data) => {
      set((state) => {
        const edge = state.edges.find((e) => e.id === edgeId);
        if (edge) {
          edge.data = { ...edge.data, ...data };
        }
      });
    },

    updateEdge: (edgeId, patch) => {
      set((state) => {
        const edge = state.edges.find((e) => e.id === edgeId);
        if (!edge) return;
        if (patch.data !== undefined) {
          edge.data = { ...edge.data, ...patch.data };
        }
        if (patch.style !== undefined) {
          edge.style = { ...(edge.style || {}), ...patch.style };
        }
        if (patch.type !== undefined) edge.type = patch.type;
        if ('markerEnd' in patch) edge.markerEnd = patch.markerEnd;
        if ('markerStart' in patch) edge.markerStart = patch.markerStart;
      });
    },

    straightenEdges: (edgeIds) => {
      set((state) => {
        const targetEdges = edgeIds
          ? state.edges.filter((e) => edgeIds.includes(e.id))
          : state.edges;
        // Track which nodes have already been moved so later edges don't conflict
        const moved = new Set<string>();
        for (const edge of targetEdges) {
          const source = state.nodes.find((n) => n.id === edge.source);
          const target = state.nodes.find((n) => n.id === edge.target);
          if (!source || !target) continue;
          // Don't move a node that was already repositioned
          if (moved.has(target.id)) continue;
          const srcW = source.data.width || 160;
          const srcH = source.data.height || 60;
          const tgtW = target.data.width || 160;
          const tgtH = target.data.height || 60;
          const sh = edge.sourceHandle || '';
          const th = edge.targetHandle || '';
          // Determine direction from handles; if no handles, infer from node positions
          let isVert: boolean;
          if (sh || th) {
            isVert = sh.includes('top') || sh.includes('bottom') || th.includes('top') || th.includes('bottom');
          } else {
            // No handles set — infer from relative positions of source & target centers
            const srcCx = source.position.x + srcW / 2;
            const srcCy = source.position.y + srcH / 2;
            const tgtCx = target.position.x + tgtW / 2;
            const tgtCy = target.position.y + tgtH / 2;
            isVert = Math.abs(tgtCy - srcCy) >= Math.abs(tgtCx - srcCx);
          }
          if (isVert) {
            const srcCenterX = source.position.x + srcW / 2;
            target.position = { x: srcCenterX - tgtW / 2, y: target.position.y };
          } else {
            const srcCenterY = source.position.y + srcH / 2;
            target.position = { x: target.position.x, y: srcCenterY - tgtH / 2 };
          }
          moved.add(target.id);
        }

        // --- Collision resolution: push apart nodes that overlap after alignment ---
        if (moved.size > 1) {
          const GAP = 20; // px minimum gap between nodes
          const movedNodes = state.nodes.filter((n) => moved.has(n.id));
          // Check each pair of moved nodes for overlap
          for (let i = 0; i < movedNodes.length; i++) {
            const a = movedNodes[i];
            const aW = a.data.width || 160;
            const aH = a.data.height || 60;
            for (let j = i + 1; j < movedNodes.length; j++) {
              const b = movedNodes[j];
              const bW = b.data.width || 160;
              const bH = b.data.height || 60;
              // Check bounding box overlap
              const overlapX = a.position.x < b.position.x + bW + GAP &&
                               a.position.x + aW + GAP > b.position.x;
              const overlapY = a.position.y < b.position.y + bH + GAP &&
                               a.position.y + aH + GAP > b.position.y;
              if (overlapX && overlapY) {
                // Push the second node away from the first
                // Determine which axis has more overlap and push on the other
                const overlapAmtX = Math.min(a.position.x + aW, b.position.x + bW) -
                                    Math.max(a.position.x, b.position.x);
                const overlapAmtY = Math.min(a.position.y + aH, b.position.y + bH) -
                                    Math.max(a.position.y, b.position.y);
                if (overlapAmtX < overlapAmtY) {
                  // Push horizontally
                  if (b.position.x >= a.position.x) {
                    b.position = { ...b.position, x: a.position.x + aW + GAP };
                  } else {
                    b.position = { ...b.position, x: a.position.x - bW - GAP };
                  }
                } else {
                  // Push vertically
                  if (b.position.y >= a.position.y) {
                    b.position = { ...b.position, y: a.position.y + aH + GAP };
                  } else {
                    b.position = { ...b.position, y: a.position.y - bH - GAP };
                  }
                }
              }
            }
          }
        }
      });
    },

    // -- status puck CRUD ------------------------------------------
    addStatusPuck: (nodeId, puck) => {
      log.debug('addStatusPuck', nodeId, puck.id);
      set((state) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (node) {
          const existing = node.data.statusIndicators || [];
          node.data = { ...node.data, statusIndicators: [...existing, puck], statusIndicator: undefined };
        }
      });
    },

    updateStatusPuck: (nodeId, puckId, patch) => {
      set((state) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (node && node.data.statusIndicators) {
          node.data = {
            ...node.data,
            statusIndicators: node.data.statusIndicators.map((p) =>
              p.id === puckId ? { ...p, ...patch } : p,
            ),
          };
        }
      });
    },

    removeStatusPuck: (nodeId, puckId) => {
      log.debug('removeStatusPuck', nodeId, puckId);
      set((state) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (node && node.data.statusIndicators) {
          node.data = {
            ...node.data,
            statusIndicators: node.data.statusIndicators.filter((p) => p.id !== puckId),
          };
        }
      });
    },

    // -- link group -----------------------------------------------
    createLinkGroup: (nodeIds) => {
      const linkGroupId = `lg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      set((state) => {
        for (const node of state.nodes) {
          if (nodeIds.includes(node.id)) {
            node.data = { ...node.data, linkGroupId };
          }
        }
      });
      return linkGroupId;
    },

    removeLinkGroup: (linkGroupId) => {
      set((state) => {
        for (const node of state.nodes) {
          if (node.data.linkGroupId === linkGroupId) {
            node.data = { ...node.data, linkGroupId: undefined };
          }
        }
      });
    },

    addNodeToLinkGroup: (nodeId, linkGroupId) => {
      set((state) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (node) {
          node.data = { ...node.data, linkGroupId };
        }
      });
    },

    removeNodeFromLinkGroup: (nodeId) => {
      set((state) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (node) {
          node.data = { ...node.data, linkGroupId: undefined };
        }
      });
    },

    // -- selection ------------------------------------------------
    setSelectedNodes: (ids) => {
      set((state) => {
        state.selectedNodes = ids;
        const idSet = new Set(ids);
        state.nodes.forEach((n) => {
          n.selected = idSet.has(n.id);
        });
      });
    },

    setSelectedEdges: (ids) => {
      set((state) => {
        state.selectedEdges = ids;
        const idSet = new Set(ids);
        state.edges.forEach((e) => {
          e.selected = idSet.has(e.id);
        });
      });
    },

    clearSelection: () => {
      set((state) => {
        state.selectedNodes = [];
        state.selectedEdges = [];
        state.nodes.forEach((n) => { n.selected = false; });
        state.edges.forEach((e) => { e.selected = false; });
      });
    },

    // -- viewport -------------------------------------------------
    setViewport: (vp) => {
      set((state) => {
        state.viewport = vp;
      });
    },
  })),
);

/** Direct access to the store (useful outside of React components) */
export const flowStore: StoreApi<FlowState> = useFlowStore;
