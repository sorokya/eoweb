import { ItemType, JukeboxUseClientPacket } from 'eolib';

import type { Client } from '@/client';
import { CharacterRangedAttackAnimation, Emote } from '@/render';

type NotePlayedSubscriber = (noteId: number) => void;

const BARD_EMOTE_ID = 15;

export class BardController {
  private client: Client;
  private notePlayedSubscribers: NotePlayedSubscriber[] = [];

  constructor(client: Client) {
    this.client = client;
  }

  getInstrumentId(): number {
    const weaponId = this.client.equipment.weapon;
    if (!weaponId) return 0;

    const record = this.client.getEifRecordById(weaponId);
    if (!record || record.type !== ItemType.Weapon) return 0;

    return record.spec1;
  }

  openDialog(): void {
    if (!this.getInstrumentId()) {
      this.client.alertController.show(
        this.client.locale.bard.title,
        this.client.locale.bard.noInstrument,
      );
      return;
    }

    this.client.keyboardController.notifyToggleDialog('bard');
  }

  playNote(noteId: number): void {
    const instrumentId = this.getInstrumentId();
    if (!instrumentId) return;

    const packet = new JukeboxUseClientPacket();
    packet.instrumentId = instrumentId;
    packet.noteId = noteId;
    this.client.bus!.send(packet);

    this.playBardEffect(this.client.playerId, instrumentId, noteId);
  }

  playBardEffect(playerId: number, instrumentId: number, noteId: number): void {
    this.client.animationController.characterAnimations.set(
      playerId,
      new CharacterRangedAttackAnimation(),
    );

    this.client.animationController.characterEmotes.set(
      playerId,
      new Emote(BARD_EMOTE_ID as unknown as never),
    );

    this.client.audioController.playNoteSfx(instrumentId, noteId);

    for (const sub of this.notePlayedSubscribers) {
      sub(noteId);
    }
  }

  subscribeNotePlayed(cb: NotePlayedSubscriber): void {
    this.notePlayedSubscribers.push(cb);
  }

  unsubscribeNotePlayed(cb: NotePlayedSubscriber): void {
    this.notePlayedSubscribers = this.notePlayedSubscribers.filter(
      (s) => s !== cb,
    );
  }
}
