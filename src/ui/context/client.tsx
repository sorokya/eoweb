import type { CharacterSelectionListEntry } from 'eolib';
import { createContext } from 'preact';
import { useContext, useMemo, useState } from 'preact/hooks';
import type { Client } from '@/client';
import type { GameState } from '@/game-state';

type ClientContextProps = {
  client: Client;
  gameState: GameState;
  characters: CharacterSelectionListEntry[];
};

export const ClientContext = createContext<ClientContextProps | null>(null);

type ClientProviderProps = {
  client: Client;
  children: preact.ComponentChildren;
};

export function ClientProvider({ client, children }: ClientProviderProps) {
  const [gameState, setGameState] = useState(client.state);
  const [characters, setCharacters] = useState<CharacterSelectionListEntry[]>(
    [],
  );

  useMemo(() => {
    client.on('stateChanged', setGameState);
    client.authenticationController.subscribeCharactersChanged(setCharacters);
  }, [client]);

  return (
    <ClientContext.Provider value={{ client, gameState, characters }}>
      {children}
    </ClientContext.Provider>
  );
}

function useClientContext() {
  const ctx = useContext(ClientContext);
  if (!ctx) {
    throw new Error('Must be used within a ClientProvider');
  }
  return ctx;
}

export function useClient() {
  return useClientContext().client;
}

export function useGameState() {
  return useClientContext().gameState;
}

export function useCharacters() {
  return useClientContext().characters;
}
