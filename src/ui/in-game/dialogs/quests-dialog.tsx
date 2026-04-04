import { DialogBase } from './dialog-base';

export function QuestsDialog() {
  return (
    <DialogBase id='quests' title='Quests' defaultWidth={300}>
      <p class='text-sm opacity-60 text-center py-4'>Quests coming soon</p>
    </DialogBase>
  );
}
