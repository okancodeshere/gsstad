const fs = require('fs');
const path = require('path');
const { DxfBuilder } = require('./dxf_engine.cjs');
const Drawing = require('dxf-writer');
const {
  generateMatsingSections2D,
  generateMatsingSections3D
} = require('./generate_matsing_dxfs.cjs');
const {
  generateGammanuSections2D,
  generateGammanuSections3D
} = require('./generate_gammanu_dxfs.cjs');
const {
  generateCableTraySections2D
} = require('./generate_cable_tray_dxfs.cjs');
const {
  generateCatwalkRruSectionDXF
} = require('./generate_catwalk_rru_section_dxf.cjs');
const {
  generateAlan2AlternativesDXF
} = require('./generate_alan2_scoreboard_alternatives_dxf.cjs');

// Output Directories
const BASE_DIR = path.join(__dirname, 'DXF_Ciktilari');
const DIR_MM = path.join(BASE_DIR, 'Milimetre');
const DIR_M = path.join(BASE_DIR, 'Metre');

[BASE_DIR, DIR_MM, DIR_M].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// Load detailed equipment dump data
const dumpPath = path.join(__dirname, 'detailed_equipment_dump.json');
let equipmentData = { alan1: [], alan2: [], alan3: [], alan4: [] };
if (fs.existsSync(dumpPath)) {
  equipmentData = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
}

// Deduplicate helper
function deduplicate(items = []) {
  const clean = [];
  items.forEach(it => {
    const dup = clean.find(c => c.itemType === it.itemType &&
      Math.abs(c.center.x - it.center.x) < 0.05 &&
      Math.abs(c.center.y - it.center.y) < 0.05 &&
      Math.abs(c.center.z - it.center.z) < 0.05
    );
    if (!dup) clean.push(it);
  });
  return clean;
}

const cleanData = {
  alan1: deduplicate(equipmentData.alan1),
  alan2: deduplicate(equipmentData.alan2),
  alan3: deduplicate(equipmentData.alan3),
  alan4: deduplicate(equipmentData.alan4)
};

// ==========================================
// DETAILED CAD DRAWING DISPATCHERS
// ==========================================
function drawDetailedEquipment2D(dxf, items, s, zMax = 999) {
  items.forEach(item => {
    if (item.center.z > zMax) return;

    const w = item.size.x * 1000 * s;
    const d = item.size.z * 1000 * s;
    const x = (item.center.x * 1000 - (item.size.x * 1000) / 2) * s;
    const y = (-item.center.z * 1000 - (item.size.z * 1000) / 2) * s;
    const cx = item.center.x * 1000 * s;
    const cy = -item.center.z * 1000 * s;

    switch (item.itemType) {
      case 'rru':
        dxf.addRRU2D(x, y, w, d, item.operator, item.name);
        break;

      case 'rectifier':
        dxf.addRectifier2D(x, y, w, d, item.rectifierModel, item.name);
        break;

      case 'poi_carrier_rack':
        dxf.addPoiRackCarrier2D(x, y, w, d, item.name);
        break;

      case 'poi_module':
        dxf.addPoiModule2D(x, y, w, d, item.name);
        break;

      case 'tabla':
        dxf.addTabla2D(x, y, w, d, item.name);
        break;

      case 'antenna_matsing': {
        const r = Math.max(w, d) / 2;
        dxf.addMatsingAntenna2D(cx, cy, r, item.name);
        break;
      }

      case 'antenna_panel':
        dxf.addPanelAntenna2D(x, y, w, d, item.name);
        break;

      case 'antenna_carrier_truss':
        dxf.addRect(x, y, w, d, 'EKP_ANTEN_TASIYICI_KOL');
        break;

      default:
        dxf.addRect(x, y, w, d, 'EKP_DIGER_EKIPMANLAR');
    }
  });
}

function drawDetailedEquipment3D(dxf, items, s) {
  items.forEach(item => {
    const minX = (item.center.x - item.size.x / 2) * 1000 * s;
    const maxX = (item.center.x + item.size.x / 2) * 1000 * s;
    const minY = (-item.center.z - item.size.z / 2) * 1000 * s;
    const maxY = (-item.center.z + item.size.z / 2) * 1000 * s;
    const minZ = (item.center.y - item.size.y / 2) * 1000 * s;
    const maxZ = (item.center.y + item.size.y / 2) * 1000 * s;
    const cx = item.center.x * 1000 * s;
    const cy = -item.center.z * 1000 * s;

    switch (item.itemType) {
      case 'rru':
        dxf.addRRU3D(minX, minY, minZ, maxX, maxY, maxZ, item.operator, item.name);
        break;

      case 'rectifier':
        dxf.addRectifier3D(minX, minY, minZ, maxX, maxY, maxZ, item.rectifierModel, item.name);
        break;

      case 'poi_carrier_rack':
        dxf.addPoiRackCarrier3D(minX, minY, minZ, maxX, maxY, maxZ, item.name);
        break;

      case 'poi_module':
        dxf.addPoiModule3D(minX, minY, minZ, maxX, maxY, maxZ, item.name);
        break;

      case 'tabla':
        dxf.addTabla3D(minX, minY, minZ, maxX, maxY, maxZ, item.name);
        break;

      case 'antenna_matsing': {
        const r = Math.max(maxX - minX, maxY - minY) / 2;
        dxf.addMatsingAntenna3D(cx, cy, minZ, maxZ, r, item.name);
        break;
      }

      case 'antenna_panel':
        dxf.addPanelAntenna3D(minX, minY, minZ, maxX, maxY, maxZ, item.name);
        break;

      case 'antenna_carrier_truss':
        dxf.addSolidBox3D(minX, minY, minZ, maxX, maxY, maxZ, 'EKP_ANTEN_TASIYICI_KOL');
        break;

      default:
        dxf.addSolidBox3D(minX, minY, minZ, maxX, maxY, maxZ, 'EKP_DIGER_EKIPMANLAR');
    }
  });
}

// 16-sided cylinder helper for 3D pipes
function addCylinder3D(dxf, cx, cy, czBottom, czTop, radius, layer) {
  const segments = 16;
  const ptsBot = [];
  const ptsTop = [];

  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    ptsBot.push({ x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius, z: czBottom });
    ptsTop.push({ x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius, z: czTop });
  }

  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    dxf.addFace3d(
      ptsBot[i].x, ptsBot[i].y, ptsBot[i].z,
      ptsBot[next].x, ptsBot[next].y, ptsBot[next].z,
      ptsTop[next].x, ptsTop[next].y, ptsTop[next].z,
      ptsTop[i].x, ptsTop[i].y, ptsTop[i].z,
      layer
    );
    dxf.addLine3d(ptsBot[i].x, ptsBot[i].y, ptsBot[i].z, ptsBot[next].x, ptsBot[next].y, ptsBot[next].z, layer);
    dxf.addLine3d(ptsTop[i].x, ptsTop[i].y, ptsTop[i].z, ptsTop[next].x, ptsTop[next].y, ptsTop[next].z, layer);
    if (i % 4 === 0) {
      dxf.addLine3d(ptsBot[i].x, ptsBot[i].y, ptsBot[i].z, ptsTop[i].x, ptsTop[i].y, ptsTop[i].z, layer);
    }
  }

  for (let i = 1; i < segments - 1; i++) {
    dxf.addFace3d(
      ptsBot[0].x, ptsBot[0].y, ptsBot[0].z,
      ptsBot[i].x, ptsBot[i].y, ptsBot[i].z,
      ptsBot[i + 1].x, ptsBot[i + 1].y, ptsBot[i + 1].z,
      ptsBot[i + 1].x, ptsBot[i + 1].y, ptsBot[i + 1].z,
      layer
    );
    dxf.addFace3d(
      ptsTop[0].x, ptsTop[0].y, ptsTop[0].z,
      ptsTop[i].x, ptsTop[i].y, ptsTop[i].z,
      ptsTop[i + 1].x, ptsTop[i + 1].y, ptsTop[i + 1].z,
      ptsTop[i + 1].x, ptsTop[i + 1].y, ptsTop[i + 1].z,
      layer
    );
  }
}

// 16-sided horizontal cylinder helper along X axis (for roof end Ø45.7cm carrier cylinder)
function addCylinderAlongX3D(dxf, minX, maxX, cy, cz, radius, layer) {
  const segments = 16;
  const pts1 = [];
  const pts2 = [];

  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts1.push({ x: minX, y: cy + Math.sin(a) * radius, z: cz + Math.cos(a) * radius });
    pts2.push({ x: maxX, y: cy + Math.sin(a) * radius, z: cz + Math.cos(a) * radius });
  }

  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    dxf.addFace3d(
      pts1[i].x, pts1[i].y, pts1[i].z,
      pts2[i].x, pts2[i].y, pts2[i].z,
      pts2[next].x, pts2[next].y, pts2[next].z,
      pts1[next].x, pts1[next].y, pts1[next].z,
      layer
    );
    dxf.addLine3d(pts1[i].x, pts1[i].y, pts1[i].z, pts1[next].x, pts1[next].y, pts1[next].z, layer);
    dxf.addLine3d(pts2[i].x, pts2[i].y, pts2[i].z, pts2[next].x, pts2[next].y, pts2[next].z, layer);
    if (i % 4 === 0) {
      dxf.addLine3d(pts1[i].x, pts1[i].y, pts1[i].z, pts2[i].x, pts2[i].y, pts2[i].z, layer);
    }
  }

  for (let i = 1; i < segments - 1; i++) {
    dxf.addFace3d(
      pts1[0].x, pts1[0].y, pts1[0].z,
      pts1[i].x, pts1[i].y, pts1[i].z,
      pts1[i + 1].x, pts1[i + 1].y, pts1[i + 1].z,
      pts1[i + 1].x, pts1[i + 1].y, pts1[i + 1].z,
      layer
    );
    dxf.addFace3d(
      pts2[0].x, pts2[0].y, pts2[0].z,
      pts2[i].x, pts2[i].y, pts2[i].z,
      pts2[i + 1].x, pts2[i + 1].y, pts2[i + 1].z,
      pts2[i + 1].x, pts2[i + 1].y, pts2[i + 1].z,
      layer
    );
  }
}

// Title block & border helper
function addTitleBlock(dxf, title, areaCode, scaleText, units, posX = 0, posY = 0) {
  const isMm = units === 'mm';
  const s = isMm ? 1 : 0.001;

  const boxW = 8000 * s;
  const boxH = 2200 * s;
  const x0 = posX;
  const y0 = posY;

  dxf.addRect(x0, y0, boxW, boxH, 'METIN_BILGI');
  dxf.addLine(x0, y0 + 1400 * s, x0 + boxW, y0 + 1400 * s, 'METIN_BILGI');
  dxf.addLine(x0, y0 + 700 * s, x0 + boxW, y0 + 700 * s, 'METIN_BILGI');
  dxf.addLine(x0 + 4500 * s, y0, x0 + 4500 * s, y0 + 1400 * s, 'METIN_BILGI');

  dxf.addText(x0 + 200 * s, y0 + 1650 * s, 320 * s, 'GALATASARAY STADYUMU GSM ALTYAPI PROJESI', 'METIN_BILGI');
  dxf.addText(x0 + 200 * s, y0 + 950 * s, 260 * s, `ALAN: ${title} (${areaCode})`, 'METIN_BILGI');
  dxf.addText(x0 + 200 * s, y0 + 280 * s, 200 * s, `OLCEK: ${scaleText} (1:${isMm ? '1 mm' : '1 m'})`, 'METIN_BILGI');
  dxf.addText(x0 + 4700 * s, y0 + 950 * s, 180 * s, 'CIZIM: ANTIGRAVITY CAD / BIM', 'METIN_BILGI');
  dxf.addText(x0 + 4700 * s, y0 + 280 * s, 180 * s, `TARIH: ${new Date().toISOString().slice(0, 10)}`, 'METIN_BILGI');

  // North Arrow
  const naX = x0 - 1500 * s;
  const naY = y0 + 1100 * s;
  const r = 800 * s;
  dxf.addCircle(naX, naY, r, 'METIN_BILGI');
  dxf.addLine(naX, naY - r * 0.9, naX, naY + r * 0.9, 'METIN_BILGI');
  dxf.addLine(naX, naY + r * 0.9, naX - 250 * s, naY + 300 * s, 'METIN_BILGI');
  dxf.addLine(naX, naY + r * 0.9, naX + 250 * s, naY + 300 * s, 'METIN_BILGI');
  dxf.addText(naX, naY + r + 200 * s, 300 * s, 'K', 'METIN_BILGI', 0, 'center', 'middle');
}

