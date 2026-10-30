// Görünür yardımcı: (1) hazır metin yazma (sayfa metni, Google profil açıklaması, haftalık gönderi)
// (2) site sağlığı taraması. İkisi de SerpApi hakkı harcamaz; metinler ücretsiz Gemini kotasıyla yazılır.
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const sade = (x: string) => (x || "").toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

// ---------------- Gemini (JSON cevap) ----------------
async function gemini(soru: string, anahtar: string) {
  const modeller = [Deno.env.get("GEMINI_MODEL"), "gemini-flash-latest", "gemini-2.5-flash", "gemini-flash-lite-latest", "gemini-2.5-flash-lite"].filter(Boolean) as string[];
  let son = "";
  for (const model of modeller) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": anahtar },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: soru }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 4000, responseMimeType: "application/json" } }),
        signal: AbortSignal.timeout(45000),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { son = `${model}: ${r.status}`; continue; }
      const metin = (j?.candidates?.[0]?.content?.parts || []).filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text || "").join("").trim();
      if (!metin) { son = `${model}: boş`; continue; }
      return JSON.parse(metin.replace(/^```(json)?|```$/g, "").trim());
    } catch (e) { son = `${model}: ${String(e).slice(0, 80)}`; }
  }
  throw new Error("Yapay zekâ şu an cevap vermedi (" + son + ")");
}

const KURAL = "Kurallar: sade ve doğal Türkçe yaz, abartılı reklam dili kullanma. Bilmediğin hiçbir bilgiyi uydurma: fiyat, kuruluş yılı, ödül, sertifika, kampanya, adres, telefon, çalışma saati yazma; bunların yerine [ADRES], [TELEFON], [ÇALIŞMA SAATLERİ], [FİYAT ARALIĞI] gibi köşeli parantez bırak. Uzun tire (—) kullanma. Markdown işareti (#, *, **) kullanma.";

function metinSorusu(tur: string, isl: Record<string, any>, kelime: string) {
  const yer = isl.semt === "Türkiye geneli" ? "Türkiye geneli" : String(isl.semt || "").split(",")[0].trim();
  const tanim = `İşletme adı: "${isl.ad}". İş türü: "${isl.is_turu}". Bölge: "${yer}".${isl.site ? ` Web sitesi: ${isl.site}.` : ""}`;
  if (tur === "sayfa") return `${tanim}
Bu işletmenin web sitesine, Google'da "${kelime}" diye arayan müşterilerin bulacağı yeni bir sayfa eklenecek. Sayfanın metnini yaz. ${KURAL}
Sadece şu JSON'u döndür:
{"title":"sayfa başlığı, en fazla 60 karakter, '${kelime}' ifadesiyle başlasın ve işletme adını içersin",
"aciklama":"Google'da başlığın altında görünecek açıklama, en fazla 155 karakter",
"h1":"sayfadaki ana başlık",
"paragraflar":["3 veya 4 paragraf, toplam 250-350 kelime; işletmenin bu konuda ne sunduğunu, neden tercih edilmesi gerektiğini ve nasıl ulaşılacağını anlat; '${yer}' ve işletme adı doğal şekilde geçsin"],
"sss":[{"soru":"müşterilerin bu konuda en sık sorduğu soru","cevap":"kısa cevap"}]}
sss dizisinde tam 5 soru olsun.`;
  if (tur === "aciklama") return `${tanim}
Bu işletmenin Google İşletme Profili için "İşletme açıklaması" metnini yaz. Google kuralları: en fazla 750 karakter, web adresi, telefon, kampanya ve indirim yazılmaz, büyük harfle bağırılmaz. İlk 250 karakterde ne iş yaptığı ve hangi bölgede hizmet verdiği net geçsin. ${KURAL}
Sadece şu JSON'u döndür: {"metin":"açıklama metni"}`;
  if (tur === "gonderi") return `${tanim}
Bu işletme için bu hafta Google İşletme Profili'nde paylaşılacak 3 farklı "Güncelleme" gönderisi taslağı yaz. Her biri 80-150 kelime, farklı bir konu seçsin (ör. bir ürün veya hizmeti tanıtma, müşteriye faydalı bir ipucu, işletmenin bir günü veya ekibi). Müşterinin bu işletmeyi Google'da arayacağı kelimeler doğal şekilde geçsin. ${KURAL}
Sadece şu JSON'u döndür: {"gonderiler":[{"konu":"kısa konu adı","metin":"gönderi metni","fotograf":"bu gönderiye eklenecek fotoğraf için tek cümlelik öneri","dugme":"Ara veya Daha fazla bilgi"}]}`;
  throw new Error("Bilinmeyen metin türü");
}

