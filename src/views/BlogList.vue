<template>
  <div class="page">
    <!-- Header -->
    <div class="page-head">
      <div>
        <h1>Blog 管理</h1>
        <p class="subtitle">创建、编辑并发布文章到 gonkarouter.io/blog</p>
      </div>
      <el-button type="primary" @click="$router.push('/blog/new')">
        <el-icon><Plus /></el-icon>
        新增文章
      </el-button>
    </div>

    <!-- Status filter tabs -->
    <el-tabs v-model="statusFilter" class="status-tabs" @tab-change="reload(1)">
      <el-tab-pane label="全部" name="" />
      <el-tab-pane name="published">
        <template #label>
          <span>已发布</span>
          <el-badge v-if="publishedCount > 0" :value="publishedCount" class="tab-badge" />
        </template>
      </el-tab-pane>
      <el-tab-pane label="草稿" name="draft" />
    </el-tabs>

    <!-- Table -->
    <div class="card table-wrap">
      <el-table
        v-loading="loading"
        :data="rows"
        stripe
        style="width: 100%"
        empty-text="暂无文章，点击「新增文章」开始创作"
      >
        <!-- Cover -->
        <el-table-column label="封面" width="88">
          <template #default="{ row }">
            <div class="cover-cell">
              <img v-if="row.cover" :src="row.cover" class="cover-thumb" alt="cover" />
              <div v-else class="cover-empty">
                <el-icon><Picture /></el-icon>
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- Title + slug -->
        <el-table-column label="标题" min-width="260">
          <template #default="{ row }">
            <div class="post-title">{{ row.title }}</div>
            <div class="muted post-slug">/blog/{{ row.slug }}</div>
          </template>
        </el-table-column>

        <!-- Created -->
        <el-table-column label="创建时间" width="160" class-name="hide-mobile">
          <template #default="{ row }">{{ fmtDate(row.created_at) }}</template>
        </el-table-column>

        <!-- Updated -->
        <el-table-column label="更新时间" width="160" class-name="hide-mobile">
          <template #default="{ row }">{{ fmtDate(row.updated_at) }}</template>
        </el-table-column>

        <!-- Status -->
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'published' ? 'success' : 'info'"
              size="small"
              effect="light"
              round
            >
              {{ row.status === 'published' ? '已发布' : '草稿' }}
            </el-tag>
          </template>
        </el-table-column>

        <!-- Actions -->
        <el-table-column label="操作" width="210" fixed="right">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click="openPreview(row)">预览</el-button>
            <el-button size="small" link @click="$router.push(`/blog/${row.id}/edit`)">编辑</el-button>
            <el-button
              size="small"
              link
              :type="row.status === 'published' ? 'warning' : 'success'"
              :loading="toggleLoading === row.id"
              @click="toggleStatus(row)"
            >
              {{ row.status === 'published' ? '撤回' : '发布' }}
            </el-button>
            <el-button size="small" link type="danger" @click="promptDelete(row)">删除</el-button>
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

    <!-- Delete dialog -->
    <el-dialog v-model="deleteVisible" title="确认删除" width="380px" align-center>
      <p>确定要删除文章 <strong>「{{ deleteTarget?.title }}」</strong>？此操作不可撤销。</p>
      <template #footer>
        <el-button @click="deleteVisible = false">取消</el-button>
        <el-button type="danger" :loading="deleteLoading" @click="doDelete">删除</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus, Picture } from '@element-plus/icons-vue'
import { adminApi } from '@/api/admin'

const router = useRouter()

const loading = ref(false)
const rows = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const publishedCount = ref(0)
const statusFilter = ref('')
const toggleLoading = ref(null)

const deleteVisible = ref(false)
const deleteTarget = ref(null)
const deleteLoading = ref(false)

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
    const res = await adminApi.posts({ page: p, pageSize: pageSize.value, status: statusFilter.value })
    rows.value = res.data?.items ?? res.items ?? []
    total.value = res.data?.total ?? res.total ?? 0
  } catch {
    rows.value = []
  } finally {
    loading.value = false
  }
}

const toggleStatus = async (row) => {
  toggleLoading.value = row.id
  try {
    if (row.status === 'published') {
      await adminApi.unpublishPost(row.id)
      row.status = 'draft'
      ElMessage.success('已撤回')
    } else {
      await adminApi.publishPost(row.id)
      row.status = 'published'
      ElMessage.success('已发布')
    }
  } catch { /* api error already shown */ } finally {
    toggleLoading.value = null
  }
}

const promptDelete = (row) => {
  deleteTarget.value = row
  deleteVisible.value = true
}

const doDelete = async () => {
  deleteLoading.value = true
  try {
    await adminApi.deletePost(deleteTarget.value.id)
    ElMessage.success('已删除')
    deleteVisible.value = false
    reload(page.value)
  } catch { /* error shown */ } finally {
    deleteLoading.value = false
  }
}

const openPreview = (row) => {
  const origin = import.meta.env.VITE_SITE_URL || 'https://gonkarouter.io'
  window.open(`${origin}/blog/${row.slug}`, '_blank', 'noopener')
}

onMounted(() => reload(1))
</script>

<style scoped>
.status-tabs { margin-bottom: 0; }
.status-tabs :deep(.el-tabs__header) { margin-bottom: 0; }
.tab-badge { margin-left: 6px; }

.card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 12px; overflow: hidden; }
.table-wrap { margin-top: 16px; }

.cover-cell { width: 60px; height: 40px; }
.cover-thumb { width: 60px; height: 40px; object-fit: cover; border-radius: 6px; display: block; }
.cover-empty {
  width: 60px; height: 40px; border-radius: 6px;
  background: var(--color-bg-soft);
  border: 1px dashed var(--color-border);
  display: flex; align-items: center; justify-content: center;
  color: var(--color-text-muted);
}

.post-title { font-weight: 600; font-size: 13.5px; color: var(--color-text); line-height: 1.4; }
.post-slug { font-size: 11.5px; font-family: 'JetBrains Mono', monospace; margin-top: 2px; }

.pager-row { display: flex; justify-content: flex-end; margin-top: 20px; }

.muted { color: var(--color-text-muted); }

@media (max-width: 768px) {
  .hide-mobile { display: none; }
}
</style>
