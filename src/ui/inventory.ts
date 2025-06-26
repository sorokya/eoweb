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

    this.grid.addEventListener('dragover', (e) => {
      e.preventDefault(); // Necessary to allow drop
    });

    this.grid.addEventListener('drop', (e) => {
      e.preventDefault();
      playSfxById(SfxId.InventoryPlace);
      const itemId = Number(e.dataTransfer?.getData('text/plain'));
      const rect = this.grid.getBoundingClientRect();

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const gridX = Math.floor(mouseX / CELL_SIZE);
      const gridY = Math.floor(mouseY / CELL_SIZE);

      this.tryMoveItem(itemId, gridX, gridY);
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
      const itemId = Number(e.dataTransfer?.getData('text/plain'));
      if (!Number.isNaN(itemId) && itemId > 0) {
        this.emitter.emit('dropItem', itemId);
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
      imgContainer.dataset.itemId = String(item.id);

      imgContainer.addEventListener('dragstart', (e) => {
        playSfxById(SfxId.InventoryPickup);
        e.dataTransfer?.setData('text/plain', String(item.id));
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
