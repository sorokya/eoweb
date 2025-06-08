import { deinterleave, encodeNumber, EoReader, EoWriter, flipMsb, interleave, Packet, PacketAction, PacketFamily, PacketSequencer, SequenceStart, swapMultiples } from "eolib";

export class PacketBus {
    private socket: WebSocket;
    private sequencer: PacketSequencer;
    private encodeMultiple = 0;
    private decodeMultiple = 0;
    private handlers: Map<PacketFamily, Map<PacketAction, (reader: EoReader) => void>> = new Map();

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
                    console.error("Failed to get array buffer", err);
                });
        });
    }

    setSequence(sequence: SequenceStart) {
        this.sequencer.sequenceStart = sequence;
    }

    setEncryption(encodeMultiple: number, decodeMultiple: number) {
        this.encodeMultiple = encodeMultiple;
        this.decodeMultiple = decodeMultiple;
    }

    private handlePacket(buf: Uint8Array) {
        buf = buf.slice(2);
        if (buf[0] !== 0xff && buf[1] !== 0xff) {
            deinterleave(buf);
            flipMsb(buf);
            swapMultiples(buf, this.decodeMultiple);
        }

        console.log('Received', buf);

        const action = buf[0];
        const family = buf[1];

        const packetBuf = buf.slice(2);
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

        console.log('Sending', data);

        const lengthBytes = encodeNumber(temp.length);

        const payload = new Uint8Array([lengthBytes[0], lengthBytes[1], ...temp]);
        this.socket.send(payload);
    }

    registerPacketHandler(family: PacketFamily, action: PacketAction, callback: (reader: EoReader) => void) {
        if (!this.handlers.has(family)) {
            this.handlers.set(family, new Map());
        }

        const actionMap = this.handlers.get(family)!;
        actionMap.set(action, callback);
    }
}