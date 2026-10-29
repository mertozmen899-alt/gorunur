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
          if (sonuc === 'tamam') {
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
      b.className = bitti ? 'btn pil-y' : 'btn btn-amber';
      not.textContent = bitti ? 'Bir sonraki ölçümde işe yarayıp yaramadığını size söyleyeceğiz.' : 'Bitirince "Yaptım" deyin, gerisini biz takip edelim.';
    });
  }

  window.Gorunur = { formBagla: formBagla, EPOSTA_RE: EPOSTA_RE };

  document.addEventListener('DOMContentLoaded', function () {
    balonlar();
    konular();
    isKarti();
    formBagla(document.getElementById('liste-form'));
    var yil = document.getElementById('yil'); if (yil) yil.textContent = new Date().getFullYear();
  });
})();
