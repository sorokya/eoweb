// biome-ignore-all lint:lint/style/noParameterAssign

import { FaxCode } from './fax-code';

function trailingZeros(n: number): number {
  n |= 0;
  return n ? 31 - Math.clz32(n & -n) : 0;
}

function countOnes(n: number): number {
  n = n - ((n >> 1) & 0x55555555);
  n = (n & 0x33333333) + ((n >> 2) & 0x33333333);
  return (((n + (n >> 4)) & 0x0f0f0f0f) * 0x01010101) >> 24;
}

const LOOKUP_TABLE_3_BIT_TO_8_BIT = [0, 36, 73, 109, 146, 182, 219, 255];

const LOOKUP_TABLE_4_BIT_TO_8_BIT = [
  0, 17, 34, 51, 68, 85, 102, 119, 136, 153, 170, 187, 204, 221, 238, 255,
];

const LOOKUP_TABLE_5_BIT_TO_8_BIT = [
  0, 8, 16, 25, 33, 41, 49, 58, 66, 74, 82, 90, 99, 107, 115, 123, 132, 140,
  148, 156, 165, 173, 181, 189, 197, 206, 214, 222, 230, 239, 247, 255,
];

const LOOKUP_TABLE_6_BIT_TO_8_BIT = [
  0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 45, 49, 53, 57, 61, 65, 69, 73, 77,
  81, 85, 89, 93, 97, 101, 105, 109, 113, 117, 121, 125, 130, 134, 138, 142,
  146, 150, 154, 158, 162, 166, 170, 174, 178, 182, 186, 190, 194, 198, 202,
  206, 210, 215, 219, 223, 227, 231, 235, 239, 243, 247, 251, 255,
];

const HeaderType = {
  Core: 'BITMAPCOREHEADER',
  Core2: 'BITMAPCOREHEADER2',
  Info: 'BITMAPINFOHEADER',
  V2: 'BITMAPV2INFOHEADER',
  V3: 'BITMAPV3INFOHEADER',
  V4: 'BITMAPV4HEADER',
  V5: 'BITMAPV5HEADER',
} as const;
type HeaderType = (typeof HeaderType)[keyof typeof HeaderType];

const Compression = {
  RGB: 'BI_RGB',
  RLE8: 'BI_RLE8',
  RLE4: 'BI_RLE4',
  Bitfields: 'BI_BITFIELDS',
  Huffman1D: 'BI_HUFFMAN1D',
  RLE24: 'BI_RLE24',
  JPEG: 'BI_JPEG',
  PNG: 'BI_PNG',
  AlphaBitfields: 'BI_ALPHABITFIELDS',
  CMYK: 'BI_CMYK',
  CMYKRLE8: 'BI_CMYKRLE8',
  CMYKRLE4: 'BI_CMYKRLE4',
} as const;
type Compression = (typeof Compression)[keyof typeof Compression];

class PaletteColor {
  b: number;
  g: number;
  r: number;
  constructor(b: number, g: number, r: number) {
    this.b = b;
    this.g = g;
    this.r = r;
  }
}

// Bitfield(s) implementation is based directly on the image-rs BMPDecoder
// See: https://github.com/image-rs/image/blob/v0.24.4/src/codecs/bmp/decoder.rs#L479
class Bitfield {
  length: number;
  shift: number;

  constructor(length: number, shift: number) {
    this.length = length;
    this.shift = shift;
  }

  static fromMask(mask: number, maxLength: number): Bitfield {
    if (mask === 0) {
      return new Bitfield(0, 0);
    }

    let shift = trailingZeros(mask);
    let length = trailingZeros(~(mask >>> shift));

    if (length !== countOnes(mask)) {
      throw new Error('Non-contiguous bitfield mask');
    }

    if (length + shift > maxLength) {
      throw new Error('Bitfield mask too long');
    }

    if (length > 8) {
      shift += length - 8;
      length = 8;
    }

    return new Bitfield(length, shift);
  }

