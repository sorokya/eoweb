import { UI_FRAMEWORK_DEFAULT_MOUNT_ID } from './root';
import type {
  UiDialogDefinition,
  UiDialogSharedLayout,
  UiDialogScrollableGridLayout,
  UiFrameworkRuntime,
  UiSurfaceDefinition,
  UiSurfaceKind,
  UiSurfaceLifecycleContext,
  UiSurfaceLifecycleHooks,
  UiSurfaceLifecycleState,
  UiWindowDefinition,
  UiWindowManagerZIndexPolicy,
} from './types';

const DEFAULT_Z_INDEX_POLICY: UiWindowManagerZIndexPolicy = {
  windowBase: 1200,
  dialogBase: 1600,
  step: 2,
  modalBackdropOffset: 1,
};

const DEFAULT_SCROLL_LAYOUT_MAX_HEIGHT_PX = 336;
const DEFAULT_SCROLL_LAYOUT_GAP_PX = 8;
const DEFAULT_SCROLL_GRID_MIN_COLUMN_WIDTH_PX = 120;

export interface UIWindowManagerOptions {
  getMount(mountId?: string): HTMLDivElement;
  zIndexPolicy?: Partial<UiWindowManagerZIndexPolicy>;
}

export interface UiDialogSharedLayoutHandle {
  readonly variant: UiDialogSharedLayout['variant'];
  readonly viewport: HTMLDivElement;
  readonly content: HTMLDivElement;
  clear(): void;
  dispose(): void;
}

export interface UISurfaceController {
  readonly id: string;
  readonly kind: UiSurfaceKind;
  readonly element: HTMLElement;
  readonly mount: HTMLDivElement;
  readonly state: UiSurfaceLifecycleState;
  readonly visible: boolean;
  readonly layout: UiDialogSharedLayoutHandle | null;
  open(): void;
  close(): void;
  show(): void;
  hide(): void;
  bringToFront(): void;
  onDispose(cleanup: () => void): () => void;
  dispose(): void;
}

type UiNormalizedWindowDefinition = UiWindowDefinition & {
  mountId: string;
  centered: boolean;
  initiallyOpen: boolean;
  initiallyVisible: boolean;
  removeOnDispose: boolean;
  hooks?: UiSurfaceLifecycleHooks;
};

type UiNormalizedDialogDefinition = UiDialogDefinition & {
  mountId: string;
  centered: boolean;
  modal: boolean;
  initiallyOpen: boolean;
  initiallyVisible: boolean;
  removeOnDispose: boolean;
  hooks?: UiSurfaceLifecycleHooks;
};

type UiNormalizedSurfaceDefinition =
  | UiNormalizedWindowDefinition
  | UiNormalizedDialogDefinition;

interface ManagedSurfaceRecord {
  definition: UiNormalizedSurfaceDefinition;
  mount: HTMLDivElement;
  element: HTMLElement;
  backdrop: HTMLDivElement | null;
  layout: UiDialogSharedLayoutHandle | null;
  attached: boolean;
  state: UiSurfaceLifecycleState;
  visible: boolean;
  cleanupCallbacks: Set<() => void>;
  controller: UISurfaceController;
}

function normalizeId(id: string, label: string): string {
  const normalizedId = id.trim();
  if (!normalizedId) {
    throw new Error(`${label} cannot be empty.`);
  }

  return normalizedId;
}

function normalizeMountId(mountId?: string): string {
  if (mountId === undefined) {
    return UI_FRAMEWORK_DEFAULT_MOUNT_ID;
  }

  return normalizeId(mountId, 'UI framework mount id');
}

function gridColumnsValue(layout: UiDialogScrollableGridLayout): string {
  if (layout.columns !== undefined) {
    if (layout.columns < 1) {
      throw new Error('UI framework grid layout columns must be at least 1.');
    }

    return `repeat(${Math.floor(layout.columns)}, minmax(0, 1fr))`;
  }

  const minColumnWidth = Math.max(
    1,
    Math.floor(layout.minColumnWidthPx ?? DEFAULT_SCROLL_GRID_MIN_COLUMN_WIDTH_PX),
  );
  return `repeat(auto-fill, minmax(${minColumnWidth}px, 1fr))`;
}

export class UIWindowManager {
  private readonly records = new Map<string, ManagedSurfaceRecord>();
  private readonly definitions = new Map<string, UiSurfaceDefinition>();
  private readonly zIndexPolicy: UiWindowManagerZIndexPolicy;
  private readonly options: UIWindowManagerOptions;

