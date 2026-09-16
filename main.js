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
  currentArea: 'alan1'
};

// Dimensions conversion (1 unit in 3D = 1 meter)
const cmToM = (cm) => cm / 100;
const mToCm = (m) => Math.round(m * 100);

// Setup Three.js Scene
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf1f5f9); // Clean light grey background

// Add Grid & Helpers (High contrast)
const gridHelper = new THREE.GridHelper(50, 50, 0x94a3b8, 0xcb2e3e);
gridHelper.position.y = -1.5;
scene.add(gridHelper);

// Add 3D Axes Helper (X = Red, Y = Green, Z = Blue)
const axesHelper = new THREE.AxesHelper(3);
axesHelper.position.set(0, 0, 0);
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
controls.maxPolarAngle = Math.PI / 2 - 0.05;
controls.enableKeys = false; // Disable OrbitControls keyboard arrow keys so arrow keys move selected RRUs!

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

// Generate Catwalk (Kedi Yolu) Representation
// Generate Catwalk (Kedi Yolu) Representation
function createCatwalk() {
  const catwalkGroup = new THREE.Group();
  catwalkGroup.name = 'catwalk';

  // Catwalk floor (grating style) - 100cm width (1.0m)
  const floorGeo = new THREE.BoxGeometry(20, 0.05, 1.0);
  const floorMat = new THREE.MeshStandardMaterial({ 
    color: 0x2d323f, 
    roughness: 0.8,
    metalness: 0.6
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.receiveShadow = true;
  catwalkGroup.add(floor);

  // Side beams (profiles) - aligned at Z = +/- 0.5m
  const beamGeo = new THREE.BoxGeometry(20, 0.15, 0.08);
  const beamMat = new THREE.MeshStandardMaterial({ color: 0x1f2228, metalness: 0.8, roughness: 0.2 });
  
  const leftBeam = new THREE.Mesh(beamGeo, beamMat);
  leftBeam.position.set(0, 0.05, 0.5);
  leftBeam.castShadow = true;
  leftBeam.receiveShadow = true;
  catwalkGroup.add(leftBeam);

  const rightBeam = leftBeam.clone();
  rightBeam.position.set(0, 0.05, -0.5);
  catwalkGroup.add(rightBeam);

  // Handrails
  const railMat = new THREE.MeshStandardMaterial({ color: 0xfdb913, metalness: 0.5, roughness: 0.3 }); // Yellow rails
  const postGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.1);
  const topRailGeo = new THREE.CylinderGeometry(0.025, 0.025, 20);

  // Top Rail Left
  const topRailLeft = new THREE.Mesh(topRailGeo, railMat);
  topRailLeft.rotation.z = Math.PI / 2;
  topRailLeft.position.set(0, 1.1, 0.5);
  topRailLeft.castShadow = true;
  catwalkGroup.add(topRailLeft);

  // Top Rail Right
  const topRailRight = topRailLeft.clone();
  topRailRight.position.set(0, 1.1, -0.5);
  catwalkGroup.add(topRailRight);

  // Handrail Posts
  for (let i = -9.5; i <= 9.5; i += 1.5) {
    const postLeft = new THREE.Mesh(postGeo, railMat);
    postLeft.position.set(i, 0.55, 0.5);
    postLeft.castShadow = true;
    catwalkGroup.add(postLeft);

    const postRight = postLeft.clone();
    postRight.position.set(i, 0.55, -0.5);
    catwalkGroup.add(postRight);
  }

  // --- Large Horizontal Steel Cylinder Support Pipe (Silindir Taşıyıcı) ---
  // Cylinder outer radius: 0.2285m (45.7cm diameter)
  // Distance from catwalk edge (Z = -0.5m) to pipe surface is 45.7cm (0.457m).
  // Cylinder surface is at Z = -0.957m. Cylinder center Z is at -0.957 - 0.2285 = -1.1855m.
  // Cylinder center Y is at -0.225 (H-beam bottom) - 0.2285 (pipe radius) = -0.4535m.
  const cylinderGeo = new THREE.CylinderGeometry(0.2285, 0.2285, 20, 32);
  const cylinderMat = new THREE.MeshStandardMaterial({ 
    color: 0x7f8c8d, 
    roughness: 0.6,
    metalness: 0.7 
  });
  const mainCylinder = new THREE.Mesh(cylinderGeo, cylinderMat);
  mainCylinder.rotation.z = Math.PI / 2; // Lie horizontally along X-axis
  mainCylinder.position.set(0, -0.4535, -1.1855);
  mainCylinder.castShadow = true;
  mainCylinder.receiveShadow = true;
  catwalkGroup.add(mainCylinder);

  // Connecting brackets between catwalk and cylinder support
  // Spans from Cylinder center (Z = -1.1855) to Catwalk edge (Z = -0.5)
  // Bracket Y center: -0.125, height: 20cm (0.20m), depth: 0.6855m
  const bracketGeo = new THREE.BoxGeometry(0.2, 0.20, 0.6855);
  const bracketMat = new THREE.MeshStandardMaterial({ color: 0x34495e, metalness: 0.8 });
  for (let i = -8; i <= 8; i += 4) {
    const bracket = new THREE.Mesh(bracketGeo, bracketMat);
    bracket.position.set(i, -0.125, -0.84275);
    bracket.castShadow = true;
    catwalkGroup.add(bracket);
  }

  scene.add(catwalkGroup);
}



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
function createAlan4Structure() {
  const alan4Group = new THREE.Group();
  alan4Group.name = 'alan4Structure';
  alan4Group.visible = false; // Hidden by default, shown when Alan 4 is selected

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
  const pipeLength = 25.0; // Silindirler kedi yolunun her iki yanına doğru uzatıldı (25 metre)
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
  for (let x = -11.0; x <= 11.0; x += 2.2) {
    const tie = new THREE.Mesh(pipeTieGeo, darkSteelMat);
    tie.position.set(x, -0.95, -0.56);
    alan4Group.add(tie);
  }

  // =========================================================================
  // 2. KEDİ YOLU (TEK KATLI, GENİŞLİK 2.6M, KÖŞELERDEN 4M İÇERİ ÇEKİLMİŞ: UZUNLUK 7.4M)
  // =========================================================================
  const catwalkLength = 7.4; // 15.4m'den köşelerden ~4m içeri çekilmiş (X: -3.7m ile +3.7m arası)
  const catwalkWidth = 2.6;
  const floorGeo = new THREE.BoxGeometry(catwalkLength, 0.05, catwalkWidth);
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.position.set(0, 0, 0);
  floor.receiveShadow = true;
  alan4Group.add(floor);

  // Boyuna kenar kirişleri (Arka Z = +1.30m, Ön Z = -1.30m)
  const longBeamGeo = new THREE.BoxGeometry(catwalkLength, 0.18, 0.08);
  const rearBeam = new THREE.Mesh(longBeamGeo, beamMat);
  rearBeam.position.set(0, 0.065, 1.30);
  rearBeam.castShadow = true;
  rearBeam.receiveShadow = true;
  alan4Group.add(rearBeam);

  const frontBeam = rearBeam.clone();
  frontBeam.position.z = -1.30;
  alan4Group.add(frontBeam);

  // Enine ağır taşıyıcı konsol kirişler (Transverses)
  // Kedi yolunun altından geçip her iki silindire basar ve öne doğru uzanır (Z: +1.35m'den -2.65m'ye)
  const transBeamGeo = new THREE.BoxGeometry(0.20, 0.18, 4.0);
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
  // =========================================================================
  const postGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.1);
  const topRailRearGeo = new THREE.CylinderGeometry(0.025, 0.025, catwalkLength);
  const midRailRearGeo = new THREE.CylinderGeometry(0.018, 0.018, catwalkLength);

  // 3.1. Arka Kenar Korkuluğu (Z = +1.30m, 7.4m boydan boya)
  const topRailRear = new THREE.Mesh(topRailRearGeo, railMat);
  topRailRear.rotation.z = Math.PI / 2;
  topRailRear.position.set(0, 1.10, 1.30);
  alan4Group.add(topRailRear);

  const midRailRear = new THREE.Mesh(midRailRearGeo, railMat);
  midRailRear.rotation.z = Math.PI / 2;
  midRailRear.position.set(0, 0.55, 1.30);
  alan4Group.add(midRailRear);

  const kickPlateRear = new THREE.Mesh(new THREE.BoxGeometry(catwalkLength, 0.12, 0.02), beamMat);
  kickPlateRear.position.set(0, 0.06, 1.29);
  alan4Group.add(kickPlateRear);

  for (let x = -3.6; x <= 3.61; x += 1.2) {
    const post = new THREE.Mesh(postGeo, railMat);
    post.position.set(x, 0.55, 1.30);
    alan4Group.add(post);
  }

  // 3.2. Yan Kenar Korkulukları (Sol uç X = -3.7m kapalı, Sağ uç X = +3.7m kapalı)
  const sideRailTopGeo = new THREE.CylinderGeometry(0.025, 0.025, catwalkWidth);
  const sideRailMidGeo = new THREE.CylinderGeometry(0.018, 0.018, catwalkWidth);
  const sideKickGeo = new THREE.BoxGeometry(0.02, 0.12, catwalkWidth);

  // Sol Uç (X = -3.7m): Tam boy korkuluk
  const sTopLeft = new THREE.Mesh(sideRailTopGeo, railMat);
  sTopLeft.rotation.x = Math.PI / 2;
  sTopLeft.position.set(-3.7, 1.10, 0);
  alan4Group.add(sTopLeft);

  const sMidLeft = new THREE.Mesh(sideRailMidGeo, railMat);
  sMidLeft.rotation.x = Math.PI / 2;
  sMidLeft.position.set(-3.7, 0.55, 0);
  alan4Group.add(sMidLeft);

  const sKickLeft = new THREE.Mesh(sideKickGeo, beamMat);
  sKickLeft.position.set(-3.7, 0.06, 0);
  alan4Group.add(sKickLeft);

  [-1.1, 0, 1.1].forEach(zPos => {
    const p = new THREE.Mesh(postGeo, railMat);
    p.position.set(-3.7, 0.55, zPos);
    alan4Group.add(p);
  });

  // Sağ Uç (X = +3.7m): Tam boy korkuluk
  const sTopRight = new THREE.Mesh(sideRailTopGeo, railMat);
  sTopRight.rotation.x = Math.PI / 2;
  sTopRight.position.set(3.7, 1.10, 0);
  alan4Group.add(sTopRight);

  const sMidRight = new THREE.Mesh(sideRailMidGeo, railMat);
  sMidRight.rotation.x = Math.PI / 2;
  sMidRight.position.set(3.7, 0.55, 0);
  alan4Group.add(sMidRight);

  const sKickRight = new THREE.Mesh(sideKickGeo, beamMat);
  sKickRight.position.set(3.7, 0.06, 0);
  alan4Group.add(sKickRight);

  [-1.1, 0, 1.1].forEach(zPos => {
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

  // Skorbord Taşıyıcı Ağır Çelik Kolonlar ve Bağlantı Konsolları
  const sbColGeo = new THREE.BoxGeometry(0.20, sbHeight + 0.2, 0.20);
  const sbStrutGeo = new THREE.BoxGeometry(0.14, 0.18, 1.4);

  for (let x = -5.2; x <= 5.2; x += 2.6) {
    // Düşey HEB ana taşıyıcı kolon
    const col = new THREE.Mesh(sbColGeo, darkSteelMat);
    col.position.set(x, sbYCenter, sbZCenter + sbDepth / 2 + 0.10);
    alan4Group.add(col);

    // Kedi yolu ve Silindir 1'e bağlanan alt konsol kol (Y = 0 kotunda)
    const lowerArm = new THREE.Mesh(sbStrutGeo, darkSteelMat);
    lowerArm.position.set(x, 0.0, -2.05);
    alan4Group.add(lowerArm);

    // Alt diyagonal rijitlik payandası (Silindir 1'e)
    const diagStrut = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 1.2), darkSteelMat);
    diagStrut.rotation.x = -Math.PI / 5;
    diagStrut.position.set(x, -0.45, -2.15);
    alan4Group.add(diagStrut);
  }

  // Skorbord arkası modüler servis kapak çizgileri
  const hatchLineMat = new THREE.LineBasicMaterial({ color: 0x334155 });
  for (let x = -5.5; x <= 5.5; x += 1.1) {
    const points = [
      new THREE.Vector3(x, sbYCenter - sbHeight / 2 + 0.1, sbZCenter + sbDepth / 2 + 0.001),
      new THREE.Vector3(x, sbYCenter + sbHeight / 2 - 0.1, sbZCenter + sbDepth / 2 + 0.001)
    ];
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const hatchLine = new THREE.Line(lineGeo, hatchLineMat);
    alan4Group.add(hatchLine);
  }

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
  setupPlatformTransform(blockGroup, 8.50, 0, false);
  blockGroup.position.set(8.50, 0, 0);
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



createCatwalk();
createAlan4Structure();

createGroundCoordinateGuide();

// Ground Coordinate System Guide (X & Z Axis Compass Schema on Floor)
function createGroundCoordinateGuide() {
  const guideGroup = new THREE.Group();
  guideGroup.name = 'groundCoordinateGuide';
  
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
    group.position.set(0, 0.8, -1.5);
    addPlatformToActiveArea(group);
  }
}

