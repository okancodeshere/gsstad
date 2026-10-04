const fs = require('fs');
const path = require('path');
const { DxfBuilder } = require('./dxf_engine.cjs');

// Output Directories
const BASE_DIR = path.join(__dirname, 'DXF_Ciktilari');
const DIR_MM = path.join(BASE_DIR, 'Milimetre');
const DIR_M = path.join(BASE_DIR, 'Metre');

[BASE_DIR, DIR_MM, DIR_M].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

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
// 1. HIGH-FIDELITY 2D GEOMETRY ROUTINES FOR GAMMA NU SPOT BEAM PANEL ANTENNA
// =========================================================================

/**
 * Draw 2D Front Elevation of Gamma Nu Spot Beam 30/30 Panel Antenna (Model DOY15X3030MD4TRE)
 * W = 700mm, H = 700mm, outer bezel 712x712mm, pyramidal embossed "X" pattern, UP arrow,
 * rear mast pipe silhouette (Ø76.2mm) and mounting brackets.
 */
function drawGammanuFrontView2D(dxf, cx, cy, s, label = 'GAMMA NU SPOT BEAM 30/30 (ÖN GÖRÜNÜŞ)') {
  const W = 700 * s;
  const H = 700 * s;

  // 1. Rear Mast Pipe silhouette (Ø76.2mm x 950mm extending above and below)
  const pipeR = 38.1 * s;
  const pipeH = 950 * s;
  dxf.setLayer('MONTAJ_BORULARI');
  dxf.addRect(cx - pipeR, cy - pipeH / 2, pipeR * 2, pipeH);
  dxf.addLine(cx, cy - pipeH / 2 - 80 * s, cx, cy + pipeH / 2 + 80 * s); // axis

  // 2. Outer Protective Bezel (Pahlı Çevre Çerçevesi - 712 x 712 mm)
  dxf.setLayer('CELIK_KIRIS_KOLON');
  dxf.addRect(cx - (W + 12 * s) / 2, cy - (H + 12 * s) / 2, W + 12 * s, H + 12 * s);

  // 3. Main ASA Radome Face (700 x 700 mm)
  dxf.setLayer('EKP_PANEL_ANTEN');
  dxf.addRect(cx - W / 2, cy - H / 2, W, H);

  // 4. Pyramidal Embossed "X" Pattern (4 Triangular Facets meeting at center apex)
  const halfW = W / 2 - 15 * s;
  const halfH = H / 2 - 15 * s;
  // Diagonals
  dxf.addLine(cx - halfW, cy - halfH, cx + halfW, cy + halfH);
  dxf.addLine(cx - halfW, cy + halfH, cx + halfW, cy - halfH);

  // Diagonal X-Ribs (Parallel double lines forming reinforced ridges)
  const ribW = 8 * s;
  dxf.addLine(cx - halfW + ribW, cy - halfH, cx + halfW, cy + halfH - ribW);
  dxf.addLine(cx - halfW, cy - halfH + ribW, cx + halfW - ribW, cy + halfH);
  dxf.addLine(cx - halfW + ribW, cy + halfH, cx + halfW, cy - halfH + ribW);
  dxf.addLine(cx - halfW, cy + halfH - ribW, cx + halfW - ribW, cy - halfH);

  // Center apex crosshair
  dxf.addCircle(cx, cy, 18 * s);
  dxf.addLine(cx - 35 * s, cy, cx + 35 * s, cy);
  dxf.addLine(cx, cy - 35 * s, cx, cy + 35 * s);

  // Inner margin border
  dxf.addRect(cx - halfW, cy - halfH, halfW * 2, halfH * 2);

  // 5. "UP" Orientation Direction Arrow
  dxf.setLayer('METIN_BILGI');
  const arrowY = cy + halfH - 45 * s;
  dxf.addLine(cx, arrowY + 30 * s, cx - 20 * s, arrowY - 10 * s);
  dxf.addLine(cx, arrowY + 30 * s, cx + 20 * s, arrowY - 10 * s);
  dxf.addLine(cx - 20 * s, arrowY - 10 * s, cx + 20 * s, arrowY - 10 * s);
  dxf.addLine(cx, arrowY - 10 * s, cx, arrowY - 25 * s);
  dxf.addText(cx, arrowY - 50 * s, 26 * s, 'UP (YUKARI)', 'METIN_BILGI', 0, 'center', 'middle');

  // 6. Rear Mounting Bracket Ears visible at sides
  dxf.setLayer('CELIK_KIRIS_KOLON');
  [-160 * s, 160 * s].forEach(by => {
    dxf.addRect(cx - W / 2 - 20 * s, cy + by - 25 * s, 20 * s, 50 * s);
    dxf.addRect(cx + W / 2, cy + by - 25 * s, 20 * s, 50 * s);
    dxf.addCircle(cx - W / 2 - 10 * s, cy + by, 5 * s);
    dxf.addCircle(cx + W / 2 + 10 * s, cy + by, 5 * s);
  });

  // Overall Dimensions
  dxf.addDimension(cx - W / 2, cy - H / 2 - 80 * s, cx + W / 2, cy - H / 2 - 80 * s, -120 * s, '700 mm (GENİŞLİK)');
  dxf.addDimension(cx + W / 2 + 60 * s, cy - H / 2, cx + W / 2 + 60 * s, cy + H / 2, 120 * s, '700 mm (YÜKSEKLİK)');

  // Title and label
  dxf.setLayer('METIN_BILGI');
  dxf.addText(cx, cy - H / 2 - 280 * s, 45 * s, label, 'METIN_BILGI', 0, 'center', 'middle');
  dxf.addText(cx, cy - H / 2 - 340 * s, 32 * s, 'Spot Beam 30/30 (DOY15X3030MD4TRE) - 16.5 kg', 'METIN_BILGI', 0, 'center', 'middle');
}

/**
 * Draw 2D Side Elevation / Cross-Section of Gamma Nu Spot Beam Antenna at 45° Downtilt
 * H = 700mm, D = 170mm (radome), Total Depth = 463mm with bracket.
 * Tilted 45° DOWNWARDS towards the field (+X forward, -Y down).
 * Mounting rail, dual cantilever arms, tilt hinge and drop pipes are on the REAR, rising straight UP!
 */
