import {
  ByteCoords,
  Item,
  ItemDropClientPacket,
  ItemJunkClientPacket,
  ItemSpecial,
  ItemType,
  ItemUseClientPacket,
  PaperdollAddClientPacket,
  PaperdollRemoveClientPacket,
  ThreeItem,
} from 'eolib';

import type { Client } from '@/client';
import { GOLD_ITEM_ID } from '@/consts';
import { DialogResourceID, EOResourceID } from '@/edf';
import { EquipmentSlot, getEquipmentSlotForItemType } from '@/equipment';
import type { Vector2 } from '@/vector';

export class InventoryController {
  private client: Client;
  private _items: Item[];

  private inventoryChangedSubscribers: (() => void)[] = [];
  private inventoryChangeDebounce: number | null = null;

  private inventoryUpdated(): void {
    if (this.inventoryChangeDebounce) {
      clearTimeout(this.inventoryChangeDebounce);
    }
    this.inventoryChangeDebounce = setTimeout(() => {
      for (const cb of this.inventoryChangedSubscribers) cb();
      this.client.questController.refreshQuestProgress();
      this.inventoryChangeDebounce = null;
    }, 100);
  }

  subscribeInventoryChanged(cb: () => void): void {
    this.inventoryChangedSubscribers.push(cb);
  }

  unsubscribeInventoryChanged(cb: () => void): void {
    this.inventoryChangedSubscribers = this.inventoryChangedSubscribers.filter(
      (s) => s !== cb,
    );
  }

  get items(): Item[] {
    return this._items;
  }

  set items(items: Item[]) {
    this._items = items;
    if (!this._items.some((i) => i.id === GOLD_ITEM_ID)) {
      const gold = new Item();
      gold.id = GOLD_ITEM_ID;
      gold.amount = 0;
      this._items.push(gold);
    }
  }

  equipmentSwap: {
    slot: EquipmentSlot;
    itemId: number;
  } | null = null;

  constructor(client: Client) {
    this.client = client;
    this._items = [];
  }

  getItemById(id: number): Item | undefined {
    return this._items.find((i) => i.id === id);
  }

  get goldAmount(): number {
    return this.getItemAmount(GOLD_ITEM_ID);
  }

  getItemAmount(id: number): number {
    const item = this.getItemById(id);
    return item ? item.amount : 0;
  }

  addItem(id: number, amount = 1): void {
    const existing = this.getItemById(id);
    if (existing) {
      existing.amount += amount;
    } else {
      const item = new Item();
      item.id = id;
      item.amount = amount;
      this._items.push(item);
    }

    this.inventoryUpdated();
  }

  setItem(id: number, amount: number): void {
    if (!amount && id !== GOLD_ITEM_ID) {
      this._items = this._items.filter((i) => i.id !== id);
    } else {
      const existing = this.getItemById(id);
      if (existing) {
        existing.amount = amount;
      } else {
        const item = new Item();
        item.id = id;
        item.amount = amount;
        this._items.push(item);
      }
    }

    this.inventoryUpdated();
  }

  removeItem(id: number, amount: number | undefined = undefined): void {
    const existing = this.getItemById(id);
    if (!existing) {
      return;
    }

    if (
      id !== GOLD_ITEM_ID &&
      (amount === undefined || existing.amount <= amount)
    ) {
      this._items = this._items.filter((i) => i.id !== id);
    } else if (amount !== undefined) {
      existing.amount -= amount;
    }

    this.inventoryUpdated();
  }

