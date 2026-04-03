import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { Alert, Backdrop, Confirm } from '@/ui/components';
import { useClient } from '@/ui/context';

type AlertContainerProps = {
  children: preact.ComponentChildren;
};

type AlertState = {
  title: string;
  message: string;
  confirm: boolean;
  callback?: (confirmed: boolean) => void;
};

export function AlertContainer({ children }: AlertContainerProps) {
  const client = useClient();
  const [alert, setAlert] = useState<AlertState | null>(null);

  const returnFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    client.alertController.subscribe((title, message) => {
      returnFocusRef.current = document.activeElement;
      setAlert({ title, message, confirm: false });
    });

    client.alertController.subscribeConfirm((title, message, callback) => {
      returnFocusRef.current = document.activeElement;
      setAlert({ title, message, confirm: true, callback });
    });
  }, [client]);

  const handleClose = useCallback(
    (confirmed = false) => {
      alert?.callback?.(confirmed);
      setAlert(null);
      if (returnFocusRef.current instanceof HTMLElement) {
        returnFocusRef.current.focus();
      }
    },
    [alert],
  );

  useEffect(() => {
    if (!alert) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [alert, handleClose]);

  return (
    <>
      {alert && (
        <Backdrop>
          {alert.confirm ? (
            <Confirm
              title={alert.title}
              message={alert.message}
              onYes={() => handleClose(true)}
              onNo={() => handleClose(false)}
            />
          ) : (
            <Alert
              title={alert.title}
              message={alert.message}
              onClose={() => handleClose()}
            />
          )}
        </Backdrop>
      )}
      {children}
    </>
  );
}
