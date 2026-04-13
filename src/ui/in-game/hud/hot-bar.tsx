import { HUD_Z } from './consts';

const SLOT_COUNT = 6;

export function HotBar() {
  return (
    <div
      role='presentation'
      class='flex gap-1'
      style={{ zIndex: HUD_Z }}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
    >
      {Array.from({ length: SLOT_COUNT }).map((_, i) => (
        <div
          key={i}
          class='h-11 w-11 rounded border-2 border-base-300 bg-base-200/80 shadow'
        />
      ))}
    </div>
  );
}
