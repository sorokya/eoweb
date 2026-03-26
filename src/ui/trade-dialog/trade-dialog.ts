import type { TradeItemData } from 'eolib';
import {
  Item,
  TradeAcceptClientPacket,
  TradeAddClientPacket,
  TradeAgreeClientPacket,
  TradeCloseClientPacket,
  TradeRemoveClientPacket,
} from 'eolib';
import type { Client } from '../../client';
import { playSfxById, SfxId } from '../../sfx';
import { Base } from '../base-ui';

import './trade-dialog.css';

export class TradeDialog extends Base {
  private client: Client;
  protected container = document.getElementById('trade-dialog')!;
  private dialogs = document.getElementById('dialogs')!;
  private cover = document.querySelector<HTMLDivElement>('#cover')!;
  private notification = document.getElementById('trade-request-notification')!;
  private columns = this.container.querySelector('.trade-columns')!;
  private btnAgree = this.container.querySelector<HTMLButtonElement>(
    'button[data-id="agree"]',
  )!;

  private partnerPlayerName = '';
  private localPlayerId = 0;
  private localPlayerName = '';
  private pendingRequestPlayerId = 0;

  private localItems: Item[] = [];
  private partnerItems: Item[] = [];
  private localAgreed = false;
  private partnerAgreed = false;
  private _open = false;

  get isOpen() {
    return this._open;
  }

