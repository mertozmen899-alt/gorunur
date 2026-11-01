// Norevo hızlı test: ana sayfadaki 3 soruluk testin gerçek sonucu.
// Girdi: { sehir, is }. Çıktı: Google Haritalar'da ilk 20 işletme + Gemini (yz), ChatGPT (cg, OPENAI_API_KEY varsa)
// ve Google Yapay Zekâ Modu (gyz, SerpApi) önerdiği işletmeler. Yeni testte SerpApi: haritalar 1 + yapay zekâ modu 1 arama.
// Aynı şehir + iş 7 gün önbellekte tutulur. Kötüye kullanım sınırı: IP başına günde 6, toplam günde 8 yeni arama.
// Giriş gerektirmez (verify_jwt kapalı); ham IP saklanmaz, sadece günlük tuzlu özeti.
// IP: sadece cf-connecting-ip; yoksa x-forwarded-for'un SON değeri (ilk değeri ziyaretçi kendisi yazabilir).
// Yarış durumuna karşı istek kaydı dış API'lerden ÖNCE eklenir, sonra sayılır (aynı anda gelen istekler birbirini görür).
// Sistem geneli SerpApi bütçesi: public.serp_harca (günlük SERP_GUNLUK_SINIR, varsayılan 25; aylık SERPAPI_AYLIK_SINIR, varsayılan 230).
// Hızlı test, ücretli kullanıcılara yer kalsın diye aylık sınırın sadece %60'ına kadar harcar. Aylık pay dolduysa
// Haritalar ve Google Yapay Zekâ Modu atlanır, Gemini/ChatGPT ile cevap verilir ve harita_yok: 'kapasite' döner.
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
const IP_GUNLUK = 6, TOPLAM_GUNLUK = 8;

function yerde(ad: string) {
  if (ad === "Türkiye geneli") return "Türkiye'de";
  const k = ad.toLocaleLowerCase("tr"), u = k.match(/[aıoueiöü]/g) || ["e"];
  return ad + "'" + (/[çfhkpsşt]$/.test(k) ? "t" : "d") + ("aıou".includes(u[u.length - 1]) ? "a" : "e");
}

function istemciIp(req: Request): string {
  const cf = (req.headers.get("cf-connecting-ip") || "").trim();
  if (cf) return cf;
  const xff = (req.headers.get("x-forwarded-for") || "").split(",").map((x) => x.trim()).filter(Boolean);
  return xff.length ? xff[xff.length - 1] : "";
}

async function ozet(x: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(x));
  return [...new Uint8Array(b)].slice(0, 12).map((v) => v.toString(16).padStart(2, "0")).join("");
}

