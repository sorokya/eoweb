import { AdminLevel } from 'eolib';
import type { Client } from '@/client';
import { playSfxById, SfxId } from '@/sfx';
import type { DialogId } from '@/ui/in-game';

export type CommandContext = {
  client: Client;
  isDialogOpen: (id: DialogId) => boolean;
  toggleDialog: (id: DialogId) => void;
  close: () => void;
};

export type Command = {
  id: string;
  label: string;
  /** Extra terms to boost search matches. */
  keywords?: string[];
  /** Badge label displayed next to the command (e.g. 'Admin'). */
  badge?: string;
  /** Return false to hide this command for the current player. */
  condition?: (client: Client) => boolean;
  action: (ctx: CommandContext) => void;
};

function toggleDialogAction(id: DialogId): Command['action'] {
  return ({ client, toggleDialog, isDialogOpen, close }) => {
    playSfxById(SfxId.ButtonClick);
    close();

    if (id === 'character' && !isDialogOpen(id)) {
      client.socialController.requestPaperdoll(client.playerId);
      return;
    }

    toggleDialog(id);
  };
}

export const ALL_COMMANDS: Command[] = [
  {
    id: 'toggle-packet-log',
    label: 'Toggle Packet Log',
    keywords: ['debug', 'packets', 'network', 'hex'],
    action: toggleDialogAction('packet-log'),
  },
  {
    id: 'toggle-inventory',
    label: 'Toggle Inventory',
    keywords: ['bag', 'items'],
    action: toggleDialogAction('inventory'),
  },
  {
    id: 'toggle-character',
    label: 'Toggle Character',
    keywords: ['paperdoll', 'stats', 'equipment'],
    action: toggleDialogAction('character'),
  },
  {
    id: 'toggle-settings',
    label: 'Toggle Settings',
    keywords: ['options', 'preferences'],
    action: toggleDialogAction('settings'),
  },
  {
    id: 'toggle-chat-log',
    label: 'Toggle Chat Log',
    keywords: ['history', 'log'],
    action: toggleDialogAction('chat-log'),
  },
  {
    id: 'toggle-ping-dialog',
    label: 'Toggle Ping Log',
    keywords: ['ping', 'latency', 'lag'],
    action: toggleDialogAction('ping'),
  },
  {
    id: 'refresh',
    label: 'Refresh',
    keywords: ['reload', 'resync'],
    action: ({ client, close }) => {
      close();
      client.refresh();
    },
  },
  {
    id: 'toggle-minimap',
    label: 'Toggle Minimap',
    keywords: ['map', 'radar'],
    action: ({ client, close }) => {
      close();
      client.toggleMinimap();
    },
  },
  {
    id: 'toggle-nowall',
    label: 'Toggle #nowall',
    keywords: ['noclip', 'wall', 'admin'],
    badge: 'Admin',
    condition: (client) => client.admin !== AdminLevel.Player,
    action: ({ client, close }) => {
      close();
      client.commandController.handleCommand('#nowall');
    },
  },
  {
    id: 'exit-game',
    label: 'Exit Game',
    keywords: ['logout', 'disconnect', 'quit'],
    action: ({ client, close }) => {
      close();
      client.disconnect();
    },
  },
];

// --- Recently used persistence ---

const RECENT_KEY = 'eoweb:command-palette:recent';
const MAX_RECENT = 2;

export function getRecentCommandIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function recordRecentCommand(id: string): void {
  const current = getRecentCommandIds().filter((r) => r !== id);
  const next = [id, ...current].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
