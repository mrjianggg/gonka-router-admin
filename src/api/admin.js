import http from './client'

// Normalises the reporting window accepted by the stats endpoints.
//
// Callers may pass either a trailing day count (the original signature) or an
// explicit { from, to } pair of YYYY-MM-DD strings. Keeping the number form
// working means existing call sites are unaffected by the range picker.
function statsRangeParams(range, fallbackDays) {
  if (typeof range === 'number') return { days: range }
  if (range && range.from && range.to) return { from: range.from, to: range.to }
  return { days: fallbackDays }
}

export const adminApi = {
  login(username, password) {
    return http.post('/admin/login', { username, password })
  },
  overview() {
    return http.get('/admin/stats/overview')
  },
  daily(range = 14) {
    return http.get('/admin/stats/daily', { params: statsRangeParams(range, 14) })
  },
  models(range = 30) {
    return http.get('/admin/stats/models', { params: statsRangeParams(range, 30) })
  },
  quality(windowHours = 24) {
    return http.get('/admin/stats/quality', { params: { window_hours: windowHours } })
  },
  users({ page = 1, pageSize = 20, q = '', source = '' } = {}) {
    const params = { page, page_size: pageSize, q }
    if (source) params.source = source
    return http.get('/admin/users', { params })
  },
  userDetail(id) {
    return http.get(`/admin/users/${id}`)
  },
  requests({ page = 1, pageSize = 20, userId, xRequestId, xDevshardId, model, outcome, from, to } = {}) {
    const params = { page, page_size: pageSize }
    if (userId) params.user_id = userId
    if (xRequestId) params.x_request_id = xRequestId
    if (xDevshardId) params.x_devshard_id = xDevshardId
    if (model) params.model = model
    if (outcome) params.outcome = outcome
    if (from) params.from = from
    if (to) params.to = to
    return http.get('/admin/requests', { params })
  },
  requestDetail(id) {
    return http.get(`/admin/requests/${id}`)
  },

  // ── Blog ─────────────────────────────────────────────────────────────────
  posts({ page = 1, pageSize = 20, status = '' } = {}) {
    const params = { page, page_size: pageSize }
    if (status) params.status = status
    return http.get('/admin/posts', { params })
  },
  postDetail(id) {
    return http.get(`/admin/posts/${id}`)
  },
  createPost(data) {
    return http.post('/admin/posts', data)
  },
  updatePost(id, data) {
    return http.put(`/admin/posts/${id}`, data)
  },
  deletePost(id) {
    return http.delete(`/admin/posts/${id}`)
  },
  publishPost(id) {
    return http.post(`/admin/posts/${id}/publish`)
  },
  unpublishPost(id) {
    return http.post(`/admin/posts/${id}/unpublish`)
  },
  uploadPostCover(formData) {
    return http.post('/admin/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  // ── Feedback ─────────────────────────────────────────────────────────────
  feedbacks({ page = 1, pageSize = 20, status = '' } = {}) {
    const params = { page, page_size: pageSize }
    if (status) params.status = status
    return http.get('/admin/feedbacks', { params })
  },
  feedbackUnreadCount() {
    return http.get('/admin/feedback-unread-count')
  },
  markFeedbackRead(id) {
    return http.post(`/admin/feedbacks/${id}/read`)
  },
  markFeedbackUnread(id) {
    return http.post(`/admin/feedbacks/${id}/unread`)
  },
  deleteFeedback(id) {
    return http.delete(`/admin/feedbacks/${id}`)
  },
}
