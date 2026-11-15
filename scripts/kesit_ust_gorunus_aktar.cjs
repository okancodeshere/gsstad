// Yan görünüş (kesit) → üst görünüş ekipman aktarımı.
// Kullanım: node scripts/kesit_ust_gorunus_aktar.cjs giris.dxf cikis.dxf
//
// - "kuzey ref" katmanındaki 4 çizgiden (2 düşey = yan görünüş, 2 yatay = üst görünüş) ölçek ve merkez hesaplanır.
// - Yan görünüş AÇILIMDIR: yatay mesafe, plandaki C eğrisi (parabolik_kiris iç eğrisi) üzerinde yay boyudur;
//   ref merkezinden ölçülür. Yan görünüş C'nin içinden bakış: sol uç −Y ucuna gider (kullanıcı kararları 2026-11-15).
// - 8li / 2li (yan) → 8lıüst / 2lıüst (üst): taban plakası uçları iç eğriye kiriş olarak oturur, kafes iki
//   parabolik_kiris eğrisi arasındaki 200'lük banda ortalanır, ON yüzü C'nin içine bakar.
// - "tava hattı" bloğundaki her "tava yan kesit" → "tavaüst", her AYAK_KONSOL → "konsolüst"; iç eğri üzerinde,
//   eğrinin teğetine göre dönük.
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

// --- 1) REF çizgileri: ölçek ve merkez ----------------------------------------------------------
const refs = ms.filter((e) => e.type === 'LINE' && layer(e) === 'kuzey ref')
  .map((e) => ({ x1: N(e, 10), y1: N(e, 20), x2: N(e, 11), y2: N(e, 21) }));
const uniq = (arr) => arr.filter((v, i) => arr.findIndex((w) => Math.abs(w - v) < 1e-3) === i).sort((p, q) => p - q);
const sideX = uniq(refs.filter((r) => Math.abs(r.x1 - r.x2) < Math.abs(r.y1 - r.y2)).map((r) => (r.x1 + r.x2) / 2));
const topY = uniq(refs.filter((r) => Math.abs(r.x1 - r.x2) >= Math.abs(r.y1 - r.y2)).map((r) => (r.y1 + r.y2) / 2));
if (sideX.length !== 2 || topY.length !== 2) throw new Error(`REF cizgileri beklenen gibi degil: yan ${sideX.length}, ust ${topY.length}`);
const scale = (topY[1] - topY[0]) / (sideX[1] - sideX[0]);
const cx = (sideX[0] + sideX[1]) / 2, cy = (topY[0] + topY[1]) / 2;
console.log(`REF yan gorunus X: ${sideX.map((v) => v.toFixed(3)).join(' / ')}  (aralik ${(sideX[1] - sideX[0]).toFixed(3)})`);
console.log(`REF ust gorunus Y: ${topY.map((v) => v.toFixed(3)).join(' / ')}  (aralik ${(topY[1] - topY[0]).toFixed(3)})`);
console.log(`Olcek ${scale.toFixed(6)}  merkez yan X ${cx.toFixed(3)} <-> ust Y ${cy.toFixed(3)}`);
if (Math.abs(scale - 1) > 0.002) throw new Error('Olcek 1 degil (fark > %0.2): durduruldu, kullaniciya sor.');
// Ölçek farkı REF çizgilerinin çizim hassasiyeti kadar (≈1e-5); 1 alınır, merkezler eşlenir.

