// Görünür: kullanıcının kendi hesabını ve bütün verilerini silmesi (KVKK, unutulma hakkı)
// İşletme, ölçümler ve "Yaptım" kayıtları veritabanında hesaba bağlı olduğu için hesapla birlikte silinir.
// Aynı e-postayla bekleme listesine katıldıysa o kayıt da silinir.
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ hata: "Sadece POST" }, 405);
  const URL_ = Deno.env.get("SUPABASE_URL")!;
  const kullaniciDb = createClient(URL_, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } });
  const { data: u } = await kullaniciDb.auth.getUser();
  if (!u?.user) return json({ hata: "Giriş yapmanız gerekiyor." }, 401);

  const govde = await req.json().catch(() => ({}));
  const eposta = String(u.user.email || "").toLowerCase();
  // Yanlışlıkla silmeyi önlemek için kullanıcı e-postasını yazarak onaylar
  if (String(govde?.onay || "").trim().toLowerCase() !== eposta) return json({ hata: "Onay için e-posta adresinizi aynen yazın." }, 400);

  const db = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: ymt } = await db.from("yoneticiler").select("eposta").eq("eposta", eposta).maybeSingle();
  if (ymt) return json({ hata: "Yönetici hesabı buradan silinemez." }, 403);

  if (eposta) await db.from("bekleme_listesi").delete().eq("eposta", eposta);
  const { error } = await db.auth.admin.deleteUser(u.user.id);
  if (error) { console.log("hesap silinemedi", u.user.id, error.message); return json({ hata: "Hesap şu an silinemedi. Lütfen biraz sonra tekrar deneyin." }, 500); }
  console.log("hesap silindi", u.user.id);
  return json({ silindi: true });
});
