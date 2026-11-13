/**
 * scripts/blok_hat_boyunca_diz.cjs
 *
 * Bir DXF içindeki bloğu, aynı dosyadaki LWPOLYLINE hattı boyunca uç uca dizer (AutoCAD ARRAYPATH benzeri).
 * - Her kopya, iki ucu hattın üzerinde olacak şekilde yerleşir (kiriş yöntemi: bir sonraki nokta,
 *   hattın üzerinde bloğun boyu kadar uzaktaki nokta). Böylece parçalar köşelerde de uç uca birleşir.
 * - Blok kendi X ekseni hattın yönüne döner; aynalama yok.
 * - Hattın sonunda kalan kısa parça için blok X ölçeği kısaltılarak tek bir kesik parça konur.
 * - Bloğun hatta oturan noktası: blok geometrisinin sol ucu, düşeyde tava gövdesinin ortası (ANCHOR).
 * - Yeni INSERT'ler ayrı katmana (TAVA_DIZI) yazılır; özgün dosya değişmez.
 *
 * Kullanım:
 *   node scripts/blok_hat_boyunca_diz.cjs <giris.dxf> <blokAdi> <cikis.dxf> [secenekler]
 *   --ters          : hattın son köşesinden başla (varsayılan: hattın ilk köşesi)
 *   --anchorX=<x>   : bloğun hatta oturan yerel X'i (varsayılan: uç uca modda blok sol ucu, aralık modunda blok ortası)
 *   --anchorY=<y>   : bloğun hatta oturan yerel Y'si (varsayılan: blok LINE'larının düşey ortası)
 *   --katman=<ad>   : yeni INSERT katmanı (varsayılan TAVA_DIZI)
 *   ARALIK MODU (ör. konsol): blok uç uca değil, sabit aralıklı noktalara konur
 *   --aralik=<d>    : iki kopya arası (hat/zincir boyunca) mesafe
 *   --ilk=<s>       : ilk kopyanın başlangıçtan uzaklığı (varsayılan 0)
 *   --zincir=<L>    : noktalar hattın kendisi yerine, L boyunda uç uca dizilmiş parçaların (ör. tava) kiriş
 *                     zinciri üzerinde alınır; böylece kopya tam o parçanın altına oturur ve onun açısını alır
 */
const fs = require('fs');

const [inp, blockName, outp, ...flags] = process.argv.slice(2);
if (!inp || !blockName || !outp) { console.error('Kullanim: node blok_hat_boyunca_diz.cjs giris.dxf blokAdi cikis.dxf [--ters] [--anchorY=y] [--aralik=d --ilk=s --zincir=L]'); process.exit(1); }
const reverse = flags.includes('--ters');
const flag = (n) => { const f = flags.find((x) => x.startsWith(`--${n}=`)); return f ? f.slice(n.length + 3) : undefined; };
const anchorYFlag = flag('anchorY') !== undefined ? `--anchorY=${flag('anchorY')}` : undefined;
const LAYER = flag('katman') || 'TAVA_DIZI';
const SPACING = flag('aralik') !== undefined ? +flag('aralik') : null;
const FIRST = +(flag('ilk') || 0);
const CHAIN = flag('zincir') !== undefined ? +flag('zincir') : null;

const raw = fs.readFileSync(inp, 'latin1');
const EOL = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r?\n/);
const pairs = [];
for (let i = 0; i + 1 < lines.length; i += 2) pairs.push({ c: lines[i].trim(), v: lines[i + 1], i });

// --- Bölümleri ve varlıkları çöz ---------------------------------------------------------------
let sec = null, curBlk = null, ent = null, wantSecName = false;
const ents = [];
let entitiesEndsecLine = -1, maxHandle = 0, handseedLine = -1, layerTableEndLine = -1, inLayerTable = false, layerCountLine = -1;
for (let k = 0; k < pairs.length; k++) {
  const { c, v, i } = pairs[k];
  const vt = v.trim();
  if (c === '5' || c === '105') { const h = parseInt(vt, 16); if (h > maxHandle) maxHandle = h; }
  if (c === '9' && vt === '$HANDSEED') handseedLine = pairs[k + 1].i + 1;
  if (c === '0' && vt === 'SECTION') { wantSecName = true; continue; }
  if (wantSecName && c === '2') { sec = vt; wantSecName = false; continue; }
  if (sec === 'TABLES') {
    if (c === '0' && vt === 'TABLE') inLayerTable = pairs[k + 1] && pairs[k + 1].v.trim() === 'LAYER';
    if (inLayerTable && c === '70' && layerCountLine < 0) layerCountLine = i + 1;
    if (inLayerTable && c === '0' && vt === 'ENDTAB') { layerTableEndLine = i; inLayerTable = false; }
  }
  if (c === '0') {
    if (ent) ents.push(ent);
    ent = null;
    if (vt === 'ENDSEC' && sec === 'ENTITIES') entitiesEndsecLine = i;
    if (vt === 'BLOCK') { curBlk = { name: null }; ent = { type: 'BLOCK', sec, g: [] }; continue; }
    if (vt === 'ENDBLK') { curBlk = null; continue; }
    if (sec === 'BLOCKS' || sec === 'ENTITIES') ent = { type: vt, sec, blk: curBlk && curBlk.name, g: [] };
    continue;
  }
  if (ent) { ent.g.push([c, vt]); if (ent.type === 'BLOCK' && c === '2' && curBlk && !curBlk.name) curBlk.name = vt; }
}
const get = (e, c) => e.g.filter((p) => p[0] === c).map((p) => p[1]);

