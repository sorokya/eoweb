import { useCallback } from 'preact/hooks';
import { DialogResourceID } from '../../../edf';
import { useAlert } from '../../contexts/alert';
import { useClient } from '../../contexts/client';
import { Button } from '../button';
import { TextBox } from '../text-box';
import classes from './main-menu.module.css';

export function MainMenu() {
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
    <div className={classes.mainMenu}>
      <div className={classes.logo} data-slogan={client.config.slogan}>
        <img src='/logo.png' alt='EOWeb logo' />
      </div>
      <TextBox
        name='host'
        value={client.config.host}
        onChange={(host) => (client.config.host = host)}
        placeholder='Server Host'
      />
      <menu>
        <Button onClick={openAlert}>Create Account</Button>
        <Button onClick={openAlert}>Play Game</Button>
        <Button onClick={openAlert}>View Credits</Button>
      </menu>
    </div>
  );
}
