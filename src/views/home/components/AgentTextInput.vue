<template>
  <div class="agent-text-input">
    <textarea class="area-input" v-model="message"></textarea>

    <a-button type="primary" shape="circle" size="middle" style="margin-left: auto" @click="handleSendClick">
      <template #icon>
        <ArrowUpOutlined />
      </template>
    </a-button>
  </div>
</template>

<script setup>
import {ref} from "vue";
import {ArrowUpOutlined} from "@ant-design/icons-vue";

const message = ref("");
const props = defineProps({
  status: {
    type: String,
  }
})

const emits = defineEmits(["send"]);

function handleSendClick() {
  emits("send", message.value);
}
</script>


<style scoped>
.agent-text-input {
  position: relative;
  background: #2c2c2e;
  border-radius: 20px;
  padding: 8px 5px 8px 12px;
  overflow-y: scroll;
  display: flex;
  flex-direction: column;
}
.area-input {
  overflow: hidden;
  line-height: 24px;
  padding-right: 4px;
  resize: none;
  field-sizing: content;
  max-height: 300px;
  min-height: 50px;
  background: transparent;
  width: 100%;
  outline: none;
  border: none;
}
</style>