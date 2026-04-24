import { useState } from 'preact/hooks';
import { UI_BLUR, UI_MODAL_BG } from '@/ui/consts';
import { useLocale } from '@/ui/context';
import { Button } from './button';

type InputDialogProps = {
  title: string;
  message: string;
  onConfirm: (input: string) => void;
  onCancel: () => void;
};

export function InputDialog({
  title,
  message,
  onConfirm,
  onCancel,
}: InputDialogProps) {
  const { locale } = useLocale();
  const [value, setValue] = useState('');

  return (
    <dialog class='modal' open style={{ background: 'transparent' }}>
      <div class={`modal-box ${UI_MODAL_BG} ${UI_BLUR}`}>
        <h3 class='font-bold text-lg'>{title}</h3>
        <p class='py-2'>{message}</p>
        <div class='flex flex-col gap-3 py-2'>
          <input
            type='text'
            class='input input-bordered w-full'
            value={value}
            onKeyDown={(e) => e.stopPropagation()}
            onInput={(e) => setValue((e.target as HTMLInputElement).value)}
          />
        </div>
        <div class='modal-action'>
          <Button variant='primary' onClick={() => onConfirm(value)}>
            {locale.btnOK}
          </Button>
          <Button variant='ghost' onClick={onCancel}>
            {locale.btnCancel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