// --- Blok sınırları ---------------------------------------------------------------------------
const blk = ents.find((e) => e.type === 'BLOCK' && get(e, '2')[0] === blockName);
if (!blk) { console.error('Blok bulunamadi:', blockName); process.exit(1); }
const base = [+get(blk, '10')[0], +get(blk, '20')[0]];
let x0 = 1e18, x1 = -1e18, y0 = 1e18, y1 = -1e18;
const bodyY = [];
for (const e of ents) {
  if (e.sec !== 'BLOCKS' || e.blk !== blockName || e.type === 'BLOCK') continue;
  const xs = [...get(e, '10'), ...get(e, '11')].map(Number), ys = [...get(e, '20'), ...get(e, '21')].map(Number);
  const r = +(get(e, '40')[0] || 0);
  xs.forEach((x) => { x0 = Math.min(x0, x - r); x1 = Math.max(x1, x + r); });
  ys.forEach((y) => { y0 = Math.min(y0, y - r); y1 = Math.max(y1, y + r); });
  if (e.type === 'LINE') ys.forEach((y) => bodyY.push(y));
}
const Lb = x1 - x0;
// Tava gövdesi (kapak hariç): LINE'ların düşey aralığı; anchor bunun ortası
const anchorY = anchorYFlag ? +anchorYFlag.split('=')[1] : (Math.min(...bodyY) + Math.max(...bodyY)) / 2;
const anchorX = flag('anchorX') !== undefined ? +flag('anchorX') : (SPACING ? (x0 + x1) / 2 : x0);
const ax = anchorX - base[0], ay = anchorY - base[1];   // blok yerel koordinatı (taban noktasına göre)
console.log(`Blok ${blockName}: boy ${Lb.toFixed(3)}, yukseklik ${(y1 - y0).toFixed(3)}, anchor yerel (${ax.toFixed(3)}, ${ay.toFixed(3)})`);

// --- Hat --------------------------------------------------------------------------------------
// --yol=spline: model alanındaki tek SPLINE yoğun örneklenip hat olarak kullanılır (NURBS, de Boor)
const polys = ents.filter((e) => e.sec === 'ENTITIES' && e.type === 'LWPOLYLINE');
let pts;
if (flag('yol') === 'spline') {
  const spl = ents.filter((e) => e.sec === 'ENTITIES' && e.type === 'SPLINE');
  if (spl.length !== 1) { console.error('Model alaninda tam 1 SPLINE bekleniyordu, bulunan:', spl.length); process.exit(1); }
  const e = spl[0];
  const p = +get(e, '71')[0], U = get(e, '40').map(Number);
  const cp = get(e, '10').map((x, i) => [+x, +get(e, '20')[i]]);
  const wRaw = get(e, '41').map(Number), W = cp.map((_, i) => (wRaw.length === cp.length ? wRaw[i] : 1));
  if (!cp.length || U.length !== cp.length + p + 1) { console.error('SPLINE kontrol noktasi / dugum sayisi uyusmuyor (fit-point spline desteklenmiyor).'); process.exit(1); }
  const evalAt = (u) => {
    let k = p; while (k < cp.length - 1 && U[k + 1] <= u) k++;
    const dd = []; for (let j = 0; j <= p; j++) { const c = cp[k - p + j], w = W[k - p + j]; dd.push([c[0] * w, c[1] * w, w]); }
    for (let r = 1; r <= p; r++) for (let j = p; j >= r; j--) {
      const i = k - p + j, den = U[i + p - r + 1] - U[i], a = den === 0 ? 0 : (u - U[i]) / den;
      dd[j] = dd[j].map((v, q) => (1 - a) * dd[j - 1][q] + a * v);
    }
    return [dd[p][0] / dd[p][2], dd[p][1] / dd[p][2]];
  };
  const N = 6000, u0 = U[p], u1 = U[cp.length];
  pts = Array.from({ length: N + 1 }, (_, i) => evalAt(i === N ? u1 - 1e-12 * (u1 - u0) : u0 + ((u1 - u0) * i) / N));
  console.log(`SPLINE: derece ${p}, ${cp.length} kontrol noktasi, ${N} parca ile orneklendi`);
} else {
  if (polys.length !== 1) { console.error('Model alaninda tam 1 LWPOLYLINE bekleniyordu, bulunan:', polys.length, '(SPLINE hat icin --yol=spline)'); process.exit(1); }
  if (get(polys[0], '42').some((b) => Math.abs(+b) > 1e-9)) { console.error('Hatta yay (bulge) var; bu betik yalniz duz parcali hat destekler.'); process.exit(1); }
  pts = get(polys[0], '10').map((x, i) => [+x, +get(polys[0], '20')[i]]);
}
if (reverse) pts = pts.reverse();
const segLen = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const pathLen = pts.slice(1).reduce((s, p, i) => s + segLen(pts[i], p), 0);
console.log(`Hat: ${pts.length} kose, uzunluk ${pathLen.toFixed(1)}`);

