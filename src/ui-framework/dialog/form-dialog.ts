import type { UiFrameworkRuntime } from '../types';
import { BaseDialog } from './base-dialog';
import type {
  BaseDialogActionConfig,
  BaseDialogActionHandlerResult,
  BaseDialogActionTone,
  BaseDialogDefinition,
} from './dialog-types';

let formDialogId = 0;

function nextFormDialogId(): string {
  formDialogId += 1;
  return `ui-framework-form-dialog-${formDialogId}`;
}

type FormDialogFieldName<TValues extends Record<string, unknown>> = Extract<
  keyof TValues,
  string
>;

export type FormDialogFieldType =
  | 'text'
  | 'password'
  | 'number'
  | 'checkbox'
  | 'select'
  | 'textarea';

export interface FormDialogSelectOption {
  label: string;
  value: string;
}

export interface FormDialogFieldConfig<
  TValues extends Record<string, unknown>,
  TFieldName extends FormDialogFieldName<TValues> = FormDialogFieldName<TValues>,
> {
  name: TFieldName;
  label: string;
  type?: FormDialogFieldType;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  controlClassName?: string;
  initialValue?: TValues[TFieldName];
  min?: number;
  max?: number;
  step?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  options?: readonly FormDialogSelectOption[];
  parseValue?: (rawValue: string | boolean) => TValues[TFieldName];
  validate?: (
    value: TValues[TFieldName],
    values: Readonly<Partial<TValues>>,
  ) => string | null | undefined;
}

export interface FormDialogButtonConfig {
  label?: string;
  tone?: BaseDialogActionTone;
  className?: string;
  disabled?: boolean;
  closeOnSelect?: boolean;
}

export interface FormDialogSubmitContext<
  TValues extends Record<string, unknown>,
> {
  dialog: FormDialog<TValues>;
  values: TValues;
}

export type FormDialogSubmitHandler<TValues extends Record<string, unknown>> = (
  context: FormDialogSubmitContext<TValues>,
) => BaseDialogActionHandlerResult;

export interface FormDialogConfig<TValues extends Record<string, unknown>>
  extends Omit<
    BaseDialogDefinition,
    'id' | 'title' | 'body' | 'bodyMount' | 'actions'
  > {
  id?: string;
  title?: string;
  description?: string;
  fields: readonly FormDialogFieldConfig<TValues>[];
  submitButton?: FormDialogButtonConfig;
  cancelButton?: FormDialogButtonConfig;
  onSubmit?: FormDialogSubmitHandler<TValues>;
  onCancel?: () => void;
}

type FormDialogControlElement =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement;

interface FormDialogFieldState<TValues extends Record<string, unknown>> {
  config: FormDialogFieldConfig<TValues>;
  control: FormDialogControlElement;
  errorElement: HTMLDivElement;
}

function applyClassNameTokens(element: HTMLElement, className?: string): void {
  if (!className) {
    return;
  }

  for (const token of className.split(/\s+/)) {
    const normalizedToken = token.trim();
    if (!normalizedToken) {
      continue;
    }

    element.classList.add(normalizedToken);
  }
}

function normalizeFieldType(type?: FormDialogFieldType): FormDialogFieldType {
  return type ?? 'text';
}

export class FormDialog<
  TValues extends Record<string, unknown>,
