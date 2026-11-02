// Tek kollu, 2 eksenli çatı taşıyıcısı anten askı aparatı. İki sekme (model):
//   ?model=matsing  → Matsing MS-MBA-4.4.2-F4-H2-L2 (51.5 kg), gövdeyi tam saran kelepçe
//   ?model=gammanu  → Gammanu Spot Beam 30/30 DOY15X3030MD4TRE (16.5 kg), iki lama çember, küçültülmüş parçalar
// Ana uygulamadan (main.js) bağımsız çalışma alanı: matsing_montaj_aparati.html
//
// Koordinatlar (m): taşıyıcı boru ekseni Z boyunca, Y = 0'da. Azimut 0° iken anten +X'e bakar.
// Eksen 1 (azimut): sabit açılı göbeğe kaynaklı kanallı sabit flanş + altına oturan döner flanş, merkez pimi
//                   (bronz burç) etrafında düşey eksende döner; 4 cıvata sıkılınca sürtünmeyle kilitlenir.
// Eksen 2 (tilt):   iniş borusunun ucundaki çatal mafsal, yatay pim (azimut çerçevesinde Z ekseni).
// Taşıyıcıya delme/kaynak yok: kelepçe cıvatalı (bkz. AJAN_DEVIR.md Kalıcı Kararlar).

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const MODEL = new URLSearchParams(location.search).get('model') === 'gammanu' ? 'gammanu' : 'matsing';
const IS_G = MODEL === 'gammanu';

// ---------------------------------------------------------------------------
// ÖLÇÜLER
// ---------------------------------------------------------------------------
const CARRIER_R = 1.32 / Math.PI / 2;      // Saha çevre ölçüsü 132 cm → Ø420 (ALAN 2)

// Anten. X = arka panelden öne, Y = yukarı, Z = genişlik. windMax: kontrolde kullanılan en büyük rüzgar kuvveti.
const ANT = IS_G ? {
  // Spot Beam 30/30 katalog: 700 × 700 × 170 mm, 16.5 kg (montaj kitiyle). Braket ölçüleri varsayım.
  name: 'Gammanu Spot Beam 30/30 (DOY15X3030MD4TRE)',
  H: 0.70, W: 0.70, bodyD: 0.17,
  bracketStandoff: 0.08,
  bracketPitch: 0.45,
  bracketFromBottom: 0.125,
  bracketW: 0.12,
  clampPlateW: 0.14,
  rodPitch: 0.10,
  rodR: 0.005,
  mass: 16.5,
  windMax: 640,           // N, tahmini: 150 km/h, 0.49 m², Cd 1.2 (ön yüz)
  windNote: 'tahmini ön yüz rüzgarı 640 N (150 km/h, 0.49 m², Cd 1.2)'
} : {
  // MS-MBA-4.4.2-F4-H2-L2 çizimi, Rev1.0 mm
  name: 'Matsing MS-MBA-4.4.2-F4-H2-L2',
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
  rodR: 0.006,
  mass: 51.5,             // kg, braketle
  windMax: 930,           // N @150 km/h, yanal (üretici)
  windNote: '150 km/h yanal rüzgar 930 N (üretici)'
};

// Cıvata ölçüleri: r = gövde yarıçapı, nut = altıgen çevrel yarıçap, wash = pul yarıçapı
const M16 = { name: 'M16', r: 0.008, nut: 0.0139, wash: 0.020, preload: 88e3 };  // 8.8, 0.7·fub·As
const M12 = { name: 'M12', r: 0.006, nut: 0.0104, wash: 0.015, preload: 47e3 };

// Taşıyıcı kelepçesi
// Matsing: alt eyer + gövdeyi tam saran üst kabuk (hafifletilmiş: eyer 8, kabuk 5, boy 400, plaka 12, ağ 10 mm)
// Gammanu: alt eyer + 2 adet lama çember (her biri yanlarda 1'er M16 ile eyer kulağına)
const CLAMP = IS_G ? {
  type: 'bands', SADDLE_T: 0.006, SADDLE_L: 0.30,
  BAND_W: 0.05, BAND_T: 0.006, BAND_Z: [-0.10, 0.10],
  EAR_W: 0.05, EAR_T: 0.008, bolt: M16,
  WEB_T: 0.008, WEB_L: 0.26, WEB_X: 0.05, WEB_H: 0.06, WEB_Y: -0.235,
  PLATE_W: 0.20, PLATE_TOP: -0.265, PLATE_T: 0.010
} : {
  type: 'shell', SADDLE_T: 0.008, SADDLE_L: 0.40,
  SHELL_T: 0.005, SHELL_BOLT_Z: [-0.15, -0.05, 0.05, 0.15],
  EAR_W: 0.06, EAR_T: 0.010, bolt: M16,
  WEB_T: 0.010, WEB_L: 0.36, WEB_X: 0.07, WEB_H: 0.10, WEB_Y: -0.255,
  PLATE_W: 0.30, PLATE_TOP: -0.305, PLATE_T: 0.012
};
const { SADDLE_T, SADDLE_L, EAR_W, EAR_T, PLATE_TOP, PLATE_T } = CLAMP;
const FELT_T = 0.005;                           // taşıyıcı ile kelepçe arası keçe
const CLAMP_R = CARRIER_R + FELT_T;             // eyer / kabuk / çember iç yarıçapı

// Eksen 1 (azimut) döner tabla: sabit flanşta 4 yay kanal, döner flanşta 45° arayla 8 delik.
// 4 cıvata döner flanşa takılır ve sabit flanştaki kanallarda yürür. Kanal ±25°;
// iki delik seti (0/90/180/270 veya 45/135/225/315) dönüşümlü kullanılarak 360° kapsanır.
// Ortada sabit flanşa kaynaklı merkez pimi, döner flanştaki bronz burca girer (dönme ekseni).
const FLANGE_R = IS_G ? 0.09 : 0.11;           // Ø180 / Ø220
const FLANGE_T = IS_G ? 0.012 : 0.015;
const AZ_BOLT = IS_G ? M12 : M16;
const AZ_BOLT_R = IS_G ? 0.068 : 0.085;
const AZ_SLOT_HALF = 25;        // derece, kanal merkezinden iki yana
const AZ_SLOT_W = AZ_BOLT.r * 2 + 0.002;
const AZ_SPIGOT_R = IS_G ? 0.020 : 0.025;      // merkez pimi Ø40 / Ø50
const AZ_BUSH_R = IS_G ? 0.028 : 0.035;        // bronz burç dış Ø56 / Ø70
const AZ_FRICTION = 0.2;        // galvaniz-galvaniz sürtünme katsayısı (muhafazakâr)

