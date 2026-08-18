import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  organization_name: string | null;
  tags: string[];
}

type AppRole = 'admin' | 'user' | 'member';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  canCheckInOut: boolean; // true for admin and user, false for member
  userRole: AppRole | null;
  userTags: string[]; // visibility tags for the current user
  isLoading: boolean;
  roleLoading: boolean; // true until the role fetch for the current session resolves
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canCheckInOut, setCanCheckInOut] = useState(false);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [userTags, setUserTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);

  // Tracks whose profile/role we've already loaded. Guards against re-gating the
  // UI on auth events that don't change the user (e.g. TOKEN_REFRESHED fires
  // every time the tab regains focus). Without this, roleLoading flips back to
  // true, ProtectedRoute unmounts the current screen, and the user is bounced
  // out of whatever they were doing.
  const loadedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const handleSession = (session: Session | null) => {
      const uid = session?.user?.id ?? null;

      // Signed out — clear everything.
      if (!uid) {
        loadedUserIdRef.current = null;
        setSession(null);
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
        setCanCheckInOut(false);
        setUserRole(null);
        setUserTags([]);
        setIsLoading(false);
        setRoleLoading(false);
        return;
      }

      // Same user as already loaded — this is a token refresh, which Supabase
      // fires every time the tab regains focus. Supabase keeps the refreshed
      // token internally, so we deliberately DON'T touch user/session state:
      // handing out a new `user` object reference would re-run every
      // useEffect([user]) across the app (data refetches, loading spinners) and
      // remount pages that gate on those — closing open dialogs and throwing the
      // user out of whatever they were doing.
      if (loadedUserIdRef.current === uid) return;

      // A genuinely new user (first load or account switch): set state once and
      // load their profile/role.
      loadedUserIdRef.current = uid;
      setSession(session);
      setUser(session.user);
      setRoleLoading(true);
      // Defer the fetch so we never call back into Supabase from inside the
      // auth callback (recommended by supabase-js to avoid deadlocks).
      setTimeout(() => fetchProfileAndRole(uid), 0);
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => handleSession(session)
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => handleSession(session));

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfileAndRole = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      } else {
        // Handle tags - ensure it's always an array
        const tags: string[] = Array.isArray(profileData?.tags) ? profileData.tags : [];
        setProfile(profileData ? { ...profileData, tags } : null);
        setUserTags(tags);
      }

      // Fetch role - check user roles
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (roleError) {
        console.error('Error fetching roles:', roleError);
      } else {
        const hasAdminRole = roleData?.some(r => r.role === 'admin') ?? false;
        const hasUserRole = roleData?.some(r => r.role === 'user') ?? false;
        const hasMemberRole = roleData?.some(r => r.role === 'member') ?? false;
        
        setIsAdmin(hasAdminRole);
        // Admin and User can check in/out, Member cannot
        setCanCheckInOut(hasAdminRole || hasUserRole);
        
        // Set primary role
        if (hasAdminRole) {
          setUserRole('admin');
        } else if (hasUserRole) {
          setUserRole('user');
        } else if (hasMemberRole) {
          setUserRole('member');
        } else {
          setUserRole(null);
        }
      }
    } catch (error) {
      console.error('Error in fetchProfileAndRole:', error);
    } finally {
      setIsLoading(false);
      setRoleLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
    setCanCheckInOut(false);
    setUserRole(null);
    setUserTags([]);
    setRoleLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, isAdmin, canCheckInOut, userRole, userTags, isLoading, roleLoading, signOut }}>
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
