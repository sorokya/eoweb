import type { ComponentChildren } from 'preact';
import { formatBigNumber } from '@/utils';

type ProgressColor =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'primary'
  | 'secondary'
  | 'accent';

type ProgressBarProps = {
  value: number;
  max: number;
  icon: ComponentChildren;
  label: string;
  color: ProgressColor;
};

export function ProgressBar({
  value,
  max,
  icon,
  label,
  color,
}: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <>
      {/* Compact: icon + value, shown on small screens only */}
      <div
        class={`inline-flex items-center gap-0.5 text-[10px] text-${color} leading-tight md:hidden`}
      >
        {icon}
        {pct}%
      </div>

      {/* Full bar: shown on md+ screens only */}
      <div class='hidden w-full min-w-0 max-w-30 items-center gap-1 md:flex'>
        <span class='flex w-5 shrink-0 items-center justify-end opacity-70'>
          {icon}
        </span>
        <div class='relative flex flex-1 items-center'>
          <progress
            class={`progress progress-${color} h-4 w-full`}
            value={pct}
            max={100}
          />
          <span class='pointer-events-none absolute inset-0 flex items-center justify-center font-semibold text-[8px] text-white leading-none drop-shadow-[0_1px_3px_rgba(0,0,0,1)]'>
            {formatBigNumber(value)}/{formatBigNumber(max)} {label}
          </span>
        </div>
      </div>
    </>
  );
}
