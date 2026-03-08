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

    // [SECURITY FIX] Validate caller identity
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === supabaseServiceKey;

    if (!isServiceRole) {
      // Verify user JWT
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: authErr } = await userClient.auth.getUser();
      if (authErr || !user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { helpRequestId, societyId, authorId, title, tag } = await req.json();

    if (!helpRequestId || !societyId || !authorId || !title) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // [BUG FIX] Add limit to prevent unbounded query
    const { data: societyMembers, error: membersError } = await supabase
      .from("profiles")
      .select("id")
      .eq("society_id", societyId)
      .neq("id", authorId)
      .eq("verification_status", "approved")
      .limit(1000);

    if (membersError) {
      throw new Error(`Failed to fetch members: ${membersError.message}`);
    }

    if (!societyMembers || societyMembers.length === 0) {
      return new Response(
        JSON.stringify({ message: "No society members to notify", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get author name
    const { data: author } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", authorId)
      .single();

    const tagLabels: Record<string, string> = {
      borrow: "🤝 Borrow",
      emergency: "🚨 Emergency",
      question: "❓ Question",
      offer: "🎁 Offer",
    };

    const notifTitle = `${tagLabels[tag] || "Help"} Request`;
    const notifBody = `${author?.name || "A neighbor"}: ${title}`;

    // [BUG FIX] Use notification queue instead of direct push calls
    // This ensures in-app notifications are created AND push is delivered with retries
    const notifications = societyMembers.map((member) => ({
      user_id: member.id,
      type: "help_request",
      title: notifTitle,
      body: notifBody,
      reference_path: "/help",
      payload: { type: "help_request", helpRequestId },
    }));

    // Batch insert into notification_queue
    for (let i = 0; i < notifications.length; i += 200) {
      const batch = notifications.slice(i, i + 200);
      const { error: insertErr } = await supabase.from("notification_queue").insert(batch);
      if (insertErr) {
        console.error(`Failed to enqueue help notifications batch ${i}:`, insertErr);
      }
    }

    // Trigger queue processor
    try {
      await supabase.functions.invoke("process-notification-queue");
    } catch (_) {}

    return new Response(
      JSON.stringify({ message: `Enqueued notifications for ${societyMembers.length} members`, sent: societyMembers.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Help request notification error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});