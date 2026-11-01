// Mahalle ısı haritası (yardimci/index.ts isiNoktalari, isiSira) için birim testi.
// Kullanım: node testler/isi-haritasi.js   (Deno gerekir: PATH'te "deno" ya da DENO ortam değişkeni)
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const kaynak = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'functions', 'yardimci', 'index.ts'), 'utf8');
const kes = (bas, son) => { const i = kaynak.indexOf(bas), j = kaynak.indexOf(son, i); if (i < 0 || j < 0) { console.error('bulunamadı: ' + bas); process.exit(1); } return kaynak.slice(i, j); };
const islevler = kes('function isiNoktalari', 'Deno.serve(').split('\n// ')[0];
const test = `
function bak(ad, kosul) { if (!kosul) { console.log("KALDI: " + ad); Deno.exit(1); } console.log("geçti: " + ad); }
const n = isiNoktalari(40.55, 34.95, 1);
bak("9 nokta", n.length === 9);
bak("ortadaki nokta işletmenin yeri", n[4].lat === 40.55 && n[4].lng === 34.95);
bak("ilk satır kuzeyde, sol sütun batıda", n[0].lat > 40.55 && n[0].lng < 34.95 && n[8].lat < 40.55 && n[8].lng > 34.95);
const km = (a, b) => Math.hypot((a.lat - b.lat) * 111, (a.lng - b.lng) * 111 * Math.cos(a.lat * Math.PI / 180));
bak("komşu noktalar ~1 km arayla", Math.abs(km(n[3], n[4]) - 1) < 0.01 && Math.abs(km(n[1], n[4]) - 1) < 0.01);
const L = [{ data_id: "a", position: 1 }, { data_id: "biz", position: 2 }, { data_id: "c" }];
bak("sıra position'dan", isiSira(L, "biz") === 2);
bak("position yoksa liste sırası", isiSira([{ data_id: "x" }, { data_id: "biz" }], "biz") === 2);
bak("listede yoksa null", isiSira(L, "yok") === null);
bak("20'den sonrası sayılmaz", isiSira(Array.from({ length: 25 }, (_, i) => ({ data_id: i === 22 ? "biz" : "r" + i })), "biz") === null);
`;
const gecici = path.join(os.tmpdir(), 'norevo-isi-haritasi-test.ts');
fs.writeFileSync(gecici, islevler + test);
try { process.stdout.write(execFileSync(process.env.DENO || 'deno', ['run', '--no-check', gecici], { encoding: 'utf8' })); }
catch (e) { process.stdout.write(String(e.stdout || '')); console.error(String(e.stderr || e.message)); process.exit(1); }
finally { fs.unlinkSync(gecici); }