// Helper to return platforms list for the active area
function getActivePlatforms() {
  if (state.currentArea === 'alan4') return state.alan4Platforms;
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
  const yPos = isStandaloneKiris ? 0.2465 : 0;
  if (state.currentArea === 'alan4') {
    group.rotation.y = 0;
    const isKarmaBlok = (group.userData && group.userData.blockType === 'alan2-karma-rru-blok');
    const posX = isKarmaBlok ? 8.50 : defaultX;
    group.position.set(posX, yPos, 0);
  } else {
    group.rotation.y = 0;
    group.position.set(defaultX, yPos, -1.1855);
  }
}

function addPlatformToActiveArea(group) {
  scene.add(group);
  if (state.currentArea === 'alan4') {
    state.alan4Platforms.push(group);
  } else {
    state.alan1Platforms.push(group);
  }
  selectObject(group);
  updateBOM();
}

function spawnKiris1() {
  const isAlan2 = (state.currentArea === 'alan2');
  const group = buildKiris1();
  group.userData.id = state.nextId++;
  group.userData.name = isAlan2 ? 'Kiriş-1 (Alan 2)' : 'Kiriş-1';
  setupPlatformTransform(group, 0, -2.0, true);
  addPlatformToActiveArea(group);
}

function spawnKiris2() {
  const isAlan2 = (state.currentArea === 'alan2');
  const group = buildKiris2();
  group.userData.id = state.nextId++;
  group.userData.name = isAlan2 ? 'Kiriş-2 (Alan 2)' : 'Kiriş-2';
  setupPlatformTransform(group, 0, -2.0, true);
  addPlatformToActiveArea(group);
}

