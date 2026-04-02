export const locales = {
  en: {
    btnOK: 'OK',
    btnCreateAccount: 'Create Account',
    btnPlayGame: 'Play Game',
    btnViewCredits: 'View Credits',
    logoAlt: 'Endless Online',
  },
} as const;

export type LocaleKey = keyof typeof locales;
export type LocaleStrings = (typeof locales)[LocaleKey];

export const defaultLocale: LocaleKey = 'en';
