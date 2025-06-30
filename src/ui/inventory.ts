import { type EifRecord, ItemSize, ItemSpecial, ItemType } from 'eolib';
import mitt from 'mitt';
import type { Client } from '../client';
import { playSfxById, SfxId } from '../sfx';
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

type DragState = {
  active: boolean;
  itemId: number;
  element: HTMLElement | null;
  clone: HTMLElement | null;
  offset: { x: number; y: number };
  pointerId: number;
};

type Events = {
  dropItem: number;
};

export class Inventory extends Base {
  private client: Client;
  private emitter = mitt<Events>();
  protected container = document.querySelector('#inventory');
  private grid: HTMLDivElement = this.container.querySelector('.grid');
  private positions: ItemPosition[] = [];
  private tab = 0;

  // Need to track our own drag state since we're ditching HTML5 drag
  private dragState: DragState = {
    active: false,
    itemId: 0,
    element: null,
    clone: null,
    offset: { x: 0, y: 0 },
    pointerId: -1,
  };

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

    // Handle drops on inventory grid
    this.grid.addEventListener('pointerup', (e) => {
      if (this.dragState.active && e.pointerId === this.dragState.pointerId) {
        this.handleGridDrop(e);
      }
    });

    const canvas = document.getElementById('game') as HTMLCanvasElement;
    const uiContainer = document.getElementById('ui');

