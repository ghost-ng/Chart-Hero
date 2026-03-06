import React, { useEffect, useRef, useState } from 'react';
import { useMenuPosition, SubMenu } from './menuUtils';
import {
  Plus,
  ClipboardPaste,
  SquareMousePointer,
  Maximize,
  Rows3,
  Paintbrush,
  RotateCcw,
  Trash2,
} from 'lucide-react';

import { useStyleStore } from '../../store/styleStore';
import { useSwimlaneStore } from '../../store/swimlaneStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CanvasContextMenuProps {
  /** Pixel position of the menu (screen coords) */
  x: number;
  y: number;
  /** Close callback */
  onClose: () => void;
  /** Add a new node at the right-click position */
  onAddNode: () => void;
  /** Paste from clipboard (only shown if clipboard has content) */
  onPaste?: () => void;
  /** Select all nodes */
  onSelectAll: () => void;
  /** Fit the viewport to all nodes */
  onFitView: () => void;
  /** Open the swimlane creation dialog */
  onInsertSwimlanes: () => void;
  /** Whether paste should be enabled */
  canPaste?: boolean;
}

// ---------------------------------------------------------------------------
// Menu item
// ---------------------------------------------------------------------------

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  darkMode: boolean;
  hasSubmenu?: boolean;
  onMouseEnter?: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, onClick, disabled, darkMode, hasSubmenu, onMouseEnter }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      if (!disabled) onClick();
    }}
    onMouseEnter={onMouseEnter}
    disabled={disabled}
    className={`
      flex items-center gap-2.5 w-full px-3 py-1.5 text-left text-sm rounded
      transition-colors duration-75 cursor-pointer
      disabled:opacity-40 disabled:cursor-not-allowed
      ${darkMode
        ? 'hover:bg-dk-hover text-dk-text'
        : 'hover:bg-slate-100 text-slate-700'
      }
    `}
  >
    <span className="shrink-0 w-4 h-4 flex items-center justify-center text-slate-400 dark:text-dk-faint">
      {icon}
    </span>
    <span className="flex-1">{label}</span>
    {hasSubmenu && <span className="text-slate-400 dark:text-dk-faint text-xs ml-2">&rsaquo;</span>}
  </button>
);

const MenuDivider: React.FC<{ darkMode: boolean }> = ({ darkMode }) => (
  <div className={`my-1 h-px ${darkMode ? 'bg-dk-hover' : 'bg-slate-200'}`} />
);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CanvasContextMenu: React.FC<CanvasContextMenuProps> = ({
  x,
  y,
  onClose,
  onAddNode,
  onPaste,
  onSelectAll,
  onFitView,
  onInsertSwimlanes,
  canPaste = false,
}) => {
  const darkMode = useStyleStore((s) => s.darkMode);
  const canvasColorOverride = useStyleStore((s) => s.canvasColorOverride);
  const setCanvasColorOverride = useStyleStore((s) => s.setCanvasColorOverride);
  const hasLanes = useSwimlaneStore((s) => s.config.horizontal.length > 0 || s.config.vertical.length > 0);
  const menuRef = useRef<HTMLDivElement>(null);
  const [showCanvasColorSub, setShowCanvasColorSub] = useState(false);
  const canvasColorItemRef = useRef<HTMLDivElement>(null);

  // Close on click-outside or Escape
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

  const menuStyle = useMenuPosition(x, y, menuRef);

  return (
    <div
      ref={menuRef}
      style={menuStyle}
      className={`
        min-w-[180px] rounded-lg shadow-xl border p-1
        ${darkMode
          ? 'bg-dk-panel border-dk-border'
          : 'bg-white border-slate-200'
        }
      `}
    >
      <MenuItem
        icon={<Plus size={14} />}
        label="Add Node Here"
        onClick={() => { onAddNode(); onClose(); }}
        darkMode={darkMode}
      />
      <MenuItem
        icon={<ClipboardPaste size={14} />}
        label="Paste"
        onClick={() => { onPaste?.(); onClose(); }}
        disabled={!canPaste}
        darkMode={darkMode}
      />
      <MenuItem
        icon={<SquareMousePointer size={14} />}
        label="Select All"
        onClick={() => { onSelectAll(); onClose(); }}
        darkMode={darkMode}
      />
      <MenuItem
        icon={<Maximize size={14} />}
        label="Fit View"
        onClick={() => { onFitView(); onClose(); }}
        darkMode={darkMode}
      />

      <MenuDivider darkMode={darkMode} />

      <MenuItem
        icon={<Rows3 size={14} />}
        label="Insert Swimlanes"
        onClick={() => { onInsertSwimlanes(); onClose(); }}
        darkMode={darkMode}
      />
      {hasLanes && (
        <MenuItem
          icon={<Trash2 size={14} />}
          label="Delete Swimlanes"
          onClick={() => { useSwimlaneStore.getState().clearAllLanes(); onClose(); }}
          darkMode={darkMode}
        />
      )}

      <MenuDivider darkMode={darkMode} />

      <div ref={canvasColorItemRef} className="relative" onMouseEnter={() => setShowCanvasColorSub(true)} onMouseLeave={() => setShowCanvasColorSub(false)}>
        <MenuItem
          icon={<Paintbrush size={14} />}
          label="Canvas Color"
          onClick={() => setShowCanvasColorSub(!showCanvasColorSub)}
          darkMode={darkMode}
          hasSubmenu
        />
        {showCanvasColorSub && (
          <SubMenu darkMode={darkMode} className="p-1 min-w-[160px]">
            <button
              onClick={() => { setCanvasColorOverride(null); onClose(); }}
              className={`flex items-center gap-2 w-full px-3 py-1.5 text-left text-sm rounded cursor-pointer ${
                darkMode ? 'hover:bg-dk-hover text-dk-text' : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <RotateCcw size={12} className="text-slate-400" />
              Reset to Theme
            </button>
            <div className="px-3 py-1.5" onMouseDown={(e) => e.stopPropagation()}>
              <input
                type="color"
                value={canvasColorOverride || '#ffffff'}
                onChange={(e) => setCanvasColorOverride(e.target.value)}
                className="w-full h-8 rounded border border-slate-200 dark:border-dk-border cursor-pointer"
              />
            </div>
          </SubMenu>
        )}
      </div>
    </div>
  );
};

export default React.memo(CanvasContextMenu);
