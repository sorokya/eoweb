import { useCallback, useEffect, useState } from 'preact/hooks';
import { FaBed, FaHome, FaTimesCircle } from 'react-icons/fa';
import { Button } from '@/ui/components';
import { UI_PANEL_BORDER } from '@/ui/consts';
import { useClient, useLocale } from '@/ui/context';
import { useWindowManager } from '@/ui/in-game';
import { DialogBase } from './dialog-base';

type InnView = 'main' | 'becomeCitizen';

export function InnKeeperDialog() {
  const client = useClient();
  const { locale } = useLocale();
  const { closeDialog } = useWindowManager();

  const [npcName, setNpcName] = useState(
    () => client.innController.npcName || locale.innKeeper.title,
  );
  const [currentHomeId, setCurrentHomeId] = useState(
    () => client.innController.currentHomeId,
  );
  const [questions, setQuestions] = useState<string[]>(
    () => client.innController.questions,
  );
  const [view, setView] = useState<InnView>('main');
  const [answers, setAnswers] = useState<string[]>(['', '', '']);

  useEffect(() => {
    const handleOpened = (
      name: string,
      newCurrentHomeId: number,
      newQuestions: string[],
    ) => {
      setNpcName(name || locale.innKeeper.title);
      setCurrentHomeId(newCurrentHomeId);
      setQuestions(newQuestions);
      setView('main');
      setAnswers(['', '', '']);
    };
    const handleClose = () => closeDialog('innKeeper');
    client.innController.subscribeOpened(handleOpened);
    client.innController.subscribeClose(handleClose);
    return () => {
      client.innController.unsubscribeOpened(handleOpened);
      client.innController.unsubscribeClose(handleClose);
    };
  }, [client, closeDialog, locale.innKeeper.title]);

  const isCitizen = currentHomeId > 0;

  const handleSleep = useCallback(() => {
    client.innController.sleepRequest();
  }, [client]);

  const handleGiveUp = useCallback(() => {
    client.innController.giveUpCitizenship();
  }, [client]);

  const handleSubmitAnswers = useCallback(() => {
    client.innController.becomeCitizen(answers);
  }, [client, answers]);

  return (
    <DialogBase id='innKeeper' title={npcName} size='sm'>
      <div class='flex flex-col gap-2 p-2'>
        {view === 'main' && (
          <>
            {isCitizen ? (
              <Button
                variant={['sm', 'warning', 'outline']}
                class='w-full'
                onClick={handleGiveUp}
              >
                <FaTimesCircle size={12} />
                {locale.innKeeper.giveUpCitizenship}
              </Button>
            ) : (
              <Button
                variant={['sm', 'primary']}
                class='w-full'
                onClick={() => setView('becomeCitizen')}
              >
                <FaHome size={12} />
                {locale.innKeeper.becomeCitizen}
              </Button>
            )}
            <Button
              variant={['sm', 'secondary']}
              class='w-full'
              onClick={handleSleep}
            >
              <FaBed size={12} />
              {locale.innKeeper.sleep}
            </Button>
          </>
        )}

        {view === 'becomeCitizen' && (
          <>
            <div class='flex flex-col gap-2'>
              {questions.map((question, i) => (
                <div key={i} class='flex flex-col gap-1'>
                  <label
                    for={`inn-answer-${i}`}
                    class='text-base-content/70 text-xs'
                  >
                    {question}
                  </label>
                  <input
                    id={`inn-answer-${i}`}
                    type='text'
                    class={`input input-sm input-bordered w-full border ${UI_PANEL_BORDER}`}
                    value={answers[i] ?? ''}
                    onKeyDown={(e) => e.stopPropagation()}
                    onInput={(e) => {
                      const val = (e.target as HTMLInputElement).value;
                      setAnswers((prev) => {
                        const next = [...prev];
                        next[i] = val;
                        return next;
                      });
                    }}
                  />
                </div>
              ))}
            </div>
            <div class='flex gap-2 pt-1'>
              <Button
                variant={['sm', 'ghost']}
                class='flex-1'
                onClick={() => setView('main')}
              >
                {locale.shared.wordBack}
              </Button>
              <Button
                variant={['sm', 'primary']}
                class='flex-1'
                onClick={handleSubmitAnswers}
              >
                {locale.shared.wordSubmit}
              </Button>
            </div>
          </>
        )}
      </div>
    </DialogBase>
  );
}
