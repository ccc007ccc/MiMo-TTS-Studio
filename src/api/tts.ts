export interface TtsRequest {
  model: string
  messages: Array<{ role: string; content: string }>
  audio: { format: string; voice?: string }
}

export interface TtsResponse {
  choices: Array<{
    message: {
      audio?: { data: string }
      content?: string
    }
  }>
}

export interface SynthParams {
  text: string
  voice?: string
  format: 'wav' | 'mp3'
  model: string
  userContent?: string
}

export async function synthesize(params: SynthParams, apiKey: string, baseUrl: string): Promise<string> {
  const messages: Array<{ role: string; content: string }> = []

  // user 消息: 自然语言描述（可选）、voice design 必填
  if (params.userContent !== undefined && params.userContent.trim()) {
    messages.push({ role: 'user', content: params.userContent })
  }

  // assistant 消息: 包含内联风格标签和音频标签的文本
  messages.push({ role: 'assistant', content: params.text })

  const audio: { format: string; voice?: string } = { format: params.format }
  if (params.voice) audio.voice = params.voice

  const payload: TtsRequest = {
    model: params.model,
    messages,
    audio,
  }

  const apiBase = import.meta.env.DEV ? '/api' : baseUrl

  const res = await fetch(`${apiBase}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `API 请求失败: ${res.status}`)
  }

  const data: TtsResponse = await res.json()
  const audioData = data.choices?.[0]?.message?.audio?.data
  if (!audioData) throw new Error('响应中未包含音频数据')

  return audioData
}

export function base64ToAudioUrl(base64: string, format: string): string {
  const mime = format === 'mp3' ? 'audio/mpeg' : 'audio/wav'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const blob = new Blob([bytes], { type: mime })
  return URL.createObjectURL(blob)
}

export function downloadAudio(base64: string, format: string, filename: string) {
  const url = base64ToAudioUrl(base64, format)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