// ---------------- Site sağlığı ----------------
type Kontrol = { kod: string; ad: string; tamam: boolean; agirlik: number; detay: string; oneri: string };
async function siteTara(isl: Record<string, any>) {
  let adres = String(isl.site || "").trim();
  if (!adres) throw new Error("Kurulumda web sitesi girilmemiş.");
  if (!/^https?:\/\//i.test(adres)) adres = "https://" + adres;
  // Güvenlik: sadece normal alan adları (IP adresi, localhost ve iç ağ adresleri taranmaz)
  let host = "";
  try { host = new URL(adres).hostname.toLowerCase(); } catch { throw new Error("Web sitesi adresi geçersiz."); }
  if (!host.includes(".") || /^[\d.]+$/.test(host) || host.includes(":") || /(^|\.)(localhost|local|internal|lan)$/.test(host) || /supabase\.(co|in)$/.test(host)) throw new Error("Bu web sitesi adresi taranamıyor.");
  const t0 = Date.now();
  let r: Response;
  try {
    r = await fetch(adres, { redirect: "follow", signal: AbortSignal.timeout(15000), headers: { "User-Agent": "Mozilla/5.0 (compatible; GorunurSiteSagligi/1.0; +https://mertozmen899-alt.github.io/gorunur/)", "Accept-Language": "tr-TR,tr;q=0.9" } });
  } catch (e) {
    return { adres, acildi: false, puan: 0, sure_ms: Date.now() - t0, kontroller: [{ kod: "acilmiyor", ad: "Site açılıyor mu?", tamam: false, agirlik: 100, detay: /timed out|abort/i.test(String(e)) ? "Site 15 saniyede açılmadı." : "Siteye bağlanılamadı.", oneri: "Sitenizi yapan kişiye sitenin açılmadığını bildirin. Kapalı bir site hem Google'da hem yapay zekâda sizi geriye düşürür." }] };
  }
  const sure = Date.now() - t0;
  const html = (await r.text().catch(() => "")).slice(0, 1_500_000);
  const son = r.url || adres;
  const kok = new URL(son);
  const bul = (re: RegExp) => (html.match(re) || [])[1] || "";
  const temiz = (x: string) => x.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  const title = temiz(bul(/<title[^>]*>([\s\S]*?)<\/title>/i));
  const desc = bul(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i) || bul(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i);
  const h1ler = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => temiz(m[1])).filter(Boolean);
  const viewport = /<meta[^>]+name=["']viewport["']/i.test(html);
  const noindex = /<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);
  const jsonld = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join(" ");
  const yerelSema = /"@type"\s*:\s*\[?\s*"(LocalBusiness|Store|FurnitureStore|Restaurant|VeterinaryCare|Dentist|MedicalClinic|BeautySalon|HairSalon|AutoRepair|LegalService|Attorney|RealEstateAgent|HomeAndConstructionBusiness|ProfessionalService|[A-Za-z]*Store|[A-Za-z]*Business)"/.test(jsonld);
  const govde = sade(temiz(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " "))).slice(0, 400000);
  const telVar = /href=["']tel:/i.test(html) || /(\+90|0)\s*\(?\s*[2-5]\d{2}\s*\)?[\s.-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/.test(temiz(html));
  const parca = String(isl.semt || "").split(",").map((x: string) => sade(x)).filter(Boolean);
  const yerVar = isl.semt === "Türkiye geneli" || parca.some((p: string) => govde.includes(p));
  const adTok = sade(String(isl.ad || "")).split(" ").filter((t) => t.length >= 3);
  const adVar = adTok.length ? adTok.filter((t) => govde.includes(t)).length >= Math.ceil(adTok.length / 2) : true;
  const haritaVar = /google\.[a-z.]+\/maps|maps\.google\.|goo\.gl\/maps|maps\.app\.goo\.gl/i.test(html);
  const resimler = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const altsiz = resimler.filter((i) => !/\balt=["'][^"']+["']/i.test(i)).length;
  const isK = sade(String(isl.is_turu || "")).split(" ").filter((t) => t.length >= 4);
  const titleSade = sade(title);
  const titleYer = isl.semt === "Türkiye geneli" || parca.some((p: string) => titleSade.includes(p));
  const titleIs = isK.some((t) => titleSade.includes(t.slice(0, Math.max(4, t.length - 2))));
  const ek = async (yol: string) => { try { const x = await fetch(new URL(yol, kok.origin), { signal: AbortSignal.timeout(6000), redirect: "follow" }); const t = await x.text(); return x.ok && t.length > 20 && !/<html/i.test(t.slice(0, 300)); } catch { return false; } };
  const [sitemap, robots] = await Promise.all([ek("/sitemap.xml"), ek("/robots.txt")]);
  const K: Kontrol[] = [
    { kod: "https", ad: "Güvenli bağlantı (https)", tamam: kok.protocol === "https:", agirlik: 10, detay: kok.protocol === "https:" ? "Siteniz güvenli bağlantıyla açılıyor." : "Siteniz güvenli bağlantı (kilit simgesi) olmadan açılıyor.", oneri: "Sitenizi yapan kişiden ücretsiz SSL sertifikası kurmasını isteyin. Tarayıcılar kilitsiz sitelerde 'Güvenli değil' uyarısı gösteriyor." },
    { kod: "hiz", ad: "Açılış hızı", tamam: sure < 3000, agirlik: 10, detay: `Ana sayfa ${(sure / 1000).toFixed(1).replace(".", ",")} saniyede geldi.`, oneri: "Sitenizi yapan kişiden resimleri küçültmesini ve sayfayı hızlandırmasını isteyin. 3 saniyeden uzun açılan sitelerden müşterilerin çoğu çıkıp gidiyor." },
    { kod: "mobil", ad: "Telefonda düzgün görünüm", tamam: viewport, agirlik: 12, detay: viewport ? "Sayfa telefon ekranına uyacak şekilde ayarlanmış." : "Sayfada telefon ekranı ayarı (viewport) yok; telefonda küçük ve bozuk görünebilir.", oneri: "Sitenizi yapan kişiden sitenin telefona uyumlu (mobil uyumlu) hâle getirilmesini isteyin. Aramaların çoğu telefondan yapılıyor." },
    { kod: "baslik", ad: "Sayfa başlığında iş ve yer", tamam: !!title && titleYer && titleIs, agirlik: 14, detay: title ? `Google'da görünen başlık: "${title.slice(0, 90)}"` : "Sayfanın Google'da görünen başlığı yok.", oneri: `Başlık şöyle olsun: "${isl.ad} | ${isl.semt === "Türkiye geneli" ? "" : String(isl.semt || "").split(",")[0].trim() + " "}${isl.is_turu || ""}". Google bir sayfanın ne hakkında olduğunu önce başlığından anlıyor.` },
    { kod: "aciklama", ad: "Google'da görünen açıklama", tamam: desc.trim().length >= 50, agirlik: 8, detay: desc ? `Açıklama: "${desc.slice(0, 120)}"` : "Sayfanın Google'da başlığın altında görünen açıklaması yok; Google rastgele bir metin seçiyor.", oneri: "Sitenizi yapan kişiden 120-155 karakterlik bir açıklama (meta description) eklemesini isteyin: ne iş yaptığınız, nerede olduğunuz ve neden sizi seçmeleri gerektiği." },
    { kod: "h1", ad: "Ana başlık", tamam: h1ler.length >= 1, agirlik: 6, detay: h1ler.length ? `Ana başlık: "${h1ler[0].slice(0, 80)}"` : "Sayfada ana başlık (H1) yok.", oneri: "Sayfanın en üstünde işinizi ve yerinizi söyleyen bir ana başlık (H1) olsun." },
    { kod: "telefon", ad: "Telefon yazı olarak var", tamam: telVar, agirlik: 10, detay: telVar ? "Sayfada telefon numarası bulundu." : "Ana sayfada yazı olarak telefon numarası bulamadık (resim içindeyse Google okuyamaz).", oneri: "Telefon numaranızı ana sayfaya yazı olarak ve tıklayınca arayacak şekilde eklettirin. Hem müşteri hem yapay zekâ sizi böyle teyit ediyor." },
    { kod: "yer", ad: "Semt ve şehir geçiyor", tamam: yerVar, agirlik: 8, detay: yerVar ? "Sayfada bölgeniz geçiyor." : "Ana sayfada semtiniz ya da şehriniz geçmiyor.", oneri: "Açık adresinizi ve hizmet verdiğiniz bölgeleri ana sayfaya yazı olarak eklettirin." },
    { kod: "ad", ad: "İşletme adı geçiyor", tamam: adVar, agirlik: 4, detay: adVar ? "İşletme adınız sayfada geçiyor." : "İşletme adınız sayfada yazı olarak geçmiyor.", oneri: "İşletme adınızı Google profilinizdeki gibi sayfada yazı olarak kullanın." },
    { kod: "sema", ad: "Yerel işletme işaretlemesi", tamam: yerelSema, agirlik: 8, detay: yerelSema ? "Sayfada Google'ın okuyabildiği işletme bilgisi (yapılandırılmış veri) var." : "Sayfada Google ve yapay zekânın kolayca okuyabildiği işletme bilgisi kartı (LocalBusiness yapılandırılmış veri) yok.", oneri: "Sitenizi yapan kişiye 'ana sayfaya LocalBusiness schema (JSON-LD) ekler misin? İçinde işletme adı, adres, telefon, çalışma saatleri ve Google Haritalar linki olsun' diye yazın." },
    { kod: "harita", ad: "Google Haritalar bağlantısı", tamam: haritaVar, agirlik: 4, detay: haritaVar ? "Sitede Google Haritalar bağlantısı ya da haritası var." : "Sitede Google Haritalar bağlantısı yok.", oneri: "İletişim bölümüne Google Haritalar'daki işletme profilinizin haritasını ya da bağlantısını eklettirin." },
    { kod: "indeks", ad: "Google'a açık", tamam: !noindex, agirlik: 6, detay: noindex ? "Sayfada 'Google listelemesin' (noindex) işareti var! Google bu sayfayı göstermez." : "Sayfa Google'a açık.", oneri: "Sitenizi yapan kişiye ACİL olarak 'noindex' işaretini kaldırmasını söyleyin. Bu işaret varken Google sitenizi hiç göstermez." },
    { kod: "sitemap", ad: "Site haritası (sitemap)", tamam: sitemap, agirlik: 0, detay: sitemap ? "sitemap.xml var." : "sitemap.xml bulunamadı.", oneri: "Sitenizi yapan kişiden sitemap.xml oluşturup Google Search Console'a eklemesini isteyin." },
    { kod: "resim", ad: "Resim açıklamaları", tamam: !resimler.length || altsiz / resimler.length <= 0.3, agirlik: 0, detay: resimler.length ? `${resimler.length} resmin ${altsiz} tanesinde açıklama (alt yazısı) yok.` : "Ana sayfada resim yok.", oneri: "Resimlere ne gösterdiklerini anlatan kısa açıklamalar (alt metni) eklettirin; örn. 'Dükkânımızın vitrini' ya da 'Yeni gelen ürünlerimiz'." },
  ];
  void robots;
  const top = K.reduce((t, k) => t + k.agirlik, 0) || 1;
  const puan = Math.round(100 * K.filter((k) => k.tamam).reduce((t, k) => t + k.agirlik, 0) / top);
  return { adres: son, acildi: r.ok, durum_kodu: r.status, puan, sure_ms: sure, title, kontroller: K };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ hata: "Sadece POST" }, 405);
  const URL_ = Deno.env.get("SUPABASE_URL")!;
  const kdb = createClient(URL_, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } });
  const { data: u } = await kdb.auth.getUser();
  if (!u?.user) return json({ hata: "Giriş yapmanız gerekiyor." }, 401);
  const db = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: isl } = await db.from("isletmeler").select("*").eq("sahip", u.user.id).maybeSingle();
  if (!isl || !isl.kurulum_bitti) return json({ hata: "Önce kurulumu tamamlayın." }, 400);
  const govde = await req.json().catch(() => ({}));

  if (govde.islem === "site") {
    // Aynı gün içinde en fazla 5 tarama (siteyi yormamak için)
    const onceki = isl.site_saglik as Record<string, any> | null;
    const bugun = new Date().toISOString().slice(0, 10);
    const sayac = onceki?.sayac?.gun === bugun ? onceki.sayac.n : 0;
    if (sayac >= 5) return json({ hata: "Bugün sitenizi 5 kez taradık. Yarın tekrar deneyin.", site: onceki }, 429);
    try {
      const sonuc = { ...(await siteTara(isl)), tarih: new Date().toISOString(), sayac: { gun: bugun, n: sayac + 1 } };
      await db.from("isletmeler").update({ site_saglik: sonuc, site_saglik_tarih: sonuc.tarih }).eq("id", isl.id);
      return json({ site: sonuc });
    } catch (e) { return json({ hata: String((e as Error).message) }, 400); }
  }

  if (govde.islem === "metin") {
    const tur = String(govde.tur || "");
    const kelime = String(govde.kelime || "").slice(0, 80);
    if (!["sayfa", "aciklama", "gonderi"].includes(tur)) return json({ hata: "Bilinmeyen metin türü." }, 400);
    if (tur === "sayfa" && kelime.length < 2) return json({ hata: "Arama kelimesi eksik." }, 400);
    const GEM = (Deno.env.get("GEMINI_API_KEY") || "").trim();
    if (!GEM) return json({ hata: "Yapay zekâ anahtarı eksik." }, 503);
    const kayit = (isl.hazir_metinler || {}) as Record<string, any>;
    const anahtar = tur === "sayfa" ? `sayfa:${sade(kelime)}` : tur;
    // Günde en fazla 15 metin
    const bugun = new Date().toISOString().slice(0, 10);
    const bugunku = kayit._sayac?.gun === bugun ? Number(kayit._sayac.n) || 0 : 0; // "Yeniden yazın" da sayılır
    if (bugunku >= 15 && !govde.onbellek) return json({ hata: "Bugünlük metin hakkınız doldu. Yarın tekrar deneyin." }, 429);
    if (govde.onbellek && kayit[anahtar]) return json({ metin: kayit[anahtar] });
    try {
      const icerik = await gemini(metinSorusu(tur, isl, kelime), GEM);
      const sonuc = { tur, kelime: tur === "sayfa" ? kelime : null, icerik, tarih: new Date().toISOString() };
      kayit[anahtar] = sonuc;
      kayit._sayac = { gun: bugun, n: bugunku + 1 };
      await db.from("isletmeler").update({ hazir_metinler: kayit }).eq("id", isl.id);
      return json({ metin: sonuc });
    } catch (e) { return json({ hata: String((e as Error).message).slice(0, 200) }, 502); }
  }
  return json({ hata: "Bilinmeyen işlem." }, 400);
});
