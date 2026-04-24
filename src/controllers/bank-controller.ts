import {
  BankAddClientPacket,
  BankTakeClientPacket,
  LockerBuyClientPacket,
} from 'eolib';

import type { Client } from '@/client';
import {
  GOLD_ITEM_ID,
  LOCKER_MAX_ITEM_AMOUNT,
  LOCKER_UPGRADE_BASE_COST,
  LOCKER_UPGRADE_COST_STEP,
  MAX_LOCKER_UPGRADES,
} from '@/consts';
import { DialogResourceID, EOResourceID } from '@/edf';

import { SfxId } from '@/sfx';
import { ChatIcon } from '@/ui/enums';

type OpenedSubscriber = (goldBank: number, lockerUpgrades: number) => void;
type UpdatedSubscriber = (goldBank: number) => void;

export class BankController {
  private client: Client;
  goldBank = 0;
  lockerUpgrades = 0;

  private openedSubscribers: OpenedSubscriber[] = [];
  private updatedSubscribers: UpdatedSubscriber[] = [];

  constructor(client: Client) {
    this.client = client;
  }

  subscribeOpened(cb: OpenedSubscriber): void {
    this.openedSubscribers.push(cb);
  }

  unsubscribeOpened(cb: OpenedSubscriber): void {
    this.openedSubscribers = this.openedSubscribers.filter((s) => s !== cb);
  }

  subscribeUpdated(cb: UpdatedSubscriber): void {
    this.updatedSubscribers.push(cb);
  }

  unsubscribeUpdated(cb: UpdatedSubscriber): void {
    this.updatedSubscribers = this.updatedSubscribers.filter((s) => s !== cb);
  }

  handleOpened(
    sessionId: number,
    goldBank: number,
    lockerUpgrades: number,
  ): void {
    this.client.sessionId = sessionId;
    this.goldBank = goldBank;
    this.lockerUpgrades = lockerUpgrades;
    for (const cb of this.openedSubscribers) cb(goldBank, lockerUpgrades);
  }

  notifyBankUpdated(goldInventory: number, goldBank: number): void {
    const previousGoldBank = this.goldBank;
    this.client.inventoryController.setItem(GOLD_ITEM_ID, goldInventory);
    this.goldBank = goldBank;
    this.client.audioController.playById(SfxId.BuySell);
    for (const cb of this.updatedSubscribers) cb(goldBank);

    const diff = Math.abs(goldBank - previousGoldBank);
    if (goldBank > previousGoldBank) {
      const msg = this.client.locale.bankDepositedMsg.replace(
        '{amount}',
        diff.toLocaleString(),
      );
      this.client.toastController.show(msg);
      this.client.emit('serverChat', { message: msg, icon: ChatIcon.UpArrow });
    } else if (goldBank < previousGoldBank) {
      const msg = this.client.locale.bankWithdrewMsg.replace(
        '{amount}',
        diff.toLocaleString(),
      );
      this.client.toastController.show(msg);
      this.client.emit('serverChat', {
        message: msg,
        icon: ChatIcon.DownArrow,
      });
    }
  }

  getNextLockerUpgradeCost(): number | null {
    if (this.lockerUpgrades >= MAX_LOCKER_UPGRADES) {
      return null;
    }
    return (
      LOCKER_UPGRADE_BASE_COST + this.lockerUpgrades * LOCKER_UPGRADE_COST_STEP
    );
  }

  private showDialogError(
    id: DialogResourceID,
    fallbackTitle: string,
    fallbackMessage: string,
  ): void {
    const [title, message] = this.client.getDialogStrings(id);
    this.client.alertController.show(
      title || fallbackTitle,
      message || fallbackMessage,
    );
  }

  depositGold(): void {
    const gold = this.client.inventoryController.getItemAmount(GOLD_ITEM_ID);
    if (gold <= 0) {
      this.showDialogError(
        DialogResourceID.BANK_ACCOUNT_UNABLE_TO_DEPOSIT,
        'Bank',
        'You do not have any gold to deposit.',
      );
      return;
    }

    const title = this.client.getResourceString(
      EOResourceID.DIALOG_TRANSFER_HOW_MUCH,
    );
    const amountLabel = this.client.getResourceString(
      EOResourceID.DIALOG_BANK_TO_ACCOUNT,
    );
    const actionLabel = this.client.getResourceString(
      EOResourceID.DIALOG_TRANSFER_DEPOSIT,
    );
    this.client.alertController.showAmount(
      title,
      amountLabel,
      gold,
      actionLabel,
      (amount) => {
        if (!amount || amount <= 0) return;
        const currentGold =
          this.client.inventoryController.getItemAmount(GOLD_ITEM_ID);

        if (amount > currentGold) {
          this.showDialogError(
            DialogResourceID.BANK_ACCOUNT_UNABLE_TO_DEPOSIT,
            'Bank',
            'You do not have enough gold to deposit that amount.',
          );
          return;
        }
        const packet = new BankAddClientPacket();
        packet.sessionId = this.client.sessionId;
        packet.amount = amount;
        this.client.bus!.send(packet);
      },
    );
  }

  withdrawGold(): void {
    if (this.goldBank <= 0) {
      this.showDialogError(
        DialogResourceID.BANK_ACCOUNT_UNABLE_TO_WITHDRAW,
        'Bank',
        'You do not have any gold to withdraw.',
      );
      return;
    }

    const title = this.client.getResourceString(
      EOResourceID.DIALOG_TRANSFER_HOW_MUCH,
    );
    const amountLabel = this.client.getResourceString(
      EOResourceID.DIALOG_BANK_FROM_ACCOUNT,
    );
    const actionLabel = this.client.getResourceString(
      EOResourceID.DIALOG_TRANSFER_WITHDRAW,
    );
    this.client.alertController.showAmount(
      title,
      amountLabel,
      this.goldBank,
      actionLabel,
      (amount) => {
        if (!amount || amount <= 0) return;
        const packet = new BankTakeClientPacket();
        packet.sessionId = this.client.sessionId;
        packet.amount = amount;
        this.client.bus!.send(packet);
      },
    );
  }

  upgradeLocker(): void {
    if (this.lockerUpgrades >= MAX_LOCKER_UPGRADES) {
      const strings = this.client.getDialogStrings(
        DialogResourceID.LOCKER_UPGRADE_IMPOSSIBLE,
      );
      const message =
        strings[1].replace('200', LOCKER_MAX_ITEM_AMOUNT.toString()) ||
        `Your locker cannot hold more than ${LOCKER_MAX_ITEM_AMOUNT} items.`;
      this.client.alertController.show(strings[0] || 'Bank Locker', message);
      return;
    }

    const gold = this.client.inventoryController.getItemAmount(GOLD_ITEM_ID);
    const upgradeCost = this.getNextLockerUpgradeCost();
    if (!upgradeCost || gold < upgradeCost) {
      const strings = this.client.getDialogStrings(
        DialogResourceID.WARNING_YOU_HAVE_NOT_ENOUGH,
      );
      const message = strings[1]
        ? `${strings[1]} ${this.client.locale.wordGold}`
        : `You need ${upgradeCost?.toLocaleString() ?? 0} gold.`;
      this.client.alertController.show(strings[0] || 'Bank Locker', message);
      return;
    }

    this.client.bus!.send(new LockerBuyClientPacket());
  }
}
