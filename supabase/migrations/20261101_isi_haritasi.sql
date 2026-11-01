-- Mahalle ısı haritası (yardimci, islem 'isi_haritasi'): ayda 1 kez, 3x3 noktadan haritalar sırası.
-- Sütunu sadece sunucu yazar (authenticated için update izni verilmez).
alter table public.isletmeler add column if not exists isi_haritasi jsonb;

-- İşletme adı / semt / iş türü değişince eski işletmenin haritası silinir (isletme_degisti_temizle gmaps_data_id'yi de siler)
create or replace function public.isi_haritasi_temizle()
 returns trigger
 language plpgsql
 set search_path to ''
as $function$
begin
  if (new.ad is distinct from old.ad) or (new.semt is distinct from old.semt) or (new.is_turu is distinct from old.is_turu) then
    new.isi_haritasi := null;
  end if;
  return new;
end $function$;

drop trigger if exists isi_haritasi_temizle on public.isletmeler;
create trigger isi_haritasi_temizle before update on public.isletmeler
  for each row execute function public.isi_haritasi_temizle();
