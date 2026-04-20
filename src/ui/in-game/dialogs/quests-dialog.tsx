import type { QuestProgressEntry } from 'eolib';
import { QuestPage, QuestRequirementIcon } from 'eolib';
import { useEffect, useState } from 'preact/hooks';
import {
  FaBoxOpen,
  FaCheckCircle,
  FaCommentDots,
  FaMapMarkerAlt,
  FaSkull,
} from 'react-icons/fa';
import { QuestBookList, Tabs } from '@/ui/components';
import { useClient, useLocale } from '@/ui/context';
import { DialogBase } from './dialog-base';

type QuestTab = 'active' | 'history';

function questIcon(icon: QuestRequirementIcon) {
  switch (icon) {
    case QuestRequirementIcon.Item:
      return <FaBoxOpen size={14} />;
    case QuestRequirementIcon.Talk:
      return <FaCommentDots size={14} />;
    case QuestRequirementIcon.Kill:
      return <FaSkull size={14} />;
    case QuestRequirementIcon.Step:
      return <FaMapMarkerAlt size={14} />;
    default:
      return <FaCheckCircle size={14} />;
  }
}

function ActiveTab({
  entries,
  tracked,
  onTrack,
}: {
  entries: QuestProgressEntry[];
  tracked: string | null;
  onTrack: (name: string | null) => void;
}) {
  const { locale } = useLocale();

  if (entries.length === 0) {
    return (
      <p class='py-4 text-center text-sm opacity-60'>{locale.questNoActive}</p>
    );
  }

  return (
    <ul class='flex flex-col gap-2'>
      {entries.map((entry, i) => {
        const isTracked = tracked === entry.name;
        const hasProgress = entry.target > 0;

        return (
          <li
            key={i}
            class='flex flex-col gap-1 rounded border border-base-content/10 p-2'
          >
            <div class='flex items-start gap-2'>
              <span class='mt-0.5 shrink-0 text-primary'>
                {questIcon(entry.icon)}
              </span>
              <div class='min-w-0 flex-1'>
                <div class='flex items-center justify-between gap-2'>
                  <span class='truncate font-semibold text-sm'>
                    {entry.name}
                  </span>
                  <label class='flex cursor-pointer items-center gap-1 text-xs'>
                    <input
                      type='checkbox'
                      class='checkbox checkbox-xs'
                      checked={isTracked}
                      onChange={() => onTrack(isTracked ? null : entry.name)}
                    />
                    {locale.questTrack}
                  </label>
                </div>
                {entry.description && (
                  <p class='text-xs leading-snug opacity-70'>
                    {entry.description}
                  </p>
                )}
              </div>
            </div>
            {hasProgress && (
              <div class='flex items-center gap-2 pl-6'>
                <progress
                  class='progress progress-primary h-1.5 flex-1'
                  value={entry.progress}
                  max={entry.target}
                />
                <span class='shrink-0 text-xs opacity-60'>
                  {entry.progress}/{entry.target}
                </span>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function QuestsDialog() {
  const client = useClient();
  const { locale } = useLocale();

  const [activeTab, setActiveTab] = useState<QuestTab>('active');
  const [progressEntries, setProgressEntries] = useState<QuestProgressEntry[]>(
    () => client.questController.progressQuests,
  );
  const [historyEntries, setHistoryEntries] = useState<string[]>(
    () => client.questController.historyQuests,
  );
  const [tracked, setTracked] = useState<string | null>(
    () => client.questController.trackedQuestName,
  );

  useEffect(() => {
    const handleQuestList = (
      page: QuestPage,
      progress: QuestProgressEntry[],
      history: string[],
    ) => {
      if (page === QuestPage.Progress) {
        setProgressEntries([...progress]);
      } else {
        setHistoryEntries([...history]);
      }
    };
    const handleTrackedChanged = (name: string | null) => {
      setTracked(name);
    };

    client.questController.subscribeQuestListReceived(handleQuestList);
    client.questController.subscribeTrackedQuestChanged(handleTrackedChanged);

    // Fetch progress when dialog mounts
    client.questController.refreshQuestProgress();

    return () => {
      client.questController.unsubscribeQuestListReceived(handleQuestList);
      client.questController.unsubscribeTrackedQuestChanged(
        handleTrackedChanged,
      );
    };
  }, [client]);

  // Fetch history when switching to history tab
  const handleTabChange = (id: string) => {
    const tab = id as QuestTab;
    setActiveTab(tab);
    if (tab === 'history') {
      client.questController.refreshQuestHistory();
    }
  };

  const handleTrack = (name: string | null) => {
    client.questController.setTrackedQuest(name);
  };

  const TABS = [
    { id: 'active', label: locale.questTabActive },
    { id: 'history', label: locale.questTabHistory },
  ] as const;

  return (
    <DialogBase id='quests' title={locale.questsTitle} size='sm'>
      <div class='flex flex-col gap-2 p-1'>
        <Tabs
          items={TABS as unknown as { id: string; label: string }[]}
          activeId={activeTab}
          onSelect={handleTabChange}
          style='border'
          size='sm'
        />
        {activeTab === 'active' && (
          <ActiveTab
            entries={progressEntries}
            tracked={tracked}
            onTrack={handleTrack}
          />
        )}
        {activeTab === 'history' && (
          <QuestBookList questNames={historyEntries} />
        )}
      </div>
    </DialogBase>
  );
}
