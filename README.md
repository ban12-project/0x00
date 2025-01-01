# 0x00 - A JavaScript Binary Data Handling Library

[![License](https://img.shields.io/npm/l/@ban12/bplist-parser.svg?style=flat-square&labelColor=000000)](https://github.com/ban12-project/0x00/blob/main/LICENSE)
[![CI status](https://img.shields.io/github/actions/workflow/status/ban12-project/0x00/ci.yml?event=push&branch=main&style=flat-square&labelColor=000000)](https://github.com/ban12-project/0x00/actions/workflows/ci.yml?query=event%3Apush+branch%3Amain)

**0x00** is a lightweight JavaScript library designed for handling binary data. It provides an API for reading, writing, and manipulating binary data in both Node.js and browser environments. Here's an overview of its features, usage, and benefits:

## Key Features

- **Binary Data Manipulation**: Allows for reading and writing binary data in various formats like integers, floats, strings, and more.
- **Cross-Platform**: Works seamlessly in both Node.js and modern browsers.
- **Buffer Operations**: Provides methods to work with Node.js Buffers or ArrayBuffers in browsers.
- **Endianness Support**: Supports both big-endian and little-endian byte orders.
- **Extensibility**: Users can extend the library with custom data types or operations.

## Packages

- [@ban12/bplist-parser](packages/bplist-parser)
- [@ban12/exif](packages/exif)
