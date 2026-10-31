# Görünür projesi

Kullanıcı "görünür" ya da "devam" yazarsa önce bu dosyanın "Durum" bölümünü oku, kısa bir özet ver ve ne yapmak istediğini sor.

## Durum (31 Ekim 2026, öğleden önce)
- Site: https://mertozmen899-alt.github.io/gorunur/ (GitHub Pages, `main` dalından yayında)
- Supabase projesi: `drlqbwdupntqqtkmdncc`
- Son commit: `0514d68` (origin/main ile aynı, açıkta iş yok)
- 3. denetçi puanlaması yapıldı: **71/100** (yeni ölçütlerle; önceki 88 farklı ölçütlerdi). Hedef 95.
- Ayrıntılı denetim raporu: Claude hafızasında `denetim-3-puanlama.md`.

### Bugün bitenler
- "Bu sonuç yanlış" düğmesi canlıda: panelde 9 kart, `yanlis_bildirimleri` tablosu, yonetim.html'de liste, testler (201/201 geçti).
- SSL'siz siteler artık "açılmıyor" görünmüyor (zaten canlıdaydı: `80dd1aa`).

### Claude'un yapacakları (öneri sırası)
1. **"Ölçülmedi" ile "yok" ayrımı** (YÜKSEK): Haritalar sadece ilk 5 aramada ölçülüyor ama 6-10. arama sayfasında "ilk 20'de değilsiniz" yazıyor (`panel.js` ~471-473). SerpApi çökünce başarısız ölçüm "bitti" kaydediliyor (`olcum/index.ts` ~840), panel "sıranız düştü / iş işe yaramadı" diyor (`panel.js` 151-157, 343-344, 675). Ölçüm başarısızsa karşılaştırma yapma. ← **Sıradaki iş bu.**
2. **Elle ölçümü arka plana al** (YÜKSEK, olası): `olcum/index.ts:495` cevabı bekliyor, 150 sn sınırına takılabilir. `waitUntil` + panel sonucu sorgulasın; 10 dk'yı geçen "suruyor" kayıtlarını "hata" yap, günlük hakka sayma.
3. **Testler**: Deno birim testleri (ozelIp4/6, adGeciyor, aramalariSec) + Playwright: Ölç düğmesi, 503 mesajı, yarım ölçüm, 6-10. arama sayfası, hızlı test sonucu.
4. Haftalık otomatik ölçüm her çağrıda tek işletme ölçsün; sıra seçimi sadece `durum='bitti'` kayıtlara baksın (`olcum/index.ts` 453-466).
5. "N sıra yükseldiniz" hep aynı temel aramayı karşılaştırsın (`panel.js` 407, 675).
6. Hızlı testte "internette arama yapmadan cevapladı" notu; yaygın işletme adlarında iki kelime şartı (`olcum/index.ts` 278-287).
7. Ham İngilizce hata mesajlarını Türkçeye çevir (`panel.js:704`, `olcum/index.ts` 589, 644); `auth.js:17` "6 karakter" çevirisi "8" diyor, düzelt; CSP meta etiketi ekle.
8. `yanlis_bildirimleri` izinlerini daralt (migration dosyasındaki revoke/grant satırları, Mert onayıyla) + günde en fazla 20 bildirim sınırı.
9. Yönetim sayfasına SerpApi bütçe sayaçları ve takılı ölçüm sayısı.
10. Ertelenenler: aylık "sizi koruduk" raporu ve alarmlar, Atlas köprüsü, gerçek işletmelerle "gizli müşteri" kontrolü, ajan görev metinlerini güncelleme (Mert onayı gerekli).

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
