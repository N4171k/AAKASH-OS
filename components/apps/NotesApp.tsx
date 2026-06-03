"use client"

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  created: number
  updated: number
}

type ThemeMode = 'aakash' | 'paatal' | 'dharti' | 'antariksh'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeId() {
  return "n_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7)
}

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

function formatDate(ts: number): string {
  const diff = (Date.now() - ts) / 1000
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

const DEMO_NOTE: Note = {
  id: "demo",
  title: "Welcome to Notepad",
  content:
    "This is your new notes app.\n\nChanges are saved automatically as you type. Try adding tags, duplicating this note, or pressing ⌘N to create a new one.\n\nEnjoy writing.",
  tags: ["welcome", "demo"],
  created: Date.now() - 3_600_000,
  updated: Date.now() - 3_600_000,
}

// ─── Storage ─────────────────────────────────────────────────────────────────

function loadNotes(): Note[] {
  if (typeof window === 'undefined') return [DEMO_NOTE]
  try {
    const raw = localStorage.getItem("notepad_v3")
    if (raw) return JSON.parse(raw)
  } catch {}
  return [DEMO_NOTE]
}

function persistNotes(notes: Note[]) {
  try {
    localStorage.setItem("notepad_v3", JSON.stringify(notes))
  } catch {}
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NotesApp({ theme: propTheme }: { theme?: ThemeMode }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [saved, setSaved] = useState(true)
  const [tagInputVisible, setTagInputVisible] = useState(false)
  const [tagDraft, setTagDraft] = useState("")
  const [theme, setTheme] = useState<ThemeMode>('aakash')
  const effectiveTheme = propTheme ?? theme

  const titleRef = useRef<HTMLTextAreaElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ─── Initialization & Theme Subscription ───
  useEffect(() => {
    setNotes(loadNotes())
    
    // Fetch initial theme from OS
    fetch('/api/me')
      .then(res => res.json())
      .then(data => {
        if (!propTheme && data?.preferences?.theme) setTheme(data.preferences.theme as ThemeMode)
      })
      .catch(() => {})

    // Listen for live OS theme changes
    const handleWorkspaceUpdate = (e: Event) => {
      const customEvent = e as CustomEvent
      if (!propTheme && customEvent.detail?.preferences?.theme) {
        setTheme(customEvent.detail.preferences.theme as ThemeMode)
      }
    }

    window.addEventListener('aakash-user-updated', handleWorkspaceUpdate)
    return () => window.removeEventListener('aakash-user-updated', handleWorkspaceUpdate)
  }, [])

  const currentNote = useMemo(() => notes.find((n) => n.id === currentId) ?? null, [notes, currentId])

  // Persist on every change
  useEffect(() => { 
    if (notes.length > 0) persistNotes(notes) 
  }, [notes])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") { e.preventDefault(); handleNew() }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); setSaved(true) }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  })

  // Auto-resize title textarea
  const handleTitleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.target.style.height = "auto"
    e.target.style.height = e.target.scrollHeight + "px"
    updateNote({ title: e.target.value })
  }, [currentId]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateNote = useCallback(
    (patch: Partial<Note>) => {
      if (!currentId) return
      setSaved(false)
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
      autoSaveTimer.current = setTimeout(() => setSaved(true), 800)
      setNotes((prev) =>
        prev.map((n) =>
          n.id === currentId ? { ...n, ...patch, updated: Date.now() } : n
        )
      )
    },
    [currentId]
  )

  // ── Actions ──

  function handleNew() {
    const id = makeId()
    const note: Note = { id, title: "", content: "", tags: [], created: Date.now(), updated: Date.now() }
    setNotes((prev) => [note, ...prev])
    setCurrentId(id)
    setSaved(true)
    setTimeout(() => titleRef.current?.focus(), 50)
  }

  function handleDelete() {
    if (!currentId) return
    if (!confirm("Delete this note?")) return
    setNotes((prev) => prev.filter((n) => n.id !== currentId))
    setCurrentId(null)
  }

  function handleDuplicate() {
    if (!currentNote) return
    const id = makeId()
    setNotes((prev) => [
      { ...currentNote, id, title: currentNote.title + " (copy)", created: Date.now(), updated: Date.now() },
      ...prev,
    ])
    setCurrentId(id)
  }

  function handleExport() {
    if (!currentNote) return
    const blob = new Blob([`# ${currentNote.title}\n\n${currentNote.content}`], { type: "text/plain" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = (currentNote.title || "note").replace(/[^a-z0-9]/gi, "_") + ".txt"
    a.click()
  }

  function handleAddTag() {
    const tag = tagDraft.trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 20)
    if (tag && currentNote && !currentNote.tags.includes(tag)) {
      updateNote({ tags: [...currentNote.tags, tag] })
    }
    setTagDraft("")
    setTagInputVisible(false)
  }

  function handleRemoveTag(tag: string) {
    if (!currentNote) return
    updateNote({ tags: currentNote.tags.filter((t) => t !== tag) })
  }

  // ── Filtered list ──
  const filtered = useMemo(() => {
    return notes
      .filter((n) => {
        if (!query) return true
        const q = query.toLowerCase()
        return (
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.tags.some((t) => t.includes(q))
        )
      })
      .sort((a, b) => b.updated - a.updated)
  }, [notes, query])

  // ── Theme Dictionaries ──
  const isDark = theme === 'paatal' || theme === 'antariksh'
  
  const accents = {
    aakash: 'bg-blue-500 hover:bg-blue-600 text-white',
    dharti: 'bg-green-600 hover:bg-green-700 text-white',
    paatal: 'bg-red-800 hover:bg-red-700 text-white',
    antariksh: 'bg-indigo-500 hover:bg-indigo-400 text-white',
  }
  const activeItemBg = {
    aakash: 'bg-blue-50 border-blue-200',
    dharti: 'bg-green-50 border-green-200',
    paatal: 'bg-red-950/40 border-red-900/50',
    antariksh: 'bg-indigo-900/30 border-indigo-800/50',
  }

  return (
    <div className={`flex h-full w-full font-sans antialiased overflow-hidden ${isDark ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800'}`}>
      
      {/* ── Sidebar ── */}
      <aside className={`w-64 flex-shrink-0 flex flex-col border-r transition-colors ${isDark ? 'bg-slate-900/50 border-slate-700/80' : 'bg-slate-50/80 border-slate-200'}`}>
        <div className={`p-4 pb-3 border-b ${isDark ? 'border-slate-700/80' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2 mb-3 font-serif text-sm font-medium">
            <span>📓</span>
            <span>Note<em className={isDark ? 'text-slate-400 not-italic' : 'text-slate-500 not-italic'}>pad</em></span>
          </div>
          
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] opacity-50">🔍</span>
            <input
              className={`w-full py-1.5 pl-8 pr-3 text-xs rounded-md border outline-none transition-all ${
                isDark 
                  ? 'bg-slate-800 border-slate-700 focus:border-slate-500 text-slate-200 placeholder:text-slate-500' 
                  : 'bg-white border-slate-200 focus:border-blue-400 text-slate-800 placeholder:text-slate-400'
              }`}
              placeholder="Search notes…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className={`p-3 border-b ${isDark ? 'border-slate-700/80' : 'border-slate-200'}`}>
          <button 
            className={`w-full py-2 px-3 text-xs font-medium rounded-md flex items-center justify-center gap-2 transition-colors ${accents[effectiveTheme]}`} 
            onClick={handleNew}
          >
            <span>+</span> New Note
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
          {filtered.length === 0 ? (
            <div className={`text-center py-8 text-xs leading-relaxed ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {notes.length ? "No results found" : "No notes yet\nCreate one to begin"}
            </div>
          ) : (
            filtered.map((n) => {
              const isActive = n.id === currentId
              return (
                <div 
                  key={n.id}
                  onClick={() => setCurrentId(n.id)}
                  className={`p-3 rounded-lg cursor-pointer border mb-1 transition-all ${
                    isActive 
                      ? activeItemBg[effectiveTheme] + ' shadow-sm'
                      : isDark 
                        ? 'border-transparent hover:bg-slate-800 hover:border-slate-700' 
                        : 'border-transparent hover:bg-white hover:border-slate-200'
                  }`}
                >
                  <div className={`text-xs font-semibold mb-1 truncate ${isActive ? (isDark ? 'text-slate-100' : 'text-slate-900') : ''}`}>
                    {n.title || "Untitled"}
                  </div>
                  <div className={`text-[11px] truncate mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {n.content.replace(/\n/g, " ").slice(0, 60) || "—"}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      {formatDate(n.updated)}
                    </span>
                    {n.tags.slice(0, 2).map((t) => (
                      <span key={t} className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wide font-medium ${
                        isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </aside>

      {/* ── Editor ── */}
      <main className={`flex-1 flex flex-col ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
        {!currentNote ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
            <span className="text-4xl mb-4">🪶</span>
            <p className="font-serif text-sm italic mb-1">Nothing selected</p>
            <p className="text-xs">Create a note or pick one from the sidebar</p>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className={`flex items-center gap-2 px-6 py-2.5 flex-shrink-0 border-b ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50/50 border-slate-100'}`}>
              <button onClick={handleDuplicate} className={`text-[11px] px-2.5 py-1.5 rounded border transition-colors ${isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-600'}`}>
                Duplicate
              </button>
              <button onClick={handleExport} className={`text-[11px] px-2.5 py-1.5 rounded border transition-colors ${isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-600'}`}>
                Export
              </button>
              
              <div className="flex-1" />
              
              <span className={`text-[10px] flex items-center gap-1 transition-colors ${saved ? 'text-green-600 dark:text-green-500' : 'text-amber-600 dark:text-amber-500'}`}>
                {saved ? "✓ Saved" : "● Unsaved"}
              </span>
              <div className={`w-px h-4 mx-2 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
              <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {wordCount(currentNote.content)} words
              </span>
              <div className={`w-px h-4 mx-2 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
              
              <button onClick={handleDelete} className={`text-[11px] px-2.5 py-1.5 rounded border transition-colors ${isDark ? 'border-red-900/30 hover:bg-red-900/50 text-red-400' : 'border-red-200 hover:bg-red-50 text-red-600'}`}>
                Delete
              </button>
            </div>

            {/* Scroll area */}
            <div className="flex-1 overflow-y-auto px-10 py-8 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
              <div className="max-w-3xl mx-auto">
                {/* Title */}
                <textarea
                  ref={titleRef}
                  className="w-full font-serif text-3xl font-medium bg-transparent border-none outline-none resize-none leading-snug mb-2 placeholder:opacity-30"
                  rows={1}
                  placeholder="Untitled note…"
                  value={currentNote.title}
                  onChange={handleTitleInput}
                  spellCheck={false}
                />
                
                <div className={`h-px w-full mb-6 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />

                {/* Tags */}
                <div className="flex items-center gap-2 flex-wrap mb-8">
                  {currentNote.tags.map((tag) => (
                    <span key={tag} className={`text-[10px] px-2 py-1 rounded flex items-center gap-1.5 uppercase tracking-wide font-medium ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                      {tag}
                      <button
                        className="hover:text-red-500 focus:outline-none"
                        onClick={() => handleRemoveTag(tag)}
                        aria-label={`Remove tag ${tag}`}
                      >
                        ✕
                      </button>
                    </span>
                  ))}

                  {tagInputVisible ? (
                    <div className="flex items-center gap-2">
                      <input
                        className={`text-[11px] font-mono px-2 py-1 rounded border outline-none w-24 ${isDark ? 'bg-slate-800 border-slate-600 text-slate-200' : 'bg-white border-blue-300 text-slate-800'}`}
                        maxLength={20}
                        placeholder="Tag name…"
                        value={tagDraft}
                        autoFocus
                        onChange={(e) => setTagDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddTag()
                          if (e.key === "Escape") { setTagInputVisible(false); setTagDraft("") }
                        }}
                      />
                      <button className={`text-[10px] px-2 py-1 rounded border ${isDark ? 'border-slate-600 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-50'}`} onClick={handleAddTag}>
                        Add
                      </button>
                    </div>
                  ) : (
                    <button 
                      className={`text-[10px] px-2 py-1 rounded border border-dashed transition-colors ${isDark ? 'border-slate-600 text-slate-400 hover:border-slate-400 hover:text-slate-300' : 'border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-700'}`} 
                      onClick={() => setTagInputVisible(true)}
                    >
                      + Add Tag
                    </button>
                  )}
                </div>

                {/* Content */}
                <textarea
                  ref={contentRef}
                  className="w-full font-serif text-base bg-transparent border-none outline-none resize-none leading-[1.8] min-h-[400px] placeholder:opacity-30"
                  placeholder="Start writing…"
                  value={currentNote.content}
                  onChange={(e) => updateNote({ content: e.target.value })}
                  spellCheck
                />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}