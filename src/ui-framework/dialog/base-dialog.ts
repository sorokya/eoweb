import type { UiFrameworkRuntime, UiSurfaceLifecycleContext } from '../types';
import type { UISurfaceController } from '../window-manager';
import {
  applyDialogClassNames,
  createDialogActionButton,
  createDialogBodyElement,
  createDialogButtonRowElement,
  createDialogFooterElement,
  createDialogTitleElement,
  setDialogBodyElementContent,
} from './dialog-structure';
import type {
  BaseDialogActionConfig,
  BaseDialogBodyMount,
  BaseDialogBodyUnmount,
  BaseDialogController,
  BaseDialogDefinition,
} from './dialog-types';

function normalizeIdentifier(id: string, label: string): string {
  const normalizedId = id.trim();
  if (!normalizedId) {
    throw new Error(`${label} cannot be empty.`);
  }

  return normalizedId;
}

function normalizeDialogDefinition(
  definition: BaseDialogDefinition,
): BaseDialogDefinition {
  return {
    ...definition,
    id: normalizeIdentifier(definition.id, 'Base dialog id'),
    mountId:
      definition.mountId === undefined
        ? undefined
        : normalizeIdentifier(definition.mountId, 'Base dialog mount id'),
  };
}

function shouldCloseByDefault(action: BaseDialogActionConfig): boolean {
  if (action.closeOnSelect !== undefined) {
    return action.closeOnSelect;
  }

  return action.kind === 'ok' || action.kind === 'cancel';
}

export class BaseDialog implements BaseDialogController {
  readonly runtime: UiFrameworkRuntime;
  readonly definition: Readonly<BaseDialogDefinition>;
  readonly element: HTMLDivElement;
  readonly panelElement: HTMLDivElement;
  readonly titleElement: HTMLHeadingElement;
  readonly bodyElement: HTMLDivElement;
  readonly footerElement: HTMLDivElement;
  readonly buttonRowElement: HTMLDivElement;

  private readonly surfaceController: UISurfaceController;
  private readonly closeOnEscape: boolean;
  private readonly closeOnBackdropClick: boolean;
  private backdropElement: HTMLDivElement | null = null;
  private opened = false;
  private bodyUnmount: BaseDialogBodyUnmount | null = null;

  private readonly onDocumentKeydown = (event: KeyboardEvent): void => {
    if (!this.opened || !this.closeOnEscape || event.key !== 'Escape') {
      return;
    }

    event.preventDefault();
    this.close();
  };

  constructor(runtime: UiFrameworkRuntime, definition: BaseDialogDefinition) {
    this.runtime = runtime;
    this.definition = normalizeDialogDefinition(definition);
    this.closeOnEscape = definition.closeOnEscape ?? true;
    this.closeOnBackdropClick =
      definition.closeOnBackdropClick ?? !definition.modal;
    this.element = document.createElement('div');
    this.element.classList.add(
      'ui-framework-dialog',
      'ui-framework-dialog--dark-translucent',
    );
    this.element.dataset.uiFrameworkDialogId = this.definition.id;

    this.panelElement = document.createElement('div');
    this.panelElement.classList.add(
      'ui-framework-dialog__panel',
      'ui-framework-dialog__panel--dark-translucent',
    );
    this.panelElement.role = 'dialog';
    this.panelElement.ariaModal = String(Boolean(this.definition.modal));
    this.panelElement.dataset.uiFrameworkDialogPanel = this.definition.id;

    this.titleElement = createDialogTitleElement(this.definition.title ?? '');
    this.titleElement.id = `${this.definition.id}-title`;
    this.panelElement.setAttribute('aria-labelledby', this.titleElement.id);

    this.bodyElement = createDialogBodyElement();
    this.footerElement = createDialogFooterElement();
    this.buttonRowElement = createDialogButtonRowElement();

    this.footerElement.append(this.buttonRowElement);
    this.panelElement.append(
      this.titleElement,
      this.bodyElement,
      this.footerElement,
    );
    this.element.append(this.panelElement);

    applyDialogClassNames(this.element, this.definition.classNames?.root);
    applyDialogClassNames(this.panelElement, this.definition.classNames?.panel);
    applyDialogClassNames(this.titleElement, this.definition.classNames?.title);
    applyDialogClassNames(this.bodyElement, this.definition.classNames?.body);
    applyDialogClassNames(
      this.footerElement,
      this.definition.classNames?.footer,
    );
    applyDialogClassNames(
      this.buttonRowElement,
      this.definition.classNames?.buttonRow,
    );

    const externallyDefinedHooks = this.definition.hooks;
    const initiallyOpen =
      this.definition.openOnCreate ?? this.definition.initiallyOpen ?? false;
    this.surfaceController = runtime.registerDialog({
      kind: 'dialog',
      id: this.definition.id,
      mountId: this.definition.mountId,
      element: this.element,
      modal: this.definition.modal,
      centered: this.definition.centered,
      initiallyOpen,
      initiallyVisible: this.definition.initiallyVisible ?? initiallyOpen,
      removeOnDispose: this.definition.removeOnDispose ?? true,
      hooks: {
        onShow: (context) => {
          externallyDefinedHooks?.onShow?.(context);
        },
        onHide: (context) => {
          externallyDefinedHooks?.onHide?.(context);
        },
        onOpen: (context) => {
          this.handleOpen(context);
          externallyDefinedHooks?.onOpen?.(context);
        },
        onClose: (context) => {
          this.handleClose();
          externallyDefinedHooks?.onClose?.(context);
        },
        onDispose: (context) => {
          this.handleDispose();
          externallyDefinedHooks?.onDispose?.(context);
        },
      },
    });

    if (this.definition.body !== undefined) {
      this.setBodyContent(this.definition.body);
    }
    if (this.definition.bodyMount) {
      this.mountBody(this.definition.bodyMount);
    }

    this.setActions(this.definition.actions ?? []);
  }

