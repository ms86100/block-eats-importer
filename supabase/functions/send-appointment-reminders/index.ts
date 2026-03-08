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

    // Find bookings needing reminders (not cancelled/completed/no_show)
    const { data: bookings, error: fetchErr } = await supabase
      .from("service_bookings")
      .select("id, buyer_id, booking_date, start_time, product_id, order_id, reminder_24h_sent_at, reminder_1h_sent_at")
      .not("status", "in", '("cancelled","completed","no_show")')
      .gte("booking_date", todayStr)
      .or("reminder_24h_sent_at.is.null,reminder_1h_sent_at.is.null");

    if (fetchErr) throw fetchErr;

    let sent24h = 0;
    let sent1h = 0;
    let skipped = 0;

    for (const booking of bookings || []) {
      try {
        const appointmentTime = new Date(`${booking.booking_date}T${booking.start_time}`);
        const hoursUntil = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        // Skip if appointment already passed
        if (hoursUntil < 0) continue;

        // 24h reminder: 23-25 hours before
        if (!booking.reminder_24h_sent_at && hoursUntil > 23 && hoursUntil <= 25) {
          const { data: product } = await supabase
            .from("products")
            .select("name")
            .eq("id", booking.product_id)
            .single();

          await supabase.from("notification_queue").insert({
            user_id: booking.buyer_id,
            type: "appointment_reminder",
            title: "📅 Appointment Tomorrow",
            body: `Your ${product?.name || "appointment"} is tomorrow at ${booking.start_time?.slice(0, 5)}`,
            reference_path: `/orders/${booking.order_id}`,
            payload: { orderId: booking.order_id, type: "appointment_reminder" },
          });

          await supabase
            .from("service_bookings")
            .update({ reminder_24h_sent_at: now.toISOString() })
            .eq("id", booking.id);

          sent24h++;
        }
        // 1h reminder: 0.5-1.5 hours before
        else if (!booking.reminder_1h_sent_at && hoursUntil > 0.5 && hoursUntil <= 1.5) {
          const { data: product } = await supabase
            .from("products")
            .select("name")
            .eq("id", booking.product_id)
            .single();

          await supabase.from("notification_queue").insert({
            user_id: booking.buyer_id,
            type: "appointment_reminder",
            title: "⏰ Appointment in 1 hour",
            body: `Your ${product?.name || "appointment"} starts at ${booking.start_time?.slice(0, 5)}. Get ready!`,
            reference_path: `/orders/${booking.order_id}`,
            payload: { orderId: booking.order_id, type: "appointment_reminder" },
          });

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
      JSON.stringify({ success: true, sent_24h: sent24h, sent_1h: sent1h, skipped, total_checked: bookings?.length || 0 }),
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
