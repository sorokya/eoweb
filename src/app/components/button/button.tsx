import type { ComponentChildren } from 'preact';
import { useCallback } from 'preact/hooks';
import { playSfxById, SfxId } from '../../../sfx';
import styles from './button.module.css';

export function Button({
  children,
  onClick,
}: {
  children: ComponentChildren;
  onClick?: () => void;
}) {
  const clickHandler = useCallback(
    (e: Event) => {
      e.stopPropagation();
      onClick?.();
      playSfxById(SfxId.ButtonClick);
    },
    [onClick],
  );

  return (
    <button className={styles.button} onClick={clickHandler}>
      {children}
    </button>
  );
}
