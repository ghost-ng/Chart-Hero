// ---------------------------------------------------------------------------
// EdgePropertiesTab.tsx -- Full edge properties editor panel
// ---------------------------------------------------------------------------

import React, { useCallback, useState, useEffect } from 'react';
import { Check, ChevronDown, ChevronRight, Copy } from 'lucide-react';
import { useFlowStore, type FlowEdgeData } from '../../store/flowStore';

// ---------------------------------------------------------------------------
// Field wrapper
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
// SectionHeader -- Collapsible section toggle
// ---------------------------------------------------------------------------

const SectionHeader: React.FC<{
  title: string;
  collapsed: boolean;
  onToggle: () => void;
}> = ({ title, collapsed, onToggle }) => (
  <button
    onClick={onToggle}
    className="flex items-center justify-between w-full py-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted hover:text-text-primary transition-colors cursor-pointer border-t border-border dark:border-dk-border pt-3 mt-1"
  >
    <span>{title}</span>
    {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
  </button>
);

// ---------------------------------------------------------------------------
// CopyHexButton — small clipboard copy button for hex color inputs
// ---------------------------------------------------------------------------

const CopyHexButton: React.FC<{ value: string }> = ({ value }) => {
  const [copied, setCopied] = React.useState(false);
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
// Edge type options
// ---------------------------------------------------------------------------

const EDGE_TYPES = [
  { value: 'smoothstep', label: 'SmoothStep' },
  { value: 'bezier', label: 'Bezier' },
  { value: 'step', label: 'Step' },
  { value: 'straight', label: 'Straight' },
] as const;

const ARROWHEAD_TYPES = [
  { value: 'none', label: 'None' },
  { value: 'arrow', label: 'Arrow' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'circle', label: 'Circle' },
  { value: 'open', label: 'Open Arrow' },
] as const;

const DEPENDENCY_TYPES = [
  { value: 'none', label: 'None' },
  { value: 'depends-on', label: 'Depends On' },
  { value: 'blocks', label: 'Blocks' },
  { value: 'related', label: 'Related' },
] as const;

const EDGE_STYLES = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
] as const;

// ---------------------------------------------------------------------------
// Map arrowhead selector value to marker URL
// ---------------------------------------------------------------------------

const arrowheadToMarker = (type: string): string => {
  switch (type) {
    case 'arrow': return 'url(#charthero-filledTriangle)';
    case 'rounded': return 'url(#charthero-thinArrow)';
    case 'diamond': return 'url(#charthero-filledDiamond)';
    case 'circle': return 'url(#charthero-filledCircle)';
    case 'open': return 'url(#charthero-openTriangle)';
    default: return '';
  }
};

const markerToArrowhead = (marker?: string): string => {
  if (!marker) return 'none';
  if (marker.includes('thinArrow')) return 'rounded';
  if (marker.includes('filledTriangle')) return 'arrow';
  if (marker.includes('filledDiamond')) return 'diamond';
  if (marker.includes('filledCircle')) return 'circle';
  if (marker.includes('openTriangle')) return 'open';
  return 'none';
};

// ---------------------------------------------------------------------------
// Map edge style to strokeDasharray
// ---------------------------------------------------------------------------

const styleToStrokeDash = (style: string, spacing?: number): string | undefined => {
  switch (style) {
    case 'dashed': {
      const dashLen = spacing ?? 8;
      const gapLen = Math.max(2, Math.round(dashLen / 2));
      return `${dashLen} ${gapLen}`;
    }
    case 'dotted': {
      const dotLen = spacing ?? 2;
      const gapLen = Math.max(2, spacing ?? 4);
      return `${dotLen} ${gapLen}`;
    }
    default:
      return undefined;
  }
};

const strokeDashToStyle = (dash?: string): string => {
  if (!dash) return 'solid';
  const parts = dash.trim().split(/\s+/).map(Number);
  if (parts.length < 2) return 'solid';
  // Dotted: first segment <= 3
  if (parts[0] <= 3) return 'dotted';
  return 'dashed';
};

/** Extract the spacing value from a dash string */
const getDashSpacing = (dash?: string): number => {
  if (!dash) return 8;
  const parts = dash.trim().split(/\s+/).map(Number);
  if (parts.length < 2) return 8;
  // For dashed: return the dash length; for dotted: return the gap length
  if (parts[0] <= 3) return parts[1]; // dotted: gap is the spacing
  return parts[0]; // dashed: dash length is the spacing
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface EdgePropertiesTabProps {
  edgeId: string;
  edgeData: FlowEdgeData;
  edgeType?: string;
  selectedEdgeIds?: string[];
  toggleAllSignal?: number;
}

const EdgePropertiesTab: React.FC<EdgePropertiesTabProps> = React.memo(
  ({ edgeId, edgeData, edgeType, selectedEdgeIds, toggleAllSignal }) => {
    const edges = useFlowStore((s) => s.edges);
    const updateEdgeAction = useFlowStore((s) => s.updateEdge);

    // -----------------------------------------------------------------------
    // Collapsible section state
    // -----------------------------------------------------------------------

    const [allExpanded, setAllExpanded] = useState<boolean | null>(null);
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
      style: false,
      label: true,
      arrowheads: true,
      dependency: true,
    });

    const isSectionCollapsed = useCallback(
      (key: string): boolean => {
        if (allExpanded === true) return false;
        if (allExpanded === false) return true;
        return !!collapsedSections[key];
      },
      [allExpanded, collapsedSections],
    );

    const toggleSection = useCallback((key: string) => {
      setAllExpanded((prevAll) => {
        if (prevAll !== null) {
          // Sync collapsedSections to match the current allExpanded override
          // before applying the individual toggle, so other sections stay put
          const allCollapsed = !prevAll;
          setCollapsedSections({
            style: allCollapsed,
            label: allCollapsed,
            arrowheads: allCollapsed,
            dependency: allCollapsed,
            [key]: !allCollapsed, // toggle the clicked section
          });
        } else {
          setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
        }
        return null; // Clear override — individual states now govern
      });
    }, []);

    // React to toggle-all signal from the tab bar chevron
    useEffect(() => {
      if (toggleAllSignal === undefined || toggleAllSignal === 0) return;
      setAllExpanded((prev) => (prev === false ? true : false));
    }, [toggleAllSignal]);

    // -----------------------------------------------------------------------
    // Smart defaults on edge change
    // -----------------------------------------------------------------------

    useEffect(() => {
      // Compute marker values inside the effect to avoid dependency on
      // the outer `edges` reference (which would cause re-runs on every
      // edge array change instead of only on edgeId change).
      const edgesSnapshot = useFlowStore.getState().edges;
      const edge = edgesSnapshot.find((e) => e.id === edgeId);
      const mStart = markerToArrowhead(
        typeof edge?.markerStart === 'string' ? edge.markerStart : undefined,
      );
      const mEnd = markerToArrowhead(
        typeof edge?.markerEnd === 'string' ? edge.markerEnd : undefined,
      );

      setCollapsedSections({
        style: false, // always open
        label: !edgeData.label,
        arrowheads: mStart === 'none' && mEnd === 'none',
        dependency: !edgeData.dependencyType,
      });
      setAllExpanded(null);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [edgeId]); // only on edge change

    // -----------------------------------------------------------------------
    // Edge update helpers
    // -----------------------------------------------------------------------

    // Helper: get the IDs to update (all selected or just the current one)
    const getTargetIds = useCallback(
      (): string[] =>
        selectedEdgeIds && selectedEdgeIds.length > 1 ? selectedEdgeIds : [edgeId],
      [edgeId, selectedEdgeIds],
    );

    // Update edge data — uses immer draft mutation via updateEdge store action
    // for reliable Zustand change detection and React Flow re-rendering.
    const update = useCallback(
      (patch: Partial<FlowEdgeData>) => {
        const ids = getTargetIds();
        // Build style mirror for React Flow rendering
        const stylePatch: Record<string, unknown> = {};
        if ('thickness' in patch && patch.thickness != null) stylePatch.strokeWidth = patch.thickness;
        if ('color' in patch && patch.color != null) stylePatch.stroke = patch.color;
        if ('opacity' in patch && patch.opacity != null) stylePatch.opacity = patch.opacity;
        if ('strokeDasharray' in patch) stylePatch.strokeDasharray = patch.strokeDasharray;
        for (const id of ids) {
          updateEdgeAction(id, {
            data: patch as FlowEdgeData,
            ...(Object.keys(stylePatch).length > 0 ? { style: stylePatch as React.CSSProperties } : {}),
          });
        }
      },
      [getTargetIds, updateEdgeAction],
    );

    // Update the edge type (which is on the edge itself, not on edge.data)
    const updateType = useCallback(
      (type: string) => {
        for (const id of getTargetIds()) {
          updateEdgeAction(id, { type });
        }
      },
      [getTargetIds, updateEdgeAction],
    );

    // Update markerEnd on the edge itself
    const updateMarkerEnd = useCallback(
      (marker: string) => {
        for (const id of getTargetIds()) {
          updateEdgeAction(id, { markerEnd: marker || undefined });
        }
      },
      [getTargetIds, updateEdgeAction],
    );

    // Update markerStart on the edge itself
    const updateMarkerStart = useCallback(
      (marker: string) => {
        for (const id of getTargetIds()) {
          updateEdgeAction(id, { markerStart: marker || undefined });
        }
      },
      [getTargetIds, updateEdgeAction],
    );

    const strokeColor = edgeData.color || '#94a3b8';
    const thickness = edgeData.thickness || 2;
    const label = edgeData.label || '';
    const dependencyType = edgeData.dependencyType || 'none';

    // Infer current arrowheads from the edge record
    const currentEdge = edges.find((e) => e.id === edgeId);
    const currentMarkerEnd = markerToArrowhead(
      typeof currentEdge?.markerEnd === 'string' ? currentEdge.markerEnd : undefined,
    );
    const currentMarkerStart = markerToArrowhead(
      typeof currentEdge?.markerStart === 'string' ? currentEdge.markerStart : undefined,
    );

    // Infer line style from edge data or style override
    const currentStrokeDash =
      (edgeData as Record<string, unknown>).strokeDasharray as string | undefined;
    const currentLineStyle = strokeDashToStyle(currentStrokeDash);
    const currentDashSpacing = getDashSpacing(currentStrokeDash);

    return (
      <div className="flex flex-col gap-4">
        {/* ================================================================
            STYLE SECTION
            ================================================================ */}
        <SectionHeader
          title="Style"
          collapsed={isSectionCollapsed('style')}
          onToggle={() => toggleSection('style')}
        />

        {!isSectionCollapsed('style') && (
          <>
            {/* Connector type */}
            <Field label="Connector Type">
              <select
                value={edgeType || 'smoothstep'}
                onChange={(e) => updateType(e.target.value)}
                className="w-full px-2 py-1.5 text-sm rounded border border-border bg-white
                           dark:bg-dk-panel dark:border-dk-border dark:text-dk-text
                           focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
              >
                {EDGE_TYPES.map(({ value, label: lbl }) => (
                  <option key={value} value={value}>
                    {lbl}
                  </option>
                ))}
              </select>
            </Field>

            {/* Connector color */}
            <Field label="Connector Color">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={strokeColor}
                  onChange={(e) => update({ color: e.target.value })}
                  className="w-8 h-8 rounded border border-border cursor-pointer"
                />
                <input
                  type="text"
                  value={strokeColor}
                  onChange={(e) => update({ color: e.target.value })}
                  className="flex-1 px-2 py-1.5 text-xs font-mono rounded border border-border bg-white
                             dark:bg-dk-panel dark:border-dk-border dark:text-dk-text
                             focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <CopyHexButton value={strokeColor} />
              </div>
            </Field>

            {/* Thickness */}
            <Field label="Thickness">
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={1}
                  max={6}
                  step={0.5}
                  value={thickness}
                  onChange={(e) => update({ thickness: Number(e.target.value) })}
                  className="flex-1 accent-primary"
                />
                <span className="text-xs text-text-muted w-8 text-right font-mono">
                  {thickness}px
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
                  value={edgeData.opacity ?? 1}
                  onChange={(e) => update({ opacity: Number(e.target.value) })}
                  className="flex-1 h-1.5 accent-primary"
                />
                <span className="text-xs text-text-muted w-8 text-right font-mono">
                  {Math.round((edgeData.opacity ?? 1) * 100)}%
                </span>
              </div>
            </Field>

            {/* Line style */}
            <Field label="Line Style">
              <div className="flex items-center gap-1">
                {EDGE_STYLES.map(({ value, label: lbl }) => (
                  <button
                    key={value}
                    onClick={() => {
                      const dash = styleToStrokeDash(value);
                      update({ strokeDasharray: dash } as Partial<FlowEdgeData>);
                    }}
                    className={`
                      flex-1 py-1.5 text-xs font-medium rounded border transition-colors cursor-pointer
                      ${currentLineStyle === value
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'border-border text-text-muted hover:bg-slate-50 dark:hover:bg-dk-hover'
                      }
                    `}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </Field>

            {/* Dash spacing (only for dashed/dotted) */}
            {currentLineStyle !== 'solid' && (
              <Field label="Dash Spacing">
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={currentLineStyle === 'dotted' ? 2 : 4}
                    max={currentLineStyle === 'dotted' ? 16 : 24}
                    step={1}
                    value={currentDashSpacing}
                    onChange={(e) => {
                      const spacing = Number(e.target.value);
                      const dash = styleToStrokeDash(currentLineStyle, spacing);
                      update({ strokeDasharray: dash } as Partial<FlowEdgeData>);
                    }}
                    className="flex-1 accent-primary"
                  />
                  <span className="text-xs text-text-muted w-8 text-right font-mono">
                    {currentDashSpacing}px
                  </span>
                </div>
              </Field>
            )}

            {/* Animated toggle */}
            <Field label="Animated">
              <button
                onClick={() => {
                  const next = !edgeData.animated;
                  // When enabling animation, auto-set a dashed pattern if currently solid
                  const patch: Partial<FlowEdgeData> = { animated: next };
                  if (next && currentLineStyle === 'solid') {
                    patch.strokeDasharray = '8 4';
                  }
                  update(patch);
                }}
                className={`
                  w-full py-1.5 text-xs font-medium rounded border transition-colors cursor-pointer
                  ${edgeData.animated
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'border-border text-text-muted hover:bg-slate-50 dark:hover:bg-dk-hover'
                  }
                `}
              >
                {edgeData.animated ? 'On' : 'Off'}
              </button>
            </Field>
          </>
        )}

        {/* ================================================================
            LABEL SECTION
            ================================================================ */}
        <SectionHeader
          title="Label"
          collapsed={isSectionCollapsed('label')}
          onToggle={() => toggleSection('label')}
        />

        {!isSectionCollapsed('label') && (
          <>
            {/* Connector label */}
            <Field label="Label">
              <input
                type="text"
                value={label}
                onChange={(e) => update({ label: e.target.value })}
                placeholder="Connector label..."
                className="w-full px-2 py-1.5 text-sm rounded border border-border bg-white
                           dark:bg-dk-panel dark:border-dk-border dark:text-dk-text
                           focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </Field>

            {/* Label color */}
            {label && (
              <Field label="Label Color">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={(edgeData as Record<string, unknown>).labelColor as string || '#475569'}
                    onChange={(e) => update({ labelColor: e.target.value } as Partial<FlowEdgeData>)}
                    className="w-8 h-8 rounded border border-border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={(edgeData as Record<string, unknown>).labelColor as string || '#475569'}
                    onChange={(e) => update({ labelColor: e.target.value } as Partial<FlowEdgeData>)}
                    className="flex-1 px-2 py-1.5 text-xs font-mono rounded border border-border bg-white
                               dark:bg-dk-panel dark:border-dk-border dark:text-dk-text
                               focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                  <CopyHexButton value={(edgeData as Record<string, unknown>).labelColor as string || '#475569'} />
                </div>
              </Field>
            )}

            {/* Label font size */}
            {label && (
              <Field label="Label Font Size">
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={8}
                    max={24}
                    step={1}
                    value={(edgeData as Record<string, unknown>).labelFontSize as number || 11}
                    onChange={(e) => update({ labelFontSize: Number(e.target.value) } as Partial<FlowEdgeData>)}
                    className="flex-1 accent-primary"
                  />
                  <span className="text-xs text-text-muted w-8 text-right font-mono">
                    {(edgeData as Record<string, unknown>).labelFontSize as number || 11}px
                  </span>
                </div>
              </Field>
            )}

            {/* Label background color */}
            {label && (
              <Field label="Label BG Color">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={(edgeData as Record<string, unknown>).labelBgColor as string || '#ffffff'}
                    onChange={(e) => update({ labelBgColor: e.target.value } as Partial<FlowEdgeData>)}
                    className="w-8 h-8 rounded border border-border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={(edgeData as Record<string, unknown>).labelBgColor as string || '#ffffff'}
                    onChange={(e) => update({ labelBgColor: e.target.value } as Partial<FlowEdgeData>)}
                    className="flex-1 px-2 py-1.5 text-xs font-mono rounded border border-border bg-white
                               dark:bg-dk-panel dark:border-dk-border dark:text-dk-text
                               focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                  <CopyHexButton value={(edgeData as Record<string, unknown>).labelBgColor as string || '#ffffff'} />
                </div>
              </Field>
            )}
          </>
        )}

        {/* ================================================================
            ARROWHEADS SECTION
            ================================================================ */}
        <SectionHeader
          title="Arrowheads"
          collapsed={isSectionCollapsed('arrowheads')}
          onToggle={() => toggleSection('arrowheads')}
        />

        {!isSectionCollapsed('arrowheads') && (
          <>
            {/* Start arrowhead */}
            <Field label="Start (Source)">
              <select
                value={currentMarkerStart}
                onChange={(e) => updateMarkerStart(arrowheadToMarker(e.target.value))}
                className="w-full px-2 py-1.5 text-sm rounded border border-border bg-white
                           dark:bg-dk-panel dark:border-dk-border dark:text-dk-text
                           focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
              >
                {ARROWHEAD_TYPES.map(({ value, label: lbl }) => (
                  <option key={value} value={value}>
                    {lbl}
                  </option>
                ))}
              </select>
            </Field>

            {/* End arrowhead */}
            <Field label="End (Target)">
              <select
                value={currentMarkerEnd}
                onChange={(e) => updateMarkerEnd(arrowheadToMarker(e.target.value))}
                className="w-full px-2 py-1.5 text-sm rounded border border-border bg-white
                           dark:bg-dk-panel dark:border-dk-border dark:text-dk-text
                           focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
              >
                {ARROWHEAD_TYPES.map(({ value, label: lbl }) => (
                  <option key={value} value={value}>
                    {lbl}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}

        {/* ================================================================
            DEPENDENCY SECTION
            ================================================================ */}
        <SectionHeader
          title="Dependency"
          collapsed={isSectionCollapsed('dependency')}
          onToggle={() => toggleSection('dependency')}
        />

        {!isSectionCollapsed('dependency') && (
          <Field label="Dependency Type">
            <select
              value={dependencyType}
              onChange={(e) =>
                update({
                  dependencyType: e.target.value as FlowEdgeData['dependencyType'],
                })
              }
              className="w-full px-2 py-1.5 text-sm rounded border border-border bg-white
                         dark:bg-dk-panel dark:border-dk-border dark:text-dk-text
                         focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
            >
              {DEPENDENCY_TYPES.map(({ value, label: lbl }) => (
                <option key={value} value={value}>
                  {lbl}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>
    );
  },
);

EdgePropertiesTab.displayName = 'EdgePropertiesTab';

export default EdgePropertiesTab;
