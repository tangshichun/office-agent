<script setup>
import {defineProps, defineEmits, computed, h} from 'vue'
import {MenuFoldOutlined} from "@ant-design/icons-vue";
import Logo from '@/assets/images/logo.gif'

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
function handleImageClick() {

}
</script>

<template>
  <Transition name="sidebar">
    <aside v-if="show" class="sidebar">
      <div class="title">
        <img class="logo" @click="handleImageClick" :src="Logo">
        <a-button class="toggle-btn" @click="toggleSidebar" :icon="h(MenuFoldOutlined)"></a-button>
      </div>
      <div style="min-width: 240px">
        <slot></slot>
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
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
