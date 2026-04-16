import type { ItemSpecial } from 'eolib';
import type { Client } from '@/client';
import {
  LOCKER_MAX_ITEM_AMOUNT,
  LOCKER_UPGRADE_BASE_COST,
  LOCKER_UPGRADE_COST_STEP,
  MAX_LOCKER_UPGRADES,
} from '@/consts';
import { DialogResourceID, EOResourceID } from '@/edf';
import { GameState } from '@/game-state';
import { ChatIcon, ChatTab, SlotType } from '@/ui/ui-types';
import { capitalize } from '@/utils';

// biome-ignore lint/suspicious/noExplicitAny: Event emitter callbacks require flexible argument types
type EventCallback = (...args: any[]) => void;

interface UiEventDeps {
  client: Client;
  mainMenu: {
    show(): void;
    hide(): void;
    on(event: string, cb: EventCallback): void;
  };
  loginForm: {
    show(): void;
    hide(): void;
    on(event: string, cb: EventCallback): void;
  };
  createAccountForm: {
    show(): void;
    hide(): void;
    on(event: string, cb: EventCallback): void;
  };
  characterSelect: {
    show(): void;
    hide(): void;
    confirmed: boolean;
    on(event: string, cb: EventCallback): void;
    selectCharacter(index: number): void;
    isOpen?(): boolean;
  };
  createCharacterForm: {
    show(): void;
    hide(): void;
    on(event: string, cb: EventCallback): void;
    isOpen(): boolean;
  };
  changePasswordForm: {
    show(): void;
    hide(): void;
    on(event: string, cb: EventCallback): void;
    isOpen(): boolean;
  };
  exitGame: {
    show(): void;
    on(event: string, cb: EventCallback): void;
  };
  chat: {
    focus(): void;
    addMessage(tab: ChatTab, msg: string, icon: ChatIcon, name?: string): void;
    on(event: string, cb: EventCallback): void;
    show(): void;
  };
  smallConfirm: {
    setContent(msg: string, title: string): void;
    setCallback(cb: () => void, hideOnCallback?: boolean): void;
    show(): void;
  };
  smallAlertLargeHeader: {
    setContent(msg: string, title: string): void;
    show(): void;
  };
  smallAlert: { setContent(msg: string, title: string): void; show(): void };
  largeAlertSmallHeader: {
    setContent(msg: string, title: string): void;
    show(): void;
  };
  largeConfirmSmallHeader: {
    setContent(msg: string, title: string): void;
    setCallback(cb: () => void): void;
    show(): void;
    hide(): void;
  };
  inventory: {
    toggle(): void;
    show(): void;
    on(event: string, cb: EventCallback): void;
  };
  stats: {
    toggle(): void;
    setTrainingConfirmed(): void;
    on(event: string, cb: EventCallback): void;
  };
  spellBook: {
    toggle(): void;
    on(event: string, cb: EventCallback): void;
  };
  onlineList: { toggle(): void };
  inGameMenu: { on(event: string, cb: EventCallback): void };
  questDialog: { on(event: string, cb: EventCallback): void };
  shopDialog: { on(event: string, cb: EventCallback): void };
  bankDialog: { on(event: string, cb: EventCallback): void };
  jukeboxDialog: { on(event: string, cb: EventCallback): void };
  lockerDialog: {
    getItemAmount(id: number): number;
  };
  hotbar: { setSlot(index: number, type: SlotType, id: number): void };
  itemAmountDialog: {
    setMaxAmount(max: number): void;
    setHeader(h: string): void;
    setLabel(l: string): void;
    setCallback(cb: (amount: number) => void, onCancel?: () => void): void;
    show(): void;
    hide(): void;
  };
  partyDialog: { toggle(): void };
  hideAllUi: () => void;
  initializeSocket: (next?: 'login' | 'create' | '') => void;
}

