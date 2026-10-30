// Görünür yardımcı: (1) hazır metin yazma (sayfa metni, Google profil açıklaması, haftalık gönderi)
// (2) site sağlığı taraması (SerpApi harcamaz)
// (3) Google yorumları + cevap taslakları (günde 1 yenileme; en fazla 2 SerpApi araması + 1 Gemini)
// (4) "Hangi platformlarda varsınız?" kontrolü (günde 1 yenileme; 1 SerpApi araması)
// Günlük sınırlar isletmeler.kullanim sütununda tutulur (sadece sunucu yazar, işletme adı değişince silinmez):
//   SerpApi araması (yorumlar + platformlar) kişi başı günde 6, site taraması günde 5, hazır metin günde 15.
//   Ayrıca tüm sistem için günlük SerpApi bütçesi: public.serp_harca (SERP_GUNLUK_SINIR, varsayılan 150).
// Deneme yolu: x-gorunur-cron başlığı cron_ayar.olcum_anahtari ile aynıysa ve gövdede deneme_isletme_id varsa
// işlem o işletme için (oturum olmadan) yapılır.
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
  const modeller = [Deno.env.get("GEMINI_MODEL"), "gemini-flash-latest", "gemini-flash-lite-latest"].filter(Boolean) as string[];
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

// ---------------- Güvenli adres denetimi (SSRF koruması) ----------------
// Sadece http/https, kullanıcı adı/şifre yok, port 80/443, iç ağ adı yok ve alan adı özel/iç IP'ye çözülmüyor.
class GuvenlikHatasi extends Error {}
function ozelIp4(ip: string): boolean {
  const p = ip.split(".").map((x) => Number(x));
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b, c] = p;
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0 && c === 0) ||
    (a === 198 && (b === 18 || b === 19)) || a >= 224;
}
function ozelIp6(ip: string): boolean {
  const x = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (x === "::" || x === "::1") return true;
  if (/^f[cd][0-9a-f]{0,2}:/.test(x)) return true;          // fc00::/7
  if (/^fe[89ab][0-9a-f]?:/.test(x)) return true;            // fe80::/10
  if (/^ff/.test(x)) return true;                             // çoklu yayın
  if (x.startsWith("::ffff:") || x.startsWith("64:ff9b:") || x.startsWith("2002:") || /^::[0-9.]+$/.test(x)) return true; // IPv4 gömülü adresler
  return false;
}
// Alan adının IP adresleri (A ve AAAA). Deno.resolveDns hiç çalışmazsa DNS-over-HTTPS yedeği.
async function cozumle(host: string): Promise<string[]> {
  const ipler: string[] = [];
  let hata = 0;
  for (const tur of ["A", "AAAA"] as const) {
    try { ipler.push(...await Deno.resolveDns(host, tur, { signal: AbortSignal.timeout(5000) })); } catch { hata++; }
  }
  if (ipler.length || hata < 2) return ipler;
  for (const tur of ["A", "AAAA"]) {
    try {
      const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${tur}`, { headers: { accept: "application/dns-json" }, signal: AbortSignal.timeout(5000) });
      const j = await r.json();
      for (const a of (j?.Answer || []) as Array<{ type: number; data: string }>) if (a.type === 1 || a.type === 28) ipler.push(String(a.data));
    } catch { /* yok */ }
  }
  return ipler;
}
async function adresDenetle(adres: string | URL): Promise<URL> {
  let u: URL;
  try { u = new URL(String(adres)); } catch { throw new GuvenlikHatasi("Web sitesi adresi geçersiz."); }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new GuvenlikHatasi("Bu web sitesi adresi taranamıyor.");
  if (u.username || u.password) throw new GuvenlikHatasi("Bu web sitesi adresi taranamıyor.");
  if (u.port && u.port !== "80" && u.port !== "443") throw new GuvenlikHatasi("Bu web sitesi adresi taranamıyor.");
  const host = u.hostname.toLowerCase().replace(/\.$/, "");
  if (!host.includes(".") || /^[\d.]+$/.test(host) || host.includes(":") || host.includes("[") ||
    /(^|\.)(localhost|local|internal|lan|localdomain|home|corp)$/.test(host) || /supabase\.(co|in)$/.test(host)) {
    throw new GuvenlikHatasi("Bu web sitesi adresi taranamıyor.");
  }
  const ipler = await cozumle(host);
  if (!ipler.length) throw new Error("Alan adı çözülemedi.");
  if (ipler.some((ip) => ip.includes(":") ? ozelIp6(ip) : ozelIp4(ip))) throw new GuvenlikHatasi("Bu web sitesi adresi taranamıyor.");
  return u;
}
// Yönlendirmeleri elle izler (en fazla 3), her adımda adresi yeniden denetler
async function guvenliGetir(adres: string | URL, ms: number, headers: Record<string, string> = {}) {
  const sinyal = AbortSignal.timeout(ms);
  let u = await adresDenetle(adres);
  for (let adim = 0; ; adim++) {
    const r = await fetch(u, { redirect: "manual", signal: sinyal, headers });
    const yer = r.headers.get("location");
    if ([301, 302, 303, 307, 308].includes(r.status) && yer) {
      await r.body?.cancel();
      if (adim >= 3) throw new GuvenlikHatasi("Siteniz çok fazla kez yönlendiriyor, taranamadı.");
      try { u = await adresDenetle(new URL(yer, u)); } catch (e) {
        if (e instanceof GuvenlikHatasi) throw new GuvenlikHatasi("Siteniz taranmasına izin verilmeyen bir adrese yönlendiriyor.");
        throw e;
      }
      continue;
    }
    return { r, son: u.toString() };
  }
}

// ---------------- Site sağlığı ----------------
type Kontrol = { kod: string; ad: string; tamam: boolean; agirlik: number; detay: string; oneri: string };
async function siteTara(isl: Record<string, any>) {
  let adres = String(isl.site || "").trim();
  if (!adres) throw new Error("Kurulumda web sitesi girilmemiş.");
  if (!/^https?:\/\//i.test(adres)) adres = "https://" + adres;
  // Güvenlik: sadece normal alan adları (IP adresi, localhost, iç ağ adresleri ve iç IP'ye çözülen adlar taranmaz)
  const t0 = Date.now();
  let r: Response;
  let son = adres;
  try {
    const g = await guvenliGetir(adres, 15000, { "User-Agent": "Mozilla/5.0 (compatible; GorunurSiteSagligi/1.0; +https://mertozmen899-alt.github.io/gorunur/)", "Accept-Language": "tr-TR,tr;q=0.9" });
    r = g.r; son = g.son;
  } catch (e) {
    if (e instanceof GuvenlikHatasi) throw new Error(e.message);
    return { adres, acildi: false, puan: 0, sure_ms: Date.now() - t0, kontroller: [{ kod: "acilmiyor", ad: "Site açılıyor mu?", tamam: false, agirlik: 100, detay: /timed out|abort/i.test(String(e)) ? "Site 15 saniyede açılmadı." : "Siteye bağlanılamadı.", oneri: "Sitenizi yapan kişiye sitenin açılmadığını bildirin. Kapalı bir site hem Google'da hem yapay zekâda sizi geriye düşürür." }] };
  }
  const sure = Date.now() - t0;
  const html = (await r.text().catch(() => "")).slice(0, 1_500_000);
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
  const ek = async (yol: string) => { try { const { r: x } = await guvenliGetir(new URL(yol, kok.origin), 6000); const t = await x.text(); return x.ok && t.length > 20 && !/<html/i.test(t.slice(0, 300)); } catch { return false; } };
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

// ---------------- SerpApi ----------------
// Her SerpApi aramasından önce çağrılır: kişi başı ve sistem geneli günlük sınırı düşer, doluysa KotaHatasi atar.
class KotaHatasi extends Error {}
type Kapi = () => Promise<void>;
async function serp(params: Record<string, string>, anahtar: string) {
  const u = new URL("https://serpapi.com/search.json");
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set("api_key", anahtar);
  const r = await fetch(u, { signal: AbortSignal.timeout(30000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error("SerpApi: " + (j.error || r.status));
  return j;
}
// İşletme adının ayırt edici kelimeleri ("Macitler Mobilya Ltd." -> macitler, mobilya)
const GENEL = new Set(["ve", "the", "ltd", "sti", "as", "limited", "sirketi", "san", "tic", "ticaret", "sube", "subesi", "merkezi", "merkez", "magaza", "magazasi", "firmasi", "grup", "group", "istanbul", "ankara", "izmir"]);
const cekirdek = (ad: string) => sade(ad).split(" ").filter((t) => t.length >= 3 && !GENEL.has(t));
// Metinde işletme adının ilk ayırt edici kelimesi tam kelime olarak (ekleriyle) geçiyor mu
function adGeciyor(metin: string, ad: string): boolean {
  const m = " " + sade(metin) + " ", c = cekirdek(ad);
  if (!c.length) return m.includes(" " + sade(ad) + " ");
  return new RegExp(" " + c[0] + "(da|de|ta|te|in|nin|un|nun|i|u|e|a)? ").test(m);
}
const yerKisa = (isl: Record<string, any>) => isl.semt === "Türkiye geneli" ? "" : String(isl.semt || "").split(",")[0].trim();
const uzunTireYok = (x: string) => String(x || "").replace(/\s*[—–]\s*/g, ", ").replace(/,\s*,/g, ",").trim();
const bugunTR = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10); // Türkiye saatiyle bugün
function kisaAd(ad: string): string {
  const p = String(ad || "").trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "Google kullanıcısı";
  const ilk = p[0].charAt(0).toLocaleUpperCase("tr") + p[0].slice(1);
  return p.length === 1 ? ilk : ilk + " " + p[p.length - 1].charAt(0).toLocaleUpperCase("tr") + ".";
}

// ---------------- Google yorumları ----------------
async function haritadaBul(isl: Record<string, any>, SERP: string, kapi: Kapi) {
  const yer = yerKisa(isl);
  await kapi();
  const j = await serp({ engine: "google_maps", type: "search", q: `${isl.ad} ${yer}`.trim(), hl: "tr" }, SERP);
  const aday = [...(j.place_results ? [j.place_results] : []), ...(j.local_results || [])] as Array<Record<string, any>>;
  const ayni = aday.filter((r) => r && r.data_id && adGeciyor(String(r.title || ""), isl.ad));
  // Bölge verildiyse adres o bölgede olmalı; başka şehirdeki aynı adlı şube bizim profil sayılmaz
  const b = yer ? ayni.find((r) => (" " + sade(String(r.address || "")) + " ").includes(" " + sade(yer))) : ayni[0];
  if (!b) return { bulunamadi: true, baska_sube: ayni[0] ? { ad: ayni[0].title || null, adres: ayni[0].address || null } : null };
  return { data_id: String(b.data_id), ad: b.title || null, adres: b.address || null, place_id: b.place_id || null, puan: b.rating ?? null, yorum_sayisi: b.reviews ?? null };
}

function taslakSorusu(isl: Record<string, any>, liste: Array<Record<string, any>>) {
  const yorumlar = liste.map((y, n) => `${n + 1}) Yazan: ${y.ad}. Puan: ${y.puan}/5. Yorum: ${y.metin ? '"' + y.metin + '"' : "(yazı yok, sadece puan vermiş)"}`).join("\n");
  return `Sen "${isl.ad}" adlı işletmenin sahibisin. İş türü: "${isl.is_turu || "işletme"}". Bölge: "${yerKisa(isl) || "Türkiye"}".
Google İşletme Profilindeki aşağıdaki müşteri yorumlarına, işletme sahibi olarak yayınlanacak kısa cevap taslakları yaz.
Kurallar:
- Sade, sıcak ve doğal Türkçe yaz; resmi ama samimi ol. Her cevap en fazla 400 karakter, 1-3 cümle.
- Yorumda geçen somut bir şeye değin (ürün, hizmet, ilgi), genel kalıp cümlelerle yetinme. Yorumda yazı yoksa kısa bir teşekkür yaz.
- Müşteriye sadece adıyla hitap et (ör. "Ayşe"); "Hanım" veya "Bey" yazma, cinsiyet tahmin etme. Ad belli değilse hitapsız başla.
- Puan 1, 2 veya 3 ise: önce içtenlikle özür dile, bahane üretme, tartışma, müşteriyi suçlama; konuyu konuşmak için işletmeyle doğrudan iletişime geçmeye davet et ve [TELEFON] yaz.
- Puan 4 veya 5 ise: teşekkür et, yorumdaki olumlu noktaya değin, tekrar beklediğini söyle.
- Hiçbir bilgi uydurma: indirim, kampanya, hediye, söz, yapılmış bir değişiklik, adres, saat yazma. İşletme adını en fazla bir kez kullan.
- Uzun tire (—) kullanma. Emoji ve Markdown işareti kullanma.
Yorumlar:
${yorumlar}
Sadece şu JSON'u döndür: {"taslaklar":[{"no":1,"metin":"cevap taslağı"}]} (her yorum için bir taslak, no yorumun numarası)`;
}

async function yorumlariGetir(isl: Record<string, any>, db: any, SERP: string, GEM: string, kapi: Kapi) {
  let dataId = String(isl.gmaps_data_id || "");
  let yer: Record<string, any> | null = (isl.yorumlar && isl.yorumlar.yer) || null;
  let arama = 0;
  if (!dataId) {
    const b = await haritadaBul(isl, SERP, kapi) as Record<string, any>; arama++;
    if (b.bulunamadi) {
      const sonuc = { tarih: new Date().toISOString(), gun: bugunTR(), bulunamadi: true, baska_sube: b.baska_sube, arama };
      await db.from("isletmeler").update({ yorumlar: sonuc }).eq("id", isl.id);
      return sonuc;
    }
    dataId = b.data_id; yer = b;
    await db.from("isletmeler").update({ gmaps_data_id: dataId }).eq("id", isl.id);
  }
  await kapi();
  const j = await serp({ engine: "google_maps_reviews", data_id: dataId, hl: "tr", sort_by: "newestFirst" }, SERP); arama++;
  const pi = (j.place_info || {}) as Record<string, any>;
  const liste = ((j.reviews || []) as Array<Record<string, any>>).slice(0, 10).map((r) => {
    const metin = String(r.extracted_snippet?.original || r.snippet || "").replace(/\s+/g, " ").trim();
    return {
      ad: kisaAd(r.user?.name || ""),
      puan: Number(r.rating) || null,
      tarih: r.iso_date || null,
      zaman: r.date || null,
      metin: metin.length > 500 ? metin.slice(0, 497).replace(/\s+\S*$/, "") + "…" : metin,
      cevaplandi: !!(r.response && (r.response.snippet || r.response.extracted_snippet || r.response.date)),
    } as Record<string, any>;
  });
  const cevapsiz = liste.filter((y) => !y.cevaplandi);
  let taslakHata: string | null = null;
  const secilen = cevapsiz.slice(0, 5);
  if (secilen.length && GEM) {
    try {
      const c = await gemini(taslakSorusu(isl, secilen), GEM);
      const t = (c?.taslaklar || []) as Array<{ no: number; metin: string }>;
      secilen.forEach((y, n) => {
        const bul = t.find((x) => Number(x.no) === n + 1) || t[n];
        if (bul && bul.metin) y.taslak = uzunTireYok(bul.metin).slice(0, 450);
      });
    } catch (e) { taslakHata = String((e as Error).message).slice(0, 160); }
  } else if (secilen.length) taslakHata = "Yapay zekâ anahtarı eksik.";
  const sonuc = {
    tarih: new Date().toISOString(), gun: bugunTR(),
    yer: yer ? { ad: yer.ad || pi.title || null, adres: yer.adres || pi.address || null, place_id: yer.place_id || null } : (pi.title ? { ad: pi.title, adres: pi.address || null, place_id: null } : null),
    puan: pi.rating ?? yer?.puan ?? null,
    yorum_sayisi: pi.reviews ?? yer?.yorum_sayisi ?? null,
    yorumlar: liste, bakilan: liste.length, cevapsiz_sayi: cevapsiz.length,
    taslak_hata: taslakHata, arama,
  };
  await db.from("isletmeler").update({ yorumlar: sonuc }).eq("id", isl.id);
  return sonuc;
}

// ---------------- Platformlar ----------------
type Platform = { ad: string; alan: string; durum: "var" | "bulunamadi" | "kendiniz"; link?: string | null; ne_yapmali: string; adimlar?: string[] };
const alanAdi = (url?: string | null) => { try { return new URL(String(url).startsWith("http") ? String(url) : "https://" + url).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; } };
const DIZINLER: Array<{ ad: string; alan: string; re: RegExp }> = [
  { ad: "Bulurum", alan: "bulurum.com", re: /(^|\.)bulurum\.com$/ },
  { ad: "Cylex", alan: "cylex-tr.com", re: /cylex/ },
  { ad: "Armut", alan: "armut.com", re: /(^|\.)armut\.com$/ },
  { ad: "Şikayetvar", alan: "sikayetvar.com", re: /(^|\.)sikayetvar\.com$/ },
  { ad: "Tripadvisor", alan: "tripadvisor.com.tr", re: /tripadvisor\./ },
  { ad: "Firmasec", alan: "firmasec.com", re: /(^|\.)firmasec\.com$/ },
  { ad: "Yellow Pages Türkiye", alan: "yellowpages.com.tr", re: /yellowpages\.com\.tr$/ },
];
async function platformlariBul(isl: Record<string, any>, SERP: string, kapi: Kapi) {
  const yer = yerKisa(isl);
  await kapi();
  const j = await serp({ engine: "google", q: `"${isl.ad}" ${yer}`.trim(), hl: "tr", gl: "tr", google_domain: "google.com.tr" }, SERP);
  const sonuclar: Array<{ link: string; alan: string; metin: string }> = [];
  for (const r of (j.organic_results || []) as Array<Record<string, any>>) {
    const link = String(r.link || "");
    sonuclar.push({ link, alan: alanAdi(link), metin: `${r.title || ""} ${r.snippet || ""} ${link}` });
  }
  const kg = (j.knowledge_graph || {}) as Record<string, any>;
  const kgBizim = !!(kg.title && adGeciyor(String(kg.title), isl.ad));
  if (kgBizim) for (const p of (kg.profiles || []) as Array<Record<string, any>>) {
    const link = String(p.link || ""); sonuclar.push({ link, alan: alanAdi(link), metin: `${kg.title} ${p.name || ""} ${link}` });
  }
  const yerel = ((j.local_results?.places || j.local_results || []) as Array<Record<string, any>>);
  const yerelBizim = Array.isArray(yerel) && yerel.some((r) => adGeciyor(String(r.title || ""), isl.ad));
  const bul = (test: (alan: string, link: string) => boolean) => sonuclar.find((s) => test(s.alan, s.link) && adGeciyor(s.metin, isl.ad));
  const L: Platform[] = [];
  const ekle = (ad: string, alan: string, hit: { link: string } | undefined, varYazi: string, yokYazi: string, link?: string | null) =>
    L.push(hit || link ? { ad, alan, durum: "var", link: link || hit!.link, ne_yapmali: varYazi } : { ad, alan, durum: "bulunamadi", link: null, ne_yapmali: yokYazi });

  // Google İşletme Profili
  const y = isl.yorumlar as Record<string, any> | null;
  const gmapsVar = !!isl.gmaps_data_id || !!(y && y.yer);
  const gLink = isl.google_profil || (y?.yer?.place_id ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(isl.ad)}&query_place_id=${y.yer.place_id}` : null);
  if (gmapsVar || kgBizim || yerelBizim || isl.google_profil) L.push({ ad: "Google İşletme Profili", alan: "google.com/maps", durum: "var", link: gLink, ne_yapmali: "Profiliniz var. Adres, telefon, çalışma saatleri ve fotoğrafların güncel olduğundan emin olun." });
  else L.push({ ad: "Google İşletme Profili", alan: "google.com/maps", durum: "bulunamadi", link: "https://business.google.com", ne_yapmali: "Google'da ve Haritalar'da adınızla bir profil bulamadık. business.google.com adresinden ücretsiz profil açın; diğer bütün adımlar bunun üstüne kurulur." });

  // Instagram (kurulumda girdiyse var sayılır)
  const igKendi = String(isl.instagram || "").trim();
  const igLink = igKendi ? (/^https?:\/\//.test(igKendi) ? igKendi : "https://www.instagram.com/" + igKendi.replace(/^@/, "").replace(/^instagram\.com\//, "")) : null;
  ekle("Instagram", "instagram.com", bul((a) => a === "instagram.com" || a.endsWith(".instagram.com")),
    "Hesabınız var. Profil açıklamanızda şehriniz, telefonunuz ve web sitenizin bağlantısı olsun.",
    "Google'da adınızla aratınca bir Instagram hesabı çıkmadı. Hesabınız varsa işletme adınızı profil adına yazın; yoksa ücretsiz bir işletme hesabı açın.", igLink);
  ekle("Facebook", "facebook.com", bul((a) => a === "facebook.com" || a.endsWith(".facebook.com")),
    "Sayfanız var. Adres, telefon ve çalışma saatlerinin Google'dakiyle aynı olduğunu kontrol edin.",
    "Google'da adınızla aratınca bir Facebook sayfası çıkmadı. Sayfanız varsa adını işletme adınızla aynı yapın; yoksa facebook.com/pages/create adresinden ücretsiz açın.");
  ekle("Yandex Haritalar", "yandex.com.tr/harita", bul((a, l) => /(^|\.)yandex\./.test(a) && /\/(maps|harita)\//.test(l)),
    "Yandex Haritalar'da kaydınız var. Adınızı, adresinizi ve telefonunuzu kontrol edin.",
    "Google'da adınızla aratınca Yandex Haritalar kaydınız çıkmadı. Yandex Haritalar'ı açıp adınızı arayın; yoksa Google'a \"Yandex işletme ekle\" yazın ve çıkan Yandex Business sayfasından ücretsiz kayıt olun.");
  L.push({ ad: "Apple Haritalar", alan: "maps.apple.com", durum: "kendiniz", link: "https://business.apple.com", ne_yapmali: "Apple Haritalar'ı otomatik kontrol edemiyoruz. iPhone kullanan müşterileriniz ve Siri buraya bakıyor.", adimlar: ["iPhone'da Haritalar uygulamasını ya da bilgisayardan maps.apple.com adresini açın.", "İşletmenizin adını ve şehrinizi yazıp arayın.", "Çıkmıyorsa uygulamada \"Bir sorun bildir\" bölümünden \"İşletme ekle\" deyin ya da business.apple.com adresinden Apple Business Connect ile ücretsiz ekleyin."] });
  L.push({ ad: "Bing Haritalar", alan: "bingplaces.com", durum: "kendiniz", link: "https://www.bingplaces.com", ne_yapmali: "Bing'i otomatik kontrol edemiyoruz. ChatGPT işletme bilgilerinde Bing verisini kullanıyor.", adimlar: ["bing.com/maps adresini açıp işletmenizin adını ve şehrinizi arayın.", "Çıkmıyorsa ya da bilgiler eksikse bingplaces.com adresine Microsoft veya Google hesabınızla girin.", "Google İşletme Profiliniz varsa \"Google'dan içe aktar\" seçeneğiyle bilgilerinizi tek seferde aktarın."] });
  ekle("Foursquare", "foursquare.com", bul((a) => a === "foursquare.com" || a.endsWith(".foursquare.com")),
    "Foursquare'de kaydınız var. Bilgilerinizin güncel olduğunu kontrol edin.",
    "Google'da adınızla aratınca Foursquare kaydınız çıkmadı. Foursquare bazı harita ve yapay zekâ uygulamalarına veri sağlıyor; foursquare.com üzerinden ücretsiz ekleyebilirsiniz.");
  // Sektör siteleri (aylık araştırılan liste)
  const goruldu = new Set(L.map((p) => p.alan));
  for (const s of ((isl.sektor_rehberleri || []) as Array<Record<string, any>>).slice(0, 6)) {
    const alan = String(s.alan || "").replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").toLowerCase();
    if (!alan || goruldu.has(alan)) continue; goruldu.add(alan);
    ekle(String(s.ad || alan), alan, bul((a) => a === alan || a.endsWith("." + alan)),
      "Bu sitede adınız geçiyor. Bilgilerinizin güncel olduğunu kontrol edin.",
      `Google'da adınızla aratınca bu sitede bir sayfanız çıkmadı. ${s.ne_ise_yarar ? String(s.ne_ise_yarar).trim() + " " : ""}Uygunsa sitedeki "Firma ekle" ya da "Satıcı ol" bölümünden kayıt olun.`);
  }
  // Genel rehberler: sadece bulunanları "var" olarak ekle
  for (const d of DIZINLER) {
    if (goruldu.has(d.alan)) continue;
    const h = bul((a) => d.re.test(a));
    if (h) { goruldu.add(d.alan); L.push({ ad: d.ad, alan: d.alan, durum: "var", link: h.link, ne_yapmali: "Bu rehberde adınız geçiyor. Adres ve telefonunuzun doğru yazıldığını kontrol edin." }); }
  }
  return { tarih: new Date().toISOString(), gun: bugunTR(), sorgu: `"${isl.ad}" ${yer}`.trim(), liste: L.map((p) => ({ ...p, ne_yapmali: uzunTireYok(p.ne_yapmali) })), arama: 1 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ hata: "Sadece POST" }, 405);
  const URL_ = Deno.env.get("SUPABASE_URL")!;
  const db = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const govde = await req.json().catch(() => ({}));
  let isl: Record<string, any> | null = null;
  let deneme = false;
  // Deneme yolu (sadece sunucu tarafı anahtarla): oturum olmadan belirli işletme için çalıştırır
  const cronBaslik = req.headers.get("x-gorunur-cron") || "";
  if (cronBaslik && govde.deneme_isletme_id) {
    const { data: ayar } = await db.from("cron_ayar").select("deger").eq("ad", "olcum_anahtari").maybeSingle();
    if (!ayar?.deger || ayar.deger !== cronBaslik) return json({ hata: "Yetkisiz." }, 401);
    const { data } = await db.from("isletmeler").select("*").eq("id", String(govde.deneme_isletme_id)).maybeSingle();
    isl = data; deneme = true;
  } else {
    const kdb = createClient(URL_, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } });
    const { data: u } = await kdb.auth.getUser();
    if (!u?.user) return json({ hata: "Giriş yapmanız gerekiyor." }, 401);
    const { data } = await db.from("isletmeler").select("*").eq("sahip", u.user.id).maybeSingle();
    isl = data;
  }
  if (!isl || !isl.kurulum_bitti) return json({ hata: "Önce kurulumu tamamlayın." }, 400);
  const SERP = (Deno.env.get("SERPAPI_KEY") || "").trim();
  const SERP_SINIR = parseInt(Deno.env.get("SERP_GUNLUK_SINIR") || "150", 10) || 150;
  // Kişi başı günlük sayaç (atomik). Deneme yolunda kişi sınırı uygulanmaz, sistem bütçesi uygulanır.
  const harca = async (alan: string, adet: number, sinir: number) => {
    if (deneme) return true;
    const { data, error } = await db.rpc("kullanim_harca", { p_isletme: isl!.id, p_alan: alan, p_adet: adet, p_sinir: sinir });
    if (error) { console.log("kullanim_harca hata", error.message); return false; }
    return data === true;
  };
  const kapi: Kapi = async () => {
    if (!(await harca("serp", 1, 6))) throw new KotaHatasi("Bugünkü arama hakkınız doldu. Yarın tekrar deneyin.");
    const { data, error } = await db.rpc("serp_harca", { adet: 1, sinir: SERP_SINIR });
    if (error) console.log("serp_harca hata", error.message);
    if (data !== true) throw new KotaHatasi("Bugün çok yoğunuz, günlük arama sınırımıza ulaştık. Yarın tekrar deneyin.");
  };

  if (govde.islem === "yorumlar") {
    const onceki = isl.yorumlar as Record<string, any> | null;
    if (onceki?.gun === bugunTR() && !(deneme && govde.zorla)) return json({ yorumlar: onceki, mesaj: "Yorumlarınızı bugün yeniledik. Yarın tekrar yenileyebilirsiniz." });
    if (!SERP) return json({ hata: "Arama anahtarı eksik.", yorumlar: onceki }, 503);
    try {
      await harca("yorum", 1, 1000);
      const sonuc = await yorumlariGetir(isl, db, SERP, (Deno.env.get("GEMINI_API_KEY") || "").trim(), kapi);
      return json({ yorumlar: sonuc });
    } catch (e) {
      if (e instanceof KotaHatasi) return json({ hata: e.message, yorumlar: onceki }, 429);
      console.log("yorumlar hata", String(e)); return json({ hata: "Yorumlarınız şu an alınamadı. Biraz sonra tekrar deneyin.", yorumlar: onceki }, 502); }
  }

  if (govde.islem === "platformlar") {
    const onceki = isl.platformlar as Record<string, any> | null;
    if (onceki?.gun === bugunTR() && !(deneme && govde.zorla)) return json({ platformlar: onceki, mesaj: "Bugün kontrol ettik. Yarın tekrar kontrol edebilirsiniz." });
    if (!SERP) return json({ hata: "Arama anahtarı eksik.", platformlar: onceki }, 503);
    try {
      await harca("platform", 1, 1000);
      const sonuc = await platformlariBul(isl, SERP, kapi);
      await db.from("isletmeler").update({ platformlar: sonuc }).eq("id", isl.id);
      return json({ platformlar: sonuc });
    } catch (e) {
      if (e instanceof KotaHatasi) return json({ hata: e.message, platformlar: onceki }, 429);
      console.log("platformlar hata", String(e)); return json({ hata: "Kontrol şu an yapılamadı. Biraz sonra tekrar deneyin.", platformlar: onceki }, 502); }
  }

  if (govde.islem === "site") {
    // Aynı gün içinde en fazla 5 tarama (siteyi yormamak için)
    const onceki = isl.site_saglik as Record<string, any> | null;
    if (!(await harca("site", 1, 5))) return json({ hata: "Bugün sitenizi 5 kez taradık. Yarın tekrar deneyin.", site: onceki }, 429);
    try {
      const sonuc = { ...(await siteTara(isl)), tarih: new Date().toISOString() };
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
    if (govde.onbellek && kayit[anahtar]) return json({ metin: kayit[anahtar] });
    // Günde en fazla 15 metin ("Yeniden yazın" da sayılır)
    if (!(await harca("metin", 1, 15))) return json({ hata: "Bugünlük metin hakkınız doldu. Yarın tekrar deneyin." }, 429);
    try {
      const icerik = await gemini(metinSorusu(tur, isl, kelime), GEM);
      const sonuc = { tur, kelime: tur === "sayfa" ? kelime : null, icerik, tarih: new Date().toISOString() };
      kayit[anahtar] = sonuc;
      delete kayit._sayac; // eski sayaç (artık kullanim sütununda)
      await db.from("isletmeler").update({ hazir_metinler: kayit }).eq("id", isl.id);
      return json({ metin: sonuc });
    } catch (e) { return json({ hata: String((e as Error).message).slice(0, 200) }, 502); }
  }
  return json({ hata: "Bilinmeyen işlem." }, 400);
});
