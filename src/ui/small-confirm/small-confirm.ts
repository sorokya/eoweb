import { playSfxById, SfxId } from '../../sfx';
import { ConfirmationDialog, getUiFrameworkRuntime } from '../../ui-framework';

import './small-confirm.css';

export class SmallConfirm {
  private readonly dialog: ConfirmationDialog;
  private callback: (() => void) | null = null;
  private keepOpen = false;

  constructor() {
    const runtime = getUiFrameworkRuntime();
    this.dialog = new ConfirmationDialog(runtime, {
      id: 'small-confirm',
      title: 'Confirm',
      body: '',
      modal: true,
      classNames: {
        panel: 'ui-framework-confirm ui-framework-confirm--small-confirm',
        title: 'ui-framework-confirm__title',
        body: 'ui-framework-confirm__message',
        buttonRow: 'ui-framework-confirm__buttons',
      },
      confirmButton: {
        label: 'OK',
        onSelect: () => {
          playSfxById(SfxId.ButtonClick);
          this.callback?.();
          return !this.keepOpen;
        },
      },
      cancelButton: {
        label: 'Cancel',
        onSelect: () => {
          playSfxById(SfxId.ButtonClick);
          return undefined;
        },
      },
    });
  }

  show() {
    this.dialog.open();
  }

  hide() {
    this.dialog.close();
  }

  toggle() {
    if (this.dialog.isOpen()) {
      this.hide();
      return;
    }

    this.show();
  }

  setContent(message: string, title = 'Error') {
    this.dialog.setContent(message, title);
  }

  setCallback(callback: () => void, keepOpen = false) {
    this.callback = callback;
    this.keepOpen = keepOpen;
  }
}
