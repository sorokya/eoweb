import {
  type EoReader,
  PacketAction,
  PacketFamily,
  WarpAgreeServerPacket,
  WarpEffect,
  WarpRequestServerPacket,
  WarpType,
} from 'eolib';
import { ChatTab, type Client } from '../client';
import { getEmf } from '../db';
import { EOResourceID } from '../edf';
import { EffectAnimation, EffectTargetCharacter } from '../render/effect';
import { playSfxById, SfxId } from '../sfx';
import { ChatIcon } from '../ui/chat';

function handleWarpRequest(client: Client, reader: EoReader) {
  const packet = WarpRequestServerPacket.deserialize(reader);
  client.sessionId = packet.sessionId;
  client.warpMapId = packet.mapId;

  switch (packet.warpType) {
    case WarpType.Local: {
      client.warpQueued = true;
      break;
    }
    case WarpType.MapSwitch: {
      const data =
        packet.warpTypeData as WarpRequestServerPacket.WarpTypeDataMapSwitch;
      getEmf(packet.mapId).then((map) => {
        if (
          !map ||
          map.rid[0] !== data.mapRid[0] ||
          map.rid[1] !== data.mapRid[1] ||
          map.byteSize !== data.mapFileSize
        ) {
          client.requestWarpMap(packet.mapId);
          return;
        }
        client.warpQueued = true;
      });
      break;
    }
  }
}

function handleWarpAgree(client: Client, reader: EoReader) {
  const packet = WarpAgreeServerPacket.deserialize(reader);
  client.nearby = packet.nearby;
  const loaded = [];
  for (const npc of client.nearby.npcs) {
    if (loaded.includes(npc.id)) {
      continue;
    }

    loaded.push(npc.id);
  }

  if (
    packet.warpTypeData instanceof WarpAgreeServerPacket.WarpTypeDataMapSwitch
  ) {
    if (packet.warpTypeData.warpEffect === WarpEffect.Admin) {
      const metadata = client.getEffectMetadata(4);
      playSfxById(SfxId.AdminWarp);
      client.effects.push(
        new EffectAnimation(
          4,
          new EffectTargetCharacter(client.playerId),
          metadata,
        ),
      );
    }
  }

  if (client.mapId !== client.warpMapId) {
    getEmf(client.warpMapId).then((map) => {
      if (map.name) {
        client.emit('chat', {
          tab: ChatTab.System,
          message: `${client.getResourceString(EOResourceID.STATUS_LABEL_YOU_ENTERED)} ${map.name}`,
          icon: ChatIcon.NoteLeftArrow,
        });
      }
      client.mapId = client.warpMapId;
      client.setMap(map);
      client.movementController.freeze = false;
    });
  } else {
    client.movementController.freeze = false;
  }
}

export function registerWarpHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Warp,
    PacketAction.Request,
    (reader) => handleWarpRequest(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Warp,
    PacketAction.Agree,
    (reader) => handleWarpAgree(client, reader),
  );
}
