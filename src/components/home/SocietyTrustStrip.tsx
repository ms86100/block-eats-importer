import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Users, Store, Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function SocietyTrustStrip() {
  const { effectiveSociety, effectiveSocietyId, isApproved } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['society-trust-strip', effectiveSocietyId],
    queryFn: async () => {
      if (!effectiveSocietyId) return null;

      const [{ count: sellerCount }, { data: society }] = await Promise.all([
        supabase
          .from('seller_profiles')
          .select('id', { count: 'exact', head: true })
          .eq('society_id', effectiveSocietyId)
          .eq('verification_status', 'approved'),
        supabase
          .from('societies')
          .select('member_count, is_verified')
          .eq('id', effectiveSocietyId)
          .maybeSingle(),
      ]);

      return {
        families: society?.member_count || 0,
        sellers: sellerCount || 0,
        isVerified: society?.is_verified || false,
      };
    },
    enabled: !!isApproved && !!effectiveSocietyId,
    staleTime: 5 * 60_000,
  });

  if (!effectiveSociety || isLoading) {
    return (
      <div className="mx-4 mt-2">
        <Skeleton className="h-8 w-full rounded-full" />
      </div>
    );
  }

  if (!stats || (stats.families === 0 && stats.sellers === 0)) return null;

  return (
    <div className="mx-4 mt-2">
      <div className="flex items-center gap-2 bg-primary/5 border border-primary/10 rounded-full px-3 py-1.5 overflow-x-auto scrollbar-hide">
        {stats.isVerified && (
          <Shield size={12} className="text-primary shrink-0" />
        )}
        <span className="text-[11px] font-bold text-foreground whitespace-nowrap truncate">
          {effectiveSociety.name}
        </span>
        <span className="text-border">·</span>
        <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground whitespace-nowrap">
          <Users size={9} className="shrink-0" />
          {stats.families} families
        </span>
        <span className="text-border">·</span>
        <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground whitespace-nowrap">
          <Store size={9} className="shrink-0" />
          {stats.sellers} sellers
        </span>
      </div>
    </div>
  );
}
