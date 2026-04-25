import { UI_BLUR, UI_MODAL_BG } from '@/ui/consts';
import { useLocale } from '@/ui/context';
import { Button } from './button';

type AlertProps = {
  title: string;
  message: string;
  onClose: () => void;
};

export function Alert({ title, message, onClose }: AlertProps) {
  const { locale } = useLocale();

  return (
    <dialog class='modal' open style={{ background: 'transparent' }}>
      <div class={`modal-box ${UI_MODAL_BG} ${UI_BLUR}`}>
        <h3 class='font-bold text-lg'>{title}</h3>
        <p class='py-4'>{message}</p>
        <div class='modal-action'>
          <Button variant='primary' onClick={onClose}>
            {locale.btnOK}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
