import { useEffect, useState } from 'preact/hooks';

type ViewportSize = { vw: number; vh: number };

export function useViewport(): ViewportSize {
  const [size, setSize] = useState<ViewportSize>({
    vw: window.innerWidth,
    vh: window.innerHeight,
  });

  useEffect(() => {
    const handler = () =>
      setSize({ vw: window.innerWidth, vh: window.innerHeight });
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return size;
}
