import { useCallback, useState } from 'preact/hooks';
import { GameState } from '@/game-state';
import { Button, Input } from '@/ui/components';
import { useClient, useLocale } from '@/ui/context';

export function MainMenu() {
  const client = useClient();
  const [host, setHost] = useState(client.config.host);
  const { locale } = useLocale();

  const viewCredits = useCallback(() => {
    window.open(client.config.creditsUrl, '_blank');
  }, [client.config.creditsUrl]);

  const createAccount = useCallback(() => {
    if (client.state === GameState.Initial) {
      client.connect(GameState.CreateAccount);
    } else {
      client.setState(GameState.CreateAccount);
    }
  }, [client]);

  const playGame = useCallback(() => {
    if (client.state === GameState.Initial) {
      client.connect(GameState.Login);
    } else {
      client.setState(GameState.Login);
    }
  }, [client]);

  const handleHostChange = useCallback(
    (value: string) => {
      setHost(value);
      client.config.host = value;
    },
    [client],
  );

  return (
    <div class='flex h-full w-full flex-col items-center justify-center gap-4 align-center'>
      <img src='/logo.png' alt={locale.logoAlt} />
      <div class='flex flex-col gap-2'>
        {!client.config.staticHost && (
          <Input
            type='text'
            placeholder={locale.inputHost}
            value={host}
            onChange={(val) => handleHostChange(val)}
          />
        )}
        <Button onClick={createAccount}>{locale.btnCreateAccount}</Button>
        <Button onClick={playGame}>{locale.btnPlayGame}</Button>
        <Button onClick={viewCredits}>{locale.btnViewCredits}</Button>
      </div>
    </div>
  );
}
