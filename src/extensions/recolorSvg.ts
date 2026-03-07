/**
 * Recolor an SVG string by replacing fill and stroke attributes on shape elements.
 * Elements with fill="none" or stroke="none" are left untouched.
 */
export function recolorSvg(
  svgContent: string,
  fillColor?: string,
  strokeColor?: string,
): string {
  if (!fillColor && !strokeColor) return svgContent;

  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, 'image/svg+xml');
  const shapeEls = doc.querySelectorAll('path, rect, circle, polygon, ellipse, line, polyline');

  for (const el of shapeEls) {
    if (fillColor) {
      const currentFill = el.getAttribute('fill');
      if (currentFill && currentFill !== 'none') {
        el.setAttribute('fill', fillColor);
      }
    }
    if (strokeColor) {
      const currentStroke = el.getAttribute('stroke');
      if (currentStroke && currentStroke !== 'none') {
        el.setAttribute('stroke', strokeColor);
      }
    }
  }

  const serializer = new XMLSerializer();
  return serializer.serializeToString(doc.documentElement);
}

/**
 * Extract the viewBox from an SVG string. Falls back to '0 0 64 64'.
 */
export function extractViewBox(svgContent: string): string {
  const match = svgContent.match(/viewBox=["']([^"']+)["']/);
  return match?.[1] || '0 0 64 64';
}
