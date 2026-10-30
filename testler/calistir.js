// Görünür otomatik testleri (test ekibi ajanı her gün çalıştırır)
// Kullanım: node testler/calistir.js   (Playwright gerekir; sonuç JSON olarak yazdırılır, hata varsa çıkış kodu 1)
// Gerçek Supabase'e bağlanmaz: supabase-js yerine testler/sahte-supabase.js yüklenir.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const KOK = path.resolve(__dirname, '..');
const TUR = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };
const sunucu = http.createServer((q, r) => {
  const yol = path.join(KOK, decodeURIComponent(q.url.split('?')[0].split('#')[0]) === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0]));
  if (!yol.startsWith(KOK) || !fs.existsSync(yol) || fs.statSync(yol).isDirectory()) { r.writeHead(404); return r.end('yok'); }
  r.writeHead(200, { 'Content-Type': TUR[path.extname(yol)] || 'application/octet-stream' }); fs.createReadStream(yol).pipe(r);
}).listen(0);
const ADRES = 'http://127.0.0.1:' + sunucu.address().port;
const SAHTE = fs.readFileSync(path.join(__dirname, 'sahte-supabase.js'), 'utf8');
const sonuc = { tarih: new Date().toISOString(), gecen: [], kalan: [] };
const kontrol = (ad, ok, detay) => (ok ? sonuc.gecen.push(ad) : sonuc.kalan.push(detay ? ad + ': ' + detay : ad));

