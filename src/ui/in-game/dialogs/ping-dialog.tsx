import { useEffect, useRef, useState } from 'preact/hooks';
import { useClient, useLocale } from '@/ui/context';
import { DialogBase } from './dialog-base';

const CHART_W = 260;
const CHART_H = 80;

type PingColorKey = 'success' | 'warning' | 'error';

function pingColor(ms: number): PingColorKey {
  if (ms <= 100) return 'success';
  if (ms <= 250) return 'warning';
  return 'error';
}

function colorClass(color: PingColorKey): string {
  if (color === 'success') return 'text-success';
  if (color === 'warning') return 'text-warning';
  return 'text-error';
}

/** Resolve a DaisyUI CSS variable to a colour string for canvas use. */
function resolveCssVar(variable: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .trim();
}

function strokeColorForPing(ms: number): string {
  const color = pingColor(ms);
  const varName =
    color === 'success' ? '--su' : color === 'warning' ? '--wa' : '--er';
  const raw = resolveCssVar(varName);
  // DaisyUI v4 vars are bare oklch channel values, e.g. "80.1% 0.15 160"
  return raw.includes('%') ? `oklch(${raw})` : raw || '#888';
}

function drawChart(canvas: HTMLCanvasElement, history: number[]): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || CHART_W;
  const h = canvas.clientHeight || CHART_H;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  if (history.length < 2) return;

  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;

  const latest = history[history.length - 1];
  ctx.strokeStyle = strokeColorForPing(latest);
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.beginPath();
  for (let i = 0; i < history.length; i++) {
    const x = (i / (history.length - 1)) * w;
    const y = h - ((history[i] - min) / range) * (h - 4) - 2;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function PingChart() {
  const client = useClient();
  const { locale } = useLocale();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasData, setHasData] = useState(
    () => client.pingController.pingHistory.length > 0,
  );

  useEffect(() => {
    const draw = () => {
      const history = client.pingController.pingHistory;
      setHasData(history.length > 0);
      if (canvasRef.current) drawChart(canvasRef.current, history);
    };

    // Draw immediately with current data
    draw();

    return client.pingController.subscribe(draw);
  }, [client.pingController]);

  return (
    <div class='relative h-20 w-full'>
      {!hasData && (
        <div class='absolute inset-0 flex items-center justify-center text-xs opacity-50'>
          {locale.ping.dialogNoData}
        </div>
      )}
      <canvas ref={canvasRef} class='h-full w-full' />
    </div>
  );
}

export function PingDialog() {
  const client = useClient();
  const { locale } = useLocale();

  const [stats, setStats] = useState(() => ({
    min: client.pingController.minPing,
    max: client.pingController.maxPing,
    avg: client.pingController.avgPing,
    hasData: client.pingController.pingHistory.length > 0,
  }));

  useEffect(() => {
    return client.pingController.subscribe(() => {
      setStats({
        min: client.pingController.minPing,
        max: client.pingController.maxPing,
        avg: client.pingController.avgPing,
        hasData: client.pingController.pingHistory.length > 0,
      });
    });
  }, [client.pingController]);

  const statItems = [
    { label: locale.ping.dialogMin, value: stats.min },
    { label: locale.ping.dialogAvg, value: stats.avg },
    { label: locale.ping.dialogMax, value: stats.max },
  ];

  return (
    <DialogBase id='ping' title={locale.ping.dialogTitle} size='sm'>
      <div class='flex flex-col gap-2 p-2'>
        <PingChart />
        <div class='grid grid-cols-3 gap-1'>
          {statItems.map(({ label, value }) => {
            const color = stats.hasData ? pingColor(value) : undefined;
            return (
              <div
                key={label}
                class='flex flex-col items-center rounded bg-base-200 px-2 py-1'
              >
                <span class='text-[10px] opacity-50'>{label}</span>
                <span
                  class={`font-bold font-mono text-sm ${color ? colorClass(color) : ''}`}
                >
                  {stats.hasData ? value : '---'}
                </span>
                <span class='text-[9px] opacity-40'>{locale.ping.ms}</span>
              </div>
            );
          })}
        </div>
      </div>
    </DialogBase>
  );
}
