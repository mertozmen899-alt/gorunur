# Norevo projesi (eski adı: Görünür)

Kullanıcı "norevo", "görünür" ya da "devam" yazarsa önce bu dosyanın "Durum" bölümünü oku, kısa bir özet ver ve ne yapmak istediğini sor.

## Durum (31 Ekim 2026, öğle)
- **Proje klasörü: `E:\Claude Code\norevo`** (1 Kasım: `norevo\gorunur` içeriği bir üst klasöre taşındı; önceki yol `E:\Claude Code\norevo\gorunur`). C: kopyası (`C:\Users\Mierd\gorunur`) eski, Mert onaylayınca silinecek. Claude hafızası: `C:\Users\Mierd\.claude\projects\E--Claude-Code-norevo\memory\`.
- Site: https://mertozmen899-alt.github.io/norevo/ (GitHub Pages, `main` dalından yayında; depo adı `mertozmen899-alt/norevo`, eski /gorunur adresi 404)
- Supabase projesi: `drlqbwdupntqqtkmdncc`
- Son yayın (1 Kasım öğle): `39de7a5` ana sayfa sadeleşti (tasarım denetimi), `c346870` müşteri testi düzeltmeleri (alakasız aramalar, Gemini uydurma adları, eski "Yaptım" kayıtları, tek yapay zekâ oranı, site işleri); `d61dc4a` "Yanlış mı?" yapay zekâ kontrolü + tek düzeltme kuralı; `olcum` edge function sürüm 35, `yardimci` sürüm 12 (canlı = repo). Raporlar: `raporlar/2026-11-01-tasarim.md`, `raporlar/2026-11-01-musteri-testi.md` (41 bulgu; 5 yüksek veri sorunu çözüldü, kalanlar raporda). Rapor sayfası: https://claude.ai/artifact/BtKqPL1sCUGKw67RttnidN. Bilerek kalan eski adlar: `x-gorunur-cron`, `gorunur-tuz`, keystore adları, `com.gorunur.app`, klasör adı.
- 3. denetçi puanlaması: **71/100**. Mert kararı: hukuk işleri ilk gerçek müşteriye kadar ertelendi, şimdilik hedef **90**. Tahmini şu an ~85-87.
- Ayrıntılı denetim raporu: Claude hafızasında `denetim-3-puanlama.md`.
- Her gün 18:00'de 4 zamanlanmış denetçi görevi çalışıyor (kod, karar, plan, metin); raporlar `raporlar/<tarih>-*.md` (commit edilmiyor).

### Bugün bitenler
- "Bu sonuç yanlış" düğmesi canlıda (201/201 test).
- PR #2: "ölçülmedi" ile "yok" ayrımı; SerpApi çökünce ölçüm "hata" kaydı.
- PR #3: elle ölçüm arka planda (202 + panel 5 sn'de bir sorgular), 10 dk takılı ölçüm temizliği, hatalı ölçüm hakka sayılmaz, bütçe ölçümden önce; haftalık seçim sadece bitti/suruyor ve çağrı başına 1 işletme (cron saatlik `17 * * * *`); karşılaştırmalar aynı aramayla; arama ölçülemediyse "sitenizi göremedik" yok; ham hata yerine bölüm adı; auth şifre hatası. Testler 217/217.
- Gerçek bir uçtan uca ölçüm henüz denenmedi (SerpApi harcar): Mert panelden "Tekrar ölç" ile denemeli.

### Claude'un yapacakları (öneri sırası, 90 için)
1. ~~Uydurma ad riski~~ (1 Kasım): "internete bakmadan" notu zaten `c346870`'de vardı; yaygın ad kuralı (`YAYGIN` listesi: "Güneş Diş" artık "Güneş Kuaför" ile eşleşmez) `olcum` ve `yardimci` adGeciyor'a eklendi, test `testler/ad-geciyor.js` (10/10). **Canlıda** (Mert yükledi): `olcum` v34, `yardimci` v11 (canlı = repo). CLI girişi yapıldı; yükleme komutu proje klasöründen çalışmalı: `npx supabase functions deploy <ad> --project-ref drlqbwdupntqqtkmdncc --no-verify-jwt`.
2. **"Yanlış mı?" yapay zekâ kontrolü** (1 Kasım, CANLIDA `d61dc4a`; gerçek Gemini cevabıyla henüz denenmedi, Mert panelden denemeli): panel bildirimi `yardimci` `islem:'yanlis'`e gönderir; Gemini bölümün kayıtlı verisine bakıp karar (hata/dogru/belirsiz) + açıklama verir, cevap sağ altta sohbet balonunda. Hata/belirsizse site yeniden taranır ya da elle ölçüm hakkı iade edilir (`olcumler.hak_iade`, günde en fazla 2). Günde 10 bildirim (`kullanim_harca` 'yanlis'). Yorum yazan adları Gemini'ye gönderilmez. Migration `20261101_yanlis_yapay_zeka.sql` uygulandı, `olcum` v35 + `yardimci` v12 yüklendi. Kalan: konuşma sayfa yenilenince kayboluyor; istemcinin doğrudan insert izni (`revoke`, Mert onayı).
   **Tek düzeltme kuralı** (Mert kararı 1 Kasım): kurulumdan sonra ad/semt/iş türünde ömür boyu 1 küçük düzeltme (yazım hatası, ek kelime, aynı il, iş türünde ortak kelime); başka işletmeye/sektöre geçişi sadece yönetici yapar; `kurulum_bitti` geri alınamaz. Migration `20261101_tek_duzeltme.sql` UYGULANDI (20 örnek + tetikleyici denemesi geçti); kurulum sayfasında not + kilit ve Türkçe hata mesajı canlıda. Yönetici muafiyeti oturumla denenmedi.
3. Yönetim sayfasına SerpApi bütçe sayaçları ve takılı ölçüm sayısı.
4. Deno birim testleri (fonksiyonları ayrı modüle almak gerekir) ve hızlı test sonucu için Playwright testi.
5. DNS rebinding (çözümle ile fetch arası), CSP (satır içi kod yüzünden dikkatli).
6. Ertelenenler: aylık "sizi koruduk" raporu ve alarmlar, Atlas köprüsü, gerçek işletmelerle "gizli müşteri" kontrolü, ajan görev metinlerini güncelleme (Mert onayı gerekli).

### Mert'in yapacakları
- **Hukukçu**: yasal sayfalarda (aydinlatma, gizlilik, cerez, kullanim-sartlari) canlıda "Taslak, yayınlanmamalıdır" yazıyor; yurt dışı aktarım dayanağı ve sorumluluk sınırı boş. Bu KRİTİK, ilk müşteriden önce şart. Kayıtta yurt dışı aktarım için ayrı bilgilendirme/onay gerekebilir.
- **SerpApi kapasitesi**: varsayılan ayarlarla günde ~1 tam ölçüm, ayda ~230 arama (2-3 işletmeye yeter). Plan büyütme kararı (ödemeli, Mert onaylar).
- Başka bir e-postayla kayıt denemesi (onay e-postası geliyor mu).
- Supabase → Edge Functions → Secrets: `GMAIL_ADRES`, `GMAIL_UYGULAMA_SIFRESI`.
- Çorum'dan 10-15 farklı türde gerçek işletme listesi.

## Kurallar
- Mert teknik değil. Adımları düz Türkçeyle, kopyalanabilir komutlarla anlat.
- Commit ve push'u Mert istemeden yapma.
- Ödemeli servisleri (SerpApi ücretli plan, alan adı, şirket/ödeme) Mert onaylamadan alma.
- Her oturum sonunda Durum bölümünü güncelle.
- **İşe başlamadan önce `git fetch` ve `git log main..origin/main`**: başka oturumlar origin/main'e push ediyor; 31 Ekim'de yerel kopya 6 commit gerideydi.
- **Adres, ad ya da ayar değiştiren oturum aynı işte Durum'u günceller** (site adresi, depo adı, alan adı, Supabase/GitHub ayarı, klasör yeri). 1 Kasım'da depo `norevo` oldu ama Durum'da eski `/gorunur` adresi kaldı; başka oturum eski adresi kontrol edip vakit kaybetti.
- **İşe başlarken son commit başlıklarını tara** (`git log --oneline -30`): "adres", "ad değişti", "taşındı", "marka", "depo" geçen bir commit varsa önce onu oku; Durum'daki bilgi ondan eskiyse Durum'u düzelt.
- **Edge Function deploy etmeden önce** canlıdaki sürümü (Supabase `get_edge_function`) repodakiyle karşılaştır.
- Supabase bağlayıcısı `revoke` / `drop policy` içeren migration'ı Mert yokken reddediyor; gerekmiyorsa bu satırları koyma.
- Testler: Playwright repoda kurulu değil; geçici klasöre kur, `NODE_PATH=<klasör>/node_modules node testler/calistir.js`.
- Commit kimliği yerelde ayarlı değil: `git -c user.name=Claude -c user.email=noreply@anthropic.com commit ...`