    // Handle drops on game world (for dropping items)
    uiContainer.addEventListener('pointerup', (e) => {
      if (!this.dragState.active || e.pointerId !== this.dragState.pointerId)
        return;

      const rect = canvas.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
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

        this.emitter.emit('dropItem', this.dragState.itemId);
      }
    });

    // Bind methods to preserve 'this' context for global event listeners
    this.handleDragMove = this.handleDragMove.bind(this);
    this.handleDragEnd = this.handleDragEnd.bind(this);
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

    // Temporarily remove this item from positions to avoid self-collision
    const otherPositions = this.positions.filter((p) => p.id !== itemId);
    const fits = this.doesItemFitAt(position.tab, x, y, size, otherPositions);
    if (!fits) return;

    position.x = x;
    position.y = y;
    this.render();
    this.savePositions();
  }

  private startDrag(itemId: number, element: HTMLElement, e: PointerEvent) {
    if (this.dragState.active) return;

    playSfxById(SfxId.InventoryPickup);

    this.dragState.active = true;
    this.dragState.itemId = itemId;
    this.dragState.element = element;
    this.dragState.pointerId = e.pointerId;

    // Only grab the image - don't want the tooltip following our cursor
    const img = element.querySelector('img') as HTMLImageElement;
    const clone = img.cloneNode(true) as HTMLImageElement;
    clone.style.position = 'fixed';
    clone.style.pointerEvents = 'none';
    clone.style.zIndex = '9999';
    clone.style.opacity = '0.8';
    clone.classList.add('dragging-clone');

    const rect = element.getBoundingClientRect();
    this.dragState.offset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    clone.style.left = `${e.clientX - this.dragState.offset.x}px`;
    clone.style.top = `${e.clientY - this.dragState.offset.y}px`;

    document.body.appendChild(clone);
    this.dragState.clone = clone;

    // Visual feedback for original item
    element.style.opacity = '0.5';
    element.style.cursor = 'grabbing';

    // These pointer events won't mess with keyboard like the old drag system did
    document.addEventListener('pointermove', this.handleDragMove);
    document.addEventListener('pointerup', this.handleDragEnd);
    document.addEventListener('pointercancel', this.handleDragEnd);

    element.setPointerCapture(e.pointerId);
  }

  private handleDragMove(e: PointerEvent) {
    if (
      !this.dragState.active ||
      e.pointerId !== this.dragState.pointerId ||
      !this.dragState.clone
    ) {
      return;
    }

    this.dragState.clone.style.left = `${e.clientX - this.dragState.offset.x}px`;
    this.dragState.clone.style.top = `${e.clientY - this.dragState.offset.y}px`;

    const canvas = document.getElementById('game') as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    this.client.setMousePosition({
      x: Math.min(
        Math.max(Math.floor((e.clientX - rect.left) * scaleX), 0),
        canvas.width,
      ),
      y: Math.min(
        Math.max(Math.floor((e.clientY - rect.top) * scaleY), 0),
        canvas.height,
      ),
    });
  }

  private handleDragEnd(e: PointerEvent) {
    if (!this.dragState.active || e.pointerId !== this.dragState.pointerId) {
      return;
    }

    if (this.dragState.clone) {
      document.body.removeChild(this.dragState.clone);
    }

    if (this.dragState.element) {
      this.dragState.element.style.opacity = '';
      this.dragState.element.style.cursor = 'grab';
      this.dragState.element.releasePointerCapture(e.pointerId);
    }

    document.removeEventListener('pointermove', this.handleDragMove);
    document.removeEventListener('pointerup', this.handleDragEnd);
    document.removeEventListener('pointercancel', this.handleDragEnd);

    this.dragState = {
      active: false,
      itemId: 0,
      element: null,
      clone: null,
      offset: { x: 0, y: 0 },
      pointerId: -1,
    };
  }

  private handleGridDrop(e: PointerEvent) {
    const rect = this.grid.getBoundingClientRect();
    const gridX = Math.floor((e.clientX - rect.left) / CELL_SIZE);
    const gridY = Math.floor((e.clientY - rect.top) / CELL_SIZE);

    if (gridX < 0 || gridX >= COLS || gridY < 0 || gridY >= ROWS) return;

    const occupant = this.positions.find((p) => {
      if (p.tab !== this.tab || p.id === this.dragState.itemId) return false;
      const record = this.client.getEifRecordById(p.id);
      if (!record) return false;
      const size = ITEM_SIZE[record.size];
      return (
        gridX >= p.x &&
        gridX < p.x + size.x &&
        gridY >= p.y &&
        gridY < p.y + size.y
      );
    });

    if (occupant) {
      const draggedRecord = this.client.getEifRecordById(this.dragState.itemId);
      const occupantRecord = this.client.getEifRecordById(occupant.id);

      if (!draggedRecord || !occupantRecord) return;

      const draggedSize = ITEM_SIZE[draggedRecord.size];
      const occupantSize = ITEM_SIZE[occupantRecord.size];

      if (
        draggedSize.x === occupantSize.x &&
        draggedSize.y === occupantSize.y
      ) {
        const draggedPos = this.getPosition(this.dragState.itemId);
        if (!draggedPos) return;

        const occupantPos = { x: occupant.x, y: occupant.y, tab: occupant.tab };

        // Swap positions :P
        occupant.x = draggedPos.x;
        occupant.y = draggedPos.y;
        occupant.tab = draggedPos.tab;

        draggedPos.x = occupantPos.x;
        draggedPos.y = occupantPos.y;
        draggedPos.tab = occupantPos.tab;

        playSfxById(SfxId.InventoryPlace);
        this.savePositions();
        this.render();
        return;
      }
    }

    // should work
    playSfxById(SfxId.InventoryPlace);
    this.tryMoveItem(this.dragState.itemId, gridX, gridY);
  }

  private render() {
    this.grid.innerHTML = '';

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
      imgContainer.style.cursor = 'grab';
      imgContainer.dataset.itemId = String(item.id);

      // Switch to pointer events - should fix the movement input locking issue
      imgContainer.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return; // Only left click/touch

        this.startDrag(item.id, imgContainer, e);
        e.preventDefault(); // Prevent text selection
      });

      imgContainer.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      imgContainer.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        playSfxById(SfxId.InventoryPlace);
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