// Sabit açılı göbek (eğim takozu): bağlantı plakası ile sabit flanş arasında kısa boru.
// Üst ucu taşıyıcı eğiminde eğik kesilip plakaya, alt ucu yatay sabit flanşa kaynaklı.
// En kısa noktası azimut cıvata başlarına yandan anahtar payı bırakır.
const HUB = IS_G ? { D: 0.0889, t: 0.0063 } : { D: 0.1143, t: 0.008 };
const HUB_MIN_H = IS_G ? 0.06 : 0.07;
const FIX_FLANGE_TOP = 0;       // yatay çerçevede (levelHead) sabit flanş üst yüzü
// Azimut grubu yerelinde (eski yığın kotları korunur, grup kaydırılır)
const ROT_FLANGE_TOP = -0.337;
const ROT_FLANGE_BOT = ROT_FLANGE_TOP - FLANGE_T;

const DROP_PIPE = IS_G ? { D: 0.0889, t: 0.004 } : { D: 0.1143, t: 0.005 };
const MAST_PIPE = IS_G ? { D: 0.0603, t: 0.0032, L: 0.90 } : { D: 0.0761, t: 0.0032, L: 1.60 };
const pipeName = p => `Ø${(p.D * 1000).toFixed(1)}×${(p.t * 1000).toFixed(1)}`;
const GUSSET_H = IS_G ? 0.09 : 0.12;
const END_PLATE = IS_G ? { w: 0.15, t: 0.012, d: 0.08, x: 0.015 } : { w: 0.20, t: 0.015, d: 0.10, x: 0.02 };

// Eksen 2 (tilt) çatal mafsalı
const MAST_X = IS_G ? 0.22 : 0.32;            // tilt pimi → anten direği ekseni
const CLEVIS_TOP = IS_G ? 0.075 : 0.0975;     // pim üstünden çatal üst kenarı
const CLEVIS_R = IS_G ? 0.075 : 0.10;         // çatal levhası alt yarım daire (pim merkezli)
const CLEVIS_T = IS_G ? 0.010 : 0.012;
const TILT_SLOT_R = IS_G ? 0.055 : 0.075;     // kilit cıvatası yarıçapı
const TILT_BOLT = IS_G ? M12 : M16;
const PIN = IS_G ? { r: 0.012, nut: 0.020 } : { r: 0.015, nut: 0.025 };   // Ø24 / Ø30
const TONGUE = IS_G
  ? { t: 0.020, back: 0.025, hn: 0.04, xm: 0.10, hf: 0.10, holeR: 0.025 }
  : { t: 0.025, back: 0.03, hn: 0.055, xm: 0.15, hf: 0.15, holeR: 0.04 };
const CLEVIS_Z = TONGUE.t / 2 + 0.001 + CLEVIS_T / 2;   // çatal levhası orta düzlemi
const SLEEVE_L = IS_G ? 0.20 : 0.30;
// Tilt arayüzde 0° = anten zemine bakıyor (nadir); + öne (boresight yönü), − arkaya.
// İçeride downtilt d = 90 − tilt kullanılır (0 = yatay, + aşağı).
const TILT_BACK = 20, TILT_FRONT = 70;
const DOWNTILT_MIN = 90 - TILT_FRONT, DOWNTILT_MAX = 90 + TILT_BACK; // 20 … 110

const DROP_RANGE = IS_G ? { min: 800, max: 3000, val: 1000 } : { min: 1100, max: 3000, val: 1500 };
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
  radomeGray: new THREE.MeshStandardMaterial({ color: 0xc4cbd4, metalness: 0.12, roughness: 0.38 }),
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
const nutH = size => size * 0.9;

// Z ekseni etrafında halka dilimi (a0 → a1, saat yönünün tersi), Z boyunca w genişlik
function ringSector(rIn, rOut, a0, a1, w, mat) {
  const s = new THREE.Shape();
  s.absarc(0, 0, rOut, a0, a1, false);
  s.absarc(0, 0, rIn, a1, a0, true);
  const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false, curveSegments: 48 });
  g.translate(0, 0, -w / 2);
  return new THREE.Mesh(g, mat);
}

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
const mm = v => Math.round(v * 1000);
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
// 2. SABİT KISIM: eyer + (üst kabuk | lama çemberler) + bağlantı plakası
// ---------------------------------------------------------------------------
const fixedGroup = new THREE.Group();
carrierGroup.add(fixedGroup);

// Keçe: taşıyıcı ile eyer/kabuk arasında 360° ara katman (sürtünme yüzeyinde korozyonu önler).
// Kelepçe boyundan iki uçta 10 mm taşar.
fixedGroup.add(ringSector(CARRIER_R, CLAMP_R, 0, Math.PI * 2, SADDLE_L + 0.02, M.felt));

// Eyer: borunun alt 140°'sini saran sac (keçe üstünde)
fixedGroup.add(ringSector(CLAMP_R, CLAMP_R + SADDLE_T, deg(200), deg(340), SADDLE_L, M.plate));

// Eyer kulakları (iki yanda boyuna flanş, üst kabuk / çember kulakları buraya cıvatalanır)
const earY = -CLAMP_R * Math.sin(deg(20));
const earX = CLAMP_R * Math.cos(deg(20)) + EAR_W / 2 + 0.01;
[-1, 1].forEach(s => {
  fixedGroup.add(box(EAR_W, EAR_T, SADDLE_L, M.plate, s * earX, earY - EAR_T, 0));
});

// Kulak cıvatası: alt ve üst kulaktan geçer, iki somun
function earBolt(bx, bz) {
  const b = CLAMP.bolt;
  fixedGroup.add(rod(b.r, new THREE.Vector3(bx, earY - 0.05, bz), new THREE.Vector3(bx, earY + 0.05, bz), M.dark, 10));
  const n1 = nut(b.nut, 'y'); n1.position.set(bx, earY + EAR_T + nutH(b.nut) / 2, bz); fixedGroup.add(n1);
  const n2 = nut(b.nut, 'y'); n2.position.set(bx, earY - 1.5 * EAR_T - nutH(b.nut) / 2, bz); fixedGroup.add(n2);
}

