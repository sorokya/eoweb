import mitt from 'mitt';
import type { Client } from '@/client';
import { DialogResourceID, EOResourceID } from '@/edf';
import { playSfxById, SfxId } from '@/sfx';
import { Base } from '@/ui/base-ui';
import { DialogIcon } from '@/ui/ui-types';
import { createIconMenuItem } from '@/ui/utils';

import './jukebox-dialog.css';

type Events = {
  requestSong: { trackId: number };
};

const SONG_REQUEST_COST = 25;

export class JukeboxDialog extends Base {
  private client: Client;
  private emitter = mitt<Events>();
  protected container = document.getElementById('jukebox-dialog')!;
  private dialogs = document.getElementById('dialogs');
  private cover = document.querySelector<HTMLDivElement>('#cover');
  private btnCancel = this.container.querySelector<HTMLButtonElement>(
    'button[data-id="cancel"]',
  )!;
  private title = this.container.querySelector<HTMLSpanElement>('.title')!;
  private itemList =
    this.container.querySelector<HTMLDivElement>('.item-list')!;
  private songIndex = 0;
  private requestedBy: string | null = null;
  private isOpen = false;

  constructor(client: Client) {
    super();
    this.client = client;

    this.btnCancel.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      this.hide();
    });

    this.client.on('inventoryChanged', () => this.refresh());
  }

  on<Event extends keyof Events>(
    event: Event,
    handler: (data: Events[Event]) => void,
  ) {
    this.emitter.on(event, handler);
  }

  setRequestedBy(requestedBy: string | null) {
    this.requestedBy = requestedBy;
    this.refresh();
  }

  refresh() {
    if (this.isOpen) {
      this.render();
    }
  }

  show() {
    this.songIndex = 0;
    this.isOpen = true;
    this.render();
    this.cover!.classList.remove('hidden');
    this.container!.classList.remove('hidden');
    this.dialogs!.classList.remove('hidden');
    this.client.typing = true;
  }

  hide() {
    this.isOpen = false;
    this.cover!.classList.add('hidden');
    this.container!.classList.add('hidden');

    if (!document.querySelector('#dialogs > div:not(.hidden)')) {
      this.dialogs!.classList.add('hidden');
      this.client.typing = false;
    }
  }

  private render() {
    const songNames = this.getSongNames();
    if (songNames.length === 0) {
      this.songIndex = 0;
    } else if (this.songIndex >= songNames.length) {
      this.songIndex = 0;
    }

    this.updateTitle();
    this.itemList.innerHTML = '';
    const currentSong = songNames[this.songIndex] ?? '';

    const browseItem = createIconMenuItem(
      DialogIcon.JukeboxBrowse,
      this.client.getResourceString(EOResourceID.JUKEBOX_BROWSE_THROUGH_SONGS),
      this.formatSubtitle(currentSong),
    );
    const browse = () => {
      if (songNames.length === 0) {
        return;
      }

      playSfxById(SfxId.ButtonClick);
      this.songIndex = (this.songIndex + 1) % songNames.length;
      this.render();
    };
    browseItem.addEventListener('click', browse);
    this.itemList.appendChild(browseItem);

    const playItem = createIconMenuItem(
      DialogIcon.JukeboxPlay,
      this.client.getResourceString(EOResourceID.JUKEBOX_PLAY_SONG),
      this.formatSubtitle(`${SONG_REQUEST_COST} gold`),
    );
    const play = () => {
      playSfxById(SfxId.ButtonClick);
      this.requestSong();
    };
    playItem.addEventListener('click', play);
    this.itemList.appendChild(playItem);
  }

  private requestSong() {
    if (this.requestedBy !== null) {
      const strings = this.client.getDialogStrings(
        DialogResourceID.JUKEBOX_REQUESTED_RECENTLY,
      );
      this.client.showError(strings[1], strings[0]);
      return;
    }

    const songNames = this.getSongNames();
    if (songNames.length === 0) {
      this.client.showError(
        'The jukebox song list is not available yet.',
        this.client.getResourceString(EOResourceID.JUKEBOX_REQUEST_SONG),
      );
      return;
    }

    const gold = this.client.items.find((item) => item.id === 1)?.amount ?? 0;
    if (gold < SONG_REQUEST_COST) {
      const strings = this.client.getDialogStrings(
        DialogResourceID.WARNING_YOU_HAVE_NOT_ENOUGH,
      );
      this.client.emit('smallAlert', {
        title: strings[0],
        message: strings[1],
      });
      return;
    }

    const message = `${this.client.getResourceString(EOResourceID.JUKEBOX_REQUEST_SONG_FOR)} ${SONG_REQUEST_COST} gold?`;
    const title = this.client.getResourceString(
      EOResourceID.JUKEBOX_REQUEST_SONG,
    );

    this.client.showConfirmation(message, title, () => {
      this.emitter.emit('requestSong', { trackId: this.songIndex });
      this.hide();
    });
  }

  private updateTitle() {
    if (this.requestedBy === null) {
      this.title.innerText = this.client.getResourceString(
        EOResourceID.JUKEBOX_IS_READY,
      );
      return;
    }

    const base = this.client.getResourceString(
      EOResourceID.JUKEBOX_PLAYING_REQUEST,
    );
    this.title.innerText = this.requestedBy
      ? `${base} (${this.requestedBy})`
      : base;
  }

  private formatSubtitle(text: string) {
    return `${this.client.getResourceString(EOResourceID.DIALOG_WORD_CURRENT)} : ${text}`;
  }

  private getSongNames(): readonly string[] {
    return this.client.edfs.jukebox?.getLines() ?? [];
  }
}
