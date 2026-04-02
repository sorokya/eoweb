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
  id: string;
  value: string;
  onChange: (value: string) => void;
  variant?: InputVariant;
  type?: InputType;
  placeholder?: string;
  min?: number;
  max?: number;
  required?: boolean;
};

export function Input({
  id,
  value,
  onChange,
  type = 'text',
  placeholder,
  min,
  max,
  required,
  variant = '',
}: InputProps) {
  return (
    <input
      id={id}
      class={`input${variant ? ` input-${variant}` : ''}`}
      type={type}
      value={value}
      onInput={(e) => onChange((e.target as HTMLInputElement).value)}
      placeholder={placeholder}
      min={min}
      max={max}
      required={required}
    />
  );
}
