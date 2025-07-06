import {
  Emote as EmoteType,
  type EoReader,
  Item,
  ItemAcceptServerPacket,
  ItemAddServerPacket,
  ItemDropServerPacket,
  ItemGetServerPacket,
  ItemJunkServerPacket,
  ItemKickServerPacket,
  ItemMapInfo,
  ItemRemoveServerPacket,
  ItemReplyServerPacket,
  ItemSpecial,
  ItemType,
  PacketAction,
  PacketFamily,
} from 'eolib';
import { ChatTab, type Client, EquipmentSlot } from '../client';
import { EOResourceID } from '../edf';
import { EffectAnimation, EffectTargetCharacter } from '../render/effect';
import { Emote } from '../render/emote';
import { HealthBar } from '../render/health-bar';
import { playSfxById, SfxId } from '../sfx';
import { ChatIcon } from '../ui/chat';

function handleItemAdd(client: Client, reader: EoReader) {
  const packet = ItemAddServerPacket.deserialize(reader);
  const existing = client.nearby.items.find((i) => i.uid === packet.itemIndex);
  if (existing) {
    existing.id = packet.itemId;
    existing.amount = packet.itemAmount;
    existing.coords = packet.coords;
  } else {
    const item = new ItemMapInfo();
    item.uid = packet.itemIndex;
    item.id = packet.itemId;
    item.amount = packet.itemAmount;
    item.coords = packet.coords;
    client.nearby.items.push(item);
  }
}

function handleItemRemove(client: Client, reader: EoReader) {
  const packet = ItemRemoveServerPacket.deserialize(reader);
  client.nearby.items = client.nearby.items.filter(
    (i) => i.uid !== packet.itemIndex,
  );
}

function handleItemGet(client: Client, reader: EoReader) {
  const packet = ItemGetServerPacket.deserialize(reader);
  client.nearby.items = client.nearby.items.filter(
    (i) => i.uid !== packet.takenItemIndex,
  );

  client.weight = packet.weight;

  const existingItem = client.items.find((i) => i.id === packet.takenItem.id);
  if (existingItem) {
    existingItem.amount += packet.takenItem.amount;
  } else {
    const item = new Item();
    item.id = packet.takenItem.id;
    item.amount = packet.takenItem.amount;
    client.items.push(item);
  }

  const record = client.getEifRecordById(packet.takenItem.id);
  client.setStatusLabel(
    EOResourceID.STATUS_LABEL_TYPE_INFORMATION,
    `${client.getResourceString(EOResourceID.STATUS_LABEL_ITEM_PICKUP_YOU_PICKED_UP)} ${packet.takenItem.amount} ${record.name}`,
  );
  client.emit('chat', {
    tab: ChatTab.System,
    icon: ChatIcon.UpArrow,
    message: `${client.getResourceString(EOResourceID.STATUS_LABEL_ITEM_PICKUP_YOU_PICKED_UP)} ${packet.takenItem.amount} ${record.name}`,
  });

  client.emit('inventoryChanged', undefined);
}

function handleItemDrop(client: Client, reader: EoReader) {
  const packet = ItemDropServerPacket.deserialize(reader);
  const mapItem = new ItemMapInfo();
  mapItem.uid = packet.itemIndex;
  mapItem.id = packet.droppedItem.id;
  mapItem.amount = packet.droppedItem.amount;
  mapItem.coords = packet.coords;
  client.nearby.items.push(mapItem);

  client.weight = packet.weight;

  if (packet.remainingAmount) {
    const item = client.items.find((i) => i.id === packet.droppedItem.id);
    if (item) {
      item.amount = packet.remainingAmount;
    }
  } else {
    client.items = client.items.filter((i) => i.id !== packet.droppedItem.id);
  }

  const record = client.getEifRecordById(packet.droppedItem.id);
  client.setStatusLabel(
    EOResourceID.STATUS_LABEL_TYPE_INFORMATION,
    `${client.getResourceString(EOResourceID.STATUS_LABEL_ITEM_DROP_YOU_DROPPED)} ${packet.droppedItem.amount} ${record.name}`,
  );
  client.emit('chat', {
    tab: ChatTab.System,
    icon: ChatIcon.DownArrow,
    message: `${client.getResourceString(EOResourceID.STATUS_LABEL_ITEM_DROP_YOU_DROPPED)} ${packet.droppedItem.amount} ${record.name}`,
  });

  client.emit('inventoryChanged', undefined);
}

