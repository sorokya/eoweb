import type {
  BaseDialogActionConfig,
  BaseDialogActionHandler,
} from './dialog-types';

export interface OkDialogActionConfig {
  label?: string;
  closeOnSelect?: boolean;
  className?: string;
  disabled?: boolean;
  onSelect?: BaseDialogActionHandler;
}

export interface CancelDialogActionConfig {
  label?: string;
  closeOnSelect?: boolean;
  className?: string;
  disabled?: boolean;
  onSelect?: BaseDialogActionHandler;
}

export interface OkCancelDialogActionConfig {
  ok?: OkDialogActionConfig;
  cancel?: CancelDialogActionConfig;
  okFirst?: boolean;
}

export function createOkDialogAction(
  config: OkDialogActionConfig = {},
): BaseDialogActionConfig {
  return {
    id: 'ok',
    label: config.label ?? 'OK',
    kind: 'ok',
    tone: 'primary',
    closeOnSelect: config.closeOnSelect ?? true,
    className: config.className,
    disabled: config.disabled,
    onSelect: config.onSelect,
  };
}

export function createCancelDialogAction(
  config: CancelDialogActionConfig = {},
): BaseDialogActionConfig {
  return {
    id: 'cancel',
    label: config.label ?? 'Cancel',
    kind: 'cancel',
    tone: 'neutral',
    closeOnSelect: config.closeOnSelect ?? true,
    className: config.className,
    disabled: config.disabled,
    onSelect: config.onSelect,
  };
}

export function createOkCancelDialogActions(
  config: OkCancelDialogActionConfig = {},
): BaseDialogActionConfig[] {
  const okAction = createOkDialogAction(config.ok);
  const cancelAction = createCancelDialogAction(config.cancel);

  if (config.okFirst === false) {
    return [cancelAction, okAction];
  }

  return [okAction, cancelAction];
}
