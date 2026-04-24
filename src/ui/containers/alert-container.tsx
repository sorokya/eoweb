import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import {
  Alert,
  AmountDialog,
  Backdrop,
  Confirm,
  InputDialog,
} from '@/ui/components';
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

type InputState = {
  title: string;
  message: string;
  callback: (input: string | null) => void;
};

export function AlertContainer({ children }: AlertContainerProps) {
  const client = useClient();
  const [alert, setAlert] = useState<AlertState | null>(null);
  const [amountState, setAmountState] = useState<AmountState | null>(null);
  const [inputState, setInputState] = useState<InputState | null>(null);

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

    client.alertController.subscribeInput((title, message, callback) => {
      returnFocusRef.current = document.activeElement;

      setInputState({
        title,
        message,
        callback,
      });
    });
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

  const handleInputCancel = useCallback(() => {
    inputState?.callback(null);
    setInputState(null);
    restoreFocus();
  }, [inputState]);

  const handleAmountRepeat = useCallback(
    (amount: number) => {
      amountState?.callback(amount);
    },
    [amountState],
  );

  const handleInputConfirm = useCallback(
    (input: string) => {
      inputState?.callback(input);
      setInputState(null);
      restoreFocus();
    },
    [inputState],
  );

  useEffect(() => {
    if (!alert && !amountState && !inputState) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (amountState) handleAmountCancel();
        else if (inputState) handleInputCancel();
        else handleClose();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [
    alert,
    amountState,
    inputState,
    handleClose,
    handleAmountCancel,
    handleInputCancel,
  ]);

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
      {inputState && (
        <Backdrop>
          <InputDialog
            title={inputState.title}
            message={inputState.message}
            onConfirm={handleInputConfirm}
            onCancel={handleInputCancel}
          />
        </Backdrop>
      )}
      {children}
    </>
  );
}
