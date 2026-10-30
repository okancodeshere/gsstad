// Matsing MS-MBA-4.4.2-F4-H2-L2 için tek kollu, 2 eksenli çatı taşıyıcısı askı aparatı.
// Ana uygulamadan (main.js) bağımsız çalışma alanı: matsing_montaj_aparati.html
//
// Koordinatlar (m): taşıyıcı boru ekseni Z boyunca, Y = 0'da. Azimut 0° iken anten +X'e bakar.
// Eksen 1 (azimut): terazi başlığındaki kanallı sabit flanş + altına oturan döner flanş, Ø50 merkez pimi
//                   (bronz burç) etrafında düşey eksende döner; 4×M16 sıkılınca sürtünmeyle kilitlenir.
// Eksen 2 (tilt):   iniş borusunun ucundaki çatal mafsal, yatay pim (azimut çerçevesinde Z ekseni).
// Taşıyıcıya delme/kaynak yok: alt eyer + gövdeyi tam saran üst kabuk, cıvatalı (bkz. AJAN_DEVIR.md Kalıcı Kararlar).

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

// Hafifletilmiş kelepçe (2026-10-30): eyer 10→8, kabuk 8→5, boy 500→400, plaka 15→12, ağ 12→10 mm
const SADDLE_T = 0.008;
const SADDLE_L = 0.40;
const FELT_T = 0.005;                           // taşıyıcı ile kelepçe arası keçe
const CLAMP_R = CARRIER_R + FELT_T;             // eyer / kabuk iç yarıçapı
const SHELL_T = 0.005;                          // üst kabuk sac kalınlığı
const SHELL_BOLT_Z = [-0.15, -0.05, 0.05, 0.15]; // yan başına 4 x M16
const EAR_W = 0.06, EAR_T = 0.010;              // eyer kulağı / kabuk yan flanşı lama
const WEB_T = 0.010, WEB_L = 0.36;              // eyer ağ levhaları
const PLATE_TOP = -0.305, PLATE_T = 0.012;
const FLANGE_R = 0.15, FLANGE_T = 0.015;          // azimut flanşları Ø300 × 15

// Eksen 1 (azimut) döner tabla: sabit flanşta 4 yay kanal, döner flanşta 45° arayla 8 delik.
// 4 M16 cıvata döner flanşa takılır ve sabit flanştaki kanallarda yürür. Kanal ±25°;
// iki delik seti (0/90/180/270 veya 45/135/225/315) dönüşümlü kullanılarak 360° kapsanır.
// Ortada sabit flanşa kaynaklı Ø50 merkez pimi, döner flanştaki bronz burca girer (dönme ekseni).
const AZ_BOLT_R = 0.115;
const AZ_SLOT_HALF = 25;        // derece, kanal merkezinden iki yana
const AZ_SLOT_W = 0.018;        // M16 için kanal genişliği
const AZ_SPIGOT_R = 0.025;      // merkez pimi Ø50
const AZ_BUSH_R = 0.035;        // bronz burç dış Ø70
const AZ_FRICTION = 0.2;        // galvaniz-galvaniz sürtünme katsayısı (muhafazakâr)
const M16_PRELOAD = 88e3;       // N, 8.8 sınıfı, 0.7·fub·As

// Eğim ayar mafsalı: taşıyıcı tarafındaki dış kulaklar ile her zaman yatay kalan
// "terazi başlığı" arasında, taşıyıcıya dik yatay pim (X ekseni). Kanalda M16 ile kilitlenir.
const SLOPE_PIN_Y = -0.37;      // taşıyıcı yerelinde pim kotu (plaka altı 50 mm)
const SLOPE_MAX = 15;           // ± derece
const SLOPE_SLOT_R = 0.06;
const OUTER_LUG_X = 0.063, INNER_LUG_X = 0.045, LUG_T = 0.012;
const HEAD_PLATE_TOP = -0.13;   // pim yerelinde; iç kulaklar doğrudan sabit flanşa kaynaklı
const FIX_FLANGE_TOP = HEAD_PLATE_TOP;                  // pim yerelinde
// Azimut grubu yerelinde (eski yığın kotları korunur, grup kaydırılır)
const ROT_FLANGE_TOP = -0.337;
const ROT_FLANGE_BOT = ROT_FLANGE_TOP - FLANGE_T;      // -0.352

