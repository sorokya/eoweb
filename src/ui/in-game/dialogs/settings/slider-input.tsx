type SliderInputProps = {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (value: number) => void;
};

export function SliderInput({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  format,
  onChange,
}: SliderInputProps) {
  const display = format ? format(value) : `${Math.round(value * 100)}%`;

  return (
    <div class='flex flex-col gap-1'>
      <div class='flex items-center justify-between'>
        <span class='label-text text-sm opacity-80'>{label}</span>
        <span class='min-w-10 text-right text-sm tabular-nums opacity-70'>
          {display}
        </span>
      </div>
      <input
        type='range'
        class='range range-xs'
        min={min}
        max={max}
        step={step}
        value={value}
        onInput={(e) =>
          onChange(Number.parseFloat((e.target as HTMLInputElement).value))
        }
      />
    </div>
  );
}
