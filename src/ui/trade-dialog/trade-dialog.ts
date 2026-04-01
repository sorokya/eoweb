import { type Item, ItemSpecial } from 'eolib';
import type { Client } from '@/client';
import { playSfxById, SfxId } from '@/sfx';
import { Base } from '@/ui/base-ui';

import './trade-dialog.css';
import { DialogResourceID } from '@/edf';
import { TradeState } from '@/game-state';
import { capitalize } from '@/utils';

export class TradeDialog extends Base {
  private client: Client;
  protected container = document.getElementById('trade-dialog')!;
  private dialogs = document.getElementById('dialogs')!;
  private cover = document.querySelector<HTMLDivElement>('#cover')!;
  private notification = document.getElementById('trade-request-notification')!;
  private tradeRequestText =
    this.notification.querySelector('.trade-req-text')!;
  private columns = this.container.querySelector('.trade-columns')!;
  private btnAgree = this.container.querySelector<HTMLButtonElement>(
    'button[data-id="agree"]',
  )!;

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
      if (!this.client.tradeController.playerAgreed) {
        if (this.client.tradeController.playerItems.length === 0) {
          this.showTradeMessage('You must offer at least one item.');
          return;
        }
        if (this.client.tradeController.partnerItems.length === 0) {
          this.showTradeMessage(
            'Your trade partner has not offered any items.',
          );
          return;
        }
      }

      this.client.tradeController.agreeTrade(true);
    });

    this.container
      .querySelector('button[data-id="cancel"]')!
      .addEventListener('click', () => {
        if (this.client.tradeController.playerAgreed) {
          this.client.tradeController.agreeTrade(false);
        } else {
          this.client.tradeController.cancel();
          this.close();
        }
      });

    // Static notification button wiring
    this.notification
      .querySelector('button[data-id="decline"]')!
      .addEventListener('click', () => {
        playSfxById(SfxId.ButtonClick);
        this.notification.classList.add('hidden');
        this.client.tradeController.reset();
      });

    this.notification
      .querySelector('button[data-id="accept"]')!
      .addEventListener('click', () => {
        playSfxById(SfxId.ButtonClick);
        this.notification.classList.add('hidden');
        this.client.tradeController.acceptTradeRequest();
      });

    // Client event listener
    this.client.on('tradeUpdated', () => {
      if (this.client.tradeController.state === TradeState.Pending) {
        this.showRequest();
        return;
      }

      if (
        this.client.tradeController.state === TradeState.Open &&
        !this._open
      ) {
        this.open();
        return;
      }

      if (this.client.tradeController.state === TradeState.None && this._open) {
        this.close();
        return;
      }

      if (this.client.tradeController.scam) {
        const strings = this.client.getDialogStrings(
          DialogResourceID.TRADE_OTHER_PLAYER_TRICK_YOU,
        );
        this.showTradeMessage(strings[1]);
        this.client.tradeController.scam = false;
      }

      this.renderColumns();
      this.updateAgreeButton();
    });
  }

  private showRequest() {
    const strings = this.client.getDialogStrings(
      DialogResourceID.TRADE_REQUEST,
    );
    this.tradeRequestText.textContent = `${capitalize(this.client.tradeController.partnerName)} ${strings[1]}`;
    this.notification.classList.remove('hidden');
  }

  private open() {
    this._open = true;

    this.container.querySelector('.trade-header')!.textContent =
      `Trade with ${capitalize(this.client.tradeController.partnerName)}`;

    this.renderColumns();
    this.updateAgreeButton();
    this.cover.classList.remove('hidden');
    this.container.classList.remove('hidden');
    this.dialogs.classList.remove('hidden');
    this.client.typing = true;
  }

  private close() {
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
    if (record.special === ItemSpecial.Lore) return;
    this.promptAmount(itemId, item.amount);
  }

  private updateAgreeButton() {
    if (this.client.tradeController.playerAgreed) {
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
        this.client.name,
        this.client.tradeController.playerItems,
        this.client.tradeController.playerAgreed,
        true,
      ),
    );
    this.columns.appendChild(
      this.createColumn(
        this.client.tradeController.partnerName,
        this.client.tradeController.partnerItems,
        this.client.tradeController.partnerAgreed,
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
            this.client.tradeController.removeItem(item.id);
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
      this.client.tradeController.addItem(itemId, 1);
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
      this.client.tradeController.addItem(itemId, amount);
    });
    buttons.appendChild(btnOk);
    overlay.appendChild(buttons);

    this.container.appendChild(overlay);
    input.focus();
    input.select();
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
