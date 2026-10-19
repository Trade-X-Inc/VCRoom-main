import { supabase } from './supabase'
import { create } from 'zustand'
import { clearRecoverySession, markRecoverySession } from './recovery'

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
    // Password-reset link: record it synchronously so /auth/callback can route to /reset-password.
    if (_event === 'PASSWORD_RECOVERY') markRecoverySession()
    // Signing out (or losing the session) ends a recovery session: there is nothing left to protect.
    if (_event === 'SIGNED_OUT') clearRecoverySession()
    useAuthStore.getState().setUser(session?.user ?? null)
  })
}