  constructor(client: Client) {
    super();
    this.client = client;

    // Static footer button wiring
    this.container
      .querySelector('button[data-id="add-item"]')!
      .addEventListener('click', () => {
        playSfxById(SfxId.ButtonClick);
        this.showAddItemMenu();
      });

    this.btnAgree.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      if (!this.localAgreed) {
        if (this.localItems.length === 0) {
          this.showTradeMessage('You must offer at least one item.');
          return;
        }
        if (this.partnerItems.length === 0) {
          this.showTradeMessage(
            'Your trade partner has not offered any items.',
          );
          return;
        }
      }
      const packet = new TradeAgreeClientPacket();
      packet.agree = !this.localAgreed;
      this.client.bus.send(packet);
    });

    this.container
      .querySelector('button[data-id="cancel"]')!
      .addEventListener('click', () => {
        playSfxById(SfxId.ButtonClick);
        const packet = new TradeCloseClientPacket();
        this.client.bus.send(packet);
        this.close();
      });

    // Static notification button wiring
    this.notification
      .querySelector('button[data-id="decline"]')!
      .addEventListener('click', () => {
        playSfxById(SfxId.ButtonClick);
        this.notification.classList.add('hidden');
      });

    this.notification
      .querySelector('button[data-id="accept"]')!
      .addEventListener('click', () => {
        playSfxById(SfxId.ButtonClick);
        this.notification.classList.add('hidden');
        const packet = new TradeAcceptClientPacket();
        packet.playerId = this.pendingRequestPlayerId;
        this.client.bus.send(packet);
      });

    // Client event listeners
    this.client.on('tradeUpdated', ({ tradeData }) => {
      this.applyTradeData(tradeData);
      this.localAgreed = false;
      this.partnerAgreed = false;
      this.renderColumns();
      this.updateAgreeButton();
    });

    this.client.on('tradePartnerAgree', ({ agree }) => {
      this.partnerAgreed = agree;
      this.renderColumns();
    });

    this.client.on('tradeOwnAgree', ({ agree }) => {
      this.localAgreed = agree;
      this.updateAgreeButton();
    });

    this.client.on('tradeCompleted', () => {
      this.close();
    });

    this.client.on('tradeCancelled', () => {
      this.close();
    });
  }

  showRequest(playerId: number, playerName: string) {
    this.pendingRequestPlayerId = playerId;
    this.notification.querySelector('.trade-req-name')!.textContent =
      playerName;
    this.notification.classList.remove('hidden');
  }

  open(
    partnerPlayerName: string,
    localPlayerId: number,
    localPlayerName: string,
  ) {
    this.partnerPlayerName = partnerPlayerName;
    this.localPlayerId = localPlayerId;
    this.localPlayerName = localPlayerName;
    this.localItems = [];
    this.partnerItems = [];
    this.localAgreed = false;
    this.partnerAgreed = false;
    this._open = true;

    this.container.querySelector('.trade-header')!.textContent =
      `Trade with ${partnerPlayerName}`;

    this.renderColumns();
    this.updateAgreeButton();
    this.cover.classList.remove('hidden');
    this.container.classList.remove('hidden');
    this.dialogs.classList.remove('hidden');
    this.client.typing = true;
  }

  close() {
    this._open = false;
    this.cover.classList.add('hidden');
    this.container.classList.add('hidden');
    if (!document.querySelector('#dialogs > div:not(.hidden)')) {
      this.dialogs.classList.add('hidden');
      this.client.typing = false;
    }
  }

  offerItem(itemId: number) {
    if (!this._open) return;
    const item = this.client.items.find((i) => i.id === itemId);
    if (!item) return;
    const record = this.client.getEifRecordById(itemId);
    if (!record) return;
    if (record.special === 1) return;
    this.promptAmount(itemId, item.amount);
  }

  private applyTradeData(tradeData: TradeItemData[]) {
    for (const data of tradeData) {
      if (data.playerId === this.localPlayerId) {
        this.localItems = [...data.items];
      } else {
        this.partnerItems = [...data.items];
      }
    }
  }

  private updateAgreeButton() {
    if (this.localAgreed) {
      this.btnAgree.textContent = 'Agreed ✓';
      this.btnAgree.classList.add('active');
    } else {
      this.btnAgree.textContent = 'Agree';
      this.btnAgree.classList.remove('active');
    }
  }

  private renderColumns() {
    if (!this._open) return;
    this.columns.innerHTML = '';

    this.columns.appendChild(
      this.createColumn(
        this.localPlayerName,
        this.localItems,
        this.localAgreed,
        true,
      ),
    );
    this.columns.appendChild(
      this.createColumn(
        this.partnerPlayerName,
        this.partnerItems,
        this.partnerAgreed,
        false,
      ),
    );
  }

  private createColumn(
    name: string,
    items: Item[],
    agreed: boolean,
    isLocal: boolean,
  ): HTMLDivElement {
    const col = document.createElement('div');
    col.className = 'trade-column';

    const header = document.createElement('div');
    header.className = 'trade-col-header';

    const nameEl = document.createElement('span');
    nameEl.className = 'trade-col-name';
    nameEl.textContent = isLocal ? 'You' : name;
    header.appendChild(nameEl);

    const badge = document.createElement('span');
    badge.className = `trade-agree-badge ${agreed ? 'agreed' : 'waiting'}`;
    badge.textContent = agreed ? 'Agreed' : 'Waiting';
    header.appendChild(badge);

    col.appendChild(header);

    const list = document.createElement('div');
    list.className = 'trade-item-list';

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'trade-empty';
      empty.textContent = 'No items offered';
      list.appendChild(empty);
    } else {
      for (const item of items) {
        const row = document.createElement('div');
        row.className = `trade-item-row${isLocal ? ' removable' : ''}`;

        const record = this.client.getEifRecordById(item.id);
        const nameSpan = document.createElement('span');
        nameSpan.className = 'item-name';
        nameSpan.textContent = record?.name ?? `Item #${item.id}`;
        row.appendChild(nameSpan);

        const amountSpan = document.createElement('span');
        amountSpan.className = 'item-amount';
        amountSpan.textContent = `x${item.amount}`;
        row.appendChild(amountSpan);

        if (isLocal) {
          row.title = 'Click to remove';
          row.addEventListener('click', () => {
            playSfxById(SfxId.ButtonClick);
            const packet = new TradeRemoveClientPacket();
            packet.itemId = item.id;
            this.client.bus.send(packet);
          });
        }

        list.appendChild(row);
      }
    }

    col.appendChild(list);
    return col;
  }

  private showAddItemMenu() {
    const items = this.client.items.filter((i) => {
      const record = this.client.getEifRecordById(i.id);
      if (!record) return false;
      return record.special !== 1;
    });

    if (items.length === 0) return;

    const overlay = document.createElement('div');
    overlay.className = 'trade-overlay';

    const title = document.createElement('div');
    title.className = 'trade-overlay-title';
    title.textContent = 'Select item to offer';
    overlay.appendChild(title);

    for (const item of items) {
      const record = this.client.getEifRecordById(item.id);
      const row = document.createElement('div');
      row.className = 'trade-overlay-row';

      const nameSpan = document.createElement('span');
      nameSpan.textContent = record?.name ?? `Item #${item.id}`;
      row.appendChild(nameSpan);

      const amountSpan = document.createElement('span');
      amountSpan.className = 'item-amount';
      amountSpan.textContent = `x${item.amount}`;
      row.appendChild(amountSpan);

      row.addEventListener('click', () => {
        playSfxById(SfxId.ButtonClick);
        overlay.remove();
        this.promptAmount(item.id, item.amount);
      });

      overlay.appendChild(row);
    }

    const btnClose = document.createElement('button');
    btnClose.className = 'trade-btn trade-overlay-back';
    btnClose.textContent = 'Back';
    btnClose.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      overlay.remove();
    });
    overlay.appendChild(btnClose);

    this.container.appendChild(overlay);
  }

  private promptAmount(itemId: number, maxAmount: number) {
    if (maxAmount === 1) {
      this.addItem(itemId, 1);
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'trade-prompt';

    const record = this.client.getEifRecordById(itemId);
    const label = document.createElement('div');
    label.className = 'trade-prompt-label';
    label.textContent = `How many ${record?.name ?? 'items'}? (max ${maxAmount})`;
    overlay.appendChild(label);

    const input = document.createElement('input');
    input.type = 'number';
    input.min = '1';
    input.max = String(maxAmount);
    input.value = '1';
    input.className = 'trade-prompt-input';
    overlay.appendChild(input);

    const buttons = document.createElement('div');
    buttons.className = 'trade-prompt-buttons';

    const btnCancel = document.createElement('button');
    btnCancel.className = 'trade-btn';
    btnCancel.textContent = 'Cancel';
    btnCancel.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      overlay.remove();
    });
    buttons.appendChild(btnCancel);

    const btnOk = document.createElement('button');
    btnOk.className = 'trade-btn primary';
    btnOk.textContent = 'OK';
    btnOk.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      let amount = Number.parseInt(input.value, 10);
      if (Number.isNaN(amount) || amount < 1) amount = 1;
      if (amount > maxAmount) amount = maxAmount;
      overlay.remove();
      this.addItem(itemId, amount);
    });
    buttons.appendChild(btnOk);
    overlay.appendChild(buttons);

    this.container.appendChild(overlay);
    input.focus();
    input.select();
  }

  private addItem(itemId: number, amount: number) {
    const addItem = new Item();
    addItem.id = itemId;
    addItem.amount = amount;
    const packet = new TradeAddClientPacket();
    packet.addItem = addItem;
    this.client.bus.send(packet);
  }

  private showTradeMessage(message: string) {
    const existing = this.container.querySelector('.trade-message');
    if (existing) existing.remove();

    const msg = document.createElement('div');
    msg.className = 'trade-message';
    msg.textContent = message;
    this.container.appendChild(msg);
    setTimeout(() => msg.remove(), 3000);
  }
}