// BOM Table Helper
function addBomTable(dxf, items, posX, posY, units) {
  const isMm = units === 'mm';
  const s = isMm ? 1 : 0.001;

  const rowH = 400 * s;
  const colW1 = 1200 * s;
  const colW2 = 6000 * s;
  const colW3 = 2500 * s;
  const colW4 = 1500 * s;
  const totalW = colW1 + colW2 + colW3 + colW4;
  const totalH = (items.length + 2) * rowH;

  dxf.addRect(posX, posY, totalW, totalH, 'METIN_BILGI');
  dxf.addText(posX + 200 * s, posY + totalH - 300 * s, 240 * s, 'EKIPMAN VE ALTYAPI YERLESIM CETVELI (BOM)', 'METIN_BILGI');

  const headerY = posY + totalH - rowH;
  dxf.addLine(posX, headerY, posX + totalW, headerY, 'METIN_BILGI');
  dxf.addLine(posX, headerY - rowH, posX + totalW, headerY - rowH, 'METIN_BILGI');

  let curX = posX;
  dxf.addLine(curX + colW1, posY, curX + colW1, headerY, 'METIN_BILGI');
  curX += colW1;
  dxf.addLine(curX + colW2, posY, curX + colW2, headerY, 'METIN_BILGI');
  curX += colW2;
  dxf.addLine(curX + colW3, posY, curX + colW3, headerY, 'METIN_BILGI');

  dxf.addText(posX + 100 * s, headerY - 280 * s, 180 * s, 'NO', 'METIN_BILGI');
  dxf.addText(posX + colW1 + 100 * s, headerY - 280 * s, 180 * s, 'EKIPMAN TANIMI', 'METIN_BILGI');
  dxf.addText(posX + colW1 + colW2 + 100 * s, headerY - 280 * s, 180 * s, 'BOYUTLAR (GxDxY)', 'METIN_BILGI');
  dxf.addText(posX + colW1 + colW2 + colW3 + 100 * s, headerY - 280 * s, 180 * s, 'ADET', 'METIN_BILGI');

  items.forEach((item, idx) => {
    const rowY = headerY - (idx + 2) * rowH;
    dxf.addLine(posX, rowY, posX + totalW, rowY, 'METIN_BILGI');
    dxf.addText(posX + 100 * s, rowY + 120 * s, 160 * s, String(idx + 1), 'METIN_BILGI');
    dxf.addText(posX + colW1 + 100 * s, rowY + 120 * s, 160 * s, item.name, 'METIN_BILGI');
    dxf.addText(posX + colW1 + colW2 + 100 * s, rowY + 120 * s, 160 * s, item.dim, 'METIN_BILGI');
    dxf.addText(posX + colW1 + colW2 + colW3 + 100 * s, rowY + 120 * s, 160 * s, String(item.qty), 'METIN_BILGI');
  });
}

