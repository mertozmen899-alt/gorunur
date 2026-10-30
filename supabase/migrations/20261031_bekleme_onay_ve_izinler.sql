-- Güvenlik düzeltmesi 3, 5 ve 6:
-- * Bekleme listesi çift onaylı (double opt-in): kayıt olunca önce "Kaydınızı onaylayın" e-postası gider,
--   onay.html?a=<onay_anahtari> açılınca eposta fonksiyonu (tur: "onay") kaydı onaylar ve hoş geldin e-postasını yollar.
-- * katil_bekleme_listesi IP özetini güvenilir başlıktan alır: cf-connecting-ip, yoksa x-forwarded-for'un SON değeri
--   (ilk değer ziyaretçinin kendi yazabildiği sahte değer olabilir).
-- * İstemcinin hiç yazmadığı tablolarda anon/authenticated yazma izinleri kaldırılır.

alter table public.bekleme_listesi add column if not exists onaylandi boolean not null default false;
alter table public.bekleme_listesi add column if not exists onay_anahtari text not null default encode(extensions.gen_random_bytes(16), 'hex');
alter table public.bekleme_listesi add column if not exists onay_gonderildi timestamptz;
create unique index if not exists bekleme_listesi_onay_anahtari_key on public.bekleme_listesi (onay_anahtari);

create or replace function public.katil_bekleme_listesi(p_eposta text, p_onay boolean, p_kaynak text default null, p_calisma_sekli text[] default null, p_sehir text default null, p_is_turu text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_eposta text := lower(trim(p_eposta));
  v_basliklar json;
  v_xff text[];
  v_ip text := '';
  v_ip_ozet text;
  v_son integer;
begin
  if p_onay is distinct from true then
    return 'onay_gerekli';
  end if;
  if v_eposta is null or char_length(v_eposta) > 254 or v_eposta !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    return 'gecersiz_eposta';
  end if;

  begin
    v_basliklar := current_setting('request.headers', true)::json;
    v_ip := trim(coalesce(v_basliklar ->> 'cf-connecting-ip', ''));
    if v_ip = '' then
      v_xff := string_to_array(coalesce(v_basliklar ->> 'x-forwarded-for', ''), ',');
      v_ip := trim(coalesce(v_xff[array_length(v_xff, 1)], ''));
    end if;
  exception when others then
    v_ip := '';
  end;
  v_ip_ozet := encode(extensions.digest(v_ip || 'gorunur-tuz', 'sha256'), 'hex');

  select count(*) into v_son from public.bekleme_listesi
   where ip_ozet = v_ip_ozet and olusturma > now() - interval '10 minutes';
  if v_ip <> '' and v_son >= 5 then
    return 'cok_fazla_deneme';
  end if;

  insert into public.bekleme_listesi (eposta, onay, kaynak, calisma_sekli, sehir, is_turu, ip_ozet)
  values (
    v_eposta, true,
    left(nullif(trim(p_kaynak), ''), 100),
    p_calisma_sekli[1:3],
    left(nullif(trim(p_sehir), ''), 120),
    left(nullif(trim(p_is_turu), ''), 120),
    v_ip_ozet
  )
  on conflict (eposta) do nothing;

  return 'tamam';
end;
$$;

-- İstemci bu tablolara hiç yazmıyor (yazmalar sadece Edge Function'lar ve SECURITY DEFINER fonksiyonlarla, service_role/sahip olarak)
revoke insert, update, delete, truncate on public.ajan_raporlari, public.rakip_takip, public.ziyaretler,
  public.hizli_testler, public.hizli_test_istek, public.olcumler, public.gunluk_raporlar from anon, authenticated;
-- Panel yapilan_isler'e ekler ve siler; güncelleme ve truncate gerekmez
revoke update, truncate on public.yapilan_isler from anon, authenticated;
revoke insert, delete on public.yapilan_isler from anon;
-- TRUNCATE RLS'i atlar; istemci rollerinde hiçbir tabloda olmasın
revoke truncate on public.isletmeler, public.bekleme_listesi, public.cron_ayar, public.yoneticiler from anon, authenticated;
