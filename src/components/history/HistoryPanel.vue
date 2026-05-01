<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useSynthesisStore } from '@/stores/synthesis'
import { useAudioPlayer } from '@/composables/useAudioPlayer'
import { Play, Download, Trash2, FileAudio } from 'lucide-vue-next'
import { downloadBlob } from '@/api/tts'

defineEmits<{ close: [] }>()
const { t } = useI18n()
const synthStore = useSynthesisStore()
const player = useAudioPlayer()

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
      <p class="text-sm">{{ t('history.empty') }}</p>
    </div>

    <div
      v-for="item in synthStore.history"
      :key="item.id"
      class="group p-2.5 rounded-lg hover:bg-white/5 transition-all"
    >
      <div class="flex items-start justify-between gap-2">
        <div class="flex-1 min-w-0">
          <p class="text-xs text-white/80 truncate">{{ item.text }}</p>
          <div class="flex items-center gap-2 mt-1">
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40">
              {{ t(`history.modes.${item.mode}`) }}
            </span>
            <span class="text-[10px] text-primary-400/70">{{ item.voiceLabel || item.voice }}</span>
            <span class="text-[10px] text-white/20">{{ formatDate(item.createdAt) }}</span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-1 mt-2">
        <button
          @click="togglePlay(item)"
          class="w-6 h-6 flex items-center justify-center rounded bg-white/5 hover:bg-primary-500/20 text-white/50 hover:text-primary-400 transition-all"
        >
          <Play :size="12" />
        </button>
        <button
          @click="downloadBlob(item.audioBlob, `tts_${item.id}.${item.format}`)"
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
        <span class="ml-auto text-[10px] text-white/20 truncate max-w-[120px]">{{ item.model }}</span>
      </div>
    </div>
  </div>
</template>
