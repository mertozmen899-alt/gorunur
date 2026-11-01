-- Kurulum bittikten sonra işletme adı / semt / iş türünde tek bir küçük düzeltme (Mert kararı, 1 Kasım):
-- * Küçük: yazım hatası (en fazla 3 harf farkı, kısa yazıda 1), eklenen ya da çıkarılan kelime, aynı ildeki semt,
--   iş türünde ortak ayırt edici kelime ("diş hekimi" → "diş kliniği" olur, "veteriner" → "diş hekimi" olmaz).
-- * Hak kullanıldıysa (degisiklik.duzeltme) başka değişiklik yok; başka işletmeye geçişi sadece yönetici yapar.
-- * Kurulum bitti işareti geri alınamaz (yoksa kurulum moduna dönüp serbest değiştirilebilirdi).
-- * Kurulum sürerken eski kural geçerli: günde en fazla 3 değişiklik.
create extension if not exists fuzzystrmatch with schema extensions;

-- Karşılaştırma için sade yazı: Türkçe harfler düz, noktalama yok ("Çorum Merkez" → "corum merkez")
create or replace function public.ad_sade(x text) returns text
language sql immutable set search_path = '' as $$
  select trim(regexp_replace(lower(translate(coalesce(x, ''), 'İIıŞşĞğÜüÖöÇçÂâÎîÛû', 'iiissgguuooccaaiiuu')), '[^a-z0-9]+', ' ', 'g'))
$$;

create or replace function public.duzeltme_kucuk(p_alan text, p_eski text, p_yeni text) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  e text := public.ad_sade(p_eski);
  y text := public.ad_sade(p_yeni);
  genel text[] := array['ve', 'the', 'ltd', 'sti', 'as', 'limited', 'sirketi', 'san', 'tic', 'ticaret', 'sube', 'subesi', 'merkez', 'merkezi',
    'magaza', 'magazasi', 'firma', 'firmasi', 'grup', 'group', 'salon', 'salonu', 'klinik', 'klinigi', 'ofis', 'ofisi', 'hizmet', 'hizmetleri',
    'servis', 'servisi', 'buro', 'burosu', 'atolye', 'atolyesi', 'dukkan', 'dukkani', 'ozel', 'evi', 'center', 'studio', 'studyo'];
  te text[]; ty text[]; az text[]; cok text[];
begin
  -- Yazım hatası: uzunluğun beşte biri kadar harf farkı (en az 1, en fazla 3); kısa sözcükte "kafe" → "kuaför" olmaz
  if e = y or extensions.levenshtein(e, y) <= least(3, greatest(1, length(e) / 5)) then return true; end if;
  -- Semt: il (virgülden sonraki son parça) aynı kalmalı
  if p_alan = 'semt' then
    return public.ad_sade(regexp_replace(p_eski, '^.*,', '')) = public.ad_sade(regexp_replace(p_yeni, '^.*,', ''));
  end if;
  select array_agg(t) into te from unnest(string_to_array(e, ' ')) t where length(t) >= 3 and t <> all (genel);
  select array_agg(t) into ty from unnest(string_to_array(y, ' ')) t where length(t) >= 3 and t <> all (genel);
  if te is null or ty is null then return false; end if;
  -- İş türü: en az bir ortak ayırt edici kelime
  if p_alan = 'is_turu' then
    return exists (select 1 from unnest(te) a, unnest(ty) b where a = b or a like b || '%' or b like a || '%');
  end if;
  -- Ad: az kelimeli adın her kelimesi diğerinde var (ek, kısaltma ya da 1 harf hata); "Güneş Diş" → "Güneş Kuaför" olmaz
  if cardinality(te) <= cardinality(ty) then az := te; cok := ty; else az := ty; cok := te; end if;
  return not exists (select 1 from unnest(az) a where not exists (
    select 1 from unnest(cok) b where b like a || '%' or a like b || '%' or extensions.levenshtein(a, b) <= 1));
end $$;

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
  end if;
  if (new.semt is distinct from old.semt) then new.serp_konum := null; end if;
  if (new.site is distinct from old.site) then new.site_saglik := null; new.site_saglik_tarih := null; end if;
  return new;
end $function$;
