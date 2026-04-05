import { useCallback, useState } from 'preact/hooks';
import { DialogResourceID } from '@/edf';
import { GameState } from '@/game-state';
import { Button, Input } from '@/ui/components';
import { useClient, useLocale } from '@/ui/context';

export function ChangePassword() {
  const client = useClient();
  const { locale } = useLocale();
  const [username, setUsername] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const onSubmit = useCallback(
    (e: SubmitEvent) => {
      e.preventDefault();
      if (newPassword !== confirmPassword) {
        const strings = client.getDialogStrings(
          DialogResourceID.CHANGE_PASSWORD_MISMATCH,
        );
        client.alertController.show(strings[0], strings[1]);
        return;
      }
      client.authenticationController.changePassword(
        username,
        oldPassword,
        newPassword,
      );
    },
    [client, username, oldPassword, newPassword, confirmPassword],
  );

  const cancel = useCallback(() => {
    client.setState(GameState.CharacterSelect);
  }, [client]);

  return (
    <div class='card bg-base-100 w-96 shadow-sm'>
      <div class='card-body'>
        <div class='card-title'>{locale.changePasswordTitle}</div>
        <form onSubmit={onSubmit} class='flex flex-col gap-4'>
          <Input
            label={locale.changePasswordUsername}
            name='username'
            value={username}
            onChange={(val) => setUsername(val)}
            autofocus
          />
          <Input
            label={locale.changePasswordOldPassword}
            name='old-password'
            value={oldPassword}
            type='password'
            onChange={(val) => setOldPassword(val)}
          />
          <Input
            label={locale.changePasswordNewPassword}
            name='new-password'
            value={newPassword}
            type='password'
            onChange={(val) => setNewPassword(val)}
          />
          <Input
            label={locale.changePasswordConfirmPassword}
            name='confirm-password'
            value={confirmPassword}
            type='password'
            onChange={(val) => setConfirmPassword(val)}
          />
          <div class='card-actions'>
            <Button type='submit' variant='primary'>
              {locale.btnChangePassword}
            </Button>
            <Button variant='ghost' onClick={cancel}>
              {locale.btnCancel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
