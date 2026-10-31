-- Yöneticiler deneme için günde istedikleri kadar işletme bilgisi değiştirebilir (ölçüm hakkında olduğu gibi)
create or replace function public.isletme_degisti_temizle()
 returns trigger
 language plpgsql
 set search_path to ''
as $function$
declare
  v_gun text := to_char(now() at time zone 'Europe/Istanbul', 'YYYY-MM-DD');
  v_n int;
begin
  if (new.ad is distinct from old.ad) or (new.semt is distinct from old.semt) or (new.is_turu is distinct from old.is_turu) then
    if (coalesce(old.ad, '') <> '' and new.ad is distinct from old.ad)
       or (coalesce(old.semt, '') <> '' and new.semt is distinct from old.semt)
       or (coalesce(old.is_turu, '') <> '' and new.is_turu is distinct from old.is_turu) then
      v_n := case when old.degisiklik ->> 'gun' = v_gun then coalesce((old.degisiklik ->> 'n')::int, 0) else 0 end;
      if v_n >= 3 and not public.yonetici_mi() then
        raise exception using errcode = 'P0001', message = 'Bugün işletme bilgilerinizi çok kez değiştirdiniz. Yarın tekrar deneyin.';
      end if;
      new.degisiklik := jsonb_build_object('gun', v_gun, 'n', v_n + 1);
    end if;
    new.gmaps_data_id := null; new.yorumlar := null; new.platformlar := null;
    new.sektor_profili := null; new.sektor_profili_tarih := null;
    new.oto_kelimeler := null; new.oto_kelimeler_tarih := null;
    new.sektor_rehberleri := null; new.sektor_rehberleri_tarih := null;
    new.secili_rakipler := null;
  end if;
  if (new.semt is distinct from old.semt) then new.serp_konum := null; end if;
  if (new.site is distinct from old.site) then new.site_saglik := null; new.site_saglik_tarih := null; end if;
  return new;
end $function$;
