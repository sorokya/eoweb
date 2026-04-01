import { BarberBuyClientPacket, type CharacterMapInfo, Direction } from 'eolib';
import { CharacterFrame } from '@/atlas';
import type { Client } from '@/client';
import {
  BARBER_BASE_COST,
  BARBER_COST_PER_LEVEL,
  CHARACTER_HEIGHT,
  CHARACTER_WIDTH,
  GAME_FPS,
  MAX_HAIR_COLOR,
  MAX_HAIR_STYLE,
} from '@/consts';
import { playSfxById, SfxId } from '@/sfx';
import { Base } from '@/ui/base-ui';

import './barber-dialog.css';
import { DialogResourceID, EOResourceID } from '@/edf';

export class BarberDialog extends Base {
  private client: Client;
  protected container = document.getElementById('barber-dialog')!;
  private dialogs = document.getElementById('dialogs')!;
  private cover = document.querySelector<HTMLDivElement>('#cover')!;
  private previewImage = this.container.querySelector<HTMLImageElement>(
    '.barber-preview img',
  )!;
  private confirmText = this.container.querySelector<HTMLParagraphElement>(
    '.barber-confirm-text',
  )!;

  private hairStyle = 0;
  private hairColor = 0;
  private direction = Direction.Right;

  private originalHairStyle = 0;
  private originalHairColor = 0;
  private character: CharacterMapInfo | null = null;
  private _open = false;

  private offscreen: HTMLCanvasElement;
  private offscreenContext: CanvasRenderingContext2D;
  private lastRenderTime: DOMHighResTimeStamp | undefined;

  private styleValue = this.container.querySelector<HTMLSpanElement>(
    '[data-id="style-val"]',
  )!;
  private colorValue = this.container.querySelector<HTMLSpanElement>(
    '[data-id="color-val"]',
  )!;
  private controls =
    this.container.querySelector<HTMLDivElement>('.barber-controls')!;
  private footer =
    this.container.querySelector<HTMLDivElement>('.barber-footer')!;
  private confirmation =
    this.container.querySelector<HTMLDivElement>('.barber-confirm')!;

  constructor(client: Client) {
    super();
    this.client = client;

    this.offscreen = document.createElement('canvas');
    this.offscreen.width = CHARACTER_WIDTH + 40;
    this.offscreen.height = CHARACTER_HEIGHT + 40;
    this.offscreenContext = this.offscreen.getContext('2d')!;

    this.container
      .querySelector('[data-id="style-prev"]')!
      .addEventListener('click', () => this.changeStyle(-1));
    this.container
      .querySelector('[data-id="style-next"]')!
      .addEventListener('click', () => this.changeStyle(1));
    this.container
      .querySelector('[data-id="color-prev"]')!
      .addEventListener('click', () => this.changeColor(-1));
    this.container
      .querySelector('[data-id="color-next"]')!
      .addEventListener('click', () => this.changeColor(1));

    this.container
      .querySelector('[data-id="buy"]')!
      .addEventListener('click', () => this.showConfirmation());
    this.container
      .querySelector('[data-id="cancel"]')!
      .addEventListener('click', () => {
        playSfxById(SfxId.ButtonClick);
        this.hide();
      });

    this.confirmation
      .querySelector('[data-id="confirm-yes"]')!
      .addEventListener('click', () => {
        playSfxById(SfxId.ButtonClick);
        this.buy();
        this.hideConfirmation();
      });
    this.confirmation
      .querySelector('[data-id="confirm-no"]')!
      .addEventListener('click', () => {
        playSfxById(SfxId.ButtonClick);
        this.hideConfirmation();
      });

    this.previewImage.addEventListener('click', () => {
      if (!this.character) return;

      this.direction = (this.direction + 1) % 4;
      playSfxById(SfxId.ButtonClick);
      this.applyPreview();
    });

    this.client.on('barberPurchased', () => {
      // Update originals so hide() doesn't revert back
      this.originalHairStyle = this.hairStyle;
      this.originalHairColor = this.hairColor;
      this.hide();
    });
  }

  show() {
    this.character = this.client.getCharacterById(this.client.playerId) ?? null;
    if (this.character) {
      this.originalHairStyle = this.character.hairStyle;
      this.originalHairColor = this.character.hairColor;
      this.hairStyle = this.character.hairStyle;
      this.hairColor = this.character.hairColor;
      this.direction = Direction.Right;
    }
    this._open = true;
    this.updateLabels();
    this.hideConfirmation();
    this.cover.classList.remove('hidden');
    this.container.classList.remove('hidden');
    this.dialogs.classList.remove('hidden');
    this.client.typing = true;
    this.lastRenderTime = undefined;
    requestAnimationFrame((now) => this.renderPreview(now));
  }

