# Norevo projesi (eski adı: Görünür)

Kullanıcı "norevo", "görünür" ya da "devam" yazarsa önce bu dosyanın "Durum" bölümünü oku, kısa bir özet ver ve ne yapmak istediğini sor.

## Durum (31 Ekim 2026, öğle)
- **Proje klasörü: `E:\Claude Code\norevo\gorunur`** (31 Ekim'de `C:\Users\Mierd\gorunur`'dan kopyalandı; C: kopyası eski, Mert onaylayınca silinecek). Claude hafızası: `C:\Users\Mierd\.claude\projects\E--Claude-Code-norevo-gorunur\memory\`.
- Site: https://mertozmen899-alt.github.io/gorunur/ (GitHub Pages, `main` dalından yayında)
- Supabase projesi: `drlqbwdupntqqtkmdncc`
- Son yayın: PR #3 birleşti (`4a4b3a0`), panel.js v30 canlıda; `olcum` edge function sürüm 28 deploy edildi (canlı = repo, birebir karşılaştırıldı).
- 3. denetçi puanlaması: **71/100**. Mert kararı: hukuk işleri ilk gerçek müşteriye kadar ertelendi, şimdilik hedef **90**. Tahmini şu an ~85-87.
- Ayrıntılı denetim raporu: Claude hafızasında `denetim-3-puanlama.md`.
- Her gün 18:00'de 4 zamanlanmış denetçi görevi çalışıyor (kod, karar, plan, metin); raporlar `raporlar/<tarih>-*.md` (commit edilmiyor).

### Bugün bitenler
- "Bu sonuç yanlış" düğmesi canlıda (201/201 test).
- PR #2: "ölçülmedi" ile "yok" ayrımı; SerpApi çökünce ölçüm "hata" kaydı.
- PR #3: elle ölçüm arka planda (202 + panel 5 sn'de bir sorgular), 10 dk takılı ölçüm temizliği, hatalı ölçüm hakka sayılmaz, bütçe ölçümden önce; haftalık seçim sadece bitti/suruyor ve çağrı başına 1 işletme (cron saatlik `17 * * * *`); karşılaştırmalar aynı aramayla; arama ölçülemediyse "sitenizi göremedik" yok; ham hata yerine bölüm adı; auth şifre hatası. Testler 217/217.
- Gerçek bir uçtan uca ölçüm henüz denenmedi (SerpApi harcar): Mert panelden "Tekrar ölç" ile denemeli.

### Claude'un yapacakları (öneri sırası, 90 için)
1. Hızlı testte ve Gemini'de uydurma ad riski: "internette arama yapmadan cevapladı" notu; yaygın adlarda iki kelime şartı (`olcum/index.ts` adGeciyor, `hizli-test/index.ts`).
2. `yanlis_bildirimleri` izinlerini daralt (Mert onayıyla migration) + günde en fazla 20 bildirim sınırı.
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
- **Edge Function deploy etmeden önce** canlıdaki sürümü (Supabase `get_edge_function`) repodakiyle karşılaştır.
- Supabase bağlayıcısı `revoke` / `drop policy` içeren migration'ı Mert yokken reddediyor; gerekmiyorsa bu satırları koyma.
- Testler: Playwright repoda kurulu değil; geçici klasöre kur, `NODE_PATH=<klasör>/node_modules node testler/calistir.js`.
- Commit kimliği yerelde ayarlı değil: `git -c user.name=Claude -c user.email=noreply@anthropic.com commit ...`
