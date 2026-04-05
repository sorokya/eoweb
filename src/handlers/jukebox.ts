import {
  type EoReader,
  Item,
  JukeboxAgreeServerPacket,
  JukeboxOpenServerPacket,
  JukeboxPlayerServerPacket,
  JukeboxReplyServerPacket,
  JukeboxUseServerPacket,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '@/client';
import { DialogResourceID } from '@/edf';
import { playSfxById, SfxId } from '@/sfx';

function getRequestedBy(jukeboxPlayer: string): string | null {
  const requestedBy = jukeboxPlayer.trim();
  return requestedBy || null;
}

function setGoldAmount(client: Client, amount: number) {
  const gold = client.items.find((item) => item.id === 1);

  if (gold) {
    gold.amount = amount;
    return;
  }

  const goldItem = new Item();
  goldItem.id = 1;
  goldItem.amount = amount;
  client.items.push(goldItem);
}

function handleJukeboxOpen(client: Client, reader: EoReader) {
  const packet = JukeboxOpenServerPacket.deserialize(reader);
  client.emit('jukeboxOpened', {
    requestedBy: getRequestedBy(packet.jukeboxPlayer),
  });
}

function handleJukeboxReply(client: Client, reader: EoReader) {
  JukeboxReplyServerPacket.deserialize(reader);
  const strings = client.getDialogStrings(
    DialogResourceID.JUKEBOX_REQUESTED_RECENTLY,
  );
  client.showError(strings[1], strings[0]);
}

function handleJukeboxAgree(client: Client, reader: EoReader) {
  const packet = JukeboxAgreeServerPacket.deserialize(reader);
  setGoldAmount(client, packet.goldAmount);

  client.emit('inventoryChanged', undefined);
  playSfxById(SfxId.BuySell);
}

function handleJukeboxUse(client: Client, reader: EoReader) {
  const packet = JukeboxUseServerPacket.deserialize(reader);
  void client.audioController.playJukeboxTrack(packet.trackId);
  client.emit('jukeboxUpdated', { requestedBy: '' });
}

function handleJukeboxPlayer(_client: Client, reader: EoReader) {
  JukeboxPlayerServerPacket.deserialize(reader);
}

export function registerJukeboxHandlers(client: Client) {
  client.bus!.registerPacketHandler(
    PacketFamily.Jukebox,
    PacketAction.Open,
    (reader) => handleJukeboxOpen(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Jukebox,
    PacketAction.Reply,
    (reader) => handleJukeboxReply(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Jukebox,
    PacketAction.Agree,
    (reader) => handleJukeboxAgree(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Jukebox,
    PacketAction.Use,
    (reader) => handleJukeboxUse(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Jukebox,
    PacketAction.Player,
    (reader) => handleJukeboxPlayer(client, reader),
  );
}
