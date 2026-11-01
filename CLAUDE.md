# Norevo projesi (eski adÄ±: GÃ¶rÃ¼nÃ¼r)

KullanÄ±cÄ± "norevo", "gÃ¶rÃ¼nÃ¼r" ya da "devam" yazarsa Ã¶nce bu dosyanÄ±n "Durum" bÃ¶lÃ¼mÃ¼nÃ¼ oku, kÄ±sa bir Ã¶zet ver ve ne yapmak istediÄŸini sor.

## Durum (31 Ekim 2026, Ã¶ÄŸle)
- **Proje klasÃ¶rÃ¼: `E:\Claude Code\norevo`** (1 KasÄ±m: `norevo\gorunur` iÃ§eriÄŸi bir Ã¼st klasÃ¶re taÅŸÄ±ndÄ±; Ã¶nceki yol `E:\Claude Code\norevo\gorunur`). C: kopyasÄ± (`C:\Users\Mierd\gorunur`) eski, Mert onaylayÄ±nca silinecek. Claude hafÄ±zasÄ±: `C:\Users\Mierd\.claude\projects\E--Claude-Code-norevo\memory\`.
- Site: https://mertozmen899-alt.github.io/norevo/ (GitHub Pages, `main` dalÄ±ndan yayÄ±nda; depo adÄ± `mertozmen899-alt/norevo`, eski /gorunur adresi 404)
- Supabase projesi: `drlqbwdupntqqtkmdncc`
- Son yayÄ±n (1 KasÄ±m Ã¶ÄŸle): `39de7a5` ana sayfa sadeleÅŸti (tasarÄ±m denetimi), `c346870` mÃ¼ÅŸteri testi dÃ¼zeltmeleri (alakasÄ±z aramalar, Gemini uydurma adlarÄ±, eski "YaptÄ±m" kayÄ±tlarÄ±, tek yapay zekÃ¢ oranÄ±, site iÅŸleri); `d61dc4a` "YanlÄ±ÅŸ mÄ±?" yapay zekÃ¢ kontrolÃ¼ + tek dÃ¼zeltme kuralÄ±; `olcum` edge function sÃ¼rÃ¼m 35, `yardimci` sÃ¼rÃ¼m 12 (canlÄ± = repo). Raporlar: `raporlar/2026-11-01-tasarim.md`, `raporlar/2026-11-01-musteri-testi.md` (41 bulgu; 5 yÃ¼ksek veri sorunu Ã§Ã¶zÃ¼ldÃ¼, kalanlar raporda). Rapor sayfasÄ±: https://claude.ai/artifact/BtKqPL1sCUGKw67RttnidN. Bilerek kalan eski adlar: `x-gorunur-cron`, `gorunur-tuz`, keystore adlarÄ±, `com.gorunur.app`, klasÃ¶r adÄ±.
- 3. denetÃ§i puanlamasÄ±: **71/100**. Mert kararÄ±: hukuk iÅŸleri ilk gerÃ§ek mÃ¼ÅŸteriye kadar ertelendi, ÅŸimdilik hedef **90**. Tahmini ÅŸu an ~85-87.
- AyrÄ±ntÄ±lÄ± denetim raporu: Claude hafÄ±zasÄ±nda `denetim-3-puanlama.md`.
- Her gÃ¼n 18:00'de 4 zamanlanmÄ±ÅŸ denetÃ§i gÃ¶revi Ã§alÄ±ÅŸÄ±yor (kod, karar, plan, metin); raporlar `raporlar/<tarih>-*.md` (commit edilmiyor).

### BugÃ¼n bitenler
- "Bu sonuÃ§ yanlÄ±ÅŸ" dÃ¼ÄŸmesi canlÄ±da (201/201 test).
- PR #2: "Ã¶lÃ§Ã¼lmedi" ile "yok" ayrÄ±mÄ±; SerpApi Ã§Ã¶kÃ¼nce Ã¶lÃ§Ã¼m "hata" kaydÄ±.
- PR #3: elle Ã¶lÃ§Ã¼m arka planda (202 + panel 5 sn'de bir sorgular), 10 dk takÄ±lÄ± Ã¶lÃ§Ã¼m temizliÄŸi, hatalÄ± Ã¶lÃ§Ã¼m hakka sayÄ±lmaz, bÃ¼tÃ§e Ã¶lÃ§Ã¼mden Ã¶nce; haftalÄ±k seÃ§im sadece bitti/suruyor ve Ã§aÄŸrÄ± baÅŸÄ±na 1 iÅŸletme (cron saatlik `17 * * * *`); karÅŸÄ±laÅŸtÄ±rmalar aynÄ± aramayla; arama Ã¶lÃ§Ã¼lemediyse "sitenizi gÃ¶remedik" yok; ham hata yerine bÃ¶lÃ¼m adÄ±; auth ÅŸifre hatasÄ±. Testler 217/217.
- GerÃ§ek bir uÃ§tan uca Ã¶lÃ§Ã¼m henÃ¼z denenmedi (SerpApi harcar): Mert panelden "Tekrar Ã¶lÃ§" ile denemeli.

### Claude'un yapacaklarÄ± (Ã¶neri sÄ±rasÄ±, 90 iÃ§in)
1. ~~Uydurma ad riski~~ (1 KasÄ±m): "internete bakmadan" notu zaten `c346870`'de vardÄ±; yaygÄ±n ad kuralÄ± (`YAYGIN` listesi: "GÃ¼neÅŸ DiÅŸ" artÄ±k "GÃ¼neÅŸ KuafÃ¶r" ile eÅŸleÅŸmez) `olcum` ve `yardimci` adGeciyor'a eklendi, test `testler/ad-geciyor.js` (10/10). **CanlÄ±da** (Mert yÃ¼kledi): `olcum` v34, `yardimci` v11 (canlÄ± = repo). CLI giriÅŸi yapÄ±ldÄ±; yÃ¼kleme komutu proje klasÃ¶rÃ¼nden Ã§alÄ±ÅŸmalÄ±: `npx supabase functions deploy <ad> --project-ref drlqbwdupntqqtkmdncc --no-verify-jwt`.
2. **"YanlÄ±ÅŸ mÄ±?" yapay zekÃ¢ kontrolÃ¼** (1 KasÄ±m, CANLIDA `d61dc4a`; gerÃ§ek Gemini cevabÄ±yla henÃ¼z denenmedi, Mert panelden denemeli): panel bildirimi `yardimci` `islem:'yanlis'`e gÃ¶nderir; Gemini bÃ¶lÃ¼mÃ¼n kayÄ±tlÄ± verisine bakÄ±p karar (hata/dogru/belirsiz) + aÃ§Ä±klama verir, cevap saÄŸ altta sohbet balonunda. Hata/belirsizse site yeniden taranÄ±r ya da elle Ã¶lÃ§Ã¼m hakkÄ± iade edilir (`olcumler.hak_iade`, gÃ¼nde en fazla 2). GÃ¼nde 10 bildirim (`kullanim_harca` 'yanlis'). Yorum yazan adlarÄ± Gemini'ye gÃ¶nderilmez. Migration `20261101_yanlis_yapay_zeka.sql` uygulandÄ±, `olcum` v35 + `yardimci` v12 yÃ¼klendi. Kalan: konuÅŸma sayfa yenilenince kayboluyor; istemcinin doÄŸrudan insert izni (`revoke`, Mert onayÄ±).
   **Tek dÃ¼zeltme kuralÄ±** (Mert kararÄ± 1 KasÄ±m): kurulumdan sonra ad/semt/iÅŸ tÃ¼rÃ¼nde Ã¶mÃ¼r boyu 1 kÃ¼Ã§Ã¼k dÃ¼zeltme (yazÄ±m hatasÄ±, ek kelime, aynÄ± il, iÅŸ tÃ¼rÃ¼nde ortak kelime); baÅŸka iÅŸletmeye/sektÃ¶re geÃ§iÅŸi sadece yÃ¶netici yapar; `kurulum_bitti` geri alÄ±namaz. Migration `20261101_tek_duzeltme.sql` UYGULANDI (20 Ã¶rnek + tetikleyici denemesi geÃ§ti); kurulum sayfasÄ±nda not + kilit ve TÃ¼rkÃ§e hata mesajÄ± canlÄ±da. YÃ¶netici muafiyeti oturumla denenmedi.
3. YÃ¶netim sayfasÄ±na SerpApi bÃ¼tÃ§e sayaÃ§larÄ± ve takÄ±lÄ± Ã¶lÃ§Ã¼m sayÄ±sÄ±.
   **Maliyet raporu** (1 KasÄ±m): `raporlar/2026-11-01-maliyet-kar.md`, sayfa https://claude.ai/artifact/RJ2qpvhT36skYYEog14p3i. Asgari Ã¼cret iÃ§in ~62 mÃ¼ÅŸteri (690/1.290/4.490 TL). Elle Ã¶lÃ§Ã¼m gÃ¼nlÃ¼k 3 yerine **aylÄ±k 8** (`AYLIK_OLCUM_HAKKI`, TÃ¼rkiye takvim ayÄ±) yapÄ±ldÄ±: kodda hazÄ±r, `olcum` + `yardimci` deploy ve push bekliyor. Paketler kodda yok (paket baÅŸÄ±na hak 2/8/12 sonra). Rapordaki diÄŸer iÅŸler: site Cloudflare Pages'e (GitHub Pages ticari SaaS yasak), Gemini Ã¼cretli katman + model adÄ±nÄ± sabitle, norevo.com dolu.
4. Deno birim testleri (fonksiyonlarÄ± ayrÄ± modÃ¼le almak gerekir) ve hÄ±zlÄ± test sonucu iÃ§in Playwright testi.
5. DNS rebinding (Ã§Ã¶zÃ¼mle ile fetch arasÄ±), CSP (satÄ±r iÃ§i kod yÃ¼zÃ¼nden dikkatli).
6. Ertelenenler: aylÄ±k "sizi koruduk" raporu ve alarmlar, Atlas kÃ¶prÃ¼sÃ¼, gerÃ§ek iÅŸletmelerle "gizli mÃ¼ÅŸteri" kontrolÃ¼, ajan gÃ¶rev metinlerini gÃ¼ncelleme (Mert onayÄ± gerekli).

### Mert'in yapacaklarÄ±
- **HukukÃ§u**: yasal sayfalarda (aydinlatma, gizlilik, cerez, kullanim-sartlari) canlÄ±da "Taslak, yayÄ±nlanmamalÄ±dÄ±r" yazÄ±yor; yurt dÄ±ÅŸÄ± aktarÄ±m dayanaÄŸÄ± ve sorumluluk sÄ±nÄ±rÄ± boÅŸ. Bu KRÄ°TÄ°K, ilk mÃ¼ÅŸteriden Ã¶nce ÅŸart. KayÄ±tta yurt dÄ±ÅŸÄ± aktarÄ±m iÃ§in ayrÄ± bilgilendirme/onay gerekebilir.
- **SerpApi kapasitesi**: varsayÄ±lan ayarlarla gÃ¼nde ~1 tam Ã¶lÃ§Ã¼m, ayda ~230 arama (2-3 iÅŸletmeye yeter). Plan bÃ¼yÃ¼tme kararÄ± (Ã¶demeli, Mert onaylar).
- BaÅŸka bir e-postayla kayÄ±t denemesi (onay e-postasÄ± geliyor mu).
- Supabase â†’ Edge Functions â†’ Secrets: `GMAIL_ADRES`, `GMAIL_UYGULAMA_SIFRESI`.
- Ã‡orum'dan 10-15 farklÄ± tÃ¼rde gerÃ§ek iÅŸletme listesi.

## Kurallar
- Mert teknik deÄŸil. AdÄ±mlarÄ± dÃ¼z TÃ¼rkÃ§eyle, kopyalanabilir komutlarla anlat.
- Commit ve push'u Mert istemeden yapma.
- Ã–demeli servisleri (SerpApi Ã¼cretli plan, alan adÄ±, ÅŸirket/Ã¶deme) Mert onaylamadan alma.
- Her oturum sonunda Durum bÃ¶lÃ¼mÃ¼nÃ¼ gÃ¼ncelle.
- **Ä°ÅŸe baÅŸlamadan Ã¶nce `git fetch` ve `git log main..origin/main`**: baÅŸka oturumlar origin/main'e push ediyor; 31 Ekim'de yerel kopya 6 commit gerideydi.
- **Adres, ad ya da ayar deÄŸiÅŸtiren oturum aynÄ± iÅŸte Durum'u gÃ¼nceller** (site adresi, depo adÄ±, alan adÄ±, Supabase/GitHub ayarÄ±, klasÃ¶r yeri). 1 KasÄ±m'da depo `norevo` oldu ama Durum'da eski `/gorunur` adresi kaldÄ±; baÅŸka oturum eski adresi kontrol edip vakit kaybetti.
- **Ä°ÅŸe baÅŸlarken son commit baÅŸlÄ±klarÄ±nÄ± tara** (`git log --oneline -30`): "adres", "ad deÄŸiÅŸti", "taÅŸÄ±ndÄ±", "marka", "depo" geÃ§en bir commit varsa Ã¶nce onu oku; Durum'daki bilgi ondan eskiyse Durum'u dÃ¼zelt.
- **Edge Function deploy etmeden Ã¶nce** canlÄ±daki sÃ¼rÃ¼mÃ¼ (Supabase `get_edge_function`) repodakiyle karÅŸÄ±laÅŸtÄ±r.
- Supabase baÄŸlayÄ±cÄ±sÄ± `revoke` / `drop policy` iÃ§eren migration'Ä± Mert yokken reddediyor; gerekmiyorsa bu satÄ±rlarÄ± koyma.
- Testler: Playwright repoda kurulu deÄŸil; geÃ§ici klasÃ¶re kur, `NODE_PATH=<klasÃ¶r>/node_modules node testler/calistir.js`.
- Commit kimliÄŸi yerelde ayarlÄ± deÄŸil: `git -c user.name=Claude -c user.email=noreply@anthropic.com commit ...`
