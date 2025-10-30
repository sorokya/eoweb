import mitt from 'mitt';
import type { Client } from '../client';
import { playSfxById, SfxId } from '../sfx';
import { Base } from './base-ui';

type Events = {
  assignToSlot: { spellId: number; slotIndex: number };
};

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
  private emitter = mitt<Events>();

  private dragging: {
    spellId: number;
    el: HTMLElement;
    pointerId: number;
    ghost: HTMLElement;
    offsetX: number;
    offsetY: number;
  } | null = null;

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

  on<Event extends keyof Events>(
    event: Event,
    handler: (data: Events[Event]) => void,
  ) {
    this.emitter.on(event, handler);
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

      icon.addEventListener('pointerdown', (e) => {
        this.onPointerDown(e, icon, spell.id);
      });

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

  private onPointerDown(e: PointerEvent, el: HTMLDivElement, spellId: number) {
    if (e.button !== 0 && e.pointerType !== 'touch') return;

    (e.target as Element).setPointerCapture(e.pointerId);

    const rect = el.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    const ghost = el.cloneNode(true) as HTMLElement;
    ghost.style.position = 'fixed';
    ghost.style.pointerEvents = 'none';
    ghost.style.margin = '0';
    ghost.style.inset = 'auto';
    ghost.style.left = '0';
    ghost.style.top = '0';
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    ghost.style.backgroundPositionX = `-${rect.width}px`;
    ghost.style.transform = `translate(${e.clientX - offsetX}px, ${e.clientY - offsetY}px)`;
    ghost.style.opacity = '0.9';
    ghost.style.willChange = 'transform';
    ghost.style.zIndex = '9999';

    document.body.appendChild(ghost);

    this.dragging = {
      spellId,
      el,
      pointerId: e.pointerId,
      ghost,
      offsetX,
      offsetY,
    };

    playSfxById(SfxId.InventoryPickup);

    window.addEventListener('pointermove', this.onPointerMove.bind(this), {
      passive: false,
    });
    window.addEventListener('pointerup', this.onPointerUp.bind(this), {
      passive: false,
    });
    window.addEventListener('pointercancel', this.onPointerCancel.bind(this), {
      passive: false,
    });
  }

  private onPointerMove(e: PointerEvent) {
    if (!this.dragging || e.pointerId !== this.dragging.pointerId) return;

    // keep ghost under the finger/cursor
    const { ghost, offsetX, offsetY } = this.dragging;
    ghost.style.transform = `translate(${e.clientX - offsetX}px, ${e.clientY - offsetY}px)`;

    // prevent page scrolling while dragging on mobile
    e.preventDefault();
  }

  private onPointerUp(e: PointerEvent) {
    if (!this.dragging || e.pointerId !== this.dragging.pointerId) return;

    const { el, ghost, spellId } = this.dragging;

    const target = document.elementFromPoint(e.clientX, e.clientY);

    playSfxById(SfxId.InventoryPlace);
    ghost.remove();
    el.style.display = 'flex';
    this.teardownDragListeners();
    this.dragging = null;

    if (!target) return;

    const slot = target.closest('.slot') as HTMLDivElement;
    if (!slot) return;

    const slots = document.querySelectorAll('#hotbar .slot');
    const slotIndex = Array.from(slots).indexOf(slot);
    if (slotIndex === -1) return;

    this.emitter.emit('assignToSlot', {
      spellId,
      slotIndex,
    });
  }

  private onPointerCancel() {
    if (!this.dragging) return;

    const { el, ghost } = this.dragging;
    ghost.remove();
    el.style.opacity = '1';
    this.teardownDragListeners();
    this.dragging = null;
  }

  private teardownDragListeners() {
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerCancel);
  }
}