function handleItemReply(client: Client, reader: EoReader) {
  const packet = ItemReplyServerPacket.deserialize(reader);

  client.weight = packet.weight;

  if (packet.usedItem.amount) {
    const item = client.items.find((i) => i.id === packet.usedItem.id);
    if (item) {
      item.amount = packet.usedItem.amount;
    }
  } else {
    client.items = client.items.filter((i) => i.id !== packet.usedItem.id);
  }

  client.emit('inventoryChanged', undefined);

  switch (packet.itemType) {
    case ItemType.Heal: {
      const data =
        packet.itemTypeData as ItemReplyServerPacket.ItemTypeDataHeal;
      client.hp = data.hp;
      client.tp = data.tp;
      const percent = (client.hp / client.maxHp) * 100;
      client.characterHealthBars.set(
        client.playerId,
        new HealthBar(percent, 0, data.hpGain),
      );
      client.emit('statsUpdate', undefined);
      break;
    }
    case ItemType.EffectPotion: {
      const data =
        packet.itemTypeData as ItemReplyServerPacket.ItemTypeDataEffectPotion;
      const metadata = client.getEffectMetadata(data.effectId + 1);
      if (metadata.sfx) {
        playSfxById(metadata.sfx);
      }
      client.effects.push(
        new EffectAnimation(
          data.effectId + 1,
          new EffectTargetCharacter(client.playerId),
          metadata,
        ),
      );
      break;
    }
    case ItemType.Alcohol: {
      const record = client.getEifRecordById(packet.usedItem.id);
      if (!record) {
        break;
      }

      client.setStatusLabel(
        EOResourceID.STATUS_LABEL_TYPE_WARNING,
        client.getResourceString(EOResourceID.STATUS_LABEL_ITEM_USE_DRUNK),
      );
      client.drunk = true;
      client.drunkTicks = 100 + record.spec1 * 10;
      client.drunkEmoteTicks = 20;
      break;
    }
    case ItemType.HairDye: {
      const player = client.getPlayerCharacter();
      if (player) {
        const data =
          packet.itemTypeData as ItemReplyServerPacket.ItemTypeDataHairDye;
        player.hairColor = data.hairColor;
      }
      break;
    }
    case ItemType.ExpReward: {
      const data =
        packet.itemTypeData as ItemReplyServerPacket.ItemTypeDataExpReward;
      client.experience = data.experience;
      if (data.levelUp) {
        client.characterEmotes.set(
          client.playerId,
          new Emote(EmoteType.LevelUp),
        );
        playSfxById(SfxId.LevelUp);
        client.level = data.levelUp;
        client.maxHp = data.maxHp;
        client.maxTp = data.maxTp;
        client.maxSp = data.maxSp;
        client.statPoints = data.statPoints;
        client.skillPoints = data.skillPoints;
      }

      client.emit('statsUpdate', undefined);
      break;
    }
    case ItemType.CureCurse: {
      const data =
        packet.itemTypeData as ItemReplyServerPacket.ItemTypeDataCureCurse;
      client.baseStats.str = data.stats.baseStats.str;
      client.baseStats.intl = data.stats.baseStats.intl;
      client.baseStats.wis = data.stats.baseStats.wis;
      client.baseStats.agi = data.stats.baseStats.agi;
      client.baseStats.cha = data.stats.baseStats.cha;
      client.baseStats.con = data.stats.baseStats.con;
      client.secondaryStats.accuracy = data.stats.secondaryStats.accuracy;
      client.secondaryStats.armor = data.stats.secondaryStats.armor;
      client.secondaryStats.evade = data.stats.secondaryStats.evade;
      client.secondaryStats.minDamage = data.stats.secondaryStats.minDamage;
      client.secondaryStats.maxDamage = data.stats.secondaryStats.maxDamage;
      client.maxHp = data.stats.maxHp;
      client.maxTp = data.stats.maxTp;
      client.hp = Math.min(client.hp, client.maxHp);
      client.tp = Math.min(client.tp, client.maxTp);
      client.emit('statsUpdate', undefined);

      const cursedEquipmentSlots: EquipmentSlot[] = [];
      const equipmentArray = client.getEquipmentArray();
      equipmentArray.forEach((id, index) => {
        const record = client.getEifRecordById(id);
        if (record && record.special === ItemSpecial.Cursed) {
          cursedEquipmentSlots.push(index);
        }
      });

      const player = client.getPlayerCharacter();
      if (!player) {
        break;
      }

      for (const slot of cursedEquipmentSlots) {
        switch (slot) {
          case EquipmentSlot.Boots: {
            client.equipment.boots = 0;
            player.equipment.boots = 0;
            break;
          }
          case EquipmentSlot.Accessory:
            client.equipment.accessory = 0;
            break;
          case EquipmentSlot.Gloves:
            client.equipment.boots = 0;
            break;
          case EquipmentSlot.Belt:
            client.equipment.boots = 0;
            break;
          case EquipmentSlot.Armor: {
            client.equipment.armor = 0;
            player.equipment.armor = 0;
            break;
          }
          case EquipmentSlot.Necklace:
            client.equipment.necklace = 0;
            break;
          case EquipmentSlot.Hat: {
            client.equipment.hat = 0;
            player.equipment.hat = 0;
            break;
          }
          case EquipmentSlot.Shield: {
            client.equipment.shield = 0;
            player.equipment.shield = 0;
            break;
          }
          case EquipmentSlot.Weapon: {
            client.equipment.weapon = 0;
            player.equipment.weapon = 0;
            break;
          }
          case EquipmentSlot.Ring1:
            client.equipment.ring[0] = 0;
            break;
          case EquipmentSlot.Ring2:
            client.equipment.ring[1] = 0;
            break;
          case EquipmentSlot.Armlet1:
            client.equipment.armlet[0] = 0;
            break;
          case EquipmentSlot.Armlet2:
            client.equipment.armlet[1] = 0;
            break;
          case EquipmentSlot.Bracer1:
            client.equipment.bracer[0] = 0;
            break;
          case EquipmentSlot.Bracer2:
            client.equipment.bracer[1] = 0;
            break;
        }
      }

      break;
    }
  }
}

