import { ref, onUnmounted } from 'vue'

export function useWaveform() {
  const waveformData = ref<number[]>([])
  let audioContext: AudioContext | null = null

  async function analyze(base64: string) {
    if (audioContext) {
      audioContext.close()
    }

    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

    audioContext = new AudioContext()
    const audioBuffer = await audioContext.decodeAudioData(bytes.buffer)

    const rawData = audioBuffer.getChannelData(0)
    const samples = 80
    const blockSize = Math.floor(rawData.length / samples)
    const data: number[] = []

    for (let i = 0; i < samples; i++) {
      let sum = 0
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(rawData[i * blockSize + j])
      }
      data.push(sum / blockSize)
    }

    const max = Math.max(...data)
    waveformData.value = data.map((v) => v / (max || 1))
  }

  function clear() {
    waveformData.value = []
    if (audioContext) {
      audioContext.close()
      audioContext = null
    }
  }

  onUnmounted(clear)

  return { waveformData, analyze, clear }
}
