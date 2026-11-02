// Çatı makası kablo tavası tij askısı: ayrı 3D çalışma alanı (tava_aski_aparati.html)
// Ana modeldeki askıyla aynı ölçüler: main.js → buildScoreboardRoofTruss60m 3.E (ALAN 2) ve
// addRefTrussTrayHangers (ALAN 1-3, ALAN 4). Üst boruyu saran 50×5 lama kelepçe (M10 kulak cıvatası),
// konik boyun, M16 dişli tij, U profil tabla; tava kenarında çeneler. Delme / kaynak yok (Kalıcı karar).
//
// Koordinatlar (m): makas yerel ekseni. Z = makas boyunca s, Y = omurga ekseninden yukarı, X = enine.
// Düğüm askısı s = 0'daki V istasyonunda, ara askı s = 1.43'te (düğüm ile ara üst düğümün ortası).

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// ---------------------------------------------------------------------------
// ÖLÇÜLER (main.js REF_TRUSS ile aynı)
// ---------------------------------------------------------------------------
const T = (() => {
  const spineR = 1.32 / Math.PI / 2;                       // Ø420 (132 cm çevre)
  const gapSlope = 0.438, gapAt0 = 0.039, legR = 0.35 / Math.PI / 2;
  const legAxisX = h => (gapSlope * h + gapAt0) / 2 + legR / Math.cos(Math.atan(gapSlope / 2));
  const chordY = spineR + 3.00 + 0.08;                     // 300 cm iç yükseklik
  return {
    spineR, gapSlope, gapAt0, legR, legAxisX, chordY, chordR: 0.08, chordX: legAxisX(chordY - spineR),
    baseX: legAxisX(0), webR: 0.70 / Math.PI / 2, tieR: 0.05, zigR: 0.035, vStep: 5.72
  };
})();
const MID_NODE = T.vStep / 2;          // ara üst düğüm (2.86)
const MID_HANGER_S = MID_NODE / 2;     // ara askı (1.43)
const HANGER_SPACING = T.vStep / 4;    // askı aralığı ≈ 1.43 m
const LAMA = { w: 0.05, t: 0.005, gap: 0.002 };
const TIJ_R = 0.008, TABLA = { h: 0.03, d: 0.08, t: 0.003 };
const STEEL = 7850, G = 9.81;
const TRAYS = {
  500: { w: 0.50, h: 0.20, kgm: 9.0 },   // tava öz ağırlığı (galvaniz delikli, kapaksız, tahmini)
  300: { w: 0.30, h: 0.25, kgm: 7.0 }
};
const M16_TENS = 0.9 * 800 * 157 / 1.25;   // N, 8.8 çekme dayanımı (Ft,Rd)
const M10_TENS = 0.9 * 800 * 58 / 1.25;
const LAMA_TENS = LAMA.w * LAMA.t * 235e6; // N, 50×5 S235 bant (tek kesit)

// Modeldeki askı adetleri (2026-11-02, sahneden sayıldı)
const QTY = [
  ['ALAN 2 · sol makas', 13, 13],
  ['ALAN 2 · orta makas', 20, 19],
  ['ALAN 2 · sağ makas', 13, 13],
  ['ALAN 1-3', 14, 13],
  ['ALAN 4', 11, 11]
];

// ---------------------------------------------------------------------------
// SAHNE
// ---------------------------------------------------------------------------
const view = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(view.clientWidth, view.clientHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
view.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(view.clientWidth, view.clientHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.inset = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
view.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f172a);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.add(new THREE.HemisphereLight(0xffffff, 0x334155, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(3, 6, 4);
scene.add(sun);

const camera = new THREE.PerspectiveCamera(40, view.clientWidth / view.clientHeight, 0.01, 100);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const M = {
  pipe: new THREE.MeshStandardMaterial({ color: 0xebedf0, metalness: 0.35, roughness: 0.38 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x9aa8b4, metalness: 0.75, roughness: 0.4 }),
  band: new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.85, roughness: 0.3 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.4 }),
  accent: new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.3, roughness: 0.5 }),
  tray: new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.8, roughness: 0.35, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }),
  cable: new THREE.MeshStandardMaterial({ color: 0x141619, metalness: 0.2, roughness: 0.7 })
};

