import Jpeg from './jpeg.js'
import QuickTime from './QuickTime.js'

export interface Processor {
  read(): Record<string, string | number>
  // write(tags: Record<string, string | number>): void
  // delete(tags: string[]): void
}

export default class Exif implements Processor {
  private processor: Processor

  constructor(buffer: ArrayBuffer) {
    const view = new DataView(buffer)
    if (Jpeg.isValid(view)) {
      this.processor = new Jpeg(view)
      return
    } else if (QuickTime.isValid(view)) {
      this.processor = new QuickTime(view)
      return
    }

    throw new Error('Unsupported format')
  }

  read() {
    return this.processor.read()
  }

  // write() {
  //   this.processor.write()
  // }

  // delete() {
  //   this.processor.delete()
  // }
}
