// 高层合成辅助：拼接风格标签、导演剧本，调用底层 synthesize
import { synthesize } from './tts'
import type { AudioFormat, DirectorScript, Mode, ModelId, VoiceRef } from '@/types'

const MODEL_BY_MODE: Record<Mode, ModelId> = {
  synth: 'mimo-v2.5-tts',
  design: 'mimo-v2.5-tts-voicedesign',
  clone: 'mimo-v2.5-tts-voiceclone',
}

export function buildStyledText(text: string, styleTags: string[]): string {
  const trimmed = text.trim()
  if (!styleTags.length) return trimmed
  return `<style>${styleTags.join(',')}</style>${trimmed}`
}

export function buildDirectorPrompt(d: DirectorScript, fallback: string): string {
  if (!d.enabled) return fallback
  const parts: string[] = []
  if (d.character.trim()) parts.push(`【角色】${d.character.trim()}`)
  if (d.scene.trim()) parts.push(`【场景】${d.scene.trim()}`)
  if (d.direction.trim()) parts.push(`【指导】${d.direction.trim()}`)
  return parts.join('\n')
}

export interface SynthRequest {
  mode: Mode
  text: string
  styleTags: string[]
  format: AudioFormat
  /** synth: 预置或克隆音色 ID；design/clone 不传 */
  voiceId?: string
  /** clone 模式必填：参考音频 dataUri */
  cloneDataUri?: string
  /** synth: 自然语言或导演剧本；design: 音色描述（必填）；clone: 通常为空 */
  userContent?: string
}

export async function runSynthesis(
  req: SynthRequest,
  apiKey: string,
  baseUrl: string,
  signal?: AbortSignal,
): Promise<string> {
  const model = MODEL_BY_MODE[req.mode]
  const text = buildStyledText(req.text, req.styleTags)

  let voice: VoiceRef | undefined
  if (req.mode === 'synth' && req.voiceId) {
    voice = { type: 'preset', id: req.voiceId }
  } else if (req.mode === 'clone' && req.cloneDataUri) {
    voice = { type: 'clone', dataUri: req.cloneDataUri }
  }

  return synthesize(
    {
      text,
      voice,
      format: req.format,
      model,
      userContent: req.userContent,
    },
    apiKey,
    baseUrl,
    signal,
  )
}
