// 轻量 IndexedDB 封装，无第三方依赖
// 两个 store：history（合成历史，含 audioBlob）、voices（克隆音色，含 audioBlob）

const DB_NAME = 'mimo-tts'
const DB_VERSION = 1
const STORE_HISTORY = 'history'
const STORE_VOICES = 'voices'

export interface HistoryRecord {
  id: string
  text: string
  voice: string
  voiceLabel?: string
  mode: 'synth' | 'design' | 'clone'
  model: string
  format: 'wav' | 'mp3'
  audioBlob: Blob
  createdAt: number
}

export interface VoiceRecord {
  id: string
  name: string
  description: string
  locale: string
  gender: 'male' | 'female'
  audioBlob: Blob
  createdAt: number
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_HISTORY)) {
        const s = db.createObjectStore(STORE_HISTORY, { keyPath: 'id' })
        s.createIndex('createdAt', 'createdAt')
      }
      if (!db.objectStoreNames.contains(STORE_VOICES)) {
        db.createObjectStore(STORE_VOICES, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T> | Promise<T>,
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode)
        const s = t.objectStore(store)
        let result: T
        const r = fn(s)
        if (r instanceof IDBRequest) {
          r.onsuccess = () => {
            result = r.result
          }
          r.onerror = () => reject(r.error)
        } else {
          r.then((v) => {
            result = v
          }).catch(reject)
        }
        t.oncomplete = () => resolve(result)
        t.onerror = () => reject(t.error)
        t.onabort = () => reject(t.error)
      }),
  )
}

export const historyDB = {
  async add(rec: HistoryRecord): Promise<void> {
    await tx(STORE_HISTORY, 'readwrite', (s) => s.put(rec))
  },
  async getAll(): Promise<HistoryRecord[]> {
    const records = await tx<HistoryRecord[]>(STORE_HISTORY, 'readonly', (s) => s.getAll())
    return records.sort((a, b) => b.createdAt - a.createdAt)
  },
  async remove(id: string): Promise<void> {
    await tx(STORE_HISTORY, 'readwrite', (s) => s.delete(id))
  },
  async clear(): Promise<void> {
    await tx(STORE_HISTORY, 'readwrite', (s) => s.clear())
  },
  /** 限制条数，超出按时间裁剪 */
  async trim(maxCount: number): Promise<void> {
    const all = await this.getAll()
    if (all.length <= maxCount) return
    const toRemove = all.slice(maxCount)
    await Promise.all(toRemove.map((r) => this.remove(r.id)))
  },
}

export const voiceDB = {
  async add(rec: VoiceRecord): Promise<void> {
    await tx(STORE_VOICES, 'readwrite', (s) => s.put(rec))
  },
  async getAll(): Promise<VoiceRecord[]> {
    const records = await tx<VoiceRecord[]>(STORE_VOICES, 'readonly', (s) => s.getAll())
    return records.sort((a, b) => b.createdAt - a.createdAt)
  },
  async remove(id: string): Promise<void> {
    await tx(STORE_VOICES, 'readwrite', (s) => s.delete(id))
  },
  async get(id: string): Promise<VoiceRecord | undefined> {
    return tx<VoiceRecord | undefined>(STORE_VOICES, 'readonly', (s) => s.get(id))
  },
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export async function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}