export function wireUiEvents(deps: UiEventDeps): void {
  const { client } = deps;

  // Exit game
  deps.exitGame.on('click', () => {
    const text = client.getDialogStrings(
      DialogResourceID.EXIT_GAME_ARE_YOU_SURE,
    );
    deps.smallConfirm.setContent(text[1], text[0]);
    deps.smallConfirm.setCallback(() => {
      client.disconnect();
      deps.hideAllUi();
      deps.mainMenu.show();
    });
    deps.smallConfirm.show();
  });

  // Main menu
  deps.mainMenu.on('play-game', () => {
    if (client.state === GameState.Initial) {
      deps.initializeSocket('login');
    } else {
      deps.mainMenu.hide();
      deps.loginForm.show();
    }
  });

  deps.mainMenu.on('create-account', () => {
    if (client.state === GameState.Initial) {
      deps.initializeSocket('create');
    } else {
      deps.mainMenu.hide();
      deps.createAccountForm.show();
    }
  });

  deps.mainMenu.on('view-credits', () => {
    window.open(client.config.creditsUrl, '_blank');
  });

  deps.mainMenu.on('host-change', (host: unknown) => {
    client.config.host = host as string;
    client.disconnect();
  });

  // Create account
  deps.createAccountForm.on('cancel', () => {
    deps.createAccountForm.hide();
    deps.mainMenu.show();
  });

  deps.createAccountForm.on(
    'error',
    ({ title, message }: { title: string; message: string }) => {
      deps.smallAlertLargeHeader.setContent(message, title);
      deps.smallAlertLargeHeader.show();
    },
  );

  deps.createAccountForm.on('create', (data: unknown) => {
    client.authenticationController.requestAccountCreation(
      data as Parameters<
        typeof client.authenticationController.requestAccountCreation
      >[0],
    );
  });

  // Login
  deps.loginForm.on(
    'login',
    ({
      username,
      password,
      rememberMe,
    }: {
      username: string;
      password: string;
      rememberMe: boolean;
    }) => {
      client.authenticationController.login(username, password, rememberMe);
    },
  );

  deps.loginForm.on('cancel', () => {
    deps.loginForm.hide();
    deps.mainMenu.show();
  });

  // Character select
  deps.characterSelect.on('cancel', () => {
    client.disconnect();
    deps.characterSelect.hide();
    deps.mainMenu.show();
  });

  deps.characterSelect.on('changePassword', () => {
    deps.changePasswordForm.show();
  });

  deps.characterSelect.on('selectCharacter', (id: unknown) => {
    client.authenticationController.selectCharacter(id as number);
  });

  deps.characterSelect.on(
    'requestCharacterDeletion',
    ({ id, name }: { id: number; name: string }) => {
      const strings = client.getDialogStrings(
        DialogResourceID.CHARACTER_DELETE_FIRST_CHECK,
      );
      deps.smallConfirm.setContent(
        `${capitalize(name)} ${strings[1]}`,
        strings[0],
      );
      deps.smallConfirm.setCallback(() => {
        client.authenticationController.requestCharacterDeletion(id);
        deps.characterSelect.confirmed = true;
      });
      deps.smallConfirm.show();
    },
  );

  deps.characterSelect.on(
    'deleteCharacter',
    ({ id, name }: { id: number; name: string }) => {
      const strings = client.getDialogStrings(
        DialogResourceID.CHARACTER_DELETE_CONFIRM,
      );
      deps.smallConfirm.setContent(
        `${capitalize(name)} ${strings[1]}`,
        strings[0],
      );
      deps.smallConfirm.setCallback(() => {
        client.authenticationController.deleteCharacter(id);
      });
      deps.smallConfirm.show();
    },
  );

  deps.characterSelect.on(
    'error',
    ({ title, message }: { title: string; message: string }) => {
      deps.smallAlertLargeHeader.setContent(message, title);
      deps.smallAlertLargeHeader.show();
    },
  );

  deps.characterSelect.on('create', () => {
    deps.createCharacterForm.show();
  });

  // Character creation
  deps.createCharacterForm.on('create', (data: unknown) => {
    client.authenticationController.requestCharacterCreation(
      data as Parameters<
        typeof client.authenticationController.requestCharacterCreation
      >[0],
    );
  });

  // Change password
  deps.changePasswordForm.on(
    'error',
    ({ title, message }: { title: string; message: string }) => {
      deps.smallAlertLargeHeader.setContent(message, title);
      deps.smallAlertLargeHeader.show();
    },
  );

  deps.changePasswordForm.on(
    'changePassword',
    ({
      username,
      oldPassword,
      newPassword,
    }: {
      username: string;
      oldPassword: string;
      newPassword: string;
    }) => {
      client.authenticationController.changePassword(
        username,
        oldPassword,
        newPassword,
      );
    },
  );

  // Chat
  deps.chat.on('chat', (message: unknown) => {
    client.chatController.chat(message as string);
  });

  deps.chat.on('focus', () => {
    client.typing = true;
  });

  deps.chat.on('blur', () => {
    client.typing = false;
  });

  // In-game menu toggles
  const handleToggle = (which: unknown) => {
    switch (which as string) {
      case 'inventory':
        deps.inventory.toggle();
        break;
      case 'map':
        client.toggleMinimap();
        break;
      case 'stats':
        deps.stats.toggle();
        break;
      case 'spells':
        deps.spellBook.toggle();
        break;
      case 'party':
        deps.partyDialog.toggle();
        break;
      case 'online':
        deps.onlineList.toggle();
        break;
    }
  };

  deps.inGameMenu.on('toggle', handleToggle);

  // Inventory events
  wireInventoryEvents(deps);

  // Quest dialog
  deps.questDialog.on(
    'reply',
    ({
      questId,
      dialogId,
      action,
    }: {
      questId: number;
      dialogId: number;
      action: number | null;
    }) => {
      client.questController.questReply(questId, dialogId, action);
      client.typing = false;
    },
  );

  deps.questDialog.on('cancel', () => {
    client.typing = false;
  });

  // Shop dialog
  wireShopEvents(deps);

  // Bank dialog
  wireBankEvents(deps);

  // Jukebox dialog
  deps.jukeboxDialog.on('requestSong', ({ trackId }: { trackId: number }) => {
    client.jukeboxController.requestSong(trackId);
  });

  // Stats
  deps.stats.on('confirmTraining', () => {
    deps.smallConfirm.setContent('Do you want to train?', 'Character training');
    deps.smallConfirm.setCallback(() => {
      deps.stats.setTrainingConfirmed();
    });
    deps.smallConfirm.show();
  });

  // Spell book
  deps.spellBook.on(
    'assignToSlot',
    ({ spellId, slotIndex }: { spellId: number; slotIndex: number }) => {
      deps.hotbar.setSlot(slotIndex, SlotType.Skill, spellId);
    },
  );

  // Inventory assign to slot
  deps.inventory.on(
    'assignToSlot',
    ({ itemId, slotIndex }: { itemId: number; slotIndex: number }) => {
      deps.hotbar.setSlot(slotIndex, SlotType.Item, itemId);
    },
  );

  deps.inventory.on('openPaperdoll', () => {
    client.socialController.requestPaperdoll(client.playerId);
  });

  deps.inventory.on(
    'equipItem',
    ({ slot, itemId }: { slot: unknown; itemId: number }) => {
      client.inventoryController.equipItem(
        slot as Parameters<typeof client.inventoryController.equipItem>[0],
        itemId,
      );
    },
  );

  deps.inventory.on('useItem', (itemId: unknown) => {
    client.inventoryController.useItem(itemId as number);
  });

  // Keyboard
  window.addEventListener('keyup', (e) => {
    if (client.state === GameState.InGame && e.key === 'Enter') {
      deps.chat.focus();
    }

    if (
      client.state === GameState.LoggedIn &&
      !deps.changePasswordForm.isOpen() &&
      !deps.createCharacterForm.isOpen() &&
      ['1', '2', '3'].includes(e.key)
    ) {
      deps.characterSelect.selectCharacter(Number.parseInt(e.key, 10));
    }
  });
}

