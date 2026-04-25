import { useEffect, useState } from 'preact/hooks';
import { HUD_TEXT, HUD_Z, UI_GHOST_BG } from '@/ui/consts';
import { useClient } from '@/ui/context';
import type { ToastOptions } from '@/ui/types';

const DISMISS_AFTER_MS = 4_000;

type StatusMsg = {
  id: number;
  message: string;
  icon: string;
};

let msgId = 0;

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
          class={`alert pointer-events-auto rounded-full ${UI_GHOST_BG} ${HUD_TEXT} px-2 py-1 text-xs shadow-lg`}
        >
          <span>
            {msg.icon} {msg.message}
          </span>
        </div>
      ))}
    </div>
  );
}