// --- Kiriş yöntemiyle zincir: hat üzerinde uç uca, her biri Lc boyunda parçalar -------------------
function chordChain(pts, Lc) {
const placements = [];
let cur = pts[0], si = 0, st = 0;
for (;;) {
  let found = null;
  for (let j = si; j < pts.length - 1 && !found; j++) {
    const A = pts[j], B = pts[j + 1];
    const dx = B[0] - A[0], dy = B[1] - A[1];
    const fx = A[0] - cur[0], fy = A[1] - cur[1];
    const a = dx * dx + dy * dy, b = 2 * (fx * dx + fy * dy), c = fx * fx + fy * fy - Lc * Lc;
    const disc = b * b - 4 * a * c;
    if (disc < 0) continue;
    const tStart = j === si ? st : 0;
    const roots = [(-b - Math.sqrt(disc)) / (2 * a), (-b + Math.sqrt(disc)) / (2 * a)].filter((t) => t >= tStart - 1e-12 && t <= 1 + 1e-12).sort((p, q) => p - q);
    // ileri yönde, cur'dan uzaklaşırken kesen ilk kök
    for (const t of roots) {
      const P = [A[0] + t * dx, A[1] + t * dy];
      const grow = (P[0] - cur[0]) * dx + (P[1] - cur[1]) * dy;
      if (grow > 0) { found = { P, j, t }; break; }
    }
  }
  if (!found) {
    const end = pts[pts.length - 1];
    const r = segLen(cur, end);
    if (r > Lc * 0.002) placements.push({ P0: cur, P1: end, sx: r / Lc });
    break;
  }
  placements.push({ P0: cur, P1: found.P, sx: 1 });
  cur = found.P; si = found.j; st = found.t;
}
return placements;
}

let placements;
if (!SPACING) {
  placements = chordChain(pts, Lb);
} else {
  // Aralık modu: zincir (veya hattın kendisi) boyunca FIRST, FIRST+SPACING, ... noktalarına tek kopya
  const chain = CHAIN ? chordChain(pts, CHAIN).map((p) => [p.P0, p.P1]) : pts.slice(1).map((p, i) => [pts[i], p]);
  const chainLen = chain.reduce((s, [a, b]) => s + segLen(a, b), 0);
  placements = [];
  let acc = 0, k = 0;
  for (let sPos = FIRST; sPos <= chainLen + 1e-9; sPos += SPACING) {
    while (k < chain.length - 1 && acc + segLen(...chain[k]) < sPos) { acc += segLen(...chain[k]); k++; }
    const [A, B] = chain[k], l = segLen(A, B), u = Math.min(1, Math.max(0, (sPos - acc) / l));
    const P = [A[0] + u * (B[0] - A[0]), A[1] + u * (B[1] - A[1])];
    // P0 = nokta, P1 = yön için parçanın ucu (açı parçadan); sx = 1
    placements.push({ P0: P, P1: [P[0] + (B[0] - A[0]) / l, P[1] + (B[1] - A[1]) / l], sx: 1 });
  }
  console.log(`Aralik modu: ${CHAIN ? `zincir (${CHAIN} birimlik parcalar)` : 'hat'} boyu ${chainLen.toFixed(1)}, ilk ${FIRST}, aralik ${SPACING}`);
}
// --noktaJson=dosya: DXF yazmadan yalnız noktaları (hat/zincir üzerindeki P0) ve açıları yaz
if (flag('noktaJson')) {
  const pts2 = placements.map(({ P0, P1 }) => ({ x: P0[0], y: P0[1], aci: (Math.atan2(P1[1] - P0[1], P1[0] - P0[0]) * 180) / Math.PI }));
  fs.writeFileSync(flag('noktaJson'), JSON.stringify(pts2, null, 1));
  console.log(`Noktalar: ${pts2.length} adet -> ${flag('noktaJson')}`);
  process.exit(0);
}

