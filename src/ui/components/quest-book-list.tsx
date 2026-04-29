import { FaCheckCircle } from 'react-icons/fa';
import { useLocale } from '@/ui/context';

type Props = {
  questNames: string[];
};

export function QuestBookList({ questNames }: Props) {
  const { locale } = useLocale();

  if (questNames.length === 0) {
    return (
      <p class='py-4 text-center text-sm opacity-60'>
        {locale.quests.noHistory}
      </p>
    );
  }

  return (
    <ul class='flex flex-col gap-1'>
      {questNames.map((name, i) => (
        <li
          key={i}
          class='flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-base-content/5'
        >
          <span class='shrink-0 text-success'>
            <FaCheckCircle size={13} />
          </span>
          <span class='min-w-0 truncate'>{name}</span>
        </li>
      ))}
    </ul>
  );
}
