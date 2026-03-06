import { create, type StoreApi } from 'zustand';
import { immer } from 'zustand/middleware/immer';

// ---------------------------------------------------------------------------
// Inline types
// ---------------------------------------------------------------------------

export type SwimlaneOrientation = 'horizontal' | 'vertical';
export type BorderStyleType = 'solid' | 'dashed' | 'dotted' | 'none';

export interface SwimlaneItem {
  id: string;
  label: string;
  color: string;
  collapsed: boolean;
  /** Pixel size (width for vertical lanes, height for horizontal lanes) */
  size: number;
  order: number;
  /** Whether the lane label is visible on the canvas (default true) */
  showLabel?: boolean;
  /** Whether the lane color indicator is visible on the canvas (default true) */
  showColor?: boolean;
  /** When true, the lane background, header, and all nodes/edges in this lane are hidden */
  hidden?: boolean;
  /** Lane background opacity (0-100, default uses theme value: ~12 dark / ~15 light) */
  colorOpacity?: number;
}

export interface BorderConfig {
  color: string;
  width: number;
  style: BorderStyleType;
  radius: number;
}

export interface DividerConfig {
  color: string;
  width: number;
  style: BorderStyleType;
}

export interface SwimlaneConfig {
  orientation: SwimlaneOrientation;
  containerTitle: string;
  horizontal: SwimlaneItem[];
  vertical: SwimlaneItem[];
  containerBorder?: BorderConfig;
  dividerStyle?: DividerConfig;
  labelFontSize?: number;
  labelRotation?: number;
  /** Width of horizontal lane headers in px (default 48) */
  hHeaderWidth?: number;
  /** Height of vertical lane headers in px (default 32) */
  vHeaderHeight?: number;
  /** Container title font size in px (default 13) */
  titleFontSize?: number;
  /** Container title color (default auto based on dark mode) */
  titleColor?: string;
  /** Container title font family */
  titleFontFamily?: string;
  /** Width of the container when not determined by vertical lanes (default 800) */
  containerWidth?: number;
  /** Height of the container when not determined by horizontal lanes (default 400) */
  containerHeight?: number;
}

export interface SwimlaneState {
  // ---- state --------------------------------------------------
  config: SwimlaneConfig;
  isCreating: boolean;
  editingLaneId: string | null;
  containerOffset: { x: number; y: number };
  /** Whether the swimlane container is selected (for bulk move) */
  swimlaneSelected: boolean;

  // ---- actions ------------------------------------------------
  addLane: (orientation: SwimlaneOrientation, lane: SwimlaneItem) => void;
  removeLane: (orientation: SwimlaneOrientation, laneId: string) => void;
  updateLane: (
    orientation: SwimlaneOrientation,
    laneId: string,
    patch: Partial<Omit<SwimlaneItem, 'id'>>,
  ) => void;
  reorderLanes: (orientation: SwimlaneOrientation, orderedIds: string[]) => void;
  setOrientation: (orientation: SwimlaneOrientation) => void;
  setContainerTitle: (title: string) => void;
  toggleCollapsed: (orientation: SwimlaneOrientation, laneId: string) => void;
  setContainerOffset: (offset: { x: number; y: number }) => void;
  setSwimlaneSelected: (selected: boolean) => void;

  updateContainerBorder: (patch: Partial<BorderConfig>) => void;
  updateDividerStyle: (patch: Partial<DividerConfig>) => void;
  updateLabelConfig: (patch: { labelFontSize?: number; labelRotation?: number; hHeaderWidth?: number; vHeaderHeight?: number }) => void;
  updateTitleConfig: (patch: { titleFontSize?: number; titleColor?: string; titleFontFamily?: string }) => void;
  updateContainerSize: (patch: { containerWidth?: number; containerHeight?: number }) => void;

  /** Proportionally resize all visible lanes in the given orientation to fit a new total size */
  resizeLanes: (orientation: SwimlaneOrientation, newTotalSize: number) => void;

  /** Remove all lanes (horizontal + vertical) and deselect */
  clearAllLanes: () => void;

