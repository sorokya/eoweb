import { useEffect, useState } from 'preact/hooks';
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

  useEffect(() => {
    client.alertController.subscribe((title, message) => {
      setAlert({ title, message });
    });
  }, [client]);

  return (
    <>
      {alert && (
        <Backdrop>
          <Alert
            title={alert.title!}
            message={alert.message!}
            onClose={() => setAlert(null)}
          />
        </Backdrop>
      )}
      {children}
    </>
  );
}