function drawGammanuSideSection2D(dxf, cx, cy, s, tiltDeg = 45, label = 'GAMMA NU (45° EĞİMLİ YAN KESİT)', mountType = 'truss') {
  const H = 700 * s;
  const D = 170 * s;
  const D_total = 463 * s;
  const rad = tiltDeg * Math.PI / 180;
  const cosT = Math.cos(rad);
  const sinT = Math.sin(rad);

  // CLOCKWISE Rotation helper around center (cx, cy):
  // lx: along antenna depth (-D/2 = rear chassis, +D/2 = front face)
  // ly: along antenna height (-H/2 = bottom cap, +H/2 = top cap)
  //
  // Facing towards +X (forward) and tilted 45° DOWNWARDS (-Y) towards the field:
  // x = cx + lx * cosT + ly * sinT
  // y = cy - lx * sinT + ly * cosT
  const rot = (lx, ly) => {
    return {
      x: cx + lx * cosT + ly * sinT,
      y: cy - lx * sinT + ly * cosT
    };
  };

  dxf.setLayer('EKP_PANEL_ANTEN');

  const halfD = D / 2;
  const halfH = H / 2;

  // 1. Radome Profile Outline
  const pTopBezelRight = rot(halfD + 12 * s, halfH + 6 * s);
  const pTopBezelLeft = rot(-halfD - 6 * s, halfH + 6 * s);
  const pBotBezelRight = rot(halfD + 12 * s, -halfH - 6 * s);
  const pBotBezelLeft = rot(-halfD - 6 * s, -halfH - 6 * s);

  const pFrontTop = rot(halfD, halfH - 15 * s);
  const pFrontApex = rot(halfD + 18 * s, 0); // 18mm center pyramidal apex
  const pFrontBot = rot(halfD, -halfH + 15 * s);

  const pChassisTop = rot(-halfD, halfH * 0.94);
  const pChassisBot = rot(-halfD, -halfH * 0.94);

  // Draw radome body polygon
  dxf.addLine(pTopBezelLeft.x, pTopBezelLeft.y, pTopBezelRight.x, pTopBezelRight.y);
  dxf.addLine(pTopBezelRight.x, pTopBezelRight.y, pFrontTop.x, pFrontTop.y);
  dxf.addLine(pFrontTop.x, pFrontTop.y, pFrontApex.x, pFrontApex.y); // upper slope of pyramid
  dxf.addLine(pFrontApex.x, pFrontApex.y, pFrontBot.x, pFrontBot.y);  // lower slope of pyramid
  dxf.addLine(pFrontBot.x, pFrontBot.y, pBotBezelRight.x, pBotBezelRight.y);
  dxf.addLine(pBotBezelRight.x, pBotBezelRight.y, pBotBezelLeft.x, pBotBezelLeft.y);
  dxf.addLine(pBotBezelLeft.x, pBotBezelLeft.y, pChassisBot.x, pChassisBot.y);
  dxf.addLine(pChassisBot.x, pChassisBot.y, pChassisTop.x, pChassisTop.y);
  dxf.addLine(pChassisTop.x, pChassisTop.y, pTopBezelLeft.x, pTopBezelLeft.y);

  // Front bezel perimeter band
  dxf.addLine(rot(halfD, halfH).x, rot(halfD, halfH).y, rot(halfD, -halfH).x, rot(halfD, -halfH).y);

  // 2. Rear Aluminum Chassis Plate (-halfD)
  dxf.setLayer('CELIK_KIRIS_KOLON');
  const pChassisPlateTop = rot(-halfD - 8 * s, halfH * 0.94);
  const pChassisPlateBot = rot(-halfD - 8 * s, -halfH * 0.94);
  dxf.addLine(pChassisPlateTop.x, pChassisPlateTop.y, pChassisTop.x, pChassisTop.y);
  dxf.addLine(pChassisPlateTop.x, pChassisPlateTop.y, pChassisPlateBot.x, pChassisPlateBot.y);
  dxf.addLine(pChassisPlateBot.x, pChassisPlateBot.y, pChassisBot.x, pChassisBot.y);

  // 3. 4x 4.3-10 Female RF Connector Ports on rear chassis
  dxf.setLayer('KABLO_TAVALARI');
  const portSpacing = 85 * s;
  const portStartY = 125 * s;
  const portX = -halfD - 8 * s;
  for (let i = 0; i < 4; i++) {
    const py = portStartY - i * portSpacing;
    const pPortBase = rot(portX, py);
    const pPortTip = rot(portX - 25 * s, py);
    dxf.addLine(pPortBase.x, pPortBase.y, pPortTip.x, pPortTip.y);
    dxf.addCircle(pPortTip.x, pPortTip.y, 8 * s);
    // Feeder cable drip loop curving down and rising into cable tray
    dxf.addLine(pPortTip.x, pPortTip.y, pPortTip.x - 40 * s, pPortTip.y - 60 * s);
    dxf.addLine(pPortTip.x - 40 * s, pPortTip.y - 60 * s, rot(-350 * s, -200 * s).x, rot(-350 * s, -200 * s).y + i * 35 * s);
  }
  dxf.addText(rot(-halfD - 80 * s, -180 * s).x, rot(-halfD - 80 * s, -180 * s).y, 30 * s, '4x 4.3-10 RF PORT (R1, Y1, Y2, P1)', 'KABLO_TAVALARI', 0, 'right', 'middle');

  // 4. Central Vertical Mounting Rail (140x25mm, H = 455mm)
  dxf.setLayer('CELIK_KIRIS_KOLON');
  const railThick = 25 * s;
  const railHalfH = 227.5 * s;
  const pRailT1 = rot(-halfD - 8 * s, railHalfH);
  const pRailT2 = rot(-halfD - 8 * s - railThick, railHalfH);
  const pRailB2 = rot(-halfD - 8 * s - railThick, -railHalfH);
  const pRailB1 = rot(-halfD - 8 * s, -railHalfH);
  dxf.addLine(pRailT1.x, pRailT1.y, pRailT2.x, pRailT2.y);
  dxf.addLine(pRailT2.x, pRailT2.y, pRailB2.x, pRailB2.y);
  dxf.addLine(pRailB2.x, pRailB2.y, pRailB1.x, pRailB1.y);

  // 5. Dual Cantilever Tilt Arms (Extension = 251mm)
  const armLen = 251 * s;
  const pArmBaseT = rot(-halfD - 8 * s - railThick, 60 * s);
  const pArmBaseB = rot(-halfD - 8 * s - railThick, -60 * s);
  const pHingePivot = rot(-halfD - 8 * s - railThick - armLen, 0); // hinge pivot center
  dxf.addLine(pArmBaseT.x, pArmBaseT.y, pHingePivot.x, pHingePivot.y);
  dxf.addLine(pArmBaseB.x, pArmBaseB.y, pHingePivot.x, pHingePivot.y);

  // Tilt Hinge Pivot (Ø44mm)
  dxf.addCircle(pHingePivot.x, pHingePivot.y, 22 * s);
  // Angle Adjustment Quadrant Arc
  dxf.addCircle(pHingePivot.x, pHingePivot.y, 45 * s);
  dxf.addText(pHingePivot.x - 30 * s, pHingePivot.y + 35 * s, 26 * s, '0-60° TILT MAFSALI', 'CELIK_KIRIS_KOLON', 0, 'right', 'middle');

  // 6. Mast Pipe Clamp Saddle (Grasping Ø76.2mm / 3" pipe)
  const mastPipeR = 38.1 * s;
  const pMastCenter = rot(-D_total + mastPipeR, 0); // center of Ø76.2mm pipe
  dxf.setLayer('MONTAJ_BORULARI');
  // Mast pipe silhouette extending along tilt axis
  const pMastPipeT = rot(-D_total + mastPipeR, halfH * 1.15);
  const pMastPipeB = rot(-D_total + mastPipeR, -halfH * 1.15);
  dxf.addLine(pMastPipeT.x, pMastPipeT.y, pMastPipeB.x, pMastPipeB.y);
  dxf.addLine(rot(-D_total, halfH * 1.15).x, rot(-D_total, halfH * 1.15).y,
              rot(-D_total, -halfH * 1.15).x, rot(-D_total, -halfH * 1.15).y);
  dxf.addLine(rot(-D_total + mastPipeR * 2, halfH * 1.15).x, rot(-D_total + mastPipeR * 2, halfH * 1.15).y,
              rot(-D_total + mastPipeR * 2, -halfH * 1.15).x, rot(-D_total + mastPipeR * 2, -halfH * 1.15).y);

  // Saddle and rear jaw clamping the pipe
  dxf.setLayer('CELIK_KIRIS_KOLON');
  dxf.addCircle(pMastCenter.x, pMastCenter.y, mastPipeR + 10 * s);
  dxf.addLine(rot(-D_total - 10 * s, 70 * s).x, rot(-D_total - 10 * s, 70 * s).y,
              rot(-D_total - 10 * s, -70 * s).x, rot(-D_total - 10 * s, -70 * s).y); // rear clamp jaw

  // 7. Crossover Clamps & 2 Vertical Drop Offset Pipes (Ø70mm)
  // Two crossover clamps on mast pipe on the REAR
  const pClamp1 = rot(-D_total + mastPipeR, -halfH * 0.55); // lower clamp (rear-lower)
  const pClamp2 = rot(-D_total + mastPipeR, halfH * 0.55);  // upper clamp (rear-upper)

  dxf.setLayer('CELIK_KIRIS_KOLON');
  [pClamp1, pClamp2].forEach(p => {
    dxf.addRect(p.x - 65 * s, p.y - 55 * s, 130 * s, 110 * s);
  });

  // Vertical drop pipes rising straight UP (+Y in drawing)
  const dropPipeR = 35 * s;
  const pDrop1TopY = cy + 2200 * s;
  const pDrop2TopY = cy + 2200 * s;

  dxf.setLayer('MONTAJ_BORULARI');
  // Lower vertical drop pipe (rises straight UP behind antenna)
  dxf.addRect(pClamp1.x - dropPipeR, pClamp1.y, dropPipeR * 2, (pDrop1TopY - pClamp1.y));
  // Upper vertical drop pipe (rises straight UP behind antenna)
  dxf.addRect(pClamp2.x - dropPipeR, pClamp2.y, dropPipeR * 2, (pDrop2TopY - pClamp2.y));

  // Horizontal bridging cross-plate between the two drop pipes at the top
  dxf.setLayer('CELIK_KIRIS_KOLON');
  dxf.addRect(pClamp1.x - 70 * s, pDrop1TopY - 20 * s, (pClamp2.x - pClamp1.x) + 140 * s, 40 * s);

  // 8. Overhead Structure Connections (truss, cylinder, catwalk)
  if (mountType === 'truss') {
    const carrierR = 140 * s; // Ø28cm çatı makası ana silindiri
    const carrierAxis = { x: (pClamp1.x + pClamp2.x) / 2, y: pDrop1TopY + 20 * s + carrierR };
    dxf.setLayer('MONTAJ_BORULARI');
    dxf.addCircle(carrierAxis.x, carrierAxis.y, carrierR);
    dxf.setLayer('CELIK_KIRIS_KOLON');
    dxf.addCircle(carrierAxis.x, carrierAxis.y, carrierR + 15 * s); // collar clamp
    dxf.addRect(carrierAxis.x - carrierR - 50 * s, carrierAxis.y - 25 * s, 35 * s, 50 * s); // lug
    dxf.addRect(carrierAxis.x + carrierR + 15 * s, carrierAxis.y - 25 * s, 35 * s, 50 * s); // lug
    // Diagonal wind bracing tie-rod from pClamp1 to carrier collar
    dxf.addLine(pClamp1.x, pClamp1.y + 80 * s, carrierAxis.x, carrierAxis.y - carrierR, 'CELIK_KIRIS_KOLON');
    dxf.setLayer('METIN_BILGI');
    dxf.addText(carrierAxis.x + carrierR + 60 * s, carrierAxis.y, 38 * s, 'ÇATI MAKASI ANA BORUSU (Ø280mm)', 'METIN_BILGI', 0, 'left', 'middle');
    dxf.addText(pClamp1.x - 45 * s, (pClamp1.y + pDrop1TopY) / 2, 32 * s, '2x Ø70mm OFSET ASKI BORUSU', 'METIN_BILGI', 0, 'right', 'middle');
    dxf.addText(pClamp2.x + 70 * s, pClamp2.y, 28 * s, 'ÇAPRAZ GEÇİŞ KELEPÇESİ (M14)', 'METIN_BILGI', 0, 'left', 'middle');
  } else if (mountType === 'cylinder') {
    const cylR = 750 * s; // Ø1500mm dev silindir
    const cylAxis = { x: pClamp1.x - 120 * s, y: cy + 2200 * s + cylR };
    dxf.setLayer('MONTAJ_BORULARI');
    dxf.addCircle(cylAxis.x, cylAxis.y, cylR);
    dxf.setLayer('CELIK_KIRIS_KOLON');
    dxf.addCircle(cylAxis.x, cylAxis.y, cylR + 45 * s); // 360° clamp collar
    // Heavy duty vertical drop mast Ø114mm x 2090mm
    const mainDropR = 57 * s;
    dxf.setLayer('MONTAJ_BORULARI');
    dxf.addRect(pClamp1.x - mainDropR, pClamp1.y - 60 * s, mainDropR * 2, (cylAxis.y - cylR) - (pClamp1.y - 60 * s));
    // Cantilever bracket arm to upper clamp
    dxf.setLayer('CELIK_KIRIS_KOLON');
    dxf.addRect(pClamp1.x, pClamp2.y - 30 * s, (pClamp2.x - pClamp1.x) + 60 * s, 60 * s);
    dxf.setLayer('METIN_BILGI');
    dxf.addText(cylAxis.x, cylAxis.y, 55 * s, 'SKORBOARD DEV BORU (Ø1500mm)', 'METIN_BILGI', 0, 'center', 'middle');
    dxf.addText(cylAxis.x, cylAxis.y - 90 * s, 36 * s, '360° Çember Kelepçe Bileziği (M24)', 'METIN_BILGI', 0, 'center', 'middle');
    dxf.addText(pClamp1.x - 70 * s, (pClamp1.y + cylAxis.y - cylR) / 2, 32 * s, 'Ø114mm x 2090mm TAŞIYICI BORU', 'METIN_BILGI', 0, 'right', 'middle');
  } else if (mountType === 'catwalk') {
    const yWalk = cy + 1800 * s;
    // Catwalk walkway grating & steel beam
    dxf.setLayer('ZEMIN_PLATFORM');
    dxf.addRect(pClamp1.x - 600 * s, yWalk, 850 * s, 40 * s); // grating floor
    dxf.addRect(pClamp1.x + 230 * s, yWalk + 40 * s, 20 * s, 150 * s); // toe plate right
    dxf.addRect(pClamp1.x - 600 * s, yWalk + 40 * s, 20 * s, 150 * s); // toe plate left
    // Safety railing (1100mm high)
    dxf.setLayer('CELIK_KIRIS_KOLON');
    dxf.addLine(pClamp1.x + 240 * s, yWalk + 40 * s, pClamp1.x + 240 * s, yWalk + 1140 * s);
    dxf.addLine(pClamp1.x - 590 * s, yWalk + 40 * s, pClamp1.x - 590 * s, yWalk + 1140 * s);
    dxf.addLine(pClamp1.x - 590 * s, yWalk + 1140 * s, pClamp1.x + 240 * s, yWalk + 1140 * s); // top rail
    dxf.addLine(pClamp1.x - 590 * s, yWalk + 590 * s, pClamp1.x + 240 * s, yWalk + 590 * s); // mid rail
    // Ø45.7cm ($R = 228.5 * s$) silindir boru
    const cyl45R = 228.5 * s;
    const xCyl45 = pClamp1.x - 350 * s;
    const yCyl45 = yWalk - 280 * s;
    dxf.setLayer('MONTAJ_BORULARI');
    dxf.addCircle(xCyl45, yCyl45, cyl45R);
    dxf.addCircle(xCyl45, yCyl45, cyl45R + 15 * s);
    // Drop hanger pipes connecting to antenna rear clamps pClamp1 and pClamp2
    dxf.addRect(pClamp1.x - dropPipeR, pClamp1.y, dropPipeR * 2, yWalk - pClamp1.y);
    dxf.addRect(pClamp2.x - dropPipeR, pClamp2.y, dropPipeR * 2, yWalk - pClamp2.y);
    dxf.setLayer('METIN_BILGI');
    dxf.addText(pClamp1.x - 180 * s, yWalk + 550 * s, 36 * s, 'KEDİ YOLU (900mm)', 'METIN_BILGI', 0, 'center', 'middle');
    dxf.addText(xCyl45, yCyl45 - cyl45R - 50 * s, 30 * s, 'Ø45.7cm SİLİNDİR BORU', 'METIN_BILGI', 0, 'center', 'middle');
  }

  // 9. Downtilt Angle Dimension Arc & Text (45° forward and down)
  dxf.setLayer('OLCULER');
  const pCenter = rot(0, 0); // (cx, cy)
  // Horizontal reference ray pointing forward
  dxf.addLine(pCenter.x, pCenter.y, pCenter.x + 850 * s, pCenter.y);
  // 45° Tilted Boresight ray pointing forward and down into quadrant 4
  const pBoresightEnd = {
    x: pCenter.x + 850 * s * cosT,
    y: pCenter.y - 850 * s * sinT
  };
  dxf.addLine(pCenter.x, pCenter.y, pBoresightEnd.x, pBoresightEnd.y);
  // Arrowhead at tip
  dxf.addLine(pBoresightEnd.x, pBoresightEnd.y, pBoresightEnd.x - 50 * s, pBoresightEnd.y + 15 * s);
  dxf.addLine(pBoresightEnd.x, pBoresightEnd.y, pBoresightEnd.x - 15 * s, pBoresightEnd.y + 50 * s);
  // Downtilt Arc / Label
  dxf.addText(pCenter.x + 420 * s, pCenter.y - 150 * s, 40 * s, `${tiltDeg}° DOWNTILT (YERE VE SAHAYA EĞİM)`, 'OLCULER', 0, 'left', 'middle');

  // 10. Dimensions (Height, Radome Depth, Total Depth with Bracket)
  // Boy (700 mm) dimension along antenna length on upper-left (behind antenna)
  const normX = -cosT * 220 * s;
  const normY = sinT * 220 * s;
  dxf.addLine(pBotBezelLeft.x, pBotBezelLeft.y, pBotBezelLeft.x + normX, pBotBezelLeft.y + normY);
  dxf.addLine(pTopBezelLeft.x, pTopBezelLeft.y, pTopBezelLeft.x + normX, pTopBezelLeft.y + normY);
  dxf.addLine(pBotBezelLeft.x + normX, pBotBezelLeft.y + normY, pTopBezelLeft.x + normX, pTopBezelLeft.y + normY);
  const midH_X = (pBotBezelLeft.x + pTopBezelLeft.x) / 2 + normX;
  const midH_Y = (pBotBezelLeft.y + pTopBezelLeft.y) / 2 + normY;
  dxf.addText(midH_X - 35 * s, midH_Y + 35 * s, 40 * s, '700 mm (BOY)', 'OLCULER', 45, 'center', 'middle');

  // Gövde Derinliği (170 mm) dimension across radome
  const depthNormX = sinT * 140 * s;
  const depthNormY = cosT * 140 * s;
  dxf.addLine(pChassisTop.x, pChassisTop.y, pChassisTop.x + depthNormX, pChassisTop.y + depthNormY);
  dxf.addLine(pFrontTop.x, pFrontTop.y, pFrontTop.x + depthNormX, pFrontTop.y + depthNormY);
  dxf.addLine(pChassisTop.x + depthNormX, pChassisTop.y + depthNormY, pFrontTop.x + depthNormX, pFrontTop.y + depthNormY);
  const midD_X = (pChassisTop.x + pFrontTop.x) / 2 + depthNormX;
  const midD_Y = (pChassisTop.y + pFrontTop.y) / 2 + depthNormY;
  dxf.addText(midD_X, midD_Y + 30 * s, 36 * s, '170 mm (GÖVDE)', 'OLCULER', -45, 'center', 'middle');

  // Toplam Montaj Derinliği (463 mm)
  dxf.addText(pMastCenter.x, pMastCenter.y - 120 * s, 36 * s, '463 mm (TOPLAM MONTAJ DERİNLİĞİ)', 'OLCULER', 0, 'center', 'middle');

  // Title and label
  dxf.setLayer('METIN_BILGI');
  dxf.addText(cx, cy - halfH - 220 * s, 45 * s, label, 'METIN_BILGI', 0, 'center', 'middle');
  dxf.addText(cx, cy - halfH - 280 * s, 32 * s, 'Gamma Nu Spot Beam 30/30 (Öne ve Yere 45° Eğim)', 'METIN_BILGI', 0, 'center', 'middle');
}

