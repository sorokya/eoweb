import { useState } from 'preact/hooks';
import { FaTrash } from 'react-icons/fa';
import { useLocale } from '@/ui/context';
import { useItemDrag } from './item-drag-context';

export function JunkDropZone() {
  const { currentDrag } = useItemDrag();
  const { locale } = useLocale();
  const [isOver, setIsOver] = useState(false);

  if (currentDrag?.source !== 'inventory') return null;

  return (
    <div
      data-junk-drop
      class={`mx-1 mb-1 flex cursor-pointer items-center justify-center gap-2 rounded border-2 border-dashed py-2 text-sm transition-colors ${
        isOver
          ? 'border-error bg-error/20 text-error'
          : 'border-base-content/20 text-base-content/40'
      }`}
      onPointerEnter={() => setIsOver(true)}
      onPointerLeave={() => setIsOver(false)}
    >
      <FaTrash size={14} />
      {locale.junkDropZone}
    </div>
  );
}
