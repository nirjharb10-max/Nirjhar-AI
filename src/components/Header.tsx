interface HeaderProps {
  onAddColumn: () => void;
}

export function Header({ onAddColumn }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-[#FAF9F6]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-8 px-6 py-3.5">
        <a
          href="#top"
          className="font-display text-xl font-medium tracking-tight text-[#18181B] whitespace-nowrap min-w-0 truncate focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D4ED8]"
        >
          Nirjhar AI Share OR Gain Knowledge
        </a>

        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-stone-600"
        >
          <a
            href="#studio"
            className="hover:text-[#18181B] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Dialogue
          </a>
          <a
            href="#columns"
            className="hover:text-[#18181B] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Picture Columns
          </a>
          <a
            href="#prompts"
            className="hover:text-[#18181B] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Prompts
          </a>
          <a
            href="#guide"
            className="hover:text-[#18181B] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            How It Works
          </a>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onAddColumn}
            className="rounded-lg bg-[#1D4ED8] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1E40AF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] whitespace-nowrap shrink-0 cursor-pointer"
          >
            Add Column
          </button>
        </div>
      </div>
    </header>
  );
}
