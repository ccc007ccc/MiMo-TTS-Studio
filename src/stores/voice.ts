import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { voiceDB, type VoiceRecord, blobToDataUri } from '@/api/storage'
import type { VoiceOption } from '@/types'

export const useVoiceStore = defineStore('voice', () => {
  const builtInVoices: VoiceOption[] = [
    { id: 'mimo_default', name: 'MiMo 默认', description: '通用高质量音色', locale: 'zh-CN', gender: 'female' },
    { id: 'default_zh', name: '默认中文', description: '中文女声', locale: 'zh-CN', gender: 'female' },
    { id: 'default_en', name: '默认英文', description: 'English female', locale: 'en-US', gender: 'female' },
    { id: '冰糖', name: '冰糖', description: '甜美活泼的女声', locale: 'zh-CN', gender: 'female' },
    { id: '茉莉', name: '茉莉', description: '温柔优雅的女声', locale: 'zh-CN', gender: 'female' },
    { id: '苏打', name: '苏打', description: '清爽自然的男声', locale: 'zh-CN', gender: 'male' },
    { id: '白桦', name: '白桦', description: '沉稳磁性的男声', locale: 'zh-CN', gender: 'male' },
    { id: 'Mia', name: 'Mia', description: 'English female voice', locale: 'en-US', gender: 'female' },
    { id: 'Chloe', name: 'Chloe', description: 'English female voice', locale: 'en-US', gender: 'female' },
    { id: 'Milo', name: 'Milo', description: 'English male voice', locale: 'en-US', gender: 'male' },
    { id: 'Dean', name: 'Dean', description: 'English male voice', locale: 'en-US', gender: 'male' },
  ]

  const customVoices = ref<VoiceOption[]>([])
  const loaded = ref(false)

  async function loadCustom() {
    if (loaded.value) return
    const records = await voiceDB.getAll()
    customVoices.value = await Promise.all(
      records.map(async (r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        locale: r.locale,
        gender: r.gender,
        custom: true,
        dataUri: await blobToDataUri(r.audioBlob),
        createdAt: r.createdAt,
      })),
    )
    loaded.value = true
  }

  async function addCustomVoice(name: string, description: string, audioBlob: Blob, locale = 'zh-CN', gender: 'male' | 'female' = 'female') {
    const id = `clone_${Date.now().toString(36)}`
    const rec: VoiceRecord = {
      id,
      name,
      description,
      locale,
      gender,
      audioBlob,
      createdAt: Date.now(),
    }
    await voiceDB.add(rec)
    const dataUri = await blobToDataUri(audioBlob)
    customVoices.value.unshift({
      id,
      name,
      description,
      locale,
      gender,
      custom: true,
      dataUri,
      createdAt: rec.createdAt,
    })
    return id
  }

  async function removeCustomVoice(id: string) {
    await voiceDB.remove(id)
    customVoices.value = customVoices.value.filter((v) => v.id !== id)
  }

  function findVoice(id: string): VoiceOption | undefined {
    return [...builtInVoices, ...customVoices.value].find((v) => v.id === id)
  }

  const voices = computed<VoiceOption[]>(() => [...builtInVoices, ...customVoices.value])

  return {
    builtInVoices,
    customVoices,
    voices,
    loadCustom,
    addCustomVoice,
    removeCustomVoice,
    findVoice,
  }
})
