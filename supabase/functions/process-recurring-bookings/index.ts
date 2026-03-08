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

        // Atomically book the slot (prevents overbooking)
        const { data: slotUpdate } = await supabase
          .from("service_slots")
          .update({ booked_count: slot.booked_count + 1 })
          .eq("id", slot.id)
          .lt("booked_count", slot.max_capacity)
          .eq("is_blocked", false)
          .select("id")
          .single();

        if (!slotUpdate) {
          console.log(`Slot race condition for recurring ${config.id}`);
          continue;
        }

        // Create order
        const { data: order, error: orderErr } = await supabase
          .from("orders")
          .insert({
            buyer_id: config.buyer_id,
            seller_id: config.seller_id,
            status: "confirmed",
            total_amount: 0,
            payment_type: "cod",
            payment_status: "pending",
            order_type: "booking",
            notes: `Auto-generated recurring booking (${config.frequency})`,
          })
          .select("id")
          .single();

        if (orderErr || !order) {
          // Rollback slot
          await supabase
            .from("service_slots")
            .update({ booked_count: Math.max(0, slot.booked_count) })
            .eq("id", slot.id);
          console.error("Failed to create order for recurring", config.id, orderErr);
          errors++;
          continue;
        }

        // Create service booking
        const { error: bookErr } = await supabase.from("service_bookings").insert({
          order_id: order.id,
          slot_id: slot.id,
          buyer_id: config.buyer_id,
          seller_id: config.seller_id,
          product_id: config.product_id,
          booking_date: nextDateStr,
          start_time: slot.start_time,
          end_time: slot.end_time,
          status: "confirmed",
          location_type: "at_seller",
        });

        if (bookErr) {
          // Rollback order and slot
          await supabase.from("orders").delete().eq("id", order.id);
          await supabase.rpc("release_service_slot", { _slot_id: slot.id });
          console.error("Failed to create booking for recurring", config.id, bookErr);
          errors++;
          continue;
        }

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
          body: `Your recurring appointment has been scheduled for ${nextDateStr} at ${timeStr.slice(0, 5)}`,
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
