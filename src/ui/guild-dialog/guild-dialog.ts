import { GuildReply } from 'eolib';
import type { Client } from '../../client';
import { DialogResourceID } from '../../edf';
import { playSfxById, SfxId } from '../../sfx';
import { GuildDialogState } from '../../types';
import { Base } from '../base-ui';

import './guild-dialog.css';
import { GUILD_MIN_DEPOSIT } from '../../consts';

const REPLY_DIALOG_IDS: Partial<Record<GuildReply, DialogResourceID>> = {
  [GuildReply.Busy]: DialogResourceID.GUILD_MASTER_IS_BUSY,
  [GuildReply.NotApproved]: DialogResourceID.GUILD_CREATE_NAME_NOT_APPROVED,
  [GuildReply.AlreadyMember]: DialogResourceID.GUILD_ALREADY_A_MEMBER,
  [GuildReply.NoCandidates]: DialogResourceID.GUILD_CREATE_NO_CANDIDATES,
  [GuildReply.Exists]: DialogResourceID.GUILD_TAG_OR_NAME_ALREADY_EXISTS,
  [GuildReply.RecruiterOffline]: DialogResourceID.GUILD_RECRUITER_NOT_FOUND,
  [GuildReply.RecruiterNotHere]: DialogResourceID.GUILD_RECRUITER_NOT_HERE,
  [GuildReply.RecruiterWrongGuild]: DialogResourceID.GUILD_RECRUITER_NOT_MEMBER,
  [GuildReply.NotRecruiter]: DialogResourceID.GUILD_RECRUITER_RANK_TOO_LOW,
  [GuildReply.NotPresent]: DialogResourceID.GUILD_RECRUITER_INPUT_MISSING,
  [GuildReply.AccountLow]: DialogResourceID.GUILD_BANK_ACCOUNT_LOW,
  [GuildReply.Accepted]: DialogResourceID.GUILD_MEMBER_HAS_BEEN_ACCEPTED,
  [GuildReply.NotFound]: DialogResourceID.GUILD_DOES_NOT_EXIST,
  [GuildReply.Updated]: DialogResourceID.GUILD_DETAILS_UPDATED,
  [GuildReply.RanksUpdated]: DialogResourceID.GUILD_DETAILS_UPDATED,
  [GuildReply.RemoveLeader]: DialogResourceID.GUILD_REMOVE_PLAYER_IS_LEADER,
  [GuildReply.RemoveNotMember]: DialogResourceID.GUILD_REMOVE_PLAYER_NOT_MEMBER,
  [GuildReply.Removed]: DialogResourceID.GUILD_REMOVE_SUCCESS,
  [GuildReply.RankingLeader]: DialogResourceID.GUILD_RANK_TOO_LOW,
  [GuildReply.RankingNotMember]:
    DialogResourceID.GUILD_REMOVE_PLAYER_NOT_MEMBER,
};

export class GuildDialog extends Base {
  private client: Client;
  protected container = document.getElementById('guild-dialog')!;
  private dialogs = document.getElementById('dialogs')!;
  private cover = document.querySelector<HTMLDivElement>('#cover')!;
  private invite = document.getElementById('guild-create-invite')!;

  constructor(client: Client) {
    super();
    this.client = client;

    // Wire static invite notification buttons
    this.invite
      .querySelector('[data-id="invite-accept"]')!
      .addEventListener('click', () => {
        playSfxById(SfxId.ButtonClick);
        this.invite.classList.add('hidden');
        this.handleInviteAccept();
      });
    this.invite
      .querySelector('[data-id="invite-decline"]')!
      .addEventListener('click', () => {
        playSfxById(SfxId.ButtonClick);
        this.invite.classList.add('hidden');
      });

    // Guild NPC opened
    this.client.on('guildOpened', () => this.show());

    // Reply messages (errors, confirmations)
    this.client.on('guildReply', ({ code }) => {
      const dialogId = REPLY_DIALOG_IDS[code];
      const message = dialogId
        ? this.client.getDialogStrings(dialogId)[1]
        : `Guild reply: ${code}`;
      this.showMessage(message, 'info');
    });

    // Invite / join-request overlays
    this.client.on('guildCreateInvite', () => this.showCreateInvite());
    this.client.on('guildJoinRequest', () => this.showJoinRequest());

    // All other guild state changes
    this.client.on('guildUpdated', () => {
      const { statusMessage } = this.client.guildController;
      if (statusMessage) {
        this.showMessage(statusMessage.text, statusMessage.type);
        this.client.guildController.statusMessage = null;
      }
      this.render();
    });
  }

