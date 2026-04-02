import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { Client } from '@/client';

export const ClientContext = createContext<Client | null>(null);

type ClientProviderProps = {
  client: Client;
  children: preact.ComponentChildren;
};

export function ClientProvider({ client, children }: ClientProviderProps) {
  return (
    <ClientContext.Provider value={client}>{children}</ClientContext.Provider>
  );
}

export function useClient() {
  const client = useContext(ClientContext);
  if (!client) {
    throw new Error('useClient must be used within a ClientProvider');
  }
  return client;
}
