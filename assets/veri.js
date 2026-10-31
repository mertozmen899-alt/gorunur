// Norevo: ortak listeler (semtler, işler) ve Türkçe arama yardımcısı
(function () {
  'use strict';
  var YERLER = ['Kadıköy, İstanbul', 'Kartal, İstanbul', 'Kağıthane, İstanbul', 'Beşiktaş, İstanbul', 'Üsküdar, İstanbul', 'Bakırköy, İstanbul', 'Şişli, İstanbul', 'Ataşehir, İstanbul', 'Maltepe, İstanbul', 'Beylikdüzü, İstanbul', 'Çankaya, Ankara', 'Keçiören, Ankara', 'Yenimahalle, Ankara', 'Karşıyaka, İzmir', 'Bornova, İzmir', 'Konak, İzmir', 'Nilüfer, Bursa', 'Osmangazi, Bursa', 'Muratpaşa, Antalya', 'Konyaaltı, Antalya', 'Seyhan, Adana', 'Çukurova, Adana', 'Selçuklu, Konya', 'Tepebaşı, Eskişehir', 'Odunpazarı, Eskişehir', 'Melikgazi, Kayseri', 'Ortahisar, Trabzon', 'Şahinbey, Gaziantep', 'İzmit, Kocaeli', 'Atakum, Samsun', 'Adana', 'Ankara', 'Antalya', 'Bursa', 'Denizli', 'Diyarbakır', 'Erzurum', 'Eskişehir', 'Gaziantep', 'Hatay', 'İstanbul', 'İzmir', 'Kayseri', 'Kocaeli', 'Konya', 'Malatya', 'Manisa', 'Mersin', 'Muğla', 'Sakarya', 'Samsun', 'Tekirdağ', 'Trabzon', 'Van', 'Bitlis'];
  var ISLER = [
    ['Veteriner kliniği', ['veteriner', 'hayvan hastanesi', 'vet']], ['Pet kuaförü', ['pet kuafor', 'kopek tiras', 'kedi tiras']], ['Pet shop', ['evcil hayvan dukkani', 'mama']],
    ['Kuaför', ['berber', 'sac tasarim', 'sac kesim']], ['Güzellik salonu', ['guzellik merkezi', 'cilt bakimi', 'lazer epilasyon']], ['Diş kliniği', ['dis hekimi', 'disci', 'agiz ve dis']],
    ['Fizyoterapi', ['fizik tedavi', 'fizyoterapist']], ['Psikolog', ['terapist', 'psikolojik danisman']], ['Diyetisyen', ['beslenme uzmani']],
    ['Restoran', ['lokanta', 'yemek']], ['Kafe', ['kahveci', 'cafe']], ['Pastane', ['tatlici', 'firin']],
    ['Emlak ofisi', ['emlakci', 'gayrimenkul']], ['Avukatlık bürosu', ['avukat', 'hukuk burosu']], ['Mali müşavir', ['muhasebeci', 'smmm']], ['Sigorta acentesi', ['sigortaci']],
    ['Oto servis', ['tamirci', 'oto tamir', 'sanayi']], ['Oto yıkama', ['arac yikama']], ['Kombi servisi', ['kombi tamiri', 'kalorifer']], ['Elektrikçi', ['elektrik tamiri']], ['Tesisatçı', ['su tesisati', 'tikaniklik']],
    ['Yabancı dil kursu', ['ingilizce kursu', 'dil okulu']], ['Dershane', ['etut merkezi', 'kurs']], ['Spor salonu', ['gym', 'fitness']], ['Pilates stüdyosu', ['pilates', 'yoga']],
    ['Halı yıkama', ['hali yikama', 'koltuk yikama']], ['Nakliyat', ['evden eve', 'tasimacilik']], ['Temizlik şirketi', ['ev temizligi', 'ofis temizligi']], ['Mimarlık ofisi', ['mimar', 'ic mimar']], ['Fotoğrafçı', ['dugun fotografcisi', 'fotograf studyosu']]
  ];
  function n(x) { return (x || '').toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').trim(); }
  function yerAra(q) { q = n(q); if (q.length < 2) return []; return YERLER.filter(function (y) { return n(y).indexOf(q) >= 0; }).slice(0, 6); }
  function isAra(q) {
    q = n(q); if (q.length < 2) return [];
    return ISLER.filter(function (j) { return n(j[0]).indexOf(q) >= 0 || j[1].some(function (a) { return a.indexOf(q) >= 0; }); }).slice(0, 5).map(function (j) {
      var es = j[1].filter(function (a) { return a.indexOf(q) >= 0; })[0];
      return { ad: j[0], ipucu: es && n(j[0]).indexOf(q) < 0 ? '"' + es + '" olarak da aranır' : '' };
    });
  }
  window.GorunurVeri = { YERLER: YERLER, ISLER: ISLER, n: n, yerAra: yerAra, isAra: isAra };
})();
