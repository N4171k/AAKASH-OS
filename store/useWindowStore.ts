import { create } from 'zustand'

interface WindowInstance {
  id: string
  title: string
  isMaximized: boolean
  isMinimized: boolean
  payload?: unknown
}

interface WindowStore {
  windows: WindowInstance[]
  activeId: string | null
  openWindow: (id: string, title: string, payload?: unknown) => void
  closeWindow: (id: string) => void
  minimizeWindow: (id: string) => void
  toggleMaximizeWindow: (id: string) => void
  focusWindow: (id: string) => void
}

export const useWindowStore = create<WindowStore>((set, get) => ({
  windows: [],
  activeId: null,

  openWindow: (id, title, payload) => set((state) => {
    const exists = state.windows.some(w => w.id === id)
    const updatedWindows = exists
      ? state.windows.map(w => w.id === id ? { ...w, isMinimized: false, ...(payload !== undefined ? { payload } : {}) } : w)
      : [...state.windows, { id, title, isMaximized: false, isMinimized: false, ...(payload !== undefined ? { payload } : {}) }]
    return { windows: updatedWindows, activeId: id }
  }),

  closeWindow: (id) => set((state) => {
    const filtered = state.windows.filter(w => w.id !== id)
    const nextActive = filtered.length > 0 ? filtered[filtered.length - 1].id : null
    return { windows: filtered, activeId: nextActive }
  }),

  minimizeWindow: (id) => set((state) => {
    const updated = state.windows.map(w => w.id === id ? { ...w, isMinimized: true } : w)
    const openVisible = updated.filter(w => !w.isMinimized)
    const nextActive = openVisible.length > 0 ? openVisible[openVisible.length - 1].id : null
    return { windows: updated, activeId: nextActive }
  }),

  toggleMaximizeWindow: (id) => set((state) => ({
    windows: state.windows.map(w => w.id === id ? { ...w, isMaximized: !w.isMaximized } : w)
  })),

  focusWindow: (id) => set((state) => ({
    activeId: id,
    windows: state.windows.map(w => w.id === id ? { ...w, isMinimized: false } : w)
  }))
}))