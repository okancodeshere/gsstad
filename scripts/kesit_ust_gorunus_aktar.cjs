// Yan görünüş (kesit) → üst görünüş ekipman aktarımı.
// Kullanım: node scripts/kesit_ust_gorunus_aktar.cjs giris.dxf cikis.dxf
//
// - "kuzey ref" katmanındaki 4 çizgiden (2 düşey = yan görünüş, 2 yatay = üst görünüş) dönüşüm hesaplanır.
//   Üst görünüş 90° dönük: yan görünüş X'i → üst görünüş Y'si. Yan görünüşün SOL ucu üst görünüşte +Y'ye gider
//   (yan görünüş sahadan bakış; kullanıcı kararı 2026-11-15).
// - 8li / 2li (yan) → 8lıüst / 2lıüst (üst): taban plakası dış kenarları eşlenir, kafes 200'lük duvar bandına
//   (kolon ayakları arası) ortalanır, ON yüzü sahaya (−X) bakar.
// - "tava hattı" bloğundaki her "tava yan kesit" → "tavaüst", her AYAK_KONSOL → "konsolüst";
//   bandın saha tarafı kenarında (x = bandX0). Tava parçaları plan izdüşümüne göre X ölçekli (cos eğim).
// Dosya latin1 olarak okunup yazılır (baytlar korunur); adlar karşılaştırma için UTF-8'e çevrilir.
const fs = require('fs');
const [inp, outp] = process.argv.slice(2);
if (!inp || !outp) { console.error('Kullanim: node kesit_ust_gorunus_aktar.cjs giris.dxf cikis.dxf'); process.exit(1); }

const raw = fs.readFileSync(inp, 'latin1');
const EOL = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r?\n/);
const u = (s) => Buffer.from(s, 'latin1').toString('utf8');          // görüntü/karşılaştırma için
const b = (s) => Buffer.from(s, 'utf8').toString('latin1');          // dosyaya yazmak için

// --- Ayrıştırma -------------------------------------------------------------------------------
const P = []; // {c, v, ln}
for (let i = 0; i + 1 < lines.length; i += 2) P.push({ c: parseInt(lines[i], 10), v: lines[i + 1], ln: i });
const sec = {};
P.forEach((p, i) => { if (p.c === 0 && p.v === 'SECTION') sec[P[i + 1].v] = i; });
function ents(a, z) {
  const out = []; let cur = null;
  for (let j = a; j < z; j++) {
    if (P[j].c === 0) { if (cur) out.push(cur); cur = { type: P[j].v, g: [], i: j }; } else if (cur) cur.g.push(P[j]);
  }
  if (cur) out.push(cur);
  return out;
}
const G = (e, c) => { const g = e.g.find((q) => q.c === c); return g ? g.v : undefined; };
const N = (e, c, d = 0) => { const v = G(e, c); return v === undefined ? d : parseFloat(v); };
const A = (e, c) => e.g.filter((q) => q.c === c).map((q) => parseFloat(q.v));
const name = (e) => u(G(e, 2) || '');
const layer = (e) => u(G(e, 8) || '');

const blocks = {}; let cb = null;
for (const e of ents(sec.BLOCKS + 2, sec.ENTITIES)) {
  if (e.type === 'BLOCK') { cb = { ents: [] }; blocks[name(e)] = cb; } else if (e.type === 'ENDBLK') cb = null; else if (cb) cb.ents.push(e);
}
const ms = ents(sec.ENTITIES + 2, sec.OBJECTS).filter((e) => e.type !== 'ENDSEC');
const entitiesEndLine = P[sec.OBJECTS].ln - 2; // "0 / ENDSEC" satırı

function bboxOf(block, layerName) {
  const bb = [Infinity, Infinity, -Infinity, -Infinity];
  const add = (x, y) => { bb[0] = Math.min(bb[0], x); bb[1] = Math.min(bb[1], y); bb[2] = Math.max(bb[2], x); bb[3] = Math.max(bb[3], y); };
  for (const e of blocks[block].ents) {
    if (layerName && layer(e) !== layerName) continue;
    if (e.type === 'LINE') { add(N(e, 10), N(e, 20)); add(N(e, 11), N(e, 21)); }
    else if (e.type === 'LWPOLYLINE') { const x = A(e, 10), y = A(e, 20); x.forEach((v, k) => add(v, y[k])); }
    else if (e.type === 'CIRCLE' || e.type === 'ARC') { const r = N(e, 40); add(N(e, 10) - r, N(e, 20) - r); add(N(e, 10) + r, N(e, 20) + r); }
  }
  if (!isFinite(bb[0])) throw new Error(`"${block}" blogunda ${layerName || ''} geometrisi yok`);
  return bb;
}

// --- 1) REF çizgilerinden dönüşüm --------------------------------------------------------------
const refs = ms.filter((e) => e.type === 'LINE' && layer(e) === 'kuzey ref')
  .map((e) => ({ x1: N(e, 10), y1: N(e, 20), x2: N(e, 11), y2: N(e, 21) }));
