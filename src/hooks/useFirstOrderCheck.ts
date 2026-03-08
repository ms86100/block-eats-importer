import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Batch-check whether the current user has prior completed orders
 * with each seller in a given list. Returns a Set of seller IDs
 * where the user has NEVER ordered before (first-order eligible).
 */
export function useFirstOrderCheck(userId: string | undefined, sellerIds: string[]) {
  const [firstOrderSellerIds, setFirstOrderSellerIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId || sellerIds.length === 0) {
      setFirstOrderSellerIds(new Set());
      return;
    }

    const check = async () => {
      // Get distinct seller IDs where user has at least one completed order
      const { data } = await supabase
        .from('orders')
        .select('seller_id')
        .eq('buyer_id', userId)
        .in('seller_id', sellerIds)
        .in('status', ['completed', 'delivered', 'ready']);

      const sellersWithHistory = new Set((data || []).map(r => r.seller_id));
      const firstTimeSellers = new Set(sellerIds.filter(id => !sellersWithHistory.has(id)));
      setFirstOrderSellerIds(firstTimeSellers);
    };

    check();
  }, [userId, sellerIds.join(',')]);

  return firstOrderSellerIds;
}
