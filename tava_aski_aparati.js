// Çatı makası kablo tavası tij askısı: ayrı 3D çalışma alanı (tava_aski_aparati.html)
// Makas ölçüleri main.js REF_TRUSS ile aynı. Askı (kullanıcı tarifi + kelepçe görseli, 2026-11-15):
// üst boruyu saran iki parçalı kelepçe (yanlarda kulak + M10), alt yarıda kaynaklı delikli kulak (M12),
// kulaktan inen M12 dişli tij, iki tij arasında tava taşıyıcısı 40×40 U profil (tava kenarı çenesi / takoz yok).
// Çatı borusunda delme / kaynak yok (Kalıcı karar). Ana modeldeki (main.js) askı eski halinde.
//
// Koordinatlar (m): makas yerel ekseni. Z = makas boyunca s, Y = omurga ekseninden yukarı, X = enine.
// Düğüm askısı s = 0'daki V istasyonunda, ara askı s = 1.43'te (düğüm ile ara üst düğümün ortası).

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { enableWasd } from './aparat_wasd.js';

// ---------------------------------------------------------------------------
// ÖLÇÜLER (main.js REF_TRUSS ile aynı; askının asıldığı üst borular sahadan, 2026-11-02)
// ---------------------------------------------------------------------------
const T = (() => {
  const spineR = 1.32 / Math.PI / 2;                       // Ø420 (132 cm çevre)
  const gapSlope = 0.438, gapAt0 = 0.039, legR = 0.35 / Math.PI / 2;
  const legAxisX = h => (gapSlope * h + gapAt0) / 2 + legR / Math.cos(Math.atan(gapSlope / 2));
  const chordY = spineR + 3.00 + 0.08;                     // 300 cm iç yükseklik
  return {
    spineR, gapSlope, gapAt0, legR, legAxisX, chordY, chordR: 0.08, chordX: legAxisX(chordY - spineR),
    baseX: legAxisX(0), webR: 0.70 / Math.PI / 2, vStep: 5.72,
    // Kullanıcı saha ölçüsü (çevre): düz enine gergi 36 cm → Ø115, çapraz (üst zikzak) 70 cm → Ø223
    tieR: 0.36 / Math.PI / 2, zigR: 0.70 / Math.PI / 2
  };
})();
const MID_NODE = T.vStep / 2;          // ara üst düğüm (2.86)
const MID_HANGER_S = MID_NODE / 2;     // ara askı (1.43)
const HANGER_SPACING = T.vStep / 4;    // askı aralığı ≈ 1.43 m
const LAMA = { w: 0.05, t: 0.005, felt: 0.005 }; // 50×5 lama bant, boruyla arasında 5 mm keçe
const TIJ_R = 0.006;                   // M12 dişli tij (kullanıcı, 2026-11-15)
const TIJ_LEN = 0.80;                  // Kullanıcı isteği: tij boyu 80 cm (fazlası U profilin altından taşar)
const NUT_R = 0.011, NUT_H = 0.010;    // M12 somun
// Kelepçe altındaki kaynaklı U parça (saha fotoğrafları, 2026-11-15): lamadan bükülmüş, iki ucu çembere kaynaklı,
// boru ekseni yönünde açık; alt yüzünde Ø13 delik, M12 tij buradan geçer. Ölçüler fotoğraf oranından (varsayım).
const BOSS = { w: 0.045, d: 0.04, t: 0.005 };
const EAR_GAP = 0.004;                 // iki kelepçe yarısı arasındaki sıkma boşluğu
// Tava taşıyıcısı: 40×40 U profil (et 3 mm varsayım), açık tarafı yana bakar (tava üst kanada oturur). Düz askıda
// 70 cm, çapraz askıda iki tij ayağını kapsayan 10 cm katı boy. Üst kanatta her 10 cm'de M8 deliği (Ø9), tij Ø14.
const TABLA = { w: 0.04, hgt: 0.04, t: 0.003, nodeLen: 0.70, pitch: 0.10, m8D: 0.009, tijD: 0.014 };
const STEEL = 7850, G = 9.81;
const TRAYS = {
  500: { w: 0.50, h: 0.20, kgm: 9.0 },   // tava öz ağırlığı (galvaniz delikli, kapaksız, tahmini)
  300: { w: 0.30, h: 0.10, kgm: 5.0 }   // Kullanıcı: yalnızca 500×200 ve 300×100 tava kullanılıyor
};
const M12_TENS = 0.9 * 800 * 84.3 / 1.25;  // N, 8.8 çekme dayanımı (Ft,Rd)
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
  cable: new THREE.MeshStandardMaterial({ color: 0x141619, metalness: 0.2, roughness: 0.7 }),
  felt: new THREE.MeshStandardMaterial({ color: 0x3f3f46, metalness: 0.0, roughness: 0.95 })
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
function nut(x, y, z, size = NUT_R, mat = M.dark) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(size, size, size * 0.9, 6), mat);
  m.position.set(x, y, z);
  return m;
}
// Tij bağlantı takımı (kullanıcı, 2026-11-15: "somun pul ve rondela da koy, en altta 2 somun olacak"):
// yüzeyden dir yönünde (+1 yukarı, −1 aşağı) pul → (yaylı rondela) → n somun. Dönen: takımın uç kotu
const PUL = { r: 0.012, h: 0.0025 }, RONDELA = { r: 0.010, h: 0.003 };
function nutStack(parent, x, yFace, z, dir, spring = false, nuts = 1) {
  let y = yFace;
  const disc = (w, mat) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(w.r, w.r, w.h, 20), mat);
    m.position.set(x, y + dir * w.h / 2, z);
    parent.add(m);
    y += dir * w.h;
  };
  disc(PUL, M.band);
  if (spring) disc(RONDELA, M.accent);
  for (let i = 0; i < nuts; i++) { parent.add(nut(x, y + dir * NUT_H / 2, z)); y += dir * NUT_H; }
  return y;
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
  addLabel(trussGroup, 'Enine gergi Ø115 (36 cm çevre)', new V(-0.2, T.chordY + 0.18, -MID_NODE), 'ax');
  addLabel(trussGroup, 'Üst zikzak Ø223 (70 cm çevre)', new V(0.25, T.chordY + 0.18, 2.2), 'ax');
  addLabel(trussGroup, 'V kolu Ø111', new V(-0.55, 1.2, 0));
}

