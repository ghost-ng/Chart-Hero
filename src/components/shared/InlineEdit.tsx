// ---------------------------------------------------------------------------
// InlineEdit — Shared inline text editing component
//
// Used by GenericShapeNode, GroupNode, EdgeLabel, LaneHeader, and BaseNode
// to provide consistent double-click-to-edit behavior across the canvas.
// ---------------------------------------------------------------------------

import React, { useCallback, useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InlineEditProps {
  /** Current label value */
  value: string;
  /** Called with the trimmed new value when the user commits (Enter / blur) */
  onCommit: (value: string) => void;
  /** Called when the user cancels editing (Escape) */
  onCancel: () => void;
  /** If true, renders a <textarea> that supports Shift+Enter newlines.
   *  If false (default), renders an <input type="text">. */
  multiline?: boolean;
  /** Screen coordinates of the double-click that triggered editing.
   *  When provided, the caret is placed near the click position instead of
   *  selecting all text. Only meaningful for multiline (textarea). */
  clickPosition?: { x: number; y: number } | null;
  /** Text color */
  color?: string;
  /** Font size in px */
  fontSize?: number;
  /** Font weight */
  fontWeight?: string | number;
  /** Font family */
  fontFamily?: string;
  /** Text alignment (default: 'center') */
  textAlign?: 'left' | 'center' | 'right';
  /** Extra inline styles merged onto the input/textarea */
  style?: React.CSSProperties;
  /** Extra CSS class names (nodrag nopan is always included) */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const InlineEdit: React.FC<InlineEditProps> = ({
  value,
  onCommit,
  onCancel,
  multiline = false,
  clickPosition = null,
  color,
  fontSize,
  fontWeight,
  fontFamily,
  textAlign = 'center',
  style: extraStyle,
  className: extraClass,
}) => {
  const [editValue, setEditValue] = useState(value);
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  // Focus & cursor placement on mount
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();

    if (multiline && clickPosition && typeof document.caretRangeFromPoint === 'function') {
      // Place caret near the click position (textarea only)
      requestAnimationFrame(() => {
        const range = document.caretRangeFromPoint(clickPosition.x, clickPosition.y);
        if (range && el.contains(range.startContainer)) {
          (el as HTMLTextAreaElement).setSelectionRange(range.startOffset, range.startOffset);
        } else {
          (el as HTMLTextAreaElement).setSelectionRange(el.value.length, el.value.length);
        }
      });
    } else {
      el.select();
    }

    // Auto-size textarea
    if (multiline) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const commit = useCallback(() => {
    onCommit(editValue.trim());
  }, [editValue, onCommit]);

  const cancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Always stop propagation so canvas shortcuts (Delete, arrow keys, etc.) don't fire
      e.stopPropagation();

      if (e.key === 'Enter') {
        if (multiline && e.shiftKey) {
          // Shift+Enter inserts a newline in textarea — let it through
          return;
        }
        e.preventDefault();
        commit();
      } else if (e.key === 'Escape') {
        cancel();
      }
    },
    [multiline, commit, cancel],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      setEditValue(e.target.value);
      // Auto-resize textarea height
      if (multiline) {
        const ta = e.target;
        ta.style.height = 'auto';
        ta.style.height = `${ta.scrollHeight}px`;
      }
    },
    [multiline],
  );

  // Shared style
  const baseStyle: React.CSSProperties = {
    color,
    fontSize,
    fontWeight,
    fontFamily,
    textAlign,
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
    padding: 0,
    margin: 0,
    ...extraStyle,
  };

  const cls = `nodrag nopan ${extraClass || ''}`.trim();

  if (multiline) {
    return (
      <textarea
        ref={ref as React.RefObject<HTMLTextAreaElement>}
        className={cls}
        style={{
          ...baseStyle,
          lineHeight: 1.3,
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          whiteSpace: 'pre-wrap',
          overflow: 'hidden',
          minHeight: '1.3em',
          resize: 'none',
          width: '100%',
        }}
        value={editValue}
        rows={Math.max(1, (editValue || '').split('\n').length)}
        onChange={handleChange}
        onBlur={commit}
        onKeyDown={handleKeyDown}
      />
    );
  }

  return (
    <input
      ref={ref as React.RefObject<HTMLInputElement>}
      className={cls}
      type="text"
      style={baseStyle}
      value={editValue}
      onChange={handleChange}
      onBlur={commit}
      onKeyDown={handleKeyDown}
    />
  );
};

export default React.memo(InlineEdit);
