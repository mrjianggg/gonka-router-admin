<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1>请求追溯</h1>
        <p class="subtitle">
          Gonka 网关回传的 X-Request-Id / X-Devshard-ID 与终端用户的映射查询
        </p>
      </div>
      <div class="head-meta">
        <el-tag round size="default">共 {{ fmt(total) }} 条</el-tag>
      </div>
    </div>

    <!-- Highlighted trace lookup box -->
    <div class="trace-lookup">
      <div class="trace-lookup-label">
        <el-icon><Search /></el-icon>
        按 X-Request-Id 反查用户
      </div>
      <el-input
        v-model="filters.xRequestId"
        placeholder="粘贴官方提供的 X-Request-Id，直接回车反查"
        clearable
        class="trace-lookup-input"
        @keyup.enter="reload(1)"
        @clear="reload(1)"
      />
      <el-button type="primary" @click="reload(1)">查询</el-button>
    </div>

    <!-- Secondary filters -->
    <div class="filters">
      <el-input
        v-model="filters.userId"
        placeholder="用户 ID"
        clearable
        class="filter-input narrow"
        @keyup.enter="reload(1)"
      />
      <el-input
        v-model="filters.xDevshardId"
        placeholder="X-Devshard-ID"
        clearable
        class="filter-input"
        @keyup.enter="reload(1)"
      />
      <el-input
        v-model="filters.model"
        placeholder="模型名全称"
        clearable
        class="filter-input"
        @keyup.enter="reload(1)"
      />
      <el-select
        v-model="filters.outcome"
        placeholder="结果"
        clearable
        class="filter-input narrow"
      >
        <el-option label="success" value="success" />
        <el-option label="client_aborted" value="client_aborted" />
        <el-option label="upstream_error" value="upstream_error" />
        <el-option label="timeout" value="timeout" />
        <el-option label="internal_error" value="internal_error" />
      </el-select>
      <el-date-picker
        v-model="dateRange"
        type="datetimerange"
        range-separator="至"
        start-placeholder="开始"
        end-placeholder="结束"
        format="YYYY-MM-DD HH:mm"
        value-format="YYYY-MM-DDTHH:mm:ss[Z]"
        class="filter-input wide"
      />
      <el-button type="primary" @click="reload(1)">
        <el-icon><Search /></el-icon><span>筛选</span>
      </el-button>
      <el-button @click="resetFilters">重置</el-button>
    </div>

    <!-- Desktop table -->
    <div class="table-wrap hide-mobile">
      <el-table
        v-loading="loading"
        :data="rows"
        stripe
        style="margin-top: 16px"
        @row-click="openDetail"
      >
        <el-table-column label="时间" width="170">
          <template #default="{ row }">{{ fmtDate(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="用户" min-width="200">
          <template #default="{ row }">
            <div class="mono">#{{ row.user_id }} {{ row.user_name || '' }}</div>
            <div class="muted">
              {{ row.user_address ? short(row.user_address) : (row.user_email || '—') }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="模型" prop="model" min-width="140" />
        <el-table-column label="结果" width="130">
          <template #default="{ row }">
            <el-tag :type="outcomeType(row.outcome)" size="small" disable-transitions>
              {{ row.outcome }}
            </el-tag>
            <div class="muted">{{ row.status_code }}</div>
          </template>
        </el-table-column>
        <el-table-column label="耗时" width="100" align="right">
          <template #default="{ row }">{{ row.duration_ms }} ms</template>
        </el-table-column>
        <el-table-column label="Tokens" width="100" align="right">
          <template #default="{ row }">{{ fmt(row.tokens_used) }}</template>
        </el-table-column>
        <el-table-column label="X-Request-Id" min-width="220">
          <template #default="{ row }">
            <div
              v-if="row.x_request_id"
              class="mono copyable"
              @click.stop="copyText(row.x_request_id)"
            >
              {{ short(row.x_request_id, 12, 6) }}
              <el-icon><CopyDocument /></el-icon>
            </div>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="X-Devshard-ID" min-width="180">
          <template #default="{ row }">
            <div
              v-if="row.x_devshard_id"
              class="mono copyable"
              @click.stop="copyText(row.x_devshard_id)"
            >
              {{ short(row.x_devshard_id, 10, 4) }}
              <el-icon><CopyDocument /></el-icon>
            </div>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Mobile cards -->
    <div class="card-list show-mobile" v-loading="loading">
      <div v-for="row in rows" :key="row.id" class="rl-card" @click="openDetail(row)">
        <div class="rl-head">
          <el-tag :type="outcomeType(row.outcome)" size="small">{{ row.outcome }}</el-tag>
          <span class="rl-time">{{ fmtDate(row.created_at) }}</span>
        </div>
        <div class="rl-row">
          <span class="rl-k">用户</span>
          <span class="rl-v">#{{ row.user_id }} {{ row.user_address ? short(row.user_address) : (row.user_email || '—') }}</span>
        </div>
        <div class="rl-row"><span class="rl-k">模型</span><span class="rl-v">{{ row.model }}</span></div>
        <div class="rl-row"><span class="rl-k">耗时</span><span class="rl-v">{{ row.duration_ms }} ms · {{ fmt(row.tokens_used) }} tokens</span></div>
        <div class="rl-row"><span class="rl-k">X-Request-Id</span><span class="rl-v mono">{{ row.x_request_id || '—' }}</span></div>
        <div class="rl-row"><span class="rl-k">X-Devshard-ID</span><span class="rl-v mono">{{ row.x_devshard_id || '—' }}</span></div>
      </div>
      <div v-if="!loading && rows.length === 0" class="empty-mobile">
        <el-empty description="暂无记录" />
      </div>
    </div>

    <div class="pagination-row">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[20, 50, 100]"
        :layout="paginationLayout"
        :small="isMobile"
        background
        @current-change="(p) => reload(p)"
        @size-change="() => reload(1)"
      />
    </div>

    <!-- Detail drawer -->
    <el-drawer
      v-model="detailOpen"
      :direction="drawerDirection"
      :size="drawerSize"
      :with-header="false"
      :append-to-body="true"
      class="req-drawer"
    >
      <div v-if="detailLoading" class="drawer-loading" v-loading="true" />

      <div v-else-if="detail" class="drawer-body">
        <!-- Hero: title + outcome + close -->
        <header class="d-hero" :class="`outcome-${detail.outcome || 'unknown'}`">
          <div class="d-hero-top">
            <div class="d-hero-title">
              <div class="d-hero-tag">请求 #{{ detail.id }}</div>
              <div class="d-hero-time">{{ fmtDate(detail.created_at || detail.started_at) }}</div>
            </div>
            <button class="d-close" aria-label="关闭" @click="detailOpen = false">
              <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
                <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" />
              </svg>
            </button>
          </div>
          <div class="d-hero-meta">
            <el-tag :type="outcomeType(detail.outcome)" size="default" effect="dark" round>
              {{ detail.outcome }}
            </el-tag>
            <span class="d-hero-status">HTTP {{ detail.status_code }}</span>
            <span class="d-hero-dot">·</span>
            <span class="d-hero-model" :title="detail.model">{{ detail.model }}</span>
          </div>
        </header>

        <!-- Quick stats -->
        <div class="d-stats">
          <div class="d-stat">
            <div class="d-stat-label">总耗时</div>
            <div class="d-stat-value">{{ msDisplay(detail.duration_ms) }}</div>
          </div>
          <div class="d-stat">
            <div class="d-stat-label">首字节</div>
            <div class="d-stat-value">{{ msDisplay(detail.ttft_ms) }}</div>
          </div>
          <div class="d-stat">
            <div class="d-stat-label">Tokens</div>
            <div class="d-stat-value">{{ fmt(detail.tokens_used) }}</div>
          </div>
          <div class="d-stat">
            <div class="d-stat-label">流式</div>
            <div class="d-stat-value">{{ detail.stream ? '是' : '否' }}</div>
          </div>
        </div>

        <!-- Error callout -->
        <div v-if="detail.error_code" class="d-error">
          <div class="d-error-title">错误代码</div>
          <div class="d-error-code">{{ detail.error_code }}</div>
        </div>

        <!-- Trace IDs -->
        <section class="d-section">
          <h3>追溯链路</h3>
          <div class="d-id-card" @click="copyText(detail.x_request_id)" :class="{ 'is-empty': !detail.x_request_id }">
            <div class="d-id-label">X-Request-Id</div>
            <div class="d-id-row">
              <span class="d-id-val mono">{{ detail.x_request_id || '—' }}</span>
              <el-icon v-if="detail.x_request_id" class="d-id-icon"><CopyDocument /></el-icon>
            </div>
          </div>
          <div class="d-id-card" @click="copyText(detail.x_devshard_id)" :class="{ 'is-empty': !detail.x_devshard_id }">
            <div class="d-id-label">X-Devshard-ID</div>
            <div class="d-id-row">
              <span class="d-id-val mono">{{ detail.x_devshard_id || '—' }}</span>
              <el-icon v-if="detail.x_devshard_id" class="d-id-icon"><CopyDocument /></el-icon>
            </div>
          </div>
        </section>

        <!-- End user -->
        <section class="d-section">
          <h3>终端用户</h3>
          <div class="d-user">
            <div class="d-user-avatar">{{ userInitial(detail.user) }}</div>
            <div class="d-user-info">
              <div class="d-user-name">
                {{ detail.user?.name || detail.user?.email || `用户 #${detail.user?.id}` }}
              </div>
              <div class="d-user-meta">
                <span class="d-user-id">#{{ detail.user?.id }}</span>
                <span v-if="detail.user?.created_at">· 注册 {{ fmtDate(detail.user?.created_at) }}</span>
              </div>
            </div>
          </div>
          <div
            v-if="detail.user?.address"
            class="d-id-card compact"
            @click="copyText(detail.user.address)"
          >
            <div class="d-id-label">钱包地址</div>
            <div class="d-id-row">
              <span class="d-id-val mono">{{ detail.user.address }}</span>
              <el-icon class="d-id-icon"><CopyDocument /></el-icon>
            </div>
          </div>
        </section>

        <!-- Request meta -->
        <section class="d-section">
          <h3>请求详情</h3>
          <div class="d-grid">
            <div class="d-cell">
              <div class="d-cell-label">端点</div>
              <div class="d-cell-val mono">{{ detail.endpoint }}</div>
            </div>
            <div class="d-cell">
              <div class="d-cell-label">模型</div>
              <div class="d-cell-val">{{ detail.model }}</div>
            </div>
            <div class="d-cell">
              <div class="d-cell-label">状态码</div>
              <div class="d-cell-val">{{ detail.status_code }}</div>
            </div>
            <div class="d-cell">
              <div class="d-cell-label">结果</div>
              <div class="d-cell-val">
                <el-tag :type="outcomeType(detail.outcome)" size="small">{{ detail.outcome }}</el-tag>
              </div>
            </div>
          </div>
        </section>

        <!-- Timeline -->
        <section class="d-section">
          <h3>时间线</h3>
          <ol class="d-timeline">
            <li>
              <span class="d-tl-dot start" />
              <div class="d-tl-body">
                <div class="d-tl-label">请求开始</div>
                <div class="d-tl-time">{{ fmtDate(detail.started_at) }}</div>
              </div>
              <span class="d-tl-delta">0 ms</span>
            </li>
            <li v-if="detail.first_byte_at">
              <span class="d-tl-dot mid" />
              <div class="d-tl-body">
                <div class="d-tl-label">首字节返回 (TTFT)</div>
                <div class="d-tl-time">{{ fmtDate(detail.first_byte_at) }}</div>
              </div>
              <span class="d-tl-delta">{{ msDisplay(detail.ttft_ms) }}</span>
            </li>
            <li>
              <span class="d-tl-dot end" />
              <div class="d-tl-body">
                <div class="d-tl-label">请求结束</div>
                <div class="d-tl-time">{{ fmtDate(detail.ended_at) }}</div>
              </div>
              <span class="d-tl-delta">{{ msDisplay(detail.duration_ms) }}</span>
            </li>
          </ol>
        </section>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, CopyDocument } from '@element-plus/icons-vue'
