import { useCallback, useEffect, useState } from 'preact/hooks';
import { FaHeart, FaHeartBroken } from 'react-icons/fa';
import { DIVORCE_COST, MARRIAGE_APPROVAL_COST } from '@/consts';
import { EOResourceID } from '@/edf';
import { playSfxById, SfxId } from '@/sfx';
import { Button } from '@/ui/components';
import { UI_PANEL_BORDER } from '@/ui/consts';
import { useClient, useLocale } from '@/ui/context';
import { useWindowManager } from '@/ui/in-game';
import { DialogBase } from './dialog-base';

type LawView = 'main' | 'marriage' | 'divorce';

export function LawDialog() {
  const client = useClient();
  const { locale } = useLocale();
  const { closeDialog } = useWindowManager();

  const [npcName, setNpcName] = useState(
    () => client.marriageController.npcName || locale.law.title,
  );
  const [view, setView] = useState<LawView>('main');
  const [partnerName, setPartnerName] = useState('');

  useEffect(() => {
    const handleOpened = (name: string) => {
      setNpcName(name || locale.law.title);
      setView('main');
      setPartnerName('');
    };
    const handleApproved = () => {
      closeDialog('law');
    };
    client.marriageController.subscribeLawyerOpen(handleOpened);
    client.marriageController.subscribeWeddingApproval(handleApproved);
    return () => {
      client.marriageController.unsubscribeLawyerOpen(handleOpened);
      client.marriageController.unsubscribeWeddingApproval(handleApproved);
    };
  }, [client, locale.law.title]);

  const handleMarriageSubmit = useCallback(() => {
    if (!partnerName.trim()) return;
    client.marriageController.requestMarriageApproval(partnerName.trim());
    setPartnerName('');
  }, [client, partnerName]);

  const handleDivorceSubmit = useCallback(() => {
    if (!partnerName.trim()) return;
    client.marriageController.requestDivorce(partnerName.trim());
    setPartnerName('');
  }, [client, partnerName]);

  const handleViewChange = useCallback((newView: LawView) => {
    setPartnerName('');
    setView(newView);
  }, []);

  const goldLabel = locale.shared.wordGold;

  return (
    <DialogBase id='law' title={npcName} size='sm'>
      <div class='flex flex-col gap-2 p-2'>
        {view === 'main' && (
          <>
            <button
              type='button'
              class={`flex w-full cursor-pointer flex-col gap-0.5 rounded border p-2 text-left transition-colors hover:bg-base-200 ${UI_PANEL_BORDER}`}
              onClick={() => {
                playSfxById(SfxId.ButtonClick);
                handleViewChange('marriage');
              }}
            >
              <span class='flex items-center gap-1 font-semibold text-error text-sm'>
                <FaHeart size={12} />
                {client.getResourceString(EOResourceID.WEDDING_MARRIAGE)}
              </span>
              <span class='text-base-content/60 text-xs'>
                {client.getResourceString(
                  EOResourceID.WEDDING_REQUEST_WEDDING_APPROVAL,
                )}
              </span>
              <span class='mt-0.5 text-warning text-xs'>
                {MARRIAGE_APPROVAL_COST.toLocaleString()} {goldLabel}
              </span>
            </button>

            <button
              type='button'
              class={`flex w-full cursor-pointer flex-col gap-0.5 rounded border p-2 text-left transition-colors hover:bg-base-200 ${UI_PANEL_BORDER}`}
              onClick={() => {
                playSfxById(SfxId.ButtonClick);
                handleViewChange('divorce');
              }}
            >
              <span class='flex items-center gap-1 font-semibold text-base-content/50 text-sm'>
                <FaHeartBroken size={12} />
                {client.getResourceString(EOResourceID.WEDDING_DIVORCE)}
              </span>
              <span class='text-base-content/60 text-xs'>
                {client.getResourceString(EOResourceID.WEDDING_BREAK_UP)}
              </span>
              <span class='mt-0.5 text-warning text-xs'>
                {DIVORCE_COST.toLocaleString()} {goldLabel}
              </span>
            </button>
          </>
        )}

        {view === 'marriage' && (
          <>
            <div class='flex flex-col gap-1 text-base-content/70 text-xs'>
              <p>
                {client.getResourceString(EOResourceID.WEDDING_REQUEST_TEXT_1)}
              </p>
              <p>
                {client.getResourceString(EOResourceID.WEDDING_REQUEST_TEXT_2)}
              </p>
            </div>
            <div class='flex flex-col gap-1'>
              <label for='law-partner-name' class='text-primary/70 text-xs'>
                {client.getResourceString(
                  EOResourceID.WEDDING_PROMPT_ENTER_NAME_MARRY,
                )}
              </label>
              <input
                id='law-partner-name'
                type='text'
                class={`input input-sm input-bordered w-full border ${UI_PANEL_BORDER}`}
                value={partnerName}
                onKeyDown={(e) => e.stopPropagation()}
                onInput={(e) =>
                  setPartnerName((e.target as HTMLInputElement).value)
                }
              />
            </div>
            <div class='flex gap-2 pt-1'>
              <Button
                variant={['sm', 'ghost']}
                class='flex-1'
                onClick={() => handleViewChange('main')}
              >
                {locale.shared.wordBack}
              </Button>
              <Button
                variant={['sm', 'primary']}
                class='flex-1'
                onClick={handleMarriageSubmit}
                disabled={!partnerName.trim()}
              >
                {locale.shared.wordSubmit}
              </Button>
            </div>
          </>
        )}

        {view === 'divorce' && (
          <>
            <div class='flex flex-col gap-1 text-base-content/70 text-xs'>
              <p>
                {client.getResourceString(EOResourceID.WEDDING_DIVORCE_TEXT_1)}
              </p>
              <p>
                {client.getResourceString(EOResourceID.WEDDING_DIVORCE_TEXT_2)}
              </p>
            </div>
            <div class='flex flex-col gap-1'>
              <label for='law-divorce-name' class='text-primary/70 text-xs'>
                {client.getResourceString(
                  EOResourceID.WEDDING_PROMPT_ENTER_NAME_DIVORCE,
                )}
              </label>
              <input
                id='law-divorce-name'
                type='text'
                class={`input input-sm input-bordered w-full border ${UI_PANEL_BORDER}`}
                value={partnerName}
                onKeyDown={(e) => e.stopPropagation()}
                onInput={(e) =>
                  setPartnerName((e.target as HTMLInputElement).value)
                }
              />
            </div>
            <div class='flex gap-2 pt-1'>
              <Button
                variant={['sm', 'ghost']}
                class='flex-1'
                onClick={() => handleViewChange('main')}
              >
                {locale.shared.wordBack}
              </Button>
              <Button
                variant={['sm', 'warning']}
                class='flex-1'
                onClick={handleDivorceSubmit}
                disabled={!partnerName.trim()}
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
