import { useCallback } from 'preact/hooks';
import { GameState } from '@/game-state';
import { Button } from '@/ui/components';
import { useClient, useLocale } from '@/ui/context';

export function MainMenu() {
  const client = useClient();
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

  return (
    <div class='align-center flex-col gap-4 flex w-full h-full justify-center items-center'>
      <img src='/logo.png' alt={locale.logoAlt} />
      <div class='flex flex-col gap-2'>
        <Button onClick={createAccount}>{locale.btnCreateAccount}</Button>
        <Button onClick={playGame}>{locale.btnPlayGame}</Button>
        <Button onClick={viewCredits}>{locale.btnViewCredits}</Button>
      </div>
    </div>
  );
}
