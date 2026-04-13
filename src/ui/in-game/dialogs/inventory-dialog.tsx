import { InventoryGrid } from '@/ui/components';
import { DialogBase } from './dialog-base';

export function InventoryDialog() {
  return (
    <DialogBase id='inventory' title='Inventory' defaultWidth={220}>
      <InventoryGrid />
    </DialogBase>
  );
}