// =========================================================================
// 1. GENERATE 2D PLAN & KESIT FOR ALAN 1 & ALAN 3 (MARATON TRIBÜNÜ)
// =========================================================================
function generateAlan1_3_2D(units = 'mm') {
  const isMm = units === 'mm';
  const s = isMm ? 1 : 0.001;
  const dxf = new DxfBuilder(units);

  // ==========================================
  // BÖLGE 1: ZEMİN PLATFORMU & KORUMALI ALAN PLANI (Z = -2.0m ile 0.0m)
  // ==========================================
  // 1. Walkway outline & grating (30000 x 2000 mm)
  dxf.addRect(-15000 * s, 0, 30000 * s, 2000 * s, 'ZEMIN_PLATFORM');
  for (let x = -14000; x <= 14000; x += 1000) {
    dxf.addLine(x * s, 0, x * s, 2000 * s, 'ZEMIN_PLATFORM');
  }

  // 2. Railings outside 11m enclosure
  dxf.addLine(-15000 * s, 50 * s, -5500 * s, 50 * s, 'KORKULUK_KAPI');
  dxf.addLine(5500 * s, 50 * s, 15000 * s, 50 * s, 'KORKULUK_KAPI');
  dxf.addLine(-15000 * s, 1950 * s, -5500 * s, 1950 * s, 'KORKULUK_KAPI');
  dxf.addLine(5500 * s, 1950 * s, 15000 * s, 1950 * s, 'KORKULUK_KAPI');
  dxf.addLine(-15000 * s, 50 * s, -15000 * s, 1950 * s, 'KORKULUK_KAPI');
  dxf.addLine(15000 * s, 50 * s, 15000 * s, 1950 * s, 'KORKULUK_KAPI');

  // 3. 11-Meter Protected Enclosure
  dxf.addLine(-5500 * s, 1950 * s, 5500 * s, 1950 * s, 'KORKULUK_KAPI');
  dxf.addLine(-5500 * s, 50 * s, -5500 * s, 1950 * s, 'KORKULUK_KAPI');
  dxf.addLine(5500 * s, 50 * s, 5500 * s, 1950 * s, 'KORKULUK_KAPI');

  // Fixed perfore panels
  dxf.addRect(-5500 * s, 40 * s, 1000 * s, 20 * s, 'KORKULUK_KAPI');
  dxf.addText(-5000 * s, 120 * s, 100 * s, 'SABIT PANEL (1m)', 'KORKULUK_KAPI', 0, 'center');
  dxf.addRect(4500 * s, 40 * s, 1000 * s, 20 * s, 'KORKULUK_KAPI');
  dxf.addText(5000 * s, 120 * s, 100 * s, 'SABIT PANEL (1m)', 'KORKULUK_KAPI', 0, 'center');

  // 6 Sliding Doors
  dxf.addLine(-5500 * s, 30 * s, 5500 * s, 30 * s, 'KORKULUK_KAPI');
  dxf.addLine(-5500 * s, 70 * s, 5500 * s, 70 * s, 'KORKULUK_KAPI');
  for (let d = 0; d < 6; d++) {
    const doorX = -4500 + d * 1500;
    const isFrontTrack = (d % 2 === 0);
    const trackY = isFrontTrack ? 30 : 70;
    dxf.addRect(doorX * s, (trackY - 12) * s, 1500 * s, 24 * s, 'KORKULUK_KAPI');
    const hX = isFrontTrack ? doorX + 1300 : doorX + 200;
    dxf.addCircle(hX * s, trackY * s, 20 * s, 'KORKULUK_KAPI');
    dxf.addText((doorX + 750) * s, (trackY + (isFrontTrack ? -120 : 120)) * s, 90 * s, `KAPI ${d + 1} (1.5m)`, 'KORKULUK_KAPI', 0, 'center');
  }

  // 4. Columns & Flanges
  const colX = [-12000, -6000, 0, 6000, 12000];
  colX.forEach(cx => {
    dxf.addCircle(cx * s, 1350 * s, 200 * s, 'MONTAJ_BORULARI');
    dxf.addCircle(cx * s, 1350 * s, 270 * s, 'MONTAJ_BORULARI');
    dxf.addLine((cx - 350) * s, 1350 * s, (cx + 350) * s, 1350 * s, 'MONTAJ_BORULARI');
    dxf.addLine(cx * s, (1350 - 350) * s, cx * s, (1350 + 350) * s, 'MONTAJ_BORULARI');
  });

  // Walking Corridor
  dxf.addLine(-15000 * s, 150 * s, 15000 * s, 150 * s, 'YURUYUS_KORIDORU');
  dxf.addLine(-15000 * s, 950 * s, 15000 * s, 950 * s, 'YURUYUS_KORIDORU');
  dxf.addText(0, 550 * s, 180 * s, '<--- NET YURUYUS KORIDORU (SERBEST GECIS GENISLIGI 800mm) --->', 'YURUYUS_KORIDORU', 0, 'center');

  // 5. DRAW DETAILED EQUIPMENT IN GROUND PLAN VIEW
  drawDetailedEquipment2D(dxf, cleanData.alan2, s, 5.0);

  // 6. Draw 11 vertical mounting pipes of the 11-Boru complex
  const pipeZLeft = [-0.45, -0.27, -0.09, 0.09, 0.27, 0.45];
  const pipeZRight = [-0.36, -0.18, 0, 0.18, 0.36];
  pipeZLeft.forEach(pz => {
    const px = (-1.5205 - 0.68) * 1000 * s;
    const py = -(-1.16 + pz) * 1000 * s;
    dxf.addCircle(px, py, 32 * s, 'MONTAJ_BORULARI');
    dxf.addRect(px - 90 * s, py - 90 * s, 180 * s, 180 * s, 'MONTAJ_BORULARI');
  });
  pipeZRight.forEach(pz => {
    const px = (-1.5205 + 0.68) * 1000 * s;
    const py = -(-1.16 + pz) * 1000 * s;
    dxf.addCircle(px, py, 32 * s, 'MONTAJ_BORULARI');
    dxf.addRect(px - 90 * s, py - 90 * s, 180 * s, 180 * s, 'MONTAJ_BORULARI');
  });

  // Dimensions for Ground Plan
  dxf.addDimension(-15000 * s, 0, 15000 * s, 0, -1200 * s, '30000 mm (ZEMIN KEDI YOLU BOYU)');
  dxf.addDimension(-5500 * s, 0, 5500 * s, 0, -600 * s, '11000 mm (OZEL KORUMALI ALAN)');
  for (let c = 0; c < 4; c++) {
    dxf.addDimension(colX[c] * s, 2000 * s, colX[c + 1] * s, 2000 * s, 600 * s, '6000 mm');
  }

  // ==========================================
  // BÖLGE 2: ARA KEDİ YOLU VE 14 ADET RRU MONTAJ PLANI (Z ≈ 27.43m)
  // ==========================================
  const cwMidBaseY = 4000 * s;
  dxf.addRect(-13000 * s, cwMidBaseY, 20000 * s, 1000 * s, 'ZEMIN_PLATFORM');
  for (let x = -12500; x <= 6500; x += 1000) {
    dxf.addLine(x * s, cwMidBaseY, x * s, cwMidBaseY + 1000 * s, 'ZEMIN_PLATFORM');
  }
  // Railings
  dxf.addLine(-13000 * s, cwMidBaseY + 50 * s, 7000 * s, cwMidBaseY + 50 * s, 'KORKULUK_KAPI');
  dxf.addLine(-13000 * s, cwMidBaseY + 950 * s, 7000 * s, cwMidBaseY + 950 * s, 'KORKULUK_KAPI');
  for (let x = -12500; x <= 6500; x += 1500) {
    dxf.addCircle(x * s, cwMidBaseY + 50 * s, 20 * s, 'KORKULUK_KAPI');
    dxf.addCircle(x * s, cwMidBaseY + 950 * s, 20 * s, 'KORKULUK_KAPI');
  }
  // Walk corridor
  dxf.addLine(-13000 * s, cwMidBaseY + 100 * s, 7000 * s, cwMidBaseY + 100 * s, 'YURUYUS_KORIDORU');
  dxf.addLine(-13000 * s, cwMidBaseY + 900 * s, 7000 * s, cwMidBaseY + 900 * s, 'YURUYUS_KORIDORU');
  dxf.addText(-3000 * s, cwMidBaseY + 500 * s, 140 * s, '<--- ARA KEDI YOLU (Z = 27.43m, NET GECIS GENISLIGI 800mm) --->', 'YURUYUS_KORIDORU', 0, 'center');

  // The 14 Catwalk RRUs on 20cm Offset Pipes:
  dxf.addCatwalkOffsetPipeWithRRUs2D(-3820 * s, cwMidBaseY + 500 * s, true, 'SOL DIREK (4 TCELL + 3 VDF RRU)');
  dxf.addCatwalkOffsetPipeWithRRUs2D(-2180 * s, cwMidBaseY + 500 * s, false, 'SAG DIREK (4 TT + 3 VDF RRU)');

  // Dimensions for intermediate catwalk
  dxf.addDimension(-13000 * s, cwMidBaseY, 7000 * s, cwMidBaseY, -500 * s, '20000 mm (ARA KEDI YOLU BOYU)');
  dxf.addDimension(-3820 * s, cwMidBaseY + 1200 * s, -2180 * s, cwMidBaseY + 1200 * s, 400 * s, '1640 mm (BORULAR ARASI MESAFE)');

  // ==========================================
  // BÖLGE 3: ÇATI UCU KEDİ YOLU VE SİLİNDİR ÜZERİ 3 SET YATAY POI RAFI PLANI (Z ≈ 44.43m)
  // ==========================================
  const cwEndBaseY = 8500 * s;
  dxf.addRect(-13000 * s, cwEndBaseY, 20000 * s, 1000 * s, 'ZEMIN_PLATFORM');
  for (let x = -12500; x <= 6500; x += 1000) {
    dxf.addLine(x * s, cwEndBaseY, x * s, cwEndBaseY + 1000 * s, 'ZEMIN_PLATFORM');
  }
  // Railings
  dxf.addLine(-13000 * s, cwEndBaseY + 50 * s, 7000 * s, cwEndBaseY + 50 * s, 'KORKULUK_KAPI');
  dxf.addLine(-13000 * s, cwEndBaseY + 950 * s, 7000 * s, cwEndBaseY + 950 * s, 'KORKULUK_KAPI');
  for (let x = -12500; x <= 6500; x += 1500) {
    dxf.addCircle(x * s, cwEndBaseY + 50 * s, 20 * s, 'KORKULUK_KAPI');
    dxf.addCircle(x * s, cwEndBaseY + 950 * s, 20 * s, 'KORKULUK_KAPI');
  }
  dxf.addText(-3000 * s, cwEndBaseY + 500 * s, 140 * s, '<--- CATI UCU KEDI YOLU (Z = 44.43m, NET GECIS GENISLIGI 800mm) --->', 'YURUYUS_KORIDORU', 0, 'center');

  // Ø45.7cm Structural Cylinder (Dia = 457mm, L = 20000mm) at Y = 7314 * s
  const cylAxisY = 7314 * s;
  dxf.addRect(-13000 * s, cylAxisY - 228.5 * s, 20000 * s, 457 * s, 'MONTAJ_BORULARI');
  dxf.addLine(-13000 * s, cylAxisY, 7000 * s, cylAxisY, 'MONTAJ_BORULARI');
  dxf.addText(-8000 * s, cylAxisY, 140 * s, 'CATI UCU TASIYICI SILINDIR BORU (DIA 457mm / O45.7cm, L=20m)', 'MONTAJ_BORULARI', 0, 'left', 'middle');

  // Cantilever bracket arms between cylinder and catwalk (every 4m)
  for (let i = -11000; i <= 5000; i += 4000) {
    dxf.addRect(i * s, cylAxisY + 228.5 * s, 200 * s, (cwEndBaseY - (cylAxisY + 228.5 * s)), 'CELIK_KIRIS_KOLON');
  }

  // 3 Sets of POI shelves mounted on the cylinder:
  dxf.addCylinderMountedPoiShelf2D(-2420 * s, cylAxisY, 1, 'SET 1 (SOL POI RAFI - TCELL & TT 5G)');
  dxf.addCylinderMountedPoiShelf2D(-1600 * s, cylAxisY, 2, 'SET 2 (ORTA POI RAFI - TCELL & TT 5G)');
  dxf.addCylinderMountedPoiShelf2D(-780 * s, cylAxisY, 3, 'SET 3 (SAG POI RAFI - VDF & AUX 5G)');

  // Dimensions for end catwalk & cylinder
  dxf.addDimension(-13000 * s, cwEndBaseY + 1200 * s, 7000 * s, cwEndBaseY + 1200 * s, 400 * s, '20000 mm (CATI UCU KEDI YOLU BOYU)');
  dxf.addDimension(-2420 * s, cylAxisY - 500 * s, -1600 * s, cylAxisY - 500 * s, -300 * s, '820 mm');
  dxf.addDimension(-1600 * s, cylAxisY - 500 * s, -780 * s, cylAxisY - 500 * s, -300 * s, '820 mm');

  // ==========================================
  // DETAY A: KEDİ YOLU 20CM OFSETLİ 14 RRU MONTAJ DETAYI (1:1 BÜYÜK ÖLÇEK)
  // ==========================================
  const detAX = -15000 * s;
  const detAY = 13500 * s;
  dxf.addRect(detAX - 500 * s, detAY - 2200 * s, 14000 * s, 4400 * s, 'METIN_BILGI');
  dxf.addText(detAX, detAY + 1900 * s, 180 * s, 'DETAY A: KEDI YOLU 20CM OFSETLI MONTAJ BORULARI VE 14 ADET RRU YERLESIMI', 'METIN_BILGI');
  dxf.addCatwalkOffsetPipeWithRRUs2D(detAX + 3500 * s, detAY, true, 'SOL DIREK (4 TURKCELL + 3 VODAFONE RRU)');
  dxf.addCatwalkOffsetPipeWithRRUs2D(detAX + 8500 * s, detAY, false, 'SAG DIREK (4 TURK TELEKOM + 3 VODAFONE RRU)');
  dxf.addDimension(detAX + 3500 * s, detAY + 1200 * s, detAX + 8500 * s, detAY + 1200 * s, 400 * s, '5000 mm (MAKAS DIKME AKSI ACIKLIGI)');

  // ==========================================
  // DETAY B: SİLİNDİR ÜZERİ ÇEMBER SABİTLEMELİ YATAY POI RAFI DETAYI (1:1 BÜYÜK ÖLÇEK)
  // ==========================================
  const detBX = 500 * s;
  const detBY = 13500 * s;
  dxf.addRect(detBX - 500 * s, detBY - 2200 * s, 14000 * s, 4400 * s, 'METIN_BILGI');
  dxf.addText(detBX, detBY + 1900 * s, 180 * s, 'DETAY B: O45.7CM SILINDIR UZERI CEMBER SABITLEMELI YATAY 2x POI RAFI VE PROSE MODULLERI', 'METIN_BILGI');
  dxf.addCylinderMountedPoiShelf2D(detBX + 6500 * s, detBY, 1, 'TIP-1: YATAY 2x PROSE CB-12-POI-64F-A12 MODULU (12 BTS + 4 ANT PORT)');
  dxf.addDimension((detBX + 6500 - 360) * s, detBY + 400 * s, (detBX + 6500 + 360) * s, detBY + 400 * s, 300 * s, '720 mm (RAF BOYU)');
  dxf.addDimension((detBX + 6500 - 360) * s, (detBY - 270) * s, (detBX + 6500 - 360) * s, (detBY + 270) * s, -400 * s, '540 mm (RAF DERINLIGI)');
  dxf.addDimension((detBX + 6500 - 200) * s, detBY - 400 * s, (detBX + 6500 + 200) * s, detBY - 400 * s, -300 * s, '400 mm (CEMBERLER ARASI)');

  // ==========================================
  // KESİTLER & ELEVASYON GÖRÜNÜŞLERİ
  // ==========================================
  // 1. Zemin Platformu Kesiti (Y = -7000 mm)
  const elBaseY = -7000 * s;
  dxf.addRect(-15000 * s, elBaseY - 400 * s, 30000 * s, 400 * s, 'ZEMIN_PLATFORM');
  dxf.addLine(-15000 * s, elBaseY, 15000 * s, elBaseY, 'ZEMIN_PLATFORM');
  dxf.addLine(-15000 * s, elBaseY + 1100 * s, -5500 * s, elBaseY + 1100 * s, 'KORKULUK_KAPI');
  dxf.addLine(5500 * s, elBaseY + 1100 * s, 15000 * s, elBaseY + 1100 * s, 'KORKULUK_KAPI');
  dxf.addLine(-5500 * s, elBaseY + 1700 * s, 5500 * s, elBaseY + 1700 * s, 'KORKULUK_KAPI');

  // 6 Sliding Doors in Elevation
  for (let d = 0; d < 6; d++) {
    const dx = -4500 + d * 1500;
    dxf.addRect(dx * s, elBaseY + 30 * s, 1500 * s, 1640 * s, 'KORKULUK_KAPI');
    dxf.addLine(dx * s, elBaseY + 30 * s, (dx + 1500) * s, elBaseY + 1670 * s, 'KORKULUK_KAPI');
    dxf.addLine(dx * s, elBaseY + 1670 * s, (dx + 1500) * s, elBaseY + 30 * s, 'KORKULUK_KAPI');
  }

  // 5 Pipe Columns
  colX.forEach(cx => {
    dxf.addRect((cx - 200) * s, elBaseY, 400 * s, 4300 * s, 'MONTAJ_BORULARI');
    dxf.addRect((cx - 270) * s, elBaseY, 540 * s, 150 * s, 'MONTAJ_BORULARI');
    dxf.addRect((cx - 270) * s, elBaseY + 4200 * s, 540 * s, 100 * s, 'MONTAJ_BORULARI');
  });
  dxf.addRect(-12000 * s, elBaseY + (4000 - 110) * s, 24000 * s, 220 * s, 'MONTAJ_BORULARI');

  // Ground equipment silhouettes
  [-5100, -4360, -3620].forEach((rx, idx) => {
    dxf.addPoiRackElevation((rx - 300) * s, elBaseY, 600 * s, 1480 * s, 4, `POI RACK ${idx + 1}`);
  });
  dxf.addRRUPoleElevation((-1520 - 400) * s, elBaseY, 1700 * s, [
    { y: 600 * s, operator: 'Vodafone', side: 'left', width: 400 * s, height: 480 * s },
    { y: 1380 * s, operator: 'Vodafone', side: 'left', width: 400 * s, height: 480 * s }
  ]);
  dxf.addRRUPoleElevation((-1520 + 400) * s, elBaseY, 1700 * s, [
    { y: 600 * s, operator: 'Türk Telekom', side: 'right', width: 360 * s, height: 480 * s },
    { y: 1380 * s, operator: 'Turkcell', side: 'right', width: 400 * s, height: 530 * s }
  ]);
  dxf.addRectifierElevation((840 - 300) * s, elBaseY, 600 * s, 1300 * s, 'ELTEK_20U', 'ELTEK #1');
  dxf.addRectifierElevation((1740 - 345) * s, elBaseY, 690 * s, 1250 * s, 'MTS9304A', 'MTS #1');
  dxf.addRectifierElevation((2610 - 345) * s, elBaseY, 690 * s, 1250 * s, 'MTS9304A', 'MTS #2');
  dxf.addRectifierElevation((3400 - 300) * s, elBaseY, 600 * s, 1300 * s, 'ELTEK_20U', 'ELTEK #2');
  dxf.addRectifierElevation((4190 - 300) * s, elBaseY, 600 * s, 1300 * s, 'ELTEK_20U', 'ELTEK #3');
  dxf.addRectifierElevation((5050 - 345) * s, elBaseY, 690 * s, 1250 * s, 'MTS9304A', 'MTS #3');

  // 2. Ara Kedi Yolu ve 14 RRU Kesiti (Y = -14000 mm)
  const elMidY = -14000 * s;
  dxf.addRect(-10000 * s, elMidY - 200 * s, 20000 * s, 200 * s, 'ZEMIN_PLATFORM');
  dxf.addLine(-10000 * s, elMidY + 1000 * s, 10000 * s, elMidY + 1000 * s, 'KORKULUK_KAPI');
  dxf.addText(-3000 * s, elMidY + 1200 * s, 180 * s, 'ARA KEDI YOLU VE 20CM OFSET BORULARINDA 14 RRU KESITI (KOT +8.60m)', 'METIN_BILGI', 0, 'center');
  // Two 2.9m pipes in elevation
  dxf.addRect((-3820 - 30) * s, elMidY + 200 * s, 60 * s, 2900 * s, 'MONTAJ_BORULARI');
  dxf.addRect((-2180 - 30) * s, elMidY + 200 * s, 60 * s, 2900 * s, 'MONTAJ_BORULARI');
  // Left pipe RRUs (3 Vodafone lower, 2 Turkcell mid, 2 Turkcell upper)
  dxf.addRRUPoleElevation(-3820 * s, elMidY + 200 * s, 2900 * s, [
    { y: 350 * s, operator: 'Vodafone', side: 'left', width: 432 * s, height: 480 * s },
    { y: 350 * s, operator: 'Vodafone', side: 'right', width: 432 * s, height: 480 * s },
    { y: 1200 * s, operator: 'Turkcell', side: 'left', width: 356 * s, height: 480 * s },
    { y: 1200 * s, operator: 'Turkcell', side: 'right', width: 356 * s, height: 480 * s },
    { y: 2050 * s, operator: 'Turkcell', side: 'left', width: 356 * s, height: 480 * s },
    { y: 2050 * s, operator: 'Turkcell', side: 'right', width: 356 * s, height: 480 * s }
  ]);
  // Right pipe RRUs (3 Vodafone lower, 2 TT mid, 2 TT upper)
  dxf.addRRUPoleElevation(-2180 * s, elMidY + 200 * s, 2900 * s, [
    { y: 350 * s, operator: 'Vodafone', side: 'left', width: 432 * s, height: 480 * s },
    { y: 350 * s, operator: 'Vodafone', side: 'right', width: 432 * s, height: 480 * s },
    { y: 1200 * s, operator: 'Türk Telekom', side: 'left', width: 356 * s, height: 480 * s },
    { y: 1200 * s, operator: 'Türk Telekom', side: 'right', width: 356 * s, height: 480 * s },
    { y: 2050 * s, operator: 'Türk Telekom', side: 'left', width: 356 * s, height: 480 * s },
    { y: 2050 * s, operator: 'Türk Telekom', side: 'right', width: 356 * s, height: 480 * s }
  ]);

  // 3. Çatı Ucu Kedi Yolu ve Silindir POI Kesiti (Y = -21000 mm)
  const elEndY = -21000 * s;
  dxf.addRect(-10000 * s, elEndY - 200 * s, 20000 * s, 200 * s, 'ZEMIN_PLATFORM');
  dxf.addLine(-10000 * s, elEndY + 1000 * s, 10000 * s, elEndY + 1000 * s, 'KORKULUK_KAPI');
  dxf.addText(-3000 * s, elEndY + 1200 * s, 180 * s, 'CATI UCU KEDI YOLU VE O45.7CM SILINDIR UZERI YATAY 3 SET POI GORUNUSU (KOT +5.75m)', 'METIN_BILGI', 0, 'center');
  // Cylinder in elevation
  dxf.addRect(-10000 * s, elEndY - 450 * s, 20000 * s, 457 * s, 'MONTAJ_BORULARI');
  // 3 POI shelves in elevation
  [-2420, -1600, -780].forEach((px, idx) => {
    dxf.addRect((px - 360) * s, elEndY + 10 * s, 720 * s, 350 * s, 'EKP_POI_TASIYICI_SASE');
    dxf.addRect((px - 260) * s, elEndY + 30 * s, 240 * s, 310 * s, 'EKP_POI_MODULLERI');
    dxf.addRect((px + 20) * s, elEndY + 30 * s, 240 * s, 310 * s, 'EKP_POI_MODULLERI');
    dxf.addText(px * s, elEndY + 180 * s, 70 * s, `SET ${idx + 1} (2x POI)`, 'METIN_BILGI', 0, 'center');
  });

  // Title Block and BOM Table
  addTitleBlock(dxf, 'MARATON TRIBUNU, KEDI YOLU VE CATI SIKLET DETAYLI YERLESIMI', 'ALAN 1 & ALAN 3', isMm ? '1:1 mm' : '1:1 m', units, -15000 * s, 23500 * s);

  const bom = [
    { name: 'Kedi Yolu 20cm Ofset Borulari Turkcell RRU', dim: '356x140x480 mm', qty: 4 },
    { name: 'Kedi Yolu 20cm Ofset Borulari Turk Telekom RRU', dim: '356x140x480 mm', qty: 4 },
    { name: 'Kedi Yolu 20cm Ofset Borulari Vodafone RRU (3+3)', dim: '432x135x480 mm', qty: 6 },
    { name: 'Silindir Uzeri Cember Sabitlemeli Yatay POI Rafi', dim: '720x540x350 mm', qty: 3 },
    { name: 'Silindir Uzeri Yatay Prose CB-12-POI-64F-A12', dim: '400x350x260 mm', qty: 6 },
    { name: 'Agir Hizmet O45.7cm Silindir Ciftli Celik Cember Kelepce', dim: 'O483x70x10 mm', qty: 6 },
    { name: '1/2" Feeder Kablo Baglanti Seti (RRU - POI Hatti)', dim: 'Boy: 15-45m', qty: 60 },
    { name: 'Tek Tek Vodafone RRU Modulleri (Zemin)', dim: '432x135x480 mm', qty: 11 },
    { name: 'Tek Tek Turkcell RRU Modulleri (Zemin)', dim: '398x145x533 mm', qty: 4 },
    { name: 'Tek Tek Turk Telekom RRU Modulleri (Zemin)', dim: '356x140x480 mm', qty: 6 },
    { name: 'Canovate 19" 30U POI Rack Tasiyici Sase', dim: '600x700x1480 mm', qty: 3 },
    { name: 'Prose CB-12-POI-64F-A12 Modulleri (Zemin Rack)', dim: '400x350x260 mm', qty: 12 },
    { name: 'Eltek Flatpack2 20U Rectifier DC Guc Kaynagi', dim: '680x710x1300 mm', qty: 3 },
    { name: 'MTS9304A-HX10AX 12U Rectifier DC Guc Kaynagi', dim: '690x720x1250 mm', qty: 3 },
    { name: 'Matsing 4-Beam Kure Lens Anten + Ofset Kolu', dim: '617x721x1635 mm', qty: 3 }
  ];
  addBomTable(dxf, bom, -15000 * s, 19500 * s, units);

  return dxf.toDxfString();
}

