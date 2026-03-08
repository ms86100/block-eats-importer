import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Star, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '@/hooks/useCurrency';

interface TopSeller {
  id: string;
  business_name: string;
  profile_image_url: string | null;
  rating: number;
  completed_order_count: number;
}

interface TopProduct {
  product_id: string;
  product_name: string;
  image_url: string | null;
  order_count: number;
  seller_name: string;
  seller_id: string;
  price: number;
}

export function SocietyLeaderboard() {
  const { effectiveSocietyId } = useAuth();
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const [topSellers, setTopSellers] = useState<TopSeller[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!effectiveSocietyId) return;
    fetchLeaderboard();
  }, [effectiveSocietyId]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    const [sellersRes, productsRes] = await Promise.all([
      supabase
        .from('seller_profiles')
        .select('id, business_name, profile_image_url, rating, completed_order_count')
        .eq('society_id', effectiveSocietyId!)
        .eq('verification_status', 'approved')
        .gt('completed_order_count', 0)
        .order('completed_order_count', { ascending: false })
        .limit(5),
      supabase
        .from('order_items')
        .select('product_id, product_name, quantity, product:products(image_url, price, seller_id, seller:seller_profiles(business_name))')
        .limit(200),
    ]);

    setTopSellers((sellersRes.data || []) as TopSeller[]);

    // Aggregate top products manually
    const productMap = new Map<string, TopProduct>();
    for (const item of (productsRes.data || []) as any[]) {
      if (!item.product_id) continue;
      const existing = productMap.get(item.product_id);
      if (existing) {
        existing.order_count += item.quantity || 1;
      } else {
        productMap.set(item.product_id, {
          product_id: item.product_id,
          product_name: item.product_name,
          image_url: item.product?.image_url || null,
          order_count: item.quantity || 1,
          seller_name: item.product?.seller?.business_name || '',
          seller_id: item.product?.seller_id || '',
          price: item.product?.price || 0,
        });
      }
    }
    setTopProducts([...productMap.values()].sort((a, b) => b.order_count - a.order_count).slice(0, 5));
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (topSellers.length === 0 && topProducts.length === 0) return null;

  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

  return (
    <div className="space-y-4 px-4">
      {/* Top Sellers */}
      {topSellers.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={16} className="text-primary" />
            <h3 className="font-bold text-sm">Top Sellers in Your Society</h3>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {topSellers.map((s, i) => (
              <Card
                key={s.id}
                className="shrink-0 w-28 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/seller/${s.id}`)}
              >
                <CardContent className="p-3 text-center space-y-1">
                  <span className="text-lg">{medals[i]}</span>
                  {s.profile_image_url ? (
                    <img src={s.profile_image_url} alt="" className="w-10 h-10 rounded-full mx-auto object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full mx-auto bg-muted flex items-center justify-center">
                      <ShoppingBag size={16} className="text-muted-foreground" />
                    </div>
                  )}
                  <p className="text-[11px] font-semibold truncate">{s.business_name}</p>
                  <div className="flex items-center justify-center gap-0.5">
                    <Star size={10} className="text-primary fill-primary" />
                    <span className="text-[10px] font-medium">{s.rating.toFixed(1)}</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground">{s.completed_order_count} orders</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Most Ordered Products */}
      {topProducts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag size={16} className="text-primary" />
            <h3 className="font-bold text-sm">Most Ordered Products</h3>
          </div>
          <div className="space-y-2">
            {topProducts.map((p, i) => (
              <div
                key={p.product_id}
                className="flex items-center gap-3 p-2 rounded-xl bg-card border cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() => navigate(`/seller/${p.seller_id}`)}
              >
                <span className="text-base shrink-0">{medals[i]}</span>
                {p.image_url ? (
                  <img src={p.image_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <ShoppingBag size={14} className="text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{p.product_name}</p>
                  <p className="text-[10px] text-muted-foreground">{p.seller_name} · {formatPrice(p.price)}</p>
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {p.order_count} ordered
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