/**
 * Draw 2D Top View / Plan Section of Gamma Nu Spot Beam Antenna
 * W = 700mm, D_total = 463mm, pyramidal front ridge, rear chassis, rail, cantilever arms,
 * mast pipe clamp saddle, and 30° spot beam radiation cone.
 */
function drawGammanuTopPlan2D(dxf, cx, cy, s, azimuthDeg = 0, label = 'GAMMA NU SPOT BEAM (PLAN KESİTİ)') {
  const W = 700 * s;
  const D = 170 * s;
  const D_total = 463 * s;
  const rad = azimuthDeg * Math.PI / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);

  const rot = (lx, ly) => {
    return {
      x: cx + lx * cosA - ly * sinA,
      y: cy + lx * sinA + ly * cosA
    };
  };

  const halfW = W / 2;
  const halfD = D / 2;

  dxf.setLayer('EKP_PANEL_ANTEN');

  // 1. Radome Contour in Top View
  // Facing towards +Y in local plan coordinates (+ly is front face, -ly is rear bracket)
  const pFrontL = rot(-halfW, halfD);
  const pFrontR = rot(halfW, halfD);
  const pRearR = rot(halfW, -halfD);
  const pRearL = rot(-halfW, -halfD);
  const pApexNose = rot(0, halfD + 18 * s); // center apex protrusion

  // Outer boundary with center peak
  dxf.addLine(pRearL.x, pRearL.y, pRearR.x, pRearR.y);
  dxf.addLine(pRearR.x, pRearR.y, pFrontR.x, pFrontR.y);
  dxf.addLine(pFrontR.x, pFrontR.y, pApexNose.x, pApexNose.y);
  dxf.addLine(pApexNose.x, pApexNose.y, pFrontL.x, pFrontL.y);
  dxf.addLine(pFrontL.x, pFrontL.y, pRearL.x, pRearL.y);

  // Pyramidal central ridge line
  dxf.addLine(pApexNose.x, pApexNose.y, rot(0, -halfD).x, rot(0, -halfD).y);

  // 2. Rear Aluminum Chassis Plate
  dxf.setLayer('CELIK_KIRIS_KOLON');
  const pChassisL = rot(-halfW * 0.94, -halfD - 8 * s);
  const pChassisR = rot(halfW * 0.94, -halfD - 8 * s);
  dxf.addLine(pChassisL.x, pChassisL.y, pChassisR.x, pChassisR.y);

  // 4 RF Connector Ports (visible at rear right)
  dxf.setLayer('KABLO_TAVALARI');
  for (let i = 0; i < 4; i++) {
    const px = halfW * 0.40 + i * 25 * s;
    const pPort = rot(px, -halfD - 16 * s);
    dxf.addCircle(pPort.x, pPort.y, 8 * s);
  }

  // 3. Central Mounting Rail (140x25mm)
  dxf.setLayer('CELIK_KIRIS_KOLON');
  const railHalfW = 70 * s;
  dxf.addRect(rot(-railHalfW, -halfD - 25 * s).x, rot(-railHalfW, -halfD - 25 * s).y,
             railHalfW * 2, 25 * s);

  // Cantilever arms extending back
  const armLen = 251 * s;
  [-55 * s, 55 * s].forEach(ax => {
    dxf.addLine(rot(ax, -halfD - 25 * s).x, rot(ax, -halfD - 25 * s).y,
                rot(ax, -halfD - 25 * s - armLen).x, rot(ax, -halfD - 25 * s - armLen).y);
  });

  // Hinge pivot cross-member
  dxf.addLine(rot(-70 * s, -halfD - 25 * s - armLen).x, rot(-70 * s, -halfD - 25 * s - armLen).y,
              rot(70 * s, -halfD - 25 * s - armLen).x, rot(70 * s, -halfD - 25 * s - armLen).y);

  // 4. Mast Pipe Clamp Saddle (Grasping Ø76.2mm pipe)
  const mastPipeR = 38.1 * s;
  const pPipeCenter = rot(0, -D_total + mastPipeR);
  dxf.setLayer('MONTAJ_BORULARI');
  dxf.addCircle(pPipeCenter.x, pPipeCenter.y, mastPipeR);

  // Saddle clamp ears & rear jaw
  dxf.setLayer('CELIK_KIRIS_KOLON');
  dxf.addRect(pPipeCenter.x - 70 * s, pPipeCenter.y - 12 * s, 140 * s, 24 * s);
  dxf.addCircle(pPipeCenter.x - 55 * s, pPipeCenter.y, 6 * s); // bolt
  dxf.addCircle(pPipeCenter.x + 55 * s, pPipeCenter.y, 6 * s); // bolt

  // 5. 30° Spot Beam Radiation Rays (HPBW: -15° and +15° from boresight)
  dxf.setLayer('OLCULER');
  const rayLen = 950 * s;
  const pBoresight = rot(0, halfD + rayLen);
  const pBeamL = rot(-Math.sin(15 * Math.PI / 180) * rayLen, halfD + Math.cos(15 * Math.PI / 180) * rayLen);
  const pBeamR = rot(Math.sin(15 * Math.PI / 180) * rayLen, halfD + Math.cos(15 * Math.PI / 180) * rayLen);

  dxf.addLine(rot(0, halfD).x, rot(0, halfD).y, pBoresight.x, pBoresight.y);
  dxf.addLine(rot(0, halfD).x, rot(0, halfD).y, pBeamL.x, pBeamL.y);
  dxf.addLine(rot(0, halfD).x, rot(0, halfD).y, pBeamR.x, pBeamR.y);
  // Boundary arc
  dxf.addLine(pBeamL.x, pBeamL.y, pBoresight.x, pBoresight.y);
  dxf.addLine(pBoresight.x, pBoresight.y, pBeamR.x, pBeamR.y);

  dxf.addText(pBoresight.x, pBoresight.y + 25 * s, 32 * s, '30° SPOT BEAM (HPBW)', 'OLCULER', 0, 'center', 'middle');

  // Dimensions
  dxf.addDimension(pFrontL.x, pFrontL.y + 60 * s, pFrontR.x, pFrontR.y + 60 * s, 100 * s, '700 mm (GENİŞLİK)');
  dxf.addDimension(pRearL.x - 60 * s, pRearL.y, pApexNose.x - 60 * s, pApexNose.y, -120 * s, '463 mm (TOPLAM DERİNLİK)');

  // Title
  dxf.setLayer('METIN_BILGI');
  dxf.addText(cx, cy - D_total - 120 * s, 42 * s, label, 'METIN_BILGI', 0, 'center', 'middle');
}

