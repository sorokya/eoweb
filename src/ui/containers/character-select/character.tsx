import { AdminLevel, type CharacterSelectionListEntry, Direction } from 'eolib';
import { useCallback, useMemo, useState } from 'preact/hooks';
import { DialogResourceID } from '@/edf';
import type { LocaleStrings } from '@/locale';
import {
  Button,
  CharacterPreview,
  drawCharacterPreview,
} from '@/ui/components';
import { useClient, useLocale } from '@/ui/context';
import { capitalize } from '@/utils';

type AdminBadgeColor =
  | 'badge-ghost'
  | 'badge-info'
  | 'badge-success'
  | 'badge-warning'
  | 'badge-error';

type AdminBadgeInfo = {
  label: keyof LocaleStrings['admin'];
  color: AdminBadgeColor;
};

const ADMIN_BADGES: Partial<Record<AdminLevel, AdminBadgeInfo>> = {
  [AdminLevel.Spy]: { label: 'badgeSpy', color: 'badge-ghost' },
  [AdminLevel.LightGuide]: {
    label: 'badgeLightGuide',
    color: 'badge-info',
  },
  [AdminLevel.Guardian]: {
    label: 'badgeGuardian',
    color: 'badge-success',
  },
  [AdminLevel.GameMaster]: {
    label: 'badgeGameMaster',
    color: 'badge-warning',
  },
  [AdminLevel.HighGameMaster]: {
    label: 'badgeHighGameMaster',
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

  useMemo(() => {
    client.authenticationController.subscribeCharactersChanged(() => {
      setDeleteConfirmed(false);
    });
  }, [client]);

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
      <div class='card flex min-h-0 flex-1 flex-col bg-base-200 p-4 opacity-40'>
        <div class='h-6 shrink-0' />
        <div class='flex min-h-0 flex-1 items-center justify-center'>
          <CharacterPreview previewUrl={undefined} alt='' />
        </div>
        <div class='mt-auto flex shrink-0 justify-center pt-3'>
          <span class='text-xs'>{locale.characterSelect.emptySlot}</span>
        </div>
      </div>
    );
  }

  const adminBadge = ADMIN_BADGES[character.admin as AdminLevel];

  return (
    <div class='card flex min-h-0 flex-1 flex-col bg-base-200 p-4'>
      <div class='flex shrink-0 items-center justify-center gap-2'>
        <span class='font-semibold text-sm'>{capitalize(character.name)}</span>
        <span class='text-base-content/60 text-xs'>Lvl {character.level}</span>
        {adminBadge && (
          <span class={`badge badge-xs ${adminBadge.color}`}>
            {locale.admin[adminBadge.label]}
          </span>
        )}
      </div>
      <button
        type='button'
        class='flex min-h-0 flex-1 cursor-pointer items-center justify-center border-none bg-transparent p-0 py-2'
        onClick={rotatePreview}
      >
        <CharacterPreview previewUrl={previewUrl} alt={character.name} />
      </button>
      <div class='mt-auto flex shrink-0 justify-center gap-2'>
        <Button variant={['primary', 'xs']} onClick={login}>
          {locale.characterSelect.btnLogin}
        </Button>
        <Button variant={['error', 'ghost', 'xs']} onClick={onDeleteClick}>
          {locale.characterSelect.btnDelete}
          {deleteConfirmed && ' ✓'}
        </Button>
      </div>
    </div>
  );
}
