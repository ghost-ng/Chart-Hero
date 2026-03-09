/**
 * MiniMapOverlays — injects swimlane band rects and edge lines into React
 * Flow's MiniMap SVG.
 *
 * The MiniMap doesn't support custom SVG children, so we DOM-inject SVG
 * elements.  All coordinates are in flow-space (the same coordinate system
 * the minimap uses for its viewBox).
 */

import { useEffect } from 'react';
import { useSwimlaneStore, type SwimlaneItem } from '../../store/swimlaneStore';
import { useLegendStore } from '../../store/legendStore';
import { useStyleStore } from '../../store/styleStore';
import { useFlowStore, type FlowNodeData, type FlowEdgeData } from '../../store/flowStore';

// ---------------------------------------------------------------------------
// Lane bounds helper (mirrors SwimlaneLayer.computeBounds)
// ---------------------------------------------------------------------------

function computeBounds(
  lanes: SwimlaneItem[],
  headerOffset: number,
): Array<{ lane: SwimlaneItem; offset: number; size: number }> {
  const sorted = [...lanes].sort((a, b) => a.order - b.order);
  const result: Array<{ lane: SwimlaneItem; offset: number; size: number }> = [];
  let cursor = headerOffset;
  for (const lane of sorted) {
    if (lane.hidden) { result.push({ lane, offset: cursor, size: 0 }); continue; }
    const sz = lane.collapsed ? 32 : lane.size;
    result.push({ lane, offset: cursor, size: sz });
    cursor += sz;
  }
  return result;
}

// ---------------------------------------------------------------------------
// SVG namespace constant
// ---------------------------------------------------------------------------

