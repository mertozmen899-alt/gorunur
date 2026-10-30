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
// İş türünden aramalarda kullanılacak çekirdek kelime ("mobilya satıcısı" -> "mobilya")
const EKLER = new Set(["satıcısı", "satıcı", "satış", "mağazası", "mağaza", "firması", "firma", "hizmeti", "hizmetleri", "merkezi", "noktası", "şirketi"]);
function otomatikKelimeler(isK: string, yer: string): string[] {
  const kelimeler = isK.split(/\s+/).filter(Boolean);
  const cekir = kelimeler.filter((k) => !EKLER.has(k)).join(" ") || isK;
  const adaylar = [`${yer} ${cekir}`, `${isK} ${yer}`, `en iyi ${cekir} ${yer}`, `${cekir} ${yer} tavsiye`];
  return tekillestir(adaylar).slice(0, 3);
}
function tekillestir(liste: string[]): string[] {
  const gorulen = new Set<string>(), sonuc: string[] = [];
  for (const k of liste.map((x) => x.replace(/\s+/g, " ").trim()).filter(Boolean)) {
    const imza = sade(k).split(" ").sort().join(" ");
    if (!gorulen.has(imza)) { gorulen.add(imza); sonuc.push(k); }
  }
  return sonuc;
}
// Google otomatik tamamlama: insanların en çok yazdığı aramalar (Google'ın kendi sırasıyla)
const ALAKASIZ = /(iş ilan|is ilan|eleman|maaş|maas|nedir|nasıl yapılır|nasil yapilir|kariyer|staj|sahibinden|letgo|dolandırıcı|şikayet|sikayet|telefon numarası|haritası|wiki)/i;
async function populerAramalar(cekir: string, yer: string, anahtar: string): Promise<string[]> {
  const sorgular = yer ? [`${yer} ${cekir}`, `${cekir} ${yer}`] : [cekir];
  const sonuc = await Promise.allSettled(sorgular.map((q) => serp({ engine: "google_autocomplete", q, gl: "tr", hl: "tr" }, anahtar)));
  const listeler = sonuc.map((r) => r.status === "fulfilled" ? ((r.value.suggestions || []) as Array<{ value?: string }>).map((x) => String(x.value || "")) : []);
  // İki listeyi sırayla birleştir (1. öneri, 1. öneri, 2. öneri, ...)
  const karisik: string[] = [];
  for (let i = 0; i < 10; i++) for (const l of listeler) if (l[i]) karisik.push(l[i]);
  const cekirSade = sade(cekir).split(" ").filter((t) => t.length >= 3);
  const yerSade = sade(yer);
  const uygun = karisik.filter((k) => {
    const ks = " " + sade(k) + " ";
    return !ALAKASIZ.test(k) && k.split(" ").length <= 6 &&
      cekirSade.some((t) => ks.includes(" " + t.slice(0, Math.max(4, t.length - 2)))) &&
      (!yerSade || ks.includes(" " + yerSade));
  });
  return tekillestir(uygun.map((k) => k.toLocaleLowerCase("tr")));
}
// Google sonuçlarında rehber / liste sayfası olanları ayırır
const REHBER_ALAN = /(yandex\.|cybo\.com|foursquare\.com|tripadvisor\.|armut\.com|doktortakvimi\.com|bulurum\.com|rehber|infobel|kompass|cylex|hotfrog|mapcarta|wanderlog|yelp\.|sikayetvar\.com|firma|nerede|yakinimda|eniyi|listele|kurumsal|sarisayfa|yellowpages|ilan|zingat|hepsiemlak|sahibinden\.com|trendyol\.com|hepsiburada\.com|n11\.com|getir|yemeksepeti|booking\.com|etstur|obilet)/i;
const REHBER_BASLIK = /(listesi|rehberi|firmaları|firmalari|mağazaları|magazalari|en iyi|yakınımda|yakinimda|adresleri|telefonları|telefonlari|nerede|tavsiye|önerileri|onerileri)/i;
// "rehber": liste/rehber sitesi (adınızı ekletin); "rakip": rakibin kendi sitesindeki liste başlıklı sayfa (siz de yapın)
function rehberTuru(baslik: string, alan: string): "rehber" | "rakip" | null {
  if (!alan || /google\.|instagram\.com|facebook\.com|youtube\.com|tiktok\.com|wikipedia/i.test(alan)) return null;
  if (REHBER_ALAN.test(alan)) return "rehber";
  if (REHBER_BASLIK.test(baslik)) return "rakip";
  return null;
}
// Sektöre özel rehber ve platform siteleri: yapay zekâya sorulur, her alan adının gerçekten açıldığı denetlenir
async function sektorRehberleri(isK: string, GEM: string, modeller: string[]) {
  const soru = `Türkiye'de "${isK}" işletmelerinin müşteriler tarafından bulunduğu ve işletmenin kendine profil, ilan ya da mağaza açabildiği Türk rehber, platform ve pazar yeri sitelerini listele. Sadece gerçekten var olan, Türkiye'de bilinen siteler olsun. Google, Bing, Apple, Yandex haritaları, Instagram ve Facebook'u yazma. En fazla 6 site. Sadece şu biçimde JSON dizi döndür: [{"ad":"Site adı","alan":"ornek.com","ne_ise_yarar":"Bu işletme için neden önemli, tek kısa cümle"}]`;
  const { metin } = await gemini(soru, GEM, modeller, true);
  let liste: Array<{ ad?: string; alan?: string; ne_ise_yarar?: string }> = [];
  try { liste = JSON.parse(metin.replace(/^```(json)?|```$/g, "").trim()); } catch { return []; }
  if (!Array.isArray(liste)) return [];
  const temiz = liste.map((x) => ({ ad: String(x.ad || "").slice(0, 60), alan: alanAdi(String(x.alan || "")), ne_ise_yarar: String(x.ne_ise_yarar || "").slice(0, 200) }))
    .filter((x) => x.ad && /^[a-z0-9.-]+\.[a-z]{2,}$/.test(x.alan) && !/google\.|bing\.|apple\.|yandex\.|instagram\.|facebook\./.test(x.alan));
  // Alan adı gerçekten açılıyor mu? (uydurma siteleri ele)
  const denetim = await Promise.allSettled(temiz.map(async (x) => {
    const r = await fetch("https://" + x.alan, { redirect: "follow", signal: AbortSignal.timeout(7000), headers: { "User-Agent": "Mozilla/5.0 (GorunurDenetim)" } });
    await r.body?.cancel();
    if (r.status >= 500 && r.status !== 503) throw new Error("kapali");
    return x;
  }));
  return denetim.filter((d) => d.status === "fulfilled").map((d) => (d as PromiseFulfilledResult<typeof temiz[number]>).value).slice(0, 6);
}
// Adres istenen semt/şehirde mi? (adres yoksa kabul)
function yerdeMi(adres: unknown, semtKisa: string, sehir: string, turkiye: boolean): boolean {
  if (turkiye || !adres) return true;
  const a = " " + sade(String(adres)) + " ";
  return [semtKisa, sehir].filter(Boolean).some((y) => a.includes(" " + sade(y)));
}
// İşletme adı bir başlıkla/metinle eşleşiyor mu?
// haric: her cevapta zaten geçen kelimeler (şehir, semt, sektör); bunlar ad eşleşmesi sayılmaz
function adGeciyor(metin: string, ad: string, haric?: Set<string>): boolean {
  const m = " " + sade(metin) + " ";
  const c = cekirdek(ad).filter((t) => !haric || !haric.has(t));
  if (c.length === 0) return m.includes(" " + sade(ad) + " ");
  const bulunan = c.filter((t) => m.includes(" " + t + " ") || m.includes(" " + t)).length;
  return c.length === 1 ? bulunan === 1 && c[0].length >= 4 : bulunan >= Math.ceil(c.length * 0.5);
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
async function gemini(soru: string, anahtar: string, modeller: string[], jsonMod = false) {
  let sonHata = "";
  for (const model of modeller) {
    // Önce Google arama destekli dene; arama ücretsiz kotada yoksa aramasız sor
    for (const aramali of aramaKotasiYok ? [false] : [true, false]) {
      const t0 = Date.now();
      let r: Response;
      try {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": anahtar },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: soru }] }],
          ...(aramali && !jsonMod ? { tools: [{ google_search: {} }] } : {}),
          generationConfig: { temperature: jsonMod ? 0.2 : 0.4, maxOutputTokens: 1500, ...(jsonMod ? { responseMimeType: "application/json" } : {}) },
        }),
        signal: AbortSignal.timeout(jsonMod ? 25000 : 35000),
      });
      } catch (e) { sonHata = `${model}: ${/timed out|abort/i.test(String(e)) ? "zaman aşımı" : "bağlantı hatası"}`; break; }
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

