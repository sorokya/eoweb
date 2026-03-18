import type { UiFrameworkRuntime } from '../types';
import { BaseDialog } from './base-dialog';
import type {
  BaseDialogActionConfig,
  BaseDialogActionHandler,
  BaseDialogBodyContent,
  BaseDialogDefinition,
} from './dialog-types';

let confirmationDialogId = 0;

function nextConfirmationDialogId(): string {
  confirmationDialogId += 1;
  return `ui-framework-confirmation-dialog-${confirmationDialogId}`;
}

export interface ConfirmationDialogButtonConfig {
  id?: string;
  label?: string;
  tone?: BaseDialogActionConfig['tone'];
  className?: string;
  disabled?: boolean;
  closeOnSelect?: boolean;
  onSelect?: BaseDialogActionHandler<void>;
}

export interface ConfirmationDialogConfig
  extends Omit<
    BaseDialogDefinition,
    'id' | 'title' | 'body' | 'bodyMount' | 'actions'
  > {
  id?: string;
  title?: string;
  body: BaseDialogBodyContent;
  confirmButton?: ConfirmationDialogButtonConfig;
  cancelButton?: ConfirmationDialogButtonConfig;
  confirmFirst?: boolean;
}

function createConfirmAction(
  config: ConfirmationDialogButtonConfig | undefined,
): BaseDialogActionConfig {
  return {
    id: config?.id ?? 'confirm',
    label: config?.label ?? 'OK',
    kind: 'ok',
    tone: config?.tone ?? 'primary',
    className: config?.className,
    disabled: config?.disabled,
    closeOnSelect: config?.closeOnSelect,
    onSelect: config?.onSelect,
  };
}

function createCancelAction(
  config: ConfirmationDialogButtonConfig | undefined,
): BaseDialogActionConfig {
  return {
    id: config?.id ?? 'cancel',
    label: config?.label ?? 'Cancel',
    kind: 'cancel',
    tone: config?.tone ?? 'neutral',
    className: config?.className,
    disabled: config?.disabled,
    closeOnSelect: config?.closeOnSelect,
    onSelect: config?.onSelect,
  };
}

export class ConfirmationDialog extends BaseDialog {
  constructor(runtime: UiFrameworkRuntime, config: ConfirmationDialogConfig) {
    const confirmAction = createConfirmAction(config.confirmButton);
    const cancelAction = createCancelAction(config.cancelButton);
    const actions =
      config.confirmFirst === false
        ? [cancelAction, confirmAction]
        : [confirmAction, cancelAction];

    super(runtime, {
      ...config,
      id: config.id ?? nextConfirmationDialogId(),
      title: config.title,
      body: config.body,
      modal: config.modal ?? true,
      actions,
    });
  }

  setContent(body: BaseDialogBodyContent, title?: string): void {
    if (title !== undefined) {
      this.setTitle(title);
    }
    this.setBodyContent(body);
  }

  setButtons(config: {
    confirmButton?: ConfirmationDialogButtonConfig;
    cancelButton?: ConfirmationDialogButtonConfig;
    confirmFirst?: boolean;
  }): void {
    const confirmAction = createConfirmAction(config.confirmButton);
    const cancelAction = createCancelAction(config.cancelButton);

    if (config.confirmFirst === false) {
      this.setActions([cancelAction, confirmAction]);
      return;
    }

    this.setActions([confirmAction, cancelAction]);
  }
}
