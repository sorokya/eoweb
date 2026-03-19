import type { ComponentChildren } from 'preact';
import classes from './backdrop.module.css';

export function Backdrop({ children }: { children: ComponentChildren }) {
  return <div className={classes.backdrop}>{children}</div>;
}
