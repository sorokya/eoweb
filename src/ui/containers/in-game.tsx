import type { SkillLearn } from 'eolib';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { TradeState } from '@/game-state';
import {
  CHAT_Z,
  DIALOG_Z,
  DRAG_HOTBAR_Z,
  HUD_Z,
  PARTY_PANEL_Z,
} from '@/ui/consts';
import { useClient } from '@/ui/context';
import type { DialogId } from '@/ui/in-game';
import {
  BankDialog,
  BarberDialog,
  BoardDialog,
  CharacterDialog,
  ChatDialog,
  ChatLogDialog,
  ChatManagerProvider,
  ChestDialog,
  CommandPalette,
  DesktopEmoteButton,
  DialogArena,
  GuildDialog,
  HotBar,
  InnKeeperDialog,
  InventoryDialog,
  ItemDragProvider,
  JukeboxDialog,
  LawDialog,
  LockerDialog,
  MobileNav,
  NavSidebar,
  PacketLogDialog,
  PartyPanel,
  PingDialog,
  PlayerHud,
  QuestNpcDialog,
  QuestsDialog,
  QuestTracker,
  SettingsDialog,
  ShopDialog,
  SkillMasterDialog,
  SocialDialog,
  SpellsDialog,
  StatusMessages,
  TouchActionButtons,
  TouchJoystick,
  TradeDialog,
  useItemDrag,
  useWindowManager,
  WindowManagerProvider,
} from '@/ui/in-game';

const ALL_DIALOG_IDS: DialogId[] = [
  'bank',
  'barber',
  'board',
  'guild',
  'shop',
  'inventory',
  'spells',
  'character',
  'quests',
  'questNpc',
  'jukebox',
  'settings',
  'chat-log',
  'social',
  'chest',
  'locker',
  'skillMaster',
  'innKeeper',
  'law',
  'packet-log',
  'ping',
  'trade',
];

function DialogById({ id }: { id: DialogId }) {
  switch (id) {
    case 'bank':
      return <BankDialog />;
    case 'barber':
      return <BarberDialog />;
    case 'board':
      return <BoardDialog />;
    case 'guild':
      return <GuildDialog />;
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
    case 'questNpc':
      return <QuestNpcDialog />;
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
    case 'skillMaster':
      return <SkillMasterDialog />;
    case 'innKeeper':
      return <InnKeeperDialog />;
    case 'law':
      return <LawDialog />;
    case 'packet-log':
      return <PacketLogDialog />;
    case 'ping':
      return <PingDialog />;
    case 'trade':
      return <TradeDialog />;
  }
}