// =========================================================================
// 2. MASTER 2D SECTIONS GENERATOR FOR GAMMA NU ANTENNAS (TEKLİ, 2'Lİ, 3'LÜ)
// =========================================================================
function generateGammanuSections2D(units = 'mm') {
  const isMm = units === 'mm';
  const s = isMm ? 1 : 0.001;
  const dxf = new DxfBuilder(units);

  // =======================================================================
  // BÖLÜM 1: TEKLİ (SINGLE) GAMMA NU SPOT BEAM PANEL ANTENİ KESİTLERİ
  // =======================================================================
  const sec1Y = 17000 * s;
  // 1.1 Ön Kesit / Görünüş
  drawGammanuFrontView2D(dxf, -18000 * s, sec1Y, s, '1.1 TEKLİ SPOT BEAM: ÖN KESİT / GÖRÜNÜŞ');

  // 1.2 Yan Kesit / 45° Eğimli Profil (Çatı Makası Askılı)
  drawGammanuSideSection2D(dxf, -12000 * s, sec1Y, s, 45, '1.2 TEKLİ SPOT BEAM: YAN KESİT (45° DOWNTILT)', 'truss');

  // 1.3 Üstten Kesit / Plan Görünüşü
  drawGammanuTopPlan2D(dxf, -6000 * s, sec1Y, s, 0, '1.3 TEKLİ SPOT BEAM: ÜSTTEN PLAN KESİTİ');

  // Bölüm Çerçevesi
  dxf.setLayer('METIN_BILGI');
  dxf.addRect(-21500 * s, sec1Y - 2600 * s, 18500 * s, 5400 * s, 'METIN_BILGI');
  dxf.addText(-21000 * s, sec1Y + 2500 * s, 180 * s, 'BÖLÜM 1: TEKLİ (SINGLE) GAMMA NU SPOT BEAM 30/30 PANEL ANTENİ KESİTLERİ (1:1 ÖLÇEK)', 'METIN_BILGI');

  // =======================================================================
  // BÖLÜM 2: 2'Lİ (DUAL) GAMMA NU SPOT BEAM ANTEN KESİT VE TRAVERS MONTAJ PLANI
  // =======================================================================
  const sec2Y = 17000 * s;
  const dX = 8500 * s;

  // 2.1 Ön Kesit / İkili Travers Montajı (Center spacing = 1000mm)
  const dSpacing = 1000 * s;
  drawGammanuFrontView2D(dxf, dX - dSpacing / 2, sec2Y, s, 'SOL ANTEN (ANT-1)');
  drawGammanuFrontView2D(dxf, dX + dSpacing / 2, sec2Y, s, 'SAĞ ANTEN (ANT-2)');

  // Yatay Çelik Taşıyıcı Travers (100x60x5mm Kutu Profil, L = 2000mm)
  dxf.setLayer('CELIK_KIRIS_KOLON');
  const traversW = 2000 * s;
  const traversH = 100 * s;
  const traversY = sec2Y + 550 * s;
  dxf.addRect(dX - traversW / 2, traversY, traversW, traversH);
  dxf.addText(dX, traversY + traversH / 2, 40 * s, 'AĞIR HİZMET ÇELİK TRAVERS (100x60x5mm, L=2000mm)', 'CELIK_KIRIS_KOLON', 0, 'center', 'middle');

  // Ortak kablo tavası (travers arkasında)
  dxf.setLayer('KABLO_TAVALARI');
  dxf.addRect(dX - traversW / 2, traversY - 60 * s, traversW, 45 * s);
  dxf.addText(dX, traversY - 35 * s, 30 * s, '2x 4 = 8 ADET 1/2" FEEDER KABLO TAVASI (300x60mm)', 'KABLO_TAVALARI', 0, 'center', 'middle');

  // Aks ve Açıklık Ölçüleri
  dxf.addDimension(dX - dSpacing / 2, sec2Y - 600 * s, dX + dSpacing / 2, sec2Y - 600 * s, -200 * s, '1000 mm (ANTEN AKS ARALIĞI)');
  dxf.addDimension(dX - dSpacing / 2 + 350 * s, sec2Y + 700 * s, dX + dSpacing / 2 - 350 * s, sec2Y + 700 * s, 180 * s, '300 mm (NET RF AÇIKLIĞI)');
  dxf.addDimension(dX - traversW / 2, traversY + 150 * s, dX + traversW / 2, traversY + 150 * s, 200 * s, '2000 mm (TRAVERS TOPLAM BOYU)');

  // 2.2 Yan Kesit / İkili Profil Görünüşü
  drawGammanuSideSection2D(dxf, 16000 * s, sec2Y, s, 45, '2.2 İKİLİ SİSTEM: YAN KESİT (PROFİL)', 'truss');

  // Bölüm Çerçevesi
  dxf.setLayer('METIN_BILGI');
  dxf.addRect(dX - traversW / 2 - 800 * s, sec2Y - 2600 * s, 14500 * s, 5400 * s, 'METIN_BILGI');
  dxf.addText(dX - traversW / 2 - 400 * s, sec2Y + 2500 * s, 180 * s, 'BÖLÜM 2: 2\'Lİ (DUAL) GAMMA NU SPOT BEAM ANTEN KESİT VE TRAVERS MONTAJ PLANI', 'METIN_BILGI');

  // =======================================================================
  // BÖLÜM 3: 3'LÜ (TRIPLE) GAMMA NU SPOT BEAM ANTEN KESİT VE AÇISAL KAPSAMA PLANI
  // =======================================================================
  const sec3Y = 8500 * s;
  const tX = -7000 * s;
  const tSpacing = 900 * s;

  // 3.1 Ön Kesit / 3'lü Modüler Şasi (Sol, Merkez, Sağ Anten)
  drawGammanuFrontView2D(dxf, tX - tSpacing, sec3Y, s, 'SEKTÖR 1 (SOL)');
  drawGammanuFrontView2D(dxf, tX, sec3Y, s, 'SEKTÖR 2 (MERKEZ)');
  drawGammanuFrontView2D(dxf, tX + tSpacing, sec3Y, s, 'SEKTÖR 3 (SAĞ)');

  // 3'lü Modüler Kafes Kiriş Travers (120x80x6mm Kutu Profil, L = 3000mm)
  dxf.setLayer('CELIK_KIRIS_KOLON');
  const tTraversW = 3000 * s;
  const tTraversH = 120 * s;
  const tTraversY = sec3Y + 550 * s;
  dxf.addRect(tX - tTraversW / 2, tTraversY, tTraversW, tTraversH);
  dxf.addText(tX, tTraversY + tTraversH / 2, 40 * s, 'AĞIR HİZMET 3\'LÜ KAFES TRAVERS (120x80x6mm, L=3000mm)', 'CELIK_KIRIS_KOLON', 0, 'center', 'middle');

  // 3'lü Askı Gergileri (Tie-Rods)
  dxf.addLine(tX - tTraversW / 2 + 100 * s, tTraversY + tTraversH, tX - tSpacing, tTraversY + 800 * s);
  dxf.addLine(tX + tTraversW / 2 - 100 * s, tTraversY + tTraversH, tX + tSpacing, tTraversY + 800 * s);

  // Aks Ölçüleri
  dxf.addDimension(tX - tSpacing, sec3Y - 600 * s, tX, sec3Y - 600 * s, -200 * s, '900 mm');
  dxf.addDimension(tX, sec3Y - 600 * s, tX + tSpacing, sec3Y - 600 * s, -200 * s, '900 mm');
  dxf.addDimension(tX - tSpacing, sec3Y - 600 * s, tX + tSpacing, sec3Y - 600 * s, -450 * s, '1800 mm (TOPLAM AKS AÇIKLIĞI)');

  // 3.2 3'lü Sistem Üstten Plan Kesiti (-20°, 0°, +20° Açısal Splay Dağılımı)
  const tPlanX = 4000 * s;
  drawGammanuTopPlan2D(dxf, tPlanX - 850 * s, sec3Y + 200 * s, s, -20, 'ANT-1 (-20°)');
  drawGammanuTopPlan2D(dxf, tPlanX, sec3Y, s, 0, 'ANT-2 (0°)');
  drawGammanuTopPlan2D(dxf, tPlanX + 850 * s, sec3Y + 200 * s, s, 20, 'ANT-3 (+20°)');

  // Bölüm Çerçevesi
  dxf.setLayer('METIN_BILGI');
  dxf.addRect(tX - tTraversW / 2 - 600 * s, sec3Y - 2600 * s, 18500 * s, 5400 * s, 'METIN_BILGI');
  dxf.addText(tX - tTraversW / 2 - 300 * s, sec3Y + 2500 * s, 180 * s, 'BÖLÜM 3: 3\'LÜ (TRIPLE) GAMMA NU SPOT BEAM DİZİ VE AÇISAL KAPSAMA PLANI', 'METIN_BILGI');

  // =======================================================================
  // BÖLÜM 4: LOKASYON BAZLI ÖZEL MONTAJ KESİTLERİ (A, B, C)
  // =======================================================================
  const sec4Y = 0 * s;

  // LOKASYON A: 45M ÇATI MAKASI ASILI MONTAJ KESİTİ (ALAN 3 & MARATON)
  const locAX = -14000 * s;
  drawGammanuSideSection2D(dxf, locAX, sec4Y, s, 45, 'LOKASYON A: 45m ÇATI MAKASI ASKILI KESİT', 'truss');

  // LOKASYON B: SKORBOARD Ø1500MM DEV BORU ÇEMBER MONTAJ KESİTİ (ALAN 2)
  const locBX = -4000 * s;
  drawGammanuSideSection2D(dxf, locBX, sec4Y, s, 45, 'LOKASYON B: SKORBOARD Ø1500mm BORU ÇEMBER KESİTİ', 'cylinder');

  // LOKASYON C: ÇATI UCU KEDİ YOLU VE Ø45.7CM SİLİNDİR YANI KESİTİ
  const locCX = 5500 * s;
  drawGammanuSideSection2D(dxf, locCX, sec4Y, s, 45, 'LOKASYON C: ÇATI UCU KEDİ YOLU & Ø45.7cm SİLİNDİR KESİTİ', 'catwalk');

  // Bölüm Çerçevesi
  dxf.setLayer('METIN_BILGI');
  dxf.addRect(locAX - 4000 * s, sec4Y - 2600 * s, 26000 * s, 6800 * s, 'METIN_BILGI');
  dxf.addText(locAX - 3500 * s, sec4Y + 3900 * s, 180 * s, 'BÖLÜM 4: LOKASYON BAZLI MONTAJ VE ASKI SİSTEMİ KESİTLERİ (TÜM TRİBÜN VE ÇATILAR)', 'METIN_BILGI');

  // =======================================================================
  // BÖLÜM 5: TEKNİK VERİLER, BAŞLIK BLOĞU VE MALZEME LİSTESİ (BOM)
  // =======================================================================
  const bomX = 13500 * s;
  const bomY = sec4Y + 1400 * s;

  const bom = [
    { name: 'Gamma Nu Spot Beam 30/30 Panel Anten (DOY15X3030MD4TRE)', dim: '700x700x170 mm', qty: 'Tipik' },
    { name: 'Ağır Hizmet Konsol Eğim Braketi (0-60° Tilt, 251mm Ofset)', dim: '140x455x251 mm', qty: '1 / Anten' },
    { name: 'Taşıyıcı Direk Borusu (3" Galvanizli Çelik Direk)', dim: 'Ø76.2mm x 950mm', qty: '1 / Anten' },
    { name: 'Çift Düşey Ofset Askı Borusu (Galvaniz Çelik)', dim: '2x Ø70mm x 2200mm', qty: '2 / Anten' },
    { name: 'Ağır Hizmet Çapraz Geçiş Kelepçeleri (Crossover Clamps)', dim: '130x110x130 mm / M14', qty: '2 / Anten' },
    { name: '2\'li İkili Montaj Traversi (Kutu Profil)', dim: '100x60x5mm x 2000mm', qty: 'Opsiyon' },
    { name: '3\'lü Modüler Kafes Kiriş Şasisi (Ağır Hizmet)', dim: '120x80x6mm x 3000mm', qty: 'Opsiyon' },
    { name: '1/2" Feeder Jumper Kablo Seti (4.3-10 DIN Dişi)', dim: '4 Port / Anten', qty: '4 / Anten' },
    { name: 'Skorboard Ø1500mm 360° Çember Kelepçe Bileziği', dim: 'Ø1590x200x20 mm', qty: 'Skorboard' },
    { name: 'Skorboard Ana Düşey Taşıyıcı Boru', dim: 'Ø114mm x 2090mm', qty: 'Skorboard' }
  ];

  addBomTable(dxf, bom, bomX, bomY, units);
  addTitleBlock(dxf, 'GAMMA NU SPOT BEAM 30/30 PANEL ANTENLERİ TÜM LOKASYONLAR KESİTLERİ (TEKLİ, 2\'Lİ, 3\'LÜ)', 'DETAY KESİT PAFTASI', isMm ? '1:1 mm' : '1:1 m', units, bomX, sec4Y - 2400 * s);

  return dxf.toDxfString();
}

