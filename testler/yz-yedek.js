// yardimci gemini(): Gemini modellerinin hepsi düşünce (429) ChatGPT'ye geçer (1 Kasım: yorum taslakları kota yüzünden yazılmadı).
// Ağa çıkmaz: fetch sahte. Kullanım: node testler/yz-yedek.js   (Deno gerekir: PATH'te "deno" ya da DENO ortam değişkeni)
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const kaynak = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'functions', 'yardimci', 'index.ts'), 'utf8');
const i = kaynak.indexOf('// ---------------- Gemini (JSON cevap)'), j = kaynak.indexOf('const KURAL', i);
if (i < 0 || j < 0) { console.error('gemini() bulunamadı'); process.exit(1); }
const test = `
function bak(ad, kosul, detay) { if (!kosul) { console.log("KALDI: " + ad + (detay ? " -> " + detay : "")); Deno.exit(1); } console.log("geçti: " + ad); }
const istekler = [];
let openaiCevap = { status: 200, body: { output: [{ content: [{ text: '{"taslaklar":["Teşekkürler"]}' }] }] } };
globalThis.fetch = async (url, o) => {
  istekler.push({ url: String(url), govde: JSON.parse(o.body) });
  if (String(url).includes("generativelanguage")) return new Response(JSON.stringify({ error: { code: 429 } }), { status: 429 });
  return new Response(JSON.stringify(openaiCevap.body), { status: openaiCevap.status });
};
Deno.env.delete("GEMINI_MODEL"); Deno.env.delete("OPENAI_MODEL");
Deno.env.delete("OPENAI_API_KEY");
let hata = ""; try { await gemini("Sadece JSON döndür", "g"); } catch (e) { hata = String(e); }
bak("ChatGPT anahtarı yoksa eski hata mesajı", /cevap vermedi \\(gemini-flash-latest: 429\\)/.test(hata), hata);
Deno.env.set("OPENAI_API_KEY", "o"); istekler.length = 0;
const c = await gemini("Sadece JSON döndür", "g", 0.7);
bak("Gemini 429 olunca ChatGPT cevabı okunur", c && c.taslaklar && c.taslaklar[0] === "Teşekkürler", JSON.stringify(c));
bak("önce 3 Gemini modeli denenir", istekler.filter((x) => x.url.includes("generativelanguage")).length === 3);
const oi = istekler.find((x) => x.url.includes("openai.com"));
bak("ChatGPT'ye JSON biçimi ve 'JSON' kelimesi gider", oi && oi.govde.text.format.type === "json_object" && /JSON/.test(oi.govde.input));
bak("gpt-5'e sıcaklık gönderilmez (desteklemiyor)", oi && oi.govde.model === "gpt-5-mini" && oi.govde.temperature === undefined && oi.govde.reasoning);
openaiCevap = { status: 500, body: {} }; hata = "";
try { await gemini("Sadece JSON döndür", "g"); } catch (e) { hata = String(e); }
bak("ChatGPT de düşerse hata hepsini anlatır", /gemini-flash-latest: 429; gpt-5-mini: 500; gpt-4.1-mini: 500/.test(hata), hata);
`;
const gecici = path.join(os.tmpdir(), 'norevo-yz-yedek-test.ts');
fs.writeFileSync(gecici, kaynak.slice(i, j) + test);
try { process.stdout.write(execFileSync(process.env.DENO || 'deno', ['run', '--no-check', '--allow-env', gecici], { encoding: 'utf8' })); }
catch (e) { process.stdout.write(String(e.stdout || '')); console.error(String(e.stderr || e.message)); process.exit(1); }
