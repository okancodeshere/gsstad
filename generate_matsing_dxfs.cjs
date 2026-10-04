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

// =========================================================================
// 1. HIGH-FIDELITY 2D GEOMETRY DRAWING ROUTINES FOR MATSING ANTENNA
// =========================================================================

/**
 * Draw 2D Front Elevation of a Matsing 4-Beam Lens Antenna
 * W = 617mm, H = 1635mm, with convex spherical lens contour, cap plates, and rear pole
 */
function drawMatsingFrontView2D(dxf, cx, cy, s, label = 'MATSING 4-BEAM (ÖN GÖRÜNÜŞ)') {
  const W = 617 * s;
  const H = 1635 * s;

  // 1. Rear Mast Pipe silhouette (Ø76.2mm x 1800mm extending above and below)
  const pipeR = 38.1 * s;
  const pipeH = 1800 * s;
  dxf.setLayer('MONTAJ_BORULARI');
  dxf.addRect(cx - pipeR, cy - pipeH / 2, pipeR * 2, pipeH);
  dxf.addLine(cx, cy - pipeH / 2 - 100 * s, cx, cy + pipeH / 2 + 100 * s); // axis

  // 2. Main Radome Outer Boundary (Curved rounded rectangle)
  dxf.setLayer('EKP_MATSING_ANTEN');
  dxf.addRect(cx - W / 2, cy - H / 2, W, H);

  // Rounded outer side contours (convex radome outline)
  dxf.addLine(cx - W / 2 + 30 * s, cy - H / 2, cx - W / 2 + 30 * s, cy + H / 2);
  dxf.addLine(cx + W / 2 - 30 * s, cy - H / 2, cx + W / 2 - 30 * s, cy + H / 2);

  // Spherical lens central convex circles (Radome lens contour lines)
  const lensR = W * 0.46;
  dxf.addCircle(cx, cy, lensR);
  dxf.addCircle(cx, cy, lensR * 0.72);
  dxf.addCircle(cx, cy, lensR * 0.44);

  // 4 Horizontal Beam dividing zones (Beams 1, 2, 3, 4)
  [-H * 0.30, -H * 0.10, H * 0.10, H * 0.30].forEach((by, idx) => {
    dxf.addLine(cx - W * 0.42, cy + by, cx + W * 0.42, cy + by);
    dxf.addText(cx, cy + by + 20 * s, 32 * s, `BEAM ${4 - idx} (HÜZME ${4 - idx})`, 'EKP_MATSING_ANTEN', 0, 'center', 'middle');
  });

  // Top & Bottom Galvanized End Caps
  dxf.setLayer('CELIK_KIRIS_KOLON');
  dxf.addRect(cx - W * 0.45, cy + H / 2, W * 0.90, 35 * s);
  dxf.addRect(cx - W * 0.45, cy - H / 2 - 35 * s, W * 0.90, 35 * s);

  // Top and Bottom Mast Mounting Clamp Ears (visible at sides)
  [-H * 0.35, H * 0.35].forEach(by => {
    dxf.addRect(cx - W / 2 - 25 * s, cy + by - 30 * s, 25 * s, 60 * s);
    dxf.addRect(cx + W / 2, cy + by - 30 * s, 25 * s, 60 * s);
    dxf.addCircle(cx - W / 2 - 12 * s, cy + by, 6 * s);
    dxf.addCircle(cx + W / 2 + 12 * s, cy + by, 6 * s);
  });

  // Center crosshair snap
  dxf.addLine(cx - 60 * s, cy, cx + 60 * s, cy, 'METIN_BILGI');
  dxf.addLine(cx, cy - 60 * s, cx, cy + 60 * s, 'METIN_BILGI');

  // Label text
  dxf.setLayer('METIN_BILGI');
  dxf.addText(cx, cy - H / 2 - 90 * s, 45 * s, label, 'METIN_BILGI', 0, 'center', 'middle');
  dxf.addText(cx, cy - H / 2 - 145 * s, 35 * s, '617 x 1635 mm (GxY) - 51 kg', 'METIN_BILGI', 0, 'center', 'middle');
}

/**
 * Draw 2D Side Elevation / Cross-Section of Matsing Antenna at 45° Downtilt
 * H = 1635mm, D = 721mm, tilted at 45° with full mounting assembly, clamps, offset pipes and feeder cables
 */