if (CLAMP.type === 'shell') {
  // Üst kabuk: borunun üst 220°'sini eyer boyunca tamamen saran sac.
  // Eyerle birlikte boruyu 360° sarar; iki yandaki boyuna flanşlardan 4'er M16 ile eyer kulaklarına sıkılır.
  fixedGroup.add(ringSector(CLAMP_R, CLAMP_R + CLAMP.SHELL_T, deg(-20), deg(200), SADDLE_L, M.band));
  // Kabuk üstünde 2 enine berkitme halkası (uçlarda, kabuğun ağzı açılmasın)
  [-1, 1].forEach(s => {
    const rib = ringSector(CLAMP_R + CLAMP.SHELL_T, CLAMP_R + CLAMP.SHELL_T + 0.025, deg(-15), deg(195), 0.010, M.band);
    rib.position.z = s * (SADDLE_L / 2 - 0.005);
    fixedGroup.add(rib);
  });
  [-1, 1].forEach(s => {
    fixedGroup.add(box(EAR_W, EAR_T, SADDLE_L, M.band, s * earX, earY + EAR_T / 2, 0));
    CLAMP.SHELL_BOLT_Z.forEach(bz => earBolt(s * (earX + 0.012), bz));
  });
  addLabel(fixedGroup, `Üst kabuk ${mm(CLAMP.SHELL_T)} mm, L=${mm(SADDLE_L)} (gövdeyi tam sarar) + 8×M16`, new THREE.Vector3(0, CARRIER_R + 0.06, 0.15));
} else {
  // Lama çemberler: borunun üst 220°'sini saran 2 adet lama; uçları dışa kıvrık kulak, her yanda 1 cıvata
  CLAMP.BAND_Z.forEach(bz => {
    const band = ringSector(CLAMP_R, CLAMP_R + CLAMP.BAND_T, deg(-20), deg(200), CLAMP.BAND_W, M.band);
    band.position.z = bz;
    fixedGroup.add(band);
    [-1, 1].forEach(s => {
      fixedGroup.add(box(EAR_W, EAR_T, CLAMP.BAND_W, M.band, s * earX, earY + EAR_T / 2, bz));
      earBolt(s * (earX + 0.008), bz);
    });
  });
  addLabel(fixedGroup, `2 lama çember ${mm(CLAMP.BAND_W)}×${mm(CLAMP.BAND_T)} + 4×${CLAMP.bolt.name}`, new THREE.Vector3(0, CARRIER_R + 0.06, 0.15));
}

// Eyer gövdesi: 2 düşey ağ levhası + bağlantı plakası
[-CLAMP.WEB_X, CLAMP.WEB_X].forEach(x => {
  fixedGroup.add(box(CLAMP.WEB_T, CLAMP.WEB_H, CLAMP.WEB_L, M.plate, x, CLAMP.WEB_Y, 0));
});
fixedGroup.add(box(CLAMP.PLATE_W, PLATE_T, SADDLE_L, M.plate, 0, PLATE_TOP - PLATE_T / 2, 0));
addLabel(fixedGroup, `Eyer ${mm(SADDLE_T)} mm + bağlantı plakası ${mm(CLAMP.PLATE_W)}×${mm(SADDLE_L)}×${mm(PLATE_T)}`, new THREE.Vector3(-0.32, -0.26, 0.22));

// ---------------------------------------------------------------------------
// 2.B SABİT AÇILI GÖBEK: eğim her alanda belli (ALAN 2: 5°, ALAN 1-3: 7.7°), atölyede o açıyla kesilir.
// Kelepçe + göbek + sabit flanş tek kaynaklı parça; ayar mafsalı yok.
// ---------------------------------------------------------------------------
const levelHead = new THREE.Group();   // yatay çerçeve: göbek + sabit flanş
scene.add(levelHead);
let hubMesh = null, hubH = HUB_MIN_H;
function buildHub(slopeDeg) {
  const t = Math.tan(deg(slopeDeg));
  hubH = HUB_MIN_H + HUB.D / 2 * Math.abs(t);
  const s = new THREE.Shape();
  s.absarc(0, 0, HUB.D / 2, 0, Math.PI * 2, false);
  s.holes.push(circlePath(0, 0, HUB.D / 2 - HUB.t));
  const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, curveSegments: 48 });
  g.rotateX(-Math.PI / 2); // kalınlık y: 0 → 1
  // Üst uç plakanın alt yüzüne oturur: y = hubH − tan(eğim)·z
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) > 0.5 ? hubH - t * p.getZ(i) : 0);
  p.needsUpdate = true;
  g.computeVertexNormals();
  if (hubMesh) { levelHead.remove(hubMesh); hubMesh.geometry.dispose(); }
  hubMesh = new THREE.Mesh(g, M.galv);
  hubMesh.position.y = FIX_FLANGE_TOP;
  levelHead.add(hubMesh);
}
addLabel(levelHead, `SABİT AÇILI GÖBEK · ${pipeName(HUB)}, üstü taşıyıcı eğiminde kesik`, new THREE.Vector3(-0.14, FIX_FLANGE_TOP + 0.05, -0.16), 'ax');

// ---------------------------------------------------------------------------
// 2.C EKSEN 1 · SABİT FLANŞ (göbeğin altına kaynaklı, dönmez)
// ---------------------------------------------------------------------------
// Şekil XY'de, Y yukarı doğru FLANGE_T kalınlıkta (alt yüz y = 0)
function flangeGeometry(holes) {
  const s = new THREE.Shape();
  s.absarc(0, 0, FLANGE_R, 0, Math.PI * 2, false);
  s.holes.push(...holes);
  const g = new THREE.ExtrudeGeometry(s, { depth: FLANGE_T, bevelEnabled: false, curveSegments: 64 });
  g.rotateX(-Math.PI / 2);
  return g;
}
const FLANGE_NAME = `Ø${mm(FLANGE_R * 2)}×${mm(FLANGE_T)}`;

const fixFlangeGeo = flangeGeometry([0, 90, 180, 270].map(c =>
  arcSlotPath(AZ_BOLT_R, deg(c - AZ_SLOT_HALF), deg(c + AZ_SLOT_HALF), AZ_SLOT_W / 2)));
const fixFlange = new THREE.Mesh(fixFlangeGeo, M.plate);
fixFlange.position.y = FIX_FLANGE_TOP - FLANGE_T;
levelHead.add(fixFlange);

// Merkez pimi: sabit flanşın altına kaynaklı, döner flanştaki bronz burca girer
levelHead.add(rod(AZ_SPIGOT_R, new THREE.Vector3(0, FIX_FLANGE_TOP - FLANGE_T, 0),
  new THREE.Vector3(0, FIX_FLANGE_TOP - 2 * FLANGE_T + 0.002, 0), M.dark, 32));

