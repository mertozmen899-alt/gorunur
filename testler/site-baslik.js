// "Sitenizin başlığını düzeltin" işi site taramasına göre kişiselleşiyor mu: node testler/site-baslik.js
// panel.js içindeki IS.siteBaslik'i 4KDent'in gerçek tarama sonucuyla (1 Kasım) dener.
const assert = require('assert');
const kaynak = require('fs').readFileSync(require('path').join(__dirname, '..', 'assets', 'panel.js'), 'utf8');
const bas = kaynak.indexOf('siteBaslik: function'), son = kaynak.indexOf('\n    siteYok:', bas);
const yerAdi = (i) => i.semt; // eslint-disable-line no-unused-vars
const siteBaslik = eval('(' + kaynak.slice(bas + 'siteBaslik: '.length, son).trim().replace(/,$/, '') + ')');
const K = (kod, tamam, detay) => ({ kod, tamam, detay });
const dent = { ad: '4KDent', semt: 'Çorum', is_turu: 'Diş kliniği', site_saglik: { kontroller: [K('baslik', true), K('aciklama', false, 'Açıklama: "Çorum"'), K('telefon', true), K('yer', true)] } };

const a = siteBaslik(dent, 'çorum diş kliniği');
assert(!/title/.test(a.metin.yazi), 'başlık zaten iyi, istenmemeli');
assert(/meta description/.test(a.metin.yazi) && /Şu an sadece "Çorum" yazıyor/.test(a.metin.yazi), 'eksik açıklama istenmeli');
assert(!/telefonumuz|adresimiz/.test(a.metin.yazi), 'telefon ve yer zaten var');
assert(/Eksik olan: Google açıklaması/.test(a.n));
assert.strictEqual(siteBaslik({ ...dent, site_saglik: { kontroller: [K('baslik', true), K('aciklama', true), K('telefon', true), K('yer', true)] } }, 'x'), null, 'hepsi tamamsa iş yok');
const taranmamis = siteBaslik({ ...dent, site_saglik: null }, 'x');
assert(/title/.test(taranmamis.metin.yazi) && /telefonumuz ve adresimiz/.test(taranmamis.metin.yazi), 'taranmamışsa hepsi istenir');
console.log('site-baslik: 6/6 geçti');
