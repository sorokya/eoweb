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
export class PacketBus {
  private socket?: WebSocket;
  private sequencer: PacketSequencer;
  private encodeMultiple = 0;
  private decodeMultiple = 0;
  private handlers: Map<
    PacketFamily,
    Map<PacketAction, (reader: EoReader) => void>
  > = new Map();

  onPacketSent?: (
    family: PacketFamily,
    action: PacketAction,
    rawBytes: Uint8Array,
    payload: Uint8Array,
  ) => void;

  onPacketReceived?: (
    family: PacketFamily,
    action: PacketAction,
    rawBytes: Uint8Array,
    payload: Uint8Array,
  ) => void;

  constructor() {
    this.sequencer = new PacketSequencer(SequenceStart.zero());
  }

  async connect(url: string, onClose: () => void): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        this.socket = new WebSocket(url);

        this.socket.addEventListener('open', () => {
          resolve();
        });

        this.socket.addEventListener('close', () => {
          if (this.socket) {
            this.socket.close();
            this.socket = undefined;
          }
          onClose();
        });

        this.socket.addEventListener('error', (err) => {
          if (this.socket) {
            this.socket.close();
            this.socket = undefined;
          }
          reject(err);
        });

        setTimeout(() => {
          if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            if (this.socket) {
              this.socket.close();
              this.socket = undefined;
            }
            reject(new Error('Connection timed out'));
          }
        }, 5000);

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
      } catch (err) {
        reject(err);
        return;
      }
    });
  }

  disconnect() {
    this.sequencer = new PacketSequencer(SequenceStart.zero());
    if (this.socket) {
      this.socket.close();
      this.socket = undefined;
    }
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

    this.onPacketReceived?.(family, action, new Uint8Array(data), packetBuf);

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

    if (action !== 0xff && family !== 0xff) {
      const sequenceBytes = encodeNumber(sequence);
      if (sequence > CHAR_MAX) {
        data.unshift(sequenceBytes[1]);
      }
      data.unshift(sequenceBytes[0]);
    }

    data.unshift(family);
    data.unshift(action);

    // Log pre-encryption: rawBytes includes action + family + seq + payload.
    // payload (buf) is the clean serialized packet data without seq bytes.
    this.onPacketSent?.(family, action, new Uint8Array(data), buf);

    const temp = new Uint8Array(data);

    if (data[0] !== 0xff && data[1] !== 0xff) {
      swapMultiples(temp, this.encodeMultiple);
      flipMsb(temp);
      interleave(temp);
    }

    const lengthBytes = encodeNumber(temp.length);

    const payload = new Uint8Array([lengthBytes[0], lengthBytes[1], ...temp]);
    this.socket?.send(payload);
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
    actionMap!.set(action, callback);
  }
}
