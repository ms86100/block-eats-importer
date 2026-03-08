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

    // [BUG FIX] Add limit to prevent unbounded query
    const { data: societies } = await supabase
      .from("societies")
      .select("id, name, trust_score")
      .eq("is_active", true)
      .limit(500);

    if (!societies || societies.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active societies" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    let totalQueued = 0;

    for (const society of societies) {
      try {
        // [BUG FIX] Removed duplicate snagsFixed/snagsClosed query (was identical)
        const [
          { count: expenseCount },
          { count: disputesResolved },
          { count: snagsFixed },
          { count: milestoneCount },
        ] = await Promise.all([
          supabase.from("society_expenses").select("id", { count: "exact", head: true }).eq("society_id", society.id).gte("created_at", weekAgo),
          supabase.from("dispute_tickets").select("id", { count: "exact", head: true }).eq("society_id", society.id).in("status", ["resolved", "closed"]).gte("created_at", weekAgo),
          supabase.from("snag_tickets").select("id", { count: "exact", head: true }).eq("society_id", society.id).in("status", ["fixed", "verified", "closed"]).gte("created_at", weekAgo),
          supabase.from("construction_milestones").select("id", { count: "exact", head: true }).eq("society_id", society.id).gte("created_at", weekAgo),
        ]);

        const total = (expenseCount || 0) + (disputesResolved || 0) + (snagsFixed || 0) + (milestoneCount || 0);
        if (total === 0) continue;

        // Build digest body
        const parts: string[] = [];
        if (expenseCount && expenseCount > 0) parts.push(`💰 ${expenseCount} expense${expenseCount > 1 ? "s" : ""} documented`);
        if (disputesResolved && disputesResolved > 0) parts.push(`⚖️ ${disputesResolved} dispute${disputesResolved > 1 ? "s" : ""} resolved`);
        if (snagsFixed && snagsFixed > 0) parts.push(`🔧 ${snagsFixed} snag${snagsFixed > 1 ? "s" : ""} fixed`);
        if (milestoneCount && milestoneCount > 0) parts.push(`🏗 ${milestoneCount} construction update${milestoneCount > 1 ? "s" : ""}`);

        const trustScore = Number(society.trust_score || 0);
        parts.push(`📊 Trust Score: ${trustScore.toFixed(1)}/10`);

        const body = parts.join("\n");

        // [BUG FIX] Add limit to prevent unbounded member query
        const { data: members } = await supabase
          .from("profiles")
          .select("id")
          .eq("society_id", society.id)
          .eq("verification_status", "approved")
          .limit(1000);

        if (!members || members.length === 0) continue;

        const notifications = members.map((m) => ({
          user_id: m.id,
          title: `📋 Weekly Digest — ${society.name}`,
          body,
          type: "weekly_digest",
          reference_path: "/society/reports",
        }));

        // Batch insert (max 200 at a time for payload safety)
        for (let i = 0; i < notifications.length; i += 200) {
          const batch = notifications.slice(i, i + 200);
          const { error: insertErr } = await supabase.from("notification_queue").insert(batch);
          if (insertErr) {
            console.error(`Failed to enqueue weekly digest for society ${society.id}, batch ${i}:`, insertErr);
          }
        }

        totalQueued += members.length;
      } catch (societyErr) {
        console.error(`Failed to process weekly digest for society ${society.id}:`, societyErr);
      }
    }

    // [BUG FIX] Trigger notification queue processor to deliver enqueued digests
    if (totalQueued > 0) {
      try {
        await supabase.functions.invoke("process-notification-queue");
      } catch (_) {}
    }

    return new Response(
      JSON.stringify({ message: `Weekly digest queued for ${totalQueued} users`, queued: totalQueued }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Weekly digest error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});