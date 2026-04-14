import type { Client } from '@/client';
import { GameState } from '@/game-state';
import {
  AlertContainer,
  ChangePassword,
  CharacterSelect,
  CreateAccount,
  CreateCharacter,
  InGame,
  Login,
  MainMenu,
} from '@/ui/containers';
import { ClientProvider, LocaleProvider, useGameState } from '@/ui/context';

function UiContent() {
  const gameState = useGameState();

  return (
    <>
      {(gameState === GameState.Initial ||
        gameState === GameState.Connected) && <MainMenu />}
      {gameState === GameState.Login && <Login />}
      {gameState === GameState.CreateAccount && <CreateAccount />}
      {gameState === GameState.CharacterSelect && <CharacterSelect />}
      {gameState === GameState.ChangePassword && <ChangePassword />}
      {gameState === GameState.CreateCharacter && <CreateCharacter />}
      {gameState === GameState.InGame && <InGame />}
    </>
  );
}

export function Ui({ client }: { client: Client }) {
  return (
    <div class='select-none'>
      <ClientProvider client={client}>
        <LocaleProvider>
          <AlertContainer>
            <UiContent />
          </AlertContainer>
        </LocaleProvider>
      </ClientProvider>
    </div>
  );
}
