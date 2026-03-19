import type { ComponentChildren } from 'preact';
import type { Client } from '../../../client';
import { ClientContext } from './client-context';

export function ClientProvider({
  children,
  client,
}: {
  children: ComponentChildren;
  client: Client;
}) {
  return (
    <ClientContext.Provider value={client}>{children}</ClientContext.Provider>
  );
}
