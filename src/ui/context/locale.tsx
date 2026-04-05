import { createContext } from 'preact';
import { useContext, useState } from 'preact/hooks';
import { defaultLocale, type LocaleKey, locales } from '@/ui/locale';

type LocaleContextProps = {
  localeKey: LocaleKey;
  locale: (typeof locales)[LocaleKey];
  setLocaleKey: (localeKey: LocaleKey) => void;
};

export const LocaleContext = createContext<LocaleContextProps | null>(null);

type LocaleProviderProps = {
  children: preact.ComponentChildren;
};

export function LocaleProvider({ children }: LocaleProviderProps) {
  const [localeKey, setLocaleKey] = useState<LocaleKey>(defaultLocale);

  return (
    <LocaleContext.Provider
      value={{ localeKey, locale: locales[localeKey], setLocaleKey }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const localeContext = useContext(LocaleContext);
  if (!localeContext) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return localeContext;
}
