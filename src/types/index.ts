// 统一类型定义

export type AudioFormat = 'wav' | 'mp3'

export type ModelId =
  | 'mimo-v2.5-tts'
  | 'mimo-v2.5-tts-voicedesign'
  | 'mimo-v2.5-tts-voiceclone'

export type Mode = 'synth' | 'design' | 'clone'

// voice 字段精确化：预置 ID 或 data: URI（克隆）
export type VoiceRef =
  | { type: 'preset'; id: string }
  | { type: 'clone'; dataUri: string }

export interface VoiceOption {
  id: string
  name: string
  description: string
  locale: string
  gender: 'male' | 'female'
  /** 是否为用户克隆音色 */
  custom?: boolean
  /** 克隆音色对应的参考音频 dataUri */
  dataUri?: string
  /** 创建时间 */
  createdAt?: number
}

export interface SynthParams {
  text: string
  voice?: VoiceRef
  format: AudioFormat
  model: ModelId
  /** user 角色 content：自然语言描述 / 音色描述 */
  userContent?: string
}

export interface HistoryItem {
  id: string
  text: string
  voice: string
  voiceLabel?: string
  mode: Mode
  model: ModelId
  format: AudioFormat
  createdAt: number
}

export interface BatchItem {
  id: string
  text: string
  /** 单条覆盖音色（不设则用全局） */
  voiceOverride?: string
  status: 'pending' | 'processing' | 'done' | 'error'
  error?: string
}

export interface DirectorScript {
  enabled: boolean
  character: string
  scene: string
  direction: string
}
