"use client"

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

// ─── Types ───────────────────────────────────────────────────────────────────

export type WindowState = "normal" | "minimized" | "maximized"

export interface WindowProps extends React.HTMLAttributes<HTMLElement> {
  title: string
  /** The current system theme (e.g., 'aakash', 'paatal', 'dharti', 'antariksh') */
  theme?: string
  children?: React.ReactNode
  /** Whether this window is the currently focused one */
  isActive?: boolean
  /** Controlled window state (optional – component manages internally if omitted) */
  windowState?: WindowState
  onWindowStateChange?: (state: WindowState) => void
  initialPosition?: { x: number; y: number }
  initialSize?: { width: number; height: number }
  /** Called when the close button is clicked */
  onClose?: () => void
  /** Called when the window is clicked / pointer-downed (for z-order management) */
  onFocus?: () => void
  /** If false the content area fills the window without extra padding/bg */
  contentPadding?: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n))

// ─── Traffic-Light Button ─────────────────────────────────────────────────────

interface TrafficBtnProps {
  color: "red" | "yellow" | "green"
  label: string
  icon: React.ReactNode
  onClick: (e: React.PointerEvent) => void
  disabled?: boolean
  showIcons: boolean
}

const TRAFFIC_COLORS = {
  red:    { bg: "#ff5f57", ring: "#e0443e" },
  yellow: { bg: "#ffbd2e", ring: "#dea123" },
  green:  { bg: "#28c840", ring: "#1aab29" },
}

function TrafficBtn({ color, label, icon, onClick, disabled, showIcons }: TrafficBtnProps) {
  const { bg, ring } = TRAFFIC_COLORS[color]
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onPointerDown={(e) => { e.stopPropagation(); onClick(e) }}
      style={{
        background: disabled ? "#c0c0c0" : bg,
        boxShadow: `0 0 0 1px ${disabled ? "#aaa" : ring}`,
      }}
      className="relative h-3.5 w-3.5 rounded-full transition-[filter] hover:brightness-90 active:brightness-75 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center"
    >
      <span
        className="transition-opacity duration-150"
        style={{ opacity: showIcons ? 1 : 0 }}
      >
        {icon}
      </span>
    </button>
  )
}

// ─── Window ───────────────────────────────────────────────────────────────────