const DROP_PIPE = { D: 0.1143, t: 0.005 };   // Ø114.3 x 5.0
const MAST_PIPE = { D: 0.0761, t: 0.0032, L: 1.60 }; // Ø76.1 x 3.2 (Matsing: Ø61–114)
const pipeName = p => `Ø${(p.D * 1000).toFixed(1)}×${(p.t * 1000).toFixed(1)}`;
const MAST_X = 0.32;                          // tilt pimi → anten direği ekseni
const CLEVIS_TOP = 0.0975;                    // pim üstünden çatal üst kenarı
const TILT_SLOT_R = 0.075;                    // kilit cıvatası yarıçapı
const CLEVIS_R = 0.10;                        // çatal levhası alt yarım daire (pim merkezli)
// Tilt arayüzde 0° = anten zemine bakıyor (nadir); + öne (boresight yönü), − arkaya.
// İçeride downtilt d = 90 − tilt kullanılır (0 = yatay, + aşağı).
const TILT_BACK = 20, TILT_FRONT = 70;
const DOWNTILT_MIN = 90 - TILT_FRONT, DOWNTILT_MAX = 90 + TILT_BACK; // 20 … 110

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
  cap: new THREE.MeshStandardMaterial({ color: 0xc9ccd1, metalness: 0.4, roughness: 0.5 }),
  felt: new THREE.MeshStandardMaterial({ color: 0x3f3f46, metalness: 0.0, roughness: 0.95 })
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
// Taşıyıcı ve ona bağlı parçalar eğimle birlikte döner (X ekseni etrafında)
const carrierGroup = new THREE.Group();
scene.add(carrierGroup);
carrierGroup.add(carrier);
addLabel(carrier, 'Çatı taşıyıcısı · çevre 132 cm (Ø420)', new THREE.Vector3(0, CARRIER_R + 0.08, -1.2));

// ---------------------------------------------------------------------------
// 2. SABİT KISIM: eyer + üst kabuk + bağlantı plakası + eğim kulakları
// ---------------------------------------------------------------------------
const fixedGroup = new THREE.Group();
carrierGroup.add(fixedGroup);

// Keçe: taşıyıcı ile eyer/kabuk arasında 360° ara katman (sürtünme yüzeyinde korozyonu önler).
// Kelepçe boyundan iki uçta 10 mm taşar.
fixedGroup.add(ringSector(CARRIER_R, CLAMP_R, 0, Math.PI * 2, SADDLE_L + 0.02, M.felt));

// Eyer: borunun alt 140°'sini saran 8 mm sac, 400 mm boy (keçe üstünde)
fixedGroup.add(ringSector(CLAMP_R, CLAMP_R + SADDLE_T, deg(200), deg(340), SADDLE_L, M.plate));

// Eyer kulakları (iki yanda boyuna flanş, üst kabuk flanşları buraya cıvatalanır)
const earY = -CLAMP_R * Math.sin(deg(20));
const earX = CLAMP_R * Math.cos(deg(20)) + EAR_W / 2 + 0.01;
[-1, 1].forEach(s => {
  fixedGroup.add(box(EAR_W, EAR_T, SADDLE_L, M.plate, s * earX, earY - EAR_T, 0));
});

// Üst kabuk: borunun üst 220°'sini eyer boyunca (400 mm) tamamen saran 5 mm sac.
// Eyerle birlikte boruyu 360° sarar; iki yandaki boyuna flanşlardan 4'er M16 ile eyer kulaklarına sıkılır.
const shell = ringSector(CLAMP_R, CLAMP_R + SHELL_T, deg(-20), deg(200), SADDLE_L, M.band);
fixedGroup.add(shell);
// Kabuk üstünde 2 enine berkitme halkası (uçlarda, kabuğun ağzı açılmasın)
[-1, 1].forEach(s => {
  const rib = ringSector(CLAMP_R + SHELL_T, CLAMP_R + SHELL_T + 0.025, deg(-15), deg(195), 0.010, M.band);
  rib.position.z = s * (SADDLE_L / 2 - 0.005);
  fixedGroup.add(rib);
});
[-1, 1].forEach(s => {
  fixedGroup.add(box(EAR_W, EAR_T, SADDLE_L, M.band, s * earX, earY + EAR_T / 2, 0));
  const bx = s * (earX + 0.012);
  SHELL_BOLT_Z.forEach(bz => {
    fixedGroup.add(rod(0.008, new THREE.Vector3(bx, earY - 0.05, bz), new THREE.Vector3(bx, earY + 0.05, bz), M.dark, 10));
    const n1 = nut(0.014, 'y'); n1.position.set(bx, earY + 0.019, bz); fixedGroup.add(n1);
    const n2 = nut(0.014, 'y'); n2.position.set(bx, earY - 0.025, bz); fixedGroup.add(n2);
  });
});
addLabel(fixedGroup, `Üst kabuk ${SHELL_T * 1000} mm, L=${SADDLE_L * 1000} (gövdeyi tam sarar) + 8×M16`, new THREE.Vector3(0, CARRIER_R + 0.06, 0.15));

// Eyer gövdesi: 2 düşey ağ levhası + bağlantı plakası
[-0.07, 0.07].forEach(x => {
  fixedGroup.add(box(WEB_T, 0.10, WEB_L, M.plate, x, -0.255, 0));
});
fixedGroup.add(box(0.30, PLATE_T, SADDLE_L, M.plate, 0, PLATE_TOP - PLATE_T / 2, 0));
addLabel(fixedGroup, `Eyer ${SADDLE_T * 1000} mm + bağlantı plakası 300×${SADDLE_L * 1000}×${PLATE_T * 1000}`, new THREE.Vector3(-0.32, -0.26, 0.22));

