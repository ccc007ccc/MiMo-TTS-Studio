<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'

const props = defineProps<{ data: number[]; progress?: number }>()

const canvasRef = ref<HTMLCanvasElement>()
const containerRef = ref<HTMLDivElement>()

function draw() {
  const canvas = canvasRef.value
  if (!canvas || !props.data.length) return

  const container = containerRef.value!
  const dpr = window.devicePixelRatio || 1
  const w = container.clientWidth
  const h = container.clientHeight

  canvas.width = w * dpr
  canvas.height = h * dpr
  canvas.style.width = w + 'px'
  canvas.style.height = h + 'px'

  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, w, h)

  const barWidth = Math.max(2, (w / props.data.length) * 0.6)
  const gap = (w - barWidth * props.data.length) / (props.data.length - 1 || 1)
  const progressX = (props.progress ?? 1) * w

  props.data.forEach((val, i) => {
    const x = i * (barWidth + gap)
    const barH = Math.max(2, val * h * 0.85)
    const y = (h - barH) / 2

    const isPlayed = x + barWidth <= progressX
    ctx.fillStyle = isPlayed ? 'rgba(99, 102, 241, 0.8)' : 'rgba(255, 255, 255, 0.15)'
    ctx.beginPath()
    ctx.roundRect(x, y, barWidth, barH, 1)
    ctx.fill()
  })
}

watch(() => [props.data, props.progress], () => nextTick(draw), { deep: true })
onMounted(() => nextTick(draw))
</script>

<template>
  <div ref="containerRef" class="w-full h-16 cursor-pointer">
    <canvas ref="canvasRef" class="w-full h-full" />
  </div>
</template>