  private windowLayer = 0;
  private dialogLayer = 0;

  constructor(options: UIWindowManagerOptions) {
    this.options = options;
    this.zIndexPolicy = {
      ...DEFAULT_Z_INDEX_POLICY,
      ...options.zIndexPolicy,
    };
  }

  get surfaces(): ReadonlyMap<string, UiSurfaceDefinition> {
    return this.definitions;
  }

  registerWindow(definition: UiWindowDefinition): UISurfaceController {
    return this.registerSurface(definition);
  }

  registerDialog(definition: UiDialogDefinition): UISurfaceController {
    return this.registerSurface(definition);
  }

  registerSurface(definition: UiSurfaceDefinition): UISurfaceController {
    const normalizedDefinition = this.normalizeDefinition(definition);
    if (this.records.has(normalizedDefinition.id)) {
      throw new Error(
        `UI framework surface "${normalizedDefinition.id}" is already registered.`,
      );
    }

    const mount = this.options.getMount(normalizedDefinition.mountId);
    const element = normalizedDefinition.element ?? document.createElement('div');
    const createdElement = normalizedDefinition.element === undefined;

    element.dataset.uiFrameworkSurfaceId = normalizedDefinition.id;
    element.dataset.uiFrameworkSurfaceKind = normalizedDefinition.kind;
    element.classList.add('uiwm-surface', `uiwm-${normalizedDefinition.kind}`);
    if (createdElement) {
      element.style.pointerEvents = 'auto';
    }

    if (normalizedDefinition.centered) {
      this.applyCenteredPositioning(element);
    }

    const backdrop =
      normalizedDefinition.kind === 'dialog' && normalizedDefinition.modal
        ? this.createModalBackdrop(normalizedDefinition.id)
        : null;
    const hasProvidedElement = normalizedDefinition.element !== undefined;
    if (hasProvidedElement) {
      if (backdrop) {
        mount.append(backdrop);
      }
      mount.append(element);
    }

    const layout =
      normalizedDefinition.kind === 'dialog' && normalizedDefinition.layout
        ? this.applyDialogSharedLayout(element, normalizedDefinition.layout)
        : null;

    const record: ManagedSurfaceRecord = {
      definition: normalizedDefinition,
      mount,
      element,
      backdrop,
      layout,
      attached: hasProvidedElement,
      state: 'registered' as UiSurfaceLifecycleState,
      visible: false,
      cleanupCallbacks: new Set<() => void>(),
      controller: undefined as unknown as UISurfaceController,
    };
    const controller = this.createController(record);
    record.controller = controller;

    this.records.set(normalizedDefinition.id, record);
    this.definitions.set(normalizedDefinition.id, normalizedDefinition);

    element.classList.add('hidden');
    backdrop?.classList.add('hidden');

    if (normalizedDefinition.initiallyVisible) {
      this.show(normalizedDefinition.id);
    }

    if (normalizedDefinition.initiallyOpen) {
      this.open(normalizedDefinition.id);
    } else {
      record.state = 'closed';
    }

    return controller;
  }

  getController(id: string): UISurfaceController | null {
    return this.records.get(normalizeId(id, 'UI framework surface id'))?.controller ?? null;
  }

  show(id: string): void {
    const record = this.requireRecord(id);
    this.ensureAttached(record);
    if (record.visible) {
      this.bringToFront(id);
      return;
    }

    record.element.classList.remove('hidden');
    record.backdrop?.classList.remove('hidden');
    record.visible = true;
    this.bringToFront(id);
    record.definition.hooks?.onShow?.(this.createLifecycleContext(record));
  }

  hide(id: string): void {
    const record = this.requireRecord(id);
    if (!record.visible) {
      return;
    }

    record.element.classList.add('hidden');
    record.backdrop?.classList.add('hidden');
    record.visible = false;
    record.definition.hooks?.onHide?.(this.createLifecycleContext(record));
  }

  open(id: string): void {
    const record = this.requireRecord(id);
    const wasOpen = record.state === 'open';

    record.state = 'open';
    this.show(id);

    if (!wasOpen) {
      record.definition.hooks?.onOpen?.(this.createLifecycleContext(record));
    }
  }

