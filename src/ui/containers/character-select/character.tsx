import { AdminLevel, type CharacterSelectionListEntry } from 'eolib';
import { useMemo, useState } from 'preact/hooks';
import { CharacterFrame } from '@/atlas';
import { CHARACTER_HEIGHT, CHARACTER_WIDTH } from '@/consts';
import { Button } from '@/ui/components';
import { useClient, useLocale } from '@/ui/context';

const CANVAS_W = CHARACTER_WIDTH + 40;
const CANVAS_H = CHARACTER_HEIGHT + 40;

type AdminBadgeColor =
  | 'badge-ghost'
  | 'badge-info'
  | 'badge-success'
  | 'badge-warning'
  | 'badge-error';

type AdminBadgeInfo = {
  label: keyof import('@/ui/locale').LocaleStrings;
  color: AdminBadgeColor;
};

const ADMIN_BADGES: Partial<Record<AdminLevel, AdminBadgeInfo>> = {
  [AdminLevel.Spy]: { label: 'adminBadgeSpy', color: 'badge-ghost' },
  [AdminLevel.LightGuide]: {
    label: 'adminBadgeLightGuide',
    color: 'badge-info',
  },
  [AdminLevel.Guardian]: {
    label: 'adminBadgeGuardian',
    color: 'badge-success',
  },
  [AdminLevel.GameMaster]: {
    label: 'adminBadgeGameMaster',
    color: 'badge-warning',
  },
  [AdminLevel.HighGameMaster]: {
    label: 'adminBadgeHighGameMaster',
    color: 'badge-error',
  },
};

type CharacterProps = {
  character: CharacterSelectionListEntry | undefined;
};

export function Character({ character }: CharacterProps) {
  const client = useClient();
  const { locale } = useLocale();
  const [previewUrl, setPreviewUrl] = useState<string>();

  useMemo(() => {
    if (!character) {
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const playerId = client.nearby.characters.find(
      (c) => c.name === character.name,
    )?.playerId;
    if (!playerId) {
      return;
    }

    const frame = client.atlas.getCharacterFrame(
      playerId,
      CharacterFrame.StandingDownRight,
    );
    if (!frame) {
      return;
    }

    const atlas = client.atlas.getAtlas(frame.atlasIndex);
    if (!atlas) {
      return;
    }

    ctx.drawImage(
      atlas,
      frame.x,
      frame.y,
      frame.w,
      frame.h,
      Math.floor((canvas.width >> 1) - (frame.w >> 1)),
      Math.floor((canvas.height >> 1) - (frame.h >> 1)),
      frame.w,
      frame.h,
    );

    setPreviewUrl(canvas.toDataURL());
  }, [client, character]);

  if (!character) {
    return (
      <div class='card bg-base-200 flex-1 flex flex-col p-4 min-h-0 opacity-40'>
        <div class='shrink-0 h-6' />
        <div class='flex-1 flex items-center justify-center min-h-0'>
          <div
            class='skeleton rounded'
            style={{ width: `${CANVAS_W}px`, height: `${CANVAS_H}px` }}
          />
        </div>
        <div class='shrink-0 flex justify-center mt-auto pt-3'>
          <span class='text-xs'>{locale.characterEmptySlot}</span>
        </div>
      </div>
    );
  }

  const adminBadge = ADMIN_BADGES[character.admin as AdminLevel];

  return (
    <div class='card bg-base-200 flex-1 flex flex-col p-4 min-h-0'>
      <div class='shrink-0 flex items-center justify-center gap-2'>
        <span class='text-sm font-semibold'>{character.name}</span>
        <span class='text-xs text-base-content/60'>Lvl {character.level}</span>
        {adminBadge && (
          <span class={`badge badge-xs ${adminBadge.color}`}>
            {locale[adminBadge.label]}
          </span>
        )}
      </div>
      <div class='flex-1 flex items-center justify-center min-h-0 py-2'>
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={character.name}
            style={{
              imageRendering: 'pixelated',
              maxHeight: '100%',
              width: 'auto',
            }}
          />
        ) : (
          <div
            class='skeleton rounded'
            style={{ width: `${CANVAS_W}px`, height: `${CANVAS_H}px` }}
          />
        )}
      </div>
      <div class='shrink-0 flex justify-center gap-2 mt-auto'>
        <Button variant={['primary', 'xs']}>{locale.btnLogin}</Button>
        <Button variant={['error', 'ghost', 'xs']}>
          {locale.btnDeleteCharacter}
        </Button>
      </div>
    </div>
  );
}
