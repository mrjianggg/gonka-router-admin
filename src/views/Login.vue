<template>
  <div class="login-page">
    <!-- Animated blobs -->
    <div class="blob blob-1" aria-hidden="true" />
    <div class="blob blob-2" aria-hidden="true" />
    <div class="blob blob-3" aria-hidden="true" />
    <div class="grid-overlay" aria-hidden="true" />

    <div class="login-card">
      <div class="brand">
        <div class="brand-logo">G</div>
        <div>
          <div class="brand-title">Gonka Router Admin</div>
          <div class="brand-sub">后台管理控制台</div>
        </div>
      </div>

      <div class="welcome">
        <h1>欢迎回来</h1>
        <p>请登录以管理 Gonka Router 服务</p>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        size="large"
        @submit.prevent="onSubmit"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" autocomplete="username" placeholder="admin">
            <template #prefix><el-icon><User /></el-icon></template>
          </el-input>
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            autocomplete="current-password"
            show-password
            placeholder="请输入密码"
            @keyup.enter="onSubmit"
          >
            <template #prefix><el-icon><Lock /></el-icon></template>
          </el-input>
        </el-form-item>
        <el-button
          type="primary"
          :loading="loading"
          class="submit-btn"
          @click="onSubmit"
        >
          {{ loading ? '登录中…' : '登 录' }}
        </el-button>
      </el-form>

      <div class="hint">
        默认账号 <code>admin</code> · 密码已通过 <code>.env</code> 配置
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const formRef = ref(null)
const loading = ref(false)
const form = reactive({ username: 'admin', password: '' })
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function onSubmit() {
  if (!formRef.value) return
  const ok = await formRef.value.validate().catch(() => false)
  if (!ok) return
  loading.value = true
  try {
    await auth.login(form.username, form.password)
    ElMessage.success('登录成功')
    const next = route.query.next || '/dashboard'
    router.replace(next)
  } catch (e) {
    // axios interceptor already shows the error
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  position: relative;
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  overflow: hidden;
  background:
    linear-gradient(135deg, #eef2ff 0%, #f5f7ff 40%, #f0fdfa 100%);
}

/* Floating gradient blobs */
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.55;
  pointer-events: none;
  z-index: 0;
}
.blob-1 {
  width: 480px;
  height: 480px;
  top: -120px;
  left: -120px;
  background: radial-gradient(circle, #6366f1 0%, transparent 70%);
  animation: drift 14s ease-in-out infinite;
}
.blob-2 {
  width: 420px;
  height: 420px;
  bottom: -120px;
  right: -80px;
  background: radial-gradient(circle, #06b6d4 0%, transparent 70%);
  animation: drift 18s ease-in-out infinite reverse;
}
.blob-3 {
  width: 320px;
  height: 320px;
  top: 50%;
  right: 30%;
  background: radial-gradient(circle, #ec4899 0%, transparent 70%);
  opacity: 0.32;
  animation: drift 22s ease-in-out infinite;
}
@keyframes drift {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33%      { transform: translate(40px, -30px) scale(1.08); }
  66%      { transform: translate(-30px, 40px) scale(0.94); }
}

.grid-overlay {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(15, 23, 42, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(15, 23, 42, 0.04) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: radial-gradient(ellipse at center, black, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse at center, black, transparent 75%);
  pointer-events: none;
  z-index: 0;
}

.login-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  background: rgba(255, 255, 255, 0.78);
  -webkit-backdrop-filter: saturate(180%) blur(18px);
  backdrop-filter: saturate(180%) blur(18px);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 20px;
  padding: 32px 32px 28px;
  box-shadow:
    0 30px 60px -20px rgba(15, 23, 42, 0.18),
    0 18px 36px -18px rgba(37, 99, 235, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
  animation: card-in var(--duration-slow) var(--ease-out) both;
}

@keyframes card-in {
  from { opacity: 0; transform: translateY(20px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 28px;
}

.brand-logo {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: var(--gradient-brand);
  color: #fff;
  font-weight: 700;
  font-size: 20px;
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.32);
}

.brand-title {
  font-weight: 700;
  font-size: 16px;
  letter-spacing: -0.01em;
  color: var(--color-text);
}

.brand-sub {
  font-size: 12px;
  color: var(--color-muted);
  margin-top: 2px;
}

.welcome { margin-bottom: 24px; }
.welcome h1 {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #0f172a, #2563eb);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.welcome p {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--color-muted);
}

.submit-btn {
  width: 100%;
  height: 44px;
  font-size: 14px;
  font-weight: 600 !important;
  letter-spacing: 0.05em;
  margin-top: 4px;
  border-radius: 10px !important;
}

.hint {
  margin-top: 20px;
  font-size: 12px;
  color: var(--color-muted);
  text-align: center;
}

.hint code {
  background: rgba(241, 245, 249, 0.8);
  padding: 1px 6px;
  border-radius: 4px;
  font-family: ui-monospace, monospace;
  font-size: 11px;
}

@media (max-width: 480px) {
  .login-page { padding: 16px; }
  .login-card { padding: 24px 20px 20px; border-radius: 16px; }
  .brand-logo { width: 40px; height: 40px; font-size: 18px; }
  .welcome h1 { font-size: 20px; }
}
</style>
