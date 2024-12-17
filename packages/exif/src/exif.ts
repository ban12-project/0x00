import { parseBuffer } from '@ban12/bplist-parser/bplist-parser.js'

/**  For further details, see the pages 25 and 26 of the https://www.cipa.jp/std/documents/e/DC-008-2012_E.pdf */
enum IFDTagType {
  BYTE = 1,
  ASCII = 2,
  SHORT = 3,
  LONG = 4,
  RATIONAL = 5,
  UNDEFINED = 7,
  SLONG = 9,
  SRATIONAL = 10,
  INT64U = 16,
}

const IFDTagSize: Record<IFDTagType, number> = {
  [IFDTagType.BYTE]: 1,
  [IFDTagType.ASCII]: 1,
  [IFDTagType.SHORT]: 2,
  [IFDTagType.LONG]: 4,
  [IFDTagType.RATIONAL]: 8,
  [IFDTagType.UNDEFINED]: 1,
  [IFDTagType.SLONG]: 4,
  [IFDTagType.SRATIONAL]: 8,
  [IFDTagType.INT64U]: 8,
}

export class Exif {
  private view: DataView

  private offset = 0
  // SOI (Start of Image); indicates the beginning of the image structure.
  static readonly SOI = 0xffd8

  // SOS (Start of Scan); indicates the beginning of the image-related data.
  static readonly SOS = 0xffda
  // APPn (Application-related tags); following the SOI marker, with n between 0 and F (https://exiftool.org/TagNames/JPEG.html). For example, APP11 (or 0xFFEB) is for HDR data, APP13 (or 0xFFED) for Photoshop and APP1 (or 0xFFE1) for EXIF.
  static readonly APP1 = 0xffe1
  // Skip the last two bytes 0000 and just read the four first bytes
  static readonly EXIF = 0x45786966

  static readonly LITTLE_ENDIAN = 0x4949
  static readonly BIG_ENDIAN = 0x4d4d

  static readonly TAG_ID_EXIF_SUB_IFD_POINTER = 0x8769
  static readonly MAKER_NOTE = 0x927c
  static readonly APPLE_RUN_TIME = 0x0003

  /** https://exiftool.org/TagNames/EXIF.html */
  static readonly IFDMap: Record<
    number,
    { id: number; name: string; type?: IFDTagType }
  > = {
    0x010f: {
      id: 0x010f,
      name: 'Make',
      type: IFDTagType.ASCII,
    },
    0x0110: {
      id: 0x0110,
      name: 'Model',
      type: IFDTagType.ASCII,
    },
    0x013c: {
      id: 0x013c,
      name: 'HostComputer',
      type: IFDTagType.ASCII,
    },
    0x0142: {
      id: 0x0142,
      name: 'TileWidth',
      type: IFDTagType.SHORT,
    },
    0x0143: {
      id: 0x0143,
      name: 'TileLength',
      type: IFDTagType.SHORT,
    },
  }

  /** https://exiftool.org/TagNames/Apple.html */
  static readonly MakerNoteIFDMap: Record<
    number,
    { id: number; name: string; type?: IFDTagType }
  > = {
    0x0001: {
      id: 0x0001,
      name: 'MakerNoteVersion',
      type: IFDTagType.SLONG,
    },
    0x0003: {
      id: 0x0003,
      name: 'RunTime',
    },
    0x0011: {
      id: 0x0011,
      name: 'ContentIdentifier',
      type: IFDTagType.ASCII,
    },
    0x0015: {
      id: 0x0015,
      name: 'ImageUniqueID',
      type: IFDTagType.ASCII,
    },
    0x0017: {
      id: 0x0017,
      name: 'LivePhotoVideoIndex',
      type: IFDTagType.INT64U,
    },
    0x002b: {
      id: 0x002b,
      name: 'PhotoIdentifier',
      type: IFDTagType.ASCII,
    },
  }

  private marker: number | null = null

