// Matsing MS-MBA-4.4.2-F4-H2-L2 için tek kollu, 2 eksenli çatı taşıyıcısı askı aparatı.
// Ana uygulamadan (main.js) bağımsız çalışma alanı: matsing_montaj_aparati.html
//
// Koordinatlar (m): taşıyıcı boru ekseni Z boyunca, Y = 0'da. Azimut 0° iken anten +X'e bakar.
// Eksen 1 (azimut): bağlantı plakası altındaki döner flanş, düşey eksen.
// Eksen 2 (tilt):   iniş borusunun ucundaki çatal mafsal, yatay pim (azimut çerçevesinde Z ekseni).
// Taşıyıcıya delme/kaynak yok: eyer + 50 mm lama çember kelepçe (bkz. AJAN_DEVIR.md Kalıcı Kararlar).

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// ---------------------------------------------------------------------------
// ÖLÇÜLER
// ---------------------------------------------------------------------------
const CARRIER_R = 1.32 / Math.PI / 2;      // Saha çevre ölçüsü 132 cm → Ø420

// Anten (MS-MBA-4.4.2-F4-H2-L2 çizimi, Rev1.0 mm)
const ANT = {
  H: 1.637,               // yükseklik
  W: 0.6195,              // genişlik
  bodyD: 0.6417,          // arka panelden ön radoma
  backW: 0.4099,          // arka panel genişliği
  frontDia: 0.4696,       // ön radom çapı
  bracketStandoff: 0.054, // arka panelden braket sele tepesine
  bracketPitch: 1.397,    // üst-alt braket ekseni arası
  bracketFromBottom: 0.104,
  bracketW: 0.165,
  clampPlateW: 0.2318,
  rodPitch: 0.135,        // M12 x 200 saplama aralığı
  mass: 51.5,             // kg, braketle
  windFront: 686,         // N @150 km/h
  windLat: 930
};

const SADDLE_T = 0.010;
const SADDLE_L = 0.50;
const BAND_W = 0.050, BAND_T = 0.006;
const BAND_Z = [-0.18, 0.18];
const PLATE_TOP = -0.305, PLATE_T = 0.015;
const FLANGE_R = 0.13, FLANGE_T = 0.015;
const FIX_FLANGE_TOP = PLATE_TOP - PLATE_T;            // -0.320
const ROT_FLANGE_TOP = FIX_FLANGE_TOP - FLANGE_T - 0.002; // -0.337
const ROT_FLANGE_BOT = ROT_FLANGE_TOP - FLANGE_T;      // -0.352

const DROP_PIPE = { D: 0.1143, t: 0.006 };   // Ø114.3 x 6.0
const MAST_PIPE = { D: 0.0761, t: 0.004, L: 1.60 }; // Ø76.1 x 4.0 (Matsing: Ø61–114)
const MAST_X = 0.32;                          // tilt pimi → anten direği ekseni
const CLEVIS_TOP = 0.0975;                    // pim üstünden çatal üst kenarı
const TILT_SLOT_R = 0.075;                    // kilit cıvatası yarıçapı
const TILT_MIN = -10, TILT_MAX = 20;          // + aşağı (downtilt)

const STEEL_DENSITY = 7850;

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
sun.position.set(3, 5, 4);
scene.add(sun);

const camera = new THREE.PerspectiveCamera(40, view.clientWidth / view.clientHeight, 0.01, 100);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const grid = new THREE.GridHelper(6, 30, 0x334155, 0x1e293b);
grid.position.y = -3.4;
scene.add(grid);

// Malzemeler
const M = {
  carrier: new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.2, roughness: 0.5 }),
  galv: new THREE.MeshStandardMaterial({ color: 0xb8c4cc, metalness: 0.8, roughness: 0.35 }),
  plate: new THREE.MeshStandardMaterial({ color: 0x9aa8b4, metalness: 0.75, roughness: 0.4 }),
  band: new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.85, roughness: 0.3 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.45 }),
  accent: new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.3, roughness: 0.5 }),
  axis: new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.2, roughness: 0.5 }),
  radome: new THREE.MeshStandardMaterial({ color: 0xb7b09c, metalness: 0.1, roughness: 0.6 }),
  antPanel: new THREE.MeshStandardMaterial({ color: 0xa3abb3, metalness: 0.7, roughness: 0.4 }),
  cap: new THREE.MeshStandardMaterial({ color: 0xc9ccd1, metalness: 0.4, roughness: 0.5 })
};

