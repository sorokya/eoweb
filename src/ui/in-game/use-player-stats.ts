import type { CharacterBaseStats, CharacterSecondaryStats } from 'eolib';
import { useEffect, useState } from 'preact/hooks';
import { useClient } from '@/ui/context';

const _GOLD_ITEM_ID = 1;

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
    gold: client.inventoryController.goldAmount,
    baseStats: client.baseStats,
    secondaryStats: client.secondaryStats,
  };
}

export function usePlayerStats(): PlayerStats {
  const client = useClient();
  const [stats, setStats] = useState<PlayerStats>(() => readStats(client));

  useEffect(() => {
    const handler = () => setStats(readStats(client));
    client.statsController.subscribeStatsUpdated(handler);
    client.inventoryController.subscribeInventoryChanged(handler);
    client.inventoryController.subscribeEquipmentChanged(handler);
    return () => {
      client.statsController.unsubscribeStatsUpdated(handler);
      client.inventoryController.unsubscribeInventoryChanged(handler);
      client.inventoryController.unsubscribeEquipmentChanged(handler);
    };
  }, [client]);

  return stats;
}
