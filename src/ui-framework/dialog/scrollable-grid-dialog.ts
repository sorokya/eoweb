import type { UiFrameworkRuntime, UiSurfaceLifecycleHooks } from '../types';
import type { UISurfaceController } from '../window-manager';
import { applyDialogClassNames } from './dialog-structure';
import type {
  ScrollableGridDialogController,
  ScrollableGridDialogDefinition,
  ScrollableGridDialogItemContract,
  ScrollableGridDialogMetaContent,
  ScrollableGridDialogTextContent,
} from './dialog-types';

const ROOT_CLASS = 'uiwm-scroll-grid-dialog';
const HEADER_CLASS = 'uiwm-scroll-grid-dialog__header';
const TITLE_CLASS = 'uiwm-scroll-grid-dialog__title';
const TITLE_HIDDEN_CLASS = 'uiwm-scroll-grid-dialog__title--hidden';
const BODY_CLASS = 'uiwm-scroll-grid-dialog__body';
const VIEWPORT_CLASS = 'uiwm-scroll-grid-dialog__viewport';
const GRID_CLASS = 'uiwm-scroll-grid-dialog__grid';
const TRACK_CLASS = 'uiwm-scroll-grid-dialog__scroll-track';
const TRACK_DISABLED_CLASS = 'uiwm-scroll-grid-dialog__scroll-track--disabled';
const HANDLE_CLASS = 'uiwm-scroll-grid-dialog__scroll-handle';
const HANDLE_DISABLED_CLASS =
  'uiwm-scroll-grid-dialog__scroll-handle--disabled';
const HANDLE_DRAGGING_CLASS =
  'uiwm-scroll-grid-dialog__scroll-handle--dragging';
const EMPTY_STATE_CLASS = 'uiwm-scroll-grid-dialog__empty-state';
const ITEM_CLASS = 'uiwm-scroll-grid-dialog__item';
const ITEM_ICON_CLASS = 'uiwm-scroll-grid-dialog__item-icon';
const ITEM_CARD_CLASS = 'uiwm-scroll-grid-dialog__item-card';
const ITEM_CARD_TITLE_CLASS = 'uiwm-scroll-grid-dialog__item-card-title';
const ITEM_CARD_SUBTITLE_CLASS = 'uiwm-scroll-grid-dialog__item-card-subtitle';
const ITEM_CARD_DESCRIPTION_CLASS =
  'uiwm-scroll-grid-dialog__item-card-description';
const ITEM_TEXT_CLASS = 'uiwm-scroll-grid-dialog__item-text';
const ITEM_META_CLASS = 'uiwm-scroll-grid-dialog__item-meta';
const ITEM_META_ROW_CLASS = 'uiwm-scroll-grid-dialog__item-meta-row';
const ITEM_META_LABEL_CLASS = 'uiwm-scroll-grid-dialog__item-meta-label';
const ITEM_META_VALUE_CLASS = 'uiwm-scroll-grid-dialog__item-meta-value';
const MIN_SCROLL_HANDLE_HEIGHT_PX = 20;

interface ActiveHandleDrag {
  pointerId: number;
  pointerOffsetPx: number;
}

function normalizeIdentifier(id: string, label: string): string {
  const normalizedId = id.trim();
  if (!normalizedId) {
    throw new Error(`${label} cannot be empty.`);
  }

  return normalizedId;
}

function normalizeScrollableGridDialogDefinition<
  TItem extends ScrollableGridDialogItemContract,
