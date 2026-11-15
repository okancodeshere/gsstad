// Pafta 13: Matsing 4-Beam tek kollu 2 eksenli askı aparatı (Ø420 çatı makası) — DWG
//
// Geometri doğrudan anten_aski_modeli.js'ten (ana model ve Aparatlar sayfasıyla aynı) gelir:
// görünüşler gizli çizgi hesabıyla izdüşürülür, kesitler düzlemle kesilip taranır.
// Çıktı: DXF (R12) → AutoCAD accoreconsole ile ölçüler, çizgi kalınlıkları ve DWG kaydı.
//
// Çalıştırma: node generate_matsing_aski_aparati_dwg.mjs
//   (AutoCAD 2023 yoksa yalnızca DXF ve .scr üretilir)
//
// Pafta 1 (A0, 1:10): ön / yan / üst görünüş, A-A ve B-B kesitleri, parça listesi, notlar.
// Pafta 2 (A1, 1:2): parça detayları (eğim mafsalı kulakları, flanşlar, çatal, dil, kelepçe kesiti).
// Birimler: model metre → çizim mm. Her pafta model uzayında gerçek ölçüde (1:1 mm) çizilir,
// pafta çerçevesi ölçek katsayısı kadar büyütülür; ölçüler gerçek değeri gösterir.

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const { createAntennaHanger } = await import(pathToFileURL(path.join(ROOT, 'anten_aski_modeli.js')).href);

// Seçenekler (2026-11-15): --model=matsing|gammanu  --anten=hayalet|var|yok
//   Seçeneksiz çalıştırma = Pafta 13 (Matsing, anten hayalet çizgi, DXF_Ciktilari/DWG).
//   Seçenekli çalıştırma  = Pafta 27-30, DXF_Ciktilari/Milimetre; DXF AutoCAD'den ölçüleriyle yeniden kaydedilir.
//   anten=var: anten görünüşlerde dolu çizgi (gizli çizgi hesabına dahil), kesitlerde hayalet. anten=yok: anten çizilmez.
const arg = k => (process.argv.find(a => a.startsWith(`--${k}=`)) || '').split('=')[1];
const MODEL = arg('model') || 'matsing';
const ANT_MODE = arg('anten') || 'hayalet';
const IS_DEFAULT = !arg('model') && !arg('anten');
const IS_G = MODEL === 'gammanu';
const MODEL_TR = IS_G ? 'Gammanu' : 'Matsing';
const VARIANT = { 'matsing|yok': 27, 'matsing|var': 28, 'gammanu|yok': 29, 'gammanu|var': 30 }[`${MODEL}|${ANT_MODE}`];
if (!IS_DEFAULT && !VARIANT) { console.error('Geçersiz seçenek. --model=matsing|gammanu --anten=var|yok'); process.exit(1); }
const PAFTA_NO = IS_DEFAULT ? 13 : VARIANT;
const TARIH = IS_DEFAULT ? '2026-11-10' : '2026-11-15';

const OUT_DIR = path.join(ROOT, 'DXF_Ciktilari', IS_DEFAULT ? 'DWG' : 'Milimetre');
fs.mkdirSync(OUT_DIR, { recursive: true });
const BASE = IS_DEFAULT ? '13_MATSING_TEK_KOLLU_ASKI_APARATI_O420_CATI_MAKASI'
  : `${PAFTA_NO}_${MODEL_TR.toUpperCase()}_ASKI_APARATI_${ANT_MODE === 'var' ? 'ANTENLI' : 'ANTENSIZ'}`;
const DXF_PATH = path.join(OUT_DIR, BASE + '.dxf');
const SCR_PATH = path.join(OUT_DIR, BASE + '.scr');
const DWG_PATH = path.join(OUT_DIR, BASE + '.dwg');
const ACCORE = 'C:\\Program Files\\Autodesk\\AutoCAD 2023\\accoreconsole.exe';

// ---------------------------------------------------------------------------
// MODEL DURUMU (ana modeldeki ALAN 1-3 Ara Bölge varsayılanı; azimut 0 = anten +X'e bakar)
// ---------------------------------------------------------------------------
// Gammanu: ana modeldeki ALAN 4 Spot Beam varsayılan inişi 2.0 m
const STATE = { az: 0, tilt: 26, drop: IS_G ? 2.00 : 1.80, slope: 7.66 };
const H = createAntennaHanger(MODEL, { labels: false });
H.setState(STATE);
const C = H.C;
if (ANT_MODE === 'yok') H.antenna.visible = false;
const mmv = v => +(v * 1000).toFixed(1);   // m → mm (metin için)
// Taşıyıcı referans borusu kısaltılır (3.2 m → 1.4 m)
H.carrier.scale.set(1, 1, 1.4 / 3.2);
H.root.updateMatrixWorld(true);

// Borular modelde dolu silindir; kesitte et kalınlığı görünsün diye boru geometrisine çevrilir
function hollow(mesh, t) {
  const p = mesh.geometry.parameters;
  const r = p.radiusTop, h = p.height;
  const pts = [new THREE.Vector2(r - t, -h / 2), new THREE.Vector2(r, -h / 2), new THREE.Vector2(r, h / 2), new THREE.Vector2(r - t, h / 2), new THREE.Vector2(r - t, -h / 2)];
  mesh.geometry = new THREE.LatheGeometry(pts, 48);
}
const near = (a, b) => Math.abs(a - b) < 1e-5;
const sleeveR = C.MAST_PIPE.D / 2 + 0.001 + 0.006;
H.root.traverse(o => {
  if (!o.isMesh || o.geometry.type !== 'CylinderGeometry') return;
  const p = o.geometry.parameters;
  if (!near(p.radiusTop, p.radiusBottom)) return;
  if (near(p.radiusTop, C.DROP_PIPE.D / 2) && p.height > 0.3) hollow(o, C.DROP_PIPE.t);
  else if (near(p.radiusTop, C.MAST_PIPE.D / 2) && p.height > C.MAST_PIPE.L - 0.05) hollow(o, C.MAST_PIPE.t);
  else if (near(p.radiusTop, sleeveR)) hollow(o, 0.006);
});
H.root.updateMatrixWorld(true);

// Parça sınıfları → katman
const antennaSet = new Set(); H.antenna.traverse(o => antennaSet.add(o));
const carrierSet = new Set(); H.carrier.traverse(o => carrierSet.add(o));
function visibleChain(o) { for (let c = o; c; c = c.parent) if (!c.visible) return false; return true; }
function layerOf(m) {
  if (antennaSet.has(m)) return 'ANTEN_HAYALET';
  if (carrierSet.has(m)) return 'TASIYICI_REF';
  if (m.material === H.M.felt) return 'KECE';
  if (m.material === H.M.dark || m.material === H.M.accent) return 'CIVATA_PIM';
  return 'APARAT';
}
// anten=var: görünüşlerde anten dolu çizgi (ANTEN katmanı); kesitlerde yine hayalet
const viewLayer = m => (ANT_MODE === 'var' && antennaSet.has(m) ? 'ANTEN' : layerOf(m));
const allMeshes = [];
H.root.traverse(o => { if (o.isMesh && visibleChain(o)) allMeshes.push(o); });

// ---------------------------------------------------------------------------
// DXF YAZICI (R12, Türkçe karakterler \U+XXXX)
// ---------------------------------------------------------------------------
const ents = [];
const enc = s => String(s).replace(/[^\x20-\x7e]/g, ch => '\\U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'));
const f = v => (Math.round(v * 1000) / 1000).toString();
function LINE(x1, y1, x2, y2, layer, lt) {
  ents.push(`0\nLINE\n8\n${layer}\n${lt ? `6\n${lt}\n` : ''}10\n${f(x1)}\n20\n${f(y1)}\n30\n0\n11\n${f(x2)}\n21\n${f(y2)}\n31\n0`);
}
function CIRCLE(x, y, r, layer, lt) {
  ents.push(`0\nCIRCLE\n8\n${layer}\n${lt ? `6\n${lt}\n` : ''}10\n${f(x)}\n20\n${f(y)}\n30\n0\n40\n${f(r)}`);
}
function TEXT(x, y, h, s, layer = 'METIN', align = 0, rot = 0) {
  // align: 0 sol, 1 orta, 2 sağ (taban çizgisi)
  const a = align ? `72\n${align}\n11\n${f(x)}\n21\n${f(y)}\n31\n0\n` : '';
  ents.push(`0\nTEXT\n8\n${layer}\n7\nGSSTAD\n10\n${f(x)}\n20\n${f(y)}\n30\n0\n40\n${f(h)}\n1\n${enc(s)}\n${rot ? `50\n${f(rot)}\n` : ''}${a}`.replace(/\n$/, ''));
}
function RECT(x, y, w, h, layer) { LINE(x, y, x + w, y, layer); LINE(x + w, y, x + w, y + h, layer); LINE(x + w, y + h, x, y + h, layer); LINE(x, y + h, x, y, layer); }