// ---------------------------------------------------------------------------
// 2. ASKI (değişken: tava kotu, tava genişliği)
// ---------------------------------------------------------------------------
const dynGroup = new THREE.Group();
scene.add(dynGroup);
// Kablo yükü seçeneği kaldırıldı (2026-11-02); sabit değer yük hesabında ve tavadaki kablo görselinde kullanılır
const CABLE_KGM = 25;
let state = { variant: 'node', h: 2.30, trayW: 500, cable: CABLE_KGM, explode: false };
let lastInfo = null;

// Üst boruyu saran lama kelepçe + kulaklar + M10 + konik boyun; dönen: tij üst ucu Y
function buildClamp(parent, center, memberDir, memberR) {
  // Kullanıcı isteği (2026-11-02): "keçeyi de unutma askılarda" → boru ile lama bant arasında 5 mm keçe,
  // bandın iki yanından 5'er mm taşar (sürtünme yüzeyinde korozyonu önler; Matsing askısıyla aynı)
  const feltIn = memberR, feltOut = memberR + LAMA.felt;
  const feltShape = new THREE.Shape();
  feltShape.absarc(0, 0, feltOut, 0, Math.PI * 2, false);
  const feltHole = new THREE.Path();
  feltHole.absarc(0, 0, feltIn, 0, Math.PI * 2, true);
  feltShape.holes.push(feltHole);
  const fg = new THREE.ExtrudeGeometry(feltShape, { depth: LAMA.w + 0.01, bevelEnabled: false, curveSegments: 40 });
  fg.translate(0, 0, -(LAMA.w + 0.01) / 2);
  const felt = new THREE.Mesh(fg, M.felt);
  felt.position.copy(center);
  felt.quaternion.setFromUnitVectors(new V(0, 0, 1), memberDir);
  parent.add(felt);

  // İki parçalı kelepçe (kullanıcı görseli, 2026-11-15): üst ve alt yarım çember, yanlarda dışa kıvrık kulaklar
  // M10 ile sıkılır; alt yarının en altında kaynaklı delikli U parça, M12 tij buradan aşağı iner.
  const ringIn = feltOut, ringR = ringIn + LAMA.t;
  const up = new V(0, 1, 0);
  const perp = new V().crossVectors(memberDir, up).normalize();
  // Yerel eksenler: X = yana (kulak yönü), Y = aşağı, Z = boru ekseni
  const basis = new THREE.Matrix4().makeBasis(perp, new V().crossVectors(memberDir, perp).normalize(), memberDir);
  const ga = Math.asin(EAR_GAP / 2 / ringIn);
  [0, Math.PI].forEach(a0 => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, ringR, a0 + ga, a0 + Math.PI - ga, false);
    shape.absarc(0, 0, ringIn, a0 + Math.PI - ga, a0 + ga, true);
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: LAMA.w, bevelEnabled: false, curveSegments: 40 });
    g.translate(0, 0, -LAMA.w / 2);
    const half = new THREE.Mesh(g, M.band);
    half.position.copy(center);
    half.quaternion.setFromRotationMatrix(basis);
    parent.add(half);
  });
  [-1, 1].forEach(e => {
    const p = center.clone().addScaledVector(perp, e * (ringR + 0.014));
    [-1, 1].forEach(v => {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.03, LAMA.t, LAMA.w), M.band);
      ear.position.copy(p).setY(p.y + v * (EAR_GAP + LAMA.t) / 2);
      ear.quaternion.setFromRotationMatrix(basis);
      parent.add(ear);
    });
    parent.add(pipe(p.clone().setY(p.y + 0.022), p.clone().setY(p.y - 0.022), 0.005, M.dark, 8));
    parent.add(nut(p.x, p.y + 0.012, p.z, 0.0095));
    parent.add(nut(p.x, p.y - 0.014, p.z, 0.0095));
  });
  // Kaynaklı U parça: iki düşey bacak + delikli alt yüz; tij alt yüzden geçer, içte ve altta somun
  const q = new THREE.Quaternion().setFromRotationMatrix(basis);
  const botY = center.y - ringR - BOSS.d;            // U parçanın alt yüzü
  const legTop = center.y - ringR + 0.004, legH = legTop - botY;
  [-1, 1].forEach(e => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(BOSS.t, legH, LAMA.w), M.band);
    leg.position.copy(center).addScaledVector(perp, e * (BOSS.w - BOSS.t) / 2).setY(botY + legH / 2);
    leg.quaternion.copy(q);
    parent.add(leg);
  });
  const plateShape = new THREE.Shape();
  plateShape.moveTo(-BOSS.w / 2, -LAMA.w / 2);
  plateShape.lineTo(BOSS.w / 2, -LAMA.w / 2);
  plateShape.lineTo(BOSS.w / 2, LAMA.w / 2);
  plateShape.lineTo(-BOSS.w / 2, LAMA.w / 2);
  plateShape.closePath();
  const ph = new THREE.Path();
  ph.absarc(0, 0, 0.0065, 0, Math.PI * 2, true);
  plateShape.holes.push(ph);
  const pg = new THREE.ExtrudeGeometry(plateShape, { depth: BOSS.t, bevelEnabled: false, curveSegments: 16 });
  pg.rotateX(Math.PI / 2); // yerel: X = yana, Z = boru ekseni, kalınlık aşağı
  const plate = new THREE.Mesh(pg, M.band);
  plate.position.set(center.x, botY + BOSS.t, center.z);
  plate.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(perp, up, new V().crossVectors(perp, up)));
  parent.add(plate);
  const inTop = nutStack(parent, center.x, botY + BOSS.t, center.z, 1); // U parçanın içinde: pul + taşıyıcı somun
  nutStack(parent, center.x, botY, center.z, -1, true);                 // altta: pul + rondela + kontra somun
  return { rodTop: inTop + 0.004, bandLen: Math.PI * (ringIn + LAMA.t / 2) + 2 * 0.03 };
}