// ---------------------------------------------------------------------------
// YARDIMCILAR
// ---------------------------------------------------------------------------
const V = THREE.Vector3;
const mm = v => Math.round(v * 1000);
function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}
function pipe(a, b, r, mat, seg = 24) {
  const dir = new V().subVectors(b, a);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, dir.length(), seg), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new V(0, 1, 0), dir.normalize());
  return m;
}
function nut(x, y, z, size = 0.014, mat = M.dark) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(size, size, size * 0.9, 6), mat);
  m.position.set(x, y, z);
  return m;
}
const labels = [];
function addLabel(parent, text, pos, cls = '') {
  const el = document.createElement('div');
  el.className = 'lbl ' + cls;
  el.textContent = text;
  const o = new CSS2DObject(el);
  o.position.copy(pos);
  parent.add(o);
  labels.push(o);
  return o;
}

// ---------------------------------------------------------------------------
// 1. MAKAS PARÇASI (referans): s = −3.0 … +3.0, V istasyonu s = 0, ara üst düğümler ±2.86
// ---------------------------------------------------------------------------
const SEG = 3.0;
const trussGroup = new THREE.Group();
scene.add(trussGroup);
{
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(T.spineR, T.spineR, 2 * SEG, 48), M.pipe);
  spine.rotation.x = Math.PI / 2;
  trussGroup.add(spine);
  [-1, 1].forEach(sx => {
    const chord = new THREE.Mesh(new THREE.CylinderGeometry(T.chordR, T.chordR, 2 * SEG, 24), M.pipe);
    chord.rotation.x = Math.PI / 2;
    chord.position.set(sx * T.chordX, T.chordY, 0);
    trussGroup.add(chord);
    // V kolu (istasyon s = 0)
    trussGroup.add(pipe(new V(sx * T.baseX, T.spineR, 0), new V(sx * T.chordX, T.chordY, 0), T.legR, M.pipe));
  });
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(T.spineR + 0.015, T.spineR + 0.015, 0.2, 32), M.steel);
  collar.rotation.x = Math.PI / 2;
  trussGroup.add(collar);
  // Enine gergiler: istasyon ve ara üst düğümler
  [-MID_NODE, 0, MID_NODE].forEach(s => trussGroup.add(pipe(new V(-T.chordX, T.chordY, s), new V(T.chordX, T.chordY, s), T.tieR, M.pipe)));
  // Örgü çaprazları: istasyondan ara düğümlere; komşu istasyonlardan gelenler parça sınırında kesik
  const webOut = (T.webR - T.legR) / Math.cos(Math.atan(T.gapSlope / 2)) + 0.013;
  const webPt = (sx, s0, s1, t) => new V(sx * (T.baseX + webOut + (T.chordX - T.baseX) * t), T.spineR + (T.chordY - T.spineR) * t, s0 + (s1 - s0) * t);
  [-1, 1].forEach(sx => {
    [-1, 1].forEach(dir => {
      trussGroup.add(pipe(webPt(sx, 0, dir * MID_NODE, 0), webPt(sx, 0, dir * MID_NODE, 1), T.webR, M.pipe));
      const s0 = dir * T.vStep, s1 = dir * MID_NODE, tCut = (SEG - T.vStep) / (MID_NODE - T.vStep);
      trussGroup.add(pipe(webPt(sx, s0, s1, tCut), webPt(sx, s0, s1, 1), T.webR, M.pipe));
    });
  });
  // Üst zikzak: (+W, −2.86) → (−W, 0) → (+W, 2.86)
  trussGroup.add(pipe(new V(T.chordX, T.chordY, -MID_NODE), new V(-T.chordX, T.chordY, 0), T.zigR, M.pipe));
  trussGroup.add(pipe(new V(-T.chordX, T.chordY, 0), new V(T.chordX, T.chordY, MID_NODE), T.zigR, M.pipe));
  addLabel(trussGroup, 'Omurga Ø420', new V(0, -0.35, -2.4));
  addLabel(trussGroup, 'Enine gergi Ø100', new V(-0.2, T.chordY + 0.18, -MID_NODE), 'ax');
  addLabel(trussGroup, 'Üst zikzak Ø70', new V(0.25, T.chordY + 0.18, 2.2), 'ax');
  addLabel(trussGroup, 'V kolu Ø111', new V(-0.55, 1.2, 0));
}