async function haritalar(sorgu: string, anahtar: string) {
  const u = new URL("https://serpapi.com/search.json");
  const p: Record<string, string> = { engine: "google_maps", type: "search", q: sorgu, hl: "tr", api_key: anahtar };
  for (const [k, v] of Object.entries(p)) u.searchParams.set(k, v);
  const r = await fetch(u, { signal: AbortSignal.timeout(25000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error("Haritalar: " + (j.error || r.status));
  const ham = (j.local_results && j.local_results.length ? j.local_results : (j.place_results ? [j.place_results] : [])) as Array<Record<string, unknown>>;
  return ham.slice(0, 20).map((x, i) => ({
    sira: (x.position as number) || i + 1, ad: String(x.title || "").slice(0, 80),
    puan: typeof x.rating === "number" ? x.rating : null, yorum: typeof x.reviews === "number" ? x.reviews : null,
    adres: String(x.address || "").slice(0, 120), tur: String(x.type || "").slice(0, 60),
    web: !!x.website, tel: !!x.phone, saat: !!(x.operating_hours || x.hours), foto: !!x.thumbnail,
  })).filter((x) => x.ad);
}

async function yapayZeka(soru: string, anahtar: string) {
  // Sabit sürüm ("-latest" adlarının arkasını Google değiştirebiliyor); en sondaki "-latest" yedek
  const modeller = [Deno.env.get("GEMINI_MODEL"), "gemini-3.5-flash-lite", "gemini-3.5-flash-lite", "gemini-3.7-flash", "gemini-flash-lite-latest"].filter(Boolean) as string[];
  const istek = `${soru} Gerçek bir müşteriye cevap verir gibi 3 ile 5 işletme öner. Sadece şu JSON'u döndür: {"isletmeler":[{"ad":"işletme adı","neden":"tek kısa cümle"}]}`;
  let son = "";
  for (const model of modeller) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": anahtar },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: istek }] }], generationConfig: { temperature: 0.4, maxOutputTokens: 2000, responseMimeType: "application/json" } }),
        signal: AbortSignal.timeout(20000),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { son += ` ${model}: ${r.status} ${String(j?.error?.message || "").slice(0, 80)};`; continue; }
      const metin = (j?.candidates?.[0]?.content?.parts || []).filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text || "").join("").trim();
      let v: Record<string, unknown> | null = null;
      try { v = JSON.parse(metin.replace(/^```(json)?|```$/g, "").trim()); }
      catch { const adlar = [...metin.matchAll(/"ad"\s*:\s*"([^"]{2,80})"/g)].map((m) => ({ ad: m[1], neden: "" })); if (adlar.length) v = { isletmeler: adlar }; }
      const liste = (Array.isArray(v?.isletmeler) ? v!.isletmeler as Array<Record<string, unknown>> : []).map((x: Record<string, unknown>) => ({ ad: String(x.ad || "").slice(0, 80), neden: String(x.neden || "").slice(0, 160) })).filter((x: { ad: string }) => x.ad).slice(0, 5);
      if (liste.length) return { model, isletmeler: liste };
      son += ` ${model}: boş;`;
    } catch (e) { son += ` ${model}: ${String(e).slice(0, 60)};`; }
  }
  throw new Error("Yapay zekâ: " + son);
}

// ChatGPT: OpenAI Responses API, internette arama açık (gerçek ChatGPT gibi güncel cevap)
async function chatgpt(soru: string, sehir: string, anahtar: string) {
  const modeller = [Deno.env.get("OPENAI_MODEL"), "gpt-5-mini", "gpt-4.1-mini"].filter(Boolean) as string[];
  const istek = `${soru} Gerçek bir müşteriye cevap verir gibi 3 ile 5 işletme öner. Cevabının sonunda sadece şu JSON'u ver: {"isletmeler":[{"ad":"işletme adı","neden":"tek kısa cümle"}]}`;
  let son = "";
  for (const model of modeller) {
    try {
      const govde: Record<string, unknown> = {
        model, input: istek,
        tools: [{ type: "web_search", user_location: { type: "approximate", country: "TR", ...(sehir && sehir !== "Türkiye geneli" ? { city: sehir.split(",")[0].trim() } : {}) } }],
      };
      if (model.startsWith("gpt-5")) govde.reasoning = { effort: "low" };
      const r = await fetch("https://api.openai.com/v1/responses", {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + anahtar },
        body: JSON.stringify(govde), signal: AbortSignal.timeout(45000),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { son += ` ${model}: ${r.status} ${String(j?.error?.message || "").slice(0, 100)};`; continue; }
      const metin = String(j.output_text || (j.output || []).flatMap((o: { content?: Array<{ text?: string }> }) => o.content || []).map((c: { text?: string }) => c.text || "").join("\n"));
      let v: Record<string, unknown> | null = null;
      const blok = metin.match(/\{[\s\S]*"isletmeler"[\s\S]*\}/);
      try { if (blok) v = JSON.parse(blok[0]); } catch { /* aşağıda */ }
      if (!v) { const adlar = [...metin.matchAll(/"ad"\s*:\s*"([^"]{2,80})"/g)].map((m) => ({ ad: m[1], neden: "" })); if (adlar.length) v = { isletmeler: adlar }; }
      const liste = (Array.isArray(v?.isletmeler) ? v!.isletmeler as Array<Record<string, unknown>> : []).map((x) => ({ ad: String(x.ad || "").replace(/\s*\(?\[?[a-z0-9.-]+\.(com|tr|net)[^)]*\)?\]?/gi, "").slice(0, 80), neden: String(x.neden || "").replace(/\s*\(\[[^\]]*\]\([^)]*\)\)/g, "").slice(0, 160) })).filter((x) => x.ad).slice(0, 5);
      if (liste.length) return { model, isletmeler: liste };
      son += ` ${model}: boş;`;
    } catch (e) { son += ` ${model}: ${String(e).slice(0, 60)};`; }
  }
  throw new Error("ChatGPT: " + son);
}

