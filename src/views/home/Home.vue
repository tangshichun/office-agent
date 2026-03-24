<template>
  <div class="home">
    <side-bar v-model:show="showSidebar">
      <div class="slid-bar-content">
        <a-button class="create-button" type="primary" @click="handleCreateTalkAgentClick">
          <PlusOutlined/>
          新建会话
        </a-button>
      </div>
    </side-bar>


    <div class="main-content">

      <McLayout class="container">
        <McLayoutContent
            v-if="startPage"
            style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px"
        >
          <McIntroduction
              :logoImg="'https://matechat.gitcode.com/logo2x.svg'"
              :title="'MateChat'"
              :subTitle="'Hi，随便说点什么吧'"
              :description="description"
          ></McIntroduction>
          <McPrompt
              :list="introPrompt.list"
              :direction="introPrompt.direction"
              class="intro-prompt"
              @itemClick="onSubmit($event.label)"
          ></McPrompt>
        </McLayoutContent>
        <McLayoutContent class="content-container" v-else>
          <template v-for="(msg, idx) in messages" :key="idx">
            <McBubble
                v-if="msg.from === 'user'"
                :content="msg.content"
                :align="'right'"
                :avatarConfig="{ imgSrc: 'https://matechat.gitcode.com/png/demo/userAvatar.svg' }"
            >
            </McBubble>
            <McBubble v-else :content="msg.content" :avatarConfig="{ imgSrc: 'https://matechat.gitcode.com/logo.svg' }" :loading="msg.loading"> </McBubble>
          </template>
        </McLayoutContent>
        <div class="shortcut" style="display: flex; align-items: center; gap: 8px">
          <McPrompt
              v-if="!startPage"
              :list="simplePrompt"
              :direction="'horizontal'"
              style="flex: 1"
              @itemClick="onSubmit($event.label)"
          ></McPrompt>
          <Button
              style="margin-left: auto"
              icon="add"
              shape="circle"
              title="新建对话"
              size="md"
              @click="newConversation"
          />
        </div>
        <McLayoutSender>
          <McInput :value="inputValue" :maxLength="2000" @change="(e) => (inputValue = e)" @submit="onSubmit">
            <template #extra>
              <div class="input-foot-wrapper">
                <div class="input-foot-left">
              <span v-for="(item, index) in inputFootIcons" :key="index">
                <i :class="item.icon"></i>
                {{ item.text }}
              </span>
                  <span class="input-foot-dividing-line"></span>
                  <span class="input-foot-maxlength">{{ inputValue.length }}/2000</span>
                </div>
                <div class="input-foot-right">
                </div>
                <a-button style="border-radius: 100px" @click="inputValue = ''">清空输入</a-button>
              </div>
            </template>
          </McInput>
        </McLayoutSender>
      </McLayout>


      <Transition name="sidebar" v-show="!showSidebar">
        <a-button class="sidebar-toggle" :icon="h(MenuUnfoldOutlined)" @click="handleToggleClick">
        </a-button>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import {h, ref} from "vue";
import SideBar from "../../components/SideBar.vue";
import {MenuUnfoldOutlined, PlusOutlined} from "@ant-design/icons-vue"

const showSidebar = ref(true);

function handleToggleClick() {
  showSidebar.value = !showSidebar.value;
}

function handleCreateTalkAgentClick() {
  window.agentIpc.createAgent({
    type: "talk",
  })
}


const description = [
  '您可以说，帮我查询下下周天气',
];
const introPrompt = {
  direction: 'horizontal',
  list: [
    {
      value: 'quickSort',
      label: '帮我写一个快速排序',
      iconConfig: { name: 'icon-info-o', color: '#5e7ce0' },
      desc: '使用 js 实现一个快速排序',
    },
    {
      value: 'helpMd',
      label: '你可以帮我做些什么？',
      iconConfig: { name: 'icon-star', color: 'rgb(255, 215, 0)' },
      desc: '了解当前大模型可以帮你做的事',
    },
    {
      value: 'bindProjectSpace',
      label: '怎么绑定项目空间',
      iconConfig: { name: 'icon-priority', color: '#3ac295' },
      desc: '如何绑定云空间中的项目',
    },
  ],
};
const simplePrompt = [
  {
    value: 'quickSort',
    iconConfig: { name: 'icon-info-o', color: '#5e7ce0' },
    label: '帮我写一个快速排序',
  },
  {
    value: 'helpMd',
    iconConfig: { name: 'icon-star', color: 'rgb(255, 215, 0)' },
    label: '你可以帮我做些什么？',
  },
];
const startPage = ref(true);
const inputValue = ref('');
const inputFootIcons = [
  { icon: 'icon-at', text: '智能体' },
  { icon: 'icon-standard', text: '词库' },
  { icon: 'icon-add', text: '附件' },
];

const messages = ref([]);

const newConversation = () => {
  startPage.value = true;
  messages.value = [];
}

const onSubmit = (evt) => {
  inputValue.value='';
  startPage.value = false;
  // 用户发送消息
  messages.value.push({
    from: 'user',
    content: evt,
  });
  setTimeout(() => {
    // 模型返回消息
    messages.value.push({
      from: 'model',
      content: evt,
    });
  }, 200);
};
</script>

<style scoped>
.home {
  display: flex;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.sidebar-toggle {
  position: absolute;
  top: 12px;
  left: 12px;
}

.create-button {
  margin-top: 12px;
  width: 200px;
  height: 40px;
  border-radius: 100px;
}

.slid-bar-content {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
}

.main-content {
  flex: 1;
  overflow: hidden;
  position: relative;
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



.container {
  margin: 20px;
  height: calc(100vh - 82px);
  padding: 20px;
  gap: 8px;
  background: transparent;
  border: 1px solid #3d3d3d;
  border-radius: 16px;
}

.content-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: auto;
}

.input-foot-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  height: 100%;
  margin-right: 8px;

  .input-foot-left {
    display: flex;
    align-items: center;
    gap: 8px;

    span {
      font-size: 14px;
      line-height: 18px;
      color: #252b3a;
      cursor: pointer;
    }

    .input-foot-dividing-line {
      width: 1px;
      height: 14px;
      background-color: transparent;
    }

    .input-foot-maxlength {
      font-size: 14px;
      color: #71757f;
    }
  }
}
</style>