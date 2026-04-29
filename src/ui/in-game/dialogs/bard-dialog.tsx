import { useCallback } from 'preact/hooks';
import { useClient, useLocale } from '@/ui/context';
import { DialogBase } from './dialog-base';

const NOTES = [
  'C1',
  'C#1',
  'D1',
  'D#1',
  'E1',
  'F1',
  'F#1',
  'G1',
  'G#1',
  'A1',
  'A#1',
  'B1',
  'C2',
  'C#2',
  'D2',
  'D#2',
  'E2',
  'F2',
  'F#2',
  'G2',
  'G#2',
  'A2',
  'A#2',
  'B2',
  'C3',
  'C#3',
  'D3',
  'D#3',
  'E3',
  'F3',
  'F#3',
  'G3',
  'G#3',
  'A3',
  'A#3',
  'B3',
];

export function BardDialog() {
  const client = useClient();
  const { locale } = useLocale();

  const handlePlay = useCallback(
    (noteId: number) => {
      client.bardController.playNote(noteId);
    },
    [client],
  );

  return (
    <DialogBase id='bard' title={locale.bard.title} size='sm' avoidBottom>
      <div class='grid grid-cols-12 p-2'>
        {NOTES.map((label, i) => (
          <button
            key={i}
            type='button'
            class='btn btn-ghost btn-xs h-8 min-h-0 font-mono'
            onClick={() => handlePlay(i + 1)}
          >
            {label.substring(0, 2)}
          </button>
        ))}
      </div>
    </DialogBase>
  );
}
