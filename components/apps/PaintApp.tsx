"use client"

import React, { useEffect, useRef, useState } from 'react'

type ThemeMode = 'aakash' | 'paatal' | 'dharti' | 'antariksh'
type Tool = 'brush' | 'eraser' | 'line' | 'rect' | 'circle'

interface Point {
  x: number;
  y: number;
}

type OpenImage = {
  id: string
  name: string
  cloudinary_url: string
  mime_type?: string
}

export default function PaintApp({ theme: propTheme = 'aakash', sourceFile }: { theme?: ThemeMode; sourceFile?: OpenImage | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)
  
  // Drawing State
  const [isDrawing, setIsDrawing] = useState(false)
  const [tool, setTool] = useState<Tool>('brush')
  const [color, setColor] = useState('#000000')
  const [brushSize, setBrushSize] = useState(5)
  const [opacity, setOpacity] = useState(100)
  
  // Shape/Preview State
  const [startPos, setStartPos] = useState<Point>({ x: 0, y: 0 })
  const [snapshot, setSnapshot] = useState<ImageData | null>(null)

  // History (Undo/Redo)
  const [history, setHistory] = useState<ImageData[]>([])
  const [historyStep, setHistoryStep] = useState(-1)

  // System State
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  // Initialize Canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = 1200
    canvas.height = 800

    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return

    // Fill white background
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.lineCap = 'round'
    context.lineJoin = 'round'
    
    contextRef.current = context

    // Save initial blank state to history
    saveHistoryState(canvas, context)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = contextRef.current
    if (!canvas || !context || !sourceFile) return

    let cancelled = false

    const loadImage = async () => {
      try {
        const image = new Image()
        image.crossOrigin = 'anonymous'
        image.src = sourceFile.cloudinary_url

        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve()
          image.onerror = () => reject(new Error('Could not load image'))
        })

        if (cancelled) return

        context.globalAlpha = 1
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, canvas.width, canvas.height)

        const scale = Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight, 1)
        const drawWidth = image.naturalWidth * scale
        const drawHeight = image.naturalHeight * scale
        const offsetX = (canvas.width - drawWidth) / 2
        const offsetY = (canvas.height - drawHeight) / 2
        context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight)

        const snapshot = context.getImageData(0, 0, canvas.width, canvas.height)
        setHistory([snapshot])
        setHistoryStep(0)
      } catch (error) {
        console.error('Failed to load image into Paint:', error)
      }
    }

    void loadImage()

    return () => {
      cancelled = true
    }
  }, [sourceFile])

  // Update brush properties when settings change
  useEffect(() => {
    if (!contextRef.current) return
    contextRef.current.strokeStyle = tool === 'eraser' ? '#ffffff' : color
    contextRef.current.lineWidth = brushSize
    contextRef.current.globalAlpha = tool === 'eraser' ? 1 : opacity / 100
  }, [color, brushSize, opacity, tool])

  // --- History Management ---
  const saveHistoryState = (canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) => {
    const data = context.getImageData(0, 0, canvas.width, canvas.height)
    const newHistory = history.slice(0, historyStep + 1)
    newHistory.push(data)
    // Limit history to 20 steps to save memory
    if (newHistory.length > 20) newHistory.shift()
    setHistory(newHistory)
    setHistoryStep(newHistory.length - 1)
  }

  const undo = () => {
    if (historyStep > 0 && contextRef.current && canvasRef.current) {
      const prevStep = historyStep - 1
      contextRef.current.putImageData(history[prevStep], 0, 0)
      setHistoryStep(prevStep)
    }
  }

  const redo = () => {
    if (historyStep < history.length - 1 && contextRef.current && canvasRef.current) {
      const nextStep = historyStep + 1
      contextRef.current.putImageData(history[nextStep], 0, 0)
      setHistoryStep(nextStep)
    }
  }

  // --- Drawing Logic ---
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!contextRef.current || !canvasRef.current) return
    
    const { x, y } = getCoordinates(e, canvasRef.current)
    
    setIsDrawing(true)
    setStartPos({ x, y })
    setSnapshot(contextRef.current.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height))
    
    contextRef.current.beginPath()
    contextRef.current.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !contextRef.current || !canvasRef.current || !snapshot) return
    e.preventDefault()

    const { x, y } = getCoordinates(e, canvasRef.current)
    const ctx = contextRef.current

    // For shape tools, we constantly restore the snapshot to create a "preview" effect as you drag
    if (tool !== 'brush' && tool !== 'eraser') {
      ctx.putImageData(snapshot, 0, 0)
      ctx.beginPath()
    }

    if (tool === 'brush' || tool === 'eraser') {
      ctx.lineTo(x, y)
      ctx.stroke()
    } else if (tool === 'line') {
      ctx.moveTo(startPos.x, startPos.y)
      ctx.lineTo(x, y)
      ctx.stroke()
    } else if (tool === 'rect') {
      ctx.strokeRect(startPos.x, startPos.y, x - startPos.x, y - startPos.y)
    } else if (tool === 'circle') {
      const radius = Math.sqrt(Math.pow(startPos.x - x, 2) + Math.pow(startPos.y - y, 2))
      ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI)
      ctx.stroke()
    }
  }

  const stopDrawing = () => {
    if (!isDrawing || !contextRef.current || !canvasRef.current) return
    contextRef.current.closePath()
    setIsDrawing(false)
    saveHistoryState(canvasRef.current, contextRef.current)
  }

  const clearCanvas = () => {
    if (!canvasRef.current || !contextRef.current) return
    contextRef.current.globalAlpha = 1 // reset alpha for clearing
    contextRef.current.fillStyle = '#ffffff'
    contextRef.current.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    
    // Restore previous tool alpha
    contextRef.current.globalAlpha = opacity / 100 
    saveHistoryState(canvasRef.current, contextRef.current)
  }

  // --- Exports ---
  const downloadLocal = () => {
    if (!canvasRef.current) return
    const link = document.createElement('a')
    link.download = `masterpiece_${Date.now()}.png`
    link.href = canvasRef.current.toDataURL('image/png')
    link.click()
  }

  const saveToCloudDrive = async () => {
    if (!canvasRef.current) return
    setIsSaving(true)
    setSaveMessage(null)

    try {
      const blob = await new Promise<Blob | null>((res) => canvasRef.current?.toBlob(res, 'image/png'))
      if (!blob) throw new Error("Could not generate image file.")

      const file = new File([blob], `drawing_${Date.now()}.png`, { type: 'image/png' })
      const formData = new FormData()
      formData.append('file', file)

      // Replace with your actual endpoint
      // const res = await fetch('/api/files', { method: 'POST', body: formData })
      // if (!res.ok) throw new Error('Upload failed')
      
      // Simulated delay for demonstration
      await new Promise(r => setTimeout(r, 1000))

      setSaveMessage('Saved to Cloud!')
    } catch (err) {
      setSaveMessage('Error saving file.')
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveMessage(null), 3000)
    }
  }

  // --- Theming ---
  const isDark = propTheme === 'paatal' || propTheme === 'antariksh'
  
  // Theme Backgrounds
  const bgClasses = {
    aakash: 'bg-gradient-to-br from-blue-50 to-cyan-100',
    dharti: 'bg-gradient-to-br from-green-50 to-emerald-100',
    paatal: 'bg-gradient-to-br from-red-950 to-slate-900',
    antariksh: 'bg-gradient-to-br from-slate-900 to-indigo-950'
  }[propTheme]

  return (
    <div className={`relative flex h-screen w-full flex-col items-center overflow-hidden ${bgClasses}`}>
      
      {/* Floating Toolbar (Glassmorphism) */}
      <header className={`absolute top-4 z-10 flex w-[95%] max-w-5xl items-center justify-between gap-4 rounded-2xl border px-6 py-3 shadow-xl backdrop-blur-md transition-all
        ${isDark ? 'border-slate-700/50 bg-slate-800/80 text-slate-200' : 'border-white/50 bg-white/80 text-slate-800'}`}>
        
        {/* Undo/Redo/Clear */}
        <div className="flex items-center gap-1">
          <IconButton onClick={undo} disabled={historyStep <= 0} icon={Icons.Undo} tooltip="Undo" isDark={isDark} />
          <IconButton onClick={redo} disabled={historyStep >= history.length - 1} icon={Icons.Redo} tooltip="Redo" isDark={isDark} />
          <div className="mx-2 h-6 w-px bg-slate-400/30" />
          <IconButton onClick={clearCanvas} icon={Icons.Trash} tooltip="Clear All" isDark={isDark} hoverColor="hover:bg-red-500/10 hover:text-red-500" />
        </div>

        {/* Tools */}
        <div className={`flex items-center gap-1 rounded-xl p-1 shadow-inner ${isDark ? 'bg-slate-900/50' : 'bg-slate-100/50'}`}>
          <ToolButton toolName="brush" currentTool={tool} setTool={setTool} icon={Icons.Brush} tooltip="Brush" isDark={isDark} />
          <ToolButton toolName="eraser" currentTool={tool} setTool={setTool} icon={Icons.Eraser} tooltip="Eraser" isDark={isDark} />
          <div className="mx-1 h-5 w-px bg-slate-400/30" />
          <ToolButton toolName="line" currentTool={tool} setTool={setTool} icon={Icons.Line} tooltip="Line" isDark={isDark} />
          <ToolButton toolName="rect" currentTool={tool} setTool={setTool} icon={Icons.Square} tooltip="Rectangle" isDark={isDark} />
          <ToolButton toolName="circle" currentTool={tool} setTool={setTool} icon={Icons.Circle} tooltip="Circle" isDark={isDark} />
        </div>

        {/* Settings (Color, Size, Opacity) */}
        <div className="flex items-center gap-4">
          <input 
            type="color" 
            value={color} 
            onChange={(e) => { setColor(e.target.value); setTool('brush'); }}
            className={`h-9 w-9 cursor-pointer rounded-full border-2 p-0.5 shadow-sm transition-transform hover:scale-110 ${isDark ? 'border-slate-600' : 'border-white'}`}
            title="Color"
          />
          
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Icons.Size className="h-3 w-3 opacity-60" />
              <input type="range" min="1" max="50" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} className="w-20 accent-indigo-500" title="Brush Size"/>
            </div>
            <div className="flex items-center gap-2">
              <Icons.Opacity className="h-3 w-3 opacity-60" />
              <input type="range" min="1" max="100" value={opacity} onChange={(e) => setOpacity(parseInt(e.target.value))} className="w-20 accent-indigo-500" title="Opacity"/>
            </div>
          </div>
        </div>

        {/* Export Actions */}
        <div className="flex items-center gap-3">
          {saveMessage && <span className="animate-fade-in text-xs font-bold text-emerald-500">{saveMessage}</span>}
          
          <button onClick={downloadLocal} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all
            ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-200 hover:bg-slate-300'}`}>
            <Icons.Download className="h-4 w-4" /> Save
          </button>
          
          <button onClick={saveToCloudDrive} disabled={isSaving} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:bg-indigo-500 hover:shadow-indigo-500/50 disabled:opacity-50">
            {isSaving ? <Icons.Spinner className="h-4 w-4 animate-spin" /> : <Icons.Cloud className="h-4 w-4" />}
            Cloud
          </button>
        </div>
      </header>

      {/* Canvas Wrapper - Centers canvas on screen and adds a nice drop shadow */}
      <main className="flex h-full w-full items-center justify-center p-20 pt-32">
        <div className="relative overflow-hidden rounded-2xl shadow-2xl ring-1 ring-black/5">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="cursor-crosshair bg-white touch-none"
            style={{ width: 800, height: 600 }} 
          />
        </div>
      </main>
    </div>
  )
}