function wireInventoryEvents(deps: UiEventDeps): void {
  const { client } = deps;

  deps.inventory.on(
    'dropItem',
    ({ at, itemId }: { at: string; itemId: number }) => {
      const item = client.items.find((i) => i.id === itemId);
      if (!item) return;

      if (at === 'cursor' && !client.mapController.cursorInDropRange()) {
        client.setStatusLabel(
          EOResourceID.STATUS_LABEL_TYPE_WARNING,
          client.getResourceString(
            EOResourceID.STATUS_LABEL_ITEM_DROP_OUT_OF_RANGE,
          ),
        );
        deps.chat.addMessage(
          ChatTab.System,
          client.getResourceString(
            EOResourceID.STATUS_LABEL_ITEM_DROP_OUT_OF_RANGE,
          ),
          ChatIcon.DotDotDotDot,
        );
        return;
      }

      const playerAt = client.getPlayerCoords();
      const coords = at === 'cursor' ? client.mouseCoords : playerAt;
      if (
        client.nearby.items.some(
          (i) =>
            i.coords.x === coords!.x! &&
            i.coords.y === coords!.y! &&
            i.id === itemId,
        )
      ) {
        return;
      }

      const record = client.getEifRecordById(itemId);
      if (!record) return;

      if ((record as { special: ItemSpecial }).special === 1) {
        // ItemSpecial.Lore
        const strings = client.getDialogStrings(
          DialogResourceID.ITEM_IS_LORE_ITEM,
        );
        deps.smallAlert.setContent(strings[1], strings[0]);
        deps.smallAlert.show();
        return;
      }

      if (item.amount > 1) {
        client.typing = true;
        deps.itemAmountDialog.setMaxAmount(item.amount);
        deps.itemAmountDialog.setHeader('drop');
        deps.itemAmountDialog.setLabel(
          `${client.getResourceString(EOResourceID.DIALOG_TRANSFER_HOW_MUCH)} ${record.name} ${client.getResourceString(EOResourceID.DIALOG_TRANSFER_DROP)}`,
        );
        deps.itemAmountDialog.setCallback(
          (amount) => {
            client.inventoryController.dropItem(itemId, amount, coords!);
            client.typing = false;
          },
          () => {
            client.typing = false;
          },
        );
        deps.itemAmountDialog.show();
      } else {
        client.inventoryController.dropItem(itemId, 1, coords!);
      }
    },
  );

  deps.inventory.on('junkItem', (itemId: unknown) => {
    const id = itemId as number;
    const item = client.items.find((i) => i.id === id);
    if (!item) return;

    const record = client.getEifRecordById(id);
    if (!record) return;

    if (item.amount > 1) {
      client.typing = true;
      deps.itemAmountDialog.setMaxAmount(item.amount);
      deps.itemAmountDialog.setHeader('junk');
      deps.itemAmountDialog.setLabel(
        `${client.getResourceString(EOResourceID.DIALOG_TRANSFER_HOW_MUCH)} ${record.name} ${client.getResourceString(EOResourceID.DIALOG_TRANSFER_JUNK)}`,
      );
      deps.itemAmountDialog.setCallback(
        (amount) => {
          client.inventoryController.junkItem(id, amount);
          client.typing = false;
        },
        () => {
          client.typing = false;
        },
      );
      deps.itemAmountDialog.show();
    } else {
      client.inventoryController.junkItem(id, 1);
    }
  });

  deps.inventory.on('addChestItem', (itemId: unknown) => {
    const id = itemId as number;
    const item = client.items.find((i) => i.id === id);
    if (!item) return;

    const record = client.getEifRecordById(id);
    if (!record) return;

    if (item.amount > 1) {
      client.typing = true;
      deps.itemAmountDialog.setMaxAmount(item.amount);
      deps.itemAmountDialog.setHeader('drop');
      deps.itemAmountDialog.setLabel(
        `${client.getResourceString(EOResourceID.DIALOG_TRANSFER_HOW_MUCH)} ${record.name} ${client.getResourceString(EOResourceID.DIALOG_TRANSFER_DROP)}`,
      );
      deps.itemAmountDialog.setCallback(
        (amount) => {
          client.chestController.addItem(id, amount);
          client.typing = false;
        },
        () => {
          client.typing = false;
        },
      );
      deps.itemAmountDialog.show();
    } else {
      client.chestController.addItem(id, 1);
    }
  });

  deps.inventory.on('addLockerItem', (itemId: unknown) => {
    const id = itemId as number;
    const item = client.items.find((i) => i.id === id);
    if (!item) return;

    const record = client.getEifRecordById(id);
    if (!record) return;

    if (id === 1) {
      const strings = client.getDialogStrings(
        DialogResourceID.LOCKER_DEPOSIT_GOLD_ERROR,
      );
      deps.smallAlert.setContent(strings[1], strings[0]);
      deps.smallAlert.show();
      return;
    }

    const itemAmount = deps.lockerDialog.getItemAmount(id);
    if (itemAmount >= LOCKER_MAX_ITEM_AMOUNT) {
      const strings = client.getDialogStrings(
        DialogResourceID.LOCKER_FULL_SINGLE_ITEM_MAX,
      );
      deps.smallAlert.setContent(strings[1], strings[0]);
      deps.smallAlert.show();
      return;
    }

    if (item.amount > 1) {
      client.typing = true;
      deps.itemAmountDialog.setMaxAmount(
        Math.min(item.amount, LOCKER_MAX_ITEM_AMOUNT - itemAmount),
      );
      deps.itemAmountDialog.setHeader('bank');
      deps.itemAmountDialog.setLabel(
        `${client.getResourceString(EOResourceID.DIALOG_TRANSFER_HOW_MUCH)} ${record.name} ${client.getResourceString(EOResourceID.DIALOG_TRANSFER_DEPOSIT)}`,
      );
      deps.itemAmountDialog.setCallback(
        (amount) => {
          client.lockerController.addItem(id, amount);
          client.typing = false;
        },
        () => {
          client.typing = false;
        },
      );
      deps.itemAmountDialog.show();
    } else {
      client.lockerController.addItem(id, 1);
    }
  });
}

