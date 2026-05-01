<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SmilePlus, Mic, Type, X } from 'lucide-vue-next'
import type { DirectorScript } from '@/types'

defineProps<{ supportSinging?: boolean }>()
const emit = defineEmits<{
  insertAudioTag: [tag: string]
}>()

const { t } = useI18n()

const naturalLang = defineModel<string>('naturalLang', { default: '' })
const styleTags = defineModel<string[]>('styleTags', { default: () => [] })
const director = defineModel<DirectorScript>('director', {
  default: () => ({ enabled: false, character: '', scene: '', direction: '' }),
})

const showNaturalLang = ref(true)

const styleGroups = [
  { key: '情绪', tags: ['开心', '悲伤', '愤怒', '恐惧', '惊讶', '兴奋', '委屈', '平静', '冷漠'] },
  { key: '复合', tags: ['怅然', '欣慰', '无奈', '愧疚', '释然', '嫉妒', '厌倦', '忐忑', '动情'] },
  { key: '语调', tags: ['温柔', '高冷', '活泼', '严肃', '慵懒', '俏皮', '深沉', '干练', '凌厉'] },
  { key: '音色', tags: ['磁性', '醇厚', '清亮', '空灵', '稚嫩', '苍老', '甜美', '沙哑', '醇雅'] },
  { key: '腔调', tags: ['夹子音', '御姐音', '正太音', '大叔音', '台湾腔', '悄悄话'] },
  { key: '语速', tags: ['变快', '变慢'] },
  { key: '方言', tags: ['东北话', '四川话', '河南话', '粤语'] },
  { key: '角色', tags: ['孙悟空', '林黛玉'] },
] as const

const audioGroups = [
  { key: '节奏', tags: ['吸气', '深呼吸', '叹气', '长叹一口气', '喘息', '屏息'] },
  { key: '情绪', tags: ['紧张', '害怕', '激动', '疲惫', '委屈', '撒娇', '心虚', '震惊', '不耐烦'] },
  { key: '声线', tags: ['颤抖', '声音颤抖', '变调', '破音', '鼻音', '气声', '沙哑'] },
  { key: '哭笑', tags: ['笑', '轻笑', '大笑', '冷笑', '抽泣', '呜咽', '哽咽', '嚎啕大哭'] },
  { key: '英文', tags: ['inhale', 'sigh', 'whisper', 'laughter', 'sob', 'pause'] },
] as const

function toggleStyle(tag: string) {
  const idx = styleTags.value.indexOf(tag)
  if (idx === -1) {
    if (tag === '唱歌') {
      styleTags.value = ['唱歌']
    } else {
      styleTags.value = [...styleTags.value.filter((t) => t !== '唱歌'), tag]
    }
  } else {
    styleTags.value = styleTags.value.filter((t) => t !== tag)
  }
}

function isActive(tag: string) {
  return styleTags.value.includes(tag)
}

function insertAudio(tag: string) {
  emit('insertAudioTag', `(${tag})`)
}

const stylePreview = computed(() =>
  styleTags.value.length ? `<style>${styleTags.value.join(',')}</style>` : '',
)

function clearStyles() {
  styleTags.value = []
}
</script>

