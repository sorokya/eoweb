import { Coords, ItemGetClientPacket, MapTileSpec, SitState } from 'eolib';
import type { Client } from '@/client';
import {
  getBoardIntersecting,
  getCharacterIntersecting,
  getCharacterRectangle,
  getDoorIntersecting,
  getLockerIntersecting,
  getNpcIntersecting,
  getSignIntersecting,
} from '@/collision';
import {
  PLAYER_MENU_ITEM_HEIGHT,
  PLAYER_MENU_OFFSET_Y,
  PLAYER_MENU_WIDTH,
} from '@/consts';
import { EOResourceID } from '@/edf';
import { GameState, PlayerMenuItem } from '@/game-state';
import { CursorClickAnimation } from '@/render';
import { playSfxById, SfxId } from '@/sfx';
import { capitalize } from '@/utils';

export class MouseController {
  private client: Client;

  constructor(client: Client) {
    this.client = client;

    let longPressTimer = 0;
    let isLongPress = false;

    const isInUI = (target: EventTarget | null) => {
      const ui = document.getElementById('ui');
      return ui && target && target !== ui && ui.contains(target as Node);
    };

    const updatePositionFromTouch = (touch: Touch) => {
      if (!this.client.app) return;
      const canvas = this.client.app.renderer.canvas;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      this.client.setMousePosition({
        x: Math.min(
          Math.max(Math.floor((touch.clientX - rect.left) * scaleX), 0),
          canvas.width,
        ),
        y: Math.min(
          Math.max(Math.floor((touch.clientY - rect.top) * scaleY), 0),
          canvas.height,
        ),
      });
    };

    window.addEventListener(
      'touchstart',
      (e) => {
        if (isInUI(e.target)) return;
        e.preventDefault();
        isLongPress = false;
        updatePositionFromTouch(e.touches[0]);
        longPressTimer = window.setTimeout(() => {
          isLongPress = true;
          this.handleRightClick({ target: e.target } as MouseEvent);
        }, 500);
      },
      { passive: false },
    );

    window.addEventListener(
      'touchmove',
      (e) => {
        if (isInUI(e.target)) return;
        e.preventDefault();
        clearTimeout(longPressTimer);
        updatePositionFromTouch(e.touches[0]);
      },
      { passive: false },
    );

    window.addEventListener(
      'touchend',
      (e) => {
        if (isInUI(e.target)) return;
        e.preventDefault();
        clearTimeout(longPressTimer);
        if (!isLongPress) {
          this.handleClick({ target: e.target } as MouseEvent);
        }
        isLongPress = false;
      },
      { passive: false },
    );

    window.addEventListener('touchcancel', () => {
      clearTimeout(longPressTimer);
      isLongPress = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.client.app) return;
      const canvas = this.client.app.renderer.canvas;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      this.client.setMousePosition({
        x: Math.min(
          Math.max(Math.floor((e.clientX - rect.left) * scaleX), 0),
          canvas.width,
        ),
        y: Math.min(
          Math.max(Math.floor((e.clientY - rect.top) * scaleY), 0),
          canvas.height,
        ),
      });
    });

    window.addEventListener('click', (e) => {
      this.handleClick(e);
    });

