import {
  CHAR_MAX,
  deinterleave,
  EoReader,
  EoWriter,
  encodeNumber,
  flipMsb,
  interleave,
  type Packet,
  PacketAction,
  PacketFamily,
  PacketSequencer,
  SequenceStart,
  swapMultiples,
} from 'eolib';
import mitt, { type Emitter } from 'mitt';

export type PacketLog = {
  action: PacketAction;
  family: PacketFamily;
  data: Uint8Array;
  timestamp: Date;
};

type PacketBusEvents = {
  send: PacketLog;
  receive: PacketLog;
};

export class PacketBus {
  private socket: WebSocket;
  private sequencer: PacketSequencer;
  private encodeMultiple = 0;
  private decodeMultiple = 0;
  private handlers: Map<
    PacketFamily,
    Map<PacketAction, (reader: EoReader) => void>
  > = new Map();
  private emitter: Emitter<PacketBusEvents>;

  constructor(socket: WebSocket) {
    this.socket = socket;
    this.sequencer = new PacketSequencer(SequenceStart.zero());
    this.socket.addEventListener('message', (e) => {
      const promise = e.data.arrayBuffer();
      promise
        .then((buf: ArrayBuffer) => {
          this.handlePacket(new Uint8Array(buf));
        })
        .catch((err: Error) => {
          console.error('Failed to get array buffer', err);
        });
    });
    this.emitter = mitt<PacketBusEvents>();
  }

  on<Event extends keyof PacketBusEvents>(
    event: Event,
    handler: (data: PacketBusEvents[Event]) => void,
  ) {
    this.emitter.on(event, handler);
  }

  disconnect() {
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

    this.emitter.emit('receive', {
      action,
      family,
      data: packetBuf,
      timestamp: new Date(),
    });

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
    const data = [...buf];
    const sequence = this.sequencer.nextSequence();

    this.emitter.emit('send', {
      action: action,
      family: family,
      data: buf,
      timestamp: new Date(),
    });

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