  close(id: string): void {
    const record = this.requireRecord(id);
    const wasOpen = record.state === 'open';

    this.hide(id);
    record.state = 'closed';

    if (wasOpen) {
      record.definition.hooks?.onClose?.(this.createLifecycleContext(record));
    }
  }

  bringToFront(id: string): void {
    const record = this.requireRecord(id);
    this.ensureAttached(record);
    const zIndex = this.nextZIndex(record.definition.kind);

    record.element.style.zIndex = String(zIndex);
    if (record.backdrop) {
      record.backdrop.style.zIndex = String(
        zIndex - this.zIndexPolicy.modalBackdropOffset,
      );
    }
  }

  registerCleanup(id: string, cleanup: () => void): () => void {
    const record = this.requireRecord(id);
    record.cleanupCallbacks.add(cleanup);
    return () => {
      record.cleanupCallbacks.delete(cleanup);
    };
  }

  disposeSurface(id: string): void {
    const record = this.requireRecord(id);
    if (record.state === 'open') {
      this.close(id);
    } else {
      this.hide(id);
      record.state = 'closed';
    }

    this.records.delete(record.definition.id);
    this.definitions.delete(record.definition.id);

    record.state = 'disposed';
    record.layout?.dispose();
    record.backdrop?.remove();
    record.attached = false;
    if (record.definition.removeOnDispose) {
      record.element.remove();
    } else {
      record.element.classList.add('hidden');
    }

    for (const callback of record.cleanupCallbacks) {
      callback();
    }
    record.cleanupCallbacks.clear();
    record.definition.hooks?.onDispose?.(this.createLifecycleContext(record));
  }

  dispose(): void {
    const ids = [...this.records.keys()];
    for (const id of ids) {
      this.disposeSurface(id);
    }
  }

  private normalizeDefinition(
    definition: UiSurfaceDefinition,
  ): UiNormalizedSurfaceDefinition {
    const id = normalizeId(definition.id, 'UI framework surface id');
    const mountId = normalizeMountId(definition.mountId);
    const centered = definition.centered ?? definition.kind === 'dialog';
    const initiallyOpen = definition.initiallyOpen ?? false;
    const initiallyVisible = definition.initiallyVisible ?? initiallyOpen;
    const removeOnDispose = definition.removeOnDispose ?? !definition.element;

    if (definition.kind === 'dialog') {
      return {
        ...definition,
        id,
        mountId,
        centered,
        initiallyOpen,
        initiallyVisible,
        removeOnDispose,
        modal: definition.modal ?? false,
      };
    }

    return {
      ...definition,
      id,
      mountId,
      centered,
      initiallyOpen,
      initiallyVisible,
      removeOnDispose,
    };
  }

  private requireRecord(id: string): ManagedSurfaceRecord {
    const normalizedId = normalizeId(id, 'UI framework surface id');
    const record = this.records.get(normalizedId);
    if (!record) {
      throw new Error(`UI framework surface "${normalizedId}" is not registered.`);
    }
    if (record.state === 'disposed') {
      throw new Error(`UI framework surface "${normalizedId}" is disposed.`);
    }

    return record;
  }

  private nextZIndex(kind: UiSurfaceKind): number {
    if (kind === 'dialog') {
      this.dialogLayer += 1;
      return this.zIndexPolicy.dialogBase + this.dialogLayer * this.zIndexPolicy.step;
    }

    this.windowLayer += 1;
    return this.zIndexPolicy.windowBase + this.windowLayer * this.zIndexPolicy.step;
  }

  private ensureAttached(record: ManagedSurfaceRecord): void {
    if (record.attached) {
      return;
    }

    if (record.backdrop) {
      record.mount.append(record.backdrop);
    }
    record.mount.append(record.element);
    record.attached = true;
  }

  private applyCenteredPositioning(element: HTMLElement): void {
    element.style.position = element.style.position || 'absolute';
    element.style.left = '50%';
    element.style.top = '50%';
    if (!element.style.transform) {
      element.style.transform = 'translate(-50%, -50%)';
    }
  }

  private createModalBackdrop(surfaceId: string): HTMLDivElement {
    const backdrop = document.createElement('div');
    backdrop.dataset.uiFrameworkBackdropFor = surfaceId;
    backdrop.classList.add('uiwm-backdrop');
    backdrop.style.position = 'absolute';
    backdrop.style.inset = '0';
    backdrop.style.background = 'var(--ui-overlay-dim, rgba(0, 0, 0, 0.7))';
    backdrop.style.pointerEvents = 'auto';
    return backdrop;
  }

