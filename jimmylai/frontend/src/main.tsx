import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

console.log('🚀 Jimmy Lai app initializing...')
console.log('Current URL:', window.location.href)

const root = document.getElementById('root') as HTMLElement
if (!root) {
  console.error('❌ Root element not found!')
} else {
  console.log('✅ Root element found, mounting React app...')
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
  console.log('✅ React app mounted')
}

