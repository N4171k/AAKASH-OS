"use client"

import { useState, useRef, useEffect } from 'react'

type ThemeMode = 'aakash' | 'paatal' | 'dharti' | 'antariksh'

const LINE_HEIGHT = 20

export default function CIDE({ theme: propTheme }: { theme?: ThemeMode }) {
  const effectiveTheme = propTheme ?? 'paatal'
  const isDark = effectiveTheme === 'paatal' || effectiveTheme === 'antariksh'
  const [code, setCode] = useState(
`#include <stdio.h>

int main() {
    printf("Hello from AAKASH OS!\\n");
    return 0;
}`
  )
  const [output, setOutput] = useState('Terminal ready. Click "Run Code" to execute.')
  const [running, setRunning] = useState(false)
  const [activeTab, setActiveTab] = useState('main.c')
  const [terminalHeight, setTerminalHeight] = useState(200)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const dragStartY = useRef(0)
  const dragStartHeight = useRef(0)

  const lineCount = code.split('\n').length

  const syncScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true
    dragStartY.current = e.clientY
    dragStartHeight.current = terminalHeight
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return
    const delta = dragStartY.current - e.clientY
    const newHeight = Math.max(80, Math.min(500, dragStartHeight.current + delta))
    setTerminalHeight(newHeight)
  }

  const handleMouseUp = () => {
    isDragging.current = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  const runCode = async () => {
    setRunning(true)
    setOutput('$ gcc main.c -o main && ./main\nCompiling...')

    try {
      const res = await fetch('/api/compiler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: 'c', source: code }),
      })

      const data = await res.json()

      if (data.ok) {
        const finalOutput = data.result.stdout
        setOutput(`$ gcc main.c -o main && ./main\n${finalOutput || '[Process exited with code 0 — No output]'}`)
      } else {
        setOutput(`$ gcc main.c -o main && ./main\n\n✗ Compilation failed:\n${data.error || 'Unknown error'}`)
      }
    } catch (e: any) {
      setOutput(`$ gcc main.c -o main && ./main\n\n✗ Network Error: ${e.message}`)
    } finally {
      setRunning(false)
    }
  }

  // Syntax-highlight-inspired color mapping for the token types
  // (pure CSS textarea can't do real syntax highlighting, but we style the shell)

  const tabs = ['main.c', 'README.md']

  const fileIcons: Record<string, React.ReactNode> = {
    'main.c': (
      <svg className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
      </svg>
    ),
    'README.md': (
      <svg className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
      </svg>
    ),
  }

  return (
    <div
      className="flex h-screen flex-col"
      style={{
        background: '#0d1117',
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        color: '#c9d1d9',
      }}
    >
      {/* ─── Title Bar ─────────────────────────────────────────────── */}
      <div
        className="flex shrink-0 items-center justify-between px-4"
        style={{
          background: '#161b22',
          borderBottom: '1px solid #21262d',
          height: 40,
        }}
      >
        {/* Left: App identity */}
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center rounded"
            style={{ width: 22, height: 22, background: 'linear-gradient(135deg,#1f6feb,#388bfd)' }}
          >
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
            </svg>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3', letterSpacing: '0.01em' }}>
            AAKASH IDE
          </span>
          <span
            className="rounded px-1.5 py-0.5"
            style={{ fontSize: 10, fontWeight: 500, background: '#1f6feb22', color: '#388bfd', border: '1px solid #1f6feb44' }}
          >
            C
          </span>
        </div>

        {/* Center: Window controls aesthetic */}
        <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
          <span style={{ fontSize: 12, color: '#484f58' }}>AAKASH OS · workspace</span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOutput('Terminal cleared.')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all"
            style={{ color: '#8b949e', background: 'transparent', border: '1px solid transparent', fontSize: 11 }}
            onMouseEnter={e => {
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#30363d'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#c9d1d9'
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#8b949e'
            }}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear
          </button>

          <button
            onClick={runCode}
            disabled={running}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all"
            style={{
              background: running ? '#1f6feb44' : 'linear-gradient(90deg,#1f6feb,#388bfd)',
              color: running ? '#8b949e' : '#fff',
              border: 'none',
              fontSize: 11,
              cursor: running ? 'not-allowed' : 'pointer',
              boxShadow: running ? 'none' : '0 0 12px #1f6feb55',
            }}
          >
            {running ? (
              <>
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Compiling…
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                Run
              </>
            )}
          </button>
        </div>
      </div>

      {/* ─── Tab Bar ───────────────────────────────────────────────── */}
      <div
        className="flex shrink-0 items-end gap-0"
        style={{ background: '#161b22', borderBottom: '1px solid #21262d' }}
      >
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex items-center gap-2 px-4 pb-2 pt-2.5 text-xs transition-all relative"
            style={{
              color: activeTab === tab ? '#c9d1d9' : '#6e7681',
              background: activeTab === tab ? '#0d1117' : 'transparent',
              borderTop: activeTab === tab ? '1px solid #388bfd' : '1px solid transparent',
              borderLeft: activeTab === tab ? '1px solid #21262d' : '1px solid transparent',
              borderRight: activeTab === tab ? '1px solid #21262d' : '1px solid transparent',
              borderBottom: 'none',
              fontSize: 11.5,
              fontWeight: activeTab === tab ? 500 : 400,
              borderRadius: '4px 4px 0 0',
              marginBottom: -1,
            }}
          >
            {fileIcons[tab]}
            {tab}
            {tab === 'main.c' && (
              <span
                className="w-1.5 h-1.5 rounded-full ml-1"
                style={{ background: '#388bfd', flexShrink: 0 }}
              />
            )}
          </button>
        ))}

        {/* Right side of tab bar */}
        <div className="ml-auto flex items-center px-3 pb-1.5 gap-3">
          <span style={{ fontSize: 10, color: '#484f58' }}>C99 · UTF-8 · LF</span>
          <span style={{ fontSize: 10, color: '#484f58' }}>Ln {lineCount}</span>
        </div>
      </div>

      {/* ─── Editor + Gutter ───────────────────────────────────────── */}
      <div className="relative flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>

        {/* Sidebar gutter */}
        <div
          className="flex shrink-0 flex-col items-end select-none pt-4 pb-4 pr-3"
          ref={lineNumbersRef}
          style={{
            width: 52,
            background: '#0d1117',
            borderRight: '1px solid #161b22',
            overflowY: 'hidden',
            color: '#3d444d',
            fontSize: 12,
            lineHeight: `${LINE_HEIGHT}px`,
            fontFamily: 'inherit',
          }}
        >
          {Array.from({ length: Math.max(lineCount, 30) }).map((_, i) => (
            <div key={i} style={{ height: LINE_HEIGHT, display: 'flex', alignItems: 'center' }}>
              {i + 1}
            </div>
          ))}
        </div>

        {/* Code textarea */}
        <textarea
          ref={textareaRef}
          spellCheck={false}
          value={code}
          onChange={e => setCode(e.target.value)}
          onScroll={syncScroll}
          onKeyDown={e => {
            if (e.key === 'Tab') {
              e.preventDefault()
              const start = e.currentTarget.selectionStart
              const end = e.currentTarget.selectionEnd
              const newCode = code.substring(0, start) + '    ' + code.substring(end)
              setCode(newCode)
              setTimeout(() => {
                if (textareaRef.current) {
                  textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4
                }
              }, 0)
            }
          }}
          className="flex-1 resize-none outline-none"
          style={{
            background: '#0d1117',
            color: '#79c0ff',
            fontSize: 13,
            lineHeight: `${LINE_HEIGHT}px`,
            padding: '16px 24px 16px 16px',
            fontFamily: 'inherit',
            caretColor: '#58a6ff',
            overflowY: 'auto',
            whiteSpace: 'pre',
            overflowX: 'auto',
          }}
        />

        {/* Minimap aesthetic strip */}
        <div
          className="shrink-0"
          style={{
            width: 80,
            background: '#0d1117',
            borderLeft: '1px solid #161b22',
            opacity: 0.4,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '16px 8px', fontSize: 2.5, lineHeight: '4.5px', color: '#388bfd', wordBreak: 'break-all', letterSpacing: '0.5px' }}>
            {code.repeat(3)}
          </div>
        </div>
      </div>

      {/* ─── Resize Handle ─────────────────────────────────────────── */}
      <div
        onMouseDown={handleMouseDown}
        className="flex shrink-0 items-center justify-center gap-2"
        style={{
          height: 6,
          background: '#161b22',
          borderTop: '1px solid #21262d',
          borderBottom: '1px solid #21262d',
          cursor: 'ns-resize',
          userSelect: 'none',
        }}
      >
        <div style={{ width: 32, height: 2, borderRadius: 1, background: '#30363d' }} />
      </div>

      {/* ─── Integrated Terminal ───────────────────────────────────── */}
      <div
        className="flex shrink-0 flex-col"
        style={{ height: terminalHeight, background: '#0d1117', minHeight: 80 }}
      >
        {/* Terminal tab bar */}
        <div
          className="flex items-center gap-0 shrink-0"
          style={{ background: '#161b22', borderBottom: '1px solid #21262d', height: 34 }}
        >
          <div
            className="flex items-center gap-2 px-4 h-full"
            style={{
              fontSize: 11,
              color: '#c9d1d9',
              borderRight: '1px solid #21262d',
              borderBottom: '2px solid #388bfd',
              fontWeight: 500,
            }}
          >
            <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            bash
          </div>

          <div className="flex-1" />

          {/* Status indicators */}
          <div className="flex items-center gap-3 px-4">
            <div className="flex items-center gap-1.5">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: running ? '#f0883e' : '#3fb950', boxShadow: running ? '0 0 4px #f0883e' : '0 0 4px #3fb950' }}
              />
              <span style={{ fontSize: 10, color: '#6e7681' }}>{running ? 'running' : 'idle'}</span>
            </div>
          </div>
        </div>

        {/* Terminal content */}
        <pre
          className="flex-1 overflow-auto"
          style={{
            margin: 0,
            padding: '12px 20px',
            fontSize: 12.5,
            fontFamily: 'inherit',
            lineHeight: '20px',
            color: '#3fb950',
            background: '#0d1117',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {output.split('\n').map((line, i) => {
            const isCommand = line.startsWith('$')
            const isError = line.includes('✗') || line.toLowerCase().includes('error') || line.toLowerCase().includes('failed')
            return (
              <span
                key={i}
                style={{
                  display: 'block',
                  color: isCommand ? '#58a6ff' : isError ? '#f85149' : '#3fb950',
                  fontWeight: isCommand ? 500 : 400,
                }}
              >
                {line}
              </span>
            )
          })}
          {running && (
            <span style={{ display: 'inline-block', color: '#388bfd' }}>
              <span className="animate-pulse">█</span>
            </span>
          )}
        </pre>
      </div>

      {/* ─── Status Bar ────────────────────────────────────────────── */}
      <div
        className="flex shrink-0 items-center justify-between px-3"
        style={{
          height: 22,
          background: '#1f6feb',
          fontSize: 11,
          color: 'rgba(255,255,255,0.85)',
        }}
      >
        <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
            </svg>
            AAKASH OS
          </span>
          <span>GCC 13.2</span>
          <span>C99</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Spaces: 4</span>
          <span>UTF-8</span>
          <span>C</span>
          <span className="flex items-center gap-1">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: running ? '#f0883e' : '#3fb950', display: 'inline-block' }}
            />
            {running ? 'Compiling' : 'Ready'}
          </span>
        </div>
      </div>
    </div>
  )
}
