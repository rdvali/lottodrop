import axios from 'axios'

// Use relative URL for API to work with nginx proxy
const API_URL = import.meta.env.VITE_API_URL || '/api'

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token but don't reload the page
      localStorage.removeItem('token')
      localStorage.removeItem('user')

      // Dispatch a custom event for the auth context to handle
      window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: 'unauthorized' } }))
    }
    return Promise.reject(error)
  }
)