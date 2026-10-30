-- İşletme adı, yeri ya da iş türü değişince eski işletmeye ait önbellek verileri silinsin
create or replace function public.isletme_degisti_temizle() returns trigger language plpgsql as $$
begin
  if (new.ad is distinct from old.ad) or (new.semt is distinct from old.semt) or (new.is_turu is distinct from old.is_turu) then
    new.gmaps_data_id := null; new.yorumlar := null; new.platformlar := null;
    new.sektor_profili := null; new.sektor_profili_tarih := null;
    new.oto_kelimeler := null; new.oto_kelimeler_tarih := null;
    new.sektor_rehberleri := null; new.sektor_rehberleri_tarih := null;
  end if;
  if (new.semt is distinct from old.semt) then new.serp_konum := null; end if;
  if (new.site is distinct from old.site) then new.site_saglik := null; new.site_saglik_tarih := null; end if;
  return new;
end $$;
drop trigger if exists isletme_degisti_temizle on public.isletmeler;
create trigger isletme_degisti_temizle before update on public.isletmeler for each row execute function public.isletme_degisti_temizle();
