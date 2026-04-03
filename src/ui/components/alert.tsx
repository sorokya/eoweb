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
      <div class='modal-box backdrop-blur-sm bg-base-100/80'>
        <h3 class='text-lg font-bold'>{title}</h3>
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