// ---------------------------------------------------------------------------
// YARDIMCILAR
// ---------------------------------------------------------------------------
function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

// Y ekseni boyunca silindir; a → b arasına yerleştirir
function rod(r, a, b, mat, seg = 24) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, dir.length(), seg), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

function nut(size, axis, mat = M.dark) {
  const g = new THREE.CylinderGeometry(size, size, size * 0.9, 6);
  if (axis === 'x') g.rotateZ(Math.PI / 2);
  if (axis === 'z') g.rotateX(Math.PI / 2);
  return new THREE.Mesh(g, mat);
}

// Z ekseni etrafında halka dilimi (a0 → a1, saat yönünün tersi), Z boyunca w genişlik
function ringSector(rIn, rOut, a0, a1, w, mat) {
  const s = new THREE.Shape();
  s.absarc(0, 0, rOut, a0, a1, false);
  s.absarc(0, 0, rIn, a1, a0, true);
  const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false, curveSegments: 48 });
  g.translate(0, 0, -w / 2);
  return new THREE.Mesh(g, mat);
}

function label(text, cls = '') {
  const el = document.createElement('div');
  el.className = 'lbl ' + cls;
  el.textContent = text;
  const o = new CSS2DObject(el);
  o.userData.isLabel = true;
  return o;
}

function pipeMassPerM(D, t) {
  return Math.PI * ((D / 2) ** 2 - (D / 2 - t) ** 2) * STEEL_DENSITY;
}

const deg = THREE.MathUtils.degToRad;
const labels = [];
function addLabel(parent, text, pos, cls) {
  const l = label(text, cls);
  l.position.copy(pos);
  parent.add(l);
  labels.push(l);
  return l;
}

// ---------------------------------------------------------------------------
// 1. ÇATI TAŞIYICISI (referans)
// ---------------------------------------------------------------------------
const carrierGeo = new THREE.CylinderGeometry(CARRIER_R, CARRIER_R, 3.2, 64);
carrierGeo.rotateX(Math.PI / 2);
const carrier = new THREE.Mesh(carrierGeo, M.carrier);
scene.add(carrier);
addLabel(carrier, 'Çatı taşıyıcısı · çevre 132 cm (Ø420)', new THREE.Vector3(0, CARRIER_R + 0.08, -1.2));

// ---------------------------------------------------------------------------
// 2. SABİT KISIM: eyer + lama çember kelepçeler + bağlantı plakası + sabit flanş
// ---------------------------------------------------------------------------
const fixedGroup = new THREE.Group();
scene.add(fixedGroup);

// Eyer: borunun alt 140°'sini saran 10 mm sac, 500 mm boy
fixedGroup.add(ringSector(CARRIER_R, CARRIER_R + SADDLE_T, deg(200), deg(340), SADDLE_L, M.plate));

// Eyer kulakları (iki yanda yatay lama, çember uçları buraya cıvatalanır)
const earY = -CARRIER_R * Math.sin(deg(20));
const earX = CARRIER_R * Math.cos(deg(20)) + 0.045;
[-1, 1].forEach(s => {
  fixedGroup.add(box(0.07, 0.012, SADDLE_L, M.plate, s * earX, earY - 0.012, 0));
});

// Çemberler: üstten saran 50 x 6 lama; uçları dışa kıvrık çift kat kulak + M16 cıvata
BAND_Z.forEach(bz => {
  const band = ringSector(CARRIER_R, CARRIER_R + BAND_T, deg(-20), deg(200), BAND_W, M.band);
  band.position.z = bz;
  fixedGroup.add(band);
  [-1, 1].forEach(s => {
    fixedGroup.add(box(0.06, 0.012, BAND_W, M.band, s * earX, earY + 0.006, bz));
    const bx = s * (earX + 0.012);
    fixedGroup.add(rod(0.008, new THREE.Vector3(bx, earY - 0.05, bz), new THREE.Vector3(bx, earY + 0.05, bz), M.dark, 10));
    const n1 = nut(0.014, 'y'); n1.position.set(bx, earY + 0.019, bz); fixedGroup.add(n1);
    const n2 = nut(0.014, 'y'); n2.position.set(bx, earY - 0.025, bz); fixedGroup.add(n2);
  });
});
addLabel(fixedGroup, 'Lama çember kelepçe 50×6 + M16 (2 ad.)', new THREE.Vector3(0, CARRIER_R + 0.05, BAND_Z[1]));

