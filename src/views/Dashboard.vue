<template>
  <div class="page dashboard">
    <header class="page-head">
      <div class="page-head__text">
        <h1>概览</h1>
        <p class="subtitle">实时监控 Gonka Router 服务运行状态</p>
      </div>
      <div class="page-head__status" v-if="quality.has_data">
        <span class="dot" />
        <span>{{ quality.qps_1m }} QPS · 实时</span>
      </div>
    </header>

    <section class="metric-section">
      <div class="section-label">汇总指标</div>
      <div class="metric-grid metric-grid--primary">
        <div class="metric-card stat" :style="cardStyle('brand')">
          <div class="icon-wrap" :style="iconStyle('brand')">
            <el-icon><DataLine /></el-icon>
          </div>
          <div class="stat-body">
            <div class="label">累计请求数</div>
            <div class="value">{{ fmt(totals.chat_requests) }}</div>
          </div>
        </div>

        <div class="metric-card stat" :style="cardStyle('cyan')">
          <div class="icon-wrap" :style="iconStyle('cyan')">
            <el-icon><Coin /></el-icon>
          </div>
          <div class="stat-body">
            <div class="label">累计 Token 消耗</div>
            <div class="value">{{ fmt(totals.chat_tokens) }}</div>
          </div>
        </div>

        <div class="metric-card stat" :style="cardStyle('emerald')">
          <div class="icon-wrap" :style="iconStyle('emerald')">
            <el-icon><Wallet /></el-icon>
          </div>
          <div class="stat-body">
            <div class="label">每日收入 <span class="suffix">今日</span></div>
            <div class="value">{{ revenueDisplay(today.revenue_by_currency) }}</div>
            <div class="delta">累计 {{ revenueDisplay(totals.revenue_by_currency) }}</div>
          </div>
        </div>

        <div class="metric-card stat" :style="cardStyle('amber')">
          <div class="icon-wrap" :style="iconStyle('amber')">
            <el-icon><UserFilled /></el-icon>
          </div>
          <div class="stat-body">
            <div class="label">用户总数</div>
            <div class="value">{{ fmt(totals.users) }}</div>
          </div>
        </div>
      </div>
    </section>

    <section class="metric-section">
      <div class="section-label">服务质量 <span class="section-label__hint">最近 {{ quality.window_hours || 24 }} 小时</span></div>
      <div class="metric-grid metric-grid--quality">
        <div class="metric-card stat" :class="{ muted: !quality.has_data }" :style="cardStyle('emerald')">
          <div class="icon-wrap" :style="iconStyle('emerald')">
            <el-icon><CircleCheck /></el-icon>
          </div>
          <div class="stat-body">
            <div class="label">成功率</div>
            <div class="value">{{ quality.has_data ? quality.success_rate + '%' : '—' }}</div>
            <div class="delta">样本 {{ fmt(quality.total_requests) }} 次</div>
          </div>
        </div>

        <div class="metric-card stat" :class="{ muted: !quality.has_data || !(quality.ttft_ms && quality.ttft_ms.sample_streams) }" :style="cardStyle('brand')">
          <div class="icon-wrap" :style="iconStyle('brand')">
            <el-icon><Lightning /></el-icon>
          </div>
          <div class="stat-body">
            <div class="label">TTFT 首 Token <span class="suffix">P50</span></div>
            <div class="value">{{ ttftDisplay }}</div>
            <div class="delta">P95 {{ ms(quality.ttft_ms && quality.ttft_ms.p95) }} · 样本 {{ fmt(quality.ttft_ms && quality.ttft_ms.sample_streams) }}</div>
          </div>
        </div>

        <div class="metric-card stat" :class="{ muted: !quality.has_data }" :style="cardStyle('cyan')">
          <div class="icon-wrap" :style="iconStyle('cyan')">
            <el-icon><Clock /></el-icon>
          </div>
          <div class="stat-body">
            <div class="label">平均延迟 <span class="suffix">P50</span></div>
            <div class="value">{{ durationDisplay }}</div>
            <div class="delta">P95 {{ ms(quality.duration_ms && quality.duration_ms.p95) }} · 均值 {{ ms(quality.duration_ms && quality.duration_ms.avg) }}</div>
          </div>
        </div>

        <div class="metric-card stat" :class="{ muted: !quality.stream_total }" :style="cardStyle('rose')">
          <div class="icon-wrap" :style="iconStyle('rose')">
            <el-icon><WarnTriangleFilled /></el-icon>
          </div>
          <div class="stat-body">
            <div class="label">Stream 中断率</div>
            <div class="value">{{ quality.stream_total ? quality.stream_abort_rate + '%' : '—' }}</div>
            <div class="delta">{{ fmt(quality.stream_aborted) }} / {{ fmt(quality.stream_total) }} 流式</div>
          </div>
        </div>
      </div>
    </section>

    <div class="filter-bar">
      <div class="filter-bar__label">
        <el-icon><Calendar /></el-icon>
        <span>时间范围</span>
      </div>
      <el-radio-group v-model="rangeDays" size="default" @change="reload" class="filter-bar__group">
        <el-radio-button :value="7">近 7 天</el-radio-button>
        <el-radio-button :value="14">近 14 天</el-radio-button>
        <el-radio-button :value="30">近 30 天</el-radio-button>
      </el-radio-group>
    </div>

    <div class="section">
      <h2>
        <span class="section-bar" />
        每日趋势
        <span class="hint-chip">近 {{ rangeDays }} 天</span>
      </h2>
      <div v-if="daily" class="trend-row">
        <div class="trend-card">
          <div class="trend-title">
            <span class="dot-marker dot-marker--brand" />请求数 &amp; Tokens
          </div>
          <EChart :option="dailyTrafficOption" height="300px" mobile-height="240px" />
        </div>
        <div class="trend-card">
          <div class="trend-title">
            <span class="dot-marker dot-marker--emerald" />活跃用户 &amp; 新增用户
          </div>
          <EChart :option="dailyUserOption" height="300px" mobile-height="240px" />
        </div>
      </div>
      <el-empty v-else description="暂无数据" />
    </div>

    <div class="section">
      <h2>
        <span class="section-bar" />
        模型使用占比
        <span class="hint-chip">近 {{ rangeDays }} 天</span>
      </h2>
      <div v-if="modelItems.length === 0" class="empty-state">
        <el-empty description="暂无模型调用数据" :image-size="80" />
        <div v-if="legacyRequests > 0" class="legacy-hint" style="margin-top: 12px;">
          有 {{ fmt(legacyRequests) }} 条升级前未分类记录(共 {{ fmt(legacyTokens) }} tokens),已隐藏
        </div>
      </div>
      <div v-else>
        <div class="model-row">
          <div class="model-pie-wrap">
            <div class="pie-title">
              <span class="dot-marker dot-marker--brand" />按 Token 占比
            </div>
            <EChart :option="modelTokenPieOption" height="340px" mobile-height="320px" class="model-chart" />
          </div>
          <div class="model-pie-wrap">
            <div class="pie-title">
              <span class="dot-marker dot-marker--cyan" />按请求数占比
            </div>
            <EChart :option="modelRequestPieOption" height="340px" mobile-height="320px" class="model-chart" />
          </div>
        </div>
        <div v-if="legacyRequests > 0" class="legacy-hint">
          另有 {{ fmt(legacyRequests) }} 条升级前未分类记录(共 {{ fmt(legacyTokens) }} tokens),已隐藏 ·
          后续新请求会自动按模型归类
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import EChart from '@/components/EChart.vue'
import { adminApi } from '@/api/admin'
import {
  DataLine, Coin, Wallet, User, UserFilled,
  CircleCheck, Lightning, Clock, WarnTriangleFilled, TrendCharts,
  Calendar,
} from '@element-plus/icons-vue'

