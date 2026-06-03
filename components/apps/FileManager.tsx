"use client"

import React, { useEffect, useState, useRef } from 'react'
import { useWindowStore } from '../../store/useWindowStore'

// ── Utilities ────────────────────────────────────────────────────────────────

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

type ThemeMode = 'aakash' | 'paatal' | 'dharti' | 'antariksh'

type CloudFile = {
  id: string
  name: string
  cloudinary_url: string
  cloudinary_public_id?: string
  file_size: number
  mime_type?: string
}

const isDocxFile = (f: CloudFile) =>
  f.mime_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
  f.name.toLowerCase().endsWith('.docx')

const isImageFile = (f: CloudFile) =>
  Boolean(f.mime_type?.startsWith('image/')) ||
  /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(f.name)

const isPdfFile = (f: CloudFile) =>
  f.mime_type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')

// ── File-type metadata ────────────────────────────────────────────────────────

type FileMeta = { label: string; color: string; bg: string; icon: React.ReactNode }

function getFileMeta(file: CloudFile, dark: boolean): FileMeta {
  if (isDocxFile(file)) return {
    label: 'Word', color: '#3b82f6',
    bg: dark ? 'rgba(59,130,246,.15)' : '#eff6ff',
    icon: <DocxIcon />,
  }
  if (isImageFile(file)) return {
    label: 'Image', color: '#10b981',
    bg: dark ? 'rgba(16,185,129,.15)' : '#f0fdf4',
    icon: <ImageIcon />,
  }
  if (isPdfFile(file)) return {
    label: 'PDF', color: '#ef4444',
    bg: dark ? 'rgba(239,68,68,.15)' : '#fef2f2',
    icon: <PdfIcon />,
  }
  return {
    label: 'File', color: '#8b5cf6',
    bg: dark ? 'rgba(139,92,246,.15)' : '#f5f3ff',
    icon: <GenericIcon />,
  }
}

// ── Icon set ─────────────────────────────────────────────────────────────────

const DocxIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-full w-full" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
)

const ImageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-full w-full" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
  </svg>
)

const PdfIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-full w-full" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
)

const GenericIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-full w-full" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6 9.75-3-3m0 0-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
)

const UploadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
  </svg>
)

const SpinIcon = () => (
  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
)

const CloudIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="h-16 w-16">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 1.332-7.257 3 3 0 0 0-3.758-3.848 5.25 5.25 0 0 0-10.233 2.33A4.502 4.502 0 0 0 2.25 15Z" />
  </svg>
)

// ── File row ──────────────────────────────────────────────────────────────────

