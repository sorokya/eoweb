import type { Emote as EmoteType } from 'eolib';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { LuChevronUp } from 'react-icons/lu';
import { UI_GHOST_BG, UI_ITEM_BG, UI_PANEL_BORDER } from '@/ui/consts';
import { useClient } from '@/ui/context';
import { useHudVisibility } from '@/ui/in-game';
import {
  EMOTES,
  getEmoteEmoji,
  getEmoteLabel,
  readSelectedEmote,
  writeSelectedEmote,
} from './emote-radial-menu';

export function DesktopEmoteButton() {
  const client = useClient();
  const [isVisible] = useHudVisibility('desktop-emote', {
    mobile: false,
    desktop: true,
  });

  const [emotePickerOpen, setEmotePickerOpen] = useState(false);
  const [selectedEmote, setSelectedEmote] =
    useState<EmoteType>(readSelectedEmote);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!emotePickerOpen) return;
    const handler = (e: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setEmotePickerOpen(false);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [emotePickerOpen]);

  const handleEmoteSelect = useCallback(
    (emote: EmoteType) => {
      setSelectedEmote(emote);
      writeSelectedEmote(emote);
      client.movementController.emote(emote);
      setEmotePickerOpen(false);
    },
    [client],
  );

  const handleEmoteUse = useCallback(() => {
    client.movementController.emote(selectedEmote);
  }, [client, selectedEmote]);

  if (!isVisible) return null;

  return (
    <div
      class='relative'
      ref={containerRef}
      onContextMenu={(e) => e.stopPropagation()}
    >
      <div
        class={`flex items-stretch overflow-hidden rounded border ${UI_PANEL_BORDER} ${UI_GHOST_BG} shadow-sm`}
        style={{ height: '3rem', width: '4rem' }}
      >
        {/* Emote fire button */}
        <button
          type='button'
          class='flex flex-1 items-center justify-center text-xl hover:bg-base-content/5 active:bg-base-content/10'
          onClick={(e) => {
            e.stopPropagation();
            handleEmoteUse();
          }}
          title={getEmoteLabel(selectedEmote)}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {getEmoteEmoji(selectedEmote)}
        </button>

        {/* Divider */}
        <div class={`w-px self-stretch ${UI_PANEL_BORDER} border-l`} />

        {/* Picker toggle */}
        <button
          type='button'
          class='flex w-5 items-center justify-center text-base-content/60 hover:text-base-content active:bg-base-content/10'
          onClick={(e) => {
            e.stopPropagation();
            setEmotePickerOpen((o) => !o);
          }}
          title='Pick emote'
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span
            style={{
              display: 'inline-flex',
              transform: emotePickerOpen ? 'rotate(180deg)' : undefined,
              transition: 'transform 150ms',
            }}
          >
            <LuChevronUp size={12} />
          </span>
        </button>
      </div>

      {/* Dropdown */}
      {emotePickerOpen && (
        <div
          class={`absolute bottom-full left-0 mb-1 grid gap-1 rounded border ${UI_PANEL_BORDER} ${UI_ITEM_BG} p-2 shadow-lg`}
          style={{ zIndex: 9999, gridTemplateColumns: 'repeat(6, 2.5rem)' }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {EMOTES.map(({ type, emoji, label }) => (
            <button
              key={type}
              type='button'
              class={`flex h-10 w-10 items-center justify-center overflow-hidden rounded hover:bg-base-content/10 active:bg-base-content/20 ${type === selectedEmote ? 'bg-base-content/15' : ''}`}
              title={label}
              onClick={() => handleEmoteSelect(type)}
            >
              <span
                style={{
                  fontSize: '1.25rem',
                  lineHeight: 1,
                  display: 'block',
                  transform: 'scale(1)',
                  pointerEvents: 'none',
                }}
              >
                {emoji}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
