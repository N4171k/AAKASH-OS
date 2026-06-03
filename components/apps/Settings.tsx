"use client"

import React, { useEffect, useMemo, useState } from 'react'

// ── TYPES ─────────────────────────────────────────────────────────────

type SettingsTab = 'general' | 'appearance' | 'account' | 'about'
type ThemeMode = 'aakash' | 'paatal' | 'dharti' | 'antariksh'

type WorkspaceProfile = {
  username: string
  email?: string
  full_name?: string | null
  avatar_url?: string | null
  selected_apps?: string[]
  storage_used?: number
  storage_limit?: number
  last_login_at?: string | null
}

type WorkspacePreferences = {
  theme?: ThemeMode
  wallpaper_url?: string | null
  dock_position?: string
  desktop_layout?: Record<string, unknown>
  window_preferences?: Record<string, unknown>
}

type WorkspaceDashboard = {
  notesCount: number
  filesCount: number
  storageUsed: number
  storageLimit: number
  pinnedNotesCount: number
  recentNotes: Array<{ id: string; title: string; updated_at: string; pinned: boolean }>
  recentFiles: Array<{ id: string; name: string; file_size: number; created_at: string; mime_type: string }>
}

type MeResponse = {
  profile: WorkspaceProfile
  preferences: WorkspacePreferences
  dashboard: WorkspaceDashboard
}

// ── THEME DEFINITIONS ──────────────────────────────────────────────────

const THEMES: Array<{ id: ThemeMode; name: string; description: string; wallpaper: string }> = [
  { 
    id: 'aakash', 
    name: 'AAKASH (Sky)', 
    description: 'Light theme with soft blue accents', 
    wallpaper: 'linear-gradient(135deg, #fdfefe 0%, #e6f2fd 40%, #8dc0f0 100%)' 
  },
  { 
    id: 'paatal', 
    name: 'PAATAL (Depths)', 
    description: 'Dark theme with deep red accents', 
    wallpaper: 'radial-gradient(circle at 50% 100%, #3a0a0a 0%, #1a0505 50%, #0a0000 100%)' 
  },
  { 
    id: 'dharti', 
    name: 'DHARTI (Earth)', 
    description: 'Light theme with vibrant green accents', 
    wallpaper: 'linear-gradient(135deg, #fbfdf9 0%, #e8f5e9 40%, #81c784 100%)' 
  },
  { 
    id: 'antariksh', 
    name: 'ANTARIKSH (Cosmos)', 
    description: 'Deep dark space with starry backdrop', 
    wallpaper: 'radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%)' 
  },
]

// ── COMPONENT ──────────────────────────────────────────────────────────

