import {
  CHAR_MAX,
  deinterleave,
  EoReader,
  EoWriter,
  encodeNumber,
  flipMsb,
  InitInitClientPacket,
  interleave,
  type Packet,
  PacketAction,
  PacketFamily,
  PacketSequencer,
  SequenceStart,
  swapMultiples,
} from 'eolib';
import type { Client } from './client';
import { MAX_CHALLENGE } from './consts';
import { registerAccountHandlers } from './handlers/account';
import { registerAdminInteractHandlers } from './handlers/admin-interact';
import { registerArenaHandlers } from './handlers/arena';
import { registerAttackHandlers } from './handlers/attack';
import { registerAvatarHandlers } from './handlers/avatar';
import { registerBankHandlers } from './handlers/bank';
import { registerCastHandlers } from './handlers/cast';
import { registerChairHandlers } from './handlers/chair';
import { registerCharacterHandlers } from './handlers/character';
import { registerChestHandlers } from './handlers/chest';
import { registerConnectionHandlers } from './handlers/connection';
import { registerDoorHandlers } from './handlers/door';
import { registerEffectHandlers } from './handlers/effect';
import { registerEmoteHandlers } from './handlers/emote';
import { registerFaceHandlers } from './handlers/face';
import { registerInitHandlers } from './handlers/init';
import { registerItemHandlers } from './handlers/item';
import { registerLockerHandlers } from './handlers/locker';
import { registerLoginHandlers } from './handlers/login';
import { registerMessageHandlers } from './handlers/message';
import { registerMusicHandlers } from './handlers/music';
import { registerNpcHandlers } from './handlers/npc';
import { registerPaperdollHandlers } from './handlers/paperdoll';
import { registerPartyHandlers } from './handlers/party';
import { registerPlayersHandlers } from './handlers/players';
import { registerQuestHandlers } from './handlers/quest';
import { registerRangeHandlers } from './handlers/range';
import { registerRecoverHandlers } from './handlers/recover';
import { registerRefreshHandlers } from './handlers/refresh';
import { registerShopHandlers } from './handlers/shop';
import { registerSitHandlers } from './handlers/sit';
import { registerSpellHandlers } from './handlers/spell';
import { registerStatSkillHandlers } from './handlers/stat-skill';
import { registerTalkHandlers } from './handlers/talk';
import { registerWalkHandlers } from './handlers/walk';
import { registerWarpHandlers } from './handlers/warp';
import { registerWelcomeHandlers } from './handlers/welcome';
import { randomRange } from './utils/random-range';
export class PacketBus {
  private client: Client;
  private socket: WebSocket | null = null;
  private sequencer: PacketSequencer;
  private encodeMultiple = 0;
  private decodeMultiple = 0;
  private handlers: Map<
    PacketFamily,
    Map<PacketAction, (reader: EoReader) => void>
  > = new Map();

  constructor(client: Client) {
    this.client = client;
    this.sequencer = new PacketSequencer(SequenceStart.zero());
  }

