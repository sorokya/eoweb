import type { EifRecord } from 'eolib';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { EquipmentSlot } from '@/equipment';
import { playSfxById, SfxId } from '@/sfx';
import { ItemIcon, QuestBookList, Tabs } from '@/ui/components';
import { useCharacterInfo, useClient, useLocale } from '@/ui/context';
import { useItemDrag, usePlayerStats } from '@/ui/in-game';
import { capitalize, getItemMeta } from '@/utils';
import { DialogBase } from './dialog-base';

const EQUIP_CELL = 23;

type CharacterTab = 'paperdoll' | 'stats' | 'book';

function getEquipTooltipLines(record: EifRecord): string[] {
  return [record.name, ...getItemMeta(record)];
}

type SlotConfig = {
  key: string;
  label: string;
  itemId: number;
  slot: EquipmentSlot;
  gridColumn: string;
  gridRow: string;
};

function EquipSlot({ label, itemId, slot, gridColumn, gridRow }: SlotConfig) {
  const client = useClient();
  const info = useCharacterInfo();
  const { startDrag, cancelDrag } = useItemDrag();
  const record = itemId ? client.getEifRecordById(itemId) : null;
  const tooltipLines = record ? getEquipTooltipLines(record) : null;
  const isOwnCharacter = info?.details.playerId === client.playerId;
  const [touchTooltip, setTouchTooltip] = useState(false);
  const slotRef = useRef<HTMLDivElement>(null);

  // Clear touch tooltip when touching outside this slot
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      if (!slotRef.current?.contains(e.target as Node)) {
        setTouchTooltip(false);
      }
    };
    window.addEventListener('pointerdown', handler);
    return () => window.removeEventListener('pointerdown', handler);
  }, []);

  const doUnequip = () => {
    client.inventoryController.unequipItem(slot);
  };

  const onPointerDown = (e: PointerEvent) => {
    if (!record || !itemId) return;
    if (e.button !== 0 && e.pointerType !== 'touch') return;
    e.preventDefault();

    if (e.pointerType === 'touch') {
      setTouchTooltip(true);
    }

    if (!isOwnCharacter) return;

    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();

    // Long-press on touch: cancel drag and unequip
    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    if (e.pointerType === 'touch') {
      longPressTimer = setTimeout(() => {
        longPressTimer = null;
        cancelDrag();
        setTouchTooltip(false);
        doUnequip();
      }, 700);
    }

    playSfxById(SfxId.InventoryPickup);

    startDrag({
      element: e.currentTarget as Element,
      info: {
        source: 'equipment',
        itemId,
        equipSlot: slot,
        pointerId: e.pointerId,
        ghostX: e.clientX,
        ghostY: e.clientY,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
        graphicId: record.graphicId,
        ghostWidth: rect.width,
        ghostHeight: rect.height,
      },
      onResolve: (result) => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        if (result.type !== 'cancelled') {
          doUnequip();
        }
      },
    });
  };

  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    if (!record || !itemId || !isOwnCharacter) return;
    doUnequip();
  };

  return (
    <div
      ref={slotRef}
      data-equip-slot={isOwnCharacter ? slot : undefined}
      class={`group relative flex items-center justify-center rounded border bg-base-200 ${itemId ? 'border-primary/30 bg-primary/5' : 'border-base-300'}${isOwnCharacter && itemId ? ' cursor-grab' : ''}`}
      style={{ gridColumn, gridRow }}
      onPointerDown={onPointerDown}
      onContextMenu={onContextMenu}
    >
      {record ? (
        <ItemIcon
          graphicId={record.graphicId}
          alt={record.name}
          class='pointer-events-none h-full w-full object-contain'
        />
      ) : (
        <span class='pointer-events-none text-center text-[7px] text-base-content/40 leading-tight'>
          {label}
        </span>
      )}
      {tooltipLines && tooltipLines.length > 0 && (
        <div
          class={`pointer-events-none absolute top-0 left-full z-50 ml-1 w-max max-w-40 rounded bg-base-300 px-2 py-1 text-xs shadow-lg ${touchTooltip ? 'block' : 'hidden group-hover:block'}`}
        >
          {tooltipLines.map((line, i) => (
            <div key={i} class={i === 0 ? 'font-semibold' : 'opacity-70'}>
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PaperdollTab() {
  const info = useCharacterInfo();
  const { locale } = useLocale();

  const slots: SlotConfig[] = [
    {
      key: 'hat',
      label: locale.slotHat,
      itemId: info?.equipment.hat ?? 0,
      slot: EquipmentSlot.Hat,
      gridColumn: '3 / span 2',
      gridRow: '1 / span 2',
    },
    {
      key: 'necklace',
      label: locale.slotNecklace,
      itemId: info?.equipment.necklace ?? 0,
      slot: EquipmentSlot.Necklace,
      gridColumn: '5 / span 2',
      gridRow: '1 / span 2',
    },
    {
      key: 'weapon',
      label: locale.slotWeapon,
      itemId: info?.equipment.weapon ?? 0,
      slot: EquipmentSlot.Weapon,
      gridColumn: '1 / span 2',
      gridRow: '3 / span 3',
    },
    {
      key: 'armor',
      label: locale.slotArmor,
      itemId: info?.equipment.armor ?? 0,
      slot: EquipmentSlot.Armor,
      gridColumn: '3 / span 2',
      gridRow: '3 / span 3',
    },
    {
      key: 'shield',
      label: locale.slotShield,
      itemId: info?.equipment.shield ?? 0,
      slot: EquipmentSlot.Shield,
      gridColumn: '5 / span 2',
      gridRow: '3 / span 3',
    },
    {
      key: 'gloves',
      label: locale.slotGloves,
      itemId: info?.equipment.gloves ?? 0,
      slot: EquipmentSlot.Gloves,
      gridColumn: '1 / span 2',
      gridRow: '6 / span 2',
    },
    {
      key: 'belt',
      label: locale.slotBelt,
      itemId: info?.equipment.belt ?? 0,
      slot: EquipmentSlot.Belt,
      gridColumn: '3 / span 2',
      gridRow: '6',
    },
    {
      key: 'ring1',
      label: locale.slotRing1,
      itemId: info?.equipment.ring[0] ?? 0,
      slot: EquipmentSlot.Ring1,
      gridColumn: '5',
      gridRow: '6',
    },
    {
      key: 'ring2',
      label: locale.slotRing2,
      itemId: info?.equipment.ring[1] ?? 0,
      slot: EquipmentSlot.Ring2,
      gridColumn: '6',
      gridRow: '6',
    },
    {
      key: 'armlet1',
      label: locale.slotArmlet1,
      itemId: info?.equipment.armlet[0] ?? 0,
      slot: EquipmentSlot.Armlet1,
      gridColumn: '5',
      gridRow: '7',
    },
    {
      key: 'armlet2',
      label: locale.slotArmlet2,
      itemId: info?.equipment.armlet[1] ?? 0,
      slot: EquipmentSlot.Armlet2,
      gridColumn: '6',
      gridRow: '7',
    },
    {
      key: 'boots',
      label: locale.slotBoots,
      itemId: info?.equipment.boots ?? 0,
      slot: EquipmentSlot.Boots,
      gridColumn: '3 / span 2',
      gridRow: '7 / span 2',
    },
    {
      key: 'accessory',
      label: locale.slotAccessory,
      itemId: info?.equipment.accessory ?? 0,
      slot: EquipmentSlot.Accessory,
      gridColumn: '2',
      gridRow: '8',
    },
    {
      key: 'bracer1',
      label: locale.slotBracer1,
      itemId: info?.equipment.bracer[0] ?? 0,
      slot: EquipmentSlot.Bracer1,
      gridColumn: '5',
      gridRow: '8',
    },
    {
      key: 'bracer2',
      label: locale.slotBracer2,
      itemId: info?.equipment.bracer[1] ?? 0,
      slot: EquipmentSlot.Bracer2,
      gridColumn: '6',
      gridRow: '8',
    },
  ];

  const infoRows: [string, string][] = [
    [locale.charLabelName, info ? capitalize(info.details.name) : '—'],
    [locale.charLabelHome, info ? info.details.home : '—'],
    [locale.charLabelClass, info ? info.className : '—'],
    [
      locale.charLabelPartner,
      info?.details.partner ? capitalize(info.details.partner) : '—',
    ],
    [locale.charLabelTitle, info?.details.title || '—'],
    [locale.charLabelGuild, info?.details.guild || '—'],
    [locale.charLabelRank, info?.details.guildRank || '—'],
  ];

  return (
    <div class='flex gap-3'>
      {/* Equipment grid (left) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(6, ${EQUIP_CELL}px)`,
          gridTemplateRows: `repeat(8, ${EQUIP_CELL}px)`,
          gap: 1,
        }}
      >
        {slots.map(({ key, ...rest }) => (
          <EquipSlot key={key} {...rest} />
        ))}
      </div>

      {/* Character info (right) */}
      <div class='flex min-w-0 flex-1 flex-col gap-0.5 text-sm'>
        {infoRows.map(([label, value]) => (
          <div key={label} class='flex justify-between gap-2'>
            <span class='shrink-0 text-primary/60'>{label}</span>
            <span class='min-w-0 truncate font-medium'>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsTab() {
  const { locale } = useLocale();
  const { baseStats: base, secondaryStats: secondary } = usePlayerStats();

  const baseRows: [string, number][] = [
    [locale.statsLabelStr, base.str],
    [locale.statsLabelInt, base.intl],
    [locale.statsLabelWis, base.wis],
    [locale.statsLabelAgi, base.agi],
    [locale.statsLabelCon, base.con],
    [locale.statsLabelCha, base.cha],
  ];

  const derivedRows: [string, string][] = [
    [
      locale.statsLabelDmg,
      `${secondary.minDamage.toLocaleString()} - ${secondary.maxDamage.toLocaleString()}`,
    ],
    [locale.statsLabelAccuracy, secondary.accuracy.toLocaleString()],
    [locale.statsLabelEvade, secondary.evade.toLocaleString()],
    [locale.statsLabelArmor, secondary.armor.toLocaleString()],
  ];

  return (
    <div class='flex gap-4 text-sm'>
      <div class='flex flex-1 flex-col gap-0.5'>
        {baseRows.map(([label, value]) => (
          <div key={label} class='flex justify-between'>
            <span class='text-primary/60'>{label}</span>
            <span>{value.toLocaleString()}</span>
          </div>
        ))}
      </div>
      <div class='flex flex-1 flex-col gap-0.5'>
        {derivedRows.map(([label, value]) => (
          <div key={label} class='flex justify-between'>
            <span class='text-primary/60'>{label}</span>
            <span>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BookTab() {
  const client = useClient();
  const info = useCharacterInfo();
  const isOwnCharacter = info?.details.playerId === client.playerId;

  const [questNames, setQuestNames] = useState<string[]>(
    () => client.questController.bookQuestNames,
  );

  useEffect(() => {
    const handleBookOpened = (names: string[]) => {
      setQuestNames([...names]);
    };
    client.questController.subscribeBookOpened(handleBookOpened);

    // Request book data when this tab is mounted and it's our own character
    if (isOwnCharacter) {
      client.socialController.requestBook(client.playerId);
    }

    return () => {
      client.questController.unsubscribeBookOpened(handleBookOpened);
    };
  }, [client, isOwnCharacter]);

  return <QuestBookList questNames={questNames} />;
}

export function CharacterDialog() {
  const { locale } = useLocale();
  const [activeTab, setActiveTab] = useState<CharacterTab>('paperdoll');
  const client = useClient();
  const info = useCharacterInfo();

  const TABS = useMemo(() => {
    if (info?.details.playerId === client.playerId) {
      return [
        { id: 'paperdoll', label: locale.charTabPaperdoll },
        { id: 'stats', label: locale.charTabStats },
        { id: 'book', label: locale.charTabBook },
      ] as const;
    }

    return [
      { id: 'paperdoll', label: locale.charTabPaperdoll },
      { id: 'book', label: locale.charTabBook },
    ] as const;
  }, [info, client, locale]);

  return (
    <DialogBase id='character' title={locale.charDialogTitle} size='md'>
      <div class='flex flex-col gap-3'>
        <Tabs
          items={TABS as unknown as { id: string; label: string }[]}
          activeId={activeTab}
          onSelect={(id) => setActiveTab(id as CharacterTab)}
          style='border'
          size='sm'
        />
        {activeTab === 'paperdoll' && <PaperdollTab />}
        {activeTab === 'stats' && <StatsTab />}
        {activeTab === 'book' && <BookTab />}
      </div>
    </DialogBase>
  );
}
