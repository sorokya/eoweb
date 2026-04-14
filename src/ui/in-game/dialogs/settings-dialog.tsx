import { Button, Checkbox, CycleInput } from '@/ui/components';
import {
  clearAllDialogLayouts,
  clearAllPositions,
  clearAllVisibilityOverrides,
  RESET_EVENT,
  UI_SCALE_OPTIONS,
  useRepositionMode,
  useUiScale,
} from '@/ui/in-game';
import { DialogBase } from './dialog-base';

export function SettingsDialog() {
  const [scaleIndex, setScaleIndex] = useUiScale();
  const [repositionMode, setRepositionMode] = useRepositionMode();

  function handleResetPositions() {
    clearAllPositions();
    clearAllVisibilityOverrides();
    clearAllDialogLayouts();
    window.dispatchEvent(new CustomEvent(RESET_EVENT));
  }

  return (
    <DialogBase id='settings' title='Settings' defaultWidth={300}>
      <div class='flex flex-col gap-3'>
        <CycleInput
          label='UI Scale'
          value={scaleIndex}
          min={0}
          max={UI_SCALE_OPTIONS.length - 1}
          format={(i) => `${UI_SCALE_OPTIONS[i]}x`}
          onChange={setScaleIndex}
        />
        <div class='divider my-0' />
        <div>
          <p class='mb-1 text-xs opacity-50'>
            Drag touch controls to reposition them on screen.
          </p>
          <Checkbox
            label='Reposition Touch Controls'
            checked={repositionMode}
            onChange={setRepositionMode}
            variant='sm'
          />
        </div>
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