// Eyer gövdesi: 2 düşey ağ levhası + bağlantı plakası
[-0.07, 0.07].forEach(x => {
  fixedGroup.add(box(0.012, 0.10, 0.46, M.plate, x, -0.255, 0));
});
fixedGroup.add(box(0.30, PLATE_T, SADDLE_L, M.plate, 0, PLATE_TOP - PLATE_T / 2, 0));
addLabel(fixedGroup, 'Eyer 10 mm + bağlantı plakası 300×500×15', new THREE.Vector3(-0.32, -0.26, 0.22));

// Sabit flanş + derece taksimatı (15°)
const fixFlange = new THREE.Mesh(new THREE.CylinderGeometry(FLANGE_R, FLANGE_R, FLANGE_T, 48), M.plate);
fixFlange.position.y = FIX_FLANGE_TOP - FLANGE_T / 2;
fixedGroup.add(fixFlange);
for (let a = 0; a < 360; a += 15) {
  const t = box(a % 90 === 0 ? 0.022 : 0.012, 0.004, 0.003, M.dark);
  const r = FLANGE_R - 0.004;
  t.position.set(Math.cos(deg(a)) * r, FIX_FLANGE_TOP - FLANGE_T - 0.001, -Math.sin(deg(a)) * r);
  t.rotation.y = deg(a);
  fixedGroup.add(t);
}

// ---------------------------------------------------------------------------
// 3. EKSEN 1 · AZİMUT GRUBU
// ---------------------------------------------------------------------------
const azGroup = new THREE.Group();
scene.add(azGroup);

// Dinamik (iniş boyuna bağlı) parçalar her güncellemede yeniden kurulur
const azDynamic = new THREE.Group();
azGroup.add(azDynamic);

// Döner flanş + gösterge + merkez pim + 4 x M16 (kanal delikli sabit flanşta)
const rotFlange = new THREE.Mesh(new THREE.CylinderGeometry(FLANGE_R, FLANGE_R, FLANGE_T, 48), M.galv);
rotFlange.position.y = ROT_FLANGE_TOP - FLANGE_T / 2;
azGroup.add(rotFlange);
const pointer = box(0.05, 0.006, 0.012, M.accent, FLANGE_R + 0.02, ROT_FLANGE_TOP - FLANGE_T / 2, 0);
azGroup.add(pointer);
azGroup.add(rod(0.016, new THREE.Vector3(0, PLATE_TOP + 0.02, 0), new THREE.Vector3(0, ROT_FLANGE_BOT - 0.02, 0), M.dark, 16));
for (let i = 0; i < 4; i++) {
  const a = deg(45 + i * 90);
  const p = new THREE.Vector3(Math.cos(a) * 0.105, 0, Math.sin(a) * 0.105);
  azGroup.add(rod(0.008, p.clone().setY(FIX_FLANGE_TOP + 0.01), p.clone().setY(ROT_FLANGE_BOT - 0.025), M.dark, 10));
  const n = nut(0.014, 'y'); n.position.copy(p).setY(ROT_FLANGE_BOT - 0.008); azGroup.add(n);
}
addLabel(azGroup, 'EKSEN 1 · Azimut döner flanş Ø260 (4×M16 kanal, 360°)', new THREE.Vector3(0.16, ROT_FLANGE_BOT - 0.02, 0.18), 'ax');

// Flanş altı 4 adet üçgen berkitme
const gussetShape = new THREE.Shape();
gussetShape.moveTo(0, 0);
gussetShape.lineTo(FLANGE_R - 0.01 - DROP_PIPE.D / 2, 0);
gussetShape.lineTo(0, -0.12);
gussetShape.closePath();
for (let i = 0; i < 4; i++) {
  const g = new THREE.ExtrudeGeometry(gussetShape, { depth: 0.010, bevelEnabled: false });
  g.translate(DROP_PIPE.D / 2, ROT_FLANGE_BOT, -0.005);
  const m = new THREE.Mesh(g, M.galv);
  m.rotation.y = i * Math.PI / 2;
  azGroup.add(m);
}

