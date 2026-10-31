# Norevo hata kataloğu

Gerçek kullanımda bulunan her hata buraya yazılır. Ajan ekibi (kalite, yazılımcı, Ar-Ge) her çalışmada bu dosyayı okur.
Kural: Kapanan her hata için otomatik testlere (testler/calistir.js) ya da gerçeklik kontrolüne kalıcı bir kontrol eklenir, aynı hata geri gelemez.

Biçim: tarih · nerede · ne oldu · neden kaçırıldı · durum · kalıcı kontrol

## Kayıtlar

### 2026-10-30 · Site sağlığı taraması · SSL'i olmayan site "açılmıyor" dendi
- **Ne oldu:** corumortodonti.com tarayıcıda açılıyor (sadece http, "Güvenli değil" uyarısıyla). Tarama hep https ile denediği için "site açılmıyor" dedi. Müşteriye yanlış madde gitti.
- **Neden kaçırıldı:** Testler sahte veriyle çalışıyor, denemelerde hep düzgün siteler (example.com) kullanıldı. Kimse "sistemin söylediği gerçekte doğru mu" diye gerçek bir siteye bakmadı.
- **Doğru davranış:** https açılmazsa http ile bir kez daha dene. Açılırsa "Güvenli bağlantı (https) yok, ücretsiz SSL kurulsun" de, diğer kontrolleri yap. Kesin olumsuz cümle kurmadan önce ikinci yoldan doğrula.
- **Durum:** düzeltildi (2026-10-31, yardimci sürüm 10 yayında)
- **Ne değişti:** siteTara önce kayıtlı adresi dener; https bağlantı düzeyinde açılmazsa (sertifika, zaman aşımı, bağlantı hatası) aynı adresi bir kez http ile dener (yine guvenliGetir: SSRF denetimi, en fazla 3 yönlendirme). http ile açılırsa bütün kontroller yapılır, "Güvenli bağlantı (https)" maddesi "Siteniz açılıyor ama güvenli bağlantı (https) yok..." diye başarısız olur, öneri "Barındırma firmanızdan ücretsiz SSL sertifikası (Let's Encrypt) kurmasını isteyin." İki yol da açılmazsa ya da sunucu hata kodu (403, 5xx) dönerse kesin hüküm yok: "Sitenize ulaşamadık. Tarayıcıda açılıyorsa bize WhatsApp'tan yazın; bazı siteler otomatik kontrolleri engelliyor." Bu sonuç veri tabanına yazılmaz, önceki tarama kalır. sitemap.xml ve robots.txt de aynı yedekle istenir; sitemap.xml yoksa robots.txt'deki Sitemap satırlarına, sitemap_index.xml ve wp-sitemap.xml adreslerine de bakılır; hiç ulaşılamazsa "bulunamadı" denmez, madde listelenmez. isletmeler.site değeri değişmez.
- **Deneme yolu:** x-gorunur-cron başlığı geçerliyse gövde {islem:'site', deneme_site:'<adres>'} ile herhangi bir adres veri tabanına yazılmadan taranır.
- **Gerçek deneme (2026-10-31, net.http_post):**
  - https://corumortodonti.com → 200, adres "http://corumortodonti.com/", acildi true, http_ile_acildi true, puan 52, https maddesi tamam:false ve yeni metinle; diğer 13 kontrol çalıştı.
  - https://example.com → 200, https tamam:true, puan 30, normal tarama.
  - https://bu-alan-adi-yok-gorunur-7q3x9.com → ulasilamadi true, puan null, "Sitenize ulaşamadık..." metni.
  - Başlıksız POST → 401 "Giriş yapmanız gerekiyor."; yanlış anahtarla → 401 "Yetkisiz."
- **Kalıcı kontrol:** Sahte Supabase sunucu mantığını çalıştırmadığı için testler/calistir.js'e eklenmedi. Gerçeklik kontrolünde yukarıdaki üç deneme_site çağrısı (SSL'siz, normal, olmayan alan adı) her yayından sonra tekrarlanmalı.

### 2026-10-30 · Giriş · Yönetici, başka kullanıcının işletmesi olunca giremedi
- **Ne oldu:** Yönetici her işletmeyi okuyabildiği için ikinci bir kullanıcı işletme ekleyince "birden fazla kayıt" hatası çıktı, giriş bozuldu.
- **Neden kaçırıldı:** Sahte veri tabanında hep tek kullanıcı vardı.
- **Durum:** düzeltildi (sorgular sahibe göre süzülüyor)
- **Kalıcı kontrol:** testler/sahte-supabase.js yönetici gibi davranıyor; süzgeçsiz sorgu hata veriyor.

### 2026-10-30 · Giriş · Onay e-postası localhost'a yönlendirdi
- **Ne oldu:** Supabase "Site URL" ayarı localhost:3000 kaldığı için onay ve şifre e-postaları siteye değil localhost'a götürdü.
- **Neden kaçırıldı:** Ayar Supabase panelinde, kodda değil; ajanlar göremiyor.
- **Durum:** düzeltildi (Site URL ve Redirect URLs ayarlandı). Alan adı alınınca yeniden ayarlanmalı.
- **Kalıcı kontrol:** Günlük raporda auth kayıtlarında "localhost" geçiyorsa uyarı.

### 2026-10-30 · Yorumlar · Başka şehirdeki şubenin yorumları işletmeninki sanıldı
- **Ne oldu:** Çorum'daki işletme için Tuzla'daki aynı adlı şubenin yorumları getirildi.
- **Durum:** düzeltildi (adres işletmenin ilçe/şehrini içermeli)
- **Kalıcı kontrol:** Gerçeklik kontrolünde aynı adlı farklı şehir şubesi olan bir işletme denenmeli.
