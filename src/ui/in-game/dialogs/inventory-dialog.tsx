import { INVENTORY_GRID_WIDTH, InventoryGrid } from '@/ui/components';
import { useLocale } from '@/ui/context';
import { DialogBase } from './dialog-base';

export function InventoryDialog() {
  const { locale } = useLocale();
  return (
    <DialogBase
      id='inventory'
      title={locale.inventoryTitle}
      width={INVENTORY_GRID_WIDTH + 10}
    >
      <InventoryGrid />
    </DialogBase>
  );
}
