import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { DialogId } from './window-manager';

type Size = { w: number; h: number };
type Pos = { x: number; y: number };

const GAP = 8;
const PADDING = 8;
const RESIZE_DEBOUNCE_MS = 150;

type Column = { dialogs: DialogId[]; totalH: number; maxW: number };

/** Distribute dialogs into exactly `numCols` columns using shortest-column-first. */
function distribute(
  sorted: DialogId[],
  sizes: Map<DialogId, Size>,
  numCols: number,
): Column[] {
  const cols: Column[] = Array.from({ length: numCols }, () => ({
    dialogs: [],
    totalH: 0,
    maxW: 0,
  }));
  for (const id of sorted) {
    const { w, h } = sizes.get(id)!;
    const col = cols.reduce((min, c) => (c.totalH <= min.totalH ? c : min));
    if (col.dialogs.length > 0) col.totalH += GAP;
    col.dialogs.push(id);
    col.totalH += h;
    col.maxW = Math.max(col.maxW, w);
  }
  return cols.filter((c) => c.dialogs.length > 0);
}

function positionColumns(
  cols: Column[],
  sizes: Map<DialogId, Size>,
  arenaW: number,
  arenaH: number,
): Map<DialogId, Pos> {
  const totalW =
    cols.reduce((s, c) => s + c.maxW, 0) + GAP * Math.max(0, cols.length - 1);
  const totalH = Math.max(...cols.map((c) => c.totalH));

  let colX = Math.max(PADDING, Math.round((arenaW - totalW) / 2));
  const startY = Math.max(PADDING, Math.round((arenaH - totalH) / 2));

  const out = new Map<DialogId, Pos>();
  for (const col of cols) {
    let y = startY;
    for (const id of col.dialogs) {
      const { w, h } = sizes.get(id)!;
      out.set(id, { x: colX + Math.round((col.maxW - w) / 2), y });
      y += h + GAP;
    }
    colX += col.maxW + GAP;
  }
  return out;
}

/**
 * Horizontal-first layout:
 * Try placing all dialogs side-by-side (N columns). If that overflows the
 * arena, reduce column count by 1 and retry. The first arrangement that fits
 * both axes wins — so dialogs spread horizontally as much as possible and
 * only stack vertically when forced.
 * Largest dialog (by area) always anchors the leftmost column.
 */
function computeLayout(
  ids: DialogId[],
  sizes: Map<DialogId, Size>,
  arenaW: number,
  arenaH: number,
): Map<DialogId, Pos> {
  const ready = ids.filter((id) => sizes.has(id));
  if (!ready.length || arenaW === 0) return new Map();

  const availW = arenaW - PADDING * 2;
  const availH = arenaH - PADDING * 2;

  // Largest area first so big dialogs anchor the left column.
  const sorted = [...ready].sort((a, b) => {
    const sa = sizes.get(a)!;
    const sb = sizes.get(b)!;
    return sb.w * sb.h - sa.w * sa.h;
  });

  // Try from most columns down to 1; return the first layout that fits.
  // Keep the most-horizontal fallback in case nothing fits perfectly.
  let fallback: Map<DialogId, Pos> | null = null;

  for (let n = sorted.length; n >= 1; n--) {
    const cols = distribute(sorted, sizes, n);
    const totalW =
      cols.reduce((s, c) => s + c.maxW, 0) + GAP * Math.max(0, cols.length - 1);
    const totalH = Math.max(...cols.map((c) => c.totalH));

    const positions = positionColumns(cols, sizes, arenaW, arenaH);
    if (fallback === null) fallback = positions;
    if (totalW <= availW && totalH <= availH) return positions;
  }

  return fallback!;
}

// ─── ArenaSlot ───────────────────────────────────────────────────────────────

type ArenaSlotProps = {
  pos: Pos | undefined;
  slotRef: (el: HTMLDivElement | null) => void;
  children: preact.ComponentChildren;
};

function ArenaSlot({ pos, slotRef, children }: ArenaSlotProps) {
  return (
    <div
      ref={slotRef}
      style={{
        position: 'absolute' as const,
        left: pos?.x ?? 0,
        top: pos?.y ?? 0,
        visibility: pos ? 'visible' : 'hidden',
      }}
    >
      {children}
    </div>
  );
}

// ─── DialogArena ─────────────────────────────────────────────────────────────

export type DialogArenaProps = {
  ids: DialogId[];
  style?: preact.JSX.CSSProperties;
  class?: string;
  renderDialog: (id: DialogId) => preact.ComponentChildren;
};

/**
 * Positions dialogs using JS-computed absolute coordinates.
 * Layout recalculates only when the dialog list changes or the window resizes
 * (debounced). Individual dialog height changes do not affect sibling positions.
 */
export function DialogArena({
  ids,
  style,
  class: cls,
  renderDialog,
}: DialogArenaProps) {
  const arenaRef = useRef<HTMLDivElement>(null);
  const slotElemsRef = useRef<Map<DialogId, HTMLDivElement>>(new Map());
  const [positions, setPositions] = useState<Map<DialogId, Pos>>(new Map());

  const runLayout = useCallback(() => {
    const arena = arenaRef.current;
    if (!arena) return;
    const arenaW = arena.clientWidth;
    const arenaH = arena.clientHeight;

    const sizes = new Map<DialogId, Size>();
    for (const id of ids) {
      const el = slotElemsRef.current.get(id);
      if (el) {
        const { width: w, height: h } = el.getBoundingClientRect();
        if (w && h) sizes.set(id, { w, h });
      }
    }

    setPositions(computeLayout(ids, sizes, arenaW, arenaH));
  }, [ids]);

  // Wait one animation frame so newly opened dialogs have had a chance to
  // render before we measure them.
  useEffect(() => {
    const raf = requestAnimationFrame(runLayout);
    return () => cancelAnimationFrame(raf);
  }, [ids, runLayout]);

  // Debounced window resize — no per-dialog observers needed.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(runLayout, RESIZE_DEBOUNCE_MS);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      clearTimeout(timer);
    };
  }, [runLayout]);

  // Stable ref callbacks per dialog id so ArenaSlot never sees a new prop.
  const slotRefCbsRef = useRef<
    Map<DialogId, (el: HTMLDivElement | null) => void>
  >(new Map());
  for (const id of [...slotRefCbsRef.current.keys()]) {
    if (!ids.includes(id)) slotRefCbsRef.current.delete(id);
  }
  const getSlotRefCb = (id: DialogId) => {
    if (!slotRefCbsRef.current.has(id)) {
      slotRefCbsRef.current.set(id, (el: HTMLDivElement | null) => {
        if (el) slotElemsRef.current.set(id, el);
        else slotElemsRef.current.delete(id);
      });
    }
    return slotRefCbsRef.current.get(id)!;
  };

  return (
    <div ref={arenaRef} class={cls} style={style}>
      {ids.map((id) => (
        <ArenaSlot key={id} pos={positions.get(id)} slotRef={getSlotRefCb(id)}>
          {renderDialog(id)}
        </ArenaSlot>
      ))}
    </div>
  );
}
