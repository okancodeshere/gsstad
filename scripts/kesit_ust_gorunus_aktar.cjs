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
//   Bant içinde iç eğriye yakın: tek tavada konsol | tava, çift bölgede tava | konsol | 2. tava; ana tavanın iç kenarı --tavaIc (16).
// Seçenekler: --ref=katman (kuzey ref), --egri=katman (parabolik_kiris), --kafes=yanBlok:üstBlok:ölçek,... (üst blok mm ise 0.1),
//   --tavaHatti=blok, --tava=blok, --konsol=blok, --tavaIc=n, --uzat (tava eğrinin sağ ucuna kadar),
//   --cift=x0,x1 (tava hattı yerel X; tavakesit1 cifttava hattının uçları 12923.6675,20165.4080).
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

// --- Seçenekler ---------------------------------------------------------------------------------
const flag = (k, d) => { const a = process.argv.find((v) => v.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const REF = flag('ref', 'kuzey ref');                 // referans çizgilerinin katmanı
const EGRI = flag('egri', 'parabolik_kiris');         // plandaki duvar eğrilerinin katmanı

// --- 1) Plan eğrisi: EGRI katmanındaki yay parçalı LWPOLYLINE'lar -------------------------------
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
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
const end = (c) => c[c.length - 1];
// Aynı eğrinin kopyalarını at, uçları 20'den yakın parçaları (ör. iki yarım) zincirle
let chains = [];
for (const c of ms.filter((e) => e.type === 'LWPOLYLINE' && layer(e) === EGRI && A(e, 10).length > 2).map(samplePoly)) {
  if (!chains.some((d) => dist(d[0], c[0]) < 0.01 && dist(end(d), end(c)) < 0.01)) chains.push(c);
}
for (let merged = true; merged;) {
  merged = false;
  for (let i = 0; i < chains.length && !merged; i++) for (let j = i + 1; j < chains.length && !merged; j++) {
    const p = chains[i], q = chains[j]; let m = null;
    if (dist(end(p), q[0]) < 20) m = [...p, ...q];
    else if (dist(p[0], q[0]) < 20) m = [...p.slice().reverse(), ...q];
    else if (dist(end(p), end(q)) < 20) m = [...p, ...q.slice().reverse()];
    else if (dist(p[0], end(q)) < 20) m = [...q, ...p];
    if (m) { chains[i] = m; chains.splice(j, 1); merged = true; }
  }
}
const lenOf = (c) => c.slice(1).reduce((s, p, i) => s + dist(p, c[i]), 0);
const maxLen = Math.max(...chains.map(lenOf));
chains = chains.filter((c) => lenOf(c) > maxLen * 0.8); // kısa parçaları at
const midOf = (c) => { const h = lenOf(c) / 2; let s = 0; for (let i = 1; i < c.length; i++) { const d = dist(c[i], c[i - 1]); if (s + d >= h) { const k = (h - s) / d; return [c[i - 1][0] + k * (c[i][0] - c[i - 1][0]), c[i - 1][1] + k * (c[i][1] - c[i - 1][1])]; } s += d; } return end(c); };
// Dışbükey yön v (eğrinin sırtı): kiriş ortasından eğri ortasına
const c0 = chains[0], m0 = midOf(c0), k0 = [(c0[0][0] + end(c0)[0]) / 2, (c0[0][1] + end(c0)[1]) / 2];
const vLen = dist(m0, k0), v = [(m0[0] - k0[0]) / vLen, (m0[1] - k0[1]) / vLen];
// İç eğri: sırt yönünde en geride olan
chains.sort((p, q) => (midOf(p)[0] * v[0] + midOf(p)[1] * v[1]) - (midOf(q)[0] * v[0] + midOf(q)[1] * v[1]));
let curve = chains[0];
const BAND = chains.length > 1 ? dist(midOf(chains[0]), midOf(chains[1])) : 200; // iç eğri ile bir sonraki eğri arası
// Yan görünüş eğrinin İÇİNDEN bakış: bakanın sağı R = (v.y, −v.x). Eğri soldan sağa yönlendirilir.
const R = [v[1], -v[0]];
const dotR = (p) => p[0] * R[0] + p[1] * R[1];
if (dotR(curve[0]) > dotR(end(curve))) curve = curve.slice().reverse();
const cum = [0];
for (let i = 1; i < curve.length; i++) cum.push(cum[i - 1] + dist(curve[i], curve[i - 1]));
const total = cum[cum.length - 1];

// --- 2) REF çizgileri: ölçek ve merkez ----------------------------------------------------------
const bbC = [Infinity, Infinity, -Infinity, -Infinity];
chains.forEach((c) => c.forEach((p) => { bbC[0] = Math.min(bbC[0], p[0]); bbC[1] = Math.min(bbC[1], p[1]); bbC[2] = Math.max(bbC[2], p[0]); bbC[3] = Math.max(bbC[3], p[1]); }));
const refs = ms.filter((e) => e.type === 'LINE' && layer(e) === REF).map((e) => [(N(e, 10) + N(e, 11)) / 2, (N(e, 20) + N(e, 21)) / 2]);
const nearPlan = (p) => p[0] > bbC[0] - 1000 && p[0] < bbC[2] + 1000 && p[1] > bbC[1] - 1000 && p[1] < bbC[3] + 1000;
const uniq = (arr) => arr.filter((x, i) => arr.findIndex((w) => Math.abs(w - x) < 1e-3) === i).sort((p, q) => p - q);
const sideX = uniq(refs.filter((p) => !nearPlan(p)).map((p) => p[0]));   // yan görünüş: X
const topS = uniq(refs.filter(nearPlan).map(dotR));                       // üst görünüş: hat boyunca (R yönünde) konum
if (sideX.length !== 2 || topS.length !== 2) throw new Error('REF cizgileri beklenen gibi degil: yan ' + sideX.length + ', ust ' + topS.length);
const scale = (topS[1] - topS[0]) / (sideX[1] - sideX[0]);
const cx = (sideX[0] + sideX[1]) / 2, cS = (topS[0] + topS[1]) / 2;
console.log('REF (' + REF + ') yan gorunus X: ' + sideX.map((x) => x.toFixed(3)).join(' / ') + '  (aralik ' + (sideX[1] - sideX[0]).toFixed(3) + ')');
console.log('REF ust gorunus araligi ' + (topS[1] - topS[0]).toFixed(3) + '  olcek ' + scale.toFixed(6));
if (Math.abs(scale - 1) > 0.002) throw new Error('Olcek 1 degil (fark > %0.2): durduruldu, kullaniciya sor.');
// Ölçek farkı REF çizgilerinin çizim hassasiyeti kadar; 1 alınır, merkezler eşlenir.
let tMid = null; // ref merkezi eğri üzerinde hangi yay boyunda
for (let i = 0; i + 1 < curve.length; i++) {
  const p = dotR(curve[i]), q = dotR(curve[i + 1]);
  if ((p - cS) * (q - cS) <= 0 && p !== q) { tMid = cum[i] + ((cS - p) / (q - p)) * (cum[i + 1] - cum[i]); break; }
}
if (tMid === null) throw new Error('REF merkezi egri uzerinde bulunamadi');
console.log('Ic egri boyu ' + total.toFixed(1) + ', bant ' + BAND.toFixed(1) + '; ref merkezinden sol uca ' + tMid.toFixed(1) + ', sag uca ' + (total - tMid).toFixed(1));
function at(t) { // yay boyu → nokta
  if (t < -1e-6 || t > total + 1e-6) throw new Error('Egri disina tasiyor: yay boyu ' + t.toFixed(1) + ' (0..' + total.toFixed(1) + ')');
  let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= t) lo = m; else hi = m; }
  const k = (t - cum[lo]) / (cum[hi] - cum[lo] || 1);
  return [curve[lo][0] + k * (curve[hi][0] - curve[lo][0]), curve[lo][1] + k * (curve[hi][1] - curve[lo][1])];
}
const toT = (xs) => tMid + (xs - cx); // yan görünüş solu → eğrinin sol ucu (içeriden bakışa göre)
// İç eğriden d kadar DIŞA (bandın içine) ötelenmiş nokta + teğet açısı
function atOff(t, d) {
  const p = at(t), a = at(Math.max(0, t - 0.5)), c2 = at(Math.min(total, t + 0.5));
  const th = Math.atan2(c2[1] - a[1], c2[0] - a[0]);
  return { p: [p[0] - Math.sin(th) * d, p[1] + Math.cos(th) * d], th }; // yönün solu = eğrinin sırtı (dış)
}

