import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { Alert, AmountDialog, Backdrop, Confirm } from '@/ui/components';
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

type AmountState = {
  title: string;
  message: string;
  max: number;
  actionLabel: string;
  callback: (amount: number | null) => void;
  repeatActionLabel?: string;
};

export function AlertContainer({ children }: AlertContainerProps) {
  const client = useClient();
  const [alert, setAlert] = useState<AlertState | null>(null);
  const [amountState, setAmountState] = useState<AmountState | null>(null);

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

    client.alertController.subscribeAmount(
      (title, message, max, actionLabel, callback, repeatActionLabel) => {
        returnFocusRef.current = document.activeElement;
        setAmountState({
          title,
          message,
          max,
          actionLabel,
          callback,
          repeatActionLabel,
        });
      },
    );
  }, [client]);

  const restoreFocus = () => {
    if (returnFocusRef.current instanceof HTMLElement) {
      returnFocusRef.current.focus();
    }
  };

  const handleClose = useCallback(
    (confirmed = false) => {
      alert?.callback?.(confirmed);
      setAlert(null);
      restoreFocus();
    },
    [alert],
  );

  const handleAmountConfirm = useCallback(
    (amount: number) => {
      amountState?.callback(amount);
      setAmountState(null);
      restoreFocus();
    },
    [amountState],
  );

  const handleAmountCancel = useCallback(() => {
    amountState?.callback(null);
    setAmountState(null);
    restoreFocus();
  }, [amountState]);

  const handleAmountRepeat = useCallback(
    (amount: number) => {
      amountState?.callback(amount);
    },
    [amountState],
  );

  useEffect(() => {
    if (!alert && !amountState) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (amountState) handleAmountCancel();
        else handleClose();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [alert, amountState, handleClose, handleAmountCancel]);

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
      {amountState && (
        <Backdrop>
          <AmountDialog
            title={amountState.title}
            message={amountState.message}
            max={amountState.max}
            actionLabel={amountState.actionLabel}
            repeatActionLabel={amountState.repeatActionLabel}
            onConfirm={handleAmountConfirm}
            onRepeat={handleAmountRepeat}
            onCancel={handleAmountCancel}
          />
        </Backdrop>
      )}
      {children}
    </>
  );
}
