import type { Processor } from './exif.js'

interface Atom {
  size: number
  type: string
  data: ArrayBuffer
}

export default class QuickTime implements Processor {
  static readonly magicString: string[] = [
    'free',
    'skip',
    'wide',
    'ftyp',
    'pnot',
    'PICT',
    'pict',
    'moov',
    'mdat',
    'junk',
    'uuid',
  ]

  private view: DataView<ArrayBuffer>
  private offset = 0
  private tags: Record<string, string> = {}
  static decoder = new TextDecoder()

  constructor(view: DataView<ArrayBuffer>) {
    if (!QuickTime.isValid(view)) throw new Error('not a valid QuickTime')

    this.view = view
  }

  static isValid(view: DataView<ArrayBuffer>) {
    return QuickTime.magicString.some(
      (s) => QuickTime.decoder.decode(view.buffer.slice(4, 4 + s.length)) === s,
    )
  }

  read() {
    let atom = this.readAtom()
    while (atom) {
      switch (atom.type) {
        case 'ftyp': {
          this.offset -= atom.size - 8 // skip Size and Type
          this.readFileType()
          break
        }
        case 'gdat':
        case 'gps0':
        case 'gsen':
        case 'nbmt':
        case 'skip':
        case 'udta':
        case 'uuid':
        case 'moof':
        case 'moov':
        case 'meta':
        case 'traf':
        case 'htka':
        case 'trak':
        case 'meco':
        case 'mdia':
        case 'TTMD':
        case 'gpmd_Kingslim':
        case 'gpmd_Rove':
        case 'gpmd_FMAS':
        case 'gpmd_Wolfbox':
        case 'crec':
        case 'TTAD':
        case 'minf':
        case 'stbl':
        case 'stsd':
        case 'detected-face':
        case 'mebx':
        case 'cits':
        case 'keys': {
          this.offset -= atom.size - 8
          this.read()
          break
        }

        case 'mdta': {
          this.offset -= atom.size
          this.readMetadataTags()
          break
        }
      }

      atom = this.readAtom()
    }

    return this.tags
  }

  private readAtom(): Atom | null {
    if (this.offset >= this.view.byteLength) {
      return null
    }

    const size = this.view.getUint32(this.offset)
    const type = QuickTime.decoder.decode(
      this.view.buffer.slice(this.offset + 4, this.offset + 8),
    )
    const data = this.view.buffer.slice(this.offset + 8, this.offset + size)

    if (size === 0) {
      this.offset += 8 // skip empty atom size 4 bytes + type 4 bytes
    } else {
      this.offset += size
    }

    return { size, type, data }
  }

