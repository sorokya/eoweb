import { useCallback, useMemo, useState } from 'preact/hooks';
import { GameState } from '@/game-state';
import { Button, Checkbox, Input } from '@/ui/components';
import { useClient, useLocale } from '@/ui/context';

export function Login() {
  const client = useClient();
  const { locale } = useLocale();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  useMemo(() => {
    client.authenticationController.subscribeLoginFailed(() => {
      setPassword('');
    });
  }, [client]);

  const onSubmit = useCallback(
    (e: SubmitEvent) => {
      client.authenticationController.login(username, password, rememberMe);
      e.preventDefault();
    },
    [username, password, rememberMe, client],
  );

  const cancel = useCallback(() => {
    client.setState(GameState.Connected);
  }, [client]);

  return (
    <div class='card w-96 bg-base-100 shadow-sm'>
      <div class='card-body'>
        <div class='card-title'>{locale.login.title}</div>
        <form onSubmit={onSubmit} class='flex flex-col gap-4'>
          <Input
            label={locale.login.username}
            name='username'
            value={username}
            onChange={(val) => setUsername(val)}
            autofocus
          />
          <Input
            label={locale.login.password}
            name='password'
            value={password}
            type='password'
            onChange={(val) => setPassword(val)}
          />
          <Checkbox
            label={locale.login.remember}
            checked={rememberMe}
            onChange={setRememberMe}
          />
          <div class='card-actions'>
            <Button type='submit' variant='primary'>
              {locale.login.btnConnect}
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
