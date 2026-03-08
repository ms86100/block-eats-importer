import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RefreshCw, ChevronRight, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCurrency } from '@/hooks/useCurrency';
import { useMarketplaceLabels } from '@/hooks/useMarketplaceLabels';
import { useQueryClient } from '@tanstack/react-query';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { motion } from 'framer-motion';

interface LastOrder {
  id: string;
  seller_name: string;
  item_count: number;
  total_amount: number;
  created_at: string;
  items: { product_id: string; quantity: number }[];
}

export function ReorderLastOrder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formatPrice } = useCurrency();
  const ml = useMarketplaceLabels();
  const [lastOrder, setLastOrder] = useState<LastOrder | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [hasExistingCart, setHasExistingCart] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('orders')
      .select(`
        id, total_amount, created_at,
        seller:seller_profiles!orders_seller_id_fkey(business_name),
        order_items(product_id, quantity)
      `)
      .eq('buyer_id', user.id)
      .in('status', ['completed', 'delivered'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data && data.order_items?.length > 0) {
          setLastOrder({
            id: data.id,
            seller_name: (data.seller as any)?.business_name || 'Seller',
            item_count: data.order_items.length,
            total_amount: data.total_amount,
            created_at: data.created_at,
            items: data.order_items.map((i: any) => ({
              product_id: i.product_id,
              quantity: i.quantity,
            })),
          });
        }
      });
  }, [user]);

  if (!lastOrder) return null;

  const handleReorder = async () => {
    if (!user) return;
    setIsLoading(true);
    
    try {
      const { data: existingCart } = await supabase
        .from('cart_items')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (existingCart && existingCart.length > 0) {
        setHasExistingCart(true);
        setShowConfirm(true);
        setIsLoading(false);
        return;
      }
    } catch {
      setIsLoading(false);
      return;
    }

    await executeReorder();
  };

  const executeReorder = async () => {
    if (!user || !lastOrder) return;
    setShowConfirm(false);

    setIsLoading(true);
    try {
      const productIds = lastOrder.items.map(i => i.product_id).filter(Boolean);
      const { data: available } = await supabase
        .from('products')
        .select('id, price')
        .in('id', productIds)
        .eq('is_available', true);

      if (!available?.length) {
        toast.error(ml.label('label_reorder_unavailable'));
        setIsLoading(false);
        return;
      }

      const availableSet = new Set(available.map(p => p.id));
      const unavailableCount = productIds.length - availableSet.size;

      await supabase.from('cart_items').delete().eq('user_id', user.id);
      const inserts = lastOrder.items
        .filter(i => availableSet.has(i.product_id))
        .map(i => ({ user_id: user.id, product_id: i.product_id, quantity: i.quantity }));

      const { error } = await supabase.from('cart_items').insert(inserts);
      if (error) throw error;

      if (unavailableCount > 0) {
        toast.info(`${unavailableCount} item(s) were unavailable and skipped`);
      }
      toast.success(ml.label('label_reorder_success'));
      queryClient.invalidateQueries({ queryKey: ['cart-items'] });
      queryClient.invalidateQueries({ queryKey: ['cart-count'] });
      navigate('/cart');
    } catch {
      toast.error('Failed to reorder');
    } finally {
      setIsLoading(false);
    }
  };

  const daysAgo = Math.floor((Date.now() - new Date(lastOrder.created_at).getTime()) / 86400000);
  const timeLabel = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mx-4 mt-3"
    >
      <button
        onClick={handleReorder}
        disabled={isLoading}
        className="w-full flex items-center gap-3 bg-card border border-border rounded-2xl p-3.5 active:scale-[0.98] transition-all hover:shadow-md hover:border-primary/20 group"
      >
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
          <RefreshCw size={18} className={`text-primary ${isLoading ? 'animate-spin' : ''}`} />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[13px] font-bold text-foreground truncate">
            {ml.label('label_reorder_prefix')} {lastOrder.seller_name}
          </p>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <span>{lastOrder.item_count} item{lastOrder.item_count !== 1 ? 's' : ''}</span>
            <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/50" />
            <span className="font-semibold text-foreground">{formatPrice(lastOrder.total_amount)}</span>
            <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/50" />
            <span className="inline-flex items-center gap-0.5"><Clock size={9} />{timeLabel}</span>
          </p>
        </div>
        <ChevronRight size={16} className="text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
      </button>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace cart?</AlertDialogTitle>
            <AlertDialogDescription>Your current cart will be cleared and replaced with items from your previous order.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeReorder}>Replace Cart</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