  dropItem(id: number, coords: Vector2): void {
    const item = this.getItemById(id);
    if (!item) {
      return;
    }

    const send = (amount: number) => {
      const actualAmount = Math.min(amount, item.amount);
      if (actualAmount <= 0) return;
      const packet = new ItemDropClientPacket();
      packet.item = new ThreeItem();
      packet.item.id = item.id;
      packet.item.amount = actualAmount;
      packet.coords = new ByteCoords();
      packet.coords.x = coords.x + 1;
      packet.coords.y = coords.y + 1;
      this.client.bus!.send(packet);
    };

    if (item.amount > 1) {
      const title = this.client.getResourceString(
        EOResourceID.DIALOG_TRANSFER_HOW_MUCH,
      );
      const itemName = this.client.getEifRecordById(id)?.name ?? '';
      const actionLabel = this.client.getResourceString(
        EOResourceID.DIALOG_TRANSFER_DROP,
      );
      this.client.alertController.showAmount(
        title,
        itemName,
        item.amount,
        actionLabel,
        (amount) => {
          if (amount !== null && amount > 0) {
            send(amount);
          }
        },
      );
    } else {
      send(1);
    }
  }

  junkItem(id: number): void {
    const item = this.getItemById(id);
    if (!item) return;

    const send = (amount: number) => {
      const packet = new ItemJunkClientPacket();
      packet.item = new Item();
      packet.item.id = id;
      packet.item.amount = amount;
      this.client.bus!.send(packet);
    };

    const itemName = this.client.getEifRecordById(id)?.name ?? '';

    if (item.amount > 1) {
      const title = this.client.getResourceString(
        EOResourceID.DIALOG_TRANSFER_HOW_MUCH,
      );
      const actionLabel = this.client.getResourceString(
        EOResourceID.DIALOG_TRANSFER_JUNK,
      );
      this.client.alertController.showAmount(
        title,
        itemName,
        item.amount,
        actionLabel,
        (amount) => {
          if (amount !== null && amount > 0) send(amount);
        },
      );
    } else {
      const message = this.client.locale.junkConfirmMessage.replace(
        '{name}',
        itemName,
      );
      this.client.alertController.showConfirm(
        this.client.locale.junkConfirmTitle,
        message,
        (confirmed) => {
          if (confirmed) send(1);
        },
      );
    }
  }

  useItem(id: number): void {
    const item = this.getItemById(id);
    if (!item) {
      return;
    }

    const record = this.client.getEifRecordById(id);
    if (!record) {
      return;
    }

    let slot = getEquipmentSlotForItemType(record.type);
    if (typeof slot === 'number') {
      const equipment = this.getEquipmentArray();
      if (
        equipment[slot] &&
        [
          EquipmentSlot.Ring1,
          EquipmentSlot.Armlet1,
          EquipmentSlot.Bracer1,
        ].includes(slot)
      ) {
        slot++;
      }

      this.equipItem(slot, item.id);
      return;
    }

    if (
      ![
        ItemType.Heal,
        ItemType.Teleport,
        ItemType.Alcohol,
        ItemType.EffectPotion,
        ItemType.HairDye,
        ItemType.ExpReward,
        ItemType.CureCurse,
      ].includes(record.type)
    ) {
      return;
    }

    if (record.type === ItemType.Teleport && !this.client.map!.canScroll) {
      this.client.toastController.show(
        this.client.getResourceString(
          EOResourceID.STATUS_LABEL_NOTHING_HAPPENED,
        ),
      );
      return;
    }

    const useItem = () => {
      const packet = new ItemUseClientPacket();
      packet.itemId = id;
      this.client.bus!.send(packet);
    };

    if (record.type === ItemType.CureCurse) {
      const strings = this.client.getDialogStrings(
        DialogResourceID.ITEM_CURSE_REMOVE_PROMPT,
      );
      this.client.alertController.showConfirm(
        strings[0],
        strings[1],
        (confirmed) => {
          if (confirmed) {
            useItem();
          }
        },
      );
      return;
    }

    useItem();
  }

  getEquipmentArray(): number[] {
    return [
      this.client.equipment.boots,
      this.client.equipment.accessory,
      this.client.equipment.gloves,
      this.client.equipment.belt,
      this.client.equipment.armor,
      this.client.equipment.necklace,
      this.client.equipment.hat,
      this.client.equipment.shield,
      this.client.equipment.weapon,
      this.client.equipment.ring[0],
      this.client.equipment.ring[1],
      this.client.equipment.armlet[0],
      this.client.equipment.armlet[1],
      this.client.equipment.bracer[0],
      this.client.equipment.bracer[1],
    ];
  }