function drawMatsingSideSection2D(dxf, cx, cy, s, tiltDeg = 45, label = 'MATSING 4-BEAM (45° EĞİMLİ YAN KESİT)', mountType = 'truss') {
  const H = 1635 * s;
  const D = 721 * s;
  const rad = tiltDeg * Math.PI / 180;
  const cosT = Math.cos(rad);
  const sinT = Math.sin(rad);

  // CLOCKWISE Rotation helper around center (cx, cy):
  // lx: along antenna depth (-D/2 = rear spine, +D/2 = front convex lens)
  // ly: along antenna height (-H/2 = bottom cap, +H/2 = top cap)
  //
  // Facing towards +X (forward) and tilted 45° DOWNWARDS (-Y) towards the field/pitch:
  // x = cx + lx * cosT + ly * sinT
  // y = cy - lx * sinT + ly * cosT
  const rot = (lx, ly) => {
    return {
      x: cx + lx * cosT + ly * sinT,
      y: cy - lx * sinT + ly * cosT
    };
  };

  dxf.setLayer('EKP_MATSING_ANTEN');

  // 1. Antenna Body Polygon (Curved front lens, chamfered rear, flat spine)
  const halfD = D / 2;
  const halfH = H / 2;

  // Key corner points of antenna profile
  const pFrontTop = rot(halfD, halfH * 0.85);
  const pFrontNose = rot(halfD + 40 * s, 0);
  const pFrontBot = rot(halfD, -halfH * 0.85);
  const pTopCapRight = rot(halfD - 50 * s, halfH);
  const pTopCapLeft = rot(-halfD + 40 * s, halfH);
  const pBotCapRight = rot(halfD - 50 * s, -halfH);
  const pBotCapLeft = rot(-halfD + 40 * s, -halfH);
  const pSpineTop = rot(-halfD, halfH * 0.95);
  const pSpineBot = rot(-halfD, -halfH * 0.95);

  // Radome outline
  dxf.addLine(pTopCapLeft.x, pTopCapLeft.y, pTopCapRight.x, pTopCapRight.y);
  dxf.addLine(pTopCapRight.x, pTopCapRight.y, pFrontTop.x, pFrontTop.y);
  dxf.addLine(pFrontTop.x, pFrontTop.y, pFrontNose.x, pFrontNose.y);
  dxf.addLine(pFrontNose.x, pFrontNose.y, pFrontBot.x, pFrontBot.y);
  dxf.addLine(pFrontBot.x, pFrontBot.y, pBotCapRight.x, pBotCapRight.y);
  dxf.addLine(pBotCapRight.x, pBotCapRight.y, pBotCapLeft.x, pBotCapLeft.y);
  dxf.addLine(pBotCapLeft.x, pBotCapLeft.y, pSpineBot.x, pSpineBot.y);
  dxf.addLine(pSpineBot.x, pSpineBot.y, pSpineTop.x, pSpineTop.y);
  dxf.addLine(pSpineTop.x, pSpineTop.y, pTopCapLeft.x, pTopCapLeft.y);

  // Radome spherical lens internal convex arcs
  const pLensArc1 = rot(halfD * 0.5, halfH * 0.6);
  const pLensArc2 = rot(halfD * 0.5, -halfH * 0.6);
  dxf.addLine(pLensArc1.x, pLensArc1.y, rot(halfD * 0.7, 0).x, rot(halfD * 0.7, 0).y);
  dxf.addLine(rot(halfD * 0.7, 0).x, rot(halfD * 0.7, 0).y, pLensArc2.x, pLensArc2.y);

  // 2. Rear Aluminum Chassis Spine Plate (-halfD)
  dxf.setLayer('CELIK_KIRIS_KOLON');
  const pSpineThickTop = rot(-halfD - 20 * s, halfH * 0.95);
  const pSpineThickBot = rot(-halfD - 20 * s, -halfH * 0.95);
  dxf.addLine(pSpineThickTop.x, pSpineThickTop.y, pSpineTop.x, pSpineTop.y);
  dxf.addLine(pSpineThickTop.x, pSpineThickTop.y, pSpineThickBot.x, pSpineThickBot.y);
  dxf.addLine(pSpineThickBot.x, pSpineThickBot.y, pSpineBot.x, pSpineBot.y);

  // 3. Central Mounting Mast Pipe (Ø76.2mm x 1800mm) running along spine on REAR
  const mastPipeR = 38.1 * s;
  const pMastTop = rot(-halfD - 20 * s - mastPipeR, halfH * 1.05);
  const pMastBot = rot(-halfD - 20 * s - mastPipeR, -halfH * 1.05);
  dxf.setLayer('MONTAJ_BORULARI');
  const pMastW1_T = rot(-halfD - 20 * s, halfH * 1.05);
  const pMastW1_B = rot(-halfD - 20 * s, -halfH * 1.05);
  const pMastW2_T = rot(-halfD - 20 * s - mastPipeR * 2, halfH * 1.05);
  const pMastW2_B = rot(-halfD - 20 * s - mastPipeR * 2, -halfH * 1.05);
  dxf.addLine(pMastW1_T.x, pMastW1_T.y, pMastW1_B.x, pMastW1_B.y);
  dxf.addLine(pMastW2_T.x, pMastW2_T.y, pMastW2_B.x, pMastW2_B.y);
  dxf.addLine(pMastTop.x, pMastTop.y, pMastBot.x, pMastBot.y); // center axis

  // 4. Top & Bottom Heavy-Duty Pipe Brackets (at ly = ±0.35 * H) on REAR
  [-halfH * 0.35, halfH * 0.35].forEach(by => {
    dxf.setLayer('CELIK_KIRIS_KOLON');
    const pB1 = rot(-halfD - 20 * s, by - 50 * s);
    const pB2 = rot(-halfD - 20 * s, by + 50 * s);
    const pB3 = rot(-halfD - 20 * s - mastPipeR * 2 - 25 * s, by + 30 * s);
    const pB4 = rot(-halfD - 20 * s - mastPipeR * 2 - 25 * s, by - 30 * s);
    dxf.addLine(pB1.x, pB1.y, pB2.x, pB2.y);
    dxf.addLine(pB2.x, pB2.y, pB3.x, pB3.y);
    dxf.addLine(pB3.x, pB3.y, pB4.x, pB4.y);
    dxf.addLine(pB4.x, pB4.y, pB1.x, pB1.y);
    // U-bolt circle around mast pipe
    const pBolt = rot(-halfD - 20 * s - mastPipeR, by);
    dxf.addCircle(pBolt.x, pBolt.y, mastPipeR + 8 * s);
  });

  // 5. Crossover Clamps & 2 Vertical Drop Offset Pipes (Ø70mm)
  // Two crossover clamps on mast pipe at lower and upper bracket stations on REAR
  const pClamp1 = rot(-halfD - 20 * s - mastPipeR, -halfH * 0.35); // lower clamp (rear-lower)
  const pClamp2 = rot(-halfD - 20 * s - mastPipeR, halfH * 0.35);  // upper clamp (rear-upper)

  dxf.setLayer('CELIK_KIRIS_KOLON');
  [pClamp1, pClamp2].forEach(p => {
    dxf.addRect(p.x - 70 * s, p.y - 60 * s, 140 * s, 120 * s);
  });

  // Vertical drop pipes rising straight UP (+Y in drawing)
  const dropPipeR = 35 * s;
  const pDrop1TopY = cy + 2400 * s;
  const pDrop2TopY = cy + 2400 * s;

  dxf.setLayer('MONTAJ_BORULARI');
  // Lower vertical drop pipe (rises straight UP behind antenna)
  dxf.addRect(pClamp1.x - dropPipeR, pClamp1.y, dropPipeR * 2, (pDrop1TopY - pClamp1.y));
  // Upper vertical drop pipe (rises straight UP behind antenna)
  dxf.addRect(pClamp2.x - dropPipeR, pClamp2.y, dropPipeR * 2, (pDrop2TopY - pClamp2.y));

  // Horizontal bridging cross-member between the two drop pipes at the top
  dxf.setLayer('CELIK_KIRIS_KOLON');
  dxf.addRect(pClamp1.x - 80 * s, pDrop1TopY - 20 * s, (pClamp2.x - pClamp1.x) + 160 * s, 40 * s);

  // 6. Carrier Structure Connection at Top (Ø280mm Çatı Kordonu, Ø1500mm Silindir, Kedi Yolu)
  if (mountType === 'truss') {
    const carrierR = 140 * s; // Ø28cm çatı makası ana silindiri
    const carrierAxis = { x: (pClamp1.x + pClamp2.x) / 2, y: pDrop1TopY + 20 * s + carrierR };
    dxf.setLayer('MONTAJ_BORULARI');
    dxf.addCircle(carrierAxis.x, carrierAxis.y, carrierR);
    dxf.setLayer('CELIK_KIRIS_KOLON');
    dxf.addCircle(carrierAxis.x, carrierAxis.y, carrierR + 15 * s); // collar clamp
    dxf.addRect(carrierAxis.x - carrierR - 60 * s, carrierAxis.y - 30 * s, 40 * s, 60 * s); // lug
    dxf.addRect(carrierAxis.x + carrierR + 20 * s, carrierAxis.y - 30 * s, 40 * s, 60 * s); // lug
    // Diagonal wind bracing tie-rod from pClamp1 to carrier collar
    dxf.addLine(pClamp1.x, pClamp1.y + 100 * s, carrierAxis.x, carrierAxis.y - carrierR, 'CELIK_KIRIS_KOLON');
    dxf.setLayer('METIN_BILGI');
    dxf.addText(carrierAxis.x + carrierR + 70 * s, carrierAxis.y, 40 * s, 'ÇATI MAKASI ANA BORUSU (Ø280mm)', 'METIN_BILGI', 0, 'left', 'middle');
    dxf.addText(pClamp1.x - 50 * s, (pClamp1.y + pDrop1TopY) / 2, 35 * s, '2x Ø70mm OFSET DÜŞEY BORU', 'METIN_BILGI', 0, 'right', 'middle');
    dxf.addText(pClamp2.x + 80 * s, pClamp2.y, 32 * s, 'ÇAPRAZ GEÇİŞ KELEPÇESİ (M14)', 'METIN_BILGI', 0, 'left', 'middle');
  } else if (mountType === 'cylinder') {
    const cylR = 750 * s; // Ø1500mm dev silindir
    const cylAxis = { x: pClamp1.x - 150 * s, y: cy + 2400 * s + cylR };
    dxf.setLayer('MONTAJ_BORULARI');
    dxf.addCircle(cylAxis.x, cylAxis.y, cylR);
    dxf.setLayer('CELIK_KIRIS_KOLON');
    dxf.addCircle(cylAxis.x, cylAxis.y, cylR + 45 * s); // 360° clamp collar
    // Heavy duty vertical drop mast Ø114mm x 2090mm
    const mainDropR = 57 * s;
    dxf.setLayer('MONTAJ_BORULARI');
    dxf.addRect(pClamp1.x - mainDropR, pClamp1.y - 80 * s, mainDropR * 2, (cylAxis.y - cylR) - (pClamp1.y - 80 * s));
    // Cantilever bracket arm to upper clamp
    dxf.setLayer('CELIK_KIRIS_KOLON');
    dxf.addRect(pClamp1.x, pClamp2.y - 35 * s, (pClamp2.x - pClamp1.x) + 70 * s, 70 * s);
    dxf.setLayer('METIN_BILGI');
    dxf.addText(cylAxis.x, cylAxis.y, 60 * s, 'SKORBOARD DEV BORU (Ø1500mm)', 'METIN_BILGI', 0, 'center', 'middle');
    dxf.addText(cylAxis.x, cylAxis.y - 100 * s, 40 * s, '360° Çember Kelepçe Bileziği (M24 Civatalı)', 'METIN_BILGI', 0, 'center', 'middle');
    dxf.addText(pClamp1.x - 80 * s, (pClamp1.y + cylAxis.y - cylR) / 2, 35 * s, 'Ø114mm x 2090mm TAŞIYICI BORU', 'METIN_BILGI', 0, 'right', 'middle');
    dxf.addText(pClamp2.x + 80 * s, pClamp2.y, 32 * s, 'MAFSALLI SABİTLEME KELEPÇESİ', 'METIN_BILGI', 0, 'left', 'middle');
  } else if (mountType === 'catwalk') {
    const yWalk = cy + 2000 * s;
    // Catwalk walkway grating & steel beam
    dxf.setLayer('ZEMIN_PLATFORM');
    dxf.addRect(pClamp1.x - 650 * s, yWalk, 900 * s, 45 * s); // grating floor
    dxf.addRect(pClamp1.x + 230 * s, yWalk + 45 * s, 20 * s, 150 * s); // toe plate right
    dxf.addRect(pClamp1.x - 650 * s, yWalk + 45 * s, 20 * s, 150 * s); // toe plate left
    // Safety railing (1100mm high)
    dxf.setLayer('CELIK_KIRIS_KOLON');
    dxf.addLine(pClamp1.x + 240 * s, yWalk + 45 * s, pClamp1.x + 240 * s, yWalk + 1145 * s);
    dxf.addLine(pClamp1.x - 640 * s, yWalk + 45 * s, pClamp1.x - 640 * s, yWalk + 1145 * s);
    dxf.addLine(pClamp1.x - 640 * s, yWalk + 1145 * s, pClamp1.x + 240 * s, yWalk + 1145 * s); // top rail
    dxf.addLine(pClamp1.x - 640 * s, yWalk + 595 * s, pClamp1.x + 240 * s, yWalk + 595 * s); // mid rail
    // Ø45.7cm ($R = 228.5 * s$) silindir boru
    const cyl45R = 228.5 * s;
    const xCyl45 = pClamp1.x - 380 * s;
    const yCyl45 = yWalk - 300 * s;
    dxf.setLayer('MONTAJ_BORULARI');
    dxf.addCircle(xCyl45, yCyl45, cyl45R);
    dxf.addCircle(xCyl45, yCyl45, cyl45R + 15 * s);
    // Drop hanger pipes connecting to antenna rear clamps pClamp1 and pClamp2
    dxf.addRect(pClamp1.x - dropPipeR, pClamp1.y, dropPipeR * 2, yWalk - pClamp1.y);
    dxf.addRect(pClamp2.x - dropPipeR, pClamp2.y, dropPipeR * 2, yWalk - pClamp2.y);
    dxf.setLayer('METIN_BILGI');
    dxf.addText(pClamp1.x - 200 * s, yWalk + 600 * s, 40 * s, 'KEDİ YOLU PLATFORMU (900mm)', 'METIN_BILGI', 0, 'center', 'middle');
    dxf.addText(xCyl45, yCyl45 - cyl45R - 60 * s, 35 * s, 'Ø45.7cm SİLİNDİR TAŞIYICI BORU', 'METIN_BILGI', 0, 'center', 'middle');
  }

  // 7. 28 RF Connector Ports on rear chamfered surface & Feeder Cable bundle loops
  dxf.setLayer('KABLO_TAVALARI');
  for (let i = 0; i < 7; i++) {
    const pPort = rot(-halfD + 80 * s + i * 20 * s, -halfH * 0.40 + i * 80 * s);
    dxf.addCircle(pPort.x, pPort.y, 10 * s);
    // Cable loop curving down slightly (drip loop) then rising to cable tray behind drop pipe
    dxf.addLine(pPort.x, pPort.y, pPort.x - 60 * s, pPort.y - 80 * s);
    dxf.addLine(pPort.x - 60 * s, pPort.y - 80 * s, pClamp1.x - 80 * s, pClamp1.y + i * 50 * s);
  }
  // Vertical feeder cable tray route running up
  dxf.addLine(pClamp1.x - 80 * s, pClamp1.y, pClamp1.x - 80 * s, cy + 2200 * s);
  dxf.addLine(pClamp1.x - 50 * s, pClamp1.y, pClamp1.x - 50 * s, cy + 2200 * s);
  dxf.addText(pClamp1.x - 100 * s, pClamp1.y + 120 * s, 35 * s, '28x 1/2" FEEDER KABLO DEMETİ (4.3-10 DIN)', 'KABLO_TAVALARI', 0, 'right', 'middle');

  // 8. Downtilt Angle Dimension Arc & Text (45° forward and down)
  dxf.setLayer('OLCULER');
  const pCenter = rot(0, 0); // (cx, cy)
  // Horizontal reference ray pointing forward
  dxf.addLine(pCenter.x, pCenter.y, pCenter.x + 1000 * s, pCenter.y);
  // 45° Tilted Boresight ray pointing forward and down into the 4th quadrant
  const pBoresightEnd = {
    x: pCenter.x + 1000 * s * cosT,
    y: pCenter.y - 1000 * s * sinT
  };
  dxf.addLine(pCenter.x, pCenter.y, pBoresightEnd.x, pBoresightEnd.y);
  // Arrowhead at tip
  dxf.addLine(pBoresightEnd.x, pBoresightEnd.y, pBoresightEnd.x - 60 * s, pBoresightEnd.y + 20 * s);
  dxf.addLine(pBoresightEnd.x, pBoresightEnd.y, pBoresightEnd.x - 20 * s, pBoresightEnd.y + 60 * s);
  // Downtilt Arc / Label
  dxf.addText(pCenter.x + 480 * s, pCenter.y - 180 * s, 45 * s, `${tiltDeg}° DOWNTILT (YERE VE SAHAYA EĞİM)`, 'OLCULER', 0, 'left', 'middle');

  // 9. Overall Height and Depth Dimensions
  // Boy (1635 mm) dimension along antenna length on upper-left (behind antenna)
  const normX = -cosT * 250 * s;
  const normY = sinT * 250 * s;
  dxf.addLine(pBotCapLeft.x, pBotCapLeft.y, pBotCapLeft.x + normX, pBotCapLeft.y + normY);
  dxf.addLine(pTopCapLeft.x, pTopCapLeft.y, pTopCapLeft.x + normX, pTopCapLeft.y + normY);
  dxf.addLine(pBotCapLeft.x + normX, pBotCapLeft.y + normY, pTopCapLeft.x + normX, pTopCapLeft.y + normY);
  const midH_X = (pBotCapLeft.x + pTopCapLeft.x) / 2 + normX;
  const midH_Y = (pBotCapLeft.y + pTopCapLeft.y) / 2 + normY;
  dxf.addText(midH_X - 40 * s, midH_Y + 40 * s, 45 * s, '1635 mm (BOY)', 'OLCULER', 45, 'center', 'middle');

  // Derinlik (721 mm) dimension across antenna depth
  const depthNormX = sinT * 180 * s;
  const depthNormY = cosT * 180 * s;
  dxf.addLine(pSpineTop.x, pSpineTop.y, pSpineTop.x + depthNormX, pSpineTop.y + depthNormY);
  dxf.addLine(pFrontTop.x, pFrontTop.y, pFrontTop.x + depthNormX, pFrontTop.y + depthNormY);
  dxf.addLine(pSpineTop.x + depthNormX, pSpineTop.y + depthNormY, pFrontTop.x + depthNormX, pFrontTop.y + depthNormY);
  const midD_X = (pSpineTop.x + pFrontTop.x) / 2 + depthNormX;
  const midD_Y = (pSpineTop.y + pFrontTop.y) / 2 + depthNormY;
  dxf.addText(midD_X + 20 * s, midD_Y + 40 * s, 45 * s, '721 mm (DERİNLİK)', 'OLCULER', -45, 'center', 'middle');

  // Title and label
  dxf.setLayer('METIN_BILGI');
  dxf.addText(cx, cy - halfH - 250 * s, 45 * s, label, 'METIN_BILGI', 0, 'center', 'middle');
  dxf.addText(cx, cy - halfH - 310 * s, 35 * s, 'Mekanik İmalat ve Taşıyıcı Askı Profili (Öne ve Yere 45° Eğim)', 'METIN_BILGI', 0, 'center', 'middle');
}

