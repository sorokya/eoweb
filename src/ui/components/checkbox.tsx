type CheckboxVariant =
  | ''
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'neutral'
  | 'success'
  | 'warning'
  | 'info'
  | 'error'
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl';

type CheckboxProps = {
  label?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  variant?: CheckboxVariant | CheckboxVariant[];
};

export function Checkbox({
  label,
  checked,
  onChange,
  variant = '',
}: CheckboxProps) {
  const variantClasses = (Array.isArray(variant) ? variant : [variant])
    .filter(Boolean)
    .map((v) => `btn-${v}`)
    .join(' ');

  if (label) {
    return (
      <label class='label'>
        <input
          class={`checkbox ${variantClasses}`}
          type='checkbox'
          checked={checked}
          onChange={(e) => onChange((e.target as HTMLInputElement).checked)}
        />
        {label}
      </label>
    );
  }

  return (
    <input
      class={`checkbox ${variantClasses}`}
      type='checkbox'
      checked={checked}
      onChange={(e) => onChange((e.target as HTMLInputElement).checked)}
    />
  );
}