(async () => {
  const b = await chromium.launch();
  for (const [cihaz, vp] of [['masaüstü', { width: 1280, height: 900 }], ['telefon', { width: 375, height: 780 }]]) {
    const ctx = await b.newContext({ viewport: vp });
    await ctx.route('**/supabase.min.js', (r) => r.fulfill({ body: SAHTE, contentType: 'application/javascript' }));
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    const p = await ctx.newPage(); const hatalar = [];
    p.on('pageerror', (e) => hatalar.push(e.message));
    const tasma = async (ad) => { const [g, e] = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]); kontrol(cihaz + ' ' + ad + ' yatay taşma yok', g <= e, g + 'px > ' + e + 'px'); };
    // Açık sayfalar
    for (const s of ['index.html', 'test.html', 'giris.html', 'aydinlatma.html', 'gizlilik.html', 'kullanim-sartlari.html', 'cerez.html', 'cikis.html']) {
      hatalar.length = 0;
      const yanit = await p.goto(ADRES + '/' + s); await p.waitForTimeout(1200);
      kontrol(cihaz + ' ' + s + ' açılıyor', yanit && yanit.ok(), String(yanit && yanit.status()));
      kontrol(cihaz + ' ' + s + ' sayfa hatası yok', !hatalar.length, hatalar.join(' | '));
      await tasma(s);
    }
    // Panel: menü sayfaları
    hatalar.length = 0;
    await p.goto(ADRES + '/panel.html#ozet'); await p.waitForSelector('#panel:not([hidden])', { timeout: 10000 }).catch(() => {});
    kontrol(cihaz + ' panel yükleniyor', await p.isVisible('#panel'));
    for (const s of ['ozet', 'isler', 'yz', 'google', 'hesap']) {
      await p.click('#yan-menu [data-git=' + s + ']').catch(() => {});
      await p.waitForTimeout(150);
      kontrol(cihaz + ' panel ' + s + ' sayfası açılıyor', await p.isVisible('[data-sayfa=' + s + ']'));
      await tasma('panel #' + s);
    }
    // Yapay zekâ: motor motor özet (Gemini, Google Yapay Zekâ Modu, ChatGPT)
    await p.click('#yan-menu [data-git=yz]').catch(() => {}); await p.waitForTimeout(150);
    const gyz = (await p.textContent('#motor-gyz summary').catch(() => '')) || '';
    kontrol(cihaz + ' panelde Google Yapay Zekâ Modu satırı var', /Google Yapay Zekâ Modu/.test(gyz) && /2 sorunun 1 tanesinde/.test(gyz), gyz);
    await p.click('#motor-gyz > summary').catch(() => {}); await p.click('#motor-gyz .yz-cevap summary').catch(() => {}); await p.waitForTimeout(100);
    kontrol(cihaz + ' Google Yapay Zekâ Modu cevabında işletmeler ve siz işareti görünüyor', await p.isVisible('#motor-gyz .yz-isletmeler li.siz'));
    kontrol(cihaz + ' ChatGPT verisi yokken "sıradaki ölçümde" görünüyor', /sıradaki ölçümde/.test((await p.textContent('#motor-cg summary').catch(() => '')) || ''));
    await tasma('panel yapay zekâ motorları');
    // Aramalar ve tek arama sayfası
    await p.click('#yan-menu [data-git=google]');
    const satir = await p.$$('#arama-liste .arama-satir');
    kontrol(cihaz + ' aramalar listesi dolu', satir.length > 0, satir.length + ' satır');
    if (satir.length) {
      await satir[0].click(); await p.waitForFunction(() => location.hash === '#arama-0').catch(() => {}); await p.waitForTimeout(300);
      kontrol(cihaz + ' tek arama sayfası açılıyor', await p.isVisible('[data-sayfa=arama]'), await p.evaluate(() => location.hash + ' ' + [...document.querySelectorAll('[data-sayfa]')].filter((x) => !x.hidden).map((x) => x.dataset.sayfa).join(',')));
      kontrol(cihaz + ' tek arama sayfasında iş var', (await p.$$('#ar-isler .is-satir')).length > 0);
      await tasma('tek arama sayfası');
    }
    // Hesabımı sil: form açılıyor, yanlış e-postayla silmiyor
    await p.goto(ADRES + '/panel.html#hesap'); await p.waitForSelector('#panel:not([hidden])').catch(() => {});
    await p.click('#sil-ac').catch(() => {});
    kontrol(cihaz + ' hesap silme formu açılıyor', await p.isVisible('#sil-form'));
    await p.fill('#sil-onay', 'yanlis@ornek.com').catch(() => {}); await p.click('#sil-btn').catch(() => {}); await p.waitForTimeout(200);
    kontrol(cihaz + ' yanlış e-postayla silme engelleniyor', /eşleşmedi/.test((await p.textContent('#sil-durum')) || ''));
    await tasma('hesap sayfası');
    // Yaptım düğmesi
    await p.goto(ADRES + '/panel.html#isler'); await p.waitForSelector('#panel:not([hidden])').catch(() => {});
    const once = (await p.textContent('#isler-ozet')) || '';
    const dugme = await p.$('#olcum-isler .is-alt .btn-amber');
    if (dugme) { await dugme.click(); await p.waitForTimeout(400); }
    const sonra = (await p.textContent('#isler-ozet')) || '';
    kontrol(cihaz + ' Yaptım düğmesi sayacı değiştiriyor', !!dugme && once !== sonra, once + ' -> ' + sonra);
    // Hazır metin: açıklamayı yazdır
    const yazB = await p.$('#metin-isler .yaz-alt .btn-amber');
    if (yazB) { await yazB.click(); await p.waitForSelector('#metin-isler .yazilan', { timeout: 3000 }).catch(() => {}); }
    kontrol(cihaz + ' hazır metin yazılıp gösteriliyor', !!yazB && !!(await p.$('#metin-isler .yazilan')));
    kontrol(cihaz + ' sayfa işinde "metnini yazın" düğmesi var', (await p.$$('#olcum-isler .yaz-alt .btn-amber, #yz-isler .yaz-alt .btn-amber')).length > 0);
    await tasma('hazır metinler');
    // Site sağlığı: otomatik tarandı, puan ve eksik işi görünüyor
    await p.click('#yan-menu [data-git=google]').catch(() => {}); await p.waitForTimeout(200);
    kontrol(cihaz + ' site sağlığı puanı görünüyor', /62/.test((await p.textContent('#site-saglik')) || ''));
    kontrol(cihaz + ' site eksikleri İşlerim’e iş oldu', (await p.$$('#site-isler .is-satir')).length === 1);
    await tasma('site sağlığı');
    kontrol(cihaz + ' panelde sayfa hatası yok', !hatalar.length, hatalar.join(' | '));
    // Karanlık tema: düğme var, tıklayınca tema değişip kaydediliyor
    for (const s of ['index.html', 'panel.html#ozet']) {
      await p.evaluate(() => localStorage.removeItem('gorunur_tema'));
      await p.emulateMedia({ colorScheme: 'light' });
      await p.goto(ADRES + '/' + s); await p.waitForSelector('#tema-dugme', { timeout: 5000 }).catch(() => {});
      kontrol(cihaz + ' ' + s + ' tema düğmesi var', await p.isVisible('#tema-dugme'));
      const once = await p.evaluate(() => document.documentElement.dataset.tema);
      await p.click('#tema-dugme').catch(() => {});
      const sonra = await p.evaluate(() => [document.documentElement.dataset.tema, (document.getElementById('tema-dugme') || {}).getAttribute && document.getElementById('tema-dugme').getAttribute('aria-pressed'), localStorage.getItem('gorunur_tema')].join(','));
      kontrol(cihaz + ' ' + s + ' tema düğmesi karanlığa geçiriyor', once === 'acik' && sonra === 'koyu,true,koyu', once + ' -> ' + sonra);
    }
    // Cihaz karanlıkta ve elle seçim yokken sayfa koyu açılıyor, yatay taşma yok
    await p.evaluate(() => localStorage.removeItem('gorunur_tema'));
    await p.emulateMedia({ colorScheme: 'dark' });
    for (const s of ['index.html', 'test.html', 'giris.html', 'panel.html#isler']) {
      await p.goto(ADRES + '/' + s); await p.waitForTimeout(s.startsWith('panel') ? 1200 : 600);
      kontrol(cihaz + ' ' + s + ' cihaz karanlıkken koyu açılıyor', (await p.evaluate(() => document.documentElement.dataset.tema)) === 'koyu');
      await tasma(s + ' (koyu tema)');
    }
    await p.emulateMedia({ colorScheme: 'light' });
    await p.evaluate(() => localStorage.clear());
    await ctx.close();
  }
  await b.close(); sunucu.close();
  console.log(JSON.stringify(sonuc, null, 2));
  process.exit(sonuc.kalan.length ? 1 : 0);
})().catch((e) => { console.error(e); sunucu.close(); process.exit(2); });
