import { useCallback, useState } from 'preact/hooks';
import {
  MAX_PASSWORD_LENGTH,
  MAX_USERNAME_LENGTH,
  MIN_PASSWORD_LENGTH,
  MIN_USERNAME_LENGTH,
} from '@/consts';
import { DialogResourceID } from '@/edf';
import { GameState } from '@/game-state';
import { Button, Input } from '@/ui/components';
import { useClient, useLocale } from '@/ui/context';

export function CreateAccount() {
  const client = useClient();
  const { locale } = useLocale();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [location, setLocation] = useState('');
  const [email, setEmail] = useState('');

  const onSubmit = useCallback(
    (e: SubmitEvent) => {
      e.preventDefault();

      if (
        !username ||
        !password ||
        !confirmPassword ||
        !fullName ||
        !location ||
        !email
      ) {
        const strings = client.getDialogStrings(
          DialogResourceID.ACCOUNT_CREATE_FIELDS_STILL_EMPTY,
        );
        client.alertController.show(strings[0], strings[1]);
        return;
      }

      if (username.length < MIN_USERNAME_LENGTH) {
        const strings = client.getDialogStrings(
          DialogResourceID.ACCOUNT_CREATE_NAME_TOO_SHORT,
        );
        client.alertController.show(strings[0], strings[1]);
        return;
      }

      if (password.length < MIN_PASSWORD_LENGTH) {
        const strings = client.getDialogStrings(
          DialogResourceID.ACCOUNT_CREATE_PASSWORD_TOO_SHORT,
        );
        client.alertController.show(strings[0], strings[1]);
        return;
      }

      if (password !== confirmPassword) {
        const strings = client.getDialogStrings(
          DialogResourceID.ACCOUNT_CREATE_PASSWORD_MISMATCH,
        );
        client.alertController.show(strings[0], strings[1]);
        return;
      }

      client.authenticationController.requestAccountCreation({
        username,
        password,
        name: fullName,
        location,
        email,
      });
    },
    [client, username, password, confirmPassword, fullName, location, email],
  );

  const cancel = useCallback(() => {
    client.setState(GameState.Connected);
  }, [client]);

  return (
    <div class='card w-96 bg-base-100 shadow-sm'>
      <div class='card-body'>
        <div class='card-title'>{locale.createAccount.title}</div>
        <form onSubmit={onSubmit} class='flex flex-col gap-3'>
          <Input
            label={locale.createAccount.username}
            name='username'
            value={username}
            onChange={setUsername}
            maxlength={MAX_USERNAME_LENGTH}
            autofocus
          />
          <Input
            label={locale.createAccount.password}
            name='password'
            type='password'
            value={password}
            onChange={setPassword}
            maxlength={MAX_PASSWORD_LENGTH}
          />
          <Input
            label={locale.createAccount.confirmPassword}
            name='confirm-password'
            type='password'
            value={confirmPassword}
            onChange={setConfirmPassword}
            maxlength={MAX_PASSWORD_LENGTH}
          />
          <Input
            label={locale.createAccount.fullName}
            name='full-name'
            value={fullName}
            onChange={setFullName}
          />
          <Input
            label={locale.createAccount.location}
            name='location'
            value={location}
            onChange={setLocation}
          />
          <Input
            label={locale.createAccount.email}
            name='email'
            type='email'
            value={email}
            onChange={setEmail}
          />
          <div class='card-actions'>
            <Button type='submit' variant='primary'>
              {locale.mainMenu.btnCreateAccount}
            </Button>
            <Button variant='ghost' onClick={cancel}>
              {locale.shared.btnCancel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
