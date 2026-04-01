import type { Client } from '@/client';
import { DialogResourceID, EOResourceID } from '@/edf';
import { GameState } from '@/game-state';
import { playSfxById, SfxId } from '@/sfx';
import { ChatIcon, ChatTab } from '@/ui/ui-types';

export interface ClientEventDeps {
  client: Client;
  smallAlertLargeHeader: {
    setContent(msg: string, title: string): void;
    show(): void;
  };
  smallConfirm: {
    setContent(msg: string, title: string): void;
    setCallback(cb: () => void): void;
    show(): void;
  };
  smallAlert: { setContent(msg: string, title: string): void; show(): void };
  createAccountForm: { hide(): void };
  mainMenu: { show(): void; hide(): void };
  loginForm: { hide(): void };
  characterSelect: {
    setCharacters(chars: unknown): void;
    hide(): void;
    show(): void;
  };
  createCharacterForm: { hide(): void };
  changePasswordForm: { hide(): void };
  chat: {
    clear(): void;
    show(): void;
    addMessage(tab: ChatTab, msg: string, icon: ChatIcon, name?: string): void;
    setMessage(msg: string): void;
  };
  hud: { setStats(client: Client): void; show(): void };
  hotbar: { show(): void; refresh(): void };
  inGameMenu: { show(): void };
  exitGame: { show(): void };
  inventory: { loadPositions(): void; show(): void };
  stats: { render(): void };
  questDialog: {
    setData(
      questId: number,
      dialogId: number,
      name: string,
      quests: unknown,
      dialog: unknown,
    ): void;
    show(): void;
  };
  paperdoll: {
    setData(icon: unknown, details: unknown, equipment: unknown): void;
    show(): void;
  };
  chestDialog: { setItems(items: unknown): void; show(): void };
  shopDialog: {
    setData(name: string, craftItems: unknown, tradeItems: unknown): void;
    show(): void;
  };
  bankDialog: { show(): void };
  barberDialog: { show(): void };
  boardDialog: { setData(posts: unknown): void; show(): void };
  lockerDialog: { setItems(items: unknown): void; show(): void };
  skillMasterDialog: {
    setData(name: string, skills: unknown): void;
    show(): void;
    refresh(): void;
  };
  partyDialog: { refresh(): void };
  mobileControls: { show(): void; hide(): void };
  initializeSocket: (next?: 'login' | 'create' | '') => void;
}

let reconnectAttempts = 0;

export function resetReconnectAttempts() {
  reconnectAttempts = 0;
}

export function getReconnectAttempts() {
  return reconnectAttempts;
}

export function incrementReconnectAttempts() {
  reconnectAttempts++;
  return reconnectAttempts;
}

