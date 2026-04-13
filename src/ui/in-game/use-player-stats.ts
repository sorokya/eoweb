import type { CharacterBaseStats, CharacterSecondaryStats } from 'eolib';
import { useEffect, useState } from 'preact/hooks';
import { useClient } from '@/ui/context';

const GOLD_ITEM_ID = 1;

export type PlayerStats = {
  name: string;
  title: string;
  home: string;
  partner: string;
  level: number;
  hp: number;
  maxHp: number;
  tp: number;
  maxTp: number;
  experience: number;
  weight: number;
  maxWeight: number;
  gold: number;
  baseStats: CharacterBaseStats;
  secondaryStats: CharacterSecondaryStats;
};

function readStats(client: ReturnType<typeof useClient>): PlayerStats {
  return {
    name: client.name,
    title: client.title,
    home: client.home,
    partner: client.partner,
    level: client.level,
    hp: client.hp,
    maxHp: client.maxHp,
    tp: client.tp,
    maxTp: client.maxTp,
    experience: client.experience,
    weight: client.weight.current,
    maxWeight: client.weight.max,
    gold: client.items.find((i) => i.id === GOLD_ITEM_ID)?.amount ?? 0,
    baseStats: client.baseStats,
    secondaryStats: client.secondaryStats,
  };
}

export function usePlayerStats(): PlayerStats {
  const client = useClient();
  const [stats, setStats] = useState<PlayerStats>(() => readStats(client));

  useEffect(() => {
    const handler = () => setStats(readStats(client));
    client.on('statsUpdate', handler);
    client.on('inventoryChanged', handler);
    client.on('equipmentChanged', handler);
    return () => {
      client.off('statsUpdate', handler);
      client.off('inventoryChanged', handler);
      client.off('equipmentChanged', handler);
    };
  }, [client]);

  return stats;
}
