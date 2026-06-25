<template>
  <div class="editor-shell">

    <!-- ── Top bar ───────────────────────────────────────────────────────── -->
    <header class="editor-topbar">
      <button class="back-btn" @click="$router.push('/blog')">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 2L4 7l5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        返回列表
      </button>

      <div class="topbar-center">
        <span class="topbar-title">{{ form.title || '新增文章' }}</span>
        <span class="status-dot" :class="form.status === 'published' ? 'dot-live' : 'dot-draft'" />
        <span class="status-label">{{ form.status === 'published' ? '已发布' : '草稿' }}</span>
      </div>

      <div class="topbar-actions">
        <button class="btn-ghost" :disabled="saving === 'draft'" @click="save('draft')">
          <span v-if="saving === 'draft'" class="spin" />
          保存草稿
        </button>
        <button class="btn-primary" :disabled="!!saving" @click="save('published')">
          <span v-if="saving === 'published'" class="spin" />
          {{ form.status === 'published' ? '更新发布' : '发布文章' }}
        </button>
      </div>
    </header>

    <!-- ── Body ─────────────────────────────────────────────────────────── -->
    <div class="editor-body">

      <!-- Main writing area -->
      <div class="editor-main">

        <!-- Toolbar -->
        <div v-if="editor" class="tiptap-toolbar" role="toolbar">

          <!-- Paragraph style -->
          <div class="tb-group">
            <select class="tb-select" title="段落样式" @change="setHeading(+$event.target.value)">
              <option :value="0" :selected="!editor.isActive('heading')">正文</option>
              <option :value="1" :selected="editor.isActive('heading', { level: 1 })">标题 1</option>
              <option :value="2" :selected="editor.isActive('heading', { level: 2 })">标题 2</option>
              <option :value="3" :selected="editor.isActive('heading', { level: 3 })">标题 3</option>
            </select>
          </div>

          <div class="tb-divider" />

          <!-- Basic format -->
          <div class="tb-group">
            <button class="tb-btn" :class="{ on: editor.isActive('bold') }" title="粗体 (Ctrl+B)"
              @click="editor.chain().focus().toggleBold().run()">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor">
                <path d="M3 2h4a3 3 0 0 1 0 6H3V2zm0 6h4.5a3 3 0 0 1 0 6H3V8z" opacity=".85"/>
              </svg>
              <span>B</span>
            </button>
            <button class="tb-btn tb-italic" :class="{ on: editor.isActive('italic') }" title="斜体 (Ctrl+I)"
              @click="editor.chain().focus().toggleItalic().run()"><i>I</i></button>
            <button class="tb-btn" :class="{ on: editor.isActive('underline') }" title="下划线 (Ctrl+U)"
              @click="editor.chain().focus().toggleUnderline().run()">
              <span style="text-decoration:underline">U</span>
            </button>
            <button class="tb-btn" :class="{ on: editor.isActive('strike') }" title="删除线"
              @click="editor.chain().focus().toggleStrike().run()">
              <span style="text-decoration:line-through">S</span>
            </button>
          </div>

          <div class="tb-divider" />

          <!-- Color -->
          <div class="tb-group">
            <label class="tb-color-btn" title="文字颜色">
              <span class="tb-color-preview"
                :style="{ boxShadow: `inset 0 -3px 0 ${activeColor}` }">A</span>
              <input type="color" :value="activeColor" @input="setColor($event.target.value)" />
            </label>
            <label class="tb-color-btn" title="高亮背景">
              <span class="tb-color-preview tb-bg-preview"
                :style="{ background: activeBg === 'transparent' ? 'rgba(255,255,255,.05)' : activeBg }">A</span>
              <input type="color" :value="activeBg === 'transparent' ? '#facc15' : activeBg"
                @input="setBg($event.target.value)" />
            </label>
            <button class="tb-btn tb-sm" title="清除颜色样式"
              @click="editor.chain().focus().unsetColor().unsetHighlight().run()">✕</button>
          </div>

          <div class="tb-divider" />

          <!-- Alignment -->
          <div class="tb-group">
            <button class="tb-btn" :class="{ on: editor.isActive({ textAlign: 'left' }) }" title="左对齐"
              @click="editor.chain().focus().setTextAlign('left').run()">
              <AlignLeftIcon />
            </button>
            <button class="tb-btn" :class="{ on: editor.isActive({ textAlign: 'center' }) }" title="居中"
              @click="editor.chain().focus().setTextAlign('center').run()">
              <AlignCenterIcon />
            </button>
            <button class="tb-btn" :class="{ on: editor.isActive({ textAlign: 'right' }) }" title="右对齐"
              @click="editor.chain().focus().setTextAlign('right').run()">
              <AlignRightIcon />
            </button>
          </div>

          <div class="tb-divider" />

          <!-- Lists & Blocks -->
          <div class="tb-group">
            <button class="tb-btn tb-text" :class="{ on: editor.isActive('bulletList') }" title="无序列表"
              @click="editor.chain().focus().toggleBulletList().run()">• 列表</button>
            <button class="tb-btn tb-text" :class="{ on: editor.isActive('orderedList') }" title="有序列表"
              @click="editor.chain().focus().toggleOrderedList().run()">1. 列表</button>
            <button class="tb-btn" :class="{ on: editor.isActive('blockquote') }" title="引用块"
              @click="editor.chain().focus().toggleBlockquote().run()">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" opacity=".8">
                <path d="M1 2h5v5l-2 5H2l2-5H1V2zm7 0h5v5l-2 5H9l2-5H8V2z"/>
              </svg>
            </button>
            <button class="tb-btn tb-text" :class="{ on: editor.isActive('codeBlock') }" title="代码块"
              @click="editor.chain().focus().toggleCodeBlock().run()">&lt;/&gt;</button>
          </div>

          <div class="tb-divider" />

          <!-- Link & Image -->
          <div class="tb-group">
            <button class="tb-btn tb-text" :class="{ on: editor.isActive('link') }" title="插入链接" @click="setLink">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                <path d="M5.5 8.5a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5L6 3"/>
                <path d="M8.5 5.5a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5L8 11"/>
              </svg>
              链接
            </button>
            <button class="tb-btn tb-text" title="插入图片" @click="triggerImageUpload">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="1" y="1" width="12" height="12" rx="2"/>
                <circle cx="4.5" cy="4.5" r="1"/>
                <path d="M1 9l3-3 2.5 2.5L9 5l4 4"/>
              </svg>
              图片
            </button>
            <input ref="imageInput" type="file" accept="image/*" class="hidden" @change="onImageFile" />
            <button class="tb-btn tb-text" title="嵌入 YouTube / Bilibili 链接" @click="insertEmbed">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5.5 8.5a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5L6 3"/>
                <circle cx="7" cy="7" r="1"/>
              </svg>
              嵌入
            </button>
          </div>

          <div class="tb-divider" />

          <!-- Table -->
          <div class="tb-group">
            <button class="tb-btn tb-text" title="插入 3×3 表格" @click="insertTable">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4">
                <rect x="1" y="2" width="12" height="10" rx="1"/>
                <path d="M1 5.5h12M1 9h12M5 2v10M9 2v10"/>
              </svg>
              表格
            </button>
            <template v-if="inTable">
              <button class="tb-btn tb-sm" title="新增一列" @click="addColumnAfter">+列</button>
              <button class="tb-btn tb-sm" title="新增一行" @click="addRowAfter">+行</button>
              <button class="tb-btn tb-sm" title="删除当前列" @click="deleteColumn">−列</button>
              <button class="tb-btn tb-sm" title="删除当前行" @click="deleteRow">−行</button>
              <button class="tb-btn tb-sm" title="删除整张表格" @click="deleteTable">✕</button>
            </template>
          </div>

        </div>

        <!-- Document area -->
        <div class="doc-area">

          <!-- Title input inside editor -->
          <textarea
            ref="titleRef"
            v-model="form.title"
            class="doc-title-input"
            placeholder="文章标题…"
            rows="1"
            @input="autoResizeTitle"
          />

          <!-- Divider -->
          <div class="doc-meta-row">
            <span v-if="form.slug" class="doc-slug-tag">/blog/{{ form.slug }}</span>
            <span class="doc-sep" />
          </div>

          <!-- TipTap editor -->
          <EditorContent :editor="editor" class="doc-content" />
        </div>

        <!-- Bottom stats bar -->
        <div class="editor-statusbar">
          <span>{{ wordCount }} 字</span>
          <span class="bar-sep">·</span>
          <span>约 {{ readTime }} 分钟阅读</span>
          <span v-if="lastSaved" class="bar-sep">·</span>
          <span v-if="lastSaved" class="bar-saved">已自动保存 {{ lastSaved }}</span>
        </div>
      </div>

      <!-- Right meta panel -->
      <aside class="meta-panel">

        <!-- Cover -->
        <div class="meta-block">
          <p class="meta-label">封面图</p>
          <div class="cover-zone" :class="{ filled: form.cover }"
            @click="coverInput?.click()" @dragover.prevent @drop.prevent="onCoverDrop">
            <img v-if="form.cover" :src="form.cover" class="cover-img" alt="" />
            <div v-else class="cover-empty">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="2" width="18" height="18" rx="4"/>
                <circle cx="7.5" cy="7.5" r="1.5"/>
                <path d="M2 14l5-5 3.5 3.5L14 9l6 6"/>
              </svg>
              <span>点击或拖拽上传</span>
              <small>推荐 1200 × 630 px</small>
            </div>
            <button v-if="form.cover" class="cover-remove" @click.stop="form.cover = ''">
              <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M1 1l8 8M9 1L1 9"/>
              </svg>
            </button>
          </div>
          <input v-model="form.cover" placeholder="或输入图片 URL" class="meta-input mt-2" />
          <input ref="coverInput" type="file" accept="image/*" class="hidden" @change="onCoverFile" />
        </div>

        <!-- Slug -->
        <div class="meta-block">
          <p class="meta-label">Slug（URL 路径）</p>
          <div class="slug-row">
            <span class="slug-prefix">/blog/</span>
            <input v-model="form.slug" class="meta-input slug-input"
              placeholder="url-friendly-slug" @input="slugEdited = true" />
          </div>
        </div>

        <!-- Excerpt -->
        <div class="meta-block">
          <p class="meta-label">摘要</p>
          <textarea v-model="form.excerpt" class="meta-input meta-textarea"
            placeholder="一句话描述，显示在文章列表卡片上"
            rows="4" maxlength="200" />
          <p class="meta-count">{{ form.excerpt.length }} / 200</p>
        </div>

        <!-- Actions mobile fallback -->
        <div class="meta-actions-mobile">
          <button class="btn-ghost w-full" :disabled="saving === 'draft'" @click="save('draft')">保存草稿</button>
          <button class="btn-primary w-full" :disabled="!!saving" @click="save('published')">
            {{ form.status === 'published' ? '更新发布' : '发布文章' }}
          </button>
        </div>

      </aside>
    </div><!-- /body -->

  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick, h } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import { default as StarterKit } from '@tiptap/starter-kit'
