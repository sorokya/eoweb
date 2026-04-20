import type { SkillLearn } from 'eolib';
import { useCallback, useEffect, useState } from 'preact/hooks';
import {
  FaBook,
  FaRecycle,
  FaSkullCrossbones,
  FaTimesCircle,
} from 'react-icons/fa';
import { DialogResourceID } from '@/edf';
import { Button, Tabs } from '@/ui/components';
import { UI_ITEM_BG, UI_PANEL_BORDER, UI_STICKY_BG } from '@/ui/consts';
import { useClient, useLocale } from '@/ui/context';
import { useBackdropBlur, useSpellIconUrls } from '@/ui/in-game';
import { DialogBase } from './dialog-base';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SkillMasterTab = 'learn' | 'forget';

// ---------------------------------------------------------------------------
// Spell icon display
// ---------------------------------------------------------------------------

function SpellIconDisplay({
  iconId,
  size = 'md',
}: {
  iconId: number | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const urls = useSpellIconUrls(iconId);
  const sizeMap = {
    sm: { outer: 'h-8 w-8', inner: 'h-6 w-6' },
    md: { outer: 'h-12 w-12', inner: 'h-8 w-8' },
    lg: { outer: 'h-20 w-20', inner: 'h-[34px] w-[34px]' },
  };
  const { outer, inner } = sizeMap[size];
  return (
    <div
      class={`flex ${outer} shrink-0 items-center justify-center overflow-hidden rounded border ${UI_PANEL_BORDER} bg-base-300`}
    >
      {urls ? (
        <img
          src={urls.normal}
          alt=''
          class={`${inner} object-contain`}
          draggable={false}
        />
      ) : iconId !== null ? (
        <div class={`skeleton ${inner}`} />
      ) : (
        <div class={`${inner} rounded bg-base-content/10`} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Learn tab
// ---------------------------------------------------------------------------

function LearnTab({ skills }: { skills: SkillLearn[] }) {
  const client = useClient();
  const { locale } = useLocale();

  const handleLearn = useCallback(
    (skill: SkillLearn) => {
      const strings = client.getDialogStrings(
        DialogResourceID.SKILL_LEARN_CONFIRMATION,
      );
      client.alertController.showConfirm(strings[0], strings[1], (ok) => {
        if (ok) client.statSkillController.learnSkill(skill.id);
      });
    },
    [client],
  );

  if (skills.length === 0) {
    return (
      <p class='py-6 text-center text-base-content/50 text-sm'>
        {locale.skillMasterNoSkillsToLearn}
      </p>
    );
  }

  return (
    <div class='space-y-2 p-2'>
      {skills.map((skill) => {
        const record = client.getEsfRecordById(skill.id);
        const iconId = record?.iconId ?? null;
        const name =
          record?.name ??
          locale.itemFallbackName.replace('{id}', String(skill.id));

        const playerLevel = client.level;
        const playerClassId = client.classId;
        const playerStr = client.baseStats.str;
        const playerIntl = client.baseStats.intl;
        const playerWis = client.baseStats.wis;
        const playerAgi = client.baseStats.agi;
        const playerCon = client.baseStats.con;
        const playerCha = client.baseStats.cha;
        const gold = client.inventoryController.goldAmount;

        const alreadyLearned = client.spells.some((s) => s.id === skill.id);

        // Check requirements
        const levelOk =
          skill.levelRequirement === 0 || playerLevel >= skill.levelRequirement;
        const classOk =
          skill.classRequirement === 0 ||
          playerClassId === skill.classRequirement;
        const goldOk = skill.cost === 0 || gold >= skill.cost;

        const stats = skill.statRequirements;
        const strOk = stats.str === 0 || playerStr >= stats.str;
        const intlOk = stats.intl === 0 || playerIntl >= stats.intl;
        const wisOk = stats.wis === 0 || playerWis >= stats.wis;
        const agiOk = stats.agi === 0 || playerAgi >= stats.agi;
        const conOk = stats.con === 0 || playerCon >= stats.con;
        const chaOk = stats.cha === 0 || playerCha >= stats.cha;

        const prereqSkillsOk = skill.skillRequirements
          .filter((id) => id > 0)
          .every((id) => client.spells.some((s) => s.id === id));

        const canLearn =
          !alreadyLearned &&
          levelOk &&
          classOk &&
          goldOk &&
          strOk &&
          intlOk &&
          wisOk &&
          agiOk &&
          conOk &&
          chaOk &&
          prereqSkillsOk;

        const reqs: { label: string; value: string; met: boolean }[] = [];

        if (skill.levelRequirement > 0) {
          reqs.push({
            label: locale.skillMasterLevelReq,
            value: String(skill.levelRequirement),
            met: levelOk,
          });
        }
        if (skill.classRequirement > 0) {
          const className =
            client.getEcfRecordById(skill.classRequirement)?.name ??
            `Class ${skill.classRequirement}`;
          reqs.push({
            label: locale.skillMasterClassReq,
            value: className,
            met: classOk,
          });
        }
        if (stats.str > 0)
          reqs.push({
            label: locale.skillMasterStatStr,
            value: String(stats.str),
            met: strOk,
          });
        if (stats.intl > 0)
          reqs.push({
            label: locale.skillMasterStatIntl,
            value: String(stats.intl),
            met: intlOk,
          });
        if (stats.wis > 0)
          reqs.push({
            label: locale.skillMasterStatWis,
            value: String(stats.wis),
            met: wisOk,
          });
        if (stats.agi > 0)
          reqs.push({
            label: locale.skillMasterStatAgi,
            value: String(stats.agi),
            met: agiOk,
          });
        if (stats.con > 0)
          reqs.push({
            label: locale.skillMasterStatCon,
            value: String(stats.con),
            met: conOk,
          });
        if (stats.cha > 0)
          reqs.push({
            label: locale.skillMasterStatCha,
            value: String(stats.cha),
            met: chaOk,
          });

        const prereqSkillIds = skill.skillRequirements.filter((id) => id > 0);

        return (
          <div
            key={skill.id}
            class={`rounded border ${UI_PANEL_BORDER} ${UI_ITEM_BG} p-2`}
          >
            <div class='grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3'>
              {/* Left: icon + name + button */}
              <div class='flex flex-col items-center gap-2'>
                <SpellIconDisplay iconId={iconId} size='lg' />
                <p class='line-clamp-2 w-full break-words text-center font-semibold text-sm leading-tight'>
                  {name}
                </p>
                {alreadyLearned ? (
                  <span class='rounded bg-success/20 px-2 py-0.5 text-center font-medium text-success text-xs'>
                    Learned
                  </span>
                ) : (
                  <Button
                    variant={['xs', canLearn ? 'primary' : 'disabled']}
                    class='w-full'
                    onClick={() => handleLearn(skill)}
                    disabled={!canLearn}
                  >
                    <FaBook size={11} />
                    {locale.skillMasterLearnBtn}
                  </Button>
                )}
              </div>

              {/* Right: requirements table */}
              <div class='space-y-1'>
                {/* Cost */}
                {skill.cost > 0 && (
                  <div class='flex items-center gap-1'>
                    <span class='text-base-content/60 text-xs'>
                      {locale.skillMasterCost}:
                    </span>
                    <span
                      class={`font-medium text-xs tabular-nums ${goldOk ? 'text-success' : 'text-error'}`}
                    >
                      {skill.cost.toLocaleString()} {locale.skillMasterGold}
                    </span>
                  </div>
                )}

                {/* Stat/level/class requirements */}
                {reqs.length > 0 && (
                  <table
                    class={`table-zebra table-xs table w-full rounded border ${UI_PANEL_BORDER}`}
                  >
                    <tbody>
                      {reqs.map((req) => (
                        <tr key={req.label}>
                          <td class='text-base-content/60'>{req.label}</td>
                          <td
                            class={`text-right font-medium ${req.met ? 'text-success' : 'text-error'}`}
                          >
                            {req.value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Prerequisite skills */}
                {prereqSkillIds.length > 0 && (
                  <div class='space-y-0.5'>
                    <p class='text-base-content/60 text-xs'>
                      {locale.skillMasterSkillReq}:
                    </p>
                    {prereqSkillIds.map((reqId) => {
                      const reqRecord = client.getEsfRecordById(reqId);
                      const reqName =
                        reqRecord?.name ??
                        locale.itemFallbackName.replace('{id}', String(reqId));
                      const reqIconId = reqRecord?.iconId ?? null;
                      const reqMet = client.spells.some((s) => s.id === reqId);
                      return (
                        <div key={reqId} class='flex items-center gap-1.5'>
                          <SpellIconDisplay iconId={reqIconId} size='sm' />
                          <span
                            class={`text-xs ${reqMet ? 'text-success' : 'text-error'}`}
                          >
                            {reqName}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* No requirements */}
                {reqs.length === 0 &&
                  prereqSkillIds.length === 0 &&
                  skill.cost === 0 && (
                    <p class='text-base-content/50 text-xs italic'>
                      No requirements
                    </p>
                  )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Forget tab
// ---------------------------------------------------------------------------

function ForgetTab() {
  const client = useClient();
  const { locale } = useLocale();
  const [spells, setSpells] = useState(() => [...client.spells]);

  useEffect(() => {
    const update = () => setSpells([...client.spells]);
    client.statSkillController.subscribeSkillsChanged(update);
    return () => client.statSkillController.unsubscribeSkillsChanged(update);
  }, [client]);

  const handleForget = useCallback(
    (spellId: number) => {
      const strings = client.getDialogStrings(
        DialogResourceID.SKILL_PROMPT_TO_FORGET,
      );
      client.alertController.showConfirm(strings[0], strings[1], (ok) => {
        if (ok) client.statSkillController.forgetSkill(spellId);
      });
    },
    [client],
  );

  const handleReset = useCallback(() => {
    const strings = client.getDialogStrings(
      DialogResourceID.SKILL_RESET_CHARACTER_CONFIRMATION,
    );
    client.alertController.showConfirm(strings[0], strings[1], (ok) => {
      if (ok) client.statSkillController.resetCharacter();
    });
  }, [client]);

  return (
    <div class='flex flex-col gap-2 p-2'>
      {spells.length === 0 ? (
        <p class='py-6 text-center text-base-content/50 text-sm'>
          {locale.skillMasterNoSkillsLearned}
        </p>
      ) : (
        <div class='space-y-1'>
          {spells.map((spell) => {
            const record = client.getEsfRecordById(spell.id);
            const iconId = record?.iconId ?? null;
            const name =
              record?.name ??
              locale.itemFallbackName.replace('{id}', String(spell.id));

            return (
              <div
                key={spell.id}
                class={`flex items-center gap-2 rounded border ${UI_PANEL_BORDER} ${UI_ITEM_BG} px-2 py-1.5`}
              >
                <SpellIconDisplay iconId={iconId} size='sm' />
                <span class='min-w-0 flex-1 truncate font-medium text-sm'>
                  {name}
                </span>
                <Button
                  variant={['xs', 'error']}
                  onClick={() => handleForget(spell.id)}
                >
                  <FaTimesCircle size={11} />
                  {locale.skillMasterForgetBtn}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Reset character button */}
      <div class={`mt-2 ${UI_PANEL_BORDER} border-t pt-2`}>
        <Button
          variant={['sm', 'warning', 'outline']}
          class='w-full'
          onClick={handleReset}
        >
          <FaRecycle size={12} />
          {locale.skillMasterResetBtn}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SkillMasterDialog
// ---------------------------------------------------------------------------

export function SkillMasterDialog() {
  const client = useClient();
  const { locale } = useLocale();
  const [activeTab, setActiveTab] = useState<SkillMasterTab>('learn');
  const blur = useBackdropBlur();
  const [masterName, setMasterName] = useState(
    () => client.statSkillController.masterName,
  );
  const [skills, setSkills] = useState<SkillLearn[]>(
    () => client.statSkillController.availableSkills,
  );

  useEffect(() => {
    const handleOpened = (name: string, newSkills: SkillLearn[]) => {
      setMasterName(name);
      setSkills(newSkills);
      setActiveTab('learn');
    };
    client.statSkillController.subscribeOpened(handleOpened);
    return () => client.statSkillController.unsubscribeOpened(handleOpened);
  }, [client]);

  const learnCount = skills.filter(
    (s) => !client.spells.some((p) => p.id === s.id),
  ).length;

  const tabs = [
    {
      id: 'learn' as const,
      label: (
        <span class='flex items-center gap-1'>
          <FaBook size={11} />
          {locale.skillMasterLearnTab} ({learnCount})
        </span>
      ),
    },
    {
      id: 'forget' as const,
      label: (
        <span class='flex items-center gap-1'>
          <FaSkullCrossbones size={11} />
          {locale.skillMasterForgetTab}
        </span>
      ),
    },
  ];

  return (
    <DialogBase
      id='skillMaster'
      title={masterName || locale.skillMasterLearnTab}
      size='md'
    >
      <div
        class={`sticky top-0 z-10 ${UI_PANEL_BORDER} border-b ${UI_STICKY_BG} ${blur}`}
      >
        <Tabs
          items={tabs.map((t) => ({ id: t.id, label: t.label }))}
          activeId={activeTab}
          onSelect={(id) => setActiveTab(id as SkillMasterTab)}
          style='border'
        />
      </div>

      {activeTab === 'learn' && <LearnTab skills={skills} />}
      {activeTab === 'forget' && <ForgetTab />}
    </DialogBase>
  );
}
