// Tanı: gizli anahtar ADLARI (değerleri asla dönmez). Sadece cron anahtarıyla.
import { createClient } from "jsr:@supabase/supabase-js@2";
Deno.serve(async (req) => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data } = await db.from("cron_ayar").select("deger").eq("ad", "olcum_anahtari").maybeSingle();
  if (!data || req.headers.get("x-gorunur-cron") !== data.deger) return new Response("yetkisiz", { status: 401 });
  const adlar = Object.keys(Deno.env.toObject()).filter((k) => !/^(SUPABASE_|DENO_|PATH|HOME|HOSTNAME|SB_)/.test(k)).sort();
  return new Response(JSON.stringify({ adlar }), { headers: { "Content-Type": "application/json" } });
});
