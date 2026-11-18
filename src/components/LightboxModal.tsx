import { useEffect } from 'react';
import { MessageSquare, X } from 'lucide-react';
import type { PictureColumn } from '../types';

interface LightboxModalProps {
  column: PictureColumn | null;
  index: number;
  onClose: () => void;
  onDiscuss: (column: PictureColumn, index: number) => void;
}

export function LightboxModal({ column, index, onClose, onDiscuss }: LightboxModalProps) {
  useEffect(() => {
    if (!column) {
      return;
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [column, onClose]);

  if (!column || !column.imageUrl) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={column.title || `Column ${index} picture`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs md:p-8"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl md:flex-row"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close fullscreen view"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg bg-white/90 text-stone-700 shadow-sm transition-colors hover:bg-white hover:text-[#18181B] cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-1 items-center justify-center bg-stone-950 p-4 md:p-6">
          <img
            src={column.imageUrl}
            alt={column.title || `Picture in Column ${index}`}
            referrerPolicy="no-referrer"
            className="max-h-[70vh] w-auto rounded object-contain"
          />
        </div>

        <div className="flex w-full flex-col justify-between border-t border-stone-200 p-6 md:w-80 md:border-l md:border-t-0">
          <div>
            <p className="font-mono text-xs text-stone-500 tabular-nums">
              Column {String(index).padStart(2, '0')}
            </p>
            <h3 className="mt-2 font-display text-xl font-medium text-[#18181B]">
              {column.title || 'Untitled Picture'}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-stone-600 whitespace-pre-wrap">
              {column.description || 'No description added yet.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              onDiscuss(column, index);
              onClose();
            }}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1D4ED8] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1E40AF] cursor-pointer"
          >
            <MessageSquare className="h-4 w-4" />
            Discuss with Lumen
          </button>
        </div>
      </div>
    </div>
  );
}
