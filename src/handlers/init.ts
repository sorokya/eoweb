import {
  ConnectionAcceptClientPacket,
  Ecf,
  Eif,
  Emf,
  Enf,
  EoReader,
  Esf,
  InitBanType,
  InitInitServerPacket,
  InitReply,
  InitSequenceStart,
  PacketAction,
  PacketFamily,
} from 'eolib';
import { type Client, GameState } from '../client';
import { saveEcf, saveEif, saveEmf, saveEnf, saveEsf } from '../db';

function handleInitInit(client: Client, reader: EoReader) {
  const packet = InitInitServerPacket.deserialize(reader);
  // TODO: Verify server hash.. or don't
  switch (packet.replyCode) {
    case InitReply.Ok:
      handleInitOk(
        client,
        packet.replyCodeData as InitInitServerPacket.ReplyCodeDataOk,
      );
      break;
    case InitReply.Banned:
      handleInitBanned(
        client,
        packet.replyCodeData as InitInitServerPacket.ReplyCodeDataBanned,
      );
      break;
    case InitReply.FileEcf:
      handleInitFileEcf(
        client,
        packet.replyCodeData as InitInitServerPacket.ReplyCodeDataFileEcf,
      );
      break;
    case InitReply.FileEif:
      handleInitFileEif(
        client,
        packet.replyCodeData as InitInitServerPacket.ReplyCodeDataFileEif,
      );
      break;
    case InitReply.FileEnf:
      handleInitFileEnf(
        client,
        packet.replyCodeData as InitInitServerPacket.ReplyCodeDataFileEnf,
      );
      break;
    case InitReply.FileEsf:
      handleInitFileEsf(
        client,
        packet.replyCodeData as InitInitServerPacket.ReplyCodeDataFileEsf,
      );
      break;
    case InitReply.FileEmf:
      handleInitFileEmf(
        client,
        packet.replyCodeData as InitInitServerPacket.ReplyCodeDataFileEmf,
      );
      break;
  }
}

function handleInitOk(
  client: Client,
  data: InitInitServerPacket.ReplyCodeDataOk,
) {
  client.playerId = data.playerId;
  const bus = client.bus;
  if (!bus) {
    throw new Error('Bus is null');
  }

  bus.setEncryption(
    data.clientEncryptionMultiple,
    data.serverEncryptionMultiple,
  );
  bus.setSequence(InitSequenceStart.fromInitValues(data.seq1, data.seq2));

  const packet = new ConnectionAcceptClientPacket();
  packet.clientEncryptionMultiple = data.clientEncryptionMultiple;
  packet.serverEncryptionMultiple = data.serverEncryptionMultiple;
  packet.playerId = data.playerId;
  bus.send(packet);
  client.state = GameState.Connected;
}

function handleInitBanned(
  client: Client,
  data: InitInitServerPacket.ReplyCodeDataBanned,
) {
  if (data.banType === InitBanType.Permanent) {
    client.showError(
      'The server dropped the connection, reason: peramanent ip ban',
      'Connection is blocked',
    );
    return;
  }

  const banData =
    data.banTypeData as InitInitServerPacket.ReplyCodeDataBanned.BanTypeData0;
  client.showError(
    `The server dropped the connection, reason: temporary ip ban. ${banData.minutesRemaining} minutes`,
    'Connection is blocked',
  );
}

function handleInitFileEcf(
  client: Client,
  data: InitInitServerPacket.ReplyCodeDataFileEcf,
) {
  const reader = new EoReader(data.pubFile.content);
  client.ecf = Ecf.deserialize(reader);
  saveEcf(client.ecf);

  if (client.downloadQueue.length > 0) {
    const download = client.downloadQueue.pop();
    client.requestFile(download.type, download.id);
  } else {
    client.enterGame();
  }
}

function handleInitFileEif(
  client: Client,
  data: InitInitServerPacket.ReplyCodeDataFileEif,
) {
  const reader = new EoReader(data.pubFile.content);
  client.eif = Eif.deserialize(reader);
  saveEif(client.eif);

  if (client.downloadQueue.length > 0) {
    const download = client.downloadQueue.pop();
    client.requestFile(download.type, download.id);
  } else {
    client.enterGame();
  }
}

function handleInitFileEnf(
  client: Client,
  data: InitInitServerPacket.ReplyCodeDataFileEnf,
) {
  const reader = new EoReader(data.pubFile.content);
  client.enf = Enf.deserialize(reader);
  saveEnf(client.enf);

  if (client.downloadQueue.length > 0) {
    const download = client.downloadQueue.pop();
    client.requestFile(download.type, download.id);
  } else {
    client.enterGame();
  }
}

function handleInitFileEsf(
  client: Client,
  data: InitInitServerPacket.ReplyCodeDataFileEsf,
) {
  const reader = new EoReader(data.pubFile.content);
  client.esf = Esf.deserialize(reader);
  saveEsf(client.esf);

  if (client.downloadQueue.length > 0) {
    const download = client.downloadQueue.pop();
    client.requestFile(download.type, download.id);
  } else {
    client.enterGame();
  }
}

function handleInitFileEmf(
  client: Client,
  data: InitInitServerPacket.ReplyCodeDataFileEmf,
) {
  const reader = new EoReader(data.mapFile.content);
  client.map = Emf.deserialize(reader);
  saveEmf(client.mapId, client.map);

  if (client.downloadQueue.length > 0) {
    const download = client.downloadQueue.pop();
    client.requestFile(download.type, download.id);
  } else {
    client.enterGame();
  }
}

export function registerInitHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Init,
    PacketAction.Init,
    (reader) => handleInitInit(client, reader),
  );
}