// "Sitenizin başlığını düzeltin" işi: site taranmışsa çıkmaz (eksikler "Sitenizdeki eksikleri düzelttirin" işinde),
// taranmamışsa genel mesaj verir. Kullanım: node testler/site-baslik.js
const assert = require('assert');
const kaynak = require('fs').readFileSync(require('path').join(__dirname, '..', 'assets', 'panel.js'), 'utf8');
const bas = kaynak.indexOf('siteBaslik: function'), son = kaynak.indexOf('\n    siteYok:', bas);
const yerAdi = (i) => i.semt; // eslint-disable-line no-unused-vars
const siteBaslik = eval('(' + kaynak.slice(bas + 'siteBaslik: '.length, son).trim().replace(/,$/, '') + ')');
const K = (kod, tamam, detay) => ({ kod, tamam, detay });
const dent = { ad: '4KDent', semt: 'Çorum', is_turu: 'Diş kliniği', site_saglik: { kontroller: [K('baslik', true), K('aciklama', false, 'Açıklama: "Çorum"'), K('telefon', true), K('yer', true)] } };

assert.strictEqual(siteBaslik(dent, 'çorum diş kliniği'), null, 'taranmış sitede eksikler site işinde; tekrar istenmez');
const taranmamis = siteBaslik({ ...dent, site_saglik: null }, 'çorum diş kliniği');
assert(/title/.test(taranmamis.metin.yazi) && /meta description/.test(taranmamis.metin.yazi), 'taranmamışsa başlık ve açıklama istenir');
assert(/telefonumuz ve adresimiz/.test(taranmamis.metin.yazi), 'taranmamışsa telefon ve adres istenir');
assert(/"çorum diş kliniği" aramasında/.test(taranmamis.n));
console.log('site-baslik: 4/4 geçti');
