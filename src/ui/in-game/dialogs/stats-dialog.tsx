import { usePlayerStats } from '@/ui/in-game';
import { DialogBase } from './dialog-base';

export function StatsDialog() {
  const stats = usePlayerStats();

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
