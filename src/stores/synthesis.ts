import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface HistoryItem {
  id: string
  text: string
  voice: string
  style?: string
  model: string
  format: string
  audioBase64: string
  audioUrl: string
  createdAt: number
}

export const useSynthesisStore = defineStore('synthesis', () => {
  const isGenerating = ref(false)
  const history = ref<HistoryItem[]>(JSON.parse(localStorage.getItem('tts_history') || '[]'))

  function saveHistory() {
    const lite = history.value.map(({ audioBase64, ...rest }) => rest)
    localStorage.setItem('tts_history', JSON.stringify(lite.slice(0, 3)))
  }

  function addHistory(item: HistoryItem) {
    history.value.unshift(item)
    if (history.value.length > 3) history.value.pop()
    saveHistory()
  }

  function removeHistory(id: string) {
    const idx = history.value.findIndex((h) => h.id === id)
    if (idx !== -1) {
      URL.revokeObjectURL(history.value[idx].audioUrl)
      history.value.splice(idx, 1)
      saveHistory()
    }
  }

  function clearHistory() {
    history.value.forEach((h) => URL.revokeObjectURL(h.audioUrl))
    history.value = []
    saveHistory()
  }

  return { isGenerating, history, addHistory, removeHistory, clearHistory }
})
