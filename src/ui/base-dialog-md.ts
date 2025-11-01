import mitt, { type EventType } from 'mitt';
import type { Client } from '../client';
import { playSfxById, SfxId } from '../sfx';
import { Base } from './base-ui';

export abstract class BaseDialogMd<
  TEvent extends Record<EventType, unknown>,
> extends Base {
  protected dialogContents: HTMLDivElement;
  protected client: Client;
  protected emitter = mitt<TEvent>();
  protected dialogs = document.getElementById('dialogs');

  private btnCancel: HTMLButtonElement;
  private label: HTMLSpanElement;
  private scrollHandle: HTMLDivElement;
  private open = false;

  constructor(client: Client, container: HTMLDivElement, labelText: string) {
    super();
    this.container = container;
    this.client = client;
    this.dialogContents = container.querySelector('.dialog-contents');
    this.btnCancel = container.querySelector('button[data-id="cancel"]');
    this.scrollHandle = container.querySelector('.scroll-handle');
    this.label = container.querySelector('.label');

    this.label.innerText = labelText;

    this.btnCancel.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      this.hide();
    });

    this.dialogContents.addEventListener('scroll', () => {
      this.setScrollThumbPosition();
    });

    this.scrollHandle.addEventListener('pointerdown', () => {
      const onPointerMove = (e: PointerEvent) => {
        const rect = this.dialogContents.getBoundingClientRect();
        const min = 30;
        const max = 212;
        const clampedY = Math.min(
          Math.max(e.clientY, rect.top + min),
          rect.top + max,
        );
        const scrollPercent = (clampedY - rect.top - min) / (max - min);
        const scrollHeight = this.dialogContents.scrollHeight;
        const clientHeight = this.dialogContents.clientHeight;
        this.dialogContents.scrollTop =
          scrollPercent * (scrollHeight - clientHeight);
      };

      const onPointerUp = () => {
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
      };

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
    });
  }

  on<Event extends keyof TEvent>(
    event: Event,
    handler: (data: TEvent[Event]) => void,
  ) {
    this.emitter.on(event, handler);
  }

  updateLabelText(newText: string) {
    this.label.innerText = newText;
  }

  setScrollThumbPosition() {
    const min = 60;
    const max = 212;
    const scrollTop = this.dialogContents.scrollTop;
    const scrollHeight = this.dialogContents.scrollHeight;
    const clientHeight = this.dialogContents.clientHeight;
    const scrollPercent = scrollTop / (scrollHeight - clientHeight);
    const clampedPercent = Math.min(Math.max(scrollPercent, 0), 1);
    const top = min + (max - min) * clampedPercent || min;
    this.scrollHandle.style.top = `${top}px`;
  }

  show() {
    this.render();
    this.container.classList.remove('hidden');
    this.dialogs.classList.remove('hidden');
    this.open = true;
    this.setScrollThumbPosition();
  }

  hide() {
    this.container.classList.add('hidden');
    this.open = false;

    if (!document.querySelector('#dialogs > div:not(.hidden)')) {
      this.dialogs.classList.add('hidden');
      this.client.typing = false;
    }
  }

  abstract render(): void;
}
