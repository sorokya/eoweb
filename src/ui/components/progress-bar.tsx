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
    <div class='flex items-center gap-1 w-full min-w-0'>
      <span class='flex-shrink-0 text-[8px] md:text-[9px] font-bold w-5 text-right opacity-80 uppercase tracking-wide'>
        {label}
      </span>
      <div class='relative flex-1 h-3 md:h-4 rounded overflow-hidden bg-black/45 ring-1 ring-inset ring-white/8'>
        <div
          class={`absolute inset-y-0 left-0 rounded transition-[width] duration-500 ease-out ${barClass}`}
          style={{ width: `${pct}%` }}
        />
        <span class='absolute inset-0 flex items-center justify-center text-[7px] md:text-[8px] font-semibold leading-none drop-shadow text-white'>
          {fmt(value)}/{fmt(max)}
        </span>
      </div>
    </div>
  );
}