const NARROW_BREAKPOINT = 720
const isNarrow = ref(typeof window !== 'undefined' && window.innerWidth <= NARROW_BREAKPOINT)
let narrowListener = null

const rangeDays = ref(14)
const totals = ref({})
const today = ref({})
const daily = ref(null)
const modelItems = ref([])
const legacyRequests = ref(0)
const legacyTokens = ref(0)
const quality = ref({})

const palette = {
  brand:   { from: '#3b82f6', to: '#2563eb', soft: 'rgba(59, 130, 246, 0.10)' },
  cyan:    { from: '#06b6d4', to: '#0891b2', soft: 'rgba(6, 182, 212, 0.10)' },
  emerald: { from: '#10b981', to: '#059669', soft: 'rgba(16, 185, 129, 0.10)' },
  violet:  { from: '#8b5cf6', to: '#7c3aed', soft: 'rgba(139, 92, 246, 0.10)' },
  amber:   { from: '#f59e0b', to: '#d97706', soft: 'rgba(245, 158, 11, 0.10)' },
  rose:    { from: '#f43f5e', to: '#e11d48', soft: 'rgba(244, 63, 94, 0.10)' },
}

function cardStyle(key) {
  const p = palette[key]
  return {
    '--accent-from': p.from,
    '--accent-to':   p.to,
    '--accent-soft': p.soft,
  }
}
function iconStyle(key) {
  const p = palette[key]
  return { background: `linear-gradient(135deg, ${p.from} 0%, ${p.to} 100%)` }
}