import { adminApi } from '@/api/admin'

const loading = ref(false)
const rows = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

const filters = reactive({
  xRequestId: '',
  xDevshardId: '',
  userId: '',
  model: '',
  outcome: '',
})
const dateRange = ref([])

const isMobile = ref(typeof window !== 'undefined' && window.innerWidth <= 768)
const paginationLayout = computed(() =>
  isMobile.value ? 'prev, pager, next' : 'total, sizes, prev, pager, next'
)
function onResize() { isMobile.value = window.innerWidth <= 768 }
onMounted(() => window.addEventListener('resize', onResize))
onBeforeUnmount(() => window.removeEventListener('resize', onResize))

function fmt(n) {
  if (n == null) return '0'
  return Number(n).toLocaleString('zh-CN')
}
function fmtDate(s) {
  if (!s) return '—'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleString('zh-CN', { hour12: false })
}
function short(s, head = 8, tail = 6) {
  if (!s) return ''
  if (s.length <= head + tail + 3) return s
  return s.slice(0, head) + '...' + s.slice(-tail)
}
function outcomeType(o) {
  switch (o) {
    case 'success': return 'success'
    case 'client_aborted': return 'info'
    case 'timeout': return 'warning'
    case 'upstream_error':
    case 'internal_error': return 'danger'
    default: return ''
  }
}
function copyText(text) {
  if (!text) return
  navigator.clipboard.writeText(text).then(
    () => ElMessage.success('已复制'),
    () => ElMessage.warning('复制失败'),
  )
}