  /** https://exiftool.org/TagNames/QuickTime.html#FileType */
  private majorBrandMap = {
    '3g2a': '3GPP2 Media (.3G2) compliant with 3GPP2 C.S0050-0 V1.0',
    '3g2b': '3GPP2 Media (.3G2) compliant with 3GPP2 C.S0050-A V1.0.0',
    '3g2c': '3GPP2 Media (.3G2) compliant with 3GPP2 C.S0050-B v1.0',
    '3ge6': '3GPP (.3GP) Release 6 MBMS Extended Presentations',
    '3ge7': '3GPP (.3GP) Release 7 MBMS Extended Presentations',
    '3gg6': '3GPP Release 6 General Profile',
    '3gp1': '3GPP Media (.3GP) Release 1 (probably non-existent)',
    '3gp2': '3GPP Media (.3GP) Release 2 (probably non-existent)',
    '3gp3': '3GPP Media (.3GP) Release 3 (probably non-existent)',
    '3gp4': '3GPP Media (.3GP) Release 4',
    '3gp5': '3GPP Media (.3GP) Release 5',
    '3gp6': '3GPP Media (.3GP) Release 6 Streaming Servers',
    '3gs7': '3GPP Media (.3GP) Release 7 Streaming Servers',
    CAEP: 'Canon Digital Camera',
    CDes: 'Convergent Design',
    'F4A ': 'Audio for Adobe Flash Player 9+ (.F4A)',
    'F4B ': 'Audio Book for Adobe Flash Player 9+ (.F4B)',
    'F4P ': 'Protected Video for Adobe Flash Player 9+ (.F4P)',
    'F4V ': 'Video for Adobe Flash Player 9+ (.F4V)',
    'JP2 ': 'JPEG 2000 Image (.JP2) [ISO 15444-1 ?]',
    JP20: 'Unknown, from GPAC samples (prob non-existent)',
    KDDI: '3GPP2 EZmovie for KDDI 3G cellphones',
    'M4A ': 'Apple iTunes AAC-LC (.M4A) Audio',
    'M4B ': 'Apple iTunes AAC-LC (.M4B) Audio Book',
    'M4P ': 'Apple iTunes AAC-LC (.M4P) AES Protected Audio',
    'M4V ': 'Apple iTunes Video (.M4V) Video',
    M4VH: 'Apple TV (.M4V)',
    M4VP: 'Apple iPhone (.M4V)',
    MPPI: 'Photo Player, MAF [ISO/IEC 23000-3]',
    MSNV: 'MPEG-4 (.MP4) for SonyPSP',
    NDAS: 'MP4 v2 [ISO 14496-14] Nero Digital AAC Audio',
    NDSC: 'MPEG-4 (.MP4) Nero Cinema Profile',
    NDSH: 'MPEG-4 (.MP4) Nero HDTV Profile',
    NDSM: 'MPEG-4 (.MP4) Nero Mobile Profile',
    NDSP: 'MPEG-4 (.MP4) Nero Portable Profile',
    NDSS: 'MPEG-4 (.MP4) Nero Standard Profile',
    NDXC: 'H.264/MPEG-4 AVC (.MP4) Nero Cinema Profile',
    NDXH: 'H.264/MPEG-4 AVC (.MP4) Nero HDTV Profile',
    NDXM: 'H.264/MPEG-4 AVC (.MP4) Nero Mobile Profile',
    NDXP: 'H.264/MPEG-4 AVC (.MP4) Nero Portable Profile',
    NDXS: 'H.264/MPEG-4 AVC (.MP4) Nero Standard Profile',
    ROSS: 'Ross Video',
    XAVC: 'Sony XAVC',
    'aax ': 'Audible Enhanced Audiobook (.AAX)',
    avc1: 'MP4 Base w/ AVC ext [ISO 14496-12:2005]',
    avif: 'AV1 Image File Format (.AVIF)',
    caqv: 'Casio Digital Camera',
    'crx ': 'Canon Raw (.CRX)',
    da0a: 'DMB MAF w/ MPEG Layer II aud, MOT slides, DLS, JPG/PNG/MNG images',
    da0b: 'DMB MAF, extending DA0A, with 3GPP timed text, DID, TVA, REL, IPMP',
    da1a: 'DMB MAF audio with ER-BSAC audio, JPG/PNG/MNG images',
    da1b: 'DMB MAF, extending da1a, with 3GPP timed text, DID, TVA, REL, IPMP',
    da2a: 'DMB MAF aud w/ HE-AAC v2 aud, MOT slides, DLS, JPG/PNG/MNG images',
    da2b: 'DMB MAF, extending da2a, with 3GPP timed text, DID, TVA, REL, IPMP',
    da3a: 'DMB MAF aud with HE-AAC aud, JPG/PNG/MNG images',
    da3b: 'DMB MAF, extending da3a w/ BIFS, 3GPP timed text, DID, TVA, REL, IPMP',
    dmb1: 'DMB MAF supporting all the components defined in the specification',
    dmpf: 'Digital Media Project',
    drc1: 'Dirac (wavelet compression), encapsulated in ISO base media (MP4)',
    dv1a: 'DMB MAF vid w/ AVC vid, ER-BSAC aud, BIFS, JPG/PNG/MNG images, TS',
    dv1b: 'DMB MAF, extending dv1a, with 3GPP timed text, DID, TVA, REL, IPMP',
    dv2a: 'DMB MAF vid w/ AVC vid, HE-AAC v2 aud, BIFS, JPG/PNG/MNG images, TS',
    dv2b: 'DMB MAF, extending dv2a, with 3GPP timed text, DID, TVA, REL, IPMP',
    dv3a: 'DMB MAF vid w/ AVC vid, HE-AAC aud, BIFS, JPG/PNG/MNG images, TS',
    dv3b: 'DMB MAF, extending dv3a, with 3GPP timed text, DID, TVA, REL, IPMP',
    dvr1: 'DVB (.DVB) over RTP',
    dvt1: 'DVB (.DVB) over MPEG-2 Transport Stream',
    heic: 'High Efficiency Image Format HEVC still image (.HEIC)',
    heix: 'High Efficiency Image Format still image (.HEIF)',
    hevc: 'High Efficiency Image Format HEVC sequence (.HEICS)',
    isc2: 'ISMACryp 2.0 Encrypted File',
    iso2: 'MP4 Base Media v2 [ISO 14496-12:2005]',
    iso3: 'MP4 Base Media v3',
    iso4: 'MP4 Base Media v4',
    iso5: 'MP4 Base Media v5',
    iso6: 'MP4 Base Media v6',
    iso7: 'MP4 Base Media v7',
    iso8: 'MP4 Base Media v8',
    iso9: 'MP4 Base Media v9',
    isom: 'MP4 Base Media v1 [IS0 14496-12:2003]',
    'jpm ': 'JPEG 2000 Compound Image (.JPM) [ISO 15444-6]',
    'jpx ': 'JPEG 2000 with extensions (.JPX) [ISO 15444-2]',
    mif1: 'High Efficiency Image Format still image (.HEIF)',
    mj2s: 'Motion JPEG 2000 [ISO 15444-3] Simple Profile',
    mjp2: 'Motion JPEG 2000 [ISO 15444-3] General Profile',
    mmp4: 'MPEG-4/3GPP Mobile Profile (.MP4/3GP) (for NTT)',
    mp21: 'MPEG-21 [ISO/IEC 21000-9]',
    mp41: 'MP4 v1 [ISO 14496-1:ch13]',
    mp42: 'MP4 v2 [ISO 14496-14]',
    mp71: 'MP4 w/ MPEG-7 Metadata [per ISO 14496-12]',
    'mqt ': 'Sony / Mobile QuickTime (.MQV) US Patent 7,477,830 (Sony Corp)',
    msf1: 'High Efficiency Image Format sequence (.HEIFS)',
    odcf: 'OMA DCF DRM Format 2.0 (OMA-TS-DRM-DCF-V2_0-20060303-A)',
    opf2: 'OMA PDCF DRM Format 2.1 (OMA-TS-DRM-DCF-V2_1-20070724-C)',
    opx2: 'OMA PDCF DRM + XBS extensions (OMA-TS-DRM_XBS-V1_0-20070529-C)',
    pana: 'Panasonic Digital Camera',
    'qt  ': 'Apple QuickTime (.MOV/QT)',
    'sdv ': 'SD Memory Card Video',
    ssc1: 'Samsung stereoscopic, single stream',
    ssc2: 'Samsung stereoscopic, dual stream',
  }

