import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

// Loading timeout (5 seconds max)
const LOADING_TIMEOUT = 5000

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)
  const mountedRef = useRef(true)
  const initRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    
    // Check if supabase is configured
    if (!supabase) {
      console.error('Supabase client not initialized - missing env vars')
      setAuthError('Supabase not configured. Check environment variables.')
      setLoading(false)
      return
    }
    
    // Prevent double initialization (React Strict Mode / HMR)
    if (initRef.current) return
    initRef.current = true

    // Loading timeout - prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (mountedRef.current && loading) {
        console.warn('Auth loading timeout - forcing complete')
        setLoading(false)
      }
    }, LOADING_TIMEOUT)

    // Check active sessions
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Session error:', error)
          setAuthError(error.message)
        }
        
        if (mountedRef.current) {
          setUser(session?.user ?? null)
          if (session?.user) {
            await fetchUserProfile(session.user.id)
          }
          setLoading(false)
        }
      } catch (err) {
        console.error('Get session error:', err)
        if (mountedRef.current) {
          setAuthError(err.message)
          setLoading(false)
        }
      }
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email)
      
      if (mountedRef.current) {
        setAuthError(null)
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchUserProfile(session.user.id)
        } else {
          setUserProfile(null)
        }
        setLoading(false)
      }
    })

    return () => {
      mountedRef.current = false
      clearTimeout(loadingTimeout)
      subscription.unsubscribe()
    }
  }, [])

  const fetchUserProfile = async (userId) => {
    try {
      console.log('Fetching profile for user:', userId)
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          branches (id, name)
        `)
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('Error fetching user profile:', error)
        setUserProfile(null)
      } else if (!data) {
        // No profile found - user exists in auth but not in users table
        console.warn('No user profile found in users table for:', userId)
        setUserProfile(null)
      } else {
        console.log('User profile loaded:', data)
        setUserProfile(data)
      }
    } catch (error) {
      console.error('Error:', error)
      setUserProfile(null)
    }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    // If login successful, immediately fetch profile
    if (data?.user && !error) {
      setUser(data.user)
      await fetchUserProfile(data.user.id)
    }
    
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      setUser(null)
      setUserProfile(null)
    }
    return { error }
  }

  const value = {
    user,
    userProfile,
    loading,
    authError,
    signIn,
    signOut,
    isAdmin: userProfile?.role === 'admin',
    isUser: userProfile?.role === 'user',
    refetchProfile: () => user && fetchUserProfile(user.id),
    // Force refresh session - useful after HMR or cache issues
    refreshSession: async () => {
      setLoading(true)
      setAuthError(null)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchUserProfile(session.user.id)
        } else {
          setUserProfile(null)
        }
      } catch (err) {
        console.error('Refresh session error:', err)
        setAuthError(err.message)
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
