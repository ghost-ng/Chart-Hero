import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Settings, Minus, X, Send, Square, Sparkles, ImagePlus } from 'lucide-react';
import { useAIStore } from '@/store/aiStore';
import type { AIToolCall, AIToolResult, AIImageAttachment } from '@/store/aiStore';
import { useStyleStore } from '@/store/styleStore';
import { sendMessage } from '@/lib/ai/client';
import { TOOL_DEFINITIONS } from '@/lib/ai/tools';
import { getFullSystemPrompt } from '@/lib/ai/prompts';
import { executeTool } from '@/lib/ai/toolExecutor';
import ChatMessage from './ChatMessage';
import AISettingsDialog from './AISettingsDialog';
import { generateId } from '@/utils/idGenerator';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_TOOL_ROUNDS = 10;
const DEFAULT_WIDTH = 400;
const DEFAULT_HEIGHT = 500;
const MIN_WIDTH = 320;
const MIN_HEIGHT = 350;

// Persisted across close/open cycles (survives component unmount)
let savedPosition: { x: number; y: number } | null = null;
let savedSize: { width: number; height: number } | null = null;

// ---------------------------------------------------------------------------
// AIChatPanel
// ---------------------------------------------------------------------------

const AIChatPanel: React.FC = () => {
  const darkMode = useStyleStore((s) => s.darkMode);
  const isPanelOpen = useAIStore((s) => s.isPanelOpen);
  const isStreaming = useAIStore((s) => s.isStreaming);
  const messages = useAIStore((s) => s.messages);
  const error = useAIStore((s) => s.error);
  const apiKey = useAIStore((s) => s.apiKey);
  const isSettingsOpen = useAIStore((s) => s.isSettingsOpen);

  // Input state
  const [input, setInput] = useState('');
  const [pendingImages, setPendingImages] = useState<AIImageAttachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Streaming state
  const abortControllerRef = useRef<AbortController | null>(null);
  const roundRef = useRef(0);

  // Position & size — restore from module-level cache, or default to bottom-right
  const [position, setPosition] = useState(() => {
    if (savedPosition) return savedPosition;
    return {
      x: Math.max(0, window.innerWidth - DEFAULT_WIDTH - 16),
      y: Math.max(0, window.innerHeight - DEFAULT_HEIGHT - 16),
    };
  });
  const [size, setSize] = useState(() => savedSize ?? { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });

  // Persist position & size so they survive close/reopen (unmount/remount)
  useEffect(() => { savedPosition = position; }, [position]);
  useEffect(() => { savedSize = size; }, [size]);

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Resizing state — tracks which edges are being dragged
  type ResizeDir = '' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
  const [isResizing, setIsResizing] = useState(false);
  const resizeDir = useRef<ResizeDir>('');
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0, px: 0, py: 0 });

  // Load API key on mount
  useEffect(() => {
    useAIStore.getState().loadApiKey();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const maxHeight = 4 * 24; // ~4 rows
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, [input]);

  // Cleanup: abort on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // -------------------------------------------------------------------------
  // Dragging
  // -------------------------------------------------------------------------

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    // Only left button, and not on interactive elements
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('textarea')) return;

    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    e.preventDefault();
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      let newX = e.clientX - dragOffset.current.x;
      let newY = e.clientY - dragOffset.current.y;

      // Clamp: keep at least 40px visible on each edge, ensure header never clips at top
      newX = Math.max(-size.width + 80, Math.min(newX, window.innerWidth - 80));
      newY = Math.max(0, Math.min(newY, window.innerHeight - 40));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, size]);

  // Re-clamp position when window resizes or panel re-opens (prevents header cutoff)
  useEffect(() => {
    const clamp = () => {
      setPosition((prev) => ({
        x: Math.max(-size.width + 80, Math.min(prev.x, window.innerWidth - 80)),
        y: Math.max(0, Math.min(prev.y, window.innerHeight - 40)),
      }));
    };
    // Clamp immediately on mount (handles stale savedPosition after close/reopen)
    clamp();
    window.addEventListener('resize', clamp);
    return () => window.removeEventListener('resize', clamp);
  }, [size.width]);

  // -------------------------------------------------------------------------
  // Resizing
  // -------------------------------------------------------------------------

  const handleResizeStart = useCallback((dir: ResizeDir) => (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    resizeDir.current = dir;
    setIsResizing(true);
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      w: size.width,
      h: size.height,
      px: position.x,
      py: position.y,
    };
    e.preventDefault();
    e.stopPropagation();
  }, [size, position]);

  useEffect(() => {
    if (!isResizing) return;
    const dir = resizeDir.current;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - resizeStart.current.x;
      const dy = e.clientY - resizeStart.current.y;
      const { w: origW, h: origH, px: origX, py: origY } = resizeStart.current;

      let newW = origW;
      let newH = origH;
      let newX = origX;
      let newY = origY;

      // East (right edge): grow width
      if (dir.includes('e')) {
        newW = Math.max(MIN_WIDTH, origW + dx);
      }
      // West (left edge): grow width + shift position left
      if (dir.includes('w')) {
        const dw = Math.min(dx, origW - MIN_WIDTH); // limit shrink
        newW = origW - dw;
        newX = origX + dw;
      }
      // South (bottom edge): grow height
      if (dir.includes('s')) {
        newH = Math.max(MIN_HEIGHT, origH + dy);
      }
      // North (top edge): grow height + shift position up
      if (dir === 'n' || dir === 'nw' || dir === 'ne') {
        const dh = Math.min(dy, origH - MIN_HEIGHT);
        newH = origH - dh;
        newY = origY + dh;
      }

      // Clamp to viewport (keep 2px margin at top to avoid header clipping)
      if (newX < 0) { newW += newX; newX = 0; }
      if (newY < 0) { newH += newY; newY = 0; }
      newW = Math.min(newW, window.innerWidth - newX);
      newH = Math.min(newH, window.innerHeight - newY);

      setSize({ width: Math.max(MIN_WIDTH, newW), height: Math.max(MIN_HEIGHT, newH) });
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeDir.current = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // -------------------------------------------------------------------------
  // Core message loop
  // -------------------------------------------------------------------------

  const processStream = useCallback(async (signal: AbortSignal) => {
    const state = useAIStore.getState();
    const systemPrompt = getFullSystemPrompt();

    const stream = sendMessage({
      provider: state.provider,
      apiKey: state.apiKey,
      endpoint: state.endpoint,
      model: state.model,
      messages: state.messages.slice(0, -1), // Exclude placeholder assistant message
      systemPrompt,
      tools: TOOL_DEFINITIONS,
      signal,
    });

    const pendingToolCalls = new Map<string, { name: string; argsJson: string }>();
    for await (const event of stream) {
      switch (event.type) {
        case 'text':
          useAIStore.getState().appendToLastMessage(event.text);
          break;
        case 'tool_call_start':
          pendingToolCalls.set(event.id, { name: event.name, argsJson: '' });
          break;
        case 'tool_call_delta': {
          const tc = pendingToolCalls.get(event.id);
          if (tc) tc.argsJson += event.argsChunk;
          break;
        }
        case 'tool_call_end':
          break; // Args fully accumulated
        case 'done':
          break;
        case 'error':
          useAIStore.getState().setError(event.message);
          useAIStore.getState().setStreaming(false);
          return;
      }
    }

    // If tool calls were made, execute them
    if (pendingToolCalls.size > 0) {
      const toolCalls: AIToolCall[] = [];
      const toolResults: AIToolResult[] = [];

      for (const [id, { name, argsJson }] of pendingToolCalls) {
        let args: Record<string, unknown>;
        try {
          args = JSON.parse(argsJson);
        } catch {
          toolResults.push({ toolCallId: id, result: 'Error: Invalid JSON in tool arguments', success: false });
          toolCalls.push({ id, name, args: {} });
          continue;
        }
        toolCalls.push({ id, name, args });
        const result = await executeTool(name, args);
        toolResults.push({ toolCallId: id, toolName: name, result: result.result, success: result.success });
      }

      // Update assistant message with tool calls
      useAIStore.getState().updateLastMessage({ toolCalls });

      // Add tool result message
      useAIStore.getState().addMessage({
        role: 'tool',
        content: toolResults.map((r) => r.result).join('\n'),
        toolResults,
      });

      // Add new placeholder for continuation
      useAIStore.getState().addMessage({ role: 'assistant', content: '' });

      // Recursively continue (with MAX_ROUNDS limit)
      roundRef.current++;
      if (roundRef.current < MAX_TOOL_ROUNDS) {
        await processStream(signal);
      } else {
        useAIStore.getState().appendToLastMessage('(Reached maximum tool call rounds)');
      }
    }
    // If no tool calls, the response is complete (text already streamed)
  }, []);

  const handleSend = useCallback(async (userText: string) => {
    const trimmed = userText.trim();
    const images = pendingImages.length > 0 ? [...pendingImages] : undefined;
    if (!trimmed && !images) return;

    const store = useAIStore.getState();
    if (!store.apiKey) {
      useAIStore.getState().setSettingsOpen(true);
      return;
    }

    // 1. Add user message (with optional images)
    store.addMessage({ role: 'user', content: trimmed, images });
    setPendingImages([]);
    store.setStreaming(true);
    store.setError(null);

    // 2. Add placeholder assistant message
    store.addMessage({ role: 'assistant', content: '' });

    // Create AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;
    roundRef.current = 0;

    try {
      await processStream(controller.signal);
    } catch (err) {
      // Abort errors are not real errors
      if (err instanceof DOMException && err.name === 'AbortError') {
        // Streaming was stopped by user
      } else {
        useAIStore.getState().setError(err instanceof Error ? err.message : 'Unknown error');
      }
    } finally {
      useAIStore.getState().setStreaming(false);
      abortControllerRef.current = null;
    }
  }, [processStream, pendingImages]);

  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const canSend = input.trim() || pendingImages.length > 0;

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && canSend) {
        const text = input;
        setInput('');
        handleSend(text);
      }
    }
  }, [isStreaming, input, canSend, handleSend]);

  const handleSubmit = useCallback(() => {
    if (!isStreaming && canSend) {
      const text = input;
      setInput('');
      handleSend(text);
    }
  }, [isStreaming, input, canSend, handleSend]);

  // Image paste handler — reads clipboard image items as base64
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter((i) => i.type.startsWith('image/'));
    if (imageItems.length === 0) return; // let normal text paste through
    e.preventDefault();
    for (const item of imageItems) {
      const file = item.getAsFile();
      if (!file) continue;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1];
        setPendingImages((prev) => [
          ...prev,
          { id: generateId('img'), base64, mimeType: file.type },
        ]);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // File input handler (for the attach button)
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1];
        setPendingImages((prev) => [
          ...prev,
          { id: generateId('img'), base64, mimeType: file.type },
        ]);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = ''; // reset so same file can be re-selected
  }, []);

  // Re-validate position whenever the panel opens
  useEffect(() => {
    if (isPanelOpen) {
      setPosition((prev) => ({
        x: Math.max(-size.width + 80, Math.min(prev.x, window.innerWidth - 80)),
        y: Math.max(2, Math.min(prev.y, window.innerHeight - 40)),
      }));
    }
  }, [isPanelOpen, size.width]);

  // Don't render when closed
  if (!isPanelOpen) return null;

  const hasMessages = messages.length > 0;

  // Render via portal to document.body so the panel is never clipped by
  // ancestor overflow-hidden or stacking context issues.
  // Wrap in a dark-mode-aware container so Tailwind dark: classes work.
  return createPortal(
    <div className={darkMode ? 'dark' : ''}>
      {/* Settings dialog */}
      <AISettingsDialog
        open={isSettingsOpen}
        onClose={() => useAIStore.getState().setSettingsOpen(false)}
      />

      {/* Chat panel */}
      <div
        className={`
          fixed z-[999] flex flex-col rounded-xl border-2 overflow-hidden
          shadow-[0_4px_24px_rgba(0,0,0,0.15),0_-2px_8px_rgba(0,0,0,0.05)]
          ${darkMode
            ? 'bg-dk-panel border-dk-border'
            : 'bg-white border-slate-300'
          }
          ${isDragging || isResizing ? 'select-none' : ''}
        `}
        style={{
          left: position.x,
          top: Math.max(0, position.y),
          width: size.width,
          height: size.height,
        }}
      >
        {/* Header — draggable */}
        <div
          className={`
            flex items-center justify-between px-3 py-2.5 min-h-10 border-b shrink-0 rounded-t-xl
            ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
            ${darkMode ? 'border-dk-border bg-dk-panel' : 'border-slate-200 bg-slate-50'}
          `}
          onMouseDown={handleDragStart}
        >
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-blue-500" />
            <span className={`text-sm font-semibold ${darkMode ? 'text-dk-text' : 'text-slate-800'}`}>
              AI Assistant
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => useAIStore.getState().setSettingsOpen(true)}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${darkMode ? 'hover:bg-dk-hover text-dk-muted' : 'hover:bg-slate-200 text-slate-500'}`}
              data-tooltip="Settings"
            >
              <Settings size={15} />
            </button>
            <button
              onClick={() => useAIStore.getState().setPanelOpen(false)}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${darkMode ? 'hover:bg-dk-hover text-dk-muted' : 'hover:bg-slate-200 text-slate-500'}`}
              data-tooltip="Minimize"
            >
              <Minus size={15} />
            </button>
            <button
              onClick={() => useAIStore.getState().setPanelOpen(false)}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${darkMode ? 'hover:bg-dk-hover text-dk-muted' : 'hover:bg-slate-200 text-slate-500'}`}
              data-tooltip="Close"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto min-h-0 py-2 panel-scroll">
          {!hasMessages ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full px-6 text-center">
              <Sparkles size={32} className={`mb-3 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
              <h3 className={`text-base font-semibold mb-1 ${darkMode ? 'text-dk-text' : 'text-slate-800'}`}>
                Chart Hero AI
              </h3>
              <p className={`text-sm mb-4 ${darkMode ? 'text-dk-muted' : 'text-slate-500'}`}>
                How can I help with your diagram?
              </p>
              <div className={`text-xs text-left space-y-1.5 ${darkMode ? 'text-dk-faint' : 'text-slate-400'}`}>
                <p className="font-medium mb-1">Try:</p>
                <p>&bull; "Create a flowchart for user login"</p>
                <p>&bull; "Make the nodes blue"</p>
                <p>&bull; "Add swimlanes for 3 departments"</p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} darkMode={darkMode} />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className={`flex items-start gap-2 px-3 py-2 text-xs border-t shrink-0 ${darkMode ? 'bg-red-900/30 border-red-800/40 text-red-300' : 'bg-red-50 border-red-100 text-red-600'}`}>
            <span className="flex-1 break-words">{error}</span>
            <button
              onClick={() => useAIStore.getState().setError(null)}
              className={`shrink-0 p-0.5 rounded hover:bg-red-500/20 transition-colors cursor-pointer ${darkMode ? 'text-red-400' : 'text-red-500'}`}
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Input area */}
        <div className={`border-t shrink-0 ${darkMode ? 'border-dk-border' : 'border-slate-200'}`}>
          {/* Image preview strip */}
          {pendingImages.length > 0 && (
            <div className={`flex gap-2 px-3 pt-2 pb-1 overflow-x-auto ${darkMode ? 'bg-dk-surface' : 'bg-white'}`}>
              {pendingImages.map((img) => (
                <div key={img.id} className="relative shrink-0 group">
                  <img
                    src={`data:${img.mimeType};base64,${img.base64}`}
                    alt="Attached"
                    className={`h-16 rounded-md border object-cover ${darkMode ? 'border-dk-border' : 'border-slate-200'}`}
                  />
                  <button
                    onClick={() => setPendingImages((prev) => prev.filter((p) => p.id !== img.id))}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Text input + buttons */}
          <div className="flex items-end gap-2 px-3 py-2.5">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            {/* Attach image button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!apiKey || isStreaming}
              className={`
                shrink-0 p-2 rounded-lg transition-colors cursor-pointer
                ${darkMode
                  ? 'text-dk-faint hover:text-dk-text hover:bg-dk-hover'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              title="Attach image"
            >
              <ImagePlus size={16} />
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={apiKey ? (pendingImages.length > 0 ? 'Add a message or just send the image...' : 'Type a message...') : 'Set API key in settings to start...'}
              disabled={!apiKey}
              rows={1}
              className={`
                flex-1 resize-none rounded-lg px-3 py-2 text-sm outline-none transition-colors
                ${darkMode
                  ? 'bg-dk-input text-dk-text placeholder:text-dk-faint border border-dk-border focus:border-blue-500'
                  : 'bg-slate-50 text-slate-900 placeholder:text-slate-400 border border-slate-200 focus:border-blue-500'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            />
            {isStreaming ? (
              <button
                onClick={handleStop}
                className="shrink-0 p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors cursor-pointer"
                data-tooltip="Stop"
              >
                <Square size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canSend || !apiKey}
                className={`
                  shrink-0 p-2 rounded-lg transition-colors cursor-pointer
                  ${canSend && apiKey
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : darkMode
                      ? 'bg-dk-hover text-dk-faint cursor-not-allowed'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }
                `}
                data-tooltip="Send"
              >
                <Send size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Resize handles — edges (6px wide strips) and corners (12px squares) */}
        {/* Top edge */}
        <div className="absolute top-0 left-3 right-3 h-[6px] cursor-n-resize" onMouseDown={handleResizeStart('n')} />
        {/* Bottom edge */}
        <div className="absolute bottom-0 left-3 right-3 h-[6px] cursor-s-resize" onMouseDown={handleResizeStart('s')} />
        {/* Left edge */}
        <div className="absolute left-0 top-3 bottom-3 w-[6px] cursor-w-resize" onMouseDown={handleResizeStart('w')} />
        {/* Right edge */}
        <div className="absolute right-0 top-3 bottom-3 w-[6px] cursor-e-resize" onMouseDown={handleResizeStart('e')} />
        {/* Corners */}
        <div className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize" onMouseDown={handleResizeStart('nw')} />
        <div className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize" onMouseDown={handleResizeStart('ne')} />
        <div className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize" onMouseDown={handleResizeStart('sw')} />
        <div className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize" onMouseDown={handleResizeStart('se')} />
      </div>
    </div>,
    document.body,
  );
};

export default AIChatPanel;
