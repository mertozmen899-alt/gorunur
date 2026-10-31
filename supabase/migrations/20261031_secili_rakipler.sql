-- Rakip seçimi: işletme sahibi haritalarda karşısına çıkan işletmelerden en çok 5 tanesini izlemek için seçer.
-- Seçim yoksa ölçüm haritalarda en sık öne çıkan 3 işletmeyi otomatik izler.
-- Ölçüm sonucu olcumler.izlenen_rakipler'e yazılır (sadece o ölçümde zaten alınan veriden; ek ücretli sorgu yok).

alter table public.isletmeler add column if not exists secili_rakipler jsonb;
alter table public.isletmeler drop constraint if exists isletmeler_secili_rakipler_kontrol;
alter table public.isletmeler add constraint isletmeler_secili_rakipler_kontrol check (
  secili_rakipler is null or (
    jsonb_typeof(secili_rakipler) = 'array'
    and jsonb_array_length(secili_rakipler) <= 5
    and pg_column_size(secili_rakipler) <= 4000
  )
);
grant update (secili_rakipler) on public.isletmeler to authenticated;

alter table public.olcumler add column if not exists izlenen_rakipler jsonb;

-- İşletme adı, yeri ya da iş türü değişince eski rakip seçimi de geçersiz olur
-- (canlıdaki güncel fonksiyon: günlük değişiklik sınırı dahil; tek ek satır secili_rakipler)
create or replace function public.isletme_degisti_temizle() returns trigger language plpgsql set search_path to '' as $function$
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
    new.secili_rakipler := null;
  end if;
  if (new.semt is distinct from old.semt) then new.serp_konum := null; end if;
  if (new.site is distinct from old.site) then new.site_saglik := null; new.site_saglik_tarih := null; end if;
  return new;
end $function$;