function resetFilters() {
  filters.xRequestId = ''
  filters.xDevshardId = ''
  filters.userId = ''
  filters.model = ''
  filters.outcome = ''
  dateRange.value = []
  reload(1)
}

async function reload(targetPage) {
  if (targetPage) page.value = targetPage
  loading.value = true
  try {
    const data = await adminApi.requests({
      page: page.value,
      pageSize: pageSize.value,
      userId: filters.userId,
      xRequestId: filters.xRequestId,
      xDevshardId: filters.xDevshardId,
      model: filters.model,
      outcome: filters.outcome,
      from: dateRange.value?.[0],
      to: dateRange.value?.[1],
    })
    rows.value = data.items || []
    total.value = data.total || 0
  } finally {
    loading.value = false
  }
}

// Detail drawer
const detailOpen = ref(false)
const detailLoading = ref(false)
const detail = ref(null)

// Drawer slides from right on desktop, bottom on mobile.
const drawerDirection = computed(() => (isMobile.value ? 'btt' : 'rtl'))
const drawerSize = computed(() => (isMobile.value ? '92%' : '560px'))

function msDisplay(v) {
  if (v == null) return '—'
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) return '—'
  if (n < 1000) return `${Math.round(n)} ms`
  return `${(n / 1000).toFixed(2)} s`
}

