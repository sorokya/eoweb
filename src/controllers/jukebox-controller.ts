import {
  Coords,
  JukeboxMsgClientPacket,
  JukeboxOpenClientPacket,
  MapTileSpec,
} from 'eolib';
import type { Client } from '@/client';
import { GOLD_ITEM_ID, JUKEBOX_COST } from '@/consts';
import { DialogResourceID, EOResourceID } from '@/edf';
import { formatLocaleString } from '@/locale';
import { SfxId } from '@/sfx';
import type { Vector2 } from '@/vector';

type OpenedSubscriber = (player: string) => void;
type SongPlayedSubscriber = (trackId: number) => void;
type RequestSucceededSubscriber = () => void;

export class JukeboxController {
  private client: Client;
  tracks: string[] = [];

  private openedSubscribers: OpenedSubscriber[] = [];
  private songPlayedSubscribers: SongPlayedSubscriber[] = [];
  private requestSucceededSubscribers: RequestSucceededSubscriber[] = [];

  playerName = '';
  trackId = 0;

  constructor(client: Client) {
    this.client = client;
  }

  loadTracks(): void {
    this.tracks = [];
    const trackCount = this.client.edfs.jukebox?.getCount() ?? 0;
    for (let i = 0; i < trackCount; i++) {
      const name = this.client.edfs.jukebox?.getLine(i);
      if (name) {
        this.tracks.push(name);
      }
    }
  }

  private get hasSufficientGold(): boolean {
    return this.client.inventoryController.goldAmount >= JUKEBOX_COST;
  }

  reset(): void {
    this.playerName = '';
    this.trackId = 0;
  }

  openJukebox(coords: Vector2): void {
    if (!this.client.mapController.isAdjacentToSpec(MapTileSpec.Jukebox)) {
      return;
    }

    const packet = new JukeboxOpenClientPacket();
    packet.coords = new Coords();
    packet.coords.x = coords.x;
    packet.coords.y = coords.y;
    this.client.bus!.send(packet);
  }

  requestSong(trackId: number): void {
    if (this.playerName) {
      const strings = this.client.getDialogStrings(
        DialogResourceID.JUKEBOX_REQUESTED_RECENTLY,
      );
      this.client.alertController.show(strings[0], strings[1]);
      return;
    }

    if (!this.hasSufficientGold) {
      const strings = this.client.getDialogStrings(
        DialogResourceID.WARNING_YOU_HAVE_NOT_ENOUGH,
      );
      this.client.alertController.show(
        strings[0],
        `${strings[1]} ${this.client.locale.shared.wordGold}`,
      );
      return;
    }

    const confirmTitle = this.client.getResourceString(
      EOResourceID.JUKEBOX_REQUEST_SONG,
    );
    const confirmMsg = `${this.client.getResourceString(EOResourceID.JUKEBOX_REQUEST_SONG_FOR)} ${JUKEBOX_COST} ${this.client.locale.shared.wordGold}?`;

    this.client.alertController.showConfirm(
      confirmTitle,
      confirmMsg,
      (confirmed) => {
        if (confirmed) {
          const packet = new JukeboxMsgClientPacket();
          packet.trackId = trackId - 1;
          this.client.bus!.send(packet);
        }
      },
    );
  }

  notifyOpened(jukeboxPlayer: string): void {
    this.playerName = jukeboxPlayer;
    for (const sub of this.openedSubscribers) {
      sub(jukeboxPlayer);
    }
  }

  notifyRequestFailed(): void {
    const strings = this.client.getDialogStrings(
      DialogResourceID.JUKEBOX_REQUESTED_RECENTLY,
    );
    this.client.alertController.show(strings[0], strings[1]);
  }

  notifySongPlayed(trackId: number): void {
    if (trackId < 1) {
      console.warn(`Received jukebox trackId ${trackId}, which is invalid.`);
      return;
    }

    this.trackId = trackId;
    this.client.audioController.playJukeboxMusic(trackId);
    this.client.toastController.show(
      formatLocaleString(this.client.locale.jukebox.nowPlaying, {
        track:
          this.tracks[trackId - 1] ?? this.client.locale.shared.wordUnknown,
      }),
    );

    for (const sub of this.songPlayedSubscribers) {
      sub(trackId);
    }
  }

  notifyRequestSucceeded(goldAmount: number): void {
    this.client.inventoryController.setItem(GOLD_ITEM_ID, goldAmount);
    this.client.audioController.playById(SfxId.BuySell);

    for (const sub of this.requestSucceededSubscribers) {
      sub();
    }
  }

  subscribeOpened(cb: OpenedSubscriber): void {
    this.openedSubscribers.push(cb);
  }

  unsubscribeOpened(cb: OpenedSubscriber): void {
    this.openedSubscribers = this.openedSubscribers.filter((s) => s !== cb);
  }

  subscribeSongPlayed(cb: SongPlayedSubscriber): void {
    this.songPlayedSubscribers.push(cb);
  }

  unsubscribeSongPlayed(cb: SongPlayedSubscriber): void {
    this.songPlayedSubscribers = this.songPlayedSubscribers.filter(
      (s) => s !== cb,
    );
  }

  subscribeRequestSucceeded(cb: RequestSucceededSubscriber): void {
    this.requestSucceededSubscribers.push(cb);
  }

  unsubscribeRequestSucceeded(cb: RequestSucceededSubscriber): void {
    this.requestSucceededSubscribers = this.requestSucceededSubscribers.filter(
      (s) => s !== cb,
    );
  }
}
