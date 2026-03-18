import { DIBReader } from './dib-reader';
import { LoadType } from './load-type';
import { PEReader } from './pe-reader';

const egfs = new Map<number, PEReader>();

function loadDIB(data: { fileID: number; resourceID: number }) {
  try {
    const egf = egfs.get(data.fileID);
    if (egf) {
      const info = egf.getResourceInfo(data.resourceID);
      if (info) {
        const dib = egf.readResource(info);
        const reader = new DIBReader(dib);
        const pixels = reader.read();
        postMessage(
          {
            loadType: LoadType.DIB,
            fileID: data.fileID,
            resourceID: data.resourceID,
            pixels: pixels.buffer,
            width: info.width,
            height: Math.abs(info.height),
          },
          // @ts-expect-error transferable
          [pixels.buffer],
        );
        return;
      }
    }
    postMessage({
      loadType: LoadType.DIB,
      fileID: data.fileID,
      resourceID: data.resourceID,
      error: `Resource ${data.resourceID} not found in EGF ${data.fileID}`,
    });
  } catch (e) {
    postMessage({
      loadType: LoadType.DIB,
      fileID: data.fileID,
      resourceID: data.resourceID,
      error: String(e),
    });
  }
}

function loadEGF(data: { fileID: number; buffer: ArrayBuffer }) {
  try {
    if (egfs.has(data.fileID)) {
      throw new Error(`EGF ${data.fileID} was already loaded.`);
    }

    const egf = new PEReader(data.buffer);
    egfs.set(data.fileID, egf);

    postMessage({
      loadType: LoadType.EGF,
      fileID: data.fileID,
      resourceInfo: egf.resourceInfo,
    });
  } catch (e) {
    postMessage({
      loadType: LoadType.EGF,
      fileID: data.fileID,
      error: String(e),
    });
  }
}

self.onmessage = (event: MessageEvent) => {
  const data = event.data;
  switch (data.loadType) {
    case LoadType.DIB:
      loadDIB(data);
      break;
    case LoadType.EGF:
      loadEGF(data);
      break;
    default:
      throw new Error(`Unhandled LoadType: ${data.loadType}`);
  }
};
