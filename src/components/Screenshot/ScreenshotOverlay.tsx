// ---------------------------------------------------------------------------
// ScreenshotOverlay.tsx -- Drag-to-select region screenshot tool
// ---------------------------------------------------------------------------

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useUIStore } from '../../store/uiStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ScreenshotOverlay: React.FC = () => {
  const screenshotMode = useUIStore((s) => s.screenshotMode);
  const setScreenshotMode = useUIStore((s) => s.setScreenshotMode);

  const overlayRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);

  // Escape to cancel
  useEffect(() => {
    if (!screenshotMode) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setScreenshotMode(false);
        setDragging(false);
        setStart(null);
        setRect(null);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [screenshotMode, setScreenshotMode]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setStart({ x: e.clientX, y: e.clientY });
    setRect(null);
    setDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !start) return;
      const x = Math.min(start.x, e.clientX);
      const y = Math.min(start.y, e.clientY);
      const w = Math.abs(e.clientX - start.x);
      const h = Math.abs(e.clientY - start.y);
      setRect({ x, y, w, h });
    },
    [dragging, start],
  );

  const handleMouseUp = useCallback(async () => {
    if (!dragging || !rect || rect.w < 10 || rect.h < 10) {
      // Too small or no drag — cancel
      setDragging(false);
      setStart(null);
      setRect(null);
      return;
    }

    setDragging(false);
    setStart(null);

    // Capture the selection
    const selectionRect = { ...rect };
    setRect(null);
    setScreenshotMode(false);

    try {
      // Small delay to let the overlay unmount so it's not in the capture
      await new Promise((r) => setTimeout(r, 50));

      const { toPng } = await import('html-to-image');

      // Capture the canvas wrapper (includes swimlane layer + ReactFlow viewport)
      const element = document.querySelector<HTMLElement>('[data-charthero-canvas-area]')
        ?? document.querySelector<HTMLElement>('.react-flow');
      if (!element) throw new Error('Could not find canvas element');

      // Get the container's bounding rect to convert screen coords to element coords
      const containerRect = element.getBoundingClientRect();

      // Hide gridlines during capture (they should not appear in screenshots)
      const gridEl = document.querySelector<HTMLElement>('.react-flow__background');
      const prevGridDisplay = gridEl?.style.display ?? '';
      if (gridEl) gridEl.style.display = 'none';

      // Also hide panels (zoom controls, attribution), minimap, and UI-only elements
      const hiddenEls: { el: HTMLElement; prev: string }[] = [];
      const hideEl = (el: HTMLElement | null) => {
        if (!el) return;
        hiddenEls.push({ el, prev: el.style.display });
        el.style.display = 'none';
      };
      document.querySelectorAll<HTMLElement>('.react-flow__panel').forEach(hideEl);
      hideEl(document.querySelector<HTMLElement>('.react-flow__minimap'));
      document.querySelectorAll<HTMLElement>('[data-export-ignore]').forEach(hideEl);

      // Use device pixel ratio for 1:1 screen-accurate capture
      const pixelRatio = window.devicePixelRatio || 1;

      // Capture the full viewport at high resolution
      let dataUrl: string;
      try {
        dataUrl = await toPng(element, {
          pixelRatio,
          backgroundColor: '#ffffff',
        });
      } finally {
        // Restore grid visibility
        if (gridEl) gridEl.style.display = prevGridDisplay;
        // Restore panels / minimap
        for (const { el, prev } of hiddenEls) el.style.display = prev;
      }

      // Load the image and crop to the selected region
      const img = new Image();
      img.src = dataUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load captured image'));
      });

      // Convert screen selection coordinates to element-relative coordinates
      const cropX = (selectionRect.x - containerRect.left) * pixelRatio;
      const cropY = (selectionRect.y - containerRect.top) * pixelRatio;
      const cropW = selectionRect.w * pixelRatio;
      const cropH = selectionRect.h * pixelRatio;

      // Create a canvas and draw only the cropped region
      const canvas = document.createElement('canvas');
      canvas.width = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      // Convert to blob and copy to clipboard
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Failed to create blob'))),
          'image/png',
        );
      });

      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);

      useUIStore.getState().showToast('Screenshot copied to clipboard', 'success');
    } catch (_e) {
      useUIStore.getState().showToast('Failed to capture screenshot', 'error');
    }
  }, [dragging, rect, setScreenshotMode]);

  if (!screenshotMode) return null;

  return (
    <div
      ref={overlayRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="fixed inset-0"
      style={{
        zIndex: 99999,
        cursor: 'crosshair',
        backgroundColor: dragging ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.05)',
      }}
    >
      {/* Selection rectangle */}
      {rect && rect.w > 0 && rect.h > 0 && (
        <>
          {/* Clear region (the selected area) */}
          <div
            className="absolute border-2 border-blue-500"
            style={{
              left: rect.x,
              top: rect.y,
              width: rect.w,
              height: rect.h,
              backgroundColor: 'rgba(59, 130, 246, 0.08)',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.25)',
            }}
          />
          {/* Dimensions label */}
          <div
            className="absolute px-2 py-0.5 bg-blue-500 text-white text-xs rounded font-mono pointer-events-none"
            style={{
              left: rect.x + rect.w / 2,
              top: rect.y + rect.h + 8,
              transform: 'translateX(-50%)',
            }}
          >
            {Math.round(rect.w)} &times; {Math.round(rect.h)}
          </div>
        </>
      )}

      {/* Instructions */}
      {!dragging && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/70 text-white text-sm rounded-lg pointer-events-none">
          Drag to select area &middot; Press <kbd className="px-1 py-0.5 bg-white/20 rounded text-xs">Esc</kbd> to cancel
        </div>
      )}
    </div>
  );
};

export default React.memo(ScreenshotOverlay);
