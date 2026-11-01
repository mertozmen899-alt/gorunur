// Ölçümün arama seçicisi (olcum/index.ts aramalariSec) için birim testi: müşteri niyeti olmayan aramalar ölçülmez.
// 1 Kasım: bir Çorum mobilyacısında "çorum mobilyacılar sitesi" (çarşı adı) ve "çorum mobilya siteleri" (internet mağazası)
// ölçülmüş, Mobilyacılar Odası ve usta listesi sayfaları İşlerim'e girmişti. Kelimeler o ölçümün genel aramaları.
// Kullanım: node testler/kelime-secimi.js   (Deno gerekir: PATH'te "deno" ya da DENO ortam değişkeni)
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const kaynak = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'functions', 'olcum', 'index.ts'), 'utf8');
const kes = (bas, son) => { const i = kaynak.indexOf(bas), j = kaynak.indexOf(son, i); if (i < 0 || j < 0) { console.error('bulunamadı: ' + bas); process.exit(1); } return kaynak.slice(i, j); };
const islevler = kes('// Türkçe karakterleri sadeleştirip', 'async function sektorProfili') + kes('const UNVAN', 'async function ozelAdlariBul') + kes('type Aday', 'const REHBER_ALAN');
const PROFIL = { temel: 'mobilya', esler: ['mobilya mağazası', 'mobilyacı', 'ev mobilyası', 'mobilya showroom'], urunler: ['koltuk takımı', 'yatak odası takımı', 'yemek odası takımı', 'köşe koltuk', 'tv ünitesi'],
  aramalar: ['çorum mobilyacı', 'çorum mobilya mağazaları', 'çorum en iyi mobilyacı', 'çorum koltuk takımı fiyatları', 'çorum yatak odası takımları', 'çorum modern mobilya', 'çorum mobilya siteleri', 'çorum da mobilya mağazası', 'çorum uygun fiyatlı mobilya', 'çorum yemek odası takımı', 'çorum köşe koltuk modelleri', 'çorum özel ölçü mobilya'], ozel_adlar: [] };
const ONERILER = ['çorum mobilya mağazaları', 'çorum mobilyacılar', 'çorum mobilya fuarı', 'çorum mobilyacılar sitesi', 'çorum mobilya imalat', 'çorum mobilya imalatçıları', 'çorum mobilyacı', 'çorum mobilya aksesuar', 'çorum mobilya montaj', 'çorum mobilya fuarı nerede', 'çorum mobilya iş ilanları', 'çorum mobilya boyama', 'çorum mobilya firmaları', 'çorum mobilyacılar odası başkanı', 'çorum mobilyacılar odası'];
const test = `
function bak(ad, kosul, detay) { if (!kosul) { console.log("KALDI: " + ad + (detay ? " -> " + detay : "")); Deno.exit(1); } console.log("geçti: " + ad); }
const s = aramalariSec({ yer: "çorum", sehir: "çorum", turkiye: false, isK: "mobilyacı", profil: ${JSON.stringify(PROFIL)}, oneriler: ${JSON.stringify(ONERILER)}, elle: [], konumVar: true });
const l = s.liste.map((a) => a.kelime), yazi = l.join(" | ");
bak("çarşı/internet mağazası araması (sitesi, siteleri) yok", !l.some((k) => /(^| )site/.test(k)), yazi);
bak("meslek odası, başkan araması yok", !l.some((k) => /odası başkan|mobilyacılar odası/.test(k)), yazi);
bak("fuar ve iş ilanı araması yok", !l.some((k) => /fuar|ilan/.test(k)), yazi);
bak("temel arama var (çorum mobilya)", l.includes("çorum mobilya"), yazi);
bak("'yatak odası' ürün araması elenmedi", l.some((k) => /yatak odası/.test(k)), yazi);
bak("en az 6 arama kaldı", l.length >= 6, yazi);
const w = aramalariSec({ yer: "çorum", sehir: "çorum", turkiye: false, isK: "web sitesi tasarımı", profil: null, oneriler: ["çorum web sitesi tasarımı"], elle: [], konumVar: true });
bak("web tasarımcıda 'web sitesi' araması kalır", w.liste.some((a) => a.kelime === "çorum web sitesi tasarımı"), w.liste.map((a) => a.kelime).join(" | "));
`;
const gecici = path.join(os.tmpdir(), 'norevo-kelime-secimi-test.ts');
fs.writeFileSync(gecici, islevler + test);
try { process.stdout.write(execFileSync(process.env.DENO || 'deno', ['run', '--no-check', gecici], { encoding: 'utf8' })); }
catch (e) { process.stdout.write(String(e.stdout || '')); console.error(String(e.stderr || e.message)); process.exit(1); }