function ms(v) {
  if (v == null) return '—'
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return '—'
  if (n < 1000) return Math.round(n) + ' ms'
  return (n / 1000).toFixed(2) + ' s'
}

const ttftDisplay = computed(() => {
  const t = quality.value?.ttft_ms
  if (!t || !t.sample_streams) return '—'
  return ms(t.p50)
})

const durationDisplay = computed(() => {
  const d = quality.value?.duration_ms
  if (!quality.value?.has_data || !d) return '—'
  return ms(d.p50)
})

function fmt(n) {
  if (n == null) return '0'
  const num = Number(n)
  if (!Number.isFinite(num)) return String(n)
  return num.toLocaleString('zh-CN')
}

function revenueDisplay(map) {
  if (!map || Object.keys(map).length === 0) return '0'
  return Object.entries(map)
    .map(([cur, amt]) => `${trimAmount(amt)} ${cur}`)
    .join(' · ')
}

function trimAmount(amt) {
  if (amt == null) return '0'
  const s = String(amt)
  if (!s.includes('.')) return s
  const trimmed = s.replace(/0+$/, '').replace(/\.$/, '')
  const dot = trimmed.indexOf('.')
  if (dot >= 0 && trimmed.length - dot - 1 > 6) {
    return Number(trimmed).toFixed(6)
  }
  return trimmed
}

const baseTooltip = {
  trigger: 'axis',
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  borderColor: '#e6eaf2',
  textStyle: { color: '#0f172a', fontSize: 12 },
  extraCssText: 'box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12); border-radius: 10px;',
}

function compactNumber(n) {
  const num = Number(n)
  if (!Number.isFinite(num)) return n
  const abs = Math.abs(num)
  if (abs >= 1e9) return (num / 1e9).toFixed(num % 1e9 === 0 ? 0 : 1) + 'B'
  if (abs >= 1e6) return (num / 1e6).toFixed(num % 1e6 === 0 ? 0 : 1) + 'M'
  if (abs >= 1e3) return (num / 1e3).toFixed(num % 1e3 === 0 ? 0 : 1) + 'K'
  return String(num)
}

const baseXAxis = (days, narrow) => ({
  type: 'category', data: days,
  axisLabel: {
    fontSize: 11,
    color: '#64748b',
    hideOverlap: true,
    formatter: (val) => {
      if (!val) return val
      // On narrow screens, show MM-DD only
      if (narrow && val.length === 10) return val.slice(5)
      return val
    },
  },
  axisLine: { lineStyle: { color: '#e6eaf2' } },
})

