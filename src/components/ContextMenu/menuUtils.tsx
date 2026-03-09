// ---------------------------------------------------------------------------
// menuUtils.tsx -- Shared context-menu overflow utilities
//
// useMenuPosition: hook that clamps a fixed-position menu to the viewport
// SubMenu: wrapper that auto-flips submenus when they overflow the viewport
// ---------------------------------------------------------------------------

import React, { useLayoutEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { PaintBucket, SquareDashed, RotateCcw } from 'lucide-react';

const PAD = 8;

// ---------------------------------------------------------------------------
// useMenuPosition
// ---------------------------------------------------------------------------

/**
 * Hook that adjusts a fixed-position menu to stay within viewport bounds.
 * Measures actual rendered size via useLayoutEffect (no flicker).
 */
export function useMenuPosition(
  x: number,
  y: number,
  menuRef: React.RefObject<HTMLDivElement | null>,
): React.CSSProperties {
  const [style, setStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    top: y,
    left: x,
    zIndex: 9999,
  });

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const newLeft = rect.right > vw - PAD ? Math.max(PAD, vw - rect.width - PAD) : x;
    const newTop = rect.bottom > vh - PAD ? Math.max(PAD, vh - rect.height - PAD) : y;

    if (newTop !== y || newLeft !== x) {
      setStyle({ position: 'fixed', top: newTop, left: newLeft, zIndex: 9999 });
    }
  }, [x, y]);

  return style;
}

// ---------------------------------------------------------------------------
// SubMenu
// ---------------------------------------------------------------------------

/**
 * Submenu wrapper that auto-detects viewport overflow and flips horizontally
 * and/or vertically to stay fully visible.
 */
export const SubMenu: React.FC<{
  darkMode: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ darkMode, className = '', style: styleProp, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [flipV, setFlipV] = useState(false);
  const [flipH, setFlipH] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const needFlipV = rect.bottom > window.innerHeight - PAD;
    const needFlipH = rect.right > window.innerWidth - PAD;
    if (needFlipV || needFlipH) {
      setFlipV(needFlipV);
      setFlipH(needFlipH);
    }
  }, []);

  return (
    <div
      ref={ref}
      style={styleProp}
      className={`
        absolute ${flipV ? 'bottom-0' : 'top-0'} ${flipH ? 'right-full mr-1' : 'left-full ml-1'}
        rounded-lg shadow-xl border
        ${darkMode ? 'bg-dk-panel border-dk-border' : 'bg-white border-slate-200'}
        ${className}
      `}
    >
      {/* Invisible bridge covering the gap between parent menu and this submenu */}
      <div
        className={`absolute top-0 bottom-0 ${flipH ? 'left-full' : 'right-full'} w-3`}
        style={{ pointerEvents: 'auto' }}
      />
      {children}
    </div>
  );
};

// ---------------------------------------------------------------------------
// ColorSwatchSidebar
// ---------------------------------------------------------------------------

/**
 * Floating color swatch grid that sits beside a context menu.
 * Automatically positions to the left of the menu, or to the right
 * if there isn't enough space on the left.
 */
