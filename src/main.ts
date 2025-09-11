import {
  BigCoords,
  CharacterMapInfo,
  Emf,
  EoReader,
  Gender,
  InitInitClientPacket,
  ItemSpecial,
  SitState,
} from 'eolib';
import './style.css';
import 'notyf/notyf.min.css';
import { PacketBus } from './bus';
import { ChatTab, Client, GameState } from './client';
import {
  GAME_FPS,
  LOCKER_UPGRADE_BASE_COST,
  LOCKER_UPGRADE_COST_STEP,
  MAX_CHALLENGE,
  MAX_LOCKER_UPGRADES,
} from './consts';
import { DialogResourceID, EOResourceID } from './edf';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  setGameSize,
  setZoom,
  ZOOM,
} from './game-state';
import { playSfxById, SfxId } from './sfx';
import { BankDialog } from './ui/bank-dialog';
import { ChangePasswordForm } from './ui/change-password';
import { CharacterSelect } from './ui/character-select';
import { Chat, ChatIcon } from './ui/chat';
import { ChestDialog } from './ui/chest-dialog';
import { CreateAccountForm } from './ui/create-account';
import { CreateCharacterForm } from './ui/create-character';
import { ExitGame } from './ui/exit-game';
import { HUD } from './ui/hud';
import { InGameMenu } from './ui/in-game-menu';
import { Inventory } from './ui/inventory';
import { ItemAmountDialog } from './ui/item-amount-dialog';
import { LargeAlertSmallHeader } from './ui/large-alert-small-header';
import { LargeConfirmSmallHeader } from './ui/large-confirm-small-header';
import { LockerDialog } from './ui/locker-dialog';
import { LoginForm } from './ui/login';
import { MainMenu } from './ui/main-menu';
import { MobileControls } from './ui/mobile-controls';
import { OffsetTweaker } from './ui/offset-tweaker';
import { Paperdoll } from './ui/paperdoll';
import { QuestDialog } from './ui/quest-dialog';
import { ShopDialog } from './ui/shop-dialog';
import { SmallAlertLargeHeader } from './ui/small-alert-large-header';
import { SmallAlertSmallHeader } from './ui/small-alert-small-header';
import { SmallConfirm } from './ui/small-confirm';
import { randomRange } from './utils/random-range';

const canvas = document.getElementById('game') as HTMLCanvasElement;
if (!canvas) throw new Error('Canvas not found!');

const ctx = canvas.getContext('2d', { alpha: false });
if (!ctx) {
  throw new Error('Failed to get canvas context!');
}
ctx.imageSmoothingEnabled = false;

const client = new Client();
const mobileControls = new MobileControls();

let userOverride = false;

export function zoomIn() {
  userOverride = true;
  setZoom(Math.min(4, ZOOM + 1));
  resizeCanvases();
}

export function zoomOut() {
  userOverride = true;
  setZoom(Math.max(1, ZOOM - 1));
  resizeCanvases();
}

export function zoomReset() {
  userOverride = false;
  resizeCanvases();
}

function resizeCanvases() {
  const container = document.getElementById('container');
  if (!container) return;
  const viewportWidth =
    window.visualViewport?.width ?? container.getBoundingClientRect().width;
  const viewportHeight =
    window.visualViewport?.height ?? container.getBoundingClientRect().height;
  if (!userOverride) setZoom(viewportWidth >= 1280 ? 2 : 1);
  const w = Math.floor(viewportWidth / ZOOM);
  const h = Math.floor(viewportHeight / ZOOM);
  // OK so basically canvas.width = newValue clears the entire canvas
  // which means we see the background for like 1 frame = flicker
  // solution: screenshot the canvas before resize, then draw it back
  const snapshot =
    canvas.width > 0
      ? ctx.getImageData(0, 0, canvas.width, canvas.height)
      : null;
  const prevW = canvas.width;
  const prevH = canvas.height;
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = `${w * ZOOM}px`;
  canvas.style.height = `${h * ZOOM}px`;
  ctx.imageSmoothingEnabled = false;
  if (snapshot && prevW > 0) {
    // restore the screenshot but scaled to new size
    const temp = document.createElement('canvas');
    temp.width = prevW;
    temp.height = prevH;
    const tempCtx = temp.getContext('2d');
    if (tempCtx) {
      tempCtx.putImageData(snapshot, 0, 0);
      ctx.drawImage(temp, 0, 0, w, h);
    }
  } else {
    // no previous content, just fill black
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
  }
  client.mapRenderer.resizeCanvas(w, h);
  setGameSize(w, h);
  if (client.state === GameState.InGame && viewportWidth < 940) {
    mobileControls.show();
  } else {
    mobileControls.hide();
  }
}