  show() {
    this.client.guildController.state = GuildDialogState.Menu;
    this.render();
    this.cover.classList.remove('hidden');
    this.container.classList.remove('hidden');
    this.dialogs.classList.remove('hidden');
    this.client.typing = true;
    playSfxById(SfxId.ButtonClick);
  }

  close() {
    this.cover.classList.add('hidden');
    this.container.classList.add('hidden');
    if (!document.querySelector('#dialogs > div:not(.hidden)')) {
      this.dialogs.classList.add('hidden');
      this.client.typing = false;
    }
  }

  private render() {
    const view = this.client.guildController.state;

    if (view === GuildDialogState.Closed) {
      this.close();
      this.client.guildController.state = GuildDialogState.Menu;
      return;
    }

    const body = this.container.querySelector('.guild-body')!;
    const footer = this.container.querySelector('.guild-footer')!;
    const header = this.container.querySelector('.guild-header')!;
    body.innerHTML = '';
    footer.innerHTML = '';

    switch (view) {
      case GuildDialogState.Menu:
        header.textContent = 'Guild';
        this.renderMenu(body, footer);
        break;
      case GuildDialogState.Create:
        header.textContent = 'Create Guild';
        this.renderCreate(body, footer);
        break;
      case GuildDialogState.CreateWaiting:
        header.textContent = 'Creating Guild...';
        this.renderCreateWaiting(body, footer);
        break;
      case GuildDialogState.Finalize:
        header.textContent = 'Finalize Guild';
        this.renderFinalize(body, footer);
        break;
      case GuildDialogState.Join:
        header.textContent = 'Join Guild';
        this.renderJoin(body, footer);
        break;
      case GuildDialogState.Lookup:
        header.textContent = 'Look Up Guild';
        this.renderLookup(body, footer);
        break;
      case GuildDialogState.Info: {
        const info = this.client.guildController.cachedInfo;
        header.textContent = info ? `${info.name} [${info.tag}]` : 'Guild Info';
        this.renderInfo(body, footer);
        break;
      }
      case GuildDialogState.Members: {
        const members = this.client.guildController.cachedMembers;
        header.textContent = `Members (${members.length})`;
        this.renderMembers(body, footer);
        break;
      }
      case GuildDialogState.Manage:
        header.textContent = 'Manage Guild';
        this.renderManage(body, footer);
        break;
      case GuildDialogState.EditDescription:
        header.textContent = 'Edit Description';
        this.renderEditDescription(body, footer);
        break;
      case GuildDialogState.EditRanks:
        header.textContent = 'Edit Ranks';
        this.renderEditRanks(body, footer);
        break;
      case GuildDialogState.Bank:
        header.textContent = 'Guild Bank';
        this.renderBank(body, footer);
        break;
      case GuildDialogState.Kick:
        header.textContent = 'Kick Member';
        this.renderKick(body, footer);
        break;
      case GuildDialogState.Rank:
        header.textContent = 'Change Rank';
        this.renderChangeRank(body, footer);
        break;
    }
  }

  // ── Menu ──────────────────────────────────────────────────────────────

