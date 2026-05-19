<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1>用户管理</h1>
        <p class="subtitle">查看注册用户及其用量、API Key 与余额</p>
      </div>
      <div class="head-meta">
        <el-tag round size="default">共 {{ fmt(total) }} 位用户</el-tag>
      </div>
    </div>

    <div class="toolbar">
      <el-input
        v-model="q"
        placeholder="搜索钱包地址 / 邮箱 / 名称"
        clearable
        size="default"
        class="search-input"
        @keyup.enter="reload(1)"
        @clear="reload(1)"
      >
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-button type="primary" size="default" @click="reload(1)">
        <el-icon><Search /></el-icon>
        <span>搜索</span>
      </el-button>
    </div>

    <!-- Desktop table -->
    <div class="table-wrap hide-mobile">
      <el-table v-loading="loading" :data="rows" stripe style="margin-top: 16px" @row-click="goDetail">
        <el-table-column label="ID" prop="id" width="70" />
        <el-table-column label="钱包地址 / 邮箱" min-width="260">
          <template #default="{ row }">
            <div v-if="row.address" class="mono">{{ short(row.address) }}</div>
            <div v-else class="mono">{{ row.email || '—' }}</div>
            <div v-if="row.name" class="muted">{{ row.name }}</div>
          </template>
        </el-table-column>
        <el-table-column label="API Key" min-width="220">
          <template #default="{ row }">
            <div v-if="row.api_key" class="mono apikey" @click.stop="copyText(row.api_key)">
              {{ maskKey(row.api_key) }}
              <el-icon><CopyDocument /></el-icon>
            </div>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="注册时间" width="170">
          <template #default="{ row }">{{ fmtDate(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="请求数" align="right" width="100">
          <template #default="{ row }">{{ fmt(row.chat_requests) }}</template>
        </el-table-column>
        <el-table-column label="Tokens" align="right" width="120">
          <template #default="{ row }">{{ fmt(row.chat_tokens) }}</template>
        </el-table-column>
        <el-table-column label="当前余额" min-width="180">
          <template #default="{ row }">{{ mapDisplay(row.balances) }}</template>
        </el-table-column>
        <el-table-column label="累计充值" min-width="180">
          <template #default="{ row }">{{ mapDisplay(row.deposits_total) }}</template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Mobile cards -->
    <div class="card-list show-mobile" v-loading="loading">
      <div
        v-for="row in rows"
        :key="row.id"
        class="user-card"
        @click="goDetail(row)"
      >
        <div class="uc-head">
          <div class="uc-avatar">{{ avatarLetter(row) }}</div>
          <div class="uc-id">
            <div class="uc-name">{{ row.name || row.email || `用户 #${row.id}` }}</div>
            <div class="mono uc-addr">{{ row.address ? short(row.address) : (row.email || '—') }}</div>
          </div>
          <el-tag size="small" effect="plain">#{{ row.id }}</el-tag>
        </div>

        <div v-if="row.api_key" class="uc-row">
          <span class="uc-key">API Key</span>
          <span class="mono apikey" @click.stop="copyText(row.api_key)">
            {{ maskKey(row.api_key) }}
            <el-icon><CopyDocument /></el-icon>
          </span>
        </div>

        <div class="uc-stats">
          <div class="stat-item">
            <div class="stat-label">请求数</div>
            <div class="stat-value">{{ fmt(row.chat_requests) }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Tokens</div>
            <div class="stat-value">{{ fmt(row.chat_tokens) }}</div>
          </div>
        </div>

        <div class="uc-row">
          <span class="uc-key">余额</span>
          <span class="uc-val">{{ mapDisplay(row.balances) }}</span>
        </div>
        <div class="uc-row">
          <span class="uc-key">累计充值</span>
          <span class="uc-val">{{ mapDisplay(row.deposits_total) }}</span>
        </div>
        <div class="uc-row uc-foot">
          <span class="uc-key">注册</span>
          <span class="uc-val small">{{ fmtDate(row.created_at) }}</span>
        </div>
      </div>

      <div v-if="!loading && rows.length === 0" class="empty-mobile">
        <el-empty description="暂无用户" />
      </div>
    </div>

    <div class="pagination-row">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        :layout="paginationLayout"
        :small="isMobile"
        background
        @current-change="(p) => reload(p)"
        @size-change="() => reload(1)"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, CopyDocument } from '@element-plus/icons-vue'
