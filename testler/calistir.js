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
    for (const s of ['index.html', 'test.html', 'giris.html', 'aydinlatma.html', 'gizlilik.html', 'kullanim-sartlari.html', 'cerez.html']) {
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
    kontrol(cihaz + ' panelde sayfa hatası yok', !hatalar.length, hatalar.join(' | '));
    await p.evaluate(() => localStorage.clear());
    await ctx.close();
  }
  await b.close(); sunucu.close();
  console.log(JSON.stringify(sonuc, null, 2));
  process.exit(sonuc.kalan.length ? 1 : 0);
})().catch((e) => { console.error(e); sunucu.close(); process.exit(2); });
