import { useCommunitySearchSuggestions } from '@/hooks/queries/useCommunitySearchSuggestions';
import { Users, TrendingUp } from 'lucide-react';

interface CommunitySuggestionsProps {
  onSuggestionTap: (term: string) => void;
}

/**
 * Shows "People in your society also searched for..." suggestions.
 * Only renders when there are popular community search terms.
 */
export function CommunitySuggestions({ onSuggestionTap }: CommunitySuggestionsProps) {
  const { data: suggestions = [] } = useCommunitySearchSuggestions();

  if (suggestions.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 mb-2">
        <Users size={12} className="text-muted-foreground" />
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Popular in your society
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map(({ term, count }) => (
          <button
            key={term}
            onClick={() => onSuggestionTap(term)}
            className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-primary/10 border border-border hover:border-primary/30 transition-colors"
          >
            <TrendingUp size={10} className="text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-xs font-medium text-foreground">{term}</span>
            <span className="text-[9px] text-muted-foreground">
              {count}×
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
