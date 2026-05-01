<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfigStore } from '@/stores/config'
import { useSynthesisStore } from '@/stores/synthesis'
import { useVoiceStore } from '@/stores/voice'
import { runSynthesis } from '@/api/synth'
import { base64ToBlob, isAbortError } from '@/api/tts'
import { createZip } from '@/api/zip'
import {
  Layers,
  Loader2,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Archive,
  Play,
  Square,
} from 'lucide-vue-next'
import type { AudioFormat, BatchItem } from '@/types'

const { t } = useI18n()
const config = useConfigStore()
const synthStore = useSynthesisStore()
const voiceStore = useVoiceStore()

const inputText = ref('')
const voice = ref('mimo_default')
const format = ref<AudioFormat>(config.defaultFormat)
const concurrency = ref(2)
const items = ref<BatchItem[]>([])
const blobs = ref<Map<string, Blob>>(new Map())
const isRunning = ref(false)
let abortController: AbortController | null = null

onMounted(async () => {
  await voiceStore.loadCustom()
})

const stats = computed(() => {
  const total = items.value.length
  const done = items.value.filter((i) => i.status === 'done').length
  const errors = items.value.filter((i) => i.status === 'error').length
  return { total, done, errors, pending: total - done - errors }
})

const hasResults = computed(() => stats.value.done > 0)

function parseInput() {
  const lines = inputText.value
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  items.value = lines.map((text) => ({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    text,
    status: 'pending' as const,
  }))
  blobs.value.clear()
}

async function processOne(item: BatchItem, signal: AbortSignal) {
  item.status = 'processing'
  item.error = undefined
  try {
    const usedVoice = item.voiceOverride || voice.value
    const b64 = await runSynthesis(
      {
        mode: 'synth',
        text: item.text,
        styleTags: [],
        format: format.value,
        voiceId: usedVoice,
      },
      config.apiKey,
      config.baseUrl,
      signal,
    )
    const blob = base64ToBlob(b64, format.value)
    blobs.value.set(item.id, blob)
    item.status = 'done'

    await synthStore.addHistory({
      id: item.id,
      text: item.text.slice(0, 200),
      voice: usedVoice,
      voiceLabel: voiceStore.findVoice(usedVoice)?.name,
      mode: 'synth',
      model: 'mimo-v2.5-tts',
      format: format.value,
      audioBlob: blob,
      createdAt: Date.now(),
    })
  } catch (e: any) {
    if (isAbortError(e)) {
      item.status = 'pending'
      return
    }
    item.status = 'error'
    const code = e.code as string | undefined
    const status = e.status
    if (code === 'requestFailed') item.error = t('errors.requestFailed', { status })
    else if (code) item.error = t(`errors.${code}`)
    else item.error = e.message || t('errors.synthFailed')
  }
}

async function runBatch(onlyFailed = false) {
  if (!items.value.length || !config.apiKey) return
  isRunning.value = true
  abortController = new AbortController()
  const signal = abortController.signal

  const queue = items.value.filter((i) =>
    onlyFailed ? i.status === 'error' : i.status !== 'done',
  )

  const limit = Math.max(1, Math.min(5, concurrency.value))
  let cursor = 0

  async function worker() {
    while (cursor < queue.length && !signal.aborted) {
      const idx = cursor++
      await processOne(queue[idx], signal)
    }
  }

  const workers = Array.from({ length: limit }, () => worker())
  await Promise.all(workers)

  isRunning.value = false
  abortController = null
}

function stopBatch() {
  abortController?.abort()
  abortController = null
  isRunning.value = false
}

function clearAll() {
  blobs.value.forEach((_, id) => {
    /* blobs 不需要 revokeObjectURL，没创建过 URL */
  })
  blobs.value.clear()
  items.value = []
  inputText.value = ''
}

function downloadOne(item: BatchItem) {
  const blob = blobs.value.get(item.id)
  if (!blob) return
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `batch_${item.id}.${format.value}`
  a.click()
  URL.revokeObjectURL(url)
}

async function downloadZip() {
  const files = items.value
    .filter((i) => i.status === 'done' && blobs.value.has(i.id))
    .map((i, idx) => ({
      name: `${String(idx + 1).padStart(3, '0')}_${sanitize(i.text.slice(0, 30))}.${format.value}`,
      blob: blobs.value.get(i.id)!,
    }))
  if (!files.length) return
  const zip = await createZip(files)
  const url = URL.createObjectURL(zip)
  const a = document.createElement('a')
  a.href = url
  a.download = `mimo_tts_batch_${Date.now()}.zip`
  a.click()
  URL.revokeObjectURL(url)
}

