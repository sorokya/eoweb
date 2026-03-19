import { playSfxById, SfxId } from '../../sfx';
import { ConfirmationDialog, getUiFrameworkRuntime } from '../../ui-framework';

import './large-confirm-small-header.css';

export class LargeConfirmSmallHeader {
  private readonly dialog: ConfirmationDialog;
  private callback: (() => void) | null = null;

  constructor() {
    const runtime = getUiFrameworkRuntime();
    this.dialog = new ConfirmationDialog(runtime, {
      id: 'large-confirm-small-header',
      title: 'Confirm',
      body: '',
      modal: true,
      classNames: {
        panel:
          'ui-framework-confirm ui-framework-confirm--large-confirm-small-header',
        title: 'ui-framework-confirm__title',
        body: 'ui-framework-confirm__message',
        buttonRow: 'ui-framework-confirm__buttons',
      },
      confirmButton: {
        label: 'OK',
        onSelect: () => {
          playSfxById(SfxId.ButtonClick);
          this.callback?.();
          return undefined;
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

  setCallback(callback: () => void) {
    this.callback = callback;
  }
}
