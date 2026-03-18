export interface ResourceInfo {
  start: number;
  size: number;
  width: number;
  height: number;
}

const ResourceType = {
  BITMAP: 2,
} as const;

class ResourceDirectoryEntry {
  resourceType: number;
  subdirectoryOffset: number;

  constructor(resourceType = 0, subdirectoryOffset = 0) {
    this.resourceType = resourceType;
    this.subdirectoryOffset = subdirectoryOffset;
  }
}

class ResourceDataEntry {
  offset: number;
  size: number;

  constructor(offset: number, size: number) {
    this.offset = offset;
    this.size = size;
  }
}

export class PEReader {
  private file: ArrayBuffer;
  private dataView: DataView;
  private position = 0;
  private virtualAddress = 0;
  private rootAddress = 0;
  private bitmapDirectoryEntry = new ResourceDirectoryEntry();
  resourceInfo: Map<number, ResourceInfo> = new Map();

  constructor(buffer: ArrayBuffer) {
    this.file = buffer;
    this.dataView = new DataView(buffer);
    this.readHeader();
    this.readBitmapTable();
  }

  private seek(position: number) {
    this.position = position;
  }

  private skip(offset: number) {
    this.position += offset;
  }

  private readUint16(): number {
    const result = this.dataView.getUint16(this.position, true);
    this.position += 2;
    return result;
  }

  private readUint32(): number {
    const result = this.dataView.getUint32(this.position, true);
    this.position += 4;
    return result;
  }

  private readInt32(): number {
    const result = this.dataView.getInt32(this.position, true);
    this.position += 4;
    return result;
  }

  private readString(length: number): string {
    const decoder = new TextDecoder('utf-8');
    const result = decoder.decode(
      new Uint8Array(this.file.slice(this.position, this.position + length)),
    );
    this.position += length;
    return result;
  }

  private readDirectoryEntryCount(): number {
    this.skip(0x0c);
    const namedEntries = this.readUint16();
    const idEntries = this.readUint16();
    return namedEntries + idEntries;
  }

  private readResourceDirectoryEntry(): ResourceDirectoryEntry {
    const resourceType = this.readUint32();
    const subdirectoryOffset = this.readUint32();
    return new ResourceDirectoryEntry(resourceType, subdirectoryOffset);
  }

  private readResourceDataEntry(): ResourceDataEntry {
    const offset = this.readUint32();
    const size = this.readUint32();
    this.skip(8); // codePage + unused
    return new ResourceDataEntry(offset, size);
  }

  private readHeader() {
    this.seek(0x3c);
    const peHeaderAddress = this.readUint16();

    this.skip(peHeaderAddress - 0x3c - 0x02);
    const type = this.readString(4);
    if (type !== 'PE\0\0') {
      throw new Error('Invalid PE file signature');
    }

    this.skip(0x02);
    const sections = this.readUint16();

    this.skip(0x78 - 0x04 + 0x0c);
    this.virtualAddress = this.readUint32();

    this.skip(0x6c + 0x08 + 0x04);

    for (let i = 0; i < sections; ++i) {
      const checkVirtualAddress = this.readUint32();
      if (checkVirtualAddress === this.virtualAddress) {
        this.skip(0x04);
        this.rootAddress = this.readUint32();
        break;
      }
      this.skip(0x24);
    }

    if (this.rootAddress === 0) {
      throw new Error('Invalid root address');
    }

    this.seek(this.rootAddress);
    const directoryEntryCount = this.readDirectoryEntryCount();

    for (let i = 0; i < directoryEntryCount; ++i) {
      const directoryEntry = this.readResourceDirectoryEntry();
      if (directoryEntry.resourceType === ResourceType.BITMAP) {
        this.bitmapDirectoryEntry = directoryEntry;
        this.bitmapDirectoryEntry.subdirectoryOffset -= 0x80000000;
        return;
      }
    }

    throw new Error('Missing bitmap resource directory');
  }

  private readBitmapTable() {
    this.seek(this.rootAddress + this.bitmapDirectoryEntry.subdirectoryOffset);

    const directoryEntryCount = this.readDirectoryEntryCount();
    const bitmapEntries: ResourceDirectoryEntry[] = [];

    for (let i = 0; i < directoryEntryCount; ++i) {
      const entry = this.readResourceDirectoryEntry();
      if (entry.subdirectoryOffset > 0x80000000) {
        entry.subdirectoryOffset -= 0x80000000;
        bitmapEntries.push(entry);
      }
    }

    for (const entry of bitmapEntries) {
      this.seek(this.rootAddress + entry.subdirectoryOffset + 20);
      const entrySubdirectoryOffset = this.readUint32();

      this.seek(this.rootAddress + entrySubdirectoryOffset);
      const dataEntry = this.readResourceDataEntry();
      const start = dataEntry.offset - this.virtualAddress + this.rootAddress;
      const size = dataEntry.size;

      this.seek(start);

      const headerSize = this.readUint32();
      let width: number;
      let height: number;

      if (headerSize === 12) {
        // BITMAPCOREHEADER: width and height are unsigned 16-bit values
        // See: https://learn.microsoft.com/windows/win32/api/wingdi/ns-wingdi-bitmapcoreheader
        width = this.readUint16();
        height = this.readUint16();
      } else {
        width = Math.abs(this.readInt32());
        height = Math.abs(this.readInt32());
      }

      this.resourceInfo.set(entry.resourceType, { start, size, width, height });
    }
  }

  getResourceIDs(): IterableIterator<number> {
    return this.resourceInfo.keys();
  }

  getResourceInfo(resourceID: number): ResourceInfo | null {
    return this.resourceInfo.get(resourceID) ?? null;
  }

  readResource(info: ResourceInfo): ArrayBuffer {
    return this.file.slice(info.start, info.start + info.size);
  }
}