// Çatal (clevis) plakası: pim deliği + tilt kilit kanalı
function clevisPlateGeometry() {
  const s = new THREE.Shape();
  s.moveTo(-0.07, CLEVIS_TOP);
  s.lineTo(0.11, CLEVIS_TOP);
  s.lineTo(0.11, -0.045);
  s.lineTo(0.06, -0.085);
  s.lineTo(-0.04, -0.085);
  s.lineTo(-0.07, -0.05);
  s.closePath();
  const pin = new THREE.Path();
  pin.absarc(0, 0, 0.016, 0, Math.PI * 2, true);
  s.holes.push(pin);
  // Kilit cıvatası tilt ile birlikte -tilt açısında döner
  const a0 = deg(-TILT_MAX - 2), a1 = deg(-TILT_MIN + 2), hw = 0.009, r = TILT_SLOT_R;
  const slot = new THREE.Path();
  slot.absarc(0, 0, r + hw, a0, a1, false);
  slot.absarc(Math.cos(a1) * r, Math.sin(a1) * r, hw, a1, a1 + Math.PI, false);
  slot.absarc(0, 0, r - hw, a1, a0, true);
  slot.absarc(Math.cos(a0) * r, Math.sin(a0) * r, hw, a0 + Math.PI, a0 + Math.PI * 2, false);
  s.holes.push(slot);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: false, curveSegments: 32 });
  g.translate(0, 0, -0.006);
  return g;
}
const clevisGeo = clevisPlateGeometry();

// ---------------------------------------------------------------------------
// 4. EKSEN 2 · TİLT GRUBU (pim merkezli)
// ---------------------------------------------------------------------------
const tiltGroup = new THREE.Group();
azGroup.add(tiltGroup);

// Dil levhası: pimden anten direğine
const tongueShape = new THREE.Shape();
const tongueEnd = MAST_X - 0.048;
tongueShape.moveTo(-0.03, -0.055);
tongueShape.lineTo(0.15, -0.055);
tongueShape.lineTo(tongueEnd, -0.15);
tongueShape.lineTo(tongueEnd, 0.15);
tongueShape.lineTo(0.15, 0.055);
tongueShape.lineTo(-0.03, 0.055);
tongueShape.closePath();
const tongueGeo = new THREE.ExtrudeGeometry(tongueShape, { depth: 0.025, bevelEnabled: false });
tongueGeo.translate(0, 0, -0.0125);
tiltGroup.add(new THREE.Mesh(tongueGeo, M.galv));

// Pim Ø30 + somunlar
tiltGroup.add(rod(0.015, new THREE.Vector3(0, 0, -0.05), new THREE.Vector3(0, 0, 0.05), M.dark, 16));
[-0.032, 0.032].forEach(z => { const n = nut(0.025, 'z'); n.position.set(0, 0, z); tiltGroup.add(n); });

// Kilit cıvatası M16 (çatal kanalında kayar)
tiltGroup.add(rod(0.008, new THREE.Vector3(TILT_SLOT_R, 0, -0.04), new THREE.Vector3(TILT_SLOT_R, 0, 0.04), M.accent, 10));
[-0.027, 0.027].forEach(z => { const n = nut(0.014, 'z', M.accent); n.position.set(TILT_SLOT_R, 0, z); tiltGroup.add(n); });

// Direk manşonu (yarık kelepçe) 300 mm + sıkma kulakları
const sleeveR = MAST_PIPE.D / 2 + 0.010;
const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(sleeveR, sleeveR, 0.30, 32), M.galv);
sleeve.position.set(MAST_X, 0, 0);
tiltGroup.add(sleeve);
[-1, 1].forEach(s => {
  tiltGroup.add(box(0.03, 0.30, 0.012, M.galv, MAST_X + sleeveR + 0.012, 0, s * 0.012));
  [-0.10, 0, 0.10].forEach(y => {
    tiltGroup.add(rod(0.006, new THREE.Vector3(MAST_X + sleeveR + 0.015, y, -0.035), new THREE.Vector3(MAST_X + sleeveR + 0.015, y, 0.035), M.dark, 8));
  });
});

