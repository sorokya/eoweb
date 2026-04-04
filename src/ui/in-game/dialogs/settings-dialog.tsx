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
        <div>
          <p class='text-sm opacity-60 mb-2'>More settings coming soon.</p>
        </div>
        <div class='divider my-0' />
        <div>
          <p class='text-xs opacity-50 mb-1'>
            Reset all UI positions and layout settings back to defaults.
          </p>
          <button
            type='button'
            class='btn btn-sm btn-warning w-full'
            onClick={handleResetPositions}
          >
            Reset UI Positions
          </button>
        </div>
      </div>
    </DialogBase>
  );
}
