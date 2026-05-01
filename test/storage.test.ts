import { describe, it, expect, beforeEach } from 'vitest'
import { historyDB, voiceDB, type HistoryRecord, type VoiceRecord } from '@/api/storage'

function makeHistory(id: string, createdAt: number): HistoryRecord {
  return {
    id,
    text: `text-${id}`,
    voice: 'mimo_default',
    voiceLabel: 'MiMo',
    mode: 'synth',
    model: 'mimo-v2.5-tts',
    format: 'mp3',
    audioBlob: new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/mpeg' }),
    createdAt,
  }
}

function makeVoice(id: string): VoiceRecord {
  return {
    id,
    name: `voice-${id}`,
    description: 'desc',
    locale: 'zh-CN',
    gender: 'female',
    audioBlob: new Blob([new Uint8Array([9, 9])], { type: 'audio/wav' }),
    createdAt: Date.now(),
  }
}

beforeEach(async () => {
  // 清空两个 store
  await historyDB.clear()
  const all = await voiceDB.getAll()
  for (const v of all) await voiceDB.remove(v.id)
})

describe('historyDB', () => {
  it('add then getAll returns the record', async () => {
    await historyDB.add(makeHistory('a', 100))
    const all = await historyDB.getAll()
    expect(all).toHaveLength(1)
    expect(all[0].id).toBe('a')
    expect(all[0].text).toBe('text-a')
  })

  it('getAll sorts by createdAt descending', async () => {
    await historyDB.add(makeHistory('old', 100))
    await historyDB.add(makeHistory('new', 200))
    await historyDB.add(makeHistory('mid', 150))
    const all = await historyDB.getAll()
    expect(all.map((r) => r.id)).toEqual(['new', 'mid', 'old'])
  })

  it('preserves record fields through round-trip', async () => {
    await historyDB.add(makeHistory('x', 1))
    const [r] = await historyDB.getAll()
    expect(r.id).toBe('x')
    expect(r.text).toBe('text-x')
    expect(r.format).toBe('mp3')
    // Blob 在 fake-indexeddb 下会被序列化；只断言字段存在即可
    expect(r.audioBlob).toBeDefined()
  })

  it('remove deletes a specific record', async () => {
    await historyDB.add(makeHistory('a', 1))
    await historyDB.add(makeHistory('b', 2))
    await historyDB.remove('a')
    const all = await historyDB.getAll()
    expect(all.map((r) => r.id)).toEqual(['b'])
  })

  it('clear empties the store', async () => {
    await historyDB.add(makeHistory('a', 1))
    await historyDB.add(makeHistory('b', 2))
    await historyDB.clear()
    expect(await historyDB.getAll()).toHaveLength(0)
  })

  it('trim removes oldest beyond max count', async () => {
    for (let i = 0; i < 5; i++) await historyDB.add(makeHistory(`r${i}`, i))
    await historyDB.trim(3)
    const all = await historyDB.getAll()
    expect(all).toHaveLength(3)
    expect(all.map((r) => r.id)).toEqual(['r4', 'r3', 'r2'])
  })

  it('trim is no-op when under limit', async () => {
    await historyDB.add(makeHistory('a', 1))
    await historyDB.trim(10)
    expect(await historyDB.getAll()).toHaveLength(1)
  })

  it('add with same id replaces existing record', async () => {
    await historyDB.add(makeHistory('same', 1))
    const updated = makeHistory('same', 999)
    updated.text = 'updated'
    await historyDB.add(updated)
    const all = await historyDB.getAll()
    expect(all).toHaveLength(1)
    expect(all[0].text).toBe('updated')
  })
})

describe('voiceDB', () => {
  it('add then get retrieves the voice', async () => {
    await voiceDB.add(makeVoice('v1'))
    const v = await voiceDB.get('v1')
    expect(v?.name).toBe('voice-v1')
  })

  it('get returns undefined for missing id', async () => {
    expect(await voiceDB.get('nope')).toBeUndefined()
  })

  it('getAll sorts by createdAt desc', async () => {
    const v1 = makeVoice('v1')
    v1.createdAt = 100
    const v2 = makeVoice('v2')
    v2.createdAt = 200
    await voiceDB.add(v1)
    await voiceDB.add(v2)
    const all = await voiceDB.getAll()
    expect(all.map((v) => v.id)).toEqual(['v2', 'v1'])
  })

  it('remove deletes voice', async () => {
    await voiceDB.add(makeVoice('v1'))
    await voiceDB.remove('v1')
    expect(await voiceDB.get('v1')).toBeUndefined()
  })
})
