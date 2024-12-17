import { readFile } from 'fs/promises'
import { describe, expect, it } from 'vitest'

import { Exif } from '../src/exif'

describe('exif', async () => {
  it('should read exif from jpeg', async () => {
    const jpeg = await readFile(
      new URL('18bba191-e1e5-4a81-84bf-d464840e2d52.jpeg', import.meta.url),
    )
    console.time('read jpeg')
    const exif = new Exif(jpeg.buffer).read()
    console.timeEnd('read jpeg')
    expect(exif).toBeDefined()
    expect(exif.Make).toBe('Apple')
    expect(exif.ContentIdentifier).toBe('CC7B5EDE-BA2E-4DD5-85EB-50D0E8F94800')
  })

  // it("should read exif from mov", async () => {
  //   const mov = await readFile(new URL("18bba191-e1e5-4a81-84bf-d464840e2d52.mov", import.meta.url));
  //   const exif = new Exif(mov.buffer).read();
  //   expect(exif?.Make).toBe("Apple");
  //   expect(exif?.ContentIdentifier).toBe(
  //     "CC7B5EDE-BA2E-4DD5-85EB-50D0E8F94800"
  //   );
  // });
})