// Çizgi tipleri pafta ölçeğine göre ayrı tanımlı (R12'de nesne çizgi tipi ölçeği yok)
const LTYPES = {
  GIZLI10: [60, -30], GIZLI2: [12, -6],
  EKSEN10: [250, -50, 50, -50], EKSEN2: [50, -10, 10, -10],
  HAYALET10: [250, -50, 50, -50, 50, -50], HAYALET2: [50, -10, 10, -10, 10, -10],
  KESIT10: [400, -60, 60, -60]
};
const LAYERS = {
  APARAT: 7, CIVATA_PIM: 4, KECE: 8, TASIYICI_REF: 9, ANTEN_HAYALET: 2, ANTEN: 2, GIZLI: 8, EKSEN: 1,
  TARAMA: 8, KESIT_HATTI: 1, OLCU: 3, METIN: 7, CERCEVE: 7, ANTET: 7
};
function buildDxf() {
  const lt = Object.entries(LTYPES).map(([n, el]) => {
    const total = el.reduce((s, v) => s + Math.abs(v), 0);
    return `0\nLTYPE\n2\n${n}\n70\n0\n3\n${n}\n72\n65\n73\n${el.length}\n40\n${total}\n` + el.map(v => `49\n${v}`).join('\n');
  });
  lt.unshift('0\nLTYPE\n2\nCONTINUOUS\n70\n0\n3\nSolid line\n72\n65\n73\n0\n40\n0.0');
  const ly = Object.entries(LAYERS).map(([n, c]) => `0\nLAYER\n2\n${n}\n70\n0\n62\n${c}\n6\nCONTINUOUS`);
  return [
    '0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n9\n$INSUNITS\n70\n4\n9\n$LTSCALE\n40\n1.0\n0\nENDSEC',
    '0\nSECTION\n2\nTABLES',
    `0\nTABLE\n2\nLTYPE\n70\n${lt.length}\n${lt.join('\n')}\n0\nENDTAB`,
    `0\nTABLE\n2\nLAYER\n70\n${ly.length}\n${ly.join('\n')}\n0\nENDTAB`,
    '0\nTABLE\n2\nSTYLE\n70\n1\n0\nSTYLE\n2\nGSSTAD\n70\n0\n40\n0.0\n41\n1.0\n50\n0.0\n71\n0\n42\n2.5\n3\narial.ttf\n4\n\n0\nENDTAB',
    '0\nENDSEC',
    '0\nSECTION\n2\nENTITIES\n' + ents.join('\n') + '\n0\nENDSEC',
    '0\nEOF', ''
  ].join('\n');
}

// Script komutları (ölçüler vb.)
const scr = [];

// ---------------------------------------------------------------------------
// İZDÜŞÜM MOTORU
// ---------------------------------------------------------------------------
// view: { dir (bakış yönü, izleyiciden sahneye), up } → sağ = dir × up
function makeView(dir, up) {
  const d = dir.clone().normalize();
  const r = new THREE.Vector3().crossVectors(d, up).normalize();
  const u = new THREE.Vector3().crossVectors(r, d).normalize();
  return { d, r, u, P: p => [p.dot(r), p.dot(u), p.dot(d)] };
}

const _triCache = new Map();
function worldTris(mesh) {
  if (_triCache.has(mesh)) return _triCache.get(mesh);
  const g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
  const pa = g.attributes.position, out = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).applyMatrix4(mesh.matrixWorld); out.push(v.x, v.y, v.z); }
  const arr = new Float64Array(out);
  _triCache.set(mesh, arr);
  return arr;
}

// Kenarlar: sınır, kırık (açı > 20°) ve görünüşe göre siluet. Dünya koordinatında.
const _edgeCache = new Map();
function meshEdges(mesh) {
  if (_edgeCache.has(mesh)) return _edgeCache.get(mesh);
  let g = mesh.geometry.clone();
  for (const k of Object.keys(g.attributes)) if (k !== 'position') g.deleteAttribute(k);
  g = mergeVertices(g, 1e-6);
  const idx = g.index.array, pos = g.attributes.position;
  const P = []; const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld); P.push(v.clone()); }
  const faceN = [];
  for (let t = 0; t < idx.length; t += 3) {
    const a = P[idx[t]], b = P[idx[t + 1]], c = P[idx[t + 2]];
    faceN.push(new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize());
  }
  const map = new Map();
  // Alanı sıfır olan üçgenler (delik köprüleri vb.) komşuluğa katılmaz; yoksa delik kenarları kaybolur
  for (let t = 0; t < idx.length; t += 3) for (let k = 0; k < 3; k++) {
    if (faceN[t / 3].lengthSq() < 0.5) break;
    const i1 = idx[t + k], i2 = idx[t + (k + 1) % 3];
    const key = i1 < i2 ? i1 + '_' + i2 : i2 + '_' + i1;
    if (!map.has(key)) map.set(key, { a: Math.min(i1, i2), b: Math.max(i1, i2), f: [] });
    map.get(key).f.push(t / 3);
  }
  const edges = [];
  for (const e of map.values()) {
    const n1 = faceN[e.f[0]], n2 = e.f.length > 1 ? faceN[e.f[1]] : null;
    if (n1.lengthSq() < 0.5 || (n2 && n2.lengthSq() < 0.5)) continue; // dejenere
    edges.push({ A: P[e.a], B: P[e.b], n1, n2, crease: !n2 || n1.dot(n2) < Math.cos(THREE.MathUtils.degToRad(20)) });
  }
  _edgeCache.set(mesh, edges);
  return edges;
}

// Yarı uzay kırpma (kesit görünüşünde düzlemin önü atılır): dist = (p - o)·n, dist ≥ 0 tutulur
function clipTri(tri, plane) {
  if (!plane) return [tri];
  const ds = tri.map(p => p.clone().sub(plane.o).dot(plane.n));
  const out = [];
  for (let i = 0; i < 3; i++) {
    const p = tri[i], q = tri[(i + 1) % 3], dp = ds[i], dq = ds[(i + 1) % 3];
    if (dp >= 0) out.push(p);
    if ((dp >= 0) !== (dq >= 0)) out.push(p.clone().lerp(q, dp / (dp - dq)));
  }
  if (out.length < 3) return [];
  const res = [];
  for (let i = 1; i < out.length - 1; i++) res.push([out[0], out[i], out[i + 1]]);
  return res;
}