// Anten direği Ø76.1
const mastR = MAST_PIPE.D / 2;
tiltGroup.add(rod(mastR, new THREE.Vector3(MAST_X, -MAST_PIPE.L / 2, 0), new THREE.Vector3(MAST_X, MAST_PIPE.L / 2, 0), M.galv, 32));
[-1, 1].forEach(s => {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(mastR * 1.06, mastR * 1.06, 0.012, 24), M.dark);
  c.position.set(MAST_X, s * (MAST_PIPE.L / 2 + 0.006), 0);
  tiltGroup.add(c);
});
addLabel(tiltGroup, `Anten direği Ø76.1×4 · L=${MAST_PIPE.L * 1000} mm`, new THREE.Vector3(MAST_X, MAST_PIPE.L / 2 + 0.06, 0));
addLabel(tiltGroup, 'EKSEN 2 · Tilt mafsalı (Ø30 pim + M16 kanal kilidi)', new THREE.Vector3(0.0, -0.16, 0.05), 'ax');

// ---------------------------------------------------------------------------
// 5. MATSING ANTEN (çizim ölçüleriyle) + orijinal 2 braket
// ---------------------------------------------------------------------------
const antenna = new THREE.Group();
// Yerel X = arka panelden öne (boresight), Y = yukarı, Z = genişlik
(function buildAntenna() {
  const hb = ANT.backW / 2, hw = ANT.W / 2, ch = hw - hb;
  const fr = ANT.frontDia / 2, cx = ANT.bodyD - fr;
  const px = ch, py = hw;
  const d = Math.hypot(px - cx, py);
  const aCP = Math.atan2(py, px - cx);
  const aT = aCP - Math.acos(fr / d);

  const s = new THREE.Shape();
  s.moveTo(0, -hb);
  s.lineTo(0, hb);
  s.lineTo(px, py);
  s.lineTo(cx + Math.cos(aT) * fr, Math.sin(aT) * fr);
  s.absarc(cx, 0, fr, aT, -aT, true);
  s.lineTo(px, -py);
  s.closePath();

  const bodyH = ANT.H - 0.03;
  const g = new THREE.ExtrudeGeometry(s, { depth: bodyH, bevelEnabled: false, curveSegments: 40 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, -bodyH / 2, 0);
  antenna.add(new THREE.Mesh(g, M.radome));

  // Üst / alt kapak
  [-1, 1].forEach(sg => {
    const cg = new THREE.ExtrudeGeometry(s, { depth: 0.015, bevelEnabled: false, curveSegments: 40 });
    cg.rotateX(-Math.PI / 2);
    cg.translate(0, sg > 0 ? bodyH / 2 : -bodyH / 2 - 0.015, 0);
    antenna.add(new THREE.Mesh(cg, M.cap));
  });

  // Arka panel ve pah yüzlerindeki 4.3-10 konnektörler
  antenna.add(box(0.006, bodyH * 0.98, ANT.backW, M.antPanel, -0.003, 0, 0));
  [-1, 1].forEach(sg => {
    [0.55, 0.45, 0.25, 0.15, -0.30, -0.40].forEach(y => {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.035, 12), M.dark);
      const mid = new THREE.Vector3(ch / 2, y, sg * (hb + ch / 2));
      const nrm = new THREE.Vector3(-1, 0, sg).normalize();
      c.position.copy(mid).addScaledVector(nrm, 0.015);
      c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), nrm);
      antenna.add(c);
    });
  });

  // Braketler: sele tepesi arka panelden 54 mm geride; karşı kelepçe + 2 x M12x200 saplama
  const yLow = -ANT.H / 2 + ANT.bracketFromBottom;
  [yLow, yLow + ANT.bracketPitch].forEach(by => {
    const xs = -ANT.bracketStandoff;
    [-1, 1].forEach(sg => antenna.add(box(ANT.bracketStandoff, 0.04, 0.008, M.plate, xs / 2, by, sg * (ANT.bracketW / 2 - 0.004))));
    antenna.add(box(0.006, 0.04, ANT.bracketW, M.plate, xs + 0.003, by, 0));
    const xc = xs - MAST_PIPE.D - 0.006;
    antenna.add(box(0.012, 0.04, ANT.clampPlateW, M.plate, xc, by, 0));
    [-1, 1].forEach(sg => {
      const z = sg * ANT.rodPitch / 2;
      antenna.add(rod(0.006, new THREE.Vector3(xc - 0.03, by, z), new THREE.Vector3(xc + 0.17, by, z), M.dark, 8));
      const n = nut(0.011, 'x'); n.position.set(xc - 0.012, by, z); antenna.add(n);
    });
  });
})();
// Anten direğe: sele tepesi direk yüzeyinde; braket aksları pim kotuna simetrik
const antennaOrigin = new THREE.Vector3(MAST_X + mastR + ANT.bracketStandoff, ANT.H / 2 - ANT.bracketFromBottom - ANT.bracketPitch / 2, 0);
antenna.position.copy(antennaOrigin);
tiltGroup.add(antenna);
addLabel(antenna, 'Matsing MS-MBA-4.4.2-F4-H2-L2 · 51.5 kg', new THREE.Vector3(ANT.bodyD / 2, ANT.H / 2 + 0.08, 0));

