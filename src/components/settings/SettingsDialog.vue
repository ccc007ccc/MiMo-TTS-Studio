<script setup lang="ts">
import { useConfigStore } from '@/stores/config'
import { X, Eye, EyeOff } from 'lucide-vue-next'
import { ref } from 'vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [val: boolean] }>()

const config = useConfigStore()
const showKey = ref(false)

</script>

<template>
  <teleport to="body">
    <transition name="fade">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm" @click="emit('update:open', false)" />
        <div class="relative w-full max-w-lg mx-4 glass rounded-2xl p-6 space-y-5">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold">设置</h2>
            <button @click="emit('update:open', false)" class="text-white/40 hover:text-white/70">
              <X :size="20" />
            </button>
          </div>

          <!-- API Key -->
          <div class="space-y-1.5">
            <label class="text-xs text-white/50 font-medium">API Key</label>
            <div class="relative">
              <input
                :type="showKey ? 'text' : 'password'"
                v-model="config.apiKey"
                placeholder="sk-..."
                class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm pr-10 focus:border-primary-500/50 transition-colors"
              />
              <button
                @click="showKey = !showKey"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
              >
                <EyeOff v-if="showKey" :size="16" />
                <Eye v-else :size="16" />
              </button>
            </div>
          </div>

          <!-- Base URL -->
          <div class="space-y-1.5">
            <label class="text-xs text-white/50 font-medium">API 地址</label>
            <input
              v-model="config.baseUrl"
              class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500/50 transition-colors"
            />
          </div>

          <!-- Default Format -->
          <div class="space-y-1.5">
            <label class="text-xs text-white/50 font-medium">默认格式</label>
            <select
              v-model="config.defaultFormat"
              class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500/50 transition-colors appearance-none cursor-pointer"
            >
              <option value="wav" class="bg-surface-900">WAV (无损)</option>
              <option value="mp3" class="bg-surface-900">MP3 (压缩)</option>
            </select>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button
              @click="emit('update:open', false)"
              class="px-4 py-2 text-sm text-white/60 hover:text-white/80 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>