import { Image } from '@tiptap/extension-image'
import { TextAlign } from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Highlight } from '@tiptap/extension-highlight'
import { Underline } from '@tiptap/extension-underline'
import { Link } from '@tiptap/extension-link'
import { Placeholder } from '@tiptap/extension-placeholder'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { ImageResize } from 'tiptap-extension-resize-image'
import { adminApi } from '@/api/admin'
import { normalizePastedHTML } from '@/utils/pasteNormalizer'
import { Embed } from '@/utils/tiptapEmbed'
import { toEmbedURL } from '@/utils/embedHosts'

// ── Inline icon components ────────────────────────────────────────────────────
const AlignLeftIcon = {
  render: () => h('svg', { width: 14, height: 14, viewBox: '0 0 14 14', fill: 'currentColor' },
    [h('path', { d: 'M1 2h12v1.5H1V2zm0 3h8v1.5H1V5zm0 3h12v1.5H1V8zm0 3h8v1.5H1V11z', opacity: '.8' })])
}
const AlignCenterIcon = {
  render: () => h('svg', { width: 14, height: 14, viewBox: '0 0 14 14', fill: 'currentColor' },
    [h('path', { d: 'M1 2h12v1.5H1V2zm2 3h8v1.5H3V5zm-2 3h12v1.5H1V8zm2 3h8v1.5H3V11z', opacity: '.8' })])
}
const AlignRightIcon = {
  render: () => h('svg', { width: 14, height: 14, viewBox: '0 0 14 14', fill: 'currentColor' },
    [h('path', { d: 'M1 2h12v1.5H1V2zm4 3h8v1.5H5V5zm-4 3h12v1.5H1V8zm4 3h8v1.5H5V11z', opacity: '.8' })])
}