// ---------------------------------------------------------------------------
// 2. ASKI (değişken: tava kotu, tava genişliği)
// ---------------------------------------------------------------------------
const dynGroup = new THREE.Group();
scene.add(dynGroup);
let state = { variant: 'node', h: 2.30, trayW: 500, cable: 25, explode: false };
let lastInfo = null;

// Üst boruyu saran lama kelepçe + kulaklar + M10 + konik boyun; dönen: tij üst ucu Y
function buildClamp(parent, center, memberDir, memberR) {
  const ringIn = memberR + LAMA.gap, ringR = ringIn + LAMA.t;
  const shape = new THREE.Shape();
  shape.absarc(0, 0, ringR, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, ringIn, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(shape, { depth: LAMA.w, bevelEnabled: false, curveSegments: 40 });
  g.translate(0, 0, -LAMA.w / 2);
  const ring = new THREE.Mesh(g, M.band);
  ring.position.copy(center);
  ring.quaternion.setFromUnitVectors(new V(0, 0, 1), memberDir);
  parent.add(ring);
  const up = new V(0, 1, 0);
  const perp = new V().crossVectors(memberDir, up).normalize();
  const basis = new THREE.Matrix4().makeBasis(perp, new V().crossVectors(memberDir, perp).normalize(), memberDir);
  [-1, 1].forEach(e => {
    const p = center.clone().addScaledVector(perp, e * (ringR + 0.014));
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.03, 2 * LAMA.t + 0.002, LAMA.w), M.band);
    ear.position.copy(p);
    ear.quaternion.setFromRotationMatrix(basis);
    parent.add(ear);
    parent.add(pipe(p.clone().setY(p.y + 0.022), p.clone().setY(p.y - 0.022), 0.005, M.dark, 8));
    parent.add(nut(p.x, p.y - 0.014, p.z, 0.0095));
  });
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.009, 0.05, 16), M.steel);
  neck.position.set(center.x, center.y - ringR - 0.025, center.z);
  parent.add(neck);
  parent.add(nut(center.x, center.y - ringR - 0.058, center.z));
  return { rodTop: center.y - ringR - 0.05, bandLen: 2 * Math.PI * (ringIn + LAMA.t / 2) + 2 * 0.03 };
}

// U profil tabla 80×30×3 (gövde üstte, tava tabanına oturur; kanatlar aşağı)
function buildTabla(parent, a, b) {
  const g = new THREE.Group();
  const span = new V().subVectors(b, a);
  const len = Math.hypot(span.x, span.z) + 0.08;
  g.add(box(len, TABLA.t, TABLA.d, M.steel, 0, -TABLA.t / 2, 0));
  [-1, 1].forEach(sz => g.add(box(len, TABLA.h, TABLA.t, M.steel, 0, -TABLA.h / 2, sz * (TABLA.d / 2 - TABLA.t / 2))));
  g.position.set((a.x + b.x) / 2, a.y, (a.z + b.z) / 2);
  g.rotation.y = -Math.atan2(span.z, span.x);
  parent.add(g);
  return len;
}

function buildHanger(s, k, trayBottom, tray) {
  const grp = new THREE.Group();
  const clampG = new THREE.Group(), rodG = new THREE.Group(), tablaG = new THREE.Group();
  grp.add(clampG, rodG, tablaG);
  const armX = tray.w / 2 + 0.04;
  const feet = [];
  let rodLen = 0, bandLen = 0;
  [-1, 1].forEach(sx => {
    const xa = sx * armX;
    let topS = s, memberDir = new V(1, 0, 0), memberR = T.tieR;
    if (k !== null) {
      // Zikzak k = 1: (−W, 0) → (+W, 2.86); tijin x'inde zikzağın geçtiği s
      const zx = -1, n0 = 0, n1 = MID_NODE;
      const u = (1 - xa / (zx * T.chordX)) / 2;
      topS = n0 + u * (n1 - n0);
      memberDir = new V(-2 * zx * T.chordX, 0, n1 - n0).normalize();
      memberR = T.zigR;
    }
    const c = buildClamp(clampG, new V(xa, T.chordY, topS), memberDir, memberR);
    bandLen = c.bandLen;
    const rodBot = trayBottom - TABLA.h - 0.03;
    rodG.add(pipe(new V(xa, c.rodTop, topS), new V(xa, rodBot, topS), TIJ_R, M.dark, 12));
    rodLen = c.rodTop - rodBot;
    tablaG.add(nut(xa, trayBottom + 0.004, topS));
    tablaG.add(nut(xa, trayBottom - TABLA.h - 0.008, topS));
    feet.push(new V(xa, trayBottom, topS));
  });
  const tablaLen = buildTabla(tablaG, feet[0], feet[1]);
  [-1, 1].forEach(sx => tablaG.add(box(0.04, 0.03, 0.06, M.dark, sx * (tray.w / 2 + 0.01), trayBottom - 0.005 + 0.015 + 0.01, s)));
  if (state.explode) { clampG.position.y += 0.22; tablaG.position.y -= 0.22; }
  dynGroup.add(grp);
  return { rodLen, tablaLen, bandLen, rodTopS: feet.map(f => f.z), feet };
}

