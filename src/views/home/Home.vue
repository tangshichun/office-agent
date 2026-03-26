<template>
  <div class="home">
    <side-bar v-model:show="showSidebar">
      <div class="slid-bar-content">
        <a-button class="create-button" type="primary" @click="handleCreateTalkAgentClick">
          <PlusOutlined/>
          新建会话
        </a-button>

        <HistoryList @item-delete="handleDeleteSession" @item-click="handleItemClick" style="margin-top: 20px"
                     :active-id="currentSessionId" :sessions='sessionList'></HistoryList>
      </div>
    </side-bar>


    <div class="main-content">

      <McLayout class="container">
        <McLayoutContent
            v-if="!messages.length"
            style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px"
        >
          <McIntroduction
              :logoImg="'https://matechat.gitcode.com/logo2x.svg'"
              :title="'MateChat'"
              :subTitle="'Hi，随便说点什么吧'"
              :description="description"
          ></McIntroduction>
          <McPrompt
              style="margin-top: 20px"
              :list="introPrompt.list"
              :direction="introPrompt.direction"
              class="intro-prompt"
              @itemClick="onSubmit($event.label)"
          ></McPrompt>
        </McLayoutContent>
        <McLayoutContent class="content-container" v-else>
          <template v-for="(msg, idx) in messages" :key="idx">
            <McBubble
                class="bubble"
                style="margin-bottom: 14px"
                v-if="msg.from === 'user'"
                :content="msg.content"
                :align="'right'"
            >
            </McBubble>
            <McBubble v-else :avatarConfig="modelAvatar"
                      style="margin-bottom: 14px"
                      class="mc-bubble"
                      :loading="msg.loading">
              <McMarkdownCard :typing="typing" :enableThink="true" :content="msg.content" theme="dark"></McMarkdownCard>
            </McBubble>
          </template>
        </McLayoutContent>
        <div class="shortcut" style="display: flex; align-items: center; gap: 8px">
          <McPrompt
              v-if="!messages.length"
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
import UserAvatar from "@/assets/images/user-avatar.png"
import {h, onMounted, ref, shallowRef} from "vue";
import SideBar from "../../components/SideBar.vue";
import {MenuUnfoldOutlined, PlusOutlined} from "@ant-design/icons-vue"
import HistoryList from "./components/HistoryList.vue";
import {Modal, message} from "ant-design-vue";
import {ulid} from "ulid";
import {toolsTextMapper} from "../../../utils/tools-text-mapper";

const modelAvatar = {
  imgSrc: UserAvatar,
};

const sessionList = shallowRef([]);
const currentSessionId = ref(ulid())

const typing = ref(false);

onMounted(() => {
  console.log("mounted")
  refreshSessionList();
})

function refreshSessionList() {
  return window.agentIpc.getSessions().then((sessions) => {
    sessionList.value = sessions;
  })
}

function handleItemClick(sessionId) {
  console.log(sessionId);
  currentSessionId.value = sessionId;
  window.agentIpc.getSessionDetail(sessionId).then(historyList => {
    console.log('historyList', historyList)
    typing.value = false;
    messages.value = historyList.map(item => {
      return {
        from: item.role,
        content: item.content,
      }
    })
  })
}

async function handleDeleteSession(sessionId) {
  Modal.confirm({
    title: "确认删除？",
    content: "删除会话后历史记录将无法找回，请确认是否删除",
    okText: "删除",
    cancelText: "取消",
    maskClosable: true,
    onOk: () => {
      window.agentIpc.deleteSessions(sessionId).then(res => {
        console.log("res", res);
        refreshSessionList().then(() => {
          if (!sessionList.value.find(item => item.id === currentSessionId.value)) {
            if (!sessionList.value.length) {
              messages.value = [];
              return;
            }

            handleItemClick(sessionList.value[0].sessionId)
          }
        })
      });
    },
  })
}

const showSidebar = ref(true);

function handleToggleClick() {
  showSidebar.value = !showSidebar.value;
}