// Örtücü üçgenler için 2B ızgara (derinlik = p·d, küçük olan izleyiciye yakın)
function buildOccluder(meshes, view, plane) {
  const tris = [];
  for (const m of meshes) {
    const w = worldTris(m);
    for (let i = 0; i < w.length; i += 9) {
      const tri = [new THREE.Vector3(w[i], w[i + 1], w[i + 2]), new THREE.Vector3(w[i + 3], w[i + 4], w[i + 5]), new THREE.Vector3(w[i + 6], w[i + 7], w[i + 8])];
      for (const t of clipTri(tri, plane)) tris.push(t.map(p => view.P(p)));
    }
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const t of tris) for (const p of t) { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
  const cs = 0.015, nx = Math.ceil((maxX - minX) / cs) + 1, ny = Math.ceil((maxY - minY) / cs) + 1;
  const grid = new Array(nx * ny);
  tris.forEach((t, ti) => {
    const x0 = Math.floor((Math.min(t[0][0], t[1][0], t[2][0]) - minX) / cs), x1 = Math.floor((Math.max(t[0][0], t[1][0], t[2][0]) - minX) / cs);
    const y0 = Math.floor((Math.min(t[0][1], t[1][1], t[2][1]) - minY) / cs), y1 = Math.floor((Math.max(t[0][1], t[1][1], t[2][1]) - minY) / cs);
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) (grid[x + y * nx] ||= []).push(ti);
  });
  return {
    hidden(px, py, pz) {
      const cx = Math.floor((px - minX) / cs), cy = Math.floor((py - minY) / cs);
      if (cx < 0 || cy < 0 || cx >= nx || cy >= ny) return false;
      const cell = grid[cx + cy * nx]; if (!cell) return false;
      for (const ti of cell) {
        const [a, b, c] = tris[ti];
        const v0x = c[0] - a[0], v0y = c[1] - a[1], v1x = b[0] - a[0], v1y = b[1] - a[1], v2x = px - a[0], v2y = py - a[1];
        const den = v0x * v1y - v1x * v0y; if (Math.abs(den) < 1e-14) continue;
        const u = (v2x * v1y - v1x * v2y) / den, v = (v0x * v2y - v2x * v0y) / den;
        if (u < 1e-4 || v < 1e-4 || u + v > 1 - 1e-4) continue;
        const z = a[2] + u * (c[2] - a[2]) + v * (b[2] - a[2]);
        if (z < pz - 0.0006) return true;
      }
      return false;
    }
  };
}

// Bir görünüşü çiz: meshes (çizilecekler), occ (örtücüler), ox/oy çizim konumu (mm), plane: kesit düzlemi
function drawView(view, meshes, occMeshes, ox, oy, opts = {}) {
  const { plane = null, hiddenLt = null, sheet = 10, layerFn = layerOf, noOcc = new Set(), k = 1 } = opts;
  const occ = buildOccluder(occMeshes.filter(m => !noOcc.has(m)), view, plane);
  const S = 1000 * k;
  const step = 0.0025;
  let nVis = 0;
  for (const m of meshes) {
    const layer = layerFn(m);
    const phantom = layer === 'ANTEN_HAYALET';
    for (const e of meshEdges(m)) {
      const s1 = e.n1.dot(view.d), s2 = e.n2 ? e.n2.dot(view.d) : s1;
      const sil = e.n2 && (s1 < 0) !== (s2 < 0);
      if (!e.crease && !sil) continue;
      if (!sil && s1 >= 0 && s2 >= 0 && !phantom) continue; // yalnızca arka yüzlere ait kırık kenar
      let A = e.A, B = e.B;
      if (plane && !phantom) {
        const da = A.clone().sub(plane.o).dot(plane.n), db = B.clone().sub(plane.o).dot(plane.n);
        if (da < 0 && db < 0) continue;
        if (da < 0) A = A.clone().lerp(B, da / (da - db));
        else if (db < 0) B = B.clone().lerp(A, db / (db - da));
      }
      const pa = view.P(A), pb = view.P(B);
      const len = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
      if (len < 1e-5) continue;
      if (phantom) { LINE(ox + pa[0] * S, oy + pa[1] * S, ox + pb[0] * S, oy + pb[1] * S, layer, `HAYALET${sheet}`); continue; }
      const n = Math.max(2, Math.ceil(len / step));
      let runStart = 0, runVis = null;
      const flush = (i1, vis) => {
        const t0 = runStart / n, t1 = i1 / n;
        const x0 = pa[0] + (pb[0] - pa[0]) * t0, y0 = pa[1] + (pb[1] - pa[1]) * t0;
        const x1 = pa[0] + (pb[0] - pa[0]) * t1, y1 = pa[1] + (pb[1] - pa[1]) * t1;
        if (Math.hypot(x1 - x0, y1 - y0) < 0.00002) return;   // yay parçaları 0.4 mm civarı; atılmamalı
        if (vis) { LINE(ox + x0 * S, oy + y0 * S, ox + x1 * S, oy + y1 * S, layer); nVis++; }
        else if (hiddenLt) LINE(ox + x0 * S, oy + y0 * S, ox + x1 * S, oy + y1 * S, 'GIZLI', hiddenLt);
      };
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        const vis = !occ.hidden(pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t, pa[2] + (pb[2] - pa[2]) * t);
        if (runVis === null) runVis = vis;
        else if (vis !== runVis) { flush(i, runVis); runStart = i; runVis = vis; }
      }
      flush(n, runVis);
    }
  }
  return nVis;
}