// =========================================================================
// 2. GENERATE 3D MODEL FOR ALAN 1 & ALAN 3 (MARATON TRIBÜNÜ)
// =========================================================================
function generateAlan1_3_3D(units = 'mm') {
  const isMm = units === 'mm';
  const s = isMm ? 1 : 0.001;
  const dxf = new DxfBuilder(units);

  // ==========================================
  // 1. ZEMİN PLATFORMU & KORUMALI ALAN 3D MODELİ
  // ==========================================
  dxf.addSolidBox3D(-15000 * s, 0, -400 * s, 15000 * s, 2000 * s, 0, 'ZEMIN_PLATFORM');

  // Railings
  dxf.addSolidBox3D(-15000 * s, 40 * s, 0, -5500 * s, 60 * s, 1100 * s, 'KORKULUK_KAPI');
  dxf.addSolidBox3D(5500 * s, 40 * s, 0, 15000 * s, 60 * s, 1100 * s, 'KORKULUK_KAPI');
  dxf.addSolidBox3D(-15000 * s, 1940 * s, 0, -5500 * s, 1960 * s, 1100 * s, 'KORKULUK_KAPI');
  dxf.addSolidBox3D(5500 * s, 1940 * s, 0, 15000 * s, 1960 * s, 1100 * s, 'KORKULUK_KAPI');

  // 11m Enclosure
  dxf.addSolidBox3D(-5500 * s, 1940 * s, 0, 5500 * s, 1960 * s, 1700 * s, 'KORKULUK_KAPI');
  dxf.addSolidBox3D(-5500 * s, 40 * s, 0, -5480 * s, 1960 * s, 1700 * s, 'KORKULUK_KAPI');
  dxf.addSolidBox3D(5480 * s, 40 * s, 0, 5500 * s, 1960 * s, 1700 * s, 'KORKULUK_KAPI');

  // 6 Sliding Doors
  for (let d = 0; d < 6; d++) {
    const dx = -4500 + d * 1500;
    const isFrontTrack = (d % 2 === 0);
    const trackY = isFrontTrack ? 30 : 70;
    dxf.addSolidBox3D(dx * s, (trackY - 12) * s, 30 * s, (dx + 1500) * s, (trackY + 12) * s, 1670 * s, 'KORKULUK_KAPI');
  }

  // Columns
  const colX = [-12000, -6000, 0, 6000, 12000];
  colX.forEach(cx => {
    addCylinder3D(dxf, cx * s, 1350 * s, 0, 4300 * s, 200 * s, 'MONTAJ_BORULARI');
    addCylinder3D(dxf, cx * s, 1350 * s, 0, 150 * s, 270 * s, 'MONTAJ_BORULARI');
    addCylinder3D(dxf, cx * s, 1350 * s, 4200 * s, 4300 * s, 270 * s, 'MONTAJ_BORULARI');
  });

  // 11 Mounting pipes for the 11-Boru complex
  const pipeZLeft = [-0.45, -0.27, -0.09, 0.09, 0.27, 0.45];
  const pipeZRight = [-0.36, -0.18, 0, 0.18, 0.36];
  pipeZLeft.forEach(pz => {
    const px = (-1.5205 - 0.68) * 1000 * s;
    const py = -(-1.16 + pz) * 1000 * s;
    addCylinder3D(dxf, px, py, 0, 1700 * s, 32 * s, 'MONTAJ_BORULARI');
    dxf.addSolidBox3D(px - 90 * s, py - 90 * s, 0, px + 90 * s, py + 90 * s, 15 * s, 'MONTAJ_BORULARI');
  });
  pipeZRight.forEach(pz => {
    const px = (-1.5205 + 0.68) * 1000 * s;
    const py = -(-1.16 + pz) * 1000 * s;
    addCylinder3D(dxf, px, py, 0, 1700 * s, 32 * s, 'MONTAJ_BORULARI');
    dxf.addSolidBox3D(px - 90 * s, py - 90 * s, 0, px + 90 * s, py + 90 * s, 15 * s, 'MONTAJ_BORULARI');
  });

  // Draw ground platforms dumped equipment
  drawDetailedEquipment3D(dxf, cleanData.alan2, s);

  // ==========================================
  // 2. ARA KEDİ YOLU 3D MODELİ (Z = 27.434m, Y = 8.60m)
  // ==========================================
  // Grating Floor Slab (20m x 1m, thickness 50mm)
  dxf.addSolidBox3D(-13000 * s, -27934 * s, 8550 * s, 7000 * s, -26934 * s, 8600 * s, 'ZEMIN_PLATFORM');
  // Side beams
  dxf.addSolidBox3D(-13000 * s, -27974 * s, 8450 * s, 7000 * s, -27894 * s, 8600 * s, 'ZEMIN_PLATFORM');
  dxf.addSolidBox3D(-13000 * s, -26974 * s, 8450 * s, 7000 * s, -26894 * s, 8600 * s, 'ZEMIN_PLATFORM');
  // Yellow Handrails (H = 1000mm)
  dxf.addSolidBox3D(-13000 * s, -27934 * s, 9580 * s, 7000 * s, -27914 * s, 9600 * s, 'KORKULUK_KAPI');
  dxf.addSolidBox3D(-13000 * s, -26954 * s, 9580 * s, 7000 * s, -26934 * s, 9600 * s, 'KORKULUK_KAPI');
  // Railing Posts every 1500mm
  for (let x = -12500; x <= 6500; x += 1500) {
    addCylinder3D(dxf, x * s, -27924 * s, 8600 * s, 9600 * s, 20 * s, 'KORKULUK_KAPI');
    addCylinder3D(dxf, x * s, -26944 * s, 8600 * s, 9600 * s, 20 * s, 'KORKULUK_KAPI');
  }

  // ==========================================
  // 3. KEDİ YOLU / MAKAS DİKMELERİ 20CM OFSET BORULARI VE 14 RRU (Z = 28.39m, Y = 9.51m)
  // ==========================================
  // Sol Direk 2" Boru (L = 2900mm)
  addCylinder3D(dxf, -3820 * s, -28390 * s, (9510 - 1450) * s, (9510 + 1450) * s, 30.15 * s, 'MONTAJ_BORULARI');
  // Sağ Direk 2" Boru (L = 2900mm)
  addCylinder3D(dxf, -2180 * s, -28390 * s, (9510 - 1450) * s, (9510 + 1450) * s, 30.15 * s, 'MONTAJ_BORULARI');

  // 20cm Standoff Konsol kollari (her boruda 3 adet: alt, orta, ust)
  [-1000, 0, 1000].forEach(bz => {
    // Sol boru standoff (60x60mm)
    dxf.addSolidBox3D((-3820 - 30) * s, -28390 * s, (9510 + bz - 30) * s, (-3820 + 30) * s, -28190 * s, (9510 + bz + 30) * s, 'MONTAJ_BORULARI');
    // Sağ boru standoff (60x60mm)
    dxf.addSolidBox3D((-2180 - 30) * s, -28390 * s, (9510 + bz - 30) * s, (-2180 + 30) * s, -28190 * s, (9510 + bz + 30) * s, 'MONTAJ_BORULARI');
  });

  // SOL DİREK 7 RRU:
  // Alt Sıra: 3x Vodafone 5526t (432x135x480 mm) at Z = 8860mm
  const vdfStep = 165;
  [-vdfStep, 0, vdfStep].forEach(vx => {
    dxf.addRRU3D(
      (-3820 + vx - 67.5) * s, (-28390 - 40 - 356) * s, (8860 - 240) * s,
      (-3820 + vx + 67.5) * s, (-28390 - 40) * s, (8860 + 240) * s,
      'Vodafone', 'VDF 5526t'
    );
  });
  // Orta Sıra: 2x Turkcell 5502 (356x140x480 mm) at Z = 9510mm
  const tcStep = 87.5;
  [-tcStep, tcStep].forEach(tx => {
    dxf.addRRU3D(
      (-3820 + tx - 70) * s, (-28390 - 40 - 356) * s, (9510 - 240) * s,
      (-3820 + tx + 70) * s, (-28390 - 40) * s, (9510 + 240) * s,
      'Turkcell', 'TCELL 5502'
    );
  });
  // Üst Sıra: 2x Turkcell 5301 (356x140x480 mm) at Z = 10160mm
  [-tcStep, tcStep].forEach(tx => {
    dxf.addRRU3D(
      (-3820 + tx - 70) * s, (-28390 - 40 - 356) * s, (10160 - 240) * s,
      (-3820 + tx + 70) * s, (-28390 - 40) * s, (10160 + 240) * s,
      'Turkcell', 'TCELL 5301'
    );
  });

  // SAĞ DİREK 7 RRU:
  // Alt Sıra: 3x Vodafone 5526t at Z = 8860mm
  [-vdfStep, 0, vdfStep].forEach(vx => {
    dxf.addRRU3D(
      (-2180 + vx - 67.5) * s, (-28390 - 40 - 356) * s, (8860 - 240) * s,
      (-2180 + vx + 67.5) * s, (-28390 - 40) * s, (8860 + 240) * s,
      'Vodafone', 'VDF 5526t'
    );
  });
  // Orta Sıra: 2x Türk Telekom 5527 (356x140x480 mm) at Z = 9510mm
  [-tcStep, tcStep].forEach(tx => {
    dxf.addRRU3D(
      (-2180 + tx - 70) * s, (-28390 - 40 - 356) * s, (9510 - 240) * s,
      (-2180 + tx + 70) * s, (-28390 - 40) * s, (9510 + 240) * s,
      'Türk Telekom', 'TT 5527'
    );
  });
  // Üst Sıra: 2x Türk Telekom NR 5818W (356x140x480 mm) at Z = 10160mm
  [-tcStep, tcStep].forEach(tx => {
    dxf.addRRU3D(
      (-2180 + tx - 70) * s, (-28390 - 40 - 356) * s, (10160 - 240) * s,
      (-2180 + tx + 70) * s, (-28390 - 40) * s, (10160 + 240) * s,
      'Türk Telekom', 'TT 5818W'
    );
  });

  // ==========================================
  // 4. ÇATI UCU KEDİ YOLU 3D MODELİ (Z = 44.434m, Y = 5.75m)
  // ==========================================
  // Grating Floor Slab (20m x 1m, thickness 50mm)
  dxf.addSolidBox3D(-13000 * s, -44934 * s, 5700 * s, 7000 * s, -43934 * s, 5750 * s, 'ZEMIN_PLATFORM');
  // Side beams
  dxf.addSolidBox3D(-13000 * s, -44974 * s, 5600 * s, 7000 * s, -44894 * s, 5750 * s, 'ZEMIN_PLATFORM');
  dxf.addSolidBox3D(-13000 * s, -43974 * s, 5600 * s, 7000 * s, -43894 * s, 5750 * s, 'ZEMIN_PLATFORM');
  // Yellow Handrails (H = 1000mm)
  dxf.addSolidBox3D(-13000 * s, -44934 * s, 6730 * s, 7000 * s, -44914 * s, 6750 * s, 'KORKULUK_KAPI');
  dxf.addSolidBox3D(-13000 * s, -43954 * s, 6730 * s, 7000 * s, -43934 * s, 6750 * s, 'KORKULUK_KAPI');
  for (let x = -12500; x <= 6500; x += 1500) {
    addCylinder3D(dxf, x * s, -44924 * s, 5750 * s, 6750 * s, 20 * s, 'KORKULUK_KAPI');
    addCylinder3D(dxf, x * s, -43944 * s, 5750 * s, 6750 * s, 20 * s, 'KORKULUK_KAPI');
  }

  // ==========================================
  // 5. ÇATI UCU Ø45.7CM TAŞIYICI SİLİNDİRİ (Z = 43.248m, Y = 5.2965m, L = 20m)
  // ==========================================
  addCylinderAlongX3D(dxf, -13000 * s, 7000 * s, -43248 * s, 5296.5 * s, 228.5 * s, 'MONTAJ_BORULARI');

  // Silindir ile kedi yolu arasındaki konsol traversler (her 4m'de bir)
  for (let i = -11000; i <= 5000; i += 4000) {
    dxf.addSolidBox3D((i - 100) * s, -43934 * s, 5500 * s, (i + 100) * s, -43248 * s, 5700 * s, 'CELIK_KIRIS_KOLON');
  }

  // ==========================================
  // 6. SİLİNDİR ÜZERİ ÇEMBER SABİTLEMELİ 3 SET YATAY POI RAFI (Sol, Orta, Sağ)
  // ==========================================
  dxf.addCylinderMountedPoiShelf3D(-2420 * s, -43248 * s, 5296.5 * s, 1, 'SET 1 (SOL POI)');
  dxf.addCylinderMountedPoiShelf3D(-1600 * s, -43248 * s, 5296.5 * s, 2, 'SET 2 (ORTA POI)');
  dxf.addCylinderMountedPoiShelf3D(-780 * s, -43248 * s, 5296.5 * s, 3, 'SET 3 (SAG POI)');

  // ==========================================
  // 7. 45M ÇATI MAKASI ALT ANA BORUSU (Rising at 7.6623°)
  // ==========================================
  const trussSegments = 18;
  for (let i = 0; i < trussSegments; i++) {
    const t1 = i / trussSegments;
    const t2 = (i + 1) / trussSegments;
    const y1 = (1350 + t1 * (-45082 - 1350)) * s;
    const z1 = (4100 + t1 * (10347 - 4100)) * s;
    const y2 = (1350 + t2 * (-45082 - 1350)) * s;
    const z2 = (4100 + t2 * (10347 - 4100)) * s;
    dxf.addLine3d(-3000 * s, y1, z1, -3000 * s, y2, z2, 'MONTAJ_BORULARI');
    // V-strut arms at each station
    dxf.addLine3d(-3000 * s, y1, z1, (-3000 - 1400) * s, y1, z1 + 2650 * s, 'CELIK_KIRIS_KOLON');
    dxf.addLine3d(-3000 * s, y1, z1, (-3000 + 1400) * s, y1, z1 + 2650 * s, 'CELIK_KIRIS_KOLON');
  }

  // 8. 50x15cm Delikli Kablo Tavası (Makas boyunca)
  dxf.addLine3d(-3000 * s, 1350 * s, (4100 + 420) * s, -3000 * s, -41200 * s, (4100 + 420 + 37100 * Math.sin(0.13373)) * s, 'KABLO_TAVALARI');
  dxf.addLine3d((-3000 - 250) * s, 1350 * s, (4100 + 420) * s, (-3000 - 250) * s, -41200 * s, (4100 + 420 + 37100 * Math.sin(0.13373)) * s, 'KABLO_TAVALARI');
  dxf.addLine3d((-3000 + 250) * s, 1350 * s, (4100 + 420) * s, (-3000 + 250) * s, -41200 * s, (4100 + 420 + 37100 * Math.sin(0.13373)) * s, 'KABLO_TAVALARI');

  return dxf.toDxfString();
}

