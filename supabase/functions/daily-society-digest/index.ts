import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // [SECURITY FIX] Require service-role authorization (cron only)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || authHeader !== `Bearer ${supabaseServiceKey}`) {
      return new Response(
        JSON.stringify({ error: "Unauthorized — service role required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // [BUG FIX] Add limit to prevent unbounded query on societies
    const { data: societies } = await supabase
      .from("societies")
      .select("id, name")
      .eq("is_active", true)
      .limit(500);

    if (!societies || societies.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active societies" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    let totalSent = 0;

    for (const society of societies) {
      try {
        // Count today's activity
        const [
          { count: milestoneCount },
          { count: expenseCount },
          { count: docCount },
          { count: qaCount },
          { count: snagCount },
          { count: disputeCount },
          { count: bulletinCount },
          { count: broadcastCount },
        ] = await Promise.all([
          supabase.from("construction_milestones").select("id", { count: "exact", head: true }).eq("society_id", society.id).gte("created_at", since),
          supabase.from("society_expenses").select("id", { count: "exact", head: true }).eq("society_id", society.id).gte("created_at", since),
          supabase.from("project_documents").select("id", { count: "exact", head: true }).eq("society_id", society.id).gte("created_at", since),
          supabase.from("project_questions").select("id", { count: "exact", head: true }).eq("society_id", society.id).gte("created_at", since),
          supabase.from("snag_tickets").select("id", { count: "exact", head: true }).eq("society_id", society.id).gte("created_at", since),
          supabase.from("dispute_tickets").select("id", { count: "exact", head: true }).eq("society_id", society.id).gte("created_at", since),
          supabase.from("bulletin_posts").select("id", { count: "exact", head: true }).eq("society_id", society.id).gte("created_at", since),
          supabase.from("emergency_broadcasts").select("id", { count: "exact", head: true }).eq("society_id", society.id).gte("created_at", since),
        ]);

        const total = (milestoneCount || 0) + (expenseCount || 0) + (docCount || 0) +
          (qaCount || 0) + (snagCount || 0) + (disputeCount || 0) + (bulletinCount || 0) + (broadcastCount || 0);

        // Skip if no activity
        if (total === 0) continue;

        // Build summary
        const parts: string[] = [];
        if (milestoneCount && milestoneCount > 0) parts.push(`🏗 ${milestoneCount} construction update${milestoneCount > 1 ? 's' : ''}`);
        if (docCount && docCount > 0) parts.push(`📄 ${docCount} new document${docCount > 1 ? 's' : ''}`);
        if (bulletinCount && bulletinCount > 0) parts.push(`📋 ${bulletinCount} bulletin post${bulletinCount > 1 ? 's' : ''}`);
        if (expenseCount && expenseCount > 0) parts.push(`💰 ${expenseCount} finance entr${expenseCount > 1 ? 'ies' : 'y'}`);
        if (snagCount && snagCount > 0) parts.push(`🔧 ${snagCount} snag report${snagCount > 1 ? 's' : ''}`);
        if (disputeCount && disputeCount > 0) parts.push(`⚖️ ${disputeCount} dispute${disputeCount > 1 ? 's' : ''}`);
        if (qaCount && qaCount > 0) parts.push(`❓ ${qaCount} Q&A activit${qaCount > 1 ? 'ies' : 'y'}`);

        const body = parts.join(' • ');

        // [BUG FIX] Use notification queue instead of direct push calls
        // This ensures in-app notifications are created AND push is delivered reliably with retries
        const { data: members } = await supabase
          .from("profiles")
          .select("id")
          .eq("society_id", society.id)
          .eq("verification_status", "approved")
          .limit(1000);

        if (!members || members.length === 0) continue;

        // Batch insert into notification_queue (much more efficient than N individual push calls)
        const notifications = members.map(member => ({
          user_id: member.id,
          type: "digest",
          title: `📊 Daily Update — ${society.name}`,
          body,
          reference_path: "/bulletin",
          payload: { type: "digest", societyId: society.id },
        }));

        // Insert in batches of 200 to avoid payload limits
        for (let i = 0; i < notifications.length; i += 200) {
          const batch = notifications.slice(i, i + 200);
          const { error: insertErr } = await supabase.from("notification_queue").insert(batch);
          if (insertErr) {
            console.error(`Failed to enqueue digest for society ${society.id}, batch ${i}:`, insertErr);
          }
        }

        totalSent += members.length;
      } catch (societyErr) {
        console.error(`Failed to process digest for society ${society.id}:`, societyErr);
      }
    }

    // [BUG FIX] Trigger notification queue processor to deliver all enqueued digests
    if (totalSent > 0) {
      try {
        await supabase.functions.invoke("process-notification-queue");
      } catch (_) {}
    }

    return new Response(
      JSON.stringify({ message: `Digest enqueued for ${totalSent} users`, sent: totalSent }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Digest error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});