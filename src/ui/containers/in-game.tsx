import { useCallback, useEffect, useState } from 'preact/hooks';
import { CHAT_Z, DIALOG_Z } from '@/ui/consts';
import { useClient } from '@/ui/context';
import type { DialogId } from '@/ui/in-game';
import {
  BankDialog,
  CharacterDialog,
  ChatDialog,
  ChatLogDialog,
  ChatManagerProvider,
  ChestDialog,
  CommandPalette,
  DialogArena,
  HotBar,
  HotbarProvider,
  InventoryDialog,
  ItemDragProvider,
  JukeboxDialog,
  LockerDialog,
  MobileNav,
  NavSidebar,
  PlayerHud,
  QuestsDialog,
  SettingsDialog,
  ShopDialog,
  SocialDialog,
  SpellsDialog,
  StatusMessages,
  TouchActionButtons,
  TouchJoystick,
  useWindowManager,
  WindowManagerProvider,
} from '@/ui/in-game';

const ALL_DIALOG_IDS: DialogId[] = [
  'bank',
  'shop',
  'inventory',
  'spells',
  'character',
  'quests',
  'jukebox',
  'settings',
  'chat-log',
  'social',
  'chest',
  'locker',
];

function DialogById({ id }: { id: DialogId }) {
  switch (id) {
    case 'bank':
      return <BankDialog />;
    case 'inventory':
      return <InventoryDialog />;
    case 'shop':
      return <ShopDialog />;
    case 'spells':
      return <SpellsDialog />;
    case 'character':
      return <CharacterDialog />;
    case 'quests':
      return <QuestsDialog />;
    case 'jukebox':
      return <JukeboxDialog />;
    case 'settings':
      return <SettingsDialog />;
    case 'chat-log':
      return <ChatLogDialog />;
    case 'social':
      return <SocialDialog />;
    case 'chest':
      return <ChestDialog />;
    case 'locker':
      return <LockerDialog />;
  }
}

function InGameContent() {
  const client = useClient();
  const { isOpen, getLayout, openDialog, closeDialog } = useWindowManager();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Chat dialogs are always considered open — they manage their own visibility.
  const open = ALL_DIALOG_IDS.filter((id) => isOpen(id));

  useEffect(() => {
    const onPaperdollOpened = () => {
      openDialog('character');
    };
    client.socialController.subscribePaperdollOpened(onPaperdollOpened);

    const onJukeboxOpened = () => {
      openDialog('jukebox');
    };
    client.jukeboxController.subscribeOpened(onJukeboxOpened);

    const onJukeboxRequestSucceeded = () => {
      closeDialog('jukebox');
    };
    client.jukeboxController.subscribeRequestSucceeded(
      onJukeboxRequestSucceeded,
    );

    const handleChestOpened = () => {
      openDialog('chest');
    };
    client.chestController.subscribeOpened(handleChestOpened);

    const handleLockerOpened = () => {
      openDialog('locker');
    };
    client.lockerController.subscribeOpened(handleLockerOpened);

    const handleBankOpened = () => {
      openDialog('bank');
    };
    client.bankController.subscribeOpened(handleBankOpened);

    const handleShopOpened = () => {
      openDialog('shop');
    };
    client.shopController.subscribeOpened(handleShopOpened);

    const handleWalked = () => {
      closeDialog('bank');
      closeDialog('shop');
      closeDialog('chest');
      closeDialog('locker');
    };
    client.movementController.subscribeWalked(handleWalked);

    const handleToggleCommandPalette = () => {
      setCommandPaletteOpen((open) => {
        if (!open) {
          client.typing = true;
        }

        return !open;
      });
    };
    client.on('toggleCommandPalette', handleToggleCommandPalette);

    return () => {
      client.socialController.unsubscribePaperdollOpened(onPaperdollOpened);
      client.jukeboxController.unsubscribeOpened(onJukeboxOpened);
      client.jukeboxController.unsubscribeRequestSucceeded(
        onJukeboxRequestSucceeded,
      );
      client.chestController.unsubscribeOpened(handleChestOpened);
      client.lockerController.unsubscribeOpened(handleLockerOpened);
      client.bankController.unsubscribeOpened(handleBankOpened);
      client.shopController.unsubscribeOpened(handleShopOpened);
      client.movementController.unsubscribeWalked(handleWalked);
      client.off('toggleCommandPalette', handleToggleCommandPalette);
    };
  }, [client, setCommandPaletteOpen, openDialog, closeDialog]);

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

      {open.length > 0 && (
        <DialogArena
          ids={open}
          isManual={(id) => getLayout(id) === 'manual'}
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
