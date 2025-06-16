import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Ensure the DOM is ready before rendering
const rootElement = document.getElementById('root')

// Wait for device ready event on mobile
document.addEventListener('DOMContentLoaded', () => {
  if (!rootElement) {
    console.error('Root element not found')
    return
  }
  
  console.log('DOM loaded, rendering app')
  const root = createRoot(rootElement)
  root.render(<App />)
})
