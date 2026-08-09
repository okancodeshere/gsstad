import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Application State
const state = {
  alan1Platforms: [],
  alan2Platforms: [],
  alan3Platforms: [],
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

// Generate Alan 2 Representation (Vertical Cylinder Column Support + Catwalk + Fan Roof Truss)
function createAlan2Structure() {
  const alan2Group = new THREE.Group();
  alan2Group.name = 'alan2Structure';
  alan2Group.visible = false; // Hidden by default, shown when Alan 2 is selected

  // 1. Catwalk floor (grating style) - 100cm width (1.0m)
  const floorGeo = new THREE.BoxGeometry(20, 0.05, 1.0);
  const floorMat = new THREE.MeshStandardMaterial({ 
    color: 0x2d323f, 
    roughness: 0.8,
    metalness: 0.6
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.receiveShadow = true;
  alan2Group.add(floor);

  // Side beams (profiles) - aligned at Z = +/- 0.5m
  const beamGeo = new THREE.BoxGeometry(20, 0.15, 0.08);
  const beamMat = new THREE.MeshStandardMaterial({ color: 0x1f2228, metalness: 0.8, roughness: 0.2 });
  
  const leftBeam = new THREE.Mesh(beamGeo, beamMat);
  leftBeam.position.set(0, 0.05, 0.5);
  leftBeam.castShadow = true;
  leftBeam.receiveShadow = true;
  alan2Group.add(leftBeam);

  const rightBeam = leftBeam.clone();
  rightBeam.position.set(0, 0.05, -0.5);
  alan2Group.add(rightBeam);

  // Cable Tray (Kablo Tavası / Kanalları) along the catwalk edge
  const trayMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.3 });
  const cableTrayGeo = new THREE.BoxGeometry(20, 0.08, 0.20);
  const cableTray = new THREE.Mesh(cableTrayGeo, trayMat);
  cableTray.position.set(0, 0.12, 0.38);
  alan2Group.add(cableTray);

  // Handrails (Yellow)
  const railMat = new THREE.MeshStandardMaterial({ color: 0xfdb913, metalness: 0.5, roughness: 0.3 });
  const postGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.1);
  const topRailGeo = new THREE.CylinderGeometry(0.025, 0.025, 20);

  const topRailLeft = new THREE.Mesh(topRailGeo, railMat);
  topRailLeft.rotation.z = Math.PI / 2;
  topRailLeft.position.set(0, 1.1, 0.5);
  alan2Group.add(topRailLeft);

  const topRailRight = topRailLeft.clone();
  topRailRight.position.set(0, 1.1, -0.5);
  alan2Group.add(topRailRight);

  for (let i = -9.5; i <= 9.5; i += 1.5) {
    const postLeft = new THREE.Mesh(postGeo, railMat);
    postLeft.position.set(i, 0.55, 0.5);
    alan2Group.add(postLeft);

    const postRight = postLeft.clone();
    postRight.position.set(i, 0.55, -0.5);
    alan2Group.add(postRight);
  }

  // --- ALAN 2: SINGLE CARRIER PIPE AT 90 DEGREE HORIZONTAL ANGLE (Z-EKSENİNDE YATAY BORU) ---
  // Single Carrier Pipe (r = 0.2285m, length = 4.0m) lying horizontally along Z-axis (90 degrees to catwalk)
  const pipeGeo = new THREE.CylinderGeometry(0.2285, 0.2285, 4.0, 32);
  const pipeMat = new THREE.MeshStandardMaterial({ 
    color: 0x9b9487, // Khaki/beige painted steel from photos
    roughness: 0.5,
    metalness: 0.5 
  });
  
  // Placed horizontally along Z-axis at 90 degree angle to catwalk (X = 0, Y = -0.4535m)
  const singlePipe = new THREE.Mesh(pipeGeo, pipeMat);
  singlePipe.rotation.x = Math.PI / 2; // Horizontal along Z-axis
  singlePipe.position.set(0, -0.4535, -2.5); // Extends horizontally from Z = -0.5 to Z = -4.5
  singlePipe.castShadow = true;
  singlePipe.receiveShadow = true;
  alan2Group.add(singlePipe);

  // Heavy Metal Mounting Collar / Bracket attached to catwalk at X = 0
  const boxBracketGeo = new THREE.BoxGeometry(0.7, 0.4, 0.7);
  const boxBracketMat = new THREE.MeshStandardMaterial({ color: 0x34495e, metalness: 0.8, roughness: 0.3 });
  const boxBracket = new THREE.Mesh(boxBracketGeo, boxBracketMat);
  boxBracket.position.set(0, -0.4535, -0.85);
  boxBracket.castShadow = true;
  boxBracket.receiveShadow = true;
  alan2Group.add(boxBracket);

  // Connecting horizontal beams bridging catwalk to vertical pipe mounting box
  const bridgeBeamGeo = new THREE.BoxGeometry(0.12, 0.20, 0.4);
  const bridgeBeamMat = new THREE.MeshStandardMaterial({ color: 0x1f2228, metalness: 0.8 });
  
  const bridgeLeft = new THREE.Mesh(bridgeBeamGeo, bridgeBeamMat);
  bridgeLeft.position.set(-0.3, -0.4535, -0.65);
  alan2Group.add(bridgeLeft);

  const bridgeRight = new THREE.Mesh(bridgeBeamGeo, bridgeBeamMat);
  bridgeRight.position.set(0.3, -0.4535, -0.65);
  alan2Group.add(bridgeRight);
  // --- ALAN 2: DUAL INCLINED 20CM CARRIER PIPES (SABİT DİKEY TAŞIYICI PAFTALAR) ---
  const postRadius = 0.10;

  // 1. Sağ Dikme (+20° +X, +20° +Z)
  const verticalPostGeo1 = new THREE.CylinderGeometry(postRadius, postRadius, 4.0, 32);
  const verticalPost1 = new THREE.Mesh(verticalPostGeo1, pipeMat);
  verticalPost1.position.set(0, 2.0, 0);
  verticalPost1.castShadow = true;
  verticalPost1.receiveShadow = true;

  const postJointGroup1 = new THREE.Group();
  postJointGroup1.position.set(0, -0.4535, -4.5);
  postJointGroup1.rotation.x = Math.PI / 9;   // +20° +Z
  postJointGroup1.rotation.z = -Math.PI / 9;  // +20° +X
  postJointGroup1.add(verticalPost1);
  alan2Group.add(postJointGroup1);

  // 2. Sol Dikme (-20° -X Simetrik, +20° +Z)
  const verticalPostGeo2 = new THREE.CylinderGeometry(postRadius, postRadius, 4.0, 32);
  const verticalPost2 = new THREE.Mesh(verticalPostGeo2, pipeMat);
  verticalPost2.position.set(0, 2.0, 0);
  verticalPost2.castShadow = true;
  verticalPost2.receiveShadow = true;

  const postJointGroup2 = new THREE.Group();
  postJointGroup2.position.set(0, -0.4535, -4.5);
  postJointGroup2.rotation.x = Math.PI / 9;  // +20° +Z
  postJointGroup2.rotation.z = Math.PI / 9;   // 20° -X
  postJointGroup2.add(verticalPost2);
  alan2Group.add(postJointGroup2);

  // Joint collar connecting vertical post to horizontal carrier pipe at Z = -4.5m
  const jointCollarGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.5, 32);
  const jointCollarMat = new THREE.MeshStandardMaterial({ color: 0x34495e, metalness: 0.8 });
  const jointCollar = new THREE.Mesh(jointCollarGeo, jointCollarMat);
  jointCollar.position.set(0, -0.4535, -4.5);
  alan2Group.add(jointCollar);

  scene.add(alan2Group);
}

