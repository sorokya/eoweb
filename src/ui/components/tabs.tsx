import type { ComponentChildren } from 'preact';
import { useCallback } from 'preact/hooks';
import { playSfxById, SfxId } from '@/sfx';

type TabItem = {
  id: string;
  label: ComponentChildren;
};

type TabsProps = {
  name?: string;
  items: TabItem[];
  activeId: string;
  onSelect: (id: string) => void;
  style?: 'box' | 'border' | 'lift';
  size?: 'xs' | 'sm' | 'md' | 'lg';
};

export function Tabs({
  name = 'tab',
  items,
  activeId,
  onSelect,
  style = 'box',
  size,
}: TabsProps) {
  const handleClick = useCallback(
    (id: string) => {
      playSfxById(SfxId.ButtonClick);
      onSelect(id);
    },
    [onSelect],
  );

  return (
    <div
      role='tablist'
      class={`tabs tabs-${style} ${size ? `tabs-${size}` : ''}`}
    >
      {items.map((item, index) => (
        <button
          key={item.id}
          role='tab'
          type='button'
          name={`tab-${name}`}
          data-tab-index={index}
          /*biome-ignore lint/nursery/useSortedClasses: Need space */
          class={`tab${item.id === activeId ? ' tab-active text-primary' : ''}`}
          onClick={() => handleClick(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
