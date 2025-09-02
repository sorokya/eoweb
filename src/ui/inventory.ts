import { type Item, ItemSize } from 'eolib';
import mitt from 'mitt';
import type { Client, EquipmentSlot } from '../client';
import { playSfxById, SfxId } from '../sfx';
import { getItemMeta } from '../utils/get-item-meta';
import type { Vector2 } from '../vector';
import { Base } from './base-ui';

type ItemPosition = {
  id: number;
  tab: number;
  x: number;
  y: number;
};

const TABS = 2;
const COLS = 8;
const ROWS = 10;
const CELL_SIZE = 23;

const ITEM_SIZE = {
  [ItemSize.Size1x1]: { x: 1, y: 1 },
  [ItemSize.Size1x2]: { x: 1, y: 2 },
  [ItemSize.Size1x3]: { x: 1, y: 3 },
  [ItemSize.Size1x4]: { x: 1, y: 4 },
  [ItemSize.Size2x1]: { x: 2, y: 1 },
  [ItemSize.Size2x2]: { x: 2, y: 2 },
  [ItemSize.Size2x3]: { x: 2, y: 3 },
  [ItemSize.Size2x4]: { x: 2, y: 4 },
};

type Events = {
  dropItem: { at: 'cursor' | 'feet'; itemId: number };
  useItem: number;
  openPaperdoll: undefined;
  equipItem: { slot: EquipmentSlot; itemId: number };
  junkItem: number;
  addChestItem: number;
};

export class Inventory extends Base {
  private client: Client;
  private emitter = mitt<Events>();
  protected container: HTMLDivElement = document.querySelector('#inventory');
  private grid: HTMLDivElement = this.container.querySelector('.grid');
  private positions: ItemPosition[] = [];
  private tab = 0;

  private dragging: {
    item: Item;
    el: HTMLElement;
    pointerId: number;
    ghost: HTMLElement;
    offsetX: number;
    offsetY: number;
  } | null = null;

  private currentWeight: HTMLSpanElement =
    this.container.querySelector('.weight .current');
  private maxWeight: HTMLSpanElement =
    this.container.querySelector('.weight .max');
  private btnPaperdoll: HTMLButtonElement = this.container.querySelector(
    'button[data-id="paperdoll"]',
  );
  private btnDrop: HTMLButtonElement = this.container.querySelector(
    'button[data-id="drop"]',
  );
  private btnJunk: HTMLButtonElement = this.container.querySelector(
    'button[data-id="junk"]',
  );
  private lastItemSelected = 0;

