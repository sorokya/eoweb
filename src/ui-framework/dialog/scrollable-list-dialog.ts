import type {
  UiDialogDefinition,
  UiDialogScrollableListLayout,
  UiFrameworkRuntime,
  UiSurfaceLifecycleContext,
  UiSurfaceLifecycleHooks,
} from '../types';
import type { UISurfaceController } from '../window-manager';
import {
  applyDialogClassNames,
  createDialogButtonRowElement,
  createDialogBodyElement,
  createDialogFooterElement,
  createDialogTitleElement,
} from './dialog-structure';
import type {
  BaseDialogActionKind,
  BaseDialogActionTone,
  BaseDialogClassNames,
} from './dialog-types';

const DEFAULT_SCROLL_HANDLE_MIN_HEIGHT_PX = 18;

type EntrySelectSource = 'row' | 'subtext';

function normalizeIdentifier(id: string, label: string): string {
  const normalizedId = id.trim();
  if (!normalizedId) {
    throw new Error(`${label} cannot be empty.`);
  }
  return normalizedId;
}

function shouldCloseByDefault(action: ScrollableListDialogActionConfig): boolean {
  if (action.closeOnSelect !== undefined) {
    return action.closeOnSelect;
  }
  return action.kind === 'ok' || action.kind === 'cancel';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function createActionButton(
  action: ScrollableListDialogActionConfig,
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.classList.add('ui-framework-dialog__button');
  if (action.kind) {
    button.classList.add(`ui-framework-dialog__button--${action.kind}`);
  }
  if (action.tone) {
    button.classList.add(`ui-framework-dialog__button--${action.tone}`);
  }
  applyDialogClassNames(button, action.className);
  button.dataset.dialogActionId = action.id;
  button.textContent = action.label;
  button.disabled = Boolean(action.disabled);
  return button;
}

export interface ScrollableListDialogClassNames extends BaseDialogClassNames {
  listShell?: string;
  viewport?: string;
  content?: string;
  scrollbar?: string;
  scrollHandle?: string;
}

export interface ScrollableListDialogEntrySelectContext<
  TEntry,
  TItem,
  TSkill,
> {
  dialog: ScrollableListDialog<TItem, TSkill>;
  entry: TEntry;
  rowElement: HTMLDivElement;
  event: MouseEvent;
  source: EntrySelectSource;
}

export type ScrollableListDialogEntrySelectHandler<TEntry, TItem, TSkill> = (
  context: ScrollableListDialogEntrySelectContext<TEntry, TItem, TSkill>,
) => void | Promise<void>;

export interface ScrollableListDialogActionContext<
  TValue = unknown,
  TItem = never,
  TSkill = never,
> {
  dialog: ScrollableListDialog<TItem, TSkill>;
  action: ScrollableListDialogActionConfig<TValue, TItem, TSkill>;
  button: HTMLButtonElement;
  event: MouseEvent;
}

export type ScrollableListDialogActionHandlerResult =
  | boolean
  | undefined
  | Promise<boolean | undefined>;

export type ScrollableListDialogActionHandler<
  TValue = unknown,
  TItem = never,
  TSkill = never,
> = (
  context: ScrollableListDialogActionContext<TValue, TItem, TSkill>,
) => ScrollableListDialogActionHandlerResult;

export interface ScrollableListDialogActionConfig<
  TValue = unknown,
  TItem = never,
  TSkill = never,
> {
  id: string;
  label: string;
  kind?: BaseDialogActionKind;
  tone?: BaseDialogActionTone;
  value?: TValue;
  className?: string;
  disabled?: boolean;
  closeOnSelect?: boolean;
  onSelect?: ScrollableListDialogActionHandler<TValue, TItem, TSkill>;
}

export interface ScrollableListDialogIconTextEntry<TItem = never, TSkill = never> {
  kind: 'icon-text';
  icon: string | number | Node | ((container: HTMLDivElement) => void | Promise<void>);
  label: string;
  subtext?: string;
  className?: string;
  disabled?: boolean;
  onSelect?: ScrollableListDialogEntrySelectHandler<
    ScrollableListDialogIconTextEntry<TItem, TSkill>,
    TItem,
    TSkill
  >;
  onSubtextSelect?: ScrollableListDialogEntrySelectHandler<
    ScrollableListDialogIconTextEntry<TItem, TSkill>,
    TItem,
    TSkill
  >;
}

export interface ScrollableListDialogItemEntry<TItem, TSkill = never> {
  kind: 'item';
  item: TItem;
  label: string;
  subtext?: string;
  className?: string;
  tooltip?: string;
  disabled?: boolean;
  iconRenderer?: (
    container: HTMLDivElement,
    item: TItem,
  ) => void | Promise<void>;
  onSelect?: ScrollableListDialogEntrySelectHandler<
    ScrollableListDialogItemEntry<TItem, TSkill>,
    TItem,
    TSkill
  >;
  onSubtextSelect?: ScrollableListDialogEntrySelectHandler<
    ScrollableListDialogItemEntry<TItem, TSkill>,
    TItem,
    TSkill
  >;
}

export interface ScrollableListDialogSkillEntry<TItem = never, TSkill = never> {
  kind: 'skill';
  skill: TSkill;
  label: string;
  subtext?: string;
  className?: string;
  disabled?: boolean;
  iconRenderer?: (
    container: HTMLDivElement,
    skill: TSkill,
  ) => void | Promise<void>;
  onSelect?: ScrollableListDialogEntrySelectHandler<
    ScrollableListDialogSkillEntry<TItem, TSkill>,
    TItem,
    TSkill
  >;
  onSubtextSelect?: ScrollableListDialogEntrySelectHandler<
    ScrollableListDialogSkillEntry<TItem, TSkill>,
    TItem,
    TSkill
  >;
}

export interface ScrollableListDialogTextEntry<TItem = never, TSkill = never> {
  kind: 'text';
  text: string;
  className?: string;
  disabled?: boolean;
  actionLink?: boolean;
  onSelect?: ScrollableListDialogEntrySelectHandler<
    ScrollableListDialogTextEntry<TItem, TSkill>,
    TItem,
    TSkill
  >;
}

export type ScrollableListDialogEntry<TItem, TSkill> =
  | ScrollableListDialogItemEntry<TItem, TSkill>
  | ScrollableListDialogSkillEntry<TItem, TSkill>
  | ScrollableListDialogIconTextEntry<TItem, TSkill>
  | ScrollableListDialogTextEntry<TItem, TSkill>;

export function createScrollableListItemEntry<TItem, TSkill = never>(
  entry: Omit<ScrollableListDialogItemEntry<TItem, TSkill>, 'kind'>,
): ScrollableListDialogItemEntry<TItem, TSkill> {
  return { kind: 'item', ...entry };
}

export function createScrollableListSkillEntry<TItem = never, TSkill = never>(
  entry: Omit<ScrollableListDialogSkillEntry<TItem, TSkill>, 'kind'>,
): ScrollableListDialogSkillEntry<TItem, TSkill> {
  return { kind: 'skill', ...entry };
}

export function createScrollableListIconTextEntry<TItem = never, TSkill = never>(
  entry: Omit<ScrollableListDialogIconTextEntry<TItem, TSkill>, 'kind'>,
): ScrollableListDialogIconTextEntry<TItem, TSkill> {
  return { kind: 'icon-text', ...entry };
}

export function createScrollableListTextEntry<TItem = never, TSkill = never>(
  entry: Omit<ScrollableListDialogTextEntry<TItem, TSkill>, 'kind'>,
): ScrollableListDialogTextEntry<TItem, TSkill> {
  return { kind: 'text', ...entry };
}

export interface ScrollableListDialogDefinition<TItem, TSkill>
  extends Omit<UiDialogDefinition, 'kind' | 'element' | 'layout' | 'hooks'> {
  title?: string;
  actions?: readonly ScrollableListDialogActionConfig<unknown, TItem, TSkill>[];
  entries?: readonly ScrollableListDialogEntry<TItem, TSkill>[];
  closeOnEscape?: boolean;
  closeOnBackdropClick?: boolean;
  classNames?: ScrollableListDialogClassNames;
  listLayout?: Omit<
    UiDialogScrollableListLayout,
    'variant' | 'viewportSelector' | 'contentSelector'
  >;
  hooks?: UiSurfaceLifecycleHooks;
  openOnCreate?: boolean;
}

interface ScrollHandleDragState {
  pointerId: number;
  pointerOffsetY: number;
}

export class ScrollableListDialog<TItem = never, TSkill = never> {
  readonly runtime: UiFrameworkRuntime;
  readonly definition: Readonly<ScrollableListDialogDefinition<TItem, TSkill>>;
  readonly controller: UISurfaceController;
  readonly element: HTMLDivElement;
  readonly titleElement: HTMLHeadingElement;
  readonly bodyElement: HTMLDivElement;
  readonly listShellElement: HTMLDivElement;
  readonly viewportElement: HTMLDivElement;
  readonly contentElement: HTMLDivElement;
  readonly scrollbarElement: HTMLDivElement;
  readonly scrollHandleElement: HTMLDivElement;
  readonly footerElement: HTMLDivElement;
  readonly buttonRowElement: HTMLDivElement;

  private readonly closeOnEscape: boolean;
  private readonly closeOnBackdropClick: boolean;
  private entries: readonly ScrollableListDialogEntry<TItem, TSkill>[] = [];
  private listListenersBound = false;
  private isDisposed = false;
  private opened = false;
  private scrollDragState: ScrollHandleDragState | null = null;
  private backdropElement: HTMLDivElement | null = null;
  private readonly resizeObserver: ResizeObserver | null;

  private readonly onDocumentKeydown = (event: KeyboardEvent): void => {
    if (!this.opened || !this.closeOnEscape || event.key !== 'Escape') {
      return;
    }
    event.preventDefault();
    this.close();
  };

  private readonly onBackdropClick = (): void => {
    if (!this.opened || !this.closeOnBackdropClick) {
      return;
    }
    this.close();
  };

  private readonly onViewportScroll = (): void => {
    this.syncScrollHandlePosition();
  };

  private readonly onHandlePointerDown = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    const handleRect = this.scrollHandleElement.getBoundingClientRect();
    this.scrollDragState = {
      pointerId: event.pointerId,
      pointerOffsetY: clamp(
        event.clientY - handleRect.top,
        0,
        Math.max(handleRect.height, 0),
      ),
    };

    this.scrollHandleElement.setPointerCapture(event.pointerId);
    window.addEventListener('pointermove', this.onWindowPointerMove, {
      passive: false,
    });
    window.addEventListener('pointerup', this.onWindowPointerUp);
    window.addEventListener('pointercancel', this.onWindowPointerCancel);

    this.updateScrollFromPointer(event.clientY);
    event.preventDefault();
  };

  private readonly onWindowPointerMove = (event: PointerEvent): void => {
    if (!this.scrollDragState || event.pointerId !== this.scrollDragState.pointerId) {
      return;
    }

    this.updateScrollFromPointer(event.clientY);
    event.preventDefault();
  };

  private readonly onWindowPointerUp = (event: PointerEvent): void => {
    if (!this.scrollDragState || event.pointerId !== this.scrollDragState.pointerId) {
      return;
    }
    this.endScrollHandleDrag();
  };

  private readonly onWindowPointerCancel = (event: PointerEvent): void => {
    if (!this.scrollDragState || event.pointerId !== this.scrollDragState.pointerId) {
      return;
    }
    this.endScrollHandleDrag();
  };

  constructor(
    runtime: UiFrameworkRuntime,
    definition: ScrollableListDialogDefinition<TItem, TSkill>,
  ) {
    this.runtime = runtime;
    this.definition = {
      ...definition,
      id: normalizeIdentifier(definition.id, 'Scrollable list dialog id'),
      mountId:
        definition.mountId === undefined
          ? undefined
          : normalizeIdentifier(
              definition.mountId,
              'Scrollable list dialog mount id',
            ),
    };

    this.closeOnEscape = definition.closeOnEscape ?? true;
    this.closeOnBackdropClick = definition.closeOnBackdropClick ?? true;
    this.resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            this.syncScrollHandlePosition();
          });

    this.element = document.createElement('div');
    this.element.classList.add(
      'ui-framework-dialog__panel',
      'ui-framework-dialog__panel--dark-translucent',
      'ui-framework-scrollable-list-dialog',
    );
    this.element.role = 'dialog';
    this.element.ariaModal = String(Boolean(this.definition.modal));
    this.element.dataset.uiFrameworkDialogId = this.definition.id;

    this.titleElement = createDialogTitleElement(this.definition.title ?? '');
    this.titleElement.id = `${this.definition.id}-title`;
    this.element.setAttribute('aria-labelledby', this.titleElement.id);

    this.bodyElement = createDialogBodyElement();
    this.bodyElement.classList.add('ui-framework-scrollable-list-dialog__body');

    this.listShellElement = document.createElement('div');
    this.listShellElement.classList.add('ui-framework-scrollable-list-dialog__list-shell');

    this.viewportElement = document.createElement('div');
    this.viewportElement.classList.add('ui-framework-scrollable-list-dialog__viewport');

    this.contentElement = document.createElement('div');
    this.contentElement.classList.add('ui-framework-scrollable-list-dialog__content');
    this.viewportElement.append(this.contentElement);

    this.scrollbarElement = document.createElement('div');
    this.scrollbarElement.classList.add('ui-framework-scrollable-list-dialog__scrollbar');

    this.scrollHandleElement = document.createElement('div');
    this.scrollHandleElement.classList.add(
      'ui-framework-scrollable-list-dialog__scroll-handle',
    );
    this.scrollbarElement.append(this.scrollHandleElement);

    this.listShellElement.append(this.viewportElement, this.scrollbarElement);
    this.bodyElement.append(this.listShellElement);

    this.footerElement = createDialogFooterElement();
    this.buttonRowElement = createDialogButtonRowElement();
    this.footerElement.append(this.buttonRowElement);

    this.element.append(this.titleElement, this.bodyElement, this.footerElement);

    applyDialogClassNames(this.element, this.definition.classNames?.root);
    applyDialogClassNames(this.titleElement, this.definition.classNames?.title);
    applyDialogClassNames(this.bodyElement, this.definition.classNames?.body);
    applyDialogClassNames(this.footerElement, this.definition.classNames?.footer);
    applyDialogClassNames(
      this.buttonRowElement,
      this.definition.classNames?.buttonRow,
    );
    applyDialogClassNames(this.listShellElement, this.definition.classNames?.listShell);
    applyDialogClassNames(this.viewportElement, this.definition.classNames?.viewport);
    applyDialogClassNames(this.contentElement, this.definition.classNames?.content);
    applyDialogClassNames(this.scrollbarElement, this.definition.classNames?.scrollbar);
    applyDialogClassNames(
      this.scrollHandleElement,
      this.definition.classNames?.scrollHandle,
    );

    this.setActions(this.definition.actions ?? []);

    const externalHooks = this.definition.hooks;
    const initiallyOpen =
      definition.initiallyOpen ?? definition.openOnCreate ?? false;

    this.controller = runtime.registerDialog({
      kind: 'dialog',
      id: this.definition.id,
      mountId: this.definition.mountId,
      element: this.element,
      modal: this.definition.modal,
      centered: this.definition.centered,
      initiallyOpen,
      initiallyVisible: definition.initiallyVisible ?? initiallyOpen,
      removeOnDispose: definition.removeOnDispose ?? true,
      layout: {
        variant: 'scroll-list',
        maxHeightPx: this.definition.listLayout?.maxHeightPx,
        gapPx: this.definition.listLayout?.gapPx,
        viewportSelector: '.ui-framework-scrollable-list-dialog__viewport',
        contentSelector: '.ui-framework-scrollable-list-dialog__content',
      },
      hooks: {
        onShow: (context) => {
          externalHooks?.onShow?.(context);
        },
        onHide: (context) => {
          externalHooks?.onHide?.(context);
        },
        onOpen: (context) => {
          this.handleOpen(context);
          externalHooks?.onOpen?.(context);
        },
        onClose: (context) => {
          this.handleClose();
          externalHooks?.onClose?.(context);
        },
        onDispose: (context) => {
          this.handleDispose();
          externalHooks?.onDispose?.(context);
        },
      },
    });

    if (!this.controller.layout || this.controller.layout.variant !== 'scroll-list') {
      throw new Error(
        `Scrollable list dialog "${this.definition.id}" must resolve a scroll-list layout.`,
      );
    }

    this.setEntries(this.definition.entries ?? []);
  }

  open(): void {
    this.controller.open();
  }

  close(): void {
    this.controller.close();
  }

  show(): void {
    this.controller.show();
  }

  hide(): void {
    this.controller.hide();
  }

  bringToFront(): void {
    this.controller.bringToFront();
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

  setActions(
    actions: readonly ScrollableListDialogActionConfig<unknown, TItem, TSkill>[],
  ): void {
    this.buttonRowElement.replaceChildren();

    for (const action of actions) {
      const button = createActionButton(action);
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

  setEntries(entries: readonly ScrollableListDialogEntry<TItem, TSkill>[]): void {
    this.entries = [...entries];
    this.renderEntries();
  }

  clearEntries(): void {
    this.setEntries([]);
  }

  dispose(): void {
    this.controller.dispose();
  }

  private renderEntries(): void {
    this.contentElement.replaceChildren();
    for (const entry of this.entries) {
      this.contentElement.append(this.createEntryElement(entry));
    }
    this.syncScrollHandlePosition();
  }

  private createEntryElement(
    entry: ScrollableListDialogEntry<TItem, TSkill>,
  ): HTMLDivElement {
    switch (entry.kind) {
      case 'item':
        return this.createItemEntryElement(entry);
      case 'skill':
        return this.createSkillEntryElement(entry);
      case 'icon-text':
        return this.createIconTextEntryElement(entry);
      case 'text':
        return this.createTextEntryElement(entry);
    }
  }

  private createItemEntryElement(
    entry: ScrollableListDialogItemEntry<TItem, TSkill>,
  ): HTMLDivElement {
    const row = this.createIconLabelRow(entry.kind, entry.className, entry.disabled);
    if (entry.tooltip) {
      row.title = entry.tooltip;
    }

    const iconElement = row.querySelector<HTMLDivElement>(
      '.ui-framework-scrollable-list-dialog__row-icon',
    );
    if (iconElement && entry.iconRenderer) {
      void Promise.resolve(entry.iconRenderer(iconElement, entry.item)).catch((error) => {
        console.error(`Failed to render item icon for "${this.definition.id}".`, error);
      });
    }

    this.setIconLabelRowText(
      row,
      entry.label,
      entry.subtext,
      entry.onSubtextSelect
        ? (event) => {
            void this.invokeEntrySelect(
              entry,
              row,
              event,
              'subtext',
              entry.onSubtextSelect,
            );
          }
        : undefined,
      entry.disabled,
    );

    this.bindRowSelection(entry, row, entry.onSelect);
    return row;
  }

  private createSkillEntryElement(
    entry: ScrollableListDialogSkillEntry<TItem, TSkill>,
  ): HTMLDivElement {
    const row = this.createIconLabelRow(entry.kind, entry.className, entry.disabled);
    const iconElement = row.querySelector<HTMLDivElement>(
      '.ui-framework-scrollable-list-dialog__row-icon',
    );
    if (iconElement && entry.iconRenderer) {
      void Promise.resolve(entry.iconRenderer(iconElement, entry.skill)).catch((error) => {
        console.error(`Failed to render skill icon for "${this.definition.id}".`, error);
      });
    }

    this.setIconLabelRowText(
      row,
      entry.label,
      entry.subtext,
      entry.onSubtextSelect
        ? (event) => {
            void this.invokeEntrySelect(
              entry,
              row,
              event,
              'subtext',
              entry.onSubtextSelect,
            );
          }
        : undefined,
      entry.disabled,
    );

    this.bindRowSelection(entry, row, entry.onSelect);
    return row;
  }

  private createIconTextEntryElement(
    entry: ScrollableListDialogIconTextEntry<TItem, TSkill>,
  ): HTMLDivElement {
    const row = this.createIconLabelRow(entry.kind, entry.className, entry.disabled);
    const iconElement = row.querySelector<HTMLDivElement>(
      '.ui-framework-scrollable-list-dialog__row-icon',
    );
    if (iconElement) {
      this.renderIconTextSource(iconElement, entry.icon);
    }

    this.setIconLabelRowText(
      row,
      entry.label,
      entry.subtext,
      entry.onSubtextSelect
        ? (event) => {
            void this.invokeEntrySelect(
              entry,
              row,
              event,
              'subtext',
              entry.onSubtextSelect,
            );
          }
        : undefined,
      entry.disabled,
    );

    this.bindRowSelection(entry, row, entry.onSelect);
    return row;
  }

  private createTextEntryElement(
    entry: ScrollableListDialogTextEntry<TItem, TSkill>,
  ): HTMLDivElement {
    const row = document.createElement('div');
    row.classList.add(
      'ui-framework-scrollable-list-dialog__row',
      'ui-framework-scrollable-list-dialog__row--text',
    );
    applyDialogClassNames(row, entry.className);
    row.textContent = entry.text;

    if (entry.disabled) {
      row.classList.add('ui-framework-scrollable-list-dialog__row--disabled');
      return row;
    }

    if (entry.actionLink) {
      row.classList.add('ui-framework-scrollable-list-dialog__link');
    }

    this.bindRowSelection(entry, row, entry.onSelect);
    return row;
  }

  private createIconLabelRow(
    kind: ScrollableListDialogEntry<TItem, TSkill>['kind'],
    className: string | undefined,
    disabled: boolean | undefined,
  ): HTMLDivElement {
    const row = document.createElement('div');
    row.classList.add(
      'ui-framework-scrollable-list-dialog__row',
      `ui-framework-scrollable-list-dialog__row--${kind}`,
    );
    applyDialogClassNames(row, className);

    const iconElement = document.createElement('div');
    iconElement.classList.add('ui-framework-scrollable-list-dialog__row-icon');

    const textContainer = document.createElement('div');
    textContainer.classList.add('ui-framework-scrollable-list-dialog__row-main');

    row.append(iconElement, textContainer);

    if (disabled) {
      row.classList.add('ui-framework-scrollable-list-dialog__row--disabled');
    }
    return row;
  }

  private setIconLabelRowText(
    row: HTMLDivElement,
    label: string,
    subtext: string | undefined,
    onSubtextSelect: ((event: MouseEvent) => void) | undefined,
    disabled: boolean | undefined,
  ): void {
    const textContainer = row.querySelector<HTMLDivElement>(
      '.ui-framework-scrollable-list-dialog__row-main',
    );
    if (!textContainer) {
      return;
    }

    const labelElement = document.createElement('span');
    labelElement.classList.add('ui-framework-scrollable-list-dialog__row-label');
    labelElement.textContent = label;
    textContainer.append(labelElement);

    if (!subtext) {
      return;
    }

    const subtextElement = document.createElement('span');
    subtextElement.classList.add('ui-framework-scrollable-list-dialog__row-subtext');
    subtextElement.textContent = subtext;

    if (!disabled && onSubtextSelect) {
      subtextElement.classList.add('ui-framework-scrollable-list-dialog__link');
      subtextElement.addEventListener('click', (event) => {
        event.stopPropagation();
        onSubtextSelect(event as MouseEvent);
      });
    }

    textContainer.append(subtextElement);
  }

  private bindRowSelection<TEntry extends ScrollableListDialogEntry<TItem, TSkill>>(
    entry: TEntry,
    row: HTMLDivElement,
    handler: ScrollableListDialogEntrySelectHandler<TEntry, TItem, TSkill> | undefined,
  ): void {
    if (!handler || entry.disabled) {
      return;
    }

    row.classList.add('ui-framework-scrollable-list-dialog__row--interactive');
    row.addEventListener('click', (event) => {
      void this.invokeEntrySelect(entry, row, event as MouseEvent, 'row', handler);
    });
  }

  private async invokeEntrySelect<TEntry extends ScrollableListDialogEntry<TItem, TSkill>>(
    entry: TEntry,
    rowElement: HTMLDivElement,
    event: MouseEvent,
    source: EntrySelectSource,
    handler: ScrollableListDialogEntrySelectHandler<TEntry, TItem, TSkill>,
  ): Promise<void> {
    try {
      await handler({
        dialog: this,
        entry,
        rowElement,
        event,
        source,
      });
    } catch (error) {
      console.error(
        `Scrollable list dialog "${this.definition.id}" entry selection failed.`,
        error,
      );
    }
  }

  private renderIconTextSource(
    iconElement: HTMLDivElement,
    icon: ScrollableListDialogIconTextEntry['icon'],
  ): void {
    if (typeof icon === 'function') {
      void Promise.resolve(icon(iconElement)).catch((error) => {
        console.error(`Failed to render icon-text icon for "${this.definition.id}".`, error);
      });
      return;
    }

    if (icon instanceof Node) {
      iconElement.append(icon.cloneNode(true));
      return;
    }

    iconElement.classList.add('ui-framework-scrollable-list-dialog__row-icon--textual');
    iconElement.textContent = String(icon);
  }

  private syncScrollHandlePosition(): void {
    const trackHeight = this.scrollbarElement.clientHeight;
    if (trackHeight <= 0) {
      return;
    }

    const visibleHeight = this.viewportElement.clientHeight;
    const totalHeight = this.viewportElement.scrollHeight;
    const maxScrollTop = Math.max(totalHeight - visibleHeight, 0);
    const rawHandleHeight =
      totalHeight <= 0 ? trackHeight : (visibleHeight / totalHeight) * trackHeight;
    const handleHeight = Math.min(
      trackHeight,
      Math.max(DEFAULT_SCROLL_HANDLE_MIN_HEIGHT_PX, Math.floor(rawHandleHeight)),
    );
    this.scrollHandleElement.style.height = `${handleHeight}px`;

    const maxHandleTop = Math.max(trackHeight - handleHeight, 0);
    const scrollRatio = maxScrollTop > 0 ? this.viewportElement.scrollTop / maxScrollTop : 0;
    const handleTop = maxHandleTop * clamp(scrollRatio, 0, 1);
    this.scrollHandleElement.style.transform = `translateY(${handleTop}px)`;
    this.scrollbarElement.classList.toggle(
      'ui-framework-scrollable-list-dialog__scrollbar--inactive',
      maxScrollTop <= 0,
    );
  }

  private updateScrollFromPointer(clientY: number): void {
    if (!this.scrollDragState) {
      return;
    }

    const trackRect = this.scrollbarElement.getBoundingClientRect();
    const handleHeight = this.scrollHandleElement.getBoundingClientRect().height;
    const maxHandleTop = Math.max(trackRect.height - handleHeight, 0);
    if (maxHandleTop <= 0) {
      this.viewportElement.scrollTop = 0;
      return;
    }

    const absoluteHandleTop =
      clientY - trackRect.top - this.scrollDragState.pointerOffsetY;
    const clampedHandleTop = clamp(absoluteHandleTop, 0, maxHandleTop);
    const scrollRatio = clampedHandleTop / maxHandleTop;
    const maxScrollTop = Math.max(
      this.viewportElement.scrollHeight - this.viewportElement.clientHeight,
      0,
    );
    this.viewportElement.scrollTop = scrollRatio * maxScrollTop;
  }

  private endScrollHandleDrag(): void {
    if (!this.scrollDragState) {
      return;
    }

    const pointerId = this.scrollDragState.pointerId;
    this.scrollDragState = null;

    if (this.scrollHandleElement.hasPointerCapture(pointerId)) {
      this.scrollHandleElement.releasePointerCapture(pointerId);
    }

    window.removeEventListener('pointermove', this.onWindowPointerMove);
    window.removeEventListener('pointerup', this.onWindowPointerUp);
    window.removeEventListener('pointercancel', this.onWindowPointerCancel);
  }

  private bindListListeners(): void {
    if (this.listListenersBound || this.isDisposed) {
      return;
    }

    this.viewportElement.addEventListener('scroll', this.onViewportScroll, {
      passive: true,
    });
    this.scrollHandleElement.addEventListener(
      'pointerdown',
      this.onHandlePointerDown,
    );
    this.resizeObserver?.observe(this.viewportElement);
    this.resizeObserver?.observe(this.contentElement);
    this.listListenersBound = true;
  }

  private unbindListListeners(): void {
    if (!this.listListenersBound) {
      return;
    }

    this.viewportElement.removeEventListener('scroll', this.onViewportScroll);
    this.scrollHandleElement.removeEventListener(
      'pointerdown',
      this.onHandlePointerDown,
    );
    this.resizeObserver?.disconnect();
    this.listListenersBound = false;
    this.endScrollHandleDrag();
  }

  private handleOpen(context: UiSurfaceLifecycleContext): void {
    this.opened = true;
    this.backdropElement = context.mount.querySelector<HTMLDivElement>(
      `[data-ui-framework-backdrop-for="${this.definition.id}"]`,
    );

    this.bindListListeners();
    this.syncScrollHandlePosition();

    if (this.closeOnEscape) {
      document.addEventListener('keydown', this.onDocumentKeydown);
    }
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
    this.unbindListListeners();
  }

  private handleDispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.handleClose();
    this.isDisposed = true;
    this.backdropElement = null;
  }

  private async selectAction(
    action: ScrollableListDialogActionConfig<unknown, TItem, TSkill>,
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
}