// ── Props / router ────────────────────────────────────────────────────────────
const props = defineProps({ id: { type: String, default: null } })
const router = useRouter()

const saving = ref(null)
const loading = ref(false)
const slugEdited = ref(false)
const lastSaved = ref('')
const coverInput = ref(null)
const imageInput = ref(null)
const titleRef = ref(null)

const form = reactive({
  title: '',
  slug: '',
  cover: '',
  excerpt: '',
  content: '',
  status: 'draft',
})

// ── TipTap ────────────────────────────────────────────────────────────────────
const editor = useEditor({
  extensions: [
    StarterKit.configure({ image: false }),
    ImageResize.configure({ allowBase64: true }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    Underline,
    Link.configure({ openOnClick: false }),
    Placeholder.configure({ placeholder: '在此撰写正文内容…' }),
    // resizable: true lets editors drag table column widths inline.
    Table.configure({ resizable: true, HTMLAttributes: { class: 'tt-table' } }),
    TableRow,
    TableHeader,
    TableCell,
    // Embed: YouTube / Bilibili iframes — see embedHosts.js for allowlist.
    Embed,
  ],
  content: '',
  // Normalize external clipboard HTML before TipTap parses it: convert
  // <picture> / <figure> / srcset into shapes our schema preserves, and
  // strip <script>/<style>/event handlers defensively.
  editorProps: {
    transformPastedHTML(html) {
      return normalizePastedHTML(html)
    },
  },
  onUpdate({ editor }) {
    form.content = editor.getHTML()
  },
})

// ── Table helpers ─────────────────────────────────────────────────────────────
const insertTable = () =>
  editor.value?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
const addColumnAfter = () => editor.value?.chain().focus().addColumnAfter().run()
const addRowAfter = () => editor.value?.chain().focus().addRowAfter().run()
const deleteColumn = () => editor.value?.chain().focus().deleteColumn().run()
const deleteRow = () => editor.value?.chain().focus().deleteRow().run()
const deleteTable = () => editor.value?.chain().focus().deleteTable().run()
const inTable = computed(() => editor.value?.isActive('table') ?? false)

const activeColor = computed(() => editor.value?.getAttributes('textStyle').color || '#e2e8f0')
const activeBg = computed(() => editor.value?.getAttributes('highlight').color || 'transparent')
const setColor = (c) => editor.value?.chain().focus().setColor(c).run()
const setBg = (c) => editor.value?.chain().focus().toggleHighlight({ color: c }).run()

const setHeading = (level) => {
  if (level === 0) editor.value?.chain().focus().setParagraph().run()
  else editor.value?.chain().focus().toggleHeading({ level }).run()
}

const setLink = () => {
  const prev = editor.value?.getAttributes('link').href
  const url = window.prompt('输入链接 URL', prev ?? 'https://')
  if (!url) { editor.value?.chain().focus().unsetLink().run(); return }
  editor.value?.chain().focus().setLink({ href: url }).run()
}

// ── Image upload ──────────────────────────────────────────────────────────────
const triggerImageUpload = () => imageInput.value?.click()

const onImageFile = (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 10 * 1024 * 1024) { ElMessage.warning('图片不能超过 10MB'); return }
  const reader = new FileReader()
  reader.onload = (ev) => editor.value?.chain().focus().setImage({ src: ev.target.result }).run()
  reader.readAsDataURL(file)
  e.target.value = ''
}

