import type { Client } from '@/client';
import { GameState } from '@/game-state';
import {
  AlertContainer,
  CharacterSelect,
  Login,
  MainMenu,
} from '@/ui/containers';
import { ClientProvider, LocaleProvider, useGameState } from '@/ui/context';

function UiContent() {
  const gameState = useGameState();

  return (
    <AlertContainer>
      {(gameState === GameState.Initial ||
        gameState === GameState.Connected) && <MainMenu />}
      {gameState === GameState.Login && <Login />}
      {gameState === GameState.LoggedIn && <CharacterSelect />}
    </AlertContainer>
  );
}

export function Ui({ client }: { client: Client }) {
  return (
    <ClientProvider client={client}>
      <LocaleProvider>
        <UiContent />
      </LocaleProvider>
    </ClientProvider>
  );
}
