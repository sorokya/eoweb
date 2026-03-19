import { Button } from '../button';
import classes from './alert.module.css';

export function Alert({
  title,
  message,
  onClose,
}: {
  title: string;
  message: string;
  onClose: () => void;
}) {
  return (
    <div className={classes.alert}>
      <p className={classes.header} title={title}>
        {title}
      </p>
      <p className={classes.body}>{message}</p>
      <div className={classes.buttonRow}>
        <Button onClick={onClose}>OK</Button>
      </div>
    </div>
  );
}
