import { describe, it, expect } from 'vitest'
import { createZip } from '@/api/zip'

function readUint32LE(view: DataView, offset: number): number {
  return view.getUint32(offset, true)
}

function readUint16LE(view: DataView, offset: number): number {
  return view.getUint16(offset, true)
}

describe('createZip', () => {
  it('produces valid local file header signature', async () => {
    const blob = new Blob(['hello'], { type: 'text/plain' })
    const zip = await createZip([{ name: 'hello.txt', blob }])
    const buf = new Uint8Array(await zip.arrayBuffer())
    const view = new DataView(buf.buffer)
    expect(readUint32LE(view, 0)).toBe(0x04034b50)
  })

  it('contains EOCD signature at end', async () => {
    const blob = new Blob(['data'], { type: 'text/plain' })
    const zip = await createZip([{ name: 'a.txt', blob }])
    const buf = new Uint8Array(await zip.arrayBuffer())
    const view = new DataView(buf.buffer)
    // EOCD is 22 bytes at end
    const eocdOffset = buf.length - 22
    expect(readUint32LE(view, eocdOffset)).toBe(0x06054b50)
  })

  it('reports correct entry count in EOCD', async () => {
    const files = [
      { name: 'a.txt', blob: new Blob(['1']) },
      { name: 'b.txt', blob: new Blob(['22']) },
      { name: 'c.txt', blob: new Blob(['333']) },
    ]
    const zip = await createZip(files)
    const buf = new Uint8Array(await zip.arrayBuffer())
    const view = new DataView(buf.buffer)
    const eocdOffset = buf.length - 22
    expect(readUint16LE(view, eocdOffset + 8)).toBe(3) // entries on this disk
    expect(readUint16LE(view, eocdOffset + 10)).toBe(3) // total entries
  })

  it('includes filenames in local headers', async () => {
    const zip = await createZip([{ name: 'foo.bin', blob: new Blob(['x']) }])
    const buf = new Uint8Array(await zip.arrayBuffer())
    const decoder = new TextDecoder()
    // skip 30-byte local header → next 7 bytes are filename "foo.bin"
    const name = decoder.decode(buf.slice(30, 37))
    expect(name).toBe('foo.bin')
  })

  it('handles empty file list', async () => {
    const zip = await createZip([])
    const buf = new Uint8Array(await zip.arrayBuffer())
    expect(buf.length).toBe(22) // just EOCD
    const view = new DataView(buf.buffer)
    expect(readUint32LE(view, 0)).toBe(0x06054b50)
    expect(readUint16LE(view, 8)).toBe(0)
  })

  it('preserves file content bytes', async () => {
    const data = new Uint8Array([0xff, 0xfe, 0x00, 0x42])
    const zip = await createZip([{ name: 'bin', blob: new Blob([data as BlobPart]) }])
    const buf = new Uint8Array(await zip.arrayBuffer())
    // local header is 30 bytes + name length (3 bytes "bin") = 33; then file data
    const start = 30 + 3
    expect(Array.from(buf.slice(start, start + 4))).toEqual([0xff, 0xfe, 0x00, 0x42])
  })

  it('mime type is application/zip', async () => {
    const zip = await createZip([{ name: 'a', blob: new Blob(['x']) }])
    expect(zip.type).toBe('application/zip')
  })

  it('sets UTF-8 flag for filename in local header', async () => {
    const zip = await createZip([{ name: '中文.mp3', blob: new Blob(['x']) }])
    const buf = new Uint8Array(await zip.arrayBuffer())
    const view = new DataView(buf.buffer)
    // local header 偏移 6 是 General Purpose Bit Flag，UTF-8 应是 0x0800
    expect(readUint16LE(view, 6)).toBe(0x0800)
  })

  it('preserves multi-byte UTF-8 filenames', async () => {
    const zip = await createZip([{ name: '中文.txt', blob: new Blob(['x']) }])
    const buf = new Uint8Array(await zip.arrayBuffer())
    const view = new DataView(buf.buffer)
    const nameLen = readUint16LE(view, 26) // local header filename length
    const decoder = new TextDecoder()
    const name = decoder.decode(buf.slice(30, 30 + nameLen))
    expect(name).toBe('中文.txt')
  })
})