// Tava taşıyıcısı 40×40 U profil: açık tarafı yana bakar, üst kanadı tava tabanında. Boy: verilen sabit boy (düz askı 70 cm)
// ya da iki tij ayağını kapsayan 10 cm katı (çapraz askı). Sırtta her 10 cm'de Ø9 (M8) delik, tij geçişlerinde
// Ø14 delik; tij deliğine 3 cm'den yakın M8 deliği açılmaz. Dönen: { len, m8 (delik sayısı) }
function buildTabla(parent, a, b, fixedLen) {
  const span = new V().subVectors(b, a);
  const footDist = Math.hypot(span.x, span.z);
  const len = fixedLen || Math.ceil((footDist + 0.10) / TABLA.pitch - 1e-6) * TABLA.pitch;
  const shape = new THREE.Shape();
  shape.moveTo(-len / 2, -TABLA.w / 2);
  shape.lineTo(len / 2, -TABLA.w / 2);
  shape.lineTo(len / 2, TABLA.w / 2);
  shape.lineTo(-len / 2, TABLA.w / 2);
  shape.closePath();
  const tijX = [-footDist / 2, footDist / 2];
  tijX.forEach(x => { const h = new THREE.Path(); h.absarc(x, 0, TABLA.tijD / 2, 0, Math.PI * 2, true); shape.holes.push(h); });
  let m8 = 0;
  const nHoles = Math.round(len / TABLA.pitch);
  for (let i = 0; i < nHoles; i++) {
    const x = -len / 2 + TABLA.pitch / 2 + i * TABLA.pitch;
    if (tijX.some(t => Math.abs(t - x) < 0.03)) continue;
    const h = new THREE.Path(); h.absarc(x, 0, TABLA.m8D / 2, 0, Math.PI * 2, true); shape.holes.push(h);
    m8++;
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth: TABLA.t, bevelEnabled: false, curveSegments: 16 });
  g.rotateX(Math.PI / 2); // kalınlık aşağı: y 0 → −t
  const m = new THREE.Group();
  m.add(new THREE.Mesh(g, M.steel));
  // Kullanıcı (2026-11-15): "U'nun açık tarafı yana bakacak" → delikli üst kanat + alt kanat + düşey sırt;
  // tij iki kanattan geçer, somunlar üst kanadın üstünde ve alt kanadın altında
  m.add(box(len, TABLA.t, TABLA.w, M.steel, 0, -TABLA.hgt + TABLA.t / 2, 0));
  m.add(box(len, TABLA.hgt - 2 * TABLA.t, TABLA.t, M.steel, 0, -TABLA.hgt / 2, -(TABLA.w - TABLA.t) / 2));
  m.position.set((a.x + b.x) / 2, a.y, (a.z + b.z) / 2);
  m.rotation.y = -Math.atan2(span.z, span.x);
  parent.add(m);
  return { len, m8 };
}

