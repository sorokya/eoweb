import {
  BigCoords,
  CharacterMapInfo,
  Direction,
  EquipmentMapInfo,
} from 'eolib';
import { useCallback, useEffect, useState } from 'preact/hooks';
import {
  BARBER_BASE_COST,
  BARBER_COST_PER_LEVEL,
  MAX_HAIR_COLOR,
  MAX_HAIR_STYLE,
  MIN_HAIR_COLOR,
} from '@/consts';
import {
  Button,
  CharacterPreview,
  CycleInput,
  drawCharacterPreview,
} from '@/ui/components';
import { useClient, useLocale } from '@/ui/context';
import { DialogBase } from './dialog-base';

const DIRECTION_COUNT = 4;
const MIN_BARBER_HAIR_STYLE = 0;

function makeBarberPreview(
  playerId: number,
  source: CharacterMapInfo,
  hairStyle: number,
  hairColor: number,
  showHat: boolean,
): CharacterMapInfo {
  const info = new CharacterMapInfo();
  info.playerId = playerId;
  info.name = source.name;
  info.coords = new BigCoords();
  info.coords.x = source.coords.x;
  info.coords.y = source.coords.y;
  info.direction = source.direction;
  info.gender = source.gender;
  info.hairStyle = hairStyle;
  info.hairColor = hairColor;
  info.skin = source.skin;

  const equip = new EquipmentMapInfo();
  equip.boots = source.equipment.boots;
  equip.armor = source.equipment.armor;
  equip.hat = showHat ? source.equipment.hat : 0;
  equip.shield = source.equipment.shield;
  equip.weapon = source.equipment.weapon;
  info.equipment = equip;

  return info;
}

export function BarberDialog() {
  const client = useClient();
  const { locale } = useLocale();

  const previewId = client.playerId + 10000;

  const playerChar = client.getCharacterById(client.playerId);

  const [hairStyle, setHairStyle] = useState(
    () => playerChar?.hairStyle ?? MIN_BARBER_HAIR_STYLE,
  );
  const [hairColor, setHairColor] = useState(
    () => playerChar?.hairColor ?? MIN_HAIR_COLOR,
  );
  const [showHat, setShowHat] = useState(true);
  const [direction, setDirection] = useState<Direction>(Direction.Down);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    const source = client.getCharacterById(client.playerId);
    if (!source) return;

    const existing = client.nearby.characters.findIndex(
      (c) => c.playerId === previewId,
    );
    const fakeChar = makeBarberPreview(
      previewId,
      source,
      hairStyle,
      hairColor,
      showHat,
    );
    fakeChar.direction = direction;

    if (existing >= 0) {
      client.nearby.characters[existing] = fakeChar;
    } else {
      client.nearby.characters.push(fakeChar);
    }

    client.atlas.refreshAsync().then(() => {
      setPreviewUrl(drawCharacterPreview(client, previewId, direction));
    });

    return () => {
      client.nearby.characters = client.nearby.characters.filter(
        (c) => c.playerId !== previewId,
      );
    };
  }, [client, previewId, hairStyle, hairColor, showHat, direction]);

  useEffect(() => {
    const handlePurchased = () => {
      // Cleanup is handled by the dialog close via in-game container
    };
    client.barberController.subscribePurchased(handlePurchased);
    return () => {
      client.barberController.unsubscribePurchased(handlePurchased);
    };
  }, [client]);

  const rotatePreview = useCallback(() => {
    setDirection((d) => ((d + 1) % DIRECTION_COUNT) as Direction);
  }, []);

  const formatHairStyle = useCallback(
    (value: number) => (value === 0 ? locale.barberBald : String(value)),
    [locale],
  );

  const cost = BARBER_BASE_COST + BARBER_COST_PER_LEVEL * client.level;

  const handleBuy = useCallback(() => {
    client.barberController.buyHairStyle(hairStyle, hairColor);
  }, [client, hairStyle, hairColor]);

  return (
    <DialogBase id='barber' title={locale.barberTitle} size='sm'>
      <div class='flex gap-4 p-2'>
        <button
          type='button'
          class='flex shrink-0 cursor-pointer items-center justify-center border-none bg-transparent p-0'
          onClick={rotatePreview}
        >
          <CharacterPreview previewUrl={previewUrl} alt='preview' />
        </button>

        <div class='flex min-w-0 flex-1 flex-col gap-3'>
          <CycleInput
            label={locale.barberHairStyle}
            value={hairStyle}
            min={MIN_BARBER_HAIR_STYLE}
            max={MAX_HAIR_STYLE}
            format={formatHairStyle}
            onChange={setHairStyle}
          />
          <CycleInput
            label={locale.barberHairColor}
            value={hairColor}
            min={MIN_HAIR_COLOR}
            max={MAX_HAIR_COLOR - 1}
            onChange={setHairColor}
          />
          <label class='flex cursor-pointer items-center gap-2 text-sm'>
            <input
              type='checkbox'
              class='checkbox checkbox-sm'
              checked={showHat}
              onChange={(e) =>
                setShowHat((e.target as HTMLInputElement).checked)
              }
            />
            {locale.barberShowHat}
          </label>

          <p class='text-base-content/60 text-xs'>
            {locale.barberCost}:{' '}
            <span class='font-semibold text-base-content'>
              {cost.toLocaleString()}
            </span>{' '}
            {locale.wordGold}
          </p>

          <Button variant={['sm', 'primary']} onClick={handleBuy}>
            {locale.barberBuy}
          </Button>
        </div>
      </div>
    </DialogBase>
  );
}
