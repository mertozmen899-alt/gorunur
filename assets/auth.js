// Görünür: giriş ve hesap işlemleri (Supabase Auth)
(function () {
  'use strict';
  var URL_ = 'https://drlqbwdupntqqtkmdncc.supabase.co';
  var KEY = 'sb_publishable_0HhSULYc8qycGh-0r7SIKg_mdqyVADq';
  var sb = window.supabase.createClient(URL_, KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  // Sitenin kök adresi (GitHub Pages alt klasörü dahil)
  var KOK = location.origin + location.pathname.replace(/[^\/]*$/, '');

  var HATA = {
    'Invalid login credentials': 'E-posta veya şifre yanlış.',
    'Email not confirmed': 'E-posta adresiniz henüz onaylanmamış. Gelen kutunuzdaki onay bağlantısına tıklayın.',
    'User already registered': 'Bu e-postayla zaten bir hesap var. "Giriş yap" sekmesinden girin.',
    'Password should be at least 6 characters': 'Şifre en az 8 karakter olmalı.',
    'Unable to validate email address: invalid format': 'Lütfen geçerli bir e-posta adresi yazın.',
    'Email rate limit exceeded': 'Çok fazla deneme yapıldı. Biraz sonra tekrar deneyin.',
    'New password should be different from the old password': 'Yeni şifreniz eskisiyle aynı. Farklı bir şifre yazın ya da eski şifrenizle giriş yapın.',
    'Error sending confirmation email': 'Onay e-postası gönderilemedi. Biraz sonra tekrar deneyin ya da bize yazın.'
  };
  function hataMetni(e) {
    var m = (e && e.message) || '';
    for (var k in HATA) if (m.indexOf(k) === 0) return HATA[k];
    if (/rate limit/i.test(m)) return HATA['Email rate limit exceeded'];
    // Sunucunun kendi Türkçe uyarıları olduğu gibi gösterilir (ör. günlük değişiklik sınırı)
    if (/^Bugün /.test(m)) return m;
    if (/check constraint .*(site|google_profil)/i.test(m)) return 'Web adresi geçersiz görünüyor. https:// ile başlayan tam adresi yazın ya da boş bırakın.';
    if (/fetch|network/i.test(m)) return 'İnternet bağlantısında sorun var. Tekrar deneyin.';
    // Teknik ayrıntı yalnız konsola yazılır, kullanıcıya sade mesaj gösterilir
    try { console.error('Görünür hata:', e); } catch (x) {}
    return 'Bir sorun oldu, tekrar deneyin. Sürerse WhatsApp\'tan bize yazın.';
  }

  function oturum() {
    return sb.auth.getSession().then(function (r) { return r.data.session; });
  }

  // Oturum yoksa giriş sayfasına gönderir
  function girisGerekli() {
    return oturum().then(function (s) {
      if (!s) { location.replace(KOK + 'giris.html'); throw new Error('oturum-yok'); }
      return s;
    });
  }

  function isletmeGetir() {
    // Yalnızca giriş yapan kişinin işletmesi (yöneticiler herkesinkini okuyabildiği için sahip süzgeci şart)
    return oturum().then(function (s) {
      var q = sb.from('isletmeler').select('*');
      if (s && s.user) q = q.eq('sahip', s.user.id);
      return q.maybeSingle();
    }).then(function (r) {
      if (r.error) throw r.error;
      return r.data;
    });
  }

  function isletmeKaydet(alanlar) {
    return sb.from('isletmeler').upsert(alanlar, { onConflict: 'sahip' }).select().single().then(function (r) {
      if (r.error) throw r.error;
      return r.data;
    });
  }

  function cikis() {
    return sb.auth.signOut().then(function () { location.replace(KOK); });
  }

  window.GorunurAuth = { sb: sb, KOK: KOK, hataMetni: hataMetni, oturum: oturum, girisGerekli: girisGerekli, isletmeGetir: isletmeGetir, isletmeKaydet: isletmeKaydet, cikis: cikis };
})();
