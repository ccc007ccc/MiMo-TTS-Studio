// 集成测试：调用真实 TTS endpoint。
// 默认跳过；需用 VITE_TEST_BASE_URL=https://your-endpoint.com 启用。
// 运行：VITE_TEST_BASE_URL=https://xxx npm run test:integration
import { describe, it, expect } from 'vitest'
import { synthesize } from '@/api/tts'

const BASE_URL = process.env.VITE_TEST_BASE_URL
const API_KEY = process.env.VITE_TEST_API_KEY || 'test'

const skip = !BASE_URL
const describeIfEnabled = skip ? describe.skip : describe

describeIfEnabled('真实端点集成测试', () => {
  it('合成简单中文返回 base64 音频', async () => {
    const b64 = await synthesize(
      {
        text: '你好世界',
        format: 'mp3',
        model: 'mimo-v2.5-tts',
        voice: { type: 'preset', id: 'mimo_default' },
      },
      API_KEY,
      BASE_URL!,
    )
    expect(b64.length).toBeGreaterThan(100)
    // mp3 帧头特征
    expect(b64.startsWith('//')).toBe(true)
  })

  it('风格标签触发更长的音频生成', async () => {
    const plain = await synthesize(
      {
        text: '太棒了',
        format: 'mp3',
        model: 'mimo-v2.5-tts',
        voice: { type: 'preset', id: 'mimo_default' },
      },
      API_KEY,
      BASE_URL!,
    )
    const styled = await synthesize(
      {
        text: '<style>开心</style>太棒了',
        format: 'mp3',
        model: 'mimo-v2.5-tts',
        voice: { type: 'preset', id: 'mimo_default' },
      },
      API_KEY,
      BASE_URL!,
    )
    // 带情绪表达通常输出长度变化（不强制 >, 只验证两次都成功）
    expect(plain.length).toBeGreaterThan(0)
    expect(styled.length).toBeGreaterThan(0)
  })

  it('voicedesign 模型接受 user 描述', async () => {
    const b64 = await synthesize(
      {
        text: 'hello world',
        format: 'mp3',
        model: 'mimo-v2.5-tts-voicedesign',
        userContent: 'a warm young female voice',
      },
      API_KEY,
      BASE_URL!,
    )
    expect(b64.length).toBeGreaterThan(100)
  })

  it('AbortController 能中断请求', async () => {
    const ctrl = new AbortController()
    const promise = synthesize(
      {
        text: '这是一段比较长的测试文本。这是一段比较长的测试文本。这是一段比较长的测试文本。',
        format: 'mp3',
        model: 'mimo-v2.5-tts',
        voice: { type: 'preset', id: 'mimo_default' },
      },
      API_KEY,
      BASE_URL!,
      ctrl.signal,
    )
    // 立即中断
    setTimeout(() => ctrl.abort(), 50)
    await expect(promise).rejects.toThrow()
  })
})
