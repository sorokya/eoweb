import { createContext } from 'preact';
import { useCallback, useContext, useEffect, useState } from 'preact/hooks';
import { playSfxById, SfxId } from '@/sfx';
import { useClient } from '@/ui/context';
import { type ISlot, SlotType } from '@/ui/enums';

const STORAGE_KEY = 'eoweb:hotbar-slots';
const SLOT_COUNT = 6;

const EMPTY_SLOT: ISlot = { type: SlotType.Empty, typeId: 0 };

function loadSlots(): ISlot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ISlot[];
      if (Array.isArray(parsed)) {
        const slots = Array.from(
          { length: SLOT_COUNT },
          (_, i) => parsed[i] ?? EMPTY_SLOT,
        );
        return slots;
      }
    }
  } catch {
    // ignore
  }
  return Array.from({ length: SLOT_COUNT }, () => ({ ...EMPTY_SLOT }));
}

function saveSlots(slots: ISlot[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
  } catch {
    // ignore
  }
}

type HotbarContextValue = {
  slots: ISlot[];
  setSlot: (index: number, slot: ISlot) => void;
  clearSlot: (index: number) => void;
};

const HotbarContext = createContext<HotbarContextValue>({
  slots: Array.from({ length: SLOT_COUNT }, () => ({ ...EMPTY_SLOT })),
  setSlot: () => {},
  clearSlot: () => {},
});

export function useHotbar() {
  return useContext(HotbarContext);
}

export function HotbarProvider({
  children,
}: {
  children: preact.ComponentChildren;
}) {
  const client = useClient();
  const [slots, setSlots] = useState<ISlot[]>(loadSlots);

  // Sync slots → client.hotbarSlots whenever slots change
  useEffect(() => {
    client.hotbarSlots = [...slots];
  }, [client, slots]);

  const setSlot = useCallback((index: number, slot: ISlot) => {
    setSlots((prev) => {
      const next = [...prev];
      next[index] = slot;
      saveSlots(next);
      return next;
    });
  }, []);

  const clearSlot = useCallback((index: number) => {
    setSlots((prev) => {
      const next = [...prev];
      next[index] = { ...EMPTY_SLOT };
      saveSlots(next);
      return next;
    });
    playSfxById(SfxId.InventoryPlace);
  }, []);

  return (
    <HotbarContext.Provider value={{ slots, setSlot, clearSlot }}>
      {children}
    </HotbarContext.Provider>
  );
}
