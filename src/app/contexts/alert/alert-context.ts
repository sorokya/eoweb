import { createContext } from 'preact';

export interface Alert {
  title: string;
  message: string;
}

export const AlertContext = createContext<{
  alert: Alert | null;
  setAlert: (alert: Alert | null) => void;
} | null>(null);
