<script setup lang="ts">
import { computed } from 'vue'
import { useVoiceStore } from '@/stores/voice'
import { User } from 'lucide-vue-next'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [val: string] }>()

const voiceStore = useVoiceStore()
const selectedVoice = computed(() => voiceStore.voices.find((v) => v.id === props.modelValue))
</script>

<template>
  <div class="space-y-1.5">
    <label class="text-xs text-white/50 font-medium flex items-center gap-1.5">
      <User :size="13" />
      音色选择
      <span v-if="selectedVoice" class="text-primary-400/80 font-normal">— {{ selectedVoice.name }}</span>
    </label>
    <div class="grid grid-cols-3 gap-1.5">
      <button
        v-for="v in voiceStore.voices"
        :key="v.id"
        @click="emit('update:modelValue', v.id)"
        class="px-3 py-2 rounded-lg text-left transition-all border"
        :class="props.modelValue === v.id
          ? 'bg-primary-500/15 border-primary-500/30 text-primary-300'
          : 'bg-white/[0.02] border-white/5 text-white/40 hover:text-white/60 hover:bg-white/[0.05]'"
      >
        <div class="text-xs font-medium">{{ v.name }}</div>
        <div class="text-[10px] text-white/20 mt-0.5">{{ v.description }}</div>
      </button>
    </div>
  </div>
</template>
