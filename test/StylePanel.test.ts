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
  fallbackLocale: 'en-US',
  messages: { 'zh-CN': zhCN, 'en-US': enUS },
})

beforeEach(() => {
  setActivePinia(createPinia())
})

function makeWrapper(props: { supportSinging?: boolean } = {}) {
  return mount(StylePanel, {
    global: { plugins: [i18n] },
    props: {
      naturalLang: '',
      styleTags: [],
      director: { enabled: false, character: '', scene: '', direction: '' },
      ...props,
    },
  })
}

describe('StylePanel', () => {
  it('renders style and audio tag groups', () => {
    const w = makeWrapper()
    expect(w.text()).toContain('开心')
    expect(w.text()).toContain('东北话')
    expect(w.text()).toContain('inhale')
  })

  it('does not render singing button when supportSinging=false', () => {
    const w = makeWrapper({ supportSinging: false })
    expect(w.findAll('button').some((b) => b.text() === '唱歌')).toBe(false)
  })

  it('renders singing button when supportSinging=true', () => {
    const w = makeWrapper({ supportSinging: true })
    expect(w.findAll('button').some((b) => b.text() === '唱歌')).toBe(true)
  })

  it('emits styleTags update when clicking a style tag', async () => {
    const w = makeWrapper()
    const btn = w.findAll('button').find((b) => b.text() === '开心')!
    await btn.trigger('click')
    const emitted = w.emitted('update:styleTags')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toEqual(['开心'])
  })

  it('emits insertAudioTag with parens when clicking audio tag', async () => {
    const w = makeWrapper()
    const btn = w.findAll('button').find((b) => b.text() === '吸气')!
    await btn.trigger('click')
    const emitted = w.emitted('insertAudioTag')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toBe('(吸气)')
  })

  it('switches to English when locale changes', async () => {
    i18n.global.locale.value = 'en-US'
    const w = makeWrapper()
    expect(w.text()).toContain('Style tags')
    expect(w.text()).toContain('Audio tags')
    i18n.global.locale.value = 'zh-CN'
  })
})
