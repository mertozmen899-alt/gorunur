// Görünür: müşteri paneli (ilk sürüm: ölçüm öncesi durum)
(function () {
  'use strict';
  var A = window.GorunurAuth;
  var $ = function (id) { return document.getElementById(id); };
  var MOD = { gelir: 'Bana gelirler', giderim: 'Ben onlara giderim', online: 'Online çalışırım' };
  var SIKLIK = { haftalik: 'her pazartesi kısa bir özet', onemli: 'sadece önemli bir şey olunca', yok: 'mesaj göndermeyeceğiz' };

  function el(tag, metin, sinif) { var e = document.createElement(tag); if (metin != null) e.textContent = metin; if (sinif) e.className = sinif; return e; }
  function yer(semt) { return semt === 'Türkiye geneli' ? 'Türkiye’de' : (semt || '').split(',')[0].trim() + '’de'; }
  function gosterLink(url) { return (url || '').replace(/^https?:\/\//, '').replace(/\/$/, ''); }

  function ciz(oturum, i) {
    var saat = new Date().getHours();
    var selam = saat < 12 ? 'Günaydın' : saat < 18 ? 'İyi günler' : 'İyi akşamlar';
    $('kim').textContent = oturum.user.email;
    $('selam').textContent = selam + ' · Kurulumunuz tamam';
    $('baslik').textContent = i.ad || 'Hoş geldiniz';

    var isK = (i.is_turu || 'işletme').toLocaleLowerCase('tr');
    $('hero-cumle').textContent = yer(i.semt) + ' ' + isK + ' arayanlara verilen cevaplarda adınızın geçip geçmediğini ölçeceğiz.';
    var nereden = i.whatsapp && i.mesaj_sikligi !== 'yok' ? 'WhatsApp’tan ve e-postayla' : 'e-postayla';
    $('hero-alt').textContent = 'Ölçüm sistemimizi şu an kuruyoruz. İlk ölçümünüz hazır olunca sonucu ' + nereden + ' göndereceğiz; sayfada beklemenize gerek yok.';

    // Özet
    var satirlar = [
      ['İşletme', i.ad], ['İş', i.is_turu], ['Yer', i.semt],
      ['Çalışma şekli', (i.calisma_sekli || []).map(function (m) { return MOD[m] || m; }).join(', ')],
      ['Web sitesi', gosterLink(i.site) || 'Yok'], ['Instagram', i.instagram || 'Yok'],
      ['Google profili', i.google_profil ? 'Eklendi' : 'Eklenmedi']
    ];
    var dl = $('ozet'); dl.innerHTML = '';
    satirlar.forEach(function (s) { dl.appendChild(el('dt', s[0])); dl.appendChild(el('dd', s[1] || '-')); });

    // Ölçülecekler
    var m = i.calisma_sekli || [];
    var olc = [];
    if (m.indexOf('gelir') >= 0 || m.indexOf('giderim') >= 0) olc.push(['Google Haritalar sıranız', 'Çevrenizden arayanlar sizi kaçıncı görüyor']);
    olc.push(['Google arama sıranız', '"' + isK + ' ' + (i.semt === 'Türkiye geneli' ? '' : (i.semt || '').split(',')[0]) + '" gibi aramalarda']);
    olc.push(['Yapay zekâ cevapları', 'ChatGPT ve Gemini sizi öneriyor mu']);
    if (i.site) olc.push(['Site sağlığı', gosterLink(i.site) + ' sitesinin hataları']);
    if (m.indexOf('online') >= 0) olc.push(['Platformlardaki yeriniz', 'Sektör sitelerinde ve rehberlerde profiliniz']);
    if (i.instagram) olc.push(['Instagram', 'Profilinizin Google ile bağlantısı']);
    var ul = $('olcumler'); ul.innerHTML = '';
    olc.forEach(function (o) { var li = el('li'); li.appendChild(el('b', o[0])); li.appendChild(el('span', o[1])); ul.appendChild(li); });

    // Şimdiden yapılabilecek işler (ölçüm gerektirmeyen, herkes için doğru adımlar)
    var isler = [];
    if (!i.google_profil && m.indexOf('online') < 0) isler.push({ t: 'Google İşletme Profilinizi kontrol edin', s: 'Yaklaşık 10 dakika', n: 'Google Haritalar’da işletmenizi arayın. Çıkmıyorsa business.google.com adresinden ücretsiz profil açın. Çıkıyorsa linkini bize ekleyin.', l: 'kurulum.html?adim=4', lm: 'Linki ekle' });
    isler.push({ t: 'Adres ve telefonunuzu her yerde aynı yazın', s: 'Yaklaşık 15 dakika', n: 'Google profilinizde, sitenizde ve Instagram’da adres ve telefon birebir aynı olmalı. Yapay zekâ farklı yazılmış bilgiye daha az güveniyor.' });
    isler.push({ t: 'Son 3 Google yorumunuza cevap verin', s: 'Yaklaşık 10 dakika', n: 'Cevaplanmış yorumlar hem müşteriye hem de yapay zekâya ilgili bir işletme olduğunuzu gösterir. Kısa ve samimi yazmanız yeterli.' });
    if (!i.site) isler.push({ t: 'Siteniz yoksa endişelenmeyin', s: 'Bilgi', n: 'Sitesi olmayan işletmeler de Google profili ve Instagram’la öneriliyor. Ölçümden sonra site gerekip gerekmediğini size söyleyeceğiz.' });
    var kutu = $('isler'); kutu.innerHTML = '';
    isler.forEach(function (x, k) {
      var d = el('div', null, 'is-satir');
      var no = el('span', String(k + 1), 'is-no');
      var g = el('div', null, 'is-govde');
      g.appendChild(el('b', x.t)); g.appendChild(el('small', x.s)); g.appendChild(el('p', x.n));
      if (x.l) { var a = el('a', x.lm + ' →'); a.href = x.l; g.appendChild(a); }
      d.appendChild(no); d.appendChild(g); kutu.appendChild(d);
    });

    // İletişim
    var ilet = 'E-posta: ' + oturum.user.email + '. ';
    ilet += i.whatsapp ? 'WhatsApp: ' + i.whatsapp + ', ' + SIKLIK[i.mesaj_sikligi || 'haftalik'] + '.' : 'WhatsApp numarası eklemediniz.';
    $('iletisim').textContent = ilet;
  }

  $('cikis').addEventListener('click', function () { A.cikis(); });

  var oturum;
  A.girisGerekli().then(function (s) { oturum = s; return A.isletmeGetir(); }).then(function (i) {
    if (!i || !i.kurulum_bitti) { location.replace(A.KOK + 'kurulum.html'); return; }
    ciz(oturum, i);
    $('yukleniyor').hidden = true; $('panel').hidden = false;
  }).catch(function (err) {
    if (err && err.message === 'oturum-yok') return;
    $('yukleniyor').textContent = A.hataMetni(err);
  });
})();
