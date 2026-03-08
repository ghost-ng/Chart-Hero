import type { ExtensionPack } from '../extensionStore';

export const dataAnalyticsPack: ExtensionPack = {
  id: 'data-analytics',
  name: 'Data & Analytics',
  builtIn: true,
  icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="8" y="38" width="10" height="18" rx="1" fill="none" stroke="currentColor" stroke-width="2"/><rect x="22" y="28" width="10" height="28" rx="1" fill="none" stroke="currentColor" stroke-width="2"/><rect x="36" y="18" width="10" height="38" rx="1" fill="none" stroke="currentColor" stroke-width="2"/><rect x="50" y="8" width="10" height="48" rx="1" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  items: [
    // -----------------------------------------------------------------------
    // Chart Types
    // -----------------------------------------------------------------------
    {
      id: 'da-bar-chart',
      name: 'Bar Chart',
      viewBox: '0 0 64 64',
      defaultWidth: 100,
      defaultHeight: 80,
      tags: ['bar', 'chart', 'graph', 'histogram'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<line x1="8" y1="56" x2="58" y2="56" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<line x1="8" y1="8" x2="8" y2="56" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<rect x="14" y="36" width="8" height="20" rx="1" fill="currentColor" opacity="0.3"/>' +
        '<rect x="14" y="36" width="8" height="20" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<rect x="26" y="20" width="8" height="36" rx="1" fill="currentColor" opacity="0.3"/>' +
        '<rect x="26" y="20" width="8" height="36" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<rect x="38" y="28" width="8" height="28" rx="1" fill="currentColor" opacity="0.3"/>' +
        '<rect x="38" y="28" width="8" height="28" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<rect x="50" y="14" width="8" height="42" rx="1" fill="currentColor" opacity="0.3"/>' +
        '<rect x="50" y="14" width="8" height="42" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '</svg>',
    },
    {
      id: 'da-line-chart',
      name: 'Line Chart',
      viewBox: '0 0 64 64',
      defaultWidth: 100,
      defaultHeight: 80,
      tags: ['line', 'chart', 'trend', 'graph', 'time-series'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<line x1="8" y1="56" x2="58" y2="56" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<line x1="8" y1="8" x2="8" y2="56" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<polyline points="12,44 22,36 32,40 42,20 52,14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<circle cx="12" cy="44" r="2.5" fill="currentColor"/>' +
        '<circle cx="22" cy="36" r="2.5" fill="currentColor"/>' +
        '<circle cx="32" cy="40" r="2.5" fill="currentColor"/>' +
        '<circle cx="42" cy="20" r="2.5" fill="currentColor"/>' +
        '<circle cx="52" cy="14" r="2.5" fill="currentColor"/>' +
        '</svg>',
    },
    {
      id: 'da-pie-chart',
      name: 'Pie Chart',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['pie', 'chart', 'donut', 'distribution', 'proportion'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<line x1="32" y1="32" x2="32" y2="10" stroke="currentColor" stroke-width="2"/>' +
        '<line x1="32" y1="32" x2="51" y2="43" stroke="currentColor" stroke-width="2"/>' +
        '<line x1="32" y1="32" x2="14" y2="40" stroke="currentColor" stroke-width="2"/>' +
        '<circle cx="32" cy="32" r="2" fill="currentColor"/>' +
        '</svg>',
    },
    {
      id: 'da-scatter-plot',
      name: 'Scatter Plot',
      viewBox: '0 0 64 64',
      defaultWidth: 100,
      defaultHeight: 80,
      tags: ['scatter', 'plot', 'dots', 'correlation'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<line x1="8" y1="56" x2="58" y2="56" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<line x1="8" y1="8" x2="8" y2="56" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<circle cx="16" cy="44" r="3" fill="currentColor" opacity="0.5"/>' +
        '<circle cx="22" cy="38" r="3" fill="currentColor" opacity="0.5"/>' +
        '<circle cx="28" cy="42" r="3" fill="currentColor" opacity="0.5"/>' +
        '<circle cx="34" cy="30" r="3" fill="currentColor" opacity="0.5"/>' +
        '<circle cx="40" cy="24" r="3" fill="currentColor" opacity="0.5"/>' +
        '<circle cx="46" cy="18" r="3" fill="currentColor" opacity="0.5"/>' +
        '<circle cx="52" cy="14" r="3" fill="currentColor" opacity="0.5"/>' +
        '<circle cx="38" cy="34" r="3" fill="currentColor" opacity="0.5"/>' +
        '</svg>',
    },
    {
      id: 'da-gauge',
      name: 'Gauge / KPI',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['gauge', 'kpi', 'metric', 'speedometer', 'dashboard'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<path d="M10 46 A24 24 0 1 1 54 46" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>' +
        '<line x1="32" y1="38" x2="44" y2="20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>' +
        '<circle cx="32" cy="38" r="3" fill="currentColor"/>' +
        '<line x1="14" y1="40" x2="18" y2="38" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '<line x1="18" y1="24" x2="22" y2="26" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '<line x1="32" y1="16" x2="32" y2="20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '<line x1="46" y1="24" x2="42" y2="26" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '<line x1="50" y1="40" x2="46" y2="38" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '</svg>',
    },

    // -----------------------------------------------------------------------
    // Data Sources & Storage
    // -----------------------------------------------------------------------
    {
      id: 'da-database',
      name: 'Data Store',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['database', 'data-store', 'warehouse', 'storage'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<ellipse cx="32" cy="14" rx="22" ry="8" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<path d="M10 14 v36 a22 8 0 0 0 44 0 v-36" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<ellipse cx="32" cy="32" rx="22" ry="8" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>' +
        '</svg>',
    },
    {
      id: 'da-data-lake',
      name: 'Data Lake',
      viewBox: '0 0 64 64',
      defaultWidth: 100,
      defaultHeight: 80,
      tags: ['data-lake', 'lake', 'raw-data', 'big-data', 'storage'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<ellipse cx="32" cy="40" rx="26" ry="12" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<path d="M10 32 Q18 24 32 24 Q46 24 54 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<line x1="20" y1="12" x2="20" y2="28" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '<polygon points="20,28 17,22 23,22" fill="currentColor"/>' +
        '<line x1="32" y1="8" x2="32" y2="24" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '<polygon points="32,24 29,18 35,18" fill="currentColor"/>' +
        '<line x1="44" y1="12" x2="44" y2="28" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '<polygon points="44,28 41,22 47,22" fill="currentColor"/>' +
        '</svg>',
    },
    {
      id: 'da-etl',
      name: 'ETL Pipeline',
      viewBox: '0 0 64 64',
      defaultWidth: 100,
      defaultHeight: 60,
      tags: ['etl', 'pipeline', 'transform', 'extract', 'load'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        // Funnel shape
        '<path d="M8 16 L56 16 L40 36 L40 52 L24 52 L24 36 Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>' +
        // Data dots going in
        '<circle cx="16" cy="10" r="2" fill="currentColor"/>' +
        '<circle cx="28" cy="8" r="2" fill="currentColor"/>' +
        '<circle cx="40" cy="10" r="2" fill="currentColor"/>' +
        '<circle cx="52" cy="8" r="2" fill="currentColor"/>' +
        // Output arrow
        '<line x1="32" y1="52" x2="32" y2="60" stroke="currentColor" stroke-width="2"/>' +
        '<polygon points="32,60 28,56 36,56" fill="currentColor"/>' +
        '</svg>',
    },
    {
      id: 'da-api-source',
      name: 'API Source',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['api', 'source', 'endpoint', 'rest', 'data-source'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<rect x="10" y="10" width="44" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<path d="M22 24 L18 32 L22 40" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M42 24 L46 32 L42 40" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<line x1="28" y1="40" x2="36" y2="24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '</svg>',
    },

    // -----------------------------------------------------------------------
    // Processing
    // -----------------------------------------------------------------------
    {
      id: 'da-filter',
      name: 'Filter',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['filter', 'funnel', 'query', 'where'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<path d="M6 10 L58 10 L38 36 L38 52 L26 56 L26 36 Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>' +
        '</svg>',
    },
    {
      id: 'da-transform',
      name: 'Transform',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['transform', 'convert', 'map', 'process'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<rect x="6" y="20" width="20" height="24" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<line x1="12" y1="28" x2="22" y2="28" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '<line x1="12" y1="34" x2="20" y2="34" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '<line x1="26" y1="32" x2="38" y2="32" stroke="currentColor" stroke-width="2"/>' +
        '<polygon points="36,28 42,32 36,36" fill="currentColor"/>' +
        '<circle cx="50" cy="32" r="12" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<path d="M44 28 Q50 26 56 28" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '<path d="M44 36 Q50 38 56 36" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '</svg>',
    },
    {
      id: 'da-aggregate',
      name: 'Aggregate',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['aggregate', 'sum', 'group', 'reduce', 'merge'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        // Three small circles converging to one
        '<circle cx="14" cy="14" r="6" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<circle cx="50" cy="14" r="6" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<circle cx="14" cy="50" r="6" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<line x1="18" y1="18" x2="28" y2="28" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="46" y1="18" x2="36" y2="28" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="18" y1="46" x2="28" y2="36" stroke="currentColor" stroke-width="1.5"/>' +
        '<circle cx="32" cy="32" r="10" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<text x="32" y="37" text-anchor="middle" font-size="14" font-weight="bold" fill="currentColor" font-family="sans-serif">Σ</text>' +
        '</svg>',
    },

    // -----------------------------------------------------------------------
    // Output & Visualization
    // -----------------------------------------------------------------------
    {
      id: 'da-dashboard',
      name: 'Dashboard',
      viewBox: '0 0 64 64',
      defaultWidth: 120,
      defaultHeight: 80,
      tags: ['dashboard', 'report', 'analytics', 'bi'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<rect x="4" y="4" width="56" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<line x1="4" y1="18" x2="60" y2="18" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="32" y1="18" x2="32" y2="60" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="4" y1="38" x2="32" y2="38" stroke="currentColor" stroke-width="1.5"/>' +
        // Mini bar chart in top-left
        '<rect x="10" y="28" width="4" height="6" rx="0.5" fill="currentColor" opacity="0.4"/>' +
        '<rect x="16" y="24" width="4" height="10" rx="0.5" fill="currentColor" opacity="0.4"/>' +
        '<rect x="22" y="26" width="4" height="8" rx="0.5" fill="currentColor" opacity="0.4"/>' +
        // Mini line chart in top-right
        '<polyline points="38,30 44,24 50,28 56,22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
        // Mini number in bottom-left
        '<line x1="10" y1="46" x2="26" y2="46" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<line x1="10" y1="52" x2="20" y2="52" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>' +
        // Mini pie in bottom-right
        '<circle cx="46" cy="48" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="46" y1="48" x2="46" y2="40" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="46" y1="48" x2="53" y2="52" stroke="currentColor" stroke-width="1.5"/>' +
        '</svg>',
    },
    {
      id: 'da-report',
      name: 'Report',
      viewBox: '0 0 64 64',
      defaultWidth: 70,
      defaultHeight: 90,
      tags: ['report', 'document', 'analysis', 'summary'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<rect x="10" y="4" width="44" height="56" rx="3" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<line x1="16" y1="14" x2="48" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<line x1="16" y1="22" x2="40" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>' +
        '<line x1="16" y1="28" x2="44" y2="28" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>' +
        // Mini chart
        '<rect x="16" y="34" width="6" height="12" rx="1" fill="currentColor" opacity="0.3"/>' +
        '<rect x="24" y="38" width="6" height="8" rx="1" fill="currentColor" opacity="0.3"/>' +
        '<rect x="32" y="30" width="6" height="16" rx="1" fill="currentColor" opacity="0.3"/>' +
        '<rect x="40" y="36" width="6" height="10" rx="1" fill="currentColor" opacity="0.3"/>' +
        '<line x1="16" y1="52" x2="48" y2="52" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>' +
        '</svg>',
    },
    {
      id: 'da-table',
      name: 'Data Table',
      viewBox: '0 0 64 64',
      defaultWidth: 100,
      defaultHeight: 80,
      tags: ['table', 'grid', 'spreadsheet', 'data', 'rows'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<rect x="4" y="8" width="56" height="48" rx="3" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<line x1="4" y1="20" x2="60" y2="20" stroke="currentColor" stroke-width="2"/>' +
        '<line x1="4" y1="32" x2="60" y2="32" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="4" y1="44" x2="60" y2="44" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="22" y1="8" x2="22" y2="56" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="42" y1="8" x2="42" y2="56" stroke="currentColor" stroke-width="1.5"/>' +
        // Header dots
        '<circle cx="13" cy="14" r="2" fill="currentColor" opacity="0.5"/>' +
        '<circle cx="32" cy="14" r="2" fill="currentColor" opacity="0.5"/>' +
        '<circle cx="51" cy="14" r="2" fill="currentColor" opacity="0.5"/>' +
        '</svg>',
    },
  ],
};
