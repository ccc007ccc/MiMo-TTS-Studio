<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useConfigStore } from '@/stores/config'
import { useSynthesisStore } from '@/stores/synthesis'
import { useVoiceStore } from '@/stores/voice'
import { synthesize, base64ToAudioUrl } from '@/api/tts'
import { useWaveform } from '@/composables/useWaveform'
import StylePanel from '@/components/synth/StylePanel.vue'
import VoiceSelector from '@/components/synth/VoiceSelector.vue'
import AudioPlayer from '@/components/player/AudioPlayer.vue'
import { Sparkles, Wand2, Mic, Loader2, Upload, Circle, Square } from 'lucide-vue-next'

const config = useConfigStore()
const synthStore = useSynthesisStore()
const voiceStore = useVoiceStore()
const { waveformData, analyze } = useWaveform()

const activeTab = ref<'synth' | 'design' | 'clone'>('synth')
const tabs = [
  { id: 'synth' as const, label: '语音合成', icon: Sparkles },
  { id: 'design' as const, label: '声音设计', icon: Wand2 },
  { id: 'clone' as const, label: '声音克隆', icon: Mic },
]

// Shared
const text = ref('')
const format = ref(config.defaultFormat)
const naturalLang = ref('')
const resultUrl = ref('')
const resultBase64 = ref('')
const error = ref('')
const textareaRef = ref<HTMLTextAreaElement>()

// Synth mode
const voice = ref('mimo_default')

// Voice Design mode
const description = ref('')

// Voice Clone mode
const referenceAudio = ref<File | null>(null)
const referenceBase64 = ref('')
const referenceMime = ref('')
const dragOver = ref(false)
const isRecording = ref(false)
const recordDuration = ref(0)
const recordedUrl = ref('')
let mediaRecorder: MediaRecorder | null = null
let recordedChunks: Blob[] = []
let recordTimer: ReturnType<typeof setInterval> | null = null

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    recordedChunks = []
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.push(e.data)
    }
    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop())
      const webmBlob = new Blob(recordedChunks, { type: 'audio/webm' })
      const wavBlob = await webmToWav(webmBlob)
      recordedUrl.value = URL.createObjectURL(wavBlob)
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        referenceBase64.value = result.split(',')[1]
        referenceMime.value = 'audio/wav'
        referenceAudio.value = new File([wavBlob], 'recording.wav', { type: 'audio/wav' })
      }
      reader.readAsDataURL(wavBlob)
    }
    mediaRecorder.start()
    isRecording.value = true
    recordDuration.value = 0
    recordTimer = setInterval(() => recordDuration.value++, 1000)
  } catch {
    error.value = '无法访问麦克风，请检查权限设置'
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }
  isRecording.value = false
  if (recordTimer) {
    clearInterval(recordTimer)
    recordTimer = null
  }
}

function clearRecording() {
  referenceAudio.value = null
  referenceBase64.value = ''
  referenceMime.value = ''
  if (recordedUrl.value) {
    URL.revokeObjectURL(recordedUrl.value)
    recordedUrl.value = ''
  }
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

async function webmToWav(blob: Blob): Promise<Blob> {
  const ctx = new AudioContext()
  try {
    const arrayBuffer = await blob.arrayBuffer()
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
    const numChannels = audioBuffer.numberOfChannels
    const sampleRate = audioBuffer.sampleRate
    const length = audioBuffer.length
    const bytesPerSample = 2
    const blockAlign = numChannels * bytesPerSample
    const dataSize = length * blockAlign
    const buffer = new ArrayBuffer(44 + dataSize)
    const view = new DataView(buffer)

    function writeString(offset: number, str: string) {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
    }

    writeString(0, 'RIFF')
    view.setUint32(4, 36 + dataSize, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, numChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * blockAlign, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, 16, true)
    writeString(36, 'data')
    view.setUint32(40, dataSize, true)

    const channels: Float32Array[] = []
    for (let i = 0; i < numChannels; i++) channels.push(audioBuffer.getChannelData(i))

    let offset = 44
    for (let i = 0; i < length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, channels[ch][i]))
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
        offset += 2
      }
    }

    return new Blob([buffer], { type: 'audio/wav' })
  } finally {
    ctx.close()
  }
}

