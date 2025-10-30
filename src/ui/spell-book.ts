import type { Client } from '../client';
import { playSfxById, SfxId } from '../sfx';
import { Base } from './base-ui';

export class SpellBook extends Base {
  protected container: HTMLDivElement = document.querySelector('#spell-book');
  private dialogs = document.getElementById('dialogs');
  private btnCancel: HTMLButtonElement = this.container.querySelector(
    'button[data-id="cancel"]',
  );
  private spellGrid: HTMLDivElement =
    this.container.querySelector('.spell-grid');
  private label: HTMLSpanElement = this.container.querySelector('.label');
  private scrollHandle: HTMLDivElement =
    this.container.querySelector('.scroll-handle');
  private open = false;
  private client: Client;

  constructor(client: Client) {
    super();

    this.client = client;

    this.btnCancel.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      this.hide();
    });

    this.spellGrid.addEventListener('scroll', () => {
      this.setScrollThumbPosition();
    });

    this.scrollHandle.addEventListener('pointerdown', () => {
      const onPointerMove = (e: PointerEvent) => {
        const rect = this.spellGrid.getBoundingClientRect();
        const min = 30;
        const max = 212;
        const clampedY = Math.min(
          Math.max(e.clientY, rect.top + min),
          rect.top + max,
        );
        const scrollPercent = (clampedY - rect.top - min) / (max - min);
        const scrollHeight = this.spellGrid.scrollHeight;
        const clientHeight = this.spellGrid.clientHeight;
        this.spellGrid.scrollTop =
          scrollPercent * (scrollHeight - clientHeight);
      };

      const onPointerUp = () => {
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
      };

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
    });
  }

  setScrollThumbPosition() {
    const min = 60;
    const max = 212;
    const scrollTop = this.spellGrid.scrollTop;
    const scrollHeight = this.spellGrid.scrollHeight;
    const clientHeight = this.spellGrid.clientHeight;
    const scrollPercent = scrollTop / (scrollHeight - clientHeight);
    const clampedPercent = Math.min(Math.max(scrollPercent, 0), 1);
    const top = min + (max - min) * clampedPercent || min;
    this.scrollHandle.style.top = `${top}px`;
  }

  show() {
    this.render();
    this.container.classList.remove('hidden');
    this.dialogs.classList.remove('hidden');
    this.open = true;
    this.setScrollThumbPosition();
  }

  hide() {
    this.container.classList.add('hidden');
    this.open = false;

    if (!document.querySelector('#dialogs > div:not(.hidden)')) {
      this.dialogs.classList.add('hidden');
      this.client.typing = false;
    }
  }

  toggle() {
    if (this.open) {
      this.hide();
    } else {
      this.show();
    }
  }

  private render() {
    this.spellGrid.innerHTML = '';

    this.label.innerText = `Spell Book (${this.client.spells.length}) Points (${this.client.skillPoints})`;

    for (const spell of this.client.spells) {
      const record = this.client.getEsfRecordById(spell.id);
      if (!record) continue;

      const spellElement = document.createElement('div');
      const icon = document.createElement('div');
      icon.classList.add('spell-icon');
      icon.style.backgroundImage = `url('/gfx/gfx025/${record.iconId + 100}.png')`;
      spellElement.appendChild(icon);

      const click = () => {
        this.client.showConfirmation(
          `Do you want to level up '${record.name}' to level ${spell.level + 1} for 1 skill point?`,
          'Spell training',
          () => {},
        );
      };

      const name = document.createElement('span');
      name.classList.add('spell-name');
      name.innerText = record.name;
      name.addEventListener('click', click);
      spellElement.appendChild(name);

      const level = document.createElement('span');
      level.classList.add('spell-level');
      level.innerText = `Lvl: ${spell.level}`;
      level.addEventListener('click', click);
      spellElement.appendChild(level);

      this.spellGrid.appendChild(spellElement);
    }
  }
}