    window.addEventListener('contextmenu', (e) => {
      this.handleRightClick(e);
      e.preventDefault();
    });
  }

  handleClick(e: MouseEvent): void {
    if (this.client.menuPlayerId) {
      const hovered = this.getHoveredPlayerMenuItem();
      if (hovered !== undefined) {
        playSfxById(SfxId.ButtonClick);
        switch (hovered) {
          case PlayerMenuItem.Paperdoll:
            this.client.socialController.requestPaperdoll(
              this.client.menuPlayerId,
            );
            break;
          case PlayerMenuItem.Book:
            this.client.socialController.requestBook(this.client.menuPlayerId);
            break;
          case PlayerMenuItem.Whisper: {
            const character = this.client.getCharacterById(
              this.client.menuPlayerId,
            );
            if (character) {
              this.client.emit('setChat', `!${character.name} `);
            }
            break;
          }
          case PlayerMenuItem.Join:
            this.client.socialController.requestToJoinParty(
              this.client.menuPlayerId,
            );
            break;
          case PlayerMenuItem.Invite:
            this.client.socialController.inviteToParty(
              this.client.menuPlayerId,
            );
            break;
          case PlayerMenuItem.Trade:
            this.client.socialController.requestTrade(this.client.menuPlayerId);
            break;
        }
        this.client.menuPlayerId = 0;
        return;
      }

      this.client.menuPlayerId = 0;
    }

    const ui = document.getElementById('ui')!;
    if (
      this.client.state !== GameState.InGame ||
      this.client.typing ||
      (e.target !== ui && ui.contains(e.target as Node))
    ) {
      return;
    }

    if (
      [SitState.Floor, SitState.Chair].includes(
        this.client.getPlayerCharacter()!.sitState,
      )
    ) {
      this.client.movementController.stand();
      return;
    }

    if (this.client.mouseCoords) {
      // Check for items first
      const itemsAtCoords = this.client.nearby.items.filter(
        (i) =>
          i.coords.x === this.client.mouseCoords!.x &&
          i.coords.y === this.client.mouseCoords!.y,
      );

      if (itemsAtCoords.length) {
        itemsAtCoords.sort((a, b) => b.uid - a.uid);

        const protectedItems = itemsAtCoords.filter((i) => {
          const p =
            this.client.itemProtectionController.itemProtectionTimers.get(
              i.uid,
            );
          return p && p.ticks > 0 && p.ownerId !== this.client.playerId;
        });

        if (protectedItems.length < itemsAtCoords.length) {
          const item = itemsAtCoords.find((i) => {
            const p =
              this.client.itemProtectionController.itemProtectionTimers.get(
                i.uid,
              );
            return !p || p.ticks === 0 || p.ownerId === this.client.playerId;
          });

          if (item) {
            const packet = new ItemGetClientPacket();
            packet.itemIndex = item.uid;
            this.client.bus!.send(packet);
          }

          return;
        }

        const protectedItem = protectedItems[0];
        const protection =
          this.client.itemProtectionController.itemProtectionTimers.get(
            protectedItem.uid,
          );

        if (protection) {
          const owner = protection.ownerId
            ? this.client.getCharacterById(protection.ownerId)
            : undefined;

          const message = owner
            ? `${this.client.getResourceString(
                EOResourceID.STATUS_LABEL_ITEM_PICKUP_PROTECTED_BY,
              )} ${capitalize(owner.name)}`
            : this.client.getResourceString(
                EOResourceID.STATUS_LABEL_ITEM_PICKUP_PROTECTED,
              );

          this.client.setStatusLabel(
            EOResourceID.STATUS_LABEL_TYPE_WARNING,
            message ?? '',
          );
          return;
        }
      }

      // Check tile specs for chests and chairs
      const tileSpec = this.client
        .map!.tileSpecRows.find((r) => r.y === this.client.mouseCoords!.y)
        ?.tiles.find((t) => t.x === this.client.mouseCoords!.x)?.tileSpec;

      if (tileSpec !== undefined) {
        if (tileSpec === MapTileSpec.Chest) {
          this.client.chestController.openChest(this.client.mouseCoords);
          return;
        }

        if (
          this.client.mapController.isFacingChairAt(this.client.mouseCoords) &&
          !this.client.mapController.occupied(this.client.mouseCoords)
        ) {
          const coords = new Coords();
          coords.x = this.client.mouseCoords.x;
          coords.y = this.client.mouseCoords.y;
          this.client.mapController.sitChair(coords);
          return;
        }
      }
    }

    const npcAt = getNpcIntersecting(this.client.mousePosition!);
    if (npcAt) {
      const npc = this.client.nearby.npcs.find((n) => n.index === npcAt.id);
      if (npc) {
        this.client.npcController.clickNpc(npc);
        return;
      }
    }

    const characterAt = getCharacterIntersecting(this.client.mousePosition!);
    if (characterAt) {
      const character = this.client.getCharacterById(characterAt.id);
      if (character) {
        this.client.npcController.clickCharacter(character);
        return;
      }
    }

    const doorAt = getDoorIntersecting(this.client.mousePosition!);
    const door = doorAt ? this.client.mapController.getDoor(doorAt) : undefined;
    if (door && !door.open) {
      this.client.mapController.openDoor(doorAt!);
    }

    const lockerAt = getLockerIntersecting(this.client.mousePosition!);
    if (lockerAt) {
      this.client.mapController.openLocker(lockerAt!);
      return;
    }

    const signAt = getSignIntersecting(this.client.mousePosition!);
    if (signAt) {
      const sign = this.client.mapRenderer.getSign(signAt.x, signAt.y);
      if (sign) {
        this.client.emit('smallAlert', sign);
        return;
      }
    }

    const boardAt = getBoardIntersecting(this.client.mousePosition!);
    if (boardAt) {
      const boardSpec = this.client.mapController.boardAt(boardAt);
      if (boardSpec !== undefined) {
        this.client.boardController.openBoard(boardSpec - MapTileSpec.Board1);
      }
      return;
    }

    if (
      !this.client.animationController.cursorClickAnimation &&
      this.client.mouseCoords &&
      this.client.mapController.canWalk(this.client.mouseCoords, true)
    ) {
      this.client.animationController.cursorClickAnimation =
        new CursorClickAnimation(this.client.mouseCoords);

      const path = this.client.mapController.findPathTo(
        this.client.mouseCoords,
      );
      if (path.length) {
        this.client.movementController.autoWalkPath = path;
      }
    }
  }

  handleRightClick(e: MouseEvent): void {
    const ui = document.getElementById('ui')!;
    if (
      this.client.state !== GameState.InGame ||
      this.client.typing ||
      (e.target !== ui && ui.contains(e.target as Node))
    ) {
      return;
    }

    const characterAt = getCharacterIntersecting(this.client.mousePosition!);
    if (characterAt) {
      const character = this.client.getCharacterById(characterAt.id);
      if (character) {
        if (characterAt.id === this.client.playerId) {
          this.client.socialController.requestPaperdoll(this.client.playerId);
        } else {
          this.client.menuPlayerId = character.playerId;
        }
        return;
      }
    }

    if (this.client.menuPlayerId) {
      this.client.menuPlayerId = 0;
    }
  }

  getHoveredPlayerMenuItem(): PlayerMenuItem | undefined {
    if (!this.client.mousePosition || !this.client.menuPlayerId) {
      return;
    }

    const rect = getCharacterRectangle(this.client.menuPlayerId);
    if (!rect) {
      return;
    }

    const menuX = rect.position.x + rect.width + 10;

    if (
      this.client.mousePosition.x < menuX ||
      this.client.mousePosition.x > menuX + PLAYER_MENU_WIDTH
    ) {
      return;
    }

    const relativeY =
      this.client.mousePosition.y - rect.position.y - PLAYER_MENU_OFFSET_Y;
    const itemIndex = Math.floor(relativeY / PLAYER_MENU_ITEM_HEIGHT);
    return itemIndex in PlayerMenuItem ? itemIndex : undefined;
  }
}
