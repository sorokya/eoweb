import { DialogEntryType } from 'eolib';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { QuestDialogState } from '@/controllers';
import { Button } from '@/ui/components';
import { useClient, useLocale } from '@/ui/context';
import { useWindowManager } from '@/ui/in-game';
import { DialogBase } from './dialog-base';

export function QuestNpcDialog() {
  const client = useClient();
  const { locale } = useLocale();
  const { closeDialog } = useWindowManager();
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [state, setState] = useState<QuestDialogState>(() => ({
    npcName: client.questController.npcName,
    questId: client.questController.questId,
    dialogId: client.questController.dialogId,
    quests: client.questController.quests,
    pendingQuests: client.questController.pendingQuests,
    dialogEntries: client.questController.dialogEntries,
  }));

  const [showQuestList, setShowQuestList] = useState(false);
  const [dialogIndex, setDialogIndex] = useState(0);

  useEffect(() => {
    const handleOpened = (data: QuestDialogState) => {
      if (closeTimerRef.current !== null) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setState({ ...data });
      setShowQuestList(false);
      setDialogIndex(0);
    };
    const handleUpdated = (data: QuestDialogState) => {
      if (closeTimerRef.current !== null) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setState({ ...data });
      setShowQuestList(false);
      setDialogIndex(0);
    };
    client.questController.subscribeDialogOpened(handleOpened);
    client.questController.subscribeDialogUpdated(handleUpdated);
    return () => {
      client.questController.unsubscribeDialogOpened(handleOpened);
      client.questController.unsubscribeDialogUpdated(handleUpdated);
      if (closeTimerRef.current !== null) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, [client]);

  const scheduleClose = () => {
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      closeDialog('questNpc');
    }, 200);
  };

  // Group entries into pages: each text entry starts a new page and collects
  // any immediately following link entries onto the same page.
  const pages = state.dialogEntries.reduce<(typeof state.dialogEntries)[]>(
    (acc, entry) => {
      if (entry.entryType !== DialogEntryType.Link) {
        acc.push([entry]);
      } else {
        if (acc.length === 0) acc.push([]);
        acc[acc.length - 1].push(entry);
      }
      return acc;
    },
    [],
  );

  const isLastPage = dialogIndex >= pages.length - 1;
  const currentPage = pages[dialogIndex] ?? [];

  const handleOk = () => {
    if (!isLastPage) {
      setDialogIndex((i) => i + 1);
      return;
    }
    client.questController.questReply(state.questId, state.dialogId, null);
    scheduleClose();
  };

  const handleBack = () => {
    setDialogIndex((i) => Math.max(0, i - 1));
  };

  const handleLink = (linkId: number) => {
    client.questController.questReply(state.questId, state.dialogId, linkId);
    scheduleClose();
  };

  const handleSelectQuest = (questId: number) => {
    setShowQuestList(false);
    client.questController.selectQuest(questId);
  };

  const canSwitch = state.pendingQuests.length > 1;

  return (
    <DialogBase id='questNpc' title={state.npcName} size='sm'>
      <div class='flex flex-col gap-2 p-2'>
        {showQuestList ? (
          // Quest-selection list — shown when "Switch Quest" is clicked
          <ul class='flex flex-col gap-1'>
            {state.pendingQuests.map((q) => (
              <li key={q.questId}>
                <button
                  type='button'
                  class='w-full rounded px-2 py-1 text-left text-primary text-sm underline hover:bg-base-content/5'
                  onClick={() => handleSelectQuest(q.questId)}
                >
                  {q.questName}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          // Current page: one text entry plus any following link entries
          <div class='flex flex-col gap-1.5'>
            {currentPage.map((entry, i) => {
              if (entry.entryType === DialogEntryType.Link) {
                const linkData = entry.entryTypeData as { linkId: number };
                return (
                  <button
                    key={i}
                    type='button'
                    class='w-full rounded px-1 py-0.5 text-left text-primary text-sm underline hover:bg-base-content/5'
                    onClick={() => handleLink(linkData.linkId)}
                  >
                    {entry.line}
                  </button>
                );
              }
              return (
                <p key={i} class='px-1 text-sm leading-relaxed'>
                  {entry.line}
                </p>
              );
            })}
          </div>
        )}

        <div class='flex items-center justify-between pt-1'>
          {!showQuestList && dialogIndex > 0 ? (
            <Button
              type='button'
              class='btn btn-ghost btn-sm'
              onClick={handleBack}
            >
              {locale.wordBack}
            </Button>
          ) : canSwitch && !showQuestList ? (
            <Button
              type='button'
              class='btn btn-ghost btn-sm'
              onClick={() => setShowQuestList(true)}
            >
              {locale.questNpcSwitch}
            </Button>
          ) : (
            <span />
          )}
          {!showQuestList && (
            <Button
              type='button'
              class='btn btn-primary btn-sm'
              onClick={handleOk}
            >
              {locale.questNpcOk}
            </Button>
          )}
        </div>
      </div>
    </DialogBase>
  );
}