const canGenerate = computed(() => {
  if (!text.value.trim() || !config.apiKey || synthStore.isGenerating) return false
  if (activeTab.value === 'design' && !description.value.trim()) return false
  if (activeTab.value === 'clone' && !referenceBase64.value) return false
  return true
})

const charCount = computed(() => text.value.length)

function insertTag(tag: string) {
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

// Voice Clone file handling
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

function processFile(file: File) {
  if (!file.type.startsWith('audio/')) {
    error.value = '请上传音频文件'
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    error.value = '文件大小不能超过 10MB'
    return
  }
  referenceAudio.value = file
  referenceMime.value = file.type
  error.value = ''
  const reader = new FileReader()
  reader.onload = () => {
    const result = reader.result as string
    referenceBase64.value = result.split(',')[1]
  }
  reader.readAsDataURL(file)
}

async function generate() {
  if (!canGenerate.value) return
  error.value = ''
  synthStore.isGenerating = true
  resultUrl.value = ''
  resultBase64.value = ''

  try {
    let b64: string

    if (activeTab.value === 'synth') {
      b64 = await synthesize({
        text: text.value,
        voice: voice.value,
        format: format.value,
        model: 'mimo-v2.5-tts',
        userContent: naturalLang.value || undefined,
      }, config.apiKey, config.baseUrl)
    } else if (activeTab.value === 'design') {
      b64 = await synthesize({
        text: text.value,
        format: format.value,
        model: 'mimo-v2.5-tts-voicedesign',
        userContent: description.value,
      }, config.apiKey, config.baseUrl)
    } else {
      const voiceDataUri = `data:${referenceMime.value};base64,${referenceBase64.value}`
      b64 = await synthesize({
        text: text.value,
        voice: voiceDataUri,
        format: format.value,
        model: 'mimo-v2.5-tts-voiceclone',
        userContent: '',
      }, config.apiKey, config.baseUrl)
    }

    resultBase64.value = b64
    if (resultUrl.value) URL.revokeObjectURL(resultUrl.value)
    resultUrl.value = base64ToAudioUrl(b64, format.value)
    await analyze(b64)

    const labels: Record<string, string> = { synth: '', design: '[设计] ', clone: '[克隆] ' }
    synthStore.addHistory({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      text: (labels[activeTab.value] || '') + text.value.slice(0, 100),
      voice: activeTab.value === 'synth' ? voice.value : activeTab.value,
      model: `mimo-v2.5-tts${activeTab.value === 'synth' ? '' : `-${activeTab.value}`}`,
      format: format.value,
      audioBase64: b64,
      audioUrl: resultUrl.value,
      createdAt: Date.now(),
    })
  } catch (e: any) {
    error.value = e.message || '合成失败'
  } finally {
    synthStore.isGenerating = false
  }
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
    <!-- Tab bar -->
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
        {{ tab.label }}
      </button>
    </div>

    <div v-if="!config.apiKey" class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300/80 text-xs">
      请先在设置中配置 API Key
    </div>

    <!-- Shared: Style & Audio tags + Natural language -->
    <StylePanel v-model:naturalLang="naturalLang" :support-singing="activeTab === 'synth'" @insert="insertTag" />

    <!-- Shared: Text input -->
    <div class="space-y-1.5">
      <div class="flex items-center justify-between">
        <label class="text-xs text-white/50 font-medium">待合成文本</label>
        <span class="text-[10px] text-white/20 font-mono">{{ charCount }} 字</span>
      </div>
      <textarea
        ref="textareaRef"
        v-model="text"
        @keydown="handleKeydown"
        placeholder="在此输入需要合成的文本...&#10;&#10;点击上方标签在光标处插入 (风格) 和 （音频标签）&#10;Ctrl+Enter 快速合成"
        :rows="6"
        class="w-full bg-white/[0.02] border border-white/8 rounded-xl px-4 py-3 text-sm text-white/90 placeholder-white/20 resize-none focus:border-primary-500/30 transition-colors leading-relaxed"
      />
    </div>

    <!-- Mode-specific controls -->
    <!-- Synth: Voice selector -->
    <VoiceSelector v-if="activeTab === 'synth'" v-model="voice" />

    <!-- Design: Description -->
    <div v-if="activeTab === 'design'" class="space-y-1.5">
      <label class="text-xs text-white/50 font-medium">音色描述（必填）</label>
      <textarea
        v-model="description"
        placeholder="描述你想要的声音，例如:&#10;A warm, confident young female voice&#10;一位年迈的老先生，说带北方口音的普通话，语速缓慢而沉稳"
        rows="3"
        class="w-full bg-white/[0.02] border border-white/8 rounded-xl px-4 py-3 text-sm text-white/90 placeholder-white/20 resize-none focus:border-purple-500/30 transition-colors leading-relaxed"
      />
      <p class="text-[10px] text-white/20">1-4 句即可，涵盖性别年龄、音色质感、情绪语气、语速节奏等维度</p>
    </div>

    <!-- Clone: Audio upload or record -->
    <div v-if="activeTab === 'clone'" class="space-y-2">
      <label class="text-xs text-white/50 font-medium">参考音频（必填）</label>

      <!-- Upload area -->
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
        <p v-if="!referenceAudio" class="text-xs text-white/40">
          拖放音频文件，或<span class="text-green-400">点击上传</span>
          <span class="text-white/20">（mp3/wav，≤10MB）</span>
        </p>
        <div v-else class="flex items-center justify-center gap-2">
          <p class="text-xs text-green-400/80">{{ referenceAudio.name }}</p>
          <button @click.stop="clearRecording" class="text-[10px] text-red-400/60 hover:text-red-400">清除</button>
        </div>
      </div>

      <!-- Divider -->
      <div class="flex items-center gap-2 text-[10px] text-white/20">
        <div class="flex-1 border-t border-white/5" />
        <span>或</span>
        <div class="flex-1 border-t border-white/5" />
      </div>

      <!-- Record button -->
      <div class="flex items-center gap-3">
        <button
          v-if="!isRecording"
          @click="startRecording"
          class="flex items-center gap-2 px-4 py-2 rounded-lg text-xs bg-white/5 border border-white/10 text-white/50 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 transition-all"
        >
          <Circle :size="12" class="fill-current" />
          录音
        </button>
        <button
          v-else
          @click="stopRecording"
          class="flex items-center gap-2 px-4 py-2 rounded-lg text-xs bg-red-500/15 border border-red-500/30 text-red-400 animate-pulse transition-all"
        >
          <Square :size="10" class="fill-current" />
          录音中 {{ formatDuration(recordDuration) }}
        </button>

        <!-- Recorded audio preview -->
        <audio v-if="recordedUrl" :src="recordedUrl" controls class="h-8 flex-1" />
      </div>

      <p class="text-[10px] text-white/20">上传文件或直接录音，提供一段参考音频用于克隆音色</p>
    </div>

    <!-- Shared: Format & Generate -->
    <div class="flex items-center gap-3">
      <select
        v-model="format"
        class="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs appearance-none cursor-pointer focus:border-primary-500/50 transition-colors"
      >
        <option value="wav" class="bg-surface-900">WAV</option>
        <option value="mp3" class="bg-surface-900">MP3</option>
      </select>

      <button
        @click="generate"
        :disabled="!canGenerate"
        class="btn-primary flex items-center gap-2 text-sm ml-auto"
        :class="synthStore.isGenerating && 'animate-pulse-glow'"
      >
        <Loader2 v-if="synthStore.isGenerating" :size="16" class="animate-spin" />
        <Sparkles v-else :size="16" />
        {{ synthStore.isGenerating ? '合成中...' : '开始合成' }}
      </button>
    </div>

    <div v-if="error" class="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400/80 text-xs">
      {{ error }}
    </div>

    <!-- Shared: Result -->
    <transition name="fade">
      <div v-if="resultUrl" class="space-y-2">
        <label class="text-xs text-white/50 font-medium">合成结果</label>
        <AudioPlayer
          :audio-url="resultUrl"
          :audio-base64="resultBase64"
          :format="format"
          :waveformData="waveformData"
        />
      </div>
    </transition>
  </div>
</template>
