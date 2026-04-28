import { ref, onUnmounted } from 'vue'

export function useAudioPlayer() {
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = ref(0.8)
  let audio: HTMLAudioElement | null = null

  function load(url: string) {
    stop()
    audio = new Audio(url)
    audio.volume = volume.value
    audio.addEventListener('timeupdate', () => {
      currentTime.value = audio!.currentTime
    })
    audio.addEventListener('loadedmetadata', () => {
      duration.value = audio!.duration
    })
    audio.addEventListener('ended', () => {
      isPlaying.value = false
      currentTime.value = 0
    })
  }

  async function play() {
    if (audio) {
      try {
        await audio.play()
        isPlaying.value = true
      } catch {
        isPlaying.value = false
      }
    }
  }

  function pause() {
    if (audio) {
      audio.pause()
      isPlaying.value = false
    }
  }

  function toggle() {
    if (isPlaying.value) pause()
    else play()
  }

  function seek(time: number) {
    if (audio) {
      audio.currentTime = time
      currentTime.value = time
    }
  }

  function setVolume(v: number) {
    volume.value = v
    if (audio) audio.volume = v
  }

  function stop() {
    if (audio) {
      audio.pause()
      audio.src = ''
      audio = null
    }
    isPlaying.value = false
    currentTime.value = 0
    duration.value = 0
  }

  onUnmounted(stop)

  return { isPlaying, currentTime, duration, volume, load, play, pause, toggle, seek, setVolume, stop }
}