function rebuild() {
  dynGroup.clear();
  labels.filter(l => l.parent === dynGroup).forEach(l => labels.splice(labels.indexOf(l), 1));
  const tray = TRAYS[state.trayW];
  const tb = T.spineR + state.h;

  // Tava ve kablo demeti
  const trayG = new THREE.Group();
  trayG.name = 'tray';
  const L = 2 * SEG;
  trayG.add(box(tray.w, 0.003, L, M.tray, 0, tb + 0.0015, 0));
  [-1, 1].forEach(sx => trayG.add(box(0.003, tray.h, L, M.tray, sx * (tray.w / 2 - 0.0015), tb + tray.h / 2, 0)));
  const nC = state.cable > 0 ? Math.min(30, Math.max(4, Math.round(state.cable / 1.2))) : 0;
  for (let i = 0; i < nC; i++) {
    const col = i % 10, row = Math.floor(i / 10);
    const x = -tray.w / 2 + 0.04 + col * (tray.w - 0.08) / 9;
    trayG.add(pipe(new V(x, tb + 0.012 + row * 0.024, -SEG), new V(x, tb + 0.012 + row * 0.024, SEG), 0.011, M.cable, 8));
  }
  trayG.visible = document.getElementById('t-tray').checked;
  dynGroup.add(trayG);

  const info = {};
  if (state.variant !== 'mid') info.node = buildHanger(0, null, tb, tray);
  if (state.variant !== 'node') info.mid = buildHanger(MID_HANGER_S, 1, tb, tray);
  lastInfo = info;

  // Etiketler
  const lx = tray.w / 2 + 0.04;
  if (info.node) {
    addLabel(dynGroup, 'Lama kelepçe 50×5 + M10', new V(lx + 0.12, T.chordY + 0.05, 0), 'ax');
    addLabel(dynGroup, `M16 tij · L=${mm(info.node.rodLen)} mm`, new V(lx + 0.08, (T.chordY + tb) / 2, 0));
    addLabel(dynGroup, `U80×30×3 tabla · L=${mm(info.node.tablaLen)} mm`, new V(0, tb - 0.12, 0.05));
  }
  if (info.mid) {
    addLabel(dynGroup, `Ara askı · tabla L=${mm(info.mid.tablaLen)} mm (çapraz)`, new V(0, tb - 0.12, MID_HANGER_S + 0.1));
  }
  addLabel(dynGroup, `Tava ${state.trayW}×${mm(tray.h)} · taban taşıyıcı üstünden ${Math.round(state.h * 100)} cm`, new V(-tray.w / 2 - 0.05, tb + tray.h + 0.08, -2.2));
  // Ölçü çizgisi: taşıyıcı üstü → tava tabanı
  const pts = [new V(-0.9, T.spineR, -1.2), new V(-0.9, tb, -1.2), new V(-0.98, T.spineR, -1.2), new V(-0.82, T.spineR, -1.2), new V(-0.98, tb, -1.2), new V(-0.82, tb, -1.2)];
  dynGroup.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xfbbf24 })));
  labels.filter(l => l.parent === dynGroup).forEach(l => { l.visible = document.getElementById('t-lbl').checked; });
  updatePanel();
}

