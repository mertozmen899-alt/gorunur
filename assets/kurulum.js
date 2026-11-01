// Norevo: 5 adımlı kurulum sihirbazı. Her adımda kaydeder, yarıda kalan yerden devam eder.
(function () {
  'use strict';
  var A = window.NorevoAuth, V = window.NorevoVeri;
  var $ = function (id) { return document.getElementById(id); };
  var bolumler = document.querySelectorAll('[data-adim]');
  var d = { adim: 1, mod: [], semt: '', ad: '', is: '', isSecili: false, site: '', instagram: '', google: '', whatsapp: '', siklik: 'haftalik' };

  // Hızlı testi dolduranın cevaplarını al
  function testCevaplari() {
    try { return JSON.parse(sessionStorage.getItem('norevo_test') || 'null'); } catch (e) { return null; }
  }

  function doldur(i) {
    var t = testCevaplari();
    d.mod = (i && i.calisma_sekli) || (t && t.mod) || ['gelir'];
    d.semt = (i && i.semt) || (t && t.sehir) || '';
    d.ad = (i && i.ad) || '';
    d.is = (i && i.is_turu) || (t && t.is) || '';
    d.isSecili = !!d.is;
    d.site = (i && i.site) || ''; d.instagram = (i && i.instagram) || ''; d.google = (i && i.google_profil) || '';
    d.whatsapp = (i && i.whatsapp) || ''; d.siklik = (i && i.mesaj_sikligi) || 'haftalik';
    // Düzenleme için ?adim=N ile gelinebilir
    var p = parseInt(new URLSearchParams(location.search).get('adim'), 10);
    d.adim = p >= 1 && p <= 5 ? p : Math.min(5, ((i && i.kurulum_adim) || 0) + 1);
    if (i && i.kurulum_bitti && !p) d.adim = 1;

    document.querySelectorAll('.secenek').forEach(function (b) { b.setAttribute('aria-pressed', d.mod.indexOf(b.dataset.mod) >= 0 ? 'true' : 'false'); });
    $('semt').value = d.semt; $('ad').value = d.ad; $('is').value = d.is;
    if (d.isSecili) { $('is-secili').hidden = false; $('is-secili').textContent = '✓ ' + d.is; }
    $('site').value = d.site; $('instagram').value = d.instagram; $('google').value = d.google; $('whatsapp').value = d.whatsapp;
    var r = document.querySelector('input[name=siklik][value="' + d.siklik + '"]'); if (r) r.checked = true;
    // Kurulumdan sonra ad, semt ve iş türünde tek küçük düzeltme (kuralı veri tabanı uygular: isletme_degisti_temizle)
    if (i && i.kurulum_bitti) {
      var kullandi = !!(i.degisiklik && i.degisiklik.duzeltme);
      document.querySelectorAll('.duzeltme-not').forEach(function (p) {
        p.hidden = false;
        p.textContent = kullandi
          ? 'İşletme bilgilerinizi bir kez düzelttiniz, artık değiştirilemez. Bir hata varsa bize WhatsApp\'tan yazın.'
          : 'Adınızda, semtinizde ve iş türünüzde bir kez küçük düzeltme yapabilirsiniz (yazım hatası, eksik kelime). Başka bir işletmeye geçmek için bize WhatsApp\'tan yazın.';
      });
      if (kullandi) ['semt', 'ad', 'is'].forEach(function (id) { $(id).readOnly = true; });
    }
  }

  function gecerli() {
    if (d.adim === 1) return d.mod.length > 0;
    if (d.adim === 2) return d.semt.trim().length > 1;
    if (d.adim === 3) return d.ad.trim().length > 1 && d.isSecili && d.is.trim().length > 1;
    return true;
  }

  function goster() {
    bolumler.forEach(function (s) { s.hidden = +s.dataset.adim !== d.adim; });
    $('adim-etiket').textContent = 'Adım ' + d.adim + ' / 5';
    $('ilerleme').style.width = (d.adim * 20) + '%';
    document.querySelector('.ilerleme').setAttribute('aria-valuenow', d.adim * 20);
    $('geri').style.visibility = d.adim === 1 ? 'hidden' : 'visible';
    $('ileri').textContent = d.adim === 5 ? 'Kurulumu bitir' : 'Devam';
    $('ileri').disabled = !gecerli();
    var bos = !$('site').value.trim() && !$('instagram').value.trim() && !$('google').value.trim();
    $('atla').hidden = !(d.adim === 4 && bos);
    $('ileri').hidden = d.adim === 4 && bos;
    $('turkiye').hidden = !(d.mod.length === 1 && d.mod[0] === 'online');
    $('uyari').textContent = '';
  }
  function odakla() { var h = document.querySelector('[data-adim="' + d.adim + '"] h1'); if (h) h.focus(); }

  function temizUrl(x) {
    x = (x || '').trim(); if (!x) return null;
    // Yanlışlıkla iki kez yazılan başlığı temizle (örn. https://hhttps://site.com)
    var m = x.match(/^.*?h*ttps?:\/\/+(?=[^\/]*\.)/i); if (m) x = x.slice(m[0].length);
    x = x.replace(/^(h*ttps?:\/*)+/i, '');
    if (!/^https?:\/\//i.test(x) && /\./.test(x)) x = 'https://' + x;
    // Nokta içermeyen ya da http ile başlamayan yazı adres değildir: kaydetme
    if (!/^https?:\/\/[^\/\s]+\.[^\/\s]+/i.test(x)) return null;
    return x.slice(0, 500);
  }

  function kaydet(bitti) {
    var alan = { kurulum_adim: Math.max(d.adim, 0), onay_metni_surumu: 'v1' };
    if (d.adim >= 1) alan.calisma_sekli = d.mod.slice(0, 3);
    if (d.adim >= 2) alan.semt = d.semt.trim().slice(0, 120);
    if (d.adim >= 3) { alan.ad = d.ad.trim().slice(0, 120); alan.is_turu = d.is.trim().slice(0, 120); }
    if (d.adim >= 4) { alan.site = temizUrl(d.site); alan.instagram = (d.instagram || '').trim().slice(0, 300) || null; alan.google_profil = temizUrl(d.google); }
    if (d.adim >= 5) { alan.whatsapp = (d.whatsapp || '').replace(/[^\d+]/g, '').slice(0, 20) || null; alan.mesaj_sikligi = d.siklik; }
    if (bitti) alan.kurulum_bitti = true;
    return A.isletmeKaydet(alan);
  }

  function ileri() {
    if (!gecerli()) return;
    if (d.adim === 5 && d.whatsapp.trim() && d.whatsapp.replace(/\D/g, '').length < 10) {
      $('uyari').textContent = 'WhatsApp numarasını kontrol edin ya da boş bırakın.'; return;
    }
    $('ileri').disabled = true; $('atla').disabled = true;
    kaydet(d.adim === 5).then(function () {
      if (d.adim === 5) { try { sessionStorage.removeItem('norevo_test'); } catch (e) {} location.replace(A.KOK + 'panel.html'); return; }
      d.adim++; goster(); odakla();
    }).catch(function (err) {
      $('uyari').textContent = A.hataMetni(err) + ' Bilgileriniz kaydedilemedi.';
    }).then(function () { $('atla').disabled = false; if (d.adim <= 5) $('ileri').disabled = !gecerli(); });
  }

  // 1. adım
  document.querySelectorAll('.secenek').forEach(function (b) {
    b.addEventListener('click', function () {
      var m = b.dataset.mod, i = d.mod.indexOf(m);
      if (i >= 0) d.mod.splice(i, 1); else d.mod.push(m);
      b.setAttribute('aria-pressed', i >= 0 ? 'false' : 'true');
      goster();
    });
  });

  // Öneri listesi kurucu
  function oneriler(kutu, liste, sec, ekle) {
    kutu.innerHTML = '';
    liste.forEach(function (o) {
      var b = document.createElement('button'); b.type = 'button';
      var s = document.createElement('b'); s.textContent = o.ad || o; b.appendChild(s);
      if (o.ipucu) { var k = document.createElement('small'); k.textContent = o.ipucu; b.appendChild(k); }
      b.addEventListener('click', function () { sec(o.ad || o); });
      kutu.appendChild(b);
    });
    if (ekle) ekle(kutu);
    kutu.hidden = !kutu.children.length;
  }

  // 2. adım
  $('semt').addEventListener('input', function () {
    d.semt = this.value;
    oneriler($('semt-oneri'), V.yerAra(this.value), function (y) { $('semt').value = y; d.semt = y; $('semt-oneri').hidden = true; goster(); });
    goster();
  });
  $('turkiye').addEventListener('click', function () { $('semt').value = 'Türkiye geneli'; d.semt = 'Türkiye geneli'; $('semt-oneri').hidden = true; goster(); });

  // 3. adım
  // İngilizce yazılan iş türleri (Google'dan kopyalanan kategori adları): Türkçesini önerir
  var INGILIZCE = { 'dentist': 'Diş hekimi', 'dental clinic': 'Diş kliniği', 'orthodontist': 'Ortodontist', 'hairdresser': 'Kuaför', 'hair salon': 'Kuaför', 'barber': 'Berber', 'barber shop': 'Berber',
    'veterinarian': 'Veteriner kliniği', 'vet': 'Veteriner kliniği', 'veterinary clinic': 'Veteriner kliniği', 'restaurant': 'Restoran', 'cafe': 'Kafe', 'coffee shop': 'Kafe', 'furniture store': 'Mobilya mağazası',
    'lawyer': 'Avukatlık bürosu', 'law firm': 'Avukatlık bürosu', 'real estate agency': 'Emlak ofisi', 'real estate agent': 'Emlak ofisi', 'bakery': 'Pastane', 'pastry shop': 'Pastane', 'plumber': 'Tesisatçı',
    'electrician': 'Elektrikçi', 'car repair': 'Oto tamir', 'auto repair shop': 'Oto tamir', 'beauty salon': 'Güzellik salonu', 'physiotherapist': 'Fizyoterapi', 'physical therapist': 'Fizyoterapi',
    'pet store': 'Pet shop', 'pharmacy': 'Eczane', 'gym': 'Spor salonu', 'hotel': 'Otel', 'florist': 'Çiçekçi', 'optician': 'Optik', 'wedding venue': 'Düğün salonu', 'moving company': 'Nakliyat',
    'tutor': 'Özel ders', 'appliance repair service': 'Küçük ev aletleri tamiri', 'doctor': 'Doktor', 'clinic': 'Klinik', 'accountant': 'Muhasebeci', 'photographer': 'Fotoğrafçı', 'tailor': 'Terzi' };
  $('ad').addEventListener('input', function () { d.ad = this.value; goster(); });
  function isSec(ad) { d.is = ad; d.isSecili = true; $('is').value = ad; $('is-oneri').hidden = true; $('is-secili').hidden = false; $('is-secili').textContent = '✓ ' + ad; goster(); }
  $('is').addEventListener('input', function () {
    var deger = this.value; d.is = deger; d.isSecili = false; $('is-secili').hidden = true;
    var tr = INGILIZCE[deger.trim().toLowerCase().replace(/\s+/g, ' ')];
    var liste = V.isAra(deger);
    if (tr) liste = [{ ad: tr, ipucu: 'Bunu mu demek istediniz? Müşterileriniz Türkçe arıyor.' }].concat(liste.filter(function (o) { return (o.ad || o) !== tr; }));
    oneriler($('is-oneri'), liste, isSec, function (kutu) {
      if (deger.trim().length < 2) return;
      var k = document.createElement('button'); k.type = 'button'; k.className = 'kendim';
      var b = document.createElement('b'); b.textContent = 'Listede yok, kendim yazayım';
      var s = document.createElement('small'); s.textContent = 'Yazdığınızı aynen kullanırız: "' + deger.trim() + '"';
      k.appendChild(b); k.appendChild(s);
      k.addEventListener('click', function () { isSec(deger.trim().slice(0, 120)); });
      kutu.appendChild(k);
    });
    goster();
  });

  // 4. ve 5. adım
  ['site', 'instagram', 'google', 'whatsapp'].forEach(function (id) { $(id).addEventListener('input', function () { d[id] = this.value; goster(); }); });
  document.querySelectorAll('input[name=siklik]').forEach(function (r) { r.addEventListener('change', function () { d.siklik = this.value; }); });

  $('ileri').addEventListener('click', ileri);
  $('atla').addEventListener('click', ileri);
  $('geri').addEventListener('click', function () { if (d.adim > 1) { d.adim--; goster(); odakla(); } });
  $('cikis').addEventListener('click', function () { A.cikis(); });

  A.girisGerekli().then(function () { return A.isletmeGetir(); }).then(function (i) {
    doldur(i);
    $('yukleniyor').hidden = true; $('kurulum').hidden = false;
    goster(); odakla();
  }).catch(function (err) {
    if (err && err.message === 'oturum-yok') return;
    $('yukleniyor').textContent = A.hataMetni(err);
  });
})();
