// Görünür: ortak kod (bekleme listesi kaydı, kaynak takibi, sayfa etkileşimleri)
(function () {
  'use strict';

  // Bu iki değer herkese açıktır (tarayıcıya gömülmesi için tasarlanmıştır).
  // Veri tabanında ziyaretçiler tabloyu okuyamaz, sadece katil_bekleme_listesi() ile kayıt bırakabilir.
  var SUPABASE_URL = 'https://drlqbwdupntqqtkmdncc.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_0HhSULYc8qycGh-0r7SIKg_mdqyVADq';

  // Kaynak (utm_source veya ?kaynak=) bu oturum boyunca hatırlanır
  function kaynakAl() {
    var p = new URLSearchParams(location.search);
    var k = p.get('utm_source') || p.get('kaynak') || '';
    try {
      if (k) sessionStorage.setItem('gorunur_kaynak', k.slice(0, 100));
      return sessionStorage.getItem('gorunur_kaynak') || (document.referrer ? 'yonlendirme' : 'dogrudan');
    } catch (e) {
      return k || 'dogrudan';
    }
  }
  var KAYNAK = kaynakAl();

  var EPOSTA_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function katil(veri) {
    return fetch(SUPABASE_URL + '/rest/v1/rpc/katil_bekleme_listesi', {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_eposta: veri.eposta,
        p_onay: veri.onay === true,
        p_kaynak: KAYNAK,
        p_calisma_sekli: veri.calismaSekli || null,
        p_sehir: veri.sehir || null,
        p_is_turu: veri.isTuru || null
      })
    }).then(function (r) {
      if (!r.ok) throw new Error('sunucu');
      return r.json();
    });
  }

  var MESAJ = {
    gecersiz_eposta: 'Lütfen geçerli bir e-posta adresi yazın.',
    onay_gerekli: 'Haber verebilmemiz için onay kutusunu işaretlemeniz gerekiyor.',
    cok_fazla_deneme: 'Kısa sürede çok deneme yapıldı. Birkaç dakika sonra tekrar deneyin.',
    sunucu: 'Bir sorun oldu, kaydınız alınamadı. Birazdan tekrar deneyin.'
  };

  // Bir formu bekleme listesine bağlar. ekVeri: () => {calismaSekli, sehir, isTuru}
  function formBagla(form, ekVeri) {
    if (!form) return;
    var eposta = form.querySelector('input[type=email]');
    var onay = form.querySelector('input[type=checkbox]');
    var uyari = form.querySelector('.uyari');
    var dugme = form.querySelector('button[type=submit]');
    var kutu = form.parentElement;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var deger = (eposta.value || '').trim();
      if (!EPOSTA_RE.test(deger)) { uyari.textContent = MESAJ.gecersiz_eposta; eposta.focus(); return; }
      if (!onay.checked) { uyari.textContent = MESAJ.onay_gerekli; onay.focus(); return; }
      uyari.textContent = '';
      dugme.disabled = true; var eski = dugme.textContent; dugme.textContent = 'Gönderiliyor…';
      var ek = ekVeri ? ekVeri() : {};
      katil({ eposta: deger, onay: true, calismaSekli: ek.calismaSekli, sehir: ek.sehir, isTuru: ek.isTuru })
        .then(function (sonuc) {
          // Kayıt alınınca sunucu onay e-postası gönderir; kişi bağlantıya tıklayınca listeye eklenir (onay.html)
          if (sonuc === 'tamam' || sonuc === 'onay_gonderildi') {
            var t = kutu.querySelector('.tesekkur');
            t.querySelector('.adres').textContent = deger;
            form.hidden = true; t.hidden = false; t.setAttribute('tabindex', '-1'); t.focus();
          } else {
            uyari.textContent = MESAJ[sonuc] || MESAJ.sunucu;
          }
        })
        .catch(function () { uyari.textContent = MESAJ.sunucu; })
        .then(function () { dugme.disabled = false; dugme.textContent = eski; });
    });
  }

  // "i" balonları: dokunmatik ekranda tıklayınca açılıp kapanır
  function balonlar() {
    document.querySelectorAll('.bilgi').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        var acik = b.getAttribute('aria-expanded') === 'true';
        document.querySelectorAll('.bilgi[aria-expanded="true"]').forEach(function (x) { x.setAttribute('aria-expanded', 'false'); });
        b.setAttribute('aria-expanded', acik ? 'false' : 'true');
      });
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.bilgi')) document.querySelectorAll('.bilgi[aria-expanded="true"]').forEach(function (x) { x.setAttribute('aria-expanded', 'false'); });
    });
  }

  // "Ne ölçüyoruz" sekmeleri
  function konular() {
    var tablar = document.querySelectorAll('.konu');
    if (!tablar.length) return;
    function sec(t) {
      tablar.forEach(function (x) {
        var on = x === t;
        x.setAttribute('aria-selected', on ? 'true' : 'false');
        x.setAttribute('tabindex', on ? '0' : '-1');
        document.getElementById(x.getAttribute('aria-controls')).hidden = !on;
      });
    }
    tablar.forEach(function (t, i) {
      t.addEventListener('click', function () { sec(t); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = tablar[(i + 1) % tablar.length];
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') n = tablar[(i - 1 + tablar.length) % tablar.length];
        if (n) { e.preventDefault(); sec(n); n.focus(); }
      });
    });
  }

  // Örnek iş kartındaki "Yaptım"
  function isKarti() {
    var b = document.getElementById('yaptim');
    if (!b) return;
    var kart = document.getElementById('ornek-is');
    var not = document.getElementById('yaptim-not');
    b.addEventListener('click', function () {
      var bitti = kart.classList.toggle('bitti');
      b.textContent = bitti ? '✓ Yaptım' : 'Yaptım';
      b.setAttribute('aria-pressed', bitti ? 'true' : 'false');
      b.classList.toggle('pil-y', bitti); b.classList.toggle('btn-amber', !bitti);
      not.textContent = bitti ? 'Bir sonraki ölçümde işe yarayıp yaramadığını size söyleyeceğiz.' : 'Bitirince "Yaptım" deyin, gerisini biz takip edelim.';
    });
  }

  // Ana sayfa canlılık katmanı: ekrana girince başlayan hareketler, dönen kelime,
  // sırayla gelen WhatsApp mesajları, alt şerit ve tanıtım penceresi. Sadece index.html'de çalışır.
  function canlilik() {
    var hero = document.querySelector('.lp-hero');
    if (!hero) return;
    var hareket = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var IO = 'IntersectionObserver' in window;
    function gorunuyor(el) { var r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }

    // 1) Ekrana giren öğe .lp-gor alır, çıkınca kaybeder: sonsuz hareketler ekran dışında durur
    var izlenen = document.querySelectorAll('.lp-izle');
    if (IO) {
      var io = new IntersectionObserver(function (g) {
        g.forEach(function (x) { x.target.classList.toggle('lp-gor', x.isIntersecting); });
      }, { rootMargin: '40px 0px' });
      izlenen.forEach(function (e) { io.observe(e); });
      // Özellik kartları: telefonda alt alta durur; yalnız ekranın ortasındaki kart oynar (aynı anda tek hareket)
      var orta = new IntersectionObserver(function (g) {
        g.forEach(function (x) { x.target.classList.toggle('lp-gor', x.isIntersecting); });
      }, { rootMargin: '-45% 0px -45% 0px' });
      document.querySelectorAll('.lp-izle-orta').forEach(function (e) { orta.observe(e); });
    } else {
      izlenen.forEach(function (e) { e.classList.add('lp-gor'); });
    }

    // 1b) Bir kez beliren bölümler (.lp-bir): ekranın altındaysa gizli bekler, ilk girişte sırayla yükselir
    if (hareket && IO) {
      var birler = document.querySelectorAll('.lp-bir');
      var bio = new IntersectionObserver(function (g) {
        g.forEach(function (x) {
          if (!x.isIntersecting) return;
          bio.unobserve(x.target);
          x.target.classList.remove('lp-bekle'); x.target.classList.add('lp-geldi');
        });
      }, { rootMargin: '0px 0px -12% 0px' });
      birler.forEach(function (e) {
        if (e.getBoundingClientRect().top < innerHeight) return; // ilk ekranda olan hemen görünür
        e.classList.add('lp-bekle'); bio.observe(e);
      });
    }

    // 2) Başlıkta dönen kelime (Google'da / Haritalar'da / yapay zekâda)
    var don = hero.querySelector('.lp-don');
    if (don) {
      var ic = don.querySelector('.lp-don-ic'), kelime = ic.children, son = kelime.length - 1, s = 0;
      var genislik = function () {
        var k = kelime[s].firstElementChild, cs = getComputedStyle(don);
        don.style.width = Math.ceil(k.getBoundingClientRect().width + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)) + 'px';
      };
      genislik();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(genislik);
      window.addEventListener('resize', genislik);
      if (hareket) {
        setInterval(function () {
          if (document.hidden || !gorunuyor(don)) return;
          s++;
          ic.style.transform = 'translateY(' + (-1.18 * s) + 'em)';
          genislik();
          if (s === son) {
            // Son kelime ilkinin kopyası: geçiş bitince fark ettirmeden başa sar
            setTimeout(function () {
              ic.style.transition = 'none'; ic.style.transform = 'none'; s = 0;
              void ic.offsetWidth; ic.style.transition = '';
            }, 700);
          }
        }, 2400);
      }
    }

    // 3) Hero kartındaki oran sabit durur (başlıkta zaten dönen kelime var, ikinci hareket eklemiyoruz)

    // 4) Kartlardaki ↗ düğmesi ilgili sekmeyi de açar
    document.querySelectorAll('.lp-ac[data-sekme]').forEach(function (a) {
      a.addEventListener('click', function () {
        var t = document.getElementById(a.getAttribute('data-sekme'));
        if (t) t.click();
      });
    });

    // 5) WhatsApp mesajları ekrana girince sırayla, "yazıyor" noktalarıyla gelir
    var mesajlar = document.querySelector('.lp-wa .mesajlar');
    if (mesajlar && hareket && IO) {
      mesajlar.classList.add('lp-sira');
      // Yazışma ekrandayken sürekli döner: bitince 4 sn bekler, solarak başa sarar. Ekran dışındayken durur.
      var waGorunur = false, waCalisiyor = false, waBasla = null;
      var wio = new IntersectionObserver(function (g) {
        waGorunur = g[0].isIntersecting;
        if (waGorunur && !waCalisiyor && waBasla) waBasla();
      }, { threshold: 0.35 });
      wio.observe(mesajlar);
      (function () {
        var ogeler = Array.prototype.slice.call(mesajlar.children), k = 0;
        var nokta = document.createElement('span');
        nokta.className = 'lp-wa-yaziyor'; nokta.setAttribute('aria-hidden', 'true');
        nokta.innerHTML = '<i></i><i></i><i></i>';
        // Başlıktaki "çevrimiçi" yazısı, noktalar görünürken "yazıyor…" olur
        var durum = document.querySelector('.lp-wa .tel-alt'), durumIlk = durum ? durum.textContent : '';
        var yaziyor = function (v) { if (!durum) return; durum.textContent = v ? 'yazıyor…' : durumIlk; durum.classList.toggle('yaziyor', v); };
        // Sohbet penceresi sabit boyda: yeni mesaj alta sığmıyorsa yazışma gerçek WhatsApp gibi yukarı kayar (yalnız transform)
        var pencere = mesajlar.parentNode, kayma = 0;
        var kaydir = function (alt) {
          var bosluk = parseFloat(getComputedStyle(mesajlar).paddingBottom) || 0;
          var hedef = Math.max(0, Math.round(alt + bosluk - pencere.clientHeight));
          if (hedef > kayma) { kayma = hedef; mesajlar.style.transform = 'translateY(' + (-kayma) + 'px)'; }
        };
        var sonraki = function () {
          if (k >= ogeler.length) { setTimeout(basaSar, 4000); return; }
          var o = ogeler[k++];
          if (o.classList.contains('gelen')) {
            nokta.style.left = o.offsetLeft + 'px'; nokta.style.top = o.offsetTop + 'px';
            mesajlar.appendChild(nokta); yaziyor(true);
            kaydir(o.offsetTop + nokta.offsetHeight);
            setTimeout(function () {
              if (nokta.parentNode) nokta.parentNode.removeChild(nokta);
              yaziyor(false);
              o.classList.add('lp-cikti'); kaydir(o.offsetTop + o.offsetHeight);
              setTimeout(sonraki, o.classList.contains('wa-kart') ? 800 : 450);
            }, 900);
          } else if (o.classList.contains('giden')) {
            // Giden mesaj: önce gri tik, kısa süre sonra "okundu" (mavi tik)
            o.classList.add('lp-cikti'); kaydir(o.offsetTop + o.offsetHeight);
            setTimeout(function () { o.classList.add('lp-okundu'); }, 600);
            setTimeout(sonraki, 1000);
          } else {
            o.classList.add('lp-cikti'); kaydir(o.offsetTop + o.offsetHeight); setTimeout(sonraki, 300);
          }
        };
        var basaSar = function () {
          if (!waGorunur) { waCalisiyor = false; return; } // ekran dışı: görününce baştan başlar
          mesajlar.style.transition = 'opacity .45s ease';
          mesajlar.style.opacity = '0';
          setTimeout(function () {
            ogeler.forEach(function (o) { o.classList.remove('lp-cikti', 'lp-okundu'); });
            mesajlar.style.transition = 'none'; mesajlar.style.transform = ''; kayma = 0; k = 0;
            void mesajlar.offsetHeight;
            mesajlar.style.transition = 'opacity .45s ease'; mesajlar.style.opacity = '1';
            setTimeout(function () { mesajlar.style.transition = ''; sonraki(); }, 500);
          }, 500);
        };
        waBasla = function () {
          waCalisiyor = true;
          ogeler.forEach(function (o) { o.classList.remove('lp-cikti', 'lp-okundu'); });
          mesajlar.style.transform = ''; kayma = 0; k = 0;
          setTimeout(sonraki, 200);
        };
        if (waGorunur) waBasla();
      })();
    } else if (mesajlar) {
      // Hareket yoksa (ya da yazışma zaten ekrandaysa) sohbetin son mesajları görünsün: yazı çubuğunun altında mesaj kalmaz
      var sabitle = function () {
        var pencere = mesajlar.parentNode, fark = mesajlar.offsetHeight - pencere.clientHeight;
        mesajlar.style.transform = fark > 0 ? 'translateY(' + (-fark) + 'px)' : '';
      };
      sabitle();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(sabitle);
      window.addEventListener('resize', sabitle);
    }

    // 6) Alt şerit ve tanıtım penceresi
    var promo = document.getElementById('lp-promo');
    var serit = document.getElementById('lp-serit');
    var liste = document.getElementById('liste');
    var listeGoruldu = false, promoAcik = false, oncekiOdak = null, bekleyen = false, promoBekliyor = false;
    var promoDene = function () {};
    var ANAHTAR = 'gorunur_tanitim', HAFTA = 7 * 24 * 3600 * 1000;

    function seritGuncelle() {
      bekleyen = false;
      var lt = liste ? liste.getBoundingClientRect().top : Infinity;
      if (lt < innerHeight) listeGoruldu = true;
      // Hero geçildi mi: masaüstünde üst menüdeki düğme, telefonda WhatsApp düğmesi buna göre görünür (style.css)
      var asagi = hero.getBoundingClientRect().bottom < 0;
      if (document.body.classList.contains('lp-asagi') !== asagi) document.body.classList.toggle('lp-asagi', asagi);
      if (promoBekliyor) promoDene();
      if (!serit) return;
      var goster = asagi && lt > innerHeight && !promoAcik;
      if (serit.hidden === goster) serit.hidden = !goster;
      // WhatsApp düğmesi şeridin üstüne çıksın (style.css: body.alt-cta-acik)
      if (document.body.classList.contains('alt-cta-acik') !== goster) document.body.classList.toggle('alt-cta-acik', goster);
    }
    function istek() { if (!bekleyen) { bekleyen = true; requestAnimationFrame(seritGuncelle); } }
    window.addEventListener('scroll', istek, { passive: true });
    window.addEventListener('resize', istek);
    var lform = document.getElementById('liste-form');
    if (lform) lform.addEventListener('focusin', function () { listeGoruldu = true; });
    seritGuncelle();

    if (!promo) return;
    var kart = promo.querySelector('.lp-promo-kart');
    var arka = [document.querySelector('header.ust'), document.querySelector('main'), document.querySelector('footer'), serit];
    function arkaKapali(v) { arka.forEach(function (e) { if (e) { if (v) e.setAttribute('inert', ''); else e.removeAttribute('inert'); } }); }
    function tus(e) {
      if (e.key === 'Escape') { e.preventDefault(); promoKapat(); return; }
      if (e.key !== 'Tab') return;
      var f = promo.querySelectorAll('a[href],button:not([disabled])'), ilk = f[0], sonu = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === ilk || document.activeElement === kart)) { e.preventDefault(); sonu.focus(); }
      else if (!e.shiftKey && document.activeElement === sonu) { e.preventDefault(); ilk.focus(); }
    }
    function promoAc() {
      if (promoAcik) return;
      promoAcik = true; oncekiOdak = document.activeElement;
      promo.hidden = false; seritGuncelle(); arkaKapali(true);
      try { kart.focus({ preventScroll: true }); } catch (e) { kart.focus(); }
      document.addEventListener('keydown', tus);
      try { localStorage.setItem(ANAHTAR, String(Date.now())); } catch (e) { /* depolama kapalıysa sorun değil */ }
    }
    function promoKapat() {
      if (!promoAcik) return;
      promoAcik = false; promo.hidden = true; arkaKapali(false);
      document.removeEventListener('keydown', tus);
      if (oncekiOdak && oncekiOdak.focus && document.contains(oncekiOdak)) { try { oncekiOdak.focus({ preventScroll: true }); } catch (e) { /* yok */ } }
      seritGuncelle();
    }
    promo.addEventListener('click', function (e) { if (e.target.closest('[data-kapat]')) promoKapat(); });
    window.__gorunurPromo = promoAc; // test ve ekran görüntüsü için

    // Pencere yalnız bilgisayarda ve ziyaretçi okurken araya girmeden açılır: en az 6 sn sonra,
    // sarı "Nasıl çalışır" bandı geçildiğinde ya da fare sayfadan yukarı çıkarken (kapatmaya/sekme değiştirmeye giderken).
    // Telefonda açılmaz: orada alt şerit aynı işi yapar, tam ekran perde Google'ın da hoşlanmadığı bir şey.
    var sonGosterim = 0;
    try { sonGosterim = parseInt(localStorage.getItem(ANAHTAR) || '0', 10) || 0; } catch (e) { sonGosterim = 0; }
    if (navigator.webdriver || Date.now() - sonGosterim < HAFTA) return;
    if (!(window.matchMedia && matchMedia('(min-width: 721px)').matches)) return;
    var bant = document.getElementById('nasil');
    promoDene = function (cikis) {
      if (!promoBekliyor || listeGoruldu || promoAcik || document.hidden) return;
      var a = document.activeElement;
      if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return;
      if (!cikis && !(bant && bant.getBoundingClientRect().bottom < 0)) return;
      promoBekliyor = false;
      document.removeEventListener('mouseout', cikisIzle);
      promoAc();
    };
    function cikisIzle(e) { if (!e.relatedTarget && e.clientY <= 0) promoDene(true); }
    setTimeout(function () {
      promoBekliyor = true;
      document.addEventListener('mouseout', cikisIzle);
      promoDene();
    }, 6000);
  }

  // Tanıtım videosu: <section data-video="assets/video/tanitim.mp4" data-kapak="assets/video/kapak.jpg">
  // data-video boşsa yer tutucu kapak kalır ("Tanıtım videosu çok yakında"); doluysa oynat düğmesi açılır.
  // Video kendi kendine başlamaz; düğmeye basınca sesli oynar.
  function tanitimVideosu() {
    var bolum = document.querySelector('.lp-video-bolum[data-video]');
    if (!bolum) return;
    var kaynak = (bolum.getAttribute('data-video') || '').trim();
    var kapak = (bolum.getAttribute('data-kapak') || '').trim();
    var cerceve = bolum.querySelector('.lp-video'), dugme = bolum.querySelector('.lp-oynat');
    if (!kaynak || !cerceve || !dugme) return;
    var kapakEl = cerceve.querySelector('.lp-video-kapak');
    var v = document.createElement('video');
    // Kapak resmi bölüm yaklaşınca iner (açılışta gereksiz yük olmasın)
    if (kapak && kapakEl) {
      var kapakKoy = function () { kapakEl.style.backgroundImage = 'url("' + kapak.replace(/["\\]/g, '') + '")'; kapakEl.classList.add('lp-kapakli'); v.poster = kapak; };
      if ('IntersectionObserver' in window) {
        var kio = new IntersectionObserver(function (g) { if (g[0].isIntersecting) { kio.disconnect(); kapakKoy(); } }, { rootMargin: '600px 0px' });
        kio.observe(cerceve);
      } else kapakKoy();
    }
    v.className = 'lp-video-oynatici'; v.controls = true; v.preload = 'none';
    v.setAttribute('playsinline', ''); v.playsInline = true;
    v.src = kaynak;
    cerceve.appendChild(v);
    var not = cerceve.querySelector('.lp-video-not'); if (not) not.hidden = true;
    var yazi = dugme.querySelector('textPath'); if (yazi) yazi.textContent = 'TANITIM VİDEOSU · İZLEYİN · ';
    dugme.disabled = false; dugme.setAttribute('aria-label', 'Tanıtım videosunu oynat');
    dugme.addEventListener('click', function () {
      cerceve.classList.add('lp-video-oynuyor');
      try { v.focus({ preventScroll: true }); } catch (e) { v.focus(); }
      var p = v.play(); if (p && p.catch) p.catch(function () { /* tarayıcı izin vermezse kullanıcı videonun kendi düğmesine basar */ });
    });
  }

  // le-lab.io esintisi: sarı bantta kaydırmaya bağlı hafif kayma, fareyle kullananlara mıknatıslı ana düğmeler (imleç halkası sahibin isteğiyle kaldırıldı).
  // Dokunmatik ekranda ve "hareketi azalt" açıkken hiçbiri çalışmaz. Halka gerçek imleci gizlemez, tıklamaları engellemez.
  function leLab() {
    if (!document.querySelector('.lp-hero')) return;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var bant = document.querySelector('.lp-bant');
    if (bant) {
      var bekliyor = false;
      var kay = function () {
        bekliyor = false;
        var r = bant.getBoundingClientRect();
        if (r.bottom < -200 || r.top > innerHeight + 200) return;
        var k = (innerHeight - r.top) / (innerHeight + r.height) - 0.5;
        bant.style.setProperty('--lp-k', Math.max(-0.5, Math.min(0.5, k)).toFixed(3));
      };
      window.addEventListener('scroll', function () { if (!bekliyor) { bekliyor = true; requestAnimationFrame(kay); } }, { passive: true });
      window.addEventListener('resize', kay);
      kay();
    }
    if (!(window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches)) return;

    // Mıknatıslı ana düğmeler: fare üstündeyken birkaç piksel ona doğru kayar
    document.querySelectorAll('main .btn-amber, main .btn-siyah').forEach(function (b) {
      b.classList.add('lp-miknatis');
      b.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        var r = b.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        b.style.translate = (Math.max(-1, Math.min(1, dx)) * 6).toFixed(1) + 'px ' + (Math.max(-1, Math.min(1, dy)) * 4).toFixed(1) + 'px';
      });
      b.addEventListener('pointerleave', function () { b.style.translate = ''; });
    });
  }

  window.Gorunur = { formBagla: formBagla, EPOSTA_RE: EPOSTA_RE };

  document.addEventListener('DOMContentLoaded', function () {
    balonlar();
    konular();
    isKarti();
    canlilik();
    tanitimVideosu();
    leLab();
    formBagla(document.getElementById('liste-form'));
    var yil = document.getElementById('yil'); if (yil) yil.textContent = new Date().getFullYear();
  });
})();

// Hesap silindikten sonra ana sayfada kısa bir bilgi göster
(function () {
  if (!/[?&]hesap=silindi/.test(location.search)) return;
  var d = document.createElement('div');
  d.className = 'bilgi-serit'; d.setAttribute('role', 'status');
  d.textContent = 'Hesabınız ve bütün verileriniz silindi. Görünür’ü denediğiniz için teşekkür ederiz.';
  var ust = document.querySelector('header'); if (ust && ust.parentNode) ust.parentNode.insertBefore(d, ust.nextSibling);
  history.replaceState(null, '', location.pathname);
})();