// Kafes eşleşmeleri: yanBlok:üstBlok:ölçek (üst blok mm ise 0.1), virgülle
const KAFESLER = {}; flag('kafes', '8li:8lıüst:1,2li:2lıüst:1').split(',').forEach((s) => { const [a, b, k] = s.split(':'); KAFESLER[a] = { top: b, k: parseFloat(k || '1') }; });
const TAVA_HATTI = flag('tavaHatti', 'tava hattı');   // yan görünüşte tava + konsolları içeren blok
const TAVA_UST = flag('tava', 'tavaüst'), KONSOL_UST = flag('konsol', 'konsolüst'); // üst görünüş blokları
const CIFT = flag('cift', '') ? flag('cift').split(',').map(parseFloat) : null; // çift tava: tava hattı yerel X başı,sonu
const UZAT = process.argv.includes('--uzat');          // tavayı eğrinin sağ ucuna kadar sürdür
// Bant içi dizilim (iç eğriden dışa): boşluk | tava | konsol | (çift bölgede) 2. tava
const tTopBB = bboxOf(TAVA_UST), kTopBB = bboxOf(KONSOL_UST);
const TAVA_T = tTopBB[3] - tTopBB[1], KONSOL_D = kTopBB[3] - kTopBB[1];
// Tek tavalı bölgede: konsol | tava (konsol iç çizgi tarafında). Çift bölgede: tava | konsol | 2. tava.
const TAVA_IC = parseFloat(flag('tavaIc', String(KONSOL_D))); // ana tavanın iç kenarı, iç eğriden (varsayılan = konsol derinliği)
const D_TAVA1 = TAVA_IC + TAVA_T / 2, D_KONSOL_TEK = TAVA_IC - KONSOL_D / 2, D_KONSOL_CIFT = TAVA_IC + TAVA_T + KONSOL_D / 2,
  D_TAVA2 = TAVA_IC + TAVA_T + KONSOL_D + TAVA_T / 2;