  setIsCreating: (creating: boolean) => void;
  setEditingLaneId: (laneId: string | null) => void;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: SwimlaneConfig = {
  orientation: 'horizontal',
  containerTitle: '',
  horizontal: [],
  vertical: [],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getLanes(config: SwimlaneConfig, orientation: SwimlaneOrientation): SwimlaneItem[] {
  return orientation === 'horizontal' ? config.horizontal : config.vertical;
}

function setLanes(
  config: SwimlaneConfig,
  orientation: SwimlaneOrientation,
  lanes: SwimlaneItem[],
): void {
  if (orientation === 'horizontal') {
    config.horizontal = lanes;
  } else {
    config.vertical = lanes;
  }
}

// ---------------------------------------------------------------------------
// Store (immer for easy nested mutations)
// ---------------------------------------------------------------------------

export const useSwimlaneStore = create<SwimlaneState>()(
  immer((set) => ({
    // -- initial state -------------------------------------------
    config: DEFAULT_CONFIG,
    isCreating: false,
    editingLaneId: null,
    containerOffset: { x: 0, y: 0 },
    swimlaneSelected: false,

    // -- actions -------------------------------------------------
    addLane: (orientation, lane) => {
      set((state) => {
        const lanes = getLanes(state.config, orientation);
        lanes.push({ ...lane, order: lanes.length });
        setLanes(state.config, orientation, lanes);
      });
    },

    removeLane: (orientation, laneId) => {
      set((state) => {
        const lanes = getLanes(state.config, orientation).filter(
          (l) => l.id !== laneId,
        );
        // Re-index order
        lanes.forEach((l, i) => {
          l.order = i;
        });
        setLanes(state.config, orientation, lanes);
      });
    },

    updateLane: (orientation, laneId, patch) => {
      set((state) => {
        const lane = getLanes(state.config, orientation).find(
          (l) => l.id === laneId,
        );
        if (lane) {
          Object.assign(lane, patch);
        }
      });
    },

    reorderLanes: (orientation, orderedIds) => {
      set((state) => {
        const lanes = getLanes(state.config, orientation);
        const byId = new Map(lanes.map((l) => [l.id, l]));
        const reordered: SwimlaneItem[] = [];
        for (let i = 0; i < orderedIds.length; i++) {
          const lane = byId.get(orderedIds[i]);
          if (lane) {
            lane.order = i;
            reordered.push(lane);
          }
        }
        setLanes(state.config, orientation, reordered);
      });
    },

    setOrientation: (orientation) => {
      set((state) => {
        state.config.orientation = orientation;
      });
    },

    setContainerTitle: (title) => {
      set((state) => {
        state.config.containerTitle = title;
      });
    },

    toggleCollapsed: (orientation, laneId) => {
      set((state) => {
        const lane = getLanes(state.config, orientation).find(
          (l) => l.id === laneId,
        );
        if (lane) {
          lane.collapsed = !lane.collapsed;
        }
      });
    },

    setContainerOffset: (offset) => {
      set((state) => {
        state.containerOffset = offset;
      });
    },

    setSwimlaneSelected: (selected) => {
      set((state) => {
        state.swimlaneSelected = selected;
      });
    },

    updateContainerBorder: (patch) => {
      set((state) => {
        state.config.containerBorder = {
          color: state.config.containerBorder?.color ?? '#94a3b8',
          width: state.config.containerBorder?.width ?? 1,
          style: state.config.containerBorder?.style ?? 'solid',
          radius: state.config.containerBorder?.radius ?? 4,
          ...patch,
        };
      });
    },

    updateDividerStyle: (patch) => {
      set((state) => {
        state.config.dividerStyle = {
          color: state.config.dividerStyle?.color ?? '',
          width: state.config.dividerStyle?.width ?? 1,
          style: state.config.dividerStyle?.style ?? 'solid',
          ...patch,
        };
      });
    },

    updateLabelConfig: (patch) => {
      set((state) => {
        if (patch.labelFontSize !== undefined) {
          state.config.labelFontSize = patch.labelFontSize;
        }
        if (patch.labelRotation !== undefined) {
          state.config.labelRotation = patch.labelRotation;
        }
        if (patch.hHeaderWidth !== undefined) {
          state.config.hHeaderWidth = patch.hHeaderWidth;
        }
        if (patch.vHeaderHeight !== undefined) {
          state.config.vHeaderHeight = patch.vHeaderHeight;
        }
      });
    },

    updateTitleConfig: (patch) => {
      set((state) => {
        if (patch.titleFontSize !== undefined) {
          state.config.titleFontSize = patch.titleFontSize;
        }
        if (patch.titleColor !== undefined) {
          state.config.titleColor = patch.titleColor;
        }
        if (patch.titleFontFamily !== undefined) {
          state.config.titleFontFamily = patch.titleFontFamily;
        }
      });
    },

    updateContainerSize: (patch) => {
      set((state) => {
        if (patch.containerWidth !== undefined) {
          state.config.containerWidth = patch.containerWidth;
        }
        if (patch.containerHeight !== undefined) {
          state.config.containerHeight = patch.containerHeight;
        }
      });
    },

    resizeLanes: (orientation, newTotalSize) => {
      set((state) => {
        const lanes = getLanes(state.config, orientation);
        // Only resize visible, non-collapsed lanes
        const resizable = lanes.filter((l) => !l.hidden && !l.collapsed);
        if (resizable.length === 0) return;

        const currentTotal = resizable.reduce((sum, l) => sum + l.size, 0);
        if (currentTotal <= 0) return;

        const MIN_LANE = 60;
        const scale = newTotalSize / currentTotal;

        // Proportionally scale each lane
        for (const lane of resizable) {
          lane.size = Math.max(MIN_LANE, Math.round(lane.size * scale));
        }
      });
    },

    clearAllLanes: () => {
      set((state) => {
        state.config.horizontal = [];
        state.config.vertical = [];
        state.swimlaneSelected = false;
      });
    },

    setIsCreating: (creating) => {
      set((state) => {
        state.isCreating = creating;
      });
    },

    setEditingLaneId: (laneId) => {
      set((state) => {
        state.editingLaneId = laneId;
      });
    },
  })),
);

/** Direct access to the store (useful outside of React components) */
export const swimlaneStore: StoreApi<SwimlaneState> = useSwimlaneStore;
