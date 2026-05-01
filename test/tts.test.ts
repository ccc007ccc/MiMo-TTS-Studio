import { describe, it, expect } from 'vitest'
import { base64ToBlob, isAbortError } from '@/api/tts'

describe('base64ToBlob', () => {
  it('decodes base64 to Blob with mp3 mime', () => {
    // "abc" base64
    const b64 = btoa('abc')
    const blob = base64ToBlob(b64, 'mp3')
    expect(blob.type).toBe('audio/mpeg')
    expect(blob.size).toBe(3)
  })

  it('decodes base64 to Blob with wav mime', () => {
    const b64 = btoa('hello')
    const blob = base64ToBlob(b64, 'wav')
    expect(blob.type).toBe('audio/wav')
    expect(blob.size).toBe(5)
  })

  it('preserves binary content', async () => {
    const original = new Uint8Array([0, 1, 2, 255, 128])
    const b64 = btoa(String.fromCharCode(...original))
    const blob = base64ToBlob(b64, 'wav')
    const buf = new Uint8Array(await blob.arrayBuffer())
    expect(Array.from(buf)).toEqual([0, 1, 2, 255, 128])
  })
})

describe('isAbortError', () => {
  it('returns true for AbortError DOMException', () => {
    const e = new DOMException('aborted', 'AbortError')
    expect(isAbortError(e)).toBe(true)
  })

  it('returns false for other errors', () => {
    expect(isAbortError(new Error('boom'))).toBe(false)
    expect(isAbortError(null)).toBe(false)
    expect(isAbortError(undefined)).toBe(false)
    expect(isAbortError('string')).toBe(false)
  })

  it('returns false for non-AbortError DOMException', () => {
    expect(isAbortError(new DOMException('x', 'NotFoundError'))).toBe(false)
  })
})
