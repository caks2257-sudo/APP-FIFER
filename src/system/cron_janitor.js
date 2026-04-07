const cron = require("node-cron");
const { createClient } = require("@supabase/supabase-js");

let janitorTask = null;

function getSupabaseServiceClient() {
  const url = String(process.env.SUPABASE_URL || "").trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) {
    throw new Error("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY no configuradas para Cron Janitor");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function daysAgoIso(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

async function runJanitorCycle() {
  const supabase = getSupabaseServiceClient();
  const cutoff = daysAgoIso(7);

  try {
    // Safety: SOLO status=draft; published/discarded no se tocan.
    const { data, error } = await supabase
      .schema("fifer_platform")
      .from("campaign_drafts")
      .delete()
      .eq("status", "draft")
      .lt("updated_at", cutoff)
      .select("id");

    if (error) {
      console.error("🧹 Cron Janitor: Error limpiando borradores:", error.message || String(error));
      return;
    }

    const deleted = Array.isArray(data) ? data.length : 0;
    console.log(`🧹 Cron Janitor: Eliminados ${deleted} borradores antiguos`);
  } catch (err) {
    console.error("🧹 Cron Janitor: Excepción no controlada:", err?.message || String(err));
  }
}

function startJanitor() {
  if (janitorTask) {
    return janitorTask;
  }

  // 03:00 AM diario, hora local del proceso Node.
  janitorTask = cron.schedule("0 3 * * *", async () => {
    await runJanitorCycle();
  });

  console.log("🧹 Cron Janitor: scheduler iniciado (03:00 AM diario)");
  return janitorTask;
}

module.exports = {
  startJanitor,
  runJanitorCycle,
};

