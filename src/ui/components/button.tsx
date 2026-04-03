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
  | 'xl'
  | 'wide'
  | 'block'
  | 'square'
  | 'circle';

type ButtonProps = {
  children: preact.ComponentChildren;
  type?: ButtonType;
  label?: string;
  variant?: ButtonVariant | ButtonVariant[];
  onClick?: () => void;
};

export function Button({
  children,
  label,
  variant = '',
  type = 'button',
  onClick,
}: ButtonProps) {
  const clickHandler = useCallback(() => {
    playSfxById(SfxId.ButtonClick);
    if (onClick) {
      onClick();
    }
  }, [onClick]);

  const variantClasses = (Array.isArray(variant) ? variant : [variant])
    .filter(Boolean)
    .map((v) => `btn-${v}`)
    .join(' ');

  return (
    <button
      type={type}
      class={`btn${variantClasses ? ` ${variantClasses}` : ''}`}
      onClick={clickHandler}
      aria-label={label}
    >
      {children}
    </button>
  );
}