function buildHanger(s, k, trayBottom, tray) {
  const grp = new THREE.Group();
  const clampG = new THREE.Group(), rodG = new THREE.Group(), tablaG = new THREE.Group();
  grp.add(clampG, rodG, tablaG);
  const armX = tray.w / 2 + 0.04;
  const feet = [];
  let need = 0, bandLen = 0;
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
    bandLen = Math.max(bandLen, c.bandLen);
    // 80 cm tij: üst ucu kelepçe kulağında; U profil sırtının altında somun + 1 cm diş payı gerekli, fazlası aşağı taşar
    // U profil üstünde pul + somun; en altta pul + rondela + 2 somun
    nutStack(tablaG, xa, trayBottom, topS, 1);
    const stackBot = nutStack(tablaG, xa, trayBottom - TABLA.hgt, topS, -1, true, 2);
    need = Math.max(need, c.rodTop - (stackBot - 0.01));
    rodG.add(pipe(new V(xa, c.rodTop, topS), new V(xa, c.rodTop - TIJ_LEN, topS), TIJ_R, M.dark, 12));
    feet.push(new V(xa, trayBottom, topS));
  });
  const tb = buildTabla(tablaG, feet[0], feet[1], k === null ? TABLA.nodeLen : null);
  // Tava kenarı tespit çeneleri (takoz) kaldırıldı: kullanıcı kullanmayacak (2026-11-15)
  if (state.explode) { clampG.position.y += 0.22; tablaG.position.y -= 0.22; }
  dynGroup.add(grp);
  return { need, tablaLen: tb.len, m8: tb.m8, bandLen, memberR: k === null ? T.tieR : T.zigR, feet };
}

