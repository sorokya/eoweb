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

import type { Client } from '../client';
import { EOResourceID } from '../edf';
import { EquipmentSlot, getEquipmentSlotForItemType } from '../types';
import type { Vector2 } from '../vector';

export function dropItem(
  client: Client,
  id: number,
  amount: number,
  coords: Vector2,
): void {
  const item = client.items.find((i) => i.id === id);
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
    client.bus!.send(packet);
  }
}

export function junkItem(client: Client, id: number, amount: number): void {
  const packet = new ItemJunkClientPacket();
  packet.item = new Item();
  packet.item.id = id;
  packet.item.amount = amount;
  client.bus!.send(packet);
}

export function useItem(client: Client, id: number): void {
  const item = client.items.find((i) => i.id === id);
  if (!item) {
    return;
  }

  const record = client.getEifRecordById(id);
  if (!record) {
    return;
  }

  let slot = getEquipmentSlotForItemType(record.type);
  if (typeof slot === 'number') {
    const equipment = getEquipmentArray(client);
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

    equipItem(client, slot, item.id);
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

  if (record.type === ItemType.Teleport && !client.map!.canScroll) {
    client.setStatusLabel(
      EOResourceID.STATUS_LABEL_TYPE_ACTION,
      client.getResourceString(EOResourceID.STATUS_LABEL_NOTHING_HAPPENED)!,
    );
    return;
  }

  const packet = new ItemUseClientPacket();
  packet.itemId = id;
  client.bus!.send(packet);
}

export function getEquipmentArray(client: Client): number[] {
  return [
    client.equipment.boots,
    client.equipment.accessory,
    client.equipment.gloves,
    client.equipment.belt,
    client.equipment.armor,
    client.equipment.necklace,
    client.equipment.hat,
    client.equipment.shield,
    client.equipment.weapon,
    client.equipment.ring[0],
    client.equipment.ring[1],
    client.equipment.armlet[0],
    client.equipment.armlet[1],
    client.equipment.bracer[0],
    client.equipment.bracer[1],
  ];
}

export function unequipItem(client: Client, slot: EquipmentSlot): void {
  const equipment = getEquipmentArray(client);
  if (!equipment[slot]) {
    return;
  }

  const itemId = equipment[slot];

  const record = client.getEifRecordById(itemId);
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

  client.bus!.send(packet);
}

export function equipItem(
  client: Client,
  slot: EquipmentSlot,
  itemId: number,
): boolean {
  const item = client.items.find((i) => i.id === itemId && i.amount > 0);
  if (!item) {
    return false;
  }

  const equipment = getEquipmentArray(client);
  if (equipment[slot]) {
    if (equipment[slot] === itemId) {
      return false;
    }

    client.equipmentSwap = {
      slot,
      itemId,
    };
    unequipItem(client, slot);
    return false;
  }

  const character = client.getPlayerCharacter();
  if (!character) {
    return false;
  }

  const record = client.getEifRecordById(item.id);
  if (!record) {
    return false;
  }

  if (record.type === ItemType.Armor && record.spec2 !== character.gender) {
    client.setStatusLabel(
      EOResourceID.STATUS_LABEL_TYPE_INFORMATION,
      client.getResourceString(
        EOResourceID.STATUS_LABEL_ITEM_EQUIP_DOES_NOT_FIT_GENDER,
      ) ?? '',
    );
    return false;
  }

  if (record.classRequirement && record.classRequirement !== client.classId) {
    const classRecord = client.getEcfRecordById(record.classRequirement);
    client.setStatusLabel(
      EOResourceID.STATUS_LABEL_TYPE_INFORMATION,
      `${client.getResourceString(EOResourceID.STATUS_LABEL_ITEM_EQUIP_CAN_ONLY_BE_USED_BY)} ${classRecord?.name || 'Unknown'}`,
    );
    return false;
  }

  const statChecks = [
    { req: record.strRequirement, stat: client.baseStats.str, label: 'STR' },
    { req: record.intRequirement, stat: client.baseStats.intl, label: 'INT' },
    { req: record.wisRequirement, stat: client.baseStats.wis, label: 'WIS' },
    { req: record.agiRequirement, stat: client.baseStats.agi, label: 'AGI' },
    { req: record.chaRequirement, stat: client.baseStats.cha, label: 'CHA' },
    { req: record.conRequirement, stat: client.baseStats.con, label: 'CON' },
  ];

  for (const check of statChecks) {
    if (check.req > check.stat) {
      client.setStatusLabel(
        EOResourceID.STATUS_LABEL_TYPE_INFORMATION,
        `${client.getResourceString(EOResourceID.STATUS_LABEL_ITEM_EQUIP_THIS_ITEM_REQUIRES)} ${check.req} ${check.label}`,
      );
      return false;
    }
  }

  if (record.levelRequirement > client.level) {
    client.setStatusLabel(
      EOResourceID.STATUS_LABEL_TYPE_INFORMATION,
      `${client.getResourceString(EOResourceID.STATUS_LABEL_ITEM_EQUIP_THIS_ITEM_REQUIRES)} LVL ${record.levelRequirement}`,
    );
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

  client.bus!.send(packet);
  return true;
}

export function isVisibleEquipmentChange(slot: EquipmentSlot): boolean {
  return [
    EquipmentSlot.Boots,
    EquipmentSlot.Armor,
    EquipmentSlot.Hat,
    EquipmentSlot.Shield,
    EquipmentSlot.Weapon,
  ].includes(slot);
}

export function setEquipmentSlot(
  client: Client,
  slot: EquipmentSlot,
  itemId: number,
): void {
  switch (slot) {
    case EquipmentSlot.Accessory:
      client.equipment.accessory = itemId;
      break;
    case EquipmentSlot.Armlet1:
      client.equipment.armlet[0] = itemId;
      break;
    case EquipmentSlot.Armlet2:
      client.equipment.armlet[1] = itemId;
      break;
    case EquipmentSlot.Armor:
      client.equipment.armor = itemId;
      break;
    case EquipmentSlot.Belt:
      client.equipment.belt = itemId;
      break;
    case EquipmentSlot.Boots:
      client.equipment.boots = itemId;
      break;
    case EquipmentSlot.Bracer1:
      client.equipment.bracer[0] = itemId;
      break;
    case EquipmentSlot.Bracer2:
      client.equipment.bracer[1] = itemId;
      break;
    case EquipmentSlot.Gloves:
      client.equipment.gloves = itemId;
      break;
    case EquipmentSlot.Hat:
      client.equipment.hat = itemId;
      break;
    case EquipmentSlot.Necklace:
      client.equipment.necklace = itemId;
      break;
    case EquipmentSlot.Ring1:
      client.equipment.ring[0] = itemId;
      break;
    case EquipmentSlot.Ring2:
      client.equipment.ring[1] = itemId;
      break;
    case EquipmentSlot.Shield:
      client.equipment.shield = itemId;
      break;
    case EquipmentSlot.Weapon:
      client.equipment.weapon = itemId;
      break;
  }
}

export function setNearbyCharacterEquipment(
  client: Client,
  playerId: number,
  slot: EquipmentSlot,
  graphicId: number,
): void {
  const character = client.getCharacterById(playerId);
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

  client.atlas.refresh();
}
