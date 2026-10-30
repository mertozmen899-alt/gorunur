-- Aylık SerpApi bütçesi (ücretsiz plan: ayda 250 arama).
-- public.serp_harca artık hem günlük (cron_ayar 'serp_gunluk' {gun, n}) hem aylık (cron_ayar 'serp_aylik' {ay:'YYYY-MM', n})
-- sınırı birlikte denetler. İkisinden biri aşılacaksa false döner ve hiçbir sayaç değişmez (atomik, satır kilidiyle).
-- p_aylik: aylık sınır (varsayılan 230). Hızlı test, ücretli kullanıcılara yer kalsın diye bu sınırın %60'ını gönderir.
-- Sadece service_role çağırabilir.

create or replace function public.serp_harca(adet int, sinir int default 25, p_aylik int default 230)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_gun text := to_char(now() at time zone 'Europe/Istanbul', 'YYYY-MM-DD');
  v_ay text := to_char(now() at time zone 'Europe/Istanbul', 'YYYY-MM');
  vg jsonb; va jsonb; v_ng int; v_na int;
begin
  if adet is null or adet < 0 then return false; end if;
  insert into public.cron_ayar (ad, deger) values ('serp_gunluk', jsonb_build_object('gun', v_gun, 'n', 0)::text)
  on conflict (ad) do nothing;
  insert into public.cron_ayar (ad, deger) values ('serp_aylik', jsonb_build_object('ay', v_ay, 'n', 0)::text)
  on conflict (ad) do nothing;
  -- Kilit sırası her zaman aynı: önce günlük, sonra aylık (kilitlenme olmasın)
  select deger::jsonb into vg from public.cron_ayar where ad = 'serp_gunluk' for update;
  select deger::jsonb into va from public.cron_ayar where ad = 'serp_aylik' for update;
  v_ng := case when vg ->> 'gun' = v_gun then coalesce((vg ->> 'n')::int, 0) else 0 end;
  v_na := case when va ->> 'ay' = v_ay then coalesce((va ->> 'n')::int, 0) else 0 end;
  if v_ng + adet > coalesce(sinir, 25) then return false; end if;
  if v_na + adet > coalesce(p_aylik, 230) then return false; end if;
  update public.cron_ayar set deger = jsonb_build_object('gun', v_gun, 'n', v_ng + adet)::text where ad = 'serp_gunluk';
  update public.cron_ayar set deger = jsonb_build_object('ay', v_ay, 'n', v_na + adet)::text where ad = 'serp_aylik';
  return true;
end $$;
revoke all on function public.serp_harca(int, int, int) from public, anon, authenticated;
grant execute on function public.serp_harca(int, int, int) to service_role;

-- Eski iki parametreli sürüm silinmez (silme işlemi onay gerektiriyor); aylık sınırı da uygulayan yeni sürüme yönlendirilir.
-- Not: iki adla (adet, sinir) çağrı belirsiz olur; fonksiyonlar her zaman p_aylik'i de gönderir.
create or replace function public.serp_harca(adet int, sinir int default 150)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  return public.serp_harca(adet, sinir, 230);
end $$;
revoke all on function public.serp_harca(int, int) from public, anon, authenticated;
grant execute on function public.serp_harca(int, int) to service_role;

-- Bu ayın sayacını okumak için (sadece service_role): bütçe dolunca nedenini (günlük mü, aylık mı) ayırmak için
create or replace function public.serp_aylik_kullanim()
returns int language sql stable security definer set search_path = '' as $$
  select case when (deger::jsonb ->> 'ay') = to_char(now() at time zone 'Europe/Istanbul', 'YYYY-MM')
              then coalesce((deger::jsonb ->> 'n')::int, 0) else 0 end
  from public.cron_ayar where ad = 'serp_aylik';
$$;
revoke all on function public.serp_aylik_kullanim() from public, anon, authenticated;
grant execute on function public.serp_aylik_kullanim() to service_role;