  /** https://developer.apple.com/documentation/quicktime-file-format/file_type_compatibility_atom */
  private readFileType() {
    const fields = [
      {
        field: 'Major Brand',
        size: 4, // 32-bit
        format: () => {
          const value = QuickTime.decoder.decode(
            this.view.buffer.slice(this.offset, this.offset + 4),
          )

          if (!(value in this.majorBrandMap)) return value
          return this.majorBrandMap[value as keyof typeof this.majorBrandMap]
        },
      },
      {
        field: 'Minor Version',
        size: 4, // 32-bit
        format: () => {
          const year = this.view.getUint16(this.offset)
          const month = this.view.getUint8(this.offset + 2)
          return year + '.' + month
        },
      },
      {
        field: 'Compatible Brands',
        size: 4, // 32-bit
        format: () => {
          const value = QuickTime.decoder
            .decode(this.view.buffer.slice(this.offset, this.offset + 4))
            .trim()
          return value
        },
      },
    ]

    for (let i = 0; i < fields.length; i++) {
      const { field, size, format } = fields[i]
      this.tags[field] = format()
      this.offset += size
    }
  }

  private readMetadataTags() {
    const tags: { key: string; value: string }[] = []
    let atom = this.readAtom()
    while (atom) {
      // mdta include ilst
      if (atom.type === 'ilst') {
        this.offset -= atom.size - 8
        const values = this.readItemList()
        for (let i = 0; i < values.length; i++) {
          tags[i].value = values[i]
        }
      } else {
        const data = QuickTime.decoder.decode(atom.data)
        tags.push({
          key: data,
          value: '',
        })
      }

      atom = this.readAtom()
    }

    for (let i = 0; i < tags.length; i++) {
      const { key, value } = tags[i]
      this.tags[key] = value
    }
  }

  /** https://developer.apple.com/documentation/quicktime-file-format/metadata_item_list_atom */
  private readItemList() {
    const values = []

    let atom = this.readAtom()
    while (atom) {
      const data = QuickTime.decoder.decode(atom.data.slice(16))
      values.push(data)
      atom = this.readAtom()
    }

    return values
  }
}
