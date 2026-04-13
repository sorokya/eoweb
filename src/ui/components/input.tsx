import { useEffect, useRef } from 'preact/compat';

type InputVariant =
  | ''
  | 'ghost'
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl';

type InputType = 'text' | 'password' | 'email' | 'number';

type InputProps = {
  label?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  variant?: InputVariant | InputVariant[];
  type?: InputType;
  placeholder?: string;
  min?: number;
  max?: number;
  maxlength?: number;
  required?: boolean;
  autofocus?: boolean;
};

export function Input({
  label,
  name,
  value,
  onChange,
  type = 'text',
  placeholder,
  min,
  max,
  maxlength,
  required,
  variant = '',
  autofocus,
}: InputProps) {
  const variantClasses = (Array.isArray(variant) ? variant : [variant])
    .filter(Boolean)
    .map((v) => `input-${v}`)
    .join(' ');

  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autofocus && ref.current) {
      ref.current.focus();
    }
  }, [autofocus]);

  if (label) {
    return (
      <label class={`input ${variantClasses}`}>
        <span class='label'>{label}</span>
        <input
          type={type}
          name={name}
          value={value}
          onChange={(e) => onChange((e.target as HTMLInputElement).value)}
          placeholder={placeholder}
          min={min}
          max={max}
          maxLength={maxlength}
          required={required}
          ref={ref}
        />
      </label>
    );
  }

  return (
    <input
      class={`input ${variantClasses}`}
      type={type}
      name={name}
      value={value}
      onInput={(e) => onChange((e.target as HTMLInputElement).value)}
      placeholder={placeholder}
      min={min}
      max={max}
      maxLength={maxlength}
      required={required}
      ref={ref}
    />
  );
}