function userInitial(u) {
  if (!u) return 'U'
  const src = u.name || u.email || u.address || `${u.id || ''}`
  return String(src).slice(0, 1).toUpperCase() || 'U'
}

async function openDetail(row) {
  detail.value = null
  detailOpen.value = true
  detailLoading.value = true
  try {
    detail.value = await adminApi.requestDetail(row.id)
  } finally {
    detailLoading.value = false
  }
}

onMounted(() => reload(1))
</script>

<style scoped>
.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 22px;
}
.page-head h1 { margin: 0; }
.subtitle { margin: 4px 0 0; font-size: 13px; color: var(--color-muted); }

.trace-lookup {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  background: linear-gradient(135deg, rgba(37,99,235,0.08), rgba(6,182,212,0.05));
  border: 1px solid var(--color-brand-500);
  border-radius: var(--radius-lg);
  padding: 14px 18px;
  margin-bottom: 14px;
  box-shadow: var(--shadow-sm);
}
.trace-lookup-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: var(--color-brand-500);
  white-space: nowrap;
}
.trace-lookup-input { flex: 1; min-width: 260px; }

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 12px 14px;
  box-shadow: var(--shadow-sm);
}
.filter-input { width: 200px; }
.filter-input.narrow { width: 140px; }
.filter-input.wide { width: 360px; }