  connect() {
    this.socket = new WebSocket(this.client.config.host);
    this.socket.addEventListener(
      'message',
      this.handleSocketMessage.bind(this),
    );

    this.socket.addEventListener('open', () => {
      const packet = new InitInitClientPacket();
      this.client.challenge = randomRange(1, MAX_CHALLENGE);
      packet.challenge = this.client.challenge;
      packet.hdid = '111111111';
      packet.version = this.client.version;
      this.send(packet);
    });

    this.socket.addEventListener('error', (err) => {
      console.error('WebSocket error', err);
      this.client.disconnect();
    });

    this.sequencer.sequenceStart = SequenceStart.zero();

    registerInitHandlers(this.client);
    registerConnectionHandlers(this.client);
    registerLoginHandlers(this.client);
    registerWelcomeHandlers(this.client);
    registerPlayersHandlers(this.client);
    registerRecoverHandlers(this.client);
    registerMessageHandlers(this.client);
    registerAvatarHandlers(this.client);
    registerFaceHandlers(this.client);
    registerWalkHandlers(this.client);
    registerSitHandlers(this.client);
    registerChairHandlers(this.client);
    registerWarpHandlers(this.client);
    registerRefreshHandlers(this.client);
    registerNpcHandlers(this.client);
    registerRangeHandlers(this.client);
    registerTalkHandlers(this.client);
    registerAttackHandlers(this.client);
    registerArenaHandlers(this.client);
    registerAccountHandlers(this.client);
    registerCharacterHandlers(this.client);
    registerDoorHandlers(this.client);
    registerEffectHandlers(this.client);
    registerItemHandlers(this.client);
    registerAdminInteractHandlers(this.client);
    registerQuestHandlers(this.client);
    registerMusicHandlers(this.client);
    registerEmoteHandlers(this.client);
    registerPaperdollHandlers(this.client);
    registerChestHandlers(this.client);
    registerShopHandlers(this.client);
    registerBankHandlers(this.client);
    registerLockerHandlers(this.client);
    registerStatSkillHandlers(this.client);
    registerSpellHandlers(this.client);
    registerCastHandlers(this.client);
    registerPartyHandlers(this.client);
  }

  private async handleSocketMessage(event: MessageEvent) {
    try {
      const data = new Uint8Array(await event.data.arrayBuffer());
      this.handlePacket(data);
    } catch (err) {
      console.error('Error handling socket message', err);
    }
  }

  disconnect() {
    if (!this.socket) return;
    this.socket.close();
  }

  setSequence(sequence: SequenceStart) {
    this.sequencer.sequenceStart = sequence;
  }

  setEncryption(encodeMultiple: number, decodeMultiple: number) {
    this.encodeMultiple = encodeMultiple;
    this.decodeMultiple = decodeMultiple;
  }

  private handlePacket(buf: Uint8Array) {
    const data = buf.slice(2);
    if (data[0] !== 0xff && data[1] !== 0xff) {
      deinterleave(data);
      flipMsb(data);
      swapMultiples(data, this.decodeMultiple);
    }

    const action = data[0];
    const family = data[1];

    const packetBuf = data.slice(2);

    const reader = new EoReader(packetBuf);
    const familyHandlers = this.handlers.get(family);
    if (familyHandlers) {
      const handler = familyHandlers.get(action);
      if (handler) {
        handler(reader);
      } else {
        console.error(
          `Unhandled packet: ${PacketFamily[family]}_${PacketAction[action]}`,
        );
      }
    } else {
      console.error(
        `Unhandled packet: ${PacketFamily[family]}_${PacketAction[action]}`,
      );
    }
  }

  send(packet: Packet) {
    const writer = new EoWriter();
    packet.serialize(writer);
    this.sendBuf(packet.family, packet.action, writer.toByteArray());
  }

  sendBuf(family: PacketFamily, action: PacketAction, buf: Uint8Array) {
    if (!this.socket) return;

    const data = [...buf];
    const sequence = this.sequencer.nextSequence();

    if (action !== 0xff && family !== 0xff) {
      const sequenceBytes = encodeNumber(sequence);
      if (sequence > CHAR_MAX) {
        data.unshift(sequenceBytes[1]);
      }
      data.unshift(sequenceBytes[0]);
    }

    data.unshift(family);
    data.unshift(action);

    const temp = new Uint8Array(data);

    if (data[0] !== 0xff && data[1] !== 0xff) {
      swapMultiples(temp, this.encodeMultiple);
      flipMsb(temp);
      interleave(temp);
    }

    const lengthBytes = encodeNumber(temp.length);

    const payload = new Uint8Array([lengthBytes[0], lengthBytes[1], ...temp]);
    this.socket.send(payload);
  }

  registerPacketHandler(
    family: PacketFamily,
    action: PacketAction,
    callback: (reader: EoReader) => void,
  ) {
    if (!this.handlers.has(family)) {
      this.handlers.set(family, new Map());
    }

    const actionMap = this.handlers.get(family);
    actionMap.set(action, callback);
  }
}