const dailyTrafficOption = computed(() => {
  if (!daily.value) return null
  const d = daily.value
  const narrow = isNarrow.value
  return {
    tooltip: baseTooltip,
    legend: {
      data: ['请求数', 'Tokens'],
      top: 4,
      right: narrow ? 4 : 12,
      textStyle: { color: '#475569', fontSize: 11 },
      itemWidth: 14,
      itemHeight: 8,
      itemGap: 12,
      icon: 'roundRect',
    },
    grid: {
      left: narrow ? 4 : 12,
      right: narrow ? 4 : 12,
      top: 36,
      bottom: 6,
      containLabel: true,
    },
    xAxis: baseXAxis(d.days, narrow),
    yAxis: [
      {
        type: 'value',
        position: 'left',
        axisLabel: { color: '#64748b', fontSize: 11, formatter: (v) => compactNumber(v) },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
      },
      {
        type: 'value',
        position: 'right',
        axisLabel: { color: '#64748b', fontSize: 11, formatter: (v) => compactNumber(v) },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '请求数', type: 'line', smooth: true, data: d.requests,
        showSymbol: false,
        itemStyle: { color: '#2563eb' },
        lineStyle: { width: 2.5 },
        areaStyle: {
          color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
            { offset: 0, color: 'rgba(37, 99, 235, 0.22)' },
            { offset: 1, color: 'rgba(37, 99, 235, 0)' },
          ]},
        },
      },
      {
        name: 'Tokens', type: 'line', smooth: true, yAxisIndex: 1, data: d.tokens,
        showSymbol: false,
        itemStyle: { color: '#06b6d4' }, lineStyle: { width: 2.5 },
        areaStyle: {
          color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
            { offset: 0, color: 'rgba(6, 182, 212, 0.18)' },
            { offset: 1, color: 'rgba(6, 182, 212, 0)' },
          ]},
        },
      },
    ],
  }
})

const dailyUserOption = computed(() => {
  if (!daily.value) return null
  const d = daily.value
  const narrow = isNarrow.value
  return {
    tooltip: baseTooltip,
    legend: {
      data: ['活跃用户', '新增用户'],
      top: 4,
      right: narrow ? 4 : 12,
      textStyle: { color: '#475569', fontSize: 11 },
      itemWidth: 14,
      itemHeight: 8,
      itemGap: 12,
      icon: 'roundRect',
    },
    grid: {
      left: narrow ? 4 : 12,
      right: narrow ? 4 : 12,
      top: 36,
      bottom: 6,
      containLabel: true,
    },
    xAxis: baseXAxis(d.days, narrow),
    yAxis: {
      type: 'value',
      axisLabel: { color: '#64748b', fontSize: 11, formatter: (v) => compactNumber(v) },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      minInterval: 1,
    },
    series: [
      {
        name: '活跃用户', type: 'line', smooth: true, data: d.active_users,
        showSymbol: false,
        itemStyle: { color: '#10b981' }, lineStyle: { width: 2.5 },
        areaStyle: {
          color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
            { offset: 0, color: 'rgba(16, 185, 129, 0.22)' },
            { offset: 1, color: 'rgba(16, 185, 129, 0)' },
          ]},
        },
      },
      {
        name: '新增用户', type: 'bar', data: d.new_users,
        itemStyle: {
          color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
            { offset: 0, color: '#fbbf24' },
            { offset: 1, color: '#f59e0b' },
          ]},
          borderRadius: [4, 4, 0, 0],
        },
        barMaxWidth: 16,
      },
    ],
  }
})

const tokenTotal = computed(() => modelItems.value.reduce((sum, m) => sum + Number(m.tokens || 0), 0))
const requestTotal = computed(() => modelItems.value.reduce((sum, m) => sum + Number(m.requests || 0), 0))