// ---------------------------------------------------------------------------
// 3. KONTROLLER VE PARÇA LİSTESİ
// ---------------------------------------------------------------------------
function updatePanel() {
  const tray = TRAYS[state.trayW];
  const tb = T.spineR + state.h;
  const cls = (ok) => ok ? 'ok' : 'bad';
  const lines = [];
  const any = lastInfo.node || lastInfo.mid;
  // Tij boyu (kelepçe boynu ile tabla arası serbest boy)
  const freeLen = any.rodLen - TABLA.h - 0.06;
  lines.push(`<div>M16 tij boyu: <b>${mm(any.rodLen)} mm</b> (serbest ${mm(freeLen)} mm) <b class="${cls(freeLen > 0.05)}">${freeLen > 0.05 ? '' : '· tava gergiye çok yakın'}</b></div>`);
  // Tava üstü ↔ gergi altı
  const topGap = (T.chordY - T.tieR) - (tb + tray.h);
  lines.push(`<div>Tava üst kenarı ↔ enine gergi alt yüzü: <b class="${cls(topGap > 0.12)}">${mm(topGap)} mm</b></div>`);
  // Düğüm askısında tabla ucu ↔ V kolu iç yüzü (aynı kesitte)
  const tablaEnd = tray.w / 2 + 0.04 + 0.04;
  const legInner = T.legAxisX(tb - TABLA.h - T.spineR) - T.legR / Math.cos(Math.atan(T.gapSlope / 2));
  lines.push(`<div>Düğüm askısı tabla ucu ↔ V kolu iç yüzü: <b class="${cls(legInner - tablaEnd > 0.03)}">${mm(legInner - tablaEnd)} mm</b></div>`);
  // Yük
  const w = tray.kgm + state.cable;                       // kg/m
  const Fh = w * HANGER_SPACING * G;                      // N / askı
  const Ft = Fh / 2;                                      // N / tij
  lines.push(`<div>Askı başına yük (${tray.kgm} kg/m tava + ${state.cable} kg/m kablo, aralık ${HANGER_SPACING.toFixed(2)} m): <b>${(Fh / 1000).toFixed(2)} kN</b></div>`);
  lines.push(`<div>Tij başına: <b>${(Ft / 1000).toFixed(2)} kN</b> · M16 8.8 çekme ${(M16_TENS / 1000).toFixed(1)} kN → güvenlik <b class="${cls(M16_TENS / Ft > 3)}">${(M16_TENS / Ft).toFixed(0)}×</b></div>`);
  lines.push(`<div>Kelepçe: lama 50×5 ${(LAMA_TENS / 1000).toFixed(1)} kN, M10 8.8 ${(M10_TENS / 1000).toFixed(1)} kN → güvenlik <b class="${cls(M10_TENS / Ft > 3)}">${(Math.min(LAMA_TENS, M10_TENS) / Ft).toFixed(0)}×</b></div>`);
  lines.push(`<div style="color:#94a3b8;margin-top:4px">Ön tahmin; tava öz ağırlığı tahmini, rüzgar ve dinamik etki yok. Statik hesabın yerine geçmez.</div>`);
  document.getElementById('checks').innerHTML = lines.join('');

  // Parça listesi (bir askı): seçili tip; "İkisi"nde düğüm askısı
  const h = lastInfo.node || lastInfo.mid;
  const tijLen = Math.ceil(h.rodLen * 100) / 100;
  const bandKg = h.bandLen * LAMA.w * LAMA.t * STEEL;
  const neckKg = Math.PI * 0.05 / 3 * (0.018 ** 2 + 0.018 * 0.009 + 0.009 ** 2) * STEEL;
  const tablaKg = h.tablaLen * (TABLA.d + 2 * TABLA.h) * TABLA.t * STEEL;
  const rows = [
    [`Lama kelepçe 50×5, L=${mm(h.bandLen)} (kıvrık kulaklı)`, 2, bandKg],
    ['Cıvata M10×45 8.8 + somun (kulak)', 4, 0.045],
    ['Konik boyun Ø36/Ø18, h=50', 2, neckKg],
    [`M16 dişli tij 8.8, L=${mm(tijLen)}`, 2, 1.58 * tijLen],
    ['M16 somun (boyun altı + tabla üstü/altı)', 6, 0.034],
    ['M16 pul', 4, 0.011],
    [`U profil tabla 80×30×3, L=${mm(h.tablaLen)}${lastInfo.node ? '' : ' (çapraz)'}`, 1, tablaKg],
    ['Tava tespit çenesi', 2, 0.08]
  ];
  let tot = 0;
  document.getElementById('bom').innerHTML = rows.map(([n, q, kg]) => { tot += q * kg; return `<tr><td>${n}</td><td class="n">${q} ad.</td><td class="n">${(q * kg).toFixed(2)} kg</td></tr>`; }).join('')
    + `<tr><td><b>Bir askı</b></td><td></td><td class="n"><b>${tot.toFixed(1)} kg</b></td></tr>`;

  // Adetler
  let sN = 0, sM = 0;
  const qRows = QTY.map(([a, n, m]) => { sN += n; sM += m; return `<tr><td>${a}</td><td class="n">${n}</td><td class="n">${m}</td><td class="n">${n + m}</td></tr>`; }).join('');
  const all = sN + sM;
  document.getElementById('qty').innerHTML = `<tr><th>Alan</th><th class="n">Düğüm</th><th class="n">Ara</th><th class="n">Toplam</th></tr>${qRows}`
    + `<tr><td><b>Toplam</b></td><td class="n"><b>${sN}</b></td><td class="n"><b>${sM}</b></td><td class="n"><b>${all}</b></td></tr>`
    + `<tr><td colspan="4" style="color:#94a3b8">${all * 2} tij, ${all * 2} lama kelepçe, ${all * 4} M10, ${all * 6} M16 somun, ${all} tabla. Kot ${Math.round(state.h * 100)} cm'de toplam tij ≈ ${(all * 2 * tijLen).toFixed(0)} m.</td></tr>`;
}

