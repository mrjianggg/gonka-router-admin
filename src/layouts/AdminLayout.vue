<template>
  <div class="layout">
    <!-- Sidebar (desktop) / Drawer body (mobile) -->
    <aside class="sidebar" :class="{ 'is-open': drawerOpen }">
      <div class="brand">
        <div class="brand-logo">G</div>
        <div class="brand-text">
          <div class="title">Gonka Router</div>
          <div class="sub">Admin Console</div>
        </div>
      </div>

      <el-menu
        :default-active="active"
        router
        class="menu"
        background-color="transparent"
        text-color="#cbd5e1"
        active-text-color="#fff"
        @select="closeDrawer"
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataLine /></el-icon><span>Dashboard</span>
        </el-menu-item>
        <el-menu-item index="/users">
          <el-icon><User /></el-icon><span>用户管理</span>
        </el-menu-item>
        <el-menu-item index="/requests">
          <el-icon><Document /></el-icon><span>请求追溯</span>
        </el-menu-item>
      </el-menu>

      <div class="sidebar-footer">
        <div class="footer-dot" /> 在线
      </div>
    </aside>

    <!-- Mobile drawer scrim -->
    <div
      v-show="drawerOpen"
      class="scrim"
      @click="closeDrawer"
      aria-hidden="true"
    />

    <!-- Main column -->
    <div class="main-col">
      <header class="topbar">
        <button
          class="hamburger"
          type="button"
          aria-label="展开菜单"
          @click="drawerOpen = !drawerOpen"
        >
          <span /><span /><span />
        </button>

        <div class="crumbs">
          <span class="crumb-title">{{ pageTitle }}</span>
        </div>

        <el-dropdown @command="onCommand" trigger="click">
          <span class="user">
            <el-avatar :size="30" class="user-avatar">{{ initial }}</el-avatar>
            <span class="user-name hide-mobile">{{ auth.username || 'admin' }}</span>
            <el-icon class="hide-mobile"><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="logout">
                <el-icon><SwitchButton /></el-icon>
                退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </header>

      <main class="main">
        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DataLine, User, Document, ArrowDown, SwitchButton } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const drawerOpen = ref(false)

const active = computed(() => {
  if (route.path.startsWith('/users')) return '/users'
  if (route.path.startsWith('/requests')) return '/requests'
  return route.path
})

const pageTitle = computed(() => {
  if (route.name === 'dashboard') return '概览'
  if (route.name === 'users') return '用户管理'
  if (route.name === 'user-detail') return '用户详情'
  if (route.name === 'requests') return '请求追溯'
  return ''
})

const initial = computed(() => (auth.username || 'A').slice(0, 1).toUpperCase())

function onCommand(cmd) {
  if (cmd === 'logout') {
    auth.logout()
    router.replace('/login')
  }
}

function closeDrawer() {
  if (drawerOpen.value) drawerOpen.value = false
}

watch(() => route.fullPath, closeDrawer)

function onKey(e) {
  if (e.key === 'Escape') closeDrawer()
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
  background: var(--color-bg);
}

/* ===== Sidebar ===== */
.sidebar {
  flex-shrink: 0;
  width: 232px;
  background:
    radial-gradient(80% 60% at 20% 0%, rgba(37, 99, 235, 0.18), transparent 60%),
    linear-gradient(180deg, #0b1226 0%, #111c36 50%, #0f172a 100%);
  color: #cbd5e1;
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
  border-right: 1px solid rgba(255, 255, 255, 0.04);
  z-index: 20;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.brand-logo {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--gradient-brand);
  color: #fff;
  font-weight: 700;
  font-size: 18px;
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
}

.brand-text .title {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.01em;
}
.brand-text .sub {
  font-size: 10px;
  color: #94a3b8;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

.menu {
  border-right: none;
  padding: 12px 0;
  background: transparent;
  flex: 1;
  overflow-y: auto;
}
.menu :deep(.el-menu-item) {
  height: 44px;
  line-height: 44px;
  margin: 4px 12px;
  border-radius: 10px;
  font-size: 13.5px;
  font-weight: 500;
  transition: background var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out);
}
.menu :deep(.el-menu-item .el-icon) {
  font-size: 17px;
  margin-right: 8px;
}
.menu :deep(.el-menu-item.is-active) {
  background: linear-gradient(90deg, rgba(37, 99, 235, 0.32), rgba(6, 182, 212, 0.12));
  color: #fff !important;
  box-shadow: inset 2px 0 0 #3b82f6;
}
.menu :deep(.el-menu-item:hover) {
  background: rgba(255, 255, 255, 0.06);
  transform: translateX(2px);
}

.sidebar-footer {
  padding: 14px 20px;
  font-size: 11px;
  color: #94a3b8;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  gap: 8px;
  letter-spacing: 0.5px;
}
.footer-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-emerald-500);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2); }
  50%      { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0.08); }
}

/* ===== Main column ===== */
.main-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgba(255, 255, 255, 0.78);
  -webkit-backdrop-filter: saturate(180%) blur(12px);
  backdrop-filter: saturate(180%) blur(12px);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 24px;
  height: var(--topbar-height);
}

.hamburger {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 38px;
  height: 38px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: 10px;
  cursor: pointer;
  padding: 0;
  transition: all var(--duration-fast) var(--ease-out);
}
.hamburger:hover { border-color: var(--color-brand-500); }
.hamburger:active { transform: scale(0.96); }
.hamburger span {
  display: block;
  height: 2px;
  width: 18px;
  margin: 0 auto;
  background: var(--color-text-soft);
  border-radius: 2px;
}

.crumbs { flex: 1; min-width: 0; }
.crumb-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  letter-spacing: -0.01em;
}

.user {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  color: var(--color-text);
  padding: 6px 10px;
  border-radius: 999px;
  transition: background var(--duration-fast) var(--ease-out);
}
.user:hover { background: var(--color-bg-soft); }
.user-avatar {
  background: var(--gradient-brand) !important;
  color: #fff !important;
  font-weight: 600 !important;
  font-size: 13px !important;
}
.user-name { font-size: 13px; font-weight: 500; }

.main {
  flex: 1;
  background: var(--color-bg);
  padding: 0;
  min-width: 0;
}

/* ===== Page transitions ===== */
.page-enter-active,
.page-leave-active {
  transition: opacity var(--duration-normal) var(--ease-out),
              transform var(--duration-normal) var(--ease-out);
}
.page-enter-from { opacity: 0; transform: translateY(8px); }
.page-leave-to   { opacity: 0; transform: translateY(-4px); }

/* ===== Mobile drawer ===== */
.scrim {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  -webkit-backdrop-filter: blur(2px);
  backdrop-filter: blur(2px);
  z-index: 18;
  animation: fade-in var(--duration-fast) var(--ease-out);
}
@keyframes fade-in {
  from { opacity: 0; } to { opacity: 1; }
}

@media (max-width: 768px) {
  .layout { display: block; }

  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    width: 260px;
    transform: translateX(-100%);
    transition: transform var(--duration-normal) var(--ease-out);
    box-shadow: 8px 0 24px rgba(15, 23, 42, 0.25);
  }
  .sidebar.is-open { transform: translateX(0); }

  .hamburger { display: flex; }

  .topbar { padding: 0 14px; gap: 10px; }
  .crumb-title { font-size: 14px; }
  .user { padding: 4px; }
}
</style>
