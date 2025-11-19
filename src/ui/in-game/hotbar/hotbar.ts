import type { Client } from '../../../client';
import { HOTBAR_SLOTS } from '../../../consts';
import { getItemGraphicPath } from '../../../utils/get-item-graphic-id';
import { Base } from '../../base-ui';
import { HotbarSlot, HotbarSlotType } from '../../hotbar-slot';

import './hotbar.css';

export class Hotbar extends Base {
  protected el: HTMLDivElement = document.querySelector('#hotbar');
  private client: Client;

  constructor(client: Client) {
    super();
    this.client = client;

    for (let i = 0; i < HOTBAR_SLOTS; ++i) {
      const slot = document.createElement('div');
      slot.classList.add('slot');

      slot.addEventListener('click', () => {
        this.client.useHotbarSlot(i);
      });

      this.el.appendChild(slot);
    }
  }

  refresh() {
    this.render();
  }

  show() {
    this.render();
    this.el.classList.remove('hidden');
  }

  setSlot(slotIndex: number, type: HotbarSlotType, typeId: number) {
    this.client.hotbarSlots[slotIndex] = new HotbarSlot(type, typeId);
    localStorage.setItem(
      `${this.client.name}-hotbar`,
      JSON.stringify(this.client.hotbarSlots),
    );
    this.render();
  }

  private render() {
    if (!this.client.hotbarSlots.length) {
      this.loadSlots();
    }

    for (const [index, slot] of this.client.hotbarSlots.entries()) {
      if (slot.type === HotbarSlotType.Empty) {
        continue;
      }

      const element = this.el.children[index] as HTMLDivElement;
      element.innerHTML = '';

      if (slot.type === HotbarSlotType.Skill) {
        const skill = this.client.getEsfRecordById(slot.typeId);
        if (!skill) {
          continue;
        }

        const img = document.createElement('div');
        img.classList.add('skill');
        img.style.backgroundImage = `url(/gfx/gfx025/${skill.iconId + 100}.png)`;

        if (this.client.selectedSpellId === slot.typeId) {
          img.style.backgroundPositionX = '-34px';
        }

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
      this.client.hotbarSlots = JSON.parse(json);
    } else {
      for (let i = 0; i < HOTBAR_SLOTS; ++i) {
        this.client.hotbarSlots.push(new HotbarSlot(HotbarSlotType.Empty));
      }
    }
  }
}
