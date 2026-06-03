"use client"

import React, { useState, useEffect, useRef, memo } from 'react'
import { useWindowStore } from '../../store/useWindowStore'
import type { WindowState } from './Window'
import Window from './Window'
import Taskbar from './Taskbar'
import AppLauncher from './AppLauncher'
import dynamic from 'next/dynamic'

type DashboardProfile = {
  id: string
  username: string
  email?: string
  full_name?: string | null
  avatar_url?: string | null
  selected_apps?: string[]
  storage_used?: number
  storage_limit?: number
  last_login_at?: string | null
}

type DashboardPreferences = {
  theme?: string
  wallpaper_url?: string | null
  dock_position?: string
  desktop_layout?: Record<string, unknown>
  window_preferences?: Record<string, unknown>
}

type DashboardSummary = {
  notesCount: number
  filesCount: number
  storageUsed: number
  storageLimit: number
  pinnedNotesCount: number
  recentNotes: Array<{ id: string; title: string; updated_at: string; pinned: boolean }>
  recentFiles: Array<{ id: string; name: string; file_size: number; created_at: string; mime_type: string }>
}

type MeResponse = {
  profile: DashboardProfile
  preferences: DashboardPreferences
  dashboard: DashboardSummary
}

// ─── App Registry ─────────────────────────────────────────────────────────────
const appRegistry: Record<string, { title: string; component: React.ComponentType }> = {
  files:    { title: 'Cloud Drive', component: dynamic(() => import('../apps/FileManager'), { ssr: false }) },
  notes:    { title: 'Notes',       component: dynamic(() => import('../apps/NotesApp'), { ssr: false }) },
  python:   { title: 'Python IDE',  component: dynamic(() => import('../apps/PythonIDE'), { ssr: false }) },
  c:        { title: 'C IDE',       component: dynamic(() => import('../apps/CIDE'), { ssr: false }) },
  paint:    { title: 'Paint',       component: dynamic(() => import('../apps/PaintApp'), { ssr: false }) },
  word:     { title: 'Word',        component: dynamic(() => import('../apps/WordApp'), { ssr: false }) },
  pdf:      { title: 'PDF Viewer',  component: dynamic(() => import('../apps/PdfViewer'), { ssr: false }) },
  settings: { title: 'Settings',    component: dynamic(() => import('../apps/Settings'), { ssr: false }) },
  browser:  { title: 'Browser',     component: dynamic(() => import('../apps/BrowserApp'), { ssr: false }) },
}

// ─── Theme Overlays ───────────────────────────────────────────────────────────
// These replace the hardcoded bright overlay so dark themes don't get washed out
const THEME_OVERLAYS: Record<string, string> = {
  aakash: 'bg-[linear-gradient(90deg,rgba(255,255,255,0.92)_0%,rgba(255,255,255,0.72)_16%,rgba(125,193,255,0.16)_52%,rgba(125,193,255,0.34)_100%)]',
  dharti: 'bg-[linear-gradient(90deg,rgba(255,255,255,0.92)_0%,rgba(255,255,255,0.72)_16%,rgba(129,199,132,0.16)_52%,rgba(129,199,132,0.34)_100%)]',
  paatal: 'bg-[linear-gradient(90deg,rgba(10,0,0,0.85)_0%,rgba(26,5,5,0.65)_16%,rgba(58,10,10,0.2)_52%,rgba(0,0,0,0.4)_100%)]',
  antariksh: 'bg-[linear-gradient(90deg,rgba(9,10,15,0.85)_0%,rgba(27,39,53,0.55)_30%,rgba(0,0,0,0.2)_100%)]',
}

