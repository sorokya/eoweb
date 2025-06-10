import {
  EoReader,
  EoWriter,
  type Packet,
  type PacketAction,
  type PacketFamily,
  PacketSequencer,
  SequenceStart,
  deinterleave,
  encodeNumber,
  flipMsb,
  interleave,
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
    this.sequencer.nextSequence();
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

  off<Event extends keyof PacketBusEvents>(
    event: Event,
    handler: (data: PacketBusEvents[Event]) => void,
  ) {
    this.emitter.off(event, handler);
  }

  setSequence(sequence: SequenceStart) {
    this.sequencer.sequenceStart = sequence;
  }

  setEncryption(encodeMultiple: number, decodeMultiple: number) {
    this.encodeMultiple = encodeMultiple;
    this.decodeMultiple = decodeMultiple;
  }

  private handlePacket(buf: Uint8Array) {
    if (buf[2] !== 0xff && buf[3] !== 0xff) {
      deinterleave(buf);
      flipMsb(buf);
      swapMultiples(buf, this.decodeMultiple);
    }

    const action = buf[2];
    const family = buf[3];

    const packetBuf = buf.slice(4);

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
        console.error(`Unhandled packet: ${family}_${action}`);
      }
    } else {
      console.error(`Unhandled packet: ${family}_${action}`);
    }
  }

  send(packet: Packet) {
    const writer = new EoWriter();
    packet.serialize(writer);

    const buf = writer.toByteArray();

    const data = [...buf];
    const sequence = this.sequencer.nextSequence();

    this.emitter.emit('send', {
      action: packet.action,
      family: packet.family,
      data: buf,
      timestamp: new Date(),
    });

    if (packet.action !== 0xff && packet.family !== 0xff) {
      data.unshift(sequence);
    }

    data.unshift(packet.family);
    data.unshift(packet.action);

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