export function wireClientEvents(deps: ClientEventDeps): void {
  const { client } = deps;

  client.on('error', ({ title, message }) => {
    deps.smallAlertLargeHeader.setContent(message, title || 'Error');
    deps.smallAlertLargeHeader.show();
  });

  client.on('confirmation', ({ title, message, onConfirm }) => {
    deps.smallConfirm.setContent(message, title);
    deps.smallConfirm.setCallback(() => {
      onConfirm();
    });
    deps.smallConfirm.show();
  });

  client.on('smallAlert', ({ title, message }) => {
    deps.smallAlert.setContent(message, title);
    deps.smallAlert.show();
  });

  client.on('debug', (_message) => {});

  client.on('accountCreated', () => {
    const text = client.getDialogStrings(
      DialogResourceID.ACCOUNT_CREATE_SUCCESS_WELCOME,
    );
    deps.smallAlertLargeHeader.setContent(text[1], text[0]);
    deps.smallAlertLargeHeader.show();
    deps.createAccountForm.hide();
    deps.mainMenu.show();
  });

  client.on('login', (characters) => {
    playSfxById(SfxId.Login);
    deps.loginForm.hide();
    deps.characterSelect.setCharacters(characters);
    deps.mainMenu.hide();
    deps.characterSelect.show();
  });

  client.on('serverChat', ({ message, sfxId, icon }) => {
    client.emit('chat', {
      tab: ChatTab.Local,
      name: client.getResourceString(EOResourceID.STRING_SERVER),
      message,
      icon: icon || ChatIcon.Exclamation,
    });
    playSfxById(sfxId || SfxId.ServerMessage);
  });

  client.on('characterCreated', (characters) => {
    deps.createCharacterForm.hide();
    const text = client.getDialogStrings(
      DialogResourceID.CHARACTER_CREATE_SUCCESS,
    );
    deps.smallAlertLargeHeader.setContent(text[1], text[0]);
    deps.smallAlertLargeHeader.show();
    deps.characterSelect.setCharacters(characters);
  });

  client.on('characterDeleted', (characters) => {
    deps.characterSelect.setCharacters(characters);
  });

  client.on('selectCharacter', () => {});

  client.on('chat', ({ icon, tab, message, name }) => {
    deps.chat.addMessage(tab, message, icon || ChatIcon.None, name);
  });

  client.on('enterGame', ({ news }) => {
    deps.mainMenu.hide();
    deps.chat.clear();
    for (const line of news) {
      if (line) {
        deps.chat.addMessage(ChatTab.Local, line, ChatIcon.None);
      }
    }

    deps.characterSelect.hide();
    deps.exitGame.show();
    deps.chat.show();
    deps.hud.setStats(client);
    deps.hud.show();
    deps.hotbar.show();
    deps.inGameMenu.show();
    deps.client.viewportController.resizeCanvases();
    deps.inventory.loadPositions();
    if (!client.viewportController.isMobile()) {
      deps.inventory.show();
    }
  });

  client.on('passwordChanged', () => {
    deps.changePasswordForm.hide();
    const text = client.getDialogStrings(
      DialogResourceID.CHANGE_PASSWORD_SUCCESS,
    );
    deps.smallAlertLargeHeader.setContent(text[1], text[0]);
    deps.smallAlertLargeHeader.show();
  });

  client.on('statsUpdate', () => {
    deps.hud.setStats(client);
    deps.stats.render();
  });

  client.on('reconnect', () => {
    deps.initializeSocket('login');
  });

  client.on('openQuestDialog', (data) => {
    client.typing = true;
    deps.questDialog.setData(
      data.questId,
      data.dialogId,
      data.name,
      data.quests,
      data.dialog,
    );
    deps.questDialog.show();
  });

  client.on('openPaperdoll', ({ icon, equipment, details }) => {
    deps.paperdoll.setData(icon, details, equipment);
    deps.paperdoll.show();
  });

  client.on('chestOpened', ({ items }) => {
    deps.chestDialog.setItems(items);
    deps.chestDialog.show();
  });

  client.on('chestChanged', ({ items }) => {
    deps.chestDialog.setItems(items);
  });

  client.on('shopOpened', (data) => {
    deps.shopDialog.setData(data.name, data.craftItems, data.tradeItems);
    deps.shopDialog.show();
  });

  client.on('bankOpened', () => {
    deps.bankDialog.show();
  });

  client.on('barberOpened', () => {
    deps.barberDialog.show();
  });

  client.on('boardOpened', ({ posts }) => {
    deps.boardDialog.setData(posts);
    deps.boardDialog.show();
  });

  client.on('lockerOpened', ({ items }) => {
    deps.lockerDialog.setItems(items);
    deps.lockerDialog.show();
  });

  client.on('lockerChanged', ({ items }) => {
    deps.lockerDialog.setItems(items);
  });

  client.on('skillMasterOpened', ({ name, skills }) => {
    deps.skillMasterDialog.setData(name, skills);
    deps.skillMasterDialog.show();
  });

  client.on('skillsChanged', () => {
    deps.skillMasterDialog.refresh();
  });

  client.on('spellQueued', () => {
    deps.hotbar.refresh();
  });

  client.on('setChat', (message) => {
    deps.chat.setMessage(message);
  });

  client.on('partyUpdated', () => {
    deps.partyDialog.refresh();
  });

  client.on('resize', () => {
    if (
      client.state === GameState.InGame &&
      client.viewportController.isMobile()
    ) {
      deps.mobileControls.show();
    } else {
      deps.mobileControls.hide();
    }
  });
}
