// İşlerim, işletmenin gerçek verisine göre mi yazılıyor (1 Kasım denetimi: bir diş kliniğine şablon işler gidiyordu).
// Anonim örnek diş kliniği verisiyle paneli açar, bütün işleri okur ve hatalı önerileri arar.
// Kullanım: NODE_PATH=<playwright klasörü>/node_modules node testler/isler-kisisel.js
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const KOK = path.resolve(__dirname, '..');
const K = (kod, tamam, detay) => ({ kod, ad: kod, tamam, detay, oneri: 'Sitenizi yapan kişiden düzeltmesini isteyin.', agirlik: 8 });
const ara = (kelime, kaynak, ek) => Object.assign({ kelime, kaynak, rehberler: [], arama_ilk3: [{ siz: false, alan: 'rakipa.com', sira: 1, baslik: 'Rakip A' }], arama_sira: null, harita_sira: null, harita_bakilan: null, yerel_kutuda: null }, ek);
const VERI = {
  isl: { id: 'x', ad: 'Örnek Diş', semt: 'Çorum', is_turu: 'Diş kliniği', site: 'https://ornekdis.com/', kurulum_bitti: true, degisiklik: null, hazir_metinler: null, anahtar_kelimeler: null, secili_rakipler: null, sektor_profili: { ad: 'diş kliniği' },
    site_saglik: { puan: 80, adres: 'https://ornekdis.com/', tarih: new Date().toISOString(), title: "Anasayfa - Örnek Diş - Çorum'da Diş Kliniği",
      kontroller: [K('baslik', true, 'başlık iyi'), K('aciklama', false, 'Açıklama: "Çorum"'), K('telefon', true, 'var'), K('yer', true, 'var'), K('resim', false, '40 resmin 40 tanesinde açıklama (alt yazısı) yok.')] },
    platformlar: { gun: '2026-11-01', tarih: new Date().toISOString(), liste: [{ ad: 'Google İşletme Profili', alan: 'google.com/maps', durum: 'var', ne_yapmali: '-' }, { ad: 'Yandex Haritalar', alan: 'yandex.com.tr/harita', durum: 'var', ne_yapmali: '-' }, { ad: 'Şikayetvar', alan: 'sikayetvar.com', durum: 'var', ne_yapmali: '-' }] },
    yorumlar: { gun: '2026-11-01', tarih: new Date().toISOString(), puan: 4.9, yorum_sayisi: 290, cevapsiz_sayi: 0, bakilan: 1, yorumlar: [{ ad: 'A.', puan: 5, metin: 'İyi', cevaplandi: true }] },
    sektor_rehberleri: [{ ad: 'Armut', alan: 'armut.com' }, { ad: 'Uydurma Sağlık', alan: 'uydurmasaglik.com' }, { ad: 'DoktorTakvimi', alan: 'doktortakvimi.com' }, { ad: 'Şikayetvar', alan: 'sikayetvar.com' }] },
  olcum: { id: 'o1', durum: 'bitti', kaynak: 'elle', baslangic: new Date().toISOString(), harita_sorgu: 'çorum diş kliniği', harita_sira: 3, arama_sorgu: 'çorum diş kliniği', arama_sira: null,
    arama_sonuclar: { konum: 'Corum,Turkiye' }, marka_arama: { sira: 1, kelime: 'Örnek Diş çorum' }, yz_gecen: 0, yz_soru_sayisi: 17, cg_soru_sayisi: 0, cg_gecen: 0, yz_cevaplar: [], gyz_cevaplar: [], cg_cevaplar: [],
    isletme_bilgi: { ad: 'Örnek Diş', puan: 4.9, yorum: 290, bulundu: true },
    harita_sonuclar: [{ sira: 1, ad: 'Rakip A', siz: false, puan: 4.9, yorum: 600, site: 'https://rakipa.com' }, { sira: 2, ad: 'Rakip B', siz: false, puan: 4.8, yorum: 300, site: null }, { sira: 3, ad: 'Örnek Diş', siz: true, puan: 4.9, yorum: 290, site: 'https://ornekdis.com' }, { sira: 4, ad: 'Rakip C', siz: false, puan: 4.7, yorum: 30, site: null }],
    kelimeler: [ara('çorum diş kliniği', 'temel', { harita_sira: 3, harita_bakilan: 20, rehberler: [{ alan: 'doktortakvimi.com', link: 'https://www.doktortakvimi.com/dis-hekimi/corum', sira: 2, baslik: 'Diş Hekimi Çorum' }] }),
      ara('çorum diş hekimi', 'oneri', { harita_sira: 4, harita_bakilan: 20 }), ara('çorum implant', 'oneri'), ara('çorum diş hastanesi', 'oneri'),
      ara('diş kliniği yakınımda', 'yakin', { rehberler: [{ alan: 'yandex.com.tr', link: 'https://yandex.com.tr/maps/kahramanmaras/dental', sira: 2, baslik: 'Diş klinikleri' }] })],
    rehber_sayfalari: [{ tur: 'rehber', alan: 'doktortakvimi.com', sira: 2, baslik: 'Diş Hekimi Çorum', kelime: 'çorum diş kliniği' }, { tur: 'rehber', alan: 'yandex.com.tr', sira: 2, baslik: 'Diş klinikleri', kelime: 'diş kliniği yakınımda' }] },
};
const sunucu = http.createServer((q, r) => {
  const yol = path.join(KOK, decodeURIComponent(q.url.split('?')[0].split('#')[0]));
  if (!yol.startsWith(KOK) || !fs.existsSync(yol) || fs.statSync(yol).isDirectory()) { r.writeHead(404); return r.end(); }
  if (path.extname(yol) === '.html') return r.end(fs.readFileSync(yol, 'utf8').replace(/ integrity="sha384-[^"]+" crossorigin="anonymous"/g, ''));
  fs.createReadStream(yol).pipe(r);
}).listen(0);
const ADRES = 'http://127.0.0.1:' + sunucu.address().port;
const sonuc = { gecen: [], kalan: [] };
const kontrol = (ad, ok, detay) => (ok ? sonuc.gecen.push(ad) : sonuc.kalan.push(detay ? ad + ': ' + String(detay).slice(0, 300) : ad));
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.route('**/assets/vendor/supabase-js-*.js', (r) => r.fulfill({ body: fs.readFileSync(path.join(__dirname, 'sahte-supabase.js'), 'utf8'), contentType: 'application/javascript' }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await ctx.addInitScript((v) => { localStorage.setItem('fake', JSON.stringify({ isl: v.isl, gecmis: [v.olcum], olcum: v.olcum })); }, VERI);
  const p = await ctx.newPage(); const hata = []; p.on('pageerror', (e) => hata.push(e.message));
  await p.goto(ADRES + '/panel.html#isler'); await p.waitForSelector('#panel:not([hidden])', { timeout: 10000 }).catch(() => {});
  await p.waitForTimeout(600); await p.click('#tum-isler-btn').catch(() => {}); await p.waitForTimeout(200);
  const isler = await p.evaluate(() => document.querySelector('[data-sayfa=isler]').innerText);
  const aramalar = [];
  for (let n = 0; n < VERI.olcum.kelimeler.length; n++) { await p.goto(ADRES + '/panel.html#arama-' + n); await p.waitForTimeout(200); aramalar.push(await p.evaluate(() => (document.querySelector('[data-sayfa=arama]') || {}).innerText || '')); }
  const hepsi = isler + '\n' + aramalar.join('\n');
  kontrol('sayfa hatası yok', !hata.length, hata.join(' / '));
  kontrol('yorum ortalaması sadece öndekilerle (600 ve 300 -> 450)', /önünüzdeki işletmelerin ortalaması 450/.test(isler), isler.match(/ortalaması \d+/));
  kontrol('cevapsız yorum yokken "cevapsız yorumlara cevap yazın" denmiyor', !/Cevapsız kalan bütün yorumlara/.test(hepsi));
  kontrol('siteye bakmadan başlık/telefon istenmiyor (site taranmış)', !/Sitenizin Google’da görünen başlığını düzeltin|Sitenizin Google açıklamasını tamamlayın/.test(hepsi));
  kontrol('siteyi yapan kişiye mesajda sahibine hitap yok', !/Sitenizi yapan kişiden|Sitenizi yapan kişiye '/.test(isler.split('Sitenizi yapan kişiye gönderilecek mesaj').slice(1).join('')));
  kontrol('yapay zekânın önerdiği alakasız siteler elendi (Armut, uydurma site)', !/Armut|uydurmasaglik/.test(isler), isler.match(/Sektörünüzün[^\n]*\n[^\n]*/));
  kontrol('zaten profili olan siteler (Şikayetvar, Yandex) "açın" listesinde yok', !/Şikayetvar\s*sikayetvar\.com/.test(isler) && /Apple Haritalar’a ekleyin/.test(isler));
  kontrol('başka şehrin rehber sayfası (Kahramanmaraş) önerilmiyor', !/kahramanmaras|Diş klinikleri\s*yandex/i.test(hepsi));
  kontrol('sağlık işletmesine "tanıtmalarını isteyin" önerisi yok', !/tanıtmalarını isteyin/.test(isler));
  kontrol('ana sayfa zaten hedefliyorsa "Çorum Diş Kliniği/Hekimi sayfası ekletin" yok', !/"Çorum Diş (Kliniği|Hekimi)" sayfası ekletin/.test(hepsi));
  kontrol('"diş hastanesi" için sayfa önerilmiyor', !/Diş Hastanesi" sayfası/.test(hepsi) && /başka türde bir kurum/.test(aramalar[3]));
  kontrol('"yakınımda" araması için iş önerilmiyor', /bulunduğu yere göre değişiyor/.test(aramalar[4]));
  kontrol('"implant" için "veriyorsanız" şartı var', /"implant" hizmetini veriyorsanız/.test(aramalar[2]) && /\(bu hizmeti veriyorsanız\)/.test(aramalar[2]));
  kontrol('"diş hekimi" için hizmet şartı yok (işin kendisi)', !/hizmetini veriyorsanız/.test(aramalar[1]));
  console.log(JSON.stringify(sonuc, null, 2));
  await b.close(); sunucu.close();
  process.exit(sonuc.kalan.length ? 1 : 0);
})();