// Kesit: düzlemle kesilen parçaların kesit çevrimleri + 45° tarama
function drawSection(view, meshes, plane, ox, oy, spacing, opts = {}) {
  const { hatchFilter = () => true, k = 1 } = opts;
  const S = 1000 * k;
  for (const m of meshes) {
    const layer = layerOf(m);
    if (layer === 'ANTEN_HAYALET') continue;
    const w = worldTris(m);
    const segs = [];
    for (let i = 0; i < w.length; i += 9) {
      const pts = [0, 3, 6].map(k => new THREE.Vector3(w[i + k], w[i + k + 1], w[i + k + 2]));
      const ds = pts.map(p => p.clone().sub(plane.o).dot(plane.n));
      const cut = [];
      for (let k = 0; k < 3; k++) {
        const a = ds[k], b = ds[(k + 1) % 3];
        if ((a > 0) !== (b > 0)) cut.push(pts[k].clone().lerp(pts[(k + 1) % 3], a / (a - b)));
      }
      if (cut.length === 2) segs.push(cut.map(p => view.P(p)));
    }
    if (!segs.length) continue;
    // Çevrim zinciri
    const key = p => Math.round(p[0] * 2e5) + ',' + Math.round(p[1] * 2e5);
    const adj = new Map();
    segs.forEach((s, i) => { for (const p of s) { const k = key(p); if (!adj.has(k)) adj.set(k, []); adj.get(k).push(i); } });
    const used = new Uint8Array(segs.length);
    const loops = [];
    for (let i = 0; i < segs.length; i++) {
      if (used[i]) continue;
      used[i] = 1;
      const loop = [segs[i][0], segs[i][1]];
      for (let guard = 0; guard < 20000; guard++) {
        const k = key(loop[loop.length - 1]);
        const nxt = (adj.get(k) || []).find(j => !used[j]);
        if (nxt === undefined) break;
        used[nxt] = 1;
        const s = segs[nxt];
        loop.push(key(s[0]) === k ? s[1] : s[0]);
      }
      if (loop.length > 2) loops.push(loop);
    }
    const lay = layer === 'TASIYICI_REF' ? 'TASIYICI_REF' : layer;
    for (const lp of loops) for (let i = 0; i < lp.length - 1; i++) LINE(ox + lp[i][0] * S, oy + lp[i][1] * S, ox + lp[i + 1][0] * S, oy + lp[i + 1][1] * S, lay);
    if (layer === 'TASIYICI_REF' || !hatchFilter(m)) continue;
    // Tarama (çift-tek kuralı), 45°: u = x + y sabit doğrular
    const sp = spacing / S;
    const rot = p => [(p[0] - p[1]) / Math.SQRT2, (p[0] + p[1]) / Math.SQRT2];
    const R = loops.map(lp => lp.map(rot));
    let minV = Infinity, maxV = -Infinity;
    for (const lp of R) for (const p of lp) { minV = Math.min(minV, p[1]); maxV = Math.max(maxV, p[1]); }
    for (let v = Math.ceil(minV / sp) * sp; v <= maxV; v += sp) {
      const xs = [];
      for (const lp of R) for (let i = 0; i < lp.length - 1; i++) {
        const a = lp[i], b = lp[i + 1];
        if ((a[1] > v) !== (b[1] > v)) xs.push(a[0] + (v - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const u0 = xs[i], u1 = xs[i + 1];
        const back = (u, vv) => [(u + vv) / Math.SQRT2, (vv - u) / Math.SQRT2];
        const p0 = back(u0, v), p1 = back(u1, v);
        LINE(ox + p0[0] * S, oy + p0[1] * S, ox + p1[0] * S, oy + p1[1] * S, 'TARAMA');
      }
    }
  }
}

// Görünüş sınırları (mm, görünüş koordinatında)
function extents(view, meshes) {
  let a = [Infinity, Infinity], b = [-Infinity, -Infinity];
  for (const m of meshes) { const w = worldTris(m); for (let i = 0; i < w.length; i += 3) { const p = view.P(new THREE.Vector3(w[i], w[i + 1], w[i + 2])); a = [Math.min(a[0], p[0]), Math.min(a[1], p[1])]; b = [Math.max(b[0], p[0]), Math.max(b[1], p[1])]; } }
  return { x0: a[0] * 1000, y0: a[1] * 1000, x1: b[0] * 1000, y1: b[1] * 1000 };
}

// Ölçü (AutoCAD DIMLINEAR, metin gerçek değerle)
function DIM(x1, y1, x2, y2, lx, ly, text) {
  scr.push('_.DIMLINEAR', `${f(x1)},${f(y1)}`, `${f(x2)},${f(y2)}`, '_T', enc(text), `${f(lx)},${f(ly)}`);
}
function DIMALIGNED(x1, y1, x2, y2, lx, ly, text) {
  scr.push('_.DIMALIGNED', `${f(x1)},${f(y1)}`, `${f(x2)},${f(y2)}`, '_T', enc(text), `${f(lx)},${f(ly)}`);
}
// Kılavuz notu: ok ucu (küçük çizgi) + kırık çizgi + metin
function NOTE(px, py, tx, ty, text, h) {
  LINE(px, py, tx, ty, 'OLCU');
  const dir = tx >= px ? 1 : -1;
  LINE(tx, ty, tx + dir * h * 0.8, ty, 'OLCU');
  CIRCLE(px, py, h * 0.15, 'OLCU');
  TEXT(tx + dir * h, ty - h * 0.35, h, text, 'METIN', dir > 0 ? 0 : 2);
}
function CENTERLINE(x1, y1, x2, y2, sheet) { LINE(x1, y1, x2, y2, 'EKSEN', `EKSEN${sheet}`); }

// ---------------------------------------------------------------------------
// PAFTA ÇERÇEVESİ + ANTET
// ---------------------------------------------------------------------------
function frame(x, y, W, Hh, k, title, sheetNo, scaleTxt) {
  RECT(x, y, W, Hh, 'CERCEVE');
  RECT(x + 20 * k, y + 10 * k, W - 30 * k, Hh - 20 * k, 'CERCEVE');
  const bw = 180 * k, bh = 56 * k, bx = x + W - 10 * k - bw, by = y + 10 * k;
  RECT(bx, by, bw, bh, 'ANTET');
  [14, 28, 42].forEach(r => LINE(bx, by + r * k, bx + bw, by + r * k, 'ANTET'));
  LINE(bx + 120 * k, by, bx + 120 * k, by + 28 * k, 'ANTET');
  const t = 3.5 * k;
  TEXT(bx + 3 * k, by + 46 * k, 5 * k, 'GS STAD · ÇATI KEDİ YOLU TELEKOM ALTYAPISI', 'ANTET');
  TEXT(bx + 3 * k, by + 32 * k, t, title, 'ANTET');
  TEXT(bx + 3 * k, by + 18 * k, t * 0.85, `${IS_G ? 'Gammanu Spot Beam 30/30' : 'Matsing MS-MBA-4.4.2'} · tek kollu 2 eksenli askı`, 'ANTET');
  TEXT(bx + 3 * k, by + 4 * k, t * 0.85, `Ölçek ${scaleTxt} · Ölçüler mm · Tarih ${TARIH}`, 'ANTET');
  TEXT(bx + 123 * k, by + 18 * k, t * 0.85, 'anten_aski_modeli.js', 'ANTET');
  TEXT(bx + 123 * k, by + 4 * k, t, `Pafta ${sheetNo} / 2`, 'ANTET');
}

// ===========================================================================
// PAFTA 1 — GENEL MONTAJ (A0 yatay, 1:10)
// ===========================================================================
const K1 = 10, W1 = 1189 * K1, H1 = 841 * K1, X1 = 0, Y1 = 0;
const ANT_TR = ANT_MODE === 'var' ? ' · ANTENLİ' : ANT_MODE === 'yok' ? ' · ANTENSİZ' : '';
frame(X1, Y1, W1, H1, K1, `Pafta ${PAFTA_NO} · ${MODEL_TR} askı aparatı · Ø420 çatı makası · GENEL MONTAJ${ANT_TR}`, 1, '1:10');
const th1 = 3.5 * K1;

const vFront = makeView(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0));    // +Z'den bakış, sağ = +X
const vSide = makeView(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0));     // +X'ten (antenin önünden) bakış, sağ = −Z
const vTop = makeView(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, -1));     // üstten, sağ = +X, yukarı = −Z

const nonAnt = allMeshes.filter(m => !antennaSet.has(m));
const placeView = (v, cx, topY) => { const e = extents(v, allMeshes); return { ox: cx - (e.x0 + e.x1) / 2, oy: topY - e.y1, e }; };

const titleUnder = (x, y, s1, s2) => { TEXT(x, y, th1 * 1.4, s1, 'METIN', 1); if (s2) TEXT(x, y - th1 * 2, th1, s2, 'METIN', 1); };

// Konumlar
const top1 = Y1 + H1 - 900;
const colX = [2050, 4350, 6650, 8900];
const pF = placeView(vFront, colX[0], top1);
const pS = placeView(vSide, colX[1], top1);
const pA = placeView(vFront, colX[2], top1);
const pB = placeView(vSide, colX[3], top1);

const viewOcc = ANT_MODE === 'var' ? allMeshes : nonAnt;   // antenli: anten de arkasındakileri örter
console.log('Ön görünüş…');
drawView(vFront, allMeshes, viewOcc, pF.ox, pF.oy, { sheet: 10, layerFn: viewLayer });
console.log('Yan görünüş…');
drawView(vSide, allMeshes, viewOcc, pS.ox, pS.oy, { sheet: 10, layerFn: viewLayer });

// Kesit A-A: z = 0 düzlemi (ön görünüş yönünde, düzlemin arkası görünür)
const planeA = { o: new THREE.Vector3(0, 0, 0), n: new THREE.Vector3(0, 0, -1).negate().negate() };
// vFront.d = −Z: izleyici +Z tarafında; düzlemin arkası z ≤ 0 → dist = (p−o)·(−Z) ≥ 0
planeA.n = new THREE.Vector3(0, 0, -1);
console.log('Kesit A-A…');
const secMeshes = allMeshes.filter(m => !antennaSet.has(m));
drawSection(vFront, secMeshes, planeA, pA.ox, pA.oy, 8);
drawView(vFront, allMeshes, nonAnt, pA.ox, pA.oy, { plane: planeA, sheet: 10 });

// Kesit B-B: x = 0 düzlemi (yan görünüş yönünde)
const planeB = { o: new THREE.Vector3(0, 0, 0), n: new THREE.Vector3(-1, 0, 0) };
console.log('Kesit B-B…');
drawSection(vSide, secMeshes, planeB, pB.ox, pB.oy, 8);
drawView(vSide, allMeshes, nonAnt, pB.ox, pB.oy, { plane: planeB, sheet: 10 });

// Üst görünüş (ön görünüşün altında değil, sağ altta)
// Ön görünüşün altındaki açıklama satırlarına binmesin diye en az 1000 mm aşağıda
const pT = placeView(vTop, colX[0], Math.min(Y1 + 3600, pF.oy + pF.e.y0 - 1000));
console.log('Üst görünüş…');
drawView(vTop, allMeshes, viewOcc, pT.ox, pT.oy, { sheet: 10, layerFn: viewLayer });

