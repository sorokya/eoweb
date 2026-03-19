import { useClient } from '../../contexts/client';
import { Button } from '../button';
import { TextBox } from '../text-box';
import classes from './main-menu.module.css';

export function MainMenu() {
  const client = useClient();

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
        <Button>Create Account</Button>
        <Button>Play Game</Button>
        <Button>View Credits</Button>
      </menu>
    </div>
  );
}
