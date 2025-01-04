export function readInt(buffer: Uint8Array) {
  let l = 0
  for (let i = 0; i < buffer.byteLength; i++) {
    l <<= 8
    l |= buffer[i] & 0xff
  }
  return l
}
