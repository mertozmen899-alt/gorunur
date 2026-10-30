// Görünür: 3 soruluk hızlı test
(function () {
  'use strict';
  var durum = { adim: 1, mod: ['gelir'], sehir: '', sehirSecili: false, is: '', isSecili: false };

  var YERLER = ['Kadıköy, İstanbul', 'Kartal, İstanbul', 'Kağıthane, İstanbul', 'Beşiktaş, İstanbul', 'Üsküdar, İstanbul', 'Bakırköy, İstanbul', 'Şişli, İstanbul', 'Ataşehir, İstanbul', 'Maltepe, İstanbul', 'Beylikdüzü, İstanbul', 'Çankaya, Ankara', 'Keçiören, Ankara', 'Yenimahalle, Ankara', 'Karşıyaka, İzmir', 'Bornova, İzmir', 'Konak, İzmir', 'Nilüfer, Bursa', 'Osmangazi, Bursa', 'Muratpaşa, Antalya', 'Konyaaltı, Antalya', 'Seyhan, Adana', 'Çukurova, Adana', 'Selçuklu, Konya', 'Tepebaşı, Eskişehir', 'Odunpazarı, Eskişehir', 'Melikgazi, Kayseri', 'Ortahisar, Trabzon', 'Şahinbey, Gaziantep', 'İzmit, Kocaeli', 'Atakum, Samsun', 'Adana', 'Ankara', 'Antalya', 'Bursa', 'Denizli', 'Diyarbakır', 'Erzurum', 'Eskişehir', 'Gaziantep', 'Hatay', 'İstanbul', 'İzmir', 'Kayseri', 'Kocaeli', 'Konya', 'Malatya', 'Manisa', 'Mersin', 'Muğla', 'Sakarya', 'Samsun', 'Tekirdağ', 'Trabzon', 'Van', 'Bitlis'];

  var ISLER = [
    ['Veteriner kliniği', ['veteriner', 'hayvan hastanesi', 'vet']], ['Pet kuaförü', ['pet kuafor', 'kopek tiras', 'kedi tiras']], ['Pet shop', ['evcil hayvan dukkani', 'mama']],
    ['Kuaför', ['berber', 'sac tasarim', 'sac kesim']], ['Güzellik salonu', ['guzellik merkezi', 'cilt bakimi', 'lazer epilasyon']], ['Diş kliniği', ['dis hekimi', 'disci', 'agiz ve dis']],
    ['Fizyoterapi', ['fizik tedavi', 'fizyoterapist']], ['Psikolog', ['terapist', 'psikolojik danisman']], ['Diyetisyen', ['beslenme uzmani']],
    ['Restoran', ['lokanta', 'yemek']], ['Kafe', ['kahveci', 'cafe']], ['Pastane', ['tatlici', 'firin']],
    ['Emlak ofisi', ['emlakci', 'gayrimenkul']], ['Avukatlık bürosu', ['avukat', 'hukuk burosu']], ['Mali müşavir', ['muhasebeci', 'smmm']], ['Sigorta acentesi', ['sigortaci']],
    ['Oto servis', ['tamirci', 'oto tamir', 'sanayi']], ['Oto yıkama', ['arac yikama']], ['Kombi servisi', ['kombi tamiri', 'kalorifer']], ['Elektrikçi', ['elektrik tamiri']], ['Tesisatçı', ['su tesisati', 'tikaniklik']],
    ['Yabancı dil kursu', ['ingilizce kursu', 'dil okulu']], ['Dershane', ['etut merkezi', 'kurs']], ['Spor salonu', ['gym', 'fitness']], ['Pilates stüdyosu', ['pilates', 'yoga']],
    ['Halı yıkama', ['hali yikama', 'koltuk yikama']], ['Nakliyat', ['evden eve', 'tasimacilik']], ['Temizlik şirketi', ['ev temizligi', 'ofis temizligi']], ['Mimarlık ofisi', ['mimar', 'ic mimar']], ['Fotoğrafçı', ['dugun fotografcisi', 'fotograf studyosu']]
  ];

  function n(x) { return (x || '').toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').trim(); }
  function $(id) { return document.getElementById(id); }

  function guncelle() {
    for (var i = 1; i <= 5; i++) $('s' + i).hidden = durum.adim !== i;
    $('adim-etiket').textContent = durum.adim < 4 ? 'Soru ' + durum.adim + ' / 3' : (durum.adim === 4 ? 'Hazırlanıyor' : 'Hazır');
    var yuzde = Math.min(100, durum.adim * 20);
    $('ilerleme').style.width = yuzde + '%';
    document.querySelector('.ilerleme').setAttribute('aria-valuenow', yuzde);
    $('gezinme').hidden = durum.adim > 3;
    $('geri').style.visibility = durum.adim === 1 ? 'hidden' : 'visible';
    $('ileri').textContent = durum.adim === 3 ? 'Göster' : 'Devam';
    $('ileri').disabled = !gecerli();
    $('turkiye').hidden = !(durum.mod.length === 1 && durum.mod[0] === 'online');
  }

  function gecerli() {
    if (durum.adim === 1) return durum.mod.length > 0;
    if (durum.adim === 2) return durum.sehir.trim().length > 1;
    if (durum.adim === 3) return durum.isSecili && durum.is.trim().length > 1;
    return false;
  }

  function odakla() { var h = $('s' + durum.adim).querySelector('h1'); if (h) h.focus(); }

  // 1. soru
  document.querySelectorAll('.secenek').forEach(function (b) {
    b.addEventListener('click', function () {
      var m = b.getAttribute('data-mod'), i = durum.mod.indexOf(m);
      if (i >= 0) durum.mod.splice(i, 1); else durum.mod.push(m);
      b.setAttribute('aria-pressed', i >= 0 ? 'false' : 'true');
      guncelle();
    });
  });

  // 2. soru
  var sehir = $('sehir'), sehirOneri = $('sehir-oneri');
  sehir.addEventListener('input', function () {
    durum.sehir = sehir.value; durum.sehirSecili = false;
    var q = n(sehir.value);
    sehirOneri.innerHTML = '';
    if (q.length >= 2) {
      YERLER.filter(function (y) { return n(y).indexOf(q) >= 0; }).slice(0, 6).forEach(function (y) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = y;
        b.addEventListener('click', function () { sehir.value = y; durum.sehir = y; durum.sehirSecili = true; sehirOneri.hidden = true; guncelle(); });
        sehirOneri.appendChild(b);
      });
    }
    sehirOneri.hidden = !sehirOneri.children.length;
    guncelle();
  });
  $('turkiye').addEventListener('click', function () { sehir.value = 'Türkiye geneli'; durum.sehir = 'Türkiye geneli'; durum.sehirSecili = true; sehirOneri.hidden = true; guncelle(); });

  // 3. soru
  var is = $('is'), isOneri = $('is-oneri'), isSecili = $('is-secili');
  function isSec(ad) {
    durum.is = ad; durum.isSecili = true; is.value = ad;
    isOneri.hidden = true; isSecili.hidden = false; isSecili.textContent = '✓ ' + ad;
    guncelle();
  }
  is.addEventListener('input', function () {
    durum.is = is.value; durum.isSecili = false; isSecili.hidden = true;
    var q = n(is.value);
    isOneri.innerHTML = '';
    if (q.length >= 2) {
      ISLER.filter(function (j) { return n(j[0]).indexOf(q) >= 0 || j[1].some(function (a) { return a.indexOf(q) >= 0; }); }).slice(0, 5).forEach(function (j) {
        var es = j[1].filter(function (a) { return a.indexOf(q) >= 0; })[0];
        var b = document.createElement('button'); b.type = 'button';
        var s1 = document.createElement('b'); s1.textContent = j[0]; b.appendChild(s1);
        if (es && n(j[0]).indexOf(q) < 0) { var s2 = document.createElement('small'); s2.textContent = '"' + es + '" olarak da aranır'; b.appendChild(s2); }
        b.addEventListener('click', function () { isSec(j[0]); });
        isOneri.appendChild(b);
      });
      var k = document.createElement('button'); k.type = 'button'; k.className = 'kendim';
      var kb = document.createElement('b'); kb.textContent = 'Listede yok, kendim yazayım';
      var ks = document.createElement('small'); ks.textContent = 'Yazdığınızı aynen kullanırız: "' + is.value.trim() + '"';
      k.appendChild(kb); k.appendChild(ks);
      k.addEventListener('click', function () { isSec(is.value.trim().slice(0, 120)); });
      isOneri.appendChild(k);
    }
    isOneri.hidden = !isOneri.children.length;
    guncelle();
  });

  // Gezinme
  $('geri').addEventListener('click', function () { if (durum.adim > 1) { durum.adim--; guncelle(); odakla(); } });
  $('ileri').addEventListener('click', function () {
    if (!gecerli()) return;
    durum.adim++;
    guncelle(); odakla();
    if (durum.adim === 4) hazirla();
  });

  // Gerçek sonuç: Google Haritalar ilk 20 + yapay zekânın önerdikleri (hizli-test fonksiyonu)
  var OLCUM_ADRES = 'https://drlqbwdupntqqtkmdncc.supabase.co/functions/v1/hizli-test';
  function sehirDuzelt(x) {
    x = (x || '').trim();
    if (x === 'Türkiye geneli') return x;
    var bul = YERLER.filter(function (y) { return n(y) === n(x) || n(y.split(',')[0]) === n(x); })[0];
    if (bul) return bul;
    return x.split(/\s+/).map(function (k) { return k.charAt(0).toLocaleUpperCase('tr') + k.slice(1).toLocaleLowerCase('tr'); }).join(' ');
  }
  function olc() {
    if (!window.fetch || navigator.webdriver && !window.__hizliTestDene) return Promise.resolve(null);
    var kontrol = window.AbortController ? new AbortController() : null;
    var zaman = setTimeout(function () { if (kontrol) kontrol.abort(); }, 45000);
    return fetch(OLCUM_ADRES, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sehir: durum.sehir.split(',')[0].trim(), is: durum.is }), signal: kontrol ? kontrol.signal : undefined })
      .then(function (r) { return r.json(); }).then(function (j) { clearTimeout(zaman); return j && (j.harita || j.yz) ? j : null; })
      .catch(function () { clearTimeout(zaman); return null; });
  }
  var GENEL = ['ve', 'ltd', 'sti', 'san', 'tic', 'sube', 'subesi', 'merkez', 'merkezi', 'hizmetleri', 'servis', 'servisi', 'firmasi', 'sirketi'];
  function kelimeler(x) { return n(x).replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(function (t) { return t.length >= 3; }); }
  function eslesir(ad, aday) {
    var haric = kelimeler(durum.is + ' ' + durum.sehir).concat(GENEL);
    var c = kelimeler(ad).filter(function (t) { return haric.indexOf(t) < 0; });
    if (!c.length) c = kelimeler(ad);
    if (!c.length) return false;
    var a = kelimeler(aday);
    var var_ = function (t) { return a.some(function (k) { return k === t || (k.indexOf(t) === 0 && k.length - t.length <= 3); }); };
    var bulunan = c.filter(var_).length;
    return var_(c[0]) && bulunan >= Math.ceil(c.length / 2);
  }
  var sonVeri = null;
  function liSatir(no, ad, ek) {
    var li = document.createElement('li');
    var b = document.createElement('b'); b.className = 't-no'; b.textContent = no; li.appendChild(b);
    var s1 = document.createElement('span'); s1.textContent = ad; li.appendChild(s1);
    if (ek) { var sm = document.createElement('small'); sm.textContent = ek; s1.appendChild(sm); }
    return li;
  }
  function sonucCiz(v) {
    sonVeri = v;
    $('t-gercek').hidden = !v; $('t-yedek').hidden = !!v;
    if (!v) {
      $('t-etiket').textContent = 'Örnek ekranınız';
      $('t-aciklama').textContent = 'Şu an ölçüm yapamadık. Görünür açılınca bunu sizin için her hafta ölçüp tek bir sayıyla söyleyeceğiz.';
      return;
    }
    var hl = $('t-harita'); hl.innerHTML = '';
    if (v.harita && v.harita.length) {
      $('t-harita-not').textContent = '"' + durum.is.toLocaleLowerCase('tr') + ' ' + durum.sehir.split(',')[0] + '" diye aratınca:';
      v.harita.slice(0, 5).forEach(function (x) { hl.appendChild(liSatir(x.sira + '.', x.ad, x.puan ? x.puan.toLocaleString('tr-TR') + ' ★ · ' + (x.yorum || 0) + ' yorum' : '')); });
    } else {
      $('t-harita-not').textContent = v.sehir === 'Türkiye geneli' ? 'Türkiye geneli çalışanlar için harita sırası ölçülmez.' : 'Haritalara şu an bakamadık, birazdan tekrar deneyin.';
    }
    var yl = $('t-yz'); yl.innerHTML = '';
    if (v.yz && v.yz.isletmeler) {
      $('t-yz-soru').textContent = 'Sorduğumuz soru: "' + v.soru + '"';
      v.yz.isletmeler.forEach(function (x, i) { yl.appendChild(liSatir((i + 1) + '.', x.ad, '')); });
    } else {
      $('t-yz-soru').textContent = 'Yapay zekâ şu an cevap vermedi, birazdan tekrar deneyin.';
    }
  }
  $('t-ben-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var ad = $('t-ad').value.trim(), out = $('t-ben-sonuc');
    out.className = 't-sonuc';
    document.querySelectorAll('.t-liste li').forEach(function (li) { li.classList.remove('t-siz'); });
    if (ad.length < 2 || !sonVeri) { out.textContent = 'İşletmenizin adını yazın.'; return; }
    var h = (sonVeri.harita || []).filter(function (x) { return eslesir(ad, x.ad); })[0];
    var yzi = (sonVeri.yz && sonVeri.yz.isletmeler || []).map(function (x) { return x.ad; }).filter(function (x) { return eslesir(ad, x); })[0];
    document.querySelectorAll('.t-liste li').forEach(function (li) { var sp = li.querySelector('span'); if (sp && eslesir(ad, sp.textContent)) li.classList.add('t-siz'); });
    var parcalar = [];
    if (h) parcalar.push('Google Haritalar\'da ' + h.sira + '. sıradasınız' + (h.sira <= 3 ? ', çok iyi.' : h.sira <= 5 ? '. İlk 3\'e çok yakınsınız.' : '. Müşterilerin çoğu ilk 3\'e bakıyor, oraya çıkmanız gerekiyor.'));
    else if (sonVeri.harita && sonVeri.harita.length) parcalar.push('Google Haritalar\'da ilk ' + sonVeri.harita.length + ' içinde çıkmıyorsunuz.');
    if (yzi) parcalar.push('Yapay zekâ sizi önerdi.');
    else if (sonVeri.yz) parcalar.push('Yapay zekâ sizi önermedi.');
    out.textContent = '';
    var d = document.createElement('b'); d.className = h && h.sira <= 3 ? 'iyi' : 'kotu'; d.textContent = parcalar.join(' ');
    out.appendChild(d); out.appendChild(document.createTextNode(' Görünür bunu her hafta ölçer ve yükselmek için yapacağınız işleri sıraya koyar.'));
  });

  function hazirla() {
    durum.sehir = sehirDuzelt(durum.sehir);
    var olcum = olc(), sonuc, olcumBitti = false, animBitti = false;
    olcum.then(function (v) { sonuc = v; olcumBitti = true; if (animBitti) bitir(); });
    document.querySelectorAll('.is-adi').forEach(function (e) { e.textContent = durum.is; });
    var satirlar = document.querySelectorAll('#adimlar > div'), i = 0;
    var azalt = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var t = setInterval(function () {
      if (i === satirlar.length - 1 && !olcumBitti) return; // son adımda ölçümü bekle
      satirlar.forEach(function (s, k) { s.className = k < i ? 'tamam' : (k === i ? 'aktif' : ''); });
      i++;
      if (i > satirlar.length) {
        clearInterval(t);
        animBitti = true;
        if (olcumBitti) bitir();
      }
    }, azalt ? 60 : 700);
    function bitir() {
        setTimeout(function () {
          var yer = durum.sehir === 'Türkiye geneli' ? 'Türkiye’de' : (function (ad) { var k = ad.toLocaleLowerCase('tr'), u = k.match(/[aıoueiöü]/g) || ['e']; return ad + '’' + (/[çfhkpsşt]$/.test(k) ? 't' : 'd') + ('aıou'.indexOf(u[u.length - 1]) >= 0 ? 'a' : 'e'); })(durum.sehir.split(',')[0].trim());
          document.querySelector('#s5 .yer').textContent = yer;
          document.querySelector('#s5 .is-kucuk').textContent = durum.is.toLocaleLowerCase('tr');
          try { sessionStorage.setItem('gorunur_test', JSON.stringify({ mod: durum.mod.slice(0, 3), sehir: durum.sehir, is: durum.is })); } catch (e) {}
          sonucCiz(sonuc);
          durum.adim = 5; guncelle(); odakla();
        }, azalt ? 0 : 500);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    window.Gorunur.formBagla($('test-form'), function () {
      return { calismaSekli: durum.mod.slice(0, 3), sehir: durum.sehir.slice(0, 120), isTuru: durum.is.slice(0, 120) };
    });
  });

  guncelle();
})();
