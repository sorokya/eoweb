import {
  BookReplyServerPacket,
  type EoReader,
  PacketAction,
  PacketFamily,
  PaperdollAgreeServerPacket,
  PaperdollRemoveServerPacket,
  PaperdollReplyServerPacket,
} from 'eolib';
import type { Client } from '@/client';
import { EquipmentSlot, getEquipmentSlotForItemType } from '@/equipment';
import { playSfxById, SfxId } from '@/sfx';

function handlePaperdollReply(client: Client, reader: EoReader) {
  const packet = PaperdollReplyServerPacket.deserialize(reader);

  client.socialController.notifyPaperdollOpened({
    details: packet.details,
    equipment: packet.equipment,
  });
}

function handlePaperdollRemove(client: Client, reader: EoReader) {
  const packet = PaperdollRemoveServerPacket.deserialize(reader);
  const record = client.getEifRecordById(packet.itemId);
  if (!record) {
    return;
  }

  const equipment = client.inventoryController.getEquipmentArray();
  let slot = equipment.indexOf(packet.itemId);
  if (slot === -1) {
    return;
  }

  if (
    packet.subLoc &&
    [
      EquipmentSlot.Armlet1,
      EquipmentSlot.Ring1,
      EquipmentSlot.Bracer1,
    ].includes(slot)
  ) {
    slot += 1;
  }

  if (equipment[slot] !== packet.itemId) {
    return;
  }

  client.inventoryController.setEquipmentSlot(slot, 0);
  client.emit('equipmentChanged', undefined);

  const isVisibleChange =
    client.inventoryController.isVisibleEquipmentChange(slot);
  if (isVisibleChange && !client.inventoryController.equipmentSwap) {
    client.inventoryController.setNearbyCharacterEquipment(
      client.playerId,
      slot,
      0,
    );
  }

  client.baseStats.str = packet.stats.baseStats.str;
  client.baseStats.intl = packet.stats.baseStats.intl;
  client.baseStats.wis = packet.stats.baseStats.wis;
  client.baseStats.agi = packet.stats.baseStats.agi;
  client.baseStats.cha = packet.stats.baseStats.cha;
  client.baseStats.con = packet.stats.baseStats.con;
  client.secondaryStats.accuracy = packet.stats.secondaryStats.accuracy;
  client.secondaryStats.armor = packet.stats.secondaryStats.armor;
  client.secondaryStats.evade = packet.stats.secondaryStats.evade;
  client.secondaryStats.minDamage = packet.stats.secondaryStats.minDamage;
  client.secondaryStats.maxDamage = packet.stats.secondaryStats.maxDamage;
  client.maxHp = packet.stats.maxHp;
  client.maxTp = packet.stats.maxTp;
  client.hp = Math.min(client.hp, client.maxHp);
  client.tp = Math.min(client.tp, client.maxTp);
  client.emit('statsUpdate', undefined);

  client.inventoryController.addItem(packet.itemId, 1);

  if (client.inventoryController.equipmentSwap) {
    if (
      !client.inventoryController.equipItem(
        client.inventoryController.equipmentSwap.slot,
        client.inventoryController.equipmentSwap.itemId,
      ) &&
      isVisibleChange
    ) {
      client.inventoryController.setNearbyCharacterEquipment(
        client.playerId,
        slot,
        0,
      );
    }
    client.inventoryController.equipmentSwap = null;
  } else {
    playSfxById(SfxId.InventoryPlace);
  }
}

function handlePaperdollAgree(client: Client, reader: EoReader) {
  const packet = PaperdollAgreeServerPacket.deserialize(reader);
  const record = client.getEifRecordById(packet.itemId);
  if (!record) {
    return;
  }

  const equipment = client.inventoryController.getEquipmentArray();
  const slot = getEquipmentSlotForItemType(record.type, packet.subLoc);
  if (equipment[slot!]) {
    return;
  }

  client.inventoryController.setEquipmentSlot(slot!, packet.itemId);
  client.emit('equipmentChanged', undefined);

  if (client.inventoryController.isVisibleEquipmentChange(slot!)) {
    client.inventoryController.setNearbyCharacterEquipment(
      client.playerId,
      slot!,
      record.spec1,
    );
  }

  client.baseStats.str = packet.stats.baseStats.str;
  client.baseStats.intl = packet.stats.baseStats.intl;
  client.baseStats.wis = packet.stats.baseStats.wis;
  client.baseStats.agi = packet.stats.baseStats.agi;
  client.baseStats.cha = packet.stats.baseStats.cha;
  client.baseStats.con = packet.stats.baseStats.con;
  client.secondaryStats.accuracy = packet.stats.secondaryStats.accuracy;
  client.secondaryStats.armor = packet.stats.secondaryStats.armor;
  client.secondaryStats.evade = packet.stats.secondaryStats.evade;
  client.secondaryStats.minDamage = packet.stats.secondaryStats.minDamage;
  client.secondaryStats.maxDamage = packet.stats.secondaryStats.maxDamage;
  client.maxHp = packet.stats.maxHp;
  client.maxTp = packet.stats.maxTp;
  client.hp = Math.min(client.hp, client.maxHp);
  client.tp = Math.min(client.tp, client.maxTp);
  client.emit('statsUpdate', undefined);

  client.inventoryController.removeItem(packet.itemId, 1);
  playSfxById(SfxId.InventoryPlace);
}

function handleBookReply(client: Client, reader: EoReader) {
  const packet = BookReplyServerPacket.deserialize(reader);
  client.questController.handleBookOpened(packet.questNames);
  client.socialController.notifyBookOpened(packet.details);
}

export function registerPaperdollHandlers(client: Client) {
  client.bus!.registerPacketHandler(
    PacketFamily.Paperdoll,
    PacketAction.Reply,
    (reader) => handlePaperdollReply(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Paperdoll,
    PacketAction.Remove,
    (reader) => handlePaperdollRemove(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Paperdoll,
    PacketAction.Agree,
    (reader) => handlePaperdollAgree(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Book,
    PacketAction.Reply,
    (reader) => handleBookReply(client, reader),
  );
}
