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
  client.tradeController.notifyTradeRequested(
    packet.partnerPlayerId,
    packet.partnerPlayerName,
  );
}

function handleTradeOpen(client: Client, reader: EoReader) {
  const packet = TradeOpenServerPacket.deserialize(reader);
  client.tradeController.notifyOpened(
    packet.partnerPlayerId,
    packet.partnerPlayerName,
  );
}

function handleTradeReply(client: Client, reader: EoReader) {
  const packet = TradeReplyServerPacket.deserialize(reader);
  client.tradeController.notifyUpdated(packet.tradeData);
}

function handleTradeAdmin(client: Client, reader: EoReader) {
  const packet = TradeAdminServerPacket.deserialize(reader);
  client.tradeController.notifyUpdated(packet.tradeData, true);
}

function handleTradeAgree(client: Client, reader: EoReader) {
  const packet = TradeAgreeServerPacket.deserialize(reader);
  client.tradeController.notifyPartnerAgreed(packet.agree);
}

function handleTradeSpec(client: Client, reader: EoReader) {
  const packet = TradeSpecServerPacket.deserialize(reader);
  client.tradeController.notifyPlayerAgreed(packet.agree);
}

function handleTradeUse(client: Client, reader: EoReader) {
  const packet = TradeUseServerPacket.deserialize(reader);
  client.tradeController.notifyTradeComplete(packet.tradeData);
}

function handleTradeClose(client: Client) {
  client.tradeController.notifyClosed();
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
