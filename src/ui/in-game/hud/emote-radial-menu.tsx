import { Emote } from 'eolib';
import { UI_GHOST_BG, UI_PANEL_BORDER } from '@/ui/consts';

const EMOTES: { type: Emote; label: string; emoji: string }[] = [
  { type: Emote.Happy, label: 'Happy', emoji: '😊' },
  { type: Emote.Depressed, label: 'Depressed', emoji: '😞' },
  { type: Emote.Sad, label: 'Sad', emoji: '😢' },
  { type: Emote.Angry, label: 'Angry', emoji: '😠' },
  { type: Emote.Confused, label: 'Confused', emoji: '😕' },
  { type: Emote.Surprised, label: 'Surprised', emoji: '😮' },
  { type: Emote.Hearts, label: 'Hearts', emoji: '😍' },
  { type: Emote.Moon, label: 'Moon', emoji: '🌙' },
  { type: Emote.Suicidal, label: 'Suicidal', emoji: '😵' },
  { type: Emote.Embarrassed, label: 'Embarrassed', emoji: '😳' },
];

const STORAGE_KEY = 'eoweb:selected-emote';
const DEFAULT_EMOTE = Emote.Happy;

export function readSelectedEmote(): Emote {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_EMOTE;
    const val = Number.parseInt(raw, 10);
    if (EMOTES.some((e) => e.type === val)) return val as Emote;
    return DEFAULT_EMOTE;
  } catch {
    return DEFAULT_EMOTE;
  }
}

export function writeSelectedEmote(emote: Emote): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(emote));
  } catch {
    // ignore
  }
}

export function getEmoteLabel(emote: Emote): string {
  return EMOTES.find((e) => e.type === emote)?.label ?? 'Emote';
}

export function getEmoteEmoji(emote: Emote): string {
  return EMOTES.find((e) => e.type === emote)?.emoji ?? '😊';
}

type Props = {
  onSelect: (emote: Emote) => void;
  onClose: () => void;
};

const RADIUS = 72;
const BUTTON_SIZE = 50;
const GAP = 32;

export function EmoteRadialMenu({ onSelect, onClose }: Props) {
  const count = EMOTES.length;

  return (
    <>
      {/* Backdrop — tap outside to close */}
      <div
        role='presentation'
        class='fixed inset-0 z-[9998]'
        onPointerDown={onClose}
      />
      {/* Centered picker */}
      <div
        role='presentation'
        class='pointer-events-auto fixed z-[9999]'
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: `${RADIUS * 2 + BUTTON_SIZE}px`,
          height: `${RADIUS * 2 + BUTTON_SIZE}px`,
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {EMOTES.map(({ type, label, emoji }, i) => {
          const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
          const x = Math.round(
            RADIUS +
              RADIUS * Math.cos(angle) +
              BUTTON_SIZE / 2 +
              GAP * Math.cos(angle),
          );
          const y = Math.round(
            RADIUS +
              RADIUS * Math.sin(angle) +
              BUTTON_SIZE / 2 +
              GAP * Math.sin(angle),
          );
          return (
            <button
              key={type}
              type='button'
              class={`absolute flex flex-col items-center justify-center gap-0.5 rounded-full border ${UI_PANEL_BORDER} ${UI_GHOST_BG} text-xs shadow active:bg-base-content/20`}
              style={{
                width: `${BUTTON_SIZE}px`,
                height: `${BUTTON_SIZE}px`,
                left: `${x - BUTTON_SIZE / 2}px`,
                top: `${y - BUTTON_SIZE / 2}px`,
              }}
              onClick={() => {
                onSelect(type);
                onClose();
              }}
            >
              <span class='leading-none'>{emoji}</span>
              <span class='text-base-content/70 leading-none'>{label}</span>
            </button>
          );
        })}

        <button
          type='button'
          class={`absolute flex items-center justify-center rounded-full border ${UI_PANEL_BORDER} ${UI_GHOST_BG} text-sm shadow active:bg-base-content/20`}
          style={{
            width: `${BUTTON_SIZE}px`,
            height: `${BUTTON_SIZE}px`,
            left: `${RADIUS}px`,
            top: `${RADIUS}px`,
          }}
          onClick={onClose}
        >
          ✕
        </button>
      </div>
    </>
  );
}
