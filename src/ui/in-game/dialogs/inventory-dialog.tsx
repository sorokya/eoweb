import { DialogBase } from './dialog-base';

export function InventoryDialog() {
  return (
    <DialogBase id='inventory' title='Inventory' defaultWidth={320}>
      <p class='py-4 text-center text-sm opacity-60'>Inventory coming soon</p>
    </DialogBase>
  );
}