> extends BaseDialog {
  private readonly config: Readonly<FormDialogConfig<TValues>>;
  private readonly fields = new Map<
    FormDialogFieldName<TValues>,
    FormDialogFieldState<TValues>
  >();
  private descriptionElement: HTMLParagraphElement | null = null;

  constructor(runtime: UiFrameworkRuntime, config: FormDialogConfig<TValues>) {
    const openOnCreate = config.openOnCreate ?? false;

    super(runtime, {
      ...config,
      id: config.id ?? nextFormDialogId(),
      title: config.title,
      modal: config.modal ?? true,
      openOnCreate: false,
    });

    this.config = {
      ...config,
      id: this.definition.id,
    };

    this.mountBody((container) => this.mountFormBody(container));
    this.setActions(this.buildActions());

    if (openOnCreate) {
      this.open();
    }
  }

  getValues(): TValues {
    const values: Partial<TValues> = {};

    for (const [name, state] of this.fields) {
      values[name] = this.readFieldValue(state) as TValues[typeof name];
    }

    return values as TValues;
  }

  setValues(values: Partial<TValues>): void {
    for (const [name, value] of Object.entries(values) as [
      FormDialogFieldName<TValues>,
      TValues[FormDialogFieldName<TValues>],
    ][]) {
      const state = this.fields.get(name);
      if (!state) {
        continue;
      }

      this.writeFieldValue(state.control, state.config, value);
      this.setFieldError(name, null);
    }
  }

  setDescription(description: string): void {
    if (!this.descriptionElement) {
      return;
    }

    this.descriptionElement.textContent = description;
    this.descriptionElement.classList.toggle(
      'ui-framework-form-dialog__description--hidden',
      !description.trim(),
    );
  }

  getFieldElement(
    name: FormDialogFieldName<TValues>,
  ): FormDialogControlElement | null {
    return this.fields.get(name)?.control ?? null;
  }

  focusField(name: FormDialogFieldName<TValues>): void {
    this.fields.get(name)?.control.focus();
  }

  validate(): boolean {
    let isValid = true;
    const values = this.getValues();

    for (const [name, state] of this.fields) {
      const fieldType = normalizeFieldType(state.config.type);
      const rawValue = this.readRawFieldValue(state.control, fieldType);
      const typedValue = values[name];
      let errorMessage: string | null = null;

      if (state.config.required) {
        if (fieldType === 'checkbox') {
          if (rawValue !== true) {
            errorMessage = 'This field is required.';
          }
        } else if (typeof rawValue === 'string' && !rawValue.trim()) {
          errorMessage = 'This field is required.';
        }
      }

      if (!errorMessage && !state.control.checkValidity()) {
        errorMessage = state.control.validationMessage || 'Invalid value.';
      }

      if (!errorMessage && state.config.validate) {
        const validationMessage = state.config.validate(typedValue, values);
        if (validationMessage) {
          errorMessage = validationMessage;
        }
      }

      this.setFieldError(name, errorMessage);
      if (errorMessage) {
        isValid = false;
      }
    }

    return isValid;
  }

  setFieldError(name: FormDialogFieldName<TValues>, error: string | null): void {
    const state = this.fields.get(name);
    if (!state) {
      return;
    }

    state.errorElement.textContent = error ?? '';
    state.errorElement.classList.toggle(
      'ui-framework-form-dialog__error--hidden',
      !error,
    );
  }

  async submit(): Promise<boolean> {
    if (!this.validate()) {
      return false;
    }

    if (!this.config.onSubmit) {
      return true;
    }

    const result = await this.config.onSubmit({
      dialog: this,
      values: this.getValues(),
    });

    if (typeof result === 'boolean') {
      return result;
    }

    return true;
  }

  private mountFormBody(container: HTMLDivElement): () => void {
    container.replaceChildren();

    const wrapper = document.createElement('div');
    wrapper.classList.add('ui-framework-form-dialog');

    this.descriptionElement = document.createElement('p');
    this.descriptionElement.classList.add('ui-framework-form-dialog__description');
    wrapper.append(this.descriptionElement);
    this.setDescription(this.config.description ?? '');

    const form = document.createElement('form');
    form.classList.add('ui-framework-form-dialog__form');
    form.noValidate = true;

    this.fields.clear();

    for (const field of this.config.fields) {
      const fieldName = field.name as FormDialogFieldName<TValues>;
      const rowElement = document.createElement('div');
      const fieldType = normalizeFieldType(field.type);
      rowElement.classList.add(
        'ui-framework-form-dialog__field',
        `ui-framework-form-dialog__field--${fieldType}`,
      );
      applyClassNameTokens(rowElement, field.className);

      const controlId = `${this.definition.id}-field-${fieldName}`;
      const control = this.createControlElement(field, controlId, fieldType);
      const errorElement = document.createElement('div');
      errorElement.classList.add(
        'ui-framework-form-dialog__error',
        'ui-framework-form-dialog__error--hidden',
      );

      if (fieldType === 'checkbox') {
        const checkboxLabel = document.createElement('label');
        checkboxLabel.classList.add('ui-framework-form-dialog__checkbox-label');
        checkboxLabel.htmlFor = controlId;
        checkboxLabel.append(control, document.createTextNode(field.label));
        rowElement.append(checkboxLabel, errorElement);
      } else {
        const label = document.createElement('label');
        label.classList.add('ui-framework-form-dialog__label');
        label.htmlFor = controlId;
        label.textContent = field.label;
        rowElement.append(label, control, errorElement);
      }

      const clearError = (): void => {
        this.setFieldError(fieldName, null);
      };
      control.addEventListener('input', clearError);
      control.addEventListener('change', clearError);

      this.fields.set(fieldName, {
        config: field,
        control,
        errorElement,
      });

      form.append(rowElement);
    }

    const handleSubmit = (event: SubmitEvent): void => {
      event.preventDefault();
      void this.submit();
    };

    form.addEventListener('submit', handleSubmit);

    wrapper.append(form);
    container.append(wrapper);

    for (const [name, state] of this.fields) {
      if (state.config.initialValue !== undefined) {
        this.writeFieldValue(state.control, state.config, state.config.initialValue);
      }

      if (state.config.autoFocus) {
        this.focusField(name);
      }
    }

    return () => {
      this.fields.clear();
      this.descriptionElement = null;
      form.removeEventListener('submit', handleSubmit);
    };
  }

  private createControlElement(
    field: FormDialogFieldConfig<TValues>,
    controlId: string,
    fieldType: FormDialogFieldType,
  ): FormDialogControlElement {
    if (fieldType === 'textarea') {
      const textarea = document.createElement('textarea');
      textarea.id = controlId;
      textarea.name = String(field.name);
      textarea.required = Boolean(field.required);
      textarea.disabled = Boolean(field.disabled);
      textarea.placeholder = field.placeholder ?? '';
      if (field.minLength !== undefined) {
        textarea.minLength = field.minLength;
      }
      if (field.maxLength !== undefined) {
        textarea.maxLength = field.maxLength;
      }
      applyClassNameTokens(textarea, 'ui-framework-form-dialog__control');
      applyClassNameTokens(textarea, field.controlClassName);
      return textarea;
    }

    if (fieldType === 'select') {
      if (!field.options || field.options.length === 0) {
        throw new Error(`Form dialog field "${String(field.name)}" requires options.`);
      }

      const select = document.createElement('select');
      select.id = controlId;
      select.name = String(field.name);
      select.required = Boolean(field.required);
      select.disabled = Boolean(field.disabled);
      for (const optionConfig of field.options) {
        const optionElement = document.createElement('option');
        optionElement.value = optionConfig.value;
        optionElement.textContent = optionConfig.label;
        select.append(optionElement);
      }
      applyClassNameTokens(select, 'ui-framework-form-dialog__control');
      applyClassNameTokens(select, field.controlClassName);
      return select;
    }

    const input = document.createElement('input');
    input.id = controlId;
    input.name = String(field.name);
    input.type = fieldType;
    input.required = Boolean(field.required);
    input.disabled = Boolean(field.disabled);
    input.placeholder = field.placeholder ?? '';

    if (fieldType === 'number') {
      if (field.min !== undefined) {
        input.min = String(field.min);
      }
      if (field.max !== undefined) {
        input.max = String(field.max);
      }
      if (field.step !== undefined) {
        input.step = String(field.step);
      }
    }

    if (field.minLength !== undefined) {
      input.minLength = field.minLength;
    }
    if (field.maxLength !== undefined) {
      input.maxLength = field.maxLength;
    }
    if (field.pattern !== undefined) {
      input.pattern = field.pattern;
    }

    applyClassNameTokens(input, 'ui-framework-form-dialog__control');
    applyClassNameTokens(input, field.controlClassName);

    return input;
  }

  private buildActions(): BaseDialogActionConfig[] {
    const submitAction: BaseDialogActionConfig = {
      id: 'submit',
      label: this.config.submitButton?.label ?? 'OK',
      kind: 'ok',
      tone: this.config.submitButton?.tone ?? 'primary',
      className: this.config.submitButton?.className,
      disabled: this.config.submitButton?.disabled,
      closeOnSelect: false,
      onSelect: async () => {
        const shouldCloseByHandler = await this.submit();
        if (!shouldCloseByHandler) {
          return false;
        }

        if (this.config.submitButton?.closeOnSelect === false) {
          return false;
        }

        return true;
      },
    };

    const cancelAction: BaseDialogActionConfig = {
      id: 'cancel',
      label: this.config.cancelButton?.label ?? 'Cancel',
      kind: 'cancel',
      tone: this.config.cancelButton?.tone ?? 'neutral',
      className: this.config.cancelButton?.className,
      disabled: this.config.cancelButton?.disabled,
      closeOnSelect: false,
      onSelect: () => {
        this.config.onCancel?.();
        if (this.config.cancelButton?.closeOnSelect === false) {
          return false;
        }

        return true;
      },
    };

    return [submitAction, cancelAction];
  }

  private readRawFieldValue(
    control: FormDialogControlElement,
    fieldType: FormDialogFieldType,
  ): string | boolean {
    if (fieldType === 'checkbox' && control instanceof HTMLInputElement) {
      return control.checked;
    }

    return control.value;
  }

  private readFieldValue(state: FormDialogFieldState<TValues>): unknown {
    const fieldType = normalizeFieldType(state.config.type);
    const rawValue = this.readRawFieldValue(state.control, fieldType);

    if (state.config.parseValue) {
      return state.config.parseValue(rawValue);
    }

    if (fieldType === 'checkbox') {
      return Boolean(rawValue);
    }

    if (fieldType === 'number') {
      if (typeof rawValue !== 'string' || !rawValue.trim()) {
        return Number.NaN;
      }
      return Number(rawValue);
    }

    return rawValue;
  }

  private writeFieldValue(
    control: FormDialogControlElement,
    field: FormDialogFieldConfig<TValues>,
    value: unknown,
  ): void {
    const fieldType = normalizeFieldType(field.type);

    if (fieldType === 'checkbox' && control instanceof HTMLInputElement) {
      control.checked = Boolean(value);
      return;
    }

    control.value = value === undefined || value === null ? '' : String(value);
  }
}
