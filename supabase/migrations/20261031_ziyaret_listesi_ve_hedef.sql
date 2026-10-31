-- 1) Ziyaret sayacı: sadece sitedeki gerçek sayfalar sayılır; günde en fazla 30 farklı kaynak (kampanya kodu) açılır.
--    Böylece biri fonksiyonu sürekli çağırarak sahte sayfa veya kaynak satırları açamaz.
create or replace function public.ziyaret_say(p_sayfa text, p_kaynak text default 'dogrudan')
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare s text := lower(coalesce(p_sayfa, '')); k text := lower(coalesce(p_kaynak, 'dogrudan'));
begin
  if s not in ('index', 'test', 'giris', 'kurulum', 'panel', 'aydinlatma', 'gizlilik', 'kullanim-sartlari', 'cerez', 'onay', 'cikis', 'sifre', '404') then return; end if;
  if k !~ '^[a-z0-9-]{1,30}$' then k := 'diger'; end if;
  if k not in ('dogrudan', 'google', 'instagram', 'facebook', 'whatsapp', 'bing', 'chatgpt', 'diger')
     and not exists (select 1 from public.ziyaretler where gun = current_date and kaynak = k)
     and (select count(distinct kaynak) from public.ziyaretler where gun = current_date) >= 30 then
    k := 'diger';
  end if;
  insert into public.ziyaretler (sayfa, kaynak, sayi) values (s, k, 1)
  on conflict (gun, sayfa, kaynak) do update set sayi = public.ziyaretler.sayi + 1;
end $$;

-- 2) İşletmenin hedefi (İşlerim sayfasındaki "Bu ay en çok ne istiyorsunuz?" sorusu): işler buna göre sıralanır.
alter table public.isletmeler add column if not exists hedef text;
alter table public.isletmeler drop constraint if exists isletmeler_hedef_kontrol;
alter table public.isletmeler add constraint isletmeler_hedef_kontrol check (hedef is null or hedef in ('telefon', 'dukkan', 'internet'));
grant update (hedef) on public.isletmeler to authenticated;