  private isLittleEndian: boolean | undefined
  private tags: Record<
    | (typeof Exif.IFDMap)[number]['name']
    | (typeof Exif.MakerNoteIFDMap)[number]['name'],
    string | number
  > = {}

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer)
    if (this.view.getUint16(this.offset) !== Exif.SOI)
      throw new Error('not a valid JPEG')
  }

  read() {
    // The first two bytes (offset 0-1) was the SOI marker
    this.offset += 2
    while (this.marker !== Exif.SOS) {
      this.marker = this.view.getUint16(this.offset)
      const size = this.view.getUint16(this.offset + 2)
      if (
        this.marker === Exif.APP1 &&
        this.view.getUint32(this.offset + 4) === Exif.EXIF
      ) {
        // The APP1 here is at the very beginning of the file
        // So at this point offset = 2,
        // + 10 to skip to the bytes after the Exif word
        this.offset += 10

        if (this.view.getUint16(this.offset) === Exif.LITTLE_ENDIAN)
          this.isLittleEndian = true
        if (this.view.getUint16(this.offset) === Exif.BIG_ENDIAN)
          this.isLittleEndian = false
        if (typeof this.isLittleEndian === 'undefined')
          throw new Error('invalid endian')
        // From now, the endianness must be specify each time we read bytes
        // 42
        if (
          this.view.getUint16(this.offset + 2, this.isLittleEndian) !== 0x2a
        ) {
          throw new Error('invalid endian')
        }

        // At this point offset = 12
        // IFD0 offset is given by the next 4 bytes after 42
        const ifd0Offset = this.view.getUint32(
          this.offset + 4,
          this.isLittleEndian,
        )
        const ifd0TagsCount = this.view.getUint16(
          this.offset + ifd0Offset,
          this.isLittleEndian,
        )
        // IFD0 ends after the two-byte tags count word + all the tags
        const endOfIFD0TagsOffset =
          this.offset + ifd0Offset + 2 + ifd0TagsCount * 12

        // To store the Exif IFD offset
        let exifSubIfdOffset = 0
        for (
          let i = this.offset + ifd0Offset + 2;
          i < endOfIFD0TagsOffset;
          i += 12
        ) {
          // First 2 bytes = tag type
          const tagId = this.view.getUint16(i, this.isLittleEndian)

          // If ExifIFD offset tag
          if (tagId === Exif.TAG_ID_EXIF_SUB_IFD_POINTER) {
            // It's a LONG, so 4 bytes must be read
            exifSubIfdOffset = this.view.getUint32(i + 8, this.isLittleEndian)
          }

          if (!Exif.IFDMap[tagId]) continue

          const name = Exif.IFDMap[tagId].name
          const value = this.readTagValue(i, this.offset)
          this.tags[name] = value
        }

        if (exifSubIfdOffset) {
          const exifSubIfdTagsCount = this.view.getUint16(
            this.offset + exifSubIfdOffset,
            this.isLittleEndian,
          )
          // This IFD also ends after the two-byte tags count word + all the tags
          const endOfExifSubIfdTagsOffset =
            this.offset + exifSubIfdOffset + 2 + exifSubIfdTagsCount * 12
          for (
            let i = this.offset + exifSubIfdOffset + 2;
            i < endOfExifSubIfdTagsOffset;
            i += 12
          ) {
            // First 2 bytes = tag type
            const tagId = this.view.getUint16(i, this.isLittleEndian)
            const valueOffset = this.view.getUint32(i + 8, this.isLittleEndian)
            const makerNotesOffset = this.offset + valueOffset

            if (
              tagId === Exif.MAKER_NOTE &&
              this.isAppleMakerNotes(makerNotesOffset)
            ) {
              this.processAppleMakerNotes(makerNotesOffset)
            }
          }
        }

        break
      }

      // Skip the entire segment (header of 2 bytes + size of the segment)
      this.offset += 2 + size
    }

    return this.tags
  }

  private isAppleMakerNotes(offset: number) {
    const expected = [
      0x41,
      0x70,
      0x70,
      0x6c,
      0x65,
      0x20, // "Apple "
      0x69,
      0x4f,
      0x53, // "iOS"
      0x00, // "\0"
    ]
    const headerBytes = new Uint8Array(
      this.view.buffer.slice(offset, offset + 10),
    )
    return headerBytes.every((byte, i) => byte === expected[i])
  }

  private processAppleMakerNotes(baseOffset: number) {
    // Skip the first 14 bytes apple maker notes header
    const offset = baseOffset + 14

    const numEntries = this.view.getUint16(offset, this.isLittleEndian)
    let entryOffset = offset + 2

    for (let i = 0; i < numEntries; i++) {
      const tagId = this.view.getUint16(entryOffset, this.isLittleEndian)

      if (Exif.MakerNoteIFDMap[tagId]) {
        const key = Exif.MakerNoteIFDMap[tagId].name
        const value = this.readTagValue(entryOffset, baseOffset)
        this.tags[key] = value
      }

      entryOffset += 12
    }
  }

  private readTagValue(offset: number, baseOffset: number = 0) {
    const id = this.view.getUint16(offset, this.isLittleEndian)
    const type = this.view.getUint16(offset + 2, this.isLittleEndian)
    const count = this.view.getUint32(offset + 4, this.isLittleEndian)
    const value = this.view.getUint32(offset + 8, this.isLittleEndian)

    if (!IFDTagSize[type as IFDTagType])
      throw new Error(`Not supported tag type: ${type}`)
    const valueIsOffset = count * IFDTagSize[type as IFDTagType] > 4

    switch (type) {
      // @ts-expect-error - falls through
      case IFDTagType.UNDEFINED: {
        if (id === Exif.APPLE_RUN_TIME) {
          const valuePos = baseOffset + value
          const valueByOffset = this.view.buffer.slice(
            valuePos,
            valuePos + count,
          ) as ArrayBuffer
          return parseBuffer(valueByOffset) as unknown as string | number
        }
        // falls through
      }

      case IFDTagType.ASCII: {
        if (!valueIsOffset) return value
        const valuePos = baseOffset + value
        return new TextDecoder().decode(
          this.view.buffer.slice(valuePos, valuePos + count - 1) as ArrayBuffer, // -1 to remove the null terminator
        )
      }

      case IFDTagType.INT64U: {
        if (!valueIsOffset) return value
        const valuePos = baseOffset + value
        return Number(this.view.getBigUint64(valuePos, this.isLittleEndian))
      }

      default: {
        if (!valueIsOffset) return value
        const valuePos = baseOffset + value
        return new TextDecoder().decode(
          this.view.buffer.slice(valuePos, valuePos + count) as ArrayBuffer,
        )
      }
    }
  }
}
