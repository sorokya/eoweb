import type { Spell } from 'eolib';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { FaArrowUp } from 'react-icons/fa';
import { playSfxById, SfxId } from '@/sfx';
import { Button } from '@/ui/components';
import { UI_ITEM_BG, UI_PANEL_BORDER, UI_STICKY_BG } from '@/ui/consts';
import { useClient, useLocale } from '@/ui/context';
import { SlotType } from '@/ui/enums';
import {
  useBackdropBlur,
  useHotbar,
  useItemDrag,
  useSpellIconUrls,
} from '@/ui/in-game';
import { DialogBase } from './dialog-base';

// ---------------------------------------------------------------------------
// Individual spell card
// ---------------------------------------------------------------------------

type SpellCardProps = {
  spell: Spell;
  skillPoints: number;
};

function SpellCard({ spell, skillPoints }: SpellCardProps) {
  const client = useClient();
  const { locale } = useLocale();
  const { startDrag } = useItemDrag();
  const { setSlot } = useHotbar();

  const record = client.getEsfRecordById(spell.id);
  const iconId = record?.iconId ?? null;
  const name =
    record?.name ?? locale.itemFallbackName.replace('{id}', String(spell.id));
  const maxLevel = record?.maxSkillLevel ?? 0;

  const spellUrls = useSpellIconUrls(iconId);

  const canTrain =
    skillPoints > 0 && (maxLevel === 0 || spell.level < maxLevel);

  const cardRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      if (!spellUrls) return;
      e.preventDefault();
      const el = cardRef.current;
      if (!el) return;
      playSfxById(SfxId.InventoryPickup);
      startDrag({
        element: el,
        info: {
          source: 'spell',
          itemId: spell.id,
          pointerId: e.pointerId,
          ghostX: e.clientX,
          ghostY: e.clientY,
          offsetX: 17,
          offsetY: 16,
          graphicId: 0,
          ghostWidth: 34,
          ghostHeight: 32,
          ghostImageUrl: spellUrls.normal,
        },
        onResolve: (result) => {
          if (result.type === 'hotbar-slot') {
            setSlot(result.index, { type: SlotType.Skill, typeId: spell.id });
            playSfxById(SfxId.InventoryPlace);
          }
        },
      });
    },
    [spell.id, spellUrls, startDrag, setSlot],
  );

  const handleTrain = useCallback(() => {
    client.statSkillController.trainSkill(spell.id);
  }, [client, spell.id]);

  const levelLabel = locale.spellsLevel.replace('{level}', String(spell.level));

  return (
    <div
      ref={cardRef}
      class={`flex cursor-grab flex-col items-center gap-1 rounded border ${UI_PANEL_BORDER} ${UI_ITEM_BG} p-2 active:cursor-grabbing`}
      style={{ touchAction: 'none' }}
      onPointerDown={handlePointerDown}
    >
      {/* Spell icon */}
      <div
        class={`flex h-12 w-12 items-center justify-center overflow-hidden rounded border ${UI_PANEL_BORDER} bg-base-300`}
      >
        {spellUrls ? (
          <img
            src={spellUrls.normal}
            alt=''
            class='h-8 w-8.5 object-contain'
            draggable={false}
          />
        ) : (
          <div class='h-8 w-8.5 rounded bg-base-content/10' />
        )}
      </div>

      {/* Name */}
      <p class='wrap-break-word line-clamp-2 w-full text-center font-semibold text-xs leading-tight'>
        {name}
      </p>

      {/* Level */}
      <p class='text-primary/60 text-xs'>{levelLabel}</p>

      {/* Train button */}
      <Button
        variant={['xs', canTrain ? 'primary' : 'disabled']}
        class='w-full'
        disabled={!canTrain}
        onClick={handleTrain}
      >
        <FaArrowUp size={10} />
        {locale.spellsTrainBtn}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SpellsDialog
// ---------------------------------------------------------------------------

export function SpellsDialog() {
  const client = useClient();
  const { locale } = useLocale();
  const blur = useBackdropBlur();

  const [spells, setSpells] = useState<Spell[]>(() => [...client.spells]);
  const [skillPoints, setSkillPoints] = useState(() => client.skillPoints);

  useEffect(() => {
    const onSkillsChanged = () => {
      setSpells([...client.spells]);
      setSkillPoints(client.skillPoints);
    };
    const onStatsUpdate = () => {
      setSkillPoints(client.skillPoints);
    };
    client.statSkillController.subscribeSkillsChanged(onSkillsChanged);
    client.statsController.subscribeStatsUpdated(onStatsUpdate);
    return () => {
      client.statSkillController.unsubscribeSkillsChanged(onSkillsChanged);
      client.statsController.unsubscribeStatsUpdated(onStatsUpdate);
    };
  }, [client]);

  const skillPointsLabel = locale.spellsSkillPoints.replace(
    '{count}',
    String(skillPoints),
  );

  return (
    <DialogBase id='spells' title={locale.spellsTitle} size='md' avoidBottom>
      {/* Skill points header */}
      <div
        class={`sticky top-0 z-10 ${UI_PANEL_BORDER} border-b ${UI_STICKY_BG} px-3 py-1.5 ${blur}`}
      >
        <p class='text-center font-medium text-primary text-sm'>
          {skillPointsLabel}
        </p>
      </div>

      {spells.length === 0 ? (
        <p class='py-6 text-center text-base-content/50 text-sm'>
          {locale.spellsNoSpells}
        </p>
      ) : (
        <div class='grid max-h-80 grid-cols-2 gap-2 overflow-y-auto p-2 sm:grid-cols-3'>
          {spells.map((spell) => (
            <SpellCard key={spell.id} spell={spell} skillPoints={skillPoints} />
          ))}
        </div>
      )}
    </DialogBase>
  );
}