  open(): void {
    this.surfaceController.open();
  }

  close(): void {
    this.surfaceController.close();
  }

  isOpen(): boolean {
    return this.opened;
  }

  setTitle(title: string): void {
    const normalizedTitle = title.trim();
    this.titleElement.textContent = normalizedTitle;
    this.titleElement.classList.toggle(
      'ui-framework-dialog__title--hidden',
      !normalizedTitle,
    );
  }

  setBodyText(text: string): void {
    this.setBodyContent(text);
  }

  setBodyContent(content: string | Node | readonly (string | Node)[]): void {
    this.unmountBody();
    setDialogBodyElementContent(this.bodyElement, content);
  }

  mountBody(mount: BaseDialogBodyMount): void {
    this.unmountBody();
    this.bodyElement.replaceChildren();

    const unmount = mount(this.bodyElement, this);
    this.bodyUnmount = typeof unmount === 'function' ? unmount : null;
  }

  setActions(actions: readonly BaseDialogActionConfig[]): void {
    this.buttonRowElement.replaceChildren();

    for (const action of actions) {
      const button = createDialogActionButton(action);
      button.addEventListener('click', (event) => {
        void this.selectAction(action, button, event as MouseEvent);
      });
      this.buttonRowElement.append(button);
    }

    this.footerElement.classList.toggle(
      'ui-framework-dialog__footer--hidden',
      actions.length === 0,
    );
  }

  destroy(): void {
    this.surfaceController.dispose();
    this.unmountBody();
  }

  private unmountBody(): void {
    if (!this.bodyUnmount) {
      return;
    }

    this.bodyUnmount();
    this.bodyUnmount = null;
  }

  private async selectAction(
    action: BaseDialogActionConfig,
    button: HTMLButtonElement,
    event: MouseEvent,
  ): Promise<void> {
    const closeFallback = shouldCloseByDefault(action);
    if (!action.onSelect) {
      if (closeFallback) {
        this.close();
      }
      return;
    }

    const wasDisabled = button.disabled;
    button.disabled = true;

    try {
      const result = await action.onSelect({
        dialog: this,
        action,
        button,
        event,
      });
      const shouldClose = typeof result === 'boolean' ? result : closeFallback;
      if (shouldClose) {
        this.close();
      }
    } catch (error) {
      console.error(`Dialog action "${action.id}" failed.`, error);
    } finally {
      button.disabled = wasDisabled || Boolean(action.disabled);
    }
  }

  private handleOpen(context: UiSurfaceLifecycleContext): void {
    this.opened = true;

    if (this.closeOnEscape) {
      document.addEventListener('keydown', this.onDocumentKeydown);
    }

    this.backdropElement = context.mount.querySelector<HTMLDivElement>(
      `[data-ui-framework-backdrop-for="${this.definition.id}"]`,
    );
    if (this.closeOnBackdropClick) {
      this.backdropElement?.addEventListener('click', this.onBackdropClick);
    }
  }

  private handleClose(): void {
    if (!this.opened) {
      return;
    }

    this.opened = false;
    document.removeEventListener('keydown', this.onDocumentKeydown);
    this.backdropElement?.removeEventListener('click', this.onBackdropClick);
  }

  private handleDispose(): void {
    this.handleClose();
    this.backdropElement = null;
    this.unmountBody();
  }

  private readonly onBackdropClick = (): void => {
    this.close();
  };
}
