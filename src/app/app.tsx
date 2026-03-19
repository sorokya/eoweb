import type { Client } from '../client';
import { Test } from './components/test';
import { AlertProvider } from './contexts/alert';
import { ClientProvider } from './contexts/client/';

export default function App({ client }: { client: Client }) {
  return (
    <ClientProvider client={client}>
      <AlertProvider>
        <Test />
      </AlertProvider>
    </ClientProvider>
  );
}