function rebuild() {
  // Önceki etiketleri listeden çıkar (dynGroup temizlenince ebeveynleri kaybolur)
  dynGroup.traverse(o => { const i = labels.indexOf(o); if (i >= 0) labels.splice(i, 1); });
  dynGroup.clear();
  const tray = TRAYS[state.trayW];
  const tb = T.spineR + state.h;

  // Tava ve kablo demeti
  const trayG = new THREE.Group();
  trayG.name = 'tray';
  const L = 2 * SEG;
  trayG.add(box(tray.w, 0.003, L, M.tray, 0, tb + 0.0015, 0));
  [-1, 1].forEach(sx => trayG.add(box(0.003, tray.h, L, M.tray, sx * (tray.w / 2 - 0.0015), tb + tray.h / 2, 0)));
  const nC = tray.h > 0.15 ? 20 : 10; // 2 sıra kablo (alçak tavada tek sıra)
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
  addLabel(dynGroup, `M12 tij · L=${mm(TIJ_LEN)} mm`, new V(lx + 0.08, (T.chordY + tb) / 2, info.node ? 0 : MID_HANGER_S));
  if (info.node) {
    addLabel(dynGroup, 'İki parçalı kelepçe Ø115 (36 cm çevre) + keçe · altında kaynaklı delikli U (M12)', new V(lx + 0.12, T.chordY + 0.08, 0), 'ax');
    addLabel(dynGroup, `U profil 40×40 · L=${mm(info.node.tablaLen)} mm`, new V(0, tb - 0.12, 0.05));
  }
  if (info.mid) {
    addLabel(dynGroup, 'İki parçalı kelepçe Ø223 (70 cm çevre) + keçe · altında kaynaklı delikli U (M12)', new V(lx + 0.12, T.chordY + 0.08, MID_HANGER_S + 0.35), 'ax');
    addLabel(dynGroup, `Çapraz askı · U profil 40×40 · L=${mm(info.mid.tablaLen)} mm`, new V(0, tb - 0.12, MID_HANGER_S + 0.1));
  }
  addLabel(dynGroup, `Tava ${state.trayW}×${mm(tray.h)} · taban taşıyıcı üstünden ${Math.round(state.h * 100)} cm`, new V(-tray.w / 2 - 0.05, tb + tray.h + 0.08, -2.2));
  // Ölçü çizgisi: taşıyıcı üstü → tava tabanı
  const pts = [new V(-0.9, T.spineR, -1.2), new V(-0.9, tb, -1.2), new V(-0.98, T.spineR, -1.2), new V(-0.82, T.spineR, -1.2), new V(-0.98, tb, -1.2), new V(-0.82, tb, -1.2)];
  dynGroup.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xfbbf24 })));
  dynGroup.traverse(o => { if (labels.includes(o)) o.visible = document.getElementById('t-lbl').checked; });
  updatePanel();
}

