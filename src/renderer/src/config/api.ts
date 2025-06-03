import { Configuration, DefaultApi } from '@cherrystudio/api-sdk'
import axios from 'axios'

const config = new Configuration({
  // basePath: import.meta.env.VITE_API_BASE_URL,
  // basePath: 'https://api.abilixschool.com',
  basePath: '',
  accessToken: localStorage.getItem('auth_token') || ''
})

// Create axios instance with interceptor
const axiosInstance = axios.create()

// Add response interceptor to handle 401 unauthorized responses
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // if (error.response?.status === 401) {
    //   setTimeout(() => {
    //     window.location.href = '/login'
    //   }, 100)
    // }
    return Promise.reject(error)
  }
)

const api = new DefaultApi(config, undefined, axiosInstance as any)

export const updateApiToken = (token: string) => {
  config.accessToken = token
}

export const updateApiBasePath = (basePath: string) => {
  config.basePath = basePath
}

export default api