/**
 * Draw 2D Top View / Plan Section of Matsing Antenna
 * W = 617mm, D = 721mm, convex front, rear spine, mounting clamp, and 4 RF Beam rays
 */
function drawMatsingTopPlan2D(dxf, cx, cy, s, azimuthDeg = 0, label = 'MATSING 4-BEAM (PLAN KESİTİ)') {
  const W = 617 * s;
  const D = 721 * s;
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
  const spineHalfW = 130 * s;
  const chamferY = -halfD + 180 * s;

  dxf.setLayer('EKP_MATSING_ANTEN');

  // Lens Profile Outline in Top View
  // Front convex curve points
  const pRearLeft = rot(-spineHalfW, -halfD);
  const pRearRight = rot(spineHalfW, -halfD);
  const pWingRight = rot(halfW, chamferY);
  const pWingLeft = rot(-halfW, chamferY);
  const pFrontNose = rot(0, halfD);
  const pFrontRight = rot(halfW * 0.75, halfD * 0.65);
  const pFrontLeft = rot(-halfW * 0.75, halfD * 0.65);

  // Radome perimeter
  dxf.addLine(pRearLeft.x, pRearLeft.y, pRearRight.x, pRearRight.y);
  dxf.addLine(pRearRight.x, pRearRight.y, pWingRight.x, pWingRight.y);
  dxf.addLine(pWingRight.x, pWingRight.y, pFrontRight.x, pFrontRight.y);
  dxf.addLine(pFrontRight.x, pFrontRight.y, pFrontNose.x, pFrontNose.y);
  dxf.addLine(pFrontNose.x, pFrontNose.y, pFrontLeft.x, pFrontLeft.y);
  dxf.addLine(pFrontLeft.x, pFrontLeft.y, pWingLeft.x, pWingLeft.y);
  dxf.addLine(pWingLeft.x, pWingLeft.y, pRearLeft.x, pRearLeft.y);

  // Spherical lens interior circles
  dxf.addCircle(rot(0, 0).x, rot(0, 0).y, halfW * 0.85);
  dxf.addCircle(rot(0, 0).x, rot(0, 0).y, halfW * 0.55);

  // Rear mounting bracket & mast pipe (Ø76.2mm)
  dxf.setLayer('MONTAJ_BORULARI');
  const pipeR = 38.1 * s;
  const pPipeCenter = rot(0, -halfD - pipeR - 15 * s);
  dxf.addCircle(pPipeCenter.x, pPipeCenter.y, pipeR);
  // Bracket clamp ears & U-bolt
  dxf.setLayer('CELIK_KIRIS_KOLON');
  dxf.addRect(pPipeCenter.x - 75 * s, pPipeCenter.y - 12 * s, 150 * s, 24 * s);
  dxf.addCircle(pPipeCenter.x - 55 * s, pPipeCenter.y, 6 * s);
  dxf.addCircle(pPipeCenter.x + 55 * s, pPipeCenter.y, 6 * s);

  // 4-Beam Radiating Rays (Beams 1, 2, 3, 4 at -30°, -10°, +10°, +30°)
  dxf.setLayer('OLCULER');
  [-30, -10, 10, 30].forEach((bAng, idx) => {
    const bRad = (azimuthDeg + bAng) * Math.PI / 180;
    const rayLen = 900 * s;
    const pRayEnd = {
      x: cx + Math.sin(bRad) * rayLen,
      y: cy + Math.cos(bRad) * rayLen
    };
    dxf.addLine(rot(0, 0).x, rot(0, 0).y, pRayEnd.x, pRayEnd.y);
    dxf.addText(pRayEnd.x, pRayEnd.y, 30 * s, `BEAM ${idx + 1}`, 'OLCULER', 0, 'center', 'middle');
  });

  // Dimensions
  dxf.addDimension(pWingLeft.x, pWingLeft.y - 80 * s, pWingRight.x, pWingRight.y - 80 * s, -120 * s, '617 mm (GENİŞLİK)');
  dxf.addDimension(pRearLeft.x - 80 * s, pRearLeft.y, pFrontNose.x - 80 * s, pFrontNose.y, -120 * s, '721 mm (DERİNLİK)');

  // Title
  dxf.setLayer('METIN_BILGI');
  dxf.addText(cx, cy - halfD - 180 * s, 45 * s, label, 'METIN_BILGI', 0, 'center', 'middle');
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
// 2. MASTER 2D SECTIONS GENERATOR FOR ALL LOCATIONS (TEKLİ, 2'Lİ, 3'LÜ)
// =========================================================================
function generateMatsingSections2D(units = 'mm') {
  const isMm = units === 'mm';
  const s = isMm ? 1 : 0.001;
  const dxf = new DxfBuilder(units);

  // =======================================================================
  // BÖLÜM 1: TEKLİ (SINGLE) MATSİNG ANTEN KESİT VE GÖRÜNÜŞLERİ
  // =======================================================================
  const sec1Y = 17000 * s;
  // 1.1 Ön Kesit / Görünüş
  drawMatsingFrontView2D(dxf, -18000 * s, sec1Y, s, '1.1 TEKLİ ANTEN: ÖN KESİT / GÖRÜNÜŞ');

  // 1.2 Yan Kesit / 45° Eğimli Profil (Çatı Makası Askılı)
  drawMatsingSideSection2D(dxf, -12000 * s, sec1Y, s, 45, '1.2 TEKLİ ANTEN: YAN KESİT (45° DOWNTILT)', 'truss');

  // 1.3 Üstten Kesit / Plan Görünüşü
  drawMatsingTopPlan2D(dxf, -6000 * s, sec1Y, s, 0, '1.3 TEKLİ ANTEN: ÜSTTEN PLAN KESİTİ');

  // Bölüm Çerçevesi
  dxf.setLayer('METIN_BILGI');
  dxf.addRect(-21500 * s, sec1Y - 2600 * s, 18500 * s, 5400 * s, 'METIN_BILGI');
  dxf.addText(-21000 * s, sec1Y + 2500 * s, 180 * s, 'BÖLÜM 1: TEKLİ (SINGLE) MATSİNG 4-BEAM LENS ANTENİ KESİTLERİ (1:1 ÖLÇEK)', 'METIN_BILGI');

  // =======================================================================
  // BÖLÜM 2: 2'Lİ (DUAL) MATSİNG ANTEN KESİT VE GÖRÜNÜŞLERİ
  // =======================================================================
  const sec2Y = 17000 * s;
  const dX = 8500 * s;

  // 2.1 Ön Kesit / İkili Travers Montajı (Center spacing = 1400mm)
  const dSpacing = 1400 * s;
  drawMatsingFrontView2D(dxf, dX - dSpacing / 2, sec2Y, s, 'SOL ANTEN (ANT-1)');
  drawMatsingFrontView2D(dxf, dX + dSpacing / 2, sec2Y, s, 'SAĞ ANTEN (ANT-2)');

  // Yatay Çelik Taşıyıcı Travers (120x80x6mm Kutu Profil, L = 2500mm)
  dxf.setLayer('CELIK_KIRIS_KOLON');
  const traversW = 2500 * s;
  const traversH = 120 * s;
  const traversY = sec2Y + 1050 * s;
  dxf.addRect(dX - traversW / 2, traversY, traversW, traversH);
  dxf.addText(dX, traversY + traversH / 2, 45 * s, 'AĞIR HİZMET ÇELİK TRAVERS (120x80x6mm, L=2500mm)', 'CELIK_KIRIS_KOLON', 0, 'center', 'middle');

  // Ortak kablo tavası (travers arkasında)
  dxf.setLayer('KABLO_TAVALARI');
  dxf.addRect(dX - traversW / 2, traversY - 80 * s, traversW, 60 * s);
  dxf.addText(dX, traversY - 50 * s, 35 * s, '2x 28 = 56 ADET FEEDER KABLO TAVASI (500x100mm)', 'KABLO_TAVALARI', 0, 'center', 'middle');

  // Aks ve Açıklık Ölçüleri
  dxf.addDimension(dX - dSpacing / 2, sec2Y - 1000 * s, dX + dSpacing / 2, sec2Y - 1000 * s, -300 * s, '1400 mm (ANTEN AKS ARALIĞI)');
  dxf.addDimension(dX - dSpacing / 2 + 308.5 * s, sec2Y + 1200 * s, dX + dSpacing / 2 - 308.5 * s, sec2Y + 1200 * s, 250 * s, '783 mm (NET RF AÇIKLIĞI)');
  dxf.addDimension(dX - traversW / 2, traversY + 200 * s, dX + traversW / 2, traversY + 200 * s, 300 * s, '2500 mm (TRAVERS TOPLAM BOYU)');

  // 2.2 Yan Kesit / İkili Profil Görünüşü
  drawMatsingSideSection2D(dxf, 17500 * s, sec2Y, s, 45, '2.2 İKİLİ SİSTEM: YAN KESİT (PROFİL)', 'truss');

  // Bölüm Çerçevesi
  dxf.setLayer('METIN_BILGI');
  dxf.addRect(dX - traversW / 2 - 800 * s, sec2Y - 2600 * s, 14500 * s, 5400 * s, 'METIN_BILGI');
  dxf.addText(dX - traversW / 2 - 400 * s, sec2Y + 2500 * s, 180 * s, 'BÖLÜM 2: 2\'Lİ (DUAL) MATSİNG ANTEN KESİT VE TRAVERS MONTAJ PLANI', 'METIN_BILGI');

  // =======================================================================
  // BÖLÜM 3: 3'LÜ (TRIPLE) MATSİNG ANTEN KESİT VE GÖRÜNÜŞLERİ
  // =======================================================================
  const sec3Y = 8500 * s;
  const tX = -7000 * s;
  const tSpacing = 1300 * s;

  // 3.1 Ön Kesit / 3'lü Modüler Şasi (Sol, Merkez, Sağ Anten)
  drawMatsingFrontView2D(dxf, tX - tSpacing, sec3Y, s, 'SEKTÖR 1 (SOL)');
  drawMatsingFrontView2D(dxf, tX, sec3Y, s, 'SEKTÖR 2 (MERKEZ)');
  drawMatsingFrontView2D(dxf, tX + tSpacing, sec3Y, s, 'SEKTÖR 3 (SAĞ)');

  // 3'lü Modüler Kafes Kiriş Travers (140x100x8mm Kutu Profil, L = 3800mm)
  dxf.setLayer('CELIK_KIRIS_KOLON');
  const tTraversW = 3800 * s;
  const tTraversH = 140 * s;
  const tTraversY = sec3Y + 1050 * s;
  dxf.addRect(tX - tTraversW / 2, tTraversY, tTraversW, tTraversH);
  dxf.addText(tX, tTraversY + tTraversH / 2, 45 * s, 'AĞIR HİZMET 3\'LÜ KAFES TRAVERS (140x100x8mm, L=3800mm)', 'CELIK_KIRIS_KOLON', 0, 'center', 'middle');

  // 3'lü Askı Gergileri (Tie-Rods)
  dxf.addLine(tX - tTraversW / 2 + 100 * s, tTraversY + tTraversH, tX - tSpacing, tTraversY + 1200 * s);
  dxf.addLine(tX + tTraversW / 2 - 100 * s, tTraversY + tTraversH, tX + tSpacing, tTraversY + 1200 * s);

  // Aks Ölçüleri
  dxf.addDimension(tX - tSpacing, sec3Y - 1000 * s, tX, sec3Y - 1000 * s, -300 * s, '1300 mm');
  dxf.addDimension(tX, sec3Y - 1000 * s, tX + tSpacing, sec3Y - 1000 * s, -300 * s, '1300 mm');
  dxf.addDimension(tX - tSpacing, sec3Y - 1000 * s, tX + tSpacing, sec3Y - 1000 * s, -700 * s, '2600 mm (TOPLAM AKS AÇIKLIĞI)');

  // 3.2 3'lü Sistem Üstten Plan Kesiti (-15°, 0°, +15° Açısal Splay Dağılımı)
  const tPlanX = 4000 * s;
  drawMatsingTopPlan2D(dxf, tPlanX - 1100 * s, sec3Y + 300 * s, s, -15, 'ANT-1 (-15°)');
  drawMatsingTopPlan2D(dxf, tPlanX, sec3Y, s, 0, 'ANT-2 (0°)');
  drawMatsingTopPlan2D(dxf, tPlanX + 1100 * s, sec3Y + 300 * s, s, 15, 'ANT-3 (+15°)');

  // Bölüm Çerçevesi
  dxf.setLayer('METIN_BILGI');
  dxf.addRect(tX - tTraversW / 2 - 600 * s, sec3Y - 2600 * s, 18500 * s, 5400 * s, 'METIN_BILGI');
  dxf.addText(tX - tTraversW / 2 - 300 * s, sec3Y + 2500 * s, 180 * s, 'BÖLÜM 3: 3\'LÜ (TRIPLE) MATSİNG ANTEN KESİT, DİZİ VE AÇISAL KAPSAMA PLANI', 'METIN_BILGI');

  // =======================================================================
  // BÖLÜM 4: LOKASYON BAZLI ÖZEL MONTAJ KESİTLERİ (A, B, C)
  // =======================================================================
  const sec4Y = 0 * s;

  // LOKASYON A: 45M ÇATI MAKASI ASILI MONTAJ KESİTİ (MARATON & ALAN 1/3)
  const locAX = -14000 * s;
  drawMatsingSideSection2D(dxf, locAX, sec4Y, s, 45, 'LOKASYON A: 45m ÇATI MAKASI ASKILI KESİT', 'truss');

  // LOKASYON B: SKORBOARD Ø1500MM DEV BORU ÇEMBER MONTAJ KESİTİ (ALAN 2)
  const locBX = -4000 * s;
  drawMatsingSideSection2D(dxf, locBX, sec4Y, s, 45, 'LOKASYON B: SKORBOARD Ø1500mm BORU ÇEMBER KESİTİ', 'cylinder');

  // LOKASYON C: ÇATI UCU KEDİ YOLU VE Ø45.7CM SİLİNDİR YANI KESİTİ
  const locCX = 6000 * s;
  drawMatsingSideSection2D(dxf, locCX, sec4Y, s, 45, 'LOKASYON C: ÇATI UCU KEDİ YOLU & Ø45.7cm SİLİNDİR KESİTİ', 'catwalk');

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
    { name: 'Matsing 4-Beam Çok Hüzmeli Lens Anteni (MS-MBA-4.4.2)', dim: '617x721x1635 mm', qty: 'Tipik' },
    { name: 'Tekli Askı Borusu (3" Galvanizli Çelik Direk)', dim: 'Ø76.2mm x 1800mm', qty: '1 / Anten' },
    { name: 'Çift Düşey Ofset Askı Boruları (Alt: 1.15m, Üst: 1.55m)', dim: 'Ø70mm Galvaniz Çelik', qty: '2 / Anten' },
    { name: 'Ağır Hizmet Çapraz Geçiş Kelepçeleri (Crossover Clamps)', dim: '160x120x160 mm / M14', qty: '2 / Anten' },
    { name: 'Anten Sırtı Mafsallı Eğim Kelepçesi (0-45° Tilt)', dim: 'Ø76.2mm U-Boltlu', qty: '2 / Anten' },
    { name: '2\'li İkili Montaj Traversi (Kutu Profil)', dim: '120x80x6mm x 2500mm', qty: 'Opsiyon' },
    { name: '3\'lü Modüler Kafes Kiriş Şasisi (Ağır Hizmet)', dim: '140x100x8mm x 3800mm', qty: 'Opsiyon' },
    { name: 'Skorboard Ø1500mm 360° Çember Kelepçe Bileziği', dim: 'Ø1590x200x20 mm', qty: 'Skorboard' },
    { name: 'Skorboard Ana Düşey Taşıyıcı Boru', dim: 'Ø114mm x 2090mm', qty: 'Skorboard' },
    { name: '1/2" Feeder Jumper Kablo Seti (4.3-10 DIN Dişi)', dim: '28 Port / Anten', qty: '28 / Anten' }
  ];

  addBomTable(dxf, bom, bomX, bomY, units);
  addTitleBlock(dxf, 'MATSİNG 4-BEAM LENS ANTENLERİ TÜM LOKASYONLAR KESİTLERİ (TEKLİ, 2\'Lİ, 3\'LÜ)', 'DETAY KESİT PAFTASI', isMm ? '1:1 mm' : '1:1 m', units, bomX, sec4Y - 2400 * s);

  return dxf.toDxfString();
}