// Dış kulaklar (taşıyıcı tarafı, YZ düzleminde 12 mm): üstte plakaya kaynaklı, altta pim
// merkezli R90 yarım daire; R60'ta ±(SLOPE_MAX+2)° kilit kanalı. Şekil (u = -Z, v = Y) düzleminde.
function outerLugGeometry() {
  const top = PLATE_TOP - PLATE_T - SLOPE_PIN_Y; // pim üstünde plaka altına kadar (0.05)
  const R = 0.09;
  const s = new THREE.Shape();
  s.moveTo(-R, top);
  s.lineTo(R, top);
  s.lineTo(R, 0);
  s.absarc(0, 0, R, 0, -Math.PI, true);
  s.closePath();
  const pin = new THREE.Path();
  pin.absarc(0, 0, 0.016, 0, Math.PI * 2, true);
  s.holes.push(pin);
  const a0 = deg(-90 - SLOPE_MAX - 2), a1 = deg(-90 + SLOPE_MAX + 2), hw = 0.008, r = SLOPE_SLOT_R;
  const slot = new THREE.Path();
  slot.absarc(0, 0, r + hw, a0, a1, false);
  slot.absarc(Math.cos(a1) * r, Math.sin(a1) * r, hw, a1, a1 + Math.PI, false);
  slot.absarc(0, 0, r - hw, a1, a0, true);
  slot.absarc(Math.cos(a0) * r, Math.sin(a0) * r, hw, a0 + Math.PI, a0 + Math.PI * 2, false);
  s.holes.push(slot);
  const g = new THREE.ExtrudeGeometry(s, { depth: LUG_T, bevelEnabled: false, curveSegments: 32 });
  g.translate(0, 0, -LUG_T / 2);
  g.rotateY(Math.PI / 2); // şekil düzlemi → YZ, kalınlık X
  return g;
}
const outerLugGeo = outerLugGeometry();
[-1, 1].forEach(s => {
  const m = new THREE.Mesh(outerLugGeo, M.plate);
  m.position.set(s * OUTER_LUG_X, SLOPE_PIN_Y, 0);
  fixedGroup.add(m);
});

// ---------------------------------------------------------------------------
// 2.B TERAZİ BAŞLIĞI: her zaman yatay; iç kulaklar + başlık plakası + sabit flanş
// ---------------------------------------------------------------------------
const levelHead = new THREE.Group();
scene.add(levelHead);

// İç kulaklar: pim üstünde R45 (dönerken plakaya değmez), aşağıda başlık plakasına
const innerLugShape = new THREE.Shape();
innerLugShape.moveTo(-0.045, HEAD_PLATE_TOP);
innerLugShape.lineTo(0.045, HEAD_PLATE_TOP);
innerLugShape.lineTo(0.045, 0);
innerLugShape.absarc(0, 0, 0.045, 0, Math.PI, false);
innerLugShape.closePath();
const innerLugGeo = new THREE.ExtrudeGeometry(innerLugShape, { depth: LUG_T, bevelEnabled: false, curveSegments: 24 });
innerLugGeo.translate(0, 0, -LUG_T / 2);
innerLugGeo.rotateY(Math.PI / 2);
[-1, 1].forEach(s => {
  const m = new THREE.Mesh(innerLugGeo, M.galv);
  m.position.x = s * INNER_LUG_X;
  levelHead.add(m);
});
// İç kulak berkitmeleri (kulak ↔ sabit flanş, her kulakta iki yanda)
[-1, 1].forEach(sx => [-1, 1].forEach(sz => {
  const gs = new THREE.Shape();
  gs.moveTo(0, 0); gs.lineTo(0.03, 0); gs.lineTo(0, 0.035); gs.closePath();
  const g = new THREE.ExtrudeGeometry(gs, { depth: 0.008, bevelEnabled: false });
  g.translate(0, 0, -0.004);
  const m = new THREE.Mesh(g, M.galv);
  m.position.set(sx * (INNER_LUG_X + LUG_T / 2), HEAD_PLATE_TOP, sz * 0.03);
  if (sx < 0) m.rotation.y = Math.PI;
  levelHead.add(m);
}));

// Eğim pimi Ø30 + kilit cıvatası M16 (pim altında R60, dış kulak kanalında kayar)
levelHead.add(rod(0.015, new THREE.Vector3(-0.09, 0, 0), new THREE.Vector3(0.09, 0, 0), M.dark, 16));
[-1, 1].forEach(s => { const n = nut(0.025, 'x'); n.position.set(s * 0.08, 0, 0); levelHead.add(n); });
levelHead.add(rod(0.008, new THREE.Vector3(-0.09, -SLOPE_SLOT_R, 0), new THREE.Vector3(0.09, -SLOPE_SLOT_R, 0), M.accent, 10));
[-1, 1].forEach(s => { const n = nut(0.014, 'x', M.accent); n.position.set(s * 0.076, -SLOPE_SLOT_R, 0); levelHead.add(n); });