  read(data: number): number {
    data = data >> this.shift;
    switch (this.length) {
      case 0:
        return 0;
      case 1:
        return (data & 0b1) * 0xff;
      case 2:
        return (data & 0b11) * 0x55;
      case 3:
        return LOOKUP_TABLE_3_BIT_TO_8_BIT[data & 0b00_0111];
      case 4:
        return LOOKUP_TABLE_4_BIT_TO_8_BIT[data & 0b00_1111];
      case 5:
        return LOOKUP_TABLE_5_BIT_TO_8_BIT[data & 0b01_1111];
      case 6:
        return LOOKUP_TABLE_6_BIT_TO_8_BIT[data & 0b11_1111];
      case 7:
        return ((data & 0x7f) << 1) | ((data & 0x7f) >> 6);
      case 8:
        return data & 0xff;
      default:
        throw new Error(`Unhandled bitfield mask length ${this.length}`);
    }
  }
}

class Bitfields {
  r: Bitfield;
  g: Bitfield;
  b: Bitfield;
  a: Bitfield;

  constructor(r: Bitfield, g: Bitfield, b: Bitfield, a: Bitfield) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }

  static fromMask(
    redMask: number,
    greenMask: number,
    blueMask: number,
    alphaMask: number,
    maxLength: number,
  ): Bitfields {
    return new Bitfields(
      Bitfield.fromMask(redMask, maxLength),
      Bitfield.fromMask(greenMask, maxLength),
      Bitfield.fromMask(blueMask, maxLength),
      Bitfield.fromMask(alphaMask, maxLength),
    );
  }
}

export class DIBReader {
  data: ArrayBuffer;
  dataView: DataView;

  headerType: HeaderType | null = null;
  compression: Compression | null = null;
  readStrategy: ReadStrategy | null = null;
  bitFields: Bitfields | null = null;
  paletteColors: PaletteColor[] | null = null;

  private initialized = false;
  transparentColor: number[];

  constructor(buffer: ArrayBuffer, transparentColor: number[]) {
    this.data = buffer;
    this.dataView = new DataView(buffer);
    this.transparentColor = transparentColor;
  }

  readUint8(position: number): number {
    return this.dataView.getUint8(position);
  }

  readUint16(position: number): number {
    return this.dataView.getUint16(position, true);
  }

  readUint32(position: number): number {
    return this.dataView.getUint32(position, true);
  }

  readInt32(position: number): number {
    return this.dataView.getInt32(position, true);
  }

  get headerSize(): number {
    return this.readUint32(0);
  }

  get width(): number {
    if (this.headerType === HeaderType.Core) {
      return this.readUint16(4);
    }
    return this.readInt32(4);
  }

  get height(): number {
    if (this.headerType === HeaderType.Core) {
      return this.readUint16(6);
    }
    return this.readInt32(8);
  }

  get planes(): number {
    if (this.headerType === HeaderType.Core) {
      return this.readUint16(8);
    }
    return this.readUint16(12);
  }

  get depth(): number {
    if (this.headerType === HeaderType.Core) {
      return this.readUint16(10);
    }
    return this.readUint16(14);
  }

  get colorsUsed(): number {
    if (this.headerSize < 36) {
      return 0;
    }
    return this.readUint32(32);
  }

  get optionalBitMasksSize(): number {
    // Present only in case the DIB header is the BITMAPINFOHEADER and the
    // Compression Method member is set to either BI_BITFIELDS or BI_ALPHABITFIELDS
    if (this.headerType === HeaderType.Info) {
      switch (this.compression) {
        case Compression.Bitfields:
          return 12;
        case Compression.AlphaBitfields:
          return 16;
        default:
        // do nothing
      }
    }
    return 0;
  }

  get paletteColorCount(): number {
    if (this.colorsUsed) {
      return this.colorsUsed;
    }
    if (this.depth <= 8) {
      return 1 << this.depth;
    }
    return 0;
  }

  get paletteSize(): number {
    const bytesPerColor = this.headerType === HeaderType.Core ? 3 : 4;
    return this.paletteColorCount * bytesPerColor;
  }

  get stride(): number {
    return ((this.width * this.depth + 31) & ~31) >> 3;
  }