// Generate Alan 3 Representation (Clone of Alan 2 Structure)
function createAlan3Structure() {
  const alan3Group = new THREE.Group();
  alan3Group.name = 'alan3Structure';
  alan3Group.visible = false; // Hidden by default, shown when Alan 3 is selected

  // 1. Catwalk floor (grating style) - 100cm width (1.0m)
  const floorGeo = new THREE.BoxGeometry(20, 0.05, 1.0);
  const floorMat = new THREE.MeshStandardMaterial({ 
    color: 0x2d323f, 
    roughness: 0.8,
    metalness: 0.6
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.receiveShadow = true;
  alan3Group.add(floor);

  // Side beams (profiles) - aligned at Z = +/- 0.5m
  const beamGeo = new THREE.BoxGeometry(20, 0.15, 0.08);
  const beamMat = new THREE.MeshStandardMaterial({ color: 0x1f2228, metalness: 0.8, roughness: 0.2 });
  
  const leftBeam = new THREE.Mesh(beamGeo, beamMat);
  leftBeam.position.set(0, 0.05, 0.5);
  leftBeam.castShadow = true;
  leftBeam.receiveShadow = true;
  alan3Group.add(leftBeam);

  const rightBeam = leftBeam.clone();
  rightBeam.position.set(0, 0.05, -0.5);
  alan3Group.add(rightBeam);

  // Cable Tray (Kablo Tavası / Kanalları) along the catwalk edge
  const trayMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.3 });
  const cableTrayGeo = new THREE.BoxGeometry(20, 0.08, 0.20);
  const cableTray = new THREE.Mesh(cableTrayGeo, trayMat);
  cableTray.position.set(0, 0.12, 0.38);
  alan3Group.add(cableTray);

  // Handrails (Yellow)
  const railMat = new THREE.MeshStandardMaterial({ color: 0xfdb913, metalness: 0.5, roughness: 0.3 });
  const postGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.1);
  const topRailGeo = new THREE.CylinderGeometry(0.025, 0.025, 20);

  const topRailLeft = new THREE.Mesh(topRailGeo, railMat);
  topRailLeft.rotation.z = Math.PI / 2;
  topRailLeft.position.set(0, 1.1, 0.5);
  alan3Group.add(topRailLeft);

  const topRailRight = topRailLeft.clone();
  topRailRight.position.set(0, 1.1, -0.5);
  alan3Group.add(topRailRight);

  for (let i = -9.5; i <= 9.5; i += 1.5) {
    const postLeft = new THREE.Mesh(postGeo, railMat);
    postLeft.position.set(i, 0.55, 0.5);
    alan3Group.add(postLeft);

    const postRight = postLeft.clone();
    postRight.position.set(i, 0.55, -0.5);
    alan3Group.add(postRight);
  }

  // --- ALAN 3: SINGLE CARRIER PIPE AT 90 DEGREE HORIZONTAL ANGLE ---
  const pipeGeo = new THREE.CylinderGeometry(0.2285, 0.2285, 4.0, 32);
  const pipeMat = new THREE.MeshStandardMaterial({ 
    color: 0x9b9487,
    roughness: 0.5,
    metalness: 0.5 
  });
  
  const singlePipe = new THREE.Mesh(pipeGeo, pipeMat);
  singlePipe.rotation.x = Math.PI / 2;
  singlePipe.position.set(0, -0.4535, -2.5);
  singlePipe.castShadow = true;
  singlePipe.receiveShadow = true;
  alan3Group.add(singlePipe);

  // Heavy Metal Mounting Collar / Bracket attached to catwalk at X = 0
  const boxBracketGeo = new THREE.BoxGeometry(0.7, 0.4, 0.7);
  const boxBracketMat = new THREE.MeshStandardMaterial({ color: 0x34495e, metalness: 0.8, roughness: 0.3 });
  const boxBracket = new THREE.Mesh(boxBracketGeo, boxBracketMat);
  boxBracket.position.set(0, -0.4535, -0.85);
  boxBracket.castShadow = true;
  boxBracket.receiveShadow = true;
  alan3Group.add(boxBracket);

  // Connecting horizontal beams bridging catwalk to vertical pipe mounting box
  const bridgeBeamGeo = new THREE.BoxGeometry(0.12, 0.20, 0.4);
  const bridgeBeamMat = new THREE.MeshStandardMaterial({ color: 0x1f2228, metalness: 0.8 });
  
  const bridgeLeft = new THREE.Mesh(bridgeBeamGeo, bridgeBeamMat);
  bridgeLeft.position.set(-0.3, -0.4535, -0.65);
  alan3Group.add(bridgeLeft);

  const bridgeRight = new THREE.Mesh(bridgeBeamGeo, bridgeBeamMat);
  bridgeRight.position.set(0.3, -0.4535, -0.65);
  alan3Group.add(bridgeRight);

  // --- ALAN 3: DUAL INCLINED 20CM CARRIER PIPES (SABİT DİKEY TAŞIYICI PAFTALAR) ---
  const postRadius = 0.10;
  // 1. Sağ Dikme (+20° +X, +20° +Z)
  const vPost1 = new THREE.Mesh(new THREE.CylinderGeometry(postRadius, postRadius, 4.0, 32), pipeMat);
  vPost1.position.set(0, 2.0, 0);
  vPost1.castShadow = true;
  vPost1.receiveShadow = true;

  const joint1 = new THREE.Group();
  joint1.position.set(0, -0.4535, -4.5);
  joint1.rotation.x = Math.PI / 9;
  joint1.rotation.z = -Math.PI / 9;
  joint1.add(vPost1);
  alan3Group.add(joint1);

  // 2. Sol Dikme (-20° -X Simetrik, +20° +Z)
  const vPost2 = new THREE.Mesh(new THREE.CylinderGeometry(postRadius, postRadius, 4.0, 32), pipeMat);
  vPost2.position.set(0, 2.0, 0);
  vPost2.castShadow = true;
  vPost2.receiveShadow = true;

  const joint2 = new THREE.Group();
  joint2.position.set(0, -0.4535, -4.5);
  joint2.rotation.x = Math.PI / 9;
  joint2.rotation.z = Math.PI / 9;
  joint2.add(vPost2);
  alan3Group.add(joint2);

  // Joint collar connecting vertical post to horizontal carrier pipe at Z = -4.5m
  const jointCollarGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.5, 32);
  const jointCollarMat = new THREE.MeshStandardMaterial({ color: 0x34495e, metalness: 0.8 });
  const jointCollar = new THREE.Mesh(jointCollarGeo, jointCollarMat);
  jointCollar.position.set(0, -0.4535, -4.5);
  alan3Group.add(jointCollar);

  scene.add(alan3Group);
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
createAlan2Structure();
createAlan3Structure();
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
function buildKiris1() {
  const group = new THREE.Group();
  group.userData = {
    type: 'platform',
    name: 'Kiriş-1 (Standart)',
    width: 0.2,
    depth: 1.5,
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
  const beamLength = 1.50;

  const ibeam = createIBeam(beamLength, beamHeight, beamWidth, beamThickness, ringMat);
  ibeam.position.set(0, -0.3655, -0.1645);
  group.add(ibeam);

  return group;
}

function buildKiris2() {
  const group = new THREE.Group();
  group.userData = {
    type: 'platform',
    name: 'Kiriş-2 (Flanşlı/Borulu)',
    width: 0.2,
    depth: 1.5,
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
  const beamLength = 1.50;

  const ibeam = createIBeam(beamLength, beamHeight, beamWidth, beamThickness, ringMat);
  ibeam.position.set(0, -0.3655, -0.1645);
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

function buildTabla1() {
  const group = new THREE.Group();
  group.userData = {
    type: 'platform',
    name: 'Tabla-1 (Sol Çentik)',
    width: 1.0,
    depth: 1.5,
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

  const seg1Geo = new THREE.BoxGeometry(1.0, thickness, 0.8145);
  const seg1 = new THREE.Mesh(seg1Geo, tableMat);
  seg1.position.set(0, 0, -0.34275);
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
  
  const borderRightGeo = new THREE.BoxGeometry(0.02, 0.04, 1.5);
  const borderRight = new THREE.Mesh(borderRightGeo, borderMat);
  borderRight.position.set(0.5, 0, 0);
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

function buildTabla2() {
  const group = new THREE.Group();
  group.userData = {
    type: 'platform',
    name: 'Tabla-2 (Düz)',
    width: 1.0,
    depth: 1.5,
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

  const plateGeo = new THREE.BoxGeometry(1.0, thickness, 1.5);
  const plate = new THREE.Mesh(plateGeo, tableMat);
  plate.position.set(0, 0, 0);
  plate.castShadow = true;
  plate.receiveShadow = true;
  group.add(plate);

  const borderMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.5, roughness: 0.3 });
  
  const borderLeftGeo = new THREE.BoxGeometry(0.02, 0.04, 1.5);
  const borderLeft = new THREE.Mesh(borderLeftGeo, borderMat);
  borderLeft.position.set(-0.5, 0, 0);
  group.add(borderLeft);

  const borderRight = borderLeft.clone();
  borderRight.position.set(0.5, 0, 0);
  group.add(borderRight);

  return group;
}

function buildTabla3() {
  const group = new THREE.Group();
  group.userData = {
    type: 'platform',
    name: 'Tabla-3 (Sağ Çentik)',
    width: 1.0,
    depth: 1.5,
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

  const seg1Geo = new THREE.BoxGeometry(1.0, thickness, 0.8145);
  const seg1 = new THREE.Mesh(seg1Geo, tableMat);
  seg1.position.set(0, 0, -0.34275);
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
  
  const borderLeftGeo = new THREE.BoxGeometry(0.02, 0.04, 1.5);
  const borderLeft = new THREE.Mesh(borderLeftGeo, borderMat);
  borderLeft.position.set(-0.5, 0, 0);
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
  if (state.currentArea === 'alan3') return state.alan3Platforms;
  if (state.currentArea === 'alan2') return state.alan2Platforms;
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

// Helper to configure platform position and 90 deg rotation depending on active area
function setupPlatformTransform(group, defaultX = 0, defaultZ = -2.0, isStandaloneKiris = false) {
  const yPos = isStandaloneKiris ? 0.2465 : 0;
  const isRotatedArea = (state.currentArea === 'alan2' || state.currentArea === 'alan3');
  if (isRotatedArea) {
    group.rotation.y = Math.PI / 2;
    group.position.set(0, yPos, defaultZ);
  } else {
    group.rotation.y = 0;
    group.position.set(defaultX, yPos, -1.1855);
  }
}

// Helper to register spawned platform into the active area
function addPlatformToActiveArea(group) {
  scene.add(group);
  if (state.currentArea === 'alan3') {
    state.alan3Platforms.push(group);
  } else if (state.currentArea === 'alan2') {
    state.alan2Platforms.push(group);
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

function spawnRRUBlok() {
  const isAlan2 = (state.currentArea === 'alan2');
  const blockGroup = new THREE.Group();
  blockGroup.userData = {
    id: state.nextId++,
    type: 'platform',
    name: isAlan2 ? 'RRU Blok (Alan 2)' : 'RRU Blok',
    width: 2.0,
    depth: 1.5,
    height: 2.2,
    interactive: true
  };

  // 1. Kiris-2 (A) at x = -0.9, y = 0.2465 (relative to parent)
  const k2Left = buildKiris2();
  k2Left.userData.interactive = false;
  k2Left.position.set(-0.9, 0.2465, 0);
  blockGroup.add(k2Left);

  // 2. Kiris-1 at x = 0, y = 0.2465
  const k1Mid = buildKiris1();
  k1Mid.userData.interactive = false;
  k1Mid.position.set(0, 0.2465, 0);
  blockGroup.add(k1Mid);

  // 3. Kiris-2 (B) at x = 0.9, y = 0.2465
  const k2Right = buildKiris2();
  k2Right.userData.interactive = false;
  k2Right.position.set(0.9, 0.2465, 0);
  blockGroup.add(k2Right);

  const t1 = buildTabla1();
  t1.userData.interactive = false;
  t1.position.set(-0.5, -0.0090, -0.1645);
  blockGroup.add(t1);

  const t3 = buildTabla3();
  t3.userData.interactive = false;
  t3.position.set(0.5, -0.0090, -0.1645);
  blockGroup.add(t3);

  setupPlatformTransform(blockGroup, 0, -2.0);
  addPlatformToActiveArea(blockGroup);
}

function addRailingsToSahaBlock(blockGroup, isAlan3 = false) {
  const railingGroup = new THREE.Group();
  railingGroup.name = "railing";

  const railColor = 0xfdb913;
  const railMat = new THREE.MeshStandardMaterial({ color: railColor, metalness: 0.5, roughness: 0.3 });
  
  const postHeight = 1.2;
  const postRadius = 0.02;
  const postGeo = new THREE.CylinderGeometry(postRadius, postRadius, postHeight, 16);
  const tableSurfaceY = 0.0010; // Rests exactly flush on top of tabla surface

  const postPositions = [
    // Back long side at Z = -0.8945 (spans X: -0.02 to -2.58)
    { x: -0.02, z: -0.8945 },
    { x: -0.67, z: -0.8945 },
    { x: -1.30, z: -0.8945 },
    { x: -1.93, z: -0.8945 },
    { x: -2.58, z: -0.8945 },

    // Front long side at Z = +0.5655 (spans X: -0.02 to -2.58)
    { x: -0.02, z: 0.5655 },
    { x: -0.67, z: 0.5655 },
    { x: -1.30, z: 0.5655 },
    { x: -1.93, z: 0.5655 },
    { x: -2.58, z: 0.5655 }
  ];

  const railsConfig = [
    // Long rail along X at Back side Z = -0.8945
    { type: 'alongX', z: -0.8945, xCenter: -1.30, length: 2.56 },

    // Long rail along X at Front side Z = +0.5655
    { type: 'alongX', z: 0.5655, xCenter: -1.30, length: 2.56 }
  ];

  // For Alan 2 (original 3-sided railing), add short end railing at X = -0.02m!
  if (!isAlan3) {
    postPositions.push(
      { x: -0.02, z: -0.1645 }
    );
    railsConfig.push(
      { type: 'alongZ', x: -0.02, zCenter: -0.1645, length: 1.46 }
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
  if (state.currentArea !== 'alan2' && state.currentArea !== 'alan3') return;

  const isAlan3 = state.currentArea === 'alan3';
  const areaTitle = isAlan3 ? 'RRU Saha Blok (Alan 3)' : 'RRU Saha Blok (Alan 2)';
  const blockGroup = new THREE.Group();
  blockGroup.userData = {
    id: state.nextId++,
    type: 'platform',
    name: areaTitle,
    width: 3.4,
    depth: 1.5,
    height: 2.2,
    interactive: true
  };

  if (isAlan3) {
    // Alan 3: 4 x Kiriş-1, 3 x Tabla-2 (Düz Panel), 2 Uzun Kenar Korkuluğu
    const k1_1 = buildKiris1(); k1_1.userData.interactive = false; k1_1.position.set(-0.10, 0.2465, 0); blockGroup.add(k1_1);
    const k1_2 = buildKiris1(); k1_2.userData.interactive = false; k1_2.position.set(-0.90, 0.2465, 0); blockGroup.add(k1_2);
    const k1_3 = buildKiris1(); k1_3.userData.interactive = false; k1_3.position.set(-1.70, 0.2465, 0); blockGroup.add(k1_3);
    const k1_4 = buildKiris1(); k1_4.userData.interactive = false; k1_4.position.set(-2.50, 0.2465, 0); blockGroup.add(k1_4);

    const t2_1 = buildTabla2(); t2_1.userData.interactive = false; t2_1.position.set(-0.50, -0.0090, -0.1645); blockGroup.add(t2_1);
    const t2_2 = buildTabla2(); t2_2.userData.interactive = false; t2_2.position.set(-1.30, -0.0090, -0.1645); blockGroup.add(t2_2);
    const t2_3 = buildTabla2(); t2_3.userData.interactive = false; t2_3.position.set(-2.10, -0.0090, -0.1645); blockGroup.add(t2_3);

    addRailingsToSahaBlock(blockGroup, true);
  } else {
    // Alan 2 (Orjinal Versiyon): Kediyolu Tarafındaki Kiriş-2'de Flanşlı Dikey Boru, Tabla-1, Tabla-2, Tabla-3 ve 3 Köşe Korkuluk!
    const k2_1 = buildKiris2(); k2_1.userData.interactive = false; k2_1.position.set(-0.10, 0.2465, 0); blockGroup.add(k2_1); // Flanşlı Borulu Kiriş-2 (Kediyoluna yakın iç taraf)
    const k1_2 = buildKiris1(); k1_2.userData.interactive = false; k1_2.position.set(-0.90, 0.2465, 0); blockGroup.add(k1_2);
    const k1_3 = buildKiris1(); k1_3.userData.interactive = false; k1_3.position.set(-1.70, 0.2465, 0); blockGroup.add(k1_3);
    const k1_4 = buildKiris1(); k1_4.userData.interactive = false; k1_4.position.set(-2.50, 0.2465, 0); blockGroup.add(k1_4);

    const t1_1 = buildTabla1(); t1_1.userData.interactive = false; t1_1.position.set(-0.50, -0.0090, -0.1645); blockGroup.add(t1_1); // 1 adet Çentikli Tabla-1 (Flanş borusu çevresinde)
    const t2_2 = buildTabla2(); t2_2.userData.interactive = false; t2_2.position.set(-1.30, -0.0090, -0.1645); blockGroup.add(t2_2); // 1. Düz Panel Tabla-2
    const t2_3 = buildTabla2(); t2_3.userData.interactive = false; t2_3.position.set(-2.10, -0.0090, -0.1645); blockGroup.add(t2_3); // 2. Düz Panel Tabla-2

    addRailingsToSahaBlock(blockGroup, false); // 3 Köşe Korkuluk!
  }

  setupPlatformTransform(blockGroup, 0, -2.0);
  addPlatformToActiveArea(blockGroup);
}

function spawnRackBlok() {
  const isRotatedArea = (state.currentArea === 'alan2' || state.currentArea === 'alan3');
  const nameSuffix = state.currentArea === 'alan3' ? ' (Alan 3)' : (state.currentArea === 'alan2' ? ' (Alan 2)' : '');
  const blockGroup = new THREE.Group();
  blockGroup.userData = {
    id: state.nextId++,
    type: 'platform',
    name: `Rack Blok${nameSuffix}`,
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

  setupPlatformTransform(blockGroup, 0, -2.0);
  addPlatformToActiveArea(blockGroup);
}

function spawnRRUBlokKorkuluklu() {
  const isRotatedArea = (state.currentArea === 'alan2' || state.currentArea === 'alan3');
  const nameLabel = state.currentArea === 'alan3' ? 'RRU Blok (Alan 3 - Korkuluklu)' : (state.currentArea === 'alan2' ? 'RRU Blok (Alan 2 - Korkuluklu)' : 'RRU Blok (Korkuluklu)');
  const blockGroup = new THREE.Group();
  blockGroup.userData = {
    id: state.nextId++,
    type: 'platform',
    name: nameLabel,
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

  addRailingsToBlock(blockGroup, isRotatedArea);
  setupPlatformTransform(blockGroup, 0, -2.0);
  addPlatformToActiveArea(blockGroup);
}

function spawnRackBlokKorkuluklu() {
  const isRotatedArea = (state.currentArea === 'alan2' || state.currentArea === 'alan3');
  const nameLabel = state.currentArea === 'alan3' ? 'Rack Blok (Alan 3 - Korkuluklu)' : (state.currentArea === 'alan2' ? 'Rack Blok (Alan 2 - Korkuluklu)' : 'Rack Blok (Korkuluklu)');
  const blockGroup = new THREE.Group();
  blockGroup.userData = {
    id: state.nextId++,
    type: 'platform',
    name: nameLabel,
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

  addRailingsToBlock(blockGroup, isRotatedArea);
  setupPlatformTransform(blockGroup, 0, -2.0);
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
  const intersects = raycaster.intersectObjects(scene.children, true);

  let selected = null;
  for (let hit of intersects) {
    let current = hit.object;
    // Walk up to find the direct child of the scene
    while (current.parent && current.parent !== scene) {
      current = current.parent;
    }
    if (current && current.userData && current.userData.interactive) {
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
      let targetY = dragObject.position.y;
      let targetZ = dragObject.userData.lockedZ ? dragObject.position.z : (dragIntersection.z + dragOffset.z);

      if (dragObject.userData.type === 'platform' && !dragObject.userData.isOffsetArmModule && !dragObject.userData.isInclinedPipe && !dragObject.userData.isOffsetCarrier) {
        if (state.currentArea === 'alan2' || state.currentArea === 'alan3') {
          // Locked to Z-axis carrier pipe at X = 0
          if (!dragObject.userData.lockedX) targetX = 0;
          if (!dragObject.userData.lockedZ) targetZ = Math.max(-3.8, Math.min(-1.1855, targetZ));
        } else {
          // Locked to X-axis carrier pipe at Z = -1.1855
          if (!dragObject.userData.lockedZ) targetZ = -1.1855;
          if (!dragObject.userData.lockedX) targetX = Math.max(-9.0, Math.min(9.0, targetX));
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
document.getElementById('btn-add-rru-blok-korkuluklu').addEventListener('click', spawnRRUBlokKorkuluklu);
document.getElementById('btn-add-rack-blok-korkuluklu').addEventListener('click', spawnRackBlokKorkuluklu);

const btnRruSaha = document.getElementById('btn-add-rru-saha-blok-alan2');
if (btnRruSaha) btnRruSaha.addEventListener('click', spawnRRUSahaBlokAlan2);

const btnOffsetRight = document.getElementById('btn-add-offset-arm-right');
if (btnOffsetRight) btnOffsetRight.addEventListener('click', spawnOffsetArmPipeRight);

const btnOffsetLeft = document.getElementById('btn-add-offset-arm-left');
if (btnOffsetLeft) btnOffsetLeft.addEventListener('click', spawnOffsetArmPipeLeft);

function updateAreaButtonVisibility() {
  const isRotatedArea = (state.currentArea === 'alan2' || state.currentArea === 'alan3');
  const btnRru = document.getElementById('btn-add-rru-blok');
  const btnRack = document.getElementById('btn-add-rack-blok');
  const btnRruK = document.getElementById('btn-add-rru-blok-korkuluklu');
  const btnRackK = document.getElementById('btn-add-rack-blok-korkuluklu');
  const btnSaha = document.getElementById('btn-add-rru-saha-blok-alan2');
  const btnOffsetRight = document.getElementById('btn-add-offset-arm-right');
  const btnOffsetLeft = document.getElementById('btn-add-offset-arm-left');

  if (btnSaha) {
    const areaTitle = state.currentArea === 'alan3' ? 'RRU Saha Blok (Alan 3)' : 'RRU Saha Blok (Alan 2)';
    const nameSpan = btnSaha.querySelector('.name');
    if (nameSpan) nameSpan.textContent = areaTitle;
  }

  if (isRotatedArea) {
    if (btnRru) btnRru.style.display = 'none';
    if (btnRack) btnRack.style.display = 'none';
    if (btnRruK) btnRruK.style.display = 'none';
    if (btnRackK) btnRackK.style.display = 'none';
    if (btnSaha) btnSaha.style.display = 'flex';
    if (btnOffsetRight) btnOffsetRight.style.display = 'flex';
    if (btnOffsetLeft) btnOffsetLeft.style.display = 'flex';
  } else {
    if (btnRru) btnRru.style.display = 'flex';
    if (btnRack) btnRack.style.display = 'flex';
    if (btnRruK) btnRruK.style.display = 'flex';
    if (btnRackK) btnRackK.style.display = 'flex';
    if (btnSaha) btnSaha.style.display = 'none';
    if (btnOffsetRight) btnOffsetRight.style.display = 'none';
    if (btnOffsetLeft) btnOffsetLeft.style.display = 'none';
  }
}

// Area Selection Handler (Alan-1 / Alan-2 / Alan-3)
const selectAreaElem = document.getElementById('select-area');
if (selectAreaElem) {
  selectAreaElem.addEventListener('change', (e) => {
    const selectedArea = e.target.value;
    state.currentArea = selectedArea;
    
    updateAreaButtonVisibility();

    const catwalkGroup = scene.getObjectByName('catwalk');
    const alan2Group = scene.getObjectByName('alan2Structure');
    const alan3Group = scene.getObjectByName('alan3Structure');

    if (selectedArea === 'alan3') {
      if (catwalkGroup) catwalkGroup.visible = false;
      if (alan2Group) alan2Group.visible = false;
      if (alan3Group) alan3Group.visible = true;

      state.alan1Platforms.forEach(p => p.visible = false);
      state.alan2Platforms.forEach(p => p.visible = false);
      state.alan3Platforms.forEach(p => p.visible = true);
    } else if (selectedArea === 'alan2') {
      if (catwalkGroup) catwalkGroup.visible = false;
      if (alan2Group) alan2Group.visible = true;
      if (alan3Group) alan3Group.visible = false;

      state.alan1Platforms.forEach(p => p.visible = false);
      state.alan2Platforms.forEach(p => p.visible = true);
      state.alan3Platforms.forEach(p => p.visible = false);
    } else {
      if (catwalkGroup) catwalkGroup.visible = true;
      if (alan2Group) alan2Group.visible = false;
      if (alan3Group) alan3Group.visible = false;

      state.alan1Platforms.forEach(p => p.visible = true);
      state.alan2Platforms.forEach(p => p.visible = false);
      state.alan3Platforms.forEach(p => p.visible = false);
    }

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

  // POI PROSE
  { id: 'prose-a11', category: 'POI', name: 'CB-12-POI-64F-A11 (Legacy POI)', width: 0.400, height: 0.350, depth: 0.260, weight: 25, color: '#ea580c' },
  { id: 'prose-a12', category: 'POI', name: 'CB-12-POI-64F-A12 (5G NR POI)', width: 0.400, height: 0.350, depth: 0.260, weight: 25, color: '#ea580c' },

  // POI COMBA
  { id: 'comba-cdb4', category: 'POI', name: 'POI-CDB4OAN1TU (Legacy POI)', width: 0.483, height: 0.300, depth: 0.200, weight: 25, color: '#ca8a04' },
  { id: 'comba-cdi4', category: 'POI', name: 'POI-CDI4OAN1TU (5G NR POI)', width: 0.483, height: 0.300, depth: 0.300, weight: 25, color: '#ca8a04' }
];

function buildCustomEquipmentModel(item) {
  const group = new THREE.Group();
  group.userData = {
    id: state.nextId++,
    type: 'rru',
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

  setupPlatformTransform(group, 0, -2.0, false);
  const isPoi = item.category.startsWith('POI');
  group.position.y = isPoi ? 0.30 : 0.75; // Non-POI RRUs default to Level 1 (+0.75m), POI units default to ground/tray (+0.30m)
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
      <button class="eq-card-btn">➕ Sahneye Ekle</button>
    `;
    card.addEventListener('click', () => spawnCustomEquipment(item));
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

// Right Main Navigation Tab Switcher
const tabBtnLayout = document.getElementById('tab-btn-layout');
const tabBtnDevices = document.getElementById('tab-btn-devices');
const tabContentLayout = document.getElementById('tab-content-layout');
const tabContentDevices = document.getElementById('tab-content-devices');

if (tabBtnLayout && tabBtnDevices) {
  tabBtnLayout.addEventListener('click', () => {
    tabBtnLayout.classList.add('active');
    tabBtnDevices.classList.remove('active');
    tabContentLayout.classList.add('active');
    tabContentDevices.classList.remove('active');
  });

  tabBtnDevices.addEventListener('click', () => {
    tabBtnDevices.classList.add('active');
    tabBtnLayout.classList.remove('active');
    tabContentDevices.classList.add('active');
    tabContentLayout.classList.remove('active');
  });
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
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.1);">
      <div>
        <strong style="font-size: 14px; color: #f8fafc; display: block;">${obj.userData.name}</strong>
        <span style="font-size: 11px; color: #94a3b8;">${obj.userData.type.toUpperCase()} | ID: #${obj.userData.id}</span>
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
        <label style="color: #cbd5e1;">Pozisyon X (m)</label>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="color: var(--gs-yellow); font-family: monospace;">${obj.position.x.toFixed(3)} m</span>
          <label style="font-size: 11px; color: ${isLockedX ? '#ef4444' : '#94a3b8'}; cursor: pointer; display: flex; align-items: center; gap: 2px;">
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
          <label style="color: #cbd5e1;">Boru Üzeri Sabit Montaj Kotu (Y)</label>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="color: var(--gs-yellow); font-family: monospace;">${obj.position.y.toFixed(2)} m</span>
            <label style="font-size: 11px; color: ${isLockedY ? '#ef4444' : '#94a3b8'}; cursor: pointer; display: flex; align-items: center; gap: 2px;">
              <input type="checkbox" class="lock-axis-cb" data-axis="y" ${isLockedY ? 'checked' : ''} style="cursor: pointer;">
              ${isLockedY ? '🔒 Kilitli' : '🔓 Kilitle'}
            </label>
          </div>
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="level-btn" data-y="0.75" ${isLockedY ? 'disabled' : ''} style="flex: 1; padding: 8px; font-size: 11px; font-weight: bold; border-radius: 6px; border: 1px solid ${isLevel1 ? '#0284c7' : '#475569'}; background: ${isLevel1 ? '#0284c7' : '#1e293b'}; color: white; cursor: pointer;">
            🔻 Alt Seviye Kotu (+0.75m)
          </button>
          <button class="level-btn" data-y="1.50" ${isLockedY ? 'disabled' : ''} style="flex: 1; padding: 8px; font-size: 11px; font-weight: bold; border-radius: 6px; border: 1px solid ${isLevel2 ? '#0284c7' : '#475569'}; background: ${isLevel2 ? '#0284c7' : '#1e293b'}; color: white; cursor: pointer;">
            🔺 Üst Seviye Kotu (+1.50m)
          </button>
        </div>
      </div>
    `;
  } else {
    html += `
      <div class="input-group" style="margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: bold; margin-bottom: 4px;">
          <label style="color: #cbd5e1;">Pozisyon Y (Yükseklik - m)</label>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="color: var(--gs-yellow); font-family: monospace;">${obj.position.y.toFixed(3)} m</span>
            <label style="font-size: 11px; color: ${isLockedY ? '#ef4444' : '#94a3b8'}; cursor: pointer; display: flex; align-items: center; gap: 2px;">
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
        <label style="color: #cbd5e1;">Pozisyon Z (m)</label>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="color: var(--gs-yellow); font-family: monospace;">${obj.position.z.toFixed(3)} m</span>
          <label style="font-size: 11px; color: ${isLockedZ ? '#ef4444' : '#94a3b8'}; cursor: pointer; display: flex; align-items: center; gap: 2px;">
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
      <button id="btn-rotate-90" class="btn btn-secondary" style="flex: 1; padding: 8px 10px; font-size: 12px; background: #334155; color: white;">
        🔄 90° Çevir
      </button>
    </div>

    <!-- Keyboard Arrow Keys Helper Notice -->
    <div style="margin-top: 10px; padding: 8px; background: rgba(15, 23, 42, 0.6); border-radius: 6px; border: 1px solid #334155; font-size: 11px; color: #94a3b8;">
      💡 <strong>Ok Tuşları İle Kaydırma:</strong> Seçili iken ⬅️ ➡️ (X) ve ⬆️ ⬇️ (Z) ok tuşları ile kaydırabilirsiniz. (Shift ile 10cm, normal 1cm).
    </div>

    <!-- Pass-Through (Clipping/Collision Toggle) -->
    <div style="margin-top: 8px; padding: 8px 10px; background: #1e293b; border-radius: 6px; border: 1px solid #334155; display: flex; align-items: center; justify-content: space-between;">
      <label for="prop-passthrough" style="cursor: pointer; font-size: 11px; color: #cbd5e1; font-weight: bold; margin: 0;">
        ⚡ Serbest Konumlandırma (Çakışma Koruması Muafiyeti)
      </label>
      <input type="checkbox" id="prop-passthrough" ${obj.userData.allowPassThrough !== false ? 'checked' : ''} style="cursor: pointer; width: 16px; height: 16px;">
    </div>
  `;

  content.innerHTML = html;

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

  document.getElementById('stat-platforms').innerText = platformCount;
  document.getElementById('stat-antennas').innerText = antennaCount;
  document.getElementById('stat-rrus').innerText = rruCount;
  document.getElementById('stat-weight').innerText = `${totalWeight} kg`;

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
document.getElementById('btn-export-bom').addEventListener('click', () => {
  modal.style.display = 'flex';
});
document.getElementById('btn-close-modal').addEventListener('click', () => {
  modal.style.display = 'none';
});
document.getElementById('btn-print-bom').addEventListener('click', () => {
  window.print();
});

// View Modes Toggle
document.getElementById('btn-view-ortho').addEventListener('click', (e) => {
  document.getElementById('btn-view-persp').classList.remove('active');
  e.target.classList.add('active');
  camera.position.set(0, 15, 0);
  controls.target.set(0, 0, 0);
  controls.update();
});

document.getElementById('btn-view-persp').addEventListener('click', (e) => {
  document.getElementById('btn-view-ortho').classList.remove('active');
  e.target.classList.add('active');
  camera.position.set(5, 5, 8);
  controls.target.set(0, 0, 0);
  controls.update();
});

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
});

// Projeyi JSON Olarak Kaydet (Export)
document.getElementById('btn-export-json').addEventListener('click', () => {
  const exportData = {
    area: state.currentArea,
    items: getActivePlatforms().map(p => {
      const isLockedX = !!p.userData.lockedX;
      const isLockedY = !!p.userData.lockedY;
      const isLockedZ = !!p.userData.lockedZ;

      return {
        name: p.userData.name,
        catalogId: p.userData.catalogId || null,
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
    })
  };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  const areaLabel = state.currentArea === 'alan2' ? 'alan2' : 'alan1';
  downloadAnchor.setAttribute("download", `gs-catwalk-layout-${areaLabel}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
});

// Projeyi JSON Olarak Yükle (Import)
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
        
        let targetArea = state.currentArea;
        let itemsToImport = [];

        if (importData.area) {
          targetArea = importData.area;
          itemsToImport = importData.items || [];
        } else if (Array.isArray(importData)) {
          itemsToImport = importData;
          // Infer area from names if legacy array
          if (itemsToImport.some(i => i.name && i.name.includes('Alan 2'))) {
            targetArea = 'alan2';
          }
        }

        // Switch workspace area if file belongs to another area
        if (targetArea !== state.currentArea) {
          const selectAreaElem = document.getElementById('select-area');
          if (selectAreaElem) {
            selectAreaElem.value = targetArea;
            selectAreaElem.dispatchEvent(new Event('change'));
          }
        }

        // Clear target area platforms
        const activePlatforms = getActivePlatforms();
        activePlatforms.forEach(p => scene.remove(p));
        if (state.currentArea === 'alan2') state.alan2Platforms = [];
        else state.alan1Platforms = [];
        selectObject(null);

        const isAlan2Area = (state.currentArea === 'alan2');

        // Re-construct imported items
        itemsToImport.forEach(item => {
          let group = null;
          const itemName = item.name || '';

          // 1. Check EQUIPMENT_CATALOG match for RRU and POI devices
          const catalogItem = EQUIPMENT_CATALOG.find(cat => 
            cat.id === item.catalogId || 
            cat.name === itemName || 
            itemName.includes(cat.name) || 
            cat.name.includes(itemName) ||
            (itemName.startsWith('RRU') && cat.name.includes(itemName.replace('RRU', '')))
          );

          const isRotatedArea = (isAlan2Area || targetArea === 'alan3');

          if (catalogItem) {
            group = buildCustomEquipmentModel(catalogItem);
            group.userData.name = itemName;
          } else if (itemName.includes('Kiriş-1')) {
            group = buildKiris1();
            group.userData.name = itemName;
          } else if (itemName.includes('Kiriş-2')) {
            group = buildKiris2();
            group.userData.name = itemName;
          } else if (itemName.includes('Tabla-1')) {
            group = buildTabla1();
            group.userData.name = itemName;
          } else if (itemName.includes('Tabla-2')) {
            group = buildTabla2();
            group.userData.name = itemName;
          } else if (itemName.includes('Tabla-3')) {
            group = buildTabla3();
            group.userData.name = itemName;
          } else if (itemName.includes('RRU Blok (Korkuluklu)') || itemName.includes('RRU Blok (Alan 2 - Korkuluklu)') || itemName.includes('RRU Blok (Alan 3 - Korkuluklu)')) {
            group = new THREE.Group();
            group.userData = {
              type: 'platform',
              name: itemName,
              width: 2.0, depth: 1.5, height: 2.2, interactive: true
            };
            const k2Left = buildKiris2(); k2Left.userData.interactive = false; k2Left.position.set(-0.9, 0.2465, 0); group.add(k2Left);
            const k1Mid = buildKiris1(); k1Mid.userData.interactive = false; k1Mid.position.set(0, 0.2465, 0); group.add(k1Mid);
            const k2Right = buildKiris2(); k2Right.userData.interactive = false; k2Right.position.set(0.9, 0.2465, 0); group.add(k2Right);
            const t1 = buildTabla1(); t1.userData.interactive = false; t1.position.set(-0.5, -0.0090, -0.1645); group.add(t1);
            const t3 = buildTabla3(); t3.userData.interactive = false; t3.position.set(0.5, -0.0090, -0.1645); group.add(t3);
            addRailingsToBlock(group, isRotatedArea);
          } else if (itemName.includes('RRU Saha Blok')) {
            group = new THREE.Group();
            group.userData = {
              type: 'platform',
              name: itemName,
              width: 3.4, depth: 1.5, height: 2.2, interactive: true
            };
            const k1_1 = buildKiris1(); k1_1.userData.interactive = false; k1_1.position.set(-0.10, 0.2465, 0); group.add(k1_1);
            const k1_2 = buildKiris1(); k1_2.userData.interactive = false; k1_2.position.set(-0.90, 0.2465, 0); group.add(k1_2);
            const k1_3 = buildKiris1(); k1_3.userData.interactive = false; k1_3.position.set(-1.70, 0.2465, 0); group.add(k1_3);
            const k1_4 = buildKiris1(); k1_4.userData.interactive = false; k1_4.position.set(-2.50, 0.2465, 0); group.add(k1_4);

            const t2_1 = buildTabla2(); t2_1.userData.interactive = false; t2_1.position.set(-0.50, -0.0090, -0.1645); group.add(t2_1);
            const t2_2 = buildTabla2(); t2_2.userData.interactive = false; t2_2.position.set(-1.30, -0.0090, -0.1645); group.add(t2_2);
            const t2_3 = buildTabla2(); t2_3.userData.interactive = false; t2_3.position.set(-2.10, -0.0090, -0.1645); group.add(t2_3);

            addRailingsToSahaBlock(group);
          } else if (itemName.includes('Rack Blok (Korkuluklu)') || itemName.includes('Rack Blok (Alan 2 - Korkuluklu)') || itemName.includes('Rack Blok (Alan 3 - Korkuluklu)')) {
            group = new THREE.Group();
            group.userData = {
              type: 'platform',
              name: itemName,
              width: 2.0, depth: 1.5, height: 0.22, interactive: true
            };
            const k1Left = buildKiris1(); k1Left.userData.interactive = false; k1Left.position.set(-0.9, 0.2465, 0); group.add(k1Left);
            const k1Mid = buildKiris1(); k1Mid.userData.interactive = false; k1Mid.position.set(0, 0.2465, 0); group.add(k1Mid);
            const k1Right = buildKiris1(); k1Right.userData.interactive = false; k1Right.position.set(0.9, 0.2465, 0); group.add(k1Right);
            const t2Left = buildTabla2(); t2Left.userData.interactive = false; t2Left.position.set(-0.5, -0.0090, -0.1645); group.add(t2Left);
            const t2Right = buildTabla2(); t2Right.userData.interactive = false; t2Right.position.set(0.5, -0.0090, -0.1645); group.add(t2Right);
            addRailingsToBlock(group, isRotatedArea);
          } else if (itemName.includes('RRU Blok')) {
            group = new THREE.Group();
            group.userData = {
              type: 'platform',
              name: itemName,
              width: 2.0, depth: 1.5, height: 2.2, interactive: true
            };
            const k2Left = buildKiris2(); k2Left.userData.interactive = false; k2Left.position.set(-0.9, 0.2465, 0); group.add(k2Left);
            const k1Mid = buildKiris1(); k1Mid.userData.interactive = false; k1Mid.position.set(0, 0.2465, 0); group.add(k1Mid);
            const k2Right = buildKiris2(); k2Right.userData.interactive = false; k2Right.position.set(0.9, 0.2465, 0); group.add(k2Right);
            const t1 = buildTabla1(); t1.userData.interactive = false; t1.position.set(-0.5, -0.0090, -0.1645); group.add(t1);
            const t3 = buildTabla3(); t3.userData.interactive = false; t3.position.set(0.5, -0.0090, -0.1645); group.add(t3);
          } else if (itemName.includes('Rack Blok')) {
            group = new THREE.Group();
            group.userData = {
              type: 'platform',
              name: itemName,
              width: 2.0, depth: 1.5, height: 0.22, interactive: true
            };
            const k1Left = buildKiris1(); k1Left.userData.interactive = false; k1Left.position.set(-0.9, 0.2465, 0); group.add(k1Left);
            const k1Mid = buildKiris1(); k1Mid.userData.interactive = false; k1Mid.position.set(0, 0.2465, 0); group.add(k1Mid);
            const k1Right = buildKiris1(); k1Right.userData.interactive = false; k1Right.position.set(0.9, 0.2465, 0); group.add(k1Right);
            const t2Left = buildTabla2(); t2Left.userData.interactive = false; t2Left.position.set(-0.5, -0.0090, -0.1645); group.add(t2Left);
            const t2Right = buildTabla2(); t2Right.userData.interactive = false; t2Right.position.set(0.5, -0.0090, -0.1645); group.add(t2Right);
          } else if (itemName.includes('Ofset & 2.5" Boru') || itemName.includes('30cm Ofset')) {
            const isLeft = itemName.includes('Sol');
            group = buildOffsetArmPipeModel(isLeft ? 'left' : 'right');
            group.userData.name = itemName;
          } else if (itemName.startsWith('RRU') || itemName.startsWith('POI') || item.type === 'rru') {
            // Fallback for custom RRU/POI names
            const fallbackItem = {
              id: 'custom-' + itemName,
              category: itemName.includes('POI') ? 'POI' : 'RRU',
              name: itemName,
              width: item.width || 0.356,
              height: item.height || 0.480,
              depth: item.depth || 0.140,
              weight: item.weight || 25,
              color: '#dc2626'
            };
            group = buildCustomEquipmentModel(fallbackItem);
          }

          if (group) {
            group.userData.id = state.nextId++;
            
            // Support independent axis locks with backward compatibility for legacy single 'locked' field
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
            
            group.position.set(item.position.x, item.position.y, item.position.z);
            if (item.rotation) {
              group.rotation.set(item.rotation.x, item.rotation.y, item.rotation.z);
            }
            addPlatformToActiveArea(group);
          }
        });

        updateBOM();
        alert('Tasarım başarıyla yüklendi!');
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
    const areaLabel = state.currentArea === 'alan3' ? 'ALAN 3' : (state.currentArea === 'alan2' ? 'ALAN 2' : 'ALAN 1');
    const confirmed = confirm(`${areaLabel} üzerindeki tüm yerleşimi sıfırlamak istediğinizden emin misiniz?\n\nBu işlem sadece aktif olan ${areaLabel} alanındaki nesneleri temizleyecek, diğer alanları etkilemeyecektir.`);
    if (confirmed) {
      if (state.currentArea === 'alan3') {
        state.alan3Platforms.forEach(p => scene.remove(p));
        state.alan3Platforms = [];
      } else if (state.currentArea === 'alan2') {
        state.alan2Platforms.forEach(p => scene.remove(p));
        state.alan2Platforms = [];
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
  state.alan1Platforms = [];
  state.alan2Platforms = [];
  state.alan3Platforms = [];
  selectObject(null);
  updateBOM();
}

addInitialPlatforms();
updateAreaButtonVisibility();

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
