// Norevo: ortak kod (bekleme listesi kaydı, kaynak takibi, sayfa etkileşimleri)
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
      if (k) sessionStorage.setItem('norevo_kaynak', k.slice(0, 100));
      return sessionStorage.getItem('norevo_kaynak') || (document.referrer ? 'yonlendirme' : 'dogrudan');
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

  // Ana sayfa: ekrana girince beliren bölümler ve alt şerit. Sadece index.html'de çalışır.
  function canlilik() {
    var hero = document.querySelector('.lp-hero');
    if (!hero) return;
    var hareket = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var IO = 'IntersectionObserver' in window;

    // 1) Ekrana giren öğe .lp-gor alır, çıkınca kaybeder: sonsuz hareketler ekran dışında durur
    var izlenen = document.querySelectorAll('.lp-izle');
    if (IO) {
      var io = new IntersectionObserver(function (g) {
        g.forEach(function (x) { x.target.classList.toggle('lp-gor', x.isIntersecting); });
      }, { rootMargin: '40px 0px' });
      izlenen.forEach(function (e) { io.observe(e); });
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

    // 2) Hero geçilince alt şerit (telefonda) ve üst menüdeki ana düğme (bilgisayarda) görünür
    var serit = document.getElementById('lp-serit');
    var liste = document.getElementById('liste');
    var bekleyen = false;

    function seritGuncelle() {
      bekleyen = false;
      var lt = liste ? liste.getBoundingClientRect().top : Infinity;
      // Hero geçildi mi: masaüstünde üst menüdeki düğme, telefonda WhatsApp düğmesi buna göre görünür (style.css)
      var asagi = hero.getBoundingClientRect().bottom < 0;
      if (document.body.classList.contains('lp-asagi') !== asagi) document.body.classList.toggle('lp-asagi', asagi);
      if (!serit) return;
      var goster = asagi && lt > innerHeight;
      if (serit.hidden === goster) serit.hidden = !goster;
      // WhatsApp düğmesi şeridin üstüne çıksın (style.css: body.alt-cta-acik)
      if (document.body.classList.contains('alt-cta-acik') !== goster) document.body.classList.toggle('alt-cta-acik', goster);
    }
    function istek() { if (!bekleyen) { bekleyen = true; requestAnimationFrame(seritGuncelle); } }
    window.addEventListener('scroll', istek, { passive: true });
    window.addEventListener('resize', istek);
    seritGuncelle();
  }

  window.Norevo = { formBagla: formBagla, EPOSTA_RE: EPOSTA_RE };

  document.addEventListener('DOMContentLoaded', function () {
    balonlar();
    konular();
    isKarti();
    canlilik();
    formBagla(document.getElementById('liste-form'));
    var yil = document.getElementById('yil'); if (yil) yil.textContent = new Date().getFullYear();
  });
})();

// Hesap silindikten sonra ana sayfada kısa bir bilgi göster
(function () {
  if (!/[?&]hesap=silindi/.test(location.search)) return;
  var d = document.createElement('div');
  d.className = 'bilgi-serit'; d.setAttribute('role', 'status');
  d.textContent = 'Hesabınız ve bütün verileriniz silindi. Norevo’yu denediğiniz için teşekkür ederiz.';
  var ust = document.querySelector('header'); if (ust && ust.parentNode) ust.parentNode.insertBefore(d, ust.nextSibling);
  history.replaceState(null, '', location.pathname);
})();
