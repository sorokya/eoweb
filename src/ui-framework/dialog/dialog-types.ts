import type {
  UiDialogDefinition,
  UiDialogScrollableGridLayout,
  UiFrameworkRuntime,
  UiSurfaceLifecycleHooks,
} from '../types';

export type BaseDialogActionKind = 'ok' | 'cancel' | 'custom';
export type BaseDialogActionTone = 'primary' | 'neutral' | 'danger';

export type BaseDialogBodyContentPart = Node | string;
export type BaseDialogBodyContent =
  | BaseDialogBodyContentPart
  | readonly BaseDialogBodyContentPart[];

export type BaseDialogBodyUnmount = () => void;

export interface BaseDialogController {
  readonly runtime: UiFrameworkRuntime;
  readonly definition: Readonly<BaseDialogDefinition>;
  readonly element: HTMLDivElement;
  readonly panelElement: HTMLDivElement;
  readonly titleElement: HTMLHeadingElement;
  readonly bodyElement: HTMLDivElement;
  readonly footerElement: HTMLDivElement;
  readonly buttonRowElement: HTMLDivElement;
  open(): void;
  close(): void;
  isOpen(): boolean;
  setTitle(title: string): void;
  setBodyText(text: string): void;
  setBodyContent(content: BaseDialogBodyContent): void;
  mountBody(mount: BaseDialogBodyMount): void;
  setActions(actions: readonly BaseDialogActionConfig[]): void;
}

export type BaseDialogBodyMount = (
  container: HTMLDivElement,
  dialog: BaseDialogController,
) => BaseDialogBodyUnmount | undefined;

export interface BaseDialogActionContext<TValue = unknown> {
  dialog: BaseDialogController;
  action: BaseDialogActionConfig<TValue>;
  button: HTMLButtonElement;
  event: MouseEvent;
}

export type BaseDialogActionHandlerResult =
  | boolean
  | undefined
  | Promise<boolean | undefined>;

export type BaseDialogActionHandler<TValue = unknown> = (
  context: BaseDialogActionContext<TValue>,
) => BaseDialogActionHandlerResult;

export interface BaseDialogActionConfig<TValue = unknown> {
  id: string;
  label: string;
  kind?: BaseDialogActionKind;
  tone?: BaseDialogActionTone;
  value?: TValue;
  className?: string;
  disabled?: boolean;
  closeOnSelect?: boolean;
  onSelect?: BaseDialogActionHandler<TValue>;
}

export interface BaseDialogClassNames {
  root?: string;
  panel?: string;
  title?: string;
  body?: string;
  footer?: string;
  buttonRow?: string;
}

export interface BaseDialogDefinition extends Omit<UiDialogDefinition, 'kind'> {
  title?: string;
  body?: BaseDialogBodyContent;
  bodyMount?: BaseDialogBodyMount;
  actions?: readonly BaseDialogActionConfig[];
  closeOnEscape?: boolean;
  closeOnBackdropClick?: boolean;
  openOnCreate?: boolean;
  classNames?: BaseDialogClassNames;
}

export interface BaseDialogFamilyConfig<TOptions> {
  familyId: string;
  defaults?: Omit<BaseDialogDefinition, 'id'>;
  createDialogDefinition(id: string, options: TOptions): BaseDialogDefinition;
}

export type ScrollableGridDialogTextTone =
  | 'default'
  | 'muted'
  | 'accent'
  | 'danger';

export interface ScrollableGridDialogIconImageContent {
  readonly kind: 'image';
  readonly src: string;
  readonly alt?: string;
  readonly className?: string;
}

export interface ScrollableGridDialogIconNodeContent {
  readonly kind: 'node';
  readonly node: HTMLElement;
  readonly className?: string;
}

export type ScrollableGridDialogIconContent =
  | ScrollableGridDialogIconImageContent
  | ScrollableGridDialogIconNodeContent;

export interface ScrollableGridDialogCardContent {
  readonly title?: string;
  readonly subtitle?: string;
  readonly description?: string;
  readonly className?: string;
}

export interface ScrollableGridDialogTextContent {
  readonly text: string;
  readonly tone?: ScrollableGridDialogTextTone;
  readonly className?: string;
}

