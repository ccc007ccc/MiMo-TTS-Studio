<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { AudioWaveform, Layers, Settings, History, Trash2 } from 'lucide-vue-next'
import SettingsDialog from '@/components/settings/SettingsDialog.vue'
import HistoryPanel from '@/components/history/HistoryPanel.vue'
import { useSynthesisStore } from '@/stores/synthesis'
import { useVoiceStore } from '@/stores/voice'

const route = useRoute()
const { t } = useI18n()
const synthStore = useSynthesisStore()
const voiceStore = useVoiceStore()

const showSettings = ref(false)
const showHistory = ref(false)

const navItems = [
  { path: '/', icon: AudioWaveform, key: 'studio' },
  { path: '/batch', icon: Layers, key: 'batch' },
] as const

onMounted(async () => {
  await Promise.all([synthStore.loadHistory(), voiceStore.loadCustom()])
})
</script>

<template>
  <div class="flex h-screen bg-[#0a0a1a] text-white overflow-hidden">
    <aside class="w-56 flex-shrink-0 flex flex-col border-r border-white/5 bg-[#0d0d20]">
      <div class="px-4 py-4 flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center">
          <AudioWaveform :size="18" class="text-white" />
        </div>
        <div>
          <div class="text-sm font-semibold gradient-text">{{ t('app.name') }}</div>
          <div class="text-[10px] text-white/30">{{ t('app.subtitle') }}</div>
        </div>
      </div>

      <nav class="flex-1 px-2 py-2 space-y-0.5">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all"
          :class="route.path === item.path
            ? 'bg-primary-500/15 text-primary-400 border border-primary-500/20'
            : 'text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent'"
        >
          <component :is="item.icon" :size="16" />
          {{ t(`nav.${item.key}`) }}
        </router-link>
      </nav>

      <div class="px-2 py-2 border-t border-white/5 space-y-0.5">
        <button
          @click="showHistory = !showHistory"
          class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white/80 hover:bg-white/5 transition-all"
        >
          <History :size="16" />
          {{ t('nav.history') }}
          <span v-if="synthStore.history.length" class="ml-auto text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">
            {{ synthStore.history.length }}
          </span>
        </button>
        <button
          @click="showSettings = true"
          class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white/80 hover:bg-white/5 transition-all"
        >
          <Settings :size="16" />
          {{ t('nav.settings') }}
        </button>
      </div>
    </aside>

    <main class="flex-1 overflow-y-auto">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <transition name="slide">
      <div v-if="showHistory" class="fixed inset-y-0 right-0 w-80 z-40 flex">
        <div class="fixed inset-0 bg-black/40" @click="showHistory = false" />
        <div class="ml-auto w-80 h-full bg-[#0d0d20] border-l border-white/5 relative z-50 flex flex-col">
          <div class="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <h3 class="text-sm font-medium">{{ t('nav.history') }}</h3>
            <div class="flex items-center gap-2">
              <button
                v-if="synthStore.history.length"
                @click="synthStore.clearHistory()"
                class="text-xs text-red-400/70 hover:text-red-400 flex items-center gap-1"
              >
                <Trash2 :size="12" />
                {{ t('nav.clear') }}
              </button>
              <button @click="showHistory = false" class="text-white/40 hover:text-white/70 text-lg leading-none">&times;</button>
            </div>
          </div>
          <div class="flex-1 overflow-y-auto">
            <HistoryPanel @close="showHistory = false" />
          </div>
        </div>
      </div>
    </transition>

    <SettingsDialog v-model:open="showSettings" />
  </div>
</template>
