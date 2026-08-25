// Polyfill global for sockjs-client compatibility in browser environment
if (typeof window !== 'undefined' && !(window as any).global) {
  (window as any).global = window;
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import axios from 'axios'

// Set default axios base URL and configuration
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || ''
axios.defaults.headers.common['Content-Type'] = 'application/json'
axios.defaults.headers.common['Accept'] = 'application/json'
axios.defaults.withCredentials = true

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
