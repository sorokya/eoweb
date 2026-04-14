import { type Emote as EmoteType, SitState } from 'eolib';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { HUD_Z } from '@/ui/consts';
import { useClient } from '@/ui/context';
import {
  useDrag,
  useHudVisibility,
  usePosition,
  useRepositionMode,
} from '@/ui/in-game';
import {
  EmoteRadialMenu,
  getEmoteEmoji,
  getEmoteLabel,
  readSelectedEmote,
  writeSelectedEmote,
} from './emote-radial-menu';

// ---------------------------------------------------------------------------
// Layout geometry (all values in rem; 16px root assumed for px clamping)
// ---------------------------------------------------------------------------
const OUTER_W_REM = 7.5;
const OUTER_H_REM = 8;
const OUTER_W_PX = OUTER_W_REM * 16;
const OUTER_H_PX = OUTER_H_REM * 16;
const MARGIN_PX = 12;

// Attack button — large circle, right side
const ATK_R = 2.25; // rem radius (4.5rem diameter)
const ATK_CX = 4.75; // rem, center-x within bounding box
const ATK_CY = 4.5; // rem, center-y

// Satellite pills orbit at (D_X left, D_Y up/down) from attack center.
// orbit_r = √(D_X²+D_Y²) ≈ 3.47rem, which clears ATK_R + SAT_H/2 = 3.0rem.
// Pills sit more to the left than above/below, giving a compact vertical span.
const D_X = 3.0; // rem — horizontal offset
const D_Y = 1.75; // rem — vertical offset
const SAT_W = 2.5; // rem — pill width (long axis)
const SAT_H = 1.5; // rem — pill height (short axis)

const EMOTE_CX = ATK_CX - D_X; // 1.75rem
const EMOTE_CY = ATK_CY - D_Y; // 2.75rem
const SIT_CX = ATK_CX - D_X; // 1.75rem
const SIT_CY = ATK_CY + D_Y; // 6.25rem

// Rotation angles — tangent to the orbit circle at each pill's position.
// The orbit vector to emote is (−D_X, −D_Y); the tangent (90° CCW) is
// (D_Y, −D_X) = (1.75, −3.0), which is ~−60° from horizontal. ✓
const EMOTE_ROT = -60; // CSS rotate degrees (CW = positive in CSS)
const SIT_ROT = 60;

// Visual top-most extent of the emote pill after rotate(EMOTE_ROT):
//   After rotate(-60°), corner (-W/2, -H/2) becomes the topmost point.
//   y-offset from center = (SAT_W·sin60 + SAT_H·cos60) / 2
//   x-offset from center = (−SAT_W·cos60 + SAT_H·sin60) / 2
const SIN60 = Math.sin(Math.PI / 3);
const COS60 = Math.cos(Math.PI / 3);
const VIS_TOP_Y = (SAT_W * SIN60 + SAT_H * COS60) / 2; // ≈ 1.457rem
const VIS_TOP_X = (-SAT_W * COS60 + SAT_H * SIN60) / 2; // ≈ 0.025rem

// Picker button — centered on rotated emote pill's visual top edge
const PICK_W = 1.375; // rem
const PICK_H = 0.75; // rem
const PICK_GAP = 0.25; // rem gap above pill top

function usePressButton(
  onDown: () => void,
  onUp: () => void,
): preact.RefObject<HTMLButtonElement> {
  const ref = useRef<HTMLButtonElement>(null);
  const pointer = useRef<number | null>(null);

  const handleDown = useCallback(
    (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      pointer.current = e.pointerId;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      onDown();
    },
    [onDown],
  );

  const handleUp = useCallback(
    (e: PointerEvent) => {
      if (pointer.current !== e.pointerId) return;
      pointer.current = null;
      onUp();
    },
    [onUp],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener('pointerdown', handleDown);
    el.addEventListener('pointerup', handleUp);
    el.addEventListener('pointercancel', handleUp);
    return () => {
      el.removeEventListener('pointerdown', handleDown);
      el.removeEventListener('pointerup', handleUp);
      el.removeEventListener('pointercancel', handleUp);
    };
  }, [handleDown, handleUp]);

  return ref;
}

