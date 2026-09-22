import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Analytics beforeSend={event => /\/(login|signup|account|forgot-password|portal|privacy)(\/|$)/.test(new URL(event.url).pathname) ? null : event} />
  </StrictMode>,
)