// =========================================================================
// 3. GENERATE 2D PLAN & KESIT FOR ALAN 2 (SCOREBOARD KESİTİ + KEDİ YOLU)
// =========================================================================
function generateAlan2_Scoreboard_2D(units = 'mm') {
  const isMm = units === 'mm';
  const s = isMm ? 1 : 0.001;
  const dxf = new DxfBuilder(units);

  // Register dedicated layers with custom colors
  dxf.addLayer('TAVA_PROFILI', Drawing.ACI.MAGENTA, 'CONTINUOUS');
  dxf.addLayer('TAVA_KONSOL', 9, 'CONTINUOUS');
  dxf.addLayer('DIKEY_KABLO_MERDIVENI', Drawing.ACI.CYAN, 'CONTINUOUS');
  dxf.addLayer('GEMICI_MERDIVENI', Drawing.ACI.YELLOW, 'CONTINUOUS');
  dxf.addLayer('KBL_ENERJI_2X25', Drawing.ACI.BLUE, 'CONTINUOUS');
  dxf.addLayer('KABLO_KLEMENS', Drawing.ACI.RED, 'CONTINUOUS');

  // Dual 50m Cylinders
  dxf.addRect(-25000 * s, (-550 - 750) * s, 50000 * s, 1500 * s, 'MONTAJ_BORULARI');
  dxf.addLine(-25000 * s, -550 * s, 25000 * s, -550 * s, 'MONTAJ_BORULARI');
  dxf.addText(0, -550 * s, 220 * s, 'ARKA TASIYICI DEV BORU (DIA 1500mm, L=50m)', 'MONTAJ_BORULARI', 0, 'center');

  dxf.addRect(-25000 * s, (1670 - 750) * s, 50000 * s, 1500 * s, 'MONTAJ_BORULARI');
  dxf.addLine(-25000 * s, 1670 * s, 25000 * s, 1670 * s, 'MONTAJ_BORULARI');
  dxf.addText(0, 1670 * s, 220 * s, 'ON TASIYICI DEV BORU (DIA 1500mm, L=50m, SKORBORD TARAFI)', 'MONTAJ_BORULARI', 0, 'center');

  // Catwalk (L = 7400, W = 1200)
  dxf.addRect(-3700 * s, 100 * s, 7400 * s, 1200 * s, 'ZEMIN_PLATFORM');
  for (let x = -3500; x <= 3500; x += 500) {
    dxf.addLine(x * s, 100 * s, x * s, 1300 * s, 'ZEMIN_PLATFORM');
  }

  // Scoreboard Screen Line
  dxf.addRect(-6500 * s, 2350 * s, 13000 * s, 125 * s, 'CELIK_KIRIS_KOLON');
  dxf.addText(0, 2600 * s, 240 * s, 'SKORBORD GOVDESI VE EKRAN HATTI (13.0m x 8.0m)', 'CELIK_KIRIS_KOLON', 0, 'center');

  // =========================================================================
  // 1. GEMİCİ MERDİVENİ ÇIKIŞ SAHANLIĞI VE GÜVENLİK KAFESLİ MERDİVEN (PLAN VIEW)
  // =========================================================================
  // Sahanlık çıkıntısı (X = [-1600, -500], Y = [-700, 100])
  dxf.addRect(-1600 * s, -700 * s, 1100 * s, 800 * s, 'ZEMIN_PLATFORM');
  for (let sx = -1500; sx <= -600; sx += 300) {
    dxf.addLine(sx * s, -700 * s, sx * s, 100 * s, 'ZEMIN_PLATFORM');
  }

  // Gemici Merdiveni (X = -1450mm, Y: -600mm ile -100mm arası)
  dxf.addCircle(-1450 * s, -100 * s, 22 * s, 'GEMICI_MERDIVENI');
  dxf.addCircle(-1450 * s, -600 * s, 22 * s, 'GEMICI_MERDIVENI');
  dxf.addLine(-1450 * s, -600 * s, -1450 * s, -100 * s, 'GEMICI_MERDIVENI');
  dxf.addCircle(-1850 * s, -350 * s, 350 * s, 'GEMICI_MERDIVENI');
  dxf.addLine(-1450 * s, -600 * s, -1850 * s, -700 * s, 'GEMICI_MERDIVENI');
  dxf.addLine(-1450 * s, -100 * s, -1850 * s, 0 * s, 'GEMICI_MERDIVENI');
  dxf.addText(-1450 * s, -740 * s, 110 * s, 'GEMICI MERDIVENI (OVAL KORUMA KAFESLI)', 'GEMICI_MERDIVENI', 0, 'center');

  // =========================================================================
  // 2. GEMİCİ MERDİVENİ YANINDA DİKEY KABLO MERDİVENİ (PLAN VIEW)
  // =========================================================================
  dxf.addRect(-1780 * s, -500 * s, 60 * s, 400 * s, 'DIKEY_KABLO_MERDIVENI');
  dxf.addLine(-1780 * s, -500 * s, -1720 * s, -500 * s, 'DIKEY_KABLO_MERDIVENI');
  dxf.addLine(-1780 * s, -100 * s, -1720 * s, -100 * s, 'DIKEY_KABLO_MERDIVENI');
  for (let by = -450; by <= -150; by += 100) {
    dxf.addLine(-1780 * s, by * s, -1720 * s, by * s, 'DIKEY_KABLO_MERDIVENI');
  }
  dxf.addRect(-1720 * s, -320 * s, 120 * s, 40 * s, 'TAVA_KONSOL');
  dxf.addText(-1950 * s, -300 * s, 110 * s, 'DIKEY KABLO MERDIVENI (W=400mm, ALT KEDI YOLUNA INIS)', 'DIKEY_KABLO_MERDIVENI', 0, 'right');

  // =========================================================================
  // 3. ORTADAKİ 60M ÇATI TAŞIYICISI (X = 0) 500MM KABLO TAVASI VE TAVA TAŞIYICILARI (PLAN VIEW)
  // Kullanıcı İsteği: "aslında ortadaki çatı taşıyıcıyı kastediyordum... gemici merdiveninin yanından dikey kablo merdiveni yap ve bunu alt kedi yoluna kadar indir"
  // =========================================================================
  // A) Ortadaki Çatı Taşıyıcı Üzerindeki 500mm Kablo Tavası (X: -250mm ile +250mm arası, Y boyunca uzanır)
  dxf.addRect(-250 * s, -100 * s, 500 * s, 25000 * s, 'TAVA_PROFILI');
  dxf.addLine(-235 * s, -100 * s, -235 * s, 24900 * s, 'TAVA_PROFILI');
  dxf.addLine(235 * s, -100 * s, 235 * s, 24900 * s, 'TAVA_PROFILI');

  // Her 3 metrede bir V-strut travers kaideleri
  for (let ty = 0; ty <= 24000; ty += 3000) {
    dxf.addRect(-330 * s, (ty - 40) * s, 660 * s, 80 * s, 'TAVA_KONSOL');
  }

  // B) Çatı Taşıyıcıdan Gemici Merdiveni Yanına Geçiş Köprü Tavası (X: 0'dan X: -1750mm'ye)
  dxf.addRect(-1750 * s, -350 * s, 1750 * s, 500 * s, 'TAVA_PROFILI');
  dxf.addLine(-1750 * s, -335 * s, 0, -335 * s, 'TAVA_PROFILI');
  dxf.addLine(-1750 * s, 135 * s, 0, 135 * s, 'TAVA_PROFILI');

  [-1750, -1150, -550, 0].forEach(bx => {
    dxf.addRect((bx - 30) * s, -390 * s, 60 * s, 580 * s, 'TAVA_KONSOL');
  });

  // =========================================================================
  // 4. 14 ADET 2x25 mm2 DC ENERJİ KABLOSU İMALATI (PLAN VIEW)
  // =========================================================================
  for (let ci = 0; ci < 14; ci++) {
    const col = ci % 7;
    const cx = -180 + col * 60; // Çatı tavası içinde 7 sütun dizilimi
    // Çatı taşıyıcı tavası boyunca kablolar
    dxf.addLine(cx * s, 24900 * s, cx * s, -50 * s, 'KBL_ENERJI_2X25');

    // Köprü tavası üzerinden geçiş ve Dikey Merdivene (X = -1750) dönüş
    const targetY = -120 - ci * 24;
    dxf.addLine(cx * s, -50 * s, -1700 * s, targetY * s, 'KBL_ENERJI_2X25');
  }

  for (let ty = 1500; ty <= 24000; ty += 3000) {
    dxf.addLine(-220 * s, ty * s, 220 * s, ty * s, 'KABLO_KLEMENS');
  }
  dxf.addText(0, 3500 * s, 120 * s, '14 ADET 2x25mm2 DC ENERJI KABLOSU (ORTADAKI CATI TASIYICI TAVASI BOYUNCA)', 'KBL_ENERJI_2X25', 90, 'center');
  dxf.addText(380 * s, 3500 * s, 110 * s, '500mm AGIR HIZMET CATI MAKASI TAVASI VE TRAVERS KONSOL TASIYICILAR', 'TAVA_PROFILI', 90, 'center');
  dxf.addText(-875 * s, -420 * s, 110 * s, '500mm KOPRU GECIS TAVASI (CATI MAKASINDAN DIKEY MERDIVENE)', 'TAVA_PROFILI', 0, 'center');

  // DRAW ALL DETAILED EQUIPMENT IN ALAN 4 / SCOREBOARD PLAN VIEW
  drawDetailedEquipment2D(dxf, cleanData.alan4, s);

  // Dimensions
  dxf.addDimension(-25000 * s, -1400 * s, 25000 * s, -1400 * s, -800 * s, '50000 mm (50m SILINDIR TASIYICI BOYU)');
  dxf.addDimension(-3700 * s, 0, 3700 * s, 0, -500 * s, '7400 mm (KEDI YOLU BOYU)');
  dxf.addDimension(-6500 * s, 2800 * s, 6500 * s, 2800 * s, 500 * s, '13000 mm (SKORBORD GENISLIGI)');
  dxf.addDimension(-3700 * s, 100 * s, -3700 * s, 1300 * s, -600 * s, '1200 mm');

  // 2D Elevation View for Scoreboard (Y = -8000 mm)
  const elBaseY = -8000 * s;
  dxf.addRect(-25000 * s, elBaseY, 50000 * s, 1500 * s, 'MONTAJ_BORULARI');
  dxf.addText(0, elBaseY + 750 * s, 260 * s, '50m TASIYICI SILINDIR KESITI (DIA 1500mm)', 'MONTAJ_BORULARI', 0, 'center');
  // Scoreboard Screen Frame in Elevation
  dxf.addRect(-6500 * s, elBaseY + 2000 * s, 13000 * s, 8000 * s, 'CELIK_KIRIS_KOLON');
  dxf.addText(0, elBaseY + 6000 * s, 400 * s, 'SKORBORD EKRANI (13.0m x 8.0m)', 'CELIK_KIRIS_KOLON', 0, 'center');

  // 14 Scoreboard RRUs in Elevation along the railing
  const rruXs = [-2700, -2460, -2010, -1800, -1580, -1360, 1360, 1580, 1800, 2010, 2460, 2700];
  rruXs.forEach(rx => {
    let op = 'Vodafone';
    if (Math.abs(rx) > 2400) op = 'Turkcell';
    else if (Math.abs(rx) === 2010) op = 'Türk Telekom';
    dxf.addRRUPoleElevation(rx * s, elBaseY + 1500 * s, 700 * s, [
      { y: 50 * s, operator: op, side: rx > 0 ? 'right' : 'left', width: 380 * s, height: 500 * s }
    ]);
  });

  // =========================================================================
  // ELEVATION DETAYI: ALT KEDİ YOLU, ORTA KEDİ YOLU, GEMİCİ MERDİVENİ,
  // DİKEY KABLO MERDİVENİ VE 14x 2x25mm² KABLO İNİŞ HATTI
  // =========================================================================
  const lowerCatWalkY = elBaseY + 1500 * s;
  const upperCatWalkY = elBaseY + 9000 * s; // 7500mm yükseklikte üst/orta kedi yolu kotu

  // 1. Alt Kedi Yolu Platformu Kesiti
  dxf.addRect(-3700 * s, lowerCatWalkY - 120 * s, 7400 * s, 120 * s, 'ZEMIN_PLATFORM');
  dxf.addText(-200 * s, lowerCatWalkY - 60 * s, 120 * s, 'ALT KEDI YOLU TABANI (KOT: +20.00m)', 'ZEMIN_PLATFORM', 0, 'center');

  // 2. Üst / Orta Kedi Yolu Platformu Kesiti
  dxf.addRect(-3700 * s, upperCatWalkY - 120 * s, 7400 * s, 120 * s, 'ZEMIN_PLATFORM');
  dxf.addText(-200 * s, upperCatWalkY + 40 * s, 120 * s, 'ORTA / UST KEDI YOLU TABANI (KOT: +27.50m)', 'ZEMIN_PLATFORM', 0, 'center');

  // Korkuluklar
  dxf.addLine(-3700 * s, upperCatWalkY + 1100 * s, 3700 * s, upperCatWalkY + 1100 * s, 'KORKULUK_KAPI');
  dxf.addLine(-3700 * s, lowerCatWalkY + 1100 * s, 3700 * s, lowerCatWalkY + 1100 * s, 'KORKULUK_KAPI');

  // 3. Gemici Merdiveni (X = -1450mm, lowerCatWalkY -> upperCatWalkY, H = 7500mm)
  dxf.addLine(-1470 * s, lowerCatWalkY, -1470 * s, upperCatWalkY + 1100 * s, 'GEMICI_MERDIVENI');
  dxf.addLine(-1430 * s, lowerCatWalkY, -1430 * s, upperCatWalkY + 1100 * s, 'GEMICI_MERDIVENI');
  for (let ry = 280; ry <= 7450; ry += 280) {
    dxf.addLine(-1470 * s, lowerCatWalkY + ry * s, -1430 * s, lowerCatWalkY + ry * s, 'GEMICI_MERDIVENI');
  }
  for (let hy = 2200; hy <= 8500; hy += 900) {
    dxf.addRect(-1580 * s, lowerCatWalkY + hy * s, 260 * s, 30 * s, 'GEMICI_MERDIVENI');
  }
  dxf.addText(-1450 * s, upperCatWalkY + 1250 * s, 130 * s, 'GEMICI MERDIVENI', 'GEMICI_MERDIVENI', 0, 'center');

  // 4. Dikey Kablo Merdiveni (X = -1750mm, W = 400mm, lowerCatWalkY -> upperCatWalkY + 150mm)
  const vLadX = -1750 * s;
  const vLadW = 400 * s;
  dxf.addLine(vLadX - vLadW / 2, lowerCatWalkY, vLadX - vLadW / 2, upperCatWalkY + 150 * s, 'DIKEY_KABLO_MERDIVENI');
  dxf.addLine(vLadX + vLadW / 2, lowerCatWalkY, vLadX + vLadW / 2, upperCatWalkY + 150 * s, 'DIKEY_KABLO_MERDIVENI');
  for (let ry = 150; ry <= 7500; ry += 300) {
    dxf.addLine(vLadX - vLadW / 2, lowerCatWalkY + ry * s, vLadX + vLadW / 2, lowerCatWalkY + ry * s, 'DIKEY_KABLO_MERDIVENI');
  }
  for (let sy = 500; sy <= 7000; sy += 1500) {
    dxf.addRect(vLadX + vLadW / 2, lowerCatWalkY + (sy - 20) * s, 120 * s, 40 * s, 'TAVA_KONSOL');
  }

  // 5. Ortadaki Çatı Taşıyıcı ve Geçiş Köprü Tavası (Y = upperCatWalkY + 150mm)
  dxf.addRect(-250 * s, upperCatWalkY + 150 * s, 500 * s, 150 * s, 'TAVA_PROFILI');
  dxf.addText(0, upperCatWalkY + 330 * s, 120 * s, 'ORTADAKI CATI TASIYICISI 500mm KABLO TAVASI KESITI', 'TAVA_PROFILI', 0, 'center');

  dxf.addRect(vLadX, upperCatWalkY + 150 * s, (0 - vLadX), 120 * s, 'TAVA_PROFILI');
  dxf.addText(vLadX + 850 * s, upperCatWalkY + 180 * s, 100 * s, '500mm GECIS KOPRU TAVASI', 'TAVA_PROFILI', 0, 'center');

  // 6. 14 Adet 2x25 mm2 DC Kablo İniş Hattı
  for (let ci = 0; ci < 14; ci++) {
    const kx = vLadX - vLadW / 2 + 30 * s + ci * 26 * s;
    dxf.addLine(0, upperCatWalkY + 200 * s, kx, upperCatWalkY + 150 * s, 'KBL_ENERJI_2X25');
    dxf.addLine(kx, upperCatWalkY + 150 * s, kx, lowerCatWalkY + 60 * s, 'KBL_ENERJI_2X25');
    dxf.addLine(kx, lowerCatWalkY + 60 * s, kx + 180 * s, lowerCatWalkY + 10 * s, 'KBL_ENERJI_2X25');
  }

  for (let ky = 600; ky <= 7200; ky += 600) {
    dxf.addLine(vLadX - vLadW / 2 + 15 * s, lowerCatWalkY + ky * s, vLadX + vLadW / 2 - 15 * s, lowerCatWalkY + ky * s, 'KABLO_KLEMENS');
  }

  dxf.addDimension(vLadX - vLadW / 2 - 250 * s, lowerCatWalkY, vLadX - vLadW / 2 - 250 * s, upperCatWalkY, -300 * s, '7500 mm (DUSEY KABLO INIS FARKI)');
  dxf.addDimension(vLadX - vLadW / 2, lowerCatWalkY - 150 * s, vLadX + vLadW / 2, lowerCatWalkY - 150 * s, -100 * s, '400 mm');

  dxf.addText(vLadX, lowerCatWalkY + 4000 * s, 140 * s, 'DIKEY KABLO MERDIVENI (14 ADET 2x25mm2 KABLO INISI)', 'METIN_BILGI', 90, 'center');

  addTitleBlock(dxf, 'SCOREBOARD KESITI VE KEDI YOLU (DETAYLI YERLESIM)', 'ALAN 2', isMm ? '1:1 mm' : '1:1 m', units, -15000 * s, 4500 * s);

  const bom = [
    { name: 'Turkcell RRU Tek Tek Moduller (Skorbord/Yanlar)', dim: '398x145x533 mm', qty: 12 },
    { name: 'Vodafone RRU Tek Tek Moduller (Skorbord/Yanlar)', dim: '432x135x480 mm', qty: 28 },
    { name: 'Turk Telekom RRU Tek Tek Moduller (Skorbord/Yanlar)', dim: '356x140x480 mm', qty: 16 },
    { name: 'Canovate 19" POI Rack Tasiyici Saseleri', dim: '600x700x1480 mm', qty: 8 },
    { name: 'Prose CB-12-POI-64F-A12 Modulleri', dim: '400x350x260 mm', qty: 32 },
    { name: 'Eltek 20U Rectifier (Kapak/Kilit/Sogutucu)', dim: '680x710x1300 mm', qty: 6 },
    { name: 'MTS9304A 12U Rectifier (Kapak/Panjur)', dim: '690x720x1250 mm', qty: 3 },
    { name: 'Matsing 4-Beam Kure Antenler (45 Egimli/Asili)', dim: '617x721x1635 mm', qty: 6 },
    { name: 'Tabla-2 Celik Montaj Tablalari (11-Boru)', dim: '1500x1200x50 mm', qty: 4 },
    { name: '500mm Agir Hizmet Tipi Kablo Tavasi (TS EN 61537)', dim: '500x150x2.0 mm', qty: '62 m' },
    { name: 'Dikey Kablo Merdiveni (C-Ray Tasiyicili, Askili)', dim: '450x70 mm (H=7.6m)', qty: '1 Adet' },
    { name: '2x25 mm2 DC Enerji Besleme Kablosu (Halojen Free)', dim: 'OD 21 mm (Bakir Cok Telli)', qty: '950 m (14 Hat)' },
    { name: 'Paslanmaz / Poliamid Ciftli Kablo Klemensleri', dim: '21 mm Cap Uyumlu', qty: '112 Adet' }
  ];
  addBomTable(dxf, bom, -4000 * s, 4000 * s, units);

  return dxf.toDxfString();
}

