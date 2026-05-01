import { defineStore } from 'pinia'
import { ref } from 'vue'
import { historyDB, type HistoryRecord } from '@/api/storage'

const MAX_HISTORY = 100

export interface HistoryView extends HistoryRecord {
  audioUrl: string
}

export const useSynthesisStore = defineStore('synthesis', () => {
  const isGenerating = ref(false)
  const history = ref<HistoryView[]>([])
  const loaded = ref(false)

  function toView(rec: HistoryRecord): HistoryView {
    return { ...rec, audioUrl: URL.createObjectURL(rec.audioBlob) }
  }

  async function loadHistory() {
    if (loaded.value) return
    const records = await historyDB.getAll()
    history.value = records.map(toView)
    loaded.value = true
  }

  async function addHistory(rec: HistoryRecord) {
    await historyDB.add(rec)
    history.value.unshift(toView(rec))
    if (history.value.length > MAX_HISTORY) {
      const trimmed = history.value.splice(MAX_HISTORY)
      trimmed.forEach((h) => URL.revokeObjectURL(h.audioUrl))
      await historyDB.trim(MAX_HISTORY)
    }
  }

  async function removeHistory(id: string) {
    const idx = history.value.findIndex((h) => h.id === id)
    if (idx !== -1) {
      URL.revokeObjectURL(history.value[idx].audioUrl)
      history.value.splice(idx, 1)
      await historyDB.remove(id)
    }
  }

  async function clearHistory() {
    history.value.forEach((h) => URL.revokeObjectURL(h.audioUrl))
    history.value = []
    await historyDB.clear()
  }

  return { isGenerating, history, loadHistory, addHistory, removeHistory, clearHistory }
})