function InGameContent() {
  const client = useClient();
  const { isOpen, getLayout, openDialog, closeDialog } = useWindowManager();
  const { currentDrag } = useItemDrag();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const isDragging = currentDrag !== null;

  // Chat dialogs are always considered open — they manage their own visibility.
  const open = ALL_DIALOG_IDS.filter((id) => isOpen(id));

  // On mount: fetch initial quest progress
  useEffect(() => {
    client.questController.refreshQuestProgress();
  }, [client]);

  useEffect(() => {
    const onPaperdollOpened = () => {
      openDialog('character');
    };
    client.socialController.subscribePaperdollOpened(onPaperdollOpened);

    const onBookOpened = () => {
      openDialog('character');
    };
    client.socialController.subscribeBookOpened(onBookOpened);

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

    const handleBarberOpened = () => {
      openDialog('barber');
    };
    client.barberController.subscribeOpened(handleBarberOpened);

    const handleBarberPurchased = () => {
      closeDialog('barber');
    };
    client.barberController.subscribePurchased(handleBarberPurchased);

    const handleShopOpened = () => {
      openDialog('shop');
    };
    client.shopController.subscribeOpened(handleShopOpened);

    const handleSkillMasterOpened = (_name: string, _skills: SkillLearn[]) => {
      openDialog('skillMaster');
    };
    client.statSkillController.subscribeOpened(handleSkillMasterOpened);

    const handleInnKeeperOpened = () => {
      openDialog('innKeeper');
    };
    client.innController.subscribeOpened(handleInnKeeperOpened);

    const handleLawyerOpened = () => {
      openDialog('law');
    };
    client.marriageController.subscribeLawyerOpen(handleLawyerOpened);

    const handleBoardOpened = () => {
      openDialog('board');
    };
    client.boardController.subscribeBoardOpened(handleBoardOpened);

    const handleGuildOpened = () => {
      openDialog('guild');
    };
    client.guildController.subscribeOpened(handleGuildOpened);

    const handleTradeOpened = () => {
      if (client.tradeController.state === TradeState.Open) {
        openDialog('trade');
      } else if (client.tradeController.state === TradeState.None) {
        closeDialog('trade');
      }
    };
    client.tradeController.subscribe(handleTradeOpened);

    const handleQuestDialogOpened = () => {
      openDialog('questNpc');
    };
    client.questController.subscribeDialogOpened(handleQuestDialogOpened);

    const handleWalked = () => {
      closeDialog('bank');
      closeDialog('barber');
      closeDialog('board');
      closeDialog('guild');
      closeDialog('shop');
      closeDialog('chest');
      closeDialog('locker');
      closeDialog('skillMaster');
      closeDialog('innKeeper');
      closeDialog('law');
      closeDialog('questNpc');
      client.questController.resetDialog();
      closeDialog('trade');
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
    client.keyboardController.subscribeToggleCommandPalette(
      handleToggleCommandPalette,
    );

    return () => {
      client.socialController.unsubscribePaperdollOpened(onPaperdollOpened);
      client.socialController.unsubscribeBookOpened(onBookOpened);
      client.jukeboxController.unsubscribeOpened(onJukeboxOpened);
      client.jukeboxController.unsubscribeRequestSucceeded(
        onJukeboxRequestSucceeded,
      );
      client.chestController.unsubscribeOpened(handleChestOpened);
      client.lockerController.unsubscribeOpened(handleLockerOpened);
      client.bankController.unsubscribeOpened(handleBankOpened);
      client.barberController.unsubscribeOpened(handleBarberOpened);
      client.barberController.unsubscribePurchased(handleBarberPurchased);
      client.shopController.unsubscribeOpened(handleShopOpened);
      client.statSkillController.unsubscribeOpened(handleSkillMasterOpened);
      client.innController.unsubscribeOpened(handleInnKeeperOpened);
      client.marriageController.unsubscribeLawyerOpen(handleLawyerOpened);
      client.boardController.unsubscribeBoardOpened(handleBoardOpened);
      client.guildController.unsubscribeOpened(handleGuildOpened);
      client.questController.unsubscribeDialogOpened(handleQuestDialogOpened);
      client.tradeController.unsubscribe(handleTradeOpened);
      client.movementController.unsubscribeWalked(handleWalked);
      client.keyboardController.unsubscribeToggleCommandPalette(
        handleToggleCommandPalette,
      );
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
      {/* Upper-left overlay region */}
      <div
        class='pointer-events-none absolute top-9 left-1 flex flex-col items-start lg:top-9'
        style={{ zIndex: PARTY_PANEL_Z }}
      >
        <div class='pointer-events-auto'>
          <PartyPanel />
        </div>
      </div>
      {/* Upper-right overlay region */}
      <div
        class='pointer-events-none absolute top-18 right-1 flex flex-col items-end lg:top-9'
        style={{ zIndex: HUD_Z }}
      >
        <div class='pointer-events-auto'>
          <QuestTracker />
        </div>
      </div>
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
        style={{ zIndex: isDragging ? DRAG_HOTBAR_Z : CHAT_Z }}
      >
        <div class='pointer-events-auto flex flex-1 items-end justify-start'>
          <ChatDialog position='bottom' />
        </div>
        <div class='pointer-events-none flex flex-1 justify-center'>
          <div class='pointer-events-auto'>
            <HotBar />
          </div>
        </div>
        <div class='pointer-events-auto flex flex-1 items-end justify-start'>
          <DesktopEmoteButton />
        </div>
      </div>

      {/* Mobile: chat at top below HUD — centered to avoid overlapping side panels */}
      <div
        class='pointer-events-none absolute inset-x-0 top-0 flex justify-center pt-10 lg:hidden'
        style={{ zIndex: CHAT_Z }}
      >
        <div class='pointer-events-auto'>
          <ChatDialog position='top' />
        </div>
      </div>

      {/* Mobile: hotbar at bottom center */}
      <div
        class='pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-2 lg:hidden'
        style={{ zIndex: isDragging ? DRAG_HOTBAR_Z : CHAT_Z }}
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
      <WindowManagerProvider>
        <ChatManagerProvider characterId={client.characterId}>
          <InGameContent />
        </ChatManagerProvider>
      </WindowManagerProvider>
    </ItemDragProvider>
  );
}