// ── Embed (YouTube / Bilibili) ───────────────────────────────────────────────
const insertEmbed = () => {
  const url = window.prompt('粘贴 YouTube 或 Bilibili 视频链接')
  if (!url) return
  const embed = toEmbedURL(url.trim())
  if (!embed) {
    ElMessage.warning('暂只支持 YouTube / Bilibili 链接')
    return
  }
  editor.value?.chain().focus().setEmbed({ src: embed }).run()
}

// ── Cover ─────────────────────────────────────────────────────────────────────
// Use base64 inline only — server FILE_STORE_PATH not configured, avoid 501 error toast
const processCoverFile = (file) => {
  if (!file?.type.startsWith('image/')) return
  if (file.size > 5 * 1024 * 1024) { ElMessage.error('封面图不能超过 5MB'); return }
  const reader = new FileReader()
  reader.onload = (ev) => { form.cover = ev.target.result }
  reader.readAsDataURL(file)
}
const onCoverFile = (e) => processCoverFile(e.target.files?.[0])
const onCoverDrop = (e) => processCoverFile(e.dataTransfer.files?.[0])

// ── Stats ─────────────────────────────────────────────────────────────────────
const wordCount = computed(() =>
  form.content.replace(/<[^>]*>/g, '').replace(/\s+/g, '').length || 0
)
const readTime = computed(() => Math.max(1, Math.ceil(wordCount.value / 400)))

