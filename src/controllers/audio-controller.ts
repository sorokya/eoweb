import { MapTileSpec } from 'eolib';
import type { Client } from '@/client';
import { getDistance, getVolumeFromDistance, padWithZeros } from '@/utils';
import type { Vector2 } from '@/vector';

export class AudioController {
  private client: Client;
  ambientSound: AudioBufferSourceNode | null = null;
  ambientVolume: GainNode | null = null;

  constructor(client: Client) {
    this.client = client;
  }

  setAmbientVolume(): void {
    if (!this.client.map || !this.ambientSound) {
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
      this.ambientVolume!.gain.value = volume;
    }
  }

  stopAmbientSound(): void {
    if (this.ambientSound && this.ambientVolume) {
      this.ambientSound.disconnect();
      this.ambientSound = null;
      this.ambientVolume.disconnect();
      this.ambientVolume = null;
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
        this.ambientSound = context.createBufferSource();
        this.ambientVolume = context.createGain();
        this.ambientSound.connect(this.ambientVolume);
        this.ambientSound.buffer = buffer;
        this.ambientSound.loop = true;
        this.ambientVolume.connect(context.destination);
        this.setAmbientVolume();
        this.ambientSound.start(0);
      });
  }
}
