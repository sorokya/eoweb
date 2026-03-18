import { playSfxById, SfxId } from '../../sfx';
import { AlertDialog, getUiFrameworkRuntime } from '../../ui-framework';

import './small-alert-large-header.css';

export class SmallAlertLargeHeader {
  private readonly dialog: AlertDialog;

  constructor() {
    const runtime = getUiFrameworkRuntime();
    this.dialog = new AlertDialog(runtime, {
      id: 'small-alert',
      title: 'Error',
      body: '',
      modal: true,
      classNames: {
        panel:
          'ui-framework-alert ui-framework-alert--small-alert-large-header',
        title: 'ui-framework-alert__title',
        body: 'ui-framework-alert__message',
        buttonRow: 'ui-framework-alert__buttons',
      },
      button: {
        label: 'OK',
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
}
