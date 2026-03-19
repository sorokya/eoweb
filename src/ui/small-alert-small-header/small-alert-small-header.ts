import { playSfxById, SfxId } from '../../sfx';
import { AlertDialog, getUiFrameworkRuntime } from '../../ui-framework';

import './small-alert-small-header.css';

export class SmallAlertSmallHeader {
  private readonly dialog: AlertDialog;

  constructor() {
    const runtime = getUiFrameworkRuntime();
    this.dialog = new AlertDialog(runtime, {
      id: 'small-alert-small-header',
      title: 'Error',
      body: '',
      modal: true,
      classNames: {
        panel:
          'ui-framework-alert ui-framework-alert--small-alert-small-header',
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
