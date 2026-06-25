import http from './client'

export const adminApi = {
  login(username, password) {
    return http.post('/admin/login', { username, password })
  },
  overview() {
    return http.get('/admin/stats/overview')
  },
  daily(days = 14) {
    return http.get('/admin/stats/daily', { params: { days } })
  },
  models(days = 30) {
    return http.get('/admin/stats/models', { params: { days } })
  },
  quality(windowHours = 24) {
    return http.get('/admin/stats/quality', { params: { window_hours: windowHours } })
  },
  users({ page = 1, pageSize = 20, q = '' } = {}) {
    return http.get('/admin/users', {
      params: { page, page_size: pageSize, q },
    })
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

  /**
   * Uploads an image or video to the post media backend. Used by the inline
   * blog editor (image button / video button). Returns { url, kind, mime,
   * size_bytes }. The caller may pass an axios onUploadProgress to show a
   * progress bar for large videos.
   */
  uploadMedia(file, { kind, onUploadProgress } = {}) {
    const fd = new FormData()
    fd.append('file', file)
    if (kind) fd.append('kind', kind)
    return http.post('/admin/upload/media', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      // Videos can be up to 100 MB; default axios timeout (15s in client.js)
      // is too short. Allow up to 5 minutes for upstream OSS to ingest.
      timeout: 5 * 60 * 1000,
      onUploadProgress,
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