// Açı taksimatı: sabit flanşın dış yüzünde 5° çizgiler (15°'de uzun, 90°'de tam boy)
for (let a = 0; a < 360; a += 5) {
  const h = a % 90 === 0 ? FLANGE_T : a % 15 === 0 ? FLANGE_T * 0.7 : FLANGE_T * 0.4;
  const t = box(0.0015, h, 0.0022, M.dark);
  const r = FLANGE_R + 0.0007;
  t.position.set(Math.cos(deg(a)) * r, FIX_FLANGE_TOP - FLANGE_T + h / 2, -Math.sin(deg(a)) * r);
  t.rotation.y = deg(a);
  levelHead.add(t);
}
[0, 90, 180, -90].forEach(a =>
  addLabel(levelHead, `${a}°`, new THREE.Vector3(Math.cos(deg(a)) * (FLANGE_R + 0.035), FIX_FLANGE_TOP - FLANGE_T / 2, -Math.sin(deg(a)) * (FLANGE_R + 0.035))));
addLabel(levelHead, `Sabit flanş ${FLANGE_NAME} · 4 yay kanal ±${AZ_SLOT_HALF}° · 5° taksimat`, new THREE.Vector3(-0.05, FIX_FLANGE_TOP + 0.01, 0.26), 'ax');

// ---------------------------------------------------------------------------
// 3. EKSEN 1 · AZİMUT GRUBU
// ---------------------------------------------------------------------------
const azGroup = new THREE.Group();
scene.add(azGroup);

// Dinamik (iniş boyuna bağlı) parçalar her güncellemede yeniden kurulur
const azDynamic = new THREE.Group();
azGroup.add(azDynamic);

// Döner flanş: iniş borusuna kaynaklı, sabit flanşın altına doğrudan oturur (arada boşluk yok).
// 45° arayla 8 delik, ortada bronz burç yuvası.
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

// 4 cıvata takımı (8.8): üstte altıgen baş + pul (kanalı köprüler), altta pul + somun + kontra somun.
// Cıvatalar döner flanşa aittir; ayar sırasında sabit flanştaki kanalda kayar.
// 8 delikten 4'ü kullanılır: kanal ucuna gelince cıvatalar komşu 4 deliğe aktarılır (45° adım).
const azBolts = new THREE.Group();
azGroup.add(azBolts);
const FIX_TOP_AZ = ROT_FLANGE_TOP + FLANGE_T;   // sabit flanş üstü, azimut yerelinde
const boltSets = [[], []];
const azNutH = nutH(AZ_BOLT.nut);
const AZ_BOLT_LEN = Math.ceil((FLANGE_T * 2 + 0.008 + 2 * azNutH + 0.005) * 100) / 100;
for (let i = 0; i < 8; i++) {
  const g = new THREE.Group();
  const a = deg(i * 45);
  g.position.set(Math.cos(a) * AZ_BOLT_R, 0, -Math.sin(a) * AZ_BOLT_R);
  const washer = (y) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(AZ_BOLT.wash, AZ_BOLT.wash, 0.004, 24), M.band);
    w.position.y = y;
    g.add(w);
  };
  washer(FIX_TOP_AZ + 0.002);
  const head = nut(AZ_BOLT.nut, 'y'); head.position.y = FIX_TOP_AZ + 0.004 + azNutH / 2; g.add(head);
  g.add(rod(AZ_BOLT.r, new THREE.Vector3(0, FIX_TOP_AZ + 0.004, 0), new THREE.Vector3(0, ROT_FLANGE_BOT - 0.0045 - 2 * azNutH - 0.012, 0), M.dark, 12));
  washer(ROT_FLANGE_BOT - 0.002);
  const n1 = nut(AZ_BOLT.nut, 'y'); n1.position.y = ROT_FLANGE_BOT - 0.004 - azNutH / 2; g.add(n1);
  const n2 = nut(AZ_BOLT.nut, 'y', M.accent); n2.position.y = ROT_FLANGE_BOT - 0.0045 - azNutH * 1.5; g.add(n2);
  azBolts.add(g);
  boltSets[i % 2].push(g);
}
addLabel(azBolts, `4×${AZ_BOLT.name} 8.8 · pul + somun + kontra · kanalda kayar`, new THREE.Vector3(0.06, FIX_TOP_AZ + 0.035, 0.20), 'ax');
addLabel(azGroup, `EKSEN 1 · Döner flanş ${FLANGE_NAME} · 8 delik (45°) + bronz burç`, new THREE.Vector3(0.18, ROT_FLANGE_BOT - 0.03, -0.22), 'ax');
addLabel(azGroup, `Dönme ekseni: Ø${mm(AZ_SPIGOT_R * 2)} merkez pimi ↔ bronz burç`, new THREE.Vector3(-0.02, ROT_FLANGE_BOT - 0.09, 0), 'ax');

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
gussetShape.lineTo(0, -GUSSET_H);
gussetShape.closePath();
for (let i = 0; i < 4; i++) {
  const g = new THREE.ExtrudeGeometry(gussetShape, { depth: 0.008, bevelEnabled: false });
  g.translate(DROP_PIPE.D / 2, ROT_FLANGE_BOT, -0.004);
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
  s.holes.push(circlePath(0, 0, PIN.r + 0.001));
  // Kilit cıvatası dil levhasıyla birlikte −downtilt açısında döner (−110° … −20°)
  const a0 = deg(-DOWNTILT_MAX - 2), a1 = deg(-DOWNTILT_MIN + 2);
  s.holes.push(arcSlotPath(TILT_SLOT_R, a0, a1, TILT_BOLT.r + 0.001));
  const g = new THREE.ExtrudeGeometry(s, { depth: CLEVIS_T, bevelEnabled: false, curveSegments: 32 });
  g.translate(0, 0, -CLEVIS_T / 2);
  return g;
}
const clevisGeo = clevisPlateGeometry();

// ---------------------------------------------------------------------------
// 4. EKSEN 2 · TİLT GRUBU (pim merkezli)
// ---------------------------------------------------------------------------
const tiltGroup = new THREE.Group();
azGroup.add(tiltGroup);

// Direk manşonu: 6 mm et, direğe 1 mm boşluk (dil levhası bunun yüzeyinde biter)
const SLEEVE_T = 0.006;
const sleeveR = MAST_PIPE.D / 2 + 0.001 + SLEEVE_T;

