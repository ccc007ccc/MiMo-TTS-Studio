import { ref, onUnmounted } from 'vue'

const MAX_DURATION = 30 // 秒

export function useRecorder() {
  const isRecording = ref(false)
  const duration = ref(0)
  const audioLevel = ref(0)
  const recordedBlob = ref<Blob | null>(null)
  const error = ref('')

  let mediaRecorder: MediaRecorder | null = null
  let stream: MediaStream | null = null
  let audioContext: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let recordedChunks: Blob[] = []
  let timer: ReturnType<typeof setInterval> | null = null
  let levelRaf = 0

  async function start() {
    error.value = ''
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      recordedChunks = []
      mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data)
      }
      mediaRecorder.onstop = async () => {
        cleanup()
        const webmBlob = new Blob(recordedChunks, { type: 'audio/webm' })
        recordedBlob.value = await webmToWav(webmBlob)
      }

      // 实时音量
      audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const updateLevel = () => {
        if (!analyser) return
        analyser.getByteFrequencyData(dataArray)
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
        audioLevel.value = sum / dataArray.length / 255
        levelRaf = requestAnimationFrame(updateLevel)
      }
      updateLevel()

      mediaRecorder.start()
      isRecording.value = true
      duration.value = 0

      timer = setInterval(() => {
        duration.value++
        if (duration.value >= MAX_DURATION) stop()
      }, 1000)
    } catch {
      // 浏览器错误信息因平台而异，统一返回错误码由组件层翻译
      error.value = 'micPermission'
      cleanup()
    }
  }

  function stop() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
    }
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    isRecording.value = false
  }

  function cleanup() {
    stream?.getTracks().forEach((t) => t.stop())
    stream = null
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close()
    }
    audioContext = null
    analyser = null
    if (levelRaf) cancelAnimationFrame(levelRaf)
    audioLevel.value = 0
  }

  function reset() {
    stop()
    recordedBlob.value = null
    duration.value = 0
  }

  onUnmounted(() => {
    stop()
    cleanup()
  })

  return {
    isRecording,
    duration,
    audioLevel,
    recordedBlob,
    error,
    maxDuration: MAX_DURATION,
    start,
    stop,
    reset,
  }
}

async function webmToWav(blob: Blob): Promise<Blob> {
  const ctx = new AudioContext()
  try {
    const arrayBuffer = await blob.arrayBuffer()
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
    const numChannels = audioBuffer.numberOfChannels
    const sampleRate = audioBuffer.sampleRate
    const length = audioBuffer.length
    const bytesPerSample = 2
    const blockAlign = numChannels * bytesPerSample
    const dataSize = length * blockAlign
    const buffer = new ArrayBuffer(44 + dataSize)
    const view = new DataView(buffer)

    function writeString(offset: number, str: string) {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
    }

    writeString(0, 'RIFF')
    view.setUint32(4, 36 + dataSize, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, numChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * blockAlign, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, 16, true)
    writeString(36, 'data')
    view.setUint32(40, dataSize, true)

    const channels: Float32Array[] = []
    for (let i = 0; i < numChannels; i++) channels.push(audioBuffer.getChannelData(i))

    let offset = 44
    for (let i = 0; i < length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, channels[ch][i]))
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
        offset += 2
      }
    }

    return new Blob([buffer], { type: 'audio/wav' })
  } finally {
    ctx.close()
  }
}
