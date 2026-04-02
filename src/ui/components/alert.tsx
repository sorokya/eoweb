import { useCallback } from 'preact/hooks';
import { playSfxById, SfxId } from '@/sfx';
import { useLocale } from '@/ui/context';

type AlertProps = {
  title: string;
  message: string;
  onClose: () => void;
};

export function Alert({ title, message, onClose }: AlertProps) {
  const { locale } = useLocale();

  const onClick = useCallback(() => {
    playSfxById(SfxId.ButtonClick);
    onClose();
  }, [onClose]);

  return (
    <dialog class='modal' open style={{ background: 'transparent' }}>
      <div class='modal-box backdrop-blur-sm bg-base-100/80'>
        <h3 class='text-lg font-bold'>{title}</h3>
        <p class='py-4'>{message}</p>
        <div class='modal-action'>
          <button class='btn' type='button' onClick={onClick}>
            {locale.btnOK}
          </button>
        </div>
      </div>
    </dialog>
  );
}