// --- INSERT metni -----------------------------------------------------------------------------
const ownerHandle = get(ents.find((e) => e.sec === 'ENTITIES' && e.type === 'INSERT') || polys[0], '330')[0];
let h = maxHandle;
const out = [];
for (const { P0, P1, sx } of placements) {
  const th = Math.atan2(P1[1] - P0[1], P1[0] - P0[0]);
  const c = Math.cos(th), s = Math.sin(th);
  const lx = sx * ax, ly = ay;
  const ins = [P0[0] - (c * lx - s * ly), P0[1] - (s * lx + c * ly)];
  h += 1;
  out.push('  0', 'INSERT', '  5', h.toString(16).toUpperCase(), '330', ownerHandle, '100', 'AcDbEntity', '  8', LAYER,
    '100', 'AcDbBlockReference', '  2', blockName,
    ' 10', ins[0].toFixed(6), ' 20', ins[1].toFixed(6), ' 30', '0.0',
    ' 41', sx.toFixed(9), ' 42', '1.0', ' 43', '1.0', ' 50', ((th * 180) / Math.PI).toFixed(6));
}
// Katman tanımı (TAVA_DIZI, turuncu)
h += 1;
const layerTableOwner = (() => { // LAYER tablosunun handle'ı: ENDTAB'den önceki ilk TABLE/LAYER kaydının 330'u
  const k = pairs.findIndex((p) => p.c === '0' && p.v.trim() === 'LAYER' && pairs.slice(0, pairs.indexOf(p)).some((q) => q.c === '2' && q.v.trim() === 'LAYER'));
  for (let m = k + 1; m < k + 12; m++) if (pairs[m].c === '330') return pairs[m].v.trim();
  return '2';
})();
const layerDef = ['  0', 'LAYER', '  5', h.toString(16).toUpperCase(), '330', layerTableOwner, '100', 'AcDbSymbolTableRecord', '100', 'AcDbLayerTableRecord',
  '  2', LAYER, ' 70', '     0', ' 62', '    30', '  6', 'Continuous', '370', '    -3', '390', 'F'];
// 390 (plot style) handle'ı mevcut bir katmandan kopyala
const firstLayerPS = (() => { const k = pairs.findIndex((p) => p.c === '390'); return k >= 0 ? pairs[k].v.trim() : null; })();
if (firstLayerPS) layerDef[layerDef.length - 1] = firstLayerPS; else layerDef.splice(-2, 2);

// --- Yaz --------------------------------------------------------------------------------------
const L2 = lines.slice();
L2.splice(entitiesEndsecLine, 0, ...out);                                  // önce sondaki ekleme (satır indeksleri bozulmasın)
const layerExists = pairs.some((p, k) => p.c === '0' && p.v.trim() === 'LAYER' && pairs.slice(k + 1, k + 12).some((q) => q.c === '2' && q.v.trim() === LAYER));
if (!layerExists) {
  if (layerTableEndLine > 0 && layerTableEndLine < entitiesEndsecLine) L2.splice(layerTableEndLine, 0, ...layerDef);
  if (layerCountLine > 0) L2[layerCountLine] = String(+L2[layerCountLine].trim() + 1).padStart(6);
}
if (handseedLine > 0) L2[handseedLine] = (h + 1).toString(16).toUpperCase();
fs.writeFileSync(outp, L2.join(EOL), 'latin1');

const full = placements.filter((p) => p.sx === 1).length, last = placements[placements.length - 1];
console.log(`Yerlesim: ${full} tam parca${last && last.sx < 1 ? ` + 1 kesik parca (${(last.sx * Lb).toFixed(1)} birim, olcek ${last.sx.toFixed(3)})` : ''}`);
console.log('Baslangic:', pts[0].map((v) => v.toFixed(1)).join(','), ' Bitis:', pts[pts.length - 1].map((v) => v.toFixed(1)).join(','));
console.log('Yazildi:', outp);