// --- C eğrisi: parabolik_kiris iç eğrisi (iki yarım, yay parçalı LWPOLYLINE) ----------------------
function samplePoly(e) {
  const V = []; let cur = null;
  for (const g of e.g) {
    if (g.c === 10) { cur = { x: parseFloat(g.v), b: 0 }; V.push(cur); } else if (g.c === 20) cur.y = parseFloat(g.v); else if (g.c === 42) cur.b = parseFloat(g.v);
  }
  const out = [];
  for (let i = 0; i + 1 < V.length; i++) {
    const p = V[i], q = V[i + 1];
    if (!p.b) { out.push([p.x, p.y]); continue; }
    const th = 4 * Math.atan(p.b), dx = q.x - p.x, dy = q.y - p.y, c = Math.hypot(dx, dy), r = c / (2 * Math.sin(th / 2)), h = r * Math.cos(th / 2);
    const ox = (p.x + q.x) / 2 - (h * dy) / c, oy = (p.y + q.y) / 2 + (h * dx) / c, a0 = Math.atan2(p.y - oy, p.x - ox);
    const n = Math.max(16, Math.ceil(Math.abs(th) / (Math.PI / 3600))); // 0.05° adım
    for (let k = 0; k < n; k++) { const t = a0 + (th * k) / n; out.push([ox + Math.abs(r) * Math.cos(t), oy + Math.abs(r) * Math.sin(t)]); }
  }
  out.push([V[V.length - 1].x, V[V.length - 1].y]);
  return out;
}
const curves = ms.filter((e) => e.type === 'LWPOLYLINE' && layer(e) === 'parabolik_kiris' && A(e, 10).length > 2).map(samplePoly);
const maxStartX = Math.max(...curves.map((c) => c[0][0]));
const inner = curves.filter((c) => Math.abs(c[0][0] - maxStartX) < 1); // iç eğri: ortada x'i büyük olan
const up = inner.find((c) => c[c.length - 1][1] > c[0][1]), down = inner.find((c) => c[c.length - 1][1] < c[0][1]);
if (!up || !down) throw new Error('parabolik_kiris ic egrisinin iki yarisi bulunamadi');
const curve = [...down.slice().reverse(), ...up]; // −Y ucundan +Y ucuna
const cum = [0];
for (let i = 1; i < curve.length; i++) cum.push(cum[i - 1] + Math.hypot(curve[i][0] - curve[i - 1][0], curve[i][1] - curve[i - 1][1]));
const total = cum[cum.length - 1];
let tMid = null; // ref merkezi (üst görünüş Y = cy) eğri üzerinde hangi yay boyunda
for (let i = 0; i + 1 < curve.length; i++) {
  const p = curve[i], q = curve[i + 1];
  if ((p[1] - cy) * (q[1] - cy) <= 0 && p[1] !== q[1]) { tMid = cum[i] + ((cy - p[1]) / (q[1] - p[1])) * (cum[i + 1] - cum[i]); break; }
}
console.log(`Ic egri boyu ${total.toFixed(1)}; ref merkezinden -Y ucuna ${tMid.toFixed(1)}, +Y ucuna ${(total - tMid).toFixed(1)}`);
function at(t) { // yay boyu → nokta
  if (t < -1e-6 || t > total + 1e-6) throw new Error(`Egri disina tasiyor: yay boyu ${t.toFixed(1)} (0..${total.toFixed(1)})`);
  let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= t) lo = m; else hi = m; }
  const k = (t - cum[lo]) / (cum[hi] - cum[lo] || 1);
  return [curve[lo][0] + k * (curve[hi][0] - curve[lo][0]), curve[lo][1] + k * (curve[hi][1] - curve[lo][1])];
}
const toT = (xs) => tMid + (xs - cx); // yan görünüş solu → −Y ucu
const BAND = 200; // iki parabolik_kiris eğrisi arası (eş merkezli)