// Dil levhası: pimden anten direğine, geniş bölümde hafifletme deliği
const tongueShape = new THREE.Shape();
const tongueEnd = MAST_X - sleeveR;
tongueShape.moveTo(-TONGUE.back, -TONGUE.hn);
tongueShape.lineTo(TONGUE.xm, -TONGUE.hn);
tongueShape.lineTo(tongueEnd, -TONGUE.hf);
tongueShape.lineTo(tongueEnd, TONGUE.hf);
tongueShape.lineTo(TONGUE.xm, TONGUE.hn);
tongueShape.lineTo(-TONGUE.back, TONGUE.hn);
tongueShape.closePath();
const TONGUE_HOLE = { x: (TONGUE.xm + tongueEnd) / 2 + 0.003, r: TONGUE.holeR };
tongueShape.holes.push(circlePath(TONGUE_HOLE.x, 0, TONGUE_HOLE.r));
const tongueArea = Math.abs(THREE.ShapeUtils.area(tongueShape.getPoints())) - Math.PI * TONGUE_HOLE.r ** 2;
const tongueGeo = new THREE.ExtrudeGeometry(tongueShape, { depth: TONGUE.t, bevelEnabled: false });
tongueGeo.translate(0, 0, -TONGUE.t / 2);
tiltGroup.add(new THREE.Mesh(tongueGeo, M.galv));

// Pim + somunlar (çatal levhalarının dışında)
const pinNutZ = CLEVIS_Z + CLEVIS_T / 2 + nutH(PIN.nut) / 2;
tiltGroup.add(rod(PIN.r, new THREE.Vector3(0, 0, -pinNutZ - 0.015), new THREE.Vector3(0, 0, pinNutZ + 0.015), M.dark, 16));
[-pinNutZ, pinNutZ].forEach(z => { const n = nut(PIN.nut, 'z'); n.position.set(0, 0, z); tiltGroup.add(n); });

// Kilit cıvatası (çatal kanalında kayar)
const lockNutZ = CLEVIS_Z + CLEVIS_T / 2 + nutH(TILT_BOLT.nut) / 2;
tiltGroup.add(rod(TILT_BOLT.r, new THREE.Vector3(TILT_SLOT_R, 0, -lockNutZ - 0.01), new THREE.Vector3(TILT_SLOT_R, 0, lockNutZ + 0.01), M.accent, 10));
[-lockNutZ, lockNutZ].forEach(z => { const n = nut(TILT_BOLT.nut, 'z', M.accent); n.position.set(TILT_SLOT_R, 0, z); tiltGroup.add(n); });

// Direk manşonu (yarık kelepçe) + sıkma kulakları
const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(sleeveR, sleeveR, SLEEVE_L, 32), M.galv);
sleeve.position.set(MAST_X, 0, 0);
tiltGroup.add(sleeve);
[-1, 1].forEach(s => {
  tiltGroup.add(box(0.03, SLEEVE_L, 0.010, M.galv, MAST_X + sleeveR + 0.012, 0, s * 0.011));
  [-SLEEVE_L / 3, 0, SLEEVE_L / 3].forEach(y => {
    tiltGroup.add(rod(0.006, new THREE.Vector3(MAST_X + sleeveR + 0.015, y, -0.035), new THREE.Vector3(MAST_X + sleeveR + 0.015, y, 0.035), M.dark, 8));
  });
});

// Anten direği
const mastR = MAST_PIPE.D / 2;
tiltGroup.add(rod(mastR, new THREE.Vector3(MAST_X, -MAST_PIPE.L / 2, 0), new THREE.Vector3(MAST_X, MAST_PIPE.L / 2, 0), M.galv, 32));
[-1, 1].forEach(s => {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(mastR * 1.06, mastR * 1.06, 0.012, 24), M.dark);
  c.position.set(MAST_X, s * (MAST_PIPE.L / 2 + 0.006), 0);
  tiltGroup.add(c);
});
addLabel(tiltGroup, `Anten direği ${pipeName(MAST_PIPE)} · L=${mm(MAST_PIPE.L)} mm`, new THREE.Vector3(MAST_X, MAST_PIPE.L / 2 + 0.06, 0));
addLabel(tiltGroup, `EKSEN 2 · Tilt mafsalı (Ø${mm(PIN.r * 2)} pim + ${TILT_BOLT.name} kanal kilidi, zemine göre öne ${TILT_FRONT}° / arkaya ${TILT_BACK}°)`, new THREE.Vector3(0.0, 0.16, 0.05), 'ax');

// ---------------------------------------------------------------------------
// 5. ANTEN + direk braketleri
// ---------------------------------------------------------------------------
const antenna = new THREE.Group();
// Yerel X = arka panelden öne (boresight), Y = yukarı, Z = genişlik
function buildMatsingBody() {
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
}
function buildPanelBody() {
  // 700 × 700 × 170 panel: alüminyum arka kasa + açık gri ASA ön radom, arkada merkezi ray, altta 4 × 4.3-10
  const D = ANT.bodyD;
  antenna.add(box(0.10, ANT.H, ANT.W, M.antPanel, 0.05, 0, 0));
  antenna.add(box(D - 0.10, ANT.H - 0.02, ANT.W - 0.02, M.radomeGray, 0.10 + (D - 0.10) / 2, 0, 0));
  // Ön yüzde X deseni (radom kabartması)
  [-1, 1].forEach(sg => {
    const x = box(0.004, Math.hypot(ANT.H, ANT.W) * 0.85, 0.03, M.cap, D + 0.001, 0, 0);
    x.rotation.x = sg * Math.PI / 4;
    antenna.add(x);
  });
  antenna.add(box(0.012, ANT.H * 0.9, 0.06, M.dark, -0.006, 0, 0));   // merkezi ray
  [-0.105, -0.035, 0.035, 0.105].forEach(z => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.04, 12), M.dark);
    c.position.set(0.05, -ANT.H / 2 - 0.02, z);
    antenna.add(c);
  });
}
(function buildAntenna() {
  if (IS_G) buildPanelBody(); else buildMatsingBody();

  // Braketler: sele tepesi arka panelden standoff kadar geride; karşı kelepçe + 2 saplama
  const yLow = -ANT.H / 2 + ANT.bracketFromBottom;
  [yLow, yLow + ANT.bracketPitch].forEach(by => {
    const xs = -ANT.bracketStandoff;
    [-1, 1].forEach(sg => antenna.add(box(ANT.bracketStandoff, 0.04, 0.008, M.plate, xs / 2, by, sg * (ANT.bracketW / 2 - 0.004))));
    antenna.add(box(0.006, 0.04, ANT.bracketW, M.plate, xs + 0.003, by, 0));
    const xc = xs - MAST_PIPE.D - 0.006;
    antenna.add(box(0.012, 0.04, ANT.clampPlateW, M.plate, xc, by, 0));
    [-1, 1].forEach(sg => {
      const z = sg * ANT.rodPitch / 2;
      antenna.add(rod(ANT.rodR, new THREE.Vector3(xc - 0.03, by, z), new THREE.Vector3(xs + 0.02, by, z), M.dark, 8));
      const n = nut(ANT.rodR * 1.85, 'x'); n.position.set(xc - 0.012, by, z); antenna.add(n);
    });
  });
})();
// Anten direğe: sele tepesi direk yüzeyinde; braket aksları pim kotuna simetrik
const antennaOrigin = new THREE.Vector3(MAST_X + mastR + ANT.bracketStandoff, ANT.H / 2 - ANT.bracketFromBottom - ANT.bracketPitch / 2, 0);
antenna.position.copy(antennaOrigin);
tiltGroup.add(antenna);
addLabel(antenna, `${ANT.name} · ${ANT.mass} kg`, new THREE.Vector3(ANT.bodyD / 2, ANT.H / 2 + 0.08, 0));

