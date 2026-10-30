// Görünür: sağ altta WhatsApp iletişim düğmesi (her sayfada) + başka dosyaların kullanacağı bağlantı yardımcısı
(function () {
  'use strict';
  var NUMARA = '905556984086';
  function baglanti(metin) { return 'https://wa.me/' + NUMARA + '?text=' + encodeURIComponent(metin || 'Merhaba, Görünür sitesinden yazıyorum.'); }
  window.gorunurWhatsApp = baglanti;

  function kur() {
    if (document.querySelector('.wa-dugme')) return;
    var a = document.createElement('a');
    a.className = 'wa-dugme';
    a.href = baglanti();
    a.target = '_blank';
    a.rel = 'noopener';
    a.setAttribute('aria-label', 'WhatsApp\'tan bize yazın');
    a.innerHTML = '<span class="wa-balon">Dilerseniz bize buradan ulaşabilirsiniz</span>' +
      '<span class="wa-yuvarlak" aria-hidden="true"><svg width="30" height="30" viewBox="0 0 32 32" fill="currentColor"><path d="M16 3C9 3 3.4 8.6 3.4 15.5c0 2.4.7 4.7 1.9 6.7L3.3 29l7-1.9c1.8 1 3.8 1.5 5.9 1.5 7 0 12.6-5.6 12.6-12.6S23 3 16 3zm0 23.1c-1.9 0-3.8-.5-5.4-1.5l-.4-.2-4.2 1.1 1.1-4.1-.3-.4a10.4 10.4 0 0 1-1.6-5.5C5.2 9.8 10 5.2 16 5.2s10.8 4.7 10.8 10.4S21.9 26.1 16 26.1zm5.9-7.8c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.2-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.2 1.4 3.5c.2.2 2.4 3.6 5.7 5 .8.3 1.4.5 1.9.7.8.3 1.5.2 2.1.1.6-.1 1.9-.8 2.2-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4z"/></svg></span>';
    document.body.appendChild(a);
    // Balon: bilgisayarda bir kez 4 sn sonra kısa süre görünsün, sonra sadece üzerine gelince
    var gor = false;
    try { gor = sessionStorage.getItem('gorunur_wa_balon') === '1'; } catch (e) {}
    if (!gor && window.matchMedia && matchMedia('(min-width: 721px)').matches) {
      setTimeout(function () {
        a.classList.add('wa-acik');
        setTimeout(function () { a.classList.remove('wa-acik'); }, 6000);
        try { sessionStorage.setItem('gorunur_wa_balon', '1'); } catch (e) {}
      }, 4000);
    }
  }
  // Giriş yapmış kişiye üst menüde "Giriş yap" yerine "Panelim" göster (oturum tarayıcıda kayıtlıysa)
  function oturumVarMi() {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (/^sb-.*-auth-token$/.test(k)) {
          var v = JSON.parse(localStorage.getItem(k) || 'null');
          if (v && (v.refresh_token || (v.currentSession && v.currentSession.refresh_token))) return true;
        }
      }
    } catch (e) {}
    return false;
  }
  function menuDuzelt() {
    if (!oturumVarMi()) return;
    document.querySelectorAll('a.erken[href="giris.html"]').forEach(function (a) { a.href = 'panel.html'; a.textContent = 'Panelim'; });
  }
  function hepsi() { kur(); menuDuzelt(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hepsi); else hepsi();
})();
