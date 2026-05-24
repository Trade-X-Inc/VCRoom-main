import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

type Role = 'founder' | 'investor'

interface AppUser {
  id: string
  email: string
  fullName: string
  role: Role
}

interface AuthContextType {
  user: AppUser | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {}
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  const buildUser = async (supabaseUser: any): Promise<AppUser> => {
    const { data } = await supabase
      .from('users')
      .select('role, full_name')
      .eq('id', supabaseUser.id)
      .maybeSingle()

    const role: Role = (
      data?.role ||
      supabaseUser.user_metadata?.role ||
      'founder'
    ) as Role

    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      fullName:
        data?.full_name ||
        supabaseUser.user_metadata?.full_name ||
        supabaseUser.user_metadata?.name ||
        supabaseUser.email?.split('@')[0] || '',
      role
    }
  }

  useEffect(() => {
    const currentUserIdRef = { current: null as string | null }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const appUser = await buildUser(session.user)
        currentUserIdRef.current = appUser.id
        setUser(appUser)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          setLoading(false)
          return
        }
        if (session?.user) {
          if (currentUserIdRef.current === session.user.id) {
            setLoading(false)
            return
          }
          const appUser = await buildUser(session.user)
          currentUserIdRef.current = appUser.id
          setUser(appUser)
        } else {
          currentUserIdRef.current = null
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    window.location.href = '/sign-in'
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
