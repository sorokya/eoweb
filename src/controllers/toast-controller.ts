import type { ToastOptions } from '@/ui/types';

export class ToastController {
  private subscribers: ((options: ToastOptions) => void)[] = [];

  subscribe(callback: (options: ToastOptions) => void) {
    this.subscribers.push(callback);
  }

  unsubscribe(callback: (options: ToastOptions) => void) {
    this.subscribers = this.subscribers.filter((cb) => cb !== callback);
  }

  showToast({ message, icon = '✨' }: ToastOptions) {
    for (const cb of this.subscribers) {
      cb({ message, icon });
    }
  }

  show(message: string) {
    this.showToast({ message });
  }

  showSuccess(message: string) {
    this.showToast({ message, icon: '🎉' });
  }

  showWarning(message: string) {
    this.showToast({ message, icon: '⚠️' });
  }

  showError(message: string) {
    this.showToast({ message, icon: '❌' });
  }
}