// ---------------------------------------------------------------------------
// 6. İNİŞ BORUSU, ÇATAL ve ÖLÇÜ ÇİZGİSİ (iniş boyuna bağlı)
// ---------------------------------------------------------------------------
let dropLabel = null;
function rebuildDrop(drop) {
  azDynamic.children.slice().forEach(c => {
    azDynamic.remove(c);
    if (c.geometry && c.geometry !== clevisGeo) c.geometry.dispose();
  });
  const pinY = -drop;
  const endPlateY = pinY + CLEVIS_TOP + 0.0075;

  azDynamic.add(rod(DROP_PIPE.D / 2, new THREE.Vector3(0, ROT_FLANGE_BOT, 0), new THREE.Vector3(0, endPlateY + 0.0075, 0), M.galv, 32));
  azDynamic.add(box(0.20, 0.015, 0.10, M.galv, 0.02, endPlateY, 0));
  [-0.0195, 0.0195].forEach(z => {
    const m = new THREE.Mesh(clevisGeo, M.galv);
    m.position.set(0, pinY, z);
    azDynamic.add(m);
  });

  // Ölçü: taşıyıcı ekseni → tilt pimi
  const dx = -0.30;
  const lineMat = new THREE.LineBasicMaterial({ color: 0xfbbf24 });
  const pts = [new THREE.Vector3(dx, 0, 0), new THREE.Vector3(dx, pinY, 0),
    new THREE.Vector3(dx - 0.04, 0, 0), new THREE.Vector3(dx + 0.04, 0, 0),
    new THREE.Vector3(dx - 0.04, pinY, 0), new THREE.Vector3(-0.02, pinY, 0)];
  azDynamic.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), lineMat));

  if (dropLabel) { azGroup.remove(dropLabel); labels.splice(labels.indexOf(dropLabel), 1); }
  dropLabel = addLabel(azGroup, `İniş borusu Ø114.3×6 · eksen→pim ${Math.round(drop * 1000)} mm`, new THREE.Vector3(dx - 0.05, pinY / 2, 0));
  dropLabel.visible = document.getElementById('t-lbl').checked;

  tiltGroup.position.set(0, pinY, 0);
}

// ---------------------------------------------------------------------------
// 7. KONTROLLER (açıklık + ön statik tahmin)
// ---------------------------------------------------------------------------
// Anten gövde kutusunun yüzeyinde örnek noktalar (anten yerel)
const antSamples = [];
(function () {
  const x0 = -ANT.bracketStandoff - MAST_PIPE.D - 0.04, x1 = ANT.bodyD;
  const y0 = -ANT.H / 2, y1 = ANT.H / 2, z0 = -ANT.W / 2, z1 = ANT.W / 2, n = 8;
  for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) {
    const a = i / n, b = j / n;
    const x = x0 + (x1 - x0) * a, y = y0 + (y1 - y0) * b, z = z0 + (z1 - z0) * b;
    antSamples.push(
      new THREE.Vector3(x, y1, z0 + (z1 - z0) * b), new THREE.Vector3(x, y0, z0 + (z1 - z0) * b),
      new THREE.Vector3(x0, y, z0 + (z1 - z0) * a), new THREE.Vector3(x, y, z0), new THREE.Vector3(x, y, z1)
    );
    void z;
  }
})();

