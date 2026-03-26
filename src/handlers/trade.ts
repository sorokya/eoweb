import {
  type EoReader,
  PacketAction,
  PacketFamily,
  TradeAdminServerPacket,
  TradeAgreeServerPacket,
  TradeCloseServerPacket,
  TradeOpenServerPacket,
  TradeReplyServerPacket,
  TradeRequestServerPacket,
  TradeSpecServerPacket,
  TradeUseServerPacket,
} from 'eolib';
import type { Client } from '../client';
import { playSfxById, SfxId } from '../sfx';

function handleTradeRequest(client: Client, reader: EoReader) {
  const packet = TradeRequestServerPacket.deserialize(reader);
  client.emit('tradeRequested', {
    playerId: packet.partnerPlayerId,
    playerName: packet.partnerPlayerName,
  });
}

function handleTradeOpen(client: Client, reader: EoReader) {
  const packet = TradeOpenServerPacket.deserialize(reader);
  client.emit('tradeOpened', {
    partnerPlayerId: packet.partnerPlayerId,
    partnerPlayerName: packet.partnerPlayerName,
    localPlayerId: packet.yourPlayerId,
    localPlayerName: packet.yourPlayerName,
  });
}

function handleTradeReply(client: Client, reader: EoReader) {
  const packet = TradeReplyServerPacket.deserialize(reader);
  client.emit('tradeUpdated', { tradeData: packet.tradeData });
}

function handleTradeAdmin(client: Client, reader: EoReader) {
  const packet = TradeAdminServerPacket.deserialize(reader);
  client.emit('tradeUpdated', { tradeData: packet.tradeData });
}

function handleTradeAgree(client: Client, reader: EoReader) {
  const packet = TradeAgreeServerPacket.deserialize(reader);
  client.emit('tradePartnerAgree', {
    playerId: packet.partnerPlayerId,
    agree: packet.agree,
  });
}

function handleTradeSpec(client: Client, reader: EoReader) {
  const packet = TradeSpecServerPacket.deserialize(reader);
  client.emit('tradeOwnAgree', { agree: packet.agree });
}

function handleTradeUse(client: Client, reader: EoReader) {
  const packet = TradeUseServerPacket.deserialize(reader);
  // tradeData[0] contains items we receive from partner
  // tradeData[1] contains items we gave to partner
  const receivedItems = packet.tradeData[0];
  const givenItems = packet.tradeData[1];

  // Remove items we gave away
  if (givenItems) {
    for (const item of givenItems.items) {
      const existing = client.items.find((i) => i.id === item.id);
      if (existing) {
        existing.amount -= item.amount;
        if (existing.amount <= 0) {
          const idx = client.items.indexOf(existing);
          if (idx >= 0) client.items.splice(idx, 1);
        }
      }
    }
  }

  // Add items we received
  if (receivedItems) {
    for (const item of receivedItems.items) {
      const existing = client.items.find((i) => i.id === item.id);
      if (existing) {
        existing.amount += item.amount;
      } else {
        client.items.push(item);
      }
    }
  }

  client.emit('inventoryChanged', undefined);
  client.emit('tradeCompleted', undefined);
  playSfxById(SfxId.BuySell);
}

function handleTradeClose(client: Client, reader: EoReader) {
  const packet = TradeCloseServerPacket.deserialize(reader);
  client.emit('tradeCancelled', { playerId: packet.partnerPlayerId });
}

export function registerTradeHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Trade,
    PacketAction.Request,
    (reader) => handleTradeRequest(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Trade,
    PacketAction.Open,
    (reader) => handleTradeOpen(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Trade,
    PacketAction.Reply,
    (reader) => handleTradeReply(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Trade,
    PacketAction.Admin,
    (reader) => handleTradeAdmin(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Trade,
    PacketAction.Agree,
    (reader) => handleTradeAgree(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Trade,
    PacketAction.Spec,
    (reader) => handleTradeSpec(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Trade,
    PacketAction.Use,
    (reader) => handleTradeUse(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Trade,
    PacketAction.Close,
    (reader) => handleTradeClose(client, reader),
  );
}
