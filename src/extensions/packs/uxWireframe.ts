import type { ExtensionPack } from '../extensionStore';

export const uxWireframePack: ExtensionPack = {
  id: 'ux-wireframe',
  name: 'UX & Wireframe',
  builtIn: true,
  icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="8" y="8" width="48" height="48" rx="4" fill="none" stroke="currentColor" stroke-width="2.5"/><rect x="12" y="12" width="40" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="12" y="26" width="18" height="26" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="34" y="26" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
  items: [
    // -----------------------------------------------------------------------
    // Form Elements
    // -----------------------------------------------------------------------
    {
      id: 'ux-button',
      name: 'Button',
      viewBox: '0 0 64 64',
      defaultWidth: 100,
      defaultHeight: 60,
      tags: ['button', 'cta', 'action', 'ui'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="6" y="18" width="52" height="28" rx="6" fill="none" stroke="currentColor" stroke-width="2.5"/><line x1="20" y1="32" x2="44" y2="32" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
    },
    {
      id: 'ux-text-input',
      name: 'Text Input',
      viewBox: '0 0 64 64',
      defaultWidth: 100,
      defaultHeight: 60,
      tags: ['input', 'text', 'field', 'form'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="4" y="20" width="56" height="24" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><line x1="12" y1="26" x2="12" y2="38" stroke="currentColor" stroke-width="2"/><line x1="16" y1="32" x2="36" y2="32" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/></svg>',
    },
    {
      id: 'ux-textarea',
      name: 'Text Area',
      viewBox: '0 0 64 64',
      defaultWidth: 100,
      defaultHeight: 80,
      tags: ['textarea', 'multiline', 'text', 'form'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="4" y="8" width="56" height="48" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><line x1="12" y1="12" x2="12" y2="20" stroke="currentColor" stroke-width="1.5"/><line x1="16" y1="16" x2="40" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/><line x1="12" y1="24" x2="48" y2="24" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/><line x1="12" y1="32" x2="44" y2="32" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/><line x1="12" y1="40" x2="36" y2="40" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/><polyline points="52,48 52,52 48,52" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    },
    {
      id: 'ux-dropdown',
      name: 'Dropdown',
      viewBox: '0 0 64 64',
      defaultWidth: 100,
      defaultHeight: 60,
      tags: ['dropdown', 'select', 'menu', 'form'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="4" y="20" width="56" height="24" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><line x1="12" y1="32" x2="36" y2="32" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/><polyline points="46,28 51,36 56,28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    },
    {
      id: 'ux-checkbox',
      name: 'Checkbox',
      viewBox: '0 0 64 64',
      defaultWidth: 60,
      defaultHeight: 60,
      tags: ['checkbox', 'check', 'toggle', 'form'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="14" y="14" width="36" height="36" rx="6" fill="none" stroke="currentColor" stroke-width="2.5"/><polyline points="22,32 30,40 44,24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    },
    {
      id: 'ux-radio',
      name: 'Radio Button',
      viewBox: '0 0 64 64',
      defaultWidth: 60,
      defaultHeight: 60,
      tags: ['radio', 'option', 'select', 'form'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="18" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="32" cy="32" r="8" fill="currentColor"/></svg>',
    },
    {
      id: 'ux-toggle',
      name: 'Toggle Switch',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 50,
      tags: ['toggle', 'switch', 'on-off', 'form'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="10" y="20" width="44" height="24" rx="12" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="42" cy="32" r="8" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>',
    },
    {
      id: 'ux-slider',
      name: 'Slider',
      viewBox: '0 0 64 64',
      defaultWidth: 100,
      defaultHeight: 60,
      tags: ['slider', 'range', 'input', 'form'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><line x1="8" y1="32" x2="56" y2="32" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><circle cx="36" cy="32" r="7" fill="currentColor" stroke="currentColor" stroke-width="2.5"/></svg>',
    },
    {
      id: 'ux-search-bar',
      name: 'Search Bar',
      viewBox: '0 0 64 64',
      defaultWidth: 100,
      defaultHeight: 60,
      tags: ['search', 'find', 'filter', 'form'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="4" y="20" width="56" height="24" rx="12" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="20" cy="32" r="5" fill="none" stroke="currentColor" stroke-width="2"/><line x1="24" y1="35" x2="28" y2="39" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="32" y1="32" x2="48" y2="32" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/></svg>',
    },
    // -----------------------------------------------------------------------
    // Layout Components
    // -----------------------------------------------------------------------
    {
      id: 'ux-card',
      name: 'Card',
      viewBox: '0 0 64 64',
      defaultWidth: 100,
      defaultHeight: 80,
      tags: ['card', 'container', 'panel', 'tile'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="6" y="6" width="52" height="52" rx="6" fill="none" stroke="currentColor" stroke-width="2.5"/><line x1="6" y1="24" x2="58" y2="24" stroke="currentColor" stroke-width="1.5"/><line x1="12" y1="32" x2="42" y2="32" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/><line x1="12" y1="40" x2="52" y2="40" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/><line x1="12" y1="46" x2="46" y2="46" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/></svg>',
    },
    {
      id: 'ux-accordion',
      name: 'Accordion',
      viewBox: '0 0 64 64',
      defaultWidth: 100,
      defaultHeight: 80,
      tags: ['accordion', 'collapse', 'expand', 'layout'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="6" y="6" width="52" height="52" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><line x1="6" y1="22" x2="58" y2="22" stroke="currentColor" stroke-width="1.5"/><line x1="6" y1="38" x2="58" y2="38" stroke="currentColor" stroke-width="1.5"/><polyline points="48,12 52,16 48,20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="48,44 52,48 48,52" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="14" x2="40" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/><polyline points="48,27 52,31 48,35" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="30" x2="40" y2="30" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/><line x1="12" y1="46" x2="40" y2="46" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/></svg>',
    },
    {
      id: 'ux-tabs',
      name: 'Tabs',
      viewBox: '0 0 64 64',
      defaultWidth: 100,
      defaultHeight: 70,
      tags: ['tabs', 'tabbar', 'navigation', 'layout'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="4" y="16" width="56" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="2"/><line x1="4" y1="28" x2="60" y2="28" stroke="currentColor" stroke-width="2"/><rect x="4" y="16" width="18" height="12" fill="none" stroke="currentColor" stroke-width="2"/><line x1="22" y1="16" x2="22" y2="28" stroke="currentColor" stroke-width="2"/><line x1="40" y1="16" x2="40" y2="28" stroke="currentColor" stroke-width="2"/><line x1="10" y1="22" x2="18" y2="22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="28" y1="22" x2="36" y2="22" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/><line x1="46" y1="22" x2="54" y2="22" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/><line x1="10" y1="36" x2="50" y2="36" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/><line x1="10" y1="44" x2="40" y2="44" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/></svg>',
    },
    {
      id: 'ux-navbar',
      name: 'Navigation Bar',
      viewBox: '0 0 64 64',
      defaultWidth: 120,
      defaultHeight: 50,
      tags: ['navbar', 'navigation', 'header', 'menu'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="2" y="20" width="60" height="24" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="14" cy="32" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="24" y1="32" x2="32" y2="32" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/><line x1="36" y1="32" x2="44" y2="32" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/><line x1="48" y1="32" x2="56" y2="32" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/></svg>',
    },
    {
      id: 'ux-table',
      name: 'Table / Grid',
      viewBox: '0 0 64 64',
      defaultWidth: 100,
      defaultHeight: 80,
      tags: ['table', 'grid', 'data', 'spreadsheet'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="4" y="8" width="56" height="48" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><line x1="4" y1="20" x2="60" y2="20" stroke="currentColor" stroke-width="2"/><line x1="4" y1="32" x2="60" y2="32" stroke="currentColor" stroke-width="1.5"/><line x1="4" y1="44" x2="60" y2="44" stroke="currentColor" stroke-width="1.5"/><line x1="24" y1="8" x2="24" y2="56" stroke="currentColor" stroke-width="1.5"/><line x1="44" y1="8" x2="44" y2="56" stroke="currentColor" stroke-width="1.5"/></svg>',
    },
    // -----------------------------------------------------------------------
    // Media & Content
    // -----------------------------------------------------------------------
    {
      id: 'ux-image-placeholder',
      name: 'Image Placeholder',
      viewBox: '0 0 64 64',
      defaultWidth: 100,
      defaultHeight: 80,
      tags: ['image', 'photo', 'media', 'placeholder'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="6" y="10" width="52" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><polyline points="6,46 22,34 34,42 44,36 58,46" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="20" cy="22" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    },
    {
      id: 'ux-avatar',
      name: 'Avatar',
      viewBox: '0 0 64 64',
      defaultWidth: 60,
      defaultHeight: 60,
      tags: ['avatar', 'user', 'profile', 'photo'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><clipPath id="avClip"><circle cx="32" cy="32" r="23.5"/></clipPath></defs><circle cx="32" cy="32" r="24" fill="none" stroke="currentColor" stroke-width="2.5"/><g clip-path="url(#avClip)"><circle cx="32" cy="25" r="9" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M12,56 C14,44 22,38 32,38 C42,38 50,44 52,56" fill="none" stroke="currentColor" stroke-width="2.5"/></g></svg>',
    },
    {
      id: 'ux-video-player',
      name: 'Video Player',
      viewBox: '0 0 64 64',
      defaultWidth: 120,
      defaultHeight: 90,
      tags: ['video', 'media', 'player', 'stream'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="4" y="8" width="56" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><polygon points="26,18 26,38 42,28" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><rect x="4" y="48" width="56" height="8" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="8" y1="52" x2="28" y2="52" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
    },
    // -----------------------------------------------------------------------
    // Overlays & Feedback
    // -----------------------------------------------------------------------
    {
      id: 'ux-modal',
      name: 'Modal Dialog',
      viewBox: '0 0 64 64',
      defaultWidth: 100,
      defaultHeight: 80,
      tags: ['modal', 'dialog', 'popup', 'overlay'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="8" y="14" width="48" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="2.5"/><line x1="8" y1="24" x2="56" y2="24" stroke="currentColor" stroke-width="1.5"/><line x1="50" y1="17" x2="53" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="53" y1="17" x2="50" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="14" y1="30" x2="50" y2="30" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/><line x1="14" y1="36" x2="42" y2="36" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/><rect x="36" y="42" width="14" height="6" rx="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    },
    {
      id: 'ux-toast',
      name: 'Toast Notification',
      viewBox: '0 0 64 64',
      defaultWidth: 100,
      defaultHeight: 50,
      tags: ['toast', 'notification', 'alert', 'snackbar'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="4" y="18" width="56" height="28" rx="6" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="18" cy="32" r="5" fill="none" stroke="currentColor" stroke-width="2"/><line x1="18" y1="29" x2="18" y2="33" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="18" cy="35.5" r="0.8" fill="currentColor"/><line x1="28" y1="28" x2="50" y2="28" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/><line x1="28" y1="36" x2="44" y2="36" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/></svg>',
    },
    {
      id: 'ux-progress-bar',
      name: 'Progress Bar',
      viewBox: '0 0 64 64',
      defaultWidth: 100,
      defaultHeight: 50,
      tags: ['progress', 'loading', 'bar', 'status'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="pb" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="currentColor" stop-opacity="0.6"/><stop offset="60%" stop-color="currentColor" stop-opacity="0.35"/><stop offset="100%" stop-color="currentColor" stop-opacity="0.1"/></linearGradient></defs><rect x="4" y="22" width="56" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><rect x="6" y="24" width="36" height="16" rx="2" fill="url(#pb)"/></svg>',
    },
    // -----------------------------------------------------------------------
    // Device Frames
    // -----------------------------------------------------------------------
    {
      id: 'ux-phone-frame',
      name: 'Phone Frame',
      viewBox: '0 0 64 64',
      defaultWidth: 60,
      defaultHeight: 100,
      tags: ['phone', 'mobile', 'device', 'frame'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="16" y="4" width="32" height="56" rx="5" fill="none" stroke="currentColor" stroke-width="2.5"/><line x1="16" y1="12" x2="48" y2="12" stroke="currentColor" stroke-width="1.5"/><line x1="16" y1="52" x2="48" y2="52" stroke="currentColor" stroke-width="1.5"/><line x1="27" y1="8" x2="37" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="32" cy="56" r="2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    },
    {
      id: 'ux-browser-window',
      name: 'Browser Window',
      viewBox: '0 0 64 64',
      defaultWidth: 100,
      defaultHeight: 80,
      tags: ['browser', 'window', 'web', 'page'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="4" y="8" width="56" height="48" rx="4" fill="none" stroke="currentColor" stroke-width="2.5"/><line x1="4" y1="20" x2="60" y2="20" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="14" r="2" fill="currentColor" opacity="0.5"/><circle cx="20" cy="14" r="2" fill="currentColor" opacity="0.5"/><circle cx="28" cy="14" r="2" fill="currentColor" opacity="0.5"/><rect x="34" y="12" width="20" height="4" rx="2" fill="none" stroke="currentColor" stroke-width="1" opacity="0.4"/></svg>',
    },
    // -----------------------------------------------------------------------
    // Data & Navigation
    // -----------------------------------------------------------------------
    {
      id: 'ux-breadcrumbs',
      name: 'Breadcrumbs',
      viewBox: '0 0 64 64',
      defaultWidth: 100,
      defaultHeight: 50,
      tags: ['breadcrumbs', 'navigation', 'path', 'trail'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><line x1="6" y1="32" x2="16" y2="32" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><polyline points="20,28 24,32 20,36" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="28" y1="32" x2="38" y2="32" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.6"/><polyline points="42,28 46,32 42,36" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="50" y1="32" x2="58" y2="32" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.6"/></svg>',
    },
    {
      id: 'ux-pagination',
      name: 'Pagination',
      viewBox: '0 0 64 64',
      defaultWidth: 100,
      defaultHeight: 50,
      tags: ['pagination', 'pages', 'navigation', 'paging'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><polyline points="6,27 2,32 6,37" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="10" y="24" width="12" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="26" y="24" width="12" height="16" rx="2" fill="currentColor" opacity="0.25"/><rect x="26" y="24" width="12" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="42" y="24" width="12" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><polyline points="58,27 62,32 58,37" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    },
    // -----------------------------------------------------------------------
    // Additional Components
    // -----------------------------------------------------------------------
    {
      id: 'ux-stepper',
      name: 'Stepper',
      viewBox: '0 0 64 64',
      defaultWidth: 120,
      defaultHeight: 50,
      tags: ['stepper', 'steps', 'wizard', 'progress'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="12" cy="32" r="8" fill="currentColor" opacity="0.25"/><circle cx="12" cy="32" r="8" fill="none" stroke="currentColor" stroke-width="2"/><line x1="20" y1="32" x2="24" y2="32" stroke="currentColor" stroke-width="2"/><circle cx="32" cy="32" r="8" fill="none" stroke="currentColor" stroke-width="2"/><line x1="40" y1="32" x2="44" y2="32" stroke="currentColor" stroke-width="2" opacity="0.4"/><circle cx="52" cy="32" r="8" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/></svg>',
    },
    {
      id: 'ux-rating',
      name: 'Rating Stars',
      viewBox: '0 0 64 64',
      defaultWidth: 120,
      defaultHeight: 50,
      tags: ['rating', 'stars', 'review', 'score'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><polygon points="12,20 14,28 22,28 16,33 18,41 12,36 6,41 8,33 2,28 10,28" fill="currentColor" opacity="0.4" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><polygon points="32,20 34,28 42,28 36,33 38,41 32,36 26,41 28,33 22,28 30,28" fill="currentColor" opacity="0.4" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><polygon points="52,20 54,28 62,28 56,33 58,41 52,36 46,41 48,33 42,28 50,28" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    },
    {
      id: 'ux-skeleton',
      name: 'Skeleton Loader',
      viewBox: '0 0 64 64',
      defaultWidth: 100,
      defaultHeight: 80,
      tags: ['skeleton', 'loader', 'placeholder', 'loading'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="6" y="6" width="52" height="52" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><rect x="12" y="12" width="12" height="12" rx="6" fill="currentColor" opacity="0.15"/><rect x="30" y="12" width="22" height="4" rx="2" fill="currentColor" opacity="0.15"/><rect x="30" y="20" width="16" height="4" rx="2" fill="currentColor" opacity="0.1"/><rect x="12" y="30" width="40" height="4" rx="2" fill="currentColor" opacity="0.15"/><rect x="12" y="38" width="40" height="4" rx="2" fill="currentColor" opacity="0.1"/><rect x="12" y="46" width="28" height="4" rx="2" fill="currentColor" opacity="0.1"/></svg>',
    },
    {
      id: 'ux-tooltip',
      name: 'Tooltip',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 60,
      tags: ['tooltip', 'popover', 'hint', 'info'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="6" y="10" width="52" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="2.5"/><polygon points="28,40 32,48 36,40" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><line x1="14" y1="22" x2="44" y2="22" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/><line x1="14" y1="30" x2="36" y2="30" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/></svg>',
    },
    {
      id: 'ux-sidebar',
      name: 'Sidebar',
      viewBox: '0 0 64 64',
      defaultWidth: 100,
      defaultHeight: 80,
      tags: ['sidebar', 'drawer', 'navigation', 'menu'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="4" y="6" width="56" height="52" rx="4" fill="none" stroke="currentColor" stroke-width="2.5"/><line x1="22" y1="6" x2="22" y2="58" stroke="currentColor" stroke-width="2"/><line x1="8" y1="16" x2="18" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="24" x2="16" y2="24" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/><line x1="8" y1="32" x2="18" y2="32" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/><line x1="8" y1="40" x2="14" y2="40" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/></svg>',
    },
    {
      id: 'ux-spinner',
      name: 'Spinner',
      viewBox: '0 0 64 64',
      defaultWidth: 60,
      defaultHeight: 60,
      tags: ['spinner', 'loading', 'progress', 'wait'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M32 8 A24 24 0 1 1 8 32" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M32 8 A24 24 0 0 0 8 32" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity="0.2"/></svg>',
    },
  ],
};
