"use client"

import React, { forwardRef } from 'react'

type DesktopIconProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  title: string
  subtitle: string
  accent: string
  icon?: React.ReactNode // Allows passing actual SVGs later
}

const DesktopIcon = forwardRef<HTMLButtonElement, DesktopIconProps>(
  ({ title, subtitle, accent, icon, className = '', onClick, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        className={`group flex w-full items-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 text-left backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10 hover:shadow-xl hover:shadow-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${className}`}
        {...props}
      >
        {/* Icon Container */}
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${accent} shadow-lg shadow-black/20 transition-transform duration-300 group-hover:scale-110`}>
          {icon ? (
            icon
          ) : (
            /* Fallback Icon */
            <img src="/logo.png" alt="app" className="h-5 w-5 rounded-lg object-cover" />
          )}
        </div>

        {/* Text Container */}
        <div className="flex flex-col gap-0.5 overflow-hidden">
          <span className="truncate text-sm font-semibold tracking-wide text-white">
            {title}
          </span>
          <span className="line-clamp-1 text-xs text-slate-300">
            {subtitle}
          </span>
        </div>
      </button>
    )
  }
)

DesktopIcon.displayName = 'DesktopIcon'

export default DesktopIcon