  private applyDialogSharedLayout(
    surface: HTMLElement,
    layout: UiDialogSharedLayout,
  ): UiDialogSharedLayoutHandle {
    if (
      Boolean(layout.viewportSelector) !== Boolean(layout.contentSelector)
    ) {
      throw new Error(
        'UI framework dialog shared layout requires both viewport and content selectors.',
      );
    }

    const resolvedViewport = layout.viewportSelector
      ? surface.querySelector<HTMLDivElement>(layout.viewportSelector)
      : null;
    const resolvedContent = layout.contentSelector
      ? surface.querySelector<HTMLDivElement>(layout.contentSelector)
      : null;

    if (
      (layout.viewportSelector && !resolvedViewport) ||
      (layout.contentSelector && !resolvedContent)
    ) {
      throw new Error('UI framework dialog shared layout selectors could not be resolved.');
    }

    let viewport = resolvedViewport;
    let content = resolvedContent;
    let ownsLayoutElements = false;
    if (!viewport || !content) {
      viewport = document.createElement('div');
      content = document.createElement('div');
      viewport.dataset.uiwmLayoutRole = 'viewport';
      content.dataset.uiwmLayoutRole = 'content';
      while (surface.firstChild) {
        content.append(surface.firstChild);
      }
      viewport.append(content);
      surface.append(viewport);
      ownsLayoutElements = true;
    }

    const maxHeightPx = Math.max(
      1,
      Math.floor(layout.maxHeightPx ?? DEFAULT_SCROLL_LAYOUT_MAX_HEIGHT_PX),
    );
    const gapPx = Math.max(
      0,
      Math.floor(layout.gapPx ?? DEFAULT_SCROLL_LAYOUT_GAP_PX),
    );

    viewport.style.overflowY = 'auto';
    viewport.style.maxHeight = `${maxHeightPx}px`;
    viewport.style.width = '100%';
    viewport.style.flex = '1 1 auto';
    content.style.width = '100%';
    content.style.gap = `${gapPx}px`;

    if (layout.variant === 'scroll-grid') {
      content.style.display = 'grid';
      content.style.gridTemplateColumns = gridColumnsValue(layout);
      content.style.alignContent = 'start';
    } else {
      content.style.display = 'flex';
      content.style.flexDirection = 'column';
    }

    if (ownsLayoutElements) {
      surface.style.display = surface.style.display || 'flex';
      surface.style.flexDirection = surface.style.flexDirection || 'column';
      surface.style.alignItems = surface.style.alignItems || 'stretch';
    }

    return {
      variant: layout.variant,
      viewport,
      content,
      clear() {
        content.replaceChildren();
      },
      dispose() {
        if (ownsLayoutElements) {
          while (content.firstChild) {
            surface.append(content.firstChild);
          }
          viewport.remove();
        }
      },
    };
  }

  private createLifecycleContext(
    record: ManagedSurfaceRecord,
  ): UiSurfaceLifecycleContext {
    return {
      id: record.definition.id,
      kind: record.definition.kind,
      state: record.state,
      visible: record.visible,
      element: record.element,
      mount: record.mount,
    };
  }

  private createController(record: ManagedSurfaceRecord): UISurfaceController {
    return {
      get id() {
        return record.definition.id;
      },
      get kind() {
        return record.definition.kind;
      },
      get element() {
        return record.element;
      },
      get mount() {
        return record.mount;
      },
      get state() {
        return record.state;
      },
      get visible() {
        return record.visible;
      },
      get layout() {
        return record.layout;
      },
      open: () => {
        this.open(record.definition.id);
      },
      close: () => {
        this.close(record.definition.id);
      },
      show: () => {
        this.show(record.definition.id);
      },
      hide: () => {
        this.hide(record.definition.id);
      },
      bringToFront: () => {
        this.bringToFront(record.definition.id);
      },
      onDispose: (cleanup) => this.registerCleanup(record.definition.id, cleanup),
      dispose: () => {
        this.disposeSurface(record.definition.id);
      },
    };
  }
}

export function createUiWindowManager(
  runtime: Pick<UiFrameworkRuntime, 'getMount'>,
  zIndexPolicy?: Partial<UiWindowManagerZIndexPolicy>,
): UIWindowManager {
  return new UIWindowManager({
    getMount: runtime.getMount,
    zIndexPolicy,
  });
}