import { adminApi } from '@/api/admin'

const router = useRouter()
const loading = ref(false)
const rows = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const q = ref('')

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

function short(addr) {
  if (!addr) return ''
  if (addr.length <= 16) return addr
  return addr.slice(0, 8) + '...' + addr.slice(-6)
}

function maskKey(key) {
  if (!key) return ''
  if (key.length <= 14) return key
  return key.slice(0, 8) + '...' + key.slice(-6)
}

function mapDisplay(m) {
  if (!m || Object.keys(m).length === 0) return '—'
  return Object.entries(m)
    .map(([cur, amt]) => `${trimAmount(amt)} ${cur}`)
    .join(' · ')
}

function trimAmount(amt) {
  if (amt == null) return '0'
  const s = String(amt)
  if (!s.includes('.')) return s
  const trimmed = s.replace(/0+$/, '').replace(/\.$/, '')
  return trimmed === '' ? '0' : trimmed
}

function avatarLetter(row) {
  const src = row.name || row.email || row.address || `${row.id}`
  return String(src).slice(0, 1).toUpperCase()
}

async function reload(targetPage) {
  if (targetPage) page.value = targetPage
  loading.value = true
  try {
    const data = await adminApi.users({ page: page.value, pageSize: pageSize.value, q: q.value })
    rows.value = data.items || []
    total.value = data.total || 0
  } finally {
    loading.value = false
  }
}

function goDetail(row) {
  router.push({ name: 'user-detail', params: { id: row.id } })
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(
    () => ElMessage.success('已复制 API Key'),
    () => ElMessage.warning('复制失败'),
  )
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
.subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--color-muted);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 14px 16px;
  box-shadow: var(--shadow-sm);
  flex-wrap: wrap;
}

.search-input { flex: 1; min-width: 200px; max-width: 420px; }

.table-wrap {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-top: 16px;
  box-shadow: var(--shadow-sm);
}
.table-wrap :deep(.el-table) { margin: 0 !important; }

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
}

.muted { color: var(--color-muted); font-size: 12px; margin-top: 2px; }

.apikey {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: var(--color-brand-500);
  padding: 2px 6px;
  border-radius: 6px;
  transition: background var(--duration-fast) var(--ease-out);
}
.apikey:hover { background: var(--color-info-bg); }

.pagination-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

:deep(.el-table__row) { cursor: pointer; }

/* ===== Mobile card list ===== */
.card-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;
}
.user-card {
  margin: 10px 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 14px;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-normal) var(--ease-out);
}
.user-card:active { transform: scale(0.99); }
.user-card:hover { box-shadow: var(--shadow-md); }

.uc-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px dashed var(--color-border);
}
.uc-avatar {
  width: 40px; height: 40px; border-radius: 12px;
  display: grid; place-items: center;
  background: var(--gradient-brand);
  color: #fff; font-weight: 700; font-size: 16px;
  flex-shrink: 0;
}
.uc-id { flex: 1; min-width: 0; }
.uc-name {
  font-weight: 600; font-size: 14px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.uc-addr {
  font-size: 12px; color: var(--color-muted);
  margin-top: 2px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.uc-row {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 13px; padding: 6px 0;
  gap: 12px;
}
.uc-key { color: var(--color-muted); font-size: 12px; flex-shrink: 0; }
.uc-val {
  text-align: right;
  font-weight: 500;
  word-break: break-all;
}
.uc-val.small { font-size: 12px; color: var(--color-muted); font-weight: 400; }
.uc-foot { padding-top: 8px; margin-top: 4px; border-top: 1px dashed var(--color-border); }

.uc-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 4px 0 8px;
  padding: 10px;
  border-radius: var(--radius-md);
  background: var(--color-surface-2);
}
.stat-item {
  text-align: center;
  padding: 4px 0;
}
.stat-label {
  font-size: 11px;
  color: var(--color-muted);
  margin-bottom: 2px;
}
.stat-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: -0.01em;
}

.empty-mobile { padding: 32px 0; text-align: center; }

@media (max-width: 768px) {
  .toolbar { padding: 12px; gap: 8px; }
  .search-input { max-width: none; }
  .pagination-row { justify-content: center; }
}
</style>
