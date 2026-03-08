import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    // Get active recurring configs that haven't ended
    const { data: configs, error: configErr } = await supabase
      .from("service_recurring_configs")
      .select("*")
      .eq("is_active", true)
      .or(`end_date.is.null,end_date.gte.${todayStr}`);

    if (configErr) throw configErr;
    if (!configs?.length) {
      return new Response(
        JSON.stringify({ message: "No active recurring configs", bookings_created: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalCreated = 0;
    let errors = 0;

    for (const config of configs) {
      try {
        // Calculate next booking date
        const lastGenerated = config.last_generated_date
          ? new Date(config.last_generated_date)
          : new Date(config.start_date);

        let nextDate = new Date(lastGenerated);
        const daysToAdd =
          config.frequency === "weekly" ? 7 :
          config.frequency === "biweekly" ? 14 : 30;

        nextDate.setDate(nextDate.getDate() + daysToAdd);
        const nextDateStr = nextDate.toISOString().split("T")[0];

        // Skip if next date is too far ahead (>14 days) or in the past
        const daysAhead = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysAhead > 14 || daysAhead < 0) continue;

        // Check end_date - deactivate if past
        if (config.end_date && nextDateStr > config.end_date) {
          await supabase
            .from("service_recurring_configs")
            .update({ is_active: false })
            .eq("id", config.id);
          continue;
        }

        // Find an available slot
        const timeStr = config.preferred_time;
        const { data: slot } = await supabase
          .from("service_slots")
          .select("*")
          .eq("product_id", config.product_id)
          .eq("slot_date", nextDateStr)
          .eq("start_time", timeStr)
          .eq("is_blocked", false)
          .maybeSingle();

        if (!slot || slot.booked_count >= slot.max_capacity) {
          console.log(`No available slot for recurring ${config.id} on ${nextDateStr} at ${timeStr}`);
          continue;
        }

        // Get product info for order_items
        const { data: product } = await supabase
          .from("products")
          .select("name, price")
          .eq("id", config.product_id)
          .single();

        const productPrice = product?.price || 0;
        const productName = product?.name || "Recurring Service";

        // Create order
        const { data: order, error: orderErr } = await supabase
          .from("orders")
          .insert({
            buyer_id: config.buyer_id,
            seller_id: config.seller_id,
            status: "confirmed",
            total_amount: productPrice,
            payment_type: "cod",
            payment_status: "pending",
            order_type: "booking",
            notes: `Auto-generated recurring booking (${config.frequency})`,
          })
          .select("id")
          .single();

        if (orderErr || !order) {
          console.error("Failed to create order for recurring", config.id, orderErr);
          errors++;
          continue;
        }

        // Create order item (was missing before!)
        await supabase.from("order_items").insert({
          order_id: order.id,
          product_id: config.product_id,
          product_name: productName,
          quantity: 1,
          unit_price: productPrice,
        });

        // Use atomic book_service_slot RPC to prevent race conditions
        const { data: bookResult, error: bookErr } = await supabase.rpc("book_service_slot", {
          _slot_id: slot.id,
          _buyer_id: config.buyer_id,
          _seller_id: config.seller_id,
          _product_id: config.product_id,
          _order_id: order.id,
          _booking_date: nextDateStr,
          _start_time: slot.start_time,
          _end_time: slot.end_time,
          _location_type: "at_seller",
        });

        if (bookErr || !(bookResult as any)?.success) {
          // Rollback order
          await supabase.from("order_items").delete().eq("order_id", order.id);
          await supabase.from("orders").delete().eq("id", order.id);
          console.error("Failed to book slot for recurring", config.id, bookErr || (bookResult as any)?.error);
          errors++;
          continue;
        }

        // Override status to confirmed (book_service_slot sets it to 'requested')
        await supabase
          .from("service_bookings")
          .update({ status: "confirmed" })
          .eq("id", (bookResult as any).booking_id);

        await supabase
          .from("orders")
          .update({ status: "confirmed" })
          .eq("id", order.id);

        // Update last generated date
        await supabase
          .from("service_recurring_configs")
          .update({ last_generated_date: nextDateStr })
          .eq("id", config.id);

        // Send notification to buyer
        await supabase.from("notification_queue").insert({
          user_id: config.buyer_id,
          type: "appointment_reminder",
          title: "🔄 Recurring Booking Created",
          body: `Your recurring ${productName} has been scheduled for ${nextDateStr} at ${timeStr.slice(0, 5)}`,
          reference_path: `/orders/${order.id}`,
          payload: { orderId: order.id, type: "recurring_booking_created" },
        });

        totalCreated++;
      } catch (configProcessErr) {
        console.error(`Failed to process recurring config ${config.id}:`, configProcessErr);
        errors++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, bookings_created: totalCreated, errors, configs_checked: configs.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("process-recurring-bookings error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
