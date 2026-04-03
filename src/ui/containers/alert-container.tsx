import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { Alert, Backdrop } from '@/ui/components';
import { useClient } from '@/ui/context';

type AlertContainerProps = {
  children: preact.ComponentChildren;
};

export function AlertContainer({ children }: AlertContainerProps) {
  const client = useClient();
  const [alert, setAlert] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const returnFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    client.alertController.subscribe((title, message) => {
      returnFocusRef.current = document.activeElement;
      setAlert({ title, message });
    });
  }, [client]);

  const handleClose = useCallback(() => {
    setAlert(null);
    if (returnFocusRef.current instanceof HTMLElement) {
      returnFocusRef.current.focus();
    }
  }, []);

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
          <Alert
            title={alert.title!}
            message={alert.message!}
            onClose={handleClose}
          />
        </Backdrop>
      )}
      {children}
    </>
  );
}
