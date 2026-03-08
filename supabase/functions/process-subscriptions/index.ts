import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // [SECURITY FIX] Require service-role authorization (cron or internal call only)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${serviceKey}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized — service role required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const today = new Date().toISOString().split('T')[0];

    // [BUG FIX] Add limit to prevent unbounded query + only process subscriptions due today or overdue
    const { data: subs, error: fetchErr } = await supabase
      .from('subscriptions')
      .select('*, product:products(name, price, seller_id), buyer:profiles!subscriptions_buyer_id_fkey(name, society_id)')
      .eq('status', 'active')
      .lte('next_delivery_date', today)
      .limit(200);

    if (fetchErr) throw fetchErr;

    if (!subs || subs.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let processed = 0;
    const errors: { sub_id: string; error: string }[] = [];

    for (const sub of subs) {
      try {
        // Check delivery day for weekly
        if (sub.frequency === 'weekly' && sub.delivery_days?.length > 0) {
          const dayName = new Date().toLocaleDateString('en-US', { weekday: 'short' });
          if (!sub.delivery_days.includes(dayName)) continue;
        }

        // [BUG FIX] Validate product data exists before creating order
        const product = sub.product as any;
        if (!product?.price || !product?.name) {
          errors.push({ sub_id: sub.id, error: 'Product data missing or deleted' });
          // Pause broken subscription
          await supabase.from('subscriptions').update({ status: 'paused' }).eq('id', sub.id);
          continue;
        }

        const orderTotal = product.price * sub.quantity;
        if (orderTotal <= 0) {
          errors.push({ sub_id: sub.id, error: 'Invalid order total' });
          continue;
        }

        // [BUG FIX] Include required fields: status, payment_status, society_id
        const { data: order, error: orderErr } = await supabase
          .from('orders')
          .insert({
            buyer_id: sub.buyer_id,
            seller_id: sub.seller_id,
            total_amount: orderTotal,
            payment_type: 'cod',
            payment_status: 'pending',
            status: 'placed',
            order_type: 'purchase',
            society_id: (sub.buyer as any)?.society_id || null,
            notes: `Auto-generated from subscription`,
          })
          .select('id')
          .single();

        if (orderErr || !order) {
          errors.push({ sub_id: sub.id, error: orderErr?.message || 'Order creation failed' });
          continue;
        }

        // Create order item
        const { error: itemErr } = await supabase.from('order_items').insert({
          order_id: order.id,
          product_id: sub.product_id,
          product_name: product.name,
          quantity: sub.quantity,
          unit_price: product.price,
        });

        // [BUG FIX] Rollback order if item insert fails
        if (itemErr) {
          await supabase.from('orders').delete().eq('id', order.id);
          errors.push({ sub_id: sub.id, error: `Order item failed: ${itemErr.message}` });
          continue;
        }

        // Record delivery
        await supabase.from('subscription_deliveries').insert({
          subscription_id: sub.id,
          order_id: order.id,
          scheduled_date: today,
        });

        // [BUG FIX] Notify seller about new subscription order
        if (product.seller_id) {
          const { data: sellerProfile } = await supabase
            .from('seller_profiles')
            .select('user_id')
            .eq('id', sub.seller_id)
            .single();

          if (sellerProfile?.user_id) {
            await supabase.from('notification_queue').insert({
              user_id: sellerProfile.user_id,
              type: 'order',
              title: '🔄 Subscription Order',
              body: `Auto-order for ${product.name} (x${sub.quantity}) from a subscriber.`,
              reference_path: `/orders/${order.id}`,
              payload: { orderId: order.id, status: 'placed', type: 'order' },
            });
          }
        }

        // Calculate next delivery date
        let nextDate = new Date(sub.next_delivery_date);
        if (sub.frequency === 'daily') {
          nextDate.setDate(nextDate.getDate() + 1);
        } else if (sub.frequency === 'weekly') {
          nextDate.setDate(nextDate.getDate() + 7);
        } else if (sub.frequency === 'monthly') {
          nextDate.setMonth(nextDate.getMonth() + 1);
        }

        await supabase
          .from('subscriptions')
          .update({ next_delivery_date: nextDate.toISOString().split('T')[0] })
          .eq('id', sub.id);

        processed++;
      } catch (subErr: any) {
        errors.push({ sub_id: sub.id, error: subErr?.message || String(subErr) });
      }
    }

    // [BUG FIX] Trigger notification queue to deliver seller notifications
    if (processed > 0) {
      try {
        await supabase.functions.invoke('process-notification-queue');
      } catch (_) {}
    }

    return new Response(
      JSON.stringify({ processed, errors: errors.length > 0 ? errors : undefined, total: subs.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('process-subscriptions error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});