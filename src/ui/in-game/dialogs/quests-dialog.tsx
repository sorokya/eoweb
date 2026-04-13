import { DialogBase } from './dialog-base';

export function QuestsDialog() {
  return (
    <DialogBase id='quests' title='Quests' defaultWidth={300}>
      <p class='py-4 text-center text-sm opacity-60'>Quests coming soon</p>
    </DialogBase>
  );
}