  get hasRgbBitMasks(): boolean {
    switch (this.headerType) {
      case HeaderType.Core:
      case HeaderType.Core2:
        return false;
      case HeaderType.Info:
        return (
          this.compression === Compression.Bitfields ||
          this.compression === Compression.AlphaBitfields
        );
      default:
        return true;
    }
  }

  get hasAlphaBitMask(): boolean {
    switch (this.headerType) {
      case HeaderType.Core:
      case HeaderType.Core2:
      case HeaderType.V2:
        return false;
      case HeaderType.Info:
        return this.compression === Compression.AlphaBitfields;
      default:
        return true;
    }
  }

  get redMask(): number {
    return this.hasRgbBitMasks ? this.readUint32(40) : 0;
  }

  get greenMask(): number {
    return this.hasRgbBitMasks ? this.readUint32(44) : 0;
  }

  get blueMask(): number {
    return this.hasRgbBitMasks ? this.readUint32(48) : 0;
  }

  get alphaMask(): number {
    return this.hasAlphaBitMask ? this.readUint32(52) : 0;
  }

  colorFromPalette(index: number): PaletteColor {
    this.initialize();
    if (!this.paletteColors || index >= this.paletteColors.length) {
      return new PaletteColor(0, 0, 0);
    }
    return this.paletteColors[index];
  }

  private validateHeader() {
    if (
      this.dataView.byteLength < 4 ||
      this.dataView.byteLength < this.headerSize
    ) {
      throw new Error('Truncated header');
    }

    if (!Object.values(HeaderType).includes(this.headerType as HeaderType)) {
      throw new Error(`Unknown header type with size ${this.headerSize}`);
    }

    if (!Object.values(Compression).includes(this.compression as Compression)) {
      throw new Error('Unknown compression type');
    }

    if (this.width <= 0) {
      throw new Error('Image width must be positive');
    }

    if (this.height === 0) {
      throw new Error('Image height cannot be zero');
    }

    if (
      this.height < 0 &&
      (this.headerType === HeaderType.Core ||
        this.headerType === HeaderType.Core2)
    ) {
      throw new Error(`Top-down bitmaps not supported for ${this.headerType}`);
    }

    if (
      this.width > 0x40000000 ||
      this.height < -0x40000000 ||
      this.height > 0x40000000
    ) {
      throw new Error('Image dimensions out of bounds');
    }

    if (this.planes !== 1) {
      throw new Error(`Invalid number of color planes (${this.planes})`);
    }

    switch (this.headerType) {
      case HeaderType.Core:
        this.validateHeaderTypeDepth(1, 2, 4, 8, 24);
        break;
      case HeaderType.Core2:
        this.validateHeaderTypeDepth(1, 2, 4, 8, 24);
        this.validateHeaderTypeCompression(
          Compression.RGB,
          Compression.RLE8,
          Compression.RLE4,
          Compression.Huffman1D,
          Compression.RLE24,
        );
        break;
      default:
        this.validateHeaderTypeDepth(1, 2, 4, 8, 16, 24, 32);
        this.validateHeaderTypeCompression(
          Compression.RGB,
          Compression.RLE8,
          Compression.RLE4,
          Compression.Bitfields,
          Compression.JPEG,
          Compression.PNG,
          Compression.AlphaBitfields,
        );
    }

    switch (this.compression) {
      case Compression.RGB:
        this.validateCompressionDepth(1, 2, 4, 8, 16, 24, 32);
        break;
      case Compression.RLE8:
        this.validateCompressionDepth(8);
        break;
      case Compression.RLE4:
        this.validateCompressionDepth(4);
        break;
      case Compression.Bitfields:
      case Compression.AlphaBitfields:
        this.validateCompressionDepth(16, 32);
        break;
      case Compression.Huffman1D:
        this.validateCompressionDepth(1);
        break;
      case Compression.RLE24:
        this.validateCompressionDepth(24);
        break;
      default:
        throw new Error(`Unsupported compression (${this.compression})`);
    }

    if (this.colorsUsed > 1 << this.depth) {
      throw new Error(
        `Palette size ${this.paletteColorCount} exceeds maximum value for ${this.depth}-bit image`,
      );
    }
  }

