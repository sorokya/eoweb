import {
  type CharItem,
  Gender,
  ItemType,
  type ShopCraftItem,
  type ShopTradeItem,
} from 'eolib';
import mitt from 'mitt';
import type { Client } from '../client';
import { EOResourceID } from '../edf';
import { playSfxById, SfxId } from '../sfx';
import { Base } from './base-ui';
import { DialogIcon } from './dialog-icon';
import {
  createIconMenuItem,
  createItemMenuItem,
} from './utils/create-menu-item';

enum State {
  Initial = 0,
  Buy = 1,
  Sell = 2,
  Craft = 3,
}

type Events = {
  buyItem: { id: number; name: string; price: number; max: number };
  sellItem: { id: number; name: string; price: number };
  craftItem: {
    id: number;
    name: string;
    ingredients: CharItem[];
  };
};

export class ShopDialog extends Base {
  private client: Client;
  private emitter = mitt<Events>();
  protected container = document.getElementById('shop');
  private dialogs = document.getElementById('dialogs');
  private cover = document.querySelector<HTMLDivElement>('#cover');
  private btnCancel = this.container.querySelector<HTMLButtonElement>(
    'button[data-id="cancel"]',
  );
  private btnBack = this.container.querySelector<HTMLButtonElement>(
    'button[data-id="back"]',
  );
  private txtName = this.container.querySelector<HTMLSpanElement>('.shop-name');
  private itemList = this.container.querySelector<HTMLDivElement>('.item-list');
  private scrollHandle =
    this.container.querySelector<HTMLDivElement>('.scroll-handle');
  private name = '';
  private craftItems: ShopCraftItem[] = [];
  private tradeItems: ShopTradeItem[] = [];
  private state = State.Initial;

