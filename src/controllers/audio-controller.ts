import { MapTileSpec } from 'eolib';
import type { Client } from '../client';
import { getDistance, getVolumeFromDistance, padWithZeros } from '../utils';
import type { Vector2 } from '../vector';

export class AudioController {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  setAmbientVolume(): void {
    if (!this.client.map || !this.client.ambientSound) {
      return;
    }

    const playerAt = this.client.getPlayerCoords();
    const sources: { coords: Vector2; distance: number }[] = [];
    for (const row of this.client.map!.tileSpecRows) {
      for (const tile of row.tiles) {
        if (tile.tileSpec === MapTileSpec.AmbientSource) {
          const coords = { x: tile.x, y: row.y };
          const distance = getDistance(playerAt, coords);
          sources.push({ coords, distance });
        }
      }
    }

    sources.sort((a, b) => a.distance - b.distance);
    if (sources.length) {
      const distance = sources[0].distance;
      const volume = getVolumeFromDistance(distance);
      this.client.ambientVolume!.gain.value = volume;
    }
  }

  stopAmbientSound(): void {
    if (this.client.ambientSound && this.client.ambientVolume) {
      this.client.ambientSound.disconnect();
      this.client.ambientSound = null;
      this.client.ambientVolume.disconnect();
      this.client.ambientVolume = null;
    }
  }

  startAmbientSound(): void {
    if (!this.client.map!.ambientSoundId) {
      return;
    }

    const context = new AudioContext();
    fetch(`/sfx/sfx${padWithZeros(this.client.map!.ambientSoundId, 3)}.wav`)
      .then((response) => response.arrayBuffer())
      .then((data) => context.decodeAudioData(data))
      .then((buffer) => {
        this.client.ambientSound = context.createBufferSource();
        this.client.ambientVolume = context.createGain();
        this.client.ambientSound.connect(this.client.ambientVolume);
        this.client.ambientSound.buffer = buffer;
        this.client.ambientSound.loop = true;
        this.client.ambientVolume.connect(context.destination);
        this.setAmbientVolume();
        this.client.ambientSound.start(0);
      });
  }
}
