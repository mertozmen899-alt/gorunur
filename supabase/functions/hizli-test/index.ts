// Görünür hızlı test: ana sayfadaki 3 soruluk testin gerçek sonucu.
// Girdi: { sehir, is }. Çıktı: Google Haritalar'da ilk 20 işletme + Gemini'nin önerdiği işletmeler.
// Aynı şehir + iş 7 gün önbellekte tutulur. Kötüye kullanım sınırı: IP başına günde 6, toplam günde 25 yeni arama.
// Giriş gerektirmez (verify_jwt kapalı); ham IP saklanmaz, sadece günlük tuzlu özeti.
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const sade = (x: string) => (x || "").toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const temiz = (x: unknown) => String(x || "").replace(/[^\p{L}\p{N} .,'’&-]+/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60);
const IP_GUNLUK = 6, TOPLAM_GUNLUK = 25;

function yerde(ad: string) {
  if (ad === "Türkiye geneli") return "Türkiye'de";
  const k = ad.toLocaleLowerCase("tr"), u = k.match(/[aıoueiöü]/g) || ["e"];
  return ad + "'" + (/[çfhkpsşt]$/.test(k) ? "t" : "d") + ("aıou".includes(u[u.length - 1]) ? "a" : "e");
}

async function ozet(x: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(x));
  return [...new Uint8Array(b)].slice(0, 12).map((v) => v.toString(16).padStart(2, "0")).join("");
}

async function haritalar(isK: string, sehir: string, anahtar: string) {
  const u = new URL("https://serpapi.com/search.json");
  const p: Record<string, string> = { engine: "google_maps", type: "search", q: `${isK} ${sehir}`, hl: "tr", api_key: anahtar };
  for (const [k, v] of Object.entries(p)) u.searchParams.set(k, v);
  const r = await fetch(u, { signal: AbortSignal.timeout(25000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error("Haritalar: " + (j.error || r.status));
  return ((j.local_results || []) as Array<Record<string, unknown>>).slice(0, 20).map((x, i) => ({
    sira: (x.position as number) || i + 1, ad: String(x.title || "").slice(0, 80),
    puan: typeof x.rating === "number" ? x.rating : null, yorum: typeof x.reviews === "number" ? x.reviews : null,
  })).filter((x) => x.ad);
}

async function yapayZeka(soru: string, anahtar: string) {
  const modeller = [Deno.env.get("GEMINI_MODEL"), "gemini-flash-lite-latest", "gemini-2.5-flash-lite", "gemini-2.5-flash"].filter(Boolean) as string[];
  const istek = `${soru} Gerçek bir müşteriye cevap verir gibi 3 ile 5 işletme öner. Sadece şu JSON'u döndür: {"isletmeler":[{"ad":"işletme adı","neden":"tek kısa cümle"}]}`;
  let son = "";
  for (const model of modeller) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": anahtar },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: istek }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 2000, responseMimeType: "application/json" } }),
        signal: AbortSignal.timeout(20000),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { son += ` ${model}: ${r.status} ${String(j?.error?.message || "").slice(0, 80)};`; continue; }
      const metin = (j?.candidates?.[0]?.content?.parts || []).filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text || "").join("").trim();
      const v = JSON.parse(metin.replace(/^```(json)?|```$/g, "").trim());
      const liste = (Array.isArray(v?.isletmeler) ? v.isletmeler : []).map((x: Record<string, unknown>) => ({ ad: String(x.ad || "").slice(0, 80), neden: String(x.neden || "").slice(0, 160) })).filter((x: { ad: string }) => x.ad).slice(0, 5);
      if (liste.length) return { model, isletmeler: liste };
      son += ` ${model}: boş;`;
    } catch (e) { son += ` ${model}: ${String(e).slice(0, 60)};`; }
  }
  throw new Error("Yapay zekâ: " + son);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ hata: "Sadece POST" }, 405);
  const g = await req.json().catch(() => ({}));
  const sehir = temiz(g.sehir), isK = temiz(g.is).toLocaleLowerCase("tr");
  if (sehir.length < 2 || isK.length < 2) return json({ hata: "Şehir ve iş gerekli." }, 400);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const anahtar = sade(sehir) + "|" + sade(isK);
  const { data: onb } = await db.from("hizli_testler").select("sonuc, olusturma").eq("anahtar", anahtar).maybeSingle();
  if (onb && Date.now() - new Date(onb.olusturma).getTime() < 7 * 864e5) return json({ ...onb.sonuc, onbellek: true });

  // Kötüye kullanım sınırı (yalnızca yeni aramalar sayılır)
  const gun = new Date().toISOString().slice(0, 10);
  const ip = (req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  const ipOzet = await ozet(gun + "|" + ip + "|" + (Deno.env.get("SUPABASE_URL") || ""));
  const bas = new Date(Date.now() - 864e5).toISOString();
  const [{ count: ipSay }, { count: topSay }] = await Promise.all([
    db.from("hizli_test_istek").select("id", { count: "exact", head: true }).eq("ip_ozet", ipOzet).eq("yeni", true).gte("zaman", bas),
    db.from("hizli_test_istek").select("id", { count: "exact", head: true }).eq("yeni", true).gte("zaman", bas),
  ]);
  if ((ipSay || 0) >= IP_GUNLUK) return json({ hata: "sinir", mesaj: "Bugün çok deneme yaptınız. Yarın tekrar deneyin." }, 429);
  const haritaAcik = (topSay || 0) < TOPLAM_GUNLUK && sehir !== "Türkiye geneli";

  const SERP = (Deno.env.get("SERPAPI_KEY") || "").trim(), GEM = (Deno.env.get("GEMINI_API_KEY") || "").trim();
  const soru = `${yerde(sehir)} iyi bir ${isK} önerir misin?`;
  const [h, y] = await Promise.allSettled([
    haritaAcik && SERP ? haritalar(isK, sehir, SERP) : Promise.resolve(null),
    GEM ? yapayZeka(soru, GEM) : Promise.resolve(null),
  ]);
  const sonuc = {
    sehir, is: isK, soru,
    harita: h.status === "fulfilled" ? h.value : null,
    yz: y.status === "fulfilled" ? y.value : null,
    tarih: new Date().toISOString(),
  };
  if (h.status === "rejected") console.log("hizli-test harita", String(h.reason).slice(0, 200));
  if (y.status === "rejected") console.log("hizli-test yz", String(y.reason).slice(0, 200));
  await db.from("hizli_test_istek").insert({ ip_ozet: ipOzet, yeni: true });
  if (!sonuc.harita && !sonuc.yz) return json({ hata: "olcum", mesaj: "Şu an ölçemedik. Birkaç dakika sonra tekrar deneyin." }, 502);
  // Sadece iki parça da geldiyse önbelleğe al (yarım sonuç bir hafta takılı kalmasın)
  if (sonuc.yz && (sonuc.harita || sehir === "Türkiye geneli")) await db.from("hizli_testler").upsert({ anahtar, sonuc, olusturma: sonuc.tarih });
  return json(sonuc);
});
