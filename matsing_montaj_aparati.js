// Tek kollu, 2 eksenli çatı taşıyıcısı anten askı aparatı. İki sekme (model):
//   ?model=matsing  → Matsing MS-MBA-4.4.2-F4-H2-L2 (51.5 kg), gövdeyi tam saran kelepçe
//   ?model=gammanu  → Gammanu Spot Beam 30/30 DOY15X3030MD4TRE (16.5 kg), iki lama çember, küçültülmüş parçalar
// Ana uygulamadan (main.js) bağımsız çalışma alanı: matsing_montaj_aparati.html
//
// Koordinatlar (m): taşıyıcı boru ekseni Z boyunca, Y = 0'da. Azimut 0° iken anten +X'e bakar.
// Eğim mafsalı:   taşıyıcı eğimine göre sahada ayarlanır (±15°, pim + kanal kilidi), terazi başlığı hep yatay.
// Eksen 1 (azimut): terazi başlığına kaynaklı kanallı sabit flanş + altına oturan döner flanş, merkez pimi
//                   (bronz burç) etrafında düşey eksende döner; 4 cıvata sıkılınca sürtünmeyle kilitlenir.
// Eksen 2 (tilt):   iniş borusunun ucundaki çatal mafsal, yatay pim (azimut çerçevesinde Z ekseni).
// Taşıyıcıya delme/kaynak yok: kelepçe cıvatalı (bkz. AJAN_DEVIR.md Kalıcı Kararlar).

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { enableWasd } from './aparat_wasd.js';
import { createAntennaHanger } from './anten_aski_modeli.js';

const MODEL = new URLSearchParams(location.search).get('model') === 'gammanu' ? 'gammanu' : 'matsing';
const IS_G = MODEL === 'gammanu';

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

// ---------------------------------------------------------------------------
// APARAT (geometri anten_aski_modeli.js içinde; ana model de aynı modülü kullanır)
// ---------------------------------------------------------------------------
const H = createAntennaHanger(MODEL);
scene.add(H.root);
const { carrier, carrierGroup, levelHead, azGroup, tiltGroup, antenna, labels, computeChecks, bom, azBoltState } = H;
const { ANT, CLAMP, FLANGE_R, FLANGE_T, FLANGE_NAME, FIX_FLANGE_TOP, AZ_BOLT, AZ_BOLT_R, AZ_SLOT_HALF, AZ_SPIGOT_R,
  AZ_FRICTION, SLOPE_MAX, TILT_FRONT, TILT_BACK, DROP_RANGE } = H.C;
const deg = THREE.MathUtils.degToRad;
const mm = v => Math.round(v * 1000);

// ---------------------------------------------------------------------------
// 8. ARAYÜZ
// ---------------------------------------------------------------------------
const elAz = document.getElementById('az');
const elTilt = document.getElementById('tilt');
const elDrop = document.getElementById('drop');
const elSlope = document.getElementById('slope');

// Açıklama / kontrol / parça listesi bölümleri sayfadan kaldırıldı (2026-11-02): eleman yoksa yazılan metin boşa gider
const panelEl = id => document.getElementById(id) || document.createElement('div');

// Sekme ve modele özgü metinler
document.querySelectorAll('[data-model]').forEach(a => a.classList.toggle('active', a.dataset.model === MODEL));
// aparatlar.html içinde gömülüyken sekmeler üst çubukta; sayfanın kendi sekme çubuğu gizlenir
if (new URLSearchParams(location.search).has('embed')) document.querySelector('.tabs')?.remove();
document.title = IS_G ? 'Gammanu Askı Aparatı' : 'Matsing Askı Aparatı';
document.getElementById('h-title').textContent = IS_G ? 'Gammanu Spot Beam 30/30 · Tek Kollu Askı Aparatı' : 'Matsing 4-Beam · Tek Kollu Askı Aparatı';
document.getElementById('h-sub').innerHTML = `Çatı taşıyıcısına (çevre 132 cm, Ø420) delme/kaynak olmadan, ${CLAMP.type === 'shell'
  ? 'gövdeyi tam saran iki parçalı kelepçeyle (alt eyer + üst kabuk)'
  : 'alt eyer + iki lama çemberle'} asılır. Eksen 1: azimut (kanallı sabit flanş + merkez pimli döner flanş, 360°). Eksen 2: tilt (çatal mafsal; zemine göre öne ${TILT_FRONT}°, arkaya ${TILT_BACK}°). Kelepçe ile taşıyıcı arasında keçe. Ana model (<code>main.js</code>) değişmedi.`;
