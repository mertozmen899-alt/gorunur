-- "Yanlış mı?" artık yapay zekâyla kontrol ediliyor (yardimci, islem: 'yanlis'):
-- bildirimi sunucu ekler; yapay zekânın kararı, kullanıcıya gösterilen cevap ve yapılan işlem kaydedilir.
-- Hatalı bulunan elle ölçüm ölçüm hakkına sayılmaz (olcumler.hak_iade).
-- kullanim_harca iki yeni sayaç alır: 'yanlis' (günlük bildirim) ve 'iade' (günlük hak iadesi).
alter table public.yanlis_bildirimleri add column if not exists karar text check (karar in ('hata', 'dogru', 'belirsiz'));
alter table public.yanlis_bildirimleri add column if not exists cevap text check (char_length(cevap) <= 2000);
alter table public.yanlis_bildirimleri add column if not exists islem text check (char_length(islem) <= 40);

alter table public.olcumler add column if not exists hak_iade boolean not null default false;

create or replace function public.kullanim_harca(p_isletme uuid, p_alan text, p_adet int, p_sinir int)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_gun text := to_char(now() at time zone 'Europe/Istanbul', 'YYYY-MM-DD');
  v jsonb; v_n int;
begin
  if p_alan not in ('serp', 'site', 'metin', 'yorum', 'platform', 'yanlis', 'iade') or p_adet is null or p_adet < 0 then return false; end if;
  select kullanim into v from public.isletmeler where id = p_isletme for update;
  if not found then return false; end if;
  if v is null or v ->> 'gun' is distinct from v_gun then v := jsonb_build_object('gun', v_gun); end if;
  v_n := coalesce((v ->> p_alan)::int, 0);
  if v_n + p_adet > p_sinir then return false; end if;
  update public.isletmeler set kullanim = v || jsonb_build_object(p_alan, v_n + p_adet) where id = p_isletme;
  return true;
end $$;
