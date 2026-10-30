-- Görünür: Google yorumları (cevap taslaklarıyla) ve "hangi platformlarda varsınız" kontrolü.
-- yardimci Edge Function'ı (service role) bu alanları yazar. Kullanıcı bunları DEĞİŞTİREMEZ
-- (UPDATE/INSERT izni yok); sadece okuyabilir. Okuma izni şart: panel isletmeler'i select('*')
-- ile çekiyor ve tablo izinleri sütun bazında verildiği için izinsiz bir sütun tüm sorguyu bozar.
alter table public.isletmeler
  add column if not exists gmaps_data_id text,
  add column if not exists yorumlar jsonb,
  add column if not exists platformlar jsonb;

grant select (gmaps_data_id, yorumlar, platformlar) on public.isletmeler to authenticated;
