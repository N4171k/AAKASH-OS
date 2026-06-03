"use client"

import React, { useState, useMemo, useEffect, useRef } from 'react'

// Master list of all installed OS applications
const ALL_APPS = [
  { id: 'files', title: 'Cloud Drive', bg: 'from-blue-400 to-blue-600', icon: <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg> },
  { id: 'notes', title: 'Notes', bg: 'from-amber-300 to-orange-400', icon: <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg> },
  { id: 'python', title: 'Python IDE', bg: 'from-emerald-400 to-teal-500', icon: <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M4 15h1m1 0h1m-7 0a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-1m-1 0h-1m-1 0H5a2 2 0 00-2 2v6z" /></svg> },
  { id: 'c', title: 'C IDE', bg: 'from-indigo-400 to-purple-500', icon: <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg> },
  { id: 'paint', title: 'Paint', bg: 'from-pink-400 to-rose-500', icon: <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg> },
  { id: 'word', title: 'Word Maker', bg: 'from-blue-600 to-blue-800', icon: <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
  { id: 'settings', title: 'Settings', bg: 'from-slate-400 to-slate-600', icon: <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
  { id: 'browser', title: 'Browser', bg: 'from-cyan-400 to-blue-500', icon: <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg> },
  { id: 'calculator', title: 'Calculator', bg: 'from-orange-400 to-red-500', icon: <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> },
]

type AppLauncherProps = {
  isOpen: boolean
  theme?: string // Receives 'aakash', 'paatal', 'dharti', or 'antariksh' from your layout state
  onClose: () => void
  onLaunch: (id: string, title: string) => void
}

export default function AppLauncher({ isOpen, theme = 'aakash', onClose, onLaunch }: AppLauncherProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Determine if the current theme is Dark mode
  const isDark = theme === 'paatal' || theme === 'antariksh'

  // Dynamic Theme Classes
  const panelBg = isDark ? 'bg-slate-900/70 border-white/10 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)]' : 'bg-white/70 border-white/40 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)]'
  const inputClasses = isDark 
    ? 'border-white/10 bg-slate-800/50 text-white placeholder:text-slate-400 focus:bg-slate-800 focus:ring-blue-500' 
    : 'border-white/50 bg-white/60 text-slate-800 placeholder:text-slate-500 focus:bg-white focus:ring-blue-400'
  const textColor = isDark ? 'text-slate-200' : 'text-slate-700'
  const hintBg = isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-400'

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => setSearchQuery(''), 200) 
    } else {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const filteredApps = useMemo(() => {
    if (!searchQuery.trim()) return ALL_APPS
    return ALL_APPS.filter(app => 
      app.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [searchQuery])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Enter' && searchQuery.trim() && filteredApps.length > 0) {
        onLaunch(filteredApps[0].id, filteredApps[0].title)
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, searchQuery, filteredApps, onClose, onLaunch])

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div 
      onClick={handleBackgroundClick}
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
        isOpen 
          ? 'bg-black/40 opacity-100 pointer-events-auto backdrop-blur-md' 
          : 'bg-black/0 opacity-0 pointer-events-none backdrop-blur-none'
      }`}
    >
      <div 
        className={`relative flex w-full max-w-2xl flex-col overflow-hidden rounded-[32px] border p-6 backdrop-blur-2xl transition-all duration-300 ease-out transform ${panelBg} ${
          isOpen ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-12 scale-95 opacity-0'
        }`}
      >
        {/* Search Bar */}
        <div className="relative mb-6">
          <svg className={`absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search for apps, files, or settings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full rounded-2xl border py-3.5 pl-12 pr-12 text-sm font-medium shadow-sm outline-none backdrop-blur-md transition-all focus:ring-2 ${inputClasses}`}
          />
          {searchQuery.trim() && filteredApps.length > 0 && (
            <div className={`absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md border ${hintBg}`}>
              <span>↵</span> Enter
            </div>
          )}
        </div>

        {/* Apps Grid */}
        <div className="h-[360px] overflow-y-auto pr-2 pb-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-400/30">
          {filteredApps.length > 0 ? (
            <div className="grid grid-cols-4 gap-x-4 gap-y-6 sm:grid-cols-5">
              {filteredApps.map((app, index) => {
                const isTopHit = searchQuery.trim() && index === 0;
                return (
                  <div key={app.id} className="group flex flex-col items-center">
                    <button
                      onClick={() => {
                        onLaunch(app.id, app.title)
                        onClose()
                      }}
                      className={`relative flex h-[72px] w-[72px] items-center justify-center rounded-[20px] bg-gradient-to-br ${app.bg} shadow-md transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-400/50 ${
                        isTopHit ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-transparent' : ''
                      }`}
                      title={app.title}
                    >
                      <div className="absolute inset-0 rounded-[20px] bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                      {app.icon}
                    </button>
                    <span className={`mt-2 text-center text-[12px] truncate w-full px-1 ${
                      isTopHit 
                        ? (isDark ? 'font-bold text-blue-400' : 'font-bold text-blue-600') 
                        : `font-medium ${textColor}`
                    }`}>
                      {app.title}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className={`flex h-full flex-col items-center justify-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <svg className="h-12 w-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="font-medium text-sm">No apps found for "{searchQuery}"</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}