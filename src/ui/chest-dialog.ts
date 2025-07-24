import type { EifRecord, ThreeItem } from 'eolib';
import { Gender, ItemType } from 'eolib';
import type { Client } from '../client';
import { EOResourceID } from '../edf';
import { playSfxById, SfxId } from '../sfx';
import { Base } from './base-ui';

export class ChestDialog extends Base {
  private client: Client;
  protected container = document.getElementById('chest');
  private cover = document.querySelector<HTMLDivElement>('#cover');
  private btnCancel = this.container.querySelector<HTMLButtonElement>(
    'button[data-id="cancel"]',
  );
  private itemsList =
    this.container.querySelector<HTMLDivElement>('.chest-items');
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
    this.container.classList.remove('hidden');
    this.container.style.left = `${Math.floor(window.innerWidth / 2 - this.container.clientWidth / 2)}px`;
    this.container.style.top = `${Math.floor(window.innerHeight / 2 - this.container.clientHeight / 2)}px`;

    const inventory = document.querySelector<HTMLDivElement>('#inventory');
    const chestRect = this.container.getBoundingClientRect();
    const inventoryRect = inventory.getBoundingClientRect();
    if (
      chestRect.bottom > inventoryRect.top &&
      !inventory.classList.contains('hidden')
    ) {
      this.container.style.top = `${Math.floor(inventoryRect.top - chestRect.height - 30)}px`;
    }
  }

  hide() {
    this.cover.classList.add('hidden');
    this.container.classList.add('hidden');
  }

  private getChestItemGraphicId(eifRecord: EifRecord, amount: number): number {
    if (eifRecord.type === ItemType.Currency) {
      const gfx =
        amount >= 100000
          ? 4
          : amount >= 10000
            ? 3
            : amount >= 100
              ? 2
              : amount >= 2
                ? 1
                : 0;
      return 269 + 2 * gfx;
    }
    return 2 * eifRecord.graphicId - 1;
  }

  private getChestItemGraphicPath(
    eifRecord: EifRecord,
    amount: number,
  ): string {
    const graphicId = this.getChestItemGraphicId(eifRecord, amount);
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
      itemImage.src = this.getChestItemGraphicPath(record, item.amount);
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