>(
  definition: ScrollableGridDialogDefinition<TItem>,
): ScrollableGridDialogDefinition<TItem> {
  return {
    ...definition,
    id: normalizeIdentifier(definition.id, 'Scrollable grid dialog id'),
    mountId:
      definition.mountId === undefined
        ? undefined
        : normalizeIdentifier(
            definition.mountId,
            'Scrollable grid dialog mount id',
          ),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeList<T>(value: T | readonly T[] | undefined): readonly T[] {
  if (value === undefined) {
    return [];
  }

  return (Array.isArray(value) ? value : [value]) as readonly T[];
}

function applyToneClass(
  element: HTMLElement,
  tone:
    | ScrollableGridDialogTextContent['tone']
    | ScrollableGridDialogMetaContent['tone'],
): void {
  if (!tone || tone === 'default') {
    return;
  }

  element.classList.add(`${ITEM_TEXT_CLASS}--${tone}`);
}

function appendRenderedNodes(
  container: HTMLElement,
  rendered: Node | readonly Node[] | undefined,
): void {
  if (rendered === undefined) {
    return;
  }

  if (Array.isArray(rendered)) {
    container.append(...rendered);
    return;
  }

  container.append(rendered as Node);
}

export class ScrollableGridDialog<
  TItem extends
    ScrollableGridDialogItemContract = ScrollableGridDialogItemContract,
> implements ScrollableGridDialogController<TItem>
{
  readonly runtime: UiFrameworkRuntime;
  readonly definition: Readonly<ScrollableGridDialogDefinition<TItem>>;
  readonly element: HTMLDivElement;
  readonly headerElement: HTMLDivElement;
  readonly titleElement: HTMLHeadingElement;
  readonly bodyElement: HTMLDivElement;
  readonly viewportElement: HTMLDivElement;
  readonly gridElement: HTMLDivElement;
  readonly scrollTrackElement: HTMLDivElement;
  readonly scrollHandleElement: HTMLDivElement;

  private readonly emptyStateElement: HTMLDivElement;
  private readonly surfaceController: UISurfaceController;
  private readonly closeOnEscape: boolean;
  private readonly listenerAbortController = new AbortController();
  private dragAbortController: AbortController | null = null;
  private activeDrag: ActiveHandleDrag | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private disposed = false;
  private items: readonly TItem[] = [];

  private readonly onViewportScroll = (): void => {
    this.syncScrollHandlePosition();
  };

  private readonly onWindowResize = (): void => {
    this.syncScrollHandlePosition();
  };

  private readonly onDocumentKeydown = (event: KeyboardEvent): void => {
    if (!this.closeOnEscape || !this.isVisible() || event.key !== 'Escape') {
      return;
    }

    event.preventDefault();
    this.close();
  };

  private readonly onHandlePointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 && event.pointerType !== 'touch') {
      return;
    }
    if (this.scrollHandleElement.classList.contains(HANDLE_DISABLED_CLASS)) {
      return;
    }

    event.preventDefault();
    const handleRect = this.scrollHandleElement.getBoundingClientRect();
    this.startDragHandle({
      pointerId: event.pointerId,
      pointerOffsetPx: event.clientY - handleRect.top,
    });
  };

  private readonly onWindowPointerMove = (event: PointerEvent): void => {
    if (!this.activeDrag || event.pointerId !== this.activeDrag.pointerId) {
      return;
    }

    event.preventDefault();
    this.applyDragPosition(event.clientY);
  };

  private readonly onWindowPointerUp = (event: PointerEvent): void => {
    if (!this.activeDrag || event.pointerId !== this.activeDrag.pointerId) {
      return;
    }

    this.stopDragHandle();
  };

  constructor(
    runtime: UiFrameworkRuntime,
    definition: ScrollableGridDialogDefinition<TItem>,
  ) {
    this.runtime = runtime;
    this.definition = normalizeScrollableGridDialogDefinition(definition);
    this.closeOnEscape = this.definition.closeOnEscape ?? true;

    this.element = document.createElement('div');
    this.element.classList.add(ROOT_CLASS);
    this.element.dataset.uiwmDialog = this.definition.id;

    this.headerElement = document.createElement('div');
    this.headerElement.classList.add(HEADER_CLASS);

    this.titleElement = document.createElement('h2');
    this.titleElement.classList.add(TITLE_CLASS);

    this.bodyElement = document.createElement('div');
    this.bodyElement.classList.add(BODY_CLASS);

    this.viewportElement = document.createElement('div');
    this.viewportElement.classList.add(VIEWPORT_CLASS);

    this.gridElement = document.createElement('div');
    this.gridElement.classList.add(GRID_CLASS);
    this.viewportElement.append(this.gridElement);

    this.scrollTrackElement = document.createElement('div');
    this.scrollTrackElement.classList.add(TRACK_CLASS);

    this.scrollHandleElement = document.createElement('div');
    this.scrollHandleElement.classList.add(HANDLE_CLASS);
    this.scrollTrackElement.append(this.scrollHandleElement);

    this.emptyStateElement = document.createElement('div');
    this.emptyStateElement.classList.add(EMPTY_STATE_CLASS);

    this.headerElement.append(this.titleElement);
    this.bodyElement.append(this.viewportElement, this.scrollTrackElement);
    this.element.append(this.headerElement, this.bodyElement);

    applyDialogClassNames(this.element, this.definition.classNames?.root);
    applyDialogClassNames(
      this.headerElement,
      this.definition.classNames?.header,
    );
    applyDialogClassNames(this.titleElement, this.definition.classNames?.title);
    applyDialogClassNames(this.bodyElement, this.definition.classNames?.body);
    applyDialogClassNames(
      this.viewportElement,
      this.definition.classNames?.viewport,
    );
    applyDialogClassNames(this.gridElement, this.definition.classNames?.grid);
    applyDialogClassNames(
      this.scrollTrackElement,
      this.definition.classNames?.scrollTrack,
    );
    applyDialogClassNames(
      this.scrollHandleElement,
      this.definition.classNames?.scrollHandle,
    );
    applyDialogClassNames(
      this.emptyStateElement,
      this.definition.classNames?.emptyState,
    );

    const initiallyOpen =
      this.definition.openOnCreate ?? this.definition.initiallyOpen;
    const initiallyVisible = this.definition.initiallyVisible ?? initiallyOpen;
    const lifecycleHooks = this.createLifecycleHooks(this.definition.hooks);

    this.surfaceController = runtime.registerDialog({
      kind: 'dialog',
      id: this.definition.id,
      mountId: this.definition.mountId,
      element: this.element,
      centered: this.definition.centered,
      modal: this.definition.modal,
      initiallyOpen,
      initiallyVisible,
      removeOnDispose: this.definition.removeOnDispose,
      hooks: lifecycleHooks,
      layout: {
        variant: 'scroll-grid',
        viewportSelector: `.${VIEWPORT_CLASS}`,
        contentSelector: `.${GRID_CLASS}`,
        maxHeightPx: this.definition.layout?.maxHeightPx,
        gapPx: this.definition.layout?.gapPx,
        columns: this.definition.layout?.columns,
        minColumnWidthPx: this.definition.layout?.minColumnWidthPx,
      },
    });

    if (
      !this.surfaceController.layout ||
      this.surfaceController.layout.variant !== 'scroll-grid'
    ) {
      throw new Error(
        `Scrollable grid dialog "${this.definition.id}" requires a scroll-grid layout.`,
      );
    }

    this.viewportElement.addEventListener('scroll', this.onViewportScroll, {
      signal: this.listenerAbortController.signal,
    });
    this.scrollHandleElement.addEventListener(
      'pointerdown',
      this.onHandlePointerDown,
      {
        signal: this.listenerAbortController.signal,
        passive: false,
      },
    );
    window.addEventListener('resize', this.onWindowResize, {
      signal: this.listenerAbortController.signal,
    });
    document.addEventListener('keydown', this.onDocumentKeydown, {
      signal: this.listenerAbortController.signal,
    });

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.syncScrollHandlePosition();
      });
      this.resizeObserver.observe(this.viewportElement);
      this.resizeObserver.observe(this.gridElement);
      this.resizeObserver.observe(this.scrollTrackElement);
    }

    this.setTitle(this.definition.title ?? '');
    this.setItems(this.definition.items ?? []);
    this.syncScrollHandlePosition();
  }

  get controllerId(): string {
    return this.surfaceController.id;
  }

  open(): void {
    this.surfaceController.open();
  }

  close(): void {
    this.surfaceController.close();
  }

  show(): void {
    this.surfaceController.show();
  }

  hide(): void {
    this.surfaceController.hide();
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.surfaceController.dispose();
  }

  isOpen(): boolean {
    return this.surfaceController.state === 'open';
  }

  isVisible(): boolean {
    return this.surfaceController.visible;
  }

  setTitle(title: string): void {
    const normalizedTitle = title.trim();
    this.titleElement.textContent = normalizedTitle;
    this.titleElement.classList.toggle(TITLE_HIDDEN_CLASS, !normalizedTitle);
  }

  setItems(items: readonly TItem[]): void {
    this.items = [...items];
    this.gridElement.replaceChildren();

    if (!this.items.length) {
      const emptyStateText = this.definition.emptyStateText ?? '';
      if (emptyStateText) {
        this.emptyStateElement.textContent = emptyStateText;
        this.gridElement.append(this.emptyStateElement);
      }
      this.syncScrollHandlePosition();
      return;
    }

    const itemElements = this.items.map((item, index) =>
      this.createGridItemElement(item, index),
    );
    this.gridElement.append(...itemElements);
    this.syncScrollHandlePosition();
  }

  getItems(): readonly TItem[] {
    return this.items;
  }

  clearItems(): void {
    this.setItems([]);
  }

  syncScrollHandlePosition(): void {
    const trackHeight = this.scrollTrackElement.clientHeight;
    if (trackHeight <= 0) {
      return;
    }

    const viewport = this.viewportElement;
    const scrollableHeight = Math.max(
      0,
      viewport.scrollHeight - viewport.clientHeight,
    );
    const visibleRatio =
      viewport.scrollHeight === 0
        ? 1
        : viewport.clientHeight / viewport.scrollHeight;
    const handleHeight = Math.min(
      trackHeight,
      Math.max(
        MIN_SCROLL_HANDLE_HEIGHT_PX,
        Math.round(trackHeight * visibleRatio),
      ),
    );
    const maxHandleOffset = Math.max(0, trackHeight - handleHeight);
    const scrollPercent =
      scrollableHeight > 0 ? viewport.scrollTop / scrollableHeight : 0;
    const handleTop = Math.round(maxHandleOffset * clamp(scrollPercent, 0, 1));

    this.scrollHandleElement.style.height = `${handleHeight}px`;
    this.scrollHandleElement.style.top = `${handleTop}px`;

    const canScroll = scrollableHeight > 0 && maxHandleOffset > 0;
    this.scrollTrackElement.classList.toggle(TRACK_DISABLED_CLASS, !canScroll);
    this.scrollHandleElement.classList.toggle(
      HANDLE_DISABLED_CLASS,
      !canScroll,
    );
  }

  private createGridItemElement(item: TItem, index: number): HTMLDivElement {
    const itemElement = document.createElement('div');
    itemElement.classList.add(ITEM_CLASS);
    itemElement.dataset.uiwmScrollGridItemId = item.id;

    if (item.dataset) {
      for (const [datasetName, datasetValue] of Object.entries(item.dataset)) {
        itemElement.dataset[datasetName] = datasetValue;
      }
    }

    applyDialogClassNames(itemElement, item.className);
    applyDialogClassNames(itemElement, this.definition.classNames?.item);

    const rendered = this.definition.itemRenderer?.({
      dialog: this,
      item,
      index,
      element: itemElement,
    });
    if (rendered === undefined) {
      this.renderDefaultItemContent(itemElement, item);
    } else {
      appendRenderedNodes(itemElement, rendered);
    }

    if (this.definition.onItemSelect) {
      itemElement.role = 'button';
      itemElement.tabIndex = 0;
      itemElement.addEventListener('click', (event) => {
        this.definition.onItemSelect?.({
          dialog: this,
          item,
          index,
          element: itemElement,
          event,
        });
      });
      itemElement.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') {
          return;
        }
        event.preventDefault();
        this.definition.onItemSelect?.({
          dialog: this,
          item,
          index,
          element: itemElement,
          event,
        });
      });
    }

    return itemElement;
  }

  private renderDefaultItemContent(
    itemElement: HTMLDivElement,
    item: TItem,
  ): void {
    if (item.icon) {
      const iconElement = document.createElement('div');
      iconElement.classList.add(ITEM_ICON_CLASS);
      applyDialogClassNames(iconElement, item.icon.className);
      applyDialogClassNames(iconElement, this.definition.classNames?.itemIcon);
      if (item.icon.kind === 'image') {
        const imageElement = document.createElement('img');
        imageElement.src = item.icon.src;
        imageElement.alt = item.icon.alt ?? '';
        iconElement.append(imageElement);
      } else {
        iconElement.append(item.icon.node);
      }
      itemElement.append(iconElement);
    }

    if (item.card) {
      const cardElement = document.createElement('div');
      cardElement.classList.add(ITEM_CARD_CLASS);
      applyDialogClassNames(cardElement, item.card.className);
      applyDialogClassNames(cardElement, this.definition.classNames?.itemCard);

      if (item.card.title) {
        const titleElement = document.createElement('div');
        titleElement.classList.add(ITEM_CARD_TITLE_CLASS);
        titleElement.textContent = item.card.title;
        cardElement.append(titleElement);
      }

      if (item.card.subtitle) {
        const subtitleElement = document.createElement('div');
        subtitleElement.classList.add(ITEM_CARD_SUBTITLE_CLASS);
        subtitleElement.textContent = item.card.subtitle;
        cardElement.append(subtitleElement);
      }

      if (item.card.description) {
        const descriptionElement = document.createElement('div');
        descriptionElement.classList.add(ITEM_CARD_DESCRIPTION_CLASS);
        descriptionElement.textContent = item.card.description;
        cardElement.append(descriptionElement);
      }

      itemElement.append(cardElement);
    }

    const textItems = normalizeList(item.text);
    for (const textItem of textItems) {
      const textElement = document.createElement('div');
      textElement.classList.add(ITEM_TEXT_CLASS);
      applyToneClass(textElement, textItem.tone);
      textElement.textContent = textItem.text;
      applyDialogClassNames(textElement, textItem.className);
      applyDialogClassNames(textElement, this.definition.classNames?.itemText);
      itemElement.append(textElement);
    }

    const metaItems = normalizeList(item.meta);
    if (metaItems.length > 0) {
      const metaElement = document.createElement('dl');
      metaElement.classList.add(ITEM_META_CLASS);
      applyDialogClassNames(metaElement, this.definition.classNames?.itemMeta);
      for (const metaItem of metaItems) {
        const rowElement = document.createElement('div');
        rowElement.classList.add(ITEM_META_ROW_CLASS);
        applyToneClass(rowElement, metaItem.tone);

        const labelElement = document.createElement('dt');
        labelElement.classList.add(ITEM_META_LABEL_CLASS);
        labelElement.textContent = metaItem.label;
        applyDialogClassNames(labelElement, metaItem.className);

        rowElement.append(labelElement);
        if (metaItem.value !== undefined) {
          const valueElement = document.createElement('dd');
          valueElement.classList.add(ITEM_META_VALUE_CLASS);
          valueElement.textContent = metaItem.value;
          rowElement.append(valueElement);
        }
        metaElement.append(rowElement);
      }
      itemElement.append(metaElement);
    }
  }

  private createLifecycleHooks(
    hooks: UiSurfaceLifecycleHooks | undefined,
  ): UiSurfaceLifecycleHooks {
    return {
      onShow: (context) => {
        this.syncScrollHandlePosition();
        hooks?.onShow?.(context);
      },
      onHide: (context) => {
        this.stopDragHandle();
        hooks?.onHide?.(context);
      },
      onOpen: (context) => {
        hooks?.onOpen?.(context);
      },
      onClose: (context) => {
        hooks?.onClose?.(context);
      },
      onDispose: (context) => {
        this.disposeInternal();
        hooks?.onDispose?.(context);
      },
    };
  }

  private startDragHandle(nextDrag: ActiveHandleDrag): void {
    this.stopDragHandle();
    this.activeDrag = nextDrag;
    this.scrollHandleElement.classList.add(HANDLE_DRAGGING_CLASS);
    this.scrollHandleElement.setPointerCapture(nextDrag.pointerId);

    this.dragAbortController = new AbortController();
    window.addEventListener('pointermove', this.onWindowPointerMove, {
      signal: this.dragAbortController.signal,
      passive: false,
    });
    window.addEventListener('pointerup', this.onWindowPointerUp, {
      signal: this.dragAbortController.signal,
    });
    window.addEventListener('pointercancel', this.onWindowPointerUp, {
      signal: this.dragAbortController.signal,
    });
  }

  private applyDragPosition(clientY: number): void {
    if (!this.activeDrag) {
      return;
    }

    const trackRect = this.scrollTrackElement.getBoundingClientRect();
    const handleHeight = this.scrollHandleElement.offsetHeight;
    const maxHandleOffset = Math.max(0, trackRect.height - handleHeight);
    const nextOffset = clamp(
      clientY - trackRect.top - this.activeDrag.pointerOffsetPx,
      0,
      maxHandleOffset,
    );
    const scrollableHeight = Math.max(
      0,
      this.viewportElement.scrollHeight - this.viewportElement.clientHeight,
    );

    if (scrollableHeight <= 0 || maxHandleOffset <= 0) {
      this.viewportElement.scrollTop = 0;
      return;
    }

    const scrollPercent = nextOffset / maxHandleOffset;
    this.viewportElement.scrollTop = Math.round(
      scrollPercent * scrollableHeight,
    );
  }

  private stopDragHandle(): void {
    const activePointerId = this.activeDrag?.pointerId;
    if (
      activePointerId !== undefined &&
      this.scrollHandleElement.hasPointerCapture(activePointerId)
    ) {
      this.scrollHandleElement.releasePointerCapture(activePointerId);
    }

    this.dragAbortController?.abort();
    this.dragAbortController = null;
    this.activeDrag = null;
    this.scrollHandleElement.classList.remove(HANDLE_DRAGGING_CLASS);
  }

  private disposeInternal(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.stopDragHandle();
    this.listenerAbortController.abort();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }
}
