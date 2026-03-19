import { useCallback, useMemo } from 'preact/hooks';
import { DialogResourceID } from '../../edf';
import { useAlert } from '../contexts/alert';
import { useClient } from '../contexts/client';
import { Button } from './button';

export function Test() {
  const { setAlert } = useAlert();
  const client = useClient();

  const getAlertData = useCallback(() => {
    const strings = client.getDialogStrings(
      DialogResourceID.CONNECTION_SERVER_BUSY,
    );
    if (!strings || strings.length < 2) {
      return {
        title: 'Error',
        message: 'Failed to load dialog strings.',
      };
    }

    return {
      title: strings[0],
      message: strings[1],
    };
  }, [client]);

  const openAlert = useCallback(() => {
    setAlert(getAlertData());
  }, [setAlert, getAlertData]);

  return (
    <div>
      <Button onClick={openAlert}>Click me</Button>
    </div>
  );
}