function FileRow({ file, dark, onOpen }: { file: CloudFile; dark: boolean; onOpen: (f: CloudFile) => void }) {
  const meta = getFileMeta(file, dark)
  const openable = isDocxFile(file) || isImageFile(file) || isPdfFile(file)
  const ext = file.name.split('.').pop()?.toUpperCase() ?? '—'

  return (
    <li
      className={`
        group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150
        ${dark
          ? 'hover:bg-white/[.06] active:bg-white/10'
          : 'hover:bg-slate-50 active:bg-slate-100'}
      `}
    >
      {/* Icon tile */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: meta.bg, color: meta.color }}
      >
        <div className="h-5 w-5">{meta.icon}</div>
      </div>

      {/* Name + meta */}
      <div className="min-w-0 flex-1">
        {openable ? (
          <button
            type="button"
            onClick={() => onOpen(file)}
            className={`
              block w-full truncate text-left text-[13px] font-medium leading-snug
              transition-colors
              ${dark ? 'text-slate-100 hover:text-white' : 'text-slate-800 hover:text-slate-900'}
            `}
            title={file.name}
          >
            {file.name}
          </button>
        ) : (
          <a
            href={file.cloudinary_url}
            target="_blank"
            rel="noreferrer"
            className={`
              block truncate text-[13px] font-medium leading-snug transition-colors
              ${dark ? 'text-slate-100 hover:text-white' : 'text-slate-800 hover:text-slate-900'}
            `}
            title={file.name}
          >
            {file.name}
          </a>
        )}
        <span className={`text-[11px] ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
          {ext} · {formatBytes(file.file_size || 0)}
        </span>
      </div>

      {/* Action button — visible on hover */}
      {openable && (
        <button
          type="button"
          onClick={() => onOpen(file)}
          title={`Open in ${meta.label}`}
          className={`
            shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold
            opacity-0 group-hover:opacity-100 transition-opacity duration-150
            focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-1
          `}
          style={{
            background: meta.bg,
            color: meta.color,
          }}
        >
          Open
        </button>
      )}
    </li>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FileManager({ theme: propTheme }: { theme?: ThemeMode }) {
  const { openWindow } = useWindowStore()
  const [files, setFiles] = useState<CloudFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/files')
      .then(r => { if (!r.ok) throw new Error('Failed to fetch'); return r.json() })
      .then(d => setFiles(d.files || []))
      .catch(e => setError(e?.message || 'Could not load files.'))
      .finally(() => setIsLoading(false))
  }, [])

  const doUpload = async (file: File) => {
    setUploading(true)
    setError(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/files', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Upload failed')
      const refreshed = await fetch('/api/files')
      const d = await refreshed.json()
      setFiles(d.files || [])
    } catch (e: any) {
      setError(e?.message || 'Upload failed.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) doUpload(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) doUpload(f)
  }

  const openSupportedFile = (file: CloudFile) => {
    if (isDocxFile(file)) { openWindow('word', 'Word Maker', file); return }
    if (isImageFile(file)) { openWindow('paint', 'Paint', file); return }
    if (isPdfFile(file))   { openWindow('pdf', 'PDF Viewer', file) }
  }

  const dark = propTheme === 'paatal' || propTheme === 'antariksh'

  // Group by type for a subtle section header
  const docx   = files.filter(isDocxFile)
  const images = files.filter(f => !isDocxFile(f) && isImageFile(f))
  const pdfs   = files.filter(f => !isDocxFile(f) && !isImageFile(f) && isPdfFile(f))
  const others = files.filter(f => !isDocxFile(f) && !isImageFile(f) && !isPdfFile(f))

  const sections = [
    { label: 'Documents', items: docx },
    { label: 'Images',    items: images },
    { label: 'PDFs',      items: pdfs },
    { label: 'Other',     items: others },
  ].filter(s => s.items.length > 0)

  return (
    <div
      className={`flex h-full flex-col select-none ${dark ? 'bg-[#0f1117] text-slate-200' : 'bg-white text-slate-800'}`}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className={`
        flex items-center justify-between gap-3 px-4 py-3
        border-b
        ${dark ? 'border-white/[.07] bg-white/[.03]' : 'border-slate-100 bg-slate-50/80'}
      `}>
        <div className="flex items-center gap-2">
          <div className={`rounded-lg p-1.5 ${dark ? 'bg-white/10' : 'bg-white shadow-sm ring-1 ring-slate-200'}`}>
            <svg viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 ${dark ? 'text-slate-300' : 'text-slate-500'}`}>
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
          </div>
          <div>
            <h2 className={`text-[13px] font-semibold leading-none ${dark ? 'text-slate-100' : 'text-slate-700'}`}>
              Cloud Drive
            </h2>
            {!isLoading && (
              <p className={`mt-0.5 text-[10px] leading-none ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                {files.length} {files.length === 1 ? 'file' : 'files'}
              </p>
            )}
          </div>
        </div>

        <label
          className={`
            relative flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold
            transition-all duration-150 select-none
            ${uploading
              ? 'pointer-events-none bg-blue-400 text-white'
              : 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95 shadow-sm shadow-blue-500/30'}
          `}
        >
          {uploading ? <SpinIcon /> : <UploadIcon />}
          <span>{uploading ? 'Uploading…' : 'Upload'}</span>
          <input ref={inputRef} type="file" className="sr-only" onChange={handleChange} disabled={uploading} />
        </label>
      </header>

      {/* ── Error banner ───────────────────────────────────────────────────── */}
      {error && (
        <div className={`flex items-center gap-2 border-b px-4 py-2 text-[12px] ${dark ? 'bg-red-950/40 border-red-900/40 text-red-300' : 'bg-red-50 border-red-100 text-red-600'}`}>
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 shrink-0">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-auto rounded opacity-60 hover:opacity-100 focus:outline-none"
          >✕</button>
        </div>
      )}

      {/* ── Drag overlay ───────────────────────────────────────────────────── */}
      {dragOver && (
        <div className={`
          absolute inset-0 z-50 flex flex-col items-center justify-center gap-3
          rounded-[inherit] border-2 border-dashed border-blue-400
          ${dark ? 'bg-blue-950/60 text-blue-300' : 'bg-blue-50/80 text-blue-500'}
          backdrop-blur-sm
        `}>
          <UploadIcon />
          <span className="text-[13px] font-semibold">Drop to upload</span>
        </div>
      )}

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="relative flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center gap-2 text-[13px] text-slate-400">
            <SpinIcon />
            <span>Loading…</span>
          </div>
        ) : files.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <div className={dark ? 'text-slate-700' : 'text-slate-300'}>
              <CloudIcon />
            </div>
            <div>
              <p className={`text-[13px] font-semibold ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                No files yet
              </p>
              <p className={`mt-1 text-[11px] ${dark ? 'text-slate-600' : 'text-slate-400'}`}>
                Upload a file or drag & drop it here
              </p>
            </div>
            <label className={`
              mt-1 flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium
              transition-colors
              ${dark
                ? 'border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-300'
                : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'}
            `}>
              <UploadIcon />
              Choose file
              <input type="file" className="sr-only" onChange={handleChange} />
            </label>
          </div>
        ) : (
          <div className="px-2 py-2">
            {sections.map(section => (
              <div key={section.label} className="mb-1">
                {sections.length > 1 && (
                  <p className={`mb-1 mt-2 px-3 text-[10px] font-semibold uppercase tracking-widest ${dark ? 'text-slate-600' : 'text-slate-400'}`}>
                    {section.label}
                  </p>
                )}
                <ul className="space-y-0.5">
                  {section.items.map(file => (
                    <FileRow key={file.id} file={file} dark={dark} onOpen={openSupportedFile} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}