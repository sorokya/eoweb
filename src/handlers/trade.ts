import {
  type EoReader,
  PacketAction,
  PacketFamily,
  TradeAdminServerPacket,
  TradeAgreeServerPacket,
  TradeOpenServerPacket,
  TradeReplyServerPacket,
  TradeRequestServerPacket,
  TradeSpecServerPacket,
  TradeUseServerPacket,
} from 'eolib';
import type { Client } from '@/client';

function handleTradeRequest(client: Client, reader: EoReader) {
  const packet = TradeRequestServerPacket.deserialize(reader);
  client.tradeController.setTradeRequest(
    packet.partnerPlayerId,
    packet.partnerPlayerName,
  );
}

function handleTradeOpen(client: Client, reader: EoReader) {
  const packet = TradeOpenServerPacket.deserialize(reader);
  client.tradeController.open(packet.partnerPlayerId, packet.partnerPlayerName);
}

function handleTradeReply(client: Client, reader: EoReader) {
  const packet = TradeReplyServerPacket.deserialize(reader);
  client.tradeController.update(packet.tradeData);
}

function handleTradeAdmin(client: Client, reader: EoReader) {
  const packet = TradeAdminServerPacket.deserialize(reader);
  client.tradeController.update(packet.tradeData, true);
}

function handleTradeAgree(client: Client, reader: EoReader) {
  const packet = TradeAgreeServerPacket.deserialize(reader);
  client.tradeController.setPartnerAgreed(packet.agree);
}

function handleTradeSpec(client: Client, reader: EoReader) {
  const packet = TradeSpecServerPacket.deserialize(reader);
  client.tradeController.setPlayerAgreed(packet.agree);
}

function handleTradeUse(client: Client, reader: EoReader) {
  const packet = TradeUseServerPacket.deserialize(reader);
  client.tradeController.completeTrade(packet.tradeData);
}

function handleTradeClose(client: Client) {
  client.tradeController.reset();
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
  client.bus.registerPacketHandler(PacketFamily.Trade, PacketAction.Close, () =>
    handleTradeClose(client),
  );
}
