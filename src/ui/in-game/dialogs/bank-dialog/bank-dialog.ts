import mitt from 'mitt';
import type { Client } from '../../../../client';
import { EOResourceID } from '../../../../edf';
import { playSfxById, SfxId } from '../../../../sfx';
import { Base } from '../../../base-ui';
import { DialogIcon } from '../../../dialog-icon';
import { createIconMenuItem } from '../../../utils/create-menu-item';

import './bank-dialog.css';

type Events = {
  deposit: undefined;
  withdraw: undefined;
  upgrade: undefined;
};

export class BankDialog extends Base {
  private client: Client;
  private dialogs = document.getElementById('dialogs');
  private cover = document.querySelector<HTMLDivElement>('#cover');
  public el = document.getElementById('bank');
  private itemList = this.el.querySelector<HTMLDivElement>('.item-list');
  private balance = this.el.querySelector<HTMLSpanElement>('.balance');
  private emitter = mitt<Events>();

  constructor(client: Client) {
    super();
    this.client = client;

    const btnOk = this.el.querySelector<HTMLButtonElement>(
      'button[data-id="ok"]',
    );
    btnOk.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      this.hide();
    });

    client.on('bankUpdated', () => {
      this.render();
    });
  }

  on<Event extends keyof Events>(
    event: Event,
    handler: (data: Events[Event]) => void,
  ) {
    this.emitter.on(event, handler);
  }

  render() {
    this.balance.innerText = `${this.client.goldBank}`;
    this.itemList.innerHTML = '';

    const gold = this.client.getEifRecordById(1);
    if (!gold) {
      throw new Error('Gold item not found');
    }

    const depositItem = createIconMenuItem(
      DialogIcon.BankDeposit,
      this.client.getResourceString(EOResourceID.DIALOG_BANK_DEPOSIT),
      `${this.client.getResourceString(EOResourceID.DIALOG_BANK_TRANSFER)} ${gold.name} ${this.client.getResourceString(EOResourceID.DIALOG_BANK_TO_ACCOUNT)}`,
    );
    depositItem.addEventListener('click', () => {
      this.emitter.emit('deposit', undefined);
    });
    this.itemList.appendChild(depositItem);

    const withdrawItem = createIconMenuItem(
      DialogIcon.BankWithdraw,
      this.client.getResourceString(EOResourceID.DIALOG_BANK_WITHDRAW),
      `${this.client.getResourceString(EOResourceID.DIALOG_BANK_TRANSFER)} ${gold.name} ${this.client.getResourceString(EOResourceID.DIALOG_BANK_FROM_ACCOUNT)}`,
    );
    withdrawItem.addEventListener('click', () => {
      this.emitter.emit('withdraw', undefined);
    });
    this.itemList.appendChild(withdrawItem);

    const upgradeItem = createIconMenuItem(
      DialogIcon.BankLockerUpgrade,
      this.client.getResourceString(EOResourceID.DIALOG_BANK_LOCKER_UPGRADE),
      this.client.getResourceString(EOResourceID.DIALOG_BANK_MORE_SPACE),
    );
    upgradeItem.addEventListener('click', () => {
      this.emitter.emit('upgrade', undefined);
    });
    this.itemList.appendChild(upgradeItem);
  }

  show() {
    this.render();
    this.cover.classList.remove('hidden');
    this.el.classList.remove('hidden');
    this.dialogs.classList.remove('hidden');
    this.client.typing = true;
  }

  hide() {
    this.cover.classList.add('hidden');
    this.el.classList.add('hidden');

    if (!document.querySelector('#dialogs > div:not(.hidden)')) {
      this.dialogs.classList.add('hidden');
      this.client.typing = false;
    }
  }
}
