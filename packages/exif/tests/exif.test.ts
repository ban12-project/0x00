import { readFile } from 'fs/promises'
import { describe, expect, it } from 'vitest'

import Exif from '../src/exif.js'

describe('exif', async () => {
  it('should read exif from jpeg', async () => {
    const jpeg = await readFile(
      new URL('18bba191-e1e5-4a81-84bf-d464840e2d52.jpeg', import.meta.url),
    )
    console.time('read jpeg')
    const exif = new Exif(jpeg.buffer as ArrayBuffer).read()
    console.timeEnd('read jpeg')
    expect(exif).toBeDefined()
    expect(exif.Make).toBe('Apple')
    expect(exif.ContentIdentifier).toBe('CC7B5EDE-BA2E-4DD5-85EB-50D0E8F94800')
  })

  it('should read exif from mov', async () => {
    const mov = await readFile(
      new URL('18bba191-e1e5-4a81-84bf-d464840e2d52.mov', import.meta.url),
    )
    console.time('read mov')
    const exif = new Exif(mov.buffer as ArrayBuffer).read()
    console.timeEnd('read mov')
    expect(exif).toBeDefined()
    expect(exif['com.apple.quicktime.make']).toBe('Apple')
    expect(exif['com.apple.quicktime.content.identifier']).toBe(
      'CC7B5EDE-BA2E-4DD5-85EB-50D0E8F94800',
    )
  })

  it('should support live photo tags', async () => {
    const file = await readFile(
      new URL('230708_TessSug_Demo-LA_BD_iV190163.mov', import.meta.url),
    )
    console.time('read mov')
    const exif = new Exif(file.buffer as ArrayBuffer).read()
    console.timeEnd('read mov')
    expect(exif).toBeDefined()
    expect(exif['com.apple.quicktime.live-photo.auto']).toBe(1)
    expect(exif['com.apple.quicktime.live-photo.vitality-score']).toBe(
      0.9398496150970459,
    )
    expect(
      exif['com.apple.quicktime.live-photo.vitality-scoring-version'],
    ).toBe(4)
  })
})
