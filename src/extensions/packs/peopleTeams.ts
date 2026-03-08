import type { ExtensionPack } from '../extensionStore';

export const peopleTeamsPack: ExtensionPack = {
  id: 'people-teams',
  name: 'People & Teams',
  builtIn: true,
  icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="18" r="10" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M14 54 Q14 36 32 34 Q50 36 50 54" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>',
  items: [
    // -----------------------------------------------------------------------
    // INDIVIDUAL
    // -----------------------------------------------------------------------
    {
      id: 'ppl-person',
      name: 'Person',
      viewBox: '0 0 64 64',
      defaultWidth: 64,
      defaultHeight: 80,
      tags: ['person', 'user', 'individual', 'human'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<circle cx="32" cy="18" r="10" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<path d="M14 56 Q14 38 32 36 Q50 38 50 56" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '</svg>',
    },
    {
      id: 'ppl-person-circle',
      name: 'Person (Avatar)',
      viewBox: '0 0 64 64',
      defaultWidth: 70,
      defaultHeight: 70,
      tags: ['person', 'avatar', 'profile', 'portrait'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<circle cx="32" cy="24" r="9" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<path d="M16 52 Q16 40 32 38 Q48 40 48 52" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '</svg>',
    },
    {
      id: 'ppl-person-badge',
      name: 'Person (Badge)',
      viewBox: '0 0 64 64',
      defaultWidth: 64,
      defaultHeight: 80,
      tags: ['person', 'badge', 'id', 'employee', 'identification'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<circle cx="26" cy="18" r="9" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<path d="M10 54 Q10 38 26 36 Q42 38 42 54" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        // ID badge in top-right
        '<rect x="40" y="6" width="18" height="24" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<circle cx="49" cy="15" r="3.5" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="44" y1="23" x2="54" y2="23" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '</svg>',
    },
    {
      id: 'ppl-person-gear',
      name: 'Admin',
      viewBox: '0 0 64 64',
      defaultWidth: 64,
      defaultHeight: 80,
      tags: ['admin', 'administrator', 'settings', 'gear', 'manager'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<circle cx="24" cy="20" r="9" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<path d="M8 56 Q8 40 24 38 Q40 40 40 56" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        // Gear icon top-right
        '<circle cx="50" cy="16" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<circle cx="50" cy="16" r="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="50" y1="8" x2="50" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<line x1="50" y1="22" x2="50" y2="24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<line x1="42" y1="16" x2="44" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<line x1="56" y1="16" x2="58" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<line x1="44.3" y1="10.3" x2="45.8" y2="11.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<line x1="54.2" y1="20.2" x2="55.7" y2="21.7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<line x1="55.7" y1="10.3" x2="54.2" y2="11.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<line x1="45.8" y1="20.2" x2="44.3" y2="21.7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '</svg>',
    },
    {
      id: 'ppl-person-shield',
      name: 'Security',
      viewBox: '0 0 64 64',
      defaultWidth: 64,
      defaultHeight: 80,
      tags: ['security', 'shield', 'protection', 'guard', 'compliance'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<circle cx="24" cy="20" r="9" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<path d="M8 56 Q8 40 24 38 Q40 40 40 56" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        // Shield icon top-right
        '<path d="M50 8 L58 12 L58 22 Q58 30 50 34 Q42 30 42 22 L42 12 Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
        '<polyline points="46,20 49,24 55,16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg>',
    },
    {
      id: 'ppl-remote-worker',
      name: 'Remote Worker',
      viewBox: '0 0 64 64',
      defaultWidth: 64,
      defaultHeight: 80,
      tags: ['remote', 'laptop', 'work-from-home', 'wfh', 'digital'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<circle cx="32" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<path d="M16 42 Q16 28 32 26 Q48 28 48 42" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        // Laptop below the person
        '<rect x="16" y="44" width="32" height="10" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<rect x="20" y="46" width="24" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="1"/>' +
        '<line x1="12" y1="56" x2="52" y2="56" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '</svg>',
    },

    // -----------------------------------------------------------------------
    // GROUPS
    // -----------------------------------------------------------------------
    {
      id: 'ppl-team-group',
      name: 'Team Group',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['team', 'group', 'people', 'crew'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        // Center person (front, larger)
        '<circle cx="32" cy="16" r="8" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<path d="M18 44 Q18 32 32 30 Q46 32 46 44" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        // Left person (behind)
        '<circle cx="14" cy="24" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<path d="M4 46 Q4 38 14 36 Q24 38 22 44" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        // Right person (behind)
        '<circle cx="50" cy="24" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<path d="M42 44 Q40 38 50 36 Q60 38 60 46" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '</svg>',
    },
    {
      id: 'ppl-department',
      name: 'Department',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['department', 'division', 'unit', 'group', 'large-team'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        // Building outline to denote department
        '<rect x="10" y="8" width="44" height="48" rx="3" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        // Row 1: two people silhouettes
        '<circle cx="24" cy="20" r="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<path d="M17 32 Q17 28 24 27 Q31 28 31 32" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<circle cx="40" cy="20" r="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<path d="M33 32 Q33 28 40 27 Q47 28 47 32" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        // Row 2: two more people
        '<circle cx="24" cy="38" r="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<path d="M17 50 Q17 46 24 45 Q31 46 31 50" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<circle cx="40" cy="38" r="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<path d="M33 50 Q33 46 40 45 Q47 46 47 50" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '</svg>',
    },
    {
      id: 'ppl-meeting',
      name: 'Meeting',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['meeting', 'conference', 'discussion', 'roundtable', 'collaboration'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        // Conference table (rounded rectangle in center)
        '<ellipse cx="32" cy="34" rx="14" ry="8" fill="none" stroke="currentColor" stroke-width="2"/>' +
        // People around the table - top
        '<circle cx="32" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<path d="M26 22 Q26 19 32 18 Q38 19 38 22" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        // Bottom
        '<circle cx="32" cy="56" r="5" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<path d="M26 50 Q26 47 32 46 Q38 47 38 50" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        // Left
        '<circle cx="8" cy="32" r="5" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<path d="M14 42 Q14 39 16 38" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<path d="M2 42 Q2 39 8 38 Q14 39 14 42" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        // Right
        '<circle cx="56" cy="32" r="5" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<path d="M50 42 Q50 39 56 38 Q62 39 62 42" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '</svg>',
    },

    // -----------------------------------------------------------------------
    // ORGANIZATIONAL
    // -----------------------------------------------------------------------
    {
      id: 'ppl-org-node',
      name: 'Org Chart Node',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['org', 'organization', 'hierarchy', 'node', 'card'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<rect x="14" y="6" width="36" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<circle cx="24" cy="15" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="30" y1="13" x2="44" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<line x1="30" y1="18" x2="40" y2="18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '<line x1="32" y1="24" x2="32" y2="34" stroke="currentColor" stroke-width="2"/>' +
        '<line x1="14" y1="34" x2="50" y2="34" stroke="currentColor" stroke-width="2"/>' +
        '<line x1="14" y1="34" x2="14" y2="40" stroke="currentColor" stroke-width="2"/>' +
        '<line x1="32" y1="34" x2="32" y2="40" stroke="currentColor" stroke-width="2"/>' +
        '<line x1="50" y1="34" x2="50" y2="40" stroke="currentColor" stroke-width="2"/>' +
        '<rect x="6" y="40" width="16" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<rect x="24" y="40" width="16" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<rect x="42" y="40" width="16" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '</svg>',
    },
    {
      id: 'ppl-hierarchy',
      name: 'Hierarchy',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['hierarchy', 'tree', 'structure', 'levels', 'reporting'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        // Top node - person
        '<circle cx="32" cy="10" r="5" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<path d="M26 18 Q26 16 32 15 Q38 16 38 18" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        // Vertical line down
        '<line x1="32" y1="20" x2="32" y2="26" stroke="currentColor" stroke-width="2"/>' +
        // Horizontal connector
        '<line x1="16" y1="26" x2="48" y2="26" stroke="currentColor" stroke-width="2"/>' +
        // Left branch
        '<line x1="16" y1="26" x2="16" y2="30" stroke="currentColor" stroke-width="2"/>' +
        '<circle cx="16" cy="34" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<path d="M11 40 Q11 38 16 37 Q21 38 21 40" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        // Center branch
        '<line x1="32" y1="26" x2="32" y2="30" stroke="currentColor" stroke-width="2"/>' +
        '<circle cx="32" cy="34" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<path d="M27 40 Q27 38 32 37 Q37 38 37 40" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        // Right branch
        '<line x1="48" y1="26" x2="48" y2="30" stroke="currentColor" stroke-width="2"/>' +
        '<circle cx="48" cy="34" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<path d="M43 40 Q43 38 48 37 Q53 38 53 40" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        // Bottom level (from center)
        '<line x1="32" y1="42" x2="32" y2="46" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="24" y1="46" x2="40" y2="46" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="24" y1="46" x2="24" y2="49" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="40" y1="46" x2="40" y2="49" stroke="currentColor" stroke-width="1.5"/>' +
        '<circle cx="24" cy="52" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<circle cx="40" cy="52" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '</svg>',
    },
    {
      id: 'ppl-manager',
      name: 'Manager',
      viewBox: '0 0 64 64',
      defaultWidth: 64,
      defaultHeight: 80,
      tags: ['manager', 'supervisor', 'lead', 'boss', 'director'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        // Crown / chevron above head to denote authority
        '<polyline points="20,10 26,4 32,10 38,4 44,10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<circle cx="32" cy="22" r="9" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<path d="M14 54 Q14 38 32 36 Q50 38 50 54" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        // Two small people below to show reports
        '<circle cx="20" cy="46" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<circle cx="44" cy="46" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '</svg>',
    },

    // -----------------------------------------------------------------------
    // ROLES
    // -----------------------------------------------------------------------
    {
      id: 'ppl-stakeholder',
      name: 'Stakeholder',
      viewBox: '0 0 64 64',
      defaultWidth: 64,
      defaultHeight: 80,
      tags: ['stakeholder', 'vip', 'executive', 'leader', 'key-person'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<polygon points="32,4 38,22 58,22 42,34 48,52 32,42 16,52 22,34 6,22 26,22" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
        '<circle cx="32" cy="26" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<path d="M24 42 Q24 36 32 34 Q40 36 40 42" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '</svg>',
    },
    {
      id: 'ppl-user-role',
      name: 'User Role',
      viewBox: '0 0 64 64',
      defaultWidth: 64,
      defaultHeight: 80,
      tags: ['role', 'permission', 'access', 'badge'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<circle cx="26" cy="20" r="10" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<path d="M8 54 Q8 38 26 36 Q44 38 44 54" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<rect x="38" y="4" width="22" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<line x1="42" y1="10" x2="56" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<line x1="42" y1="16" x2="52" y2="16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '</svg>',
    },
    {
      id: 'ppl-decision-maker',
      name: 'Decision Maker',
      viewBox: '0 0 64 64',
      defaultWidth: 64,
      defaultHeight: 80,
      tags: ['decision', 'approver', 'authority', 'gavel', 'executive'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<circle cx="24" cy="20" r="9" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<path d="M8 56 Q8 40 24 38 Q40 40 40 56" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        // Gavel icon top-right
        '<rect x="44" y="6" width="14" height="8" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<line x1="51" y1="14" x2="51" y2="22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<line x1="44" y1="24" x2="58" y2="24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>' +
        '</svg>',
    },
    {
      id: 'ppl-reviewer',
      name: 'Reviewer',
      viewBox: '0 0 64 64',
      defaultWidth: 64,
      defaultHeight: 80,
      tags: ['reviewer', 'approver', 'check', 'validator', 'auditor'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<circle cx="24" cy="20" r="9" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<path d="M8 56 Q8 40 24 38 Q40 40 40 56" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        // Checkmark in circle top-right
        '<circle cx="50" cy="14" r="10" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<polyline points="44,14 48,19 56,9" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg>',
    },

    // -----------------------------------------------------------------------
    // COMMUNICATION
    // -----------------------------------------------------------------------
    {
      id: 'ppl-presenter',
      name: 'Presenter',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['presenter', 'speaker', 'presentation', 'teacher', 'trainer'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        // Whiteboard / screen
        '<rect x="4" y="4" width="40" height="28" rx="2" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<line x1="24" y1="32" x2="24" y2="38" stroke="currentColor" stroke-width="2"/>' +
        '<line x1="16" y1="38" x2="32" y2="38" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        // Content lines on board
        '<line x1="10" y1="12" x2="28" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '<line x1="10" y1="18" x2="22" y2="18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '<line x1="10" y1="24" x2="34" y2="24" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        // Person standing to the right
        '<circle cx="52" cy="24" r="7" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<path d="M42 52 Q42 38 52 36 Q62 38 62 52" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '</svg>',
    },
    {
      id: 'ppl-handshake',
      name: 'Partnership',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['partnership', 'handshake', 'agreement', 'deal', 'collaboration'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        // Left person
        '<circle cx="14" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<path d="M4 36 Q4 24 14 22 Q24 24 24 36" fill="none" stroke="currentColor" stroke-width="2"/>' +
        // Right person
        '<circle cx="50" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<path d="M40 36 Q40 24 50 22 Q60 24 60 36" fill="none" stroke="currentColor" stroke-width="2"/>' +
        // Handshake below - two clasping hands
        '<path d="M18 42 L28 38 L36 42 L44 38" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M18 42 L14 46 L22 50 L30 46 L38 50 L46 46 L44 38" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
        '</svg>',
    },

    // -----------------------------------------------------------------------
    // ADDITIONAL
    // -----------------------------------------------------------------------
    {
      id: 'ppl-external',
      name: 'External User',
      viewBox: '0 0 64 64',
      defaultWidth: 64,
      defaultHeight: 80,
      tags: ['external', 'guest', 'vendor', 'client', 'contractor'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<circle cx="32" cy="18" r="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="5 3"/>' +
        '<path d="M14 56 Q14 38 32 36 Q50 38 50 56" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="5 3"/>' +
        '</svg>',
    },
    {
      id: 'ppl-support',
      name: 'Support Agent',
      viewBox: '0 0 64 64',
      defaultWidth: 64,
      defaultHeight: 80,
      tags: ['support', 'helpdesk', 'agent', 'service', 'headset'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<circle cx="32" cy="22" r="10" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<path d="M14 56 Q14 40 32 38 Q50 40 50 56" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        // Headset
        '<path d="M18 22 A14 14 0 0 1 46 22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<rect x="14" y="20" width="6" height="10" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<rect x="44" y="20" width="6" height="10" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<path d="M44 28 Q44 34 38 34" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '</svg>',
    },
    {
      id: 'ppl-developer',
      name: 'Developer',
      viewBox: '0 0 64 64',
      defaultWidth: 64,
      defaultHeight: 80,
      tags: ['developer', 'engineer', 'coder', 'programmer', 'tech'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<circle cx="32" cy="18" r="9" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<path d="M14 54 Q14 38 32 36 Q50 38 50 54" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        // Code brackets
        '<path d="M20 42 L14 48 L20 54" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M44 42 L50 48 L44 54" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg>',
    },
  ],
};