// ─── Clock ────────────────────────────────────────────────────────────────────
const TopBarClock = memo(function TopBarClock() {
  const [mounted, setMounted] = useState(false)
  const [time, setTime] = useState<Date | null>(null)

  useEffect(() => {
    setMounted(true)
    setTime(new Date())
    const timer = setInterval(() => setTime(new Date()), 10_000)
    return () => clearInterval(timer)
  }, [])

  if (!mounted || !time) {
    return <div className="min-w-[160px] opacity-0" aria-hidden>Loading...</div>
  }

  return (
    <>
      <span>{time.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric' })}</span>
      <span className="opacity-40" aria-hidden>|</span>
      <time dateTime={time.toISOString()}>
        {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
      </time>
    </>
  )
})

// ─── WindowEntry ──────────────────────────────────────────────────────────────
interface WindowEntryProps {
  windowId: string
  instanceKey: string
  title: string
  zIndex: number
  isActive: boolean
  initialPosition: { x: number; y: number }
  theme?: string
  onClose: () => void
  onFocus: () => void
  onWindowStateChange: (state: WindowState) => void
  children: React.ReactNode
}

const WindowEntry = memo(function WindowEntry({
  instanceKey,
  title,
  zIndex,
  isActive,
  initialPosition,
  theme,
  onClose,
  onFocus,
  onWindowStateChange,
  children,
}: WindowEntryProps) {
  return (
    <Window
      key={instanceKey}
      title={title}
      theme={theme}
      isActive={isActive}
      onClose={onClose}
      onFocus={onFocus}
      onWindowStateChange={onWindowStateChange}
      initialPosition={initialPosition}
      style={{ zIndex }}
    >
      {children}
    </Window>
  )
})

// ─── DesktopShell ─────────────────────────────────────────────────────────────
export default function DesktopShell() {
  const { windows, activeId, openWindow, closeWindow, focusWindow } = useWindowStore()
  const [isLauncherOpen, setIsLauncherOpen] = useState(false)
  const [workspaceState, setWorkspaceState] = useState<MeResponse | null>(null)

  // Track which window IDs are currently maximized. A Set lets multiple windows
  // be maximized independently; the top bar hides as long as any one is.
  const [maximizedWindows, setMaximizedWindows] = useState<Set<string>>(new Set())
  const anyMaximized = maximizedWindows.size > 0

  useEffect(() => {
    let cancelled = false

    const loadWorkspaceState = async () => {
      try {
        const response = await fetch('/api/me')
        if (!response.ok) return
        const result = (await response.json()) as MeResponse
        if (!cancelled) {
          setWorkspaceState(result)
        }
      } catch {
        // Ignore profile load failures and fall back to defaults.
      }
    }

    loadWorkspaceState()

    const handleWorkspaceUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<Partial<MeResponse>>
      setWorkspaceState((current) => ({
        profile: customEvent.detail.profile || current?.profile || ({} as DashboardProfile),
        preferences: customEvent.detail.preferences || current?.preferences || {},
        dashboard: customEvent.detail.dashboard || current?.dashboard || {
          notesCount: 0,
          filesCount: 0,
          storageUsed: 0,
          storageLimit: 0,
          pinnedNotesCount: 0,
          recentNotes: [],
          recentFiles: [],
        },
      }))
    }

    window.addEventListener('aakash-user-updated', handleWorkspaceUpdate)

    return () => {
      cancelled = true
      window.removeEventListener('aakash-user-updated', handleWorkspaceUpdate)
    }
  }, [])

  const handleWindowStateChange = (id: string, state: WindowState) => {
    setMaximizedWindows((prev) => {
      const next = new Set(prev)
      if (state === 'maximized') next.add(id)
      else next.delete(id)
      return next
    })
  }

  const positionRegistry = useRef<Record<string, { x: number; y: number }>>({})
  const instanceKeys = useRef<Record<string, string>>({})
  const openCount = useRef(0)

  const zBase = 20
  const zLookup = new Map(windows.map((w, i) => [w.id, zBase + i]))
  
  // -- Computed Properties & Theme Extraction --
  const profile = workspaceState?.profile
  const theme = workspaceState?.preferences?.theme || 'aakash'
  const isDark = theme === 'paatal' || theme === 'antariksh'
  const wallpaper = workspaceState?.preferences?.wallpaper_url || 'linear-gradient(90deg,#f6f7f8 0%,#c8def4 32%,#92bfe9 100%)'
  const overlayClass = THEME_OVERLAYS[theme] || THEME_OVERLAYS['aakash']
  
  const storageUsed = workspaceState?.dashboard?.storageUsed || profile?.storage_used || 0
  const storageLimit = workspaceState?.dashboard?.storageLimit || profile?.storage_limit || 1
  const storagePercent = Math.min(100, Math.round((storageUsed / Math.max(storageLimit, 1)) * 100))
  const displayName = profile?.full_name || profile?.username || 'Workspace'
  const avatarFallback = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U'

  return (
    <main className="relative min-h-screen overflow-hidden" style={{ background: wallpaper }}>

      {/* ── TOP SYSTEM BAR ──────────────────────────────────────────────── */}
      {/* Both the decorative pill and the header slide out together.        */}
      {/* Dynamic theme applied to the bar background and shadow             */}
      <div
        aria-hidden
        className={`absolute inset-x-0 top-0 z-10 h-10 rounded-b-[1.6rem] pointer-events-none transition-transform duration-300 ease-in-out
          ${isDark ? 'bg-slate-900 shadow-[0_1px_0_rgba(255,255,255,0.1)]' : 'bg-white shadow-[0_1px_0_rgba(255,255,255,0.9)]'}
          ${anyMaximized ? '-translate-y-full' : 'translate-y-0'}`}
      />

      <header
        className={`absolute left-0 right-0 top-0 z-20 flex h-10 items-center justify-between
          rounded-b-[1.4rem] px-2 text-[11px] transition-transform duration-300 ease-in-out
          ${isDark ? 'text-slate-200' : 'text-slate-700'}
          ${anyMaximized ? '-translate-y-full' : 'translate-y-0'}`}
      >
        <button
          type="button"
          onClick={() => setIsLauncherOpen((v) => !v)}
          className="ml-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#2d95ff] text-[10px] text-white shadow-sm transition-transform hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-400"
          aria-label="System Menu"
          aria-expanded={isLauncherOpen}
        >
          <img src="/logo.png" alt="Aakash OS" className="h-4 w-4 rounded-full object-cover" />
        </button>

        <div className={`flex items-center gap-3 rounded-full px-3 py-1 text-[11px] font-medium backdrop-blur-md shadow-sm ${
          isDark ? 'bg-slate-800/60 text-slate-200 border border-white/5' : 'bg-white/60 text-slate-700 border border-transparent'
        }`}>
          <div className="flex items-center gap-2">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={displayName} className="h-6 w-6 rounded-full object-cover" />
            ) : (
              <img src="/logo.png" alt="Aakash OS" className="h-6 w-6 rounded-full object-cover" />
            )}
            <div className="flex flex-col leading-tight">
              <span>{displayName}</span>
              <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {workspaceState?.dashboard ? `${workspaceState.dashboard.notesCount} notes · ${workspaceState.dashboard.filesCount} files` : 'Personal workspace'}
              </span>
            </div>
          </div>
          <TopBarClock />
          <div className={`hidden min-w-[140px] flex-col text-right text-[10px] sm:flex ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span>Storage {storagePercent}%</span>
            <span>{storageUsed.toLocaleString()} / {storageLimit.toLocaleString()} bytes</span>
          </div>
        </div>

        <div className="w-8" aria-hidden />
      </header>

      {/* ── DESKTOP AREA ────────────────────────────────────────────────── */}
      <section className="relative z-0 min-h-screen px-6 pb-28 pt-12" aria-label="Desktop">
        {/* Dynamic Theme Overlay */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 transition-colors duration-500 ${overlayClass}`}
        />

        {windows.map((win) => {
          const app = appRegistry[win.id]
          if (!app) return null

          if (!positionRegistry.current[win.id]) {
            const count = Object.keys(positionRegistry.current).length
            positionRegistry.current[win.id] = {
              x: 80 + (count % 8) * 30,
              y: 80 + (count % 8) * 30,
            }
          }
          const initialPosition = positionRegistry.current[win.id]

          if (!instanceKeys.current[win.id]) {
            instanceKeys.current[win.id] = `${win.id}-${openCount.current++}`
          }
          const instanceKey = instanceKeys.current[win.id]
          const zIndex = zLookup.get(win.id) ?? zBase
          const AppComponent = app.component as React.ComponentType<{ sourceFile?: unknown }>
          const windowPayload = win.payload as any

          return (
            <WindowEntry
              key={win.id}
              windowId={win.id}
              instanceKey={instanceKey}
              title={app.title}
              zIndex={zIndex}
              isActive={activeId === win.id}
              initialPosition={initialPosition}
              theme={theme}
              onClose={() => {
                handleWindowStateChange(win.id, 'normal') // clean up maximized tracking
                delete positionRegistry.current[win.id]
                delete instanceKeys.current[win.id]
                closeWindow(win.id)
              }}
              onFocus={() => focusWindow(win.id)}
              onWindowStateChange={(state) => handleWindowStateChange(win.id, state)}
            >
              <AppComponent {...(windowPayload ? { sourceFile: windowPayload } : {})} />
            </WindowEntry>
          )
        })}
      </section>

      {/* ── APP LAUNCHER ─────────────────────────────────────────── */}
      <AppLauncher
        isOpen={isLauncherOpen}
        theme={theme}
        onClose={() => setIsLauncherOpen(false)}
        onLaunch={(id, title) => {
          openWindow(id, title)
          setIsLauncherOpen(false)
        }}
      />

      {/* ── TASKBAR ───────────────────────────────────────────────── */}
      <Taskbar
        onOpen={openWindow}
        onToggleLauncher={() => setIsLauncherOpen((v) => !v)}
      />
    </main>
  )
}