  private validateHeaderTypeDepth(...allowedDepths: number[]) {
    if (!allowedDepths.includes(this.depth)) {
      throw new Error(
        `Invalid bit depth for ${this.headerType} (${this.depth})`,
      );
    }
  }

  private validateHeaderTypeCompression(...allowedCompressions: Compression[]) {
    if (!allowedCompressions.includes(this.compression as Compression)) {
      throw new Error(
        `Invalid compression for ${this.headerType} (${this.compression})`,
      );
    }
  }

  private validateCompressionDepth(...allowedDepths: number[]) {
    if (!allowedDepths.includes(this.depth)) {
      throw new Error(
        `Invalid bit depth for ${this.compression} (${this.depth})`,
      );
    }
  }

  private determineHeaderType() {
    if (this.dataView.byteLength < 4) return;

    const size = this.headerSize;

    switch (size) {
      case 12:
        this.headerType = HeaderType.Core;
        break;
      case 40:
        this.headerType = HeaderType.Info;
        break;
      case 52:
        this.headerType = HeaderType.V2;
        break;
      case 56:
        this.headerType = HeaderType.V3;
        break;
      case 108:
        this.headerType = HeaderType.V4;
        break;
      case 124:
        this.headerType = HeaderType.V5;
        break;
      default:
        if (this.detectCoreHeader2WithSizeHeuristic()) {
          this.headerType = HeaderType.Core2;
        }
    }

    if (this.detectCoreHeader2WithCompressionTypeHeuristic()) {
      this.headerType = HeaderType.Core2;
    }
  }

  private detectCoreHeader2WithSizeHeuristic(): boolean {
    const size = this.headerSize;
    // BITMAPCOREHEADER2 headers are variable-sized.
    // Any multiple of 4 between 16 and 64, or 42, or 46.
    return (
      size >= 16 && size <= 64 && (size % 4 === 0 || size === 42 || size === 46)
    );
  }

  private detectCoreHeader2WithCompressionTypeHeuristic(): boolean {
    if (this.headerSize >= 20 && this.dataView.byteLength >= 20) {
      const compression = this.readUint32(16);
      if (compression === 3 && this.depth === 1) return true; // HUFFMAN1D
      if (compression === 4 && this.depth === 24) return true; // RLE24
    }
    return false;
  }

  private determineCompression() {
    if (this.headerSize < 20) {
      this.compression = Compression.RGB;
      return;
    }

    if (this.dataView.byteLength < 20) {
      this.compression = null;
      return;
    }

    switch (this.readUint32(16)) {
      case 0:
        this.compression = Compression.RGB;
        break;
      case 1:
        this.compression = Compression.RLE8;
        break;
      case 2:
        this.compression = Compression.RLE4;
        break;
      case 3:
        this.compression =
          this.headerType === HeaderType.Core2
            ? Compression.Huffman1D
            : Compression.Bitfields;
        break;
      case 4:
        this.compression =
          this.headerType === HeaderType.Core2
            ? Compression.RLE24
            : Compression.JPEG;
        break;
      case 5:
        this.compression = Compression.PNG;
        break;
      case 6:
        this.compression = Compression.AlphaBitfields;
        break;
      case 11:
        this.compression = Compression.CMYK;
        break;
      case 12:
        this.compression = Compression.CMYKRLE8;
        break;
      case 13:
        this.compression = Compression.CMYKRLE4;
        break;
      default:
        this.compression = null;
        break;
    }
  }

  private determineReadStrategy() {
    switch (this.compression) {
      case Compression.RLE4:
      case Compression.RLE8:
      case Compression.RLE24:
        this.readStrategy = new RLEReadStrategy(this);
        return;
      case Compression.Huffman1D:
        this.readStrategy = new HuffmanReadStrategy(this);
        return;
      default:
      // do nothing
    }

    switch (this.depth) {
      case 1:
      case 2:
      case 4:
      case 8:
        this.readStrategy = new PalettedReadStrategy(this);
        break;
      case 16:
      case 24:
      case 32:
        this.readStrategy = new RGBReadStrategy(this);
        break;
      default:
        throw new Error(`Unhandled bit depth: ${this.depth}`);
    }
  }

