import { AdminLevel } from 'eolib';
import { useState } from 'preact/hooks';
import { ItemIcon, Tabs } from '@/ui/components';
import { useClient, useLocale } from '@/ui/context';
import { usePlayerStats } from '@/ui/in-game';
import { DialogBase } from './dialog-base';

type CharacterTab = 'paperdoll' | 'stats' | 'book';

function adminLabel(
  level: AdminLevel,
  locale: ReturnType<typeof useLocale>['locale'],
): string | null {
  switch (level) {
    case AdminLevel.LightGuide:
      return locale.adminLightGuide;
    case AdminLevel.Guardian:
      return locale.adminGuardian;
    case AdminLevel.GameMaster:
      return locale.adminGameMaster;
    case AdminLevel.HighGameMaster:
      return locale.adminHighGameMaster;
    case AdminLevel.Spy:
      return locale.adminSpy;
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
      <div class='flex h-8 w-8 items-center justify-center rounded border border-base-300 bg-base-200'>
        {record ? (
          <ItemIcon
            graphicId={record.graphicId}
            alt={record.name}
            class='max-h-7 max-w-7 object-contain'
          />
        ) : (
          <span class='text-center text-[8px] text-base-content/40 leading-tight'>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

function PaperdollTab() {
  const client = useClient();
  const { locale } = useLocale();
  const stats = usePlayerStats();
  const eq = client.equipment;
  const admin = adminLabel(client.admin, locale);
  const classRecord = client.ecf?.classes?.[client.classId - 1];

  const infoRows: [string, string][] = [
    [locale.charLabelName, stats.name],
    [locale.charLabelTitle, stats.title || '—'],
    [locale.charLabelHome, stats.home || '—'],
    [locale.charLabelPartner, stats.partner || '—'],
    [locale.charLabelGuild, client.guildName || '—'],
    [locale.charLabelRank, client.guildRankName || '—'],
    [locale.charLabelClass, classRecord?.name ?? '—'],
  ];

  return (
    <div class='flex gap-3'>
      {/* Equipment slots (left) */}
      <div class='flex flex-col items-center gap-1.5'>
        <div class='flex gap-1.5'>
          <EquipSlot label={locale.slotHat} itemId={eq.hat} />
        </div>
        <div class='flex gap-1.5'>
          <EquipSlot label={locale.slotNecklace} itemId={eq.necklace} />
          <EquipSlot label={locale.slotArmor} itemId={eq.armor} />
          <EquipSlot label={locale.slotWeapon} itemId={eq.weapon} />
        </div>
        <div class='flex gap-1.5'>
          <EquipSlot label={locale.slotRing1} itemId={eq.ring[0] ?? 0} />
          <EquipSlot label={locale.slotRing2} itemId={eq.ring[1] ?? 0} />
          <EquipSlot label={locale.slotShield} itemId={eq.shield} />
        </div>
        <div class='flex gap-1.5'>
          <EquipSlot label={locale.slotGloves} itemId={eq.gloves} />
          <EquipSlot label={locale.slotBelt} itemId={eq.belt} />
          <EquipSlot label={locale.slotBoots} itemId={eq.boots} />
        </div>
        <div class='flex flex-wrap justify-center gap-1.5'>
          <EquipSlot label={locale.slotAccessory} itemId={eq.accessory} />
          <EquipSlot label={locale.slotArmlet1} itemId={eq.armlet[0] ?? 0} />
          <EquipSlot label={locale.slotArmlet2} itemId={eq.armlet[1] ?? 0} />
        </div>
        <div class='flex gap-1.5'>
          <EquipSlot label={locale.slotBracer1} itemId={eq.bracer[0] ?? 0} />
          <EquipSlot label={locale.slotBracer2} itemId={eq.bracer[1] ?? 0} />
        </div>
      </div>

      {/* Character info (right) */}
      <div class='flex min-w-0 flex-1 flex-col gap-0.5 text-sm'>
        {infoRows.map(([label, value]) => (
          <div key={label} class='flex justify-between gap-2'>
            <span class='shrink-0 opacity-60'>{label}</span>
            <span class='min-w-0 truncate font-medium'>{value}</span>
          </div>
        ))}
        {admin && (
          <div class='flex justify-between gap-2'>
            <span class='shrink-0 opacity-60'>{locale.charLabelAdmin}</span>
            <span class='badge badge-warning badge-sm'>{admin}</span>
          </div>
        )}
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
    [locale.statsLabelMinDmg, String(s.minDamage)],
    [locale.statsLabelMaxDmg, String(s.maxDamage)],
    [locale.statsLabelAccuracy, String(s.accuracy)],
    [locale.statsLabelEvade, String(s.evade)],
    [locale.statsLabelArmor, String(s.armor)],
  ];

  return (
    <div class='flex gap-4 text-sm'>
      <div class='flex flex-1 flex-col gap-0.5'>
        <p class='mb-1 font-semibold text-xs uppercase opacity-60'>
          {locale.statsLabelBase}
        </p>
        {baseRows.map(([label, value]) => (
          <div key={label} class='flex justify-between'>
            <span class='opacity-60'>{label}</span>
            <span>{value}</span>
          </div>
        ))}
      </div>
      <div class='flex flex-1 flex-col gap-0.5'>
        <p class='mb-1 font-semibold text-xs uppercase opacity-60'>
          {locale.statsLabelDerived}
        </p>
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
      defaultWidth={320}
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
