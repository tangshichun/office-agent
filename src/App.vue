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
</style>