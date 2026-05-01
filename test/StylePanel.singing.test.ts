// 测试 StylePanel 唱歌互斥逻辑（直接测组件 v-model 行为）
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { setActivePinia, createPinia } from 'pinia'
import StylePanel from '@/components/synth/StylePanel.vue'
import zhCN from '@/i18n/zh-CN'
import enUS from '@/i18n/en-US'

const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  messages: { 'zh-CN': zhCN, 'en-US': enUS },
})

beforeEach(() => {
  setActivePinia(createPinia())
})

async function clickTag(w: ReturnType<typeof mount>, label: string) {
  const btn = w.findAll('button').find((b) => b.text() === label)
  if (!btn) throw new Error(`Button "${label}" not found`)
  await btn.trigger('click')
}

function lastEmittedTags(w: ReturnType<typeof mount>): string[] {
  const events = w.emitted('update:styleTags')
  if (!events) return []
  return events[events.length - 1][0] as string[]
}

describe('StylePanel 唱歌互斥逻辑', () => {
  it('选中唱歌后选其他风格会清除唱歌', async () => {
    const w = mount(StylePanel, {
      global: { plugins: [i18n] },
      props: {
        naturalLang: '',
        styleTags: ['唱歌'],
        director: { enabled: false, character: '', scene: '', direction: '' },
        supportSinging: true,
      },
    })
    await clickTag(w, '开心')
    expect(lastEmittedTags(w)).toEqual(['开心'])
  })

  it('已有其他风格时点击唱歌会清除其他', async () => {
    const w = mount(StylePanel, {
      global: { plugins: [i18n] },
      props: {
        naturalLang: '',
        styleTags: ['开心', '东北话'],
        director: { enabled: false, character: '', scene: '', direction: '' },
        supportSinging: true,
      },
    })
    await clickTag(w, '唱歌')
    expect(lastEmittedTags(w)).toEqual(['唱歌'])
  })

  it('再次点击已选中的风格会取消', async () => {
    const w = mount(StylePanel, {
      global: { plugins: [i18n] },
      props: {
        naturalLang: '',
        styleTags: ['开心'],
        director: { enabled: false, character: '', scene: '', direction: '' },
      },
    })
    await clickTag(w, '开心')
    expect(lastEmittedTags(w)).toEqual([])
  })

  it('支持多风格叠加', async () => {
    const w = mount(StylePanel, {
      global: { plugins: [i18n] },
      props: {
        naturalLang: '',
        styleTags: ['开心'],
        director: { enabled: false, character: '', scene: '', direction: '' },
      },
    })
    await clickTag(w, '东北话')
    expect(lastEmittedTags(w)).toEqual(['开心', '东北话'])
  })
})
