import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SlotGenRequest {
  seller_id: string;
  product_id?: string;
  days_ahead?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const { seller_id, product_id, days_ahead = 14, batch = false }: SlotGenRequest & { batch?: boolean } = body;

    // Batch mode: generate for all sellers with active service listings
    if (batch) {
      const { data: sellers } = await supabase
        .from('service_listings')
        .select('products!inner(seller_id)')
        .limit(500);

      const uniqueSellerIds = [...new Set((sellers || []).map((s: any) => s.products?.seller_id).filter(Boolean))];
      let totalCreated = 0;

      for (const sid of uniqueSellerIds) {
        const result = await generateSlotsForSeller(supabase, sid as string, undefined, days_ahead);
        totalCreated += result;
      }

      return new Response(
        JSON.stringify({ success: true, sellers_processed: uniqueSellerIds.length, slots_created: totalCreated }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!seller_id) {
      return new Response(
        JSON.stringify({ error: "seller_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const totalCreated = await generateSlotsForSeller(supabase, seller_id, product_id, days_ahead);

    return new Response(
      JSON.stringify({ success: true, slots_created: totalCreated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-service-slots error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function generateSlotsForSeller(supabase: any, seller_id: string, product_id?: string, days_ahead = 14): Promise<number> {

    // Get all service listings for this seller (or specific product)
    let query = supabase
      .from("service_listings")
      .select("*, products!inner(id, seller_id)")
      .eq("products.seller_id", seller_id);

    if (product_id) {
      query = query.eq("product_id", product_id);
    }

    const { data: serviceListings, error: slError } = await query;
    if (slError) throw slError;
    if (!serviceListings?.length) {
      return new Response(
        JSON.stringify({ message: "No service listings found", slots_created: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get availability schedules
    let schedQuery = supabase
      .from("service_availability_schedules")
      .select("*")
      .eq("seller_id", seller_id)
      .eq("is_active", true);

    const { data: schedules, error: schError } = await schedQuery;
    if (schError) throw schError;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalCreated = 0;

    for (const listing of serviceListings) {
      const productId = listing.product_id;
      const duration = listing.duration_minutes;
      const buffer = listing.buffer_minutes;
      const maxCapacity = listing.max_bookings_per_slot;

      // Get schedules for this product, or fall back to seller-default (product_id IS NULL)
      const productSchedules = schedules?.filter(
        (s: any) => s.product_id === productId
      );
      const defaultSchedules = schedules?.filter(
        (s: any) => s.product_id === null
      );
      const activeSchedules =
        productSchedules?.length ? productSchedules : defaultSchedules;

      if (!activeSchedules?.length) continue;

      // Generate slots for each day
      for (let d = 0; d < days_ahead; d++) {
        const date = new Date(today);
        date.setDate(date.getDate() + d);
        const dayOfWeek = date.getDay(); // 0=Sun

        const daySchedules = activeSchedules.filter(
          (s: any) => s.day_of_week === dayOfWeek
        );
        if (!daySchedules.length) continue;

        const dateStr = date.toISOString().split("T")[0];
        const slotsToInsert: any[] = [];

        for (const schedule of daySchedules) {
          const [startH, startM] = schedule.start_time.split(":").map(Number);
          const [endH, endM] = schedule.end_time.split(":").map(Number);
          const startMinutes = startH * 60 + startM;
          const endMinutes = endH * 60 + endM;

          let currentMin = startMinutes;
          while (currentMin + duration <= endMinutes) {
            const slotStartH = Math.floor(currentMin / 60);
            const slotStartM = currentMin % 60;
            const slotEndMin = currentMin + duration;
            const slotEndH = Math.floor(slotEndMin / 60);
            const slotEndM = slotEndMin % 60;

            const startTime = `${String(slotStartH).padStart(2, "0")}:${String(slotStartM).padStart(2, "0")}`;
            const endTime = `${String(slotEndH).padStart(2, "0")}:${String(slotEndM).padStart(2, "0")}`;

            slotsToInsert.push({
              product_id: productId,
              seller_id: seller_id,
              slot_date: dateStr,
              start_time: startTime,
              end_time: endTime,
              max_capacity: maxCapacity,
              booked_count: 0,
              is_blocked: false,
            });

            currentMin += duration + buffer;
          }
        }

        if (slotsToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from("service_slots")
            .upsert(slotsToInsert, {
              onConflict: "product_id,slot_date,start_time",
              ignoreDuplicates: true,
            });

          if (insertError) {
            console.error("Insert error for date", dateStr, insertError);
          } else {
            totalCreated += slotsToInsert.length;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, slots_created: totalCreated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-service-slots error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
