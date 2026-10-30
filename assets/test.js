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
  // ---- Rapor kartı: "Bu siz misiniz?" sonra 1. sıradakiyle karşılaştırma ve adımlar ----
  function el(t, sinif, metin) { var e = document.createElement(t); if (sinif) e.className = sinif; if (metin != null) e.textContent = metin; return e; }
  function aramaAdi() { return durum.is.toLocaleLowerCase('tr') + ' ' + durum.sehir.split(',')[0]; }
  function adayKart(x, sec) {
    var b = el('button', 't-aday'); b.type = 'button';
    b.appendChild(el('b', null, x.ad));
    var alt = [x.adres, x.puan ? x.puan.toLocaleString('tr-TR') + ' ★ · ' + (x.yorum || 0) + ' yorum' : 'Henüz puan yok'].filter(Boolean).join(' · ');
    b.appendChild(el('small', null, alt));
    b.addEventListener('click', function () { sec(x); });
    return b;
  }
  function adaySor(out, baslik, adaylar, siraVar) {
    out.innerHTML = '';
    out.appendChild(el('p', 't-soru-b', baslik));
    var l = el('div', 't-adaylar');
    adaylar.forEach(function (x) { l.appendChild(adayKart(x, function (v) { raporCiz(v, siraVar ? v.sira : null); })); });
    out.appendChild(l);
    var yok = el('button', 't-baglanti', siraVar ? 'Hiçbiri ben değilim, adımla arayın' : 'Hiçbiri değil, Google\'da kaydım yok'); yok.type = 'button';
    yok.addEventListener('click', function () { if (siraVar) adlaAra(out); else raporCiz(null, null); });
    out.appendChild(yok);
  }
  function adlaAra(out) {
    var ad = $('t-ad').value.trim();
    out.innerHTML = ''; out.appendChild(el('p', 't-not', '"' + ad + '" adıyla Google Haritalar\'da arıyoruz...'));
    if (!window.fetch || navigator.webdriver && !window.__hizliTestDene) { raporCiz(null, null); return; }
    fetch(OLCUM_ADRES, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ islem: 'bul', ad: ad, sehir: durum.sehir.split(',')[0].trim(), is: durum.is }) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j && j.adaylar && j.adaylar.length) adaySor(out, 'Google\'da bunları bulduk. Hangisi sizsiniz?', j.adaylar, false);
        else if (j && j.adaylar) raporCiz(null, null);
        else { out.innerHTML = ''; out.appendChild(el('p', 't-not', (j && j.mesaj) || 'Şu an arayamadık. Birazdan tekrar deneyin.')); }
      })
      .catch(function () { out.innerHTML = ''; out.appendChild(el('p', 't-not', 'Şu an arayamadık. Birazdan tekrar deneyin.')); });
  }
  function adimlarUret(siz, lider, yzVar) {
    var A = [];
    if (!siz) A.push({ g:'Müşterilerin sizi bulması için ilk adım', t: 'Google İşletme Profilinizi açın', n: 'Haritalarda hiç görünmüyorsunuz. Bu, müşterilerin sizi bulması için en önemli adım ve ücretsiz.', a: ['Telefonunuzda Google Haritalar\'ı açın, işletmenizin adını arayın. Çıkarsa "Bu işletmenin sahibi misiniz?" deyip sahiplenin.', 'Çıkmazsa business.google.com adresinden "İşletme ekle" deyin; adı tabelanızdaki gibi, kategoriyi "' + durum.is + '" olarak seçin.', 'Adres, telefon ve çalışma saatlerini girin, Google\'ın istediği doğrulamayı yapın.'] });
    if (siz && lider && (siz.yorum || 0) < Math.max(10, (lider.yorum || 0) * 0.6)) A.push({ g:'1. sıradakinin sizden çok daha fazla yaptığı bir şey', t: 'Müşterilerinizden Google yorumu isteyin', n: 'Sizde ' + (siz.yorum || 0) + ' yorum var, ' + lider.sira + '. sıradakinde ' + (lider.yorum || 0) + '. Google en çok yorumu olan ve düzenli yorum alan işletmeyi öne çıkarıyor.', a: ['Google İşletme Profilinizde "Yorum iste" bölümünden bağlantınızı kopyalayın.', 'Bu hafta işini yaptığınız 10 müşterinize WhatsApp\'tan kısa bir teşekkürle gönderin.', 'Gelen her yoruma 1-2 cümleyle cevap verin.'] });
    if (siz && !siz.web) A.push({ g:'Profilinizde müşterinin göremediği önemli bir bilgi', t: 'Profilinize web sitesi ya da Instagram bağlantısı ekleyin', n: 'Profilinizde bir bağlantı görünmüyor' + (lider && lider.web ? ', önünüzdekinde var.' : '.'), a: ['Google İşletme Profilinde "Profili düzenle" deyin.', '"Web sitesi" alanına sitenizi, yoksa Instagram adresinizi yazın.', 'Kaydedin; birkaç gün içinde görünür.'] });
    if (siz && !siz.saat) A.push({ g:'Google\'ın öne çıkardığı işletmelerde olup sizde olmayan bir şey', t: 'Çalışma saatlerinizi girin', n: 'Saatleriniz profilde görünmüyor. Google "şimdi açık" olanları öne çıkarır.', a: ['Profili düzenle bölümünde "Saatler"i açın.', 'Her günün açılış ve kapanış saatini girin.', 'Bayram ve tatil günleri için "özel saatler" ekleyin.'] });
    if (siz && !siz.tel) A.push({ g:'Müşterinin size ulaşmasını zorlaştıran bir eksik', t: 'Telefon numaranızı profile ekleyin', n: 'Profilinizde telefon görünmüyor; müşteri sizi tek dokunuşla arayamıyor.', a: ['Profili düzenle, "İletişim" bölümünü açın.', 'Müşterinin aradığı numarayı yazın.', 'Aynı numarayı sitenizde ve Instagram\'da da kullanın.'] });
    if (siz && lider && siz.puan && lider.puan && siz.puan < lider.puan - 0.2) A.push({ g:'Puanınızı yukarı taşıyacak bir alışkanlık', t: 'Düşük puanlı yorumlara nazikçe cevap verin', n: 'Puanınız ' + siz.puan.toLocaleString('tr-TR') + ', önünüzdekinin ' + lider.puan.toLocaleString('tr-TR') + '.', a: ['3 yıldız ve altındaki yorumları bulun.', 'Kısa bir özür ve çözüm teklifiyle cevap verin.', 'Sorunu çözdüğünüz müşteriden yorumunu güncellemesini rica edin.'] });
    if (!yzVar) A.push({ g:'Yapay zekânın sizi önermesi için yapılacak bir iş', t: 'Yapay zekânın baktığı sitelerde yer alın', n: 'Yapay zekâ sizi önermedi. Önerdiği işletmeler, sektör rehberlerinde ve haritalarda bilgisi eksiksiz olanlar.', a: ['Sektörünüzdeki rehber sitelerinde ücretsiz profil açın.', 'Her yerde adınızı, adresinizi, telefonunuzu aynı yazın.', 'Profilinize hizmetlerinizi tek tek ekleyin.'] });
    A.push({ g:'Öndeki işletmelerin düzenli yaptığı bir şey', t: 'Her hafta bir Google gönderisi paylaşın', n: 'Düzenli paylaşım yapan profiller daha canlı görünür.', a: ['Profilinizde "Güncelleme ekle" deyin.', 'Bir iş fotoğrafı ve 2-3 cümle yazın.', 'Her hafta tekrarlayın.'] });
    return A.slice(0, 3);
  }
  function kiyasSatir(tablo, ad, sizV, liderV, iyi) {
    var tr = el('tr'); tr.appendChild(el('th', null, ad));
    var a = el('td', iyi === false ? 'kotu' : iyi === true ? 'iyi' : '', sizV); tr.appendChild(a);
    tr.appendChild(el('td', null, liderV)); tablo.appendChild(tr);
  }
  function varYok(x) { return x ? 'Var' : 'Yok'; }
  function raporCiz(siz, sira) {
    var out = $('t-ben-sonuc'); out.innerHTML = '';
    document.querySelectorAll('.t-liste li').forEach(function (li) { li.classList.remove('t-siz'); });
    var h = (sonVeri && sonVeri.harita) || [];
    if (sira) document.querySelectorAll('#t-harita li').forEach(function (li, k) { if (h[k] && h[k].sira === sira) li.classList.add('t-siz'); });
    var lider = h.filter(function (x) { return !siz || x.ad !== siz.ad; })[0] || null;
    var yzVar = !!(siz && sonVeri && sonVeri.yz && sonVeri.yz.isletmeler.some(function (x) { return eslesir(siz.ad, x.ad); }));
    var k = el('div', 't-rapor');
    k.appendChild(el('span', 'pil pil-a', 'Rapor kartınız'));
    var buyuk = el('p', 't-buyuk');
    if (sira) { buyuk.appendChild(document.createTextNode('"' + aramaAdi() + '" arayanlar sizi Google Haritalar\'da ')); buyuk.appendChild(el('b', sira <= 3 ? 'iyi' : 'kotu', sira + '. sırada')); buyuk.appendChild(document.createTextNode(' görüyor.')); }
    else if (siz) { buyuk.appendChild(document.createTextNode('"' + aramaAdi() + '" aramasında Haritalar\'ın ')); buyuk.appendChild(el('b', 'kotu', 'ilk 20\'sinde yoksunuz')); buyuk.appendChild(document.createTextNode('.')); }
    else { buyuk.appendChild(document.createTextNode('Google Haritalar\'da ')); buyuk.appendChild(el('b', 'kotu', 'görünmüyorsunuz')); buyuk.appendChild(document.createTextNode('. Sizi arayan müşteri rakiplerinizi buluyor.')); }
    k.appendChild(buyuk);
    if (siz && lider) {
      k.appendChild(el('p', 't-alt-b', 'Siz ve ' + lider.sira + '. sıradaki: ' + lider.ad));
      var t = el('table', 't-kiyas'); var bas = el('tr'); bas.appendChild(el('th')); bas.appendChild(el('th', null, 'Siz')); bas.appendChild(el('th', null, lider.sira + '. sıradaki')); t.appendChild(bas);
      kiyasSatir(t, 'Puan', siz.puan ? siz.puan.toLocaleString('tr-TR') + ' ★' : 'Yok', lider.puan ? lider.puan.toLocaleString('tr-TR') + ' ★' : 'Yok', siz.puan && lider.puan ? siz.puan >= lider.puan - 0.1 : false);
      kiyasSatir(t, 'Yorum sayısı', String(siz.yorum || 0), String(lider.yorum || 0), (siz.yorum || 0) >= (lider.yorum || 0) * 0.8);
      kiyasSatir(t, 'Web sitesi', varYok(siz.web), varYok(lider.web), siz.web ? true : (lider.web ? false : null));
      kiyasSatir(t, 'Telefon', varYok(siz.tel), varYok(lider.tel), siz.tel ? true : false);
      kiyasSatir(t, 'Çalışma saatleri', varYok(siz.saat), varYok(lider.saat), siz.saat ? true : false);
      kiyasSatir(t, 'Yapay zekâ önerdi mi?', yzVar ? 'Evet' : 'Hayır', '', yzVar);
      k.appendChild(t);
    }
    var A = adimlarUret(siz, lider, yzVar);
    k.appendChild(el('p', 't-alt-b', 'Sizi yukarı taşıyacak ilk 3 adım'));
    A.forEach(function (x, i) {
      var d = el('div', 't-adim' + (i ? ' kilitli' : ''));
      var bas = el('div', 't-adim-bas'); bas.appendChild(el('b', 't-adim-no', String(i + 1))); bas.appendChild(el('b', null, i ? x.g : x.t));
      if (i) bas.appendChild(el('span', 't-kilit-ikon', '🔒'));
      d.appendChild(bas);
      var ic = el('div', 't-adim-ic');
      if (i) {
        // Gerçek adım metni sayfaya hiç yazılmaz; yerine anlamsız, bulanık yer tutucu
        ic.setAttribute('aria-hidden', 'true');
        ['Bu adımı hesabınızda adım adım anlatıyoruz, hazır metniyle birlikte.', 'Ne kadar süreceğini ve nereden yapılacağını da yazıyoruz.', 'Yaptıktan sonra etkisini bir sonraki ölçümde gösteriyoruz.'].forEach(function (t) { ic.appendChild(el('p', null, t)); });
      } else {
        ic.appendChild(el('p', null, x.n));
        var ol = el('ol'); x.a.forEach(function (s) { ol.appendChild(el('li', null, s)); }); ic.appendChild(ol);
      }
      d.appendChild(ic); k.appendChild(d);
    });
    if (!siz || !siz.web) {
      var tk = el('div', 't-teklif');
      tk.appendChild(el('b', null, 'Web siteniz yok mu? Google\'a uygun sitenizi biz yapalım.'));
      tk.appendChild(el('p', null, 'İşinizi, semtinizi ve telefonunuzu Google\'ın anlayacağı şekilde anlatan, telefonda hızlı açılan bir site hazırlıyoruz.'));
      var wa = el('a', 'btn btn-wa', 'WhatsApp\'tan bilgi alın'); wa.target = '_blank'; wa.rel = 'noopener';
      wa.href = 'https://wa.me/905556984086?text=' + encodeURIComponent('Merhaba, ' + (siz ? siz.ad : 'işletmem') + ' için web sitesi yaptırmak istiyorum. (' + aramaAdi() + ')');
      tk.appendChild(wa); k.appendChild(tk);
    }
    var kilit = el('div', 't-kilit');
    kilit.appendChild(el('p', null, '2. ve 3. adımın nasıl yapılacağını ve her hafta sıranızı hesabınızda görün.'));
    var ac = el('a', 'btn btn-amber', 'Ücretsiz hesap aç, hepsini gör'); ac.href = 'giris.html#kayit'; kilit.appendChild(ac);
    k.appendChild(kilit);
    k.appendChild(el('p', 't-not', 'Sonuç bugün yapılan tek bir aramaya göre. Konuma ve güne göre sıra biraz değişebilir; Görünür bunu her hafta ölçer.'));
    out.appendChild(k);
    try { sessionStorage.setItem('gorunur_test_rapor', JSON.stringify({ ad: siz && siz.ad, sira: sira })); } catch (e) {}
    k.scrollIntoView && k.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  $('t-ben-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var ad = $('t-ad').value.trim(), out = $('t-ben-sonuc');
    out.innerHTML = '';
    if (ad.length < 2 || !sonVeri) { out.appendChild(el('p', 't-not', 'İşletmenizin adını yazın.')); return; }
    var h = (sonVeri.harita || []).filter(function (x) { return eslesir(ad, x.ad); });
    if (h.length) adaySor(out, 'Bu siz misiniz?', h.slice(0, 3), true);
    else adlaAra(out);
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
