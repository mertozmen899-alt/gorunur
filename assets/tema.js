// Norevo: açık / karanlık tema düğmesi.
// İlk boyama: her sayfanın <head>'indeki küçük betik <html data-tema> değerini daha CSS yüklenmeden koyar (yanlış renk parlaması olmaz).
// Bu dosya: düğmeyi üst menüye ekler, seçimi kaydeder (localStorage "norevo_tema": "acik" | "koyu"),
// elle seçim yoksa cihazın ayarını (prefers-color-scheme) izler ve <meta name="theme-color"> değerini günceller.
(function () {
  var ANAHTAR = 'norevo_tema';
  var RENK = { acik: '#FFFFFF', koyu: '#0F1217' };
  var kok = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function kayitli() {
    try { var t = localStorage.getItem(ANAHTAR); return t === 'acik' || t === 'koyu' ? t : null; } catch (e) { return null; }
  }
  function kaydet(t) {
    try { localStorage.setItem(ANAHTAR, t); } catch (e) { /* depolama kapalıysa seçim sadece bu sayfada geçerli */ }
  }
  function sistem() { return mq && mq.matches ? 'koyu' : 'acik'; }
  function simdiki() { return kok.dataset.tema === 'koyu' ? 'koyu' : 'acik'; }

  var dugme = null;
  function uygula(t, gecisli) {
    if (gecisli && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      kok.classList.add('tema-gecis');
      clearTimeout(uygula.z);
      uygula.z = setTimeout(function () { kok.classList.remove('tema-gecis'); }, 260);
    }
    kok.dataset.tema = t;
    var m = document.querySelector('meta[name="theme-color"]');
    if (!m) { m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); }
    m.setAttribute('content', RENK[t]);
    if (dugme) {
      var koyu = t === 'koyu';
      dugme.setAttribute('aria-pressed', String(koyu));
      dugme.setAttribute('aria-label', koyu ? 'Açık temaya geç' : 'Karanlık temaya geç');
      dugme.title = dugme.getAttribute('aria-label');
    }
  }

  function dugmeYap() {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'tema-dugme';
    b.id = 'tema-dugme';
    b.innerHTML =
      '<svg class="tema-ay" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z"/></svg>' +
      '<svg class="tema-gunes" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/></svg>';
    b.addEventListener('click', function () {
      var yeni = simdiki() === 'koyu' ? 'acik' : 'koyu';
      kaydet(yeni);
      uygula(yeni, true);
    });
    return b;
  }

  function yerlestir() {
    if (document.getElementById('tema-dugme')) return;
    dugme = dugmeYap();
    var menu = document.querySelector('.ust .menu');
    var testUst = document.querySelector('.test-ust');
    if (menu) {
      menu.appendChild(dugme);
    } else if (testUst) {
      var sag = testUst.lastElementChild;
      if (!sag || sag.classList.contains('logo')) { sag = document.createElement('div'); testUst.appendChild(sag); }
      if (sag.tagName !== 'DIV') { var kap = document.createElement('div'); testUst.replaceChild(kap, sag); kap.appendChild(sag); sag = kap; }
      sag.classList.add('test-sag');
      sag.appendChild(dugme);
    } else {
      dugme.classList.add('tema-yuzen');
      document.body.appendChild(dugme);
    }
    uygula(kayitli() || simdiki(), false);
  }

  // Elle seçim yoksa cihaz ayarı değişince takip et
  if (mq) {
    var dinle = function () { if (!kayitli()) uygula(sistem(), true); };
    if (mq.addEventListener) mq.addEventListener('change', dinle); else if (mq.addListener) mq.addListener(dinle);
  }
  // Başka sekmede seçim değişirse bu sekme de uysun
  window.addEventListener('storage', function (e) { if (e.key === ANAHTAR) uygula(kayitli() || sistem(), true); });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', yerlestir); else yerlestir();
})();
