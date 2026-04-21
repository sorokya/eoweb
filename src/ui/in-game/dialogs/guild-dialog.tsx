import { useEffect, useRef, useState } from 'preact/hooks';
import {
  FaArrowLeft,
  FaBuilding,
  FaCog,
  FaCoins,
  FaList,
  FaPlus,
  FaSearch,
  FaSignOutAlt,
  FaStar,
  FaTrash,
  FaUserMinus,
  FaUserShield,
  FaUsers,
} from 'react-icons/fa';
import { GOLD_ITEM_ID, GUILD_MIN_DEPOSIT } from '@/consts';
import { GuildDialogState } from '@/game-state';
import { Button, Tabs } from '@/ui/components';
import { UI_PANEL_BORDER, UI_STICKY_BG } from '@/ui/consts';
import { useClient, useLocale } from '@/ui/context';
import { useBackdropBlur } from '@/ui/in-game';
import { DialogBase } from './dialog-base';

type GuildTabId = 'registration' | 'create' | 'management' | 'lookup';
type ManageView =
  | 'menu'
  | 'description'
  | 'ranks'
  | 'bank'
  | 'kick'
  | 'assignRank';

function LabeledInput({
  id,
  label,
  value,
  maxLength,
  onChange,
  type = 'text',
}: {
  id: string;
  label: string;
  value: string;
  maxLength?: number;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label for={id} class='mb-1 block text-base-content/70 text-xs'>
        {label}
      </label>
      <input
        id={id}
        type={type}
        class={`input input-sm input-bordered w-full border ${UI_PANEL_BORDER}`}
        value={value}
        maxLength={maxLength}
        onKeyDown={(e) => e.stopPropagation()}
        onInput={(e) => onChange((e.target as HTMLInputElement).value)}
      />
    </div>
  );
}

