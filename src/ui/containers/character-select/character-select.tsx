import {
  BigCoords,
  CharacterMapInfo,
  Direction,
  EquipmentMapInfo,
  Gender,
} from 'eolib';
import { useCallback, useEffect } from 'preact/hooks';
import {
  CREATE_CHARACTER_PREVIEW_PLAYER_ID,
  MAX_CHARACTERS,
  MIN_HAIR_COLOR,
  MIN_HAIR_STYLE,
  MIN_SKIN,
} from '@/consts';
import { DialogResourceID } from '@/edf';
import { GameState } from '@/game-state';
import { playSfxById, SfxId } from '@/sfx';
import { Button, drawCharacterPreview } from '@/ui/components';
import { useCharacters, useClient, useLocale } from '@/ui/context';
import { Character } from './character';

export function CharacterSelect() {
  const { locale } = useLocale();
  const client = useClient();
  const characters = useCharacters();

  const cancel = useCallback(() => {
    client.disconnect();
  }, [client]);

  const createCharacter = useCallback(async () => {
    if (characters.length >= MAX_CHARACTERS) {
      const strings = client.getDialogStrings(
        DialogResourceID.CHARACTER_CREATE_TOO_MANY_CHARS,
      );
      client.alertController.show(strings[0], strings[1]);
      return;
    }

    const info = new CharacterMapInfo();
    info.playerId = CREATE_CHARACTER_PREVIEW_PLAYER_ID;
    info.name = '';
    info.coords = new BigCoords();
    info.direction = Direction.Down;
    info.gender = Gender.Female;
    info.hairStyle = MIN_HAIR_STYLE;
    info.hairColor = MIN_HAIR_COLOR;
    info.skin = MIN_SKIN;
    info.equipment = new EquipmentMapInfo();

    const existing = client.nearby.characters.findIndex(
      (c) => c.playerId === CREATE_CHARACTER_PREVIEW_PLAYER_ID,
    );
    if (existing >= 0) {
      client.nearby.characters[existing] = info;
    } else {
      client.nearby.characters.push(info);
    }

    await client.atlas.refreshAsync();
    drawCharacterPreview(client, CREATE_CHARACTER_PREVIEW_PLAYER_ID);

    client.setState(GameState.CreateCharacter);
  }, [client, characters]);

  const changePassword = useCallback(() => {
    client.setState(GameState.ChangePassword);
  }, [client]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancel();
      }

      if (['1', '2', '3'].includes(e.key)) {
        const character = characters[Number.parseInt(e.key, 10) - 1];
        if (!character) return;
        playSfxById(SfxId.ButtonClick);
        client.authenticationController.selectCharacter(character.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [cancel, client, characters]);

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
          <Button variant='primary' onClick={createCharacter}>
            {locale.btnNewCharacter}
          </Button>
          <Button variant='ghost' onClick={changePassword}>
            {locale.btnChangePassword}
          </Button>
          <Button variant='ghost' onClick={cancel}>
            {locale.btnCancel}
          </Button>
        </div>
      </div>
    </div>
  );
}