  unequipItem(slot: EquipmentSlot): void {
    const equipment = this.getEquipmentArray();
    if (!equipment[slot]) {
      return;
    }

    const itemId = equipment[slot];

    const record = this.client.getEifRecordById(itemId);
    if (record!.special! === ItemSpecial.Cursed) {
      const strings = this.client.getDialogStrings(
        DialogResourceID.ITEM_IS_CURSED_ITEM,
      );
      this.client.toastController.showWarning(strings[1]);
      return;
    }

    const packet = new PaperdollRemoveClientPacket();
    packet.itemId = itemId;
    packet.subLoc = 0;

    if (
      [
        EquipmentSlot.Ring2,
        EquipmentSlot.Armlet2,
        EquipmentSlot.Bracer2,
      ].includes(slot)
    ) {
      packet.subLoc = 1;
    }

    this.client.bus!.send(packet);
  }

  equipItem(slot: EquipmentSlot, itemId: number): boolean {
    const item = this.getItemById(itemId);
    if (!item || item.amount <= 0) {
      return false;
    }

    const record = this.client.getEifRecordById(item.id);
    if (!record) {
      return false;
    }

    if (!this.itemTypeValidForSlot(record.type, slot)) {
      return false;
    }

    const character = this.client.getPlayerCharacter();
    if (!character) {
      return false;
    }

    if (record.type === ItemType.Armor && record.spec2 !== character.gender) {
      this.client.toastController.showWarning(
        this.client.getResourceString(
          EOResourceID.STATUS_LABEL_ITEM_EQUIP_DOES_NOT_FIT_GENDER,
        ) ?? '',
      );
      return false;
    }

    if (
      record.classRequirement &&
      record.classRequirement !== this.client.classId
    ) {
      const classRecord = this.client.getEcfRecordById(record.classRequirement);
      this.client.toastController.showWarning(
        `${this.client.getResourceString(EOResourceID.STATUS_LABEL_ITEM_EQUIP_CAN_ONLY_BE_USED_BY)} ${classRecord?.name || 'Unknown'}`,
      );
      return false;
    }

    const statChecks = [
      {
        req: record.strRequirement,
        stat: this.client.baseStats.str,
        label: 'STR',
      },
      {
        req: record.intRequirement,
        stat: this.client.baseStats.intl,
        label: 'INT',
      },
      {
        req: record.wisRequirement,
        stat: this.client.baseStats.wis,
        label: 'WIS',
      },
      {
        req: record.agiRequirement,
        stat: this.client.baseStats.agi,
        label: 'AGI',
      },
      {
        req: record.chaRequirement,
        stat: this.client.baseStats.cha,
        label: 'CHA',
      },
      {
        req: record.conRequirement,
        stat: this.client.baseStats.con,
        label: 'CON',
      },
    ];

    for (const check of statChecks) {
      if (check.req > check.stat) {
        this.client.toastController.showWarning(
          `${this.client.getResourceString(EOResourceID.STATUS_LABEL_ITEM_EQUIP_THIS_ITEM_REQUIRES)} ${check.req} ${check.label}`,
        );
        return false;
      }
    }

    if (record.levelRequirement > this.client.level) {
      this.client.toastController.showWarning(
        `${this.client.getResourceString(EOResourceID.STATUS_LABEL_ITEM_EQUIP_THIS_ITEM_REQUIRES)} LVL ${record.levelRequirement}`,
      );
      return false;
    }

    const equipment = this.getEquipmentArray();
    if (equipment[slot]) {
      if (equipment[slot] === itemId) {
        return false;
      }

      this.equipmentSwap = {
        slot,
        itemId,
      };
      this.unequipItem(slot);
      return false;
    }

    const packet = new PaperdollAddClientPacket();
    packet.itemId = itemId;
    packet.subLoc = 0;

    if (
      [
        EquipmentSlot.Ring2,
        EquipmentSlot.Armlet2,
        EquipmentSlot.Bracer2,
      ].includes(slot)
    ) {
      packet.subLoc = 1;
    }

    this.client.bus!.send(packet);
    return true;
  }