// Görünüş başlıkları
const titleY = v => v.oy + v.e.y0 - 350;
titleUnder(colX[0], titleY(pF), 'ÖN GÖRÜNÜŞ', 'taşıyıcı ekseni boyunca bakış · 1:10');
titleUnder(colX[1], titleY(pS), 'YAN GÖRÜNÜŞ', 'antenin önünden bakış · 1:10');
titleUnder(colX[2], titleY(pA), 'KESİT A-A', 'kelepçe ortasından, taşıyıcıya dik · 1:10');
titleUnder(colX[3], titleY(pB), 'KESİT B-B', 'aparat ekseninden, taşıyıcı boyunca · 1:10');
titleUnder(pT.ox + (pT.e.x0 + pT.e.x1) / 2, pT.oy + pT.e.y0 - 350, 'ÜST GÖRÜNÜŞ', '1:10');

// Kesit hatları (ön görünüşte B-B, yan görünüşte A-A)
{
  const yTop = pF.oy + pF.e.y1 + 150, yBot = pF.oy + pF.e.y0 - 100;
  LINE(pF.ox, yTop, pF.ox, yBot, 'KESIT_HATTI', 'KESIT10');
  TEXT(pF.ox, yTop + 60, th1 * 1.4, 'B', 'METIN', 1); TEXT(pF.ox, yBot - 160, th1 * 1.4, 'B', 'METIN', 1);
  const ys = pS.oy + pS.e.y1 + 150, ysb = pS.oy + pS.e.y0 - 100;
  LINE(pS.ox, ys, pS.ox, ysb, 'KESIT_HATTI', 'KESIT10');
  TEXT(pS.ox, ys + 60, th1 * 1.4, 'A', 'METIN', 1); TEXT(pS.ox, ysb - 160, th1 * 1.4, 'A', 'METIN', 1);
}

// ---------------------------------------------------------------------------
// Ölçü ve not noktaları (model → çizim)
// ---------------------------------------------------------------------------
const W = new THREE.Vector3();
const wp = (obj, local) => (local ? obj.localToWorld(local.clone()) : obj.getWorldPosition(new THREE.Vector3()));
const at = (view, pl, p) => { const q = view.P(p); return [pl.ox + q[0] * 1000, pl.oy + q[1] * 1000]; };
const pinTilt = wp(H.tiltGroup);
const axis0 = new THREE.Vector3(0, 0, 0);
let mastMesh = null, dropMesh = null;
H.root.traverse(o => {
  if (o.isMesh && o.geometry.type === 'LatheGeometry') {
    const r = o.geometry.parameters.points[1].x;
    if (near(r, C.MAST_PIPE.D / 2)) mastMesh = o;
    if (near(r, C.DROP_PIPE.D / 2)) dropMesh = o;
  }
});
const mastC = wp(mastMesh);
const mastDir = new THREE.Vector3(0, 1, 0).applyQuaternion(mastMesh.getWorldQuaternion(new THREE.Quaternion()));
const plateBot = H.carrierGroup.localToWorld(new THREE.Vector3(0, C.CLAMP.PLATE_TOP - C.CLAMP.PLATE_T, 0));
const pinSlope = wp(H.levelHead);
const fixTop = pinSlope.clone().add(new THREE.Vector3(0, C.FIX_FLANGE_TOP, 0));
const rotBot = fixTop.clone().add(new THREE.Vector3(0, -2 * C.FLANGE_T, 0));
const antBox = new THREE.Box3().setFromObject(H.antenna);

// Ön görünüş ölçüleri
{
  const [ax, ay] = at(vFront, pF, axis0), [px, py] = at(vFront, pF, pinTilt);
  DIM(ax, ay, px, py, pF.ox + pF.e.x0 - 250, (ay + py) / 2, `${Math.round(STATE.drop * 1000)} iniş`);
  const [mx, my] = at(vFront, pF, mastC);
  DIMALIGNED(px, py, mx, my, (px + mx) / 2 + 120, (py + my) / 2 - 120, String(Math.round(C.MAST_X * 1000)));
  const [fx, fy] = at(vFront, pF, fixTop);
  const R = C.FLANGE_R * 1000;
  DIM(fx - R, fy, fx + R, fy, fx, fy + 260, `Ø${Math.round(R * 2)}`);
  CENTERLINE(ax, ay + 400, ax, py - 300, 10);
  CENTERLINE(ax - 400, ay, ax + 400, ay, 10);
  NOTE(ax + 160, ay + 150, ax + 700, ay + 450, 'Taşıyıcı Ø420 (çevre 132 cm) — mevcut çatı makası omurgası', th1);
  const [sx, sy] = at(vFront, pF, pinSlope);
  NOTE(sx + 60, sy, sx + 650, sy + 120, `Eğim mafsalı: Ø${mmv(C.SLOPE.pin.r * 2)} pim + ${C.SLOPE.bolt.name} kanal kilidi (±${C.SLOPE_MAX}°)`, th1);
  NOTE(fx + R, fy - 10, fx + 650, fy - 150, `Eksen 1 azimut: sabit + döner flanş Ø${mmv(C.FLANGE_R * 2)}×${mmv(C.FLANGE_T)}, 4×${C.AZ_BOLT.name}`, th1);
  const dm = pinTilt.clone().lerp(rotBot, 0.5); const [dx, dy] = at(vFront, pF, dm);
  NOTE(dx + C.DROP_PIPE.D * 500, dy, dx + 650, dy - 100, `İniş borusu Ø${mmv(C.DROP_PIPE.D)}×${mmv(C.DROP_PIPE.t)}`, th1);
  NOTE(px - 40, py - 20, px - 450, py - 650, `Eksen 2 tilt: çatal R${mmv(C.CLEVIS_R)}, Ø${mmv(C.PIN.r * 2)} pim, ${C.TILT_BOLT.name} kilit`, th1);
  TEXT(px - 450 - th1, py - 650 - th1 * 1.9, th1 * 0.9, `zemine göre öne ${C.TILT_FRONT}° / arkaya ${C.TILT_BACK}°`, 'METIN', 2);
  TEXT(pF.ox + pF.e.x0 - 250, pF.oy + pF.e.y0 - 500, th1 * 0.9, 'İniş: taşıyıcı ekseninden tilt pimine düşey', 'METIN');
  const [ex, ey] = at(vFront, pF, mastC.clone().addScaledVector(mastDir, 0.7));
  NOTE(ex, ey, ex + 650, ey + 250, `Anten direği Ø${(C.MAST_PIPE.D * 1000).toFixed(1)}×${C.MAST_PIPE.t * 1000} L=${C.MAST_PIPE.L * 1000}`, th1);
  if (ANT_MODE !== 'yok') {
    const [qx, qy] = at(vFront, pF, antBox.getCenter(new THREE.Vector3()));
    const antName = IS_G ? 'Gammanu Spot Beam 30/30' : 'Matsing MS-MBA-4.4.2';
    NOTE(qx, qy, qx + 500, qy - (IS_G ? 500 : 900), `${antName} (${C.ANT.mass} kg)${ANT_MODE === 'hayalet' ? ' — hayalet çizgi, aparata dahil değil' : ''}`, th1);
  } else {
    TEXT(pF.ox + pF.e.x0, pF.oy + pF.e.y0 - 800, th1, 'Anten gösterilmemiştir (antensiz aparat).', 'METIN');
  }
  TEXT(pF.ox + pF.e.x0, pF.oy + pF.e.y0 - 650, th1, `Gösterilen ayar: tilt ${STATE.tilt}° (zemine göre öne), azimut 0°, iniş ${STATE.drop * 1000} mm`, 'METIN');
}
// Yan görünüş ölçüleri
{
  const L = C.CLAMP.SADDLE_L * 1000;
  const [cx, cy] = at(vSide, pS, axis0);
  const along = new THREE.Vector3(0, -Math.sin(STATE.slope * Math.PI / 180), Math.cos(STATE.slope * Math.PI / 180));
  const [ax1, ay1] = at(vSide, pS, along.clone().multiplyScalar(C.CLAMP.SADDLE_L / 2));
  const [ax2, ay2] = at(vSide, pS, along.clone().multiplyScalar(-C.CLAMP.SADDLE_L / 2));
  DIMALIGNED(ax1, ay1 + 300, ax2, ay2 + 300, cx, cy + 520, `${L} kelepçe boyu`);
  const [k1x, k1y] = at(vSide, pS, along.clone().multiplyScalar(0.7));
  const [k2x, k2y] = at(vSide, pS, along.clone().multiplyScalar(-0.7));
  CENTERLINE(k1x, k1y, k2x, k2y, 10);
  TEXT(k2x, k2y + 380, th1, `Taşıyıcı eğimi ${STATE.slope}° (${IS_G ? 'ALAN 4' : 'ALAN 1-3; ALAN 2: 5°'}) — terazi başlığı her zaman yatay`, 'METIN');
  const [sx, sy] = at(vSide, pS, pinSlope);
  CENTERLINE(sx, sy + 300, sx, sy - 2600, 10);
  const [m1x, m1y] = at(vSide, pS, mastC.clone().addScaledVector(mastDir, C.MAST_PIPE.L / 2));
  const [m2x, m2y] = at(vSide, pS, mastC.clone().addScaledVector(mastDir, -C.MAST_PIPE.L / 2));
  DIMALIGNED(m1x, m1y, m2x, m2y, m1x + 450, (m1y + m2y) / 2, `${C.MAST_PIPE.L * 1000} anten direği`);
}

