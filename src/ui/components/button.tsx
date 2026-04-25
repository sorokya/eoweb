import { useCallback } from 'preact/hooks';
import { playSfxById, SfxId } from '@/sfx';

type ButtonType = 'button' | 'submit';

type ButtonVariant =
  | ''
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'outline'
  | 'dash'
  | 'soft'
  | 'ghost'
  | 'link'
  | 'active'
  | 'disabled'
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'wide'
  | 'block'
  | 'square'
  | 'circle';

type ButtonProps = {
  children: preact.ComponentChildren;
  type?: ButtonType;
  label?: string;
  variant?: ButtonVariant | ButtonVariant[];
  class?: string;
  disabled?: boolean;
  onClick?: () => void;
};

export function Button({
  children,
  label,
  variant = '',
  type = 'button',
  class: extraClass,
  disabled = false,
  onClick,
}: ButtonProps) {
  const clickHandler = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      if (disabled) return;
      playSfxById(SfxId.ButtonClick);
      if (onClick) {
        onClick();
      }
    },
    [disabled, onClick],
  );

  const variantClasses = (Array.isArray(variant) ? variant : [variant])
    .filter(Boolean)
    .map((v) => `btn-${v}`)
    .join(' ');

  const classes = ['btn', variantClasses, extraClass].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      class={classes}
      onClick={clickHandler}
      aria-label={label}
      onPointerDown={(e) => e.stopPropagation()}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