  private decodeBitfields() {
    if (
      this.compression === Compression.Bitfields ||
      this.compression === Compression.AlphaBitfields
    ) {
      this.bitFields = Bitfields.fromMask(
        this.redMask,
        this.greenMask,
        this.blueMask,
        this.alphaMask,
        this.depth,
      );
    } else {
      switch (this.depth) {
        case 16:
          this.bitFields = Bitfields.fromMask(
            0x00007c00,
            0x000003e0,
            0x0000001f,
            0x00000000,
            this.depth,
          );
          break;
        case 24:
        case 32:
          this.bitFields = Bitfields.fromMask(
            0x00ff0000,
            0x0000ff00,
            0x000000ff,
            0x00000000,
            this.depth,
          );
          break;
      }
    }
  }

  private indexPalette() {
    if (this.depth > 8) return;

    this.paletteColors = new Array(this.paletteColorCount);
    let pos = this.headerSize + this.optionalBitMasksSize;

    for (let i = 0; i < this.paletteColors.length; ++i) {
      this.paletteColors[i] = new PaletteColor(
        this.readUint8(pos++),
        this.readUint8(pos++),
        this.readUint8(pos++),
      );

      if (this.headerType !== HeaderType.Core) {
        // rgbReserved is reserved and must be zero
        // See: https://learn.microsoft.com/en-us/windows/win32/api/wingdi/ns-wingdi-rgbquad
        pos++;
      }
    }
  }

  initialize() {
    if (this.initialized) return;
    this.determineHeaderType();
    this.determineCompression();
    this.validateHeader();
    this.determineReadStrategy();
    this.decodeBitfields();
    this.indexPalette();
    this.initialized = true;
  }

  read(): Uint8ClampedArray {
    this.initialize();
    const outputSize = this.width * Math.abs(this.height) * 4;
    const imageData = new Uint8ClampedArray(outputSize);
    this.readStrategy?.read(imageData);
    return imageData;
  }
}

abstract class ReadStrategy {
  reader: DIBReader;
  width: number;
  height: number;

  constructor(reader: DIBReader) {
    this.reader = reader;
    this.width = reader.width;
    this.height = reader.height;
  }

  abstract read(outBuffer: Uint8ClampedArray): void;

  protected getAlpha(r: number, g: number, b: number): number {
    return r !== this.reader.transparentColor[0] ||
      g !== this.reader.transparentColor[1] ||
      b !== this.reader.transparentColor[2]
      ? 0xff
      : 0x00;
  }
}

abstract class LineByLineReadStrategy extends ReadStrategy {
  read(outBuffer: Uint8ClampedArray) {
    const rowCount = Math.abs(this.height);
    const isTopDown = this.height < 0;

    for (let row = 0; row < rowCount; ++row) {
      const line = isTopDown ? row : this.height - 1 - row;
      const outPos = this.width * row * 4;
      const linePos =
        this.reader.headerSize +
        this.reader.optionalBitMasksSize +
        this.reader.paletteSize +
        this.reader.stride * line;

      this.readLine(outBuffer, outPos, linePos);
    }
  }

  abstract readLine(
    outBuffer: Uint8ClampedArray,
    outPos: number,
    linePos: number,
  ): void;
}

class RGBReadStrategy extends LineByLineReadStrategy {
  private bytesPerPixel: number;

  constructor(reader: DIBReader) {
    super(reader);
    this.bytesPerPixel = reader.depth >> 3;
  }

  readLine(outBuffer: Uint8ClampedArray, outPos: number, linePos: number) {
    for (let i = 0; i < this.width; ++i) {
      const p = this.readUint32WithZeroPadding(linePos);
      const r = this.reader.bitFields!.r.read(p);
      const g = this.reader.bitFields!.g.read(p);
      const b = this.reader.bitFields!.b.read(p);

      outBuffer[outPos++] = r;
      outBuffer[outPos++] = g;
      outBuffer[outPos++] = b;
      outBuffer[outPos++] = this.getAlpha(r, g, b);

      linePos += this.bytesPerPixel;
    }
  }

