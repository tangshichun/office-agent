// src/router/index.js
import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/home/Home.vue'

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
  history: createWebHashHistory(),
  routes
})

export default router