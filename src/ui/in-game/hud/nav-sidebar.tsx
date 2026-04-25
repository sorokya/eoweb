import { useCallback, useState } from 'preact/hooks';
import {
  GiBackpack,
  GiCompass,
  GiGears,
  GiScrollUnfurled,
  GiSpellBook,
  GiSwordman,
  GiThreeFriends,
} from 'react-icons/gi';
import { LuLogOut, LuMenu } from 'react-icons/lu';
import { DialogResourceID } from '@/edf';
import { playSfxById, SfxId } from '@/sfx';
import { Button } from '@/ui/components';
import { HUD_Z, SIDEMENU_Z, UI_PANEL_BORDER, UI_STICKY_BG } from '@/ui/consts';
import { useClient } from '@/ui/context';
import { type DialogId, useBackdropBlur, useWindowManager } from '@/ui/in-game';

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

type NavDialogButton = {
  id: string;
  label: string;
  Icon: preact.ComponentType<{ size?: number }>;
};

const NAV_BUTTONS: NavDialogButton[] = [
  { id: 'inventory', label: 'Inventory', Icon: GiBackpack },
  { id: 'map', label: 'Map', Icon: GiCompass },
  { id: 'spells', label: 'Spells', Icon: GiSpellBook },
  { id: 'character', label: 'Character', Icon: GiSwordman },
  { id: 'quests', label: 'Quests', Icon: GiScrollUnfurled },
  { id: 'social', label: 'Social', Icon: GiThreeFriends },
  { id: 'settings', label: 'Settings', Icon: GiGears },
];

export function NavSidebar() {
  const client = useClient();
  const { openDialog: wmOpenDialog, closeDialog, isOpen } = useWindowManager();
  const exitGame = useExitGame();

  const openDialog = useCallback(
    (id: DialogId) => {
      if (id === 'character') {
        client.socialController.requestPaperdoll(client.playerId);
        return;
      }

      wmOpenDialog(id);
    },
    [wmOpenDialog, client],
  );

  const handleNavClick = useCallback(
    (id: string) => {
      playSfxById(SfxId.ButtonClick);
      if (id === 'map') {
        client.toggleMinimap();
        return;
      }

      const dialogId = id as DialogId;
      if (isOpen(dialogId)) {
        closeDialog(dialogId);
      } else {
        openDialog(dialogId);
      }
    },
    [isOpen, closeDialog, openDialog, client],
  );

  return (
    <div
      role='presentation'
      class='pointer-events-none absolute top-0 right-0 bottom-0 hidden flex-col items-end justify-center gap-1 pr-0 lg:flex'
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
            variant={['xs']}
            class='flex h-auto w-14 flex-col items-center gap-0.5 py-1.5'
            onClick={() => handleNavClick(id)}
            label={label}
          >
            <Icon size={16} />
            <span class='text-[9px] leading-none'>{label}</span>
          </Button>
        ))}
        <Button
          variant={['xs']}
          class='mt-1 flex h-auto w-14 flex-col items-center gap-0.5 py-1.5'
          onClick={exitGame}
          label='Exit Game'
        >
          <LuLogOut size={16} />
          <span class='text-[9px] leading-none'>Exit</span>
        </Button>
      </div>
    </div>
  );
}

/** Mobile-only floating hamburger menu (below HUD strip, right edge). */
export function MobileNav() {
  const client = useClient();
  const { openDialog: wmOpenDialog, closeDialog, isOpen } = useWindowManager();
  const exitGame = useExitGame();
  const [open, setOpen] = useState(false);
  const blur = useBackdropBlur();

  const openDialog = useCallback(
    (id: DialogId) => {
      if (id === 'character') {
        client.socialController.requestPaperdoll(client.playerId);
        return;
      }

      wmOpenDialog(id);
    },
    [wmOpenDialog, client],
  );

  const handleNavClick = useCallback(
    (id: string) => {
      playSfxById(SfxId.ButtonClick);
      if (id === 'map') {
        client.toggleMinimap();
        return;
      }

      const dialogId = id as DialogId;
      if (isOpen(dialogId)) {
        closeDialog(dialogId);
      } else {
        openDialog(dialogId);
      }
    },
    [isOpen, closeDialog, openDialog, client],
  );

  return (
    <div
      class='absolute top-9 right-1 lg:hidden'
      style={{ zIndex: open ? SIDEMENU_Z : HUD_Z }}
    >
      <div
        role='presentation'
        class='relative'
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.stopPropagation()}
      >
        <Button
          variant={['xs']}
          class='px-2'
          onClick={() => setOpen((o) => !o)}
          label='Menu'
        >
          <LuMenu size={14} />
        </Button>

        {open && (
          <ul
            class={`menu menu-sm absolute top-full right-0 z-50 mt-1 min-w-32 rounded-box border ${UI_PANEL_BORDER} ${UI_STICKY_BG} p-1 shadow-xl ${blur}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {NAV_BUTTONS.map(({ id, label, Icon }) => (
              <li key={id}>
                <button
                  type='button'
                  onClick={() => {
                    handleNavClick(id);
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
                <LuLogOut size={13} />
                Exit Game
              </button>
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}
