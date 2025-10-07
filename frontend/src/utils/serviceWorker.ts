// Service Worker Registration Utilities

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(
    /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
  )
)

type Config = {
  onSuccess?: (registration: ServiceWorkerRegistration) => void
  onUpdate?: (registration: ServiceWorkerRegistration) => void
  onOffline?: () => void
  onOnline?: () => void
}

function registerValidSW(swUrl: string, config?: Config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      registration.onupdatefound = () => {
        const installingWorker = registration.installing
        if (installingWorker == null) {
          return
        }
        
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New content is available; please refresh
              if (config?.onUpdate) {
                config.onUpdate(registration)
              }
            } else {
              // Content is cached for offline use
              if (config?.onSuccess) {
                config.onSuccess(registration)
              }
            }
          }
        }
      }
    })
    .catch((error) => {
      console.error('Error during service worker registration:', error)
    })
}

function checkValidServiceWorker(swUrl: string, config?: Config) {
  // Check if the service worker can be found
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' }
  })
    .then((response) => {
      // Ensure service worker exists, and that we really are getting a JS file
      const contentType = response.headers.get('content-type')
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        // No service worker found. Probably a different app. Reload the page
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload()
          })
        })
      } else {
        // Service worker found. Proceed as normal
        registerValidSW(swUrl, config)
      }
    })
    .catch(() => {
      if (config?.onOffline) {
        config.onOffline()
      }
    })
}

export function register(config?: Config) {
  if ('serviceWorker' in navigator) {
    // The URL constructor is available in all browsers that support SW
    const publicUrl = new URL(
      import.meta.env.BASE_URL,
      window.location.href
    )
    
    if (publicUrl.origin !== window.location.origin) {
      // Our service worker won't work if PUBLIC_URL is on a different origin
      return
    }

    window.addEventListener('load', () => {
      const swUrl = `${import.meta.env.BASE_URL}service-worker.js`

      if (isLocalhost) {
        // This is running on localhost. Check if a service worker still exists or not
        checkValidServiceWorker(swUrl, config)

      } else {
        // Is not localhost. Just register service worker
        registerValidSW(swUrl, config)
      }
    })

    // Listen for online/offline events
    window.addEventListener('online', () => {
      if (config?.onOnline) {
        config.onOnline()
      }
    })

    window.addEventListener('offline', () => {
      if (config?.onOffline) {
        config.onOffline()
      }
    })
  }
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister()
      })
      .catch((error) => {
        console.error(error.message)
      })
  }
}

// Helper to check for updates
export async function checkForUpdates() {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready
    await registration.update()
  }
}

// Helper to skip waiting and activate new service worker
export async function skipWaiting() {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      
      // Reload once the new service worker is active
      let refreshing = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return
        refreshing = true
        window.location.reload()
      })
    }
  }
}