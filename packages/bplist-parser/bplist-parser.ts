const debug = false

const maxObjectSize = 100 * 1000 * 1000 // 100Meg
const maxObjectCount = 32768

// EPOCH = new SimpleDateFormat("yyyy MM dd zzz").parse("2001 01 01 GMT").getTime();
// ...but that's annoying in a static initializer because it can throw exceptions, ick.
// So we just hardcode the correct value.
const EPOCH = 978307200000

// UID object definition
class UID {
  constructor(public UID: number) {}
}

export const parseBuffer = function (_buffer: ArrayBuffer | ArrayBufferLike) {
  const buffer = new Uint8Array(_buffer)
  const view = new DataView(_buffer)

  // check header
  const header = String.fromCharCode(...buffer.slice(0, 'bplist'.length))
  if (header !== 'bplist') {
    throw new Error("Invalid binary plist. Expected 'bplist' at offset 0.")
  }

  // Handle trailer, last 32 bytes of the file
  const trailerOffset = buffer.byteLength - 32
  // 6 null bytes (index 0 to 5)
  const offsetSize = view.getUint8(trailerOffset + 6)
  if (debug) {
    console.log('offsetSize: ' + offsetSize)
  }
  const objectRefSize = view.getUint8(trailerOffset + 7)
  if (debug) {
    console.log('objectRefSize: ' + objectRefSize)
  }
  const numObjects = readUInt64BE(view, trailerOffset + 8)
  if (debug) {
    console.log('numObjects: ' + numObjects)
  }
  const topObject = readUInt64BE(view, trailerOffset + 16)
  if (debug) {
    console.log('topObject: ' + topObject)
  }
  const offsetTableOffset = readUInt64BE(view, trailerOffset + 24)
  if (debug) {
    console.log('offsetTableOffset: ' + offsetTableOffset)
  }

  if (numObjects > maxObjectCount) {
    throw new Error('maxObjectCount exceeded')
  }

  // Handle offset table
  const offsetTable: number[] = []

  for (let i = 0; i < numObjects; i++) {
    const offset = offsetTableOffset + i * offsetSize

    switch (offsetSize) {
      case 1:
        offsetTable.push(view.getUint8(offset))
        break
      case 2:
        offsetTable.push(view.getUint16(offset))
        break
      case 4:
        offsetTable.push(view.getUint32(offset))
        break
      case 8:
        offsetTable.push(Number(view.getBigUint64(offset)))
        break
    }
    if (debug) {
      console.log(
        'Offset for Object #' +
          i +
          ' is ' +
          offsetTable[i] +
          ' [' +
          offsetTable[i].toString(16) +
          ']',
      )
    }
  }

  // Parses an object inside the currently parsed binary property list.
  // For the format specification check
  // <a href="https://www.opensource.apple.com/source/CF/CF-635/CFBinaryPList.c">
  // Apple's binary property list parser implementation</a>.
  function parseObject(
    tableOffset: number,
  ):
    | ReturnType<typeof parseSimple>
    | ReturnType<typeof parseInteger>
    | ReturnType<typeof parseUID>
    | ReturnType<typeof parseReal>
    | ReturnType<typeof parseDate>
    | ReturnType<typeof parseData>
    | ReturnType<typeof parsePlistString>
    | ReturnType<typeof parseDictionary> {
    const offset = offsetTable[tableOffset]
    const type = view.getUint8(offset)
    const objType = (type & 0xf0) >> 4 //First  4 bits
    const objInfo = type & 0x0f //Second 4 bits
    switch (objType) {
      case 0x0:
        return parseSimple()
      case 0x1:
        return parseInteger()
      case 0x2:
        return parseReal()
      case 0x3:
        return parseDate()
      case 0x4:
        return parseData()
      case 0x5: // ASCII
        return parsePlistString()
      case 0x6: // UTF-16
        return parsePlistString(1)
      case 0x8:
        return parseUID()
      case 0xa:
        return parseArray()
      case 0xd:
        return parseDictionary()
      default:
        throw new Error('Unhandled type 0x' + objType.toString(16))
    }

    function parseSimple() {
      //Simple
      switch (objInfo) {
        case 0x0: // null
          return null
        case 0x8: // false
          return false
        case 0x9: // true
          return true
        case 0xf: // filler byte
          return null
        default:
          throw new Error('Unhandled simple type 0x' + objType.toString(16))
      }
    }

    function bufferToHexString(buffer: Uint8Array) {
      let str = ''
      let i
      for (i = 0; i < buffer.length; i++) {
        if (buffer[i] != 0x00) {
          break
        }
      }
      for (; i < buffer.length; i++) {
        const part = '00' + buffer[i].toString(16)
        str += part.substring(part.length - 2)
      }
      return str
    }

    function parseInteger() {
      const length = 1 << objInfo // 2^size
      switch (length) {
        case 1:
          return view.getInt8(offset + 1)
        case 2:
          return view.getInt16(offset + 1)
        case 4:
          return view.getInt32(offset + 1)
        case 8:
          return Number(view.getBigInt64(offset + 1))
        case 16:
          return BigInt(
            `0x${bufferToHexString(
              buffer.slice(offset + 1, offset + 1 + length),
            )}`,
          )
        default:
          throw new Error(
            'Too little heap space available! Wanted to read ' +
              length +
              ' bytes, but only ' +
              maxObjectSize +
              ' are available.',
          )
      }
    }

    function parseUID() {
      const length = objInfo + 1
      if (length < maxObjectSize) {
        return new UID(readUInt(buffer.slice(offset + 1, offset + 1 + length)))
      }
      throw new Error(
        'Too little heap space available! Wanted to read ' +
          length +
          ' bytes, but only ' +
          maxObjectSize +
          ' are available.',
      )
    }

    function parseReal() {
      const length = Math.pow(2, objInfo)

      switch (length) {
        case 4:
          return view.getFloat32(offset + 1)
        case 8:
          return view.getFloat64(offset + 1)
        default:
          throw new Error(
            'Too little heap space available! Wanted to read ' +
              length +
              ' bytes, but only ' +
              maxObjectSize +
              ' are available.',
          )
      }
    }

    function parseDate() {
      if (objInfo != 0x3) {
        console.error('Unknown date type :' + objInfo + '. Parsing anyway...')
      }
      const timestamp = view.getFloat64(offset + 1)
      return new Date(EPOCH + 1000 * timestamp)
    }

    function parseData() {
      let dataOffset = 1
      let length = objInfo
      if (objInfo == 0xf) {
        const int_type = buffer[offset + 1]
        const intType = (int_type & 0xf0) / 0x10
        if (intType != 0x1) {
          console.error('0x4: UNEXPECTED LENGTH-INT TYPE! ' + intType)
        }
        const intInfo = int_type & 0x0f
        const intLength = Math.pow(2, intInfo)
        dataOffset = 2 + intLength
        if (intLength < 3) {
          length = readUInt(buffer.slice(offset + 2, offset + 2 + intLength))
        } else {
          length = readUInt(buffer.slice(offset + 2, offset + 2 + intLength))
        }
      }
      if (length < maxObjectSize) {
        return buffer.slice(offset + dataOffset, offset + dataOffset + length)
      }
      throw new Error(
        'Too little heap space available! Wanted to read ' +
          length +
          ' bytes, but only ' +
          maxObjectSize +
          ' are available.',
      )
    }

    function parsePlistString(isUtf16: 1 | 0 = 0) {
      let enc = 'utf8'
      let length = objInfo
      let strOffset = 1
      if (objInfo == 0xf) {
        const int_type = buffer[offset + 1]
        const intType = (int_type & 0xf0) / 0x10
        if (intType != 0x1) {
          console.error('UNEXPECTED LENGTH-INT TYPE! ' + intType)
        }
        const intInfo = int_type & 0x0f
        const intLength = Math.pow(2, intInfo)
        strOffset = 2 + intLength
        if (intLength < 3) {
          length = readUInt(buffer.slice(offset + 2, offset + 2 + intLength))
        } else {
          length = readUInt(buffer.slice(offset + 2, offset + 2 + intLength))
        }
      }
      // length is String length -> to get byte length multiply by 2, as 1 character takes 2 bytes in UTF-16
      length *= isUtf16 + 1
      if (length < maxObjectSize) {
        let plistString: Uint8Array = buffer.slice(
          offset + strOffset,
          offset + strOffset + length,
        )

        if (isUtf16) {
          plistString = swapBytes(plistString)
          enc = 'utf-16'
        }
        return new TextDecoder(enc).decode(plistString)
      }
      throw new Error(
        'Too little heap space available! Wanted to read ' +
          length +
          ' bytes, but only ' +
          maxObjectSize +
          ' are available.',
      )
    }

    function parseArray() {
      let length = objInfo
      let arrayOffset = 1
      if (objInfo == 0xf) {
        const int_type = buffer[offset + 1]
        const intType = (int_type & 0xf0) / 0x10
        if (intType != 0x1) {
          console.error('0xa: UNEXPECTED LENGTH-INT TYPE! ' + intType)
        }
        const intInfo = int_type & 0x0f
        const intLength = Math.pow(2, intInfo)
        arrayOffset = 2 + intLength
        if (intLength < 3) {
          length = readUInt(buffer.slice(offset + 2, offset + 2 + intLength))
        } else {
          length = readUInt(buffer.slice(offset + 2, offset + 2 + intLength))
        }
      }
      if (length * objectRefSize > maxObjectSize) {
        throw new Error('Too little heap space available!')
      }
      const array = []
      for (let i = 0; i < length; i++) {
        const objRef = readUInt(
          buffer.slice(
            offset + arrayOffset + i * objectRefSize,
            offset + arrayOffset + (i + 1) * objectRefSize,
          ),
        )
        array[i] = parseObject(objRef)
      }
      return array
    }

    function parseDictionary() {
      let length = objInfo
      let dictOffset = 1
      if (objInfo == 0xf) {
        const int_type = buffer[offset + 1]
        const intType = (int_type & 0xf0) / 0x10
        if (intType != 0x1) {
          console.error('0xD: UNEXPECTED LENGTH-INT TYPE! ' + intType)
        }
        const intInfo = int_type & 0x0f
        const intLength = Math.pow(2, intInfo)
        dictOffset = 2 + intLength
        if (intLength < 3) {
          length = readUInt(buffer.slice(offset + 2, offset + 2 + intLength))
        } else {
          length = readUInt(buffer.slice(offset + 2, offset + 2 + intLength))
        }
      }
      if (length * 2 * objectRefSize > maxObjectSize) {
        throw new Error('Too little heap space available!')
      }
      if (debug) {
        console.log('Parsing dictionary #' + tableOffset)
      }
      const dict: Record<string, any> = {}
      for (let i = 0; i < length; i++) {
        const keyRef = readUInt(
          buffer.slice(
            offset + dictOffset + i * objectRefSize,
            offset + dictOffset + (i + 1) * objectRefSize,
          ),
        )
        const valRef = readUInt(
          buffer.slice(
            offset + dictOffset + length * objectRefSize + i * objectRefSize,
            offset +
              dictOffset +
              length * objectRefSize +
              (i + 1) * objectRefSize,
          ),
        )
        const key = parseObject(keyRef) as string
        const val = parseObject(valRef)
        if (debug) {
          console.log(
            '  DICT #' + tableOffset + ': Mapped ' + key + ' to ' + val,
          )
        }
        dict[key] = val

        if (key === 'flags' && typeof val === 'number') {
          dict[key] = parseRunTimeFlags(val)
        }
      }
      return dict
    }
  }

  return [
    parseObject(topObject) as Record<string, ReturnType<typeof parseObject>>,
  ]
}

function readUInt(buffer: Uint8Array, start: number = 0) {
  let l = 0
  for (let i = start; i < buffer.byteLength; i++) {
    l <<= 8
    l |= buffer[i] & 0xff
  }
  return l
}

// we're just going to toss the high order bits because javascript doesn't have 64-bit ints
function readUInt64BE(view: DataView, start: number) {
  return view.getUint32(start + 4)
}

function swapBytes(buffer: Uint8Array) {
  const len = buffer.length
  for (let i = 0; i < len; i += 2) {
    const a = buffer[i]
    buffer[i] = buffer[i + 1]
    buffer[i + 1] = a
  }
  return buffer
}

// https://exiftool.org/TagNames/Apple.html#RunTime
function parseRunTimeFlags(value: number) {
  const flagDefinitions = {
    0: 'Valid',
    1: 'Has been rounded',
    2: 'Positive infinity',
    3: 'Negative infinity',
    4: 'Indefinite',
  }

  for (let bit = 0; bit <= 4; bit++) {
    if (value & (1 << bit)) {
      return flagDefinitions[bit as keyof typeof flagDefinitions]
    }
  }
}