<template>
  <div class="space-y-3">
    <div class="space-y-1.5">
      <div class="flex items-center justify-between">
        <label class="text-xs text-white/50 font-medium flex items-center gap-1.5">
          <SmilePlus :size="13" />
          {{ t('style.styleTags') }}
          <span class="text-[10px] text-white/20 font-normal">{{ t('style.styleHint') }}</span>
        </label>
        <button
          v-if="styleTags.length"
          @click="clearStyles"
          class="text-[10px] text-white/30 hover:text-red-400 flex items-center gap-0.5"
        >
          <X :size="10" />
          {{ t('style.clear') }}
        </button>
      </div>
      <div v-if="stylePreview" class="px-2 py-1 rounded bg-primary-500/10 border border-primary-500/20 text-[10px] text-primary-300 font-mono">
        {{ stylePreview }}
      </div>
      <div class="space-y-1">
        <div v-for="group in styleGroups" :key="group.key" class="flex items-center gap-1.5 flex-wrap">
          <span class="text-[10px] text-white/20 w-12 flex-shrink-0">{{ t(`style.groups.${group.key}`) }}</span>
          <button
            v-for="tag in group.tags"
            :key="tag"
            @click="toggleStyle(tag)"
            class="px-2 py-0.5 rounded text-[11px] transition-all border"
            :class="isActive(tag)
              ? 'bg-primary-500/20 border-primary-500/40 text-primary-300'
              : 'bg-white/[0.02] border-white/5 text-white/40 hover:text-primary-400 hover:border-primary-500/20 hover:bg-primary-500/5'"
          >
            {{ tag }}
          </button>
        </div>
        <div v-if="supportSinging" class="flex items-center gap-1.5 flex-wrap">
          <span class="text-[10px] text-white/20 w-12 flex-shrink-0">{{ t('style.singing') }}</span>
          <button
            @click="toggleStyle('唱歌')"
            class="px-2 py-0.5 rounded text-[11px] transition-all border"
            :class="isActive('唱歌')
              ? 'bg-pink-500/20 border-pink-500/40 text-pink-300'
              : 'bg-white/[0.02] border-white/5 text-white/40 hover:text-pink-400 hover:border-pink-500/20'"
          >
            唱歌
          </button>
          <span class="text-[10px] text-white/20">{{ t('style.singingHint') }}</span>
        </div>
      </div>
    </div>

    <div class="space-y-1.5">
      <label class="text-xs text-white/50 font-medium flex items-center gap-1.5">
        <Mic :size="13" />
        {{ t('style.audioTags') }}
        <span class="text-[10px] text-white/20 font-normal">{{ t('style.audioHint') }}</span>
      </label>
      <div class="space-y-1">
        <div v-for="group in audioGroups" :key="group.key" class="flex items-center gap-1.5 flex-wrap">
          <span class="text-[10px] text-white/20 w-12 flex-shrink-0">{{ t(`style.groups.${group.key}`) }}</span>
          <button
            v-for="tag in group.tags"
            :key="tag"
            @click="insertAudio(tag)"
            class="px-2 py-0.5 rounded text-[11px] transition-all border bg-white/[0.02] border-white/5 text-white/40 hover:text-orange-400 hover:border-orange-500/20 hover:bg-orange-500/5"
          >
            {{ tag }}
          </button>
        </div>
      </div>
    </div>

    <div class="space-y-1.5">
      <div class="flex items-center justify-between">
        <label class="text-xs text-white/50 font-medium flex items-center gap-1.5">
          <Type :size="13" />
          {{ t('style.natural') }}
          <span class="text-[10px] text-white/20 font-normal">{{ t('style.naturalHint') }}</span>
        </label>
        <div class="flex items-center gap-2">
          <label class="flex items-center gap-1 text-[10px] text-white/40 cursor-pointer">
            <input
              type="checkbox"
              v-model="director.enabled"
              class="accent-primary-500"
            />
            {{ t('style.director') }}
          </label>
          <button
            @click="showNaturalLang = !showNaturalLang"
            class="text-[10px] text-primary-400/60 hover:text-primary-400 transition-colors"
          >
            {{ showNaturalLang ? t('style.collapse') : t('style.expand') }}
          </button>
        </div>
      </div>
      <transition name="fade">
        <div v-if="showNaturalLang" class="space-y-1.5">
          <textarea
            v-if="!director.enabled"
            v-model="naturalLang"
            :placeholder="t('style.naturalPlaceholder')"
            rows="3"
            class="w-full bg-white/[0.02] border border-white/8 rounded-xl px-4 py-3 text-sm text-white/90 placeholder-white/20 resize-none focus:border-primary-500/30 transition-colors leading-relaxed"
          />
          <div v-else class="space-y-1.5">
            <input
              v-model="director.character"
              :placeholder="t('style.characterPlaceholder')"
              class="w-full bg-white/[0.02] border border-white/8 rounded-lg px-3 py-2 text-xs text-white/90 placeholder-white/20 focus:border-primary-500/30 transition-colors"
            />
            <input
              v-model="director.scene"
              :placeholder="t('style.scenePlaceholder')"
              class="w-full bg-white/[0.02] border border-white/8 rounded-lg px-3 py-2 text-xs text-white/90 placeholder-white/20 focus:border-primary-500/30 transition-colors"
            />
            <textarea
              v-model="director.direction"
              :placeholder="t('style.directionPlaceholder')"
              rows="2"
              class="w-full bg-white/[0.02] border border-white/8 rounded-lg px-3 py-2 text-xs text-white/90 placeholder-white/20 resize-none focus:border-primary-500/30 transition-colors leading-relaxed"
            />
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>