// ---------------------------------------------------------------------------
// 4. ARAYÜZ
// ---------------------------------------------------------------------------
const elH = document.getElementById('h'), elCable = document.getElementById('cable');
function sync() {
  state.h = +elH.value / 100;
  state.cable = +elCable.value;
  state.explode = document.getElementById('t-exp').checked;
  document.getElementById('v-h').textContent = `${elH.value} cm`;
  document.getElementById('v-cable').textContent = `${state.cable} kg/m`;
  rebuild();
}
elH.addEventListener('input', sync);
elCable.addEventListener('input', sync);
document.getElementById('t-exp').addEventListener('change', sync);
document.getElementById('t-tray').addEventListener('change', e => { const t = dynGroup.getObjectByName('tray'); if (t) t.visible = e.target.checked; });
document.getElementById('t-truss').addEventListener('change', e => { trussGroup.visible = e.target.checked; });
document.getElementById('t-lbl').addEventListener('change', e => { labels.forEach(l => { l.visible = e.target.checked; }); });
document.querySelectorAll('#variant button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('#variant button').forEach(x => x.classList.toggle('on', x === b));
  state.variant = b.dataset.v;
  rebuild();
}));
document.querySelectorAll('#tray button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('#tray button').forEach(x => x.classList.toggle('on', x === b));
  state.trayW = +b.dataset.w;
  rebuild();
}));

const target = new V(0, 2.4, 0.6);
const VIEWS = {
  iso: new V(-4.6, 4.6, 4.6),
  front: new V(0, 2.4, 6.5),
  side: new V(6.5, 2.4, 0.6),
  top: new V(0, 9.0, 0.601)
};
function setView(name) {
  if (name === 'clamp') {
    // Düğüm askısının sağ kelepçesi: aşıklar arasından, makas boyunca bakış
    const p = new V(0.29, T.chordY - 0.08 + (state.explode ? 0.11 : 0), 0);
    controls.target.copy(p);
    camera.position.copy(p).add(new V(-0.20, 0.32, 0.70));
  } else {
    camera.position.copy(VIEWS[name]);
    controls.target.copy(target);
  }
  controls.update();
}
document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));

window.addEventListener('resize', () => {
  camera.aspect = view.clientWidth / view.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(view.clientWidth, view.clientHeight);
  labelRenderer.setSize(view.clientWidth, view.clientHeight);
});

setView('iso');
sync();
renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
});

// Tarayıcı konsolundan inceleme için
window.tavaAski = { scene, trussGroup, dynGroup, state, info: () => lastInfo };
