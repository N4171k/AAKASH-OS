"use client"

import { useEffect, useState } from 'react'
import { useWindowStore } from '../../store/useWindowStore'

type TaskbarProps = {
  onOpen: (id: string, title: string) => void
  onToggleLauncher: () => void
}

type ThemeMode = 'aakash' | 'paatal' | 'dharti' | 'antariksh'

// 1. Defined rich app icons using Tailwind gradients and simple SVGs
const shortcuts = [
  { 
    id: 'files', 
    title: 'Cloud Drive', 
    bg: 'from-blue-400 to-blue-600',
    icon: <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
  },
  { 
    id: 'notes', 
    title: 'Notes', 
    bg: 'from-amber-300 to-orange-400',
    icon: <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
  },
  { 
    id: 'python', 
    title: 'Python IDE', 
    bg: 'from-emerald-400 to-teal-500',
    icon: <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M4 15h1m1 0h1m-7 0a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-1m-1 0h-1m-1 0H5a2 2 0 00-2 2v6z" /></svg>
  },
  { 
    id: 'c', 
    title: 'C IDE', 
    bg: 'from-indigo-400 to-purple-500',
    icon: <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
  },
  { 
    id: 'paint', 
    title: 'Paint', 
    bg: 'from-pink-400 to-rose-500',
    icon: <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
  },
  { 
    id: 'word', 
    title: 'Word Maker', 
    bg: 'from-blue-600 to-blue-800',
    icon: <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
  },
  { 
    id: 'browser', 
    title: 'Browser', 
    bg: 'from-cyan-400 to-blue-500',
    icon: <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
  },
]

export default function Taskbar({ onOpen, onToggleLauncher }: TaskbarProps) {
  // 2. Bring in the window store to track open apps
  const { windows } = useWindowStore()
  const [theme, setTheme] = useState<ThemeMode>('aakash')

  // 3. Sync with System Theme
  useEffect(() => {
    fetch('/api/me')
      .then(res => res.json())
      .then(data => {
        if (data?.preferences?.theme) setTheme(data.preferences.theme as ThemeMode)
      })
      .catch(() => {})

    const handleWorkspaceUpdate = (e: Event) => {
      const customEvent = e as CustomEvent
      if (customEvent.detail?.preferences?.theme) {
        setTheme(customEvent.detail.preferences.theme as ThemeMode)
      }
    }

    window.addEventListener('aakash-user-updated', handleWorkspaceUpdate)
    return () => window.removeEventListener('aakash-user-updated', handleWorkspaceUpdate)
  }, [])

  const isDark = theme === 'paatal' || theme === 'antariksh'

  // Dynamic Theme Classes
  const dockBg = isDark 
    ? 'border-white/10 bg-slate-900/60 shadow-[0_20px_40px_rgba(0,0,0,0.5)]' 
    : 'border-white/40 bg-white/40 shadow-2xl'
  
  const activeDot = isDark 
    ? 'bg-slate-300 shadow-[0_0_6px_rgba(255,255,255,0.4)]' 
    : 'bg-slate-600'
  
  const dividerClass = isDark ? 'bg-slate-600/50' : 'bg-slate-400/40'
  
  const launcherBtn = isDark 
    ? 'bg-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_6px_rgba(0,0,0,0.3)] border border-white/5 text-slate-300 group-hover:shadow-[0_8px_15px_rgba(0,0,0,0.4)]' 
    : 'bg-white shadow-md text-slate-700 border border-transparent'

  return (
    <footer className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 pointer-events-none">
      {/* Taskbar Container */}
      <div className={`flex items-end gap-2.5 rounded-3xl border px-3 py-2 backdrop-blur-xl pointer-events-auto transition-colors duration-500 ${dockBg}`}>
        
        {shortcuts.map((item) => {
          // Check if this specific app is currently open
          const isOpen = windows.some((w) => w.id === item.id)

          return (
            <div key={item.id} className="relative group flex flex-col items-center">
              
              {/* Custom OS Tooltip */}
              <div className="absolute -top-12 scale-95 opacity-0 transition-all duration-200 group-hover:-translate-y-1 group-hover:scale-100 group-hover:opacity-100 pointer-events-none">
                <div className={`rounded-md border px-2.5 py-1 text-xs font-medium shadow-lg backdrop-blur-md ${isDark ? 'bg-slate-800/90 border-white/10 text-slate-200' : 'bg-slate-800/90 border-white/20 text-white'}`}>
                  {item.title}
                </div>
              </div>

              {/* App Button */}
              <button
                onClick={() => onOpen(item.id, item.title)}
                className={`relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${item.bg} shadow-md transition-all duration-300 ease-out group-hover:-translate-y-2 group-hover:shadow-xl group-active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400`}
                aria-label={item.title}
              >
                {/* Inner glass reflection effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                {item.icon}
              </button>

              {/* Active Application Indicator (The Dot) */}
              <div 
                className={`absolute -bottom-1.5 h-1 w-1 rounded-full transition-all duration-300 ${activeDot} ${
                  isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
                }`} 
              />
            </div>
          )
        })}

        {/* Divider */}
        <div className={`mx-1 mb-2 h-10 w-px rounded-full transition-colors duration-500 ${dividerClass}`} />

        {/* System / App Drawer Launcher */}
        <div className="relative group flex flex-col items-center">
          {/* Drawer Tooltip */}
          <div className="absolute -top-12 scale-95 opacity-0 transition-all duration-200 group-hover:-translate-y-1 group-hover:scale-100 group-hover:opacity-100 pointer-events-none">
            <div className={`rounded-md border px-2.5 py-1 text-xs font-medium shadow-lg backdrop-blur-md ${isDark ? 'bg-slate-800/90 border-white/10 text-slate-200' : 'bg-slate-800/90 border-white/20 text-white'}`}>
              App Drawer
            </div>
          </div>

          <button 
            onClick={onToggleLauncher} 
            className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300 ease-out group-hover:-translate-y-2 group-active:scale-95 ${launcherBtn}`} 
            aria-label="App Launcher"
          >
            <svg className="h-6 w-6 currentColor" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

      </div>
    </footer>
  )
}