// ---------------------------------------------------------------------------
// 6. İNİŞ BORUSU, ÇATAL ve ÖLÇÜ ÇİZGİSİ (iniş boyuna bağlı)
// ---------------------------------------------------------------------------
// Eğim: taşıyıcı grubu döner; eğik kesimli göbeğin alt ucu ve sabit flanş yatay kalır, azimut grubu altına oturur.
// İniş ölçüsü her zaman düşey: kelepçe noktasındaki taşıyıcı ekseni → tilt pimi.
let pinYLocal = 0;   // tilt pimi, azimut yerelinde
function placeHead(slopeDeg) {
  carrierGroup.rotation.x = deg(slopeDeg);
  buildHub(slopeDeg);
  const plateW = new THREE.Vector3(0, PLATE_TOP - PLATE_T, 0).applyEuler(carrierGroup.rotation);
  levelHead.position.set(0, plateW.y - hubH - FIX_FLANGE_TOP, plateW.z);
  const fixFlangeBotW = levelHead.position.y + FIX_FLANGE_TOP - FLANGE_T;
  azGroup.position.set(0, fixFlangeBotW - ROT_FLANGE_TOP, plateW.z);   // flanşlar temas halinde
}

let dropLabel = null;
function rebuildDrop(drop) {
  azDynamic.children.slice().forEach(c => {
    azDynamic.remove(c);
    if (c.geometry && c.geometry !== clevisGeo) c.geometry.dispose();
  });
  const pinY = -drop - azGroup.position.y;
  pinYLocal = pinY;
  const endPlateY = pinY + CLEVIS_TOP + END_PLATE.t / 2;

  azDynamic.add(rod(DROP_PIPE.D / 2, new THREE.Vector3(0, ROT_FLANGE_BOT, 0), new THREE.Vector3(0, endPlateY + END_PLATE.t / 2, 0), M.galv, 32));
  azDynamic.add(box(END_PLATE.w, END_PLATE.t, END_PLATE.d, M.galv, END_PLATE.x, endPlateY, 0));
  [-CLEVIS_Z, CLEVIS_Z].forEach(z => {
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
  dropLabel = addLabel(azGroup, `İniş borusu ${pipeName(DROP_PIPE)} · eksen→pim ${mm(drop)} mm`, new THREE.Vector3(dx - 0.05, (axisY + pinY) / 2, 0));
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
    const x = x0 + (x1 - x0) * a, y = y0 + (y1 - y0) * b;
    antSamples.push(
      new THREE.Vector3(x, y1, z0 + (z1 - z0) * b), new THREE.Vector3(x, y0, z0 + (z1 - z0) * b),
      new THREE.Vector3(x0, y, z0 + (z1 - z0) * a), new THREE.Vector3(x, y, z0), new THREE.Vector3(x, y, z1)
    );
  }
})();