addLabel(levelHead, `EĞİM AYARI · Ø30 pim + M16 kanal kilidi (±${SLOPE_MAX}°), başlık her zaman yatay`, new THREE.Vector3(-0.12, -0.02, -0.15), 'ax');

// ---------------------------------------------------------------------------
// 2.C EKSEN 1 · SABİT FLANŞ (terazi başlığının tabanı, dönmez)
// ---------------------------------------------------------------------------
// Halka üzerinde yay kanal (kalınlık yönünde delik), şekil düzleminde
function arcSlotPath(r, a0, a1, hw) {
  const p = new THREE.Path();
  p.absarc(0, 0, r + hw, a0, a1, false);
  p.absarc(Math.cos(a1) * r, Math.sin(a1) * r, hw, a1, a1 + Math.PI, false);
  p.absarc(0, 0, r - hw, a1, a0, true);
  p.absarc(Math.cos(a0) * r, Math.sin(a0) * r, hw, a0 + Math.PI, a0 + Math.PI * 2, false);
  return p;
}
function circlePath(x, y, r) {
  const p = new THREE.Path();
  p.absarc(x, y, r, 0, Math.PI * 2, true);
  return p;
}
// Şekil XY'de, Y yukarı doğru FLANGE_T kalınlıkta (alt yüz y = 0)
function flangeGeometry(holes) {
  const s = new THREE.Shape();
  s.absarc(0, 0, FLANGE_R, 0, Math.PI * 2, false);
  s.holes.push(...holes);
  const g = new THREE.ExtrudeGeometry(s, { depth: FLANGE_T, bevelEnabled: false, curveSegments: 64 });
  g.rotateX(-Math.PI / 2);
  return g;
}

const fixFlangeGeo = flangeGeometry([0, 90, 180, 270].map(c =>
  arcSlotPath(AZ_BOLT_R, deg(c - AZ_SLOT_HALF), deg(c + AZ_SLOT_HALF), AZ_SLOT_W / 2)));
const fixFlange = new THREE.Mesh(fixFlangeGeo, M.plate);
fixFlange.position.y = FIX_FLANGE_TOP - FLANGE_T;
levelHead.add(fixFlange);

// Merkez pimi Ø50: sabit flanşın altına kaynaklı, döner flanştaki bronz burca girer
levelHead.add(rod(AZ_SPIGOT_R, new THREE.Vector3(0, FIX_FLANGE_TOP - FLANGE_T, 0),
  new THREE.Vector3(0, FIX_FLANGE_TOP - 2 * FLANGE_T + 0.002, 0), M.dark, 32));

// Açı taksimatı: sabit flanşın dış yüzünde 5° çizgiler (15°'de uzun, 90°'de tam boy)
for (let a = 0; a < 360; a += 5) {
  const h = a % 90 === 0 ? FLANGE_T : a % 15 === 0 ? 0.011 : 0.006;
  const t = box(0.0015, h, 0.0022, M.dark);
  const r = FLANGE_R + 0.0007;
  t.position.set(Math.cos(deg(a)) * r, FIX_FLANGE_TOP - FLANGE_T + h / 2, -Math.sin(deg(a)) * r);
  t.rotation.y = deg(a);
  levelHead.add(t);
}
const scaleLabels = [0, 90, 180, -90].map(a =>
  addLabel(levelHead, `${a}°`, new THREE.Vector3(Math.cos(deg(a)) * (FLANGE_R + 0.035), FIX_FLANGE_TOP - FLANGE_T / 2, -Math.sin(deg(a)) * (FLANGE_R + 0.035))));
void scaleLabels;
addLabel(levelHead, `Sabit flanş Ø300×${FLANGE_T * 1000} · 4 yay kanal ±${AZ_SLOT_HALF}° · 5° taksimat`, new THREE.Vector3(-0.05, FIX_FLANGE_TOP + 0.01, 0.26), 'ax');

// ---------------------------------------------------------------------------
// 3. EKSEN 1 · AZİMUT GRUBU
// ---------------------------------------------------------------------------
const azGroup = new THREE.Group();
scene.add(azGroup);

// Dinamik (iniş boyuna bağlı) parçalar her güncellemede yeniden kurulur
const azDynamic = new THREE.Group();
azGroup.add(azDynamic);

// Döner flanş: iniş borusuna kaynaklı, sabit flanşın altına doğrudan oturur (arada boşluk yok).
// 45° arayla 8 delik Ø18, ortada bronz burç yuvası.
const rotFlangeGeo = flangeGeometry([
  ...Array.from({ length: 8 }, (_, i) => circlePath(Math.cos(deg(i * 45)) * AZ_BOLT_R, Math.sin(deg(i * 45)) * AZ_BOLT_R, AZ_SLOT_W / 2)),
  circlePath(0, 0, AZ_BUSH_R)
]);
const rotFlange = new THREE.Mesh(rotFlangeGeo, M.galv);
rotFlange.position.y = ROT_FLANGE_BOT;
azGroup.add(rotFlange);

