import type { EifRecord } from 'eolib';
import { useState } from 'preact/hooks';
import { ItemIcon, Tabs } from '@/ui/components';
import { useClient, useLocale } from '@/ui/context';
import { usePlayerStats } from '@/ui/in-game';
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
  gridColumn: string;
  gridRow: string;
};

function EquipSlot({ label, itemId, gridColumn, gridRow }: SlotConfig) {
  const client = useClient();
  const record = itemId ? client.getEifRecordById(itemId) : null;
  const tooltipLines = record ? getEquipTooltipLines(record) : null;

  return (
    <div
      class='group relative flex items-center justify-center rounded border border-base-300 bg-base-200'
      style={{ gridColumn, gridRow }}
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
        <div class='pointer-events-none absolute top-0 left-full z-50 ml-1 hidden w-max max-w-40 rounded bg-base-300 px-2 py-1 text-xs shadow-lg group-hover:block'>
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
  const client = useClient();
  const { locale } = useLocale();
  const stats = usePlayerStats();
  const eq = client.equipment;
  const classRecord = client.ecf?.classes?.[client.classId - 1];

  const slots: SlotConfig[] = [
    {
      key: 'hat',
      label: locale.slotHat,
      itemId: eq.hat,
      gridColumn: '3 / span 2',
      gridRow: '1 / span 2',
    },
    {
      key: 'necklace',
      label: locale.slotNecklace,
      itemId: eq.necklace,
      gridColumn: '5 / span 2',
      gridRow: '1 / span 2',
    },
    {
      key: 'weapon',
      label: locale.slotWeapon,
      itemId: eq.weapon,
      gridColumn: '1 / span 2',
      gridRow: '3 / span 3',
    },
    {
      key: 'armor',
      label: locale.slotArmor,
      itemId: eq.armor,
      gridColumn: '3 / span 2',
      gridRow: '3 / span 3',
    },
    {
      key: 'shield',
      label: locale.slotShield,
      itemId: eq.shield,
      gridColumn: '5 / span 2',
      gridRow: '3 / span 3',
    },
    {
      key: 'gloves',
      label: locale.slotGloves,
      itemId: eq.gloves,
      gridColumn: '1 / span 2',
      gridRow: '6 / span 2',
    },
    {
      key: 'belt',
      label: locale.slotBelt,
      itemId: eq.belt,
      gridColumn: '3 / span 2',
      gridRow: '6',
    },
    {
      key: 'ring1',
      label: locale.slotRing1,
      itemId: eq.ring[0] ?? 0,
      gridColumn: '5',
      gridRow: '6',
    },
    {
      key: 'ring2',
      label: locale.slotRing2,
      itemId: eq.ring[1] ?? 0,
      gridColumn: '6',
      gridRow: '6',
    },
    {
      key: 'armlet1',
      label: locale.slotArmlet1,
      itemId: eq.armlet[0] ?? 0,
      gridColumn: '5',
      gridRow: '7',
    },
    {
      key: 'armlet2',
      label: locale.slotArmlet2,
      itemId: eq.armlet[1] ?? 0,
      gridColumn: '6',
      gridRow: '7',
    },
    {
      key: 'boots',
      label: locale.slotBoots,
      itemId: eq.boots,
      gridColumn: '3 / span 2',
      gridRow: '7 / span 2',
    },
    {
      key: 'accessory',
      label: locale.slotAccessory,
      itemId: eq.accessory,
      gridColumn: '2',
      gridRow: '8',
    },
    {
      key: 'bracer1',
      label: locale.slotBracer1,
      itemId: eq.bracer[0] ?? 0,
      gridColumn: '5',
      gridRow: '8',
    },
    {
      key: 'bracer2',
      label: locale.slotBracer2,
      itemId: eq.bracer[1] ?? 0,
      gridColumn: '6',
      gridRow: '8',
    },
  ];

  const infoRows: [string, string][] = [
    [locale.charLabelName, capitalize(stats.name)],
    [locale.charLabelHome, stats.home || '—'],
    [locale.charLabelClass, classRecord?.name ?? '—'],
    [locale.charLabelPartner, stats.partner ? capitalize(stats.partner) : '—'],
    [locale.charLabelTitle, stats.title || '—'],
    [locale.charLabelGuild, client.guildName || '—'],
    [locale.charLabelRank, client.guildRankName || '—'],
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
            <span class='shrink-0 opacity-60'>{label}</span>
            <span class='min-w-0 truncate font-medium'>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsTab() {
  const { locale } = useLocale();
  const stats = usePlayerStats();
  const b = stats.baseStats;
  const s = stats.secondaryStats;

  const baseRows: [string, number][] = [
    [locale.statsLabelStr, b.str],
    [locale.statsLabelInt, b.intl],
    [locale.statsLabelWis, b.wis],
    [locale.statsLabelAgi, b.agi],
    [locale.statsLabelCon, b.con],
    [locale.statsLabelCha, b.cha],
  ];

  const derivedRows: [string, string][] = [
    [
      locale.statsLabelDmg,
      `${s.minDamage.toLocaleString()} - ${s.maxDamage.toLocaleString()}`,
    ],
    [locale.statsLabelAccuracy, s.accuracy.toLocaleString()],
    [locale.statsLabelEvade, s.evade.toLocaleString()],
    [locale.statsLabelArmor, s.armor.toLocaleString()],
  ];

  return (
    <div class='flex gap-4 text-sm'>
      <div class='flex flex-1 flex-col gap-0.5'>
        {baseRows.map(([label, value]) => (
          <div key={label} class='flex justify-between'>
            <span class='opacity-60'>{label}</span>
            <span>{value.toLocaleString()}</span>
          </div>
        ))}
      </div>
      <div class='flex flex-1 flex-col gap-0.5'>
        {derivedRows.map(([label, value]) => (
          <div key={label} class='flex justify-between'>
            <span class='opacity-60'>{label}</span>
            <span>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BookTab() {
  const { locale } = useLocale();
  return (
    <div class='py-4 text-center text-sm opacity-60'>
      {locale.charQuestComingSoon}
    </div>
  );
}

export function CharacterDialog() {
  const { locale } = useLocale();
  const [activeTab, setActiveTab] = useState<CharacterTab>('paperdoll');

  const TABS = [
    { id: 'paperdoll', label: locale.charTabPaperdoll },
    { id: 'stats', label: locale.charTabStats },
    { id: 'book', label: locale.charTabBook },
  ] as const;

  return (
    <DialogBase
      id='character'
      title={locale.charDialogTitle}
      defaultWidth={360}
    >
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
