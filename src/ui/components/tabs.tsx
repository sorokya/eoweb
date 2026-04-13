export type TabItem = {
  id: string;
  label: string;
};

type TabsProps = {
  items: TabItem[];
  activeId: string;
  onSelect: (id: string) => void;
  style?: 'box' | 'border' | 'lift';
  size?: 'xs' | 'sm' | 'md' | 'lg';
};

export function Tabs({
  items,
  activeId,
  onSelect,
  style = 'box',
  size,
}: TabsProps) {
  return (
    <div
      role='tablist'
      class={`tabs tabs-${style}${size ? `tabs-${size}` : ''}`}
    >
      {items.map((item) => (
        <button
          key={item.id}
          role='tab'
          type='button'
          class={`tab${item.id === activeId ? ' tab-active' : ''}`}
          onClick={() => onSelect(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