const PIE_COLORS = ['#2563eb', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6']

function buildModelPieOption({ valueKey, total, unit, totalLabel }) {
  const narrow = isNarrow.value
  return {
    tooltip: {
      trigger: 'item',
      formatter: `{b}<br/>{c} ${unit} ({d}%)`,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e6eaf2',
      textStyle: { color: '#0f172a', fontSize: 12 },
      extraCssText: 'box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12); border-radius: 10px;',
    },
    legend: {
      type: 'scroll',
      orient: 'horizontal',
      bottom: 4,
      left: 'center',
      width: '90%',
      textStyle: { color: '#475569', fontSize: 12 },
      itemWidth: 12,
      itemHeight: 12,
      itemGap: 16,
      icon: 'circle',
      pageIconColor: '#94a3b8',
      pageTextStyle: { color: '#64748b', fontSize: 11 },
    },
    color: PIE_COLORS,
    graphic: {
      type: 'group',
      left: 'center',
      top: narrow ? '36%' : '42%',
      children: [
        {
          type: 'text',
          left: 'center',
          top: 0,
          style: {
            text: fmt(total),
            fill: '#0f172a',
            fontSize: narrow ? 20 : 24,
            fontWeight: 700,
            textAlign: 'center',
          },
        },
        {
          type: 'text',
          left: 'center',
          top: narrow ? 26 : 32,
          style: {
            text: totalLabel,
            fill: '#64748b',
            fontSize: 12,
            fontWeight: 500,
            textAlign: 'center',
          },
        },
      ],
    },
    series: [
      {
        name: totalLabel,
        type: 'pie',
        radius: narrow ? ['48%', '68%'] : ['54%', '78%'],
        center: ['50%', narrow ? '44%' : '48%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 3 },
        label: { show: false },
        labelLine: { show: false },
        emphasis: {
          scale: true, scaleSize: 8,
          itemStyle: { shadowBlur: 16, shadowColor: 'rgba(15, 23, 42, 0.18)' },
        },
        data: modelItems.value.map((m) => ({ name: m.model, value: m[valueKey] })),
      },
    ],
  }
}

const modelTokenPieOption = computed(() =>
  buildModelPieOption({ valueKey: 'tokens', total: tokenTotal.value, unit: 'tokens', totalLabel: '总计 Tokens' })
)

const modelRequestPieOption = computed(() =>
  buildModelPieOption({ valueKey: 'requests', total: requestTotal.value, unit: '次', totalLabel: '总计请求数' })
)

async function reload() {
  const [ov, dy, mo, qa] = await Promise.all([
    adminApi.overview().catch(() => null),
    adminApi.daily(rangeDays.value).catch(() => null),
    adminApi.models(rangeDays.value).catch(() => null),
    adminApi.quality(24).catch(() => null),
  ])
  if (ov) {
    totals.value = ov.totals || {}
    today.value = ov.today || {}
  }
  if (dy) daily.value = dy
  if (mo) {
    modelItems.value = mo.items || []
    legacyRequests.value = mo.legacy_requests || 0
    legacyTokens.value = mo.legacy_tokens || 0
  }
  if (qa) quality.value = qa
}

let qpsTimer = null

onMounted(() => {
  reload()
  qpsTimer = setInterval(() => {
    adminApi.quality(24).then((qa) => { if (qa) quality.value = qa }).catch(() => {})
  }, 30_000)
  narrowListener = () => { isNarrow.value = window.innerWidth <= NARROW_BREAKPOINT }
  window.addEventListener('resize', narrowListener)
})

onBeforeUnmount(() => {
  if (qpsTimer) clearInterval(qpsTimer)
  if (narrowListener) window.removeEventListener('resize', narrowListener)
})
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.dashboard > * { margin: 0; }

/* ===== Page header ===== */
.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
}
.page-head__text { min-width: 0; }
.page-head h1 { margin: 0; }
.subtitle {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--color-muted);
  font-weight: 400;
}

.page-head__status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--color-success-bg);
  color: var(--color-success-fg);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.01em;
}
.page-head__status .dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 0 0 currentColor;
  animation: pulse-dot 1.6s var(--ease-out) infinite;
}
@keyframes pulse-dot {
  0%   { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.6); }
  70%  { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
  100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}

/* ===== Metric sections ===== */
.metric-section { display: flex; flex-direction: column; gap: 10px; }

.section-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-soft);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.section-label__hint {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-muted);
  text-transform: none;
  letter-spacing: 0;
}

.metric-grid--primary,
.metric-grid--quality {
  grid-template-columns: repeat(4, 1fr);
}