const Window = forwardRef<HTMLElement, WindowProps>(function Window(
  {
    title,
    theme = "aakash",
    children,
    className = "",
    isActive = true,
    windowState: externalState,
    onWindowStateChange,
    initialPosition = { x: 60, y: 60 },
    initialSize = { width: 560, height: 440 },
    style,
    onClose,
    onFocus,
    contentPadding = true,
    ...props
  },
  ref
) {
  // ── Theme State ────────────────────────────────────────────────────────────
  const isDark = theme === "paatal" || theme === "antariksh"

  // ── State ──────────────────────────────────────────────────────────────────

  const [internalState, setInternalState] = useState<WindowState>("normal")
  const windowState = externalState ?? internalState

  const setWindowState = useCallback(
    (s: WindowState) => {
      setInternalState(s)
      onWindowStateChange?.(s)
    },
    [onWindowStateChange]
  )

  const [position, setPosition] = useState(initialPosition)
  const [size, setSize] = useState(initialSize)
  const [isEntering, setIsEntering] = useState(true)
  const [headerHover, setHeaderHover] = useState(false)

  /** Snapshot before maximize so we can restore */
  const preMaxSnapshot = useRef<{ pos: typeof position; size: typeof size } | null>(null)

  // ── Mount animation ────────────────────────────────────────────────────────
  useEffect(() => {
    const id = requestAnimationFrame(() => setIsEntering(false))
    return () => cancelAnimationFrame(id)
  }, [])

  // ── Drag ───────────────────────────────────────────────────────────────────

  const isDragging = useRef(false)
  const dragStart = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 })

  const handleHeaderPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest("button")) return
    if (windowState === "maximized") return
    onFocus?.()
    isDragging.current = true
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: position.x,
      posY: position.y,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handleHeaderPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!isDragging.current) return
    setPosition({
      x: clamp(
        dragStart.current.posX + e.clientX - dragStart.current.mouseX,
        0,
        window.innerWidth - 120
      ),
      y: clamp(
        dragStart.current.posY + e.clientY - dragStart.current.mouseY,
        32, // stay below the top system bar
        window.innerHeight - 44
      ),
    })
  }

  const handleHeaderPointerUp = (e: React.PointerEvent<HTMLElement>) => {
    isDragging.current = false
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  // ── Resize ─────────────────────────────────────────────────────────────────

  const isResizing = useRef(false)
  const resizeStart = useRef({ mouseX: 0, mouseY: 0, w: 0, h: 0 })

  const handleResizePointerDown = (e: React.PointerEvent<HTMLSpanElement>) => {
    e.stopPropagation()
    if (windowState === "maximized") return
    onFocus?.()
    isResizing.current = true
    resizeStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      w: size.width,
      h: size.height,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handleResizePointerMove = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (!isResizing.current) return
    setSize({
      width: clamp(
        resizeStart.current.w + e.clientX - resizeStart.current.mouseX,
        300,
        window.innerWidth
      ),
      height: clamp(
        resizeStart.current.h + e.clientY - resizeStart.current.mouseY,
        160,
        window.innerHeight
      ),
    })
  }

  const handleResizePointerUp = (e: React.PointerEvent<HTMLSpanElement>) => {
    isResizing.current = false
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  // ── Window controls ────────────────────────────────────────────────────────

  const handleClose = () => onClose?.()

  const handleMinimize = () =>
    setWindowState(windowState === "minimized" ? "normal" : "minimized")

  const handleMaximize = () => {
    if (windowState === "maximized") {
      if (preMaxSnapshot.current) {
        setPosition(preMaxSnapshot.current.pos)
        setSize(preMaxSnapshot.current.size)
      }
      setWindowState("normal")
    } else {
      preMaxSnapshot.current = { pos: position, size }
      setWindowState("maximized")
    }
  }

  // ── Keyboard: Escape closes focused window ─────────────────────────────────

  useEffect(() => {
    if (!isActive) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [isActive, onClose])

  // ── Computed styles ────────────────────────────────────────────────────────

  const isMaximized = windowState === "maximized"
  const isMinimized = windowState === "minimized"

  const sectionStyle: React.CSSProperties = isMaximized
    ? {
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        borderRadius: 0,
        transition: "top 0.25s cubic-bezier(0.4,0,0.2,1), left 0.25s cubic-bezier(0.4,0,0.2,1), width 0.25s cubic-bezier(0.4,0,0.2,1), height 0.25s cubic-bezier(0.4,0,0.2,1)",
      }
    : isMinimized
    ? {
        top: position.y,
        left: position.x,
        width: size.width,
        height: 44,
        overflow: "hidden",
        transition: "height 0.22s cubic-bezier(0.4,0,0.2,1), opacity 0.22s ease",
      }
    : {
        top: position.y,
        left: position.x,
        width: size.width,
        height: size.height,
        transition: isEntering
          ? "opacity 0.18s ease, transform 0.18s cubic-bezier(0.34,1.56,0.64,1)"
          : "box-shadow 0.2s ease, opacity 0.2s ease",
      }

  const enterStyle: React.CSSProperties = isEntering
    ? { opacity: 0, transform: "scale(0.96) translateY(8px)" }
    : { opacity: 1, transform: "scale(1) translateY(0)" }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <section
      ref={ref}
      role="dialog"
      aria-label={title}
      aria-modal
      onPointerDown={onFocus}
      style={{
        ...style,
        ...sectionStyle,
        ...(!isMaximized && !isMinimized ? enterStyle : {}),
      }}
      className={[
        "fixed z-20 flex flex-col overflow-hidden",
        isMaximized ? "" : "rounded-xl",
        // Window chrome border (Adaptive)
        "border",
        isActive
          ? (isDark ? "border-slate-600/80" : "border-[#b8cfe8]/60")
          : (isDark ? "border-slate-700/50" : "border-[#cdd6e0]/40"),
        // Shadow (Adaptive)
        isActive
          ? (isDark 
              ? "shadow-[0_28px_70px_rgba(0,0,0,0.8),0_4px_16px_rgba(0,0,0,0.5)]" 
              : "shadow-[0_28px_70px_rgba(30,80,160,0.30),0_4px_16px_rgba(0,0,0,0.18)]")
          : (isDark
              ? "shadow-[0_10px_30px_rgba(0,0,0,0.6)] opacity-90"
              : "shadow-[0_10px_30px_rgba(0,0,0,0.12)] opacity-85"),
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {/* ── Title Bar ─────────────────────────────────────────────────────── */}
      <header
        onPointerDown={handleHeaderPointerDown}
        onPointerMove={handleHeaderPointerMove}
        onPointerUp={handleHeaderPointerUp}
        onPointerCancel={handleHeaderPointerUp}
        onDoubleClick={handleMaximize}
        onMouseEnter={() => setHeaderHover(true)}
        onMouseLeave={() => setHeaderHover(false)}
        className={[
          "group flex flex-shrink-0 items-center justify-between px-3 select-none touch-none h-11",
          isMaximized ? "cursor-default" : "cursor-grab active:cursor-grabbing",
          // Adaptive Header Gradient
          isActive
            ? (isDark ? "bg-gradient-to-b from-slate-800 to-slate-900" : "bg-gradient-to-b from-[#dce8f5] to-[#c8ddf0]")
            : (isDark ? "bg-gradient-to-b from-slate-800/80 to-slate-900/80" : "bg-gradient-to-b from-[#e8ecf0] to-[#dde2e8]"),
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          boxShadow: isActive
            ? (isDark 
                ? "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.6), 0 1px 3px rgba(0,0,0,0.4)" 
                : "inset 0 1px 0 rgba(255,255,255,0.85), inset 0 -1px 0 rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.08)")
            : (isDark
                ? "inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.4)"
                : "inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -1px 0 rgba(0,0,0,0.04)"),
        }}
      >
        {/* Traffic lights */}
        <div className="flex items-center gap-[7px] w-[4.5rem]">
          <TrafficBtn
            color="red"
            label="Close"
            showIcons={headerHover}
            onClick={handleClose}
            disabled={!onClose}
            icon={
              <svg width="6" height="6" viewBox="0 0 6 6" fill="none">
                <path d="M1 1l4 4M5 1L1 5" stroke="rgba(0,0,0,0.5)" strokeWidth="1.1" strokeLinecap="round"/>
              </svg>
            }
          />
          <TrafficBtn
            color="yellow"
            label={isMinimized ? "Restore" : "Minimise"}
            showIcons={headerHover}
            onClick={handleMinimize}
            icon={
              <svg width="6" height="2" viewBox="0 0 6 2" fill="none">
                <path d="M0.5 1h5" stroke="rgba(0,0,0,0.5)" strokeWidth="1.1" strokeLinecap="round"/>
              </svg>
            }
          />
          <TrafficBtn
            color="green"
            label={isMaximized ? "Restore" : "Maximise"}
            showIcons={headerHover}
            onClick={handleMaximize}
            icon={
              isMaximized ? (
                <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                  <path d="M2 1H6V5M1 2v4h4" stroke="rgba(0,0,0,0.5)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="6" height="6" viewBox="0 0 6 6" fill="none">
                  <rect x="0.75" y="0.75" width="4.5" height="4.5" rx="0.5" stroke="rgba(0,0,0,0.5)" strokeWidth="1"/>
                </svg>
              )
            }
          />
        </div>

        {/* Title pill */}
        <div
          className={[
            "max-w-[54%] truncate rounded-md px-3 py-1 text-[11.5px] font-semibold tracking-wide leading-none",
            // Adaptive Title Pill
            isActive
              ? (isDark 
                  ? "bg-slate-700/80 text-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]" 
                  : "bg-white/70 text-[#1e3a5f] shadow-[0_1px_2px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.9)]")
              : (isDark
                  ? "bg-slate-700/40 text-slate-400"
                  : "bg-white/40 text-[#6b7a8a]"),
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {title}
        </div>

        {/* Right spacer – mirrors traffic-light width */}
        <div className="w-[4.5rem]" aria-hidden />
      </header>

      {/* ── Content Area ──────────────────────────────────────────────────── */}
      {!isMinimized && (
        <div
          className="relative flex-1 overflow-hidden"
          style={{
            // Adaptive Base Background
            background: isActive
              ? (isDark ? "linear-gradient(160deg, #1e293b 0%, #0f172a 100%)" : "linear-gradient(160deg, #eef3f8 0%, #e8eef5 100%)")
              : (isDark ? "#1e293b" : "#f0f2f5"),
          }}
        >
          {/* Inner content wrapper */}
          <div
            className={[
              "h-full overflow-y-auto",
              contentPadding
                ? (isDark 
                    ? "m-2.5 rounded-lg bg-slate-900 text-slate-200 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)] border border-slate-700/80" 
                    : "m-2.5 rounded-lg bg-white text-sm text-slate-800 shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)] border border-slate-200/80")
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {children}
          </div>

          {/* Resize grip – bottom-right corner */}
          {!isMaximized && (
            <span
              onPointerDown={handleResizePointerDown}
              onPointerMove={handleResizePointerMove}
              onPointerUp={handleResizePointerUp}
              onPointerCancel={handleResizePointerUp}
              aria-label="Resize window"
              className="absolute bottom-0 right-0 z-10 h-6 w-6 cursor-se-resize touch-none select-none flex items-end justify-end pb-[4px] pr-[4px] group/resize"
            >
              {/* 3-dot resize indicator, macOS style */}
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="transition-opacity opacity-40 group-hover/resize:opacity-80">
                <circle cx="9.5" cy="9.5" r="1" fill={isDark ? "#94a3b8" : "#7a95b0"}/>
                <circle cx="5.5" cy="9.5" r="1" fill={isDark ? "#94a3b8" : "#7a95b0"}/>
                <circle cx="9.5" cy="5.5" r="1" fill={isDark ? "#94a3b8" : "#7a95b0"}/>
                <circle cx="1.5" cy="9.5" r="1" fill={isDark ? "#94a3b8" : "#7a95b0"}/>
                <circle cx="5.5" cy="5.5" r="1" fill={isDark ? "#94a3b8" : "#7a95b0"}/>
                <circle cx="9.5" cy="1.5" r="1" fill={isDark ? "#94a3b8" : "#7a95b0"}/>
              </svg>
            </span>
          )}
        </div>
      )}
    </section>
  )
})

Window.displayName = "Window"

export default Window