function spawnTabla1() {
  const isAlan2 = (state.currentArea === 'alan2');
  const group = buildTabla1();
  group.userData.id = state.nextId++;
  group.userData.name = isAlan2 ? 'Tabla-1 (Alan 2)' : 'Tabla-1';
  group.position.y = -0.0090;
  setupPlatformTransform(group, 0, -2.0, false);
  addPlatformToActiveArea(group);
}

function spawnTabla2() {
  const isAlan2 = (state.currentArea === 'alan2');
  const group = buildTabla2();
  group.userData.id = state.nextId++;
  group.userData.name = isAlan2 ? 'Tabla-2 (Alan 2)' : 'Tabla-2';
  group.position.y = -0.0090;
  setupPlatformTransform(group, 0, -2.0, false);
  addPlatformToActiveArea(group);
}

function spawnTabla3() {
  const isAlan2 = (state.currentArea === 'alan2');
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
    const k2_1 = buildKiris2(true); k2_1.userData.interactive = false; k2_1.position.set(-0.10, 0.2465, 0); blockGroup.add(k2_1);
    const k1_2 = buildKiris1(true); k1_2.userData.interactive = false; k1_2.position.set(-0.90, 0.2465, 0); blockGroup.add(k1_2);
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
  const blockGroup = buildRRUBlokKorkulukluModel(isRotatedArea);
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
function build42UIkiliCerceveKabin(colorHex = 0xd4d8dd, is20U = false) {
  const group = new THREE.Group();
  
  const uCount = is20U ? 20 : 42;
  const baseH = 0.1125;
  const W = 0.60;
  const D = 0.70;
  const H = is20U ? 1.05 : 2.0933;
  
  group.userData = {
    type: 'rru',
    blockType: is20U ? '20u-canovate-kabin' : '42u-canovate-kabin',
    category: 'Canovate',
    name: is20U ? '20U İkili Çerçeve Açık Sistem Kabin' : '42U İkili Çerçeve Açık Sistem Kabin',
    modelNo: is20U ? 'CSL-X-20YYA2' : 'CSL-X-42YYA2',
    uHeight: uCount,
    width: W,
    height: H,
    depth: D,
    innerMountWidth: 0.4826,
    weight: 58,
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
  const areaSuffix = state.currentArea === 'alan3' ? ' (Alan 3)' : (state.currentArea === 'alan2' ? ' (Alan 2)' : '');
  const group = build42UIkiliCerceveKabin();
  group.userData.id = state.nextId++;
  group.userData.name = `42U İkili Çerçeve Kabin (Canovate)${areaSuffix}`;
  group.userData.lockedX = false;
  group.userData.lockedY = false;
  group.userData.lockedZ = false;
  group.userData.isFreestanding = true;
  
  setupPlatformTransform(group, 0, -2.0, false);
  group.position.y = 0.0;
  addPlatformToActiveArea(group);
}

function build42UPoiRackBlok(targetArea = state.currentArea) {
  const areaSuffix = targetArea === 'alan3' ? ' (Alan 3)' : (targetArea === 'alan2' ? ' (Alan 2)' : '');
  
  const rackGroup = build42UIkiliCerceveKabin();
  rackGroup.userData.blockType = '42u-poi-rack-blok';
  rackGroup.userData.name = `42U POI Rack Blok (6x POI Dolu)${areaSuffix}`;
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

  for (let i = 0; i < 6; i++) {
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
  setupPlatformTransform(rackGroup, 0, -2.0, false);
  rackGroup.position.y = 0.0;
  addPlatformToActiveArea(rackGroup);
}

function build20UPoiRackBlok(targetArea = state.currentArea) {
  const areaSuffix = targetArea === 'alan3' ? ' (Alan 3)' : (targetArea === 'alan2' ? ' (Alan 2)' : '');
  
  const rackGroup = build42UIkiliCerceveKabin(0xd4d8dd, true); // true for is20U
  rackGroup.userData.blockType = '20u-poi-rack-blok';
  rackGroup.userData.name = `20U POI Rack Blok (3x POI Dolu)${areaSuffix}`;
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

  for (let i = 0; i < 3; i++) { // Only 3 POIs
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
  setupPlatformTransform(rackGroup, 0, -2.0, false);
  rackGroup.position.y = 0.0;
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
  sub1.position.set(0.16582881193335844, 0, 0);
  sub1.rotation.set(0, 4.71238898038469, 0);
  blockGroup.add(sub1);

  const sub2 = build20UPoiRackBlok(targetArea);
  sub2.position.set(-1.562669426291808, 0, 0.2056258998127368);
  sub2.rotation.set(0, 1.5707963267948966, 0);
  blockGroup.add(sub2);

  const sub3 = build20UPoiRackBlok(targetArea);
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

function spawnAlan4OzelKarmaBlok() {
  const blockGroup = buildAlan4OzelKarmaBlok(state.currentArea);
  blockGroup.userData.id = state.nextId++;
  setupPlatformTransform(blockGroup, 8.3919, 0, false);
  blockGroup.position.set(8.3919, 0, 0);
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

function spawnAlan4CiftRRUKompleksBlok() {
  const blockGroup = buildAlan4CiftRRUKompleksBlok(state.currentArea);
  blockGroup.userData.id = state.nextId++;
  setupPlatformTransform(blockGroup, 8.3919, 0, false);
  blockGroup.position.set(8.3919, 0, 0);
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
  setupPlatformTransform(blockGroup, 0.0, 0.0, false);
  blockGroup.position.set(0.0, 0, 0);
  addPlatformToActiveArea(blockGroup);
}

function spawnAlan4Kediyolu42UKompleksBlok() {
  const blockGroup = buildAlan4Kediyolu42UKompleksBlok(state.currentArea);
  blockGroup.userData.id = state.nextId++;
  setupPlatformTransform(blockGroup, 0.0, 0.0, false);
  blockGroup.position.set(0.0, 0, 0);
  addPlatformToActiveArea(blockGroup);
}

// Custom Drag and Drop Engine
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let dragPlane = new THREE.Plane();
let dragObject = null;
let isDragging = false;
const dragOffset = new THREE.Vector3();
const dragIntersection = new THREE.Vector3();

// Attach Drag & Drop Listeners to renderer DOM
renderer.domElement.addEventListener('pointerdown', (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const activePlatforms = getActivePlatforms();
  const intersects = raycaster.intersectObjects(activePlatforms, true);

  let selected = null;
  for (let hit of intersects) {
    let current = hit.object;
    // Walk up to find the direct child of the scene
    while (current.parent && current.parent !== scene) {
      current = current.parent;
    }
    if (current && current.userData && current.userData.interactive && activePlatforms.includes(current)) {
      selected = current;
      break;
    }
  }

  if (selected) {
    selectObject(selected);
    
    // Only drag if X and Z axes are not both locked
    if (!(selected.userData.lockedX && selected.userData.lockedZ)) {
      dragObject = selected;
      
      // Create drag plane horizontal at the Y height of the selected object
      dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), dragObject.position);
      
      // Get initial drag offset
      raycaster.ray.intersectPlane(dragPlane, dragIntersection);
      dragOffset.copy(dragObject.position).sub(dragIntersection);
      
      isDragging = true;
      controls.enabled = false; // Disable camera orbiting during drag
    }
    event.stopPropagation(); // Stop OrbitControls from capturing this down event
  } else {
    selectObject(null);
  }
});

renderer.domElement.addEventListener('pointermove', (event) => {
  if (isDragging && dragObject) {
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
          // Locked to X-axis dual carrier cylinders at Z = 0
          if (dragObject.userData.lockedZ) targetZ = 0;
          if (!dragObject.userData.lockedX) targetX = Math.max(-12.0, Math.min(12.0, dragIntersection.x + dragOffset.x));
        } else {
          // Alan 1: Locked to X-axis carrier pipe at Z = -1.1855
          if (!dragObject.userData.lockedZ) targetZ = -1.1855;
          if (!dragObject.userData.lockedX) targetX = Math.max(-9.0, Math.min(9.0, dragIntersection.x + dragOffset.x));
        }
      }

      // Restrict movement if it causes collision with other equipment bodies
      if (!hasCollision(dragObject, targetX, targetY, targetZ)) {
        dragObject.position.x = targetX;
        dragObject.position.z = targetZ;
        
        // Update property values in the sidebar inputs if open
        const inputX = document.getElementById('prop-pos-x');
        const inputZ = document.getElementById('prop-pos-z');
        if (inputX) inputX.value = dragObject.position.x.toFixed(3);
        if (inputZ) inputZ.value = dragObject.position.z.toFixed(3);

        updateBOM();
      }
    }
  }
});

window.addEventListener('pointerup', () => {
  if (isDragging) {
    isDragging = false;
    dragObject = null;
    controls.enabled = true; // Re-enable camera controls
  }
});

// Spawn Buttons Listeners
document.getElementById('btn-add-kiris1').addEventListener('click', spawnKiris1);
document.getElementById('btn-add-kiris2').addEventListener('click', spawnKiris2);
document.getElementById('btn-add-tabla1').addEventListener('click', spawnTabla1);
document.getElementById('btn-add-tabla2').addEventListener('click', spawnTabla2);
document.getElementById('btn-add-tabla3').addEventListener('click', spawnTabla3);

document.getElementById('btn-add-rru-blok').addEventListener('click', spawnRRUBlok);
document.getElementById('btn-add-rack-blok').addEventListener('click', spawnRackBlok);

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

const btnAlan4Plat = document.getElementById('btn-add-alan4-cember-platform-blok');
if (btnAlan4Plat) btnAlan4Plat.addEventListener('click', spawnAlan4CemberPlatformBlok);

const btnAlan4OzelKarma = document.getElementById('btn-add-alan4-ozel-karma-blok');
if (btnAlan4OzelKarma) btnAlan4OzelKarma.addEventListener('click', spawnAlan4OzelKarmaBlok);

const btnAlan4CiftRRU = document.getElementById('btn-add-alan4-cift-rru-kompleks');
if (btnAlan4CiftRRU) btnAlan4CiftRRU.addEventListener('click', spawnAlan4CiftRRUKompleksBlok);

const btnAlan4KediyoluTabla = document.getElementById('btn-add-alan4-kediyolu-tabla-blok');
if (btnAlan4KediyoluTabla) btnAlan4KediyoluTabla.addEventListener('click', spawnAlan4KediyoluTablaBlok);

const btnAlan4Kediyolu42U = document.getElementById('btn-add-alan4-kediyolu-42u-kompleks');
if (btnAlan4Kediyolu42U) btnAlan4Kediyolu42U.addEventListener('click', spawnAlan4Kediyolu42UKompleksBlok);

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
  const isAlan4 = (state.currentArea === 'alan4');
  const btnRru = document.getElementById('btn-add-rru-blok');
  const btnRack = document.getElementById('btn-add-rack-blok');
  const btnPoiBlok = document.getElementById('btn-add-42u-poi-blok');
  const btnTT5527 = document.getElementById('btn-add-tt-5li-5527-blok');
  const btnTT5818w = document.getElementById('btn-add-tt-5li-5818w-blok');
  const btnVoda3li = document.getElementById('btn-add-voda-3li-rru-blok');
  const btnVoda5li = document.getElementById('btn-add-voda-5li-rru-blok');
  const btnTCellOffset = document.getElementById('btn-add-tcell-offset-blok');
  const btnRruK = document.getElementById('btn-add-rru-blok-korkuluklu');
  const btnRackK = document.getElementById('btn-add-rack-blok-korkuluklu');
  const btnSaha120 = document.getElementById('btn-add-rru-saha-blok-120');
  const btnAlan1OzelKarma = document.getElementById('btn-add-alan1-ozel-karma-blok');

  if (btnSaha120) {
    const nameSpan = btnSaha120.querySelector('.name');
    if (nameSpan) nameSpan.textContent = 'RRU Saha Blok 120cm (Alan 1)';
    btnSaha120.style.display = isAlan4 ? 'none' : 'flex';
  }

  if (btnRru) btnRru.style.display = 'flex';
  if (btnRack) btnRack.style.display = 'flex';
  if (btnPoiBlok) btnPoiBlok.style.display = 'flex';
  if (btnTT5527) btnTT5527.style.display = 'flex';
  if (btnTT5818w) btnTT5818w.style.display = 'flex';
  if (btnVoda3li) btnVoda3li.style.display = 'flex';
  if (btnVoda5li) btnVoda5li.style.display = 'flex';
  if (btnTCellOffset) btnTCellOffset.style.display = 'flex';
  if (btnRruK) btnRruK.style.display = 'flex';
  if (btnRackK) btnRackK.style.display = 'flex';
  if (btnAlan1OzelKarma) btnAlan1OzelKarma.style.display = isAlan4 ? 'none' : 'flex';

  const btnAlan4Plat = document.getElementById('btn-add-alan4-cember-platform-blok');
  if (btnAlan4Plat) btnAlan4Plat.style.display = 'none';
  const btnAlan4OzelKarma = document.getElementById('btn-add-alan4-ozel-karma-blok');
  if (btnAlan4OzelKarma) btnAlan4OzelKarma.style.display = isAlan4 ? 'flex' : 'none';
  const btnAlan4CiftRRU = document.getElementById('btn-add-alan4-cift-rru-kompleks');
  if (btnAlan4CiftRRU) btnAlan4CiftRRU.style.display = isAlan4 ? 'flex' : 'none';
  const btnAlan4KediyoluTabla = document.getElementById('btn-add-alan4-kediyolu-tabla-blok');
  if (btnAlan4KediyoluTabla) btnAlan4KediyoluTabla.style.display = 'none';
  const btnAlan4Kediyolu42U = document.getElementById('btn-add-alan4-kediyolu-42u-kompleks');
  if (btnAlan4Kediyolu42U) btnAlan4Kediyolu42U.style.display = isAlan4 ? 'flex' : 'none';
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

    const catwalkGroup = scene.getObjectByName('catwalk');
    const alan4Group = scene.getObjectByName('alan4Structure');

    if (selectedArea === 'alan4') {
      if (catwalkGroup) catwalkGroup.visible = false;
      if (alan4Group) alan4Group.visible = true;
      camera.position.set(16, 7, 16);
      controls.target.set(0, 2.5, -0.7);
      controls.update();
    } else {
      if (catwalkGroup) catwalkGroup.visible = true;
      if (alan4Group) alan4Group.visible = false;
      camera.position.set(5, 5, 8);
      controls.target.set(0, 0, 0);
      controls.update();
    }

    setPlatformGroupVisibility(state.alan1Platforms, selectedArea === 'alan1');
    setPlatformGroupVisibility(state.alan4Platforms, selectedArea === 'alan4');

    selectObject(null);
    updateBOM();
  });
}

