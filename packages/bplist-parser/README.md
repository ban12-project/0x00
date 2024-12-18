## Install

```bash
pnpm add @ban12/bplist-parser
```

## Usage

### Browser

```ts
import { parseBuffer } from '@ban12/bplist-parser'

const buffer = await fetch('https://example.com/file.plist').then((r) =>
  r.arrayBuffer(),
)
const result = parseBuffer(buffer)
```

### Node.js

```ts
import { readFile } from 'fs/promises'
import { parseBuffer } from '@ban12/bplist-parser'

const file = await readFile(new URL('file.plist', import.meta.url))
const result = parseBuffer(file.buffer)
```

adapted from [node-bplist-parser](https://github.com/joeferner/node-bplist-parser/blob/master/bplistParser.js)