// =========================================================================
// 4. GENERATE 3D MODEL FOR ALAN 2 (SCOREBOARD KESİTİ + KEDİ YOLU)
// =========================================================================
function generateAlan2_Scoreboard_3D(units = 'mm') {
  const isMm = units === 'mm';
  const s = isMm ? 1 : 0.001;
  const dxf = new DxfBuilder(units);

  // Register dedicated layers
  dxf.addLayer('TAVA_PROFILI', Drawing.ACI.MAGENTA, 'CONTINUOUS');
  dxf.addLayer('TAVA_KONSOL', 9, 'CONTINUOUS');
  dxf.addLayer('DIKEY_KABLO_MERDIVENI', Drawing.ACI.CYAN, 'CONTINUOUS');
  dxf.addLayer('GEMICI_MERDIVENI', Drawing.ACI.YELLOW, 'CONTINUOUS');
  dxf.addLayer('KBL_ENERJI_2X25', Drawing.ACI.BLUE, 'CONTINUOUS');
  dxf.addLayer('KABLO_KLEMENS', Drawing.ACI.RED, 'CONTINUOUS');

  // Dual 50m Cylinders
  dxf.addSolidBox3D(-25000 * s, (-550 - 750) * s, (-950 - 750) * s, 25000 * s, (-550 + 750) * s, (-950 + 750) * s, 'MONTAJ_BORULARI');
  dxf.addSolidBox3D(-25000 * s, (1670 - 750) * s, (-950 - 750) * s, 25000 * s, (1670 + 750) * s, (-950 + 750) * s, 'MONTAJ_BORULARI');

  // Lower Catwalk (L = 7400, W = 1200, Z = 0)
  dxf.addSolidBox3D(-3700 * s, 100 * s, -50 * s, 3700 * s, 1300 * s, 0, 'ZEMIN_PLATFORM');
  // Lower Catwalk Landing Extension
  dxf.addSolidBox3D(-1600 * s, -700 * s, -50 * s, -500 * s, 100 * s, 0, 'ZEMIN_PLATFORM');

  // Upper / Middle Catwalk (Z = 7500mm, L = 7400, W = 1200)
  dxf.addSolidBox3D(-3700 * s, 100 * s, 7450 * s, 3700 * s, 1300 * s, 7500 * s, 'ZEMIN_PLATFORM');
  dxf.addSolidBox3D(-1600 * s, -700 * s, 7450 * s, -500 * s, 100 * s, 7500 * s, 'ZEMIN_PLATFORM');

  // Scoreboard Steel Box
  dxf.addSolidBox3D(-6500 * s, 2350 * s, 2000 * s, 6500 * s, 2475 * s, 10000 * s, 'CELIK_KIRIS_KOLON');

  // Maintenance Catwalks
  dxf.addSolidBox3D(-6500 * s, 1800 * s, 3500 * s, 6500 * s, 2300 * s, 3550 * s, 'ZEMIN_PLATFORM');
  dxf.addSolidBox3D(-6500 * s, 1800 * s, 7000 * s, 6500 * s, 2300 * s, 7050 * s, 'ZEMIN_PLATFORM');

  // Concrete Ground Area
  dxf.addSolidBox3D(-2500 * s, -5000 * s, -1200 * s, 2500 * s, -3000 * s, -800 * s, 'ZEMIN_PLATFORM');

  // =========================================================================
  // 3D GEMİCİ MERDİVENİ (X = -1450mm, Z = 0'dan 7500'e kadar)
  // =========================================================================
  dxf.addSolidBox3D(-1470 * s, -120 * s, 0, -1430 * s, -80 * s, 8600 * s, 'GEMICI_MERDIVENI');
  dxf.addSolidBox3D(-1470 * s, -620 * s, 0, -1430 * s, -580 * s, 8600 * s, 'GEMICI_MERDIVENI');
  for (let rz = 280; rz <= 7500; rz += 280) {
    dxf.addSolidBox3D(-1460 * s, -580 * s, (rz - 12) * s, -1440 * s, -120 * s, (rz + 12) * s, 'GEMICI_MERDIVENI');
  }
  for (let hz = 2200; hz <= 8500; hz += 900) {
    dxf.addSolidBox3D(-1850 * s, -650 * s, hz * s, -1450 * s, -50 * s, (hz + 30) * s, 'GEMICI_MERDIVENI');
  }

  // =========================================================================
  // 3D DİKEY KABLO MERDİVENİ (X = -1750mm, W = 400mm, Z = 50'den 7650'ye kadar)
  // =========================================================================
  const v3dLadX = -1750 * s;
  const v3dY1 = -500 * s;
  const v3dY2 = -100 * s;
  dxf.addSolidBox3D((v3dLadX - 15 * s), v3dY1 - 25 * s, 50 * s, (v3dLadX + 15 * s), v3dY1 + 25 * s, 7650 * s, 'DIKEY_KABLO_MERDIVENI');
  dxf.addSolidBox3D((v3dLadX - 15 * s), v3dY2 - 25 * s, 50 * s, (v3dLadX + 15 * s), v3dY2 + 25 * s, 7650 * s, 'DIKEY_KABLO_MERDIVENI');
  for (let rz = 150; rz <= 7650; rz += 300) {
    dxf.addSolidBox3D((v3dLadX - 12 * s), v3dY1, (rz - 10) * s, (v3dLadX + 12 * s), v3dY2, (rz + 10) * s, 'DIKEY_KABLO_MERDIVENI');
  }
  for (let sz = 500; sz <= 7000; sz += 1500) {
    dxf.addSolidBox3D(v3dLadX, v3dY2, (sz - 20) * s, (v3dLadX + 150 * s), v3dY2 + 40 * s, (sz + 20) * s, 'TAVA_KONSOL');
  }

  // =========================================================================
  // 3D ORTADAKİ 60M ÇATI TAŞIYICISI (X = 0) 500MM KABLO TAVASI VE TAVA TAŞIYICILARI
  // Kullanıcı İsteği: "aslında ortadaki çatı taşıyıcıyı kastediyordum... gemici merdiveninin yanından dikey kablo merdiveni yap ve bunu alt kedi yoluna kadar indir"
  // =========================================================================
  const tray3dZ = 7650 * s;

  // A) Ortadaki Çatı Taşıyıcı Üzerindeki 500mm Ağır Hizmet Tavası (X: -250mm ile +250mm arası, Y boyunca uzanır)
  dxf.addSolidBox3D(-250 * s, -100 * s, tray3dZ, 250 * s, 35000 * s, tray3dZ + 3 * s, 'TAVA_PROFILI');
  dxf.addSolidBox3D(-250 * s, -100 * s, tray3dZ, -247 * s, 35000 * s, tray3dZ + 150 * s, 'TAVA_PROFILI');
  dxf.addSolidBox3D(247 * s, -100 * s, tray3dZ, 250 * s, 35000 * s, tray3dZ + 150 * s, 'TAVA_PROFILI');

  // Her 3 metrede bir V-Strut Travers Kaideleri
  for (let ty = 0; ty <= 33000; ty += 3000) {
    dxf.addSolidBox3D(-330 * s, (ty - 40) * s, tray3dZ - 50 * s, 330 * s, (ty + 40) * s, tray3dZ, 'TAVA_KONSOL');
    dxf.addSolidBox3D(-260 * s, (ty - 30) * s, tray3dZ, 260 * s, (ty + 30) * s, tray3dZ + 25 * s, 'TAVA_KONSOL');
  }

  // B) Çatı Taşıyıcıdan Gemici Merdiveni Yanına Geçiş Köprü Tavası (X: 0'dan X: -1750mm'ye)
  dxf.addSolidBox3D(-1750 * s, -350 * s, tray3dZ, 0, 150 * s, tray3dZ + 3 * s, 'TAVA_PROFILI');
  dxf.addSolidBox3D(-1750 * s, -350 * s, tray3dZ, 0, -347 * s, tray3dZ + 150 * s, 'TAVA_PROFILI');
  dxf.addSolidBox3D(-1750 * s, 147 * s, tray3dZ, 0, 150 * s, tray3dZ + 150 * s, 'TAVA_PROFILI');

  [-1750, -1150, -550, 0].forEach(bx => {
    dxf.addSolidBox3D((bx - 30) * s, -390 * s, tray3dZ - 35 * s, (bx + 30) * s, 190 * s, tray3dZ, 'TAVA_KONSOL');
  });

  // =========================================================================
  // 3D 14 ADET 2x25 mm2 DC ENERJİ KABLOSU İMALATI
  // =========================================================================
  for (let ci = 0; ci < 14; ci++) {
    const col = ci % 7;
    const tier = Math.floor(ci / 7);
    const cabX = (-180 + col * 60) * s;
    const cabZ_Truss = tray3dZ + (20 + tier * 30) * s;

    const vCabY = v3dY1 + (30 + col * 55) * s;
    const vCabX = (v3dLadX - 15 * s - tier * 24 * s);

    // 1. Ortadaki Çatı Taşıyıcı Tavası Boyunca Uzanan Kablolar
    dxf.addSolidBox3D(cabX - 10 * s, -100 * s, cabZ_Truss - 10 * s, cabX + 10 * s, 35000 * s, cabZ_Truss + 10 * s, 'KBL_ENERJI_2X25');

    // 2. Köprü Tavasından Dikey Kablo Merdivenine Geçiş
    dxf.addSolidBox3D(-1700 * s, vCabY - 10 * s, tray3dZ - 50 * s, cabX + 10 * s, -50 * s, cabZ_Truss + 10 * s, 'KBL_ENERJI_2X25');

    // 3. Dikey Merdiven Boyunca Kesintisiz İnen Kablo (7.6 metre boyunda)
    dxf.addSolidBox3D(vCabX - 10 * s, vCabY - 10 * s, 60 * s, vCabX + 10 * s, vCabY + 10 * s, tray3dZ - 50 * s, 'KBL_ENERJI_2X25');

    // 4. Alt Kedi Yolu Çıkış Dirseği
    dxf.addSolidBox3D(vCabX, vCabY - 10 * s, 20 * s, (vCabX + 300 * s), vCabY + 10 * s, 60 * s, 'KBL_ENERJI_2X25');
  }

  // Dikey Kablo Kelepçeleri (Cleats)
  for (let kz = 600; kz <= 7200; kz += 600) {
    dxf.addSolidBox3D((v3dLadX - 35 * s), v3dY1 + 10 * s, kz * s, (v3dLadX + 5 * s), v3dY2 - 10 * s, (kz + 30) * s, 'KABLO_KLEMENS');
  }

  // DRAW ALL DETAILED EQUIPMENT IN 3D (The user's benchmark)
  drawDetailedEquipment3D(dxf, cleanData.alan4, s);

  return dxf.toDxfString();
}

