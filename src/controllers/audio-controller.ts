import { MapTileSpec } from 'eolib';
import type { Client } from '@/client';
import { setSfxVolume } from '@/sfx';
import { getDistance, getVolumeFromDistance, padWithZeros } from '@/utils';
import type { Vector2 } from '@/vector';

export class AudioController {
  private client: Client;
  ambientSound: AudioBufferSourceNode | null = null;
  ambientVolume: GainNode | null = null;
  private masterGain: GainNode | null = null;

  constructor(client: Client) {
    this.client = client;

    // Keep gain nodes in sync whenever volume settings change
    client.configController.subscribe('masterVolume', () =>
      this.applyVolumeConfig(),
    );
    client.configController.subscribe('ambientVolume', () =>
      this.applyVolumeConfig(),
    );
    client.configController.subscribe('effectVolume', () =>
      this.applyVolumeConfig(),
    );
    this.applyVolumeConfig();
  }

  private applyVolumeConfig(): void {
    const cfg = this.client.configController;
    setSfxVolume(cfg.masterVolume * cfg.effectVolume);
    if (this.ambientSound && this.ambientVolume && this.masterGain) {
      // masterGain handles master volume; ambientVolume handles per-source distance + ambient setting
      this.masterGain.gain.value = cfg.masterVolume;
      // Re-run distance-based ambient calc to pick up new ambientVolume multiplier
      this.setAmbientVolume();
    }
  }

  private effectiveAmbientGain(distanceGain: number): number {
    const cfg = this.client.configController;
    return distanceGain * cfg.ambientVolume * cfg.masterVolume;
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
      const distanceGain = getVolumeFromDistance(distance);
      this.ambientVolume!.gain.value = this.effectiveAmbientGain(distanceGain);
    }
  }

  stopAmbientSound(): void {
    if (this.ambientSound && this.ambientVolume) {
      this.ambientSound.disconnect();
      this.ambientSound = null;
      this.ambientVolume.disconnect();
      this.ambientVolume = null;
    }
    if (this.masterGain) {
      this.masterGain.disconnect();
      this.masterGain = null;
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
        this.masterGain = context.createGain();
        this.ambientSound.connect(this.ambientVolume);
        this.ambientVolume.connect(this.masterGain);
        this.ambientSound.buffer = buffer;
        this.ambientSound.loop = true;
        this.masterGain.gain.value = this.client.configController.masterVolume;
        this.masterGain.connect(context.destination);
        this.setAmbientVolume();
        this.ambientSound.start(0);
      });
  }
}
