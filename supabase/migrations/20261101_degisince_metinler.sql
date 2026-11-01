-- İşletme adı / semt / iş türü değişince hazır metinler de silinir (1 Kasım: 4KDent hesabı Loca Mobilya olunca
-- panelde diş kliniği gönderileri ve açıklaması kalmıştı). Fonksiyonun geri kalanı 20261101_tek_duzeltme.sql ile aynı.
create or replace function public.isletme_degisti_temizle()
 returns trigger
 language plpgsql
 set search_path to ''
as $function$
declare
  v_gun text := to_char(now() at time zone 'Europe/Istanbul', 'YYYY-MM-DD');
  v_n int;
  v_yonetici boolean := public.yonetici_mi();
begin
  if old.kurulum_bitti and not coalesce(new.kurulum_bitti, false) and not v_yonetici then new.kurulum_bitti := true; end if;
  if (new.ad is distinct from old.ad) or (new.semt is distinct from old.semt) or (new.is_turu is distinct from old.is_turu) then
    if (coalesce(old.ad, '') <> '' and new.ad is distinct from old.ad)
       or (coalesce(old.semt, '') <> '' and new.semt is distinct from old.semt)
       or (coalesce(old.is_turu, '') <> '' and new.is_turu is distinct from old.is_turu) then
      if old.kurulum_bitti and not v_yonetici then
        if old.degisiklik ? 'duzeltme' then
          raise exception using errcode = 'P0001', message = 'İşletme bilgilerinizi daha önce bir kez düzelttiniz. Başka bir değişiklik için bize WhatsApp''tan yazın.';
        end if;
        if not (public.duzeltme_kucuk('ad', old.ad, new.ad) and public.duzeltme_kucuk('semt', old.semt, new.semt) and public.duzeltme_kucuk('is_turu', old.is_turu, new.is_turu)) then
          raise exception using errcode = 'P0001', message = 'İşletme bilgilerinizde sadece küçük düzeltme yapabilirsiniz (yazım hatası, eksik kelime, aynı ildeki semt). Başka bir işletmeye ya da iş türüne geçmek için bize WhatsApp''tan yazın.';
        end if;
        -- Küçük düzeltmede eski ölçümler panelde kalır ("zaman" değişmez)
        new.degisiklik := old.degisiklik || jsonb_build_object('duzeltme', now());
      else
        v_n := case when old.degisiklik ->> 'gun' = v_gun then coalesce((old.degisiklik ->> 'n')::int, 0) else 0 end;
        if v_n >= 3 and not v_yonetici then
          raise exception using errcode = 'P0001', message = 'Bugün işletme bilgilerinizi çok kez değiştirdiniz. Yarın tekrar deneyin.';
        end if;
        new.degisiklik := old.degisiklik || jsonb_build_object('gun', v_gun, 'n', v_n + 1, 'zaman', now());
      end if;
    end if;
    new.gmaps_data_id := null; new.yorumlar := null; new.platformlar := null;
    new.sektor_profili := null; new.sektor_profili_tarih := null;
    new.oto_kelimeler := null; new.oto_kelimeler_tarih := null;
    new.sektor_rehberleri := null; new.sektor_rehberleri_tarih := null;
    new.secili_rakipler := null;
    -- Hazır metinler (açıklama, gönderiler, sayfa) eski işletmenin adıyla yazılmıştı
    new.hazir_metinler := null;
  end if;
  if (new.semt is distinct from old.semt) then new.serp_konum := null; end if;
  if (new.site is distinct from old.site) then new.site_saglik := null; new.site_saglik_tarih := null; end if;
  return new;
end $function$;

-- Bu hatadan etkilenmiş kayıtlar: metin, son kimlik değişikliğinden önce yazılmışsa silinir
update public.isletmeler set hazir_metinler = null
where hazir_metinler is not null and degisiklik ? 'zaman'
  and not exists (select 1 from jsonb_each(hazir_metinler) m where (m.value ->> 'tarih') >= (degisiklik ->> 'zaman'));
