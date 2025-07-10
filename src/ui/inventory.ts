import { ItemSize } from 'eolib';
import mitt from 'mitt';
import {
  type Client,
  type EquipmentSlot,
  getEquipmentSlotFromString,
} from '../client';
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
const COLS = 14;
const ROWS = 4;
const CELL_SIZE = 26;

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
  private grid: HTMLDivElement = this.container.querySelector('.grid');
  private positions: ItemPosition[] = [];
  private tab = 0;
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

  constructor(client: Client) {
    super(document.getElementById('inventory'), true);
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

    this.grid.addEventListener('dragover', (e) => {
      e.preventDefault(); // Necessary to allow drop
    });

    this.grid.addEventListener('drop', (e) => {
      e.preventDefault();
      const data = e.dataTransfer?.getData('text/plain');
      if (!data) return;

      let item: { source: string; slot: EquipmentSlot; id: number };
      try {
        item = JSON.parse(data);
      } catch (error) {
        console.error('Invalid item data:', error);
        return;
      }

      if (item.source === 'paperdoll') {
        client.unequipItem(item.slot);
        return;
      }

      playSfxById(SfxId.InventoryPlace);
      const rect = this.grid.getBoundingClientRect();

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const gridX = Math.floor(mouseX / CELL_SIZE);
      const gridY = Math.floor(mouseY / CELL_SIZE);

      this.tryMoveItem(item.id, gridX, gridY);
    });

    const canvas = document.getElementById('game') as HTMLCanvasElement;
    const uiContainer = document.getElementById('ui');
    uiContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      client.setMousePosition({
        x: Math.min(
          Math.max(Math.floor((e.clientX - rect.left) * scaleX), 0),
          canvas.width,
        ),
        y: Math.min(
          Math.max(Math.floor((e.clientY - rect.top) * scaleY), 0),
          canvas.height,
        ),
      });
    });

    uiContainer.addEventListener('drop', (e) => {
      e.preventDefault();

      if (e.target === this.grid) {
        return;
      }

      const item = JSON.parse(e.dataTransfer?.getData('text/plain'));
      if (Number.isNaN(item.id) || item.id < 1 || item.source !== 'inventory') {
        return;
      }

      playSfxById(SfxId.InventoryPlace);

      if (e.target === this.btnDrop) {
        this.emitter.emit('dropItem', { at: 'feet', itemId: item.id });
        return;
      }

      if (e.target === this.btnJunk) {
        this.emitter.emit('junkItem', item.id);
        return;
      }

      if (e.target instanceof HTMLElement) {
        const chestItems = e.target.closest('.chest-items');
        if (chestItems) {
          this.emitter.emit('addChestItem', item.id);
          return;
        }

        const paperdoll = e.target.closest('#paperdoll');
        if (paperdoll) {
          const target = e.target.closest('.item');
          if (!target) {
            return;
          }

          const slot = getEquipmentSlotFromString(
            target.getAttribute('data-id'),
          );
          if (typeof slot === 'undefined') {
            return;
          }

          this.emitter.emit('equipItem', {
            slot,
            itemId: item.id,
          });
          return;
        }
      }

      if (e.target instanceof HTMLElement && e.target.closest('.chest-items')) {
        this.emitter.emit('dropItem', { at: 'cursor', itemId: item.id });
        return;
      }

      this.emitter.emit('dropItem', { at: 'cursor', itemId: item.id });
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
      imgContainer.setAttribute('draggable', 'true');

      imgContainer.addEventListener('dragstart', (e) => {
        this.lastItemSelected = item.id;
        playSfxById(SfxId.InventoryPickup);
        e.dataTransfer?.setData(
          'text/plain',
          JSON.stringify({ source: 'inventory', id: item.id }),
        );
      });

      imgContainer.addEventListener('click', (e) => {
        e.stopPropagation();
        this.lastItemSelected = item.id;
      });

      imgContainer.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        this.lastItemSelected = item.id;
        playSfxById(SfxId.InventoryPlace);
        this.emitter.emit('useItem', item.id);
      });

      imgContainer.addEventListener('contextmenu', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.lastItemSelected = item.id;
        playSfxById(SfxId.InventoryPlace);
        this.emitter.emit('useItem', item.id);
      });

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
  }

  toggle() {
    if (this.container.classList.contains('hidden')) {
      this.show();
    } else {
      this.hide();
    }
  }
}
