import type { EifRecord, ThreeItem } from 'eolib';
import { ItemType } from 'eolib';
import mitt from 'mitt';
import type { Client } from '../client';
import { playSfxById, SfxId } from '../sfx';
import { Base } from './base-ui';

type Events = {
  close: undefined;
};

export class ChestUI extends Base {
  private client: Client;
  private cover: HTMLElement;
  private closeButton: HTMLButtonElement;
  private itemsList: HTMLDivElement;
  private emitter = mitt<Events>();

  constructor(client: Client) {
    super();
    this.client = client;

    const container = document.getElementById('chest');
    if (!container) throw new Error('Chest element not found');
    this.container = container;

    const cover = document.getElementById('cover');
    if (!cover) throw new Error('Cover element not found');
    this.cover = cover;

    this.closeButton = this.container.querySelector(
      '[data-id="chest-close"]',
    ) as HTMLButtonElement;
    this.itemsList = this.container.querySelector(
      '.chest-items',
    ) as HTMLDivElement;

    this.setupEventListeners();
  }

  on<Event extends keyof Events>(
    event: Event,
    handler: (data: Events[Event]) => void,
  ) {
    this.emitter.on(event, handler);
  }

  private setupEventListeners() {
    this.closeButton.addEventListener('click', () => {
      this.closeChest();
    });

    this.cover.addEventListener('click', () => {
      this.closeChest();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.container.classList.contains('hidden')) {
        this.closeChest();
      }
    });
  }

  openChest(items: ThreeItem[]) {
    this.container.style.backgroundImage = `url('/gfx/gfx002/151.png')`;
    this.renderItems(items);
    this.show();
    this.cover.classList.remove('hidden');
    playSfxById(SfxId.BuySell);
  }

  private closeChest() {
    this.hide();
    this.cover.classList.add('hidden');
    this.emitter.emit('close', undefined);
    playSfxById(SfxId.BuySell);
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

  private groupItemsByGraphicId(
    items: ThreeItem[],
  ): Array<{ item: ThreeItem; totalAmount: number; allItems: ThreeItem[] }> {
    const grouped = new Map<
      number,
      { item: ThreeItem; totalAmount: number; allItems: ThreeItem[] }
    >();

    items.forEach((item) => {
      const eifRecord = this.client.getEifRecordById(item.id);
      const graphicId = eifRecord
        ? this.getChestItemGraphicId(eifRecord, item.amount)
        : item.id;

      if (grouped.has(graphicId)) {
        const existing = grouped.get(graphicId);
        if (existing) {
          existing.totalAmount += item.amount;
          existing.allItems.push(item);
        }
      } else {
        grouped.set(graphicId, {
          item: item,
          totalAmount: item.amount,
          allItems: [item],
        });
      }
    });

    return Array.from(grouped.values());
  }

  private renderItems(items: ThreeItem[]) {
    this.itemsList.innerHTML = '';

    if (items.length === 0) {
      return;
    }

    const groupedItems = this.groupItemsByGraphicId(items);

    groupedItems.forEach((group) => {
      const eifRecord = this.client.getEifRecordById(group.item.id);
      const itemName = eifRecord ? eifRecord.name : `Item ${group.item.id}`;

      const itemElement = document.createElement('div');
      itemElement.className = 'chest-item';

      if (eifRecord) {
        const itemImage = document.createElement('img');
        itemImage.src = this.getChestItemGraphicPath(
          eifRecord,
          group.item.amount,
        );
        itemImage.classList.add('item-image');
        itemElement.appendChild(itemImage);
      }

      const itemText = document.createElement('div');
      itemText.className = 'item-text';

      const itemNameElement = document.createElement('div');
      itemNameElement.className = 'item-name';
      itemNameElement.textContent = itemName;
      itemText.appendChild(itemNameElement);

      if (group.totalAmount >= 1) {
        const quantityElement = document.createElement('div');
        quantityElement.className = 'item-quantity';
        quantityElement.textContent = `x ${group.totalAmount}`;
        itemText.appendChild(quantityElement);
      }

      itemElement.appendChild(itemText);
      itemElement.addEventListener('mouseenter', () =>
        itemElement.classList.add('hover'),
      );
      itemElement.addEventListener('mouseleave', () =>
        itemElement.classList.remove('hover'),
      );

      this.itemsList.appendChild(itemElement);
    });
  }
}
