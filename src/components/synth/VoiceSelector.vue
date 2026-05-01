<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useVoiceStore } from '@/stores/voice'
import { User, Trash2, Sparkles } from 'lucide-vue-next'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [val: string] }>()

const { t } = useI18n()
const voiceStore = useVoiceStore()

const selectedVoice = computed(() =>
  voiceStore.voices.find((v) => v.id === props.modelValue),
)

async function removeCustom(id: string, e: Event) {
  e.stopPropagation()
  if (!confirm(t('voice.confirmDelete'))) return
  await voiceStore.removeCustomVoice(id)
  if (props.modelValue === id) emit('update:modelValue', 'mimo_default')
}
</script>

<template>
  <div class="space-y-2">
    <label class="text-xs text-white/50 font-medium flex items-center gap-1.5">
      <User :size="13" />
      {{ t('voice.label') }}
      <span v-if="selectedVoice" class="text-primary-400/80 font-normal">— {{ selectedVoice.name }}</span>
    </label>

    <div>
      <div class="text-[10px] text-white/20 mb-1">{{ t('voice.builtIn') }}</div>
      <div class="grid grid-cols-3 gap-1.5">
        <button
          v-for="v in voiceStore.builtInVoices"
          :key="v.id"
          @click="emit('update:modelValue', v.id)"
          class="px-3 py-2 rounded-lg text-left transition-all border"
          :class="props.modelValue === v.id
            ? 'bg-primary-500/15 border-primary-500/30 text-primary-300'
            : 'bg-white/[0.02] border-white/5 text-white/40 hover:text-white/60 hover:bg-white/[0.05]'"
        >
          <div class="text-xs font-medium">{{ v.name }}</div>
          <div class="text-[10px] text-white/20 mt-0.5 truncate">{{ v.description }}</div>
        </button>
      </div>
    </div>

    <div v-if="voiceStore.customVoices.length">
      <div class="text-[10px] text-white/20 mb-1 flex items-center gap-1">
        <Sparkles :size="10" />
        {{ t('voice.custom') }}
      </div>
      <div class="grid grid-cols-3 gap-1.5">
        <div
          v-for="v in voiceStore.customVoices"
          :key="v.id"
          class="group relative rounded-lg border transition-all"
          :class="props.modelValue === v.id
            ? 'bg-purple-500/15 border-purple-500/30'
            : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'"
        >
          <button
            type="button"
            @click="emit('update:modelValue', v.id)"
            class="w-full px-3 py-2 pr-6 rounded-lg text-left transition-colors"
            :class="props.modelValue === v.id
              ? 'text-purple-300'
              : 'text-white/40 hover:text-white/60'"
          >
            <div class="text-xs font-medium truncate">{{ v.name }}</div>
            <div class="text-[10px] text-white/20 mt-0.5 truncate">{{ v.description }}</div>
          </button>
          <button
            type="button"
            @click="(e) => removeCustom(v.id, e)"
            :aria-label="t('nav.clear')"
            class="absolute top-1 right-1 p-0.5 rounded opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-opacity"
          >
            <Trash2 :size="10" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
