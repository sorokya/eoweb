export type { ClientEventDeps } from './client-events';
export {
  getReconnectAttempts,
  incrementReconnectAttempts,
  resetReconnectAttempts,
  wireClientEvents,
} from './client-events';
export type { UiEventDeps } from './ui-events';
export { wireUiEvents } from './ui-events';
