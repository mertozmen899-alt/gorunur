(function(){
  function store(){ try{return JSON.parse(localStorage.getItem('fake')||'{}')}catch(e){return {}} }
  function save(s){ localStorage.setItem('fake', JSON.stringify(s)) }
  var ORNEK = {
    durum:'bitti', baslangic:new Date().toISOString(), bitis:new Date().toISOString(),
    harita_sorgu:'veteriner kadıköy', harita_sira:null,
    harita_sonuclar:[
      {sira:1,ad:'Moda Veteriner Kliniği',puan:4.8,yorum:612,siz:false},
      {sira:2,ad:'Kadıköy Hayvan Hastanesi',puan:4.6,yorum:1240,siz:false},
      {sira:3,ad:'Can Dostlar Veteriner',puan:4.9,yorum:388,siz:false},
      {sira:4,ad:'Pati Veteriner Kliniği',puan:4.5,yorum:142,siz:true},
      {sira:5,ad:'Fenerbahçe Vet',puan:4.7,yorum:95,siz:false}],
    arama_sorgu:'kadıköy veteriner', arama_sira:null, arama_sonuclar:{organik:[],yerel_kutu:['A','B','C'],yerel_kutuda:null},
    yz_soru_sayisi:3, yz_gecen:1,
    yz_cevaplar:[
      {soru:'Kadıköy’de iyi bir veteriner önerir misin?',geciyor:false,ozet:'Kadıköy’de öne çıkan klinikler: Moda Veteriner Kliniği, Pati Veteriner Kliniği ve Can Dostlar...'},
      {soru:'Kadıköy’de 7/24 açık veteriner var mı?',geciyor:false,ozet:'Kadıköy Hayvan Hastanesi 7/24 hizmet veriyor...'},
      {soru:'Kadıköy veteriner tavsiye',hata:'Gemini cevap vermedi'}],
    isletme_bilgi:{bulundu:false,baska_sube:{ad:'Macitler Mobilya Genel Merkez',adres:'Mescit, 34956 Tuzla/İstanbul, Türkiye'}}, hatalar:[], kelimeler:[{kelime:'kadıköy veteriner',harita_sira:null,harita_bakilan:20,harita_ilk3:['Moda Veteriner Kliniği','Kadıköy Hayvan Hastanesi','Can Dostlar'],arama_sira:null,yerel_kutuda:2},{kelime:'en iyi veteriner kadıköy',harita_sira:null,harita_bakilan:20,harita_ilk3:['Can Dostlar'],arama_sira:7},{kelime:'veteriner kadıköy tavsiye',harita_sira:2,harita_bakilan:20,harita_ilk3:['Moda Veteriner Kliniği']}]
  };
  var GECMIS=[];
  function gun(n){return new Date(Date.now()-n*864e5).toISOString();}
  var ISL={id:'x',sektor_rehberleri:[{ad:'Trendyol',alan:'trendyol.com',ne_ise_yarar:'Mobilya alıcılarının en çok baktığı pazar yeri.'},{ad:'Şikayetvar',alan:'sikayetvar.com',ne_ise_yarar:'Güvenilirlik sorularında yapay zekânın baktığı site.'}],ad:'Macitler Mobilya',is_turu:'mobilya satıcısı',site:'https://macitler.com.tr',semt:'Çorum',calisma_sekli:['gelir'],kurulum_bitti:true,whatsapp:'0532 123 45 67',mesaj_sikligi:'haftalik'};
  ORNEK.kelimeler=[
 {kelime:'çorum mobilya',kaynak:'temel',populer:true,arama_sira:3,arama_link:'https://macitler.com.tr/corum-mobilya',yerel_kutuda:null,yerel_kutu:['Karabacak Mobilya','Modalife Çorum','Doğtaş Exclusive'],arama_ilk3:[{sira:1,baslik:'Çorum Mobilya İmalatı: İkram Mobilya',alan:'corummobilya.com',tur:null},{sira:2,baslik:'Karabacak Mobilya',alan:'instagram.com',tur:null},{sira:3,baslik:'Çorum Mobilya ve İç Mimarlık',alan:'macitler.com.tr',tur:null,siz:true}],rehberler:[{baslik:'Çorum Mobilya Mağazaları',alan:'bulurum.com',sira:6,link:'https://www.bulurum.com/x'}],harita_sira:null,harita_bakilan:20,harita_ilk3:['Modalife Çorum','Kelebek','Ergül'],harita_birinci:{ad:'Modalife Çorum',puan:4.7,yorum:812}},
 {kelime:'çorum mobilya mağazaları',kaynak:'google',populer:true,arama_sira:null,yerel_kutuda:null,yerel_kutu:['Karabacak Mobilya','Modalife Çorum','Doğtaş'],arama_ilk3:[{sira:1,baslik:'İstikbal Kerman Mobilya',alan:'instagram.com'},{sira:2,baslik:'Çorum Mobilya Firmaları',alan:'polomobilya.com',tur:'rakip'}],rehberler:[],harita_sira:14,harita_bakilan:20,harita_birinci:{ad:'Modalife Çorum',puan:4.7,yorum:812}},
 {kelime:'çorum koltuk takımı',kaynak:'oneri',populer:false,arama_sira:1,yerel_kutuda:2,yerel_kutu:['A','Macitler Mobilya','B'],arama_ilk3:[{sira:1,baslik:'Koltuk',alan:'macitler.com.tr',siz:true}],rehberler:[],harita_sira:2,harita_bakilan:20},
 {kelime:'mobilya yakınımda',kaynak:'yakin',populer:false,arama_sira:null,yerel_kutuda:null,yerel_kutu:[],arama_ilk3:[],rehberler:[]}
];ORNEK.yz_soru_sayisi=18; ORNEK.yz_gecen=3;
  ORNEK.yz_cevaplar=[]; ['Çorum’da iyi bir mobilya satıcısı önerir misin?','Çorum’da en çok tavsiye edilen mobilya satıcısı hangileri?','"çorum mobilya" diye arıyorum. Hangi işletmeleri önerirsin?'].forEach(function(q,qi){ for(var t=1;t<=3;t++) ORNEK.yz_cevaplar.push({soru:q,tekrar:t,geciyor:qi===0&&t<3||qi===2&&t===1,ozet:'Cevap '+qi+'-'+t+': Modalife, Loca Mobilya...'}); });
  for(var t=1;t<=3;t++) ['Soru 4','Soru 5','Soru 6'].forEach(function(q){ORNEK.yz_cevaplar.push({soru:q,tekrar:t,geciyor:false,ozet:'x'});}); ORNEK.harita_sira=6; ORNEK.kaynak='elle'; ORNEK.rehber_sayfalari=[{baslik:'Çorum Mobilya ve Ev Mağazaları Listesi | COM',alan:'ornekrehber.com',kelime:'çorum mobilya',sira:4}];
  ORNEK.yz_rakipler=[{ad:'Modalife Çorum',sayi:7},{ad:'Loca Mobilya',sayi:4},{ad:'Doğu Mobilya',sayi:1}];
  // Google Yapay Zekâ Modu (gyz_*): 2 soru, biri adı geçiyor; ChatGPT (cg_*) henüz yok (null) -> panelde "yakında"
  ORNEK.gyz_soru_sayisi=2; ORNEK.gyz_gecen=1;
  ORNEK.gyz_cevaplar=[
    {soru:'Çorum’da iyi bir mobilya satıcısı önerir misin?',tekrar:1,model:'google-ai-mode',aramali:true,geciyor:true,ozet:'Çorum’da mobilya için öne çıkan mağazalar geniş ürün yelpazesi ve teslimat hizmetiyle biliniyor.\nModalife Çorum\nMacitler Mobilya\nLoca Mobilya',isletmeler:['Modalife Çorum','Macitler Mobilya','Loca Mobilya']},
    {soru:'Çorum’da en çok tavsiye edilen mobilya satıcısı hangileri?',tekrar:1,model:'google-ai-mode',aramali:true,geciyor:false,ozet:'Kullanıcı yorumlarına göre Modalife ve Doğu Mobilya sık tavsiye ediliyor.\nModalife Çorum\nDoğu Mobilya',isletmeler:['Modalife Çorum','Doğu Mobilya']}];
  ORNEK.cg_soru_sayisi=null; ORNEK.cg_gecen=null; ORNEK.cg_cevaplar=null;
  GECMIS=[0,7,14,21].map(function(n,k){return Object.assign({},ORNEK,{baslangic:gun(n+1),bitis:gun(n+1),kaynak:'haftalik',harita_sira:[9,14,null,null][k],yz_gecen:[1,0,0,0][k]});});

  // Google yorumları ve platform kontrolü (yardimci: islem yorumlar / platformlar)
  window.SAHTE_YORUMLAR={tarih:new Date().toISOString(),gun:new Date().toISOString().slice(0,10),yer:{ad:'Macitler Mobilya',adres:'Ulukavak, İnönü Cd. No:12, 19100 Çorum Merkez/Çorum',place_id:'ChIJx'},puan:4.3,yorum_sayisi:37,bakilan:4,cevapsiz_sayi:3,taslak_hata:null,yorumlar:[
    {ad:'Gökhan S.',puan:1,tarih:gun(9),zaman:'bir hafta önce',metin:'Koltuklarımız kısa sürede bozuldu, firmaya ulaştık ama dönüş alamadık.',cevaplandi:false,taslak:'Gökhan, yaşadığınız bu olumsuz deneyim için çok üzgünüz ve içtenlikle özür dileriz. Konuyu görüşüp yardımcı olabilmemiz için lütfen [TELEFON] numaramızdan bizimle doğrudan iletişime geçin.'},
    {ad:'İbrahim Ç.',puan:5,tarih:gun(5),zaman:'5 gün önce',metin:'',cevaplandi:false,taslak:'İbrahim, verdiğiniz puan için çok teşekkür ederiz, sizi yine bekleriz.'},
    {ad:'Ayşe K.',puan:5,tarih:gun(20),zaman:'3 hafta önce',metin:'Yemek odası takımımızı aldık, teslimat zamanında geldi, montaj ekibi çok özenliydi.',cevaplandi:false,taslak:'Ayşe, yemek odası takımınızın zamanında ulaşmasına ve montajdan memnun kalmanıza çok sevindik. Güzel yorumunuz için teşekkür ederiz, yeni evinizde güle güle kullanın.'},
    {ad:'Emre E.',puan:4,tarih:gun(60),zaman:'2 ay önce',metin:'Ürün çeşidi fazla, fiyatlar makul.',cevaplandi:true}]};
  window.SAHTE_PLATFORMLAR={tarih:new Date().toISOString(),gun:new Date().toISOString().slice(0,10),sorgu:'"Macitler Mobilya" Çorum',arama:1,liste:[
    {ad:'Google İşletme Profili',alan:'google.com/maps',durum:'var',link:'https://www.google.com/maps',ne_yapmali:'Profiliniz var. Adres, telefon, çalışma saatleri ve fotoğrafların güncel olduğundan emin olun.'},
    {ad:'Instagram',alan:'instagram.com',durum:'var',link:'https://www.instagram.com/macitlermobilya/',ne_yapmali:'Hesabınız var. Profil açıklamanızda şehriniz, telefonunuz ve web sitenizin bağlantısı olsun.'},
    {ad:'Facebook',alan:'facebook.com',durum:'bulunamadi',link:null,ne_yapmali:'Google\'da adınızla aratınca bir Facebook sayfası çıkmadı. Sayfanız varsa adını işletme adınızla aynı yapın; yoksa facebook.com/pages/create adresinden ücretsiz açın.'},
    {ad:'Yandex Haritalar',alan:'yandex.com.tr/harita',durum:'bulunamadi',link:null,ne_yapmali:'Google\'da adınızla aratınca Yandex Haritalar kaydınız çıkmadı. Yandex Haritalar\'ı açıp adınızı arayın.'},
    {ad:'Apple Haritalar',alan:'maps.apple.com',durum:'kendiniz',link:'https://business.apple.com',ne_yapmali:'Apple Haritalar\'ı otomatik kontrol edemiyoruz. iPhone kullanan müşterileriniz ve Siri buraya bakıyor.',adimlar:['iPhone\'da Haritalar uygulamasını ya da bilgisayardan maps.apple.com adresini açın.','İşletmenizin adını ve şehrinizi yazıp arayın.','Çıkmıyorsa "Bir sorun bildir" bölümünden "İşletme ekle" deyin ya da business.apple.com adresinden ekleyin.']},
    {ad:'Bing Haritalar',alan:'bingplaces.com',durum:'kendiniz',link:'https://www.bingplaces.com',ne_yapmali:'Bing\'i otomatik kontrol edemiyoruz. ChatGPT işletme bilgilerinde Bing verisini kullanıyor.',adimlar:['bing.com/maps adresini açıp adınızı arayın.','Çıkmıyorsa bingplaces.com adresine girin.']},
    {ad:'Trendyol',alan:'trendyol.com',durum:'bulunamadi',link:null,ne_yapmali:'Google\'da adınızla aratınca bu sitede bir sayfanız çıkmadı.'},
    {ad:'Bulurum',alan:'bulurum.com',durum:'var',link:'https://www.bulurum.com/x',ne_yapmali:'Bu rehberde adınız geçiyor. Adres ve telefonunuzun doğru yazıldığını kontrol edin.'}]};
  window.supabase = { createClient: function(){
    return {
      auth: { getSession: async () => ({ data: { session: {user:{id:'u-sahip',email:'deneme@ornek.com'}} } }), signOut: async()=>{} },
      functions: { invoke: async (ad, o) => { if (ad==='yardimci') { await new Promise(r=>setTimeout(r,200)); const g=(o&&o.body)||{}; if(g.islem==='yorumlar') return {data:{yorumlar:window.SAHTE_YORUMLAR},error:null}; if(g.islem==='platformlar') return {data:{platformlar:window.SAHTE_PLATFORMLAR},error:null}; if(g.islem==='site') return {data:{site:{adres:'https://macitler.com.tr/',puan:62,tarih:new Date().toISOString(),kontroller:[{kod:'https',ad:'Güvenli bağlantı (https)',tamam:true,agirlik:10,detay:'Var.',oneri:'-'},{kod:'aciklama',ad:'Google açıklaması',tamam:false,agirlik:10,detay:'Yok.',oneri:'Her sayfaya kısa açıklama yazdırın.'},{kod:'schema',ad:'İşletme bilgisi kodu',tamam:false,agirlik:10,detay:'Yok.',oneri:'LocalBusiness kodu ekletin.'}]}},error:null}; if(g.tur==='sayfa') return {data:{metin:{tur:'sayfa',kelime:g.kelime,tarih:new Date().toISOString(),icerik:{title:'Çorum Mobilya | Macitler',aciklama:'Çorum mobilya açıklaması',h1:'Çorum’da mobilya',paragraflar:['Paragraf bir.','Paragraf iki.'],sss:[{soru:'Teslimat var mı?',cevap:'[TESLİMAT BİLGİSİ]'}]}}},error:null}; if(g.tur==='aciklama') return {data:{metin:{tur:'aciklama',tarih:new Date().toISOString(),icerik:{metin:'Macitler Mobilya, Çorum’da mobilya satıcısı.'}}},error:null}; return {data:{metin:{tur:'gonderi',tarih:new Date().toISOString(),icerik:{gonderiler:[{konu:'Yeni ürün',metin:'Gönderi bir',fotograf:'Vitrin'},{konu:'Teslimat',metin:'Gönderi iki',fotograf:'Kamyon'}]}}},error:null}; } await new Promise(r=>setTimeout(r,500)); const st=store(); st.gecmis=[ORNEK].concat(st.gecmis||GECMIS); save(st); return {data:{olcum:ORNEK},error:null}; } },
      rpc: async () => ({ data: true, error: null }),
      from: function(t){ const self={
        then(res, rej){ if(t==='yapilan_isler'){ const y=store().yapilan||[{is_kodu:'nap',baslik:'Adınızı, adresinizi ve telefonunuzu her yerde aynı yazın',yapildi:gun(10),onceki:{harita_sira:14,yz_yuzde:0}}]; return Promise.resolve(self._sil?{error:null}:{data:y,error:null}).then(res,rej);} return Promise.resolve({data:null,error:null}).then(res,rej); },
        insert(v){ const st=store(); const y=st.yapilan||[{is_kodu:'nap',baslik:'Adınızı, adresinizi ve telefonunuzu her yerde aynı yazın',yapildi:gun(10),onceki:{harita_sira:14,yz_yuzde:0}}]; const row=Object.assign({id:'r'+Date.now(),yapildi:new Date().toISOString()},v); y.push(row); st.yapilan=y; save(st); self._yeni=row; return self; },
        delete(){ self._sil=true; const st=store(); st.yapilan=[]; save(st); return self; },
        select(){ return self; }, eq(k,v){ (self._eq=self._eq||{})[k]=v; return self;}, order(){return self;}, limit(){ if(t==='olcumler'){ /* Yönetici gibi davran: süzgeçsiz sorgu başkalarının verisini de getirir */ if(!(self._eq&&self._eq.isletme_id)) return Promise.resolve({data:null,error:{message:'TEST: olcumler sorgusu isletme_id ile suzulmedi'}}); const g=store().gecmis||GECMIS; return Promise.resolve({data:g,error:null}); } return self;},
        update(v){ const st=store(); st.isl=Object.assign({},st.isl||{},v); save(st); self._u=true; return self; },
        single: async () => (self._yeni?{data:self._yeni,error:null}:{ data: Object.assign(ISL, store().isl||{}), error:null }),
        maybeSingle: async () => { if(t==='isletmeler' && !(self._eq&&self._eq.sahip==='u-sahip')) return {data:null,error:{message:'TEST: JSON object requested, multiple (or no) rows returned (isletmeler sahip ile suzulmedi)'}}; return { data: t==='olcumler' ? (store().olcum||null) : Object.assign(ISL, store().isl||{}), error:null }; }
      }; return self; }
    };
  } };
})();