// =========================================================================
// 3. MASTER 3D MODEL GENERATOR FOR MATSING ANTENNA ASSEMBLIES
// =========================================================================

/**
 * 3D Solid Model of a single Matsing 4-Beam Antenna Assembly at 45° Downtilt
 */
function addDetailedMatsing3DAssembly(dxf, posX, posY, posZ, s, tiltDeg = 45, azimuthDeg = 0, label = 'MATSING 3D') {
  const H = 1635 * s;
  const W = 617 * s;
  const D = 721 * s;
  const radT = tiltDeg * Math.PI / 180;
  const cosT = Math.cos(radT);
  const sinT = Math.sin(radT);
  const radA = azimuthDeg * Math.PI / 180;
  const cosA = Math.cos(radA);
  const sinA = Math.sin(radA);

  // Rotation helper for tilted antenna geometry:
  // Local: lx (width), ly (height along antenna), lz (depth towards front lens)
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

  // 1. Faceted 12-sided Spherical Lens Radome Body
  const numFacets = 12;
  const radomeHalfW = W / 2;
  const radomeHalfH = H / 2;
  const radomeHalfD = D / 2;

  // Front spherical convex face points
  for (let i = 0; i < numFacets; i++) {
    const a1 = (i / numFacets) * Math.PI - Math.PI / 2;
    const a2 = ((i + 1) / numFacets) * Math.PI - Math.PI / 2;
    const x1 = Math.sin(a1) * radomeHalfW;
    const x2 = Math.sin(a2) * radomeHalfW;
    const z1 = Math.cos(a1) * radomeHalfD;
    const z2 = Math.cos(a2) * radomeHalfD;

    const pBot1 = rot3D(x1, -radomeHalfH, z1);
    const pBot2 = rot3D(x2, -radomeHalfH, z2);
    const pTop2 = rot3D(x2, radomeHalfH, z2);
    const pTop1 = rot3D(x1, radomeHalfH, z1);

    dxf.addFace3d(pBot1.x, pBot1.y, pBot1.z, pBot2.x, pBot2.y, pBot2.z, pTop2.x, pTop2.y, pTop2.z, pTop1.x, pTop1.y, pTop1.z, 'EKP_MATSING_ANTEN');
    dxf.addLine3d(pBot1.x, pBot1.y, pBot1.z, pBot2.x, pBot2.y, pBot2.z, 'EKP_MATSING_ANTEN');
    dxf.addLine3d(pTop1.x, pTop1.y, pTop1.z, pTop2.x, pTop2.y, pTop2.z, 'EKP_MATSING_ANTEN');
    dxf.addLine3d(pBot1.x, pBot1.y, pBot1.z, pTop1.x, pTop1.y, pTop1.z, 'EKP_MATSING_ANTEN');
  }

  // Rear Chamfered Wing Faces & Flat Back Spine
  const pRearL_bot = rot3D(-radomeHalfW * 0.45, -radomeHalfH, -radomeHalfD);
  const pRearR_bot = rot3D(radomeHalfW * 0.45, -radomeHalfH, -radomeHalfD);
  const pRearR_top = rot3D(radomeHalfW * 0.45, radomeHalfH, -radomeHalfD);
  const pRearL_top = rot3D(-radomeHalfW * 0.45, radomeHalfH, -radomeHalfD);
  dxf.addFace3d(pRearL_bot.x, pRearL_bot.y, pRearL_bot.z, pRearR_bot.x, pRearR_bot.y, pRearR_bot.z,
                pRearR_top.x, pRearR_top.y, pRearR_top.z, pRearL_top.x, pRearL_top.y, pRearL_top.z, 'CELIK_KIRIS_KOLON');

  // 2. Central Rear Aluminum Spine Plate
  const pSpineBack_bot = rot3D(0, -radomeHalfH, -radomeHalfD - 20 * s);
  const pSpineBack_top = rot3D(0, radomeHalfH, -radomeHalfD - 20 * s);
  dxf.addLine3d(pSpineBack_bot.x, pSpineBack_bot.y, pSpineBack_bot.z, pSpineBack_top.x, pSpineBack_top.y, pSpineBack_top.z, 'CELIK_KIRIS_KOLON');

  // 3. Central Mast Mounting Pipe (Ø76.2mm x 1800mm) at 45° Tilt
  const mastR = 38.1 * s;
  const mastLen = 1800 * s;
  const pMastMid = rot3D(0, 0, -radomeHalfD - 20 * s - mastR);
  const pMastTop = rot3D(0, mastLen / 2, -radomeHalfD - 20 * s - mastR);
  const pMastBot = rot3D(0, -mastLen / 2, -radomeHalfD - 20 * s - mastR);

  // 8-segment cylinder for mast pipe
  for (let i = 0; i < 8; i++) {
    const a1 = (i / 8) * Math.PI * 2;
    const a2 = ((i + 1) / 8) * Math.PI * 2;
    const p1_top = rot3D(Math.sin(a1) * mastR, mastLen / 2, -radomeHalfD - 20 * s - mastR + Math.cos(a1) * mastR);
    const p2_top = rot3D(Math.sin(a2) * mastR, mastLen / 2, -radomeHalfD - 20 * s - mastR + Math.cos(a2) * mastR);
    const p2_bot = rot3D(Math.sin(a2) * mastR, -mastLen / 2, -radomeHalfD - 20 * s - mastR + Math.cos(a2) * mastR);
    const p1_bot = rot3D(Math.sin(a1) * mastR, -mastLen / 2, -radomeHalfD - 20 * s - mastR + Math.cos(a1) * mastR);
    dxf.addFace3d(p1_bot.x, p1_bot.y, p1_bot.z, p2_bot.x, p2_bot.y, p2_bot.z, p2_top.x, p2_top.y, p2_top.z, p1_top.x, p1_top.y, p1_top.z, 'MONTAJ_BORULARI');
  }

  // 4. Top & Bottom Heavy-Duty Tilt Brackets on Spine
  [-radomeHalfH * 0.35, radomeHalfH * 0.35].forEach(by => {
    const pB1 = rot3D(-80 * s, by - 40 * s, -radomeHalfD);
    const pB2 = rot3D(80 * s, by - 40 * s, -radomeHalfD);
    const pB3 = rot3D(80 * s, by + 40 * s, -radomeHalfD - mastR * 2 - 20 * s);
    const pB4 = rot3D(-80 * s, by + 40 * s, -radomeHalfD - mastR * 2 - 20 * s);
    dxf.addFace3d(pB1.x, pB1.y, pB1.z, pB2.x, pB2.y, pB2.z, pB3.x, pB3.y, pB3.z, pB4.x, pB4.y, pB4.z, 'CELIK_KIRIS_KOLON');
  });

  // 5. Crossover Clamps & 2 Vertical Drop Offset Pipes (Ø70mm)
  const pClampLower = rot3D(0, -radomeHalfH * 0.35, -radomeHalfD - 20 * s - mastR);
  const pClampUpper = rot3D(0, radomeHalfH * 0.35, -radomeHalfD - 20 * s - mastR);

  // Vertical drop pipes rising straight UP (CAD Z)
  const dropR = 35 * s;
  const dropTopZ = posZ + 2400 * s;

  // Lower vertical drop pipe
  dxf.addSolidBox3D(pClampLower.x - dropR, pClampLower.y - dropR, pClampLower.z,
                    pClampLower.x + dropR, pClampLower.y + dropR, dropTopZ, 'MONTAJ_BORULARI');

  // Upper vertical drop pipe
  dxf.addSolidBox3D(pClampUpper.x - dropR, pClampUpper.y - dropR, pClampUpper.z,
                    pClampUpper.x + dropR, pClampUpper.y + dropR, dropTopZ, 'MONTAJ_BORULARI');

  // Crossover clamp solid boxes
  [pClampLower, pClampUpper].forEach(pc => {
    dxf.addSolidBox3D(pc.x - 70 * s, pc.y - 70 * s, pc.z - 60 * s,
                      pc.x + 70 * s, pc.y + 70 * s, pc.z + 60 * s, 'CELIK_KIRIS_KOLON');
  });

  // Top label
  dxf.addText(posX, posY, 60 * s, label, 'METIN_BILGI', 0, 'center', 'middle');
}

