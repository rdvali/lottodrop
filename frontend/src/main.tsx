import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Initialize performance monitoring
// Disabled for now - metrics endpoint not implemented yet
// if (import.meta.env.PROD) {
//   performanceMonitor.setReportEndpoint('/api/metrics')
// }

// Register service worker for PWA support
// Disabled for now - service worker not implemented yet
// registerServiceWorker({
//   onSuccess: () => {
//     // App is ready for offline use
//   },
//   onUpdate: (registration) => {
//     toast('New version available! Click to update.', {
//       duration: 0,
//       onClick: async () => {
//         if (registration.waiting) {
//           registration.waiting.postMessage({ type: 'SKIP_WAITING' })
//           window.location.reload()
//         }
//       }
//     })
//   },
//   onOffline: () => {
//     toast.error('You are offline. Some features may be limited.')
//   },
//   onOnline: () => {
//     toast.success('Back online!')
//   }
// })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
