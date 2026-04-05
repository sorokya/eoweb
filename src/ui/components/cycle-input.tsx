import { useCallback } from 'preact/hooks';

type CycleInputProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  format?: (value: number) => string;
  onChange: (value: number) => void;
};

export function CycleInput({
  label,
  value,
  min,
  max,
  format,
  onChange,
}: CycleInputProps) {
  const prev = useCallback(() => {
    onChange(value <= min ? max : value - 1);
  }, [value, min, max, onChange]);

  const next = useCallback(() => {
    onChange(value >= max ? min : value + 1);
  }, [value, min, max, onChange]);

  return (
    <div class='flex items-center gap-2'>
      <span class='label text-sm flex-1'>{label}</span>
      <div class='flex items-center gap-1'>
        <button type='button' class='btn btn-xs btn-ghost' onClick={prev}>
          {'<'}
        </button>
        <span class='text-sm min-w-12 text-center'>
          {format ? format(value) : value}
        </span>
        <button type='button' class='btn btn-xs btn-ghost' onClick={next}>
          {'>'}
        </button>
      </div>
    </div>
  );
}