  private readUint32WithZeroPadding(position: number): number {
    if (position + 4 <= this.reader.dataView.byteLength) {
      return this.reader.readUint32(position);
    }

    const bytes = new Uint8Array([0, 0, 0, 0]);
    for (let i = 0; i < bytes.length; ++i) {
      if (position >= this.reader.dataView.byteLength) break;
      bytes[i] = this.reader.readUint8(position++);
    }

    return new DataView(bytes.buffer).getUint32(0, true);
  }
}

class PalettedReadStrategy extends LineByLineReadStrategy {
  private pixelsPerByte: number;
  private bytesPerLine: number;
  private getPaletteIndices: (byte: number) => number[];

  constructor(reader: DIBReader) {
    super(reader);
    this.pixelsPerByte = 8 / reader.depth;
    this.bytesPerLine = Math.ceil(this.width / this.pixelsPerByte);
    this.getPaletteIndices =
      PalettedReadStrategy.createGetPaletteIndicesFunction(reader.depth);
  }

  static createGetPaletteIndicesFunction(
    depth: number,
  ): (byte: number) => number[] {
    switch (depth) {
      case 1:
        return (byte) => {
          const indices = new Array(8);
          for (let i = 0; i < 8; ++i) {
            indices[7 - i] = (byte & (1 << i)) >> i;
          }
          return indices;
        };
      case 2:
        return (byte) => [
          (byte & 0xc0) >> 6,
          (byte & 0x30) >> 4,
          (byte & 0x0c) >> 2,
          byte & 0x03,
        ];
      case 4:
        return (byte) => [(byte & 0xf0) >> 4, byte & 0x0f];
      case 8:
        return (byte) => [byte];
      default:
        throw new Error(`Unhandled bit depth: ${depth}`);
    }
  }

  readLine(outBuffer: Uint8ClampedArray, outPos: number, linePos: number) {
    let written = 0;

    for (let i = 0; i < this.bytesPerLine; ++i) {
      const byte = this.readUint8WithZeroPadding(linePos);
      const paletteIndices = this.getPaletteIndices(byte);

      for (const paletteIndex of paletteIndices) {
        const color = this.reader.colorFromPalette(paletteIndex);
        const { b, g, r } = color;

        outBuffer[outPos++] = r;
        outBuffer[outPos++] = g;
        outBuffer[outPos++] = b;
        outBuffer[outPos++] = this.getAlpha(r, g, b);

        if (++written === this.width) return;
      }

      ++linePos;
    }
  }

  private readUint8WithZeroPadding(position: number): number {
    if (position < this.reader.dataView.byteLength) {
      return this.reader.readUint8(position);
    }
    return 0;
  }
}

// See: https://learn.microsoft.com/en-us/windows/win32/gdi/bitmap-compression
class RLEReadStrategy extends ReadStrategy {
  private compression: Compression;
  private setPixelGenerator: (
    this: RLEReadStrategy,
    outBuffer: Uint8ClampedArray,
  ) => Generator<void>;
  private dataPos = 0;
  private x = 0;
  private y = 0;

  constructor(reader: DIBReader) {
    super(reader);
    this.compression = reader.compression as Compression;
    this.setPixelGenerator = RLEReadStrategy.createSetPixelGeneratorFunction(
      this.compression,
    );
  }

