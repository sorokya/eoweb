import {
  BigCoords,
  CharacterMapInfo,
  Direction,
  EquipmentMapInfo,
  Gender,
} from 'eolib';
import { useCallback, useEffect, useState } from 'preact/hooks';
import {
  CREATE_CHARACTER_PREVIEW_PLAYER_ID,
  MAX_HAIR_COLOR,
  MAX_HAIR_STYLE,
  MAX_SKIN,
  MIN_HAIR_COLOR,
  MIN_HAIR_STYLE,
  MIN_SKIN,
} from '@/consts';
import { GameState } from '@/game-state';
import {
  Button,
  CharacterPreview,
  CycleInput,
  drawCharacterPreview,
  Input,
} from '@/ui/components';
import { useClient, useLocale } from '@/ui/context';

const MIN_GENDER = Gender.Female;
const MAX_GENDER = Gender.Male;
const DIRECTION_COUNT = 4;

function makeFakeCharacter(
  gender: Gender,
  hairStyle: number,
  hairColor: number,
  skin: number,
  direction: Direction,
): CharacterMapInfo {
  const info = new CharacterMapInfo();
  info.playerId = CREATE_CHARACTER_PREVIEW_PLAYER_ID;
  info.name = '';
  info.coords = new BigCoords();
  info.direction = direction;
  info.gender = gender;
  info.hairStyle = hairStyle;
  info.hairColor = hairColor;
  info.skin = skin;
  info.equipment = new EquipmentMapInfo();
  return info;
}

export function CreateCharacter() {
  const client = useClient();
  const { locale } = useLocale();

  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>(Gender.Female);
  const [hairStyle, setHairStyle] = useState(MIN_HAIR_STYLE);
  const [hairColor, setHairColor] = useState(MIN_HAIR_COLOR);
  const [skin, setSkin] = useState(MIN_SKIN);
  const [direction, setDirection] = useState<Direction>(Direction.Down);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(() =>
    drawCharacterPreview(
      client,
      CREATE_CHARACTER_PREVIEW_PLAYER_ID,
      Direction.Down,
    ),
  );

  useEffect(() => {
    const existing = client.nearby.characters.findIndex(
      (c) => c.playerId === CREATE_CHARACTER_PREVIEW_PLAYER_ID,
    );
    const fakeChar = makeFakeCharacter(
      gender,
      hairStyle,
      hairColor,
      skin,
      direction,
    );

    if (existing >= 0) {
      client.nearby.characters[existing] = fakeChar;
    } else {
      client.nearby.characters.push(fakeChar);
    }

    client.atlas.refreshAsync().then(() => {
      setPreviewUrl(
        drawCharacterPreview(
          client,
          CREATE_CHARACTER_PREVIEW_PLAYER_ID,
          direction,
        ),
      );
    });
  }, [client, gender, hairStyle, hairColor, skin, direction]);

  const onSubmit = useCallback(
    (e: SubmitEvent) => {
      e.preventDefault();
      client.authenticationController.requestCharacterCreation({
        name,
        gender,
        hairStyle,
        hairColor,
        skin,
      });
    },
    [client, name, gender, hairStyle, hairColor, skin],
  );

  const cancel = useCallback(() => {
    client.setState(GameState.CharacterSelect);
  }, [client]);

  const rotatePreview = useCallback(() => {
    setDirection((d) => ((d + 1) % DIRECTION_COUNT) as Direction);
  }, []);

  const formatGender = useCallback(
    (value: number) =>
      value === Gender.Female
        ? locale.createCharacterFemale
        : locale.createCharacterMale,
    [locale],
  );

  const formatOneBased = useCallback((value: number) => String(value + 1), []);

  return (
    <div class='card bg-base-100 shadow-sm'>
      <div class='card-body'>
        <div class='card-title'>{locale.createCharacterTitle}</div>
        <div class='flex gap-4'>
          <button
            type='button'
            class='flex shrink-0 cursor-pointer items-center justify-center border-none bg-transparent p-0'
            onClick={rotatePreview}
          >
            <CharacterPreview previewUrl={previewUrl} alt='preview' />
          </button>
          <form onSubmit={onSubmit} class='flex min-w-0 flex-1 flex-col gap-3'>
            <Input
              label={locale.createCharacterName}
              name='name'
              value={name}
              onChange={setName}
              autofocus
            />
            <CycleInput
              label={locale.createCharacterGender}
              value={gender}
              min={MIN_GENDER}
              max={MAX_GENDER}
              format={formatGender}
              onChange={(v) => setGender(v as Gender)}
            />
            <CycleInput
              label={locale.createCharacterHairStyle}
              value={hairStyle}
              min={MIN_HAIR_STYLE}
              max={MAX_HAIR_STYLE}
              onChange={setHairStyle}
            />
            <CycleInput
              label={locale.createCharacterHairColor}
              value={hairColor}
              min={MIN_HAIR_COLOR}
              max={MAX_HAIR_COLOR - 1}
              format={formatOneBased}
              onChange={setHairColor}
            />
            <CycleInput
              label={locale.createCharacterSkin}
              value={skin}
              min={MIN_SKIN}
              max={MAX_SKIN - 1}
              format={formatOneBased}
              onChange={setSkin}
            />
            <div class='card-actions'>
              <Button type='submit' variant='primary'>
                {locale.btnCreateCharacter}
              </Button>
              <Button variant='ghost' onClick={cancel}>
                {locale.btnCancel}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
