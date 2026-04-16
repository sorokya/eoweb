import { useCallback, useRef } from 'preact/hooks';
import { FaWindowClose, FaWindowRestore } from 'react-icons/fa';
import { Button } from '@/ui/components';
import { useLocale } from '@/ui/context';
import { type DialogId, useWindowManager } from '@/ui/in-game';

type DialogSize = 'sm' | 'md' | 'lg';

const SIZE_WIDTH: Record<DialogSize, string> = {
  sm: 'clamp(240px, 28vw, 300px)',
  md: 'clamp(350px, 36vw, 420px)',
  lg: 'clamp(380px, 48vw, 560px)',
};

type DialogBaseProps = {
  id: DialogId;
  title: string;
  children?: preact.ComponentChildren;
  size?: DialogSize;
  /** Replaces the title text with custom content (e.g. chat tabs). */
  titleContent?: preact.ComponentChildren;
  /** Hide layout/minimize/close controls (e.g. for the main chat dialog). */
  hideControls?: boolean;
  /** Disable drag handle on the title bar. */
  noDrag?: boolean;
  /** When true, children are rendered without the default px-1 pb-1 padding wrapper. */
  noPadding?: boolean;
  /** Optional override for the close button action. Defaults to closeDialog(id). */
  onClose?: () => void;
};

const stopProp = (e: { stopPropagation(): void }) => e.stopPropagation();

export function DialogBase({
  id,
  title,
  children,
  size = 'md',
  titleContent,
  hideControls = false,
  noDrag = false,
  noPadding = false,
  onClose,
}: DialogBaseProps) {
  const { locale } = useLocale();
  const {
    closeDialog,
    zIndexOf,
    getLayout,
    setLayout,
    setManualPos,
    getManualPos,
    bringToFront,
  } = useWindowManager();

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{
    ptrX: number;
    ptrY: number;
    baseX: number;
    baseY: number;
  } | null>(null);

  const layout = getLayout(id);
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
    [id, noDrag],
  );

  const dialogWidth = SIZE_WIDTH[size];
  const posStyle = isManual
    ? {
        position: 'absolute' as const,
        left: manualPos?.x ?? 0,
        top: manualPos?.y ?? 0,
        zIndex: zIndexOf(id),
        width: dialogWidth,
        maxWidth: '90vw',
        maxHeight: '90vh',
        touchAction: 'none' as const,
      }
    : {
        width: dialogWidth,
        maxWidth: '90vw',
        maxHeight: '90vh',
        flexShrink: 0,
        touchAction: 'none' as const,
      };

  return (
    <div
      ref={containerRef}
      role='presentation'
      data-chat-dialog={id.startsWith('chat-') ? id : undefined}
      class={
        'pointer-events-auto flex flex-col overflow-hidden rounded-lg border border-base-content/10 bg-base-300/80 shadow-sm backdrop-blur-sm'
      }
      style={posStyle}
      onClick={stopProp}
      onContextMenu={stopProp}
    >
      <div
        class={`flex items-center gap-1 rounded-t-lg bg-base-content/5 px-2 py-1.5 ${noDrag ? '' : 'cursor-move'}`}
        onPointerDown={onDragPointerDown}
      >
        <div class='flex min-w-0 flex-1 items-center gap-1'>
          {titleContent ?? (
            <span class='truncate px-1 font-semibold text-sm'>{title}</span>
          )}
        </div>

        {!hideControls && (
          <div class='flex shrink-0 items-center gap-1'>
            {isManual && (
              <Button
                type='button'
                class='btn btn-ghost btn-xs'
                onClick={() => {
                  setLayout(id, 'center');
                }}
                aria-label={locale.dialogRestore}
              >
                <FaWindowRestore size={13} />
              </Button>
            )}
            <Button
              type='button'
              class='btn btn-ghost btn-xs'
              onClick={() => {
                if (onClose) onClose();
                else closeDialog(id);
              }}
              aria-label={locale.dialogClose}
            >
              <FaWindowClose size={13} />
            </Button>
          </div>
        )}
      </div>

      <div
        class={`${noPadding ? '' : 'px-1 pb-1'} min-h-0 flex-1 overflow-y-auto`}
      >
        {children}
      </div>
    </div>
  );
}
