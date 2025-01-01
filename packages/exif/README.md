# @ban12/exif

[![NPM version](https://img.shields.io/npm/v/@ban12/exif.svg?style=flat-square&labelColor=000000)](https://www.npmjs.com/package/@ban12/exif)
[![NPM Unpacked Size (with version)](https://img.shields.io/npm/unpacked-size/@ban12/exif/latest?label=npm&style=flat-square&labelColor=000000)](https://www.npmjs.com/package/@ban12/exif)

## Install

```bash
pnpm add @ban12/exif
```

## Usage

```ts
import Exif from '@ban12/exif'

const exif = new Exif(buffer)

// read exif data
exif.read()

// write exif data
exif.write(key, value)

// delete exif data
exif.delete(key)
```

## Credits

[getaround.tech](https://getaround.tech/exif-data-manipulation-javascript)