  static createSetPixelGeneratorFunction(
    compression: Compression,
  ): (this: RLEReadStrategy, outBuffer: Uint8ClampedArray) => Generator<void> {
    switch (compression) {
      case Compression.RLE8:
        return function* (this: RLEReadStrategy, outBuffer: Uint8ClampedArray) {
          const color = this.reader.colorFromPalette(this.readUint8());
          while (true) {
            this.setPixel(color.r, color.g, color.b, outBuffer);
            yield;
          }
        };

      case Compression.RLE4:
        return function* (this: RLEReadStrategy, outBuffer: Uint8ClampedArray) {
          const indices = this.readUint8();
          let color: PaletteColor = this.reader.colorFromPalette(0);
          let i = 0;
          while (true) {
            switch (i++ % 2) {
              case 0:
                color = this.reader.colorFromPalette((indices & 0xf0) >> 4);
                break;
              case 1:
                color = this.reader.colorFromPalette(indices & 0x0f);
                break;
            }
            this.setPixel(color.r, color.g, color.b, outBuffer);
            yield;
          }
        };

      case Compression.RLE24:
        return function* (this: RLEReadStrategy, outBuffer: Uint8ClampedArray) {
          const b = this.readUint8();
          const g = this.readUint8();
          const r = this.readUint8();
          while (true) {
            this.setPixel(r, g, b, outBuffer);
            yield;
          }
        };

      default:
        throw new Error(`Unhandled RLE compression: ${compression}`);
    }
  }

  private init() {
    this.dataPos =
      this.reader.headerSize +
      this.reader.optionalBitMasksSize +
      this.reader.paletteSize;
    this.x = 0;
    this.y = 0;
  }

  private peekInstruction(): number | null {
    if (this.reader.readUint8(this.dataPos) === 0) {
      return this.reader.readUint8(this.dataPos + 1);
    }
    return null;
  }

  private validatePosition() {
    if (this.x >= this.width || this.y >= Math.abs(this.height)) {
      throw new Error('Image output position out of bounds');
    }
  }

  private offsetCursor(x: number, y: number) {
    this.x += x;
    this.y += y;
    if (this.peekInstruction() === 1) return; // End of bitmap
    this.validatePosition();
  }

  private nextLine() {
    this.x = 0;
    this.y++;
    if (this.peekInstruction() === 1) return; // End of bitmap
    this.validatePosition();
  }

  private setPixel(
    r: number,
    g: number,
    b: number,
    outBuffer: Uint8ClampedArray,
  ) {
    const isTopDown = this.height < 0;
    const line = isTopDown ? this.y : this.height - 1 - this.y;
    const pos = (this.width * line + this.x) * 4;

    outBuffer[pos + 0] = r;
    outBuffer[pos + 1] = g;
    outBuffer[pos + 2] = b;
    outBuffer[pos + 3] = this.getAlpha(r, g, b);

    this.x++;
  }

  private executeInstruction(
    instruction: number,
    outBuffer: Uint8ClampedArray,
  ): boolean {
    switch (instruction) {
      case 0: // End of line
        this.nextLine();
        break;
      case 1: // End of bitmap
        return false;
      case 2: // Delta
        this.offsetCursor(this.readUint8(), this.readUint8());
        break;
      default: {
        // Absolute mode
        this.readAbsoluteMode(instruction, outBuffer);
        break;
      }
    }
    return true;
  }

  private readAbsoluteMode(length: number, outBuffer: Uint8ClampedArray) {
    let i = 0;
    let generator: Generator<void> | null = null;

    while (i < length) {
      if (this.x === this.width) return; // Absolute mode cannot span multiple rows
      if (this.compression !== Compression.RLE4 || i % 2 === 0) {
        generator = this.setPixelGenerator.call(this, outBuffer);
      }
      generator?.next();
      ++i;
    }

    // In absolute mode, each run must be aligned on a word boundary.
    this.dataPos += this.dataPos & 1;
  }

  private readEncodedMode(length: number, outBuffer: Uint8ClampedArray) {
    const generator = this.setPixelGenerator.call(this, outBuffer);
    for (let i = 0; i < length; ++i) {
      if (this.x === this.width) {
        this.nextLine();
        break;
      }
      generator.next();
    }
  }

  read(outBuffer: Uint8ClampedArray) {
    this.init();

    while (this.dataPos < this.dataLength) {
      const controlByte = this.readUint8();
      if (controlByte === 0) {
        const instruction = this.readUint8();
        if (!this.executeInstruction(instruction, outBuffer)) break;
      } else {
        this.readEncodedMode(controlByte, outBuffer);
      }
    }
  }

