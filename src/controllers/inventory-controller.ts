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
import { EOResourceID } from '@/edf';
import { EquipmentSlot, getEquipmentSlotForItemType } from '@/equipment';
import type { Vector2 } from '@/vector';

export class InventoryController {
  private client: Client;
  equipmentSwap: {
    slot: EquipmentSlot;
    itemId: number;
  } | null = null;

  constructor(client: Client) {
    this.client = client;
  }

  dropItem(id: number, amount: number, coords: Vector2): void {
    const item = this.client.items.find((i) => i.id === id);
    if (!item) {
      return;
    }

    const actualAmount = Math.min(amount, item.amount);
    if (actualAmount) {
      const packet = new ItemDropClientPacket();
      packet.item = new ThreeItem();
      packet.item.id = item.id;
      packet.item.amount = actualAmount;
      packet.coords = new ByteCoords();
      packet.coords.x = coords.x + 1;
      packet.coords.y = coords.y + 1;
      this.client.bus!.send(packet);
    }
  }

  junkItem(id: number, amount: number): void {
    const packet = new ItemJunkClientPacket();
    packet.item = new Item();
    packet.item.id = id;
    packet.item.amount = amount;
    this.client.bus!.send(packet);
  }

  useItem(id: number): void {
    const item = this.client.items.find((i) => i.id === id);
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
      this.client.setStatusLabel(
        EOResourceID.STATUS_LABEL_TYPE_ACTION,
        this.client.getResourceString(
          EOResourceID.STATUS_LABEL_NOTHING_HAPPENED,
        ),
      );
      return;
    }

    const packet = new ItemUseClientPacket();
    packet.itemId = id;
    this.client.bus!.send(packet);
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
    const item = this.client.items.find((i) => i.id === itemId && i.amount > 0);
    if (!item) {
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
      this.client.setStatusLabel(
        EOResourceID.STATUS_LABEL_TYPE_INFORMATION,
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
      this.client.setStatusLabel(
        EOResourceID.STATUS_LABEL_TYPE_INFORMATION,
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
        this.client.setStatusLabel(
          EOResourceID.STATUS_LABEL_TYPE_INFORMATION,
          `${this.client.getResourceString(EOResourceID.STATUS_LABEL_ITEM_EQUIP_THIS_ITEM_REQUIRES)} ${check.req} ${check.label}`,
        );
        return false;
      }
    }

    if (record.levelRequirement > this.client.level) {
      this.client.setStatusLabel(
        EOResourceID.STATUS_LABEL_TYPE_INFORMATION,
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
