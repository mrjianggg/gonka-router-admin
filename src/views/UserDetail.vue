<template>
  <div class="page" v-loading="loading">
    <div class="head">
      <el-button text @click="back" class="back-btn">
        <el-icon><ArrowLeft /></el-icon>
        <span>返回用户列表</span>
      </el-button>
    </div>

    <template v-if="user">
      <div class="profile">
        <div class="avatar">{{ initial }}</div>
        <div class="info">
          <div class="name">
            <span class="name-text">{{ user.name || user.email || `用户 #${user.id}` }}</span>
            <el-tag size="small" effect="light" round>{{ user.channel }}</el-tag>
          </div>
          <div class="info-rows">
            <div class="row" v-if="user.address">
              <span class="key">钱包</span>
              <span class="mono copyable" @click="copy(user.address)">
                <span class="text">{{ user.address }}</span>
                <el-icon><CopyDocument /></el-icon>
              </span>
            </div>
            <div class="row" v-if="user.email">
              <span class="key">邮箱</span>
              <span class="val">{{ user.email }}</span>
            </div>
            <div class="row">
              <span class="key">注册</span>
              <span class="val">{{ fmtDate(user.created_at) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="metric-grid">
        <div class="metric-card stat-mini brand">
          <div class="label">总请求数</div>
          <div class="value">{{ fmt(user.chat_total_requests) }}</div>
        </div>
        <div class="metric-card stat-mini cyan">
          <div class="label">总 Token 消耗</div>
          <div class="value">{{ fmt(user.chat_total_tokens) }}</div>
        </div>
        <div class="metric-card stat-mini emerald">
          <div class="label">当前余额</div>
          <div class="value-sm">{{ mapDisplay(user.balances) || '—' }}</div>
        </div>
        <div class="metric-card stat-mini amber">
          <div class="label">累计充值</div>
          <div class="value-sm">{{ mapDisplay(user.deposits_total) || '—' }}</div>
        </div>
      </div>

      <div class="section">
        <h2><span class="section-bar" />API Keys</h2>

        <!-- Desktop table -->
        <el-table :data="user.api_keys || []" stripe class="hide-mobile">
          <el-table-column prop="name" label="名称" width="160" />
          <el-table-column prop="channel" label="渠道" width="100" />
          <el-table-column label="Key">
            <template #default="{ row }">
              <div class="mono copyable" @click="copy(row.key)">
                <span class="text">{{ row.key }}</span>
                <el-icon><CopyDocument /></el-icon>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="创建时间" width="180">
            <template #default="{ row }">{{ fmtDate(row.created_at) }}</template>
          </el-table-column>
        </el-table>

        <!-- Mobile card list -->
        <div class="key-list show-mobile">
          <div v-for="(row, i) in (user.api_keys || [])" :key="i" class="key-card">
            <div class="key-card-head">
              <span class="key-name">{{ row.name }}</span>
              <el-tag size="small">{{ row.channel }}</el-tag>
            </div>
            <div class="mono copyable key-val" @click="copy(row.key)">
              <span class="text">{{ row.key }}</span>
              <el-icon><CopyDocument /></el-icon>
            </div>
            <div class="key-date">{{ fmtDate(row.created_at) }}</div>
          </div>
          <div v-if="!user.api_keys || user.api_keys.length === 0" class="empty">暂无 API Key</div>
        </div>
      </div>

      <div class="section">
        <h2><span class="section-bar" />按模型 Token 消耗</h2>

        <!-- Desktop -->
        <el-table :data="user.models || []" stripe class="hide-mobile">
          <el-table-column label="模型" min-width="280">
            <template #default="{ row }">{{ row.model }}</template>
          </el-table-column>
          <el-table-column label="请求数" align="right" prop="requests" width="120" />
          <el-table-column label="Tokens" align="right" width="160">
            <template #default="{ row }">{{ fmt(row.tokens) }}</template>
          </el-table-column>
          <el-table-column label="消费金额" align="right" width="180">
            <template #default="{ row }">{{ trimAmount(row.amount) }}</template>
          </el-table-column>
        </el-table>

        <!-- Mobile -->
        <div class="model-list show-mobile">
          <div v-for="(row, i) in (user.models || [])" :key="i" class="model-card">
            <div class="model-name">{{ row.model }}</div>
            <div class="model-stats">
              <div>
                <div class="ms-label">请求数</div>
                <div class="ms-val">{{ fmt(row.requests) }}</div>
              </div>
              <div>
                <div class="ms-label">Tokens</div>
                <div class="ms-val">{{ fmt(row.tokens) }}</div>
              </div>
              <div>
                <div class="ms-label">消费</div>
                <div class="ms-val">{{ trimAmount(row.amount) }}</div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="(!user.models || user.models.length === 0) && !legacyRequests" class="empty">暂无消费记录</div>

        <div v-if="legacyRequests > 0" class="legacy-hint">
          另有 {{ fmt(legacyRequests) }} 条升级前未分类记录(共 {{ fmt(legacyTokens) }} tokens),已隐藏 ·
          后续新请求会自动按模型归类
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { CopyDocument, ArrowLeft } from '@element-plus/icons-vue'
import { adminApi } from '@/api/admin'

const route = useRoute()
const router = useRouter()

const user = ref(null)
const loading = ref(false)

const initial = computed(() => {
  if (!user.value) return 'U'
  const name = user.value.name || user.value.email || user.value.address || `${user.value.id}`
  return name.slice(0, 1).toUpperCase()
})

// Pre-instrumentation rows (model column NULL/empty). Header cards still
// include these so the user's true lifetime usage is shown; the per-model
// list excludes them and we surface the residual here as a hint.
const legacyRequests = computed(() => Number(user.value?.legacy_requests || 0))
const legacyTokens = computed(() => Number(user.value?.legacy_tokens || 0))

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

function trimAmount(amt) {
  if (amt == null) return '0'
  const s = String(amt)
  if (!s.includes('.')) return s
  const trimmed = s.replace(/0+$/, '').replace(/\.$/, '')
  return trimmed === '' ? '0' : trimmed
}

function mapDisplay(m) {
  if (!m || Object.keys(m).length === 0) return ''
  return Object.entries(m)
    .map(([cur, amt]) => `${trimAmount(amt)} ${cur}`)
    .join(' · ')
}

function back() {
  router.push({ name: 'users' })
}

function copy(text) {
  navigator.clipboard.writeText(text).then(
    () => ElMessage.success('已复制'),
    () => ElMessage.warning('复制失败'),
  )
}

async function load() {
  loading.value = true
  try {
    user.value = await adminApi.userDetail(route.params.id)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.head { margin-bottom: 12px; }
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--color-text-soft) !important;
  font-weight: 500 !important;
  padding: 6px 10px !important;
  border-radius: 8px !important;
  transition: background var(--duration-fast) var(--ease-out) !important;
}
.back-btn:hover { background: var(--color-bg-soft) !important; }

/* ===== Profile card ===== */
.profile {
  position: relative;
  display: flex;
  gap: 20px;
  align-items: center;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}
.profile::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(80% 80% at 0% 0%, rgba(37, 99, 235, 0.06), transparent 50%),
    radial-gradient(70% 70% at 100% 100%, rgba(6, 182, 212, 0.05), transparent 50%);
  pointer-events: none;
}
.profile > * { position: relative; }

.avatar {
  width: 72px;
  height: 72px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  background: var(--gradient-brand);
  color: #fff;
  font-size: 32px;
  font-weight: 700;
  flex-shrink: 0;
  box-shadow: 0 10px 24px -6px rgba(37, 99, 235, 0.4);
}

.info { flex: 1; min-width: 0; }

.name {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.name-text {
  letter-spacing: -0.01em;
  word-break: break-all;
}

.info-rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.row {
  display: flex;
  gap: 12px;
  font-size: 13px;
  align-items: baseline;
}
.row .key {
  color: var(--color-muted);
  width: 48px;
  flex-shrink: 0;
  font-weight: 500;
}
.row .val { color: var(--color-text-soft); word-break: break-all; }

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.copyable {
  cursor: pointer;
  color: var(--color-brand-500);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border-radius: 6px;
  transition: background var(--duration-fast) var(--ease-out);
  min-width: 0;
  word-break: break-all;
}
.copyable:hover { background: var(--color-info-bg); }
.copyable .text { word-break: break-all; }

/* ===== Stat mini ===== */
.metric-grid { margin-top: var(--space-5); }

.stat-mini { padding: 16px 18px; }
.stat-mini.brand   { --accent-soft: rgba(37, 99, 235, 0.08); }
.stat-mini.cyan    { --accent-soft: rgba(6, 182, 212, 0.08); }
.stat-mini.emerald { --accent-soft: rgba(16, 185, 129, 0.08); }
.stat-mini.amber   { --accent-soft: rgba(245, 158, 11, 0.08); }

.stat-mini::after {
  content: "";
  position: absolute;
  top: 0; left: 0; bottom: 0;
  width: 3px;
  border-radius: 2px 0 0 2px;
}
.stat-mini.brand::after   { background: linear-gradient(180deg, #3b82f6, #2563eb); }
.stat-mini.cyan::after    { background: linear-gradient(180deg, #06b6d4, #0891b2); }
.stat-mini.emerald::after { background: linear-gradient(180deg, #10b981, #059669); }
.stat-mini.amber::after   { background: linear-gradient(180deg, #fbbf24, #f59e0b); }

.value-sm { font-size: 15px; font-weight: 600; line-height: 1.4; }

.empty {
  padding: 24px 0;
  text-align: center;
  color: var(--color-muted);
  font-size: 13px;
}

.legacy-hint {
  margin-top: 16px;
  padding: 10px 14px;
  background: #fef9c3;
  border-left: 3px solid #facc15;
  border-radius: 4px;
  font-size: 12px;
  color: #713f12;
  line-height: 1.6;
}

.section-bar {
  display: inline-block;
  width: 4px;
  height: 16px;
  background: var(--gradient-brand);
  border-radius: 2px;
  margin-right: 4px;
  vertical-align: -2px;
}

/* ===== Mobile cards ===== */
.key-list, .model-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.key-card {
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius-md);
  padding: 12px;
}
.key-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.key-name { font-weight: 600; font-size: 13px; }
.key-val { font-size: 12px; padding: 6px 8px; background: var(--color-surface); border-radius: 6px; }
.key-date {
  font-size: 11px;
  color: var(--color-muted);
  margin-top: 6px;
}

.model-card {
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius-md);
  padding: 12px;
}
.model-name {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 10px;
  word-break: break-all;
}
.model-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 8px;
  background: var(--color-surface);
  border-radius: 8px;
}
.ms-label { font-size: 10px; color: var(--color-muted); text-align: center; }
.ms-val   {
  font-size: 14px;
  font-weight: 700;
  text-align: center;
  margin-top: 2px;
  letter-spacing: -0.01em;
}

@media (max-width: 640px) {
  .profile { padding: 16px; gap: 14px; }
  .avatar { width: 56px; height: 56px; font-size: 24px; border-radius: 14px; }
  .name { font-size: 15px; margin-bottom: 8px; }
  .row .key { width: 40px; }
}
</style>
