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

    // [SECURITY FIX] Require service-role authorization — internal system metrics should not be public
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || authHeader !== `Bearer ${serviceKey}`) {
      return new Response(
        JSON.stringify({ error: "Unauthorized — service role required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const checks: Record<string, unknown> = {};

    // 1. DB connectivity check
    const dbStart = Date.now();
    const { error: dbError } = await supabase.from('societies').select('id').limit(1);
    checks.db = dbError ? 'error' : 'ok';
    checks.db_latency_ms = Date.now() - dbStart;

    // 2. Trigger errors in last 24h
    const { count: triggerErrors } = await supabase
      .from('trigger_errors')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    checks.trigger_errors_24h = triggerErrors || 0;

    // 3. Orphaned societies (active but no active admins)
    const { data: allSocieties } = await supabase
      .from('societies')
      .select('id')
      .eq('is_active', true)
      .limit(500);

    const { data: adminedSocieties } = await supabase
      .from('society_admins')
      .select('society_id')
      .is('deactivated_at', null);

    const adminedSet = new Set((adminedSocieties || []).map(a => a.society_id));
    const orphaned = (allSocieties || []).filter(s => !adminedSet.has(s.id));
    checks.orphaned_societies = orphaned.length;

    // 4. Table row counts for key tables
    const tables = ['profiles', 'orders', 'seller_profiles', 'products', 'chat_messages'];
    const counts: Record<string, number> = {};
    for (const table of tables) {
      const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
      counts[table] = count || 0;
    }
    checks.table_counts = counts;

    // 5. Notification queue health
    const { count: pendingNotifs } = await supabase
      .from('notification_queue')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');
    checks.notification_queue_pending = pendingNotifs || 0;

    const { count: failedNotifs } = await supabase
      .from('notification_queue')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed');
    checks.notification_queue_failed = failedNotifs || 0;

    // 6. Overall status
    checks.status = checks.db === 'ok' && (triggerErrors || 0) === 0 && orphaned.length === 0
      ? 'healthy'
      : 'degraded';

    checks.checked_at = new Date().toISOString();

    return new Response(JSON.stringify(checks, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ status: 'error', error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});