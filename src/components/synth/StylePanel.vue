<script setup lang="ts">
import { ref } from 'vue'
import { SmilePlus, Mic, Type } from 'lucide-vue-next'

const props = defineProps<{ supportSinging?: boolean }>()
const emit = defineEmits<{ insert: [tag: string] }>()

const naturalLang = defineModel<string>('naturalLang', { default: '' })
const showNaturalLang = ref(true)

const styleGroups = [
  { label: '情绪', tags: ['开心', '悲伤', '愤怒', '恐惧', '惊讶', '兴奋', '委屈', '平静', '冷漠'] },
  { label: '复合', tags: ['怅然', '欣慰', '无奈', '愧疚', '释然', '嫉妒', '厌倦', '忐忑', '动情'] },
  { label: '语调', tags: ['温柔', '高冷', '活泼', '严肃', '慵懒', '俏皮', '深沉', '干练', '凌厉'] },
  { label: '音色', tags: ['磁性', '醇厚', '清亮', '空灵', '稚嫩', '苍老', '甜美', '沙哑', '醇雅'] },
  { label: '腔调', tags: ['夹子音', '御姐音', '正太音', '大叔音', '台湾腔'] },
  { label: '方言', tags: ['东北话', '四川话', '河南话', '粤语'] },
  { label: '角色', tags: ['孙悟空', '林黛玉'] },
]

const singingTags = ['唱歌']

const audioGroups = [
  { label: '节奏', tags: ['吸气', '深呼吸', '叹气', '长叹一口气', '喘息', '屏息'] },
  { label: '情绪', tags: ['紧张', '害怕', '激动', '疲惫', '委屈', '撒娇', '心虚', '震惊', '不耐烦'] },
  { label: '声线', tags: ['颤抖', '声音颤抖', '变调', '破音', '鼻音', '气声', '沙哑'] },
  { label: '哭笑', tags: ['笑', '轻笑', '大笑', '冷笑', '抽泣', '呜咽', '哽咽', '嚎啕大哭'] },
]

function insertStyle(tag: string) {
  emit('insert', `(${tag})`)
}

function insertAudioTag(tag: string) {
  emit('insert', `（${tag}）`)
}
</script>

<template>
  <div class="space-y-3">
    <!-- 风格标签 -->
    <div class="space-y-1.5">
      <label class="text-xs text-white/50 font-medium flex items-center gap-1.5">
        <SmilePlus :size="13" />
        风格标签
        <span class="text-[10px] text-white/20 font-normal">— 插入 (风格) 到文本光标处</span>
      </label>
      <div class="space-y-1">
        <div v-for="group in styleGroups" :key="group.label" class="flex items-center gap-1.5 flex-wrap">
          <span class="text-[10px] text-white/20 w-7 flex-shrink-0">{{ group.label }}</span>
          <button
            v-for="tag in group.tags"
            :key="tag"
            @click="insertStyle(tag)"
            class="px-2 py-0.5 rounded text-[11px] transition-all border bg-white/[0.02] border-white/5 text-white/40 hover:text-primary-400 hover:border-primary-500/20 hover:bg-primary-500/5"
          >
            {{ tag }}
          </button>
        </div>
        <div v-if="supportSinging" class="flex items-center gap-1.5 flex-wrap">
          <span class="text-[10px] text-white/20 w-7 flex-shrink-0">唱歌</span>
          <button
            v-for="tag in singingTags"
            :key="tag"
            @click="insertStyle(tag)"
            class="px-2 py-0.5 rounded text-[11px] transition-all border bg-white/[0.02] border-white/5 text-white/40 hover:text-primary-400 hover:border-primary-500/20 hover:bg-primary-500/5"
          >
            {{ tag }}
          </button>
        </div>
      </div>
    </div>

    <!-- 音频标签 -->
    <div class="space-y-1.5">
      <label class="text-xs text-white/50 font-medium flex items-center gap-1.5">
        <Mic :size="13" />
        音频标签
        <span class="text-[10px] text-white/20 font-normal">— 插入 （标签） 到文本光标处</span>
      </label>
      <div class="space-y-1">
        <div v-for="group in audioGroups" :key="group.label" class="flex items-center gap-1.5 flex-wrap">
          <span class="text-[10px] text-white/20 w-7 flex-shrink-0">{{ group.label }}</span>
          <button
            v-for="tag in group.tags"
            :key="tag"
            @click="insertAudioTag(tag)"
            class="px-2 py-0.5 rounded text-[11px] transition-all border bg-white/[0.02] border-white/5 text-white/40 hover:text-orange-400 hover:border-orange-500/20 hover:bg-orange-500/5"
          >
            {{ tag }}
          </button>
        </div>
      </div>
    </div>

    <!-- 自然语言描述 -->
    <div class="space-y-1.5">
      <div class="flex items-center justify-between">
        <label class="text-xs text-white/50 font-medium flex items-center gap-1.5">
          <Type :size="13" />
          自然语言描述
          <span class="text-[10px] text-white/20 font-normal">— 可选，整体风格指导（发往 user 消息）</span>
        </label>
        <button
          @click="showNaturalLang = !showNaturalLang"
          class="text-[10px] text-primary-400/60 hover:text-primary-400 transition-colors"
        >
          {{ showNaturalLang ? '收起' : '展开' }}
        </button>
      </div>
      <transition name="fade">
        <textarea
          v-if="showNaturalLang"
          v-model="naturalLang"
          placeholder="用自然语言描述你想要的语音风格，例如：&#10;用轻快上扬的语调向领导报喜，语速稍快，带着压抑不住的激动&#10;&#10;支持导演模式：【角色】【场景】【指导】"
          rows="4"
          class="w-full bg-white/[0.02] border border-white/8 rounded-xl px-4 py-3 text-sm text-white/90 placeholder-white/20 resize-none focus:border-primary-500/30 transition-colors leading-relaxed"
        />
      </transition>
    </div>
  </div>
</template>