resizeCanvases();
window.addEventListener('resize', resizeCanvases);

let lastTime: DOMHighResTimeStamp | undefined;
const render = (now: DOMHighResTimeStamp) => {
  if (!lastTime) {
    lastTime = now;
  }

  const ellapsed = now - lastTime;
  if (ellapsed < GAME_FPS) {
    requestAnimationFrame(render);
    return;
  }

  lastTime = now;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  client.render(ctx);
  requestAnimationFrame(render);
};

client.on('error', ({ title, message }) => {
  smallAlertLargeHeader.setContent(message, title || 'Error');
  smallAlertLargeHeader.show();
});

client.on('smallAlert', ({ title, message }) => {
  smallAlert.setContent(message, title);
  smallAlert.show();
});

client.on('debug', (_message) => {});

client.on('accountCreated', () => {
  const text = client.getDialogStrings(
    DialogResourceID.ACCOUNT_CREATE_SUCCESS_WELCOME,
  );
  smallAlertLargeHeader.setContent(text[1], text[0]);
  smallAlertLargeHeader.show();
  createAccountForm.hide();
  mainMenu.show();
});

client.on('login', (characters) => {
  playSfxById(SfxId.Login);
  loginForm.hide();
  characterSelect.setCharacters(characters);
  mainMenu.hide();
  characterSelect.show();
});

client.on('serverChat', ({ message, sfxId, icon }) => {
  client.emit('chat', {
    tab: ChatTab.Local,
    message: `${client.getResourceString(EOResourceID.STRING_SERVER)} ${message}`,
    icon: icon || ChatIcon.Exclamation,
  });
  playSfxById(sfxId || SfxId.ServerMessage);
});

client.on('characterCreated', (characters) => {
  createCharacterForm.hide();
  const text = client.getDialogStrings(
    DialogResourceID.CHARACTER_CREATE_SUCCESS,
  );
  smallAlertLargeHeader.setContent(text[1], text[0]);
  smallAlertLargeHeader.show();
  characterSelect.setCharacters(characters);
});

client.on('selectCharacter', () => {});

client.on('chat', ({ icon, tab, message }) => {
  chat.addMessage(tab, message, icon || ChatIcon.None);
});

client.on('enterGame', ({ news }) => {
  mainMenu.hide();
  chat.clear();
  for (const line of news) {
    if (line) {
      chat.addMessage(ChatTab.Local, line, ChatIcon.None);
    }
  }

  characterSelect.hide();
  exitGame.show();
  chat.show();
  hud.setStats(client);
  hud.show();
  //offsetTweaker.show();
  inGameMenu.show();
  resizeCanvases();
  inventory.loadPositions();
  inventory.show();
});

client.on('passwordChanged', () => {
  changePasswordForm.hide();
  const text = client.getDialogStrings(
    DialogResourceID.CHANGE_PASSWORD_SUCCESS,
  );
  smallAlertLargeHeader.setContent(text[1], text[0]);
  smallAlertLargeHeader.show();
});

client.on('statsUpdate', () => {
  hud.setStats(client);
});

client.on('reconnect', () => {
  initializeSocket('login');
});

client.on('openQuestDialog', (data) => {
  client.typing = true;
  questDialog.setData(data.questId, data.name, data.quests, data.dialog);
  questDialog.show();
});

client.on('openPaperdoll', ({ icon, equipment, details }) => {
  paperdoll.setData(icon, details, equipment);
  paperdoll.show();
});

client.on('chestOpened', ({ items }) => {
  chestDialog.setItems(items);
  chestDialog.show();
});

client.on('chestChanged', ({ items }) => {
  chestDialog.setItems(items);
});

client.on('shopOpened', (data) => {
  shopDialog.setData(data.name, data.craftItems, data.tradeItems);
  shopDialog.show();
});

client.on('bankOpened', () => {
  bankDialog.show();
});

