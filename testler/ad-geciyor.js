// Ölçümün ad eşleştiricisi (olcum/index.ts adGeciyor) için birim testi.
// Kullanım: node testler/ad-geciyor.js   (Deno gerekir: PATH'te "deno" ya da DENO ortam değişkeni)
// İşlevler dosyadan kesilip geçici bir .ts dosyasında çalıştırılır (index.ts sunucu başlattığı için doğrudan alınamaz).
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const kaynak = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'functions', 'olcum', 'index.ts'), 'utf8');
const kes = (bas, son) => { const i = kaynak.indexOf(bas), j = kaynak.indexOf(son, i); if (i < 0 || j < 0) { console.error('bulunamadı: ' + bas); process.exit(1); } return kaynak.slice(i, j); };
const islevler = kes('// Türkçe karakterleri sadeleştirip', 'function alanAdi') + kes('// İşletme adı bir başlıkla', 'async function serp(');
const test = `
function bak(ad, kosul) { if (!kosul) { console.log("KALDI: " + ad); Deno.exit(1); } console.log("geçti: " + ad); }
// Yaygın kelimeyle başlayan adlar başka işletmeyle karışmamalı
bak("Güneş Diş, Güneş Kuaför'ü anan cevapla eşleşmez", !adGeciyor("Çorum'da Güneş Kuaför çok beğeniliyor", "Güneş Diş Kliniği"));
bak("Güneş Diş, kendi adıyla eşleşir", adGeciyor("Güneş Diş Kliniği'ni öneririm", "Güneş Diş Kliniği"));
bak("Güneş Diş, ekli haliyle eşleşir", adGeciyor("güneş dişte tedavi oldum", "Güneş Diş"));
bak("Yıldız Mobilya, Yıldız Kuaför ile eşleşmez", !adGeciyor("Yıldız Kuaför", "Yıldız Mobilya"));
bak("Yıldız Mobilya, sektör kelimesi hariçken de Yıldız Kuaför ile eşleşmez", !adGeciyor("Yıldız Kuaför", "Yıldız Mobilya", new Set(["mobilya", "corum"])));
bak("Yıldız Mobilya, sektör kelimesi hariçken kendi adıyla eşleşir", adGeciyor("Yıldız Mobilya'ya bakın", "Yıldız Mobilya", new Set(["mobilya", "corum"])));
bak("ad kendisiyle eşleşir (adHaric hesabı)", adGeciyor("Defne Rehabilitasyon Merkezi", "Defne Rehabilitasyon Merkezi", new Set(["rehabilitasyon"])));
// Yaygın olmayan adlar eskisi gibi
bak("Macitler Mobilya, Macitler'de ile eşleşir", adGeciyor("Macitlerde güzel koltuklar var", "Macitler Mobilya"));
bak("Modalife tek kelimeyle eşleşir", adGeciyor("Modalife Çorum öne çıkıyor", "Modalife"));
bak("başka marka eşleşmez", !adGeciyor("Loca Mobilya", "Macitler Mobilya"));
`;
const gecici = path.join(os.tmpdir(), 'norevo-ad-geciyor-test.ts');
fs.writeFileSync(gecici, islevler + test);
try { process.stdout.write(execFileSync(process.env.DENO || 'deno', ['run', '--no-check', gecici], { encoding: 'utf8' })); }
catch (e) { process.stdout.write(String(e.stdout || '')); console.error(String(e.stderr || e.message)); process.exit(1); }
finally { fs.unlinkSync(gecici); }