function computeChecks(drop) {
  scene.updateMatrixWorld(true);
  const stackHalf = Math.max(0.25, FLANGE_R + 0.05);
  let carrierClear = Infinity, pipeClear = Infinity;
  const tmp = new THREE.Vector3(), cl = new THREE.Vector3();
  const azInv = new THREE.Matrix4().copy(azGroup.matrixWorld).invert();
  const carInv = new THREE.Matrix4().copy(carrierGroup.matrixWorld).invert();

  const test = (worldP, inflate) => {
    // Taşıyıcı boru (kendi ekseni boyunca sonsuz, eğimli)
    cl.copy(worldP).applyMatrix4(carInv);
    carrierClear = Math.min(carrierClear, Math.hypot(cl.x, cl.y) - CARRIER_R - SADDLE_T - inflate);
    // Eyer / göbek / flanş yığını (azimut çerçevesinde düşey)
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

  // Ön statik tahmin: iniş borusu üst ucunda eğilme + burulma (rüzgar, kendi ağırlık eksantrikliği)
  const g = 9.81;
  const antCenter = new THREE.Vector3(ANT.bodyD / 2, 0, 0).applyMatrix4(antenna.matrixWorld);
  const ecc = Math.hypot(antCenter.x, antCenter.z);
  const L = drop;
  const Mwind = ANT.windMax * L;
  const Mself = ANT.mass * g * ecc;
  const Mb = Math.hypot(Mwind, Mself);
  const T = ANT.windMax * ecc;
  const D = DROP_PIPE.D, d = D - 2 * DROP_PIPE.t;
  const Wb = Math.PI * (D ** 4 - d ** 4) / (32 * D);
  const sigma = Mb / Wb / 1e6, tau = T / (2 * Wb) / 1e6;
  const sigmaV = Math.sqrt(sigma ** 2 + 3 * tau ** 2);

  return { carrierClear, pipeClear, sigmaV, Mb, T, ecc };
}

function clampBomRows() {
  const rIn = mm(CLAMP_R);
  const rows = [
    [`Keçe ${mm(FELT_T)} mm, ${mm(2 * Math.PI * CARRIER_R + 0.02)}×${mm(SADDLE_L + 0.02)} (taşıyıcı ↔ kelepçe)`, 1, 0],
    [`Eyer sacı ${mm(SADDLE_T)} mm, R=${rIn} iç, 140°, L=${mm(SADDLE_L)}`, 1, (CLAMP_R + SADDLE_T / 2) * deg(140) * SADDLE_L * SADDLE_T * STEEL_DENSITY]
  ];
  if (CLAMP.type === 'shell') {
    rows.push(
      [`Üst kabuk ${mm(CLAMP.SHELL_T)} mm, R=${rIn} iç, 220°, L=${mm(SADDLE_L)}`, 1, (CLAMP_R + CLAMP.SHELL_T / 2) * deg(220) * SADDLE_L * CLAMP.SHELL_T * STEEL_DENSITY],
      [`Eyer kulağı + kabuk yan flanşı ${mm(EAR_W)}×${mm(EAR_T)}, L=${mm(SADDLE_L)}`, 4, EAR_W * EAR_T * SADDLE_L * STEEL_DENSITY],
      ['Kabuk uç berkitmesi 25×10, 210°', 2, (CARRIER_R + 0.02) * deg(210) * 0.025 * 0.010 * STEEL_DENSITY]
    );
  } else {
    rows.push(
      [`Eyer kulağı ${mm(EAR_W)}×${mm(EAR_T)}, L=${mm(SADDLE_L)}`, 2, EAR_W * EAR_T * SADDLE_L * STEEL_DENSITY],
      [`Lama çember ${mm(CLAMP.BAND_W)}×${mm(CLAMP.BAND_T)}, R=${rIn} iç, 220°`, CLAMP.BAND_Z.length, (CLAMP_R + CLAMP.BAND_T / 2) * deg(220) * CLAMP.BAND_W * CLAMP.BAND_T * STEEL_DENSITY],
      [`Çember kulağı ${mm(EAR_W)}×${mm(EAR_T)}, L=${mm(CLAMP.BAND_W)}`, CLAMP.BAND_Z.length * 2, EAR_W * EAR_T * CLAMP.BAND_W * STEEL_DENSITY]
    );
  }
  rows.push(
    [`Eyer ağ levhası ${mm(CLAMP.WEB_T)} mm, ${mm(CLAMP.WEB_H)}×${mm(CLAMP.WEB_L)}`, 2, CLAMP.WEB_H * CLAMP.WEB_L * CLAMP.WEB_T * STEEL_DENSITY],
    [`Bağlantı plakası ${mm(CLAMP.PLATE_W)}×${mm(SADDLE_L)}×${mm(PLATE_T)}`, 1, CLAMP.PLATE_W * SADDLE_L * PLATE_T * STEEL_DENSITY]
  );
  return rows;
}

function bom() {
  const dropLen = ROT_FLANGE_BOT - (pinYLocal + CLEVIS_TOP + END_PLATE.t);
  const clampBolts = CLAMP.type === 'shell' ? CLAMP.SHELL_BOLT_Z.length * 2 : CLAMP.BAND_Z.length * 2;
  const boltKg = b => b === M16 ? 0.15 : 0.08;
  const clevisArea = 2 * CLEVIS_R * CLEVIS_TOP + Math.PI * CLEVIS_R ** 2 / 2;
  return [
    ...clampBomRows(),
    [`Sabit açılı göbek ${pipeName(HUB)}, kısa kenar ${mm(HUB_MIN_H)} mm (eğik kesim)`, 1, pipeMassPerM(HUB.D, HUB.t) * hubH],
    [`Sabit flanş ${FLANGE_NAME} (4 yay kanal ±${AZ_SLOT_HALF}°, 5° taksimat)`, 1, Math.PI * FLANGE_R ** 2 * FLANGE_T * STEEL_DENSITY * 0.93],
    [`Merkez pimi Ø${mm(AZ_SPIGOT_R * 2)}, L=${mm(2 * FLANGE_T + 0.008)} (sabit flanşa kaynaklı)`, 1, Math.PI * AZ_SPIGOT_R ** 2 * (2 * FLANGE_T + 0.008) * STEEL_DENSITY],
    [`Döner flanş ${FLANGE_NAME} (8 delik Ø${mm(AZ_SLOT_W)}, 45° ara)`, 1, Math.PI * (FLANGE_R ** 2 - AZ_BUSH_R ** 2) * FLANGE_T * STEEL_DENSITY],
    [`Bronz burç Ø${mm(AZ_BUSH_R * 2)}/Ø${mm(AZ_SPIGOT_R * 2)} × ${mm(FLANGE_T)} (CuSn12)`, 1, Math.PI * (AZ_BUSH_R ** 2 - AZ_SPIGOT_R ** 2) * FLANGE_T * 8800],
    [`Azimut cıvata takımı ${AZ_BOLT.name}×${mm(AZ_BOLT_LEN)} 8.8: 2 pul + somun + kontra`, 4, AZ_BOLT === M16 ? 0.26 : 0.13],
    [`İniş borusu ${pipeName(DROP_PIPE)}, L=${mm(dropLen)}`, 1, pipeMassPerM(DROP_PIPE.D, DROP_PIPE.t) * dropLen],
    ['Berkitme 8 mm üçgen', 4, 0.5 * (FLANGE_R - 0.01 - DROP_PIPE.D / 2) * GUSSET_H * 0.008 * STEEL_DENSITY],
    [`Uç plakası ${mm(END_PLATE.w)}×${mm(END_PLATE.d)}×${mm(END_PLATE.t)}`, 1, END_PLATE.w * END_PLATE.d * END_PLATE.t * STEEL_DENSITY],
    [`Çatal levhası ${mm(CLEVIS_T)} mm, R${mm(CLEVIS_R)} alt (pim deliği + ${DOWNTILT_MAX - DOWNTILT_MIN}° tilt kanalı)`, 2, clevisArea * CLEVIS_T * STEEL_DENSITY * 0.9],
    [`Dil levhası ${mm(TONGUE.t)} mm (Ø${mm(TONGUE_HOLE.r * 2)} hafifletme deliği)`, 1, tongueArea * TONGUE.t * STEEL_DENSITY],
    [`Direk manşonu (yarık) Ø${mm(sleeveR * 2)}, L=${mm(SLEEVE_L)} + kulaklar`, 1, pipeMassPerM(sleeveR * 2, SLEEVE_T) * SLEEVE_L + 2 * 0.03 * SLEEVE_L * 0.010 * STEEL_DENSITY],
    [`Anten direği ${pipeName(MAST_PIPE)}, L=${mm(MAST_PIPE.L)}`, 1, pipeMassPerM(MAST_PIPE.D, MAST_PIPE.t) * MAST_PIPE.L],
    [`Tilt pimi Ø${mm(PIN.r * 2)} + 2 somun`, 1, IS_G ? 0.35 : 0.6],
    [`Cıvata ${CLAMP.bolt.name} (kelepçe)`, clampBolts, boltKg(CLAMP.bolt)],
    [`Cıvata ${TILT_BOLT.name} (tilt kilidi)`, 1, boltKg(TILT_BOLT)],
    ['Cıvata M12 manşon', 3, 0.08],
    [`${IS_G ? 'Gammanu' : 'Matsing'} direk kelepçesi + saplamalar (anten ile gelir)`, 2, 0]
  ];
}

// ---------------------------------------------------------------------------
// 8. ARAYÜZ
// ---------------------------------------------------------------------------
const elAz = document.getElementById('az');
const elTilt = document.getElementById('tilt');
const elDrop = document.getElementById('drop');
const elSlope = document.getElementById('slope');
let lastKey = null;

// Sekme ve modele özgü metinler
document.querySelectorAll('[data-model]').forEach(a => a.classList.toggle('active', a.dataset.model === MODEL));
// aparatlar.html içinde gömülüyken sekmeler üst çubukta; sayfanın kendi sekme çubuğu gizlenir
if (new URLSearchParams(location.search).has('embed')) document.querySelector('.tabs')?.remove();
document.title = IS_G ? 'Gammanu Askı Aparatı' : 'Matsing Askı Aparatı';
document.getElementById('h-title').textContent = IS_G ? 'Gammanu Spot Beam 30/30 · Tek Kollu Askı Aparatı' : 'Matsing 4-Beam · Tek Kollu Askı Aparatı';
document.getElementById('h-sub').innerHTML = `Çatı taşıyıcısına (çevre 132 cm, Ø420) delme/kaynak olmadan, ${CLAMP.type === 'shell'
  ? 'gövdeyi tam saran iki parçalı kelepçeyle (alt eyer + üst kabuk)'
  : 'alt eyer + iki lama çemberle'} asılır. Eksen 1: azimut (kanallı sabit flanş + merkez pimli döner flanş, 360°). Eksen 2: tilt (çatal mafsal; zemine göre öne ${TILT_FRONT}°, arkaya ${TILT_BACK}°). Kelepçe ile taşıyıcı arasında keçe. Ana model (<code>main.js</code>) değişmedi.`;
document.getElementById('az-desc').innerHTML = `
  <b>Sabit taraf:</b> bağlantı plakasının altında ${pipeName(HUB)} sabit açılı göbek var; üst ucu taşıyıcı eğiminde (ALAN 2: 5°, ALAN 1-3: 7.7°) atölyede eğik kesilir. Göbeğin altına ${FLANGE_NAME} sabit flanş kaynaklı; flanşta 4 yay kanal (±${AZ_SLOT_HALF}°) ve Ø${mm(AZ_SPIGOT_R * 2)} merkez pimi var. Bu flanş hiç dönmez ve her zaman yataydır.<br>
  <b>Dönen taraf:</b> iniş borusuna kaynaklı ${FLANGE_NAME} döner flanş, sabit flanşın altına doğrudan oturur. Merkezindeki bronz burç merkez pimine geçer; dönme ekseni budur.<br>
  <b>Bağlantı:</b> 4×${AZ_BOLT.name} 8.8 cıvata döner flanştaki deliklerden geçip sabit flanştaki kanallardan çıkar; üstte Ø${mm(AZ_BOLT.wash * 2)} pul kanalı köprüler. Altta somun + kontra somun. Sıkılınca iki flanş sürtünmeyle kilitlenir.`;
elDrop.min = DROP_RANGE.min; elDrop.max = DROP_RANGE.max; elDrop.value = DROP_RANGE.val;

function update() {
  const az = +elAz.value, tilt = +elTilt.value, drop = +elDrop.value / 1000, slope = +elSlope.value;
  document.getElementById('v-az').textContent = `${az}°`;
  document.getElementById('v-tilt').textContent = `${tilt}°`;
  document.getElementById('v-drop').textContent = `${mm(drop)} mm`;
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
  const azCap = 4 * AZ_BOLT.preload * AZ_FRICTION * AZ_BOLT_R;
  const holeNames = bs.set === 0 ? '0° / 90° / 180° / 270°' : '45° / 135° / 225° / 315°';
  document.getElementById('az-state').innerHTML = `
    Kullanılan delikler (döner flanş): <b>${holeNames}</b><br>
    Cıvata kanal ortasından <b>${bs.off > 0 ? '+' : ''}${bs.off.toFixed(0)}°</b> (kanal ±${AZ_SLOT_HALF}°)<br>
    Sürtünme kapasitesi 4×${AZ_BOLT.name} 8.8, μ=${AZ_FRICTION}: <b class="${cls(azCap / Math.max(c.T, 1), 2)}">${(azCap / 1000).toFixed(1)} kNm</b>
    ≥ rüzgar burulması ${(c.T / 1000).toFixed(2)} kNm`;
  document.getElementById('checks').innerHTML = `
    <div>Anten/direk → taşıyıcı ve flanş: <b class="${cls(c.carrierClear, 0.05)}">${mm(c.carrierClear)} mm</b></div>
    <div>Anten/direk → iniş borusu: <b class="${cls(c.pipeClear, 0.03)}">${Number.isFinite(c.pipeClear) ? mm(c.pipeClear) + ' mm' : 'yan yana değil'}</b></div>
    <div>Anten merkezi eksantrikliği: ${mm(c.ecc)} mm</div>
    <div>Kelepçe kesitinde eğilme: ${(c.Mb / 1000).toFixed(2)} kNm · burulma: ${(c.T / 1000).toFixed(2)} kNm</div>
    <div>İniş borusu σv ≈ <b class="${cls(156 - c.sigmaV, 0)}">${c.sigmaV.toFixed(0)} MPa</b> (S235 / 1.5 = 156)</div>
    <div style="color:#94a3b8;margin-top:4px">Ön tahmin: ${ANT.windNote} + öz ağırlık. Statik hesabın yerine geçmez.</div>`;

  const rows = bom();
  let total = ANT.mass;
  document.getElementById('bom').innerHTML = rows.map(([n, q, kg]) => {
    total += q * kg;
    return `<tr><td>${n}</td><td class="n">${q} ad.</td><td class="n">${kg ? (q * kg).toFixed(1) + ' kg' : '–'}</td></tr>`;
  }).join('') + `<tr><td><b>Toplam (anten ${ANT.mass} kg dahil)</b></td><td></td><td class="n"><b>${total.toFixed(1)} kg</b></td></tr>`;
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

const target = IS_G ? new THREE.Vector3(0.2, -0.7, 0) : new THREE.Vector3(0.3, -1.0, 0);
const VIEWS = IS_G ? {
  iso: new THREE.Vector3(1.9, 0.2, 1.9),
  front: new THREE.Vector3(3.0, -0.7, 0),
  side: new THREE.Vector3(0.2, -0.7, 3.0),
  top: new THREE.Vector3(0.2, 2.6, 0.001)
} : {
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
    camera.position.copy(p).add(new THREE.Vector3(0.62, exp ? 0.12 : 0.08, 0.52).multiplyScalar(IS_G ? 0.85 : 1));
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
window.matsingAparat = { model: MODEL, scene, carrierGroup, levelHead, azGroup, tiltGroup, antenna, computeChecks };
