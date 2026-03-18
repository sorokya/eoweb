import type { Client } from '../client';
import { ClientProvider } from './contexts/client-context';

export default function App({ client }: { client: Client }) {
  return (
    <ClientProvider client={client}>
      <span>App</span>
    </ClientProvider>
  );
}