  isVisibleEquipmentChange(slot: EquipmentSlot): boolean {
    return [
      EquipmentSlot.Boots,
      EquipmentSlot.Armor,
      EquipmentSlot.Hat,
      EquipmentSlot.Shield,
      EquipmentSlot.Weapon,
    ].includes(slot);
  }

  itemTypeValidForSlot(itemType: ItemType, slot: EquipmentSlot): boolean {
    switch (slot) {
      case EquipmentSlot.Hat:
        return itemType === ItemType.Hat;
      case EquipmentSlot.Armor:
        return itemType === ItemType.Armor;
      case EquipmentSlot.Weapon:
        return itemType === ItemType.Weapon;
      case EquipmentSlot.Shield:
        return itemType === ItemType.Shield;
      case EquipmentSlot.Boots:
        return itemType === ItemType.Boots;
      case EquipmentSlot.Gloves:
        return itemType === ItemType.Gloves;
      case EquipmentSlot.Belt:
        return itemType === ItemType.Belt;
      case EquipmentSlot.Necklace:
        return itemType === ItemType.Necklace;
      case EquipmentSlot.Accessory:
        return itemType === ItemType.Accessory;
      case EquipmentSlot.Ring1:
      case EquipmentSlot.Ring2:
        return itemType === ItemType.Ring;
      case EquipmentSlot.Armlet1:
      case EquipmentSlot.Armlet2:
        return itemType === ItemType.Armlet;
      case EquipmentSlot.Bracer1:
      case EquipmentSlot.Bracer2:
        return itemType === ItemType.Bracer;
    }
  }

  setEquipmentSlot(slot: EquipmentSlot, itemId: number): void {
    switch (slot) {
      case EquipmentSlot.Accessory:
        this.client.equipment.accessory = itemId;
        break;
      case EquipmentSlot.Armlet1:
        this.client.equipment.armlet[0] = itemId;
        break;
      case EquipmentSlot.Armlet2:
        this.client.equipment.armlet[1] = itemId;
        break;
      case EquipmentSlot.Armor:
        this.client.equipment.armor = itemId;
        break;
      case EquipmentSlot.Belt:
        this.client.equipment.belt = itemId;
        break;
      case EquipmentSlot.Boots:
        this.client.equipment.boots = itemId;
        break;
      case EquipmentSlot.Bracer1:
        this.client.equipment.bracer[0] = itemId;
        break;
      case EquipmentSlot.Bracer2:
        this.client.equipment.bracer[1] = itemId;
        break;
      case EquipmentSlot.Gloves:
        this.client.equipment.gloves = itemId;
        break;
      case EquipmentSlot.Hat:
        this.client.equipment.hat = itemId;
        break;
      case EquipmentSlot.Necklace:
        this.client.equipment.necklace = itemId;
        break;
      case EquipmentSlot.Ring1:
        this.client.equipment.ring[0] = itemId;
        break;
      case EquipmentSlot.Ring2:
        this.client.equipment.ring[1] = itemId;
        break;
      case EquipmentSlot.Shield:
        this.client.equipment.shield = itemId;
        break;
      case EquipmentSlot.Weapon:
        this.client.equipment.weapon = itemId;
        break;
    }
  }

  setNearbyCharacterEquipment(
    playerId: number,
    slot: EquipmentSlot,
    graphicId: number,
  ): void {
    const character = this.client.getCharacterById(playerId);
    if (!character) {
      return;
    }

    switch (slot) {
      case EquipmentSlot.Boots:
        character.equipment.boots = graphicId;
        break;
      case EquipmentSlot.Armor:
        character.equipment.armor = graphicId;
        break;
      case EquipmentSlot.Hat:
        character.equipment.hat = graphicId;
        break;
      case EquipmentSlot.Shield:
        character.equipment.shield = graphicId;
        break;
      case EquipmentSlot.Weapon:
        character.equipment.weapon = graphicId;
        break;
    }

    this.client.atlas.refresh();
  }
}