function wireShopEvents(deps: UiEventDeps): void {
  const { client } = deps;

  deps.shopDialog.on('buyItem', (item: unknown) => {
    const shopItem = item as {
      id: number;
      name: string;
      price: number;
      max: number;
    };
    const goldAmount = client.items.find((i) => i.id === 1)!.amount;
    if (shopItem.price > goldAmount) {
      const text = client.getDialogStrings(
        DialogResourceID.WARNING_YOU_HAVE_NOT_ENOUGH,
      );
      deps.smallAlert.setContent(text[1], text[0]);
      deps.smallAlert.show();
      return;
    }

    deps.itemAmountDialog.setHeader('shop');
    deps.itemAmountDialog.setMaxAmount(shopItem.max);
    deps.itemAmountDialog.setLabel(
      `${client.getResourceString(EOResourceID.DIALOG_TRANSFER_HOW_MUCH)} ${shopItem.name} ${client.getResourceString(EOResourceID.DIALOG_TRANSFER_BUY)}`,
    );
    deps.itemAmountDialog.setCallback(
      (amount) => {
        const total = amount * shopItem.price;
        const goldAmount = client.items.find((i) => i.id === 1)!.amount;
        deps.itemAmountDialog.hide();
        if (total > goldAmount) {
          const text = client.getDialogStrings(
            DialogResourceID.WARNING_YOU_HAVE_NOT_ENOUGH,
          );
          deps.smallAlert.setContent(text[1], text[0]);
          deps.smallAlert.show();
        } else {
          const wordBuy = client.getResourceString(
            EOResourceID.DIALOG_WORD_BUY,
          );
          const wordFor = client.getResourceString(
            EOResourceID.DIALOG_WORD_FOR,
          );
          const goldRecord = client.getEifRecordById(1);
          deps.smallConfirm.setContent(
            `${wordBuy} ${amount} ${shopItem.name} ${wordFor} ${total} ${goldRecord!.name!} ?`,
            client.getResourceString(EOResourceID.DIALOG_SHOP_BUY_ITEMS) ?? '',
          );
          deps.smallConfirm.setCallback(() => {
            client.shopController.buyItem(shopItem.id, amount);
          }, true);
          deps.smallConfirm.show();
        }
      },
      () => {},
    );
    deps.itemAmountDialog.show();
  });

  deps.shopDialog.on('sellItem', (item: unknown) => {
    const shopItem = item as { id: number; name: string; price: number };
    const itemAmount = client.items.find((i) => i.id === shopItem.id)!.amount;
    const showConfirm = (amount: number, total: number) => {
      const wordSell = client.getResourceString(EOResourceID.DIALOG_WORD_SELL);
      const wordFor = client.getResourceString(EOResourceID.DIALOG_WORD_FOR);
      const goldRecord = client.getEifRecordById(1);
      deps.smallConfirm.setContent(
        `${wordSell} ${amount} ${shopItem.name} ${wordFor} ${total} ${goldRecord!.name!} ?`,
        client.getResourceString(EOResourceID.DIALOG_SHOP_SELL_ITEMS) ?? '',
      );
      deps.smallConfirm.setCallback(() => {
        client.shopController.sellItem(shopItem.id, amount);
      });
      deps.smallConfirm.show();
    };

    if (itemAmount === 1) {
      showConfirm(1, shopItem.price);
      return;
    }

    deps.itemAmountDialog.setHeader('shop');
    deps.itemAmountDialog.setMaxAmount(itemAmount);
    deps.itemAmountDialog.setLabel(
      `${client.getResourceString(EOResourceID.DIALOG_TRANSFER_HOW_MUCH)} ${shopItem.name} ${client.getResourceString(EOResourceID.DIALOG_TRANSFER_SELL)}`,
    );
    deps.itemAmountDialog.setCallback((amount) => {
      const total = amount * shopItem.price;
      deps.itemAmountDialog.hide();
      showConfirm(amount, total);
    });
    deps.itemAmountDialog.show();
  });

  deps.shopDialog.on('craftItem', (item: unknown) => {
    const craftItem = item as {
      id: number;
      name: string;
      ingredients: { id: number; amount: number }[];
    };
    const missing = craftItem.ingredients.some((ingredient) => {
      if (!ingredient.amount) return false;
      const item = client.items.find((i) => i.id === ingredient.id);
      return !item || item.amount < ingredient.amount;
    });

    const lines = craftItem.ingredients
      .map((ingredient) => {
        if (!ingredient.id) return '';
        const record = client.getEifRecordById(ingredient.id);
        if (!record) return '';
        return `+ ${ingredient.amount} ${record.name}`;
      })
      .filter((l) => !!l);

    if (missing) {
      deps.largeAlertSmallHeader.setContent(
        `${client.getResourceString(EOResourceID.DIALOG_SHOP_CRAFT_MISSING_INGREDIENTS)}\n\n${lines.join('\n')}`,
        `${client.getResourceString(EOResourceID.DIALOG_SHOP_CRAFT_INGREDIENTS)} ${craftItem.name}`,
      );
      deps.largeAlertSmallHeader.show();
      return;
    }

    deps.largeConfirmSmallHeader.setContent(
      `${client.getResourceString(EOResourceID.DIALOG_SHOP_CRAFT_PUT_INGREDIENTS_TOGETHER)}\n\n${lines.join('\n')}`,
      `${client.getResourceString(EOResourceID.DIALOG_SHOP_CRAFT_INGREDIENTS)} ${craftItem.name}`,
    );
    deps.largeConfirmSmallHeader.setCallback(() => {
      client.shopController.craftItem(craftItem.id);
      deps.largeConfirmSmallHeader.hide();
    });
    deps.largeConfirmSmallHeader.show();
  });
}