export default function SettingsApp({ theme: propTheme }: { theme?: ThemeMode }) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const [animations, setAnimations] = useState(true)
  const [selectedWallpaper, setSelectedWallpaper] = useState(THEMES[0].wallpaper)
  const [dockPosition, setDockPosition] = useState('bottom')
  const [theme, setTheme] = useState<ThemeMode>('aakash')
  const effectiveTheme = propTheme ?? theme
  const [developerMode, setDeveloperMode] = useState(false)
  const [workspace, setWorkspace] = useState<MeResponse | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    const loadWorkspace = async () => {
      try {
        const response = await fetch('/api/me')
        if (!response.ok) return
        const result = (await response.json()) as MeResponse
        if (cancelled) return

        setWorkspace(result)
        setSelectedWallpaper(result.preferences?.wallpaper_url || THEMES[0].wallpaper)
        setDockPosition(result.preferences?.dock_position || 'bottom')
        setAnimations(Boolean(result.preferences?.window_preferences?.animations ?? true))
        setDeveloperMode(Boolean(result.preferences?.window_preferences?.developerMode ?? false))
        if (!propTheme) setTheme((result.preferences?.theme as ThemeMode) || 'aakash')
      } catch {
        // Keep defaults when profile data is unavailable.
      }
    }

    loadWorkspace()
    return () => {
      cancelled = true
    }
  }, [])

  const dashboard = workspace?.dashboard
  const profile = workspace?.profile
  const storageUsed = dashboard?.storageUsed || profile?.storage_used || 0
  const storageLimit = dashboard?.storageLimit || profile?.storage_limit || 1
  const storagePercent = Math.min(100, Math.round((storageUsed / Math.max(storageLimit, 1)) * 100))

  const savePreferences = async (nextState?: Partial<WorkspacePreferences> & { windowPreferences?: Record<string, unknown> }) => {
    const wallpaperUrl = nextState?.wallpaper_url ?? selectedWallpaper
    const nextDockPosition = nextState?.dock_position ?? dockPosition
    const nextTheme = nextState?.theme ?? theme
    const nextWindowPreferences = nextState?.windowPreferences ?? {
      animations,
      developerMode,
    }

    setSaving(true)
    setMessage('')

    try {
      const response = await fetch('/api/user-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallpaperUrl,
          dockPosition: nextDockPosition,
          theme: nextTheme,
          desktopLayout: {
            selectedApps: profile?.selected_apps || [],
            dashboardCards: ['notes', 'files', 'storage'],
          },
          windowPreferences: nextWindowPreferences,
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        setMessage(result?.error || 'Failed to save preferences')
        return
      }

      const updatedPreferences = result.preferences as WorkspacePreferences
      setWorkspace((current) =>
        current
          ? {
              ...current,
              preferences: updatedPreferences,
            }
          : current,
      )

      window.dispatchEvent(
        new CustomEvent('aakash-user-updated', {
          detail: { preferences: updatedPreferences },
        }),
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  const activeThemeObj = useMemo(
    () => THEMES.find((t) => t.id === theme) || THEMES[0],
    [theme]
  )

  const displayName = profile?.full_name || profile?.username || 'Workspace'
  const avatarFallback = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U'

  const tabs: { id: SettingsTab; label: string; icon: string }[] = [
    { id: 'general', label: 'General System', icon: '⚙️' },
    { id: 'appearance', label: 'Appearance', icon: '🎨' },
    { id: 'account', label: 'Cloud Account', icon: '👤' },
    { id: 'about', label: 'About OS', icon: 'ℹ️' },
  ]

  return (
    <div className="flex h-full w-full bg-slate-50 text-slate-800 antialiased select-none">
      
      {/* ── SIDEBAR ────────────────────────────────────────────────────── */}
      <aside className="w-48 bg-slate-100 border-r border-slate-200 p-2 flex flex-col gap-1">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Settings
        </div>
        <nav className="flex-1 space-y-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200 active:bg-slate-300'
              }`}
            >
              <span className="text-sm leading-none">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── MAIN CONTENT AREA ──────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-6 text-xs">
        
        {/* ── GENERAL TAB ──────────────────────────────────────────────── */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900">General Settings</h2>
              <p className="mt-0.5 text-slate-500">Configure your core desktop shell behavior.</p>
            </div>
            <hr className="border-slate-200" />

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-[11px] uppercase tracking-wider text-slate-400">Profile</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{displayName}</div>
                <div className="mt-1 text-[11px] text-slate-500">@{profile?.username || 'pending'}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-[11px] uppercase tracking-wider text-slate-400">Storage</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{storagePercent}% used</div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${storagePercent}%` }} />
                </div>
                <div className="mt-1 text-[11px] text-slate-500">{storageUsed.toLocaleString()} / {storageLimit.toLocaleString()} bytes</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-[11px] uppercase tracking-wider text-slate-400">Memory</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{dashboard?.notesCount || 0} notes</div>
                <div className="mt-1 text-[11px] text-slate-500">{dashboard?.filesCount || 0} files and {dashboard?.pinnedNotesCount || 0} pinned notes</div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-[11px] uppercase tracking-wider text-slate-400">Dashboard shortcuts</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(profile?.selected_apps || []).map((app) => (
                  <span key={app} className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-medium text-blue-600">
                    {app}
                  </span>
                ))}
                {!(profile?.selected_apps || []).length ? (
                  <span className="text-[11px] text-slate-400">No pinned apps yet.</span>
                ) : null}
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                <div>
                  <div className="font-medium text-slate-900">Window Animations</div>
                  <div className="text-[11px] text-slate-400">Enable fluid desktop window transitions</div>
                </div>
                <input 
                  type="checkbox" 
                  checked={animations}
                  onChange={(e) => {
                    const nextValue = e.target.checked
                    setAnimations(nextValue)
                    void savePreferences({ windowPreferences: { animations: nextValue, developerMode } })
                  }}
                  className="h-4 w-4 accent-blue-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                <div>
                  <div className="font-medium text-slate-900">Developer Mode</div>
                  <div className="text-[11px] text-slate-400">Unlock system metrics and raw state inspector tools</div>
                </div>
                <input 
                  type="checkbox" 
                  checked={developerMode}
                  onChange={(e) => {
                    const nextValue = e.target.checked
                    setDeveloperMode(nextValue)
                    void savePreferences({ windowPreferences: { animations, developerMode: nextValue } })
                  }}
                  className="h-4 w-4 accent-blue-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── APPEARANCE TAB ───────────────────────────────────────────── */}
        {activeTab === 'appearance' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Appearance</h2>
              <p className="mt-0.5 text-slate-500">Personalize your system workspace canvas.</p>
            </div>
            <hr className="border-slate-200" />

            <div className="space-y-3">
              <label className="font-medium text-slate-700 block">System Themes</label>
              <div className="grid grid-cols-2 gap-3">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTheme(t.id)
                      setSelectedWallpaper(t.wallpaper)
                      void savePreferences({ theme: t.id, wallpaper_url: t.wallpaper })
                    }}
                    className={`group relative flex flex-col overflow-hidden rounded-xl border p-2 text-left bg-white transition-all hover:border-blue-400 ${
                      theme === t.id ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'
                    }`}
                  >
                    <div className="h-20 w-full rounded-md shadow-inner mb-3" style={{ background: t.wallpaper }} />
                    <div className="px-1">
                      <div className="text-xs font-bold text-slate-900">{t.name}</div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">{t.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <label className="font-medium text-slate-700 block">Dock Position</label>
              <div className="grid grid-cols-3 gap-2">
                {['bottom', 'left', 'right'].map((position) => (
                  <button
                    key={position}
                    type="button"
                    onClick={() => {
                      setDockPosition(position)
                      void savePreferences({ dock_position: position })
                    }}
                    className={`rounded-lg border px-3 py-2 text-[11px] font-medium transition-colors ${
                      dockPosition === position
                        ? 'border-blue-500 bg-blue-50 text-blue-600'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="capitalize">{position}</span>
                  </button>
                ))}
              </div>
              {message ? (
                <p className="text-[11px] text-red-500 mt-2 font-medium">{message}</p>
              ) : (
                <p className="text-[11px] text-slate-400 mt-2">Active Theme: {activeThemeObj.name}</p>
              )}
            </div>
          </div>
        )}

        {/* ── ACCOUNT TAB ──────────────────────────────────────────────── */}
        {activeTab === 'account' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Cloud Profile</h2>
              <p className="mt-0.5 text-slate-500">Manage synchronization parameters and identity.</p>
            </div>
            <hr className="border-slate-200" />

            <div className="grid gap-4 md:grid-cols-[auto,1fr]">
              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center gap-4">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={displayName} className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-lg font-bold">
                    {avatarFallback}
                  </div>
                )}
                <div>
                  <div className="text-sm font-semibold text-slate-900">{displayName}</div>
                  <div className="text-[11px] text-slate-400">{profile?.email || 'No email on file'}</div>
                  <span className="mt-1.5 inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                    Active Session
                  </span>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-[11px] uppercase tracking-wider text-slate-400">Recent memory</div>
                <div className="space-y-2">
                  {(dashboard?.recentNotes || []).slice(0, 3).map((note) => (
                    <div key={note.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                      <span className="truncate">{note.title || 'Untitled'}</span>
                      <span>{note.pinned ? 'Pinned' : 'Note'}</span>
                    </div>
                  ))}
                  {!(dashboard?.recentNotes || []).length ? (
                    <div className="text-[11px] text-slate-400">No notes yet.</div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ABOUT TAB ────────────────────────────────────────────────── */}
        {activeTab === 'about' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900">About Environment</h2>
              <p className="mt-0.5 text-slate-500">Software architecture and structural runtime builds.</p>
            </div>
            <hr className="border-slate-200" />

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="p-3 font-medium text-slate-400 w-1/3">OS Architecture</td>
                    <td className="p-3 text-slate-800 font-mono">React Next.js Fiber Mesh</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="p-3 font-medium text-slate-400">Environment Build</td>
                    <td className="p-3 text-slate-800 font-mono">v2.4.1-stable</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-slate-400">Memory Allocation</td>
                    <td className="p-3 text-slate-800 text-green-600 font-medium">Optimal (Isolated Fiber Subtrees)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="text-center text-[10px] text-slate-400 pt-4">
              {saving ? 'Saving profile changes...' : 'Designed with sandboxed reactive architecture.'}
            </div>
          </div>
        )}

      </main>
    </div>
  )
}