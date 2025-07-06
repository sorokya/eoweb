import { type EifRecord, ItemType } from 'eolib';
import { getItemMeta } from '../../utils/get-item-meta';
import type { DialogIcon } from '../dialog-icon';

export function createIconMenuItem(
  icon: DialogIcon,
  label: string,
  description: string,
) {
  const menuItem = document.createElement('div');
  menuItem.classList.add('menu-item');

  const menuIcon = document.createElement('div');
  menuIcon.classList.add('menu-item-icon');
  menuIcon.setAttribute('data-id', `${icon}`);
  menuItem.appendChild(menuIcon);

  const menuLabel = document.createElement('div');
  menuLabel.classList.add('menu-label');
  menuLabel.innerText = label;
  menuItem.appendChild(menuLabel);

  const menuDescription = document.createElement('div');
  menuDescription.classList.add('menu-description');
  menuDescription.innerText = description;
  menuItem.appendChild(menuDescription);

  return menuItem;
}

export function createItemMenuItem(
  record: EifRecord,
  label: string,
  description: string,
  itemAmount = 1,
) {
  const menuItem = document.createElement('div');
  menuItem.classList.add('menu-item', 'item');

  const menuImg = document.createElement('img');
  menuImg.src = getItemGraphicPath(record, itemAmount);
  menuImg.classList.add('menu-item-img');
  menuItem.appendChild(menuImg);

  if (record.type !== ItemType.General) {
    const tooltip = document.createElement('div');
    tooltip.classList.add('tooltip');
    const meta = getItemMeta(record);
    tooltip.innerText = `${record.name}\n${meta.join('\n')}`;
    menuItem.appendChild(tooltip);
  }

  const menuLabel = document.createElement('div');
  menuLabel.classList.add('menu-label');
  menuLabel.innerText = label;
  menuItem.appendChild(menuLabel);

  const menuDescription = document.createElement('div');
  menuDescription.classList.add('menu-description');
  menuDescription.innerText = description;
  menuItem.appendChild(menuDescription);

  return menuItem;
}

function getItemGraphicPath(eifRecord: EifRecord, amount: number): string {
  const graphicId = getItemGraphicId(eifRecord, amount);
  const fileId = 100 + graphicId;
  return `/gfx/gfx023/${fileId}.png`;
}

function getItemGraphicId(record: EifRecord, amount: number): number {
  if (record.type === ItemType.Currency) {
    const gfx =
      amount >= 100000
        ? 4
        : amount >= 10000
          ? 3
          : amount >= 100
            ? 2
            : amount >= 2
              ? 1
              : 0;
    return 269 + 2 * gfx;
  }
  return 2 * record.graphicId - 1;
}
