import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { useClient } from '@/ui/context';
import { useWindowManager } from '@/ui/in-game';
import {
  ALL_COMMANDS,
  type Command,
  getRecentCommandIds,
  recordRecentCommand,
} from './commands';

const PALETTE_Z = 36; // above SIDEMENU_Z (35)

// --- Small shared sub-components ---

type CommandItemProps = {
  command: Command;
  active: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
};

function CommandItem({
  command,
  active,
  onMouseEnter,
  onClick,
}: CommandItemProps) {
  return (
    <li onMouseEnter={onMouseEnter}>
      <button
        type='button'
        class={`flex w-full items-center justify-between gap-2 rounded px-3 py-2 text-left text-sm${active ? ' bg-primary text-primary-content' : ''}`}
        onClick={onClick}
      >
        <span class='truncate'>{command.label}</span>
        {command.badge && (
          <span class='badge badge-warning badge-sm shrink-0'>
            {command.badge}
          </span>
        )}
      </button>
    </li>
  );
}

type CommandSectionProps = {
  title: string;
  commands: Command[];
  activeId: string | null;
  onHover: (id: string) => void;
  onSelect: (command: Command) => void;
};

function CommandSection({
  title,
  commands,
  activeId,
  onHover,
  onSelect,
}: CommandSectionProps) {
  if (commands.length === 0) return null;
  return (
    <>
      <li class='menu-title'>{title}</li>
      {commands.map((cmd) => (
        <CommandItem
          key={cmd.id}
          command={cmd}
          active={activeId === cmd.id}
          onMouseEnter={() => onHover(cmd.id)}
          onClick={() => onSelect(cmd)}
        />
      ))}
    </>
  );
}

// --- Filtering logic ---

function matchesQuery(cmd: Command, query: string): boolean {
  const q = query.toLowerCase();
  if (cmd.label.toLowerCase().includes(q)) return true;
  return cmd.keywords?.some((k) => k.toLowerCase().includes(q)) ?? false;
}

// --- Main palette ---

type CommandPaletteProps = {
  onClose: () => void;
};

export function CommandPalette({ onClose }: CommandPaletteProps) {
  const client = useClient();
  const { toggleDialog, isOpen: isDialogOpen } = useWindowManager();
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const ctx = { client, toggleDialog, isDialogOpen, close: onClose };

  // Build visible command list
  const available = ALL_COMMANDS.filter(
    (cmd) => !cmd.condition || cmd.condition(client),
  );

  const recentIds = getRecentCommandIds();

  const filtered = query
    ? available.filter((cmd) => matchesQuery(cmd, query))
    : available;

  const recentCommands = query
    ? []
    : recentIds
        .map((id) => available.find((cmd) => cmd.id === id))
        .filter((cmd): cmd is Command => cmd !== undefined);

  const otherCommands = query
    ? filtered
    : filtered.filter((cmd) => !recentIds.includes(cmd.id));

  // Flat ordered list for keyboard nav
  const navList = [...recentCommands, ...otherCommands];

  // Reset selection when list changes
  useEffect(() => {
    setActiveId(navList[0]?.id ?? null);
  }, [query]);

  const execute = useCallback(
    (cmd: Command) => {
      recordRecentCommand(cmd.id);
      cmd.action(ctx);
    },
    [ctx],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveId((prev) => {
          const idx = navList.findIndex((c) => c.id === prev);
          return navList[(idx + 1) % navList.length]?.id ?? null;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveId((prev) => {
          const idx = navList.findIndex((c) => c.id === prev);
          const next = idx <= 0 ? navList.length - 1 : idx - 1;
          return navList[next]?.id ?? null;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = navList.find((c) => c.id === activeId);
        if (cmd) execute(cmd);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [navList, activeId, execute, onClose],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div
      class='fixed inset-0 flex items-start justify-center pt-8'
      style={{ zIndex: PALETTE_Z, background: 'rgba(0,0,0,0.5)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        class='flex w-full max-w-md flex-col rounded-xl border border-base-content/10 bg-base-300 shadow-2xl'
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div class='px-3 pt-3 pb-2'>
          <input
            ref={inputRef}
            class='input input-bordered w-full'
            type='text'
            placeholder='Search commands…'
            value={query}
            onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Hint row */}
        <div class='flex items-center gap-3 px-4 pb-2 text-xs opacity-50'>
          <span>
            <kbd class='kbd kbd-xs'>↑</kbd>
            <kbd class='kbd kbd-xs'>↓</kbd> navigate
          </span>
          <span>
            <kbd class='kbd kbd-xs'>↵</kbd> run
          </span>
          <span>
            <kbd class='kbd kbd-xs'>Esc</kbd> close
          </span>
        </div>

        <div class='divider my-0' />

        {/* Command list */}
        <ul class='menu max-h-72 overflow-y-auto p-2'>
          {navList.length === 0 && (
            <li class='py-4 text-center text-sm opacity-50'>
              No commands found
            </li>
          )}
          <CommandSection
            title='Recently Used'
            commands={recentCommands}
            activeId={activeId}
            onHover={setActiveId}
            onSelect={execute}
          />
          <CommandSection
            title={query ? 'Results' : 'Commands'}
            commands={otherCommands}
            activeId={activeId}
            onHover={setActiveId}
            onSelect={execute}
          />
        </ul>
      </div>
    </div>
  );
}