// ── Slug ──────────────────────────────────────────────────────────────────────
const toSlug = (t) =>
  t.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)

watch(() => form.title, (t) => {
  if (!slugEdited.value) form.slug = toSlug(t)
  autoResizeTitle()
})

const autoResizeTitle = () => {
  const el = titleRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

// ── Persist ───────────────────────────────────────────────────────────────────
const loadPost = async () => {
  loading.value = true
  try {
    const res = await adminApi.postDetail(props.id)
    const post = res.data ?? res
    Object.assign(form, {
      title: post.title ?? '',
      slug: post.slug ?? '',
      cover: post.cover ?? '',
      excerpt: post.excerpt ?? '',
      content: post.content ?? '',
      status: post.status ?? 'draft',
    })
    editor.value?.commands.setContent(form.content)
    slugEdited.value = true
    await nextTick(); autoResizeTitle()
  } catch { ElMessage.error('加载文章失败') } finally {
    loading.value = false
  }
}

const save = async (status) => {
  if (!form.title.trim()) { ElMessage.warning('请输入文章标题'); titleRef.value?.focus(); return }
  saving.value = status
  const payload = { ...form, status, slug: form.slug || toSlug(form.title) }
  try {
    if (props.id) {
      await adminApi.updatePost(props.id, payload)
    } else {
      const res = await adminApi.createPost(payload)
      const newId = res.data?.id ?? res.id
      if (newId) router.replace(`/blog/${newId}/edit`)
    }
    form.status = status
    const now = new Date()
    lastSaved.value = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`
    ElMessage.success(status === 'published' ? '已发布' : '草稿已保存')
  } catch { } finally { saving.value = null }
}

onMounted(() => {
  if (props.id) loadPost()
  nextTick(autoResizeTitle)
})
onBeforeUnmount(() => editor.value?.destroy())
</script>

<style scoped>
/* ── Shell ───────────────────────────────────────────────────────────────── */
.editor-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: #0d1117;
  color: #e2e8f0;
  font-family: -apple-system, 'Inter', sans-serif;
}

/* ── Topbar ──────────────────────────────────────────────────────────────── */
.editor-topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px;
  height: 52px;
  flex-shrink: 0;
  background: #0d1117;
  border-bottom: 1px solid rgba(255,255,255,.06);
  position: relative;
  z-index: 20;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 7px;
  border: 1px solid rgba(255,255,255,.08);
  background: transparent;
  color: #64748b;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all .15s;
}
.back-btn:hover { color: #94a3b8; border-color: rgba(255,255,255,.14); background: rgba(255,255,255,.04); }

.topbar-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 40%;
  overflow: hidden;
}
.topbar-title {
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot-live { background: #22c55e; box-shadow: 0 0 6px rgba(34,197,94,.5); }
.dot-draft { background: #475569; }
.status-label { font-size: 11px; color: #475569; white-space: nowrap; }

.topbar-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,.1);
  background: transparent;
  color: #94a3b8;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all .15s;
}
.btn-ghost:hover:not(:disabled) { background: rgba(255,255,255,.05); color: #e2e8f0; }
.btn-ghost:disabled { opacity: .45; cursor: not-allowed; }
.btn-ghost.w-full { width: 100%; justify-content: center; }

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  border-radius: 8px;
  border: none;
  background: #4f46e5;
  color: #fff;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background .15s;
}
.btn-primary:hover:not(:disabled) { background: #4338ca; }
.btn-primary:disabled { opacity: .45; cursor: not-allowed; }
.btn-primary.w-full { width: 100%; justify-content: center; }

.spin {
  width: 12px;
  height: 12px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin .6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Body ────────────────────────────────────────────────────────────────── */
.editor-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ── Main editor ─────────────────────────────────────────────────────────── */
.editor-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Toolbar ─────────────────────────────────────────────────────────────── */
.tiptap-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-wrap: wrap;
  padding: 6px 16px;
  background: #111827;
  border-bottom: 1px solid rgba(255,255,255,.06);
  flex-shrink: 0;
  row-gap: 4px;
}

.tb-group { display: flex; align-items: center; gap: 1px; }
.tb-divider { width: 1px; height: 20px; background: rgba(255,255,255,.07); margin: 0 5px; flex-shrink: 0; }

.tb-select {
  height: 30px;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 500;
  background: rgba(255,255,255,.04);
  color: #94a3b8;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 7px;
  outline: none;
  cursor: pointer;
  transition: border-color .15s;
  appearance: none;
  -webkit-appearance: none;
  padding-right: 22px;
  background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2364748b' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 7px center;
}
.tb-select:hover { border-color: rgba(255,255,255,.14); }
.tb-select option { background: #1e293b; }

.tb-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 30px;
  height: 30px;
  padding: 0 7px;
  border-radius: 7px;
  border: 1px solid transparent;
  background: transparent;
  color: #64748b;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all .12s;
}
.tb-btn:hover { background: rgba(255,255,255,.05); color: #94a3b8; border-color: rgba(255,255,255,.07); }
.tb-btn.on { background: rgba(99,102,241,.15); color: #818cf8; border-color: rgba(99,102,241,.25); }
.tb-italic i { font-style: italic; }
.tb-sm { min-width: 24px; font-size: 11px; color: #334155; }
.tb-text { font-size: 11.5px; gap: 3px; }

/* Color pickers */
.tb-color-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  height: 30px;
  border-radius: 7px;
  cursor: pointer;
  transition: background .12s;
}
.tb-color-btn:hover { background: rgba(255,255,255,.05); }
.tb-color-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 5px;
  font-size: 13px;
  font-weight: 800;
  color: #94a3b8;
  pointer-events: none;
}
.tb-bg-preview { font-size: 11px; border: 1px solid rgba(255,255,255,.08); }
.tb-color-btn input[type="color"] {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
  border: none;
}

/* ── Document area ───────────────────────────────────────────────────────── */
.doc-area {
  flex: 1;
  overflow-y: auto;
  padding: 48px clamp(20px, 8vw, 80px) 120px;
  max-width: 860px;
  margin: 0 auto;
  width: 100%;
}

.doc-title-input {
  display: block;
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  overflow: hidden;
  font-size: clamp(1.6rem, 3.5vw, 2.25rem);
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: #f1f5f9;
  caret-color: #818cf8;
  padding: 0;
  margin-bottom: 16px;
}
.doc-title-input::placeholder { color: #3d4f68; }

.doc-meta-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 28px;
}
.doc-slug-tag {
  font-size: 11.5px;
  color:4a6080;
  font-family: 'JetBrains Mono', monospace;
  flex-shrink: 0;
}
.doc-sep {
  flex: 1;
  height: 1px;
  background: rgba(255,255,255,.08);
}

/* TipTap prose */
.doc-content :deep(.ProseMirror) {
  outline: none;
  min-height: 320px;
  color: #94a3b8;
  font-size: 15.5px;
  line-height: 1.85;
  caret-color: #818cf8;
}
.doc-content :deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  color: #3d4f68;
  pointer-events: none;
  float: left;
  height: 0;
}
.doc-content :deep(.ProseMirror h1) { font-size: 1.875rem; font-weight: 800; color: #f1f5f9; letter-spacing: -.02em; margin: 2rem 0 .75rem; line-height: 1.2; }
.doc-content :deep(.ProseMirror h2) { font-size: 1.35rem; font-weight: 700; color: #e2e8f0; margin: 1.75rem 0 .6rem; padding-bottom: .5rem; border-bottom: 1px solid rgba(255,255,255,.06); }
.doc-content :deep(.ProseMirror h3) { font-size: 1.1rem; font-weight: 700; color: #e2e8f0; margin: 1.5rem 0 .5rem; }
.doc-content :deep(.ProseMirror p) { margin: .7rem 0; }
.doc-content :deep(.ProseMirror a) { color: #818cf8; text-decoration: underline; text-underline-offset: 3px; }
.doc-content :deep(.ProseMirror strong) { color: #e2e8f0; font-weight: 700; }
.doc-content :deep(.ProseMirror em) { font-style: italic; }
.doc-content :deep(.ProseMirror s) { text-decoration: line-through; opacity: .6; }
.doc-content :deep(.ProseMirror ul) { list-style: disc; padding-left: 1.5rem; margin: .7rem 0; }
.doc-content :deep(.ProseMirror ol) { list-style: decimal; padding-left: 1.5rem; margin: .7rem 0; }
.doc-content :deep(.ProseMirror li) { margin: .25rem 0; }
.doc-content :deep(.ProseMirror blockquote) {
  border-left: 3px solid #4f46e5; padding: .3rem 0 .3rem 1rem;
  margin: 1rem 0; color: #64748b; font-style: italic;
}
.doc-content :deep(.ProseMirror code) {
  background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.08);
  border-radius: 4px; padding: 2px 6px; font-size: .84em; color: #a5b4fc;
  font-family: 'JetBrains Mono', monospace;
}
.doc-content :deep(.ProseMirror pre) {
  background: #060d18; border: 1px solid rgba(255,255,255,.07);
  border-radius: 10px; padding: 1.1rem 1.4rem; overflow-x: auto; margin: 1.2rem 0;
}
.doc-content :deep(.ProseMirror pre code) {
  background: none; border: none; padding: 0;
  color: #e2e8f0; font-size: .875rem; line-height: 1.75;
}
.doc-content :deep(.ProseMirror img) {
  max-width: 100%; border-radius: 8px; margin: .75rem 0;
  border: 1px solid rgba(255,255,255,.06);
}
.doc-content :deep(.ProseMirror hr) {
  border: none; border-top: 1px solid rgba(255,255,255,.07); margin: 2rem 0;
}
.doc-content :deep(.ProseMirror-selectednode img) { outline: 2px solid #4f46e5; border-radius: 8px; }

/* Tables (Tiptap @extension-table) ------------------------------------------- */
.doc-content :deep(.ProseMirror table) {
  border-collapse: collapse;
  margin: 1rem 0;
  table-layout: fixed;
  width: 100%;
  overflow: hidden;
}
.doc-content :deep(.ProseMirror th),
.doc-content :deep(.ProseMirror td) {
  border: 1px solid rgba(255,255,255,.12);
  padding: 8px 12px;
  vertical-align: top;
  box-sizing: border-box;
  position: relative;
  min-width: 80px;
}
.doc-content :deep(.ProseMirror th) {
  background: rgba(99,102,241,.08);
  color: #e2e8f0;
  font-weight: 700;
  text-align: left;
}
.doc-content :deep(.ProseMirror .selectedCell:after) {
  z-index: 2;
  position: absolute;
  content: "";
  inset: 0;
  background: rgba(99,102,241,.15);
  pointer-events: none;
}
.doc-content :deep(.ProseMirror .column-resize-handle) {
  position: absolute;
  right: -2px; top: 0; bottom: -2px;
  width: 4px;
  background-color: #6366f1;
  pointer-events: none;
}
.doc-content :deep(.ProseMirror.resize-cursor) { cursor: ew-resize; }

/* Pasted captions surfaced from <figure><figcaption> --------------------------- */
.doc-content :deep(.ProseMirror .image-caption) {
  margin-top: -0.25rem;
  margin-bottom: 1rem;
  font-size: 0.85rem;
  color: #64748b;
  text-align: center;
  font-style: italic;
}

/* Embed node ------------------------------------------------------------------ */
.doc-content :deep(.ProseMirror .embed-wrapper) {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  margin: 1rem 0;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.08);
  background: #0a0f1a;
}
.doc-content :deep(.ProseMirror .embed-wrapper iframe) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}
.doc-content :deep(.ProseMirror-selectednode.embed-wrapper),
.doc-content :deep(.ProseMirror .embed-wrapper.ProseMirror-selectednode) {
  outline: 2px solid #4f46e5;
}

/* Status bar */
.editor-statusbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px clamp(20px, 8vw, 80px);
  font-size: 11.5px;
  color:4a6080;
  border-top: 1px solid rgba(255,255,255,.06);
  background: #0d1117;
}
.bar-sep { color: #2d3f5a; }
.bar-saved { color: #22c55e; }

/* ── Right meta panel ────────────────────────────────────────────────────── */
.meta-panel {
  width: 248px;
  flex-shrink: 0;
  overflow-y: auto;
  padding: 24px 16px;
  border-left: 1px solid rgba(255,255,255,.05);
  background: #0d1117;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.meta-block { display: flex; flex-direction: column; gap: 7px; }
.meta-label {
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .06em;
  color:4a6080;
}

.meta-input {
  width: 100%;
  background: rgba(255,255,255,.03);
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 8px;
  padding: 7px 10px;
  font-size: 12.5px;
  color: #94a3b8;
  outline: none;
  transition: border-color .15s;
  box-sizing: border-box;
  font-family: inherit;
}
.meta-input:focus { border-color: rgba(99,102,241,.4); background: rgba(99,102,241,.04); }
.meta-input::placeholder { color: #3d4f68; }
.mt-2 { margin-top: 4px; }

.meta-textarea { resize: vertical; min-height: 80px; line-height: 1.6; }
.meta-count { font-size: 10.5px; color:4a6080; text-align: right; }

/* Cover zone */
.cover-zone {
  width: 100%;
  aspect-ratio: 1200/630;
  border: 1.5px dashed rgba(255,255,255,.08);
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  background: rgba(255,255,255,.02);
  transition: border-color .15s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cover-zone:hover { border-color: rgba(99,102,241,.35); }
.cover-zone.filled { border-style: solid; border-color: rgba(255,255,255,.06); }
.cover-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cover-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  color:4a6080;
  font-size: 11px;
  text-align: center;
  padding: 12px;
}
.cover-empty svg { color: #3d4f68; }
.cover-empty small { color: #3d4f68; font-size: 10px; }
.cover-remove {
  position: absolute;
  top: 6px; right: 6px;
  width: 22px; height: 22px;
  border-radius: 50%;
  background: rgba(0,0,0,.7);
  border: 1px solid rgba(255,255,255,.12);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #94a3b8;
  transition: background .12s;
}
.cover-remove:hover { background: rgba(0,0,0,.9); }

/* Slug */
.slug-row { display: flex; align-items: center; gap: 0; }
.slug-prefix {
  display: inline-flex;
  align-items: center;
  padding: 7px 8px 7px 10px;
  border: 1px solid rgba(255,255,255,.07);
  border-right: none;
  border-radius: 8px 0 0 8px;
  font-size: 11.5px;
  color:4a6080;
  font-family: 'JetBrains Mono', monospace;
  background: rgba(255,255,255,.02);
  white-space: nowrap;
  flex-shrink: 0;
}
.slug-input {
  border-radius: 0 8px 8px 0 !important;
  flex: 1;
  min-width: 0;
}

/* Mobile meta actions */
.meta-actions-mobile { display: none; flex-direction: column; gap: 8px; margin-top: 8px; }

.hidden { display: none; }

/* ── Responsive ──────────────────────────────────────────────────────────── */
@media (max-width: 900px) {
  .meta-panel { display: none; }
  .doc-area { padding: 28px 20px 80px; }
  .meta-actions-mobile { display: flex; }
  .topbar-center { display: none; }
}
</style>
