import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile, UserRole, SellerProfile, Society, SocietyAdmin } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  society: Society | null;
  roles: UserRole[];
  sellerProfiles: SellerProfile[];
  currentSellerId: string | null;
  isLoading: boolean;
  isApproved: boolean;
  isSeller: boolean;
  isAdmin: boolean;
  isSocietyAdmin: boolean;
  isBuilderMember: boolean;
  societyAdminRole: SocietyAdmin | null;
  managedBuilderIds: string[];
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setCurrentSellerId: (id: string | null) => void;
  // Context switching
  viewAsSocietyId: string | null;
  setViewAsSociety: (id: string | null) => void;
  effectiveSocietyId: string | null;
  effectiveSociety: Society | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [society, setSociety] = useState<Society | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [sellerProfiles, setSellerProfiles] = useState<SellerProfile[]>([]);
  const [currentSellerId, setCurrentSellerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [societyAdminRole, setSocietyAdminRole] = useState<SocietyAdmin | null>(null);
  const [managedBuilderIds, setManagedBuilderIds] = useState<string[]>([]);
  const [viewAsSocietyId, setViewAsSocietyIdState] = useState<string | null>(null);
  const [viewAsSociety, setViewAsSocietyData] = useState<Society | null>(null);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_user_auth_context', {
        _user_id: userId,
      });

      if (error || !data) {
        console.error('Error fetching auth context:', error);
        return;
      }

      const ctx = data as any;

      setProfile(ctx.profile as Profile | null);
      setSociety(ctx.society as Society | null);
      setSocietyAdminRole(ctx.society_admin_role as SocietyAdmin | null);
      setRoles((ctx.roles as UserRole[]) || []);

      const sellers = (ctx.seller_profiles as SellerProfile[]) || [];
      setSellerProfiles(sellers);

      if (sellers.length > 0 && !currentSellerId) {
        setCurrentSellerId(sellers[0].id);
      } else if (sellers.length === 0) {
        setCurrentSellerId(null);
      }

      setManagedBuilderIds((ctx.builder_ids as string[]) || []);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  // Fetch viewed society data when switching context
  const setViewAsSociety = useCallback(async (id: string | null) => {
    setViewAsSocietyIdState(id);
    if (!id) {
      setViewAsSocietyData(null);
      return;
    }
    const { data } = await supabase
      .from('societies')
      .select('*')
      .eq('id', id)
      .single();
    setViewAsSocietyData(data as Society | null);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setSociety(null);
          setRoles([]);
          setSellerProfiles([]);
          setCurrentSellerId(null);
          setSocietyAdminRole(null);
          setManagedBuilderIds([]);
          setViewAsSocietyIdState(null);
          setViewAsSocietyData(null);
        }
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setSociety(null);
    setRoles([]);
    setSellerProfiles([]);
    setCurrentSellerId(null);
    setSocietyAdminRole(null);
    setManagedBuilderIds([]);
    setViewAsSocietyIdState(null);
    setViewAsSocietyData(null);
  };

  const isApproved = profile?.verification_status === 'approved';
  const isSeller = roles.includes('seller') || sellerProfiles.some(s => (s as any).verification_status !== 'draft');
  const isAdmin = roles.includes('admin');
  const isSocietyAdmin = !!societyAdminRole || isAdmin;
  const isBuilderMember = managedBuilderIds.length > 0;

  const effectiveSocietyId = viewAsSocietyId || profile?.society_id || null;
  const effectiveSociety = viewAsSocietyId ? viewAsSociety : society;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        society,
        roles,
        sellerProfiles,
        currentSellerId,
        isLoading,
        isApproved,
        isSeller,
        isAdmin,
        isSocietyAdmin,
        isBuilderMember,
        societyAdminRole,
        managedBuilderIds,
        signOut,
        refreshProfile,
        setCurrentSellerId,
        viewAsSocietyId,
        setViewAsSociety,
        effectiveSocietyId,
        effectiveSociety,
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