const SVG_NS = 'http://www.w3.org/2000/svg';
const OVERLAY_ID = 'minimap-swimlane-overlay';
const LEGEND_OVERLAY_ID = 'minimap-legend-overlay';
const EDGE_OVERLAY_ID = 'minimap-edge-overlay';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MiniMapOverlays() {
  const containers = useSwimlaneStore((s) => s.containers);
  const darkMode = useStyleStore((s) => s.darkMode);

  // Legend state
  const nodeLegend = useLegendStore((s) => s.nodeLegend);

  // --- Swimlane overlay (all containers) ---
  useEffect(() => {
    const svg = document.querySelector('.react-flow__minimap-svg') as SVGSVGElement | null;
    if (!svg) return;

    // Remove stale overlay
    svg.querySelector(`#${OVERLAY_ID}`)?.remove();

    // Check if any container has lanes
    const hasAny = containers.some((c) => c.config.horizontal.length > 0 || c.config.vertical.length > 0);
    if (!hasAny) return;

    const g = document.createElementNS(SVG_NS, 'g');
    g.id = OVERLAY_ID;

    for (const container of containers) {
      const hLanes = container.config.horizontal;
      const vLanes = container.config.vertical;
      const hasH = hLanes.length > 0;
      const hasV = vLanes.length > 0;
      if (!hasH && !hasV) continue;

      const ox = container.containerOffset.x;
      const oy = container.containerOffset.y;
      const hHeaderWidth = container.config.hHeaderWidth ?? 48;
      const vHeaderHeight = container.config.vHeaderHeight ?? 32;

      const hBounds = hasH ? computeBounds(hLanes, hasV ? vHeaderHeight : 0) : [];
      const vBounds = hasV ? computeBounds(vLanes, hasH ? hHeaderWidth : 0) : [];

      const totalWidth = hasV
        ? vBounds.reduce((m, b) => Math.max(m, b.offset + b.size), 0)
        : (container.config.containerWidth ?? 800);
      const totalHeight = hasH
        ? hBounds.reduce((m, b) => Math.max(m, b.offset + b.size), 0)
        : 2000;

      // Horizontal lane bands
      for (const { lane, offset, size } of hBounds) {
        if (lane.hidden || size === 0) continue;
        const headerW = hasH ? hHeaderWidth : 0;
        const rect = document.createElementNS(SVG_NS, 'rect');
        rect.setAttribute('x', String(ox + headerW));
        rect.setAttribute('y', String(oy + offset));
        rect.setAttribute('width', String(totalWidth - headerW));
        rect.setAttribute('height', String(size));
        rect.setAttribute('fill', lane.color);
        rect.setAttribute('opacity', String(
          lane.colorOpacity != null ? lane.colorOpacity / 100 : (darkMode ? 0.25 : 0.3)
        ));
        g.appendChild(rect);
      }

      // Vertical lane bands
      for (const { lane, offset, size } of vBounds) {
        if (lane.hidden || size === 0) continue;
        const headerH = hasV ? vHeaderHeight : 0;
        const rect = document.createElementNS(SVG_NS, 'rect');
        rect.setAttribute('x', String(ox + offset));
        rect.setAttribute('y', String(oy + headerH));
        rect.setAttribute('width', String(size));
        rect.setAttribute('height', String(totalHeight - headerH));
        rect.setAttribute('fill', lane.color);
        rect.setAttribute('opacity', String(
          lane.colorOpacity != null ? lane.colorOpacity / 100 : (darkMode ? 0.2 : 0.25)
        ));
        g.appendChild(rect);
      }

      // Outer border
      const border = document.createElementNS(SVG_NS, 'rect');
      border.setAttribute('x', String(ox));
      border.setAttribute('y', String(oy));
      border.setAttribute('width', String(totalWidth));
      border.setAttribute('height', String(totalHeight));
      border.setAttribute('fill', 'none');
      border.setAttribute('stroke', darkMode ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.3)');
      border.setAttribute('stroke-width', '2');
      border.setAttribute('rx', '3');
      g.appendChild(border);
    }

    // Insert before the first child (behind nodes)
    svg.insertBefore(g, svg.firstChild);

    return () => { g.remove(); };
  }, [containers, darkMode]);

  // --- Legend overlay (shaded region in flow-space) ---
  useEffect(() => {
    const svg = document.querySelector('.react-flow__minimap-svg') as SVGSVGElement | null;
    if (!svg) return;

    svg.querySelector(`#${LEGEND_OVERLAY_ID}`)?.remove();

    if (!nodeLegend.visible || nodeLegend.items.length === 0) return;

    // Legend position is in flow-space (same coordinate system as the minimap).
    // Width comes from style; height is estimated from item count + title bar.
    const { position, style, items, title } = nodeLegend;
    const legendW = style.width;
    // Estimate height: title bar (~24px) + each item row (~(fontSize + 8)px) + padding
    const rowH = style.fontSize + 8;
    const visibleItems = items.filter((i) => !i.hidden);
    const legendH = 24 + visibleItems.length * rowH + 8;

    const g = document.createElementNS(SVG_NS, 'g');
    g.id = LEGEND_OVERLAY_ID;

    // Main background
    const bg = document.createElementNS(SVG_NS, 'rect');
    bg.setAttribute('x', String(position.x));
    bg.setAttribute('y', String(position.y));
    bg.setAttribute('width', String(legendW));
    bg.setAttribute('height', String(legendH));
    bg.setAttribute('fill', darkMode ? 'rgba(20,30,45,0.6)' : 'rgba(255,255,255,0.6)');
    bg.setAttribute('stroke', darkMode ? 'rgba(148,163,184,0.35)' : 'rgba(100,116,139,0.25)');
    bg.setAttribute('stroke-width', '1.5');
    bg.setAttribute('rx', '4');
    g.appendChild(bg);

    // Title text
    const titleEl = document.createElementNS(SVG_NS, 'text');
    titleEl.setAttribute('x', String(position.x + 8));
    titleEl.setAttribute('y', String(position.y + 15));
    titleEl.setAttribute('font-size', String(Math.max(8, style.fontSize - 1)));
    titleEl.setAttribute('font-weight', '600');
    titleEl.setAttribute('fill', darkMode ? '#94a3b8' : '#475569');
    titleEl.textContent = title || 'Legend';
    g.appendChild(titleEl);

    // Color swatches for each visible item
    let rowY = position.y + 26;
    for (const item of visibleItems) {
      // Swatch rect
      const sw = document.createElementNS(SVG_NS, 'rect');
      const swSize = Math.max(6, style.fontSize - 2);
      sw.setAttribute('x', String(position.x + 8));
      sw.setAttribute('y', String(rowY));
      sw.setAttribute('width', String(swSize));
      sw.setAttribute('height', String(swSize));
      sw.setAttribute('fill', item.color);
      sw.setAttribute('rx', item.kind === 'puck' ? String(swSize / 2) : '1');
      g.appendChild(sw);

      // Label
      const label = document.createElementNS(SVG_NS, 'text');
      label.setAttribute('x', String(position.x + 8 + swSize + 4));
      label.setAttribute('y', String(rowY + swSize - 1));
      label.setAttribute('font-size', String(Math.max(6, style.fontSize - 2)));
      label.setAttribute('fill', darkMode ? '#7e8d9f' : '#64748b');
      label.textContent = item.label;
      g.appendChild(label);

      rowY += rowH;
    }

    // Insert before the first child (behind nodes) so it doesn't cover them
    svg.insertBefore(g, svg.firstChild);

    return () => { g.remove(); };
  }, [nodeLegend, darkMode]);

  // --- Edge overlay (simple lines between node centres) ---
  const edges = useFlowStore((s) => s.edges);
  const nodes = useFlowStore((s) => s.nodes);

  useEffect(() => {
    const svg = document.querySelector('.react-flow__minimap-svg') as SVGSVGElement | null;
    if (!svg) return;

    svg.querySelector(`#${EDGE_OVERLAY_ID}`)?.remove();

    if (edges.length === 0) return;

    const g = document.createElementNS(SVG_NS, 'g');
    g.id = EDGE_OVERLAY_ID;

    // Build a quick lookup of node centres
    const nodeCentres = new Map<string, { x: number; y: number }>();
    for (const n of nodes) {
      const w = n.measured?.width ?? (n.width as number | undefined) ?? 100;
      const h = n.measured?.height ?? (n.height as number | undefined) ?? 40;
      nodeCentres.set(n.id, { x: (n.position?.x ?? 0) + w / 2, y: (n.position?.y ?? 0) + h / 2 });
    }

    for (const edge of edges) {
      const src = nodeCentres.get(edge.source);
      const tgt = nodeCentres.get(edge.target);
      if (!src || !tgt) continue;

      // Skip endpoint-only edges (invisible dots)
      const srcData = nodes.find((n) => n.id === edge.source)?.data as FlowNodeData | undefined;
      const tgtData = nodes.find((n) => n.id === edge.target)?.data as FlowNodeData | undefined;
      if (srcData?.isConnectorEndpoint && tgtData?.isConnectorEndpoint) continue;

      const edgeData = edge.data as FlowEdgeData | undefined;
      const color = edgeData?.color || (darkMode ? '#64748b' : '#94a3b8');

      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', String(src.x));
      line.setAttribute('y1', String(src.y));
      line.setAttribute('x2', String(tgt.x));
      line.setAttribute('y2', String(tgt.y));
      line.setAttribute('stroke', color);
      line.setAttribute('stroke-width', '2');
      line.setAttribute('opacity', '0.6');
      g.appendChild(line);
    }

    // Insert after swimlane overlay but before nodes
    const nodeLayer = svg.querySelector('.react-flow__minimap-nodes');
    if (nodeLayer) {
      svg.insertBefore(g, nodeLayer);
    } else {
      svg.appendChild(g);
    }

    return () => { g.remove(); };
  }, [edges, nodes, darkMode]);

  return null; // This component doesn't render DOM — it injects into MiniMap SVG
}
