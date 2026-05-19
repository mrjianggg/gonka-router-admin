<template>
  <div ref="hostRef" class="chart-host" :style="{ height: resolvedHeight }" />
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch, computed } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  option: { type: Object, required: true },
  height: { type: String, default: '320px' },
  mobileHeight: { type: String, default: '' },
})

const hostRef = ref(null)
let instance = null
let ro = null
const isMobile = ref(typeof window !== 'undefined' && window.innerWidth <= 640)

const resolvedHeight = computed(() => {
  if (isMobile.value && props.mobileHeight) return props.mobileHeight
  return props.height
})

function onResize() {
  isMobile.value = window.innerWidth <= 640
  instance && instance.resize()
}

function render() {
  if (!instance || !props.option) return
  instance.setOption(props.option, true)
}

onMounted(() => {
  instance = echarts.init(hostRef.value)
  render()
  ro = new ResizeObserver(() => instance && instance.resize())
  ro.observe(hostRef.value)
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  ro?.disconnect()
  window.removeEventListener('resize', onResize)
  instance?.dispose()
  instance = null
})

watch(() => props.option, render, { deep: true })
</script>
