import { useContext } from 'preact/hooks';
import type { Client } from '../../../client';
import { ClientContext } from './client-context';

export function useClient(): Client {
  const client = useContext(ClientContext);
  if (!client) {
    throw new Error('useClient must be used within a ClientProvider');
  }
  return client;
}
