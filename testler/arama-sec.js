// Ölçümün arama seçicisi (olcum/index.ts aramalariSec) için birim testi.
// Kullanım: node testler/arama-sec.js   (Deno gerekir: PATH'te "deno" ya da DENO ortam değişkeni)
// İşlev dosyadan kesilip geçici bir .ts dosyasında çalıştırılır (index.ts sunucu başlattığı için doğrudan alınamaz).
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const kaynak = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'functions', 'olcum', 'index.ts'), 'utf8');
const i = kaynak.indexOf('// Türkçe karakterleri sadeleştirip'), j = kaynak.indexOf('// Google sonuçlarında rehber / liste');
if (i < 0 || j < 0) { console.error('aramalariSec bulunamadı'); process.exit(1); }
const islevler = kaynak.slice(i, j).replace(/async function (sektorProfili|googleOnerileri|ozelAdlariBul)[\s\S]*?\n}\n/g, '');
const test = `
function bak(ad, kosul) { if (!kosul) { console.log("KALDI: " + ad); Deno.exit(1); } console.log("geçti: " + ad); }
// Gerçek örnek (Deren, Çorum, 31 Ekim): Google önerilerinde başka iş, kurum ve rakip adları vardı
const profil = { temel: "rehabilitasyon merkezi", esler: ["özel eğitim merkezi", "engelli eğitim merkezi", "fizyoterapi merkezi"],
  urunler: ["özel eğitim", "fizik tedavi", "dil terapisi", "fizyoterapi", "duyu bütünleme"], aramalar: ["çorum otizm eğitimi"],
  ozel_adlar: ["çorum gülenyüz rehabilitasyon merkezi"] };
const oneriler = ["defne rehabilitasyon merkezi çorum", "çorum gülenyüz rehabilitasyon merkezi", "çorum hayvan rehabilitasyon merkezi",
  "çorum belediyesi rehabilitasyon merkezi", "çorum rehabilitasyon merkezleri is ilanları", "çorum otizm rehabilitasyon merkezi"];
const k = aramalariSec({ yer: "çorum", sehir: "", turkiye: false, isK: "rehabilitasyon merkezi", profil, oneriler, elle: [], konumVar: true }).liste.map((a) => a.kelime);
bak("rakip adı (defne) elendi", !k.some((x) => x.includes("defne")));
bak("başka iş (hayvan) elendi", !k.some((x) => x.includes("hayvan")));
bak("kurum (belediyesi) elendi", !k.some((x) => x.includes("belediye")));
bak("temel arama ilk sırada", k[0] === "çorum rehabilitasyon merkezi");
bak("profildeki kelimeyle gelen öneri kaldı (otizm)", k.includes("çorum otizm rehabilitasyon merkezi"));
// Ekli kelimeler tanınır, marka adı tanınmaz
const m = aramalariSec({ yer: "çorum", sehir: "", turkiye: false, isK: "mobilya", profil: { temel: "mobilya", esler: ["mobilyacı"], urunler: ["koltuk takımı"], aramalar: [] },
  oneriler: ["çorum mobilyacılar", "çorumdaki mobilya mağazaları", "çorum yıldız mobilya"], elle: [], konumVar: false }).liste.map((a) => a.kelime);
bak("ekli kelime kaldı (mobilyacılar)", m.includes("çorum mobilyacılar"));
bak("marka adı elendi (yıldız)", !m.some((x) => x.includes("yıldız")));
`;
const gecici = path.join(os.tmpdir(), 'norevo-arama-sec-test.ts');
fs.writeFileSync(gecici, islevler + test);
try { process.stdout.write(execFileSync(process.env.DENO || 'deno', ['run', '--no-check', gecici], { encoding: 'utf8' })); }
catch (e) { process.stdout.write(String(e.stdout || '')); console.error(String(e.stderr || e.message)); process.exit(1); }
finally { fs.unlinkSync(gecici); }
