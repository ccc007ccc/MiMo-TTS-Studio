import { describe, it, expect } from 'vitest'
import { buildStyledText, buildDirectorPrompt } from '@/api/synth'

describe('buildStyledText', () => {
  it('returns trimmed text when no style tags', () => {
    expect(buildStyledText('  hello  ', [])).toBe('hello')
  })

  it('prepends single style tag with <style> wrapper', () => {
    expect(buildStyledText('哎呀妈呀', ['东北话'])).toBe('<style>东北话</style>哎呀妈呀')
  })

  it('joins multiple style tags with comma', () => {
    expect(buildStyledText('太棒了！', ['开心', '东北话'])).toBe(
      '<style>开心,东北话</style>太棒了！',
    )
  })

  it('preserves order of style tags', () => {
    expect(buildStyledText('x', ['a', 'b', 'c'])).toBe('<style>a,b,c</style>x')
  })

  it('handles empty text with tags', () => {
    expect(buildStyledText('', ['开心'])).toBe('<style>开心</style>')
  })
})

describe('buildDirectorPrompt', () => {
  const empty = { enabled: false, character: '', scene: '', direction: '' }

  it('returns fallback when disabled', () => {
    expect(buildDirectorPrompt(empty, 'fallback')).toBe('fallback')
  })

  it('returns fallback regardless of fields when disabled', () => {
    expect(
      buildDirectorPrompt(
        { ...empty, character: 'X', scene: 'Y', direction: 'Z' },
        'fallback',
      ),
    ).toBe('fallback')
  })

  it('joins all three fields when enabled', () => {
    const result = buildDirectorPrompt(
      { enabled: true, character: '侦探', scene: '深夜公寓', direction: '低沉' },
      '',
    )
    expect(result).toBe('【角色】侦探\n【场景】深夜公寓\n【指导】低沉')
  })

  it('skips empty fields', () => {
    const result = buildDirectorPrompt(
      { enabled: true, character: '侦探', scene: '', direction: '低沉' },
      '',
    )
    expect(result).toBe('【角色】侦探\n【指导】低沉')
  })

  it('returns empty string when enabled but all fields blank', () => {
    expect(buildDirectorPrompt({ enabled: true, character: '', scene: '', direction: '' }, '')).toBe('')
  })

  it('trims whitespace in fields', () => {
    const result = buildDirectorPrompt(
      { enabled: true, character: '  X  ', scene: '', direction: '' },
      '',
    )
    expect(result).toBe('【角色】X')
  })
})