function wireBankEvents(deps: UiEventDeps): void {
  const { client } = deps;

  deps.bankDialog.on('deposit', () => {
    const gold = client.items.find((i) => i.id === 1);
    if (!gold || gold.amount <= 0) {
      const strings = client.getDialogStrings(
        DialogResourceID.BANK_ACCOUNT_UNABLE_TO_DEPOSIT,
      );
      deps.smallAlert.setContent(strings[1], strings[0]);
      deps.smallAlert.show();
      return;
    }

    if (gold.amount > 1) {
      const record = client.getEifRecordById(1);
      if (!record) throw new Error('Failed to fetch gold record');
      deps.itemAmountDialog.setHeader('bank');
      deps.itemAmountDialog.setMaxAmount(gold.amount);
      deps.itemAmountDialog.setLabel(
        `${client.getResourceString(EOResourceID.DIALOG_TRANSFER_HOW_MUCH)} ${record.name} ${client.getResourceString(EOResourceID.DIALOG_TRANSFER_DEPOSIT)}`,
      );
      deps.itemAmountDialog.setCallback((amount) => {
        client.bankController.depositGold(amount);
        deps.itemAmountDialog.hide();
      });
      deps.itemAmountDialog.show();
      return;
    }

    client.bankController.depositGold(1);
  });

  deps.bankDialog.on('withdraw', () => {
    if (client.bankController.goldBank <= 0) {
      const strings = client.getDialogStrings(
        DialogResourceID.BANK_ACCOUNT_UNABLE_TO_WITHDRAW,
      );
      deps.smallAlert.setContent(strings[1], strings[0]);
      deps.smallAlert.show();
      return;
    }

    if (client.bankController.goldBank > 1) {
      const record = client.getEifRecordById(1);
      if (!record) throw new Error('Failed to fetch gold record');
      deps.itemAmountDialog.setHeader('bank');
      deps.itemAmountDialog.setMaxAmount(client.bankController.goldBank);
      deps.itemAmountDialog.setLabel(
        `${client.getResourceString(EOResourceID.DIALOG_TRANSFER_HOW_MUCH)} ${record.name} ${client.getResourceString(EOResourceID.DIALOG_TRANSFER_WITHDRAW)}`,
      );
      deps.itemAmountDialog.setCallback((amount) => {
        client.bankController.withdrawGold(amount);
        deps.itemAmountDialog.hide();
      });
      deps.itemAmountDialog.show();
      return;
    }

    client.bankController.withdrawGold(1);
  });

  deps.bankDialog.on('upgrade', () => {
    if (client.bankController.lockerUpgrades >= MAX_LOCKER_UPGRADES) {
      const strings = client.getDialogStrings(
        DialogResourceID.LOCKER_UPGRADE_IMPOSSIBLE,
      );
      deps.smallAlert.setContent(strings[1], strings[0]);
      deps.smallAlert.show();
      return;
    }

    const requiredGold =
      LOCKER_UPGRADE_BASE_COST +
      LOCKER_UPGRADE_COST_STEP * client.bankController.lockerUpgrades;
    const gold = client.items.find((i) => i.id === 1)?.amount || 0;

    const record = client.getEifRecordById(1);
    if (!record) throw new Error('Failed to fetch gold record');

    if (gold < requiredGold) {
      const strings = client.getDialogStrings(
        DialogResourceID.WARNING_YOU_HAVE_NOT_ENOUGH,
      );
      deps.smallAlert.setContent(`${strings[1]} ${record.name}`, strings[0]);
      deps.smallAlert.show();
      return;
    }

    const strings = client.getDialogStrings(
      DialogResourceID.LOCKER_UPGRADE_UNIT,
    );
    deps.smallConfirm.setContent(
      `${strings[1]} ${requiredGold} ${record.name}`,
      strings[0],
    );
    deps.smallConfirm.setCallback(() => {
      client.lockerController.upgradeLocker();
    });
    deps.smallConfirm.show();
  });
}
