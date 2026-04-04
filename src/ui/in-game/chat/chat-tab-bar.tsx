import { useCallback, useRef } from 'preact/hooks';
import { LuX } from 'react-icons/lu';
import type { ChatDialogId } from '@/ui/in-game';
import { ChatContextMenu, useContextMenu } from './chat-context-menu';
import type { ChatTabConfig } from './chat-manager';
import { useChatManager } from './chat-manager';

type Props = {
  dialogId: ChatDialogId;
  tabs: ChatTabConfig[];
  activeTabId: string;
  /** When true, non-default tabs show a close (×) button. */
  isMain?: boolean;
};

export function ChatTabBar({
  dialogId,
  tabs,
  activeTabId,
  isMain = false,
}: Props) {
  const { setActiveTab, closeTab, unreadTabs } = useChatManager();
  const { menu, openMenu, closeMenu } = useContextMenu();

  const handleContextMenu = useCallback(
    (e: MouseEvent, tab: ChatTabConfig) => {
      e.preventDefault();
      e.stopPropagation();
      openMenu(e.clientX, e.clientY, tab);
    },
    [openMenu],
  );

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleLongPressStart = useCallback(
    (e: PointerEvent, tab: ChatTabConfig) => {
      longPressTimer.current = setTimeout(() => {
        openMenu(e.clientX, e.clientY, tab);
      }, 500);
    },
    [openMenu],
  );
  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  return (
    <>
      <div class='flex items-center gap-0.5 min-w-0 overflow-hidden'>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isCloseable =
            isMain && tab.id !== 'general' && tab.id !== 'system';
          const hasUnread = !isActive && unreadTabs.has(tab.id);
          return (
            <div
              key={tab.id}
              class={`flex items-center min-w-0 shrink rounded transition-colors select-none ${
                isActive ? 'bg-white/20' : 'hover:bg-white/10'
              }`}
              style={{ maxWidth: '8rem' }}
            >
              <button
                type='button'
                class={`flex items-center gap-1 min-w-0 flex-1 px-2 py-0.5 text-xs ${isActive ? 'font-semibold' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab(dialogId, tab.id);
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  handleLongPressStart(e, tab);
                }}
                onPointerUp={clearLongPress}
                onPointerCancel={clearLongPress}
                onContextMenu={(e) => handleContextMenu(e, tab)}
              >
                <span class='truncate'>{tab.name}</span>
                {hasUnread && (
                  <span class='flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400' />
                )}
              </button>
              {isCloseable && (
                <button
                  type='button'
                  class='flex-shrink-0 opacity-50 hover:opacity-100 leading-none pr-1'
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id, dialogId);
                  }}
                  tabIndex={-1}
                  aria-label={`Close ${tab.name}`}
                >
                  <LuX size={10} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {menu && (
        <ChatContextMenu
          x={menu.x}
          y={menu.y}
          tab={menu.tab}
          dialogId={dialogId}
          onClose={closeMenu}
        />
      )}
    </>
  );
}
