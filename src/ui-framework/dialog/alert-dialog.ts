import type { UiFrameworkRuntime } from '../types';
import { BaseDialog } from './base-dialog';
import type {
  BaseDialogActionConfig,
  BaseDialogActionHandler,
  BaseDialogBodyContent,
  BaseDialogDefinition,
} from './dialog-types';

let alertDialogId = 0;

function nextAlertDialogId(): string {
  alertDialogId += 1;
  return `ui-framework-alert-dialog-${alertDialogId}`;
}

export interface AlertDialogButtonConfig {
  id?: string;
  label?: string;
  tone?: BaseDialogActionConfig['tone'];
  className?: string;
  disabled?: boolean;
  closeOnSelect?: boolean;
  onSelect?: BaseDialogActionHandler<void>;
}

export interface AlertDialogConfig
  extends Omit<
    BaseDialogDefinition,
    'id' | 'title' | 'body' | 'bodyMount' | 'actions'
  > {
  id?: string;
  title?: string;
  body: BaseDialogBodyContent;
  button?: AlertDialogButtonConfig;
}

function createAlertAction(
  button: AlertDialogButtonConfig | undefined,
): BaseDialogActionConfig {
  return {
    id: button?.id ?? 'ok',
    label: button?.label ?? 'OK',
    kind: 'ok',
    tone: button?.tone ?? 'primary',
    className: button?.className,
    disabled: button?.disabled,
    closeOnSelect: button?.closeOnSelect,
    onSelect: button?.onSelect,
  };
}

export class AlertDialog extends BaseDialog {
  constructor(runtime: UiFrameworkRuntime, config: AlertDialogConfig) {
    super(runtime, {
      ...config,
      id: config.id ?? nextAlertDialogId(),
      title: config.title,
      body: config.body,
      modal: config.modal ?? true,
      actions: [createAlertAction(config.button)],
    });
  }

  setContent(body: BaseDialogBodyContent, title?: string): void {
    if (title !== undefined) {
      this.setTitle(title);
    }
    this.setBodyContent(body);
  }

  setButton(button: AlertDialogButtonConfig): void {
    this.setActions([createAlertAction(button)]);
  }
}
