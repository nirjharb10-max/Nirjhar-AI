import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { ChatPanel } from './components/ChatPanel';
import { Header } from './components/Header';
import { LightboxModal } from './components/LightboxModal';
import { PictureBoard } from './components/PictureBoard';
import type { ChatMessage, ColumnGridMode, PictureColumn } from './types';

const STORAGE_KEY_COLUMNS = 'lumen_folio_columns_v1';

function createInitialColumns(): PictureColumn[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'col-1',
      title: 'Gallery Atrium in Morning Light',
      description:
        'Diagonal shafts of sunlight cut across raw concrete walls and warm travertine floors. A single visitor pauses beside a quiet framed study.',
      imageUrl: '/src/assets/images/col_architecture_light_1794961768927.jpg',
      fileName: 'gallery-atrium.jpg',
      updatedAt: now,
    },
    {
      id: 'col-2',
      title: 'Stoneware & Olive Branches',
      description:
        'Handmade speckled ceramics arranged on natural linen beside an open timber window, catching diffused afternoon light.',
      imageUrl: '/src/assets/images/col_botanical_still_1794961769423.jpg',
      fileName: 'stoneware-olive.jpg',
      updatedAt: now,
    },
    {
      id: 'col-3',
      title: '',
      description: '',
      imageUrl: null,
      updatedAt: now,
    },
  ];
}

