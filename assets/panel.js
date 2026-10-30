// Görünür: müşteri paneli. İşletme bilgisi + gerçek ölçüm sonuçları.
(function () {
  'use strict';
  var A = window.GorunurAuth;
  var $ = function (id) { return document.getElementById(id); };
  var MOD = { gelir: 'Bana gelirler', giderim: 'Ben onlara giderim', online: 'Online çalışırım' };
  var SIKLIK = { haftalik: 'her pazartesi kısa bir özet', onemli: 'sadece önemli bir şey olunca', yok: 'mesaj göndermeyeceğiz' };
  var oturum, isletme;

  function el(tag, metin, sinif) { var e = document.createElement(tag); if (metin != null) e.textContent = metin; if (sinif) e.className = sinif; return e; }
  function yerde(semt) { return semt === 'Türkiye geneli' ? 'Türkiye’de' : (semt || '').split(',')[0].trim() + '’de'; }
  function gosterLink(url) { return (url || '').replace(/^https?:\/\//, '').replace(/\/$/, ''); }
  function sayi(x) { return x == null ? '-' : Number(x).toLocaleString('tr-TR'); }
  function tarih(t) { return new Date(t).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }); }

  var EKLER = ['satıcısı', 'satıcı', 'satış', 'mağazası', 'mağaza', 'firması', 'firma', 'hizmeti', 'hizmetleri', 'merkezi', 'noktası', 'şirketi'];
  function sadeK(x) { return (x || '').toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function tekil(liste) {
    var gor = {}, out = [];
    liste.map(function (x) { return (x || '').replace(/\s+/g, ' ').trim(); }).filter(Boolean).forEach(function (k) {
      var im = sadeK(k).split(' ').sort().join(' '); if (!gor[im]) { gor[im] = 1; out.push(k); }
    });
    return out;
  }
  function otomatikKelimeler(i) {
    var isK = (i.is_turu || '').toLocaleLowerCase('tr').trim();
    var yer = i.semt === 'Türkiye geneli' ? '' : (i.semt || '').split(',')[0].trim().toLocaleLowerCase('tr');
    var cek = isK.split(/\s+/).filter(function (k) { return k && EKLER.indexOf(k) < 0; }).join(' ') || isK;
    return tekil([yer + ' ' + cek, isK + ' ' + yer, 'en iyi ' + cek + ' ' + yer, cek + ' ' + yer + ' tavsiye']).slice(0, 3);
  }
  function siraYaz(td, sira, hata, bakilmadi) {
    if (bakilmadi) { td.textContent = 'bakılmadı'; td.className = 'sira-yok'; return; }
    if (hata) { td.textContent = 'ölçülemedi'; td.className = 'sira-yok'; return; }
    td.textContent = sira ? sira + '.' : 'yok'; td.className = sira ? (sira <= 3 ? 'sira-iyi' : '') : 'sira-yok';
  }

  function isEkle(kutu, isler) {
    kutu.innerHTML = '';
    isler.forEach(function (x, k) {
      var d = el('div', null, 'is-satir');
      d.appendChild(el('span', String(k + 1), 'is-no'));
      var g = el('div', null, 'is-govde');
      g.appendChild(el('b', x.t)); if (x.s) g.appendChild(el('small', x.s)); g.appendChild(el('p', x.n));
      if (x.l) { var a = el('a', x.lm + ' →'); a.href = x.l; if (/^http/.test(x.l)) { a.target = '_blank'; a.rel = 'noopener'; } g.appendChild(a); }
      d.appendChild(g); kutu.appendChild(d);
    });
  }

  // Ölçüm sonucundan yapılacaklar çıkarır (sadece ölçülen farka dayanır)
  function olcumIsleri(o, i) {
    var isler = [];
    var b = o.isletme_bilgi || {};
    var ilk3 = (o.harita_sonuclar || []).filter(function (r) { return !r.siz; }).slice(0, 3);
    var ortYorum = ilk3.length ? Math.round(ilk3.reduce(function (t, r) { return t + (r.yorum || 0); }, 0) / ilk3.length) : null;
    var ortPuan = ilk3.length ? ilk3.reduce(function (t, r) { return t + (r.puan || 0); }, 0) / ilk3.length : null;
    if (b.bulundu === false && b.baska_sube) {
      isler.push({ t: (i.semt || '').split(',')[0] + ' için ayrı Google profili açın', s: 'En önemli iş · 20 dakika', n: 'Google Haritalar’da "' + i.ad + '" adıyla sadece ' + (b.baska_sube.adres ? b.baska_sube.adres.split(',').slice(-2).join(',').trim() + ' adresindeki ' : '') + '"' + b.baska_sube.ad + '" profili çıkıyor. ' + (i.semt || '').split(',')[0] + ' mağazanızın kendi profili yoksa müşteriler sizi haritada göremez. Varsa adı farklı yazılmış olabilir; Google Haritalar’da mağazanızı açıp adını kurulumdaki adla aynı yapın.', l: 'https://business.google.com', lm: 'Google İşletme Profili' });
    } else if (b.bulundu === false) {
      isler.push({ t: 'Google’da işletme profilinizi bulamadık', s: 'En önemli iş · 15 dakika', n: '"' + i.ad + '" adıyla Google Haritalar’da bir profil göremedik. Profil yoksa business.google.com’dan ücretsiz açın. Varsa adı farklı yazılmış olabilir; kurulumdaki işletme adını Google’daki adla aynı yapın.', l: 'https://business.google.com', lm: 'Google İşletme Profili' });
    }
    if (b.bulundu && ortYorum != null && (b.yorum || 0) < ortYorum) {
      isler.push({ t: 'Yorum farkını kapatın', s: 'Her hafta · 10 dakika', n: 'Sizin ' + sayi(b.yorum || 0) + ' yorumunuz var, haritada ilk 3’teki işletmelerin ortalaması ' + sayi(ortYorum) + '. Memnun müşterilerinize Google yorum linkinizi WhatsApp’tan gönderin; haftada 3-5 yeni yorum farkı kapatmaya başlar.' });
    }
    if (b.bulundu && b.puan != null && ortPuan != null && b.puan + 0.1 < ortPuan) {
      isler.push({ t: 'Puanınızı yükseltin', s: '20 dakika', n: 'Puanınız ' + String(b.puan).replace('.', ',') + ', öndekilerin ortalaması ' + ortPuan.toFixed(1).replace('.', ',') + '. Önce cevapsız yorumlara kısa ve kibar cevaplar yazın, olumsuz yorumlarda çözüm teklif edin.' });
    }
    if (o.arama_sira == null && !i.site) {
      isler.push({ t: 'Google aramasında görünmüyorsunuz', s: 'Orta vadeli', n: '"' + o.arama_sorgu + '" aramasında ilk sonuçlarda yoksunuz ve web siteniz yok. Tek sayfalık basit bir site bile (hizmetler, adres, telefon) aramada çıkma şansınızı artırır.' });
    } else if (o.arama_sira == null && i.site) {
      isler.push({ t: 'Sitenizin başlığını aramaya uydurun', s: '15 dakika', n: '"' + o.arama_sorgu + '" aramasında sitenizi ilk sonuçlarda göremedik. Ana sayfa başlığında hem işinizi hem semtinizi yazın (örnek: "' + i.ad + ' | ' + (i.is_turu || '') + ' ' + (i.semt || '').split(',')[0] + '").' });
    }
    if (o.yz_soru_sayisi && o.yz_gecen === 0) {
      isler.push({ t: 'Yapay zekâ sizi henüz önermiyor', s: 'Birkaç hafta sürer', n: 'Sorduğumuz ' + o.yz_soru_sayisi + ' sorunun hiçbirinde adınız geçmedi. Yapay zekâ önerirken Google profili, yorumlar ve rehber sitelere bakıyor: profilinizdeki hizmet listesini ve açıklamayı doldurun, sektör rehberlerinde profil açın.' });
    }
    if (o.harita_sira && o.harita_sira <= 3 && o.yz_gecen > 0) {
      isler.push({ t: 'İyi durumdasınız, yerinizi koruyun', s: 'Her hafta', n: 'Haritalarda ilk 3’tesiniz ve yapay zekâ sizi öneriyor. Yeni yorum gelmeye devam etsin, profilinize ayda 2-3 güncel fotoğraf ekleyin.' });
    }
    return isler.slice(0, 4);
  }

  function sonucCiz(o) {
    var i = isletme, b = o.isletme_bilgi || {};
    var isK = (i.is_turu || '').toLocaleLowerCase('tr');
    $('olcum-tarih').textContent = 'Son ölçüm: ' + tarih(o.bitis || o.baslangic);
    var c;
    if (o.harita_sira) c = yerde(i.semt) + ' "' + o.harita_sorgu + '" aramasında Google Haritalar’da ' + o.harita_sira + '. sıradasınız.';
    else if (b.bulundu === false && b.baska_sube) c = yerde(i.semt) + ' "' + i.ad + '" profilini bulamadık. Google’da sadece "' + b.baska_sube.ad + '" görünüyor' + (b.baska_sube.adres ? ' (' + b.baska_sube.adres.split(',').slice(-2).join(',').trim() + ')' : '') + '.';
    else if (b.bulundu === false) c = 'Google Haritalar’da "' + i.ad + '" adıyla bir profil bulamadık.';
    else if (o.harita_sonuclar) c = '"' + o.harita_sorgu + '" aramasında Google Haritalar’ın ilk 20 sonucunda yoksunuz.';
    else c = 'Haritalar ölçümü yapılamadı.';
    $('sonuc-cumle').textContent = c;
    $('sonuc-alt').textContent = o.yz_soru_sayisi
      ? 'Yapay zekâya sorduğumuz ' + o.yz_soru_sayisi + ' sorunun ' + o.yz_gecen + ' tanesinde adınız geçti.' + (b.bulundu && b.yorum != null ? ' Google’da ' + sayi(b.yorum) + ' yorumunuz ve ' + String(b.puan || '-').replace('.', ',') + ' puanınız var.' : '')
      : (b.bulundu && b.yorum != null ? 'Google’da ' + sayi(b.yorum) + ' yorumunuz ve ' + String(b.puan || '-').replace('.', ',') + ' puanınız var.' : '');

    var ks = o.kelimeler || [];
    var hOlculen = ks.filter(function (k) { return !k.harita_hata && k.harita_bakilan != null; });
    var hCikan = hOlculen.filter(function (k) { return k.harita_sira; });
    $('k-harita').textContent = o.harita_sira ? o.harita_sira + '.' : (o.harita_sonuclar ? 'Yok' : '-');
    $('k-harita-not').textContent = hOlculen.length > 1
      ? (hCikan.length ? hOlculen.length + ' aramadan ' + hCikan.length + ' tanesinde çıktınız, en iyi sıranız' : hOlculen.length + ' aramada da ilk 20’de değilsiniz')
      : (o.harita_sira ? 'sıradasınız' : (o.harita_sonuclar ? 'ilk 20’de değilsiniz' : 'ölçülemedi'));
    var as = o.arama_sonuclar || {};
    $('k-arama').textContent = o.arama_sira ? o.arama_sira + '.' : (o.arama_sonuclar ? 'Yok' : '-');
    var aOlculen = ks.filter(function (k) { return 'arama_sira' in k; });
    $('k-arama-not').textContent = aOlculen.length > 1 && !o.arama_sira && !as.yerel_kutuda ? aOlculen.length + ' aramada da ilk sonuçlarda değilsiniz' : o.arama_sira ? 'normal sonuçlarda' : (as.yerel_kutuda ? 'ama harita kutusunda ' + as.yerel_kutuda + '.' : (o.arama_sonuclar ? 'ilk sonuçlarda değilsiniz' : 'ölçülemedi'));
    $('k-yz').textContent = o.yz_soru_sayisi ? o.yz_gecen + ' / ' + o.yz_soru_sayisi : '-';
    $('k-yz-not').textContent = o.yz_soru_sayisi ? 'cevapta adınız geçti' : 'ölçülemedi';
    ['k-harita', 'k-arama', 'k-yz'].forEach(function (id) { $(id).className = ''; });
    if (o.harita_sira && o.harita_sira <= 3) $('k-harita').className = 'iyi';
    if (o.yz_gecen > 0) $('k-yz').className = 'iyi';

    var h = (o.hatalar || []).filter(Boolean);
    $('sonuc-hata').hidden = !h.length;
    if (h.length) $('sonuc-hata').textContent = 'Bazı ölçümler yapılamadı: ' + h.join(' · ');

    // Aramalar tek tek
    var kt = $('kelime-tablo'); kt.innerHTML = '';
    ks.forEach(function (k) {
      var tr = el('tr');
      tr.appendChild(el('td', '"' + k.kelime + '"'));
      var h = el('td'); siraYaz(h, k.harita_sira, k.harita_hata, k.harita_bakilan == null && !k.harita_hata); tr.appendChild(h);
      var g = el('td'); siraYaz(g, k.arama_sira, k.arama_hata, !('arama_sira' in k) && !k.arama_hata);
      if (!k.arama_sira && k.yerel_kutuda) { g.textContent = 'harita kutusunda ' + k.yerel_kutuda + '.'; g.className = 'sira-iyi'; }
      tr.appendChild(g);
      tr.appendChild(el('td', (k.harita_ilk3 && k.harita_ilk3[0]) || '-'));
      kt.appendChild(tr);
    });
    $('kelime-tablo').closest('section').hidden = !ks.length;

    // Rakip tablosu
    var tb = $('rakip-tablo'); tb.innerHTML = '';
    var liste = o.harita_sonuclar || [];
    $('rakip-not').textContent = liste.length ? '"' + o.harita_sorgu + '" aramasında Google Haritalar’ın ilk ' + liste.length + ' sonucu.' + (o.harita_sira ? '' : ' Siz bu listede yoksunuz.') : 'Haritalar sonucu alınamadı.';
    liste.forEach(function (r) {
      var tr = el('tr'); if (r.siz) tr.className = 'siz-satir';
      tr.appendChild(el('td', String(r.sira)));
      var ad = el('td'); ad.appendChild(el('b', String(r.ad || '-'))); if (r.siz) ad.appendChild(el('span', ' (siz)'));
      tr.appendChild(ad);
      tr.appendChild(el('td', r.puan != null ? String(r.puan).replace('.', ',') + ' ★' : '-'));
      tr.appendChild(el('td', sayi(r.yorum)));
      tb.appendChild(tr);
    });

    // Yapay zekâ cevapları
    var yl = $('yz-liste'); yl.innerHTML = '';
    var aramasiz = (o.yz_cevaplar || []).some(function (c) { return c.aramali === false; });
    $('yz-not').textContent = aramasiz
      ? 'Yapay zekâya müşteri gibi sorduk. Bu ölçümde internette arama yapmadan kendi bilgisinden cevapladı. Cevapların tamamını açıp okuyabilirsiniz.'
      : 'Google aramasıyla çalışan bir yapay zekâya müşteri gibi sorduk. Cevapların tamamını açıp okuyabilirsiniz.';
    (o.yz_cevaplar || []).forEach(function (c) {
      var d = el('details', null, 'yz-cevap');
      var s = el('summary');
      s.appendChild(el('span', '"' + c.soru + '"', 'yz-soru'));
      s.appendChild(el('span', c.hata ? 'Sorulamadı' : (c.geciyor ? 'Adınız geçti' : 'Adınız geçmedi'), 'pil ' + (c.hata ? 'pil-a' : (c.geciyor ? 'pil-y' : 'pil-k'))));
      d.appendChild(s);
      d.appendChild(el('p', c.hata ? c.hata : (c.ozet || '(boş cevap)'), 'yz-metin'));
      yl.appendChild(d);
    });
    if (!yl.children.length) yl.appendChild(el('p', 'Yapay zekâ ölçümü yapılamadı.', 'kart-alt'));

    isEkle($('olcum-isler'), olcumIsleri(o, i));
    if (!$('olcum-isler').children.length) isEkle($('olcum-isler'), [{ t: 'Belirgin bir eksik görmedik', n: 'Yine de aşağıdaki genel adımlara göz atın.' }]);

    $('ilk').hidden = true; $('sonuc').hidden = false;
  }

  function genelCiz() {
    var i = isletme, m = i.calisma_sekli || [];
    var saat = new Date().getHours();
    $('kim').textContent = oturum.user.email;
    $('selam').textContent = (saat < 12 ? 'Günaydın' : saat < 18 ? 'İyi günler' : 'İyi akşamlar');
    $('baslik').textContent = i.ad || 'Hoş geldiniz';
    $('hero-cumle').textContent = yerde(i.semt) + ' ' + (i.is_turu || 'işletme').toLocaleLowerCase('tr') + ' arayanlar sizi buluyor mu? Hemen ölçelim.';

    var satirlar = [
      ['İşletme', i.ad], ['İş', i.is_turu], ['Yer', i.semt],
      ['Çalışma şekli', m.map(function (x) { return MOD[x] || x; }).join(', ')],
      ['Web sitesi', gosterLink(i.site) || 'Yok'], ['Instagram', i.instagram || 'Yok'],
      ['Google profili', i.google_profil ? 'Eklendi' : 'Eklenmedi']
    ];
    var dl = $('ozet'); dl.innerHTML = '';
    satirlar.forEach(function (s) { dl.appendChild(el('dt', s[0])); dl.appendChild(el('dd', s[1] || '-')); });

    var ilet = 'E-posta: ' + oturum.user.email + '. ';
    ilet += i.whatsapp ? 'WhatsApp: ' + i.whatsapp + ', ' + SIKLIK[i.mesaj_sikligi || 'haftalik'] + '.' : 'WhatsApp numarası eklemediniz.';
    $('iletisim').textContent = ilet;

    var isler = [
      { t: 'Adres ve telefonunuzu her yerde aynı yazın', s: '15 dakika', n: 'Google profilinizde, sitenizde ve Instagram’da adres ve telefon birebir aynı olmalı. Yapay zekâ farklı yazılmış bilgiye daha az güveniyor.' },
      { t: 'Google profilinizdeki hizmet listesini doldurun', s: '20 dakika', n: 'Yapay zekâ ve Google, ne iş yaptığınızı bu listeden anlıyor. Verdiğiniz her hizmeti ayrı satır olarak ekleyin.' },
      { t: 'Ayda 2-3 güncel fotoğraf ekleyin', s: '5 dakika', n: 'Güncel fotoğrafı olan profiller daha canlı görünür ve daha çok tıklanır.' }
    ];
    isEkle($('isler'), isler);
  }

  var zamanlayici;
  function adimlariOynat(bas) {
    var satir = document.querySelectorAll('#olcum-adimlar > div'), k = 0;
    clearInterval(zamanlayici);
    $('olcum-adimlar').hidden = !bas;
    if (!bas) return;
    satir.forEach(function (s) { s.className = ''; });
    zamanlayici = setInterval(function () {
      satir.forEach(function (s, j) { s.className = j < k ? 'tamam' : (j === k ? 'aktif' : ''); });
      if (k < satir.length - 1) k++;
    }, 6000);
    satir[0].className = 'aktif';
  }

  function olc() {
    $('ilk').hidden = false; $('sonuc').hidden = true;
    $('olc').disabled = true; $('olc').textContent = 'Ölçülüyor…'; $('olcum-uyari').textContent = '';
    $('durum-yazi').textContent = 'Ölçüm sürüyor';
    adimlariOynat(true);
    return A.sb.functions.invoke('olcum', { body: {} }).then(function (r) {
      if (r.error) {
        var ctx = r.error.context;
        return (ctx && ctx.json ? ctx.json() : Promise.resolve({})).then(function (j) { if (j && j.olcum) return j.olcum; throw new Error((j && j.hata) || 'Ölçüm şu an yapılamadı. Biraz sonra tekrar deneyin.'); }, function () { throw new Error('Ölçüm şu an yapılamadı. Biraz sonra tekrar deneyin.'); });
      }
      return r.data.olcum;
    }).then(function (o) {
      adimlariOynat(false);
      sonucCiz(o);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }).catch(function (e) {
      adimlariOynat(false);
      $('olcum-uyari').textContent = e.message;
      $('durum-yazi').textContent = 'Ölçüm yapılamadı';
    }).then(function () { $('olc').disabled = false; $('olc').textContent = 'Tekrar dene'; });
  }

  function kelimeFormuDoldur() {
    var kayitli = isletme.anahtar_kelimeler || [], oto = otomatikKelimeler(isletme);
    document.querySelectorAll('#kelime-form input').forEach(function (inp, n) {
      inp.value = kayitli[n] || ''; inp.placeholder = 'Örn. ' + (oto[n] || 'başka bir arama');
    });
    var populer = isletme.oto_kelimeler || [];
    var olculecek = tekil(kayitli.concat(populer, oto)).slice(0, 5);
    $('kelime-durum').textContent = populer.length
      ? 'Ölçülecek 5 arama: ' + olculecek.map(function (k) { return '"' + k + '"'; }).join(', ') + '. Kendi yazdıklarınız önce gelir, gerisi Google’da en çok arananlardan.'
      : 'İlk ölçümde Google’da sektörünüz için en çok yapılan aramaları bulup 5 tanesine bakacağız.' + (kayitli.length ? ' Kendi yazdıklarınız önce gelir.' : '');
  }
  $('kelime-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var liste = tekil([].map.call(document.querySelectorAll('#kelime-form input'), function (x) { return x.value.toLocaleLowerCase('tr'); })).filter(function (k) { return k.length >= 2; }).slice(0, 3);
    var btn = this.querySelector('button'); btn.disabled = true; $('kelime-durum').textContent = 'Kaydediliyor…';
    A.sb.from('isletmeler').update({ anahtar_kelimeler: liste.length ? liste : null }).eq('id', isletme.id).select().single().then(function (r) {
      if (r.error) throw r.error;
      isletme = r.data; kelimeFormuDoldur();
      $('kelime-durum').textContent = 'Kaydedildi. ' + $('kelime-durum').textContent;
    }).catch(function (err) { $('kelime-durum').textContent = A.hataMetni(err); }).then(function () { btn.disabled = false; });
  });

  $('olc').addEventListener('click', olc);
  $('yeniden').addEventListener('click', olc);
  $('cikis').addEventListener('click', function () { A.cikis(); });

  A.girisGerekli().then(function (s) { oturum = s; return A.isletmeGetir(); }).then(function (i) {
    if (!i || !i.kurulum_bitti) { location.replace(A.KOK + 'kurulum.html'); return; }
    isletme = i;
    genelCiz();
    kelimeFormuDoldur();
    return A.sb.from('olcumler').select('*').eq('durum', 'bitti').order('baslangic', { ascending: false }).limit(1).maybeSingle().then(function (r) {
      if (r.data) sonucCiz(r.data);
      $('yukleniyor').hidden = true; $('panel').hidden = false;
    });
  }).catch(function (err) {
    if (err && err.message === 'oturum-yok') return;
    $('yukleniyor').textContent = A.hataMetni(err);
  });
})();
