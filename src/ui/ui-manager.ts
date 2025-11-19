import type { Client } from '../client';
import type { Base } from './base-ui';
import { ComponentId } from './component-id';
import { CharacterSelect } from './pre-game/character-select';
import { CreateAccountDialog } from './pre-game/create-account-dialog';
import { LoginDialog } from './pre-game/login-dialog/login-dialog';
import { MainMenu } from './pre-game/main-menu';
import type { BaseAlert } from './shared/base-alert';
import { Cover } from './shared/cover';
import { DialogContainer } from './shared/dialog-container';
import { SmallAlertLargeHeader } from './shared/small-alert-large-header';

export class UIManager {
  private baseComponents: Map<ComponentId, Base> = new Map();
  private dialogContainer: DialogContainer;
  private dialogs: Map<ComponentId, Base> = new Map();
  private alertContainer: DialogContainer;
  private alerts: Map<ComponentId, BaseAlert> = new Map();
  private cover: Cover;

  hideAll() {
    for (const child of this.baseComponents.values()) {
      child.hide();
    }
    for (const child of this.dialogs.values()) {
      child.hide();
    }
    for (const child of this.alerts.values()) {
      child.hide();
    }
    this.cover.hide();
    this.dialogContainer.hide();
    this.alertContainer.hide();
  }

  showAlert(title: string, message: string, id: ComponentId) {
    const alert = this.alerts.get(id);
    if (!alert) {
      throw new Error('UIManager: No alert with the given ID');
    }

    alert.setContent(title, message);
    this.alertContainer.show();
    this.cover.show();
    alert.show();
  }

  dismissAlert(id?: ComponentId) {
    if (id) {
      const alert = this.alerts.get(id);
      if (alert) {
        alert.hide();
      }
    } else {
      for (const child of this.alerts.values()) {
        child.hide();
      }
    }

    const alertVisible = Array.from(this.alerts.values()).some(
      (a) => !a.hidden,
    );

    const dialogVisible = Array.from(this.dialogs.values()).some(
      (d) => !d.hidden,
    );

    if (!dialogVisible && !alertVisible) {
      this.cover.hide();
    }

    if (!alertVisible) {
      this.alertContainer.hide();
    }
  }

  dismissDialog(id?: ComponentId) {
    if (id) {
      const dialog = this.dialogs.get(id);
      if (dialog) {
        dialog.hide();
      }
    } else {
      for (const child of this.dialogs.values()) {
        child.hide();
      }
    }

    const alertVisible = Array.from(this.alerts.values()).some(
      (a) => !a.hidden,
    );

    const dialogVisible = Array.from(this.dialogs.values()).some(
      (d) => !d.hidden,
    );

    if (!dialogVisible && !alertVisible) {
      this.cover.hide();
    }

    if (!dialogVisible) {
      this.dialogContainer.hide();
    }
  }

  showBaseComponent(id: ComponentId) {
    const component = this.baseComponents.get(id);
    if (!component) {
      throw new Error('UIManager: No base component with the given ID');
    }
    component.show();
  }

  showDialog(id: ComponentId) {
    const dialog = this.dialogs.get(id);
    if (!dialog) {
      throw new Error('UIManager: No dialog with the given ID');
    }

    this.dialogContainer.show();
    this.cover.show();
    dialog.show();
  }

  constructor(parent: HTMLElement, client: Client) {
    this.cover = new Cover(parent);
    this.baseComponents.set(ComponentId.MainMenu, new MainMenu(parent, client));
    this.baseComponents.set(
      ComponentId.CharacterSelect,
      new CharacterSelect(parent, client),
    );

    this.dialogContainer = new DialogContainer(parent);
    this.dialogs.set(
      ComponentId.Login,
      new LoginDialog(this.dialogContainer.el, client),
    );

    this.dialogs.set(
      ComponentId.CreateAccount,
      new CreateAccountDialog(this.dialogContainer.el, client),
    );

    this.alertContainer = new DialogContainer(parent);
    this.alerts.set(
      ComponentId.SmallAlertLargeHeader,
      new SmallAlertLargeHeader(this.alertContainer.el, client),
    );

    this.hideAll();
  }
}
