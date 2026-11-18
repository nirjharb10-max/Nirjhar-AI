import { Columns2, Columns3, Plus } from 'lucide-react';
import type { ColumnGridMode, PictureColumn } from '../types';
import { PictureColumnCard } from './PictureColumnCard';

interface PictureBoardProps {
  columns: PictureColumn[];
  gridMode: ColumnGridMode;
  activeFocusColumnId: string | null;
  onGridModeChange: (mode: ColumnGridMode) => void;
  onAddColumn: () => void;
  onUpdateColumn: (id: string, patch: Partial<PictureColumn>) => void;
  onRemoveColumn: (id: string) => void;
  onInspectColumn: (column: PictureColumn, index: number) => void;
  onDiscussColumn: (column: PictureColumn, index: number) => void;
}

export function PictureBoard({
  columns,
  gridMode,
  activeFocusColumnId,
  onGridModeChange,
  onAddColumn,
  onUpdateColumn,
  onRemoveColumn,
  onInspectColumn,
  onDiscussColumn,
}: PictureBoardProps) {
  const attachedCount = columns.filter((c) => Boolean(c.imageUrl)).length;

  return (
    <section id="columns" aria-labelledby="columns-heading" className="flex flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-3.5">
        <div>
          <h2 id="columns-heading" className="font-display text-2xl font-medium tracking-tight text-[#18181B]">
            Picture Columns
          </h2>
          <p className="mt-0.5 text-sm text-stone-500 tabular-nums">
            {columns.length} {columns.length === 1 ? 'column' : 'columns'} · {attachedCount}{' '}
            {attachedCount === 1 ? 'picture' : 'pictures'} attached
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Interactive Segmented Layout Toggle */}
          <div
            role="group"
            aria-label="Column layout"
            className="hidden sm:flex items-center gap-1 rounded-lg bg-stone-200/70 p-1"
          >
            <button
              type="button"
              onClick={() => onGridModeChange(2)}
              aria-pressed={gridMode === 2}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                gridMode === 2
                  ? 'bg-white text-[#18181B] shadow-xs'
                  : 'text-stone-600 hover:text-[#18181B]'
              }`}
            >
              <Columns2 className="h-3.5 w-3.5" />
              2 Columns
            </button>
            <button
              type="button"
              onClick={() => onGridModeChange(3)}
              aria-pressed={gridMode === 3}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                gridMode === 3
                  ? 'bg-white text-[#18181B] shadow-xs'
                  : 'text-stone-600 hover:text-[#18181B]'
              }`}
            >
              <Columns3 className="h-3.5 w-3.5" />
              3 Columns
            </button>
          </div>

          <button
            type="button"
            onClick={onAddColumn}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-[#18181B] transition-colors hover:border-stone-400 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-[#1D4ED8] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            New Column
          </button>
        </div>
      </div>

      <div
        className={`grid grid-cols-1 gap-5 ${
          gridMode === 3 ? 'md:grid-cols-2 2xl:grid-cols-3' : 'md:grid-cols-2'
        }`}
      >
        {columns.map((column, idx) => (
          <PictureColumnCard
            key={column.id}
            column={column}
            index={idx + 1}
            canRemove={columns.length > 1}
            isActiveFocus={activeFocusColumnId === column.id}
            onUpdate={onUpdateColumn}
            onRemove={onRemoveColumn}
            onInspect={onInspectColumn}
            onDiscussWithAI={onDiscussColumn}
          />
        ))}
      </div>
    </section>
  );
}
