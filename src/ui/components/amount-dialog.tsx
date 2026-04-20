import { useState } from 'preact/hooks';
import { UI_BLUR, UI_MODAL_BG } from '@/ui/consts';
import { useLocale } from '@/ui/context';
import { Button } from './button';

type AmountDialogProps = {
  title: string;
  message: string;
  max: number;
  actionLabel: string;
  repeatActionLabel?: string;
  onConfirm: (amount: number) => void;
  onRepeat: (amount: number) => void;
  onCancel: () => void;
};

export function AmountDialog({
  title,
  message,
  max,
  actionLabel,
  repeatActionLabel,
  onConfirm,
  onRepeat,
  onCancel,
}: AmountDialogProps) {
  const { locale } = useLocale();
  const [amount, setAmount] = useState(1);

  const handleChange = (value: number) => {
    setAmount(Math.max(1, Math.min(max, Math.round(value))));
  };

  return (
    <dialog class='modal' open style={{ background: 'transparent' }}>
      <div class={`modal-box ${UI_MODAL_BG} ${UI_BLUR}`}>
        <h3 class='font-bold text-lg'>{title}</h3>
        <p class='py-2'>{message}</p>
        <div class='flex flex-col gap-3 py-2'>
          <input
            type='number'
            class='input input-bordered w-full'
            min={1}
            max={max}
            value={amount}
            onInput={(e) =>
              handleChange(Number((e.target as HTMLInputElement).value))
            }
          />
          <input
            type='range'
            class='range range-sm'
            min={1}
            max={max}
            value={amount}
            onInput={(e) =>
              handleChange(Number((e.target as HTMLInputElement).value))
            }
          />
        </div>
        <div class='modal-action'>
          {repeatActionLabel && (
            <Button variant='secondary' onClick={() => onRepeat(amount)}>
              {repeatActionLabel}
            </Button>
          )}
          <Button variant='primary' onClick={() => onConfirm(amount)}>
            {actionLabel}
          </Button>
          <Button variant='ghost' onClick={onCancel}>
            {locale.btnCancel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
