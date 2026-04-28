<script setup lang="ts">
import { ref, computed } from 'vue'
import { useConfigStore } from '@/stores/config'
import { useSynthesisStore } from '@/stores/synthesis'
import { useVoiceStore } from '@/stores/voice'
import { synthesize, base64ToAudioUrl, downloadAudio } from '@/api/tts'
import { Layers, Loader2, Play, Download, CheckCircle, XCircle, Clock } from 'lucide-vue-next'

const config = useConfigStore()
const synthStore = useSynthesisStore()
const voiceStore = useVoiceStore()

interface BatchItem {
  id: string
  text: string
  status: 'pending' | 'processing' | 'done' | 'error'
  audioBase64?: string
  audioUrl?: string
  error?: string
}

const inputText = ref('')
const voice = ref('mimo_default')
const format = ref(config.defaultFormat)
const items = ref<BatchItem[]>([])
const isRunning = ref(false)
const currentIdx = ref(-1)

const stats = computed(() => {
  const total = items.value.length
  const done = items.value.filter((i) => i.status === 'done').length
  const errors = items.value.filter((i) => i.status === 'error').length
  return { total, done, errors, pending: total - done - errors }
})

function parseInput() {
  const lines = inputText.value.split('\n').map((l) => l.trim()).filter(Boolean)
  items.value = lines.map((text) => ({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    text,
    status: 'pending' as const,
  }))
}

async function runBatch() {
  if (!items.value.length || !config.apiKey) return
  isRunning.value = true

  for (let i = 0; i < items.value.length; i++) {
    if (!isRunning.value) break
    const item = items.value[i]
    if (item.status === 'done') continue

    currentIdx.value = i
    item.status = 'processing'

    try {
      const b64 = await synthesize({
        text: item.text,
        voice: voice.value,
        format: format.value,
        model: 'mimo-v2.5-tts',
      }, config.apiKey, config.baseUrl)

      item.audioBase64 = b64
      item.audioUrl = base64ToAudioUrl(b64, format.value)
      item.status = 'done'

      synthStore.addHistory({
        id: item.id,
        text: item.text.slice(0, 200),
        voice: voice.value,
        model: 'mimo-v2.5-tts',
        format: format.value,
        audioBase64: b64,
        audioUrl: item.audioUrl,
        createdAt: Date.now(),
      })
    } catch (e: any) {
      item.status = 'error'
      item.error = e.message
    }
  }

  isRunning.value = false
  currentIdx.value = -1
}

function stopBatch() {
  isRunning.value = false
}

function clearAll() {
  items.value.forEach((item) => {
    if (item.audioUrl) URL.revokeObjectURL(item.audioUrl)
  })
  items.value = []
  inputText.value = ''
}
</script>

<template>
  <div class="max-w-2xl mx-auto p-6 space-y-5">
    <div class="space-y-1">
      <h1 class="text-xl font-semibold flex items-center gap-2">
        <Layers :size="20" class="text-orange-400" />
        批量合成
      </h1>
      <p class="text-xs text-white/30">每行一段文本，批量生成语音</p>
    </div>

    <div v-if="!config.apiKey" class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300/80 text-xs">
      请先在设置中配置 API Key
    </div>

    <!-- Input -->
    <div class="space-y-1.5">
      <div class="flex items-center justify-between">
        <label class="text-xs text-white/50 font-medium">文本列表（每行一段）</label>
        <span class="text-[10px] text-white/20">{{ items.length }} 条</span>
      </div>
      <textarea
        v-model="inputText"
        placeholder="你好，欢迎使用 MiMo 语音合成&#10;今天天气真不错&#10;这是一段测试文本"
        rows="6"
        class="w-full bg-white/[0.02] border border-white/8 rounded-xl px-4 py-3 text-sm text-white/90 placeholder-white/20 resize-none focus:border-orange-500/30 transition-colors leading-relaxed font-mono text-xs"
      />
    </div>

    <!-- Config row -->
    <div class="flex items-center gap-3 flex-wrap">
      <select
        v-model="voice"
        class="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs appearance-none cursor-pointer"
      >
        <option v-for="v in voiceStore.voices" :key="v.id" :value="v.id" class="bg-surface-900">{{ v.name }}</option>
      </select>
      <select
        v-model="format"
        class="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs appearance-none cursor-pointer"
      >
        <option value="wav" class="bg-surface-900">WAV</option>
        <option value="mp3" class="bg-surface-900">MP3</option>
      </select>

      <div class="flex gap-2 ml-auto">
        <button
          v-if="!isRunning"
          @click="items.length ? runBatch() : (parseInput(), $nextTick(runBatch))"
          :disabled="!items.length || !config.apiKey"
          class="btn-primary flex items-center gap-2 text-xs"
        >
          <Layers :size="14" />
          {{ items.length ? '开始批量合成' : '解析并合成' }}
        </button>
        <button
          v-else
          @click="stopBatch"
          class="px-4 py-2 text-xs bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
        >
          停止
        </button>
        <button
          v-if="items.length && !isRunning"
          @click="clearAll"
          class="px-4 py-2 text-xs text-white/40 hover:text-white/60 transition-colors"
        >
          清空
        </button>
      </div>
    </div>

    <!-- Progress -->
    <div v-if="items.length" class="space-y-2">
      <div class="flex items-center gap-3 text-[10px] text-white/30">
        <span class="flex items-center gap-1"><CheckCircle :size="10" class="text-green-400" /> {{ stats.done }} 完成</span>
        <span class="flex items-center gap-1"><Clock :size="10" class="text-yellow-400" /> {{ stats.pending }} 等待</span>
        <span v-if="stats.errors" class="flex items-center gap-1"><XCircle :size="10" class="text-red-400" /> {{ stats.errors }} 失败</span>
      </div>

      <!-- Progress bar -->
      <div class="h-1 bg-white/5 rounded-full overflow-hidden">
        <div
          class="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-300"
          :style="{ width: stats.total ? ((stats.done / stats.total) * 100) + '%' : '0%' }"
        />
      </div>

      <!-- Items list -->
      <div class="space-y-1 max-h-64 overflow-y-auto">
        <div
          v-for="(item, idx) in items"
          :key="item.id"
          class="flex items-center gap-2 p-2 rounded-lg text-xs"
          :class="[
            currentIdx === idx ? 'bg-white/5 border border-white/10' : 'hover:bg-white/[0.02]',
            item.status === 'error' && 'bg-red-500/5'
          ]"
        >
          <div class="flex-shrink-0 w-5">
            <Loader2 v-if="item.status === 'processing'" :size="12" class="animate-spin text-orange-400" />
            <CheckCircle v-else-if="item.status === 'done'" :size="12" class="text-green-400" />
            <XCircle v-else-if="item.status === 'error'" :size="12" class="text-red-400" />
            <Clock v-else :size="12" class="text-white/20" />
          </div>
          <span class="flex-1 truncate" :class="item.status === 'error' ? 'text-red-400/70' : 'text-white/60'">
            {{ item.text }}
          </span>
          <button
            v-if="item.audioUrl"
            @click="downloadAudio(item.audioBase64!, format, `batch_${item.id}.${format}`)"
            class="text-white/30 hover:text-white/60 flex-shrink-0"
          >
            <Download :size="12" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
