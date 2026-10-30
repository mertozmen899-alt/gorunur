// Görünür e-posta gönderici
// 1) { tur: "bekleme", id }  (veritabanı tetikleyicisi çağırır, x-gorunur-cron başlığıyla): bekleme listesi onay e-postası
// 2) { tur: "cikis", anahtar } (cikis.html çağırır): kişiyi bekleme listesinden siler
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
const SITE = (env("SITE_ADRES") || "https://mertozmen899-alt.github.io/gorunur/").replace(/\/?$/, "/");
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
  const konu = "Görünür bekleme listesindesiniz";
  const duz = [
    "Merhaba,",
    "",
    `${r.eposta} adresini Görünür bekleme listesine ekledik. Teşekkür ederiz.`,
    kisisel,
    "",
    "Bundan sonra ne olacak?",
    "- Görünür açıldığında size ilk biz haber vereceğiz.",
    "- Google'da, Haritalar'da ve yapay zekâ cevaplarında kaçıncı sırada olduğunuzu her hafta ölçeceğiz.",
    "- Yükselmek için yapmanız gereken işleri sade dille, sıraya koyarak yazacağız.",
    "",
    "Ayda en fazla 3 e-posta göndeririz. Bu kaydı siz yapmadıysanız ya da artık haber almak istemiyorsanız buradan çıkabilirsiniz:",
    cikis,
    "",
    "Sorunuz olursa bu e-postayı yanıtlamanız yeterli.",
    "",
    "Görünür",
    SITE,
  ].filter((x, i, a) => !(x === "" && a[i - 1] === "")).join("\n");
  const madde = (t: string) => `<tr><td style="padding:6px 0;vertical-align:top;width:26px"><span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:#E3F4E9;color:#17703F;font-weight:800;font-size:12px;line-height:20px;text-align:center">✓</span></td><td style="padding:6px 0;font-size:15px;line-height:1.5;color:#343B48">${t}</td></tr>`;
  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${konu}</title></head>
<body style="margin:0;padding:0;background:#F6F7F9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#161A22">
<div style="display:none;max-height:0;overflow:hidden">Görünür açılınca size ilk biz haber vereceğiz.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F7F9;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid #E2E5EB;border-radius:20px">
<tr><td style="padding:28px 32px 8px">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="width:34px;height:34px;border-radius:10px;background:#FFBD14;text-align:center;font-size:18px;line-height:34px;font-weight:800;color:#111318">◎</td>
<td style="padding-left:10px;font-size:20px;font-weight:800;letter-spacing:-.02em;color:#161A22">Görünür</td></tr></table>
</td></tr>
<tr><td style="padding:16px 32px 0">
<h1 style="margin:0;font-size:26px;line-height:1.2;font-weight:800;letter-spacing:-.02em;color:#161A22">Bekleme listesindesiniz</h1>
<p style="margin:14px 0 0;font-size:16px;line-height:1.6;color:#343B48"><b>${kacis(r.eposta)}</b> adresini Görünür bekleme listesine ekledik. Teşekkür ederiz.${kisisel ? " " + kacis(kisisel) : ""}</p>
</td></tr>
<tr><td style="padding:20px 32px 0">
<p style="margin:0 0 6px;font-size:15px;font-weight:800;color:#161A22">Bundan sonra ne olacak?</p>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
${madde("Görünür açıldığında size <b>ilk biz</b> haber vereceğiz.")}
${madde("Google'da, Haritalar'da ve yapay zekâ cevaplarında kaçıncı sırada olduğunuzu <b>her hafta</b> ölçeceğiz.")}
${madde("Yükselmek için yapmanız gereken işleri sade dille, sıraya koyarak yazacağız.")}
</table>
</td></tr>
<tr><td style="padding:24px 32px 8px">
<a href="${SITE}test.html?k=eposta" style="display:inline-block;background:#FFBD14;color:#111318;text-decoration:none;font-weight:800;font-size:15px;padding:13px 22px;border-radius:999px">Durumunuzu şimdi görün →</a>
</td></tr>
<tr><td style="padding:20px 32px 28px">
<p style="margin:0;font-size:14px;line-height:1.6;color:#5B6375">Sorunuz olursa bu e-postayı yanıtlamanız yeterli.</p>
</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px"><tr><td style="padding:18px 20px;font-size:12px;line-height:1.6;color:#6A7385;text-align:center">
Bu e-postayı Görünür bekleme listesine katıldığınız için aldınız. Ayda en fazla 3 e-posta göndeririz.<br>
Bu kaydı siz yapmadıysanız ya da artık haber almak istemiyorsanız <a href="${cikis}" style="color:#1E3A64">listeden çıkın</a>.
Verilerinizi nasıl kullandığımız: <a href="${SITE}aydinlatma.html" style="color:#1E3A64">aydınlatma metni</a>.
</td></tr></table>
</td></tr></table>
</body></html>`;
  return { konu, duz, html, cikis };
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
  await t.sendMail({ from: { name: "Görünür", address: kullanici }, to: alici, subject: konu, text: duz, html, headers });
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

  // Geri kalan her şey yalnızca veritabanı tetikleyicisinden
  const k = req.headers.get("x-gorunur-cron") || "";
  const { data: ayar } = await db.from("cron_ayar").select("deger").eq("ad", "olcum_anahtari").maybeSingle();
  if (!k || !ayar || ayar.deger !== k) return json({ hata: "Yetkisiz" }, 401);

  if (g.tur === "bekleme") {
    const { data: r } = await db.from("bekleme_listesi").select("*").eq("id", g.id).maybeSingle();
    if (!r) return json({ hata: "Kayıt yok" }, 404);
    if (r.eposta_gonderildi && !g.yeniden) return json({ tamam: true, zaten: true });
    const m = beklemeMetni(r);
    try {
      const yol = await gonder(r.eposta, m.konu, m.duz, m.html, m.cikis);
      await db.from("bekleme_listesi").update({ eposta_gonderildi: new Date().toISOString(), eposta_hata: null }).eq("id", r.id);
      return json({ tamam: true, yol });
    } catch (e) {
      const h = String((e as Error).message).slice(0, 300);
      console.log("eposta hatasi", h);
      await db.from("bekleme_listesi").update({ eposta_hata: h }).eq("id", r.id);
      return json({ hata: h }, 502);
    }
  }
  // Ayar sonradan eklendiyse: e-postası gitmemiş kayıtlara gönder (en fazla 40)
  if (g.tur === "bekleyenler") {
    const { data: l } = await db.from("bekleme_listesi").select("*").is("eposta_gonderildi", null).order("id").limit(40);
    let n = 0; const hatalar: string[] = [];
    for (const r of l || []) {
      const m = beklemeMetni(r);
      try { await gonder(r.eposta, m.konu, m.duz, m.html, m.cikis); n++; await db.from("bekleme_listesi").update({ eposta_gonderildi: new Date().toISOString(), eposta_hata: null }).eq("id", r.id); }
      catch (e) { hatalar.push(String((e as Error).message).slice(0, 120)); await db.from("bekleme_listesi").update({ eposta_hata: String((e as Error).message).slice(0, 300) }).eq("id", r.id); }
    }
    return json({ gonderilen: n, hatalar: hatalar.slice(0, 3) });
  }
  return json({ hata: "Bilinmeyen işlem" }, 400);
});
