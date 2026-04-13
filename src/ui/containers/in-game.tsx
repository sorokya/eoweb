import { useClient } from '@/ui/context';
import type { ChatDialogId, DialogId } from '@/ui/in-game';
import {
  CharacterDialog,
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
  StatusMessages,
  useChatManager,
  useWindowManager,
  WindowManagerProvider,
} from '@/ui/in-game';

const ALL_DIALOG_IDS: DialogId[] = [
  'inventory',
  'map',
  'spells',
  'character',
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
    case 'character':
      return <CharacterDialog />;
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
          <div class='pointer-events-auto flex flex-row items-start gap-3'>
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
          <div class='pointer-events-auto flex flex-row items-start gap-3'>
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
          <div class='pointer-events-auto flex flex-row-reverse items-start gap-3'>
            {autoRight.map((id) => (
              <DialogById key={id} id={id} />
            ))}
          </div>
        </div>
      )}

      {/* Desktop bottom bar: chat left | hotbar centered | spacer right */}
      <div
        class='pointer-events-none absolute inset-x-0 bottom-0 hidden items-end px-2 pb-2 md:flex'
        style={{ zIndex: DIALOG_Z }}
      >
        <div class='pointer-events-auto flex flex-1 items-end justify-start'>
          {chatDialogIds.map((id) => (
            <DialogById key={id} id={id as DialogId} />
          ))}
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
        class='pointer-events-none absolute inset-x-0 top-0 flex justify-start pt-8 md:hidden'
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
        class='pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-2 md:hidden'
        style={{ zIndex: DIALOG_Z }}
      >
        <div class='pointer-events-auto'>
          <HotBar />
        </div>
      </div>

      {/* Minimized strip */}
      {minimized.length > 0 && (
        <div
          class='pointer-events-none absolute inset-0 flex flex-col items-start justify-center gap-1 pl-1'
          style={{ zIndex: DIALOG_Z }}
        >
          <div class='pointer-events-auto flex flex-col items-start gap-1'>
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
