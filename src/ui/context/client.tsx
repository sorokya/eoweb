import type {
  CharacterDetails,
  CharacterSelectionListEntry,
  EquipmentPaperdoll,
} from 'eolib';
import { createContext } from 'preact';
import { useContext, useMemo, useState } from 'preact/hooks';
import type { Client } from '@/client';
import type { GameState } from '@/game-state';

type ClientContextProps = {
  client: Client;
  gameState: GameState;
  characters: CharacterSelectionListEntry[];
  characterInfo?: CharacterInfo;
};

export const ClientContext = createContext<ClientContextProps | null>(null);

type ClientProviderProps = {
  client: Client;
  children: preact.ComponentChildren;
};

type CharacterInfo = {
  details: CharacterDetails;
  equipment: EquipmentPaperdoll;
  className: string;
};

export function ClientProvider({ client, children }: ClientProviderProps) {
  const [gameState, setGameState] = useState(client.state);
  const [characters, setCharacters] = useState<CharacterSelectionListEntry[]>(
    [],
  );

  const [characterInfo, setCharacterInfo] = useState<
    CharacterInfo | undefined
  >();

  useMemo(() => {
    client.on('stateChanged', setGameState);
    client.authenticationController.subscribeCharactersChanged(setCharacters);
    client.socialController.subscribePaperdollOpened(
      ({ details, equipment }) => {
        setCharacterInfo({
          details,
          equipment,
          className: client.ecf?.classes[details.classId]?.name,
        });
      },
    );
    client.on('equipmentChanged', () => {
      setCharacterInfo((prev) =>
        prev ? { ...prev, equipment: client.equipment } : prev,
      );
    });
  }, [client]);

  return (
    <ClientContext.Provider
      value={{ client, gameState, characters, characterInfo }}
    >
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

export function useCharacterInfo() {
  return useClientContext().characterInfo;
}
