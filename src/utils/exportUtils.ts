// ---------------------------------------------------------------------------
// exportUtils.ts -- All export functions for Chart Hero
// ---------------------------------------------------------------------------

import React, { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { toPng, toJpeg, toSvg } from 'html-to-image';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import PptxGenJS from 'pptxgenjs';
type SHAPE_NAME = PptxGenJS.SHAPE_NAME;
import { icons as lucideIcons } from 'lucide-react';

import { useFlowStore, newPuckId, getStatusIndicators } from '../store/flowStore';
import type { FlowNode, FlowEdge, FlowNodeData, FlowEdgeData, StatusIndicator } from '../store/flowStore';
import { useStyleStore } from '../store/styleStore';
import { useSwimlaneStore } from '../store/swimlaneStore';
import type { SwimlaneConfig, BorderStyleType } from '../store/swimlaneStore';
import { useBannerStore } from '../store/bannerStore';
import type { BannerConfig } from '../store/bannerStore';
import { useLayerStore } from '../store/layerStore';
import type { Layer } from '../store/layerStore';
import { useLegendStore } from '../store/legendStore';
import type { LegendItemKind, LegendItem } from '../store/legendStore';
import { useTimerStore } from '../store/timerStore';
import { log } from './logger';
import {
  type ExportFormat,
  type PngExportOptions,
  type JpgExportOptions,
  type SvgExportOptions,
  type PdfExportOptions,
  type PptxExportOptions,
  type JsonExportOptions,
} from '../store/exportStore';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Find the canvas element to capture.
 * Prefers `[data-charthero-canvas-area]` which wraps both the swimlane layer
 * AND the `.react-flow` viewport — so swimlanes are included in exports.
 * Falls back to `.react-flow` if the wrapper isn't found.
 */
export function getReactFlowElement(): HTMLElement {
  const canvasArea = document.querySelector<HTMLElement>('[data-charthero-canvas-area]');
  if (canvasArea) return canvasArea;
  const container = document.querySelector<HTMLElement>('.react-flow');
  if (container) return container;
  throw new Error('Could not find React Flow element in the DOM');
}

/**
 * Generates a timestamped filename.
 */
function getFilename(ext: string): string {
  const date = new Date();
  const stamp = date.toISOString().slice(0, 19).replace(/[:T]/g, '-');
  return `charthero-${stamp}.${ext}`;
}

/**
 * Estimates the file size for a given format (rough heuristic).
 */
export function estimateFileSize(
  format: ExportFormat,
  nodeCount: number,
  edgeCount: number,
  scale: number = 2,
): string {
  const base = Math.max(1, nodeCount * 500 + edgeCount * 200);
  let bytes: number;

  switch (format) {
    case 'png':
      bytes = base * scale * scale * 4;
      break;
    case 'jpg':
      bytes = base * scale * scale * 2;
      break;
    case 'svg':
      bytes = base * 3;
      break;
    case 'pdf':
      bytes = base * scale * scale * 4 + 5000;
      break;
    case 'pptx':
      bytes = base * scale * scale * 4 + 10000;
      break;
    case 'json':
      bytes = (nodeCount * 400 + edgeCount * 200) || 200;
      break;
    case 'csv':
      bytes = (nodeCount * 100 + edgeCount * 60) || 100;
      break;
    default:
      bytes = base;
  }

  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// PNG Export
// ---------------------------------------------------------------------------

export async function exportAsPng(options: PngExportOptions): Promise<void> {
  const element = getReactFlowElement();
  const { scale, transparentBackground, padding } = options;

  const dataUrl = await toPng(element, {
    pixelRatio: scale,
    backgroundColor: transparentBackground ? undefined : '#ffffff',
    style: {
      padding: `${padding}px`,
    },
  });

  const response = await fetch(dataUrl);
  const blob = await response.blob();
  saveAs(blob, getFilename('png'));
}

// ---------------------------------------------------------------------------
// JPG Export
// ---------------------------------------------------------------------------

export async function exportAsJpg(options: JpgExportOptions): Promise<void> {
  const element = getReactFlowElement();
  const { quality, scale, backgroundColor, padding } = options;

  const dataUrl = await toJpeg(element, {
    quality,
    pixelRatio: scale,
    backgroundColor: backgroundColor || '#ffffff',
    style: {
      padding: `${padding}px`,
    },
  });

  const response = await fetch(dataUrl);
  const blob = await response.blob();
  saveAs(blob, getFilename('jpg'));
}

// ---------------------------------------------------------------------------
// SVG Export
// ---------------------------------------------------------------------------

export async function exportAsSvg(options: SvgExportOptions): Promise<void> {
  const { embedFonts, padding } = options;

  // Use the canvas area wrapper (includes swimlane layer + ReactFlow viewport).
  // Falls back to .react-flow if the wrapper isn't found.
  const container = document.querySelector<HTMLElement>('[data-charthero-canvas-area]')
    ?? document.querySelector<HTMLElement>('.react-flow');
  if (!container) throw new Error('Could not find React Flow element in the DOM');

  const dataUrl = await toSvg(container, {
    skipFonts: !embedFonts,
    backgroundColor: '#ffffff',
    width: container.offsetWidth + padding * 2,
    height: container.offsetHeight + padding * 2,
    style: {
      padding: `${padding}px`,
    },
    filter: (node) => {
      // Exclude minimap, controls, and panel overlays from the SVG
      const el = node as HTMLElement;
      if (!el.classList) return true;
      if (el.classList.contains('react-flow__minimap')) return false;
      if (el.classList.contains('react-flow__controls')) return false;
      if (el.classList.contains('react-flow__panel')) return false;
      return true;
    },
  });

  // Convert data URL to SVG string
  const svgString = decodeURIComponent(dataUrl.split(',')[1]);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  saveAs(blob, getFilename('svg'));
}

// ---------------------------------------------------------------------------
// PDF Export
// ---------------------------------------------------------------------------

/** Map page size keys to jsPDF format strings */
const PDF_PAGE_SIZES: Record<string, string> = {
  a4: 'a4',
  a3: 'a3',
  letter: 'letter',
  legal: 'legal',
};

export async function exportAsPdf(options: PdfExportOptions): Promise<void> {
  const element = getReactFlowElement();

  // Capture the diagram as a PNG first
  const dataUrl = await toPng(element, {
    pixelRatio: 2,
    backgroundColor: '#ffffff',
  });

  const { pageSize, orientation, fitToPage, margin } = options;
  const pdfFormat = PDF_PAGE_SIZES[pageSize] || 'a4';

  const doc = new jsPDF({
    orientation: orientation === 'portrait' ? 'portrait' : 'landscape',
    unit: 'mm',
    format: pdfFormat,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginMm = margin || 20;

  // Load image to get dimensions
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = dataUrl;
  });

  const imgWidth = img.width;
  const imgHeight = img.height;

  let drawWidth = pageWidth - marginMm * 2;
  let drawHeight = pageHeight - marginMm * 2;

  if (fitToPage) {
    const imgAspect = imgWidth / imgHeight;
    const pageAspect = drawWidth / drawHeight;

    if (imgAspect > pageAspect) {
      drawHeight = drawWidth / imgAspect;
    } else {
      drawWidth = drawHeight * imgAspect;
    }
  }

  // Center the image on the page
  const x = marginMm + (pageWidth - marginMm * 2 - drawWidth) / 2;
  const y = marginMm + (pageHeight - marginMm * 2 - drawHeight) / 2;

  doc.addImage(dataUrl, 'PNG', x, y, drawWidth, drawHeight);

  // Footer with date
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  const dateStr = new Date().toLocaleDateString();
  doc.text(
    `Chart Hero Diagram - ${dateStr}`,
    pageWidth / 2,
    pageHeight - 5,
    { align: 'center' },
  );

  doc.save(getFilename('pdf'));
}

// ---------------------------------------------------------------------------
// PPTX Export -- comprehensive feature parity
// ---------------------------------------------------------------------------

/**
 * Map Chart Hero node shapes to pptxgenjs SHAPE_NAME values.
 */
const PPTX_SHAPE_MAP: Record<string, SHAPE_NAME> = {
  rectangle: 'rect',
  roundedRectangle: 'roundRect',
  diamond: 'diamond',
  circle: 'ellipse',
  ellipse: 'ellipse',
  hexagon: 'hexagon',
  parallelogram: 'parallelogram',
  document: 'flowChartDocument',
  cloud: 'cloud',
  star: 'star5',
  triangle: 'triangle',
  callout: 'wedgeRoundRectCallout',
  predefinedProcess: 'flowChartPredefinedProcess',
  manualInput: 'flowChartManualInput',
  preparation: 'flowChartPreparation',
  data: 'flowChartInputOutput',
  database: 'flowChartMagneticDisk',
  internalStorage: 'flowChartInternalStorage',
  display: 'flowChartDisplay',
  stickyNote: 'rect',
  textbox: 'rect',
  group: 'rect',
};

/**
 * SVG path definitions for arrow / complex shapes that have no PPTX primitive.
 */
const SVG_SHAPE_RENDERERS: Record<
  string,
  (w: number, h: number, fill: string, stroke: string, strokeWidth: number, dashArray: string) => string
> = {
  blockArrow: (w, h, fill, stroke, sw, dash) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 160 80">
      <path d="M 0 20 L 100 20 L 100 5 L 155 40 L 100 75 L 100 60 L 0 60 Z"
            fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-dasharray="${dash}" stroke-linejoin="round"/>
    </svg>`,
  chevronArrow: (w, h, fill, stroke, sw, dash) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 160 80">
      <path d="M 0 5 L 115 5 L 155 40 L 115 75 L 0 75 L 40 40 Z"
            fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-dasharray="${dash}" stroke-linejoin="round"/>
    </svg>`,
  doubleArrow: (w, h, fill, stroke, sw, dash) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 160 80">
      <path d="M 40 5 L 0 40 L 40 75 L 40 55 L 120 55 L 120 75 L 160 40 L 120 5 L 120 25 L 40 25 Z"
            fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-dasharray="${dash}" stroke-linejoin="round"/>
    </svg>`,
  circularArrow: (w, h, fill, stroke, sw, _dash) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 100 80">
      <path d="M 75 12 A 32 32 0 1 1 38 20" fill="none" stroke="${fill}" stroke-width="6" stroke-linecap="round"/>
      <polygon points="24,4 48,20 22,28" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>
    </svg>`,
  arrow: (w, h, fill, stroke, sw, dash) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 160 80">
      <path d="M 0 20 L 100 20 L 100 5 L 155 40 L 100 75 L 100 60 L 0 60 Z"
            fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-dasharray="${dash}" stroke-linejoin="round"/>
    </svg>`,
};

/** Default dimensions per shape (mirrors GenericShapeNode logic). */
function getDefaultSize(shape: string): { w: number; h: number } {
  const ARROW_SHAPES = new Set(['blockArrow', 'chevronArrow', 'doubleArrow', 'circularArrow']);
  if (shape === 'circularArrow') return { w: 100, h: 100 };
  if (ARROW_SHAPES.has(shape)) return { w: 160, h: 80 };
  if (shape === 'circle') return { w: 100, h: 100 };
  if (shape === 'diamond') return { w: 100, h: 100 };
  return { w: 160, h: 60 };
}

/** Convert Chart Hero borderStyle to PptxGenJS dashType */
function toPptxDashType(style?: string): 'solid' | 'dash' | 'sysDot' | 'lgDash' {
  if (style === 'dashed') return 'lgDash';
  if (style === 'dotted') return 'sysDot';
  return 'solid';
}

/** Convert strokeDasharray string to PptxGenJS dashType */
function dashArrayToPptxDash(da?: string): 'solid' | 'dash' | 'sysDot' | 'lgDash' {
  if (!da) return 'solid';
  // "8 4" or similar → dashed; "2 2" or "1 3" → dotted
  const parts = da.trim().split(/\s+/).map(Number);
  if (parts.length >= 2 && parts[0] <= 3) return 'sysDot';
  if (parts.length >= 2) return 'lgDash';
  return 'solid';
}

/** Map React Flow marker strings to PptxGenJS arrow types */
function toPptxArrowType(marker?: string): 'none' | 'triangle' | 'stealth' | 'arrow' | 'diamond' | 'oval' {
  if (!marker) return 'none';
  // Match specific marker names before generic keywords to avoid
  // 'openDiamond' matching 'open' before 'diamond'
  if (marker.includes('filledTriangle')) return 'triangle';
  if (marker.includes('openTriangle')) return 'stealth';
  if (marker.includes('filledDiamond')) return 'diamond';
  if (marker.includes('openDiamond')) return 'diamond';
  if (marker.includes('filledCircle')) return 'oval';
  if (marker.includes('openCircle')) return 'oval';
  if (marker.includes('tee')) return 'stealth';
  // Generic fallbacks
  if (marker.includes('closed')) return 'triangle';
  if (marker.includes('open')) return 'stealth';
  if (marker.includes('diamond')) return 'diamond';
  if (marker.includes('circle') || marker.includes('dot')) return 'oval';
  if (marker.startsWith('url(')) return 'triangle';
  return 'triangle';
}

/** Extract marker type string from either string or object form markers */
function extractMarker(m: unknown): string | undefined {
  if (typeof m === 'string') return m;
  if (typeof m === 'object' && m !== null && 'type' in m) {
    return (m as { type: string }).type;
  }
  return undefined;
}

/** Convert hex color string, stripping # prefix */
function hex(color?: string, fallback = '94a3b8'): string {
  if (!color || color === 'transparent') return fallback;
  return color.replace('#', '');
}

/** Darken a hex color by ~25% for use as a border color */
function darkenHex(color: string): string {
  const c = color.replace('#', '');
  const r = Math.max(0, Math.round(parseInt(c.substring(0, 2), 16) * 0.7));
  const g = Math.max(0, Math.round(parseInt(c.substring(2, 4), 16) * 0.7));
  const b = Math.max(0, Math.round(parseInt(c.substring(4, 6), 16) * 0.7));
  return [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

/**
 * Render a lucide icon to an SVG data URI for embedding in PPTX.
 * Returns null if the icon name is not found.
 */
function renderLucideIconSvg(iconName: string, color: string, size: number): string | null {
  const IconComp = (lucideIcons as Record<string, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>>)[iconName];
  if (!IconComp) return null;

  const container = document.createElement('div');
  const root = createRoot(container);
  flushSync(() => {
    root.render(createElement(IconComp, { size, color, strokeWidth: 2 }));
  });

  const svg = container.querySelector('svg');
  if (!svg) {
    root.unmount();
    return null;
  }

  // Ensure xmlns for standalone SVG
  if (!svg.getAttribute('xmlns')) {
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }

  const svgStr = svg.outerHTML;
  root.unmount();

  return `data:image/svg+xml;base64,${btoa(svgStr)}`;
}

/** Get StatusIndicator puck position offsets relative to node dimensions */
function puckOffset(
  position: StatusIndicator['position'],
  nodeW: number,
  nodeH: number,
  puckSize: number,
): { x: number; y: number } {
  const half = puckSize / 2;
  switch (position) {
    case 'top-left': return { x: -half, y: -half };
    case 'bottom-left': return { x: -half, y: nodeH - half };
    case 'bottom-right': return { x: nodeW - half, y: nodeH - half };
    case 'top-right':
    default: return { x: nodeW - half, y: -half };
  }
}

export async function exportAsPptx(options: PptxExportOptions): Promise<void> {
  const state = useFlowStore.getState();
  const styleState = useStyleStore.getState();
  const swimlaneState = useSwimlaneStore.getState();
  const legendState = useLegendStore.getState();
  const { nodes, edges } = state;
  const globalFont = styleState.customFont || 'Arial';
  const isDarkMode = styleState.darkMode;

  const { slideSize, includeNotes, oneSlidePerGroup } = options;

  const pptx = new PptxGenJS();

  // -- slide dimensions -----------------------------------------------
  const slideW = slideSize === 'widescreen' ? 13.33 : 10;
  const slideH = 7.5;
  if (slideSize === 'widescreen') {
    pptx.defineLayout({ name: 'WIDESCREEN', width: slideW, height: slideH });
    pptx.layout = 'WIDESCREEN';
  } else {
    pptx.defineLayout({ name: 'STANDARD', width: slideW, height: slideH });
    pptx.layout = 'STANDARD';
  }

  // -- optional title slide -------------------------------------------
  if (oneSlidePerGroup) {
    const titleSlide = pptx.addSlide();
    titleSlide.addText('Chart Hero Diagram', {
      x: 0.5,
      y: 2.5,
      w: slideW - 1,
      h: 1.5,
      fontSize: 36,
      bold: true,
      color: '333333',
      align: 'center',
      valign: 'middle',
    });
    titleSlide.addText(new Date().toLocaleDateString(), {
      x: 0.5,
      y: 4,
      w: slideW - 1,
      h: 0.5,
      fontSize: 14,
      color: '888888',
      align: 'center',
    });
  }

  // -- diagram slide --------------------------------------------------
  const slide = pptx.addSlide();

  // Dark mode background
  if (isDarkMode) {
    slide.background = { color: '1e293b' };
  }

  // Diagram title at the top of the slide
  slide.addText('Chart Hero Diagram', {
    x: 0.3,
    y: 0.15,
    w: slideW - 0.6,
    h: 0.35,
    fontSize: 14,
    bold: true,
    color: isDarkMode ? 'c8d1dc' : '555555',
    align: 'left',
    valign: 'middle',
  });

  // Guard: nothing to draw
  if (nodes.length === 0) {
    slide.addText('(empty diagram)', {
      x: 1, y: 3, w: slideW - 2, h: 1,
      fontSize: 18, color: '999999', align: 'center', valign: 'middle',
    });
    const fileData = (await pptx.write({ outputType: 'blob' })) as Blob;
    saveAs(fileData, getFilename('pptx'));
    return;
  }

  // -- compute bounding box & scale factor ----------------------------
  const allX: number[] = [];
  const allY: number[] = [];
  const allR: number[] = [];
  const allB: number[] = [];

  for (const n of nodes) {
    const defaults = getDefaultSize(n.data.shape);
    const w = n.data.width || defaults.w;
    const h = n.data.height || defaults.h;
    allX.push(n.position.x);
    allY.push(n.position.y);
    allR.push(n.position.x + w);
    allB.push(n.position.y + h);
  }

  const minX = Math.min(...allX);
  const minY = Math.min(...allY);
  const maxX = Math.max(...allR);
  const maxY = Math.max(...allB);

  const contentW = maxX - minX || 1;
  const contentH = maxY - minY || 1;

  const padding = 0.5;
  const titleReserve = 0.55;
  const availW = slideW - 2 * padding;
  const availH = slideH - padding - titleReserve - padding;

  const scaleX = availW / contentW;
  const scaleY = availH / contentH;
  const scale = Math.min(scaleX, scaleY);

  const drawnW = contentW * scale;
  const drawnH = contentH * scale;
  const offsetX = padding + (availW - drawnW) / 2;
  const offsetY = titleReserve + padding + (availH - drawnH) / 2;

  // Coordinate converters: canvas px -> slide inches
  const toX = (px: number) => offsetX + (px - minX) * scale;
  const toY = (px: number) => offsetY + (px - minY) * scale;
  const toW = (px: number) => px * scale;
  const toH = (px: number) => px * scale;

  // -- render swimlanes (background layer) ----------------------------
  const swimConfig = swimlaneState.config;
  const swimOffset = swimlaneState.containerOffset;
  const hLanes = swimConfig.horizontal;
  const vLanes = swimConfig.vertical;
  const hasSwimlanes = hLanes.length > 0 || vLanes.length > 0;

  if (hasSwimlanes) {
    const border = swimConfig.containerBorder;
    const divider = swimConfig.dividerStyle;

    // Compute container bounds from lane sizes
    const totalW = vLanes.reduce((sum, l) => sum + l.size, 0) || contentW;
    const totalH = hLanes.reduce((sum, l) => sum + l.size, 0) || contentH;

    const containerX = toX(swimOffset.x);
    const containerY = toY(swimOffset.y);
    const containerW = toW(totalW);
    const containerH = toH(totalH);

    // Container title (above the border)
    if (swimConfig.containerTitle) {
      const titleH = 0.35;
      slide.addText(swimConfig.containerTitle, {
        x: containerX,
        y: containerY - titleH,
        w: containerW,
        h: titleH,
        fontSize: 12,
        bold: true,
        align: 'center',
        valign: 'middle',
        fontFace: globalFont,
        color: isDarkMode ? 'c8d1dc' : '333333',
      });
    }

    // Container border
    if (border && border.style !== 'none') {
      slide.addShape('rect', {
        x: containerX,
        y: containerY,
        w: containerW,
        h: containerH,
        fill: { type: 'none' },
        line: {
          color: hex(border.color, 'e2e8f0'),
          width: border.width || 1,
          dashType: toPptxDashType(border.style),
        },
        rectRadius: border.radius ? Math.min(0.5, border.radius * scale) : undefined,
      });
    }

    // Vertical lane dividers and backgrounds
    let vOffset = 0;
    for (let i = 0; i < vLanes.length; i++) {
      const lane = vLanes[i];
      if (lane.hidden) { vOffset += lane.size; continue; }
      const laneSize = lane.collapsed ? 30 : lane.size;
      const laneX = toX(swimOffset.x + vOffset);
      const laneW = toW(laneSize);

      // Lane background (light fill)
      slide.addShape('rect', {
        x: laneX,
        y: containerY,
        w: laneW,
        h: containerH,
        fill: { color: hex(lane.color, 'f1f5f9'), transparency: 85 },
        line: { type: 'none' } as unknown as PptxGenJS.ShapeLineProps,
      });

      // Lane label at top
      if (lane.showLabel !== false) {
        slide.addText(lane.label, {
          x: laneX,
          y: containerY,
          w: laneW,
          h: Math.min(0.3, containerH * 0.05),
          fontSize: Math.max(7, Math.min(11, (swimConfig.labelFontSize || 12) * scale * 72 * 0.5)),
          color: hex(lane.color, '475569'),
          bold: true,
          align: 'center',
          valign: 'middle',
          fontFace: globalFont,
        });
      }

      // Divider line (except after last lane)
      if (i < vLanes.length - 1 && divider && divider.style !== 'none') {
        const divX = laneX + laneW;
        slide.addShape('line', {
          x: divX,
          y: containerY,
          w: 0,
          h: containerH,
          line: {
            color: hex(divider.color, 'cbd5e1'),
            width: divider.width || 1,
            dashType: toPptxDashType(divider.style),
          },
        });
      }

      vOffset += laneSize;
    }

    // Horizontal lane dividers and backgrounds
    let hOffset = 0;
    for (let i = 0; i < hLanes.length; i++) {
      const lane = hLanes[i];
      if (lane.hidden) { hOffset += lane.size; continue; }
      const laneSize = lane.collapsed ? 30 : lane.size;
      const laneY = toY(swimOffset.y + hOffset);
      const laneH = toH(laneSize);

      // Lane background
      slide.addShape('rect', {
        x: containerX,
        y: laneY,
        w: containerW,
        h: laneH,
        fill: { color: hex(lane.color, 'f1f5f9'), transparency: 85 },
        line: { type: 'none' } as unknown as PptxGenJS.ShapeLineProps,
      });

      // Lane label on the left
      if (lane.showLabel !== false) {
        slide.addText(lane.label, {
          x: containerX,
          y: laneY,
          w: Math.min(0.5, containerW * 0.08),
          h: laneH,
          fontSize: Math.max(7, Math.min(11, (swimConfig.labelFontSize || 12) * scale * 72 * 0.5)),
          color: hex(lane.color, '475569'),
          bold: true,
          align: 'center',
          valign: 'middle',
          fontFace: globalFont,
          rotate: swimConfig.labelRotation || 0,
        });
      }

      // Divider line (except after last lane)
      if (i < hLanes.length - 1 && divider && divider.style !== 'none') {
        const divY = laneY + laneH;
        slide.addShape('line', {
          x: containerX,
          y: divY,
          w: containerW,
          h: 0,
          line: {
            color: hex(divider.color, 'cbd5e1'),
            width: divider.width || 1,
            dashType: toPptxDashType(divider.style),
          },
        });
      }

      hOffset += laneSize;
    }
  }

  // -- add edges as lines (below nodes) -------------------------
  for (const edge of edges) {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);
    if (!sourceNode || !targetNode) continue;

    const sDefaults = getDefaultSize(sourceNode.data.shape);
    const tDefaults = getDefaultSize(targetNode.data.shape);
    const sw = sourceNode.data.width || sDefaults.w;
    const sh = sourceNode.data.height || sDefaults.h;
    const tw = targetNode.data.width || tDefaults.w;
    const th = targetNode.data.height || tDefaults.h;

    // Source: center of node; Target: center of node
    const sCx = toX(sourceNode.position.x) + toW(sw) / 2;
    const sCy = toY(sourceNode.position.y) + toH(sh) / 2;
    const tCx = toX(targetNode.position.x) + toW(tw) / 2;
    const tCy = toY(targetNode.position.y) + toH(th) / 2;

    // Determine source/target edge connection points based on relative positions
    // (bottom-center → top-center for vertical flow; right-center → left-center for horizontal)
    let sx: number, sy: number, tx: number, ty: number;
    const dx = Math.abs(tCx - sCx);
    const dy = Math.abs(tCy - sCy);

    if (dy >= dx) {
      // Vertical dominant: connect bottom→top or top→bottom
      if (tCy > sCy) {
        sx = sCx; sy = toY(sourceNode.position.y) + toH(sh); // bottom
        tx = tCx; ty = toY(targetNode.position.y);            // top
      } else {
        sx = sCx; sy = toY(sourceNode.position.y);            // top
        tx = tCx; ty = toY(targetNode.position.y) + toH(th);  // bottom
      }
    } else {
      // Horizontal dominant: connect right→left or left→right
      if (tCx > sCx) {
        sx = toX(sourceNode.position.x) + toW(sw); sy = sCy; // right
        tx = toX(targetNode.position.x);            ty = tCy; // left
      } else {
        sx = toX(sourceNode.position.x); sy = sCy;            // left
        tx = toX(targetNode.position.x) + toW(tw); ty = tCy;  // right
      }
    }

    const edgeData = edge.data as FlowEdgeData | undefined;
    const edgeStyle = edge.style as Record<string, unknown> | undefined;
    const overrides = edgeData?.styleOverrides as Record<string, unknown> | undefined;

    // Dependency type semantic colors
    const DEP_COLORS: Record<string, string> = {
      'depends-on': '94a3b8', 'blocks': 'e53e3e', 'related': 'a0aec0',
      'triggers': '6366f1', 'optional': '94a3b8', 'milestone-gate': 'd69e2e',
    };
    const depColor = edgeData?.dependencyType ? DEP_COLORS[edgeData.dependencyType] : undefined;

    const edgeColor = hex(
      (overrides?.stroke as string) || edgeData?.color || (edgeStyle?.stroke as string) || undefined,
      depColor || '94a3b8',
    );
    const edgeWidth = (overrides?.strokeWidth as number) || edgeData?.thickness || (edgeStyle?.strokeWidth as number) || 1.5;
    const edgeOpacity = (overrides?.opacity as number) ?? edgeData?.opacity ?? 1;
    const rawDash = (overrides?.strokeDasharray as string) ?? (edgeData?.strokeDasharray as string | undefined) ?? (edgeStyle?.strokeDasharray as string | undefined);
    // Animated edges get dashed pattern
    const edgeDash = edgeData?.animated ? 'lgDash' : dashArrayToPptxDash(rawDash);

    // Determine arrow markers (supports both string and object form)
    const markerEnd = extractMarker(edge.markerEnd);
    const markerStart = extractMarker(edge.markerStart);
    const endArrow = toPptxArrowType(markerEnd);
    const beginArrow = toPptxArrowType(markerStart);

    const edgeTransparency = Math.round((1 - edgeOpacity) * 100);
    const baseLine = { color: edgeColor, width: edgeWidth, dashType: edgeDash, transparency: edgeTransparency };
    const isStep = edge.type === 'step' || edge.type === 'smoothstep';

    if (isStep) {
      // Render step/smoothstep edges as 3-segment polylines (H-V-H or V-H-V)
      if (dy >= dx) {
        // Vertical dominant: H → V → H routing with midpoint at vertical center
        const midY = (sy + ty) / 2;
        // Segment 1: source → mid (horizontal)
        slide.addShape('line', {
          x: Math.min(sx, sx), y: sy, w: 0.01, h: Math.abs(midY - sy) || 0.01,
          line: { ...baseLine, beginArrowType: beginArrow !== 'none' ? beginArrow : undefined },
          flipV: midY < sy,
        });
        // Segment 2: vertical to align with target x
        slide.addShape('line', {
          x: Math.min(sx, tx), y: midY, w: Math.abs(tx - sx) || 0.01, h: 0.01,
          line: baseLine,
          flipH: tx < sx,
        });
        // Segment 3: mid → target (vertical)
        slide.addShape('line', {
          x: tx, y: Math.min(midY, ty), w: 0.01, h: Math.abs(ty - midY) || 0.01,
          line: { ...baseLine, endArrowType: endArrow !== 'none' ? endArrow : undefined },
          flipV: ty < midY,
        });
      } else {
        // Horizontal dominant: V → H → V routing with midpoint at horizontal center
        const midX = (sx + tx) / 2;
        // Segment 1: source → mid (horizontal)
        slide.addShape('line', {
          x: Math.min(sx, midX), y: sy, w: Math.abs(midX - sx) || 0.01, h: 0.01,
          line: { ...baseLine, beginArrowType: beginArrow !== 'none' ? beginArrow : undefined },
          flipH: midX < sx,
        });
        // Segment 2: vertical to align with target y
        slide.addShape('line', {
          x: midX, y: Math.min(sy, ty), w: 0.01, h: Math.abs(ty - sy) || 0.01,
          line: baseLine,
          flipV: ty < sy,
        });
        // Segment 3: mid → target (horizontal)
        slide.addShape('line', {
          x: Math.min(midX, tx), y: ty, w: Math.abs(tx - midX) || 0.01, h: 0.01,
          line: { ...baseLine, endArrowType: endArrow !== 'none' ? endArrow : undefined },
          flipH: tx < midX,
        });
      }
    } else {
      // Straight / bezier / default: single diagonal line
      const lineX = Math.min(sx, tx);
      const lineY = Math.min(sy, ty);
      const lineW = Math.abs(tx - sx) || 0.01;
      const lineH = Math.abs(ty - sy) || 0.01;

      slide.addShape('line', {
        x: lineX,
        y: lineY,
        w: lineW,
        h: lineH,
        line: {
          ...baseLine,
          endArrowType: endArrow !== 'none' ? endArrow : undefined,
          beginArrowType: beginArrow !== 'none' ? beginArrow : undefined,
        },
        flipH: tx < sx,
        flipV: ty < sy,
      });
    }

    // Edge label
    if (edgeData?.label) {
      const t = edgeData.labelPosition ?? 0.5;
      const lx = sx + t * (tx - sx);
      const ly = sy + t * (ty - sy);
      const labelColor = hex(edgeData.labelColor || undefined, edgeColor);
      // Edge label background for readability
      slide.addShape('rect', {
        x: lx - 0.5,
        y: ly - 0.15,
        w: 1,
        h: 0.3,
        fill: { color: isDarkMode ? '1e293b' : 'ffffff', transparency: 20 },
        line: { type: 'none' } as unknown as PptxGenJS.ShapeLineProps,
      });
      slide.addText(edgeData.label, {
        x: lx - 0.5,
        y: ly - 0.15,
        w: 1,
        h: 0.3,
        fontSize: 8,
        color: labelColor,
        align: 'center',
        valign: 'middle',
        fontFace: globalFont,
      });
    }
  }

  // -- add nodes as native shapes or SVG images -----------------------
  for (const node of nodes) {
    const d = node.data;
    const defaults = getDefaultSize(d.shape);
    const w = d.width || defaults.w;
    const h = d.height || defaults.h;
    const x = toX(node.position.x);
    const y = toY(node.position.y);
    const wInch = toW(w);
    const hInch = toH(h);

    const fillColor = hex(d.color, '3b82f6');
    const fillColorRaw = d.color || '#3b82f6';
    const borderColorRaw = d.borderColor || '';
    const textColor = hex(d.textColor, 'ffffff');
    const label = d.label || '';
    const nodeOpacity = d.opacity ?? 1;
    const fillTransparency = Math.round((1 - nodeOpacity) * 100);

    // Font properties
    const rawFontPt = (d.fontSize || 14) * scale * 72;
    const finalFontSize = Math.min(36, Math.max(6, Math.round(rawFontPt)));
    const isBold = d.fontWeight ? d.fontWeight >= 600 : false;
    const fontFamily = d.fontFamily || globalFont;
    const textAlign = (d.textAlign as 'left' | 'center' | 'right') || 'center';

    // Border properties — scale border width proportionally with the diagram.
    // pptxgenjs line.width is in points (1pt = 1/72 inch).
    // Convert canvas px -> inches -> points, with a minimum of 0.5pt.
    const borderWidthPx = d.borderWidth ?? 1;
    const scaledBorderWidth = Math.max(0.5, Math.round(borderWidthPx * scale * 72 * 10) / 10);
    const borderDash = toPptxDashType(d.borderStyle);
    const hasBorderColor = borderColorRaw && borderColorRaw !== 'transparent';
    const derivedBorderColor = hasBorderColor
      ? hex(borderColorRaw)
      : darkenHex(fillColorRaw);

    const pptxShapeName = PPTX_SHAPE_MAP[d.shape];
    const svgRenderer = SVG_SHAPE_RENDERERS[d.shape];

    // Build line opts — always include border for visible outlines
    // For icon-only nodes, hide shape fill and border
    const isIconOnly = d.iconOnly && d.icon;
    const fillOpts = isIconOnly
      ? { type: 'none' as const }
      : { color: fillColor, transparency: fillTransparency };
    const lineOpts = isIconOnly
      ? ({ type: 'none' } as unknown as { color: string; width: number; dashType: 'solid' | 'dash' | 'sysDot' | 'lgDash' })
      : { color: derivedBorderColor, width: scaledBorderWidth, dashType: borderDash };

    // Build text options shared across all rendering paths
    // Use tight margins so text fits better within shapes
    const textOpts = {
      fontSize: finalFontSize,
      color: textColor,
      align: textAlign,
      valign: 'middle' as const,
      fontFace: fontFamily,
      bold: isBold,
      margin: [0.02, 0.05, 0.02, 0.05] as [number, number, number, number],
      shrinkText: true,
    };

    if (pptxShapeName) {
      // ---------- Native PPTX shape with embedded text ---------------
      const shapeSpecific: Record<string, unknown> = {};
      // Apply corner radius for any rect-based shape with borderRadius
      const isRectBased = ['rect', 'roundRect'].includes(pptxShapeName);
      if (d.shape === 'roundedRectangle') {
        shapeSpecific.rectRadius = d.borderRadius
          ? Math.min(0.5, d.borderRadius / Math.min(w, h))
          : 0.1;
      } else if (isRectBased && d.borderRadius && d.borderRadius > 0) {
        // Regular rectangle / textbox with custom borderRadius
        shapeSpecific.rectRadius = Math.min(0.5, d.borderRadius / Math.min(w, h));
      }
      if (d.shape === 'stickyNote') {
        shapeSpecific.fill = { color: hex(d.color, 'fef08a'), transparency: fillTransparency };
      }
      if (d.shape === 'group') {
        shapeSpecific.fill = { color: hex(d.color, 'f1f5f9'), transparency: Math.max(fillTransparency, 70) };
        shapeSpecific.line = { color: hex(d.borderColor, 'cbd5e1'), width: 1, dashType: 'dash' as const };
      }

      slide.addText(label, {
        shape: pptxShapeName,
        x,
        y,
        w: wInch,
        h: hInch,
        fill: fillOpts,
        line: lineOpts,
        ...textOpts,
        ...shapeSpecific,
      });
    } else if (svgRenderer) {
      // ---------- SVG image fallback for complex shapes ---------------
      const svgFill = d.color || '#3b82f6';
      const svgStroke = hasBorderColor ? borderColorRaw : '#' + darkenHex(fillColorRaw);
      const svgStrokeWidth = borderWidthPx;
      const svgDash = d.borderStyle === 'dashed' ? '8 4' : d.borderStyle === 'dotted' ? '2 2' : '';
      const svgString = svgRenderer(
        Math.round(w), Math.round(h), svgFill, svgStroke, svgStrokeWidth, svgDash,
      );
      const base64 = btoa(svgString);
      slide.addImage({
        data: `data:image/svg+xml;base64,${base64}`,
        x, y, w: wInch, h: hInch,
        transparency: fillTransparency,
      });

      // Overlay text on top of the SVG image
      if (label) {
        slide.addText(label, { x, y, w: wInch, h: hInch, ...textOpts });
      }
    } else {
      // ---------- Unknown shape -> plain rectangle fallback ----------
      const fallbackRadius = d.borderRadius && d.borderRadius > 0
        ? { rectRadius: Math.min(0.5, d.borderRadius / Math.min(w, h)) }
        : {};
      slide.addText(label, {
        shape: 'rect' as SHAPE_NAME,
        x, y, w: wInch, h: hInch,
        fill: fillOpts,
        line: lineOpts,
        ...textOpts,
        ...fallbackRadius,
      });
    }

    // ---------- Status indicator pucks on the node -------------------
    const pucks = getStatusIndicators(d);
    for (const puck of pucks) {
      if (puck.status === 'none') continue;
      const puckSize = toW(puck.size || 12);
      const pos = puckOffset(puck.position, wInch, hInch, puckSize);
      const puckColor = hex(puck.color, '3b82f6');
      const puckBorderColor = hex(puck.borderColor, puckColor);

      slide.addShape('ellipse', {
        x: x + pos.x,
        y: y + pos.y,
        w: puckSize,
        h: puckSize,
        fill: { color: puckColor },
        line: puck.borderWidth
          ? { color: puckBorderColor, width: puck.borderWidth, dashType: toPptxDashType(puck.borderStyle) }
          : undefined,
      });
    }

    // ---------- Icon on the node (rendered as SVG or initial fallback) -
    if (d.icon) {
      const iconPxSize = d.iconSize || 16;
      const iconSize = toW(iconPxSize);
      const iconColorStr = '#' + hex(d.iconColor, textColor);

      const iconX = d.iconPosition === 'right'
        ? x + wInch - iconSize - 0.02
        : x + 0.02;
      const iconY = d.iconOnly ? y + (hInch - iconSize) / 2 : y + 0.02;

      // Try to render the actual lucide icon as SVG
      const iconDataUri = renderLucideIconSvg(d.icon, iconColorStr, Math.max(24, iconPxSize));
      if (iconDataUri) {
        // Icon background circle
        if (!d.iconOnly) {
          slide.addShape('ellipse', {
            x: iconX,
            y: iconY,
            w: iconSize,
            h: iconSize,
            fill: { color: hex(d.iconBgColor, fillColor) },
            line: d.iconBorderWidth
              ? { color: hex(d.iconBorderColor, 'ffffff'), width: d.iconBorderWidth }
              : undefined,
          });
        }
        // Actual icon SVG image (slightly inset from background)
        const inset = d.iconOnly ? 0 : iconSize * 0.15;
        slide.addImage({
          data: iconDataUri,
          x: iconX + inset,
          y: iconY + inset,
          w: iconSize - inset * 2,
          h: iconSize - inset * 2,
        });
      } else {
        // Fallback: initial letter in a circle
        const initial = d.icon.charAt(0).toUpperCase();
        slide.addText(initial, {
          shape: 'ellipse',
          x: iconX,
          y: iconY,
          w: iconSize,
          h: iconSize,
          fill: d.iconOnly ? ({ type: 'none' } as unknown as PptxGenJS.ShapeFillProps) : { color: hex(d.iconBgColor, fillColor) },
          line: d.iconBorderWidth
            ? { color: hex(d.iconBorderColor, 'ffffff'), width: d.iconBorderWidth }
            : undefined,
          fontSize: Math.max(5, Math.round(iconSize * 72 * 0.5)),
          color: hex(d.iconColor, textColor),
          align: 'center',
          valign: 'middle',
          fontFace: globalFont,
          bold: true,
        });
      }
    }

    // ---------- Description text below the node ----------------------
    if (d.description) {
      const descH = 0.25;
      slide.addText(d.description, {
        x,
        y: y + hInch + 0.02,
        w: wInch,
        h: descH,
        fontSize: Math.max(5, finalFontSize - 2),
        color: isDarkMode ? '94a3b8' : '64748b',
        align: 'center',
        valign: 'top',
        fontFace: fontFamily,
      });
    }
  }

  // -- render legend overlays (node + swimlane) -------------------------
  const allLegends = [legendState.nodeLegend, legendState.swimlaneLegend];
  let legendOffsetY = 0; // stack multiple legends vertically from bottom-right
  for (const legendConfig of allLegends) {
    // Filter hidden items
    const visibleItems = legendConfig.items.filter((item) => !item.hidden);
    if (!legendConfig.visible || visibleItems.length === 0) continue;
    const lgStyle = legendConfig.style;
    const lgW = Math.min(2.5, toW(lgStyle.width || 200));
    const lgItemH = 0.22;
    const lgTitleH = 0.3;
    const lgH = lgTitleH + visibleItems.length * lgItemH + 0.1;

    // Use legend position from config if available, otherwise default bottom-right
    const lgX = legendConfig.position ? toX(legendConfig.position.x) : slideW - lgW - 0.3;
    const lgY = legendConfig.position ? toY(legendConfig.position.y) : slideH - lgH - 0.3 - legendOffsetY;
    legendOffsetY += lgH + 0.15;

    // Legend background
    slide.addShape('roundRect', {
      x: lgX,
      y: lgY,
      w: lgW,
      h: lgH,
      fill: { color: hex(isDarkMode ? lgStyle.bgColor || '1e293b' : lgStyle.bgColor, 'ffffff'), transparency: Math.round((1 - lgStyle.opacity) * 100) },
      line: { color: hex(lgStyle.borderColor, 'e2e8f0'), width: lgStyle.borderWidth || 1 },
      rectRadius: 0.05,
    });

    // Legend title
    if (legendConfig.title) {
      slide.addText(legendConfig.title, {
        x: lgX + 0.1,
        y: lgY + 0.05,
        w: lgW - 0.2,
        h: lgTitleH,
        fontSize: Math.min(11, lgStyle.fontSize || 11),
        bold: true,
        color: isDarkMode ? 'c8d1dc' : '333333',
        align: 'left',
        valign: 'middle',
        fontFace: globalFont,
      });
    }

    // Legend items — render swatch based on item kind
    const sortedItems = [...visibleItems].sort((a, b) => a.order - b.order);
    for (let i = 0; i < sortedItems.length; i++) {
      const item = sortedItems[i];
      const itemY = lgY + lgTitleH + i * lgItemH;
      const swatchX = lgX + 0.15;
      const swatchY = itemY + 0.04;
      const swatchW = 0.14;
      const swatchH = 0.14;
      const itemColor = hex(item.color, '3b82f6');

      const kind = item.kind || 'fill';
      switch (kind) {
        case 'border':
          // Outline-only rectangle with border style
          slide.addShape('rect', {
            x: swatchX, y: swatchY, w: swatchW, h: swatchH,
            fill: { type: 'none' },
            line: { color: itemColor, width: 1.5, dashType: toPptxDashType(item.borderStyle) },
          });
          break;
        case 'edge':
          // Horizontal line segment
          slide.addShape('line', {
            x: swatchX, y: swatchY + swatchH / 2, w: swatchW, h: 0.01,
            line: { color: itemColor, width: 1.5 },
          });
          break;
        case 'lane':
          // Filled rectangle (representing a lane)
          slide.addShape('rect', {
            x: swatchX, y: swatchY, w: swatchW, h: swatchH,
            fill: { color: itemColor, transparency: 50 },
            line: { color: itemColor, width: 0.5 },
          });
          break;
        case 'puck':
          // Filled circle (status puck)
          slide.addShape('ellipse', {
            x: swatchX, y: swatchY, w: swatchW, h: swatchH,
            fill: { color: itemColor },
          });
          break;
        case 'fill':
        default:
          // Filled ellipse (node fill color)
          slide.addShape('ellipse', {
            x: swatchX, y: swatchY, w: swatchW, h: swatchH,
            fill: { color: itemColor },
          });
          break;
      }

      // Label
      slide.addText(item.label, {
        x: lgX + 0.35,
        y: itemY,
        w: lgW - 0.45,
        h: lgItemH,
        fontSize: Math.min(9, lgStyle.fontSize || 9),
        color: isDarkMode ? '94a3b8' : '475569',
        align: 'left',
        valign: 'middle',
        fontFace: globalFont,
      });
    }
  }

  // -- speaker notes --------------------------------------------------
  if (includeNotes) {
    const noteLines: string[] = [];
    noteLines.push(`Chart Hero Diagram — ${nodes.length} nodes, ${edges.length} connectors`);
    noteLines.push(`Exported: ${new Date().toLocaleString()}`);
    noteLines.push('');
    for (const n of nodes) {
      const pucks = getStatusIndicators(n.data);
      const puckStr = pucks.length > 0
        ? ` [${pucks.map((p) => p.status).join(', ')}]`
        : '';
      noteLines.push(`• ${n.data.label} (${n.data.shape})${puckStr}`);
      if (n.data.description) {
        noteLines.push(`  ${n.data.description}`);
      }
      if (n.data.notes) {
        noteLines.push(`  Notes: ${n.data.notes}`);
      }
    }
    slide.addNotes(noteLines.join('\n'));
  }

  // -- write file -----------------------------------------------------
  const fileData = (await pptx.write({ outputType: 'blob' })) as Blob;
  saveAs(fileData, getFilename('pptx'));
}

// ---------------------------------------------------------------------------
// JSON Export
// ---------------------------------------------------------------------------

/**
 * Builds the JSON export data object (shared by file export and clipboard copy).
 */
export function buildJsonExportData(options: JsonExportOptions): Record<string, unknown> {
  const state = useFlowStore.getState();
  const styleState = useStyleStore.getState();
  const swimlaneState = useSwimlaneStore.getState();
  const layerState = useLayerStore.getState();

  const exportData: Record<string, unknown> = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    nodes: state.nodes,
    edges: state.edges,
  };

  if (options.includeViewport) {
    exportData.viewport = state.viewport;
  }

  if (options.includeStyles) {
    exportData.styles = {
      activeStyleId: styleState.activeStyleId,
      activePaletteId: styleState.activePaletteId,
      canvasColorOverride: styleState.canvasColorOverride,
    };
  }

  // Always include swimlanes and layers if they have content
  const hasSwimLanes = swimlaneState.config.horizontal.length > 0 || swimlaneState.config.vertical.length > 0;
  if (hasSwimLanes) {
    const swimlaneExport: Record<string, unknown> = {
      orientation: swimlaneState.config.orientation,
      containerTitle: swimlaneState.config.containerTitle,
      horizontal: swimlaneState.config.horizontal,
      vertical: swimlaneState.config.vertical,
    };
    // Include container offset if non-zero for round-trip fidelity
    const offset = swimlaneState.containerOffset;
    if (offset.x !== 0 || offset.y !== 0) {
      swimlaneExport.containerOffset = offset;
    }
    // Include border config if customized
    if (swimlaneState.config.containerBorder) {
      swimlaneExport.containerBorder = swimlaneState.config.containerBorder;
    }
    if (swimlaneState.config.dividerStyle) {
      swimlaneExport.dividerStyle = swimlaneState.config.dividerStyle;
    }
    // Include label config if customized
    if (typeof swimlaneState.config.labelFontSize === 'number') {
      swimlaneExport.labelFontSize = swimlaneState.config.labelFontSize;
    }
    if (typeof swimlaneState.config.labelRotation === 'number') {
      swimlaneExport.labelRotation = swimlaneState.config.labelRotation;
    }
    if (typeof swimlaneState.config.hHeaderWidth === 'number') {
      swimlaneExport.hHeaderWidth = swimlaneState.config.hHeaderWidth;
    }
    if (typeof swimlaneState.config.vHeaderHeight === 'number') {
      swimlaneExport.vHeaderHeight = swimlaneState.config.vHeaderHeight;
    }
    exportData.swimlanes = swimlaneExport;
  }

  const hasLayers = layerState.layers.length > 1 || layerState.layers[0]?.id !== 'default';
  if (hasLayers) {
    exportData.layers = layerState.layers;
  }

  // Legends (node + swimlane)
  const legendState = useLegendStore.getState();
  if (legendState.nodeLegend.items.length > 0) {
    exportData.nodeLegend = legendState.nodeLegend;
  }
  if (legendState.swimlaneLegend.items.length > 0) {
    exportData.swimlaneLegend = legendState.swimlaneLegend;
  }
  // Backwards compat: also write combined "legend" if either has items
  if (legendState.nodeLegend.items.length > 0 || legendState.swimlaneLegend.items.length > 0) {
    exportData.legend = legendState.nodeLegend.items.length > 0
      ? legendState.nodeLegend
      : legendState.swimlaneLegend;
  }

  // Banners (top/bottom)
  const bannerState = useBannerStore.getState();
  if (bannerState.topBanner.enabled || bannerState.bottomBanner.enabled) {
    exportData.banners = {
      topBanner: bannerState.topBanner,
      bottomBanner: bannerState.bottomBanner,
    };
  }

  if (options.includeMetadata) {
    exportData.metadata = {
      nodeCount: state.nodes.length,
      edgeCount: state.edges.length,
    };
  }

  // Time spent creating this diagram (in seconds)
  const timeSpent = useTimerStore.getState().getElapsed();
  if (timeSpent > 0) {
    exportData.timeSpent = timeSpent;
  }

  return exportData;
}

export function exportAsJson(options: JsonExportOptions): void {
  const exportData = buildJsonExportData(options);
  const indent = options.pretty ? 2 : undefined;
  const jsonString = JSON.stringify(exportData, null, indent);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  saveAs(blob, getFilename('fc'));
}

/**
 * Copies the JSON export data to the clipboard.
 */
export async function copyJsonToClipboard(options: JsonExportOptions): Promise<void> {
  const exportData = buildJsonExportData(options);
  const indent = options.pretty ? 2 : undefined;
  const jsonString = JSON.stringify(exportData, null, indent);
  await navigator.clipboard.writeText(jsonString);
}

// ---------------------------------------------------------------------------
// JSON Import
// ---------------------------------------------------------------------------

/** Valid node shape values for validation */
const VALID_SHAPES = new Set([
  'rectangle', 'roundedRectangle', 'diamond', 'circle', 'ellipse',
  'parallelogram', 'hexagon', 'triangle', 'star', 'cloud', 'arrow',
  'callout', 'document', 'predefinedProcess', 'manualInput', 'preparation',
  'data', 'database', 'internalStorage', 'display',
  'blockArrow', 'chevronArrow', 'doubleArrow', 'circularArrow',
  'group', 'stickyNote', 'textbox', 'freehand',
]);

/** Valid edge type values */
const VALID_EDGE_TYPES = new Set([
  'default', 'straight', 'step', 'smoothstep', 'bezier',
  'dependency', 'animated',
]);

/**
 * Strip single-line (//) and multi-line comments from a JSON string,
 * preserving // inside quoted strings (e.g. URLs).
 */
function stripJsonComments(json: string): string {
  let result = '';
  let inString = false;
  let escaped = false;
  let i = 0;
  while (i < json.length) {
    if (escaped) {
      result += json[i];
      escaped = false;
      i++;
      continue;
    }
    if (json[i] === '\\' && inString) {
      result += json[i];
      escaped = true;
      i++;
      continue;
    }
    if (json[i] === '"') {
      inString = !inString;
      result += json[i];
      i++;
      continue;
    }
    if (!inString) {
      // Single-line comment
      if (json[i] === '/' && json[i + 1] === '/') {
        while (i < json.length && json[i] !== '\n') i++;
        continue;
      }
      // Multi-line comment
      if (json[i] === '/' && json[i + 1] === '*') {
        i += 2;
        while (i < json.length && !(json[i] === '*' && json[i + 1] === '/')) i++;
        i += 2;
        continue;
      }
    }
    result += json[i];
    i++;
  }
  // Remove trailing commas before } or ]
  return result.replace(/,(\s*[}\]])/g, '$1');
}

/**
 * Import a Chart Hero JSON file and load it into all stores.
 *
 * Accepts either a raw JSON string or an already-parsed object.
 * Validates and normalises the data, generating missing IDs where needed.
 *
 * Returns a summary of what was imported.
 */
export function importFromJson(
  input: string | Record<string, unknown>,
): { nodeCount: number; edgeCount: number; warnings: string[] } {
  const warnings: string[] = [];

  // Parse
  let data: Record<string, unknown>;
  if (typeof input === 'string') {
    try {
      data = JSON.parse(stripJsonComments(input));
    } catch {
      throw new Error('Invalid JSON: could not parse the file');
    }
  } else {
    data = input;
  }

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error('Invalid format: expected a JSON object at root level');
  }

  // ---- Nodes ---------------------------------------------------------------
  const rawNodes = data.nodes;
  if (!Array.isArray(rawNodes)) {
    throw new Error('Missing or invalid "nodes" array');
  }

  const seenNodeIds = new Set<string>();
  const nodes: FlowNode[] = [];

  for (let i = 0; i < rawNodes.length; i++) {
    const raw = rawNodes[i];
    if (typeof raw !== 'object' || raw === null) {
      warnings.push(`nodes[${i}]: skipped (not an object)`);
      continue;
    }
    const r = raw as Record<string, unknown>;

    // ID — generate if missing, deduplicate
    let id = typeof r.id === 'string' && r.id ? r.id : `node_${Date.now()}_${i}`;
    if (seenNodeIds.has(id)) {
      id = `${id}_dup_${i}`;
      warnings.push(`nodes[${i}]: duplicate id, renamed to "${id}"`);
    }
    seenNodeIds.add(id);

    // Position — required
    const pos = r.position as Record<string, unknown> | undefined;
    const x = typeof pos?.x === 'number' ? pos.x : 0;
    const y = typeof pos?.y === 'number' ? pos.y : 0;

    // Data — normalise
    const rawData = (r.data || {}) as Record<string, unknown>;
    const label = typeof rawData.label === 'string' ? rawData.label : `Node ${i + 1}`;
    let shape = typeof rawData.shape === 'string' ? rawData.shape : 'rectangle';
    if (!VALID_SHAPES.has(shape)) {
      warnings.push(`nodes[${i}]: unknown shape "${shape}", defaulting to "rectangle"`);
      shape = 'rectangle';
    }

    // Build normalised data
    const nodeData: FlowNodeData = {
      label,
      shape: shape as FlowNodeData['shape'],
    };

    // Optional string fields
    for (const key of ['description', 'color', 'borderColor', 'textColor', 'fontFamily',
      'textAlign', 'icon', 'iconColor', 'iconBgColor', 'iconBorderColor', 'iconPosition',
      'borderStyle', 'groupId', 'linkGroupId', 'layerId', 'swimlaneId', 'notes',
      'completedBy', 'startOn',
      'svgPath', 'svgViewBox', 'svgStrokeColor'] as const) {
      if (typeof rawData[key] === 'string') {
        (nodeData as Record<string, unknown>)[key] = rawData[key];
      }
    }

    // Optional number fields
    for (const key of ['fontSize', 'fontWeight', 'iconBorderWidth', 'iconSize',
      'width', 'height', 'opacity', 'fillOpacity', 'borderWidth', 'borderRadius', 'rotation',
      'svgStrokeWidth'] as const) {
      if (typeof rawData[key] === 'number') {
        (nodeData as Record<string, unknown>)[key] = rawData[key];
      }
    }

    // Circle shapes must be square — normalize non-square dimensions
    if (shape === 'circle') {
      const w = nodeData.width as number | undefined;
      const h = nodeData.height as number | undefined;
      if (w && h && w !== h) {
        const side = Math.max(w, h);
        nodeData.width = side;
        nodeData.height = side;
      }
    }

    // Optional boolean fields
    if (typeof rawData.iconOnly === 'boolean') nodeData.iconOnly = rawData.iconOnly;
    if (typeof rawData.flipH === 'boolean') nodeData.flipH = rawData.flipH;
    if (typeof rawData.flipV === 'boolean') nodeData.flipV = rawData.flipV;

    // Dependencies
    if (Array.isArray(rawData.dependsOn)) {
      nodeData.dependsOn = rawData.dependsOn.filter((v: unknown) => typeof v === 'string');
    }
    if (Array.isArray(rawData.blockedBy)) {
      nodeData.blockedBy = rawData.blockedBy.filter((v: unknown) => typeof v === 'string');
    }

    // Status pucks — migrate legacy singular statusIndicator if needed
    if (!Array.isArray(rawData.statusIndicators) && rawData.statusIndicator && typeof rawData.statusIndicator === 'object') {
      const p = rawData.statusIndicator as Record<string, unknown>;
      nodeData.statusIndicators = [{
        id: typeof p.id === 'string' ? p.id : newPuckId(),
        status: typeof p.status === 'string' ? p.status as StatusIndicator['status'] : 'none',
        color: typeof p.color === 'string' ? p.color : undefined,
        size: typeof p.size === 'number' ? p.size : undefined,
        position: typeof p.position === 'string' ? p.position as StatusIndicator['position'] : undefined,
        borderColor: typeof p.borderColor === 'string' ? p.borderColor : undefined,
        borderWidth: typeof p.borderWidth === 'number' ? p.borderWidth : undefined,
        borderStyle: typeof p.borderStyle === 'string' ? p.borderStyle as StatusIndicator['borderStyle'] : undefined,
        icon: typeof p.icon === 'string' ? p.icon : undefined,
      }];
    }
    if (Array.isArray(rawData.statusIndicators)) {
      nodeData.statusIndicators = (rawData.statusIndicators as Record<string, unknown>[])
        .filter((p) => typeof p === 'object' && p !== null)
        .map((p) => ({
          id: typeof p.id === 'string' ? p.id : newPuckId(),
          status: typeof p.status === 'string' ? p.status as StatusIndicator['status'] : 'none',
          color: typeof p.color === 'string' ? p.color : undefined,
          size: typeof p.size === 'number' ? p.size : undefined,
          position: typeof p.position === 'string' ? p.position as StatusIndicator['position'] : undefined,
          borderColor: typeof p.borderColor === 'string' ? p.borderColor : undefined,
          borderWidth: typeof p.borderWidth === 'number' ? p.borderWidth : undefined,
          borderStyle: typeof p.borderStyle === 'string' ? p.borderStyle as StatusIndicator['borderStyle'] : undefined,
          icon: typeof p.icon === 'string' ? p.icon : undefined,
        }));
    }

    // Determine node type — only 'shapeNode' and 'groupNode' are registered in
    // React Flow's nodeTypes map, so remap anything else to 'shapeNode'.
    let type: string = 'shapeNode';
    if (shape === 'group') type = 'groupNode';
    else if (r.type === 'shapeNode' || r.type === 'groupNode') type = r.type as string;

    nodes.push({
      id,
      type,
      position: { x, y },
      data: nodeData,
      ...(r.parentId && typeof r.parentId === 'string' ? { parentId: r.parentId } : {}),
      ...(r.extent === 'parent' ? { extent: 'parent' as const } : {}),
    });
  }

  // ---- Edges ---------------------------------------------------------------
  const rawEdges = data.edges;
  const edges: FlowEdge[] = [];

  if (Array.isArray(rawEdges)) {
    const seenEdgeIds = new Set<string>();

    for (let i = 0; i < rawEdges.length; i++) {
      const raw = rawEdges[i];
      if (typeof raw !== 'object' || raw === null) {
        warnings.push(`edges[${i}]: skipped (not an object)`);
        continue;
      }
      const r = raw as Record<string, unknown>;

      let id = typeof r.id === 'string' && r.id ? r.id : `edge_${Date.now()}_${i}`;
      if (seenEdgeIds.has(id)) {
        id = `${id}_dup_${i}`;
      }
      seenEdgeIds.add(id);

      const source = typeof r.source === 'string' ? r.source : '';
      const target = typeof r.target === 'string' ? r.target : '';

      if (!source || !target) {
        warnings.push(`edges[${i}]: skipped (missing source or target)`);
        continue;
      }

      // Validate source/target exist
      if (!seenNodeIds.has(source)) {
        warnings.push(`edges[${i}]: source "${source}" not found in nodes`);
      }
      if (!seenNodeIds.has(target)) {
        warnings.push(`edges[${i}]: target "${target}" not found in nodes`);
      }

      let type = typeof r.type === 'string' ? r.type : undefined;
      if (type && !VALID_EDGE_TYPES.has(type)) {
        warnings.push(`edges[${i}]: unknown type "${type}", using default`);
        type = undefined;
      }

      const rawData = (r.data || {}) as Record<string, unknown>;
      const edgeData: Record<string, unknown> = {};

      if (typeof rawData.label === 'string') edgeData.label = rawData.label;
      if (typeof rawData.color === 'string') edgeData.color = rawData.color;
      if (typeof rawData.thickness === 'number') edgeData.thickness = rawData.thickness;
      if (typeof rawData.animated === 'boolean') edgeData.animated = rawData.animated;
      if (typeof rawData.opacity === 'number') edgeData.opacity = rawData.opacity;
      if (typeof rawData.labelColor === 'string') edgeData.labelColor = rawData.labelColor;
      if (typeof rawData.labelPosition === 'number') edgeData.labelPosition = rawData.labelPosition;
      if (typeof rawData.strokeDasharray === 'string') edgeData.strokeDasharray = rawData.strokeDasharray;
      if (typeof rawData.labelFontSize === 'number') edgeData.labelFontSize = rawData.labelFontSize;
      if (typeof rawData.labelBgColor === 'string') edgeData.labelBgColor = rawData.labelBgColor;
      if (typeof rawData.dependencyType === 'string') edgeData.dependencyType = rawData.dependencyType;
      if (typeof rawData.notes === 'string') edgeData.notes = rawData.notes;

      // Style overrides (from context-menu coloring / diagram style overlays)
      if (rawData.styleOverrides && typeof rawData.styleOverrides === 'object') {
        edgeData.styleOverrides = rawData.styleOverrides;
      }

      // Top-level React Flow edge properties
      const topLevel: Record<string, unknown> = {};
      if (typeof r.label === 'string') topLevel.label = r.label;
      if (typeof r.animated === 'boolean') topLevel.animated = r.animated;
      if (typeof r.markerEnd === 'string') topLevel.markerEnd = r.markerEnd;
      else if (r.markerEnd && typeof r.markerEnd === 'object') topLevel.markerEnd = r.markerEnd;
      if (typeof r.markerStart === 'string') topLevel.markerStart = r.markerStart;
      else if (r.markerStart && typeof r.markerStart === 'object') topLevel.markerStart = r.markerStart;

      // Build edge.style from data properties (inline styles override React Flow's CSS)
      const edgeStyle: Record<string, unknown> = {};
      if (typeof r.style === 'object' && r.style !== null) Object.assign(edgeStyle, r.style);
      if (edgeData.color) edgeStyle.stroke = edgeData.color;
      if (edgeData.thickness) edgeStyle.strokeWidth = edgeData.thickness;
      if (edgeData.opacity != null) edgeStyle.opacity = edgeData.opacity;
      if (edgeData.strokeDasharray) edgeStyle.strokeDasharray = edgeData.strokeDasharray;
      if (Object.keys(edgeStyle).length > 0) topLevel.style = edgeStyle;

      // Infer handles from node positions when not explicitly provided
      let sourceHandle = typeof r.sourceHandle === 'string' ? r.sourceHandle : undefined;
      let targetHandle = typeof r.targetHandle === 'string' ? r.targetHandle : undefined;
      if (!sourceHandle || !targetHandle) {
        const srcNode = nodes.find((n) => n.id === source);
        const tgtNode = nodes.find((n) => n.id === target);
        if (srcNode && tgtNode) {
          const srcCx = srcNode.position.x + ((srcNode.data.width as number) || 160) / 2;
          const srcCy = srcNode.position.y + ((srcNode.data.height as number) || 60) / 2;
          const tgtCx = tgtNode.position.x + ((tgtNode.data.width as number) || 160) / 2;
          const tgtCy = tgtNode.position.y + ((tgtNode.data.height as number) || 60) / 2;
          const dx = tgtCx - srcCx;
          const dy = tgtCy - srcCy;
          if (Math.abs(dy) >= Math.abs(dx)) {
            // Vertical: source below/above target
            if (!sourceHandle) sourceHandle = dy > 0 ? 'bottom' : 'top';
            if (!targetHandle) targetHandle = dy > 0 ? 'top' : 'bottom';
          } else {
            // Horizontal: source left/right of target
            if (!sourceHandle) sourceHandle = dx > 0 ? 'right' : 'left';
            if (!targetHandle) targetHandle = dx > 0 ? 'left' : 'right';
          }
        }
      }

      edges.push({
        id,
        source,
        target,
        ...(type ? { type } : {}),
        ...(Object.keys(edgeData).length > 0 ? { data: edgeData } : {}),
        ...(sourceHandle ? { sourceHandle } : {}),
        ...(targetHandle ? { targetHandle } : {}),
        ...topLevel,
      } as FlowEdge);
    }
  }

  // ---- Apply to stores -----------------------------------------------------

  // Flow state
  useFlowStore.getState().setNodes(nodes);
  useFlowStore.getState().setEdges(edges);

  // Viewport
  if (data.viewport && typeof data.viewport === 'object') {
    const vp = data.viewport as Record<string, unknown>;
    if (typeof vp.x === 'number' && typeof vp.y === 'number' && typeof vp.zoom === 'number') {
      useFlowStore.getState().setViewport({ x: vp.x, y: vp.y, zoom: vp.zoom });
    }
  }

  // Styles
  if (data.styles && typeof data.styles === 'object') {
    const s = data.styles as Record<string, unknown>;
    if (typeof s.activeStyleId === 'string') useStyleStore.getState().setStyle(s.activeStyleId);
    else if (s.activeStyleId === null) useStyleStore.getState().clearStyle();
    if (typeof s.activePaletteId === 'string') useStyleStore.getState().setPalette(s.activePaletteId);
    if (typeof s.canvasColorOverride === 'string') {
      useStyleStore.getState().setCanvasColorOverride(s.canvasColorOverride);
    } else {
      useStyleStore.getState().setCanvasColorOverride(null);
    }
    // darkMode is on pause — ignore it during import to prevent UI from switching
  }

  // Swimlanes — clear existing, then apply imported (or leave empty if none)
  {
    const store = useSwimlaneStore.getState();
    // Always clear existing lanes on import to avoid orphaned swimlanes
    const existingH = store.config.horizontal.map((l) => l.id);
    for (const id of existingH) store.removeLane('horizontal', id);
    const existingV = store.config.vertical.map((l) => l.id);
    for (const id of existingV) store.removeLane('vertical', id);
    // Reset container offset so imported lanes render at default position
    store.setContainerOffset({ x: 0, y: 0 });

    if (data.swimlanes && typeof data.swimlanes === 'object') {
      const sw = data.swimlanes as Record<string, unknown>;
      if (typeof sw.orientation === 'string') {
        store.setOrientation(sw.orientation as SwimlaneConfig['orientation']);
      }
      if (typeof sw.containerTitle === 'string') {
        store.setContainerTitle(sw.containerTitle);
      }

      if (Array.isArray(sw.horizontal)) {
        for (const lane of sw.horizontal) {
          if (typeof lane === 'object' && lane !== null) {
            const l = lane as Record<string, unknown>;
            store.addLane('horizontal', {
              id: typeof l.id === 'string' ? l.id : `lane_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              label: typeof l.label === 'string' ? l.label : 'Lane',
              color: typeof l.color === 'string' ? l.color : '#e2e8f0',
              collapsed: typeof l.collapsed === 'boolean' ? l.collapsed : false,
              size: typeof l.size === 'number' ? l.size : 200,
              order: typeof l.order === 'number' ? l.order : 0,
              showLabel: typeof l.showLabel === 'boolean' ? l.showLabel : undefined,
              showColor: typeof l.showColor === 'boolean' ? l.showColor : undefined,
              hidden: typeof l.hidden === 'boolean' ? l.hidden : undefined,
            });
          }
        }
      }
      if (Array.isArray(sw.vertical)) {
        for (const lane of sw.vertical) {
          if (typeof lane === 'object' && lane !== null) {
            const l = lane as Record<string, unknown>;
            store.addLane('vertical', {
              id: typeof l.id === 'string' ? l.id : `lane_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              label: typeof l.label === 'string' ? l.label : 'Lane',
              color: typeof l.color === 'string' ? l.color : '#e2e8f0',
              collapsed: typeof l.collapsed === 'boolean' ? l.collapsed : false,
              size: typeof l.size === 'number' ? l.size : 200,
              order: typeof l.order === 'number' ? l.order : 0,
              showLabel: typeof l.showLabel === 'boolean' ? l.showLabel : undefined,
              showColor: typeof l.showColor === 'boolean' ? l.showColor : undefined,
              hidden: typeof l.hidden === 'boolean' ? l.hidden : undefined,
            });
          }
        }
      }
      // Restore container offset if present in exported data
      if (sw.containerOffset && typeof sw.containerOffset === 'object') {
        const co = sw.containerOffset as Record<string, unknown>;
        if (typeof co.x === 'number' && typeof co.y === 'number') {
          store.setContainerOffset({ x: co.x, y: co.y });
        }
      }
      // Restore border config
      if (sw.containerBorder && typeof sw.containerBorder === 'object') {
        const cb = sw.containerBorder as Record<string, unknown>;
        store.updateContainerBorder({
          ...(typeof cb.color === 'string' ? { color: cb.color } : {}),
          ...(typeof cb.width === 'number' ? { width: cb.width } : {}),
          ...(typeof cb.style === 'string' ? { style: cb.style as BorderStyleType } : {}),
          ...(typeof cb.radius === 'number' ? { radius: cb.radius } : {}),
        });
      }
      if (sw.dividerStyle && typeof sw.dividerStyle === 'object') {
        const ds = sw.dividerStyle as Record<string, unknown>;
        store.updateDividerStyle({
          ...(typeof ds.color === 'string' ? { color: ds.color } : {}),
          ...(typeof ds.width === 'number' ? { width: ds.width } : {}),
          ...(typeof ds.style === 'string' ? { style: ds.style as BorderStyleType } : {}),
        });
      }
      // Restore label config
      if (typeof sw.labelFontSize === 'number') {
        store.updateLabelConfig({ labelFontSize: sw.labelFontSize });
      }
      if (typeof sw.labelRotation === 'number') {
        store.updateLabelConfig({ labelRotation: sw.labelRotation });
      }
      if (typeof sw.hHeaderWidth === 'number') {
        store.updateLabelConfig({ hHeaderWidth: sw.hHeaderWidth });
      }
      if (typeof sw.vHeaderHeight === 'number') {
        store.updateLabelConfig({ vHeaderHeight: sw.vHeaderHeight });
      }
    }
  }

  // Layers — always reset, then apply imported (or keep default if none)
  {
    const layerStore = useLayerStore.getState();
    // Remove all except default to start clean
    const existingIds = layerStore.layers.map((l) => l.id);
    for (const id of existingIds) {
      if (id !== 'default' && layerStore.layers.length > 1) layerStore.removeLayer(id);
    }

    if (Array.isArray(data.layers)) {
      for (const raw of data.layers) {
        if (typeof raw !== 'object' || raw === null) continue;
        const l = raw as Record<string, unknown>;
        const layerObj: Layer = {
          id: typeof l.id === 'string' ? l.id : `layer_${Date.now()}`,
          name: typeof l.name === 'string' ? l.name : 'Layer',
          visible: typeof l.visible === 'boolean' ? l.visible : true,
          locked: typeof l.locked === 'boolean' ? l.locked : false,
          opacity: typeof l.opacity === 'number' ? l.opacity : 1,
          color: typeof l.color === 'string' ? l.color : '#6366f1',
          order: typeof l.order === 'number' ? l.order : 0,
        };

        if (layerObj.id === 'default') {
          // Update existing default layer
          layerStore.updateLayer('default', {
            name: layerObj.name,
            visible: layerObj.visible,
            locked: layerObj.locked,
            opacity: layerObj.opacity,
            color: layerObj.color,
          });
        } else {
          layerStore.addLayer(layerObj);
        }
      }
    }
  }

  // Legends — clear existing, then apply imported (node + swimlane, with backwards compat)
  {
    const lgStore = useLegendStore.getState();
    lgStore.resetLegend('node');
    lgStore.resetLegend('swimlane');

    const importLegendConfig = (raw: unknown, which: 'node' | 'swimlane') => {
      if (!raw || typeof raw !== 'object') return;
      const lg = raw as Record<string, unknown>;
      if (typeof lg.title === 'string') lgStore.setTitle(which, lg.title);
      if (typeof lg.visible === 'boolean') lgStore.setVisible(which, lg.visible);
      if (lg.position && typeof lg.position === 'object') {
        const pos = lg.position as Record<string, unknown>;
        if (typeof pos.x === 'number' && typeof pos.y === 'number') {
          lgStore.setPosition(which, { x: pos.x, y: pos.y });
        }
      }
      if (lg.style && typeof lg.style === 'object') {
        const s = lg.style as Record<string, unknown>;
        // Always import legends in light-mode colors — the renderer handles dark mode dynamically.
        // Dark-mode bg/border colors (low luminance) get reset to light defaults.
        const isColorDark = (hex: string): boolean => {
          const c = hex.replace('#', '');
          if (c.length < 6) return false;
          const r = parseInt(c.slice(0, 2), 16) / 255;
          const g = parseInt(c.slice(2, 4), 16) / 255;
          const b = parseInt(c.slice(4, 6), 16) / 255;
          return 0.299 * r + 0.587 * g + 0.114 * b < 0.5;
        };
        const importedBg = typeof s.bgColor === 'string' ? s.bgColor : '#ffffff';
        const importedBorder = typeof s.borderColor === 'string' ? s.borderColor : '#e2e8f0';
        lgStore.updateStyle(which, {
          bgColor: isColorDark(importedBg) ? '#ffffff' : importedBg,
          borderColor: isColorDark(importedBorder) ? '#e2e8f0' : importedBorder,
          ...(typeof s.borderWidth === 'number' ? { borderWidth: s.borderWidth } : {}),
          ...(typeof s.fontSize === 'number' ? { fontSize: s.fontSize } : {}),
          ...(typeof s.opacity === 'number' ? { opacity: s.opacity } : {}),
          ...(typeof s.width === 'number' ? { width: s.width } : {}),
        });
      }
      if (Array.isArray(lg.items)) {
        for (const rawItem of lg.items) {
          if (typeof rawItem !== 'object' || rawItem === null) continue;
          const item = rawItem as Record<string, unknown>;
          lgStore.addItem(which, {
            id: typeof item.id === 'string' ? item.id : `legend_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            label: typeof item.label === 'string' ? item.label : 'Item',
            color: typeof item.color === 'string' ? item.color : '#3b82f6',
            kind: typeof item.kind === 'string' ? item.kind as LegendItemKind : undefined,
            borderStyle: typeof item.borderStyle === 'string' ? item.borderStyle as LegendItem['borderStyle'] : undefined,
            shape: typeof item.shape === 'string' ? item.shape : undefined,
            icon: typeof item.icon === 'string' ? item.icon : undefined,
            order: typeof item.order === 'number' ? item.order : 0,
            hidden: typeof item.hidden === 'boolean' ? item.hidden : undefined,
          });
        }
      }
    };

    // New format: separate nodeLegend and swimlaneLegend
    if (data.nodeLegend) {
      importLegendConfig(data.nodeLegend, 'node');
    }
    if (data.swimlaneLegend) {
      importLegendConfig(data.swimlaneLegend, 'swimlane');
    }
    // Backwards compat: old single "legend" field → import as node legend
    if (!data.nodeLegend && !data.swimlaneLegend && data.legend) {
      importLegendConfig(data.legend, 'node');
    }
  }

  // Banners — reset, then apply imported if present
  {
    const bannerSt = useBannerStore.getState();
    // Reset to defaults
    bannerSt.updateTopBanner({ enabled: false, height: 40, label: '', color: '#1e293b', textColor: '#ffffff', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14 });
    bannerSt.updateBottomBanner({ enabled: false, height: 40, label: '', color: '#1e293b', textColor: '#ffffff', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14 });

    if (data.banners && typeof data.banners === 'object') {
      const b = data.banners as Record<string, unknown>;
      const importBanner = (raw: unknown, updater: (patch: Partial<BannerConfig>) => void) => {
        if (!raw || typeof raw !== 'object') return;
        const cfg = raw as Record<string, unknown>;
        const patch: Partial<BannerConfig> = {};
        if (typeof cfg.enabled === 'boolean') patch.enabled = cfg.enabled;
        if (typeof cfg.height === 'number') patch.height = cfg.height;
        if (typeof cfg.label === 'string') patch.label = cfg.label;
        if (typeof cfg.color === 'string') patch.color = cfg.color;
        if (typeof cfg.textColor === 'string') patch.textColor = cfg.textColor;
        if (typeof cfg.fontFamily === 'string') patch.fontFamily = cfg.fontFamily;
        if (typeof cfg.fontSize === 'number') patch.fontSize = cfg.fontSize;
        updater(patch);
      };
      importBanner(b.topBanner, bannerSt.updateTopBanner);
      importBanner(b.bottomBanner, bannerSt.updateBottomBanner);
    }
  }

  // Time spent — restore if present, otherwise reset to zero
  if (typeof data.timeSpent === 'number' && data.timeSpent > 0) {
    useTimerStore.getState().setElapsed(data.timeSpent);
  } else {
    useTimerStore.getState().reset();
  }

  log.info(`Import complete: ${nodes.length} nodes, ${edges.length} edges, ${warnings.length} warnings`);
  return { nodeCount: nodes.length, edgeCount: edges.length, warnings };
}

