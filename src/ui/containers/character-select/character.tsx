import { AdminLevel, type CharacterSelectionListEntry, Direction } from 'eolib';
import { useCallback, useMemo, useState } from 'preact/hooks';
import { DialogResourceID } from '@/edf';
import {
  Button,
  CharacterPreview,
  drawCharacterPreview,
} from '@/ui/components';
import { useClient, useLocale } from '@/ui/context';

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

const DIRECTION_COUNT = 4;

type CharacterProps = {
  character: CharacterSelectionListEntry | undefined;
};

export function Character({ character }: CharacterProps) {
  const client = useClient();
  const { locale } = useLocale();
  const [direction, setDirection] = useState<Direction>(Direction.Down);
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);

  useMemo(() => {
    if (!character) {
      return;
    }

    const playerId = client.nearby.characters.find(
      (c) => c.name === character.name,
    )?.playerId;
    if (!playerId) {
      return;
    }

    setPreviewUrl(drawCharacterPreview(client, playerId, direction));
  }, [client, character, direction]);

  const rotatePreview = useCallback(() => {
    setDirection((d) => ((d + 1) % DIRECTION_COUNT) as Direction);
  }, []);

  const login = useCallback(() => {
    if (!character) return;
    client.authenticationController.selectCharacter(character.id);
  }, [client, character]);

  const onDeleteClick = useCallback(() => {
    if (!character) return;
    if (deleteConfirmed) {
      client.authenticationController.deleteCharacter(character.id);
      return;
    }

    const strings = client.getDialogStrings(
      DialogResourceID.CHARACTER_DELETE_CONFIRM,
    );
    client.alertController.showConfirm(strings[0], strings[1], (confirmed) => {
      if (!confirmed) return;
      client.authenticationController.requestCharacterDeletion(character.id);
      setDeleteConfirmed(true);
    });
  }, [client, character, deleteConfirmed]);

  if (!character) {
    return (
      <div class='card bg-base-200 flex-1 flex flex-col p-4 min-h-0 opacity-40'>
        <div class='shrink-0 h-6' />
        <div class='flex-1 flex items-center justify-center min-h-0'>
          <CharacterPreview previewUrl={undefined} alt='' />
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
      <button
        type='button'
        class='flex-1 flex items-center justify-center min-h-0 py-2 bg-transparent border-none cursor-pointer p-0'
        onClick={rotatePreview}
      >
        <CharacterPreview previewUrl={previewUrl} alt={character.name} />
      </button>
      <div class='shrink-0 flex justify-center gap-2 mt-auto'>
        <Button variant={['primary', 'xs']} onClick={login}>
          {locale.btnLogin}
        </Button>
        <Button variant={['error', 'ghost', 'xs']} onClick={onDeleteClick}>
          {locale.btnDeleteCharacter}
          {deleteConfirmed && ' ✓'}
        </Button>
      </div>
    </div>
  );
}