panelEl('az-desc').innerHTML = `
  <b>Sabit taraf:</b> bağlantı plakasının altındaki eğim mafsalında (pim + kanal kilidi, ±${SLOPE_MAX}°) terazi başlığı yer çekimiyle düşeye gelip kilitlenir. Başlığın tabanı ${FLANGE_NAME} sabit flanş; flanşta 4 yay kanal (±${AZ_SLOT_HALF}°) ve Ø${mm(AZ_SPIGOT_R * 2)} merkez pimi var. Bu flanş hiç dönmez ve her zaman yataydır.<br>
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
  const bs = H.setState({ az, tilt, drop, slope, explode });

  const c = computeChecks(drop);
  const cls = (v, lim) => v >= lim ? 'ok' : 'bad';
  const azCap = 4 * AZ_BOLT.preload * AZ_FRICTION * AZ_BOLT_R;
  const holeNames = bs.set === 0 ? '0° / 90° / 180° / 270°' : '45° / 135° / 225° / 315°';
  panelEl('az-state').innerHTML = `
    Kullanılan delikler (döner flanş): <b>${holeNames}</b><br>
    Cıvata kanal ortasından <b>${bs.off > 0 ? '+' : ''}${bs.off.toFixed(0)}°</b> (kanal ±${AZ_SLOT_HALF}°)<br>
    Sürtünme kapasitesi 4×${AZ_BOLT.name} 8.8, μ=${AZ_FRICTION}: <b class="${cls(azCap / Math.max(c.T, 1), 2)}">${(azCap / 1000).toFixed(1)} kNm</b>
    ≥ rüzgar burulması ${(c.T / 1000).toFixed(2)} kNm`;
  panelEl('checks').innerHTML = `
    <div>Anten/direk → taşıyıcı ve flanş: <b class="${cls(c.carrierClear, 0.05)}">${mm(c.carrierClear)} mm</b></div>
    <div>Anten/direk → iniş borusu: <b class="${cls(c.pipeClear, 0.03)}">${Number.isFinite(c.pipeClear) ? mm(c.pipeClear) + ' mm' : 'yan yana değil'}</b></div>
    <div>Anten merkezi eksantrikliği: ${mm(c.ecc)} mm</div>
    <div>Kelepçe kesitinde eğilme: ${(c.Mb / 1000).toFixed(2)} kNm · burulma: ${(c.T / 1000).toFixed(2)} kNm</div>
    <div>İniş borusu σv ≈ <b class="${cls(156 - c.sigmaV, 0)}">${c.sigmaV.toFixed(0)} MPa</b> (S235 / 1.5 = 156)</div>
    <div style="color:#94a3b8;margin-top:4px">Ön tahmin: ${ANT.windNote} + öz ağırlık. Statik hesabın yerine geçmez.</div>`;

  const rows = bom();
  let total = ANT.mass;
  panelEl('bom').innerHTML = rows.map(([n, q, kg]) => {
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
document.getElementById('t-lbl').addEventListener('change', e => H.setLabelsVisible(e.target.checked));
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
window.matsingAparat = { model: MODEL, scene, camera, controls, carrierGroup, levelHead, azGroup, tiltGroup, antenna, computeChecks, hanger: H };
