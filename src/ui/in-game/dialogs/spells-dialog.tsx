import { useLocale } from '@/ui/context';
import { DialogBase } from './dialog-base';

export function SpellsDialog() {
  const { locale } = useLocale();
  return (
    <DialogBase id='spells' title={locale.spellsTitle} size='sm'>
      <p class='py-4 text-center text-sm opacity-60'>
        {locale.spellsComingSoon}
      </p>
    </DialogBase>
  );
}