function generateMatsingSections3D(units = 'mm') {
  const isMm = units === 'mm';
  const s = isMm ? 1 : 0.001;
  const dxf = new DxfBuilder(units);

  // 1. TEKLİ (SINGLE) MATSİNG ANTEN 3D MONTAJI (Çatı Makası Askılı)
  addDetailedMatsing3DAssembly(dxf, -14000 * s, 0, 0, s, 45, 0, '1. TEKLİ MATSİNG ANTEN (45° ÇATI ASKISI)');

  // 2. 2'Lİ (DUAL) MATSİNG ANTEN 3D MONTAJI (Çiftli Travers Şasili)
  const dSpacing = 1400 * s;
  const dX = -4000 * s;
  addDetailedMatsing3DAssembly(dxf, dX - dSpacing / 2, 0, 0, s, 45, 0, 'ANT-1 (SOL)');
  addDetailedMatsing3DAssembly(dxf, dX + dSpacing / 2, 0, 0, s, 45, 0, 'ANT-2 (SAĞ)');
  // Yatay Çelik Travers (120x80x6mm box profile, L = 2500mm)
  dxf.addSolidBox3D(dX - 1250 * s, -60 * s, 1050 * s, dX + 1250 * s, 60 * s, 1170 * s, 'CELIK_KIRIS_KOLON');

  // 3. 3'LÜ (TRIPLE) MATSİNG ANTEN 3D MONTAJI (3'lü Modüler Kafes Şasisi)
  const tSpacing = 1300 * s;
  const tX = 8000 * s;
  addDetailedMatsing3DAssembly(dxf, tX - tSpacing, 150 * s, 0, s, 45, -15, 'ANT-1 (-15°)');
  addDetailedMatsing3DAssembly(dxf, tX, 0, 0, s, 45, 0, 'ANT-2 (0°)');
  addDetailedMatsing3DAssembly(dxf, tX + tSpacing, 150 * s, 0, s, 45, 15, 'ANT-3 (+15°)');
  // 3'lü Ağır Hizmet Kafes Travers Kirişi (L = 3800mm)
  dxf.addSolidBox3D(tX - 1900 * s, -70 * s, 1050 * s, tX + 1900 * s, 70 * s, 1190 * s, 'CELIK_KIRIS_KOLON');

  // 4. SKORBOARD Ø1500MM DEV BORU ÜZERİ ASILI 3D MATSİNG ANTENİ
  const skX = 18000 * s;
  // Ø1500mm dev silindir boru (L = 4000mm)
  const cylR = 750 * s;
  const cylZ = 2800 * s;
  const segs = 16;
  for (let i = 0; i < segs; i++) {
    const a1 = (i / segs) * Math.PI * 2;
    const a2 = ((i + 1) % segs) * Math.PI * 2;
    const y1 = Math.sin(a1) * cylR;
    const z1 = cylZ + Math.cos(a1) * cylR;
    const y2 = Math.sin(a2) * cylR;
    const z2 = cylZ + Math.cos(a2) * cylR;
    dxf.addFace3d(skX - 2000 * s, y1, z1, skX + 2000 * s, y1, z1, skX + 2000 * s, y2, z2, skX - 2000 * s, y2, z2, 'MONTAJ_BORULARI');
  }
  // 360° Çember bilezik
  dxf.addSolidBox3D(skX - 150 * s, -cylR - 45 * s, cylZ - 45 * s, skX + 150 * s, cylR + 45 * s, cylZ + 45 * s, 'CELIK_KIRIS_KOLON');
  // Düşey sarkıtma borusu (Ø114mm x 2090mm)
  dxf.addSolidBox3D(skX - 57 * s, -57 * s, cylZ - cylR - 2090 * s, skX + 57 * s, 57 * s, cylZ - cylR, 'MONTAJ_BORULARI');
  // Anten montajı
  addDetailedMatsing3DAssembly(dxf, skX, 0, cylZ - cylR - 1200 * s, s, 45, 0, 'SKORBOARD Ø1500mm BORU ASILI MATSİNG');

  return dxf.toDxfString();
}

// Module Exports
module.exports = {
  generateMatsingSections2D,
  generateMatsingSections3D
};

if (require.main === module) {
  console.log('Generating Matsing Antenna DXFs (Tekli, 2\'li, 3\'lü, Tüm Lokasyonlar)...');
  const matsingTasks = [
    { name: '06_MATSING_ANTEN_TUM_LOKASYONLAR_TEKLI_2LI_3LU_KESITLERI_2D_Plan_ve_Kesit', fn: generateMatsingSections2D },
    { name: '06_MATSING_ANTEN_TUM_LOKASYONLAR_TEKLI_2LI_3LU_KESITLERI_3D_Model', fn: generateMatsingSections3D }
  ];

  matsingTasks.forEach(t => {
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
  console.log('Matsing DXF generation completed.');
}
