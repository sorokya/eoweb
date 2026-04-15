import { useEffect, useState } from 'preact/hooks';
import { HUD_Z } from '@/ui/consts';
import { useClient } from '@/ui/context';
import { type ToastOptions, ToastType } from '@/ui/types';

const DISMISS_AFTER_MS = 4_000;

type StatusMsg = {
  id: number;
  message: string;
  icon: string;
  type: ToastType;
};

let msgId = 0;

const TOAST_TYPE_MAP = {
  [ToastType.Info]: 'text-info border-info',
  [ToastType.Success]: 'text-success border-success',
  [ToastType.Warning]: 'text-warning border-warning',
  [ToastType.Error]: 'text-error border-error',
};

export function StatusMessages() {
  const client = useClient();
  const [messages, setMessages] = useState<StatusMsg[]>([]);

  useEffect(() => {
    const handler = (toast: ToastOptions) => {
      const id = msgId++;
      setMessages((prev) => [
        ...prev,
        {
          id,
          message: toast.message,
          icon: toast.icon!,
          type: toast.type!,
        },
      ]);
      setTimeout(() => {
        setMessages((prev) => prev.filter((m) => m.id !== id));
      }, DISMISS_AFTER_MS);
    };
    client.toastController.subscribe(handler);
    return () => client.toastController.unsubscribe(handler);
  }, [client]);

  if (messages.length === 0) return null;

  return (
    <div
      class='toast toast-center pointer-events-none mb-12'
      style={{ zIndex: HUD_Z }}
    >
      {messages.map((msg) => (
        <div
          key={msg.id}
          class={`alert pointer-events-auto rounded-full bg-base-200/50 text-shadow-lg text-sm shadow-lg ${TOAST_TYPE_MAP[msg.type]}`}
        >
          <span>
            {msg.icon} {msg.message}
          </span>
        </div>
      ))}
    </div>
  );
}
