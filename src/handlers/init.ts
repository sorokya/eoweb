import { ConnectionAcceptClientPacket, EoReader, InitInitServerPacket, InitReply, InitSequenceStart } from "eolib";
import { Client } from "../client";

export function handleInitInit(client: Client, reader: EoReader) {
    const packet = InitInitServerPacket.deserialize(reader);
    // TODO: Verify server hash.. or don't
    switch (packet.replyCode) {
        case InitReply.Ok:
            handleInitOk(client, packet.replyCodeData as InitInitServerPacket.ReplyCodeDataOk);
            break;
    }
}

function handleInitOk(client: Client, data: InitInitServerPacket.ReplyCodeDataOk) {
    client.playerId = data.playerId;
    const bus = client.bus;
    if (!bus) {
        throw new Error('Bus is null');
    }

    bus.setEncryption(data.clientEncryptionMultiple, data.serverEncryptionMultiple);
    bus.setSequence(InitSequenceStart.fromInitValues(data.seq1, data.seq2));

    const packet = new ConnectionAcceptClientPacket();
    packet.clientEncryptionMultiple = data.clientEncryptionMultiple;
    packet.serverEncryptionMultiple = data.serverEncryptionMultiple;
    packet.playerId = data.playerId;
    bus.send(packet);
}