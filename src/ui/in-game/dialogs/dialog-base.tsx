import { useCallback, useRef, useState } from 'preact/hooks';
import { LuLayoutGrid, LuMaximize2, LuMinus, LuX } from 'react-icons/lu';
import {
  DIALOG_LAYOUT_LABELS,
  type DialogId,
  type DialogLayout,
  useWindowManager,
} from '@/ui/in-game';

type DialogBaseProps = {
  id: DialogId;
  title: string;
  children?: preact.ComponentChildren;
  defaultWidth?: number;
  /** Replaces the title text with custom content (e.g. chat tabs). */
  titleContent?: preact.ComponentChildren;
  /** Hide layout/minimize/close controls (e.g. for the main chat dialog). */
  hideControls?: boolean;
  /** Disable drag handle on the title bar. */
  noDrag?: boolean;
  /** Optional override for the close button action. Defaults to closeDialog(id). */
  onClose?: () => void;
};

// All auto layouts shown in the dropdown
const AUTO_LAYOUT_OPTIONS: DialogLayout[] = ['center', 'right', 'left'];

const stopProp = (e: { stopPropagation(): void }) => e.stopPropagation();

export function DialogBase({
  id,
  title,
  children,
  defaultWidth = 300,
  titleContent,
  hideControls = false,
  noDrag = false,
  onClose,
}: DialogBaseProps) {
  const {
    closeDialog,
    bringToFront,
    zIndexOf,
    isFocused,
    setLayout,
    getLayout,
    setManualPos,
    getManualPos,
    setMinimized,
    isMinimized,
  } = useWindowManager();

  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{
    ptrX: number;
    ptrY: number;
    baseX: number;
    baseY: number;
  } | null>(null);

  const layout = getLayout(id);
  const minimized = isMinimized(id);
  const focused = isFocused(id);
  const manualPos = getManualPos(id);
  const isManual = layout === 'manual';

  const setManualPosRef = useRef(setManualPos);
  setManualPosRef.current = setManualPos;
  const idRef = useRef(id);
  idRef.current = id;

  const DRAG_THRESHOLD = 4;
  const onDragPointerDown = useCallback(
    (e: PointerEvent) => {
      if (noDrag || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      bringToFront(id);
      setMenuOpen(false);
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      dragStart.current = {
        ptrX: e.clientX,
        ptrY: e.clientY,
        baseX: rect.left,
        baseY: rect.top,
      };

      const onMove = (me: PointerEvent) => {
        if (!dragStart.current) return;
        const dx = me.clientX - dragStart.current.ptrX;
        const dy = me.clientY - dragStart.current.ptrY;
        if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD)
          return;
        setManualPosRef.current(
          idRef.current,
          dragStart.current.baseX + dx,
          dragStart.current.baseY + dy,
        );
      };
      const onUp = () => {
        dragStart.current = null;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [id, bringToFront, noDrag],
  );

  const handleLayoutChange = useCallback(
    (l: DialogLayout) => {
      setLayout(id, l);
      setMenuOpen(false);
    },
    [id, setLayout],
  );

  const toggleMinimize = useCallback(() => {
    setMinimized(id, !minimized);
  }, [id, minimized, setMinimized]);

  const handlePointerDown = useCallback(() => {
    bringToFront(id);
    setMenuOpen(false);
  }, [id, bringToFront]);

  const posStyle =
    isManual && !minimized
      ? {
          position: 'absolute' as const,
          left: manualPos?.x ?? 0,
          top: manualPos?.y ?? 0,
          zIndex: zIndexOf(id),
          width: defaultWidth,
          minWidth: 160,
        }
      : {
          width: minimized ? 200 : defaultWidth,
          minWidth: 160,
          flexShrink: 0,
        };

  return (
    <div
      ref={containerRef}
      role='presentation'
      data-chat-dialog={id.startsWith('chat-') ? id : undefined}
      class={`flex select-none flex-col overflow-visible rounded-lg border border-base-content/10 bg-base-300/90 shadow-xl backdrop-blur-sm transition-opacity ${focused ? 'opacity-100' : 'opacity-80'}`}
      style={posStyle}
      onPointerDown={handlePointerDown}
      onClick={stopProp}
      onKeyDown={stopProp}
      onContextMenu={stopProp}
    >
      <div
        class={`flex items-center gap-1 rounded-t-lg bg-base-content/5 px-2 py-1.5 ${noDrag ? '' : 'cursor-move'}`}
        onPointerDown={onDragPointerDown}
      >
        <div class='flex min-w-0 flex-1 items-center gap-1'>
          {titleContent ?? (
            <span class='select-none truncate px-1 font-semibold text-sm'>
              {title}
            </span>
          )}
        </div>

        {!hideControls && (
          <div class='flex shrink-0 items-center gap-1'>
            <div class='relative'>
              <button
                type='button'
                class='btn btn-ghost btn-xs btn-circle opacity-60 hover:opacity-100'
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((o) => !o);
                }}
                title='Change layout'
              >
                <LuLayoutGrid size={13} />
              </button>
              {menuOpen && (
                <ul
                  class='menu menu-xs absolute top-full right-0 z-50 mt-1 rounded border border-base-content/10 bg-base-300 p-1 shadow-lg'
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {AUTO_LAYOUT_OPTIONS.map((l) => (
                    <li key={l}>
                      <button
                        type='button'
                        class={
                          !isManual && l === layout
                            ? 'font-bold text-primary'
                            : ''
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLayoutChange(l);
                        }}
                      >
                        {DIALOG_LAYOUT_LABELS[l]}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button
              type='button'
              class='btn btn-ghost btn-xs btn-circle'
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                toggleMinimize();
              }}
              aria-label={minimized ? 'Restore dialog' : 'Minimize dialog'}
              title={minimized ? 'Restore' : 'Minimize'}
            >
              {minimized ? <LuMaximize2 size={13} /> : <LuMinus size={13} />}
            </button>

            <button
              type='button'
              class='btn btn-ghost btn-xs btn-circle'
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                if (onClose) onClose();
                else closeDialog(id);
              }}
              aria-label='Close dialog'
            >
              <LuX size={13} />
            </button>
          </div>
        )}
      </div>

      {!minimized && <div class='p-3'>{children}</div>}
    </div>
  );
}