// --- UI Sub-components --- 

function ToolButton({ toolName, currentTool, setTool, icon: Icon, tooltip, isDark }: any) {
  const isActive = currentTool === toolName
  return (
    <button
      onClick={() => setTool(toolName)}
      title={tooltip}
      className={`rounded-lg p-2 transition-all duration-200 
        ${isActive 
          ? 'bg-indigo-500 text-white shadow-md' 
          : `hover:bg-indigo-500/10 ${isDark ? 'text-slate-400 hover:text-indigo-400' : 'text-slate-500 hover:text-indigo-600'}`
        }`}
    >
      <Icon className="h-5 w-5" />
    </button>
  )
}

function IconButton({ onClick, icon: Icon, tooltip, disabled, isDark, hoverColor }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={`rounded-lg p-2 transition-all 
        ${disabled ? 'opacity-30 cursor-not-allowed' : hoverColor || (isDark ? 'hover:bg-slate-700 hover:text-white' : 'hover:bg-slate-200 hover:text-slate-900')}
        ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
    >
      <Icon className="h-5 w-5" />
    </button>
  )
}

// --- Icons (Minimalist inline SVGs so you don't need external libraries) ---
const Icons = {
  Brush: (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>,
  Eraser: (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Line: (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 20L20 4" /></svg>,
  Square: (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="4" y="4" width="16" height="16" rx="2" /></svg>,
  Circle: (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9" /></svg>,
  Undo: (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>,
  Redo: (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>,
  Trash: (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Download: (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
  Cloud: (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>,
  Size: (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="4" /></svg>,
  Opacity: (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  Spinner: (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
}