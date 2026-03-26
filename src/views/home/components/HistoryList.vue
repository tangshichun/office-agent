<script setup>
import { computed } from 'vue'
import {DeleteOutlined} from "@ant-design/icons-vue";

const props = defineProps({
  sessions: {
    type: Array,
    default: () => []
  },
  activeId: {
    type: String,
    default: ""
  },
  itemStyle: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['item-click', 'item-delete'])

const groupedSessions = computed(() => {
  const groups = {
    today: { title: '今天', items: [] },
    yesterday: { title: '昨天', items: [] },
    week: { title: '7天内', items: [] },
    month: { title: '30天内', items: [] },
    older: { title: '', items: [] }
  }

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - 7)
  const monthStart = new Date(todayStart)
  monthStart.setDate(monthStart.getDate() - 30)

  props.sessions.forEach(session => {
    if (!session.list || session.list.length === 0) return

    const lastItem = session.list[session.list.length - 1]
    const firstContent = session.list[0].content
    const timestamp = new Date(lastItem.timestamp)
    const item = {
      sessionId: session.sessionId,
      timestamp: lastItem.timestamp,
      formattedDate: formatTimestamp(lastItem.timestamp),
      content: firstContent
    }

    if (timestamp >= todayStart) {
      groups.today.items.push(item)
    } else if (timestamp >= yesterdayStart && timestamp < todayStart) {
      groups.yesterday.items.push(item)
    } else if (timestamp >= weekStart && timestamp < yesterdayStart) {
      groups.week.items.push(item)
    } else if (timestamp >= monthStart && timestamp < weekStart) {
      groups.month.items.push(item)
    } else {
      const yearMonth = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}`
      if (!groups.older.map) {
        groups.older.map = {}
      }
      if (!groups.older.map[yearMonth]) {
        groups.older.map[yearMonth] = []
      }
      groups.older.map[yearMonth].push(item)
    }
  })

  const result = []
  if (groups.today.items.length) result.push({ title: '今天', items: groups.today.items })
  if (groups.yesterday.items.length) result.push({ title: '昨天', items: groups.yesterday.items })
  if (groups.week.items.length) result.push({ title: '7天内', items: groups.week.items })
  if (groups.month.items.length) result.push({ title: '30天内', items: groups.month.items })

  if (groups.older.map) {
    Object.keys(groups.older.map).sort().reverse().forEach(key => {
      result.push({ title: key, items: groups.older.map[key] })
    })
  }

  return result
})

function formatTimestamp(timestamp) {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function handleItemClick(sessionId) {
  emit('item-click', sessionId)
}

function handleDelete(e, sessionId) {
  e.stopPropagation()
  emit('item-delete', sessionId)
}
</script>

<template>
  <div class="history-list">
    <template v-for="(category, cIndex) in groupedSessions" :key="cIndex">
      <div class="category-group">
        <span class="category-title">{{ category.title }}</span>
        <div class="category-items">
          <div
            v-for="(item, iIndex) in category.items"
            :key="iIndex"
            class="history-item"
            :class="{ active: activeId === item.sessionId }"
            :style="itemStyle"
            :title="item.content"
            @click="handleItemClick(item.sessionId)"
          >
            <span class="item-content">{{ item.content }}</span>
            <span class="delete-btn" @click="(e) => handleDelete(e, item.sessionId)">
              <DeleteOutlined />
            </span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.history-list {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 16px;
  gap: 16px;
}

.category-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-title {
  font-size: 12px;
  color: #999;
  padding: 4px 8px;
  border-radius: 4px;
  align-self: flex-start;
}

.category-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  position: relative;
  color: #fff;
  background-color: rgba(255, 255, 255, 0.05);
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
  user-select: none;
}

.history-item:hover, .history-item.active {
  background-color: rgba(255, 255, 255, 0.1);
}

.item-content {
  font-size: 14px;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.delete-btn {
  border-radius: 100px;
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  display: none;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.4);
  color: #fff;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.delete-btn::after {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  pointer-events: none;
  background-image: radial-gradient(circle, rgba(255, 255, 255, 0.3) 10%, transparent 10.01%);
  background-repeat: no-repeat;
  background-position: 50%;
  transform: scale(10);
  opacity: 0;
  transition: transform 0.5s, opacity 1s;
}

.delete-btn:active::after {
  transform: scale(0);
  opacity: 1;
  transition: 0s;
}

.history-item:hover .delete-btn {
  display: flex;
}
</style>