function handleItemKick(client: Client, reader: EoReader) {
  const packet = ItemKickServerPacket.deserialize(reader);
  client.weight.current = packet.currentWeight;

  if (packet.item.amount) {
    const item = client.items.find((i) => i.id === packet.item.id);
    if (item) {
      item.amount = packet.item.amount;
    }
  } else {
    client.items = client.items.filter((i) => i.id !== packet.item.id);
  }

  client.emit('inventoryChanged', undefined);
}

function handleItemAccept(client: Client, reader: EoReader) {
  const packet = ItemAcceptServerPacket.deserialize(reader);
  const character = client.getCharacterById(packet.playerId);
  if (!character) {
    return;
  }

  client.characterEmotes.set(packet.playerId, new Emote(EmoteType.LevelUp));
  playSfxById(SfxId.LevelUp);
}

function handleItemJunk(client: Client, reader: EoReader) {
  const packet = ItemJunkServerPacket.deserialize(reader);
  client.weight.current = packet.weight.current;

  if (packet.remainingAmount) {
    const item = client.items.find((i) => i.id === packet.junkedItem.id);
    if (item) {
      item.amount = packet.remainingAmount;
    }
  } else {
    client.items = client.items.filter((i) => i.id !== packet.junkedItem.id);
  }

  const record = client.getEifRecordById(packet.junkedItem.id);
  client.setStatusLabel(
    EOResourceID.STATUS_LABEL_TYPE_INFORMATION,
    `${client.getResourceString(EOResourceID.STATUS_LABEL_ITEM_JUNK_YOU_JUNKED)} ${packet.junkedItem.amount} ${record.name}`,
  );
  client.emit('chat', {
    tab: ChatTab.System,
    icon: ChatIcon.DownArrow,
    message: `${client.getResourceString(EOResourceID.STATUS_LABEL_ITEM_JUNK_YOU_JUNKED)} ${packet.junkedItem.amount} ${record.name}`,
  });

  client.emit('inventoryChanged', undefined);
}

export function registerItemHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Item,
    PacketAction.Add,
    (reader) => handleItemAdd(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Item,
    PacketAction.Remove,
    (reader) => handleItemRemove(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Item,
    PacketAction.Get,
    (reader) => handleItemGet(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Item,
    PacketAction.Drop,
    (reader) => handleItemDrop(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Item,
    PacketAction.Reply,
    (reader) => handleItemReply(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Item,
    PacketAction.Kick,
    (reader) => handleItemKick(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Item,
    PacketAction.Accept,
    (reader) => handleItemAccept(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Item,
    PacketAction.Junk,
    (reader) => handleItemJunk(client, reader),
  );
}
