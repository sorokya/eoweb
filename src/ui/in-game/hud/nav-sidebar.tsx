import { useCallback, useState } from 'preact/hooks';
import {
  GiBackpack,
  GiCompass,
  GiGears,
  GiScrollUnfurled,
  GiSpellBook,
  GiSwordman,
} from 'react-icons/gi';
import { LuMenu } from 'react-icons/lu';
import { DialogResourceID } from '@/edf';
import { useClient } from '@/ui/context';
import { type DialogId, useWindowManager } from '@/ui/in-game';
import { HUD_Z } from './consts';

function useExitGame() {
  const client = useClient();
  return useCallback(() => {
    const strings = client.getDialogStrings(
      DialogResourceID.EXIT_GAME_ARE_YOU_SURE,
    );
    client.alertController.showConfirm(strings[0], strings[1], (confirmed) => {
      if (confirmed) client.disconnect();
    });
  }, [client]);
}

type NavButton = {
  id: DialogId;
  label: string;
  Icon: preact.ComponentType<{ size?: number }>;
};

const NAV_BUTTONS: NavButton[] = [
  { id: 'inventory', label: 'Inventory', Icon: GiBackpack },
  { id: 'map', label: 'Map', Icon: GiCompass },
  { id: 'spells', label: 'Spells', Icon: GiSpellBook },
  { id: 'stats', label: 'Stats', Icon: GiSwordman },
  { id: 'quests', label: 'Quests', Icon: GiScrollUnfurled },
  { id: 'settings', label: 'Settings', Icon: GiGears },
];

export function NavSidebar() {
  const { openDialog, closeDialog, isOpen } = useWindowManager();
  const exitGame = useExitGame();

  return (
    <div
      role='presentation'
      class='hidden md:flex absolute right-0 top-0 bottom-0 flex-col items-end justify-center gap-1 pr-0 pointer-events-none'
      style={{ zIndex: HUD_Z }}
    >
      <div
        class='pointer-events-auto flex flex-col gap-1'
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.stopPropagation()}
      >
        {NAV_BUTTONS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type='button'
            class='btn btn-xs btn-neutral w-14 flex flex-col items-center gap-0.5 h-auto py-1.5'
            onClick={() => (isOpen(id) ? closeDialog(id) : openDialog(id))}
            title={label}
          >
            <Icon size={16} />
            <span class='text-[9px] leading-none'>{label}</span>
          </button>
        ))}
        <button
          type='button'
          class='btn btn-xs btn-neutral w-14 flex flex-col items-center gap-0.5 h-auto py-1.5 mt-1'
          onClick={exitGame}
          title='Exit Game'
        >
          <span class='text-base leading-none'>←</span>
          <span class='text-[9px] leading-none'>Exit</span>
        </button>
      </div>
    </div>
  );
}

/** Mobile-only floating hamburger menu (below HUD strip, right edge). */
export function MobileNav() {
  const { openDialog, closeDialog, isOpen } = useWindowManager();
  const exitGame = useExitGame();
  const [open, setOpen] = useState(false);

  return (
    <div class='md:hidden absolute top-8 right-1' style={{ zIndex: HUD_Z }}>
      <div
        role='presentation'
        class='relative'
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.stopPropagation()}
      >
        <button
          type='button'
          class='btn btn-xs btn-neutral px-2'
          onClick={() => setOpen((o) => !o)}
          aria-label='Menu'
        >
          <LuMenu size={14} />
        </button>

        {open && (
          <div
            class='absolute right-0 top-full mt-1 rounded-lg shadow-xl flex flex-col p-1 min-w-[8rem]'
            style={{
              background: 'rgba(15,23,42,0.97)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {NAV_BUTTONS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type='button'
                class={`flex items-center gap-2 px-2 py-1.5 text-xs rounded text-left text-white transition-colors ${
                  isOpen(id) ? 'bg-white/15' : 'hover:bg-white/10'
                }`}
                onClick={() => {
                  isOpen(id) ? closeDialog(id) : openDialog(id);
                  setOpen(false);
                }}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
            <div
              class='my-0.5'
              style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
            />
            <button
              type='button'
              class='flex items-center gap-2 px-2 py-1.5 text-xs rounded text-left text-red-400 hover:bg-red-500/15 transition-colors w-full'
              onClick={() => {
                setOpen(false);
                exitGame();
              }}
            >
              <span class='text-sm leading-none'>←</span>
              Exit Game
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
