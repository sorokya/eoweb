export const locales = {
  en: {
    btnOK: 'OK',
    btnCancel: 'Cancel',
    btnCreateAccount: 'Create Account',
    btnPlayGame: 'Play Game',
    btnViewCredits: 'View Credits',
    logoAlt: 'Endless Online',
    loginTitle: 'Login to Your Account',
    loginUsername: 'Username',
    loginPassword: 'Password',
    loginRemember: 'Remember Me',
    btnLoginConnect: 'Connect',
    characterSelectTitle: 'Select Your Character',
    btnNewCharacter: 'New Character',
    btnChangePassword: 'Change Password',
    adminBadgeSpy: 'SPY',
    adminBadgeLightGuide: 'GUIDE',
    adminBadgeGuardian: 'GUARD',
    adminBadgeGameMaster: 'GM',
    adminBadgeHighGameMaster: 'HGM',
    characterEmptySlot: 'Empty Slot',
    btnLogin: 'Login',
    btnDeleteCharacter: 'Delete',
    changePasswordTitle: 'Change Password',
    changePasswordUsername: 'Username',
    changePasswordOldPassword: 'Old Password',
    changePasswordNewPassword: 'New Password',
    changePasswordConfirmPassword: 'Confirm New Password',
  },
} as const;

export type LocaleKey = keyof typeof locales;
export type LocaleStrings = (typeof locales)[LocaleKey];

export const defaultLocale: LocaleKey = 'en';
