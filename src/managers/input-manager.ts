import { Coords, ItemGetClientPacket, MapTileSpec, SitState } from 'eolib';
import type { Client } from '../client';
import {
  getBoardIntersecting,
  getCharacterIntersecting,
  getCharacterRectangle,
  getDoorIntersecting,
  getLockerIntersecting,
  getNpcIntersecting,
  getSignIntersecting,
} from '../collision';
import {
  PLAYER_MENU_ITEM_HEIGHT,
  PLAYER_MENU_OFFSET_Y,
  PLAYER_MENU_WIDTH,
} from '../consts';
import { EOResourceID } from '../edf';
import { CursorClickAnimation } from '../render';
import { playSfxById, SfxId } from '../sfx';
import { GameState, PlayerMenuItem } from '../types';
import { capitalize } from '../utils';

export function handleClick(client: Client, e: MouseEvent): void {
  if (client.menuPlayerId) {
    const hovered = getHoveredPlayerMenuItem(client);
    if (hovered !== undefined) {
      playSfxById(SfxId.ButtonClick);
      switch (hovered) {
        case PlayerMenuItem.Paperdoll:
          client.requestPaperdoll(client.menuPlayerId);
          break;
        case PlayerMenuItem.Book:
          client.requestBook(client.menuPlayerId);
          break;
        case PlayerMenuItem.Whisper: {
          const character = client.getCharacterById(client.menuPlayerId);
          if (character) {
            client.emit('setChat', `!${character.name} `);
          }
          break;
        }
        case PlayerMenuItem.Join:
          client.requestToJoinParty(client.menuPlayerId);
          break;
        case PlayerMenuItem.Invite:
          client.inviteToParty(client.menuPlayerId);
          break;
        case PlayerMenuItem.Trade:
          client.requestTrade(client.menuPlayerId);
          break;
      }
      client.menuPlayerId = 0;
      return;
    }

    client.menuPlayerId = 0;
  }

  const ui = document.getElementById('ui')!;
  if (client.state !== GameState.InGame || client.typing || e.target !== ui) {
    return;
  }

  if (
    [SitState.Floor, SitState.Chair].includes(
      client.getPlayerCharacter()!.sitState,
    )
  ) {
    client.stand();
    return;
  }

  if (client.mouseCoords) {
    // Check for items first
    const itemsAtCoords = client.nearby.items.filter(
      (i) =>
        i.coords.x === client.mouseCoords!.x &&
        i.coords.y === client.mouseCoords!.y,
    );

    if (itemsAtCoords.length) {
      itemsAtCoords.sort((a, b) => b.uid - a.uid);

      const protectedItems = itemsAtCoords.filter((i) => {
        const p = client.itemProtectionTimers.get(i.uid);
        return p && p.ticks > 0 && p.ownerId !== client.playerId;
      });

      if (protectedItems.length < itemsAtCoords.length) {
        const item = itemsAtCoords.find((i) => {
          const p = client.itemProtectionTimers.get(i.uid);
          return !p || p.ticks === 0 || p.ownerId === client.playerId;
        });

        if (item) {
          const packet = new ItemGetClientPacket();
          packet.itemIndex = item.uid;
          client.bus!.send(packet);
        }

        return;
      }

      const protectedItem = protectedItems[0];
      const protection = client.itemProtectionTimers.get(protectedItem.uid);

      if (protection) {
        const owner = protection.ownerId
          ? client.getCharacterById(protection.ownerId)
          : undefined;

        const message = owner
          ? `${client.getResourceString(
              EOResourceID.STATUS_LABEL_ITEM_PICKUP_PROTECTED_BY,
            )} ${capitalize(owner.name)}`
          : client.getResourceString(
              EOResourceID.STATUS_LABEL_ITEM_PICKUP_PROTECTED,
            );

        client.setStatusLabel(
          EOResourceID.STATUS_LABEL_TYPE_WARNING,
          message ?? '',
        );
        return;
      }
    }

    // Check tile specs for chests and chairs
    const tileSpec = client
      .map!.tileSpecRows.find((r) => r.y === client.mouseCoords!.y)
      ?.tiles.find((t) => t.x === client.mouseCoords!.x)?.tileSpec;

    if (tileSpec !== undefined) {
      if (tileSpec === MapTileSpec.Chest) {
        client.openChest(client.mouseCoords);
        return;
      }

      if (
        client.isFacingChairAt(client.mouseCoords) &&
        !client.occupied(client.mouseCoords)
      ) {
        const coords = new Coords();
        coords.x = client.mouseCoords.x;
        coords.y = client.mouseCoords.y;
        client.sitChair(coords);
        return;
      }
    }
  }

  const npcAt = getNpcIntersecting(client.mousePosition!);
  if (npcAt) {
    const npc = client.nearby.npcs.find((n) => n.index === npcAt.id);
    if (npc) {
      client.clickNpc(npc);
      return;
    }
  }

  const characterAt = getCharacterIntersecting(client.mousePosition!);
  if (characterAt) {
    const character = client.getCharacterById(characterAt.id);
    if (character) {
      client.clickCharacter(character);
      return;
    }
  }

  const doorAt = getDoorIntersecting(client.mousePosition!);
  const door = doorAt ? client.getDoor(doorAt) : undefined;
  if (door && !door.open) {
    client.openDoor(doorAt!);
  }

  const lockerAt = getLockerIntersecting(client.mousePosition!);
  if (lockerAt) {
    client.openLocker(lockerAt);
    return;
  }

  const signAt = getSignIntersecting(client.mousePosition!);
  if (signAt) {
    const sign = client.mapRenderer.getSign(signAt.x, signAt.y);
    if (sign) {
      client.emit('smallAlert', sign);
      return;
    }
  }

  const boardAt = getBoardIntersecting(client.mousePosition!);
  if (boardAt) {
    const boardSpec = client.boardAt(boardAt);
    if (boardSpec !== undefined) {
      client.openBoard(boardSpec - MapTileSpec.Board1);
    }
    return;
  }

  if (
    !client.cursorClickAnimation &&
    client.mouseCoords &&
    client.canWalk(client.mouseCoords, true)
  ) {
    client.cursorClickAnimation = new CursorClickAnimation(client.mouseCoords);

    const path = client.findPathTo(client.mouseCoords);
    if (path.length) {
      client.autoWalkPath = path;
    }
  }
}