  constructor(client: Client) {
    super();
    this.client = client;

    this.btnCancel.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      this.hide();
    });

    this.btnBack.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      this.changeState(State.Initial);
    });

    this.itemList.addEventListener('scroll', () => {
      this.setScrollThumbPosition();
    });

    this.client.on('itemBought', () => {
      this.render();
    });

    this.client.on('itemSold', () => {
      this.render();
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
    const scrollTop = this.itemList.scrollTop;
    const scrollHeight = this.itemList.scrollHeight;
    const clientHeight = this.itemList.clientHeight;
    const scrollPercent = scrollTop / (scrollHeight - clientHeight);
    const clampedPercent = Math.min(Math.max(scrollPercent, 0), 1);
    const top = min + (max - min) * clampedPercent || min;
    this.scrollHandle.style.top = `${top}px`;
  }

  setData(
    name: string,
    craftItems: ShopCraftItem[],
    tradeItems: ShopTradeItem[],
  ) {
    this.name = name;
    this.craftItems = craftItems;
    this.tradeItems = tradeItems;
    this.state = State.Initial;
    this.render();
  }

  show() {
    this.cover.classList.remove('hidden');
    this.container.classList.remove('hidden');
    this.dialogs.classList.remove('hidden');
    this.client.typing = true;
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
    this.txtName.innerText = this.name;
    this.btnBack.classList.add('hidden');

    switch (this.state) {
      case State.Initial:
        this.renderInitial();
        return;
      case State.Buy:
        this.renderBuy();
        return;
      case State.Sell:
        this.renderSell();
        return;
      case State.Craft:
        this.renderCraft();
        return;
    }
  }

  private changeState(state: State) {
    this.state = state;
    this.render();
  }

  private renderInitial() {
    this.itemList.innerHTML = '';

    const buys = this.tradeItems.filter((i) => i.buyPrice > 0);
    if (buys.length) {
      const item = createIconMenuItem(
        DialogIcon.Buy,
        this.client.getResourceString(EOResourceID.DIALOG_SHOP_BUY_ITEMS),
        `${buys.length} ${this.client.getResourceString(EOResourceID.DIALOG_SHOP_ITEMS_IN_STORE)}`,
      );
      const click = () => {
        this.changeState(State.Buy);
      };
      item.addEventListener('click', click);
      item.addEventListener('contextmenu', click);
      this.itemList.appendChild(item);
    }

    const sells = this.tradeItems.filter(
      (i) =>
        i.sellPrice > 0 && this.client.items.some((i2) => i2.id === i.itemId),
    );
    if (sells.length) {
      const item = createIconMenuItem(
        DialogIcon.Sell,
        this.client.getResourceString(EOResourceID.DIALOG_SHOP_SELL_ITEMS),
        `${sells.length} ${this.client.getResourceString(EOResourceID.DIALOG_SHOP_ITEMS_ACCEPTED)}`,
      );
      const click = () => {
        this.changeState(State.Sell);
      };
      item.addEventListener('click', click);
      item.addEventListener('contextmenu', click);
      this.itemList.appendChild(item);
    }

    if (this.craftItems.length) {
      const item = createIconMenuItem(
        DialogIcon.Craft,
        this.client.getResourceString(EOResourceID.DIALOG_SHOP_CRAFT_ITEMS),
        `${this.craftItems.length} ${this.client.getResourceString(EOResourceID.DIALOG_SHOP_ITEMS_ACCEPTED)}`,
      );
      const click = () => {
        this.changeState(State.Craft);
      };
      item.addEventListener('click', click);
      item.addEventListener('contextmenu', click);
      this.itemList.appendChild(item);
    }
  }

  renderBuy() {
    this.itemList.innerHTML = '';
    this.btnBack.classList.remove('hidden');
    const buys = this.tradeItems.filter((i) => i.buyPrice > 0);
    for (const buy of buys) {
      const record = this.client.getEifRecordById(buy.itemId);
      if (!record) {
        continue;
      }

      const item = createItemMenuItem(
        buy.itemId,
        record,
        record.name,
        `${this.client.getResourceString(EOResourceID.DIALOG_SHOP_PRICE)}: ${buy.buyPrice} ${record.type === ItemType.Armor ? `(${record.spec2 === Gender.Female ? this.client.getResourceString(EOResourceID.FEMALE) : this.client.getResourceString(EOResourceID.MALE)})` : ''}`,
      );
      const click = () => {
        this.emitter.emit('buyItem', {
          id: buy.itemId,
          name: record.name,
          price: buy.buyPrice,
          max: buy.maxBuyAmount,
        });
      };
      item.addEventListener('click', click);
      item.addEventListener('contextmenu', click);
      this.itemList.appendChild(item);
    }
  }

  renderSell() {
    this.itemList.innerHTML = '';
    this.btnBack.classList.remove('hidden');
    const sells = this.tradeItems.filter(
      (i) =>
        i.sellPrice > 0 && this.client.items.some((i2) => i2.id === i.itemId),
    );

    if (!sells.length) {
      this.changeState(State.Initial);
      return;
    }

    for (const sell of sells) {
      const record = this.client.getEifRecordById(sell.itemId);
      if (!record) {
        continue;
      }

      const item = createItemMenuItem(
        sell.itemId,
        record,
        record.name,
        `${this.client.getResourceString(EOResourceID.DIALOG_SHOP_PRICE)}: ${sell.sellPrice} ${record.type === ItemType.Armor ? `(${record.spec2 === Gender.Female ? this.client.getResourceString(EOResourceID.FEMALE) : this.client.getResourceString(EOResourceID.MALE)})` : ''}`,
      );
      const click = () => {
        this.emitter.emit('sellItem', {
          id: sell.itemId,
          name: record.name,
          price: sell.sellPrice,
        });
      };
      item.addEventListener('click', click);
      item.addEventListener('contextmenu', click);
      this.itemList.appendChild(item);
    }
  }

  renderCraft() {
    this.itemList.innerHTML = '';
    this.btnBack.classList.remove('hidden');
    for (const craft of this.craftItems) {
      const record = this.client.getEifRecordById(craft.itemId);
      if (!record) {
        continue;
      }

      const item = createItemMenuItem(
        craft.itemId,
        record,
        record.name,
        `${this.client.getResourceString(EOResourceID.DIALOG_SHOP_CRAFT_INGREDIENTS)}: ${craft.ingredients.length} ${record.type === ItemType.Armor ? `(${record.spec2 === Gender.Female ? this.client.getResourceString(EOResourceID.FEMALE) : this.client.getResourceString(EOResourceID.MALE)})` : ''}`,
      );
      const click = () => {
        this.emitter.emit('craftItem', {
          id: craft.itemId,
          name: record.name,
          ingredients: craft.ingredients,
        });
      };
      item.addEventListener('click', click);
      item.addEventListener('contextmenu', click);
      this.itemList.appendChild(item);
    }
  }
}