  hide() {
    this._open = false;

    if (this.character) {
      this.character.hairStyle = this.originalHairStyle;
      this.character.hairColor = this.originalHairColor;
      this.client.atlas.refresh();
    }

    this.cover.classList.add('hidden');
    this.container.classList.add('hidden');

    if (!document.querySelector('#dialogs > div:not(.hidden)')) {
      this.dialogs.classList.add('hidden');
      this.client.typing = false;
    }
  }

  private changeStyle(delta: number) {
    this.hairStyle = (this.hairStyle + delta + MAX_HAIR_STYLE) % MAX_HAIR_STYLE;
    playSfxById(SfxId.ButtonClick);
    this.applyPreview();
  }

  private changeColor(delta: number) {
    this.hairColor = (this.hairColor + delta + MAX_HAIR_COLOR) % MAX_HAIR_COLOR;
    playSfxById(SfxId.ButtonClick);
    this.applyPreview();
  }

  private applyPreview() {
    if (this.character) {
      this.character.hairStyle = this.hairStyle;
      this.character.hairColor = this.hairColor;
      this.client.atlas.refresh();
    }
    this.updateLabels();
  }

  private updateLabels() {
    this.styleValue.textContent = String(this.hairStyle);
    this.colorValue.textContent = String(this.hairColor);
  }

  private calculateCost(): number {
    return (
      BARBER_BASE_COST +
      Math.max(this.client.level - 1, 0) * BARBER_COST_PER_LEVEL
    );
  }

  private showConfirmation() {
    playSfxById(SfxId.ButtonClick);

    const cost = this.calculateCost();
    const goldRecord = this.client.getEifRecordById(1);
    const gold = this.client.items.find((i) => i.id === 1);
    if (!gold || gold.amount < cost) {
      const strings = this.client.getDialogStrings(
        DialogResourceID.WARNING_YOU_HAVE_NOT_ENOUGH,
      );
      this.client.emit('smallAlert', {
        title: strings[0],
        message: `${strings[1]} ${goldRecord?.name}`,
      });
      return;
    }

    this.confirmText.textContent = `${this.client.getResourceString(
      EOResourceID.DIALOG_BARBER_BUY_HAIRSTYLE,
    )} (${this.calculateCost()} gold)`;

    this.controls.classList.add('hidden');
    this.footer.classList.add('hidden');
    this.confirmation.classList.remove('hidden');
  }

  private hideConfirmation() {
    this.confirmation.classList.add('hidden');
    this.controls.classList.remove('hidden');
    this.footer.classList.remove('hidden');
  }

  private renderPreview(now: DOMHighResTimeStamp) {
    if (!this._open) return;

    if (this.lastRenderTime) {
      const elapsed = now - this.lastRenderTime;
      if (elapsed < GAME_FPS) {
        requestAnimationFrame((n) => this.renderPreview(n));
        return;
      }
    }
    this.lastRenderTime = now;

    this.offscreenContext.clearRect(
      0,
      0,
      this.offscreen.width,
      this.offscreen.height,
    );

    const downRight = [Direction.Down, Direction.Right].includes(
      this.direction ?? Direction.Down,
    );

    const frame = this.client.atlas.getCharacterFrame(
      this.client.playerId,
      downRight
        ? CharacterFrame.StandingDownRight
        : CharacterFrame.StandingUpLeft,
    );

    if (!frame) {
      requestAnimationFrame((n) => this.renderPreview(n));
      return;
    }

    const atlas = this.client.atlas.getAtlas(frame.atlasIndex);
    if (!atlas) {
      requestAnimationFrame((n) => this.renderPreview(n));
      return;
    }

    const mirrored = [Direction.Right, Direction.Up].includes(
      this.direction ?? Direction.Down,
    );

    if (mirrored) {
      this.offscreenContext.save();
      this.offscreenContext.scale(-1, 1);
      this.offscreenContext.translate(-this.offscreen.width, 0);
    }

    this.offscreenContext.drawImage(
      atlas,
      frame.x,
      frame.y,
      frame.w,
      frame.h,
      Math.floor(
        (this.offscreen.width >> 1) +
          (mirrored ? frame.mirroredXOffset : frame.xOffset),
      ),
      this.offscreen.height + frame.yOffset - 20,
      frame.w,
      frame.h,
    );

    if (mirrored) {
      this.offscreenContext.restore();
    }

    this.previewImage.src = this.offscreen.toDataURL();

    requestAnimationFrame((n) => this.renderPreview(n));
  }

  private buy() {
    const packet = new BarberBuyClientPacket();
    packet.hairStyle = this.hairStyle;
    packet.hairColor = this.hairColor;
    packet.sessionId = this.client.sessionId;
    this.client.bus.send(packet);
  }
}
