import { useEffect, useState } from 'preact/hooks';
import { useClient } from '@/ui/context';
import { DialogBase } from './dialog-base';

type Stats = {
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  tp: number;
  maxTp: number;
  experience: number;
};

export function StatsDialog() {
  const client = useClient();
  const [stats, setStats] = useState<Stats>({
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

  return (
    <DialogBase id='stats' title='Stats' defaultWidth={280}>
      <div class='flex flex-col gap-1 text-sm'>
        <div class='flex justify-between'>
          <span class='opacity-60'>Name</span>
          <span class='font-semibold'>{stats.name}</span>
        </div>
        <div class='flex justify-between'>
          <span class='opacity-60'>Level</span>
          <span>{stats.level}</span>
        </div>
        <div class='flex justify-between'>
          <span class='opacity-60'>HP</span>
          <span>
            {stats.hp} / {stats.maxHp}
          </span>
        </div>
        <div class='flex justify-between'>
          <span class='opacity-60'>TP</span>
          <span>
            {stats.tp} / {stats.maxTp}
          </span>
        </div>
        <div class='flex justify-between'>
          <span class='opacity-60'>EXP</span>
          <span>{stats.experience.toLocaleString()}</span>
        </div>
      </div>
    </DialogBase>
  );
}
