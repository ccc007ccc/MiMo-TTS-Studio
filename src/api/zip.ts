// 最小 ZIP 实现（store 模式，不压缩）。音频文件本身已压缩或希望快速打包，无需 deflate。
// 兼容标准 ZIP 解压器；文件名按 UTF-8 编码（设置 General Purpose Bit Flag 第 11 位）。

interface ZipEntry {
  name: string
  data: Uint8Array
  crc32: number
  /** 写入时记录的文件偏移 */
  offset: number
  dosTime: number
  dosDate: number
}

const UTF8_FLAG = 0x0800

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    t[i] = c
  }
  return t
})()

function crc32(data: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

function dosDateTime(d: Date): { time: number; date: number } {
  const time =
    (d.getHours() << 11) |
    (d.getMinutes() << 5) |
    Math.floor(d.getSeconds() / 2)
  const date =
    ((d.getFullYear() - 1980) << 9) |
    ((d.getMonth() + 1) << 5) |
    d.getDate()
  return { time, date }
}

function strToBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

export async function createZip(files: Array<{ name: string; blob: Blob }>): Promise<Blob> {
  const now = new Date()
  const { time, date } = dosDateTime(now)

  const entries: ZipEntry[] = []
  let totalLocalSize = 0

  for (const f of files) {
    const data = new Uint8Array(await f.blob.arrayBuffer())
    const crc = crc32(data)
    const nameBytes = strToBytes(f.name)
    const localHeaderSize = 30 + nameBytes.length
    const entry: ZipEntry = {
      name: f.name,
      data,
      crc32: crc,
      offset: totalLocalSize,
      dosTime: time,
      dosDate: date,
    }
    entries.push(entry)
    totalLocalSize += localHeaderSize + data.length
  }

  // 写入本地文件块
  const parts: Uint8Array[] = []

  for (const e of entries) {
    const nameBytes = strToBytes(e.name)
    const header = new Uint8Array(30)
    const dv = new DataView(header.buffer)
    dv.setUint32(0, 0x04034b50, true) // local file header signature
    dv.setUint16(4, 20, true) // version needed
    dv.setUint16(6, UTF8_FLAG, true) // flags: UTF-8 filename
    dv.setUint16(8, 0, true) // method = store
    dv.setUint16(10, e.dosTime, true)
    dv.setUint16(12, e.dosDate, true)
    dv.setUint32(14, e.crc32, true)
    dv.setUint32(18, e.data.length, true) // compressed size
    dv.setUint32(22, e.data.length, true) // uncompressed size
    dv.setUint16(26, nameBytes.length, true)
    dv.setUint16(28, 0, true) // extra length
    parts.push(header, nameBytes, e.data)
  }

  // 写入中央目录
  const cdStart = totalLocalSize
  let cdSize = 0
  for (const e of entries) {
    const nameBytes = strToBytes(e.name)
    const cd = new Uint8Array(46)
    const dv = new DataView(cd.buffer)
    dv.setUint32(0, 0x02014b50, true) // central directory signature
    dv.setUint16(4, 20, true) // version made by
    dv.setUint16(6, 20, true) // version needed
    dv.setUint16(8, UTF8_FLAG, true) // flags: UTF-8 filename
    dv.setUint16(10, 0, true) // method
    dv.setUint16(12, e.dosTime, true)
    dv.setUint16(14, e.dosDate, true)
    dv.setUint32(16, e.crc32, true)
    dv.setUint32(20, e.data.length, true)
    dv.setUint32(24, e.data.length, true)
    dv.setUint16(28, nameBytes.length, true)
    dv.setUint16(30, 0, true) // extra
    dv.setUint16(32, 0, true) // comment
    dv.setUint16(34, 0, true) // disk number
    dv.setUint16(36, 0, true) // internal attrs
    dv.setUint32(38, 0, true) // external attrs
    dv.setUint32(42, e.offset, true) // local header offset
    parts.push(cd, nameBytes)
    cdSize += 46 + nameBytes.length
  }

  // End of central directory
  const eocd = new Uint8Array(22)
  const dv = new DataView(eocd.buffer)
  dv.setUint32(0, 0x06054b50, true) // EOCD signature
  dv.setUint16(4, 0, true) // disk number
  dv.setUint16(6, 0, true) // disk with CD
  dv.setUint16(8, entries.length, true)
  dv.setUint16(10, entries.length, true)
  dv.setUint32(12, cdSize, true)
  dv.setUint32(16, cdStart, true)
  dv.setUint16(20, 0, true) // comment length
  parts.push(eocd)

  return new Blob(parts as BlobPart[], { type: 'application/zip' })
}
