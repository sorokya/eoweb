import type { QuestProgressEntry } from 'eolib';
import { QuestPage, QuestRequirementIcon } from 'eolib';
import { useEffect, useState } from 'preact/hooks';
import {
  FaBoxOpen,
  FaCheckCircle,
  FaChevronDown,
  FaChevronUp,
  FaCommentDots,
  FaMapMarkerAlt,
  FaSkull,
} from 'react-icons/fa';
import { useClient, useLocale } from '@/ui/context';

function questIcon(icon: QuestRequirementIcon) {
  switch (icon) {
    case QuestRequirementIcon.Item:
      return <FaBoxOpen size={12} />;
    case QuestRequirementIcon.Talk:
      return <FaCommentDots size={12} />;
    case QuestRequirementIcon.Kill:
      return <FaSkull size={12} />;
    case QuestRequirementIcon.Step:
      return <FaMapMarkerAlt size={12} />;
    default:
      return <FaCheckCircle size={12} />;
  }
}

export function QuestTracker() {
  const client = useClient();
  const { locale } = useLocale();

  const [trackedNames, setTrackedNames] = useState<string[]>(() => [
    ...client.questController.trackedQuestNames,
  ]);
  const [entries, setEntries] = useState<(QuestProgressEntry | null)[]>(() => {
    const progress = client.questController.progressQuests;
    return client.questController.trackedQuestNames.map(
      (name) => progress.find((q) => q.name === name) ?? null,
    );
  });
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const handleTrackedChanged = (names: string[]) => {
      setTrackedNames([...names]);
      const progress = client.questController.progressQuests;
      setEntries(names.map((n) => progress.find((q) => q.name === n) ?? null));
    };

    const handleQuestList = (
      page: QuestPage,
      progress: QuestProgressEntry[],
    ) => {
      if (page !== QuestPage.Progress) return;
      const names = client.questController.trackedQuestNames;
      setEntries(names.map((n) => progress.find((q) => q.name === n) ?? null));
    };

    client.questController.subscribeTrackedQuestChanged(handleTrackedChanged);
    client.questController.subscribeQuestListReceived(handleQuestList);

    return () => {
      client.questController.unsubscribeTrackedQuestChanged(
        handleTrackedChanged,
      );
      client.questController.unsubscribeQuestListReceived(handleQuestList);
    };
  }, [client]);

  if (trackedNames.length === 0) return null;

  return (
    <div
      class='flex flex-col gap-1.5 rounded-lg bg-base-300/50 px-2 py-1.5 backdrop-blur-xs'
      style={{ minWidth: 140, maxWidth: 220 }}
    >
      <button
        type='button'
        class='flex w-full cursor-pointer items-center justify-between gap-1 bg-transparent p-0 text-left'
        onClick={() => setCollapsed((c) => !c)}
      >
        <span class='truncate font-semibold text-primary/80 text-xs'>
          {locale.questTrackerTitle}
        </span>
        <span class='shrink-0 text-primary/60'>
          {collapsed ? <FaChevronDown size={9} /> : <FaChevronUp size={9} />}
        </span>
      </button>

      {!collapsed && (
        <div class='flex flex-col gap-2'>
          {trackedNames.map((name, i) => {
            const entry = entries[i] ?? null;
            const hasProgress = entry !== null && entry.target > 0;
            return (
              <div key={name} class='flex flex-col gap-0.5'>
                <div class='flex items-start gap-1.5'>
                  {entry && (
                    <span class='mt-0.5 shrink-0 text-primary'>
                      {questIcon(entry.icon)}
                    </span>
                  )}
                  <p class='font-medium text-xs leading-snug'>{name}</p>
                </div>
                {entry?.description && (
                  <p class='text-[10px] leading-snug opacity-70'>
                    {entry.description}
                  </p>
                )}
                {hasProgress && (
                  <div class='flex items-center gap-1.5'>
                    <progress
                      class='progress progress-primary h-1 flex-1'
                      value={entry!.progress}
                      max={entry!.target}
                    />
                    <span class='shrink-0 text-[10px] opacity-70'>
                      {entry!.progress}/{entry!.target}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
