import { create } from 'zustand'

interface ToastState {
  message: string | null
  key: number
  show: (message: string) => void
  hide: () => void
}

let timer: ReturnType<typeof setTimeout> | undefined

export const useToast = create<ToastState>((set) => ({
  message: null,
  key: 0,
  show: (message) => {
    clearTimeout(timer)
    set((s) => ({ message, key: s.key + 1 }))
    timer = setTimeout(() => set({ message: null }), 2800)
  },
  hide: () => set({ message: null })
}))

export const toast = (message: string) => useToast.getState().show(message)
