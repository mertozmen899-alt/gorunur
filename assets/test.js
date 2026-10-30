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

  function hazirla() {
    document.querySelectorAll('.is-adi').forEach(function (e) { e.textContent = durum.is; });
    var satirlar = document.querySelectorAll('#adimlar > div'), i = 0;
    var azalt = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var t = setInterval(function () {
      satirlar.forEach(function (s, k) { s.className = k < i ? 'tamam' : (k === i ? 'aktif' : ''); });
      i++;
      if (i > satirlar.length) {
        clearInterval(t);
        setTimeout(function () {
          var yer = durum.sehir === 'Türkiye geneli' ? 'Türkiye’de' : durum.sehir.split(',')[0].trim() + '’de';
          document.querySelector('#s5 .yer').textContent = yer;
          document.querySelector('#s5 .is-kucuk').textContent = durum.is.toLocaleLowerCase('tr');
          try { sessionStorage.setItem('gorunur_test', JSON.stringify({ mod: durum.mod.slice(0, 3), sehir: durum.sehir, is: durum.is })); } catch (e) {}
          durum.adim = 5; guncelle(); odakla();
        }, azalt ? 0 : 500);
      }
    }, azalt ? 60 : 700);
  }

  document.addEventListener('DOMContentLoaded', function () {
    window.Gorunur.formBagla($('test-form'), function () {
      return { calismaSekli: durum.mod.slice(0, 3), sehir: durum.sehir.slice(0, 120), isTuru: durum.is.slice(0, 120) };
    });
  });

  guncelle();
})();
