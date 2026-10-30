-- Güvenlik düzeltmesi 1 ve 2:
-- * Günlük kullanım sayaçları artık ayrı, sadece sunucunun yazabildiği "kullanim" sütununda.
--   (Eskiden yorumlar/platformlar/site_saglik içindeydi; işletme adı değişince silindiği için sınırlar sıfırlanıyordu.)
-- * İşletme adı / semt / iş türü günde en fazla 3 kez değiştirilebilir ("degisiklik" sütunu, tetikleyici tutar).
-- * Tüm SerpApi aramaları için günlük toplam bütçe: public.serp_harca(adet, sinir).
-- * site ve google_profil sadece http(s) adresi olabilir.

alter table public.isletmeler add column if not exists kullanim jsonb not null default '{}'::jsonb;
alter table public.isletmeler add column if not exists degisiklik jsonb not null default '{}'::jsonb;

-- İstemci select('*') yapıyor ve sütun bazlı SELECT izinleri var: okuma izni verilir, yazma izni verilmez.
grant select (kullanim, degisiklik) on public.isletmeler to authenticated;
revoke insert (kullanim, degisiklik), update (kullanim, degisiklik) on public.isletmeler from anon, authenticated;

-- Adres sütunları sadece http(s) olabilir (mevcut satırlar uyuyor, yine de NOT VALID güvenli)
alter table public.isletmeler drop constraint if exists isletmeler_site_http;
alter table public.isletmeler add constraint isletmeler_site_http check (site is null or site ~* '^https?://') not valid;
alter table public.isletmeler validate constraint isletmeler_site_http;
alter table public.isletmeler drop constraint if exists isletmeler_google_profil_http;
alter table public.isletmeler add constraint isletmeler_google_profil_http check (google_profil is null or google_profil ~* '^https?://') not valid;
alter table public.isletmeler validate constraint isletmeler_google_profil_http;

-- İşletme bilgisi değişince eski önbellek verileri temizlenir; kullanim sütununa asla dokunulmaz.
-- İlk doldurma (eski değer boşken) sayılmaz; dolu bir ad/semt/iş türünü değiştirmek günde en fazla 3 kez.
create or replace function public.isletme_degisti_temizle() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_gun text := to_char(now() at time zone 'Europe/Istanbul', 'YYYY-MM-DD');
  v_n int;
begin
  if (new.ad is distinct from old.ad) or (new.semt is distinct from old.semt) or (new.is_turu is distinct from old.is_turu) then
    if (coalesce(old.ad, '') <> '' and new.ad is distinct from old.ad)
       or (coalesce(old.semt, '') <> '' and new.semt is distinct from old.semt)
       or (coalesce(old.is_turu, '') <> '' and new.is_turu is distinct from old.is_turu) then
      v_n := case when old.degisiklik ->> 'gun' = v_gun then coalesce((old.degisiklik ->> 'n')::int, 0) else 0 end;
      if v_n >= 3 then
        raise exception using errcode = 'P0001', message = 'Bugün işletme bilgilerinizi çok kez değiştirdiniz. Yarın tekrar deneyin.';
      end if;
      new.degisiklik := jsonb_build_object('gun', v_gun, 'n', v_n + 1);
    end if;
    new.gmaps_data_id := null; new.yorumlar := null; new.platformlar := null;
    new.sektor_profili := null; new.sektor_profili_tarih := null;
    new.oto_kelimeler := null; new.oto_kelimeler_tarih := null;
    new.sektor_rehberleri := null; new.sektor_rehberleri_tarih := null;
  end if;
  if (new.semt is distinct from old.semt) then new.serp_konum := null; end if;
  if (new.site is distinct from old.site) then new.site_saglik := null; new.site_saglik_tarih := null; end if;
  return new;
end $$;

-- İşletme başına günlük sayaç (atomik, satır kilidiyle). Sınır aşılacaksa false döner ve hiçbir şey yazmaz.
create or replace function public.kullanim_harca(p_isletme uuid, p_alan text, p_adet int, p_sinir int)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_gun text := to_char(now() at time zone 'Europe/Istanbul', 'YYYY-MM-DD');
  v jsonb; v_n int;
begin
  if p_alan not in ('serp', 'site', 'metin', 'yorum', 'platform') or p_adet is null or p_adet < 0 then return false; end if;
  select kullanim into v from public.isletmeler where id = p_isletme for update;
  if not found then return false; end if;
  if v is null or v ->> 'gun' is distinct from v_gun then v := jsonb_build_object('gun', v_gun); end if;
  v_n := coalesce((v ->> p_alan)::int, 0);
  if v_n + p_adet > p_sinir then return false; end if;
  update public.isletmeler set kullanim = v || jsonb_build_object(p_alan, v_n + p_adet) where id = p_isletme;
  return true;
end $$;
revoke all on function public.kullanim_harca(uuid, text, int, int) from public, anon, authenticated;
grant execute on function public.kullanim_harca(uuid, text, int, int) to service_role;

-- Tüm sistem için günlük SerpApi bütçesi (cron_ayar.serp_gunluk = {"gun":"YYYY-MM-DD","n":sayı}, Türkiye günü)
create or replace function public.serp_harca(adet int, sinir int default 150)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_gun text := to_char(now() at time zone 'Europe/Istanbul', 'YYYY-MM-DD');
  v jsonb; v_n int;
begin
  if adet is null or adet < 0 then return false; end if;
  insert into public.cron_ayar (ad, deger) values ('serp_gunluk', jsonb_build_object('gun', v_gun, 'n', 0)::text)
  on conflict (ad) do nothing;
  select deger::jsonb into v from public.cron_ayar where ad = 'serp_gunluk' for update;
  v_n := case when v ->> 'gun' = v_gun then coalesce((v ->> 'n')::int, 0) else 0 end;
  if v_n + adet > coalesce(sinir, 150) then return false; end if;
  update public.cron_ayar set deger = jsonb_build_object('gun', v_gun, 'n', v_n + adet)::text where ad = 'serp_gunluk';
  return true;
end $$;
revoke all on function public.serp_harca(int, int) from public, anon, authenticated;
grant execute on function public.serp_harca(int, int) to service_role;
