import type { EifRecord, ThreeItem } from 'eolib';
import { Gender, ItemType } from 'eolib';
import type { Client } from '../../../../client';
import { EOResourceID } from '../../../../edf';
import { playSfxById, SfxId } from '../../../../sfx';
import { getItemGraphicId } from '../../../../utils/get-item-graphic-id';
import { Base } from '../../../base-ui';

import './chest-dialog.css';

export class ChestDialog extends Base {
  private client: Client;
  public el = document.getElementById('chest');
  private cover = document.querySelector<HTMLDivElement>('#cover');
  private btnCancel = this.el.querySelector<HTMLButtonElement>(
    'button[data-id="cancel"]',
  );
  private dialogs = document.getElementById('dialogs');
  private itemsList = this.el.querySelector<HTMLDivElement>('.chest-items');
  private items: ThreeItem[] = [];

  constructor(client: Client) {
    super();
    this.client = client;

    this.btnCancel.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      this.hide();
    });
  }

  setItems(items: ThreeItem[]) {
    this.items = items;
    this.render();
  }

  show() {
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

  private getChestItemGraphicPath(
    id: number,
    eifRecord: EifRecord,
    amount: number,
  ): string {
    const graphicId = getItemGraphicId(id, eifRecord.graphicId, amount);
    const fileId = 100 + graphicId;
    return `/gfx/gfx023/${fileId}.png`;
  }

  private render() {
    this.itemsList.innerHTML = '';

    if (this.items.length === 0) {
      return;
    }

    for (const item of this.items) {
      const record = this.client.getEifRecordById(item.id);
      if (!record) {
        continue;
      }

      const itemElement = document.createElement('div');
      itemElement.className = 'chest-item';

      const itemImage = document.createElement('img');
      itemImage.src = this.getChestItemGraphicPath(
        item.id,
        record,
        item.amount,
      );
      itemImage.classList.add('item-image');
      itemElement.appendChild(itemImage);

      const itemText = document.createElement('div');
      itemText.className = 'item-text';

      const itemNameElement = document.createElement('div');
      itemNameElement.className = 'item-name';
      itemNameElement.textContent = record.name;
      itemText.appendChild(itemNameElement);

      if (item.amount) {
        const quantityElement = document.createElement('div');
        quantityElement.className = 'item-quantity';
        quantityElement.textContent = `x ${item.amount}  `;

        if (record.type === ItemType.Armor) {
          const text =
            record.spec2 === Gender.Female
              ? this.client.getResourceString(EOResourceID.FEMALE)
              : this.client.getResourceString(EOResourceID.MALE);
          quantityElement.textContent += `(${text})`;
        }

        itemText.appendChild(quantityElement);
      }

      itemElement.addEventListener('contextmenu', () => {
        this.client.takeChestItem(item.id);
      });

      itemElement.appendChild(itemText);
      this.itemsList.appendChild(itemElement);
    }
  }
}
