import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - attach token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor - auto refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const res = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
        const { accessToken } = res.data.data;
        localStorage.setItem('accessToken', accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ─────────────────────────────────────────────────────
export const authApi = {
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  register: (data: { name: string; email: string; password: string; role?: string }) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => api.post('/auth/reset-password', { token, password }),
  verifyEmail: (token: string) => api.get(`/auth/verify-email?token=${token}`),
};

// ── Users ────────────────────────────────────────────────────
export const usersApi = {
  list: (params?: Record<string, string>) => api.get('/users', { params }),
  getById: (id: string) => api.get(`/users/${id}`),
  update: (id: string, data: Record<string, unknown>) => api.put(`/users/${id}`, data),
  changePassword: (id: string, data: { currentPassword: string; newPassword: string }) =>
    api.post(`/users/${id}/change-password`, data),
  deactivate: (id: string) => api.delete(`/users/${id}`),
  departments: () => api.get('/users/departments/list'),
  createDepartment: (data: Record<string, string>) => api.post('/users/departments', data),
};

// ── Attendance ───────────────────────────────────────────────
export const attendanceApi = {
  checkIn: () => api.post('/attendance/checkin'),
  checkOut: () => api.post('/attendance/checkout'),
  today: () => api.get('/attendance/today'),
  myHistory: (params?: { month?: number; year?: number }) => api.get('/attendance/my', { params }),
  overview: (params?: { date?: string }) => api.get('/attendance/overview', { params }),
  userHistory: (userId: string, params?: { month?: number; year?: number }) =>
    api.get(`/attendance/user/${userId}`, { params }),
};

// ── Leaves ───────────────────────────────────────────────────
export const leavesApi = {
  apply: (data: Record<string, unknown>) => api.post('/leaves/apply', data),
  myLeaves: (params?: Record<string, string>) => api.get('/leaves/my', { params }),
  pending: () => api.get('/leaves/pending'),
  all: (params?: Record<string, string>) => api.get('/leaves/all', { params }),
  getRecommendation: (id: string) => api.get(`/leaves/${id}/recommendation`),
  updateStatus: (id: string, data: { status: string; rejectionReason?: string }) =>
    api.patch(`/leaves/${id}/status`, data),
  cancel: (id: string) => api.patch(`/leaves/${id}/cancel`),
};

// ── Payroll ──────────────────────────────────────────────────
export const payrollApi = {
  myPayslips: (params?: { year?: number }) => api.get('/payroll/my', { params }),
  getById: (id: string) => api.get(`/payroll/${id}`),
  allPayrolls: (params?: Record<string, string>) => api.get('/payroll/all/list', { params }),
  generate: (data: { month: number; year: number }) => api.post('/payroll/generate', data),
};

// ── Mood ─────────────────────────────────────────────────────
export const moodApi = {
  submit: (data: { mood: string; energyLevel?: number; stressLevel?: number; note?: string }) =>
    api.post('/mood', data),
  myMoods: (params?: { days?: number }) => api.get('/mood/my', { params }),
  teamWellness: () => api.get('/mood/team'),
};

// ── Notifications ────────────────────────────────────────────
export const notificationsApi = {
  list: (params?: Record<string, string>) => api.get('/notifications', { params }),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

// ── Analytics ────────────────────────────────────────────────
export const analyticsApi = {
  company: () => api.get('/analytics/company'),
  attendanceTrend: () => api.get('/analytics/attendance-trend'),
  departments: () => api.get('/analytics/departments'),
  employee: (userId: string, params?: { months?: number }) =>
    api.get(`/analytics/employee/${userId}`, { params }),
};

// ── AI ───────────────────────────────────────────────────────
export const aiApi = {
  chat: (data: {
    message: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  }) => api.post('/ai/chat', data),
};

// ── Recruitment ──────────────────────────────────────────────
export const recruitmentApi = {
  listJobs: (params?: Record<string, string>) => api.get('/recruitment', { params }),
  createJob: (data: Record<string, unknown>) => api.post('/recruitment', data),
  getJob: (id: string) => api.get(`/recruitment/${id}`),
  updateJob: (id: string, data: Record<string, unknown>) => api.patch(`/recruitment/${id}`, data),
  addCandidate: (jobId: string, data: FormData) =>
    api.post(`/recruitment/${jobId}/candidates`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateCandidateStatus: (jobId: string, candidateId: string, status: string) =>
    api.patch(`/recruitment/${jobId}/candidates/${candidateId}`, { status }),
  screenCandidate: (jobId: string, candidateId: string) =>
    api.post(`/recruitment/${jobId}/candidates/${candidateId}/screen`),
};

// ── Announcements ────────────────────────────────────────────
export const announcementsApi = {
  list: () => api.get('/announcements'),
  create: (data: { title: string; content: string; isPinned?: boolean }) =>
    api.post('/announcements', data),
  delete: (id: string) => api.delete(`/announcements/${id}`),
};
