import type { ExtensionPack } from '../extensionStore';

export const networkInfraPack: ExtensionPack = {
  id: 'network-infra',
  name: 'Network & Infrastructure',
  builtIn: true,
  icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="20" r="12" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="14" cy="50" r="8" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="50" cy="50" r="8" fill="none" stroke="currentColor" stroke-width="2"/><line x1="24" y1="29" x2="18" y2="43" stroke="currentColor" stroke-width="1.5"/><line x1="40" y1="29" x2="46" y2="43" stroke="currentColor" stroke-width="1.5"/><line x1="22" y1="50" x2="42" y2="50" stroke="currentColor" stroke-width="1.5"/></svg>',
  items: [
    // -----------------------------------------------------------------------
    // Core Networking
    // -----------------------------------------------------------------------
    {
      id: 'net-router',
      name: 'Router',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['network', 'router', 'routing', 'gateway'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<path d="M32 14 v36 M14 32 h36" stroke="currentColor" stroke-width="2"/>' +
        '<polygon points="32,12 29,18 35,18" fill="currentColor"/>' +
        '<polygon points="32,52 29,46 35,46" fill="currentColor"/>' +
        '<polygon points="12,32 18,29 18,35" fill="currentColor"/>' +
        '<polygon points="52,32 46,29 46,35" fill="currentColor"/>' +
        '</svg>',
    },
    {
      id: 'net-switch',
      name: 'Switch',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['network', 'switch', 'layer2', 'ethernet'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<rect x="6" y="20" width="52" height="24" rx="3" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<line x1="16" y1="26" x2="16" y2="38" stroke="currentColor" stroke-width="2"/>' +
        '<line x1="26" y1="26" x2="26" y2="38" stroke="currentColor" stroke-width="2"/>' +
        '<line x1="36" y1="26" x2="36" y2="38" stroke="currentColor" stroke-width="2"/>' +
        '<line x1="46" y1="26" x2="46" y2="38" stroke="currentColor" stroke-width="2"/>' +
        '<polygon points="14,24 12,20 20,20 18,24" fill="currentColor"/>' +
        '<polygon points="34,24 32,20 40,20 38,24" fill="currentColor"/>' +
        '</svg>',
    },
    {
      id: 'net-hub',
      name: 'Hub',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['network', 'hub', 'repeater', 'layer1'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<rect x="6" y="22" width="52" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<circle cx="16" cy="32" r="3" fill="currentColor"/>' +
        '<circle cx="26" cy="32" r="3" fill="currentColor"/>' +
        '<circle cx="36" cy="32" r="3" fill="currentColor"/>' +
        '<circle cx="46" cy="32" r="3" fill="currentColor"/>' +
        '<line x1="16" y1="22" x2="16" y2="16" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="26" y1="22" x2="26" y2="16" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="36" y1="22" x2="36" y2="16" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="46" y1="22" x2="46" y2="16" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="16" y1="42" x2="16" y2="48" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="46" y1="42" x2="46" y2="48" stroke="currentColor" stroke-width="1.5"/>' +
        '</svg>',
    },
    {
      id: 'net-gateway',
      name: 'Gateway',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['network', 'gateway', 'proxy', 'translation'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        // Left rectangle (network A)
        '<rect x="4" y="18" width="22" height="28" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>' +
        // Right rectangle (network B)
        '<rect x="38" y="18" width="22" height="28" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>' +
        // Connecting bridge bar
        '<rect x="24" y="26" width="16" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        // Arrows pointing both directions through the bridge
        '<line x1="27" y1="32" x2="37" y2="32" stroke="currentColor" stroke-width="1.5"/>' +
        '<polygon points="37,32 34,29.5 34,34.5" fill="currentColor"/>' +
        '<polygon points="27,32 30,29.5 30,34.5" fill="currentColor"/>' +
        // Dots in the left network
        '<circle cx="11" cy="28" r="2" fill="currentColor"/>' +
        '<circle cx="19" cy="28" r="2" fill="currentColor"/>' +
        '<circle cx="15" cy="36" r="2" fill="currentColor"/>' +
        // Dots in the right network
        '<circle cx="45" cy="28" r="2" fill="currentColor"/>' +
        '<circle cx="53" cy="28" r="2" fill="currentColor"/>' +
        '<circle cx="49" cy="36" r="2" fill="currentColor"/>' +
        '</svg>',
    },
    {
      id: 'net-modem',
      name: 'Modem',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['network', 'modem', 'dsl', 'cable', 'broadband'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<rect x="8" y="20" width="48" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        // Status LEDs
        '<circle cx="18" cy="30" r="2.5" fill="currentColor"/>' +
        '<circle cx="27" cy="30" r="2.5" fill="currentColor"/>' +
        '<circle cx="36" cy="30" r="2.5" fill="currentColor"/>' +
        '<circle cx="45" cy="30" r="2.5" fill="currentColor"/>' +
        // Antenna / signal line on top
        '<line x1="18" y1="20" x2="18" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<circle cx="18" cy="10" r="2" fill="currentColor"/>' +
        // Ethernet port indicators at bottom
        '<rect x="18" y="38" width="8" height="5" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<rect x="30" y="38" width="8" height="5" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '</svg>',
    },

    // -----------------------------------------------------------------------
    // Servers & Compute
    // -----------------------------------------------------------------------
    {
      id: 'net-server',
      name: 'Server',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['server', 'host', 'machine', 'rack'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<rect x="12" y="6" width="40" height="52" rx="3" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<line x1="12" y1="22" x2="52" y2="22" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="12" y1="38" x2="52" y2="38" stroke="currentColor" stroke-width="1.5"/>' +
        '<circle cx="20" cy="14" r="2.5" fill="currentColor"/>' +
        '<circle cx="20" cy="30" r="2.5" fill="currentColor"/>' +
        '<circle cx="20" cy="46" r="2.5" fill="currentColor"/>' +
        '<line x1="28" y1="14" x2="44" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<line x1="28" y1="30" x2="44" y2="30" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<line x1="28" y1="46" x2="44" y2="46" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '</svg>',
    },
    {
      id: 'net-database',
      name: 'Database',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['database', 'db', 'storage', 'data'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<ellipse cx="32" cy="16" rx="20" ry="8" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<path d="M12 16 v32 a20 8 0 0 0 40 0 v-32" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<ellipse cx="32" cy="28" rx="20" ry="8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3"/>' +
        '<ellipse cx="32" cy="38" rx="20" ry="8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3"/>' +
        '</svg>',
    },
    {
      id: 'net-storage',
      name: 'Storage / NAS',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['storage', 'nas', 'san', 'disk', 'array'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        // Main chassis
        '<rect x="8" y="12" width="48" height="40" rx="3" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        // Drive bays (2x2 grid)
        '<rect x="14" y="18" width="16" height="12" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<rect x="34" y="18" width="16" height="12" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<rect x="14" y="34" width="16" height="12" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<rect x="34" y="34" width="16" height="12" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        // Drive slot lines inside each bay
        '<line x1="17" y1="22" x2="27" y2="22" stroke="currentColor" stroke-width="1"/>' +
        '<line x1="17" y1="25" x2="27" y2="25" stroke="currentColor" stroke-width="1"/>' +
        '<line x1="37" y1="22" x2="47" y2="22" stroke="currentColor" stroke-width="1"/>' +
        '<line x1="37" y1="25" x2="47" y2="25" stroke="currentColor" stroke-width="1"/>' +
        '<line x1="17" y1="38" x2="27" y2="38" stroke="currentColor" stroke-width="1"/>' +
        '<line x1="17" y1="41" x2="27" y2="41" stroke="currentColor" stroke-width="1"/>' +
        '<line x1="37" y1="38" x2="47" y2="38" stroke="currentColor" stroke-width="1"/>' +
        '<line x1="37" y1="41" x2="47" y2="41" stroke="currentColor" stroke-width="1"/>' +
        '</svg>',
    },
    {
      id: 'net-container',
      name: 'Container',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['container', 'docker', 'kubernetes', 'k8s', 'pod'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        // Whale body (simplified Docker whale shape)
        // Container grid (the "cargo" blocks on the whale)
        '<rect x="10" y="10" width="12" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<rect x="26" y="10" width="12" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<rect x="42" y="10" width="12" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<rect x="10" y="24" width="12" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<rect x="26" y="24" width="12" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<rect x="42" y="24" width="12" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        // Platform / base
        '<rect x="6" y="38" width="52" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        // Dots indicating runtime
        '<circle cx="16" cy="46" r="2.5" fill="currentColor"/>' +
        '<circle cx="25" cy="46" r="2.5" fill="currentColor"/>' +
        '<circle cx="34" cy="46" r="2.5" fill="currentColor"/>' +
        // Gear/settings indicator
        '<line x1="44" y1="43" x2="50" y2="43" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<line x1="44" y1="47" x2="50" y2="47" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '</svg>',
    },

    // -----------------------------------------------------------------------
    // Security
    // -----------------------------------------------------------------------
    {
      id: 'net-firewall',
      name: 'Firewall',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['firewall', 'security', 'protection', 'filter'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<rect x="6" y="10" width="52" height="44" rx="2" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<line x1="6" y1="21" x2="58" y2="21" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="6" y1="32" x2="58" y2="32" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="6" y1="43" x2="58" y2="43" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="22" y1="10" x2="22" y2="54" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="42" y1="10" x2="42" y2="54" stroke="currentColor" stroke-width="1.5"/>' +
        '</svg>',
    },
    {
      id: 'net-shield',
      name: 'Security',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['security', 'shield', 'protection', 'antivirus', 'ids', 'ips'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<path d="M32 6 L54 16 L54 32 C54 46 42 56 32 60 C22 56 10 46 10 32 L10 16 Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>' +
        // Checkmark inside shield
        '<polyline points="22,32 29,40 42,24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg>',
    },
    {
      id: 'net-lock',
      name: 'Encryption',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['encryption', 'lock', 'ssl', 'tls', 'certificate', 'crypto'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        // Lock shackle (U-shape)
        '<path d="M20 28 L20 18 A12 12 0 0 1 44 18 L44 28" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>' +
        // Lock body
        '<rect x="14" y="28" width="36" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        // Keyhole
        '<circle cx="32" cy="38" r="4" fill="currentColor"/>' +
        '<rect x="30" y="40" width="4" height="8" rx="1" fill="currentColor"/>' +
        '</svg>',
    },
    {
      id: 'net-vpn',
      name: 'VPN',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['vpn', 'tunnel', 'secure', 'private', 'ipsec'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        // Tunnel shape (two arcs forming a pipe)
        '<path d="M6 42 L6 28 C6 18 16 12 26 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>' +
        '<path d="M58 42 L58 28 C58 18 48 12 38 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>' +
        // Connecting top bar
        '<line x1="26" y1="12" x2="38" y2="12" stroke="currentColor" stroke-width="2.5"/>' +
        // Base line
        '<line x1="6" y1="42" x2="58" y2="42" stroke="currentColor" stroke-width="2.5"/>' +
        // Lock symbol in center
        '<path d="M28 32 L28 27 A4 4 0 0 1 36 27 L36 32" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<rect x="26" y="32" width="12" height="8" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<circle cx="32" cy="36" r="1.5" fill="currentColor"/>' +
        // Dashed line through tunnel (encrypted data)
        '<line x1="10" y1="32" x2="24" y2="32" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2"/>' +
        '<line x1="40" y1="32" x2="54" y2="32" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2"/>' +
        '</svg>',
    },

    // -----------------------------------------------------------------------
    // Cloud Services
    // -----------------------------------------------------------------------
    {
      id: 'net-cloud',
      name: 'Cloud',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['cloud', 'service', 'saas', 'paas', 'iaas'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<path d="M18 44 A10 10 0 0 1 14 26 A14 14 0 0 1 28 14 A16 16 0 0 1 50 24 A10 10 0 0 1 52 44 Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>' +
        '</svg>',
    },
    {
      id: 'net-cloud-server',
      name: 'Cloud Server',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['cloud', 'server', 'vm', 'instance', 'compute'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        // Cloud outline
        '<path d="M16 38 A8 8 0 0 1 13 24 A11 11 0 0 1 24 14 A13 13 0 0 1 44 20 A8 8 0 0 1 48 38 Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
        // Small server rack inside cloud
        '<rect x="24" y="20" width="16" height="14" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="24" y1="27" x2="40" y2="27" stroke="currentColor" stroke-width="1"/>' +
        '<circle cx="28" cy="23.5" r="1.5" fill="currentColor"/>' +
        '<circle cx="28" cy="30.5" r="1.5" fill="currentColor"/>' +
        // Connection lines going down from cloud
        '<line x1="26" y1="38" x2="26" y2="54" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="38" y1="38" x2="38" y2="54" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="26" y1="54" x2="38" y2="54" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        // Down arrow
        '<polygon points="32,54 28,49 36,49" fill="currentColor"/>' +
        '</svg>',
    },
    {
      id: 'net-cdn',
      name: 'CDN',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['cdn', 'content', 'delivery', 'distribution', 'cache', 'edge'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        // Globe (circle with latitude/longitude lines)
        '<circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<ellipse cx="32" cy="32" rx="10" ry="22" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="10" y1="32" x2="54" y2="32" stroke="currentColor" stroke-width="1.5"/>' +
        '<path d="M13 20 Q32 24 51 20" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<path d="M13 44 Q32 40 51 44" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        // Small distribution dots at cardinal points
        '<circle cx="32" cy="10" r="2" fill="currentColor"/>' +
        '<circle cx="54" cy="32" r="2" fill="currentColor"/>' +
        '<circle cx="32" cy="54" r="2" fill="currentColor"/>' +
        '<circle cx="10" cy="32" r="2" fill="currentColor"/>' +
        '</svg>',
    },
    {
      id: 'net-api-gateway',
      name: 'API Gateway',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['api', 'gateway', 'rest', 'endpoint', 'proxy', 'ingress'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        // Central gateway box
        '<rect x="22" y="10" width="20" height="44" rx="3" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        // API text represented as horizontal lines
        '<line x1="27" y1="20" x2="37" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<line x1="27" y1="26" x2="37" y2="26" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<line x1="27" y1="32" x2="37" y2="32" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        // Incoming arrows from left
        '<line x1="4" y1="22" x2="22" y2="22" stroke="currentColor" stroke-width="1.5"/>' +
        '<polygon points="20,22 16,19.5 16,24.5" fill="currentColor"/>' +
        '<line x1="4" y1="32" x2="22" y2="32" stroke="currentColor" stroke-width="1.5"/>' +
        '<polygon points="20,32 16,29.5 16,34.5" fill="currentColor"/>' +
        '<line x1="4" y1="42" x2="22" y2="42" stroke="currentColor" stroke-width="1.5"/>' +
        '<polygon points="20,42 16,39.5 16,44.5" fill="currentColor"/>' +
        // Outgoing arrows to right
        '<line x1="42" y1="26" x2="60" y2="26" stroke="currentColor" stroke-width="1.5"/>' +
        '<polygon points="58,26 54,23.5 54,28.5" fill="currentColor"/>' +
        '<line x1="42" y1="38" x2="60" y2="38" stroke="currentColor" stroke-width="1.5"/>' +
        '<polygon points="58,38 54,35.5 54,40.5" fill="currentColor"/>' +
        '</svg>',
    },

    // -----------------------------------------------------------------------
    // Endpoints
    // -----------------------------------------------------------------------
    {
      id: 'net-laptop',
      name: 'Laptop',
      viewBox: '0 0 64 64',
      defaultWidth: 90,
      defaultHeight: 70,
      tags: ['laptop', 'computer', 'client', 'endpoint', 'workstation'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<rect x="14" y="10" width="36" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<rect x="18" y="14" width="28" height="22" rx="1" fill="none" stroke="currentColor" stroke-width="1"/>' +
        '<path d="M6 44 L14 40 L50 40 L58 44 Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<line x1="6" y1="44" x2="58" y2="44" stroke="currentColor" stroke-width="2.5"/>' +
        '</svg>',
    },
    {
      id: 'net-desktop',
      name: 'Desktop',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['desktop', 'computer', 'pc', 'workstation', 'monitor'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        // Monitor
        '<rect x="8" y="6" width="48" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<rect x="12" y="10" width="40" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="1"/>' +
        // Stand
        '<rect x="28" y="40" width="8" height="8" fill="none" stroke="currentColor" stroke-width="2"/>' +
        // Base
        '<line x1="20" y1="48" x2="44" y2="48" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>' +
        // Keyboard
        '<rect x="16" y="52" width="32" height="6" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="20" y1="55" x2="44" y2="55" stroke="currentColor" stroke-width="1" stroke-dasharray="2 2"/>' +
        '</svg>',
    },
    {
      id: 'net-mobile',
      name: 'Mobile Phone',
      viewBox: '0 0 64 64',
      defaultWidth: 50,
      defaultHeight: 90,
      tags: ['mobile', 'phone', 'smartphone', 'device', 'endpoint'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<rect x="18" y="4" width="28" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        // Screen
        '<rect x="22" y="12" width="20" height="34" rx="1" fill="none" stroke="currentColor" stroke-width="1"/>' +
        // Speaker grille at top
        '<line x1="28" y1="8" x2="36" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        // Home button / gesture bar at bottom
        '<line x1="28" y1="53" x2="36" y2="53" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '</svg>',
    },
    {
      id: 'net-printer',
      name: 'Printer',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['printer', 'output', 'peripheral', 'device'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        // Paper tray (top) going into printer
        '<path d="M18 8 L18 24 L46 24 L46 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
        // Printer body
        '<rect x="8" y="22" width="48" height="22" rx="3" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        // Output tray / paper coming out
        '<path d="M18 44 L18 56 L46 56 L46 44" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
        // Lines on output paper
        '<line x1="22" y1="48" x2="42" y2="48" stroke="currentColor" stroke-width="1" stroke-dasharray="3 2"/>' +
        '<line x1="22" y1="52" x2="38" y2="52" stroke="currentColor" stroke-width="1" stroke-dasharray="3 2"/>' +
        // Power indicator on printer body
        '<circle cx="48" cy="30" r="2" fill="currentColor"/>' +
        '</svg>',
    },
    {
      id: 'net-iot',
      name: 'IoT Device',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['iot', 'sensor', 'device', 'smart', 'embedded', 'edge'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        // Chip / microcontroller body
        '<rect x="18" y="18" width="28" height="28" rx="3" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        // Chip pins - top
        '<line x1="25" y1="18" x2="25" y2="10" stroke="currentColor" stroke-width="2"/>' +
        '<line x1="32" y1="18" x2="32" y2="10" stroke="currentColor" stroke-width="2"/>' +
        '<line x1="39" y1="18" x2="39" y2="10" stroke="currentColor" stroke-width="2"/>' +
        // Chip pins - bottom
        '<line x1="25" y1="46" x2="25" y2="54" stroke="currentColor" stroke-width="2"/>' +
        '<line x1="32" y1="46" x2="32" y2="54" stroke="currentColor" stroke-width="2"/>' +
        '<line x1="39" y1="46" x2="39" y2="54" stroke="currentColor" stroke-width="2"/>' +
        // Chip pins - left
        '<line x1="18" y1="25" x2="10" y2="25" stroke="currentColor" stroke-width="2"/>' +
        '<line x1="18" y1="32" x2="10" y2="32" stroke="currentColor" stroke-width="2"/>' +
        '<line x1="18" y1="39" x2="10" y2="39" stroke="currentColor" stroke-width="2"/>' +
        // Chip pins - right
        '<line x1="46" y1="25" x2="54" y2="25" stroke="currentColor" stroke-width="2"/>' +
        '<line x1="46" y1="32" x2="54" y2="32" stroke="currentColor" stroke-width="2"/>' +
        '<line x1="46" y1="39" x2="54" y2="39" stroke="currentColor" stroke-width="2"/>' +
        // Wifi signal inside chip
        '<circle cx="32" cy="36" r="2" fill="currentColor"/>' +
        '<path d="M27 31 a7 7 0 0 1 10 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '<path d="M24 27 a12 12 0 0 1 16 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '</svg>',
    },

    // -----------------------------------------------------------------------
    // Infrastructure Services
    // -----------------------------------------------------------------------
    {
      id: 'net-load-balancer',
      name: 'Load Balancer',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['load-balancer', 'lb', 'distribution', 'traffic', 'ha'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<polygon points="32,8 52,22 52,42 32,56 12,42 12,22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<line x1="32" y1="24" x2="20" y2="40" stroke="currentColor" stroke-width="2"/>' +
        '<line x1="32" y1="24" x2="32" y2="44" stroke="currentColor" stroke-width="2"/>' +
        '<line x1="32" y1="24" x2="44" y2="40" stroke="currentColor" stroke-width="2"/>' +
        '<circle cx="32" cy="22" r="3" fill="currentColor"/>' +
        '<circle cx="20" cy="42" r="3" fill="currentColor"/>' +
        '<circle cx="32" cy="46" r="3" fill="currentColor"/>' +
        '<circle cx="44" cy="42" r="3" fill="currentColor"/>' +
        '</svg>',
    },
    {
      id: 'net-dns',
      name: 'DNS Server',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['dns', 'domain', 'nameserver', 'resolution', 'lookup'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        // Server body
        '<rect x="14" y="8" width="36" height="48" rx="3" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<line x1="14" y1="24" x2="50" y2="24" stroke="currentColor" stroke-width="1.5"/>' +
        // Top section: magnifying glass / lookup symbol
        '<circle cx="30" cy="16" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="34" y1="20" x2="38" y2="23" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        // DNS records (lines representing domain entries)
        '<line x1="20" y1="30" x2="30" y2="30" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '<circle cx="40" cy="30" r="2" fill="currentColor"/>' +
        '<line x1="20" y1="36" x2="34" y2="36" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '<circle cx="40" cy="36" r="2" fill="currentColor"/>' +
        '<line x1="20" y1="42" x2="28" y2="42" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '<circle cx="40" cy="42" r="2" fill="currentColor"/>' +
        '<line x1="20" y1="48" x2="32" y2="48" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '<circle cx="40" cy="48" r="2" fill="currentColor"/>' +
        '</svg>',
    },
    {
      id: 'net-wireless-ap',
      name: 'Wireless AP',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['wireless', 'wifi', 'access-point', 'wlan'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<circle cx="32" cy="42" r="4" fill="currentColor"/>' +
        '<rect x="28" y="46" width="8" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<line x1="24" y1="54" x2="40" y2="54" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>' +
        '<path d="M22 32 a14 14 0 0 1 20 0" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>' +
        '<path d="M14 24 a24 24 0 0 1 36 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<path d="M8 16 a32 32 0 0 1 48 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '</svg>',
    },
    {
      id: 'net-antenna',
      name: 'Cell Tower',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['antenna', 'tower', 'cellular', 'radio', '5g', 'lte', 'broadcast'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        // Tower mast
        '<line x1="32" y1="14" x2="32" y2="58" stroke="currentColor" stroke-width="2.5"/>' +
        // Cross beams
        '<line x1="22" y1="58" x2="42" y2="58" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>' +
        '<line x1="24" y1="48" x2="40" y2="48" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="26" y1="38" x2="38" y2="38" stroke="currentColor" stroke-width="1.5"/>' +
        // Diagonal supports
        '<line x1="24" y1="58" x2="30" y2="38" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="40" y1="58" x2="34" y2="38" stroke="currentColor" stroke-width="1.5"/>' +
        // Signal waves from top
        '<path d="M22 18 a14 14 0 0 1 20 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<path d="M16 12 a22 22 0 0 1 32 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        // Antenna tip
        '<circle cx="32" cy="14" r="2.5" fill="currentColor"/>' +
        '</svg>',
    },
    {
      id: 'net-ethernet',
      name: 'Network Port',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['ethernet', 'rj45', 'cable', 'port', 'jack', 'connection'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        // RJ45 connector housing
        '<rect x="12" y="16" width="40" height="32" rx="3" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        // Clip / tab at top
        '<rect x="22" y="10" width="20" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>' +
        // Contact pins inside
        '<line x1="20" y1="24" x2="20" y2="34" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="26" y1="24" x2="26" y2="34" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="32" y1="24" x2="32" y2="34" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="38" y1="24" x2="38" y2="34" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="44" y1="24" x2="44" y2="34" stroke="currentColor" stroke-width="1.5"/>' +
        // Cable coming out bottom
        '<path d="M28 48 L28 54 Q32 58 36 54 L36 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '</svg>',
    },

    // -----------------------------------------------------------------------
    // Additional Services
    // -----------------------------------------------------------------------
    {
      id: 'net-message-queue',
      name: 'Message Queue',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['queue', 'message', 'mq', 'rabbitmq', 'kafka', 'pubsub'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<rect x="16" y="10" width="32" height="44" rx="3" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        // Stacked message envelopes
        '<rect x="22" y="16" width="20" height="8" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<rect x="22" y="28" width="20" height="8" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<rect x="22" y="40" width="20" height="8" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        // Arrow in
        '<line x1="4" y1="20" x2="16" y2="20" stroke="currentColor" stroke-width="1.5"/>' +
        '<polygon points="14,17 18,20 14,23" fill="currentColor"/>' +
        // Arrow out
        '<line x1="48" y1="44" x2="60" y2="44" stroke="currentColor" stroke-width="1.5"/>' +
        '<polygon points="58,41 62,44 58,47" fill="currentColor"/>' +
        '</svg>',
    },
    {
      id: 'net-serverless',
      name: 'Serverless / Lambda',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['serverless', 'lambda', 'function', 'faas', 'cloud-function'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<rect x="10" y="10" width="44" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        // Lambda symbol (λ)
        '<path d="M22 18 L32 46 L42 18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<line x1="18" y1="46" x2="38" y2="46" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '</svg>',
    },
    {
      id: 'net-cache',
      name: 'Cache',
      viewBox: '0 0 64 64',
      defaultWidth: 80,
      defaultHeight: 80,
      tags: ['cache', 'redis', 'memcached', 'memory', 'fast'],
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<rect x="10" y="12" width="44" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        // Lightning bolt (speed indicator)
        '<polygon points="36,18 26,34 32,34 28,48 40,30 34,30" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
        '</svg>',
    },
  ],
};
