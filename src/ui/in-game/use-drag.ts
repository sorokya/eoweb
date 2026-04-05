import type { RefObject } from 'preact';
import { useCallback, useEffect, useRef } from 'preact/hooks';

type Delta = { dx: number; dy: number };

/**
 * Attaches pointer drag listeners to `handleRef`.
 * Calls `onMove(delta)` during drag.
 *
 * Returns a ref to attach to the drag handle element.
 */
export function useDrag<T extends HTMLElement>(
  onMove: (delta: Delta) => void,
): RefObject<T> {
  const handleRef = useRef<T>(null);
  const dragging = useRef(false);
  const lastPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const onPointerDown = useCallback((e: PointerEvent) => {
    e.preventDefault();
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      lastPos.current = { x: e.clientX, y: e.clientY };
      onMove({ dx, dy });
    },
    [onMove],
  );

  const onPointerUp = useCallback((_e: PointerEvent) => {
    dragging.current = false;
  }, []);

  useEffect(() => {
    const el = handleRef.current;
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

  return handleRef;
}
