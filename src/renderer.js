import { createApp } from 'vue';
import App from './App.vue';
import router from "./router/router";

import 'ant-design-vue/dist/reset.css';
import Antd from "ant-design-vue";
import MateChat from '@matechat/core';

import '@devui-design/icons/icomoon/devui-icon.css';


const app = createApp(App);
app.use(router)
app.use(Antd)
app.use(MateChat)
app.mount('#app')