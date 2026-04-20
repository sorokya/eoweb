import type { QuestProgressEntry } from 'eolib';
import { QuestPage, QuestRequirementIcon } from 'eolib';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import {
  FaBoxOpen,
  FaCheckCircle,
  FaCommentDots,
  FaMapMarkerAlt,
  FaSkull,
} from 'react-icons/fa';
import { HUD_Z } from '@/ui/consts';
import { useClient, useLocale } from '@/ui/context';
import { usePosition, useRepositionMode } from '@/ui/in-game';

const POSITION_KEY = 'quest-tracker';

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
  const repositionMode = useRepositionMode();

  const [trackedName, setTrackedName] = useState<string | null>(
    () => client.questController.trackedQuestName,
  );
  const [entry, setEntry] = useState<QuestProgressEntry | null>(() => {
    const name = client.questController.trackedQuestName;
    return (
      client.questController.progressQuests.find((q) => q.name === name) ?? null
    );
  });

  useEffect(() => {
    const handleTrackedChanged = (name: string | null) => {
      setTrackedName(name);
      if (name === null) {
        setEntry(null);
      } else {
        const found =
          client.questController.progressQuests.find((q) => q.name === name) ??
          null;
        setEntry(found);
      }
    };

    const handleQuestList = (
      page: QuestPage,
      progress: QuestProgressEntry[],
    ) => {
      if (page !== QuestPage.Progress) return;
      const currentName = client.questController.trackedQuestName;
      if (!currentName) return;
      setEntry(progress.find((q) => q.name === currentName) ?? null);
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

  const [pos, setPos] = usePosition(POSITION_KEY, () => ({
    x: 8,
    y: Math.max(40, window.innerHeight - 200),
  }));

  const dragStart = useRef<{
    ptrX: number;
    ptrY: number;
    baseX: number;
    baseY: number;
  } | null>(null);

  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      if (!repositionMode || e.button !== 0) return;
      e.preventDefault();
      dragStart.current = {
        ptrX: e.clientX,
        ptrY: e.clientY,
        baseX: pos.x,
        baseY: pos.y,
      };
      const onMove = (me: PointerEvent) => {
        if (!dragStart.current) return;
        setPos({
          x: dragStart.current.baseX + me.clientX - dragStart.current.ptrX,
          y: dragStart.current.baseY + me.clientY - dragStart.current.ptrY,
        });
      };
      const onUp = () => {
        dragStart.current = null;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [repositionMode, pos, setPos],
  );

  if (!trackedName && !repositionMode) return null;

  const hasProgress = entry !== null && entry.target > 0;

  return (
    <div
      role='presentation'
      class={`pointer-events-auto fixed flex flex-col gap-0.5 rounded-lg border border-base-content/10 bg-base-300/80 px-2 py-1.5 shadow-sm backdrop-blur-sm ${repositionMode ? 'cursor-move ring-2 ring-primary/50' : ''}`}
      style={{
        left: pos.x,
        top: pos.y,
        zIndex: HUD_Z,
        minWidth: 140,
        maxWidth: 220,
        touchAction: 'none',
      }}
      onPointerDown={onPointerDown}
    >
      <p class='truncate font-semibold text-xs opacity-60'>
        {locale.questTrackerTitle}
      </p>

      {trackedName ? (
        <>
          <div class='flex items-start gap-1.5'>
            {entry && (
              <span class='mt-0.5 shrink-0 text-primary'>
                {questIcon(entry.icon)}
              </span>
            )}
            <p class='font-medium text-xs leading-snug'>{trackedName}</p>
          </div>
          {entry?.description && (
            <p class='text-[10px] leading-snug opacity-60'>
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
              <span class='shrink-0 text-[10px] opacity-60'>
                {entry!.progress}/{entry!.target}
              </span>
            </div>
          )}
        </>
      ) : (
        <p class='text-xs opacity-40'>{locale.questNoActive}</p>
      )}
    </div>
  );
}
