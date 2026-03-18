import type { UISurfaceController, UIWindowManager } from './window-manager';

export type UiSurfaceKind = 'window' | 'dialog';
export type UiSurfaceLifecycleState = 'registered' | 'open' | 'closed' | 'disposed';

export interface UiWindowManagerZIndexPolicy {
  windowBase: number;
  dialogBase: number;
  step: number;
  modalBackdropOffset: number;
}

export interface UiSurfaceLifecycleContext {
  readonly id: string;
  readonly kind: UiSurfaceKind;
  readonly state: UiSurfaceLifecycleState;
  readonly visible: boolean;
  readonly element: HTMLElement;
  readonly mount: HTMLDivElement;
}

export interface UiSurfaceLifecycleHooks {
  onShow?(context: UiSurfaceLifecycleContext): void;
  onHide?(context: UiSurfaceLifecycleContext): void;
  onOpen?(context: UiSurfaceLifecycleContext): void;
  onClose?(context: UiSurfaceLifecycleContext): void;
  onDispose?(context: UiSurfaceLifecycleContext): void;
}

interface UiDialogSharedLayoutBase {
  maxHeightPx?: number;
  gapPx?: number;
  viewportSelector?: string;
  contentSelector?: string;
}

export interface UiDialogScrollableListLayout extends UiDialogSharedLayoutBase {
  variant: 'scroll-list';
}

export interface UiDialogScrollableGridLayout extends UiDialogSharedLayoutBase {
  variant: 'scroll-grid';
  columns?: number;
  minColumnWidthPx?: number;
}

export type UiDialogSharedLayout =
  | UiDialogScrollableListLayout
  | UiDialogScrollableGridLayout;

interface UiSurfaceDefinitionBase {
  id: string;
  mountId?: string;
  element?: HTMLElement;
  centered?: boolean;
  initiallyOpen?: boolean;
  initiallyVisible?: boolean;
  removeOnDispose?: boolean;
  hooks?: UiSurfaceLifecycleHooks;
}

export interface UiWindowDefinition extends UiSurfaceDefinitionBase {
  kind: 'window';
}

export interface UiDialogDefinition extends UiSurfaceDefinitionBase {
  kind: 'dialog';
  modal?: boolean;
  layout?: UiDialogSharedLayout;
}

export type UiSurfaceDefinition = UiWindowDefinition | UiDialogDefinition;

export interface UiFrameworkBootstrapOptions {
  rootId?: string;
  zIndexPolicy?: Partial<UiWindowManagerZIndexPolicy>;
}

export interface UiFrameworkRuntime {
  readonly root: HTMLDivElement;
  readonly surfaces: ReadonlyMap<string, UiSurfaceDefinition>;
  readonly windowManager: UIWindowManager;
  getMount(mountId?: string): HTMLDivElement;
  registerWindow(definition: UiWindowDefinition): UISurfaceController;
  registerDialog(definition: UiDialogDefinition): UISurfaceController;
}
