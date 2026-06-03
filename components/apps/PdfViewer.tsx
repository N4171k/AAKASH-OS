"use client"

import React, { useEffect, useMemo, useState } from 'react'

type ThemeMode = 'aakash' | 'paatal' | 'dharti' | 'antariksh'

type OpenFile = {
  id: string
  name: string
  cloudinary_url: string
  cloudinary_public_id?: string
  mime_type?: string
}

export default function PdfViewer({ theme: propTheme = 'aakash', sourceFile }: { theme?: ThemeMode; sourceFile?: OpenFile | null }) {
  const [theme, setTheme] = useState<ThemeMode>('aakash')
  const [pdfUrl, setPdfUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const effectiveTheme = propTheme ?? theme
  const isDark = effectiveTheme === 'paatal' || effectiveTheme === 'antariksh'

  useEffect(() => {
    if (!propTheme) {
      fetch('/api/me')
        .then((res) => res.json())
        .then((data) => {
          if (data?.preferences?.theme) setTheme(data.preferences.theme as ThemeMode)
        })
        .catch(() => {})
    }
  }, [propTheme])

  const title = sourceFile?.name || 'PDF Viewer'

  useEffect(() => {
    let cancelled = false

    const loadSignedUrl = async () => {
      if (!sourceFile?.cloudinary_public_id) {
        setPdfUrl(sourceFile?.cloudinary_url || '')
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      try {
        const resourceType = sourceFile.cloudinary_url.includes('/raw/upload/') ? 'raw' : 'image'
        const response = await fetch(
          `/api/cloudinary/signed-pdf?public_id=${encodeURIComponent(sourceFile.cloudinary_public_id)}&resource_type=${encodeURIComponent(resourceType)}`,
        )
        const result = await response.json()
        if (!response.ok) {
          throw new Error(result?.error || 'Failed to generate PDF viewer URL')
        }

        if (!cancelled) {
          setPdfUrl(result.url || sourceFile.cloudinary_url)
        }
      } catch (err) {
        if (!cancelled) {
          setPdfUrl(sourceFile.cloudinary_url || '')
          setError('Using direct file URL because the signed preview could not be generated.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadSignedUrl()

    return () => {
      cancelled = true
    }
  }, [sourceFile])

  return (
    <div className={`flex h-full flex-col ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
      <header className={`flex items-center justify-between border-b px-4 py-3 ${isDark ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-white'}`}>
        <div>
          <div className="text-[13px] font-semibold">PDF Viewer</div>
          <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{title}</div>
        </div>

        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Open in new tab
          </a>
        )}
      </header>

      <div className="flex-1 overflow-hidden p-3">
        {loading ? (
          <div className={`flex h-full items-center justify-center rounded-2xl border text-sm ${isDark ? 'border-slate-800 bg-slate-900 text-slate-400' : 'border-slate-200 bg-white text-slate-500'}`}>
            Loading PDF preview...
          </div>
        ) : pdfUrl ? (
          <div className={`h-full overflow-hidden rounded-2xl border shadow-sm ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
            <iframe
              src={pdfUrl}
              title={title}
              className="h-full w-full"
              style={{ border: 0 }}
            />
          </div>
        ) : (
          <div className={`flex h-full items-center justify-center rounded-2xl border text-sm ${isDark ? 'border-slate-800 bg-slate-900 text-slate-400' : 'border-slate-200 bg-white text-slate-500'}`}>
            {error || 'No PDF selected.'}
          </div>
        )}
      </div>
    </div>
  )
}