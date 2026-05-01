import type { AudioFormat, ModelId, SynthParams, VoiceRef } from '@/types'

interface TtsRequest {
  model: ModelId
  messages: Array<{ role: string; content: string }>
  audio: { format: string; voice?: string }
}

interface TtsResponse {
  choices: Array<{
    message: {
      audio?: { data: string }
      content?: string
    }
  }>
}

function voiceToString(voice?: VoiceRef): string | undefined {
  if (!voice) return undefined
  return voice.type === 'preset' ? voice.id : voice.dataUri
}

export async function synthesize(
  params: SynthParams,
  apiKey: string,
  baseUrl: string,
  signal?: AbortSignal,
): Promise<string> {
  const messages: Array<{ role: string; content: string }> = []

  if (params.userContent !== undefined && params.userContent.trim()) {
    messages.push({ role: 'user', content: params.userContent })
  }

  messages.push({ role: 'assistant', content: params.text })

  const audio: { format: string; voice?: string } = { format: params.format }
  const voiceStr = voiceToString(params.voice)
  if (voiceStr) audio.voice = voiceStr

  const payload: TtsRequest = {
    model: params.model,
    messages,
    audio,
  }

  // 浏览器开发模式走 vite 代理；其他场景（生产 / Node 测试）直接使用 baseUrl
  const inBrowser = typeof window !== 'undefined'
  const useDevProxy = inBrowser && import.meta.env.DEV
  const apiBase = useDevProxy ? '/api' : baseUrl

  const res = await fetch(`${apiBase}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
    signal,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const status = res.status
    const apiMsg = err.error?.message
    // 抛带 code 的错误，组件层面用 i18n 翻译
    const e = new Error(apiMsg || `HTTP_${status}`) as Error & { code?: string; status?: number }
    e.status = status
    if (status === 401) e.code = 'invalidApiKey'
    else if (status === 403) e.code = 'forbidden'
    else if (status === 429) e.code = 'rateLimit'
    else e.code = 'requestFailed'
    throw e
  }

  const data: TtsResponse = await res.json()
  const audioData = data.choices?.[0]?.message?.audio?.data
  if (!audioData) {
    const e = new Error('NO_AUDIO') as Error & { code?: string }
    e.code = 'noAudioInResponse'
    throw e
  }

  return audioData
}

export function base64ToBlob(base64: string, format: AudioFormat): Blob {
  const mime = format === 'mp3' ? 'audio/mpeg' : 'audio/wav'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

export function base64ToAudioUrl(base64: string, format: AudioFormat): string {
  return URL.createObjectURL(base64ToBlob(base64, format))
}

export function downloadAudio(base64: string, format: AudioFormat, filename: string) {
  const url = base64ToAudioUrl(base64, format)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError'
}
