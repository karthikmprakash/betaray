"use client"
import { create } from 'zustand'

type AppState = {
  currentProject: string
  setProject: (k: string) => void
  search: string
  setSearch: (s: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentProject: "BET",
  setProject: (k) => set({ currentProject: k }),
  search: "",
  setSearch: (s) => set({ search: s }),
}))
