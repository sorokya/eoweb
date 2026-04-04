import { DialogResourceID } from '@/edf';
import { useClient } from '@/ui/context';

const HUD_Z = 10;

export function ExitButton() {
  const client = useClient();

  function handleClick(e: MouseEvent) {
    e.stopPropagation();
    const strings = client.getDialogStrings(
      DialogResourceID.EXIT_GAME_ARE_YOU_SURE,
    );
    client.alertController.showConfirm(strings[0], strings[1], (confirmed) => {
      if (confirmed) client.disconnect();
    });
  }

  return (
    <button
      type='button'
      class='absolute top-0 right-0 btn btn-sm btn-error font-bold shadow-md'
      style={{ zIndex: HUD_Z }}
      onClick={handleClick}
      onContextMenu={(e) => e.stopPropagation()}
      aria-label='Exit game'
    >
      ←
    </button>
  );
}
