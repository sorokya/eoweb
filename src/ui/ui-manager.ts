import type { Client } from '../client';
import type { Base } from './base-ui';
import { ComponentId } from './component-id';
import { MainMenu } from './pre-game/main-menu';
import { Cover } from './shared/cover';
import { DialogContainer } from './shared/dialog-container';

export class UIManager {
  private baseComponents: Map<ComponentId, Base> = new Map();
  private dialogs: Map<ComponentId, Base> = new Map();
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
  }

  showBaseComponent(id: ComponentId) {
    const component = this.baseComponents.get(id);
    if (!component) {
      throw new Error('UIManager: No base component with the given ID');
    }
    component.show();
  }

  constructor(parent: HTMLElement, client: Client) {
    this.cover = new Cover(parent);
    this.baseComponents.set(ComponentId.MainMenu, new MainMenu(parent, client));

    const dialogContainer = new DialogContainer(parent);
    const messageBoxContainer = new DialogContainer(parent);

    this.hideAll();
  }
}