function formatTime(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function createWelcomeMessage(): ChatMessage {
  return {
    id: 'msg-welcome',
    role: 'model',
    text: 'Welcome to Lumen Folio. Feel free to talk with me about anything on your mind, or attach your own pictures and write descriptions in the columns beside us—I can see every image you share and explore their details with you.',
    timestamp: formatTime(),
  };
}

const CONVERSATION_IDEAS = [
  {
    index: '01',
    title: 'Explore Visual Storytelling',
    summary: 'Ask Lumen how your attached pictures relate to one another and what narrative emerges across columns.',
    prompt: 'Look across the pictures currently attached in my columns. What story or visual thread connects them?',
  },
  {
    index: '02',
    title: 'Refine Your Picture Descriptions',
    summary: 'Collaborate on sharper, more evocative captions or stories based on the notes you wrote.',
    prompt: 'Based on the pictures and descriptions in my columns, suggest two fresh ways I could describe each scene.',
  },
  {
    index: '03',
    title: 'Open Conversation',
    summary: 'Step away from the gallery and talk freely about creative projects, travel, design, or everyday ideas.',
    prompt: 'Let’s take a break from analyzing photos—what is an interesting creative question you’d like to ask me today?',
  },
];

export default function App() {
  const [columns, setColumns] = useState<PictureColumn[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_COLUMNS);
      if (saved) {
        const parsed = JSON.parse(saved) as PictureColumn[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Ignore storage read errors
    }
    return createInitialColumns();
  });

  const [gridMode, setGridMode] = useState<ColumnGridMode>(2);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [createWelcomeMessage()]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [includeColumns, setIncludeColumns] = useState(true);
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [inspecting, setInspecting] = useState<{ column: PictureColumn; index: number } | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_COLUMNS, JSON.stringify(columns));
    } catch {
      // Ignore quota exceeded errors when storing large uploaded data URLs
    }
  }, [columns]);

  function handleAddColumn() {
    const newColumn: PictureColumn = {
      id: `col-${Date.now()}`,
      title: '',
      description: '',
      imageUrl: null,
      updatedAt: new Date().toISOString(),
    };
    setColumns((prev) => [...prev, newColumn]);

    // Smoothly scroll to the columns section if currently near the bottom or top
    const columnsEl = document.getElementById('columns');
    if (columnsEl) {
      columnsEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function handleUpdateColumn(id: string, patch: Partial<PictureColumn>) {
    setColumns((prev) => prev.map((col) => (col.id === id ? { ...col, ...patch } : col)));
  }

  function handleRemoveColumn(id: string) {
    setColumns((prev) => {
      if (prev.length <= 1) {
        return prev;
      }
      return prev.filter((col) => col.id !== id);
    });
    if (selectedColumnId === id) {
      setSelectedColumnId(null);
    }
  }

  function handleResetSampleBoard() {
    setColumns(createInitialColumns());
    setSelectedColumnId(null);
  }

  function handleStopStreaming() {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsStreaming(false);
  }

  function handleResetChat() {
    handleStopStreaming();
    setMessages([createWelcomeMessage()]);
    setSelectedColumnId(null);
  }

  async function handleSendMessage(rawText: string, focusColumnId?: string) {
    const text = rawText.trim();
    if (!text || isStreaming) {
      return;
    }

    const focusIdx = focusColumnId ? columns.findIndex((c) => c.id === focusColumnId) : -1;
    const focusCol = focusIdx >= 0 ? columns[focusIdx] : undefined;

    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: formatTime(),
      focusColumnId: focusCol?.id,
      focusColumnIndex: focusCol ? focusIdx + 1 : undefined,
      focusImageUrl: focusCol?.imageUrl,
      focusTitle: focusCol?.title,
    };

    const assistantMsgId = `msg-ai-${Date.now() + 1}`;
    const placeholderAiMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'model',
      text: '',
      timestamp: formatTime(),
    };

    const nextHistory = [...messages, userMsg];
    setMessages([...nextHistory, placeholderAiMsg]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: nextHistory
            .filter((m) => !m.isError && m.text.trim().length > 0)
            .map((m) => ({
              role: m.role,
              text: m.text,
              focusColumnId: m.focusColumnId,
            })),
          columns: columns.map((col, idx) => ({
            id: col.id,
            index: idx + 1,
            title: col.title,
            description: col.description,
            imageUrl: col.imageUrl,
          })),
          includeColumns,
          focusColumnId,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Unable to reach Lumen right now.';
        try {
          const errJson = (await response.json()) as { error?: string };
          if (errJson.error) {
            errorMessage = errJson.error;
          }
        } catch {
          // Ignore non-JSON error body
        }
        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Streaming response body is unavailable.');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const eventChunk of events) {
          const lines = eventChunk.split('\n');
          for (const line of lines) {
            if (!line.startsWith('data: ')) {
              continue;
            }
            const payloadRaw = line.slice(6).trim();
            if (!payloadRaw) {
              continue;
            }
            const payload = JSON.parse(payloadRaw) as {
              type: 'chunk' | 'done' | 'error';
              text?: string;
              error?: string;
            };

            if (payload.type === 'chunk' && payload.text) {
              accumulatedText += payload.text;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantMsgId ? { ...m, text: accumulatedText } : m)),
              );
            } else if (payload.type === 'error') {
              throw new Error(payload.error || 'Lumen encountered an error.');
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId && !m.text.trim()
              ? { ...m, text: 'Response stopped.' }
              : m,
          ),
        );
      } else {
        const errMsg = err instanceof Error ? err.message : 'Something went wrong while talking with Lumen.';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId ? { ...m, text: errMsg, isError: true } : m,
          ),
        );
      }
    } finally {
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  }

  function handleDiscussColumn(column: PictureColumn, index: number) {
    setIncludeColumns(true);
    setSelectedColumnId(column.id);

    const colLabel = `Column ${String(index).padStart(2, '0')}`;
    const titlePart = column.title.trim() ? ` ("${column.title.trim()}")` : '';
    const prompt = column.imageUrl
      ? `Let’s talk about ${colLabel}${titlePart}. What stands out to you in this picture and my description?`
      : `Let’s talk about my notes in ${colLabel}${titlePart}.`;

    const studioEl = document.getElementById('studio');
    if (studioEl && window.innerWidth < 1024) {
      studioEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    void handleSendMessage(prompt, column.id);
  }

  return (
    <div id="top" className="min-h-screen bg-[#FAF9F6] text-[#18181B]">
      <Header onAddColumn={handleAddColumn} />

      <main className="mx-auto max-w-[1400px] px-6 pb-20 pt-8 md:pt-10">
        {/* Compact Editorial Intro */}
        <section className="mb-8 border-b border-stone-200 pb-7">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-medium tracking-wide text-stone-500">
                Life of A simple person
              </p>
              <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-[#18181B] sm:text-4xl [text-wrap:balance]">
                Meet Nirjhar
              </h1>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-stone-600">
              Start a live conversation in the dialogue panel, or attach your own photographs into
              the columns with notes—Lumen sees your board and responds with visual context.
            </p>
          </div>
        </section>

        {/* Primary Dual Studio Workspace: AI Dialogue + Multi-Column Picture Board */}
        <section
          id="studio"
          aria-label="Interactive AI chat and picture columns workspace"
          className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[410px_1fr] xl:grid-cols-[440px_1fr]"
        >
          <ChatPanel
            messages={messages}
            columns={columns}
            isStreaming={isStreaming}
            includeColumns={includeColumns}
            selectedColumnId={selectedColumnId}
            onToggleIncludeColumns={() => setIncludeColumns((v) => !v)}
            onSelectColumnId={setSelectedColumnId}
            onSendMessage={handleSendMessage}
            onStopStreaming={handleStopStreaming}
            onResetChat={handleResetChat}
          />

          <PictureBoard
            columns={columns}
            gridMode={gridMode}
            activeFocusColumnId={selectedColumnId}
            onGridModeChange={setGridMode}
            onAddColumn={handleAddColumn}
            onUpdateColumn={handleUpdateColumn}
            onRemoveColumn={handleRemoveColumn}
            onInspectColumn={(column, index) => setInspecting({ column, index })}
            onDiscussColumn={handleDiscussColumn}
          />
        </section>

        {/* Conversation Prompts Section */}
        <section id="prompts" aria-labelledby="prompts-heading" className="mt-16 border-t border-stone-200 pt-12">
          <div className="mb-6 max-w-xl">
            <h2 id="prompts-heading" className="font-display text-2xl font-medium tracking-tight text-[#18181B]">
              Conversation Prompts
            </h2>
            <p className="mt-1.5 text-sm text-stone-600">
              Choose any starting thread below to send directly into your conversation with Lumen.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {CONVERSATION_IDEAS.map((idea) => (
              <button
                key={idea.index}
                type="button"
                disabled={isStreaming}
                onClick={() => {
                  document.getElementById('studio')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  void handleSendMessage(idea.prompt);
                }}
                className="group flex flex-col justify-between rounded-xl border border-stone-200 bg-white p-5 text-left transition-colors hover:border-[#1D4ED8] disabled:opacity-50 cursor-pointer"
              >
                <div>
                  <span className="font-mono text-xs font-medium text-stone-400 tabular-nums">
                    {idea.index}.
                  </span>
                  <h3 className="mt-2 font-display text-lg font-medium text-[#18181B] group-hover:text-[#1D4ED8] transition-colors">
                    {idea.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">
                    {idea.summary}
                  </p>
                </div>

                <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-[#1D4ED8]">
                  Ask Lumen
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Editorial Guide Section */}
        <section id="guide" aria-labelledby="guide-heading" className="mt-16 border-t border-stone-200 pt-12">
          <h2 id="guide-heading" className="font-display text-2xl font-medium tracking-tight text-[#18181B]">
            How It Works
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-3">
            <div>
              <p className="font-mono text-xs font-medium text-stone-400 tabular-nums">01.</p>
              <h3 className="mt-2 text-base font-semibold text-[#18181B]">
                Attach Pictures in Columns
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
                Drop any image into an existing column or click Add Column to expand your board in a
                2-column or 3-column layout.
              </p>
            </div>
            <div>
              <p className="font-mono text-xs font-medium text-stone-400 tabular-nums">02.</p>
              <h3 className="mt-2 text-base font-semibold text-[#18181B]">
                Write Your Descriptions
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
                Give each picture a title and write its backstory, mood, or questions in the
                description box directly underneath.
              </p>
            </div>
            <div>
              <p className="font-mono text-xs font-medium text-stone-400 tabular-nums">03.</p>
              <h3 className="mt-2 text-base font-semibold text-[#18181B]">
                Talk Together with Lumen
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
                Chat freely in the dialogue panel or click Discuss with AI on any column to explore
                a specific picture in detail.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-6 py-6 text-xs text-stone-500">
          <span>Lumen Folio · Interactive AI Dialogue &amp; Visual Columns</span>
          <button
            type="button"
            onClick={handleResetSampleBoard}
            className="font-medium text-stone-600 hover:text-[#18181B] hover:underline underline-offset-4 cursor-pointer"
          >
            Restore Sample Pictures
          </button>
        </div>
      </footer>

      <LightboxModal
        column={inspecting?.column ?? null}
        index={inspecting?.index ?? 1}
        onClose={() => setInspecting(null)}
        onDiscuss={handleDiscussColumn}
      />
    </div>
  );
}
