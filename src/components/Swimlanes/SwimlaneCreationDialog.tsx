import React, { useState, useCallback } from 'react';
import { X, Plus, Minus } from 'lucide-react';

import {
  useSwimlaneStore,
  type SwimlaneItem,
} from '../../store/swimlaneStore';
import { useStyleStore } from '../../store/styleStore';
import { diagramStyles } from '../../styles/diagramStyles';
import { generateId } from '../../utils/idGenerator';

// ---------------------------------------------------------------------------
// Pastel colour palette for auto-colouring lanes
// ---------------------------------------------------------------------------

const LANE_PALETTE = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CreationOrientation = 'horizontal' | 'vertical' | 'matrix';
type ColorMode = 'auto' | 'single';

// ---------------------------------------------------------------------------
// SwimlaneCreationDialog
// ---------------------------------------------------------------------------

const SwimlaneCreationDialog: React.FC = () => {
  const isCreating = useSwimlaneStore((s) => s.isCreating);
  const setIsCreating = useSwimlaneStore((s) => s.setIsCreating);
  const addLane = useSwimlaneStore((s) => s.addLane);
  const config = useSwimlaneStore((s) => s.config);
  const setOrientation = useSwimlaneStore((s) => s.setOrientation);
  const setContainerTitle = useSwimlaneStore((s) => s.setContainerTitle);
  const clearAllLanes = useSwimlaneStore((s) => s.clearAllLanes);
  const darkMode = useStyleStore((s) => s.darkMode);
  const activeStyleId = useStyleStore((s) => s.activeStyleId);

  // Whether there are existing lanes (determines whether to show Append option)
  const hasExistingLanes = config.horizontal.length > 0 || config.vertical.length > 0;

  // Use the active diagram style's accent colors when available, otherwise fall back to LANE_PALETTE
  const activePalette = React.useMemo(() => {
    if (activeStyleId) {
      const style = diagramStyles[activeStyleId];
      if (style && style.accentColors.length > 0) return style.accentColors;
    }
    return LANE_PALETTE;
  }, [activeStyleId]);

  // Local form state
  const [orientation, setLocalOrientation] = useState<CreationOrientation>('horizontal');
  const [laneCount, setLaneCount] = useState(3);
  const [labels, setLabels] = useState('');
  const [colorMode, setColorMode] = useState<ColorMode>('auto');
  const [singleColor, setSingleColor] = useState('#3b82f6');
  const [title, setTitle] = useState('');

  // Reset form state
  const resetForm = useCallback(() => {
    setLocalOrientation('horizontal');
    setLaneCount(3);
    setLabels('');
    setColorMode('auto');
    setSingleColor('#3b82f6');
    setTitle('');
  }, []);

  const handleClose = useCallback(() => {
    setIsCreating(false);
    resetForm();
  }, [setIsCreating, resetForm]);

  /** Core creation logic. When `mode` is 'append', lanes are added to existing.
   *  When 'createNew', existing lanes are cleared first. */
  const handleCreate = useCallback((mode: 'append' | 'createNew') => {
    // Clear existing lanes when creating new
    if (mode === 'createNew') {
      clearAllLanes();
    }

    const existingHCount = mode === 'createNew' ? 0 : config.horizontal.length;
    const existingVCount = mode === 'createNew' ? 0 : config.vertical.length;

    // Parse labels
    const parsedLabels = labels
      .split(',')
      .map((l) => l.trim())
      .filter(Boolean);

    // Build lane items (order offset continues from existing lanes)
    const buildLanes = (count: number, prefix: string, orderOffset: number): SwimlaneItem[] => {
      const items: SwimlaneItem[] = [];
      for (let i = 0; i < count; i++) {
        const lbl = parsedLabels[i] || `${prefix} ${orderOffset + i + 1}`;
        const color =
          colorMode === 'auto'
            ? activePalette[(orderOffset + i) % activePalette.length]
            : singleColor;
        items.push({
          id: generateId('lane'),
          label: lbl,
          color,
          collapsed: false,
          size: prefix === 'Row' ? 200 : 250,
          order: orderOffset + i,
          ...(darkMode ? { colorOpacity: 30 } : {}),
        });
      }
      return items;
    };

    // Set container title
    if (title.trim()) {
      setContainerTitle(title.trim());
    }

    if (orientation === 'horizontal') {
      setOrientation('horizontal');
      const lanes = buildLanes(laneCount, 'Row', existingHCount);
      for (const lane of lanes) {
        addLane('horizontal', lane);
      }
    } else if (orientation === 'vertical') {
      setOrientation('vertical');
      const lanes = buildLanes(laneCount, 'Column', existingVCount);
      for (const lane of lanes) {
        addLane('vertical', lane);
      }
    } else {
      // Matrix: create both horizontal and vertical lanes
      setOrientation('horizontal'); // primary is horizontal for matrix
      const hCount = Math.max(2, Math.ceil(laneCount / 2));
      const vCount = Math.max(2, laneCount - hCount);

      // Split labels: first half for rows, second half for columns
      const hLabels = parsedLabels.slice(0, hCount);
      const vLabels = parsedLabels.slice(hCount);

      const hLanes: SwimlaneItem[] = [];
      for (let i = 0; i < hCount; i++) {
        hLanes.push({
          id: generateId('lane'),
          label: hLabels[i] || `Row ${existingHCount + i + 1}`,
          color:
            colorMode === 'auto'
              ? activePalette[(existingHCount + i) % activePalette.length]
              : singleColor,
          collapsed: false,
          size: 200,
          order: existingHCount + i,
        });
      }

      const vLanes: SwimlaneItem[] = [];
      for (let i = 0; i < vCount; i++) {
        vLanes.push({
          id: generateId('lane'),
          label: vLabels[i] || `Col ${existingVCount + i + 1}`,
          color:
            colorMode === 'auto'
              ? activePalette[(existingVCount + hCount + i) % activePalette.length]
              : singleColor,
          collapsed: false,
          size: 250,
          order: existingVCount + i,
        });
      }

      for (const lane of hLanes) addLane('horizontal', lane);
      for (const lane of vLanes) addLane('vertical', lane);
    }

    handleClose();
  }, [
    labels,
    colorMode,
    singleColor,
    orientation,
    laneCount,
    title,
    config,
    setContainerTitle,
    setOrientation,
    addLane,
    clearAllLanes,
    handleClose,
    activePalette,
    darkMode,
  ]);

  if (!isCreating) return null;

  const bgClass = darkMode ? 'bg-surface-alt-dark' : 'bg-surface-alt';
  const borderClass = darkMode ? 'border-border-dark' : 'border-border';
  const textClass = darkMode ? 'text-text-dark' : 'text-text';
  const mutedClass = darkMode ? 'text-text-muted-dark' : 'text-text-muted';
  const inputBg = darkMode ? 'bg-surface-dark' : 'bg-white';

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      {/* Dialog */}
      <div
        className={`
          w-[420px] rounded-xl shadow-2xl border overflow-hidden
          ${bgClass} ${borderClass}
        `}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-3.5 border-b ${borderClass}`}>
          <h2 className={`text-sm font-semibold ${textClass}`}>Create Swimlanes</h2>
          <button
            onClick={handleClose}
            className={`p-1 rounded-md ${darkMode ? 'hover:bg-dk-hover' : 'hover:bg-slate-100'} transition-colors cursor-pointer ${mutedClass}`}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Container title */}
          <div className="flex flex-col gap-1">
            <label className={`text-[11px] font-medium uppercase tracking-wide ${mutedClass}`}>
              Container Title (optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Development Process"
              className={`
                w-full px-3 py-1.5 text-sm rounded-md border
                ${borderClass} ${inputBg} ${textClass}
                focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
              `}
            />
          </div>

          {/* Orientation */}
          <div className="flex flex-col gap-1">
            <label className={`text-[11px] font-medium uppercase tracking-wide ${mutedClass}`}>
              Orientation
            </label>
            <div className="flex gap-2">
              {(
                [
                  { value: 'horizontal', label: 'Horizontal' },
                  { value: 'vertical', label: 'Vertical' },
                  { value: 'matrix', label: 'Matrix' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setLocalOrientation(opt.value)}
                  className={`
                    flex-1 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer
                    ${orientation === opt.value
                      ? 'bg-primary/10 border-primary/40 text-primary'
                      : `${borderClass} ${mutedClass} ${darkMode ? 'hover:bg-dk-hover' : 'hover:bg-slate-50'}`
                    }
                  `}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lane count */}
          <div className="flex flex-col gap-1">
            <label className={`text-[11px] font-medium uppercase tracking-wide ${mutedClass}`}>
              {orientation === 'matrix' ? 'Total Lanes (split rows/cols)' : 'Number of Lanes'}
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setLaneCount((c) => Math.max(2, c - 1))}
                disabled={laneCount <= 2}
                className={`
                  w-8 h-8 flex items-center justify-center rounded-md border transition-colors cursor-pointer
                  disabled:opacity-40 disabled:cursor-not-allowed
                  ${borderClass} ${mutedClass} ${darkMode ? 'hover:bg-dk-hover' : 'hover:bg-slate-50'}
                `}
              >
                <Minus size={14} />
              </button>
              <span className={`text-lg font-semibold w-8 text-center ${textClass}`}>
                {laneCount}
              </span>
              <button
                onClick={() => setLaneCount((c) => Math.min(10, c + 1))}
                disabled={laneCount >= 10}
                className={`
                  w-8 h-8 flex items-center justify-center rounded-md border transition-colors cursor-pointer
                  disabled:opacity-40 disabled:cursor-not-allowed
                  ${borderClass} ${mutedClass} ${darkMode ? 'hover:bg-dk-hover' : 'hover:bg-slate-50'}
                `}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Labels */}
          <div className="flex flex-col gap-1">
            <label className={`text-[11px] font-medium uppercase tracking-wide ${mutedClass}`}>
              Lane Labels (comma-separated)
            </label>
            <input
              type="text"
              value={labels}
              onChange={(e) => setLabels(e.target.value)}
              placeholder="e.g. Design, Development, Testing"
              className={`
                w-full px-3 py-1.5 text-sm rounded-md border
                ${borderClass} ${inputBg} ${textClass}
                focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
              `}
            />
            <span className={`text-[10px] ${mutedClass}`}>
              Leave blank for default labels
            </span>
          </div>

          {/* Color mode */}
          <div className="flex flex-col gap-1">
            <label className={`text-[11px] font-medium uppercase tracking-wide ${mutedClass}`}>
              Color Mode
            </label>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setColorMode('auto')}
                className={`
                  flex-1 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer
                  ${colorMode === 'auto'
                    ? 'bg-primary/10 border-primary/40 text-primary'
                    : `${borderClass} ${mutedClass} ${darkMode ? 'hover:bg-dk-hover' : 'hover:bg-slate-50'}`
                  }
                `}
              >
                Auto Palette
              </button>
              <button
                onClick={() => setColorMode('single')}
                className={`
                  flex-1 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer
                  ${colorMode === 'single'
                    ? 'bg-primary/10 border-primary/40 text-primary'
                    : `${borderClass} ${mutedClass} ${darkMode ? 'hover:bg-dk-hover' : 'hover:bg-slate-50'}`
                  }
                `}
              >
                Single Color
              </button>
              {colorMode === 'single' && (
                <input
                  type="color"
                  value={singleColor}
                  onChange={(e) => setSingleColor(e.target.value)}
                  className="w-8 h-8 rounded border border-border cursor-pointer"
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-2 px-5 py-3.5 border-t ${borderClass}`}>
          <button
            onClick={handleClose}
            className={`
              px-4 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer
              ${borderClass} ${mutedClass} ${darkMode ? 'hover:bg-dk-hover' : 'hover:bg-slate-50'}
            `}
          >
            Cancel
          </button>
          {hasExistingLanes && (
            <button
              onClick={() => handleCreate('append')}
              className={`
                px-4 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer
                border-primary/40 text-primary ${darkMode ? 'hover:bg-primary/15' : 'hover:bg-primary/10'}
              `}
            >
              Append Lanes
            </button>
          )}
          <button
            onClick={() => handleCreate('createNew')}
            className="px-4 py-1.5 text-xs font-medium rounded-md bg-primary text-white
                       hover:bg-primary-hover transition-colors cursor-pointer"
          >
            {hasExistingLanes ? 'Create New' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(SwimlaneCreationDialog);
