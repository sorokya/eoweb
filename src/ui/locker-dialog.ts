import type { ThreeItem } from 'eolib';
import type { Client } from '../client';
import { EOResourceID } from '../edf';
import { playSfxById, SfxId } from '../sfx';
import { capitalize } from '../utils/capitalize';
import { Base } from './base-ui';
import { createItemMenuItem } from './utils/create-menu-item';

export class LockerDialog extends Base {
  private client: Client;
  protected container = document.getElementById('locker');
  private cover = document.querySelector<HTMLDivElement>('#cover');
  private btnCancel = this.container.querySelector<HTMLButtonElement>(
    'button[data-id="cancel"]',
  );
  private scrollHandle =
    this.container.querySelector<HTMLDivElement>('.scroll-handle');
  private title = this.container.querySelector<HTMLSpanElement>('.title');
  private dialogs = document.getElementById('dialogs');
  private itemList =
    this.container.querySelector<HTMLDivElement>('.locker-items');
  private items: ThreeItem[] = [];

  constructor(client: Client) {
    super();
    this.client = client;

    this.btnCancel.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      this.hide();
    });

    this.itemList.addEventListener('scroll', () => {
      this.setScrollThumbPosition();
    });

    this.scrollHandle.addEventListener('pointerdown', () => {
      const onPointerMove = (e: PointerEvent) => {
        const rect = this.itemList.getBoundingClientRect();
        const min = 30;
        const max = 212;
        const clampedY = Math.min(
          Math.max(e.clientY, rect.top + min),
          rect.top + max,
        );
        const scrollPercent = (clampedY - rect.top - min) / (max - min);
        const scrollHeight = this.itemList.scrollHeight;
        const clientHeight = this.itemList.clientHeight;
        this.itemList.scrollTop = scrollPercent * (scrollHeight - clientHeight);
      };

      const onPointerUp = () => {
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
      };

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
    });
  }

  setItems(items: ThreeItem[]) {
    this.items = items;
    this.render();
  }

  getItemCount(): number {
    return this.items.length;
  }

  getItemAmount(id: number): number {
    const item = this.items.find((i) => i.id === id);
    return item ? item.amount : 0;
  }

  setScrollThumbPosition() {
    const min = 60;
    const max = 212;
    const scrollTop = this.itemList.scrollTop;
    const scrollHeight = this.itemList.scrollHeight;
    const clientHeight = this.itemList.clientHeight;
    const scrollPercent = scrollTop / (scrollHeight - clientHeight);
    const clampedPercent = Math.min(Math.max(scrollPercent, 0), 1);
    const top = min + (max - min) * clampedPercent || min;
    this.scrollHandle.style.top = `${top}px`;
  }

  show() {
    this.cover.classList.remove('hidden');
    this.container.classList.remove('hidden');
    this.dialogs.classList.remove('hidden');
    this.client.typing = true;
    this.setScrollThumbPosition();
  }

  hide() {
    this.cover.classList.add('hidden');
    this.container.classList.add('hidden');

    if (!document.querySelector('#dialogs > div:not(.hidden)')) {
      this.dialogs.classList.add('hidden');
      this.client.typing = false;
    }
  }

  private render() {
    this.itemList.innerHTML = '';
    this.title.innerText = `${capitalize(this.client.name)}'s ${this.client.getResourceString(EOResourceID.DIALOG_TITLE_PRIVATE_LOCKER)} [${this.items.length}]`;

    if (this.items.length === 0) {
      return;
    }

    for (const item of this.items) {
      const record = this.client.getEifRecordById(item.id);
      if (!record) {
        continue;
      }

      const itemElement = createItemMenuItem(
        item.id,
        record,
        record.name,
        `x ${item.amount}`,
      );

      itemElement.addEventListener('contextmenu', () => {
        if (
          this.client.weight.current + record.weight >
          this.client.weight.max
        ) {
          this.client.emit('smallAlert', {
            title: this.client.getResourceString(
              EOResourceID.STATUS_LABEL_TYPE_WARNING,
            ),
            message: this.client.getResourceString(
              EOResourceID.DIALOG_ITS_TOO_HEAVY_WEIGHT,
            ),
          });
          return;
        }

        this.client.takeLockerItem(item.id);
      });

      this.itemList.appendChild(itemElement);
    }
  }
}