// Excel Equipment Catalog Data
const EQUIPMENT_CATALOG = [
  // Turkcell
  { id: 'turkcell-4485', category: 'Turkcell', name: 'LTE RRU4485 - 4G', width: 0.398, height: 0.533, depth: 0.145, weight: 25, color: '#0284c7' },
  { id: 'turkcell-8863', category: 'Turkcell', name: 'NR RR8863 – 5G', width: 0.375, height: 0.478, depth: 0.155, weight: 25, color: '#0284c7' },
  { id: 'turkcell-2219', category: 'Turkcell', name: 'GSM 2219 B8', width: 0.343, height: 0.466, depth: 0.154, weight: 20, color: '#0284c7' },

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
  { id: 'rectifier-mts9304a', category: 'Rectifier', name: 'MTS9304A-HX10AX 12U Outdoor Rectifier Kabini', width: 0.650, height: 1.250, depth: 0.650, weight: 80, color: '#e2e8f0' }
];

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

  // 4 ANT ports (1 row x 4 columns on front-top area)
  const antStartX = -W * 0.25;
  const antStepX = (W * 0.5) / 3;
  const antZ = D/2 - 0.06;
  
  for (let col = 0; col < 4; col++) {
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

function buildCustomEquipmentModel(item) {
  const name = item.name || '';
  const id = item.id || item.catalogId || '';
  const cat = item.category || '';

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
  const areaSuffix = state.currentArea === 'alan3' ? ' (Alan 3)' : (state.currentArea === 'alan2' ? ' (Alan 2)' : '');
  const group = buildCustomEquipmentModel(item);
  group.userData.name = `${item.name}${areaSuffix}`;

  const isPoi = item.category && item.category.startsWith('POI');
  const isCanovate = item.category === 'Canovate';
  const isRectifier = item.category === 'Rectifier';

  if (isPoi || isCanovate || isRectifier) {
    group.userData.lockedX = false;
    group.userData.lockedY = false;
    group.userData.lockedZ = false;
    group.userData.isFreestanding = true;
  }

  setupPlatformTransform(group, 0, -2.0, false);
  group.position.y = (isCanovate || isRectifier) ? 0.0 : (isPoi ? 0.30 : 0.75);
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
  const isNonPoiRRU = (obj.userData.type === 'rru' && (!obj.userData.category || !obj.userData.category.startsWith('POI')));

  if (isNonPoiRRU) {
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
    camera.position.set(0, 15, 0);
    controls.target.set(0, 0, 0);
    controls.update();
  });
}