  private renderMenu(body: Element, footer: Element) {
    const inGuild = this.client.guildTag.trim().length > 0;
    const rank = this.client.guildRank;

    if (!inGuild) {
      this.addMenuButton(body, 'Create Guild', () => {
        this.client.guildController.state = GuildDialogState.Create;
        this.render();
      });
      this.addMenuButton(body, 'Join Guild', () => {
        this.client.guildController.state = GuildDialogState.Join;
        this.render();
      });
    } else {
      this.addMenuButton(body, 'Guild Information', () => {
        this.client.guildController.requestGuildInfo(this.client.guildTag);
      });
      this.addMenuButton(body, 'Member List', () => {
        this.client.guildController.requestMemberList(this.client.guildTag);
      });
      // Guild bank is accessible to all members
      this.addMenuButton(body, 'Guild Bank', () => {
        this.client.guildController.requestBankInfo();
      });
      // Management options only for leaders/recruiters (rank <= 2)
      if (rank <= 2) {
        this.addMenuButton(body, 'Manage Guild', () => {
          this.client.guildController.state = GuildDialogState.Manage;
          this.render();
        });
      }
      this.addMenuButton(body, 'Leave Guild', () => {
        this.client.guildController.leaveGuild();
      });
    }

    this.addMenuButton(body, 'Look Up Guild', () => {
      this.client.guildController.state = GuildDialogState.Lookup;
      this.render();
    });

    this.addFooterButton(footer, 'Close', () => this.close());
  }

  // ── Create ────────────────────────────────────────────────────────────

  private renderCreate(body: Element, footer: Element) {
    const tagGroup = this.createInputGroup('Guild Tag (2-3 chars)', 'tag', 3);
    body.appendChild(tagGroup);

    const nameGroup = this.createInputGroup('Guild Name', 'name', 24);
    body.appendChild(nameGroup);

    this.addFooterButton(footer, 'Back', () => {
      this.client.guildController.state = GuildDialogState.Menu;
      this.render();
    });
    this.addFooterButton(
      footer,
      'Begin Creation',
      () => {
        const tag = (
          body.querySelector('input[name="tag"]') as HTMLInputElement
        ).value.trim();
        const name = (
          body.querySelector('input[name="name"]') as HTMLInputElement
        ).value.trim();
        if (!tag || !name) return;
        this.client.guildController.beginCreate(tag, name);
      },
      'primary',
    );
  }

  private renderCreateWaiting(body: Element, footer: Element) {
    const waiting = document.createElement('div');
    waiting.className = 'guild-waiting';

    const textNode = document.createTextNode('Waiting for members to join');
    waiting.appendChild(textNode);

    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span');
      dot.className = 'guild-waiting-dot';
      dot.textContent = '.';
      waiting.appendChild(dot);
    }

    body.appendChild(waiting);

    if (this.client.guildController.createMembers.length > 0) {
      const list = document.createElement('div');
      list.className = 'guild-create-list';
      for (const name of this.client.guildController.createMembers) {
        const row = this.createMemberRow(name, 'Joined', '#a5d6a7');
        list.appendChild(row);
      }
      body.appendChild(list);
    }

