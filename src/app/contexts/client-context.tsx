import { createContext, useContext } from 'react';
import type { Client } from '../../client';

export const ClientContext = createContext<Client>(null);

export function useClient(): Client {
  const client = useContext(ClientContext);
  if (!client) {
    throw new Error('useClient must be used within a ClientProvider');
  }
  return client;
}

export function ClientProvider({
  children,
  client,
}: {
  children: React.ReactNode;
  client: Client;
}) {
  return (
    <ClientContext.Provider value={client}>{children}</ClientContext.Provider>
  );
}