function computeChecks(drop) {
  scene.updateMatrixWorld(true);
  const stackHalf = 0.25;
  let carrierClear = Infinity, pipeClear = Infinity;
  const tmp = new THREE.Vector3();
  const azInv = new THREE.Matrix4().copy(azGroup.matrixWorld).invert();

  const test = (worldP, inflate) => {
    // Taşıyıcı boru (Z boyunca sonsuz) ve eyer/flanş yığını
    carrierClear = Math.min(carrierClear, Math.hypot(worldP.x, worldP.y) - CARRIER_R - SADDLE_T - inflate);
    if (Math.abs(worldP.x) < stackHalf && Math.abs(worldP.z) < stackHalf) {
      carrierClear = Math.min(carrierClear, ROT_FLANGE_BOT - worldP.y - inflate);
    }
    // İniş borusu (azimut çerçevesinde düşey eksen, pimden yukarı)
    tmp.copy(worldP).applyMatrix4(azInv);
    if (tmp.y > -drop + CLEVIS_TOP && tmp.y < ROT_FLANGE_BOT) {
      pipeClear = Math.min(pipeClear, Math.hypot(tmp.x, tmp.z) - DROP_PIPE.D / 2 - inflate);
    }
  };
  antSamples.forEach(p => test(tmp.copy(p).applyMatrix4(antenna.matrixWorld).clone(), 0));
  for (let i = 0; i <= 20; i++) {
    const p = new THREE.Vector3(MAST_X, -MAST_PIPE.L / 2 + MAST_PIPE.L * i / 20, 0).applyMatrix4(tiltGroup.matrixWorld);
    test(p, mastR);
  }

  // Ön statik tahmin: iniş borusu üst ucunda eğilme + burulma (yanal rüzgar, kendi ağırlık eksantrikliği)
  const g = 9.81;
  const antCenter = new THREE.Vector3(ANT.bodyD / 2, 0, 0).applyMatrix4(antenna.matrixWorld);
  const ecc = Math.hypot(antCenter.x, antCenter.z);
  const L = drop;
  const Mwind = ANT.windLat * L;
  const Mself = ANT.mass * g * ecc;
  const Mb = Math.hypot(Mwind, Mself);
  const T = ANT.windLat * ecc;
  const D = DROP_PIPE.D, d = D - 2 * DROP_PIPE.t;
  const Wb = Math.PI * (D ** 4 - d ** 4) / (32 * D);
  const sigma = Mb / Wb / 1e6, tau = T / (2 * Wb) / 1e6;
  const sigmaV = Math.sqrt(sigma ** 2 + 3 * tau ** 2);

  // Kelepçe: yanal rüzgar momenti çember sürtünmesiyle taşınır (taşıyıcı etrafında dönme)
  return { carrierClear, pipeClear, sigmaV, Mb, T, ecc };
}

function bom(drop) {
  const dropLen = ROT_FLANGE_BOT - (-drop + CLEVIS_TOP + 0.015);
  const rows = [
    ['Eyer sacı 10 mm, R=210 iç, 140°, L=500', 1, Math.PI * 2 * (CARRIER_R + 0.005) * (140 / 360) * 0.5 * 0.010 * STEEL_DENSITY],
    ['Lama çember 50×6, açınım ≈ ' + Math.round((CARRIER_R + 0.003) * deg(220) * 1000 + 120) + ' mm', 2, 0.05 * 0.006 * ((CARRIER_R + 0.003) * deg(220) + 0.12) * STEEL_DENSITY],
    ['Eyer ağ levhası 12 mm, 100×460', 2, 0.1 * 0.46 * 0.012 * STEEL_DENSITY],
    ['Bağlantı plakası 300×500×15', 1, 0.3 * 0.5 * 0.015 * STEEL_DENSITY],
    ['Flanş Ø260×15 (sabit: 4 kanal, döner: 4 delik)', 2, Math.PI * FLANGE_R ** 2 * FLANGE_T * STEEL_DENSITY],
    [`İniş borusu Ø114.3×6.0, L=${Math.round(dropLen * 1000)}`, 1, pipeMassPerM(DROP_PIPE.D, DROP_PIPE.t) * dropLen],
    ['Berkitme 10 mm üçgen', 4, 0.5 * 0.07 * 0.12 * 0.01 * STEEL_DENSITY],
    ['Uç plakası 200×100×15', 1, 0.2 * 0.1 * 0.015 * STEEL_DENSITY],
    ['Çatal levhası 12 mm (pim deliği + tilt kanalı)', 2, 0.18 * 0.18 * 0.012 * STEEL_DENSITY],
    ['Dil levhası 25 mm', 1, 0.3 * 0.2 * 0.025 * STEEL_DENSITY],
    ['Direk manşonu (yarık) Ø96, L=300 + kulaklar', 1, 3.2],
    [`Anten direği Ø76.1×4.0, L=${MAST_PIPE.L * 1000}`, 1, pipeMassPerM(MAST_PIPE.D, MAST_PIPE.t) * MAST_PIPE.L],
    ['Pim Ø30 + 2 somun', 1, 0.6],
    ['Cıvata M16 (çember 4, flanş 4, tilt kilidi 1)', 9, 0.15],
    ['Cıvata M12 manşon', 3, 0.08],
    ['Matsing braketi + 2×M12×200 (anten ile gelir)', 2, 0]
  ];
  return rows;
}

