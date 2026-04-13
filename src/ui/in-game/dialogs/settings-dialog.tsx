import { Button } from '@/ui/components';
import {
  clearAllDialogLayouts,
  clearAllPositions,
  clearAllVisibilityOverrides,
  RESET_EVENT,
} from '@/ui/in-game';
import { DialogBase } from './dialog-base';

export function SettingsDialog() {
  function handleResetPositions() {
    clearAllPositions();
    clearAllVisibilityOverrides();
    clearAllDialogLayouts();
    window.dispatchEvent(new CustomEvent(RESET_EVENT));
  }

  return (
    <DialogBase id='settings' title='Settings' defaultWidth={300}>
      <div class='flex flex-col gap-3'>
        <p class='text-sm opacity-60'>More settings coming soon.</p>
        <div class='divider my-0' />
        <div>
          <p class='mb-1 text-xs opacity-50'>
            Reset all UI positions and layout settings back to defaults.
          </p>
          <Button
            variant={['sm', 'warning']}
            class='w-full'
            onClick={handleResetPositions}
          >
            Reset UI Positions
          </Button>
        </div>
      </div>
    </DialogBase>
  );
}
