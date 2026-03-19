import { type Client, GameState } from '../client';
import { MainMenu } from './components/main-menu';
import { AlertProvider } from './contexts/alert';
import { ClientProvider } from './contexts/client/';

export default function App({ client }: { client: Client }) {
  return (
    <ClientProvider client={client}>
      <AlertProvider>
        {client.state === GameState.Initial && <MainMenu />}
      </AlertProvider>
    </ClientProvider>
  );
}
