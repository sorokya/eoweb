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
import { Button } from '@/ui/components';
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
      class='pointer-events-none absolute top-0 right-0 bottom-0 hidden flex-col items-end justify-center gap-1 pr-0 md:flex'
      style={{ zIndex: HUD_Z }}
    >
      <div
        class='pointer-events-auto flex flex-col gap-1'
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.stopPropagation()}
      >
        {NAV_BUTTONS.map(({ id, label, Icon }) => (
          <Button
            key={id}
            variant={['xs', 'neutral']}
            class='flex h-auto w-14 flex-col items-center gap-0.5 py-1.5'
            onClick={() => (isOpen(id) ? closeDialog(id) : openDialog(id))}
            label={label}
          >
            <Icon size={16} />
            <span class='text-[9px] leading-none'>{label}</span>
          </Button>
        ))}
        <Button
          variant={['xs', 'neutral']}
          class='mt-1 flex h-auto w-14 flex-col items-center gap-0.5 py-1.5'
          onClick={exitGame}
          label='Exit Game'
        >
          <span class='text-base leading-none'>←</span>
          <span class='text-[9px] leading-none'>Exit</span>
        </Button>
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
    <div class='absolute top-8 right-1 md:hidden' style={{ zIndex: HUD_Z }}>
      <div
        role='presentation'
        class='relative'
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.stopPropagation()}
      >
        <Button
          variant={['xs', 'neutral']}
          class='px-2'
          onClick={() => setOpen((o) => !o)}
          label='Menu'
        >
          <LuMenu size={14} />
        </Button>

        {open && (
          <ul
            class='menu menu-sm absolute top-full right-0 z-50 mt-1 min-w-32 rounded-box border border-base-content/10 bg-base-300/90 p-1 shadow-xl backdrop-blur-sm'
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {NAV_BUTTONS.map(({ id, label, Icon }) => (
              <li key={id}>
                <button
                  type='button'
                  class={isOpen(id) ? 'bg-base-content/15' : ''}
                  onClick={() => {
                    isOpen(id) ? closeDialog(id) : openDialog(id);
                    setOpen(false);
                  }}
                >
                  <Icon size={13} />
                  {label}
                </button>
              </li>
            ))}
            <li>
              <div class='divider my-0' />
            </li>
            <li>
              <button
                type='button'
                class='text-error'
                onClick={() => {
                  setOpen(false);
                  exitGame();
                }}
              >
                <span class='text-sm leading-none'>←</span>
                Exit Game
              </button>
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}
