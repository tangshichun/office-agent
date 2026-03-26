import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from "node:path";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),  // 确保别名配置正确
    }
  },
  base: './',
});