  private readUint8(): number {
    try {
      return this.reader.readUint8(this.dataPos++);
    } catch {
      throw new Error('Ran out of RLE data');
    }
  }

  private get dataLength(): number {
    return this.reader.dataView.byteLength;
  }
}

const RunType = { White: 0, Black: 1 } as const;
const RunResult = { Continue: 0, EOL: 1, EOF: 2 } as const;
type RunResult = (typeof RunResult)[keyof typeof RunResult];

// Based on ReadHuffmanG31D from Clowd.Clipboard
// See: https://github.com/clowd/Clowd.Clipboard/blob/c46ff3b83a22ac05822be67266e314207e48978f/src/Clowd.Clipboard/Bitmaps/BitmapCorePixelReader.cs#L455
class HuffmanReadStrategy extends ReadStrategy {
  private dataPos = 0;
  private firstCode = true;
  private currentCode = 0;
  private bitsRemaining = 0;
  private x = 0;
  private y = 0;

  private init() {
    this.dataPos = this.reader.headerSize + this.reader.paletteSize;
    this.firstCode = true;
    this.currentCode = 0;
    this.bitsRemaining = 0;
  }

  private readCode(faxCodes: FaxCode[]): FaxCode | null {
    for (const faxCode of faxCodes) {
      while (this.bitsRemaining < faxCode.bitLength) {
        if (this.dataPos >= this.reader.dataView.byteLength) return null;
        this.currentCode <<= 8;
        this.currentCode |= this.readUint8();
        this.bitsRemaining += 8;
      }

      if (
        faxCode.code ===
        this.currentCode >>> (this.bitsRemaining - faxCode.bitLength)
      ) {
        this.bitsRemaining -= faxCode.bitLength;
        const mask = (1 << this.bitsRemaining) - 1;
        this.currentCode &= mask;

        if (this.firstCode && faxCode.runLength < 0) {
          // Sometimes the data stream starts with an EOL code, let's skip it.
          this.firstCode = false;
          return this.readCode(faxCodes);
        }

        this.firstCode = false;
        return faxCode;
      }
    }
    return null;
  }

  private readRun(
    runType: (typeof RunType)[keyof typeof RunType],
    outBuffer: Uint8ClampedArray,
  ): RunResult {
    let color: number;
    let faxCodes: FaxCode[];

    switch (runType) {
      case RunType.White:
        color = 0xff;
        faxCodes = FaxCode.WHITE_CODES;
        break;
      case RunType.Black:
        color = 0x00;
        faxCodes = FaxCode.BLACK_CODES;
        break;
      default:
        throw new Error(`Unhandled RunType: ${runType}`);
    }

    let code: FaxCode | null;

    while (true) {
      code = this.readCode(faxCodes);
      if (!code) return RunResult.EOF;

      if (code.runLength > 0) {
        let pos = (this.y * this.width + this.x) * 4;
        for (let i = 0; i < code.runLength; ++i) {
          outBuffer[pos++] = color;
          outBuffer[pos++] = color;
          outBuffer[pos++] = color;
          outBuffer[pos++] = this.getAlpha(color, color, color);
          this.x++;
        }
      }

      if (code.runLength < 64) break; // EOL or terminating code
    }

    if (code?.runLength < 0) return RunResult.EOL;
    return RunResult.Continue;
  }

  read(outBuffer: Uint8ClampedArray) {
    this.init();

    for (this.y = this.height - 1; this.y >= 0; --this.y) {
      this.x = 0;

      while (true) {
        const whiteResult = this.readRun(RunType.White, outBuffer);
        if (whiteResult === RunResult.EOL) break;
        if (whiteResult === RunResult.EOF) return;

        const blackResult = this.readRun(RunType.Black, outBuffer);
        if (blackResult === RunResult.EOL) break;
        if (blackResult === RunResult.EOF) return;
      }
    }
  }

  private readUint8(): number {
    return this.reader.readUint8(this.dataPos++);
  }
}
