import { flushSync } from 'preact/compat';
import { useCallback } from 'preact/hooks';
import { LuX } from 'react-icons/lu';
import { formatLocaleString } from '@/locale';
import { useLocale } from '@/ui/context';
import type { ChatTabConfig } from './chat-manager';
import { useChatManager } from './chat-manager';

type Props = {
  tabs: ChatTabConfig[];
  activeTabId: string;
  /** Called after a tab switch so the parent can re-focus the input. */
  onFocusInput?: () => void;
};

export function ChatTabBar({ tabs, activeTabId, onFocusInput }: Props) {
  const { setActiveTab, closeTab, unreadTabs } = useChatManager();
  const { locale } = useLocale();

  const handleTabClick = useCallback(
    (e: MouseEvent, tabId: string) => {
      e.stopPropagation();
      // flushSync forces the re-render to complete synchronously so that
      // inputRef is stable when onFocusInput calls focus() — required on iOS
      // where focus() must be called within the user-gesture call stack.
      flushSync(() => setActiveTab(tabId));
      onFocusInput?.();
    },
    [setActiveTab, onFocusInput],
  );

  const handleCloseClick = useCallback(
    (e: MouseEvent, tabId: string) => {
      e.stopPropagation();
      closeTab(tabId);
    },
    [closeTab],
  );

  return (
    <div
      role='tablist'
      class='tabs tabs-xs flex min-w-0 items-center gap-0.5 overflow-hidden'
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const isCloseable = tab.id !== 'general' && tab.id !== 'system';
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
                <span class='status status-xs status-info shrink-0' />
              )}
            </button>
            {isCloseable && (
              <button
                type='button'
                class='shrink-0 pr-1 leading-none opacity-50 hover:opacity-100'
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => handleCloseClick(e, tab.id)}
                tabIndex={-1}
                aria-label={formatLocaleString(locale.chatCloseTab, {
                  name: tab.name,
                })}
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