// Bronz burç (merkez pimi etrafında dönme yatağı)
const bronze = new THREE.MeshStandardMaterial({ color: 0xb4793a, metalness: 0.7, roughness: 0.35 });
const bush = ringSector(AZ_SPIGOT_R + 0.0005, AZ_BUSH_R, 0, Math.PI * 2, FLANGE_T, bronze);
bush.rotation.x = Math.PI / 2;
bush.position.y = ROT_FLANGE_BOT + FLANGE_T / 2;
azGroup.add(bush);

// Gösterge: döner flanş kenarından yukarı, sabit flanşın taksimatına uzanan dil (+X = anten yönü)
azGroup.add(box(0.004, FLANGE_T * 1.5, 0.008, M.accent, FLANGE_R + 0.016, ROT_FLANGE_BOT + FLANGE_T * 0.75, 0));
azGroup.add(box(0.016, 0.004, 0.008, M.accent, FLANGE_R + 0.008, ROT_FLANGE_BOT + 0.002, 0));
const tip = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.012, 3), M.accent);
tip.rotation.z = Math.PI / 2;
tip.position.set(FLANGE_R + 0.008, ROT_FLANGE_TOP + FLANGE_T / 2, 0);
azGroup.add(tip);

// 4 × M16 8.8 cıvata takımı: üstte altıgen baş + Ø40 pul (kanalı köprüler), altta pul + somun + kontra somun.
// Cıvatalar döner flanşa aittir; ayar sırasında sabit flanştaki kanalda kayar.
// 8 delikten 4'ü kullanılır: kanal ucuna gelince cıvatalar komşu 4 deliğe aktarılır (45° adım).
const azBolts = new THREE.Group();
azGroup.add(azBolts);
const FIX_TOP_AZ = ROT_FLANGE_TOP + FLANGE_T;   // sabit flanş üstü, azimut yerelinde
const boltSets = [[], []];
for (let i = 0; i < 8; i++) {
  const g = new THREE.Group();
  const a = deg(i * 45);
  g.position.set(Math.cos(a) * AZ_BOLT_R, 0, -Math.sin(a) * AZ_BOLT_R);
  const washer = (y) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.020, 0.004, 24), M.band);
    w.position.y = y;
    g.add(w);
  };
  washer(FIX_TOP_AZ + 0.002);
  const head = nut(0.0139, 'y'); head.position.y = FIX_TOP_AZ + 0.004 + 0.0063; g.add(head);
  g.add(rod(0.008, new THREE.Vector3(0, FIX_TOP_AZ + 0.004, 0), new THREE.Vector3(0, ROT_FLANGE_BOT - 0.042, 0), M.dark, 12));
  washer(ROT_FLANGE_BOT - 0.002);
  const n1 = nut(0.0139, 'y'); n1.position.y = ROT_FLANGE_BOT - 0.004 - 0.0063; g.add(n1);
  const n2 = nut(0.0139, 'y', M.accent); n2.position.y = ROT_FLANGE_BOT - 0.017 - 0.0063; g.add(n2);
  azBolts.add(g);
  boltSets[i % 2].push(g);
}
addLabel(azBolts, '4×M16 8.8 · pul + somun + kontra · kanalda kayar', new THREE.Vector3(0.06, FIX_TOP_AZ + 0.035, 0.20), 'ax');
addLabel(azGroup, `EKSEN 1 · Döner flanş Ø300×${FLANGE_T * 1000} · 8 delik (45°) + bronz burç`, new THREE.Vector3(0.18, ROT_FLANGE_BOT - 0.03, -0.22), 'ax');
const pivotLabel = addLabel(azGroup, 'Dönme ekseni: Ø50 merkez pimi ↔ bronz burç', new THREE.Vector3(-0.02, ROT_FLANGE_BOT - 0.09, 0), 'ax');
void pivotLabel;

// Kanal içindeki cıvata konumu: hangi delik seti, kanal merkezinden kaç derece
function azBoltState(az) {
  const norm = d => ((d % 90) + 135) % 90 - 45;   // [-45, 45)
  const dA = norm(az), dB = norm(45 + az);
  return Math.abs(dA) <= Math.abs(dB) ? { set: 0, off: dA } : { set: 1, off: dB };
}