type Db = ReturnType<typeof createClient>;
type Isl = Record<string, any>;
function anahtarlar() {
  const ortam = Deno.env.toObject();
  const bul = (ad: string) => (ortam[ad] || Object.entries(ortam).find(([k]) => k.trim().toUpperCase() === ad)?.[1] || "").trim();
  return { SERP: bul("SERPAPI_KEY"), GEM: bul("GEMINI_API_KEY") };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ hata: "Sadece POST" }, 405);

  const URL_ = Deno.env.get("SUPABASE_URL")!;
  const db = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { SERP, GEM } = anahtarlar();

  // Haftalık otomatik ölçüm: veritabanındaki zamanlanmış iş çağırır
  const cronAnahtar = req.headers.get("x-gorunur-cron");
  if (cronAnahtar) {
    const { data: ayar } = await db.from("cron_ayar").select("deger").eq("ad", "olcum_anahtari").maybeSingle();
    if (!ayar || ayar.deger !== cronAnahtar) return json({ hata: "Yetkisiz" }, 401);
    if (!SERP && !GEM) return json({ hata: "Anahtar yok" }, 503);
    const sinir = new Date(Date.now() - 6.5 * 864e5).toISOString();
    const { data: isletmeler } = await db.from("isletmeler").select("*").eq("kurulum_bitti", true).eq("haftalik_olcum", true);
    const sirada: Isl[] = [];
    for (const isl of isletmeler || []) {
      const { data: son } = await db.from("olcumler").select("baslangic").eq("isletme_id", isl.id).order("baslangic", { ascending: false }).limit(1).maybeSingle();
      if (!son || son.baslangic < sinir) sirada.push(isl);
      if (sirada.length >= 2) break; // bir çağrıda en fazla 2 işletme (süre sınırı)
    }
    // Arka planda sırayla ölç, isteğe hemen cevap ver
    // @ts-ignore EdgeRuntime Supabase ortamında var
    EdgeRuntime.waitUntil((async () => {
      for (const isl of sirada) {
        try { await olcumYap(db, isl, SERP, GEM, "haftalik"); } catch (e) { console.log("haftalik olcum hatasi", isl.id, String(e)); }
      }
    })());
    return json({ sirada: sirada.length }, 202);
  }

  // Kullanıcının kendi başlattığı ölçüm
  const auth = req.headers.get("Authorization") || "";
  const kullaniciDb = createClient(URL_, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: u } = await kullaniciDb.auth.getUser();
  if (!u?.user) return json({ hata: "Giriş yapmanız gerekiyor." }, 401);

  const { data: isl } = await db.from("isletmeler").select("*").eq("sahip", u.user.id).maybeSingle();
  if (!isl || !isl.kurulum_bitti) return json({ hata: "Önce kurulumu tamamlayın." }, 400);

  // Günlük ölçüm hakkı (otomatik haftalık ölçümler sayılmaz)
  const hak = parseInt(Deno.env.get("GUNLUK_OLCUM_HAKKI") || "5", 10);
  const { count } = await db.from("olcumler").select("id", { count: "exact", head: true })
    .eq("sahip", u.user.id).eq("kaynak", "elle").gte("baslangic", new Date(Date.now() - 864e5).toISOString());
  if ((count || 0) >= hak) return json({ hata: `Bugünkü ölçüm hakkınız (${hak}) doldu. Yarın tekrar deneyin.` }, 429);

  if (!SERP && !GEM) return json({ hata: "Ölçüm anahtarları henüz eklenmedi: SERPAPI_KEY, GEMINI_API_KEY" }, 503);
  const { son, hepsiHata } = await olcumYap(db, isl, SERP, GEM, "elle");
  return json({ olcum: son }, hepsiHata ? 502 : 200);
});

