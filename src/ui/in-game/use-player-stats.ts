import { useEffect, useState } from 'preact/hooks';
import { useClient } from '@/ui/context';

export type PlayerStats = {
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  tp: number;
  maxTp: number;
  experience: number;
};

export function usePlayerStats(): PlayerStats {
  const client = useClient();
  const [stats, setStats] = useState<PlayerStats>({
    name: client.name,
    level: client.level,
    hp: client.hp,
    maxHp: client.maxHp,
    tp: client.tp,
    maxTp: client.maxTp,
    experience: client.experience,
  });

  useEffect(() => {
    const handler = () => {
      setStats({
        name: client.name,
        level: client.level,
        hp: client.hp,
        maxHp: client.maxHp,
        tp: client.tp,
        maxTp: client.maxTp,
        experience: client.experience,
      });
    };
    client.on('statsUpdate', handler);
    return () => client.off('statsUpdate', handler);
  }, [client]);

  return stats;
}