// Parça listesi (BOM) — sağ alt, antetin üstünde
{
  const rows = H.bom();
  const bx = W1 - 10 * K1 - 2450, by0 = 56 * K1 + 10 * K1 + 300;
  const rh = 75, cw = [120, 1700, 200, 330];
  const head = ['No', 'Parça', 'Adet', 'Ağırlık (kg)'];
  let y = by0 + (rows.length + 2) * rh;
  TEXT(bx, y + 60, th1 * 1.4, 'PARÇA LİSTESİ (bir aparat)', 'METIN');
  const line = (cells, yy, bold) => { let x = bx; cells.forEach((c, i) => { TEXT(x + 15, yy + 22, bold ? th1 * 1.05 : th1 * 0.9, c, 'METIN', i >= 2 ? 0 : 0); x += cw[i]; }); };
  const totalW = cw.reduce((a, b) => a + b, 0);
  y -= rh; line(head, y, true); RECT(bx, y, totalW, rh, 'METIN');
  let total = C.ANT.mass, aparat = 0;
  rows.forEach(([n, q, kg], i) => {
    y -= rh;
    const w = q * kg; aparat += w;
    line([String(i + 1), n.length > 78 ? n.slice(0, 76) + '…' : n, String(q), kg ? w.toFixed(1) : '—'], y);
    LINE(bx, y, bx + totalW, y, 'METIN');
  });
  total += aparat;
  y -= rh; line(['', 'Aparat toplamı', '', aparat.toFixed(1)], y, true); LINE(bx, y, bx + totalW, y, 'METIN');
  if (ANT_MODE !== 'yok') { y -= rh; line(['', `Anten dahil toplam (anten ${C.ANT.mass} kg)`, '', total.toFixed(1)], y, true); LINE(bx, y, bx + totalW, y, 'METIN'); }
  let x = bx; [0, ...cw].forEach(w => { x += w; LINE(x, y, x, by0 + (rows.length + 1) * rh, 'METIN'); });
  LINE(bx, y, bx, by0 + (rows.length + 1) * rh, 'METIN');

  // Notlar
  const notes = [
    'NOTLAR',
    '1. Çatı strüktürüne delme ve kaynak yapılmaz; aparat taşıyıcıya cıvatalı kelepçe ile bağlanır.',
    '2. Taşıyıcı ile eyer / kabuk arasında 5 mm keçe (360°, kelepçe boyundan iki uçta 10 mm taşar).',
    '3. Çelik S235JR, sıcak daldırma galvaniz (EN ISO 1461). Cıvatalar 8.8 HDG, somun + kontra somun.',
    `4. Eğim mafsalı: montajda pim gevşekken terazi başlığı kendi ağırlığıyla düşeye gelir, ${C.SLOPE.bolt.name} kanal kilidi sıkılır.`,
    `5. Azimut: 4×${C.AZ_BOLT.name} döner flanşa takılı,` + ' sabit flanştaki ±25° yay kanallarda kayar; 45° kaydırılmış ikinci delik seti ile 360°.',
    '6. Tilt: zemine bakış 0°; öne 70°, arkaya 20°. Kilit cıvatası çatal kanalında.',
    '7. Ölçüler tasarım önerisidir; imalat öncesi statik hesap yapılmalıdır.'
  ];
  let ny = Y1 + 3000;   // alt ortadaki boş alan
  const nx = 3700;
  notes.forEach((n, i) => { TEXT(nx, ny, i ? th1 * 0.95 : th1 * 1.3, n, 'METIN'); ny -= i ? 70 : 110; });
}

// ===========================================================================
// PAFTA 2 — PARÇA DETAYLARI (A1 yatay, 1:2), Pafta 1'in sağında
// ===========================================================================
scr.push('__P2__');
const K2 = 2, W2 = 841 * K2, H2 = 594 * K2, X2 = W1 + 1000, Y2 = 0;
frame(X2, Y2, W2, H2, K2, `Pafta ${PAFTA_NO} · ${MODEL_TR} askı aparatı · PARÇA DETAYLARI`, 2, '1:2');
const th2 = 3.5 * K2;

// Tek parça görünüşü: parçanın kendi yerelinde (nesne dönüşümü sıfırlanmış) izdüşüm, gizli çizgiler kesik
function partView(meshes, dir, up, cx, cy, title, sub) {
  const saved = meshes.map(m => ({ m, parent: m.parent, mat: m.matrixWorld.clone() }));
  // Parçalar referans nesnenin (ilk mesh) yereline taşınır
  const refInv = meshes[0].matrixWorld.clone().invert();
  meshes.forEach(m => { m.matrixWorld.premultiply(refInv); });
  [_triCache, _edgeCache].forEach(c => meshes.forEach(m => c.delete(m)));
  const v = makeView(dir, up);
  const e = extents(v, meshes);
  const ox = cx - (e.x0 + e.x1) / 2, oy = cy - (e.y0 + e.y1) / 2;
  drawView(v, meshes, meshes, ox, oy, { hiddenLt: 'GIZLI2', sheet: 2 });
  TEXT(cx, oy + e.y0 - 30, th2 * 1.3, title, 'METIN', 1);
  if (sub) TEXT(cx, oy + e.y0 - 30 - th2 * 2, th2 * 0.9, sub, 'METIN', 1);
  saved.forEach(s => { s.m.matrixWorld.copy(s.mat); });
  [_triCache, _edgeCache].forEach(c => meshes.forEach(m => c.delete(m)));
  return { ox, oy, e, v };
}

// Parçaları geometri türü / boyutuyla bul
const extrudes = allMeshes.filter(m => m.geometry.type === 'ExtrudeGeometry' && !antennaSet.has(m));
const bb = m => { m.geometry.computeBoundingBox(); return m.geometry.boundingBox.getSize(new THREE.Vector3()); };
const findBy = (pred) => extrudes.find(pred);
const LUG_T = C.SLOPE.lugT;
const outerLug = findBy(m => m.parent && H.carrierGroup.children.includes(m.parent) && m.material === H.M.plate && near(bb(m).x, LUG_T) && bb(m).y > C.SLOPE.outerR);
const innerLug = findBy(m => m.parent === H.levelHead && near(bb(m).x, LUG_T) && bb(m).y > C.SLOPE.headH);
const fixFlange = findBy(m => m.parent === H.levelHead && near(bb(m).x, C.FLANGE_R * 2));
const rotFlange = findBy(m => m.parent === H.azGroup && near(bb(m).x, C.FLANGE_R * 2));
const clevis = allMeshes.find(m => m.geometry.type === 'ExtrudeGeometry' && m.parent && m.parent.parent === H.azGroup && near(bb(m).x, C.CLEVIS_R * 2));
const tongue = findBy(m => m.parent === H.tiltGroup && near(bb(m).z, C.TONGUE.t));
console.log('Detay parçaları:', !!outerLug, !!innerLug, !!fixFlange, !!rotFlange, !!clevis, !!tongue);
const dimW = d => String(Math.round(d.e.x1 - d.e.x0)), dimHt = d => String(Math.round(d.e.y1 - d.e.y0));
const PIN_HOLE = mmv(C.SLOPE.pin.r * 2) + 2, FL_D = mmv(C.FLANGE_R * 2), FL_R = C.FLANGE_R * 1000;