export const ColorSwatchSidebar: React.FC<{
  darkMode: boolean;
  menuRef: React.RefObject<HTMLDivElement | null>;
  colors: string[];
  onSelectColor: (color: string) => void;
  /** Optional second column callback (e.g. border color) */
  onSelectColor2?: (color: string) => void;
  /** Fill opacity 0-1, shown as vertical slider on left edge */
  fillOpacity?: number;
  onFillOpacityChange?: (v: number) => void;
  /** Border opacity 0-1, shown as vertical slider on right edge */
  borderOpacity?: number;
  onBorderOpacityChange?: (v: number) => void;
  /** Reset fill color to theme default */
  onResetFill?: () => void;
  /** Reset border color to theme default */
  onResetBorder?: () => void;
}> = ({ darkMode, menuRef, colors, onSelectColor, onSelectColor2, fillOpacity, onFillOpacityChange, borderOpacity, onBorderOpacityChange, onResetFill, onResetBorder }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const compute = useCallback(() => {
    const menu = menuRef.current;
    const panel = panelRef.current;
    if (!menu || !panel) return;
    const menuRect = menu.getBoundingClientRect();
    const panelW = panel.offsetWidth;
    const gap = 6;

    // Default: left of menu
    let left = menuRect.left - panelW - gap;
    // If overflows left edge, place to the right
    if (left < PAD) {
      left = menuRect.right + gap;
    }
    // If right side also overflows, fall back to left edge
    if (left + panelW > window.innerWidth - PAD) {
      left = PAD;
    }

    let top = menuRect.top;
    if (top + panel.offsetHeight > window.innerHeight - PAD) {
      top = window.innerHeight - panel.offsetHeight - PAD;
    }
    setPos({ top, left });
  }, [menuRef]);

  // Use requestAnimationFrame to ensure menu is positioned before we measure
  useLayoutEffect(() => {
    requestAnimationFrame(compute);
  }, [compute]);

  return createPortal(
    <div
      ref={panelRef}
      data-color-sidebar
      style={{
        position: 'fixed',
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        zIndex: 10000,
        opacity: pos ? 1 : 0,
        transition: 'opacity 0.1s',
      }}
      className={`rounded-lg shadow-lg border p-2 ${
        darkMode ? 'bg-dk-panel border-dk-border' : 'bg-white border-slate-200'
      }`}
    >
      {onSelectColor2 ? (
        <div className="flex items-start gap-1">
          {/* Fill opacity slider */}
          {onFillOpacityChange && (
            <div className="flex flex-col items-center" style={{ paddingTop: 24 }} data-tooltip="Fill Opacity">
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round((fillOpacity ?? 1) * 100)}
                onChange={(e) => { e.stopPropagation(); onFillOpacityChange(Number(e.target.value) / 100); }}
                className="accent-primary cursor-pointer"
                style={{
                  writingMode: 'vertical-lr',
                  direction: 'rtl',
                  width: 14,
                  height: colors.length * 24 - 4,
                }}
              />
            </div>
          )}
          {/* Fill column */}
          <div className="flex flex-col items-center gap-1">
            <span className={`flex items-center justify-center w-5 h-5 ${darkMode ? 'text-dk-faint' : 'text-slate-400'}`} data-tooltip="Fill Color">
              <PaintBucket size={11} />
            </span>
            {colors.map((color) => (
              <button
                key={`fill-${color}`}
                onClick={(e) => { e.stopPropagation(); onSelectColor(color); }}
                className="w-5 h-5 rounded border border-black/10 hover:scale-125 transition-transform cursor-pointer"
                style={{ backgroundColor: color }}
              />
            ))}
            {onResetFill && (
              <button
                onClick={(e) => { e.stopPropagation(); onResetFill(); }}
                className={`flex items-center justify-center w-5 h-5 rounded cursor-pointer transition-colors ${darkMode ? 'text-dk-faint hover:text-dk-text hover:bg-dk-hover' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                data-tooltip="Reset Fill"
              >
                <RotateCcw size={10} />
              </button>
            )}
          </div>
          {/* Border column */}
          <div className="flex flex-col items-center gap-1">
            <span className={`flex items-center justify-center w-5 h-5 ${darkMode ? 'text-dk-faint' : 'text-slate-400'}`} data-tooltip="Border Color">
              <SquareDashed size={11} />
            </span>
            {colors.map((color) => (
              <button
                key={`border-${color}`}
                onClick={(e) => { e.stopPropagation(); onSelectColor2(color); }}
                className="w-5 h-5 rounded border border-black/10 hover:scale-125 transition-transform cursor-pointer"
                style={{ backgroundColor: color }}
              />
            ))}
            {onResetBorder && (
              <button
                onClick={(e) => { e.stopPropagation(); onResetBorder(); }}
                className={`flex items-center justify-center w-5 h-5 rounded cursor-pointer transition-colors ${darkMode ? 'text-dk-faint hover:text-dk-text hover:bg-dk-hover' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                data-tooltip="Reset Border"
              >
                <RotateCcw size={10} />
              </button>
            )}
          </div>
          {/* Border opacity slider */}
          {onBorderOpacityChange && (
            <div className="flex flex-col items-center" style={{ paddingTop: 24 }} data-tooltip="Border Opacity">
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round((borderOpacity ?? 1) * 100)}
                onChange={(e) => { e.stopPropagation(); onBorderOpacityChange(Number(e.target.value) / 100); }}
                className="accent-primary cursor-pointer"
                style={{
                  writingMode: 'vertical-lr',
                  direction: 'rtl',
                  width: 14,
                  height: colors.length * 24 - 4,
                }}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {colors.map((color) => (
            <button
              key={color}
              onClick={(e) => {
                e.stopPropagation();
                onSelectColor(color);
              }}
              className="w-5 h-5 rounded border border-black/10 hover:scale-125 transition-transform cursor-pointer"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
};