// Google Yapay Zekâ Modu (SerpApi google_ai_mode): tek soru = 1 SerpApi araması.
// Önerilen işletmeler text_blocks içindeki listelerin local_result başlıklarından alınır.
async function googleYz(soru: string, anahtar: string) {
  const u = new URL("https://serpapi.com/search.json");
  const p: Record<string, string> = { engine: "google_ai_mode", q: soru, hl: "tr", gl: "tr", api_key: anahtar };
  for (const [k, v] of Object.entries(p)) u.searchParams.set(k, v);
  const r = await fetch(u, { signal: AbortSignal.timeout(30000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error("Google YZ: " + (j.error || r.status));
  const yerel: Array<{ ad: string; neden: string }> = [], basliklar: Array<{ ad: string; neden: string }> = [];
  const gez = (b: Record<string, any>) => {
    if (!b || typeof b !== "object") return;
    if (Array.isArray(b.list)) for (const x of b.list) {
      const neden = String(x?.snippet || "").replace(/\s+/g, " ").trim().slice(0, 160);
      if (x?.local_result?.title) yerel.push({ ad: String(x.local_result.title).slice(0, 80), neden });
      else if (x?.title) basliklar.push({ ad: String(x.title).replace(/[:*]+$/g, "").trim().slice(0, 80), neden });
      gez(x);
    }
  };
  (Array.isArray(j.text_blocks) ? j.text_blocks : []).forEach(gez);
  const goruldu = new Set<string>();
  const liste = (yerel.length ? yerel : basliklar).filter((x) => x.ad && !goruldu.has(sade(x.ad)) && goruldu.add(sade(x.ad))).slice(0, 5);
  if (!liste.length) throw new Error("Google YZ: işletme listesi yok");
  return { isletmeler: liste };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ hata: "Sadece POST" }, 405);
  const g = await req.json().catch(() => ({}));
  const sehir = temiz(g.sehir), isK = temiz(g.is).toLocaleLowerCase("tr");
  if (sehir.length < 2 || isK.length < 2) return json({ hata: "Şehir ve iş gerekli." }, 400);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const SERP0 = (Deno.env.get("SERPAPI_KEY") || "").trim();
  const SERP_SINIR = parseInt(Deno.env.get("SERP_GUNLUK_SINIR") || "25", 10) || 25;
  const AYLIK = parseInt(Deno.env.get("SERPAPI_AYLIK_SINIR") || "230", 10) || 230;
  const AYLIK_TEST = Math.floor(AYLIK * 0.6); // hızlı test sadece aylık sınırın %60'ına kadar
  const serpHarca = async (adet: number) => {
    if (adet <= 0) return true;
    const { data, error } = await db.rpc("serp_harca", { adet, sinir: SERP_SINIR, p_aylik: AYLIK_TEST });
    if (error) console.log("serp_harca hata", error.message);
    return data === true;
  };
  // İsteği önce kaydet, sonra say (kendisi dahil). Sınır aşılırsa kendi kaydını siler.
  const kaydetVeSay = async () => {
    const ipOzet = await ozet(new Date().toISOString().slice(0, 10) + "|" + istemciIp(req) + "|" + (Deno.env.get("SUPABASE_URL") || ""));
    const { data: k } = await db.from("hizli_test_istek").insert({ ip_ozet: ipOzet, yeni: true }).select("id").single();
    const bas = new Date(Date.now() - 864e5).toISOString();
    const [{ count: ipSay }, { count: topSay }] = await Promise.all([
      db.from("hizli_test_istek").select("id", { count: "exact", head: true }).eq("ip_ozet", ipOzet).eq("yeni", true).gte("zaman", bas),
      db.from("hizli_test_istek").select("id", { count: "exact", head: true }).eq("yeni", true).gte("zaman", bas),
    ]);
    const sil = async () => { if (k?.id) await db.from("hizli_test_istek").delete().eq("id", k.id); };
    return { ipSay: ipSay || 0, topSay: topSay || 0, sil };
  };
  if (g.islem === "bul") {
    const ad = temiz(g.ad);
    if (ad.length < 2) return json({ hata: "İşletme adı gerekli." }, 400);
    if (!SERP0) return json({ hata: "sinir", mesaj: "Şu an arayamıyoruz. Yarın tekrar deneyin." }, 429);
    const { ipSay: ipS, topSay: topS, sil } = await kaydetVeSay();
    if (ipS > IP_GUNLUK + 4 || topS > TOPLAM_GUNLUK + 15 || !(await serpHarca(1))) {
      await sil();
      return json({ hata: "sinir", mesaj: "Şu an arayamıyoruz. Yarın tekrar deneyin." }, 429);
    }
    try {
      const l = await haritalar(`${ad} ${sehir === "Türkiye geneli" ? "" : sehir}`.trim(), SERP0);
      return json({ adaylar: l.slice(0, 4) });
    } catch (e) { console.log("hizli-test bul", String(e).slice(0, 200)); return json({ hata: "olcum", mesaj: "Şu an arayamadık. Birazdan tekrar deneyin." }, 502); }
  }
  const anahtar = "v4|" + sade(sehir) + "|" + sade(isK);
  const { data: onb } = await db.from("hizli_testler").select("sonuc, olusturma").eq("anahtar", anahtar).maybeSingle();
  if (onb && Date.now() - new Date(onb.olusturma).getTime() < 7 * 864e5) return json({ ...onb.sonuc, onbellek: true });

  // Kötüye kullanım sınırı (yalnızca yeni aramalar sayılır). Kayıt dış API'lerden önce eklenir, sonra sayılır.
  const { ipSay, topSay, sil } = await kaydetVeSay();
  if (ipSay > IP_GUNLUK) { await sil(); return json({ hata: "sinir", mesaj: "Bugün çok deneme yaptınız. Yarın tekrar deneyin." }, 429); }
  // Günlük toplam test sınırı dolduysa hiçbir ücretli/ücretsiz yapay zekâ ya da arama çağrılmaz
  const kotaVar = topSay <= TOPLAM_GUNLUK;
  if (!kotaVar) { await sil(); return json({ hata: "sinir", mesaj: "Bugün çok fazla test yapıldı. Yarın tekrar deneyin." }, 429); }

  const SERP = (Deno.env.get("SERPAPI_KEY") || "").trim(), GEM = (Deno.env.get("GEMINI_API_KEY") || "").trim(), OAI = (Deno.env.get("OPENAI_API_KEY") || "").trim();
  const soru = `${yerde(sehir)} iyi bir ${isK} önerir misin?`;
  const haritaIstek = sehir !== "Türkiye geneli";
  // Sistem geneli SerpApi bütçesi: haritalar (varsa) + Google Yapay Zekâ Modu
  const serpVar = !!SERP && await serpHarca((haritaIstek ? 1 : 0) + 1);
  const haritaAcik = haritaIstek && serpVar;
  // Bütçe neden yok? Aylık pay dolduysa ön yüz kısa bir açıklama gösterir
  let haritaYok: string | null = null;
  if (SERP && !serpVar) {
    const { data: ayN } = await db.rpc("serp_aylik_kullanim");
    haritaYok = (Number(ayN) || 0) + (haritaIstek ? 2 : 1) > AYLIK_TEST ? "kapasite" : "gunluk";
  }
  const [h, y, c, gy] = await Promise.allSettled([
    haritaAcik ? haritalar(`${isK} ${sehir}`, SERP) : Promise.resolve(null),
    GEM && kotaVar ? yapayZeka(soru, GEM) : Promise.resolve(null),
    OAI && kotaVar ? chatgpt(soru, sehir, OAI) : Promise.resolve(null),
    serpVar ? googleYz(soru, SERP) : Promise.resolve(null), // 1 SerpApi araması
  ]);
  const sonuc = {
    sehir, is: isK, soru,
    harita: h.status === "fulfilled" ? h.value : null,
    yz: y.status === "fulfilled" ? y.value : null,
    cg: c.status === "fulfilled" ? c.value : null,
    gyz: gy.status === "fulfilled" ? gy.value : null,
    tarih: new Date().toISOString(),
    ...(haritaYok ? { harita_yok: haritaYok } : {}),
  };
  if (h.status === "rejected") console.log("hizli-test harita", String(h.reason).slice(0, 200));
  if (y.status === "rejected") console.log("hizli-test yz", String(y.reason).slice(0, 200));
  if (c.status === "rejected") console.log("hizli-test cg", String(c.reason).slice(0, 300));
  if (gy.status === "rejected") console.log("hizli-test gyz", String(gy.reason).slice(0, 200));
  if (!sonuc.harita && !sonuc.yz) return json({ hata: "olcum", mesaj: "Şu an ölçemedik. Birkaç dakika sonra tekrar deneyin." }, 502);
  // Sadece iki parça da geldiyse önbelleğe al (yarım sonuç bir hafta takılı kalmasın)
  if (sonuc.yz && !haritaYok && (sonuc.harita || sehir === "Türkiye geneli")) await db.from("hizli_testler").upsert({ anahtar, sonuc, olusturma: sonuc.tarih });
  return json(sonuc);
});
