-- Görünür: yeni yapay zekâ motorları (Google Yapay Zekâ Modu ve ChatGPT) için ölçüm alanları.
-- olcum Edge Function'ı s.gyz_* ve s.cg_* alanlarını public.olcumler tablosuna yazar.
-- Sayılar int, cevap listeleri jsonb (yz_soru_sayisi / yz_gecen / yz_cevaplar ile aynı yapı).
alter table public.olcumler
  add column if not exists gyz_soru_sayisi int,
  add column if not exists gyz_gecen int,
  add column if not exists gyz_cevaplar jsonb,
  add column if not exists cg_soru_sayisi int,
  add column if not exists cg_gecen int,
  add column if not exists cg_cevaplar jsonb;
