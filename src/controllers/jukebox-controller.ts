import { Coords, JukeboxMsgClientPacket, JukeboxOpenClientPacket } from 'eolib';
import type { Client } from '@/client';
import type { Vector2 } from '@/vector';

export class JukeboxController {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  open(coords: Vector2): void {
    const packet = new JukeboxOpenClientPacket();
    packet.coords = new Coords();
    packet.coords.x = coords.x;
    packet.coords.y = coords.y;
    this.client.bus!.send(packet);
  }

  requestSong(trackId: number): void {
    const packet = new JukeboxMsgClientPacket();
    packet.trackId = trackId;
    this.client.bus!.send(packet);
  }
}
