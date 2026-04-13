import { InventoryGrid } from '@/ui/components';
import { DialogBase } from './dialog-base';

export function InventoryDialog() {
  return (
    <DialogBase id='inventory' title='Inventory' defaultWidth={200}>
      <InventoryGrid />
    </DialogBase>
  );
}
