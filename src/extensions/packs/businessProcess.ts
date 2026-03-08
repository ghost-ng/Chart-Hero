import type { ExtensionPack } from '../extensionStore';

export const businessProcessPack: ExtensionPack = {
  id: 'business-process',
  name: 'Business Process',
  builtIn: true,
  icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="4" y="22" width="20" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="2.5"/><line x1="24" y1="32" x2="40" y2="32" stroke="currentColor" stroke-width="2"/><polygon points="38,28 44,32 38,36" fill="currentColor"/><rect x="40" y="22" width="20" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>',
  items: [
    // -----------------------------------------------------------------------
    // Documents & Forms
    // -----------------------------------------------------------------------
    {
      id: 'bp-document',
      name: 'Document',
      viewBox: '0 0 64 64',
      defaultWidth: 70,
      defaultHeight: 90,
      tags: ['document', 'file', 'paper', 'report'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<path d="M14 4 L42 4 L52 14 L52 60 L14 60 Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<path d="M42 4 L42 14 L52 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
        '<line x1="20" y1="24" x2="44" y2="24" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '<line x1="20" y1="32" x2="44" y2="32" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '<line x1="20" y1="40" x2="38" y2="40" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '</svg>',
    },
    {
      id: 'bp-form',
      name: 'Form',
      viewBox: '0 0 64 64',
      defaultWidth: 70,
      defaultHeight: 90,
      tags: ['form', 'input', 'fields', 'submission'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<rect x="10" y="4" width="44" height="56" rx="3" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<line x1="16" y1="14" x2="28" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '<rect x="16" y="18" width="32" height="8" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="16" y1="32" x2="28" y2="32" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '<rect x="16" y="36" width="32" height="8" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<rect x="32" y="50" width="16" height="6" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '</svg>',
    },
    {
      id: 'bp-clipboard',
      name: 'Checklist',
      viewBox: '0 0 64 64',
      defaultWidth: 70,
      defaultHeight: 90,
      tags: ['checklist', 'clipboard', 'tasks', 'todo'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<rect x="12" y="8" width="40" height="52" rx="3" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<rect x="24" y="4" width="16" height="8" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<rect x="18" y="22" width="6" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<polyline points="19,25 21,27.5 24,22.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<line x1="28" y1="25" x2="44" y2="25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '<rect x="18" y="34" width="6" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<polyline points="19,37 21,39.5 24,34.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<line x1="28" y1="37" x2="44" y2="37" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '<rect x="18" y="46" width="6" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="28" y1="49" x2="44" y2="49" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '</svg>',
    },

    // -----------------------------------------------------------------------
    // Communication
    // -----------------------------------------------------------------------
    {
      id: 'bp-email',
      name: 'Email',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['email', 'mail', 'message', 'notification'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<rect x="6" y="14" width="52" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<polyline points="6,14 32,34 58,14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>' +
        '</svg>',
    },
    {
      id: 'bp-chat',
      name: 'Chat / Comment',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['chat', 'comment', 'message', 'conversation'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<path d="M8 8 L56 8 Q60 8 60 12 L60 38 Q60 42 56 42 L24 42 L14 54 L14 42 L8 42 Q4 42 4 38 L4 12 Q4 8 8 8 Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<line x1="14" y1="20" x2="44" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.4"/>' +
        '<line x1="14" y1="28" x2="36" y2="28" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.4"/>' +
        '</svg>',
    },
    {
      id: 'bp-notification',
      name: 'Notification',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['notification', 'bell', 'alert', 'reminder'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<path d="M24 8 A8 8 0 0 1 40 8 L42 36 L22 36 Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<line x1="14" y1="36" x2="50" y2="36" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>' +
        '<path d="M26 40 Q26 48 32 48 Q38 48 38 40" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<circle cx="32" cy="6" r="2" fill="currentColor"/>' +
        '</svg>',
    },

    // -----------------------------------------------------------------------
    // Approval & Decision
    // -----------------------------------------------------------------------
    {
      id: 'bp-approval',
      name: 'Approval',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['approval', 'stamp', 'authorize', 'accept'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<polyline points="20,32 28,42 44,22" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg>',
    },
    {
      id: 'bp-rejection',
      name: 'Rejection',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['rejection', 'deny', 'cancel', 'decline'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<line x1="22" y1="22" x2="42" y2="42" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>' +
        '<line x1="42" y1="22" x2="22" y2="42" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>' +
        '</svg>',
    },
    {
      id: 'bp-review',
      name: 'Review',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['review', 'inspect', 'magnify', 'search'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<circle cx="28" cy="28" r="16" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<line x1="40" y1="40" x2="54" y2="54" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
        '<line x1="20" y1="28" x2="36" y2="28" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<line x1="20" y1="22" x2="32" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>' +
        '<line x1="20" y1="34" x2="34" y2="34" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>' +
        '</svg>',
    },

    // -----------------------------------------------------------------------
    // Financial
    // -----------------------------------------------------------------------
    {
      id: 'bp-payment',
      name: 'Payment',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['payment', 'credit-card', 'billing', 'finance'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<rect x="4" y="14" width="56" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<line x1="4" y1="24" x2="60" y2="24" stroke="currentColor" stroke-width="2.5"/>' +
        '<line x1="12" y1="36" x2="28" y2="36" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<line x1="12" y1="42" x2="22" y2="42" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>' +
        '</svg>',
    },
    {
      id: 'bp-invoice',
      name: 'Invoice',
      viewBox: '0 0 64 64',
      defaultWidth: 70,
      defaultHeight: 90,
      tags: ['invoice', 'receipt', 'bill', 'statement'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<path d="M14 4 L50 4 L50 56 L46 52 L42 56 L38 52 L34 56 L30 52 L26 56 L22 52 L18 56 L14 52 Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<line x1="20" y1="16" x2="44" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<line x1="20" y1="24" x2="36" y2="24" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '<line x1="38" y1="24" x2="44" y2="24" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '<line x1="20" y1="32" x2="34" y2="32" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '<line x1="38" y1="32" x2="44" y2="32" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '<line x1="30" y1="42" x2="44" y2="42" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '</svg>',
    },
    {
      id: 'bp-dollar',
      name: 'Cost / Budget',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['cost', 'budget', 'money', 'dollar', 'finance'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<circle cx="32" cy="32" r="24" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<path d="M24 22 Q24 16 32 16 Q40 16 40 22 Q40 28 32 28 Q24 28 24 34 Q24 40 32 40 Q40 40 40 34" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>' +
        '<line x1="32" y1="12" x2="32" y2="16" stroke="currentColor" stroke-width="2"/>' +
        '<line x1="32" y1="40" x2="32" y2="44" stroke="currentColor" stroke-width="2"/>' +
        '</svg>',
    },

    // -----------------------------------------------------------------------
    // Time & Schedule
    // -----------------------------------------------------------------------
    {
      id: 'bp-clock',
      name: 'Timer / SLA',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['timer', 'clock', 'sla', 'deadline', 'time'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<circle cx="32" cy="34" r="24" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<line x1="32" y1="34" x2="32" y2="22" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>' +
        '<line x1="32" y1="34" x2="42" y2="38" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<line x1="28" y1="8" x2="36" y2="8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>' +
        '<circle cx="32" cy="34" r="2" fill="currentColor"/>' +
        '</svg>',
    },
    {
      id: 'bp-calendar',
      name: 'Calendar',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['calendar', 'schedule', 'date', 'event'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<rect x="6" y="12" width="52" height="46" rx="4" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<line x1="6" y1="24" x2="58" y2="24" stroke="currentColor" stroke-width="2"/>' +
        '<line x1="20" y1="6" x2="20" y2="16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>' +
        '<line x1="44" y1="6" x2="44" y2="16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>' +
        '<rect x="14" y="30" width="8" height="8" rx="1" fill="currentColor" opacity="0.3"/>' +
        '<rect x="28" y="30" width="8" height="8" rx="1" fill="currentColor" opacity="0.15"/>' +
        '<rect x="42" y="30" width="8" height="8" rx="1" fill="currentColor" opacity="0.15"/>' +
        '<rect x="14" y="44" width="8" height="8" rx="1" fill="currentColor" opacity="0.15"/>' +
        '<rect x="28" y="44" width="8" height="8" rx="1" fill="currentColor" opacity="0.15"/>' +
        '</svg>',
    },

    // -----------------------------------------------------------------------
    // Process Elements
    // -----------------------------------------------------------------------
    {
      id: 'bp-gear',
      name: 'Process / System',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['process', 'system', 'gear', 'automation', 'settings'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<circle cx="32" cy="32" r="10" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<circle cx="32" cy="32" r="4" fill="currentColor"/>' +
        '<line x1="32" y1="6" x2="32" y2="14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
        '<line x1="32" y1="50" x2="32" y2="58" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
        '<line x1="6" y1="32" x2="14" y2="32" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
        '<line x1="50" y1="32" x2="58" y2="32" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
        '<line x1="13.6" y1="13.6" x2="19.3" y2="19.3" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
        '<line x1="44.7" y1="44.7" x2="50.4" y2="50.4" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
        '<line x1="50.4" y1="13.6" x2="44.7" y2="19.3" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
        '<line x1="19.3" y1="44.7" x2="13.6" y2="50.4" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
        '</svg>',
    },
    {
      id: 'bp-workflow',
      name: 'Workflow',
      viewBox: '0 0 64 64',
      defaultWidth: 100,
      defaultHeight: 60,
      tags: ['workflow', 'flow', 'process', 'automation', 'pipeline'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<circle cx="10" cy="32" r="6" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<line x1="16" y1="32" x2="24" y2="32" stroke="currentColor" stroke-width="2"/>' +
        '<polygon points="22,28 28,32 22,36" fill="currentColor"/>' +
        '<rect x="26" y="24" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<line x1="42" y1="32" x2="48" y2="32" stroke="currentColor" stroke-width="2"/>' +
        '<polygon points="46,28 52,32 46,36" fill="currentColor"/>' +
        '<circle cx="56" cy="32" r="6" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<circle cx="56" cy="32" r="2" fill="currentColor"/>' +
        '</svg>',
    },
    {
      id: 'bp-flag',
      name: 'Milestone',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['milestone', 'flag', 'goal', 'target', 'achievement'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<line x1="14" y1="8" x2="14" y2="58" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>' +
        '<path d="M14 8 L50 8 L42 20 L50 32 L14 32 Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>' +
        '</svg>',
    },
    {
      id: 'bp-warning',
      name: 'Warning / Risk',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['warning', 'risk', 'alert', 'danger', 'caution'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<path d="M32 6 L58 54 L6 54 Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<line x1="32" y1="24" x2="32" y2="38" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
        '<circle cx="32" cy="46" r="2.5" fill="currentColor"/>' +
        '</svg>',
    },
    {
      id: 'bp-link',
      name: 'Integration',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['integration', 'link', 'chain', 'connection', 'api'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<path d="M22 28 L18 32 A10 10 0 0 0 32 46 L36 42" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>' +
        '<path d="M42 36 L46 32 A10 10 0 0 0 32 18 L28 22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>' +
        '</svg>',
    },
  ],
};