    this.addFooterButton(footer, 'Cancel', () => {
      this.client.guildController.state = GuildDialogState.Menu;
      this.render();
    });
  }

  private renderFinalize(body: Element, footer: Element) {
    const message = document.createElement('div');
    message.className = 'guild-message success';
    message.textContent = 'Enough members have joined! Enter a description.';
    body.appendChild(message);

    const descriptionGroup = this.createInputGroup(
      'Guild Description',
      'description',
      240,
      true,
    );
    body.appendChild(descriptionGroup);

    this.addFooterButton(
      footer,
      'Create Guild',
      () => {
        const description = (
          body.querySelector(
            'textarea[name="description"]',
          ) as HTMLTextAreaElement
        ).value.trim();
        this.client.guildController.finalizeCreate(description);
      },
      'primary',
    );
  }

  // ── Join ──────────────────────────────────────────────────────────────

  private renderJoin(body: Element, footer: Element) {
    const tagGroup = this.createInputGroup('Guild Tag', 'tag', 3);
    body.appendChild(tagGroup);

    const recruiterGroup = this.createInputGroup(
      'Recruiter Name',
      'recruiter',
      12,
    );
    body.appendChild(recruiterGroup);

    this.addFooterButton(footer, 'Back', () => {
      this.client.guildController.state = GuildDialogState.Menu;
      this.render();
    });
    this.addFooterButton(
      footer,
      'Request to Join',
      () => {
        const tag = (
          body.querySelector('input[name="tag"]') as HTMLInputElement
        ).value.trim();
        const recruiter = (
          body.querySelector('input[name="recruiter"]') as HTMLInputElement
        ).value.trim();
        if (!tag || !recruiter) return;
        this.client.guildController.requestToJoin(tag, recruiter);
      },
      'primary',
    );
  }

  // ── Info View ─────────────────────────────────────────────────────────

  private renderInfo(body: Element, footer: Element) {
    const data = this.client.guildController.cachedInfo;
    if (!data) return;

    const fields: [string, string, boolean?][] = [
      ['Name', data.name, true],
      ['Tag', data.tag],
      ['Created', data.createDate],
      ['Wealth', data.wealth],
    ];

    for (const [label, value, highlight] of fields) {
      const section = this.createInfoSection(label, value, !!highlight);
      body.appendChild(section);
    }

    if (data.description) {
      const descriptionSection = this.createInfoSection(
        'Description',
        data.description,
      );
      body.appendChild(descriptionSection);
    }

    if (data.staff.length > 0) {
      const staffSection = document.createElement('div');
      staffSection.className = 'guild-info-section';
      const staffLabel = document.createElement('div');
      staffLabel.className = 'guild-info-label';
      staffLabel.textContent = 'Staff';
      staffSection.appendChild(staffLabel);

      for (const staffMember of data.staff) {
        const row = document.createElement('div');
        row.className = 'guild-staff-row';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'guild-staff-name';
        nameSpan.textContent = staffMember.name;
        row.appendChild(nameSpan);

        const typeSpan = document.createElement('span');
        typeSpan.className = 'guild-staff-type';
        typeSpan.textContent = staffMember.rank === 1 ? 'Leader' : 'Recruiter';
        row.appendChild(typeSpan);

        staffSection.appendChild(row);
      }
      body.appendChild(staffSection);
    }

    this.addFooterButton(footer, 'Member List', () => {
      this.client.guildController.requestMemberList(data.tag);
    });
    this.addFooterButton(footer, 'Back', () => {
      this.client.guildController.state = GuildDialogState.Menu;
      this.render();
    });
  }

  // ── Member List ───────────────────────────────────────────────────────

  private renderMembers(body: Element, footer: Element) {
    for (const member of this.client.guildController.cachedMembers) {
      const row = this.createMemberRow(member.name, member.rankName);
      body.appendChild(row);
    }

    this.addFooterButton(footer, 'Back', () => {
      this.client.guildController.state = GuildDialogState.Menu;
      this.render();
    });
  }

  // ── Manage ────────────────────────────────────────────────────────────

  private renderManage(body: Element, footer: Element) {
    const rank = this.client.guildRank;

    // Edit description/ranks: rank <= 2 (leaders)
    if (rank <= 2) {
      this.addMenuButton(body, 'Edit Description', () => {
        this.client.guildController.requestDescriptionInfo();
      });
      this.addMenuButton(body, 'Edit Ranks', () => {
        this.client.guildController.requestRanksInfo();
      });
    }
    // Kick/rank changes: rank <= 2
    if (rank <= 2) {
      this.addMenuButton(body, 'Kick Member', () => {
        this.client.guildController.state = GuildDialogState.Kick;
        this.render();
      });
      this.addMenuButton(body, 'Change Member Rank', () => {
        this.client.guildController.state = GuildDialogState.Rank;
        this.render();
      });
    }
    // Disband: founder only (rank 0)
    if (rank === 0) {
      this.addMenuButton(body, 'Disband Guild', () => {
        this.client.guildController.disbandGuild();
      });
    }

    this.addFooterButton(footer, 'Back', () => {
      this.client.guildController.state = GuildDialogState.Menu;
      this.render();
    });
  }

  // ── Edit Description ──────────────────────────────────────────────────

  private renderEditDescription(body: Element, footer: Element) {
    const group = this.createInputGroup(
      'Description',
      'description',
      240,
      true,
    );
    const textarea = group.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = this.client.guildController.cachedDescription;
    body.appendChild(group);

    this.addFooterButton(footer, 'Back', () => {
      this.client.guildController.state = GuildDialogState.Manage;
      this.render();
    });
    this.addFooterButton(
      footer,
      'Save',
      () => {
        this.client.guildController.saveDescription(textarea.value);
      },
      'primary',
    );
  }

  // ── Edit Ranks ────────────────────────────────────────────────────────

  private renderEditRanks(body: Element, footer: Element) {
    for (let i = 0; i < this.client.guildController.cachedRanks.length; i++) {
      const group = this.createInputGroup(`Rank ${i + 1}`, `rank-${i}`, 16);
      const input = group.querySelector('input') as HTMLInputElement;
      input.value = this.client.guildController.cachedRanks[i].trim();
      body.appendChild(group);
    }

    this.addFooterButton(footer, 'Back', () => {
      this.client.guildController.state = GuildDialogState.Manage;
      this.render();
    });
    this.addFooterButton(
      footer,
      'Save',
      () => {
        const ranks: string[] = [];
        for (
          let i = 0;
          i < this.client.guildController.cachedRanks.length;
          i++
        ) {
          const input = body.querySelector(
            `input[name="rank-${i}"]`,
          ) as HTMLInputElement;
          ranks.push(
            input.value.trim() || this.client.guildController.cachedRanks[i],
          );
        }
        this.client.guildController.saveRanks(ranks);
      },
      'primary',
    );
  }

  // ── Bank ──────────────────────────────────────────────────────────────

  private renderBank(body: Element, footer: Element) {
    const section = this.createInfoSection(
      'Guild Bank Balance',
      this.client.guildController.cachedBankGold.toString(),
      true,
    );
    body.appendChild(section);

    const group = this.createInputGroup('Deposit Amount', 'deposit', 10);
    const input = group.querySelector('input') as HTMLInputElement;
    input.type = 'number';
    input.min = `${GUILD_MIN_DEPOSIT}`;
    input.value = input.min;
    body.appendChild(group);

    this.addFooterButton(footer, 'Back', () => {
      this.client.guildController.state = GuildDialogState.Menu;
      this.render();
    });
    this.addFooterButton(
      footer,
      'Deposit',
      () => {
        const amount = Number.parseInt(input.value, 10);
        if (Number.isNaN(amount) || amount < GUILD_MIN_DEPOSIT) return;
        this.client.guildController.depositToBank(amount);
      },
      'primary',
    );
  }

  // ── Kick ──────────────────────────────────────────────────────────────

  private renderKick(body: Element, footer: Element) {
    const group = this.createInputGroup('Member Name', 'kick-name', 12);
    body.appendChild(group);

    this.addFooterButton(footer, 'Back', () => {
      this.client.guildController.state = GuildDialogState.Manage;
      this.render();
    });
    this.addFooterButton(
      footer,
      'Kick',
      () => {
        const name = (
          body.querySelector('input[name="kick-name"]') as HTMLInputElement
        ).value.trim();
        if (!name) return;
        this.client.guildController.kickMember(name);
      },
      'danger',
    );
  }

  // ── Change Rank ───────────────────────────────────────────────────────

  private renderChangeRank(body: Element, footer: Element) {
    const nameGroup = this.createInputGroup('Member Name', 'rank-name', 12);
    body.appendChild(nameGroup);

    const rankGroup = this.createInputGroup('New Rank (0-9)', 'new-rank', 2);
    const rankInput = rankGroup.querySelector('input') as HTMLInputElement;
    rankInput.type = 'number';
    rankInput.min = '0';
    rankInput.max = '9';
    body.appendChild(rankGroup);

    this.addFooterButton(footer, 'Back', () => {
      this.client.guildController.state = GuildDialogState.Manage;
      this.render();
    });
    this.addFooterButton(
      footer,
      'Update',
      () => {
        const name = (
          body.querySelector('input[name="rank-name"]') as HTMLInputElement
        ).value.trim();
        const rank = Number.parseInt(rankInput.value, 10);
        if (!name || Number.isNaN(rank)) return;
        this.client.guildController.changeMemberRank(name, rank);
      },
      'primary',
    );
  }

  // ── Invite notifications ──────────────────────────────────────────────

  private showCreateInvite() {
    const { pendingInviteName } = this.client.guildController;

    const nameSpan = this.invite.querySelector('.guild-invite-name')!;
    nameSpan.textContent = pendingInviteName;
    const textSuffix = this.invite.querySelector('.guild-invite-suffix')!;
    textSuffix.textContent = ' is being created. Join?';

    this.invite.classList.remove('hidden');
  }

  private showJoinRequest() {
    const { pendingInviteName } = this.client.guildController;

    const nameSpan = this.invite.querySelector('.guild-invite-name')!;
    nameSpan.textContent = pendingInviteName;
    const textSuffix = this.invite.querySelector('.guild-invite-suffix')!;
    textSuffix.textContent = ' wants to join your guild.';

    this.invite.classList.remove('hidden');
  }

  private handleInviteAccept() {
    const { pendingInvitePlayerId, pendingInviteType } =
      this.client.guildController;
    if (pendingInviteType === 'create') {
      this.client.guildController.acceptCreateInvite(pendingInvitePlayerId);
    } else {
      this.client.guildController.acceptJoinRequest(pendingInvitePlayerId);
    }
  }

  private renderLookup(body: Element, footer: Element) {
    const group = this.createInputGroup('Guild Tag or Name', 'lookup', 24);
    body.appendChild(group);

    this.addFooterButton(footer, 'Back', () => {
      this.client.guildController.state = GuildDialogState.Menu;
      this.render();
    });
    this.addFooterButton(
      footer,
      'Look Up',
      () => {
        const query = (
          body.querySelector('input[name="lookup"]') as HTMLInputElement
        ).value.trim();
        if (!query) return;
        this.client.guildController.requestGuildInfo(query);
      },
      'primary',
    );
  }

  private addMenuButton(parent: Element, text: string, onClick: () => void) {
    const button = document.createElement('button');
    button.className = 'guild-menu-btn';
    button.textContent = text;
    button.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      onClick();
    });
    parent.appendChild(button);
  }

  private addFooterButton(
    parent: Element,
    text: string,
    onClick: () => void,
    variant?: string,
  ) {
    const button = document.createElement('button');
    button.className = `guild-btn${variant ? ` ${variant}` : ''}`;
    button.textContent = text;
    button.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      onClick();
    });
    parent.appendChild(button);
  }

  private createInputGroup(
    label: string,
    name: string,
    maxLength: number,
    isTextarea?: boolean,
  ): HTMLDivElement {
    const group = document.createElement('div');
    group.className = 'guild-input-group';

    const labelElement = document.createElement('label');
    labelElement.textContent = label;
    group.appendChild(labelElement);

    if (isTextarea) {
      const textarea = document.createElement('textarea');
      textarea.className = 'guild-input';
      textarea.name = name;
      textarea.maxLength = maxLength;
      textarea.rows = 4;
      group.appendChild(textarea);
    } else {
      const input = document.createElement('input');
      input.className = 'guild-input';
      input.type = 'text';
      input.name = name;
      input.maxLength = maxLength;
      group.appendChild(input);
    }

    return group;
  }

  private createInfoSection(
    label: string,
    value: string,
    highlight = false,
  ): HTMLDivElement {
    const section = document.createElement('div');
    section.className = 'guild-info-section';

    const labelElement = document.createElement('div');
    labelElement.className = 'guild-info-label';
    labelElement.textContent = label;
    section.appendChild(labelElement);

    const valueElement = document.createElement('div');
    valueElement.className = `guild-info-value${highlight ? ' highlight' : ''}`;
    valueElement.textContent = value;
    section.appendChild(valueElement);

    return section;
  }

  private createMemberRow(
    name: string,
    rankName: string,
    rankColor?: string,
  ): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'guild-member-row';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'guild-member-name';
    nameSpan.textContent = name;
    row.appendChild(nameSpan);

    const rankSpan = document.createElement('span');
    rankSpan.className = 'guild-member-rank';
    rankSpan.textContent = rankName;
    if (rankColor) {
      rankSpan.style.color = rankColor;
    }
    row.appendChild(rankSpan);

    return row;
  }

  private showMessage(text: string, type: 'success' | 'error' | 'info') {
    const existing = this.container.querySelector('.guild-message');
    if (existing) existing.remove();

    const message = document.createElement('div');
    message.className = `guild-message ${type}`;
    message.textContent = text;

    const body = this.container.querySelector('.guild-body')!;
    body.insertBefore(message, body.firstChild);
    setTimeout(() => message.remove(), 4000);
  }
}