.table-wrap {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-top: 16px;
  box-shadow: var(--shadow-sm);
}
.table-wrap :deep(.el-table) { margin: 0 !important; }
:deep(.el-table__row) { cursor: pointer; }

.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; }
.muted { color: var(--color-muted); font-size: 12px; margin-top: 2px; }
.copyable {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: var(--color-brand-500);
  padding: 2px 6px;
  border-radius: 6px;
}
.copyable:hover { background: var(--color-info-bg); }

.pagination-row { display: flex; justify-content: flex-end; margin-top: 16px; }

/* Mobile cards */
.card-list { display: none; flex-direction: column; gap: 12px; margin-top: 16px; }
.rl-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 14px;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
}
.rl-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.rl-time { font-size: 12px; color: var(--color-muted); }
.rl-row { display: flex; justify-content: space-between; gap: 12px; padding: 4px 0; font-size: 13px; }
.rl-k { color: var(--color-muted); }
.rl-v { text-align: right; word-break: break-all; }
.empty-mobile { padding: 30px 0; text-align: center; }

@media (max-width: 768px) {
  .hide-mobile { display: none; }
  .card-list { display: flex; }
  .filter-input, .filter-input.narrow, .filter-input.wide { width: 100%; }
}
@media (min-width: 769px) {
  .show-mobile { display: none; }
}

/* ===== Detail Drawer ===== */
.drawer-loading {
  min-height: 240px;
  display: grid;
  place-items: center;
}

.drawer-body {
  padding: 0 22px 28px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* Hero */
.d-hero {
  margin: 0 -22px;
  padding: 22px 22px 18px;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(6, 182, 212, 0.06) 100%);
  border-bottom: 1px solid var(--color-border);
  position: relative;
}
.d-hero.outcome-success    { background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(6, 182, 212, 0.04)); }
.d-hero.outcome-timeout    { background: linear-gradient(135deg, rgba(245, 158, 11, 0.10), rgba(244, 63, 94, 0.04)); }
.d-hero.outcome-upstream_error,
.d-hero.outcome-internal_error { background: linear-gradient(135deg, rgba(244, 63, 94, 0.10), rgba(168, 85, 247, 0.04)); }
.d-hero.outcome-client_aborted { background: linear-gradient(135deg, rgba(100, 116, 139, 0.10), rgba(100, 116, 139, 0.04)); }

.d-hero-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.d-hero-title { min-width: 0; flex: 1; }
.d-hero-tag {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--color-text);
}
.d-hero-time {
  font-size: 12px;
  color: var(--color-muted);
  margin-top: 2px;
}

.d-close {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-soft);
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: background var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out);
  flex-shrink: 0;
}
.d-close:hover { background: var(--color-bg-soft); }
.d-close:active { transform: scale(0.94); }

.d-hero-meta {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-text-soft);
  flex-wrap: wrap;
}
.d-hero-status {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: 1px 8px;
  border-radius: 6px;
  color: var(--color-text-soft);
}
.d-hero-dot { color: var(--color-muted); }
.d-hero-model {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  color: var(--color-text-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

/* Stats */
.d-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.d-stat {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 12px 12px 10px;
  text-align: center;
  transition: transform var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-normal) var(--ease-out);
}
.d-stat:hover { transform: translateY(-1px); box-shadow: var(--shadow-sm); }
.d-stat-label {
  font-size: 11px;
  color: var(--color-muted);
  margin-bottom: 4px;
  letter-spacing: 0.02em;
}
.d-stat-value {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--color-text);
}

