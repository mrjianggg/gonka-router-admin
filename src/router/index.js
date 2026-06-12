import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/Login.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/AdminLayout.vue'),
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'dashboard', component: () => import('@/views/Dashboard.vue') },
      { path: 'users', name: 'users', component: () => import('@/views/Users.vue') },
      { path: 'users/:id', name: 'user-detail', component: () => import('@/views/UserDetail.vue'), props: true },
      { path: 'requests', name: 'requests', component: () => import('@/views/RequestLogs.vue') },
      { path: 'blog', name: 'blog', component: () => import('@/views/BlogList.vue') },
      { path: 'blog/new', name: 'blog-new', component: () => import('@/views/BlogEditor.vue') },
      { path: 'blog/:id/edit', name: 'blog-edit', component: () => import('@/views/BlogEditor.vue'), props: true },
      { path: 'feedback', name: 'feedback', component: () => import('@/views/FeedbackList.vue') },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.public) {
    if (auth.isAuthenticated && to.name === 'login') return { name: 'dashboard' }
    return true
  }
  if (!auth.isAuthenticated) return { name: 'login', query: { next: to.fullPath } }
  return true
})

export default router
