import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface VoiceOption {
  id: string
  name: string
  description: string
  locale: string
  gender: string
}

export const useVoiceStore = defineStore('voice', () => {
  const builtInVoices: VoiceOption[] = [
    { id: 'mimo_default', name: 'MiMo 默认', description: '通用高质量音色', locale: 'zh-CN', gender: 'female' },
    { id: '冰糖', name: '冰糖', description: '甜美活泼的女声', locale: 'zh-CN', gender: 'female' },
    { id: '茉莉', name: '茉莉', description: '温柔优雅的女声', locale: 'zh-CN', gender: 'female' },
    { id: '苏打', name: '苏打', description: '清爽自然的女声', locale: 'zh-CN', gender: 'female' },
    { id: '白桦', name: '白桦', description: '沉稳磁性的男声', locale: 'zh-CN', gender: 'male' },
    { id: 'Mia', name: 'Mia', description: 'English female voice', locale: 'en-US', gender: 'female' },
    { id: 'Chloe', name: 'Chloe', description: 'English female voice', locale: 'en-US', gender: 'female' },
    { id: 'Milo', name: 'Milo', description: 'English male voice', locale: 'en-US', gender: 'male' },
    { id: 'Dean', name: 'Dean', description: 'English male voice', locale: 'en-US', gender: 'male' },
  ]

  const customVoices = ref<VoiceOption[]>(JSON.parse(localStorage.getItem('tts_custom_voices') || '[]'))
  const voices = ref([...builtInVoices, ...customVoices.value])

  function addCustomVoice(voice: VoiceOption) {
    customVoices.value.push(voice)
    voices.value = [...builtInVoices, ...customVoices.value]
    localStorage.setItem('tts_custom_voices', JSON.stringify(customVoices.value))
  }

  function removeCustomVoice(id: string) {
    customVoices.value = customVoices.value.filter((v) => v.id !== id)
    voices.value = [...builtInVoices, ...customVoices.value]
    localStorage.setItem('tts_custom_voices', JSON.stringify(customVoices.value))
  }

  return { voices, addCustomVoice, removeCustomVoice }
})