client.on('lockerOpened', ({ items }) => {
  lockerDialog.setItems(items);
  lockerDialog.show();
});

client.on('lockerChanged', ({ items }) => {
  lockerDialog.setItems(items);
});

const initializeSocket = (next: 'login' | 'create' | '' = '') => {
  const socket = new WebSocket(client.config.host);
  socket.addEventListener('open', () => {
    if (next === 'create') {
      mainMenu.hide();
      createAccountForm.show();
    } else if (next === 'login') {
      if (!client.loginToken) {
        mainMenu.hide();
        loginForm.show();
      }
    }

    const bus = new PacketBus(socket);
    bus.on('receive', (_data) => {
      /*
      packetLogModal.addEntry({
        source: PacketSource.Server,
        ...data,
      });
      */
    });
    bus.on('send', (_data) => {
      /*
      packetLogModal.addEntry({
        source: PacketSource.Client,
        ...data,
      });
      */
    });

    client.setBus(bus);
    client.challenge = randomRange(1, MAX_CHALLENGE);

    const init = new InitInitClientPacket();
    init.challenge = client.challenge;
    init.hdid = '111111111';
    init.version = client.version;
    client.bus.send(init);
  });

  socket.addEventListener('close', () => {
    hideAllUi();
    mainMenu.show();
    if (client.state !== GameState.Initial) {
      client.state = GameState.Initial;
      const text = client.getDialogStrings(
        DialogResourceID.CONNECTION_LOST_CONNECTION,
      );
      smallAlertLargeHeader.setContent(text[1], text[0]);
      smallAlertLargeHeader.show();
    }
    client.bus = null;
  });

  socket.addEventListener('error', (e) => {
    console.error('Websocket Error', e);
  });
};

const mainMenu = new MainMenu();
const loginForm = new LoginForm();
const createAccountForm = new CreateAccountForm(client);
const characterSelect = new CharacterSelect(client);
const createCharacterForm = new CreateCharacterForm();
const changePasswordForm = new ChangePasswordForm(client);
const smallAlertLargeHeader = new SmallAlertLargeHeader();
const exitGame = new ExitGame();
const smallConfirm = new SmallConfirm();
const chat = new Chat();
// biome-ignore lint/correctness/noUnusedVariables: Only used sometimes
const offsetTweaker = new OffsetTweaker();
const inGameMenu = new InGameMenu();
const inventory = new Inventory(client);
const paperdoll = new Paperdoll(client);
const hud = new HUD();
const itemAmountDialog = new ItemAmountDialog();
const questDialog = new QuestDialog(client);
const chestDialog = new ChestDialog(client);
const shopDialog = new ShopDialog(client);
const bankDialog = new BankDialog(client);
const lockerDialog = new LockerDialog(client);
const smallAlert = new SmallAlertSmallHeader();
const largeAlertSmallHeader = new LargeAlertSmallHeader();
const largeConfirmSmallHeader = new LargeConfirmSmallHeader();

const hideAllUi = () => {
  const uiElements = document.querySelectorAll('#ui>div');
  for (const el of uiElements) {
    el.classList.add('hidden');
  }

  const dialogs = document.querySelectorAll('#dialogs>div');
  for (const el of dialogs) {
    el.classList.add('hidden');
  }
};

exitGame.on('click', () => {
  const text = client.getDialogStrings(DialogResourceID.EXIT_GAME_ARE_YOU_SURE);
  smallConfirm.setContent(text[1], text[0]);
  smallConfirm.setCallback(() => {
    client.disconnect();
    hideAllUi();
    mainMenu.show();
  });
  smallConfirm.show();
});

mainMenu.on('play-game', () => {
  if (client.state === GameState.Initial) {
    initializeSocket('login');
  } else {
    mainMenu.hide();
    loginForm.show();
  }
});

mainMenu.on('create-account', () => {
  if (client.state === GameState.Initial) {
    initializeSocket('create');
  } else {
    mainMenu.hide();
    createAccountForm.show();
  }
});

mainMenu.on('view-credits', () => {
  window.open(client.config.creditsUrl, '_blank');
});

mainMenu.on('host-change', (host) => {
  client.config.host = host;
  client.disconnect();
});

createAccountForm.on('cancel', () => {
  createAccountForm.hide();
  mainMenu.show();
});

