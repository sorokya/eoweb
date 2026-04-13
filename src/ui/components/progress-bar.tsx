function fmt(n: number): string {
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

type ProgressBarProps = {
  value: number;
  max: number;
  label: string;
  barClass: string;
};

export function ProgressBar({ value, max, label, barClass }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div class='flex w-full min-w-0 items-center gap-1'>
      <span class='w-5 flex-shrink-0 text-right font-bold text-[8px] uppercase tracking-wide opacity-80 md:text-[9px]'>
        {label}
      </span>
      <div class='relative h-3 flex-1 overflow-hidden rounded bg-black/45 ring-1 ring-white/8 ring-inset md:h-4'>
        <div
          class={`absolute inset-y-0 left-0 rounded transition-[width] duration-500 ease-out ${barClass}`}
          style={{ width: `${pct}%` }}
        />
        <span class='absolute inset-0 flex items-center justify-center font-semibold text-[7px] text-white leading-none drop-shadow md:text-[8px]'>
          {fmt(value)}/{fmt(max)}
        </span>
      </div>
    </div>
  );
}
