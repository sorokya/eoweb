import { useState } from 'preact/hooks';
import { useLocale } from '@/ui/context';
import { Button } from './button';

type AmountDialogProps = {
  title: string;
  message: string;
  max: number;
  actionLabel: string;
  onConfirm: (amount: number) => void;
  onCancel: () => void;
};

export function AmountDialog({
  title,
  message,
  max,
  actionLabel,
  onConfirm,
  onCancel,
}: AmountDialogProps) {
  const { locale } = useLocale();
  const [amount, setAmount] = useState(1);

  const handleChange = (value: number) => {
    setAmount(Math.max(1, Math.min(max, Math.round(value))));
  };

  return (
    <dialog class='modal' open style={{ background: 'transparent' }}>
      <div class='modal-box bg-base-100/80 backdrop-blur-sm'>
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
