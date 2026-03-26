import {
  GuildAcceptClientPacket,
  GuildAgreeClientPacket,
  GuildBuyClientPacket,
  GuildCreateClientPacket,
  GuildInfoType,
  GuildJunkClientPacket,
  GuildKickClientPacket,
  GuildPlayerClientPacket,
  GuildRankClientPacket,
  GuildRemoveClientPacket,
  GuildReportClientPacket,
  GuildRequestClientPacket,
  GuildTakeClientPacket,
  GuildTellClientPacket,
  GuildUseClientPacket,
} from 'eolib';
import type { Client } from '../../client';
import { playSfxById, SfxId } from '../../sfx';
import { Base } from '../base-ui';

import './guild-dialog.css';

type GuildView =
  | 'menu'
  | 'info'
  | 'members'
  | 'create'
  | 'create-waiting'
  | 'join'
  | 'manage'
  | 'edit-description'
  | 'edit-ranks'
  | 'bank'
  | 'kick'
  | 'rank';

export class GuildDialog extends Base {
  private client: Client;
  protected container = document.getElementById('guild-dialog')!;
  private dialogs = document.getElementById('dialogs')!;
  private cover = document.querySelector<HTMLDivElement>('#cover')!;
  private invite = document.getElementById('guild-create-invite')!;
  private currentView: GuildView = 'menu';
  private sessionId = 0;

  // Create flow state
  private createMembers: string[] = [];
  private createTag = '';
  private createName = '';

  // Data caches
  private cachedDescription = '';
  private cachedRanks: string[] = [];
  private cachedBankGold = 0;

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
    this.client.on('guildReply', ({ message }) => {
      this.showMessage(message, 'info');
    });

    // Create flow
    this.client.on('guildCreateBegin', () => {
      this.createMembers = [];
      this.currentView = 'create-waiting';
      this.render();
    });

    this.client.on('guildCreateAdd', ({ name }) => {
      this.createMembers.push(name);
      this.render();
    });

    this.client.on('guildCreateAddConfirm', ({ name }) => {
      if (name) this.createMembers.push(name);
      this.showCreateFinalize();
    });

    // Guild created
    this.client.on('guildCreated', () => {
      this.close();
    });

    // Create invite (for other players)
    this.client.on('guildCreateInvite', ({ playerId, guildIdentity }) => {
      this.showCreateInvite(playerId, guildIdentity);
    });

    // Join request (for recruiter)
    this.client.on('guildJoinRequest', ({ playerId, playerName }) => {
      this.showJoinRequest(playerId, playerName);
    });

    // Joined a guild
    this.client.on('guildJoined', () => {
      this.showMessage('You have joined the guild!', 'success');
      this.currentView = 'menu';
      this.render();
    });

    // Info / Members
    this.client.on('guildInfo', (data) => {
      this.showInfoView(data);
    });

    this.client.on('guildMemberList', ({ members }) => {
      this.showMemberListView(members);
    });

    // Management responses
    this.client.on('guildDescription', ({ description }) => {
      this.cachedDescription = description;
      this.currentView = 'edit-description';
      this.render();
    });

    this.client.on('guildRanks', ({ ranks }) => {
      this.cachedRanks = [...ranks];
      this.currentView = 'edit-ranks';
      this.render();
    });

    this.client.on('guildBank', ({ gold }) => {
      this.cachedBankGold = gold;
      this.currentView = 'bank';
      this.render();
    });

    this.client.on('guildBankUpdated', () => {
      // Refresh bank view
      const packet = new GuildTakeClientPacket();
      packet.sessionId = this.sessionId;
      packet.infoType = GuildInfoType.Bank;
      packet.guildTag = this.client.guildTag.padEnd(3).slice(0, 3);
      this.client.bus.send(packet);
    });

