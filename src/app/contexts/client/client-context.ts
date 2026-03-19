import { createContext } from 'preact';
import type { Client } from '../../../client';

export const ClientContext = createContext<Client | null>(null);