// Flanş altı 4 adet üçgen berkitme (delikler arasında, 22.5° kaydırılmış)
const gussetShape = new THREE.Shape();
gussetShape.moveTo(0, 0);
gussetShape.lineTo(FLANGE_R - 0.01 - DROP_PIPE.D / 2, 0);
gussetShape.lineTo(0, -0.12);
gussetShape.closePath();
for (let i = 0; i < 4; i++) {
  const g = new THREE.ExtrudeGeometry(gussetShape, { depth: 0.010, bevelEnabled: false });
  g.translate(DROP_PIPE.D / 2, ROT_FLANGE_BOT, -0.005);
  const m = new THREE.Mesh(g, M.galv);
  m.rotation.y = deg(22.5) + i * Math.PI / 2;
  azGroup.add(m);
}

// Çatal (clevis) plakası: pim deliği + tilt kilit kanalı
function clevisPlateGeometry() {
  const s = new THREE.Shape();
  s.moveTo(-CLEVIS_R, CLEVIS_TOP);
  s.lineTo(CLEVIS_R, CLEVIS_TOP);
  s.lineTo(CLEVIS_R, 0);
  s.absarc(0, 0, CLEVIS_R, 0, -Math.PI, true);
  s.closePath();
  const pin = new THREE.Path();
  pin.absarc(0, 0, 0.016, 0, Math.PI * 2, true);
  s.holes.push(pin);
  // Kilit cıvatası dil levhasıyla birlikte −downtilt açısında döner (−110° … −20°)
  const a0 = deg(-DOWNTILT_MAX - 2), a1 = deg(-DOWNTILT_MIN + 2), hw = 0.009, r = TILT_SLOT_R;
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
// Hafifletme deliği Ø80 (geniş bölümde)
const TONGUE_HOLE = { x: 0.215, r: 0.04 };
tongueShape.holes.push(circlePath(TONGUE_HOLE.x, 0, TONGUE_HOLE.r));
const tongueArea = Math.abs(THREE.ShapeUtils.area(tongueShape.getPoints())) - Math.PI * TONGUE_HOLE.r ** 2;
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
addLabel(tiltGroup, `Anten direği ${pipeName(MAST_PIPE)} · L=${MAST_PIPE.L * 1000} mm`, new THREE.Vector3(MAST_X, MAST_PIPE.L / 2 + 0.06, 0));
addLabel(tiltGroup, `EKSEN 2 · Tilt mafsalı (Ø30 pim + M16 kanal kilidi, zemine göre öne ${TILT_FRONT}° / arkaya ${TILT_BACK}°)`, new THREE.Vector3(0.0, 0.16, 0.05), 'ax');

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
// Eğim: taşıyıcı grubu döner, terazi başlığı pim noktasında yatay kalır, azimut grubu başlığın altına oturur.
// İniş ölçüsü her zaman düşey: kelepçe noktasındaki taşıyıcı ekseni → tilt pimi.
let pinYLocal = 0;   // tilt pimi, azimut yerelinde
function placeHead(slopeDeg) {
  carrierGroup.rotation.x = deg(slopeDeg);
  const pinW = new THREE.Vector3(0, SLOPE_PIN_Y, 0).applyEuler(carrierGroup.rotation);
  levelHead.position.copy(pinW);
  const fixFlangeBotW = pinW.y + FIX_FLANGE_TOP - FLANGE_T;
  azGroup.position.set(0, fixFlangeBotW - ROT_FLANGE_TOP, pinW.z);   // flanşlar temas halinde
}

let dropLabel = null;
function rebuildDrop(drop) {
  azDynamic.children.slice().forEach(c => {
    azDynamic.remove(c);
    if (c.geometry && c.geometry !== clevisGeo) c.geometry.dispose();
  });
  const pinY = -drop - azGroup.position.y;
  pinYLocal = pinY;
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
  const axisY = -azGroup.position.y; // taşıyıcı ekseni kotu, azimut yerelinde
  const pts = [new THREE.Vector3(dx, axisY, 0), new THREE.Vector3(dx, pinY, 0),
    new THREE.Vector3(dx - 0.04, axisY, 0), new THREE.Vector3(dx + 0.04, axisY, 0),
    new THREE.Vector3(dx - 0.04, pinY, 0), new THREE.Vector3(-0.02, pinY, 0)];
  azDynamic.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), lineMat));

  if (dropLabel) { azGroup.remove(dropLabel); labels.splice(labels.indexOf(dropLabel), 1); }
  dropLabel = addLabel(azGroup, `İniş borusu ${pipeName(DROP_PIPE)} · eksen→pim ${Math.round(drop * 1000)} mm`, new THREE.Vector3(dx - 0.05, (axisY + pinY) / 2, 0));
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
  const tmp = new THREE.Vector3(), cl = new THREE.Vector3();
  const azInv = new THREE.Matrix4().copy(azGroup.matrixWorld).invert();
  const carInv = new THREE.Matrix4().copy(carrierGroup.matrixWorld).invert();

  const test = (worldP, inflate) => {
    // Taşıyıcı boru (kendi ekseni boyunca sonsuz, eğimli)
    cl.copy(worldP).applyMatrix4(carInv);
    carrierClear = Math.min(carrierClear, Math.hypot(cl.x, cl.y) - CARRIER_R - SADDLE_T - inflate);
    // Eyer / eğim mafsalı / flanş yığını (azimut çerçevesinde düşey)
    tmp.copy(worldP).applyMatrix4(azInv);
    if (Math.abs(tmp.x) < stackHalf && Math.abs(tmp.z) < stackHalf) {
      carrierClear = Math.min(carrierClear, ROT_FLANGE_BOT - tmp.y - inflate);
    }
    // İniş borusu (azimut çerçevesinde düşey eksen, pimden yukarı)
    if (tmp.y > pinYLocal + CLEVIS_TOP && tmp.y < ROT_FLANGE_BOT) {
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
  void drop;
  const dropLen = ROT_FLANGE_BOT - (pinYLocal + CLEVIS_TOP + 0.015);
  const rows = [
    [`Keçe ${FELT_T * 1000} mm, ${Math.round((2 * Math.PI * CARRIER_R + 0.02) * 1000)}×${Math.round((SADDLE_L + 0.02) * 1000)} (taşıyıcı ↔ kelepçe)`, 1, 0],
    [`Eyer sacı ${SADDLE_T * 1000} mm, R=215 iç, 140°, L=${SADDLE_L * 1000}`, 1, (CLAMP_R + SADDLE_T / 2) * deg(140) * SADDLE_L * SADDLE_T * STEEL_DENSITY],
    [`Üst kabuk ${SHELL_T * 1000} mm, R=215 iç, 220°, L=${SADDLE_L * 1000}`, 1, (CLAMP_R + SHELL_T / 2) * deg(220) * SADDLE_L * SHELL_T * STEEL_DENSITY],
    [`Eyer kulağı + kabuk yan flanşı ${EAR_W * 1000}×${EAR_T * 1000}, L=${SADDLE_L * 1000}`, 4, EAR_W * EAR_T * SADDLE_L * STEEL_DENSITY],
    ['Kabuk uç berkitmesi 25×10, 210°', 2, (CARRIER_R + 0.02) * deg(210) * 0.025 * 0.010 * STEEL_DENSITY],
    [`Eyer ağ levhası ${WEB_T * 1000} mm, 100×${WEB_L * 1000}`, 2, 0.1 * WEB_L * WEB_T * STEEL_DENSITY],
    [`Bağlantı plakası 300×${SADDLE_L * 1000}×${PLATE_T * 1000}`, 1, 0.3 * SADDLE_L * PLATE_T * STEEL_DENSITY],
    [`Eğim dış kulağı 12 mm, R90 + R60 kanal (±${SLOPE_MAX}°)`, 2, (0.18 * 0.05 + Math.PI * 0.09 ** 2 / 2) * 0.012 * STEEL_DENSITY],
    ['Eğim iç kulağı 12 mm, 90×130 + R45', 2, (0.09 * 0.13 + Math.PI * 0.045 ** 2 / 2) * 0.012 * STEEL_DENSITY],
    ['İç kulak berkitmesi 8 mm üçgen 30×35', 4, 0.5 * 0.03 * 0.035 * 0.008 * STEEL_DENSITY],
    ['Eğim pimi Ø30 + 2 somun', 1, 0.6],
    [`Sabit flanş Ø300×${FLANGE_T * 1000} (4 yay kanal ±${AZ_SLOT_HALF}°, 5° taksimat)`, 1, Math.PI * FLANGE_R ** 2 * FLANGE_T * STEEL_DENSITY * 0.93],
    ['Merkez pimi Ø50, L=38 (sabit flanşa kaynaklı)', 1, Math.PI * AZ_SPIGOT_R ** 2 * 0.038 * STEEL_DENSITY],
    [`Döner flanş Ø300×${FLANGE_T * 1000} (8 delik Ø18, 45° ara)`, 1, Math.PI * (FLANGE_R ** 2 - AZ_BUSH_R ** 2) * FLANGE_T * STEEL_DENSITY],
    [`Bronz burç Ø70/Ø50 × ${FLANGE_T * 1000} (CuSn12)`, 1, Math.PI * (AZ_BUSH_R ** 2 - AZ_SPIGOT_R ** 2) * FLANGE_T * 8800],
    ['Azimut cıvata takımı M16×70 8.8: 2 pul Ø40 + somun + kontra', 4, 0.26],
    [`İniş borusu ${pipeName(DROP_PIPE)}, L=${Math.round(dropLen * 1000)}`, 1, pipeMassPerM(DROP_PIPE.D, DROP_PIPE.t) * dropLen],
    ['Berkitme 10 mm üçgen', 4, 0.5 * 0.07 * 0.12 * 0.01 * STEEL_DENSITY],
    ['Uç plakası 200×100×15', 1, 0.2 * 0.1 * 0.015 * STEEL_DENSITY],
    [`Çatal levhası 12 mm, R${CLEVIS_R * 1000} alt (pim deliği + ${DOWNTILT_MAX - DOWNTILT_MIN}° tilt kanalı)`, 2, (2 * CLEVIS_R * CLEVIS_TOP + Math.PI * CLEVIS_R ** 2 / 2) * 0.012 * STEEL_DENSITY * 0.9],
    [`Dil levhası 25 mm (Ø${TONGUE_HOLE.r * 2000} hafifletme deliği)`, 1, tongueArea * 0.025 * STEEL_DENSITY],
    ['Direk manşonu (yarık) Ø96, L=300 + kulaklar', 1, 3.2],
    [`Anten direği ${pipeName(MAST_PIPE)}, L=${MAST_PIPE.L * 1000}`, 1, pipeMassPerM(MAST_PIPE.D, MAST_PIPE.t) * MAST_PIPE.L],
    ['Pim Ø30 + 2 somun', 1, 0.6],
    ['Cıvata M16 (kabuk 8, tilt kilidi 1, eğim kilidi 1)', 10, 0.15],
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
const elSlope = document.getElementById('slope');
let lastKey = null;

function update() {
  const az = +elAz.value, tilt = +elTilt.value, drop = +elDrop.value / 1000, slope = +elSlope.value;
  document.getElementById('v-az').textContent = `${az}°`;
  document.getElementById('v-tilt').textContent = `${tilt}°`;
  document.getElementById('v-drop').textContent = `${Math.round(drop * 1000)} mm`;
  document.getElementById('v-slope').textContent = `${slope}°`;

  const explode = document.getElementById('t-exp').checked;
  const key = `${drop}|${slope}|${explode}`;
  if (key !== lastKey) {
    placeHead(slope); rebuildDrop(drop); lastKey = key;
    // Patlatılmış görünüş: döner kısım 160 mm aşağı, cıvatalar iki flanş arasında (delik/kanal hizasında)
    azGroup.position.y -= explode ? 0.16 : 0;
    azBolts.position.y = explode ? 0.08 : 0;
  }
  azGroup.rotation.y = deg(az);
  const bs = azBoltState(az);
  boltSets.forEach((set, i) => set.forEach(b => { b.visible = i === bs.set; }));
  tiltGroup.rotation.z = deg(-(90 - tilt)); // tilt: 0 = zemine bakış, + öne

  const c = computeChecks(drop);
  const cls = (v, lim) => v >= lim ? 'ok' : 'bad';
  const azCap = 4 * M16_PRELOAD * AZ_FRICTION * AZ_BOLT_R;
  const holeNames = bs.set === 0 ? '0° / 90° / 180° / 270°' : '45° / 135° / 225° / 315°';
  document.getElementById('az-state').innerHTML = `
    Kullanılan delikler (döner flanş): <b>${holeNames}</b><br>
    Cıvata kanal ortasından <b>${bs.off > 0 ? '+' : ''}${bs.off.toFixed(0)}°</b> (kanal ±${AZ_SLOT_HALF}°)<br>
    Sürtünme kapasitesi 4×M16 8.8, μ=${AZ_FRICTION}: <b class="${cls(azCap / Math.max(c.T, 1), 2)}">${(azCap / 1000).toFixed(1)} kNm</b>
    ≥ rüzgar burulması ${(c.T / 1000).toFixed(2)} kNm`;
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

[elAz, elTilt, elDrop, elSlope].forEach(el => el.addEventListener('input', update));
document.querySelectorAll('[data-slope]').forEach(b => b.addEventListener('click', () => {
  elSlope.value = b.dataset.slope;
  update();
}));
document.getElementById('t-ant').addEventListener('change', e => { antenna.visible = e.target.checked; });
document.getElementById('t-car').addEventListener('change', e => { carrier.visible = e.target.checked; });
document.getElementById('t-lbl').addEventListener('change', e => { labels.forEach(l => { l.visible = e.target.checked; }); });
document.getElementById('t-exp').addEventListener('change', update);

const target = new THREE.Vector3(0.3, -1.0, 0);
const VIEWS = {
  iso: new THREE.Vector3(2.8, 0.4, 2.8),
  front: new THREE.Vector3(4.2, -1.0, 0),
  side: new THREE.Vector3(0.3, -1.0, 4.2),
  top: new THREE.Vector3(0.3, 3.4, 0.001)
};
function setView(name) {
  if (name === 'az') {
    // Eksen 1 yakın plan: sabit flanş merkezine, hafif alttan
    const p = new THREE.Vector3(0, FIX_FLANGE_TOP - FLANGE_T, 0).add(levelHead.position);
    const exp = document.getElementById('t-exp').checked;
    if (exp) p.y -= 0.08;
    controls.target.copy(p);
    camera.position.copy(p).add(new THREE.Vector3(0.62, exp ? 0.22 : 0.42, 0.52));
    controls.update();
    return;
  }
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
window.matsingAparat = { scene, carrierGroup, levelHead, azGroup, tiltGroup, antenna, computeChecks };
