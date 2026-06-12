<template>
  <div class="page">
    <!-- Header -->
    <div class="page-head">
      <div>
        <h1>用户反馈</h1>
        <p class="subtitle">来自 gonkarouter.io/feedback 的用户提交</p>
      </div>
      <el-button :loading="loading" @click="reload(page)">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>

    <!-- Status filter tabs -->
    <el-tabs v-model="statusFilter" class="status-tabs" @tab-change="reload(1)">
      <el-tab-pane label="全部" name="" />
      <el-tab-pane name="unread">
        <template #label>
          <span>未读</span>
          <el-badge v-if="unreadCount > 0" :value="unreadCount" :max="99" class="tab-badge" />
        </template>
      </el-tab-pane>
      <el-tab-pane label="已读" name="read" />
    </el-tabs>

    <!-- Table -->
    <div class="card table-wrap">
      <el-table
        v-loading="loading"
        :data="rows"
        stripe
        style="width: 100%"
        :row-class-name="rowClass"
        empty-text="暂无反馈"
        @row-click="openDetail"
      >
        <!-- Status dot -->
        <el-table-column label="" width="44">
          <template #default="{ row }">
            <span class="dot" :class="row.status === 'unread' ? 'dot-unread' : 'dot-read'" />
          </template>
        </el-table-column>

        <!-- Topic -->
        <el-table-column label="主题" width="130">
          <template #default="{ row }">
            <el-tag :type="topicType(row.topic)" size="small" effect="light" round>
              {{ row.topic || '—' }}
            </el-tag>
          </template>
        </el-table-column>

        <!-- Message preview -->
        <el-table-column label="内容" min-width="280">
          <template #default="{ row }">
            <div class="msg-preview">{{ row.message }}</div>
            <span v-if="row.image" class="img-flag">
              <el-icon><Picture /></el-icon> 含截图
            </span>
          </template>
        </el-table-column>

        <!-- User -->
        <el-table-column label="用户" width="190" class-name="hide-mobile">
          <template #default="{ row }">
            <div class="user-name">{{ row.name || '匿名' }}</div>
            <div class="muted user-email">{{ row.email }}</div>
          </template>
        </el-table-column>

        <!-- Model -->
        <el-table-column label="模型" width="170" class-name="hide-mobile">
          <template #default="{ row }">
            <span class="model-cell">{{ row.model || '—' }}</span>
          </template>
        </el-table-column>

        <!-- Created -->
        <el-table-column label="时间" width="150" class-name="hide-mobile">
          <template #default="{ row }">{{ fmtDate(row.created_at) }}</template>
        </el-table-column>

        <!-- Actions -->
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click.stop="openDetail(row)">查看</el-button>
            <el-button
              size="small"
              link
              :loading="toggleLoading === row.id"
              @click.stop="toggleRead(row)"
            >
              {{ row.status === 'unread' ? '标记已读' : '标记未读' }}
            </el-button>
            <el-button size="small" link type="danger" @click.stop="promptDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Pagination -->
    <div class="pager-row">
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        background
        small
        @current-change="reload"
      />
    </div>

    <!-- Detail dialog -->
    <el-dialog v-model="detailVisible" title="反馈详情" width="600px" align-center append-to-body class="fb-dialog">
      <div v-if="detail" class="detail">
        <div class="detail-row">
          <span class="detail-label">主题</span>
          <el-tag :type="topicType(detail.topic)" size="small" effect="light" round>{{ detail.topic || '—' }}</el-tag>
        </div>
        <div class="detail-row">
          <span class="detail-label">用户</span>
          <span>{{ detail.name || '匿名' }} &lt;{{ detail.email }}&gt;</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">模型</span>
          <span class="model-cell">{{ detail.model || '—' }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">时间</span>
          <span>{{ fmtDate(detail.created_at) }}</span>
        </div>
        <div class="detail-block">
          <span class="detail-label">内容</span>
          <p class="detail-message">{{ detail.message }}</p>
        </div>
        <div v-if="detail.image" class="detail-block">
          <span class="detail-label">截图</span>
          <el-image
            :src="detail.image"
            :preview-src-list="[detail.image]"
            :initial-index="0"
            fit="cover"
            preview-teleported
            hide-on-click-modal
            class="thumb-img"
            title="点击查看大图"
          />
        </div>
      </div>
      <template #footer>
        <el-button @click="replyByEmail" type="primary" plain>
          <el-icon><Message /></el-icon> 邮件回复
        </el-button>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- Delete dialog -->
    <el-dialog v-model="deleteVisible" title="确认删除" width="380px" align-center>
      <p>确定要删除这条来自 <strong>{{ deleteTarget?.name || deleteTarget?.email }}</strong> 的反馈？此操作不可撤销。</p>
      <template #footer>
        <el-button @click="deleteVisible = false">取消</el-button>
        <el-button type="danger" :loading="deleteLoading" @click="doDelete">删除</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Picture, Message } from '@element-plus/icons-vue'
import { adminApi } from '@/api/admin'

const loading = ref(false)
const rows = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const unreadCount = ref(0)
const statusFilter = ref('')
const toggleLoading = ref(null)

const detailVisible = ref(false)
const detail = ref(null)

const deleteVisible = ref(false)
const deleteTarget = ref(null)
const deleteLoading = ref(false)

