import { PacketAction, PacketFamily } from "eolib";
import { PacketBus } from "./bus";
import { handleInitInit } from "./handlers/init";
import { handleConnectionPlayer } from "./handlers/connection";

export class Client {
    bus: PacketBus | null = null;
    playerId = 0;

    setBus(bus: PacketBus) {
        this.bus = bus;
        this.bus.registerPacketHandler(PacketFamily.Init, PacketAction.Init, (reader) => {
            handleInitInit(this, reader);
        });
        this.bus.registerPacketHandler(PacketFamily.Connection, PacketAction.Player, (reader) => {
            handleConnectionPlayer(this, reader);
        });
    }
}