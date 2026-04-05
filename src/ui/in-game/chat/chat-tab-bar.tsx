import { useCallback } from 'preact/hooks';
import { LuX } from 'react-icons/lu';
import type { ChatDialogId } from '@/ui/in-game';
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

  const handleTabClick = useCallback(
    (e: MouseEvent, tabId: string) => {
      e.stopPropagation();
      setActiveTab(dialogId, tabId);
    },
    [dialogId, setActiveTab],
  );

  const handleCloseClick = useCallback(
    (e: MouseEvent, tabId: string) => {
      e.stopPropagation();
      closeTab(tabId, dialogId);
    },
    [dialogId, closeTab],
  );

  return (
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
              isActive ? 'bg-base-content/20' : 'hover:bg-base-content/10'
            }`}
            style={{ maxWidth: '8rem' }}
          >
            <button
              type='button'
              class={`flex items-center gap-1 min-w-0 flex-1 px-2 py-0.5 text-xs ${isActive ? 'font-semibold' : ''}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => handleTabClick(e, tab.id)}
            >
              <span class='truncate'>{tab.name}</span>
              {hasUnread && (
                <span class='status status-xs status-info flex-shrink-0' />
              )}
            </button>
            {isCloseable && (
              <button
                type='button'
                class='flex-shrink-0 opacity-50 hover:opacity-100 leading-none pr-1'
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => handleCloseClick(e, tab.id)}
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
  );
}
