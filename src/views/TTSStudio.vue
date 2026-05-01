<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfigStore } from '@/stores/config'
import { useSynthesisStore } from '@/stores/synthesis'
import { useVoiceStore } from '@/stores/voice'
import { runSynthesis, buildDirectorPrompt } from '@/api/synth'
import { base64ToBlob, isAbortError } from '@/api/tts'
import { blobToDataUri } from '@/api/storage'
import { useWaveform } from '@/composables/useWaveform'
import { useRecorder } from '@/composables/useRecorder'
import StylePanel from '@/components/synth/StylePanel.vue'
import VoiceSelector from '@/components/synth/VoiceSelector.vue'
import AudioPlayer from '@/components/player/AudioPlayer.vue'
import {
  Sparkles,
  Wand2,
  Mic,
  Upload,
  Circle,
  Square,
  Save,
  X,
} from 'lucide-vue-next'
import type { AudioFormat, DirectorScript, Mode } from '@/types'

const { t } = useI18n()
const config = useConfigStore()
const synthStore = useSynthesisStore()
const voiceStore = useVoiceStore()
const { waveformData, analyze } = useWaveform()
const recorder = useRecorder()

const activeTab = ref<Mode>('synth')
const tabs = [
  { id: 'synth' as const, key: 'synth', icon: Sparkles },
  { id: 'design' as const, key: 'design', icon: Wand2 },
  { id: 'clone' as const, key: 'clone', icon: Mic },
]

const text = ref('')
const format = ref<AudioFormat>(config.defaultFormat)
const naturalLang = ref('')
const styleTags = ref<string[]>([])
const director = ref<DirectorScript>({ enabled: false, character: '', scene: '', direction: '' })
const resultUrl = ref('')
const resultBase64 = ref('')
const error = ref('')
const textareaRef = ref<HTMLTextAreaElement>()

const voice = ref('mimo_default')
const description = ref('')

// 克隆相关
const referenceFile = ref<File | null>(null)
const referenceDataUri = ref('')
const dragOver = ref(false)
const cloneName = ref('')
const cloneDesc = ref('')
const showSaveCloneDialog = ref(false)

let abortController: AbortController | null = null

onMounted(async () => {
  await Promise.all([synthStore.loadHistory(), voiceStore.loadCustom()])
})

const canGenerate = computed(() => {
  if (!text.value.trim() || !config.apiKey || synthStore.isGenerating) return false
  if (activeTab.value === 'design' && !description.value.trim()) return false
  if (activeTab.value === 'clone' && !referenceDataUri.value) return false
  return true
})

const charCount = computed(() => text.value.length)

function insertAudioTag(tag: string) {
  const el = textareaRef.value
  if (!el) {
    text.value += tag
    return
  }
  const start = el.selectionStart
  const end = el.selectionEnd
  const before = text.value.slice(0, start)
  const after = text.value.slice(end)
  text.value = before + tag + after
  nextTick(() => {
    el.selectionStart = el.selectionEnd = start + tag.length
    el.focus()
  })
}

function handleFileDrop(e: DragEvent) {
  e.preventDefault()
  dragOver.value = false
  const file = e.dataTransfer?.files[0]
  if (file) processFile(file)
}

function handleFileSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) processFile(file)
}

async function processFile(file: File) {
  if (!file.type.startsWith('audio/')) {
    error.value = t('errors.audioOnly')
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    error.value = t('errors.fileTooLarge')
    return
  }
  referenceFile.value = file
  error.value = ''
  referenceDataUri.value = await blobToDataUri(file)
}

function clearReference() {
  referenceFile.value = null
  referenceDataUri.value = ''
  recorder.reset()
}

async function startRecord() {
  await recorder.start()
}

async function stopRecord() {
  recorder.stop()
  // 等待 onstop 回调完成
  await new Promise((r) => setTimeout(r, 200))
  if (recorder.recordedBlob.value) {
    referenceFile.value = new File([recorder.recordedBlob.value], 'recording.wav', { type: 'audio/wav' })
    referenceDataUri.value = await blobToDataUri(recorder.recordedBlob.value)
  }
}

const recordedUrl = computed(() => {
  if (!recorder.recordedBlob.value) return ''
  return URL.createObjectURL(recorder.recordedBlob.value)
})

async function saveCloneVoice() {
  if (!referenceFile.value || !cloneName.value.trim()) return
  await voiceStore.addCustomVoice(
    cloneName.value.trim(),
    cloneDesc.value.trim() || '自定义克隆音色',
    referenceFile.value,
  )
  showSaveCloneDialog.value = false
  cloneName.value = ''
  cloneDesc.value = ''
}

function getUserContent(): string | undefined {
  if (activeTab.value === 'design') return description.value
  if (director.value.enabled) {
    const dp = buildDirectorPrompt(director.value, '')
    return dp || undefined
  }
  return naturalLang.value.trim() || undefined
}