// topic → el-tag type
const topicMap = {
  'API issue': 'danger',
  'Model behavior': 'warning',
  'Docs issue': 'info',
  'Billing issue': 'primary',
  'Feature request': 'success',
  Other: 'info',
}
const topicType = (t) => topicMap[t] || 'info'

const rowClass = ({ row }) => (row.status === 'unread' ? 'row-unread' : '')

const fmtDate = (ts) => {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

const reload = async (p = page.value) => {
  loading.value = true
  page.value = p
  try {
    const res = await adminApi.feedbacks({ page: p, pageSize: pageSize.value, status: statusFilter.value })
    const data = res.data ?? res
    rows.value = data.items ?? []
    total.value = data.total ?? 0
    unreadCount.value = data.unread ?? unreadCount.value
  } catch {
    rows.value = []
  } finally {
    loading.value = false
  }
}

const openDetail = async (row) => {
  detail.value = row
  detailVisible.value = true
  // Auto-mark unread → read on open
  if (row.status === 'unread') {
    try {
      await adminApi.markFeedbackRead(row.id)
      row.status = 'read'
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    } catch { /* error shown by interceptor */ }
  }
}

const toggleRead = async (row) => {
  toggleLoading.value = row.id
  try {
    if (row.status === 'unread') {
      await adminApi.markFeedbackRead(row.id)
      row.status = 'read'
      unreadCount.value = Math.max(0, unreadCount.value - 1)
      ElMessage.success('已标记为已读')
    } else {
      await adminApi.markFeedbackUnread(row.id)
      row.status = 'unread'
      unreadCount.value += 1
      ElMessage.success('已标记为未读')
    }
  } catch { /* error shown */ } finally {
    toggleLoading.value = null
  }
}

const replyByEmail = () => {
  if (!detail.value?.email) return
  const subject = encodeURIComponent(`Re: ${detail.value.topic || 'GonkaRouter feedback'}`)
  window.location.href = `mailto:${detail.value.email}?subject=${subject}`
}

const promptDelete = (row) => {
  deleteTarget.value = row
  deleteVisible.value = true
}

const doDelete = async () => {
  deleteLoading.value = true
  try {
    await adminApi.deleteFeedback(deleteTarget.value.id)
    ElMessage.success('已删除')
    deleteVisible.value = false
    if (deleteTarget.value.status === 'unread') {
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
    reload(page.value)
  } catch { /* error shown */ } finally {
    deleteLoading.value = false
  }
}

onMounted(() => reload(1))
</script>

<style scoped>
.status-tabs { margin-bottom: 0; }
.status-tabs :deep(.el-tabs__header) { margin-bottom: 0; }
.tab-badge { margin-left: 6px; }

.card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 12px; overflow: hidden; }
.table-wrap { margin-top: 16px; }

.card :deep(.el-table__row) { cursor: pointer; }
.card :deep(.row-unread) { background: rgba(37, 99, 235, 0.035); }

.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
.dot-unread { background: var(--color-brand-500, #2563eb); box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15); }
.dot-read { background: var(--color-border, #cbd5e1); }

.msg-preview {
  font-size: 13px; color: var(--color-text); line-height: 1.5;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden;
}
.img-flag {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 11px; color: var(--color-text-muted); margin-top: 4px;
}

.user-name { font-weight: 600; font-size: 13px; color: var(--color-text); }
.user-email { font-size: 11.5px; margin-top: 2px; }
.model-cell { font-size: 12px; font-family: 'JetBrains Mono', monospace; color: var(--color-text-soft); }

.pager-row { display: flex; justify-content: flex-end; margin-top: 20px; }
.muted { color: var(--color-text-muted); }

/* Detail dialog — cap the content wrapper (our own element, so scoped CSS
   applies reliably even though EP teleports the dialog) so the dialog header
   and footer always stay on-screen and only this content scrolls. */
.detail {
  display: flex;
  flex-direction: column;
  gap: 14px;
  /* Safety only: keeps an extreme-length message from pushing the centered
     dialog past the viewport. Normal feedback stays compact (no scrollbar). */
  max-height: 70vh;
  overflow-y: auto;
}
.detail-row { display: flex; align-items: center; gap: 12px; font-size: 13.5px; }
.detail-label {
  flex-shrink: 0; width: 48px; font-size: 12px; color: var(--color-text-muted);
  font-weight: 600;
}
.detail-block { display: flex; flex-direction: column; gap: 8px; }
.detail-message {
  white-space: pre-wrap; line-height: 1.65; font-size: 14px; color: var(--color-text);
  background: var(--color-bg-soft); border-radius: 10px; padding: 14px 16px; margin: 0;
}
/* Compact thumbnail — click opens an in-page image preview (el-image) overlay
   in the current window, so the dialog stays small and centered like a standard
   modal instead of being stretched tall by a large screenshot. */
.thumb-img {
  width: 132px;
  height: 132px;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  cursor: zoom-in;
  overflow: hidden;
}
.thumb-img :deep(img) {
  transition: transform 0.25s var(--ease-out, ease);
}
.thumb-img:hover :deep(img) {
  transform: scale(1.05);
}

@media (max-width: 768px) {
  .hide-mobile { display: none; }
}
</style>