    this.client.on('guildLeft', () => {
      this.showMessage('You have left the guild.', 'info');
      this.currentView = 'menu';
      this.render();
    });
  }

  show() {
    this.currentView = 'menu';
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
    const body = this.container.querySelector('.guild-body')!;
    const footer = this.container.querySelector('.guild-footer')!;
    const header = this.container.querySelector('.guild-header')!;
    body.innerHTML = '';
    footer.innerHTML = '';

    switch (this.currentView) {
      case 'menu':
        header.textContent = 'Guild';
        this.renderMenu(body, footer);
        break;
      case 'create':
        header.textContent = 'Create Guild';
        this.renderCreate(body, footer);
        break;
      case 'create-waiting':
        header.textContent = 'Creating Guild...';
        this.renderCreateWaiting(body, footer);
        break;
      case 'join':
        header.textContent = 'Join Guild';
        this.renderJoin(body, footer);
        break;
      case 'manage':
        header.textContent = 'Manage Guild';
        this.renderManage(body, footer);
        break;
      case 'edit-description':
        header.textContent = 'Edit Description';
        this.renderEditDescription(body, footer);
        break;
      case 'edit-ranks':
        header.textContent = 'Edit Ranks';
        this.renderEditRanks(body, footer);
        break;
      case 'bank':
        header.textContent = 'Guild Bank';
        this.renderBank(body, footer);
        break;
      case 'kick':
        header.textContent = 'Kick Member';
        this.renderKick(body, footer);
        break;
      case 'rank':
        header.textContent = 'Change Rank';
        this.renderChangeRank(body, footer);
        break;
      // info and members are rendered directly when data arrives
      default:
        break;
    }
  }

  // ── Menu ──────────────────────────────────────────────────────────────

  private renderMenu(body: Element, footer: Element) {
    const inGuild = !!this.client.guildTag;
    const rank = this.client.guildRank;

    if (!inGuild) {
      this.addMenuButton(body, 'Create Guild', () => {
        this.currentView = 'create';
        this.render();
      });
      this.addMenuButton(body, 'Join Guild', () => {
        this.currentView = 'join';
        this.render();
      });
    } else {
      this.addMenuButton(body, 'Guild Information', () => {
        this.requestGuildInfo(this.client.guildTag);
      });
      this.addMenuButton(body, 'Member List', () => {
        this.requestMemberList(this.client.guildTag);
      });
      // Guild bank is accessible to all members
      this.addMenuButton(body, 'Guild Bank', () => {
        const packet = new GuildTakeClientPacket();
        packet.sessionId = this.sessionId;
        packet.infoType = GuildInfoType.Bank;
        packet.guildTag = this.client.guildTag.padEnd(3).slice(0, 3);
        this.client.bus.send(packet);
      });
      // Management options only for leaders/recruiters (rank <= 2)
      if (rank <= 2) {
        this.addMenuButton(body, 'Manage Guild', () => {
          this.currentView = 'manage';
          this.render();
        });
      }
      this.addMenuButton(body, 'Leave Guild', () => {
        this.leaveGuild();
      });
    }

    this.addMenuButton(body, 'Look Up Guild', () => {
      this.showLookupPrompt();
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
      this.currentView = 'menu';
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
        this.createTag = tag;
        this.createName = name;
        const packet = new GuildRequestClientPacket();
        packet.sessionId = this.sessionId;
        packet.guildTag = tag;
        packet.guildName = name;
        this.client.bus.send(packet);
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

    if (this.createMembers.length > 0) {
      const list = document.createElement('div');
      list.className = 'guild-create-list';
      for (const name of this.createMembers) {
        const row = this.createMemberRow(name, 'Joined', '#a5d6a7');
        list.appendChild(row);
      }
      body.appendChild(list);
    }

    this.addFooterButton(footer, 'Cancel', () => {
      this.currentView = 'menu';
      this.render();
    });
  }

  private showCreateFinalize() {
    const body = this.container.querySelector('.guild-body')!;
    const footer = this.container.querySelector('.guild-footer')!;
    const header = this.container.querySelector('.guild-header')!;
    header.textContent = 'Finalize Guild';
    body.innerHTML = '';
    footer.innerHTML = '';

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
        const packet = new GuildCreateClientPacket();
        packet.sessionId = this.sessionId;
        packet.guildTag = this.createTag;
        packet.guildName = this.createName;
        packet.description = description;
        this.client.bus.send(packet);
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
      this.currentView = 'menu';
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
        const packet = new GuildPlayerClientPacket();
        packet.sessionId = this.sessionId;
        packet.guildTag = tag;
        packet.recruiterName = recruiter;
        this.client.bus.send(packet);
      },
      'primary',
    );
  }

  // ── Info View ─────────────────────────────────────────────────────────

  private showInfoView(data: {
    name: string;
    tag: string;
    createDate: string;
    description: string;
    wealth: string;
    ranks: string[];
    staff: { rank: number; name: string }[];
  }) {
    this.currentView = 'info';
    const body = this.container.querySelector('.guild-body')!;
    const footer = this.container.querySelector('.guild-footer')!;
    const header = this.container.querySelector('.guild-header')!;
    header.textContent = `${data.name} [${data.tag}]`;
    body.innerHTML = '';
    footer.innerHTML = '';

    const fields: [string, string, boolean?][] = [
      ['Name', data.name, true],
      ['Tag', data.tag],
      ['Created', data.createDate],
      ['Wealth', `${data.wealth} gold`],
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
      this.requestMemberList(data.tag);
    });
    this.addFooterButton(footer, 'Back', () => {
      this.currentView = 'menu';
      this.render();
    });
  }

  // ── Member List ───────────────────────────────────────────────────────

  private showMemberListView(
    members: { rank: number; name: string; rankName: string }[],
  ) {
    this.currentView = 'members';
    const body = this.container.querySelector('.guild-body')!;
    const footer = this.container.querySelector('.guild-footer')!;
    const header = this.container.querySelector('.guild-header')!;
    header.textContent = `Members (${members.length})`;
    body.innerHTML = '';
    footer.innerHTML = '';

    for (const member of members) {
      const row = this.createMemberRow(member.name, member.rankName);
      body.appendChild(row);
    }

    this.addFooterButton(footer, 'Back', () => {
      this.currentView = 'menu';
      this.render();
    });
  }

  // ── Manage ────────────────────────────────────────────────────────────

  private renderManage(body: Element, footer: Element) {
    const rank = this.client.guildRank;

    // Edit description/ranks: rank <= 2 (leaders)
    if (rank <= 2) {
      this.addMenuButton(body, 'Edit Description', () => {
        const packet = new GuildTakeClientPacket();
        packet.sessionId = this.sessionId;
        packet.infoType = GuildInfoType.Description;
        packet.guildTag = this.client.guildTag.padEnd(3).slice(0, 3);
        this.client.bus.send(packet);
      });
      this.addMenuButton(body, 'Edit Ranks', () => {
        const packet = new GuildTakeClientPacket();
        packet.sessionId = this.sessionId;
        packet.infoType = GuildInfoType.Ranks;
        packet.guildTag = this.client.guildTag.padEnd(3).slice(0, 3);
        this.client.bus.send(packet);
      });
    }
    // Kick/rank changes: rank <= 2
    if (rank <= 2) {
      this.addMenuButton(body, 'Kick Member', () => {
        this.currentView = 'kick';
        this.render();
      });
      this.addMenuButton(body, 'Change Member Rank', () => {
        this.currentView = 'rank';
        this.render();
      });
    }
    // Disband: founder only (rank 0)
    if (rank === 0) {
      this.addMenuButton(body, 'Disband Guild', () => {
        this.disbandGuild();
      });
    }

    this.addFooterButton(footer, 'Back', () => {
      this.currentView = 'menu';
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
    textarea.value = this.cachedDescription;
    body.appendChild(group);

    this.addFooterButton(footer, 'Back', () => {
      this.currentView = 'manage';
      this.render();
    });
    this.addFooterButton(
      footer,
      'Save',
      () => {
        const packet = new GuildAgreeClientPacket();
        packet.sessionId = this.sessionId;
        packet.infoType = GuildInfoType.Description;
        packet.infoTypeData =
          new GuildAgreeClientPacket.InfoTypeDataDescription();
        (
          packet.infoTypeData as GuildAgreeClientPacket.InfoTypeDataDescription
        ).description = textarea.value;
        this.client.bus.send(packet);
      },
      'primary',
    );
  }

  // ── Edit Ranks ────────────────────────────────────────────────────────

  private renderEditRanks(body: Element, footer: Element) {
    for (let i = 0; i < this.cachedRanks.length; i++) {
      const group = this.createInputGroup(`Rank ${i + 1}`, `rank-${i}`, 16);
      const input = group.querySelector('input') as HTMLInputElement;
      input.value = this.cachedRanks[i].trim();
      body.appendChild(group);
    }

    this.addFooterButton(footer, 'Back', () => {
      this.currentView = 'manage';
      this.render();
    });
    this.addFooterButton(
      footer,
      'Save',
      () => {
        const ranks: string[] = [];
        for (let i = 0; i < this.cachedRanks.length; i++) {
          const input = body.querySelector(
            `input[name="rank-${i}"]`,
          ) as HTMLInputElement;
          ranks.push(input.value.trim() || this.cachedRanks[i]);
        }
        const packet = new GuildAgreeClientPacket();
        packet.sessionId = this.sessionId;
        packet.infoType = GuildInfoType.Ranks;
        packet.infoTypeData = new GuildAgreeClientPacket.InfoTypeDataRanks();
        (
          packet.infoTypeData as GuildAgreeClientPacket.InfoTypeDataRanks
        ).ranks = ranks;
        this.client.bus.send(packet);
      },
      'primary',
    );
  }

  // ── Bank ──────────────────────────────────────────────────────────────

  private renderBank(body: Element, footer: Element) {
    const section = this.createInfoSection(
      'Guild Bank Balance',
      `${this.cachedBankGold} gold`,
      true,
    );
    body.appendChild(section);

    const group = this.createInputGroup('Deposit Amount', 'deposit', 10);
    const input = group.querySelector('input') as HTMLInputElement;
    input.type = 'number';
    input.min = '1';
    body.appendChild(group);

    this.addFooterButton(footer, 'Back', () => {
      this.currentView = 'menu';
      this.render();
    });
    this.addFooterButton(
      footer,
      'Deposit',
      () => {
        const amount = Number.parseInt(input.value, 10);
        if (Number.isNaN(amount) || amount < 1) return;
        const packet = new GuildBuyClientPacket();
        packet.sessionId = this.sessionId;
        packet.goldAmount = amount;
        this.client.bus.send(packet);
      },
      'primary',
    );
  }

  // ── Kick ──────────────────────────────────────────────────────────────

  private renderKick(body: Element, footer: Element) {
    const group = this.createInputGroup('Member Name', 'kick-name', 12);
    body.appendChild(group);

    this.addFooterButton(footer, 'Back', () => {
      this.currentView = 'manage';
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
        const packet = new GuildKickClientPacket();
        packet.sessionId = this.sessionId;
        packet.memberName = name;
        this.client.bus.send(packet);
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
      this.currentView = 'manage';
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
        const packet = new GuildRankClientPacket();
        packet.sessionId = this.sessionId;
        packet.rank = rank;
        packet.memberName = name;
        this.client.bus.send(packet);
      },
      'primary',
    );
  }

  // ── Invite notifications ──────────────────────────────────────────────

  private pendingInvitePlayerId = 0;
  private pendingInviteType: 'create' | 'join' = 'create';

  private showCreateInvite(playerId: number, guildIdentity: string) {
    this.pendingInvitePlayerId = playerId;
    this.pendingInviteType = 'create';

    const nameSpan = this.invite.querySelector('.guild-invite-name')!;
    nameSpan.textContent = guildIdentity;
    const textSuffix = this.invite.querySelector('.guild-invite-suffix')!;
    textSuffix.textContent = ' is being created. Join?';

    this.invite.classList.remove('hidden');
  }

  private showJoinRequest(playerId: number, playerName: string) {
    this.pendingInvitePlayerId = playerId;
    this.pendingInviteType = 'join';

    const nameSpan = this.invite.querySelector('.guild-invite-name')!;
    nameSpan.textContent = playerName;
    const textSuffix = this.invite.querySelector('.guild-invite-suffix')!;
    textSuffix.textContent = ' wants to join your guild.';

    this.invite.classList.remove('hidden');
  }

  private handleInviteAccept() {
    if (this.pendingInviteType === 'create') {
      const packet = new GuildAcceptClientPacket();
      packet.inviterPlayerId = this.pendingInvitePlayerId;
      this.client.bus.send(packet);
    } else {
      const packet = new GuildUseClientPacket();
      packet.playerId = this.pendingInvitePlayerId;
      this.client.bus.send(packet);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private showLookupPrompt() {
    const body = this.container.querySelector('.guild-body')!;
    const footer = this.container.querySelector('.guild-footer')!;
    const header = this.container.querySelector('.guild-header')!;
    header.textContent = 'Look Up Guild';
    body.innerHTML = '';
    footer.innerHTML = '';

    const group = this.createInputGroup('Guild Tag or Name', 'lookup', 24);
    body.appendChild(group);

    this.addFooterButton(footer, 'Back', () => {
      this.currentView = 'menu';
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
        this.requestGuildInfo(query);
      },
      'primary',
    );
  }

  private requestGuildInfo(tag: string) {
    const packet = new GuildReportClientPacket();
    packet.sessionId = this.sessionId;
    packet.guildIdentity = tag;
    this.client.bus.send(packet);
  }

  private requestMemberList(tag: string) {
    const packet = new GuildTellClientPacket();
    packet.sessionId = this.sessionId;
    packet.guildIdentity = tag;
    this.client.bus.send(packet);
  }

  private leaveGuild() {
    const packet = new GuildRemoveClientPacket();
    packet.sessionId = this.sessionId;
    this.client.bus.send(packet);
  }

  private disbandGuild() {
    const packet = new GuildJunkClientPacket();
    packet.sessionId = this.sessionId;
    this.client.bus.send(packet);
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