// ---------------------------------------------------------------------------
// 3. KONTROLLER VE PARÇA LİSTESİ
// ---------------------------------------------------------------------------
function updatePanel() {
  // Kontroller / parça listesi / adet bölümleri sayfadan kaldırıldı (2026-11-02); hesaplar geri eklenirse çalışır
  if (!document.getElementById('checks')) return;
  const tray = TRAYS[state.trayW];
  const tb = T.spineR + state.h;
  const cls = (ok) => ok ? 'ok' : 'bad';
  const lines = [];
  // 80 cm tij yetiyor mu; tablanın altından ne kadar taşıyor
  [['Düz', lastInfo.node], ['Çapraz', lastInfo.mid]].filter(x => x[1]).forEach(([n, h]) => {
    const extra = TIJ_LEN - h.need;
    lines.push(`<div>${n} askı: 800 mm tij ${extra >= 0 ? `tabla altı somundan <b>${mm(extra)} mm</b> taşar` : `<b class="bad">${mm(-extra)} mm kısa</b>`} (gereken ${mm(h.need)} mm)</div>`);
  });
  const topGap = (T.chordY - T.tieR) - (tb + tray.h);
  lines.push(`<div>Tava üst kenarı ↔ enine gergi alt yüzü: <b class="${cls(topGap > 0.12)}">${mm(topGap)} mm</b></div>`);
  // Düz askı (V istasyonunda): 70 cm lama ucu ↔ V kolu iç yüzü
  const tablaEnd = TABLA.nodeLen / 2;
  const legInner = T.legAxisX(tb - TABLA.t - T.spineR) - T.legR / Math.cos(Math.atan(T.gapSlope / 2));
  lines.push(`<div>Düz askı alt lama ucu ↔ V kolu iç yüzü: <b class="${cls(legInner - tablaEnd > 0.03)}">${mm(legInner - tablaEnd)} mm</b></div>`);
  const w = tray.kgm + state.cable;                       // kg/m
  const Fh = w * HANGER_SPACING * G;                      // N / askı
  const Ft = Fh / 2;                                      // N / tij
  lines.push(`<div>Askı başına yük (${tray.kgm} kg/m tava + ${state.cable} kg/m kablo, aralık ${HANGER_SPACING.toFixed(2)} m): <b>${(Fh / 1000).toFixed(2)} kN</b></div>`);
  lines.push(`<div>Tij başına: <b>${(Ft / 1000).toFixed(2)} kN</b> · M12 8.8 çekme ${(M12_TENS / 1000).toFixed(1)} kN → güvenlik <b class="${cls(M12_TENS / Ft > 3)}">${(M12_TENS / Ft).toFixed(0)}×</b></div>`);
  lines.push(`<div>Kelepçe: lama 50×5 ${(LAMA_TENS / 1000).toFixed(1)} kN, M10 8.8 ${(M10_TENS / 1000).toFixed(1)} kN → güvenlik <b class="${cls(M10_TENS / Ft > 3)}">${(Math.min(LAMA_TENS, M10_TENS) / Ft).toFixed(0)}×</b></div>`);
  lines.push(`<div style="color:#94a3b8;margin-top:4px">Ön tahmin; tava öz ağırlığı tahmini, rüzgar ve dinamik etki yok. Statik hesabın yerine geçmez.</div>`);
  document.getElementById('checks').innerHTML = lines.join('');

  // Parça listesi: düz ve çapraz askı ayrı
  const uKgm = (TABLA.w + 2 * (TABLA.hgt - TABLA.t)) * TABLA.t * STEEL;
  const kitRows = (h, name) => {
    const bandKg = h.bandLen * LAMA.w * LAMA.t * STEEL;
    return [
      [`Kelepçe yarısı 50×5, L=${mm(h.bandLen)} (Ø${mm(h.memberR * 2)} boru, kıvrık kulaklı)`, 4, bandKg],
      ['Cıvata M10×45 8.8 + somun (kulak)', 4, 0.045],
      ['Kaynaklı delikli U parça 50×5 (kelepçe altı, Ø13 delik)', 2, (BOSS.w + 2 * BOSS.d) * LAMA.w * BOSS.t * STEEL],
      [`M12 dişli tij 8.8, L=${mm(TIJ_LEN)}`, 2, 0.89 * TIJ_LEN],
      ['M12 somun (kelepçe U parçası içi/altı + U profil üstü + en altta çift)', 10, 0.016],
      ['M12 pul', 8, 0.006],
      ['M12 yaylı rondela', 4, 0.004],
      [`U profil 40×40×3, L=${mm(h.tablaLen)}, ${h.m8}×Ø9 (M8) + 2×Ø14 delik${name === 'Çapraz' ? ' (çapraz)' : ''}`, 1, h.tablaLen * uKgm]
    ];
  };
  const kits = [];
  if (lastInfo.node) kits.push(['Düz askı (enine gergiden)', lastInfo.node, 'Düz']);
  if (lastInfo.mid) kits.push(['Çapraz askı (zikzaktan)', lastInfo.mid, 'Çapraz']);
  const kitKg = {};
  document.getElementById('bom').innerHTML = kits.map(([title, h, name]) => {
    let tot = 0;
    const body = kitRows(h, name).map(([n, q, kg]) => { tot += q * kg; return `<tr><td>${n}</td><td class="n">${q} ad.</td><td class="n">${(q * kg).toFixed(2)} kg</td></tr>`; }).join('');
    kitKg[name] = tot;
    return `<tr><th colspan="3">${title}</th></tr>${body}<tr><td><b>Bir askı</b></td><td></td><td class="n"><b>${tot.toFixed(1)} kg</b></td></tr>`;
  }).join('');

  // Adetler
  let sN = 0, sM = 0;
  const qRows = QTY.map(([a, n, m]) => { sN += n; sM += m; return `<tr><td>${a}</td><td class="n">${n}</td><td class="n">${m}</td><td class="n">${n + m}</td></tr>`; }).join('');
  const all = sN + sM;
  const m8Tot = (lastInfo.node ? lastInfo.node.m8 * sN : 0) + (lastInfo.mid ? lastInfo.mid.m8 * sM : 0);
  document.getElementById('qty').innerHTML = `<tr><th>Alan</th><th class="n">Düz</th><th class="n">Çapraz</th><th class="n">Toplam</th></tr>${qRows}`
    + `<tr><td><b>Toplam</b></td><td class="n"><b>${sN}</b></td><td class="n"><b>${sM}</b></td><td class="n"><b>${all}</b></td></tr>`
    + `<tr><td colspan="4" style="color:#94a3b8">${all * 2} tij (800 mm, toplam ${(all * 2 * TIJ_LEN).toFixed(0)} m), ${all * 2} iki parçalı kelepçe, ${all * 4} M10, ${all * 6} M12 somun, ${sN} adet 700 mm ve ${sM} adet ${lastInfo.mid ? mm(lastInfo.mid.tablaLen) : '–'} mm U profil${state.variant === 'both' ? `, ${m8Tot} M8` : ''}.${state.variant !== 'both' ? ' M8 toplamı için "İkisi"ni seçin.' : ''}</td></tr>`;
}

// ---------------------------------------------------------------------------
// 4. ARAYÜZ
// ---------------------------------------------------------------------------
const elH = document.getElementById('h');
function sync() {
  state.h = +elH.value / 100;
  state.explode = document.getElementById('t-exp').checked;
  document.getElementById('v-h').textContent = `${elH.value} cm`;
  rebuild();
}
elH.addEventListener('input', sync);
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
  if (name === 'lama') {
    // Düz askının U profili: üstten-yandan bakış
    const p = new V(0, T.spineR + state.h - (state.explode ? 0.22 : 0), 0);
    controls.target.copy(p);
    camera.position.copy(p).add(new V(0.35, 0.55, 0.75));
    controls.update();
    return;
  }
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
// WASD serbest gezinme (aparat_wasd.js): kamera ve dönme merkezi birlikte kayar
const wasdUpdate = enableWasd(camera, controls);
const wasdClock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  wasdUpdate(wasdClock.getDelta());
  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
});

// Tarayıcı konsolundan inceleme için
window.tavaAski = { scene, camera, controls, renderer, trussGroup, dynGroup, state, info: () => lastInfo };
