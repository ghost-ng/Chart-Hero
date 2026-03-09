// ---------------------------------------------------------------------------
// CanvasBanner.tsx -- Top/bottom banner bars that push canvas content
//
// These render as flex siblings OUTSIDE <ReactFlow>, so they physically
// shrink the canvas area instead of overlaying it.
// ---------------------------------------------------------------------------

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useBannerStore, type BannerConfig } from '../../store/bannerStore';
import { useStyleStore } from '../../store/styleStore';
import { useUIStore } from '../../store/uiStore';

// ---------------------------------------------------------------------------
// Font options (subset for banner context menu)
// ---------------------------------------------------------------------------

const BANNER_FONTS = [
  { label: 'Inter', value: 'Inter, system-ui, sans-serif' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Calibri', value: "Calibri, 'Gill Sans', sans-serif" },
  { label: 'Segoe UI', value: "'Segoe UI', Tahoma, sans-serif" },
  { label: 'Georgia', value: "Georgia, 'Times New Roman', serif" },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Consolas', value: "Consolas, 'Courier New', monospace" },
  { label: 'Times New Roman', value: "'Times New Roman', Times, serif" },
];

// ---------------------------------------------------------------------------
// Quick color swatches
// ---------------------------------------------------------------------------

const COLOR_SWATCHES = [
  '#1e293b', '#0f172a', '#334155', '#475569',
  '#1e40af', '#1d4ed8', '#2563eb', '#3b82f6',
  '#047857', '#059669', '#10b981', '#34d399',
  '#b91c1c', '#dc2626', '#ef4444', '#f87171',
  '#7c3aed', '#8b5cf6', '#6366f1', '#818cf8',
  '#b45309', '#d97706', '#f59e0b', '#fbbf24',
  '#be185d', '#db2777', '#ec4899', '#f472b6',
  '#ffffff', '#f8fafc', '#e2e8f0', '#94a3b8',
];

const MIN_HEIGHT = 16;
const MAX_HEIGHT = 200;

// ---------------------------------------------------------------------------
// Banner Context Menu
// ---------------------------------------------------------------------------

interface BannerContextMenuProps {
  x: number;
  y: number;
  position: 'top' | 'bottom';
  onClose: () => void;
}

const BannerContextMenu: React.FC<BannerContextMenuProps> = ({
  x,
  y,
  position,
  onClose,
}) => {
  const darkMode = useStyleStore((s) => s.darkMode);
  const banner = useBannerStore((s) =>
    position === 'top' ? s.topBanner : s.bottomBanner,
  );
  const update = useBannerStore((s) =>
    position === 'top' ? s.updateTopBanner : s.updateBottomBanner,
  );
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Clamp to viewport — prefer opening upward (banners are near edges)
  const [style, setStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    top: y,
    left: x,
    zIndex: 9999,
  });

  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 8;
    const newLeft = rect.right > vw - pad ? Math.max(pad, vw - rect.width - pad) : x;
    // Prefer opening upward: if menu bottom overflows OR click is in bottom half, open above
    let newTop = y;
    if (rect.bottom > vh - pad) {
      newTop = Math.max(pad, y - rect.height);
    }
    if (newTop !== y || newLeft !== x) {
      setStyle({ position: 'fixed', top: newTop, left: newLeft, zIndex: 9999 });
    }
  }, [x, y]);

  return (
    <div
      ref={menuRef}
      style={style}
      className={`
        w-[340px] max-h-[70vh] overflow-y-auto rounded-lg shadow-xl border p-3 select-none
        ${darkMode ? 'bg-dk-panel border-dk-border' : 'bg-white border-slate-200'}
      `}
    >
      {/* Row 1: Label + Height side by side */}
      <div className="flex gap-3 mb-2">
        <div className="flex-1">
          <div className={`text-[10px] font-bold uppercase tracking-wider px-1 mb-1 ${darkMode ? 'text-dk-muted' : 'text-slate-500'}`}>
            Label
          </div>
          <input
            type="text"
            value={banner.label}
            onChange={(e) => update({ label: e.target.value })}
            placeholder="Banner text..."
            autoFocus
            className={`w-full text-xs px-2 py-1.5 rounded border ${
              darkMode
                ? 'bg-dk-input border-dk-border text-dk-text placeholder:text-dk-faint'
                : 'bg-white border-slate-200 text-slate-700 placeholder:text-slate-400'
            }`}
          />
        </div>
        <div className="w-24">
          <div className={`text-[10px] font-bold uppercase tracking-wider px-1 mb-1 ${darkMode ? 'text-dk-muted' : 'text-slate-500'}`}>
            Height
          </div>
          <div className="flex items-center gap-1">
            <input
              type="range"
              min={MIN_HEIGHT}
              max={MAX_HEIGHT}
              value={banner.height}
              onChange={(e) => update({ height: Number(e.target.value) })}
              className="flex-1 h-1 accent-primary cursor-pointer"
            />
            <span className={`text-[10px] tabular-nums w-7 text-right ${darkMode ? 'text-dk-muted' : 'text-slate-500'}`}>
              {banner.height}
            </span>
          </div>
        </div>
      </div>

      {/* Background Color — wide grid with scroll */}
      <div className={`text-[10px] font-bold uppercase tracking-wider px-1 mb-1 ${darkMode ? 'text-dk-muted' : 'text-slate-500'}`}>
        Background Color
      </div>
      <div className="flex flex-wrap gap-1 mb-2 px-1 max-h-16 overflow-y-auto">
        {COLOR_SWATCHES.map((c) => (
          <button
            key={c}
            onClick={() => update({ color: c })}
            className="w-5 h-5 rounded cursor-pointer transition-transform hover:scale-125 shrink-0"
            style={{
              backgroundColor: c,
              border: c === banner.color ? '2px solid #3b82f6' : '1px solid rgba(0,0,0,0.1)',
            }}
          />
        ))}
      </div>

      {/* Text Color + Font Size side by side */}
      <div className="flex gap-3 mb-2">
        <div className="flex-1">
          <div className={`text-[10px] font-bold uppercase tracking-wider px-1 mb-1 ${darkMode ? 'text-dk-muted' : 'text-slate-500'}`}>
            Text Color
          </div>
          <div className="flex gap-1 px-1">
            {['#ffffff', '#f1f5f9', '#1e293b', '#0f172a', '#ef4444', '#3b82f6', '#10b981', '#f59e0b'].map((c) => (
              <button
                key={c}
                onClick={() => update({ textColor: c })}
                className="w-5 h-5 rounded cursor-pointer transition-transform hover:scale-125"
                style={{
                  backgroundColor: c,
                  border: c === banner.textColor ? '2px solid #3b82f6' : '1px solid rgba(0,0,0,0.15)',
                }}
              />
            ))}
          </div>
        </div>
        <div className="w-[140px]">
          <div className={`text-[10px] font-bold uppercase tracking-wider px-1 mb-1 ${darkMode ? 'text-dk-muted' : 'text-slate-500'}`}>
            Font Size
          </div>
          <div className="flex gap-0.5 px-1">
            {[10, 12, 14, 16, 18, 20, 24].map((s) => (
              <button
                key={s}
                onClick={() => update({ fontSize: s })}
                className={`flex-1 text-[10px] px-0.5 py-0.5 rounded cursor-pointer transition-colors ${
                  banner.fontSize === s
                    ? 'bg-primary/10 text-primary font-medium'
                    : darkMode
                      ? 'hover:bg-dk-hover text-dk-muted'
                      : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Font Family — compact scrollable */}
      <div className={`text-[10px] font-bold uppercase tracking-wider px-1 mb-1 ${darkMode ? 'text-dk-muted' : 'text-slate-500'}`}>
        Font Family
      </div>
      <div className="flex flex-wrap gap-1 px-1">
        {BANNER_FONTS.map((f) => (
          <button
            key={f.value}
            onClick={() => update({ fontFamily: f.value })}
            className={`px-2 py-1 text-xs rounded cursor-pointer transition-colors ${
              banner.fontFamily === f.value
                ? 'bg-primary/10 text-primary font-medium'
                : darkMode
                  ? 'hover:bg-dk-hover text-dk-text'
                  : 'hover:bg-slate-100 text-slate-700'
            }`}
            style={{ fontFamily: f.value }}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// BannerBar -- a single top or bottom banner
// ---------------------------------------------------------------------------

export interface BannerBarProps {
  position: 'top' | 'bottom';
  config: BannerConfig;
}

export const BannerBar: React.FC<BannerBarProps> = ({ position, config }) => {
  const darkMode = useStyleStore((s) => s.darkMode);
  const presentationMode = useUIStore((s) => s.presentationMode);
  const update = useBannerStore((s) =>
    position === 'top' ? s.updateTopBanner : s.updateBottomBanner,
  );

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Resize drag state
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ y: number; height: number } | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      dragStartRef.current = { y: e.clientY, height: config.height };

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragStartRef.current) return;
        const delta = position === 'top'
          ? ev.clientY - dragStartRef.current.y
          : dragStartRef.current.y - ev.clientY;
        const newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, dragStartRef.current.height + delta));
        update({ height: newHeight });
      };

      const onMouseUp = () => {
        setIsDragging(false);
        dragStartRef.current = null;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [config.height, position, update],
  );

  // Lighten color slightly in dark mode for contrast
  const bgColor = darkMode && config.color === '#1e293b' ? '#334155' : config.color;

  return (
    <>
      <div
        onContextMenu={presentationMode ? undefined : handleContextMenu}
        style={{
          height: config.height,
          minHeight: MIN_HEIGHT,
          backgroundColor: bgColor,
          color: config.textColor,
          fontFamily: config.fontFamily,
          fontSize: config.fontSize,
          position: 'relative',
          userSelect: isDragging ? 'none' : undefined,
        }}
        className="flex items-center justify-center w-full shrink-0"
      >
        {config.label && (
          <span className="truncate px-4 font-medium">{config.label}</span>
        )}

        {/* Resize handle -- sits at the inner edge of the banner (bottom for top, top for bottom) */}
        {!presentationMode && <div
          data-export-ignore
          onMouseDown={handleResizeStart}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: 8,
            cursor: 'row-resize',
            ...(position === 'top' ? { bottom: 0 } : { top: 0 }),
            zIndex: 10,
          }}
          className="group"
        >
          {/* Visual indicator on hover */}
          <div
            className="absolute left-1/2 -translate-x-1/2 transition-opacity opacity-0 group-hover:opacity-100"
            style={{
              width: 40,
              height: 3,
              backgroundColor: 'rgba(59,130,246,0.6)',
              borderRadius: 2,
              ...(position === 'top' ? { bottom: 0 } : { top: 0 }),
            }}
          />
        </div>}
      </div>

      {/* Context menu (portal-like, fixed positioned) */}
      {!presentationMode && contextMenu && (
        <BannerContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          position={position}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
};

export default React.memo(BannerBar);
