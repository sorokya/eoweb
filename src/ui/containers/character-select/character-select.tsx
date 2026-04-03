import { useCallback } from 'preact/hooks';
import { Button } from '@/ui/components';
import { useCharacters, useClient, useLocale } from '@/ui/context';
import { Character } from './character';

export function CharacterSelect() {
  const { locale } = useLocale();
  const client = useClient();
  const characters = useCharacters();

  const cancel = useCallback(() => {
    client.disconnect();
  }, [client]);

  return (
    <div class='card bg-base-100 w-11/12 max-h-[90dvh] shadow-sm'>
      <div class='card-body flex flex-col min-h-0'>
        <div class='card-title shrink-0'>{locale.characterSelectTitle}</div>
        <div class='flex flex-col sm:flex-row gap-2 flex-1 min-h-0 overflow-y-auto'>
          {[0, 1, 2].map((slot) => (
            <Character key={slot} character={characters[slot]} />
          ))}
        </div>
        <div class='card-actions shrink-0'>
          <Button variant='primary'>{locale.btnNewCharacter}</Button>
          <Button variant='ghost'>{locale.btnChangePassword}</Button>
          <Button variant='ghost' onClick={cancel}>
            {locale.btnCancel}
          </Button>
        </div>
      </div>
    </div>
  );
}
