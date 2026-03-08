import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/hooks/useCart';
import { useHaptics } from '@/hooks/useHaptics';
import { useCurrency } from '@/hooks/useCurrency';
import { RefreshCw, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface BuyAgainProduct {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  seller_id: string;
  seller_name: string;
  order_count: number;
}

export function BuyAgainRow() {
  const { user } = useAuth();
  const { items, addItem } = useCart();
  const { impact } = useHaptics();
  const { formatPrice } = useCurrency();

  const { data: products = [] } = useQuery({
    queryKey: ['buy-again', user?.id],
    queryFn: async (): Promise<BuyAgainProduct[]> => {
      if (!user) return [];

      // Try server-side RPC first
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_frequent_products', {
        _user_id: user.id,
        _limit: 12,
      });

      if (!rpcError && rpcData && rpcData.length > 0) {
        return rpcData.map((r: any) => ({
          id: r.product_id,
          name: r.product_name,
          price: r.price,
          image_url: r.image_url,
          seller_id: r.seller_id || '',
          seller_name: r.seller_name || 'Seller',
          order_count: Number(r.order_count) || 0,
        }));
      }

      // Fallback to client-side aggregation
      if (rpcError) console.warn('[BuyAgain] RPC error, using fallback:', rpcError.message);

      const { data, error } = await supabase
        .from('order_items')
        .select(`
          product_id, quantity,
          product:products!inner(id, name, price, image_url, is_available, seller_id,
            seller:seller_profiles!products_seller_id_fkey(business_name)
          ),
          order:orders!inner(buyer_id, status)
        `)
        .eq('order.buyer_id', user.id)
        .eq('order.status', 'completed')
        .eq('product.is_available', true)
        .limit(100);

      if (error || !data) return [];

      const freq: Record<string, BuyAgainProduct & { count: number }> = {};
      for (const item of data) {
        const p = (item as any).product;
        if (!p) continue;
        const pid = p.id;
        if (!freq[pid]) {
          freq[pid] = {
            id: pid,
            name: p.name,
            price: p.price,
            image_url: p.image_url,
            seller_id: p.seller_id || '',
            seller_name: p.seller?.business_name || 'Seller',
            order_count: 0,
            count: 0,
          };
        }
        freq[pid].count += 1;
        freq[pid].order_count = freq[pid].count;
      }

      return Object.values(freq)
        .sort((a, b) => b.count - a.count)
        .slice(0, 12);
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  if (products.length === 0) return null;

  const isInCart = (productId: string) => items.some(i => i.product_id === productId);

  const handleQuickAdd = (product: BuyAgainProduct) => {
    if (isInCart(product.id)) return;
    if (!product.seller_id) {
      console.error('[BuyAgain] Missing seller_id for product:', product.id);
      toast.error('Cannot add this item — missing seller info');
      return;
    }
    impact('medium');
    addItem({
      id: product.id,
      seller_id: product.seller_id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      category: '' as any,
      is_veg: true,
      is_available: true,
      is_bestseller: false,
      is_recommended: false,
      is_urgent: false,
      description: null,
      created_at: '',
      updated_at: '',
    });
    toast.success(`${product.name} added to cart`);
  };

  return (
    <div className="mt-4">
      <div className="flex items-center gap-1.5 px-4 mb-2.5">
        <RefreshCw size={14} className="text-primary" />
        <h3 className="font-extrabold text-[15px] text-foreground tracking-tight">Buy Again</h3>
      </div>
      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide px-4 pb-1">
        {products.map(product => {
          const inCart = isInCart(product.id);
          return (
            <button
              key={product.id}
              onClick={() => handleQuickAdd(product)}
              className={cn(
                'shrink-0 w-[100px] rounded-xl border bg-card overflow-hidden text-left transition-all',
                inCart ? 'border-primary/30' : 'border-border active:scale-[0.96]'
              )}
            >
              <div className="aspect-square bg-muted relative overflow-hidden">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-contain p-1.5"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">🛒</div>
                )}
                <div className={cn(
                  'absolute bottom-1 right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-sm',
                  inCart ? 'bg-primary' : 'bg-primary'
                )}>
                  {inCart ? (
                    <Check size={10} className="text-primary-foreground" />
                  ) : (
                    <Plus size={10} className="text-primary-foreground" />
                  )}
                </div>
              </div>
              <div className="px-1.5 py-1.5">
                <p className="text-[10px] font-semibold text-foreground line-clamp-2 leading-tight">
                  {product.name}
                </p>
                <p className="text-[10px] font-bold text-primary mt-0.5">{formatPrice(product.price)}</p>
                <p className="text-[8px] text-muted-foreground">
                  Ordered {product.order_count}×
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