// --- INSERT üretimi: world = ins + R(θ)·(lx·sx, ly) ---------------------------------------------
const placements = []; // {block, layer, ins, sx, rot, info}
function place(block, layerName, localPt, worldPt, th, sx, info) {
  const c = Math.cos(th), s = Math.sin(th), lx = localPt[0] * sx, ly = localPt[1];
  placements.push({ block, layer: layerName, ins: [worldPt[0] - (c * lx - s * ly), worldPt[1] - (s * lx + c * ly)], sx, rot: (th * 180) / Math.PI, info });
}
const fmt = (p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;

// 2) Kafesler: taban plakası uçları iç eğride (kiriş), gövde bandın ortasında; ON (yerel −Y) C'nin içine
const PAIRS = { '8li': '8lıüst', '2li': '2lıüst' };
for (const e of ms.filter((q) => q.type === 'INSERT' && PAIRS[name(q)])) {
  const side = name(e), top = PAIRS[side];
  const s = N(e, 41, 1);
  const sb = bboxOf(side, 'TABAN'), tb = bboxOf(top, 'TABAN');
  const xsL = N(e, 10) + s * sb[0], xsR = N(e, 10) + s * sb[2];
  if (Math.abs(xsR - xsL - (tb[2] - tb[0])) > 0.5) console.log(`  UYARI: ${side} genislik ${(xsR - xsL).toFixed(2)} != ${top} ${(tb[2] - tb[0]).toFixed(2)}`);
  const pL = at(toT(xsL)), pR = at(toT(xsR));
  const th = Math.atan2(pR[1] - pL[1], pR[0] - pL[0]);
  const nx = -Math.sin(th), ny = Math.cos(th); // yönün solu = C'nin sırtı (dış)
  const mx = (pL[0] + pR[0]) / 2, my = (pL[1] + pR[1]) / 2;
  place(top, 'UST_KAFES', [(tb[0] + tb[2]) / 2, (tb[1] + tb[3]) / 2], [mx + nx * (BAND / 2), my + ny * (BAND / 2)], th, 1,
    `${side}: merkezden ${(xsL - cx).toFixed(1)} .. ${(xsR - cx).toFixed(1)} -> ic egri ${fmt(pL)} .. ${fmt(pR)}  aci ${((th * 180) / Math.PI).toFixed(2)}`);
}

// 3) Tava ve konsollar ("tava hattı" bloğunun içinden), iç eğri üzerinde
const thI = ms.find((q) => q.type === 'INSERT' && name(q) === 'tava hattı');
if (!thI) throw new Error('"tava hattı" INSERT bulunamadi');
if (N(thI, 41, 1) !== 1 || N(thI, 50) !== 0) throw new Error('"tava hattı" olcekli/donuk: desteklenmiyor');
const thx = N(thI, 10);
const tySide = bboxOf('tava yan kesit'), tTop = bboxOf('tavaüst'), kTop = bboxOf('konsolüst');
const tavaLen = tySide[2] - tySide[0];
let tavaN = 0, konsolN = 0, tavaMin = Infinity, tavaMax = -Infinity;
for (const e of blocks['tava hattı'].ents.filter((q) => q.type === 'INSERT')) {
  const n = name(e), x = N(e, 10), sx = N(e, 41, 1), rot = (N(e, 50) * Math.PI) / 180;
  if (n === 'tava yan kesit') {
    // Parçanın yan görünüşteki yatay başlangıcı ve yatay boyu (eğim izdüşümü)
    const xs0 = thx + x + Math.cos(rot) * sx * tySide[0] - Math.sin(rot) * tySide[1];
    const xs1 = xs0 + tavaLen * sx * Math.cos(rot);
    const p0 = at(toT(xs0)), p1 = at(toT(xs1));
    const th = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
    place('tavaüst', 'UST_TAVA', [tTop[0], (tTop[1] + tTop[3]) / 2], p0, th, Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / tavaLen, null);
    tavaMin = Math.min(tavaMin, xs0); tavaMax = Math.max(tavaMax, xs1); tavaN++;
  } else if (n === 'AYAK_KONSOL') {
    const t = toT(thx + x), p = at(t), a = at(Math.max(0, t - 1)), c2 = at(Math.min(total, t + 1));
    place('konsolüst', 'UST_KONSOL', [(kTop[0] + kTop[2]) / 2, (kTop[1] + kTop[3]) / 2], p, Math.atan2(c2[1] - a[1], c2[0] - a[0]), 1, null);
    konsolN++;
  }
}
console.log(`Tava: ${tavaN} parca, merkezden ${(tavaMin - cx).toFixed(1)} .. ${(tavaMax - cx).toFixed(1)} -> ${fmt(at(toT(tavaMin)))} .. ${fmt(at(toT(tavaMax)))}`);
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
    ' 41', p.sx.toFixed(9), ' 42', '1.0', ' 43', '1.0', ' 50', ((p.rot % 360) + 360) % 360 === 0 ? '0.0' : (((p.rot % 360) + 360) % 360).toFixed(6));
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
