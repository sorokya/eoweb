import { useEffect, useState } from 'preact/hooks';
import { FaArrowDown, FaArrowUp, FaCoins, FaLock } from 'react-icons/fa';
import { LOCKER_MAX_ITEM_AMOUNT, MAX_LOCKER_UPGRADES } from '@/consts';
import { Button } from '@/ui/components';
import { UI_ITEM_BG, UI_PANEL_BORDER } from '@/ui/consts';
import { useClient, useLocale } from '@/ui/context';
import { DialogBase } from './dialog-base';

export function BankDialog() {
  const client = useClient();
  const { locale } = useLocale();

  const [goldBank, setGoldBank] = useState(
    () => client.bankController.goldBank,
  );
  const [goldOnHand, setGoldOnHand] = useState(
    client.inventoryController.goldAmount,
  );
  const [lockerUpgrades, setLockerUpgrades] = useState(
    () => client.bankController.lockerUpgrades,
  );
  const nextUpgradeCost = client.bankController.getNextLockerUpgradeCost();
  const maxedUpgrades = lockerUpgrades >= MAX_LOCKER_UPGRADES;

  useEffect(() => {
    const handleOpened = (newGoldBank: number, newLockerUpgrades: number) => {
      setGoldBank(newGoldBank);
      setLockerUpgrades(newLockerUpgrades);
      setGoldOnHand(client.inventoryController.goldAmount);
    };
    const handleUpdated = (newGoldBank: number) => {
      setGoldBank(newGoldBank);
      setGoldOnHand(client.inventoryController.goldAmount);
      setLockerUpgrades(client.bankController.lockerUpgrades);
    };
    const handleInventoryChanged = () => {
      setGoldOnHand(client.inventoryController.goldAmount);
      setLockerUpgrades(client.bankController.lockerUpgrades);
    };

    client.bankController.subscribeOpened(handleOpened);
    client.bankController.subscribeUpdated(handleUpdated);
    client.inventoryController.subscribeInventoryChanged(
      handleInventoryChanged,
    );

    return () => {
      client.bankController.unsubscribeOpened(handleOpened);
      client.bankController.unsubscribeUpdated(handleUpdated);
      client.inventoryController.unsubscribeInventoryChanged(
        handleInventoryChanged,
      );
    };
  }, [client]);

  return (
    <DialogBase id='bank' title={locale.bank.title} size='sm'>
      <div class='space-y-2 p-2'>
        <div class={`rounded border ${UI_PANEL_BORDER} ${UI_ITEM_BG} p-2`}>
          <div class='flex items-center justify-between text-sm'>
            <span class='flex items-center gap-1 text-primary/60'>
              <span class='text-warning'>
                <FaCoins size={11} />
              </span>
              {locale.bank.balance}
            </span>
            <span class='font-semibold text-warning tabular-nums'>
              {goldBank.toLocaleString()}
            </span>
          </div>
          <div class='mt-1 flex items-center justify-between text-primary/50 text-xs'>
            <span class='flex items-center gap-1'>
              <span class='text-warning/70'>
                <FaCoins size={10} />
              </span>
              {locale.bank.onHand}
            </span>
            <span class='text-warning/70 tabular-nums'>
              {goldOnHand.toLocaleString()}
            </span>
          </div>
        </div>

        <div class='grid grid-cols-2 gap-2'>
          <Button
            variant={['sm', 'primary']}
            class='w-full'
            onClick={() => client.bankController.depositGold()}
          >
            <FaArrowDown size={11} />
            {locale.bank.deposit}
          </Button>
          <Button
            variant={['sm', 'secondary']}
            class='w-full'
            onClick={() => client.bankController.withdrawGold()}
          >
            <FaArrowUp size={11} />
            {locale.bank.withdraw}
          </Button>
        </div>

        <div class={`rounded border ${UI_PANEL_BORDER} ${UI_ITEM_BG} p-2`}>
          <div class='flex items-center justify-between text-sm'>
            <span class='flex items-center gap-1 text-primary/60'>
              <span class='text-primary'>
                <FaLock size={11} />
              </span>
              {locale.bank.lockerUpgrades}
            </span>
            <span class='font-semibold tabular-nums'>
              {lockerUpgrades}/{MAX_LOCKER_UPGRADES}
            </span>
          </div>
          <div class='mt-1 flex items-center justify-between text-primary/50 text-xs'>
            <span>{locale.bank.nextUpgradeCost}</span>
            <span class='text-base-content/70 tabular-nums'>
              {nextUpgradeCost === null
                ? 'MAX'
                : nextUpgradeCost.toLocaleString()}
            </span>
          </div>
          <div class='mt-1 flex items-center justify-between text-primary/50 text-xs'>
            <span>{locale.bank.maxLockerItems}</span>
            <span class='text-base-content/70 tabular-nums'>
              {LOCKER_MAX_ITEM_AMOUNT}
            </span>
          </div>
          <Button
            variant={['sm', maxedUpgrades ? 'disabled' : 'outline']}
            class='mt-2 w-full'
            onClick={() => {
              if (!maxedUpgrades) {
                client.bankController.upgradeLocker();
              }
            }}
          >
            <FaLock size={11} />
            {locale.bank.buyUpgrade}
          </Button>
        </div>
      </div>
    </DialogBase>
  );
}