// ---------------------------------------------------------------------------
// 8. ARAYÜZ
// ---------------------------------------------------------------------------
const elAz = document.getElementById('az');
const elTilt = document.getElementById('tilt');
const elDrop = document.getElementById('drop');
let lastDrop = null;

function update() {
  const az = +elAz.value, tilt = +elTilt.value, drop = +elDrop.value / 1000;
  document.getElementById('v-az').textContent = `${az}°`;
  document.getElementById('v-tilt').textContent = `${tilt}°`;
  document.getElementById('v-drop').textContent = `${Math.round(drop * 1000)} mm`;

  if (drop !== lastDrop) { rebuildDrop(drop); lastDrop = drop; }
  azGroup.rotation.y = deg(az);
  tiltGroup.rotation.z = deg(-tilt);

  const c = computeChecks(drop);
  const cls = (v, lim) => v >= lim ? 'ok' : 'bad';
  document.getElementById('checks').innerHTML = `
    <div>Anten/direk → taşıyıcı ve flanş: <b class="${cls(c.carrierClear, 0.05)}">${Math.round(c.carrierClear * 1000)} mm</b></div>
    <div>Anten/direk → iniş borusu: <b class="${cls(c.pipeClear, 0.03)}">${Math.round(c.pipeClear * 1000)} mm</b></div>
    <div>Anten merkezi eksantrikliği: ${Math.round(c.ecc * 1000)} mm</div>
    <div>Kelepçe kesitinde eğilme: ${(c.Mb / 1000).toFixed(2)} kNm · burulma: ${(c.T / 1000).toFixed(2)} kNm</div>
    <div>İniş borusu σv ≈ <b class="${cls(156 - c.sigmaV, 0)}">${c.sigmaV.toFixed(0)} MPa</b> (S235 / 1.5 = 156)</div>
    <div style="color:#94a3b8;margin-top:4px">Ön tahmin: 150 km/h yanal rüzgar 930 N + öz ağırlık. Statik hesabın yerine geçmez.</div>`;

  const rows = bom(drop);
  let total = ANT.mass;
  document.getElementById('bom').innerHTML = rows.map(([n, q, kg]) => {
    total += q * kg;
    return `<tr><td>${n}</td><td class="n">${q} ad.</td><td class="n">${kg ? (q * kg).toFixed(1) + ' kg' : '–'}</td></tr>`;
  }).join('') + `<tr><td><b>Toplam (anten 51.5 kg dahil)</b></td><td></td><td class="n"><b>${total.toFixed(1)} kg</b></td></tr>`;
}

[elAz, elTilt, elDrop].forEach(el => el.addEventListener('input', update));
document.getElementById('t-ant').addEventListener('change', e => { antenna.visible = e.target.checked; });
document.getElementById('t-car').addEventListener('change', e => { carrier.visible = e.target.checked; });
document.getElementById('t-lbl').addEventListener('change', e => { labels.forEach(l => { l.visible = e.target.checked; }); });

const target = new THREE.Vector3(0.3, -1.0, 0);
const VIEWS = {
  iso: new THREE.Vector3(2.8, 0.4, 2.8),
  front: new THREE.Vector3(4.2, -1.0, 0),
  side: new THREE.Vector3(0.3, -1.0, 4.2),
  top: new THREE.Vector3(0.3, 3.4, 0.001)
};
function setView(name) {
  camera.position.copy(VIEWS[name]);
  controls.target.copy(target);
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
update();
renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
});

// Tarayıcı konsolundan inceleme için
window.matsingAparat = { scene, azGroup, tiltGroup, antenna, computeChecks };