const colW = W2 / 4;
const r1 = Y2 + H2 - 260, r2 = Y2 + H2 - 700;
// D1 eğim mafsalı dış kulak (YZ düzlemi; kalınlık X)
if (outerLug) {
  const d = partView([outerLug], new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0), X2 + colW * 0.5, r1, 'DETAY 1 · Eğim dış kulağı (2 ad.)', `${mmv(LUG_T)} mm, R${mmv(C.SLOPE.outerR)}, Ø${PIN_HOLE} pim deliği, R${mmv(C.SLOPE.slotR)} kanal ±52°, plakaya kaynaklı`);
  DIM(d.ox + d.e.x0, d.oy + d.e.y0, d.ox + d.e.x1, d.oy + d.e.y0, (d.ox + d.e.x0 + d.ox + d.e.x1) / 2, d.oy + d.e.y0 - 60, dimW(d));
  DIM(d.ox + d.e.x1, d.oy + d.e.y1, d.ox + d.e.x1, d.oy + d.e.y0, d.ox + d.e.x1 + 60, (d.oy + d.e.y0 + d.oy + d.e.y1) / 2, dimHt(d));
}
if (innerLug) {
  const d = partView([innerLug], new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0), X2 + colW * 1.5, r1, 'DETAY 2 · Eğim iç kulağı (2 ad.)', `${mmv(LUG_T)} mm, ${mmv(C.SLOPE.innerHalf * 2)} genişlik, R${mmv(C.SLOPE.innerHalf)} üst, Ø${PIN_HOLE} pim deliği, sabit flanşa kaynaklı`);
  DIM(d.ox + d.e.x0, d.oy + d.e.y0, d.ox + d.e.x1, d.oy + d.e.y0, (d.ox + d.e.x0 + d.ox + d.e.x1) / 2, d.oy + d.e.y0 - 60, dimW(d));
  DIM(d.ox + d.e.x1, d.oy + d.e.y1, d.ox + d.e.x1, d.oy + d.e.y0, d.ox + d.e.x1 + 60, (d.oy + d.e.y0 + d.oy + d.e.y1) / 2, dimHt(d));
}
if (fixFlange) {
  const d = partView([fixFlange], new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, -1), X2 + colW * 2.5, r1, 'DETAY 3 · Sabit flanş (1 ad.)', `Ø${FL_D}×${mmv(C.FLANGE_T)}, 4 yay kanal Ø${Math.round(C.AZ_BOLT_R * 2000)} çemberde ±${C.AZ_SLOT_HALF}°, kanal ${mmv(C.AZ_BOLT.r * 2) + 2} mm`);
  const cx = d.ox + (d.e.x0 + d.e.x1) / 2, cy = d.oy + (d.e.y0 + d.e.y1) / 2;
  CENTERLINE(cx - FL_R - 30, cy, cx + FL_R + 30, cy, 2); CENTERLINE(cx, cy - FL_R - 30, cx, cy + FL_R + 30, 2);
  DIM(cx - FL_R, cy, cx + FL_R, cy, cx, cy + FL_R + 40, `Ø${FL_D}`);
  CIRCLE(cx, cy, C.AZ_BOLT_R * 1000, 'EKSEN', 'EKSEN2');
  NOTE(cx + C.AZ_BOLT_R * 1000 * 0.7, cy - C.AZ_BOLT_R * 1000 * 0.7, cx + 180, cy - 150, `Kanal ekseni Ø${Math.round(C.AZ_BOLT_R * 2000)}`, th2 * 0.9);
}
if (rotFlange) {
  const d = partView([rotFlange], new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, -1), X2 + colW * 3.5, r1, 'DETAY 4 · Döner flanş (1 ad.)', `Ø${FL_D}×${mmv(C.FLANGE_T)}, 8×Ø${mmv(C.AZ_BOLT.r * 2) + 2} delik 45° ara Ø${Math.round(C.AZ_BOLT_R * 2000)} çemberde, Ø${mmv(C.AZ_BUSH_R * 2)} burç yuvası`);
  const cx = d.ox + (d.e.x0 + d.e.x1) / 2, cy = d.oy + (d.e.y0 + d.e.y1) / 2;
  CENTERLINE(cx - FL_R - 30, cy, cx + FL_R + 30, cy, 2); CENTERLINE(cx, cy - FL_R - 30, cx, cy + FL_R + 30, 2);
  DIM(cx - FL_R, cy, cx + FL_R, cy, cx, cy + FL_R + 40, `Ø${FL_D}`);
  NOTE(cx - 25, cy + 25, cx - 150, cy + 170, `Ø${mmv(C.AZ_BUSH_R * 2)} burç yuvası`, th2 * 0.9);
}
if (clevis) {
  const d = partView([clevis], new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), X2 + colW * 0.5, r2, 'DETAY 5 · Çatal levhası (2 ad.)', `${mmv(C.CLEVIS_T)} mm, R${mmv(C.CLEVIS_R)}, Ø${mmv(C.PIN.r * 2) + 2} pim deliği, R${mmv(C.TILT_SLOT_R)} tilt kanalı`);
  DIM(d.ox + d.e.x0, d.oy + d.e.y0, d.ox + d.e.x1, d.oy + d.e.y0, (d.ox + d.e.x0 + d.ox + d.e.x1) / 2, d.oy + d.e.y0 - 60, dimW(d));
}
if (tongue) {
  const d = partView([tongue], new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), X2 + colW * 1.6, r2, 'DETAY 6 · Dil levhası (1 ad.)', `${mmv(C.TONGUE.t)} mm, Ø${mmv(C.TONGUE.holeR * 2)} hafifletme deliği, direk manşonuna kaynaklı`);
  DIM(d.ox + d.e.x0, d.oy + d.e.y0, d.ox + d.e.x1, d.oy + d.e.y0, (d.ox + d.e.x0 + d.ox + d.e.x1) / 2, d.oy + d.e.y0 - 60, String(Math.round(d.e.x1 - d.e.x0)));
  DIM(d.ox + d.e.x1, d.oy + d.e.y1, d.ox + d.e.x1, d.oy + d.e.y0, d.ox + d.e.x1 + 60, (d.oy + d.e.y0 + d.oy + d.e.y1) / 2, String(Math.round(d.e.y1 - d.e.y0)));
}