/* Error callout */
.d-error {
  background: var(--color-danger-bg);
  border-left: 3px solid var(--color-rose-500);
  border-radius: var(--radius-md);
  padding: 12px 14px;
}
.d-error-title {
  font-size: 11px;
  color: var(--color-danger-fg);
  font-weight: 600;
  letter-spacing: 0.02em;
}
.d-error-code {
  margin-top: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  color: var(--color-danger-fg);
  word-break: break-all;
}

/* Sections */
.d-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.d-section h3 {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

/* ID cards (request id / devshard id / wallet) */
.d-id-card {
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out);
}
.d-id-card:hover {
  background: var(--color-info-bg);
  border-color: rgba(37, 99, 235, 0.25);
}
.d-id-card.is-empty { cursor: default; }
.d-id-card.is-empty:hover { background: var(--color-surface-2); border-color: var(--color-border); }
.d-id-card.compact { padding: 8px 10px; }

.d-id-label {
  font-size: 10px;
  color: var(--color-muted);
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 4px;
}
.d-id-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.d-id-val {
  font-size: 12.5px;
  word-break: break-all;
  color: var(--color-text);
  min-width: 0;
  flex: 1;
}
.d-id-icon {
  color: var(--color-brand-500);
  font-size: 14px;
  flex-shrink: 0;
}

/* End user */
.d-user {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 12px;
}
.d-user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: var(--gradient-brand);
  color: #fff;
  font-weight: 700;
  font-size: 16px;
  flex-shrink: 0;
}
.d-user-info { min-width: 0; flex: 1; }
.d-user-name {
  font-weight: 600;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.d-user-meta {
  font-size: 11.5px;
  color: var(--color-muted);
  margin-top: 2px;
}
.d-user-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

/* Cell grid */
.d-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.d-cell {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  min-width: 0;
}
.d-cell-label {
  font-size: 11px;
  color: var(--color-muted);
  margin-bottom: 3px;
}
.d-cell-val {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
  word-break: break-word;
}

/* Timeline */
.d-timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.d-timeline::before {
  content: "";
  position: absolute;
  left: 7px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: linear-gradient(180deg, var(--color-brand-500), var(--color-cyan-500), var(--color-emerald-500));
  opacity: 0.35;
  border-radius: 999px;
}
.d-timeline li {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  padding-left: 4px;
}
.d-tl-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  flex-shrink: 0;
  z-index: 1;
  border: 3px solid var(--color-surface);
  box-shadow: 0 0 0 1px var(--color-border);
}
.d-tl-dot.start { background: var(--color-brand-500); }
.d-tl-dot.mid   { background: var(--color-cyan-500); }
.d-tl-dot.end   { background: var(--color-emerald-500); }
.d-tl-body { flex: 1; min-width: 0; }
.d-tl-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}
.d-tl-time {
  font-size: 11.5px;
  color: var(--color-muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  margin-top: 2px;
}
.d-tl-delta {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-brand-500);
  font-variant-numeric: tabular-nums;
  background: var(--color-info-bg);
  padding: 3px 8px;
  border-radius: 999px;
  flex-shrink: 0;
}

/* Drawer container tweaks */
:deep(.req-drawer .el-drawer__body) {
  padding: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* Mobile: bottom sheet feel */
@media (max-width: 768px) {
  :deep(.req-drawer.el-drawer--btt) {
    border-radius: 18px 18px 0 0;
    overflow: hidden;
  }
  :deep(.req-drawer.el-drawer--btt .el-drawer__body) {
    padding-bottom: env(safe-area-inset-bottom, 0);
  }

  .drawer-body { padding: 0 16px 24px; gap: 14px; }
  .d-hero { margin: 0 -16px; padding: 18px 16px 14px; }

  /* Drag handle hint for bottom sheet */
  .d-hero::before {
    content: "";
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 38px;
    height: 4px;
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.18);
  }
  .d-hero-top { margin-top: 6px; }

  .d-stats { grid-template-columns: repeat(2, 1fr); }
  .d-grid  { grid-template-columns: 1fr; }
  .d-hero-model { max-width: 60vw; }
}
</style>
