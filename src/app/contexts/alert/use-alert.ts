import { useContext } from 'preact/hooks';
import { AlertContext } from './alert-context';

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return {
    getAlert: () => context.alert,
    setAlert: context.setAlert,
  };
}
