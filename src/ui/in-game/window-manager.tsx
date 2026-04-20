import { createContext } from 'preact';
import { useCallback, useContext, useEffect, useState } from 'preact/hooks';
import { playSfxById, SfxId } from '@/sfx';
import { useClient } from '@/ui/context';
import {
  clearAllDialogLayouts,
  type DialogLayout,
  getDialogLayoutById,
} from './use-dialog-layout';
import { RESET_EVENT } from './use-position';

const BASE_Z_INDEX = 20;

export type DialogId =
  | 'bank'
  | 'shop'
  | 'inventory'
  | 'spells'
  | 'character'
  | 'quests'
  | 'questNpc'
  | 'jukebox'
  | 'settings'
  | 'chat-log'
  | 'social'
  | 'chest'
  | 'locker'
  | 'skillMaster'
  | 'innKeeper'
  | 'board';

type DialogMeta = {
  /** Saved layout preference (persisted to localStorage). */
  layout: DialogLayout;
  /** Absolute position — only set when layout === 'manual'. Ephemeral (cleared on close). */
  manualPos?: { x: number; y: number };
  minimized: boolean;
};

type WindowManagerState = {
  /** Ordered list of open dialog ids, back-to-front (last = topmost). */
  stack: DialogId[];
  meta: Partial<Record<DialogId, DialogMeta>>;
};

type WindowManagerContextValue = {
  stack: readonly DialogId[];
  toggleDialog: (id: DialogId) => void;
  openDialog: (id: DialogId) => void;
  closeDialog: (id: DialogId) => void;
  bringToFront: (id: DialogId) => void;
  isOpen: (id: DialogId) => boolean;
  isFocused: (id: DialogId) => boolean;
  zIndexOf: (id: DialogId) => number;
  /** Change the layout preference. If switching away from 'manual', clears manualPos. */
  setLayout: (id: DialogId, layout: DialogLayout) => void;
  /** Get the current layout for a dialog (reactive). */
  getLayout: (id: DialogId) => DialogLayout;
  /** Set the manual drag position. Call this only when layout === 'manual'. */
  setManualPos: (id: DialogId, x: number, y: number) => void;
  getManualPos: (id: DialogId) => { x: number; y: number } | undefined;
  setMinimized: (id: DialogId, minimized: boolean) => void;
  isMinimized: (id: DialogId) => boolean;
};

const WindowManagerContext = createContext<WindowManagerContextValue | null>(
  null,
);

