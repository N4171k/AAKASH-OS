"use client"

import { useEffect } from 'react'

export default function LogoutOnClose() {
  useEffect(() => {
    const sendLogout = () => {
      try {
        const url = '/api/auth/logout'
        // navigator.sendBeacon is the most reliable during unload
        if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
          navigator.sendBeacon(url, '')
          return
        }

        // fallback to synchronous XHR (rarely allowed but works on many browsers)
        const xhr = new XMLHttpRequest()
        xhr.open('POST', url, false)
        xhr.setRequestHeader('Content-Type', 'application/json')
        try {
          xhr.send(null)
        } catch (e) {
          // ignore
        }
      } catch (e) {
        // swallow errors during unload
      }
    }

    window.addEventListener('beforeunload', sendLogout)
    window.addEventListener('pagehide', sendLogout)

    return () => {
      window.removeEventListener('beforeunload', sendLogout)
      window.removeEventListener('pagehide', sendLogout)
    }
  }, [])

  return null
}