// =========================================================================
// 5. GENERATE 2D PLAN & KESIT FOR ALAN 4 (ÇAPRAZ KÖŞE TRİBÜN)
// =========================================================================
function generateAlan4_Kose_2D(units = 'mm') {
  const isMm = units === 'mm';
  const s = isMm ? 1 : 0.001;
  const dxf = new DxfBuilder(units);

  // Walkway (25000 x 2000 mm)
  dxf.addRect(-12500 * s, 0, 25000 * s, 2000 * s, 'ZEMIN_PLATFORM');
  for (let x = -12000; x <= 12000; x += 1000) {
    dxf.addLine(x * s, 0, x * s, 2000 * s, 'ZEMIN_PLATFORM');
  }

  // 2.50m Enclosure
  dxf.addRect(-4300 * s, 50 * s, 2500 * s, 1900 * s, 'KORKULUK_KAPI');
  dxf.addRect(-4150 * s, 40 * s, 1100 * s, 25 * s, 'KORKULUK_KAPI');
  dxf.addRect(-3050 * s, 70 * s, 1100 * s, 25 * s, 'KORKULUK_KAPI');
  dxf.addText(-3050 * s, 1000 * s, 160 * s, '2.50m OZEL KORUMALI ALAN (110cm KAYAR KAPILAR)', 'KORKULUK_KAPI', 0, 'center');

  dxf.addLine(-12500 * s, 50 * s, -4300 * s, 50 * s, 'KORKULUK_KAPI');
  dxf.addLine(-1800 * s, 50 * s, 12500 * s, 50 * s, 'KORKULUK_KAPI');
  dxf.addLine(-12500 * s, 1950 * s, -4300 * s, 1950 * s, 'KORKULUK_KAPI');
  dxf.addLine(-1800 * s, 1950 * s, 12500 * s, 1950 * s, 'KORKULUK_KAPI');

  [-10000, -5000, 0, 5000, 10000].forEach(cx => {
    dxf.addCircle(cx * s, 1350 * s, 200 * s, 'MONTAJ_BORULARI');
    dxf.addCircle(cx * s, 1350 * s, 270 * s, 'MONTAJ_BORULARI');
  });

  // DRAW DETAILED EQUIPMENT (Spot beam antennas, 7 RRUs, POI modules, Rack)
  drawDetailedEquipment2D(dxf, cleanData.alan3, s);

  // Dimensions
  dxf.addDimension(-12500 * s, 0, 12500 * s, 0, -1000 * s, '25000 mm (TOPLAM BETON KAIDE BOYU)');
  dxf.addDimension(-4300 * s, 0, -1800 * s, 0, -500 * s, '2500 mm (KORUMALI ALAN)');
  dxf.addDimension(-4150 * s, 0, -3050 * s, 0, -250 * s, '1100 mm (KAPI 1)');
  dxf.addDimension(-3050 * s, 0, -1950 * s, 0, -250 * s, '1100 mm (KAPI 2)');
  dxf.addDimension(-12500 * s, 0, -12500 * s, 2000 * s, -600 * s, '2000 mm');

  // Elevation View
  const elBaseY = -6000 * s;
  dxf.addRect(-12500 * s, elBaseY - 400 * s, 25000 * s, 400 * s, 'ZEMIN_PLATFORM');
  dxf.addLine(-12500 * s, elBaseY, 12500 * s, elBaseY, 'ZEMIN_PLATFORM');
  dxf.addLine(-12500 * s, elBaseY + 1100 * s, 12500 * s, elBaseY + 1100 * s, 'KORKULUK_KAPI');
  dxf.addRect(-4300 * s, elBaseY, 2500 * s, 1700 * s, 'KORKULUK_KAPI');
  // Equipment in Elevation
  dxf.addPoiRackElevation(-3720 * s, elBaseY, 600 * s, 1000 * s, 2, '2x POI RACK');
  dxf.addRRUPoleElevation(-2400 * s, elBaseY, 1700 * s, [
    { y: 600 * s, operator: 'Turkcell', side: 'left', width: 380 * s, height: 480 * s },
    { y: 1380 * s, operator: 'Vodafone', side: 'left', width: 380 * s, height: 480 * s }
  ]);

  addTitleBlock(dxf, 'CAPRAZ KOSE TRIBUN (DETAYLI YERLESIM)', 'ALAN 4', isMm ? '1:1 mm' : '1:1 m', units, -12500 * s, 3500 * s);

  const bom = [
    { name: 'Beton Kaide Tablasi (Alan 4)', dim: '25000x2000x400 mm', qty: 1 },
    { name: '2.50m Korumali Panel ve Kayar Kapi', dim: '2500x1700 mm', qty: 1 },
    { name: 'Canovate 19" 2\'li POI Kucuk Rack Sasesi', dim: '600x700x1000 mm', qty: 1 },
    { name: 'Prose CB-12-POI-64F-A12 Modulleri', dim: '400x350x260 mm', qty: 2 },
    { name: 'Tek Tek RRU Modulleri (7 Adet Bagimsiz)', dim: '398x145x533 mm', qty: 7 },
    { name: 'Spot Beam 30/30 Panel Antenler ve Askilari', dim: '990x1130x2810 mm', qty: 2 }
  ];
  addBomTable(dxf, bom, -3000 * s, 3200 * s, units);

  return dxf.toDxfString();
}

// =========================================================================
// 6. GENERATE 3D MODEL FOR ALAN 4 (ÇAPRAZ KÖŞE TRİBÜN)
// =========================================================================
function generateAlan4_Kose_3D(units = 'mm') {
  const isMm = units === 'mm';
  const s = isMm ? 1 : 0.001;
  const dxf = new DxfBuilder(units);

  // Catwalk Base Box
  dxf.addSolidBox3D(-12500 * s, 0, -400 * s, 12500 * s, 2000 * s, 0, 'ZEMIN_PLATFORM');

  // Railing
  dxf.addSolidBox3D(-12500 * s, 40 * s, 0, -4300 * s, 60 * s, 1100 * s, 'KORKULUK_KAPI');
  dxf.addSolidBox3D(-1800 * s, 40 * s, 0, 12500 * s, 60 * s, 1100 * s, 'KORKULUK_KAPI');
  dxf.addSolidBox3D(-12500 * s, 1940 * s, 0, -4300 * s, 1960 * s, 1100 * s, 'KORKULUK_KAPI');
  dxf.addSolidBox3D(-1800 * s, 1940 * s, 0, 12500 * s, 1960 * s, 1100 * s, 'KORKULUK_KAPI');

  // 2.5m Enclosure
  dxf.addSolidBox3D(-4300 * s, 1940 * s, 0, -1800 * s, 1960 * s, 1700 * s, 'KORKULUK_KAPI');
  dxf.addSolidBox3D(-4300 * s, 40 * s, 0, -4280 * s, 1960 * s, 1700 * s, 'KORKULUK_KAPI');
  dxf.addSolidBox3D(-1820 * s, 40 * s, 0, -1800 * s, 1960 * s, 1700 * s, 'KORKULUK_KAPI');

  // 2 Sliding Doors
  dxf.addSolidBox3D(-4150 * s, 30 * s, 20 * s, -3050 * s, 50 * s, 1680 * s, 'KORKULUK_KAPI');
  dxf.addSolidBox3D(-3050 * s, 60 * s, 20 * s, -1950 * s, 80 * s, 1680 * s, 'KORKULUK_KAPI');

  // Columns
  [-10000, -5000, 0, 5000, 10000].forEach(cx => {
    addCylinder3D(dxf, cx * s, 1350 * s, 0, 4300 * s, 200 * s, 'MONTAJ_BORULARI');
  });

  // 4 Vertical mounting pipes for the 7-RRU group
  [-2620, -2460, -2300, -2140].forEach(px => {
    addCylinder3D(dxf, px * s, 1240 * s, 0, 1750 * s, 25 * s, 'MONTAJ_BORULARI');
    dxf.addSolidBox3D((px - 70) * s, (1240 - 70) * s, 0, (px + 70) * s, (1240 + 70) * s, 15 * s, 'MONTAJ_BORULARI');
  });

  // DRAW DETAILED EQUIPMENT IN 3D
  drawDetailedEquipment3D(dxf, cleanData.alan3, s);

  return dxf.toDxfString();
}