if (btnViewPersp) {
  btnViewPersp.addEventListener('click', () => {
    if (btnViewOrtho) btnViewOrtho.classList.remove('active');
    btnViewPersp.classList.add('active');
    if (presBtn3d) presBtn3d.classList.add('active');
    if (presBtn2d) presBtn2d.classList.remove('active');
    camera.position.set(5, 5, 8);
    controls.target.set(0, 0, 0);
    controls.update();
  });
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
    const currentArea = state.currentArea || 'alan4';
    if (currentArea === 'alan4') {
      camera.position.set(16, 7, 16);
      controls.target.set(0, 2.5, -0.7);
    } else {
      camera.position.set(5, 5, 8);
      controls.target.set(0, 0, 0);
    }
    controls.update();
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
  if (itemName.includes('42U POI Rack') || blockType === '42u-poi-rack-blok') {
    group = build42UPoiRackBlok(targetArea);
  } else if (itemName.includes('20U POI Rack') || blockType === '20u-poi-rack-blok') {
    group = build20UPoiRackBlok(targetArea);
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
  } else if (blockType === 'alan1-ozel-karma-blok' || itemName.includes('Özel Karma Blok')) {
    group = buildAlan1OzelKarmaBlok(targetArea);
  } else if (blockType === 'alan4-cember-platform-blok' || itemName.includes('Çemberli H-Beam')) {
    group = buildAlan4CemberPlatformBlok();
  } else if (blockType === 'alan4-ozel-karma-blok' || itemName.includes('Özel Alan 4 Kompleksi')) {
    group = buildAlan4OzelKarmaBlok(targetArea);
  } else if (blockType === 'alan4-cift-rru-kompleks' || itemName.includes('Çift RRU Kompleksi')) {
    group = buildAlan4CiftRRUKompleksBlok(targetArea);
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
      group.position.set(item.position.x, item.position.y, item.position.z);
    }
    if (item.rotation) {
      group.rotation.set(item.rotation.x, item.rotation.y, item.rotation.z);
    }

    group.visible = (targetArea === state.currentArea);
    scene.add(group);

    if (targetArea === 'alan4') state.alan4Platforms.push(group);
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
  'taslak-v3': {
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
      "alan2": [],
      "alan3": [],
      "alan4": [
        {
          "name": "Kedi Yolu Tabla + 42U POI Kompleks (Alan 4)",
          "blockType": "alan4-kediyolu-42u-kompleks",
          "catalogId": null,
          "type": "platform",
          "category": "Karma",
          "isFreestanding": false,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 6.87137451195054,
            "y": 0,
            "z": 0
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
          "name": "Özel Alan 4 Çift RRU Kompleksi (Platform + Çift RRU)",
          "blockType": "alan4-cift-rru-kompleks",
          "catalogId": null,
          "type": "platform",
          "category": "Karma",
          "isFreestanding": false,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -8.4671429562844,
            "y": 0,
            "z": 0
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
          "name": "Özel Alan 4 Çift RRU Kompleksi (Platform + Çift RRU)",
          "blockType": "alan4-cift-rru-kompleks",
          "catalogId": null,
          "type": "platform",
          "category": "Karma",
          "isFreestanding": false,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 8.3919,
            "y": 0,
            "z": 0
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
          "name": "Kedi Yolu Tabla + 42U POI Kompleks (Alan 4)",
          "blockType": "alan4-kediyolu-42u-kompleks",
          "catalogId": null,
          "type": "platform",
          "category": "Karma",
          "isFreestanding": false,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -6.895658789047658,
            "y": 0,
            "z": 0
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
      ]
    }
  },
  'taslak-v2': {
    "version": "2.0",
    "savedAt": "2026-09-11T07:38:27.144Z",
    "currentArea": "alan1",
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
      "alan2": [],
      "alan3": [],
      "alan4": [
        {
          "name": "Özel Alan 4 Kompleksi (Platform + POI + RRU)",
          "blockType": "alan4-ozel-karma-blok",
          "catalogId": null,
          "type": "platform",
          "category": "Karma",
          "isFreestanding": false,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": -8.242980212994473,
            "y": 0,
            "z": 0
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
          "name": "Özel Alan 4 Kompleksi (Platform + POI + RRU)",
          "blockType": "alan4-ozel-karma-blok",
          "catalogId": null,
          "type": "platform",
          "category": "Karma",
          "isFreestanding": false,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 8.307771779124387,
            "y": 0,
            "z": 0
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
      ]
    }
  },
  'taslak-v1': {
    "version": "2.0",
    "savedAt": "2026-08-14T12:27:41.644Z",
    "currentArea": "alan1",
    "areas": {
      "alan1": [
        { "name": "RRU Blok (Korkuluklu)", "blockType": "rru-blok-korkuluklu", "catalogId": null, "type": "platform", "category": null, "isFreestanding": false, "isOffsetArmModule": false, "isOffsetCarrier": false, "isInclinedPipe": false, "position": { "x": -2.295145407456438, "y": 0, "z": -1.1855 }, "rotation": { "x": 0, "y": 0, "z": 0 }, "locked": true, "lockedX": true, "lockedY": true, "lockedZ": true, "allowPassThrough": true },
        { "name": "RRU Blok (Korkuluklu)", "blockType": "rru-blok-korkuluklu", "catalogId": null, "type": "platform", "category": null, "isFreestanding": false, "isOffsetArmModule": false, "isOffsetCarrier": false, "isInclinedPipe": false, "position": { "x": 2.670922501399333, "y": 0, "z": -1.1855 }, "rotation": { "x": 0, "y": 0, "z": 0 }, "locked": true, "lockedX": true, "lockedY": true, "lockedZ": true, "allowPassThrough": true },
        { "name": "Rack Blok (Korkuluklu)", "blockType": "rack-blok-korkuluklu", "catalogId": null, "type": "platform", "category": null, "isFreestanding": false, "isOffsetArmModule": false, "isOffsetCarrier": false, "isInclinedPipe": false, "position": { "x": -4.900061062901976, "y": 0, "z": -1.1855 }, "rotation": { "x": 0, "y": 0, "z": 0 }, "locked": false, "lockedX": false, "lockedY": false, "lockedZ": false, "allowPassThrough": true },
        { "name": "Turkcell 10'lu (5 Dikey Boru 2 Kat) Blok", "blockType": "tcell-offset-blok", "catalogId": null, "type": "rru", "category": "Turkcell", "isFreestanding": false, "isOffsetArmModule": false, "isOffsetCarrier": false, "isInclinedPipe": false, "position": { "x": 2.046088244628467, "y": 0, "z": -1.1855 }, "rotation": { "x": 0, "y": 1.5707963267948966, "z": 0 }, "locked": true, "lockedX": true, "lockedY": true, "lockedZ": true, "allowPassThrough": true },
        { "name": "Türk Telekom 5'li RRU5527 Blok", "blockType": "tt-5li-5527-blok", "catalogId": null, "type": "rru", "category": "Türk Telekom", "isFreestanding": false, "isOffsetArmModule": false, "isOffsetCarrier": false, "isInclinedPipe": false, "position": { "x": 3.2869700859554434, "y": 0.75, "z": -1.1855 }, "rotation": { "x": 0, "y": 4.71238898038469, "z": 0 }, "locked": false, "lockedX": false, "lockedY": false, "lockedZ": true, "allowPassThrough": true },
        { "name": "Türk Telekom 5'li RRU5818W Blok", "blockType": "tt-5li-5818w-blok", "catalogId": null, "type": "rru", "category": "Türk Telekom", "isFreestanding": false, "isOffsetArmModule": false, "isOffsetCarrier": false, "isInclinedPipe": false, "position": { "x": 3.2944827039688143, "y": 1.5, "z": -1.1855 }, "rotation": { "x": 0, "y": 4.71238898038469, "z": 0 }, "locked": false, "lockedX": false, "lockedY": false, "lockedZ": true, "allowPassThrough": true },
        { "name": "Vodafone 3'lü RRU5526t Blok", "blockType": "voda-3li-rru-blok", "catalogId": null, "type": "rru", "category": "Vodafone", "isFreestanding": false, "isOffsetArmModule": false, "isOffsetCarrier": false, "isInclinedPipe": false, "position": { "x": -2.890639995254168, "y": 0.75, "z": -1.1855 }, "rotation": { "x": 0, "y": 1.5707963267948966, "z": 0 }, "locked": true, "lockedX": true, "lockedY": true, "lockedZ": true, "allowPassThrough": true },
        { "name": "Vodafone 5'li RRU5526t Blok", "blockType": "voda-5li-rru-blok", "catalogId": null, "type": "rru", "category": "Vodafone", "isFreestanding": false, "isOffsetArmModule": false, "isOffsetCarrier": false, "isInclinedPipe": false, "position": { "x": -1.6952168892768145, "y": 0.75, "z": -1.1855 }, "rotation": { "x": 0, "y": 4.71238898038469, "z": 0 }, "locked": true, "lockedX": true, "lockedY": true, "lockedZ": true, "allowPassThrough": true },
        { "name": "Vodafone 5'li RRU5526t Blok", "blockType": "voda-5li-rru-blok", "catalogId": null, "type": "rru", "category": "Vodafone", "isFreestanding": false, "isOffsetArmModule": false, "isOffsetCarrier": false, "isInclinedPipe": false, "position": { "x": -1.7102878002086999, "y": 1.5, "z": -1.1855 }, "rotation": { "x": 0, "y": 4.71238898038469, "z": 0 }, "locked": true, "lockedX": true, "lockedY": true, "lockedZ": true, "allowPassThrough": true },
        { "name": "Rack Blok (Korkuluklu)", "blockType": "rack-blok-korkuluklu", "catalogId": null, "type": "platform", "category": null, "isFreestanding": false, "isOffsetArmModule": false, "isOffsetCarrier": false, "isInclinedPipe": false, "position": { "x": 5.119058564096933, "y": 0, "z": -1.1855 }, "rotation": { "x": 0, "y": 0, "z": 0 }, "locked": false, "lockedX": false, "lockedY": false, "lockedZ": false, "allowPassThrough": true },
        { "name": "42U POI Rack Blok (6x POI Dolu)", "blockType": "42u-canovate-kabin", "catalogId": null, "type": "rru", "category": "Canovate", "isFreestanding": true, "isOffsetArmModule": false, "isOffsetCarrier": false, "isInclinedPipe": false, "position": { "x": 0.023352096690417296, "y": 0, "z": -1.688624436780009 }, "rotation": { "x": 0, "y": 0, "z": 0 }, "locked": false, "lockedX": false, "lockedY": false, "lockedZ": false, "allowPassThrough": true },
        { "name": "42U POI Rack Blok (6x POI Dolu)", "blockType": "42u-canovate-kabin", "catalogId": null, "type": "rru", "category": "Canovate", "isFreestanding": true, "isOffsetArmModule": false, "isOffsetCarrier": false, "isInclinedPipe": false, "position": { "x": -0.6561372739989106, "y": 0, "z": -0.9737981000025636 }, "rotation": { "x": 0, "y": 1.5707963267948966, "z": 0 }, "locked": false, "lockedX": false, "lockedY": false, "lockedZ": false, "allowPassThrough": true },
        { "name": "42U POI Rack Blok (6x POI Dolu)", "blockType": "42u-canovate-kabin", "catalogId": null, "type": "rru", "category": "Canovate", "isFreestanding": true, "isOffsetArmModule": false, "isOffsetCarrier": false, "isInclinedPipe": false, "position": { "x": 0.5642749069576185, "y": 0, "z": -0.9711852491449924 }, "rotation": { "x": 0, "y": 4.71238898038469, "z": 0 }, "locked": false, "lockedX": false, "lockedY": false, "lockedZ": false, "allowPassThrough": true },
        { "name": "Rack Blok (Korkuluklu)", "blockType": "rack-blok-korkuluklu", "catalogId": null, "type": "platform", "category": null, "isFreestanding": false, "isOffsetArmModule": false, "isOffsetCarrier": false, "isInclinedPipe": false, "position": { "x": 0, "y": 0, "z": -1.1855 }, "rotation": { "x": 0, "y": 0, "z": 0 }, "locked": false, "lockedX": false, "lockedY": false, "lockedZ": false, "allowPassThrough": true },
        { "name": "Turkcell Çift Bölmeli Outdoor Güç Kabini (1500x1070x750)", "blockType": "rectifier-turkcell-double", "catalogId": "rectifier-turkcell-double", "type": "rru", "category": "Rectifier", "isFreestanding": true, "isOffsetArmModule": false, "isOffsetCarrier": false, "isInclinedPipe": false, "position": { "x": 5.17012080690793, "y": 0, "z": -1.4040498760089049 }, "rotation": { "x": 0, "y": 0, "z": 0 }, "locked": false, "lockedX": false, "lockedY": false, "lockedZ": false, "allowPassThrough": true },
        { "name": "20U Outdoor DC Güç Kaynağı (Eltek Flatpack2 24kW)", "blockType": "rectifier-20u-eltek", "catalogId": "rectifier-20u-eltek", "type": "rru", "category": "Rectifier", "isFreestanding": true, "isOffsetArmModule": false, "isOffsetCarrier": false, "isInclinedPipe": false, "position": { "x": -5.426622921854924, "y": 0, "z": -1.5176537070995237 }, "rotation": { "x": 0, "y": 0, "z": 0 }, "locked": false, "lockedX": false, "lockedY": false, "lockedZ": false, "allowPassThrough": true },
        { "name": "MTS9304A-HX10AX 12U Outdoor Rectifier Kabini", "blockType": "rectifier-mts9304a", "catalogId": "rectifier-mts9304a", "type": "rru", "category": "Rectifier", "isFreestanding": true, "isOffsetArmModule": false, "isOffsetCarrier": false, "isInclinedPipe": false, "position": { "x": -4.452552658789933, "y": 0, "z": -1.5652529226819627 }, "rotation": { "x": 0, "y": 0, "z": 0 }, "locked": false, "lockedX": false, "lockedY": false, "lockedZ": false, "allowPassThrough": true }
      ],
      "alan2": [
        { "name": "Alan 2 Karma RRU Blok (4 Borulu - 7 RRU) (Alan 2)", "blockType": "alan2-karma-rru-blok", "catalogId": null, "type": "rru", "category": "Karma", "isFreestanding": false, "isOffsetArmModule": false, "isOffsetCarrier": false, "isInclinedPipe": false, "position": { "x": 0, "y": 0, "z": -2.9988460001254937 }, "rotation": { "x": 0, "y": 6.283185307179586, "z": 0 }, "locked": false, "lockedX": true, "lockedY": false, "lockedZ": false, "allowPassThrough": true },
        { "name": "RRU Saha Blok (Alan 2)", "blockType": "rru-saha-blok", "catalogId": null, "type": "platform", "category": null, "isFreestanding": false, "isOffsetArmModule": false, "isOffsetCarrier": false, "isInclinedPipe": false, "position": { "x": 0, "y": 0, "z": -3.3915045073350853 }, "rotation": { "x": 0, "y": 1.5707963267948966, "z": 0 }, "locked": false, "lockedX": false, "lockedY": false, "lockedZ": false, "allowPassThrough": true },
        { "name": "42U POI Rack Blok (6x POI Dolu) (Alan 2)", "blockType": "42u-poi-rack-blok", "catalogId": null, "type": "rru", "category": "Canovate", "isFreestanding": true, "isOffsetArmModule": false, "isOffsetCarrier": false, "isInclinedPipe": false, "position": { "x": 0.12635916826471072, "y": 0, "z": -1.1939725002212356 }, "rotation": { "x": 0, "y": 4.71238898038469, "z": 0 }, "locked": false, "lockedX": false, "lockedY": false, "lockedZ": false, "allowPassThrough": true }
      ],
      "alan3": [
        { "name": "30cm Ofset & 2.5\" Boru (Sağ - Çift Kol) (Alan 3)", "blockType": null, "catalogId": null, "type": "platform", "category": null, "isFreestanding": false, "isOffsetArmModule": true, "isOffsetCarrier": false, "isInclinedPipe": false, "position": { "x": 0, "y": -0.4535, "z": -4.5 }, "rotation": { "x": 0, "y": 0, "z": 0 }, "locked": false, "lockedX": false, "lockedY": true, "lockedZ": false, "allowPassThrough": true },
        { "name": "30cm Ofset & 2.5\" Boru (Sol - Çift Kol) (Alan 3)", "blockType": null, "catalogId": null, "type": "platform", "category": null, "isFreestanding": false, "isOffsetArmModule": true, "isOffsetCarrier": false, "isInclinedPipe": false, "position": { "x": 0, "y": -0.4535, "z": -4.5 }, "rotation": { "x": 0, "y": 0, "z": 0 }, "locked": false, "lockedX": false, "lockedY": true, "lockedZ": false, "allowPassThrough": true },
        { "name": "RRU Saha Blok (Alan 3)", "blockType": "rru-saha-blok", "catalogId": null, "type": "platform", "category": null, "isFreestanding": false, "isOffsetArmModule": false, "isOffsetCarrier": false, "isInclinedPipe": false, "position": { "x": 0, "y": 0, "z": -3.2512388136492154 }, "rotation": { "x": 0, "y": 1.5707963267948966, "z": 0 }, "locked": false, "lockedX": false, "lockedY": false, "lockedZ": false, "allowPassThrough": true },
        { "name": "42U POI Rack Blok (6x POI Dolu) (Alan 3)", "blockType": "42u-poi-rack-blok", "catalogId": null, "type": "rru", "category": "Canovate", "isFreestanding": true, "isOffsetArmModule": false, "isOffsetCarrier": false, "isInclinedPipe": false, "position": { "x": 0.1963078487261432, "y": 0, "z": -2.608624899453891 }, "rotation": { "x": 0, "y": 4.71238898038469, "z": 0 }, "locked": false, "lockedX": false, "lockedY": false, "lockedZ": false, "allowPassThrough": true },
        { "name": "42U POI Rack Blok (6x POI Dolu) (Alan 3)", "blockType": "42u-poi-rack-blok", "catalogId": null, "type": "rru", "category": "Canovate", "isFreestanding": true, "isOffsetArmModule": false, "isOffsetCarrier": false, "isInclinedPipe": false, "position": { "x": 0.2429354550466356, "y": 0, "z": -1.188157875725572 }, "rotation": { "x": 0, "y": 4.71238898038469, "z": 0 }, "locked": false, "lockedX": false, "lockedY": false, "lockedZ": false, "allowPassThrough": true },
        { "name": "42U POI Rack Blok (6x POI Dolu) (Alan 3)", "blockType": "42u-poi-rack-blok", "catalogId": null, "type": "rru", "category": "Canovate", "isFreestanding": true, "isOffsetArmModule": false, "isOffsetCarrier": false, "isInclinedPipe": false, "position": { "x": 0.22012813026807526, "y": 0, "z": -1.9309626762980763 }, "rotation": { "x": 0, "y": 4.71238898038469, "z": 0 }, "locked": false, "lockedX": false, "lockedY": false, "lockedZ": false, "allowPassThrough": true }
      ],
      "alan4": [
        {
          "name": "Özel Alan 4 Kompleksi (Platform + POI + RRU)",
          "blockType": "alan4-ozel-karma-blok",
          "catalogId": null,
          "type": "platform",
          "category": "Karma",
          "isFreestanding": false,
          "isOffsetArmModule": false,
          "isOffsetCarrier": false,
          "isInclinedPipe": false,
          "position": {
            "x": 8.391915754334763,
            "y": 0,
            "z": 0
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
      ]
    }
  }
};

function loadProjectFromData(importData) {
  selectObject(null);

  // 1. Clear scene and internal arrays for all areas
  [...state.alan1Platforms, ...state.alan4Platforms].forEach(p => scene.remove(p));
  state.alan1Platforms = [];
  state.alan2Platforms = [];
  state.alan3Platforms = [];
  state.alan4Platforms = [];

  // 2. Check if new format containing all areas
  if (importData.areas) {
    ['alan1', 'alan4'].forEach(areaKey => {
      const items = importData.areas[areaKey] || [];
      items.forEach(item => deserializeItemToArea(item, areaKey));
    });

    const activeArea = importData.currentArea === 'alan4' ? 'alan4' : 'alan1';
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
      targetArea = importData.area === 'alan4' ? 'alan4' : 'alan1';
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
    const areaLabel = state.currentArea === 'alan4' ? 'ALAN 4' : 'ALAN 1';
    const confirmed = confirm(`${areaLabel} üzerindeki tüm yerleşimi sıfırlamak istediğinizden emin misiniz?\n\nBu işlem sadece aktif olan ${areaLabel} alanındaki nesneleri temizleyecek, diğer alanları etkilemeyecektir.`);
    if (confirmed) {
      if (state.currentArea === 'alan4') {
        state.alan4Platforms.forEach(p => scene.remove(p));
        state.alan4Platforms = [];
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

if (state.currentArea === 'alan4') {
  const catwalkGroup = scene.getObjectByName('catwalk');
  const alan4Group = scene.getObjectByName('alan4Structure');
  if (catwalkGroup) catwalkGroup.visible = false;
  if (alan4Group) alan4Group.visible = true;
  camera.position.set(16, 7, 16);
  controls.target.set(0, 2.5, -0.7);
  controls.update();
} else {
  const catwalkGroup = scene.getObjectByName('catwalk');
  const alan4Group = scene.getObjectByName('alan4Structure');
  if (catwalkGroup) catwalkGroup.visible = true;
  if (alan4Group) alan4Group.visible = false;
  camera.position.set(5, 5, 8);
  controls.target.set(0, 0, 0);
  controls.update();
}

// Animation Loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
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