createAccountForm.on('error', ({ title, message }) => {
  smallAlertLargeHeader.setContent(message, title);
  smallAlertLargeHeader.show();
});

createAccountForm.on('create', (data) => {
  client.requestAccountCreation(data);
});

loginForm.on('login', ({ username, password, rememberMe }) => {
  client.login(username, password, rememberMe);
});

loginForm.on('cancel', () => {
  loginForm.hide();
  mainMenu.show();
});

characterSelect.on('cancel', () => {
  client.disconnect();
  characterSelect.hide();
  mainMenu.show();
});

characterSelect.on('changePassword', () => {
  changePasswordForm.show();
});

characterSelect.on('selectCharacter', (id) => {
  client.selectCharacter(id);
});

characterSelect.on('error', ({ title, message }) => {
  smallAlertLargeHeader.setContent(message, title);
  smallAlertLargeHeader.show();
});

characterSelect.on('create', () => {
  createCharacterForm.show();
});

createCharacterForm.on('create', (data) => {
  client.requestCharacterCreation(data);
});

changePasswordForm.on('error', ({ title, message }) => {
  smallAlertLargeHeader.setContent(message, title);
  smallAlertLargeHeader.show();
});

changePasswordForm.on(
  'changePassword',
  ({ username, oldPassword, newPassword }) => {
    client.changePassword(username, oldPassword, newPassword);
  },
);

chat.on('chat', (message) => {
  client.chat(message);
});

chat.on('focus', () => {
  client.typing = true;
});

chat.on('blur', () => {
  client.typing = false;
});

inGameMenu.on('toggle-inventory', () => {
  inventory.toggle();
});

inventory.on('dropItem', ({ at, itemId }) => {
  const item = client.items.find((i) => i.id === itemId);
  if (!item) {
    return;
  }

  if (at === 'cursor' && !client.cursorInDropRange()) {
    client.setStatusLabel(
      EOResourceID.STATUS_LABEL_TYPE_WARNING,
      client.getResourceString(
        EOResourceID.STATUS_LABEL_ITEM_DROP_OUT_OF_RANGE,
      ),
    );
    chat.addMessage(
      ChatTab.System,
      client.getResourceString(
        EOResourceID.STATUS_LABEL_ITEM_DROP_OUT_OF_RANGE,
      ),
      ChatIcon.DotDotDotDot,
    );
    return;
  }

  // Prevent dropping same item on stack
  const playerAt = client.getPlayerCoords();
  const coords = at === 'cursor' ? client.mouseCoords : playerAt;
  if (
    client.nearby.items.some(
      (i) =>
        i.coords.x === coords.x && i.coords.y === coords.y && i.id === itemId,
    )
  ) {
    return;
  }

  const record = client.getEifRecordById(itemId);
  if (!record) {
    return;
  }

  if (record.special === ItemSpecial.Lore) {
    // TODO: alert
    return;
  }

  if (item.amount > 1) {
    client.typing = true;
    itemAmountDialog.setMaxAmount(item.amount);
    itemAmountDialog.setHeader('drop');
    itemAmountDialog.setLabel(
      `${client.getResourceString(EOResourceID.DIALOG_TRANSFER_HOW_MUCH)} ${record.name} ${client.getResourceString(EOResourceID.DIALOG_TRANSFER_DROP)}`,
    );
    itemAmountDialog.setCallback(
      (amount) => {
        client.dropItem(itemId, amount, coords);
        client.typing = false;
      },
      () => {
        client.typing = false;
      },
    );
    itemAmountDialog.show();
  } else {
    client.dropItem(itemId, 1, coords);
  }
});

inventory.on('junkItem', (itemId) => {
  const item = client.items.find((i) => i.id === itemId);
  if (!item) {
    return;
  }

  const record = client.getEifRecordById(itemId);
  if (!record) {
    return;
  }

  if (item.amount > 1) {
    client.typing = true;
    itemAmountDialog.setMaxAmount(item.amount);
    itemAmountDialog.setHeader('junk');
    itemAmountDialog.setLabel(
      `${client.getResourceString(EOResourceID.DIALOG_TRANSFER_HOW_MUCH)} ${record.name} ${client.getResourceString(EOResourceID.DIALOG_TRANSFER_JUNK)}`,
    );
    itemAmountDialog.setCallback(
      (amount) => {
        client.junkItem(itemId, amount);
        client.typing = false;
      },
      () => {
        client.typing = false;
      },
    );
    itemAmountDialog.show();
  } else {
    client.junkItem(itemId, 1);
  }
});

