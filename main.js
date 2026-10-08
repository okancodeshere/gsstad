import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Polyfill for CanvasRenderingContext2D.prototype.roundRect
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r = 0) {
    const radius = typeof r === 'number' ? Math.min(r, w / 2, h / 2) : 0;
    this.beginPath();
    this.moveTo(x + radius, y);
    this.arcTo(x + w, y, x + w, y + h, radius);
    this.arcTo(x + w, y + h, x, y + h, radius);
    this.arcTo(x, y + h, x, y, radius);
    this.arcTo(x, y, x + w, y, radius);
    this.closePath();
  };
}

// Application State
const state = {
  alan1Platforms: [],
  alan2Platforms: [],
  alan3Platforms: [],
  alan4Platforms: [],
  selectedObject: null,
  viewMode: 'persp', // 'persp' or 'ortho'
  nextId: 1,
  axisLockZ: true, // Lock Z position by default for sliding along X axis
  currentArea: 'alan4'
};

// Dimensions conversion (1 unit in 3D = 1 meter)
const cmToM = (cm) => cm / 100;
const mToCm = (m) => Math.round(m * 100);

// Excel Equipment Catalog Data
const EQUIPMENT_CATALOG = [
  // Turkcell
  { id: 'turkcell-4485', category: 'Turkcell', name: 'LTE RRU4485 - 4G', width: 0.398, height: 0.533, depth: 0.145, weight: 25, color: '#1d4ed8' },
  { id: 'turkcell-8863', category: 'Turkcell', name: 'NR RR8863 – 5G', width: 0.375, height: 0.478, depth: 0.155, weight: 25, color: '#1d4ed8' },
  { id: 'turkcell-2219', category: 'Turkcell', name: 'GSM 2219 B8', width: 0.343, height: 0.466, depth: 0.154, weight: 20, color: '#1d4ed8' },

  // Vodafone
  { id: 'vodafone-5526et', category: 'Vodafone', name: 'RRU5526et', width: 0.356, height: 0.480, depth: 0.125, weight: 22, color: '#dc2626' },
  { id: 'vodafone-5818w', category: 'Vodafone', name: 'RRU5818w', width: 0.356, height: 0.480, depth: 0.140, weight: 25, color: '#dc2626' },
  { id: 'vodafone-5526t', category: 'Vodafone', name: 'RRU5526t', width: 0.432, height: 0.480, depth: 0.135, weight: 28, color: '#dc2626' },
  { id: 'vodafone-5517t', category: 'Vodafone', name: 'RRU5517t', width: 0.480, height: 0.520, depth: 0.140, weight: 34, color: '#dc2626' },

  // Türk Telekom
  { id: 'tt-5527', category: 'Türk Telekom', name: '2G-3G-4G RRU5527', width: 0.356, height: 0.480, depth: 0.140, weight: 25, color: '#0891b2' },
  { id: 'tt-5818w', category: 'Türk Telekom', name: 'NR RRU 5818W', width: 0.356, height: 0.480, depth: 0.140, weight: 25, color: '#0891b2' },

  // POI PROSE (Only CB-12 Models)
  { id: 'prose-a11', category: 'POI', name: 'CB-12-POI-64F-A11 (Legacy POI)', width: 0.400, height: 0.350, depth: 0.260, weight: 22, color: '#ea580c' },
  { id: 'prose-a12', category: 'POI', name: 'CB-12-POI-64F-A12 (5G NR POI)', width: 0.400, height: 0.350, depth: 0.260, weight: 22, color: '#ea580c' },

  // Canovate Rack Cabinets
  { id: 'canovate-42u-double-frame', category: 'Canovate', name: '42U İkili Çerçeve Açık Sistem Kabin (CSL-X-42YYA2)', width: 0.600, height: 2.0933, depth: 0.700, weight: 58, color: '#d4d8dd' },

  // Outdoor Rectifier DC Power Cabinets
  { id: 'rectifier-20u-eltek', category: 'Rectifier', name: '20U Outdoor DC Güç Kaynağı (Eltek Flatpack2 24kW)', width: 0.600, height: 1.300, depth: 0.600, weight: 100, color: '#cbd5e1' },
  { id: 'rectifier-turkcell-double', category: 'Rectifier', name: 'Turkcell Çift Bölmeli Outdoor Güç Kabini (1500x1070x750)', width: 1.500, height: 1.070, depth: 0.750, weight: 275, color: '#e2e8f0' },
  { id: 'rectifier-mts9304a', category: 'Rectifier', name: 'MTS9304A-HX10AX 12U Outdoor Rectifier Kabini', width: 0.650, height: 1.250, depth: 0.650, weight: 80, color: '#e2e8f0' },

  // Matsing Multi-Beam Lens Antennas
  { id: 'matsing-4-beam', category: 'Matsing', name: 'Matsing 4-Beam Lens Anten (MS-MBA-4.4.2)', width: 0.617, height: 1.635, depth: 0.721, weight: 51, color: '#0284c7' }
];

// Setup Three.js Scene
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
window.scene = scene;
window.state = state;
window.THREE = THREE;
scene.background = new THREE.Color(0xf1f5f9); // Clean light grey background

// Add Grid & Helpers (High contrast)
const gridHelper = new THREE.GridHelper(100, 100, 0x94a3b8, 0xcb2e3e);
gridHelper.position.y = -1.5;
scene.add(gridHelper);

// Add 3D Axes Helper (X = Red, Y = Green, Z = Blue)
const axesHelper = new THREE.AxesHelper(3);
axesHelper.position.set(0, 0, 0);
axesHelper.visible = false; // Default: kapalı
scene.add(axesHelper);

// Camera Setup
const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
camera.position.set(5, 5, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = false; // NO SHADOWS
container.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI - 0.01; // Çatı ve kedi yoluna alttan/yukarıdan serbest bakış açısı
controls.minPolarAngle = 0.01;
controls.screenSpacePanning = true; // Sağ tık ile ekranda serbest kaydırma
controls.enableKeys = false; // OrbitControls ok tuşlarını devre dışı bırak (seçili blokları ok tuşlarıyla taşımak için)
controls.enableRotate = false; // Serbest bakış açısı doğrudan akıcı First-Person Look sistemiyle yönetilir (takılma olmaz)
controls.enableZoom = false;   // Akıcı tekerlek uçuşu doğrudan yönetilir
controls.enablePan = false;    // Sağ tık ekranda kaydırma doğrudan yönetilir

// Serbest Uçuş ve Akıcı Açı Değiştirme (First-Person Look) Euler Durumu
const cameraEuler = new THREE.Euler(0, 0, 0, 'YXZ');
function syncCameraEuler() {
  cameraEuler.setFromQuaternion(camera.quaternion, 'YXZ');
}

function updateCameraDirectionTarget() {
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  controls.target.copy(camera.position).addScaledVector(forward, 10);
}

function setCameraView(posX, posY, posZ, targetX, targetY, targetZ) {
  camera.position.set(posX, posY, posZ);
  controls.target.set(targetX, targetY, targetZ);
  camera.lookAt(controls.target);
  syncCameraEuler();
  updateCameraDirectionTarget();
}
window.setCameraView = setCameraView;
window.camera = camera;
window.controls = controls;

camera.lookAt(controls.target);
syncCameraEuler();
updateCameraDirectionTarget();

// Lighting (Bright, evenly distributed)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 20, 15);
dirLight.castShadow = false; // NO SHADOWS
scene.add(dirLight);

const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.5); // extra fill light
dirLight2.position.set(-10, 5, -10);
scene.add(dirLight2);

// [Eski Alan 1 Kedi Yolu kodu silindi - Alan 1 ve Alan 3 bünyesine dahil edildi]



// Scoreboard High-Resolution Canvas Texture Generator (Galatasaray SK Rams Park Theme - 13m x 8m)
function createScoreboardTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1260; // 1.625:1 aspect ratio matching 13m x 8m
  const ctx = canvas.getContext('2d');

  function render(logoImg) {
    // 1. Background - Derin lüks stadyum LED ekran matrisi
    const bgGrad = ctx.createRadialGradient(1024, 630, 80, 1024, 630, 1200);
    bgGrad.addColorStop(0, '#151b27');
    bgGrad.addColorStop(0.5, '#0b0f17');
    bgGrad.addColorStop(1, '#040609');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 2048, 1260);

    // İnce LED nokta matris deseni
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let x = 6; x < 2048; x += 12) {
      for (let y = 6; y < 1260; y += 12) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Logo arkasında sıcak sarı-kırmızı stadyum aurası / ışıması
    const glowGrad = ctx.createRadialGradient(1024, 610, 50, 1024, 610, 560);
    glowGrad.addColorStop(0, 'rgba(253, 185, 19, 0.25)');
    glowGrad.addColorStop(0.35, 'rgba(165, 0, 33, 0.20)');
    glowGrad.addColorStop(0.7, 'rgba(165, 0, 33, 0.05)');
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(1024, 610, 560, 0, Math.PI * 2);
    ctx.fill();

    // Dış Kenarlık - Çift Sıra Galatasaray Kırmızı & Altın Sarı Neon Çerçeve
    ctx.strokeStyle = '#a50021';
    ctx.lineWidth = 14;
    ctx.strokeRect(16, 16, 2016, 1228);

    ctx.strokeStyle = '#fdb913';
    ctx.lineWidth = 6;
    ctx.strokeRect(26, 26, 1996, 1208);

    // Köşe Vurguları (Altın Sarı L-braketler)
    const cSize = 60;
    ctx.strokeStyle = '#fdb913';
    ctx.lineWidth = 8;
    // Sol Üst
    ctx.beginPath(); ctx.moveTo(40, 40 + cSize); ctx.lineTo(40, 40); ctx.lineTo(40 + cSize, 40); ctx.stroke();
    // Sağ Üst
    ctx.beginPath(); ctx.moveTo(2008 - cSize, 40); ctx.lineTo(2008, 40); ctx.lineTo(2008, 40 + cSize); ctx.stroke();
    // Sol Alt
    ctx.beginPath(); ctx.moveTo(40, 1220 - cSize); ctx.lineTo(40, 1220); ctx.lineTo(40 + cSize, 1220); ctx.stroke();
    // Sağ Alt
    ctx.beginPath(); ctx.moveTo(2008 - cSize, 1220); ctx.lineTo(2008, 1220); ctx.lineTo(2008, 1220 - cSize); ctx.stroke();

    // Logonun Üzerinde 5 Altın Şampiyonluk Yıldızı (5. Yıldız Zirvede)
    const starCount = 5;
    const starBaseY = 145;
    const starSpacing = 88;
    const startX = 1024 - ((starCount - 1) * starSpacing) / 2;

    function drawStar(cx, cy, spikes, outerRadius, innerRadius) {
      let rot = (Math.PI / 2) * 3;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;

      ctx.beginPath();
      ctx.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
      }
      ctx.lineTo(cx, cy - outerRadius);
      ctx.closePath();

      const starGrad = ctx.createLinearGradient(cx - outerRadius, cy - outerRadius, cx + outerRadius, cy + outerRadius);
      starGrad.addColorStop(0, '#ffffff');
      starGrad.addColorStop(0.25, '#fff0a6');
      starGrad.addColorStop(0.65, '#fdb913');
      starGrad.addColorStop(1, '#b45309');
      ctx.fillStyle = starGrad;
      ctx.shadowColor = 'rgba(253, 185, 19, 0.9)';
      ctx.shadowBlur = 24;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 5 Yıldız Kavisli Dizilim (Merkezdeki 5. Yıldız hafif büyük ve zirvede)
    for (let s = 0; s < starCount; s++) {
      const sX = startX + s * starSpacing;
      const distFromCenter = Math.abs(s - 2);
      // Kavis hesaplama: Merkez (s=2) en yüksekte (-22px), dışlar aşağıda (+10px)
      const arcOffset = distFromCenter === 0 ? -22 : (distFromCenter === 1 ? -8 : 10);
      const starRadius = distFromCenter === 0 ? 32 : 27;
      const innerRadius = distFromCenter === 0 ? 15 : 12.5;
      drawStar(sX, starBaseY + arcOffset, 5, starRadius, innerRadius);
    }

    // Yüksek Çözünürlüklü Resmi Galatasaray Logosu
    if (logoImg) {
      const logoH = 880;
      const logoW = logoH * (391.2 / 512.16); // ~672px
      const logoX = 1024 - logoW / 2;
      const logoY = 220;

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 16;
      ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);
      ctx.restore();
    }

    // Alt Kısımda Zarif Tipografi
    ctx.fillStyle = 'rgba(253, 185, 19, 0.9)';
    ctx.font = '800 36px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GALATASARAY', 1024, 1150);
  }

  // İlk çizim (arka plan, yıldızlar, çerçeve)
  render(null);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;

  // Logoyu /galatasaray_logo.svg üzerinden yüksek çözünürlüklü yükle
  const img = new Image();
  img.onload = () => {
    render(img);
    texture.needsUpdate = true;
  };
  img.src = '/galatasaray_logo.svg';

  return texture;
}

// Generate Alan 4 Representation (Scoreboard: 13m x 8m, 1.5m Çaplı Çift Boru + 72cm Boşluk + 2.6m Genişliğinde Tek Kat Kedi Yolu)

// Procedural Perforated Metal Texture Generator (Rüzgar Geçirgen Delikli Perfore Sac)
function createPerforatedMetalTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Base metallic surface: Anodized aluminum / galvanized steel color
  ctx.fillStyle = '#788494';
  ctx.fillRect(0, 0, 256, 256);

  // Subtle metallic brushing noise
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  for (let i = 0; i < 400; i++) {
    const rx = Math.random() * 256;
    const ry = Math.random() * 256;
    ctx.fillRect(rx, ry, 2, 2);
  }

  // Punched circular perforations in staggered 60° triangular pitch
  // StepX = 32, StepY = 25.6 gives exact seamless tiling on 256x256 (8 cols, 10 rows)
  const stepX = 32;
  const stepY = 25.6;
  const holeRadius = 10.0; // ~40% wind airflow permeability

  // Cut out transparent holes
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = '#000000';
  for (let y = -stepY; y <= 256 + stepY; y += stepY) {
    const row = Math.round(y / stepY);
    const offsetX = (row % 2 !== 0) ? stepX / 2 : 0;
    for (let x = -stepX; x <= 256 + stepX; x += stepX) {
      ctx.beginPath();
      ctx.arc(x + offsetX, y, holeRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw punch-die edge bevels / darker rim for authentic 3D sheet metal depth
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = 'rgba(30, 41, 59, 0.7)';
  ctx.lineWidth = 1.4;
  for (let y = -stepY; y <= 256 + stepY; y += stepY) {
    const row = Math.round(y / stepY);
    const offsetX = (row % 2 !== 0) ? stepX / 2 : 0;
    for (let x = -stepX; x <= 256 + stepX; x += stepX) {
      ctx.beginPath();
      ctx.arc(x + offsetX, y, holeRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

// Procedural Cable Tray Perforated Bottom Texture Generator (Yağmur Suyu Drenaj Delikli Galvaniz Sac)
function createCableTrayPerforatedTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Taban sıcak daldırma galvaniz çelik rengi
  ctx.fillStyle = '#a4b0be';
  ctx.fillRect(0, 0, 512, 512);

  // Galvaniz çinko pul / gren dokusu
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  for (let i = 0; i < 600; i++) {
    const rx = Math.random() * 512;
    const ry = Math.random() * 512;
    ctx.fillRect(rx, ry, Math.random() * 4 + 1, Math.random() * 4 + 1);
  }

  // Yağmur suyu drenaj delikleri (Oval uzun yarıklar - 16px genişlik, 46px uzunluk)
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = '#000000';

  const slotW = 16;
  const slotH = 46;
  const rad = 8;
  const cols = 8;
  const rows = 8;
  const colSpacing = 64;
  const rowSpacing = 64;

  for (let r = 0; r < rows; r++) {
    const offsetX = (r % 2 === 1) ? colSpacing / 2 : 0;
    for (let c = 0; c < cols; c++) {
      const x = (c * colSpacing + offsetX + 16) % 512;
      const y = r * rowSpacing + 9;
      ctx.beginPath();
      ctx.roundRect(x, y, slotW, slotH, rad);
      ctx.fill();
    }
  }

  // Pres baskı çapak/pah kenar derinliği
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = 'rgba(30, 41, 59, 0.75)';
  ctx.lineWidth = 2.0;

  for (let r = 0; r < rows; r++) {
    const offsetX = (r % 2 === 1) ? colSpacing / 2 : 0;
    for (let c = 0; c < cols; c++) {
      const x = (c * colSpacing + offsetX + 16) % 512;
      const y = r * rowSpacing + 9;
      ctx.beginPath();
      ctx.roundRect(x, y, slotW, slotH, rad);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

// 40 Adet 7/8" Feeder + 16 Adet 2x25 mm² Enerji Kablosu Demeti Üretici
// Feeder: 40 adet, r = 13.5mm (OD ~27-28mm). 10 sütun x 4 katman (Tava/Merdiven Sol Bölümü)
// Enerji: 16 adet, r = 10.5mm (OD ~21mm). 4 sütun x 4 katman (Tava/Merdiven Sağ Bölümü)
// Kullanıcı İsteği: "Betondan gelen 48 7/8 feeder kabloyu 40a düşür ve antenlere 20 20 dagıtacak şekilde revize et"
function getTelecomCableBundleConfigs() {
  const feederMat = new THREE.MeshStandardMaterial({
    color: 0x181a1e, // 7/8" UV korumalı mat siyah dış kılıf
    roughness: 0.65,
    metalness: 0.15
  });

  const powerMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7, // 2x25 mm² DC güç mavi dış kılıf
    roughness: 0.55,
    metalness: 0.20
  });

  const configs = [];

  // A) 40 Adet 7/8" Feeder Kablosu (10 sütun x 4 katman = 40 adet)
  const feederRadius = 0.0135;
  const feederStartX = -0.21;
  const feederEndX = 0.03;
  const feederCols = 10;
  const feederTiers = 4;

  for (let c = 0; c < feederCols; c++) {
    const x = feederStartX + c * ((feederEndX - feederStartX) / (feederCols - 1));
    for (let t = 1; t <= feederTiers; t++) {
      const cableIndex = (t - 1) * feederCols + c + 1;
      configs.push({
        type: 'feeder',
        name: `7/8" Feeder #${cableIndex} (Kat ${t})`,
        x: x,
        tier: t,
        r: feederRadius,
        mat: feederMat
      });
    }
  }

  // B) 16 Adet 2x25 mm² Enerji Kablosu (4 sütun x 4 katman = 16 adet)
  const powerRadius = 0.0105;
  const powerStartX = 0.10;
  const powerEndX = 0.21;
  const powerCols = 4;
  const powerTiers = 4;

  for (let c = 0; c < powerCols; c++) {
    const x = powerStartX + c * ((powerEndX - powerStartX) / (powerCols - 1));
    for (let t = 1; t <= powerTiers; t++) {
      const cableIndex = (t - 1) * powerCols + c + 1;
      configs.push({
        type: 'power',
        name: `2x25mm² Enerji #${cableIndex} (Kat ${t})`,
        x: x,
        tier: t,
        r: powerRadius,
        mat: powerMat
      });
    }
  }

  return configs;
}

// Generate Alan 2 Representation (Tribün Üstü Taşıyıcı Beton Alan)
const alan2SlidingDoors = [];
const alan4SlidingDoors = [];
const alan3SlidingDoors = [];

function buildAlan2Instance(parentGroup, offsetX, offsetZ) {
  const alan2Group = new THREE.Group();
  alan2Group.position.set(offsetX, 0, offsetZ);

  // Concrete floor
  const floorWidth = 2.0; 
  const floorLength = 30.0; 
  const floorThickness = 0.4; 

  const concreteMat = new THREE.MeshStandardMaterial({ 
    color: 0x6e7072, 
    roughness: 0.9,
    metalness: 0.1
  });

  const floorGeo = new THREE.BoxGeometry(floorLength, floorThickness, floorWidth);
  const floor = new THREE.Mesh(floorGeo, concreteMat);
  floor.position.set(0, -floorThickness / 2, -floorWidth / 2);
  floor.receiveShadow = true;
  alan2Group.add(floor);

  // Glass railing along Z = 0 edge (facing the tribune)
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x99ccff,
    transparent: true,
    opacity: 0.45,
    roughness: 0.1,
    metalness: 0.6,
    side: THREE.DoubleSide
  });

  const postMat = new THREE.MeshStandardMaterial({
    color: 0x444444,
    roughness: 0.6,
    metalness: 0.8
  });

  const postWidth = 0.05;
  const postDepth = 0.08;
  const glassThickness = 0.02;

  // -------------------------------------------------------------
  // 11 Metrelik Özel Korumalı Alan (170 cm Yükseklik)
  // X = -5.5 ile X = +5.5 arası (Toplam 11 metre)
  // 0 referanslı direğin sağ ve sol direklerinin iç kesimlerini kapsar
  // 3 cephesi (Sol, Sağ, Arka) 170cm Cam ile kapalı
  // Z+ Ön Cephesi (tribüne bakan cephe) rüzgar geçirgenliği için Delikli Perfore Metal Sac (6 adet 150cm kademeli kayar kapı + 2 adet 1m sabit panel)
  // -------------------------------------------------------------
  const encMinX = -5.5;
  const encMaxX = 5.5;
  const encFrontZ = -0.05;
  const encBackZ = -1.95;
  const encGlassH = 1.70; // 170 cm panel yüksekliği
  const encPostH = 1.75;

  // Delikli Perfore Metal Malzeme ve Doku Üreteci (Rüzgar Yükünü Düşüren ~%40 Geçirgenlik)
  const perforatedTex = createPerforatedMetalTexture();
  const createPerforatedMat = (wMeters, hMeters) => {
    const tex = perforatedTex.clone();
    tex.needsUpdate = true;
    const repX = Math.max(1, Math.round(wMeters * 4));
    const repY = Math.max(1, Math.round(hMeters * 4));
    tex.repeat.set(repX, repY);
    return new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.25,
      metalness: 0.85,
      roughness: 0.35,
      color: 0x94a3b8, // Galvaniz perfore metal sac görünümü
      side: THREE.DoubleSide
    });
  };

  // Standart korkuluk (enclosure dışındaki alanlar: X < -5.5 ve X > +5.5)
  const stdGlassH = 1.10;
  const stdPostH = 1.20;

  // 1. ÖN CEPHE (Tribüne bakan cephe, Z = -0.05)
  // A) Sol Dış Bölüm: X = -15.0'den X = -5.5'e (1.1m standart cam)
  const leftRailLen = Math.abs(encMinX - (-floorLength / 2)); // 9.5m
  const leftNumPosts = Math.round(leftRailLen / 1.5) + 1;
  const leftSpacing = leftRailLen / (leftNumPosts - 1);
  for (let i = 0; i < leftNumPosts - 1; i++) {
    const xPos = -floorLength / 2 + i * leftSpacing;
    const postGeo = new THREE.BoxGeometry(postWidth, stdPostH, postDepth);
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(xPos, stdPostH / 2, encFrontZ);
    post.castShadow = true;
    alan2Group.add(post);

    const panelW = leftSpacing - postWidth;
    const glassGeo = new THREE.BoxGeometry(panelW, stdGlassH, glassThickness);
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.set(xPos + leftSpacing / 2, stdGlassH / 2 + 0.05, encFrontZ);
    alan2Group.add(glass);
  }

  // B) Sağ Dış Bölüm: X = +5.5'ten X = +15.0'e (1.1m standart cam)
  const rightRailLen = Math.abs(floorLength / 2 - encMaxX); // 9.5m
  const rightNumPosts = Math.round(rightRailLen / 1.5) + 1;
  const rightSpacing = rightRailLen / (rightNumPosts - 1);
  for (let i = 0; i < rightNumPosts; i++) {
    const xPos = encMaxX + i * rightSpacing;
    if (i > 0) {
      const postGeo = new THREE.BoxGeometry(postWidth, stdPostH, postDepth);
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(xPos, stdPostH / 2, encFrontZ);
      post.castShadow = true;
      alan2Group.add(post);
    }
    if (i < rightNumPosts - 1) {
      const panelW = rightSpacing - postWidth;
      const glassGeo = new THREE.BoxGeometry(panelW, stdGlassH, glassThickness);
      const glass = new THREE.Mesh(glassGeo, glassMat);
      glass.position.set(xPos + rightSpacing / 2, stdGlassH / 2 + 0.05, encFrontZ);
      alan2Group.add(glass);
    }
  }

  // C) 11 Metrelik Bölümün Z+ Ön Cephesi: Kademeli Kayar Kapı Sistemi (6 Adet 150cm Kapı + Kenarlarda 1m Sabit Panel)
  // Toplam açıklık: 11.0 metre (X = -5.5 ile X = +5.5 arası)
  // Kenarlar: X = [-5.5, -4.5] (1.0m) ve X = [+4.5, +5.5] (1.0m) rüzgar geçirgen delikli perfore paneller
  // Orta kayar alan: X = [-4.5, +4.5] (9.0m) -> 6 adet 1.50m genişliğinde kademeli kayar perfore kapı

  const doorTrackMat = new THREE.MeshStandardMaterial({
    color: 0x828b96,
    metalness: 0.85,
    roughness: 0.25
  });

  const doorFrameMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    metalness: 0.8,
    roughness: 0.3
  });

  const doorHandleMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.9,
    roughness: 0.15
  });

  // 1. Üst Taşıyıcı Çift Ray Profili (Header Track Profile)
  const topTrackGeo = new THREE.BoxGeometry(encMaxX - encMinX, 0.06, 0.10);
  const topTrack = new THREE.Mesh(topTrackGeo, doorTrackMat);
  topTrack.position.set(0, encGlassH + 0.03, -0.05);
  topTrack.castShadow = true;
  alan2Group.add(topTrack);

  // 2. Alt Zemin Kılavuz Rayı (Floor Guide Track)
  const floorTrackGeo = new THREE.BoxGeometry(encMaxX - encMinX, 0.015, 0.08);
  const floorTrack = new THREE.Mesh(floorTrackGeo, doorTrackMat);
  floorTrack.position.set(0, 0.0075, -0.05);
  floorTrack.receiveShadow = true;
  alan2Group.add(floorTrack);

  // 3. Kenar Sabit Paneller (1.0m genişliğinde rüzgar geçirgen delikli metal perfore paneller)
  // A) Sol Sabit Panel: X = -5.5 ile X = -4.5 arası
  const fixedPostGeo = new THREE.BoxGeometry(postWidth, encPostH, postDepth);
  const fixedLeftPost1 = new THREE.Mesh(fixedPostGeo, postMat);
  fixedLeftPost1.position.set(encMinX, encPostH / 2, encFrontZ);
  alan2Group.add(fixedLeftPost1);

  const fixedLeftPost2 = new THREE.Mesh(fixedPostGeo, postMat);
  fixedLeftPost2.position.set(-4.5, encPostH / 2, encFrontZ);
  alan2Group.add(fixedLeftPost2);

  const fixedPanelW = 1.0 - postWidth;
  const fixedPerforatedMat = createPerforatedMat(fixedPanelW, encGlassH);
  const fixedPanelGeo = new THREE.PlaneGeometry(fixedPanelW, encGlassH);

  const fixedLeftPanel = new THREE.Mesh(fixedPanelGeo, fixedPerforatedMat);
  fixedLeftPanel.position.set(-5.0, encGlassH / 2 + 0.02, encFrontZ);
  alan2Group.add(fixedLeftPanel);

  const fixedRailGeo = new THREE.BoxGeometry(fixedPanelW, 0.04, 0.03);
  const fixedLeftTopRail = new THREE.Mesh(fixedRailGeo, doorFrameMat);
  fixedLeftTopRail.position.set(-5.0, encGlassH + 0.02 - 0.02, encFrontZ);
  alan2Group.add(fixedLeftTopRail);

  const fixedLeftMidRail = new THREE.Mesh(fixedRailGeo, doorFrameMat);
  fixedLeftMidRail.position.set(-5.0, encGlassH / 2 + 0.02, encFrontZ);
  alan2Group.add(fixedLeftMidRail);

  const fixedLeftBotRail = new THREE.Mesh(fixedRailGeo, doorFrameMat);
  fixedLeftBotRail.position.set(-5.0, 0.02 + 0.02, encFrontZ);
  alan2Group.add(fixedLeftBotRail);

  // B) Sağ Sabit Panel: X = +4.5 ile X = +5.5 arası
  const fixedRightPost1 = new THREE.Mesh(fixedPostGeo, postMat);
  fixedRightPost1.position.set(4.5, encPostH / 2, encFrontZ);
  alan2Group.add(fixedRightPost1);

  const fixedRightPost2 = new THREE.Mesh(fixedPostGeo, postMat);
  fixedRightPost2.position.set(encMaxX, encPostH / 2, encFrontZ);
  alan2Group.add(fixedRightPost2);

  const fixedRightPanel = new THREE.Mesh(fixedPanelGeo, fixedPerforatedMat);
  fixedRightPanel.position.set(5.0, encGlassH / 2 + 0.02, encFrontZ);
  alan2Group.add(fixedRightPanel);

  const fixedRightTopRail = new THREE.Mesh(fixedRailGeo, doorFrameMat);
  fixedRightTopRail.position.set(5.0, encGlassH + 0.02 - 0.02, encFrontZ);
  alan2Group.add(fixedRightTopRail);

  const fixedRightMidRail = new THREE.Mesh(fixedRailGeo, doorFrameMat);
  fixedRightMidRail.position.set(5.0, encGlassH / 2 + 0.02, encFrontZ);
  alan2Group.add(fixedRightMidRail);

  const fixedRightBotRail = new THREE.Mesh(fixedRailGeo, doorFrameMat);
  fixedRightBotRail.position.set(5.0, 0.02 + 0.02, encFrontZ);
  alan2Group.add(fixedRightBotRail);

  // 4. 6 Adet 150 cm'lik Kademeli Kayar Kapı (Teleskopik / Çift Raylı Baypas Düzeni - Perfore Delikli Metal Kanat)
  // X = [-4.5, +4.5] arası 9 metre, her biri 1.50m
  // Birbirinin arkasına/yanına kayabilmesi için çift ray (Z = -0.03 ve Z = -0.07) üzerinde kademeli dizilim
  const numDoors = 6;
  const doorWidth = 1.50;
  const doorHeight = encGlassH - 0.06; // 1.64m
  const doorStartX = -4.5;
  const doorPanelW = doorWidth - 0.06;
  const doorPanelH = doorHeight - 0.06;
  const doorPerforatedMat = createPerforatedMat(doorPanelW, doorPanelH);
  const doorPanelGeo = new THREE.PlaneGeometry(doorPanelW, doorPanelH);

  for (let d = 0; d < numDoors; d++) {
    const doorGroup = new THREE.Group();
    const doorCenterX = doorStartX + d * doorWidth + doorWidth / 2;
    // İkili Eşleşme (Pairing): 1-2 (d=0,1), 3-4 (d=2,3), 5-6 (d=4,5)
    // İlk kapı ön rayda (Z = -0.03), ikinci kapı arka rayda (Z = -0.07)
    const isFirstInPair = (d % 2 === 0);
    const trackZ = isFirstInPair ? -0.03 : -0.07;
    doorGroup.position.set(doorCenterX, 0, trackZ);

    // Eşinin X konumu (Kapı 1 -> Kapı 2'ye, Kapı 2 -> Kapı 1'e)
    const partnerX = isFirstInPair ? (doorCenterX + doorWidth) : (doorCenterX - doorWidth);

    // Rüzgar Geçirgen Delikli Metal Perfore Panel
    const doorPanel = new THREE.Mesh(doorPanelGeo, doorPerforatedMat);
    doorPanel.position.set(0, 0.03 + doorHeight / 2, 0);
    doorGroup.add(doorPanel);

    // Kapı Çerçevesi (Alüminyum Kanat Profili)
    // Üst ve Alt Yatay Profil
    const horizFrameGeo = new THREE.BoxGeometry(doorWidth, 0.04, 0.025);
    const topFrame = new THREE.Mesh(horizFrameGeo, doorFrameMat);
    topFrame.position.set(0, 0.03 + doorHeight - 0.02, 0);
    doorGroup.add(topFrame);

    const botFrame = new THREE.Mesh(horizFrameGeo, doorFrameMat);
    botFrame.position.set(0, 0.03 + 0.02, 0);
    doorGroup.add(botFrame);

    // Orta Yatay Takviye Kuşağı (Rüzgar dalgalanmasını önleyen orta profil)
    const midFrame = new THREE.Mesh(horizFrameGeo, doorFrameMat);
    midFrame.position.set(0, 0.03 + doorHeight / 2, 0);
    doorGroup.add(midFrame);

    // Sol ve Sağ Dikey Profil
    const vertFrameGeo = new THREE.BoxGeometry(0.04, doorHeight, 0.025);
    const leftFrame = new THREE.Mesh(vertFrameGeo, doorFrameMat);
    leftFrame.position.set(-doorWidth / 2 + 0.02, 0.03 + doorHeight / 2, 0);
    doorGroup.add(leftFrame);

    const rightFrame = new THREE.Mesh(vertFrameGeo, doorFrameMat);
    rightFrame.position.set(doorWidth / 2 - 0.02, 0.03 + doorHeight / 2, 0);
    doorGroup.add(rightFrame);

    // Üst Makara / Askı Pabuçları (Tekerlek Mekanizması)
    const hangerGeo = new THREE.BoxGeometry(0.08, 0.05, 0.035);
    const hanger1 = new THREE.Mesh(hangerGeo, doorTrackMat);
    hanger1.position.set(-doorWidth / 3, 0.03 + doorHeight + 0.015, 0);
    doorGroup.add(hanger1);

    const hanger2 = new THREE.Mesh(hangerGeo, doorTrackMat);
    hanger2.position.set(doorWidth / 3, 0.03 + doorHeight + 0.015, 0);
    doorGroup.add(hanger2);

    // Dikey Paslanmaz Çelik Çekme Kolu (İkili eşlerin ortasında buluşacak şekilde)
    const handleGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.60, 16);
    const handle = new THREE.Mesh(handleGeo, doorHandleMat);
    const handleX = isFirstInPair ? (doorWidth / 2 - 0.12) : (-doorWidth / 2 + 0.12);
    handle.position.set(handleX, 0.90, 0.025);
    doorGroup.add(handle);

    // Kulp Bağlantı Pabuçları
    const handleMountGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.035, 12);
    handleMountGeo.rotateX(Math.PI / 2);
    const hMount1 = new THREE.Mesh(handleMountGeo, doorHandleMat);
    hMount1.position.set(handleX, 0.90 + 0.25, 0.012);
    doorGroup.add(hMount1);
    const hMount2 = new THREE.Mesh(handleMountGeo, doorHandleMat);
    hMount2.position.set(handleX, 0.90 - 0.25, 0.012);
    doorGroup.add(hMount2);

    doorGroup.userData.isSlidingDoor = true;
    doorGroup.userData.doorIndex = d;
    doorGroup.userData.closedX = doorCenterX;
    doorGroup.userData.openX = partnerX;
    doorGroup.userData.targetX = doorCenterX;
    doorGroup.userData.isOpen = false;

    alan2Group.add(doorGroup);
    alan2SlidingDoors.push(doorGroup);
  }

  // 2. SOL YAN CAM CEPHE (X = -5.5, Z = -0.05'ten Z = -1.95'e, 170cm Cam)
  const sideDepth = Math.abs(encBackZ - encFrontZ); // 1.90m
  const sideMidZ = (encFrontZ + encBackZ) / 2;
  // Orta direk
  const sidePostGeo = new THREE.BoxGeometry(postDepth, encPostH, postWidth);
  const leftMidPost = new THREE.Mesh(sidePostGeo, postMat);
  leftMidPost.position.set(encMinX, encPostH / 2, sideMidZ);
  alan2Group.add(leftMidPost);
  // Arka köşe direk
  const leftBackPost = new THREE.Mesh(sidePostGeo, postMat);
  leftBackPost.position.set(encMinX, encPostH / 2, encBackZ);
  alan2Group.add(leftBackPost);

  // 2 parça 170cm yan cam panel
  const sidePanelDepth = (sideDepth / 2) - postWidth;
  const leftGlass1 = new THREE.Mesh(new THREE.BoxGeometry(glassThickness, encGlassH, sidePanelDepth), glassMat);
  leftGlass1.position.set(encMinX, encGlassH / 2 + 0.02, encFrontZ - sideDepth / 4);
  alan2Group.add(leftGlass1);
  const leftGlass2 = new THREE.Mesh(new THREE.BoxGeometry(glassThickness, encGlassH, sidePanelDepth), glassMat);
  leftGlass2.position.set(encMinX, encGlassH / 2 + 0.02, encBackZ + sideDepth / 4);
  alan2Group.add(leftGlass2);

  // 3. SAĞ YAN CAM CEPHE (X = +5.5, Z = -0.05'ten Z = -1.95'e, 170cm Cam)
  const rightMidPost = new THREE.Mesh(sidePostGeo, postMat);
  rightMidPost.position.set(encMaxX, encPostH / 2, sideMidZ);
  alan2Group.add(rightMidPost);
  const rightBackPost = new THREE.Mesh(sidePostGeo, postMat);
  rightBackPost.position.set(encMaxX, encPostH / 2, encBackZ);
  alan2Group.add(rightBackPost);

  const rightGlass1 = new THREE.Mesh(new THREE.BoxGeometry(glassThickness, encGlassH, sidePanelDepth), glassMat);
  rightGlass1.position.set(encMaxX, encGlassH / 2 + 0.02, encFrontZ - sideDepth / 4);
  alan2Group.add(rightGlass1);
  const rightGlass2 = new THREE.Mesh(new THREE.BoxGeometry(glassThickness, encGlassH, sidePanelDepth), glassMat);
  rightGlass2.position.set(encMaxX, encGlassH / 2 + 0.02, encBackZ + sideDepth / 4);
  alan2Group.add(rightGlass2);

  // 4. ARKA CAM CEPHE (Z = -1.95, X = -5.5 ile X = +5.5 arası, 11 metre boyunda 170cm Cam)
  const backLen = 11.0;
  const backNumPosts = 8;
  const backSpacing = backLen / (backNumPosts - 1); // ~1.57m
  for (let i = 0; i < backNumPosts; i++) {
    const xPos = encMinX + i * backSpacing;
    if (i > 0 && i < backNumPosts - 1) {
      const postGeo = new THREE.BoxGeometry(postWidth, encPostH, postDepth);
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(xPos, encPostH / 2, encBackZ);
      post.castShadow = true;
      alan2Group.add(post);
    }
    if (i < backNumPosts - 1) {
      const panelW = backSpacing - postWidth;
      const glassGeo = new THREE.BoxGeometry(panelW, encGlassH, glassThickness);
      const glass = new THREE.Mesh(glassGeo, glassMat);
      glass.position.set(xPos + backSpacing / 2, encGlassH / 2 + 0.02, encBackZ);
      alan2Group.add(glass);
    }
  }

  // -------------------------------------------------------------
  // Dikey Taşıyıcı Çelik Silindir Direkler (6 metrede bir)
  // Çap: 40 cm (yarıçap: 0.20 m)
  // Konum: Cam tarafından 115 cm (1.15 m), uzak köşeden 45 cm (0.45 m) uzakta
  // Z = -(1.15 + 0.20) = -1.35 m
  // -------------------------------------------------------------
  const colDiameter = 0.40;
  const colRadius = colDiameter / 2; // 0.20 m
  const colZ = -1.35; // Cam kenarı (Z=0) ile uzak köşe (Z=-2.0) arasında: Z=-1.35
  const colHeight = 5.0; // 5 metre yükseklik (çatı makasına kadar)

  const colMat = new THREE.MeshStandardMaterial({
    color: 0xebedf0, // Açık gri / beyaz stadyum çelik boyası
    roughness: 0.4,
    metalness: 0.35
  });

  const steelPlateMat = new THREE.MeshStandardMaterial({
    color: 0xc8ccd0,
    roughness: 0.35,
    metalness: 0.75
  });

  const basePedestalMat = new THREE.MeshStandardMaterial({
    color: 0x585a5d, // Zemin beton pabuç
    roughness: 0.95,
    metalness: 0.05
  });

  const boltMat = new THREE.MeshStandardMaterial({
    color: 0x222426,
    roughness: 0.4,
    metalness: 0.8
  });

  // 30m zemin boyunca 6m aralıkla yerleşim: X = [-12, -6, 0, 6, 12]
  const colXPositions = [-12, -6, 0, 6, 12];

  colXPositions.forEach((xPos) => {
    const colGroup = new THREE.Group();
    colGroup.position.set(xPos, 0, colZ);

    // 1. Zemin Beton Pabuç / Kaidesi (Kare yükselti - 70cm x 70cm x 10cm)
    const pedGeo = new THREE.BoxGeometry(0.70, 0.10, 0.70);
    const pedestal = new THREE.Mesh(pedGeo, basePedestalMat);
    pedestal.position.set(0, 0.05, 0);
    pedestal.receiveShadow = true;
    pedestal.castShadow = true;
    colGroup.add(pedestal);

    // 2. Çelik Taban Plakası (Kare - 60cm x 60cm x 3.5cm)
    const plateGeo = new THREE.BoxGeometry(0.60, 0.035, 0.60);
    const basePlate = new THREE.Mesh(plateGeo, steelPlateMat);
    basePlate.position.set(0, 0.10 + 0.035 / 2, 0);
    basePlate.castShadow = true;
    basePlate.receiveShadow = true;
    colGroup.add(basePlate);

    // 4 Köşe Ankraj Civataları
    const boltGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.045, 8);
    const boltOffset = 0.24;
    [
      [-boltOffset, -boltOffset],
      [boltOffset, -boltOffset],
      [-boltOffset, boltOffset],
      [boltOffset, boltOffset]
    ].forEach(([bx, bz]) => {
      const bolt = new THREE.Mesh(boltGeo, boltMat);
      bolt.position.set(bx, 0.10 + 0.035 + 0.02, bz);
      colGroup.add(bolt);
    });

    // 3. Alt Dairesel Bağlantı Flanşı (Çap: 56cm, Kalınlık: 3cm)
    const flangeGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.03, 32);
    const baseFlange = new THREE.Mesh(flangeGeo, steelPlateMat);
    baseFlange.position.set(0, 0.135 + 0.015, 0);
    baseFlange.castShadow = true;
    colGroup.add(baseFlange);

    // Flanş Çember Civataları (8 adet dairesel dizilim)
    const flBoltGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.025, 6);
    for (let b = 0; b < 8; b++) {
      const angle = (b / 8) * Math.PI * 2;
      const flBolt = new THREE.Mesh(flBoltGeo, boltMat);
      flBolt.position.set(Math.cos(angle) * 0.24, 0.15 + 0.0125, Math.sin(angle) * 0.24);
      colGroup.add(flBolt);
    }

    // 4. Ana Dikey Silindir Boru Direk (Çap: 40 cm, Yarıçap: 0.20 m)
    const pipeHeight = colHeight - 0.15;
    const pipeGeo = new THREE.CylinderGeometry(colRadius, colRadius, pipeHeight, 36);
    const pipe = new THREE.Mesh(pipeGeo, colMat);
    pipe.position.set(0, 0.15 + pipeHeight / 2, 0);
    pipe.castShadow = true;
    pipe.receiveShadow = true;
    colGroup.add(pipe);

    // 5. Üst Çatı Bağlantı Flanşı (Fotoğraftaki çatı makasına bağlanan üst flanş)
    const topFlangeY = 4.3;
    const topFlangeGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.04, 32);
    const topFlange1 = new THREE.Mesh(topFlangeGeo, steelPlateMat);
    topFlange1.position.set(0, topFlangeY, 0);
    colGroup.add(topFlange1);

    const topFlange2 = new THREE.Mesh(topFlangeGeo, steelPlateMat);
    topFlange2.position.set(0, topFlangeY + 0.045, 0);
    colGroup.add(topFlange2);

    for (let tb = 0; tb < 8; tb++) {
      const angle = (tb / 8) * Math.PI * 2;
      const topBolt = new THREE.Mesh(flBoltGeo, boltMat);
      topBolt.position.set(Math.cos(angle) * 0.24, topFlangeY + 0.022, Math.sin(angle) * 0.24);
      colGroup.add(topBolt);
    }

    alan2Group.add(colGroup);
  });

  // -------------------------------------------------------------
  // Silindir Direkleri 4. Metrede Birbirine Bağlayan Yatay Silindir Kiriş (Horizontal Tie Cylinder)
  // Y = 4.0 m kotunda, Z = -1.35 m aksında, X = -12.0 m ile X = +12.0 m arasında (24 metre boyunda)
  // Çap: 22 cm (Yarıçap: 0.11 m)
  // -------------------------------------------------------------
  const horizPipeGroup = new THREE.Group();
  horizPipeGroup.name = 'alan2YataySilindirKiris';

  const horizPipeRadius = 0.11; // 22 cm çapında yatay silindir boru
  const horizPipeLen = 24.0; // 24 metre toplam uzunluk (-12m'den +12m'ye)

  const horizPipeGeo = new THREE.CylinderGeometry(horizPipeRadius, horizPipeRadius, horizPipeLen, 32);
  horizPipeGeo.rotateZ(Math.PI / 2); // X ekseni boyunca yatay konumlandır

  const horizPipe = new THREE.Mesh(horizPipeGeo, colMat);
  horizPipe.position.set(0, 4.0, colZ);
  horizPipe.castShadow = true;
  horizPipe.receiveShadow = true;
  horizPipeGroup.add(horizPipe);

  // Her bir direk kesişiminde (X = -12, -6, 0, 6, 12) güçlendirilmiş T-birleşim bileziği ve kaynak flanşları
  const collarGeo = new THREE.CylinderGeometry(colRadius + 0.008, colRadius + 0.008, horizPipeRadius * 2 + 0.06, 32);
  const ringFlangeGeo = new THREE.CylinderGeometry(horizPipeRadius + 0.02, horizPipeRadius + 0.02, 0.025, 24);
  ringFlangeGeo.rotateZ(Math.PI / 2);

  colXPositions.forEach((cx) => {
    // Dikey direk üzerine sarılan T-bağlantı kuşağı / bileziği
    const collar = new THREE.Mesh(collarGeo, steelPlateMat);
    collar.position.set(cx, 4.0, colZ);
    collar.castShadow = true;
    horizPipeGroup.add(collar);

    // Yatay borunun direğe giriş yaptığı her iki yana kaynak/bağlantı flanş halkaları
    if (cx > -12) {
      const ringL = new THREE.Mesh(ringFlangeGeo, steelPlateMat);
      ringL.position.set(cx - (colRadius + 0.015), 4.0, colZ);
      horizPipeGroup.add(ringL);
    }
    if (cx < 12) {
      const ringR = new THREE.Mesh(ringFlangeGeo, steelPlateMat);
      ringR.position.set(cx + (colRadius + 0.015), 4.0, colZ);
      horizPipeGroup.add(ringR);
    }
  });

  // Uç Direklerdeki (X = -12 ve X = +12) Dış Flanş Kapakları
  const endCapGeo = new THREE.CylinderGeometry(horizPipeRadius + 0.025, horizPipeRadius + 0.025, 0.03, 24);
  endCapGeo.rotateZ(Math.PI / 2);

  const capLeft = new THREE.Mesh(endCapGeo, steelPlateMat);
  capLeft.position.set(-12.0 - colRadius, 4.0, colZ);
  horizPipeGroup.add(capLeft);

  const capRight = new THREE.Mesh(endCapGeo, steelPlateMat);
  capRight.position.set(12.0 + colRadius, 4.0, colZ);
  horizPipeGroup.add(capRight);

  alan2Group.add(horizPipeGroup);

  // -------------------------------------------------------------
  // Dikey Kablo Merdiveni ve Yatay Geçiş Tavası (Yeni Güzergah)
  // Kullanıcı İsteği:
  // - Beton kaideden uzay taşıyıcıya çıkan tava, X=0 dikey silindir direğinden
  //   yukarı çıkıp, Y=4.0m yatay silindir kiriş üzerinden X=-3.0m'deki uzay taşıyıcıya bağlanır.
  // 1. Dikey Kısım: X = 0.0m kolonunun ön yüzeyi boyunca Y = 0.10m'den Y = 3.90m'ye tırmanış
  // 2. 90° Köşe Dirseği: X = 0.0m, Y = 4.0m'de dikeyden yataya dönüş
  // 3. Yatay Kısım: Y = 4.14m kotunda, Z = -1.35m aksındaki yatay silindir boru üzerinden X=0'dan X=-2.75m'ye geçiş
  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // Dikey Kablo Merdiveni ve Yatay Geçiş Tavası (Arka Cephe - POI Yanı Kolon Güzergahı)
  // Kullanıcı İsteği:
  // - Kedi yolundan bakıldığında beton kaidenin ARKA CEPHEsinde (arka tarafında) olsun.
  // - Yataydaki alan da arka tarafta kalsın (yatay borunun arkasından geçsin).
  // - Bir yandaki direkten, yani POI'lere yakın olan direkten (X = -6.0m direği) çıksın.
  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // Dikey Kablo Merdiveni ve Yatay Geçiş Tavası (Kablolar Tamamen İçine Sığdırılmış)
  // Kullanıcı İsteği: "kabloları kablo tavasına ve kablo merdivenine sığdır"
  // - Dikey merdiven: 120mm derin yanaklar, kablo demetleri basamakların üstünde ve yanakların tam içinde
  // - Yatay tava: 120mm yüksek yanaklı, 50cm genişliğinde delikli tava yatağı içinde
  // - 90° köşe dirsekleri: Dönüş boyunca kabloları saran kılavuz kanat ve yatak sacları
  // -------------------------------------------------------------
  const ladderGroup = new THREE.Group();
  ladderGroup.name = 'dikeyKabloMerdiveniAlan2';

  const ladderW = 0.50; // 50 cm net dış genişlik
  const ladderD = 0.12; // 120 mm derin profil (kablo katmanlarını tamamen içine alır)
  const railW = 0.035;  // 35 mm yanak et kalınlığı

  // Galvaniz çelik malzeme
  const ladderMat = new THREE.MeshStandardMaterial({
    color: 0xa4b0be,
    metalness: 0.85,
    roughness: 0.3
  });
  const ladderDarkMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.8,
    roughness: 0.35
  });

  // A) DİKEY MERDİVEN (X = 0.0m Kolonunun Arka Cephesinde)
  const vertH = 3.80; // 3.8 metre dikey boy
  const vertColX = 0.00;
  // Kolon arka yüzeyi: colZ - colRadius = -1.35 - 0.20 = -1.55m
  // Merdiven yanakları: Z = -1.55m'den Z = -1.67m'ye kadar uzanır (Z_center = -1.61m)
  const vertCenterZ = colZ - colRadius - ladderD / 2; // -1.61m
  const vertRungZ = colZ - colRadius - 0.015; // -1.565m (basamakların arka yüzeyi)

  const vertRailGeo = new THREE.BoxGeometry(railW, vertH, ladderD);

  const leftVertRail = new THREE.Mesh(vertRailGeo, ladderMat);
  leftVertRail.position.set(vertColX - ladderW / 2 + railW / 2, 0.10 + vertH / 2, vertCenterZ);
  leftVertRail.castShadow = true;
  ladderGroup.add(leftVertRail);

  const rightVertRail = new THREE.Mesh(vertRailGeo, ladderMat);
  rightVertRail.position.set(vertColX + ladderW / 2 - railW / 2, 0.10 + vertH / 2, vertCenterZ);
  rightVertRail.castShadow = true;
  ladderGroup.add(rightVertRail);

  // Dikey yan profil montaj yarıkları (her 20 cm'de bir)
  const slotGeo = new THREE.BoxGeometry(railW + 0.002, 0.06, 0.015);
  for (let sy = 0.25; sy < vertH; sy += 0.20) {
    const sL = new THREE.Mesh(slotGeo, ladderDarkMat);
    sL.position.set(vertColX - ladderW / 2 + railW / 2, 0.10 + sy, vertCenterZ);
    ladderGroup.add(sL);
    const sR = new THREE.Mesh(slotGeo, ladderDarkMat);
    sR.position.set(vertColX + ladderW / 2 - railW / 2, 0.10 + sy, vertCenterZ);
    ladderGroup.add(sR);
  }

  // Dikey basamaklar (her 25 cm'de bir, kabloların arkasında destek yatağı)
  const rungW = ladderW - 2 * railW;
  const rungH = 0.025;
  const rungD = 0.030;
  const rungGeo = new THREE.BoxGeometry(rungW, rungH, rungD);
  const numVertRungs = Math.floor(vertH / 0.25);

  for (let r = 1; r <= numVertRungs; r++) {
    const rY = 0.10 + r * 0.25;
    const rung = new THREE.Mesh(rungGeo, ladderMat);
    rung.position.set(vertColX, rY, vertRungZ);
    rung.castShadow = true;
    ladderGroup.add(rung);

    // Kablo sabitleme kuşakları (Cleat kelepçeler - basamakların ön yüzünde)
    if (r % 2 === 1) {
      const clampCleat = new THREE.Mesh(new THREE.BoxGeometry(rungW + 0.02, 0.02, 0.012), ladderDarkMat);
      clampCleat.position.set(vertColX, rY, vertCenterZ - ladderD / 2 + 0.006);
      ladderGroup.add(clampCleat);
    }
  }

  // Kolona sabitleme çember kelepçeleri (Ø40cm direği saran kelepçeler)
  const colClampArcGeo = new THREE.CylinderGeometry(colRadius + 0.015, colRadius + 0.015, 0.04, 24, 1, true, Math.PI / 2, Math.PI);
  const clampBracketGeo = new THREE.BoxGeometry(0.08, 0.04, 0.06);
  [0.80, 1.80, 2.80, 3.65].forEach(cy => {
    const colClamp = new THREE.Mesh(colClampArcGeo, ladderDarkMat);
    colClamp.position.set(vertColX, cy, colZ);
    ladderGroup.add(colClamp);

    [vertColX - ladderW / 2 - 0.02, vertColX + ladderW / 2 + 0.02].forEach(bx => {
      const brk = new THREE.Mesh(clampBracketGeo, ladderMat);
      brk.position.set(bx, cy, (colZ + vertCenterZ) / 2);
      ladderGroup.add(brk);
    });
  });

  // B) YATAY KABLO TAVASI (Y = 4.00m taban kotunda, 120mm yanaklı tava yatağı)
  const horizTrayLen = 2.65; // Metre boy
  const horizBedY = 4.00;    // Tava taban sacı kotu
  const horizWallH = 0.12;   // 120 mm yanak yüksekliği (üst kenar Y = 4.12m)
  const horizCenterZ = vertCenterZ; // -1.61m (dikey merdivenle aynı Z aksında)
  const horizCenterX = -horizTrayLen / 2 - 0.18; // X = -1.505m

  // 1. Tava Taban Sacı (Delikli Galvaniz Sac)
  const trayBedGeo = new THREE.BoxGeometry(horizTrayLen, 0.006, ladderW);
  const trayBedMesh = new THREE.Mesh(trayBedGeo, ladderMat);
  trayBedMesh.position.set(horizCenterX, horizBedY + 0.003, horizCenterZ);
  trayBedMesh.receiveShadow = true;
  ladderGroup.add(trayBedMesh);

  // 2. Ön ve Arka Yanak Korkuluk Sacları (Kabloları yanlardan tamamen hapseder)
  const wallGeo = new THREE.BoxGeometry(horizTrayLen, horizWallH, 0.008);
  const frontWall = new THREE.Mesh(wallGeo, ladderMat);
  frontWall.position.set(horizCenterX, horizBedY + horizWallH / 2, horizCenterZ + ladderW / 2 - 0.004);
  frontWall.castShadow = true;
  ladderGroup.add(frontWall);

  const backWall = new THREE.Mesh(wallGeo, ladderMat);
  backWall.position.set(horizCenterX, horizBedY + horizWallH / 2, horizCenterZ - ladderW / 2 + 0.004);
  backWall.castShadow = true;
  ladderGroup.add(backWall);

  // 3. Taban Takviye Traversleri (Her 30 cm'de bir tava altı taşıyıcı C-profil)
  const trayCrossGeo = new THREE.BoxGeometry(0.035, 0.025, ladderW + 0.02);
  for (let hx = -horizTrayLen / 2 + 0.15; hx <= horizTrayLen / 2 - 0.10; hx += 0.30) {
    const crossMesh = new THREE.Mesh(trayCrossGeo, ladderDarkMat);
    crossMesh.position.set(horizCenterX + hx, horizBedY - 0.0125, horizCenterZ);
    ladderGroup.add(crossMesh);
  }

  // 4. Yatay Boru Arkası Ağır Hizmet Konsol Taşıyıcı Kollar
  const hPipeClampGeo = new THREE.CylinderGeometry(horizPipeRadius + 0.012, horizPipeRadius + 0.012, 0.05, 20);
  hPipeClampGeo.rotateZ(Math.PI / 2);
  const cantileverArmGeo = new THREE.BoxGeometry(0.06, 0.04, Math.abs(horizCenterZ - colZ) + 0.04);

  [-0.60, -1.35, -2.10].forEach(sx => {
    const pClamp = new THREE.Mesh(hPipeClampGeo, ladderDarkMat);
    pClamp.position.set(sx, 4.0, colZ);
    ladderGroup.add(pClamp);

    const armMesh = new THREE.Mesh(cantileverArmGeo, ladderMat);
    armMesh.position.set(sx, 4.0, (colZ + horizCenterZ) / 2);
    ladderGroup.add(armMesh);
  });

  // C) 90° KÖŞE DİRSEKLERİ (Kabloları Dışarı Taşırmayan Yatak ve Yanak Sacları)
  // C.1. Kolon Başı 90° Dirsek (X = 0.0m, Y = 4.0m)
  const elbowBedGeo = new THREE.BoxGeometry(0.36, 0.006, ladderW);
  const elbowBed = new THREE.Mesh(elbowBedGeo, ladderMat);
  elbowBed.position.set(-0.18, horizBedY + 0.003, horizCenterZ);
  ladderGroup.add(elbowBed);

  const elbowOuterWall = new THREE.Mesh(new THREE.BoxGeometry(0.36, horizWallH, 0.008), ladderMat);
  elbowOuterWall.position.set(-0.18, horizBedY + horizWallH / 2, horizCenterZ - ladderW / 2 + 0.004);
  ladderGroup.add(elbowOuterWall);

  const elbowInnerWall = new THREE.Mesh(new THREE.BoxGeometry(0.36, horizWallH, 0.008), ladderMat);
  elbowInnerWall.position.set(-0.18, horizBedY + horizWallH / 2, horizCenterZ + ladderW / 2 - 0.004);
  ladderGroup.add(elbowInnerWall);

  // C.2. Uzay Taşıyıcı Giriş Dirseği (X = -2.85m -> -3.00m)
  const trussElbowBed = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.006, ladderW), ladderMat);
  trussElbowBed.position.set(-2.92, horizBedY + 0.003, (horizCenterZ + colZ) / 2);
  ladderGroup.add(trussElbowBed);

  const trussElbowWall = new THREE.Mesh(new THREE.BoxGeometry(0.32, horizWallH, 0.008), ladderMat);
  trussElbowWall.position.set(-2.92, horizBedY + horizWallH / 2, horizCenterZ - ladderW / 2 + 0.004);
  ladderGroup.add(trussElbowWall);

  // D) GÜZERGAH BOYUNCA KABLO TAVASI VE MERDİVENİNE TAM OTURAN KABLO DEMETLERİ
  const ladderCables = getTelecomCableBundleConfigs();

  ladderCables.forEach(cfg => {
    // 1. Genişlik Sıkıştırması: cfg.x (-0.21..+0.21) değerini yanaklardan 4'er cm içeride kalacak şekilde daralt
    const u = cfg.x * 0.80; // u aralığı: [-0.168m, +0.168m] -> 50cm'lik tavanın tam ortasında 16cm güvenli boşluk

    // 2. Katman Yükseklikleri: 4 katmanı tavanın taban sacı (Y=4.00m) ile yanak üst kenarı (Y=4.12m) arasına yerleştir
    const tierOffset = 0.015 + (cfg.tier - 1) * 0.022; // 0.015m, 0.037m, 0.059m, 0.081m (Max 8.1cm < 12cm yanak)

    // P0: Dikey merdiven tabanı (X=0 kolonu arkasında, basamağa tam dayalı)
    const p0 = new THREE.Vector3(vertColX + u, 0.10, vertRungZ - tierOffset);
    // P1: Dikey merdiven tepesi (yanaklar içinde yukarı tırmanış)
    const p1 = new THREE.Vector3(vertColX + u, 3.75, vertRungZ - tierOffset);
    // P2: 90° dönüş dirseği (yanakların içinden geçer)
    const p2 = new THREE.Vector3(vertColX - 0.12 + u * 0.35, horizBedY + tierOffset + 0.01, vertCenterZ + u * 0.85);
    // P3: Yatay tava girişi (tavanın taban sacının üstünde, yanakların tam içinde)
    const p3 = new THREE.Vector3(-0.45, horizBedY + tierOffset, horizCenterZ + u);
    // P4: Yatay tava sonu (X=-2.65m'ye kadar tavanın içinde kusursuz hat)
    const p4 = new THREE.Vector3(-2.65, horizBedY + tierOffset, horizCenterZ + u);
    // P5: Uzay taşıyıcı giriş tavasına aktarım düğümü
    const p5 = new THREE.Vector3(-3.00 + u, horizBedY + tierOffset + 0.04, colZ + 0.08);

    const cableCurve = new THREE.CatmullRomCurve3([p0, p1, p2, p3, p4, p5], false, 'centripetal');
    const cableGeo = new THREE.TubeGeometry(cableCurve, 32, cfg.r, 8, false);
    const cableMesh = new THREE.Mesh(cableGeo, cfg.mat);
    cableMesh.castShadow = true;
    ladderGroup.add(cableMesh);
  });

  alan2Group.add(ladderGroup);

  // -------------------------------------------------------------
  // Videodaki Taşıyıcı Sistem: Çatı Makası, Çapraz Taşıyıcı Borular ve 50x15cm Delikli Kablo Tavası
  // Kullanıcı İsteği: 1s ve 5s görünen 2 köşeye çapraz açılan beyaz borular arasına,
  // alttaki silindir taşıyıcının üstüne, yağmur suyu drenaj delikli 50cm x 15cm kablo tavası
  // -------------------------------------------------------------
  createAlan2RoofTrussAndCableTray(alan2Group);

  parentGroup.add(alan2Group);
}

function createAlan2Structure() {
  const alan2Wrapper = new THREE.Group();
  alan2Wrapper.name = 'alan2Structure';
  alan2Wrapper.visible = false;
  alan2SlidingDoors.length = 0;

  buildAlan2Instance(alan2Wrapper, 0, 0);
  buildAlan2Instance(alan2Wrapper, 30.0, 0);

  scene.add(alan2Wrapper);
}

// =============================================================
// ÇATI UCU KEDİ YOLU SİLİNDİRİ ÜZERİ ÇEMBER SABİTLEMELİ YATAY POI & SAHA KABİNİ RAFI
// Kullanıcı İsteği:
// - "uçtaki kedi yolunun yanındaki silindir taşıyıcının üzerine POI leri koyacagız."
// - "aklımda şöyle bişey var 42uyu yan yatırmış gibi düşün ön yüzü göktüzüne bakacak şekilde bunu da silindire çember ile sabitleyecegiz."
// - "Tabi bunu şey gibi düşün 42u degil de 2 poı 1 tane kabin gibi görselini sen belirle poıleri koyacagız dedigim gibi bi shelf ile çember vasıtasıyla sabitlenecek"
// =============================================================
function buildCylinderMountedHorizontalPoiShelf(options = {}) {
  const group = new THREE.Group();
  const setIndex = options.setIndex || 1;
  const setLabel = options.setLabel ? options.setLabel : '';
  group.name = `silindirUstuYatayPoiGrubu_Set${setIndex}`;

  // Kullanıcı İsteği:
  // - "poıleri x-z eksenine göre çevir. ve birbirine yaklaştır. 3. bir cihaz görüyorum onu kaldır ve taşıyıcı kabineti ona göre yeniden boyutlandır küçülsün"
  // - "tamamdır bu modül ok. Bundan bi sagına bi soluna birer tane daha set ekle"
  const shelfL = 0.72; // X ekseni boyunca küçültülmüş toplam raf boyu (~72cm)
  const shelfW = 0.54; // Z ekseni boyunca raf genişliği (~54cm, POI 48cm kulak genişliğini sarar)
  const shelfH = 0.35; // Y ekseni boyunca raf yüksekliği (~35cm, POI kasa yüksekliğine tam uyumlu)
  const cylR = options.cylinderRadius || 0.2285; // Ø45.7cm silindir taşıyıcı yarıçapı

  group.userData = {
    id: state.nextId++,
    type: 'equipment-platform',
    blockType: 'cylinder-horizontal-poi-shelf',
    category: 'POI',
    name: `Silindir Üzeri Çember Sabitlemeli Yatay 2x POI Rafı${setLabel}`,
    width: shelfL,
    height: shelfH,
    depth: shelfW,
    weight: 58, // 2x22kg POI (CB-12-POI-64F-A12) + 14kg Çemberli Şasi
    interactive: true,
    locked: false,
    allowPassThrough: true
  };

  // Malzemeler
  const frameSteelMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.3 });
  const rackRailMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.2 });
  const clampBandMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.25 });
  const boltMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.15 });
  const meshMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.5 });
  const hazardMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.4, roughness: 0.4 });
  const jumperCableMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.6, metalness: 0.2 });
  const copperBusbarMat = new THREE.MeshStandardMaterial({ color: 0xb45309, metalness: 0.9, roughness: 0.25 });
  const groundCableMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.5, metalness: 0.3 });

  // 1. AĞIR HİZMET ÇEMBER KELEPÇELERİ (Ø45.7cm Silindiri 360° Saran 2 Adet Çember)
  // Küçülen raf gövdesine uygun olarak iki mesnete (X = -0.20m ve +0.20m) yerleştirilmiştir
  const bandStations = [-0.20, 0.20];
  const bandThickness = 0.010;
  const bandWidth = 0.070;
  const bandInnerR = cylR + 0.003;
  const bandOuterR = bandInnerR + bandThickness;

  bandStations.forEach(bx => {
    const bandGroup = new THREE.Group();
    bandGroup.position.set(bx, 0, 0);

    // Tam Dairesel Çelik Çember
    const bandGeo = new THREE.CylinderGeometry(bandOuterR, bandOuterR, bandWidth, 40, 1, true);
    bandGeo.rotateZ(Math.PI / 2);
    const bandMesh = new THREE.Mesh(bandGeo, clampBandMat);
    bandMesh.castShadow = true;
    bandMesh.receiveShadow = true;
    bandGroup.add(bandMesh);

    // Çember Alt Sıkma Kulakları ve Germe Cıvataları
    [-bandInnerR - 0.02, bandInnerR + 0.02].forEach(ez => {
      const earGeo = new THREE.BoxGeometry(bandWidth, 0.045, 0.018);
      const ear = new THREE.Mesh(earGeo, clampBandMat);
      ear.position.set(0, -cylR * 0.92, ez * 0.35);
      bandGroup.add(ear);

      [-0.015, 0.015].forEach(cy => {
        const boltGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.055, 12);
        boltGeo.rotateX(Math.PI / 2);
        const bolt = new THREE.Mesh(boltGeo, boltMat);
        bolt.position.set(0, -cylR * 0.92 + cy, ez * 0.35);
        bandGroup.add(bolt);
      });
    });

    // Çember Üstü Eyer Mesneti (Saddle Pedestal)
    const saddleGeo = new THREE.CylinderGeometry(bandOuterR + 0.006, bandOuterR + 0.006, bandWidth + 0.02, 32, 1, false, Math.PI * 0.25, Math.PI * 0.5);
    saddleGeo.rotateZ(Math.PI / 2);
    const saddle = new THREE.Mesh(saddleGeo, clampBandMat);
    bandGroup.add(saddle);

    // Düşey Rijit Taşıyıcı Gusset Sacları
    [-0.16, 0.16].forEach(gz => {
      const gussetGeo = new THREE.BoxGeometry(bandWidth, 0.08, 0.015);
      const gusset = new THREE.Mesh(gussetGeo, clampBandMat);
      gusset.position.set(0, cylR + 0.04, gz);
      gusset.castShadow = true;
      bandGroup.add(gusset);
    });

    // Üst Yatay Montaj Flanş Sacı
    const topFlangeGeo = new THREE.BoxGeometry(bandWidth + 0.03, 0.015, shelfW * 0.88);
    const topFlange = new THREE.Mesh(topFlangeGeo, clampBandMat);
    topFlange.position.set(0, cylR + 0.08, 0);
    topFlange.castShadow = true;
    bandGroup.add(topFlange);

    // Cıvatalar
    [-shelfW * 0.35, -shelfW * 0.15, shelfW * 0.15, shelfW * 0.35].forEach(fz => {
      const bGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.025, 6);
      const bMesh = new THREE.Mesh(bGeo, boltMat);
      bMesh.position.set(0, cylR + 0.09, fz);
      bandGroup.add(bMesh);
    });

    group.add(bandGroup);
  });

  // 2. YATAY 19" MONTAJ ŞASİSİ / SHELF (Küçültülmüş Horizontal Rack Cradle)
  const shelfBaseY = cylR + 0.088;
  const shelfFrameGroup = new THREE.Group();
  shelfFrameGroup.position.set(0, shelfBaseY, 0);

  // A) 4 Adet Boyuna Ana Kutu Profil (40x40mm)
  const mainStringerGeo = new THREE.BoxGeometry(shelfL, 0.04, 0.04);
  [
    { y: 0.02, z: -shelfW / 2 + 0.02 },
    { y: 0.02, z: shelfW / 2 - 0.02 },
    { y: shelfH - 0.02, z: -shelfW / 2 + 0.02 },
    { y: shelfH - 0.02, z: shelfW / 2 - 0.02 }
  ].forEach(st => {
    const stringer = new THREE.Mesh(mainStringerGeo, frameSteelMat);
    stringer.position.set(0, st.y, st.z);
    stringer.castShadow = true;
    shelfFrameGroup.add(stringer);
  });

  // B) Enine Traversler ve Düşey Köşe Dikmeleri
  const crossXStations = [-shelfL / 2 + 0.02, 0.0, shelfL / 2 - 0.02];
  crossXStations.forEach(cx => {
    const crossGeo = new THREE.BoxGeometry(0.04, 0.04, shelfW - 0.08);
    const botCross = new THREE.Mesh(crossGeo, frameSteelMat);
    botCross.position.set(cx, 0.02, 0);
    shelfFrameGroup.add(botCross);

    const topCross = new THREE.Mesh(crossGeo, frameSteelMat);
    topCross.position.set(cx, shelfH - 0.02, 0);
    shelfFrameGroup.add(topCross);

    [-shelfW / 2 + 0.02, shelfW / 2 - 0.02].forEach(cz => {
      const upGeo = new THREE.BoxGeometry(0.04, shelfH - 0.04, 0.04);
      const upright = new THREE.Mesh(upGeo, frameSteelMat);
      upright.position.set(cx, shelfH / 2, cz);
      upright.castShadow = true;
      shelfFrameGroup.add(upright);
    });
  });

  // C) 19" Montaj Rayları (Z ekseninde -0.23 ve +0.23 hizasında boyuna uzanır)
  [-shelfW / 2 + 0.04, shelfW / 2 - 0.04].forEach(rz => {
    const railGeo = new THREE.BoxGeometry(shelfL - 0.04, 0.025, 0.035);
    const rail = new THREE.Mesh(railGeo, rackRailMat);
    rail.position.set(0, shelfH - 0.035, rz);
    shelfFrameGroup.add(rail);

    for (let hx = -shelfL / 2 + 0.06; hx <= shelfL / 2 - 0.06; hx += 0.0445) {
      const holeGeo = new THREE.CylinderGeometry(0.0035, 0.0035, 0.027, 8);
      const hole = new THREE.Mesh(holeGeo, boltMat);
      hole.position.set(hx, shelfH - 0.022, rz);
      shelfFrameGroup.add(hole);
    }
  });

  // D) Taban Delikli Koruma ve Havalandırma Izgara Sacı
  const floorGeo = new THREE.BoxGeometry(shelfL - 0.04, 0.008, shelfW - 0.06);
  const floorMesh = new THREE.Mesh(floorGeo, meshMat);
  floorMesh.position.set(0, 0.02, 0);
  shelfFrameGroup.add(floorMesh);

  // E) Çerçeve Üst Köşe İkaz Şeritleri
  [-shelfW / 2 + 0.02, shelfW / 2 - 0.02].forEach(sz => {
    const hazardGeo = new THREE.BoxGeometry(shelfL * 0.96, 0.015, 0.008);
    const hazard = new THREE.Mesh(hazardGeo, hazardMat);
    hazard.position.set(0, shelfH - 0.01, sz < 0 ? sz - 0.022 : sz + 0.022);
    shelfFrameGroup.add(hazard);
  });

  // F) Tel Örgü Kablo Kanalı (+Z kenarında, kedi yoluna bakan tarafta)
  const trayGeo = new THREE.BoxGeometry(shelfL - 0.04, 0.06, 0.08);
  const cableTray = new THREE.Mesh(trayGeo, meshMat);
  cableTray.position.set(0, shelfH - 0.03, shelfW / 2 + 0.03);
  shelfFrameGroup.add(cableTray);

  // G) Bakır Topraklama Barası (Grounding Busbar)
  const busbarGeo = new THREE.BoxGeometry(0.30, 0.015, 0.035);
  const busbar = new THREE.Mesh(busbarGeo, copperBusbarMat);
  busbar.position.set(-0.15, shelfH - 0.01, -shelfW / 2 + 0.02);
  shelfFrameGroup.add(busbar);

  // Çember kelepçeye inen sarı-yeşil topraklama iletkeni
  const gndGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.18, 8);
  const gndCable = new THREE.Mesh(gndGeo, groundCableMat);
  gndCable.position.set(-0.20, -0.02, -shelfW / 2 + 0.02);
  shelfFrameGroup.add(gndCable);

  group.add(shelfFrameGroup);

  // 3. YATAY YERLEŞTİRİLEN 2 ADET PROSE POI (PROJEDEKİ CB-12-POI-64F-A12 MODELİ)
  // X-Z ekseninde 90° döndürülmüş ve birbirine 2cm mesafeyle yaklaştırılmıştır.
  const poiCatalogItem = EQUIPMENT_CATALOG.find(i => i.id === 'prose-a12') || {
    id: 'prose-a12',
    category: 'POI',
    name: 'CB-12-POI-64F-A12 (5G NR POI)',
    width: 0.400,
    height: 0.350,
    depth: 0.260,
    weight: 22,
    color: '#ea580c'
  };

  const poiAIndex = (setIndex - 1) * 2 + 1;
  const poiBIndex = (setIndex - 1) * 2 + 2;

  // A) POI 1
  const poi1 = buildProsePoiModel(poiCatalogItem);
  poi1.name = `PROSE POI-${poiAIndex} (Set ${setIndex} - Turkcell & TT 5G) - CB-12-POI-64F-A12`;
  poi1.userData.name = `PROSE POI-${poiAIndex} (Set ${setIndex} - Turkcell & TT 5G) - CB-12-POI-64F-A12`;
  poi1.rotation.set(-Math.PI / 2, 0, Math.PI / 2); // X-Z ekseninde çevirir, ön yüz gökyüzüne (+Y) bakar
  poi1.position.set(-0.14, shelfBaseY + 0.175, 0); // Alt taban şasi zemininde (shelfBaseY)
  group.add(poi1);

  // B) POI 2
  const poi2 = buildProsePoiModel(poiCatalogItem);
  poi2.name = `PROSE POI-${poiBIndex} (Set ${setIndex} - Vodafone & Aux 5G) - CB-12-POI-64F-A12`;
  poi2.userData.name = `PROSE POI-${poiBIndex} (Set ${setIndex} - Vodafone & Aux 5G) - CB-12-POI-64F-A12`;
  poi2.rotation.set(-Math.PI / 2, 0, Math.PI / 2); // X-Z ekseninde çevirir, ön yüz gökyüzüne (+Y) bakar
  poi2.position.set(0.14, shelfBaseY + 0.175, 0); // POI-1'in hemen yanına (arada 2cm pay ile)
  group.add(poi2);

  // Not: POI ANT portlarından (+Z tarafı) çıkan 1/2" feeder kabloları
  // poiToAntennaFeederSystem ile kesintisiz olarak son Matsing antenine (Antenna 3) bağlanır.

  return group;
}

// Çatı Makası, Çapraz Taşıyıcı Beyaz Borular ve 50cm x 15cm Delikli Kablo Tavası Üretici Fonksiyonu
// Kullanıcı İsteği:
// 1. Açı 10 dereceye düşürüldü (slope = 10°).
// 2. Tavalar doğrudan alt taşıyıcı gövdeye sabitlenmeyecek.
// 3. İki çapraz kolun yaklaşık 60 cm açıldığı alana taşıyıcı bir kaide/travers aparatı konulup tava buna sabitlendi.
// 4. Çapraz ayakların boyu ~3 metre.
// 2. Tavalar doğrudan alt taşıyıcı gövdeye sabitlenmeyecek.
// 3. İki çapraz kolun yaklaşık 60 cm açıldığı alana taşıyıcı bir kaide/travers aparatı konulup tava buna sabitlendi.
// 4. Çapraz ayakların boyu ~3 metre.
function createAlan2RoofTrussAndCableTray(alan2Group) {
  const trussGroup = new THREE.Group();
  trussGroup.name = 'alan2RoofTrussAndCableTray';

  // 1. MALZEMELER
  const pipeWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xebedf0, // Stadyum beyaz çelik boyası (videodaki borular)
    roughness: 0.38,
    metalness: 0.35
  });

  const steelFlangeMat = new THREE.MeshStandardMaterial({
    color: 0xc8ccd0,
    roughness: 0.35,
    metalness: 0.75
  });

  const darkJointMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.45,
    metalness: 0.7
  });

  // Galvaniz Delikli Kablo Tavası Malzemesi (Yağmur suyu drenaj delikli)
  const trayPerforatedTex = createCableTrayPerforatedTexture();
  trayPerforatedTex.repeat.set(1, 60);
  const trayBottomMat = new THREE.MeshStandardMaterial({
    map: trayPerforatedTex,
    transparent: true,
    alphaTest: 0.25,
    color: 0xb0bec5,
    metalness: 0.85,
    roughness: 0.25,
    side: THREE.DoubleSide
  });

  const traySideMat = new THREE.MeshStandardMaterial({
    color: 0x90a4ae,
    metalness: 0.85,
    roughness: 0.3,
    side: THREE.DoubleSide
  });

  // İki 3D nokta arasına yönlendirilmiş silindir boru üretici
  function createPipe(p1, p2, radius, mat) {
    const dir = new THREE.Vector3().subVectors(p2, p1);
    const len = dir.length();
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    const geo = new THREE.CylinderGeometry(radius, radius, len, 24);
    const mesh = new THREE.Mesh(geo, mat);
    const yAxis = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(yAxis, dir.clone().normalize());
    mesh.quaternion.copy(quat);
    mesh.position.copy(mid);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  // -------------------------------------------------------------
  // 2. AÇILI YUKARI YÜKSELEN TAŞIYICI GRUP (Sloped Truss Assembly)
  // Konum: Tam olarak Dikey Kablo Merdiveni hizasında (X = -3.00 m)
  // Başlangıç: Z = -1.35m (kablo merdiveni ve yatay silindir kiriş üstü), Y = 4.10m
  // 45 metre hat boyunda 6 metre net kot yükselmesi (sin(θ) = 6/45 => θ ≈ 7.6623°)
  // -------------------------------------------------------------
  const baseSlopeLen = 45.00; // 45 metre nominal hat boyu
  const heightRise = 6.00; // 45 metrede 6 metre net kot yükselmesi kuralı
  const slopeAngleRad = Math.asin(heightRise / baseSlopeLen); // arcsin(6/45) ≈ 0.13373 rad (sabit eğim açısı: 7.6623°)
  const slopeAngleDeg = THREE.MathUtils.radToDeg(slopeAngleRad); // ≈ 7.6623°
  // Kullanıcı İsteği: 45'lik taşıyıcıyı kedi yolunu bitirecek şekilde 1-2 metre daha uzat (~1.85m uzatma, toplam 46.85m)
  const slopeLen = 46.85;

  const slopedGroup = new THREE.Group();
  slopedGroup.position.set(-3.00, 4.10, -1.35); // Dikey merdiven tepesi (X=-3, Y=4.10, Z=-1.35)
  slopedGroup.rotation.x = -slopeAngleRad; // Üç boyutlu uzayda +Z yönünde yukarı eğim
  trussGroup.add(slopedGroup);

  const carrierRadius = 0.14; // Ø28cm beyaz ana silindir taşıyıcı

  // A) Altta Kalan Silindir Taşıyıcı Boru (Boyuna ana gövde, 10° eğimli)
  const carrierGeo = new THREE.CylinderGeometry(carrierRadius, carrierRadius, slopeLen, 32);
  carrierGeo.rotateX(Math.PI / 2); // Yerel Z ekseni boyunca uzat
  const carrierMesh = new THREE.Mesh(carrierGeo, pipeWhiteMat);
  carrierMesh.position.set(0, 0, slopeLen / 2);
  carrierMesh.castShadow = true;
  carrierMesh.receiveShadow = true;
  slopedGroup.add(carrierMesh);

  // Uç kapakları
  const capGeo = new THREE.CylinderGeometry(carrierRadius + 0.02, carrierRadius + 0.02, 0.03, 32);
  capGeo.rotateX(Math.PI / 2);
  const backCap = new THREE.Mesh(capGeo, steelFlangeMat);
  backCap.position.set(0, 0, 0);
  slopedGroup.add(backCap);
  const frontCap = new THREE.Mesh(capGeo, steelFlangeMat);
  frontCap.position.set(0, 0, slopeLen);
  slopedGroup.add(frontCap);

  // -------------------------------------------------------------
  // 3. YAKLAŞIK 3 METRE UZUNLUĞUNDA ÇAPRAZ TAŞIYICI KOLLAR (3m V-Strut Diagonal Arms)
  // Alttaki silindir taşıyıcıdan iki üst köşeye doğru açılan ~3m uzunluğunda çelik borular
  // Y = 0.42m kotunda iki kol arası mesafe net 60 cm (X = -0.30m ve X = +0.30m) olur
  // -------------------------------------------------------------
  const stationSpacing = 2.5; // Her 2.5 metrede bir çatı makası istasyonu (45 / 2.5 = 18 bay)
  const armStationsZ = [];
  for (let z = 0.0; z <= slopeLen + 0.01; z += stationSpacing) {
    armStationsZ.push(Number(z.toFixed(2)));
  }
  const diagonalRadius = 0.07; // Ø14cm kalın beyaz çelik boru
  const armBaseX = 0.12; // Alt bağlantı noktası X (±0.12m)
  const armBaseY = 0.08; // Alt bağlantı noktası Y
  const armTopX = 1.52;  // Üst uç açılması X (±1.52m, toplam 3.04m tepe açıklığı)
  const armTopY = 2.73;  // Üst tepe yüksekliği Y (dx=1.40m, dy=2.65m => Kol Boyu = sqrt(1.40^2 + 2.65^2) = 2.997m ≈ 3.0 METRE)

  // Taşıyıcı Kaide / Travers Aparatı Parametreleri:
  // Kolların tam 60 cm açıldığı yükseklik: Y = 0.42m (X = ±0.30m)
  const pedestalY = 0.42; 
  const pedestalSpan = 0.60; // 60 cm net açıklık

  armStationsZ.forEach((stZ) => {
    // Alttaki silindir üzerindeki güçlendirilmiş montaj bileziği
    const ringGeo = new THREE.CylinderGeometry(carrierRadius + 0.015, carrierRadius + 0.015, 0.18, 24);
    ringGeo.rotateX(Math.PI / 2);
    const ringMesh = new THREE.Mesh(ringGeo, steelFlangeMat);
    ringMesh.position.set(0, 0, stZ);
    slopedGroup.add(ringMesh);

    // Sol Çapraz Kol (~3.0m uzunluğunda)
    const leftBase = new THREE.Vector3(-armBaseX, armBaseY, stZ);
    const leftTop = new THREE.Vector3(-armTopX, armTopY, stZ);
    const leftArm = createPipe(leftBase, leftTop, diagonalRadius, pipeWhiteMat);
    slopedGroup.add(leftArm);

    // Sağ Çapraz Kol (~3.0m uzunluğunda)
    const rightBase = new THREE.Vector3(armBaseX, armBaseY, stZ);
    const rightTop = new THREE.Vector3(armTopX, armTopY, stZ);
    const rightArm = createPipe(rightBase, rightTop, diagonalRadius, pipeWhiteMat);
    slopedGroup.add(rightArm);

    // Üstte iki kol arasındaki enine gergi borusu
    const topStrut = createPipe(leftTop, rightTop, 0.05, pipeWhiteMat);
    slopedGroup.add(topStrut);

    // -----------------------------------------------------------
    // TAŞIYICI KAİDE / TRAVERS APARATI (Kolların ~60 cm açıldığı yerde)
    // Tavanın bulunduğu bölgede (stZ <= 41.5m) üretilir.
    // POI feeder tavasının çatı ucuna uzatılmasıyla travers kaideleri stZ=40m istasyonunu da kapsar.
    // -----------------------------------------------------------
    if (stZ <= 41.5) {
      // A) İki çapraz kol arasına gerilen 60 cm'lik çelik travers profil (80x40x4mm Kutu Profil)
      const crossBeamGeo = new THREE.BoxGeometry(pedestalSpan + 0.04, 0.04, 0.08);
      const crossBeam = new THREE.Mesh(crossBeamGeo, steelFlangeMat);
      crossBeam.position.set(0, pedestalY, stZ);
      crossBeam.castShadow = true;
      slopedGroup.add(crossBeam);

      // B) Her iki yandaki çapraz boruları saran ağır hizmet boru kelepçeleri (Pipe Clamps)
      const armClampGeo = new THREE.CylinderGeometry(diagonalRadius + 0.012, diagonalRadius + 0.012, 0.06, 16);
      [-pedestalSpan / 2, pedestalSpan / 2].forEach(cx => {
        const clamp = new THREE.Mesh(armClampGeo, darkJointMat);
        clamp.rotation.z = cx < 0 ? 0.48 : -0.48;
        clamp.position.set(cx, pedestalY, stZ);
        slopedGroup.add(clamp);
      });

      // C) Travers üzerindeki yükseltilmiş tava montaj kaidesi (54 cm genişlik, amortisörlü pabuç)
      const bedGeo = new THREE.BoxGeometry(0.54, 0.025, 0.10);
      const bedMesh = new THREE.Mesh(bedGeo, steelFlangeMat);
      bedMesh.position.set(0, pedestalY + 0.03, stZ);
      bedMesh.castShadow = true;
      slopedGroup.add(bedMesh);

      // D) Tavanın kaideye sabitlendiği kenar tespit çeneleri / kelepçeleri (Tray Hold-down Clamps)
      const holdClampGeo = new THREE.BoxGeometry(0.04, 0.03, 0.05);
      [-0.26, 0.26].forEach(hx => {
        const holdClamp = new THREE.Mesh(holdClampGeo, darkJointMat);
        holdClamp.position.set(hx, pedestalY + 0.045, stZ);
        slopedGroup.add(holdClamp);
      });
    }
  });

  // Üst Boyuna Aşık Boruları (Sol ve Sağ Çatı Üst Başlıkları)
  const topChordGeo = new THREE.CylinderGeometry(0.09, 0.09, slopeLen, 24);
  topChordGeo.rotateX(Math.PI / 2);

  const leftTopChord = new THREE.Mesh(topChordGeo, pipeWhiteMat);
  leftTopChord.position.set(-armTopX, armTopY, slopeLen / 2);
  leftTopChord.castShadow = true;
  slopedGroup.add(leftTopChord);

  const rightTopChord = new THREE.Mesh(topChordGeo, pipeWhiteMat);
  rightTopChord.position.set(armTopX, armTopY, slopeLen / 2);
  rightTopChord.castShadow = true;
  slopedGroup.add(rightTopChord);

  // Üst Başlıklar Arası Çapraz Kafes Gergileri
  for (let i = 0; i < armStationsZ.length - 1; i++) {
    const z1 = armStationsZ[i];
    const z2 = armStationsZ[i + 1];
    const brace1 = createPipe(
      new THREE.Vector3(-armTopX, armTopY, z1),
      new THREE.Vector3(armTopX, armTopY, z2),
      0.035,
      pipeWhiteMat
    );
    slopedGroup.add(brace1);
    const brace2 = createPipe(
      new THREE.Vector3(armTopX, armTopY, z1),
      new THREE.Vector3(-armTopX, armTopY, z2),
      0.035,
      pipeWhiteMat
    );
    slopedGroup.add(brace2);
  }

  // -------------------------------------------------------------
  // 4. 50 CM GENİŞLİK, 15 CM YÜKSEKLİKTE DELİKLİ KABLO TAVASI (İn-Çık Kademeli)
  // Kullanıcı İsteği: "tavayı bu noktada biraz alçaltırsan onunla da kesişmesin. tavada az da olsa in çık yapabilirsin"
  // Ara kedi yolu (Z_world = 27.43m => z_local ≈ 29.04m) altından geçerken tava 25cm alçaltılarak
  // taşıyıcı silindire yaklaştırılır; kedi yolundan ve taşıyıcı borudan tam kurtulur.
  // -------------------------------------------------------------
  const trayW = 0.50; // 50 cm net genişlik
  const trayH = 0.15; // 15 cm kenar yüksekliği
  const trayWallThick = 0.003; // 3 mm sac kalınlığı
  const trayBottomYNormal = pedestalY + 0.0425; // 0.4625m (Normal kaide üstü kot)
  const trayBottomYDip = 0.20; // Kedi yolu altındaki çukurda 20cm kotu (alttaki Ø28cm silindirin 6cm üstü)

  // Tava Geometri Segmentleri (İn-Çık Kademeleri)
  // Kullanıcı İsteği: "tamamdır şimdi orta kedi yoluna ekledigin rrulardan her bir poı setine 20 tane 1/2 feeder gelecek ona göre çizimi yap gerekirse tava tavataşıyıcısı vs ekle."
  // Çatı makası tavası orta kedi yolu RRU'larından gelen 60 adet 1/2" feeder kabloyu çatı ucu POI inişine (z = 41.20m) kadar taşır.
  const traySegments = [
    { yStart: trayBottomYNormal, zStart: 0.0, yEnd: trayBottomYNormal, zEnd: 27.80 },
    { yStart: trayBottomYNormal, zStart: 27.80, yEnd: trayBottomYDip, zEnd: 28.30 }, // 26cm iniş eğimi
    { yStart: trayBottomYDip, zStart: 28.30, yEnd: trayBottomYDip, zEnd: 29.75 },     // Kedi yolu altı alçak geçiş
    { yStart: trayBottomYDip, zStart: 29.75, yEnd: trayBottomYNormal, zEnd: 30.25 }, // 26cm çıkış eğimi
    { yStart: trayBottomYNormal, zStart: 30.25, yEnd: trayBottomYNormal, zEnd: 41.20 } // POI inişine kadar uzanır
  ];

  traySegments.forEach(seg => {
    const dy = seg.yEnd - seg.yStart;
    const dz = seg.zEnd - seg.zStart;
    const segLen = Math.hypot(dy, dz);
    const segAngleX = Math.atan2(seg.yStart - seg.yEnd, dz);
    const midY = (seg.yStart + seg.yEnd) / 2;
    const midZ = (seg.zStart + seg.zEnd) / 2;

    // A) Taban Sacı
    const bGeo = new THREE.BoxGeometry(trayW, trayWallThick, segLen);
    const bMesh = new THREE.Mesh(bGeo, trayBottomMat);
    bMesh.rotation.x = segAngleX;
    bMesh.position.set(0, midY + (trayWallThick / 2) * Math.cos(segAngleX), midZ);
    bMesh.receiveShadow = true;
    bMesh.castShadow = true;
    slopedGroup.add(bMesh);

    // B) Sol Yan Duvar
    const sideGeo = new THREE.BoxGeometry(trayWallThick, trayH, segLen);
    const lMesh = new THREE.Mesh(sideGeo, traySideMat);
    lMesh.rotation.x = segAngleX;
    lMesh.position.set(-trayW / 2 + trayWallThick / 2, midY + (trayH / 2) * Math.cos(segAngleX), midZ);
    lMesh.castShadow = true;
    slopedGroup.add(lMesh);

    // C) Sağ Yan Duvar
    const rMesh = new THREE.Mesh(sideGeo, traySideMat);
    rMesh.rotation.x = segAngleX;
    rMesh.position.set(trayW / 2 - trayWallThick / 2, midY + (trayH / 2) * Math.cos(segAngleX), midZ);
    rMesh.castShadow = true;
    slopedGroup.add(rMesh);

    // D) Üst Flanş Dudakları
    const lipGeo = new THREE.BoxGeometry(0.015, trayWallThick, segLen);
    const lLip = new THREE.Mesh(lipGeo, steelFlangeMat);
    lLip.rotation.x = segAngleX;
    lLip.position.set(-trayW / 2 + 0.0075, midY + trayH * Math.cos(segAngleX), midZ);
    slopedGroup.add(lLip);

    const rLip = new THREE.Mesh(lipGeo, steelFlangeMat);
    rLip.rotation.x = segAngleX;
    rLip.position.set(trayW / 2 - 0.0075, midY + trayH * Math.cos(segAngleX), midZ);
    slopedGroup.add(rLip);
  });

  // Alçak geçiş altı taşıyıcı eyer montajı (z = 29.0m)
  const dipSaddleGeo = new THREE.BoxGeometry(trayW + 0.04, 0.04, 0.20);
  const dipSaddle = new THREE.Mesh(dipSaddleGeo, steelFlangeMat);
  dipSaddle.position.set(0, trayBottomYDip - 0.02, 29.0);
  slopedGroup.add(dipSaddle);

  // E) Tava İçi Rijitlik Köprüleri (Köprüler in-çık bölgesini atlayarak dizilir)
  const ribGeo = new THREE.BoxGeometry(trayW - 0.01, 0.01, 0.02);
  for (let zRib = 0.5; zRib <= 41.20 - 0.5; zRib += 1.5) {
    if (zRib >= 27.5 && zRib <= 30.5) continue; // Çukur bölgesini atla
    const rib = new THREE.Mesh(ribGeo, darkJointMat);
    rib.position.set(0, trayBottomYNormal + 0.008, zRib);
    slopedGroup.add(rib);
  }

  // Çatı makası tavası ucunda eğimli iniş oluğu sacı (Cable Waterfall Bracket at z = 41.20m)
  const trayWaterfallGeo = new THREE.BoxGeometry(trayW, 0.02, 0.25);
  const trayWaterfall = new THREE.Mesh(trayWaterfallGeo, steelFlangeMat);
  trayWaterfall.position.set(0, trayBottomYNormal + 0.02, 41.20);
  trayWaterfall.rotation.x = -0.52;
  slopedGroup.add(trayWaterfall);

  // -------------------------------------------------------------
  // 5. 50x15cm TAVA İÇİNDEKİ TELEKOM KABLOLARI VE MATSİNG ANTENLERE 20+20 FEEDER GİRİŞLERİ
  // Kullanıcı İsteği:
  // - "Betondan gelen 48 7/8 feeder kabloyu 40a düşür ve antenlere 20 20 dagıtacak şekilde revize et"
  // Mimari:
  // 1. 40 Feeder kablonun ilk 20 adedi (Sol 5 sütun x 4 katman):
  //    Z = 35.60m'de tavadan kavisle çıkarak düşey ofset borusu boyunca iner ve Antenna 2'nin (Z = 35.234m) 20 arka portuna bağlanır.
  // 2. 40 Feeder kablonun kalan 20 adedi (Sağ 5 sütun x 4 katman):
  //    Tavada Antenna 2'yi geçerek Z = 38.30m'ye kadar ilerler, buradan kavisle inip Antenna 1'in (Z = 37.934m) 20 arka portuna bağlanır.
  // 3. 16 Enerji kablosu (4 sütun x 4 katman):
  //    Tavada Z = 27.60m'ye kadar ilerler ve yakın kedi yolundaki PDU panosuna bağlanır.
  // -------------------------------------------------------------
  const telecomCables = getTelecomCableBundleConfigs();
  const cableSlopeLen = 44.80; // Sadece enerji kabloları sona kadar uzanır

  const feederCables = telecomCables.filter(c => c.type === 'feeder');
  const powerCables = telecomCables.filter(c => c.type === 'power');

  // Feeder kabloları iki eşit 20'lik gruba böl (Kullanıcı İsteği: 20 20 dağıt)
  const feedersAntenna2 = feederCables.slice(0, 20); // Antenna 2 için 20 Feeder
  const feedersAntenna1 = feederCables.slice(20, 40); // Antenna 1 için 20 Feeder

  // Konnektör ve aparat malzemeleri
  const dinConnectorMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.9, roughness: 0.2 });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
  const connectorGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.045, 12);
  connectorGeo.rotateX(Math.PI / 2);
  const bootGeo = new THREE.CylinderGeometry(0.019, 0.015, 0.04, 12);
  bootGeo.rotateX(Math.PI / 2);

  // Eğimli grup (slopedGroup) dünya matrisi ve tersi:
  const slopedMatrix = new THREE.Matrix4();
  slopedMatrix.compose(
    new THREE.Vector3(-3.00, 4.10, -1.35),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -slopeAngleRad),
    new THREE.Vector3(1, 1, 1)
  );
  const invSlopedMatrix = slopedMatrix.clone().invert();

  // Matsing antenlerin 20 adet portunun slopedGroup koordinatlarını ve antenin içine uzanan derin penetrasyon hedeflerini hesapla
  function computeAntennaFeederTargets(targetZ, targetY, dropH) {
    const pMid = new THREE.Vector3(0, -dropH, 0);
    const pAntUpper = new THREE.Vector3(0, -dropH + 0.45 * 0.4369, -0.4048);
    const pAntLower = new THREE.Vector3(0, -dropH - 0.45 * 0.4369, 0.4048);
    const pipeVec = new THREE.Vector3().subVectors(pAntUpper, pAntLower);
    const dirU = pipeVec.clone().normalize();
    const dirN = new THREE.Vector3(0, -Math.abs(dirU.z), -Math.abs(dirU.y)).normalize();

    const orientMat = new THREE.Matrix4();
    orientMat.makeBasis(new THREE.Vector3(-1, 0, 0), dirU, dirN);
    const antPosInAssembly = pMid.clone().addScaledVector(dirN, 0.45);

    const H = 1.635;
    const D = 0.721;
    const halfD = D / 2;
    const portZLocal = -halfD + 0.09;
    const insideDepth = 0.22; // Anten gövdesinin 22 cm içine kadar girer (kesinlikle boşluk görünmez)

    const leftX = -0.22;
    const rightX = 0.22;

    const portsLocal = [];
    // 16 Upper FB Ports (Beams 1-4)
    const upperYs = [H * 0.38, H * 0.32, H * 0.22, H * 0.16];
    upperYs.forEach(py => {
      portsLocal.push(new THREE.Vector3(leftX - 0.035, py, portZLocal));
      portsLocal.push(new THREE.Vector3(leftX + 0.035, py, portZLocal));
      portsLocal.push(new THREE.Vector3(rightX - 0.035, py, portZLocal));
      portsLocal.push(new THREE.Vector3(rightX + 0.035, py, portZLocal));
    });
    // 4 Middle LB Ports (Toplam 20 port: 16 FB + 4 LB)
    portsLocal.push(new THREE.Vector3(leftX - 0.02, -0.02, portZLocal));
    portsLocal.push(new THREE.Vector3(leftX + 0.02, -0.02, portZLocal));
    portsLocal.push(new THREE.Vector3(rightX - 0.02, -0.02, portZLocal));
    portsLocal.push(new THREE.Vector3(rightX + 0.02, -0.02, portZLocal));

    return portsLocal.map((pLoc, idx) => {
      // Port ağzı noktası (Konnektör düzlemi)
      const pRot = pLoc.clone().applyMatrix4(orientMat);
      const pAssy = pRot.clone().add(antPosInAssembly);
      const pWorld = new THREE.Vector3(-3.00, targetY, targetZ).add(pAssy);
      const pEntry = pWorld.clone().applyMatrix4(invSlopedMatrix);

      // Anten gövdesinin 22cm içine penetrasyon noktası (Kullanıcı İsteği: "kabloları içine kadar uzat ki boş gibi görünmesin")
      const pInsideLoc = pLoc.clone().add(new THREE.Vector3(0, 0, insideDepth));
      const pInsideRot = pInsideLoc.clone().applyMatrix4(orientMat);
      const pInsideAssy = pInsideRot.clone().add(antPosInAssembly);
      const pInsideWorld = new THREE.Vector3(-3.00, targetY, targetZ).add(pInsideAssy);
      const pInside = pInsideWorld.clone().applyMatrix4(invSlopedMatrix);

      // Portun hemen dışı (Kablo yaklaşım doğrultusu)
      const pAppLoc = pLoc.clone().add(new THREE.Vector3(0, 0, -0.15));
      const pAppRot = pAppLoc.clone().applyMatrix4(orientMat);
      const pAppAssy = pAppRot.clone().add(antPosInAssembly);
      const pAppWorld = new THREE.Vector3(-3.00, targetY, targetZ).add(pAppAssy);
      const pApproach = pAppWorld.clone().applyMatrix4(invSlopedMatrix);

      return { idx, pEntry, pInside, pApproach };
    });
  }

  const antenna2Targets = computeAntennaFeederTargets(35.234, 9.022, 1.637);
  const antenna1Targets = computeAntennaFeederTargets(37.934, 9.385, 2.0);

  // A) ANTENNA 2'YE İNEN VE İÇİNE KADAR UZANAN 20 FEEDER KABLOSU (Z_world = 35.234m)
  feedersAntenna2.forEach((cfg, idx) => {
    const yOffsetNormal = trayBottomYNormal + (2 * cfg.tier - 1) * cfg.r + (cfg.tier - 1) * 0.003;
    const yOffsetDip = trayBottomYDip + (2 * cfg.tier - 1) * cfg.r + (cfg.tier - 1) * 0.003;
    const target = antenna2Targets[idx];
    const trayExitZ = 35.60;

    const path = new THREE.CurvePath();
    // 1. Tavada başlangıçtan kedi yolu inişine
    path.add(new THREE.LineCurve3(
      new THREE.Vector3(cfg.x, yOffsetNormal, 0.0),
      new THREE.Vector3(cfg.x, yOffsetNormal, 27.80)
    ));
    // 2. Kedi yolu altı in-çık
    path.add(new THREE.LineCurve3(
      new THREE.Vector3(cfg.x, yOffsetNormal, 27.80),
      new THREE.Vector3(cfg.x, yOffsetDip, 28.30)
    ));
    path.add(new THREE.LineCurve3(
      new THREE.Vector3(cfg.x, yOffsetDip, 28.30),
      new THREE.Vector3(cfg.x, yOffsetDip, 29.75)
    ));
    path.add(new THREE.LineCurve3(
      new THREE.Vector3(cfg.x, yOffsetDip, 29.75),
      new THREE.Vector3(cfg.x, yOffsetNormal, 30.25)
    ));
    // 3. Tavada çıkış noktasına kadar ilerleme
    path.add(new THREE.LineCurve3(
      new THREE.Vector3(cfg.x, yOffsetNormal, 30.25),
      new THREE.Vector3(cfg.x, yOffsetNormal, trayExitZ)
    ));

    // 4. Tavadan iniş kavisi (Tavadan ayrılıp anten düşey borusu arkasından porta yöneliş)
    path.add(new THREE.CubicBezierCurve3(
      new THREE.Vector3(cfg.x, yOffsetNormal, trayExitZ),
      new THREE.Vector3(cfg.x * 0.9, yOffsetNormal - 0.25, trayExitZ + 0.35),
      new THREE.Vector3(target.pApproach.x * 0.75, -0.65, target.pApproach.z - 0.25),
      target.pApproach
    ));

    // 5. Port girişine doğru düz geçiş
    path.add(new THREE.LineCurve3(target.pApproach, target.pEntry));

    // 6. Antenin içine kadar uzanış (Gövdenin içine 22 cm penetrasyon)
    path.add(new THREE.LineCurve3(target.pEntry, target.pInside));

    const tubeGeo = new THREE.TubeGeometry(path, 64, cfg.r, 8, false);
    const tubeMesh = new THREE.Mesh(tubeGeo, cfg.mat);
    tubeMesh.castShadow = true;
    slopedGroup.add(tubeMesh);

    // 7/16 DIN Konnektör ve Sızdırmazlık Pabucu (Port girişinde tam hizada)
    const bootDir = new THREE.Vector3().subVectors(target.pEntry, target.pApproach).normalize();
    const bootQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), bootDir);

    const conn = new THREE.Mesh(connectorGeo, dinConnectorMat);
    conn.position.copy(target.pEntry);
    conn.quaternion.copy(bootQuat);
    slopedGroup.add(conn);

    const boot = new THREE.Mesh(bootGeo, bootMat);
    boot.position.copy(target.pEntry).addScaledVector(bootDir, -0.025);
    boot.quaternion.copy(bootQuat);
    slopedGroup.add(boot);
  });

  // Antenna 2 Tava Çıkış Oluğu Sacı (Cable Waterfall Bracket at z = 35.75m)
  const dropOutChute2Geo = new THREE.BoxGeometry(0.22, 0.02, 0.35);
  const dropOutChute2 = new THREE.Mesh(dropOutChute2Geo, steelFlangeMat);
  dropOutChute2.position.set(-0.15, trayBottomYNormal - 0.04, 35.75);
  dropOutChute2.rotation.x = 0.35;
  slopedGroup.add(dropOutChute2);

  // B) ANTENNA 1'E İNEN VE İÇİNE KADAR UZANAN 20 FEEDER KABLOSU (Z_world = 37.934m)
  feedersAntenna1.forEach((cfg, idx) => {
    const yOffsetNormal = trayBottomYNormal + (2 * cfg.tier - 1) * cfg.r + (cfg.tier - 1) * 0.003;
    const yOffsetDip = trayBottomYDip + (2 * cfg.tier - 1) * cfg.r + (cfg.tier - 1) * 0.003;
    const target = antenna1Targets[idx];
    const trayExitZ = 38.30;

    const path = new THREE.CurvePath();
    // 1. Tavada başlangıçtan kedi yolu inişine
    path.add(new THREE.LineCurve3(
      new THREE.Vector3(cfg.x, yOffsetNormal, 0.0),
      new THREE.Vector3(cfg.x, yOffsetNormal, 27.80)
    ));
    // 2. Kedi yolu altı in-çık
    path.add(new THREE.LineCurve3(
      new THREE.Vector3(cfg.x, yOffsetNormal, 27.80),
      new THREE.Vector3(cfg.x, yOffsetDip, 28.30)
    ));
    path.add(new THREE.LineCurve3(
      new THREE.Vector3(cfg.x, yOffsetDip, 28.30),
      new THREE.Vector3(cfg.x, yOffsetDip, 29.75)
    ));
    path.add(new THREE.LineCurve3(
      new THREE.Vector3(cfg.x, yOffsetDip, 29.75),
      new THREE.Vector3(cfg.x, yOffsetNormal, 30.25)
    ));
    // 3. Antenna 2 yanından geçerek Antenna 1 çıkışına kadar ilerleme
    path.add(new THREE.LineCurve3(
      new THREE.Vector3(cfg.x, yOffsetNormal, 30.25),
      new THREE.Vector3(cfg.x, yOffsetNormal, trayExitZ)
    ));

    // 4. Tavadan iniş kavisi (Tavadan ayrılıp anten düşey borusu arkasından porta yöneliş)
    path.add(new THREE.CubicBezierCurve3(
      new THREE.Vector3(cfg.x, yOffsetNormal, trayExitZ),
      new THREE.Vector3(cfg.x * 0.9, yOffsetNormal - 0.25, trayExitZ + 0.35),
      new THREE.Vector3(target.pApproach.x * 0.75, -0.95, target.pApproach.z - 0.25),
      target.pApproach
    ));

    // 5. Port girişine doğru düz geçiş
    path.add(new THREE.LineCurve3(target.pApproach, target.pEntry));

    // 6. Antenin içine kadar uzanış (Gövdenin içine 22 cm penetrasyon)
    path.add(new THREE.LineCurve3(target.pEntry, target.pInside));

    const tubeGeo = new THREE.TubeGeometry(path, 64, cfg.r, 8, false);
    const tubeMesh = new THREE.Mesh(tubeGeo, cfg.mat);
    tubeMesh.castShadow = true;
    slopedGroup.add(tubeMesh);

    // 7/16 DIN Konnektör ve Sızdırmazlık Pabucu (Port girişinde tam hizada)
    const bootDir = new THREE.Vector3().subVectors(target.pEntry, target.pApproach).normalize();
    const bootQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), bootDir);

    const conn = new THREE.Mesh(connectorGeo, dinConnectorMat);
    conn.position.copy(target.pEntry);
    conn.quaternion.copy(bootQuat);
    slopedGroup.add(conn);

    const boot = new THREE.Mesh(bootGeo, bootMat);
    boot.position.copy(target.pEntry).addScaledVector(bootDir, -0.025);
    boot.quaternion.copy(bootQuat);
    slopedGroup.add(boot);
  });

  // Antenna 1 Tava Çıkış Oluğu Sacı (Cable Waterfall Bracket at z = 38.45m)
  const dropOutChute1Geo = new THREE.BoxGeometry(0.22, 0.02, 0.35);
  const dropOutChute1 = new THREE.Mesh(dropOutChute1Geo, steelFlangeMat);
  dropOutChute1.position.set(-0.03, trayBottomYNormal - 0.04, 38.45);
  dropOutChute1.rotation.x = 0.35;
  slopedGroup.add(dropOutChute1);

  // C) 16 ADET ENERJİ KABLOSU: BETONA YAKIN ARA KEDİ YOLUNA KADAR GELİR
  // Kullanıcı İsteği: "enerji kabloları ise yakın kedi yoluna kadar gelecek. Bunu da o noktaya getir ve tavaların fazlasını kaldır"
  powerCables.forEach((cfg, idx) => {
    const yOffsetNormal = trayBottomYNormal + (2 * cfg.tier - 1) * cfg.r + (cfg.tier - 1) * 0.003;

    const col = idx % 4;
    const row = Math.floor(idx / 4);
    const targetX = 0.26 + col * 0.035; // Kedi yolunun arka kirişine doğru yana açılma
    const targetY = 0.68 + row * 0.025; // Kedi yolu kirişi seviyesine yükselme
    const targetZ = 28.62;              // Kedi yolu arka kiriş aksı (slopedGroup koordinatlarında)

    const path = new THREE.CurvePath();
    // 1. Tavada başlangıçtan kedi yolu branşmanına kadar ilerleme
    path.add(new THREE.LineCurve3(
      new THREE.Vector3(cfg.x, yOffsetNormal, 0.0),
      new THREE.Vector3(cfg.x, yOffsetNormal, 27.60)
    ));

    // 2. Tavadan ayrılarak kedi yolunun arka kirişine kavisli geçiş
    path.add(new THREE.CubicBezierCurve3(
      new THREE.Vector3(cfg.x, yOffsetNormal, 27.60),
      new THREE.Vector3(cfg.x, yOffsetNormal + 0.03, 27.95),
      new THREE.Vector3(targetX * 0.85, targetY - 0.03, targetZ - 0.22),
      new THREE.Vector3(targetX, targetY, targetZ)
    ));

    // 3. Kedi yolu arka kirişindeki dağıtım panosu terminaline giriş
    path.add(new THREE.LineCurve3(
      new THREE.Vector3(targetX, targetY, targetZ),
      new THREE.Vector3(targetX, targetY + 0.14, targetZ)
    ));

    const pCableGeo = new THREE.TubeGeometry(path, 40, cfg.r, 8, false);
    const pCable = new THREE.Mesh(pCableGeo, cfg.mat);
    pCable.castShadow = true;
    slopedGroup.add(pCable);
  });

  // Yakın Kedi Yolu Enerji Kablo Çıkış Konsolu & Oluğu (z = 27.90m)
  const powerChuteGeo = new THREE.BoxGeometry(0.20, 0.02, 0.40);
  const powerChute = new THREE.Mesh(powerChuteGeo, steelFlangeMat);
  powerChute.position.set(0.24, trayBottomYNormal + 0.04, 28.00);
  powerChute.rotation.z = 0.25;
  powerChute.rotation.x = -0.15;
  slopedGroup.add(powerChute);

  // Kedi Yolu Arka Kirişindeki Saha Enerji Dağıtım Panosu (PDU / Terminal Enclosure)
  const pduGeo = new THREE.BoxGeometry(0.28, 0.25, 0.16);
  const pduMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8, roughness: 0.3 });
  const pduBox = new THREE.Mesh(pduGeo, pduMat);
  pduBox.position.set(0.32, 0.88, 28.62);
  pduBox.castShadow = true;
  slopedGroup.add(pduBox);

  // Pano ön kapağı
  const pduDoorGeo = new THREE.BoxGeometry(0.26, 0.23, 0.015);
  const pduDoorMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.25 });
  const pduDoor = new THREE.Mesh(pduDoorGeo, pduDoorMat);
  pduDoor.position.set(0.32, 0.88, 28.62 - 0.085);
  slopedGroup.add(pduDoor);

  // Tava İçi Paslanmaz Çok Katmanlı Kablo Kelepçeleri (POI inişine kadar olan bölge)
  const cleatMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });
  const cleatGeo1 = new THREE.BoxGeometry(trayW - 0.04, 0.012, 0.03);
  const cleatGeo2 = new THREE.BoxGeometry(trayW - 0.04, 0.012, 0.03);
  const cleatGeo3 = new THREE.BoxGeometry(trayW - 0.04, 0.012, 0.03);
  const cleatGeo4 = new THREE.BoxGeometry(trayW - 0.04, 0.015, 0.04);
  for (let zCl = 1.0; zCl <= 41.0; zCl += 2.0) {
    if (zCl >= 27.0 && zCl <= 31.0) continue;
    const cleat1 = new THREE.Mesh(cleatGeo1, cleatMat);
    cleat1.position.set(0, trayBottomYNormal + 0.043, zCl);
    slopedGroup.add(cleat1);

    const cleat2 = new THREE.Mesh(cleatGeo2, cleatMat);
    cleat2.position.set(0, trayBottomYNormal + 0.073, zCl);
    slopedGroup.add(cleat2);

    const cleat3 = new THREE.Mesh(cleatGeo3, cleatMat);
    cleat3.position.set(0, trayBottomYNormal + 0.103, zCl);
    slopedGroup.add(cleat3);

    const cleat4 = new THREE.Mesh(cleatGeo4, cleatMat);
    cleat4.position.set(0, trayBottomYNormal + 0.135, zCl);
    slopedGroup.add(cleat4);
  }

  // -------------------------------------------------------------
  // 5B. ORTA KEDİ YOLU ÖNÜNDEKİ 45M MAKAS ÇAPRAZ DİREKLERİNE PARALEL 20CM OFSETLİ MONTAJ BORULARI (~3 METRE)
  //
  // Kullanıcı İsteği:
  // - "bu rruları ve ofsetlerini sil. Her iki dikmeyede ona paralel şekilde 20cmli ofsetler ekle. boru boyu 3 metreye takın olsun"
  //
  // Mimari & Geometri Detayı:
  // 1. İstasyon: stZ = 30.00m (Orta kedi yolu z ≈ 28.5-29.5m'nin hemen önü, çatı ucuna bakan aks)
  // 2. Taşıyıcı Dikmeler: 45m makasın Ø14cm sol (X < 0) ve sağ (X > 0) çapraz direkleri (Boy = 2.997m ≈ 3.0m)
  // 3. 20 cm Ofset:
  //    - Çapraz direk aksından +Z yönünde (çatı ucuna doğru) net 20 cm konsol mesafesi (Z = 30.00m -> Z = 30.20m)
  // 4. Direklere Birebir Paralel Montaj Boruları:
  //    - Her iki dikmenin eğim vektörüne tam paralel (Sol: dx = -1.40, dy = 2.65; Sağ: dx = 1.40, dy = 2.65)
  //    - Boru Çapı: Standart 2 inç (Ø60.3mm) sıcak daldırma galvaniz çelik boru
  //    - Boru Boyu: 2.90 metre (~3 metreye yakın, dip silindirden tepe başlığına kadar tam boy)
  // 5. 20 cm Standoff Konsol Kelepçeleri:
  //    - Her dikme üzerinde 3 adet (t = 0.20, 0.50, 0.80) ağır hizmet çift parçalı kelepçe bileziği,
  //      60x60mm kutu profil konsol kolu, berkitme gusset sacları ve boru tespit eyeri
  // -------------------------------------------------------------
  const midTrussOffsetPipesGroup = new THREE.Group();
  midTrussOffsetPipesGroup.name = 'midTrussParallelOffsetPipes';

  // Malzemeler
  const galvPipeMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.85, roughness: 0.25 });
  const clampSteelMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.3 });
  const boltSteelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.15 });

  const stZ_midTruss = 30.00; // Makas çapraz kol aksı Z kotu
  const zOffsetStandoff = 0.20; // 20 cm ofset
  const zParallelPipe = stZ_midTruss + zOffsetStandoff; // 30.20m (Montaj boruları merkez ekseni)

  const pipeRadius = 0.03015; // 2 inç boru (Dış çap Ø60.3mm)
  const pipeLength = 2.90; // 3 metreye yakın boy (~2.90m)

  // Çapraz direklerin parametreleri
  const strutConfigs = [
    {
      name: 'left',
      base: new THREE.Vector3(-armBaseX, armBaseY, stZ_midTruss),
      top: new THREE.Vector3(-armTopX, armTopY, stZ_midTruss),
      isLeft: true
    },
    {
      name: 'right',
      base: new THREE.Vector3(armBaseX, armBaseY, stZ_midTruss),
      top: new THREE.Vector3(armTopX, armTopY, stZ_midTruss),
      isLeft: false
    }
  ];

  strutConfigs.forEach(sc => {
    const strutVec = new THREE.Vector3().subVectors(sc.top, sc.base);
    const strutLen = strutVec.length(); // ~2.997m
    const strutDir = strutVec.clone().normalize();
    const upVec = new THREE.Vector3(0, 1, 0);
    const strutQuat = new THREE.Quaternion().setFromUnitVectors(upVec, strutDir);

    // 1. DİKMEDEN 20 CM OFSETLİ 2" PARALEL MONTAJ BORUSU (~2.90m)
    // Borunun merkez konumu: Dikmenin orta noktasının 20 cm +Z ofseti
    const strutMid = new THREE.Vector3().addVectors(sc.base, sc.top).multiplyScalar(0.5);
    const pipeMid = new THREE.Vector3(strutMid.x, strutMid.y, zParallelPipe);

    const pipeGeo = new THREE.CylinderGeometry(pipeRadius, pipeRadius, pipeLength, 32);
    const pipeMesh = new THREE.Mesh(pipeGeo, galvPipeMat);
    pipeMesh.quaternion.copy(strutQuat);
    pipeMesh.position.copy(pipeMid);
    pipeMesh.castShadow = true;
    pipeMesh.receiveShadow = true;
    pipeMesh.name = `parallelPipe_${sc.name}`;
    midTrussOffsetPipesGroup.add(pipeMesh);

    // Boru Alt ve Üst Uç Kapakları (Weatherproof Sealing Caps)
    const capGeo = new THREE.CylinderGeometry(pipeRadius + 0.003, pipeRadius + 0.003, 0.015, 24);
    const halfLen = pipeLength / 2;
    const botPos = pipeMid.clone().addScaledVector(strutDir, -halfLen);
    const topPos = pipeMid.clone().addScaledVector(strutDir, halfLen);

    const botCap = new THREE.Mesh(capGeo, clampSteelMat);
    botCap.quaternion.copy(strutQuat);
    botCap.position.copy(botPos);
    midTrussOffsetPipesGroup.add(botCap);

    const topCap = new THREE.Mesh(capGeo, clampSteelMat);
    topCap.quaternion.copy(strutQuat);
    topCap.position.copy(topPos);
    midTrussOffsetPipesGroup.add(topCap);

    // 2. 20 CM OFSETLİ AĞIR HİZMET TAŞIYICI KONSOL BRAKETLERİ (3 Noktadan Sabitleme)
    const bracketStations = [0.20, 0.50, 0.80]; // Dikme boyunca %20, %50 ve %80 konumları
    bracketStations.forEach(t => {
      const bracketGroup = new THREE.Group();
      const strutPoint = new THREE.Vector3().lerpVectors(sc.base, sc.top, t);
      const pipePoint = new THREE.Vector3(strutPoint.x, strutPoint.y, zParallelPipe);

      // A) Ø14cm Çapraz Direği Saran İki Parçalı Kelepçe Bileziği
      const clampCollarGeo = new THREE.CylinderGeometry(diagonalRadius + 0.012, diagonalRadius + 0.012, 0.10, 24);
      const clampCollar = new THREE.Mesh(clampCollarGeo, clampSteelMat);
      clampCollar.quaternion.copy(strutQuat);
      clampCollar.position.copy(strutPoint);
      bracketGroup.add(clampCollar);

      // Kelepçe yan sıkma kulakları ve cıvataları
      const clampEarGeo = new THREE.BoxGeometry(0.04, 0.08, 0.02);
      const earOffsetSign = sc.isLeft ? 1 : -1;
      const ear1 = new THREE.Mesh(clampEarGeo, clampSteelMat);
      ear1.position.set(strutPoint.x + earOffsetSign * 0.085, strutPoint.y, strutPoint.z);
      bracketGroup.add(ear1);
      const ear2 = new THREE.Mesh(clampEarGeo, clampSteelMat);
      ear2.position.set(strutPoint.x - earOffsetSign * 0.085, strutPoint.y, strutPoint.z);
      bracketGroup.add(ear2);

      // B) 20 cm Net Ofset Kolu (60x60mm Kutu Profil, Z = 30.00m -> Z = 30.20m)
      const armLength = zOffsetStandoff;
      const armGeo = new THREE.BoxGeometry(0.06, 0.06, armLength);
      const armMesh = new THREE.Mesh(armGeo, clampSteelMat);
      armMesh.position.set(strutPoint.x, strutPoint.y, strutPoint.z + armLength / 2);
      armMesh.castShadow = true;
      bracketGroup.add(armMesh);

      // Rijitleştirici üçgen gusset berkitme sacları (Üst ve Alt)
      const gussetShape = new THREE.Shape();
      gussetShape.moveTo(0, 0);
      gussetShape.lineTo(0.08, 0);
      gussetShape.lineTo(0, 0.08);
      gussetShape.closePath();
      const extrudeSettings = { depth: 0.008, bevelEnabled: false };
      const gussetGeo = new THREE.ExtrudeGeometry(gussetShape, extrudeSettings);

      const topGusset = new THREE.Mesh(gussetGeo, clampSteelMat);
      topGusset.rotation.y = -Math.PI / 2;
      topGusset.position.set(strutPoint.x + 0.004, strutPoint.y + 0.03, strutPoint.z + 0.01);
      bracketGroup.add(topGusset);

      const botGusset = new THREE.Mesh(gussetGeo, clampSteelMat);
      botGusset.rotation.y = -Math.PI / 2;
      botGusset.rotation.x = -Math.PI / 2;
      botGusset.position.set(strutPoint.x + 0.004, strutPoint.y - 0.03, strutPoint.z + 0.01);
      bracketGroup.add(botGusset);

      // C) 2" Boru Bağlantı Eyeri ve Çift U-Bolt Kelepçesi (Z = 30.20m)
      const saddlePlateGeo = new THREE.BoxGeometry(0.10, 0.10, 0.015);
      const saddlePlate = new THREE.Mesh(saddlePlateGeo, clampSteelMat);
      saddlePlate.position.set(pipePoint.x, pipePoint.y, pipePoint.z - pipeRadius - 0.0075);
      bracketGroup.add(saddlePlate);

      // Boruyu saran U-bolt kelepçesi
      const uBoltGeo = new THREE.TorusGeometry(pipeRadius + 0.004, 0.006, 8, 24, Math.PI);
      const uBolt1 = new THREE.Mesh(uBoltGeo, boltSteelMat);
      uBolt1.quaternion.copy(strutQuat);
      uBolt1.rotateY(Math.PI / 2);
      uBolt1.position.copy(pipePoint);
      bracketGroup.add(uBolt1);

      midTrussOffsetPipesGroup.add(bracketGroup);
    });

    // 3. HER BİR BORUDA 3 SIRA HALİNDE, KISA KENARLARINDAN 20CM OFSET BORUSUNA BAĞLANAN RRU'LAR
    // Kullanıcı İsteği ve Saha Fotoğrafı (Rams Park / NEF Stadyumu Kedi Yolu İmalatı):
    // - "ortadaki kedi yolunun uç kediyoluna yakın olan tarafındanki taşıyıcı dikmelere turkcell 4 tt 4 vdf 6 olacak şekilde rru takacagız"
    // - "Her iki dikmeye de ona paralel şekilde 20cmli ofsetler ekle. boru boyu 3 metreye yakın olsun"
    // - "3 sıra rru koyacaksın şimdi her bir boruya buna göre ayarla..."
    // - "RRUNUN kısa kenarını ofsete baglayacaksın."
    // - "vdf yanına 2 tane daha ekle yanı 3 3 grupla"
    //
    // Dağılım ve Gruplama (Toplam 14 RRU):
    // - Sol Direk (Left Pipe):
    //   * Üst Sıra: 2 adet Turkcell RRU 5301
    //   * Orta Sıra: 2 adet Turkcell RRU 5502 (Toplam 4 Turkcell)
    //   * Alt Sıra: 3 adet Vodafone RRU 5526t
    // - Sağ Direk (Right Pipe):
    //   * Üst Sıra: 2 adet Türk Telekom NR RRU 5818W
    //   * Orta Sıra: 2 adet Türk Telekom RRU 5527 (Toplam 4 TT)
    //   * Alt Sıra: 3 adet Vodafone RRU 5526t (Toplam 6 Vodafone, 3+3 gruplu)
    //
    // Saha İmalat Mimari & Geometrisi:
    // 1. Açısal Uyum: RRU'ların boyu (H = 48cm), makas çapraz direği ve 2" ofset borusunun eğim açısıyla (strutDir) birebir aynı açıda uzanır.
    // 2. Kısa Kenardan Ofset Borusuna Bağlantı: RRU'nun dar/kısa kenarı (derinlik D = 14cm), 20cm ofset borusu üzerindeki ağır hizmet
    //    çelik kelepçe eyerine doğrudan kenetlenir; gövde (genişlik W = 35.6cm) borudan kedi yolu yönüne (+Z) doğru kanat gibi uzanır.
    // 3. Kısa Kenarlarından Yan Yana Dizilim:
    //    * Üst ve Orta sıralarda 2'şerli RRU (D = 14cm yan yana, genişlik ~31cm, konsol 36cm).
    //    * Alt sırada Vodafone 3'erli RRU (D = 13.5cm yan yana, 3+3 gruplama, genişlik ~48cm, konsol 52cm).
    // 4. Saha Kablolaması: Fotoğraftaki gibi alt portlardan çıkan siyah feeder/jumper kablo demetleri boru boyunca aşağı doğru kavis yapar.
    const rruRows = [
      {
        s: -0.65, // Alt Sıra (Y ≈ 0.83m)
        tierLabel: 'Alt Sıra',
        count: 3, // Vodafone: Her iki direkte 3'er adet (3+3 = 6 adet Vdf)
        item: {
          id: 'vodafone-5526t',
          category: 'Vodafone',
          name: 'Vodafone RRU 5526t',
          width: 0.356,
          height: 0.480,
          depth: 0.135,
          weight: 28,
          color: '#dc2626'
        }
      },
      {
        s: 0.00, // Orta Sıra (Y ≈ 1.405m)
        tierLabel: 'Orta Sıra',
        count: 2,
        item: sc.isLeft
          ? { id: 'tcell-5502', category: 'Turkcell', name: 'Turkcell RRU 5502', width: 0.356, height: 0.480, depth: 0.140, weight: 25, color: '#1d4ed8' }
          : { id: 'tt-5527', category: 'Türk Telekom', name: 'Türk Telekom RRU 5527', width: 0.356, height: 0.480, depth: 0.140, weight: 25, color: '#0891b2' }
      },
      {
        s: 0.65, // Üst Sıra (Y ≈ 1.98m)
        tierLabel: 'Üst Sıra',
        count: 2,
        item: sc.isLeft
          ? { id: 'tcell-5301', category: 'Turkcell', name: 'Turkcell RRU 5301', width: 0.356, height: 0.480, depth: 0.140, weight: 25, color: '#1d4ed8' }
          : { id: 'tt-5818w', category: 'Türk Telekom', name: 'Türk Telekom NR RRU 5818W', width: 0.356, height: 0.480, depth: 0.140, weight: 25, color: '#0891b2' }
      }
    ];

    // Yönelim Matrisi: Y = strutDir (boru ekseni), Z = (0,0,1) (çatı ucuna/dışarı doğru), X = perpDir (boruya dik travers)
    const zDir = new THREE.Vector3(0, 0, 1);
    const perpDir = new THREE.Vector3().crossVectors(strutDir, zDir).normalize();
    const rowBasisMat = new THREE.Matrix4().makeBasis(perpDir, strutDir, zDir);
    const rowQuat = new THREE.Quaternion().setFromRotationMatrix(rowBasisMat);

    const jumperCableMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.6, metalness: 0.2 });

    rruRows.forEach(rw => {
      const rowPipePoint = pipeMid.clone().addScaledVector(strutDir, rw.s);

      // Her sıra için boru eksenine ve eğimine tam kilitli montaj grubu
      const rowGroup = new THREE.Group();
      rowGroup.position.copy(rowPipePoint);
      rowGroup.quaternion.copy(rowQuat);

      // A) 2" Boruyu Saran Ağır Hizmet İkili Eyer Kelepçesi (Dual Clamp Collar on 2" pipe)
      const pipeCollarGeo = new THREE.CylinderGeometry(pipeRadius + 0.008, pipeRadius + 0.008, 0.22, 24);
      const pipeCollar = new THREE.Mesh(pipeCollarGeo, clampSteelMat);
      rowGroup.add(pipeCollar);

      // Kelepçeyi boruya sıkan çift parçalı çeneler ve M14 cıvatalar
      [-0.07, 0.07].forEach(cy => {
        const earGeo = new THREE.BoxGeometry(0.09, 0.02, 0.02);
        const ear = new THREE.Mesh(earGeo, clampSteelMat);
        ear.position.set(0, cy, 0.01);
        rowGroup.add(ear);

        [-0.035, 0.035].forEach(ex => {
          const boltGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.025, 6);
          const bolt = new THREE.Mesh(boltGeo, boltSteelMat);
          bolt.rotation.x = Math.PI / 2;
          bolt.position.set(ex, cy, 0.015);
          rowGroup.add(bolt);
        });
      });

      // B) RRU'ların Kısa Kenarlarını Oturtan Ön Montaj Konsolu (Z = 0.01 to 0.04m)
      const count = rw.count || 2;
      const bracketWidth = count === 3 ? 0.52 : 0.36;
      const mountBracketGeo = new THREE.BoxGeometry(bracketWidth, 0.12, 0.03);
      const mountBracket = new THREE.Mesh(mountBracketGeo, clampSteelMat);
      mountBracket.position.set(0, 0, 0.025);
      rowGroup.add(mountBracket);

      const W = rw.item.width || 0.356;
      const H = rw.item.height || 0.480;
      const D = rw.item.depth || 0.140;

      // RRU'ların merkezleri: Kısa kenarları (D = 14cm) boru montaj konsolunda yan yana
      // count === 2 için 2'li [-stepX/2, stepX/2]
      // count === 3 için 3'lü [-stepX, 0, stepX] (Vodafone 3+3 gruplama)
      const stepX = count === 3 ? (D + 0.030) : (D + 0.035);
      const rruPositions = count === 3
        ? [
            { x: -stepX, label: 'Sol' },
            { x: 0, label: 'Orta' },
            { x: stepX, label: 'Sağ' }
          ]
        : [
            { x: -stepX / 2, label: 'Sol' },
            { x: stepX / 2, label: 'Sağ' }
          ];

      rruPositions.forEach((posInfo, idx) => {
        const rruX = posInfo.x;
        const subLabel = posInfo.label;
        const rruSub = new THREE.Group();
        rruSub.name = `${rw.item.category}_${rw.item.name}_${subLabel}`;
        rruSub.userData = {
          id: state.nextId++,
          type: 'rru',
          blockType: 'custom-equipment',
          catalogId: rw.item.id,
          category: rw.item.category,
          name: `${rw.item.name} (${sc.isLeft ? 'Sol Direk' : 'Sağ Direk'} ${rw.tierLabel} - ${subLabel})`,
          width: W,
          height: H,
          depth: D,
          weight: rw.item.weight || 25,
          interactive: true,
          locked: false,
          allowPassThrough: true
        };

        const centerZ = 0.04 + W / 2;

        // 1. RRU Gövdesi (Kısa kenarı D=14cm X ekseninde, Boyu H=48cm boru yönünde Y'de, Genişliği W=35.6cm dışarı doğru Z'de)
        const bodyMat = new THREE.MeshStandardMaterial({
          color: rw.item.color,
          roughness: 0.4,
          metalness: 0.35
        });
        const bodyGeo = new THREE.BoxGeometry(D, H, W);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.set(rruX, 0, centerZ);
        body.castShadow = true;
        body.receiveShadow = true;
        body.name = "rru_body";
        rruSub.add(body);

        // 2. Alüminyum Soğutucu Kanatlar (Heatsink: dışa bakan geniş yüzeyde)
        const finMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7, roughness: 0.4 });
        const finFaceSign = (idx === 0) ? -1 : 1;
        const finGeo = new THREE.BoxGeometry(0.015, H * 0.92, W * 0.92);
        const fin = new THREE.Mesh(finGeo, finMat);
        fin.position.set(rruX + finFaceSign * (D / 2 + 0.0075), 0, centerZ);
        rruSub.add(fin);

        // 3. Ön Operatör Logo & İsim Plakası (İçe bakan geniş yüzeyde)
        const badgeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.5 });
        const badgeGeo = new THREE.BoxGeometry(0.004, H * 0.35, W * 0.55);
        const badge = new THREE.Mesh(badgeGeo, badgeMat);
        badge.position.set(rruX - finFaceSign * (D / 2 + 0.002), H * 0.10, centerZ);
        rruSub.add(badge);

        // 4. KISA KENAR TESPİT BRAKETLERİ (RRU'nun kısa kenarını boru konsoluna kilitleyen pabuç ve cıvatalar)
        // Kullanıcı İsteği: "RRUNUN kısa kenarını ofsete baglayacaksın."
        // Kısa kenar Z = 0.04m hizasındadır (D = 14cm genişlikte, H = 48cm boyunda)
        [H * 0.28, -H * 0.28].forEach(clampY => {
          // Kısa kenarı kavrayan çelik mengene sacı
          const clampFlangeGeo = new THREE.BoxGeometry(D + 0.02, 0.06, 0.015);
          const clampFlange = new THREE.Mesh(clampFlangeGeo, clampSteelMat);
          clampFlange.position.set(rruX, clampY, 0.04);
          rruSub.add(clampFlange);

          // Cıvata başları
          [-D * 0.35, D * 0.35].forEach(cx => {
            const bGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.015, 6);
            bGeo.rotateX(Math.PI / 2);
            const bMesh = new THREE.Mesh(bGeo, boltSteelMat);
            bMesh.position.set(rruX + cx, clampY, 0.048);
            rruSub.add(bMesh);
          });
        });

        // 5. Üst Taşıma Kulpu (+Y yönünde, boru boyunca yukarı bakar)
        const handleMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.2 });
        const handleGeo = new THREE.BoxGeometry(0.03, 0.03, W * 0.45);
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.position.set(rruX, H / 2 + 0.015, centerZ);
        rruSub.add(handle);

        // 6. Alt Portlar ve Siyah Feeder/Jumper Kablolar (-Y yönünde, fotoğraftaki gibi aşağı sarkar)
        [-W * 0.30, -W * 0.10, W * 0.10, W * 0.30].forEach((pz, pIdx) => {
          const portMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.95, roughness: 0.15 });
          const portGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.03, 12);
          const port = new THREE.Mesh(portGeo, portMat);
          port.position.set(rruX, -H / 2 - 0.015, centerZ + pz);
          rruSub.add(port);

          // Fotoğraftaki gibi porttan çıkıp boru boyunca aşağı doğru kavis yapan siyah kablo demetleri
          const cableStart = new THREE.Vector3(rruX, -H / 2 - 0.03, centerZ + pz);
          const cableMid = new THREE.Vector3(rruX * 0.7, -H / 2 - 0.18 - pIdx * 0.04, centerZ + pz * 0.6);
          const cableEnd = new THREE.Vector3(0, -H / 2 - 0.38 - pIdx * 0.06, 0.03);
          const cableCurve = new THREE.CubicBezierCurve3(
            cableStart,
            new THREE.Vector3(cableStart.x, cableStart.y - 0.08, cableStart.z),
            new THREE.Vector3(cableMid.x, cableMid.y - 0.06, cableMid.z),
            cableEnd
          );
          const cableGeo = new THREE.TubeGeometry(cableCurve, 12, 0.007, 6, false);
          const cableMesh = new THREE.Mesh(cableGeo, jumperCableMat);
          cableMesh.castShadow = true;
          rruSub.add(cableMesh);
        });

        rowGroup.add(rruSub);
      });

      midTrussOffsetPipesGroup.add(rowGroup);
    });
  });

  slopedGroup.add(midTrussOffsetPipesGroup);

  // -------------------------------------------------------------
  // 6. DİKEY MERDİVEN (X = -3.00m) İLE EĞİMLİ ÇATI TAVASI BAĞLANTI DÜĞÜMÜ
  // -------------------------------------------------------------
  const jointGroup = new THREE.Group();
  jointGroup.name = 'ladderToSlopedTrayJoint';
  jointGroup.position.set(-3.00, 4.00, -1.35); // Dikey merdivenin en üst ucu

  // Yatay boru kiriş ile eğimli ana boru arasındaki ağır taşıyıcı çelik eyer/pabuç (Mounting Saddle)
  const saddleGeo = new THREE.BoxGeometry(0.36, 0.20, 0.36);
  const saddle = new THREE.Mesh(saddleGeo, steelFlangeMat);
  saddle.position.set(0, 0.08, 0);
  saddle.castShadow = true;
  jointGroup.add(saddle);

  // Merdivenden yükseltilmiş kaide tavasına geçiş yan kılavuz sacları
  const guideH = trayBottomYNormal + 0.15;
  [-trayW / 2, trayW / 2].forEach(gx => {
    const guideGeo = new THREE.BoxGeometry(0.006, guideH, 0.35);
    const guide = new THREE.Mesh(guideGeo, traySideMat);
    guide.position.set(gx, guideH / 2, 0.08);
    jointGroup.add(guide);
  });

  // Yatay boru tavasından eğimli kaide tavasına yumuşak kablo akış geçiş kavisleri (64 kablo, 4 katman)
  telecomCables.forEach(cfg => {
    const targetY = 0.10 + trayBottomYNormal + (2 * cfg.tier - 1) * cfg.r + (cfg.tier - 1) * 0.003;
    const targetZ = 0.12 * Math.cos(slopeAngleRad);
    const startY = 0.14 + (2 * cfg.tier - 1) * cfg.r;

    const u = cfg.x * 0.80;
    const bendCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(u + 0.35, startY, -0.05),
      new THREE.Vector3(u + 0.08, startY + (targetY - startY) * 0.5, 0.05),
      new THREE.Vector3(u, targetY, targetZ)
    );
    const bendGeo = new THREE.TubeGeometry(bendCurve, 10, cfg.r, 8, false);
    const bendCable = new THREE.Mesh(bendGeo, cfg.mat);
    jointGroup.add(bendCable);
  });

  trussGroup.add(jointGroup);


  alan2Group.add(trussGroup);

  // -------------------------------------------------------------
  // 7. 45 METRELİK ÇATI MAKASI UCUNA İNDİRİLEN ALAN-1 KEDİ YOLU VE DİKEY BAĞLANTI
  // Kullanıcı İsteği:
  // - Alan-1'deki kedi yolunun birebir yapısı (100cm ızgara taban, sarı korkuluklar, konsol traversler, Ø45.7cm taşıyıcı silindir).
  // - Taşıyıcı silindiri tam olarak 45m çatı makasının bittiği uca denk gelip dikey bağlantı sağlar (Z = 43.25m).
  // - Korkuluk üst kotu: 48.75m (Model Y = 8.75m).
  // - 1m korkuluk payı ile kedi yolu taban sacı yürüme kotu: 47.75m (Model Y = 7.75m).
  // - Taşıyıcı silindir eksen kotu: Y = 7.75 - 0.4535 = 7.2965m (Kot 47.30m).
  // - Çatı makasından (Y = 10.10m / Kot 50.10m) silindire (Y = 7.30m) dikey taşıyıcı askı bağlantısı.
  // -------------------------------------------------------------
  const endCatwalkGroup = new THREE.Group();
  endCatwalkGroup.name = 'alan1CatwalkAtRoofEnd';

  // Geometrik Kotlar & Konumlar
  const cwWalkY = 5.75; // Yürüme sacı üst kotu (Kot 45.75m, kullanıcı isteğiyle 2.0m aşağı çekildi)
  const cwRailTopY = 6.75; // Korkuluk üst kotu (Kot 46.75m, tam 1.00m korkuluk payı)
  const cwCylCenterY = cwWalkY - 0.4535; // 5.2965m (Kot 45.30m, Alan 1 standardı)

  const roofEndX = -3.00;
  // Taşıyıcı Silindir: 45m çatı makası aksına denk gelir (Z = 43.248m, Kot 47.30m)
  const cwCylCenterZ = -1.35 + baseSlopeLen * Math.cos(slopeAngleRad); // ~43.248m
  // Kedi yolu, silindirin önünde (+Z yönünde): Alan-1 kuralı Z = Z_cyl + 1.1855m
  const cwCenterZ = cwCylCenterZ + 1.1855; // ~44.434m (Yürüme sacı Z=43.934m - 44.934m)

  // 46.85m çatı makası ucunun dünya koordinatları (Kedi yolunun ön kenarını Z=45.08m'de bitiren nokta)
  const roofEndWorldZ = -1.35 + slopeLen * Math.cos(slopeAngleRad); // ~45.082m
  const roofEndWorldY = 4.10 + slopeLen * Math.sin(slopeAngleRad); // ~10.347m (Kot 50.35m)

  const cwLength = 20.0; // 20 metre boyunda (Alan 1 standardı)
  const cwWidth = 1.0; // 100 cm genişlik

  // A) Kedi Yolu Taban Sacı (100cm Genişlik, Izgara Stil, Yürüme Kotu = 7.75m)
  const cwFloorMat = new THREE.MeshStandardMaterial({ 
    color: 0x2d323f, 
    roughness: 0.8,
    metalness: 0.6
  });
  const cwFloorGeo = new THREE.BoxGeometry(cwLength, 0.05, cwWidth);
  const cwFloor = new THREE.Mesh(cwFloorGeo, cwFloorMat);
  cwFloor.position.set(roofEndX, cwWalkY - 0.025, cwCenterZ);
  cwFloor.receiveShadow = true;
  endCatwalkGroup.add(cwFloor);

  // B) Kenar Boyuna Taşıyıcı Profiller (Side Beams at Z = cwCenterZ +/- 0.5m)
  const cwBeamMat = new THREE.MeshStandardMaterial({ color: 0x1f2228, metalness: 0.8, roughness: 0.2 });
  const cwBeamGeo = new THREE.BoxGeometry(cwLength, 0.15, 0.08);

  const cwFrontBeam = new THREE.Mesh(cwBeamGeo, cwBeamMat);
  cwFrontBeam.position.set(roofEndX, cwWalkY - 0.025, cwCenterZ + 0.5);
  endCatwalkGroup.add(cwFrontBeam);

  const cwBackBeam = new THREE.Mesh(cwBeamGeo, cwBeamMat);
  cwBackBeam.position.set(roofEndX, cwWalkY - 0.025, cwCenterZ - 0.5);
  endCatwalkGroup.add(cwBackBeam);

  // C) Sarı Çelik Korkuluklar (Alan 1 Birebir - 1 Metre Yükseklik, Üst Kot = 8.75m)
  const cwRailMat = new THREE.MeshStandardMaterial({ color: 0xfdb913, metalness: 0.5, roughness: 0.3 }); // Galatasaray Sarı
  const cwPostH = 1.00; // 1.00m korkuluk yüksekliği
  const cwPostGeo = new THREE.CylinderGeometry(0.02, 0.02, cwPostH, 16);
  const cwTopRailGeo = new THREE.CylinderGeometry(0.025, 0.025, cwLength, 16);
  cwTopRailGeo.rotateZ(Math.PI / 2); // X ekseni boyunca uzat
  const cwMidRailGeo = new THREE.CylinderGeometry(0.015, 0.015, cwLength, 16);
  cwMidRailGeo.rotateZ(Math.PI / 2);

  // Ön (Saha Tarafı) ve Arka (Silindir Tarafı) Üst Küpeşteler
  [cwCenterZ + 0.5, cwCenterZ - 0.5].forEach(rz => {
    // Üst küpeşte (Tam Kot 48.75m / Y = 8.75m)
    const topRail = new THREE.Mesh(cwTopRailGeo, cwRailMat);
    topRail.position.set(roofEndX, cwRailTopY - 0.025, rz);
    topRail.castShadow = true;
    endCatwalkGroup.add(topRail);

    // Orta emniyet kuşağı (Y = 8.25m)
    const midRail = new THREE.Mesh(cwMidRailGeo, cwRailMat);
    midRail.position.set(roofEndX, cwWalkY + 0.50, rz);
    endCatwalkGroup.add(midRail);

    // Etek sacı (15cm Kick Plate / Toe Board)
    const kickPlateGeo = new THREE.BoxGeometry(cwLength, 0.15, 0.012);
    const kickPlate = new THREE.Mesh(kickPlateGeo, cwBeamMat);
    kickPlate.position.set(roofEndX, cwWalkY + 0.075, rz);
    endCatwalkGroup.add(kickPlate);

    // Korkuluk Dikmeleri (Her 1.5 metrede bir)
    for (let i = -cwLength / 2 + 0.5; i <= cwLength / 2 - 0.5; i += 1.5) {
      const post = new THREE.Mesh(cwPostGeo, cwRailMat);
      post.position.set(roofEndX + i, cwWalkY + cwPostH / 2, rz);
      post.castShadow = true;
      endCatwalkGroup.add(post);
    }
  });

  // D) Alan-1 Taşıyıcı Silindiri (Ø45.7cm Galvanizli Çelik Boru, Z = 43.25m, Y = 7.30m)
  const cwCylinderRadius = 0.2285; // Ø45.7cm Alan 1 standardı
  const cwCylinderGeo = new THREE.CylinderGeometry(cwCylinderRadius, cwCylinderRadius, cwLength, 32);
  cwCylinderGeo.rotateZ(Math.PI / 2); // X ekseni boyunca uzat
  const cwCylinderMat = new THREE.MeshStandardMaterial({ 
    color: 0x7f8c8d, 
    roughness: 0.6, 
    metalness: 0.7 
  });
  const cwCylinder = new THREE.Mesh(cwCylinderGeo, cwCylinderMat);
  cwCylinder.position.set(roofEndX, cwCylCenterY, cwCylCenterZ);
  cwCylinder.castShadow = true;
  cwCylinder.receiveShadow = true;
  endCatwalkGroup.add(cwCylinder);

  // Uç kapakları
  const cwCapGeo = new THREE.CylinderGeometry(cwCylinderRadius + 0.02, cwCylinderRadius + 0.02, 0.04, 32);
  cwCapGeo.rotateZ(Math.PI / 2);
  const cwCap1 = new THREE.Mesh(cwCapGeo, steelFlangeMat);
  cwCap1.position.set(roofEndX - cwLength / 2, cwCylCenterY, cwCylCenterZ);
  endCatwalkGroup.add(cwCap1);
  const cwCap2 = new THREE.Mesh(cwCapGeo, steelFlangeMat);
  cwCap2.position.set(roofEndX + cwLength / 2, cwCylCenterY, cwCylCenterZ);
  endCatwalkGroup.add(cwCap2);

  // E) Taşıyıcı Silindir ile Kedi Yolu Arasındaki Konsol Traversler (Alan 1 Bağlantı Kolları)
  const cwBracketGeo = new THREE.BoxGeometry(0.20, 0.20, 0.6855);
  const cwBracketMat = new THREE.MeshStandardMaterial({ color: 0x34495e, metalness: 0.8 });
  const cwBracketZ = cwCylCenterZ + 0.34275; // Silindir ile kedi yolu iç kenarı arası orta nokta
  for (let i = -8; i <= 8; i += 4) {
    const bracket = new THREE.Mesh(cwBracketGeo, cwBracketMat);
    bracket.position.set(roofEndX + i, cwWalkY - 0.125, cwBracketZ);
    bracket.castShadow = true;
    endCatwalkGroup.add(bracket);
  }

  // F) 45 METRELİK ÇATI TAŞIYICISI İLE KEDİ YOLU ARASINDAKİ 45° ÇAPRAZ TAŞIYICI KOL
  // Kullanıcı İsteği:
  // - "az önce attığın 5 metre dediğim çapraz kolu taşıyıcı ile birleştiği yerde sonlandır"
  // - Çapraz kol 5m'de havada asılı kalmayıp tam olarak çatı taşıyıcı silindiriyle kesiştiği yerde sonlanır (~2.95m pin boyu).
  // - Her iki uçta konik geçiş boynu (tapered neck) ve dairesel pimli mafsal kulakları (clevis pin-joint)
  // - Alt uç: Kedi yolu silindirine saran bilezik (sleeve collar) ve çift mafsal kulağı
  // - Üst uç: Çatı taşıyıcı ana silindirine saran bilezik ve çift mafsal kulağı
  const diagArmAngle = Math.PI / 4; // 45 derece (45°)
  const strutDir = new THREE.Vector3(0, Math.sin(diagArmAngle), -Math.cos(diagArmAngle)).normalize();

  // Malzemeler
  const pinMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.3,
    metalness: 0.85
  });
  const pinWasherMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.35,
    metalness: 0.8
  });
  const clevisPlateMat = new THREE.MeshStandardMaterial({
    color: 0xd2d6dc,
    roughness: 0.45,
    metalness: 0.35
  });
  const weldBeadMat = new THREE.MeshStandardMaterial({
    color: 0xb0bec5,
    roughness: 0.5,
    metalness: 0.6
  });

  // Alt bağlantı geometrisi: Kedi yolu silindir ekseni
  const cwCylCenter = new THREE.Vector3(roofEndX, cwCylCenterY, cwCylCenterZ);
  // Alt mafsal pim ekseni silindir dış yüzeyinden 9.5 cm açıkta (Cyl Radius 0.2285m + 0.0965m = 0.325m)
  const botPinPos = cwCylCenter.clone().addScaledVector(strutDir, 0.325);

  // Çatı Taşıyıcısı ile Kesin Kesişim Noktası Hesabı:
  // Çatı ana silindiri ekseni: Y(s) = 4.10 + s*sin(θ), Z(s) = -1.35 + s*cos(θ)
  // Çapraz kol 45° doğrusunun çatı silindiriyle kesiştiği s mesafesi:
  const sIntersect = (botPinPos.z + 1.35 + botPinPos.y - 4.10) / (Math.sin(slopeAngleRad) + Math.cos(slopeAngleRad));
  const carrierMeetCenter = new THREE.Vector3(
    roofEndX,
    4.10 + sIntersect * Math.sin(slopeAngleRad),
    -1.35 + sIntersect * Math.cos(slopeAngleRad)
  );

  // Üst mafsal pim ekseni: Çatı silindiri dış yüzeyindeki çift kulak pimi (silindirden 0.22m açıkta)
  const topPinPos = carrierMeetCenter.clone().sub(strutDir.clone().multiplyScalar(0.22));
  // Taşıyıcı ile tam birleştiği yerde sonlanan net dikme boyu (~2.95 metre)
  const diagArmLen = botPinPos.distanceTo(topPinPos);

  // -------------------------------------------------------------
  // 1. ALT BAĞLANTI: KEDİ YOLU SİLİNDİRİNE SARAN BİLEZİK & ÇİFT MAFSAL KULAĞI
  // -------------------------------------------------------------
  const collarGroup = new THREE.Group();
  collarGroup.position.copy(cwCylCenter);

  // A) Kedi Yolu Silindirini Tam Saran Montaj Bileziği
  const collarRadius = cwCylinderRadius + 0.015;
  const collarWidth = 0.48;
  const collarGeo = new THREE.CylinderGeometry(collarRadius, collarRadius, collarWidth, 32);
  collarGeo.rotateZ(Math.PI / 2);
  const collarMesh = new THREE.Mesh(collarGeo, clevisPlateMat);
  collarMesh.castShadow = true;
  collarMesh.receiveShadow = true;
  collarGroup.add(collarMesh);

  // Bilezik kenar takviye halkaları
  [-collarWidth / 2 + 0.02, collarWidth / 2 - 0.02].forEach(cx => {
    const rimGeo = new THREE.CylinderGeometry(collarRadius + 0.015, collarRadius + 0.015, 0.035, 32);
    rimGeo.rotateZ(Math.PI / 2);
    const rim = new THREE.Mesh(rimGeo, darkJointMat);
    rim.position.set(cx, 0, 0);
    collarGroup.add(rim);
  });
  endCatwalkGroup.add(collarGroup);

  // B) Alt Çift Mafsal Kulakları (Twin Clevis Ears at X = ±0.055m)
  [-0.055, 0.055].forEach(ex => {
    const earGroup = new THREE.Group();
    earGroup.position.set(roofEndX + ex, 0, 0);

    const earHeadGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.022, 28);
    earHeadGeo.rotateZ(Math.PI / 2);
    const earHead = new THREE.Mesh(earHeadGeo, clevisPlateMat);
    earHead.position.set(0, botPinPos.y, botPinPos.z);
    earHead.castShadow = true;
    earGroup.add(earHead);

    const midY = (cwCylCenterY + botPinPos.y) / 2 + 0.05;
    const midZ = (cwCylCenterZ + botPinPos.z) / 2 - 0.05;
    const gussetGeo = new THREE.BoxGeometry(0.022, 0.32, 0.28);
    const gusset = new THREE.Mesh(gussetGeo, clevisPlateMat);
    gusset.rotation.x = diagArmAngle;
    gusset.position.set(0, midY, midZ);
    gusset.castShadow = true;
    earGroup.add(gusset);

    endCatwalkGroup.add(earGroup);
  });

  // -------------------------------------------------------------
  // 2. MAFSALLI / PİMLİ DİKME GÖVDESİ (Taşıyıcı İle Birleştiği Yerde Sonlanır)
  // -------------------------------------------------------------
  const strutAssembly = new THREE.Group();
  strutAssembly.position.copy(botPinPos);
  strutAssembly.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), strutDir);

  // A) Alt Pim ve Pullar
  const botPinGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.28, 24);
  botPinGeo.rotateZ(Math.PI / 2);
  const botPinMesh = new THREE.Mesh(botPinGeo, pinMat);
  botPinMesh.position.set(0, 0, 0);
  strutAssembly.add(botPinMesh);

  [-0.12, 0.12].forEach(px => {
    const washerGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.022, 24);
    washerGeo.rotateZ(Math.PI / 2);
    const washer = new THREE.Mesh(washerGeo, pinWasherMat);
    washer.position.set(px, 0, 0);
    strutAssembly.add(washer);

    const boltHeadGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.02, 16);
    boltHeadGeo.rotateZ(Math.PI / 2);
    const boltHead = new THREE.Mesh(boltHeadGeo, darkJointMat);
    boltHead.position.set(px < 0 ? px - 0.015 : px + 0.015, 0, 0);
    strutAssembly.add(boltHead);
  });

  // Alt Göz Ucu Sacı
  const eyeHeadGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 32);
  eyeHeadGeo.rotateZ(Math.PI / 2);
  const eyeHead = new THREE.Mesh(eyeHeadGeo, pipeWhiteMat);
  eyeHead.position.set(0, 0, 0);
  eyeHead.castShadow = true;
  strutAssembly.add(eyeHead);

  const eyeNeckGeo = new THREE.BoxGeometry(0.08, 0.25, 0.22);
  const eyeNeck = new THREE.Mesh(eyeNeckGeo, pipeWhiteMat);
  eyeNeck.position.set(0, 0.125, 0);
  eyeNeck.castShadow = true;
  strutAssembly.add(eyeNeck);

  // B) Alt Konik Geçiş Boynu (Tapered Neck: 0.25m -> 0.55m)
  const botConeGeo = new THREE.CylinderGeometry(0.11, 0.075, 0.30, 32);
  const botCone = new THREE.Mesh(botConeGeo, pipeWhiteMat);
  botCone.position.set(0, 0.40, 0);
  botCone.castShadow = true;
  strutAssembly.add(botCone);

  const botWeldGeo = new THREE.CylinderGeometry(0.115, 0.115, 0.02, 32);
  const botWeld = new THREE.Mesh(botWeldGeo, weldBeadMat);
  botWeld.position.set(0, 0.55, 0);
  strutAssembly.add(botWeld);

  // C) Ana Boru Gövdesi (Ø22cm Boru, Net boy = diagArmLen - 1.10m)
  const mainPipeLen = Math.max(0.5, diagArmLen - 1.10);
  const mainPipeGeo = new THREE.CylinderGeometry(0.11, 0.11, mainPipeLen, 32);
  const mainPipe = new THREE.Mesh(mainPipeGeo, pipeWhiteMat);
  mainPipe.position.set(0, 0.55 + mainPipeLen / 2, 0);
  mainPipe.castShadow = true;
  mainPipe.receiveShadow = true;
  strutAssembly.add(mainPipe);

  // D) Üst Konik Geçiş Boynu (Tapered Neck)
  const topWeldY = 0.55 + mainPipeLen;
  const topWeldGeo = new THREE.CylinderGeometry(0.115, 0.115, 0.02, 32);
  const topWeld = new THREE.Mesh(topWeldGeo, weldBeadMat);
  topWeld.position.set(0, topWeldY, 0);
  strutAssembly.add(topWeld);

  const topConeGeo = new THREE.CylinderGeometry(0.075, 0.11, 0.30, 32);
  const topCone = new THREE.Mesh(topConeGeo, pipeWhiteMat);
  topCone.position.set(0, topWeldY + 0.15, 0);
  topCone.castShadow = true;
  strutAssembly.add(topCone);

  // E) Üst Göz Ucu Sacı & Üst Mafsal Pimi
  const topEyeNeckGeo = new THREE.BoxGeometry(0.08, 0.25, 0.22);
  const topEyeNeck = new THREE.Mesh(topEyeNeckGeo, pipeWhiteMat);
  topEyeNeck.position.set(0, diagArmLen - 0.125, 0);
  topEyeNeck.castShadow = true;
  strutAssembly.add(topEyeNeck);

  const topEyeHeadGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 32);
  topEyeHeadGeo.rotateZ(Math.PI / 2);
  const topEyeHead = new THREE.Mesh(topEyeHeadGeo, pipeWhiteMat);
  topEyeHead.position.set(0, diagArmLen, 0);
  topEyeHead.castShadow = true;
  strutAssembly.add(topEyeHead);

  const topPinGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.28, 24);
  topPinGeo.rotateZ(Math.PI / 2);
  const topPinMesh = new THREE.Mesh(topPinGeo, pinMat);
  topPinMesh.position.set(0, diagArmLen, 0);
  strutAssembly.add(topPinMesh);

  [-0.12, 0.12].forEach(px => {
    const washerGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.022, 24);
    washerGeo.rotateZ(Math.PI / 2);
    const washer = new THREE.Mesh(washerGeo, pinWasherMat);
    washer.position.set(px, diagArmLen, 0);
    strutAssembly.add(washer);

    const boltHeadGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.02, 16);
    boltHeadGeo.rotateZ(Math.PI / 2);
    const boltHead = new THREE.Mesh(boltHeadGeo, darkJointMat);
    boltHead.position.set(px < 0 ? px - 0.015 : px + 0.015, diagArmLen, 0);
    strutAssembly.add(boltHead);
  });

  endCatwalkGroup.add(strutAssembly);

  // -------------------------------------------------------------
  // 3. ÜST BAĞLANTI: ÇATI TAŞIYICI SİLİNDİRİNE MONTE EDİLEN BİLEZİK & ÇİFT KULAK
  // -------------------------------------------------------------
  // Çatı Taşıyıcı Gövdesine Kenetlenen Montaj Bileziği
  const carrierCollarGroup = new THREE.Group();
  carrierCollarGroup.position.copy(carrierMeetCenter);
  // Çatı eğimine uygun rotasyon
  carrierCollarGroup.rotation.x = -slopeAngleRad;

  const carrierCollarGeo = new THREE.CylinderGeometry(carrierRadius + 0.015, carrierRadius + 0.015, 0.44, 32);
  carrierCollarGeo.rotateX(Math.PI / 2);
  const carrierCollar = new THREE.Mesh(carrierCollarGeo, clevisPlateMat);
  carrierCollar.castShadow = true;
  carrierCollarGroup.add(carrierCollar);

  [-0.18, 0.18].forEach(cz => {
    const rimGeo = new THREE.CylinderGeometry(carrierRadius + 0.025, carrierRadius + 0.025, 0.035, 32);
    rimGeo.rotateX(Math.PI / 2);
    const rim = new THREE.Mesh(rimGeo, darkJointMat);
    rim.position.set(0, 0, cz);
    carrierCollarGroup.add(rim);
  });
  endCatwalkGroup.add(carrierCollarGroup);

  // Üst Çift Kulak Sacları (Çatı silindirinden topPinPos'a doğru uzanır)
  [-0.055, 0.055].forEach(ex => {
    const topEarGroup = new THREE.Group();
    topEarGroup.position.set(roofEndX + ex, topPinPos.y, topPinPos.z);

    const topEarHeadGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.022, 28);
    topEarHeadGeo.rotateZ(Math.PI / 2);
    const topEarHead = new THREE.Mesh(topEarHeadGeo, clevisPlateMat);
    topEarHead.position.set(0, 0, 0);
    topEarHead.castShadow = true;
    topEarGroup.add(topEarHead);

    const topGussetGeo = new THREE.BoxGeometry(0.022, 0.25, 0.25);
    const topGusset = new THREE.Mesh(topGussetGeo, clevisPlateMat);
    topGusset.rotation.x = -diagArmAngle;
    topGusset.position.set(0, 0.12, -0.08);
    topGusset.castShadow = true;
    topEarGroup.add(topGusset);

    endCatwalkGroup.add(topEarGroup);
  });

  // -------------------------------------------------------------
  // 4. ÇATI UCU KEDİ YOLU SİLİNDİRİ ÜZERİ ÇEMBER SABİTLEMELİ YATAY POI RAFLARI (3 SET: SOL, ORTA, SAĞ)
  // Kullanıcı İsteği:
  // - "uçtaki kedi yolunun yanındaki silindir taşıyıcının üzerine POI leri koyacagız..."
  // - "şimdi şöyle yap bi kere poıleri x-z eksenine göre çevir. ve birbirine yaklaştır. 3. bir cihaz görüyorum onu kaldır ve taşıyıcı kabineti ona göre yeniden boyutlandır küçülsün"
  // - "tamamdır bu modül ok. Bundan bi sagına bi soluna birer tane daha set ekle"
  // -------------------------------------------------------------
  const poiShelfConfigs = [
    { x: -2.42, setIndex: 1, setLabel: ' (Sol Set)' },
    { x: -1.60, setIndex: 2, setLabel: ' (Orta Set)' },
    { x: -0.78, setIndex: 3, setLabel: ' (Sağ Set)' }
  ];

  poiShelfConfigs.forEach(cfg => {
    const shelfGroup = buildCylinderMountedHorizontalPoiShelf({
      cylinderRadius: cwCylinderRadius,
      setIndex: cfg.setIndex,
      setLabel: cfg.setLabel
    });
    // Taşıyıcı silindirin tepe eksen kotu (Z = cwCylCenterZ = 43.248m, Y = cwCylCenterY = 5.2965m)
    shelfGroup.position.set(cfg.x, cwCylCenterY, cwCylCenterZ);
    endCatwalkGroup.add(shelfGroup);
  });

  alan2Group.add(endCatwalkGroup);

  // -------------------------------------------------------------
  // 4B. ORTA KEDİ YOLU RRU'LARINDAN 3 POI SETİNE 20'ŞERLİ (TOPLAM 60) 1/2" FEEDER KABLO VE TAVA TAŞIYICI SİSTEMİ
  //
  // Kullanıcı İsteği:
  // - "tamamdır şimdi orta kedi yoluna ekledigin rrulardan her bir poı setine 20 tane 1/2 feeder gelecek ona göre çizimi yap gerekirse tava tavataşıyıcısı vs ekle."
  //
  // Mimari & Geometri Detayları:
  // 1. Kaynak (Origin): Orta kedi yolu önündeki 45m makas çapraz dikmelerine paralel 20cm ofsetli montaj boruları üzerindeki 14 RRU
  //    (Sol boru: 4 Turkcell + 3 Vodafone; Sağ boru: 4 TT + 3 Vodafone).
  // 2. Kablo Geçiş Köprüleri (Collector Bridges): stZ = 30.35m'de sol ve sağ ofset borularından 50x15cm ana kablo tavasına
  //    geçiş sağlayan iki adet galvanizli enine tava köprüsü ve kelepçeleri.
  // 3. Çatı Makası Boyunca İlerleme: 60 adet 1/2" feeder kablo, 50x15cm delikli çatı tavasında z = 30.60m'den z = 41.20m'ye kadar
  //    10 sütun x 6 katmanlı rijit nizamda ilerler.
  // 4. Çatı Makasından Silindire İniş Tavası (Descending Riser Tray & Supports):
  //    - Makas tavasının z = 41.20m ucundaki eğimli iniş oluğundan (Y = 10.05m, Z = 39.42m)
  //      çatı ucu kedi yolu silindiri arkasına (Y = 5.50m, Z = 42.88m) inen 40cm genişlik, 10cm kenarlı galvanizli dikey/eğimli tava.
  //    - Taşıyıcı dikme gövdesine (strut pipe) kenetlenen 3 adet ağır hizmet tava taşıyıcı konsol kelepçesi (Tavataşıyıcısı).
  // 5. Taşıyıcı Silindir Arkası Yatay Dağıtım Tavası ve Çember Konsolları (Horizontal Distribution Tray & Cantilever Clamps):
  //    - X = -3.10m ile X = -0.45m arasında (2.65 metre boyunda), 35cm genişlikte, 8cm kenar yüksekliğinde yatay dağıtım tavası.
  //    - Ø45.7cm taşıyıcı silindiri saran 4 adet ağır hizmet çelik çember ve konsol kolu (tavataşıyıcısı: X = -2.85m, -2.01m, -1.19m, -0.45m).
  // 6. 3 POI Setine 20'şerli (Toplam 60 Adet) 1/2" Feeder Kablo Girişleri:
  //    - Set 1 (Sol Set, X = -2.42m): 10 adet POI-1 BTS portuna + 10 adet POI-2 BTS portuna = 20 feeder
  //    - Set 2 (Orta Set, X = -1.60m): 10 adet POI-3 BTS portuna + 10 adet POI-4 BTS portuna = 20 feeder
  //    - Set 3 (Sağ Set, X = -0.78m): 10 adet POI-5 BTS portuna + 10 adet POI-6 BTS portuna = 20 feeder
  //    - Her bir kablo ucunda 4.3-10 konnektör somunu ve siyah termorüzgar/sızdırmazlık kılıfı (weatherproofing boot).
  // -------------------------------------------------------------
  const poiFeederCablingSystem = new THREE.Group();
  poiFeederCablingSystem.name = 'poiFeederCablingSystem';

  // Malzemeler
  const feederCableMat = new THREE.MeshStandardMaterial({
    color: 0x141619, // 1/2" UV dayanımlı mat siyah koaksiyel dış kılıf
    roughness: 0.65,
    metalness: 0.20
  });

  const connNutMat = new THREE.MeshStandardMaterial({
    color: 0xd4d4d8, // 4.3-10 gümüş/pirinç RF konnektör somunu
    metalness: 0.92,
    roughness: 0.18
  });

  const bootCoverMat = new THREE.MeshStandardMaterial({
    color: 0x090a0f, // Siyah kauçuk su ve nem sızdırmazlık pabucu
    roughness: 0.70,
    metalness: 0.10
  });

  const supportSteelMat = new THREE.MeshStandardMaterial({
    color: 0x334155, // Ağır hizmet galvanizli çelik konsol rengi
    metalness: 0.85,
    roughness: 0.30
  });

  const boltHardwareMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.90,
    roughness: 0.15
  });

  // A) ORTA KEDİ YOLU OFSET BORULARINDAN ANA TAVAYA GEÇİŞ KÖPRÜLERİ (Collector Bridges at stZ = 30.35m)
  [-1, 1].forEach(side => {
    const isL = side === -1;
    const xStart = isL ? -0.62 : 0.25;
    const xEnd = isL ? -0.25 : 0.62;
    const bridgeW = Math.abs(xEnd - xStart);
    const bridgeX = (xStart + xEnd) / 2;

    const bridgeGeo = new THREE.BoxGeometry(bridgeW, 0.05, 0.18);
    const bridge = new THREE.Mesh(bridgeGeo, steelFlangeMat);
    bridge.position.set(bridgeX, 0.46, 30.35);
    bridge.castShadow = true;
    slopedGroup.add(bridge);

    // Yan koruma kenarlıkları
    [-0.085, 0.085].forEach(wz => {
      const bWallGeo = new THREE.BoxGeometry(bridgeW, 0.04, 0.004);
      const bWall = new THREE.Mesh(bWallGeo, traySideMat);
      bWall.position.set(bridgeX, 0.48, 30.35 + wz);
      slopedGroup.add(bWall);
    });

    // 2" boruya kenetlenen kelepçe bileziği
    const pipeClampGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.06, 16);
    const pClamp = new THREE.Mesh(pipeClampGeo, supportSteelMat);
    pClamp.position.set(isL ? -0.62 : 0.62, 0.46, 30.35);
    slopedGroup.add(pClamp);
  });

  // B) ÇATI MAKASINDAN TAŞIYICI SİLİNDİRE İNİŞ TAVASI (Descending Riser Cable Tray along Strut)
  // Üst nokta (Çatı makası tava çıkışı): (-3.00, 10.05, 39.42)
  // Alt nokta (Kedi yolu silindiri tava arkası): (-3.00, 5.50, 42.88)
  const riserTopPos = new THREE.Vector3(-3.00, 10.05, 39.42);
  const riserBotPos = new THREE.Vector3(-3.00, 5.50, 42.88);
  const riserVec = new THREE.Vector3().subVectors(riserBotPos, riserTopPos);
  const riserLen = riserVec.length(); // ~5.72m
  const riserMidPos = new THREE.Vector3().addVectors(riserTopPos, riserBotPos).multiplyScalar(0.5);
  const riserAngleX = Math.atan2(riserTopPos.y - riserBotPos.y, riserBotPos.z - riserTopPos.z);

  const riserGroup = new THREE.Group();
  riserGroup.name = 'descendingRiserCableTray';

  const riserW = 0.40; // 40 cm genişlik
  const riserH = 0.10; // 10 cm kenar yüksekliği

  // 1. Taban Sacı
  const riserFloorGeo = new THREE.BoxGeometry(riserW, 0.003, riserLen);
  const riserFloor = new THREE.Mesh(riserFloorGeo, trayBottomMat);
  riserFloor.rotation.x = riserAngleX;
  riserFloor.position.copy(riserMidPos);
  riserFloor.castShadow = true;
  riserGroup.add(riserFloor);

  // 2. Yan Duvarlar
  [-riserW / 2, riserW / 2].forEach(rx => {
    const rWallGeo = new THREE.BoxGeometry(0.003, riserH, riserLen);
    const rWall = new THREE.Mesh(rWallGeo, traySideMat);
    rWall.rotation.x = riserAngleX;
    rWall.position.set(
      -3.00 + rx,
      riserMidPos.y + (riserH / 2) * Math.cos(riserAngleX),
      riserMidPos.z + (riserH / 2) * Math.sin(riserAngleX)
    );
    rWall.castShadow = true;
    riserGroup.add(rWall);
  });

  // 3. İniş Tavası Taşıyıcı Konsol Kelepçeleri (Tavataşıyıcısı: Ø22cm Dikme Gövdesine Kenetlenen 3 Konsol)
  const strutStations = [0.25, 0.50, 0.75];
  strutStations.forEach(t => {
    const sPos = new THREE.Vector3().lerpVectors(riserTopPos, riserBotPos, t);

    // Dikme borusu tespit kelepçesi
    const collarGeo = new THREE.CylinderGeometry(0.125, 0.125, 0.08, 24);
    const collar = new THREE.Mesh(collarGeo, supportSteelMat);
    collar.position.set(-3.00, sPos.y, sPos.z);
    collar.rotation.x = riserAngleX;
    riserGroup.add(collar);

    // Tava altı taşıyıcı travers kolu
    const armGeo = new THREE.BoxGeometry(riserW + 0.08, 0.04, 0.08);
    const arm = new THREE.Mesh(armGeo, supportSteelMat);
    arm.position.set(-3.00, sPos.y - 0.03, sPos.z);
    arm.rotation.x = riserAngleX;
    arm.castShadow = true;
    riserGroup.add(arm);

    // Tava tespit kenetleri
    [-riserW / 2 - 0.02, riserW / 2 + 0.02].forEach(cx => {
      const clipGeo = new THREE.BoxGeometry(0.03, 0.04, 0.04);
      const clip = new THREE.Mesh(clipGeo, darkJointMat);
      clip.position.set(-3.00 + cx, sPos.y + 0.01, sPos.z);
      clip.rotation.x = riserAngleX;
      riserGroup.add(clip);
    });
  });

  poiFeederCablingSystem.add(riserGroup);

  // C) SİLİNDİR TAŞIYICI ARKASI YATAY DAĞITIM TAVASI VE ÇEMBER TAŞIYICILARI (Distribution Tray on Cylinder)
  // X ekseni: X = -3.10m ile X = -0.45m arası (L = 2.65m)
  // Z kotu: Z = 42.88m (POI raflarının 10cm arkasında)
  // Y kotu: Y = 5.50m
  const distTrayGroup = new THREE.Group();
  distTrayGroup.name = 'cylinderHorizontalDistributionTray';

  const distTrayW = 0.35; // 35 cm genişlik
  const distTrayH = 0.08; // 8 cm kenar yüksekliği
  const distStartX = -3.10;
  const distEndX = -0.45;
  const distLen = Math.abs(distEndX - distStartX); // 2.65m
  const distMidX = (distStartX + distEndX) / 2;    // -1.775m
  const distTrayZ = 42.88;
  const distTrayY = 5.50;

  // 1. Yatay Taban Sacı
  const distFloorGeo = new THREE.BoxGeometry(distLen, 0.003, distTrayW);
  const distFloor = new THREE.Mesh(distFloorGeo, trayBottomMat);
  distFloor.position.set(distMidX, distTrayY, distTrayZ);
  distFloor.castShadow = true;
  distFloor.receiveShadow = true;
  distTrayGroup.add(distFloor);

  // 2. Ön ve Arka Yan Duvarlar
  [-distTrayW / 2, distTrayW / 2].forEach(dz => {
    const dWallGeo = new THREE.BoxGeometry(distLen, distTrayH, 0.003);
    const dWall = new THREE.Mesh(dWallGeo, traySideMat);
    dWall.position.set(distMidX, distTrayY + distTrayH / 2, distTrayZ + dz);
    dWall.castShadow = true;
    distTrayGroup.add(dWall);

    // Üst flanş dudakları
    const dLipGeo = new THREE.BoxGeometry(distLen, 0.003, 0.015);
    const dLip = new THREE.Mesh(dLipGeo, steelFlangeMat);
    dLip.position.set(distMidX, distTrayY + distTrayH, distTrayZ + dz + (dz < 0 ? 0.0075 : -0.0075));
    distTrayGroup.add(dLip);
  });

  // 3. İniş Tavasından Yatay Tavaya Geçiş Dirseği (90° Elbow Transition Fitting at X = -3.00m)
  const elbowGeo = new THREE.BoxGeometry(0.38, 0.06, 0.38);
  const elbow = new THREE.Mesh(elbowGeo, steelFlangeMat);
  elbow.position.set(-3.00, distTrayY - 0.01, distTrayZ);
  elbow.castShadow = true;
  distTrayGroup.add(elbow);

  // 4. Sağ Bitiş Alın Kapağı (End Cap at X = -0.45m)
  const distEndCapGeo = new THREE.BoxGeometry(0.005, distTrayH, distTrayW);
  const distEndCap = new THREE.Mesh(distEndCapGeo, steelFlangeMat);
  distEndCap.position.set(distEndX, distTrayY + distTrayH / 2, distTrayZ);
  distTrayGroup.add(distEndCap);

  // 5. Ø45.7cm Silindir Taşıyıcıya Kenetlenen Ağır Hizmet Konsol Braketleri (4 Adet Tavataşıyıcısı)
  // X istasyonları: Set 1 solu (-2.85m), Set 1-2 arası (-2.01m), Set 2-3 arası (-1.19m), Set 3 sağı (-0.45m)
  const bracketStationsX = [-2.85, -2.01, -1.19, -0.45];
  bracketStationsX.forEach(bx => {
    const bGroup = new THREE.Group();
    bGroup.position.set(bx, 0, 0);

    // A) Ø45.7cm Silindiri Saran Ağır Hizmet Çember Kelepçesi
    const cylBandGeo = new THREE.CylinderGeometry(cwCylinderRadius + 0.012, cwCylinderRadius + 0.012, 0.07, 32);
    cylBandGeo.rotateZ(Math.PI / 2);
    const cylBand = new THREE.Mesh(cylBandGeo, supportSteelMat);
    cylBand.position.set(0, cwCylCenterY, cwCylCenterZ);
    cylBand.castShadow = true;
    bGroup.add(cylBand);

    // Çember sıkma kulakları ve cıvataları
    const earGeo = new THREE.BoxGeometry(0.07, 0.04, 0.018);
    const ear = new THREE.Mesh(earGeo, supportSteelMat);
    ear.position.set(0, cwCylCenterY - cwCylinderRadius - 0.02, cwCylCenterZ);
    bGroup.add(ear);

    // B) Silindirden Tavaya Uzanan Konsol Kolu (80x40mm Kutu Profil)
    const armLen = Math.abs(distTrayZ - cwCylCenterZ) + 0.08; // ~0.45m
    const armGeo = new THREE.BoxGeometry(0.06, 0.04, armLen);
    const armMesh = new THREE.Mesh(armGeo, supportSteelMat);
    armMesh.position.set(0, distTrayY - 0.025, (cwCylCenterZ + distTrayZ) / 2);
    armMesh.castShadow = true;
    bGroup.add(armMesh);

    // C) Yük Taşıyıcı Üçgen Berkitme Gusset Sacı
    const gussetShape = new THREE.Shape();
    gussetShape.moveTo(0, 0);
    gussetShape.lineTo(0.18, 0);
    gussetShape.lineTo(0, -0.18);
    gussetShape.closePath();
    const gussetGeo = new THREE.ExtrudeGeometry(gussetShape, { depth: 0.010, bevelEnabled: false });
    const gussetMesh = new THREE.Mesh(gussetGeo, supportSteelMat);
    gussetMesh.rotation.y = Math.PI / 2;
    gussetMesh.position.set(0.005, distTrayY - 0.045, cwCylCenterZ - cwCylinderRadius + 0.02);
    bGroup.add(gussetMesh);

    // D) Tava Montaj Pabuçları ve Tespit Kelepçeleri
    [-distTrayW / 2 + 0.02, distTrayW / 2 - 0.02].forEach(cz => {
      const clipGeo = new THREE.BoxGeometry(0.04, 0.025, 0.03);
      const clip = new THREE.Mesh(clipGeo, darkJointMat);
      clip.position.set(0, distTrayY + 0.01, distTrayZ + cz);
      bGroup.add(clip);
    });

    distTrayGroup.add(bGroup);
  });

  poiFeederCablingSystem.add(distTrayGroup);

  // D) 60 ADET 1/2" FEEDER KABLOSU VE 3 POI SETİNE 20'ŞERLİ BAĞLANTI SİSTEMİ
  // Her bir set: 10 kablo POI-A BTS portlarına + 10 kablo POI-B BTS portlarına = 20 kablo
  const W_poi = 0.40, H_poi = 0.35, D_poi = 0.26;
  const cylR_poi = cwCylinderRadius || 0.2285;
  const shelfBaseY_poi = cylR_poi + 0.088;
  const poiRotEuler = new THREE.Euler(-Math.PI / 2, 0, Math.PI / 2);
  const poiContRotEuler = new THREE.Euler(Math.PI / 2, 0, 0);

  function getBtsPortsWorld(shelfX, isPoiB) {
    const poiXRel = isPoiB ? 0.14 : -0.14;
    const btsPorts = [];
    for (let row = 0; row < 2; row++) {
      const zPos = -D_poi / 2 + 0.06 + row * 0.06;
      for (let col = 0; col < 6; col++) {
        const startX = -W_poi * 0.35;
        const stepX = (W_poi * 0.7) / 5;
        const pCont = new THREE.Vector3(startX + col * stepX, H_poi / 2 + 0.0125, zPos);
        pCont.applyEuler(poiContRotEuler);
        const pShelf = pCont.clone().applyEuler(poiRotEuler).add(new THREE.Vector3(poiXRel, shelfBaseY_poi + 0.175, 0));
        const pWorld = new THREE.Vector3(shelfX + pShelf.x, cwCylCenterY + pShelf.y, cwCylCenterZ + pShelf.z);
        btsPorts.push(pWorld);
      }
    }
    return btsPorts;
  }

  const poiSets = [
    { setIdx: 1, x: -2.42, name: 'Sol POI Seti' },
    { setIdx: 2, x: -1.60, name: 'Orta POI Seti' },
    { setIdx: 3, x: -0.78, name: 'Sağ POI Seti' }
  ];

  poiSets.forEach((st, sIdx) => {
    // 10 BTS portu POI-A'dan, 10 BTS portu POI-B'den alınır (Toplam tam 20 port)
    const portsA = getBtsPortsWorld(st.x, false).slice(0, 10);
    const portsB = getBtsPortsWorld(st.x, true).slice(0, 10);
    const setPorts = [...portsA, ...portsB];

    setPorts.forEach((portWorld, cIdx) => {
      const globalIdx = sIdx * 20 + cIdx; // 0..59 (Toplam 60 kablo)
      const col = globalIdx % 10;
      const tier = Math.floor(globalIdx / 10);
      const trayLocalX = -0.18 + col * 0.04;
      const trayLocalY = 0.485 + tier * 0.018;

      // 1. Kaynak Noktası: Orta Kedi Yolu Önü 2" Ofset Borularındaki RRU Portları (14 RRU)
      const isLeft = (globalIdx < 30);
      const rruSubIdx = globalIdx % 30;
      const rruRow = Math.floor(rruSubIdx / 10);
      const rruInRow = rruSubIdx % 10;
      const pipeX = isLeft ? (-0.35 - rruRow * 0.35) : (0.35 + rruRow * 0.35);
      const pipeY = 0.45 + rruRow * 0.75 + (rruInRow % 4) * 0.08;

      const rruStartLocal = new THREE.Vector3(pipeX, pipeY, 30.20);
      const rruStartWorld = rruStartLocal.clone().applyMatrix4(slopedMatrix);

      // 2. Geçiş Köprüsü Noktası (stZ = 30.35m)
      const bridgeLocal = new THREE.Vector3(isLeft ? -0.28 : 0.28, 0.48, 30.35);
      const bridgeWorld = bridgeLocal.clone().applyMatrix4(slopedMatrix);

      // 3. 50x15cm Çatı Tavasına Giriş (stZ = 30.60m)
      const trayEntryLocal = new THREE.Vector3(trayLocalX, trayLocalY, 30.60);
      const trayEntryWorld = trayEntryLocal.clone().applyMatrix4(slopedMatrix);

      // 4. Çatı Tavasında İlerleme Orta Noktası (stZ = 36.00m)
      const trayMidLocal = new THREE.Vector3(trayLocalX, trayLocalY, 36.00);
      const trayMidWorld = trayMidLocal.clone().applyMatrix4(slopedMatrix);

      // 5. Çatı Tavası Çıkışı ve İniş Oluğu (stZ = 41.20m)
      const trayExitLocal = new THREE.Vector3(trayLocalX, trayLocalY, 41.20);
      const trayExitWorld = trayExitLocal.clone().applyMatrix4(slopedMatrix);

      // 6. Eğimli İniş Tavasında İlerleme (Strut boyunca)
      const riserTopWorld = new THREE.Vector3(-3.00 + trayLocalX * 0.5, 9.95, 39.45);
      const riserMidWorld = new THREE.Vector3(-3.00 + trayLocalX * 0.5, 7.70, 41.25);
      const riserBotWorld = new THREE.Vector3(-3.00 + trayLocalX * 0.5, 5.50, 42.88);

      // 7. Silindir Arkası Yatay Dağıtım Tavasında İlerleme
      const trayDistWorld = new THREE.Vector3(portWorld.x - 0.03, 5.50 + tier * 0.012, 42.88);

      // 8. BTS Portuna Yukarı Büküm ve Düşey Giriş Döngüsü (Service drip-loop)
      const loopPreWorld = new THREE.Vector3(portWorld.x, 5.82, 42.98);
      const loopTopWorld = new THREE.Vector3(portWorld.x, 6.06, portWorld.z);
      const portEntryWorld = portWorld.clone();

      // Pürüzsüz Catmull-Rom B-Spline Eğrisi
      const cableCurve = new THREE.CatmullRomCurve3([
        rruStartWorld,
        bridgeWorld,
        trayEntryWorld,
        trayMidWorld,
        trayExitWorld,
        riserTopWorld,
        riserMidWorld,
        riserBotWorld,
        trayDistWorld,
        loopPreWorld,
        loopTopWorld,
        portEntryWorld
      ]);

      const tubeGeo = new THREE.TubeGeometry(cableCurve, 28, 0.007, 6, false);
      const tubeMesh = new THREE.Mesh(tubeGeo, feederCableMat);
      tubeMesh.castShadow = true;
      tubeMesh.name = `feeder_1_2_Set${st.setIdx}_Cable_${cIdx + 1}`;
      poiFeederCablingSystem.add(tubeMesh);

      // 4.3-10 RF Konnektör Somunu (Port girişinde)
      const connGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.024, 12);
      const conn = new THREE.Mesh(connGeo, connNutMat);
      conn.position.set(portWorld.x, portWorld.y + 0.012, portWorld.z);
      poiFeederCablingSystem.add(conn);

      // Sızdırmazlık Pabucu / Lastik Kılıf (Weatherproofing Boot)
      const bootGeo = new THREE.CylinderGeometry(0.014, 0.011, 0.032, 12);
      const boot = new THREE.Mesh(bootGeo, bootCoverMat);
      boot.position.set(portWorld.x, portWorld.y + 0.035, portWorld.z);
      poiFeederCablingSystem.add(boot);
    });
  });

  alan2Group.add(poiFeederCablingSystem);

  // -------------------------------------------------------------
  // 4C. POI SETLERİNDEN UÇTAKİ MATSİNG ANTENE (ANTENNA 3) 28 ADET 1/2" FEEDER KABLO SİSTEMİ
  //
  // Kullanıcı İsteği:
  // - "poilerden en son antene kablo çekecegiz. 4 poıden antene 4er tane 1/2 feeder 2 poiden ise 6 adet 1/2 feeder kablo çekeceksin. kabloları belirli bir düzenle çek"
  //
  // Dağılım ve Mimari Detaylar:
  // 1. POI Dağılımı (Toplam 6 POI, 28 Feeder):
  //    - Sol Set (X = -2.42m): POI-1 (6 feeder) + POI-2 (6 feeder) = 12 feeder (En yakın set 6+6 sağlar)
  //    - Orta Set (X = -1.60m): POI-3 (4 feeder) + POI-4 (4 feeder) = 8 feeder
  //    - Sağ Set (X = -0.78m): POI-5 (4 feeder) + POI-6 (4 feeder) = 8 feeder
  //    - Toplam: 12 + 8 + 8 = 28 adet 1/2" RF feeder kablo!
  // 2. Hedef Anten (Matsing 4-Beam Lens Anten - Antenna 3 at X = -3.00m, Y = 6.976m, Z = 41.568m):
  //    - Antenin tam olarak 28 adet RF portu bulunur:
  //      * 16 Adet Upper Full-Band (FB Beams 1-4, Mor Renk Halkalı)
  //      * 4 Adet Middle Low-Band (LB, Kırmızı Renk Halkalı)
  //      * 8 Adet Lower High-Band (HB Beams 1-4, Sarı Renk Halkalı)
  // 3. Kablo Düzeni & Taraklama (Orderly Bank Routing):
  //    - Taşıyıcı silindirin ön yüzü (+Z tarafı) boyunca uzanan 30cm genişliğinde galvanizli tel sepet / delikli tava (Front Collector Tray).
  //    - Silindirden anten taşıyıcı dikmesine uzanan enine geçiş köprüsü (Transverse Bridge at X = -2.85m .. -3.00m).
  //    - 28 kablo, 14 sol bank (Left Bank) ve 14 sağ bank (Right Bank) portlarına simetrik olarak dağıtılır.
  //    - Her port girişinde 4.3-10 RF konnektör somunu, siyah koruyucu lastik pabuç (weatherproofing boot)
  //      ve anten port rengine birebir uyan renk kodlama halkaları (Mor, Kırmızı, Sarı) takılmıştır.
  // -------------------------------------------------------------
  const poiToAntennaFeederSystem = new THREE.Group();
  poiToAntennaFeederSystem.name = 'poiToAntennaFeederSystem';

  // Özel Malzemeler
  const poiAntennaFeederMat = new THREE.MeshStandardMaterial({
    color: 0x111317, // 1/2" UV dayanımlı mat siyah koaksiyel dış kılıf
    roughness: 0.65,
    metalness: 0.20
  });

  const rfConnNutMat = new THREE.MeshStandardMaterial({
    color: 0xd4d4d8, // 4.3-10 gümüş/pirinç RF konnektör somunu
    metalness: 0.92,
    roughness: 0.18
  });

  const rfBootCoverMat = new THREE.MeshStandardMaterial({
    color: 0x090a0f, // Siyah kauçuk sızdırmazlık pabucu
    roughness: 0.70,
    metalness: 0.10
  });

  const antBandMatPurple = new THREE.MeshStandardMaterial({ color: 0x8b5cf6, metalness: 0.6, roughness: 0.3 }); // Upper FB
  const antBandMatRed = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.6, roughness: 0.3 });    // Middle LB
  const antBandMatYellow = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.6, roughness: 0.3 }); // Lower HB

  // A) TAŞIYICI SİLİNDİR ÖNÜ TOPLAMA VE DAĞITIM TAVASI (Front Collector Tray on Cylinder)
  // X ekseni: X = -2.85m ile X = -0.65m arası (2.20m boyunda)
  // Z kotu: Z = cwCylCenterZ + 0.32m = 43.568m (Kedi yolu yürüyüş kenarına paralel)
  // Y kotu: Y = 5.72m
  const frontTrayGroup = new THREE.Group();
  frontTrayGroup.name = 'poiFrontCollectorTray';

  const frontTrayW = 0.30; // 30 cm genişlik
  const frontTrayH = 0.06; // 6 cm kenar yüksekliği
  const frontStartX = -2.85;
  const frontEndX = -0.65;
  const frontLen = Math.abs(frontEndX - frontStartX); // 2.20m
  const frontMidX = (frontStartX + frontEndX) / 2;    // -1.75m
  const frontTrayZ = cwCylCenterZ + 0.32;             // ~43.568m
  const frontTrayY = 5.72;

  // 1. Taban Sacı
  const fFloorGeo = new THREE.BoxGeometry(frontLen, 0.003, frontTrayW);
  const fFloor = new THREE.Mesh(fFloorGeo, trayBottomMat);
  fFloor.position.set(frontMidX, frontTrayY, frontTrayZ);
  fFloor.castShadow = true;
  fFloor.receiveShadow = true;
  frontTrayGroup.add(fFloor);

  // 2. Ön ve Arka Yan Duvarlar
  [-frontTrayW / 2, frontTrayW / 2].forEach(wz => {
    const fWallGeo = new THREE.BoxGeometry(frontLen, frontTrayH, 0.003);
    const fWall = new THREE.Mesh(fWallGeo, traySideMat);
    fWall.position.set(frontMidX, frontTrayY + frontTrayH / 2, frontTrayZ + wz);
    fWall.castShadow = true;
    frontTrayGroup.add(fWall);

    // Üst flanş dudağı
    const fLipGeo = new THREE.BoxGeometry(frontLen, 0.003, 0.012);
    const fLip = new THREE.Mesh(fLipGeo, steelFlangeMat);
    fLip.position.set(frontMidX, frontTrayY + frontTrayH, frontTrayZ + wz + (wz < 0 ? 0.006 : -0.006));
    frontTrayGroup.add(fLip);
  });

  // 3. Sağ Bitiş Kapağı (X = -0.65m)
  const fCapGeo = new THREE.BoxGeometry(0.005, frontTrayH, frontTrayW);
  const fCap = new THREE.Mesh(fCapGeo, steelFlangeMat);
  fCap.position.set(frontEndX, frontTrayY + frontTrayH / 2, frontTrayZ);
  frontTrayGroup.add(fCap);

  // 4. Taşıyıcı Silindirden Öne Uzanan Konsol Kolları ve Çemberler (Tavataşıyıcısı)
  [-2.65, -1.85, -1.05].forEach(cx => {
    const brkGroup = new THREE.Group();
    brkGroup.position.set(cx, 0, 0);

    // Çember kelepçesi
    const collarGeo = new THREE.CylinderGeometry(cwCylinderRadius + 0.010, cwCylinderRadius + 0.010, 0.05, 24);
    collarGeo.rotateZ(Math.PI / 2);
    const collar = new THREE.Mesh(collarGeo, supportSteelMat);
    collar.position.set(0, cwCylCenterY, cwCylCenterZ);
    brkGroup.add(collar);

    // Öne uzanan konsol kolu (60x40mm)
    const armLen = Math.abs(frontTrayZ - cwCylCenterZ) + 0.06;
    const armGeo = new THREE.BoxGeometry(0.05, 0.035, armLen);
    const arm = new THREE.Mesh(armGeo, supportSteelMat);
    arm.position.set(0, frontTrayY - 0.02, (cwCylCenterZ + frontTrayZ) / 2);
    arm.castShadow = true;
    brkGroup.add(arm);

    // Tava tespit kenetleri
    [-frontTrayW / 2 + 0.02, frontTrayW / 2 - 0.02].forEach(cz => {
      const clipGeo = new THREE.BoxGeometry(0.03, 0.02, 0.025);
      const clip = new THREE.Mesh(clipGeo, darkJointMat);
      clip.position.set(0, frontTrayY + 0.01, frontTrayZ + cz);
      brkGroup.add(clip);
    });

    frontTrayGroup.add(brkGroup);
  });

  // 5. Anten Taşıyıcı Dikmesine Geçiş Köprüsü (Transverse Bridge at X = -2.85m .. -3.00m)
  const bridgeVec = new THREE.Vector3(-3.00 - (-2.85), 5.65 - frontTrayY, 42.10 - frontTrayZ);
  const bridgeLen = bridgeVec.length();
  const bridgeMid = new THREE.Vector3((-2.85 - 3.00) / 2, (frontTrayY + 5.65) / 2, (frontTrayZ + 42.10) / 2);

  const bridgeArmGeo = new THREE.BoxGeometry(0.24, 0.04, bridgeLen);
  const bridgeArm = new THREE.Mesh(bridgeArmGeo, steelFlangeMat);
  bridgeArm.position.copy(bridgeMid);
  bridgeArm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), bridgeVec.clone().normalize());
  bridgeArm.castShadow = true;
  frontTrayGroup.add(bridgeArm);

  // Dikme borusu tarafındaki tespit kelepçesi
  const strutCollarGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.06, 24);
  const strutCollar = new THREE.Mesh(strutCollarGeo, supportSteelMat);
  strutCollar.position.set(-3.00, 5.65, 42.10);
  frontTrayGroup.add(strutCollar);

  poiToAntennaFeederSystem.add(frontTrayGroup);

  // B) MATSİNG 4-BEAM ANTENİNİN 28 ADET RF PORTUNUN DÜNYA KOORDİNATLARINI VE BANTLARINI HESAPLA
  const pStrutLower_ant = new THREE.Vector3(0, -0.389, 0.389);
  const pStrutUpper_ant = new THREE.Vector3(0, 0.389, -0.389);
  const lenLower_ant = 1.15;
  const lenUpper_ant = 1.55;
  const pAntLower_ant = new THREE.Vector3(pStrutLower_ant.x, pStrutLower_ant.y - lenLower_ant, pStrutLower_ant.z);
  const pAntUpper_ant = new THREE.Vector3(pStrutUpper_ant.x, pStrutUpper_ant.y - lenUpper_ant, pStrutUpper_ant.z);
  const pMid_ant = new THREE.Vector3().addVectors(pAntLower_ant, pAntUpper_ant).multiplyScalar(0.5);
  const pipeVec_ant = new THREE.Vector3().subVectors(pAntUpper_ant, pAntLower_ant);
  const dirU_ant = pipeVec_ant.clone().normalize();
  const dirN_ant = new THREE.Vector3(0, -Math.abs(dirU_ant.z), -Math.abs(dirU_ant.y)).normalize();

  const orientMat_ant = new THREE.Matrix4();
  orientMat_ant.makeBasis(new THREE.Vector3(-1, 0, 0), dirU_ant, dirN_ant);
  const antPos_ant = pMid_ant.clone().addScaledVector(dirN_ant, 0.45);

  const H_ant = 1.635;
  const D_ant = 0.721;
  const halfD_ant = D_ant / 2;
  const portZ_ant = -halfD_ant + 0.09;
  const leftX_ant = -0.22;
  const rightX_ant = 0.22;

  const antAssemblyWorld = new THREE.Vector3(-3.00, 6.976, 41.568);

  const leftPorts_ant = [];
  const rightPorts_ant = [];

  // Upper FB Ports (16 port: 8 sol bank, 8 sağ bank - Mor)
  const upperYs_ant = [H_ant * 0.38, H_ant * 0.32, H_ant * 0.22, H_ant * 0.16];
  upperYs_ant.forEach(py => {
    leftPorts_ant.push({ pos: new THREE.Vector3(leftX_ant - 0.035, py, portZ_ant), bandMat: antBandMatPurple });
    leftPorts_ant.push({ pos: new THREE.Vector3(leftX_ant + 0.035, py, portZ_ant), bandMat: antBandMatPurple });
    rightPorts_ant.push({ pos: new THREE.Vector3(rightX_ant - 0.035, py, portZ_ant), bandMat: antBandMatPurple });
    rightPorts_ant.push({ pos: new THREE.Vector3(rightX_ant + 0.035, py, portZ_ant), bandMat: antBandMatPurple });
  });

  // Middle LB Ports (4 port: 2 sol bank, 2 sağ bank - Kırmızı)
  leftPorts_ant.push({ pos: new THREE.Vector3(leftX_ant - 0.02, -0.02, portZ_ant), bandMat: antBandMatRed });
  leftPorts_ant.push({ pos: new THREE.Vector3(leftX_ant + 0.02, -0.02, portZ_ant), bandMat: antBandMatRed });
  rightPorts_ant.push({ pos: new THREE.Vector3(rightX_ant - 0.02, -0.02, portZ_ant), bandMat: antBandMatRed });
  rightPorts_ant.push({ pos: new THREE.Vector3(rightX_ant + 0.02, -0.02, portZ_ant), bandMat: antBandMatRed });

  // Lower HB Ports (8 port: 4 sol bank, 4 sağ bank - Sarı)
  const lowerYs_ant = [-H_ant * 0.22, -H_ant * 0.28];
  lowerYs_ant.forEach(py => {
    leftPorts_ant.push({ pos: new THREE.Vector3(leftX_ant - 0.035, py, portZ_ant), bandMat: antBandMatYellow });
    leftPorts_ant.push({ pos: new THREE.Vector3(leftX_ant + 0.035, py, portZ_ant), bandMat: antBandMatYellow });
    rightPorts_ant.push({ pos: new THREE.Vector3(rightX_ant - 0.035, py, portZ_ant), bandMat: antBandMatYellow });
    rightPorts_ant.push({ pos: new THREE.Vector3(rightX_ant + 0.035, py, portZ_ant), bandMat: antBandMatYellow });
  });

  const transformAntPort = item => {
    const pRot = item.pos.clone().applyMatrix4(orientMat_ant);
    return {
      bandMat: item.bandMat,
      posWorld: pRot.add(antPos_ant).add(antAssemblyWorld)
    };
  };

  const leftTargets = leftPorts_ant.map(transformAntPort);   // 14 hedef port
  const rightTargets = rightPorts_ant.map(transformAntPort); // 14 hedef port

  // C) POI ANT ÇIKIŞ PORTLARI (6 POI: 4 POI x 4 Feeder + 2 POI x 6 Feeder = 28 Feeder)
  function getAntPortsWorld(shelfX, isPoiB, portCount) {
    const poiXRel = isPoiB ? 0.14 : -0.14;
    const antStartX = -W_poi * 0.32;
    const antStepX = (W_poi * 0.64) / (portCount - 1);
    const antZ = D_poi / 2 - 0.06;

    const ports = [];
    for (let col = 0; col < portCount; col++) {
      const pCont = new THREE.Vector3(antStartX + col * antStepX, H_poi / 2 + 0.0125, antZ);
      pCont.applyEuler(poiContRotEuler);
      const pShelf = pCont.clone().applyEuler(poiRotEuler).add(new THREE.Vector3(poiXRel, shelfBaseY_poi + 0.175, 0));
      const pWorld = new THREE.Vector3(shelfX + pShelf.x, cwCylCenterY + pShelf.y, cwCylCenterZ + pShelf.z);
      ports.push(pWorld);
    }
    return ports;
  }

  // Sol Bank'a Giden 14 Kaynak:
  // - Sol Set: POI-1 (ilk 3 port) + POI-2 (ilk 3 port) = 6 kablo
  // - Orta Set: POI-3 (ilk 2 port) + POI-4 (ilk 2 port) = 4 kablo
  // - Sağ Set: POI-5 (ilk 2 port) + POI-6 (ilk 2 port) = 4 kablo
  // Toplam = 6 + 4 + 4 = 14 kablo
  const leftSources = [
    ...getAntPortsWorld(-2.42, false, 6).slice(0, 3),
    ...getAntPortsWorld(-2.42, true, 6).slice(0, 3),
    ...getAntPortsWorld(-1.60, false, 4).slice(0, 2),
    ...getAntPortsWorld(-1.60, true, 4).slice(0, 2),
    ...getAntPortsWorld(-0.78, false, 4).slice(0, 2),
    ...getAntPortsWorld(-0.78, true, 4).slice(0, 2)
  ];

  // Sağ Bank'a Giden 14 Kaynak:
  // - Sol Set: POI-1 (son 3 port) + POI-2 (son 3 port) = 6 kablo
  // - Orta Set: POI-3 (son 2 port) + POI-4 (son 2 port) = 4 kablo
  // - Sağ Set: POI-5 (son 2 port) + POI-6 (son 2 port) = 4 kablo
  // Toplam = 6 + 4 + 4 = 14 kablo
  const rightSources = [
    ...getAntPortsWorld(-2.42, false, 6).slice(3, 6),
    ...getAntPortsWorld(-2.42, true, 6).slice(3, 6),
    ...getAntPortsWorld(-1.60, false, 4).slice(2, 4),
    ...getAntPortsWorld(-1.60, true, 4).slice(2, 4),
    ...getAntPortsWorld(-0.78, false, 4).slice(2, 4),
    ...getAntPortsWorld(-0.78, true, 4).slice(2, 4)
  ];

  // D) 28 ADET KESİNTİSİZ 1/2" FEEDER KABLOSUNUN DÜZENLİ TARAKLANMASI VE PORT MONTAJI
  [
    { sources: leftSources, targets: leftTargets, bank: 'Sol Bank' },
    { sources: rightSources, targets: rightTargets, bank: 'Sağ Bank' }
  ].forEach(b => {
    const isLeft = b.bank === 'Sol Bank';

    b.sources.forEach((srcWorld, idx) => {
      const tgt = b.targets[idx];
      const tier = idx % 4; // Tavadaki katman kotu (0..3)
      const lane = Math.floor(idx / 4); // Şerit kotu (0..3)

      const trayZ = frontTrayZ - 0.08 + tier * 0.04;
      const trayY = frontTrayY + 0.02 + (lane % 2) * 0.015;

      // 1. POI ANT Port Çıkışı
      const p0 = srcWorld.clone();

      // 2. Port Servis Damlalık Kavisi (Drip loop facing upward)
      const pLoop = new THREE.Vector3(p0.x, 6.06, p0.z + 0.035);

      // 3. Ön Toplama Tavasına Giriş
      const pTrayEntry = new THREE.Vector3(p0.x, trayY, trayZ);

      // 4. Tavada -X Yönünde Düzenli Paralel İlerleme
      const pTrayRun = new THREE.Vector3(-2.82 - tier * 0.015, trayY, trayZ);

      // 5. Anten Dikmesine Geçiş Köprüsü Üzerinde İlerleme
      const bridgeX = isLeft ? -3.12 - lane * 0.03 : -2.88 + lane * 0.03;
      const pBridgeMid = new THREE.Vector3(bridgeX, 5.65 + tier * 0.02, 42.35 - lane * 0.04);

      // 6. Anten Portuna Yaklaşım ve Hizalanma Kavisi
      const pApproach = new THREE.Vector3(
        tgt.posWorld.x + (isLeft ? -0.06 : 0.06),
        tgt.posWorld.y - 0.04,
        tgt.posWorld.z + 0.16
      );

      // 7. Anten Portu Kesin Hedef Girişi
      const pEnd = tgt.posWorld.clone();

      // Pürüzsüz B-Spline Geometrisi
      const curve = new THREE.CatmullRomCurve3([p0, pLoop, pTrayEntry, pTrayRun, pBridgeMid, pApproach, pEnd]);
      const tubeGeo = new THREE.TubeGeometry(curve, 28, 0.007, 6, false);
      const tubeMesh = new THREE.Mesh(tubeGeo, poiAntennaFeederMat);
      tubeMesh.castShadow = true;
      tubeMesh.name = `poi_to_antenna_feeder_${isLeft ? 'L' : 'R'}_${idx + 1}`;
      poiToAntennaFeederSystem.add(tubeMesh);

      // POI Tarafı 4.3-10 Konnektör Somunu ve Koruma Kılıfı
      const pConn = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.024, 12), rfConnNutMat);
      pConn.position.set(p0.x, p0.y + 0.012, p0.z);
      poiToAntennaFeederSystem.add(pConn);

      const pBoot = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.011, 0.032, 12), rfBootCoverMat);
      pBoot.position.set(p0.x, p0.y + 0.035, p0.z);
      poiToAntennaFeederSystem.add(pBoot);

      // Anten Tarafı 4.3-10 Konnektör Somunu, Koruma Kılıfı ve Bant Renk Halkası
      const antConnDir = new THREE.Vector3().subVectors(pApproach, pEnd).normalize();
      const antConnQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), antConnDir);

      const aConn = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.035, 12), rfConnNutMat);
      aConn.quaternion.copy(antConnQuat);
      aConn.position.copy(pEnd).addScaledVector(antConnDir, 0.018);
      poiToAntennaFeederSystem.add(aConn);

      const aBoot = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.012, 0.040, 12), rfBootCoverMat);
      aBoot.quaternion.copy(antConnQuat);
      aBoot.position.copy(pEnd).addScaledVector(antConnDir, 0.045);
      poiToAntennaFeederSystem.add(aBoot);

      // Anten Port Renk Kodlama Bileziği (Mor / Kırmızı / Sarı)
      const aBand = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.015, 12), tgt.bandMat);
      aBand.quaternion.copy(antConnQuat);
      aBand.position.copy(pEnd).addScaledVector(antConnDir, 0.070);
      poiToAntennaFeederSystem.add(aBand);
    });
  });

  alan2Group.add(poiToAntennaFeederSystem);

  // -------------------------------------------------------------
  // 8. BETON İLE ÇATI UCUNDAKİ KEDİ YOLU ARASINDAKİ ARA KEDİ YOLU (Intermediate Catwalk through 45m Truss)
  // Kullanıcı İsteği:
  // - "beton ile bu kedi yolu arasına bir kedi yolu daha ekleyecegiz."
  // - "Bu kedi yolu 45 metrelik taşıyıcımızın içinden geçiyor. beton ve mevcut kediyoluna paralel olarak ilerleiyor."
  // - "MEvcut kediyolunun yakın korkuluguna 16 metre."
  // - "Betonun yakın tarafına 28,5 metre bu ölçüler yaklaşık olarak verildi."
  // - "Sen kedi yolu referansını ise alan-1deki gibi kedi yolu olarak al ama kedi yolunu taşıyan siliindiri olmasın"
  // -------------------------------------------------------------
  const midCatwalkGroup = new THREE.Group();
  midCatwalkGroup.name = 'alan2IntermediateCatwalk';

  // Geometrik Konumlandırma:
  // Mevcut kedi yolunun yakın korkuluğu: Z = 43.934m
  // 16 metre mesafe: 43.934 - 16.0 = 27.934m (ara kedi yolunun uzak korkuluk hizası)
  // Kedi yolu genişliği 1.00m => Merkez Z = 27.934 - 0.50 = 27.434m
  // Beton kolon eksenine (Z = -1.35m) mesafe: 26.934 - (-1.35) = 28.28m ≈ 28.5 metre!
  const midCwCenterZ = 27.434;
  const midCwCenterX = -3.00; // 45m çatı makası aksı
  const midCwLength = 20.0;   // 20 metre boyunda (Alan-1 standardı)
  const midCwWidth = 1.0;     // 100 cm genişlik

  // Kot Hesabı: 45m çatı makası bu Z kotunda (s ≈ 29.04m) Y ≈ 7.97m seviyesindedir.
  // Taşıyıcı boru (tepe Y ≈ 8.11m) ve kablo tavası in-çık hattının (üst dudak Y ≈ 8.32m)
  // üzerinden sıfır temasla ve ferah bir açıklıkla (net 23cm hava boşluğu) geçmesi için:
  const midCwWalkY = 8.60; // Yürüme sacı üst yüzeyi (Taşıyıcı ve tavayı rahatça aşan kot)
  const midCwRailTopY = midCwWalkY + 1.00; // 9.60m (1 metre korkuluk payı)

  // A) Kedi Yolu Taban Sacı (100cm Genişlik, Izgara Stil, Yürüme Kotu = 8.60m)
  const midFloorGeo = new THREE.BoxGeometry(midCwLength, 0.05, midCwWidth);
  const midFloor = new THREE.Mesh(midFloorGeo, cwFloorMat);
  midFloor.position.set(midCwCenterX, midCwWalkY - 0.025, midCwCenterZ);
  midFloor.receiveShadow = true;
  midCatwalkGroup.add(midFloor);

  // B) Kenar Boyuna Taşıyıcı Profiller (Side Beams at Z = midCwCenterZ +/- 0.5m)
  const midBeamGeo = new THREE.BoxGeometry(midCwLength, 0.15, 0.08);
  const midFrontBeam = new THREE.Mesh(midBeamGeo, cwBeamMat);
  midFrontBeam.position.set(midCwCenterX, midCwWalkY - 0.025, midCwCenterZ + 0.5);
  midCatwalkGroup.add(midFrontBeam);

  const midBackBeam = new THREE.Mesh(midBeamGeo, cwBeamMat);
  midBackBeam.position.set(midCwCenterX, midCwWalkY - 0.025, midCwCenterZ - 0.5);
  midCatwalkGroup.add(midBackBeam);

  // C) Sarı Çelik Korkuluklar (Alan 1 Birebir - 1 Metre Yükseklik, Galatasaray Sarı)
  const midPostH = 1.00;
  const midPostGeo = new THREE.CylinderGeometry(0.02, 0.02, midPostH, 16);
  const midTopRailGeo = new THREE.CylinderGeometry(0.025, 0.025, midCwLength, 16);
  midTopRailGeo.rotateZ(Math.PI / 2);
  const midMidRailGeo = new THREE.CylinderGeometry(0.015, 0.015, midCwLength, 16);
  midMidRailGeo.rotateZ(Math.PI / 2);

  // Ön (+Z) ve Arka (-Z) Küpeşteler
  [midCwCenterZ + 0.5, midCwCenterZ - 0.5].forEach(rz => {
    // Üst küpeşte (Y = 9.60m)
    const topRail = new THREE.Mesh(midTopRailGeo, cwRailMat);
    topRail.position.set(midCwCenterX, midCwRailTopY - 0.025, rz);
    topRail.castShadow = true;
    midCatwalkGroup.add(topRail);

    // Orta emniyet kuşağı (Y = 9.10m)
    const midRail = new THREE.Mesh(midMidRailGeo, cwRailMat);
    midRail.position.set(midCwCenterX, midCwWalkY + 0.50, rz);
    midCatwalkGroup.add(midRail);

    // Etek sacı (15cm Kick Plate / Toe Board)
    const kickPlateGeo = new THREE.BoxGeometry(midCwLength, 0.15, 0.012);
    const kickPlate = new THREE.Mesh(kickPlateGeo, cwBeamMat);
    kickPlate.position.set(midCwCenterX, midCwWalkY + 0.075, rz);
    midCatwalkGroup.add(kickPlate);

    // Korkuluk Dikmeleri (Her 1.5 metrede bir)
    for (let i = -midCwLength / 2 + 0.5; i <= midCwLength / 2 - 0.5; i += 1.5) {
      const post = new THREE.Mesh(midPostGeo, cwRailMat);
      post.position.set(midCwCenterX + i, midCwWalkY + midPostH / 2, rz);
      post.castShadow = true;
      midCatwalkGroup.add(post);
    }
  });

  // D) SİLİNDİRSİZ TAŞIYICI KONSOL KİRİŞLERİ VE ÇATI ASKI ELEMANLARI (Underfloor Crossbeams & Suspension Rods)
  // Kullanıcı İsteği: "kedi yolunu taşıyan silindiri olmasın"
  const crossbeamMat = new THREE.MeshStandardMaterial({ color: 0x34495e, metalness: 0.8, roughness: 0.3 });
  const rodMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.75, roughness: 0.25 });
  const crossbeamGeo = new THREE.BoxGeometry(0.14, 0.14, 1.30); // 130cm boyunda enine taşıyıcı I-kiriş
  const rodGeo = new THREE.CylinderGeometry(0.014, 0.014, 2.50, 16);

  // Kedi yolu boyunca her 3.5 metrede bir enine taşıyıcı konsol travers ve çatıya asılan çelik rotlar
  for (let x = -midCwLength / 2 + 1.5; x <= midCwLength / 2 - 1.5; x += 3.5) {
    const cBeam = new THREE.Mesh(crossbeamGeo, crossbeamMat);
    cBeam.position.set(midCwCenterX + x, midCwWalkY - 0.12, midCwCenterZ);
    cBeam.castShadow = true;
    midCatwalkGroup.add(cBeam);

    // Her traversin iki ucundan çatı yapısına doğru uzanan askı çubukları
    [-0.55, 0.55].forEach(rz => {
      const rod = new THREE.Mesh(rodGeo, rodMat);
      rod.position.set(midCwCenterX + x, midCwWalkY + 1.15, midCwCenterZ + rz);
      rod.castShadow = true;
      midCatwalkGroup.add(rod);
    });
  }

  // E) 45M ÇATI MAKASINDAN GEÇİŞ YAN DESTEK BRAKETLERİ (Truss Pass-Through Side Stanchion Brackets)
  // Alttan geçen tava ve kabloların kesişimini önlemek amacıyla merkez koridor tamamen açık tutulmuş,
  // kedi yolu taşıyıcı yan kirişleri makasa sol ve sağ çift tespit braketi ile bağlanmıştır.
  const passBracketGeo = new THREE.BoxGeometry(0.12, 0.26, 0.16);
  [-0.45, 0.45].forEach(bx => {
    [-0.50, 0.50].forEach(bz => {
      const pBracket = new THREE.Mesh(passBracketGeo, steelFlangeMat);
      pBracket.position.set(midCwCenterX + bx, midCwWalkY - 0.155, midCwCenterZ + bz);
      pBracket.castShadow = true;
      midCatwalkGroup.add(pBracket);
    });
  });

  alan2Group.add(midCatwalkGroup);
}

// =============================================================
// ALAN 3: 45M ÇATI TAŞIYICISI, 50x15CM KABLO TAVASI (BATTI-ÇIKTI),
// 23M VE 39M (16M SONRASI) KEDİ YOLLARI
// =============================================================
function createAlan3RoofTrussAndCableTray(alan3Group) {
  const trussGroup = new THREE.Group();
  trussGroup.name = 'alan3RoofTrussAndCableTray';

  // 1. MALZEMELER
  const pipeWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xebedf0,
    roughness: 0.38,
    metalness: 0.35
  });

  const steelFlangeMat = new THREE.MeshStandardMaterial({
    color: 0xc8ccd0,
    roughness: 0.35,
    metalness: 0.75
  });

  const darkJointMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.45,
    metalness: 0.7
  });

  const trayPerforatedTex = createCableTrayPerforatedTexture();
  trayPerforatedTex.repeat.set(1, 60);
  const trayBottomMat = new THREE.MeshStandardMaterial({
    map: trayPerforatedTex,
    transparent: true,
    alphaTest: 0.25,
    color: 0xb0bec5,
    metalness: 0.85,
    roughness: 0.25,
    side: THREE.DoubleSide
  });

  const traySideMat = new THREE.MeshStandardMaterial({
    color: 0x90a4ae,
    metalness: 0.85,
    roughness: 0.3,
    side: THREE.DoubleSide
  });

  const cwFloorMat = new THREE.MeshStandardMaterial({ 
    color: 0x2d323f, 
    roughness: 0.8,
    metalness: 0.6
  });

  const cwBeamMat = new THREE.MeshStandardMaterial({ 
    color: 0x1f2228, 
    metalness: 0.8, 
    roughness: 0.2 
  });

  const cwRailMat = new THREE.MeshStandardMaterial({ 
    color: 0xfdb913, 
    metalness: 0.5, 
    roughness: 0.3 
  });

  const crossbeamMat = new THREE.MeshStandardMaterial({ 
    color: 0x34495e, 
    metalness: 0.8, 
    roughness: 0.3 
  });

  const rodMat = new THREE.MeshStandardMaterial({ 
    color: 0x94a3b8, 
    metalness: 0.75, 
    roughness: 0.25 
  });

  function createPipe(p1, p2, radius, mat) {
    const dir = new THREE.Vector3().subVectors(p2, p1);
    const len = dir.length();
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    const geo = new THREE.CylinderGeometry(radius, radius, len, 24);
    const mesh = new THREE.Mesh(geo, mat);
    const yAxis = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(yAxis, dir.clone().normalize());
    mesh.quaternion.copy(quat);
    mesh.position.copy(mid);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  // -------------------------------------------------------------
  // 2. 45 METRELİK AÇILI YUKARI YÜKSELEN TAŞIYICI GRUP (Sloped Truss Assembly)
  // Aks: X = -3.00 m
  // Başlangıç: Z = -1.35 m, Y = 4.10 m (Yatay silindir kiriş üstü)
  // Eğim: 45 metre hat boyunda 6 metre kot yükselmesi (θ ≈ 7.6623°)
  // -------------------------------------------------------------
  const baseSlopeLen = 45.00;
  const heightRise = 6.00;
  const slopeAngleRad = Math.asin(heightRise / baseSlopeLen); // ≈ 7.6623°
  const slopeLen = 46.85;

  const slopedGroup = new THREE.Group();
  slopedGroup.position.set(-3.00, 4.10, -1.35);
  slopedGroup.rotation.x = -slopeAngleRad;
  trussGroup.add(slopedGroup);

  const carrierRadius = 0.14; // Ø28cm ana beyaz silindir

  // A) Ana Taşıyıcı Boyuna Boru
  const carrierGeo = new THREE.CylinderGeometry(carrierRadius, carrierRadius, slopeLen, 32);
  carrierGeo.rotateX(Math.PI / 2);
  const carrierMesh = new THREE.Mesh(carrierGeo, pipeWhiteMat);
  carrierMesh.position.set(0, 0, slopeLen / 2);
  carrierMesh.castShadow = true;
  carrierMesh.receiveShadow = true;
  slopedGroup.add(carrierMesh);

  // B) 2.5 Metrede Bir V-Strut Ayakları ve Tava Taşıyıcı Traversleri
  const armBaseX = 0.08;
  const armBaseY = carrierRadius;
  const armTopX = 0.55;
  const armTopY = 1.45;
  const strutRadius = 0.07;
  const zStep = 2.50;
  const armStationsZ = [];
  for (let z = 0.0; z <= slopeLen; z += zStep) {
    armStationsZ.push(z);
  }

  const collarClampGeo = new THREE.CylinderGeometry(carrierRadius + 0.015, carrierRadius + 0.015, 0.16, 24);
  collarClampGeo.rotateX(Math.PI / 2);
  const crossBeamGeo = new THREE.BoxGeometry(0.70, 0.08, 0.04);
  const pedestalGeo = new THREE.BoxGeometry(0.54, 0.05, 0.08);
  const holdClampGeo = new THREE.BoxGeometry(0.04, 0.03, 0.05);

  armStationsZ.forEach(stZ => {
    // Sol ve sağ V-kol
    const leftArm = createPipe(
      new THREE.Vector3(-armBaseX, armBaseY, stZ),
      new THREE.Vector3(-armTopX, armTopY, stZ),
      strutRadius,
      pipeWhiteMat
    );
    slopedGroup.add(leftArm);

    const rightArm = createPipe(
      new THREE.Vector3(armBaseX, armBaseY, stZ),
      new THREE.Vector3(armTopX, armTopY, stZ),
      strutRadius,
      pipeWhiteMat
    );
    slopedGroup.add(rightArm);

    // Üst enine gergi borusu
    const topBar = createPipe(
      new THREE.Vector3(-armTopX, armTopY, stZ),
      new THREE.Vector3(armTopX, armTopY, stZ),
      0.04,
      pipeWhiteMat
    );
    slopedGroup.add(topBar);

    // Boruyu saran takviye kelepçesi
    const collar = new THREE.Mesh(collarClampGeo, steelFlangeMat);
    collar.position.set(0, 0, stZ);
    slopedGroup.add(collar);

    // Kolların 60cm açıldığı Y = 0.42m kotundaki tava travers kaidesi (Sadece tavanın yer aldığı istasyonlarda: stZ <= 35.0m)
    if (stZ <= 35.0) {
      const crossY = 0.42;
      const cBeam = new THREE.Mesh(crossBeamGeo, steelFlangeMat);
      cBeam.position.set(0, crossY, stZ);
      slopedGroup.add(cBeam);

      // Tava Yastık Kaidesi
      const pedestalY = crossY + 0.04 + 0.025;
      const ped = new THREE.Mesh(pedestalGeo, steelFlangeMat);
      ped.position.set(0, pedestalY, stZ);
      slopedGroup.add(ped);

      // Tava tespit kenetleri
      [-0.26, 0.26].forEach(hx => {
        const holdClamp = new THREE.Mesh(holdClampGeo, darkJointMat);
        holdClamp.position.set(hx, pedestalY + 0.045, stZ);
        slopedGroup.add(holdClamp);
      });
    }
  });

  // Üst Boyuna Aşık Boruları
  const topChordGeo = new THREE.CylinderGeometry(0.09, 0.09, slopeLen, 24);
  topChordGeo.rotateX(Math.PI / 2);

  const leftTopChord = new THREE.Mesh(topChordGeo, pipeWhiteMat);
  leftTopChord.position.set(-armTopX, armTopY, slopeLen / 2);
  leftTopChord.castShadow = true;
  slopedGroup.add(leftTopChord);

  const rightTopChord = new THREE.Mesh(topChordGeo, pipeWhiteMat);
  rightTopChord.position.set(armTopX, armTopY, slopeLen / 2);
  rightTopChord.castShadow = true;
  slopedGroup.add(rightTopChord);

  // Üst Başlıklar Arası Çapraz Kafes Gergileri
  for (let i = 0; i < armStationsZ.length - 1; i++) {
    const z1 = armStationsZ[i];
    const z2 = armStationsZ[i + 1];
    const brace1 = createPipe(
      new THREE.Vector3(-armTopX, armTopY, z1),
      new THREE.Vector3(armTopX, armTopY, z2),
      0.035,
      pipeWhiteMat
    );
    slopedGroup.add(brace1);
    const brace2 = createPipe(
      new THREE.Vector3(armTopX, armTopY, z1),
      new THREE.Vector3(-armTopX, armTopY, z2),
      0.035,
      pipeWhiteMat
    );
    slopedGroup.add(brace2);
  }

  // -------------------------------------------------------------
  // 3. 50 CM GENİŞLİK, 15 CM YÜKSEKLİKTE DELİKLİ KABLO TAVASI (BATTI-ÇIKTI)
  // Kullanıcı İsteği: "ilk kedi yolunu 23. metreye koy kabloları altından geçmesi için battı çıktı yapmayı unutma"
  // -------------------------------------------------------------
  const trayW = 0.50;
  const trayH = 0.15;
  const trayWallThick = 0.003;
  const trayBottomYNormal = 0.42 + 0.04 + 0.025 + 0.0425; // 0.5275m
  const trayBottomYDip = 0.20; // Kedi yolu altı alçak geçiş havuzu

  const traySegments = [
    { yStart: trayBottomYNormal, zStart: 0.0, yEnd: trayBottomYNormal, zEnd: 21.80 },
    { yStart: trayBottomYNormal, zStart: 21.80, yEnd: trayBottomYDip, zEnd: 22.30 }, // 32cm iniş (battı)
    { yStart: trayBottomYDip, zStart: 22.30, yEnd: trayBottomYDip, zEnd: 23.70 },     // Kedi yolu altı alçak havuz
    { yStart: trayBottomYDip, zStart: 23.70, yEnd: trayBottomYNormal, zEnd: 24.20 }, // 32cm çıkış (çıktı)
    { yStart: trayBottomYNormal, zStart: 24.20, yEnd: trayBottomYNormal, zEnd: 34.80 }  // Kullanıcı İsteği: Anten 2 çıkışından sonra tavanın fazlalığını kes (34.80m sonlandırma)
  ];

  traySegments.forEach(seg => {
    const dy = seg.yEnd - seg.yStart;
    const dz = seg.zEnd - seg.zStart;
    const segLen = Math.hypot(dy, dz);
    const segAngleX = Math.atan2(seg.yStart - seg.yEnd, dz);
    const midY = (seg.yStart + seg.yEnd) / 2;
    const midZ = (seg.zStart + seg.zEnd) / 2;

    const bGeo = new THREE.BoxGeometry(trayW, trayWallThick, segLen);
    const bMesh = new THREE.Mesh(bGeo, trayBottomMat);
    bMesh.rotation.x = segAngleX;
    bMesh.position.set(0, midY + (trayWallThick / 2) * Math.cos(segAngleX), midZ);
    bMesh.receiveShadow = true;
    bMesh.castShadow = true;
    slopedGroup.add(bMesh);

    const sideGeo = new THREE.BoxGeometry(trayWallThick, trayH, segLen);
    const lMesh = new THREE.Mesh(sideGeo, traySideMat);
    lMesh.rotation.x = segAngleX;
    lMesh.position.set(-trayW / 2 + trayWallThick / 2, midY + (trayH / 2) * Math.cos(segAngleX), midZ);
    lMesh.castShadow = true;
    slopedGroup.add(lMesh);

    const rMesh = new THREE.Mesh(sideGeo, traySideMat);
    rMesh.rotation.x = segAngleX;
    rMesh.position.set(trayW / 2 - trayWallThick / 2, midY + (trayH / 2) * Math.cos(segAngleX), midZ);
    rMesh.castShadow = true;
    slopedGroup.add(rMesh);

    const lipGeo = new THREE.BoxGeometry(0.015, trayWallThick, segLen);
    const lLip = new THREE.Mesh(lipGeo, steelFlangeMat);
    lLip.rotation.x = segAngleX;
    lLip.position.set(-trayW / 2 + 0.0075, midY + trayH * Math.cos(segAngleX), midZ);
    slopedGroup.add(lLip);

    const rLip = new THREE.Mesh(lipGeo, steelFlangeMat);
    rLip.rotation.x = segAngleX;
    rLip.position.set(trayW / 2 - 0.0075, midY + trayH * Math.cos(segAngleX), midZ);
    slopedGroup.add(rLip);
  });

  // Alçak geçiş altı taşıyıcı eyer montajı (z = 23.0m)
  const dipSaddleGeo = new THREE.BoxGeometry(trayW + 0.04, 0.04, 0.20);
  const dipSaddle = new THREE.Mesh(dipSaddleGeo, steelFlangeMat);
  dipSaddle.position.set(0, trayBottomYDip - 0.02, 23.0);
  slopedGroup.add(dipSaddle);

  // Anten 1 ve Anten 2 Feeder Kablo İniş Olukları (Drop-out Chutes at s = 33.25m ve s = 34.25m)
  const chuteGeo = new THREE.BoxGeometry(0.24, 0.02, 0.35);
  const chute1 = new THREE.Mesh(chuteGeo, steelFlangeMat);
  chute1.position.set(-0.12, trayBottomYNormal - 0.04, 33.25);
  chute1.rotation.x = 0.35;
  slopedGroup.add(chute1);

  const chute2 = new THREE.Mesh(chuteGeo, steelFlangeMat);
  chute2.position.set(-0.12, trayBottomYNormal - 0.04, 34.25);
  chute2.rotation.x = 0.35;
  slopedGroup.add(chute2);

  // Tava Sonlandırma Uç Kapağı (Kullanıcı İsteği: Tava fazlalığını sil ve sonlandır - z = 34.80m)
  const endCapGeo = new THREE.BoxGeometry(trayW, trayH, trayWallThick);
  const endCapMesh = new THREE.Mesh(endCapGeo, traySideMat);
  endCapMesh.position.set(0, trayBottomYNormal + trayH / 2, 34.80);
  endCapMesh.castShadow = true;
  slopedGroup.add(endCapMesh);

  // -------------------------------------------------------------
  // 3.B 7/8" FEEDER KABLOLAMA SİSTEMİ (2 ADET POI'DEN 4'ER ADET = 8 FEEDER)
  // Kullanıcı İsteği: "yerleşimde bulunan 2 adet poıden 4 er adet kablo çıkar ve 
  // 4 bi antene 4 bir antene oolacak şekilde kablo çek bu kablolar 7/8 feeder olacak . 
  // Sonrasında tavaların fazlalıklarını ve tava taşıyıcıların fazlalıklarını silebilirsin"
  // -------------------------------------------------------------
  const feederMat = new THREE.MeshStandardMaterial({
    color: 0x141619,
    roughness: 0.65,
    metalness: 0.20
  });
  const dinConnectorMat = new THREE.MeshStandardMaterial({
    color: 0xd4d4d8,
    metalness: 0.95,
    roughness: 0.20
  });
  const bootMat = new THREE.MeshStandardMaterial({
    color: 0x0a0a0c,
    roughness: 0.80
  });
  const clampBracketMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    metalness: 0.80,
    roughness: 0.35
  });

  const feederRadius = 0.011; // 7/8" Feeder (~22mm dış çap)
  const connGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.035, 12);
  const bootGeo = new THREE.CylinderGeometry(0.018, 0.016, 0.045, 12);

  // slopedGroup koordinat dönüşüm matrisi ve tersi
  const slopedMatrix = new THREE.Matrix4();
  slopedMatrix.compose(
    new THREE.Vector3(-3.00, 4.10, -1.35),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -slopeAngleRad),
    new THREE.Vector3(1, 1, 1)
  );
  const invSlopedMatrix = slopedMatrix.clone().invert();

  // Spot Beam Anten Portlarının slopedGroup lokal koordinatları
  function getSpotBeamPortsLocal(targetY, targetZ) {
    const dropH = 2.0;
    const pMid = new THREE.Vector3(0, -dropH, 0);
    const pAntUpper = new THREE.Vector3(0, -dropH + 0.45 * 0.4369, -0.4048);
    const pAntLower = new THREE.Vector3(0, -dropH - 0.45 * 0.4369, 0.4048);
    const pipeVec = new THREE.Vector3().subVectors(pAntUpper, pAntLower);
    const dirTravers = pipeVec.clone().normalize();
    const dirU0 = dirTravers.clone();
    const dirN0 = new THREE.Vector3(0, -Math.abs(dirU0.z), -Math.abs(dirU0.y)).normalize();
    const dirR0 = new THREE.Vector3(-1, 0, 0);

    const yawRad = THREE.MathUtils.degToRad(-45); // 45° yönlenme
    const rotY = new THREE.Matrix4().makeRotationY(yawRad);
    const dirU = dirU0.clone().applyMatrix4(rotY).normalize();
    const dirN = dirN0.clone().applyMatrix4(rotY).normalize();
    const dirR = dirR0.clone().applyMatrix4(rotY).normalize();

    const offsetArmLen = 0.10;
    const pArmEnd = pMid.clone().add(new THREE.Vector3(offsetArmLen, 0, 0));
    const antPipeCenter = pArmEnd;

    const orientMat = new THREE.Matrix4();
    orientMat.makeBasis(dirR, dirU, dirN);
    const standoffOffset = 0.421;
    const antPosInAssembly = antPipeCenter.clone().addScaledVector(dirN, standoffOffset);

    const W = 0.700;
    const D = 0.170;
    const portSpacing = 0.085;
    const portStartY = 0.125;
    const portX = W * 0.26;
    const portZ = -D / 2 - 0.016;

    const ports = [];
    for (let idx = 0; idx < 4; idx++) {
      const py = portStartY - idx * portSpacing;
      const pLoc = new THREE.Vector3(portX, py, portZ);
      const pRot = pLoc.clone().applyMatrix4(orientMat);
      const pAssy = pRot.clone().add(antPosInAssembly);
      const pWorld = new THREE.Vector3(-3.00, targetY, targetZ).add(pAssy);
      const pLocal = pWorld.clone().applyMatrix4(invSlopedMatrix);
      ports.push({ pWorld, pLocal, dirApproach: dirN.clone().negate() });
    }
    return ports;
  }

  const ant1Ports = getSpotBeamPortsLocal(8.533, 31.603);
  const ant2Ports = getSpotBeamPortsLocal(8.667, 32.594);

  // Dikey merdiven üzeri kablo grubu (alan3Group koordinatlarında)
  // Kullanıcı İsteği: "Alan-4 de de kablo merdivenini taşıyıcı sutunun arkasına al ."
  // - Kablolar POI'den (X ≈ -3.72m) çıkıp arka alt tava ile X = 0.00m taşıyıcı sütun arkasına ulaşır
  // - X = 0.00m kolonunun arka yüzeyindeki dikey kablo merdiveninden Y = 4.03m kotuna tırmanır
  // - Y = 4.03m yatay kiriş köprü tavasından X = -3.00m uzay çatı makasına geçip çatı tavasına bağlanır
  const riserFeederGroup = new THREE.Group();
  riserFeederGroup.name = 'alan3RiserFeederCables';

  const colZLoc = -1.35;
  const colRadLoc = 0.20;
  const vLadderRearZ = colZLoc - colRadLoc - 0.035; // -1.585m (sütun arkası kablo merdiveni aksı)

  // 8 Feeder Kablosu Döşeme Döngüsü (4 Adet POI 1 -> Anten 1, 4 Adet POI 2 -> Anten 2)
  for (let i = 0; i < 8; i++) {
    const isAnt1 = (i < 4);
    const portIdx = i % 4;
    const poiIndex = isAnt1 ? 0 : 1;
    const targetPort = isAnt1 ? ant1Ports[portIdx] : ant2Ports[portIdx];
    const chuteZ = isAnt1 ? 33.25 : 34.25;

    // 50cm tava tabanında 8 feeder simetrik yan yana dizilim
    const trayX = -0.1575 + i * 0.045;
    const ladderFeederX = -0.12 + i * 0.034;

    // A) POI MODÜLÜNDEN DİKEY MERDİVENE VE ÇATI GİRİŞİNE (Dünya Koordinatlarında)
    const poiBaseY = poiIndex === 0 ? 0.38 : 0.81;
    const poiPortX = -0.974 + (-0.11 + portIdx * 0.075);
    const poiPortY = poiBaseY + 0.12;
    const poiPortZ = -1.273 + 0.14;

    // POI Konnektörü ve Sızdırmazlık Pabucu
    const poiConn = new THREE.Mesh(connGeo, dinConnectorMat);
    poiConn.position.set(poiPortX, poiPortY, poiPortZ);
    poiConn.rotation.x = Math.PI / 2;
    riserFeederGroup.add(poiConn);

    const poiBoot = new THREE.Mesh(bootGeo, bootMat);
    poiBoot.position.set(poiPortX, poiPortY, poiPortZ + 0.035);
    poiBoot.rotation.x = Math.PI / 2;
    riserFeederGroup.add(poiBoot);

    const riserPts = [
      // 1. POI çıkışı
      new THREE.Vector3(poiPortX, poiPortY, poiPortZ + 0.06),
      new THREE.Vector3(poiPortX, poiPortY, poiPortZ + 0.12),
      // 2. Alt arka tava güzergahına yumuşak geçiş
      new THREE.Vector3(poiPortX + 0.12, 0.25 + i * 0.012, -1.45),
      new THREE.Vector3(poiPortX + 0.28, 0.23 + i * 0.012, vLadderRearZ + ladderFeederX * 0.3),
      // 3. Arka alt tava boyunca X = 0.0m sütun tabanına ilerleme
      new THREE.Vector3(-1.80, 0.23 + i * 0.012, vLadderRearZ + ladderFeederX * 0.3),
      new THREE.Vector3(-0.45, 0.23 + i * 0.012, vLadderRearZ + ladderFeederX * 0.3),
      new THREE.Vector3(-0.15, 0.30 + i * 0.012, vLadderRearZ + 0.022),
      // 4. X = 0.0m sütun arka merdiveni boyunca dikey tırmanış
      new THREE.Vector3(ladderFeederX, 0.60, vLadderRearZ + 0.022),
      new THREE.Vector3(ladderFeederX, 2.00, vLadderRearZ + 0.022),
      new THREE.Vector3(ladderFeederX, 3.20, vLadderRearZ + 0.022),
      new THREE.Vector3(ladderFeederX, 3.85, vLadderRearZ + 0.022),
      // 5. Y = 4.03m kotunda yatay köprü tavasına 90° yumuşak dirsek dönüşü
      new THREE.Vector3(ladderFeederX, 4.05, vLadderRearZ + 0.015),
      new THREE.Vector3(-0.25, 4.05, vLadderRearZ),
      // 6. Üst kiriş arkası tava boyunca X = -3.00m çatı makasına ilerleme
      new THREE.Vector3(-1.50, 4.05, vLadderRearZ),
      new THREE.Vector3(-2.65, 4.05, vLadderRearZ),
      // 7. X = -3.00m uzay çatı makas tavasına yumuşak giriş kavisi
      new THREE.Vector3(-2.95 + trayX, 4.07, -1.48),
      new THREE.Vector3(-3.00 + trayX, 4.10 + feederRadius, -1.35)
    ];

    const riserCurve = new THREE.CatmullRomCurve3(riserPts, false, 'catmullrom', 0.08);
    const riserGeo = new THREE.TubeGeometry(riserCurve, 36, feederRadius, 8, false);
    const riserMesh = new THREE.Mesh(riserGeo, feederMat);
    riserMesh.castShadow = true;
    riserFeederGroup.add(riserMesh);

    // Merdiven üzeri paslanmaz kablo tutucu klempler (X = 0.0m sütun arkasında Y = 2.0m ve Y = 3.5m)
    if (i === 0) {
      [2.0, 3.5].forEach(clampY => {
        const clampBarGeo = new THREE.BoxGeometry(0.38, 0.025, 0.03);
        const cBar = new THREE.Mesh(clampBarGeo, clampBracketMat);
        cBar.position.set(0.00, clampY, vLadderRearZ + 0.035);
        riserFeederGroup.add(cBar);
      });
    }

    // B) ÇATI TAŞIYICISI TAVA İÇİ, BATTI-ÇIKTI, CHUTE VE ANTEN BAĞLANTISI (slopedGroup Koordinatlarında)
    const trayPts = [];
    trayPts.push(new THREE.Vector3(trayX, trayBottomYNormal + feederRadius, 0.0));
    trayPts.push(new THREE.Vector3(trayX, trayBottomYNormal + feederRadius, 10.0));
    trayPts.push(new THREE.Vector3(trayX, trayBottomYNormal + feederRadius, 21.60));

    // 1. Kedi Yolu (23.m) Battı-Çıktı
    trayPts.push(new THREE.Vector3(trayX, (trayBottomYNormal + trayBottomYDip) / 2 + feederRadius, 22.05));
    trayPts.push(new THREE.Vector3(trayX, trayBottomYDip + feederRadius, 22.40));
    trayPts.push(new THREE.Vector3(trayX, trayBottomYDip + feederRadius, 23.00));
    trayPts.push(new THREE.Vector3(trayX, trayBottomYDip + feederRadius, 23.60));
    trayPts.push(new THREE.Vector3(trayX, (trayBottomYNormal + trayBottomYDip) / 2 + feederRadius, 23.95));
    trayPts.push(new THREE.Vector3(trayX, trayBottomYNormal + feederRadius, 24.30));
    trayPts.push(new THREE.Vector3(trayX, trayBottomYNormal + feederRadius, 28.00));

    if (!isAnt1) {
      trayPts.push(new THREE.Vector3(trayX, trayBottomYNormal + feederRadius, 33.25));
    }

    // Chute (İniş Oluğu) Çıkışı
    trayPts.push(new THREE.Vector3(trayX, trayBottomYNormal + feederRadius, chuteZ - 0.35));
    trayPts.push(new THREE.Vector3(-0.12 + portIdx * 0.03, trayBottomYNormal - 0.03, chuteZ));
    trayPts.push(new THREE.Vector3(-0.18 + portIdx * 0.02, trayBottomYNormal - 0.18, chuteZ + 0.12));

    // Düşey Askı Borusu Boyunca İniş
    const dropX = -0.06 + portIdx * 0.02;
    trayPts.push(new THREE.Vector3(dropX, -0.40, chuteZ));
    trayPts.push(new THREE.Vector3(dropX, -1.20, chuteZ));
    trayPts.push(new THREE.Vector3(dropX, -1.80, chuteZ));

    // Anten Portuna Yaklaşım ve RF Konnektör Girişi
    const pLoc = targetPort.pLocal;
    trayPts.push(new THREE.Vector3(pLoc.x + 0.05, pLoc.y + 0.15, pLoc.z - 0.12));
    trayPts.push(new THREE.Vector3(pLoc.x + 0.02, pLoc.y + 0.06, pLoc.z - 0.05));
    trayPts.push(new THREE.Vector3(pLoc.x, pLoc.y, pLoc.z));

    const trayCurve = new THREE.CatmullRomCurve3(trayPts);
    const trayGeo = new THREE.TubeGeometry(trayCurve, 70, feederRadius, 8, false);
    const trayMesh = new THREE.Mesh(trayGeo, feederMat);
    trayMesh.castShadow = true;
    slopedGroup.add(trayMesh);

    // Anten Giriş Konnektörü ve Kauçuk Kılıfı
    const antConn = new THREE.Mesh(connGeo, dinConnectorMat);
    antConn.position.copy(pLoc);
    antConn.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-0.1, 0.4, 0.9).normalize());
    slopedGroup.add(antConn);

    const antBoot = new THREE.Mesh(bootGeo, bootMat);
    antBoot.position.set(pLoc.x + 0.015, pLoc.y + 0.04, pLoc.z - 0.035);
    antBoot.quaternion.copy(antConn.quaternion);
    slopedGroup.add(antBoot);
  }

  alan3Group.add(riserFeederGroup);

  // -------------------------------------------------------------
  // 4. 1. KEDİ YOLU (23. METREDE)
  // Kullanıcı İsteği: "ilk kedi yolunu 23. metreye koy kabloları altından geçmesi için battı çıktı yapmayı unutma"
  // s = 23.0m => Z_world ≈ 21.444m, Y_truss ≈ 7.167m, Walkway Y = 7.80m
  // -------------------------------------------------------------
  const cw1Group = new THREE.Group();
  cw1Group.name = 'alan3KediYolu1_23m';

  const cw1StationZ = 23.0;
  const cw1CenterZ = -1.35 + cw1StationZ * Math.cos(slopeAngleRad);
  const cw1CenterX = -3.00;
  const cw1Length = 20.0;
  const cw1Width = 1.0;
  const cw1WalkY = 7.80;
  const cw1RailTopY = cw1WalkY + 1.00;

  const cw1FloorGeo = new THREE.BoxGeometry(cw1Length, 0.05, cw1Width);
  const cw1Floor = new THREE.Mesh(cw1FloorGeo, cwFloorMat);
  cw1Floor.position.set(cw1CenterX, cw1WalkY - 0.025, cw1CenterZ);
  cw1Floor.receiveShadow = true;
  cw1Group.add(cw1Floor);

  const cw1BeamGeo = new THREE.BoxGeometry(cw1Length, 0.15, 0.08);
  [-0.5, 0.5].forEach(bz => {
    const beam = new THREE.Mesh(cw1BeamGeo, cwBeamMat);
    beam.position.set(cw1CenterX, cw1WalkY - 0.025, cw1CenterZ + bz);
    cw1Group.add(beam);
  });

  // Sarı Küpeşteler ve Etek Sacları
  const cw1PostH = 1.00;
  const cw1PostGeo = new THREE.CylinderGeometry(0.02, 0.02, cw1PostH, 16);
  const cw1TopRailGeo = new THREE.CylinderGeometry(0.025, 0.025, cw1Length, 16);
  cw1TopRailGeo.rotateZ(Math.PI / 2);
  const cw1MidRailGeo = new THREE.CylinderGeometry(0.015, 0.015, cw1Length, 16);
  cw1MidRailGeo.rotateZ(Math.PI / 2);

  [cw1CenterZ + 0.5, cw1CenterZ - 0.5].forEach(rz => {
    const topRail = new THREE.Mesh(cw1TopRailGeo, cwRailMat);
    topRail.position.set(cw1CenterX, cw1RailTopY - 0.025, rz);
    topRail.castShadow = true;
    cw1Group.add(topRail);

    const midRail = new THREE.Mesh(cw1MidRailGeo, cwRailMat);
    midRail.position.set(cw1CenterX, cw1WalkY + 0.50, rz);
    cw1Group.add(midRail);

    const kickPlateGeo = new THREE.BoxGeometry(cw1Length, 0.15, 0.012);
    const kickPlate = new THREE.Mesh(kickPlateGeo, cwBeamMat);
    kickPlate.position.set(cw1CenterX, cw1WalkY + 0.075, rz);
    cw1Group.add(kickPlate);

    for (let i = -cw1Length / 2 + 0.5; i <= cw1Length / 2 - 0.5; i += 1.5) {
      const post = new THREE.Mesh(cw1PostGeo, cwRailMat);
      post.position.set(cw1CenterX + i, cw1WalkY + cw1PostH / 2, rz);
      post.castShadow = true;
      cw1Group.add(post);
    }
  });

  // Taşıyıcı Konsol Traversler ve Çatı Askı Rotları
  const crossbeamGeo = new THREE.BoxGeometry(0.14, 0.14, 1.30);
  const rodGeo = new THREE.CylinderGeometry(0.014, 0.014, 2.50, 16);
  for (let x = -cw1Length / 2 + 1.5; x <= cw1Length / 2 - 1.5; x += 3.5) {
    const cBeam = new THREE.Mesh(crossbeamGeo, crossbeamMat);
    cBeam.position.set(cw1CenterX + x, cw1WalkY - 0.12, cw1CenterZ);
    cBeam.castShadow = true;
    cw1Group.add(cBeam);

    [-0.55, 0.55].forEach(rz => {
      const rod = new THREE.Mesh(rodGeo, rodMat);
      rod.position.set(cw1CenterX + x, cw1WalkY + 1.15, cw1CenterZ + rz);
      rod.castShadow = true;
      cw1Group.add(rod);
    });
  }

  // Makas Geçiş Yan Destek Braketleri
  const passBracketGeo = new THREE.BoxGeometry(0.12, 0.26, 0.16);
  [-0.45, 0.45].forEach(bx => {
    [-0.50, 0.50].forEach(bz => {
      const pBracket = new THREE.Mesh(passBracketGeo, steelFlangeMat);
      pBracket.position.set(cw1CenterX + bx, cw1WalkY - 0.155, cw1CenterZ + bz);
      pBracket.castShadow = true;
      cw1Group.add(pBracket);
    });
  });

  trussGroup.add(cw1Group);

  // -------------------------------------------------------------
  // 5. 2. KEDİ YOLU (1. KEDİ YOLUNDAN 16 METRE SONRA = 39. METRE)
  // Kullanıcı İsteği: "ilk kedi yolundan sonra 16 metre sonra 2. kedi yolunu koy."
  // Kullanıcı Revizyonu: "beton kaideye uzak olan keid yolunun konumu dogru ama yüksekligi hatalı alan-2 den referans alarak bu kedi yolunu da uygun yükseklige ve getir."
  // Alan-2 Referansı:
  // - Yürüme sacı üst kotu: cwWalkY = 5.75m (Kot 45.75m)
  // - Korkuluk üst kotu: cwRailTopY = 6.75m (Kot 46.75m, tam 1.00m korkuluk payı)
  // - Taşıyıcı silindir eksen kotu: Y = 5.75 - 0.4535 = 5.2965m (Kot 45.30m, Alan 1 standardı)
  // - Silindir derinlik aksı: Z = cw2CenterZ - 1.1855m = 36.116m
  // -------------------------------------------------------------
  const cw2Group = new THREE.Group();
  cw2Group.name = 'alan3KediYolu2_39m';

  const cw2StationZ = 39.0;
  const cw2CenterZ = -1.35 + cw2StationZ * Math.cos(slopeAngleRad); // ~37.302m
  const cw2CenterX = -3.00;
  const cw2Length = 20.0;
  const cw2Width = 1.0;
  const cw2WalkY = 5.75; // Alan-2 referans yürüme kotu (Kot 45.75m)
  const cw2RailTopY = cw2WalkY + 1.00; // 6.75m
  const cw2CylCenterY = cw2WalkY - 0.4535; // 5.2965m
  const cw2CylCenterZ = cw2CenterZ - 1.1855; // 36.116m

  // A) Kedi Yolu Taban Sacı (100cm Genişlik, Izgara Stil, Yürüme Kotu = 5.75m)
  const cw2FloorGeo = new THREE.BoxGeometry(cw2Length, 0.05, cw2Width);
  const cw2Floor = new THREE.Mesh(cw2FloorGeo, cwFloorMat);
  cw2Floor.position.set(cw2CenterX, cw2WalkY - 0.025, cw2CenterZ);
  cw2Floor.receiveShadow = true;
  cw2Group.add(cw2Floor);

  // B) Kenar Boyuna Taşıyıcı Profiller (Z = cw2CenterZ +/- 0.5m)
  [-0.5, 0.5].forEach(bz => {
    const beam = new THREE.Mesh(cw1BeamGeo, cwBeamMat);
    beam.position.set(cw2CenterX, cw2WalkY - 0.025, cw2CenterZ + bz);
    cw2Group.add(beam);
  });

  // C) Sarı Çelik Korkuluklar (Alan 1 / Alan 2 Birebir - 1 Metre Yükseklik, Üst Kot = 6.75m)
  [cw2CenterZ + 0.5, cw2CenterZ - 0.5].forEach(rz => {
    const topRail = new THREE.Mesh(cw1TopRailGeo, cwRailMat);
    topRail.position.set(cw2CenterX, cw2RailTopY - 0.025, rz);
    topRail.castShadow = true;
    cw2Group.add(topRail);

    const midRail = new THREE.Mesh(cw1MidRailGeo, cwRailMat);
    midRail.position.set(cw2CenterX, cw2WalkY + 0.50, rz);
    cw2Group.add(midRail);

    const kickPlate = new THREE.Mesh(new THREE.BoxGeometry(cw2Length, 0.15, 0.012), cwBeamMat);
    kickPlate.position.set(cw2CenterX, cw2WalkY + 0.075, rz);
    cw2Group.add(kickPlate);

    for (let i = -cw2Length / 2 + 0.5; i <= cw2Length / 2 - 0.5; i += 1.5) {
      const post = new THREE.Mesh(cw1PostGeo, cwRailMat);
      post.position.set(cw2CenterX + i, cw2WalkY + cw1PostH / 2, rz);
      post.castShadow = true;
      cw2Group.add(post);
    }
  });

  // D) Alan-1 / Alan-2 Taşıyıcı Silindiri (Ø45.7cm Galvanizli Çelik Boru, Z = 36.11m, Y = 5.30m)
  const cwCylinderRadius = 0.2285;
  const cwCylinderGeo = new THREE.CylinderGeometry(cwCylinderRadius, cwCylinderRadius, cw2Length, 32);
  cwCylinderGeo.rotateZ(Math.PI / 2);
  const cwCylinderMat = new THREE.MeshStandardMaterial({ 
    color: 0x7f8c8d, 
    roughness: 0.6, 
    metalness: 0.7 
  });
  const cw2Cylinder = new THREE.Mesh(cwCylinderGeo, cwCylinderMat);
  cw2Cylinder.position.set(cw2CenterX, cw2CylCenterY, cw2CylCenterZ);
  cw2Cylinder.castShadow = true;
  cw2Cylinder.receiveShadow = true;
  cw2Group.add(cw2Cylinder);

  // Uç kapakları
  const cwCapGeo = new THREE.CylinderGeometry(cwCylinderRadius + 0.02, cwCylinderRadius + 0.02, 0.04, 32);
  cwCapGeo.rotateZ(Math.PI / 2);
  const cw2Cap1 = new THREE.Mesh(cwCapGeo, steelFlangeMat);
  cw2Cap1.position.set(cw2CenterX - cw2Length / 2, cw2CylCenterY, cw2CylCenterZ);
  cw2Group.add(cw2Cap1);
  const cw2Cap2 = new THREE.Mesh(cwCapGeo, steelFlangeMat);
  cw2Cap2.position.set(cw2CenterX + cw2Length / 2, cw2CylCenterY, cw2CylCenterZ);
  cw2Group.add(cw2Cap2);

  // E) Taşıyıcı Silindir ile Kedi Yolu Arasındaki Konsol Traversler (Alan 1 / Alan 2 Bağlantı Kolları)
  const cwBracketGeo = new THREE.BoxGeometry(0.20, 0.20, 0.6855);
  const cwBracketMat = new THREE.MeshStandardMaterial({ color: 0x34495e, metalness: 0.8 });
  const cw2BracketZ = cw2CylCenterZ + 0.34275;
  for (let i = -8; i <= 8; i += 4) {
    const bracket = new THREE.Mesh(cwBracketGeo, cwBracketMat);
    bracket.position.set(cw2CenterX + i, cw2WalkY - 0.125, cw2BracketZ);
    bracket.castShadow = true;
    cw2Group.add(bracket);
  }

  // F) Çatı Makasına Bağlanan 45° Çapraz Taşıyıcı Kol / Pimli Dikme (Alan 2 Birebir)
  const diagArmAngle = Math.PI / 4;
  const strutDir = new THREE.Vector3(0, Math.sin(diagArmAngle), -Math.cos(diagArmAngle)).normalize();
  const botPinPos = new THREE.Vector3(cw2CenterX, cw2CylCenterY, cw2CylCenterZ).addScaledVector(strutDir, 0.325);

  const sIntersect = (botPinPos.z + 1.35 + botPinPos.y - 4.10) / (Math.sin(slopeAngleRad) + Math.cos(slopeAngleRad));
  const carrierMeetCenter = new THREE.Vector3(
    cw2CenterX,
    4.10 + sIntersect * Math.sin(slopeAngleRad),
    -1.35 + sIntersect * Math.cos(slopeAngleRad)
  );
  const topPinPos = carrierMeetCenter.clone().sub(strutDir.clone().multiplyScalar(0.22));
  const diagArmLen = botPinPos.distanceTo(topPinPos);

  // Alt Bilezik
  const collarGroup = new THREE.Group();
  collarGroup.position.set(cw2CenterX, cw2CylCenterY, cw2CylCenterZ);
  const collarGeo = new THREE.CylinderGeometry(cwCylinderRadius + 0.015, cwCylinderRadius + 0.015, 0.48, 32);
  collarGeo.rotateZ(Math.PI / 2);
  const collarMesh = new THREE.Mesh(collarGeo, steelFlangeMat);
  collarMesh.castShadow = true;
  collarGroup.add(collarMesh);
  cw2Group.add(collarGroup);

  // Mafsallı Dikme Gövdesi
  const strutAssembly = new THREE.Group();
  strutAssembly.position.copy(botPinPos);
  strutAssembly.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), strutDir);

  const armPipeRadius = 0.09;
  const armPipeGeo = new THREE.CylinderGeometry(armPipeRadius, armPipeRadius, diagArmLen - 0.36, 24);
  const armPipe = new THREE.Mesh(armPipeGeo, pipeWhiteMat);
  armPipe.position.set(0, diagArmLen / 2, 0);
  armPipe.castShadow = true;
  strutAssembly.add(armPipe);

  // Üst ve Alt Konik Boyunlar
  const neckGeo = new THREE.ConeGeometry(armPipeRadius * 1.15, 0.18, 24);
  const neckBot = new THREE.Mesh(neckGeo, pipeWhiteMat);
  neckBot.rotation.x = Math.PI;
  neckBot.position.set(0, 0.18, 0);
  strutAssembly.add(neckBot);

  const neckTop = new THREE.Mesh(neckGeo, pipeWhiteMat);
  neckTop.position.set(0, diagArmLen - 0.18, 0);
  strutAssembly.add(neckTop);

  cw2Group.add(strutAssembly);

  // Üst Çatı Taşıyıcı Kelepçesi
  const carrierCollarGroup = new THREE.Group();
  carrierCollarGroup.position.copy(carrierMeetCenter);
  carrierCollarGroup.rotation.x = -slopeAngleRad;
  const carrierCollarGeo = new THREE.CylinderGeometry(0.14 + 0.015, 0.14 + 0.015, 0.44, 32);
  carrierCollarGeo.rotateX(Math.PI / 2);
  const carrierCollar = new THREE.Mesh(carrierCollarGeo, steelFlangeMat);
  carrierCollar.castShadow = true;
  carrierCollarGroup.add(carrierCollar);
  cw2Group.add(carrierCollarGroup);

  // G) Kedi Yolu Altı Taşıyıcı Traversler ve Çatı Askı Rotları
  const crossbeam2Geo = new THREE.BoxGeometry(0.14, 0.14, 1.30);
  const rod2H = Math.abs(carrierMeetCenter.y - (cw2WalkY - 0.12));
  const rod2Geo = new THREE.CylinderGeometry(0.014, 0.014, rod2H, 16);
  for (let x = -cw2Length / 2 + 1.5; x <= cw2Length / 2 - 1.5; x += 3.5) {
    const cBeam = new THREE.Mesh(crossbeam2Geo, crossbeamMat);
    cBeam.position.set(cw2CenterX + x, cw2WalkY - 0.12, cw2CenterZ);
    cBeam.castShadow = true;
    cw2Group.add(cBeam);

    [-0.55, 0.55].forEach(rz => {
      const rod = new THREE.Mesh(rod2Geo, rodMat);
      rod.position.set(cw2CenterX + x, cw2WalkY - 0.12 + rod2H / 2, cw2CenterZ + rz);
      rod.castShadow = true;
      cw2Group.add(rod);
    });
  }

  trussGroup.add(cw2Group);

  alan3Group.add(trussGroup);
}

// =========================================================================
// ALAN 3 STRÜKTÜRÜ (25m Kaide, 2.50m Korumalı Alan, 110cm Kayar Kapılar, 15cm Sabitler)
// =========================================================================
function createAlan3Structure() {
  const alan3Group = new THREE.Group();
  alan3Group.name = 'alan3Structure';
  alan3Group.visible = false;
  alan3SlidingDoors.length = 0; 

  const floorWidth = 2.0; 
  const floorLength = 25.0; // 25 mt toplam beton kaide boyu (Kullanıcı İsteği)
  const floorThickness = 0.4; 

  const concreteMat = new THREE.MeshStandardMaterial({ 
    color: 0x6e7072, 
    roughness: 0.9,
    metalness: 0.1
  });

  const floorGeo = new THREE.BoxGeometry(floorLength, floorThickness, floorWidth);
  const floor = new THREE.Mesh(floorGeo, concreteMat);
  floor.position.set(0, -floorThickness / 2, -floorWidth / 2);
  floor.receiveShadow = true;
  alan3Group.add(floor);

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x99ccff,
    transparent: true,
    opacity: 0.45,
    roughness: 0.1,
    metalness: 0.6,
    side: THREE.DoubleSide
  });

  const postMat = new THREE.MeshStandardMaterial({
    color: 0x444444,
    roughness: 0.6,
    metalness: 0.8
  });

  const postWidth = 0.05;
  const postDepth = 0.08;
  const glassThickness = 0.02;

  // -------------------------------------------------------------
  // 2.50 Metrelik Özel Korumalı Alan (170 cm Yükseklik)
  // Kullanıcı İsteği:
  // - "1,5 metrelik kapakları 110cmye düşürelim ayrıca 1 metrelik sabit alanlar 15 cm gibi bişey yapalım toplam alan alanımız 25 mt olsun"
  // Toplam net modül: 2.50 m (X = [-4.30, -1.80], Merkez: X = -3.05m)
  // -------------------------------------------------------------
  const encMinX = -2.75;
  const encMaxX = -0.25;
  const encFrontZ = -0.05;
  const encBackZ = -1.95;
  const encGlassH = 1.70;
  const encPostH = 1.75;
  const fixedWidth = 0.15; // 15 cm sabit perfore yan alanlar
  const doorWidth = 1.10;  // 110 cm kayar kapılar

  const perforatedTex = createPerforatedMetalTexture();
  const createPerforatedMat = (wMeters, hMeters) => {
    const tex = perforatedTex.clone();
    tex.needsUpdate = true;
    const repX = Math.max(1, Math.round(wMeters * 4));
    const repY = Math.max(1, Math.round(hMeters * 4));
    tex.repeat.set(repX, repY);
    return new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.25,
      metalness: 0.85,
      roughness: 0.35,
      color: 0x94a3b8,
      side: THREE.DoubleSide
    });
  };

  const stdGlassH = 1.10;
  const stdPostH = 1.20;

  // A) Sol Dış Bölüm: X = -12.5'ten X = -4.30'a (1.1m standart cam)
  const leftRailLen = Math.abs(encMinX - (-floorLength / 2)); // 8.20m
  const leftNumPosts = Math.max(2, Math.round(leftRailLen / 1.5) + 1);
  const leftSpacing = leftRailLen / (leftNumPosts - 1);
  for (let i = 0; i < leftNumPosts - 1; i++) {
    const xPos = -floorLength / 2 + i * leftSpacing;
    const postGeo = new THREE.BoxGeometry(postWidth, stdPostH, postDepth);
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(xPos, stdPostH / 2, encFrontZ);
    post.castShadow = true;
    alan3Group.add(post);

    const panelW = leftSpacing - postWidth;
    const glassGeo = new THREE.BoxGeometry(panelW, stdGlassH, glassThickness);
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.set(xPos + leftSpacing / 2, stdGlassH / 2 + 0.05, encFrontZ);
    alan3Group.add(glass);
  }

  // B) Sağ Dış Bölüm: X = -1.80'den X = +12.5'e (1.1m standart cam)
  const rightRailLen = Math.abs(floorLength / 2 - encMaxX); // 14.30m
  const rightNumPosts = Math.max(2, Math.round(rightRailLen / 1.5) + 1);
  const rightSpacing = rightRailLen / (rightNumPosts - 1);
  for (let i = 0; i < rightNumPosts; i++) {
    const xPos = encMaxX + i * rightSpacing;
    if (i > 0) {
      const postGeo = new THREE.BoxGeometry(postWidth, stdPostH, postDepth);
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(xPos, stdPostH / 2, encFrontZ);
      post.castShadow = true;
      alan3Group.add(post);
    }
    if (i < rightNumPosts - 1) {
      const panelW = rightSpacing - postWidth;
      const glassGeo = new THREE.BoxGeometry(panelW, stdGlassH, glassThickness);
      const glass = new THREE.Mesh(glassGeo, glassMat);
      glass.position.set(xPos + rightSpacing / 2, stdGlassH / 2 + 0.05, encFrontZ);
      alan3Group.add(glass);
    }
  }

  // C) 2.50m Korumalı Alan Ön Cephesi: Çift Ray, 15cm Sabitler ve 2x 110cm Kayar Kapı
  const doorTrackMat = new THREE.MeshStandardMaterial({
    color: 0x828b96,
    metalness: 0.85,
    roughness: 0.25
  });

  const doorFrameMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    metalness: 0.8,
    roughness: 0.3
  });

  const doorHandleMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.9,
    roughness: 0.15
  });

  const encWidth = encMaxX - encMinX; // 2.50m
  const encCenterX = (encMinX + encMaxX) / 2; // -3.05m

  const topTrackGeo = new THREE.BoxGeometry(encWidth, 0.06, 0.10);
  const topTrack = new THREE.Mesh(topTrackGeo, doorTrackMat);
  topTrack.position.set(encCenterX, encGlassH + 0.03, encFrontZ);
  topTrack.castShadow = true;
  alan3Group.add(topTrack);

  const floorTrackGeo = new THREE.BoxGeometry(encWidth, 0.015, 0.08);
  const floorTrack = new THREE.Mesh(floorTrackGeo, doorTrackMat);
  floorTrack.position.set(encCenterX, 0.0075, encFrontZ);
  floorTrack.receiveShadow = true;
  alan3Group.add(floorTrack);

  // 15cm Sabit Paneller
  const fixedPostGeo = new THREE.BoxGeometry(postWidth, encPostH, postDepth);
  const fixedPanelW = Math.max(0.04, fixedWidth - postWidth);
  const fixedPerforatedMat = createPerforatedMat(fixedPanelW, encGlassH);
  const fixedPanelGeo = new THREE.PlaneGeometry(fixedPanelW, encGlassH);
  const fixedRailGeo = new THREE.BoxGeometry(fixedPanelW, 0.04, 0.03);

  // Sol Sabit Panel: X = [-4.30, -4.15]
  const fixedLeftPost1 = new THREE.Mesh(fixedPostGeo, postMat);
  fixedLeftPost1.position.set(encMinX, encPostH / 2, encFrontZ);
  alan3Group.add(fixedLeftPost1);

  const fixedLeftPost2 = new THREE.Mesh(fixedPostGeo, postMat);
  fixedLeftPost2.position.set(encMinX + fixedWidth, encPostH / 2, encFrontZ);
  alan3Group.add(fixedLeftPost2);

  const fixedLeftCenterX = encMinX + fixedWidth / 2;
  const fixedLeftPanel = new THREE.Mesh(fixedPanelGeo, fixedPerforatedMat);
  fixedLeftPanel.position.set(fixedLeftCenterX, encGlassH / 2 + 0.02, encFrontZ);
  alan3Group.add(fixedLeftPanel);

  [encGlassH + 0.02 - 0.02, encGlassH / 2 + 0.02, 0.02 + 0.02].forEach(yPos => {
    const rail = new THREE.Mesh(fixedRailGeo, doorFrameMat);
    rail.position.set(fixedLeftCenterX, yPos, encFrontZ);
    alan3Group.add(rail);
  });

  // Sağ Sabit Panel: X = [-1.95, -1.80]
  const fixedRightPost1 = new THREE.Mesh(fixedPostGeo, postMat);
  fixedRightPost1.position.set(encMaxX - fixedWidth, encPostH / 2, encFrontZ);
  alan3Group.add(fixedRightPost1);

  const fixedRightPost2 = new THREE.Mesh(fixedPostGeo, postMat);
  fixedRightPost2.position.set(encMaxX, encPostH / 2, encFrontZ);
  alan3Group.add(fixedRightPost2);

  const fixedRightCenterX = encMaxX - fixedWidth / 2;
  const fixedRightPanel = new THREE.Mesh(fixedPanelGeo, fixedPerforatedMat);
  fixedRightPanel.position.set(fixedRightCenterX, encGlassH / 2 + 0.02, encFrontZ);
  alan3Group.add(fixedRightPanel);

  [encGlassH + 0.02 - 0.02, encGlassH / 2 + 0.02, 0.02 + 0.02].forEach(yPos => {
    const rail = new THREE.Mesh(fixedRailGeo, doorFrameMat);
    rail.position.set(fixedRightCenterX, yPos, encFrontZ);
    alan3Group.add(rail);
  });

  // 2 Adet 110cm Kademeli Kayar Kapı (X = [-4.15, -1.95] net 2.20m)
  const doorHeight = encGlassH - 0.06;
  const doorPanelW = doorWidth - 0.06;
  const doorPanelH = doorHeight - 0.06;
  const doorPerforatedMat = createPerforatedMat(doorPanelW, doorPanelH);
  const doorPanelGeo = new THREE.PlaneGeometry(doorPanelW, doorPanelH);

  const door0ClosedX = -2.05; // 7'li RRU önü
  const door1ClosedX = -0.95; // 2'li POI önü

  const doorConfigs = [
    { doorIndex: 0, closedX: door0ClosedX, openX: door1ClosedX, trackZ: -0.03, isLeft: true },
    { doorIndex: 1, closedX: door1ClosedX, openX: door0ClosedX, trackZ: -0.07, isLeft: false }
  ];

  doorConfigs.forEach(cfg => {
    const doorGroup = new THREE.Group();
    doorGroup.position.set(cfg.closedX, 0, cfg.trackZ);

    const doorPanel = new THREE.Mesh(doorPanelGeo, doorPerforatedMat);
    doorPanel.position.set(0, 0.03 + doorHeight / 2, 0);
    doorGroup.add(doorPanel);

    const horizFrameGeo = new THREE.BoxGeometry(doorWidth, 0.04, 0.025);
    const topFrame = new THREE.Mesh(horizFrameGeo, doorFrameMat);
    topFrame.position.set(0, 0.03 + doorHeight - 0.02, 0);
    doorGroup.add(topFrame);

    const botFrame = new THREE.Mesh(horizFrameGeo, doorFrameMat);
    botFrame.position.set(0, 0.03 + 0.02, 0);
    doorGroup.add(botFrame);

    const midFrame = new THREE.Mesh(horizFrameGeo, doorFrameMat);
    midFrame.position.set(0, 0.03 + doorHeight / 2, 0);
    doorGroup.add(midFrame);

    const vertFrameGeo = new THREE.BoxGeometry(0.04, doorHeight, 0.025);
    const leftFrame = new THREE.Mesh(vertFrameGeo, doorFrameMat);
    leftFrame.position.set(-doorWidth / 2 + 0.02, 0.03 + doorHeight / 2, 0);
    doorGroup.add(leftFrame);

    const rightFrame = new THREE.Mesh(vertFrameGeo, doorFrameMat);
    rightFrame.position.set(doorWidth / 2 - 0.02, 0.03 + doorHeight / 2, 0);
    doorGroup.add(rightFrame);

    const hangerGeo = new THREE.BoxGeometry(0.08, 0.05, 0.035);
    const hanger1 = new THREE.Mesh(hangerGeo, doorTrackMat);
    hanger1.position.set(-doorWidth / 3, 0.03 + doorHeight + 0.015, 0);
    doorGroup.add(hanger1);

    const hanger2 = new THREE.Mesh(hangerGeo, doorTrackMat);
    hanger2.position.set(doorWidth / 3, 0.03 + doorHeight + 0.015, 0);
    doorGroup.add(hanger2);

    const handleGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.60, 16);
    const handle = new THREE.Mesh(handleGeo, doorHandleMat);
    const handleX = cfg.isLeft ? (doorWidth / 2 - 0.10) : (-doorWidth / 2 + 0.10);
    handle.position.set(handleX, 0.90, 0.025);
    doorGroup.add(handle);

    const handleMountGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.035, 12);
    handleMountGeo.rotateX(Math.PI / 2);
    const hMount1 = new THREE.Mesh(handleMountGeo, doorHandleMat);
    hMount1.position.set(handleX, 0.90 + 0.25, 0.012);
    doorGroup.add(hMount1);
    const hMount2 = new THREE.Mesh(handleMountGeo, doorHandleMat);
    hMount2.position.set(handleX, 0.90 - 0.25, 0.012);
    doorGroup.add(hMount2);

    doorGroup.userData.isSlidingDoor = true;
    doorGroup.userData.doorIndex = cfg.doorIndex;
    doorGroup.userData.closedX = cfg.closedX;
    doorGroup.userData.openX = cfg.openX;
    doorGroup.userData.targetX = cfg.closedX;
    doorGroup.userData.isOpen = false;

    alan3Group.add(doorGroup);
    alan3SlidingDoors.push(doorGroup);
  });

  // D) 170cm Yan ve Arka Cam Cepheler
  const sideDepth = Math.abs(encBackZ - encFrontZ); // 1.90m
  const sideMidZ = (encFrontZ + encBackZ) / 2;
  const sidePostGeo = new THREE.BoxGeometry(postDepth, encPostH, postWidth);

  // Sol Yan Cam (X = -4.30)
  const leftMidPost = new THREE.Mesh(sidePostGeo, postMat);
  leftMidPost.position.set(encMinX, encPostH / 2, sideMidZ);
  alan3Group.add(leftMidPost);

  const leftBackPost = new THREE.Mesh(sidePostGeo, postMat);
  leftBackPost.position.set(encMinX, encPostH / 2, encBackZ);
  alan3Group.add(leftBackPost);

  const sidePanelDepth = (sideDepth / 2) - postWidth;
  const leftGlass1 = new THREE.Mesh(new THREE.BoxGeometry(glassThickness, encGlassH, sidePanelDepth), glassMat);
  leftGlass1.position.set(encMinX, encGlassH / 2 + 0.02, encFrontZ - sideDepth / 4);
  alan3Group.add(leftGlass1);
  const leftGlass2 = new THREE.Mesh(new THREE.BoxGeometry(glassThickness, encGlassH, sidePanelDepth), glassMat);
  leftGlass2.position.set(encMinX, encGlassH / 2 + 0.02, encBackZ + sideDepth / 4);
  alan3Group.add(leftGlass2);

  // Sağ Yan Cam (X = -1.80)
  const rightMidPost = new THREE.Mesh(sidePostGeo, postMat);
  rightMidPost.position.set(encMaxX, encPostH / 2, sideMidZ);
  alan3Group.add(rightMidPost);

  const rightBackPost = new THREE.Mesh(sidePostGeo, postMat);
  rightBackPost.position.set(encMaxX, encPostH / 2, encBackZ);
  alan3Group.add(rightBackPost);

  const rightGlass1 = new THREE.Mesh(new THREE.BoxGeometry(glassThickness, encGlassH, sidePanelDepth), glassMat);
  rightGlass1.position.set(encMaxX, encGlassH / 2 + 0.02, encFrontZ - sideDepth / 4);
  alan3Group.add(rightGlass1);
  const rightGlass2 = new THREE.Mesh(new THREE.BoxGeometry(glassThickness, encGlassH, sidePanelDepth), glassMat);
  rightGlass2.position.set(encMaxX, encGlassH / 2 + 0.02, encBackZ + sideDepth / 4);
  alan3Group.add(rightGlass2);

  // Arka Cam Cephe (Z = -1.95, X = [-4.30, -1.80], 2.50m)
  const backCenterPost = new THREE.Mesh(new THREE.BoxGeometry(postWidth, encPostH, postDepth), postMat);
  backCenterPost.position.set(encCenterX, encPostH / 2, encBackZ);
  alan3Group.add(backCenterPost);

  const backPanelW = (encWidth / 2) - postWidth;
  const backGlass1 = new THREE.Mesh(new THREE.BoxGeometry(backPanelW, encGlassH, glassThickness), glassMat);
  backGlass1.position.set(encMinX + encWidth / 4, encGlassH / 2 + 0.02, encBackZ);
  alan3Group.add(backGlass1);

  const backGlass2 = new THREE.Mesh(new THREE.BoxGeometry(backPanelW, encGlassH, glassThickness), glassMat);
  backGlass2.position.set(encMaxX - encWidth / 4, encGlassH / 2 + 0.02, encBackZ);
  alan3Group.add(backGlass2);

  // -------------------------------------------------------------
  // 4. DİKEY TAŞIYICI ÇELİK SİLİNDİR DİREKLER (6 Metrede Bir)
  // Konum: Z = -1.35 m, X = [-12, -6, 0, 6, 12]
  // -------------------------------------------------------------
  const colDiameter = 0.40;
  const colRadius = colDiameter / 2;
  const colZ = -1.35;
  const colHeight = 5.0;

  const colMat = new THREE.MeshStandardMaterial({
    color: 0xebedf0,
    roughness: 0.4,
    metalness: 0.35
  });

  const steelPlateMat = new THREE.MeshStandardMaterial({
    color: 0xc8ccd0,
    roughness: 0.35,
    metalness: 0.75
  });

  const basePedestalMat = new THREE.MeshStandardMaterial({
    color: 0x585a5d,
    roughness: 0.95,
    metalness: 0.05
  });

  const boltMat = new THREE.MeshStandardMaterial({
    color: 0x222426,
    roughness: 0.4,
    metalness: 0.8
  });

  const colXPositions = [-12, -6, 0, 6, 12];
  colXPositions.forEach((xPos) => {
    const colGroup = new THREE.Group();
    colGroup.position.set(xPos, 0, colZ);

    const pedGeo = new THREE.BoxGeometry(0.70, 0.10, 0.70);
    const pedestal = new THREE.Mesh(pedGeo, basePedestalMat);
    pedestal.position.set(0, 0.05, 0);
    pedestal.receiveShadow = true;
    pedestal.castShadow = true;
    colGroup.add(pedestal);

    const plateGeo = new THREE.BoxGeometry(0.60, 0.035, 0.60);
    const basePlate = new THREE.Mesh(plateGeo, steelPlateMat);
    basePlate.position.set(0, 0.10 + 0.035 / 2, 0);
    basePlate.castShadow = true;
    basePlate.receiveShadow = true;
    colGroup.add(basePlate);

    const boltGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.045, 8);
    const boltOffset = 0.24;
    [
      [-boltOffset, -boltOffset],
      [boltOffset, -boltOffset],
      [-boltOffset, boltOffset],
      [boltOffset, boltOffset]
    ].forEach(([bx, bz]) => {
      const bolt = new THREE.Mesh(boltGeo, boltMat);
      bolt.position.set(bx, 0.10 + 0.035 + 0.02, bz);
      colGroup.add(bolt);
    });

    const flangeGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.03, 32);
    const baseFlange = new THREE.Mesh(flangeGeo, steelPlateMat);
    baseFlange.position.set(0, 0.135 + 0.015, 0);
    baseFlange.castShadow = true;
    colGroup.add(baseFlange);

    const flBoltGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.025, 6);
    for (let b = 0; b < 8; b++) {
      const angle = (b / 8) * Math.PI * 2;
      const flBolt = new THREE.Mesh(flBoltGeo, boltMat);
      flBolt.position.set(Math.cos(angle) * 0.24, 0.15 + 0.0125, Math.sin(angle) * 0.24);
      colGroup.add(flBolt);
    }

    const pipeHeight = colHeight - 0.15;
    const pipeGeo = new THREE.CylinderGeometry(colRadius, colRadius, pipeHeight, 36);
    const pipe = new THREE.Mesh(pipeGeo, colMat);
    pipe.position.set(0, 0.15 + pipeHeight / 2, 0);
    pipe.castShadow = true;
    pipe.receiveShadow = true;
    colGroup.add(pipe);

    alan3Group.add(colGroup);
  });

  // -------------------------------------------------------------
  // 5. 4. METREDEKİ YATAY SİLİNDİR KİRİŞ
  // Kullanıcı İsteği: "yine yatayda da 4. metresinde biribrine bagla"
  // -------------------------------------------------------------
  const horizPipeGroup = new THREE.Group();
  horizPipeGroup.name = 'alan3YataySilindirKiris';
  const horizPipeRadius = 0.11; // Ø22 cm
  const horizPipeLen = 24.0;

  const horizPipeGeo = new THREE.CylinderGeometry(horizPipeRadius, horizPipeRadius, horizPipeLen, 32);
  horizPipeGeo.rotateZ(Math.PI / 2);
  const horizPipe = new THREE.Mesh(horizPipeGeo, colMat);
  horizPipe.position.set(0, 4.0, colZ);
  horizPipe.castShadow = true;
  horizPipe.receiveShadow = true;
  horizPipeGroup.add(horizPipe);

  const collarGeo = new THREE.CylinderGeometry(colRadius + 0.008, colRadius + 0.008, horizPipeRadius * 2 + 0.06, 32);
  const ringFlangeGeo = new THREE.CylinderGeometry(horizPipeRadius + 0.02, horizPipeRadius + 0.02, 0.025, 24);
  ringFlangeGeo.rotateZ(Math.PI / 2);

  colXPositions.forEach((cx) => {
    const collar = new THREE.Mesh(collarGeo, steelPlateMat);
    collar.position.set(cx, 4.0, colZ);
    collar.castShadow = true;
    horizPipeGroup.add(collar);

    if (cx > -12) {
      const ringL = new THREE.Mesh(ringFlangeGeo, steelPlateMat);
      ringL.position.set(cx - (colRadius + 0.015), 4.0, colZ);
      horizPipeGroup.add(ringL);
    }
    if (cx < 12) {
      const ringR = new THREE.Mesh(ringFlangeGeo, steelPlateMat);
      ringR.position.set(cx + (colRadius + 0.015), 4.0, colZ);
      horizPipeGroup.add(ringR);
    }
  });

  alan3Group.add(horizPipeGroup);

  // -------------------------------------------------------------
  // 6. DİKEY KABLO MERDİVENİ VE YATAY GEÇİŞ KÖPRÜ TAVASI
  // Kullanıcı İsteği: "Alan-4 de de kablo merdivenini taşıyıcı sutunun arkasına al ."
  // - Taşıyıcı Sütun: X = 0.00m aksındaki dikey silindir kolon (Ø400mm)
  // - Arka Cephe Montajı: Z = colZ - colRadius - vLadderD / 2 = -1.585m (Yürüme alanının arkasında)
  // - Yatay Köprü Tavası: Y = 4.03m kotunda, X = -3.00m uzay çatı makasından X = 0.00m sütun arkasına 3m hat
  // - Alt Bağlantı Tavası: Y = 0.22m kotunda, X = -3.80m POI çıkışından X = 0.00m merdiven tabanına hat
  // -------------------------------------------------------------
  const ladderGroup = new THREE.Group();
  ladderGroup.name = 'dikeyKabloMerdiveniAlan3';

  const vLadderW = 0.40; // 400mm genişlik
  const vLadderH = 4.00; // 4 metre yükseklik
  const vLadderD = 0.07; // 70mm derinlik
  const vRailW = 0.035;

  const poleColX = 0.00; // X=0 taşıyıcı sütun
  const ladderCenterZ = colZ - colRadius - vLadderD / 2; // -1.585m (sütun arka yüzeyi)

  ladderGroup.position.set(poleColX, 0, ladderCenterZ);

  const ladderMat = new THREE.MeshStandardMaterial({ color: 0xa4b0be, metalness: 0.85, roughness: 0.3 });
  const ladderDarkMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.35 });

  // 1. Dikey Merdiven Rayları (Taşıyıcı Kolon Arka Yüzeyi)
  const vertRailGeo = new THREE.BoxGeometry(vRailW, vLadderH, vLadderD);
  const lRail = new THREE.Mesh(vertRailGeo, ladderMat);
  lRail.position.set(-vLadderW / 2 + vRailW / 2, vLadderH / 2, 0);
  lRail.castShadow = true;
  ladderGroup.add(lRail);

  const rRail = new THREE.Mesh(vertRailGeo, ladderMat);
  rRail.position.set(vLadderW / 2 - vRailW / 2, vLadderH / 2, 0);
  rRail.castShadow = true;
  ladderGroup.add(rRail);

  // Yan montaj delikleri / yarıkları (her 20 cm'de bir)
  const vSlotGeo = new THREE.BoxGeometry(vRailW + 0.002, 0.05, 0.015);
  for (let sy = 0.20; sy < vLadderH; sy += 0.20) {
    const sL = new THREE.Mesh(vSlotGeo, ladderDarkMat);
    sL.position.set(-vLadderW / 2 + vRailW / 2, sy, 0);
    ladderGroup.add(sL);
    const sR = new THREE.Mesh(vSlotGeo, ladderDarkMat);
    sR.position.set(vLadderW / 2 - vRailW / 2, sy, 0);
    ladderGroup.add(sR);
  }

  // Yatay Delikli C-profil basamaklar (her 25 cm'de bir)
  const rungW = vLadderW - 2 * vRailW;
  const rungGeo = new THREE.BoxGeometry(rungW, 0.025, 0.035);
  for (let ry = 0.25; ry < vLadderH; ry += 0.25) {
    const rung = new THREE.Mesh(rungGeo, ladderDarkMat);
    rung.position.set(0, ry, 0);
    ladderGroup.add(rung);
  }

  // 2. Taşıyıcı Sütuna Sabitleme Konsolları ve Kuşakları (Ø400mm Kolon Arkasına Montaj)
  const poleLocalZ = (colRadius + vLadderD / 2); // Merdivenden öne (+Z) kolona doğru mesafe (+0.235m)
  const standoffBracketGeo = new THREE.BoxGeometry(0.12, 0.04, poleLocalZ);
  const ringCollarGeo = new THREE.CylinderGeometry(colRadius + 0.012, colRadius + 0.012, 0.06, 32);

  [0.80, 2.00, 3.20, 3.90].forEach(cy => {
    // Merdivenden öne sütuna uzanan çelik sabitleme ayağı
    const bracket = new THREE.Mesh(standoffBracketGeo, ladderDarkMat);
    bracket.position.set(0, cy, poleLocalZ / 2);
    ladderGroup.add(bracket);

    // Ø400mm Kolonu saran bilezik kuşağı
    const collarMesh = new THREE.Mesh(ringCollarGeo, steelPlateMat);
    collarMesh.position.set(0, cy, poleLocalZ);
    ladderGroup.add(collarMesh);
  });

  // 3. Üst Kiriş Arkası Yatay Geçiş Tavası (X = -3.00m çatı makasından X = 0.00m sütun arkasına 3m hat)
  const bridgeTrayY = vLadderH + 0.03; // Y = 4.03m
  const bridgeSpanX = 3.00; // 3 metre hat
  const bridgeTrayGeo = new THREE.BoxGeometry(bridgeSpanX - 0.20, 0.006, vLadderW);
  const bridgeTray = new THREE.Mesh(bridgeTrayGeo, ladderMat);
  bridgeTray.position.set(-bridgeSpanX / 2 - 0.10, bridgeTrayY, 0);
  ladderGroup.add(bridgeTray);

  // Tava yan yanakları
  const bWallGeo = new THREE.BoxGeometry(bridgeSpanX - 0.20, 0.08, 0.005);
  [-vLadderW / 2, vLadderW / 2].forEach(wz => {
    const wall = new THREE.Mesh(bWallGeo, ladderDarkMat);
    wall.position.set(-bridgeSpanX / 2 - 0.10, bridgeTrayY + 0.04, wz);
    ladderGroup.add(wall);
  });

  // Sütun tepe viraj tavası (Kiriş arkasından merdiven dikmelerine 90° dönüş tavası)
  const turnTrayGeo = new THREE.BoxGeometry(vLadderW, 0.006, poleLocalZ);
  const turnTray = new THREE.Mesh(turnTrayGeo, ladderMat);
  turnTray.position.set(0, bridgeTrayY, poleLocalZ / 2);
  ladderGroup.add(turnTray);

  const turnWallGeo = new THREE.BoxGeometry(0.005, 0.08, poleLocalZ);
  const turnWall = new THREE.Mesh(turnWallGeo, ladderDarkMat);
  turnWall.position.set(-vLadderW / 2, bridgeTrayY + 0.04, poleLocalZ / 2);
  ladderGroup.add(turnWall);

  // Yatay boru kirişe tutturma konsol kolları
  const hPipeClampGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.05, 20);
  hPipeClampGeo.rotateZ(Math.PI / 2);
  const cantArmGeo = new THREE.BoxGeometry(0.06, 0.04, poleLocalZ);
  [-0.90, -1.80, -2.70].forEach(sx => {
    const pClamp = new THREE.Mesh(hPipeClampGeo, ladderDarkMat);
    pClamp.position.set(sx, 4.0, poleLocalZ);
    ladderGroup.add(pClamp);

    const cArm = new THREE.Mesh(cantArmGeo, ladderMat);
    cArm.position.set(sx, 4.0, poleLocalZ / 2);
    ladderGroup.add(cArm);
  });

  // 4. Alt Taban Kablo Tavası (POI arkasından X = 0.0m merdiven tabanına hat)
  const baseTrayLen = 2.80; // X = -2.80m'den X = 0.00m'ye (Kafes arkası)
  const baseTrayY = 0.22;
  const baseTrayGeo = new THREE.BoxGeometry(baseTrayLen, 0.006, vLadderW);
  const baseTray = new THREE.Mesh(baseTrayGeo, ladderMat);
  baseTray.position.set(-baseTrayLen / 2, baseTrayY, 0);
  ladderGroup.add(baseTray);

  [-vLadderW / 2, vLadderW / 2].forEach(wz => {
    const bWall = new THREE.Mesh(new THREE.BoxGeometry(baseTrayLen, 0.06, 0.005), ladderDarkMat);
    bWall.position.set(-baseTrayLen / 2, baseTrayY + 0.03, wz);
    ladderGroup.add(bWall);
  });

  alan3Group.add(ladderGroup);

  // -------------------------------------------------------------
  // 7. 45M ÇATI TAŞIYICISI, 50x15CM KABLO TAVASI (BATTI-ÇIKTI),
  // 1. KEDİ YOLU (23M) VE 2. KEDİ YOLU (39M)
  // -------------------------------------------------------------
  createAlan3RoofTrussAndCableTray(alan3Group);

  scene.add(alan3Group);
}

// =========================================================================
// 6. SCOREBOARD RRU'LARDAN POI RACK'LERE 1/2" FEEDER KABLOLAMA SİSTEMİ
// Kullanıcı İsteği:
// - Skorboard arkasında kalan RRU'lardan yakınındaki POI'ye 1/2" feeder çekimi:
//   * Turkcell RRU 1: 2 adet
//   * Turkcell RRU 2: 4 adet
//   * TT RRU 1: 2 adet
//   * TT RRU 2: 4 adet
//   * Vodafone RRU 1: 2 adet
//   * Vodafone RRU 2: 2 adet
//   * Vodafone RRU 3: 4 adet
// (Toplam: Sol Kanat 20 adet feeder, Sağ Kanat 20 adet feeder = 40 adet 1/2" feeder)
// =========================================================================
function buildScoreboardRRUToPoiFeederSystem() {
  const cableSystemGroup = new THREE.Group();
  cableSystemGroup.name = 'scoreboardFeederCablingSystem';

  // Kablo ve Donanım Malzemeleri
  const feederMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.55,
    metalness: 0.25
  });
  const tcellBandMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.3, metalness: 0.2 });
  const ttBandMat = new THREE.MeshStandardMaterial({ color: 0x0891b2, roughness: 0.3, metalness: 0.2 });
  const vdfBandMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3, metalness: 0.2 });
  const brassNutMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.35, metalness: 0.85 });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
  const galvTrayMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.35, metalness: 0.8 });
  const rungTrayMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4, metalness: 0.75 });
  const clampSteelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.85 });
  const bracketSteelMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45, metalness: 0.75 });

  // 20'LİK KABLO TAVASI PARAMETRELERİ (200mm Genişlik x 60mm Yükseklik)
  const trayW = 0.20; // 20 cm
  const trayH = 0.06; // 6 cm
  const trayWallT = 0.008;
  const trayBaseY = 0.68; // Tava taban kotu
  const subRruZ = -2.18; // RRU ekseni (Z=-2.20) altı tava merkezi

  // YARDIMCI: 20'lik Tava Bölümü Oluşturucu (Boyuna / Enine)
  function create20cmTraySegment(len, isAlongX = true) {
    const segGroup = new THREE.Group();
    // Taban sacı
    const baseGeo = isAlongX
      ? new THREE.BoxGeometry(len, 0.005, trayW)
      : new THREE.BoxGeometry(trayW, 0.005, len);
    const baseMesh = new THREE.Mesh(baseGeo, galvTrayMat);
    baseMesh.position.y = 0.0025;
    segGroup.add(baseMesh);

    // İki yan korkuluk / yanak profili
    const sideGeo = isAlongX
      ? new THREE.BoxGeometry(len, trayH, trayWallT)
      : new THREE.BoxGeometry(trayWallT, trayH, len);

    if (isAlongX) {
      const side1 = new THREE.Mesh(sideGeo, galvTrayMat);
      side1.position.set(0, trayH / 2, -trayW / 2 + trayWallT / 2);
      segGroup.add(side1);
      const side2 = new THREE.Mesh(sideGeo, galvTrayMat);
      side2.position.set(0, trayH / 2, trayW / 2 - trayWallT / 2);
      segGroup.add(side2);
      // Runglar (her 18cm'de bir)
      const rungGeo = new THREE.BoxGeometry(0.015, 0.008, trayW - 0.016);
      for (let rx = -len / 2 + 0.09; rx <= len / 2 - 0.08; rx += 0.18) {
        const rung = new THREE.Mesh(rungGeo, rungTrayMat);
        rung.position.set(rx, 0.008, 0);
        segGroup.add(rung);
      }
    } else {
      const side1 = new THREE.Mesh(sideGeo, galvTrayMat);
      side1.position.set(-trayW / 2 + trayWallT / 2, trayH / 2, 0);
      segGroup.add(side1);
      const side2 = new THREE.Mesh(sideGeo, galvTrayMat);
      side2.position.set(trayW / 2 - trayWallT / 2, trayH / 2, 0);
      segGroup.add(side2);
      // Runglar (her 18cm'de bir)
      const rungGeo = new THREE.BoxGeometry(trayW - 0.016, 0.008, 0.015);
      for (let rz = -len / 2 + 0.09; rz <= len / 2 - 0.08; rz += 0.18) {
        const rung = new THREE.Mesh(rungGeo, rungTrayMat);
        rung.position.set(0, 0.008, rz);
        segGroup.add(rung);
      }
    }
    return segGroup;
  }

  // 1. SOL VE SAĞ KANAT 20'LİK TAVA MONTAJLARI
  // 1.1. RRU Altı Boyuna 20'lik Tava (Left: X=-1.25 to -3.22, Right: X=1.25 to 3.22)
  const subRruLen = 1.97;
  const leftSubTray = create20cmTraySegment(subRruLen, true);
  leftSubTray.position.set(-2.235, trayBaseY, subRruZ);
  cableSystemGroup.add(leftSubTray);

  const rightSubTray = create20cmTraySegment(subRruLen, true);
  rightSubTray.position.set(2.235, trayBaseY, subRruZ);
  cableSystemGroup.add(rightSubTray);

  // Konsol Taşıyıcı Kollar (Skorbord taşıyıcı düşey dikmelerine bağlanan I/Kutu konsollar)
  const consoleGeo = new THREE.BoxGeometry(0.04, 0.04, 0.28);
  [-2.9, -2.4, -1.9, -1.4, 1.4, 1.9, 2.4, 2.9].forEach(cx => {
    const cArm = new THREE.Mesh(consoleGeo, bracketSteelMat);
    cArm.position.set(cx, trayBaseY - 0.02, subRruZ - 0.04);
    cableSystemGroup.add(cArm);
  });

  // 1.2. Transvers Geçiş Köprü Tavası (Z: -2.18m'den Z: -0.92m'ye, Uzunluk = 1.26m)
  const bridgeLen = 1.26;
  const bridgeCenterZ = (-2.18 + -0.92) / 2; // -1.55m

  // Sol Köprü Tavası (X = -3.12m)
  const leftBridgeTray = create20cmTraySegment(bridgeLen, false);
  leftBridgeTray.position.set(-3.12, trayBaseY, bridgeCenterZ);
  cableSystemGroup.add(leftBridgeTray);

  // Sağ Köprü Tavası (X = 3.02m)
  const rightBridgeTray = create20cmTraySegment(bridgeLen, false);
  rightBridgeTray.position.set(3.02, trayBaseY, bridgeCenterZ);
  cableSystemGroup.add(rightBridgeTray);

  // Köprü Altı Taşıyıcı Çelik Profiller (Kediyolu ve skorbord alt kirişleri arası)
  [-3.12, 3.02].forEach(bx => {
    const bSupport = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, bridgeLen + 0.10), bracketSteelMat);
    bSupport.position.set(bx, trayBaseY - 0.035, bridgeCenterZ);
    cableSystemGroup.add(bSupport);
  });

  // 1.3. 90° Köşe Dönüş Plakaları
  const cornerPlateGeo = new THREE.BoxGeometry(trayW, 0.006, trayW);
  const leftCorner = new THREE.Mesh(cornerPlateGeo, galvTrayMat);
  leftCorner.position.set(-3.12, trayBaseY + 0.003, subRruZ);
  cableSystemGroup.add(leftCorner);

  const rightCorner = new THREE.Mesh(cornerPlateGeo, galvTrayMat);
  rightCorner.position.set(3.02, trayBaseY + 0.003, subRruZ);
  cableSystemGroup.add(rightCorner);

  // 1.4. POI Kabini Yanı Dikey Dağıtım Riser Kanalı (Y: 0.22m -> 1.35m)
  const riserH = 1.13;
  const riserGeo = new THREE.BoxGeometry(trayWallT, riserH, trayW);
  const leftRiser = new THREE.Mesh(riserGeo, galvTrayMat);
  leftRiser.position.set(-3.12, 0.22 + riserH / 2, -0.92);
  cableSystemGroup.add(leftRiser);

  const rightRiser = new THREE.Mesh(riserGeo, galvTrayMat);
  rightRiser.position.set(3.02, 0.22 + riserH / 2, -0.902);
  cableSystemGroup.add(rightRiser);

  // 2. KABLO VE DEMET YÖNETİMİ (SOL VE SAĞ KANAT İÇİN EŞİT DÜZEN)
  // 20 Feeder Dağıtım Şeması
  const feederSpecs = [
    // Turkcell RRU 1 (2 feeders) -> POI 1
    { rruIdx: 0, rruPort: 0, op: 'turkcell', poiMod: 0, poiPortZ: -0.12 },
    { rruIdx: 0, rruPort: 1, op: 'turkcell', poiMod: 0, poiPortZ: -0.06 },
    // Turkcell RRU 2 (4 feeders) -> 2 adet POI 1, 2 adet POI 2
    { rruIdx: 1, rruPort: 0, op: 'turkcell', poiMod: 0, poiPortZ:  0.02 },
    { rruIdx: 1, rruPort: 1, op: 'turkcell', poiMod: 0, poiPortZ:  0.08 },
    { rruIdx: 1, rruPort: 2, op: 'turkcell', poiMod: 1, poiPortZ: -0.14 },
    { rruIdx: 1, rruPort: 3, op: 'turkcell', poiMod: 1, poiPortZ: -0.08 },
    // TT RRU 1 (2 feeders) -> POI 2
    { rruIdx: 2, rruPort: 0, op: 'tt',       poiMod: 1, poiPortZ: -0.02 },
    { rruIdx: 2, rruPort: 1, op: 'tt',       poiMod: 1, poiPortZ:  0.04 },
    // TT RRU 2 (4 feeders) -> 2 adet POI 2, 2 adet POI 3
    { rruIdx: 3, rruPort: 0, op: 'tt',       poiMod: 1, poiPortZ:  0.10 },
    { rruIdx: 3, rruPort: 1, op: 'tt',       poiMod: 1, poiPortZ:  0.15 },
    { rruIdx: 3, rruPort: 2, op: 'tt',       poiMod: 2, poiPortZ: -0.14 },
    { rruIdx: 3, rruPort: 3, op: 'tt',       poiMod: 2, poiPortZ: -0.08 },
    // Vodafone RRU 1 (2 feeders) -> POI 3
    { rruIdx: 4, rruPort: 0, op: 'vodafone', poiMod: 2, poiPortZ: -0.02 },
    { rruIdx: 4, rruPort: 1, op: 'vodafone', poiMod: 2, poiPortZ:  0.04 },
    // Vodafone RRU 2 (2 feeders) -> POI 3
    { rruIdx: 5, rruPort: 0, op: 'vodafone', poiMod: 2, poiPortZ:  0.10 },
    { rruIdx: 5, rruPort: 1, op: 'vodafone', poiMod: 2, poiPortZ:  0.15 },
    // Vodafone RRU 3 (4 feeders) -> POI 4
    { rruIdx: 6, rruPort: 0, op: 'vodafone', poiMod: 3, poiPortZ: -0.12 },
    { rruIdx: 6, rruPort: 1, op: 'vodafone', poiMod: 3, poiPortZ: -0.06 },
    { rruIdx: 6, rruPort: 2, op: 'vodafone', poiMod: 3, poiPortZ:  0.02 },
    { rruIdx: 6, rruPort: 3, op: 'vodafone', poiMod: 3, poiPortZ:  0.08 }
  ];

  const wings = [
    {
      side: 'left',
      rackX: -3.2475,
      rackZ: -0.920,
      rackFaceX: -3.1175,
      cornerTurnX: -3.12,
      bridgeX: -3.12,
      rrus: [
        { name: 'Turkcell RRU 1', op: 'turkcell', x: -2.7036, feederCount: 2, h: 0.533, w: 0.398 },
        { name: 'Turkcell RRU 2', op: 'turkcell', x: -2.4646, feederCount: 4, h: 0.533, w: 0.398 },
        { name: 'TT RRU 1',       op: 'tt',       x: -2.2185, feederCount: 2, h: 0.480, w: 0.356 },
        { name: 'TT RRU 2',       op: 'tt',       x: -2.0118, feederCount: 4, h: 0.480, w: 0.356 },
        { name: 'Vodafone RRU 1', op: 'vodafone', x: -1.7953, feederCount: 2, h: 0.480, w: 0.432 },
        { name: 'Vodafone RRU 2', op: 'vodafone', x: -1.5779, feederCount: 2, h: 0.480, w: 0.432 },
        { name: 'Vodafone RRU 3', op: 'vodafone', x: -1.3600, feederCount: 4, h: 0.480, w: 0.432 }
      ]
    },
    {
      side: 'right',
      rackX: 3.1500,
      rackZ: -0.902,
      rackFaceX: 3.0200,
      cornerTurnX: 3.02,
      bridgeX: 3.02,
      rrus: [
        { name: 'Turkcell RRU 1', op: 'turkcell', x: 1.8536, feederCount: 2, h: 0.533, w: 0.398 },
        { name: 'Turkcell RRU 2', op: 'turkcell', x: 2.0715, feederCount: 4, h: 0.533, w: 0.398 },
        { name: 'TT RRU 1',       op: 'tt',       x: 2.2900, feederCount: 2, h: 0.480, w: 0.356 },
        { name: 'TT RRU 2',       op: 'tt',       x: 2.5100, feederCount: 4, h: 0.480, w: 0.356 },
        { name: 'Vodafone RRU 1', op: 'vodafone', x: 2.7298, feederCount: 2, h: 0.480, w: 0.432 },
        { name: 'Vodafone RRU 2', op: 'vodafone', x: 2.9500, feederCount: 2, h: 0.480, w: 0.432 },
        { name: 'Vodafone RRU 3', op: 'vodafone', x: 3.1700, feederCount: 4, h: 0.480, w: 0.432 }
      ]
    }
  ];

  wings.forEach(wing => {
    const isLeft = (wing.side === 'left');

    feederSpecs.forEach((spec, k) => {
      const rru = wing.rrus[spec.rruIdx];
      const bandMat = (spec.op === 'turkcell') ? tcellBandMat : (spec.op === 'tt' ? ttBandMat : vdfBandMat);

      // 5 SÜTUN x 4 KATMAN KATALOG MATRİS YERLEŞİMİ (20cm Tavanın İçi)
      const col = k % 5;              // 0..4 (Tava eni boyunca sütun)
      const tier = Math.floor(k / 5); // 0..3 (Tava derinliği boyunca katman)

      // Tava enine ofset (-0.056m ile +0.056m arası, 28mm aralık, tava tam ortalı)
      const dLat = -0.056 + col * 0.028;
      // Tava dikey ofset (+12mm ile +45mm arası, katman katman)
      const dVert = 0.012 + tier * 0.011;

      const slotY = trayBaseY + dVert;
      const subSlotZ = subRruZ + dLat;
      const bridgeSlotX = wing.bridgeX + dLat;

      // RRU Altındaki Port Konumu
      const f = spec.rruPort;
      const pOffX = (rru.feederCount === 2) 
        ? (f === 0 ? -0.025 : 0.025) 
        : [-0.045, -0.015, 0.015, 0.045][f];
      const pOffZ = (f % 2 === 0) ? -0.025 : 0.025;

      const p0 = new THREE.Vector3(
        rru.x + pOffX,
        1.70 - rru.h / 2 - 0.02,
        -2.20 + 0.06 + rru.w / 2 + pOffZ
      );

      // P1: RRU'dan Düşey Düz İniş (Tavanın 10cm üzerine kadar kavisiz iniş)
      const p1 = new THREE.Vector3(p0.x, trayBaseY + 0.12, subSlotZ);

      // P2: Tavaya 90° Yumuşak Geçiş ve Slotuna Oturma
      const sweepDirX = isLeft ? -0.05 : 0.05;
      const p2 = new THREE.Vector3(p0.x + sweepDirX, slotY, subSlotZ);

      // P3: 20'lik Tava İçinde Kusursuz Paralel Boyuna Hat (Köşeye Yaklaşım)
      const cornerApproachX = wing.cornerTurnX + (isLeft ? 0.06 : -0.06);
      const p3 = new THREE.Vector3(cornerApproachX, slotY, subSlotZ);

      // P4: Konsantrik 90° Köşe Dönüşü (Transvers Köprü Tavasına Giriş)
      const p4 = new THREE.Vector3(bridgeSlotX, slotY, subRruZ + 0.06);

      // P5: Geçiş Köprü Tavası Boyunca Kusursuz Paralel Hat
      const p5 = new THREE.Vector3(bridgeSlotX, slotY, -1.15);

      // P6: POI Kabin Riser Kanalı Önüne Ulaşım
      const targetPoiY = 0.2925 + spec.poiMod * 0.315;
      const p6 = new THREE.Vector3(bridgeSlotX, slotY, wing.rackZ + spec.poiPortZ);

      // P7: Riser Kanalı Boyunca İlgili POI Modülü Raf Kotuna Dikey Tırmanış/İniş
      const p7 = new THREE.Vector3(bridgeSlotX, targetPoiY, wing.rackZ + spec.poiPortZ);

      // Pend: POI Modülü Port Terminaline Yatay Giriş
      const pEnd = new THREE.Vector3(wing.rackFaceX, targetPoiY, wing.rackZ + spec.poiPortZ);

      // Üç Boyutlu Centripetal Spline (Taşma ve sarkma yapmayan disiplinli endüstriyel kavis)
      const curve = new THREE.CatmullRomCurve3([p0, p1, p2, p3, p4, p5, p6, p7, pEnd], false, 'centripetal');
      const tubeGeo = new THREE.TubeGeometry(curve, 36, 0.007, 6, false);
      const tubeMesh = new THREE.Mesh(tubeGeo, feederMat);
      tubeMesh.castShadow = true;
      tubeMesh.name = `feeder_1_2_${wing.side}_${rru.name.replace(/\s+/g, '_')}_p${f + 1}`;
      tubeMesh.userData = {
        type: 'cable',
        category: 'Feeder',
        name: `1/2" Feeder - ${rru.name} (Port ${f + 1}) -> ${isLeft ? 'Sol' : 'Sağ'} POI ${spec.poiMod + 1}`,
        rru: rru.name,
        side: wing.side,
        poiModule: spec.poiMod + 1
      };
      cableSystemGroup.add(tubeMesh);

      // RRU Çıkışı Konnektör Somunu (7/16 DIN Pirinç)
      const connRru = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.022, 10), brassNutMat);
      connRru.position.copy(p0);
      cableSystemGroup.add(connRru);

      // Weatherproofing Boot (Kauçuk Su Yalıtım Körüğü)
      const bootRru = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.011, 0.030, 10), bootMat);
      bootRru.position.set(p0.x, p0.y - 0.022, p0.z);
      cableSystemGroup.add(bootRru);

      // Operatör Renk Bandı (RRU Tarafı)
      const bandRru = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.035, 8), bandMat);
      bandRru.position.set(p0.x, p0.y - 0.065, p0.z);
      cableSystemGroup.add(bandRru);

      // POI Girişi Konnektör Somunu
      const connPoi = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.022, 10), brassNutMat);
      connPoi.rotation.z = Math.PI / 2;
      connPoi.position.copy(pEnd);
      cableSystemGroup.add(connPoi);

      // Operatör Renk Bandı (POI Tarafı)
      const bandPoi = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.035, 8), bandMat);
      bandPoi.rotation.z = Math.PI / 2;
      bandPoi.position.set(isLeft ? pEnd.x + 0.035 : pEnd.x - 0.035, pEnd.y, pEnd.z);
      cableSystemGroup.add(bandPoi);
    });

    // Paslanmaz Çelik Demet Kelepçeleri (20'lik Tava Boyunca Muntazam Aralıklarla)
    const clampGeo = new THREE.BoxGeometry(0.025, 0.055, trayW * 0.90);
    const subClampStations = isLeft ? [-1.6, -2.0, -2.4, -2.8] : [1.6, 2.0, 2.4, 2.8];
    subClampStations.forEach(cx => {
      const cl = new THREE.Mesh(clampGeo, clampSteelMat);
      cl.position.set(cx, trayBaseY + 0.035, subRruZ);
      cableSystemGroup.add(cl);
    });

    // Köprü tavası kelepçeleri
    [-1.9, -1.6, -1.3].forEach(bz => {
      const cl = new THREE.Mesh(new THREE.BoxGeometry(trayW * 0.90, 0.055, 0.025), clampSteelMat);
      cl.position.set(wing.bridgeX, trayBaseY + 0.035, bz);
      cableSystemGroup.add(cl);
    });
  });

  return cableSystemGroup;
}

// =========================================================================
// ALAN 2: 2 TAŞIYICI SİLİNDİR BORU ARASINDA 20'LİK KABLO TAVASI VE
// YAKINDAKİ POI'DEN 14 ADET 1/2" FEEDER KABLOLAMA SİSTEMİ
// - Taşıyıcı dev silindir borular:
//   * Silindir 1 (Ön/Skorboarda yakın): Z = -1.67m, Yarıçap = 0.75m (İç yanak: Z = -0.92m)
//   * Silindir 2 (Arka/Skorboarda uzak): Z = +0.55m, Yarıçap = 0.75m (İç yanak: Z = -0.20m)
//   * İki silindir arası boşluk: 72 cm (Z: -0.92m ile -0.20m arası, Orta aks: Z = -0.56m)
// - 20'lik Tava (200mm Genişlik x 60mm Yükseklik):
//   * Tam iki silindir arasındaki 72 cm açıklığın orta ekseninde (Z = -0.56m, Y = -0.38m)
//   * Her 2.0 metrede bir iki silindire basan ağır trapeze taşıyıcı konsollar (Unistrut çelik profil)
//   * X = -3.20m (Sol POI Rack yanı) kotundan X = -19.85m (Sol Matsing Anten montajı) boyunca kesintisiz uzanır (~16.65m)
// - 14 Adet 1/2" Feeder Kablosu (Kusursuz Paralel & Düzenli Yerleşim):
//   * Sol POI kabinindeki 4 adet POI modülü çıkış terminallerinden (14 port) çıkar
//   * Riser kanalı ve kedi yolu alt kotundan yumuşak 90° kavisle 20'lik tavaya oturur
//   * Tava tabanında tek sıra halinde, 12.5mm muntazam aralıklarla milimetrik paralel uzanır
//   * Her 1.5 metrede bir paslanmaz çelik demet kelepçeleriyle sabitlenir
//   * Operatör renk kodları: Turkcell (5 port), TT (4 port), Vodafone (5 port)
//   * Silindir 2 üzerindeki Matsing anten montaj düşey borusuna tırmanıp anten RF portlarına pirinç konnektör ve yalıtım pabuçlarıyla bağlanır
// =========================================================================
function buildScoreboardPoiToCylinderAntennaFeederSystem(side = 'left') {
  const isLeft = (side === 'left');
  const systemGroup = new THREE.Group();
  systemGroup.name = `scoreboardPoiToAntennaFeederSystem_${side}`;

  // 1. Malzemeler
  const feederMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.55,
    metalness: 0.25
  });
  const tcellBandMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.3, metalness: 0.2 });
  const ttBandMat = new THREE.MeshStandardMaterial({ color: 0x0891b2, roughness: 0.3, metalness: 0.2 });
  const vdfBandMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3, metalness: 0.2 });
  const brassNutMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.35, metalness: 0.85 });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
  const galvTrayMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.35, metalness: 0.8 });
  const rungTrayMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4, metalness: 0.75 });
  const clampSteelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.85 });
  const bracketSteelMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45, metalness: 0.75 });
  const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.8 });
  const rubberMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });

  // 2. Geometrik Eksenler ve Parametreler
  const trayCenterZ = -0.56;   // İki silindir arasındaki 72 cm boşluğun tam ortası
  const trayBaseY = -0.38;     // Kedi yolunun altı, silindir bağlarının üstü
  const trayW = 0.20;          // 20'lik tava genişliği (200mm)
  const trayH = 0.06;          // Tava yanak yüksekliği (60mm)
  const trayWallT = 0.006;     // Yanak sac kalınlığı (6mm)

  // Boyuna uzanım
  const startX = isLeft ? -3.20 : 3.15;
  const endX = isLeft ? -19.85 : 19.85;
  const minX = Math.min(startX, endX);
  const maxX = Math.max(startX, endX);
  const trayLen = maxX - minX;
  const midX = (minX + maxX) / 2;

  // 3. 20'LİK GALVANİZ KABLO TAVASI GÖVDESİ (X Ekseni Boyunca)
  const trayGroup = new THREE.Group();
  trayGroup.name = `tray20cm_${side}`;

  // 3.1. Taban Sacı
  const baseGeo = new THREE.BoxGeometry(trayLen, 0.005, trayW);
  const baseMesh = new THREE.Mesh(baseGeo, galvTrayMat);
  baseMesh.position.set(midX, trayBaseY + 0.0025, trayCenterZ);
  baseMesh.receiveShadow = true;
  trayGroup.add(baseMesh);

  // 3.2. Yan Yanaklar (Silindir 1 tarafı ve Silindir 2 tarafı)
  const sideGeo = new THREE.BoxGeometry(trayLen, trayH, trayWallT);
  const side1 = new THREE.Mesh(sideGeo, galvTrayMat);
  side1.position.set(midX, trayBaseY + trayH / 2, trayCenterZ - trayW / 2 + trayWallT / 2);
  side1.castShadow = true;
  trayGroup.add(side1);

  const side2 = new THREE.Mesh(sideGeo, galvTrayMat);
  side2.position.set(midX, trayBaseY + trayH / 2, trayCenterZ + trayW / 2 - trayWallT / 2);
  side2.castShadow = true;
  trayGroup.add(side2);

  // 3.3. Tava Havalandırma / Merdiven Rungları (Her 25 cm'de bir)
  const rungGeo = new THREE.BoxGeometry(0.016, 0.008, trayW - 2 * trayWallT);
  for (let rx = minX + 0.15; rx <= maxX - 0.15; rx += 0.25) {
    const rung = new THREE.Mesh(rungGeo, rungTrayMat);
    rung.position.set(rx, trayBaseY + 0.007, trayCenterZ);
    trayGroup.add(rung);
  }

  // 3.4. Tava Ek Parçaları (Fishplate Splice Plates - her 3.0 metrede bir)
  const spliceGeo = new THREE.BoxGeometry(0.12, 0.05, 0.004);
  for (let sx = minX + 3.0; sx <= maxX - 1.0; sx += 3.0) {
    [-trayW / 2 - 0.002, trayW / 2 + 0.002].forEach(sz => {
      const sp = new THREE.Mesh(spliceGeo, clampSteelMat);
      sp.position.set(sx, trayBaseY + trayH / 2, trayCenterZ + sz);
      trayGroup.add(sp);
    });
  }

  // 3.5. Tava Bitiş Dudak / Kavisli İniş Flanşı (Antene Doğru Yumuşak Çıkış)
  const endFlangeGeo = new THREE.BoxGeometry(0.03, 0.04, trayW);
  const endFlange = new THREE.Mesh(endFlangeGeo, galvTrayMat);
  endFlange.position.set(endX, trayBaseY + 0.02, trayCenterZ);
  trayGroup.add(endFlange);

  systemGroup.add(trayGroup);

  // 4. SİLİNDİRLER ARASI AĞIR TAŞIYICI TRAPEZE KONSOLLARI (SUPPORT BRACKETS)
  // İki silindir (Z = -1.67m ve Z = +0.55m) arasındaki 72 cm boşluğa her 2.0 metrede bir basan enine taşıyıcılar
  const bracketGroup = new THREE.Group();
  bracketGroup.name = `traySupportBrackets_${side}`;
  const unistrutGeo = new THREE.BoxGeometry(0.042, 0.042, 0.74);
  const saddleShoeGeo = new THREE.BoxGeometry(0.06, 0.08, 0.04);
  const jClipGeo = new THREE.BoxGeometry(0.03, 0.02, 0.02);

  for (let bx = minX + 0.30; bx <= maxX - 0.30; bx += 2.0) {
    // Enine Unistrut Profili
    const uBeam = new THREE.Mesh(unistrutGeo, bracketSteelMat);
    uBeam.position.set(bx, trayBaseY - 0.025, trayCenterZ);
    uBeam.castShadow = true;
    bracketGroup.add(uBeam);

    // Silindir 1 Mesnet Eyeri (Z = -0.92m)
    const shoe1 = new THREE.Mesh(saddleShoeGeo, darkSteelMat);
    shoe1.position.set(bx, trayBaseY - 0.025, -0.925);
    bracketGroup.add(shoe1);

    // Silindir 2 Mesnet Eyeri (Z = -0.20m)
    const shoe2 = new THREE.Mesh(saddleShoeGeo, darkSteelMat);
    shoe2.position.set(bx, trayBaseY - 0.025, -0.195);
    bracketGroup.add(shoe2);

    // Tavayı Profile Kilitleyen J-Kelepçeler (Sağ ve Sol Kenar)
    [-trayW / 2 - 0.008, trayW / 2 + 0.008].forEach(jz => {
      const jc = new THREE.Mesh(jClipGeo, clampSteelMat);
      jc.position.set(bx, trayBaseY + 0.005, trayCenterZ + jz);
      bracketGroup.add(jc);
    });
  }
  systemGroup.add(bracketGroup);

  // 5. POI ÇIKIŞI İNİŞ MERDİVENİ / DAĞITIM KANALI (Kedi Yolu Kotundan Tavaya İniş)
  const poiRiserX = isLeft ? -3.25 : 3.15;
  const poiRiserZ = isLeft ? -0.92 : -0.90;
  const riserRailGeo = new THREE.BoxGeometry(0.02, 0.65, 0.02);
  const riserRungGeo = new THREE.BoxGeometry(0.015, 0.01, 0.22);
  [-0.10, 0.10].forEach(rx => {
    const rRail = new THREE.Mesh(riserRailGeo, galvTrayMat);
    rRail.position.set(poiRiserX + rx, 0.0, poiRiserZ);
    systemGroup.add(rRail);
  });
  for (let ry = -0.25; ry <= 0.25; ry += 0.15) {
    const rRung = new THREE.Mesh(riserRungGeo, rungTrayMat);
    rRung.position.set(poiRiserX, ry, poiRiserZ);
    systemGroup.add(rRung);
  }

  // 6. 14 ADET 1/2" FEEDER KABLO HATTI (MUNTAZAM, PARALEL VE DÜZENLİ YERLEŞİM)
  // Feeder Dağılımı ve Operatör Ayrımı:
  // - 1..5: Turkcell (5 feeder) -> Mavi
  // - 6..9: Türk Telekom (4 feeder) -> Turkuaz
  // - 10..14: Vodafone (5 feeder) -> Kırmızı
  const cableLaneSpacing = 0.0125; // 12.5mm eksenler arası mesafe (toplam 162.5mm genişlik, 20cm tavaya mükemmel sığar)
  const cableRadius = 0.00675;     // 1/2" Feeder dış çapı ~13.5mm -> Yarıçap = 6.75mm
  const cableElevationInTray = trayBaseY + 0.005 + cableRadius; // Tava taban sacı üstünde

  for (let k = 0; k < 14; k++) {
    // Operatör Belirleme
    let opName = 'Turkcell';
    let bandMat = tcellBandMat;
    if (k >= 5 && k < 9) {
      opName = 'Türk Telekom';
      bandMat = ttBandMat;
    } else if (k >= 9) {
      opName = 'Vodafone';
      bandMat = vdfBandMat;
    }

    // Tava İçindeki Sabit Paralel Şerit (Z Ekseni)
    const laneOffsetZ = -0.08125 + k * cableLaneSpacing;
    const laneZ = trayCenterZ + laneOffsetZ;

    // POI Port Çıkış Koordinatları
    // 4 POI modülüne 14 portun dengeli paylaştırılması: (4 + 4 + 3 + 3)
    const poiModIdx = k < 4 ? 0 : (k < 8 ? 1 : (k < 11 ? 2 : 3));
    const modPortIdx = k - (poiModIdx === 0 ? 0 : (poiModIdx === 1 ? 4 : (poiModIdx === 2 ? 8 : 11)));
    const poiPortY = 0.2925 + poiModIdx * 0.315 + (modPortIdx - 1.5) * 0.038;
    const poiPortZ = poiRiserZ + (modPortIdx - 1.5) * 0.045;
    const poiPortX = poiRiserX + (isLeft ? -0.10 : 0.10);

    // Anten Tarafı Düşey İniş Kolonu (Ø114mm Düşey İniş Borusuna Sabitlenen 2 Sütunlu Demet)
    const colSide = (k % 2 === 0 ? -1 : 1);
    const colX = (isLeft ? -20.0 : 20.0) + colSide * 0.032;
    const colZ = 0.495 + Math.floor(k / 7) * 0.020;

    // Matsing Anten RF Portu Terminasyon Koordinatları (Anten arkasındaki 45° açılı konnektör yuvaları)
    // Anten merkezi: alan4Group içinde Y = -4.12m, Z = 0.9185m (Dünya Y = 15.88m)
    // Anten arka yüzündeki RF portları: Y: -3.52m ile -3.91m arası, Z: 1.12m ile 0.73m arası
    const bankSide = (k % 2 === 0 ? -1 : 1);
    const rowIdx = Math.floor(k / 2); // 0..6 (7 sıra)
    const bankX = (isLeft ? -20.0 : 20.0) + bankSide * (0.195 + (rowIdx % 2) * 0.035);
    const antPortY = -3.52 - rowIdx * 0.065;
    const antPortZ = 1.12 - rowIdx * 0.065;
    const pEnd = new THREE.Vector3(bankX, antPortY, antPortZ);

    // Spline & Yol Geometrisi:
    // 1. POI'den Tavaya Giriş Eğrisi (Smooth 3D Riser Entry)
    const p0 = new THREE.Vector3(poiPortX, poiPortY, poiPortZ);
    const pTrayStart = new THREE.Vector3(isLeft ? -3.60 : 3.60, cableElevationInTray, laneZ);
    const pPreTray = new THREE.Vector3(isLeft ? -3.48 : 3.48, cableElevationInTray, laneZ);
    const entryCurve = new THREE.CatmullRomCurve3([
      p0,
      new THREE.Vector3(poiPortX + (isLeft ? -0.04 : 0.04), poiPortY - 0.08, poiPortZ),
      new THREE.Vector3(poiRiserX + (isLeft ? -0.06 : 0.06), -0.15, poiRiserZ + (modPortIdx - 1.5) * 0.02),
      new THREE.Vector3(isLeft ? -3.35 : 3.35, -0.30, poiRiserZ + (laneZ - poiRiserZ) * 0.45),
      pPreTray,
      pTrayStart
    ], false, 'centripetal');

    // 2. 20'lik Tava İçi Kusursuz Düz Hat (LineCurve3 - Sıfır Sapma, Tava Tabanında Milimetrik Paralel)
    const pTrayEnd = new THREE.Vector3(isLeft ? -19.65 : 19.65, cableElevationInTray, laneZ);
    const trayStraightLine = new THREE.LineCurve3(pTrayStart, pTrayEnd);

    // 3. Tavadan Çıkış ve Matsing Anten İniş Borusu / RF Portları Eğrisi (Smooth Antenna Drop)
    const pPostTray = new THREE.Vector3(isLeft ? -19.72 : 19.72, cableElevationInTray, laneZ);
    const exitCurve = new THREE.CatmullRomCurve3([
      pTrayEnd,
      pPostTray,
      new THREE.Vector3(isLeft ? -19.82 : 19.82, -0.42, laneZ + (0.55 - laneZ) * 0.65),
      new THREE.Vector3(colX, -1.05, colZ),
      new THREE.Vector3(colX, -1.70, colZ),
      new THREE.Vector3(colX, -2.35, colZ),
      new THREE.Vector3(colX, -3.00, colZ),
      new THREE.Vector3(colX, -3.55, colZ + 0.03),
      new THREE.Vector3(colX + bankSide * 0.07, antPortY + 0.06, antPortZ - 0.07),
      pEnd
    ], false, 'centripetal');

    // Birleşik Kesintisiz Yol (CurvePath)
    const fullPath = new THREE.CurvePath();
    fullPath.add(entryCurve);
    fullPath.add(trayStraightLine);
    fullPath.add(exitCurve);

    const tubeGeo = new THREE.TubeGeometry(fullPath, 96, cableRadius, 6, false);
    const tubeMesh = new THREE.Mesh(tubeGeo, feederMat);
    tubeMesh.castShadow = true;
    tubeMesh.name = `feeder_1_2_poi_to_ant_${side}_c${k + 1}`;
    tubeMesh.userData = {
      type: 'cable',
      category: 'Feeder',
      name: `1/2" Feeder Kablo #${k + 1} (${opName}) - ${isLeft ? 'Sol' : 'Sağ'} POI -> Matsing Anten`,
      operator: opName,
      side: side,
      feederIndex: k + 1,
      cableDiameter: '1/2"'
    };
    systemGroup.add(tubeMesh);

    // A) POI ÇIKIŞI BAĞLANTI ELEMANLARI (Pirinç Konnektör Somunu & Kauçuk Pabuç & Renk Bandı)
    const connPoi = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.022, 10), brassNutMat);
    connPoi.rotation.z = Math.PI / 2;
    connPoi.position.copy(p0);
    systemGroup.add(connPoi);

    const bootPoi = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.011, 0.028, 10), bootMat);
    bootPoi.rotation.z = Math.PI / 2;
    bootPoi.position.set(isLeft ? p0.x - 0.02 : p0.x + 0.02, p0.y, p0.z);
    systemGroup.add(bootPoi);

    const bandPoi = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.035, 8), bandMat);
    bandPoi.rotation.z = Math.PI / 2;
    bandPoi.position.set(isLeft ? p0.x - 0.055 : p0.x + 0.055, p0.y, p0.z);
    systemGroup.add(bandPoi);

    // B) MATSING ANTEN PORTU GİRİŞİ BAĞLANTI ELEMANLARI (Doğrudan Anten Portuna Oturan Konnektör & Pabuç & Bant)
    const connAnt = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.024, 10), brassNutMat);
    connAnt.rotation.x = -Math.PI / 4;
    connAnt.position.copy(pEnd);
    systemGroup.add(connAnt);

    const bootAnt = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.011, 0.030, 10), bootMat);
    bootAnt.rotation.x = -Math.PI / 4;
    bootAnt.position.set(bankX, antPortY + 0.018, antPortZ - 0.018);
    systemGroup.add(bootAnt);

    const bandAnt = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.035, 8), bandMat);
    bandAnt.rotation.x = -Math.PI / 4;
    bandAnt.position.set(bankX, antPortY + 0.045, antPortZ - 0.045);
    systemGroup.add(bandAnt);
  }

  // 7. TAVA BOYUNCA PASLANMAZ ÇELİK DEMET KELEPÇELERİ (HER 1.5 METREDE BİR)
  const clampGroup = new THREE.Group();
  clampGroup.name = `trayCableHoldClamps_${side}`;
  const clampBarGeo = new THREE.BoxGeometry(0.025, 0.012, 0.186);
  const clampRubberGeo = new THREE.BoxGeometry(0.025, 0.004, 0.186);
  const boltHeadGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.016, 8);

  for (let cx = minX + 1.20; cx <= maxX - 0.80; cx += 1.50) {
    // Kauçuk Yalıtım Fitili
    const rubberStrip = new THREE.Mesh(clampRubberGeo, rubberMat);
    rubberStrip.position.set(cx, cableElevationInTray + cableRadius + 0.002, trayCenterZ);
    clampGroup.add(rubberStrip);

    // Çelik Baskı Lama Barı
    const cBar = new THREE.Mesh(clampBarGeo, clampSteelMat);
    cBar.position.set(cx, cableElevationInTray + cableRadius + 0.008, trayCenterZ);
    cBar.castShadow = true;
    clampGroup.add(cBar);

    // İki Yan Sabitleme Cıvataları
    [-0.085, 0.085].forEach(bz => {
      const boltH = new THREE.Mesh(boltHeadGeo, bracketSteelMat);
      boltH.position.set(cx, cableElevationInTray + cableRadius + 0.016, trayCenterZ + bz);
      clampGroup.add(boltH);
    });
  }
  systemGroup.add(clampGroup);

  // 8. ANTEN DÜŞEY BORUSU BOYUNCA İNİŞ KELEPÇELERİ (Ø114mm Boruya Sabitleme, Y: -1.25m'den -3.55m'ye)
  const antDropX = isLeft ? -20.0 : 20.0;
  const antDropZ = 0.50;
  const antClampGeo = new THREE.BoxGeometry(0.12, 0.04, 0.06);
  [-1.25, -1.85, -2.45, -3.05, -3.55].forEach(cy => {
    const ac = new THREE.Mesh(antClampGeo, clampSteelMat);
    ac.position.set(antDropX, cy, antDropZ);
    ac.castShadow = true;
    systemGroup.add(ac);
  });

  return systemGroup;
}

function createAlan4Structure() {
  const alan4Group = new THREE.Group();
  alan4Group.name = 'alan4Structure';
  alan4Group.position.set(0, 20.0, 0); // Scoreboard ve kedi yolu taşıyıcı sistemi +20 metre yükseğe kaldırıldı
  alan4Group.visible = false; // Hidden by default, shown when Alan 4 is selected
  alan4SlidingDoors.length = 0;

  // Common Materials
  const floorMat = new THREE.MeshStandardMaterial({ 
    color: 0x2d323f, 
    roughness: 0.8,
    metalness: 0.6
  });
  const beamMat = new THREE.MeshStandardMaterial({ 
    color: 0x1f2228, 
    metalness: 0.8, 
    roughness: 0.2 
  });
  const railMat = new THREE.MeshStandardMaterial({ 
    color: 0xfdb913, 
    metalness: 0.5, 
    roughness: 0.3 
  });
  const pipeMat = new THREE.MeshStandardMaterial({ 
    color: 0x7f8c8d, 
    roughness: 0.5, 
    metalness: 0.7 
  });
  const darkSteelMat = new THREE.MeshStandardMaterial({ 
    color: 0x34495e, 
    metalness: 0.8, 
    roughness: 0.3 
  });

  // =========================================================================
  // GEOMETRİK PARAMETRELER:
  // - Silindir Çapı: 150 cm (1.50m) -> Yarıçap = 0.75m
  // - İki Silindir Arasındaki Boşluk: 72 cm (0.72m)
  // - Merkezler Arası Mesafe: 0.75 + 0.72 + 0.75 = 2.22m
  // - Kedi Yolu Genişliği: 2.60m (Z: -1.30m ile +1.30m arası)
  // - Kedi yolu uzak silindirin dış ucundan (Z = +1.30m) başlayıp skorborda doğru 2.6m uzanır (Z = -1.30m)
  //   * Silindir 2 (Uzak): Merkez Z = +0.55m (Dış uç: +1.30m, İç uç: -0.20m)
  //   * Boşluk: 0.72m (Z: -0.20m ile -0.92m arası)
  //   * Silindir 1 (Yakın): Merkez Z = -1.67m (İç uç: -0.92m, Ön uç: -2.42m)
  // - Skorbord: Genişlik = 13.0m, Yükseklik = 8.0m, Derinlik = 0.125m
  // - Kedi Yolu Uzunluğu: 13m + 1.2m + 1.2m = 15.40m (X: -7.7m ile +7.7m arası)
  // =========================================================================

  const pipeRadius = 0.75;
  const pipeLength = 50.0; // Silindir taşıyıcılar toplamda 50 metreye uzatıldı (X: -25.0m ile +25.0m) // Silindirler kedi yolunun her iki yanına doğru uzatıldı (25 metre)
  const pipeGeo = new THREE.CylinderGeometry(pipeRadius, pipeRadius, pipeLength, 36);

  // 1. DUAL LOWER CARRIER CYLINDERS (ALT TAŞIYICI DEV BORULAR)
  // Silindir 1 (Ön / Skorborda Yakın - Z = -1.67m, Y = -0.95m)
  const pipe1 = new THREE.Mesh(pipeGeo, pipeMat);
  pipe1.rotation.z = Math.PI / 2;
  pipe1.position.set(0, -0.95, -1.67);
  pipe1.castShadow = true;
  pipe1.receiveShadow = true;
  alan4Group.add(pipe1);

  // Silindir 2 (Arka / Skorborda Uzak - Z = +0.55m, Y = -0.95m)
  const pipe2 = new THREE.Mesh(pipeGeo, pipeMat);
  pipe2.rotation.z = Math.PI / 2;
  pipe2.position.set(0, -0.95, 0.55);
  pipe2.castShadow = true;
  pipe2.receiveShadow = true;
  alan4Group.add(pipe2);

  // Borular arası 72cm boşluktaki rijit çelik bağlantı elemanları (her 2.2m'de bir)
  const pipeTieGeo = new THREE.BoxGeometry(0.25, 0.18, 0.72);
  for (let x = -24.2; x <= 24.3; x += 2.2) {
    const tie = new THREE.Mesh(pipeTieGeo, darkSteelMat);
    tie.position.set(x, -0.95, -0.56);
    alan4Group.add(tie);
  }

  // 50 Metrelik Silindir Uç Kapakları (X = ±25.0m)
  const pipeCapGeo = new THREE.CylinderGeometry(pipeRadius * 1.01, pipeRadius * 1.01, 0.06, 36);
  pipeCapGeo.rotateZ(Math.PI / 2);
  [-25.0, 25.0].forEach(capX => {
    [-1.67, 0.55].forEach(capZ => {
      const cap = new THREE.Mesh(pipeCapGeo, darkSteelMat);
      cap.position.set(capX, -0.95, capZ);
      alan4Group.add(cap);
    });
  });

  // =========================================================================
  // 2. KEDİ YOLU (TEK KATLI, GENİŞLİK 120 CM, RRU VE SKORBOARD TARAFINA ÇEKİLMİŞ: UZUNLUK 7.4M)
  // - Skorboard ve RRU tarafına (Z = -1.30m) doğru konumlandırılmış 120 cm net yürüme genişliği (Z: -1.30m ile -0.10m arası)
  // =========================================================================
  const catwalkLength = 7.4; // X: -3.7m ile +3.7m arası
  const catwalkWidth = 1.20; // 120 cm net genişlik (Kullanıcı İsteği)
  const floorZ = -0.70; // Ön kenar Z = -1.30m, Arka kenar Z = -0.10m
  const floorGeo = new THREE.BoxGeometry(catwalkLength, 0.05, catwalkWidth);
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.position.set(0, 0, floorZ);
  floor.receiveShadow = true;
  alan4Group.add(floor);

  // Boyuna kenar kirişleri (Arka Z = -0.10m, Ön Z = -1.30m)
  const longBeamGeo = new THREE.BoxGeometry(catwalkLength, 0.18, 0.08);
  const rearBeam = new THREE.Mesh(longBeamGeo, beamMat);
  rearBeam.position.set(0, 0.065, -0.10);
  rearBeam.castShadow = true;
  rearBeam.receiveShadow = true;
  alan4Group.add(rearBeam);

  const frontBeam = rearBeam.clone();
  frontBeam.position.z = -1.30;
  alan4Group.add(frontBeam);

  // Enine ağır taşıyıcı konsol kirişler (Transverses)
  // Kedi yolunun altından geçip her iki silindire basar ve öne doğru uzanır
  const transBeamGeo = new THREE.BoxGeometry(0.20, 0.18, 3.2);
  const saddleShoeGeo = new THREE.BoxGeometry(0.24, 0.12, 0.60);

  for (let x = -3.6; x <= 3.61; x += 1.8) {
    const transBeam = new THREE.Mesh(transBeamGeo, darkSteelMat);
    transBeam.position.set(x, -0.115, -0.65);
    alan4Group.add(transBeam);

    // Silindir 2 mesnet eyeri (Z = +0.55m)
    const shoe2 = new THREE.Mesh(saddleShoeGeo, darkSteelMat);
    shoe2.position.set(x, -0.20, 0.55);
    alan4Group.add(shoe2);

    // Silindir 1 mesnet eyeri (Z = -1.67m)
    const shoe1 = new THREE.Mesh(saddleShoeGeo, darkSteelMat);
    shoe1.position.set(x, -0.20, -1.67);
    alan4Group.add(shoe1);
  }

  // =========================================================================
  // 3. EMNİYET KORKULUKLARI (SARI GÜVENLİK KORKULUKLARI - 1.1M YÜKSEKLİK)
  const postGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.1);
  const topRailRearGeo = new THREE.CylinderGeometry(0.025, 0.025, catwalkLength);
  const midRailRearGeo = new THREE.CylinderGeometry(0.018, 0.018, catwalkLength);

  // 3.1. Arka Kenar Korkuluğu (Z = -0.10m, Gemici Merdiveni İniş/Biniş Açıklığı X = [-2.40m, -0.50m] 1.90m Tam Açık)
  // Kullanıcı İsteği: "gemici merdiveni alt kedi yolunda hatalı karşılanıyor. İnen boşluga düşer baksana"
  // Düzeltme: Gemici merdiveni (X=-1.45m), dikey kablo merdiveni (X=-1.75m) ve güvenlik kafesi (X=-2.20m)
  // alt kedi yolunda 1.90m genişliğindeki çıkıntı sahanlık ile TAM MERKEZİNDE karşılanır, iniş boşluğu sıfırlanır!
  const landingOpenMinX = -2.40;
  const landingOpenMaxX = -0.50;

  // Sol Parça: X = -3.70m ile X = -2.40m arası (L = 1.30m)
  const lowerRearLeftLen = landingOpenMinX - (-catwalkLength / 2); // 1.30m
  const lowerRearLeftCenterX = -catwalkLength / 2 + lowerRearLeftLen / 2; // -3.05m
  const lowerTopRailLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, lowerRearLeftLen), railMat);
  lowerTopRailLeft.rotation.z = Math.PI / 2;
  lowerTopRailLeft.position.set(lowerRearLeftCenterX, 1.10, -0.10);
  alan4Group.add(lowerTopRailLeft);

  const lowerMidRailLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, lowerRearLeftLen), railMat);
  lowerMidRailLeft.rotation.z = Math.PI / 2;
  lowerMidRailLeft.position.set(lowerRearLeftCenterX, 0.55, -0.10);
  alan4Group.add(lowerMidRailLeft);

  const lowerKickLeft = new THREE.Mesh(new THREE.BoxGeometry(lowerRearLeftLen, 0.12, 0.02), beamMat);
  lowerKickLeft.position.set(lowerRearLeftCenterX, 0.06, -0.09);
  alan4Group.add(lowerKickLeft);

  // Sağ Parça: X = -0.50m ile X = +3.70m arası (L = 4.20m)
  const lowerRearRightLen = catwalkLength / 2 - landingOpenMaxX; // 4.20m
  const lowerRearRightCenterX = landingOpenMaxX + lowerRearRightLen / 2; // 1.60m
  const lowerTopRailRight = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, lowerRearRightLen), railMat);
  lowerTopRailRight.rotation.z = Math.PI / 2;
  lowerTopRailRight.position.set(lowerRearRightCenterX, 1.10, -0.10);
  alan4Group.add(lowerTopRailRight);

  const lowerMidRailRight = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, lowerRearRightLen), railMat);
  lowerMidRailRight.rotation.z = Math.PI / 2;
  lowerMidRailRight.position.set(lowerRearRightCenterX, 0.55, -0.10);
  alan4Group.add(lowerMidRailRight);

  const lowerKickRight = new THREE.Mesh(new THREE.BoxGeometry(lowerRearRightLen, 0.12, 0.02), beamMat);
  lowerKickRight.position.set(lowerRearRightCenterX, 0.06, -0.09);
  alan4Group.add(lowerKickRight);

  // Dikmeler (Açıklık kenarları X = -2.40 ve X = -0.50 dahil)
  [-3.6, landingOpenMinX, landingOpenMaxX, 0.6, 1.8, 3.0, 3.6].forEach(px => {
    const post = new THREE.Mesh(postGeo, railMat);
    post.position.set(px, 0.55, -0.10);
    alan4Group.add(post);
  });

  // Alt Kedi Yolu İniş/Biniş Açıklığı Tutamaçları ve Emniyet Kavisleri (Sahanlığa geçiş yönlendirmesi)
  [landingOpenMinX, landingOpenMaxX].forEach(px => {
    const returnGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.25);
    returnGeo.rotateX(Math.PI / 2);
    const returnBar = new THREE.Mesh(returnGeo, railMat);
    returnBar.position.set(px, 1.10, 0.025);
    alan4Group.add(returnBar);
  });

  // 3.1.1. Alt Kedi Yolu Gemici Merdiveni Çıkıntı İniş Sahanlığı (Konsol Çıkıntılı Platform)
  // Kullanıcı İsteği: "gemici merdiveni alt kedi yolunda hatalı karşılanıyor. İnen boşluga düşer baksana"
  // - Konum: X = [-2.40m, -0.50m] (Genişlik 1.90m, Merkez X = -1.45m - Merdiven stiles X=-1.45 ve dikey kablo merdiveni X=-1.75 TAM MERKEZİNDE KARŞILANIR)
  // - Z ekseninde: Z = [-0.10m, +0.75m] (Derinlik 0.85m, Kedi yolu arkasında 60m taşıyıcı tarafına doğru konsol çıkıntı)
  const projMinX = -2.40;
  const projMaxX = -0.50;
  const projW = projMaxX - projMinX; // 1.90m
  const projCenterX = (projMinX + projMaxX) / 2; // -1.45m (Merdiven aksıyla tam simetrik)
  const projStartZ = -0.10;
  const projEndZ = 0.75;
  const projDepth = projEndZ - projStartZ; // 0.85m
  const projCenterZ = (projStartZ + projEndZ) / 2; // +0.325m

  // Sahanlık taban ızgarası (Alt kedi yolu yürüme düzlemiyle aynı kotta: Y = 0.0m)
  const lowerProjFloor = new THREE.Mesh(new THREE.BoxGeometry(projW, 0.05, projDepth), floorMat);
  lowerProjFloor.position.set(projCenterX, -0.025, projCenterZ);
  lowerProjFloor.receiveShadow = true;
  alan4Group.add(lowerProjFloor);

  // Konsol taşıyıcı çelik kirişler (Ana kedi yolu şasesine alttan bağlanan 3 adet ağır konsol I-kiriş)
  const projBeamGeo = new THREE.BoxGeometry(0.12, 0.14, projDepth + 0.40);
  [projMinX + 0.10, projCenterX, projMaxX - 0.10].forEach(bx => {
    const cBeam = new THREE.Mesh(projBeamGeo, darkSteelMat);
    cBeam.position.set(bx, -0.115, projCenterZ - 0.20);
    alan4Group.add(cBeam);

    // Çapraz rijit payanda strut kolu
    const strutMesh = createPipeHelper(
      new THREE.Vector3(bx, -0.75, -0.30),
      new THREE.Vector3(bx, -0.115, projEndZ - 0.05),
      0.025,
      darkSteelMat
    );
    alan4Group.add(strutMesh);
  });

  // Çıkıntı Sahanlık Dış Çevre Emniyet Korkulukları (Z = +0.75m arka kenar ve yan kenarlar)
  // Arka Kenar Korkuluğu (Z = +0.75m, L = 1.90m)
  const projRearTopRail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, projW), railMat);
  projRearTopRail.rotation.z = Math.PI / 2;
  projRearTopRail.position.set(projCenterX, 1.10, projEndZ);
  alan4Group.add(projRearTopRail);

  const projRearMidRail = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, projW), railMat);
  projRearMidRail.rotation.z = Math.PI / 2;
  projRearMidRail.position.set(projCenterX, 0.55, projEndZ);
  alan4Group.add(projRearMidRail);

  const projRearKick = new THREE.Mesh(new THREE.BoxGeometry(projW, 0.12, 0.02), beamMat);
  projRearKick.position.set(projCenterX, 0.06, projEndZ - 0.01);
  alan4Group.add(projRearKick);

  // Sağ Kenar Korkuluğu (X = -0.50m, Z = [-0.10, +0.75], L = 0.85m)
  const projSideTopRail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, projDepth), railMat);
  projSideTopRail.rotation.x = Math.PI / 2;
  projSideTopRail.position.set(projMaxX, 1.10, projCenterZ);
  alan4Group.add(projSideTopRail);

  const projSideMidRail = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, projDepth), railMat);
  projSideMidRail.rotation.x = Math.PI / 2;
  projSideMidRail.position.set(projMaxX, 0.55, projCenterZ);
  alan4Group.add(projSideMidRail);

  const projSideKick = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, projDepth), beamMat);
  projSideKick.position.set(projMaxX - 0.01, 0.06, projCenterZ);
  alan4Group.add(projSideKick);

  // Sol Kenar Korkuluğu (X = -2.40m, Z = [-0.10, +0.75], L = 0.85m)
  const projLeftTopRail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, projDepth), railMat);
  projLeftTopRail.rotation.x = Math.PI / 2;
  projLeftTopRail.position.set(projMinX, 1.10, projCenterZ);
  alan4Group.add(projLeftTopRail);

  const projLeftMidRail = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, projDepth), railMat);
  projLeftMidRail.rotation.x = Math.PI / 2;
  projLeftMidRail.position.set(projMinX, 0.55, projCenterZ);
  alan4Group.add(projLeftMidRail);

  const projLeftKick = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, projDepth), beamMat);
  projLeftKick.position.set(projMinX + 0.01, 0.06, projCenterZ);
  alan4Group.add(projLeftKick);

  // Sahanlık Dikmeleri
  [
    [projMinX, projEndZ],
    [projCenterX, projEndZ],
    [projMaxX, projEndZ],
    [projMaxX, projStartZ],
    [projMinX, projStartZ]
  ].forEach(([px, pz]) => {
    const post = new THREE.Mesh(postGeo, railMat);
    post.position.set(px, 0.55, pz);
    alan4Group.add(post);
  });

  // 3.2. Yan Kenar Korkulukları (Sol uç X = -3.7m kapalı, Sağ uç X = +3.7m kapalı, 120cm genişlik)
  const sideRailTopGeo = new THREE.CylinderGeometry(0.025, 0.025, catwalkWidth);
  const sideRailMidGeo = new THREE.CylinderGeometry(0.018, 0.018, catwalkWidth);
  const sideKickGeo = new THREE.BoxGeometry(0.02, 0.12, catwalkWidth);

  // Sol Uç (X = -3.7m): 120cm yan korkuluk
  const sTopLeft = new THREE.Mesh(sideRailTopGeo, railMat);
  sTopLeft.rotation.x = Math.PI / 2;
  sTopLeft.position.set(-3.7, 1.10, floorZ);
  alan4Group.add(sTopLeft);

  const sMidLeft = new THREE.Mesh(sideRailMidGeo, railMat);
  sMidLeft.rotation.x = Math.PI / 2;
  sMidLeft.position.set(-3.7, 0.55, floorZ);
  alan4Group.add(sMidLeft);

  const sKickLeft = new THREE.Mesh(sideKickGeo, beamMat);
  sKickLeft.position.set(-3.7, 0.06, floorZ);
  alan4Group.add(sKickLeft);

  [-1.30, -0.70, -0.10].forEach(zPos => {
    const p = new THREE.Mesh(postGeo, railMat);
    p.position.set(-3.7, 0.55, zPos);
    alan4Group.add(p);
  });

  // Sağ Uç (X = +3.7m): 120cm yan korkuluk
  const sTopRight = new THREE.Mesh(sideRailTopGeo, railMat);
  sTopRight.rotation.x = Math.PI / 2;
  sTopRight.position.set(3.7, 1.10, floorZ);
  alan4Group.add(sTopRight);

  const sMidRight = new THREE.Mesh(sideRailMidGeo, railMat);
  sMidRight.rotation.x = Math.PI / 2;
  sMidRight.position.set(3.7, 0.55, floorZ);
  alan4Group.add(sMidRight);

  const sKickRight = new THREE.Mesh(sideKickGeo, beamMat);
  sKickRight.position.set(3.7, 0.06, floorZ);
  alan4Group.add(sKickRight);

  [-1.30, -0.70, -0.10].forEach(zPos => {
    const p = new THREE.Mesh(postGeo, railMat);
    p.position.set(3.7, 0.55, zPos);
    alan4Group.add(p);
  });

  // 3.3. Ön Kenar Korkuluğu ve Güvenlik Bariyeri (Z = -1.30m, X: -3.7m ile +3.7m)
  const sbFrontKick = new THREE.Mesh(new THREE.BoxGeometry(catwalkLength, 0.15, 0.02), beamMat);
  sbFrontKick.position.set(0, 0.075, -1.29);
  alan4Group.add(sbFrontKick);

  for (let x = -3.6; x <= 3.61; x += 1.2) {
    const p = new THREE.Mesh(postGeo, railMat);
    p.position.set(x, 0.55, -1.30);
    alan4Group.add(p);
  }
  const sbFrontMidRail = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, catwalkLength), railMat);
  sbFrontMidRail.rotation.z = Math.PI / 2;
  sbFrontMidRail.position.set(0, 1.10, -1.30);
  alan4Group.add(sbFrontMidRail);

  // 3.4. Fotoğraftaki Alt Saha Aydınlatma Projektörleri (Floodlight Brackets on Lower Front)
  const lightHousingMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 });
  const lightGlassMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, emissive: 0xffffee, emissiveIntensity: 0.3 });
  const bracketMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });

  for (let lx = -5.5; lx <= 5.51; lx += 1.1) {
    // Konsol braketi
    const brk = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.10, 0.40), bracketMat);
    brk.position.set(lx, -0.65, -2.10);
    alan4Group.add(brk);

    // Projektör gövdesi (açılı, sahaya bakan)
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 0.20), lightHousingMat);
    housing.rotation.x = -Math.PI / 6; // Sahaya doğru eğik
    housing.position.set(lx, -0.75, -2.35);
    alan4Group.add(housing);

    const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.22), lightGlassMat);
    glass.rotation.x = -Math.PI / 6 + Math.PI;
    glass.position.set(lx, -0.75, -2.46);
    alan4Group.add(glass);
  }

  // =========================================================================
  // 4. DEV SCOREBOARD (GENİŞLİK: 13 METRE, YÜKSEKLİK: 8 METRE, DERİNLİK: 12.5 CM)
  // =========================================================================
  const sbWidth = 13.0;
  const sbHeight = 8.0;
  const sbDepth = 0.125;
  const sbYCenter = 3.0; // Y = -1.0m'den Y = +7.0m'ye kadar (8.0m yükseklik)
  const sbZCenter = -2.7625; // Silindir 1'in önünde konumlandırılmış

  // Ana Kasa
  const sbCabinetMat = new THREE.MeshStandardMaterial({ 
    color: 0x0f172a, 
    roughness: 0.5, 
    metalness: 0.8 
  });
  const sbBox = new THREE.Mesh(new THREE.BoxGeometry(sbWidth, sbHeight, sbDepth), sbCabinetMat);
  sbBox.position.set(0, sbYCenter, sbZCenter);
  sbBox.castShadow = true;
  sbBox.receiveShadow = true;
  alan4Group.add(sbBox);

  // Ön Çerçeve (Bezel)
  const bezelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 });
  const bezelTop = new THREE.Mesh(new THREE.BoxGeometry(sbWidth + 0.08, 0.05, 0.03), bezelMat);
  bezelTop.position.set(0, sbYCenter + sbHeight / 2, sbZCenter - sbDepth / 2 - 0.015);
  alan4Group.add(bezelTop);

  const bezelBottom = bezelTop.clone();
  bezelBottom.position.y = sbYCenter - sbHeight / 2;
  alan4Group.add(bezelBottom);

  const bezelSideGeo = new THREE.BoxGeometry(0.05, sbHeight + 0.08, 0.03);
  const bezelLeft = new THREE.Mesh(bezelSideGeo, bezelMat);
  bezelLeft.position.set(-sbWidth / 2, sbYCenter, sbZCenter - sbDepth / 2 - 0.015);
  alan4Group.add(bezelLeft);

  const bezelRight = bezelLeft.clone();
  bezelRight.position.x = sbWidth / 2;
  alan4Group.add(bezelRight);

  // Dev LED Ekran Yüzeyi (13m x 8m, sahaya / -Z yönüne bakar)
  const sbTexture = createScoreboardTexture();
  const screenMat = new THREE.MeshBasicMaterial({ 
    map: sbTexture, 
    side: THREE.FrontSide 
  });
  const screenGeo = new THREE.PlaneGeometry(sbWidth - 0.04, sbHeight - 0.04);
  const screenMesh = new THREE.Mesh(screenGeo, screenMat);
  screenMesh.rotation.y = Math.PI; // Face -Z
  screenMesh.position.set(0, sbYCenter, sbZCenter - sbDepth / 2 - 0.002);
  alan4Group.add(screenMesh);

  // =========================================================================
  // 5. SCOREBOARD ARKA ÇELİK TAŞIYICI VE MODÜLER KAFES SİSTEMİ (FOTOĞRAF BAZLI)
  // - Sadece yatay ve dikey çelik akslar (çapraz/diyagonal yok)
  // - Kedi yoluna müdahale edilmeden skorbord boyutuna (13x8m) tam ölçeklendirilmiş
  // =========================================================================
  const rearZ = sbZCenter + sbDepth / 2; // -2.70m (Skorbord arka yüzü)

  const sbRearGroup = new THREE.Group();
  sbRearGroup.name = 'scoreboardRearFramework';

  // Arka aksam malzemeleri
  const steelWhiteMat = new THREE.MeshStandardMaterial({ color: 0xebedf0, roughness: 0.42, metalness: 0.35 });
  const steelJointMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.45, metalness: 0.65 });
  const cabinetBackMat = new THREE.MeshStandardMaterial({ color: 0x1e2229, roughness: 0.70, metalness: 0.25 });

  // 5.1. 144 Adet Modüler LED Arka Servis Kapağı / Panel Grubu (12 sütun x 12 sıra)
  const panelW = 1.03;
  const panelH = 0.62;
  const panelD = 0.025;
  const panelGeo = new THREE.BoxGeometry(panelW, panelH, panelD);
  const panelsInstanced = new THREE.InstancedMesh(panelGeo, cabinetBackMat, 144);

  const colSpacing = sbWidth / 12; // ~1.0833m
  const rowSpacing = sbHeight / 12; // ~0.6667m
  const startX = -sbWidth / 2 + colSpacing / 2; // -5.9583m
  const startY = sbYCenter - sbHeight / 2 + rowSpacing / 2; // -0.6667m

  let instanceIdx = 0;
  const dummy = new THREE.Object3D();

  for (let c = 0; c < 12; c++) {
    const px = startX + c * colSpacing;
    for (let r = 0; r < 12; r++) {
      const py = startY + r * rowSpacing;
      dummy.position.set(px, py, rearZ + panelD / 2);
      dummy.updateMatrix();
      panelsInstanced.setMatrixAt(instanceIdx++, dummy.matrix);
    }
  }
  panelsInstanced.instanceMatrix.needsUpdate = true;
  sbRearGroup.add(panelsInstanced);

  // 5.2. Dış Çevre Çelik Çerçevesi (120x80mm Kutu Profil)
  const perimThick = 0.08;
  const perimW = 0.12;
  const pZ = rearZ + 0.04;

  // Üst ve Alt Çevre Kirişi
  const horizPerimGeo = new THREE.BoxGeometry(sbWidth, perimW, perimThick);
  const topPerim = new THREE.Mesh(horizPerimGeo, steelWhiteMat);
  topPerim.position.set(0, sbYCenter + sbHeight / 2 - perimW / 2, pZ);
  sbRearGroup.add(topPerim);

  const botPerim = new THREE.Mesh(horizPerimGeo, steelWhiteMat);
  botPerim.position.set(0, sbYCenter - sbHeight / 2 + perimW / 2, pZ);
  sbRearGroup.add(botPerim);

  // Sol ve Sağ Çevre Kolonu
  const vertPerimGeo = new THREE.BoxGeometry(perimW, sbHeight, perimThick);
  const leftPerim = new THREE.Mesh(vertPerimGeo, steelWhiteMat);
  leftPerim.position.set(-sbWidth / 2 + perimW / 2, sbYCenter, pZ);
  sbRearGroup.add(leftPerim);

  const rightPerim = new THREE.Mesh(vertPerimGeo, steelWhiteMat);
  rightPerim.position.set(sbWidth / 2 - perimW / 2, sbYCenter, pZ);
  sbRearGroup.add(rightPerim);

  // 5.3. Ana Yatay Taşıyıcı Kuşak Kirişleri (3 Ana Kuşak: Y = 1.0m, 3.0m, 5.0m)
  const primGirderGeo = new THREE.BoxGeometry(sbWidth, 0.14, 0.08);
  const midGirderGeo = new THREE.BoxGeometry(sbWidth, 0.20, 0.09); // Merkez kuşağı fotoğraftaki gibi çiftli/kalın
  [1.0, 3.0, 5.0].forEach(gy => {
    const isMid = (gy === 3.0);
    const girder = new THREE.Mesh(isMid ? midGirderGeo : primGirderGeo, steelWhiteMat);
    girder.position.set(0, gy, rearZ + 0.05);
    sbRearGroup.add(girder);
  });

  // 5.4. İkincil Yatay Alt Kayıtlar (8 Adet Düz Kılavuz Ray)
  const subRailGeo = new THREE.BoxGeometry(sbWidth, 0.06, 0.04);
  const subYs = [-0.33, 0.33, 1.67, 2.33, 3.67, 4.33, 5.67, 6.33];
  subYs.forEach(sy => {
    const rail = new THREE.Mesh(subRailGeo, steelWhiteMat);
    rail.position.set(0, sy, rearZ + 0.035);
    sbRearGroup.add(rail);
  });

  // 5.5. Düşey Taşıyıcı Ara Kolonlar ve Birleşim Düğümleri (11 Adet Düşey Aks: her 1.0833m'de bir)
  const vertColGeo = new THREE.BoxGeometry(0.08, sbHeight, 0.06);
  const gussetGeo = new THREE.BoxGeometry(0.18, 0.18, 0.015);

  for (let c = 1; c < 12; c++) {
    const vx = -sbWidth / 2 + c * colSpacing;
    const col = new THREE.Mesh(vertColGeo, steelWhiteMat);
    col.position.set(vx, sbYCenter, rearZ + 0.06);
    sbRearGroup.add(col);

    // Ana yatay kuşaklarla kesişim düğüm levhaları (Gusset plates)
    [1.0, 3.0, 5.0].forEach(gy => {
      const gusset = new THREE.Mesh(gussetGeo, steelJointMat);
      gusset.position.set(vx, gy, rearZ + 0.095);
      sbRearGroup.add(gusset);
    });
  }

  // =========================================================================
  // 5.6. 40 CM GERİDE (KEDİ YOLUNA YAKIN) KONUMLU KALIN YATAY ÇELİK KUŞAK VE KAFES KATMANI
  // - Mevcut ön ızgara korunarak, ek olarak 40 cm daha geriden (+Z yönü, kedi yoluna doğru)
  //   kalın yatay ana kuşaklar, bağlantı kovanları (Z-spacer) ve ara düşey dikmeler
  // =========================================================================
  const offsetDist = 0.40; // 40 cm geride
  const frontGirderZ = rearZ + 0.05; // -2.65m
  const offsetZ = frontGirderZ + offsetDist; // -2.25m

  const heavyBeamMat = new THREE.MeshStandardMaterial({ 
    color: 0xdde1e6, 
    roughness: 0.40, 
    metalness: 0.40 
  });

  const sbOffsetRearGroup = new THREE.Group();
  sbOffsetRearGroup.name = 'scoreboardOffsetRearFramework';

  // 1. 40 cm Gerideki Kalın Yatay Ana Taşıyıcı Kirişler (Girders)
  const offsetGirderLevels = [
    { y: -0.85, h: 0.16, d: 0.10, isCenter: false },
    { y: 1.00,  h: 0.18, d: 0.10, isCenter: false }, // Korkuluk hizasındaki yatay destek
    { y: 1.70,  h: 0.16, d: 0.10, isCenter: false, isRRURail: false }, // Korkuluk hizası (Y=1.0) ile merkez kuşak (Y=3.0) arası %35-%65 ara yatay destek
    { y: 3.00,  h: 0.28, d: 0.12, isCenter: true  }, // Fotoğraftaki merkez çiftli çok kalın ana kuşak
    { y: 5.00,  h: 0.18, d: 0.10, isCenter: false },
    { y: 6.85,  h: 0.16, d: 0.10, isCenter: false }
  ];

  offsetGirderLevels.forEach(g => {
    const geo = new THREE.BoxGeometry(sbWidth, g.h, g.d);
    const mesh = new THREE.Mesh(geo, g.isCenter ? heavyBeamMat : steelWhiteMat);
    mesh.position.set(0, g.y, offsetZ);
    sbOffsetRearGroup.add(mesh);

    // RRU Montaj Ekseni için Unistrut kılavuz rayı ve montaj yuvaları (Y = 1.70m kirişi üzerinde)
    if (g.isRRURail) {
      const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.35, metalness: 0.85 });
      const rruRail = new THREE.Mesh(new THREE.BoxGeometry(sbWidth, 0.04, 0.015), railMat);
      rruRail.name = 'scoreboardRRURailUnistrut';
      rruRail.position.set(0, g.y, offsetZ + g.d / 2 + 0.008);
      sbOffsetRearGroup.add(rruRail);

      // Kılavuz montaj yuvaları (her 25cm'de bir sarı montaj işaret yuvaları)
      const slotMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4, metalness: 0.6 });
      const slotGeo = new THREE.BoxGeometry(0.015, 0.02, 0.018);
      const slotInstanced = new THREE.InstancedMesh(slotGeo, slotMat, 51);
      const dummySlot = new THREE.Object3D();
      for (let s = 0; s < 51; s++) {
        const sx = -6.25 + s * 0.25;
        dummySlot.position.set(sx, g.y, offsetZ + g.d / 2 + 0.012);
        dummySlot.updateMatrix();
        slotInstanced.setMatrixAt(s, dummySlot.matrix);
      }
      slotInstanced.instanceMatrix.needsUpdate = true;
      sbOffsetRearGroup.add(slotInstanced);
    }
  });

  // 2. Ön Katman ile 40 cm Gerideki Katmanı Birbirine Bağlayan Yatay Z-Bağlantı Elemanları (Spacers)
  const spacerGeo = new THREE.BoxGeometry(0.08, 0.12, offsetDist);
  for (let c = 1; c < 12; c++) {
    const vx = -sbWidth / 2 + c * colSpacing;
    offsetGirderLevels.forEach(g => {
      const spacer = new THREE.Mesh(spacerGeo, steelJointMat);
      spacer.position.set(vx, g.y, (frontGirderZ + offsetZ) / 2);
      sbOffsetRearGroup.add(spacer);
    });
  }

  // 3. 40 cm Gerideki Katmanın Düşey Rijitlik Dikmeleri ve Düğüm Plakaları
  const offsetVertPostGeo = new THREE.BoxGeometry(0.08, sbHeight, 0.08);
  for (let c = 1; c < 12; c++) {
    const vx = -sbWidth / 2 + c * colSpacing;
    const vPost = new THREE.Mesh(offsetVertPostGeo, steelWhiteMat);
    vPost.position.set(vx, sbYCenter, offsetZ);
    sbOffsetRearGroup.add(vPost);

    // Kesişim düğüm sacları
    offsetGirderLevels.forEach(g => {
      const gusset = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.015), steelJointMat);
      gusset.position.set(vx, g.y, offsetZ + 0.05);
      sbOffsetRearGroup.add(gusset);
    });
  }

  sbRearGroup.add(sbOffsetRearGroup);

  // 5.7. Alt Taşıyıcı Konsol Kollar ve Dikmeler (Silindir 1 ile Skorbord Tabanını Bağlayan Yatay ve Dikey Kirişler)
  for (let x = -5.42; x <= 5.43; x += 2.1666) {
    // Silindir 1'e uzanan rijit yatay I-profil konsol kol (Z = -2.70m'den Z = -1.67m'ye)
    const armLen = Math.abs(-1.67 - rearZ); // ~1.03m
    const armGeo = new THREE.BoxGeometry(0.16, 0.18, armLen);
    const arm = new THREE.Mesh(armGeo, steelJointMat);
    arm.position.set(x, 0.0, (rearZ + -1.67) / 2);
    sbRearGroup.add(arm);

    // Skorbord alt kenarı düşey taşıyıcı dikme desteği
    const stanchionGeo = new THREE.BoxGeometry(0.14, 1.20, 0.14);
    const stanchion = new THREE.Mesh(stanchionGeo, steelJointMat);
    stanchion.position.set(x, -0.50, rearZ + 0.10);
    sbRearGroup.add(stanchion);
  }

  alan4Group.add(sbRearGroup);
  // (Skorboard RRU'lar kaldırılıp Alternatif 2 kedi yolu bloğu senaryosuna geçildiğinden skorbord üzeri RRU feeder hatları devre dışı bırakıldı)

  // 6.1. ALAN 2: 2 TAŞIYICI SİLİNDİR BORU ARASI 20'LİK TAVA VE POI'DEN ANTENLERE 14'ER ADET 1/2" FEEDER SİSTEMİ (SOL VE SAĞ KANAT)
  const leftPoiAntennaFeederCabling = buildScoreboardPoiToCylinderAntennaFeederSystem('left');
  alan4Group.add(leftPoiAntennaFeederCabling);

  const rightPoiAntennaFeederCabling = buildScoreboardPoiToCylinderAntennaFeederSystem('right');
  alan4Group.add(rightPoiAntennaFeederCabling);

  // YARDIMCI BORU OLUŞTURUCU (Kafes ve Strut Boruları İçin)
  function createPipeHelper(p1, p2, radius, mat) {
    const dir = new THREE.Vector3().subVectors(p2, p1);
    const len = dir.length();
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    const geo = new THREE.CylinderGeometry(radius, radius, len, 16);
    const mesh = new THREE.Mesh(geo, mat);
    const yAxis = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(yAxis, dir.clone().normalize());
    mesh.quaternion.copy(quat);
    mesh.position.copy(mid);
    mesh.castShadow = true;
    return mesh;
  }

  // =========================================================================
  // 7. ÜST KEDİ YOLU (SKORBOARDIN TAM ÜST KOTUNDAN +0.5M YÜKSEKTE, Y = 7.50M)
  // - Skorboard üst kotu Y = 7.0m -> Üst kedi yolu yürüme kotu Y = 7.50m (Kot +27.50m)
  // - Alttakine tam paralel: 120 cm genişlik, 7.4m boy (X: -3.7m ile +3.7m, Z: -1.30m ile -0.10m)
  // - Düşey taşıyıcı çelik kolonlarla alt taşıyıcı gövdeye rijit bağlanır
  // =========================================================================
  const upperCatwalkGroup = new THREE.Group();
  upperCatwalkGroup.name = 'scoreboardUpperCatwalk';

  const upperCwWalkY = 7.50; // Skorboardın 0.5m üstü
  const upperFloor = new THREE.Mesh(floorGeo, floorMat);
  upperFloor.position.set(0, upperCwWalkY, floorZ);
  upperFloor.receiveShadow = true;
  upperCatwalkGroup.add(upperFloor);

  // Boyuna kenar kirişleri (Arka Z = -0.10m, Ön Z = -1.30m)
  const upperRearBeam = new THREE.Mesh(longBeamGeo, beamMat);
  upperRearBeam.position.set(0, upperCwWalkY + 0.065, -0.10);
  upperCatwalkGroup.add(upperRearBeam);

  const upperFrontBeam = upperRearBeam.clone();
  upperFrontBeam.position.z = -1.30;
  upperCatwalkGroup.add(upperFrontBeam);

  // Enine taşıyıcı kirişler ve alt bağlantı konsolları (her 1.85m'de bir)
  const upperTransBeamGeo = new THREE.BoxGeometry(0.18, 0.16, catwalkWidth + 0.20);
  for (let x = -3.6; x <= 3.61; x += 1.8) {
    const utBeam = new THREE.Mesh(upperTransBeamGeo, darkSteelMat);
    utBeam.position.set(x, upperCwWalkY - 0.10, floorZ);
    upperCatwalkGroup.add(utBeam);

    // Düşey taşıyıcı ana kolonlar (Silindir/kedi yolu altından üst kedi yoluna uzanan ana dikmeler)
    if (Math.abs(x) > 2.0) {
      const vStanchionGeo = new THREE.BoxGeometry(0.18, upperCwWalkY + 0.10, 0.18);
      const vStanchion = new THREE.Mesh(vStanchionGeo, beamMat);
      vStanchion.position.set(x, (upperCwWalkY - 0.10) / 2, -0.65);
      upperCatwalkGroup.add(vStanchion);
    }
  }

  // 7.1. Üst Kedi Yolu Emniyet Korkulukları (1.10m Sarı Korkuluklar)
  const upperRailTopY = upperCwWalkY + 1.10;
  const upperRailMidY = upperCwWalkY + 0.55;

  // Ön Kenar Korkuluğu (Z = -1.30m, 7.4m boydan boya tam kapalı)
  const upperTopRailFront = new THREE.Mesh(topRailRearGeo, railMat);
  upperTopRailFront.rotation.z = Math.PI / 2;
  upperTopRailFront.position.set(0, upperRailTopY, -1.30);
  upperCatwalkGroup.add(upperTopRailFront);

  const upperMidRailFront = new THREE.Mesh(midRailRearGeo, railMat);
  upperMidRailFront.rotation.z = Math.PI / 2;
  upperMidRailFront.position.set(0, upperRailMidY, -1.30);
  upperCatwalkGroup.add(upperMidRailFront);

  const upperKickFront = new THREE.Mesh(new THREE.BoxGeometry(catwalkLength, 0.12, 0.02), beamMat);
  upperKickFront.position.set(0, upperCwWalkY + 0.06, -1.29);
  upperCatwalkGroup.add(upperKickFront);

  for (let x = -3.6; x <= 3.61; x += 1.2) {
    const pMesh = new THREE.Mesh(postGeo, railMat);
    pMesh.position.set(x, upperCwWalkY + 0.55, -1.30);
    upperCatwalkGroup.add(pMesh);
  }

  // Yan Kenar Korkulukları (Sol uç X = -3.7m ve Sağ uç X = +3.7m kapalı)
  [-3.7, 3.7].forEach(sx => {
    const sTop = new THREE.Mesh(sideRailTopGeo, railMat);
    sTop.rotation.x = Math.PI / 2;
    sTop.position.set(sx, upperRailTopY, floorZ);
    upperCatwalkGroup.add(sTop);

    const sMid = new THREE.Mesh(sideRailMidGeo, railMat);
    sMid.rotation.x = Math.PI / 2;
    sMid.position.set(sx, upperRailMidY, floorZ);
    upperCatwalkGroup.add(sMid);

    const sKick = new THREE.Mesh(sideKickGeo, beamMat);
    sKick.position.set(sx, upperCwWalkY + 0.06, floorZ);
    upperCatwalkGroup.add(sKick);

    [-0.50, 0.50].forEach(dz => {
      const sp = new THREE.Mesh(postGeo, railMat);
      sp.position.set(sx, upperCwWalkY + 0.55, floorZ + dz);
      upperCatwalkGroup.add(sp);
    });
  });

  // Arka Kenar Korkuluğu (Z = -0.10m, Gemici Merdiveni İniş/Biniş Açıklığı X = [-2.40m, -0.50m] 1.90m Tam Açık)
  const upperLandingOpenMinX = -2.40;
  const upperLandingOpenMaxX = -0.50;

  // Sol Parça: X = -3.7m ile -2.40m arası (L = 1.30m)
  const upperRearLeftLen = upperLandingOpenMinX - (-catwalkLength / 2); // 1.30m
  const upperRearLeftCenterX = -catwalkLength / 2 + upperRearLeftLen / 2; // -3.05m
  const rTopLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, upperRearLeftLen), railMat);
  rTopLeft.rotation.z = Math.PI / 2;
  rTopLeft.position.set(upperRearLeftCenterX, upperRailTopY, -0.10);
  upperCatwalkGroup.add(rTopLeft);

  const rMidLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, upperRearLeftLen), railMat);
  rMidLeft.rotation.z = Math.PI / 2;
  rMidLeft.position.set(upperRearLeftCenterX, upperRailMidY, -0.10);
  upperCatwalkGroup.add(rMidLeft);

  const upperKickLeft = new THREE.Mesh(new THREE.BoxGeometry(upperRearLeftLen, 0.12, 0.02), beamMat);
  upperKickLeft.position.set(upperRearLeftCenterX, upperCwWalkY + 0.06, -0.09);
  upperCatwalkGroup.add(upperKickLeft);

  // Sağ Parça: X = -0.50m ile +3.7m arası (L = 4.20m)
  const upperRearRightLen = catwalkLength / 2 - upperLandingOpenMaxX; // 4.20m
  const upperRearRightCenterX = upperLandingOpenMaxX + upperRearRightLen / 2; // 1.60m
  const rTopRight = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, upperRearRightLen), railMat);
  rTopRight.rotation.z = Math.PI / 2;
  rTopRight.position.set(upperRearRightCenterX, upperRailTopY, -0.10);
  upperCatwalkGroup.add(rTopRight);

  const rMidRight = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, upperRearRightLen), railMat);
  rMidRight.rotation.z = Math.PI / 2;
  rMidRight.position.set(upperRearRightCenterX, upperRailMidY, -0.10);
  upperCatwalkGroup.add(rMidRight);

  const upperKickRight = new THREE.Mesh(new THREE.BoxGeometry(upperRearRightLen, 0.12, 0.02), beamMat);
  upperKickRight.position.set(upperRearRightCenterX, upperCwWalkY + 0.06, -0.09);
  upperCatwalkGroup.add(upperKickRight);

  // Dikmeler (Açıklık kenarları X = -2.40 ve X = -0.50 dahil)
  [-3.6, upperLandingOpenMinX, upperLandingOpenMaxX, 0.6, 1.8, 3.0, 3.6].forEach(px => {
    const pMesh = new THREE.Mesh(postGeo, railMat);
    pMesh.position.set(px, upperCwWalkY + 0.55, -0.10);
    upperCatwalkGroup.add(pMesh);
  });

  // Üst Kedi Yolu İniş Açıklığı Tutamaçları ve Emniyet Kavisleri (Sahanlığa geçiş yönlendirmesi)
  [upperLandingOpenMinX, upperLandingOpenMaxX].forEach(px => {
    const returnGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.25);
    returnGeo.rotateX(Math.PI / 2);
    const returnBar = new THREE.Mesh(returnGeo, railMat);
    returnBar.position.set(px, upperRailTopY, 0.025);
    upperCatwalkGroup.add(returnBar);
  });

  // 7.1.1. Üst Kedi Yolu Gemici Merdiveni Çıkıntı İniş Sahanlığı (Konsol Çıkıntılı Platform)
  // Konum: X = [-2.40m, -0.50m], Z = [-0.10m, +0.75m], Kot: Y = 7.50m (60m taşıyıcı tarafına doğru +0.85m konsol çıkıntı)
  const upperProjFloor = new THREE.Mesh(new THREE.BoxGeometry(projW, 0.05, projDepth), floorMat);
  upperProjFloor.position.set(projCenterX, upperCwWalkY - 0.025, projCenterZ);
  upperProjFloor.receiveShadow = true;
  upperCatwalkGroup.add(upperProjFloor);

  // Üst Konsol Taşıyıcı Çelik Kirişler (3 adet konsol kiriş)
  [projMinX + 0.10, projCenterX, projMaxX - 0.10].forEach(bx => {
    const cBeam = new THREE.Mesh(projBeamGeo, darkSteelMat);
    cBeam.position.set(bx, upperCwWalkY - 0.115, projCenterZ - 0.20);
    upperCatwalkGroup.add(cBeam);

    // Çapraz payanda kolu
    const strutMesh = createPipeHelper(
      new THREE.Vector3(bx, upperCwWalkY - 0.75, -0.30),
      new THREE.Vector3(bx, upperCwWalkY - 0.115, projEndZ - 0.05),
      0.025,
      darkSteelMat
    );
    upperCatwalkGroup.add(strutMesh);
  });

  // Üst Çıkıntı Sahanlık Dış Çevre Emniyet Korkulukları (Z = +0.75m, X = -0.50m, X = -2.40m)
  const upperProjRearTopRail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, projW), railMat);
  upperProjRearTopRail.rotation.z = Math.PI / 2;
  upperProjRearTopRail.position.set(projCenterX, upperRailTopY, projEndZ);
  upperCatwalkGroup.add(upperProjRearTopRail);

  const upperProjRearMidRail = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, projW), railMat);
  upperProjRearMidRail.rotation.z = Math.PI / 2;
  upperProjRearMidRail.position.set(projCenterX, upperRailMidY, projEndZ);
  upperCatwalkGroup.add(upperProjRearMidRail);

  const upperProjRearKick = new THREE.Mesh(new THREE.BoxGeometry(projW, 0.12, 0.02), beamMat);
  upperProjRearKick.position.set(projCenterX, upperCwWalkY + 0.06, projEndZ - 0.01);
  upperCatwalkGroup.add(upperProjRearKick);

  // Sağ Kenar Korkuluğu (X = -0.50m)
  const upperProjSideTopRail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, projDepth), railMat);
  upperProjSideTopRail.rotation.x = Math.PI / 2;
  upperProjSideTopRail.position.set(projMaxX, upperRailTopY, projCenterZ);
  upperCatwalkGroup.add(upperProjSideTopRail);

  const upperProjSideMidRail = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, projDepth), railMat);
  upperProjSideMidRail.rotation.x = Math.PI / 2;
  upperProjSideMidRail.position.set(projMaxX, upperRailMidY, projCenterZ);
  upperCatwalkGroup.add(upperProjSideMidRail);

  const upperProjSideKick = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, projDepth), beamMat);
  upperProjSideKick.position.set(projMaxX - 0.01, upperCwWalkY + 0.06, projCenterZ);
  upperCatwalkGroup.add(upperProjSideKick);

  // Sol Kenar Korkuluğu (X = -2.40m)
  const upperProjLeftTopRail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, projDepth), railMat);
  upperProjLeftTopRail.rotation.x = Math.PI / 2;
  upperProjLeftTopRail.position.set(projMinX, upperRailTopY, projCenterZ);
  upperCatwalkGroup.add(upperProjLeftTopRail);

  const upperProjLeftMidRail = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, projDepth), railMat);
  upperProjLeftMidRail.rotation.x = Math.PI / 2;
  upperProjLeftMidRail.position.set(projMinX, upperRailMidY, projCenterZ);
  upperCatwalkGroup.add(upperProjLeftMidRail);

  const upperProjLeftKick = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, projDepth), beamMat);
  upperProjLeftKick.position.set(projMinX + 0.01, upperCwWalkY + 0.06, projCenterZ);
  upperCatwalkGroup.add(upperProjLeftKick);

  // Üst Sahanlık Dikmeleri
  [
    [projMinX, projEndZ],
    [projCenterX, projEndZ],
    [projMaxX, projEndZ],
    [projMaxX, projStartZ],
    [projMinX, projStartZ]
  ].forEach(([px, pz]) => {
    const post = new THREE.Mesh(postGeo, railMat);
    post.position.set(px, upperCwWalkY + 0.55, pz);
    upperCatwalkGroup.add(post);
  });

  alan4Group.add(upperCatwalkGroup);

  // =========================================================================
  // 8. GEMİCİ MERDİVENİ VE OVAL SIFIR KORUMA KAFESİ (KEDİ YOLU DIŞINDA, 60M TAŞIYICI TARAFINDA)
  // Kullanıcı İsteği: "gemici merdivenini kedi yolunun yanına koy içine degil 60 metrelik taşıyıcının olldugu tarafa fogru yerleştir. Alttaki kedi yolunu da ona göre inecek kadar kısmını çıkıntı şeklinde genişlet"
  // - Konum: X = -1.45m aksında
  // - Z ekseninde konum: Z = [+0.10m, +0.60m] (Kedi yolu yürüyüş alanının [Z=-1.30, -0.10] tamamen DIŞINDA, +Z yönünde çıkıntılı sahanlık üzerinde)
  // - Tırmanıcı Yönü: +X yönüne (çıkıntı sahanlık zeminine doğru) bakar
  // - Sırt koruma kafesi: Tırmanıcının arkasında -X yönünde açılır
  // - Alt kot Y = 0.0m'den üst kedi yolu Y = 7.50m'ye kadar kesintisiz 7.5m tırmanış
  // =========================================================================
  const ladderGroup = new THREE.Group();
  ladderGroup.name = 'safetyCagedLadder';

  const ladderX = -1.45;
  const ladderW = 0.50; // 50 cm basamak genişliği
  const ladderZ1 = 0.10; // Kedi yolu arka kenarına yakın iç dikme
  const ladderZ2 = 0.60; // Dış dikme (+Z yönünde, çıkıntı sahanlığın dış sınırında)
  const ladderCenterZ = (ladderZ1 + ladderZ2) / 2; // +0.35m (Tamamen kedi yolu dışında)
  const ladderTopY = 7.50;
  const stileTopY = 8.60; // Üst kedi yolu korkuluğu (8.60m) seviyesine kadar yükselir

  // Dikey Ana Taşıyıcı Dikmeler (Stiles - Ø44mm Boru)
  const stileGeo = new THREE.CylinderGeometry(0.022, 0.022, stileTopY, 16);
  const stileFront = new THREE.Mesh(stileGeo, railMat);
  stileFront.position.set(ladderX, stileTopY / 2, ladderZ1);
  ladderGroup.add(stileFront);

  const stileRear = new THREE.Mesh(stileGeo, railMat);
  stileRear.position.set(ladderX, stileTopY / 2, ladderZ2);
  ladderGroup.add(stileRear);
  // Alt Taban Montaj Flanşları ve Ankraj Civataları (Platform zeminine rijit sabitleme: Y = 0.0m)
  const baseFlangeGeo = new THREE.BoxGeometry(0.12, 0.016, 0.12);
  const boltGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.03, 8);
  [ladderZ1, ladderZ2].forEach(sz => {
    const flange = new THREE.Mesh(baseFlangeGeo, darkSteelMat);
    flange.position.set(ladderX, 0.008, sz);
    flange.receiveShadow = true;
    ladderGroup.add(flange);

    [-0.04, 0.04].forEach(bx => {
      [-0.04, 0.04].forEach(bz => {
        const bolt = new THREE.Mesh(boltGeo, beamMat);
        bolt.position.set(ladderX + bx, 0.02, sz + bz);
        ladderGroup.add(bolt);
      });
    });
  });


  // Üst Kedi Yolu İniş Geçiş Kolları (Walk-through Handrail Extensions at Y = 8.60m, +X yönüne kavisli tutamaç)
  [ladderZ1, ladderZ2].forEach(sz => {
    const extPts = [
      new THREE.Vector3(ladderX, stileTopY, sz),
      new THREE.Vector3(ladderX + 0.12, stileTopY + 0.08, sz),
      new THREE.Vector3(ladderX + 0.30, stileTopY + 0.02, sz),
      new THREE.Vector3(ladderX + 0.30, upperCwWalkY + 1.10, sz)
    ];
    const extCurve = new THREE.CatmullRomCurve3(extPts);
    const extMesh = new THREE.Mesh(new THREE.TubeGeometry(extCurve, 16, 0.02, 8, false), railMat);
    ladderGroup.add(extMesh);
  });

  // Üst Kedi Yolu İniş Girişi Yaylı Emniyet Kapısı (Self-Closing Safety Swing Gate - EN ISO 14122-4)
  const gateBarGeo = new THREE.CylinderGeometry(0.015, 0.015, ladderW - 0.06);
  gateBarGeo.rotateX(Math.PI / 2);
  const gateBar = new THREE.Mesh(gateBarGeo, railMat);
  gateBar.position.set(ladderX + 0.30, upperCwWalkY + 0.85, ladderCenterZ);
  ladderGroup.add(gateBar);

  const gateHingeGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.12);
  const gateHinge = new THREE.Mesh(gateHingeGeo, darkSteelMat);
  gateHinge.position.set(ladderX + 0.30, upperCwWalkY + 0.85, ladderZ2);
  ladderGroup.add(gateHinge);

  // Kaymaz Tırtıklı Basamaklar (Her 28 cm'de bir, Z ekseninde 50cm genişlik, Z = [+0.10, +0.60])
  const rungStep = 0.28;
  const ladderRungGeo = new THREE.CylinderGeometry(0.012, 0.012, ladderW - 0.04, 12);
  ladderRungGeo.rotateX(Math.PI / 2); // Z ekseni boyunca uzanır
  for (let ry = rungStep; ry <= ladderTopY + 0.05; ry += rungStep) {
    const rung = new THREE.Mesh(ladderRungGeo, darkSteelMat);
    rung.position.set(ladderX, ry, ladderCenterZ);
    ladderGroup.add(rung);
  }

  // Merdiven Sabitleme Konsolları (Standoffs - Çıkıntı sahanlık taşıyıcı kirişlerine -X yönünde rijit sabitleme)
  const standoffGeo = new THREE.BoxGeometry(0.18, 0.04, 0.04);
  [1.0, 2.5, 4.0, 5.5, 7.0].forEach(sy => {
    [ladderZ1, ladderZ2].forEach(sz => {
      const so = new THREE.Mesh(standoffGeo, darkSteelMat);
      so.position.set(ladderX - 0.09, sy, sz);
      ladderGroup.add(so);
    });
  });

  // OVAL SIRT KORUMA ÇEMBERLERİ (Hoops - Y = 2.20m'den başlar, her 90cm'de bir, -X yönünde açılır)
  // Kullanıcı İsteği: "merdibene bir de oval koruma koy"
  const hoopR = 0.35; // 70cm dış genişlik (Z ekseninde)
  const hoopDepth = 0.40; // Tırmanıcı sırt boşluğu derinliği (-X yönünde)
  const hoopLevels = [2.20, 3.10, 4.00, 4.90, 5.80, 6.70, 7.50]; // Y=7.50m üst kedi yolu kotunda açık kavisle biter

  function buildOvalHoopRotated(hy, isTopFlare = false) {
    const hPoints = [];
    const rScale = isTopFlare ? 1.25 : 1.0;
    const rH = hoopR * rScale;
    const dH = hoopDepth * rScale;

    // Dış dikmeye (ladderZ2 = +0.60m) bağlantı
    hPoints.push(new THREE.Vector3(ladderX, hy, ladderZ2));
    hPoints.push(new THREE.Vector3(ladderX - 0.15, hy, ladderCenterZ + rH));
    hPoints.push(new THREE.Vector3(ladderX - dH, hy, ladderCenterZ + rH));

    // Oval arka yay (-X yönünde kubbe, 12 nokta)
    const segments = 12;
    for (let i = 0; i <= segments; i++) {
      const alpha = (i / segments) * Math.PI; // 0 -> PI
      const px = ladderX - dH - Math.sin(alpha) * rH;
      const pz = ladderCenterZ + Math.cos(alpha) * rH;
      hPoints.push(new THREE.Vector3(px, hy, pz));
    }

    // İç dikmeye (ladderZ1 = +0.10m) bağlantı
    hPoints.push(new THREE.Vector3(ladderX - dH, hy, ladderCenterZ - rH));
    hPoints.push(new THREE.Vector3(ladderX - 0.15, hy, ladderCenterZ - rH));
    hPoints.push(new THREE.Vector3(ladderX, hy, ladderZ1));

    const curve = new THREE.CatmullRomCurve3(hPoints);
    const geo = new THREE.TubeGeometry(curve, 32, 0.012, 8, false);
    return new THREE.Mesh(geo, railMat);
  }

  hoopLevels.forEach((hy, idx) => {
    const isTop = (idx === hoopLevels.length - 1);
    const hoopMesh = buildOvalHoopRotated(hy, isTop);
    ladderGroup.add(hoopMesh);
  });

  // Dikey Güvenlik Kafes Lamaları (5 adet dikey güvenlik çubuğu, çemberler boyunca uzanır)
  const cageHeight = 7.50 - 2.20; // 5.30m (Y=2.20m ile Y=7.50m arası kesintisiz kafes)
  const cageVertGeo = new THREE.CylinderGeometry(0.008, 0.008, cageHeight, 8);
  const cageAngles = [-Math.PI * 0.4, -Math.PI * 0.2, 0, Math.PI * 0.2, Math.PI * 0.4];
  cageAngles.forEach(ang => {
    const vRod = new THREE.Mesh(cageVertGeo, railMat);
    const rx = ladderX - hoopDepth - Math.cos(ang) * (hoopR + 0.005);
    const rz = ladderCenterZ + Math.sin(ang) * (hoopR + 0.005);
    vRod.position.set(rx, 2.20 + cageHeight / 2, rz);
    ladderGroup.add(vRod);
  });

  alan4Group.add(ladderGroup);

  // =========================================================================
  // 8.1. MERKEZ TAŞIYICI KOLON (X = 0.0M) DİKEY KABLO MERDİVENİ VE 14 ADET 2x25MM² DC ENERJİ KABLOSU
  // Kullanıcı İsteği: "kablo merdivenini taşıyıcı kolona çek ki gemici merdiveninin inişini engellemesin."
  // Düzeltme: 
  // 1. Dikey kablo merdiveni gemici merdiveninin yanından (X=-1.75m) ALINIP, X = 0.0m merkez taşıyıcı kolona monte edildi.
  // 2. Üst kedi yolunda yürüyüş alanını ve merdiven nişini kesen yatay köprü tavası tamamen kaldırıldı.
  // 3. 14 adet DC enerji kablosu çatı taşıyıcı tavasından (X=0, Y=7.80m) doğrudan iniş kavisi ile kolondaki kablo merdivenine girer
  //    ve alt kedi yolu tavasına (Y=0.05m) kadar kesintisiz iner.
  const alan2CableSystemGroup = new THREE.Group();
  alan2CableSystemGroup.name = 'alan2CatwalkCableSystem';

  const dcCableMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a8a, // Koyu mavi LSZH dış kılıf
    roughness: 0.55,
    metalness: 0.3
  });
  const galvTrayMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8, // Sıcak daldırma galvaniz sac
    roughness: 0.35,
    metalness: 0.85,
    side: THREE.DoubleSide
  });
  const cleatMat = new THREE.MeshStandardMaterial({
    color: 0x334155, // Kablo klemens / tutucu kelepçe
    roughness: 0.45,
    metalness: 0.6
  });

  // A) MERKEZ TAŞIYICI KOLON ÜZERİNDE DİKEY KABLO MERDİVENİ (Vertical Cable Ladder at X = 0.0m)
  // - Konum: X = 0.0m (Merkez taşıyıcı kolon ekseni)
  // - Z ekseninde: Z = +0.10m (Ø360mm kolonun arka yüzüne rijit montaj, yürüme alanının Z=[-1.30, -0.10] tamamen DIŞINDA)
  // - Genişlik: 450mm (X: [-0.225m, +0.225m])
  // - Düşey eksende: Çatı tavası çıkış kotu Y = 7.80m'den ALT KEDİ YOLU (Y = 0.05m) kotuna kadar KESİNTİSİZ 7.75m İNER
  const vLadderX = 0.0;
  const vLadderWidth = 0.45;
  const vLadderHalfW = vLadderWidth / 2; // 0.225m
  const vLadderZ = 0.10; // Kolon arka yüzeyi
  const vLadderBottomY = 0.05; // Alt kedi yolu zemin seviyesi
  const vLadderTopY = 7.80; // Üst çatı tavası seviyesi
  const vLadderHeight = vLadderTopY - vLadderBottomY; // 7.75m

  // Dikey Taşıyıcı Yan Profiller (Ağır Hizmet C-Ray Profili: 70x40mm)
  const vRailGeo = new THREE.BoxGeometry(0.04, vLadderHeight, 0.07);
  [-vLadderHalfW, vLadderHalfW].forEach(vx => {
    const vRail = new THREE.Mesh(vRailGeo, galvTrayMat);
    vRail.position.set(vLadderX + vx, vLadderBottomY + vLadderHeight / 2, vLadderZ);
    vRail.castShadow = true;
    alan2CableSystemGroup.add(vRail);

    // Taban ankraj pabucu (Alt kedi yolu şasesine rijit bağlantı: Y = 0.05m)
    const vBaseFlangeGeo = new THREE.BoxGeometry(0.08, 0.02, 0.10);
    const bShoe = new THREE.Mesh(vBaseFlangeGeo, darkSteelMat);
    bShoe.position.set(vLadderX + vx, 0.01, vLadderZ);
    bShoe.receiveShadow = true;
    alan2CableSystemGroup.add(bShoe);
  });

  // Perfore Kablo Bağlama Basamakları (Her 30cm'de bir)
  const rungSpacing = 0.30;
  const rungGeo = new THREE.BoxGeometry(vLadderWidth - 0.04, 0.02, 0.025);
  const numRungs = Math.floor(vLadderHeight / rungSpacing);
  for (let ri = 1; ri <= numRungs; ri++) {
    const ry = vLadderBottomY + ri * rungSpacing;
    if (ry < vLadderTopY) {
      const rung = new THREE.Mesh(rungGeo, darkSteelMat);
      rung.position.set(vLadderX, ry, vLadderZ);
      alan2CableSystemGroup.add(rung);
    }
  }

  // Taşıyıcı Kolona Rijit Kelepçeleme Konsolları (Her 1.5 metrede bir Ø360mm kolona sabitleme)
  const standoffClampGeo = new THREE.BoxGeometry(vLadderWidth + 0.12, 0.05, 0.08);
  for (let sy = 0.8; sy <= vLadderTopY - 0.5; sy += 1.5) {
    const so = new THREE.Mesh(standoffClampGeo, darkSteelMat);
    so.position.set(vLadderX, sy, vLadderZ - 0.06);
    alan2CableSystemGroup.add(so);
  }

  // Tepe İniş Dirseği / Kavis Sacı (Waterfall Cable Drop Bracket at Y = 7.80m)
  const wfGeo = new THREE.CylinderGeometry(0.12, 0.12, vLadderWidth, 16, 1, false, 0, Math.PI / 2);
  const wfMesh = new THREE.Mesh(wfGeo, galvTrayMat);
  wfMesh.position.set(vLadderX, vLadderTopY - 0.02, vLadderZ - 0.10);
  alan2CableSystemGroup.add(wfMesh);

  // B) 14 ADET 2x25 mm² DC ENERJİ KABLOSU İMALATI (MERKEZ KOLONDAN DİKEY İNİŞ)
  // - Ortadaki çatı taşıyıcı tavasından (X = 0, Y = 7.80m, Z = -0.06m) çıkar
  // - Doğrudan waterfall kavis ile X = 0 aksındaki dikey kablo merdivenine girer
  // - Kolon boyunca 7.75m kesintisiz iner ve alt kedi yoluna bağlanır
  const cableRadius = 0.0105; // 21mm dış çap
  const numCables = 14;

  for (let ci = 0; ci < numCables; ci++) {
    const colIdx = ci % 7;
    const tierIdx = Math.floor(ci / 7);
    const cableX = vLadderX - 0.16 + colIdx * 0.052;
    const cableZ = vLadderZ + (tierIdx === 0 ? 0.015 : 0.038);
    const cY = vLadderTopY + cableRadius + (tierIdx === 0 ? 0.0 : 0.022);

    const curvePoints = [
      new THREE.Vector3(cableX, cY, -0.06),
      new THREE.Vector3(cableX, cY, vLadderZ - 0.08),
      new THREE.Vector3(cableX, cY - 0.15, cableZ),
      new THREE.Vector3(cableX, 5.5, cableZ),
      new THREE.Vector3(cableX, 3.5, cableZ),
      new THREE.Vector3(cableX, 1.5, cableZ),
      new THREE.Vector3(cableX, 0.45, cableZ),
      new THREE.Vector3(cableX, 0.12, cableZ - 0.10),
      new THREE.Vector3(cableX, 0.05 + cableRadius, cableZ - 0.35)
    ];

    const cableCurve = new THREE.CatmullRomCurve3(curvePoints, false, 'catmullrom', 0.1);
    const cableGeo = new THREE.TubeGeometry(cableCurve, 48, cableRadius, 8, false);
    const cableMesh = new THREE.Mesh(cableGeo, dcCableMat);
    cableMesh.castShadow = true;
    alan2CableSystemGroup.add(cableMesh);

    // Dikey Merdiven Üzerindeki Kablo Tutucu Klemensler (Her 1.2 metrede bir)
    [1.2, 2.4, 3.6, 4.8, 6.0, 7.2].forEach(ky => {
      const cleatGeo = new THREE.BoxGeometry(0.035, 0.035, 0.025);
      const cleat = new THREE.Mesh(cleatGeo, cleatMat);
      cleat.position.set(cableX, ky, cableZ);
      alan2CableSystemGroup.add(cleat);
    });
  }

  alan4Group.add(alan2CableSystemGroup);

  // =========================================================================
  // 9. 60 METRELİK ÇATI TAŞIYICI KOLON / UZAY MAKAS SİSTEMİ (5 DERECE EĞİMLİ)
  // - Üst kedi yolundan (Y = 7.35m, Z = -0.10m) beton kaideye (Z = 59.67m, Y = 2.12m) uzanır
  // - Eğim açısı: Tam 5 derece (θ = 5.0°)
  // - Ø350mm ana omurga borusu, 2 adet Ø120mm üst aşık, her 3m'de bir V-strut ayakları
  // - Kullanıcı İsteği: "mevcut 60 metrelik çatı taşıyıcısına her iki yönde Merkezden merkeze 16,5m mesafede
  //   toplam uzunlugu mevcut kedi yolu kadar olan birer tane daha çatı taşıyıcı ekle. Toplam uzunlukları yine aynı olsun"
  // - 3 Adet Çatı Taşıyıcı: Sol (X = -16.5m), Merkez (X = 0.0m), Sağ (X = +16.5m)
  // =========================================================================
  const trussLen = 60.0;
  const slopeRad = THREE.MathUtils.degToRad(5.0); // Tam 5 derece eğim
  const trussStartY = upperCwWalkY - 0.15; // 7.35m
  const trussStartZ = -0.10;
  const trussEndZ = trussStartZ + trussLen * Math.cos(slopeRad); // ~59.67m
  const trussEndY = trussStartY - trussLen * Math.sin(slopeRad); // ~2.12m

  // Taşıyıcı boru malzemeleri (Alan 3 standartları)
  const pipeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xebedf0, roughness: 0.38, metalness: 0.35 });
  const flangeSteelMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.40, metalness: 0.75 });

  function buildScoreboardRoofTruss60m(xOffset, trussName) {
    const trussGroup = new THREE.Group();
    trussGroup.name = trussName;

    // 9.1. Ana Taşıyıcı Omurga Borusu (Ø350mm / R = 0.175m)
    const spineGeo = new THREE.CylinderGeometry(0.175, 0.175, trussLen, 36);
    spineGeo.rotateX(Math.PI / 2);
    const spineMesh = new THREE.Mesh(spineGeo, pipeWhiteMat);
    spineMesh.position.set(0, 0, trussLen / 2);
    spineMesh.castShadow = true;
    spineMesh.receiveShadow = true;
    trussGroup.add(spineMesh);

    // 9.2. Üst İki Boyuna Aşık Borusu (Ø160mm / R = 0.08m) ve V-Kafes Strutlar
    // Alan 1-3 Standardı: Tepe yüksekliği Y = 2.73m, Tepe açıklığı ±1.52m (~3.04m toplam tepe genişliği)
    // Böylece kedi yolunun içinden geçen yürüme alanı 2.33m tavan yüksekliğiyle tamamen konforlu ve kullanılabilir olur
    const chordOffsetW = 1.52; // ±1.52m genişlik (Alan 1 standardı: armTopX = 1.52m)
    const chordHeightH = 2.73; // Omurganın 2.73m üzerinde (Alan 1 standardı: armTopY = 2.73m)
    const chordGeo = new THREE.CylinderGeometry(0.08, 0.08, trussLen, 24);
    chordGeo.rotateX(Math.PI / 2);

    const leftChord = new THREE.Mesh(chordGeo, pipeWhiteMat);
    leftChord.position.set(-chordOffsetW, chordHeightH, trussLen / 2);
    leftChord.castShadow = true;
    trussGroup.add(leftChord);

    const rightChord = new THREE.Mesh(chordGeo, pipeWhiteMat);
    rightChord.position.set(chordOffsetW, chordHeightH, trussLen / 2);
    rightChord.castShadow = true;
    trussGroup.add(rightChord);

    // Her 3 metrede bir V-Strut ve Güçlendirme İstasyonları (20 Adet İstasyon)
    const vStrutRadius = 0.07; // Ø140mm kalın beyaz çelik boru (Alan 1 standardı: diagonalRadius = 0.07m)
    const topTieRadius = 0.05; // Ø100mm üst gergi borusu
    const armBaseX = 0.14;     // Alt omurga üzerindeki montaj ayrımı (±0.14m)
    const collarGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.20, 24);
    collarGeo.rotateX(Math.PI / 2);

    for (let zSt = 0.0; zSt <= trussLen; zSt += 3.0) {
      // Omurgayı saran çelik bilezik
      const collar = new THREE.Mesh(collarGeo, flangeSteelMat);
      collar.position.set(0, 0, zSt);
      trussGroup.add(collar);

      // Sol V-Kolu (Alt omurga kenarından sol üst aşığa)
      const leftV = createPipeHelper(
        new THREE.Vector3(-armBaseX, 0.175, zSt),
        new THREE.Vector3(-chordOffsetW, chordHeightH, zSt),
        vStrutRadius,
        pipeWhiteMat
      );
      trussGroup.add(leftV);

      // Sağ V-Kolu (Alt omurga kenarından sağ üst aşığa)
      const rightV = createPipeHelper(
        new THREE.Vector3(armBaseX, 0.175, zSt),
        new THREE.Vector3(chordOffsetW, chordHeightH, zSt),
        vStrutRadius,
        pipeWhiteMat
      );
      trussGroup.add(rightV);

      // Üst Yatay Gergi Borusu
      const topTie = createPipeHelper(
        new THREE.Vector3(-chordOffsetW, chordHeightH, zSt),
        new THREE.Vector3(chordOffsetW, chordHeightH, zSt),
        topTieRadius,
        pipeWhiteMat
      );
      trussGroup.add(topTie);

      // İstasyonlar arası X-çapraz gergi bağları
      if (zSt + 3.0 <= trussLen) {
        const diag1 = createPipeHelper(
          new THREE.Vector3(-chordOffsetW, chordHeightH, zSt),
          new THREE.Vector3(chordOffsetW, chordHeightH, zSt + 3.0),
          0.028,
          flangeSteelMat
        );
        trussGroup.add(diag1);

        const diag2 = createPipeHelper(
          new THREE.Vector3(chordOffsetW, chordHeightH, zSt),
          new THREE.Vector3(-chordOffsetW, chordHeightH, zSt + 3.0),
          0.028,
          flangeSteelMat
        );
        trussGroup.add(diag2);
      }
    }

    // 9.2.B. 50CM GENİŞLİK, 15CM YÜKSEKLİKTE DELİKLİ KABLO TAVASI VE TAVA TAŞIYICILARI (BATTI-ÇIKTI / KOT DÜŞÜRMELİ)
    // - xOffset === 0 (Ortadaki Çatı Taşıyıcı): 500mm Tava + Travers Kaideleri + 14 Adet 2x25 mm² DC Enerji Kablosu İmalatı
    // - xOffset !== 0 (Sol ve Sağ Çatı Taşıyıcılar): 500mm Tava + Travers Kaideleri + 6 Adet 7/8" Feeder Kablo Demeti
    const trayGroup = new THREE.Group();
    trayGroup.name = `scoreboardTruss50cmTray_${xOffset === 0 ? 'center' : (xOffset < 0 ? 'left' : 'right')}`;

    const trayW = 0.50; // 500mm genişlik
    const trayH = 0.15; // 150mm kenar yüksekliği
    const trayWallThick = 0.003;
    const trayBottomYNormal = 0.45; // Normal seyir kotu (travers kaidesi üzerinde)
    const trayBottomYDip = 0.18;    // Kedi yolları altı kot düşürülmüş alçak havuz kotu (kedi yolunun altından rahatça geçer)

    // Tava Malzemeleri
    const trayPerforatedTex = createCableTrayPerforatedTexture();
    trayPerforatedTex.repeat.set(1, 40);
    const sbTrayBottomMat = new THREE.MeshStandardMaterial({
      map: trayPerforatedTex,
      transparent: true,
      alphaTest: 0.2,
      color: 0x94a3b8,
      metalness: 0.85,
      roughness: 0.3,
      side: THREE.DoubleSide
    });
    const sbTraySideMat = new THREE.MeshStandardMaterial({
      color: 0x90a4ae,
      metalness: 0.85,
      roughness: 0.35,
      side: THREE.DoubleSide
    });
    const sbDarkJointMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.8,
      roughness: 0.4
    });

    // 1. Tava Taşıyıcı Travers Kaideleri (Her 3 metrede bir V-strut kolları arasına gerilen travers kirişi ve kelepçeler)
    const crossBeamGeo = new THREE.BoxGeometry(0.66, 0.05, 0.08);
    const pedestalGeo = new THREE.BoxGeometry(0.52, 0.03, 0.10);
    const holdClampGeo = new THREE.BoxGeometry(0.04, 0.03, 0.06);

    for (let zSt = 0.0; zSt <= trussLen; zSt += 3.0) {
      const isNearDip = (Math.abs(zSt - 16.0) < 2.0 || Math.abs(zSt - 32.0) < 2.0);
      if (!isNearDip) {
        const cBeam = new THREE.Mesh(crossBeamGeo, flangeSteelMat);
        cBeam.position.set(0, 0.38, zSt);
        cBeam.castShadow = true;
        trayGroup.add(cBeam);

        const ped = new THREE.Mesh(pedestalGeo, flangeSteelMat);
        ped.position.set(0, 0.42, zSt);
        trayGroup.add(ped);

        [-0.26, 0.26].forEach(hx => {
          const hClamp = new THREE.Mesh(holdClampGeo, sbDarkJointMat);
          hClamp.position.set(hx, 0.445, zSt);
          trayGroup.add(hClamp);
        });
      }
    }

    // Kedi yolları altında alçak geçiş havuzu taşıyıcı eyerleri (s = 16.0m ve s = 32.0m)
    const dipSaddleGeo = new THREE.BoxGeometry(trayW + 0.06, 0.04, 0.25);
    [16.0, 32.0].forEach(dipZ => {
      const dipSaddle = new THREE.Mesh(dipSaddleGeo, flangeSteelMat);
      dipSaddle.position.set(0, trayBottomYDip - 0.02, dipZ);
      trayGroup.add(dipSaddle);
    });

    // 2. Battı-Çıktı (Kot Düşürmeli) Tava Segmentleri
    // Catwalk 2 (s = 16m) ve Catwalk 1 (s = 32m) kesişimlerinde kot düşürme
    const traySegments = [
      { yStart: trayBottomYNormal, zStart: 0.0, yEnd: trayBottomYNormal, zEnd: 14.60 },
      { yStart: trayBottomYNormal, zStart: 14.60, yEnd: trayBottomYDip, zEnd: 15.20 }, // 1. Battı (Catwalk 2 inişi)
      { yStart: trayBottomYDip, zStart: 15.20, yEnd: trayBottomYDip, zEnd: 16.80 },    // Catwalk 2 altı alçak geçiş
      { yStart: trayBottomYDip, zStart: 16.80, yEnd: trayBottomYNormal, zEnd: 17.40 }, // 1. Çıktı (Normal kota dönüş)
      { yStart: trayBottomYNormal, zStart: 17.40, yEnd: trayBottomYNormal, zEnd: 30.60 },
      { yStart: trayBottomYNormal, zStart: 30.60, yEnd: trayBottomYDip, zEnd: 31.20 }, // 2. Battı (Catwalk 1 inişi)
      { yStart: trayBottomYDip, zStart: 31.20, yEnd: trayBottomYDip, zEnd: 32.80 },    // Catwalk 1 altı alçak geçiş
      { yStart: trayBottomYDip, zStart: 32.80, yEnd: trayBottomYNormal, zEnd: 33.40 }, // 2. Çıktı (Normal kota dönüş)
      { yStart: trayBottomYNormal, zStart: 33.40, yEnd: trayBottomYNormal, zEnd: 59.80 }  // Beton kaideye kadar normal seyir
    ];

    traySegments.forEach(seg => {
      const dy = seg.yEnd - seg.yStart;
      const dz = seg.zEnd - seg.zStart;
      const segLen = Math.hypot(dy, dz);
      const segAngleX = Math.atan2(seg.yStart - seg.yEnd, dz);
      const midY = (seg.yStart + seg.yEnd) / 2;
      const midZ = (seg.zStart + seg.zEnd) / 2;

      // Taban Sacı
      const bGeo = new THREE.BoxGeometry(trayW, trayWallThick, segLen);
      const bMesh = new THREE.Mesh(bGeo, sbTrayBottomMat);
      bMesh.rotation.x = segAngleX;
      bMesh.position.set(0, midY + (trayWallThick / 2) * Math.cos(segAngleX), midZ);
      bMesh.receiveShadow = true;
      bMesh.castShadow = true;
      trayGroup.add(bMesh);

      // Sol Yan Duvar
      const sideGeo = new THREE.BoxGeometry(trayWallThick, trayH, segLen);
      const lMesh = new THREE.Mesh(sideGeo, sbTraySideMat);
      lMesh.rotation.x = segAngleX;
      lMesh.position.set(-trayW / 2 + trayWallThick / 2, midY + (trayH / 2) * Math.cos(segAngleX), midZ);
      lMesh.castShadow = true;
      trayGroup.add(lMesh);

      // Sağ Yan Duvar
      const rMesh = new THREE.Mesh(sideGeo, sbTraySideMat);
      rMesh.rotation.x = segAngleX;
      rMesh.position.set(trayW / 2 - trayWallThick / 2, midY + (trayH / 2) * Math.cos(segAngleX), midZ);
      rMesh.castShadow = true;
      trayGroup.add(rMesh);

      // Üst Güçlendirme Kıvrımları (Flange Lips)
      const lipGeo = new THREE.BoxGeometry(0.015, trayWallThick, segLen);
      const lLip = new THREE.Mesh(lipGeo, flangeSteelMat);
      lLip.rotation.x = segAngleX;
      lLip.position.set(-trayW / 2 + 0.0075, midY + trayH * Math.cos(segAngleX), midZ);
      trayGroup.add(lLip);

      const rLip = new THREE.Mesh(lipGeo, flangeSteelMat);
      rLip.rotation.x = segAngleX;
      rLip.position.set(trayW / 2 - 0.0075, midY + trayH * Math.cos(segAngleX), midZ);
      trayGroup.add(rLip);
    });

    if (xOffset === 0) {
      // =========================================================================
      // ORTADAKİ ÇATI TAŞIYICI ÜZERİNDE 14 ADET 2x25 mm² DC ENERJİ KABLOSU İMALATI
      // =========================================================================
      const dcCableMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.55, metalness: 0.3 });
      const cleatMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45, metalness: 0.6 });
      const dcRadius = 0.0105; // 21mm dış çap
      const numDc = 14;

      for (let ci = 0; ci < numDc; ci++) {
        const col = ci % 7;
        const tier = Math.floor(ci / 7);
        const fx = -trayW / 2 + 0.07 + col * 0.06;
        const yOffset = tier === 0 ? (dcRadius + 0.003) : (dcRadius * 3 + 0.005);

        // Catmull-Rom yaylanmasını önlemek ve kablonun tava tabanına tam oturmasını sağlamak için yoğun nokta örneklemesi
        const pts = [];
        traySegments.forEach(seg => {
          const dz = seg.zEnd - seg.zStart;
          const steps = Math.max(2, Math.ceil(dz / 0.5));
          for (let i = 0; i <= steps; i++) {
            if (pts.length > 0 && i === 0) continue;
            const alpha = i / steps;
            const z = seg.zStart + alpha * dz;
            const y = seg.yStart + alpha * (seg.yEnd - seg.yStart) + yOffset;
            pts.push(new THREE.Vector3(fx, y, z));
          }
        });
        const cableCurve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.0);
        const cableGeo = new THREE.TubeGeometry(cableCurve, 128, dcRadius, 8, false);
        const cableMesh = new THREE.Mesh(cableGeo, dcCableMat);
        cableMesh.castShadow = true;
        trayGroup.add(cableMesh);
      }

      // Kablo Tutucu Klemens / Kelepçeler (Her 3 metrede bir kabloları tavaya kilitleyen kelepçeler)
      for (let zSt = 0.0; zSt <= trussLen; zSt += 3.0) {
        const isNearDip = (Math.abs(zSt - 16.0) < 2.0 || Math.abs(zSt - 32.0) < 2.0);
        if (!isNearDip) {
          const cleatBar = new THREE.Mesh(new THREE.BoxGeometry(trayW - 0.04, 0.015, 0.04), cleatMat);
          cleatBar.position.set(0, 0.45 + dcRadius * 3 + 0.012, zSt);
          trayGroup.add(cleatBar);
        }
      }
    } else {
      // 3. Tava İçi Feeder Kabloları (Sol ve Sağ Çatı Taşıyıcıları için 6 Adet 7/8" Feeder Kablo Demeti)
      const feederMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85, metalness: 0.1 });
      const fRadius = 0.014;
      const numFeeders = 6;
      for (let fi = 0; fi < numFeeders; fi++) {
        const fx = -trayW / 2 + 0.07 + fi * 0.072;
        const yOffset = fRadius + 0.003;

        const pts = [];
        traySegments.forEach(seg => {
          const dz = seg.zEnd - seg.zStart;
          const steps = Math.max(2, Math.ceil(dz / 0.5));
          for (let i = 0; i <= steps; i++) {
            if (pts.length > 0 && i === 0) continue;
            const alpha = i / steps;
            const z = seg.zStart + alpha * dz;
            const y = seg.yStart + alpha * (seg.yEnd - seg.yStart) + yOffset;
            pts.push(new THREE.Vector3(fx, y, z));
          }
        });
        const cableCurve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.0);
        const cableGeo = new THREE.TubeGeometry(cableCurve, 128, fRadius, 8, false);
        const cableMesh = new THREE.Mesh(cableGeo, feederMat);
        cableMesh.castShadow = true;
        trayGroup.add(cableMesh);
      }
    }

    // 4. Beton Kaide Tarafı Tava İniş Dirseği (Transition Bend at s = 59.8m)
    const elbowGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.45, 16);
    elbowGeo.rotateZ(Math.PI / 2);
    const elbowMesh = new THREE.Mesh(elbowGeo, flangeSteelMat);
    elbowMesh.position.set(0, trayBottomYNormal + 0.05, 59.80);
    trayGroup.add(elbowMesh);

    trussGroup.add(trayGroup);

    // Taşıyıcı Grubu Eğim ve Konumlandırma
    trussGroup.position.set(xOffset, trussStartY, trussStartZ);
    trussGroup.rotation.x = slopeRad; // +Z yönüne doğru aşağı 5 derece eğim

    return trussGroup;
  }

  // 3 Adet 60 Metrelik Çatı Taşıyıcı: Merkez (0m), Sol (-16.5m), Sağ (+16.5m) (Merkezden merkeze 16.5 metre)
  const roofCarrierXLocs = [-18.0, 0.0, 18.0];
  roofCarrierXLocs.forEach(rx => {
    const name = rx === 0 ? 'scoreboard60mRoofCarrier' : (rx < 0 ? 'scoreboard60mRoofCarrierLeft' : 'scoreboard60mRoofCarrierRight');
    const carrier = buildScoreboardRoofTruss60m(rx, name);
    alan4Group.add(carrier);

    // Yan taşıyıcılar (X = ±16.5m) için alt silindirlerden (Y = -0.95m) makas başına (Y = 7.35m) düşey çelik taşıyıcı kule dikmesi
    // Düşey taşıyıcı kolon: X = 0 dahil tüm akslarda oluşturulur
    {
      const sideStanchionGroup = new THREE.Group();
      sideStanchionGroup.name = `scoreboardSideCarrierStanchion_${rx < 0 ? 'left' : 'right'}`;

      // İki silindir arası enine ağır taşıyıcı kiriş (Z: -1.67 ile +0.55 arası)
      const transBeam = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 2.50), darkSteelMat);
      transBeam.position.set(rx, -0.15, -0.56);
      sideStanchionGroup.add(transBeam);

      // Silindir 1 ve Silindir 2 üzerine binen eyer pabuçları
      [-1.67, 0.55].forEach(sz => {
        const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.16, 0.70), darkSteelMat);
        saddle.position.set(rx, -0.22, sz);
        sideStanchionGroup.add(saddle);
      });

      // Düşey ana taşıyıcı kolon (Y = -0.15m'den Y = 7.35m'ye)
      const stanchionH = trussStartY - (-0.15);
      const stanchionMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, stanchionH, 24), pipeWhiteMat);
      stanchionMesh.position.set(rx, -0.15 + stanchionH / 2, trussStartZ);
      stanchionMesh.castShadow = true;
      sideStanchionGroup.add(stanchionMesh);

      // Kolon tepesi makas mesnet flanşı ve başlığı
      const headCap = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.15, 0.55), flangeSteelMat);
      headCap.position.set(rx, trussStartY - 0.075, trussStartZ);
      sideStanchionGroup.add(headCap);

      alan4Group.add(sideStanchionGroup);
    }
  });

  // =========================================================================
  // 9.3. 2 ADET ARA KEDİ YOLU (3 ÇATI TAŞIYICISININ İÇİNDEN GEÇEN VE HEPSİNİ AŞAN)
  // Kullanıcı İsteği: "betonun sınırından itibaren ilkini 28 metreye ikinisini de bundan 16 metre sonraya
  // yerleştir uzunlugu 3 çatı taşıyıcısını da geçsin. Konumu yine taşıyıcının içinden geçecek şekilde olacak."
  // Geometrik Hesaplar:
  // - Makas boyu = 60m (Eğim = 5 derece). Beton kaide mesnet noktası station = 60.0m
  // - 1. Kedi Yolu: Betondan 28m önce => Station s = 32.0m (Z ≈ 31.78m, Y_omurga ≈ 4.56m, Y_yürüme = 5.01m)
  // - 2. Kedi Yolu: 1. Kedi yolundan 16m sonra => Station s = 16.0m (Z ≈ 15.84m, Y_omurga ≈ 5.96m, Y_yürüme = 6.41m)
  // - Genişlik: 1.00m (Makasın 1.10m iç açıklığından tam geçer)
  // - Uzunluk: 38.0m (X = -19.0m'den +19.0m'ye, X = -16.5m, 0m ve +16.5m olan 3 taşıyıcıyı da 2.5m geçer)
  // =========================================================================
  function buildScoreboardIntermediateCatwalk(stationS, name) {
    const cwGroup = new THREE.Group();
    cwGroup.name = name;

    const cwCenterZ = trussStartZ + stationS * Math.cos(slopeRad);
    const spineYAtStation = trussStartY - stationS * Math.sin(slopeRad);
    const cwWalkY = spineYAtStation + 0.45; // Makas omurgasının 45 cm üstünde (makasın tam içinden geçer)
    const cwRailTopY = cwWalkY + 1.00;
    const cwRailMidY = cwWalkY + 0.50;

    const cwLength = 42.0; // 3 çatı taşıyıcısını da geçer (X: -21.0m ile +21.0m arası, makaslar: -18.0m, 0m, +18.0m)
    const cwWidth = 1.00;  // 100 cm net yürüme genişliği (Makasın 110 cm iç genişliğinden tam geçer)

    // A) Yürüme Taban Sacı (Genişletilmiş Metal Izgara)
    const cwFloorGeo = new THREE.BoxGeometry(cwLength, 0.05, cwWidth);
    const cwFloor = new THREE.Mesh(cwFloorGeo, floorMat);
    cwFloor.position.set(0, cwWalkY - 0.025, cwCenterZ);
    cwFloor.receiveShadow = true;
    cwGroup.add(cwFloor);

    // B) Boyuna Taşıyıcı Kenar Kirişleri (Ön ve Arka Kenarlar)
    const cwBeamGeo = new THREE.BoxGeometry(cwLength, 0.15, 0.08);
    [-cwWidth / 2, cwWidth / 2].forEach(dz => {
      const beam = new THREE.Mesh(cwBeamGeo, beamMat);
      beam.position.set(0, cwWalkY - 0.025, cwCenterZ + dz);
      beam.castShadow = true;
      cwGroup.add(beam);
    });

    // C) Sarı Emniyet Korkulukları (1.00m Yükseklik, Etek Sacı, Dikmeler)
    const postGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.00, 16);
    const topRailGeo = new THREE.CylinderGeometry(0.025, 0.025, cwLength, 16);
    topRailGeo.rotateZ(Math.PI / 2);
    const midRailGeo = new THREE.CylinderGeometry(0.016, 0.016, cwLength, 16);
    midRailGeo.rotateZ(Math.PI / 2);
    const kickPlateGeo = new THREE.BoxGeometry(cwLength, 0.15, 0.015);

    [-cwWidth / 2, cwWidth / 2].forEach(dz => {
      const topRail = new THREE.Mesh(topRailGeo, railMat);
      topRail.position.set(0, cwRailTopY, cwCenterZ + dz);
      topRail.castShadow = true;
      cwGroup.add(topRail);

      const midRail = new THREE.Mesh(midRailGeo, railMat);
      midRail.position.set(0, cwRailMidY, cwCenterZ + dz);
      cwGroup.add(midRail);

      const kickPlate = new THREE.Mesh(kickPlateGeo, beamMat);
      kickPlate.position.set(0, cwWalkY + 0.075, cwCenterZ + dz);
      cwGroup.add(kickPlate);

      // Korkuluk dikmeleri (her 1.5 metrede bir)
      for (let x = -cwLength / 2 + 0.5; x <= cwLength / 2 - 0.5; x += 1.5) {
        const post = new THREE.Mesh(postGeo, railMat);
        post.position.set(x, cwWalkY + 0.50, cwCenterZ + dz);
        post.castShadow = true;
        cwGroup.add(post);
      }
    });

    // D) Uç Emniyet Korkulukları (X = -19.0m ve X = +19.0m)
    [-cwLength / 2, cwLength / 2].forEach(ex => {
      const endTopRail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, cwWidth, 16), railMat);
      endTopRail.rotation.x = Math.PI / 2;
      endTopRail.position.set(ex, cwRailTopY, cwCenterZ);
      cwGroup.add(endTopRail);

      const endMidRail = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, cwWidth, 16), railMat);
      endMidRail.rotation.x = Math.PI / 2;
      endMidRail.position.set(ex, cwRailMidY, cwCenterZ);
      cwGroup.add(endMidRail);

      const endKick = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.15, cwWidth), beamMat);
      endKick.position.set(ex, cwWalkY + 0.075, cwCenterZ);
      cwGroup.add(endKick);

      [-cwWidth / 2 + 0.05, cwWidth / 2 - 0.05].forEach(dz => {
        const endPost = new THREE.Mesh(postGeo, railMat);
        endPost.position.set(ex, cwWalkY + 0.50, cwCenterZ + dz);
        cwGroup.add(endPost);
      });
    });

    // E) Makas Geçiş Kenetleme Mesnetleri ve Taşıyıcı Traversler (X = -16.5m, 0.0m, +16.5m)
    roofCarrierXLocs.forEach(rx => {
      // Makas alt omurgasına kenetlenen ağır çelik eyer ve travers kirişi
      const saddleBeamGeo = new THREE.BoxGeometry(0.30, 0.20, cwWidth + 0.35);
      const saddleBeam = new THREE.Mesh(saddleBeamGeo, darkSteelMat);
      saddleBeam.position.set(rx, cwWalkY - 0.125, cwCenterZ);
      saddleBeam.castShadow = true;
      cwGroup.add(saddleBeam);

      // Omurgayı (Ø350mm) saran ağır çelik montaj bileziği / flanşı
      const clampCollarGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.25, 24);
      clampCollarGeo.rotateX(Math.PI / 2);
      const clampCollar = new THREE.Mesh(clampCollarGeo, flangeSteelMat);
      clampCollar.position.set(rx, spineYAtStation, cwCenterZ);
      cwGroup.add(clampCollar);

      // Yan bağlantı braketleri (Makas V-strut kollarına kenetlenen flanşlar)
      [-0.32, 0.32].forEach(bx => {
        [-0.45, 0.45].forEach(bz => {
          const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.16), flangeSteelMat);
          bracket.position.set(rx + bx, cwWalkY - 0.10, cwCenterZ + bz);
          cwGroup.add(bracket);
        });
      });
    });

    // F) Çatı Askı Rotları (Her 3.5m'de bir çatı strüktürüne yükselen askı çubukları)
    const hangerRodGeo = new THREE.CylinderGeometry(0.014, 0.014, 2.50, 16);
    for (let x = -cwLength / 2 + 2.0; x <= cwLength / 2 - 2.0; x += 3.5) {
      const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, cwWidth + 0.30), darkSteelMat);
      crossBeam.position.set(x, cwWalkY - 0.12, cwCenterZ);
      crossBeam.castShadow = true;
      cwGroup.add(crossBeam);

      [-cwWidth / 2 - 0.08, cwWidth / 2 + 0.08].forEach(dz => {
        const rod = new THREE.Mesh(hangerRodGeo, flangeSteelMat);
        rod.position.set(x, cwWalkY + 1.25, cwCenterZ + dz);
        rod.castShadow = true;
        cwGroup.add(rod);
      });
    }

    return cwGroup;
  }

  // 1. Kedi Yolu: Betondan 28m önce (Station s = 32m)
  const scoreboardIntermediateCw1 = buildScoreboardIntermediateCatwalk(32.0, 'scoreboardIntermediateCatwalk1_32m');
  alan4Group.add(scoreboardIntermediateCw1);

  // 2. Kedi Yolu: 1. Kedi yolundan 16m sonra (Station s = 16m)
  const scoreboardIntermediateCw2 = buildScoreboardIntermediateCatwalk(16.0, 'scoreboardIntermediateCatwalk2_16m');
  alan4Group.add(scoreboardIntermediateCw2);

  // =========================================================================
  // 10. 54M BETON KAİDE, 6 METREDE BİR DİREK, YATAY BİRLEŞTİRİCİLER, CAM KORUMA,
  // 3 DOLAPLI CAM & KAYAR KAPILI DOLAP VE 300MM KABLO MERDİVENİ
  // Kullanıcı İsteği:
  // - "BEton kaideyi her iki yönde 27 olacak şekilde toplamda 54 metreye kadar uzat"
  // - "6 metrede bir direk ve yatay birleştiricileri de ekle"
  // =========================================================================
  const baseGroundY = trussEndY - 4.0; // -1.88m (Direklerin bastığı taban kotu)
  const baseZ = trussEndZ; // 59.67m

  const concreteGroup = new THREE.Group();
  concreteGroup.name = 'scoreboardRoofConcreteBase';

  // 10.1. 54 Metrelik Masif Beton Kaide Bloğu (54.0m x 2.0m x 0.40m, X: -27m ile +27m)
  const floorLength = 54.0;
  const floorWidth = 2.0;
  const floorThickness = 0.40;

  const concreteMat = new THREE.MeshStandardMaterial({ 
    color: 0x6e7072, 
    roughness: 0.9, 
    metalness: 0.1 
  });
  const concBaseGeo = new THREE.BoxGeometry(floorLength, floorThickness, floorWidth);
  const concBaseMesh = new THREE.Mesh(concBaseGeo, concreteMat);
  concBaseMesh.position.set(0, baseGroundY - floorThickness / 2, baseZ);
  concBaseMesh.receiveShadow = true;
  concreteGroup.add(concBaseMesh);

  // Standart Cam Koruma Korkuluk Malzemeleri
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x99ccff,
    transparent: true,
    opacity: 0.45,
    roughness: 0.1,
    metalness: 0.6,
    side: THREE.DoubleSide
  });

  const postMat = new THREE.MeshStandardMaterial({
    color: 0x444444,
    roughness: 0.6,
    metalness: 0.8
  });

  const postWidth = 0.05;
  const postDepth = 0.08;
  const glassThickness = 0.02;
  const stdGlassH = 1.10;
  const stdPostH = 1.20;

  // 10.2. 6 Metre Arayla 4 Metrelik Çelik Silindir Direkler (9 Adet: X = -24, -18, -12, -6, 0, 6, 12, 18, 24)
  const colDia = 0.40; // Ø400mm
  const colRad = colDia / 2;
  const colH = 4.00; // 4 metre boy

  const colXLocs = [-27, -21, -15, -9, -3, 3, 9, 15, 21, 27];
  const steelPlatMat = new THREE.MeshStandardMaterial({ color: 0xc8ccd0, roughness: 0.35, metalness: 0.75 });
  const colMatWhite = new THREE.MeshStandardMaterial({ color: 0xebedf0, roughness: 0.40, metalness: 0.35 });
  const boltHardwareMat = new THREE.MeshStandardMaterial({ color: 0x222426, roughness: 0.4, metalness: 0.8 });

  colXLocs.forEach(cx => {
    const cGroup = new THREE.Group();
    cGroup.position.set(cx, baseGroundY, baseZ);

    // Beton pabuç yükseltisi
    const ped = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.10, 0.70), concreteMat);
    ped.position.set(0, 0.05, 0);
    cGroup.add(ped);

    // Çelik taban plakası
    const bp = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.035, 0.60), steelPlatMat);
    bp.position.set(0, 0.10 + 0.035 / 2, 0);
    cGroup.add(bp);

    // 4 adet ankraj cıvatası
    const bOff = 0.24;
    [[-bOff, -bOff], [bOff, -bOff], [-bOff, bOff], [bOff, bOff]].forEach(([bx, bz]) => {
      const bMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.045, 8), boltHardwareMat);
      bMesh.position.set(bx, 0.135 + 0.02, bz);
      cGroup.add(bMesh);
    });

    // Dairesel flanş
    const fl = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.03, 32), steelPlatMat);
    fl.position.set(0, 0.15, 0);
    cGroup.add(fl);

    // 4 Metrelik Çelik Silindir Gövde
    const pipeH = colH - 0.15;
    const cPipe = new THREE.Mesh(new THREE.CylinderGeometry(colRad, colRad, pipeH, 36), colMatWhite);
    cPipe.position.set(0, 0.15 + pipeH / 2, 0);
    cPipe.castShadow = true;
    cGroup.add(cPipe);

    // Kolon Tepe Başlık Flanşı
    const topFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.04, 32), steelPlatMat);
    topFlange.position.set(0, colH, 0);
    cGroup.add(topFlange);

    concreteGroup.add(cGroup);
  });

  // 10.3. Kolon Başlık Kirişi ve Yatay Birleştiriciler (9 Kolonu Birleştiren Yatay Ağır Kiriş, L = 54m)
  const headerBeamGeo = new THREE.CylinderGeometry(colRad, colRad, floorLength, 32);
  headerBeamGeo.rotateZ(Math.PI / 2);
  const headerBeam = new THREE.Mesh(headerBeamGeo, colMatWhite);
  headerBeam.position.set(0, trussEndY, baseZ);
  concreteGroup.add(headerBeam);

  // Yatay Birleştirici Bağlantı Bilezikleri ve Flanş Halkaları (Her 9 direk kesişiminde)
  const colCollarGeo = new THREE.CylinderGeometry(colRad + 0.015, colRad + 0.015, colRad * 2 + 0.08, 32);
  const ringFlangeGeo = new THREE.CylinderGeometry(colRad + 0.03, colRad + 0.03, 0.03, 24);
  ringFlangeGeo.rotateZ(Math.PI / 2);

  colXLocs.forEach(cx => {
    // Dikey direk üzerine sarılan T-bağlantı kuşağı / bileziği
    const collar = new THREE.Mesh(colCollarGeo, steelPlatMat);
    collar.position.set(cx, trussEndY, baseZ);
    collar.castShadow = true;
    concreteGroup.add(collar);

    // Yatay borunun direğe giriş yaptığı her iki yana bağlantı flanş halkaları
    if (cx > -27) {
      const ringL = new THREE.Mesh(ringFlangeGeo, steelPlatMat);
      ringL.position.set(cx - (colRad + 0.02), trussEndY, baseZ);
      concreteGroup.add(ringL);
    }
    if (cx < 27) {
      const ringR = new THREE.Mesh(ringFlangeGeo, steelPlatMat);
      ringR.position.set(cx + (colRad + 0.02), trussEndY, baseZ);
      concreteGroup.add(ringR);
    }
  });

  // Dış Uç Flanş Kapakları (X = -27m ve X = +27m)
  const endCapGeo = new THREE.CylinderGeometry(colRad + 0.03, colRad + 0.03, 0.04, 32);
  endCapGeo.rotateZ(Math.PI / 2);
  [-floorLength / 2, floorLength / 2].forEach(ex => {
    const endCap = new THREE.Mesh(endCapGeo, steelPlatMat);
    endCap.position.set(ex, trussEndY, baseZ);
    concreteGroup.add(endCap);
  });

  // 60m Taşıyıcı Kolonların Beton Kaide Mesnet Pabuçları (3 Adet: Sol -16.5m, Merkez 0.0m, Sağ +16.5m)
  const shoeGeo = new THREE.BoxGeometry(0.60, 0.35, 0.60);
  roofCarrierXLocs.forEach(rx => {
    const trussShoe = new THREE.Mesh(shoeGeo, steelPlatMat);
    trussShoe.position.set(rx, trussEndY + 0.15, baseZ);
    concreteGroup.add(trussShoe);
  });

    // =========================================================================
  // 10.4. ÇATI TAŞIYICILARI İÇİN 4 METRELİK DİKEY KABLO MERDİVENLERİ
  // Kullanıcı İsteği:
  // - "kablo merdivenini diregin yanına degil arkasına al"
  // - "ortadan kaldırdıgımız kafeste bir kablo merdiveni var ya onu da bi yandaki direkten indir"
  // 3 Adet Dikey Kablo Merdiveni:
  //   1. Sol Uzay Çatı (X = -18.0m) -> X = -15.0m Direği Arkası
  //   2. Sağ Uzay Çatı (X = +18.0m) -> X = +15.0m Direği Arkası
  //   3. Merkez Uzay Çatı (X = 0.0m) -> Bi Yandaki X = +3.0m Direği Arkası
  // =========================================================================
  const cLadderGalvMat = new THREE.MeshStandardMaterial({
    color: 0xa4b0be,
    metalness: 0.85,
    roughness: 0.3
  });

  const cLadderDarkMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.8,
    roughness: 0.35
  });

  const fCableMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85, metalness: 0.1 });

  function buildScoreboardCarrierVerticalLadder(poleX, trussX, ladderName) {
    const vLadderGroup = new THREE.Group();
    vLadderGroup.name = ladderName;

    const vLadderW = 0.40; // 400mm genişlik
    const vLadderH = 4.00; // 4 metre yükseklik
    const vLadderD = 0.07; // 70mm derinlik
    const vRailW = 0.035;

    // Kullanıcı Kuralı:
    // - "kablo merdivenini diregin yanına degil arkasına al"
    // - "ortadan kaldırdıgımız kafeste bir kablo merdiveni var ya onu da bi yandaki direkten indir"
    const ladderX = poleX;
    const ladderZ = baseZ + colRad + vLadderD / 2; // Arka cephe montajı
    const bridgeDx = trussX - ladderX; // Truss'tan direğe olan X mesafesi (3.00m)
    const bridgeLen = Math.abs(bridgeDx);
    const isTrussToLeft = (bridgeDx < 0);

    vLadderGroup.position.set(ladderX, baseGroundY, ladderZ);

    const vRailGeo = new THREE.BoxGeometry(vRailW, vLadderH, vLadderD);

    // 1. DİKEY MERDİVEN RAYLARI (Direk Arka Yüzeyinde)
    const vLeft = new THREE.Mesh(vRailGeo, cLadderGalvMat);
    vLeft.position.set(-vLadderW / 2 + vRailW / 2, vLadderH / 2, 0);
    vLeft.castShadow = true;
    vLadderGroup.add(vLeft);

    const vRight = new THREE.Mesh(vRailGeo, cLadderGalvMat);
    vRight.position.set(vLadderW / 2 - vRailW / 2, vLadderH / 2, 0);
    vRight.castShadow = true;
    vLadderGroup.add(vRight);

    // Yan montaj delikleri / yarıkları (her 20 cm'de bir)
    const vSlotGeo = new THREE.BoxGeometry(vRailW + 0.002, 0.05, 0.015);
    for (let sy = 0.20; sy < vLadderH; sy += 0.20) {
      const sL = new THREE.Mesh(vSlotGeo, cLadderDarkMat);
      sL.position.set(-vLadderW / 2 + vRailW / 2, sy, 0);
      vLadderGroup.add(sL);
      const sR = new THREE.Mesh(vSlotGeo, cLadderDarkMat);
      sR.position.set(vLadderW / 2 - vRailW / 2, sy, 0);
      vLadderGroup.add(sR);
    }

    // Yatay Delikli C-profil basamaklar (her 25 cm'de bir)
    const vRungW = vLadderW - 2 * vRailW;
    const vRungGeo = new THREE.BoxGeometry(vRungW, 0.025, 0.035);
    for (let ry = 0.25; ry < vLadderH; ry += 0.25) {
      const rung = new THREE.Mesh(vRungGeo, cLadderDarkMat);
      rung.position.set(0, ry, 0);
      vLadderGroup.add(rung);
    }

    // 2. DİREĞİN ARKA YÜZÜNE SABİTLEME KELEPÇELERİ (Standoff Clamps & Ring Collars)
    // Yerel koordinatlarda direk merkezi: X = 0, Z = -(colRad + vLadderD/2) = -0.235m
    const poleLocalZ = -(colRad + vLadderD / 2);
    const bracketGeo = new THREE.BoxGeometry(0.12, 0.04, Math.abs(poleLocalZ));
    const ringCollarGeo = new THREE.CylinderGeometry(colRad + 0.012, colRad + 0.012, 0.06, 32);
    [0.80, 2.00, 3.20, 3.90].forEach(cy => {
      // Merdivenden öne (direğin arka yüzeyine) uzanan çelik sabitleme ayağı
      const bracket = new THREE.Mesh(bracketGeo, cLadderDarkMat);
      bracket.position.set(0, cy, poleLocalZ / 2);
      vLadderGroup.add(bracket);

      // Ø400mm Direği tam saran T-bilezik kuşağı
      const collarMesh = new THREE.Mesh(ringCollarGeo, steelPlatMat);
      collarMesh.position.set(0, cy, poleLocalZ);
      vLadderGroup.add(collarMesh);
    });

    // 3. UZAY ÇATIDAN DİREK ARKA MERDİVENİNE YATAY TAVA GEÇİŞİ (Header Kiriş Üzeri)
    if (bridgeLen > 0.10) {
      const bridgeTrayY = vLadderH + 0.03;
      const trayLen = bridgeLen - 0.20;
      const bridgeTrayGeo = new THREE.BoxGeometry(trayLen, 0.005, vLadderW);
      const bridgeTray = new THREE.Mesh(bridgeTrayGeo, cLadderGalvMat);
      bridgeTray.position.set(bridgeDx / 2 + (isTrussToLeft ? 0.10 : -0.10), bridgeTrayY, poleLocalZ);
      vLadderGroup.add(bridgeTray);

      // Tava yan yanakları
      const bWallGeo = new THREE.BoxGeometry(trayLen, 0.08, 0.005);
      [-vLadderW / 2, vLadderW / 2].forEach(wz => {
        const wall = new THREE.Mesh(bWallGeo, cLadderDarkMat);
        wall.position.set(bridgeDx / 2 + (isTrussToLeft ? 0.10 : -0.10), bridgeTrayY + 0.04, poleLocalZ + wz);
        vLadderGroup.add(wall);
      });

      // Direk tepe viraj tavası (Kiriş ekseninden direğin arkasına 90 derece L-dönüş köprüsü)
      const turnTrayGeo = new THREE.BoxGeometry(vLadderW, 0.005, Math.abs(poleLocalZ));
      const turnTray = new THREE.Mesh(turnTrayGeo, cLadderGalvMat);
      turnTray.position.set(0, bridgeTrayY, poleLocalZ / 2);
      vLadderGroup.add(turnTray);

      // Viraj tavası dış yan yanağı
      const turnWallGeo = new THREE.BoxGeometry(0.005, 0.08, Math.abs(poleLocalZ));
      const turnWall = new THREE.Mesh(turnWallGeo, cLadderDarkMat);
      turnWall.position.set(isTrussToLeft ? -vLadderW / 2 : vLadderW / 2, bridgeTrayY + 0.04, poleLocalZ / 2);
      vLadderGroup.add(turnWall);
    }

    // 4. UZAY ÇATIDAN DİREK ARKASINA VE MERDİVENE İNEN 6 ADET 7/8" FEEDER KABLOSU
    for (let fi = 0; fi < 6; fi++) {
      const fOffset = -vRungW / 2 + 0.035 + fi * 0.052;
      const bridgeTrayY = vLadderH + 0.03;
      const startPoint = new THREE.Vector3(bridgeDx, bridgeTrayY + 0.02, poleLocalZ + fOffset);
      const preTurn = new THREE.Vector3(isTrussToLeft ? -0.28 : 0.28, bridgeTrayY + 0.02, poleLocalZ + fOffset);
      const midTurn = new THREE.Vector3(fOffset * 0.7, bridgeTrayY + 0.02, -0.05);
      const postTurn = new THREE.Vector3(fOffset * 0.7, vLadderH - 0.15, 0.022);
      const endPoint = new THREE.Vector3(fOffset * 0.7, 0.05, 0.022);

      const cableCurve = new THREE.CurvePath();
      // 1. Yatay kiriş tavası boyunca düz hat (3 metre)
      cableCurve.add(new THREE.LineCurve3(startPoint, preTurn));
      // 2. Direğin arkasına doğru 90 derece yatay dönüş
      cableCurve.add(new THREE.QuadraticBezierCurve3(
        preTurn,
        new THREE.Vector3(isTrussToLeft ? -0.05 : 0.05, bridgeTrayY + 0.02, poleLocalZ + fOffset),
        midTurn
      ));
      // 3. Merdiven rungs üzerine dikey iniş kavisi (90 derece düşey dirsek)
      cableCurve.add(new THREE.QuadraticBezierCurve3(
        midTurn,
        new THREE.Vector3(fOffset * 0.7, bridgeTrayY + 0.02, 0.022),
        postTurn
      ));
      // 4. Merdiven boyunca dikey iniş (4 metre)
      cableCurve.add(new THREE.LineCurve3(postTurn, endPoint));

      const cGeo = new THREE.TubeGeometry(cableCurve, 40, 0.014, 8, false);
      const cMesh = new THREE.Mesh(cGeo, fCableMat);
      cMesh.castShadow = true;
      vLadderGroup.add(cMesh);
    }

    return vLadderGroup;
  }

  // 1. Sol Çatı Taşıyıcısı Dikey Kablo Merdiveni (X = -18.0m uzay çatıdan X = -15.0m direğinin ARKA yüzeyine)
  const leftCarrierLadder = buildScoreboardCarrierVerticalLadder(-15.00, -18.00, 'scoreboardLeftCarrierCableLadder');
  concreteGroup.add(leftCarrierLadder);

  // 2. Sağ Çatı Taşıyıcısı Dikey Kablo Merdiveni (X = +18.0m uzay çatıdan X = +15.0m direğinin ARKA yüzeyine)
  const rightCarrierLadder = buildScoreboardCarrierVerticalLadder(15.00, 18.00, 'scoreboardRightCarrierCableLadder');
  concreteGroup.add(rightCarrierLadder);

  // 3. Merkez Çatı Taşıyıcısı Dikey Kablo Merdiveni (X = 0.0m merkez uzay çatıdan bi yandaki X = +3.0m direğinin ARKA yüzeyine)
  // Kullanıcı İsteği: "ortadan kaldırdıgımız kafeste bir kablo merdiveni var ya onu da bi yandaki direkten indir"
  const centerCarrierLadder = buildScoreboardCarrierVerticalLadder(3.00, 0.00, 'scoreboardCenterCarrierCableLadder');
  concreteGroup.add(centerCarrierLadder);

  // =========================================================================
  // 10.5. KAFES MALZEMELERİ VE DOKULARI (ORTA KAFES KALDIRILDI)
  // Kullanıcı İsteği: "ortada olan kafesi komple kaldır"
  // =========================================================================
  const encFrontZ = baseZ - 0.95;
  const encBackZ = baseZ + 0.95;
  const encGlassH = 1.70;
  const encPostH = 1.75;

  const perforatedTex = createPerforatedMetalTexture();
  const createPerforatedMat = (wMeters, hMeters) => {
    const tex = perforatedTex.clone();
    tex.needsUpdate = true;
    const repX = Math.max(1, Math.round(wMeters * 4));
    const repY = Math.max(1, Math.round(hMeters * 4));
    tex.repeat.set(repX, repY);
    return new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.25,
      metalness: 0.85,
      roughness: 0.35,
      color: 0x94a3b8,
      side: THREE.DoubleSide
    });
  };

  const doorTrackMat = new THREE.MeshStandardMaterial({ color: 0x828b96, metalness: 0.85, roughness: 0.25 });
  const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8, roughness: 0.3 });
  const doorHandleMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.15 });

  // =========================================================================
  // 10.5.B. SOL VE SAĞ EKİPMAN İSTASYONLARI İÇİN İZOLE KAFESLER (11.20m GENİŞLİK)
  // Kullanıcı İsteği:
  // - "mümkün olan kolonları kafes dışına al."
  //   -> Kolon -21m, Kolon -9m, Kolon +9m, Kolon +21m kafes dışına alındı!
  //   -> Yalnızca ekipmanların ve çatı kablo inişinin ortasında kalan Kolon +/-15m kafes içinde.
  // - "Ön cephe yine kayar kapı arkalar ve yanlar cam oalcak şekilde. Kapıların kayma hareketlerini unutma"
  // - Sol Alan: X = -20.60m ile -9.40m arası (L = 11.20m, 8 Kapaklı 2'şerli Teleskopik Kayar Kapı)
  // - Sağ Alan: X = +9.40m ile +20.60m arası (L = 11.20m, 8 Kapaklı 2'şerli Teleskopik Kayar Kapı)
  // =========================================================================
  function buildSideStationEnclosureWithEquipment(minX, maxX, sideName, isLeftSide) {
    const sEncWidth = maxX - minX; // 11.20m
    const sEncCenterX = (minX + maxX) / 2; // Sol: -15.00m, Sağ: +15.00m
    const fixedEndW = 0.20; // 20 cm sabit yan bitiş panelleri (2 x 0.20m)
    const numDoors = 8; // 8 adet kademeli kayar kapı (4 çift)
    const sDoorW = (sEncWidth - 2 * fixedEndW) / numDoors; // 1.35m net kapı genişliği
    const sDoorH = encGlassH - 0.06; // 1.64m
    const doorStartX = minX + fixedEndW; // Kapı dizilim başlangıç X

    // 1. Üst ve Alt Kayar Kapı Kılavuz Rayları (11.30m boyunda)
    const sTrackSpan = sEncWidth + 0.10;
    const sTopTrackGeo = new THREE.BoxGeometry(sTrackSpan, 0.06, 0.10);
    const sTopTrack = new THREE.Mesh(sTopTrackGeo, doorTrackMat);
    sTopTrack.position.set(sEncCenterX, baseGroundY + encGlassH + 0.03, encFrontZ);
    sTopTrack.castShadow = true;
    concreteGroup.add(sTopTrack);

    const sFloorTrackGeo = new THREE.BoxGeometry(sTrackSpan, 0.015, 0.08);
    const sFloorTrack = new THREE.Mesh(sFloorTrackGeo, doorTrackMat);
    sFloorTrack.position.set(sEncCenterX, baseGroundY + 0.0075, encFrontZ);
    sFloorTrack.receiveShadow = true;
    concreteGroup.add(sFloorTrack);

    // 2. Yan Sabit Paneller (Sol: [minX, minX + 0.20], Sağ: [maxX - 0.20, maxX])
    [
      { startX: minX, endX: minX + fixedEndW, midX: minX + fixedEndW / 2 },
      { startX: maxX - fixedEndW, endX: maxX, midX: maxX - fixedEndW / 2 }
    ].forEach(fPanel => {
      const pPost1 = new THREE.Mesh(new THREE.BoxGeometry(postWidth, encPostH, postDepth), postMat);
      pPost1.position.set(fPanel.startX, baseGroundY + encPostH / 2, encFrontZ);
      pPost1.castShadow = true;
      concreteGroup.add(pPost1);

      const pPost2 = new THREE.Mesh(new THREE.BoxGeometry(postWidth, encPostH, postDepth), postMat);
      pPost2.position.set(fPanel.endX, baseGroundY + encPostH / 2, encFrontZ);
      pPost2.castShadow = true;
      concreteGroup.add(pPost2);

      const pGlassW = fixedEndW - postWidth;
      const pGlass = new THREE.Mesh(new THREE.BoxGeometry(pGlassW, encGlassH, glassThickness), glassMat);
      pGlass.position.set(fPanel.midX, baseGroundY + encGlassH / 2 + 0.02, encFrontZ);
      concreteGroup.add(pGlass);

      const pRailGeo = new THREE.BoxGeometry(pGlassW, 0.035, 0.03);
      [encGlassH + 0.02 - 0.02, encGlassH / 2 + 0.02, 0.02 + 0.02].forEach(ry => {
        const rail = new THREE.Mesh(pRailGeo, doorFrameMat);
        rail.position.set(fPanel.midX, baseGroundY + ry, encFrontZ);
        concreteGroup.add(rail);
      });
    });

    // 3. 8 Adet 135 cm'lik Kademeli Kayar Kapı (Teleskopik / Çift Raylı 2'şerli Baypas Eşleşmesi - 4 Çift)
    // İkili Gruplar: (0-1), (2-3), (4-5), (6-7)
    const sDoorPanelW = sDoorW - 0.06;
    const sDoorPanelH = sDoorH - 0.06;
    const sDoorPerforatedMat = createPerforatedMat(sDoorPanelW, sDoorPanelH);
    const sDoorPanelGeo = new THREE.PlaneGeometry(sDoorPanelW, sDoorPanelH);

    for (let d = 0; d < numDoors; d++) {
      const doorCenterX = doorStartX + d * sDoorW + sDoorW / 2;
      const isFirstInPair = (d % 2 === 0);
      const trackZ = isFirstInPair ? (encFrontZ + 0.025) : (encFrontZ - 0.025);
      const partnerX = isFirstInPair ? (doorCenterX + sDoorW) : (doorCenterX - sDoorW);

      const dGroup = new THREE.Group();
      dGroup.name = `scoreboard_${sideName}_sliding_door_${d}`;
      dGroup.position.set(doorCenterX, baseGroundY, trackZ);

      const dPanel = new THREE.Mesh(sDoorPanelGeo, sDoorPerforatedMat);
      dPanel.position.set(0, 0.03 + sDoorH / 2, 0);
      dGroup.add(dPanel);

      const hFrameGeo = new THREE.BoxGeometry(sDoorW, 0.04, 0.025);
      const topF = new THREE.Mesh(hFrameGeo, doorFrameMat);
      topF.position.set(0, 0.03 + sDoorH - 0.02, 0);
      dGroup.add(topF);

      const botF = new THREE.Mesh(hFrameGeo, doorFrameMat);
      botF.position.set(0, 0.03 + 0.02, 0);
      dGroup.add(botF);

      const midF = new THREE.Mesh(hFrameGeo, doorFrameMat);
      midF.position.set(0, 0.03 + sDoorH / 2, 0);
      dGroup.add(midF);

      const vFrameGeo = new THREE.BoxGeometry(0.04, sDoorH, 0.025);
      const leftF = new THREE.Mesh(vFrameGeo, doorFrameMat);
      leftF.position.set(-sDoorW / 2 + 0.02, 0.03 + sDoorH / 2, 0);
      dGroup.add(leftF);

      const rightF = new THREE.Mesh(vFrameGeo, doorFrameMat);
      rightF.position.set(sDoorW / 2 - 0.02, 0.03 + sDoorH / 2, 0);
      dGroup.add(rightF);

      // Üst Askı Makara Pabuçları
      const hgrGeo = new THREE.BoxGeometry(0.08, 0.05, 0.035);
      const hgr1 = new THREE.Mesh(hgrGeo, doorTrackMat);
      hgr1.position.set(-sDoorW / 3, 0.03 + sDoorH + 0.015, 0);
      dGroup.add(hgr1);

      const hgr2 = new THREE.Mesh(hgrGeo, doorTrackMat);
      hgr2.position.set(sDoorW / 3, 0.03 + sDoorH + 0.015, 0);
      dGroup.add(hgr2);

      // Dikey Paslanmaz Çelik Çekme Kolu (2'li eşlerin ortasında buluşacak şekilde)
      const hndlGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.60, 16);
      const hndl = new THREE.Mesh(hndlGeo, doorHandleMat);
      const hndlX = isFirstInPair ? (sDoorW / 2 - 0.10) : (-sDoorW / 2 + 0.10);
      hndl.position.set(hndlX, 0.90, 0.025);
      dGroup.add(hndl);

      const hndlMountGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.035, 12);
      hndlMountGeo.rotateX(Math.PI / 2);
      const m1 = new THREE.Mesh(hndlMountGeo, doorHandleMat);
      m1.position.set(hndlX, 0.90 + 0.25, 0.012);
      dGroup.add(m1);
      const m2 = new THREE.Mesh(hndlMountGeo, doorHandleMat);
      m2.position.set(hndlX, 0.90 - 0.25, 0.012);
      dGroup.add(m2);

      // Görünmez tıklama alanı
      const hitBoxGeo = new THREE.BoxGeometry(sDoorW, sDoorH, 0.08);
      const hitBoxMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
      const hitBox = new THREE.Mesh(hitBoxGeo, hitBoxMat);
      hitBox.position.set(0, 0.03 + sDoorH / 2, 0);
      dGroup.add(hitBox);

      dGroup.userData.isSlidingDoor = true;
      dGroup.userData.doorIndex = `${sideName}_${d}`;
      dGroup.userData.closedX = doorCenterX;
      dGroup.userData.openX = partnerX;
      dGroup.userData.targetX = doorCenterX;
      dGroup.userData.isOpen = false;

      concreteGroup.add(dGroup);
      alan4SlidingDoors.push(dGroup);
    }

    // 4. 170cm Yüksek Camlı Sol ve Sağ Yan Cepheler
    const sDepth = Math.abs(encBackZ - encFrontZ); // 1.90m
    const sMidZ = (encFrontZ + encBackZ) / 2;
    const sSidePostGeo = new THREE.BoxGeometry(postDepth, encPostH, postWidth);
    const sSideGlassDepth = (sDepth / 2) - postWidth;

    [minX, maxX].forEach(sideX => {
      const midP = new THREE.Mesh(sSidePostGeo, postMat);
      midP.position.set(sideX, baseGroundY + encPostH / 2, sMidZ);
      concreteGroup.add(midP);

      const backP = new THREE.Mesh(sSidePostGeo, postMat);
      backP.position.set(sideX, baseGroundY + encPostH / 2, encBackZ);
      concreteGroup.add(backP);

      const g1 = new THREE.Mesh(new THREE.BoxGeometry(glassThickness, encGlassH, sSideGlassDepth), glassMat);
      g1.position.set(sideX, baseGroundY + encGlassH / 2 + 0.02, encFrontZ + sDepth / 4);
      concreteGroup.add(g1);

      const g2 = new THREE.Mesh(new THREE.BoxGeometry(glassThickness, encGlassH, sSideGlassDepth), glassMat);
      g2.position.set(sideX, baseGroundY + encGlassH / 2 + 0.02, encBackZ - sDepth / 4);
      concreteGroup.add(g2);
    });

    // 5. Arka Yüksek Cam Cephe (Z = encBackZ, 11.20m Açıklık, 8 Cam Panel)
    const backPanelCount = numDoors; // 8 adet cam panel
    const backSpacing = sEncWidth / backPanelCount; // 1.40m
    for (let bi = 1; bi < backPanelCount; bi++) {
      const bPostX = minX + bi * backSpacing;
      const bPost = new THREE.Mesh(new THREE.BoxGeometry(postWidth, encPostH, postDepth), postMat);
      bPost.position.set(bPostX, baseGroundY + encPostH / 2, encBackZ);
      bPost.castShadow = true;
      concreteGroup.add(bPost);
    }
    for (let bi = 0; bi < backPanelCount; bi++) {
      const bMidX = minX + bi * backSpacing + backSpacing / 2;
      const bGlassW = backSpacing - postWidth;
      const bGlass = new THREE.Mesh(new THREE.BoxGeometry(bGlassW, encGlassH, glassThickness), glassMat);
      bGlass.position.set(bMidX, baseGroundY + encGlassH / 2 + 0.02, encBackZ);
      concreteGroup.add(bGlass);
    }
  }

  // Sol İzole Alanı (X = -20.60m ile -9.40m arası, Kolon -21m ve Kolon -9m DIŞARIDA)
  buildSideStationEnclosureWithEquipment(-20.60, -9.40, 'left', true);

  // Sağ İzole Alanı (X = +9.40m ile +20.60m arası, Kolon +9m ve Kolon +21m DIŞARIDA)
  buildSideStationEnclosureWithEquipment(9.40, 20.60, 'right', false);

  // =========================================================================
  // 10.6. STANDART ÖN VE YAN CAM KORUMA KORKULUKLARI (54M BETON KAİDE BOYUNCA)
  // Ortadaki kafes tamamen kaldırıldı; merkezde 18.80m kesintisiz açık yürüme yolu ve
  // standart 1.10m cam korkuluk yer alır.
  // Kolon -27, -21, -9, -3, 0, +3, +9, +21, +27 olmak üzere 8 kolon kafes dışındadır.
  // =========================================================================
  const frontRailingSpans = [
    { startX: -floorLength / 2, endX: -20.60 }, // [-27.00, -20.60] (L = 6.40m, Kolon -27 ve Kolon -21 açıkta)
    { startX: -9.40, endX: 9.40 },              // [-9.40, +9.40]   (L = 18.80m, Kolon -9, -3, 0, +3, +9 açık merkez yürüme yolu)
    { startX: 20.60, endX: floorLength / 2 }    // [+20.60, +27.00] (L = 6.40m, Kolon +21 ve Kolon +27 açıkta)
  ];

  frontRailingSpans.forEach(span => {
    const spanLen = span.endX - span.startX;
    if (spanLen < 0.20) return;
    const numPosts = Math.max(2, Math.round(spanLen / 1.5) + 1);
    const spacing = spanLen / (numPosts - 1);
    for (let i = 0; i < numPosts; i++) {
      const xPos = span.startX + i * spacing;
      const post = new THREE.Mesh(new THREE.BoxGeometry(postWidth, stdPostH, postDepth), postMat);
      post.position.set(xPos, baseGroundY + stdPostH / 2, encFrontZ);
      post.castShadow = true;
      concreteGroup.add(post);

      if (i < numPosts - 1) {
        const panelW = spacing - postWidth;
        const glass = new THREE.Mesh(new THREE.BoxGeometry(panelW, stdGlassH, glassThickness), glassMat);
        glass.position.set(xPos + spacing / 2, baseGroundY + stdGlassH / 2 + 0.05, encFrontZ);
        concreteGroup.add(glass);
      }
    }
  });

  // Yan Camlar: Sol Uç (X = -27.0m) ve Sağ Uç (X = +27.0m)
  [-floorLength / 2, floorLength / 2].forEach(ex => {
    const endGlass = new THREE.Mesh(new THREE.BoxGeometry(glassThickness, stdGlassH, floorWidth - 0.10), glassMat);
    endGlass.position.set(ex, baseGroundY + stdGlassH / 2 + 0.05, baseZ);
    concreteGroup.add(endGlass);

    [-floorWidth / 2 + 0.05, floorWidth / 2 - 0.05].forEach(dz => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(postDepth, stdPostH, postWidth), postMat);
      post.position.set(ex, baseGroundY + stdPostH / 2, baseZ + dz);
      concreteGroup.add(post);
    });
  });

  alan4Group.add(concreteGroup);


  scene.add(alan4Group);
}

// Standalone Interactive Model Builder: Alan 4 Çemberli H-Beam Platform & Alan 1 Flanşlı Borulu Tabla Bloğu (120x260 cm)
function buildAlan4CemberPlatformBlok() {
  const group = new THREE.Group();
  group.userData = {
    type: 'platform',
    blockType: 'alan4-cember-platform-blok',
    category: 'Platform',
    name: 'Çemberli H-Beam Platform & Flanşlı Borulu Tabla Bloğu (Alan 4)',
    width: 1.20,
    depth: 2.60,
    height: 2.40,
    weight: 480,
    interactive: true,
    lockedX: false,
    lockedY: true,
    lockedZ: true,
    allowPassThrough: true
  };

  // Malzemeler (Alan 1 Çelik Renk Paleti)
  const whiteSteelMat = new THREE.MeshStandardMaterial({ 
    color: 0xffffff, 
    metalness: 0.2, 
    roughness: 0.4 
  });
  const boltMat = new THREE.MeshStandardMaterial({ 
    color: 0xd1d5db, 
    metalness: 0.8, 
    roughness: 0.2 
  });

  // Geometrik Parametreler
  const beamSpanZ = 3.80;        // 3.80 m (Silindir 1 ön ucu -2.42m ile Silindir 2 arka ucu +1.30m arasını tamamen kaplar)
  const beamCenterZ = -0.55;     // H-Beam merkez Z

  // 1. İKİ SİLİNDİRİ KAPLAYAN ÇEMBERLER (Alan-1 Beyaz Çelik Rengi)
  const clampRingGeo = new THREE.CylinderGeometry(0.765, 0.765, 0.14, 36, 1, true);
  const clampEarGeo = new THREE.BoxGeometry(0.14, 0.08, 0.06);
  const clampBoltGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.10, 8);
  const clampSaddleGeo = new THREE.BoxGeometry(0.24, 0.08, 0.40);

  const beamXOffsets = [-0.35, 0.35];

  beamXOffsets.forEach(xOffset => {
    // Silindir 1 Çemberi (Ön Silindir Z = -1.67m, Y = -0.95m)
    const ring1 = new THREE.Mesh(clampRingGeo, whiteSteelMat);
    ring1.rotation.z = Math.PI / 2;
    ring1.position.set(xOffset, -0.95, -1.67);
    group.add(ring1);

    [-1.67 - 0.76, -1.67 + 0.76].forEach(zEar => {
      const ear = new THREE.Mesh(clampEarGeo, whiteSteelMat);
      ear.position.set(xOffset, -0.95, zEar);
      group.add(ear);

      const b = new THREE.Mesh(clampBoltGeo, boltMat);
      b.position.set(xOffset, -0.95, zEar);
      group.add(b);
    });

    const saddle1 = new THREE.Mesh(clampSaddleGeo, whiteSteelMat);
    saddle1.position.set(xOffset, -0.20, -1.67);
    group.add(saddle1);

    // Silindir 2 Çemberi (Arka Silindir Z = +0.55m, Y = -0.95m)
    const ring2 = new THREE.Mesh(clampRingGeo, whiteSteelMat);
    ring2.rotation.z = Math.PI / 2;
    ring2.position.set(xOffset, -0.95, 0.55);
    group.add(ring2);

    [0.55 - 0.76, 0.55 + 0.76].forEach(zEar => {
      const ear = new THREE.Mesh(clampEarGeo, whiteSteelMat);
      ear.position.set(xOffset, -0.95, zEar);
      group.add(ear);

      const b = new THREE.Mesh(clampBoltGeo, boltMat);
      b.position.set(xOffset, -0.95, zEar);
      group.add(b);
    });

    const saddle2 = new THREE.Mesh(clampSaddleGeo, whiteSteelMat);
    saddle2.position.set(xOffset, -0.20, 0.55);
    group.add(saddle2);
  });

  // İki çember arasındaki bağ plakası (Alan-1 Beyaz Çelik Rengi)
  const saddleTieGeo = new THREE.BoxGeometry(0.85, 0.10, 0.72);
  const saddleTie = new THREE.Mesh(saddleTieGeo, whiteSteelMat);
  saddleTie.position.set(0, -0.20, -0.56);
  group.add(saddleTie);

  // 2. HEB 200 H-BEAM KİRİŞLERİ (3.80m Boyunda, İki Silindirin Üzerini Kapatır, Beyaz Çelik)
  beamXOffsets.forEach(xOffset => {
    const hbeam = createIBeam(beamSpanZ, 0.20, 0.20, 0.015, whiteSteelMat);
    hbeam.position.set(xOffset, -0.10, beamCenterZ);
    group.add(hbeam);
  });

  // Kiriş ara takviye profilleri
  const crossStiffGeo = new THREE.BoxGeometry(0.70, 0.12, 0.08);
  [-2.2, -1.55, -0.55, 0.45, 1.15].forEach(zPos => {
    const stiff = new THREE.Mesh(crossStiffGeo, whiteSteelMat);
    stiff.position.set(0, -0.10, zPos);
    group.add(stiff);
  });

  // 3. FLANŞLI BORU VE TABLALAR — DOĞRUDAN DÜNYA KOORDİNATLARIYLA (KORKULUKTAN 20CM İÇERİ)
  const tableMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.3, transparent: true, opacity: 0.95 });
  const borderMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.5, roughness: 0.3 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0xfdb913, metalness: 0.5, roughness: 0.3 });
  const boltHeadMat = new THREE.MeshStandardMaterial({ color: 0x718096, metalness: 0.9, roughness: 0.1 });
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });

  const frontZ = -1.85;
  const rearZ   =  0.75;
  const leftX   = -0.60;
  const rightX  =  0.60;
  const platWidth  = 1.20;   // X yönünde platform genişliği
  const platLength = 2.60;   // Z yönünde platform uzunluğu
  const tableY = 0.02;       // Tabla yüzey Y
  const pipeZ  = -1.65;      // Flanşlı boru Z — ön korkuluktan (frontZ=-1.85) 20cm içeri

  // 3.1 Enine taşıyıcı mini I-Beam'ler (tabla altı destek profilleri)
  [-1.80, -1.65, -1.05, -0.15, 0.70].forEach(zPos => {
    const tBeam = createIBeam(platWidth, 0.15, 0.12, 0.01, whiteSteelMat);
    tBeam.rotation.y = Math.PI / 2;
    tBeam.position.set(0, -0.01, zPos);
    group.add(tBeam);
  });

  // 3.2 Alan 1 standart flanşlı boru donanımı (Kiriş-2 birebir - zemine tam oturtulmuş)
  // Tabla altı mesnet dikmesi (I-Beam ile tabla arası)
  const flangePostGeo = new THREE.BoxGeometry(0.08, 0.04, 0.08);
  const flangePost = new THREE.Mesh(flangePostGeo, whiteSteelMat);
  flangePost.position.set(0, 0.005, pipeZ);
  group.add(flangePost);

  // Tabla üstü alt flanş plakası (tablaya tam oturan taban flanşı)
  const flangePlateGeo = new THREE.BoxGeometry(0.20, 0.012, 0.20);
  const riserFlange = new THREE.Mesh(flangePlateGeo, whiteSteelMat);
  riserFlange.position.set(0, tableY + 0.016, pipeZ);
  riserFlange.castShadow = true;
  group.add(riserFlange);

  // Boru birleşim üst flanş plakası
  const pipeFlange = new THREE.Mesh(flangePlateGeo, whiteSteelMat);
  pipeFlange.position.set(0, tableY + 0.028, pipeZ);
  pipeFlange.castShadow = true;
  group.add(pipeFlange);

  // Flanş cıvataları
  [-0.075, 0.075].forEach(dx => {
    [-0.075, 0.075].forEach(dz => {
      const hexBolt = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 6), boltHeadMat);
      hexBolt.position.set(dx, tableY + 0.038, pipeZ + dz);
      group.add(hexBolt);
    });
  });

  // Düşey 2m boru
  const verticalPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.03175, 0.03175, 2.0, 32), pipeMat);
  verticalPipe.position.set(0, tableY + 1.03, pipeZ);
  verticalPipe.castShadow = true;
  group.add(verticalPipe);

  // 3.3 Platform tablaları (Zeminde sıfır boşluk — 3 modüler kapalı tabla: Ön, Orta, Arka)
  // Tabla 1: Ön Tabla (Z: -1.85m -> -1.05m, Uzunluk: 0.80m, Genişlik: 1.20m, Merkez Z: -1.45m)
  const t1Length = 0.80;
  const t1CenterZ = -1.45;
  const t1Mesh = new THREE.Mesh(new THREE.BoxGeometry(platWidth, 0.02, t1Length), tableMat);
  t1Mesh.position.set(0, tableY, t1CenterZ);
  t1Mesh.receiveShadow = true;
  group.add(t1Mesh);

  // Tabla 2: Orta Tabla (Z: -1.05m -> -0.15m, Uzunluk: 0.90m, Genişlik: 1.20m, Merkez Z: -0.60m)
  const t2Length = 0.90;
  const t2CenterZ = -0.60;
  const t2Mesh = new THREE.Mesh(new THREE.BoxGeometry(platWidth, 0.02, t2Length), tableMat);
  t2Mesh.position.set(0, tableY, t2CenterZ);
  t2Mesh.receiveShadow = true;
  group.add(t2Mesh);

  // Tabla 3: Arka Tabla (Z: -0.15m -> +0.75m, Uzunluk: 0.90m, Genişlik: 1.20m, Merkez Z: +0.30m)
  const t3Length = 0.90;
  const t3CenterZ = 0.30;
  const t3Mesh = new THREE.Mesh(new THREE.BoxGeometry(platWidth, 0.02, t3Length), tableMat);
  t3Mesh.position.set(0, tableY, t3CenterZ);
  t3Mesh.receiveShadow = true;
  group.add(t3Mesh);

  // Tablalar arası modüler ayrım ve kenar bordür profilleri (Alan 1 tarzı)
  // Tabla 1, 2, 3 yan kenar bordürleri
  [-0.59, 0.59].forEach(xBorder => {
    const bSide1 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, t1Length), borderMat);
    bSide1.position.set(xBorder, tableY + 0.015, t1CenterZ);
    group.add(bSide1);

    const bSide2 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, t2Length), borderMat);
    bSide2.position.set(xBorder, tableY + 0.015, t2CenterZ);
    group.add(bSide2);

    const bSide3 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, t3Length), borderMat);
    bSide3.position.set(xBorder, tableY + 0.015, t3CenterZ);
    group.add(bSide3);
  });

  // Tablalar arası enine birleşim çıtaları (Z = -1.05m ve Z = -0.15m)
  [-1.05, -0.15].forEach(zSeam => {
    const seamBorder = new THREE.Mesh(new THREE.BoxGeometry(platWidth, 0.03, 0.02), borderMat);
    seamBorder.position.set(0, tableY + 0.015, zSeam);
    group.add(seamBorder);
  });

  // 3.4 Dış tekme levhaları (kickplates — tüm çevreyi kapatır)
  const kpX = new THREE.BoxGeometry(platWidth, 0.10, 0.02);
  const kpZ = new THREE.BoxGeometry(0.02, 0.10, platLength);
  const kpFront = new THREE.Mesh(kpX, borderMat); kpFront.position.set(0, tableY + 0.04, frontZ);         group.add(kpFront);
  const kpRear  = new THREE.Mesh(kpX, borderMat); kpRear.position.set(0, tableY + 0.04, rearZ);            group.add(kpRear);
  const kpLeft  = new THREE.Mesh(kpZ, borderMat); kpLeft.position.set(leftX, tableY + 0.04, beamCenterZ);  group.add(kpLeft);
  const kpRight = new THREE.Mesh(kpZ, borderMat); kpRight.position.set(rightX, tableY + 0.04, beamCenterZ); group.add(kpRight);

  // 3.5 4 KÖŞE + 4 KENAR KORKULUK DİREKLERİ (Sarı)
  const postHeight = 1.15;
  const postGeo2 = new THREE.CylinderGeometry(0.02, 0.02, postHeight, 16);

  const postPositions = [
    // 4 Köşe
    { x: leftX,  z: frontZ },
    { x: rightX, z: frontZ },
    { x: rightX, z: rearZ  },
    { x: leftX,  z: rearZ  },
    // Sol kenar ara direkler
    { x: leftX,  z: -1.20  },
    { x: leftX,  z: -0.55  },
    { x: leftX,  z:  0.10  },
    // Sağ kenar ara direkler
    { x: rightX, z: -1.20  },
    { x: rightX, z: -0.55  },
    { x: rightX, z:  0.10  },
    // Ön kenar orta direk
    { x: 0,      z: frontZ },
    // Arka kenar orta direk
    { x: 0,      z: rearZ  }
  ];

  postPositions.forEach(pos => {
    const postMesh = new THREE.Mesh(postGeo2, railMat);
    postMesh.position.set(pos.x, tableY + postHeight / 2, pos.z);
    postMesh.castShadow = true;
    group.add(postMesh);
  });

  // Yatay korkuluk rayları — 2 yükseklikte, 4 tarafta
  const railHeights = [0.55, 1.10];
  railHeights.forEach(rh => {
    const yPos = tableY + rh;

    const rFront = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, platWidth, 16), railMat);
    rFront.rotation.z = Math.PI / 2;
    rFront.position.set(0, yPos, frontZ);
    group.add(rFront);

    const rRear = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, platWidth, 16), railMat);
    rRear.rotation.z = Math.PI / 2;
    rRear.position.set(0, yPos, rearZ);
    group.add(rRear);

    const rLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, platLength, 16), railMat);
    rLeft.rotation.x = Math.PI / 2;
    rLeft.position.set(leftX, yPos, beamCenterZ);
    group.add(rLeft);

    const rRight = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, platLength, 16), railMat);
    rRight.rotation.x = Math.PI / 2;
    rRight.position.set(rightX, yPos, beamCenterZ);
    group.add(rRight);
  });

  return group;
}

function spawnAlan4CemberPlatformBlok() {
  const blockGroup = buildAlan4CemberPlatformBlok();
  blockGroup.userData.id = state.nextId++;
  setupPlatformTransform(blockGroup, 8.50, -0.70, false);
  blockGroup.position.set(8.50, 20.0, -0.70);
  addPlatformToActiveArea(blockGroup);
}



// Standalone Interactive Model Builder: 30cm Düz Ofset Kolu & 2.5" Boru Modülü (Sağ / Sol, Çift Kol Y: 1.0m & 2.0m)
function buildOffsetArmPipeModel(side = 'right') {
  const group = new THREE.Group();
  const isRight = side === 'right';
  const nameLabel = isRight ? '30cm Ofset & 2.5" Boru (Sağ - Çift Kol)' : '30cm Ofset & 2.5" Boru (Sol - Çift Kol)';
  const areaTag = state.currentArea === 'alan3' ? ' (Alan 3)' : (state.currentArea === 'alan2' ? ' (Alan 2)' : '');

  group.userData = {
    id: state.nextId++,
    type: 'platform',
    isOffsetArmModule: true,
    name: `${nameLabel}${areaTag}`,
    width: 0.50,
    depth: 0.50,
    height: 3.0,
    interactive: true,
    lockedX: false,
    lockedY: true,
    lockedZ: false,
    allowPassThrough: true
  };

  const clampMat = new THREE.MeshStandardMaterial({ color: 0x34495e, metalness: 0.8, roughness: 0.3 });
  const offsetPipeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.3, roughness: 0.4 });

  // Post Joint Group pre-tilted at matching 20cm pipe inclination angle (+20° +Z, ±20° X)
  const jointGroup = new THREE.Group();
  jointGroup.rotation.x = Math.PI / 9; // +20° +Z
  jointGroup.rotation.z = isRight ? -Math.PI / 9 : Math.PI / 9; // +20° +X (Right) or -20° -X (Left)

  const armLength = 0.30; // 30cm arm length
  const yHeights = [1.0, 2.0]; // 2 horizontal arms at 1.0m and 2.0m height

  // Add 2 horizontal offset arms with inner and outer clamps
  yHeights.forEach(armYPos => {
    // Inner Clamp (attaches/clamps onto the 20cm pipe)
    const innerClampGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.08, 24);
    const innerClamp = new THREE.Mesh(innerClampGeo, clampMat);
    innerClamp.position.set(0, armYPos, 0);
    jointGroup.add(innerClamp);

    // Horizontal Offset Arm (pointing straight forward along local +Z axis)
    const armGeo = new THREE.CylinderGeometry(0.025, 0.025, armLength, 16);
    const armMesh = new THREE.Mesh(armGeo, clampMat);
    armMesh.rotation.x = Math.PI / 2;
    armMesh.position.set(0, armYPos, armLength / 2);
    armMesh.castShadow = true;
    jointGroup.add(armMesh);

    // Outer Clamp (at tip of 30cm arm)
    const outerClampGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.08, 16);
    const outerClamp = new THREE.Mesh(outerClampGeo, clampMat);
    outerClamp.position.set(0, armYPos, armLength);
    outerClamp.castShadow = true;
    jointGroup.add(outerClamp);
  });

  // 2.5 inch vertical mounting pipe at tip (spans Y: 0.30m to 3.00m, length 2.70m, center Y: 1.65m)
  const pipeRadius = 0.03175; // 2.5 inch diameter -> radius 3.175 cm
  const pipeHeight = 2.70;
  const pipeCenterY = 1.65;
  const vertPipeGeo = new THREE.CylinderGeometry(pipeRadius, pipeRadius, pipeHeight, 32);
  const vertPipe = new THREE.Mesh(vertPipeGeo, offsetPipeMat);
  vertPipe.position.set(0, pipeCenterY, armLength);
  vertPipe.castShadow = true;
  vertPipe.receiveShadow = true;
  jointGroup.add(vertPipe);

  // Top Cap
  const capGeo = new THREE.CylinderGeometry(pipeRadius * 1.05, pipeRadius * 1.05, 0.04, 32);
  const cap = new THREE.Mesh(capGeo, clampMat);
  cap.position.set(0, 3.00 + 0.02, armLength);
  jointGroup.add(cap);

  group.add(jointGroup);
  return group;
}

function spawnOffsetArmPipeRight() {
  if (state.currentArea !== 'alan2' && state.currentArea !== 'alan3') return;
  const group = buildOffsetArmPipeModel('right');
  group.position.set(0, -0.4535, -4.5);
  addPlatformToActiveArea(group);
}

function spawnOffsetArmPipeLeft() {
  if (state.currentArea !== 'alan2' && state.currentArea !== 'alan3') return;
  const group = buildOffsetArmPipeModel('left');
  group.position.set(0, -0.4535, -4.5);
  addPlatformToActiveArea(group);
}



createAlan4Structure();
  createAlan2Structure();
  createAlan3Structure();

createGroundCoordinateGuide();

// Ground Coordinate System Guide (X & Z Axis Compass Schema on Floor)
function createGroundCoordinateGuide() {
  const guideGroup = new THREE.Group();
  guideGroup.name = 'groundCoordinateGuide';
  guideGroup.visible = false; // Default: kapalı
  
  const yPos = -1.60; // Placed lower down below ground/catwalk level

  function createTextSprite(text, colorStr, bgStr = 'rgba(15, 23, 42, 0.90)') {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 140;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = bgStr;
    ctx.beginPath();
    ctx.roundRect(10, 10, 280, 120, 18);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = colorStr;
    ctx.stroke();

    ctx.fillStyle = colorStr;
    ctx.font = '900 32px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 150, 70);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.5, 0.70, 1);
    return sprite;
  }

  const arrowLength = 3.5;

  // 1. Red X-Axis (+X and -X)
  const xDirPos = new THREE.Vector3(1, 0, 0);
  const xArrowPos = new THREE.ArrowHelper(xDirPos, new THREE.Vector3(0, yPos, 0), arrowLength, 0xef4444, 0.5, 0.25);
  guideGroup.add(xArrowPos);

  const xDirNeg = new THREE.Vector3(-1, 0, 0);
  const xArrowNeg = new THREE.ArrowHelper(xDirNeg, new THREE.Vector3(0, yPos, 0), arrowLength, 0xf87171, 0.5, 0.25);
  guideGroup.add(xArrowNeg);

  // 2. Blue Z-Axis (+Z and -Z)
  const zDirPos = new THREE.Vector3(0, 0, 1);
  const zArrowPos = new THREE.ArrowHelper(zDirPos, new THREE.Vector3(0, yPos, 0), arrowLength, 0x0284c7, 0.5, 0.25);
  guideGroup.add(zArrowPos);

  const zDirNeg = new THREE.Vector3(0, 0, -1);
  const zArrowNeg = new THREE.ArrowHelper(zDirNeg, new THREE.Vector3(0, yPos, 0), arrowLength, 0x38bdf8, 0.5, 0.25);
  guideGroup.add(zArrowNeg);

  // 3. Direction Badges
  const labelPX = createTextSprite('+X (Sağ Taraf)', '#ef4444');
  labelPX.position.set(4.0, yPos + 0.15, 0);
  guideGroup.add(labelPX);

  const labelNX = createTextSprite('-X (Sol Taraf)', '#f87171');
  labelNX.position.set(-4.0, yPos + 0.15, 0);
  guideGroup.add(labelNX);

  const labelPZ = createTextSprite('+Z (Görünür Ön)', '#0284c7');
  labelPZ.position.set(0, yPos + 0.15, 4.0);
  guideGroup.add(labelPZ);

  const labelNZ = createTextSprite('-Z (Derinlik Arka)', '#38bdf8');
  labelNZ.position.set(0, yPos + 0.15, -4.0);
  guideGroup.add(labelNZ);

  // Center Compass Ring
  const ringGeo = new THREE.RingGeometry(0.35, 0.42, 32);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xfdb913, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = yPos;
  guideGroup.add(ring);

  scene.add(guideGroup);
}

// Helper to create an I-beam profile along Z-axis
function createIBeam(length, height, width, thickness, material) {
  const group = new THREE.Group();
  
  // Flanges (Top and Bottom)
  const flangeGeo = new THREE.BoxGeometry(width, thickness, length);
  
  const topFlange = new THREE.Mesh(flangeGeo, material);
  topFlange.position.y = height / 2 - thickness / 2;
  topFlange.castShadow = true;
  topFlange.receiveShadow = true;
  group.add(topFlange);
  
  const bottomFlange = new THREE.Mesh(flangeGeo, material);
  bottomFlange.position.y = -height / 2 + thickness / 2;
  bottomFlange.castShadow = true;
  bottomFlange.receiveShadow = true;
  group.add(bottomFlange);
  
  // Web (Middle vertical part)
  const webGeo = new THREE.BoxGeometry(thickness, height - 2 * thickness, length);
  const web = new THREE.Mesh(webGeo, material);
  web.position.y = 0;
  web.castShadow = true;
  web.receiveShadow = true;
  group.add(web);
  
  return group;
}



// Function to create the custom bridging deck plate with cutout (tabla-1) centered at X = -0.5
// Spans from X = -1.0 to X = 0.0, with a tight 10x10cm notch cutout at X = -0.9 to clear the 8x8cm riser post.
function createTabla1() {
  const tableGroup = new THREE.Group();
  tableGroup.name = 'tabla-1';

  // Table material - steel grating look (painted white to match the theme)
  const tableMat = new THREE.MeshStandardMaterial({ 
    color: 0xffffff, 
    roughness: 0.4, 
    metalness: 0.3,
    transparent: true,
    opacity: 0.95
  });

  const thickness = 0.02;
  const tableY = 0.1 - 0.2655 + thickness / 2; // -0.1555 absolute center Y (rests on top of beams)
  const centerX = -0.5; // Centered in the left span [-1.0, 0]
  const centerZ = -1.1855; // aligned with the pipe center

  // Segment 1: Front part (depth is 0.70m, from Z = -0.75 to -0.05 relative to centerZ)
  // Spans full 1.0m width (X: -1.0 to 0)
  const seg1Geo = new THREE.BoxGeometry(1.0, thickness, 0.70);
  const seg1 = new THREE.Mesh(seg1Geo, tableMat);
  seg1.position.set(centerX, tableY, centerZ - 0.40); // center of -0.75 to -0.05 is -0.40
  seg1.castShadow = true;
  seg1.receiveShadow = true;
  tableGroup.add(seg1);

  // Segment 2: Back part (depth is 0.70m, from Z = 0.05 to 0.75 relative to centerZ)
  // Spans full 1.0m width (X: -1.0 to 0)
  const seg2 = new THREE.Mesh(seg1Geo, tableMat);
  seg2.position.set(centerX, tableY, centerZ + 0.40); // center of 0.05 to 0.75 is +0.40
  seg2.castShadow = true;
  seg2.receiveShadow = true;
  tableGroup.add(seg2);

  // Segment 3: Middle part (depth is 0.10m, from Z = -0.05 to 0.05 relative to centerZ)
  // Notch is at X = -0.95 to -0.85 (10cm cutout centered at X = -0.9)
  // Segment 3a: Left of cutout (X: -1.0 to -0.95, width = 5cm)
  const seg3aGeo = new THREE.BoxGeometry(0.05, thickness, 0.10);
  const seg3a = new THREE.Mesh(seg3aGeo, tableMat);
  seg3a.position.set(-0.975, tableY, centerZ); // Midpoint of [-1.0, -0.95] is -0.975
  seg3a.castShadow = true;
  seg3a.receiveShadow = true;
  tableGroup.add(seg3a);

  // Segment 3b: Right of cutout (X: -0.85 to 0.0, width = 85cm)
  const seg3bGeo = new THREE.BoxGeometry(0.85, thickness, 0.10);
  const seg3b = new THREE.Mesh(seg3bGeo, tableMat);
  seg3b.position.set(-0.425, tableY, centerZ); // Midpoint of [-0.85, 0.0] is -0.425
  seg3b.castShadow = true;
  seg3b.receiveShadow = true;
  tableGroup.add(seg3b);

  // Add borders or framing on the outer edges for structural realism
  const borderMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.5, roughness: 0.3 });
  
  // Right border (on Kiriş-1 side at X = 0.0)
  const borderRightGeo = new THREE.BoxGeometry(0.02, 0.04, 1.5);
  const borderRight = new THREE.Mesh(borderRightGeo, borderMat);
  borderRight.position.set(0.0, tableY, centerZ);
  tableGroup.add(borderRight);

  // Cutout border framing (around the notch at X = -0.95 to -0.85, Z = -0.05 to 0.05)
  // Left inner border of notch at X = -0.95
  const notchBorderLeftGeo = new THREE.BoxGeometry(0.02, 0.04, 0.10);
  const notchBorderLeft = new THREE.Mesh(notchBorderLeftGeo, borderMat);
  notchBorderLeft.position.set(-0.95, tableY, centerZ);
  tableGroup.add(notchBorderLeft);

  // Right inner border of notch at X = -0.85
  const notchBorderRight = notchBorderLeft.clone();
  notchBorderRight.position.set(-0.85, tableY, centerZ);
  tableGroup.add(notchBorderRight);

  // Border Z-edges at Z = -0.05 and Z = 0.05 (spans X: -0.95 to -0.85)
  const notchBorderZGeo = new THREE.BoxGeometry(0.10, 0.04, 0.02);
  const notchBorderZ1 = new THREE.Mesh(notchBorderZGeo, borderMat);
  notchBorderZ1.position.set(-0.90, tableY, centerZ - 0.05);
  tableGroup.add(notchBorderZ1);

  const notchBorderZ2 = notchBorderZ1.clone();
  notchBorderZ2.position.set(-0.90, tableY, centerZ + 0.05);
  tableGroup.add(notchBorderZ2);

  scene.add(tableGroup);
}

// Function to create the custom bridging deck plate with cutout (tabla-2) centered at X = 0.5
// Spans from X = 0.0 to X = 1.0, with a tight 10x10cm notch cutout at X = 0.9 to clear the 8x8cm riser post.
function createTabla2() {
  const tableGroup = new THREE.Group();
  tableGroup.name = 'tabla-2';

  // Table material - steel grating look (painted white)
  const tableMat = new THREE.MeshStandardMaterial({ 
    color: 0xffffff, 
    roughness: 0.4, 
    metalness: 0.3,
    transparent: true,
    opacity: 0.95
  });

  const thickness = 0.02;
  const tableY = 0.1 - 0.2655 + thickness / 2; // -0.1555 absolute center Y (rests on top of beams)
  const centerX = 0.5; // Centered in the right span [0, 1.0]
  const centerZ = -1.1855; // aligned with the pipe center

  // Segment 1: Front part (depth is 0.70m, from Z = -0.75 to -0.05 relative to centerZ)
  // Spans full 1.0m width (X: 0 to 1.0)
  const seg1Geo = new THREE.BoxGeometry(1.0, thickness, 0.70);
  const seg1 = new THREE.Mesh(seg1Geo, tableMat);
  seg1.position.set(centerX, tableY, centerZ - 0.40);
  seg1.castShadow = true;
  seg1.receiveShadow = true;
  tableGroup.add(seg1);

  // Segment 2: Back part (depth is 0.70m, from Z = 0.05 to 0.75 relative to centerZ)
  // Spans full 1.0m width (X: 0 to 1.0)
  const seg2 = new THREE.Mesh(seg1Geo, tableMat);
  seg2.position.set(centerX, tableY, centerZ + 0.40);
  seg2.castShadow = true;
  seg2.receiveShadow = true;
  tableGroup.add(seg2);

  // Segment 3: Middle part (depth is 0.10m, from Z = -0.05 to 0.05 relative to centerZ)
  // Notch is at X = 0.85 to 0.95 (10cm cutout centered at X = 0.9)
  // Segment 3a: Left of cutout (X: 0.0 to 0.85, width = 85cm)
  const seg3aGeo = new THREE.BoxGeometry(0.85, thickness, 0.10);
  const seg3a = new THREE.Mesh(seg3aGeo, tableMat);
  seg3a.position.set(0.425, tableY, centerZ); // Midpoint of [0.0, 0.85] is 0.425
  seg3a.castShadow = true;
  seg3a.receiveShadow = true;
  tableGroup.add(seg3a);

  // Segment 3b: Right of cutout (X: 0.95 to 1.0, width = 5cm)
  const seg3bGeo = new THREE.BoxGeometry(0.05, thickness, 0.10);
  const seg3b = new THREE.Mesh(seg3bGeo, tableMat);
  seg3b.position.set(0.975, tableY, centerZ); // Midpoint of [0.95, 1.0] is 0.975
  seg3b.castShadow = true;
  seg3b.receiveShadow = true;
  tableGroup.add(seg3b);

  // Add borders or framing on the outer edges for structural realism
  const borderMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.5, roughness: 0.3 });
  
  // Left border (at X = 0.0)
  const borderLeftGeo = new THREE.BoxGeometry(0.02, 0.04, 1.5);
  const borderLeft = new THREE.Mesh(borderLeftGeo, borderMat);
  borderLeft.position.set(0.0, tableY, centerZ);
  tableGroup.add(borderLeft);

  // Cutout border framing (around the notch at X = 0.85 to 0.95, Z = -0.05 to 0.05)
  // Left inner border of notch at X = 0.85
  const notchBorderLeftGeo = new THREE.BoxGeometry(0.02, 0.04, 0.10);
  const notchBorderLeft = new THREE.Mesh(notchBorderLeftGeo, borderMat);
  notchBorderLeft.position.set(0.85, tableY, centerZ);
  tableGroup.add(notchBorderLeft);

  // Right inner border of notch at X = 0.95
  const notchBorderRight = notchBorderLeft.clone();
  notchBorderRight.position.set(0.95, tableY, centerZ);
  tableGroup.add(notchBorderRight);

  // Border Z-edges at Z = -0.05 and Z = 0.05 (spans X: 0.85 to 0.95)
  const notchBorderZGeo = new THREE.BoxGeometry(0.10, 0.04, 0.02);
  const notchBorderZ1 = new THREE.Mesh(notchBorderZGeo, borderMat);
  notchBorderZ1.position.set(0.90, tableY, centerZ - 0.05);
  tableGroup.add(notchBorderZ1);

  const notchBorderZ2 = notchBorderZ1.clone();
  notchBorderZ2.position.set(0.90, tableY, centerZ + 0.05);
  tableGroup.add(notchBorderZ2);

  scene.add(tableGroup);
}

// Dynamic Creation Helpers
// Modular Geometry Builders
function buildKiris1(is120 = false) {
  const group = new THREE.Group();
  group.userData = {
    type: 'platform',
    blockType: 'kiris1',
    name: is120 ? 'Kiriş-1 (Standart 120cm)' : 'Kiriş-1 (Standart)',
    width: 0.2,
    depth: is120 ? 1.2 : 1.5,
    height: 0.2,
    interactive: true
  };

  const ringGeo = new THREE.CylinderGeometry(0.2345, 0.2345, 0.12, 32, 1, false);
  const ringMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.2, roughness: 0.4 });
  
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.z = Math.PI / 2;
  ring.position.set(0, -0.7, 0);
  group.add(ring);

  // Solid welded bracket plates filling the gap and wrapping the pipe (half-moon saddle block)
  const plateMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.2, roughness: 0.4 });

  // Top plate right under H-beam flange (does not enter H-beam)
  const topPlateGeo = new THREE.BoxGeometry(0.12, 0.06, 0.46);
  const topPlate = new THREE.Mesh(topPlateGeo, plateMat);
  topPlate.position.set(0, -0.4955, 0); // meets bottom of H-beam exactly at -0.4655
  topPlate.castShadow = true;
  topPlate.receiveShadow = true;
  group.add(topPlate);

  // Vertical side bracket legs flanking the pipe (creating the half-moon cutout look)
  const legGeo = new THREE.BoxGeometry(0.12, 0.35, 0.12);
  const legLeft = new THREE.Mesh(legGeo, plateMat);
  legLeft.position.set(0, -0.45, 0.18);
  legLeft.castShadow = true;
  legLeft.receiveShadow = true;
  group.add(legLeft);

  const legRight = new THREE.Mesh(legGeo, plateMat);
  legRight.position.set(0, -0.45, -0.18);
  legRight.castShadow = true;
  legRight.receiveShadow = true;
  group.add(legRight);

  const flangeGeo = new THREE.BoxGeometry(0.08, 0.15, 0.08);
  const flangeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.2, roughness: 0.4 });
  const boltGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.12, 8);
  const boltMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.8, roughness: 0.2 });

  const flangeLeft = new THREE.Mesh(flangeGeo, flangeMat);
  flangeLeft.position.set(0, -0.7, 0.2745);
  group.add(flangeLeft);

  const flangeRight = new THREE.Mesh(flangeGeo, flangeMat);
  flangeRight.position.set(0, -0.7, -0.2745);
  group.add(flangeRight);

  for (let zOffset of [0.2745, -0.2745]) {
    const bolt1 = new THREE.Mesh(boltGeo, boltMat);
    bolt1.position.set(-0.03, -0.7, zOffset);
    bolt1.rotation.z = Math.PI / 2;
    group.add(bolt1);

    const bolt2 = new THREE.Mesh(boltGeo, boltMat);
    bolt2.position.set(0.03, -0.7, zOffset);
    bolt2.rotation.z = Math.PI / 2;
    group.add(bolt2);
  }

  const beamHeight = 0.20;
  const beamWidth = 0.20;
  const beamThickness = 0.01;
  const beamLength = is120 ? 1.20 : 1.50;
  const beamZ = is120 ? -0.0145 : -0.1645;

  const ibeam = createIBeam(beamLength, beamHeight, beamWidth, beamThickness, ringMat);
  ibeam.position.set(0, -0.3655, beamZ);
  group.add(ibeam);

  return group;
}

function buildKiris2(is120 = false) {
  const group = new THREE.Group();
  group.userData = {
    type: 'platform',
    blockType: 'kiris2',
    name: is120 ? 'Kiriş-2 (Özel 120cm)' : 'Kiriş-2 (Özel)',
    width: 0.2,
    depth: is120 ? 1.2 : 1.5,
    height: 0.2,
    interactive: true
  };

  const ringGeo = new THREE.CylinderGeometry(0.2345, 0.2345, 0.12, 32, 1, false);
  const ringMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.2, roughness: 0.4 });
  
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.z = Math.PI / 2;
  ring.position.set(0, -0.7, 0);
  group.add(ring);

  // Solid welded bracket plates filling the gap and wrapping the pipe (half-moon saddle block)
  const plateMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.2, roughness: 0.4 });

  // Top plate right under H-beam flange (does not enter H-beam)
  const topPlateGeo = new THREE.BoxGeometry(0.12, 0.06, 0.46);
  const topPlate = new THREE.Mesh(topPlateGeo, plateMat);
  topPlate.position.set(0, -0.4955, 0); // meets bottom of H-beam exactly at -0.4655
  topPlate.castShadow = true;
  topPlate.receiveShadow = true;
  group.add(topPlate);

  // Vertical side bracket legs flanking the pipe (creating the half-moon cutout look)
  const legGeo = new THREE.BoxGeometry(0.12, 0.35, 0.12);
  const legLeft = new THREE.Mesh(legGeo, plateMat);
  legLeft.position.set(0, -0.45, 0.18);
  legLeft.castShadow = true;
  legLeft.receiveShadow = true;
  group.add(legLeft);

  const legRight = new THREE.Mesh(legGeo, plateMat);
  legRight.position.set(0, -0.45, -0.18);
  legRight.castShadow = true;
  legRight.receiveShadow = true;
  group.add(legRight);

  const flangeGeo = new THREE.BoxGeometry(0.08, 0.15, 0.08);
  const flangeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.2, roughness: 0.4 });
  const boltGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.12, 8);
  const boltMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.8, roughness: 0.2 });

  const flangeLeft = new THREE.Mesh(flangeGeo, flangeMat);
  flangeLeft.position.set(0, -0.7, 0.2745);
  group.add(flangeLeft);

  const flangeRight = new THREE.Mesh(flangeGeo, flangeMat);
  flangeRight.position.set(0, -0.7, -0.2745);
  group.add(flangeRight);

  for (let zOffset of [0.2745, -0.2745]) {
    const bolt1 = new THREE.Mesh(boltGeo, boltMat);
    bolt1.position.set(-0.03, -0.7, zOffset);
    bolt1.rotation.z = Math.PI / 2;
    group.add(bolt1);

    const bolt2 = new THREE.Mesh(boltGeo, boltMat);
    bolt2.position.set(0.03, -0.7, zOffset);
    bolt2.rotation.z = Math.PI / 2;
    group.add(bolt2);
  }

  const beamHeight = 0.20;
  const beamWidth = 0.20;
  const beamThickness = 0.01;
  const beamLength = is120 ? 1.20 : 1.50;
  const beamZ = is120 ? -0.0145 : -0.1645;

  const ibeam = createIBeam(beamLength, beamHeight, beamWidth, beamThickness, ringMat);
  ibeam.position.set(0, -0.3655, beamZ);
  group.add(ibeam);

  const beamTopY = -0.2655;

  // Raised flange apparatus & mated pipe
  const postGeo = new THREE.BoxGeometry(0.08, 0.10, 0.08);
  const post = new THREE.Mesh(postGeo, flangeMat);
  post.position.set(0, beamTopY + 0.05, 0);
  post.castShadow = true;
  post.receiveShadow = true;
  group.add(post);

  const flangePlateGeo = new THREE.BoxGeometry(0.20, 0.01, 0.20);
  const riserFlange = new THREE.Mesh(flangePlateGeo, flangeMat);
  riserFlange.position.set(0, beamTopY + 0.105, 0);
  riserFlange.castShadow = true;
  riserFlange.receiveShadow = true;
  group.add(riserFlange);

  const pipeFlange = new THREE.Mesh(flangePlateGeo, flangeMat);
  pipeFlange.position.set(0, beamTopY + 0.115, 0);
  pipeFlange.castShadow = true;
  pipeFlange.receiveShadow = true;
  group.add(pipeFlange);

  const pipeGeo = new THREE.CylinderGeometry(0.03175, 0.03175, 2.0, 32);
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  const verticalPipe = new THREE.Mesh(pipeGeo, pipeMat);
  verticalPipe.position.set(0, beamTopY + 1.12, 0);
  verticalPipe.castShadow = true;
  verticalPipe.receiveShadow = true;
  group.add(verticalPipe);

  const boltHeadGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.015, 6);
  const boltHeadMat = new THREE.MeshStandardMaterial({ color: 0x718096, metalness: 0.9, roughness: 0.1 });
  
  [-0.075, 0.075].forEach((dx) => {
    [-0.075, 0.075].forEach((dz) => {
      const hexBolt = new THREE.Mesh(boltHeadGeo, boltHeadMat);
      hexBolt.position.set(dx, beamTopY + 0.1275, dz);
      hexBolt.castShadow = true;
      group.add(hexBolt);
    });
  });

  return group;
}

function buildTabla1(is120 = false) {
  const group = new THREE.Group();
  group.userData = {
    type: 'platform',
    blockType: 'tabla1',
    name: is120 ? 'Tabla-1 (Sol Çentik 120cm)' : 'Tabla-1 (Sol Çentik)',
    width: 1.0,
    depth: is120 ? 1.2 : 1.5,
    height: 0.02,
    interactive: true
  };

  const tableMat = new THREE.MeshStandardMaterial({ 
    color: 0xffffff, 
    roughness: 0.4, 
    metalness: 0.3,
    transparent: true,
    opacity: 0.95
  });

  const thickness = 0.02;

  const seg1Depth = is120 ? 0.5145 : 0.8145;
  const seg1Z = is120 ? -0.19275 : -0.34275;
  const seg1Geo = new THREE.BoxGeometry(1.0, thickness, seg1Depth);
  const seg1 = new THREE.Mesh(seg1Geo, tableMat);
  seg1.position.set(0, 0, seg1Z);
  seg1.castShadow = true;
  seg1.receiveShadow = true;
  group.add(seg1);

  const seg2Geo = new THREE.BoxGeometry(1.0, thickness, 0.4855);
  const seg2 = new THREE.Mesh(seg2Geo, tableMat);
  seg2.position.set(0, 0, 0.50725);
  seg2.castShadow = true;
  seg2.receiveShadow = true;
  group.add(seg2);

  const seg3Geo = new THREE.BoxGeometry(0.80, thickness, 0.20);
  const seg3 = new THREE.Mesh(seg3Geo, tableMat);
  seg3.position.set(0.10, 0, 0.1645);
  seg3.castShadow = true;
  seg3.receiveShadow = true;
  group.add(seg3);

  const borderMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.5, roughness: 0.3 });
  
  const borderRightLength = is120 ? 1.20 : 1.5;
  const borderRightZ = is120 ? 0.15 : 0;
  const borderRightGeo = new THREE.BoxGeometry(0.02, 0.04, borderRightLength);
  const borderRight = new THREE.Mesh(borderRightGeo, borderMat);
  borderRight.position.set(0.5, 0, borderRightZ);
  group.add(borderRight);

  const notchBorderLeftGeo = new THREE.BoxGeometry(0.02, 0.04, 0.20);
  const notchBorderLeft = new THREE.Mesh(notchBorderLeftGeo, borderMat);
  notchBorderLeft.position.set(-0.30, 0, 0.1645);
  group.add(notchBorderLeft);

  const notchBorderZGeo = new THREE.BoxGeometry(0.20, 0.04, 0.02);
  const notchBorderZ1 = new THREE.Mesh(notchBorderZGeo, borderMat);
  notchBorderZ1.position.set(-0.40, 0, 0.0645);
  group.add(notchBorderZ1);

  const notchBorderZ2 = new THREE.Mesh(notchBorderZGeo, borderMat);
  notchBorderZ2.position.set(-0.40, 0, 0.2645);
  group.add(notchBorderZ2);

  return group;
}

function buildTabla2(is120 = false) {
  const group = new THREE.Group();
  group.userData = {
    type: 'platform',
    blockType: 'tabla2',
    name: is120 ? 'Tabla-2 (Düz 120cm)' : 'Tabla-2 (Düz)',
    width: 1.0,
    depth: is120 ? 1.2 : 1.5,
    height: 0.02,
    interactive: true
  };

  const tableMat = new THREE.MeshStandardMaterial({ 
    color: 0xffffff, 
    roughness: 0.4, 
    metalness: 0.3,
    transparent: true,
    opacity: 0.95
  });

  const thickness = 0.02;

  const plateDepth = is120 ? 1.20 : 1.5;
  const plateZ = is120 ? 0.15 : 0;
  const plateGeo = new THREE.BoxGeometry(1.0, thickness, plateDepth);
  const plate = new THREE.Mesh(plateGeo, tableMat);
  plate.position.set(0, 0, plateZ);
  plate.castShadow = true;
  plate.receiveShadow = true;
  group.add(plate);

  const borderMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.5, roughness: 0.3 });
  
  const borderLeftGeo = new THREE.BoxGeometry(0.02, 0.04, plateDepth);
  const borderLeft = new THREE.Mesh(borderLeftGeo, borderMat);
  borderLeft.position.set(-0.5, 0, plateZ);
  group.add(borderLeft);

  const borderRight = borderLeft.clone();
  borderRight.position.set(0.5, 0, plateZ);
  group.add(borderRight);

  return group;
}

function buildTabla3(is120 = false) {
  const group = new THREE.Group();
  group.userData = {
    type: 'platform',
    blockType: 'tabla3',
    name: is120 ? 'Tabla-3 (Sağ Çentik 120cm)' : 'Tabla-3 (Sağ Çentik)',
    width: 1.0,
    depth: is120 ? 1.2 : 1.5,
    height: 0.02,
    interactive: true
  };

  const tableMat = new THREE.MeshStandardMaterial({ 
    color: 0xffffff, 
    roughness: 0.4, 
    metalness: 0.3,
    transparent: true,
    opacity: 0.95
  });

  const thickness = 0.02;

  const seg1Depth = is120 ? 0.5145 : 0.8145;
  const seg1Z = is120 ? -0.19275 : -0.34275;
  const seg1Geo = new THREE.BoxGeometry(1.0, thickness, seg1Depth);
  const seg1 = new THREE.Mesh(seg1Geo, tableMat);
  seg1.position.set(0, 0, seg1Z);
  seg1.castShadow = true;
  seg1.receiveShadow = true;
  group.add(seg1);

  const seg2Geo = new THREE.BoxGeometry(1.0, thickness, 0.4855);
  const seg2 = new THREE.Mesh(seg2Geo, tableMat);
  seg2.position.set(0, 0, 0.50725);
  seg2.castShadow = true;
  seg2.receiveShadow = true;
  group.add(seg2);

  const seg3Geo = new THREE.BoxGeometry(0.80, thickness, 0.20);
  const seg3 = new THREE.Mesh(seg3Geo, tableMat);
  seg3.position.set(-0.10, 0, 0.1645);
  seg3.castShadow = true;
  seg3.receiveShadow = true;
  group.add(seg3);

  const borderMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.5, roughness: 0.3 });
  
  const borderLeftLength = is120 ? 1.20 : 1.5;
  const borderLeftZ = is120 ? 0.15 : 0;
  const borderLeftGeo = new THREE.BoxGeometry(0.02, 0.04, borderLeftLength);
  const borderLeft = new THREE.Mesh(borderLeftGeo, borderMat);
  borderLeft.position.set(-0.5, 0, borderLeftZ);
  group.add(borderLeft);

  const notchBorderLeftGeo = new THREE.BoxGeometry(0.02, 0.04, 0.20);
  const notchBorderLeft = new THREE.Mesh(notchBorderLeftGeo, borderMat);
  notchBorderLeft.position.set(0.30, 0, 0.1645);
  group.add(notchBorderLeft);

  const notchBorderZGeo = new THREE.BoxGeometry(0.20, 0.04, 0.02);
  const notchBorderZ1 = new THREE.Mesh(notchBorderZGeo, borderMat);
  notchBorderZ1.position.set(0.40, 0, 0.0645);
  group.add(notchBorderZ1);

  const notchBorderZ2 = new THREE.Mesh(notchBorderZGeo, borderMat);
  notchBorderZ2.position.set(0.40, 0, 0.2645);
  group.add(notchBorderZ2);

  return group;
}



function buildRRUModel(name, w, h, d, weight) {
  const group = new THREE.Group();
  group.userData = {
    id: state.nextId++,
    type: 'rru',
    name: name,
    width: w,
    depth: d,
    height: h,
    weight: weight,
    interactive: true,
    locked: false
  };

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.5, metalness: 0.2 });
  const finMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.6, metalness: 0.3 });
  const bracketMat = new THREE.MeshStandardMaterial({ color: 0x7f8c8d, metalness: 0.8, roughness: 0.2 });

  // Main body box
  const bodyGeo = new THREE.BoxGeometry(w, h, d);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.castShadow = true;
  body.receiveShadow = true;
  body.name = "rru_body";
  group.add(body);

  // cooling fins on the back
  const finGeo = new THREE.BoxGeometry(w * 0.9, h * 0.95, 0.01);
  for (let zOffset = -d/2 - 0.01; zOffset >= -d/2 - 0.04; zOffset -= 0.015) {
    const fin = new THREE.Mesh(finGeo, finMat);
    fin.position.set(0, 0, zOffset);
    group.add(fin);
  }

  // Handle / Mounting bracket arm extending back
  const armGeo = new THREE.BoxGeometry(0.04, 0.08, 0.15);
  const arm = new THREE.Mesh(armGeo, bracketMat);
  arm.position.set(0, 0, -d/2 - 0.05);
  group.add(arm);

  // Pipe clamp ring at the end of the mounting arm
  const clampGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.05, 16);
  const clamp = new THREE.Mesh(clampGeo, bracketMat);
  clamp.position.set(0, 0, -d/2 - 0.125);
  clamp.rotation.x = Math.PI / 2;
  group.add(clamp);

  return group;
}

function buildRRU4499() {
  return buildRRUModel('Ericsson RRU 4499', 0.35, 0.42, 0.20, 25);
}

function buildRRU8863() {
  return buildRRUModel('Ericsson RRU 8863', 0.38, 0.45, 0.18, 22);
}

function buildRRU4415() {
  return buildRRUModel('Ericsson RRU 4415', 0.33, 0.38, 0.16, 17);
}

function spawnRRU(rruType) {
  let group;
  if (rruType === '4499') group = buildRRU4499();
  else if (rruType === '8863') group = buildRRU8863();
  else if (rruType === '4415') group = buildRRU4415();

  if (group) {
    const baseElev = (state.currentArea === 'alan4') ? 20.0 : 0.0;
    const targetZ = (state.currentArea === 'alan4') ? -0.70 : -1.5;
    group.position.set(0, baseElev + 0.8, targetZ);
    addPlatformToActiveArea(group);
  }
}

// Helper to return platforms list for the active area
function getActivePlatforms() {
  if (state.currentArea === 'alan4') return state.alan4Platforms;
  if (state.currentArea === 'alan2') return state.alan2Platforms;
  if (state.currentArea === 'alan3') return state.alan3Platforms;
  return state.alan1Platforms;
}

// Bounding box collision detection (checks if movedObj overlaps with any other object's main body in the active area)
function hasCollision(obj, newX, newY, newZ) {
  // Default allowPassThrough to true unless explicitly set to false
  if (!obj || !obj.userData || obj.userData.allowPassThrough !== false) {
    return false; // Pass-through enabled by default: bypass collision check
  }

  const oldX = obj.position.x;
  const oldY = obj.position.y;
  const oldZ = obj.position.z;

  obj.position.set(newX, newY, newZ);
  obj.updateMatrixWorld(true);

  // Get body mesh for collision check (excludes mounting brackets and selection borders)
  const movedBody = obj.getObjectByName("rru_body") || obj;
  const movedBox = new THREE.Box3().setFromObject(movedBody);

  let collision = false;
  const activePlatforms = getActivePlatforms();
  for (let other of activePlatforms) {
    if (other === obj) continue;
    
    const otherBody = other.getObjectByName("rru_body") || other;
    const otherBox = new THREE.Box3().setFromObject(otherBody);

    // Minor tolerance offset to avoid mathematical floating point bugs
    otherBox.expandByScalar(-0.002);
    
    if (movedBox.intersectsBox(otherBox)) {
      collision = true;
      break;
    }
  }

  // Restore position
  obj.position.set(oldX, oldY, oldZ);
  obj.updateMatrixWorld(true);

  return collision;
}

function setupPlatformTransform(group, defaultX = 0, defaultZ = -2.0, isStandaloneKiris = false) {
  if (group.userData && (group.userData.blockType === 'matsing-offset-assembly' || group.userData.blockType === 'matsing-mid-offset-assembly' || group.userData.blockType === 'scoreboard-matsing-cylinder-assembly')) {
    return;
  }
  const baseElev = (state.currentArea === 'alan4') ? 20.0 : 0.0;
  const yPos = baseElev + (isStandaloneKiris ? 0.2465 : 0.0);
  if (state.currentArea === 'alan4') {
    group.rotation.y = 0;
    const isKarmaBlok = (group.userData && group.userData.blockType === 'alan4-ozel-karma-blok');
    const posX = isKarmaBlok ? 8.50 : defaultX;
    const targetZ = (defaultZ !== -2.0 && defaultZ !== 0) ? defaultZ : -0.70;
    group.position.set(posX, yPos, targetZ);
  } else if (state.currentArea === 'alan2') {
    group.rotation.y = 0;
    group.position.set(defaultX, yPos, -1.0);
  } else {
    group.rotation.y = 0;
    group.position.set(defaultX, yPos, -1.1855);
  }
}

function addPlatformToActiveArea(group) {
  scene.add(group);
  if (state.currentArea === 'alan4') {
    const isSpecialCylinderOrScoreboard = group.userData && (group.userData.isScoreboardRRU || group.userData.blockType === 'scoreboard-matsing-cylinder-assembly');
    if (!isSpecialCylinderOrScoreboard) {
      if (group.position.y < 10.0) {
        group.position.y += 20.0;
      }
      if (group.position.z === 0 || group.position.z === -2.0) {
        group.position.z = -0.70;
      }
    }
    state.alan4Platforms.push(group);
  } else if (state.currentArea === 'alan2') {
    state.alan2Platforms.push(group);
  } else if (state.currentArea === 'alan3') {
    state.alan3Platforms.push(group);
  } else {
    state.alan1Platforms.push(group);
  }
  selectObject(group);
  updateBOM();
}

function spawnKiris1() {
  const isAlan2 = (state.currentArea === 'alan2');
    const isAlan3 = (state.currentArea === 'alan3');
  const group = buildKiris1();
  group.userData.id = state.nextId++;
  group.userData.name = isAlan2 ? 'Kiriş-1 (Alan 2)' : 'Kiriş-1';
  setupPlatformTransform(group, 0, -2.0, true);
  addPlatformToActiveArea(group);
}

function spawnKiris2() {
  const isAlan2 = (state.currentArea === 'alan2');
  const isAlan3 = (state.currentArea === 'alan3');
  const group = buildKiris2();
  group.userData.id = state.nextId++;
  group.userData.name = isAlan2 ? 'Kiriş-2 (Alan 2)' : 'Kiriş-2';
  setupPlatformTransform(group, 0, -2.0, true);
  addPlatformToActiveArea(group);
}

function spawnTabla1() {
  const isAlan2 = (state.currentArea === 'alan2');
  const isAlan3 = (state.currentArea === 'alan3');
  const group = buildTabla1();
  group.userData.id = state.nextId++;
  group.userData.name = isAlan2 ? 'Tabla-1 (Alan 2)' : 'Tabla-1';
  group.position.y = -0.0090;
  setupPlatformTransform(group, 0, -2.0, false);
  addPlatformToActiveArea(group);
}

function spawnTabla2() {
  const isAlan2 = (state.currentArea === 'alan2');
  const isAlan3 = (state.currentArea === 'alan3');
  const group = buildTabla2();
  group.userData.id = state.nextId++;
  group.userData.name = isAlan2 ? 'Tabla-2 (Alan 2)' : 'Tabla-2';
  group.position.y = -0.0090;
  setupPlatformTransform(group, 0, -2.0, false);
  addPlatformToActiveArea(group);
}

function spawnTabla3() {
  const isAlan2 = (state.currentArea === 'alan2');
  const isAlan3 = (state.currentArea === 'alan3');
  const group = buildTabla3();
  group.userData.id = state.nextId++;
  group.userData.name = isAlan2 ? 'Tabla-3 (Alan 2)' : 'Tabla-3';
  group.position.y = -0.0090;
  setupPlatformTransform(group, 0, -2.0, false);
  addPlatformToActiveArea(group);
}

function addRailingsToBlock(blockGroup, isAlan2 = (state.currentArea === 'alan2')) {
  // Remove existing railing if present
  const oldRailing = blockGroup.getObjectByName("railing");
  if (oldRailing) blockGroup.remove(oldRailing);

  const railingGroup = new THREE.Group();
  railingGroup.name = "railing";

  const railColor = 0xfdb913; // Yellow
  const railMat = new THREE.MeshStandardMaterial({ color: railColor, metalness: 0.5, roughness: 0.3 });
  
  const postHeight = 1.2;
  const postRadius = 0.02;
  const postGeo = new THREE.CylinderGeometry(postRadius, postRadius, postHeight, 16);
  const tableSurfaceY = 0.0010;

  let postPositions = [];
  let railsConfig = [];

  if (isAlan2) {
    postPositions = [
      { x: 0.98, z: 0.5655 },
      { x: 0.98, z: 0.20 },
      { x: 0.98, z: -0.20 },
      { x: 0.98, z: -0.8945 },
      { x: 0.33, z: -0.8945 },
      { x: -0.33, z: -0.8945 },
      { x: -0.98, z: -0.8945 },
      { x: 0.33, z: 0.5655 },
      { x: -0.33, z: 0.5655 },
      { x: -0.98, z: 0.5655 }
    ];

    railsConfig = [
      { type: 'alongZ', x: 0.98, zCenter: -0.1645, length: 1.46 },
      { type: 'alongX', z: 0.5655, xCenter: 0.0, length: 1.96 },
      { type: 'alongX', z: -0.8945, xCenter: 0.0, length: 1.96 }
    ];
  } else {
    postPositions = [
      { x: -0.98, z: 0.5655 },
      { x: -0.98, z: 0.20 },
      { x: -0.98, z: -0.20 },
      { x: -0.98, z: -0.8945 },
      { x: 0.0, z: -0.8945 },
      { x: 0.98, z: -0.8945 },
      { x: 0.98, z: -0.20 },
      { x: 0.98, z: 0.20 },
      { x: 0.98, z: 0.5655 }
    ];

    railsConfig = [
      { type: 'alongZ', x: -0.98, zCenter: -0.1645, length: 1.46 },
      { type: 'alongZ', x: 0.98, zCenter: -0.1645, length: 1.46 },
      { type: 'alongX', z: -0.8945, xCenter: 0.0, length: 1.96 }
    ];
  }

  postPositions.forEach(pos => {
    const post = new THREE.Mesh(postGeo, railMat);
    post.position.set(pos.x, tableSurfaceY + postHeight / 2, pos.z);
    post.castShadow = true;
    railingGroup.add(post);
  });

  const railRadius = 0.015;
  const railHeights = [0.4, 0.8, 1.2];

  railHeights.forEach(h => {
    const yPos = tableSurfaceY + h;

    railsConfig.forEach(rc => {
      const railGeo = new THREE.CylinderGeometry(railRadius, railRadius, rc.length, 16);
      const rail = new THREE.Mesh(railGeo, railMat);

      if (rc.type === 'alongZ') {
        rail.rotation.x = Math.PI / 2;
        rail.position.set(rc.x, yPos, rc.zCenter);
      } else if (rc.type === 'alongX') {
        rail.rotation.z = Math.PI / 2;
        rail.position.set(rc.xCenter, yPos, rc.z);
      }
      rail.castShadow = true;
      railingGroup.add(rail);
    });
  });

  blockGroup.add(railingGroup);
}


function buildAlan2RRUBlokModel() {
  const blockGroup = new THREE.Group();
  blockGroup.userData = {
    type: 'platform',
    blockType: 'alan2-rru-blok',
    name: 'RRU Blok',
    width: 2.0,
    depth: 1.5,
    height: 2.2,
    interactive: true
  };

  const t1 = buildTabla1(); t1.userData.interactive = false; t1.position.set(-0.5, -0.0090, -0.1645); blockGroup.add(t1);
  const t3 = buildTabla3(); t3.userData.interactive = false; t3.position.set(0.5, -0.0090, -0.1645); blockGroup.add(t3);

  const pipeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  const flangeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.2, roughness: 0.4 });
  const boltHeadMat = new THREE.MeshStandardMaterial({ color: 0x718096, metalness: 0.9, roughness: 0.1 });

  const pipeGeo = new THREE.CylinderGeometry(0.03175, 0.03175, 2.0, 32);
  const flangePlateGeo = new THREE.BoxGeometry(0.20, 0.012, 0.20);
  const boltGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.02, 6);
  
  const tableSurfaceY = 0.0010;

  [-0.9, 0.9].forEach(posX => {
    const verticalPipe = new THREE.Mesh(pipeGeo, pipeMat);
    verticalPipe.position.set(posX, tableSurfaceY + 1.0, 0); 
    verticalPipe.castShadow = true;
    blockGroup.add(verticalPipe);

    const pipeFlange = new THREE.Mesh(flangePlateGeo, flangeMat);
    pipeFlange.position.set(posX, tableSurfaceY + 0.006, 0); 
    pipeFlange.castShadow = true;
    blockGroup.add(pipeFlange);

    [-0.075, 0.075].forEach(dx => {
      [-0.075, 0.075].forEach(dz => {
        const hexBolt = new THREE.Mesh(boltGeo, boltHeadMat);
        hexBolt.position.set(posX + dx, tableSurfaceY + 0.016, dz);
        blockGroup.add(hexBolt);
      });
    });
  });

  return blockGroup;
}

function buildAlan2RRUBlokKorkulukluModel() {
  const blockGroup = buildAlan2RRUBlokModel();
  blockGroup.userData.blockType = 'alan2-rru-blok-korkuluklu';
  blockGroup.userData.name = 'RRU Blok (Korkuluklu)';
  
  const railingGroup = new THREE.Group();
  railingGroup.name = "railing";

  const railColor = 0xfdb913; 
  const railMat = new THREE.MeshStandardMaterial({ color: railColor, metalness: 0.5, roughness: 0.3 });
  
  const postHeight = 1.2;
  const postRadius = 0.02;
  const postGeo = new THREE.CylinderGeometry(postRadius, postRadius, postHeight, 16);
  const tableSurfaceY = 0.0010;

  const zRail = 0.5655; 
  const postPositionsX = [-0.98, -0.33, 0.33, 0.98];
  
  postPositionsX.forEach(x => {
    const post = new THREE.Mesh(postGeo, railMat);
    post.position.set(x, tableSurfaceY + postHeight / 2, zRail);
    post.castShadow = true;
    railingGroup.add(post);
  });

  const railRadius = 0.015;
  const railLength = 1.96;
  const railGeo = new THREE.CylinderGeometry(railRadius, railRadius, railLength, 16);
  railGeo.rotateZ(Math.PI / 2);
  
  [tableSurfaceY + 0.6, tableSurfaceY + 1.15].forEach(yPos => {
    const hRail = new THREE.Mesh(railGeo, railMat);
    hRail.position.set(0, yPos, zRail);
    hRail.castShadow = true;
    railingGroup.add(hRail);
  });

  blockGroup.add(railingGroup);

  return blockGroup;
}

function buildRRUBlokModel() {
  const blockGroup = new THREE.Group();
  blockGroup.userData = {
    type: 'platform',
    blockType: 'rru-blok',
    name: 'RRU Blok',
    width: 2.0,
    depth: 1.5,
    height: 2.2,
    interactive: true
  };

  const k2Left = buildKiris2(); k2Left.userData.interactive = false; k2Left.position.set(-0.9, 0.2465, 0); blockGroup.add(k2Left);
  const k1Mid = buildKiris1(); k1Mid.userData.interactive = false; k1Mid.position.set(0, 0.2465, 0); blockGroup.add(k1Mid);
  const k2Right = buildKiris2(); k2Right.userData.interactive = false; k2Right.position.set(0.9, 0.2465, 0); blockGroup.add(k2Right);
  const t1 = buildTabla1(); t1.userData.interactive = false; t1.position.set(-0.5, -0.0090, -0.1645); blockGroup.add(t1);
  const t3 = buildTabla3(); t3.userData.interactive = false; t3.position.set(0.5, -0.0090, -0.1645); blockGroup.add(t3);
  return blockGroup;
}

function buildRRUBlokKorkulukluModel(isRotatedArea = false) {
  const blockGroup = buildRRUBlokModel();
  blockGroup.userData.blockType = 'rru-blok-korkuluklu';
  blockGroup.userData.name = 'RRU Blok (Korkuluklu)';
  addRailingsToBlock(blockGroup, isRotatedArea);
  return blockGroup;
}

function buildRackBlokModel() {
  const blockGroup = new THREE.Group();
  blockGroup.userData = {
    type: 'platform',
    blockType: 'rack-blok',
    name: 'Rack Blok',
    width: 2.0,
    depth: 1.5,
    height: 0.22,
    interactive: true
  };

  const k1Left = buildKiris1(); k1Left.userData.interactive = false; k1Left.position.set(-0.9, 0.2465, 0); blockGroup.add(k1Left);
  const k1Mid = buildKiris1(); k1Mid.userData.interactive = false; k1Mid.position.set(0, 0.2465, 0); blockGroup.add(k1Mid);
  const k1Right = buildKiris1(); k1Right.userData.interactive = false; k1Right.position.set(0.9, 0.2465, 0); blockGroup.add(k1Right);
  const t2Left = buildTabla2(); t2Left.userData.interactive = false; t2Left.position.set(-0.5, -0.0090, -0.1645); blockGroup.add(t2Left);
  const t2Right = buildTabla2(); t2Right.userData.interactive = false; t2Right.position.set(0.5, -0.0090, -0.1645); blockGroup.add(t2Right);
  return blockGroup;
}

function buildRackBlokKorkulukluModel(isRotatedArea = false) {
  const blockGroup = buildRackBlokModel();
  blockGroup.userData.blockType = 'rack-blok-korkuluklu';
  blockGroup.userData.name = 'Rack Blok (Korkuluklu)';
  addRailingsToBlock(blockGroup, isRotatedArea);
  return blockGroup;
}

function buildRRUSahaBlokModel(targetArea = state.currentArea) {
  const isAlan3 = targetArea === 'alan3';
  const isAlan1 = targetArea === 'alan1';
  let areaTitle = 'RRU Saha Blok (Alan 2)';
  if (isAlan3) areaTitle = 'RRU Saha Blok (Alan 3)';
  if (isAlan1) areaTitle = 'RRU Saha Blok (Alan 1)';
  const blockGroup = new THREE.Group();
  blockGroup.userData = {
    type: 'platform',
    blockType: 'rru-saha-blok',
    name: areaTitle,
    width: 3.4,
    depth: 1.5,
    height: 2.2,
    interactive: true
  };

  if (isAlan3) {
    const k1_1 = buildKiris1(); k1_1.userData.interactive = false; k1_1.position.set(-0.10, 0.2465, 0); blockGroup.add(k1_1);
    const k1_2 = buildKiris1(); k1_2.userData.interactive = false; k1_2.position.set(-0.90, 0.2465, 0); blockGroup.add(k1_2);
    const k1_3 = buildKiris1(); k1_3.userData.interactive = false; k1_3.position.set(-1.70, 0.2465, 0); blockGroup.add(k1_3);
    const k1_4 = buildKiris1(); k1_4.userData.interactive = false; k1_4.position.set(-2.50, 0.2465, 0); blockGroup.add(k1_4);

    const t2_1 = buildTabla2(); t2_1.userData.interactive = false; t2_1.position.set(-0.50, -0.0090, -0.1645); blockGroup.add(t2_1);
    const t2_2 = buildTabla2(); t2_2.userData.interactive = false; t2_2.position.set(-1.30, -0.0090, -0.1645); blockGroup.add(t2_2);
    const t2_3 = buildTabla2(); t2_3.userData.interactive = false; t2_3.position.set(-2.10, -0.0090, -0.1645); blockGroup.add(t2_3);

    addRailingsToSahaBlock(blockGroup, true);
  } else {
    const k2_1 = buildKiris2(); k2_1.userData.interactive = false; k2_1.position.set(-0.10, 0.2465, 0); blockGroup.add(k2_1);
    const k1_2 = buildKiris1(); k1_2.userData.interactive = false; k1_2.position.set(-0.90, 0.2465, 0); blockGroup.add(k1_2);
    const k1_3 = buildKiris1(); k1_3.userData.interactive = false; k1_3.position.set(-1.70, 0.2465, 0); blockGroup.add(k1_3);
    const k1_4 = buildKiris1(); k1_4.userData.interactive = false; k1_4.position.set(-2.50, 0.2465, 0); blockGroup.add(k1_4);

    const t1_1 = buildTabla1(); t1_1.userData.interactive = false; t1_1.position.set(-0.50, -0.0090, -0.1645); blockGroup.add(t1_1);
    const t2_2 = buildTabla2(); t2_2.userData.interactive = false; t2_2.position.set(-1.30, -0.0090, -0.1645); blockGroup.add(t2_2);
    const t2_3 = buildTabla2(); t2_3.userData.interactive = false; t2_3.position.set(-2.10, -0.0090, -0.1645); blockGroup.add(t2_3);

    addRailingsToSahaBlock(blockGroup, false);
  }

  return blockGroup;
}

function buildRRUSahaBlok120Model(targetArea = state.currentArea) {
  const isAlan3 = targetArea === 'alan3';
  const isAlan1 = targetArea === 'alan1';
  let areaTitle = 'RRU Saha Blok 120cm (Alan 2)';
  if (isAlan3) areaTitle = 'RRU Saha Blok 120cm (Alan 3)';
  if (isAlan1) areaTitle = 'RRU Saha Blok 120cm (Alan 1)';
  const blockGroup = new THREE.Group();
  blockGroup.userData = {
    type: 'platform',
    blockType: 'rru-saha-blok-120',
    name: areaTitle,
    width: 3.4,
    depth: 1.2,
    height: 2.2,
    interactive: true
  };

  if (isAlan3) {
    const k1_1 = buildKiris1(true); k1_1.userData.interactive = false; k1_1.position.set(-0.10, 0.2465, 0); blockGroup.add(k1_1);
    const k1_2 = buildKiris1(true); k1_2.userData.interactive = false; k1_2.position.set(-0.90, 0.2465, 0); blockGroup.add(k1_2);
    const k1_3 = buildKiris1(true); k1_3.userData.interactive = false; k1_3.position.set(-1.70, 0.2465, 0); blockGroup.add(k1_3);
    const k1_4 = buildKiris1(true); k1_4.userData.interactive = false; k1_4.position.set(-2.50, 0.2465, 0); blockGroup.add(k1_4);

    const t2_1 = buildTabla2(true); t2_1.userData.interactive = false; t2_1.position.set(-0.50, -0.0090, -0.1645); blockGroup.add(t2_1);
    const t2_2 = buildTabla2(true); t2_2.userData.interactive = false; t2_2.position.set(-1.30, -0.0090, -0.1645); blockGroup.add(t2_2);
    const t2_3 = buildTabla2(true); t2_3.userData.interactive = false; t2_3.position.set(-2.10, -0.0090, -0.1645); blockGroup.add(t2_3);

    addRailingsToSahaBlock(blockGroup, true, true);
  } else {
    const k1_1 = buildKiris1(true); k1_1.userData.interactive = false; k1_1.position.set(-0.10, 0.2465, 0); blockGroup.add(k1_1);
    const k2_2 = buildKiris2(true); k2_2.userData.interactive = false; k2_2.position.set(-0.90, 0.2465, 0); blockGroup.add(k2_2);
    const k1_3 = buildKiris1(true); k1_3.userData.interactive = false; k1_3.position.set(-1.70, 0.2465, 0); blockGroup.add(k1_3);
    const k1_4 = buildKiris1(true); k1_4.userData.interactive = false; k1_4.position.set(-2.50, 0.2465, 0); blockGroup.add(k1_4);

    const t1_1 = buildTabla1(true); t1_1.userData.interactive = false; t1_1.position.set(-0.50, -0.0090, -0.1645); blockGroup.add(t1_1);
    const t2_2 = buildTabla2(true); t2_2.userData.interactive = false; t2_2.position.set(-1.30, -0.0090, -0.1645); blockGroup.add(t2_2);
    const t2_3 = buildTabla2(true); t2_3.userData.interactive = false; t2_3.position.set(-2.10, -0.0090, -0.1645); blockGroup.add(t2_3);

    addRailingsToSahaBlock(blockGroup, false, true);
  }

  return blockGroup;
}

function spawnRRUBlok() {
  const isAlan2 = (state.currentArea === 'alan2');
  const isAlan3 = (state.currentArea === 'alan3');
  const blockGroup = buildRRUBlokModel();
  blockGroup.userData.id = state.nextId++;
  if (isAlan2) blockGroup.userData.name = 'RRU Blok (Alan 2)';
  setupPlatformTransform(blockGroup, 0, -2.0);
  addPlatformToActiveArea(blockGroup);
}

function addRailingsToSahaBlock(blockGroup, isAlan3 = false, is120 = false) {
  const isAlan1 = (state.currentArea === 'alan1');
  const railingGroup = new THREE.Group();
  railingGroup.name = "railing";

  const railColor = 0xfdb913;
  const railMat = new THREE.MeshStandardMaterial({ color: railColor, metalness: 0.5, roughness: 0.3 });
  
  const postHeight = 1.2;
  const postRadius = 0.02;
  const postGeo = new THREE.CylinderGeometry(postRadius, postRadius, postHeight, 16);
  const tableSurfaceY = 0.0010;

  const backZ = is120 ? -0.5945 : -0.8945;
  const frontZ = 0.5655;

  const postPositions = [
    // Back long side
    { x: -0.02, z: backZ },
    { x: -0.67, z: backZ },
    { x: -1.30, z: backZ },
    { x: -1.93, z: backZ },
    { x: -2.58, z: backZ },

    // Front long side
    { x: -0.02, z: frontZ },
    { x: -0.67, z: frontZ },
    { x: -1.30, z: frontZ },
    { x: -1.93, z: frontZ },
    { x: -2.58, z: frontZ }
  ];

  const railsConfig = [
    { type: 'alongX', z: backZ, xCenter: -1.30, length: 2.56 },
    { type: 'alongX', z: frontZ, xCenter: -1.30, length: 2.56 }
  ];

  const sideLength = is120 ? 1.16 : 1.46;
  const sideZCenter = is120 ? -0.0145 : -0.1645;

  // For Alan 2 (original 3-sided railing), add short end railing at X = -0.02m!
  if (!isAlan3) {
    postPositions.push(
      { x: -0.02, z: sideZCenter }
    );
    railsConfig.push(
      { type: 'alongZ', x: -0.02, zCenter: sideZCenter, length: sideLength }
    );
  }

  // Close the other open edge for Alan 1
  if (isAlan1) {
    postPositions.push(
      { x: -2.58, z: sideZCenter }
    );
    railsConfig.push(
      { type: 'alongZ', x: -2.58, zCenter: sideZCenter, length: sideLength }
    );
  }

  postPositions.forEach(pos => {
    const post = new THREE.Mesh(postGeo, railMat);
    post.position.set(pos.x, tableSurfaceY + postHeight / 2, pos.z);
    post.castShadow = true;
    railingGroup.add(post);
  });

  const railRadius = 0.015;
  const railHeights = [0.4, 0.8, 1.2];

  railHeights.forEach(h => {
    const yPos = tableSurfaceY + h;
    railsConfig.forEach(rc => {
      const railGeo = new THREE.CylinderGeometry(railRadius, railRadius, rc.length, 16);
      const rail = new THREE.Mesh(railGeo, railMat);
      if (rc.type === 'alongZ') {
        rail.rotation.x = Math.PI / 2;
        rail.position.set(rc.x, yPos, rc.zCenter);
      } else if (rc.type === 'alongX') {
        rail.rotation.z = Math.PI / 2;
        rail.position.set(rc.xCenter, yPos, rc.z);
      }
      rail.castShadow = true;
      railingGroup.add(rail);
    });
  });

  blockGroup.add(railingGroup);
}

function spawnRRUSahaBlokAlan2() {
  const blockGroup = buildRRUSahaBlokModel(state.currentArea);
  blockGroup.userData.id = state.nextId++;
  setupPlatformTransform(blockGroup, 0, -2.0);
  addPlatformToActiveArea(blockGroup);
}

function spawnRRUSahaBlok120() {
  const blockGroup = buildRRUSahaBlok120Model(state.currentArea);
  blockGroup.userData.id = state.nextId++;
  setupPlatformTransform(blockGroup, 0, -2.0);
  addPlatformToActiveArea(blockGroup);
}

function spawnRackBlok() {
  const nameSuffix = state.currentArea === 'alan3' ? ' (Alan 3)' : (state.currentArea === 'alan2' ? ' (Alan 2)' : '');
  const blockGroup = buildRackBlokModel();
  blockGroup.userData.id = state.nextId++;
  blockGroup.userData.name = `Rack Blok${nameSuffix}`;
  setupPlatformTransform(blockGroup, 0, -2.0);
  addPlatformToActiveArea(blockGroup);
}

function spawnRRUBlokKorkuluklu() {
  const isRotatedArea = (state.currentArea === 'alan2' || state.currentArea === 'alan3');
  const nameLabel = state.currentArea === 'alan3' ? 'RRU Blok (Alan 3 - Korkuluklu)' : (state.currentArea === 'alan2' ? 'RRU Blok (Alan 2 - Korkuluklu)' : 'RRU Blok (Korkuluklu)');
  
  let blockGroup;
  if (state.currentArea === 'alan2') {
    blockGroup = buildAlan2RRUBlokKorkulukluModel();
  } else {
    blockGroup = buildRRUBlokKorkulukluModel(isRotatedArea);
  }
  
  blockGroup.userData.id = state.nextId++;
  blockGroup.userData.name = nameLabel;
  setupPlatformTransform(blockGroup, 0, -2.0);
  addPlatformToActiveArea(blockGroup);
}

function spawnRackBlokKorkuluklu() {
  const isRotatedArea = (state.currentArea === 'alan2' || state.currentArea === 'alan3');
  const nameLabel = state.currentArea === 'alan3' ? 'Rack Blok (Alan 3 - Korkuluklu)' : (state.currentArea === 'alan2' ? 'Rack Blok (Alan 2 - Korkuluklu)' : 'Rack Blok (Korkuluklu)');
  const blockGroup = buildRackBlokKorkulukluModel(isRotatedArea);
  blockGroup.userData.id = state.nextId++;
  blockGroup.userData.name = nameLabel;
  setupPlatformTransform(blockGroup, 0, -2.0);
  addPlatformToActiveArea(blockGroup);
}

// 42U İkili Çerçeve Açık Sistem Kabin Model Builder (Canovate CSL-X-42YYA2 - Double Frame Open Rack)
function build42UIkiliCerceveKabin(colorHex = 0xd4d8dd, is20U = false, customConfig = null) {
  const group = new THREE.Group();
  
  let uCount = is20U ? 20 : 42;
  let H = is20U ? 1.05 : 2.0933;
  let blockType = is20U ? '20u-canovate-kabin' : '42u-canovate-kabin';
  let name = is20U ? '20U İkili Çerçeve Açık Sistem Kabin' : '42U İkili Çerçeve Açık Sistem Kabin';
  let modelNo = is20U ? 'CSL-X-20YYA2' : 'CSL-X-42YYA2';
  let weight = is20U ? 42 : 58;

  if (customConfig) {
    if (customConfig.uCount) uCount = customConfig.uCount;
    if (customConfig.height) H = customConfig.height;
    if (customConfig.blockType) blockType = customConfig.blockType;
    if (customConfig.name) name = customConfig.name;
    if (customConfig.modelNo) modelNo = customConfig.modelNo;
    if (customConfig.weight) weight = customConfig.weight;
  }
  
  const baseH = 0.1125;
  const W = 0.60;
  const D = 0.70;
  
  group.userData = {
    type: 'rru',
    blockType: blockType,
    category: 'Canovate',
    name: name,
    modelNo: modelNo,
    uHeight: uCount,
    width: W,
    height: H,
    depth: D,
    innerMountWidth: 0.4826,
    weight: weight,
    maxStaticLoad: 600,
    interactive: true,
    locked: false,
    lockedX: false,
    lockedY: false,
    lockedZ: false,
    isFreestanding: true,
    allowPassThrough: true
  };

  const mainMat = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.6, roughness: 0.3 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3 });
  const chromeRailMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.15 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.3, roughness: 0.4 });


  // 1. Taban Şasisi (700mm Derinlik, 600mm Dış Genişlik)
  const baseFootGeo = new THREE.BoxGeometry(0.12, baseH, D);
  const baseLeft = new THREE.Mesh(baseFootGeo, mainMat);
  baseLeft.position.set(-W/2 + 0.06, baseH/2, 0);
  baseLeft.castShadow = true;
  baseLeft.receiveShadow = true;
  group.add(baseLeft);

  const baseRight = new THREE.Mesh(baseFootGeo, mainMat);
  baseRight.position.set(W/2 - 0.06, baseH/2, 0);
  baseRight.castShadow = true;
  baseRight.receiveShadow = true;
  group.add(baseRight);

  // Taban Ön-Arka Bağlantı Kirişleri
  const baseCrossGeo = new THREE.BoxGeometry(W - 0.24, 0.08, 0.08);
  const baseCrossFront = new THREE.Mesh(baseCrossGeo, darkMetalMat);
  baseCrossFront.position.set(0, baseH/2, D/2 - 0.05);
  baseCrossFront.castShadow = true;
  group.add(baseCrossFront);

  const baseCrossRear = new THREE.Mesh(baseCrossGeo, darkMetalMat);
  baseCrossRear.position.set(0, baseH/2, -D/2 + 0.05);
  baseCrossRear.castShadow = true;
  group.add(baseCrossRear);

  // Zemin Sabitleme Kulakları (522 mm delik ekseni, Ø17 mm montaj delikleri)
  const footPlateGeo = new THREE.BoxGeometry(0.14, 0.01, D);
  const footPlateL = new THREE.Mesh(footPlateGeo, darkMetalMat);
  footPlateL.position.set(-W/2 + 0.06, 0.005, 0);
  group.add(footPlateL);

  const footPlateR = new THREE.Mesh(footPlateGeo, darkMetalMat);
  footPlateR.position.set(W/2 - 0.06, 0.005, 0);
  group.add(footPlateR);

  // 2. İKİLİ ÇERÇEVE (Double 42U Frame) - Ön ve Arka Dikey Sütunlar
  const colLen = H - baseH;
  const colYCenter = baseH + colLen / 2;
  const colWidth = 0.125;
  const colDepth = 0.08;
  const frameSpanD = 0.467; // Ön-Arka raylar arası derinlik (Maks. 467 mm)

  const fColZ = frameSpanD / 2;
  const rColZ = -frameSpanD / 2;

  const colGeo = new THREE.BoxGeometry(colWidth, colLen, colDepth);
  
  // Ön Sol Kolon
  const colFL = new THREE.Mesh(colGeo, mainMat);
  colFL.position.set(-W/2 + colWidth/2, colYCenter, fColZ);
  colFL.castShadow = true;
  group.add(colFL);

  // Ön Sağ Kolon
  const colFR = new THREE.Mesh(colGeo, mainMat);
  colFR.position.set(W/2 - colWidth/2, colYCenter, fColZ);
  colFR.castShadow = true;
  group.add(colFR);

  // Arka Sol Kolon
  const colRL = new THREE.Mesh(colGeo, mainMat);
  colRL.position.set(-W/2 + colWidth/2, colYCenter, rColZ);
  colRL.castShadow = true;
  group.add(colRL);

  // Arka Sağ Kolon
  const colRR = new THREE.Mesh(colGeo, mainMat);
  colRR.position.set(W/2 - colWidth/2, colYCenter, rColZ);
  colRR.castShadow = true;
  group.add(colRR);

  // Ön ve Arka Kolonları Bağlayan Yan Derinlik Kirişleri
  const braceGeo = new THREE.BoxGeometry(0.06, 0.04, frameSpanD + 0.08);
  for (let side of [-W/2 + colWidth/2, W/2 - colWidth/2]) {
    for (let yPos of [baseH + 0.15, H - 0.15, colYCenter]) {
      const brace = new THREE.Mesh(braceGeo, darkMetalMat);
      brace.position.set(side, yPos, 0);
      group.add(brace);
    }
  }

  // 3. Üst Birleştirici Şapka (Top Canopy Crossbar)
  const topCapGeo = new THREE.BoxGeometry(W, 0.06, frameSpanD + 0.12);
  const topCap = new THREE.Mesh(topCapGeo, mainMat);
  topCap.position.set(0, H - 0.03, 0);
  topCap.castShadow = true;
  group.add(topCap);

  // CANOVATE Logo Plakası
  const logoPlateGeo = new THREE.BoxGeometry(0.18, 0.03, 0.005);
  const logoPlate = new THREE.Mesh(logoPlateGeo, accentMat);
  logoPlate.position.set(0, H - 0.03, fColZ + colDepth/2 + 0.003);
  group.add(logoPlate);

  // 4. Yan Kablo Yönetim Pencereleri (Cable Management Windows)
  const numCutouts = 8;
  const cutoutSpacing = colLen / (numCutouts + 1);
  const windowGeo = new THREE.BoxGeometry(0.09, cutoutSpacing * 0.55, colDepth + 0.004);
  const windowMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });

  for (let i = 1; i <= numCutouts; i++) {
    const cutoutY = baseH + i * cutoutSpacing;
    
    const cutFL = new THREE.Mesh(windowGeo, windowMat);
    cutFL.position.set(-W/2 + colWidth/2, cutoutY, fColZ);
    group.add(cutFL);

    const cutFR = new THREE.Mesh(windowGeo, windowMat);
    cutFR.position.set(W/2 - colWidth/2, cutoutY, fColZ);
    group.add(cutFR);

    const cutRL = new THREE.Mesh(windowGeo, windowMat);
    cutRL.position.set(-W/2 + colWidth/2, cutoutY, rColZ);
    group.add(cutRL);

    const cutRR = new THREE.Mesh(windowGeo, windowMat);
    cutRR.position.set(W/2 - colWidth/2, cutoutY, rColZ);
    group.add(cutRR);
  }

  // 5. TAM 19 İNÇ (482.6 mm) İÇ MONTAJ AÇIKLIKLI 42U MONTAJ RAYLARI
  const railSpan = 0.4826; // Exact 19 inches clear span
  const railGeo = new THREE.BoxGeometry(0.025, colLen, 0.025);
  
  // Ön Raylar
  const railFL = new THREE.Mesh(railGeo, chromeRailMat);
  railFL.position.set(-railSpan/2 - 0.0125, colYCenter, fColZ - 0.01);
  group.add(railFL);

  const railFR = new THREE.Mesh(railGeo, chromeRailMat);
  railFR.position.set(railSpan/2 + 0.0125, colYCenter, fColZ - 0.01);
  group.add(railFR);

  // Arka Raylar
  const railRL = new THREE.Mesh(railGeo, chromeRailMat);
  railRL.position.set(-railSpan/2 - 0.0125, colYCenter, rColZ + 0.01);
  group.add(railRL);

  const railRR = new THREE.Mesh(railGeo, chromeRailMat);
  railRR.position.set(railSpan/2 + 0.0125, colYCenter, rColZ + 0.01);
  group.add(railRR);

  // U Seviye Çizgileri
  const uUnitHeight = colLen / uCount;
  const uMarkGeo = new THREE.BoxGeometry(0.028, 0.002, 0.028);
  const uMarkMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  for (let u = 1; u <= uCount; u += 3) {
    const uY = baseH + (u - 0.5) * uUnitHeight;
    const markFL = new THREE.Mesh(uMarkGeo, uMarkMat);
    markFL.position.set(-railSpan/2 - 0.0125, uY, fColZ - 0.008);
    group.add(markFL);

    const markFR = new THREE.Mesh(uMarkGeo, uMarkMat);
    markFR.position.set(railSpan/2 + 0.0125, uY, fColZ - 0.008);
    group.add(markFR);

    const markRL = new THREE.Mesh(uMarkGeo, uMarkMat);
    markRL.position.set(-railSpan/2 - 0.0125, uY, rColZ + 0.008);
    group.add(markRL);

    const markRR = new THREE.Mesh(uMarkGeo, uMarkMat);
    markRR.position.set(railSpan/2 + 0.0125, uY, rColZ + 0.008);
    group.add(markRR);
  }

  return group;
}

function spawn42UTekliCerceveKabin() {
  const areaSuffix = state.currentArea === 'alan4' ? ' (Alan 4)' : (state.currentArea === 'alan3' ? ' (Alan 3)' : (state.currentArea === 'alan2' ? ' (Alan 2)' : ''));
  const group = build42UIkiliCerceveKabin();
  group.userData.id = state.nextId++;
  group.userData.name = `42U İkili Çerçeve Kabin (Canovate)${areaSuffix}`;
  group.userData.lockedX = false;
  group.userData.lockedY = false;
  group.userData.lockedZ = false;
  group.userData.isFreestanding = true;
  
  const baseElev = (state.currentArea === 'alan4') ? 20.0 : 0.0;
  const targetZ = (state.currentArea === 'alan4') ? -0.70 : -2.0;
  setupPlatformTransform(group, 0, targetZ, false);
  group.position.y = baseElev;
  if (state.currentArea === 'alan4') group.position.z = -0.70;
  addPlatformToActiveArea(group);
}

function build42UPoiRackBlok(targetArea = state.currentArea) {
  const isAlan2 = (targetArea === 'alan2');
  const areaSuffix = targetArea === 'alan3' ? ' (Alan 3)' : (isAlan2 ? ' (Alan 2)' : '');
  
  // Alan 2 için 4 POI sığacak boya (30U / 1.48m) indirildi
  const customConfig = isAlan2 ? {
    uCount: 30,
    height: 1.48,
    blockType: 'alan2-4poi-rack-blok',
    name: `30U POI Rack Blok (4x POI Dolu)${areaSuffix}`,
    modelNo: 'CSL-X-30YYA2',
    weight: 48
  } : null;

  const rackGroup = build42UIkiliCerceveKabin(0xd4d8dd, false, customConfig);
  rackGroup.userData.blockType = isAlan2 ? 'alan2-4poi-rack-blok' : '42u-poi-rack-blok';
  rackGroup.userData.name = isAlan2 ? `30U POI Rack Blok (4x POI Dolu)${areaSuffix}` : `42U POI Rack Blok (6x POI Dolu)${areaSuffix}`;
  if (isAlan2) {
    rackGroup.userData.height = 1.48;
  }
  rackGroup.userData.lockedX = false;
  rackGroup.userData.lockedY = false;
  rackGroup.userData.lockedZ = false;
  rackGroup.userData.isFreestanding = true;

  const poiCatalogItem = EQUIPMENT_CATALOG.find(item => item.id === 'prose-a12') || {
    id: 'prose-a12', category: 'POI', name: 'CB-12-POI-64F-A12 (5G NR POI)', width: 0.400, height: 0.350, depth: 0.260, weight: 22, color: '#ea580c'
  };

  const baseH = 0.1125;
  const poiHeight = poiCatalogItem.height;
  const startY = baseH + poiHeight / 2 + 0.005;
  const stepY = 0.315;
  const poiCount = isAlan2 ? 4 : 6;

  for (let i = 0; i < poiCount; i++) {
    const poiModel = buildProsePoiModel(poiCatalogItem);
    poiModel.userData.name = `POI Modül ${i + 1} (CB-12-POI-64F-A12)`;
    poiModel.userData.interactive = true;
    poiModel.position.set(0, startY + i * stepY, 0);
    rackGroup.add(poiModel);
  }

  return rackGroup;
}


function spawn42UPoiRackBlok() {
  const rackGroup = build42UPoiRackBlok(state.currentArea);
  rackGroup.userData.id = state.nextId++;
  const baseElev = (state.currentArea === 'alan4') ? 20.0 : 0.0;
  const targetZ = (state.currentArea === 'alan4') ? -0.70 : -2.0;
  setupPlatformTransform(rackGroup, 0, targetZ, false);
  rackGroup.position.y = baseElev;
  if (state.currentArea === 'alan4') rackGroup.position.z = -0.70;
  addPlatformToActiveArea(rackGroup);
}

// Standalone Interactive Model Builder: 4 POI Rack Blok (42U Referanslı Açık Sistem Kabin)
function build4PoiRackBlok(targetArea = state.currentArea) {
  const isAlan4 = (targetArea === 'alan4');
  const isAlan2 = (targetArea === 'alan2');
  const areaSuffix = isAlan4 ? ' (Alan 4)' : (targetArea === 'alan3' ? ' (Alan 3)' : (isAlan2 ? ' (Alan 2)' : ''));
  
  // 4 POI için kısaltılmış kabin mimarisi (30U / 1.48m boy - Üstteki boş raflar kaldırılmış)
  const customConfig = {
    uCount: 30,
    height: 1.48,
    blockType: '4poi-rack-blok',
    name: `4 POI Rack Blok (4x POI Dolu)${areaSuffix}`,
    modelNo: 'CSL-X-30YYA2-4POI',
    weight: 136
  };

  const rackGroup = build42UIkiliCerceveKabin(0xd4d8dd, false, customConfig);
  rackGroup.userData.blockType = '4poi-rack-blok';
  rackGroup.userData.name = `4 POI Rack Blok (4x POI Dolu)${areaSuffix}`;
  rackGroup.userData.height = 1.48;
  rackGroup.userData.weight = 136;
  rackGroup.userData.lockedX = false;
  rackGroup.userData.lockedY = false;
  rackGroup.userData.lockedZ = false;
  rackGroup.userData.isFreestanding = true;

  const poiCatalogItem = EQUIPMENT_CATALOG.find(item => item.id === 'prose-a12') || {
    id: 'prose-a12', category: 'POI', name: 'CB-12-POI-64F-A12 (5G NR POI)', width: 0.400, height: 0.350, depth: 0.260, weight: 22, color: '#ea580c'
  };

  const baseH = 0.1125;
  const poiHeight = poiCatalogItem.height;
  const startY = baseH + poiHeight / 2 + 0.005;
  const stepY = 0.315;
  const poiCount = 4;

  for (let i = 0; i < poiCount; i++) {
    const poiModel = buildProsePoiModel(poiCatalogItem);
    poiModel.userData.name = `POI Modül ${i + 1} (CB-12-POI-64F-A12)`;
    poiModel.userData.interactive = true;
    poiModel.position.set(0, startY + i * stepY, 0);
    rackGroup.add(poiModel);
  }

  return rackGroup;
}

function spawn4PoiRackBlok() {
  const rackGroup = build4PoiRackBlok(state.currentArea);
  rackGroup.userData.id = state.nextId++;
  const baseElev = (state.currentArea === 'alan4') ? 20.0 : 0.0;
  const targetZ = (state.currentArea === 'alan4') ? -0.70 : -2.0;
  setupPlatformTransform(rackGroup, 0, targetZ, false);
  rackGroup.position.y = baseElev;
  if (state.currentArea === 'alan4') rackGroup.position.z = -0.70;
  addPlatformToActiveArea(rackGroup);
}

function build20UPoiRackBlok(targetArea = state.currentArea, poiCountOverride = null) {
  const areaSuffix = targetArea === 'alan3' ? ' (Alan 3)' : (targetArea === 'alan2' ? ' (Alan 2)' : '');
  const isAlan1 = (targetArea === 'alan1');
  const poiCount = poiCountOverride !== null ? poiCountOverride : (isAlan1 ? 5 : 3);
  const is5POI = (poiCount === 5);

  const customConfig = is5POI ? {
    uCount: 36,
    height: 1.78,
    blockType: '5poi-rack-blok',
    name: '36U İkili Çerçeve Açık Sistem Kabin (5 POI)',
    modelNo: 'CSL-X-36YYA2',
    weight: 52
  } : null;

  const rackGroup = build42UIkiliCerceveKabin(0xd4d8dd, !is5POI, customConfig);
  rackGroup.userData.blockType = is5POI ? '5poi-rack-blok' : '20u-poi-rack-blok';
  rackGroup.userData.name = is5POI ? `POI Rack Blok (5x POI Dolu)${areaSuffix}` : `20U POI Rack Blok (3x POI Dolu)${areaSuffix}`;
  rackGroup.userData.height = is5POI ? 1.78 : 1.05;
  rackGroup.userData.lockedX = false;
  rackGroup.userData.lockedY = false;
  rackGroup.userData.lockedZ = false;
  rackGroup.userData.isFreestanding = true;

  const poiCatalogItem = EQUIPMENT_CATALOG.find(item => item.id === 'prose-a12') || {
    id: 'prose-a12', category: 'POI', name: 'CB-12-POI-64F-A12 (5G NR POI)', width: 0.400, height: 0.350, depth: 0.260, weight: 22, color: '#ea580c'
  };

  const baseH = 0.1125;
  const poiHeight = poiCatalogItem.height;
  const startY = baseH + poiHeight / 2 + 0.005;
  const stepY = 0.315;

  for (let i = 0; i < poiCount; i++) {
    const poiModel = buildProsePoiModel(poiCatalogItem);
    poiModel.userData.name = `POI Modül ${i + 1} (CB-12-POI-64F-A12)`;
    poiModel.userData.interactive = true;
    poiModel.position.set(0, startY + i * stepY, 0);
    rackGroup.add(poiModel);
  }

  return rackGroup;
}

function spawn20UPoiRackBlok() {
  const rackGroup = build20UPoiRackBlok(state.currentArea);
  rackGroup.userData.id = state.nextId++;
  const baseElev = (state.currentArea === 'alan4') ? 20.0 : 0.0;
  const targetZ = (state.currentArea === 'alan4') ? -0.70 : -2.0;
  setupPlatformTransform(rackGroup, 0, targetZ, false);
  rackGroup.position.y = baseElev;
  if (state.currentArea === 'alan4') rackGroup.position.z = -0.70;
  addPlatformToActiveArea(rackGroup);
}


function buildTT5li5527Blok(targetArea = state.currentArea) {
  const areaSuffix = targetArea === 'alan3' ? ' (Alan 3)' : (targetArea === 'alan2' ? ' (Alan 2)' : '');
  const isRotatedArea = (targetArea === 'alan2' || targetArea === 'alan3');
  
  const blockGroup = new THREE.Group();
  blockGroup.userData = {
    type: 'rru',
    blockType: 'tt-5li-5527-blok',
    category: 'Türk Telekom',
    name: `Türk Telekom 5'li RRU5527 Blok${areaSuffix}`,
    width: 1.0,
    height: 0.60,
    depth: 0.50,
    weight: 125,
    interactive: true,
    locked: false,
    lockedX: isRotatedArea ? true : false,
    lockedY: false,
    lockedZ: isRotatedArea ? false : true,
    allowPassThrough: true
  };

  const pipeMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.2 });
  const clampMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.1 });

  const hPipeGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.0, 16);
  hPipeGeo.rotateZ(Math.PI / 2);
  const hPipe = new THREE.Mesh(hPipeGeo, pipeMat);
  hPipe.position.set(0, 0, -0.18);
  blockGroup.add(hPipe);

  const catalogItem = EQUIPMENT_CATALOG.find(item => item.id === 'tt-5527') || {
    id: 'tt-5527', category: 'Türk Telekom', name: '2G-3G-4G RRU5527', width: 0.356, height: 0.480, depth: 0.140, weight: 25, color: '#0891b2'
  };

  const rruDepth = catalogItem.depth;
  const gap = 0.02;
  const stepX = rruDepth + gap;

  for (let i = -2; i <= 2; i++) {
    const rruModel = buildCustomEquipmentModel(catalogItem);
    rruModel.userData.name = `TT RRU5527 ${i + 3}`;
    rruModel.userData.interactive = true;
    rruModel.rotation.set(0, Math.PI / 2, Math.PI);
    const posX = i * stepX;
    rruModel.position.set(posX, 0, 0);

    const bracketGeo = new THREE.BoxGeometry(0.08, 0.10, 0.18);
    const bracketMesh = new THREE.Mesh(bracketGeo, clampMat);
    bracketMesh.position.set(posX, 0, -0.14);
    blockGroup.add(bracketMesh);
    blockGroup.add(rruModel);
  }

  return blockGroup;
}

function spawnTT5li5527Blok() {
  const blockGroup = buildTT5li5527Blok(state.currentArea);
  blockGroup.userData.id = state.nextId++;
  setupPlatformTransform(blockGroup, 0, -2.0, false);
  blockGroup.position.y = 0.75;
  addPlatformToActiveArea(blockGroup);
}

function buildTT5li5818WBlok(targetArea = state.currentArea) {
  const areaSuffix = targetArea === 'alan3' ? ' (Alan 3)' : (targetArea === 'alan2' ? ' (Alan 2)' : '');
  const isRotatedArea = (targetArea === 'alan2' || targetArea === 'alan3');
  
  const blockGroup = new THREE.Group();
  blockGroup.userData = {
    type: 'rru',
    blockType: 'tt-5li-5818w-blok',
    category: 'Türk Telekom',
    name: `Türk Telekom 5'li RRU5818W Blok${areaSuffix}`,
    width: 1.0,
    height: 0.60,
    depth: 0.50,
    weight: 125,
    interactive: true,
    locked: false,
    lockedX: isRotatedArea ? true : false,
    lockedY: false,
    lockedZ: isRotatedArea ? false : true,
    allowPassThrough: true
  };

  const pipeMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.2 });
  const clampMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.1 });

  const hPipeGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.0, 16);
  hPipeGeo.rotateZ(Math.PI / 2);
  const hPipe = new THREE.Mesh(hPipeGeo, pipeMat);
  hPipe.position.set(0, 0, -0.18);
  blockGroup.add(hPipe);

  const catalogItem = EQUIPMENT_CATALOG.find(item => item.id === 'tt-5818w') || {
    id: 'tt-5818w', category: 'Türk Telekom', name: 'NR RRU 5818W', width: 0.356, height: 0.480, depth: 0.140, weight: 25, color: '#0891b2'
  };

  const rruDepth = catalogItem.depth;
  const gap = 0.02;
  const stepX = rruDepth + gap;

  for (let i = -2; i <= 2; i++) {
    const rruModel = buildCustomEquipmentModel(catalogItem);
    rruModel.userData.name = `TT RRU5818W ${i + 3}`;
    rruModel.userData.interactive = true;
    rruModel.rotation.set(0, Math.PI / 2, Math.PI);
    const posX = i * stepX;
    rruModel.position.set(posX, 0, 0);

    const bracketGeo = new THREE.BoxGeometry(0.08, 0.10, 0.18);
    const bracketMesh = new THREE.Mesh(bracketGeo, clampMat);
    bracketMesh.position.set(posX, 0, -0.14);
    blockGroup.add(bracketMesh);
    blockGroup.add(rruModel);
  }

  return blockGroup;
}

function spawnTT5li5818WBlok() {
  const blockGroup = buildTT5li5818WBlok(state.currentArea);
  blockGroup.userData.id = state.nextId++;
  setupPlatformTransform(blockGroup, 0, -2.0, false);
  blockGroup.position.y = 0.75;
  addPlatformToActiveArea(blockGroup);
}

function buildVoda3liRRUBlok(targetArea = state.currentArea) {
  const areaSuffix = targetArea === 'alan3' ? ' (Alan 3)' : (targetArea === 'alan2' ? ' (Alan 2)' : '');
  const isRotatedArea = (targetArea === 'alan2' || targetArea === 'alan3');
  
  const blockGroup = new THREE.Group();
  blockGroup.userData = {
    type: 'rru',
    blockType: 'voda-3li-rru-blok',
    category: 'Vodafone',
    name: `Vodafone 3'lü RRU5526t Blok${areaSuffix}`,
    width: 0.65,
    height: 0.60,
    depth: 0.50,
    weight: 84,
    interactive: true,
    locked: false,
    lockedX: isRotatedArea ? true : false,
    lockedY: false,
    lockedZ: isRotatedArea ? false : true,
    allowPassThrough: true
  };

  const pipeMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.2 });
  const clampMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.1 });

  const hPipeGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.65, 16);
  hPipeGeo.rotateZ(Math.PI / 2);
  const hPipe = new THREE.Mesh(hPipeGeo, pipeMat);
  hPipe.position.set(0, 0, -0.18);
  blockGroup.add(hPipe);

  const vodaItem = EQUIPMENT_CATALOG.find(item => item.id === 'vodafone-5526t') || {
    id: 'vodafone-5526t', category: 'Vodafone', name: 'RRU5526t', width: 0.432, height: 0.480, depth: 0.135, weight: 28, color: '#dc2626'
  };

  const rruDepth = vodaItem.depth;
  const gap = 0.02;
  const stepX = rruDepth + gap;

  for (let i = -1; i <= 1; i++) {
    const rruModel = buildCustomEquipmentModel(vodaItem);
    rruModel.userData.name = `Vodafone RRU5526t ${i + 2}`;
    rruModel.userData.interactive = true;
    rruModel.rotation.set(0, Math.PI / 2, Math.PI);
    const posX = i * stepX;
    rruModel.position.set(posX, 0, 0);

    const bracketGeo = new THREE.BoxGeometry(0.08, 0.10, 0.18);
    const bracketMesh = new THREE.Mesh(bracketGeo, clampMat);
    bracketMesh.position.set(posX, 0, -0.14);
    blockGroup.add(bracketMesh);
    blockGroup.add(rruModel);
  }

  return blockGroup;
}

function spawnVoda3liRRUBlok() {
  const blockGroup = buildVoda3liRRUBlok(state.currentArea);
  blockGroup.userData.id = state.nextId++;
  setupPlatformTransform(blockGroup, 0, -2.0, false);
  blockGroup.position.y = 0.75;
  addPlatformToActiveArea(blockGroup);
}

function buildVoda5liRRUBlok(targetArea = state.currentArea) {
  const areaSuffix = targetArea === 'alan3' ? ' (Alan 3)' : (targetArea === 'alan2' ? ' (Alan 2)' : '');
  const isRotatedArea = (targetArea === 'alan2' || targetArea === 'alan3');
  
  const blockGroup = new THREE.Group();
  blockGroup.userData = {
    type: 'rru',
    blockType: 'voda-5li-rru-blok',
    category: 'Vodafone',
    name: `Vodafone 5'li RRU5526t Blok${areaSuffix}`,
    width: 1.0,
    height: 0.60,
    depth: 0.50,
    weight: 140,
    interactive: true,
    locked: false,
    lockedX: isRotatedArea ? true : false,
    lockedY: false,
    lockedZ: isRotatedArea ? false : true,
    allowPassThrough: true
  };

  const pipeMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.2 });
  const clampMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.1 });

  const hPipeGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.0, 16);
  hPipeGeo.rotateZ(Math.PI / 2);
  const hPipe = new THREE.Mesh(hPipeGeo, pipeMat);
  hPipe.position.set(0, 0, -0.18);
  blockGroup.add(hPipe);

  const vodaItem = EQUIPMENT_CATALOG.find(item => item.id === 'vodafone-5526t') || {
    id: 'vodafone-5526t', category: 'Vodafone', name: 'RRU5526t', width: 0.432, height: 0.480, depth: 0.135, weight: 28, color: '#dc2626'
  };

  const rruDepth = vodaItem.depth;
  const gap = 0.02;
  const stepX = rruDepth + gap;

  for (let i = -2; i <= 2; i++) {
    const rruModel = buildCustomEquipmentModel(vodaItem);
    rruModel.userData.name = `Vodafone RRU5526t ${i + 3}`;
    rruModel.userData.interactive = true;
    rruModel.rotation.set(0, Math.PI / 2, Math.PI);
    const posX = i * stepX;
    rruModel.position.set(posX, 0, 0);

    const bracketGeo = new THREE.BoxGeometry(0.08, 0.10, 0.18);
    const bracketMesh = new THREE.Mesh(bracketGeo, clampMat);
    bracketMesh.position.set(posX, 0, -0.14);
    blockGroup.add(bracketMesh);
    blockGroup.add(rruModel);
  }

  return blockGroup;
}

function spawnVoda5liRRUBlok() {
  const blockGroup = buildVoda5liRRUBlok(state.currentArea);
  blockGroup.userData.id = state.nextId++;
  setupPlatformTransform(blockGroup, 0, -2.0, false);
  blockGroup.position.y = 0.75;
  addPlatformToActiveArea(blockGroup);
}

function buildTCellOffsetBlok(targetArea = state.currentArea) {
  const areaSuffix = targetArea === 'alan3' ? ' (Alan 3)' : (targetArea === 'alan2' ? ' (Alan 2)' : '');
  const isRotatedArea = (targetArea === 'alan2' || targetArea === 'alan3');
  
  const blockGroup = new THREE.Group();
  blockGroup.userData = {
    type: 'rru',
    blockType: 'tcell-offset-blok',
    category: 'Turkcell',
    name: `Turkcell 10'lu (5 Dikey Boru 2 Kat) Blok${areaSuffix}`,
    width: 1.0,
    height: 2.40,
    depth: 0.50,
    weight: 260,
    interactive: true,
    locked: false,
    lockedX: isRotatedArea ? true : false,
    lockedY: false,
    lockedZ: isRotatedArea ? false : true,
    allowPassThrough: true
  };

  const pipeMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.2 });
  const clampMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.1 });

  const rruDepth = 0.140;
  const gap = 0.02;
  const stepX = rruDepth + gap;
  const pipeHeight = 1.50;

  for (let i = -2; i <= 2; i++) {
    const posX = i * stepX;
    const vPipeGeo = new THREE.CylinderGeometry(0.025, 0.025, pipeHeight, 16);
    const vPipe = new THREE.Mesh(vPipeGeo, pipeMat);
    vPipe.position.set(posX, 0.75, -0.26);
    blockGroup.add(vPipe);

    const flangeGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16);
    const botFlange = new THREE.Mesh(flangeGeo, clampMat);
    botFlange.position.set(posX, 0.01, -0.26);
    blockGroup.add(botFlange);

    const topFlange = new THREE.Mesh(flangeGeo, clampMat);
    topFlange.position.set(posX, 1.49, -0.26);
    blockGroup.add(topFlange);
  }

  const levelsY = [1.50, 0.75];
  levelsY.forEach((levelY) => {
    const hPipeGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.0, 16);
    hPipeGeo.rotateZ(Math.PI / 2);
    const hPipe = new THREE.Mesh(hPipeGeo, pipeMat);
    hPipe.position.set(0, levelY, -0.26);
    blockGroup.add(hPipe);
  });

  const tcellCatalog = [
    EQUIPMENT_CATALOG.find(item => item.id === 'tcell-5301') || { id: 'tcell-5301', category: 'Turkcell', name: 'RRU 5301', width: 0.400, height: 0.480, depth: 0.140, weight: 25, color: '#1d4ed8' },
    EQUIPMENT_CATALOG.find(item => item.id === 'tcell-5502') || { id: 'tcell-5502', category: 'Turkcell', name: 'RRU 5502', width: 0.400, height: 0.480, depth: 0.140, weight: 25, color: '#1d4ed8' },
    EQUIPMENT_CATALOG.find(item => item.id === 'tcell-5909') || { id: 'tcell-5909', category: 'Turkcell', name: 'RRU 5909', width: 0.400, height: 0.480, depth: 0.140, weight: 25, color: '#1d4ed8' },
    EQUIPMENT_CATALOG.find(item => item.id === 'tcell-5319') || { id: 'tcell-5319', category: 'Turkcell', name: 'RRU 5319', width: 0.400, height: 0.480, depth: 0.140, weight: 25, color: '#1d4ed8' }
  ];

  let totalRruIndex = 0;
  levelsY.forEach((levelY, lvlIdx) => {
    const levelLabel = lvlIdx === 0 ? 'Üst Kot (+1.50m)' : 'Alt Kot (+0.75m)';
    for (let i = -2; i <= 2; i++) {
      const catalogItem = tcellCatalog[totalRruIndex % tcellCatalog.length];
      totalRruIndex++;
      const rruModel = buildCustomEquipmentModel(catalogItem);
      rruModel.userData.name = `Turkcell ${catalogItem.name} (${levelLabel} ${i + 3})`;
      rruModel.userData.interactive = true;
      rruModel.rotation.set(0, Math.PI / 2, Math.PI);
      const posX = i * stepX;
      rruModel.position.set(posX, levelY, 0);

      const bracketGeo = new THREE.BoxGeometry(0.08, 0.10, 0.08);
      const bracketMesh = new THREE.Mesh(bracketGeo, clampMat);
      bracketMesh.position.set(posX, levelY, -0.22);
      blockGroup.add(bracketMesh);
      blockGroup.add(rruModel);
    }
  });

  return blockGroup;
}

function spawnTCellOffsetBlok() {
  const blockGroup = buildTCellOffsetBlok(state.currentArea);
  blockGroup.userData.id = state.nextId++;
  setupPlatformTransform(blockGroup, 0, -2.0, false);
  blockGroup.position.y = 0.0;
  addPlatformToActiveArea(blockGroup);
}

// =========================================================================
// SKORBOARD KİRİŞİ TEKLİ RRU MODEL BUILDER (KISA KENAR MONTAJ)
// - Operatörler: Turkcell, Vodafone, Türk Telekom
// - Skorboard 40cm gerideki Y=1.70m, Z=-2.25m yatay taşıyıcı kirişe dar/kısa kenarından (14cm) kenetlenir
// - Ray boyunca serbest kayar (lockedX: false, lockedY: true, lockedZ: true)
// =========================================================================
// SKORBOARD KİRİŞİ TEKLİ RRU MODEL BUILDER (KISA KENAR MONTAJ)
// - Operatörler: Turkcell, Vodafone, Türk Telekom
// - Boyutlar ve renkler kullanıcının verdiği EQUIPMENT_CATALOG modellerinden birebir alınır:
//   * Turkcell: LTE RRU4485 - 4G (W: 0.398, H: 0.533, D: 0.145, Renk: #1d4ed8)
//   * Vodafone: RRU5526t (W: 0.432, H: 0.480, D: 0.135, Renk: #dc2626)
//   * Türk Telekom: NR RRU 5818W (W: 0.356, H: 0.480, D: 0.140, Renk: #0891b2)
// - Skorboard 40cm gerideki Y=1.70m, Z=-2.25m yatay taşıyıcı kirişe dar/kısa kenarından kenetlenir
// - Gövde doğrudan katalog rengiyle boyanır
// - Ray boyunca serbest kayar (lockedX: false, lockedY: true, lockedZ: true)
// =========================================================================

// =========================================================================
// ALAN 2 / SKORBOARD: SİLİNDİR BORU ÇEMBER MONTAJLI MATSİNG 4-BEAM LENS ANTENİ
// - Taşıyıcı dev silindir (Ø1500mm, R=0.75m) çember şeklinde kelepçelenir
// - Silindirin altından 2 metrelik dikey taşıyıcı boru sarkıtılır
// - Matsing lens anteni sahaya/tribünlere doğru 45 derece eğimle (downtilt) takılır
// - Kedi yolu merkezinden (X = 0) her iki tarafa 20 metre (X = -20m ve X = +20m) konumlanır
// =========================================================================
function buildScoreboardMatsingCylinderOffsetAssembly(side = 'left') {
  const group = new THREE.Group();
  const isLeft = (side === 'left');
  const defaultX = isLeft ? -20.0 : 20.0;

  group.userData = {
    id: state.nextId++,
    type: 'antenna',
    blockType: 'scoreboard-matsing-cylinder-assembly',
    catalogId: 'matsing-4-beam',
    category: 'Matsing',
    name: `Matsing 4-Beam Silindir Doğrudan 45° Montajı (${isLeft ? 'Sol' : 'Sağ'} - 20m Ofset)`,
    side: side,
    width: 0.617,
    height: 1.635,
    depth: 0.721,
    weight: 85, // Anten (51kg) + çember bilezik, 3m düşey boru ve doğrudan 45° sırt kelepçesi
    interactive: true,
    locked: false,
    lockedX: false, // Silindir boyunca kaydırılabilir
    lockedY: true,  // Silindir alt kotunda kilitli
    lockedZ: true,  // Skorboarda uzak silindir ekseninde kilitli (Z = +0.55m)
    initialY: 19.05,
    initialZ: 0.55,
    isCylinderMatsing: true,
    allowPassThrough: true,
    isFreestanding: true
  };

  // Malzemeler (Endüstriyel galvanizli çelik ve mat siyah bağlantı elemanları)
  const galvSteelMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.35, metalness: 0.8 });
  const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.8 });
  const boltMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.9 });
  const galvPipeMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.32, metalness: 0.85 });

  // 1. Çember Şeklinde Saran Katı Gövdeli Kelepçe Bileziği (Ø1500mm Boruyu Tam Saran Etli Çelik Bilezik)
  const collarShape = new THREE.Shape();
  const R_out = 0.795;
  const R_in = 0.75;
  collarShape.absarc(0, 0, R_out, 0, Math.PI * 2, false);
  const holePath = new THREE.Path();
  holePath.absarc(0, 0, R_in, 0, Math.PI * 2, true);
  collarShape.holes.push(holePath);

  const collarGeo = new THREE.ExtrudeGeometry(collarShape, {
    depth: 0.20,
    bevelEnabled: true,
    bevelThickness: 0.005,
    bevelSize: 0.005,
    bevelSegments: 2,
    curveSegments: 48
  });
  collarGeo.center();
  collarGeo.rotateY(Math.PI / 2);

  const collarMesh = new THREE.Mesh(collarGeo, galvSteelMat);
  collarMesh.castShadow = true;
  group.add(collarMesh);

  // Yatay flanş kulakları ve M24 sıkma cıvataları (Z = ±0.80m)
  const flangeGeo = new THREE.BoxGeometry(0.22, 0.04, 0.09);
  [-0.80, 0.80].forEach(fz => {
    const fUpper = new THREE.Mesh(flangeGeo, darkSteelMat);
    fUpper.position.set(0, 0.025, fz);
    group.add(fUpper);

    const fLower = new THREE.Mesh(flangeGeo, darkSteelMat);
    fLower.position.set(0, -0.025, fz);
    group.add(fLower);

    [-0.06, 0.06].forEach(bx => {
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 12), boltMat);
      bolt.position.set(bx, 0, fz);
      group.add(bolt);
    });
  });

  // 2. Alt Eyer Montaj Plakası ve Takviye Berkitme Gusset Levhaları (Y = -0.795m)
  const saddleGeo = new THREE.BoxGeometry(0.32, 0.03, 0.32);
  const saddle = new THREE.Mesh(saddleGeo, darkSteelMat);
  saddle.position.set(0, -0.81, 0);
  group.add(saddle);

  const gussetGeo = new THREE.BoxGeometry(0.018, 0.16, 0.12);
  [-0.08, 0.08].forEach(gx => {
    const gMesh = new THREE.Mesh(gussetGeo, darkSteelMat);
    gMesh.position.set(gx, -0.89, 0);
    group.add(gMesh);
  });
  [-0.08, 0.08].forEach(gz => {
    const gMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.018), darkSteelMat);
    gMesh.position.set(0, -0.89, gz);
    group.add(gMesh);
  });

  // 3. ANA DÜŞEY SARKITMA TAŞIYICI BORU (Ø114mm, Y: -0.81m'den Y: -2.90m'ye kadar uzanır, Boy = 2.09m)
  // Toplam silindir merkezinden iniş = ~2.90 metre
  const mainDropPipeR = 0.057;
  const mainDropPipeLen = 2.09;
  const mainDropPipeGeo = new THREE.CylinderGeometry(mainDropPipeR, mainDropPipeR, mainDropPipeLen, 32);
  const mainDropPipe = new THREE.Mesh(mainDropPipeGeo, galvPipeMat);
  mainDropPipe.position.set(0, -0.81 - mainDropPipeLen / 2, 0); // Merkez Y = -1.855m
  mainDropPipe.castShadow = true;
  group.add(mainDropPipe);

  const pipeCapGeo = new THREE.CylinderGeometry(mainDropPipeR * 1.15, mainDropPipeR * 1.15, 0.03, 24);
  const mainPipeCap = new THREE.Mesh(pipeCapGeo, darkSteelMat);
  mainPipeCap.position.set(0, -0.81 - mainDropPipeLen, 0); // Y = -2.90m
  group.add(mainPipeCap);

  // 4. DOĞRUDAN 45 DERECE AÇILI SIRT MONTAJ KELEPÇESİ VE BERKİTME ELEMANLARI
  // Kullanıcı İsteği: Yana doğru uzanan 2 konsol kolu kaldırıldı!
  // Düşey inen 3 metre borunun tam alt hizasında, doğrudan antenin sırtındaki boruya bağlanan
  // çiftli galvaniz çapraz açı kelepçeleri (crossover clamps) ve açı sabitleme plakası:
  [-2.55, -2.85].forEach(cy => {
    // Düşey boruyu saran kelepçe yarım gövdesi
    const vertClampGeo = new THREE.CylinderGeometry(mainDropPipeR + 0.012, mainDropPipeR + 0.012, 0.09, 24);
    const vClamp = new THREE.Mesh(vertClampGeo, darkSteelMat);
    vClamp.position.set(0, cy, 0);
    group.add(vClamp);

    // 45° açılı montaj borusunu saran eyer kelepçesi
    const angledSaddleGeo = new THREE.BoxGeometry(0.14, 0.09, 0.04);
    const aSaddle = new THREE.Mesh(angledSaddleGeo, galvSteelMat);
    aSaddle.position.set(0, cy, 0.045);
    group.add(aSaddle);

    // M20 sıkma cıvataları
    [-0.07, 0.07].forEach(bx => {
      const boltMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.15, 12), boltMat);
      boltMesh.rotation.x = Math.PI / 2;
      boltMesh.position.set(bx, cy, 0.02);
      group.add(boltMesh);
    });
  });

  // Açı Takviye ve Rijitlik Gergisi (Düşey boru ile 45° boru arası çelik rijitlik berkitmesi)
  const gussetPlateGeo = new THREE.BoxGeometry(0.02, 0.35, 0.12);
  const gussetPlate = new THREE.Mesh(gussetPlateGeo, darkSteelMat);
  gussetPlate.position.set(0, -2.70, 0.035);
  group.add(gussetPlate);

  // 5. ANTENİN SIRTINDAKİ 45 DERECE AÇILI MONTAJ BORUSU (Ø89mm / 3", Uzunluk = 1.65m)
  // Tam 45 derece eğimli, yönü: (0, 0.7071, 0.7071)
  // Merkez noktası: (0, -2.85, 0.05) - Düşey iniş yapan ofsetin doğrudan alt hizasında!
  const antPipeR = 0.045; // Ø89mm
  const antPipeLen = 1.65;
  const antPipeGeo = new THREE.CylinderGeometry(antPipeR, antPipeR, antPipeLen, 24);
  const antPipe = new THREE.Mesh(antPipeGeo, galvSteelMat);
  antPipe.position.set(0, -2.85, 0.05);
  antPipe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1, 1).normalize());
  group.add(antPipe);

  // Uç kapakları
  const antCapGeo = new THREE.CylinderGeometry(antPipeR * 1.1, antPipeR * 1.1, 0.02, 20);
  const capOffset = new THREE.Vector3(0, 1, 1).normalize().multiplyScalar(antPipeLen / 2);
  const antTopCap = new THREE.Mesh(antCapGeo, darkSteelMat);
  antTopCap.position.copy(antPipe.position).add(capOffset);
  antTopCap.quaternion.copy(antPipe.quaternion);
  group.add(antTopCap);

  const antBotCap = new THREE.Mesh(antCapGeo, darkSteelMat);
  antBotCap.position.copy(antPipe.position).sub(capOffset);
  antBotCap.quaternion.copy(antPipe.quaternion);
  group.add(antBotCap);

  // 6. MATSING 4-BEAM LENS ANTENİ (MS-MBA-4.4.2)
  // Doğrudan 3 metrelik iniş yapan ofsetin tam altında!
  // Skorboardın tam tersine (+Z) dönük, sahaya doğru 45° aşağı eğimli
  // Antenin kendi arka eyer kelepçeleri doğrudan bu 45° sırt borusunu sıkar!
  const matsing = buildMatsingAntennaModel({
    name: `Matsing 4-Beam Lens Anten (${isLeft ? 'Sol' : 'Sağ'} - Skorboard Tersi 45° Eğim)`,
    id: 'matsing-4-beam',
    category: 'Matsing'
  });

  matsing.quaternion.setFromEuler(new THREE.Euler(Math.PI / 4, 0, 0, 'YXZ'));
  matsing.position.set(0, -3.17, 0.3685);
  group.add(matsing);

  // Konumlandırma: Silindir 2 ekseninde (Y = 19.05, Z = 0.55)
  group.position.set(defaultX, 19.05, 0.55);
  return group;
}

function spawnScoreboardMatsingCylinderAssembly(side = null) {
  const activePlatforms = getActivePlatforms();
  const existingAntennas = activePlatforms.filter(p => p.userData && p.userData.blockType === 'scoreboard-matsing-cylinder-assembly');
  let chosenSide = side;
  if (!chosenSide) {
    const hasLeft = existingAntennas.some(p => p.userData.side === 'left' || p.position.x < 0);
    const hasRight = existingAntennas.some(p => p.userData.side === 'right' || p.position.x > 0);
    if (!hasLeft) chosenSide = 'left';
    else if (!hasRight) chosenSide = 'right';
    else chosenSide = 'left';
  }
  const group = buildScoreboardMatsingCylinderOffsetAssembly(chosenSide);
  group.userData.id = state.nextId++;
  addPlatformToActiveArea(group);
}

function buildScoreboardSingleRRU(operator = 'turkcell', customX = 0) {
  const catalogLookups = {
    turkcell: EQUIPMENT_CATALOG.find(i => i.id === 'turkcell-4485') || { id: 'turkcell-4485', category: 'Turkcell', name: 'LTE RRU4485 - 4G', width: 0.398, height: 0.533, depth: 0.145, weight: 25, color: '#1d4ed8' },
    vodafone: EQUIPMENT_CATALOG.find(i => i.id === 'vodafone-5526t') || { id: 'vodafone-5526t', category: 'Vodafone', name: 'RRU5526t', width: 0.432, height: 0.480, depth: 0.135, weight: 28, color: '#dc2626' },
    tt: EQUIPMENT_CATALOG.find(i => i.id === 'tt-5818w') || { id: 'tt-5818w', category: 'Türk Telekom', name: 'NR RRU 5818W', width: 0.356, height: 0.480, depth: 0.140, weight: 25, color: '#0891b2' }
  };

  const catItem = catalogLookups[operator] || catalogLookups.turkcell;
  const cfg = {
    name: `${catItem.category} ${catItem.name} (Kısa Kenar Montaj)`,
    catalogId: catItem.id,
    category: catItem.category,
    color: catItem.color,
    w: catItem.width,   // Z yönünde konsol uzanır (Katalog genişliği)
    h: catItem.height,  // Y yönünde yükseklik (Katalog yüksekliği)
    d: catItem.depth,   // X ekseni boyunca kısa kenar (Katalog derinliği)
    weight: catItem.weight || 25
  };

  const group = new THREE.Group();

  const beamY = 21.70; // 20m yükseltilmiş (1.70 + 20.0)
  const beamZ = -2.25;
  const mountZ = beamZ + 0.05; // -2.20m (Kirişin kedi yoluna bakan arka yüzeyi)

  group.userData = {
    type: 'rru',
    blockType: `scoreboard-rru-${operator}`,
    catalogId: cfg.catalogId,
    category: cfg.category,
    name: cfg.name,
    operator: operator,
    isScoreboardRRU: true,
    width: cfg.d, // Ray üzerindeki yer kaplama genişliği = kısa kenar
    height: cfg.h,
    depth: cfg.w,
    weight: cfg.weight,
    interactive: true,
    locked: false,
    lockedX: false, // Ray boyunca serbest kayar
    lockedY: true,  // Kiriş kotunda kilitli
    lockedZ: true,  // Kiriş düzleminde kilitli
    initialY: beamY,
    initialZ: mountZ,
    allowPassThrough: true
  };

  // Malzemeler: Gövde tamamen katalog rengiyle (#1d4ed8 / #dc2626 / #0891b2) boyanır
  const bodyMat = new THREE.MeshStandardMaterial({ 
    color: cfg.color, 
    roughness: 0.35, 
    metalness: 0.35 
  });
  const finMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.6 });
  const clampSteelMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4, metalness: 0.8 });
  const boltMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.2, metalness: 0.9 });
  const darkPortMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7, metalness: 0.2 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.85 });
  const badgeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.1 });

  // 1. KİRİŞ KELEPÇESİ (16x10cm Kirişe Sarılan Mengene Çeneleri)
  // Üst çene (Y = +0.08)
  const topJaw = new THREE.Mesh(new THREE.BoxGeometry(cfg.d + 0.04, 0.02, 0.12), clampSteelMat);
  topJaw.position.set(0, 0.08, -0.05);
  group.add(topJaw);

  // Alt çene (Y = -0.08)
  const botJaw = new THREE.Mesh(new THREE.BoxGeometry(cfg.d + 0.04, 0.02, 0.12), clampSteelMat);
  botJaw.position.set(0, -0.08, -0.05);
  group.add(botJaw);

  // Arka plaka ve montaj eyeri (Z = 0.01)
  const backPlate = new THREE.Mesh(new THREE.BoxGeometry(cfg.d + 0.03, 0.18, 0.02), clampSteelMat);
  backPlate.position.set(0, 0, 0.01);
  group.add(backPlate);

  // Sıkma Cıvataları
  [-0.05, 0.05].forEach(bx => {
    [-0.06, 0.06].forEach(by => {
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.03, 6), boltMat);
      bolt.rotation.x = Math.PI / 2;
      bolt.position.set(bx, by, 0.025);
      group.add(bolt);
    });
  });

  // 2. KISA KENAR ADAPTÖR PLAKASI (RRU'nun dar kenarına bağlanan çelik konsol)
  const adapterGeo = new THREE.BoxGeometry(cfg.d, 0.14, 0.04);
  const adapterMesh = new THREE.Mesh(adapterGeo, clampSteelMat);
  adapterMesh.position.set(0, 0, 0.04);
  group.add(adapterMesh);

  // 3. RRU ANA GÖVDESİ (Katalog Rengi ile Boyanmış, exact ölçüler)
  const rruCenterZ = 0.06 + cfg.w / 2;
  const bodyGeo = new THREE.BoxGeometry(cfg.d, cfg.h, cfg.w);
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.name = 'rru_body';
  bodyMesh.position.set(0, 0, rruCenterZ);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  group.add(bodyMesh);

  // 4. SOĞUTMA PETEKLERİ (Yan yüzeylerde dikey kanatçıklar)
  const finGeo = new THREE.BoxGeometry(0.006, cfg.h - 0.04, cfg.w - 0.04);
  [-cfg.d / 2 - 0.003, cfg.d / 2 + 0.003].forEach(fx => {
    const fin = new THREE.Mesh(finGeo, finMat);
    fin.position.set(fx, 0, rruCenterZ);
    group.add(fin);
  });

  // 5. ÖN BEYAZ MODEL ETİKETİ VE DURUM LED'LERİ (Kedi yoluna bakan ön yüzde)
  const opPlateGeo = new THREE.BoxGeometry(cfg.d - 0.02, 0.08, 0.006);
  const opPlate = new THREE.Mesh(opPlateGeo, badgeMat);
  opPlate.position.set(0, cfg.h / 2 - 0.07, rruCenterZ + cfg.w / 2 + 0.003);
  group.add(opPlate);

  // Status LEDs (Yeşil RUN, Sarı ACT, Kırmızı ALM)
  const ledColors = [0x22c55e, 0xf59e0b, 0xef4444];
  ledColors.forEach((col, idx) => {
    const led = new THREE.Mesh(
      new THREE.CylinderGeometry(0.004, 0.004, 0.004, 8),
      new THREE.MeshBasicMaterial({ color: col })
    );
    led.rotation.x = Math.PI / 2;
    led.position.set(-0.03 + idx * 0.03, cfg.h / 2 - 0.07, rruCenterZ + cfg.w / 2 + 0.007);
    group.add(led);
  });

  // 6. ÜST TAŞIMA KULBU
  const handleGeo = new THREE.TorusGeometry(0.04, 0.007, 8, 16, Math.PI);
  const handle = new THREE.Mesh(handleGeo, clampSteelMat);
  handle.rotation.x = Math.PI;
  handle.position.set(0, cfg.h / 2 + 0.005, rruCenterZ);
  group.add(handle);

  // 7. ALT JUMPER KABLO ÇIKIŞLARI (4x RF Portu + 2x Optik + Topraklama)
  [-0.035, 0.035].forEach(px => {
    [-0.08, 0.08].forEach(pz => {
      const port = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 12), brassMat);
      port.position.set(px, -cfg.h / 2 - 0.015, rruCenterZ + pz);
      group.add(port);

      // Aşağı kıvrılan siyah jumper kablosu
      const cableGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.14, 8);
      const cable = new THREE.Mesh(cableGeo, darkPortMat);
      cable.position.set(px, -cfg.h / 2 - 0.08, rruCenterZ + pz);
      group.add(cable);
    });
  });

  // Konumlandırma
  group.position.set(customX, beamY, mountZ);
  return group;
}

function spawnScoreboardRRU(operator) {
  // Alan 4'te akıllı boş X konumu bul
  const activePlatforms = getActivePlatforms();
  const existingRRUs = activePlatforms.filter(p => p.userData && p.userData.isScoreboardRRU);
  let defaultX = 0;
  if (existingRRUs.length > 0) {
    const maxPosX = Math.max(...existingRRUs.map(r => r.position.x));
    if (maxPosX + 0.25 <= 5.8) {
      defaultX = Number((maxPosX + 0.22).toFixed(2));
    } else {
      const minPosX = Math.min(...existingRRUs.map(r => r.position.x));
      defaultX = Number(Math.max(-5.8, minPosX - 0.22).toFixed(2));
    }
  }

  const rruGroup = buildScoreboardSingleRRU(operator, defaultX);
  rruGroup.userData.id = state.nextId++;
  addPlatformToActiveArea(rruGroup);
}

function buildAlan2KarmaRRUBlok(targetArea = state.currentArea) {
  let areaSuffix = ' (Alan 2)';
  if (targetArea === 'alan3') areaSuffix = ' (Alan 3)';
  if (targetArea === 'alan1') areaSuffix = ' (Alan 1)';
  const isRotatedArea = (targetArea === 'alan2' || targetArea === 'alan3');
  
  const blockGroup = new THREE.Group();
  blockGroup.userData = {
    type: 'rru',
    blockType: 'alan2-karma-rru-blok',
    category: 'Karma',
    name: `Alan 2 Karma RRU Blok (4 Borulu - 7 RRU)${areaSuffix}`,
    width: 0.80,
    height: 2.40,
    depth: 0.50,
    weight: 190,
    interactive: true,
    locked: false,
    lockedX: isRotatedArea ? true : false,
    lockedY: false,
    lockedZ: isRotatedArea ? false : true,
    allowPassThrough: true
  };

  const pipeMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.2 });
  const clampMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.1 });

  const pipePositionsX = [-0.24, -0.08, 0.08, 0.24];
  const pipeHeight = 1.50;

  pipePositionsX.forEach((posX) => {
    const vPipeGeo = new THREE.CylinderGeometry(0.025, 0.025, pipeHeight, 16);
    const vPipe = new THREE.Mesh(vPipeGeo, pipeMat);
    vPipe.position.set(posX, 0.75, -0.26);
    blockGroup.add(vPipe);

    const flangeGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16);
    const botFlange = new THREE.Mesh(flangeGeo, clampMat);
    botFlange.position.set(posX, 0.01, -0.26);
    blockGroup.add(botFlange);

    const topFlange = new THREE.Mesh(flangeGeo, clampMat);
    topFlange.position.set(posX, 1.49, -0.26);
    blockGroup.add(topFlange);
  });

  const levelsY = [1.50, 0.75];
  levelsY.forEach((levelY) => {
    const hPipeGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.65, 16);
    hPipeGeo.rotateZ(Math.PI / 2);
    const hPipe = new THREE.Mesh(hPipeGeo, pipeMat);
    hPipe.position.set(0, levelY, -0.26);
    blockGroup.add(hPipe);
  });

  const tcell1 = EQUIPMENT_CATALOG.find(item => item.id === 'tcell-5301') || { id: 'tcell-5301', category: 'Turkcell', name: 'RRU 5301', width: 0.400, height: 0.480, depth: 0.140, weight: 25, color: '#1d4ed8' };
  const tcell2 = EQUIPMENT_CATALOG.find(item => item.id === 'tcell-5502') || { id: 'tcell-5502', category: 'Turkcell', name: 'RRU 5502', width: 0.400, height: 0.480, depth: 0.140, weight: 25, color: '#1d4ed8' };
  const tt1 = EQUIPMENT_CATALOG.find(item => item.id === 'tt-5527') || { id: 'tt-5527', category: 'Türk Telekom', name: '2G-3G-4G RRU5527', width: 0.356, height: 0.480, depth: 0.140, weight: 25, color: '#0891b2' };
  const tt2 = EQUIPMENT_CATALOG.find(item => item.id === 'tt-5818w') || { id: 'tt-5818w', category: 'Türk Telekom', name: 'NR RRU 5818W', width: 0.356, height: 0.480, depth: 0.140, weight: 25, color: '#0891b2' };
  const vodaItem = EQUIPMENT_CATALOG.find(item => item.id === 'vodafone-5526t') || { id: 'vodafone-5526t', category: 'Vodafone', name: 'RRU5526t', width: 0.432, height: 0.480, depth: 0.135, weight: 28, color: '#dc2626' };

  const lowerEquipments = [
    { item: tcell1, label: 'Turkcell RRU5301', posX: pipePositionsX[0] },
    { item: tcell2, label: 'Turkcell RRU5502', posX: pipePositionsX[1] },
    { item: tt1, label: 'TT RRU5527', posX: pipePositionsX[2] },
    { item: tt2, label: 'TT RRU5818W', posX: pipePositionsX[3] }
  ];

  lowerEquipments.forEach(eq => {
    const rruModel = buildCustomEquipmentModel(eq.item);
    rruModel.userData.name = `${eq.label} (Alt Kot)`;
    rruModel.userData.interactive = true;
    rruModel.rotation.set(0, Math.PI / 2, Math.PI);
    rruModel.position.set(eq.posX, 0.75, 0);

    const bracketGeo = new THREE.BoxGeometry(0.08, 0.10, 0.08);
    const bracketMesh = new THREE.Mesh(bracketGeo, clampMat);
    bracketMesh.position.set(eq.posX, 0.75, -0.22);
    blockGroup.add(bracketMesh);
    blockGroup.add(rruModel);
  });

  const upperPipePositionsX = [pipePositionsX[0], pipePositionsX[1], pipePositionsX[2]];
  upperPipePositionsX.forEach((posX, idx) => {
    const rruModel = buildCustomEquipmentModel(vodaItem);
    rruModel.userData.name = `Vodafone RRU5526t (Üst Kot ${idx + 1})`;
    rruModel.userData.interactive = true;
    rruModel.rotation.set(0, Math.PI / 2, Math.PI);
    rruModel.position.set(posX, 1.50, 0);

    const bracketGeo = new THREE.BoxGeometry(0.08, 0.10, 0.08);
    const bracketMesh = new THREE.Mesh(bracketGeo, clampMat);
    bracketMesh.position.set(posX, 1.50, -0.22);
    blockGroup.add(bracketMesh);
    blockGroup.add(rruModel);
  });

  return blockGroup;
}

function spawnAlan2KarmaRRUBlok() {
  const blockGroup = buildAlan2KarmaRRUBlok(state.currentArea);
  blockGroup.userData.id = state.nextId++;
  setupPlatformTransform(blockGroup, 0, -2.0, false);
  blockGroup.position.y = 0.0;
  addPlatformToActiveArea(blockGroup);
}

function buildAlan1OzelKarmaBlok(targetArea = state.currentArea) {
  const blockGroup = new THREE.Group();
  blockGroup.userData = {
    type: 'rru',
    blockType: 'alan1-ozel-karma-blok',
    category: 'Karma',
    name: `Alan 1 Özel Karma Blok (4 Bileşenli)`,
    width: 3.5,
    height: 2.40,
    depth: 1.50,
    weight: 500,
    interactive: true,
    locked: false,
    lockedX: false,
    lockedY: false,
    lockedZ: false,
    allowPassThrough: true
  };

  const sub1 = buildAlan2KarmaRRUBlok(targetArea);
  sub1.position.set(-0.6341711880666415, 0, 0);
  sub1.rotation.set(0, 4.71238898038469, 0);
  blockGroup.add(sub1);

  const sub2 = build20UPoiRackBlok('alan1', 5);
  sub2.position.set(-1.562669426291808, 0, 0.2056258998127368);
  sub2.rotation.set(0, 1.5707963267948966, 0);
  blockGroup.add(sub2);

  const sub3 = build20UPoiRackBlok('alan1', 5);
  sub3.position.set(-1.5672568213661364, 0, -0.2750603122918533);
  sub3.rotation.set(0, 7.853981633974483, 0);
  blockGroup.add(sub3);

  const sub4 = buildRRUSahaBlok120Model(targetArea);
  sub4.position.set(0.5874848490612461, 0, 0);
  sub4.rotation.set(0, 0, 0);
  blockGroup.add(sub4);

  return blockGroup;
}

function spawnAlan1OzelKarmaBlok() {
  const blockGroup = buildAlan1OzelKarmaBlok(state.currentArea);
  blockGroup.userData.id = state.nextId++;
  setupPlatformTransform(blockGroup, 0, -2.0, false);
  blockGroup.position.y = 0.0;
  addPlatformToActiveArea(blockGroup);
}

function buildAlan1Karma13RRUBlok(targetArea = state.currentArea) {
  let areaSuffix = ' (Alan 1)';
  const isRotatedArea = (targetArea === 'alan2' || targetArea === 'alan3');
  
  const blockGroup = new THREE.Group();
  blockGroup.userData = {
    type: 'rru',
    blockType: 'alan1-13rru-karma-blok',
    category: 'Karma',
    name: `Alan 1 Sırt Sırta Karma RRU Blok (13 RRU: 4 TCell + 4 TT + 5 Voda)${areaSuffix}`,
    width: 0.80,
    height: 2.40,
    depth: 0.70,
    weight: 380,
    interactive: true,
    locked: false,
    lockedX: isRotatedArea ? true : false,
    lockedY: false,
    lockedZ: isRotatedArea ? false : true,
    allowPassThrough: true
  };

  const pipeMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.2 });
  const clampMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.1 });

  const pipePositionsX = [-0.24, -0.08, 0.08, 0.24];
  const pipeHeight = 1.50;

  pipePositionsX.forEach((posX) => {
    const vPipeGeo = new THREE.CylinderGeometry(0.025, 0.025, pipeHeight, 16);
    const vPipe = new THREE.Mesh(vPipeGeo, pipeMat);
    vPipe.position.set(posX, 0.75, -0.26);
    blockGroup.add(vPipe);

    const flangeGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16);
    const botFlange = new THREE.Mesh(flangeGeo, clampMat);
    botFlange.position.set(posX, 0.01, -0.26);
    blockGroup.add(botFlange);

    const topFlange = new THREE.Mesh(flangeGeo, clampMat);
    topFlange.position.set(posX, 1.49, -0.26);
    blockGroup.add(topFlange);
  });

  const levelsY = [1.50, 0.75];
  levelsY.forEach((levelY) => {
    const hPipeGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.65, 16);
    hPipeGeo.rotateZ(Math.PI / 2);
    const hPipe = new THREE.Mesh(hPipeGeo, pipeMat);
    hPipe.position.set(0, levelY, -0.26);
    blockGroup.add(hPipe);
  });

  // --- ÖN YÜZ (FRONT FACE): 7 RRU (4 Alt Kot + 3 Üst Kot) ---
  // Operatör Dağılımı: 2 Turkcell + 2 Türk Telekom (Alt Kot), 3 Vodafone (Üst Kot)
  const tcell1 = EQUIPMENT_CATALOG.find(item => item.id === 'tcell-5301') || { id: 'tcell-5301', category: 'Turkcell', name: 'RRU 5301', width: 0.400, height: 0.480, depth: 0.140, weight: 25, color: '#1d4ed8' };
  const tcell2 = EQUIPMENT_CATALOG.find(item => item.id === 'tcell-5502') || { id: 'tcell-5502', category: 'Turkcell', name: 'RRU 5502', width: 0.400, height: 0.480, depth: 0.140, weight: 25, color: '#1d4ed8' };
  const tt1 = EQUIPMENT_CATALOG.find(item => item.id === 'tt-5527') || { id: 'tt-5527', category: 'Türk Telekom', name: '2G-3G-4G RRU5527', width: 0.356, height: 0.480, depth: 0.140, weight: 25, color: '#0891b2' };
  const tt2 = EQUIPMENT_CATALOG.find(item => item.id === 'tt-5818w') || { id: 'tt-5818w', category: 'Türk Telekom', name: 'NR RRU 5818W', width: 0.356, height: 0.480, depth: 0.140, weight: 25, color: '#0891b2' };
  const vodaItem = EQUIPMENT_CATALOG.find(item => item.id === 'vodafone-5526t') || { id: 'vodafone-5526t', category: 'Vodafone', name: 'RRU5526t', width: 0.432, height: 0.480, depth: 0.135, weight: 28, color: '#dc2626' };

  const frontLowerEquipments = [
    { item: tcell1, label: 'Turkcell RRU 5301', posX: pipePositionsX[0] },
    { item: tcell2, label: 'Turkcell RRU 5502', posX: pipePositionsX[1] },
    { item: tt1, label: 'Türk Telekom RRU5527 (#1)', posX: pipePositionsX[2] },
    { item: tt2, label: 'Türk Telekom NR RRU5818W (#1)', posX: pipePositionsX[3] }
  ];

  frontLowerEquipments.forEach(eq => {
    const rruModel = buildCustomEquipmentModel(eq.item);
    rruModel.userData.name = `${eq.label} (Ön Alt Kot)`;
    rruModel.userData.interactive = true;
    rruModel.rotation.set(0, Math.PI / 2, Math.PI);
    rruModel.position.set(eq.posX, 0.75, 0);

    const bracketGeo = new THREE.BoxGeometry(0.08, 0.10, 0.08);
    const bracketMesh = new THREE.Mesh(bracketGeo, clampMat);
    bracketMesh.position.set(eq.posX, 0.75, -0.22);
    blockGroup.add(bracketMesh);
    blockGroup.add(rruModel);
  });

  const frontUpperPipePositionsX = [pipePositionsX[0], pipePositionsX[1], pipePositionsX[2]];
  frontUpperPipePositionsX.forEach((posX, idx) => {
    const rruModel = buildCustomEquipmentModel(vodaItem);
    rruModel.userData.name = `Vodafone RRU5526t (#${idx + 1}) (Ön Üst Kot)`;
    rruModel.userData.interactive = true;
    rruModel.rotation.set(0, Math.PI / 2, Math.PI);
    rruModel.position.set(posX, 1.50, 0);

    const bracketGeo = new THREE.BoxGeometry(0.08, 0.10, 0.08);
    const bracketMesh = new THREE.Mesh(bracketGeo, clampMat);
    bracketMesh.position.set(posX, 1.50, -0.22);
    blockGroup.add(bracketMesh);
    blockGroup.add(rruModel);
  });

  // --- ARKA YÜZ (REAR FACE - SIRT SIRTA): 6 RRU (3 Alt Kot + 3 Üst Kot) ---
  // Operatör Dağılımı: 2 Turkcell + 1 Türk Telekom (Alt Kot), 1 Türk Telekom + 2 Vodafone (Üst Kot)
  // GENEL TOPLAM: 4 Turkcell + 4 Türk Telekom + 5 Vodafone = 13 RRU!
  const tcell4485 = EQUIPMENT_CATALOG.find(item => item.id === 'turkcell-4485') || { id: 'turkcell-4485', category: 'Turkcell', name: 'LTE RRU4485 - 4G', width: 0.398, height: 0.533, depth: 0.145, weight: 25, color: '#1d4ed8' };
  const tcell2219 = EQUIPMENT_CATALOG.find(item => item.id === 'turkcell-2219') || { id: 'turkcell-2219', category: 'Turkcell', name: 'GSM 2219 B8', width: 0.343, height: 0.466, depth: 0.154, weight: 20, color: '#1d4ed8' };
  const tt1_rear = EQUIPMENT_CATALOG.find(item => item.id === 'tt-5527') || { id: 'tt-5527', category: 'Türk Telekom', name: '2G-3G-4G RRU5527', width: 0.356, height: 0.480, depth: 0.140, weight: 25, color: '#0891b2' };
  const tt2_rear = EQUIPMENT_CATALOG.find(item => item.id === 'tt-5818w') || { id: 'tt-5818w', category: 'Türk Telekom', name: 'NR RRU 5818W', width: 0.356, height: 0.480, depth: 0.140, weight: 25, color: '#0891b2' };
  const voda5818w = EQUIPMENT_CATALOG.find(item => item.id === 'vodafone-5818w') || { id: 'vodafone-5818w', category: 'Vodafone', name: 'RRU5818w', width: 0.356, height: 0.480, depth: 0.140, weight: 25, color: '#dc2626' };
  const voda5526et = EQUIPMENT_CATALOG.find(item => item.id === 'vodafone-5526et') || { id: 'vodafone-5526et', category: 'Vodafone', name: 'RRU5526et', width: 0.356, height: 0.480, depth: 0.125, weight: 22, color: '#dc2626' };

  // Arka Alt Kot: 2 Turkcell (Mavi) + 2 Türk Telekom (Camgöbeği) - Ön Alt Kot ile tam simetrik
  const rearLowerEquipments = [
    { item: { ...tcell4485, color: '#1d4ed8' }, label: 'Turkcell LTE RRU4485', posX: pipePositionsX[0] },
    { item: { ...tcell2219, color: '#1d4ed8' }, label: 'Turkcell GSM 2219 B8', posX: pipePositionsX[1] },
    { item: tt1_rear, label: 'Türk Telekom RRU5527 (#2)', posX: pipePositionsX[2] },
    { item: tt2_rear, label: 'Türk Telekom NR RRU5818W (#2)', posX: pipePositionsX[3] }
  ];

  rearLowerEquipments.forEach(eq => {
    const rruModel = buildCustomEquipmentModel(eq.item);
    rruModel.userData.name = `${eq.label} (Arka Alt Kot - Sırt Sırta)`;
    rruModel.userData.interactive = true;
    rruModel.rotation.set(0, -Math.PI / 2, Math.PI);
    rruModel.position.set(eq.posX, 0.75, -0.52);

    const bracketGeo = new THREE.BoxGeometry(0.08, 0.10, 0.08);
    const bracketMesh = new THREE.Mesh(bracketGeo, clampMat);
    bracketMesh.position.set(eq.posX, 0.75, -0.30);
    blockGroup.add(bracketMesh);
    blockGroup.add(rruModel);
  });

  // Arka Üst Kot: 2 Vodafone (Kırmızı) - Ön Üst Kot ile aynı operatör ve renk
  const rearUpperEquipments = [
    { item: voda5818w, label: 'Vodafone NR RRU5818w (#4)', posX: pipePositionsX[0] },
    { item: voda5526et, label: 'Vodafone RRU5526et (#5)', posX: pipePositionsX[1] }
  ];

  rearUpperEquipments.forEach(eq => {
    const rruModel = buildCustomEquipmentModel(eq.item);
    rruModel.userData.name = `${eq.label} (Arka Üst Kot - Sırt Sırta)`;
    rruModel.userData.interactive = true;
    rruModel.rotation.set(0, -Math.PI / 2, Math.PI);
    rruModel.position.set(eq.posX, 1.50, -0.52);

    const bracketGeo = new THREE.BoxGeometry(0.08, 0.10, 0.08);
    const bracketMesh = new THREE.Mesh(bracketGeo, clampMat);
    bracketMesh.position.set(eq.posX, 1.50, -0.30);
    blockGroup.add(bracketMesh);
    blockGroup.add(rruModel);
  });

  return blockGroup;
}

function buildAlan1OzelKarma13RRUBlok(targetArea = state.currentArea) {
  const blockGroup = new THREE.Group();
  blockGroup.userData = {
    type: 'rru',
    blockType: 'alan1-13rru-ozel-karma-blok',
    category: 'Karma',
    name: `Alan 1 Özel Karma Blok (13 RRU Sırt Sırta + 10 POI)`,
    width: 3.5,
    height: 2.40,
    depth: 1.50,
    weight: 690,
    interactive: true,
    locked: false,
    lockedX: false,
    lockedY: false,
    lockedZ: false,
    allowPassThrough: true
  };

  const sub1 = buildAlan1Karma13RRUBlok(targetArea);
  sub1.position.set(-0.6341711880666415, 0, 0);
  sub1.rotation.set(0, 4.71238898038469, 0);
  blockGroup.add(sub1);

  const sub2 = build20UPoiRackBlok('alan1', 5);
  sub2.position.set(-1.562669426291808, 0, 0.2056258998127368);
  sub2.rotation.set(0, 1.5707963267948966, 0);
  blockGroup.add(sub2);

  const sub3 = build20UPoiRackBlok('alan1', 5);
  sub3.position.set(-1.5672568213661364, 0, -0.2750603122918533);
  sub3.rotation.set(0, 7.853981633974483, 0);
  blockGroup.add(sub3);

  const sub4 = buildRRUSahaBlok120Model(targetArea);
  sub4.position.set(0.5874848490612461, 0, 0);
  sub4.rotation.set(0, 0, 0);
  blockGroup.add(sub4);

  return blockGroup;
}

function spawnAlan1OzelKarma13RRUBlok() {
  const blockGroup = buildAlan1OzelKarma13RRUBlok(state.currentArea);
  blockGroup.userData.id = state.nextId++;
  setupPlatformTransform(blockGroup, 0, -2.0, false);
  blockGroup.position.y = 0.0;
  addPlatformToActiveArea(blockGroup);
}

// 140cm Genişletilmiş Platform (Kedi yolundan uzak olan tarafa doğru 20cm büyütülmüş)
// 140cm Genişletilmiş Platform (Kedi yolundan uzak olan tarafa (-Z) doğru büyütülmüş, ön kenar kedi yoluyla sabit)
function buildRRUSahaBlok140Model(targetArea = state.currentArea) {
  const isAlan1 = targetArea === 'alan1';
  let areaTitle = 'RRU Saha Blok 140cm (Alan 1)';
  const blockGroup = new THREE.Group();
  blockGroup.userData = {
    type: 'platform',
    blockType: 'rru-saha-blok-140',
    name: areaTitle,
    width: 3.4,
    depth: 1.46,
    height: 2.2,
    interactive: true
  };

  const ringMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.2, roughness: 0.4 });
  const tableMat = new THREE.MeshStandardMaterial({ 
    color: 0xffffff, 
    roughness: 0.4, 
    metalness: 0.3, 
    transparent: true, 
    opacity: 0.95 
  });
  const borderMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.5, roughness: 0.3 });

  // 4 I-Kiriş profili (Z ekseninde 1.50m boyunda, ön kenar kedi yolunda sabit +0.5855m, genişleme tamamen kedi yolunun aksine (-Z) -0.9145m kotuna)
  const beamPositionsX = [-0.10, -0.90, -1.70, -2.50];
  const beamLength = 1.50;
  const beamZ = -0.1645;

  beamPositionsX.forEach((posX) => {
    const kGroup = new THREE.Group();
    // Ana silindiri saran semer çemberi
    const ringGeo = new THREE.CylinderGeometry(0.2345, 0.2345, 0.12, 32, 1, false);
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.z = Math.PI / 2;
    ring.position.set(0, -0.7, 0);
    kGroup.add(ring);

    // Semer bacakları ve flanşları
    const legGeo = new THREE.BoxGeometry(0.08, 0.45, 0.08);
    const plateMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.3 });
    const legLeft = new THREE.Mesh(legGeo, plateMat);
    legLeft.position.set(0, -0.45, 0.18);
    kGroup.add(legLeft);
    const legRight = new THREE.Mesh(legGeo, plateMat);
    legRight.position.set(0, -0.45, -0.18);
    kGroup.add(legRight);

    // I-Kiriş profil gövdesi
    const ibeam = createIBeam(beamLength, 0.20, 0.20, 0.01, ringMat);
    ibeam.position.set(0, -0.3655, beamZ);
    kGroup.add(ibeam);

    kGroup.position.set(posX, 0.2465, 0);
    kGroup.userData.interactive = false;
    blockGroup.add(kGroup);
  });

  // Platform Izgara Tablaları (Net derinlik: 1.46m, kedi yolunun aksine genişletilmiş)
  const tableCentersX = [-0.50, -1.30, -2.10];
  tableCentersX.forEach(tx => {
    const tGroup = new THREE.Group();
    const plateGeo = new THREE.BoxGeometry(0.80, 0.02, 1.46);
    const plate = new THREE.Mesh(plateGeo, tableMat);
    plate.position.set(0, 0, beamZ);
    tGroup.add(plate);

    const bLeftGeo = new THREE.BoxGeometry(0.02, 0.04, 1.46);
    const bLeft = new THREE.Mesh(bLeftGeo, borderMat);
    bLeft.position.set(-0.40, 0, beamZ);
    tGroup.add(bLeft);

    const bRight = bLeft.clone();
    bRight.position.set(0.40, 0, beamZ);
    tGroup.add(bRight);

    tGroup.position.set(tx, -0.0090, 0);
    tGroup.userData.interactive = false;
    blockGroup.add(tGroup);
  });

  // Korkuluklar: Ön kenar (kedi yolu tarafı) sabit frontZ = +0.5655m, arka kenar (kedi yolunun aksi) backZ = -0.8945m
  const railingGroup = new THREE.Group();
  railingGroup.name = "railing";
  const railColor = 0xfdb913;
  const railMat = new THREE.MeshStandardMaterial({ color: railColor, metalness: 0.5, roughness: 0.3 });
  const postHeight = 1.2;
  const postRadius = 0.02;
  const postGeo = new THREE.CylinderGeometry(postRadius, postRadius, postHeight, 16);
  const tableSurfaceY = 0.0010;

  const backZ = -0.8945;
  const frontZ = 0.5655;
  const sideLength = 1.46;
  const sideZCenter = -0.1645;

  const postPositions = [
    // Arka uzun kenar (kedi yolunun aksi, z = -0.8945)
    { x: -0.02, z: backZ },
    { x: -0.67, z: backZ },
    { x: -1.30, z: backZ },
    { x: -1.93, z: backZ },
    { x: -2.58, z: backZ },
    // Ön uzun kenar (kedi yolu tarafı, z = 0.5655)
    { x: -0.02, z: frontZ },
    { x: -0.67, z: frontZ },
    { x: -1.30, z: frontZ },
    { x: -1.93, z: frontZ },
    { x: -2.58, z: frontZ },
    // Yan kısa kenarlar
    { x: -0.02, z: sideZCenter },
    { x: -2.58, z: sideZCenter }
  ];

  const railsConfig = [
    { type: 'alongX', z: backZ, xCenter: -1.30, length: 2.56 },
    { type: 'alongX', z: frontZ, xCenter: -1.30, length: 2.56 },
    { type: 'alongZ', x: -0.02, zCenter: sideZCenter, length: sideLength },
    { type: 'alongZ', x: -2.58, zCenter: sideZCenter, length: sideLength }
  ];

  postPositions.forEach(pos => {
    const post = new THREE.Mesh(postGeo, railMat);
    post.position.set(pos.x, tableSurfaceY + postHeight / 2, pos.z);
    post.castShadow = true;
    railingGroup.add(post);
  });

  const railRadius = 0.015;
  const railHeights = [0.4, 0.8, 1.2];
  railHeights.forEach(h => {
    const yPos = tableSurfaceY + h;
    railsConfig.forEach(rc => {
      const railGeo = new THREE.CylinderGeometry(railRadius, railRadius, rc.length, 16);
      const rail = new THREE.Mesh(railGeo, railMat);
      if (rc.type === 'alongX') {
        rail.rotation.z = Math.PI / 2;
        rail.position.set(rc.xCenter, yPos, rc.z);
      } else {
        rail.rotation.x = Math.PI / 2;
        rail.position.set(rc.x, yPos, rc.zCenter);
      }
      rail.castShadow = true;
      railingGroup.add(rail);
    });
  });

  blockGroup.add(railingGroup);
  return blockGroup;
}

// Taşıyıcı Kiriş Üzerinde Yan Yana 7 Flanşlı Pol ve Tek Cephe 13 RRU Şasesi
function buildAlan1Karma7Boru13RRUBlok(targetArea = state.currentArea) {
  const blockGroup = new THREE.Group();
  blockGroup.userData = {
    type: 'rru',
    blockType: 'alan1-7boru-13rru-blok',
    category: 'Karma',
    name: 'Alan 1 7 Borulu Tek Cephe Karma RRU Blok (13 RRU)',
    width: 0.80,
    height: 1.95,
    depth: 1.46,
    weight: 420,
    interactive: true,
    locked: false,
    lockedX: false,
    lockedY: false,
    lockedZ: false,
    allowPassThrough: true
  };

  // Galvaniz platform grisi boru materyali
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.5, roughness: 0.35 });
  const clampMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.1 });
  const flangeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.2, roughness: 0.4 });
  const boltHeadMat = new THREE.MeshStandardMaterial({ color: 0x718096, metalness: 0.9, roughness: 0.1 });

  // Kedi yolunun aksine (-Z) kaydırılmış dikey pol pozisyonları (centerZ = -0.25m):
  const centerZ = -0.25;
  const pipePositionsZ = [];
  for (let i = -3; i <= 3; i++) {
    pipePositionsZ.push(centerZ + i * 0.18);
  }
  const pipeHeight = 1.85;

  pipePositionsZ.forEach(posZ => {
    // Yükseltme gövdesi ve flanş plakası
    const postGeo = new THREE.BoxGeometry(0.08, 0.10, 0.08);
    const post = new THREE.Mesh(postGeo, flangeMat);
    post.position.set(0, -0.05, posZ);
    blockGroup.add(post);

    const flangePlateGeo = new THREE.BoxGeometry(0.16, 0.015, 0.16);
    const flangePlate = new THREE.Mesh(flangePlateGeo, flangeMat);
    flangePlate.position.set(0, 0.0075, posZ);
    blockGroup.add(flangePlate);

    // 4 adet montaj cıvatası
    const boltHeadGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.015, 6);
    [-0.06, 0.06].forEach(dx => {
      [-0.06, 0.06].forEach(dz => {
        const bolt = new THREE.Mesh(boltHeadGeo, boltHeadMat);
        bolt.position.set(dx, 0.02, posZ + dz);
        blockGroup.add(bolt);
      });
    });

    // Dikey Taşıyıcı Boru (Ø 50mm, Kısaltılmış Boy: 1.85m, Galvaniz Gri)
    const vPipeGeo = new THREE.CylinderGeometry(0.025, 0.025, pipeHeight, 16);
    const vPipe = new THREE.Mesh(vPipeGeo, pipeMat);
    vPipe.position.set(0, pipeHeight / 2, posZ);
    blockGroup.add(vPipe);
  });

  // Yatay Bağlantı ve Rijitlik Boruları (Z ekseni boyunca tüm 7 polü bağlayan kuşaklar)
  const tieLength = 1.08 + 0.10;
  [0.75, 1.45].forEach(levelY => {
    const hPipeGeo = new THREE.CylinderGeometry(0.02, 0.02, tieLength, 16);
    hPipeGeo.rotateX(Math.PI / 2);
    const hPipe = new THREE.Mesh(hPipeGeo, pipeMat);
    hPipe.position.set(0, levelY, centerZ);
    blockGroup.add(hPipe);
  });

  // Ekipman Katalog Tanımları
  const tcell1 = EQUIPMENT_CATALOG.find(item => item.id === 'tcell-5301') || { id: 'tcell-5301', category: 'Turkcell', name: 'RRU 5301', width: 0.400, height: 0.480, depth: 0.140, weight: 25, color: '#1d4ed8' };
  const tcell2 = EQUIPMENT_CATALOG.find(item => item.id === 'tcell-5502') || { id: 'tcell-5502', category: 'Turkcell', name: 'RRU 5502', width: 0.400, height: 0.480, depth: 0.140, weight: 25, color: '#1d4ed8' };
  const tcell4485 = EQUIPMENT_CATALOG.find(item => item.id === 'turkcell-4485') || { id: 'turkcell-4485', category: 'Turkcell', name: 'LTE RRU4485 - 4G', width: 0.398, height: 0.533, depth: 0.145, weight: 25, color: '#1d4ed8' };
  const tcell2219 = EQUIPMENT_CATALOG.find(item => item.id === 'turkcell-2219') || { id: 'turkcell-2219', category: 'Turkcell', name: 'GSM 2219 B8', width: 0.343, height: 0.466, depth: 0.154, weight: 20, color: '#1d4ed8' };

  const tt1 = EQUIPMENT_CATALOG.find(item => item.id === 'tt-5527') || { id: 'tt-5527', category: 'Türk Telekom', name: '2G-3G-4G RRU5527', width: 0.356, height: 0.480, depth: 0.140, weight: 25, color: '#0891b2' };
  const tt2 = EQUIPMENT_CATALOG.find(item => item.id === 'tt-5818w') || { id: 'tt-5818w', category: 'Türk Telekom', name: 'NR RRU 5818W', width: 0.356, height: 0.480, depth: 0.140, weight: 25, color: '#0891b2' };

  const voda5526t = EQUIPMENT_CATALOG.find(item => item.id === 'vodafone-5526t') || { id: 'vodafone-5526t', category: 'Vodafone', name: 'RRU5526t', width: 0.432, height: 0.480, depth: 0.135, weight: 28, color: '#dc2626' };
  const voda5818w = EQUIPMENT_CATALOG.find(item => item.id === 'vodafone-5818w') || { id: 'vodafone-5818w', category: 'Vodafone', name: 'RRU5818w', width: 0.356, height: 0.480, depth: 0.140, weight: 25, color: '#dc2626' };
  const voda5526et = EQUIPMENT_CATALOG.find(item => item.id === 'vodafone-5526et') || { id: 'vodafone-5526et', category: 'Vodafone', name: 'RRU5526et', width: 0.356, height: 0.480, depth: 0.125, weight: 22, color: '#dc2626' };

  // TEK CEPHE MONTAJ (Tüm RRU'lar platform içine / sağ tarafa (+X) doğru uzanır; Z ekseninde ince kenarlarıyla (14cm) çakışmasız monte edilir):
  // 1. Alt Kot (+0.75m): 7 RRU (4 Turkcell Mavi + 3 Türk Telekom Camgöbeği)
  const lowerConfigs = [
    { item: { ...tcell1, color: '#1d4ed8' }, label: 'Turkcell RRU 5301', posZ: pipePositionsZ[0] },
    { item: { ...tcell2, color: '#1d4ed8' }, label: 'Turkcell RRU 5502', posZ: pipePositionsZ[1] },
    { item: { ...tcell4485, color: '#1d4ed8' }, label: 'Turkcell LTE RRU4485', posZ: pipePositionsZ[2] },
    { item: { ...tcell2219, color: '#1d4ed8' }, label: 'Turkcell GSM 2219 B8', posZ: pipePositionsZ[3] },
    { item: tt1, label: 'Türk Telekom RRU5527 (#1)', posZ: pipePositionsZ[4] },
    { item: tt2, label: 'Türk Telekom NR RRU5818W (#1)', posZ: pipePositionsZ[5] },
    { item: tt1, label: 'Türk Telekom RRU5527 (#2)', posZ: pipePositionsZ[6] }
  ];

  lowerConfigs.forEach(cfg => {
    const rruModel = buildCustomEquipmentModel(cfg.item);
    rruModel.userData.name = `${cfg.label} (Alt Kot)`;
    rruModel.userData.interactive = true;
    rruModel.rotation.set(0, 0, 0);
    const posX = (cfg.item.width || 0.40) / 2 + 0.08;
    rruModel.position.set(posX, 0.75, cfg.posZ);
    if (rruModel.children[3]) {
      rruModel.children[3].rotation.z = 0;
    }

    const collarGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.08, 16);
    const collarMesh = new THREE.Mesh(collarGeo, clampMat);
    collarMesh.position.set(0, 0.75, cfg.posZ);
    blockGroup.add(collarMesh);
    blockGroup.add(rruModel);
  });

  // 2. Üst Kot (+1.45m): 6 RRU (5 Vodafone Kırmızı + 1 Türk Telekom Camgöbeği)
  const upperConfigs = [
    { item: voda5526t, label: 'Vodafone RRU5526t (#1)', posZ: pipePositionsZ[0] },
    { item: voda5526t, label: 'Vodafone RRU5526t (#2)', posZ: pipePositionsZ[1] },
    { item: voda5526t, label: 'Vodafone RRU5526t (#3)', posZ: pipePositionsZ[2] },
    { item: voda5818w, label: 'Vodafone NR RRU5818w (#4)', posZ: pipePositionsZ[3] },
    { item: voda5526et, label: 'Vodafone RRU5526et (#5)', posZ: pipePositionsZ[4] },
    { item: tt2, label: 'Türk Telekom NR RRU5818W (#2)', posZ: pipePositionsZ[5] }
  ];

  upperConfigs.forEach(cfg => {
    const rruModel = buildCustomEquipmentModel(cfg.item);
    rruModel.userData.name = `${cfg.label} (Üst Kot)`;
    rruModel.userData.interactive = true;
    rruModel.rotation.set(0, 0, 0);
    const posX = (cfg.item.width || 0.40) / 2 + 0.08;
    rruModel.position.set(posX, 1.45, cfg.posZ);
    if (rruModel.children[3]) {
      rruModel.children[3].rotation.z = 0;
    }

    const collarGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.08, 16);
    const collarMesh = new THREE.Mesh(collarGeo, clampMat);
    collarMesh.position.set(0, 1.45, cfg.posZ);
    blockGroup.add(collarMesh);
    blockGroup.add(rruModel);
  });

  return blockGroup;
}

// Kompleks Blok: 7 Borulu Tek Cephe 13 RRU + 10 POI + 140cm Platform (Alan 1)
function buildAlan1OzelKarma7Boru13RRUBlok(targetArea = state.currentArea) {
  const blockGroup = new THREE.Group();
  blockGroup.userData = {
    type: 'rru',
    blockType: 'alan1-7boru-ozel-karma-blok',
    category: 'Karma',
    name: 'Özel Alan 1 Kompleksi (7 Borulu Tek Cephe 13 RRU + 10 POI, 140cm)',
    width: 3.5,
    height: 2.40,
    depth: 1.46,
    weight: 730,
    interactive: true,
    locked: false,
    lockedX: false,
    lockedY: false,
    lockedZ: false,
    allowPassThrough: true
  };

  // 1. 7 Borulu Tek Cephe 13 RRU Şasesi - En soldaki taşıyıcı kiriş (Kiriş 4: x = -2.50) üzerine monte
  // sub4 x = 0.5874848 olduğundan, world x = 0.5874848490612461 - 2.50 = -1.9125151509387539
  const sub1 = buildAlan1Karma7Boru13RRUBlok(targetArea);
  sub1.position.set(-1.9125151509387539, 0, 0);
  sub1.rotation.set(0, 0, 0);
  blockGroup.add(sub1);

  // 2. 5-POI Rack 1 (36U) - RRU'lara en uzak 2 kirişe (Kiriş 2: x = -0.3125m ve Kiriş 1: x = +0.4875m) yük binecek şekilde, portları RRU'lara bakacak (-X) biçimde yerleşim:
  const sub2 = build20UPoiRackBlok('alan1', 5);
  sub2.position.set(0.0874848490612461, 0, -0.55);
  sub2.rotation.set(0, -Math.PI / 2, 0);
  blockGroup.add(sub2);

  // 3. 5-POI Rack 2 (36U) - RRU'lara en uzak 2 kiriş üzerine, Rack 1 ile yan yana ve portları RRU'lara bakacak (-X) biçimde:
  const sub3 = build20UPoiRackBlok('alan1', 5);
  sub3.position.set(0.0874848490612461, 0, 0.05);
  sub3.rotation.set(0, -Math.PI / 2, 0);
  blockGroup.add(sub3);

  // 4. Genişletilmiş Platform (Ön kenar kedi yoluyla sıfır, arka kenar -Z'ye genişletilmiş)
  const sub4 = buildRRUSahaBlok140Model(targetArea);
  sub4.position.set(0.5874848490612461, 0, 0);
  sub4.rotation.set(0, 0, 0);
  blockGroup.add(sub4);

  return blockGroup;
}

function spawnAlan1OzelKarma7Boru13RRUBlok() {
  const blockGroup = buildAlan1OzelKarma7Boru13RRUBlok(state.currentArea);
  blockGroup.userData.id = state.nextId++;
  setupPlatformTransform(blockGroup, 0, -2.0, false);
  blockGroup.position.y = 0.0;
  addPlatformToActiveArea(blockGroup);
}

function buildAlan4OzelKarmaBlok(targetArea = state.currentArea) {
  const blockGroup = new THREE.Group();
  blockGroup.userData = {
    type: 'platform',
    blockType: 'alan4-ozel-karma-blok',
    category: 'Karma',
    name: 'Özel Alan 4 Kompleksi (Platform + POI + RRU)',
    width: 1.20,
    depth: 2.60,
    height: 2.40,
    weight: 750,
    interactive: true,
    locked: false,
    lockedX: false,
    lockedY: true,
    lockedZ: true,
    allowPassThrough: true
  };

  // 1. Çemberli H-Beam Platform & Flanşlı Borulu Tabla Bloğu (Alan 4)
  const subPlatform = buildAlan4CemberPlatformBlok();
  subPlatform.userData.interactive = false;
  subPlatform.position.set(0, 0, 0);
  subPlatform.rotation.set(0, 0, 0);
  blockGroup.add(subPlatform);

  // 2. 42U POI Rack Blok (6x POI Dolu) - Ters yöne (Math.PI) dönük
  const subPoi = build42UPoiRackBlok(targetArea);
  subPoi.userData.interactive = false;
  subPoi.position.set(0, 0, 0.2739927960368558);
  subPoi.rotation.set(0, 3.141592653589793, 0);
  blockGroup.add(subPoi);

  // 3. Alan 2 Karma RRU Blok (4 Borulu - 7 RRU)
  const subKarma = buildAlan2KarmaRRUBlok(targetArea);
  subKarma.userData.interactive = false;
  subKarma.position.set(0, 0, -1.3484016108318484);
  subKarma.rotation.set(0, 0, 0);
  blockGroup.add(subKarma);

  return blockGroup;
}


function buildAlan2OzelKarmaPlatformBlok() {
  const group = new THREE.Group();
  group.userData = {
    type: 'platform',
    blockType: 'alan2-ozel-karma-platform-blok',
    category: 'Platform',
    name: 'Korkuluksuz Tabla Bloğu (Alan 2)',
    width: 1.20,
    depth: 2.00,
    height: 0.05,
    weight: 200,
    interactive: true,
    lockedX: false,
    lockedY: false,
    lockedZ: false,
    allowPassThrough: true
  };

  const tableMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.3, transparent: true, opacity: 0.95 });
  const borderMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.5, roughness: 0.3 });
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  const boltHeadMat = new THREE.MeshStandardMaterial({ color: 0x718096, metalness: 0.9, roughness: 0.1 });
  
  const frontZ = -1.0;
  const rearZ   =  1.0;
  const leftX   = -0.60;
  const rightX  =  0.60;
  const platWidth  = 1.20;   
  const platLength = 2.00;   
  const tableY = 0.02;       

  // Sadece 2 tabla (1m x 1.2m)
  const t1Length = 1.0; const t1CenterZ = -0.50;
  const t1Mesh = new THREE.Mesh(new THREE.BoxGeometry(platWidth, 0.02, t1Length), tableMat);
  t1Mesh.position.set(0, tableY, t1CenterZ);
  group.add(t1Mesh);

  const t2Length = 1.0; const t2CenterZ = 0.50;
  const t2Mesh = new THREE.Mesh(new THREE.BoxGeometry(platWidth, 0.02, t2Length), tableMat);
  t2Mesh.position.set(0, tableY, t2CenterZ);
  group.add(t2Mesh);

  // Yan bordürler
  [-0.59, 0.59].forEach(xBorder => {
    const bSide1 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, t1Length), borderMat); bSide1.position.set(xBorder, tableY + 0.015, t1CenterZ); group.add(bSide1);
    const bSide2 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, t2Length), borderMat); bSide2.position.set(xBorder, tableY + 0.015, t2CenterZ); group.add(bSide2);
  });

  // Orta birleşim bordürü
  const seamBorder = new THREE.Mesh(new THREE.BoxGeometry(platWidth, 0.03, 0.02), borderMat);
  seamBorder.position.set(0, tableY + 0.015, 0.0);
  group.add(seamBorder);

  // Dış tekme levhaları (kickplates) - Opsiyonel olarak bırakılabilir zemin estetiği için ama korkuluksuz.
  const kpX = new THREE.BoxGeometry(platWidth, 0.10, 0.02);
  const kpZ = new THREE.BoxGeometry(0.02, 0.10, platLength);
  const kpFront = new THREE.Mesh(kpX, borderMat); kpFront.position.set(0, tableY + 0.04, frontZ); group.add(kpFront);
  const kpRear  = new THREE.Mesh(kpX, borderMat); kpRear.position.set(0, tableY + 0.04, rearZ); group.add(kpRear);
  const kpLeft  = new THREE.Mesh(kpZ, borderMat); kpLeft.position.set(leftX, tableY + 0.04, 0); group.add(kpLeft);
  const kpRight = new THREE.Mesh(kpZ, borderMat); kpRight.position.set(rightX, tableY + 0.04, 0); group.add(kpRight);

  // Korkuluk sistemi (postlar ve yatay borular) tamamen kaldırıldı.

  return group;
}

function buildAlan2OzelKarmaBlok(targetArea = state.currentArea) {
  const areaSuffix = targetArea === 'alan3' ? ' (Alan 3)' : (targetArea === 'alan2' ? ' (Alan 2)' : '');
  const blockGroup = new THREE.Group();
  blockGroup.userData = {
    type: 'rru',
    blockType: 'alan2-ozel-karma-blok',
    category: 'Karma',
    name: `Özel Alan 2 RRU Grubu (Beton Zemin Flanşlı, 7 RRU)${areaSuffix}`,
    width: 0.80,
    depth: 0.50,
    height: 1.65,
    weight: 215, // 190kg RRU donanımı + 25kg borular ve zemin sabitleme flanşları
    interactive: true,
    lockedX: false,
    lockedY: false,
    lockedZ: false,
    allowPassThrough: true,
    isFreestanding: true
  };

  // Kullanıcı İsteği:
  // "özel alan 2 kompleksindeki rru grubunu kullanacagız. Alttaki tablayı ve yanındakipoıleri kaldır bunları dogrudan beton zemine takacagım. O yüzden pollerin altına ufak bir flanş koy kı sabitleyeyim. Diger ölçülere dokunmana gerek yok"
  const subKarma = buildAlan2KarmaRRUBlok(targetArea);
  subKarma.userData.interactive = false;
  subKarma.position.set(0, 0, 0);
  blockGroup.add(subKarma);

  // 4 adet dikey borunun altına doğrudan beton zemine oturan 14x14x1.2 cm galvaniz flanş plakaları ve 4 dübel
  const flangePlateGeo = new THREE.BoxGeometry(0.14, 0.012, 0.14);
  const flangeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 });
  const boltHeadMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.1 });
  const boltGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.02, 6);

  [-0.24, -0.08, 0.08, 0.24].forEach(px => {
    const fMesh = new THREE.Mesh(flangePlateGeo, flangeMat);
    fMesh.position.set(px, 0.006, -0.26);
    fMesh.receiveShadow = true;
    blockGroup.add(fMesh);

    [[-0.05, -0.05], [0.05, -0.05], [-0.05, 0.05], [0.05, 0.05]].forEach(([bx, bz]) => {
      const bolt = new THREE.Mesh(boltGeo, boltHeadMat);
      bolt.position.set(px + bx, 0.015, -0.26 + bz);
      blockGroup.add(bolt);
    });
  });

  return blockGroup;
}

// =========================================================================
// 2'Lİ POI KÜÇÜK RACK BLOĞU (2x POI İÇEREN KOMPAKT RACK KABİNİ)
// Kullanıcı İsteği:
// - "2li 42u derken hatalı anlattım. 2 tane 42u degil aslında 2 tane poı içeren küçük bir rack yap demek istemiştim"
// Mimari:
// - Canovate 18U Kompakt İkili Çerçeve Açık Sistem Kabin (Genişlik: 60cm, Derinlik: 70cm, Yükseklik: 1.00m)
// - Kabin içine düzgünce monte edilmiş tam 2 adet Prose CB-12-POI-64F-A12 5G NR POI modülü
// - Taban beton montaj ankraj kulakları ve 4x M16 kimyasal dübel cıvataları
// - 19" montaj dikmeleri ve ön üst tanıtım plakası
// =========================================================================
function buildDual42UPoiRackBlok(targetArea = state.currentArea) {
  const areaSuffix = targetArea === 'alan3' ? ' (Alan 3)' : (targetArea === 'alan2' ? ' (Alan 2)' : '');

  const customConfig = {
    uCount: 18,
    height: 1.00,
    blockType: 'ikili-42u-poi-blok',
    name: `2'li POI Küçük Rack Bloğu (2x POI Dolu)${areaSuffix}`,
    modelNo: 'CSL-X-18YYA2',
    weight: 36
  };

  const rackGroup = build42UIkiliCerceveKabin(0xd4d8dd, true, customConfig);
  rackGroup.userData.blockType = 'ikili-42u-poi-blok';
  rackGroup.userData.name = `2'li POI Küçük Rack Bloğu (2x POI Dolu)${areaSuffix}`;
  rackGroup.userData.height = 1.00;
  rackGroup.userData.width = 0.60;
  rackGroup.userData.depth = 0.70;
  rackGroup.userData.weight = 80; // 36kg kabin + 2x 22kg POI = 80kg
  rackGroup.userData.lockedX = false;
  rackGroup.userData.lockedY = false;
  rackGroup.userData.lockedZ = false;
  rackGroup.userData.isFreestanding = true;

  const poiCatalogItem = EQUIPMENT_CATALOG.find(item => item.id === 'prose-a12') || {
    id: 'prose-a12', category: 'POI', name: 'CB-12-POI-64F-A12 (5G NR POI)', width: 0.400, height: 0.350, depth: 0.260, weight: 22, color: '#ea580c'
  };

  const baseH = 0.1125;
  const poiHeight = poiCatalogItem.height; // 0.35m

  // 2 Adet Prose POI Modülü
  [0, 1].forEach((poiIndex) => {
    const poiMesh = buildProsePoiModel(poiCatalogItem);
    poiMesh.userData.interactive = false;
    const yPos = baseH + 0.05 + poiIndex * (poiHeight + 0.08) + poiHeight / 2;
    poiMesh.position.set(0, yPos, 0);
    rackGroup.add(poiMesh);
  });

  return rackGroup;
}

function spawnDual42UPoiRackBlok() {
  const blockGroup = buildDual42UPoiRackBlok(state.currentArea);
  blockGroup.userData.id = state.nextId++;
  setupPlatformTransform(blockGroup, -3.72, -1.27, false);
  blockGroup.position.y = 0.0;
  addPlatformToActiveArea(blockGroup);
}

function spawnAlan2OzelKarmaBlok() {
  const blockGroup = buildAlan2OzelKarmaBlok(state.currentArea);
  blockGroup.userData.id = state.nextId++;
  setupPlatformTransform(blockGroup, -2.38, -1.18, false);
  blockGroup.position.y = 0.0;
  addPlatformToActiveArea(blockGroup);
}

function spawnAlan4OzelKarmaBlok() {
  const blockGroup = buildAlan4OzelKarmaBlok(state.currentArea);
  blockGroup.userData.id = state.nextId++;
  setupPlatformTransform(blockGroup, 8.3919, -0.70, false);
  blockGroup.position.set(8.3919, 20.0, -0.70);
  addPlatformToActiveArea(blockGroup);
}

// Cloned & Customized Alan 4 Complex: Çift Cephe Flanşlı Pol & Karma RRU Kompleksi (42U Kaldırılmış, İki Cephede Pol + RRU)
function buildAlan4CiftRRUKompleksBlok(targetArea = state.currentArea) {
  const blockGroup = new THREE.Group();
  blockGroup.userData = {
    type: 'platform',
    blockType: 'alan4-cift-rru-kompleks',
    category: 'Karma',
    name: 'Özel Alan 4 Çift RRU Kompleksi (Platform + Çift RRU)',
    width: 1.20,
    depth: 2.60,
    height: 2.40,
    weight: 860,
    interactive: true,
    locked: false,
    lockedX: false,
    lockedY: true,
    lockedZ: true,
    allowPassThrough: true
  };

  // 1. Çemberli H-Beam Platform (Alan 4)
  const subPlatform = buildAlan4CemberPlatformBlok();
  subPlatform.userData.interactive = false;
  subPlatform.position.set(0, 0, 0);
  subPlatform.rotation.set(0, 0, 0);
  blockGroup.add(subPlatform);

  // 2. Arka Cephe Flanşlı Boru Donanımı (rearZ = 0.75m'den 20cm içeri: rearPipeZ = 0.55m)
  const whiteSteelMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.2, roughness: 0.4 });
  const boltHeadMat = new THREE.MeshStandardMaterial({ color: 0x718096, metalness: 0.9, roughness: 0.1 });
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  const tableY = 0.02;
  const rearPipeZ = 0.55;

  // Arka flanş alt mesnet dikmesi
  const flangePost = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.08), whiteSteelMat);
  flangePost.position.set(0, 0.005, rearPipeZ);
  blockGroup.add(flangePost);

  // Arka alt flanş plakası
  const flangePlateGeo = new THREE.BoxGeometry(0.20, 0.012, 0.20);
  const riserFlange = new THREE.Mesh(flangePlateGeo, whiteSteelMat);
  riserFlange.position.set(0, tableY + 0.016, rearPipeZ);
  riserFlange.castShadow = true;
  blockGroup.add(riserFlange);

  // Arka üst flanş plakası
  const pipeFlange = new THREE.Mesh(flangePlateGeo, whiteSteelMat);
  pipeFlange.position.set(0, tableY + 0.028, rearPipeZ);
  pipeFlange.castShadow = true;
  blockGroup.add(pipeFlange);

  // Flanş cıvataları (4 adet M20 cıvata)
  [-0.075, 0.075].forEach(dx => {
    [-0.075, 0.075].forEach(dz => {
      const hexBolt = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 6), boltHeadMat);
      hexBolt.position.set(dx, tableY + 0.038, rearPipeZ + dz);
      blockGroup.add(hexBolt);
    });
  });

  // Arka düşey 2m boru (Rear vertical equipment pipe)
  const verticalPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.03175, 0.03175, 2.0, 32), pipeMat);
  verticalPipe.position.set(0, tableY + 1.03, rearPipeZ);
  verticalPipe.castShadow = true;
  blockGroup.add(verticalPipe);

  // 3. Ön Cephe Karma RRU Blok (4 Borulu - 7 RRU)
  const subKarmaFront = buildAlan2KarmaRRUBlok(targetArea);
  subKarmaFront.userData.interactive = false;
  subKarmaFront.position.set(0, 0, -1.3484016108318484);
  subKarmaFront.rotation.set(0, 0, 0);
  blockGroup.add(subKarmaFront);

  // 4. Arka Cephe Karma RRU Blok (4 Borulu - 7 RRU) - 42U kaldırılıp yerine konulan arka cepheye dönük RRU bloğu
  const subKarmaRear = buildAlan2KarmaRRUBlok(targetArea);
  subKarmaRear.userData.interactive = false;
  subKarmaRear.position.set(0, 0, 0.2484016108318484);
  subKarmaRear.rotation.set(0, Math.PI, 0);
  blockGroup.add(subKarmaRear);

  return blockGroup;
}











function buildAlan2Karsilikli11BoruRRUBlok(targetArea = state.currentArea) {
  const blockGroup = new THREE.Group();
  blockGroup.userData = {
    type: 'rru',
    blockType: 'alan2-karsilikli-11boru-rru-blok',
    category: 'Karma',
    name: 'Alan 2 Özel Karşılıklı 11 Boru 21 RRU Blok',
    width: 1.5,
    height: 1.70,
    depth: 1.2,
    weight: 750,
    interactive: true,
    locked: false,
    lockedX: false,
    lockedY: false,
    lockedZ: false,
    isFreestanding: true,
    allowPassThrough: true
  };

  // 1. Taban: İki adet çentiksiz Tabla-2(120cm). Genişlik 1.5m olacak şekilde.
  const t2_1 = buildTabla2(true); t2_1.userData.interactive = false; t2_1.position.set(-0.25, -0.0090, -0.1645); blockGroup.add(t2_1);
  const t2_2 = buildTabla2(true); t2_2.userData.interactive = false; t2_2.position.set(0.25, -0.0090, -0.1645); blockGroup.add(t2_2);

  // 2. Korkuluk kaldırıldı.

  // 3. Borular ve RRU'lar
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  const clampMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.1 });
  const flangePlateGeo = new THREE.BoxGeometry(0.18, 0.012, 0.18);

  const tcellItem = EQUIPMENT_CATALOG.find(item => item.id === 'turkcell-4485') || { id: 'turkcell-4485', category: 'Turkcell', name: 'LTE RRU4485 - 4G', width: 0.398, height: 0.533, depth: 0.145, weight: 25, color: '#1d4ed8' };
  const ttItem = EQUIPMENT_CATALOG.find(item => item.id === 'tt-5818w') || { id: 'tt-5818w', category: 'Türk Telekom', name: 'NR RRU 5818W', width: 0.356, height: 0.480, depth: 0.140, weight: 25, color: '#0891b2' };
  const vodaItem = EQUIPMENT_CATALOG.find(item => item.id === 'vodafone-5526t') || { id: 'vodafone-5526t', category: 'Vodafone', name: 'RRU5526t', width: 0.432, height: 0.480, depth: 0.135, weight: 28, color: '#dc2626' };

  // Z ekseninde yanyana olanlar olabildiğince yakın (0.18m aralık).
  const leftPosZ = [-0.45, -0.27, -0.09, 0.09, 0.27, 0.45];
  const leftEquip = [
    { bottom: vodaItem, top: vodaItem },
    { bottom: vodaItem, top: vodaItem },
    { bottom: vodaItem, top: vodaItem },
    { bottom: vodaItem, top: vodaItem },
    { bottom: vodaItem, top: tcellItem },
    { bottom: tcellItem, top: tcellItem }
  ]; 

  const rightPosZ = [-0.36, -0.18, 0, 0.18, 0.36];
  const rightEquip = [
    { bottom: ttItem, top: ttItem },
    { bottom: ttItem, top: ttItem },
    { bottom: ttItem, top: ttItem },
    { bottom: tcellItem, top: tcellItem },
    { bottom: tcellItem, top: null }
  ];

  const pipeH = 1.70; // 170 cm boru boyu
  const verticalPipeGeo = new THREE.CylinderGeometry(0.03175, 0.03175, pipeH, 32);

  const createPipeAndRRU = (posX, posZ, config, pipeIndex, isLeft) => {
    const verticalPipe = new THREE.Mesh(verticalPipeGeo, pipeMat);
    verticalPipe.position.set(posX, pipeH / 2, posZ);
    verticalPipe.castShadow = true;
    blockGroup.add(verticalPipe);

    const pipeFlange = new THREE.Mesh(flangePlateGeo, pipeMat);
    pipeFlange.position.set(posX, 0.007, posZ);
    pipeFlange.castShadow = true;
    blockGroup.add(pipeFlange);

    const levels = [
      { y: 0.60, item: config.bottom },
      { y: 1.38, item: config.top }
    ];

    levels.forEach((lvl, lvlIndex) => {
      if (!lvl.item) return;

      const rruModel = buildCustomEquipmentModel(lvl.item);
      rruModel.userData.name = lvl.item.category + " RRU (" + (isLeft ? "Sol" : "Sağ") + " Boru " + pipeIndex + ", " + (lvlIndex === 0 ? "Alt" : "Üst") + ")";
      rruModel.userData.interactive = true;
      
      const rruDirX = isLeft ? 1 : -1; 
      
      if (isLeft) {
        rruModel.rotation.set(0, 0, 0); 
      } else {
        rruModel.rotation.set(0, Math.PI, 0); 
      }
      
      const offset = (lvl.item.width / 2) + 0.08;
      const rruPosX = posX + (rruDirX * offset);
      
      rruModel.position.set(rruPosX, lvl.y, posZ); 
      blockGroup.add(rruModel);
    });
  };

  // Karşılıklı borular arası mesafe: RRU'ların arasında net 80 cm çalışma alanı kalacak şekilde X ekseninde konumlandırılıyor.
  // RRU offseti yaklaşık 0.28m. Ortada 0.80m boşluk için: 0.80 / 2 = 0.40m. 
  // Pollerin konumu = 0.40m + 0.28m = 0.68m.
  leftPosZ.forEach((z, i) => createPipeAndRRU(-0.68, z, leftEquip[i], i + 1, true));
  rightPosZ.forEach((z, i) => createPipeAndRRU(0.68, z, rightEquip[i], i + 1, false));

  return blockGroup;
}

function spawnAlan2Karsilikli11BoruRRUBlok() {
  const blockGroup = buildAlan2Karsilikli11BoruRRUBlok();
  blockGroup.userData.id = state.nextId++;
  setupPlatformTransform(blockGroup, 0, -1.0); 
  addPlatformToActiveArea(blockGroup);
}


function buildAlan2Kediyolu42UKompleksBlok(targetArea = state.currentArea) {
  const blockGroup = new THREE.Group();
  blockGroup.userData = {
    type: 'rru', 
    blockType: 'alan2-kediyolu-42u-kompleks',
    category: 'Canovate',
    name: '30U POI Rack (4 POI) - Doğrudan Beton Zemin (Alan 2)',
    width: 0.60,
    depth: 0.70,
    height: 1.48,
    weight: 136,
    interactive: true,
    lockedX: false,
    lockedY: false,
    lockedZ: false,
    isFreestanding: true,
    allowPassThrough: true
  };

  // 30U POI Rack (4 POI Dolu) - Doğrudan beton zemin üstünde (Y = 0)
  const subPoi = build42UPoiRackBlok('alan2');
  subPoi.userData.interactive = false;
  subPoi.position.set(0, 0, 0); 
  subPoi.rotation.set(0, 0, 0); 
  blockGroup.add(subPoi);

  // 4 Adet Zemin Beton Ankraj Cıvatası (M16 Kimyasal Dübel & Somun)
  const boltGeo = new THREE.CylinderGeometry(0.010, 0.010, 0.025, 12);
  const nutGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.014, 6);
  const boltMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
  for (let xPos of [-0.24, 0.24]) {
    for (let zPos of [-0.28, 0.28]) {
      const bolt = new THREE.Mesh(boltGeo, boltMat);
      bolt.position.set(xPos, 0.0125, zPos);
      blockGroup.add(bolt);
      const nut = new THREE.Mesh(nutGeo, boltMat);
      nut.position.set(xPos, 0.014, zPos);
      blockGroup.add(nut);
    }
  }

  return blockGroup;
}

function spawnAlan2Kediyolu42UKompleksBlok() {
  const blockGroup = buildAlan2Kediyolu42UKompleksBlok();
  blockGroup.userData.id = state.nextId++;
  setupPlatformTransform(blockGroup, 0, -0.70); 
  addPlatformToActiveArea(blockGroup);
}

// =========================================================================
// =========================================================================
// ALAN 2: TABLALI 4 BORU • 7 RRU KÜMESİ
// Mevcut alt kedi yoluna altta bir tabla ve üzerine 4 adet flanşlı boru
// ve 7 RRU'nun dizildiği blok
// =========================================================================
function buildAlan2Alternatif2RRUBlok(targetArea = state.currentArea) {
  const blockGroup = new THREE.Group();
  blockGroup.userData = {
    type: 'rru',
    blockType: 'alan2-alternatif2-rru-blok',
    category: 'RRU',
    name: 'Tablalı 4 Boru 7 RRU Bloğu',
    width: 0.85,
    depth: 0.55,
    height: 1.95,
    weight: 215, // 190kg RRU donanımı + 25kg çelik tabla ve borular
    interactive: true,
    locked: false,
    lockedX: false,
    lockedY: false,
    lockedZ: false,
    allowPassThrough: true,
    isFreestanding: true
  };

  const tablaThickness = 0.025; // 25mm sıcak daldırma galvaniz tabla

  // 1. ALTTTAKİ METAL TABLA (85cm x 55cm x 2.5cm)
  const tablaMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.70, roughness: 0.30 });
  const kickplateMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.75, roughness: 0.25 });
  const boltHeadMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.90, roughness: 0.10 });

  const tablaGeo = new THREE.BoxGeometry(0.85, tablaThickness, 0.55);
  const tablaMesh = new THREE.Mesh(tablaGeo, tablaMat);
  tablaMesh.position.set(0, tablaThickness / 2, -0.13);
  tablaMesh.castShadow = true;
  tablaMesh.receiveShadow = true;
  blockGroup.add(tablaMesh);

  // Tablanın etrafında koruyucu tekme levhası bordürü (kickplate)
  const kpFront = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.035, 0.012), kickplateMat);
  kpFront.position.set(0, 0.025, 0.144);
  blockGroup.add(kpFront);

  const kpBack = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.035, 0.012), kickplateMat);
  kpBack.position.set(0, 0.025, -0.404);
  blockGroup.add(kpBack);

  const kpLeft = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.035, 0.55), kickplateMat);
  kpLeft.position.set(-0.419, 0.025, -0.13);
  blockGroup.add(kpLeft);

  const kpRight = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.035, 0.55), kickplateMat);
  kpRight.position.set(0.419, 0.025, -0.13);
  blockGroup.add(kpRight);

  // 4 Köşe M16 Sabitleme Ankraj Cıvatası
  const cornerBoltGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.025, 6);
  [-0.38, 0.38].forEach(bx => {
    [-0.36, 0.10].forEach(bz => {
      const bolt = new THREE.Mesh(cornerBoltGeo, boltHeadMat);
      bolt.position.set(bx, 0.032, bz);
      blockGroup.add(bolt);
    });
  });

  // 2. KULLANICI İSTEĞİ: "Alan-4 de bulunan Özel Alan 2 RRU GRUBU (Beton zemin flanşlı 7 rru (alan3) adındaki bloğu alıp altına bir metal tabla eklersen yeterli"
  const ozelKarma = buildAlan2OzelKarmaBlok('alan3');
  ozelKarma.userData.interactive = false;
  ozelKarma.position.set(0, tablaThickness, 0);
  blockGroup.add(ozelKarma);

  return blockGroup;
}

function spawnAlan2Alternatif2RRUBlok() {
  const blockGroup = buildAlan2Alternatif2RRUBlok(state.currentArea);
  blockGroup.userData.id = state.nextId++;
  setupPlatformTransform(blockGroup, 0, -0.70, false);
  blockGroup.position.set(0, 20.0, -0.70);
  addPlatformToActiveArea(blockGroup);
}


function spawnAlan4CiftRRUKompleksBlok() {
  const blockGroup = buildAlan4CiftRRUKompleksBlok(state.currentArea);
  blockGroup.userData.id = state.nextId++;
  setupPlatformTransform(blockGroup, 8.3919, -0.70, false);
  blockGroup.position.set(8.3919, 20.0, -0.70);
  addPlatformToActiveArea(blockGroup);
}

// Standalone Interactive Model Builder: Kedi Yolu İçi Korkuluksuz Montaj Tablası & Flanşlı Pol (120x200 cm, Alan 4)
function buildAlan4KediyoluTablaBlok(withPole = true, platLength = withPole ? 2.00 : 1.10, rackZ = 0.40) {
  const group = new THREE.Group();
  const platWidth = 1.20;   // X ekseninde genişlik: 1.20m
  const platCenterZ = withPole ? 0.0 : rackZ;

  group.userData = {
    type: 'platform',
    blockType: withPole ? 'alan4-kediyolu-tabla-blok' : 'alan4-kediyolu-alt-tabla',
    category: 'Platform',
    name: withPole ? 'Kedi Yolu İçi Korkuluksuz Tabla & Flanşlı Pol (Alan 4)' : 'Kedi Yolu İçi Korkuluksuz Alt Tabla (Alan 4)',
    width: platWidth,
    depth: platLength,
    height: withPole ? 2.50 : 0.10,
    weight: withPole ? 145 : 60,
    interactive: true,
    locked: false,
    lockedX: false,
    lockedY: true,
    lockedZ: true,
    allowPassThrough: true
  };

  // Malzemeler
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.6, roughness: 0.3 });
  const tableMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.3, transparent: true, opacity: 0.95 });
  const borderMat = new THREE.MeshStandardMaterial({ color: 0xcfd8dc, metalness: 0.5, roughness: 0.3 });
  const boltHeadMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9, roughness: 0.1 });
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.4, roughness: 0.3 });
  const guideMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.7, roughness: 0.2 });
  const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });

  const baseThick = 0.05;   // 5cm NPU çelik çerçeve
  const baseY = 0.025 + baseThick / 2; // Kedi yolu tabanına oturur (Y=0.025 üstü)
  const surfaceY = 0.025 + baseThick;  // Tabla üst yüzeyi: Y=0.075m

  // 1. KEDİ YOLU DÖŞEME OTURMA ŞASESİ (NPU 80 / Kutu Profil Dış Çerçeve)
  [-0.585, 0.585].forEach(xPos => {
    const sideBeam = new THREE.Mesh(new THREE.BoxGeometry(0.05, baseThick, platLength), frameMat);
    sideBeam.position.set(xPos, baseY, platCenterZ);
    sideBeam.castShadow = true;
    sideBeam.receiveShadow = true;
    group.add(sideBeam);
  });

  [platCenterZ - platLength / 2 + 0.025, platCenterZ + platLength / 2 - 0.025].forEach(zPos => {
    const endBeam = new THREE.Mesh(new THREE.BoxGeometry(platWidth, baseThick, 0.05), frameMat);
    endBeam.position.set(0, baseY, zPos);
    endBeam.castShadow = true;
    endBeam.receiveShadow = true;
    group.add(endBeam);
  });

  const crossZ = withPole ? [-0.55, -0.10, 0.40] : [rackZ - 0.28, rackZ, rackZ + 0.28];
  crossZ.forEach(zPos => {
    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(platWidth - 0.10, baseThick, 0.04), frameMat);
    crossBeam.position.set(0, baseY, zPos);
    group.add(crossBeam);
  });

  // Kedi yolu ızgarasına sabitleme pabuçları (Montaj kelepçeleri)
  const clampZ = withPole ? [-0.85, 0.0, 0.85] : [platCenterZ - platLength / 2 + 0.15, platCenterZ + platLength / 2 - 0.15];
  [-0.50, 0.50].forEach(xPos => {
    clampZ.forEach(zPos => {
      const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.08), darkSteelMat);
      clamp.position.set(xPos, 0.025, zPos);
      group.add(clamp);

      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.04, 6), boltHeadMat);
      bolt.position.set(xPos, 0.038, zPos);
      group.add(bolt);
    });
  });

  // 2. MODÜLER GALVANİZLİ IZGARA ZEMİN TABLASI (KORKULUKSUZ TEMİZ YÜZEY)
  if (withPole) {
    // Bölge 1: Ön Tabla (Z: -1.00m -> -0.10m, Merkez Z: -0.55m) - Flanşlı Pol Bölgesi
    const t1Mesh = new THREE.Mesh(new THREE.BoxGeometry(platWidth - 0.08, 0.025, 0.88), tableMat);
    t1Mesh.position.set(0, surfaceY, -0.55);
    t1Mesh.receiveShadow = true;
    group.add(t1Mesh);

    // Bölge 2: Arka Tabla (Z: -0.10m -> +1.00m, Merkez Z: +0.45m) - 42U Kabin Bölgesi
    const t2Mesh = new THREE.Mesh(new THREE.BoxGeometry(platWidth - 0.08, 0.025, 1.06), tableMat);
    t2Mesh.position.set(0, surfaceY, 0.45);
    t2Mesh.receiveShadow = true;
    group.add(t2Mesh);
  } else {
    // Kesintisiz yekpare ızgara döşeme taban
    const fullMesh = new THREE.Mesh(new THREE.BoxGeometry(platWidth - 0.08, 0.025, platLength - 0.08), tableMat);
    fullMesh.position.set(0, surfaceY, platCenterZ);
    fullMesh.receiveShadow = true;
    group.add(fullMesh);
  }

  // Çevre alçak bordür pahı (Ayak takılmasını önleyen 15mm eğik güvenlik bordürü)
  [-0.58, 0.58].forEach(xBorder => {
    const bSide = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, platLength - 0.04), borderMat);
    bSide.position.set(xBorder, surfaceY + 0.015, platCenterZ);
    group.add(bSide);
  });
  [platCenterZ - platLength / 2 + 0.01, platCenterZ + platLength / 2 - 0.01].forEach(zBorder => {
    const bEnd = new THREE.Mesh(new THREE.BoxGeometry(platWidth, 0.015, 0.02), borderMat);
    bEnd.position.set(0, surfaceY + 0.015, zBorder);
    group.add(bEnd);
  });

  // 3. FLANŞLI POL DONANIMI (Yalnızca withPole=true ise eklenir)
  if (withPole) {
    const pipeZ = -0.55;

    const flangePlateGeo = new THREE.BoxGeometry(0.25, 0.016, 0.25);
    const baseFlange = new THREE.Mesh(flangePlateGeo, frameMat);
    baseFlange.position.set(0, surfaceY + 0.020, pipeZ);
    baseFlange.castShadow = true;
    group.add(baseFlange);

    const upperFlange = new THREE.Mesh(flangePlateGeo, frameMat);
    upperFlange.position.set(0, surfaceY + 0.036, pipeZ);
    upperFlange.castShadow = true;
    group.add(upperFlange);

    // 4 Adet M20 Ağır Yük Flanş Cıvatası
    [-0.09, 0.09].forEach(dx => {
      [-0.09, 0.09].forEach(dz => {
        const hexBolt = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.035, 6), boltHeadMat);
        hexBolt.position.set(dx, surfaceY + 0.048, pipeZ + dz);
        group.add(hexBolt);
      });
    });

    // 4 Adet Berkitme Sacı (Gusset Stiffeners)
    const gussetGeo = new THREE.BoxGeometry(0.01, 0.12, 0.08);
    const gussetF = new THREE.Mesh(gussetGeo, frameMat);
    gussetF.position.set(0, surfaceY + 0.09, pipeZ - 0.07);
    group.add(gussetF);
    const gussetB = new THREE.Mesh(gussetGeo, frameMat);
    gussetB.position.set(0, surfaceY + 0.09, pipeZ + 0.07);
    group.add(gussetB);

    const gussetGeoLR = new THREE.BoxGeometry(0.08, 0.12, 0.01);
    const gussetL = new THREE.Mesh(gussetGeoLR, frameMat);
    gussetL.position.set(-0.07, surfaceY + 0.09, pipeZ);
    group.add(gussetL);
    const gussetR = new THREE.Mesh(gussetGeoLR, frameMat);
    gussetR.position.set(0.07, surfaceY + 0.09, pipeZ);
    group.add(gussetR);

    // Düşey 2.40m Ekipman Borusu (Pol - Ø 76.1mm)
    const poleHeight = 2.40;
    const poleRadius = 0.0381;
    const poleMesh = new THREE.Mesh(new THREE.CylinderGeometry(poleRadius, poleRadius, poleHeight, 32), pipeMat);
    poleMesh.position.set(0, surfaceY + 0.04 + poleHeight / 2, pipeZ);
    poleMesh.castShadow = true;
    group.add(poleMesh);

    const poleCap = new THREE.Mesh(new THREE.CylinderGeometry(poleRadius + 0.005, poleRadius + 0.005, 0.02, 32), darkSteelMat);
    poleCap.position.set(0, surfaceY + 0.04 + poleHeight + 0.01, pipeZ);
    group.add(poleCap);
  }

  // 4. 42U KABİN YERLEŞİM KAİDESİ
  const rackW = 0.60;
  const rackD = 0.70;

  // 42U Montaj Kaidesi / Şablon Çerçevesi
  const rackFrameGeo = new THREE.BoxGeometry(rackW + 0.04, 0.015, rackD + 0.04);
  const rackFrame = new THREE.Mesh(rackFrameGeo, guideMat);
  rackFrame.position.set(0, surfaceY + 0.015, rackZ);
  rackFrame.receiveShadow = true;
  group.add(rackFrame);

  // 42U Taban oturma sacı
  const rackPlateGeo = new THREE.BoxGeometry(rackW, 0.018, rackD);
  const rackPlate = new THREE.Mesh(rackPlateGeo, darkSteelMat);
  rackPlate.position.set(0, surfaceY + 0.020, rackZ);
  rackPlate.receiveShadow = true;
  group.add(rackPlate);

  // 4 Köşe Ankraj / Sabitleme Delikleri
  [-rackW / 2 + 0.04, rackW / 2 - 0.04].forEach(dx => {
    [-rackD / 2 + 0.04, rackD / 2 - 0.04].forEach(dz => {
      const anchor = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.02, 6), boltHeadMat);
      anchor.position.set(dx, surfaceY + 0.030, rackZ + dz);
      group.add(anchor);
    });
  });

  return group;
}

// Standalone Interactive Model Builder: Kedi Yolu İçi Tabla + 42U POI Rack Kompleksi (Alan 4) (Pol ve Flanşsız, Geriye Çekilmiş 42U + Kısaltılmış Alt Tabla)
function buildAlan4Kediyolu42UKompleksBlok(targetArea = state.currentArea) {
  const blockGroup = new THREE.Group();
  const rackZ = 0.40;
  const platLength = 1.10;

  blockGroup.userData = {
    type: 'platform',
    blockType: 'alan4-kediyolu-42u-kompleks',
    category: 'Karma',
    name: 'Kedi Yolu Tabla + 42U POI Kompleks (Alan 4)',
    width: 1.20,
    depth: platLength,
    height: 2.15,
    weight: 295,
    interactive: true,
    locked: false,
    lockedX: false,
    lockedY: true,
    lockedZ: true,
    allowPassThrough: true
  };

  // 1. Kedi Yolu İçi Korkuluksuz Kısaltılmış Alt Tabla (Pol ve Flanş Yok, Sadece 42U Kaideli Kısaltılmış Tabla)
  const subPlatform = buildAlan4KediyoluTablaBlok(false, platLength, rackZ);
  subPlatform.userData.interactive = false;
  subPlatform.position.set(0, 0, 0);
  subPlatform.rotation.set(0, 0, 0);
  blockGroup.add(subPlatform);

  // 2. 42U POI Rack Blok (6x POI Dolu) - Alt tabla üzerindeki kaideye tam oturur (Geriye çekilmiş Z = 0.40m)
  const subPoi = build42UPoiRackBlok(targetArea);
  subPoi.userData.interactive = false;
  subPoi.position.set(0, 0.095, rackZ);
  subPoi.rotation.set(0, Math.PI, 0);
  blockGroup.add(subPoi);

  return blockGroup;
}

function spawnAlan4KediyoluTablaBlok() {
  const blockGroup = buildAlan4KediyoluTablaBlok();
  blockGroup.userData.id = state.nextId++;
  setupPlatformTransform(blockGroup, 0.0, -0.70, false);
  blockGroup.position.set(0.0, 20.0, -0.70);
  addPlatformToActiveArea(blockGroup);
}

function spawnAlan4Kediyolu42UKompleksBlok() {
  const blockGroup = buildAlan4Kediyolu42UKompleksBlok(state.currentArea);
  blockGroup.userData.id = state.nextId++;
  setupPlatformTransform(blockGroup, 0.0, -0.70, false);
  blockGroup.position.set(0.0, 20.0, -0.70);
  addPlatformToActiveArea(blockGroup);
}

// =========================================================================
// MATSING 4-BEAM ÇAPRAZ KOL & ÇİFT OFSET ANTEN MONTAJ KOMPLEKSİ
// Kullanıcı İsteği ve Saha Fotoğraflarına (Foto 1-5) %100 Sadık Montaj Mimarisi:
// 1. Kedi Yolu Taşıyıcı Silindirine / Çelik Kirişe sarılan ana bağlantı kelepçesi
// 2. Zemine / Tribüne doğru ~48° açıyla çapraz iniş yapan kalın çelik taşıyıcı kol (Ø114mm)
// 3. Çapraz kol üzerinde 2 adet ofset kolu (Üst Ofset ve Alt Ofset)
// 4. İki ofset klempi arasına takılan dikey anten montaj iniş borusu (Ø76mm)
// 5. Boruya kendi üst ve alt klempleriyle bağlanan Matsing 4-Beam Çok Hüzmeli Lens Anteni (tribüne doğru eğimli bakış açısı)
// 6. Kedi yolu üzerinde 3 adet RRU ünitesi ve antene inen RF jumper kablo demeti
// 7. Emniyet çelik halatı (safety wire rope)
// =========================================================================
function buildMatsingDiagonalOffsetAssembly(targetArea = state.currentArea) {
  const assemblyGroup = new THREE.Group();

  assemblyGroup.userData = {
    id: state.nextId++,
    type: 'antenna',
    blockType: 'matsing-offset-assembly',
    category: 'Matsing',
    name: 'Matsing 4-Beam Çapraz Kol & Dikey Çift Ofset Montajı',
    width: 0.85,
    depth: 1.20,
    height: 1.85,
    weight: 72, // 51kg anten + 21kg borular ve ağır hizmet kelepçeleri
    interactive: true,
    lockedX: false,
    lockedY: false,
    lockedZ: false,
    allowPassThrough: true,
    isFreestanding: true
  };

  // Malzemeler
  const steelClampMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
  const galvPipeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.75, roughness: 0.3 });
  const darkHardwareMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.4 });

  // 1. ÇAPRAZ TAŞIYICI DİKMEYİ SARAN 2 ADET KELEPÇE (Ø220mm Çapraz Boru Klempleri)
  // Dikme 45° açıyla uzanır. İki klemp dikme ekseni boyunca birbirinden 1.10m mesafededir.
  const strutRadius = 0.11; // Ø220mm dikme
  const strutClampR = strutRadius + 0.012;
  const strutClampW = 0.14;
  const diagAngle = Math.PI / 4; // 45° dikme açısı

  // Alt ve üst dikme klemp merkezleri (montaj merkezine göre lokal koordinatlar)
  const pStrutLower = new THREE.Vector3(0, -0.389, 0.389);  // Kedi yoluna yakın alt klemp
  const pStrutUpper = new THREE.Vector3(0, 0.389, -0.389);  // Çatıya yakın üst klemp

  [pStrutLower, pStrutUpper].forEach(pos => {
    const clampGroup = new THREE.Group();
    clampGroup.position.copy(pos);
    clampGroup.rotation.x = -diagAngle; // 45° çapraz dikmeyi saracak açı

    // Çapraz dikmeyi saran silindir kelepçe
    const clampGeo = new THREE.CylinderGeometry(strutClampR, strutClampR, strutClampW, 32);
    const clampMesh = new THREE.Mesh(clampGeo, steelClampMat);
    clampMesh.castShadow = true;
    clampGroup.add(clampMesh);

    // Kelepçe flanş kulakları ve sıkma civataları
    [-0.05, 0.05].forEach(by => {
      const boltGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.28, 8);
      boltGeo.rotateZ(Math.PI / 2);
      const bolt = new THREE.Mesh(boltGeo, darkHardwareMat);
      bolt.position.set(0, by, strutClampR + 0.02);
      clampGroup.add(bolt);
    });

    assemblyGroup.add(clampGroup);
  });

  // 2. DİREKT AŞAĞI DOĞRU İNEN 2 ADET DÜŞEY OFSET BORUSU (Vertical Drop Offset Pipes)
  // Kullanıcı İsteği: "Anteni 50cm daha aşagı alacagız. Sen bunu yap ofsetlerin botularını da buna göre uzat"
  // Borular 50cm uzatıldı: Alt boru 0.65m -> 1.15m, Üst boru 1.05m -> 1.55m
  const offsetPipeR = 0.035; // Ø70mm dikey galvaniz çelik boru
  const lenLower = 1.15; // Kısa alt ofset borusu (1.15m)
  const lenUpper = 1.55; // Uzun üst ofset borusu (1.55m)

  // Alt Dikey Boru (Lower Drop Pipe): pStrutLower'dan direkt aşağı (-Y) iner
  const lowerPipeGeo = new THREE.CylinderGeometry(offsetPipeR, offsetPipeR, lenLower, 24);
  const lowerPipe = new THREE.Mesh(lowerPipeGeo, galvPipeMat);
  lowerPipe.position.set(pStrutLower.x, pStrutLower.y - lenLower / 2, pStrutLower.z);
  lowerPipe.castShadow = true;
  lowerPipe.receiveShadow = true;
  assemblyGroup.add(lowerPipe);

  // Üst Dikey Boru (Upper Drop Pipe): pStrutUpper'dan direkt aşağı (-Y) iner
  const upperPipeGeo = new THREE.CylinderGeometry(offsetPipeR, offsetPipeR, lenUpper, 24);
  const upperPipe = new THREE.Mesh(upperPipeGeo, galvPipeMat);
  upperPipe.position.set(pStrutUpper.x, pStrutUpper.y - lenUpper / 2, pStrutUpper.z);
  upperPipe.castShadow = true;
  upperPipe.receiveShadow = true;
  assemblyGroup.add(upperPipe);

  // Dikey boruların alt uç noktaları (anten borusuyla kesişim noktaları)
  const pAntLower = new THREE.Vector3(pStrutLower.x, pStrutLower.y - lenLower, pStrutLower.z); // (0, -1.039, 0.389)
  const pAntUpper = new THREE.Vector3(pStrutUpper.x, pStrutUpper.y - lenUpper, pStrutUpper.z); // (0, -0.661, -0.389)

  // 3. ÇAPRAZ GEÇİŞ KORUYUCU KLEM оси (Crossover Clamps / Pipe-to-Pipe Brackets)
  // Dikey ofset boruları ile eğimli anten borusunu birbirine bağlayan ağır hizmet klempleri
  [pAntLower, pAntUpper].forEach(pos => {
    const crossClampGeo = new THREE.BoxGeometry(0.16, 0.12, 0.16);
    const crossClamp = new THREE.Mesh(crossClampGeo, steelClampMat);
    crossClamp.position.copy(pos);
    crossClamp.castShadow = true;
    assemblyGroup.add(crossClamp);

    // Saplama U-Bolt civataları
    const uboltGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.20, 8);
    uboltGeo.rotateX(Math.PI / 2);
    [[-0.05, 0.03], [0.05, 0.03], [-0.05, -0.03], [0.05, -0.03]].forEach(([bx, by]) => {
      const ub = new THREE.Mesh(uboltGeo, darkHardwareMat);
      ub.position.set(pos.x + bx, pos.y + by, pos.z);
      assemblyGroup.add(ub);
    });
  });

  // 4. ANTEN ARKASINDAKİ BORU (Single Antenna Mast Pipe - Ø76.2mm / 3")
  // Anten boyu 1.635m -> Boru boyu 1.60m (antenin altını ve üstünü kesinlikle geçmez!)
  const antPipeLen = 1.60;
  const antPipeR = 0.0381;
  const pMid = new THREE.Vector3().addVectors(pAntLower, pAntUpper).multiplyScalar(0.5); // (0, -0.850, 0)
  const pipeVec = new THREE.Vector3().subVectors(pAntUpper, pAntLower);
  const pipeDist = pipeVec.length();
  const dirU = pipeVec.clone().normalize(); // Anten borusu boyuna eksen birim vektörü (0, 0.437, -0.899)

  const antPipeGeo = new THREE.CylinderGeometry(antPipeR, antPipeR, antPipeLen, 32);
  const antPipe = new THREE.Mesh(antPipeGeo, galvPipeMat);
  antPipe.position.copy(pMid);
  antPipe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirU);
  antPipe.castShadow = true;
  antPipe.receiveShadow = true;
  assemblyGroup.add(antPipe);

  // Galvaniz uç kapakları
  const antPipeCapGeo = new THREE.CylinderGeometry(antPipeR * 1.06, antPipeR * 1.06, 0.02, 24);
  const capOffset = dirU.clone().multiplyScalar(antPipeLen / 2 + 0.01);

  const topCap = new THREE.Mesh(antPipeCapGeo, darkHardwareMat);
  topCap.position.copy(pMid).add(capOffset);
  topCap.quaternion.copy(antPipe.quaternion);
  assemblyGroup.add(topCap);

  const botCap = new THREE.Mesh(antPipeCapGeo, darkHardwareMat);
  botCap.position.copy(pMid).sub(capOffset);
  botCap.quaternion.copy(antPipe.quaternion);
  assemblyGroup.add(botCap);

  // 5. MATSING 4-BEAM ÇOK HÜZMELİ LENS ANTENİ (MS-MBA-4.4.2)
  // Anten, arkasındaki bu boruya kendi üst ve alt klempleriyle kenetlenir.
  // Kavisli lens radom ön yüzeyi AŞAĞI ve TRİBÜNLERE doğru bakar!
  const matsingModel = buildMatsingAntennaModel({
    name: 'Matsing 4-Beam Lens Anten (MS-MBA-4.4.2)',
    category: 'Matsing',
    id: 'matsing-4-beam'
  });

  // Tribün ve sahaya doğru bakan normal vektör (dirU'ya dik, -Y ve -Z yönünde)
  const normalRadome = new THREE.Vector3(0, -dirU.z, dirU.y); // (0, 0.899, 0.437) -> tersi (-0.899, -0.437)
  const dirN = new THREE.Vector3(0, -Math.abs(dirU.z), -Math.abs(dirU.y)).normalize(); // (0, -0.899, -0.437)

  // Orthonormal sağ-el koordinat matrisi: X=(-1,0,0), Y=dirU, Z=dirN
  const orientMat = new THREE.Matrix4();
  orientMat.makeBasis(
    new THREE.Vector3(-1, 0, 0),
    dirU,
    dirN
  );
  matsingModel.quaternion.setFromRotationMatrix(orientMat);

  // Antenin kendi arka klemp ekseni local Z=-0.45m'dedir; borunun eksenine tam oturması için dirN yönünde 0.45m ötelenir
  matsingModel.position.copy(pMid).addScaledVector(dirN, 0.45);
  matsingModel.castShadow = true;
  assemblyGroup.add(matsingModel);

  return assemblyGroup;
}

function spawnMatsingDiagonalOffsetAssembly() {
  const blockGroup = buildMatsingDiagonalOffsetAssembly(state.currentArea);
  blockGroup.userData.id = state.nextId++;
  if (state.currentArea === 'alan1') {
    setupPlatformTransform(blockGroup, 0.0, -1.1855, false);
    blockGroup.position.set(0.0, 1.20, -1.1855);
  } else {
    // Alan 2 ve Alan 4: 45 metrelik çatı makası ucundaki çapraz dikmeye kenetlenir
    blockGroup.position.set(-3.00, 6.976, 41.568);
  }
  addPlatformToActiveArea(blockGroup);
}

// =========================================================================
// SPOT BEAM 30/30 4-PORT PANEL ANTENNA (MODEL: DOY15X3030MD4TRE)
// Katalog Bilgileri:
// - Ölçüler: 700 mm (G) x 700 mm (Y) x 170 mm (D)
// - Toplam Derinlik (Braket dahil): 421 mm (mafsal) / 463 mm (kelepçe)
// - Ağırlık: 16.5 kg (Net) / 13.7 kg (Montaj kitsiz)
// - Frekans Bantları: 698-960 MHz, 1695-2700 MHz, 3300-3800 MHz (4-Port 4.3-10 Female)
// - Ön Radom: ASA (Açık Gri), piramidal kabartmalı 'X' deseni ve pahlı çevre çerçevesi
// - Arka Gövde: Alüminyum şasi, 4x 4.3-10 arka RF port, merkezi ray ve boru kelepçesi
// =========================================================================
function buildSpotBeamPanelAntennaModel(item = {}) {
  const group = new THREE.Group();

  const W = item.width || 0.700; // 700 mm
  const H = item.height || 0.700; // 700 mm
  const D = item.depth || 0.170; // 170 mm gövde derinliği
  const weight = item.weight || 16.5; // 16.5 kg net

  group.userData = {
    id: state.nextId++,
    type: 'antenna',
    blockType: 'spot-beam-panel-model',
    catalogId: item.id || item.catalogId || 'doy15x3030md4tre',
    category: item.category || 'Panel Anten',
    name: item.name || 'Spot Beam 30/30 4-Port Panel Anten (DOY15X3030MD4TRE)',
    width: W,
    height: H,
    depth: D,
    weight: weight,
    interactive: true,
    lockedX: false,
    lockedY: false,
    lockedZ: false,
    isFreestanding: true,
    allowPassThrough: true
  };

  // Malzemeler
  const radomeMat = new THREE.MeshStandardMaterial({
    color: 0xc4cbd4, // ASA Gray
    roughness: 0.38,
    metalness: 0.12
  });

  const radomeFacetMat = new THREE.MeshStandardMaterial({
    color: 0xc8d0da,
    roughness: 0.32,
    metalness: 0.10,
    side: THREE.DoubleSide
  });

  const chassisMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8, // Alüminyum arka şasi
    roughness: 0.45,
    metalness: 0.75
  });

  const bracketSteelMat = new THREE.MeshStandardMaterial({
    color: 0x64748b, // Galvaniz çelik braket
    roughness: 0.35,
    metalness: 0.8
  });

  const portNutMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0, // Paslanmaz 4.3-10 konnektör somunu
    roughness: 0.2,
    metalness: 0.95
  });

  const darkHardwareMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.4,
    metalness: 0.8
  });

  // 1. ÖN RADOM VE PİRAMİDAL "X" KABARTMASI (700 x 700 x 170 mm)
  // A) Ana Gövde / Arka Kutu
  const mainBoxGeo = new THREE.BoxGeometry(W, H, D * 0.75);
  const mainBox = new THREE.Mesh(mainBoxGeo, radomeMat);
  mainBox.position.set(0, 0, -D * 0.125);
  mainBox.castShadow = true;
  mainBox.receiveShadow = true;
  group.add(mainBox);

  // B) Çevre Koruma Çerçevesi (Pahlı kenar pervazı)
  const bezelGeo = new THREE.BoxGeometry(W + 0.012, H + 0.012, 0.035);
  const bezel = new THREE.Mesh(bezelGeo, radomeMat);
  bezel.position.set(0, 0, D * 0.25 - 0.0175);
  bezel.castShadow = true;
  group.add(bezel);

  // C) Ön Yüz Piramidal "X" Kabartması (4 Üçgen Faset)
  const zBase = D * 0.25;
  const zApex = zBase + 0.018; // 18 mm merkez kabartması
  const halfW = W / 2 - 0.015;
  const halfH = H / 2 - 0.015;

  const pCenter = new THREE.Vector3(0, 0, zApex);
  const pTopLeft = new THREE.Vector3(-halfW, halfH, zBase);
  const pTopRight = new THREE.Vector3(halfW, halfH, zBase);
  const pBottomRight = new THREE.Vector3(halfW, -halfH, zBase);
  const pBottomLeft = new THREE.Vector3(-halfW, -halfH, zBase);

  function createFacet(pA, pB, pC) {
    const geo = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      pA.x, pA.y, pA.z,
      pB.x, pB.y, pB.z,
      pC.x, pC.y, pC.z
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, radomeFacetMat);
    mesh.castShadow = true;
    return mesh;
  }

  group.add(createFacet(pCenter, pTopLeft, pTopRight)); // Üst üçgen
  group.add(createFacet(pCenter, pTopRight, pBottomRight)); // Sağ üçgen
  group.add(createFacet(pCenter, pBottomRight, pBottomLeft)); // Alt üçgen
  group.add(createFacet(pCenter, pBottomLeft, pTopLeft)); // Sol üçgen

  // D) Köşegen Sırt Çıtaları (X-Ribs)
  const ribMat = new THREE.MeshStandardMaterial({ color: 0xb5beca, roughness: 0.4, metalness: 0.2 });
  const diagLen = Math.hypot(halfW * 2, halfH * 2);
  const ribGeo = new THREE.BoxGeometry(0.012, diagLen, 0.006);
  const rib1 = new THREE.Mesh(ribGeo, ribMat);
  rib1.rotation.z = Math.atan2(halfH * 2, halfW * 2) - Math.PI / 2;
  rib1.position.set(0, 0, (zBase + zApex) / 2);
  group.add(rib1);

  const rib2 = new THREE.Mesh(ribGeo, ribMat);
  rib2.rotation.z = -Math.atan2(halfH * 2, halfW * 2) + Math.PI / 2;
  rib2.position.set(0, 0, (zBase + zApex) / 2);
  group.add(rib2);

  // E) "UP" Yön Oku Etiketi
  const arrowGeo = new THREE.ConeGeometry(0.022, 0.045, 3);
  const arrowMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
  const arrow = new THREE.Mesh(arrowGeo, arrowMat);
  arrow.position.set(0, H / 2 - 0.045, zBase + 0.005);
  group.add(arrow);

  // 2. ARKA ALÜMİNYUM ŞASİ VE RF PORTLARI
  const chassisGeo = new THREE.BoxGeometry(W * 0.94, H * 0.94, 0.008);
  const chassis = new THREE.Mesh(chassisGeo, chassisMat);
  chassis.position.set(0, 0, -D / 2);
  chassis.castShadow = true;
  group.add(chassis);

  // 4 Adet 4.3-10 Dişi RF Konnektör Portu
  const portSpacing = 0.085;
  const portStartY = 0.125;
  const portX = W * 0.26;
  const portZ = -D / 2 - 0.016;

  const portColors = [
    { color: 0xef4444, label: 'R1 (698-960 MHz)' },
    { color: 0xeab308, label: 'Y1 (1695-2700 MHz)' },
    { color: 0xeab308, label: 'Y2 (1695-2700 MHz)' },
    { color: 0xa855f7, label: 'P1 (3300-3800 MHz)' }
  ];

  portColors.forEach((pCfg, idx) => {
    const py = portStartY - idx * portSpacing;
    const bodyGeo = new THREE.CylinderGeometry(0.0125, 0.0125, 0.032, 16);
    bodyGeo.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeo, portNutMat);
    body.position.set(portX, py, portZ);
    group.add(body);

    const bandGeo = new THREE.CylinderGeometry(0.0135, 0.0135, 0.008, 16);
    bandGeo.rotateX(Math.PI / 2);
    const bandMat = new THREE.MeshStandardMaterial({ color: pCfg.color, roughness: 0.3 });
    const band = new THREE.Mesh(bandGeo, bandMat);
    band.position.set(portX, py, portZ + 0.008);
    group.add(band);
  });

  // Topraklama Pabucu
  const gndGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.02, 12);
  gndGeo.rotateX(Math.PI / 2);
  const gndMesh = new THREE.Mesh(gndGeo, darkHardwareMat);
  gndMesh.position.set(portX, portStartY - 4 * portSpacing, portZ);
  group.add(gndMesh);

  // Ürün Künye Plakası
  const plateGeo = new THREE.BoxGeometry(0.18, 0.26, 0.003);
  const plateMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.5 });
  const plate = new THREE.Mesh(plateGeo, plateMat);
  plate.position.set(-W * 0.26, 0.0, -D / 2 - 0.002);
  group.add(plate);

  // 3. MERKEZİ DİKEY MONTAJ RAYI VE AĞIR HİZMET MAFSALLI KELEPÇE KİTİ
  const railGeo = new THREE.BoxGeometry(0.14, H * 0.65, 0.025);
  const centerRail = new THREE.Mesh(railGeo, bracketSteelMat);
  centerRail.position.set(0, 0, -D / 2 - 0.0125);
  centerRail.castShadow = true;
  group.add(centerRail);

  const slotGeo = new THREE.BoxGeometry(0.03, H * 0.45, 0.03);
  const slotMesh = new THREE.Mesh(slotGeo, darkHardwareMat);
  slotMesh.position.set(0, 0, -D / 2 - 0.0125);
  group.add(slotMesh);

  // Konsol Çift Mafsal Kolu (Föydeki net 251mm uzanma)
  const armLen = 0.251;
  const armGeo = new THREE.BoxGeometry(0.012, 0.12, armLen);
  [-0.055, 0.055].forEach(ax => {
    const arm = new THREE.Mesh(armGeo, bracketSteelMat);
    arm.position.set(ax, 0, -D / 2 - 0.025 - armLen / 2);
    arm.castShadow = true;
    group.add(arm);
  });

  // Mafsal Döner Çenesi ve Açı Ayar Kulağı
  const hingePivotGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.14, 24);
  hingePivotGeo.rotateZ(Math.PI / 2);
  const hingePivot = new THREE.Mesh(hingePivotGeo, bracketSteelMat);
  hingePivot.position.set(0, 0, -D / 2 - 0.025 - armLen);
  group.add(hingePivot);

  // Boru Kelepçe Yatağı (Ø76.2mm / 3" boruyu kavrayan yarım daire çene)
  const clampBaseZ = -D / 2 - 0.025 - armLen; // -0.421m (mafsal merkez aksı)
  const pipeRadius = 0.0381; // Ø76.2mm yarıçapı
  const clampSaddleGeo = new THREE.CylinderGeometry(pipeRadius + 0.012, pipeRadius + 0.012, 0.14, 24, 1, true, -Math.PI / 2, Math.PI);
  clampSaddleGeo.rotateX(Math.PI / 2);
  const clampSaddle = new THREE.Mesh(clampSaddleGeo, bracketSteelMat);
  clampSaddle.position.set(0, 0, clampBaseZ);
  clampSaddle.castShadow = true;
  group.add(clampSaddle);

  // Arka Çene Sacı ve M12 Sıkma Saplamaları
  const rearJawGeo = new THREE.BoxGeometry(0.16, 0.14, 0.015);
  const rearJaw = new THREE.Mesh(rearJawGeo, bracketSteelMat);
  rearJaw.position.set(0, 0, clampBaseZ - pipeRadius * 2 - 0.01);
  rearJaw.castShadow = true;
  group.add(rearJaw);

  const studGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.12, 12);
  studGeo.rotateX(Math.PI / 2);
  [-0.065, 0.065].forEach(sx => {
    const stud = new THREE.Mesh(studGeo, darkHardwareMat);
    stud.position.set(sx, 0, clampBaseZ - pipeRadius);
    group.add(stud);
  });

  return group;
}

// =========================================================================
// ASILI OFSET ANTEN MONTAJI (ALAN 3 İÇİN SPOT BEAM 30/30, DİĞER ALANLAR İÇİN MATSING)
// Kullanıcı İsteği:
// - Alan 3: Spot Beam 30/30 (DOY15X3030MD4TRE) çatı makası asılı montajı
// - Dikey iki iniş borusunun bittiği uç noktaları birbirine bağlayan açılı travers borusu
// - Bu travers borusundan çıkan 10 cm standoff ofset kolu
// - 45 derece açılı mafsal kelepçesi ile +X yönüne yaklaşık 45° ve sahaya eğimli bakış
// =========================================================================
function buildMatsingTrussMidOffsetAssembly(targetArea = state.currentArea, dropDistance = 2.0, nameSuffix = '', azimuthAngleDeg = 0) {
  const assemblyGroup = new THREE.Group();

  const dropH = (typeof dropDistance === 'number' && dropDistance > 0) ? dropDistance : 2.0;
  const isAlan3 = targetArea === 'alan3' || (nameSuffix && nameSuffix.includes('Alan 3'));
  if (isAlan3 && azimuthAngleDeg === 0) {
    azimuthAngleDeg = 45; // Kullanıcı İsteği: 45 derece açıyla +X tarafına bakış
  }

  const displayName = isAlan3
    ? (nameSuffix ? `Spot Beam 30/30 Panel Anten Çatı Taşıyıcısı Asılı Montajı${nameSuffix}` : 'Spot Beam 30/30 Panel Anten Çatı Taşıyıcısı Asılı Montajı (Alan 3)')
    : (nameSuffix ? `Matsing 4-Beam Çatı Taşıyıcısı Asılı Ofset Montajı${nameSuffix}` : 'Matsing 4-Beam Çatı Taşıyıcısı Asılı Ofset Montajı (Ara Bölge)');

  assemblyGroup.userData = {
    id: state.nextId++,
    type: 'antenna',
    blockType: isAlan3 ? 'spot-beam-truss-offset-assembly' : 'matsing-mid-offset-assembly',
    category: isAlan3 ? 'Panel Anten' : 'Matsing',
    catalogId: isAlan3 ? 'doy15x3030md4tre' : 'matsing-4-beam',
    name: displayName,
    width: isAlan3 ? 0.70 : 0.85,
    depth: isAlan3 ? 0.463 : 1.30,
    height: isAlan3 ? 0.70 : 2.60,
    weight: isAlan3 ? 38.5 : 78,
    interactive: true,
    lockedX: false,
    lockedY: false,
    lockedZ: false,
    allowPassThrough: true,
    isFreestanding: true,
    azimuthAngleDeg: azimuthAngleDeg
  };

  const steelClampMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 });
  const galvPipeMat = new THREE.MeshStandardMaterial({ color: 0xb0bec5, metalness: 0.8, roughness: 0.35 });
  const darkHardwareMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.4 });

  const slopeAngleRad = (targetArea === 'alan4') ? THREE.MathUtils.degToRad(5.0) : Math.asin(6.0 / 45.0);

  // 1. ÇATI TAŞIYICISINA SARAN 2 ADET AĞIR HİZMET KELEPÇESİ (Z = -0.4048m ve Z = +0.4048m)
  const carrierRadius = (targetArea === 'alan4') ? 0.175 : 0.14;
  const carrierClampR = carrierRadius + 0.014;
  const carrierClampW = 0.16;

  const pClampUpper = new THREE.Vector3(0, -0.0545, -0.4048);
  const pClampLower = new THREE.Vector3(0, 0.0545, 0.4048);

  [pClampUpper, pClampLower].forEach(pos => {
    const clampGroup = new THREE.Group();
    clampGroup.position.copy(pos);
    clampGroup.rotation.x = -slopeAngleRad;

    const clampGeo = new THREE.CylinderGeometry(carrierClampR, carrierClampR, carrierClampW, 32);
    clampGeo.rotateX(Math.PI / 2);
    const clampMesh = new THREE.Mesh(clampGeo, steelClampMat);
    clampMesh.castShadow = true;
    clampGroup.add(clampMesh);

    [-carrierClampW / 2 + 0.02, carrierClampW / 2 - 0.02].forEach(cz => {
      const rimGeo = new THREE.CylinderGeometry(carrierClampR + 0.012, carrierClampR + 0.012, 0.025, 24);
      rimGeo.rotateX(Math.PI / 2);
      const rim = new THREE.Mesh(rimGeo, darkHardwareMat);
      rim.position.set(0, 0, cz);
      clampGroup.add(rim);
    });

    [-0.09, 0.09].forEach(bx => {
      const earGeo = new THREE.BoxGeometry(0.04, 0.06, carrierClampW);
      const ear = new THREE.Mesh(earGeo, steelClampMat);
      ear.position.set(bx, -carrierClampR - 0.015, 0);
      clampGroup.add(ear);

      const boltGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.12, 8);
      boltGeo.rotateZ(Math.PI / 2);
      const bolt = new THREE.Mesh(boltGeo, darkHardwareMat);
      bolt.position.set(bx, -carrierClampR - 0.015, 0);
      clampGroup.add(bolt);
    });

    const socketGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.08, 20);
    const socket = new THREE.Mesh(socketGeo, steelClampMat);
    socket.position.set(0, -carrierClampR - 0.035, 0);
    clampGroup.add(socket);

    assemblyGroup.add(clampGroup);
  });

  // 2. TAŞIYICIDAN DİREKT AŞAĞI İNEN 2 ADET DÜŞEY OFSET BORUSU
  const offsetPipeR = 0.035;
  const pMid = new THREE.Vector3(0, -dropH, 0);

  // Düşey boruların alt uç koordinatları
  const pAntUpper = new THREE.Vector3(0, -dropH + 0.45 * 0.4369, -0.4048);
  const pAntLower = new THREE.Vector3(0, -dropH - 0.45 * 0.4369, 0.4048);

  const lenUpper = Math.abs(pAntUpper.y - (-0.1945));
  const upperYMid = (-0.1945 + pAntUpper.y) / 2;
  const upperPipeGeo = new THREE.CylinderGeometry(offsetPipeR, offsetPipeR, lenUpper, 24);
  const upperPipe = new THREE.Mesh(upperPipeGeo, galvPipeMat);
  upperPipe.position.set(0, upperYMid, -0.4048);
  upperPipe.castShadow = true;
  upperPipe.receiveShadow = true;
  assemblyGroup.add(upperPipe);

  const lenLower = Math.abs(pAntLower.y - (-0.0855));
  const lowerYMid = (-0.0855 + pAntLower.y) / 2;
  const lowerPipeGeo = new THREE.CylinderGeometry(offsetPipeR, offsetPipeR, lenLower, 24);
  const lowerPipe = new THREE.Mesh(lowerPipeGeo, galvPipeMat);
  lowerPipe.position.set(0, lowerYMid, 0.4048);
  lowerPipe.castShadow = true;
  lowerPipe.receiveShadow = true;
  assemblyGroup.add(lowerPipe);

  // 3. ÇAPRAZ BORU GEÇİŞ KLEMPLERİ
  [pAntUpper, pAntLower].forEach(pos => {
    const crossClampGeo = new THREE.BoxGeometry(0.16, 0.12, 0.16);
    const crossClamp = new THREE.Mesh(crossClampGeo, steelClampMat);
    crossClamp.position.copy(pos);
    crossClamp.castShadow = true;
    assemblyGroup.add(crossClamp);

    const uboltGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.20, 8);
    uboltGeo.rotateX(Math.PI / 2);
    [[-0.05, 0.03], [0.05, 0.03], [-0.05, -0.03], [0.05, -0.03]].forEach(([bx, by]) => {
      const ub = new THREE.Mesh(uboltGeo, darkHardwareMat);
      ub.position.set(pos.x + bx, pos.y + by, pos.z);
      assemblyGroup.add(ub);
    });
  });

  // Travers Borusunun Eksen Vektörü
  const pipeVec = new THREE.Vector3().subVectors(pAntUpper, pAntLower);
  const dirTravers = pipeVec.clone().normalize(); // (0, 0.4369, -0.8995)

  // 4. DİKEY BORULARIN BİTTİĞİ UÇLARI BİRBİRİNE BAĞLAYAN AÇILI TRAVERS BORUSU (Ø70mm)
  const traversLen = 0.98;
  const traversGeo = new THREE.CylinderGeometry(offsetPipeR, offsetPipeR, traversLen, 24);
  const traversPipe = new THREE.Mesh(traversGeo, galvPipeMat);
  traversPipe.position.copy(pMid);
  traversPipe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirTravers);
  traversPipe.castShadow = true;
  traversPipe.receiveShadow = true;
  assemblyGroup.add(traversPipe);

  // Travers borusu uç kapakları
  const tCapGeo = new THREE.CylinderGeometry(offsetPipeR * 1.05, offsetPipeR * 1.05, 0.02, 20);
  const tCapOffset = dirTravers.clone().multiplyScalar(traversLen / 2);
  const tCap1 = new THREE.Mesh(tCapGeo, darkHardwareMat);
  tCap1.position.copy(pMid).add(tCapOffset);
  tCap1.quaternion.copy(traversPipe.quaternion);
  assemblyGroup.add(tCap1);
  const tCap2 = new THREE.Mesh(tCapGeo, darkHardwareMat);
  tCap2.position.copy(pMid).sub(tCapOffset);
  tCap2.quaternion.copy(traversPipe.quaternion);
  assemblyGroup.add(tCap2);

  // 5. ANTEN YÖNLENME HESABI VE 10 CM OFSET KOLU
  const antPipeLen = isAlan3 ? 0.85 : 1.60;
  const antPipeR = 0.0381;
  const dirU0 = dirTravers.clone();
  const dirN0 = new THREE.Vector3(0, -Math.abs(dirU0.z), -Math.abs(dirU0.y)).normalize();
  const dirR0 = new THREE.Vector3(-1, 0, 0);

  let dirU = dirU0;
  let dirN = dirN0;
  let dirR = dirR0;
  let antPipeCenter = pMid.clone();

  if (azimuthAngleDeg !== 0) {
    const yawRad = THREE.MathUtils.degToRad(-azimuthAngleDeg); // 45 derece Y ekseni dönüşü
    const rotY = new THREE.Matrix4().makeRotationY(yawRad);
    dirU = dirU0.clone().applyMatrix4(rotY).normalize();
    dirN = dirN0.clone().applyMatrix4(rotY).normalize();
    dirR = dirR0.clone().applyMatrix4(rotY).normalize();

    // A) YATAY/AÇILI BORUDAN ÇIKAN 10 CM OFSET KOLU
    const offsetArmLen = 0.10; // Net 10 cm ofset (Kullanıcı İsteği)
    const pArmEnd = pMid.clone().add(new THREE.Vector3(offsetArmLen, 0, 0));
    antPipeCenter = pArmEnd;

    const armGeo = new THREE.CylinderGeometry(0.025, 0.025, offsetArmLen, 20);
    armGeo.rotateZ(Math.PI / 2);
    const armMesh = new THREE.Mesh(armGeo, galvPipeMat);
    armMesh.position.set(offsetArmLen / 2, pMid.y, pMid.z);
    armMesh.castShadow = true;
    assemblyGroup.add(armMesh);

    // Sele kelepçesi
    const traversSaddleGeo = new THREE.CylinderGeometry(offsetPipeR + 0.008, offsetPipeR + 0.008, 0.12, 24, 1, true, -Math.PI / 2, Math.PI);
    const traversSaddle = new THREE.Mesh(traversSaddleGeo, steelClampMat);
    traversSaddle.position.copy(pMid);
    traversSaddle.quaternion.copy(traversPipe.quaternion);
    assemblyGroup.add(traversSaddle);

    // B) 10 CM OFSETİN UCUNDAKİ 45 DERECE MAFSAL KELEPÇESİ
    const swivelBoxGeo = new THREE.BoxGeometry(0.12, 0.14, 0.12);
    const swivelBox = new THREE.Mesh(swivelBoxGeo, steelClampMat);
    swivelBox.position.copy(pArmEnd);
    swivelBox.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirU);
    swivelBox.castShadow = true;
    assemblyGroup.add(swivelBox);

    const ubolt45Geo = new THREE.CylinderGeometry(0.008, 0.008, 0.18, 12);
    ubolt45Geo.rotateZ(Math.PI / 2);
    [-0.04, 0.04].forEach(du => {
      const ub = new THREE.Mesh(ubolt45Geo, darkHardwareMat);
      ub.position.copy(pArmEnd).addScaledVector(dirU, du);
      ub.quaternion.copy(swivelBox.quaternion);
      assemblyGroup.add(ub);
    });
  }

  // 6. ANTEN SIRTI MONTAJ DİREĞİ (Ø76.2mm)
  const antPipeGeo = new THREE.CylinderGeometry(antPipeR, antPipeR, antPipeLen, 32);
  const antPipe = new THREE.Mesh(antPipeGeo, galvPipeMat);
  antPipe.position.copy(antPipeCenter);
  antPipe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirU);
  antPipe.castShadow = true;
  antPipe.receiveShadow = true;
  assemblyGroup.add(antPipe);

  const antPipeCapGeo = new THREE.CylinderGeometry(antPipeR * 1.06, antPipeR * 1.06, 0.02, 24);
  const capOffset = dirU.clone().multiplyScalar(antPipeLen / 2 + 0.01);

  const topCap = new THREE.Mesh(antPipeCapGeo, darkHardwareMat);
  topCap.position.copy(antPipeCenter).add(capOffset);
  topCap.quaternion.copy(antPipe.quaternion);
  assemblyGroup.add(topCap);

  const botCap = new THREE.Mesh(antPipeCapGeo, darkHardwareMat);
  botCap.position.copy(antPipeCenter).sub(capOffset);
  botCap.quaternion.copy(antPipe.quaternion);
  assemblyGroup.add(botCap);

  // 7. ANTEN MODELİ (Alan 3 için Spot Beam, diğer alanlar için Matsing)
  let antennaModel;
  if (isAlan3) {
    antennaModel = buildSpotBeamPanelAntennaModel({
      name: 'Spot Beam 30/30 4-Port Panel Anten (DOY15X3030MD4TRE)',
      category: 'Panel Anten',
      id: 'doy15x3030md4tre',
      width: 0.700,
      height: 0.700,
      depth: 0.170,
      weight: 16.5
    });
  } else {
    antennaModel = buildMatsingAntennaModel({
      name: 'Matsing 4-Beam Lens Anten (MS-MBA-4.4.2)',
      category: 'Matsing',
      id: 'matsing-4-beam'
    });
  }

  const orientMat = new THREE.Matrix4();
  orientMat.makeBasis(dirR, dirU, dirN);
  antennaModel.quaternion.setFromRotationMatrix(orientMat);
  const standoffOffset = isAlan3 ? 0.421 : 0.45;
  antennaModel.position.copy(antPipeCenter).addScaledVector(dirN, standoffOffset);
  antennaModel.castShadow = true;
  assemblyGroup.add(antennaModel);

  return assemblyGroup;
}

function spawnMatsingTrussMidOffsetAssembly() {
  if (state.currentArea === 'alan3') {
    // Alan 3: Spot Beam 30/30 (DOY15X3030MD4TRE) çatı makası asılı montajı, 1 metre arayla 2 adet anten
    // Düğüm noktalarından kaçarak s = 33.25m ve s = 34.25m akslarına yerleştirilir
    const existingAnt1 = state.alan3Platforms.find(p => p.userData && (p.userData.blockType === 'spot-beam-truss-offset-assembly' || p.userData.blockType === 'matsing-mid-offset-assembly') && Math.abs(p.position.z - 31.603) < 0.5);
    const existingAnt2 = state.alan3Platforms.find(p => p.userData && (p.userData.blockType === 'spot-beam-truss-offset-assembly' || p.userData.blockType === 'matsing-mid-offset-assembly') && Math.abs(p.position.z - 32.594) < 0.5);

    let targetZ = 31.603;
    let targetY = 8.533;
    let suffix = ' (Alan 3 - Anten 1)';

    if (existingAnt1 && !existingAnt2) {
      targetZ = 32.594;
      targetY = 8.667;
      suffix = ' (Alan 3 - Anten 2)';
    }

    const blockGroup = buildMatsingTrussMidOffsetAssembly('alan3', 2.0, suffix, 45);
    blockGroup.userData.id = state.nextId++;
    blockGroup.position.set(-3.00, targetY, targetZ);
    addPlatformToActiveArea(blockGroup);
  } else if (state.currentArea === 'alan2') {
    const existingAnt1 = state.alan2Platforms.find(p => p.userData && p.userData.blockType === 'matsing-mid-offset-assembly' && Math.abs(p.position.z - 37.934) < 0.5);
    const existingAnt2 = state.alan2Platforms.find(p => p.userData && p.userData.blockType === 'matsing-mid-offset-assembly' && Math.abs(p.position.z - 35.234) < 0.5);

    let targetZ = 37.934;
    let targetY = 9.385;
    let dropDist = 2.0;
    let suffix = ' (Ara Bölge - 1)';

    if (existingAnt1 && !existingAnt2) {
      targetZ = 35.234;
      targetY = 9.022;
      dropDist = 1.637;
      suffix = ' (Ara Bölge - 2)';
    }

    const blockGroup = buildMatsingTrussMidOffsetAssembly(state.currentArea, dropDist, suffix);
    blockGroup.userData.id = state.nextId++;
    blockGroup.position.set(-3.00, targetY, targetZ);
    addPlatformToActiveArea(blockGroup);
  } else if (state.currentArea === 'alan4') {
    const existing = state.alan4Platforms.filter(p => p.userData && p.userData.blockType === 'matsing-mid-offset-assembly');
    const slots = [
      { x: -18.00, y: 25.35, z: 22.81, name: 'Matsing 4-Beam Çatı Taşıyıcısı Asılı Ofset Montajı (Alan 4 - Sol 37m)' },
      { x: -18.00, y: 25.61, z: 19.82, name: 'Matsing 4-Beam Çatı Taşıyıcısı Asılı Ofset Montajı (Alan 4 - Sol 40m)' },
      { x: 18.00, y: 25.35, z: 22.81, name: 'Matsing 4-Beam Çatı Taşıyıcısı Asılı Ofset Montajı (Alan 4 - Sağ 37m)' },
      { x: 18.00, y: 25.61, z: 19.82, name: 'Matsing 4-Beam Çatı Taşıyıcısı Asılı Ofset Montajı (Alan 4 - Sağ 40m)' }
    ];
    let chosenSlot = slots.find(s => !existing.some(e => Math.abs(e.position.x - s.x) < 0.5 && Math.abs(e.position.z - s.z) < 0.5));
    if (!chosenSlot) chosenSlot = slots[0];
    const blockGroup = buildMatsingTrussMidOffsetAssembly('alan4', 2.0, ` (Alan 4 - ${chosenSlot.x < 0 ? 'Sol' : 'Sağ'} ${chosenSlot.z > 21 ? '37m' : '40m'})`);
    blockGroup.userData.id = state.nextId++;
    blockGroup.userData.name = chosenSlot.name;
    blockGroup.position.set(chosenSlot.x, chosenSlot.y, chosenSlot.z);
    blockGroup.rotation.y = Math.PI;
    addPlatformToActiveArea(blockGroup);
  } else {
    const blockGroup = buildMatsingTrussMidOffsetAssembly(state.currentArea);
    blockGroup.userData.id = state.nextId++;
    blockGroup.position.set(0.0, 3.0, -1.0);
    addPlatformToActiveArea(blockGroup);
  }
}

// Custom Drag and Drop Engine
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let dragPlane = new THREE.Plane();
let dragObject = null;
let isDragging = false;
const dragOffset = new THREE.Vector3();
const dragIntersection = new THREE.Vector3();

let isPointerDown = false;
let pointerButton = 0; // 0 = Sol (Açı/Seçim/Taşıma), 1 = Orta (Yörünge/Orbit), 2 = Sağ (Pan/Kaydır)
let pointerDownPos = { x: 0, y: 0 };
let lastPointerPos = { x: 0, y: 0 };
let isDragMode = false;
let clickedInteractiveObj = null;
let wasSelectedBeforeDown = false;

// 3D Alanda sağ tık menüsünün açılmasını engelleyerek akıcı Pan yapılmasını sağla
renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

// Attach Drag & Drop ve Serbest Bakış Dinleyicileri
renderer.domElement.addEventListener('pointerdown', (event) => {
  isPointerDown = true;
  pointerButton = event.button;
  pointerDownPos.x = event.clientX;
  pointerDownPos.y = event.clientY;
  lastPointerPos.x = event.clientX;
  lastPointerPos.y = event.clientY;
  isDragMode = false;
  isDragging = false;

  if (event.button === 0) {
    syncCameraEuler();

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const activePlatforms = getActivePlatforms();
    const intersects = raycaster.intersectObjects(activePlatforms, true);

    clickedInteractiveObj = null;
    for (let hit of intersects) {
      let current = hit.object;
      while (current.parent && current.parent !== scene) {
        current = current.parent;
      }
      if (current && current.userData && current.userData.interactive && activePlatforms.includes(current)) {
        clickedInteractiveObj = current;
        break;
      }
    }

    wasSelectedBeforeDown = (clickedInteractiveObj && clickedInteractiveObj === state.selectedObject);

    // YALNIZCA nesne ZATEN SEÇİLİYSE ve kilitli değilse taşıma sürüklemesi hazırla
    // Seçili olmayan nesnelere veya boş alana tıklanıp sürüklendiğinde kamera açısı serbestçe döner (asla takılmaz!)
    if (wasSelectedBeforeDown && clickedInteractiveObj && !(clickedInteractiveObj.userData.lockedX && clickedInteractiveObj.userData.lockedZ)) {
      dragObject = clickedInteractiveObj;
      dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), dragObject.position);
      raycaster.ray.intersectPlane(dragPlane, dragIntersection);
      dragOffset.copy(dragObject.position).sub(dragIntersection);
      isDragging = true;
    }
  }
});

renderer.domElement.addEventListener('pointermove', (event) => {
  if (!isPointerDown) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const activeDoors = (state.currentArea === 'alan4') ? alan4SlidingDoors : ((state.currentArea === 'alan3') ? alan3SlidingDoors : alan2SlidingDoors);
    if (activeDoors && activeDoors.length > 0) {
      const doorHits = raycaster.intersectObjects(activeDoors, true);
      if (doorHits.length > 0) {
        renderer.domElement.style.cursor = 'pointer';
        return;
      }
    }

    const activePlatforms = getActivePlatforms();
    const hits = raycaster.intersectObjects(activePlatforms, true);
    if (hits.length > 0) {
      renderer.domElement.style.cursor = 'pointer';
    } else {
      renderer.domElement.style.cursor = 'default';
    }
    return;
  }

  const dx = event.clientX - lastPointerPos.x;
  const dy = event.clientY - lastPointerPos.y;
  lastPointerPos.x = event.clientX;
  lastPointerPos.y = event.clientY;

  const totalDist = Math.hypot(event.clientX - pointerDownPos.x, event.clientY - pointerDownPos.y);
  if (totalDist > 4) {
    isDragMode = true;
  }

  if (pointerButton === 0) {
    // Sol Tık Hareketi
    if (event.altKey) {
      // Alt + Sol Tık: Yörüngesel Dönüş (Orbit etrafında inceleme)
      const orbitSpeed = 0.005;
      const offset = camera.position.clone().sub(controls.target);
      const radius = Math.max(0.5, offset.length());
      let theta = Math.atan2(offset.x, offset.z);
      let phi = Math.acos(Math.max(-1, Math.min(1, offset.y / radius)));

      theta -= dx * orbitSpeed;
      phi -= dy * orbitSpeed;
      phi = Math.max(0.05, Math.min(Math.PI - 0.05, phi));

      offset.x = radius * Math.sin(phi) * Math.sin(theta);
      offset.y = radius * Math.cos(phi);
      offset.z = radius * Math.sin(phi) * Math.cos(theta);

      camera.position.copy(controls.target).add(offset);
      camera.lookAt(controls.target);
      syncCameraEuler();
      renderer.domElement.style.cursor = 'grab';
    } else if (isDragging && dragObject) {
      // Seçili Ekipmanı Rayı Üzerinde Kaydırma
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      if (raycaster.ray.intersectPlane(dragPlane, dragIntersection)) {
        let targetX = dragObject.userData.lockedX ? dragObject.position.x : (dragIntersection.x + dragOffset.x);
        let targetZ = dragObject.userData.lockedZ ? dragObject.position.z : (dragIntersection.z + dragOffset.z);
        let targetY = dragObject.position.y;
        if ((dragObject.userData.type === 'platform' || dragObject.userData.type === 'rru') && !dragObject.userData.isOffsetArmModule && !dragObject.userData.isInclinedPipe && !dragObject.userData.isOffsetCarrier && !dragObject.userData.isFreestanding) {
          if (state.currentArea === 'alan4') {
            if (dragObject.userData.isCylinderMatsing) {
              targetZ = dragObject.userData.initialZ !== undefined ? dragObject.userData.initialZ : 0.55;
              targetY = dragObject.userData.initialY !== undefined ? dragObject.userData.initialY : 19.05;
              if (!dragObject.userData.lockedX) targetX = Math.max(-24.5, Math.min(24.5, dragIntersection.x + dragOffset.x));
            } else if (dragObject.userData.isScoreboardRRU) {
              targetZ = dragObject.userData.initialZ !== undefined ? dragObject.userData.initialZ : -2.20;
              targetY = dragObject.userData.initialY !== undefined ? dragObject.userData.initialY : 21.70;
              if (!dragObject.userData.lockedX) targetX = Math.max(-6.2, Math.min(6.2, dragIntersection.x + dragOffset.x));
            } else {
              if (dragObject.userData.lockedZ) targetZ = -0.70;
              if (!dragObject.userData.lockedX) targetX = Math.max(-12.0, Math.min(12.0, dragIntersection.x + dragOffset.x));
            }
          } else if (state.currentArea === 'alan1') {
            if (dragObject.userData.lockedZ) targetZ = -1.1855;
            if (!dragObject.userData.lockedX) targetX = Math.max(-9.0, Math.min(9.0, dragIntersection.x + dragOffset.x));
          } else if (state.currentArea === 'alan2' || state.currentArea === 'alan3') {
            if (!dragObject.userData.lockedZ) targetZ = Math.max(-9.0, Math.min(9.0, dragIntersection.z + dragOffset.z));
          }
        }

        if (!hasCollision(dragObject, targetX, targetY, targetZ)) {
          dragObject.position.x = targetX;
          dragObject.position.y = targetY;
          dragObject.position.z = targetZ;
          const inputX = document.getElementById('prop-pos-x');
          const inputY = document.getElementById('prop-pos-y');
          const inputZ = document.getElementById('prop-pos-z');
          if (inputX) inputX.value = dragObject.position.x.toFixed(3);
          if (inputY) inputY.value = dragObject.position.y.toFixed(3);
          if (inputZ) inputZ.value = dragObject.position.z.toFixed(3);
          updateBOM();
        }
      }
      renderer.domElement.style.cursor = 'ew-resize';
    } else {
      // SOL TIK İLE AKICI VE KESİNTİSİZ SERBEST AÇI DEĞİŞTİRME (First-Person Look)
      // Kamera pozisyonunu korur, sadece bakış açısını (Yaw & Pitch) çevirir (asla takılmaz ve sapıtmaz)
      const lookSpeed = 0.003;
      cameraEuler.y -= dx * lookSpeed;
      cameraEuler.x -= dy * lookSpeed;

      // Bakış açısının ters takla atmaması için dikey açıyı sınırla (~88.5 derece)
      const maxPitch = 1.545;
      cameraEuler.x = Math.max(-maxPitch, Math.min(maxPitch, cameraEuler.x));

      camera.quaternion.setFromEuler(cameraEuler);
      updateCameraDirectionTarget();
      renderer.domElement.style.cursor = 'grabbing';
    }
  } else if (pointerButton === 1) {
    // Orta Tuş: Yörüngesel Dönüş (Orbit)
    const orbitSpeed = 0.005;
    const offset = camera.position.clone().sub(controls.target);
    const radius = Math.max(0.5, offset.length());
    let theta = Math.atan2(offset.x, offset.z);
    let phi = Math.acos(Math.max(-1, Math.min(1, offset.y / radius)));

    theta -= dx * orbitSpeed;
    phi -= dy * orbitSpeed;
    phi = Math.max(0.05, Math.min(Math.PI - 0.05, phi));

    offset.x = radius * Math.sin(phi) * Math.sin(theta);
    offset.y = radius * Math.cos(phi);
    offset.z = radius * Math.sin(phi) * Math.cos(theta);

    camera.position.copy(controls.target).add(offset);
    camera.lookAt(controls.target);
    syncCameraEuler();
    renderer.domElement.style.cursor = 'grab';
  } else if (pointerButton === 2) {
    // Sağ Tık: Ekranda Serbest Kaydırma (PAN)
    const panSpeed = 0.015;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0);

    camera.position.addScaledVector(right, -dx * panSpeed);
    camera.position.addScaledVector(up, dy * panSpeed);
    updateCameraDirectionTarget();
    renderer.domElement.style.cursor = 'move';
  }
});

window.addEventListener('pointerup', () => {
  if (!isPointerDown) return;
  isPointerDown = false;
  renderer.domElement.style.cursor = 'default';

  if (isDragging) {
    isDragging = false;
    dragObject = null;
  }

  // Temiz tek tıklama (sürükleme eşiği 4px aşılmadıysa): Seçim veya kapı aç/kapa
  if (!isDragMode && pointerButton === 0) {
    let handledDoor = false;
    const activeDoors = (state.currentArea === 'alan4') ? alan4SlidingDoors : ((state.currentArea === 'alan3') ? alan3SlidingDoors : alan2SlidingDoors);
    if (activeDoors && activeDoors.length > 0) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((pointerDownPos.x - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((pointerDownPos.y - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const doorHits = raycaster.intersectObjects(activeDoors, true);
      if (doorHits.length > 0) {
        let doorObj = doorHits[0].object;
        while (doorObj.parent && !doorObj.userData.isSlidingDoor) {
          doorObj = doorObj.parent;
        }
        if (doorObj.userData && doorObj.userData.isSlidingDoor) {
          if (!doorObj.userData.isOpen) {
            doorObj.userData.targetX = doorObj.userData.openX;
            doorObj.userData.isOpen = true;
          } else {
            doorObj.userData.targetX = doorObj.userData.closedX;
            doorObj.userData.isOpen = false;
          }
          handledDoor = true;
        }
      }
    }

    if (!handledDoor) {
      if (clickedInteractiveObj) {
        selectObject(clickedInteractiveObj);
      } else {
        selectObject(null);
      }
    }
  }

  isDragMode = false;
  clickedInteractiveObj = null;
});

// Fare Tekerleği ile Akıcı Uçuş / Yakınlaşma (Continuous Flight Zoom Dolly)
renderer.domElement.addEventListener('wheel', (event) => {
  event.preventDefault();
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const zoomStep = event.shiftKey ? 4.0 : 1.2;
  const direction = event.deltaY < 0 ? 1 : -1;

  camera.position.addScaledVector(forward, direction * zoomStep);
  updateCameraDirectionTarget();
}, { passive: false });

// Spawn Buttons Listeners
document.getElementById('btn-add-kiris1').addEventListener('click', spawnKiris1);
document.getElementById('btn-add-kiris2').addEventListener('click', spawnKiris2);
document.getElementById('btn-add-tabla1').addEventListener('click', spawnTabla1);
document.getElementById('btn-add-tabla2').addEventListener('click', spawnTabla2);
document.getElementById('btn-add-tabla3').addEventListener('click', spawnTabla3);

document.getElementById('btn-add-rru-blok').addEventListener('click', spawnRRUBlok);
document.getElementById('btn-add-rack-blok').addEventListener('click', spawnRackBlok);

const btnMatsingOffset = document.getElementById('btn-add-matsing-offset-kompleks');
if (btnMatsingOffset) btnMatsingOffset.addEventListener('click', spawnMatsingDiagonalOffsetAssembly);

const btnMatsingMidOffset = document.getElementById('btn-add-matsing-mid-offset-kompleks');
if (btnMatsingMidOffset) btnMatsingMidOffset.addEventListener('click', spawnMatsingTrussMidOffsetAssembly);

const btn4PoiBlok = document.getElementById('btn-add-4poi-rack-blok');
if (btn4PoiBlok) btn4PoiBlok.addEventListener('click', spawn4PoiRackBlok);

const btn42UPoiBlok = document.getElementById('btn-add-42u-poi-blok');
if (btn42UPoiBlok) btn42UPoiBlok.addEventListener('click', spawn42UPoiRackBlok);

const btn20UPoiBlok = document.getElementById('btn-add-20u-poi-blok');
if (btn20UPoiBlok) btn20UPoiBlok.addEventListener('click', spawn20UPoiRackBlok);

const btnTT5527 = document.getElementById('btn-add-tt-5li-5527-blok');
if (btnTT5527) btnTT5527.addEventListener('click', spawnTT5li5527Blok);

const btnTT5818w = document.getElementById('btn-add-tt-5li-5818w-blok');
if (btnTT5818w) btnTT5818w.addEventListener('click', spawnTT5li5818WBlok);

const btnVoda3liRRU = document.getElementById('btn-add-voda-3li-rru-blok');
if (btnVoda3liRRU) btnVoda3liRRU.addEventListener('click', spawnVoda3liRRUBlok);

const btnVoda5liRRU = document.getElementById('btn-add-voda-5li-rru-blok');
if (btnVoda5liRRU) btnVoda5liRRU.addEventListener('click', spawnVoda5liRRUBlok);

const btnTCellOffset = document.getElementById('btn-add-tcell-offset-blok');
if (btnTCellOffset) btnTCellOffset.addEventListener('click', spawnTCellOffsetBlok);

const btnAlan2Karma = document.getElementById('btn-add-alan2-karma-rru-blok');
if (btnAlan2Karma) btnAlan2Karma.addEventListener('click', spawnAlan2KarmaRRUBlok);

const btnAlan1OzelKarma = document.getElementById('btn-add-alan1-ozel-karma-blok');
if (btnAlan1OzelKarma) btnAlan1OzelKarma.addEventListener('click', spawnAlan1OzelKarmaBlok);

const btnAlan1OzelKarma13 = document.getElementById('btn-add-alan1-13rru-ozel-karma-blok');
if (btnAlan1OzelKarma13) btnAlan1OzelKarma13.addEventListener('click', spawnAlan1OzelKarma13RRUBlok);

const btnAlan1OzelKarma7Boru = document.getElementById('btn-add-alan1-7boru-ozel-karma-blok');
if (btnAlan1OzelKarma7Boru) btnAlan1OzelKarma7Boru.addEventListener('click', spawnAlan1OzelKarma7Boru13RRUBlok);

const btnAlan4Plat = document.getElementById('btn-add-alan4-cember-platform-blok');
if (btnAlan4Plat) btnAlan4Plat.addEventListener('click', spawnAlan4CemberPlatformBlok);

const btnAlan4OzelKarma = document.getElementById('btn-add-alan4-ozel-karma-blok');
    const btnAlan2OzelKarma = document.getElementById('btn-add-alan2-ozel-karma-blok');
if (btnAlan4OzelKarma) btnAlan4OzelKarma.addEventListener('click', spawnAlan4OzelKarmaBlok);
const globalBtnAlan2OzelKarma = document.getElementById('btn-add-alan2-ozel-karma-blok');
if (globalBtnAlan2OzelKarma) globalBtnAlan2OzelKarma.addEventListener('click', spawnAlan2OzelKarmaBlok);

const btnIkiliPoiBlok = document.getElementById('btn-add-ikili-42u-poi-blok');
if (btnIkiliPoiBlok) btnIkiliPoiBlok.addEventListener('click', spawnDual42UPoiRackBlok);

const btnAlan4CiftRRU = document.getElementById('btn-add-alan4-cift-rru-kompleks');
  if (btnAlan4CiftRRU) btnAlan4CiftRRU.addEventListener('click', spawnAlan4CiftRRUKompleksBlok);
  const btnAlan2Kediyolu42U = document.getElementById('btn-add-alan2-kediyolu-42u-kompleks');
  if (btnAlan2Kediyolu42U) btnAlan2Kediyolu42U.addEventListener('click', spawnAlan2Kediyolu42UKompleksBlok);
  const btnAlan2Karsilikli = document.getElementById('btn-add-alan2-karsilikli-rru');
  if (btnAlan2Karsilikli) btnAlan2Karsilikli.addEventListener('click', spawnAlan2Karsilikli11BoruRRUBlok);
  
  
  

const btnAlan4KediyoluTabla = document.getElementById('btn-add-alan4-kediyolu-tabla-blok');
if (btnAlan4KediyoluTabla) btnAlan4KediyoluTabla.addEventListener('click', spawnAlan4KediyoluTablaBlok);

const btnAlan4Kediyolu42U = document.getElementById('btn-add-alan4-kediyolu-42u-kompleks');
if (btnAlan4Kediyolu42U) btnAlan4Kediyolu42U.addEventListener('click', spawnAlan4Kediyolu42UKompleksBlok);

const btnSbRruTcell = document.getElementById('btn-add-sb-rru-turkcell');
if (btnSbRruTcell) btnSbRruTcell.addEventListener('click', () => spawnScoreboardRRU('turkcell'));

const btnSbRruVdf = document.getElementById('btn-add-sb-rru-vodafone');
if (btnSbRruVdf) btnSbRruVdf.addEventListener('click', () => spawnScoreboardRRU('vodafone'));

const btnSbRruTT = document.getElementById('btn-add-sb-rru-tt');
if (btnSbRruTT) btnSbRruTT.addEventListener('click', () => spawnScoreboardRRU('tt'));

const btnSbMatsing = document.getElementById('btn-add-sb-matsing-cylinder');
if (btnSbMatsing) btnSbMatsing.addEventListener('click', () => spawnScoreboardMatsingCylinderAssembly());

document.getElementById('btn-add-rru-blok-korkuluklu').addEventListener('click', spawnRRUBlokKorkuluklu);
document.getElementById('btn-add-rack-blok-korkuluklu').addEventListener('click', spawnRackBlokKorkuluklu);

const btnRruSaha = document.getElementById('btn-add-rru-saha-blok-alan2');
if (btnRruSaha) btnRruSaha.addEventListener('click', spawnRRUSahaBlokAlan2);

const btnRruSaha120 = document.getElementById('btn-add-rru-saha-blok-120');
if (btnRruSaha120) btnRruSaha120.addEventListener('click', spawnRRUSahaBlok120);

const btnOffsetRight = document.getElementById('btn-add-offset-arm-right');
if (btnOffsetRight) btnOffsetRight.addEventListener('click', spawnOffsetArmPipeRight);

const btnOffsetLeft = document.getElementById('btn-add-offset-arm-left');
if (btnOffsetLeft) btnOffsetLeft.addEventListener('click', spawnOffsetArmPipeLeft);

function updateAreaButtonVisibility() {
  const isAlan1 = (state.currentArea === 'alan1');
  const isAlan4 = (state.currentArea === 'alan4');
  const isAlan2 = (state.currentArea === 'alan2');
  const isAlan3 = (state.currentArea === 'alan3');
  
  const btnRru = document.getElementById('btn-add-rru-blok');
  const btnRack = document.getElementById('btn-add-rack-blok');
  const btnPoiBlok = document.getElementById('btn-add-42u-poi-blok');
  const btn4PoiBlok = document.getElementById('btn-add-4poi-rack-blok');
  if (btn4PoiBlok) btn4PoiBlok.style.display = 'flex';
  const btnTT5527 = document.getElementById('btn-add-tt-5li-5527-blok');
  const btnTT5818w = document.getElementById('btn-add-tt-5li-5818w-blok');
  const btnVoda3li = document.getElementById('btn-add-voda-3li-rru-blok');
  const btnVoda5li = document.getElementById('btn-add-voda-5li-rru-blok');
  const btnTCellOffset = document.getElementById('btn-add-tcell-offset-blok');
  const btnRruK = document.getElementById('btn-add-rru-blok-korkuluklu');
  const btnRackK = document.getElementById('btn-add-rack-blok-korkuluklu');
  
  const btnSaha120 = document.getElementById('btn-add-rru-saha-blok-120');
  const btnAlan1OzelKarma = document.getElementById('btn-add-alan1-ozel-karma-blok');
  const btnAlan1OzelKarma13 = document.getElementById('btn-add-alan1-13rru-ozel-karma-blok');
  const btnAlan1OzelKarma7Boru = document.getElementById('btn-add-alan1-7boru-ozel-karma-blok');
  
  const btnAlan4Plat = document.getElementById('btn-add-alan4-cember-platform-blok');
  const btnAlan4OzelKarma = document.getElementById('btn-add-alan4-ozel-karma-blok');
  const btnAlan4CiftRRU = document.getElementById('btn-add-alan4-cift-rru-kompleks');
  const btnAlan4KediyoluTabla = document.getElementById('btn-add-alan4-kediyolu-tabla-blok');
  const btnAlan4Kediyolu42U = document.getElementById('btn-add-alan4-kediyolu-42u-kompleks');
  const btnMatsingOffset = document.getElementById('btn-add-matsing-offset-kompleks');

  if (btnSaha120) {
    const nameSpan = btnSaha120.querySelector('.name');
    if (nameSpan) nameSpan.textContent = 'RRU Saha Blok 120cm (Alan 1)';
    btnSaha120.style.display = isAlan1 ? 'flex' : 'none';
  }

const addAlan2Alternatif2RRUBtn = document.getElementById('btn-add-alan2-alternatif2-rru');
if (addAlan2Alternatif2RRUBtn) {
  addAlan2Alternatif2RRUBtn.addEventListener('click', () => {
    spawnAlan2Alternatif2RRUBlok();
  });
}

  const btn20UPoi = document.getElementById('btn-add-20u-poi-blok');
  if (btn20UPoi) {
    const nameSpan = btn20UPoi.querySelector('.name');
    if (nameSpan) {
      nameSpan.textContent = isAlan4 ? '20U Rack + 3 POI Blok' : 'POI Rack + 5 POI Blok (Alan 1)';
    }
  }

  if (btnRru) btnRru.style.display = 'flex';
  if (btnRack) btnRack.style.display = 'flex';
  if (btnPoiBlok) {
    const nameSpan = btnPoiBlok.querySelector('.name');
    if (nameSpan) {
      nameSpan.textContent = isAlan2 ? '30U POI Rack (4x POI) (Alan 2)' : (isAlan4 ? '42U POI Rack (6x POI) (Alan 4)' : '42U POI Rack Blok (6x POI)');
    }
    btnPoiBlok.style.display = 'flex';
  }
  if (btnTT5527) btnTT5527.style.display = 'flex';
  if (btnTT5818w) btnTT5818w.style.display = 'flex';
  if (btnVoda3li) btnVoda3li.style.display = 'flex';
  if (btnVoda5li) btnVoda5li.style.display = 'flex';
  if (btnTCellOffset) btnTCellOffset.style.display = 'flex';
  if (btnRruK) btnRruK.style.display = 'flex';
  if (btnRackK) btnRackK.style.display = 'flex';
  if (btnMatsingOffset) btnMatsingOffset.style.display = 'flex';
  if (btnMatsingMidOffset) {
    btnMatsingMidOffset.style.display = 'flex';
    const nameSpan = btnMatsingMidOffset.querySelector('.name');
    if (nameSpan) {
      nameSpan.textContent = isAlan3 
        ? 'Spot Beam 30/30 Çatı Taşıyıcısı Asılı Montaj (Alan 3)' 
        : 'Matsing 4-Beam Çatı Taşıyıcısı Asılı Montaj (Ara Bölge)';
    }
  }
  
  if (btnAlan1OzelKarma) btnAlan1OzelKarma.style.display = isAlan1 ? 'flex' : 'none';
  if (btnAlan1OzelKarma13) btnAlan1OzelKarma13.style.display = isAlan1 ? 'flex' : 'none';
  if (btnAlan1OzelKarma7Boru) btnAlan1OzelKarma7Boru.style.display = isAlan1 ? 'flex' : 'none';

  if (btnAlan4Plat) btnAlan4Plat.style.display = 'none';
  if (btnAlan4OzelKarma) btnAlan4OzelKarma.style.display = isAlan4 ? 'flex' : 'none';
    if (btnAlan2OzelKarma) btnAlan2OzelKarma.style.display = (isAlan2 || isAlan3) ? 'flex' : 'none';
    const btnIkiliPoi = document.getElementById('btn-add-ikili-42u-poi-blok');
    if (btnIkiliPoi) btnIkiliPoi.style.display = (isAlan2 || isAlan3) ? 'flex' : 'none';
  if (btnAlan4CiftRRU) btnAlan4CiftRRU.style.display = isAlan4 ? 'flex' : 'none';
  const btnAlan2Kediyolu42U = document.getElementById('btn-add-alan2-kediyolu-42u-kompleks');
  if (btnAlan2Kediyolu42U) {
    const nameSpan = btnAlan2Kediyolu42U.querySelector('.name');
    if (nameSpan) nameSpan.textContent = '30U POI Rack (4 POI) (Alan 2)';
    btnAlan2Kediyolu42U.style.display = (isAlan2 || isAlan3) ? 'flex' : 'none';
  }
  const btnAlan2Karsilikli = document.getElementById('btn-add-alan2-karsilikli-rru');
  if (btnAlan2Karsilikli) btnAlan2Karsilikli.style.display = (isAlan2 || isAlan3) ? 'flex' : 'none';
  
  if (btnAlan4KediyoluTabla) btnAlan4KediyoluTabla.style.display = 'none';
  if (btnAlan4Kediyolu42U) btnAlan4Kediyolu42U.style.display = isAlan4 ? 'flex' : 'none';

  // Skorboard Kirişi Tekli RRU Operatör Butonları devre dışı bırakıldı (Alternatif 2 senaryosu aktif)
  const btnSbTcell = document.getElementById('btn-add-sb-rru-turkcell');
  const btnSbVdf = document.getElementById('btn-add-sb-rru-vodafone');
  const btnSbTT = document.getElementById('btn-add-sb-rru-tt');
  if (btnSbTcell) btnSbTcell.style.display = 'none';
  if (btnSbVdf) btnSbVdf.style.display = 'none';
  if (btnSbTT) btnSbTT.style.display = 'none';
  const btnSbMatsingElem = document.getElementById('btn-add-sb-matsing-cylinder');
  if (btnSbMatsingElem) btnSbMatsingElem.style.display = isAlan4 ? 'flex' : 'none';

  // Alan 2 (Alan 4) Kedi Yolu Tablalı 4 Boru 7 RRU Bloğu
  if (addAlan2Alternatif2RRUBtn) addAlan2Alternatif2RRUBtn.style.display = isAlan4 ? 'flex' : 'none';
}

function setPlatformGroupVisibility(platforms, isVisible) {
  platforms.forEach(p => {
    p.visible = isVisible;
    p.traverse(child => {
      child.visible = isVisible;
    });
  });
}

// ----------------------------------------------------
// 3D Dimensions Interactive Preview Modal System
// ----------------------------------------------------
let previewScene = null;
let previewCamera = null;
let previewRenderer = null;
let previewControls = null;
let previewModel = null;

function initPreviewThree() {
  const canvas = document.getElementById('dim-3d-canvas');
  if (!canvas) return;

  previewScene = new THREE.Scene();
  previewScene.background = new THREE.Color(0x020617);

  previewCamera = new THREE.PerspectiveCamera(45, 360 / 340, 0.1, 50);
  previewCamera.position.set(1.8, 1.4, 2.2);

  previewRenderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  previewRenderer.setSize(360, 340);
  previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  previewRenderer.shadowMap.enabled = true;

  const ambLight = new THREE.AmbientLight(0xffffff, 0.9);
  previewScene.add(ambLight);

  const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight1.position.set(5, 8, 5);
  previewScene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.5);
  dirLight2.position.set(-5, -2, -5);
  previewScene.add(dirLight2);

  const grid = new THREE.GridHelper(4, 16, 0x0284c7, 0x1e293b);
  grid.position.y = -0.005;
  previewScene.add(grid);

  previewControls = new OrbitControls(previewCamera, previewRenderer.domElement);
  previewControls.enableDamping = true;
  previewControls.dampingFactor = 0.05;
  previewControls.autoRotate = true;
  previewControls.autoRotateSpeed = 1.5;

  function animatePreview() {
    requestAnimationFrame(animatePreview);
    if (previewControls) previewControls.update();
    if (previewRenderer && previewScene && previewCamera) {
      previewRenderer.render(previewScene, previewCamera);
    }
  }
  animatePreview();
}

function openDimensionsModal(target) {
  const modal = document.getElementById('dimensions-modal');
  const container = document.getElementById('dim-specs-content');
  const titleElem = document.getElementById('modal-dim-title');
  if (!modal || !container) return;

  if (!previewRenderer) {
    initPreviewThree();
  }

  let name = target.userData ? target.userData.name : target.name;
  let category = target.userData ? target.userData.category : target.category;
  let blockType = target.userData ? target.userData.blockType : (target.blockType || target.id);
  
  let W = 0.60, H = 1.20, D = 0.60, weight = 50;

  if (target.userData && target.userData.width) {
    W = target.userData.width;
    H = target.userData.height;
    D = target.userData.depth;
    weight = target.userData.weight || 50;
  } else if (target.width) {
    W = target.width;
    H = target.height;
    D = target.depth;
    weight = target.weight || 50;
  } else if (target.isMesh || target.isGroup) {
    const box = new THREE.Box3().setFromObject(target);
    const size = box.getSize(new THREE.Vector3());
    W = size.x;
    H = size.y;
    D = size.z;
  }

  if (titleElem) {
    titleElem.innerHTML = `🔍 ${name} - Ürün Ölçüleri & 3D Görünüm`;
  }

  // Clear previous preview model
  if (previewModel) {
    previewScene.remove(previewModel);
    previewModel = null;
  }

  if (target.isGroup || target.isMesh) {
    previewModel = target.clone(true);
  } else {
    previewModel = buildCustomEquipmentModel(target);
  }

  // Make all sub-children visible in preview
  previewModel.visible = true;
  previewModel.traverse(child => child.visible = true);

  // Center model at origin
  const box = new THREE.Box3().setFromObject(previewModel);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  previewModel.position.sub(center);
  previewModel.position.y += size.y / 2;

  previewScene.add(previewModel);

  const maxDim = Math.max(size.x, size.y, size.z, 0.4);
  previewCamera.position.set(maxDim * 1.6, maxDim * 1.2, maxDim * 1.8);
  if (previewControls) {
    previewControls.target.set(0, size.y / 2, 0);
    previewControls.update();
  }

  const widthCm = (W * 100).toFixed(1);
  const heightCm = (H * 100).toFixed(1);
  const depthCm = (D * 100).toFixed(1);

  let categoryBadge = category || 'Kabin / Blok';
  let categoryColor = '#0284c7';
  if (category === 'Turkcell') categoryColor = '#0284c7';
  else if (category === 'Vodafone') categoryColor = '#dc2626';
  else if (category === 'Türk Telekom') categoryColor = '#0891b2';
  else if (category === 'POI') categoryColor = '#ea580c';
  else if (category === 'Rectifier') categoryColor = '#38bdf8';

  container.innerHTML = `
    <div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <h4 style="margin: 0; font-size: 15px; color: #f8fafc; font-weight: bold;">${name}</h4>
        <span style="background: ${categoryColor}; color: #fff; padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: bold;">
          ${categoryBadge}
        </span>
      </div>
      <div style="font-size: 12px; color: #94a3b8; margin-bottom: 12px;">
        Modül Kodu / Tipi: <strong style="color: #cbd5e1;">${blockType || 'Standart Kabin / Blok'}</strong>
      </div>
    </div>

    <!-- Dimension Spec Cards Grid -->
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
      <div style="background: #1e293b; padding: 10px 12px; border-radius: 8px; border: 1px solid #334155;">
        <span style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 2px;">↔️ Genişlik (X)</span>
        <strong style="font-size: 15px; color: #38bdf8;">${widthCm} cm</strong> <span style="font-size: 11px; color: #64748b;">(${W.toFixed(3)} m)</span>
      </div>

      <div style="background: #1e293b; padding: 10px 12px; border-radius: 8px; border: 1px solid #334155;">
        <span style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 2px;">↕️ Yükseklik (Y)</span>
        <strong style="font-size: 15px; color: #38bdf8;">${heightCm} cm</strong> <span style="font-size: 11px; color: #64748b;">(${H.toFixed(3)} m)</span>
      </div>

      <div style="background: #1e293b; padding: 10px 12px; border-radius: 8px; border: 1px solid #334155;">
        <span style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 2px;">↗️ Derinlik (Z)</span>
        <strong style="font-size: 15px; color: #38bdf8;">${depthCm} cm</strong> <span style="font-size: 11px; color: #64748b;">(${D.toFixed(3)} m)</span>
      </div>

      <div style="background: #1e293b; padding: 10px 12px; border-radius: 8px; border: 1px solid #334155;">
        <span style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 2px;">⚖️ Ekipman Ağırlığı</span>
        <strong style="font-size: 15px; color: #10b981;">${weight} kg</strong>
      </div>
    </div>

    <!-- Technical Spec Info Box -->
    <div style="background: rgba(2, 132, 199, 0.1); border: 1px solid rgba(2, 132, 199, 0.3); padding: 10px 12px; border-radius: 8px; font-size: 11px; color: #e2e8f0; line-height: 1.5;">
      ℹ️ <strong>Ölçek & Statik Hesaplama Notları:</strong><br>
      • 3D model, teknik çizim parametrelerine 1:1 ölçekli olarak uymaktadır.<br>
      • Ekipmanın statik ağırlığı sahne BOQ listesine doğrudan yansıtılır.
    </div>
  `;

  modal.style.display = 'flex';
}

const closeDimModalBtn = document.getElementById('btn-close-dim-modal');
const closeDimModalFooterBtn = document.getElementById('btn-close-dim-modal-footer');
const maxDimModalBtn = document.getElementById('btn-maximize-dim-modal');

const closeDimModal = () => {
  const modal = document.getElementById('dimensions-modal');
  if (modal) {
    modal.style.display = 'none';
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent && modalContent.classList.contains('maximized')) {
      modalContent.classList.remove('maximized');
      if (maxDimModalBtn) {
        maxDimModalBtn.textContent = '⛶';
        maxDimModalBtn.title = 'Tam Ekran Büyüt';
      }
    }
  }
  if (previewScene && previewModel) {
    previewScene.remove(previewModel);
    previewModel = null;
  }
};

if (closeDimModalBtn) closeDimModalBtn.addEventListener('click', closeDimModal);
if (closeDimModalFooterBtn) closeDimModalFooterBtn.addEventListener('click', closeDimModal);

if (maxDimModalBtn) {
  maxDimModalBtn.addEventListener('click', () => {
    const modalContent = maxDimModalBtn.closest('.modal-content');
    if (modalContent) {
      modalContent.classList.toggle('maximized');
      const isMax = modalContent.classList.contains('maximized');
      maxDimModalBtn.textContent = isMax ? '🗗' : '⛶';
      maxDimModalBtn.title = isMax ? 'Küçült' : 'Tam Ekran Büyüt';
      if (previewRenderer && previewCamera) {
        const canvas = document.getElementById('dim-3d-canvas');
        if (canvas && canvas.parentElement) {
          const w = canvas.parentElement.clientWidth;
          const h = canvas.parentElement.clientHeight;
          previewCamera.aspect = w / h;
          previewCamera.updateProjectionMatrix();
          previewRenderer.setSize(w, h);
        }
      }
    }
  });
}

// Area Selection Handler (Alan-1 / Alan-4)
const selectAreaElem = document.getElementById('select-area');
if (selectAreaElem) {
  selectAreaElem.addEventListener('change', (e) => {
    const selectedArea = e.target.value;
    state.currentArea = selectedArea;
    
    updateAreaButtonVisibility();

    const alan2Group = scene.getObjectByName('alan2Structure');
    const alan4Group = scene.getObjectByName('alan4Structure');
    const alan3Group = scene.getObjectByName('alan3Structure');

    renderAreaFocusButtons(selectedArea);

    if (selectedArea === 'alan4') {
      if (alan2Group) alan2Group.visible = false;
      if (alan3Group) alan3Group.visible = false;
      if (alan4Group) alan4Group.visible = true;
      setCameraView(-0.20, 29.03, -17.54, -0.32, 25.93, -8.03);
    } else if (selectedArea === 'alan3') {
      if (alan2Group) alan2Group.visible = false;
      if (alan3Group) alan3Group.visible = true;
      if (alan4Group) alan4Group.visible = false;
      setCameraView(-5.85, 8.33, 33.95, 2.24, 5.87, 28.61);
    } else { // default 'alan2' (Alan 1 & Alan 3)
      if (alan2Group) alan2Group.visible = true;
      if (alan3Group) alan3Group.visible = false;
      if (alan4Group) alan4Group.visible = false;
      setCameraView(15.00, 10.00, 40.00, 15.00, 0.00, 0.00);
    }

    setPlatformGroupVisibility(state.alan1Platforms, selectedArea === 'alan1');
    setPlatformGroupVisibility(state.alan2Platforms, selectedArea === 'alan2');
    setPlatformGroupVisibility(state.alan4Platforms, selectedArea === 'alan4');
      setPlatformGroupVisibility(state.alan3Platforms, selectedArea === 'alan3');

    selectObject(null);
    updateBOM();
  });
}

// (EQUIPMENT_CATALOG definition moved to the top of the file)

// Dedicated 3D Model Builder for PROSE CB-12 POI Combiners (Matching exact PDF Drawing)
function buildProsePoiModel(item) {
  const group = new THREE.Group();
  
  // PDF Mechanical Specs:
  // Dimension (H x W x D): 350 x 400 x 260 mm (0.35m x 0.40m x 0.26m)
  // Total width with side mounting flanges: 480 mm (0.48m)
  // Mounting slot hole distance: 446 mm (0.446m) x 240 mm
  // Weight: <= 22 kg
  // Connectors: 12 BTS Ports (4.3-10 female) + 4 ANT Ports (4.3-10 female)
  
  const H = item.height || 0.35;
  const W = item.width || 0.40;
  const D = item.depth || 0.26;
  const weight = item.weight || 22;

  group.userData = {
    id: state.nextId++,
    type: 'rru',
    blockType: 'prose-poi-model',
    catalogId: item.id,
    category: item.category,
    name: item.name,
    width: W,
    height: H,
    depth: D,
    weight: weight,
    interactive: true,
    locked: false,
    allowPassThrough: true
  };

  const casingMat = new THREE.MeshStandardMaterial({ 
    color: 0x94a3b8, 
    metalness: 0.6, 
    roughness: 0.3 
  });
  
  const bracketMat = new THREE.MeshStandardMaterial({ 
    color: 0x334155, 
    metalness: 0.7, 
    roughness: 0.3 
  });

  const connectorMat = new THREE.MeshStandardMaterial({ 
    color: 0xd97706, 
    metalness: 0.9, 
    roughness: 0.1 
  });

  const logoMat = new THREE.MeshStandardMaterial({ 
    color: 0xea580c, 
    metalness: 0.3, 
    roughness: 0.4 
  });

  // Inner Container for Rotated Geometry
  const poiContainer = new THREE.Group();

  // 1. Main Combiner Chassis Enclosure Box (350mm H x 400mm W x 260mm D)
  const bodyGeo = new THREE.BoxGeometry(W, H, D);
  const body = new THREE.Mesh(bodyGeo, casingMat);
  body.castShadow = true;
  body.receiveShadow = true;
  body.name = "poi_body";
  poiContainer.add(body);

  // Front Panel Bezel / PROSE Logo Accent Plate
  const logoGeo = new THREE.BoxGeometry(0.18, 0.04, 0.004);
  const logo = new THREE.Mesh(logoGeo, logoMat);
  logo.position.set(0, H/2 - 0.05, D/2 + 0.002);
  poiContainer.add(logo);

  // 2. Wall / Rack Side Mounting Flanges (Duvar/Rack Montaj Kulakları)
  // Left and Right mounting ears (Total width across ears: 480mm -> 40mm extension per side)
  const flangeWidth = 0.04;
  const flangeGeo = new THREE.BoxGeometry(flangeWidth, H, D * 0.85);
  
  const flangeLeft = new THREE.Mesh(flangeGeo, bracketMat);
  flangeLeft.position.set(-W/2 - flangeWidth/2, 0, 0);
  flangeLeft.castShadow = true;
  poiContainer.add(flangeLeft);

  const flangeRight = new THREE.Mesh(flangeGeo, bracketMat);
  flangeRight.position.set(W/2 + flangeWidth/2, 0, 0);
  flangeRight.castShadow = true;
  poiContainer.add(flangeRight);

  // Mounting Hole Slots (Ø12 mm slots at 446mm hole-center distance)
  const slotGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.01, 12);
  const slotMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });

  for (let side of [-1, 1]) {
    const xPos = side * (W/2 + flangeWidth/2);
    for (let yOffset of [-H/2 + 0.055, H/2 - 0.055]) {
      const slot = new THREE.Mesh(slotGeo, slotMat);
      slot.rotation.x = Math.PI / 2;
      slot.position.set(xPos, yOffset, 0);
      poiContainer.add(slot);
    }
  }

  // 3. Connector Panel (12 BTS Ports + 4 ANT Ports = 16 RF 4.3-10 Female Connectors) - Initial layout on top face
  const connGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.025, 16);
  
  // 12 BTS ports (2 rows x 6 columns on top face)
  const startX = -W * 0.35;
  const stepX = (W * 0.7) / 5;
  
  for (let row = 0; row < 2; row++) {
    const zPos = -D/2 + 0.06 + row * 0.06;
    for (let col = 0; col < 6; col++) {
      const conn = new THREE.Mesh(connGeo, connectorMat);
      conn.position.set(startX + col * stepX, H/2 + 0.0125, zPos);
      poiContainer.add(conn);
    }
  }

  // 4-6 ANT ports (1 row on front-top area)
  const antPortCount = item.antPortCount || 6;
  const antStartX = -W * 0.32;
  const antStepX = (W * 0.64) / (antPortCount - 1);
  const antZ = D/2 - 0.06;
  
  for (let col = 0; col < antPortCount; col++) {
    const conn = new THREE.Mesh(connGeo, connectorMat);
    conn.position.set(antStartX + col * antStepX, H/2 + 0.0125, antZ);
    poiContainer.add(conn);
  }

  // Rotate the entire product 90 degrees around X axis so the top connector face points FRONT (+Z)
  poiContainer.rotation.x = Math.PI / 2;
  group.add(poiContainer);

  return group;
}

function buildRectifier20UModel(item) {
  const group = new THREE.Group();
  const W = (item && item.width) ? item.width : 0.60;
  const H = (item && item.height) ? item.height : 1.30;
  const D = (item && item.depth) ? item.depth : 0.60;
  const weight = (item && item.weight) ? item.weight : 100;

  group.userData = {
    id: state.nextId++,
    type: 'rru',
    blockType: 'rectifier-20u-eltek',
    catalogId: (item && item.id) ? item.id : 'rectifier-20u-eltek',
    category: 'Rectifier',
    name: (item && item.name) ? item.name : '20U Outdoor DC Güç Kaynağı (Eltek Flatpack2 24kW)',
    width: W,
    height: H,
    depth: D,
    weight: weight,
    interactive: true,
    locked: false,
    lockedX: false,
    lockedY: false,
    lockedZ: false,
    isFreestanding: true,
    allowPassThrough: true
  };

  // Contrast High-Quality Materials
  const chassisMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.5 });
  const doorPanelMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, metalness: 0.3 });
  const darkBezelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.7 });
  const basePlinthMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.8 });
  const acHousingMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.6 });
  const screenMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 }); // Blue LCD Backlight
  const ledGreenMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
  const handleMat = new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.2, metalness: 0.9 });

  const cabinetGroup = new THREE.Group();

  // 1. Dark Base Plinth (Baza - 100mm)
  const baseH = 0.10;
  const baseGeo = new THREE.BoxGeometry(W * 0.98, baseH, D * 0.98);
  const baseMesh = new THREE.Mesh(baseGeo, basePlinthMat);
  baseMesh.position.set(0, baseH / 2, 0);
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  cabinetGroup.add(baseMesh);

  // Cable Entry Slot Accents on Plinth Front
  const cableSlotGeo = new THREE.BoxGeometry(W * 0.4, 0.03, 0.01);
  const cableSlot = new THREE.Mesh(cableSlotGeo, handleMat);
  cableSlot.position.set(0, baseH / 2, D / 2 + 0.005);
  cabinetGroup.add(cableSlot);

  // 2. Main Enclosure Body
  const bodyH = H - baseH - 0.08;
  const bodyGeo = new THREE.BoxGeometry(W, bodyH, D);
  const bodyMesh = new THREE.Mesh(bodyGeo, chassisMat);
  bodyMesh.name = "rru_body";
  bodyMesh.position.set(0, baseH + bodyH / 2, 0);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  cabinetGroup.add(bodyMesh);

  // 3. Top Rain Hood / Cap (Şapka) - Overhanging Roof
  const hoodH = 0.08;
  const hoodGeo = new THREE.BoxGeometry(W + 0.08, hoodH, D + 0.08);
  const hoodMesh = new THREE.Mesh(hoodGeo, darkBezelMat);
  hoodMesh.position.set(0, H - hoodH / 2, 0);
  hoodMesh.castShadow = true;
  cabinetGroup.add(hoodMesh);

  const roofGeo = new THREE.BoxGeometry(W + 0.04, 0.02, D + 0.04);
  const roofMesh = new THREE.Mesh(roofGeo, chassisMat);
  roofMesh.position.set(0, H + 0.01, 0);
  cabinetGroup.add(roofMesh);

  // 4. Front Door Frame (Dark Bezel Outline around door)
  const frameGeo = new THREE.BoxGeometry(W * 0.96, bodyH * 0.96, 0.02);
  const frameMesh = new THREE.Mesh(frameGeo, darkBezelMat);
  frameMesh.position.set(0, baseH + bodyH / 2, D / 2 + 0.01);
  frameMesh.castShadow = true;
  cabinetGroup.add(frameMesh);

  // 5. Front White Door Panel Insert
  const doorGeo = new THREE.BoxGeometry(W * 0.90, bodyH * 0.92, 0.015);
  const doorMesh = new THREE.Mesh(doorGeo, doorPanelMat);
  doorMesh.position.set(0, baseH + bodyH / 2, D / 2 + 0.02);
  doorMesh.castShadow = true;
  cabinetGroup.add(doorMesh);

  // 6. Door Lever Lock Handle & Keyhole
  const handleGeo = new THREE.BoxGeometry(0.04, 0.18, 0.03);
  const handleMesh = new THREE.Mesh(handleGeo, handleMat);
  handleMesh.position.set(W / 2 - 0.07, baseH + bodyH / 2, D / 2 + 0.035);
  cabinetGroup.add(handleMesh);

  // 7. 500W Outdoor Airco Unit Grill (Front Top Half)
  const acVentGeo = new THREE.BoxGeometry(W * 0.72, 0.32, 0.05);
  const acVentMesh = new THREE.Mesh(acVentGeo, acHousingMat);
  acVentMesh.position.set(0, baseH + bodyH * 0.74, D / 2 + 0.035);
  acVentMesh.castShadow = true;
  cabinetGroup.add(acVentMesh);

  // AC Louver Fin Lines
  for (let y = -0.11; y <= 0.11; y += 0.03) {
    const finGeo = new THREE.BoxGeometry(W * 0.64, 0.01, 0.01);
    const finMesh = new THREE.Mesh(finGeo, handleMat);
    finMesh.position.set(0, baseH + bodyH * 0.74 + y, D / 2 + 0.062);
    cabinetGroup.add(finMesh);
  }

  // 8. Eltek Flatpack2 Smartpack Controller LCD & Rectifier Module Rack
  const rackBayGeo = new THREE.BoxGeometry(W * 0.75, 0.22, 0.03);
  const rackBayMesh = new THREE.Mesh(rackBayGeo, darkBezelMat);
  rackBayMesh.position.set(0, baseH + bodyH * 0.38, D / 2 + 0.03);
  cabinetGroup.add(rackBayMesh);

  // Smartpack Display Screen
  const lcdGeo = new THREE.BoxGeometry(0.12, 0.05, 0.005);
  const lcdMesh = new THREE.Mesh(lcdGeo, screenMat);
  lcdMesh.position.set(-W * 0.22, baseH + bodyH * 0.42, D / 2 + 0.048);
  cabinetGroup.add(lcdMesh);

  // 6x Flatpack2 Rectifier Module Slots
  const slotW = (W * 0.70) / 6;
  for (let i = 0; i < 6; i++) {
    const slotGeo = new THREE.BoxGeometry(slotW - 0.01, 0.12, 0.01);
    const isPopulated = (i < 2);
    const slotMesh = new THREE.Mesh(slotGeo, isPopulated ? acHousingMat : handleMat);
    const slotX = -W * 0.32 + slotW / 2 + i * slotW;
    slotMesh.position.set(slotX, baseH + bodyH * 0.35, D / 2 + 0.046);
    cabinetGroup.add(slotMesh);

    if (isPopulated) {
      const ledGeo = new THREE.BoxGeometry(0.008, 0.008, 0.005);
      const ledMesh = new THREE.Mesh(ledGeo, ledGreenMat);
      ledMesh.position.set(slotX, baseH + bodyH * 0.38, D / 2 + 0.052);
      cabinetGroup.add(ledMesh);
    }
  }

  group.add(cabinetGroup);
  return group;
}

function buildRectifierTurkcellDoubleModel(item) {
  const group = new THREE.Group();
  const W = (item && item.width) ? item.width : 1.50;
  const H = (item && item.height) ? item.height : 1.07;
  const D = (item && item.depth) ? item.depth : 0.75;
  const weight = (item && item.weight) ? item.weight : 275;

  group.userData = {
    id: state.nextId++,
    type: 'rru',
    blockType: 'rectifier-turkcell-double',
    catalogId: (item && item.id) ? item.id : 'rectifier-turkcell-double',
    category: 'Rectifier',
    name: (item && item.name) ? item.name : 'Turkcell Çift Bölmeli Outdoor Güç Kabini (1500x1070x750)',
    width: W,
    height: H,
    depth: D,
    weight: weight,
    interactive: true,
    locked: false,
    lockedX: false,
    lockedY: false,
    lockedZ: false,
    isFreestanding: true,
    allowPassThrough: true
  };

  const chassisMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.3, metalness: 0.5 });
  const doorPanelMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.2, metalness: 0.3 });
  const darkBezelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.7 });
  const basePlinthMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.8 });
  const turkcellBlueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.6 });
  const fanMeshMat = new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.6, metalness: 0.5 });
  const handleMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.8 });

  const cabinetGroup = new THREE.Group();

  // 1. Double Base Plinth (80mm)
  const baseH = 0.08;
  const baseGeo = new THREE.BoxGeometry(W * 0.98, baseH, D * 0.96);
  const baseMesh = new THREE.Mesh(baseGeo, basePlinthMat);
  baseMesh.position.set(0, baseH / 2, 0);
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  cabinetGroup.add(baseMesh);

  // 2. Wide Main Cabinet Chassis
  const bodyH = H - baseH - 0.06;
  const bodyGeo = new THREE.BoxGeometry(W, bodyH, D);
  const bodyMesh = new THREE.Mesh(bodyGeo, chassisMat);
  bodyMesh.name = "rru_body";
  bodyMesh.position.set(0, baseH + bodyH / 2, 0);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  cabinetGroup.add(bodyMesh);

  // 3. Top Protective Roof Hood
  const hoodH = 0.06;
  const hoodGeo = new THREE.BoxGeometry(W + 0.08, hoodH, D + 0.08);
  const hoodMesh = new THREE.Mesh(hoodGeo, darkBezelMat);
  hoodMesh.position.set(0, H - hoodH / 2, 0);
  hoodMesh.castShadow = true;
  cabinetGroup.add(hoodMesh);

  // 4. Turkcell Brand Header Badge
  const badgeGeo = new THREE.BoxGeometry(W * 0.40, 0.05, 0.01);
  const badgeMesh = new THREE.Mesh(badgeGeo, turkcellBlueMat);
  badgeMesh.position.set(0, H - 0.09, D / 2 + 0.02);
  cabinetGroup.add(badgeMesh);

  // 5. Two Side-by-Side Compartment Door Assemblies
  const compW = W / 2 - 0.04;

  // Left Compartment Door (Climate & Battery Unit)
  const doorLeftGeo = new THREE.BoxGeometry(compW, bodyH * 0.92, 0.02);
  const doorLeft = new THREE.Mesh(doorLeftGeo, doorPanelMat);
  doorLeft.position.set(-W / 4, baseH + bodyH / 2, D / 2 + 0.015);
  doorLeft.castShadow = true;
  cabinetGroup.add(doorLeft);

  // Climate Circular Fan Intake Ring on Left Door
  const fanRingGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.03, 32);
  fanRingGeo.rotateX(Math.PI / 2);
  const fanRing = new THREE.Mesh(fanRingGeo, fanMeshMat);
  fanRing.position.set(-W / 4, baseH + bodyH * 0.68, D / 2 + 0.03);
  cabinetGroup.add(fanRing);

  // Fan Grill Blades
  for (let angle = 0; angle < Math.PI; angle += Math.PI / 4) {
    const bladeGeo = new THREE.BoxGeometry(0.24, 0.015, 0.005);
    const bladeMesh = new THREE.Mesh(bladeGeo, darkBezelMat);
    bladeMesh.rotation.z = angle;
    bladeMesh.position.set(-W / 4, baseH + bodyH * 0.68, D / 2 + 0.046);
    cabinetGroup.add(bladeMesh);
  }

  // Right Compartment Door (Rectifier & Smart Controller Section)
  const doorRightGeo = new THREE.BoxGeometry(compW, bodyH * 0.92, 0.02);
  const doorRight = new THREE.Mesh(doorRightGeo, doorPanelMat);
  doorRight.position.set(W / 4, baseH + bodyH / 2, D / 2 + 0.015);
  doorRight.castShadow = true;
  cabinetGroup.add(doorRight);

  // Perforated Ventilation Mesh Panel on Right Door
  const perfGeo = new THREE.BoxGeometry(compW * 0.82, bodyH * 0.62, 0.015);
  const perfMesh = new THREE.Mesh(perfGeo, darkBezelMat);
  perfMesh.position.set(W / 4, baseH + bodyH * 0.44, D / 2 + 0.028);
  cabinetGroup.add(perfMesh);

  // Handles & Keylocks for both doors
  [-W / 4 + compW / 2 - 0.05, W / 4 - compW / 2 + 0.05].forEach(hx => {
    const handleGeo = new THREE.BoxGeometry(0.04, 0.16, 0.03);
    const handleMesh = new THREE.Mesh(handleGeo, handleMat);
    handleMesh.position.set(hx, baseH + bodyH / 2, D / 2 + 0.035);
    cabinetGroup.add(handleMesh);
  });

  group.add(cabinetGroup);
  return group;
}

function buildRectifierMTS9304AModel(item) {
  const group = new THREE.Group();
  const W = (item && item.width) ? item.width : 0.65;
  const H = (item && item.height) ? item.height : 1.25;
  const D = (item && item.depth) ? item.depth : 0.65;
  const weight = (item && item.weight) ? item.weight : 80;

  group.userData = {
    id: state.nextId++,
    type: 'rru',
    blockType: 'rectifier-mts9304a',
    catalogId: (item && item.id) ? item.id : 'rectifier-mts9304a',
    category: 'Rectifier',
    name: (item && item.name) ? item.name : 'MTS9304A-HX10AX 12U Outdoor Rectifier Kabini',
    width: W,
    height: H,
    depth: D,
    weight: weight,
    interactive: true,
    locked: false,
    lockedX: false,
    lockedY: false,
    lockedZ: false,
    isFreestanding: true,
    allowPassThrough: true
  };

  const chassisMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.3, metalness: 0.5 });
  const doorPanelMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, metalness: 0.3 });
  const darkBezelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.7 });
  const basePlinthMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.8 });
  const hexHousingMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.6 });
  const fanMat = new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.5, metalness: 0.8 });
  const handleMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.9 });
  const lcdScreenMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });

  const cabinetGroup = new THREE.Group();

  // 1. Dark Plinth Base (100mm)
  const baseH = 0.10;
  const baseGeo = new THREE.BoxGeometry(W * 0.96, baseH, D * 0.96);
  const baseMesh = new THREE.Mesh(baseGeo, basePlinthMat);
  baseMesh.position.set(0, baseH / 2, 0);
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  cabinetGroup.add(baseMesh);

  // 2. Main 12U Cabinet Body
  const bodyH = 0.90;
  const bodyGeo = new THREE.BoxGeometry(W, bodyH, D);
  const bodyMesh = new THREE.Mesh(bodyGeo, chassisMat);
  bodyMesh.name = "rru_body";
  bodyMesh.position.set(0, baseH + bodyH / 2, 0);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  cabinetGroup.add(bodyMesh);

  // 3. Top Heat Exchanger Expansion Module Hood (250mm Height)
  const hexH = H - baseH - bodyH; // 0.25m
  const hexGeo = new THREE.BoxGeometry(W + 0.04, hexH, D + 0.04);
  const hexMesh = new THREE.Mesh(hexGeo, hexHousingMat);
  hexMesh.position.set(0, H - hexH / 2, 0);
  hexMesh.castShadow = true;
  cabinetGroup.add(hexMesh);

  // Twin Cooling Fan Grilles on Front of Heat Exchanger Top Hood
  [-W * 0.22, W * 0.22].forEach(fx => {
    const fanRingGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.02, 32);
    fanRingGeo.rotateX(Math.PI / 2);
    const fanRing = new THREE.Mesh(fanRingGeo, fanMat);
    fanRing.position.set(fx, H - hexH / 2, D / 2 + 0.023);
    cabinetGroup.add(fanRing);

    // Cross Fan Blade Guards
    const guard1 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.01, 0.005), darkBezelMat);
    guard1.position.set(fx, H - hexH / 2, D / 2 + 0.035);
    cabinetGroup.add(guard1);

    const guard2 = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.16, 0.005), darkBezelMat);
    guard2.position.set(fx, H - hexH / 2, D / 2 + 0.035);
    cabinetGroup.add(guard2);
  });

  // 4. Front Access Door Frame with White Panel
  const doorGeo = new THREE.BoxGeometry(W * 0.92, bodyH * 0.94, 0.02);
  const doorMesh = new THREE.Mesh(doorGeo, doorPanelMat);
  doorMesh.position.set(0, baseH + bodyH / 2, D / 2 + 0.015);
  doorMesh.castShadow = true;
  cabinetGroup.add(doorMesh);

  // 5. Radiator Heat Dissipation Fins Panel on Door Center
  const radGeo = new THREE.BoxGeometry(W * 0.78, bodyH * 0.44, 0.03);
  const radMesh = new THREE.Mesh(radGeo, darkBezelMat);
  radMesh.position.set(0, baseH + bodyH * 0.48, D / 2 + 0.028);
  radMesh.castShadow = true;
  cabinetGroup.add(radMesh);

  // LCD Controller Display Unit Screen (Huawei SMU Display)
  const lcdGeo = new THREE.BoxGeometry(0.14, 0.06, 0.008);
  const lcdMesh = new THREE.Mesh(lcdGeo, lcdScreenMat);
  lcdMesh.position.set(0, baseH + bodyH * 0.82, D / 2 + 0.028);
  cabinetGroup.add(lcdMesh);

  // Door Lever Handle
  const handleGeo = new THREE.BoxGeometry(0.04, 0.18, 0.03);
  const handleMesh = new THREE.Mesh(handleGeo, handleMat);
  handleMesh.position.set(W / 2 - 0.06, baseH + bodyH / 2, D / 2 + 0.035);
  cabinetGroup.add(handleMesh);

  group.add(cabinetGroup);
  return group;
}

// Dedicated 3D Model Builder for MATSING 4-Beam Multi-Beam Lens Antenna (MS-MBA-4.4.2-F4-H2-L2)
// Exact specs from datasheet:
// Dimensions: H: 1.635m, W: 0.617m, D: 0.721m, Weight: 51 kg
// Radome: Fiber glass rounded convex lens face
// Chassis: Angled chamfered rear wings with 28 RF ports (4.3-10 female) & AISG
// Mounting: Heavy-duty pipe brackets on central back spine for 60-114mm pipe
function buildMatsingAntennaModel(item = {}) {
  const group = new THREE.Group();
  
  const H = item.height || 1.635;
  const W = item.width || 0.617;
  const D = item.depth || 0.721;
  const weight = item.weight || 51;

  group.userData = {
    id: state.nextId++,
    type: 'rru',
    blockType: 'matsing-antenna-model',
    catalogId: item.id || 'matsing-4-beam',
    category: item.category || 'Matsing',
    name: item.name || 'Matsing 4-Beam Lens Anten (MS-MBA-4.4.2)',
    width: W,
    height: H,
    depth: D,
    weight: weight,
    interactive: true,
    lockedX: false,
    lockedY: false,
    lockedZ: false,
    isFreestanding: true,
    allowPassThrough: true
  };

  // Materials:
  const radomeMat = new THREE.MeshStandardMaterial({
    color: 0xebedf0,
    roughness: 0.35,
    metalness: 0.15
  });

  const chassisMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.45,
    metalness: 0.75
  });

  const steelBracketMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.35,
    metalness: 0.85
  });

  const darkHardwareMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.5,
    metalness: 0.8
  });

  const portPurpleMat = new THREE.MeshStandardMaterial({ color: 0x8b5cf6, metalness: 0.6, roughness: 0.3 });
  const portYellowMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.6, roughness: 0.3 });
  const portRedMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.6, roughness: 0.3 });
  const portBodyMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9, roughness: 0.2 });

  // 1. MAIN RADOME BODY (Lens Antenna Shape with rounded front and chamfered rear)
  const halfW = W / 2; // ~0.3085m
  const halfD = D / 2; // ~0.3605m
  const spineHalfW = 0.13;
  const chamferZ = -halfD + 0.18;

  const radomeShape = new THREE.Shape();
  radomeShape.moveTo(-spineHalfW, -halfD);
  radomeShape.lineTo(spineHalfW, -halfD);
  radomeShape.lineTo(halfW, chamferZ);
  radomeShape.quadraticCurveTo(halfW, halfD * 0.45, halfW * 0.5, halfD * 0.85);
  radomeShape.quadraticCurveTo(0, halfD, -halfW * 0.5, halfD * 0.85);
  radomeShape.quadraticCurveTo(-halfW, halfD * 0.45, -halfW, chamferZ);
  radomeShape.lineTo(-spineHalfW, -halfD);

  const extrudeSettings = {
    steps: 1,
    depth: H,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 3
  };

  const radomeGeo = new THREE.ExtrudeGeometry(radomeShape, extrudeSettings);
  radomeGeo.rotateX(Math.PI / 2);
  radomeGeo.center();

  const radomeMesh = new THREE.Mesh(radomeGeo, radomeMat);
  radomeMesh.name = 'rru_body';
  radomeMesh.castShadow = true;
  radomeMesh.receiveShadow = true;
  group.add(radomeMesh);

  // 2. REAR METAL BACK COVER
  const rearPlateGeo = new THREE.BoxGeometry(spineHalfW * 2, H * 0.98, 0.02);
  const rearPlate = new THREE.Mesh(rearPlateGeo, chassisMat);
  rearPlate.position.set(0, 0, -halfD + 0.01);
  group.add(rearPlate);

  // Top & Bottom End Caps
  const capPlateGeo = new THREE.BoxGeometry(W * 0.88, 0.035, D * 0.88);
  const topCap = new THREE.Mesh(capPlateGeo, chassisMat);
  topCap.position.set(0, H / 2 + 0.015, -0.04);
  group.add(topCap);

  const botCap = new THREE.Mesh(capPlateGeo, chassisMat);
  botCap.position.set(0, -H / 2 - 0.015, -0.04);
  group.add(botCap);

  // 3. MATSING TOP & BOTTOM HEAVY-DUTY PIPE MOUNTING BRACKETS (For 60 - 114 mm Pipe)
  const bracketYPositions = [H * 0.35, -H * 0.35];
  bracketYPositions.forEach(by => {
    const bracketGroup = new THREE.Group();
    bracketGroup.position.set(0, by, -halfD);

    const basePlateGeo = new THREE.BoxGeometry(0.24, 0.12, 0.015);
    const basePlate = new THREE.Mesh(basePlateGeo, steelBracketMat);
    bracketGroup.add(basePlate);

    const ribGeo = new THREE.BoxGeometry(0.01, 0.10, 0.09);
    const rib1 = new THREE.Mesh(ribGeo, steelBracketMat);
    rib1.position.set(-0.09, 0, -0.045);
    bracketGroup.add(rib1);
    const rib2 = new THREE.Mesh(ribGeo, steelBracketMat);
    rib2.position.set(0.09, 0, -0.045);
    bracketGroup.add(rib2);

    const saddleGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.10, 16, 1, true, -Math.PI / 2, Math.PI);
    const saddle = new THREE.Mesh(saddleGeo, steelBracketMat);
    saddle.rotation.y = Math.PI;
    saddle.position.set(0, 0, -0.09);
    bracketGroup.add(saddle);

    const uBoltGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.16, 12);
    uBoltGeo.rotateZ(Math.PI / 2);
    const ub1 = new THREE.Mesh(uBoltGeo, darkHardwareMat);
    ub1.position.set(0, 0.035, -0.09);
    bracketGroup.add(ub1);
    const ub2 = new THREE.Mesh(uBoltGeo, darkHardwareMat);
    ub2.position.set(0, -0.035, -0.09);
    bracketGroup.add(ub2);

    group.add(bracketGroup);
  });

  // 4. 28 RF CONNECTOR PORTS & AISG
  const connectorGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.03, 16);
  connectorGeo.rotateX(Math.PI / 2);
  const ringGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.008, 16);
  ringGeo.rotateX(Math.PI / 2);

  function addPort(x, y, z, mat, rotY) {
    const portGroup = new THREE.Group();
    portGroup.position.set(x, y, z);
    portGroup.rotation.y = rotY;

    const ring = new THREE.Mesh(ringGeo, mat);
    portGroup.add(ring);

    const body = new THREE.Mesh(connectorGeo, portBodyMat);
    body.position.z = -0.015;
    portGroup.add(body);

    group.add(portGroup);
  }

  const leftX = -0.22;
  const rightX = 0.22;
  const portZ = -halfD + 0.09;

  // Upper FB Ports (Beams 1-4, 16 ports) - Purple
  const upperYs = [H * 0.38, H * 0.32, H * 0.22, H * 0.16];
  upperYs.forEach(py => {
    addPort(leftX - 0.035, py, portZ, portPurpleMat, 0.55);
    addPort(leftX + 0.035, py, portZ, portPurpleMat, 0.55);
    addPort(rightX - 0.035, py, portZ, portPurpleMat, -0.55);
    addPort(rightX + 0.035, py, portZ, portPurpleMat, -0.55);
  });

  // Middle LB Ports (4 ports) - Red
  addPort(leftX - 0.02, -0.02, portZ, portRedMat, 0.55);
  addPort(leftX + 0.02, -0.02, portZ, portRedMat, 0.55);
  addPort(rightX - 0.02, -0.02, portZ, portRedMat, -0.55);
  addPort(rightX + 0.02, -0.02, portZ, portRedMat, -0.55);

  // Lower HB Ports (Beams 1-4, 8 ports) - Yellow
  const lowerYs = [-H * 0.22, -H * 0.28];
  lowerYs.forEach(py => {
    addPort(leftX - 0.035, py, portZ, portYellowMat, 0.55);
    addPort(leftX + 0.035, py, portZ, portYellowMat, 0.55);
    addPort(rightX - 0.035, py, portZ, portYellowMat, -0.55);
    addPort(rightX + 0.035, py, portZ, portYellowMat, -0.55);
  });

  // AISG Ports at bottom plate
  const aisgGeo = new THREE.CylinderGeometry(0.010, 0.010, 0.02, 12);
  aisgGeo.rotateX(Math.PI / 2);
  const aisg1 = new THREE.Mesh(aisgGeo, darkHardwareMat);
  aisg1.position.set(-0.06, -H * 0.45, -halfD + 0.02);
  group.add(aisg1);
  const aisg2 = new THREE.Mesh(aisgGeo, darkHardwareMat);
  aisg2.position.set(0.06, -H * 0.45, -halfD + 0.02);
  group.add(aisg2);

  // 5. MATSING LOGO & SPEC PLATE
  const labelGeo = new THREE.PlaneGeometry(0.20, 0.09);
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 512;
  labelCanvas.height = 256;
  const ctx = labelCanvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, 500, 244);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 54px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MATSING', 256, 80);
  ctx.font = 'bold 30px sans-serif';
  ctx.fillStyle = '#0284c7';
  ctx.fillText('MS-MBA-4.4.2-F4-H2-L2', 256, 135);
  ctx.font = '22px sans-serif';
  ctx.fillStyle = '#475569';
  ctx.fillText('4-BEAM MULTI-BEAM LENS ANTENNA', 256, 175);
  ctx.fillText('WT: 51 KG | H: 163.5 cm', 256, 215);

  const labelTex = new THREE.CanvasTexture(labelCanvas);
  const labelMat = new THREE.MeshStandardMaterial({ map: labelTex, roughness: 0.4 });
  const labelMesh = new THREE.Mesh(labelGeo, labelMat);
  labelMesh.rotation.y = Math.PI;
  labelMesh.position.set(0, 0.08, -halfD - 0.001);
  group.add(labelMesh);

  // 6. TOP LIFTING EYE SHACKLES
  const eyeGeo = new THREE.TorusGeometry(0.025, 0.007, 12, 24);
  eyeGeo.rotateX(Math.PI / 2);
  const eyeL = new THREE.Mesh(eyeGeo, steelBracketMat);
  eyeL.position.set(-0.10, H / 2 + 0.05, -halfD + 0.08);
  group.add(eyeL);
  const eyeR = new THREE.Mesh(eyeGeo, steelBracketMat);
  eyeR.position.set(0.10, H / 2 + 0.05, -halfD + 0.08);
  group.add(eyeR);

  return group;
}

function buildCustomEquipmentModel(item) {
  const name = item.name || '';
  const id = item.id || item.catalogId || '';
  const cat = item.category || '';

  if (id === 'matsing-4-beam' || name.includes('Matsing') || cat === 'Matsing' || cat === 'Anten') {
    return buildMatsingAntennaModel(item);
  }

  if (id === 'rectifier-20u-eltek' || name.includes('20U Outdoor') || name.includes('Eltek') || name.includes('Flatpack')) {
    return buildRectifier20UModel(item);
  }

  if (id === 'rectifier-turkcell-double' || name.includes('Turkcell Çift Bölmeli') || name.includes('Çift Bölmeli')) {
    return buildRectifierTurkcellDoubleModel(item);
  }

  if (id === 'rectifier-mts9304a' || name.includes('MTS9304A') || name.includes('12U Outdoor')) {
    return buildRectifierMTS9304AModel(item);
  }

  if (cat === 'Rectifier' || id.includes('rectifier') || name.includes('Rectifier') || name.includes('DC Güç')) {
    return buildRectifier20UModel(item);
  }

  if (item.category === 'Canovate' || (item.id && item.id.includes('canovate'))) {
    const cabinet = build42UIkiliCerceveKabin();
    cabinet.userData.catalogId = item.id;
    cabinet.userData.category = item.category;
    cabinet.userData.name = item.name;
    return cabinet;
  }

  if (item.category === 'POI' || item.id.startsWith('prose-') || item.name.startsWith('CB-12')) {
    return buildProsePoiModel(item);
  }

  const group = new THREE.Group();
  group.userData = {
    id: state.nextId++,
    type: 'rru',
    blockType: 'custom-equipment',
    catalogId: item.id,
    category: item.category,
    name: item.name,
    width: item.width,
    height: item.height,
    depth: item.depth,
    weight: item.weight,
    interactive: true,
    locked: false,
    allowPassThrough: true // Default ON as requested
  };

  // Main Casing Body (Matches exact total Excel dimensions H x W x D)
  const bodyMat = new THREE.MeshStandardMaterial({ 
    color: item.color, 
    roughness: 0.4, 
    metalness: 0.3 
  });
  const bodyGeo = new THREE.BoxGeometry(item.width, item.height, item.depth);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.castShadow = true;
  body.receiveShadow = true;
  body.name = "rru_body";
  group.add(body);

  // Handle on top
  const handleMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.2 });
  const handleGeo = new THREE.BoxGeometry(item.width * 0.4, 0.03, 0.03);
  const handle = new THREE.Mesh(handleGeo, handleMat);
  handle.position.set(0, item.height / 2 + 0.015, 0);
  group.add(handle);

  // Arm & Pipe clamp mounted on the SHORT SIDE (narrow edge X = -item.width / 2)
  const armGeo = new THREE.BoxGeometry(0.08, 0.06, 0.04);
  const arm = new THREE.Mesh(armGeo, handleMat);
  arm.position.set(-item.width / 2 - 0.04, 0, 0);
  group.add(arm);

  const clampGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.06, 16);
  const clamp = new THREE.Mesh(clampGeo, handleMat);
  clamp.position.set(-item.width / 2 - 0.08, 0, 0);
  clamp.rotation.z = Math.PI / 2;
  group.add(clamp);

  return group;
}

function spawnCustomEquipment(item) {
  const areaSuffix = state.currentArea === 'alan4' ? ' (Alan 4)' : (state.currentArea === 'alan3' ? ' (Alan 3)' : (state.currentArea === 'alan2' ? ' (Alan 2)' : ''));
  const group = buildCustomEquipmentModel(item);
  group.userData.name = `${item.name}${areaSuffix}`;

  const isPoi = item.category && item.category.startsWith('POI');
  const isCanovate = item.category === 'Canovate';
  const isRectifier = item.category === 'Rectifier';
  const isMatsing = item.category === 'Matsing' || item.id === 'matsing-4-beam';

  if (isPoi || isCanovate || isRectifier || isMatsing) {
    group.userData.lockedX = false;
    group.userData.lockedY = false;
    group.userData.lockedZ = false;
    group.userData.isFreestanding = true;
  }

  const baseElev = (state.currentArea === 'alan4') ? 20.0 : 0.0;
  const targetZ = (state.currentArea === 'alan4') ? -0.70 : -2.0;
  setupPlatformTransform(group, 0, targetZ, false);
  const relY = (isCanovate || isRectifier) ? 0.0 : (isMatsing ? 1.0 : (isPoi ? 0.30 : 0.75));
  group.position.y = baseElev + relY;
  if (state.currentArea === 'alan4') {
    group.position.z = -0.70;
  }
  addPlatformToActiveArea(group);
}

function renderExcelEquipmentGrid(selectedCat = 'Turkcell') {
  const container = document.getElementById('excel-equipment-grid');
  if (!container) return;

  container.innerHTML = '';
  
  const filtered = EQUIPMENT_CATALOG.filter(item => item.category === selectedCat || (selectedCat === 'POI' && item.category.startsWith('POI')));

  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = 'eq-card';
    card.innerHTML = `
      <div class="eq-card-header">
        <span class="eq-card-title">${item.name}</span>
        <span class="eq-card-badge" style="background: ${item.color}">${item.category}</span>
      </div>
      <div class="eq-card-specs">
        📐 ${(item.height * 100).toFixed(1)} x ${(item.width * 100).toFixed(1)} x ${(item.depth * 100).toFixed(1)} cm | ⚖️ ${item.weight} kg
      </div>
      <div style="display: flex; gap: 6px; margin-top: 6px;">
        <button class="eq-card-btn btn-spawn-eq" style="flex: 1;">➕ Sahneye Ekle</button>
        <button class="eq-card-btn btn-dim-eq" style="background: #1e293b; color: #38bdf8; border: 1px solid #334155; padding: 6px 8px; font-size: 11px;">🔍 3D Ölçüler</button>
      </div>
    `;

    card.querySelector('.btn-spawn-eq').addEventListener('click', (e) => {
      e.stopPropagation();
      spawnCustomEquipment(item);
    });

    card.querySelector('.btn-dim-eq').addEventListener('click', (e) => {
      e.stopPropagation();
      openDimensionsModal(item);
    });

    container.appendChild(card);
  });
}

// Bind Category Tabs
document.querySelectorAll('.eq-tab').forEach(tab => {
  tab.addEventListener('click', (e) => {
    document.querySelectorAll('.eq-tab').forEach(t => t.classList.remove('active'));
    e.target.classList.add('active');
    renderExcelEquipmentGrid(e.target.dataset.cat);
  });
});

// Right Main Navigation Tab Switcher (4 Tabs)
const tabBtnLayout = document.getElementById('tab-btn-layout');
const tabBtnDevices = document.getElementById('tab-btn-devices');
const tabBtnComponents = document.getElementById('tab-btn-components');
const tabBtnOtherBlocks = document.getElementById('tab-btn-other-blocks');

const tabContentLayout = document.getElementById('tab-content-layout');
const tabContentDevices = document.getElementById('tab-content-devices');
const tabContentComponents = document.getElementById('tab-content-components');
const tabContentOtherBlocks = document.getElementById('tab-content-other-blocks');

if (tabBtnLayout && tabBtnDevices && tabBtnComponents && tabBtnOtherBlocks) {
  const switchTab = (activeBtn, activeContent) => {
    [tabBtnLayout, tabBtnDevices, tabBtnComponents, tabBtnOtherBlocks].forEach(btn => btn.classList.remove('active'));
    [tabContentLayout, tabContentDevices, tabContentComponents, tabContentOtherBlocks].forEach(content => content.classList.remove('active'));
    
    activeBtn.classList.add('active');
    activeContent.classList.add('active');
  };

  tabBtnLayout.addEventListener('click', () => switchTab(tabBtnLayout, tabContentLayout));
  tabBtnDevices.addEventListener('click', () => switchTab(tabBtnDevices, tabContentDevices));
  tabBtnComponents.addEventListener('click', () => switchTab(tabBtnComponents, tabContentComponents));
  tabBtnOtherBlocks.addEventListener('click', () => switchTab(tabBtnOtherBlocks, tabContentOtherBlocks));
}

// Initialize Right Equipment Grid with Turkcell
renderExcelEquipmentGrid('Turkcell');

function selectObject(obj) {
  // Reset previous outline
  if (state.selectedObject) {
    const selectionHelper = state.selectedObject.getObjectByName('selectionHelper');
    if (selectionHelper) state.selectedObject.remove(selectionHelper);
  }

  state.selectedObject = obj;
  const propSection = document.getElementById('section-properties');

  if (obj) {
    propSection.style.display = 'block';
    renderProperties(obj);
  } else {
    propSection.style.display = 'none';
  }
}

function renderProperties(obj) {
  const content = document.getElementById('properties-content');
  if (!content) return;

  const isLockedX = !!obj.userData.lockedX;
  const isLockedY = !!obj.userData.lockedY;
  const isLockedZ = !!obj.userData.lockedZ;
  
  let html = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border-color);">
      <div>
        <strong style="font-size: 14px; color: var(--text-primary); display: block;">${obj.userData.name}</strong>
        <span style="font-size: 11px; color: var(--text-secondary);">${obj.userData.type.toUpperCase()} | ID: #${obj.userData.id}</span>
      </div>
      <span style="background: ${(isLockedX && isLockedY && isLockedZ) ? '#ef4444' : '#10b981'}; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold;">
        ${(isLockedX && isLockedY && isLockedZ) ? '🔒 TAM KİLİTLİ' : '🔓 SERBEST'}
      </span>
    </div>
  `;

  // X Position Steppers with Independent X Lock
  html += `
    <div class="input-group" style="margin-bottom: 10px;">
      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: bold; margin-bottom: 4px;">
        <label style="color: var(--text-secondary);">Pozisyon X (m)</label>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="color: var(--gs-red); font-family: monospace; font-weight: bold;">${obj.position.x.toFixed(3)} m</span>
          <label style="font-size: 11px; color: ${isLockedX ? '#ef4444' : 'var(--text-secondary)'}; cursor: pointer; display: flex; align-items: center; gap: 2px;">
            <input type="checkbox" class="lock-axis-cb" data-axis="x" ${isLockedX ? 'checked' : ''} style="cursor: pointer;">
            ${isLockedX ? '🔒 Kilitli' : '🔓 Kilitle'}
          </label>
        </div>
      </div>
      <input type="number" step="0.01" id="prop-pos-x" value="${obj.position.x.toFixed(3)}" ${isLockedX ? 'disabled' : ''}>
      <div class="stepper-row">
        <button class="step-btn" data-axis="x" data-val="-0.50" ${isLockedX ? 'disabled' : ''}>-0.5m</button>
        <button class="step-btn" data-axis="x" data-val="-0.10" ${isLockedX ? 'disabled' : ''}>-0.1m</button>
        <button class="step-btn" data-axis="x" data-val="-0.01" ${isLockedX ? 'disabled' : ''}>-1cm</button>
        <button class="step-btn" data-axis="x" data-val="0.01" ${isLockedX ? 'disabled' : ''}>+1cm</button>
        <button class="step-btn" data-axis="x" data-val="0.10" ${isLockedX ? 'disabled' : ''}>+0.1m</button>
        <button class="step-btn" data-axis="x" data-val="0.50" ${isLockedX ? 'disabled' : ''}>+0.5m</button>
      </div>
    </div>
  `;

  // Y Position Controls with Independent Y Lock
  const isPipeMountedRRU = (obj.userData.type === 'rru' && 
                            !obj.userData.isFreestanding && 
                            obj.userData.category !== 'Rectifier' && 
                            obj.userData.category !== 'Canovate' && 
                            (!obj.userData.blockType || !obj.userData.blockType.startsWith('rectifier-')) &&
                            (!obj.userData.category || !obj.userData.category.startsWith('POI')));

  if (isPipeMountedRRU) {
    const isLevel1 = Math.abs(obj.position.y - 0.75) < 0.20;
    const isLevel2 = Math.abs(obj.position.y - 1.50) < 0.20;

    html += `
      <div class="input-group" style="margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: bold; margin-bottom: 6px;">
          <label style="color: var(--text-secondary);">Boru Üzeri Sabit Montaj Kotu (Y)</label>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="color: var(--gs-red); font-family: monospace; font-weight: bold;">${obj.position.y.toFixed(2)} m</span>
            <label style="font-size: 11px; color: ${isLockedY ? '#ef4444' : 'var(--text-secondary)'}; cursor: pointer; display: flex; align-items: center; gap: 2px;">
              <input type="checkbox" class="lock-axis-cb" data-axis="y" ${isLockedY ? 'checked' : ''} style="cursor: pointer;">
              ${isLockedY ? '🔒 Kilitli' : '🔓 Kilitle'}
            </label>
          </div>
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="level-btn" data-y="0.75" ${isLockedY ? 'disabled' : ''} style="flex: 1; padding: 8px; font-size: 11px; font-weight: bold; border-radius: 6px; border: 1px solid ${isLevel1 ? '#0284c7' : '#cbd5e1'}; background: ${isLevel1 ? '#0284c7' : '#f1f5f9'}; color: ${isLevel1 ? 'white' : '#1e293b'}; cursor: pointer;">
            🔻 Alt Seviye Kotu (+0.75m)
          </button>
          <button class="level-btn" data-y="1.50" ${isLockedY ? 'disabled' : ''} style="flex: 1; padding: 8px; font-size: 11px; font-weight: bold; border-radius: 6px; border: 1px solid ${isLevel2 ? '#0284c7' : '#cbd5e1'}; background: ${isLevel2 ? '#0284c7' : '#f1f5f9'}; color: ${isLevel2 ? 'white' : '#1e293b'}; cursor: pointer;">
            🔺 Üst Seviye Kotu (+1.50m)
          </button>
        </div>
      </div>
    `;
  } else {
    html += `
      <div class="input-group" style="margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: bold; margin-bottom: 4px;">
          <label style="color: var(--text-secondary);">Pozisyon Y (Yükseklik - m)</label>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="color: var(--gs-red); font-family: monospace; font-weight: bold;">${obj.position.y.toFixed(3)} m</span>
            <label style="font-size: 11px; color: ${isLockedY ? '#ef4444' : 'var(--text-secondary)'}; cursor: pointer; display: flex; align-items: center; gap: 2px;">
              <input type="checkbox" class="lock-axis-cb" data-axis="y" ${isLockedY ? 'checked' : ''} style="cursor: pointer;">
              ${isLockedY ? '🔒 Kilitli' : '🔓 Kilitle'}
            </label>
          </div>
        </div>
        <input type="number" step="0.01" id="prop-pos-y" value="${obj.position.y.toFixed(3)}" ${isLockedY ? 'disabled' : ''}>
        <div class="stepper-row">
          <button class="step-btn" data-axis="y" data-val="-0.50" ${isLockedY ? 'disabled' : ''}>-0.5m</button>
          <button class="step-btn" data-axis="y" data-val="-0.10" ${isLockedY ? 'disabled' : ''}>-0.1m</button>
          <button class="step-btn" data-axis="y" data-val="-0.01" ${isLockedY ? 'disabled' : ''}>-1cm</button>
          <button class="step-btn" data-axis="y" data-val="0.01" ${isLockedY ? 'disabled' : ''}>+1cm</button>
          <button class="step-btn" data-axis="y" data-val="0.10" ${isLockedY ? 'disabled' : ''}>+0.1m</button>
          <button class="step-btn" data-axis="y" data-val="0.50" ${isLockedY ? 'disabled' : ''}>+0.5m</button>
        </div>
        ${state.currentArea === 'alan4' && (obj.userData.category === 'Rectifier' || obj.userData.isFreestanding) ? `
          <div style="display: flex; gap: 6px; margin-top: 6px;">
            <button class="concrete-level-btn" data-y="18.121" data-z="59.672" ${isLockedY ? 'disabled' : ''} style="flex: 1; padding: 6px; font-size: 11px; font-weight: bold; border-radius: 6px; border: 1px solid #0284c7; background: #e0f2fe; color: #0369a1; cursor: pointer;">
              🏢 Beton Kaide Kotu (18.12m)
            </button>
            <button class="concrete-level-btn" data-y="20.000" data-z="-0.70" ${isLockedY ? 'disabled' : ''} style="flex: 1; padding: 6px; font-size: 11px; font-weight: bold; border-radius: 6px; border: 1px solid #cbd5e1; background: #f8fafc; color: #475569; cursor: pointer;">
              🚶 Kedi Yolu Kotu (20.00m)
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }

  // Z Position Steppers with Independent Z Lock
  html += `
    <div class="input-group" style="margin-bottom: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: bold; margin-bottom: 4px;">
        <label style="color: var(--text-secondary);">Pozisyon Z (m)</label>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="color: var(--gs-red); font-family: monospace; font-weight: bold;">${obj.position.z.toFixed(3)} m</span>
          <label style="font-size: 11px; color: ${isLockedZ ? '#ef4444' : 'var(--text-secondary)'}; cursor: pointer; display: flex; align-items: center; gap: 2px;">
            <input type="checkbox" class="lock-axis-cb" data-axis="z" ${isLockedZ ? 'checked' : ''} style="cursor: pointer;">
            ${isLockedZ ? '🔒 Kilitli' : '🔓 Kilitle'}
          </label>
        </div>
      </div>
      <input type="number" step="0.01" id="prop-pos-z" value="${obj.position.z.toFixed(3)}" ${isLockedZ ? 'disabled' : ''}>
      <div class="stepper-row">
        <button class="step-btn" data-axis="z" data-val="-0.50" ${isLockedZ ? 'disabled' : ''}>-0.5m</button>
        <button class="step-btn" data-axis="z" data-val="-0.10" ${isLockedZ ? 'disabled' : ''}>-0.1m</button>
        <button class="step-btn" data-axis="z" data-val="-0.01" ${isLockedZ ? 'disabled' : ''}>-1cm</button>
        <button class="step-btn" data-axis="z" data-val="0.01" ${isLockedZ ? 'disabled' : ''}>+1cm</button>
        <button class="step-btn" data-axis="z" data-val="0.10" ${isLockedZ ? 'disabled' : ''}>+0.1m</button>
        <button class="step-btn" data-axis="z" data-val="0.50" ${isLockedZ ? 'disabled' : ''}>+0.5m</button>
      </div>
    </div>
  `;

  // Action Buttons (Rotate 90 & Keyboard Shortcut Notice)
  html += `
    <div style="display: flex; gap: 8px; margin-top: 12px;">
      <button id="btn-rotate-90" class="btn btn-secondary" style="flex: 1; padding: 8px 10px; font-size: 12px; background: #f1f5f9; color: #1e293b; border: 1px solid #cbd5e1;">
        🔄 90° Çevir
      </button>
    </div>

    <!-- Keyboard Arrow Keys Helper Notice -->
    <div style="margin-top: 10px; padding: 8px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
      💡 <strong>Ok Tuşları İle Kaydırma:</strong> Seçili iken ⬅️ ➡️ (X) ve ⬆️ ⬇️ (Z) ok tuşları ile kaydırabilirsiniz. (Shift ile 10cm, normal 1cm).
    </div>

    <!-- Pass-Through (Clipping/Collision Toggle) -->
    <div style="margin-top: 8px; padding: 8px 10px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
      <label for="prop-passthrough" style="cursor: pointer; font-size: 11px; color: #1e293b; font-weight: bold; margin: 0;">
        ⚡ Serbest Konumlandırma (Çakışma Koruması Muafiyeti)
      </label>
      <input type="checkbox" id="prop-passthrough" ${obj.userData.allowPassThrough !== false ? 'checked' : ''} style="cursor: pointer; width: 16px; height: 16px;">
    </div>

    <!-- 3D Dimensions & Interactive Preview Button for RRU and Rack blocks -->
    <div style="margin-top: 10px;">
      <button id="btn-show-3d-dimensions" class="btn btn-secondary" style="width: 100%; background: #0284c7; color: #ffffff; border: 1px solid #0369a1; font-weight: bold; padding: 8px 12px; font-size: 12px; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; border-radius: 6px;">
        🔍 Ölçüler & 3D Görünüm
      </button>
    </div>
  `;

  content.innerHTML = html;

  // Bind 3D Dimensions Modal Button
  const btnShowDimensions = document.getElementById('btn-show-3d-dimensions');
  if (btnShowDimensions) {
    btnShowDimensions.addEventListener('click', () => {
      openDimensionsModal(obj);
    });
  }

  // Bind Independent Axis Lock Checkboxes
  document.querySelectorAll('.lock-axis-cb').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const axis = e.target.dataset.axis;
      if (axis === 'x') obj.userData.lockedX = e.target.checked;
      else if (axis === 'y') obj.userData.lockedY = e.target.checked;
      else if (axis === 'z') obj.userData.lockedZ = e.target.checked;

      renderProperties(obj);
    });
  });

  // Bind Input Change Events
  const inputX = document.getElementById('prop-pos-x');
  const inputY = document.getElementById('prop-pos-y');
  const inputZ = document.getElementById('prop-pos-z');

  if (inputX) {
    inputX.addEventListener('change', (e) => {
      if (obj.userData.lockedX) return;
      obj.position.x = parseFloat(e.target.value) || 0;
      renderProperties(obj);
      updateBOM();
    });
  }

  if (inputY) {
    inputY.addEventListener('change', (e) => {
      if (obj.userData.lockedY) return;
      obj.position.y = parseFloat(e.target.value) || 0;
      renderProperties(obj);
      updateBOM();
    });
  }

  if (inputZ) {
    inputZ.addEventListener('change', (e) => {
      if (obj.userData.lockedZ) return;
      obj.position.z = parseFloat(e.target.value) || 0;
      renderProperties(obj);
      updateBOM();
    });
  }

  // Pass-Through Toggle Event Listener
  const passThroughCheckbox = document.getElementById('prop-passthrough');
  if (passThroughCheckbox) {
    passThroughCheckbox.addEventListener('change', (e) => {
      obj.userData.allowPassThrough = e.target.checked;
      renderProperties(obj);
    });
  }

  // Fixed level buttons event listeners (Alt Seviye +0.75m / Üst Seviye +1.50m)
  document.querySelectorAll('.level-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (obj.userData.lockedY) return;
      const targetY = parseFloat(e.currentTarget.dataset.y) || 0.75;
      obj.position.y = targetY;
      renderProperties(obj);
      updateBOM();
    });
  });

  // Concrete Base Quick Kot Buttons (for Alan 4 Concrete / Catwalk toggle)
  document.querySelectorAll('.concrete-level-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (obj.userData.lockedY) return;
      const targetY = parseFloat(e.currentTarget.dataset.y);
      const targetZ = parseFloat(e.currentTarget.dataset.z);
      if (!isNaN(targetY)) obj.position.y = targetY;
      if (!isNaN(targetZ) && !obj.userData.lockedZ) obj.position.z = targetZ;
      renderProperties(obj);
      updateBOM();
    });
  });

  // Stepper buttons event listeners
  document.querySelectorAll('.step-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const axis = e.target.dataset.axis;
      if (axis === 'x' && obj.userData.lockedX) return;
      if (axis === 'y' && obj.userData.lockedY) return;
      if (axis === 'z' && obj.userData.lockedZ) return;

      const delta = parseFloat(e.target.dataset.val) || 0;
      if (axis === 'x') obj.position.x += delta;
      else if (axis === 'y') obj.position.y += delta;
      else if (axis === 'z') obj.position.z += delta;

      renderProperties(obj);
      updateBOM();
    });
  });

  // Rotate 90 Listener
  const rotateBtn = document.getElementById('btn-rotate-90');
  if (rotateBtn) {
    rotateBtn.addEventListener('click', () => {
      obj.rotation.y += Math.PI / 2;
      updateBOM();
    });
  }

  // Lock Toggle Listener
  const lockBtn = document.getElementById('btn-toggle-lock');
  if (lockBtn) {
    lockBtn.addEventListener('click', () => {
      obj.userData.locked = !obj.userData.locked;
      selectObject(obj);
    });
  }
}

// Delete Selected Button Listener
const btnDelete = document.getElementById('btn-delete-selected');
if (btnDelete) {
  btnDelete.addEventListener('click', () => {
    if (!state.selectedObject) return;

    const obj = state.selectedObject;
    scene.remove(obj);
    state.alan1Platforms = state.alan1Platforms.filter(p => p !== obj);
    state.alan2Platforms = state.alan2Platforms.filter(p => p !== obj);
    state.alan3Platforms = state.alan3Platforms.filter(p => p !== obj);
    state.alan4Platforms = state.alan4Platforms.filter(p => p !== obj);

    selectObject(null);
    updateBOM();
  });
}

// Update stats and BOQ Table
function updateBOM() {
  const activePlatforms = getActivePlatforms();
  let platformCount = activePlatforms.filter(p => p.userData.type !== 'rru').length;
  let antennaCount = 0;
  let rruCount = 0;
  let totalWeight = 0;

  activePlatforms.forEach(p => {
    // Weight calculation based on type
    if (p.userData.type === 'rru') {
      rruCount++;
      totalWeight += p.userData.weight || 20;
    }
    else if (p.userData.name.includes('Kiriş-1')) totalWeight += 35;
    else if (p.userData.name.includes('Kiriş-2')) totalWeight += 65;
    else if (p.userData.name.includes('Tabla-1')) totalWeight += 20;
    else if (p.userData.name.includes('Tabla-2')) totalWeight += 22;
    else if (p.userData.name.includes('Tabla-3')) totalWeight += 20;
    else if (p.userData.name.includes('Boru-1')) totalWeight += 25;
    else if (p.userData.name.includes('RRU Saha Blok')) totalWeight += 284;
    else if (p.userData.name.includes('RRU Blok (Korkuluklu)')) totalWeight += 245;
    else if (p.userData.name.includes('Rack Blok (Korkuluklu)')) totalWeight += 189;
    else if (p.userData.name.includes('RRU Blok')) totalWeight += 205;
    else if (p.userData.name.includes('Rack Blok')) totalWeight += 149;
    else if (p.userData.name.includes('Çemberli H-Beam')) totalWeight += 480;
    else if (p.userData.name.includes('Çift RRU Kompleksi')) totalWeight += 860;
    else if (p.userData.name.includes('Kedi Yolu Tabla + Flanşlı Pol + 42U')) totalWeight += 385;
    else if (p.userData.name.includes('4 POI Rack') || p.userData.blockType === '4poi-rack-blok') totalWeight += (p.userData.weight || 140);
    else if (p.userData.name.includes('30U POI Rack') || p.userData.name.includes('POI Kompleks (4 POI)') || p.userData.name.includes('30U POI Kompleks')) totalWeight += 136;
    else if (p.userData.name.includes('Kedi Yolu Tabla + 42U')) totalWeight += 295;
    else if (p.userData.name.includes('Kedi Yolu İçi Korkuluksuz Tabla') || p.userData.name.includes('Kedi Yolu Korkuluksuz Tabla')) totalWeight += 145;

    p.children.forEach(child => {
      if (child.userData && child.userData.interactive) {
        if (child.userData.type === 'antenna') {
          antennaCount++;
          totalWeight += 25;
        } else if (child.userData.type === 'rru') {
          rruCount++;
          totalWeight += child.userData.weight || 18;
        } else if (child.userData.type === 'tray') {
          totalWeight += 10;
        }
      }
    });
  });

  const elPlat = document.getElementById('stat-platforms');
  const elAnt = document.getElementById('stat-antennas');
  const elRru = document.getElementById('stat-rrus');
  const elWeight = document.getElementById('stat-weight');

  if (elPlat) elPlat.innerText = platformCount;
  if (elAnt) elAnt.innerText = antennaCount;
  if (elRru) elRru.innerText = rruCount;
  if (elWeight) elWeight.innerText = `${totalWeight} kg`;

  // Render BOQ table
  const tbody = document.querySelector('#bom-table tbody');
  if (tbody) {
    tbody.innerHTML = '';

    activePlatforms.forEach((p, index) => {
      let rowWeightText = '20 kg / 20 kg';
      if (p.userData.type === 'rru') {
        rowWeightText = `${p.userData.weight} kg / ${p.userData.weight} kg`;
      }
      else if (p.userData.name.includes('Kiriş-2')) rowWeightText = '65 kg / 65 kg';
      else if (p.userData.name.includes('Kiriş-1')) rowWeightText = '35 kg / 35 kg';
      else if (p.userData.name.includes('Tabla-2')) rowWeightText = '22 kg / 22 kg';
      else if (p.userData.name.includes('Boru-1')) rowWeightText = '25 kg / 25 kg';
      else if (p.userData.name.includes('RRU Saha Blok')) rowWeightText = '284 kg / 284 kg';
      else if (p.userData.name.includes('RRU Blok (Korkuluklu)')) rowWeightText = '245 kg / 245 kg';
      else if (p.userData.name.includes('Rack Blok (Korkuluklu)')) rowWeightText = '189 kg / 189 kg';
      else if (p.userData.name.includes('RRU Blok')) rowWeightText = '205 kg / 205 kg';
      else if (p.userData.name.includes('Rack Blok')) rowWeightText = '149 kg / 149 kg';
      else if (p.userData.name.includes('Çemberli H-Beam')) rowWeightText = '480 kg / 480 kg';
      else if (p.userData.name.includes('Çift RRU Kompleksi')) rowWeightText = '860 kg / 860 kg';
      else if (p.userData.name.includes('Kedi Yolu Tabla + Flanşlı Pol + 42U')) rowWeightText = '385 kg / 385 kg';
      else if (p.userData.name.includes('30U POI Rack') || p.userData.name.includes('POI Kompleks (4 POI)') || p.userData.name.includes('30U POI Kompleks')) rowWeightText = '136 kg / 136 kg';
      else if (p.userData.name.includes('Kedi Yolu Tabla + 42U')) rowWeightText = '295 kg / 295 kg';
      else if (p.userData.name.includes('Kedi Yolu İçi Korkuluksuz Tabla') || p.userData.name.includes('Kedi Yolu Korkuluksuz Tabla')) rowWeightText = '145 kg / 145 kg';

      tbody.innerHTML += `
        <tr>
          <td><strong>Öğe ${index + 1}</strong></td>
          <td>${p.userData.name} ${p.userData.category ? `(${p.userData.category})` : ''}</td>
          <td>1</td>
          <td>${mToCm(p.userData.width)}x${mToCm(p.userData.depth)}x${mToCm(p.userData.height)}</td>
          <td>${rowWeightText}</td>
        </tr>
      `;
      p.children.forEach(child => {
        if (child.userData && child.userData.interactive) {
          let weight = child.userData.type === 'antenna' ? 25 : (child.userData.type === 'rru' ? (child.userData.weight || 18) : 10);
          tbody.innerHTML += `
            <tr style="font-size: 12px; color: var(--text-secondary);">
              <td style="padding-left: 24px;">└─ ${child.userData.name}</td>
              <td>Modül / Ekipman</td>
              <td>1</td>
              <td>-</td>
              <td>${weight} kg / ${weight} kg</td>
            </tr>
          `;
        }
      });
    });
  }
}

// Screenshot Export
document.getElementById('btn-screenshot').addEventListener('click', () => {
  renderer.render(scene, camera);
  const dataURL = renderer.domElement.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = 'gs-catwalk-design-area1.png';
  link.href = dataURL;
  link.click();
});

// Modal BOQ Toggle
const modal = document.getElementById('bom-modal');
const btnExportBom = document.getElementById('btn-export-bom');
if (btnExportBom) {
  btnExportBom.addEventListener('click', () => {
    modal.style.display = 'flex';
  });
}
document.getElementById('btn-close-modal').addEventListener('click', () => {
  modal.style.display = 'none';
});
document.getElementById('btn-print-bom').addEventListener('click', () => {
  window.print();
});

// Settings Popup Modal Handlers
const settingsModal = document.getElementById('settings-modal');
const btnSettings = document.getElementById('btn-settings');
const btnCloseSettings = document.getElementById('btn-close-settings');
const btnCloseSettingsX = document.getElementById('btn-close-settings-x');
const settingToggleAxes = document.getElementById('setting-toggle-axes');

if (btnSettings && settingsModal) {
  btnSettings.addEventListener('click', () => {
    settingsModal.style.display = 'flex';
  });
}

const closeSettingsModal = () => {
  if (settingsModal) settingsModal.style.display = 'none';
};

if (btnCloseSettings) btnCloseSettings.addEventListener('click', closeSettingsModal);
if (btnCloseSettingsX) btnCloseSettingsX.addEventListener('click', closeSettingsModal);

if (settingsModal) {
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) closeSettingsModal();
  });
}

if (settingToggleAxes) {
  settingToggleAxes.checked = false;
  settingToggleAxes.addEventListener('change', (e) => {
    const isVisible = e.target.checked;
    
    // 1. Origin Axes Helper (X / Y / Z lines)
    if (typeof axesHelper !== 'undefined') axesHelper.visible = isVisible;
    
    // 2. Floor Ground Coordinate Guide Arrows & Labels (+X, -X, +Z, -Z)
    const groundGuide = scene.getObjectByName('groundCoordinateGuide');
    if (groundGuide) groundGuide.visible = isVisible;

    // Grid lines remain ALWAYS visible (tabandaki kareler kalır)
    if (typeof gridHelper !== 'undefined') gridHelper.visible = true;
  });
}

// =========================================================================
// GÜVENLİ GELİŞTİRİCİ MODU (KRİPTOGRAFİK TEK YÖNLÜ DOĞRULAMA - SHA-256)
// Kullanıcı İsteği: "Geliştirici modunun açılabilmesi için basit bir şifre girmek istiyorum
// eger koda bakarak bu şifreyi görmelerini engelleyebilirsen..."
// Güvenlik Tasarımı: Şifre kaynak kodda ASLA açık metin olarak bulunmaz.
// Tuzlanmış (salted) SHA-256 kriptografik özeti saklanır; geri döndürülemez.
// =========================================================================
const AUTH_DEV_DIGEST = '271349e66af718176dd95fc94d479e8fbcb10afd28b86e24c704a4dae65d2c02';
const AUTH_DEV_SALT = 'stad_dev_salt_2026#';

// Bağımsız ve hafif Saf JS SHA-256 Karma Fonksiyonu (Offline, her tarayıcı ve ortamda çalışır)
function computeDevAuthHash(ascii) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let lengthProperty = 'length';
  let i, j;
  let result = '';
  let words = [];
  let asciiBitLength = ascii[lengthProperty] * 8;
  let hash = [];
  let k = [];
  let primeCounter = 0;
  let isComposite = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  ascii += '\x80';
  while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return '';
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength;
  for (j = 0; j < words[lengthProperty];) {
    let w = words.slice(j, (j += 16));
    let oldHash = hash;
    hash = hash.slice(0, 8);
    for (i = 0; i < 64; i++) {
      let w15 = w[i - 15], w2 = w[i - 2];
      let s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      let s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      let ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      let maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      let temp1 = hash[7] + (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) + ch + k[i] + (
        w[i] = (i < 16) ? w[i] : (w[i - 16] + s0 + w[i - 7] + s1) | 0
      );
      let temp2 = (rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + maj;
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }
    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }
  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      let b = (hash[i] >> (j * 8)) & 255;
      result += ((b < 16) ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

let isCamCoordsModalOpen = false;
let isDevModeActive = false;

const settingToggleMenus = document.getElementById('setting-toggle-menus');
const settingDevRow = document.getElementById('setting-dev-row');
const devModeBadge = document.getElementById('dev-mode-badge');
const btnGetCamCoords = document.getElementById('btn-get-cam-coords');

const devAuthModal = document.getElementById('dev-auth-modal');
const devAuthPassword = document.getElementById('dev-auth-password');
const btnToggleDevPassword = document.getElementById('btn-toggle-dev-password');
const devAuthError = document.getElementById('dev-auth-error');
const btnSubmitDevAuth = document.getElementById('btn-submit-dev-auth');
const btnCancelDevAuth = document.getElementById('btn-cancel-dev-auth');
const btnCloseDevAuthX = document.getElementById('btn-close-dev-auth-x');
const devToast = document.getElementById('dev-toast');

function showDevToast(msg, isSuccess = true) {
  if (!devToast) return;
  devToast.innerHTML = (isSuccess ? '<span>✅</span>' : '<span>ℹ️</span>') + '<span>' + msg + '</span>';
  devToast.style.borderLeftColor = isSuccess ? '#10b981' : '#3b82f6';
  devToast.style.display = 'flex';
  setTimeout(() => {
    devToast.style.opacity = '1';
    devToast.style.transform = 'translateY(0)';
  }, 10);
  setTimeout(() => {
    devToast.style.opacity = '0';
    devToast.style.transform = 'translateY(10px)';
    setTimeout(() => {
      devToast.style.display = 'none';
    }, 300);
  }, 3200);
}

function updateDevModeUI(enabled) {
  isDevModeActive = enabled;
  if (settingToggleMenus) settingToggleMenus.checked = enabled;

  if (devModeBadge) {
    if (enabled) {
      devModeBadge.textContent = '🔓 AÇIK';
      devModeBadge.style.background = '#dcfce7';
      devModeBadge.style.color = '#15803d';
      devModeBadge.style.borderColor = '#bbf7d0';
    } else {
      devModeBadge.textContent = '🔒 ŞİFRELİ';
      devModeBadge.style.background = '#fef3c7';
      devModeBadge.style.color = '#b45309';
      devModeBadge.style.borderColor = '#fde68a';
    }
  }

  if (enabled) {
    document.body.classList.remove('hide-sidebars');
    if (btnGetCamCoords) btnGetCamCoords.style.display = 'inline-block';
  } else {
    document.body.classList.add('hide-sidebars');
    if (btnGetCamCoords) {
      btnGetCamCoords.style.display = 'none';
      btnGetCamCoords.classList.remove('active');
    }
    const modal = document.getElementById('cam-coords-modal');
    if (modal) {
      modal.style.display = 'none';
      isCamCoordsModalOpen = false;
    }
  }
}

function openDevAuthModal() {
  if (!devAuthModal) return;
  devAuthModal.style.display = 'flex';
  if (devAuthPassword) {
    devAuthPassword.value = '';
    devAuthPassword.type = 'password';
    devAuthPassword.style.borderColor = '#cbd5e1';
    setTimeout(() => devAuthPassword.focus(), 120);
  }
  if (devAuthError) devAuthError.style.display = 'none';
  if (btnToggleDevPassword) btnToggleDevPassword.textContent = '👁️';
}

function closeDevAuthModal() {
  if (!devAuthModal) return;
  devAuthModal.style.display = 'none';
  if (devAuthPassword) devAuthPassword.value = '';
  if (devAuthError) devAuthError.style.display = 'none';
  if (settingToggleMenus && !isDevModeActive) {
    settingToggleMenus.checked = false;
  }
}

function handleDevAuthSubmit() {
  if (!devAuthPassword) return;
  const inputVal = devAuthPassword.value.trim();
  const calculatedHash = computeDevAuthHash(AUTH_DEV_SALT + inputVal);

  if (calculatedHash === AUTH_DEV_DIGEST) {
    updateDevModeUI(true);
    closeDevAuthModal();
    showDevToast('Geliştirici Modu Başarıyla Açıldı!', true);
    
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
      if (typeof updateRendererDimensions === 'function') {
        updateRendererDimensions();
      }
    }, 50);
  } else {
    if (devAuthError) {
      devAuthError.style.display = 'flex';
    }
    if (devAuthPassword) {
      devAuthPassword.style.borderColor = '#ef4444';
      devAuthPassword.focus();
      devAuthPassword.select();
    }
  }
}

// Dev Mode Row & Checkbox Toggle
if (settingDevRow) {
  settingDevRow.addEventListener('click', (e) => {
    e.preventDefault();
    if (!isDevModeActive) {
      openDevAuthModal();
    } else {
      updateDevModeUI(false);
      showDevToast('Geliştirici Modu Kapatıldı', false);
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        if (typeof updateRendererDimensions === 'function') {
          updateRendererDimensions();
        }
      }, 50);
    }
  });
} else if (settingToggleMenus) {
  settingToggleMenus.addEventListener('click', (e) => {
    e.preventDefault();
    if (!isDevModeActive) {
      openDevAuthModal();
    } else {
      updateDevModeUI(false);
    }
  });
}

// Auth Modal Actions
if (btnSubmitDevAuth) btnSubmitDevAuth.addEventListener('click', handleDevAuthSubmit);
if (btnCancelDevAuth) btnCancelDevAuth.addEventListener('click', closeDevAuthModal);
if (btnCloseDevAuthX) btnCloseDevAuthX.addEventListener('click', closeDevAuthModal);

if (devAuthPassword) {
  devAuthPassword.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleDevAuthSubmit();
    } else if (e.key === 'Escape') {
      closeDevAuthModal();
    }
  });
}

if (btnToggleDevPassword && devAuthPassword) {
  btnToggleDevPassword.addEventListener('click', () => {
    if (devAuthPassword.type === 'password') {
      devAuthPassword.type = 'text';
      btnToggleDevPassword.textContent = '🙈';
    } else {
      devAuthPassword.type = 'password';
      btnToggleDevPassword.textContent = '👁️';
    }
  });
}

if (devAuthModal) {
  devAuthModal.addEventListener('click', (e) => {
    if (e.target === devAuthModal) {
      closeDevAuthModal();
    }
  });
}

// Global Hızlı Kısayol: Ctrl + Shift + D ile doğrudan şifre penceresini açma
window.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
    e.preventDefault();
    if (!isDevModeActive) {
      openDevAuthModal();
    } else {
      updateDevModeUI(false);
      showDevToast('Geliştirici Modu Kapatıldı', false);
    }
  }
});

// Başlangıç Durumu: Kapalı
updateDevModeUI(false);

// ==========================================
// 3D View Modes & Fullscreen Presentation Mode
// ==========================================
const mainViewport = document.getElementById('main-viewport-container') || document.querySelector('.viewport-container');
const presentationHud = document.getElementById('presentation-hud');
const btnFullscreenHeader = document.getElementById('btn-fullscreen-header');
const btnToggleFullscreen = document.getElementById('btn-toggle-fullscreen');
const presSelectArea = document.getElementById('pres-select-area');
const presBtn2d = document.getElementById('pres-btn-2d');
const presBtn3d = document.getElementById('pres-btn-3d');
const presBtnAutoRotate = document.getElementById('pres-btn-autorotate');
const presBtnResetCam = document.getElementById('pres-btn-reset-cam');
const presBtnExit = document.getElementById('pres-btn-exit');

const btnViewOrtho = document.getElementById('btn-view-ortho');
const btnViewPersp = document.getElementById('btn-view-persp');

function updateRendererDimensions() {
  if (!container || !camera || !renderer) return;
  const w = container.clientWidth;
  const h = container.clientHeight;
  if (w > 0 && h > 0) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
}

// Window Resize handler
window.addEventListener('resize', updateRendererDimensions);

// View Modes Toggle
if (btnViewOrtho) {
  btnViewOrtho.addEventListener('click', () => {
    if (btnViewPersp) btnViewPersp.classList.remove('active');
    btnViewOrtho.classList.add('active');
    if (presBtn2d) presBtn2d.classList.add('active');
    if (presBtn3d) presBtn3d.classList.remove('active');
    setCameraView(0, 15, 0, 0, 0, 0);
  });
}

if (btnViewPersp) {
  btnViewPersp.addEventListener('click', () => {
    if (btnViewOrtho) btnViewOrtho.classList.remove('active');
    btnViewPersp.classList.add('active');
    if (presBtn3d) presBtn3d.classList.add('active');
    if (presBtn2d) presBtn2d.classList.remove('active');
    setCameraView(5, 5, 8, 0, 0, 0);
  });
}



// =========================================================================
// ALAN BAZLI DİNAMİK KAMERA ODAK BUTONLARI & ÖN AYARLARI
// =========================================================================
const AREA_CAMERA_PRESETS = {
  // Alan 1 ve Alan 3 (Maraton Tribünü ve Kedi Yolu)
  alan2: [
    {
      id: 'focus-rectifier',
      label: '⚡ Rectifier',
      title: 'Rectifier & Güç Kabinleri Odağı',
      border: '#0284c7',
      view: [-0.65, 2.84, 6.34, -0.65, 1.50, -3.57]
    },
    {
      id: 'focus-antenna-poi',
      label: '📡 Anten ve POI',
      title: 'Anten ve POI Sistemleri Odağı',
      border: '#eab308',
      view: [3.21, 8.55, 36.19, -5.96, 6.92, 39.81]
    },
    {
      id: 'focus-rru',
      label: '📻 RRU',
      title: 'RRU Saha Blokları Odağı',
      border: '#ec4899',
      view: [-6.27, 10.39, 31.34, 0.78, 8.42, 24.53]
    },
    {
      id: 'focus-catwalk-rru-sec',
      label: '📐 Kedi Yolu RRU Kesiti',
      title: 'Orta Kedi Yolu 14 RRU Montaj ve Geçiş Enkesiti',
      border: '#10b981',
      view: [-6.80, 8.90, 30.10, 0.00, 7.80, 30.10]
    }
  ],
  // Alan 2 (Scoreboard Kesiti + Kediyolu)
  alan4: [
    {
      id: 'focus-beton',
      label: '🧱 Beton',
      title: 'Beton Kaide ve Taşıyıcı Sistemi Odağı',
      border: '#64748b',
      view: [16.88, 20.69, 50.40, 16.65, 19.44, 60.32]
    },
    {
      id: 'focus-antennas',
      label: '📡 Sol Anten',
      title: '50m Silindir Taşıyıcı & Sol Anten Odağı',
      border: '#eab308',
      view: [-24.14, 18.16, 5.01, -15.72, 17.14, -0.28]
    },
    {
      id: 'focus-antennas-2',
      label: '📡 Sağ Anten',
      title: '50m Silindir Taşıyıcı & Sağ Anten Odağı',
      border: '#f59e0b',
      view: [-22.16, 24.07, 25.20, -13.34, 22.85, 20.63]
    },
    {
      id: 'focus-catwalk',
      label: '🚶 Kedi Yolu',
      title: 'Kedi Yolu Taşıyıcı Sistemi Odağı',
      border: '#ec4899',
      view: [2.90, 25.19, 4.65, -0.33, 19.53, -2.93]
    }
  ],
  // Alan 4 (Çapraz Köşe Tribün)
  alan3: [
    {
      id: 'focus-rru-poi',
      label: '📻 RRU ve POI',
      title: 'RRU ve POI Yerleşimi Odağı',
      border: '#0284c7',
      view: [-3.07, 2.70, 4.67, -3.41, 0.34, -5.04]
    },
    {
      id: 'focus-antennas',
      label: '📡 Antenler',
      title: 'Antenler ve Çatı Taşıyıcısı Odağı',
      border: '#eab308',
      view: [-5.85, 8.33, 33.95, 2.24, 5.87, 28.61]
    }
  ]
};

function renderAreaFocusButtons(areaKey = state.currentArea) {
  const container = document.getElementById('area-focus-buttons-container');
  if (!container) return;
  container.innerHTML = '';

  const presets = AREA_CAMERA_PRESETS[areaKey] || AREA_CAMERA_PRESETS.alan2;
  presets.forEach(p => {
    const btn = document.createElement('button');
    btn.id = `btn-${p.id}`;
    btn.className = 'btn-icon';
    btn.title = p.title;
    btn.innerHTML = p.label;
    btn.style.borderLeft = `2px solid ${p.border}`;
    btn.addEventListener('click', () => {
      setCameraView(...p.view);
    });
    container.appendChild(btn);
  });
}

window.setAntenler2Camera = function() {
  setCameraView(-22.16, 24.07, 25.20, -13.34, 22.85, 20.63);
};

window.setBetonCamera = function() {
  setCameraView(16.88, 20.69, 50.40, 16.65, 19.44, 60.32);
};

window.setKediYoluRruKesitCamera = function() {
  setCameraView(-6.80, 8.90, 30.10, 0.00, 7.80, 30.10);
};

// =========================================================================
// GEÇİCİ GELİŞTİRİCİ ARACI: KAMERA & HEDEF KOORDİNATLARI MÜFETTİŞİ
// =========================================================================
// isCamCoordsModalOpen is declared above

function updateCamCoordsDisplay() {
  const modal = document.getElementById('cam-coords-modal');
  if (!modal || modal.style.display === 'none') return;
  const liveChk = document.getElementById('chk-live-cam');
  if (liveChk && !liveChk.checked) return;

  const posX = camera.position.x.toFixed(2);
  const posY = camera.position.y.toFixed(2);
  const posZ = camera.position.z.toFixed(2);

  const tgtX = controls.target.x.toFixed(2);
  const tgtY = controls.target.y.toFixed(2);
  const tgtZ = controls.target.z.toFixed(2);

  const posEl = document.getElementById('cam-pos-text');
  if (posEl) posEl.textContent = `X: ${posX}, Y: ${posY}, Z: ${posZ}`;

  const tgtEl = document.getElementById('cam-target-text');
  if (tgtEl) tgtEl.textContent = `X: ${tgtX}, Y: ${tgtY}, Z: ${tgtZ}`;

  const codeInput = document.getElementById('cam-code-input');
  if (codeInput) {
    codeInput.value = `setCameraView(${posX}, ${posY}, ${posZ}, ${tgtX}, ${tgtY}, ${tgtZ});`;
  }
}

window.getCam = function() {
  const code = `setCameraView(${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)}, ${controls.target.x.toFixed(2)}, ${controls.target.y.toFixed(2)}, ${controls.target.z.toFixed(2)});`;
  console.log('[Kamera Kodu]', code);
  return code;
};

// btnGetCamCoords is already declared above
const camCoordsModal = document.getElementById('cam-coords-modal');
const btnCloseCamCoords = document.getElementById('btn-close-cam-coords');
const btnCopyCamCode = document.getElementById('btn-copy-cam-code');
const btnCopyCamJson = document.getElementById('btn-copy-cam-json');
const camCodeInput = document.getElementById('cam-code-input');
const camCopyStatus = document.getElementById('cam-copy-status');
const camCoordsHeader = document.getElementById('cam-coords-header');

if (btnGetCamCoords && camCoordsModal) {
  btnGetCamCoords.addEventListener('click', () => {
    const isHidden = camCoordsModal.style.display === 'none' || !camCoordsModal.style.display;
    if (isHidden) {
      camCoordsModal.style.display = 'block';
      isCamCoordsModalOpen = true;
      btnGetCamCoords.classList.add('active');
      const liveChk = document.getElementById('chk-live-cam');
      if (liveChk) liveChk.checked = true;
      updateCamCoordsDisplay();
      if (camCodeInput) camCodeInput.select();
      console.log(`[Kamera Koordinatları] setCameraView(${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)}, ${controls.target.x.toFixed(2)}, ${controls.target.y.toFixed(2)}, ${controls.target.z.toFixed(2)});`);
    } else {
      camCoordsModal.style.display = 'none';
      isCamCoordsModalOpen = false;
      btnGetCamCoords.classList.remove('active');
    }
  });

  if (btnCloseCamCoords) {
    btnCloseCamCoords.addEventListener('click', () => {
      camCoordsModal.style.display = 'none';
      isCamCoordsModalOpen = false;
      btnGetCamCoords.classList.remove('active');
    });
  }

  if (camCodeInput) {
    camCodeInput.addEventListener('click', () => {
      camCodeInput.select();
    });
  }

  function showCopyFeedback(msg) {
    if (!camCopyStatus) return;
    camCopyStatus.textContent = msg;
    camCopyStatus.style.display = 'inline-block';
    setTimeout(() => {
      camCopyStatus.style.display = 'none';
    }, 2000);
  }

  if (btnCopyCamCode) {
    btnCopyCamCode.addEventListener('click', () => {
      const code = `setCameraView(${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)}, ${controls.target.x.toFixed(2)}, ${controls.target.y.toFixed(2)}, ${controls.target.z.toFixed(2)});`;
      navigator.clipboard.writeText(code).then(() => {
        showCopyFeedback('✅ Kod Kopyalandı!');
      }).catch(() => {
        if (camCodeInput) {
          camCodeInput.select();
          document.execCommand('copy');
          showCopyFeedback('✅ Kod Kopyalandı!');
        }
      });
      console.log(`[Kamera Kodu Kopyalandı] ${code}`);
    });
  }

  if (btnCopyCamJson) {
    btnCopyCamJson.addEventListener('click', () => {
      const jsonStr = JSON.stringify({
        position: {
          x: Number(camera.position.x.toFixed(3)),
          y: Number(camera.position.y.toFixed(3)),
          z: Number(camera.position.z.toFixed(3))
        },
        target: {
          x: Number(controls.target.x.toFixed(3)),
          y: Number(controls.target.y.toFixed(3)),
          z: Number(controls.target.z.toFixed(3))
        }
      }, null, 2);
      navigator.clipboard.writeText(jsonStr).then(() => {
        showCopyFeedback('✅ JSON Kopyalandı!');
      }).catch(() => {
        showCopyFeedback('✅ Kopyalandı!');
      });
      console.log('[Kamera JSON Kopyalandı]', jsonStr);
    });
  }

  // Sürüklenebilir Başlık (Draggable Modal Header)
  if (camCoordsHeader) {
    let isDraggingModal = false;
    let dragStartX = 0, dragStartY = 0, initialLeft = 0, initialTop = 0;
    camCoordsHeader.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
      isDraggingModal = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      const rect = camCoordsModal.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
      if (!isDraggingModal) return;
      camCoordsModal.style.right = 'auto';
      camCoordsModal.style.left = `${initialLeft + (e.clientX - dragStartX)}px`;
      camCoordsModal.style.top = `${initialTop + (e.clientY - dragStartY)}px`;
    });
    window.addEventListener('mouseup', () => {
      isDraggingModal = false;
    });
  }
}

function isPresentationActive() {
  return document.fullscreenElement === mainViewport || 
         document.webkitFullscreenElement === mainViewport || 
         (mainViewport && mainViewport.classList.contains('fullscreen-mode'));
}

function enterPresentationMode() {
  if (!mainViewport) return;
  mainViewport.classList.add('fullscreen-mode');

  if (presentationHud) {
    presentationHud.style.display = 'flex';
  }

  // Synchronize area selector with main header
  const selectArea = document.getElementById('select-area');
  if (selectArea && presSelectArea) {
    presSelectArea.value = selectArea.value;
  }

  // Update button texts & active styling
  if (btnFullscreenHeader) {
    btnFullscreenHeader.classList.add('active');
    btnFullscreenHeader.innerHTML = '<span>🗗</span> <span>Tam Ekrandan Çık</span>';
  }
  if (btnToggleFullscreen) {
    btnToggleFullscreen.classList.add('active');
    btnToggleFullscreen.textContent = '🗗 Küçült';
  }

  // Trigger HTML5 Fullscreen API on main viewport
  if (!document.fullscreenElement && !document.webkitFullscreenElement) {
    if (mainViewport.requestFullscreen) {
      mainViewport.requestFullscreen().catch(() => {});
    } else if (mainViewport.webkitRequestFullscreen) {
      mainViewport.webkitRequestFullscreen();
    }
  }

  setTimeout(updateRendererDimensions, 50);
  setTimeout(updateRendererDimensions, 200);
}

function exitPresentationMode() {
  if (!mainViewport) return;
  mainViewport.classList.remove('fullscreen-mode');

  if (presentationHud) {
    presentationHud.style.display = 'none';
  }

  // Stop 360 tour if running
  controls.autoRotate = false;
  if (presBtnAutoRotate) {
    presBtnAutoRotate.classList.remove('active');
  }

  if (btnFullscreenHeader) {
    btnFullscreenHeader.classList.remove('active');
    btnFullscreenHeader.innerHTML = '<span>⛶</span> <span>Tam Ekran Sunum</span>';
  }
  if (btnToggleFullscreen) {
    btnToggleFullscreen.classList.remove('active');
    btnToggleFullscreen.textContent = '⛶ Tam Ekran';
  }

  // Exit native fullscreen if browser is in fullscreen
  if (document.fullscreenElement || document.webkitFullscreenElement) {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }

  updateRendererDimensions();
  setTimeout(updateRendererDimensions, 30);
  setTimeout(updateRendererDimensions, 100);
  setTimeout(updateRendererDimensions, 300);
  window.dispatchEvent(new Event('resize'));
}

function togglePresentationMode() {
  if (isPresentationActive()) {
    exitPresentationMode();
  } else {
    enterPresentationMode();
  }
}

// Wire Presentation UI Handlers
if (btnFullscreenHeader) {
  btnFullscreenHeader.addEventListener('click', (e) => {
    e.preventDefault();
    togglePresentationMode();
  });
}

if (btnToggleFullscreen) {
  btnToggleFullscreen.addEventListener('click', (e) => {
    e.preventDefault();
    togglePresentationMode();
  });
}

if (presBtnExit) {
  presBtnExit.addEventListener('click', (e) => {
    e.preventDefault();
    exitPresentationMode();
  });
}

if (presSelectArea) {
  presSelectArea.addEventListener('change', (e) => {
    const val = e.target.value;
    const selectArea = document.getElementById('select-area');
    if (selectArea && selectArea.value !== val) {
      selectArea.value = val;
      selectArea.dispatchEvent(new Event('change'));
    }
  });
}

// Sync presSelectArea whenever selectArea changes
const areaDropdown = document.getElementById('select-area');
if (areaDropdown && presSelectArea) {
  areaDropdown.addEventListener('change', (e) => {
    presSelectArea.value = e.target.value;
  });
}

if (presBtn2d) {
  presBtn2d.addEventListener('click', () => {
    if (btnViewOrtho) btnViewOrtho.click();
  });
}

if (presBtn3d) {
  presBtn3d.addEventListener('click', () => {
    if (btnViewPersp) btnViewPersp.click();
  });
}

// 360° Auto-Rotate Tur Kontrolü
if (presBtnAutoRotate) {
  presBtnAutoRotate.addEventListener('click', () => {
    controls.autoRotate = !controls.autoRotate;
    controls.autoRotateSpeed = 1.3;
    presBtnAutoRotate.classList.toggle('active', controls.autoRotate);
  });
}

// Kamera Odak / Reset
if (presBtnResetCam) {
  presBtnResetCam.addEventListener('click', () => {
    const currentArea = state.currentArea || 'alan2';
    if (currentArea === 'alan4') {
      setCameraView(-0.20, 29.03, -17.54, -0.32, 25.93, -8.03);
    } else if (currentArea === 'alan3') {
      setCameraView(-5.85, 8.33, 33.95, 2.24, 5.87, 28.61);
    } else {
      setCameraView(15.00, 10.00, 40.00, 15.00, 0.00, 0.00);
    }
  });
}

// Browser native fullscreen event listener (sync state if user presses browser Esc)
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) {
    exitPresentationMode();
  }
});
document.addEventListener('webkitfullscreenchange', () => {
  if (!document.webkitFullscreenElement) {
    exitPresentationMode();
  }
});

// Keyboard shortcuts for presentation mode (F / F11 / Esc)
window.addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
    return;
  }

  if (e.key === 'Escape') {
    if (isPresentationActive()) {
      e.preventDefault();
      exitPresentationMode();
    }

  } else if ((e.key === 'f' || e.key === 'F' || e.key === 'F11') && !e.ctrlKey && !e.altKey && !e.metaKey) {
    e.preventDefault();
    togglePresentationMode();
  }
});

function serializePlatform(p) {
  const isLockedX = !!p.userData.lockedX;
  const isLockedY = !!p.userData.lockedY;
  const isLockedZ = !!p.userData.lockedZ;

  return {
    name: p.userData.name,
    blockType: p.userData.blockType || null,
    catalogId: p.userData.catalogId || null,
    type: p.userData.type || null,
    category: p.userData.category || null,
    isFreestanding: !!p.userData.isFreestanding,
    isOffsetArmModule: !!p.userData.isOffsetArmModule,
    isOffsetCarrier: !!p.userData.isOffsetCarrier,
    isInclinedPipe: !!p.userData.isInclinedPipe,
    position: {
      x: p.position.x,
      y: p.position.y,
      z: p.position.z
    },
    rotation: {
      x: p.rotation.x,
      y: p.rotation.y,
      z: p.rotation.z
    },
    locked: (isLockedX && isLockedY && isLockedZ) || !!p.userData.locked,
    lockedX: isLockedX,
    lockedY: isLockedY,
    lockedZ: isLockedZ,
    allowPassThrough: p.userData.allowPassThrough !== false
  };
}

function deserializeItemToArea(item, targetArea) {
  let group = null;
  const itemName = item.name || '';
  const blockType = item.blockType || '';
  const isRotatedArea = (targetArea === 'alan2' || targetArea === 'alan3');

  // PRIORITIZE NAME MATCHING OVER LEGACY BLOCKTYPE:
  // Legacy JSON files saved 42U POI Racks with blockType: "42u-canovate-kabin".
  // Matching itemName.includes('42U POI Rack') FIRST ensures POI Racks are built with all 6 POI modules inside!
  if (blockType === 'scoreboard-matsing-cylinder-assembly' || itemName.includes('Silindir Çember Montajı')) {
    const side = item.side || (item.position && item.position.x < 0 ? 'left' : 'right');
    group = buildScoreboardMatsingCylinderOffsetAssembly(side);
  } else if (blockType && blockType.startsWith('scoreboard-rru-')) {
    if (item.position && item.position.y < 10.0) {
      item.position.y += 20.0;
    }
    const op = item.operator || (blockType.includes('turkcell') ? 'turkcell' : (blockType.includes('vodafone') ? 'vodafone' : 'tt'));
    group = buildScoreboardSingleRRU(op, item.position ? item.position.x : 0);
  } else if (blockType === 'alan2-alternatif2-rru-blok' || itemName.includes('Alternatif-2') || itemName.includes('Tablalı 4 Boru 7 RRU')) {
    group = buildAlan2Alternatif2RRUBlok(targetArea);
  } else if (blockType === 'alan2-kediyolu-42u-kompleks') {
    group = buildAlan2Kediyolu42UKompleksBlok(targetArea);
  } else if (blockType === 'alan2-karsilikli-11boru-rru-blok') {
    group = buildAlan2Karsilikli11BoruRRUBlok(targetArea);
  } else if (blockType === '4poi-rack-blok' || itemName.includes('4 POI Rack') || itemName.includes('4x POI Dolu, 42U Referanslı')) {
    group = build4PoiRackBlok(targetArea);
  } else if (itemName.includes('42U POI Rack') || itemName.includes('30U POI Rack') || blockType === '42u-poi-rack-blok' || blockType === 'alan2-4poi-rack-blok') {
    group = build42UPoiRackBlok(targetArea);
  } else if (itemName.includes('20U POI Rack') || blockType === '20u-poi-rack-blok' || blockType === '5poi-rack-blok' || itemName.includes('5x POI') || itemName.includes('5 POI') || itemName.includes('POI Rack Blok')) {
    group = (targetArea === 'alan2') ? build42UPoiRackBlok('alan2') : build20UPoiRackBlok(targetArea);
  } else if (
    blockType === 'rectifier-20u-eltek' || 
    item.catalogId === 'rectifier-20u-eltek' || 
    itemName.includes('20U Outdoor') || 
    itemName.includes('Eltek') || 
    itemName.includes('Flatpack')
  ) {
    group = buildRectifier20UModel(item);
  } else if (
    blockType === 'rectifier-turkcell-double' || 
    item.catalogId === 'rectifier-turkcell-double' || 
    itemName.includes('Turkcell Çift Bölmeli') || 
    itemName.includes('Çift Bölmeli')
  ) {
    group = buildRectifierTurkcellDoubleModel(item);
  } else if (
    blockType === 'rectifier-mts9304a' || 
    item.catalogId === 'rectifier-mts9304a' || 
    itemName.includes('MTS9304A') || 
    itemName.includes('12U Outdoor')
  ) {
    group = buildRectifierMTS9304AModel(item);
  } else if (item.category === 'Rectifier' || itemName.includes('Rectifier') || itemName.includes('DC Güç')) {
    group = buildCustomEquipmentModel(item);
  } else if (blockType === 'tcell-offset-blok' || itemName.includes('Turkcell 10')) {
    group = buildTCellOffsetBlok(targetArea);
  } else if (blockType === 'tt-5li-5527-blok' || itemName.includes("5'li RRU5527")) {
    group = buildTT5li5527Blok(targetArea);
  } else if (blockType === 'tt-5li-5818w-blok' || itemName.includes("5'li RRU5818W")) {
    group = buildTT5li5818WBlok(targetArea);
  } else if (blockType === 'voda-3li-rru-blok' || itemName.includes("3'lü RRU5526t")) {
    group = buildVoda3liRRUBlok(targetArea);
  } else if (blockType === 'voda-5li-rru-blok' || itemName.includes("5'li RRU5526t")) {
    group = buildVoda5liRRUBlok(targetArea);
  } else if (blockType === 'alan2-karma-rru-blok' || itemName.includes('Karma RRU')) {
    group = buildAlan2KarmaRRUBlok(targetArea);
  } else if (blockType === '42u-canovate-kabin' || itemName.includes('42U İkili Çerçeve') || itemName.includes('Canovate')) {
    group = build42UIkiliCerceveKabin();
  } else if (blockType === 'alan1-7boru-ozel-karma-blok' || itemName.includes('7 Borulu')) {
    group = buildAlan1OzelKarma7Boru13RRUBlok(targetArea);
  } else if (blockType === 'alan1-13rru-ozel-karma-blok' || itemName.includes('13 RRU')) {
    group = buildAlan1OzelKarma13RRUBlok(targetArea);
  } else if (blockType === 'ikili-42u-poi-blok' || itemName.includes("2'li POI") || itemName.includes("2li POI")) {
      group = buildDual42UPoiRackBlok(targetArea);
    } else if (blockType === 'spot-beam-truss-offset-assembly' || itemName.includes('Spot Beam')) {
      const isAntenna2 = (itemName && itemName.includes('Anten 2')) || (item.position && item.position.z > 32.0);
      const suffix = isAntenna2 ? ' (Alan 3 - Anten 2)' : ' (Alan 3 - Anten 1)';
      group = buildMatsingTrussMidOffsetAssembly('alan3', 2.0, suffix, 45);
    } else if (blockType === 'alan2-ozel-karma-blok' || itemName.includes('Özel Alan 2 Kompleksi') || itemName.includes('Beton Zemin Flanşlı')) {
      group = buildAlan2OzelKarmaBlok(targetArea);
    } else if (blockType === 'alan2-kediyolu-42u-kompleks' || itemName.includes('Kedi Yolu Tabla + 42U') || itemName.includes('Kedi Yolu Tabla + POI Kompleks') || itemName.includes('30U POI Kompleks')) {
      group = buildAlan2Kediyolu42UKompleksBlok(targetArea);
    } else if (blockType === 'alan2-karsilikli-11boru-rru-blok' || itemName.includes('Karşılıklı 11 Boru')) {
      group = buildAlan2Karsilikli11BoruRRUBlok(targetArea);
    } else if (blockType === 'alan1-ozel-karma-blok' || itemName.includes('Özel Karma Blok')) {
    group = buildAlan1OzelKarmaBlok(targetArea);
  } else if (blockType === 'rru-saha-blok-140' || itemName.includes('140cm')) {
    group = buildRRUSahaBlok140Model(targetArea);
  } else if (blockType === 'alan4-cember-platform-blok' || itemName.includes('Çemberli H-Beam')) {
    group = buildAlan4CemberPlatformBlok();
  } else if (blockType === 'alan4-ozel-karma-blok' || itemName.includes('Özel Alan 4 Kompleksi')) {
    group = buildAlan4OzelKarmaBlok(targetArea);
  } else if (blockType === 'alan4-cift-rru-kompleks' || itemName.includes('Çift RRU Kompleksi')) {
    group = buildAlan4CiftRRUKompleksBlok(targetArea);
    } else if (blockType === 'alan2-kediyolu-42u-kompleks') {
      group = buildAlan2Kediyolu42UKompleksBlok(targetArea);
    } else if (blockType === 'alan2-karsilikli-11boru-rru-blok') {
      group = buildAlan2Karsilikli11BoruRRUBlok(targetArea);
    } else if (blockType === 'alan4-kediyolu-42u-kompleks' || itemName.includes('Kedi Yolu Tabla + Flanşlı Pol + 42U') || itemName.includes('Kedi Yolu Tabla + 42U')) {
    group = buildAlan4Kediyolu42UKompleksBlok(targetArea);
  } else if (blockType === 'alan4-kediyolu-tabla-blok' || itemName.includes('Kedi Yolu İçi Korkuluksuz Tabla') || itemName.includes('Kedi Yolu Korkuluksuz Tabla')) {
    group = buildAlan4KediyoluTablaBlok();
  } else if (blockType === 'rru-saha-blok-120' || itemName.includes('120cm')) {
    group = buildRRUSahaBlok120Model(targetArea);
  } else if (blockType === 'rru-saha-blok' || itemName.includes('RRU Saha Blok')) {
    group = buildRRUSahaBlokModel(targetArea);
  } else if (blockType === 'rru-blok-korkuluklu' || (itemName.includes('RRU Blok') && itemName.includes('Korkuluklu'))) {
    group = buildRRUBlokKorkulukluModel(isRotatedArea);
  } else if (blockType === 'rru-blok' || itemName === 'RRU Blok' || itemName === 'RRU Blok (Alan 2)') {
    group = buildRRUBlokModel();
  } else if (blockType === 'matsing-mid-offset-assembly' || itemName.includes('Ara Bölge') || itemName.includes('Çatı Taşıyıcısı Asılı')) {
    const isAntenna2 = (itemName && itemName.includes('2')) || (item.position && Math.abs(item.position.z - 35.234) < 0.6);
    const dropDist = (targetArea === 'alan4') ? 2.0 : (isAntenna2 ? 1.637 : 2.0);
    const suffix = (targetArea === 'alan4') ? '' : (isAntenna2 ? ' (Ara Bölge - 2)' : ' (Ara Bölge - 1)');
    group = buildMatsingTrussMidOffsetAssembly(targetArea, dropDist, suffix);
  } else if (blockType === 'matsing-offset-assembly' || itemName.includes('Matsing')) {
    group = buildMatsingDiagonalOffsetAssembly(targetArea);
  } else if (blockType === 'rack-blok-korkuluklu' || (itemName.includes('Rack Blok') && itemName.includes('Korkuluklu'))) {
    group = buildRackBlokKorkulukluModel(isRotatedArea);
  } else if (blockType === 'rack-blok' || itemName === 'Rack Blok' || itemName === 'Rack Blok (Alan 2)') {
    group = buildRackBlokModel();
  } else if (blockType === 'offset-arm-right' || (itemName.includes('Ofset') && itemName.includes('Sağ'))) {
    group = buildOffsetArmPipeModel('right');
  } else if (blockType === 'offset-arm-left' || (itemName.includes('Ofset') && itemName.includes('Sol'))) {
    group = buildOffsetArmPipeModel('left');
  } else if (blockType === 'kiris1' || itemName.includes('Kiriş-1')) {
    group = buildKiris1();
  } else if (blockType === 'kiris2' || itemName.includes('Kiriş-2')) {
    group = buildKiris2();
  } else if (blockType === 'tabla1' || itemName.includes('Tabla-1')) {
    group = buildTabla1();
  } else if (blockType === 'tabla2' || itemName.includes('Tabla-2')) {
    group = buildTabla2();
  } else if (blockType === 'tabla3' || itemName.includes('Tabla-3')) {
    group = buildTabla3();
  } else {
    // Check catalog items by catalogId or name matching
    const catalogItem = EQUIPMENT_CATALOG.find(cat => 
      (item.catalogId && cat.id === item.catalogId) || 
      cat.name === itemName ||
      (itemName && itemName.startsWith(cat.name)) ||
      (itemName && itemName.includes(cat.name))
    );
    if (catalogItem) {
      group = buildCustomEquipmentModel(catalogItem);
    } else if (itemName.startsWith('RRU') || itemName.startsWith('POI') || item.type === 'rru') {
      const fallbackItem = {
        id: 'custom-' + itemName,
        category: item.category || (itemName.includes('POI') ? 'POI' : 'RRU'),
        name: itemName,
        width: item.width || 0.356,
        height: item.height || 0.480,
        depth: item.depth || 0.140,
        weight: item.weight || 25,
        color: '#dc2626'
      };
      group = buildCustomEquipmentModel(fallbackItem);
    }
  }

  if (group) {
    group.userData.id = state.nextId++;
    group.userData.name = itemName || group.userData.name;
    if (item.blockType) group.userData.blockType = item.blockType;
    if (item.catalogId) group.userData.catalogId = item.catalogId;
    if (item.category) group.userData.category = item.category;
    if (item.isFreestanding !== undefined) group.userData.isFreestanding = !!item.isFreestanding;
    if (item.isOffsetArmModule !== undefined) group.userData.isOffsetArmModule = !!item.isOffsetArmModule;
    if (item.isOffsetCarrier !== undefined) group.userData.isOffsetCarrier = !!item.isOffsetCarrier;
    if (item.isInclinedPipe !== undefined) group.userData.isInclinedPipe = !!item.isInclinedPipe;
    
    if (item.lockedX !== undefined || item.lockedY !== undefined || item.lockedZ !== undefined) {
      group.userData.lockedX = !!item.lockedX;
      group.userData.lockedY = !!item.lockedY;
      group.userData.lockedZ = !!item.lockedZ;
    } else {
      const isLegacyLocked = !!item.locked;
      group.userData.lockedX = isLegacyLocked;
      group.userData.lockedY = isLegacyLocked;
      group.userData.lockedZ = isLegacyLocked;
    }

    group.userData.locked = (group.userData.lockedX && group.userData.lockedY && group.userData.lockedZ);
    group.userData.allowPassThrough = (item.allowPassThrough !== false);
    
    if (item.position) {
      let py = item.position.y;
      let pz = item.position.z;
      if (targetArea === 'alan4' && !group.userData.isScoreboardRRU && group.userData.blockType !== 'scoreboard-matsing-cylinder-assembly') {
        if (py < 10.0) py += 20.0;
        if (pz === 0 || pz === -2.0) pz = -0.70;
      }
      group.position.set(item.position.x, py, pz);
    }
    if (group.userData && group.userData.isScoreboardRRU) {
      group.userData.initialY = group.position.y;
      group.userData.initialZ = group.position.z;
    }
    if (item.rotation) {
      group.rotation.set(item.rotation.x, item.rotation.y, item.rotation.z);
    }

    group.visible = (targetArea === state.currentArea);
    scene.add(group);

    if (targetArea === 'alan4') state.alan4Platforms.push(group);
    else if (targetArea === 'alan2') state.alan2Platforms.push(group);
    else if (targetArea === 'alan3') state.alan3Platforms.push(group);
    else state.alan1Platforms.push(group);
  }
}

// Projeyi JSON Olarak Kaydet (Export All Areas Together)
document.getElementById('btn-export-json').addEventListener('click', () => {
  const exportData = {
    version: "2.0",
    savedAt: new Date().toISOString(),
    currentArea: state.currentArea,
    areas: {
        alan1: state.alan1Platforms.map(serializePlatform),
        alan2: state.alan2Platforms.map(serializePlatform),
        alan3: state.alan3Platforms.map(serializePlatform),
        alan4: state.alan4Platforms.map(serializePlatform)
      }
  };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `gs-stad-catwalk-project-full.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
});

// Preset Draft Templates Registry
const PRESET_DRAFTS = {
  "taslak-v3": {
    "version": "2.0",
    "savedAt": "2026-09-11T10:29:55.105Z",
    "currentArea": "alan4",
    "areas": {
      "alan1": [
        {
          "name": "Alan 1 Özel Karma Blok (4 Bileşenli)",
          "blockType": "alan1-ozel-karma-blok",
          "catalogId": null,
          "type": "rru",
          "category": "Karma",
          "isFreestanding": false,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 0,
            "y": 0,
            "z": -1.1855
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        }
      ],
      "alan2": [
        {
          "name": "30U POI Rack (4 POI) - Doğrudan Beton Zemin (Alan 2)",
          "blockType": "alan2-kediyolu-42u-kompleks",
          "catalogId": null,
          "type": "rru",
          "category": "Canovate",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -4.361001259960455,
            "y": 0,
            "z": -1.1805947860171155
          },
          "rotation": {
            "x": 0,
            "y": 18.84955592153876,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "30U POI Rack (4 POI) - Doğrudan Beton Zemin (Alan 2)",
          "blockType": "alan2-kediyolu-42u-kompleks",
          "catalogId": null,
          "type": "rru",
          "category": "Canovate",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -3.615809390325525,
            "y": 0,
            "z": -1.1914694272152344
          },
          "rotation": {
            "x": 0,
            "y": 18.84955592153876,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "30U POI Rack (4 POI) - Doğrudan Beton Zemin (Alan 2)",
          "blockType": "alan2-kediyolu-42u-kompleks",
          "catalogId": null,
          "type": "rru",
          "category": "Canovate",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -5.103055270452055,
            "y": 0,
            "z": -1.216680015245864
          },
          "rotation": {
            "x": 0,
            "y": 18.84955592153876,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "Alan 2 Özel Karşılıklı 11 Boru 21 RRU Blok",
          "blockType": "alan2-karsilikli-11boru-rru-blok",
          "catalogId": null,
          "type": "rru",
          "category": "Karma",
          "isFreestanding": false,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -1.520515241914614,
            "y": 0,
            "z": -1.164294472925311
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "20U Outdoor DC Güç Kaynağı (Eltek Flatpack2 24kW) (Alan 2)",
          "blockType": "rectifier-20u-eltek",
          "catalogId": "rectifier-20u-eltek",
          "type": "rru",
          "category": "Rectifier",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 4.194284776610373,
            "y": 0,
            "z": -1.4117056039669595
          },
          "rotation": {
            "x": 0,
            "y": 6.283185307179586,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "20U Outdoor DC Güç Kaynağı (Eltek Flatpack2 24kW) (Alan 2)",
          "blockType": "rectifier-20u-eltek",
          "catalogId": "rectifier-20u-eltek",
          "type": "rru",
          "category": "Rectifier",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 3.4028464432652448,
            "y": 0,
            "z": -1.4206267185693213
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "MTS9304A-HX10AX 12U Outdoor Rectifier Kabini (Alan 2)",
          "blockType": "rectifier-mts9304a",
          "catalogId": "rectifier-mts9304a",
          "type": "rru",
          "category": "Rectifier",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 2.605808707734417,
            "y": 0,
            "z": -1.4547246070415678
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "MTS9304A-HX10AX 12U Outdoor Rectifier Kabini (Alan 2)",
          "blockType": "rectifier-mts9304a",
          "catalogId": "rectifier-mts9304a",
          "type": "rru",
          "category": "Rectifier",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 1.7417955494464192,
            "y": 0,
            "z": -1.4595080285942583
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "20U Outdoor DC Güç Kaynağı (Eltek Flatpack2 24kW) (Alan 2)",
          "blockType": "rectifier-20u-eltek",
          "catalogId": "rectifier-20u-eltek",
          "type": "rru",
          "category": "Rectifier",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 0.8394722597445441,
            "y": 0,
            "z": -1.4119842935578095
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "MTS9304A-HX10AX 12U Outdoor Rectifier Kabini (Alan 2)",
          "blockType": "rectifier-mts9304a",
          "catalogId": "rectifier-mts9304a",
          "type": "rru",
          "category": "Rectifier",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 5.050704812315493,
            "y": 0,
            "z": -1.4139675859568794
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "Matsing 4-Beam Çapraz Kol & Dikey Çift Ofset Montajı",
          "blockType": "matsing-offset-assembly",
          "catalogId": "matsing-4-beam",
          "type": "antenna",
          "category": "Matsing",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -3,
            "y": 6.976,
            "z": 41.568
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "Matsing 4-Beam Çatı Taşıyıcısı Asılı Ofset Montajı (Ara Bölge - 1)",
          "blockType": "matsing-mid-offset-assembly",
          "catalogId": "matsing-4-beam",
          "type": "antenna",
          "category": "Matsing",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -3,
            "y": 9.385,
            "z": 37.934
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "Matsing 4-Beam Çatı Taşıyıcısı Asılı Ofset Montajı (Ara Bölge - 2)",
          "blockType": "matsing-mid-offset-assembly",
          "catalogId": "matsing-4-beam",
          "type": "antenna",
          "category": "Matsing",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -3,
            "y": 9.022,
            "z": 35.234
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        }
      ],
      "alan3": [
        {
          "name": "Spot Beam 30/30 Panel Anten Çatı Taşıyıcısı Asılı Montajı (Alan 3 - Anten 1)",
          "blockType": "spot-beam-truss-offset-assembly",
          "catalogId": "doy15x3030md4tre",
          "type": "antenna",
          "category": "Panel Anten",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -3,
            "y": 8.533,
            "z": 31.603
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "Spot Beam 30/30 Panel Anten Çatı Taşıyıcısı Asılı Montajı (Alan 3 - Anten 2)",
          "blockType": "spot-beam-truss-offset-assembly",
          "catalogId": "doy15x3030md4tre",
          "type": "antenna",
          "category": "Panel Anten",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -3,
            "y": 8.667,
            "z": 32.594
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "2'li POI Küçük Rack Bloğu (2x POI Dolu) (Alan 3)",
          "blockType": "ikili-42u-poi-blok",
          "catalogId": null,
          "type": "rru",
          "category": "Canovate",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -3.7241268085306904,
            "y": 0,
            "z": -1.2734661913443657
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "Özel Alan 2 RRU Grubu (Beton Zemin Flanşlı, 7 RRU) (Alan 3)",
          "blockType": "alan2-ozel-karma-blok",
          "catalogId": null,
          "type": "rru",
          "category": "Karma",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -2.3755680487727076,
            "y": 0,
            "z": -1.1827264864581115
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        }
      ],
      "alan4": [
        {
          "name": "Matsing 4-Beam Silindir Doğrudan 45° Montajı (Sol - 20m Ofset)",
          "blockType": "scoreboard-matsing-cylinder-assembly",
          "catalogId": "matsing-4-beam",
          "type": "antenna",
          "category": "Matsing",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -20,
            "y": 19.05,
            "z": 0.55
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": true,
          "lockedZ": true,
          "allowPassThrough": true
        },
        {
          "name": "Matsing 4-Beam Silindir Doğrudan 45° Montajı (Sağ - 20m Ofset)",
          "blockType": "scoreboard-matsing-cylinder-assembly",
          "catalogId": "matsing-4-beam",
          "type": "antenna",
          "category": "Matsing",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 20,
            "y": 19.05,
            "z": 0.55
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": true,
          "lockedZ": true,
          "allowPassThrough": true
        },
        {
          "name": "Tablalı 4 Boru 7 RRU Bloğu - Sol POI Yanı",
          "blockType": "alan2-alternatif2-rru-blok",
          "catalogId": null,
          "type": "rru",
          "category": "RRU",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -1.731732010972016,
            "y": 20,
            "z": -0.8994569831600372
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "Tablalı 4 Boru 7 RRU Bloğu - Sağ POI Yanı",
          "blockType": "alan2-alternatif2-rru-blok",
          "catalogId": null,
          "type": "rru",
          "category": "RRU",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 1.6787984389135993,
            "y": 20,
            "z": -0.8336789287648787
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "4 POI Rack Blok (4x POI Dolu) (Alan 4)",
          "blockType": "4poi-rack-blok",
          "catalogId": null,
          "type": "rru",
          "category": "Canovate",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -3.247543458474242,
            "y": 20,
            "z": -0.919987257110642
          },
          "rotation": {
            "x": 0,
            "y": 1.5707963267948966,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "4 POI Rack Blok (4x POI Dolu) (Alan 4)",
          "blockType": "4poi-rack-blok",
          "catalogId": null,
          "type": "rru",
          "category": "Canovate",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 3.15004498709286,
            "y": 20,
            "z": -0.9023812996691016
          },
          "rotation": {
            "x": 0,
            "y": 4.71238898038469,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "MTS9304A-HX10AX 12U Outdoor Rectifier Kabini (Alan 4 - Sol)",
          "blockType": "rectifier-mts9304a",
          "catalogId": "rectifier-mts9304a",
          "type": "rru",
          "category": "Rectifier",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -18.904367698817854,
            "y": 18.121,
            "z": 59.923778081882354
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "20U Outdoor DC Güç Kaynağı (Eltek Flatpack2 24kW) (Alan 4 - Sol #1)",
          "blockType": "rectifier-20u-eltek",
          "catalogId": "rectifier-20u-eltek",
          "type": "rru",
          "category": "Rectifier",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -19.891477635101115,
            "y": 18.121,
            "z": 59.92760781677324
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "20U Outdoor DC Güç Kaynağı (Eltek Flatpack2 24kW) (Alan 4 - Sol #2)",
          "blockType": "rectifier-20u-eltek",
          "catalogId": "rectifier-20u-eltek",
          "type": "rru",
          "category": "Rectifier",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -20.852499127629343,
            "y": 18.121,
            "z": 59.946156104057025
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "30U POI Rack (4 POI) - Doğrudan Beton Zemin (Alan 4 - Sol #1)",
          "blockType": "alan2-kediyolu-42u-kompleks",
          "catalogId": null,
          "type": "rru",
          "category": "Canovate",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -15.9,
            "y": 18.121,
            "z": 59.87
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "30U POI Rack (4 POI) - Doğrudan Beton Zemin (Alan 4 - Sol #2)",
          "blockType": "alan2-kediyolu-42u-kompleks",
          "catalogId": null,
          "type": "rru",
          "category": "Canovate",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -15.15,
            "y": 18.121,
            "z": 59.87
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "30U POI Rack (4 POI) - Doğrudan Beton Zemin (Alan 4 - Sol #3)",
          "blockType": "alan2-kediyolu-42u-kompleks",
          "catalogId": null,
          "type": "rru",
          "category": "Canovate",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -14.4,
            "y": 18.121,
            "z": 59.87
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "Alan 2 Özel Karşılıklı 11 Boru 21 RRU Blok (Alan 4 - Sol)",
          "blockType": "alan2-karsilikli-11boru-rru-blok",
          "catalogId": null,
          "type": "rru",
          "category": "Karma",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -13.1,
            "y": 18.121,
            "z": 59.67
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "Alan 2 Özel Karşılıklı 11 Boru 21 RRU Blok (Alan 4 - Sağ)",
          "blockType": "alan2-karsilikli-11boru-rru-blok",
          "catalogId": null,
          "type": "rru",
          "category": "Karma",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 13.1,
            "y": 18.121,
            "z": 59.67
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "30U POI Rack (4 POI) - Doğrudan Beton Zemin (Alan 4 - Sağ #3)",
          "blockType": "alan2-kediyolu-42u-kompleks",
          "catalogId": null,
          "type": "rru",
          "category": "Canovate",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 14.4,
            "y": 18.121,
            "z": 59.87
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "30U POI Rack (4 POI) - Doğrudan Beton Zemin (Alan 4 - Sağ #2)",
          "blockType": "alan2-kediyolu-42u-kompleks",
          "catalogId": null,
          "type": "rru",
          "category": "Canovate",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 15.15,
            "y": 18.121,
            "z": 59.87
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "30U POI Rack (4 POI) - Doğrudan Beton Zemin (Alan 4 - Sağ #1)",
          "blockType": "alan2-kediyolu-42u-kompleks",
          "catalogId": null,
          "type": "rru",
          "category": "Canovate",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 15.9,
            "y": 18.121,
            "z": 59.87
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "MTS9304A-HX10AX 12U Outdoor Rectifier Kabini (Alan 4 - Sağ)",
          "blockType": "rectifier-mts9304a",
          "catalogId": "rectifier-mts9304a",
          "type": "rru",
          "category": "Rectifier",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 18.939452135483496,
            "y": 18.121,
            "z": 59.98847605333506
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "20U Outdoor DC Güç Kaynağı (Eltek Flatpack2 24kW) (Alan 4 - Sağ #1)",
          "blockType": "rectifier-20u-eltek",
          "catalogId": "rectifier-20u-eltek",
          "type": "rru",
          "category": "Rectifier",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 19.895991244901825,
            "y": 18.121,
            "z": 59.941324133445974
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "20U Outdoor DC Güç Kaynağı (Eltek Flatpack2 24kW) (Alan 4 - Sağ #2)",
          "blockType": "rectifier-20u-eltek",
          "catalogId": "rectifier-20u-eltek",
          "type": "rru",
          "category": "Rectifier",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 20.906794171321522,
            "y": 18.121,
            "z": 59.949520721251254
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "MTS9304A-HX10AX 12U Outdoor Rectifier Kabini (Alan 4 - Orta)",
          "blockType": "rectifier-mts9304a",
          "catalogId": "rectifier-mts9304a",
          "type": "rru",
          "category": "Rectifier",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 1.0,
            "y": 18.121,
            "z": 59.90
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "20U Outdoor DC Güç Kaynağı (Eltek Flatpack2 24kW) (Alan 4 - Orta #1)",
          "blockType": "rectifier-20u-eltek",
          "catalogId": "rectifier-20u-eltek",
          "type": "rru",
          "category": "Rectifier",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 1.8,
            "y": 18.121,
            "z": 59.90
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "20U Outdoor DC Güç Kaynağı (Eltek Flatpack2 24kW) (Alan 4 - Orta #2)",
          "blockType": "rectifier-20u-eltek",
          "catalogId": "rectifier-20u-eltek",
          "type": "rru",
          "category": "Rectifier",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 2.6,
            "y": 18.121,
            "z": 59.90
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "Matsing 4-Beam Çatı Taşıyıcısı Asılı Ofset Montajı (Alan 4 - Sol 37m)",
          "blockType": "matsing-mid-offset-assembly",
          "catalogId": "matsing-4-beam",
          "type": "antenna",
          "category": "Matsing",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -18.0,
            "y": 25.35,
            "z": 22.81
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "Matsing 4-Beam Çatı Taşıyıcısı Asılı Ofset Montajı (Alan 4 - Sol 40m)",
          "blockType": "matsing-mid-offset-assembly",
          "catalogId": "matsing-4-beam",
          "type": "antenna",
          "category": "Matsing",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -18.0,
            "y": 25.61,
            "z": 19.82
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "Matsing 4-Beam Çatı Taşıyıcısı Asılı Ofset Montajı (Alan 4 - Sağ 37m)",
          "blockType": "matsing-mid-offset-assembly",
          "catalogId": "matsing-4-beam",
          "type": "antenna",
          "category": "Matsing",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 18.0,
            "y": 25.35,
            "z": 22.81
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "Matsing 4-Beam Çatı Taşıyıcısı Asılı Ofset Montajı (Alan 4 - Sağ 40m)",
          "blockType": "matsing-mid-offset-assembly",
          "catalogId": "matsing-4-beam",
          "type": "antenna",
          "category": "Matsing",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 18.0,
            "y": 25.61,
            "z": 19.82
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        }
      ]
    }
  },
  "taslak-v2": {
    "version": "2.0",
    "savedAt": "2026-10-06T19:06:09.697Z",
    "currentArea": "alan4",
    "areas": {
      "alan1": [
        {
          "name": "Özel Alan 1 Kompleksi (7 Borulu Tek Cephe 13 RRU + 10 POI, 140cm)",
          "blockType": "alan1-7boru-ozel-karma-blok",
          "catalogId": null,
          "type": "rru",
          "category": "Karma",
          "isFreestanding": false,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 0,
            "y": 0,
            "z": -1.1855
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        }
      ],
      "alan2": [
        {
          "name": "30U POI Rack (4 POI) - Doğrudan Beton Zemin (Alan 2)",
          "blockType": "alan2-kediyolu-42u-kompleks",
          "catalogId": null,
          "type": "rru",
          "category": "Canovate",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -1.7577080923050312,
            "y": 0,
            "z": -1.1805947860171155
          },
          "rotation": {
            "x": 0,
            "y": 18.84955592153876,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": true,
          "allowPassThrough": true
        },
        {
          "name": "30U POI Rack (4 POI) - Doğrudan Beton Zemin (Alan 2)",
          "blockType": "alan2-kediyolu-42u-kompleks",
          "catalogId": null,
          "type": "rru",
          "category": "Canovate",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -1.0303985392914121,
            "y": 0,
            "z": -1.1914694272152344
          },
          "rotation": {
            "x": 0,
            "y": 18.84955592153876,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": true,
          "allowPassThrough": true
        },
        {
          "name": "30U POI Rack (4 POI) - Doğrudan Beton Zemin (Alan 2)",
          "blockType": "alan2-kediyolu-42u-kompleks",
          "catalogId": null,
          "type": "rru",
          "category": "Canovate",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -2.5612885599737107,
            "y": 0,
            "z": -1.216680015245864
          },
          "rotation": {
            "x": 0,
            "y": 18.84955592153876,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": true,
          "allowPassThrough": true
        },
        {
          "name": "Alan 2 Özel Karşılıklı 11 Boru 21 RRU Blok",
          "blockType": "alan2-karsilikli-11boru-rru-blok",
          "catalogId": null,
          "type": "rru",
          "category": "Karma",
          "isFreestanding": false,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -4.225534686783959,
            "y": 0,
            "z": -1.1860641464108814
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": true,
          "allowPassThrough": true
        },
        {
          "name": "20U Outdoor DC Güç Kaynağı (Eltek Flatpack2 24kW) (Alan 2)",
          "blockType": "rectifier-20u-eltek",
          "catalogId": "rectifier-20u-eltek",
          "type": "rru",
          "category": "Rectifier",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 4.194284776610373,
            "y": 0,
            "z": -1.4117056039669595
          },
          "rotation": {
            "x": 0,
            "y": 6.283185307179586,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "20U Outdoor DC Güç Kaynağı (Eltek Flatpack2 24kW) (Alan 2)",
          "blockType": "rectifier-20u-eltek",
          "catalogId": "rectifier-20u-eltek",
          "type": "rru",
          "category": "Rectifier",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 3.4028464432652448,
            "y": 0,
            "z": -1.4206267185693213
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "MTS9304A-HX10AX 12U Outdoor Rectifier Kabini (Alan 2)",
          "blockType": "rectifier-mts9304a",
          "catalogId": "rectifier-mts9304a",
          "type": "rru",
          "category": "Rectifier",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 2.605808707734417,
            "y": 0,
            "z": -1.4547246070415678
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "MTS9304A-HX10AX 12U Outdoor Rectifier Kabini (Alan 2)",
          "blockType": "rectifier-mts9304a",
          "catalogId": "rectifier-mts9304a",
          "type": "rru",
          "category": "Rectifier",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 1.7417955494464192,
            "y": 0,
            "z": -1.4595080285942583
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "20U Outdoor DC Güç Kaynağı (Eltek Flatpack2 24kW) (Alan 2)",
          "blockType": "rectifier-20u-eltek",
          "catalogId": "rectifier-20u-eltek",
          "type": "rru",
          "category": "Rectifier",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 0.8394722597445441,
            "y": 0,
            "z": -1.4119842935578095
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "MTS9304A-HX10AX 12U Outdoor Rectifier Kabini (Alan 2)",
          "blockType": "rectifier-mts9304a",
          "catalogId": "rectifier-mts9304a",
          "type": "rru",
          "category": "Rectifier",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 5.050704812315493,
            "y": 0,
            "z": -1.4139675859568794
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "Matsing 4-Beam Çapraz Kol & Dikey Çift Ofset Montajı",
          "blockType": "matsing-offset-assembly",
          "catalogId": "matsing-4-beam",
          "type": "antenna",
          "category": "Matsing",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -3,
            "y": 6.976,
            "z": 41.568
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "Matsing 4-Beam Çatı Taşıyıcısı Asılı Ofset Montajı (Ara Bölge - 1)",
          "blockType": "matsing-mid-offset-assembly",
          "catalogId": "matsing-4-beam",
          "type": "antenna",
          "category": "Matsing",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -3,
            "y": 9.385,
            "z": 37.934
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "Matsing 4-Beam Çatı Taşıyıcısı Asılı Ofset Montajı (Ara Bölge - 2)",
          "blockType": "matsing-mid-offset-assembly",
          "catalogId": "matsing-4-beam",
          "type": "antenna",
          "category": "Matsing",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -3,
            "y": 9.022,
            "z": 35.234
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        }
      ],
      "alan3": [
        {
          "name": "Spot Beam 30/30 Panel Anten Çatı Taşıyıcısı Asılı Montajı (Alan 3 - Anten 1)",
          "blockType": "spot-beam-truss-offset-assembly",
          "catalogId": "doy15x3030md4tre",
          "type": "antenna",
          "category": "Panel Anten",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -3,
            "y": 8.533,
            "z": 31.603
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "Spot Beam 30/30 Panel Anten Çatı Taşıyıcısı Asılı Montajı (Alan 3 - Anten 2)",
          "blockType": "spot-beam-truss-offset-assembly",
          "catalogId": "doy15x3030md4tre",
          "type": "antenna",
          "category": "Panel Anten",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -3,
            "y": 8.667,
            "z": 32.594
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "2'li POI Küçük Rack Bloğu (2x POI Dolu) (Alan 3)",
          "blockType": "ikili-42u-poi-blok",
          "catalogId": null,
          "type": "rru",
          "category": "Canovate",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -0.9744455482182993,
            "y": 0,
            "z": -1.2734661913443657
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": true,
          "lockedZ": true,
          "allowPassThrough": true
        },
        {
          "name": "Özel Alan 2 RRU Grubu (Beton Zemin Flanşlı, 7 RRU) (Alan 3)",
          "blockType": "alan2-ozel-karma-blok",
          "catalogId": null,
          "type": "rru",
          "category": "Karma",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -2.0250031223058187,
            "y": 0,
            "z": -1.1827264864581115
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": true,
          "lockedZ": true,
          "allowPassThrough": true
        }
      ],
      "alan4": [
        {
          "name": "Matsing 4-Beam Silindir Doğrudan 45° Montajı (Sol - 20m Ofset)",
          "blockType": "scoreboard-matsing-cylinder-assembly",
          "catalogId": "matsing-4-beam",
          "type": "antenna",
          "category": "Matsing",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -20,
            "y": 19.05,
            "z": 0.55
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": true,
          "lockedZ": true,
          "allowPassThrough": true
        },
        {
          "name": "Matsing 4-Beam Silindir Doğrudan 45° Montajı (Sağ - 20m Ofset)",
          "blockType": "scoreboard-matsing-cylinder-assembly",
          "catalogId": "matsing-4-beam",
          "type": "antenna",
          "category": "Matsing",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 20,
            "y": 19.05,
            "z": 0.55
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": true,
          "lockedZ": true,
          "allowPassThrough": true
        },
        {
          "name": "4 POI Rack Blok (4x POI Dolu) (Alan 4)",
          "blockType": "4poi-rack-blok",
          "catalogId": null,
          "type": "rru",
          "category": "Canovate",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -3.247543458474242,
            "y": 20,
            "z": -0.919987257110642
          },
          "rotation": {
            "x": 0,
            "y": 1.5707963267948966,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "4 POI Rack Blok (4x POI Dolu) (Alan 4)",
          "blockType": "4poi-rack-blok",
          "catalogId": null,
          "type": "rru",
          "category": "Canovate",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 3.15004498709286,
            "y": 20,
            "z": -0.9023812996691016
          },
          "rotation": {
            "x": 0,
            "y": 4.71238898038469,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "Tablalı 4 Boru 7 RRU Bloğu - Sol POI Yanı",
          "blockType": "alan2-alternatif2-rru-blok",
          "catalogId": null,
          "type": "rru",
          "category": "RRU",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -1.731732010972016,
            "y": 20,
            "z": -0.8994569831600372
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "Tablalı 4 Boru 7 RRU Bloğu - Sağ POI Yanı",
          "blockType": "alan2-alternatif2-rru-blok",
          "catalogId": null,
          "type": "rru",
          "category": "RRU",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 1.6787984389135993,
            "y": 20,
            "z": -0.8336789287648787
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "MTS9304A-HX10AX 12U Outdoor Rectifier Kabini (Alan 4 - Sol)",
          "blockType": "rectifier-mts9304a",
          "catalogId": "rectifier-mts9304a",
          "type": "rru",
          "category": "Rectifier",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -14.119464998174733,
            "y": 18.121,
            "z": 59.923778081882354
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": true,
          "allowPassThrough": true
        },
        {
          "name": "20U Outdoor DC Güç Kaynağı (Eltek Flatpack2 24kW) (Alan 4 - Sol #1)",
          "blockType": "rectifier-20u-eltek",
          "catalogId": "rectifier-20u-eltek",
          "type": "rru",
          "category": "Rectifier",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -13.27332624896956,
            "y": 18.121,
            "z": 59.92760781677324
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": true,
          "allowPassThrough": true
        },
        {
          "name": "20U Outdoor DC Güç Kaynağı (Eltek Flatpack2 24kW) (Alan 4 - Sol #2)",
          "blockType": "rectifier-20u-eltek",
          "catalogId": "rectifier-20u-eltek",
          "type": "rru",
          "category": "Rectifier",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -12.435316293723163,
            "y": 18.121,
            "z": 59.946156104057025
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": true,
          "allowPassThrough": true
        },
        {
          "name": "30U POI Rack (4 POI) - Doğrudan Beton Zemin (Alan 4 - Sol #1)",
          "blockType": "alan2-kediyolu-42u-kompleks",
          "catalogId": null,
          "type": "rru",
          "category": "Canovate",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -15.9,
            "y": 18.121,
            "z": 59.87
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": true,
          "allowPassThrough": true
        },
        {
          "name": "30U POI Rack (4 POI) - Doğrudan Beton Zemin (Alan 4 - Sol #2)",
          "blockType": "alan2-kediyolu-42u-kompleks",
          "catalogId": null,
          "type": "rru",
          "category": "Canovate",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -16.70460129207983,
            "y": 18.121,
            "z": 59.87
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": true,
          "allowPassThrough": true
        },
        {
          "name": "30U POI Rack (4 POI) - Doğrudan Beton Zemin (Alan 4 - Sol #3)",
          "blockType": "alan2-kediyolu-42u-kompleks",
          "catalogId": null,
          "type": "rru",
          "category": "Canovate",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -17.449288669525544,
            "y": 18.121,
            "z": 59.87
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": true,
          "allowPassThrough": true
        },
        {
          "name": "Alan 2 Özel Karşılıklı 11 Boru 21 RRU Blok (Alan 4 - Sol)",
          "blockType": "alan2-karsilikli-11boru-rru-blok",
          "catalogId": null,
          "type": "rru",
          "category": "Karma",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -18.960056807452453,
            "y": 18.121,
            "z": 59.67
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": true,
          "allowPassThrough": true
        },
        {
          "name": "Alan 2 Özel Karşılıklı 11 Boru 21 RRU Blok (Alan 4 - Sağ)",
          "blockType": "alan2-karsilikli-11boru-rru-blok",
          "catalogId": null,
          "type": "rru",
          "category": "Karma",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 19.276626771284825,
            "y": 18.121,
            "z": 59.793573400040856
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "30U POI Rack (4 POI) - Doğrudan Beton Zemin (Alan 4 - Sağ #3)",
          "blockType": "alan2-kediyolu-42u-kompleks",
          "catalogId": null,
          "type": "rru",
          "category": "Canovate",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 15.961103617634103,
            "y": 18.121,
            "z": 59.87
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": true,
          "allowPassThrough": true
        },
        {
          "name": "30U POI Rack (4 POI) - Doğrudan Beton Zemin (Alan 4 - Sağ #2)",
          "blockType": "alan2-kediyolu-42u-kompleks",
          "catalogId": null,
          "type": "rru",
          "category": "Canovate",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 16.86904811054761,
            "y": 18.121,
            "z": 59.87
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": true,
          "allowPassThrough": true
        },
        {
          "name": "30U POI Rack (4 POI) - Doğrudan Beton Zemin (Alan 4 - Sağ #1)",
          "blockType": "alan2-kediyolu-42u-kompleks",
          "catalogId": null,
          "type": "rru",
          "category": "Canovate",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 17.732562796276078,
            "y": 18.121,
            "z": 59.87
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": true,
          "allowPassThrough": true
        },
        {
          "name": "MTS9304A-HX10AX 12U Outdoor Rectifier Kabini (Alan 4 - Sağ)",
          "blockType": "rectifier-mts9304a",
          "catalogId": "rectifier-mts9304a",
          "type": "rru",
          "category": "Rectifier",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 13.290148614486716,
            "y": 18.121,
            "z": 59.9
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": true,
          "allowPassThrough": true
        },
        {
          "name": "20U Outdoor DC Güç Kaynağı (Eltek Flatpack2 24kW) (Alan 4 - Sağ #1)",
          "blockType": "rectifier-20u-eltek",
          "catalogId": "rectifier-20u-eltek",
          "type": "rru",
          "category": "Rectifier",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 12.376634166483527,
            "y": 18.121,
            "z": 59.9
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": true,
          "allowPassThrough": true
        },
        {
          "name": "20U Outdoor DC Güç Kaynağı (Eltek Flatpack2 24kW) (Alan 4 - Sağ #2)",
          "blockType": "rectifier-20u-eltek",
          "catalogId": "rectifier-20u-eltek",
          "type": "rru",
          "category": "Rectifier",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 14.165435274376803,
            "y": 18.121,
            "z": 59.9
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": true,
          "allowPassThrough": true
        },
        {
          "name": "MTS9304A-HX10AX 12U Outdoor Rectifier Kabini (Alan 4 - Orta)",
          "blockType": "rectifier-mts9304a",
          "catalogId": "rectifier-mts9304a",
          "type": "rru",
          "category": "Rectifier",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 9.89387316938797,
            "y": 18.121,
            "z": 59.9
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": true,
          "allowPassThrough": true
        },
        {
          "name": "20U Outdoor DC Güç Kaynağı (Eltek Flatpack2 24kW) (Alan 4 - Orta #1)",
          "blockType": "rectifier-20u-eltek",
          "catalogId": "rectifier-20u-eltek",
          "type": "rru",
          "category": "Rectifier",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 10.69936876136525,
            "y": 18.121,
            "z": 59.9
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": true,
          "allowPassThrough": true
        },
        {
          "name": "20U Outdoor DC Güç Kaynağı (Eltek Flatpack2 24kW) (Alan 4 - Orta #2)",
          "blockType": "rectifier-20u-eltek",
          "catalogId": "rectifier-20u-eltek",
          "type": "rru",
          "category": "Rectifier",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 11.552471490273222,
            "y": 18.121,
            "z": 59.9
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": true,
          "allowPassThrough": true
        },
        {
          "name": "Matsing 4-Beam Çatı Taşıyıcısı Asılı Ofset Montajı (Alan 4 - Sol 37m)",
          "blockType": "matsing-mid-offset-assembly",
          "catalogId": "matsing-4-beam",
          "type": "antenna",
          "category": "Matsing",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -18,
            "y": 25.35,
            "z": 22.81
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "Matsing 4-Beam Çatı Taşıyıcısı Asılı Ofset Montajı (Alan 4 - Sol 40m)",
          "blockType": "matsing-mid-offset-assembly",
          "catalogId": "matsing-4-beam",
          "type": "antenna",
          "category": "Matsing",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -18,
            "y": 25.61,
            "z": 19.82
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "Matsing 4-Beam Çatı Taşıyıcısı Asılı Ofset Montajı (Alan 4 - Sağ 37m)",
          "blockType": "matsing-mid-offset-assembly",
          "catalogId": "matsing-4-beam",
          "type": "antenna",
          "category": "Matsing",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 18,
            "y": 25.35,
            "z": 22.81
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "Matsing 4-Beam Çatı Taşıyıcısı Asılı Ofset Montajı (Alan 4 - Sağ 40m)",
          "blockType": "matsing-mid-offset-assembly",
          "catalogId": "matsing-4-beam",
          "type": "antenna",
          "category": "Matsing",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 18,
            "y": 25.61,
            "z": 19.82
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": false,
          "allowPassThrough": true
        },
        {
          "name": "20U Outdoor DC Güç Kaynağı (Eltek Flatpack2 24kW) (Alan 4)",
          "blockType": "rectifier-20u-eltek",
          "catalogId": "rectifier-20u-eltek",
          "type": "rru",
          "category": "Rectifier",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -11.601613000165928,
            "y": 18.121,
            "z": 59.9
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": true,
          "allowPassThrough": true
        },
        {
          "name": "MTS9304A-HX10AX 12U Outdoor Rectifier Kabini (Alan 4)",
          "blockType": "rectifier-mts9304a",
          "catalogId": "rectifier-mts9304a",
          "type": "rru",
          "category": "Rectifier",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -9.853927977354337,
            "y": 18.121,
            "z": 59.9
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": true,
          "allowPassThrough": true
        },
        {
          "name": "MTS9304A-HX10AX 12U Outdoor Rectifier Kabini (Alan 4)",
          "blockType": "rectifier-mts9304a",
          "catalogId": "rectifier-mts9304a",
          "type": "rru",
          "category": "Rectifier",
          "isFreestanding": true,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -10.752347263272256,
            "y": 18.121,
            "z": 59.9
          },
          "rotation": {
            "x": 0,
            "y": 3.141592653589793,
            "z": 0
          },
          "locked": false,
          "lockedX": false,
          "lockedY": false,
          "lockedZ": true,
          "allowPassThrough": true
        }
      ]
    }
  }
};
PRESET_DRAFTS['taslak-v1'] = PRESET_DRAFTS['taslak-v2'];



function loadProjectFromData(importData) {
  selectObject(null);

  // 1. Clear scene and internal arrays for all areas
  [...state.alan1Platforms, ...state.alan2Platforms, ...state.alan3Platforms, ...state.alan4Platforms].forEach(p => scene.remove(p));
  state.alan1Platforms = [];
  state.alan2Platforms = [];
  state.alan3Platforms = [];
  state.alan4Platforms = [];

  // 2. Check if new format containing all areas
  if (importData.areas) {
    ['alan1', 'alan2', 'alan3', 'alan4'].forEach(areaKey => {
      const items = importData.areas[areaKey] || [];
      items.forEach(item => deserializeItemToArea(item, areaKey));
    });

    const activeArea = importData.currentArea === 'alan4' ? 'alan4' : (importData.currentArea === 'alan3' ? 'alan3' : (importData.currentArea === 'alan2' ? 'alan2' : 'alan1'));
    const selectAreaElem = document.getElementById('select-area');
    if (selectAreaElem) {
      selectAreaElem.value = activeArea;
      selectAreaElem.dispatchEvent(new Event('change'));
    }
  } else {
    // 3. Fallback for legacy single-area project JSONs
    let targetArea = state.currentArea;
    let itemsToImport = [];

    if (importData.area) {
      targetArea = importData.area === 'alan4' ? 'alan4' : (importData.area === 'alan3' ? 'alan3' : (importData.area === 'alan2' ? 'alan2' : 'alan1'));
      itemsToImport = importData.items || [];
    } else if (Array.isArray(importData)) {
      itemsToImport = importData;
    }

    itemsToImport.forEach(item => deserializeItemToArea(item, targetArea));

    const selectAreaElem = document.getElementById('select-area');
    if (selectAreaElem && targetArea !== state.currentArea) {
      selectAreaElem.value = targetArea;
      selectAreaElem.dispatchEvent(new Event('change'));
    }
  }

  selectObject(null);
  updateBOM();
}

// Bind Preset Draft Dropdown Event Listener
const presetSelectElem = document.getElementById('select-preset-draft');
if (presetSelectElem) {
  presetSelectElem.addEventListener('change', (e) => {
    const selectedPreset = e.target.value;
    if (selectedPreset && PRESET_DRAFTS[selectedPreset]) {
      loadProjectFromData(PRESET_DRAFTS[selectedPreset]);
      const draftName = e.target.options[e.target.selectedIndex].text;
      alert(`${draftName} hazır şablon tasarımı tüm alanlara başarıyla yüklendi!`);
    }
  });
}

// Projeyi JSON Olarak Yükle (Import All Areas Together)
const importBtn = document.getElementById('btn-import-json');
const fileInput = document.getElementById('input-import-file');

if (importBtn && fileInput) {
  importBtn.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target.result);
        loadProjectFromData(importData);
        alert('Tüm alanları içeren proje tasarımı başarıyla yüklendi!');
      } catch (err) {
        alert('Hata: Dosya formatı geçerli bir yerleşim planı JSON\'ı değil.');
        console.error(err);
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset
  });
}

// Projeyi Sıfırla (Reset Project for currently active area only)
const resetBtn = document.getElementById('btn-reset-project');
if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    const areaLabel = state.currentArea === 'alan2' ? 'ALAN 1 ve ALAN 3 (Maraton Tribünü ve Kedi Yolu)' :
                      state.currentArea === 'alan3' ? 'ALAN 4 (Çapraz Köşe Tribün)' :
                      'ALAN 2 (Scoreboard Kesiti + Kediyolu)';
      const confirmed = confirm(`${areaLabel} üzerindeki tüm yerleşimi sıfırlamak istediğinizden emin misiniz?\n\nBu işlem sadece aktif olan ${areaLabel} alanındaki nesneleri temizleyecek, diğer alanları etkilemeyecektir.`);
      if (confirmed) {
        if (state.currentArea === 'alan4') {
          state.alan4Platforms.forEach(p => scene.remove(p));
          state.alan4Platforms = [];
        } else if (state.currentArea === 'alan2') {
            state.alan2Platforms.forEach(p => scene.remove(p));
            state.alan2Platforms = [];
          } else if (state.currentArea === 'alan3') {
            state.alan3Platforms.forEach(p => scene.remove(p));
            state.alan3Platforms = [];
          } else {
          state.alan1Platforms.forEach(p => scene.remove(p));
          state.alan1Platforms = [];
        }
        selectObject(null);
        updateBOM();
      }
  });
}

function addInitialPlatforms() {
  // Site ilk açılışında varsayılan olarak Taslak Versiyon 2'yi yükle
  if (typeof PRESET_DRAFTS !== 'undefined' && PRESET_DRAFTS['taslak-v2']) {
    loadProjectFromData(PRESET_DRAFTS['taslak-v2']);
    const presetSelect = document.getElementById('select-preset-draft');
    if (presetSelect) {
      presetSelect.value = 'taslak-v2';
    }
  } else {
    state.alan1Platforms = [];
      state.alan2Platforms = [];
      state.alan3Platforms = [];
      state.alan4Platforms = [];

    const alan4Block = buildAlan4OzelKarmaBlok('alan4');
    alan4Block.userData.id = state.nextId++;
    alan4Block.position.set(8.3919, 0, 0);
    alan4Block.visible = (state.currentArea === 'alan4');
    scene.add(alan4Block);
    state.alan4Platforms.push(alan4Block);

    selectObject(null);
    updateBOM();
  }
}

addInitialPlatforms();
updateAreaButtonVisibility();

const catwalkGroup = scene.getObjectByName('catwalk');
const alan2Group = scene.getObjectByName('alan2Structure');
const alan4Group = scene.getObjectByName('alan4Structure');
const alan3Group = scene.getObjectByName('alan3Structure');
if (state.currentArea === 'alan4') {
  if (catwalkGroup) catwalkGroup.visible = false;
  if (alan2Group) alan2Group.visible = false;
  if (alan3Group) alan3Group.visible = false;
  if (alan4Group) alan4Group.visible = true;
  setCameraView(-0.20, 29.03, -17.54, -0.32, 25.93, -8.03);
} else if (state.currentArea === 'alan2') {
  if (catwalkGroup) catwalkGroup.visible = false;
  if (alan2Group) alan2Group.visible = true;
  if (alan3Group) alan3Group.visible = false;
  if (alan4Group) alan4Group.visible = false;
  setCameraView(15.00, 10.00, 40.00, 15.00, 0.00, 0.00);
} else if (state.currentArea === 'alan3') {
  if (catwalkGroup) catwalkGroup.visible = false;
  if (alan2Group) alan2Group.visible = false;
  if (alan3Group) alan3Group.visible = true;
  if (alan4Group) alan4Group.visible = false;
  setCameraView(-5.85, 8.33, 33.95, 2.24, 5.87, 28.61);
} else {
  if (catwalkGroup) catwalkGroup.visible = true;
  if (alan2Group) alan2Group.visible = false;
  if (alan3Group) alan3Group.visible = false;
  if (alan4Group) alan4Group.visible = false;
  setCameraView(5, 5, 8, 0, 0, 0);
}

renderAreaFocusButtons(state.currentArea);
setCameraView(-0.20, 29.03, -17.54, -0.32, 25.93, -8.03);

// =============================================================
// SERBEST UÇUŞ (FREE FLIGHT) VE WASD GEZİNME SİSTEMİ
// Kullanıcı İsteği: "WASD ile serbestuçuş modu gibi olsun, 0 noktasından bakmasın"
// =============================================================
const flyKeys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  up: false,
  down: false,
  boost: false,
  slow: false
};

window.addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
    return;
  }

  const code = e.code;
  if (code === 'KeyW') { flyKeys.forward = true; }
  else if (code === 'KeyS') { flyKeys.backward = true; }
  else if (code === 'KeyA') { flyKeys.left = true; }
  else if (code === 'KeyD') { flyKeys.right = true; }
  else if (code === 'KeyE' || code === 'Space') { flyKeys.up = true; e.preventDefault(); }
  else if (code === 'KeyQ' || code === 'KeyC') { flyKeys.down = true; }
  else if (code === 'ShiftLeft' || code === 'ShiftRight') { flyKeys.boost = true; }
  else if (code === 'ControlLeft' || code === 'ControlRight' || code === 'AltLeft') { flyKeys.slow = true; }
});

window.addEventListener('keyup', (e) => {
  const code = e.code;
  if (code === 'KeyW') { flyKeys.forward = false; }
  else if (code === 'KeyS') { flyKeys.backward = false; }
  else if (code === 'KeyA') { flyKeys.left = false; }
  else if (code === 'KeyD') { flyKeys.right = false; }
  else if (code === 'KeyE' || code === 'Space') { flyKeys.up = false; }
  else if (code === 'KeyQ' || code === 'KeyC') { flyKeys.down = false; }
  else if (code === 'ShiftLeft' || code === 'ShiftRight') { flyKeys.boost = false; }
  else if (code === 'ControlLeft' || code === 'ControlRight' || code === 'AltLeft') { flyKeys.slow = false; }
});

// Çift tıklanan nesneye veya noktaya anında odaklan (Focus on Double Click)
const dblRaycaster = new THREE.Raycaster();
const dblMouse = new THREE.Vector2();

renderer.domElement.addEventListener('dblclick', (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  dblMouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  dblMouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  dblRaycaster.setFromCamera(dblMouse, camera);
  const intersects = dblRaycaster.intersectObjects(scene.children, true);
  const hit = intersects.find(i => i.object !== gridHelper && i.object !== axesHelper);
  if (hit) {
    camera.lookAt(hit.point);
    syncCameraEuler();
    updateCameraDirectionTarget();
  }
});

// Animation Loop
const flyClock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.1, flyClock.getDelta());

  // WASD Serbest Uçuş Hareketi
  if (flyKeys.forward || flyKeys.backward || flyKeys.left || flyKeys.right || flyKeys.up || flyKeys.down) {
    let speed = 12.0; // 12 m/s
    if (flyKeys.boost) speed = 30.0; // Shift ile hızlı uçuş (30 m/s)
    if (flyKeys.slow) speed = 3.5;  // Ctrl/Alt ile hassas inceleme hızı

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0;
    if (right.lengthSq() > 0.0001) right.normalize();
    const up = new THREE.Vector3(0, 1, 0);

    const moveVector = new THREE.Vector3();
    if (flyKeys.forward) moveVector.add(forward);
    if (flyKeys.backward) moveVector.sub(forward);
    if (flyKeys.right) moveVector.add(right);
    if (flyKeys.left) moveVector.sub(right);
    if (flyKeys.up) moveVector.add(up);
    if (flyKeys.down) moveVector.sub(up);

    if (moveVector.lengthSq() > 0) {
      moveVector.normalize();
      moveVector.multiplyScalar(speed * dt);
      camera.position.add(moveVector);
      updateCameraDirectionTarget();
    }
  }

  // Smooth sliding animation for Alan 2 and Alan 4 doors
  const allDoors = [...alan2SlidingDoors, ...alan3SlidingDoors, ...alan4SlidingDoors];
  if (allDoors && allDoors.length > 0) {
    for (let i = 0; i < allDoors.length; i++) {
      const door = allDoors[i];
      if (Math.abs(door.position.x - door.userData.targetX) > 0.001) {
        door.position.x += (door.userData.targetX - door.position.x) * 0.14;
      } else {
        door.position.x = door.userData.targetX;
      }
    }
  }

  if (controls.autoRotate) {
    controls.update();
    syncCameraEuler();
  }

  if (isCamCoordsModalOpen) {
    updateCamCoordsDisplay();
  }

  renderer.render(scene, camera);
}
animate();

// Global Keyboard Arrow Keys Navigation for Selected Equipment (X and Z axes)
window.addEventListener('keydown', (event) => {
  // Ignore keydown if active focus is inside an input, textarea or select element
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
    return;
  }

  const selected = state.selectedObject;
  if (!selected) return;

  const activePlatforms = getActivePlatforms();
  if (!activePlatforms.includes(selected)) {
    selectObject(null);
    return;
  }

  const step = event.shiftKey ? 0.10 : 0.01; // Shift + Arrow = 10cm, Arrow = 1cm
  let moved = false;
  let targetX = selected.position.x;
  let targetY = selected.position.y;
  let targetZ = selected.position.z;

  if (event.key === 'ArrowLeft') {
    if (!selected.userData.lockedX) {
      targetX -= step; // Sol ok: Sola kaydır (-X)
      moved = true;
    }
  } else if (event.key === 'ArrowRight') {
    if (!selected.userData.lockedX) {
      targetX += step; // Sağ ok: Sağa kaydır (+X)
      moved = true;
    }
  } else if (event.key === 'ArrowUp') {
    if (!selected.userData.lockedZ) {
      targetZ -= step; // Yukarı ok: İleri/Derinliğe kaydır (-Z)
      moved = true;
    }
  } else if (event.key === 'ArrowDown') {
    if (!selected.userData.lockedZ) {
      targetZ += step; // Aşağı ok: Geri/Görüş alanına kaydır (+Z)
      moved = true;
    }
  }

  if (moved) {
    event.preventDefault();

    if (!hasCollision(selected, targetX, targetY, targetZ)) {
      selected.position.set(targetX, targetY, targetZ);
      renderProperties(selected);
      updateBOM();
    }
  }
});