// =========================================================================
// 7. GENERATE 2D DETAIL FOR ALAN 1 (ÖZEL 7 BORULU KARMA KOMPLEKS)
// =========================================================================
function generateAlan1_7Boru_Detail_2D(units = 'mm') {
  const isMm = units === 'mm';
  const s = isMm ? 1 : 0.001;
  const dxf = new DxfBuilder(units);

  dxf.addText(0, 2400 * s, 180 * s, 'ALAN 1 OZEL 7 BORULU TEK CEPHE KOMPLEKS (13 RRU + 10 POI + 140cm PLATFORM)', 'METIN_BILGI', 0, 'center');

  // 140cm Platform Tabla in Plan
  dxf.addTabla2D(-1300 * s, -700 * s, 2600 * s, 1400 * s, '140cm KEDI YOLU TABLASI');

  // 7 Vertical Mounting Pipes in Plan
  const pipePitch = 180;
  for (let i = -3; i <= 3; i++) {
    const pz = i * pipePitch;
    const px = -800;
    dxf.addCircle(px * s, pz * s, 25 * s, 'MONTAJ_BORULARI');
    dxf.addRect((px - 80) * s, (pz - 80) * s, 160 * s, 160 * s, 'MONTAJ_BORULARI');
    dxf.addText(px * s, (pz - 120) * s, 70 * s, `POL ${i + 4}`, 'MONTAJ_BORULARI', 0, 'center');
  }

  // Draw detailed items of Alan 1 (13 individual RRUs, 2 POI racks, 10 POI modules)
  drawDetailedEquipment2D(dxf, cleanData.alan1, s);

  // Elevation View below
  const elBaseY = -3500 * s;
  dxf.addRect(-1300 * s, elBaseY - 100 * s, 2600 * s, 100 * s, 'BLOK_OZEL_PLATFORM');
  for (let i = -3; i <= 3; i++) {
    const px = -800 + (i + 3) * 260;
    dxf.addRRUPoleElevation(px * s, elBaseY, 1850 * s, [
      { y: 750 * s, operator: i < 0 ? 'Turkcell' : 'Türk Telekom', side: 'right', width: 350 * s, height: 480 * s },
      { y: 1450 * s, operator: 'Vodafone', side: 'right', width: 350 * s, height: 480 * s }
    ]);
  }
  // 2 POI racks in elevation
  dxf.addPoiRackElevation(200 * s, elBaseY, 600 * s, 1780 * s, 5, '36U POI #1');
  dxf.addPoiRackElevation(900 * s, elBaseY, 600 * s, 1780 * s, 5, '36U POI #2');

  // Dimensions
  dxf.addDimension(-1300 * s, -700 * s, 1300 * s, -700 * s, -400 * s, '2600 mm (PLATFORM GENISLIGI)');
  dxf.addDimension(-1300 * s, -700 * s, -1300 * s, 700 * s, -400 * s, '1400 mm (PLATFORM DERINLIGI)');
  dxf.addDimension(-1300 * s, elBaseY, -1300 * s, elBaseY + 1850 * s, -400 * s, '1850 mm (BORU BOYU)');

  addTitleBlock(dxf, 'OZEL 7 BORULU KARMA KOMPLEKS DETAYI', 'ALAN 1', isMm ? '1:1 mm' : '1:1 m', units, -1500 * s, 2600 * s);

  const bom = [
    { name: 'Tek Tek Turkcell RRU (Alt Kot)', dim: '398x145x533 mm', qty: 4 },
    { name: 'Tek Tek Vodafone RRU (Ust Kot)', dim: '432x135x480 mm', qty: 5 },
    { name: 'Tek Tek Turk Telekom RRU (Alt/Ust Kot)', dim: '356x140x480 mm', qty: 4 },
    { name: 'Canovate 19" 36U POI Rack Tasiyici Sase', dim: '600x700x1780 mm', qty: 2 },
    { name: 'Prose CB-12-POI-64F-A12 Modulleri', dim: '400x350x260 mm', qty: 10 },
    { name: 'RRU Saha Blok 140cm Celik Tabla', dim: '2600x1400x50 mm', qty: 1 },
    { name: 'Dia 50mm Flanşlı Boru Polleri (H=1.85m)', dim: 'Dia 50mm x 1850mm', qty: 7 }
  ];
  addBomTable(dxf, bom, -1500 * s, -2200 * s, units);

  return dxf.toDxfString();
}

// =========================================================================
// 8. GENERATE 3D MODEL FOR ALAN 1 (ÖZEL 7 BORULU KARMA KOMPLEKS)
// =========================================================================
function generateAlan1_7Boru_Detail_3D(units = 'mm') {
  const isMm = units === 'mm';
  const s = isMm ? 1 : 0.001;
  const dxf = new DxfBuilder(units);

  // 1. 140cm Platform base box
  dxf.addSolidBox3D(-1300 * s, -700 * s, -50 * s, 1300 * s, 700 * s, 0, 'BLOK_OZEL_PLATFORM');

  // 2. 7 Vertical mounting pipes
  const pipePitch = 180;
  for (let i = -3; i <= 3; i++) {
    const pz = i * pipePitch;
    const px = -800;
    addCylinder3D(dxf, px * s, pz * s, 0, 1850 * s, 25 * s, 'MONTAJ_BORULARI');
    dxf.addSolidBox3D((px - 80) * s, (pz - 80) * s, 0, (px + 80) * s, (pz + 80) * s, 15 * s, 'MONTAJ_BORULARI');
  }

  // Horizontal tie pipes
  [750, 1450].forEach(hy => {
    dxf.addSolidBox3D(-820 * s, (-3 * pipePitch - 50) * s, (hy - 20) * s, -780 * s, (3 * pipePitch + 50) * s, (hy + 20) * s, 'MONTAJ_BORULARI');
  });

  // 3. Draw detailed equipment of Alan 1 (13 individual RRUs, 2 POI racks, 10 POI modules)
  drawDetailedEquipment3D(dxf, cleanData.alan1, s);

  return dxf.toDxfString();
}

// =========================================================================
// 9. GENERATE STADIUM CATWALK RING FROM SEYRANTEPE DXF DATA
// =========================================================================
function generateStadiumCatwalkRing(units = 'mm') {
  const isMm = units === 'mm';
  const dxf = new DxfBuilder(units);

  const htmlPath = path.join(__dirname, 'kedi_yolu_taslak.html');
  if (!fs.existsSync(htmlPath)) return null;

  const content = fs.readFileSync(htmlPath, 'utf8');
  const pathRegex = /<path d='([^']+)'/g;
  let match;
  let pathCount = 0;

  const svgScale = isMm ? 85.0 : 0.085;
  const offsetX = isMm ? -50000 : -50;
  const offsetY = isMm ? -40000 : -40;

  while ((match = pathRegex.exec(content)) !== null) {
    pathCount++;
    const dStr = match[1];
    const cmds = dStr.match(/([MLCZ])\s*([^MLCZ]*)/gi);
    if (!cmds) continue;

    let curX = 0, curY = 0;
    cmds.forEach(cmd => {
      const type = cmd[0].toUpperCase();
      const coords = cmd.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));

      if (type === 'M' && coords.length >= 2) {
        curX = coords[0] * svgScale + offsetX;
        curY = -(coords[1] * svgScale + offsetY);
      } else if (type === 'L' && coords.length >= 2) {
        for (let i = 0; i < coords.length; i += 2) {
          const nextX = coords[i] * svgScale + offsetX;
          const nextY = -(coords[i + 1] * svgScale + offsetY);
          dxf.addLine(curX, curY, nextX, nextY, 'ZEMIN_PLATFORM');
          curX = nextX;
          curY = nextY;
        }
      }
    });
  }

  // Markers
  dxf.addCircle(0, 85000 * (isMm ? 1 : 0.001), 3000 * (isMm ? 1 : 0.001), 'METIN_BILGI');
  dxf.addText(0, 85000 * (isMm ? 1 : 0.001), 1800 * (isMm ? 1 : 0.001), 'ALAN 1 & 3: MARATON', 'METIN_BILGI', 0, 'center');

  dxf.addCircle(-110000 * (isMm ? 1 : 0.001), 0, 3000 * (isMm ? 1 : 0.001), 'METIN_BILGI');
  dxf.addText(-110000 * (isMm ? 1 : 0.001), 0, 1800 * (isMm ? 1 : 0.001), 'ALAN 2: SCOREBOARD', 'METIN_BILGI', 0, 'center');

  dxf.addCircle(-80000 * (isMm ? 1 : 0.001), -60000 * (isMm ? 1 : 0.001), 3000 * (isMm ? 1 : 0.001), 'METIN_BILGI');
  dxf.addText(-80000 * (isMm ? 1 : 0.001), -60000 * (isMm ? 1 : 0.001), 1800 * (isMm ? 1 : 0.001), 'ALAN 4: CAPRAZ KOSE', 'METIN_BILGI', 0, 'center');

  addTitleBlock(dxf, 'SEYRANTEPE STADYUMU GENEL KEDI YOLU CATI RING HATTI', 'GENEL VAZIYET', isMm ? '1:1 mm' : '1:1 m', units, -150000 * (isMm ? 1 : 0.001), -120000 * (isMm ? 1 : 0.001));

  return dxf.toDxfString();
}

// =========================================================================
// MASTER RUNNER: GENERATE BOTH MM AND METER FILES
// =========================================================================
const tasks = [
  { name: '01_ALAN_1_ve_3_Maraton_Tribunu_2D_Plan_ve_Kesit', fn: generateAlan1_3_2D },
  { name: '01_ALAN_1_ve_3_Maraton_Tribunu_3D_Model', fn: generateAlan1_3_3D },
  { name: '02_ALAN_2_Scoreboard_Kesiti_2D_Plan_ve_Kesit', fn: generateAlan2_Scoreboard_2D },
  { name: '02_ALAN_2_Scoreboard_Kesiti_3D_Model', fn: generateAlan2_Scoreboard_3D },
  { name: '03_ALAN_4_Capraz_Kose_Tribun_2D_Plan_ve_Kesit', fn: generateAlan4_Kose_2D },
  { name: '03_ALAN_4_Capraz_Kose_Tribun_3D_Model', fn: generateAlan4_Kose_3D },
  { name: '04_ALAN_1_Ozel_7_Borulu_Kompleks_Detay_2D_Plan_ve_Kesit', fn: generateAlan1_7Boru_Detail_2D },
  { name: '04_ALAN_1_Ozel_7_Borulu_Kompleks_Detay_3D_Model', fn: generateAlan1_7Boru_Detail_3D },
  { name: '05_SEYRANTEPE_Genel_Kedi_Yolu_Ring_Plani', fn: generateStadiumCatwalkRing },
  { name: '06_MATSING_ANTEN_TUM_LOKASYONLAR_TEKLI_2LI_3LU_KESITLERI_2D_Plan_ve_Kesit', fn: generateMatsingSections2D },
  { name: '06_MATSING_ANTEN_TUM_LOKASYONLAR_TEKLI_2LI_3LU_KESITLERI_3D_Model', fn: generateMatsingSections3D },
  { name: '07_GAMMANU_SPOT_BEAM_ANTEN_TUM_LOKASYONLAR_TEKLI_2LI_3LU_KESITLERI_2D_Plan_ve_Kesit', fn: generateGammanuSections2D },
  { name: '07_GAMMANU_SPOT_BEAM_ANTEN_TUM_LOKASYONLAR_TEKLI_2LI_3LU_KESITLERI_3D_Model', fn: generateGammanuSections3D },
  { name: '08_500MM_KABLO_TAVASI_TUM_ALANLAR_KABLO_DOLULUK_KESITLERI', fn: generateCableTraySections2D },
  { name: '09_ALAN_1_ve_3_KEDI_YOLU_14_RRU_MONTAJ_VE_GECIS_ENKESITI', fn: generateCatwalkRruSectionDXF },
  { name: '10_ALAN_2_SKORBOARD_ARKASI_KEDI_YOLU_RRU_VE_POI_ALTERNATIF_KESITLERI', fn: generateAlan2AlternativesDXF }
];

console.log('Generating all DXF files with detailed equipment representations...');

tasks.forEach(t => {
  // 1. Millimeter version
  try {
    const dxfMm = t.fn('mm');
    if (dxfMm) {
      const fileMm = path.join(DIR_MM, `${t.name}_mm.dxf`);
      try {
        fs.writeFileSync(fileMm, dxfMm, 'utf8');
        console.log(`  [OK] MM: ${fileMm} (${(fs.statSync(fileMm).size / 1024).toFixed(1)} KB)`);
      } catch (e) {
        if (e.code === 'EBUSY') {
          const fallbackMm = path.join(DIR_MM, `${t.name}_mm_guncel.dxf`);
          fs.writeFileSync(fallbackMm, dxfMm, 'utf8');
          console.log(`  [OK - AutoCAD Açık Olduğu İçin Yedek Adla Yazıldı] MM: ${fallbackMm}`);
        } else {
          throw e;
        }
      }
    }
  } catch (err) {
    console.error(`  [ERROR MM] ${t.name}:`, err.message);
  }

  // 2. Meter version
  try {
    const dxfM = t.fn('m');
    if (dxfM) {
      const fileM = path.join(DIR_M, `${t.name}_m.dxf`);
      try {
        fs.writeFileSync(fileM, dxfM, 'utf8');
        console.log(`  [OK]  M: ${fileM} (${(fs.statSync(fileM).size / 1024).toFixed(1)} KB)`);
      } catch (e) {
        if (e.code === 'EBUSY') {
          const fallbackM = path.join(DIR_M, `${t.name}_m_guncel.dxf`);
          fs.writeFileSync(fallbackM, dxfM, 'utf8');
          console.log(`  [OK - AutoCAD Açık Olduğu İçin Yedek Adla Yazıldı] M: ${fallbackM}`);
        } else {
          throw e;
        }
      }
    }
  } catch (err) {
    console.error(`  [ERROR M] ${t.name}:`, err.message);
  }
});

console.log('All DXF files generated successfully.');