async function generate() {
  if (!canGenerate.value) return
  error.value = ''
  synthStore.isGenerating = true
  resultUrl.value = ''
  resultBase64.value = ''
  abortController = new AbortController()

  try {
    const b64 = await runSynthesis(
      {
        mode: activeTab.value,
        text: text.value,
        styleTags: styleTags.value,
        format: format.value,
        voiceId: activeTab.value === 'synth' ? voice.value : undefined,
        cloneDataUri: activeTab.value === 'clone' ? referenceDataUri.value : undefined,
        userContent: getUserContent(),
      },
      config.apiKey,
      config.baseUrl,
      abortController.signal,
    )

    resultBase64.value = b64
    if (resultUrl.value) URL.revokeObjectURL(resultUrl.value)
    const blob = base64ToBlob(b64, format.value)
    resultUrl.value = URL.createObjectURL(blob)
    await analyze(b64)

    const usedVoiceId =
      activeTab.value === 'synth' ? voice.value : activeTab.value === 'clone' ? 'clone:reference' : 'design:generated'

    await synthStore.addHistory({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      text: text.value.slice(0, 200),
      voice: usedVoiceId,
      voiceLabel: voiceStore.findVoice(voice.value)?.name,
      mode: activeTab.value,
      model:
        activeTab.value === 'synth'
          ? 'mimo-v2.5-tts'
          : activeTab.value === 'design'
            ? 'mimo-v2.5-tts-voicedesign'
            : 'mimo-v2.5-tts-voiceclone',
      format: format.value,
      audioBlob: blob,
      createdAt: Date.now(),
    })
  } catch (e: any) {
    if (!isAbortError(e)) {
      const code = e.code as string | undefined
      const status = e.status
      if (code === 'requestFailed') error.value = t('errors.requestFailed', { status })
      else if (code) error.value = t(`errors.${code}`)
      else error.value = e.message || t('errors.synthFailed')
    }
  } finally {
    synthStore.isGenerating = false
    abortController = null
  }
}

function cancel() {
  abortController?.abort()
}

function handleKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    generate()
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto p-6 space-y-5">
    <div class="flex items-center gap-1 p-1 bg-white/[0.03] rounded-xl border border-white/5">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="activeTab = tab.id"
        class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-all"
        :class="activeTab === tab.id
          ? 'bg-primary-500/15 text-primary-400 border border-primary-500/20'
          : 'text-white/40 hover:text-white/60 border border-transparent'"
      >
        <component :is="tab.icon" :size="15" />
        {{ t(`tabs.${tab.key}`) }}
      </button>
    </div>

    <div v-if="!config.apiKey" class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300/80 text-xs">
      {{ t('studio.needApiKey') }}
    </div>

    <StylePanel
      v-model:naturalLang="naturalLang"
      v-model:styleTags="styleTags"
      v-model:director="director"
      :support-singing="activeTab === 'synth'"
      @insert-audio-tag="insertAudioTag"
    />

    <div class="space-y-1.5">
      <div class="flex items-center justify-between">
        <label class="text-xs text-white/50 font-medium">{{ t('studio.text') }}</label>
        <span class="text-[10px] text-white/20 font-mono">{{ t('studio.chars', { n: charCount }) }}</span>
      </div>
      <textarea
        ref="textareaRef"
        v-model="text"
        @keydown="handleKeydown"
        :placeholder="t('studio.placeholder')"
        :rows="6"
        class="w-full bg-white/[0.02] border border-white/8 rounded-xl px-4 py-3 text-sm text-white/90 placeholder-white/20 resize-none focus:border-primary-500/30 transition-colors leading-relaxed"
      />
    </div>

    <VoiceSelector v-if="activeTab === 'synth'" v-model="voice" />

    <div v-if="activeTab === 'design'" class="space-y-1.5">
      <label class="text-xs text-white/50 font-medium">{{ t('studio.descriptionLabel') }}</label>
      <textarea
        v-model="description"
        :placeholder="t('studio.descriptionPlaceholder')"
        rows="3"
        class="w-full bg-white/[0.02] border border-white/8 rounded-xl px-4 py-3 text-sm text-white/90 placeholder-white/20 resize-none focus:border-purple-500/30 transition-colors leading-relaxed"
      />
      <p class="text-[10px] text-white/20">{{ t('studio.descriptionHint') }}</p>
    </div>

    <div v-if="activeTab === 'clone'" class="space-y-2">
      <label class="text-xs text-white/50 font-medium">{{ t('studio.referenceLabel') }}</label>

      <div
        @dragover.prevent="dragOver = true"
        @dragleave="dragOver = false"
        @drop="handleFileDrop"
        class="relative border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer"
        :class="dragOver ? 'border-green-500/50 bg-green-500/5' : 'border-white/10 hover:border-white/20'"
      >
        <input
          type="file"
          accept="audio/mp3,audio/wav,audio/mpeg,audio/x-wav"
          @change="handleFileSelect"
          class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <Upload :size="18" class="mx-auto mb-1 text-white/20" />
        <p v-if="!referenceFile" class="text-xs text-white/40">
          {{ t('studio.dropHint') }}<span class="text-green-400">{{ t('studio.clickUpload') }}</span>
          <span class="text-white/20">{{ t('studio.fileLimit') }}</span>
        </p>
        <div v-else class="flex items-center justify-center gap-2">
          <p class="text-xs text-green-400/80">{{ referenceFile.name }}</p>
          <button @click.stop="clearReference" class="text-[10px] text-red-400/60 hover:text-red-400">{{ t('studio.clear') }}</button>
        </div>
      </div>

      <div class="flex items-center gap-2 text-[10px] text-white/20">
        <div class="flex-1 border-t border-white/5" />
        <span>{{ t('studio.or') }}</span>
        <div class="flex-1 border-t border-white/5" />
      </div>

      <div class="space-y-2">
        <div class="flex items-center gap-3">
          <button
            v-if="!recorder.isRecording.value"
            @click="startRecord"
            class="flex items-center gap-2 px-4 py-2 rounded-lg text-xs bg-white/5 border border-white/10 text-white/50 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 transition-all"
          >
            <Circle :size="12" class="fill-current" />
            {{ t('studio.record', { n: recorder.maxDuration }) }}
          </button>
          <button
            v-else
            @click="stopRecord"
            class="flex items-center gap-2 px-4 py-2 rounded-lg text-xs bg-red-500/15 border border-red-500/30 text-red-400 transition-all"
          >
            <Square :size="10" class="fill-current" />
            {{ t('studio.stop', { cur: recorder.duration.value, max: recorder.maxDuration }) }}
          </button>

          <div v-if="recorder.isRecording.value" class="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-red-500 to-amber-500 rounded-full transition-all duration-100"
              :style="{ width: Math.min(100, recorder.audioLevel.value * 200) + '%' }"
            />
          </div>

          <audio v-if="recordedUrl && !recorder.isRecording.value" :src="recordedUrl" controls class="h-8 flex-1" />
        </div>

        <div v-if="referenceFile && !recorder.isRecording.value" class="flex items-center justify-between text-[10px] text-white/30">
          <span>{{ t('studio.referenceLoaded') }}</span>
          <button
            @click="showSaveCloneDialog = true"
            class="flex items-center gap-1 text-primary-400/70 hover:text-primary-400 transition-colors"
          >
            <Save :size="11" />
            {{ t('studio.saveAsClone') }}
          </button>
        </div>
      </div>

      <p v-if="recorder.error.value" class="text-[10px] text-red-400/70">{{ t(`errors.${recorder.error.value}`) }}</p>
    </div>

    <div class="flex items-center gap-3">
      <select
        v-model="format"
        class="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs appearance-none cursor-pointer focus:border-primary-500/50 transition-colors"
      >
        <option value="wav" class="bg-surface-900">WAV</option>
        <option value="mp3" class="bg-surface-900">MP3</option>
      </select>

      <button
        v-if="synthStore.isGenerating"
        @click="cancel"
        class="ml-auto px-4 py-2 text-sm bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 flex items-center gap-2 transition-colors"
      >
        <Square :size="14" />
        {{ t('studio.cancel') }}
      </button>
      <button
        v-else
        @click="generate"
        :disabled="!canGenerate"
        class="btn-primary flex items-center gap-2 text-sm ml-auto"
      >
        <Sparkles :size="16" />
        {{ t('studio.generate') }}
      </button>
    </div>

    <div v-if="error" class="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400/80 text-xs">
      {{ error }}
    </div>

    <transition name="fade">
      <div v-if="resultUrl" class="space-y-2">
        <label class="text-xs text-white/50 font-medium">{{ t('studio.result') }}</label>
        <AudioPlayer
          :audio-url="resultUrl"
          :audio-base64="resultBase64"
          :format="format"
          :waveformData="waveformData"
        />
      </div>
    </transition>

    <teleport to="body">
      <transition name="fade">
        <div v-if="showSaveCloneDialog" class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="fixed inset-0 bg-black/60 backdrop-blur-sm" @click="showSaveCloneDialog = false" />
          <div class="relative w-full max-w-md mx-4 glass rounded-2xl p-5 space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-semibold">{{ t('studio.saveDialogTitle') }}</h3>
              <button @click="showSaveCloneDialog = false" class="text-white/40 hover:text-white/70">
                <X :size="16" />
              </button>
            </div>
            <div class="space-y-2">
              <input
                v-model="cloneName"
                :placeholder="t('studio.voiceName')"
                class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:border-primary-500/50"
              />
              <input
                v-model="cloneDesc"
                :placeholder="t('studio.voiceDesc')"
                class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:border-primary-500/50"
              />
            </div>
            <div class="flex justify-end gap-2">
              <button
                @click="showSaveCloneDialog = false"
                class="px-3 py-1.5 text-xs text-white/60 hover:text-white/80"
              >
                {{ t('studio.cancel') }}
              </button>
              <button
                @click="saveCloneVoice"
                :disabled="!cloneName.trim()"
                class="btn-primary text-xs"
              >
                {{ t('studio.save') }}
              </button>
            </div>
          </div>
        </div>
      </transition>
    </teleport>
  </div>
</template>