// ---------------------------------------------------------------------------
// Clipboard helpers
// ---------------------------------------------------------------------------

export async function copyImageToClipboard(): Promise<void> {
  log.debug('Copying image to clipboard...');
  const element = getReactFlowElement();

  const dataUrl = await toPng(element, {
    pixelRatio: 2,
    backgroundColor: '#ffffff',
  });

  const response = await fetch(dataUrl);
  const blob = await response.blob();

  await navigator.clipboard.write([
    new ClipboardItem({
      'image/png': blob,
    }),
  ]);
  log.debug('Image copied to clipboard');
}

export async function copySvgToClipboard(): Promise<void> {
  log.debug('Copying SVG to clipboard...');
  const element = getReactFlowElement();

  const dataUrl = await toSvg(element, {
    skipFonts: false,
  });

  // Convert data URL to SVG string
  const svgString = decodeURIComponent(dataUrl.split(',')[1]);
  await navigator.clipboard.writeText(svgString);
  log.debug('SVG copied to clipboard');
}

export async function copySvgForPaste(): Promise<void> {
  log.debug('Copying SVG as pasteable vector...');
  const element = getReactFlowElement();

  const svgDataUrl = await toSvg(element, { skipFonts: false });
  let svgString = decodeURIComponent(svgDataUrl.split(',')[1]);

  // Ensure SVG has xmlns for standalone rendering
  if (!svgString.includes('xmlns=')) {
    svgString = svgString.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  }

  // text/html  — Figma, Illustrator, Google Slides paste as editable vector
  const htmlBlob = new Blob([svgString], { type: 'text/html' });

  // text/plain — Text editors, code tools get the SVG source
  const textBlob = new Blob([svgString], { type: 'text/plain' });

  // image/png  — PowerPoint, Word, and apps that only accept raster
  const pngDataUrl = await toPng(element, { pixelRatio: 2, backgroundColor: '#ffffff' });
  const pngResponse = await fetch(pngDataUrl);
  const pngBlob = await pngResponse.blob();

  await navigator.clipboard.write([
    new ClipboardItem({
      'text/html': htmlBlob,
      'text/plain': textBlob,
      'image/png': pngBlob,
    }),
  ]);
  log.debug('SVG vector copied to clipboard (html + text + png)');
}

// ---------------------------------------------------------------------------
// Dispatcher -- runs the correct export based on format
// ---------------------------------------------------------------------------

export async function runExport(
  format: ExportFormat,
  options: Record<string, unknown>,
): Promise<void> {
  log.info(`Export started: ${format}`);
  try {
    switch (format) {
      case 'png':
        await exportAsPng(options as unknown as PngExportOptions);
        break;
      case 'jpg':
        await exportAsJpg(options as unknown as JpgExportOptions);
        break;
      case 'svg':
        await exportAsSvg(options as unknown as SvgExportOptions);
        break;
      case 'pdf':
        await exportAsPdf(options as unknown as PdfExportOptions);
        break;
      case 'pptx':
        await exportAsPptx(options as unknown as PptxExportOptions);
        break;
      case 'json':
        exportAsJson(options as unknown as JsonExportOptions);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
    log.info(`Export completed: ${format}`);
  } catch (e) {
    log.error(`Export failed: ${format}`, e);
    throw e;
  }
}
