import type { EifRecord, EsfRecord } from 'eolib';
import { getItemGraphicPath } from '../../utils/get-item-graphic-id';
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
  itemId: number,
  record: EifRecord,
  label: string,
  description: string,
  itemAmount = 1,
) {
  const menuItem = document.createElement('div');
  menuItem.classList.add('menu-item', 'item');

  const menuImg = document.createElement('img');
  menuImg.src = getItemGraphicPath(itemId, record.graphicId, itemAmount);
  menuImg.classList.add('menu-item-img');
  menuItem.appendChild(menuImg);

  const tooltip = document.createElement('div');
  tooltip.classList.add('tooltip');
  const meta = getItemMeta(record);
  tooltip.innerText = `${record.name}\n${meta.join('\n')}`;
  menuItem.appendChild(tooltip);

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

export function createSkillMenuItem(
  record: EsfRecord,
  label: string,
  description: string,
) {
  const menuItem = document.createElement('div');
  menuItem.classList.add('menu-item');

  const menuIcon = document.createElement('div');
  menuIcon.classList.add('menu-item-icon', 'skill-icon');
  menuIcon.style.backgroundImage = `url('gfx/gfx025/${record.iconId + 100}.png')`;
  menuIcon.style.width = '33px';
  menuIcon.style.height = '31px';
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
