// Görünür: müşteri paneli. İşletme bilgisi + gerçek ölçüm sonuçları.
(function () {
  'use strict';
  var A = window.GorunurAuth;
  var $ = function (id) { return document.getElementById(id); };
  var MOD = { gelir: 'Bana gelirler', giderim: 'Ben onlara giderim', online: 'Online çalışırım' };
  var SIKLIK = { haftalik: 'her pazartesi kısa bir özet', onemli: 'sadece önemli bir şey olunca', yok: 'mesaj göndermeyeceğiz' };
  var oturum, isletme;

  function el(tag, metin, sinif) { var e = document.createElement(tag); if (metin != null) e.textContent = metin; if (sinif) e.className = sinif; return e; }
  // Türkçe bulunma eki: son ünlüye göre -da/-de, sert ünsüzden sonra -ta/-te (Çorum’da, Kadıköy’de, Bağcılar’da, Ahmet’te)
  function yerde(semt) {
    if (semt === 'Türkiye geneli') return 'Türkiye’de';
    var ad = (semt || '').split(',')[0].trim(), kucuk = ad.toLocaleLowerCase('tr');
    var unluler = kucuk.match(/[aıoueiöü]/g) || ['e'], son = unluler[unluler.length - 1];
    var kalin = 'aıou'.indexOf(son) >= 0, sert = /[çfhkpsşt]$/.test(kucuk);
    return ad + '’' + (sert ? 't' : 'd') + (kalin ? 'a' : 'e');
  }
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

  // Bir işi çizer: başlık, süre, açıklama, madde madde yapılacaklar, kopyalanabilir hazır metin
  // "Yaptım" ile işaretlenen işler: { is_kodu: satır }
  var yapilanlar = {}, kutular = [];
  function isKodu(x) { return x.k || sadeK(x.t).replace(/ /g, '-').slice(0, 70); }
  function isEkle(kutu, isler) {
    kutu.innerHTML = '';
    kutu._isler = isler; if (kutular.indexOf(kutu) < 0) kutular.push(kutu);
    var acikVar = false; // her kutuda sadece yapılmamış ilk işin adımları açık; gerisi "Nasıl yapılır?" ile açılır
    isler.forEach(function (x, k) {
      var kod = isKodu(x), yap = !x.bilgi && yapilanlar[kod];
      var kapali = !yap && !x.bilgi && acikVar;
      if (!yap && !x.bilgi) acikVar = true;
      var d = el('div', null, 'is-satir' + (yap ? ' yapildi' : '') + (kapali ? ' kapali' : ''));
      d.appendChild(el('span', yap ? '✓' : String(k + 1), 'is-no'));
      var g = el('div', null, 'is-govde');
      g.appendChild(el('b', x.t)); if (x.s) g.appendChild(el('small', x.s));
      var anaG = g; g = el('div', null, 'is-detay'); anaG.appendChild(g);
      if (x.n) g.appendChild(el('p', x.n));
      if (x.siteler && x.siteler.length) {
        var ul = el('ul', null, 'site-liste');
        x.siteler.forEach(function (st) {
          var li = el('li');
          var a = el('a', st.ad); a.href = st.url; a.target = '_blank'; a.rel = 'noopener nofollow'; li.appendChild(a);
          li.appendChild(el('span', ' ' + st.alan, 'site-alan'));
          if (st.not) li.appendChild(el('small', st.not));
          ul.appendChild(li);
        });
        g.appendChild(ul);
      }
      if (x.adimlar && x.adimlar.length) {
        var ol = el('ol', null, 'adim-liste');
        x.adimlar.forEach(function (a) { ol.appendChild(el('li', a)); });
        g.appendChild(ol);
      }
      if (x.metin) {
        var hm = el('div', null, 'hazir-metin');
        hm.appendChild(el('span', x.metin.baslik, 'hazir-baslik'));
        hm.appendChild(el('p', x.metin.yazi));
        var kb = el('button', 'Kopyala', 'btn btn-cizgi kucuk-btn'); kb.type = 'button';
        kb.addEventListener('click', function () {
          var bitti = function () { kb.textContent = 'Kopyalandı'; setTimeout(function () { kb.textContent = 'Kopyala'; }, 1800); };
          if (navigator.clipboard) navigator.clipboard.writeText(x.metin.yazi).then(bitti, function () {}); else bitti();
        });
        hm.appendChild(kb); g.appendChild(hm);
      }
      if (x.sonuc) g.appendChild(el('p', 'Ne kazanırsınız: ' + x.sonuc, 'is-sonuc'));
      if (x.l) { var a = el('a', x.lm + ' →'); a.href = x.l; if (/^http/.test(x.l)) { a.target = '_blank'; a.rel = 'noopener'; } g.appendChild(a); }
      if (!x.bilgi) {
        var alt = el('div', null, 'is-alt');
        if (yap) {
          alt.appendChild(el('span', 'Yaptınız · ' + kisaTarih(yap.yapildi), 'pil pil-y'));
          var ac = el('button', 'Adımları göster', 'link-btn'); ac.type = 'button';
          ac.addEventListener('click', function () { var a = d.classList.toggle('acik'); ac.textContent = a ? 'Adımları gizle' : 'Adımları göster'; });
          var geri = el('button', 'Geri al', 'link-btn'); geri.type = 'button';
          geri.addEventListener('click', function () { geriAl(kod, geri); });
          alt.appendChild(ac); alt.appendChild(geri);
        } else {
          var yb = el('button', 'Yaptım', 'btn btn-amber kucuk-btn'); yb.type = 'button';
          yb.addEventListener('click', function () { yaptim(kod, x, yb); });
          if (kapali) {
            var nb = el('button', 'Nasıl yapılır?', 'btn btn-cizgi kucuk-btn'); nb.type = 'button';
            nb.addEventListener('click', function () { var a = d.classList.toggle('acik'); nb.textContent = a ? 'Adımları gizle' : 'Nasıl yapılır?'; });
            alt.appendChild(nb);
          }
          alt.appendChild(yb);
          if (!kapali) alt.appendChild(el('small', 'Bitirince işaretleyin, etkisini takip edelim.', 'is-ipucu'));
        }
        anaG.appendChild(alt);
      }
      d.appendChild(anaG); kutu.appendChild(d);
    });
  }
  function kisaTarihG(t) { return new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }); }
  function anlik() {
    var o = gecmis[0];
    return o ? { olcum_id: o.id || null, tarih: o.baslangic, harita_sira: o.harita_sira || null, arama_sira: o.arama_sira || null, yz_yuzde: o.yz_soru_sayisi ? Math.round(100 * (o.yz_gecen || 0) / o.yz_soru_sayisi) : null } : null;
  }
  function isleriYenile() {
    kutular.forEach(function (k) { if (k._isler) isEkle(k, k._isler); });
    yapilanCiz(); siradakiCiz(); isSayaci();
  }
  function yaptim(kod, x, btn) {
    btn.disabled = true; btn.textContent = 'Kaydediliyor…';
    A.sb.from('yapilan_isler').insert({ isletme_id: isletme.id, is_kodu: kod, baslik: String(x.t).slice(0, 200), onceki: anlik() }).select().single().then(function (r) {
      if (r.error && r.error.code !== '23505') throw r.error;
      if (r.data) yapilanlar[kod] = r.data; else yapilanlar[kod] = { is_kodu: kod, baslik: x.t, yapildi: new Date().toISOString(), onceki: anlik() };
      isleriYenile();
    }).catch(function (e) { btn.disabled = false; btn.textContent = 'Yaptım'; alert(A.hataMetni(e)); });
  }
  function geriAl(kod, btn) {
    var y = yapilanlar[kod]; if (!y) return;
    btn.disabled = true;
    A.sb.from('yapilan_isler').delete().eq('isletme_id', isletme.id).eq('is_kodu', kod).then(function (r) {
      if (r.error) throw r.error;
      delete yapilanlar[kod]; isleriYenile();
    }).catch(function (e) { btn.disabled = false; alert(A.hataMetni(e)); });
  }
  // Yapılan işin etkisi: işaretlendiği andaki ölçüm ile sonraki son ölçümü karşılaştırır
  function etkiYaz(y) {
    var gun = Math.floor((Date.now() - new Date(y.yapildi).getTime()) / 864e5);
    var once = y.onceki || null;
    var sonra = gecmis.filter(function (o) { return new Date(o.baslangic) > new Date(y.yapildi); })[0];
    if (gun < 7) return { pil: 'Bekleniyor', sinif: 'pil-a', yazi: 'İlk bakış ' + (7 - gun) + ' gün sonra. Google’ın değişikliği fark etmesi zaman alır.' };
    if (!sonra) return { pil: 'Ölçüm bekleniyor', sinif: 'pil-a', yazi: 'Sıradaki haftalık ölçümden sonra etkisini burada göreceksiniz.' };
    var net = gun >= 28;
    var parca = [];
    var hs = function (v) { return v ? v + '.' : 'ilk 20’de yok'; };
    if (once) {
      var a = once.harita_sira, b = sonra.harita_sira;
      parca.push('Haritalar: ' + (a === (b || null) ? 'değişmedi (' + hs(b) + ')' : hs(a) + ' → ' + hs(b)));
      var yz2 = sonra.yz_soru_sayisi ? Math.round(100 * (sonra.yz_gecen || 0) / sonra.yz_soru_sayisi) : null;
      if (once.yz_yuzde != null && yz2 != null) parca.push('yapay zekâ: ' + (once.yz_yuzde === yz2 ? 'değişmedi (%' + yz2 + ')' : '%' + once.yz_yuzde + ' → %' + yz2));
    } else parca.push('İşaretlediğinizde ölçüm yoktu; şu an haritalarda ' + hs(sonra.harita_sira));
    var iyi = once && ((sonra.harita_sira && (!once.harita_sira || sonra.harita_sira < once.harita_sira)) || (sonra.yz_soru_sayisi && once.yz_yuzde != null && Math.round(100 * (sonra.yz_gecen || 0) / sonra.yz_soru_sayisi) > once.yz_yuzde));
    return { pil: net ? 'Net sonuç' : 'İlk bakış', sinif: iyi ? 'pil-y' : 'pil-a', yazi: parca.join(', ') + '.' + (!net ? ' Net sonuç 4 hafta dolunca (' + kisaTarihG(new Date(new Date(y.yapildi).getTime() + 28 * 864e5)) + ').' : (iyi ? '' : ' Bazı işlerin etkisi daha geç görünür; diğer işlerle birlikte devam edin.')) };
  }
  function yapilanCiz() {
    var liste = Object.keys(yapilanlar).map(function (k) { return yapilanlar[k]; }).sort(function (a, b) { return new Date(b.yapildi) - new Date(a.yapildi); });
    $('yapilan-kart').hidden = !liste.length;
    $('yapilan-sayi').textContent = liste.length + ' iş';
    var kutu = $('yapilan-liste'); kutu.innerHTML = '';
    liste.forEach(function (y) {
      var e = etkiYaz(y), d = el('div', null, 'yapilan');
      var ust = el('div', null, 'yapilan-ust');
      ust.appendChild(el('b', y.baslik || y.is_kodu)); ust.appendChild(el('span', e.pil, 'pil ' + e.sinif));
      d.appendChild(ust);
      d.appendChild(el('small', kisaTarihG(y.yapildi) + ' tarihinde yaptınız'));
      d.appendChild(el('p', e.yazi));
      kutu.appendChild(d);
    });
  }
  // Ekrandaki önerilen işlerden kaç tanesi yapıldı
  function onerilenler() {
    var gor = {}, out = [];
    var sira = ['olcum-isler', 'yz-isler', 'isler'];
    kutular.slice().sort(function (a, b) { return sira.indexOf(a.id) - sira.indexOf(b.id); }).forEach(function (k) { (k._isler || []).forEach(function (x) { if (x.bilgi) return; var kod = isKodu(x); if (!gor[kod]) { gor[kod] = 1; out.push({ kod: kod, x: x }); } }); });
    return out;
  }
  function isSayaci() {
    var l = onerilenler(), kalan = l.filter(function (z) { return !yapilanlar[z.kod]; }).length;
    $('isler-sayi').textContent = kalan; $('isler-sayi').hidden = !kalan;
    $('isler-ozet').textContent = l.length ? 'Size özel ' + l.length + ' işten ' + (l.length - kalan) + ' tanesini yaptınız.' + (kalan ? ' Sırayla gidin; en önemlisi en üstte.' : ' Hepsi tamam, harika. Haftalık ölçümlerde etkisini izleyin.') : '';
  }
  // Özet sayfasında: yapılmamış en önemli iş
  function siradakiCiz() {
    var kutu = $('siradaki-is'); if (!kutu) return;
    var ilk = onerilenler().filter(function (z) { return !yapilanlar[z.kod]; })[0];
    $('siradaki-kart').hidden = !ilk;
    if (!ilk) return;
    $('siradaki-not').textContent = 'Ölçüme göre şu an en çok işinize yarayacak adım:';
    var eski = kutular.indexOf(kutu); if (eski >= 0) kutular.splice(eski, 1);
    isEkle(kutu, [ilk.x]); kutular.splice(kutular.indexOf(kutu), 1); kutu._isler = null;
  }

  function yerAdi(i) { return i.semt === 'Türkiye geneli' ? 'Türkiye' : (i.semt || '').split(',')[0].trim(); }

  // Hazır işler: dükkân sahibinin anlayacağı dille, madde madde
  var IS = {
    googleProfil: function (i, b) {
      var yer = yerAdi(i);
      return { k: 'google-profil', t: yer + ' mağazanız için Google’da kendi profilinizi açın', s: 'En önemli iş · 30 dakika · ücretsiz',
        n: b && b.baska_sube ? 'Google’da "' + i.ad + '" diye arayınca sadece "' + b.baska_sube.ad + '" çıkıyor' + (b.baska_sube.adres ? ' (' + b.baska_sube.adres.split(',').slice(-2).join(',').trim() + ')' : '') + '. ' + yer + ' mağazanız haritada yok gibi görünüyor, müşteri sizi bulamıyor.' : 'Google Haritalar’da "' + i.ad + '" adıyla ' + yer + ' bölgesinde bir işletme bulamadık. Müşteri sizi haritada göremiyor.',
        adimlar: [
          'Önce telefonunuzda Google Haritalar’ı açıp mağazanızın adını yazın. Mağazanız çıkıyorsa altındaki "Bu işletmenin sahibi misiniz?" yazısına basıp sahiplenin, sonra 4. adıma geçin.',
          'Çıkmıyorsa bilgisayardan ya da telefondan business.google.com adresine Gmail hesabınızla girip "İşletme ekle" deyin.',
          'İşletme adını tabelanızdaki gibi yazın (örnek: "' + i.ad + ' ' + yer + '"). Kategori olarak işinize en yakın olanı seçin (örnek: "' + (i.is_turu || 'Mağaza') + '").',
          'Adresi, telefonu ve çalışma saatlerini girin. Telefon, müşterinin sizi aradığı numara olsun.',
          'Google sizden doğrulama isteyecek. Genelde dükkânınızı, tabelanızı ve içeriyi gösteren kısa bir video çekmenizi ister. Telefonla çekip gönderin.',
          'Onay gelince en az 10 fotoğraf ekleyin: tabela, vitrin, içerisi, ürünler, siz ve çalışanlarınız.'
        ],
        sonuc: 'Haritada "' + yer + ' ' + (i.is_turu || '').toLocaleLowerCase('tr') + '" arayanlar sizi görmeye başlar. Diğer bütün adımlar bu profilin üstüne kurulur.',
        l: 'https://business.google.com', lm: 'Google İşletme Profili' };
    },
    yorum: function (i, benim, ort) {
      return { k: 'yorum', t: 'Her hafta 3-5 yeni Google yorumu toplayın', s: 'Her hafta · 10 dakika',
        n: benim != null ? 'Sizin ' + sayi(benim) + ' yorumunuz var, haritada öndeki 3 işletmenin ortalaması ' + sayi(ort) + '. Google ve yapay zekâ, çok ve yeni yorumu olan işletmeyi öne çıkarıyor.' : 'Google ve yapay zekâ, çok ve yeni yorumu olan işletmeyi öne çıkarıyor.',
        adimlar: [
          'Google İşletme Profilinize girin ve "Yorum iste" ya da "Yorum bağlantısını paylaş" yazan yerden bağlantınızı kopyalayın.',
          'Satıştan veya teslimattan sonra memnun kalan müşterinize aşağıdaki mesajı WhatsApp’tan gönderin. Mesajdaki [yorum bağlantınız] yazan yere kopyaladığınız bağlantıyı yapıştırın.',
          'Aynı bağlantıyı bir QR koda çevirip kasanın yanına koyun. "QR kod oluştur" diye aratırsanız ücretsiz siteler çıkar.',
          'Gelen her yoruma 2 gün içinde kısa bir teşekkürle cevap verin. Kötü yorumlara tartışmadan, çözüm teklif ederek cevap verin.'
        ],
        metin: { baslik: 'Müşteriye gönderilecek hazır mesaj', yazi: 'Merhaba, ' + i.ad + ' olarak bizi tercih ettiğiniz için teşekkür ederiz. Memnun kaldıysanız Google’da 1 dakikanızı ayırıp kısa bir yorum yazar mısınız? Bu bize çok yardımcı oluyor: [yorum bağlantınız]' },
        sonuc: 'Haritada öne geçmenin en hızlı yolu. Yapay zekâ da önerirken yorum sayısına ve puana bakıyor.' };
    },
    puan: function (i, benim, ort) {
      return { k: 'puan', t: 'Puanınızı yükseltin', s: '20 dakika, sonra haftada 5 dakika',
        n: 'Puanınız ' + String(benim).replace('.', ',') + ', öndekilerin ortalaması ' + ort.toFixed(1).replace('.', ',') + '.',
        adimlar: [
          'Google İşletme Profilinizdeki yorumlar bölümünü açın.',
          'Cevapsız kalan bütün yorumlara cevap yazın. İyi yorumlara teşekkür edin.',
          'Kötü yorumlarda özür dileyin ve çözüm teklif edin. Örnek: "Yaşadığınız sorun için üzgünüz, 05xx numaramızdan bize ulaşırsanız hemen ilgilenelim."',
          'Sorunu çözdüğünüz müşteriden yorumunu güncellemesini rica edin.'
        ],
        sonuc: 'Puanı düşük işletmeyi hem müşteri hem yapay zekâ atlıyor. Cevap verilen kötü yorumlar güven verir.' };
    },
    siteBaslik: function (i, sorgu) {
      var yer = yerAdi(i);
      return { k: 'site-baslik', t: 'Sitenizin Google’da görünen başlığını düzeltin', s: '15 dakika (sitenizi yapan kişi için)',
        n: '"' + sorgu + '" aramasında sitenizi ilk sonuçlarda göremedik. Google, sitenizin başlığında işinizi ve şehrinizi görmek istiyor.',
        adimlar: [
          'Sitenizi kim yaptıysa (ajans, tanıdık, siz) aşağıdaki mesajı ona gönderin.',
          'Değişiklik yapılınca 2-4 hafta bekleyin. Görünür bir sonraki ölçümlerde farkı gösterecek.'
        ],
        metin: { baslik: 'Sitenizi yapan kişiye gönderilecek mesaj', yazi: 'Merhaba, sitemizin ana sayfa başlığını (title) ve açıklamasını (meta description) şöyle değiştirebilir misiniz? Başlık: "' + i.ad + ' | ' + yer + ' ' + (i.is_turu || '') + '". Açıklama: "' + i.ad + ', ' + yer + ' bölgesinde ' + (i.is_turu || 'hizmet').toLocaleLowerCase('tr') + '. Adres, telefon ve çalışma saatlerimiz sitemizde." Ayrıca ana sayfada adresimiz, telefonumuz ve çalışma saatlerimiz yazı olarak (resim değil) görünsün. Teşekkürler.' },
        sonuc: 'Google aramasında sitenizin çıkma şansı artar.' };
    },
    siteYok: function (i) {
      return { k: 'site-yok', t: 'Tek sayfalık basit bir web sitesi açın', s: 'Yarım gün · ücretsiz veya düşük ücretli',
        n: 'Siteniz yok. Google aramasında ve yapay zekâ cevaplarında en çok kaynak gösterilen şey işletmelerin kendi siteleri.',
        adimlar: [
          'Google İşletme Profilinizin içinden ücretsiz basit site açılabiliyor mu bakın. Açılamıyorsa Wix, Ticimax veya bir tanıdığınızdan tek sayfalık site yaptırın.',
          'Sayfada şunlar yazı olarak olsun: ne sattığınız veya hangi hizmeti verdiğiniz, açık adres, telefon, çalışma saatleri.',
          'Müşterilerin en çok sorduğu 5 soruyu ve cevaplarını ekleyin (örnek: "Teslimat var mı?", "Taksit yapıyor musunuz?").',
          'Sitenin adresini Google İşletme Profilinize ve Instagram’ınıza ekleyin.'
        ],
        sonuc: 'Google aramasında çıkmaya başlarsınız ve yapay zekâ sizin hakkınızda okuyacak bir kaynak bulur.' };
    },
    bing: function (i) {
      return { k: 'bing', t: 'Bing Haritalar’da işletme hesabı açın', s: '15 dakika · ücretsiz',
        n: 'ChatGPT, işletme bilgilerini büyük ölçüde Bing Haritalar’dan alıyor. Bing’de yoksanız ChatGPT sizi pek bilmiyor.',
        adimlar: [
          'bingplaces.com adresine girin. Gmail ya da Hotmail/Outlook hesabınızla giriş yapın.',
          'Google İşletme Profiliniz varsa "Google’dan içe aktar" seçeneğini seçin. Bilgileriniz kendiliğinden gelir.',
          'Profiliniz yoksa işletmenizi elle ekleyin. Adı, adresi ve telefonu Google’daki ile harfi harfine aynı yazın.',
          'Bing sizden doğrulama ister (telefon, e-posta ya da kod). İstenen kodu girin.'
        ],
        sonuc: 'ChatGPT’ye "' + yerAdi(i) + ' ' + (i.is_turu || '').toLocaleLowerCase('tr') + '" sorulduğunda listeye girme şansınız doğar.',
        l: 'https://www.bingplaces.com', lm: 'Bing Places' };
    },
    digerHaritalar: function () {
      return { k: 'apple-yandex', t: 'Apple Haritalar ve Yandex Haritalar’a ekleyin', s: '20 dakika · ücretsiz',
        n: 'iPhone kullananlar ve Siri Apple Haritalar’a, Türkiye’de birçok kişi Yandex Haritalar’a bakıyor.',
        adimlar: [
          'Apple için businessconnect.apple.com adresine Apple kimliğinizle (iPhone’unuzdaki hesap) girin, "İşletme ekle" deyin, bilgilerinizi girin.',
          'Yandex için Google’a "Yandex işletme ekle" yazın, çıkan Yandex Business sayfasından ücretsiz kayıt olun.',
          'Her yerde adı, adresi ve telefonu Google’daki ile aynı yazın. Farklı yazılmış bilgi yapay zekânın kafasını karıştırır.'
        ],
        sonuc: 'Yapay zekâ sizi ne kadar çok yerde aynı bilgiyle görürse size o kadar güveniyor.',
        l: 'https://businessconnect.apple.com', lm: 'Apple Business Connect' };
    }
  };

  // Sektörünüzdeki rehber ve platform siteleri: araştırılmış liste + Google'da gerçekten çıkan liste sayfaları
  function rehberIsleri(i, o) {
    var isler = [];
    var sektor = (isletme.sektor_rehberleri || i.sektor_rehberleri || []);
    if (sektor.length) isler.push({
      k: 'sektor-siteleri', t: 'Sektörünüzün sitelerinde işletme hesabı açın', s: 'Her biri 15-20 dakika · çoğu ücretsiz',
      n: '"' + (i.is_turu || 'işletme') + '" işletmeleri için Türkiye’de müşterilerin baktığı siteleri araştırdık. Yapay zekâ ve Google bu sitelerdeki profilleri okuyor. Aşağıdakilerin her birinde hesabınız olsun:',
      siteler: sektor.map(function (x) { return { ad: x.ad, alan: x.alan, url: 'https://' + x.alan, not: x.ne_ise_yarar }; }),
      adimlar: [
        'Listedeki her siteye girin ve "Firma ekle", "İşletme kaydı", "Satıcı ol" ya da "Hizmet veren ol" yazan bölümü bulun.',
        'İşletme adını, adresi ve telefonu Google’daki ile harfi harfine aynı yazın.',
        'Ürün veya hizmetlerinizi, fotoğraflarınızı ve çalışma saatlerinizi ekleyin.',
        'Müşterilerinizden bu sitelerde de yorum isteyin.'
      ],
      sonuc: 'Yapay zekâ sizi ne kadar çok güvenilir sitede görürse o kadar çok öneriyor.'
    });
    var tum = o.rehber_sayfalari || [];
    var sayfalar = tum.filter(function (x) { return x.tur !== 'rakip'; });
    var rakipSayfa = tum.filter(function (x) { return x.tur === 'rakip'; });
    if (rakipSayfa.length) isler.push({
      k: 'rakip-sayfa', t: 'Rakiplerinizin Google’da öne çıkan sayfasının benzerini yapın', s: '1-2 saat (sitenizi yapan kişi için)',
      n: 'Bu rakipler kendi sitelerine aramayla aynı başlıkta bir sayfa açmış ve Google’da üst sıralara çıkmış:',
      siteler: rakipSayfa.map(function (x) { return { ad: x.baslik, alan: x.alan, url: 'https://' + x.alan, not: '"' + x.kelime + '" aramasında ' + x.sira + '. sırada.' }; }),
      adimlar: [
        'Bu sayfaları açıp bakın: başlıkta şehir ve iş adı geçiyor, içinde ürünler, adres ve telefon var.',
        'Sitenizi yapan kişiye aşağıdaki mesajı gönderin.',
        'Sayfa yayına girince 3-4 hafta bekleyin; Görünür haftalık ölçümde değişimi gösterecek.'
      ],
      metin: { baslik: 'Sitenizi yapan kişiye gönderilecek mesaj', yazi: 'Merhaba, sitemize "' + rakipSayfa[0].kelime.replace(/(^|\s)\S/g, function (h) { return h.toLocaleUpperCase('tr'); }) + '" başlıklı yeni bir sayfa ekleyebilir misiniz? Sayfada ' + yerAdi(i) + ' mağazamızın adresi, telefonu, çalışma saatleri, ürün gruplarımız (fotoğraflı), teslimat bölgelerimiz ve sık sorulan 5 soru ile cevapları olsun. Sayfa başlığı ve ana başlık aynı olsun. Teşekkürler.' },
      sonuc: 'Rakiplerinizin çıktığı aramalarda siz de Google’ın ilk sayfasına çıkma şansı yakalarsınız.'
    });
    if (sayfalar.length) isler.push({
      k: 'liste-sayfalari', t: 'Google’da çıkan liste sayfalarına adınızı ekletin', s: 'Sayfa başına 10 dakika',
      n: 'Müşterileriniz Google’da arama yapınca bu liste ve rehber sayfalarını görüyor. Bu sayfalarda sizin adınızı göremedik:',
      siteler: sayfalar.map(function (x) { return { ad: x.baslik, alan: x.alan, url: 'https://' + x.alan, not: '"' + x.kelime + '" aramasında ' + x.sira + '. sırada çıkıyor.' }; }),
      adimlar: [
        'Her sayfayı açın ve listede işletmenizin olup olmadığına bakın.',
        'Yoksa sayfadaki "Firma ekle", "Ücretsiz kayıt" ya da "İletişim" bölümünden işletmenizi ekleyin veya eklenmesini isteyin.',
        'Varsa adres ve telefonunuzun doğru yazıldığını kontrol edin.'
      ],
      sonuc: 'Google aramasında listelerden gelen müşterilere de görünürsünüz; yapay zekâ bu listeleri sık kaynak gösteriyor.'
    });
    return isler;
  }

  // Ölçüm sonucundan yapılacaklar çıkarır (sadece ölçülen farka dayanır)
  function olcumIsleri(o, i) {
    var isler = [];
    var b = o.isletme_bilgi || {};
    var ilk3 = (o.harita_sonuclar || []).filter(function (r) { return !r.siz; }).slice(0, 3);
    var ortYorum = ilk3.length ? Math.round(ilk3.reduce(function (t, r) { return t + (r.yorum || 0); }, 0) / ilk3.length) : null;
    var ortPuan = ilk3.length ? ilk3.reduce(function (t, r) { return t + (r.puan || 0); }, 0) / ilk3.length : null;
    if (b.bulundu === false) isler.push(IS.googleProfil(i, b));
    if (b.bulundu && ortYorum != null && (b.yorum || 0) < ortYorum) isler.push(IS.yorum(i, b.yorum || 0, ortYorum));
    if (b.bulundu && b.puan != null && ortPuan != null && b.puan + 0.1 < ortPuan) isler.push(IS.puan(i, b.puan, ortPuan));
    if (o.arama_sira == null && !i.site) isler.push(IS.siteYok(i));
    else if (o.arama_sira == null && i.site) isler.push(IS.siteBaslik(i, o.arama_sorgu || ''));
    if (o.yz_soru_sayisi && o.yz_gecen === 0) isler.push(IS.bing(i));
    if (o.harita_sira && o.harita_sira <= 3 && o.yz_gecen > 0) {
      isler.push({ k: 'koru', t: 'İyi durumdasınız, yerinizi koruyun', s: 'Her hafta', n: 'Haritalarda ilk 3’tesiniz ve yapay zekâ sizi öneriyor. Bunu korumak için:', adimlar: ['Her hafta birkaç yeni Google yorumu toplamaya devam edin.', 'Ayda 2-3 yeni fotoğraf ekleyin.', 'Kampanya veya yeni ürün olunca Google profilinizde "Güncelleme" paylaşın.'] });
    }
    return isler.slice(0, 4);
  }

  // Yapay zekâda önerilmek için somut adımlar; sektöre göre rehber önerir
  function yzYolu(o, i) {
    var t = sadeK(i.is_turu || '');
    var yer = yerAdi(i);
    var isK = (i.is_turu || 'işletme').toLocaleLowerCase('tr');
    var cek = isK.split(/\s+/).filter(function (k) { return k && EKLER.indexOf(k) < 0; }).join(' ') || isK;
    var adimlar = [IS.bing(i), IS.digerHaritalar(i)];
    var arastirilmis = rehberIsleri(i, o);
    if (arastirilmis.length) adimlar = adimlar.concat(arastirilmis);
    else if (/(dis|doktor|hekim|klinik|psikolog|diyetisyen|fizyoterap|estetik|saglik)/.test(t) && !/veteriner/.test(t))
      adimlar.push({ t: 'Doktortakvimi’nde profil açın', s: '20 dakika', n: 'Sağlık alanında Google ve yapay zekâ en çok Doktortakvimi profillerini ve yorumlarını gösteriyor.', adimlar: ['doktortakvimi.com adresine girip "Doktor musunuz?" ya da "Klinik ekle" bölümünden ücretsiz kayıt olun.', 'Uzmanlık alanlarınızı, ' + yer + ' adresinizi ve muayene ücretinizi ekleyin.', 'Hastalarınızdan orada da yorum isteyin.'], l: 'https://www.doktortakvimi.com', lm: 'Doktortakvimi' });
    else if (/(tadilat|temizlik|nakliyat|boya|tesisat|elektrik|usta|montaj|tamir|tamirat|ders|fotograf|dugun|organizasyon|bahce|klima|cilingir)/.test(t))
      adimlar.push({ t: 'Armut’ta hizmet veren hesabı açın', s: '20 dakika', n: 'Hizmet işlerinde Armut profilleri ve yorumları aramalarda ve yapay zekâ cevaplarında sık geçiyor.', adimlar: ['armut.com adresine girip "Hizmet veren ol" bölümünden kayıt olun.', 'Verdiğiniz her hizmeti ayrı ayrı seçin ve ' + yer + ' bölgesini işaretleyin.', 'İşlerinizin fotoğraflarını ekleyin, işi bitirdiğiniz müşterilerden Armut’ta yorum isteyin.'], l: 'https://armut.com', lm: 'Armut' });
    else if (/(restoran|kafe|cafe|lokanta|pastane|otel|pansiyon|bar|meyhane|kebap|doner|pide|balik)/.test(t))
      adimlar.push({ t: 'Tripadvisor’da işletmenizi sahiplenin', s: '15 dakika', n: 'Yeme-içme ve konaklamada yapay zekâ Tripadvisor yorumlarını sıkça kaynak gösteriyor.', adimlar: ['Google’a "Tripadvisor işletme sahiplen" yazın ve çıkan sayfadan işletmenizi arayın.', 'Çıkarsa "Sahiplen", çıkmazsa "İşletme ekle" deyin.', 'Menü, fotoğraf ve çalışma saatlerini ekleyin. Yorumlara cevap verin.'], l: 'https://www.tripadvisor.com.tr/Owners', lm: 'Tripadvisor işletme' });
    else
      adimlar.push({ t: 'Şikayetvar’daki şikâyetlere cevap verin', s: 'Haftada 10 dakika', n: 'Müşteriler ve yapay zekâ "güvenilir mi?" sorusunda Şikayetvar’a bakıyor.', adimlar: ['Google’a "Şikayetvar ' + i.ad + '" yazın. Markanızın sayfası çıkıyorsa Şikayetvar’ın "Marka girişi" bölümünden kurumsal hesap açın.', 'Cevapsız şikâyetlere kısa, kibar ve çözüm teklif eden cevaplar yazın.', 'Sorunu çözünce müşteriden şikâyeti "çözüldü" olarak işaretlemesini rica edin.'], l: 'https://www.sikayetvar.com', lm: 'Şikayetvar' });
    adimlar.push(i.site
      ? { k: 'site-sayfa', t: 'Sitenize "' + yer + ' ' + cek + '" sayfası ekletin', s: '1-2 saat (sitenizi yapan kişi için)', n: 'Gemini önerirken en çok işletmelerin kendi sitelerini kaynak gösteriyor.', adimlar: ['Sitenizi kim yaptıysa aşağıdaki mesajı ona gönderin.', 'Sayfa yayına girince bağlantısını Google İşletme Profilinize ekleyin.'], metin: { baslik: 'Sitenizi yapan kişiye gönderilecek mesaj', yazi: 'Merhaba, sitemize "' + yer + ' ' + cek + '" başlıklı yeni bir sayfa ekleyebilir misiniz? Sayfada şunlar yazı olarak olsun: ' + yer + ' mağazamızın açık adresi, telefonu, çalışma saatleri, sattığımız ürün grupları veya verdiğimiz hizmetler, teslimat/servis bölgelerimiz ve müşterilerin sık sorduğu 5 soru ile cevapları. Sayfa başlığı: "' + i.ad + ' ' + yer + ' | ' + (i.is_turu || '') + '". Teşekkürler.' } }
      : IS.siteYok(i));
    adimlar.push({ t: 'Şehrinizdeki listelerde ve haberlerde adınız geçsin', s: 'Ayda 1 deneme', n: '"En iyi ' + cek + ' yerleri" gibi yazılar ve yerel haber siteleri yapay zekânın en çok okuduğu kaynaklar arasında.', adimlar: ['Google’a "' + yer + ' en iyi ' + cek + '" yazın. Çıkan liste yazılarını ve yerel haber sitelerini not edin.', 'Bu sitelere ve şehrinizin popüler Instagram sayfalarına telefonla veya mesajla ulaşın, işletmenizi tanıtmalarını isteyin.', 'Açılış, kampanya veya yardım kampanyası gibi haber olacak bir şey yaptığınızda yerel gazetelere haber verin.'] });
    return adimlar;
  }

  var gecmis = [];
  function kisaTarih(t) { return new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }); }
  // Basit çizgi grafik (SVG). ters=true ise küçük değer yukarıda (sıra için)
  function cizgiGrafik(kutu, noktalar, ayar) {
    var NS = 'http://www.w3.org/2000/svg', G = 560, Y = 170, sol = 38, sag = 14, ust = 14, alt = 30;
    var svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 ' + G + ' ' + Y); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', ayar.etiket);
    function e(ad, at, metin) { var x = document.createElementNS(NS, ad); for (var k in at) x.setAttribute(k, at[k]); if (metin != null) x.textContent = metin; svg.appendChild(x); return x; }
    var yx = function (v) { var o = (v - ayar.min) / (ayar.max - ayar.min); if (ayar.ters) o = 1 - o; return ust + (1 - o) * (Y - ust - alt); };
    ayar.cizgiler.forEach(function (v) { var y = yx(v); e('line', { x1: sol, x2: G - sag, y1: y, y2: y, 'class': 'g-izgi' }); e('text', { x: sol - 8, y: y + 4, 'text-anchor': 'end', 'class': 'g-yazi' }, ayar.etiketle(v)); });
    var n = noktalar.length, adim = n > 1 ? (G - sol - sag - 20) / (n - 1) : 0;
    var xs = noktalar.map(function (_, k) { return n > 1 ? sol + 10 + k * adim : (sol + G - sag) / 2; });
    var yol = '';
    noktalar.forEach(function (p, k) { var y = yx(p.v); yol += (yol ? ' L' : 'M') + xs[k] + ' ' + y; });
    if (n > 1) e('path', { d: yol, 'class': 'g-cizgi' });
    noktalar.forEach(function (p, k) {
      var y = yx(p.v);
      e('circle', { cx: xs[k], cy: y, r: 5, 'class': p.bos ? 'g-nokta bos' : 'g-nokta' });
      e('text', { x: xs[k], y: y - 10, 'text-anchor': 'middle', 'class': 'g-deger' }, p.yazi);
      if (n <= 8 || k === 0 || k === n - 1 || k % 2 === 0) e('text', { x: xs[k], y: Y - 8, 'text-anchor': 'middle', 'class': 'g-yazi' }, p.t);
    });
    kutu.innerHTML = ''; kutu.appendChild(svg);
  }
  function gelisimCiz() {
    var liste = gecmis.slice(0, 12).reverse();
    var son = gecmis[0];
    var sonraki = son ? new Date(new Date(son.baslangic).getTime() + 7 * 864e5) : null;
    var ilkHarita = liste.find(function (o) { return o.harita_sonuclar; }), sonHarita = gecmis.find(function (o) { return o.harita_sonuclar; });
    var not;
    if (liste.length < 2) not = 'Bu ilk ölçümünüz. Her hafta otomatik olarak yeniden ölçüyoruz' + (sonraki ? ' (sıradaki: ' + kisaTarih(sonraki) + ')' : '') + '. Yaptığınız işlerin etkisini burada hafta hafta göreceksiniz.';
    else {
      var a = ilkHarita && ilkHarita.harita_sira, b = sonHarita && sonHarita.harita_sira;
      var fark = a && b ? (a > b ? 'Haritalarda ' + (a - b) + ' sıra yükseldiniz.' : a < b ? 'Haritalarda ' + (b - a) + ' sıra geriye düştünüz.' : 'Haritalardaki sıranız değişmedi.') : (!a && b ? 'Haritalarda ilk 20’ye girdiniz, şu an ' + b + '. sıradasınız.' : (a && !b ? 'Haritalarda ilk 20’nin dışına düştünüz.' : 'Haritalarda henüz ilk 20’de değilsiniz.'));
      not = kisaTarih(liste[0].baslangic) + ' tarihinden bu yana ' + liste.length + ' ölçüm. ' + fark + (sonraki ? ' Sıradaki otomatik ölçüm: ' + kisaTarih(sonraki) + '.' : '');
    }
    $('gelisim-not').textContent = not;
    cizgiGrafik($('grafik-harita'), liste.filter(function (o) { return o.harita_sonuclar; }).map(function (o) {
      return { v: o.harita_sira || 21, bos: !o.harita_sira, yazi: o.harita_sira ? o.harita_sira + '.' : 'yok', t: kisaTarih(o.baslangic) };
    }), { min: 1, max: 21, ters: true, cizgiler: [1, 5, 10, 20], etiketle: function (v) { return v === 1 ? '1.' : v + '.'; }, etiket: 'Haritalardaki sıra' });
    cizgiGrafik($('grafik-yz'), liste.filter(function (o) { return o.yz_soru_sayisi; }).map(function (o) {
      var y = Math.round(100 * o.yz_gecen / o.yz_soru_sayisi); return { v: y, bos: !y, yazi: '%' + y, t: kisaTarih(o.baslangic) };
    }), { min: 0, max: 100, cizgiler: [0, 50, 100], etiketle: function (v) { return '%' + v; }, etiket: 'Yapay zekâ önerme oranı' });
  }
  function yzYuzde(o) { return o && o.yz_soru_sayisi ? Math.round(100 * (o.yz_gecen || 0) / o.yz_soru_sayisi) : null; }
  function yzGruplar(o) {
    var g = [], bul = {};
    (o.yz_cevaplar || []).forEach(function (c) { if (!c) return; if (!bul[c.soru]) { bul[c.soru] = { soru: c.soru, cevaplar: [] }; g.push(bul[c.soru]); } bul[c.soru].cevaplar.push(c); });
    return g;
  }
  // Son 4 haftadaki ölçümlerin ortalama önerilme oranı (en az 2 ölçüm varsa)
  function dortHafta(o) {
    var son = new Date(o.baslangic).getTime();
    var l = gecmis.concat([o]).filter(function (x, k, a) { return x.yz_soru_sayisi && son - new Date(x.baslangic).getTime() < 28 * 864e5 && son >= new Date(x.baslangic).getTime() && a.findIndex(function (y) { return y === x || (x.id && y.id === x.id); }) === k; });
    if (l.length < 2) return null;
    var t = 0, n = 0; l.forEach(function (x) { t += x.yz_gecen || 0; n += x.yz_soru_sayisi; });
    return { yuzde: Math.round(100 * t / n), olcum: l.length };
  }
  function payCiz(o, i) {
    var kutu = $('yz-pay'); kutu.innerHTML = '';
    var n = o.yz_soru_sayisi || 0;
    $('yz-pay-kart').hidden = !n;
    if (!n) return;
    var satirlar = [{ ad: i.ad + ' (siz)', sayi: o.yz_gecen || 0, siz: true }].concat((o.yz_rakipler || []).map(function (r) { return { ad: r.ad, sayi: r.sayi }; }));
    satirlar.sort(function (a, b) { return b.sayi - a.sayi || (b.siz ? 1 : 0) - (a.siz ? 1 : 0); });
    satirlar.forEach(function (r) {
      var d = el('div', null, 'pay-satir' + (r.siz ? ' siz' : ''));
      d.appendChild(el('span', r.ad, 'pay-ad'));
      var cubuk = el('span', null, 'pay-cubuk'); var dolu = el('i'); dolu.style.width = Math.max(2, Math.round(100 * r.sayi / n)) + '%'; cubuk.appendChild(dolu); d.appendChild(cubuk);
      d.appendChild(el('span', '%' + Math.round(100 * r.sayi / n), 'pay-sayi'));
      kutu.appendChild(d);
    });
    var onde = (o.yz_rakipler || []).filter(function (r) { return r.sayi > (o.yz_gecen || 0); });
    $('yz-pay-not').textContent = 'Yapay zekâdan müşteri gibi ' + n + ' cevap aldık ve her işletmenin kaç cevapta önerildiğini saydık (yüzde olarak). ' +
      (onde.length ? onde.length + ' rakibiniz sizden daha çok öneriliyor.' : (o.yz_gecen ? 'Rakiplerinizden daha çok öneriliyorsunuz.' : 'Rakiplerinizin adı da geçmiyorsa yapay zekâ bu bölgeyi henüz tanımıyor; ilk öne çıkan siz olabilirsiniz.'));
  }

  function sonucCiz(o) {
    var i = isletme, b = o.isletme_bilgi || {};
    var isK = (i.is_turu || '').toLocaleLowerCase('tr');
    $('olcum-tarih').textContent = 'Son ölçüm: ' + tarih(o.bitis || o.baslangic) + (o.kaynak === 'haftalik' ? ' · otomatik' : '');
    var c;
    if (o.harita_sira) c = yerde(i.semt) + ' "' + o.harita_sorgu + '" aramasında Google Haritalar’da ' + o.harita_sira + '. sıradasınız.';
    else if (b.bulundu === false && b.baska_sube) c = yerde(i.semt) + ' "' + i.ad + '" profilini bulamadık. Google’da sadece "' + b.baska_sube.ad + '" görünüyor' + (b.baska_sube.adres ? ' (' + b.baska_sube.adres.split(',').slice(-2).join(',').trim() + ')' : '') + '.';
    else if (b.bulundu === false) c = 'Google Haritalar’da "' + i.ad + '" adıyla bir profil bulamadık.';
    else if (o.harita_sonuclar) c = '"' + o.harita_sorgu + '" aramasında Google Haritalar’ın ilk 20 sonucunda yoksunuz.';
    else c = 'Haritalar ölçümü yapılamadı.';
    $('sonuc-cumle').textContent = c;
    var gr = yzGruplar(o), tekrarli = gr.length && gr.length < o.yz_soru_sayisi;
    $('sonuc-alt').textContent = o.yz_soru_sayisi
      ? (tekrarli ? 'Yapay zekâya ' + gr.length + ' müşteri sorusunu birkaç kez sorduk (' + o.yz_soru_sayisi + ' cevap). Adınız her 100 cevapta ' + yzYuzde(o) + ' kez geçti.' : 'Yapay zekâya sorduğumuz ' + o.yz_soru_sayisi + ' sorunun ' + o.yz_gecen + ' tanesinde adınız geçti.') + (b.bulundu && b.yorum != null ? ' Google’da ' + sayi(b.yorum) + ' yorumunuz ve ' + String(b.puan || '-').replace('.', ',') + ' puanınız var.' : '')
      : (b.bulundu && b.yorum != null ? 'Google’da ' + sayi(b.yorum) + ' yorumunuz ve ' + String(b.puan || '-').replace('.', ',') + ' puanınız var.' : '');

    var onceki = gecmis.filter(function (x) { return x !== o && (!o.id || x.id !== o.id) && new Date(x.baslangic) < new Date(o.baslangic); })[0];
    var dg = $('degisim');
    if (onceki) {
      var sirayaz = function (x) { return x.harita_sira ? x.harita_sira + '.' : 'ilk 20’de yok'; };
      var oran = function (x) { return x.yz_soru_sayisi ? '%' + yzYuzde(x) : '-'; };
      var hD = (onceki.harita_sira || 0) === (o.harita_sira || 0) ? 'değişmedi (' + sirayaz(o) + ')' : sirayaz(onceki) + ' → ' + sirayaz(o);
      var yD = oran(onceki) === oran(o) ? 'değişmedi (' + oran(o) + ')' : oran(onceki) + ' → ' + oran(o);
      var ayni = hD.indexOf('değişmedi') === 0 && yD.indexOf('değişmedi') === 0;
      dg.textContent = 'Önceki ölçüme göre (' + tarih(onceki.baslangic) + '): Haritalar ' + hD + ', yapay zekâ ' + yD + '.' +
        (ayni ? ' Sonuçlar aynı çünkü Google’daki durumunuz değişmedi. Aşağıdaki işleri yaptıkça burada değişim göreceksiniz; Google’ın bunu yansıtması genelde 1-4 hafta sürer.' : '');
      dg.hidden = false;
    } else dg.hidden = true;

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
    var aKel = aOlculen.map(function (k) { return '"' + k.kelime + '"'; }).join(' ve ');
    $('k-arama-not').textContent = aOlculen.length && !o.arama_sira && !as.yerel_kutuda ? aKel + ' aramasında ilk 10 sonuçta değilsiniz' : o.arama_sira ? 'normal sonuçlarda' : (as.yerel_kutuda ? 'ama harita kutusunda ' + as.yerel_kutuda + '.' : (o.arama_sonuclar ? 'ilk sonuçlarda değilsiniz' : 'ölçülemedi'));
    var dh = dortHafta(o);
    $('k-yz').textContent = o.yz_soru_sayisi ? '%' + yzYuzde(o) : '-';
    $('k-yz-not').textContent = o.yz_soru_sayisi ? 'her 100 cevapta ' + yzYuzde(o) + ' kez adınız geçti' + (dh ? '. 4 haftalık ortalama: %' + dh.yuzde : '') : 'ölçülemedi';
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
    $('kelime-konum').textContent = 'Google’da ' + (as.konum ? yerde(isletme.semt) + 'ki biri gibi, ' : '') + 'hesabına giriş yapmamış bir müşteri gibi arıyoruz ve ilk 10 sonuca bakıyoruz. Google aramasında ilk 2 aramaya bakıyoruz, haritalara 5 aramanın hepsinde. Kendi bilgisayarınızda sonuçlar biraz farklı çıkabilir, çünkü Google size daha önce girdiğiniz siteleri öne çıkarır.';

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
      ? 'Yapay zekâya müşteri gibi sorduk. Yapay zekâ aynı soruya her seferinde farklı cevap verebilir; bu yüzden her soruyu birkaç kez soruyoruz. Bu ölçümde internette arama yapmadan kendi bilgisinden cevapladı. Cevapların tamamını açıp okuyabilirsiniz.'
      : 'Google aramasıyla çalışan bir yapay zekâya müşteri gibi sorduk. Cevapların tamamını açıp okuyabilirsiniz.';
    yzGruplar(o).forEach(function (g) {
      var ok = g.cevaplar.filter(function (c) { return !c.hata; }), gec = ok.filter(function (c) { return c.geciyor; }).length;
      var d = el('details', null, 'yz-cevap');
      var s = el('summary');
      s.appendChild(el('span', '"' + g.soru + '"', 'yz-soru'));
      var yazi = !ok.length ? 'Sorulamadı' : (g.cevaplar.length === 1 ? (gec ? 'Adınız geçti' : 'Adınız geçmedi') : ok.length + ' cevapta ' + gec + ' kez');
      s.appendChild(el('span', yazi, 'pil ' + (!ok.length ? 'pil-a' : (gec ? 'pil-y' : 'pil-k'))));
      d.appendChild(s);
      g.cevaplar.forEach(function (c, k) {
        if (g.cevaplar.length > 1) d.appendChild(el('p', (k + 1) + '. cevap' + (c.hata ? '' : (c.geciyor ? ' · adınız geçti' : ' · adınız geçmedi')), 'yz-tekrar'));
        d.appendChild(el('p', c.hata ? c.hata : (c.ozet || '(boş cevap)'), 'yz-metin'));
      });
      yl.appendChild(d);
    });
    if (!yl.children.length) yl.appendChild(el('p', 'Yapay zekâ ölçümü yapılamadı.', 'kart-alt'));

    isEkle($('yz-isler'), yzYolu(o, i));
    isEkle($('olcum-isler'), olcumIsleri(o, i));
    if (!$('olcum-isler').children.length) isEkle($('olcum-isler'), [{ t: 'Belirgin bir eksik görmedik', n: 'Yine de aşağıdaki genel adımlara göz atın.', bilgi: true }]);

    payCiz(o, i);
    gelisimCiz();
    $('ilk').hidden = true; $('sonuc').hidden = false;
    document.body.classList.remove('olcum-yok');
    yapilanCiz(); siradakiCiz(); isSayaci();
  }

  function genelCiz() {
    var i = isletme, m = i.calisma_sekli || [];
    var saat = new Date().getHours();
    $('kim').textContent = oturum.user.email; $('kim2').textContent = oturum.user.email;
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
      { k: 'nap', t: 'Adınızı, adresinizi ve telefonunuzu her yerde aynı yazın', s: '15 dakika', n: 'Yapay zekâ farklı yazılmış bilgiye daha az güveniyor.', adimlar: ['Google profilinizdeki adı, adresi ve telefonu bir kâğıda yazın.', 'Instagram, Facebook, web siteniz ve kayıtlı olduğunuz diğer sitelerde aynı bilgiler mi, bakın.', 'Farklı olanları Google’daki ile birebir aynı yapın.'] },
      { k: 'urun-listesi', t: 'Google profilinizdeki ürün ve hizmet listesini doldurun', s: '20 dakika', n: 'Google ve yapay zekâ ne iş yaptığınızı bu listeden anlıyor.', adimlar: ['Google İşletme Profilinize girip "Ürünler" ya da "Hizmetler" bölümünü açın.', 'Sattığınız her ürün grubunu veya verdiğiniz her hizmeti ayrı satır olarak ekleyin.', 'Her birine bir cümle açıklama ve varsa fotoğraf ekleyin.'] },
      { k: 'fotograf', t: 'Ayda 2-3 güncel fotoğraf ekleyin', s: '5 dakika', n: 'Güncel fotoğrafı olan profiller daha canlı görünür ve daha çok tıklanır.', adimlar: ['Telefonla yeni ürünlerin, vitrinin veya yaptığınız işin fotoğrafını çekin.', 'Google İşletme Profilinizde "Fotoğraf ekle" deyip yükleyin.'] }
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
    sayfaGoster('ozet');
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
      if (o && o.durum === 'bitti') gecmis.unshift(o);
      return A.isletmeGetir().then(function (yeni) { if (yeni) isletme = yeni; }, function () {}).then(function () { sonucCiz(o); });
    }).then(function () {
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

  // Sol menü: #ozet, #isler, #yz, #google, #hesap
  var SAYFALAR = ['ozet', 'isler', 'yz', 'google', 'hesap'];
  function sayfaGoster(ad, kaydir) {
    if (SAYFALAR.indexOf(ad) < 0) ad = 'ozet';
    document.querySelectorAll('[data-sayfa]').forEach(function (s) { s.hidden = s.getAttribute('data-sayfa') !== ad; });
    document.querySelectorAll('#yan-menu [data-git]').forEach(function (a) { if (a.getAttribute('data-git') === ad) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    if (location.hash.slice(1) !== ad) history.replaceState(null, '', '#' + ad);
    if (kaydir !== false) window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', function () { sayfaGoster(location.hash.slice(1)); });

  $('olc').addEventListener('click', olc);
  $('yeniden').addEventListener('click', olc);
  $('cikis').addEventListener('click', function () { A.cikis(); });

  A.girisGerekli().then(function (s) { oturum = s; return A.isletmeGetir(); }).then(function (i) {
    if (!i || !i.kurulum_bitti) { location.replace(A.KOK + 'kurulum.html'); return; }
    isletme = i;
    sayfaGoster(location.hash.slice(1), false);
    A.sb.rpc('yonetici_mi').then(function (r) { if (r && r.data === true) $('yonetim-link').hidden = false; }, function () {});
    return Promise.all([
      A.sb.from('olcumler').select('*').eq('durum', 'bitti').order('baslangic', { ascending: false }).limit(12),
      A.sb.from('yapilan_isler').select('*').eq('isletme_id', i.id)
    ]).then(function (s) {
      ((s[1] && s[1].data) || []).forEach(function (y) { yapilanlar[y.is_kodu] = y; });
      gecmis = (s[0] && s[0].data) || [];
      genelCiz();
      kelimeFormuDoldur();
      if (gecmis.length) sonucCiz(gecmis[0]); else isSayaci();
      $('yukleniyor').hidden = true; $('panel').hidden = false;
    });
  }).catch(function (err) {
    if (err && err.message === 'oturum-yok') return;
    $('yukleniyor').textContent = A.hataMetni(err);
  });
})();
