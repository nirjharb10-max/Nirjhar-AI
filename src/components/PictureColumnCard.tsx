import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { ImagePlus, Maximize2, MessageSquare, Replace, Trash2, X } from 'lucide-react';
import type { PictureColumn } from '../types';
import { countWords, processUploadedImage } from '../utils/imageUtils';

interface PictureColumnCardProps {
  column: PictureColumn;
  index: number;
  canRemove: boolean;
  isActiveFocus: boolean;
  onUpdate: (id: string, patch: Partial<PictureColumn>) => void;
  onRemove: (id: string) => void;
  onInspect: (column: PictureColumn, index: number) => void;
  onDiscussWithAI: (column: PictureColumn, index: number) => void;
}

export function PictureColumnCard({
  column,
  index,
  canRemove,
  isActiveFocus,
  onUpdate,
  onRemove,
  onInspect,
  onDiscussWithAI,
}: PictureColumnCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imgLoadFailed, setImgLoadFailed] = useState(false);

  const columnLabel = `Column ${String(index).padStart(2, '0')}`;
  const wordCount = countWords(column.description);
  const hasContent = Boolean(column.imageUrl || column.description.trim() || column.title.trim());

  async function handleFile(file: File) {
    setUploadError(null);
    setImgLoadFailed(false);
    try {
      const processed = await processUploadedImage(file);
      onUpdate(column.id, {
        imageUrl: processed.dataUrl,
        fileName: processed.fileName,
        title: column.title.trim() ? column.title : file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '),
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Unable to attach this image.');
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      void handleFile(file);
    }
    e.target.value = '';
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleFile(file);
    }
  }

  function handleClearImage() {
    setImgLoadFailed(false);
    setUploadError(null);
    onUpdate(column.id, {
      imageUrl: null,
      fileName: undefined,
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <article
      className={`flex flex-col rounded-xl border bg-white p-4 transition-colors duration-150 ${
        isActiveFocus
          ? 'border-[#1D4ED8] ring-1 ring-[#1D4ED8]/20'
          : 'border-stone-200 hover:border-stone-300'
      }`}
    >
      {/* Column Header Metadata (Zero-Pill Inline Text) */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-stone-500 min-w-0">
          <span className="font-mono font-medium text-stone-800 tabular-nums whitespace-nowrap">
            {columnLabel}
          </span>
          <span aria-hidden="true">·</span>
          <span className="truncate">
            {column.imageUrl ? 'Picture attached' : 'Ready for picture'}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {column.imageUrl && (
            <button
              type="button"
              onClick={() => onInspect(column, index)}
              title="Inspect picture fullscreen"
              aria-label={`Inspect ${columnLabel} fullscreen`}
              className="flex h-8 w-8 items-center justify-center rounded-md text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-[#1D4ED8] cursor-pointer"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          )}
          {canRemove && (
            <button
              type="button"
              onClick={() => onRemove(column.id)}
              title="Remove this column"
              aria-label={`Remove ${columnLabel}`}
              className="flex h-8 w-8 items-center justify-center rounded-md text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-[#1D4ED8] cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Picture Attachment Frame (4:3) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="sr-only"
        aria-label={`Upload picture for ${columnLabel}`}
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`group relative aspect-[4/3] w-full overflow-hidden rounded-lg border transition-colors ${
          isDragging
            ? 'border-[#1D4ED8] bg-[#1D4ED8]/5'
            : column.imageUrl
              ? 'border-stone-200 bg-stone-100'
              : 'border-dashed border-stone-300 bg-stone-50 hover:border-stone-400 hover:bg-stone-100/70'
        }`}
      >
        {column.imageUrl && !imgLoadFailed ? (
          <>
            <img
              src={column.imageUrl}
              alt={column.title || `Attached picture in ${columnLabel}`}
              referrerPolicy="no-referrer"
              onError={() => setImgLoadFailed(true)}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100" />
            <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-md bg-white/95 px-2.5 py-1.5 text-xs font-medium text-stone-900 shadow-sm hover:bg-white cursor-pointer whitespace-nowrap"
              >
                <Replace className="h-3.5 w-3.5" />
                Replace
              </button>
              <button
                type="button"
                onClick={handleClearImage}
                aria-label="Remove attached picture"
                className="flex items-center justify-center rounded-md bg-white/95 p-1.5 text-stone-700 shadow-sm hover:bg-red-50 hover:text-red-700 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        ) : column.imageUrl && imgLoadFailed ? (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200 p-4 text-center">
            <ImagePlus className="mb-2 h-6 w-6 text-stone-400" />
            <p className="text-xs font-medium text-stone-700">
              {column.title || 'Attached Picture'}
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 text-xs font-medium text-[#1D4ED8] hover:underline cursor-pointer"
            >
              Choose another image
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center p-5 text-center focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#1D4ED8] cursor-pointer"
          >
            <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600">
              <ImagePlus className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-stone-800">
              Attach a picture
            </span>
            <span className="mt-1 text-xs text-stone-500">
              Click to browse or drag and drop PNG, JPG, WebP
            </span>
          </button>
        )}
      </div>

      {uploadError && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {uploadError}
        </p>
      )}

      {/* Title & Description Fields */}
      <div className="mt-4 flex flex-1 flex-col">
        <label htmlFor={`col-title-${column.id}`} className="sr-only">
          Picture title for {columnLabel}
        </label>
        <input
          id={`col-title-${column.id}`}
          type="text"
          value={column.title}
          onChange={(e) =>
            onUpdate(column.id, {
              title: e.target.value,
              updatedAt: new Date().toISOString(),
            })
          }
          placeholder="Add a title for this picture..."
          className="w-full border-b border-stone-200 pb-2 font-display text-base font-medium text-[#18181B] placeholder:text-stone-400 focus:border-[#1D4ED8] focus:outline-none"
        />

        <label htmlFor={`col-desc-${column.id}`} className="mt-3 mb-1.5 text-xs font-medium text-stone-500">
          Picture description
        </label>
        <textarea
          id={`col-desc-${column.id}`}
          rows={4}
          value={column.description}
          onChange={(e) =>
            onUpdate(column.id, {
              description: e.target.value,
              updatedAt: new Date().toISOString(),
            })
          }
          placeholder="Describe what is happening in this picture, the mood, or what you want to talk about..."
          className="w-full flex-1 resize-y rounded-lg border border-stone-200 bg-[#FAF9F6] px-3 py-2.5 text-sm leading-relaxed text-stone-800 placeholder:text-stone-400 focus:border-[#1D4ED8] focus:bg-white focus:outline-none"
        />
      </div>

      {/* Footer Metadata & Discuss Action */}
      <div className="mt-3 flex items-center justify-between gap-3 pt-1">
        <span className="text-xs text-stone-500 tabular-nums whitespace-nowrap">
          {wordCount} {wordCount === 1 ? 'word' : 'words'}
        </span>

        <button
          type="button"
          disabled={!hasContent}
          onClick={() => onDiscussWithAI(column, index)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-[#18181B] transition-colors hover:border-[#1D4ED8] hover:text-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-[#1D4ED8] whitespace-nowrap shrink-0 cursor-pointer"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Discuss with AI
        </button>
      </div>
    </article>
  );
}
