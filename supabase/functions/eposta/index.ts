// Norevo e-posta gönderici
// Bekleme listesi çift onaylıdır (double opt-in):
// 1) { tur: "bekleme", id }  (veritabanı tetikleyicisi çağırır, x-gorunur-cron başlığıyla): "Kaydınızı onaylayın" e-postası
//    (bağlantı: SITE + "onay.html?a=<onay_anahtari>")
// 2) { tur: "onay", anahtar } (onay.html çağırır, herkese açık, 32 haneli onay anahtarıyla): kaydı onaylar, hoş geldin e-postasını yollar
// 3) { tur: "cikis", anahtar } (cikis.html çağırır): kişiyi bekleme listesinden siler
// 4) { tur: "bekleyenler" } (x-gorunur-cron): onaylı ama hoş geldin almamışlara hoş geldin, onaysız ve onay e-postası gitmemişlere onay e-postası
// 5) { tur: "haftalik", olcum_id, deneme? } (x-gorunur-cron, olcum çağırır): haftalık özet e-postası (mesaj_sikligi: haftalik / onemli / yok)
// Gönderim yolu: RESEND_API_KEY + EPOSTA_GONDEREN varsa Resend (alan adı alınınca), yoksa Gmail (GMAIL_ADRES + GMAIL_UYGULAMA_SIFRESI, 465 portu).
import { createClient } from "jsr:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-gorunur-cron",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const env = (ad: string) => (Deno.env.get(ad) || "").trim();
const SITE = (env("SITE_ADRES") || "https://mertozmen899-alt.github.io/norevo/").replace(/\/?$/, "/");
const kacis = (x: string) => String(x || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

function yerde(ad: string) {
  if (!ad || ad === "Türkiye geneli") return "Türkiye'de";
  const k = ad.toLocaleLowerCase("tr"), u = k.match(/[aıoueiöü]/g) || ["e"];
  return ad + "'" + (/[çfhkpsşt]$/.test(k) ? "t" : "d") + ("aıou".includes(u[u.length - 1]) ? "a" : "e");
}

function beklemeMetni(r: Record<string, any>) {
  const sehir = String(r.sehir || "").split(",")[0].trim();
  const is = String(r.is_turu || "").toLocaleLowerCase("tr");
  const kisisel = sehir && is ? `${yerde(sehir)} "${is}" arayan müşterilerin sizi bulup bulmadığını ölçmeye hazırlanıyoruz.` : "";
  const cikis = `${SITE}cikis.html?a=${encodeURIComponent(r.cikis_anahtari)}`;
  const konu = "Norevo bekleme listesindesiniz";
  const duz = [
    "Merhaba,",
    "",
    `${r.eposta} adresini Norevo bekleme listesine ekledik. Teşekkür ederiz.`,
    kisisel,
    "",
    "Bundan sonra ne olacak?",
    "- Norevo açıldığında size ilk biz haber vereceğiz.",
    "- Google'da, Haritalar'da ve yapay zekâ cevaplarında kaçıncı sırada olduğunuzu her hafta ölçeceğiz.",
    "- Yükselmek için yapmanız gereken işleri sade dille, sıraya koyarak yazacağız.",
    "",
    "Ayda en fazla 3 e-posta göndeririz. Bu kaydı siz yapmadıysanız ya da artık haber almak istemiyorsanız buradan çıkabilirsiniz:",
    cikis,
    "",
    "Sorunuz olursa bu e-postayı yanıtlamanız yeterli.",
    "",
    "Norevo",
    SITE,
  ].filter((x, i, a) => !(x === "" && a[i - 1] === "")).join("\n");
  const madde = (t: string) => `<tr><td style="padding:6px 0;vertical-align:top;width:26px"><span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:#E3F4E9;color:#17703F;font-weight:800;font-size:12px;line-height:20px;text-align:center">✓</span></td><td style="padding:6px 0;font-size:15px;line-height:1.5;color:#343B48">${t}</td></tr>`;
  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${konu}</title></head>
<body style="margin:0;padding:0;background:#F6F7F9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#161A22">
<div style="display:none;max-height:0;overflow:hidden">Norevo açılınca size ilk biz haber vereceğiz.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F7F9;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid #E2E5EB;border-radius:20px">
<tr><td style="padding:28px 32px 8px">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="width:34px;height:34px;border-radius:10px;background:#155E75;text-align:center;font-size:22px;line-height:32px;font-weight:800;color:#FFFFFF">n</td>
<td style="padding-left:10px;font-size:20px;font-weight:800;letter-spacing:-.02em;color:#17253B">norevo</td></tr></table>
</td></tr>
<tr><td style="padding:16px 32px 0">
<h1 style="margin:0;font-size:26px;line-height:1.2;font-weight:800;letter-spacing:-.02em;color:#161A22">Bekleme listesindesiniz</h1>
<p style="margin:14px 0 0;font-size:16px;line-height:1.6;color:#343B48"><b>${kacis(r.eposta)}</b> adresini Norevo bekleme listesine ekledik. Teşekkür ederiz.${kisisel ? " " + kacis(kisisel) : ""}</p>
</td></tr>
<tr><td style="padding:20px 32px 0">
<p style="margin:0 0 6px;font-size:15px;font-weight:800;color:#161A22">Bundan sonra ne olacak?</p>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
${madde("Norevo açıldığında size <b>ilk biz</b> haber vereceğiz.")}
${madde("Google'da, Haritalar'da ve yapay zekâ cevaplarında kaçıncı sırada olduğunuzu <b>her hafta</b> ölçeceğiz.")}
${madde("Yükselmek için yapmanız gereken işleri sade dille, sıraya koyarak yazacağız.")}
</table>
</td></tr>
<tr><td style="padding:24px 32px 8px">
<a href="${SITE}test.html?k=eposta" style="display:inline-block;background:#155E75;color:#FFFFFF;text-decoration:none;font-weight:800;font-size:15px;padding:13px 22px;border-radius:999px">Durumunuzu şimdi görün →</a>
</td></tr>
<tr><td style="padding:20px 32px 28px">
<p style="margin:0;font-size:14px;line-height:1.6;color:#5B6375">Sorunuz olursa bu e-postayı yanıtlamanız yeterli.</p>
</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px"><tr><td style="padding:18px 20px;font-size:12px;line-height:1.6;color:#6A7385;text-align:center">
Bu e-postayı Norevo bekleme listesine katıldığınız için aldınız. Ayda en fazla 3 e-posta göndeririz.<br>
Bu kaydı siz yapmadıysanız ya da artık haber almak istemiyorsanız <a href="${cikis}" style="color:#1E3A64">listeden çıkın</a>.
Verilerinizi nasıl kullandığımız: <a href="${SITE}aydinlatma.html" style="color:#1E3A64">aydınlatma metni</a>.
</td></tr></table>
</td></tr></table>
</body></html>`;
  return { konu, duz, html, cikis };
}

function onayMetni(r: Record<string, any>) {
  const onay = `${SITE}onay.html?a=${encodeURIComponent(r.onay_anahtari)}`;
  const cikis = `${SITE}cikis.html?a=${encodeURIComponent(r.cikis_anahtari)}`;
  const konu = "Kaydınızı onaylayın";
  const duz = [
    "Merhaba,",
    "",
    `${r.eposta} adresiyle Norevo bekleme listesine katılmak istendi.`,
    "Kaydınızı tamamlamak için aşağıdaki bağlantıyı açın:",
    onay,
    "",
    "Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz. Onaylanmayan adreslere başka e-posta göndermeyiz.",
    "Kaydınızın hemen silinmesini isterseniz: " + cikis,
    "",
    "Norevo",
    SITE,
  ].join("\n");
  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${konu}</title></head>
<body style="margin:0;padding:0;background:#F6F7F9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#161A22">
<div style="display:none;max-height:0;overflow:hidden">Norevo bekleme listesine katılmak için tek tıkla onaylayın.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F7F9;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid #E2E5EB;border-radius:20px">
<tr><td style="padding:28px 32px 8px">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="width:34px;height:34px;border-radius:10px;background:#155E75;text-align:center;font-size:22px;line-height:32px;font-weight:800;color:#FFFFFF">n</td>
<td style="padding-left:10px;font-size:20px;font-weight:800;letter-spacing:-.02em;color:#17253B">norevo</td></tr></table>
</td></tr>
<tr><td style="padding:16px 32px 0">
<h1 style="margin:0;font-size:26px;line-height:1.2;font-weight:800;letter-spacing:-.02em;color:#161A22">Kaydınızı onaylayın</h1>
<p style="margin:14px 0 0;font-size:16px;line-height:1.6;color:#343B48"><b>${kacis(r.eposta)}</b> adresiyle Norevo bekleme listesine katılmak istendi. Kaydınızı tamamlamak için aşağıdaki düğmeye tıklayın.</p>
</td></tr>
<tr><td style="padding:24px 32px 8px">
<a href="${onay}" style="display:inline-block;background:#155E75;color:#FFFFFF;text-decoration:none;font-weight:800;font-size:15px;padding:13px 22px;border-radius:999px">Kaydımı onayla</a>
</td></tr>
<tr><td style="padding:16px 32px 28px">
<p style="margin:0;font-size:14px;line-height:1.6;color:#5B6375">Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz. Onaylanmayan adreslere başka e-posta göndermeyiz.</p>
</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px"><tr><td style="padding:18px 20px;font-size:12px;line-height:1.6;color:#6A7385;text-align:center">
Kaydınızın hemen silinmesini isterseniz <a href="${cikis}" style="color:#1E3A64">listeden çıkın</a>.
Verilerinizi nasıl kullandığımız: <a href="${SITE}aydinlatma.html" style="color:#1E3A64">aydınlatma metni</a>.
</td></tr></table>
</td></tr></table>
</body></html>`;
  return { konu, duz, html, cikis };
}

// ---- Haftalık özet: haftalık ölçüm bitince işletme sahibine 3-4 cümle ----
type Olc = Record<string, any>;
// Bir ölçümde verilen aramanın harita sırası (yoksa null); o aramada harita ölçülmediyse undefined (panel.js aramaHaritaSira ile aynı)
function haritaSira(o: Olc, kelime: string): number | null | undefined {
  if (o.harita_sorgu === kelime && o.harita_sonuclar) return o.harita_sira || null;
  const k = (o.kelimeler || []).find((x: Olc) => x.kelime === kelime && x.harita_bakilan != null && !x.harita_hata);
  return k ? k.harita_sira || null : undefined;
}
// Gemini + Google Yapay Zekâ Modu + ChatGPT cevaplarında adın geçme yüzdesi (ölçülmediyse null)
function yzYuzde(o: Olc): number | null {
  const n = (o.yz_soru_sayisi || 0) + (o.gyz_soru_sayisi || 0) + (o.cg_soru_sayisi || 0);
  return n ? Math.round(100 * ((o.yz_gecen || 0) + (o.gyz_gecen || 0) + (o.cg_gecen || 0)) / n) : null;
}
const sayiTR = (x: number) => x.toLocaleString("tr-TR");
const ayniRakip = (a: Olc, b: Olc) => a.place_id && b.place_id ? a.place_id === b.place_id : String(a.ad).toLocaleLowerCase("tr") === String(b.ad).toLocaleLowerCase("tr");

function ozetMetni(isl: Olc, o: Olc, p: Olc | null) {
  const satirlar: string[] = [];
  let degisti = !p;
  // 1) Haritalar: bu ölçümün ana aramasında sıra, geçen ölçümle aynı aramada karşılaştırma
  if (o.harita_sonuclar) {
    const k = o.harita_sorgu, simdi = o.harita_sira || null, once = p ? haritaSira(p, k) : undefined;
    const yer = simdi ? `${simdi}. sıradasınız` : "ilk 20'de değilsiniz";
    const fark = once === undefined ? "" : (once || 0) === (simdi || 0) ? " (geçen ölçümle aynı)" : ` (geçen ölçümde ${once ? once + ". sıra" : "ilk 20'nin dışı"})`;
    if (once !== undefined && (once || 0) !== (simdi || 0)) degisti = true;
    satirlar.push(`"${k}" aramasında Google Haritalar'da ${yer}${fark}.`);
  }
  // 2) Yapay zekâ
  const y = yzYuzde(o), yo = p ? yzYuzde(p) : null;
  if (y != null) {
    if (yo != null && yo !== y) degisti = true;
    satirlar.push(`Yapay zekâ cevaplarında adınızın geçme oranı: %${y}${yo == null ? "" : yo === y ? " (geçen ölçümle aynı)" : ` (geçen ölçümde %${yo})`}.`);
  }
  // 3) Rakipler: en çok yeni yorum alan izlenen rakip ve sizin yorum farkınız
  const bn = o.isletme_bilgi?.yorum, bo = p?.isletme_bilgi?.yorum;
  let enCok: { ad: string; fark: number } | null = null;
  for (const r of o.izlenen_rakipler || []) {
    const e = (p?.izlenen_rakipler || []).find((x: Olc) => ayniRakip(x, r));
    if (e && r.yorum != null && e.yorum != null && r.yorum - e.yorum > (enCok?.fark || 0)) enCok = { ad: r.ad, fark: r.yorum - e.yorum };
  }
  if (enCok) {
    degisti = true;
    satirlar.push(`${enCok.ad} ${sayiTR(enCok.fark)} yeni Google yorumu aldı; siz ${bn != null && bo != null ? sayiTR(Math.max(0, bn - bo)) : "-"}.`);
  }
  const panel = `${SITE}panel.html#isler`, ayar = `${SITE}kurulum.html?adim=5`;
  const ilk = satirlar[0] || "Bu haftanın ölçümü panelinizde.";
  const konu = `${isl.ad}: haftalık Norevo özetiniz`;
  const duz = ["Merhaba,", "", `${isl.ad} için bu haftanın ölçümü bitti.`, ...satirlar, "", "Bu hafta ne yapmanız gerektiğini hazır metinleriyle panelinize koyduk:", panel, "", "Bu özetleri istemiyorsanız ya da sadece önemli değişikliklerde almak istiyorsanız:", ayar, "", "Norevo", SITE].join("\n");
  const madde = (t: string) => `<tr><td style="padding:7px 0;vertical-align:top;width:22px;color:#155E75;font-weight:800">•</td><td style="padding:7px 0;font-size:16px;line-height:1.5;color:#343B48">${kacis(t)}</td></tr>`;
  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${kacis(konu)}</title></head>
<body style="margin:0;padding:0;background:#F6F7F9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#161A22">
<div style="display:none;max-height:0;overflow:hidden">${kacis(ilk)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F7F9;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid #E2E5EB;border-radius:20px">
<tr><td style="padding:28px 32px 8px">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="width:34px;height:34px;border-radius:10px;background:#155E75;text-align:center;font-size:22px;line-height:32px;font-weight:800;color:#FFFFFF">n</td>
<td style="padding-left:10px;font-size:20px;font-weight:800;letter-spacing:-.02em;color:#17253B">norevo</td></tr></table>
</td></tr>
<tr><td style="padding:16px 32px 0">
<h1 style="margin:0;font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-.02em;color:#161A22">Haftalık özetiniz</h1>
<p style="margin:10px 0 0;font-size:15px;line-height:1.6;color:#5B6375">${kacis(isl.ad)} için bu haftanın ölçümü bitti.</p>
</td></tr>
<tr><td style="padding:14px 32px 0"><table role="presentation" cellpadding="0" cellspacing="0" width="100%">${satirlar.map(madde).join("")}</table></td></tr>
<tr><td style="padding:22px 32px 8px">
<a href="${panel}" style="display:inline-block;background:#155E75;color:#FFFFFF;text-decoration:none;font-weight:800;font-size:15px;padding:13px 22px;border-radius:999px">Bu haftanın işlerini görün →</a>
</td></tr>
<tr><td style="padding:16px 32px 28px"><p style="margin:0;font-size:14px;line-height:1.6;color:#5B6375">İşleri hazır metinleriyle panelinize koyduk. Sorunuz olursa bu e-postayı yanıtlamanız yeterli.</p></td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px"><tr><td style="padding:18px 20px;font-size:12px;line-height:1.6;color:#6A7385;text-align:center">
Bu e-postayı Norevo hesabınızda haftalık özet seçili olduğu için aldınız. <a href="${ayar}" style="color:#1E3A64">Tercihinizi değiştirin</a>.
</td></tr></table>
</td></tr></table>
</body></html>`;
  return { konu, duz, html, cikis: ayar, degisti };
}

// Onay e-postası (onaylanmamış kayıt) ya da hoş geldin e-postası (onaylı kayıt) gönderir ve sonucu kaydeder
async function kayitGonder(db: any, r: Record<string, any>, tur: "onay" | "hosgeldin") {
  const m = tur === "onay" ? onayMetni(r) : beklemeMetni(r);
  try {
    const yol = await gonder(r.eposta, m.konu, m.duz, m.html, m.cikis);
    await db.from("bekleme_listesi").update(tur === "onay" ? { onay_gonderildi: new Date().toISOString(), eposta_hata: null } : { eposta_gonderildi: new Date().toISOString(), eposta_hata: null }).eq("id", r.id);
    return { tamam: true, yol };
  } catch (e) {
    const h = String((e as Error).message).slice(0, 300);
    console.log("eposta hatasi", tur, h);
    await db.from("bekleme_listesi").update({ eposta_hata: h }).eq("id", r.id);
    return { tamam: false, hata: h };
  }
}

async function gonder(alici: string, konu: string, duz: string, html: string, cikis: string) {
  const headers = { "List-Unsubscribe": `<${cikis}>` };
  if (env("RESEND_API_KEY") && env("EPOSTA_GONDEREN")) {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { "Authorization": "Bearer " + env("RESEND_API_KEY"), "Content-Type": "application/json" },
      body: JSON.stringify({ from: env("EPOSTA_GONDEREN"), to: [alici], subject: konu, text: duz, html, headers, reply_to: env("EPOSTA_YANIT") || undefined }),
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) throw new Error("Resend " + r.status + " " + (await r.text()).slice(0, 200));
    return "resend";
  }
  const kullanici = env("GMAIL_ADRES"), sifre = env("GMAIL_UYGULAMA_SIFRESI").replace(/\s+/g, "");
  if (!kullanici || !sifre) throw new Error("E-posta ayarı yok: GMAIL_ADRES ve GMAIL_UYGULAMA_SIFRESI eklenmeli");
  const t = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: kullanici, pass: sifre } });
  await t.sendMail({ from: { name: "Norevo", address: kullanici }, to: alici, subject: konu, text: duz, html, headers });
  return "gmail";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ hata: "Sadece POST" }, 405);
  const g = await req.json().catch(() => ({}));
  const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));

  // Listeden çıkış (herkese açık, sadece gizli anahtarla)
  if (g.tur === "cikis") {
    const a = String(g.anahtar || "");
    if (!/^[a-f0-9]{32}$/.test(a)) return json({ hata: "Bağlantı geçersiz." }, 400);
    const { data } = await db.from("bekleme_listesi").delete().eq("cikis_anahtari", a).select("id");
    return json({ tamam: true, silinen: (data || []).length });
  }

  // Kayıt onayı (herkese açık, sadece gizli onay anahtarıyla): onaylar ve hoş geldin e-postasını yollar
  if (g.tur === "onay") {
    const a = String(g.anahtar || "");
    if (!/^[a-f0-9]{32}$/.test(a)) return json({ hata: "Bağlantı geçersiz." }, 400);
    const { data: yeni } = await db.from("bekleme_listesi").update({ onaylandi: true }).eq("onay_anahtari", a).eq("onaylandi", false).select("*");
    const r = (yeni || [])[0];
    if (!r) {
      const { data: var_ } = await db.from("bekleme_listesi").select("id").eq("onay_anahtari", a).maybeSingle();
      if (!var_) return json({ hata: "Bu bağlantı geçersiz ya da kayıt silinmiş." }, 404);
      return json({ tamam: true, zaten: true });
    }
    if (!r.eposta_gonderildi) await kayitGonder(db, r, "hosgeldin");
    return json({ tamam: true });
  }

  // Geri kalan her şey yalnızca veritabanı tetikleyicisinden
  const k = req.headers.get("x-gorunur-cron") || "";
  const { data: ayar } = await db.from("cron_ayar").select("deger").eq("ad", "olcum_anahtari").maybeSingle();
  if (!k || !ayar || ayar.deger !== k) return json({ hata: "Yetkisiz" }, 401);

  // Yeni kayıt: önce onay e-postası (hoş geldin e-postası ancak onaydan sonra gider)
  if (g.tur === "bekleme") {
    const { data: r } = await db.from("bekleme_listesi").select("*").eq("id", g.id).maybeSingle();
    if (!r) return json({ hata: "Kayıt yok" }, 404);
    if (r.onaylandi) return json({ tamam: true, zaten: true });
    if (r.onay_gonderildi && !g.yeniden) return json({ tamam: true, zaten: true });
    const s = await kayitGonder(db, r, "onay");
    return s.tamam ? json(s) : json({ hata: s.hata }, 502);
  }
  // Ayar sonradan eklendiyse: onaylılardan hoş geldin almamışlara hoş geldin, onaysızlardan onay e-postası
  // almamışlara onay e-postası gönder (toplam en fazla 40)
  if (g.tur === "bekleyenler") {
    const { data: hos } = await db.from("bekleme_listesi").select("*").eq("onaylandi", true).is("eposta_gonderildi", null).order("id").limit(40);
    const kalan = 40 - (hos || []).length;
    const { data: ony } = kalan > 0 ? await db.from("bekleme_listesi").select("*").eq("onaylandi", false).is("onay_gonderildi", null).order("id").limit(kalan) : { data: [] };
    let n = 0; const hatalar: string[] = [];
    for (const [liste, tur] of [[hos || [], "hosgeldin"], [ony || [], "onay"]] as Array<[Record<string, any>[], "onay" | "hosgeldin"]>) {
      for (const r of liste) {
        const s = await kayitGonder(db, r, tur);
        if (s.tamam) n++; else hatalar.push(String(s.hata).slice(0, 120));
      }
    }
    return json({ gonderilen: n, hosgeldin: (hos || []).length, onay: (ony || []).length, hatalar: hatalar.slice(0, 3) });
  }
  // Haftalık özet (olcum fonksiyonu haftalık ölçüm bitince çağırır). deneme: true ise göndermez, metni döndürür.
  if (g.tur === "haftalik") {
    const { data: o } = await db.from("olcumler").select("*").eq("id", g.olcum_id).maybeSingle();
    if (!o || o.durum !== "bitti") return json({ hata: "Bitmiş ölçüm yok" }, 404);
    if (o.ozet_gonderildi && !g.deneme) return json({ tamam: true, zaten: true });
    const { data: isl } = await db.from("isletmeler").select("*").eq("id", o.isletme_id).maybeSingle();
    if (!isl) return json({ hata: "İşletme yok" }, 404);
    const { data: p } = await db.from("olcumler").select("*").eq("isletme_id", o.isletme_id).eq("durum", "bitti").lt("baslangic", o.baslangic).order("baslangic", { ascending: false }).limit(1).maybeSingle();
    const m = ozetMetni(isl, o, p || null);
    const siklik = isl.mesaj_sikligi || "haftalik";
    if (g.deneme) return json({ konu: m.konu, duz: m.duz, degisti: m.degisti, siklik });
    if (siklik === "yok" || (siklik === "onemli" && !m.degisti)) return json({ tamam: true, atlandi: siklik });
    const { data: u } = await db.auth.admin.getUserById(isl.sahip);
    const alici = u?.user?.email;
    if (!alici) return json({ hata: "Sahibin e-postası yok" }, 404);
    try {
      const yol = await gonder(alici, m.konu, m.duz, m.html, m.cikis);
      await db.from("olcumler").update({ ozet_gonderildi: new Date().toISOString(), ozet_hata: null }).eq("id", o.id);
      return json({ tamam: true, yol });
    } catch (e) {
      const h = String((e as Error).message).slice(0, 300);
      await db.from("olcumler").update({ ozet_hata: h }).eq("id", o.id);
      return json({ hata: h }, 502);
    }
  }
  return json({ hata: "Bilinmeyen işlem" }, 400);
});
