import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { Alert as AlertComponent } from '../../components/alert';
import { Backdrop } from '../../components/backdrop';
import { type Alert, AlertContext } from './alert-context';

export function AlertProvider({ children }: { children: ComponentChildren }) {
  const [alert, setAlert] = useState<Alert | null>(null);

  return (
    <AlertContext.Provider value={{ alert, setAlert }}>
      {alert && (
        <Backdrop>
          <AlertComponent
            title={alert.title}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        </Backdrop>
      )}
      {children}
    </AlertContext.Provider>
  );
}
