import { INVENTORY_GRID_WIDTH, InventoryGrid } from '@/ui/components';
import { DialogBase } from './dialog-base';

export function InventoryDialog() {
  return (
    <DialogBase
      id='inventory'
      title='Inventory'
      width={INVENTORY_GRID_WIDTH + 10}
    >
      <InventoryGrid />
    </DialogBase>
  );
}