const uniq = (arr) => arr.filter((v, i) => arr.findIndex((w) => Math.abs(w - v) < 1e-3) === i).sort((p, q) => p - q);
const sideX = uniq(refs.filter((r) => Math.abs(r.x1 - r.x2) < Math.abs(r.y1 - r.y2)).map((r) => (r.x1 + r.x2) / 2));
const topRefs = refs.filter((r) => Math.abs(r.x1 - r.x2) >= Math.abs(r.y1 - r.y2));
const topY = uniq(topRefs.map((r) => (r.y1 + r.y2) / 2));
if (sideX.length !== 2 || topY.length !== 2) throw new Error(`REF cizgileri beklenen gibi degil: yan ${sideX.length}, ust ${topY.length}`);
const scale = (topY[1] - topY[0]) / (sideX[1] - sideX[0]);
const cx = (sideX[0] + sideX[1]) / 2, cy = (topY[0] + topY[1]) / 2;
console.log(`REF yan gorunus X: ${sideX.map((v) => v.toFixed(3)).join(' / ')}  (aralik ${(sideX[1] - sideX[0]).toFixed(3)})`);
console.log(`REF ust gorunus Y: ${topY.map((v) => v.toFixed(3)).join(' / ')}  (aralik ${(topY[1] - topY[0]).toFixed(3)})`);
console.log(`Olcek ${scale.toFixed(6)}  merkez yan X ${cx.toFixed(3)} <-> ust Y ${cy.toFixed(3)}`);
if (Math.abs(scale - 1) > 0.002) throw new Error('Olcek 1 degil (fark > %0.2): durduruldu, kullaniciya sor.');
// Ölçek farkı REF çizgilerinin çizim hassasiyeti kadar (≈1e-5); 1 alınır, merkezler eşlenir.
const toTopY = (xs) => cy - (xs - cx); // yan görünüş solu → +Y

// --- Duvar bandı: kolon ayakları arasındaki boşluk (2-KOLON) ------------------------------------
const kolX = [];
ms.filter((e) => e.type === 'LWPOLYLINE' && layer(e) === '2-KOLON').forEach((e) => kolX.push(...A(e, 10)));
const kx = uniq(kolX); // dış, ayak iç yüzleri ...
// Ayak iç yüzleri: en büyük boşluğu veren ardışık iki X (dış kenarlar hariç ortadaki boşluk)
let bandX0 = null, bandX1 = null;
{
  const xs = kx; const mid = (xs[0] + xs[xs.length - 1]) / 2;
  const left = xs.filter((v) => v < mid), right = xs.filter((v) => v > mid);
  // ayak = dış kenardan sonraki ikinci düşey yüz
  bandX0 = left[left.length - 1]; bandX1 = right[0];
}
const bandC = (bandX0 + bandX1) / 2;
console.log(`Duvar bandi X: ${bandX0.toFixed(2)} .. ${bandX1.toFixed(2)} (genislik ${(bandX1 - bandX0).toFixed(2)})`);

// --- INSERT üretimi (dönüş −90°: yerel (x,y) → (y, −x); blok solu +Y'de, yerel −Y (ON) sahaya/−X) ---
const placements = []; // {block, layer, ins:[x,y], sx, info}
function place(block, layerName, localPt, worldPt, sx, info) {
  // world = ins + (ly, −lx·sx)
  placements.push({ block, layer: layerName, ins: [worldPt[0] - localPt[1], worldPt[1] + localPt[0] * sx], sx, info });
}

// 2) Kafesler
const PAIRS = { '8li': '8lıüst', '2li': '2lıüst' };
for (const e of ms.filter((q) => q.type === 'INSERT' && PAIRS[name(q)])) {
  const side = name(e), top = PAIRS[side];
  const s = N(e, 41, 1);
  const sb = bboxOf(side, 'TABAN'), tb = bboxOf(top, 'TABAN');
  const xsL = N(e, 10) + s * sb[0], xsR = N(e, 10) + s * sb[2];
  const wSide = xsR - xsL, wTop = tb[2] - tb[0];
  if (Math.abs(wSide - wTop) > 0.5) console.log(`  UYARI: ${side} genislik ${wSide.toFixed(2)} != ${top} ${wTop.toFixed(2)}`);
  const xc = (xsL + xsR) / 2;
  place(top, 'UST_KAFES', [(tb[0] + tb[2]) / 2, (tb[1] + tb[3]) / 2], [bandC, toTopY(xc)], 1,
    `${side} yan X ${xsL.toFixed(1)}..${xsR.toFixed(1)} -> ust Y ${toTopY(xsL).toFixed(1)}..${toTopY(xsR).toFixed(1)}`);
}

