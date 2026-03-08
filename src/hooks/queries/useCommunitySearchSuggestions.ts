import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { jitteredStaleTime } from '@/lib/query-utils';

export interface SearchSuggestion {
  term: string;
  count: number;
}

/**
 * Fetches popular search terms from the user's society.
 * Powers "People in your society also searched for..." suggestions.
 */
export function useCommunitySearchSuggestions(limit = 8) {
  const { effectiveSocietyId } = useAuth();

  return useQuery({
    queryKey: ['community-search-suggestions', effectiveSocietyId],
    queryFn: async (): Promise<SearchSuggestion[]> => {
      const { data, error } = await supabase
        .from('search_demand_log')
        .select('search_term')
        .eq('society_id', effectiveSocietyId!)
        .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(200);

      if (error || !data) return [];

      // Aggregate by search term
      const counts = new Map<string, number>();
      for (const row of data) {
        const term = row.search_term?.toLowerCase().trim();
        if (term && term.length >= 2) {
          counts.set(term, (counts.get(term) || 0) + 1);
        }
      }

      return [...counts.entries()]
        .filter(([, count]) => count >= 2) // Only show terms searched by 2+ people
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([term, count]) => ({ term, count }));
    },
    enabled: !!effectiveSocietyId,
    staleTime: jitteredStaleTime(10 * 60 * 1000),
  });
}
