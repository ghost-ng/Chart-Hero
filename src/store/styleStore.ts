import { create, type StoreApi } from 'zustand';
import { persist } from 'zustand/middleware';

import { diagramStyles } from '../styles/diagramStyles';
import { STYLE_PALETTE_ID } from '../styles/palettes';
import { useSwimlaneStore } from './swimlaneStore';

// ---------------------------------------------------------------------------
// Inline types
// ---------------------------------------------------------------------------

export type AutoColorMode = 'manual' | 'byType' | 'byDepth' | 'byLane';

export interface StylePreset {
  id: string;
  name: string;
  description?: string;
  /** Serialised style overrides keyed by node shape or '*' for global */
  nodeStyles: Record<string, NodeStyleOverride>;
  edgeStyle: EdgeStyleOverride;
  createdAt: number;
}

export interface NodeStyleOverride {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number;
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
  shadow?: boolean;
}

export interface EdgeStyleOverride {
  stroke?: string;
  strokeWidth?: number;
  animated?: boolean;
  markerEnd?: string;
  labelFontSize?: number;
}

export interface StyleState {
  // ---- state --------------------------------------------------
  activeStyleId: string | null;
  activePaletteId: string;
  darkMode: boolean;
  userPresets: StylePreset[];
  autoColorMode: AutoColorMode;
  customFont: string | null;
  canvasColorOverride: string | null;

  // ---- actions ------------------------------------------------
  setStyle: (styleId: string) => void;
  clearStyle: () => void;
  setPalette: (paletteId: string) => void;
  toggleDarkMode: () => void;
  setDarkMode: (dark: boolean) => void;
  addPreset: (preset: StylePreset) => void;
  removePreset: (presetId: string) => void;
  updatePreset: (presetId: string, patch: Partial<Omit<StylePreset, 'id'>>) => void;
  setAutoColorMode: (mode: AutoColorMode) => void;
  setCustomFont: (font: string | null) => void;
  setCanvasColorOverride: (color: string | null) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useStyleStore = create<StyleState>()(
  persist(
    (set) => ({
      // -- initial state --------------------------------------------
      activeStyleId: 'flatMaterial',
      activePaletteId: 'ocean',
      darkMode: false,
      userPresets: [],
      autoColorMode: 'manual',
      customFont: null,
      canvasColorOverride: null,

      // -- actions --------------------------------------------------
      setStyle: (styleId) => {
        const style = diagramStyles[styleId];
        const updates: Partial<StyleState> = {
          activeStyleId: styleId,
          canvasColorOverride: null,
          // Always activate the dynamic style palette when switching styles
          activePaletteId: STYLE_PALETTE_ID,
        };
        set(updates);

        // Update existing swimlane colors to match the style's accent palette.
        // Dark themes need higher opacity so lanes remain visible on dark backgrounds.
        if (style && style.accentColors.length > 0) {
          const swimlane = useSwimlaneStore.getState();
          const { horizontal, vertical } = swimlane.config;
          const laneOpacity = style.dark ? 30 : undefined; // boost for dark themes
          horizontal.forEach((lane, i) => {
            const patch: Record<string, unknown> = {
              color: style.accentColors[i % style.accentColors.length],
            };
            if (laneOpacity != null) patch.colorOpacity = laneOpacity;
            swimlane.updateLane('horizontal', lane.id, patch);
          });
          vertical.forEach((lane, i) => {
            const patch: Record<string, unknown> = {
              color: style.accentColors[(horizontal.length + i) % style.accentColors.length],
            };
            if (laneOpacity != null) patch.colorOpacity = laneOpacity;
            swimlane.updateLane('vertical', lane.id, patch);
          });
        }
      },

      clearStyle: () => set({ activeStyleId: null, canvasColorOverride: null }),

      setPalette: (paletteId) => set({ activePaletteId: paletteId }),

      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
      setDarkMode: (dark) => set({ darkMode: dark }),

      addPreset: (preset) =>
        set((s) => ({ userPresets: [...s.userPresets, preset] })),

      removePreset: (presetId) =>
        set((s) => ({
          userPresets: s.userPresets.filter((p) => p.id !== presetId),
        })),

      updatePreset: (presetId, patch) =>
        set((s) => ({
          userPresets: s.userPresets.map((p) =>
            p.id === presetId ? { ...p, ...patch } : p,
          ),
        })),

      setAutoColorMode: (mode) => set({ autoColorMode: mode }),

      setCustomFont: (font) => set({ customFont: font }),

      setCanvasColorOverride: (color) => set({ canvasColorOverride: color }),
    }),
    {
      name: 'charthero-styles',
      // Only persist data fields, not actions
      partialize: (state) => ({
        activeStyleId: state.activeStyleId,
        activePaletteId: state.activePaletteId,
        darkMode: state.darkMode,
        userPresets: state.userPresets,
        autoColorMode: state.autoColorMode,
        customFont: state.customFont,
        canvasColorOverride: state.canvasColorOverride,
      }),
    },
  ),
);

/** Direct access to the store (useful outside of React components) */
export const styleStore: StoreApi<StyleState> = useStyleStore;
