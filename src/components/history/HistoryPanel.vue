<script setup lang="ts">
import { useSynthesisStore } from '@/stores/synthesis'
import { useAudioPlayer } from '@/composables/useAudioPlayer'
import { Play, Pause, Download, Trash2, FileAudio } from 'lucide-vue-next'
import { downloadAudio } from '@/api/tts'

const emit = defineEmits<{ close: [] }>()
const synthStore = useSynthesisStore()
const player = useAudioPlayer()

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function formatDate(ts: number) {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`
}

function togglePlay(item: typeof synthStore.history[0]) {
  if (player.isPlaying.value) {
    player.pause()
  } else {
    player.load(item.audioUrl)
    player.play()
  }
}
</script>

<template>
  <div class="p-3 space-y-1.5">
    <div v-if="!synthStore.history.length" class="flex flex-col items-center justify-center py-12 text-white/30">
      <FileAudio :size="32" class="mb-2" />
      <p class="text-sm">暂无历史记录</p>
    </div>

    <div
      v-for="item in synthStore.history"
      :key="item.id"
      class="group p-2.5 rounded-lg hover:bg-white/5 transition-all cursor-pointer"
    >
      <div class="flex items-start justify-between gap-2">
        <div class="flex-1 min-w-0">
          <p class="text-xs text-white/80 truncate">{{ item.text }}</p>
          <div class="flex items-center gap-2 mt-1">
            <span class="text-[10px] text-primary-400/70">{{ item.voice }}</span>
            <span v-if="item.style" class="text-[10px] text-purple-400/70">{{ item.style }}</span>
            <span class="text-[10px] text-white/20">{{ formatDate(item.createdAt) }}</span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-1 mt-2">
        <button
          v-if="item.audioBase64"
          @click="togglePlay(item)"
          class="w-6 h-6 flex items-center justify-center rounded bg-white/5 hover:bg-primary-500/20 text-white/50 hover:text-primary-400 transition-all"
        >
          <Play :size="12" />
        </button>
        <button
          v-if="item.audioBase64"
          @click="downloadAudio(item.audioBase64, item.format, `tts_${item.id}.${item.format}`)"
          class="w-6 h-6 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80 transition-all"
        >
          <Download :size="12" />
        </button>
        <button
          @click="synthStore.removeHistory(item.id)"
          class="w-6 h-6 flex items-center justify-center rounded bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
        >
          <Trash2 :size="12" />
        </button>
        <span class="ml-auto text-[10px] text-white/20">{{ item.model }}</span>
      </div>
    </div>
  </div>
</template>
