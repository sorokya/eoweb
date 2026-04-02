import { useMemo, useState } from 'preact/hooks';
import type { Client } from '@/client';
import { GameState } from '@/game-state';
import { AlertContainer } from '@/ui/containers';
import { ClientProvider, LocaleProvider } from '@/ui/context';
import { MainMenu } from '@/ui/main-menu';

export function Ui({ client }: { client: Client }) {
  const [state, setState] = useState(client.state);

  useMemo(() => {
    client.on('stateChanged', (newState) => {
      setState(newState);
    });
  }, [client]);

  return (
    <ClientProvider client={client}>
      <LocaleProvider>
        <AlertContainer>
          {state === GameState.Initial && <MainMenu />}
        </AlertContainer>
      </LocaleProvider>
    </ClientProvider>
  );
}
