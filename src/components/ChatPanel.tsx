import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowUp, Eye, EyeOff, RotateCcw, Square } from 'lucide-react';
import type { ChatMessage, PictureColumn } from '../types';

const AI_AVATAR_PATH = '/src/assets/images/ai_companion_mark_1794961769697.jpg';

interface ChatPanelProps {
  messages: ChatMessage[];
  columns: PictureColumn[];
  isStreaming: boolean;
  includeColumns: boolean;
  selectedColumnId: string | null;
  onToggleIncludeColumns: () => void;
  onSelectColumnId: (id: string | null) => void;
  onSendMessage: (text: string, focusColumnId?: string) => void;
  onStopStreaming: () => void;
  onResetChat: () => void;
}

function FormattedMessageText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="space-y-2.5 text-[15px] leading-relaxed">
      {blocks.map((block, blockIdx) => {
        const lines = block.split('\n');
        const isBulletList = lines.every((line) => /^\s*[-*•]\s+/.test(line));
        if (isBulletList) {
          return (
            <ul key={blockIdx} className="list-disc space-y-1 pl-5">
              {lines.map((line, lineIdx) => (
                <li key={lineIdx}>{renderInlineBold(line.replace(/^\s*[-*•]\s+/, ''))}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={blockIdx} className="whitespace-pre-wrap">
            {renderInlineBold(block)}
          </p>
        );
      })}
    </div>
  );
}

function renderInlineBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

const QUICK_STARTERS = [
  'Tell me what you notice in the attached pictures',
  'How do the moods of my columns compare?',
  'Let’s just chat — ask me an interesting question',
];

export function ChatPanel({
  messages,
  columns,
  isStreaming,
  includeColumns,
  selectedColumnId,
  onToggleIncludeColumns,
  onSelectColumnId,
  onSendMessage,
  onStopStreaming,
  onResetChat,
}: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const [avatarFailed, setAvatarFailed] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, isStreaming]);

  const attachedCount = columns.filter((c) => Boolean(c.imageUrl)).length;
  const populatedColumns = columns
    .map((c, idx) => ({ column: c, index: idx + 1 }))
    .filter(({ column }) => Boolean(column.imageUrl || column.description.trim() || column.title.trim()));

  function submitDraft() {
    const trimmed = draft.trim();
    if (!trimmed || isStreaming) {
      return;
    }
    onSendMessage(trimmed, selectedColumnId ?? undefined);
    setDraft('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitDraft();
    }
  }

  return (
    <aside
      aria-label="AI conversation panel"
      className="flex h-[680px] flex-col overflow-hidden rounded-xl border border-stone-200 bg-white lg:sticky lg:top-20"
    >
      {/* Companion Header */}
      <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          {!avatarFailed ? (
            <img
              src={AI_AVATAR_PATH}
              alt="Lumen AI companion mark"
              referrerPolicy="no-referrer"
              onError={() => setAvatarFailed(true)}
              className="h-10 w-10 shrink-0 rounded-lg border border-stone-200 object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-stone-100 font-display text-lg font-semibold text-stone-800">
              L
            </div>
          )}
          <div className="min-w-0">
            <h2 className="font-display text-lg font-medium leading-tight text-[#18181B] truncate">
              Nirjhar AI
            </h2>
            <p className="text-xs text-stone-500 truncate">
              AI Conversation &amp; Visual Companion
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onResetChat}
          disabled={isStreaming}
          title="Start a new conversation"
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:border-stone-300 hover:bg-stone-50 hover:text-[#18181B] disabled:opacity-45 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          New Chat
        </button>
      </div>

      {/* Scrollable Conversation Thread */}
      <div
        ref={messagesContainerRef}
        className="flex-1 space-y-4 overflow-y-auto px-5 py-5"
      >
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div className="mb-1 flex items-center gap-2 text-xs text-stone-400">
                <span className="font-medium text-stone-500">
                  {isUser ? 'You' : 'Lumen'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{msg.timestamp}</span>
              </div>

              <div
                className={`max-w-[90%] rounded-xl px-4 py-3 ${
                  msg.isError
                    ? 'border border-red-200 bg-red-50 text-red-800'
                    : isUser
                      ? 'bg-[#18181B] text-white'
                      : 'border border-stone-200/80 bg-[#FAF9F6] text-[#18181B]'
                }`}
              >
                {msg.focusColumnIndex && (
                  <div
                    className={`mb-2.5 flex items-center gap-2.5 border-b pb-2 text-xs ${
                      isUser ? 'border-white/15 text-stone-300' : 'border-stone-200 text-stone-500'
                    }`}
                  >
                    {msg.focusImageUrl && (
                      <img
                        src={msg.focusImageUrl}
                        alt={msg.focusTitle || `Column ${msg.focusColumnIndex}`}
                        referrerPolicy="no-referrer"
                        className="h-8 w-10 rounded object-cover shrink-0"
                      />
                    )}
                    <span className="truncate">
                      Column {String(msg.focusColumnIndex).padStart(2, '0')}
                      {msg.focusTitle ? ` · ${msg.focusTitle}` : ''}
                    </span>
                  </div>
                )}

                {msg.text ? (
                  <FormattedMessageText text={msg.text} />
                ) : (
                  <span className="text-sm text-stone-400">Thinking...</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Starter Prompt Suggestions when conversation only has greeting */}
      {messages.length <= 1 && !isStreaming && (
        <div className="border-t border-stone-100 bg-[#FAF9F6]/60 px-5 py-3">
          <p className="mb-2 text-xs font-medium text-stone-500">Suggested ways to start</p>
          <div className="flex flex-col gap-1.5">
            {QUICK_STARTERS.map((starter) => (
              <button
                key={starter}
                type="button"
                onClick={() => onSendMessage(starter)}
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-left text-xs font-medium text-stone-700 transition-colors hover:border-[#1D4ED8] hover:text-[#1D4ED8] cursor-pointer"
              >
                {starter}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Composer & Board Context Control */}
      <div className="border-t border-stone-200 bg-white p-4">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <button
            type="button"
            onClick={onToggleIncludeColumns}
            className="inline-flex items-center gap-1.5 text-stone-600 transition-colors hover:text-[#18181B] cursor-pointer"
          >
            {includeColumns ? (
              <Eye className="h-3.5 w-3.5 text-[#1D4ED8]" />
            ) : (
              <EyeOff className="h-3.5 w-3.5 text-stone-400" />
            )}
            <span>
              {includeColumns
                ? `Sharing ${attachedCount} board ${attachedCount === 1 ? 'picture' : 'pictures'} with Lumen`
                : 'Board pictures paused for chat'}
            </span>
          </button>

          {populatedColumns.length > 0 && includeColumns && (
            <select
              aria-label="Focus conversation on a specific column"
              value={selectedColumnId ?? ''}
              onChange={(e) => onSelectColumnId(e.target.value || null)}
              className="max-w-[175px] truncate rounded-md border border-stone-200 bg-[#FAF9F6] px-2 py-1 text-xs text-stone-700 focus:border-[#1D4ED8] focus:outline-none cursor-pointer"
            >
              <option value="">All columns</option>
              {populatedColumns.map(({ column, index }) => (
                <option key={column.id} value={column.id}>
                  Focus Col {String(index).padStart(2, '0')}
                  {column.title ? `: ${column.title}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-end gap-2">
          <label htmlFor="chat-composer" className="sr-only">
            Message Lumen
          </label>
          <textarea
            id="chat-composer"
            ref={textareaRef}
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Talk with Lumen or ask about your picture columns..."
            className="max-h-32 min-h-[48px] flex-1 resize-none rounded-lg border border-stone-200 bg-[#FAF9F6] px-3.5 py-2.5 text-sm text-[#18181B] placeholder:text-stone-400 focus:border-[#1D4ED8] focus:bg-white focus:outline-none"
          />

          {isStreaming ? (
            <button
              type="button"
              onClick={onStopStreaming}
              aria-label="Stop response"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-stone-900 text-white transition-colors hover:bg-stone-800 cursor-pointer"
            >
              <Square className="h-4 w-4 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              disabled={!draft.trim()}
              onClick={submitDraft}
              aria-label="Send message"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#1D4ED8] text-white transition-colors hover:bg-[#1E40AF] disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400 cursor-pointer"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
