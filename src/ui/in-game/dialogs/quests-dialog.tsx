import { useLocale } from '@/ui/context';
import { DialogBase } from './dialog-base';

export function QuestsDialog() {
  const { locale } = useLocale();
  return (
    <DialogBase id='quests' title={locale.questsTitle} size='sm'>
      <p class='py-4 text-center text-sm opacity-60'>
        {locale.questsComingSoon}
      </p>
    </DialogBase>
  );
}
