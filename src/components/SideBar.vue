<script setup>
import {defineProps, defineEmits, computed, h, ref, onMounted, onUnmounted} from 'vue'
import {MenuFoldOutlined} from "@ant-design/icons-vue";
import Logo from '@/assets/images/logo.gif'
import {message} from "ant-design-vue";

const props = defineProps({
  show: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:show'])

const toggleSidebar = () => {
  emit('update:show', !props.show)
}

const canvasRef = ref(null)
let ctx = null
let animationId = null
const particles = []

class Particle {
  constructor(x, y) {
    this.x = x
    this.y = y
    const angle = Math.random() * Math.PI * 2
    const speed = Math.random() * 4 + 2
    this.vx = Math.cos(angle) * speed
    this.vy = Math.sin(angle) * speed
    this.radius = Math.random() * 4 + 2
    this.color = `hsl(${Math.random() * 60 + 30}, 100%, 60%)`
    this.alpha = 1
    this.decay = Math.random() * 0.02 + 0.015
  }

  update() {
    this.x += this.vx
    this.y += this.vy
    this.vy += 0.05
    this.alpha -= this.decay
    this.radius *= 0.98
  }

  draw() {
    ctx.save()
    ctx.globalAlpha = this.alpha
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    ctx.fillStyle = this.color
    ctx.fill()
    ctx.restore()
  }
}

const createParticles = (e) => {
  message.success("Trying to do better.")
  const rect = e.target.getBoundingClientRect()
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2
  
  for (let i = 0; i < 30; i++) {
    particles.push(new Particle(x, y))
  }
  
  if (!animationId) {
    animate()
  }
}

const animate = () => {
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
  
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.update()
    p.draw()
    
    if (p.alpha <= 0) {
      particles.splice(i, 1)
    }
  }
  
  if (particles.length > 0) {
    animationId = requestAnimationFrame(animate)
  } else {
    animationId = null
  }
}

onMounted(() => {
  ctx = canvasRef.value.getContext('2d')
  canvasRef.value.width = window.innerWidth
  canvasRef.value.height = window.innerHeight
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
})
</script>

<template>
  <canvas ref="canvasRef" class="particle-canvas"></canvas>
  <Transition name="sidebar">
    <aside v-if="show" class="sidebar">
      <div class="title">
        <img class="logo" @click="createParticles" :src="Logo">
        <a-button class="toggle-btn" @click="toggleSidebar" :icon="h(MenuFoldOutlined)"></a-button>
      </div>
      <div style="min-width: 240px">
        <slot></slot>
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.particle-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 9999;
}

.sidebar {
  background: #1b1b1c;
  width: 240px;
  height: 100%;
  border-right: 1px solid #e8e8e8;
  overflow: hidden;
  flex-shrink: 0;

  position: relative;
  border-right: 1px solid rgba(255,255,255,.06);
}

.title {
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
}

.logo {
  cursor: pointer;
  width: 50px;
  position: absolute;
  left: 12px;
  animation: logoMove 2.5s linear infinite;
}

@keyframes logoMove {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(120px);
  }
}

.toggle-btn {
  margin-left: auto;
}

.sidebar-enter-active,
.sidebar-leave-active {
  transition: width 0.3s ease, opacity 0.3s ease;
}

.sidebar-enter-from,
.sidebar-leave-to {
  width: 0;
  opacity: 0;
}
</style>