// =========================================================================
// 3. MASTER 3D MODEL GENERATOR FOR GAMMA NU ANTENNA ASSEMBLIES
// =========================================================================

/**
 * 3D Solid Model of a single Gamma Nu Spot Beam Antenna Assembly at 45° Downtilt
 */
function addDetailedGammanu3DAssembly(dxf, posX, posY, posZ, s, tiltDeg = 45, azimuthDeg = 0, label = 'GAMMA NU 3D') {
  const H = 700 * s;
  const W = 700 * s;
  const D = 170 * s;
  const D_total = 463 * s;
  const radT = tiltDeg * Math.PI / 180;
  const cosT = Math.cos(radT);
  const sinT = Math.sin(radT);
  const radA = azimuthDeg * Math.PI / 180;
  const cosA = Math.cos(radA);
  const sinA = Math.sin(radA);

  // Rotation helper for tilted antenna geometry:
  // Local: lx (width), ly (height along antenna), lz (depth towards front face)
  // Tilt 45° forward and down + optional azimuth splay around CAD Z
  const rot3D = (lx, ly, lz) => {
    // 1. Downtilt around local X
    const rotY = ly * cosT - lz * sinT; // elevation (CAD Z)
    const rotZ = ly * sinT + lz * cosT; // forward depth (CAD -Y)
    const locX = lx;
    const locY = -rotZ;

    // 2. Azimuth splay around CAD Z
    const cadX = locX * cosA - locY * sinA;
    const cadY = locX * sinA + locY * cosA;

    return {
      x: posX + cadX,
      y: posY + cadY,
      z: posZ + rotY
    };
  };

  const halfW = W / 2;
  const halfH = H / 2;
  const halfD = D / 2;

  // 1. Main Radome Box Body (700 x 700 x 170 mm)
  const p1 = rot3D(-halfW, -halfH, halfD); // front-bot-left
  const p2 = rot3D(halfW, -halfH, halfD);  // front-bot-right
  const p3 = rot3D(halfW, halfH, halfD);   // front-top-right
  const p4 = rot3D(-halfW, halfH, halfD);  // front-top-left
  const p5 = rot3D(-halfW, -halfH, -halfD); // back-bot-left
  const p6 = rot3D(halfW, -halfH, -halfD);  // back-bot-right
  const p7 = rot3D(halfW, halfH, -halfD);   // back-top-right
  const p8 = rot3D(-halfW, halfH, -halfD);  // back-top-left

  // Box faces
  dxf.addFace3d(p5.x, p5.y, p5.z, p6.x, p6.y, p6.z, p7.x, p7.y, p7.z, p8.x, p8.y, p8.z, 'EKP_PANEL_ANTEN'); // Back
  dxf.addFace3d(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p6.x, p6.y, p6.z, p5.x, p5.y, p5.z, 'EKP_PANEL_ANTEN'); // Bottom
  dxf.addFace3d(p4.x, p4.y, p4.z, p3.x, p3.y, p3.z, p7.x, p7.y, p7.z, p8.x, p8.y, p8.z, 'EKP_PANEL_ANTEN'); // Top
  dxf.addFace3d(p1.x, p1.y, p1.z, p4.x, p4.y, p4.z, p8.x, p8.y, p8.z, p5.x, p5.y, p5.z, 'EKP_PANEL_ANTEN'); // Left
  dxf.addFace3d(p2.x, p2.y, p2.z, p3.x, p3.y, p3.z, p7.x, p7.y, p7.z, p6.x, p6.y, p6.z, 'EKP_PANEL_ANTEN'); // Right

  // 2. Embossed Pyramidal "X" Front Face (4 Triangular Facets meeting at center apex)
  const pApex = rot3D(0, 0, halfD + 18 * s); // 18mm center apex
  dxf.addFace3d(pApex.x, pApex.y, pApex.z, p4.x, p4.y, p4.z, p3.x, p3.y, p3.z, p3.x, p3.y, p3.z, 'EKP_PANEL_ANTEN'); // Top triangle
  dxf.addFace3d(pApex.x, pApex.y, pApex.z, p3.x, p3.y, p3.z, p2.x, p2.y, p2.z, p2.x, p2.y, p2.z, 'EKP_PANEL_ANTEN'); // Right triangle
  dxf.addFace3d(pApex.x, pApex.y, pApex.z, p2.x, p2.y, p2.z, p1.x, p1.y, p1.z, p1.x, p1.y, p1.z, 'EKP_PANEL_ANTEN'); // Bottom triangle
  dxf.addFace3d(pApex.x, pApex.y, pApex.z, p1.x, p1.y, p1.z, p4.x, p4.y, p4.z, p4.x, p4.y, p4.z, 'EKP_PANEL_ANTEN'); // Left triangle

  // Diagonal ridge lines
  dxf.addLine3d(pApex.x, pApex.y, pApex.z, p1.x, p1.y, p1.z, 'EKP_PANEL_ANTEN');
  dxf.addLine3d(pApex.x, pApex.y, pApex.z, p2.x, p2.y, p2.z, 'EKP_PANEL_ANTEN');
  dxf.addLine3d(pApex.x, pApex.y, pApex.z, p3.x, p3.y, p3.z, 'EKP_PANEL_ANTEN');
  dxf.addLine3d(pApex.x, pApex.y, pApex.z, p4.x, p4.y, p4.z, 'EKP_PANEL_ANTEN');

  // 3. Central Mounting Rail (140x25mm, H = 455mm) on rear
  const railHW = 70 * s;
  const railHH = 227.5 * s;
  const pR1 = rot3D(-railHW, -railHH, -halfD - 25 * s);
  const pR2 = rot3D(railHW, -railHH, -halfD - 25 * s);
  const pR3 = rot3D(railHW, railHH, -halfD - 25 * s);
  const pR4 = rot3D(-railHW, railHH, -halfD - 25 * s);
  dxf.addFace3d(pR1.x, pR1.y, pR1.z, pR2.x, pR2.y, pR2.z, pR3.x, pR3.y, pR3.z, pR4.x, pR4.y, pR4.z, 'CELIK_KIRIS_KOLON');

  // 4. Cantilever Arms (Extension = 251mm)
  const armLen = 251 * s;
  [-55 * s, 55 * s].forEach(ax => {
    const a1 = rot3D(ax - 6 * s, -30 * s, -halfD - 25 * s);
    const a2 = rot3D(ax + 6 * s, -30 * s, -halfD - 25 * s);
    const a3 = rot3D(ax + 6 * s, 30 * s, -halfD - 25 * s - armLen);
    const a4 = rot3D(ax - 6 * s, 30 * s, -halfD - 25 * s - armLen);
    dxf.addFace3d(a1.x, a1.y, a1.z, a2.x, a2.y, a2.z, a3.x, a3.y, a3.z, a4.x, a4.y, a4.z, 'CELIK_KIRIS_KOLON');
  });

  // 5. Central Mast Mounting Pipe (Ø76.2mm x 950mm) at rear
  const mastR = 38.1 * s;
  const mastLen = 950 * s;
  const mastZ = -D_total + mastR;
  // 8-segment cylinder for mast pipe
  for (let i = 0; i < 8; i++) {
    const a1 = (i / 8) * Math.PI * 2;
    const a2 = ((i + 1) / 8) * Math.PI * 2;
    const p1_top = rot3D(Math.sin(a1) * mastR, mastLen / 2, mastZ + Math.cos(a1) * mastR);
    const p2_top = rot3D(Math.sin(a2) * mastR, mastLen / 2, mastZ + Math.cos(a2) * mastR);
    const p2_bot = rot3D(Math.sin(a2) * mastR, -mastLen / 2, mastZ + Math.cos(a2) * mastR);
    const p1_bot = rot3D(Math.sin(a1) * mastR, -mastLen / 2, mastZ + Math.cos(a1) * mastR);
    dxf.addFace3d(p1_bot.x, p1_bot.y, p1_bot.z, p2_bot.x, p2_bot.y, p2_bot.z, p2_top.x, p2_top.y, p2_top.z, p1_top.x, p1_top.y, p1_top.z, 'MONTAJ_BORULARI');
  }

  // 6. Crossover Clamps & 2 Vertical Drop Offset Pipes (Ø70mm)
  const pClampLower = rot3D(0, -halfH * 0.55, mastZ);
  const pClampUpper = rot3D(0, halfH * 0.55, mastZ);

  // Vertical drop pipes rising straight UP (CAD Z)
  const dropR = 35 * s;
  const dropTopZ = posZ + 2200 * s;

  // Lower vertical drop pipe
  dxf.addSolidBox3D(pClampLower.x - dropR, pClampLower.y - dropR, pClampLower.z,
                    pClampLower.x + dropR, pClampLower.y + dropR, dropTopZ, 'MONTAJ_BORULARI');

  // Upper vertical drop pipe
  dxf.addSolidBox3D(pClampUpper.x - dropR, pClampUpper.y - dropR, pClampUpper.z,
                    pClampUpper.x + dropR, pClampUpper.y + dropR, dropTopZ, 'MONTAJ_BORULARI');

  // Crossover clamp solid boxes
  [pClampLower, pClampUpper].forEach(pc => {
    dxf.addSolidBox3D(pc.x - 65 * s, pc.y - 65 * s, pc.z - 55 * s,
                      pc.x + 65 * s, pc.y + 65 * s, pc.z + 55 * s, 'CELIK_KIRIS_KOLON');
  });

  // Top label
  dxf.addText(posX, posY - 600 * s, 50 * s, label, 'METIN_BILGI', 0, 'center', 'middle');
}

