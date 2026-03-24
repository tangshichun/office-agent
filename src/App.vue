<template>
  <a-config-provider
      :theme="{
        algorithm: theme.darkAlgorithm,
    }"
  >
    <router-view></router-view>
  </a-config-provider>
</template>

<script setup>
import {theme} from "ant-design-vue";
import {galaxyTheme, ThemeServiceInit, deepTheme} from 'devui-theme';
import {onMounted} from "vue";
const themeService = ThemeServiceInit({ galaxyTheme  }, 'galaxyTheme');

onMounted(() => {
  themeService.applyTheme(galaxyTheme)
})
</script>

<style>
:root {
  --background-color: #151517;

  --text-color: white;
}

html, body, #app {
  background: var(--background-color);
  color: var(--text-color);

  width: 100%;
  height: 100%;
  overflow: hidden;
}

::-webkit-scrollbar {
  width: 8px;
  background-color: transparent;
}

/*定义滚动条轨道：内阴影+圆角*/
::-webkit-scrollbar-track {
  background-color: transparent;
}

/*定义滑块：内阴影+圆角*/
::-webkit-scrollbar-thumb {
  border-radius: 10px;
  background-color: #555;
}
</style>