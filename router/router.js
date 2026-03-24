// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import Home from "../src/home/Home.vue";

// 定义路由配置
const routes = [
  {
    path: '/',
    name: 'home',
    component: Home
  },
]

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),  // HTML5 模式
  routes
})

export default router