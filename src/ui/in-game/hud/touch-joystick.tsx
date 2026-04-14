import { Direction } from 'eolib';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { HUD_Z } from '@/ui/consts';
import { useClient } from '@/ui/context';
import {
  useDrag,
  useHudVisibility,
  usePosition,
  useRepositionMode,
} from '@/ui/in-game';

// Rem-based sizing for CSS rendering
const BASE_REM = 6;
const THUMB_REM = 2.5;
// Pixel equivalents for pointer math (assumes 16px root font)
const BASE_PX = BASE_REM * 16;
const THUMB_PX = THUMB_REM * 16;
const MAX_RADIUS = (BASE_PX - THUMB_PX) / 2;
const DEAD_ZONE = 20; // px — intentionally coarse
const MARGIN_PX = 12;

function angleToDirection(dx: number, dy: number): Direction {
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? Direction.Right : Direction.Left;
  }
  return dy > 0 ? Direction.Down : Direction.Up;
}

export function TouchJoystick() {
  const client = useClient();
  const [isVisible] = useHudVisibility('touch-joystick', {
    mobile: true,
    desktop: false,
  });
  const [repositionMode] = useRepositionMode();

  const [pos, setPos] = usePosition('touch-joystick', () => ({
    x: MARGIN_PX,
    y: window.innerHeight - BASE_PX - MARGIN_PX,
  }));

  const [thumbOffset, setThumbOffset] = useState({ x: 0, y: 0 });
  const activePointer = useRef<number | null>(null);
  const baseRef = useRef<HTMLDivElement>(null);

  const dragHandleRef = useDrag<HTMLDivElement>((delta) => {
    setPos({
      x: Math.max(0, Math.min(window.innerWidth - BASE_PX, pos.x + delta.dx)),
      y: Math.max(0, Math.min(window.innerHeight - BASE_PX, pos.y + delta.dy)),
    });
  });

  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      if (repositionMode) return;
      if (activePointer.current !== null) return;
      e.preventDefault();
      e.stopPropagation();
      activePointer.current = e.pointerId;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [repositionMode],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (repositionMode) return;
      if (activePointer.current !== e.pointerId) return;
      e.preventDefault();

      const base = baseRef.current;
      if (!base) return;

      const rect = base.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > MAX_RADIUS) {
        dx = (dx / dist) * MAX_RADIUS;
        dy = (dy / dist) * MAX_RADIUS;
      }

      setThumbOffset({ x: dx, y: dy });

      if (dist > DEAD_ZONE) {
        client.keyboardController.setTouchDirection(angleToDirection(dx, dy));
      } else {
        client.keyboardController.setTouchDirection(null);
      }
    },
    [repositionMode, client],
  );

  const onPointerUp = useCallback(
    (e: PointerEvent) => {
      if (activePointer.current !== e.pointerId) return;
      activePointer.current = null;
      setThumbOffset({ x: 0, y: 0 });
      client.keyboardController.setTouchDirection(null);
    },
    [client],
  );

  useEffect(() => {
    const el = baseRef.current;
    if (!el) return;

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
    };
  }, [onPointerDown, onPointerMove, onPointerUp]);

  if (!isVisible) return null;

  return (
    <div class='absolute' style={{ left: pos.x, top: pos.y, zIndex: HUD_Z }}>
      {repositionMode ? (
        <div
          ref={dragHandleRef}
          class='flex cursor-grab items-center justify-center rounded-full border-2 border-base-content/40 border-dashed bg-base-100/20 active:cursor-grabbing'
          style={{
            width: `${BASE_REM}rem`,
            height: `${BASE_REM}rem`,
            touchAction: 'none',
          }}
        >
          <span class='text-[0.625rem] text-base-content/60'>Move</span>
        </div>
      ) : (
        <div
          ref={baseRef}
          class='relative flex items-center justify-center rounded-full border border-base-content/20 bg-base-100/10'
          style={{
            width: `${BASE_REM}rem`,
            height: `${BASE_REM}rem`,
            touchAction: 'none',
          }}
        >
          <div
            class='absolute rounded-full border border-base-content/30 bg-base-content/20'
            style={{
              width: `${THUMB_REM}rem`,
              height: `${THUMB_REM}rem`,
              transform: `translate(${thumbOffset.x}px, ${thumbOffset.y}px)`,
              transition:
                thumbOffset.x === 0 && thumbOffset.y === 0
                  ? 'transform 0.1s ease'
                  : 'none',
            }}
          />
        </div>
      )}
    </div>
  );
}
