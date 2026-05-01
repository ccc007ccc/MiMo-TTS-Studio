<script setup lang="ts">
import { computed } from 'vue'
import { useAudioPlayer } from '@/composables/useAudioPlayer'
import WaveformCanvas from './WaveformCanvas.vue'
import { Play, Pause, Download, RotateCcw } from 'lucide-vue-next'
import { downloadAudio } from '@/api/tts'
import type { AudioFormat } from '@/types'

const props = defineProps<{
  audioUrl: string
  audioBase64: string
  format: AudioFormat
  filename?: string
  waveformData?: number[]
}>()

const player = useAudioPlayer()

function togglePlay() {
  if (!player.isPlaying.value && player.currentTime.value === 0) {
    player.load(props.audioUrl)
  }
  player.toggle()
}

function restart() {
  player.seek(0)
  if (!player.isPlaying.value) player.play()
}

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

const progress = computed(() =>
  player.duration.value > 0 ? player.currentTime.value / player.duration.value : 0
)
</script>

<template>
  <div class="glass rounded-xl p-3 space-y-2">
    <WaveformCanvas
      :data="waveformData || []"
      :progress="progress"
    />

    <div class="flex items-center gap-3">
      <button
        @click="togglePlay"
        class="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center hover:shadow-lg hover:shadow-primary-500/30 transition-all flex-shrink-0"
      >
        <Pause v-if="player.isPlaying.value" :size="14" />
        <Play v-else :size="14" class="ml-0.5" />
      </button>

      <!-- Progress bar -->
      <div class="flex-1 flex items-center gap-2">
        <span class="text-[10px] text-white/30 w-8 text-right font-mono">{{ formatTime(player.currentTime.value) }}</span>
        <div class="flex-1 h-1 bg-white/5 rounded-full overflow-hidden cursor-pointer group"
          @click="(e: MouseEvent) => {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
            const pct = (e.clientX - rect.left) / rect.width
            player.seek(pct * player.duration.value)
          }"
        >
          <div
            class="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full transition-all"
            :style="{ width: (progress * 100) + '%' }"
          />
        </div>
        <span class="text-[10px] text-white/30 w-8 font-mono">{{ formatTime(player.duration.value) }}</span>
      </div>

      <button
        @click="restart"
        class="text-white/30 hover:text-white/60 transition-colors"
      >
        <RotateCcw :size="14" />
      </button>
      <button
        @click="downloadAudio(audioBase64, format, filename || `audio.${format}`)"
        class="text-white/30 hover:text-white/60 transition-colors"
      >
        <Download :size="14" />
      </button>
    </div>
  </div>
</template>
