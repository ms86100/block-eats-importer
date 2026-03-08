import { useNavigate } from 'react-router-dom';
import { useCommunitySearchSuggestions } from '@/hooks/queries/useCommunitySearchSuggestions';
import { TrendingUp, Users } from 'lucide-react';

/**
 * Compact community search suggestion pills for the homepage.
 * Navigates to search page with the term pre-filled.
 */
export function HomeSearchSuggestions() {
  const navigate = useNavigate();
  const { data: suggestions = [] } = useCommunitySearchSuggestions();

  if (suggestions.length === 0) return null;

  return (
    <div className="px-4 mt-2">
      <div className="flex items-center gap-1 mb-1.5">
        <Users size={10} className="text-muted-foreground" />
        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
          Popular in your society
        </span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        {suggestions.slice(0, 8).map(({ term, count }) => (
          <button
            key={term}
            onClick={() => navigate(`/search?q=${encodeURIComponent(term)}`)}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted hover:bg-primary/10 border border-border hover:border-primary/30 transition-colors"
          >
            <TrendingUp size={8} className="text-muted-foreground" />
            <span className="text-[10px] font-medium text-foreground whitespace-nowrap">{term}</span>
            <span className="text-[8px] text-muted-foreground">{count}×</span>
          </button>
        ))}
      </div>
    </div>
  );
}
