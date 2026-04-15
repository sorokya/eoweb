type SelectOption = {
  value: string;
  label: string;
};

type SelectVariant =
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

type SelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  variant?: SelectVariant | SelectVariant[];
  class?: string;
  label?: string;
};

export function Select({
  value,
  onChange,
  options,
  variant = '',
  class: className = '',
  label,
}: SelectProps) {
  const variantClasses = (Array.isArray(variant) ? variant : [variant])
    .filter(Boolean)
    .map((v) => `select-${v}`)
    .join(' ');

  if (label) {
    return (
      <label class='flex flex-col gap-1'>
        <span class='label text-xs'>{label}</span>
        <select
          class={`select ${variantClasses} ${className}`}
          value={value}
          onChange={(e) => onChange((e.target as HTMLSelectElement).value)}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <select
      class={`select ${variantClasses} ${className}`}
      value={value}
      onChange={(e) => onChange((e.target as HTMLSelectElement).value)}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
