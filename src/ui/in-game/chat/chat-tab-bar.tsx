import { flushSync } from 'preact/compat';
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
  /** Called after a tab switch so the parent can re-focus the input. */
  onFocusInput?: () => void;
};

export function ChatTabBar({
  dialogId,
  tabs,
  activeTabId,
  isMain = false,
  onFocusInput,
}: Props) {
  const { setActiveTab, closeTab, unreadTabs } = useChatManager();

  const handleTabClick = useCallback(
    (e: MouseEvent, tabId: string) => {
      e.stopPropagation();
      // flushSync forces the re-render to complete synchronously so that
      // inputRef is stable when onFocusInput calls focus() — required on iOS
      // where focus() must be called within the user-gesture call stack.
      flushSync(() => setActiveTab(dialogId, tabId));
      onFocusInput?.();
    },
    [dialogId, setActiveTab, onFocusInput],
  );

  const handleCloseClick = useCallback(
    (e: MouseEvent, tabId: string) => {
      e.stopPropagation();
      closeTab(tabId, dialogId);
    },
    [dialogId, closeTab],
  );

  return (
    <div
      role='tablist'
      class='tabs tabs-xs flex min-w-0 items-center gap-0.5 overflow-hidden'
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const isCloseable =
          isMain && tab.id !== 'general' && tab.id !== 'system';
        const hasUnread = !isActive && unreadTabs.has(tab.id);
        return (
          <div
            key={tab.id}
            class='flex min-w-0 shrink items-center'
            style={{ maxWidth: '8rem' }}
          >
            <button
              type='button'
              role='tab'
              class={`tab tab-xs flex min-w-0 flex-1 items-center gap-1 ${isActive ? 'tab-active font-semibold' : ''}`}
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
                class='flex-shrink-0 pr-1 leading-none opacity-50 hover:opacity-100'
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
