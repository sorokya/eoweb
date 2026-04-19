// Utilities (must come before components that import from this barrel)

// Chat
export { ChatDialog } from './chat/chat-dialog';
export type {
  ChatDialogConfig,
  ChatMessage,
  ChatTabConfig,
} from './chat/chat-manager';
export { ChatManagerProvider, useChatManager } from './chat/chat-manager';
// Command palette
export { CommandPalette } from './command-palette/command-palette';
// Dialog arena (JS-based layout engine)
export { DialogArena } from './dialog-arena';
// Dialog components
export { CharacterDialog } from './dialogs/character-dialog';
export { ChatLogDialog } from './dialogs/chat-log-dialog';
export { ChestDialog } from './dialogs/chest-dialog';
export { DialogBase } from './dialogs/dialog-base';
export { InventoryDialog } from './dialogs/inventory-dialog';
export { JukeboxDialog } from './dialogs/jukebox-dialog';
export { LockerDialog } from './dialogs/locker-dialog';
export { QuestsDialog } from './dialogs/quests-dialog';
export { SettingsDialog } from './dialogs/settings-dialog';
export { SocialDialog } from './dialogs/social-dialog';
export { SpellsDialog } from './dialogs/spells-dialog';
// HUD components
export { HotBar } from './hud/hot-bar';
export { HotbarProvider, useHotbar } from './hud/hotbar-context';
export { MobileNav, NavSidebar } from './hud/nav-sidebar';
export { PlayerHud } from './hud/player-hud';
export { StatusMessages } from './hud/status-messages';
export { TouchActionButtons } from './hud/touch-action-buttons';
export { TouchJoystick } from './hud/touch-joystick';
export type { DragDropResult, DragInfo } from './item-drag-context';
// Drag
export { ItemDragProvider, useItemDrag } from './item-drag-context';
export { useConfigSetting } from './use-config-setting';
export {
  clearAllDialogLayouts,
  type DialogLayout,
  getDialogLayoutById,
} from './use-dialog-layout';
export { useDrag } from './use-drag';
export type { HudVisibility } from './use-hud-visibility';
export {
  clearAllVisibilityOverrides,
  useHudVisibility,
} from './use-hud-visibility';
export { useItemGfxUrl, usePillowGfxUrl } from './use-item-gfx';
export type { PlayerStats } from './use-player-stats';
export { usePlayerStats } from './use-player-stats';
export type { Position } from './use-position';
export { clearAllPositions, RESET_EVENT, usePosition } from './use-position';
export { useRepositionMode } from './use-reposition-mode';
export { applyUiScale, UI_SCALE_OPTIONS, useUiScale } from './use-ui-scale';
export { useViewport } from './use-viewport';
export type { DialogId } from './window-manager';
export {
  useWindowManager,
  WindowManagerProvider,
} from './window-manager';
