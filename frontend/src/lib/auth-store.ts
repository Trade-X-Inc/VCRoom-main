import { supabase } from './supabase'
import { create } from 'zustand'

interface AuthState {
  user: any | null
  loading: boolean
  initialized: boolean
  setUser: (user: any | null) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  initialized: false,
  setUser: (user) => set({ user, initialized: true }),
  setLoading: (loading) => set({ loading }),
}))

// Single auth listener for the entire app
let authListenerSetup = false

export function setupAuthListener() {
  if (authListenerSetup) return
  authListenerSetup = true

  // auth.tsx already calls getSession(); rely on INITIAL_SESSION event here
  supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.getState().setUser(session?.user ?? null)
  })
}
