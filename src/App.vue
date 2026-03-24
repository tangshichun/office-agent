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
  --background-color: #151517
}

html, body, #app {
  background: var(--background-color);
}
</style>