// 3) Tava ve konsollar ("tava hattı" bloğunun içinden)
const th = ms.find((q) => q.type === 'INSERT' && name(q) === 'tava hattı');
if (!th) throw new Error('"tava hattı" INSERT bulunamadi');
if (N(th, 41, 1) !== 1 || N(th, 50) !== 0) throw new Error('"tava hattı" olcekli/donuk: desteklenmiyor');
const thx = N(th, 10);
const tySide = bboxOf('tava yan kesit'), tTop = bboxOf('tavaüst'), kTop = bboxOf('konsolüst');
const tavaLen = tySide[2] - tySide[0];
if (Math.abs(tavaLen - (tTop[2] - tTop[0])) > 0.01) console.log('  UYARI: tava blok boylari farkli');
let tavaN = 0, konsolN = 0, tavaMin = Infinity, tavaMax = -Infinity;
for (const e of blocks['tava hattı'].ents.filter((q) => q.type === 'INSERT')) {
  const n = name(e), x = N(e, 10), sx = N(e, 41, 1), rot = (N(e, 50) * Math.PI) / 180;
  if (n === 'tava yan kesit') {
    // Parçanın hat üzerindeki başlangıç ucu (alt kenar, sol): ins + R(rot)·(sx·x0, y0)
    const xs0 = thx + x + Math.cos(rot) * sx * tySide[0] - Math.sin(rot) * tySide[1];
    const k = sx * Math.cos(rot); // plan izdüşüm boyu oranı
    place('tavaüst', 'UST_TAVA', [tTop[0], (tTop[1] + tTop[3]) / 2], [bandX0, toTopY(xs0)], k, null);
    tavaMin = Math.min(tavaMin, xs0); tavaMax = Math.max(tavaMax, xs0 + tavaLen * k); tavaN++;
  } else if (n === 'AYAK_KONSOL') {
    place('konsolüst', 'UST_KONSOL', [(kTop[0] + kTop[2]) / 2, (kTop[1] + kTop[3]) / 2], [bandX0, toTopY(thx + x)], 1, null);
    konsolN++;
  }
}
console.log(`Tava: ${tavaN} parca, yan X ${tavaMin.toFixed(1)}..${tavaMax.toFixed(1)} -> ust Y ${toTopY(tavaMin).toFixed(1)}..${toTopY(tavaMax).toFixed(1)} (x = ${bandX0.toFixed(2)})`);
console.log(`Konsol: ${konsolN} adet`);
placements.filter((p) => p.info).forEach((p) => console.log('  ' + p.info));

// --- Yazım -----------------------------------------------------------------------------------
const hsIdx = P.findIndex((p) => p.c === 9 && p.v === '$HANDSEED');
let h = parseInt(P[hsIdx + 1].v, 16);
const owner = G(ms.find((e) => e.type === 'INSERT'), 330);
const out = [];
for (const p of placements) {
  out.push('  0', 'INSERT', '  5', (h++).toString(16).toUpperCase(), '330', owner, '100', 'AcDbEntity', '  8', p.layer,
    '100', 'AcDbBlockReference', '  2', b(p.block),
    ' 10', p.ins[0].toFixed(6), ' 20', p.ins[1].toFixed(6), ' 30', '0.0',
    ' 41', p.sx.toFixed(9), ' 42', '1.0', ' 43', '1.0', ' 50', '270.0');
}
// Yeni katmanlar
const tabs = ents(sec.TABLES + 2, sec.BLOCKS);
const layRecs = tabs.filter((e) => e.type === 'LAYER');
const layTable = tabs.find((e) => e.type === 'TABLE' && G(e, 2) === 'LAYER');
const layEndtab = tabs.find((e) => e.type === 'ENDTAB' && e.i > layRecs[layRecs.length - 1].i);
const sample = layRecs[0];
const layDefs = [];
const COLORS = { UST_KAFES: 3, UST_TAVA: 30, UST_KONSOL: 6 };
for (const ln of Object.keys(COLORS)) {
  if (layRecs.some((e) => name(e) === ln)) continue;
  const d = ['  0', 'LAYER', '  5', (h++).toString(16).toUpperCase(), '330', G(sample, 330), '100', 'AcDbSymbolTableRecord', '100', 'AcDbLayerTableRecord',
    '  2', ln, ' 70', '     0', ' 62', String(COLORS[ln]).padStart(6), '  6', 'Continuous', '370', '    -3'];
  if (G(sample, 390)) d.push('390', G(sample, 390));
  layDefs.push(...d);
}
const L2 = lines.slice();
L2.splice(entitiesEndLine, 0, ...out); // önce sondaki ekleme
if (layDefs.length) {
  L2.splice(P[layEndtab.i].ln, 0, ...layDefs);
  const cnt = layTable.g.find((q) => q.c === 70);
  L2[cnt.ln + 1] = String(parseInt(cnt.v, 10) + layDefs.filter((v) => v === 'LAYER').length).padStart(6);
}
L2[P[hsIdx + 1].ln + 1] = h.toString(16).toUpperCase();
fs.writeFileSync(outp, L2.join(EOL), 'latin1');
console.log(`Eklenen INSERT: ${placements.length}  ->  ${outp}`);
