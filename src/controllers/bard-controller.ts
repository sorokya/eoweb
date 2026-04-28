import { ItemType, JukeboxUseClientPacket } from 'eolib';
import type { Client } from '@/client';
import { BARD_EMOTE_ID } from '@/consts';
import { CharacterRangedAttackAnimation, Emote } from '@/render';

export class BardController {
  private client: Client;

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
    const character = this.client.getCharacterById(playerId);
    if (!character) {
      return;
    }

    const existing =
      this.client.animationController.characterAnimations.get(playerId);

    if (!existing) {
      this.client.animationController.characterAnimations.set(
        playerId,
        new CharacterRangedAttackAnimation(),
      );

      this.client.animationController.characterEmotes.set(
        playerId,
        new Emote(BARD_EMOTE_ID),
      );
    }

    if (playerId === this.client.playerId) {
      this.client.audioController.playNoteSfx(instrumentId, noteId);
      return;
    }

    this.client.audioController.playNoteSfxAtPosition(
      instrumentId,
      noteId,
      character.coords,
    );
  }
}
