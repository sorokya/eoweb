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

  useEffect(() => {
    const handleOpened = (data: QuestDialogState) => {
      if (closeTimerRef.current !== null) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setState({ ...data });
      setShowQuestList(false);
    };
    const handleUpdated = (data: QuestDialogState) => {
      if (closeTimerRef.current !== null) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setState({ ...data });
      setShowQuestList(false);
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

  const handleOk = () => {
    client.questController.questReply(state.questId, state.dialogId, null);
    scheduleClose();
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
          // Dialog entries from the server — text paragraphs and clickable links
          <div class='flex flex-col gap-1.5'>
            {state.dialogEntries.map((entry, i) => {
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
          {canSwitch && !showQuestList ? (
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
