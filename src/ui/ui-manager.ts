import type { Client } from '../client';
import type { Base } from './base-ui';
import { ComponentId } from './component-id';
import { CreateAccountDialog } from './pre-game/create-account-dialog';
import { LoginDialog } from './pre-game/login-dialog/login-dialog';
import { MainMenu } from './pre-game/main-menu';
import { Cover } from './shared/cover';
import { DialogContainer } from './shared/dialog-container';

export class UIManager {
  private baseComponents: Map<ComponentId, Base> = new Map();
  private dialogContainer: DialogContainer;
  private dialogs: Map<ComponentId, Base> = new Map();
  private messageBoxContainer: DialogContainer;
  private messageBoxes: Map<ComponentId, Base> = new Map();
  private cover: Cover;

  hideAll() {
    for (const child of this.baseComponents.values()) {
      child.hide();
    }
    for (const child of this.dialogs.values()) {
      child.hide();
    }
    for (const child of this.baseComponents.values()) {
      child.hide();
    }
    this.cover.hide();
    this.dialogContainer.hide();
    this.messageBoxContainer.hide();
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

    this.dialogContainer = new DialogContainer(parent);
    this.dialogs.set(
      ComponentId.Login,
      new LoginDialog(this.dialogContainer.el, client),
    );

    this.dialogs.set(
      ComponentId.CreateAccount,
      new CreateAccountDialog(this.dialogContainer.el, client),
    );

    this.messageBoxContainer = new DialogContainer(parent);

    this.hideAll();
  }
}