function sanitize(s: string): string {
  return s.replace(/[\\/:*?"<>|\s]+/g, '_')
}
</script>

<template>
  <div class="max-w-3xl mx-auto p-6 space-y-5">
    <div class="space-y-1">
      <h1 class="text-xl font-semibold flex items-center gap-2">
        <Layers :size="20" class="text-orange-400" />
        {{ t('batch.title') }}
      </h1>
      <p class="text-xs text-white/30">{{ t('batch.subtitle') }}</p>
    </div>

    <div v-if="!config.apiKey" class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300/80 text-xs">
      {{ t('studio.needApiKey') }}
    </div>

    <div class="space-y-1.5">
      <div class="flex items-center justify-between">
        <label class="text-xs text-white/50 font-medium">{{ t('batch.listLabel') }}</label>
        <span class="text-[10px] text-white/20">{{ t('batch.count', { n: items.length }) }}</span>
      </div>
      <textarea
        v-model="inputText"
        :placeholder="t('batch.listPlaceholder')"
        rows="6"
        class="w-full bg-white/[0.02] border border-white/8 rounded-xl px-4 py-3 text-sm text-white/90 placeholder-white/20 resize-none focus:border-orange-500/30 transition-colors leading-relaxed font-mono text-xs"
      />
    </div>

    <div class="flex items-center gap-3 flex-wrap">
      <label class="flex items-center gap-1.5 text-[10px] text-white/40">
        {{ t('batch.voice') }}
        <select
          v-model="voice"
          class="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs appearance-none cursor-pointer"
        >
          <option v-for="v in voiceStore.voices" :key="v.id" :value="v.id" class="bg-surface-900">{{ v.name }}</option>
        </select>
      </label>
      <label class="flex items-center gap-1.5 text-[10px] text-white/40">
        {{ t('batch.format') }}
        <select
          v-model="format"
          class="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs appearance-none cursor-pointer"
        >
          <option value="wav" class="bg-surface-900">WAV</option>
          <option value="mp3" class="bg-surface-900">MP3</option>
        </select>
      </label>
      <label class="flex items-center gap-1.5 text-[10px] text-white/40">
        {{ t('batch.concurrency') }}
        <select
          v-model.number="concurrency"
          class="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs appearance-none cursor-pointer"
        >
          <option v-for="n in [1, 2, 3, 5]" :key="n" :value="n" class="bg-surface-900">{{ n }}</option>
        </select>
      </label>

      <div class="flex gap-2 ml-auto">
        <button
          v-if="!isRunning"
          @click="items.length ? runBatch() : (parseInput(), $nextTick(() => runBatch()))"
          :disabled="!config.apiKey || (!items.length && !inputText.trim())"
          class="btn-primary flex items-center gap-2 text-xs"
        >
          <Play :size="14" />
          {{ items.length ? t('batch.start') : t('batch.parseAndStart') }}
        </button>
        <button
          v-else
          @click="stopBatch"
          class="px-4 py-2 text-xs bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 flex items-center gap-1.5 transition-colors"
        >
          <Square :size="12" />
          {{ t('batch.stop') }}
        </button>
        <button
          v-if="stats.errors && !isRunning"
          @click="runBatch(true)"
          class="px-3 py-2 text-xs bg-amber-500/15 text-amber-400 rounded-lg hover:bg-amber-500/25 flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw :size="12" />
          {{ t('batch.retryFailed', { n: stats.errors }) }}
        </button>
        <button
          v-if="hasResults && !isRunning"
          @click="downloadZip"
          class="px-3 py-2 text-xs bg-green-500/15 text-green-400 rounded-lg hover:bg-green-500/25 flex items-center gap-1.5 transition-colors"
        >
          <Archive :size="12" />
          {{ t('batch.downloadZip') }}
        </button>
        <button
          v-if="items.length && !isRunning"
          @click="clearAll"
          class="px-3 py-2 text-xs text-white/40 hover:text-white/60 transition-colors"
        >
          {{ t('batch.clearAll') }}
        </button>
      </div>
    </div>

    <div v-if="items.length" class="space-y-2">
      <div class="flex items-center gap-3 text-[10px] text-white/30">
        <span class="flex items-center gap-1"><CheckCircle :size="10" class="text-green-400" /> {{ t('batch.done', { n: stats.done }) }}</span>
        <span class="flex items-center gap-1"><Clock :size="10" class="text-yellow-400" /> {{ t('batch.pending', { n: stats.pending }) }}</span>
        <span v-if="stats.errors" class="flex items-center gap-1"><XCircle :size="10" class="text-red-400" /> {{ t('batch.errors', { n: stats.errors }) }}</span>
        <span class="ml-auto font-mono">{{ Math.round((stats.done / stats.total) * 100) || 0 }}%</span>
      </div>

      <div class="h-1 bg-white/5 rounded-full overflow-hidden">
        <div
          class="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-300"
          :style="{ width: stats.total ? ((stats.done / stats.total) * 100) + '%' : '0%' }"
        />
      </div>

      <div class="space-y-1 max-h-80 overflow-y-auto">
        <div
          v-for="item in items"
          :key="item.id"
          class="flex items-center gap-2 p-2 rounded-lg text-xs"
          :class="[
            item.status === 'processing' && 'bg-white/5 border border-white/10',
            item.status === 'error' && 'bg-red-500/5'
          ]"
        >
          <div class="flex-shrink-0 w-5">
            <Loader2 v-if="item.status === 'processing'" :size="12" class="animate-spin text-orange-400" />
            <CheckCircle v-else-if="item.status === 'done'" :size="12" class="text-green-400" />
            <XCircle v-else-if="item.status === 'error'" :size="12" class="text-red-400" />
            <Clock v-else :size="12" class="text-white/20" />
          </div>
          <span class="flex-1 truncate" :class="item.status === 'error' ? 'text-red-400/70' : 'text-white/60'" :title="item.error || item.text">
            {{ item.text }}
          </span>
          <button
            v-if="item.status === 'done'"
            @click="downloadOne(item)"
            class="text-white/30 hover:text-white/60 flex-shrink-0"
          >
            <Download :size="12" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