export function handleRightClick(client: Client, e: MouseEvent): void {
  const ui = document.getElementById('ui')!;
  if (client.state !== GameState.InGame || client.typing || e.target !== ui) {
    return;
  }

  const characterAt = getCharacterIntersecting(client.mousePosition!);
  if (characterAt) {
    const character = client.getCharacterById(characterAt.id);
    if (character) {
      if (characterAt.id === client.playerId) {
        client.requestPaperdoll(client.playerId);
      } else {
        client.menuPlayerId = character.playerId;
      }
      return;
    }
  }

  if (client.menuPlayerId) {
    client.menuPlayerId = 0;
  }
}

export function getHoveredPlayerMenuItem(
  client: Client,
): PlayerMenuItem | undefined {
  if (!client.mousePosition || !client.menuPlayerId) {
    return;
  }

  const rect = getCharacterRectangle(client.menuPlayerId);
  if (!rect) {
    return;
  }

  const menuX = rect.position.x + rect.width + 10;

  if (
    client.mousePosition.x < menuX ||
    client.mousePosition.x > menuX + PLAYER_MENU_WIDTH
  ) {
    return;
  }

  const relativeY =
    client.mousePosition.y - rect.position.y - PLAYER_MENU_OFFSET_Y;
  const itemIndex = Math.floor(relativeY / PLAYER_MENU_ITEM_HEIGHT);
  return itemIndex in PlayerMenuItem ? itemIndex : undefined;
}