  private onPointerDown(e: PointerEvent, el: HTMLDivElement, item: Item) {
    if (e.button !== 0 && e.pointerType !== 'touch') return;

    (e.target as Element).setPointerCapture(e.pointerId);

    const rect = el.getBoundingClientRect();
    const offsetX = e.clientX - rect.left + rect.width;
    const offsetY = e.clientY - rect.top;

    const ghost = el.querySelector('img').cloneNode(true) as HTMLElement;
    ghost.style.position = 'fixed';
    ghost.style.pointerEvents = 'none';
    ghost.style.margin = '0';
    ghost.style.inset = 'auto';
    ghost.style.left = '0';
    ghost.style.top = '0';
    ghost.style.transform = `translate(${e.clientX - offsetX}px, ${e.clientY - offsetY}px)`;
    ghost.style.opacity = '0.9';
    ghost.style.willChange = 'transform';
    ghost.style.zIndex = '9999';
    // Optional: add a subtle scale to show it's being dragged
    ghost.style.scale = '1.05';

    // hide original element
    el.style.display = 'none';

    document.body.appendChild(ghost);

    this.dragging = {
      item,
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

    const { el, ghost, item } = this.dragging;

    playSfxById(SfxId.InventoryPlace);
    ghost.remove();
    el.style.display = 'flex';

    const rect = this.grid.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;

    const gridX = Math.floor(pointerX / CELL_SIZE);
    const gridY = Math.floor(pointerY / CELL_SIZE);

    this.tryMoveItem(item.id, gridX, gridY);

    this.teardownDragListeners();
    this.dragging = null;
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

  constructor(client: Client) {
    super();
    this.client = client;

    this.client.on('inventoryChanged', () => {
      this.loadPositions();
      this.render();
    });

    const btnTab1: HTMLButtonElement = this.container.querySelector(
      '.tabs > button:nth-child(1)',
    );
    const btnTab2: HTMLButtonElement = this.container.querySelector(
      '.tabs > button:nth-child(2)',
    );

    btnTab1.addEventListener('click', (e) => {
      playSfxById(SfxId.ButtonClick);
      this.tab = 0;
      btnTab1.classList.add('active');
      btnTab2.classList.remove('active');
      this.render();
      e.stopPropagation();
    });

    btnTab2.addEventListener('click', (e) => {
      playSfxById(SfxId.ButtonClick);
      this.tab = 1;
      btnTab1.classList.remove('active');
      btnTab2.classList.add('active');
      this.render();
      e.stopPropagation();
    });
    this.btnPaperdoll.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      this.emitter.emit('openPaperdoll', undefined);
    });

    this.btnDrop.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      if (this.lastItemSelected) {
        this.emitter.emit('dropItem', {
          at: 'feet',
          itemId: this.lastItemSelected,
        });
      }
    });

    this.btnJunk.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      if (this.lastItemSelected) {
        this.emitter.emit('junkItem', this.lastItemSelected);
      }
    });

    window.addEventListener('resize', () => {
      this.container.style.top = `${Math.floor(window.innerHeight / 2 - this.container.clientHeight / 2)}px`;
    });
  }

  on<Event extends keyof Events>(
    event: Event,
    handler: (data: Events[Event]) => void,
  ) {
    this.emitter.on(event, handler);
  }

  private tryMoveItem(itemId: number, x: number, y: number) {
    const position = this.getPosition(itemId);
    if (!position) return;

    const record = this.client.getEifRecordById(itemId);
    if (!record) return;

    const size = ITEM_SIZE[record.size];

    // Temporarily remove this item from the positions array to avoid false overlap
    const otherPositions = this.positions.filter((p) => p.id !== itemId);

    // Reuse your `doesItemFitAt` function but pass in the reduced list
    const fits = this.doesItemFitAt(position.tab, x, y, size, otherPositions);
    if (!fits) return;

    // Update position
    position.x = x;
    position.y = y;

    // Re-render
    this.render();
    this.savePositions();
  }

  private render() {
    this.grid.innerHTML = '';

    this.currentWeight.innerText = this.client.weight.current.toString();
    this.maxWeight.innerText = this.client.weight.max.toString();

    if (!this.client.items.length) {
      return;
    }

    if (!this.positions.length) {
      this.loadPositions();
    }

    for (const item of this.client.items) {
      const position = this.getPosition(item.id);
      if (!position || position.tab !== this.tab) {
        continue;
      }

      const record = this.client.getEifRecordById(item.id);
      if (!record) {
        continue;
      }

      const imgContainer = document.createElement('div');
      imgContainer.classList.add('item');
      const img = document.createElement('img');

      img.src = `/gfx/gfx023/${100 + record.graphicId * 2}.png`;

      const size = ITEM_SIZE[record.size];

      imgContainer.style.gridColumn = `${position.x + 1} / span ${size.x}`;
      imgContainer.style.gridRow = `${position.y + 1} / span ${size.y}`;

      const tooltip = document.createElement('div');
      tooltip.classList.add('tooltip');

      const meta = getItemMeta(record);

      if (item.id === 1) {
        tooltip.innerText = `${item.amount} ${record.name}\n${meta.join('\n')}`;
      } else {
        if (item.amount > 1) {
          tooltip.innerText = `${record.name} x${item.amount}\n${meta.join('\n')}`;
        } else {
          tooltip.innerText = `${record.name}\n${meta.join('\n')}`;
        }
      }

      imgContainer.appendChild(tooltip);
      imgContainer.appendChild(img);

      imgContainer.addEventListener('pointerdown', (e) => {
        this.onPointerDown(e, imgContainer, item);
      });

      this.grid.appendChild(imgContainer);
    }
  }

  private getPosition(id: number): ItemPosition | undefined {
    return this.positions.find((i) => i.id === id);
  }

  private savePositions() {
    localStorage.setItem(
      `${this.client.name}-inventory`,
      JSON.stringify(this.positions),
    );
  }

  loadPositions() {
    const json = localStorage.getItem(`${this.client.name}-inventory`);
    if (!json) {
      this.setInitialItemPositions();
      return;
    }

    this.positions = JSON.parse(json);

    let changed = false;
    for (let i = this.positions.length - 1; i >= 0; --i) {
      const position = this.positions[i];
      if (
        position.id !== 1 &&
        !this.client.items.some((i) => i.id === position.id)
      ) {
        this.positions.splice(i, 1);
        changed = true;
      }
    }

    for (const item of this.client.items) {
      const record = this.client.getEifRecordById(item.id);
      if (!record) {
        continue;
      }

      const existing = this.positions.find((p) => p.id === item.id);
      if (!existing) {
        changed = true;
        const position = this.getNextAvailablePosition(
          item.id,
          ITEM_SIZE[record.size],
        );
        if (position) {
          this.positions.push(position);
        }
      }
    }

    if (changed) {
      this.savePositions();
    }
  }

  private setInitialItemPositions() {
    this.positions = [];
    for (const item of this.client.items) {
      const record = this.client.getEifRecordById(item.id);
      if (!record) {
        continue;
      }

      const position = this.getNextAvailablePosition(
        item.id,
        ITEM_SIZE[record.size],
      );
      if (position) {
        this.positions.push(position);
      }
    }

    this.savePositions();
  }

  private getNextAvailablePosition(
    id: number,
    size: Vector2,
  ): ItemPosition | null {
    for (let tab = 0; tab < TABS; ++tab) {
      for (let y = 0; y < ROWS; ++y) {
        for (let x = 0; x < COLS; ++x) {
          if (this.doesItemFitAt(tab, x, y, size)) {
            return { x, y, tab, id };
          }
        }
      }
    }

    return null;
  }

  private doesItemFitAt(
    tab: number,
    x: number,
    y: number,
    size: Vector2,
    positions: ItemPosition[] = this.positions,
  ): boolean {
    for (const pos of positions) {
      if (pos.tab !== tab) continue;

      const record = this.client.getEifRecordById(pos.id);
      if (!record) continue;

      const existingSize = ITEM_SIZE[record.size];

      const overlapX = x < pos.x + existingSize.x && x + size.x > pos.x;
      const overlapY = y < pos.y + existingSize.y && y + size.y > pos.y;

      if ((overlapX && overlapY) || x + size.x > COLS || y + size.y > ROWS) {
        return false;
      }
    }

    return true;
  }

  show() {
    this.render();
    this.container.classList.remove('hidden');
    this.container.style.top = `${Math.floor(window.innerHeight / 2 - this.container.clientHeight / 2)}px`;
  }

  toggle() {
    if (this.container.classList.contains('hidden')) {
      this.show();
    } else {
      this.hide();
    }
  }
}
