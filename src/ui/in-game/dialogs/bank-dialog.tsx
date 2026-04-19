import { useEffect, useState } from 'preact/hooks';
import type { Client } from '@/client';
import { LOCKER_MAX_ITEM_AMOUNT, MAX_LOCKER_UPGRADES } from '@/consts';
import { Button } from '@/ui/components';
import { useClient, useLocale } from '@/ui/context';
import { DialogBase } from './dialog-base';

function readGoldOnHand(client: Client): number {
  return client.items.find((item) => item.id === 1)?.amount ?? 0;
}

export function BankDialog() {
  const client = useClient();
  const { locale } = useLocale();

  const [goldBank, setGoldBank] = useState(
    () => client.bankController.goldBank,
  );
  const [goldOnHand, setGoldOnHand] = useState(() => readGoldOnHand(client));
  const [lockerUpgrades, setLockerUpgrades] = useState(
    () => client.bankController.lockerUpgrades,
  );
  const nextUpgradeCost = client.bankController.getNextLockerUpgradeCost();
  const maxedUpgrades = lockerUpgrades >= MAX_LOCKER_UPGRADES;

  useEffect(() => {
    const handleOpened = (newGoldBank: number, newLockerUpgrades: number) => {
      setGoldBank(newGoldBank);
      setLockerUpgrades(newLockerUpgrades);
      setGoldOnHand(readGoldOnHand(client));
    };
    const handleUpdated = (newGoldBank: number) => {
      setGoldBank(newGoldBank);
      setGoldOnHand(readGoldOnHand(client));
      setLockerUpgrades(client.bankController.lockerUpgrades);
    };
    const handleInventoryChanged = () => {
      setGoldOnHand(readGoldOnHand(client));
      setLockerUpgrades(client.bankController.lockerUpgrades);
    };

    client.bankController.subscribeOpened(handleOpened);
    client.bankController.subscribeUpdated(handleUpdated);
    client.on('inventoryChanged', handleInventoryChanged);

    return () => {
      client.bankController.unsubscribeOpened(handleOpened);
      client.bankController.unsubscribeUpdated(handleUpdated);
      client.off('inventoryChanged', handleInventoryChanged);
    };
  }, [client]);

  return (
    <DialogBase id='bank' title={locale.bankTitle} size='sm'>
      <div class='space-y-2 p-2'>
        <div class='rounded border border-base-content/10 bg-base-200 p-2'>
          <div class='flex items-center justify-between text-sm'>
            <span class='opacity-70'>{locale.bankBalance}</span>
            <span class='font-semibold tabular-nums'>
              {goldBank.toLocaleString()}
            </span>
          </div>
          <div class='mt-1 flex items-center justify-between text-xs opacity-80'>
            <span>{locale.bankOnHand}</span>
            <span class='tabular-nums'>{goldOnHand.toLocaleString()}</span>
          </div>
        </div>

        <div class='grid grid-cols-2 gap-2'>
          <Button
            variant={['sm', 'primary']}
            class='w-full'
            onClick={() => client.bankController.depositGold()}
          >
            {locale.bankDeposit}
          </Button>
          <Button
            variant={['sm', 'secondary']}
            class='w-full'
            onClick={() => client.bankController.withdrawGold()}
          >
            {locale.bankWithdraw}
          </Button>
        </div>

        <div class='rounded border border-base-content/10 bg-base-200 p-2'>
          <div class='flex items-center justify-between text-sm'>
            <span class='opacity-70'>{locale.bankLockerUpgrades}</span>
            <span class='font-semibold tabular-nums'>
              {lockerUpgrades}/{MAX_LOCKER_UPGRADES}
            </span>
          </div>
          <div class='mt-1 flex items-center justify-between text-xs opacity-80'>
            <span>{locale.bankNextUpgradeCost}</span>
            <span class='tabular-nums'>
              {nextUpgradeCost === null
                ? 'MAX'
                : nextUpgradeCost.toLocaleString()}
            </span>
          </div>
          <div class='mt-1 flex items-center justify-between text-xs opacity-80'>
            <span>{locale.bankMaxLockerItems}</span>
            <span class='tabular-nums'>{LOCKER_MAX_ITEM_AMOUNT}</span>
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
            {locale.bankBuyUpgrade}
          </Button>
        </div>
      </div>
    </DialogBase>
  );
}
