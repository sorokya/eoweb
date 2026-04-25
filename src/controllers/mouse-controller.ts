import { Coords, ItemGetClientPacket, MapTileSpec, SitState } from 'eolib';
import type { Client } from '@/client';
import {
  getBoardIntersecting,
  getCharacterIntersecting,
  getCharacterRectangle,
  getDoorIntersecting,
  getJukeboxIntersecting,
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
import { SfxId } from '@/sfx';
import { capitalize } from '@/utils';
import type { Vector2 } from '@/vector';

export class MouseController {
  private client: Client;

  private ignoreNextClick = false;
  setIgnoreNextClick() {
    this.ignoreNextClick = true;
  }

  private touchStartPosition: Vector2 | null = null;

  constructor(client: Client) {
    this.client = client;

    let longPressTimer = 0;
    let isLongPress = false;

    const isInUI = (target: EventTarget | null) => {
      const ui = document.getElementById('ui');
      return ui && target && target !== ui && ui.contains(target as Node);
    };

    const getCoordsFromTouch = (touch: Touch): Vector2 | null => {
      if (!this.client.app) return null;
      const canvas = this.client.app.renderer.canvas;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: Math.min(
          Math.max(Math.floor((touch.clientX - rect.left) * scaleX), 0),
          canvas.width,
        ),
        y: Math.min(
          Math.max(Math.floor((touch.clientY - rect.top) * scaleY), 0),
          canvas.height,
        ),
      };
    };

    window.addEventListener(
      'touchstart',
      (e) => {
        if (isInUI(e.target)) return;
        e.preventDefault();
        isLongPress = false;

        const coords = getCoordsFromTouch(e.touches[0]);
        if (coords) {
          this.touchStartPosition = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
          };
          this.client.setMousePosition(coords);
        }

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
        const coords = getCoordsFromTouch(e.touches[0]);
        if (coords) {
          this.client.setMousePosition(coords);
        }
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
          const diffX =
            e.changedTouches[0].clientX - this.touchStartPosition!.x;
          const diffY =
            e.changedTouches[0].clientY - this.touchStartPosition!.y;
          if (Math.sqrt(diffX * diffX + diffY * diffY) > 10) {
            // Consider it a swipe, not a tap
            return;
          }
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
      if (!this.client.app?.renderer?.canvas) return;
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

    let mouseDownPosition: { x: number; y: number } | null = null;

    window.addEventListener(
      'pointerdown',
      (e) => {
        if (e.pointerType !== 'mouse') return;
        // Only track left-click drags
        if (e.button !== 0) return;
        // Don't track drags that start inside the UI
        if (isInUI(e.target)) {
          mouseDownPosition = null;
          return;
        }
        mouseDownPosition = { x: e.clientX, y: e.clientY };
      },
      { capture: true },
    );

    window.addEventListener('pointerup', (e) => {
      if (e.pointerType !== 'mouse') return;
      // Only handle left-click releases; right-click is handled via contextmenu
      if (e.button !== 0) return;

      // Require a tracked pointerdown — if it started in UI or was blocked
      // by stopPropagation, mouseDownPosition is null and we skip entirely.
      if (!mouseDownPosition) return;

      const dx = e.clientX - mouseDownPosition.x;
      const dy = e.clientY - mouseDownPosition.y;
      mouseDownPosition = null;
      if (Math.sqrt(dx * dx + dy * dy) > 10) {
        // Treat as a drag, not a click — also clear any pending ignore flag
        this.ignoreNextClick = false;
        return;
      }

      if (this.ignoreNextClick) {
        this.ignoreNextClick = false;
        return;
      }

      this.handleClick(e as unknown as MouseEvent);
    });

    window.addEventListener('pointercancel', (e) => {
      if (e.pointerType !== 'mouse') return;
      mouseDownPosition = null;
      this.ignoreNextClick = false;
    });

    window.addEventListener('contextmenu', (e) => {
      this.handleRightClick(e);
      e.preventDefault();
    });
  }

  handleClick(e: MouseEvent): void {
    if (this.ignoreNextClick) {
      this.ignoreNextClick = false;
      return;
    }

    if (this.client.menuPlayerId) {
      const hovered = this.getHoveredPlayerMenuItem();
      if (hovered !== undefined) {
        this.client.audioController.playById(SfxId.ButtonClick);
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
              this.client.chatController.notifySetChat(`!${character.name} `);
            }
            break;
          }
          case PlayerMenuItem.Join:
            this.client.partyController.requestToJoin(this.client.menuPlayerId);
            break;
          case PlayerMenuItem.Invite:
            this.client.partyController.invite(this.client.menuPlayerId);
            break;
          case PlayerMenuItem.Trade:
            this.client.tradeController.request(this.client.menuPlayerId);
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

          this.client.toastController.showWarning(message);
          return;
        }
      }

      // Check tile specs for chests and chairs
      const tileSpec = this.client.mapRenderer.getTileSpecAt(
        this.client.mouseCoords,
      );

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
      return;
    }

    const lockerAt = getLockerIntersecting(this.client.mousePosition!);
    if (lockerAt) {
      this.client.lockerController.openLocker(lockerAt!);
      return;
    }

    const signAt = getSignIntersecting(this.client.mousePosition!);
    if (signAt) {
      const sign = this.client.mapRenderer.getSign(signAt.x, signAt.y);
      if (sign) {
        this.client.alertController.show(sign.title, sign.message);
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

    const jukeboxAt = getJukeboxIntersecting(this.client.mousePosition!);
    if (jukeboxAt) {
      this.client.jukeboxController.openJukebox(jukeboxAt);
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
