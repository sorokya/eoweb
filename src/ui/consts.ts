/** z-index for HUD overlay elements (below chat and dialogs). */
export const HUD_Z = 10;
/** z-index for chat / hotbar zones (above HUD, below moveable game dialogs). */
export const CHAT_Z = 15;
/** z-index for the mobile side-menu popup (above game dialogs, below alert modals). */
export const SIDEMENU_Z = 35;
/** z-index for moveable game dialogs (above HUD and chat, below alert modals). */
export const DIALOG_Z = 20;
/** z-index for the hotbar while an item/spell drag is active (above all dialogs). */
export const DRAG_HOTBAR_Z = 50;

// ── Shared UI style tokens ────────────────────────────────────────────────────
// Use these constants instead of hardcoding opacity/color values in components.

/** Background for main dialog and chat panels. */
export const UI_PANEL_BG = 'bg-base-300/80';
/** Border for panels, item cards, and popups. */
export const UI_PANEL_BORDER = 'border-base-content/10';
/** Background for title bars and tab bars. */
export const UI_HEADER_BG = 'bg-base-content/5';
/** Background for sticky search/filter rows inside scrollable lists. */
export const UI_STICKY_BG = 'bg-base-300/90';
/** Background for DaisyUI modal-box overlays (alert, confirm, amount). */
export const UI_MODAL_BG = 'bg-base-100/80';
/** Background for item/spell card containers. */
export const UI_ITEM_BG = 'bg-base-200';
/** Background for HUD touch buttons and hotbar slots. */
export const UI_GHOST_BG = 'bg-base-200/40';
/** Canonical backdrop blur class — conditionally applied based on user setting. */
export const UI_BLUR = 'backdrop-blur-xs';
