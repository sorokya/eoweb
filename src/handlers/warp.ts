import {
  type EoReader,
  PacketAction,
  PacketFamily,
  WarpAgreeServerPacket,
  WarpRequestServerPacket,
  WarpType,
} from 'eolib';
import type { Client } from '../client';
import { getEmf } from '../db';

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
  if (client.mapId !== client.warpMapId) {
    getEmf(client.warpMapId).then((map) => {
      client.mapId = client.warpMapId;
      client.map = map;
      client.mapRenderer.buildCaches();
    });
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
