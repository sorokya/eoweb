import type { Client } from '../client';
import { HOTBAR_SLOTS } from '../consts';
import { getItemGraphicPath } from '../utils/get-item-graphic-id';
import { Base } from './base-ui';

export enum SlotType {
  Empty = 0,
  Item = 1,
  Skill = 2,
}

class Slot {
  type: SlotType;
  typeId: number;

  constructor(type: SlotType, typeId = 0) {
    this.type = type;
    this.typeId = typeId;
  }
}

export class Hotbar extends Base {
  protected container: HTMLDivElement = document.querySelector('#hotbar');
  private client: Client;
  private slots: Slot[];

  constructor(client: Client) {
    super();
    this.client = client;
    this.slots = [];

    for (let i = 0; i < HOTBAR_SLOTS; ++i) {
      const slot = document.createElement('div');
      slot.classList.add('slot');
      this.container.appendChild(slot);
    }
  }

  show() {
    this.render();
    this.container.classList.remove('hidden');
  }

  setSlot(slotIndex: number, type: SlotType, typeId: number) {
    this.slots[slotIndex] = new Slot(type, typeId);
    localStorage.setItem(
      `${this.client.name}-hotbar`,
      JSON.stringify(this.slots),
    );
    this.render();
  }

  private render() {
    if (!this.slots.length) {
      this.loadSlots();
    }

    for (const [index, slot] of this.slots.entries()) {
      if (slot.type === SlotType.Empty) {
        continue;
      }

      const element = this.container.children[index] as HTMLDivElement;
      element.innerHTML = '';

      if (slot.type === SlotType.Skill) {
        const skill = this.client.getEsfRecordById(slot.typeId);
        if (!skill) {
          continue;
        }

        const img = document.createElement('div');
        img.classList.add('skill');
        img.style.backgroundImage = `url(/gfx/gfx025/${skill.iconId + 100}.png)`;

        element.appendChild(img);
      } else {
        const item = this.client.getEifRecordById(slot.typeId);
        if (!item) {
          continue;
        }

        const itemContainer = document.createElement('div');
        itemContainer.classList.add('item');

        const img = document.createElement('img');
        img.src = getItemGraphicPath(slot.typeId, item.graphicId);
        itemContainer.appendChild(img);

        element.appendChild(itemContainer);
      }
    }
  }

  private loadSlots() {
    const json = localStorage.getItem(`${this.client.name}-hotbar`);
    if (json) {
      this.slots = JSON.parse(json);
    } else {
      for (let i = 0; i < HOTBAR_SLOTS; ++i) {
        this.slots.push(new Slot(SlotType.Empty));
      }
    }
  }
}
