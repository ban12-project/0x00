# @ban12/bplist-parser

[![NPM version](https://img.shields.io/npm/v/@ban12/bplist-parser.svg?style=flat-square&labelColor=000000)](https://www.npmjs.com/package/@ban12/bplist-parser)
[![NPM Unpacked Size (with version)](https://img.shields.io/npm/unpacked-size/@ban12/bplist-parser/latest?label=npm&style=flat-square&labelColor=000000)](https://www.npmjs.com/package/@ban12/bplist-parser)

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