function RegistrationTab() {
  const client = useClient();
  const { locale } = useLocale();

  const [_tick, setTick] = useState(0);
  const [joinTag, setJoinTag] = useState('');
  const [joinRecruiter, setJoinRecruiter] = useState('');

  useEffect(() => {
    const handleUpdated = () => setTick((t) => t + 1);
    client.guildController.subscribeUpdated(handleUpdated);
    return () => client.guildController.unsubscribeUpdated(handleUpdated);
  }, [client]);

  const isInGuild = client.guildTag.trim() !== '';

  if (isInGuild) {
    return (
      <div class='flex flex-col gap-4 p-2'>
        <div class={`rounded-lg border ${UI_PANEL_BORDER} p-3`}>
          <p class='mb-1 font-medium text-base-content/70 text-xs'>
            {locale.guildCurrentGuild}
          </p>
          <p class='font-bold text-sm'>{client.guildName}</p>
          <p class='text-base-content/70 text-xs'>
            [{client.guildTag.trim()}] — {client.guildRankName}
          </p>
        </div>
        <div class='flex flex-col gap-2'>
          <Button
            variant={['sm', 'warning']}
            class='w-full'
            onClick={() => {
              client.alertController.showConfirm(
                locale.guildLeaveConfirmTitle,
                locale.guildLeaveConfirmMessage,
                (confirmed) => {
                  if (confirmed) client.guildController.leaveGuild();
                },
              );
            }}
          >
            <FaSignOutAlt size={12} />
            {locale.guildLeave}
          </Button>
          {client.guildRank === 0 && (
            <Button
              variant={['sm', 'error']}
              class='w-full'
              onClick={() => {
                client.alertController.showConfirm(
                  locale.guildDisbandConfirmTitle,
                  locale.guildDisbandConfirmMessage,
                  (confirmed) => {
                    if (confirmed) client.guildController.disbandGuild();
                  },
                );
              }}
            >
              <FaTrash size={12} />
              {locale.guildDisband}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div class='flex flex-col gap-4 p-2'>
      <section class={`rounded-lg border ${UI_PANEL_BORDER} p-3`}>
        <p class='mb-2 font-semibold text-sm'>{locale.guildJoinTitle}</p>
        <div class='flex flex-col gap-2'>
          <LabeledInput
            id='guild-join-tag'
            label={locale.guildJoinTag}
            value={joinTag}
            maxLength={3}
            onChange={setJoinTag}
          />
          <LabeledInput
            id='guild-join-recruiter'
            label={locale.guildJoinRecruiter}
            value={joinRecruiter}
            onChange={setJoinRecruiter}
          />
          <Button
            variant={['sm', 'primary']}
            class='mt-1 w-full'
            disabled={!joinTag.trim() || !joinRecruiter.trim()}
            onClick={() => {
              client.guildController.requestToJoin(joinTag, joinRecruiter);
              setJoinTag('');
              setJoinRecruiter('');
            }}
          >
            {locale.guildJoinSubmit}
          </Button>
        </div>
      </section>
    </div>
  );
}

function CreateTab() {
  const client = useClient();
  const { locale } = useLocale();

  const [_tick, setTick] = useState(0);
  const [createTag, setCreateTag] = useState('');
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');

  useEffect(() => {
    const handleUpdated = () => setTick((t) => t + 1);
    client.guildController.subscribeUpdated(handleUpdated);
    return () => client.guildController.unsubscribeUpdated(handleUpdated);
  }, [client]);

  if (client.guildController.state === GuildDialogState.CreateWaiting) {
    return (
      <div class='flex flex-col gap-3 p-2'>
        <p class='font-semibold text-sm'>{locale.guildCreatingTitle}</p>
        <p class='text-base-content/70 text-xs'>
          {locale.guildCreatingWaiting}
        </p>
        <div>
          <p class='mb-1 font-medium text-base-content/70 text-xs'>
            {locale.guildCreatingMembers}
          </p>
          <ul class='flex flex-col gap-1'>
            {client.guildController.createMembers.map((m) => (
              <li key={m} class='text-sm'>
                {m}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div class='flex flex-col gap-4 p-2'>
      <section class={`rounded-lg border ${UI_PANEL_BORDER} p-3`}>
        <p class='mb-2 font-semibold text-sm'>{locale.guildCreateTitle}</p>
        <div class='flex flex-col gap-2'>
          <LabeledInput
            id='guild-create-tag'
            label={locale.guildCreateTag}
            value={createTag}
            maxLength={3}
            onChange={setCreateTag}
          />
          <LabeledInput
            id='guild-create-name'
            label={locale.guildCreateName}
            value={createName}
            onChange={setCreateName}
          />
          <div>
            <label
              for='guild-create-desc'
              class='mb-1 block text-base-content/70 text-xs'
            >
              {locale.guildCreateDescription}
            </label>
            <textarea
              id='guild-create-desc'
              class={`textarea textarea-bordered w-full border ${UI_PANEL_BORDER} text-sm`}
              rows={3}
              value={createDescription}
              onKeyDown={(e) => e.stopPropagation()}
              onInput={(e) =>
                setCreateDescription((e.target as HTMLTextAreaElement).value)
              }
            />
          </div>
          <Button
            variant={['sm', 'primary']}
            class='mt-1 w-full'
            disabled={
              !createTag.trim() ||
              !createName.trim() ||
              !createDescription.trim()
            }
            onClick={() => {
              client.guildController.beginCreate(
                createTag,
                createName,
                createDescription,
              );
              setCreateTag('');
              setCreateName('');
              setCreateDescription('');
            }}
          >
            {locale.guildCreateSubmit}
          </Button>
        </div>
      </section>
    </div>
  );
}

function ManagementTab() {
  const client = useClient();
  const { locale } = useLocale();

  const [_tick, setTick] = useState(0);
  const [view, setView] = useState<ManageView>('menu');
  const [description, setDescription] = useState('');
  const [ranks, setRanks] = useState<string[]>([]);
  const [members, setMembers] = useState<{ name: string; rankName: string }[]>(
    [],
  );
  const [depositAmount, setDepositAmount] = useState('');
  const [kickName, setKickName] = useState('');
  const [assignName, setAssignName] = useState('');
  const [assignRank, setAssignRank] = useState('');
  const rankFetchIntentRef = useRef<'edit' | 'dropdown'>('edit');
  const memberFetchIntentRef = useRef<'lookup' | 'dropdown'>('lookup');

  const [goldOnHand, setGoldOnHand] = useState(() =>
    client.inventoryController.getItemAmount(GOLD_ITEM_ID),
  );

  useEffect(() => {
    const handleUpdated = () => {
      setTick((t) => t + 1);
      const ctrl = client.guildController;
      const state = ctrl.state;

      if (state === GuildDialogState.EditDescription) {
        setDescription(ctrl.cachedDescription);
        setView('description');
      } else if (state === GuildDialogState.EditRanks) {
        setRanks([...ctrl.cachedRanks]);
        if (rankFetchIntentRef.current === 'edit') {
          setView('ranks');
        }
      } else if (state === GuildDialogState.Bank) {
        setView('bank');
      } else if (state === GuildDialogState.GuildMembers) {
        if (memberFetchIntentRef.current === 'dropdown') {
          setMembers(
            ctrl.cachedMembers.map((m) => ({
              name: m.name,
              rankName: m.rankName,
            })),
          );
        }
      }
    };

    const handleInventory = () => {
      setGoldOnHand(client.inventoryController.getItemAmount(GOLD_ITEM_ID));
    };

    client.guildController.subscribeUpdated(handleUpdated);
    client.inventoryController.subscribeInventoryChanged(handleInventory);
    return () => {
      client.guildController.unsubscribeUpdated(handleUpdated);
      client.inventoryController.unsubscribeInventoryChanged(handleInventory);
    };
  }, [client]);

  const isInGuild = client.guildTag.trim() !== '';

  const fetchMembersForDropdown = () => {
    memberFetchIntentRef.current = 'dropdown';
    if (client.guildController.cachedMembers.length > 0) {
      setMembers(
        client.guildController.cachedMembers.map((m) => ({
          name: m.name,
          rankName: m.rankName,
        })),
      );
    } else {
      client.guildController.requestMemberList(client.guildTag.trim());
    }
  };

  if (!isInGuild) {
    return (
      <div class='flex items-center justify-center p-8 text-base-content/50 text-sm'>
        {locale.guildNotMember}
      </div>
    );
  }

  if (view === 'description') {
    return (
      <div class='flex flex-col gap-3 p-2'>
        <div>
          <label
            for='guild-desc'
            class='mb-1 block text-base-content/70 text-xs'
          >
            {locale.guildManageDescription}
          </label>
          <textarea
            id='guild-desc'
            class={`textarea textarea-bordered w-full border ${UI_PANEL_BORDER} text-sm`}
            rows={5}
            value={description}
            onKeyDown={(e) => e.stopPropagation()}
            onInput={(e) =>
              setDescription((e.target as HTMLTextAreaElement).value)
            }
          />
        </div>
        <div class='flex gap-2'>
          <Button
            variant={['sm', 'ghost']}
            class='flex-1'
            onClick={() => {
              client.guildController.state = GuildDialogState.Manage;
              setView('menu');
            }}
          >
            <FaArrowLeft size={11} />
            {locale.guildBack}
          </Button>
          <Button
            variant={['sm', 'primary']}
            class='flex-1'
            onClick={() => {
              client.guildController.saveDescription(description);
              client.guildController.state = GuildDialogState.Manage;
              setView('menu');
            }}
          >
            {locale.guildSave}
          </Button>
        </div>
      </div>
    );
  }

  if (view === 'ranks') {
    return (
      <div class='flex flex-col gap-2 p-2'>
        <div class='flex flex-col gap-1'>
          {ranks.map((r, i) => (
            <div key={i} class='flex items-center gap-2'>
              <span class='w-14 shrink-0 text-base-content/70 text-xs'>
                {locale.guildRankLabel.replace('{n}', String(i + 1))}
              </span>
              <input
                type='text'
                class={`input input-xs input-bordered flex-1 border ${UI_PANEL_BORDER}`}
                value={r}
                onKeyDown={(e) => e.stopPropagation()}
                onInput={(e) => {
                  const next = [...ranks];
                  next[i] = (e.target as HTMLInputElement).value;
                  setRanks(next);
                }}
              />
            </div>
          ))}
        </div>
        <div class='mt-1 flex gap-2'>
          <Button
            variant={['sm', 'ghost']}
            class='flex-1'
            onClick={() => {
              client.guildController.state = GuildDialogState.Manage;
              setView('menu');
            }}
          >
            <FaArrowLeft size={11} />
            {locale.guildBack}
          </Button>
          <Button
            variant={['sm', 'primary']}
            class='flex-1'
            onClick={() => {
              client.guildController.saveRanks(ranks);
              client.guildController.state = GuildDialogState.Manage;
              setView('menu');
            }}
          >
            {locale.guildSave}
          </Button>
        </div>
      </div>
    );
  }

  if (view === 'bank') {
    const bankGold = client.guildController.cachedBankGold;
    const amount = Number(depositAmount) || 0;
    const canDeposit = amount >= GUILD_MIN_DEPOSIT && goldOnHand >= amount;

    return (
      <div class='flex flex-col gap-3 p-2'>
        <div class={`rounded-lg border ${UI_PANEL_BORDER} p-3`}>
          <p class='text-base-content/70 text-xs'>{locale.guildBankBalance}</p>
          <p class='font-bold text-sm'>{bankGold.toLocaleString()}</p>
        </div>
        <LabeledInput
          id='guild-deposit'
          label={`${locale.guildBankAmount} (min ${GUILD_MIN_DEPOSIT.toLocaleString()})`}
          value={depositAmount}
          type='number'
          onChange={setDepositAmount}
        />
        <div class='flex gap-2'>
          <Button
            variant={['sm', 'ghost']}
            class='flex-1'
            onClick={() => {
              client.guildController.state = GuildDialogState.Manage;
              setView('menu');
            }}
          >
            <FaArrowLeft size={11} />
            {locale.guildBack}
          </Button>
          <Button
            variant={['sm', 'primary']}
            class='flex-1'
            disabled={!canDeposit}
            onClick={() => {
              client.guildController.depositToBank(amount);
              setDepositAmount('');
            }}
          >
            <FaCoins size={11} />
            {locale.guildBankDeposit}
          </Button>
        </div>
      </div>
    );
  }

  if (view === 'kick') {
    return (
      <div class='flex flex-col gap-3 p-2'>
        <div>
          <label
            for='guild-kick-name'
            class='mb-1 block text-base-content/70 text-xs'
          >
            {locale.guildKickName}
          </label>
          <select
            id='guild-kick-name'
            class={`select select-sm select-bordered w-full border ${UI_PANEL_BORDER}`}
            value={kickName}
            onChange={(e) => setKickName((e.target as HTMLSelectElement).value)}
          >
            <option value=''>—</option>
            {members.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name} ({m.rankName})
              </option>
            ))}
          </select>
        </div>
        <div class='flex gap-2'>
          <Button
            variant={['sm', 'ghost']}
            class='flex-1'
            onClick={() => setView('menu')}
          >
            <FaArrowLeft size={11} />
            {locale.guildBack}
          </Button>
          <Button
            variant={['sm', 'error']}
            class='flex-1'
            disabled={!kickName.trim()}
            onClick={() => {
              client.alertController.showConfirm(
                locale.guildManageKick,
                kickName,
                (confirmed) => {
                  if (confirmed) {
                    client.guildController.kickMember(kickName);
                    setKickName('');
                    setView('menu');
                  }
                },
              );
            }}
          >
            <FaUserMinus size={11} />
            {locale.guildKickSubmit}
          </Button>
        </div>
      </div>
    );
  }

  if (view === 'assignRank') {
    const selectedRank = assignRank !== '' ? Number(assignRank) : -1;
    const rankValid = selectedRank >= 0;

    return (
      <div class='flex flex-col gap-3 p-2'>
        <div>
          <label
            for='guild-assign-name'
            class='mb-1 block text-base-content/70 text-xs'
          >
            {locale.guildAssignRankName}
          </label>
          <select
            id='guild-assign-name'
            class={`select select-sm select-bordered w-full border ${UI_PANEL_BORDER}`}
            value={assignName}
            onChange={(e) =>
              setAssignName((e.target as HTMLSelectElement).value)
            }
          >
            <option value=''>—</option>
            {members.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name} ({m.rankName})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            for='guild-assign-rank'
            class='mb-1 block text-base-content/70 text-xs'
          >
            {locale.guildAssignRankValue}
          </label>
          <select
            id='guild-assign-rank'
            class={`select select-sm select-bordered w-full border ${UI_PANEL_BORDER}`}
            value={assignRank}
            onChange={(e) =>
              setAssignRank((e.target as HTMLSelectElement).value)
            }
          >
            <option value=''>—</option>
            {ranks.length > 0
              ? ranks.map((name, i) => (
                  <option key={i} value={String(i)}>
                    {i}. {name}
                  </option>
                ))
              : Array.from({ length: 10 }, (_, i) => (
                  <option key={i} value={String(i)}>
                    {i}
                  </option>
                ))}
          </select>
        </div>
        <div class='flex gap-2'>
          <Button
            variant={['sm', 'ghost']}
            class='flex-1'
            onClick={() => setView('menu')}
          >
            <FaArrowLeft size={11} />
            {locale.guildBack}
          </Button>
          <Button
            variant={['sm', 'primary']}
            class='flex-1'
            disabled={!assignName.trim() || !rankValid}
            onClick={() => {
              client.guildController.changeMemberRank(assignName, selectedRank);
              setAssignName('');
              setAssignRank('');
              setView('menu');
            }}
          >
            <FaUserShield size={11} />
            {locale.guildAssignRankSubmit}
          </Button>
        </div>
      </div>
    );
  }

  // Management menu
  return (
    <div class='grid grid-cols-2 gap-2 p-2'>
      <Button
        variant={['sm', 'ghost']}
        class='flex h-auto flex-col items-center gap-1 py-3'
        onClick={() => client.guildController.requestDescriptionInfo()}
      >
        <FaBuilding size={16} />
        <span class='text-xs'>{locale.guildManageDescription}</span>
      </Button>
      <Button
        variant={['sm', 'ghost']}
        class='flex h-auto flex-col items-center gap-1 py-3'
        onClick={() => {
          rankFetchIntentRef.current = 'edit';
          client.guildController.requestRanksInfo();
        }}
      >
        <FaStar size={16} />
        <span class='text-xs'>{locale.guildManageRanks}</span>
      </Button>
      <Button
        variant={['sm', 'ghost']}
        class='flex h-auto flex-col items-center gap-1 py-3'
        onClick={() => client.guildController.requestBankInfo()}
      >
        <FaCoins size={16} />
        <span class='text-xs'>{locale.guildManageBank}</span>
      </Button>
      <Button
        variant={['sm', 'ghost']}
        class='flex h-auto flex-col items-center gap-1 py-3'
        onClick={() => {
          fetchMembersForDropdown();
          setView('kick');
        }}
      >
        <FaUserMinus size={16} />
        <span class='text-xs'>{locale.guildManageKick}</span>
      </Button>
      <Button
        variant={['sm', 'ghost']}
        class='col-span-2 flex h-auto flex-col items-center gap-1 py-3'
        onClick={() => {
          fetchMembersForDropdown();
          setRanks([...client.guildController.cachedRanks]);
          rankFetchIntentRef.current = 'dropdown';
          if (client.guildController.cachedRanks.length === 0) {
            client.guildController.requestRanksInfo();
          }
          setView('assignRank');
        }}
      >
        <FaUserShield size={16} />
        <span class='text-xs'>{locale.guildManageAssignRank}</span>
      </Button>
    </div>
  );
}

function LookupTab() {
  const client = useClient();
  const { locale } = useLocale();

  const [_tick, setTick] = useState(0);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const handleUpdated = () => setTick((t) => t + 1);
    client.guildController.subscribeUpdated(handleUpdated);
    return () => client.guildController.unsubscribeUpdated(handleUpdated);
  }, [client]);

  const state = client.guildController.state;
  const cachedInfo = client.guildController.cachedInfo;
  const cachedMembers = client.guildController.cachedMembers;

  return (
    <div class='flex flex-col gap-3 p-2'>
      <div class='flex gap-2'>
        <input
          type='text'
          class={`input input-sm input-bordered flex-1 border ${UI_PANEL_BORDER}`}
          placeholder={locale.guildLookupSearch}
          value={search}
          onKeyDown={(e) => e.stopPropagation()}
          onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
        />
        <Button
          variant={['sm', 'ghost']}
          disabled={!search.trim()}
          onClick={() => client.guildController.requestGuildInfo(search)}
        >
          <FaSearch size={11} />
          {locale.guildLookupInfo}
        </Button>
        <Button
          variant={['sm', 'ghost']}
          disabled={!search.trim()}
          onClick={() => client.guildController.requestMemberList(search)}
        >
          <FaList size={11} />
          {locale.guildLookupMembers}
        </Button>
      </div>

      {state === GuildDialogState.GuildInfo && cachedInfo && (
        <div
          class={`flex flex-col gap-2 rounded-lg border ${UI_PANEL_BORDER} p-3`}
        >
          <div class='flex items-start justify-between'>
            <div>
              <p class='font-bold text-sm'>{cachedInfo.name}</p>
              <p class='text-base-content/70 text-xs'>[{cachedInfo.tag}]</p>
            </div>
            <div class='text-right'>
              <p class='text-base-content/70 text-xs'>
                {locale.guildLookupCreated}
              </p>
              <p class='text-xs'>{cachedInfo.createDate}</p>
            </div>
          </div>
          <div>
            <p class='mb-1 text-base-content/70 text-xs'>
              {locale.guildLookupDescription}
            </p>
            <p class='text-xs'>{cachedInfo.description}</p>
          </div>
          <div class='flex gap-4 text-xs'>
            <span>
              <span class='text-base-content/70'>
                {locale.guildLookupWealth}:{' '}
              </span>
              {cachedInfo.wealth}
            </span>
          </div>
          {cachedInfo.ranks.length > 0 && (
            <div>
              <p class='mb-1 text-base-content/70 text-xs'>
                {locale.guildLookupStaff}
              </p>
              <div class='flex flex-col gap-0.5'>
                {cachedInfo.staff.map((s, i) => (
                  <div key={i} class='flex justify-between text-xs'>
                    <span>{s.name}</span>
                    <span class='text-base-content/70'>
                      {cachedInfo.ranks[s.rank] ?? s.rank}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {state === GuildDialogState.GuildMembers && (
        <div class={`overflow-y-auto rounded-lg border ${UI_PANEL_BORDER}`}>
          <table class='table-xs table w-full'>
            <thead class={`sticky top-0 ${UI_STICKY_BG}`}>
              <tr>
                <th>{locale.guildLookupMember}</th>
                <th>{locale.guildLookupRank}</th>
              </tr>
            </thead>
            <tbody>
              {cachedMembers.map((m, i) => (
                <tr key={i}>
                  <td>{m.name}</td>
                  <td class='text-base-content/70'>{m.rankName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function GuildDialog() {
  const client = useClient();
  const { locale } = useLocale();
  const _blur = useBackdropBlur();

  const [_tick, setTick] = useState(0);
  const [activeTab, setActiveTab] = useState<GuildTabId>('registration');

  useEffect(() => {
    const handleUpdated = () => setTick((t) => t + 1);
    client.guildController.subscribeUpdated(handleUpdated);
    return () => client.guildController.unsubscribeUpdated(handleUpdated);
  }, [client]);

  const isInGuild = client.guildTag.trim() !== '';

  // Auto-switch away from tabs that are now hidden
  useEffect(() => {
    if (isInGuild && activeTab === 'create') {
      setActiveTab('registration');
    } else if (!isInGuild && activeTab === 'management') {
      setActiveTab('registration');
    }
  }, [isInGuild, activeTab]);

  const allTabs = [
    {
      id: 'registration' as GuildTabId,
      label: (
        <span class='flex items-center gap-1'>
          <FaUsers size={11} />
          {locale.guildTabRegistration}
        </span>
      ),
    },
    ...(!isInGuild
      ? [
          {
            id: 'create' as GuildTabId,
            label: (
              <span class='flex items-center gap-1'>
                <FaPlus size={11} />
                {locale.guildTabCreate}
              </span>
            ),
          },
        ]
      : []),
    ...(isInGuild
      ? [
          {
            id: 'management' as GuildTabId,
            label: (
              <span class='flex items-center gap-1'>
                <FaCog size={11} />
                {locale.guildTabManagement}
              </span>
            ),
          },
        ]
      : []),
    {
      id: 'lookup' as GuildTabId,
      label: (
        <span class='flex items-center gap-1'>
          <FaSearch size={11} />
          {locale.guildTabLookup}
        </span>
      ),
    },
  ];

  return (
    <DialogBase id='guild' title={locale.guildTitle} size='md'>
      <Tabs
        items={allTabs}
        activeId={activeTab}
        onSelect={(id) => setActiveTab(id as GuildTabId)}
      />
      <div class='overflow-y-auto'>
        {activeTab === 'registration' && <RegistrationTab />}
        {activeTab === 'create' && <CreateTab />}
        {activeTab === 'management' && <ManagementTab />}
        {activeTab === 'lookup' && <LookupTab />}
      </div>
    </DialogBase>
  );
}
