// Görünür ölçüm motoru
// Giriş yapmış kullanıcının işletmesi için: Google Haritalar sırası, Google arama sırası
// ve Gemini (Google arama destekli) cevaplarında adının geçip geçmediğini ölçer.
// Gerekli gizli anahtarlar (Supabase > Edge Functions > Secrets): SERPAPI_KEY, GEMINI_API_KEY
// İsteğe bağlı: GEMINI_MODEL, GUNLUK_OLCUM_HAKKI (varsayılan 5)
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// Türkçe karakterleri sadeleştirip karşılaştırmaya hazırlar
function sade(x: string): string {
  return (x || "")
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
const GENEL = new Set([
  "ve", "the", "ltd", "sti", "as", "a", "s", "limited", "sirketi", "san", "tic", "ticaret", "sube", "subesi",
  "klinik", "klinigi", "kliniği", "veteriner", "veterinerlik", "hayvan", "hastanesi", "hastane", "poliklinigi", "merkezi", "merkez",
  "salonu", "salon", "kuafor", "berber", "guzellik", "dis", "agiz", "sagligi", "restoran", "restaurant", "kafe", "cafe",
  "emlak", "ofisi", "ofis", "hukuk", "burosu", "avukatlik", "danismanlik", "kursu", "kurs", "spor", "studio", "studyo",
  "petshop", "pet", "shop", "magaza", "magazasi", "istanbul", "ankara", "izmir",
]);
function cekirdek(ad: string): string[] {
  return sade(ad).split(" ").filter((t) => t.length >= 3 && !GENEL.has(t));
}
function alanAdi(url?: string | null): string {
  if (!url) return "";
  try {
    return new URL(url.startsWith("http") ? url : "https://" + url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
// Adres istenen semt/şehirde mi? (adres yoksa kabul)
function yerdeMi(adres: unknown, semtKisa: string, sehir: string, turkiye: boolean): boolean {
  if (turkiye || !adres) return true;
  const a = " " + sade(String(adres)) + " ";
  return [semtKisa, sehir].filter(Boolean).some((y) => a.includes(" " + sade(y)));
}
// İşletme adı bir başlıkla/metinle eşleşiyor mu?
function adGeciyor(metin: string, ad: string): boolean {
  const m = " " + sade(metin) + " ";
  const c = cekirdek(ad);
  if (c.length === 0) return m.includes(" " + sade(ad) + " ");
  const bulunan = c.filter((t) => m.includes(" " + t + " ") || m.includes(" " + t)).length;
  return c.length === 1 ? bulunan === 1 && c[0].length >= 4 : bulunan >= Math.ceil(c.length * 0.6);
}

async function serp(params: Record<string, string>, anahtar: string) {
  const u = new URL("https://serpapi.com/search.json");
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set("api_key", anahtar);
  const r = await fetch(u, { signal: AbortSignal.timeout(30000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error("SerpApi: " + (j.error || r.status));
  return j;
}

let aramaKotasiYok = false; // bir istekte arama kotası yoksa diğer sorularda tekrar denenmez
async function gemini(soru: string, anahtar: string, modeller: string[]) {
  let sonHata = "";
  for (const model of modeller) {
    // Önce Google arama destekli dene; arama ücretsiz kotada yoksa aramasız sor
    for (const aramali of aramaKotasiYok ? [false] : [true, false]) {
      const t0 = Date.now();
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": anahtar },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: soru }] }],
          ...(aramali ? { tools: [{ google_search: {} }] } : {}),
          generationConfig: { temperature: 0.4, maxOutputTokens: 1500 },
        }),
        signal: AbortSignal.timeout(35000),
      });
      const j = await r.json().catch(() => ({}));
      const mesaj = String(j?.error?.message || r.status);
      if (r.status === 404 || r.status === 400 && /not found|not supported/i.test(mesaj)) { sonHata = `${model}: bulunamadı`; break; }
      if (r.status === 429 || r.status === 403) { sonHata = `${model}${aramali ? " (aramalı)" : ""}: kota`; if (aramali) aramaKotasiYok = true; continue; }
      if (!r.ok) throw new Error("Gemini: " + mesaj);
      const metin = (j?.candidates?.[0]?.content?.parts || []).filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text || "").join("").trim();
      console.log("gemini", model, aramali ? "aramali" : "aramasiz", Date.now() - t0, "ms");
      if (!metin) { sonHata = `${model}: boş cevap`; continue; }
      return { model, metin, aramali };
    }
  }
  throw new Error("Gemini: ücretsiz kota yetmedi ya da model bulunamadı (" + sonHata + ")");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ hata: "Sadece POST" }, 405);

  const URL_ = Deno.env.get("SUPABASE_URL")!;
  const auth = req.headers.get("Authorization") || "";
  const kullaniciDb = createClient(URL_, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: u } = await kullaniciDb.auth.getUser();
  if (!u?.user) return json({ hata: "Giriş yapmanız gerekiyor." }, 401);
  const db = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: isl } = await db.from("isletmeler").select("*").eq("sahip", u.user.id).maybeSingle();
  if (!isl || !isl.kurulum_bitti) return json({ hata: "Önce kurulumu tamamlayın." }, 400);

  // Günlük ölçüm hakkı
  const hak = parseInt(Deno.env.get("GUNLUK_OLCUM_HAKKI") || "5", 10);
  const { count } = await db.from("olcumler").select("id", { count: "exact", head: true })
    .eq("sahip", u.user.id).gte("baslangic", new Date(Date.now() - 864e5).toISOString());
  if ((count || 0) >= hak) return json({ hata: `Bugünkü ölçüm hakkınız (${hak}) doldu. Yarın tekrar deneyin.` }, 429);

  const ortam = Deno.env.toObject();
  const bul = (ad: string) => (ortam[ad] || Object.entries(ortam).find(([k]) => k.trim().toUpperCase() === ad)?.[1] || "").trim();
  const SERP = bul("SERPAPI_KEY");
  const GEM = bul("GEMINI_API_KEY");
  const eksik = [!SERP && "SERPAPI_KEY", !GEM && "GEMINI_API_KEY"].filter(Boolean);
  if (eksik.length === 2) return json({ hata: "Ölçüm anahtarları henüz eklenmedi: " + eksik.join(", ") }, 503);

  const semtKisa = (isl.semt || "").split(",")[0].trim();
  const sehir = ((isl.semt || "").split(",")[1] || "").trim();
  const turkiye = isl.semt === "Türkiye geneli";
  const isK = (isl.is_turu || "").toLocaleLowerCase("tr");
  const sorgu = turkiye ? isK : `${isK} ${semtKisa}`;
  const siteAlan = alanAdi(isl.site);

  const { data: kayit } = await db.from("olcumler").insert({ isletme_id: isl.id, sahip: u.user.id, durum: "suruyor" }).select("id").single();
  const hatalar: string[] = eksik.map((e) => `${e} eksik`);
  const s: Record<string, unknown> = { harita_sorgu: sorgu, arama_sorgu: sorgu };

  // 1) Google Haritalar
  const harita = async () => {
    if (!SERP) return;
    const j = await serp({ engine: "google_maps", type: "search", q: sorgu, hl: "tr" }, SERP);
    const lr = (j.local_results || []) as Array<Record<string, unknown>>;
    const liste = lr.slice(0, 20).map((r, i) => ({
      sira: (r.position as number) || i + 1, ad: r.title, puan: r.rating ?? null, yorum: r.reviews ?? null,
      adres: r.address ?? null, site: r.website ?? null, tur: r.type ?? null, place_id: r.place_id ?? null,
    }));
    const ben = liste.find((r) => (adGeciyor(String(r.ad || ""), isl.ad) || (siteAlan && alanAdi(String(r.site || "")) === siteAlan)) && yerdeMi(r.adres, semtKisa, sehir, turkiye));
    s.harita_sira = ben ? ben.sira : null;
    s.harita_sonuclar = liste.slice(0, 10).map((r) => ({ ...r, siz: r === ben }));
    s.rakipler = liste.filter((r) => r !== ben).slice(0, 5);
    if (ben) {
      s.isletme_bilgi = { ad: ben.ad, puan: ben.puan, yorum: ben.yorum, adres: ben.adres, tur: ben.tur, bulundu: true };
    } else {
      // Aramada çıkmadıysa işletmeyi adıyla bulmayı dene (profil var mı?)
      const j2 = await serp({ engine: "google_maps", type: "search", q: `${isl.ad} ${turkiye ? "" : semtKisa}`.trim(), hl: "tr" }, SERP);
      const adaylar = [...(j2.local_results || []), ...(j2.place_results ? [j2.place_results] : [])] as Array<Record<string, unknown>>;
      const ayni = adaylar.filter((r) => adGeciyor(String(r.title || ""), isl.ad));
      const b = ayni.find((r) => yerdeMi(r.address, semtKisa, sehir, turkiye));
      const baska = !b && ayni[0];
      s.isletme_bilgi = b
        ? { ad: b.title, puan: b.rating ?? null, yorum: b.reviews ?? null, adres: b.address ?? null, tur: b.type ?? null, bulundu: true }
        : { bulundu: false, baska_sube: baska ? { ad: baska.title, adres: baska.address ?? null, puan: baska.rating ?? null, yorum: baska.reviews ?? null } : null };
    }
  };

  // 2) Google arama (normal sonuçlar + yerel kutu)
  const arama = async () => {
    if (!SERP) return;
    const j = await serp({ engine: "google", q: sorgu, hl: "tr", gl: "tr", google_domain: "google.com.tr", num: "20" }, SERP);
    const org = ((j.organic_results || []) as Array<Record<string, unknown>>).map((r, i) => ({
      sira: (r.position as number) || i + 1, baslik: r.title,
      link: /^https?:/.test(String(r.link || "")) ? r.link : (r.redirect_link && /^https?:/.test(String(r.redirect_link)) && !/google\./.test(String(r.redirect_link)) ? r.redirect_link : null),
      gorunen: String(r.displayed_link || r.source || "").split(" ")[0],
    }));
    const alanOf = (r: { link: unknown; gorunen: string }) => alanAdi(r.link ? String(r.link) : r.gorunen);
    const ben = org.find((r) => (siteAlan && alanOf(r) === siteAlan) || adGeciyor(String(r.baslik || ""), isl.ad));
    const yerel = (((j.local_results || {}) as Record<string, unknown>).places || []) as Array<Record<string, unknown>>;
    const yerelBen = yerel.findIndex((p) => adGeciyor(String(p.title || ""), isl.ad));
    s.arama_sira = ben ? ben.sira : null;
    s.arama_sonuclar = { organik: org.slice(0, 10).map((r) => ({ ...r, siz: r === ben })), yerel_kutu: yerel.slice(0, 3).map((p) => p.title), yerel_kutuda: yerelBen >= 0 ? yerelBen + 1 : null };
  };

  // 3) Yapay zekâ (Gemini + Google arama)
  const yz = async () => {
    if (!GEM) return;
    // Ücretsiz planda Google arama aracı yok; GEMINI_ARAMALI=1 ise (ücretli plan) aramalı sorar
    aramaKotasiYok = (Deno.env.get("GEMINI_ARAMALI") || "") !== "1";
    const yer = turkiye ? "Türkiye'de" : `${semtKisa}${sehir ? ", " + sehir : ""} bölgesinde`;
    const sorular = [
      `${yer} iyi bir ${isK} önerir misin? Birkaç işletme adı ver.`,
      `${turkiye ? "" : semtKisa + " civarında "}en çok tavsiye edilen ${isK} hangileri?`.trim(),
      `${yer} ${isK} arıyorum, güvenilir bir yer söyler misin?`,
    ];
    const modeller = [Deno.env.get("GEMINI_MODEL"), "gemini-flash-lite-latest", "gemini-2.5-flash-lite", "gemini-flash-latest", "gemini-2.5-flash"].filter(Boolean) as string[];
    const KISA = " Kısa cevap ver: 3-5 işletme adı ve her biri için tek cümle.";
    const cevaplar: Array<Record<string, unknown>> = await Promise.all(sorular.map(async (soru) => {
      try {
        const { model, metin, aramali } = await gemini(soru + KISA, GEM, modeller);
        return { soru, model, aramali, geciyor: adGeciyor(metin, isl.ad), ozet: metin.slice(0, 1200) };
      } catch (e) {
        return { soru, hata: /timed out|aborted/i.test(String((e as Error).message)) ? "Yapay zekâ zamanında cevap vermedi." : String((e as Error).message).slice(0, 200) };
      }
    }));
    const basarili = cevaplar.filter((c) => !("hata" in c));
    s.yz_soru_sayisi = basarili.length;
    s.yz_gecen = basarili.filter((c) => (c as { geciyor: boolean }).geciyor).length;
    s.yz_cevaplar = cevaplar;
    const hataliYz = cevaplar.filter((c) => "hata" in c);
    if (hataliYz.length) hatalar.push(`Yapay zekâ: ${hataliYz.length} soru sorulamadı (${String(hataliYz[0].hata).slice(0, 140)})`);
  };

  const sonuclar = await Promise.allSettled([harita(), arama(), yz()]);
  sonuclar.forEach((r) => { if (r.status === "rejected") hatalar.push(String(r.reason?.message || r.reason).slice(0, 200)); });

  const hepsiHata = sonuclar.every((r) => r.status === "rejected");
  const guncel = { ...s, hatalar, durum: hepsiHata ? "hata" : "bitti", bitis: new Date().toISOString() };
  const { data: son } = await db.from("olcumler").update(guncel).eq("id", kayit!.id).select("*").single();
  return json({ olcum: son }, hepsiHata ? 502 : 200);
});
