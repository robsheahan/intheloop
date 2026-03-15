import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { User, Session } from '@supabase/supabase-js';
import { supabase, withTimeout } from '@/lib/supabase/client';
import { Profile } from '@tmw/shared/types/database';
import { registerForPushNotifications, upsertPushToken } from '@/lib/push-notifications';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isGuest: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  continueAsGuest: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function useProtectedRoute(user: User | null, isLoading: boolean, isGuest: boolean) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inDashboardGroup = segments[0] === '(dashboard)';

    if (!user && !isGuest && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && !inDashboardGroup) {
      router.replace('/(dashboard)/dashboard');
    } else if (isGuest && !user && !inAuthGroup && !inDashboardGroup) {
      router.replace('/(dashboard)/dashboard');
    }
  }, [user, segments, isLoading, isGuest]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const router = useRouter();
  const pushRegistered = useRef(false);

  const registerPush = async (userId: string) => {
    if (pushRegistered.current) return;
    pushRegistered.current = true;
    try {
      const token = await registerForPushNotifications();
      if (token) {
        await upsertPushToken(userId, token);
      }
    } catch (err) {
      console.error('Push registration error:', err);
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
      );
      if (error) {
        console.warn('Failed to fetch profile:', error.message);
      }
      setProfile(data);
    } catch {
      // Timeout — profile will load on next attempt
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    const getSession = async () => {
      try {
        const {
          data: { session },
        } = await withTimeout(supabase.auth.getSession());
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id);
          registerPush(session.user.id);
        }
      } catch (err) {
        console.error('Failed to get session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setIsGuest(false);
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error('Auth state change error:', err);
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useProtectedRoute(user, isLoading, isGuest);

  const continueAsGuest = () => {
    setIsGuest(true);
  };

  const signOut = async () => {
    setUser(null);
    setProfile(null);
    setSession(null);
    setIsGuest(false);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Failed to sign out:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoading,
        isGuest,
        signOut,
        refreshProfile,
        continueAsGuest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
