import { MapTileSpec } from 'eolib';
import { Howl, Howler, type PannerAttributes } from 'howler';
import type { Client } from '@/client';
import type { SfxId } from '@/sfx';
import { padWithZeros } from '@/utils';
import type { Vector2 } from '@/vector';

const SPATIAL_PANNER: PannerAttributes = {
  panningModel: 'equalpower',
  distanceModel: 'linear',
  refDistance: 0,
  maxDistance: 25,
  rolloffFactor: 1,
};

export class AudioController {
  private client: Client;
  private sfxCache = new Map<number, Howl>();
  private spatialCache = new Map<number, Howl>();
  private ambientHowl: Howl | null = null;

  constructor(client: Client) {
    this.client = client;

    client.configController.subscribe('masterVolume', () =>
      this.applyVolumeConfig(),
    );
    client.configController.subscribe('ambientVolume', () =>
      this.applyVolumeConfig(),
    );
    client.configController.subscribe('effectVolume', () =>
      this.applyVolumeConfig(),
    );
    client.configController.subscribe('musicVolume', () =>
      this.applyVolumeConfig(),
    );
    this.applyVolumeConfig();
  }

  private sfxUrl(id: SfxId): string {
    return `/sfx/sfx${padWithZeros(id, 3)}.wav`;
  }

  private applyVolumeConfig(): void {
    const cfg = this.client.configController;
    Howler.volume(cfg.masterVolume);
    if (this.ambientHowl) {
      this.ambientHowl.volume(cfg.ambientVolume);
    }
  }

  private getNearestAmbientSource(playerAt: Vector2): Vector2 | null {
    let nearest: Vector2 | null = null;
    let nearestDist = Number.POSITIVE_INFINITY;

    for (const row of this.client.map!.tileSpecRows) {
      for (const tile of row.tiles) {
        if (tile.tileSpec === MapTileSpec.AmbientSource) {
          const coords = { x: tile.x, y: row.y };
          const dist =
            Math.abs(coords.x - playerAt.x) + Math.abs(coords.y - playerAt.y);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearest = coords;
          }
        }
      }
    }

    return nearest;
  }

  /** Play a non-positional (global) sound effect. */
  playById(id: SfxId, volume = 1.0): void {
    let howl = this.sfxCache.get(id);
    if (!howl) {
      howl = new Howl({ src: [this.sfxUrl(id)] });
      this.sfxCache.set(id, howl);
    }

    const soundId = howl.play();
    howl.volume(volume * this.client.configController.effectVolume, soundId);
  }

  /** Play a positional sound at the given map tile coordinates. */
  playAtPosition(id: SfxId, coords: Vector2): void {
    let howl = this.spatialCache.get(id);
    if (!howl) {
      howl = new Howl({ src: [this.sfxUrl(id)] });
      howl.pannerAttr(SPATIAL_PANNER);
      this.spatialCache.set(id, howl);
    }

    const soundId = howl.play();
    howl.volume(this.client.configController.effectVolume, soundId);
    howl.pos(coords.x, 0, coords.y, soundId);
  }

  /**
   * Update Howler's global listener position to the player's current tile.
   * Call this whenever the player moves or warps.
   */
  updateListenerPosition(coords: Vector2): void {
    Howler.pos(coords.x, 0, coords.y);
  }

  stopAmbientSound(): void {
    if (this.ambientHowl) {
      this.ambientHowl.stop();
      this.ambientHowl.unload();
      this.ambientHowl = null;
    }
  }

  startAmbientSound(): void {
    if (!this.client.map?.ambientSoundId) {
      return;
    }

    const playerAt = this.client.getPlayerCoords();
    const source = this.getNearestAmbientSource(playerAt);

    const howl = new Howl({
      src: [this.sfxUrl(this.client.map.ambientSoundId as SfxId)],
      loop: true,
      volume: this.client.configController.ambientVolume,
    });

    if (source) {
      howl.pannerAttr(SPATIAL_PANNER);
    }

    this.ambientHowl = howl;
    const soundId = howl.play();

    if (source) {
      howl.pos(source.x, 0, source.y, soundId);
    }
  }

  // TODO: MIDI music playback via sf2 soundfont + .mid file
  // Planned approach: parse the .mid file with a MIDI parser, then drive a
  // sf2 soundfont synthesizer (e.g. MIDI.js or similar) to produce audio.
  // The musicVolume config setting is already wired in ConfigController.
  playMusic(_midiFile: string, _soundfontFile: string): void {
    // Not yet implemented
  }

  stopMusic(): void {
    // Not yet implemented
  }
}