function generateGammanuSections3D(units = 'mm') {
  const isMm = units === 'mm';
  const s = isMm ? 1 : 0.001;
  const dxf = new DxfBuilder(units);

  // 1. TEKLİ (SINGLE) GAMMA NU ANTEN 3D MONTAJI (Çatı Makası Askılı)
  addDetailedGammanu3DAssembly(dxf, -14000 * s, 0, 0, s, 45, 0, '1. TEKLİ SPOT BEAM 30/30 (45° ÇATI ASKISI)');

  // 2. 2'Lİ (DUAL) GAMMA NU ANTEN 3D MONTAJI (Çiftli Travers Şasili)
  const dSpacing = 1000 * s;
  const dX = -4000 * s;
  addDetailedGammanu3DAssembly(dxf, dX - dSpacing / 2, 0, 0, s, 45, 0, 'ANT-1 (SOL)');
  addDetailedGammanu3DAssembly(dxf, dX + dSpacing / 2, 0, 0, s, 45, 0, 'ANT-2 (SAĞ)');
  // Yatay Çelik Travers (100x60x5mm box profile, L = 2000mm)
  dxf.addSolidBox3D(dX - 1000 * s, -50 * s, 550 * s, dX + 1000 * s, 50 * s, 650 * s, 'CELIK_KIRIS_KOLON');

  // 3. 3'LÜ (TRIPLE) GAMMA NU ANTEN 3D MONTAJI (3'lü Modüler Kafes Şasisi)
  const tSpacing = 900 * s;
  const tX = 7000 * s;
  addDetailedGammanu3DAssembly(dxf, tX - tSpacing, 120 * s, 0, s, 45, -20, 'ANT-1 (-20°)');
  addDetailedGammanu3DAssembly(dxf, tX, 0, 0, s, 45, 0, 'ANT-2 (0°)');
  addDetailedGammanu3DAssembly(dxf, tX + tSpacing, 120 * s, 0, s, 45, 20, 'ANT-3 (+20°)');
  // 3'lü Ağır Hizmet Kafes Travers Kirişi (L = 3000mm)
  dxf.addSolidBox3D(tX - 1500 * s, -60 * s, 550 * s, tX + 1500 * s, 60 * s, 670 * s, 'CELIK_KIRIS_KOLON');

  // 4. SKORBOARD Ø1500MM DEV BORU ÜZERİ ASILI 3D GAMMA NU ANTENİ
  const skX = 16000 * s;
  // Ø1500mm dev silindir boru (L = 3500mm)
  const cylR = 750 * s;
  const cylZ = 2400 * s;
  const segs = 16;
  for (let i = 0; i < segs; i++) {
    const a1 = (i / segs) * Math.PI * 2;
    const a2 = ((i + 1) % segs) * Math.PI * 2;
    const y1 = Math.sin(a1) * cylR;
    const z1 = cylZ + Math.cos(a1) * cylR;
    const y2 = Math.sin(a2) * cylR;
    const z2 = cylZ + Math.cos(a2) * cylR;
    dxf.addFace3d(skX - 1750 * s, y1, z1, skX + 1750 * s, y1, z1, skX + 1750 * s, y2, z2, skX - 1750 * s, y2, z2, 'MONTAJ_BORULARI');
  }
  // 360° Çember bilezik
  dxf.addSolidBox3D(skX - 120 * s, -cylR - 45 * s, cylZ - 45 * s, skX + 120 * s, cylR + 45 * s, cylZ + 45 * s, 'CELIK_KIRIS_KOLON');
  // Düşey sarkıtma borusu (Ø114mm x 2090mm)
  dxf.addSolidBox3D(skX - 57 * s, -57 * s, cylZ - cylR - 2090 * s, skX + 57 * s, 57 * s, cylZ - cylR, 'MONTAJ_BORULARI');
  // Anten montajı
  addDetailedGammanu3DAssembly(dxf, skX, 0, cylZ - cylR - 1000 * s, s, 45, 0, 'SKORBOARD Ø1500mm BORU ASILI GAMMA NU');

  return dxf.toDxfString();
}

