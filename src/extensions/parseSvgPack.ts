import JSZip from 'jszip';
import DOMPurify from 'dompurify';
import { extractViewBox } from './recolorSvg';
import type { ExtensionPack, ExtensionItem } from './extensionStore';

/**
 * Parse a ZIP file into an ExtensionPack.
 * Expects a flat zip of .svg files, optionally with a manifest.json.
 */
export async function parseSvgPack(file: File): Promise<ExtensionPack> {
  const zip = await JSZip.loadAsync(file);
  const packId = file.name.replace(/\.zip$/i, '').replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();

  // Check for manifest
  const manifestFile = zip.file(/manifest\.json$/i)[0];
  let manifest: { name?: string; icon?: string; items?: { id: string; name: string; file: string }[] } | null = null;
  if (manifestFile) {
    try { manifest = JSON.parse(await manifestFile.async('text')); } catch { /* ignore */ }
  }

  const items: ExtensionItem[] = [];
  const svgFiles = zip.file(/\.svg$/i);

  for (const svgFile of svgFiles) {
    const rawSvg = await svgFile.async('text');
    const sanitized = DOMPurify.sanitize(rawSvg, { USE_PROFILES: { svg: true, svgFilters: true } });
    if (!sanitized.trim()) continue;

    const fileName = svgFile.name.split('/').pop()?.replace(/\.svg$/i, '') || 'item';
    const manifestItem = manifest?.items?.find((m) => m.file === svgFile.name || m.file === svgFile.name.split('/').pop());
    const id = manifestItem?.id || fileName.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
    const name = manifestItem?.name || fileName.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    items.push({
      id,
      name,
      svgContent: sanitized,
      viewBox: extractViewBox(sanitized),
      defaultWidth: 80,
      defaultHeight: 80,
    });
  }

  return {
    id: `custom-${packId}-${Date.now()}`,
    name: manifest?.name || file.name.replace(/\.zip$/i, ''),
    icon: manifest?.icon || '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 8v8M8 12h8"/></svg>',
    builtIn: false,
    items,
  };
}