async function olcumYap(db: Db, isl: Isl, SERP: string, GEM: string, kaynak: "elle" | "haftalik") {
  const eksik = [!SERP && "SERPAPI_KEY", !GEM && "GEMINI_API_KEY"].filter(Boolean) as string[];
  const semtKisa = (isl.semt || "").split(",")[0].trim();
  const sehir = ((isl.semt || "").split(",")[1] || "").trim();
  const turkiye = isl.semt === "Türkiye geneli";
  const isK = (isl.is_turu || "").toLocaleLowerCase("tr");
  const yerK = turkiye ? "" : semtKisa.toLocaleLowerCase("tr");
  const elle = ((isl.anahtar_kelimeler || []) as string[]).map((k) => String(k).toLocaleLowerCase("tr").trim()).filter((k) => k.length >= 2).slice(0, 5);
  // Sektörün en çok aranan aramaları: Google otomatik tamamlamadan, 30 günde bir yenilenir
  let populer = (isl.oto_kelimeler || []) as string[];
  const eski = !isl.oto_kelimeler_tarih || Date.now() - new Date(isl.oto_kelimeler_tarih).getTime() > 30 * 864e5;
  if (SERP && eski) {
    try {
      const cekir = isK.split(/\s+/).filter((k) => k && !EKLER.has(k)).join(" ") || isK;
      const yeni = await populerAramalar(cekir, yerK, SERP);
      if (yeni.length) {
        populer = yeni.slice(0, 8);
        await db.from("isletmeler").update({ oto_kelimeler: populer, oto_kelimeler_tarih: new Date().toISOString() }).eq("id", isl.id);
      }
    } catch (e) { console.log("otomatik tamamlama alinamadi", String(e)); }
  }
  // Sıra: kullanıcının yazdıkları, en çok arananlar, kendi ürettiklerimiz. En fazla 5 arama.
  const kelimeler = tekillestir([...elle, ...populer, ...otomatikKelimeler(isK, yerK)]).slice(0, 5);
  const siteAlan = alanAdi(isl.site);
  const haric = new Set(sade([semtKisa, sehir, isK, ...kelimeler].join(" ")).split(" ").filter((t) => t.length >= 3));

  const { data: kayit } = await db.from("olcumler").insert({ isletme_id: isl.id, sahip: isl.sahip, durum: "suruyor", kaynak }).select("id").single();
  const hatalar: string[] = eksik.map((e) => `${e} eksik`);
  const s: Record<string, unknown> = {};
  type Satir = { sira: number; ad: unknown; puan: unknown; yorum: unknown; adres: unknown; site: unknown; tur: unknown; place_id: unknown; siz?: boolean };
  const kelimeSonuc: Array<Record<string, unknown>> = kelimeler.map((k) => ({ kelime: k }));
  const benMi = (r: Satir) => (adGeciyor(String(r.ad || ""), isl.ad, haric) || (siteAlan && alanAdi(String(r.site || "")) === siteAlan)) && yerdeMi(r.adres, semtKisa, sehir, turkiye);

  // 1) Google Haritalar: her arama kelimesi için
  const haritaListeleri: Satir[][] = [];
  const harita = async () => {
    if (!SERP) return;
    const sonuc = await Promise.allSettled(kelimeler.map((q) => serp({ engine: "google_maps", type: "search", q, hl: "tr" }, SERP)));
    sonuc.forEach((r, i) => {
      if (r.status === "rejected") { kelimeSonuc[i].harita_hata = true; hatalar.push(`Haritalar (${kelimeler[i]}): ` + String(r.reason?.message || r.reason).slice(0, 120)); return; }
      const lr = (r.value.local_results || []) as Array<Record<string, unknown>>;
      const liste: Satir[] = lr.slice(0, 20).map((x, j) => ({
        sira: (x.position as number) || j + 1, ad: x.title, puan: x.rating ?? null, yorum: x.reviews ?? null,
        adres: x.address ?? null, site: x.website ?? null, tur: x.type ?? null, place_id: x.place_id ?? null,
      }));
      haritaListeleri[i] = liste;
      const ben = liste.find(benMi);
      kelimeSonuc[i].harita_sira = ben ? ben.sira : null;
      kelimeSonuc[i].harita_bakilan = liste.length;
      kelimeSonuc[i].harita_ilk3 = liste.filter((x) => x !== ben).slice(0, 3).map((x) => x.ad);
    });
    // Ana gösterim: en iyi sırada çıkılan arama (yoksa ilk ölçülebilen)
    let ana = -1;
    kelimeSonuc.forEach((k, i) => { if (k.harita_sira && (ana < 0 || (k.harita_sira as number) < (kelimeSonuc[ana].harita_sira as number))) ana = i; });
    if (ana < 0) ana = haritaListeleri.findIndex((l) => l);
    if (ana < 0) return;
    const liste = haritaListeleri[ana], ben = liste.find(benMi);
    s.harita_sorgu = kelimeler[ana];
    s.harita_sira = ben ? ben.sira : null;
    s.harita_sonuclar = liste.slice(0, 10).map((r) => ({ ...r, siz: r === ben }));
    s.rakipler = liste.filter((r) => r !== ben).slice(0, 5);
    if (ben) {
      s.isletme_bilgi = { ad: ben.ad, puan: ben.puan, yorum: ben.yorum, adres: ben.adres, tur: ben.tur, bulundu: true };
    } else {
      // Hiçbir aramada çıkmadıysa işletmeyi adıyla bulmayı dene (profil var mı?)
      const j2 = await serp({ engine: "google_maps", type: "search", q: `${isl.ad} ${turkiye ? "" : semtKisa}`.trim(), hl: "tr" }, SERP);
      const adaylar = [...(j2.local_results || []), ...(j2.place_results ? [j2.place_results] : [])] as Array<Record<string, unknown>>;
      const ayni = adaylar.filter((r) => adGeciyor(String(r.title || ""), isl.ad, haric));
      const b = ayni.find((r) => yerdeMi(r.address, semtKisa, sehir, turkiye));
      const baska = !b && ayni[0];
      s.isletme_bilgi = b
        ? { ad: b.title, puan: b.rating ?? null, yorum: b.reviews ?? null, adres: b.address ?? null, tur: b.type ?? null, bulundu: true }
        : { bulundu: false, baska_sube: baska ? { ad: baska.title, adres: baska.address ?? null, puan: baska.rating ?? null, yorum: baska.reviews ?? null } : null };
    }
  };

  const rehberSayfalari: Array<{ baslik: string; alan: string; kelime: string; sira: number; tur: string }> = [];
  // 2) Google arama: ilk 2 kelime (SerpApi kotasını korumak için)
  const arama = async () => {
    if (!SERP) return;
    const aranacak = kelimeler.slice(0, 2);
    const sonuc = await Promise.allSettled(aranacak.map((q) => serp({ engine: "google", q, hl: "tr", gl: "tr", google_domain: "google.com.tr", num: "20" }, SERP)));
    let enIyi: Record<string, unknown> | null = null;
    sonuc.forEach((r, i) => {
      if (r.status === "rejected") { kelimeSonuc[i].arama_hata = true; hatalar.push(`Google arama (${aranacak[i]}): ` + String(r.reason?.message || r.reason).slice(0, 120)); return; }
      const j = r.value;
      const org = ((j.organic_results || []) as Array<Record<string, unknown>>).map((x, n) => ({
        sira: (x.position as number) || n + 1, baslik: x.title,
        link: /^https?:/.test(String(x.link || "")) ? x.link : (x.redirect_link && /^https?:/.test(String(x.redirect_link)) && !/google\./.test(String(x.redirect_link)) ? x.redirect_link : null),
        gorunen: String(x.displayed_link || x.source || "").split(" ")[0],
      }));
      const alanOf = (x: { link: unknown; gorunen: string }) => alanAdi(x.link ? String(x.link) : x.gorunen);
      const ben = org.find((x) => (siteAlan && alanOf(x) === siteAlan) || adGeciyor(String(x.baslik || ""), isl.ad, haric));
      const yerel = (((j.local_results || {}) as Record<string, unknown>).places || []) as Array<Record<string, unknown>>;
      const yerelBen = yerel.findIndex((p) => adGeciyor(String(p.title || ""), isl.ad, haric));
      for (const x of org) {
        const alan = alanOf(x);
        const tur = x !== ben ? rehberTuru(String(x.baslik || ""), alan) : null;
        if (tur && alan !== siteAlan && !rehberSayfalari.some((y) => y.alan === alan))
          rehberSayfalari.push({ baslik: String(x.baslik || ""), alan, kelime: aranacak[i], sira: x.sira as number, tur });
      }
      kelimeSonuc[i].arama_sira = ben ? ben.sira : null;
      kelimeSonuc[i].yerel_kutuda = yerelBen >= 0 ? yerelBen + 1 : null;
      kelimeSonuc[i].yerel_kutu = yerel.slice(0, 3).map((p) => p.title);
      const ozet = { kelime: aranacak[i], sira: ben ? ben.sira : null, organik: org.slice(0, 10).map((x) => ({ ...x, siz: x === ben })), yerel_kutu: yerel.slice(0, 3).map((p) => p.title), yerel_kutuda: yerelBen >= 0 ? yerelBen + 1 : null };
      if (!enIyi || (ozet.sira && (!enIyi.sira || ozet.sira < (enIyi.sira as number)))) enIyi = ozet;
    });
    if (enIyi) {
      const e = enIyi as Record<string, unknown>;
      s.arama_sorgu = e.kelime; s.arama_sira = e.sira;
      s.arama_sonuclar = { organik: e.organik, yerel_kutu: e.yerel_kutu, yerel_kutuda: e.yerel_kutuda };
    }
  };

  // 3) Yapay zekâ: 10 müşteri sorusu; kaç cevapta adınız ve rakiplerin adı geçiyor
  const yz = async () => {
    if (!GEM) return;
    // Ücretsiz planda Google arama aracı yok; GEMINI_ARAMALI=1 ise (ücretli plan) aramalı sorar
    aramaKotasiYok = (Deno.env.get("GEMINI_ARAMALI") || "") !== "1";
    const yer = turkiye ? "Türkiye'de" : `${semtKisa}${sehir ? ", " + sehir : ""} bölgesinde`;
    const cekir = isK.split(/\s+/).filter((k) => k && !EKLER.has(k)).join(" ") || isK;
    const sorular = tekillestir([
      `${yer} iyi bir ${isK} önerir misin?`,
      `${yer} en çok tavsiye edilen ${isK} hangileri?`,
      `${yer} ${isK} arıyorum, güvenilir bir yer söyler misin?`,
      `${yer} uygun fiyatlı ${cekir} için nereye gitmeliyim?`,
      `${yer} kaliteli ${cekir} için hangi işletmeyi önerirsin?`,
      ...kelimeler.map((k) => `"${k}" diye arıyorum. Hangi işletmeleri önerirsin?`),
    ]).slice(0, 10);
    const modeller = [Deno.env.get("GEMINI_MODEL"), "gemini-flash-lite-latest", "gemini-2.5-flash-lite", "gemini-flash-latest", "gemini-2.5-flash"].filter(Boolean) as string[];
    const KISA = " Kısa cevap ver: 3-5 işletme adı ve her biri için tek cümle.";
    const cevaplar: Array<Record<string, unknown>> = new Array(sorular.length);
    // Dakikalık sınıra takılmamak için aynı anda en fazla 4 soru
    let sira = 0;
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (sira < sorular.length) {
        const n = sira++, soru = sorular[n];
        try {
          const { model, metin, aramali } = await gemini(soru + KISA, GEM, modeller);
          cevaplar[n] = { soru, model, aramali, geciyor: adGeciyor(metin, isl.ad, haric), ozet: metin.slice(0, 1200) };
        } catch (e) {
          cevaplar[n] = { soru, hata: /timed out|aborted/i.test(String((e as Error).message)) ? "Yapay zekâ zamanında cevap vermedi." : String((e as Error).message).slice(0, 200) };
        }
      }
    }));
    const basarili = cevaplar.filter((c) => c && !("hata" in c));
    s.yz_soru_sayisi = basarili.length;
    s.yz_gecen = basarili.filter((c) => (c as { geciyor: boolean }).geciyor).length;
    s.yz_cevaplar = cevaplar;
    const hataliYz = cevaplar.filter((c) => c && "hata" in c);
    if (hataliYz.length) hatalar.push(`Yapay zekâ: ${hataliYz.length} soru sorulamadı (${String(hataliYz[0].hata).slice(0, 140)})`);
    yzMetinleri = basarili.map((c) => String((c as { ozet: string }).ozet || ""));
  };
  let yzMetinleri: string[] = [];

  // 4) Sektöre özel rehber siteleri (30 günde bir yenilenir)
  const rehber = async () => {
    if (!GEM) return;
    const eskiR = !isl.sektor_rehberleri_tarih || Date.now() - new Date(isl.sektor_rehberleri_tarih).getTime() > 30 * 864e5;
    if (!eskiR) return;
    const modeller = [Deno.env.get("GEMINI_MODEL"), "gemini-flash-lite-latest", "gemini-2.5-flash-lite", "gemini-2.5-flash"].filter(Boolean) as string[];
    try {
      const liste = await sektorRehberleri(isK, GEM, modeller);
      if (liste.length) await db.from("isletmeler").update({ sektor_rehberleri: liste, sektor_rehberleri_tarih: new Date().toISOString() }).eq("id", isl.id);
    } catch (e) { console.log("sektor rehberleri alinamadi", String(e)); }
  };

  const sonuclar = await Promise.allSettled([harita(), arama(), yz(), rehber()]);
  sonuclar.forEach((r) => { if (r.status === "rejected") hatalar.push(String(r.reason?.message || r.reason).slice(0, 200)); });
  s.kelimeler = kelimeSonuc;
  s.rehber_sayfalari = rehberSayfalari.slice(0, 8);
  if (yzMetinleri.length) {
    const adaylar = new Map<string, string>();
    for (const l of haritaListeleri) for (const r of (l || []).slice(0, 10)) {
      const ad = String(r.ad || ""); const k = sade(ad);
      if (ad && !adaylar.has(k) && !benMi(r)) adaylar.set(k, ad);
    }
    const pay = [...adaylar.values()].slice(0, 25).map((ad) => ({ ad, sayi: yzMetinleri.filter((m) => adGeciyor(m, ad, haric)).length }))
      .filter((x) => x.sayi > 0).sort((a, b) => b.sayi - a.sayi).slice(0, 6);
    s.yz_rakipler = pay;
  }

  const hepsiHata = sonuclar.slice(0, 3).every((r) => r.status === "rejected");
  const guncel = { ...s, hatalar, durum: hepsiHata ? "hata" : "bitti", bitis: new Date().toISOString() };
  const { data: son } = await db.from("olcumler").update(guncel).eq("id", (kayit as { id: string }).id).select("*").single();
  return { son, hepsiHata };
}
