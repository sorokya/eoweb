import { useClient } from '@/ui/context';
import type { ChatDialogId, DialogId } from '@/ui/in-game';
import {
  ChatDialog,
  ChatManagerProvider,
  HotBar,
  InventoryDialog,
  MapDialog,
  MobileNav,
  NavSidebar,
  PlayerHud,
  QuestsDialog,
  SettingsDialog,
  SpellsDialog,
  StatsDialog,
  StatusMessages,
  useChatManager,
  useWindowManager,
  WindowManagerProvider,
} from '@/ui/in-game';

const ALL_DIALOG_IDS: DialogId[] = [
  'inventory',
  'map',
  'spells',
  'stats',
  'quests',
  'settings',
];

function DialogById({ id }: { id: DialogId }) {
  if (id.startsWith('chat-')) {
    return <ChatDialog id={id as ChatDialogId} />;
  }
  switch (id) {
    case 'inventory':
      return <InventoryDialog />;
    case 'map':
      return <MapDialog />;
    case 'spells':
      return <SpellsDialog />;
    case 'stats':
      return <StatsDialog />;
    case 'quests':
      return <QuestsDialog />;
    case 'settings':
      return <SettingsDialog />;
  }
}

const DIALOG_Z = 20;

function InGameContent() {
  const { isOpen, isMinimized, getLayout } = useWindowManager();
  const { dialogs: chatDialogs } = useChatManager();

  const chatDialogIds = chatDialogs.map((d) => d.id);
  const allDialogIds: DialogId[] = [...ALL_DIALOG_IDS, ...chatDialogIds];

  // Chat dialogs are always considered open — they manage their own visibility.
  const open = allDialogIds.filter((id) =>
    id.startsWith('chat-') ? true : isOpen(id),
  );
  const minimized = open.filter((id) => isMinimized(id));
  const nonMinimized = open.filter((id) => !isMinimized(id));
  const manual = nonMinimized.filter(
    (id) => !id.startsWith('chat-') && getLayout(id) === 'manual',
  );
  const autoLeft = nonMinimized.filter(
    (id) => !id.startsWith('chat-') && getLayout(id) === 'left',
  );
  const autoCenter = nonMinimized.filter(
    (id) => !id.startsWith('chat-') && getLayout(id) === 'center',
  );
  const autoRight = nonMinimized.filter(
    (id) => !id.startsWith('chat-') && getLayout(id) === 'right',
  );

  return (
    <>
      <PlayerHud />
      <MobileNav />
      <NavSidebar />
      <StatusMessages />

      {autoLeft.length > 0 && (
        <div
          class='pointer-events-none absolute inset-0 flex items-center justify-start pl-5'
          style={{ zIndex: DIALOG_Z }}
        >
          <div class='pointer-events-auto flex flex-row gap-3 items-start'>
            {autoLeft.map((id) => (
              <DialogById key={id} id={id} />
            ))}
          </div>
        </div>
      )}

      {autoCenter.length > 0 && (
        <div
          class='pointer-events-none absolute inset-0 flex items-center justify-center'
          style={{ zIndex: DIALOG_Z }}
        >
          <div class='pointer-events-auto flex flex-row gap-3 items-start'>
            {autoCenter.map((id) => (
              <DialogById key={id} id={id} />
            ))}
          </div>
        </div>
      )}

      {autoRight.length > 0 && (
        <div
          class='pointer-events-none absolute inset-0 flex items-center justify-end pr-5'
          style={{ zIndex: DIALOG_Z }}
        >
          <div class='pointer-events-auto flex flex-row-reverse gap-3 items-start'>
            {autoRight.map((id) => (
              <DialogById key={id} id={id} />
            ))}
          </div>
        </div>
      )}

      {/* Desktop bottom bar: chat left | hotbar centered | spacer right */}
      <div
        class='pointer-events-none hidden md:flex absolute inset-x-0 bottom-0 pb-2 px-2 items-end'
        style={{ zIndex: DIALOG_Z }}
      >
        <div class='flex-1 pointer-events-auto flex justify-start items-end'>
          {chatDialogIds.map((id) => (
            <DialogById key={id} id={id as DialogId} />
          ))}
        </div>
        <div class='flex-1 pointer-events-none flex justify-center'>
          <div class='pointer-events-auto'>
            <HotBar />
          </div>
        </div>
        <div class='flex-1' />
      </div>

      {/* Mobile: chat at top below HUD */}
      <div
        class='md:hidden pointer-events-none absolute inset-x-0 top-0 pt-8 flex justify-start'
        style={{ zIndex: DIALOG_Z }}
      >
        <div class='pointer-events-auto'>
          {chatDialogIds.map((id) => (
            <DialogById key={id} id={id as DialogId} />
          ))}
        </div>
      </div>

      {/* Mobile: hotbar at bottom center */}
      <div
        class='md:hidden pointer-events-none absolute inset-x-0 bottom-0 pb-2 flex justify-center'
        style={{ zIndex: DIALOG_Z }}
      >
        <div class='pointer-events-auto'>
          <HotBar />
        </div>
      </div>

      {/* Minimized strip */}
      {minimized.length > 0 && (
        <div
          class='pointer-events-none absolute inset-0 flex flex-col items-start justify-center pl-1 gap-1'
          style={{ zIndex: DIALOG_Z }}
        >
          <div class='pointer-events-auto flex flex-col gap-1 items-start'>
            {minimized.map((id) => (
              <DialogById key={id} id={id} />
            ))}
          </div>
        </div>
      )}

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
    <WindowManagerProvider>
      <ChatManagerProvider characterId={client.characterId}>
        <InGameContent />
      </ChatManagerProvider>
    </WindowManagerProvider>
  );
}