inventory.on('addChestItem', (itemId) => {
  const item = client.items.find((i) => i.id === itemId);
  if (!item) {
    return;
  }

  const record = client.getEifRecordById(itemId);
  if (!record) {
    return;
  }

  if (item.amount > 1) {
    client.typing = true;
    itemAmountDialog.setMaxAmount(item.amount);
    itemAmountDialog.setHeader('drop');
    itemAmountDialog.setLabel(
      `${client.getResourceString(EOResourceID.DIALOG_TRANSFER_HOW_MUCH)} ${record.name} ${client.getResourceString(EOResourceID.DIALOG_TRANSFER_DROP)}`,
    );
    itemAmountDialog.setCallback(
      (amount) => {
        client.addChestItem(itemId, amount);
        client.typing = false;
      },
      () => {
        client.typing = false;
      },
    );
    itemAmountDialog.show();
  } else {
    client.addChestItem(itemId, 1);
  }
});

inventory.on('useItem', (itemId) => {
  client.useItem(itemId);
});

inventory.on('openPaperdoll', () => {
  client.requestPaperdoll(client.playerId);
});

inventory.on('equipItem', ({ slot, itemId }) => {
  client.equipItem(slot, itemId);
});

questDialog.on('reply', ({ questId, dialogId, action }) => {
  client.questReply(questId, dialogId, action);
  client.typing = false;
});

questDialog.on('cancel', () => {
  client.typing = false;
});

shopDialog.on('buyItem', (item) => {
  const goldAmount = client.items.find((i) => i.id === 1).amount;
  if (item.price > goldAmount) {
    const text = client.getDialogStrings(
      DialogResourceID.WARNING_YOU_HAVE_NOT_ENOUGH,
    );
    smallAlert.setContent(text[1], text[0]);
    smallAlert.show();
    return;
  }

  itemAmountDialog.setHeader('shop');
  itemAmountDialog.setMaxAmount(item.max);
  itemAmountDialog.setLabel(
    `${client.getResourceString(EOResourceID.DIALOG_TRANSFER_HOW_MUCH)} ${item.name} ${client.getResourceString(EOResourceID.DIALOG_TRANSFER_BUY)}`,
  );
  itemAmountDialog.setCallback((amount) => {
    const total = amount * item.price;
    const goldAmount = client.items.find((i) => i.id === 1).amount;
    itemAmountDialog.hide();
    if (total > goldAmount) {
      const text = client.getDialogStrings(
        DialogResourceID.WARNING_YOU_HAVE_NOT_ENOUGH,
      );
      smallAlert.setContent(text[1], text[0]);
      smallAlert.show();
    } else {
      const wordBuy = client.getResourceString(EOResourceID.DIALOG_WORD_BUY);
      const wordFor = client.getResourceString(EOResourceID.DIALOG_WORD_FOR);
      const goldRecord = client.getEifRecordById(1);
      smallConfirm.setContent(
        `${wordBuy} ${amount} ${item.name} ${wordFor} ${total} ${goldRecord.name} ?`,
        client.getResourceString(EOResourceID.DIALOG_SHOP_BUY_ITEMS),
      );
      smallConfirm.setCallback(() => {
        client.buyShopItem(item.id, amount);
      });
      smallConfirm.show();
    }
  });
  itemAmountDialog.show();
});

shopDialog.on('sellItem', (item) => {
  const itemAmount = client.items.find((i) => i.id === item.id).amount;
  const showConfirm = (amount: number, total: number) => {
    const wordSell = client.getResourceString(EOResourceID.DIALOG_WORD_SELL);
    const wordFor = client.getResourceString(EOResourceID.DIALOG_WORD_FOR);
    const goldRecord = client.getEifRecordById(1);
    smallConfirm.setContent(
      `${wordSell} ${amount} ${item.name} ${wordFor} ${total} ${goldRecord.name} ?`,
      client.getResourceString(EOResourceID.DIALOG_SHOP_SELL_ITEMS),
    );
    smallConfirm.setCallback(() => {
      client.sellShopItem(item.id, amount);
    });
    smallConfirm.show();
  };

  if (itemAmount === 1) {
    showConfirm(1, item.price);
    return;
  }

  itemAmountDialog.setHeader('shop');
  itemAmountDialog.setMaxAmount(itemAmount);
  itemAmountDialog.setLabel(
    `${client.getResourceString(EOResourceID.DIALOG_TRANSFER_HOW_MUCH)} ${item.name} ${client.getResourceString(EOResourceID.DIALOG_TRANSFER_SELL)}`,
  );
  itemAmountDialog.setCallback((amount) => {
    const total = amount * item.price;
    itemAmountDialog.hide();
    showConfirm(amount, total);
  });
  itemAmountDialog.show();
});

