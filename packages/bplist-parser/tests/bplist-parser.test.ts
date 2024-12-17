import { readFile } from 'fs/promises'
import { describe, expect, it } from 'vitest'

import { parseBuffer } from '../bplist-parser.js'

describe('bplist-parser', async () => {
  it('iTunes Small', async function () {
    const file = await readFile(new URL('iTunes-small.bplist', import.meta.url))
    console.time('iTunes Small')

    const [dict] = parseBuffer(file.buffer)
    console.timeEnd('iTunes Small')
    expect(dict['Application Version']).toBe('9.0.3')
    expect(dict['Library Persistent ID']).toBe('6F81D37F95101437')
    expect(dict).toEqual(parseBuffer(file.buffer)[0])
  })

  it('sample1', async function () {
    const file = await readFile(new URL('sample1.bplist', import.meta.url))
    console.time('sample1')

    const [dict] = await parseBuffer(file.buffer)
    console.timeEnd('sample1')

    expect(dict['CFBundleIdentifier']).toBe('com.apple.dictionary.MySample')
    expect(dict).toEqual(parseBuffer(file.buffer)[0])
  })

  it('sample2', async function () {
    const file = await readFile(new URL('sample2.bplist', import.meta.url))
    console.time('sample2')

    const [dict] = await parseBuffer(file.buffer)
    console.timeEnd('sample2')

    // @ts-expect-error - PopupMenu is not defined in the type
    expect(dict['PopupMenu']?.[2]['Key']).toBe(
      '\n        #import <Cocoa/Cocoa.h>\n\n#import <MacRuby/MacRuby.h>\n\nint main(int argc, char *argv[])\n{\n  return macruby_main("rb_main.rb", argc, argv);\n}\n',
    )
    expect(dict).toEqual(parseBuffer(file.buffer)[0])
  })

  it('airplay', async function () {
    const file = await readFile(new URL('airplay.bplist', import.meta.url))
    console.time('airplay')

    const [dict] = await parseBuffer(file.buffer)
    console.timeEnd('airplay')

    expect(dict['duration']).toBe(5555.0495000000001)
    expect(dict['position']).toBe(4.6269989039999997)
    expect(dict).toEqual(parseBuffer(file.buffer)[0])
  })

  it('utf16', async function () {
    const file = await readFile(new URL('utf16.bplist', import.meta.url))
    console.time('utf16')

    const [dict] = await parseBuffer(file.buffer)
    console.timeEnd('utf16')

    expect(dict['CFBundleName']).toBe('sellStuff')
    expect(dict['CFBundleShortVersionString']).toBe('2.6.1')
    expect(dict['NSHumanReadableCopyright']).toBe(
      '©2008-2012, sellStuff, Inc.',
    )
    expect(dict).toEqual(parseBuffer(file.buffer)[0])
  })

  it('utf16chinese', async function () {
    const file = await readFile(new URL('utf16_chinese.plist', import.meta.url))
    console.time('utf16chinese')

    const [dict] = await parseBuffer(file.buffer)
    console.timeEnd('utf16chinese')

    expect(dict?.['CFBundleName']).toBe('天翼阅读')
    expect(dict?.['CFBundleDisplayName']).toBe('天翼阅读')
    expect(dict).toEqual(parseBuffer(file.buffer)[0])
  })

  it('uid', async function () {
    const file = await readFile(new URL('uid.bplist', import.meta.url))
    console.time('uid')

    const [dict] = await parseBuffer(file.buffer)
    console.timeEnd('uid')

    // @ts-expect-error - UID is not defined in the type
    expect(dict.$objects?.[1]['NS.keys']).deep.equal([
      { UID: 2 },
      { UID: 3 },
      { UID: 4 },
    ])
    // @ts-expect-error - UID is not defined in the type
    expect(dict.$objects?.[1]['NS.objects']).deep.equal([
      { UID: 5 },
      { UID: 6 },
      { UID: 7 },
    ])
    // @ts-expect-error - UID is not defined in the type
    expect(dict.$top?.root).deep.equal({ UID: 1 })
    expect(dict).toEqual(parseBuffer(file.buffer)[0])
  })

  it('int64', async function () {
    const file = await readFile(new URL('int64.bplist', import.meta.url))
    console.time('int64')

    const [dict] = await parseBuffer(file.buffer)
    console.timeEnd('int64')

    expect(dict['zero']).toBe(0)
    expect(dict['int32item']).toBe(1234567890)
    expect(dict['int32itemsigned']).toBe(-1234567890)
    expect(dict['int64item']).toBe(12345678901234567890n)
    expect(dict).toEqual(parseBuffer(file.buffer)[0])
  })
})