function handleCreateTalkAgentClick() {
  currentSessionId.value = ulid();
  messages.value = [];
}

function checkSessionById() {

}


const description = [
  '您可以说，帮我查询下下周天气',
];
const introPrompt = {
  direction: 'horizontal',
  list: [
    {
      label: '帮我写一个快速排序',
      iconConfig: {name: 'icon-info-o', color: '#5e7ce0'},
      desc: '使用 js 实现一个快速排序',
    },
    {
      label: '你可以帮我做些什么？',
      iconConfig: {name: 'icon-star', color: 'rgb(255, 215, 0)'},
      desc: '了解当前大模型可以帮你做的事',
    },
    {
      label: '在D://周杰伦.txt下写入周杰伦的信息',
      iconConfig: {name: 'icon-priority', color: '#3ac295'},
      desc: '信息写入',
    },
  ],
};
const simplePrompt = [
  {
    value: 'quickSort',
    iconConfig: {name: 'icon-info-o', color: '#5e7ce0'},
    label: '帮我写一个快速排序',
  },
  {
    value: 'helpMd',
    iconConfig: {name: 'icon-star', color: 'rgb(255, 215, 0)'},
    label: '你可以帮我做些什么？',
  },
];
const inputValue = ref('');
const inputFootIcons = [
  {icon: 'icon-at', text: '智能体'},
  {icon: 'icon-standard', text: '词库'},
  {icon: 'icon-add', text: '附件'},
];

const messages = ref([]);

const newConversation = () => {
  messages.value = [];
}

const onSubmit = (evt) => {
  if (!evt.trim().length) {
    message.warning("内容不允许为空")
    return;
  }
  typing.value = true;
  console.log("onSubmit", evt)
  inputValue.value = '';
  // 用户发送消息
  messages.value.push({
    from: 'user',
    content: evt,
  });

  const resMsg = {
    from: 'model',
    loading: true,
  }
  messages.value.push(resMsg);
  window.agentIpc.sendMessage({
    sessionId: currentSessionId.value,
    message: evt,
  })
};


window.agentIpc.onMessage((event, data) => {
  console.log('收到进度:', data);
  if (data.sessionId !== currentSessionId.value) {
    console.warn('消息 sessionId 与当前会话不匹配，忽略该消息', data.sessionId, currentSessionId.value);
    return;
  }

  // 根据不同类型更新 UI
  switch (data.type) {
    case 'create-memory' : {
      refreshSessionList()
      break;
    }
    case 'llm_response':
      // 可以实时显示 LLM 的思考过程
      console.log('LLM 响应:', data.content);
      if (data.tool_calls?.length) {
        console.log('准备调用工具:', data);
        let text = ""

        if (data.content) {
          text = data.content;
        } else {
          text = toolsTextMapper(data.tool_calls);
        }


        if (!text?.trim?.()?.length) {
          console.log("no content")
          return;
        }


        if (messages.value[messages.value.length - 1].loading) {
          messages.value[messages.value.length - 1].content = text;
          messages.value[messages.value.length - 1].loading = false;
        } else {
          messages.value.push({
            from: 'model',
            content: text,
          });
        }
        console.error("text", text)
        messages.value.push({
          from: 'model',
          loading: true,
        })
      }
      break;

    case 'tool_calls':
      console.log('工具调用:', data.tool_calls);
      break;

    case 'tool_results':
      console.log('工具结果:', data.results);
      break;

    case "error":
    case 'final_answer':
      if (messages.value[messages.value.length - 1].loading) {
        messages.value[messages.value.length - 1].content = data.content;
        messages.value[messages.value.length - 1].loading = false;
      } else {
        messages.value.push({
          from: 'model',
          content: data.content,
        });
      }
      break;
  }
});

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
  margin: 20px 20px 0;
  height: calc(100% - 40px);
  padding: 20px;
  gap: 8px;
  background: transparent;
  border: 1px solid #3d3d3d;
  border-radius: 16px;
}

.mc-bubble {
  gap: 8px !important;
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