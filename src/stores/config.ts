import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useConfigStore = defineStore('config', () => {
  const apiKey = ref(localStorage.getItem('tts_api_key') || '')
  const baseUrl = ref(localStorage.getItem('tts_base_url') || 'https://token-plan-cn.xiaomimimo.com/v1')
  const defaultFormat = ref<'wav' | 'mp3'>((localStorage.getItem('tts_default_format') as 'wav' | 'mp3') || 'wav')

  watch(apiKey, (v) => localStorage.setItem('tts_api_key', v))
  watch(baseUrl, (v) => localStorage.setItem('tts_base_url', v))
  watch(defaultFormat, (v) => localStorage.setItem('tts_default_format', v))

  return { apiKey, baseUrl, defaultFormat }
})
