-- Haftalık e-posta özeti: aynı ölçüm için ikinci kez gönderilmesin, hata görülebilsin
alter table public.olcumler add column if not exists ozet_gonderildi timestamptz;
alter table public.olcumler add column if not exists ozet_hata text;
