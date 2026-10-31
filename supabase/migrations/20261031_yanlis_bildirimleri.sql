-- Görünür: panelde "Bu sonuç yanlış" bildirimleri.
-- İşletme sahibi kendi işletmesi için bildirim ekler; okumayı sadece yönetici yapar (yonetim.html).
-- Hesap silinince bildirimler de silinir (sahip ve isletme_id ON DELETE CASCADE).
create table if not exists public.yanlis_bildirimleri (
  id uuid primary key default gen_random_uuid(),
  isletme_id uuid not null references public.isletmeler(id) on delete cascade,
  sahip uuid not null default auth.uid() references auth.users(id) on delete cascade,
  bolum text not null check (char_length(bolum) <= 40),
  baglam jsonb check (pg_column_size(baglam) <= 4000),
  notu text check (char_length(notu) <= 1000),
  olusturma timestamptz not null default now()
);
create index if not exists yanlis_bildirimleri_olusturma on public.yanlis_bildirimleri (olusturma desc);

alter table public.yanlis_bildirimleri enable row level security;

drop policy if exists "kendi bildirimini ekler" on public.yanlis_bildirimleri;
create policy "kendi bildirimini ekler" on public.yanlis_bildirimleri for insert to authenticated
  with check ((select auth.uid()) = sahip and exists (select 1 from public.isletmeler i where i.id = isletme_id and i.sahip = (select auth.uid())));

drop policy if exists "yonetici bildirimleri okur" on public.yanlis_bildirimleri;
create policy "yonetici bildirimleri okur" on public.yanlis_bildirimleri for select to authenticated
  using (public.yonetici_mi());

revoke all on public.yanlis_bildirimleri from anon, authenticated;
grant insert (isletme_id, bolum, baglam, notu) on public.yanlis_bildirimleri to authenticated;
grant select on public.yanlis_bildirimleri to authenticated;
