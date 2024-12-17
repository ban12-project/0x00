[https://github.com/joeferner/node-bplist-parser/blob/master/bplistParser.js](https://github.com/joeferner/node-bplist-parser/blob/master/bplistParser.js)

## Usage

### in browser

```ts
import { parseBuffer } from '@ban12/bplist-parser'

const buffer = new Uint8Array(
  await fetch('https://example.com/file.plist').then((r) => r.arrayBuffer()),
)
const result = parseBuffer(buffer)
```

### in node

```ts
import { readFile } from 'fs/promises'
import { parseBuffer } from '@ban12/bplist-parser'

const file = await readFile(new URL('file.plist', import.meta.url))
const result = parseBuffer(file.buffer)
```