// DETAY 7: kelepçe kesiti (taşıyıcıya dik, eğimsiz) — yalnızca kelepçe + kulak + plaka
{
  const clampMeshes = allMeshes.filter(m => {
    for (let c = m.parent; c; c = c.parent) if (c === H.carrierGroup) return !carrierSet.has(m);
    return false;
  });
  const savedRot = H.carrierGroup.rotation.x;
  H.carrierGroup.rotation.x = 0; H.root.updateMatrixWorld(true);
  [_triCache, _edgeCache].forEach(c => clampMeshes.forEach(m => c.delete(m)));
  const v = makeView(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0));
  // Gammanu: kesit lama çemberin ortasından (z = 100); Matsing: kelepçe ortasından
  const pl = { o: new THREE.Vector3(0, 0, IS_G ? C.CLAMP.BAND_Z[1] : 0), n: new THREE.Vector3(0, 0, -1) };
  const e = extents(v, clampMeshes);
  const k7 = 0.4;   // pafta 1:2, detay 1:5
  const cx = X2 + 1250, cy = 560;
  const ox = cx - (e.x0 + e.x1) / 2 * k7, oy = cy - (e.y0 + e.y1) / 2 * k7;
  drawSection(v, clampMeshes, pl, ox, oy, 3, { k: k7 });
  drawView(v, clampMeshes, clampMeshes, ox, oy, { plane: pl, sheet: 2, k: k7 });
  CIRCLE(ox, oy, C.CARRIER_R * 1000 * k7, 'TASIYICI_REF', 'HAYALET2');
  CENTERLINE(ox - 130, oy, ox + 130, oy, 2); CENTERLINE(ox, oy + 120, ox, oy - 170, 2);
  const yb = oy + e.y0 * k7;
  TEXT(cx, yb - 50, th2 * 1.3, 'DETAY 7 · Kelepçe kesiti (taşıyıcıya dik) · 1:5', 'METIN', 1);
  const CL = C.CLAMP, pw = CL.PLATE_W * 1000, cr = (C.CARRIER_R + 0.005) * 1000;
  TEXT(cx, yb - 50 - th2 * 2, th2 * 0.9, IS_G
    ? `Eyer ${mmv(CL.SADDLE_T)} mm + 2 lama çember ${mmv(CL.BAND_W)}×${mmv(CL.BAND_T)} + 5 mm keçe; çember başına 2×${CL.bolt.name} kulak cıvatası`
    : `Eyer ${mmv(CL.SADDLE_T)} mm 140° + üst kabuk ${mmv(CL.SHELL_T)} mm 220° + 5 mm keçe; 2×4 ${CL.bolt.name} kulak cıvatası`, 'METIN', 1);
  TEXT(cx, yb - 50 - th2 * 3.6, th2 * 0.9, `Ağ levhası ${mmv(CL.WEB_T)} mm; bağlantı plakası ${pw}×${mmv(CL.SADDLE_L)}×${mmv(CL.PLATE_T)}; eğim dış kulakları plakaya kaynaklı`, 'METIN', 1);
  DIM(ox - pw / 2 * k7, yb, ox + pw / 2 * k7, yb, ox, yb - 25, String(pw));
  DIM(ox - cr * k7, oy, ox + cr * k7, oy, ox, oy + 130, `Ø${Math.round(cr * 2)} iç (keçe dahil)`);
  NOTE(ox + 60, oy + 40, ox + 200, oy + 110, 'Ø420 taşıyıcı (hayalet)', th2 * 0.9);
  H.carrierGroup.rotation.x = savedRot; H.root.updateMatrixWorld(true);
  [_triCache, _edgeCache].forEach(c => clampMeshes.forEach(m => c.delete(m)));
}

// ---------------------------------------------------------------------------
// ÇIKTI
// ---------------------------------------------------------------------------
fs.writeFileSync(DXF_PATH, buildDxf(), 'latin1');
const DXF_DIM_PATH = path.join(OUT_DIR, BASE + '_olculu.dxf');   // AutoCAD'den ölçüleriyle kaydedilen DXF (ara ad)
const lw = [['APARAT', '0.50'], ['CIVATA_PIM', '0.35'], ['KECE', '0.25'], ['TASIYICI_REF', '0.25'], ['ANTEN_HAYALET', '0.18'], ['ANTEN', '0.35'], ['GIZLI', '0.18'],
  ['EKSEN', '0.18'], ['TARAMA', '0.13'], ['KESIT_HATTI', '0.50'], ['OLCU', '0.18'], ['METIN', '0.25'], ['CERCEVE', '0.70'], ['ANTET', '0.35']];
const script = [
  '_.FILEDIA', '0', '_.CMDECHO', '0',
  ...lw.flatMap(([n, w]) => ['-LAYER', '_LW', w, n, '']),
  '_.LWDISPLAY', '1',
  // Ölçü stili: pafta 1 (1:10)
  '_.DIMTXSTY', 'GSSTAD', '_.DIMTXT', '3.5', '_.DIMASZ', '3', '_.DIMEXO', '2', '_.DIMEXE', '2', '_.DIMGAP', '1.5', '_.DIMDEC', '0', '_.DIMCLRD', '3', '_.DIMCLRE', '3', '_.DIMCLRT', '7',
  '_.DIMSCALE', '10', '-LAYER', '_S', 'OLCU', '',
  ...scr.slice(0, scr.indexOf('__P2__')),
  '_.DIMSCALE', '2',
  ...scr.slice(scr.indexOf('__P2__') + 1),
  '_.ZOOM', '_E',
  '_.SAVEAS', '2018', '"' + DWG_PATH + '"',
  // Seçenekli çalıştırmada ölçüler DXF'te de olsun diye AutoCAD'den DXF olarak da kaydedilir
  ...(IS_DEFAULT ? [] : ['_.DXFOUT', '"' + DXF_DIM_PATH + '"', '16'])
];
if (fs.existsSync(DXF_DIM_PATH)) fs.unlinkSync(DXF_DIM_PATH);
fs.writeFileSync(SCR_PATH, script.join('\r\n') + '\r\n', 'latin1');
console.log('DXF:', DXF_PATH, (fs.statSync(DXF_PATH).size / 1e6).toFixed(1), 'MB,', ents.length, 'nesne');
if (fs.existsSync(ACCORE)) {
  if (fs.existsSync(DWG_PATH)) fs.unlinkSync(DWG_PATH);
  try { execFileSync(ACCORE, ['/i', DXF_PATH, '/s', SCR_PATH, '/l', 'en-US'], { stdio: 'ignore', timeout: 600000, cwd: OUT_DIR }); } catch (e) { console.log('accoreconsole çıkış kodu', e.status); }
  console.log(fs.existsSync(DWG_PATH) ? 'DWG: ' + DWG_PATH : 'DWG üretilemedi (DXF ve .scr hazır)');
  if (fs.existsSync(DWG_PATH)) fs.unlinkSync(SCR_PATH);   // ara dosya; DWG yoksa elle çalıştırmak için kalır
  if (fs.existsSync(DXF_DIM_PATH)) { fs.renameSync(DXF_DIM_PATH, DXF_PATH); console.log('DXF ölçüleriyle yeniden kaydedildi (AutoCAD 2018 biçimi)'); }
  else if (!IS_DEFAULT) console.log('UYARI: ölçülü DXF kaydedilemedi; DXF ölçüsüz (R12) kaldı');
}

// PDF önizleme (AutoCAD DWG To PDF, monochrome.ctb): Pafta 1 A0, Pafta 2 A1
if (fs.existsSync(ACCORE) && fs.existsSync(DWG_PATH)) {
  const plot = (paper, x0, y0, x1, y1, out) => ['-PLOT', 'Y', 'Model', 'DWG To PDF.pc3', paper, 'M', 'L', 'N', 'W', `${x0},${y0}`, `${x1},${y1}`, 'F', 'C', 'Y', 'monochrome.ctb', 'Y', 'A', '"' + out + '"', 'N', 'Y'];   // yolda boşluk var: tırnak şart
  const pdf1 = path.join(OUT_DIR, BASE + '_Pafta1.pdf'), pdf2 = path.join(OUT_DIR, BASE + '_Pafta2.pdf');
  [pdf1, pdf2].forEach(p => { if (fs.existsSync(p)) fs.unlinkSync(p); });
  const plotScr = path.join(OUT_DIR, BASE + '_plot.scr');
  fs.writeFileSync(plotScr, ['_.FILEDIA', '0',
    ...plot('ISO full bleed A0 (841.00 x 1189.00 MM)', X1, Y1, X1 + W1, Y1 + H1, pdf1),
    ...plot('ISO full bleed A1 (594.00 x 841.00 MM)', X2, Y2, X2 + W2, Y2 + H2, pdf2)].join('\r\n') + '\r\n', 'latin1');
  try { execFileSync(ACCORE, ['/i', DWG_PATH, '/s', plotScr, '/l', 'en-US', '/readonly'], { stdio: 'ignore', timeout: 600000, cwd: OUT_DIR }); } catch (e) { console.log('PDF çizimi çıkış kodu', e.status); }
  fs.unlinkSync(plotScr);
  ['plot.log', 'accc.log'].forEach(n => { const p = path.join(OUT_DIR, n); if (fs.existsSync(p)) fs.unlinkSync(p); });
  console.log('PDF:', [pdf1, pdf2].filter(p => fs.existsSync(p)).map(p => path.basename(p)).join(', '));
}