export function TouchActionButtons() {
  const client = useClient();
  const [isVisible] = useHudVisibility('touch-actions', {
    mobile: true,
    desktop: false,
  });
  const [repositionMode] = useRepositionMode();

  const [pos, setPos] = usePosition('touch-actions', () => ({
    x: window.innerWidth - OUTER_W_PX - MARGIN_PX,
    y: window.innerHeight - OUTER_H_PX - MARGIN_PX,
  }));

  const [emotePickerOpen, setEmotePickerOpen] = useState(false);
  const [selectedEmote, setSelectedEmote] =
    useState<EmoteType>(readSelectedEmote);

  const dragHandleRef = useDrag<HTMLDivElement>((delta) => {
    setPos({
      x: Math.max(
        0,
        Math.min(window.innerWidth - OUTER_W_PX, pos.x + delta.dx),
      ),
      y: Math.max(
        0,
        Math.min(window.innerHeight - OUTER_H_PX, pos.y + delta.dy),
      ),
    });
  });

  const attackRef = usePressButton(
    useCallback(() => client.keyboardController.setTouchAttack(true), [client]),
    useCallback(
      () => client.keyboardController.setTouchAttack(false),
      [client],
    ),
  );

  const sitStandRef = usePressButton(
    useCallback(
      () => client.keyboardController.setTouchSitStand(true),
      [client],
    ),
    useCallback(
      () => client.keyboardController.setTouchSitStand(false),
      [client],
    ),
  );

  const handleEmoteSelect = useCallback(
    (emote: EmoteType) => {
      setSelectedEmote(emote);
      writeSelectedEmote(emote);
      client.socialController.emote(emote);
    },
    [client],
  );

  const handleEmoteUse = useCallback(() => {
    client.socialController.emote(selectedEmote);
  }, [client, selectedEmote]);

  const character = client.getPlayerCharacter();
  const isSitting =
    character?.sitState === SitState.Chair ||
    character?.sitState === SitState.Floor;

  if (!isVisible) return null;

  // Rem helper
  const r = (v: number) => `${v}rem`;

  // Pill top-left from center (pre-rotation CSS position)
  const emoteLeft = r(EMOTE_CX - SAT_W / 2);
  const emoteTop = r(EMOTE_CY - SAT_H / 2);
  const sitLeft = r(SIT_CX - SAT_W / 2);
  const sitTop = r(SIT_CY - SAT_H / 2);
  // Attack top-left from center
  const atkLeft = r(ATK_CX - ATK_R);
  const atkTop = r(ATK_CY - ATK_R);
  // Picker: anchored to visual right of rotated emote pill
  const pickLeft = r(EMOTE_CX + VIS_TOP_X + PICK_GAP);
  const pickTop = r(EMOTE_CY - VIS_TOP_Y - PICK_GAP - 0.25);

  return (
    <div
      class='absolute'
      style={{
        left: pos.x,
        top: pos.y,
        zIndex: HUD_Z,
        width: r(OUTER_W_REM),
        height: r(OUTER_H_REM),
      }}
      onContextMenu={(e) => e.stopPropagation()}
    >
      {repositionMode ? (
        <div
          ref={dragHandleRef}
          class='flex h-full w-full cursor-grab items-center justify-center rounded-2xl border-2 border-base-content/40 border-dashed bg-base-100/20 active:cursor-grabbing'
          style={{ touchAction: 'none' }}
        >
          <span class='text-[0.625rem] text-base-content/60'>Move</span>
        </div>
      ) : (
        <>
          {/* Picker toggle — anchored above rotated emote pill's visual top */}
          <button
            type='button'
            class='absolute flex select-none items-center justify-center rounded-md border border-base-content/20 bg-base-100/20 text-[0.6rem] active:bg-base-content/25'
            style={{
              left: pickLeft,
              top: pickTop,
              width: r(PICK_W),
              height: r(PICK_H),
              touchAction: 'none',
              transform: 'rotate(30deg)',
            }}
            onClick={(e) => {
              e.stopPropagation();
              setEmotePickerOpen((o) => !o);
            }}
          >
            {emotePickerOpen ? '▲' : '▼'}
          </button>

          {/* Emote — rotated −60° to hug attack circle tangentially */}
          <button
            type='button'
            class='absolute flex select-none items-center justify-center rounded-xl border border-base-content/20 bg-base-100/10 text-sm active:bg-base-content/20'
            style={{
              left: emoteLeft,
              top: emoteTop,
              width: r(SAT_W),
              height: r(SAT_H),
              transform: `rotate(${EMOTE_ROT}deg)`,
              touchAction: 'none',
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleEmoteUse();
            }}
            title={getEmoteLabel(selectedEmote)}
          >
            <span
              style={{
                display: 'inline-block',
                transform: `rotate(${-EMOTE_ROT}deg)`,
              }}
            >
              {getEmoteEmoji(selectedEmote)}
            </span>
          </button>

          {/* Sit/Stand — rotated +60° to hug attack circle tangentially */}
          <button
            ref={sitStandRef}
            type='button'
            class='absolute flex select-none items-center justify-center rounded-xl border border-base-content/20 bg-base-100/10 text-sm active:bg-base-content/20'
            style={{
              left: sitLeft,
              top: sitTop,
              width: r(SAT_W),
              height: r(SAT_H),
              transform: `rotate(${SIT_ROT}deg)`,
              touchAction: 'none',
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <span
              style={{
                display: 'inline-block',
                transform: `rotate(${-SIT_ROT}deg)`,
              }}
            >
              {isSitting ? '🧍' : '🪑'}
            </span>
          </button>

          {/* Attack — large circle, right side */}
          <button
            ref={attackRef}
            type='button'
            class='absolute flex select-none items-center justify-center rounded-full border border-base-content/25 bg-base-100/15 text-2xl active:bg-base-content/25'
            style={{
              left: atkLeft,
              top: atkTop,
              width: r(ATK_R * 2),
              height: r(ATK_R * 2),
              touchAction: 'none',
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            ⚔
          </button>

          {/* Emote picker — fixed, centered on screen */}
          {emotePickerOpen && (
            <EmoteRadialMenu
              onSelect={handleEmoteSelect}
              onClose={() => setEmotePickerOpen(false)}
            />
          )}
        </>
      )}
    </div>
  );
}
