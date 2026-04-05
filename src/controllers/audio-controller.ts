import { MapTileSpec } from 'eolib';
import { Sequencer, WorkletSynthesizer } from 'spessasynth_lib';
import WORKLET_URL from 'spessasynth_lib/dist/spessasynth_processor.min.js?url';
import type { Client } from '@/client';
import { getCachedAsset, saveCachedAsset } from '@/db';
import { getDistance, getVolumeFromDistance, padWithZeros } from '@/utils';
import type { Vector2 } from '@/vector';

const SOUNDFONT_URL = '/soundfonts/GeneralUser-GS.sf2';
const SOUNDFONT_CACHE_KEY = 'sf2:GeneralUser-GS';

export class AudioController {
  private client: Client;
  ambientSound: AudioBufferSourceNode | null = null;
  ambientVolume: GainNode | null = null;
  private ambientContext: AudioContext | null = null;
  private sequencer: Sequencer | null = null;
  private jukeboxLoadId = 0;
  private synthReady: Promise<WorkletSynthesizer> | null = null;
  private sfBuffer: Promise<ArrayBuffer>;

  constructor(client: Client) {
    this.client = client;
    this.sfBuffer = this.loadSf2();

    const unlock = () => {
      void this.getSynth();
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
  }

  private async loadSf2(): Promise<ArrayBuffer> {
    const cached = await getCachedAsset(SOUNDFONT_CACHE_KEY);
    if (cached) return cached;

    const resp = await fetch(SOUNDFONT_URL);
    if (!resp.ok) {
      throw new Error(`Failed to load soundfont: HTTP ${resp.status}`);
    }
    const buffer = await resp.arrayBuffer();
    saveCachedAsset(SOUNDFONT_CACHE_KEY, buffer);
    return buffer;
  }

  private async getSynth(): Promise<WorkletSynthesizer> {
    if (!this.synthReady) {
      this.synthReady = (async () => {
        const ctx = new AudioContext();
        const [sfBuffer] = await Promise.all([
          this.sfBuffer,
          ctx.audioWorklet.addModule(WORKLET_URL),
        ]);
        const synth = new WorkletSynthesizer(ctx);
        await synth.soundBankManager.addSoundBank(sfBuffer, 'main');
        await synth.isReady;
        synth.connect(ctx.destination);
        return synth;
      })().catch((error) => {
        this.synthReady = null;
        throw error;
      });
    }
    return this.synthReady;
  }

  private stopCurrentSequencer(): void {
    if (this.sequencer) {
      this.sequencer.pause();
      this.sequencer = null;
    }
  }

  setAmbientVolume(): void {
    if (!this.client.map || !this.ambientSound) {
      return;
    }

    const playerAt = this.client.getPlayerCoords();
    const sources: { coords: Vector2; distance: number }[] = [];
    for (const row of this.client.map.tileSpecRows) {
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
      this.ambientVolume!.gain.value = getVolumeFromDistance(
        sources[0]!.distance,
      );
    }
  }

  stopAmbientSound(): void {
    if (this.ambientSound && this.ambientVolume) {
      this.ambientSound.disconnect();
      this.ambientSound = null;
      this.ambientVolume.disconnect();
      this.ambientVolume = null;
    }
    void this.ambientContext?.close();
    this.ambientContext = null;
  }

  startAmbientSound(): void {
    if (!this.client.map?.ambientSoundId) {
      return;
    }

    const context = new AudioContext();
    this.ambientContext = context;
    fetch(`/sfx/sfx${padWithZeros(this.client.map.ambientSoundId, 3)}.wav`)
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

  stopJukeboxTrack(): void {
    this.jukeboxLoadId += 1;
    this.stopCurrentSequencer();
  }

  async playJukeboxTrack(trackId: number): Promise<void> {
    if (!trackId) {
      return;
    }

    const loadId = ++this.jukeboxLoadId;

    try {
      this.stopCurrentSequencer();

      const [synth, midiResp] = await Promise.all([
        this.getSynth(),
        fetch(`/jbox/jbox${padWithZeros(trackId, 3)}.mid`),
      ]);

      if (this.jukeboxLoadId !== loadId) {
        return;
      }

      if (!midiResp.ok) {
        throw new Error(
          `Failed to load jukebox track: HTTP ${midiResp.status}`,
        );
      }

      const midiBuffer = await midiResp.arrayBuffer();

      if (this.jukeboxLoadId !== loadId) {
        return;
      }

      synth.stopAll(true);
      const seq = new Sequencer(synth);
      seq.loadNewSongList([{ binary: midiBuffer }]);
      seq.loopCount = -1;
      this.sequencer = seq;
      seq.play();
    } catch (error) {
      console.error(`Failed to play jukebox track ${trackId}`, error);
    }
  }
}