export interface ScrollableGridDialogMetaContent {
  readonly label: string;
  readonly value?: string;
  readonly tone?: ScrollableGridDialogTextTone;
  readonly className?: string;
}

export interface ScrollableGridDialogItemContract<TValue = unknown> {
  readonly id: string;
  readonly icon?: ScrollableGridDialogIconContent;
  readonly card?: ScrollableGridDialogCardContent;
  readonly text?:
    | ScrollableGridDialogTextContent
    | readonly ScrollableGridDialogTextContent[];
  readonly meta?:
    | ScrollableGridDialogMetaContent
    | readonly ScrollableGridDialogMetaContent[];
  readonly className?: string;
  readonly dataset?: Readonly<Record<string, string>>;
  readonly value?: TValue;
}

export interface ScrollableGridDialogClassNames {
  root?: string;
  header?: string;
  title?: string;
  body?: string;
  viewport?: string;
  grid?: string;
  item?: string;
  itemIcon?: string;
  itemCard?: string;
  itemText?: string;
  itemMeta?: string;
  scrollTrack?: string;
  scrollHandle?: string;
  emptyState?: string;
}

export type ScrollableGridDialogLayoutOptions = Omit<
  UiDialogScrollableGridLayout,
  'variant' | 'viewportSelector' | 'contentSelector'
>;

export interface ScrollableGridDialogController<
  TItem extends
    ScrollableGridDialogItemContract = ScrollableGridDialogItemContract,
> {
  readonly runtime: UiFrameworkRuntime;
  readonly definition: Readonly<ScrollableGridDialogDefinition<TItem>>;
  readonly controllerId: string;
  readonly element: HTMLDivElement;
  readonly headerElement: HTMLDivElement;
  readonly titleElement: HTMLHeadingElement;
  readonly bodyElement: HTMLDivElement;
  readonly viewportElement: HTMLDivElement;
  readonly gridElement: HTMLDivElement;
  readonly scrollTrackElement: HTMLDivElement;
  readonly scrollHandleElement: HTMLDivElement;
  open(): void;
  close(): void;
  show(): void;
  hide(): void;
  dispose(): void;
  isOpen(): boolean;
  isVisible(): boolean;
  setTitle(title: string): void;
  setItems(items: readonly TItem[]): void;
  getItems(): readonly TItem[];
  clearItems(): void;
  syncScrollHandlePosition(): void;
}

export interface ScrollableGridDialogRenderContext<
  TItem extends
    ScrollableGridDialogItemContract = ScrollableGridDialogItemContract,
> {
  readonly dialog: ScrollableGridDialogController<TItem>;
  readonly item: TItem;
  readonly index: number;
  readonly element: HTMLDivElement;
}

export interface ScrollableGridDialogSelectContext<
  TItem extends
    ScrollableGridDialogItemContract = ScrollableGridDialogItemContract,
> extends ScrollableGridDialogRenderContext<TItem> {
  readonly event: MouseEvent | KeyboardEvent;
}

export type ScrollableGridDialogItemRenderer<
  TItem extends
    ScrollableGridDialogItemContract = ScrollableGridDialogItemContract,
> = (
  context: ScrollableGridDialogRenderContext<TItem>,
) => Node | readonly Node[] | undefined;

export type ScrollableGridDialogItemSelectHandler<
  TItem extends
    ScrollableGridDialogItemContract = ScrollableGridDialogItemContract,
> = (context: ScrollableGridDialogSelectContext<TItem>) => void;

export interface ScrollableGridDialogDefinition<
  TItem extends
    ScrollableGridDialogItemContract = ScrollableGridDialogItemContract,
> extends Omit<UiDialogDefinition, 'kind' | 'layout' | 'hooks'> {
  title?: string;
  items?: readonly TItem[];
  emptyStateText?: string;
  openOnCreate?: boolean;
  closeOnEscape?: boolean;
  layout?: ScrollableGridDialogLayoutOptions;
  classNames?: ScrollableGridDialogClassNames;
  itemRenderer?: ScrollableGridDialogItemRenderer<TItem>;
  onItemSelect?: ScrollableGridDialogItemSelectHandler<TItem>;
  hooks?: UiSurfaceLifecycleHooks;
}
