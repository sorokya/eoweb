import { useEffect, useState } from 'preact/hooks';
import { HUD_Z } from '@/ui/consts';
import { useClient } from '@/ui/context';
import { usePosition } from '@/ui/in-game';

const DISMISS_AFTER_MS = 4_000;

type StatusMsg = {
  id: number;
  message: string;
  createdAt: number;
};

let msgId = 0;

export function StatusMessages() {
  const client = useClient();
  const [pos] = usePosition('status-messages', () => ({
    x: Math.round(window.innerWidth / 2 - 120),
    y: window.innerHeight - 120,
  }));
  const [messages, setMessages] = useState<StatusMsg[]>([]);

  useEffect(() => {
    const handler = ({ message }: { message: string }) => {
      const id = msgId++;
      setMessages((prev) => [...prev, { id, message, createdAt: Date.now() }]);
      setTimeout(() => {
        setMessages((prev) => prev.filter((m) => m.id !== id));
      }, DISMISS_AFTER_MS);
    };
    client.on('statusMessage', handler);
    return () => client.off('statusMessage', handler);
  }, [client]);

  if (messages.length === 0) return null;

  return (
    <div
      class='pointer-events-none absolute flex flex-col items-center gap-1'
      style={{ left: pos.x, top: pos.y, zIndex: HUD_Z }}
    >
      {messages.map((msg) => (
        <div
          key={msg.id}
          class='animate-fade-in rounded-full border border-base-300 bg-base-100/80 px-4 py-1 font-semibold text-sm shadow'
        >
          {msg.message}
        </div>
      ))}
    </div>
  );
}