function getItemMeta(item: EifRecord): string[] {
  const meta = [];

  let itemType = '';
  switch (item.type) {
    case ItemType.General: {
      itemType = 'general item';
      break;
    }
    case ItemType.Currency:
      itemType = 'currency';
      break;
    case ItemType.Heal:
      itemType = 'potion';
      if (item.hp) {
        itemType += ` + ${item.hp}hp`;
      }
      if (item.tp) {
        itemType += ` + ${item.tp}mp`;
      }
      break;
    case ItemType.Teleport:
      itemType = 'teleport';
      break;
    case ItemType.ExpReward:
      itemType = 'exp reward';
      break;
    case ItemType.Key:
      itemType = 'key';
      break;
    case ItemType.Alcohol:
      itemType = 'beverage';
      break;
    case ItemType.EffectPotion:
      itemType = 'effect';
      break;
    case ItemType.HairDye:
      itemType = 'hairdye';
      break;
    case ItemType.CureCurse:
      itemType = 'cure';
      break;
    default:
      if (item.special === ItemSpecial.Cursed) {
        itemType = 'cursed';
      } else if (item.special === ItemSpecial.Lore) {
        itemType = 'lore';
      } else {
        itemType = 'normal';
      }

      if (item.type === ItemType.Armor) {
        if (item.spec2 === 1) {
          itemType += ' male';
        } else {
          itemType += ' female';
        }
      }

      switch (item.type) {
        case ItemType.Weapon:
          itemType += ' weapon';
          break;
        case ItemType.Shield:
          itemType += ' shield';
          break;
        case ItemType.Armor:
          itemType += ' clothing';
          break;
        case ItemType.Hat:
          itemType += ' hat';
          break;
        case ItemType.Boots:
          itemType += ' boots';
          break;
        case ItemType.Gloves:
          itemType += ' gloves';
          break;
        case ItemType.Accessory:
          itemType += ' accessory';
          break;
        case ItemType.Belt:
          itemType += ' belt';
          break;
        case ItemType.Necklace:
          itemType += ' necklace';
          break;
        case ItemType.Ring:
          itemType += ' ring';
          break;
        case ItemType.Armlet:
          itemType += ' bracelet';
          break;
        case ItemType.Bracer:
          itemType += ' bracer';
          break;
      }
  }

  meta.push(itemType);

  if (item.type >= 10 && item.type <= 21) {
    if (item.minDamage || item.maxDamage) {
      meta.push(`damage: ${item.minDamage} - ${item.maxDamage}`);
    }

    if (item.hp || item.tp) {
      let add = 'add+';
      if (item.hp) {
        add += ` ${item.hp}hp`;
      }

      if (item.tp) {
        add += ` ${item.tp}tp`;
      }

      meta.push(add);
    }

    if (item.accuracy || item.evade || item.armor) {
      let def = 'def+';
      if (item.accuracy) {
        def += ` ${item.accuracy}acc`;
      }

      if (item.evade) {
        def += ` ${item.evade}eva`;
      }

      if (item.armor) {
        def += ` ${item.armor}arm`;
      }
      meta.push(def);
    }

    if (item.str || item.intl || item.wis || item.agi || item.cha || item.con) {
      let stat = 'stat+';

      if (item.str) {
        stat += ` ${item.str}str`;
      }

      if (item.intl) {
        stat += ` ${item.intl}int`;
      }

      if (item.wis) {
        stat += ` ${item.wis}wis`;
      }

      if (item.agi) {
        stat += ` ${item.agi}agi`;
      }

      if (item.cha) {
        stat += ` ${item.cha}cha`;
      }

      if (item.con) {
        stat += ` ${item.con}con`;
      }

      meta.push(stat);
    }
  }

  if (
    item.levelRequirement ||
    item.classRequirement ||
    item.strRequirement ||
    item.intRequirement ||
    item.wisRequirement ||
    item.agiRequirement ||
    item.chaRequirement ||
    item.conRequirement
  ) {
    let req = 'req:';

    if (item.levelRequirement) {
      req += ` ${item.levelRequirement}LVL`;
    }

    if (item.classRequirement) {
      // TODO: Load class name
      req += ` Class ${item.classRequirement}`;
    }

    if (item.strRequirement) {
      req += ` ${item.strRequirement}str`;
    }

    if (item.intRequirement) {
      req += ` ${item.intRequirement}int`;
    }

    if (item.wisRequirement) {
      req += ` ${item.wisRequirement}wis`;
    }

    if (item.agiRequirement) {
      req += ` ${item.agiRequirement}agi`;
    }

    if (item.chaRequirement) {
      req += ` ${item.chaRequirement}cha`;
    }

    if (item.conRequirement) {
      req += ` ${item.conRequirement}con`;
    }

    meta.push(req);
  }

  return meta;
}
