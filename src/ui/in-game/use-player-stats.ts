import { useEffect, useState } from 'preact/hooks';
import { useClient } from '@/ui/context';

const GOLD_ITEM_ID = 1;

export type PlayerStats = {
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  tp: number;
  maxTp: number;
  experience: number;
  weight: number;
  maxWeight: number;
  gold: number;
};

function readStats(client: ReturnType<typeof useClient>): PlayerStats {
  return {
    name: client.name,
    level: client.level,
    hp: client.hp,
    maxHp: client.maxHp,
    tp: client.tp,
    maxTp: client.maxTp,
    experience: client.experience,
    weight: client.weight.current,
    maxWeight: client.weight.max,
    gold: client.items.find((i) => i.id === GOLD_ITEM_ID)?.amount ?? 0,
  };
}

export function usePlayerStats(): PlayerStats {
  const client = useClient();
  const [stats, setStats] = useState<PlayerStats>(() => readStats(client));

  useEffect(() => {
    const handler = () => setStats(readStats(client));
    client.on('statsUpdate', handler);
    client.on('inventoryChanged', handler);
    return () => {
      client.off('statsUpdate', handler);
      client.off('inventoryChanged', handler);
    };
  }, [client]);

  return stats;
}
