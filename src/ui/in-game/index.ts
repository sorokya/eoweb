// Utilities (must come before components that import from this barrel)

// Chat
export { ChatDialog } from './chat/chat-dialog';
export type {
  ChatDialogConfig,
  ChatMessage,
  ChatTabConfig,
} from './chat/chat-manager';
export { ChatManagerProvider, useChatManager } from './chat/chat-manager';
// Dialog components
export { DialogBase } from './dialogs/dialog-base';
export { InventoryDialog } from './dialogs/inventory-dialog';
export { MapDialog } from './dialogs/map-dialog';
export { QuestsDialog } from './dialogs/quests-dialog';
export { SettingsDialog } from './dialogs/settings-dialog';
export { SpellsDialog } from './dialogs/spells-dialog';
export { StatsDialog } from './dialogs/stats-dialog';
// HUD components
export { HotBar } from './hud/hot-bar';
export { MobileNav, NavSidebar } from './hud/nav-sidebar';
export { PlayerHud } from './hud/player-hud';
export { StatusMessages } from './hud/status-messages';
export {
  clearAllDialogLayouts,
  DIALOG_DEFAULT_LAYOUTS,
  DIALOG_LAYOUT_LABELS,
  type DialogLayout,
  getDialogLayoutById,
  useDialogLayout,
} from './use-dialog-layout';
export { useDrag } from './use-drag';
export type { HudVisibility } from './use-hud-visibility';
export {
  clearAllVisibilityOverrides,
  useHudVisibility,
} from './use-hud-visibility';
export type { Position } from './use-position';
export { clearAllPositions, RESET_EVENT, usePosition } from './use-position';
export { useViewport } from './use-viewport';
export type { ChatDialogId, DialogId } from './window-manager';
export {
  useWindowManager,
  WindowManagerProvider,
} from './window-manager';
