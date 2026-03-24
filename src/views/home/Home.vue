<template>
  <div class="home">
    <side-bar v-model:show="showSidebar">
      <div>啊手机打开手机打开了</div>
    </side-bar>


    <div>
      <Transition name="sidebar" v-show="!showSidebar">
        <a-button class="sidebar-toggle" :icon="h(MenuUnfoldOutlined)" @click="handleToggleClick">
        </a-button>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import {ref} from "vue";
import SideBar from "../../components/SideBar.vue";
import {h} from 'vue';
import {MenuUnfoldOutlined} from "@ant-design/icons-vue"

const showSidebar = ref(true);

function handleToggleClick() {
  showSidebar.value = !showSidebar.value;
}
</script>

<style scoped>
.home {
  display: flex;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.sidebar-toggle {
  margin: 12px;
}

/* 复用相同的动画效果 */
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