// Görünür: çerezsiz ziyaret sayacı. Kişisel veri, IP veya cihaz bilgisi göndermez;
// sadece "hangi sayfa" ve "nereden gelindi" (ör. google, instagram, atlas) bilgisi günlük toplam olarak sayılır.
(function () {
  try {
    if (navigator.webdriver || /localhost|127\.0\.0\.1/.test(location.hostname)) return;
    var sayfa = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '') || 'index';
    var q = new URLSearchParams(location.search);
    var kaynak = (q.get('k') || q.get('utm_source') || '').toLowerCase();
    if (!kaynak) {
      var r = document.referrer ? new URL(document.referrer).hostname : '';
      kaynak = !r || r === location.hostname ? 'dogrudan' : /google\./.test(r) ? 'google' : /instagram\./.test(r) ? 'instagram' : /facebook\.|fb\./.test(r) ? 'facebook' : /whatsapp|wa\.me/.test(r) ? 'whatsapp' : /bing\./.test(r) ? 'bing' : /chatgpt|openai/.test(r) ? 'chatgpt' : 'diger';
    }
    kaynak = kaynak.replace(/[^a-z0-9-]/g, '').slice(0, 30) || 'diger';
    fetch('https://drlqbwdupntqqtkmdncc.supabase.co/rest/v1/rpc/ziyaret_say', {
      method: 'POST', keepalive: true,
      headers: { 'Content-Type': 'application/json', apikey: 'sb_publishable_0HhSULYc8qycGh-0r7SIKg_mdqyVADq' },
      body: JSON.stringify({ p_sayfa: sayfa.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40), p_kaynak: kaynak })
    }).catch(function () {});
  } catch (e) { /* sayaç hiçbir zaman sayfayı bozmaz */ }
})();
