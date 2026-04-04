import { DialogBase } from './dialog-base';

export function InventoryDialog() {
  return (
    <DialogBase id='inventory' title='Inventory' defaultWidth={320}>
      <p class='text-sm opacity-60 text-center py-4'>Inventory coming soon</p>
    </DialogBase>
  );
}
