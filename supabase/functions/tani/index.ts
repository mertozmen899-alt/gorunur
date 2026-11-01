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
    GEM ? dene("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { "x-goog-api-key": GEM }) : null,
    SERP ? dene(`https://serpapi.com/account.json?api_key=${encodeURIComponent(SERP)}`) : null,
  ]);
  // Kodda sabitlenen Gemini sürümleri Google aramalı cevap verebiliyor mu (ölçüm bunu kullanır); iki küçük çağrı
  // Hazır metinlerdeki gibi JSON modunda Türkçe bir cümle: süre, Türkçe karakter kullanımı; ayrıca Google aramalı kota
  const modelDene = async (model: string, arama: boolean) => {
    if (!GEM) return { model, arama, durum: "anahtar yok" };
    const t0 = Date.now();
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": GEM }, signal: AbortSignal.timeout(60000),
        body: JSON.stringify(arama
          ? { contents: [{ role: "user", parts: [{ text: "Türkiye'nin başkenti neresi? Tek kelime." }] }], tools: [{ google_search: {} }] }
          : { contents: [{ role: "user", parts: [{ text: 'Çorum\'daki bir diş kliniği için tek cümlelik, sade Türkçe bir tanıtım yaz. Sadece şu JSON\'u döndür: {"metin":"..."}' }] }], generationConfig: { temperature: 0.7, responseMimeType: "application/json" } }),
      });
      const j = await r.json().catch(() => ({}));
      const metin = (j?.candidates?.[0]?.content?.parts || []).filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text || "").join("").trim();
      return { model, arama, durum: r.status, ms: Date.now() - t0, turkce: /[çğıöşüÇĞİÖŞÜ]/.test(metin), cevap: metin.slice(0, 90), hata: r.ok ? undefined : String(j?.error?.message || "").slice(0, 90) };
    } catch (e) { return { model, arama, durum: 0, ms: Date.now() - t0, hata: String(e).slice(0, 80) }; }
  };
  const DENE = ["gemini-3.5-flash-lite", "gemini-3.7-flash", "gemini-3.8-flash", "gemini-flash-lite-latest", "gemini-flash-latest"];
  const modeller = await Promise.all([...DENE.map((m) => modelDene(m, false)), modelDene(DENE[0], true)]);
  const ozet = (x: Awaited<ReturnType<typeof dene>> | null) => x ? { calisiyor: x.tamam, durum: x.durum } : { calisiyor: false, durum: "anahtar yok" };
  const sj = (s?.j || {}) as Record<string, unknown>;
  return new Response(JSON.stringify({
    adlar, openai: ozet(o),
    // Flash modellerinin adları: kodda sabit sürüm seçmek için ("-latest" adları Google değiştirebiliyor)
    gemini: { ...ozet(g), sabit_modeller: modeller, flash: ((g?.j as { models?: Array<Record<string, string>> } | null)?.models || []).filter((m) => /flash/i.test(m.name || "")).map((m) => `${String(m.name).replace("models/", "")} | ${m.displayName || ""} | ${m.version || ""}`) },
    serpapi: { ...ozet(s), plan: sj.plan_name ?? null, aylik: sj.searches_per_month ?? null, bu_ay: sj.this_month_usage ?? null, kalan: sj.total_searches_left ?? sj.plan_searches_left ?? null },
  }), { headers: { "Content-Type": "application/json" } });
});
