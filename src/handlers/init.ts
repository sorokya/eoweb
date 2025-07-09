import {
  ConnectionAcceptClientPacket,
  Ecf,
  Eif,
  Emf,
  Enf,
  EoReader,
  EoWriter,
  Esf,
  InitBanType,
  InitInitServerPacket,
  InitReply,
  InitSequenceStart,
  PacketAction,
  PacketFamily,
  serverVerificationHash,
} from 'eolib';
import { type Client, GameState } from '../client';
import { saveEcf, saveEif, saveEmf, saveEnf, saveEsf } from '../db';
import { DialogResourceID } from '../edf';

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
    case InitReply.OutOfDate:
      handleInitOutOfDate(
        client,
        packet.replyCodeData as InitInitServerPacket.ReplyCodeDataOutOfDate,
      );
      break;
    case InitReply.PlayersList:
      handleInitPlayersList(
        client,
        packet.replyCodeData as InitInitServerPacket.ReplyCodeDataPlayersList,
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
    case InitReply.WarpMap:
      handleInitWarpMap(
        client,
        packet.replyCodeData as InitInitServerPacket.ReplyCodeDataWarpMap,
      );
      break;
  }
}

function handleInitOk(
  client: Client,
  data: InitInitServerPacket.ReplyCodeDataOk,
) {
  if (data.challengeResponse !== serverVerificationHash(client.challenge)) {
    const text = client.getDialogStrings(
      DialogResourceID.CONNECTION_LOST_CONNECTION,
    );
    client.showError(text[1], text[0]);
    client.disconnect();
    return;
  }

  client.playerId = data.playerId;
  // Hack to keep pre-game UI stable
  client.nearby.characters[0].playerId = data.playerId;
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

  if (client.rememberMe && client.loginToken) {
    const writer = new EoWriter();
    writer.addString(client.loginToken);
    bus.sendBuf(PacketFamily.Login, PacketAction.Use, writer.toByteArray());
  }
}

function handleInitPlayersList(
  client: Client,
  data: InitInitServerPacket.ReplyCodeDataPlayersList,
) {
  data.playersList.players.sort((a, b) => a.name.localeCompare(b.name));
  client.emit('playersListUpdated', data.playersList.players);
}

function handleInitOutOfDate(
  client: Client,
  data: InitInitServerPacket.ReplyCodeDataOutOfDate,
) {
  client.version = data.version;
  client.emit('reconnect', undefined);
}

function handleInitBanned(
  client: Client,
  data: InitInitServerPacket.ReplyCodeDataBanned,
) {
  if (data.banType === InitBanType.Permanent) {
    const text = client.getDialogStrings(
      DialogResourceID.CONNECTION_IP_BAN_PERM,
    );
    client.showError(text[1], text[0]);
    return;
  }

  const banData =
    data.banTypeData as InitInitServerPacket.ReplyCodeDataBanned.BanTypeData0;
  const text = client.getDialogStrings(DialogResourceID.CONNECTION_IP_BAN_TEMP);
  client.showError(`${text[0]} ${banData.minutesRemaining} minutes`, text[1]);
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
  client.setMap(Emf.deserialize(reader));
  saveEmf(client.mapId, client.map);

  if (client.downloadQueue.length > 0) {
    const download = client.downloadQueue.pop();
    client.requestFile(download.type, download.id);
  } else {
    client.enterGame();
  }
}

function handleInitWarpMap(
  client: Client,
  data: InitInitServerPacket.ReplyCodeDataWarpMap,
) {
  const reader = new EoReader(data.mapFile.content);
  const map = Emf.deserialize(reader);
  saveEmf(client.warpMapId, map);
  client.warpQueued = true;
}

export function registerInitHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Init,
    PacketAction.Init,
    (reader) => handleInitInit(client, reader),
  );
}