shopDialog.on('craftItem', (item) => {
  const missing = item.ingredients.some((ingredient) => {
    if (!ingredient.amount) {
      return false;
    }

    const item = client.items.find((i) => i.id === ingredient.id);
    return !item || item.amount < ingredient.amount;
  });

  const lines = item.ingredients
    .map((ingredient) => {
      if (!ingredient.id) {
        return '';
      }

      const record = client.getEifRecordById(ingredient.id);
      if (!record) {
        return '';
      }

      return `+ ${ingredient.amount} ${record.name}`;
    })
    .filter((l) => !!l);

  if (missing) {
    largeAlertSmallHeader.setContent(
      `${client.getResourceString(EOResourceID.DIALOG_SHOP_CRAFT_MISSING_INGREDIENTS)}\n\n${lines.join('\n')}`,
      `${client.getResourceString(EOResourceID.DIALOG_SHOP_CRAFT_INGREDIENTS)} ${item.name}`,
    );
    largeAlertSmallHeader.show();
    return;
  }

  largeConfirmSmallHeader.setContent(
    `${client.getResourceString(EOResourceID.DIALOG_SHOP_CRAFT_PUT_INGREDIENTS_TOGETHER)}\n\n${lines.join('\n')}`,
    `${client.getResourceString(EOResourceID.DIALOG_SHOP_CRAFT_INGREDIENTS)} ${item.name}`,
  );
  largeConfirmSmallHeader.setCallback(() => {
    client.craftShopItem(item.id);
    largeConfirmSmallHeader.hide();
  });
  largeConfirmSmallHeader.show();
});

bankDialog.on('deposit', () => {
  const gold = client.items.find((i) => i.id === 1);
  if (!gold || gold.amount <= 0) {
    const strings = client.getDialogStrings(
      DialogResourceID.BANK_ACCOUNT_UNABLE_TO_DEPOSIT,
    );
    if (!strings) {
      throw new Error('Failed to fetch dialog strings');
    }

    smallAlert.setContent(strings[1], strings[0]);
    smallAlert.show();

    return;
  }

  if (gold.amount > 1) {
    const record = client.getEifRecordById(1);
    if (!record) {
      throw new Error('Failed to fetch gold record');
    }

    // Use transfer dialog to get qty
    itemAmountDialog.setHeader('bank');
    itemAmountDialog.setMaxAmount(gold.amount);
    itemAmountDialog.setLabel(
      `${client.getResourceString(EOResourceID.DIALOG_TRANSFER_HOW_MUCH)} ${record.name} ${client.getResourceString(EOResourceID.DIALOG_TRANSFER_DEPOSIT)}`,
    );
    itemAmountDialog.setCallback((amount) => {
      client.depositGold(amount);
      itemAmountDialog.hide();
    });
    itemAmountDialog.show();

    return;
  }

  client.depositGold(1);
});

bankDialog.on('withdraw', () => {
  if (client.goldBank <= 0) {
    const strings = client.getDialogStrings(
      DialogResourceID.BANK_ACCOUNT_UNABLE_TO_WITHDRAW,
    );
    if (!strings) {
      throw new Error('Failed to fetch dialog strings');
    }

    smallAlert.setContent(strings[1], strings[0]);
    smallAlert.show();

    return;
  }

  if (client.goldBank > 1) {
    const record = client.getEifRecordById(1);
    if (!record) {
      throw new Error('Failed to fetch gold record');
    }

    // Use transfer dialog to get qty
    itemAmountDialog.setHeader('bank');
    itemAmountDialog.setMaxAmount(client.goldBank);
    itemAmountDialog.setLabel(
      `${client.getResourceString(EOResourceID.DIALOG_TRANSFER_HOW_MUCH)} ${record.name} ${client.getResourceString(EOResourceID.DIALOG_TRANSFER_WITHDRAW)}`,
    );
    itemAmountDialog.setCallback((amount) => {
      client.withdrawGold(amount);
      itemAmountDialog.hide();
    });
    itemAmountDialog.show();

    return;
  }

  client.withdrawGold(1);
});