console.log(`Bant ici (ic egriden, merkezler): tava ${D_TAVA1.toFixed(2)}, konsol tek ${D_KONSOL_TEK.toFixed(2)} / cift ${D_KONSOL_CIFT.toFixed(2)}, 2. tava ${D_TAVA2.toFixed(2)}`);

// --- INSERT üretimi: world = ins + R(θ)·(lx·sx·k, ly·k) ------------------------------------------
const placements = []; // {block, layer, ins, sx, k, rot, info}
function place(block, layerName, localPt, worldPt, th, sx, info, k = 1) {
  if (!blocks[block]) throw new Error(`"${block}" blogu dosyada yok`);
  const c = Math.cos(th), s = Math.sin(th), lx = localPt[0] * sx * k, ly = localPt[1] * k;
  placements.push({ block, layer: layerName, ins: [worldPt[0] - (c * lx - s * ly), worldPt[1] - (s * lx + c * ly)], sx, k, rot: (th * 180) / Math.PI, info });
}
const fmt = (p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;

// 2) Kafesler: taban plakası uçları iç eğride (kiriş), gövde bandın ortasında; ON (yerel −Y) C'nin içine
for (const e of ms.filter((q) => q.type === 'INSERT' && KAFESLER[name(q)])) {
  const side = name(e), top = KAFESLER[side].top, K = KAFESLER[side].k;
  const s = N(e, 41, 1);
  const sb = bboxOf(side, 'TABAN'), tb = bboxOf(top, 'TABAN');
  const xsL = N(e, 10) + s * sb[0], xsR = N(e, 10) + s * sb[2];
  const wTop = (tb[2] - tb[0]) * K, dTop = (tb[3] - tb[1]) * K;
  if (Math.abs(xsR - xsL - wTop) > 0.5) console.log('  UYARI: ' + side + ' genislik ' + (xsR - xsL).toFixed(2) + ' != ' + top + ' ' + wTop.toFixed(2));
  const pL = at(toT(xsL)), pR = at(toT(xsR));
  const th = Math.atan2(pR[1] - pL[1], pR[0] - pL[0]);
  const nx = -Math.sin(th), ny = Math.cos(th); // yönün solu = eğrinin sırtı (dış)
  const mx = (pL[0] + pR[0]) / 2, my = (pL[1] + pR[1]) / 2;
  place(top, 'UST_KAFES', [(tb[0] + tb[2]) / 2, (tb[1] + tb[3]) / 2], [mx + nx * (BAND / 2), my + ny * (BAND / 2)], th, 1,
    side + ' -> ' + top + ' (' + wTop.toFixed(0) + ' x ' + dTop.toFixed(0) + '): merkezden ' + (xsL - cx).toFixed(1) + ' .. ' + (xsR - cx).toFixed(1) + ' -> ic egri ' + fmt(pL) + ' .. ' + fmt(pR) + '  aci ' + ((th * 180) / Math.PI).toFixed(2), K);
}

// 3) Tava ve konsollar ("tava hattı" bloğunun içinden), bandın içinde iç eğriye yakın
const thI = ms.find((q) => q.type === 'INSERT' && name(q) === TAVA_HATTI);
if (!thI) throw new Error('"' + TAVA_HATTI + '" INSERT bulunamadi');
if (N(thI, 41, 1) !== 1 || N(thI, 50) !== 0) throw new Error('"' + TAVA_HATTI + '" olcekli/donuk: desteklenmiyor');
const thx = N(thI, 10);
const tySide = bboxOf('tava yan kesit'), tTop = tTopBB, kTop = kTopBB;
const tavaLen = tySide[2] - tySide[0];
const tavaAnchor = [tTop[0], (tTop[1] + tTop[3]) / 2], konsolAnchor = [(kTop[0] + kTop[2]) / 2, (kTop[1] + kTop[3]) / 2];
function tavaPiece(t0, t1, d, layerName) { // yay boyu t0..t1 arası bir tava parçası (kirişe göre dönük ve ölçekli)
  const p0 = atOff(t0, d).p, p1 = atOff(t1, d).p;
  place(TAVA_UST, layerName, tavaAnchor, p0, Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / tavaLen, null);
}
const ciftT = CIFT ? [toT(thx + CIFT[0]), toT(thx + CIFT[1])] : null; // çift tava bölgesi (yay boyu)
let konsolCift = 0;
function konsolAt(t) {
  const cift = ciftT && t >= ciftT[0] - 1e-6 && t <= ciftT[1] + 1e-6; if (cift) konsolCift++;
  const o = atOff(t, cift ? D_KONSOL_CIFT : D_KONSOL_TEK); place(KONSOL_UST, 'UST_KONSOL', konsolAnchor, o.p, o.th, 1, null);
}
let tavaN = 0, konsolN = 0, tavaMin = Infinity, tavaMax = -Infinity, konsolLast = -Infinity;
for (const e of blocks[TAVA_HATTI].ents.filter((q) => q.type === 'INSERT')) {
  const n = name(e), x = N(e, 10), sx = N(e, 41, 1), rot = (N(e, 50) * Math.PI) / 180;
  if (n === 'tava yan kesit') {
    // Parçanın yan görünüşteki yatay başlangıcı ve yatay boyu (eğim izdüşümü)
    const xs0 = thx + x + Math.cos(rot) * sx * tySide[0] - Math.sin(rot) * tySide[1];
    const xs1 = xs0 + tavaLen * sx * Math.cos(rot);
    tavaPiece(toT(xs0), toT(xs1), D_TAVA1, 'UST_TAVA');
    tavaMin = Math.min(tavaMin, xs0); tavaMax = Math.max(tavaMax, xs1); tavaN++;
  } else if (n === 'AYAK_KONSOL') {
    konsolAt(toT(thx + x)); konsolLast = Math.max(konsolLast, thx + x); konsolN++;
  }
}
{ // Son (kesik) parça blok içinde patlatılmışsa INSERT olarak görünmez: hattın (SPLINE) ucuna kadar tamamla
  const sEnd = Math.max(...blocks[TAVA_HATTI].ents.filter((q) => q.type === 'SPLINE').map((q) => Math.max(...A(q, 10))), -Infinity) + thx;
  if (sEnd - tavaMax > 0.5 && sEnd - tavaMax < tavaLen) {
    tavaPiece(toT(tavaMax), toT(sEnd), D_TAVA1, 'UST_TAVA');
    console.log('Patlatilmis son tava parcasi eklendi: ' + (sEnd - tavaMax).toFixed(1));
    tavaMax = sEnd; tavaN++;
  }
}
console.log(`Tava (yan gorunusten): ${tavaN} parca, merkezden ${(tavaMin - cx).toFixed(1)} .. ${(tavaMax - cx).toFixed(1)}; konsol ${konsolN}`);
// 3b) Uzatma: tava C'nin +Y ucuna kadar, konsollar aynı aralıkla
if (UZAT) {
  let n = 0, k = 0;
  for (let t = toT(tavaMax); t < total - 0.5; t += tavaLen) { tavaPiece(t, Math.min(total, t + tavaLen), D_TAVA1, 'UST_TAVA'); n++; }
  for (let t = toT(konsolLast) + 100; t <= total; t += 100) { konsolAt(t); k++; }
  console.log(`Uzatma: +${n} tava, +${k} konsol (merkezden ${(tavaMax - cx).toFixed(1)} .. ${(total - tMid).toFixed(1)}) -> ${fmt(at(total))}`);
}
// 3c) Çift tava: konsolun dış yanında ikinci tava
if (CIFT) {
  const [t0, t1] = ciftT; let n = 0;
  for (let t = t0; t < t1 - 0.5; t += tavaLen) { tavaPiece(t, Math.min(t1, t + tavaLen), D_TAVA2, 'UST_TAVA_2'); n++; }
  console.log(`Cift tava: ${n} parca, arada ${konsolCift} konsol, merkezden ${(t0 - tMid).toFixed(1)} .. ${(t1 - tMid).toFixed(1)} (boy ${(t1 - t0).toFixed(1)}) -> ${fmt(at(t0))} .. ${fmt(at(t1))}`);
}
console.log(`Tava ana hat: ${fmt(atOff(toT(tavaMin), D_TAVA1).p)} -> ${fmt(atOff(UZAT ? total : toT(tavaMax), D_TAVA1).p)}`);
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
    ' 41', (p.sx * p.k).toFixed(9), ' 42', String(p.k), ' 43', String(p.k), ' 50', ((p.rot % 360) + 360) % 360 === 0 ? '0.0' : (((p.rot % 360) + 360) % 360).toFixed(6));
}
// Yeni katmanlar
const tabs = ents(sec.TABLES + 2, sec.BLOCKS);
const layRecs = tabs.filter((e) => e.type === 'LAYER');
const layTable = tabs.find((e) => e.type === 'TABLE' && G(e, 2) === 'LAYER');
const layEndtab = tabs.find((e) => e.type === 'ENDTAB' && e.i > layRecs[layRecs.length - 1].i);
const sample = layRecs[0];
const layDefs = [];
const COLORS = { UST_KAFES: 3, UST_TAVA: 30, UST_TAVA_2: 40, UST_KONSOL: 6 };
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