export function WindowManagerProvider({
  children,
}: {
  children: preact.ComponentChildren;
}) {
  const client = useClient();
  const [state, setState] = useState<WindowManagerState>({
    stack: [],
    meta: {},
  });

  const openDialog = useCallback((id: DialogId) => {
    setState((prev) => {
      const existingMeta = prev.meta[id];
      const layout = existingMeta?.layout ?? getDialogLayoutById(id);
      if (prev.stack.includes(id)) {
        return { ...prev, stack: [...prev.stack.filter((d) => d !== id), id] };
      }
      return {
        stack: [...prev.stack, id],
        meta: {
          ...prev.meta,
          [id]: {
            minimized: false,
            manualPos: undefined,
            ...existingMeta,
            layout,
          },
        },
      };
    });
  }, []);

  const closeDialog = useCallback((id: DialogId) => {
    setState((prev) => {
      const meta = { ...prev.meta };
      delete meta[id];
      return { stack: prev.stack.filter((d) => d !== id), meta };
    });
  }, []);

  const toggleDialog = useCallback(
    (id: DialogId) => {
      if (state.stack.includes(id)) {
        closeDialog(id);
      } else {
        openDialog(id);
      }
    },
    [state.stack, closeDialog, openDialog],
  );

  const bringToFront = useCallback((id: DialogId) => {
    setState((prev) => {
      if (prev.stack[prev.stack.length - 1] === id) return prev;
      return { ...prev, stack: [...prev.stack.filter((d) => d !== id), id] };
    });
  }, []);

  const setLayout = useCallback((id: DialogId, layout: DialogLayout) => {
    try {
      localStorage.setItem(`eoweb:layout:dialog:${id}`, layout);
    } catch {
      /* ignore */
    }
    setState((prev) => ({
      ...prev,
      meta: {
        ...prev.meta,
        [id]: {
          minimized: prev.meta[id]?.minimized ?? false,
          ...prev.meta[id],
          layout,
          // Clear manualPos when switching away from manual
          manualPos: layout === 'manual' ? prev.meta[id]?.manualPos : undefined,
        },
      },
    }));
  }, []);

  const getLayout = useCallback(
    (id: DialogId): DialogLayout =>
      state.meta[id]?.layout ?? getDialogLayoutById(id),
    [state.meta],
  );

  const setManualPos = useCallback((id: DialogId, x: number, y: number) => {
    setState((prev) => ({
      ...prev,
      meta: {
        ...prev.meta,
        [id]: {
          minimized: prev.meta[id]?.minimized ?? false,
          ...prev.meta[id],
          layout: 'manual' as const,
          manualPos: { x, y },
        },
      },
    }));
  }, []);

  const getManualPos = useCallback(
    (id: DialogId) => state.meta[id]?.manualPos,
    [state.meta],
  );

  const setMinimized = useCallback((id: DialogId, minimized: boolean) => {
    setState((prev) => ({
      ...prev,
      meta: {
        ...prev.meta,
        [id]: { layout: getDialogLayoutById(id), ...prev.meta[id], minimized },
      },
    }));
  }, []);

  const isOpen = useCallback(
    (id: DialogId) => state.stack.includes(id),
    [state.stack],
  );

  const isFocused = useCallback(
    (id: DialogId) => state.stack[state.stack.length - 1] === id,
    [state.stack],
  );

  const zIndexOf = useCallback(
    (id: DialogId) => {
      const idx = state.stack.indexOf(id);
      return idx === -1 ? BASE_Z_INDEX : BASE_Z_INDEX + idx;
    },
    [state.stack],
  );

  const isMinimized = useCallback(
    (id: DialogId) => state.meta[id]?.minimized ?? false,
    [state.meta],
  );

  // Reset all layouts + positions on the global reset event
  useEffect(() => {
    const onReset = () => {
      clearAllDialogLayouts();
      setState((prev) => ({
        ...prev,
        meta: Object.fromEntries(
          Object.keys(prev.meta).map((id) => [
            id,
            {
              minimized: false,
              manualPos: undefined,
              layout: getDialogLayoutById(id as DialogId),
            },
          ]),
        ) as Partial<Record<string, DialogMeta>>,
      }));
    };
    window.addEventListener(RESET_EVENT, onReset);
    return () => window.removeEventListener(RESET_EVENT, onReset);
  }, []);

  useEffect(() => {
    const onToggleDialog = ({ id }: { id: DialogId }) => {
      playSfxById(SfxId.ButtonClick);
      if (isOpen(id)) {
        closeDialog(id);
      } else {
        if (id === 'character') {
          client.socialController.requestPaperdoll(client.playerId);
        } else {
          openDialog(id);
        }
      }
    };
    client.on('toggleDialog', onToggleDialog);
    return () => {
      client.off('toggleDialog', onToggleDialog);
    };
  }, [client, state.stack, isOpen, openDialog, closeDialog]);

  return (
    <WindowManagerContext.Provider
      value={{
        stack: state.stack,
        openDialog,
        closeDialog,
        bringToFront,
        isOpen,
        toggleDialog,
        isFocused,
        zIndexOf,
        setLayout,
        getLayout,
        setManualPos,
        getManualPos,
        setMinimized,
        isMinimized,
      }}
    >
      {children}
    </WindowManagerContext.Provider>
  );
}

export function useWindowManager(): WindowManagerContextValue {
  const ctx = useContext(WindowManagerContext);
  if (!ctx) {
    throw new Error(
      'useWindowManager must be used within WindowManagerProvider',
    );
  }
  return ctx;
}