bankDialog.on('upgrade', () => {
  if (client.lockerUpgrades >= MAX_LOCKER_UPGRADES) {
    const strings = client.getDialogStrings(
      DialogResourceID.LOCKER_UPGRADE_IMPOSSIBLE,
    );
    smallAlert.setContent(strings[1], strings[0]);
    smallAlert.show();
    return;
  }

  const requiredGold =
    LOCKER_UPGRADE_BASE_COST + LOCKER_UPGRADE_COST_STEP * client.lockerUpgrades;
  const gold = client.items.find((i) => i.id === 1)?.amount || 0;

  const record = client.getEifRecordById(1);
  if (!record) {
    throw new Error('Failed to fetch gold record');
  }

  if (gold < requiredGold) {
    const strings = client.getDialogStrings(
      DialogResourceID.WARNING_YOU_HAVE_NOT_ENOUGH,
    );
    smallAlert.setContent(`${strings[1]} ${record.name}`, strings[0]);
    smallAlert.show();
    return;
  }

  const strings = client.getDialogStrings(DialogResourceID.LOCKER_UPGRADE_UNIT);
  smallConfirm.setContent(
    `${strings[1]} ${requiredGold} ${record.name}`,
    strings[0],
  );
  smallConfirm.setCallback(() => {
    client.upgradeLocker();
  });
  smallConfirm.show();
});

// Tick loop
setInterval(() => {
  client.tick();
}, 120);

window.addEventListener('keyup', (e) => {
  if (client.state === GameState.InGame && e.key === 'Enter') {
    chat.focus();
  }

  if (
    client.state === GameState.LoggedIn &&
    !changePasswordForm.isOpen() &&
    !createCharacterForm.isOpen() &&
    ['1', '2', '3'].includes(e.key)
  ) {
    characterSelect.selectCharacter(Number.parseInt(e.key, 10));
  }
});

window.addEventListener(
  'touchmove',
  (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    client.setMousePosition({
      x: Math.min(
        Math.max(Math.floor((e.touches[0].clientX - rect.left) * scaleX), 0),
        canvas.width,
      ),
      y: Math.min(
        Math.max(Math.floor((e.touches[0].clientY - rect.top) * scaleY), 0),
        canvas.height,
      ),
    });
    e.preventDefault();
  },
  { passive: false },
);

window.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  client.setMousePosition({
    x: Math.min(
      Math.max(Math.floor((e.clientX - rect.left) * scaleX), 0),
      canvas.width,
    ),
    y: Math.min(
      Math.max(Math.floor((e.clientY - rect.top) * scaleY), 0),
      canvas.height,
    ),
  });
});

window.addEventListener('click', (_e) => {
  client.handleClick();
});

function loadInventoryGrid() {
  const img = new Image();
  img.src = '/gfx/gfx002/144.png';
  img.onload = () => {
    const canvas: HTMLCanvasElement = document.createElement('canvas');
    canvas.width = 23;
    canvas.height = 23;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 23, 23);
    ctx.drawImage(img, 12, 10, 23, 23, 0, 0, 23, 23);

    const dataUrl = canvas.toDataURL();
    const grid = document.querySelector<HTMLDivElement>('#inventory .grid');
    grid.style.background = `url(${dataUrl})`;
  };
}

window.addEventListener('DOMContentLoaded', async () => {
  const response = await fetch('/maps/00005.emf');
  const map = await response.arrayBuffer();
  const reader = new EoReader(new Uint8Array(map));
  const emf = Emf.deserialize(reader);
  client.setMap(emf);

  client.playerId = 1;
  const character = new CharacterMapInfo();
  character.playerId = 1;
  character.coords = new BigCoords();
  character.coords.x = 35;
  character.coords.y = 38;
  character.gender = Gender.Male;
  character.sitState = SitState.Floor;
  character.skin = 0;
  client.nearby.characters = [character];

  loadInventoryGrid();
  requestAnimationFrame(render);
});
