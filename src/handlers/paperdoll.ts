import {
  type EoReader,
  Item,
  PacketAction,
  PacketFamily,
  PaperdollAgreeServerPacket,
  PaperdollRemoveServerPacket,
  PaperdollReplyServerPacket,
} from 'eolib';
import {
  type Client,
  EquipmentSlot,
  getEquipmentSlotForItemType,
} from '../client';
import { playSfxById, SfxId } from '../sfx';

function handlePaperdollReply(client: Client, reader: EoReader) {
  const packet = PaperdollReplyServerPacket.deserialize(reader);
  client.emit('openPaperdoll', {
    icon: packet.icon,
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

  const equipment = client.getEquipmentArray();
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

  client.setEquipmentSlot(slot, 0);
  client.emit('equipmentChanged', undefined);

  if (client.isVisisbleEquipmentChange(slot)) {
    client.setNearbyCharacterEquipment(client.playerId, slot, 0);
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

  let item = client.items.find((i) => i.id === packet.itemId);
  if (item) {
    item.amount += 1;
  } else {
    item = new Item();
    item.id = packet.itemId;
    item.amount = 1;
    client.items.push(item);
  }

  playSfxById(SfxId.InventoryPlace);

  client.emit('inventoryChanged', undefined);
}

function handlePaperdollAgree(client: Client, reader: EoReader) {
  const packet = PaperdollAgreeServerPacket.deserialize(reader);
  const record = client.getEifRecordById(packet.itemId);
  if (!record) {
    return;
  }

  const equipment = client.getEquipmentArray();
  const slot = getEquipmentSlotForItemType(record.type, packet.subLoc);
  if (equipment[slot]) {
    return;
  }

  client.setEquipmentSlot(slot, packet.itemId);
  client.emit('equipmentChanged', undefined);

  if (client.isVisisbleEquipmentChange(slot)) {
    client.setNearbyCharacterEquipment(client.playerId, slot, record.spec1);
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

  const item = client.items.find((i) => i.id === packet.itemId);
  if (!item) {
    return;
  }

  if (item.amount > 1) {
    item.amount -= 1;
  } else {
    const index = client.items.indexOf(item);
    if (index > -1) {
      client.items.splice(index, 1);
    }
  }

  client.emit('inventoryChanged', undefined);
}

export function registerPaperdollHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Paperdoll,
    PacketAction.Reply,
    (reader) => handlePaperdollReply(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Paperdoll,
    PacketAction.Remove,
    (reader) => handlePaperdollRemove(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Paperdoll,
    PacketAction.Agree,
    (reader) => handlePaperdollAgree(client, reader),
  );
}
