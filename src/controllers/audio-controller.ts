import { MapMusicControl, MapTileSpec } from 'eolib';
import { Howl, Howler, type PannerAttributes } from 'howler';
import { Sequencer, WorkletSynthesizer } from 'spessasynth_lib';
import processorUrl from 'spessasynth_lib/dist/spessasynth_processor.min.js?url';
import type { Client } from '@/client';
import { GameState } from '@/game-state';
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

  // MIDI state
  private midiContext: AudioContext | null = null;
  private midiSynth: WorkletSynthesizer | null = null;
  private midiSequencer: Sequencer | null = null;
  private sfBuffer: ArrayBuffer | null = null;
  private synthInitPromise: Promise<void> | null = null;
  private currentMfxId: number | null = null;
  private pendingMusic: { mfxId: number; loop: boolean } | null = null;

  // Deferred until first user gesture (browser autoplay policy)
  private gestureUnlocked = false;
  private queuedMusic: { mfxId: number; loop: boolean } | null = null;

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

    // Queue title music; also try immediate autoplay (works on refresh if
    // the browser remembers prior permission).
    this.handleStateChange(client.state);
    this.tryAutoplay();
  }

  /**
   * Attempt to create an AudioContext immediately on startup.
   * If the browser grants autoplay (context state = 'running'), unlock right
   * away. Otherwise we leave the context in place and the first user gesture
   * via notifyGesture() will resume it.
   * Wrapped in try-catch because iOS Safari may throw outside a gesture.
   */
  private tryAutoplay(): void {
    try {
      this.midiContext = new AudioContext();
      if (this.midiContext.state === 'running') {
        this.gestureUnlocked = true;
        if (this.queuedMusic) {
          const { mfxId, loop } = this.queuedMusic;
          this.queuedMusic = null;
          this.playMusic(mfxId, loop);
        }
      }
    } catch {
      // Autoplay blocked; will retry on first gesture via notifyGesture().
    }
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
    this.applyMusicVolume();
  }

  private applyMusicVolume(): void {
    if (this.midiSynth) {
      const cfg = this.client.configController;
      this.midiSynth.setMasterParameter(
        'masterGain',
        cfg.masterVolume * cfg.musicVolume,
      );
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

  /** Lazily initializes the MIDI synthesizer on first use. */
  private async ensureSynth(): Promise<void> {
    if (this.synthInitPromise) {
      return this.synthInitPromise;
    }

    this.synthInitPromise = (async () => {
      try {
        // Reuse the AudioContext created synchronously in notifyGesture() if available.
        if (!this.midiContext) {
          this.midiContext = new AudioContext();
        }

        if (!this.midiContext.audioWorklet) {
          console.warn('MIDI disabled: AudioWorklet not supported');
          return;
        }

        // iOS Safari requires the context to be running before addModule works.
        if (this.midiContext.state === 'suspended') {
          await this.midiContext.resume();
        }

        await this.midiContext.audioWorklet.addModule(processorUrl);

        this.midiSynth = new WorkletSynthesizer(this.midiContext);
        this.midiSynth.connect(this.midiContext.destination);

        if (!this.sfBuffer) {
          const res = await fetch('/gm.sf2');
          this.sfBuffer = await res.arrayBuffer();
        }
        await this.midiSynth.soundBankManager.addSoundBank(this.sfBuffer, 'gm');
        await this.midiSynth.isReady;

        this.midiSequencer = new Sequencer(this.midiSynth);

        this.midiSequencer.eventHandler.addEvent(
          'songEnded',
          'audio-controller',
          () => {
            this.currentMfxId = null;
            if (this.pendingMusic) {
              const { mfxId, loop } = this.pendingMusic;
              this.pendingMusic = null;
              this.playMusic(mfxId, loop);
            }
          },
        );

        this.applyMusicVolume();
      } catch (e) {
        console.warn('MIDI init failed:', e);
        this.synthInitPromise = null;
      }
    })();

    return this.synthInitPromise;
  }

  /** Play a MIDI file by its mfx ID. Pass `loop = true` for repeating music. */
  async playMusic(mfxId: number, loop: boolean): Promise<void> {
    if (this.client.configController.musicVolume <= 0) {
      return;
    }

    // Browser autoplay policy: AudioContext can't play until a user gesture.
    // Queue the request and wait for unlock via notifyGesture().
    if (!this.gestureUnlocked) {
      this.queuedMusic = { mfxId, loop };
      return;
    }

    await this.ensureSynth();

    if (!this.midiSequencer) {
      return; // AudioWorklet not supported on this device
    }

    const url = `/mfx/mfx${padWithZeros(mfxId, 3)}.mid`;
    const res = await fetch(url);
    if (!res.ok) {
      return;
    }
    const buffer = await res.arrayBuffer();

    this.currentMfxId = mfxId;
    this.midiSequencer!.loadNewSongList([{ binary: buffer }]);
    this.midiSequencer!.loopCount = loop ? Number.POSITIVE_INFINITY : 0;
    this.midiSequencer!.play();
  }

  /**
   * Call this on the first meaningful user gesture (click / keydown / touchstart).
   * Resumes the AudioContext (created eagerly in tryAutoplay) and starts any
   * queued music.
   */
  notifyGesture(): void {
    if (this.gestureUnlocked) {
      return;
    }
    this.gestureUnlocked = true;

    if (!this.midiContext) {
      try {
        this.midiContext = new AudioContext();
      } catch {
        return;
      }
    }

    // Resume then play — ensureSynth also resumes, but doing it here first
    // ensures the context is running before any async chain starts.
    const resume =
      this.midiContext.state === 'suspended'
        ? this.midiContext.resume()
        : Promise.resolve();

    if (this.queuedMusic) {
      const { mfxId, loop } = this.queuedMusic;
      this.queuedMusic = null;
      resume.then(() => this.playMusic(mfxId, loop));
    }
  }

  /** Stop all MIDI music immediately and clear any pending music. */
  stopMusic(): void {
    if (this.midiSequencer) {
      this.midiSequencer.pause();
    }
    this.currentMfxId = null;
    this.pendingMusic = null;
  }

  /**
   * Handle map music changes according to the map's `musicControl` field.
   * Call this whenever a new map is loaded.
   */
  async handleMapMusic(
    musicId: number,
    control: MapMusicControl,
  ): Promise<void> {
    if (this.client.state !== GameState.InGame) {
      return;
    }

    if (control === MapMusicControl.InterruptPlayNothing || musicId === 0) {
      this.stopMusic();
      return;
    }

    const loop =
      control === MapMusicControl.InterruptIfDifferentPlayRepeat ||
      control === MapMusicControl.InterruptPlayRepeat ||
      control === MapMusicControl.FinishPlayRepeat;

    switch (control) {
      case MapMusicControl.InterruptIfDifferentPlayOnce:
      case MapMusicControl.InterruptIfDifferentPlayRepeat:
        if (this.currentMfxId === musicId) {
          return;
        }
        await this.playMusic(musicId, loop);
        break;

      case MapMusicControl.InterruptPlayOnce:
      case MapMusicControl.InterruptPlayRepeat:
        await this.playMusic(musicId, loop);
        break;

      case MapMusicControl.FinishPlayOnce:
      case MapMusicControl.FinishPlayRepeat:
        if (this.currentMfxId === null) {
          await this.playMusic(musicId, loop);
        } else {
          this.pendingMusic = { mfxId: musicId, loop };
        }
        break;
    }
  }

  /**
   * Handle game state changes to control title screen music.
   * Title music (mfx001) plays on all non-InGame screens.
   */
  handleStateChange(state: GameState): void {
    if (state === GameState.InGame) {
      // Map music will be triggered separately via handleMapMusic in setMap().
      this.stopMusic();
    } else if (
      this.currentMfxId !== 1 &&
      this.client.configController.musicVolume > 0
    ) {
      this.playMusic(1, true);
    }
  }
}
