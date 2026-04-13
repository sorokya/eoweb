import { AdminLevel } from 'eolib';
import { useState } from 'preact/hooks';
import { ItemIcon, Tabs } from '@/ui/components';
import { useClient } from '@/ui/context';
import { usePlayerStats } from '@/ui/in-game';
import { DialogBase } from './dialog-base';

type CharacterTab = 'paperdoll' | 'stats' | 'book';

const TABS = [
  { id: 'paperdoll', label: 'Paperdoll' },
  { id: 'stats', label: 'Stats' },
  { id: 'book', label: 'Book' },
] as const;

function adminLabel(level: AdminLevel): string | null {
  switch (level) {
    case AdminLevel.LightGuide:
      return 'Light Guide';
    case AdminLevel.Guardian:
      return 'Guardian';
    case AdminLevel.GameMaster:
      return 'Game Master';
    case AdminLevel.HighGameMaster:
      return 'High GM';
    case AdminLevel.Spy:
      return 'Spy';
    default:
      return null;
  }
}

type EquipSlotProps = {
  label: string;
  itemId: number;
};

function EquipSlot({ label, itemId }: EquipSlotProps) {
  const client = useClient();
  const record = itemId ? client.getEifRecordById(itemId) : null;

  return (
    <div
      class='tooltip tooltip-bottom flex flex-col items-center gap-0.5'
      data-tip={record?.name ?? label}
    >
      <div class='flex h-10 w-10 items-center justify-center rounded border border-base-300 bg-base-200'>
        {record ? (
          <ItemIcon
            graphicId={record.graphicId}
            alt={record.name}
            class='max-h-9 max-w-9 object-contain'
          />
        ) : (
          <span class='text-center text-[9px] text-base-content/40 leading-tight'>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

function PaperdollTab() {
  const client = useClient();
  const stats = usePlayerStats();
  const eq = client.equipment;
  const admin = adminLabel(client.admin);
  const classRecord = client.ecf?.classes?.[client.classId - 1];

  return (
    <div class='flex flex-col gap-3'>
      {/* Character info */}
      <div class='flex flex-col gap-0.5 text-sm'>
        {[
          ['Name', stats.name],
          ['Title', stats.title || '—'],
          ['Home', stats.home || '—'],
          ['Partner', stats.partner || '—'],
          ['Guild', client.guildName || '—'],
          ['Rank', client.guildRankName || '—'],
          ['Class', classRecord?.name ?? '—'],
        ].map(([label, value]) => (
          <div key={label} class='flex justify-between gap-2'>
            <span class='opacity-60'>{label}</span>
            <span class='max-w-[160px] truncate font-medium'>{value}</span>
          </div>
        ))}
        {admin && (
          <div class='flex justify-between gap-2'>
            <span class='opacity-60'>Admin</span>
            <span class='badge badge-warning badge-sm'>{admin}</span>
          </div>
        )}
      </div>

      <div class='divider my-0' />

      {/* Equipment slots */}
      <div class='flex flex-col items-center gap-2'>
        {/* Row: Hat */}
        <div class='flex justify-center gap-2'>
          <EquipSlot label='Hat' itemId={eq.hat} />
        </div>

        {/* Row: Necklace | Armor | Weapon/Shield */}
        <div class='flex w-full justify-between gap-2'>
          <div class='flex flex-col gap-2'>
            <EquipSlot label='Necklace' itemId={eq.necklace} />
            <EquipSlot label='Ring 1' itemId={eq.ring[0] ?? 0} />
            <EquipSlot label='Ring 2' itemId={eq.ring[1] ?? 0} />
          </div>
          <EquipSlot label='Armor' itemId={eq.armor} />
          <div class='flex flex-col gap-2'>
            <EquipSlot label='Weapon' itemId={eq.weapon} />
            <EquipSlot label='Shield' itemId={eq.shield} />
          </div>
        </div>

        {/* Row: Gloves | Belt | Boots */}
        <div class='flex justify-center gap-2'>
          <EquipSlot label='Gloves' itemId={eq.gloves} />
          <EquipSlot label='Belt' itemId={eq.belt} />
          <EquipSlot label='Boots' itemId={eq.boots} />
        </div>

        {/* Row: Accessories & bracers */}
        <div class='flex justify-center gap-2'>
          <EquipSlot label='Accessory' itemId={eq.accessory} />
          <EquipSlot label='Armlet 1' itemId={eq.armlet[0] ?? 0} />
          <EquipSlot label='Armlet 2' itemId={eq.armlet[1] ?? 0} />
          <EquipSlot label='Bracer 1' itemId={eq.bracer[0] ?? 0} />
          <EquipSlot label='Bracer 2' itemId={eq.bracer[1] ?? 0} />
        </div>
      </div>
    </div>
  );
}

function StatsTab() {
  const stats = usePlayerStats();
  const b = stats.baseStats;
  const s = stats.secondaryStats;

  const baseRows: [string, number][] = [
    ['STR', b.str],
    ['INT', b.intl],
    ['WIS', b.wis],
    ['AGI', b.agi],
    ['CON', b.con],
    ['CHA', b.cha],
  ];

  const derivedRows: [string, string][] = [
    ['Min DMG', String(s.minDamage)],
    ['Max DMG', String(s.maxDamage)],
    ['Accuracy', String(s.accuracy)],
    ['Evade', String(s.evade)],
    ['Armor', String(s.armor)],
  ];

  return (
    <div class='flex gap-4 text-sm'>
      <div class='flex flex-1 flex-col gap-0.5'>
        <p class='mb-1 font-semibold text-xs uppercase opacity-60'>Base</p>
        {baseRows.map(([label, value]) => (
          <div key={label} class='flex justify-between'>
            <span class='opacity-60'>{label}</span>
            <span>{value}</span>
          </div>
        ))}
      </div>
      <div class='flex flex-1 flex-col gap-0.5'>
        <p class='mb-1 font-semibold text-xs uppercase opacity-60'>Derived</p>
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
  return (
    <div class='py-4 text-center text-sm opacity-60'>
      Quest history coming soon
    </div>
  );
}

export function CharacterDialog() {
  const [activeTab, setActiveTab] = useState<CharacterTab>('paperdoll');

  return (
    <DialogBase id='character' title='Character' defaultWidth={300}>
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
