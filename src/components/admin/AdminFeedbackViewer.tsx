import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

interface FeedbackRow {
  id: string;
  rating: number;
  message: string | null;
  page_context: string | null;
  created_at: string;
  user_id: string;
  profiles: { name: string; email: string; flat_number: string; block: string } | null;
}

export function AdminFeedbackViewer() {
  const { data: feedback, isLoading } = useQuery({
    queryKey: ['admin-feedback'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_feedback' as any)
        .select('*, profiles:profiles!user_feedback_user_id_fkey(name, email, flat_number, block)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as unknown as FeedbackRow[];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
      </div>
    );
  }

  if (!feedback?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-muted/80 flex items-center justify-center mb-3">
          <MessageSquare size={22} className="text-muted-foreground/60" />
        </div>
        <p className="text-sm text-muted-foreground font-medium">No feedback submitted yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground font-medium">{feedback.length} feedback entries</p>
      {feedback.map((item) => (
        <Card key={item.id} className="border-0 shadow-[var(--shadow-card)] rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-sm">{item.profiles?.name || 'Unknown'}</span>
                  {item.profiles?.flat_number && (
                    <span className="text-xs text-muted-foreground">
                      {item.profiles.block && `${item.profiles.block}-`}{item.profiles.flat_number}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 mb-1.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className={i < item.rating ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground/30'}
                    />
                  ))}
                </div>
                {item.message && (
                  <p className="text-sm text-muted-foreground">{item.message}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] text-muted-foreground">
                    {format(new Date(item.created_at), 'dd MMM yyyy, HH:mm')}
                  </span>
                  {item.page_context && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {item.page_context}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
