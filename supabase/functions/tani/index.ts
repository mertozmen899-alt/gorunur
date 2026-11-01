// Tanı: gizli anahtar ADLARI ve çalışıp çalışmadıkları (değerleri asla dönmez). Sadece cron anahtarıyla.
// Anahtar denemeleri ücretsiz uç noktalarla yapılır: OpenAI ve Gemini model listesi, SerpApi hesap bilgisi (arama hakkı harcamaz).
import { createClient } from "jsr:@supabase/supabase-js@2";
const dene = async (url: string, headers: Record<string, string> = {}) => {
  try { const r = await fetch(url, { headers, signal: AbortSignal.timeout(8000) }); return { durum: r.status, tamam: r.ok, j: r.ok ? await r.json().catch(() => null) : null }; }
  catch (e) { return { durum: 0, tamam: false, hata: String(e).slice(0, 80), j: null }; }
};
Deno.serve(async (req) => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data } = await db.from("cron_ayar").select("deger").eq("ad", "olcum_anahtari").maybeSingle();
  if (!data || req.headers.get("x-gorunur-cron") !== data.deger) return new Response("yetkisiz", { status: 401 });
  const adlar = Object.keys(Deno.env.toObject()).filter((k) => !/^(SUPABASE_|DENO_|PATH|HOME|HOSTNAME|SB_)/.test(k)).sort();
  const OA = (Deno.env.get("OPENAI_API_KEY") || "").trim(), GEM = (Deno.env.get("GEMINI_API_KEY") || "").trim(), SERP = (Deno.env.get("SERPAPI_KEY") || "").trim();
  const [o, g, s] = await Promise.all([
    OA ? dene("https://api.openai.com/v1/models", { Authorization: `Bearer ${OA}` }) : null,
    GEM ? dene("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1", { "x-goog-api-key": GEM }) : null,
    SERP ? dene(`https://serpapi.com/account.json?api_key=${encodeURIComponent(SERP)}`) : null,
  ]);
  const ozet = (x: Awaited<ReturnType<typeof dene>> | null) => x ? { calisiyor: x.tamam, durum: x.durum } : { calisiyor: false, durum: "anahtar yok" };
  const sj = (s?.j || {}) as Record<string, unknown>;
  return new Response(JSON.stringify({
    adlar, openai: ozet(o), gemini: ozet(g),
    serpapi: { ...ozet(s), plan: sj.plan_name ?? null, aylik: sj.searches_per_month ?? null, bu_ay: sj.this_month_usage ?? null, kalan: sj.total_searches_left ?? sj.plan_searches_left ?? null },
  }), { headers: { "Content-Type": "application/json" } });
});