/* Stat cards with accent bar + icon */
.metric-card.stat {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 18px;
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}
.metric-card.stat::before {
  background: linear-gradient(135deg, var(--accent-soft, transparent), transparent 60%);
}
.metric-card.stat::after {
  content: "";
  position: absolute;
  top: 0; left: 0; bottom: 0;
  width: 3px;
  background: linear-gradient(180deg, var(--accent-from, #2563eb), var(--accent-to, #06b6d4));
  opacity: 0.85;
}

.icon-wrap {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 20px;
  box-shadow: 0 6px 14px -4px rgba(15, 23, 42, 0.18);
}

.stat-body { min-width: 0; flex: 1; }

.metric-card .suffix {
  font-size: 10px;
  background: var(--color-info-bg);
  color: var(--color-info-fg);
  padding: 1px 6px;
  border-radius: 4px;
  margin-left: 4px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

/* ===== Filter bar ===== */
.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xs);
}
.filter-bar__label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-soft);
}
.filter-bar__label .el-icon { color: var(--color-brand-500); font-size: 16px; }
.filter-bar__group :deep(.el-radio-button__inner) {
  transition: all var(--duration-fast) var(--ease-out) !important;
}

/* ===== Section internals ===== */
.section h2 { position: relative; }
.section-bar {
  display: inline-block;
  width: 4px;
  height: 16px;
  background: var(--gradient-brand);
  border-radius: 2px;
  margin-right: 4px;
  vertical-align: -2px;
}
.hint-chip {
  display: inline-flex;
  align-items: center;
  margin-left: auto;
  padding: 3px 10px;
  background: var(--color-info-bg);
  color: var(--color-info-fg);
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.trend-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.trend-card,
.model-pie-wrap {
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius-md);
  padding: 14px 16px 12px;
  background: var(--color-surface-2);
  transition: border-color var(--duration-normal) var(--ease-out),
              box-shadow var(--duration-normal) var(--ease-out);
}
.trend-card:hover,
.model-pie-wrap:hover {
  border-color: rgba(37, 99, 235, 0.2);
  box-shadow: var(--shadow-sm);
}

.trend-title,
.pie-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 8px;
  letter-spacing: 0.01em;
}

.dot-marker {
  width: 8px; height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot-marker--brand   { background: linear-gradient(135deg, #3b82f6, #2563eb); }
.dot-marker--cyan    { background: linear-gradient(135deg, #22d3ee, #06b6d4); }
.dot-marker--emerald { background: linear-gradient(135deg, #34d399, #10b981); }

.model-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  align-items: start;
}

.model-chart { background: transparent; }

.legacy-hint {
  margin-top: 16px;
  padding: 12px 14px;
  background: var(--color-warning-bg);
  border-left: 3px solid var(--color-amber-500);
  border-radius: var(--radius-sm);
  font-size: 12px;
  color: var(--color-warning-fg);
  line-height: 1.6;
}

.empty-state {
  padding: 28px 0;
  text-align: center;
}

/* ===== Responsive ===== */
@media (max-width: 1100px) {
  .trend-row { grid-template-columns: 1fr; }
  .model-row { grid-template-columns: 1fr; }
  .metric-grid--primary,
  .metric-grid--quality {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .dashboard { gap: 18px; }

  .page-head { align-items: flex-start; }
  .page-head__status { align-self: flex-start; }

  .filter-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding: 12px;
  }
  .filter-bar__group {
    width: 100%;
    display: flex;
  }
  .filter-bar__group :deep(.el-radio-button) { flex: 1; }
  .filter-bar__group :deep(.el-radio-button__inner) {
    width: 100%;
    padding-left: 0 !important;
    padding-right: 0 !important;
  }

  .metric-grid--primary,
  .metric-grid--quality {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .metric-card.stat {
    padding: 14px;
    gap: 10px;
  }
  .icon-wrap { width: 36px; height: 36px; font-size: 18px; border-radius: 10px; }
  .metric-card .value { font-size: 18px; }
  .metric-card .label { font-size: 11px; }

  .section h2 {
    flex-wrap: wrap;
    gap: 8px;
  }
  .hint-chip { margin-left: 0; }

  .trend-row,
  .model-row { gap: 12px; }
  .trend-card,
  .model-pie-wrap { padding: 12px; }
}

@media (max-width: 360px) {
  .metric-grid--primary,
  .metric-grid--quality {
    grid-template-columns: 1fr;
  }
}
</style>
