import { useCallback } from 'preact/hooks';
import { playSfxById, SfxId } from '@/sfx';

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
  label?: string;
  variant?: ButtonVariant;
  onClick?: () => void;
};

export function Button({
  children,
  label,
  variant = '',
  onClick,
}: ButtonProps) {
  const clickHandler = useCallback(() => {
    playSfxById(SfxId.ButtonClick);
    if (onClick) {
      onClick();
    }
  }, [onClick]);

  return (
    <button
      class={`btn${variant ? ` btn-${variant}` : ''}`}
      onClick={clickHandler}
      aria-label={label}
    >
      {children}
    </button>
  );
}