// Module Exports
module.exports = {
  generateGammanuSections2D,
  generateGammanuSections3D
};

if (require.main === module) {
  console.log('Generating Gamma Nu Spot Beam Antenna DXFs (Tekli, 2\'li, 3\'lü, Tüm Lokasyonlar)...');
  const gammanuTasks = [
    { name: '07_GAMMANU_SPOT_BEAM_ANTEN_TUM_LOKASYONLAR_TEKLI_2LI_3LU_KESITLERI_2D_Plan_ve_Kesit', fn: generateGammanuSections2D },
    { name: '07_GAMMANU_SPOT_BEAM_ANTEN_TUM_LOKASYONLAR_TEKLI_2LI_3LU_KESITLERI_3D_Model', fn: generateGammanuSections3D }
  ];

  gammanuTasks.forEach(t => {
    ['mm', 'm'].forEach(u => {
      const isMm = u === 'mm';
      const targetDir = isMm ? DIR_MM : DIR_M;
      const file = path.join(targetDir, `${t.name}_${u}.dxf`);
      try {
        const dxfData = t.fn(u);
        fs.writeFileSync(file, dxfData, 'utf8');
        console.log(`  [OK] ${u.toUpperCase()}: ${file} (${(fs.statSync(file).size / 1024).toFixed(1)} KB)`);
      } catch (err) {
        if (err.code === 'EBUSY') {
          const fallback = path.join(targetDir, `${t.name}_${u}_guncel.dxf`);
          fs.writeFileSync(fallback, t.fn(u), 'utf8');
          console.log(`  [OK - EBUSY Fallback] ${u.toUpperCase()}: ${fallback}`);
        } else {
          console.error(`  [ERROR] ${t.name}_${u}:`, err);
        }
      }
    });
  });
  console.log('Gamma Nu DXF generation completed.');
}
