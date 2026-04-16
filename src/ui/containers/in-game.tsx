import { useCallback, useEffect, useState } from 'preact/hooks';
import { CHAT_Z, DIALOG_Z } from '@/ui/consts';
import { useClient } from '@/ui/context';
import type { DialogId } from '@/ui/in-game';
import {
  CharacterDialog,
  ChatDialog,
  ChatLogDialog,
  ChatManagerProvider,
  CommandPalette,
  DialogArena,
  HotBar,
  HotbarProvider,
  InventoryDialog,
  ItemDragProvider,
  MobileNav,
  NavSidebar,
  PlayerHud,
  QuestsDialog,
  SettingsDialog,
  SpellsDialog,
  StatusMessages,
  TouchActionButtons,
  TouchJoystick,
  useWindowManager,
  WindowManagerProvider,
} from '@/ui/in-game';

const ALL_DIALOG_IDS: DialogId[] = [
  'inventory',
  'spells',
  'character',
  'quests',
  'settings',
  'chat-log',
];

function DialogById({ id }: { id: DialogId }) {
  switch (id) {
    case 'inventory':
      return <InventoryDialog />;
    case 'spells':
      return <SpellsDialog />;
    case 'character':
      return <CharacterDialog />;
    case 'quests':
      return <QuestsDialog />;
    case 'settings':
      return <SettingsDialog />;
    case 'chat-log':
      return <ChatLogDialog />;
  }
}

function InGameContent() {
  const client = useClient();
  const { isOpen, getLayout, openDialog } = useWindowManager();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Chat dialogs are always considered open — they manage their own visibility.
  const open = ALL_DIALOG_IDS.filter((id) => isOpen(id));
  const manual = open.filter((id) => getLayout(id) === 'manual');
  const autoCenter = open.filter((id) => getLayout(id) === 'center');

  useEffect(() => {
    client.socialController.subscribePaperdollOpened(() => {
      openDialog('character');
    });

    client.on('toggleCommandPalette', () => {
      setCommandPaletteOpen((open) => {
        if (!open) {
          client.typing = true;
        }

        return !open;
      });
    });
  }, [client, setCommandPaletteOpen]);

  const onCommandPaletteClose = useCallback(() => {
    client.typing = false;
    setCommandPaletteOpen(false);
  }, [client]);

  return (
    <>
      {commandPaletteOpen && <CommandPalette onClose={onCommandPaletteClose} />}
      <PlayerHud />
      <MobileNav />
      <NavSidebar />
      <StatusMessages />
      <TouchJoystick />
      <TouchActionButtons />

      {autoCenter.length > 0 && (
        <DialogArena
          ids={autoCenter}
          renderDialog={(id) => <DialogById id={id} />}
          class='pointer-events-none absolute inset-x-0 top-8 bottom-0 lg:right-14'
          style={{ zIndex: DIALOG_Z }}
        />
      )}

      {/* Desktop bottom bar: chat left | hotbar centered | spacer right */}
      <div
        class='pointer-events-none absolute inset-x-0 bottom-0 hidden items-end px-2 pb-2 lg:flex'
        style={{ zIndex: CHAT_Z }}
      >
        <div class='pointer-events-auto flex flex-1 items-end justify-start'>
          <ChatDialog />
        </div>
        <div class='pointer-events-none flex flex-1 justify-center'>
          <div class='pointer-events-auto'>
            <HotBar />
          </div>
        </div>
        <div class='flex-1' />
      </div>

      {/* Mobile: chat at top below HUD */}
      <div
        class='pointer-events-none absolute inset-x-0 top-0 flex justify-start pt-10 lg:hidden'
        style={{ zIndex: CHAT_Z }}
      >
        <div class='pointer-events-auto'>
          <ChatDialog />
        </div>
      </div>

      {/* Mobile: hotbar at bottom center */}
      <div
        class='pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-2 lg:hidden'
        style={{ zIndex: CHAT_Z }}
      >
        <div class='pointer-events-auto'>
          <HotBar />
        </div>
      </div>

      {/* Manually dragged dialogs */}
      {manual.map((id) => (
        <DialogById key={id} id={id} />
      ))}
    </>
  );
}

export function InGame() {
  const client = useClient();
  return (
    <ItemDragProvider>
      <HotbarProvider>
        <WindowManagerProvider>
          <ChatManagerProvider characterId={client.characterId}>
            <InGameContent />
          </ChatManagerProvider>
        </WindowManagerProvider>
      </HotbarProvider>
    </ItemDragProvider>
  );
}
