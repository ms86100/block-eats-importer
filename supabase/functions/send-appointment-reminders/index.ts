import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    // Find bookings needing reminders (not cancelled/completed/no_show)
    // BUG FIX: Also fetch seller_id for seller reminders
    const { data: bookings, error: fetchErr } = await supabase
      .from("service_bookings")
      .select("id, buyer_id, seller_id, booking_date, start_time, product_id, order_id, reminder_24h_sent_at, reminder_1h_sent_at")
      .not("status", "in", '("cancelled","completed","no_show")')
      .gte("booking_date", todayStr)
      .or("reminder_24h_sent_at.is.null,reminder_1h_sent_at.is.null");

    if (fetchErr) throw fetchErr;
    if (!bookings?.length) {
      return new Response(
        JSON.stringify({ success: true, sent_24h: 0, sent_1h: 0, skipped: 0, total_checked: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // BUG FIX: Batch-fetch product names to avoid N+1 queries
    const productIds = [...new Set(bookings.map(b => b.product_id).filter(Boolean))];
    const { data: products } = await supabase
      .from("products")
      .select("id, name")
      .in("id", productIds);
    const productMap = new Map((products || []).map(p => [p.id, p.name]));

    // BUG FIX: Batch-fetch seller user_ids for seller reminders
    const sellerIds = [...new Set(bookings.map(b => b.seller_id).filter(Boolean))];
    const { data: sellerProfiles } = await supabase
      .from("seller_profiles")
      .select("id, user_id")
      .in("id", sellerIds);
    const sellerUserMap = new Map((sellerProfiles || []).map(s => [s.id, s.user_id]));

    let sent24h = 0;
    let sent1h = 0;
    let skipped = 0;

    for (const booking of bookings) {
      try {
        // BUG FIX: Parse time with explicit UTC handling to avoid timezone drift
        const [hours, minutes] = (booking.start_time || "00:00").split(":").map(Number);
        const appointmentTime = new Date(`${booking.booking_date}T00:00:00`);
        appointmentTime.setHours(hours, minutes, 0, 0);
        const hoursUntil = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        // Skip if appointment already passed
        if (hoursUntil < 0) continue;

        const productName = productMap.get(booking.product_id) || "appointment";
        const sellerUserId = sellerUserMap.get(booking.seller_id);

        // 24h reminder: 23-25 hours before
        if (!booking.reminder_24h_sent_at && hoursUntil > 23 && hoursUntil <= 25) {
          // Buyer notification
          await supabase.from("notification_queue").insert({
            user_id: booking.buyer_id,
            type: "appointment_reminder",
            title: "📅 Appointment Tomorrow",
            body: `Your ${productName} is tomorrow at ${booking.start_time?.slice(0, 5)}`,
            reference_path: `/orders/${booking.order_id}`,
            payload: { orderId: booking.order_id, type: "appointment_reminder" },
          });

          // BUG FIX: Also remind seller
          if (sellerUserId) {
            await supabase.from("notification_queue").insert({
              user_id: sellerUserId,
              type: "appointment_reminder",
              title: "📅 Upcoming Appointment Tomorrow",
              body: `You have a ${productName} booking tomorrow at ${booking.start_time?.slice(0, 5)}`,
              reference_path: `/orders/${booking.order_id}`,
              payload: { orderId: booking.order_id, type: "appointment_reminder" },
            });
          }

          await supabase
            .from("service_bookings")
            .update({ reminder_24h_sent_at: now.toISOString() })
            .eq("id", booking.id);

          sent24h++;
        }
        // 1h reminder: 0.5-1.5 hours before
        else if (!booking.reminder_1h_sent_at && hoursUntil > 0.5 && hoursUntil <= 1.5) {
          await supabase.from("notification_queue").insert({
            user_id: booking.buyer_id,
            type: "appointment_reminder",
            title: "⏰ Appointment in 1 hour",
            body: `Your ${productName} starts at ${booking.start_time?.slice(0, 5)}. Get ready!`,
            reference_path: `/orders/${booking.order_id}`,
            payload: { orderId: booking.order_id, type: "appointment_reminder" },
          });

          // Also remind seller
          if (sellerUserId) {
            await supabase.from("notification_queue").insert({
              user_id: sellerUserId,
              type: "appointment_reminder",
              title: "⏰ Appointment in 1 hour",
              body: `Your ${productName} appointment starts at ${booking.start_time?.slice(0, 5)}`,
              reference_path: `/orders/${booking.order_id}`,
              payload: { orderId: booking.order_id, type: "appointment_reminder" },
            });
          }

          await supabase
            .from("service_bookings")
            .update({ reminder_1h_sent_at: now.toISOString() })
            .eq("id", booking.id);

          sent1h++;
        } else {
          skipped++;
        }
      } catch (bookingErr) {
        console.error(`Failed to process reminder for booking ${booking.id}:`, bookingErr);
        skipped++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent_24h: sent24h, sent_1h: sent1h, skipped, total_checked: bookings.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-appointment-reminders error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
