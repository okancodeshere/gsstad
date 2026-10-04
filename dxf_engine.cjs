const Drawing = require('dxf-writer');
const Polyline = require('dxf-writer/src/Polyline');

class DxfBuilder {
  constructor(units = 'mm') {
    this.units = units;
    this.d = new Drawing();
    this.d.setUnits(units === 'mm' ? 'Millimeters' : 'Meters');
    this.s = units === 'mm' ? 1000 : 1; // 1 Three.js meter in units

    // 1. Base Structural Layers
    this.addLayer('ZEMIN_PLATFORM', 8, 'CONTINUOUS');       // Dark gray: Catwalk floor, concrete kaide, grating
    this.addLayer('KORKULUK_KAPI', Drawing.ACI.CYAN, 'CONTINUOUS'); // Cyan: Railings, sliding doors, perfore panels
    this.addLayer('CELIK_KIRIS_KOLON', 9, 'CONTINUOUS');    // Light gray: Beams, columns, scoreboard frame
    this.addLayer('MONTAJ_BORULARI', Drawing.ACI.YELLOW, 'CONTINUOUS'); // Yellow: Mounting pipes, cylinders, flanges
    this.addLayer('KABLO_TAVALARI', Drawing.ACI.MAGENTA, 'CONTINUOUS'); // Magenta: Cable trays, ladders
    this.addLayer('YURUYUS_KORIDORU', Drawing.ACI.GREEN, 'DASHED'); // Green: Walkway clearance path (80cm)
    this.addLayer('OLCULER', Drawing.ACI.RED, 'CONTINUOUS');       // Red: Dimension lines, arrows, ticks
    this.addLayer('METIN_BILGI', Drawing.ACI.WHITE, 'CONTINUOUS');   // White: Titles, labels, BOM table

    // 2. Distinct Equipment Layers (Every block on its own layer)
    this.addLayer('EKP_TURKCELL_RRU', Drawing.ACI.BLUE, 'CONTINUOUS');      // Blue (Color 5)
    this.addLayer('EKP_VODAFONE_RRU', Drawing.ACI.RED, 'CONTINUOUS');       // Red (Color 1)
    this.addLayer('EKP_TURK_TELEKOM_RRU', Drawing.ACI.CYAN, 'CONTINUOUS');  // Cyan (Color 4)
    this.addLayer('EKP_POI_TASIYICI_SASE', 30, 'CONTINUOUS');               // Orange (Color 30) - Canovate 19" rack frame
    this.addLayer('EKP_POI_MODULLERI', 40, 'CONTINUOUS');                   // Amber (Color 40) - Inside POI modules
    this.addLayer('EKP_RECTIFIER_ELTEK_20U', Drawing.ACI.GREEN, 'CONTINUOUS'); // Green (Color 3)
    this.addLayer('EKP_RECTIFIER_MTS9304A', 94, 'CONTINUOUS');              // Forest Green (Color 94)
    this.addLayer('BLOK_OZEL_PLATFORM', 140, 'CONTINUOUS');                 // Steel Blue (Color 140) - Mounting Tablas
    this.addLayer('EKP_MATSING_ANTEN', Drawing.ACI.YELLOW, 'CONTINUOUS');   // Yellow (Color 2)
    this.addLayer('EKP_PANEL_ANTEN', Drawing.ACI.MAGENTA, 'CONTINUOUS');    // Magenta (Color 6)
    this.addLayer('EKP_ANTEN_TASIYICI_KOL', 141, 'CONTINUOUS');             // Light Cyan / Truss arm (Color 141)
    this.addLayer('EKP_DIGER_EKIPMANLAR', Drawing.ACI.WHITE, 'CONTINUOUS');

    this.activeLayer = '0';
  }

  addLayer(name, color = 7, lineType = 'CONTINUOUS') {
    if (!this.d.layers[name]) {
      this.d.addLayer(name, color, lineType);
    }
  }

  setLayer(name) {
    if (!this.d.layers[name]) {
      this.addLayer(name, 7, 'CONTINUOUS');
    }
    this.activeLayer = name;
    this.d.setActiveLayer(name);
  }

  addRect(x, y, w, h, layer) {
    if (layer) this.setLayer(layer);
    this.d.drawRect(x, y, x + w, y + h);
  }

  addLine(x1, y1, x2, y2, layer) {
    if (layer) this.setLayer(layer);
    this.d.drawLine(x1, y1, x2, y2);
  }

  addLine3d(x1, y1, z1, x2, y2, z2, layer) {
    if (layer) this.setLayer(layer);
    this.d.drawLine3d(x1, y1, z1, x2, y2, z2);
  }

  addCircle(cx, cy, r, layer) {
    if (layer) this.setLayer(layer);
    this.d.drawCircle(cx, cy, r);
  }

  addText(x, y, height, text, layer, rotation = 0, hAlign = 'left', vAlign = 'baseline') {
    if (layer) this.setLayer(layer);
    this.d.drawText(x, y, height, rotation, String(text), hAlign, vAlign);
  }

  addFace3d(x1, y1, z1, x2, y2, z2, x3, y3, z3, x4, y4, z4, layer) {
    if (typeof x4 === 'string') {
      layer = x4;
      x4 = x3;
      y4 = y3;
      z4 = z3;
    } else if (x4 === undefined) {
      x4 = x3;
      y4 = y3;
      z4 = z3;
    }
    if (layer) this.setLayer(layer);
    this.d.drawFace(x1, y1, z1, x2, y2, z2, x3, y3, z3, x4, y4, z4);
  }

  // Draw a solid 3D box with 6 faces and 12 wireframe edge lines
  addSolidBox3D(minX, minY, minZ, maxX, maxY, maxZ, layer) {
    if (layer) this.setLayer(layer);
    const x1 = Math.min(minX, maxX);
    const x2 = Math.max(minX, maxX);
    const y1 = Math.min(minY, maxY);
    const y2 = Math.max(minY, maxY);
    const z1 = Math.min(minZ, maxZ);
    const z2 = Math.max(minZ, maxZ);

    // 6 Faces
    this.d.drawFace(x1, y1, z1, x2, y1, z1, x2, y2, z1, x1, y2, z1); // Bottom
    this.d.drawFace(x1, y1, z2, x2, y1, z2, x2, y2, z2, x1, y2, z2); // Top
    this.d.drawFace(x1, y1, z1, x2, y1, z1, x2, y1, z2, x1, y1, z2); // Front
    this.d.drawFace(x1, y2, z1, x2, y2, z1, x2, y2, z2, x1, y2, z2); // Back
    this.d.drawFace(x1, y1, z1, x1, y2, z1, x1, y2, z2, x1, y1, z2); // Left
    this.d.drawFace(x2, y1, z1, x2, y2, z1, x2, y2, z2, x2, y1, z2); // Right

    // 12 Wireframe edge lines
    this.d.drawLine3d(x1, y1, z1, x2, y1, z1);
    this.d.drawLine3d(x2, y1, z1, x2, y2, z1);
    this.d.drawLine3d(x2, y2, z1, x1, y2, z1);
    this.d.drawLine3d(x1, y2, z1, x1, y1, z1);

    this.d.drawLine3d(x1, y1, z2, x2, y1, z2);
    this.d.drawLine3d(x2, y1, z2, x2, y2, z2);
    this.d.drawLine3d(x2, y2, z2, x1, y2, z2);
    this.d.drawLine3d(x1, y2, z2, x1, y1, z2);

    this.d.drawLine3d(x1, y1, z1, x1, y1, z2);
    this.d.drawLine3d(x2, y1, z1, x2, y1, z2);
    this.d.drawLine3d(x2, y2, z1, x2, y2, z2);
    this.d.drawLine3d(x1, y2, z1, x1, y2, z2);
  }

  // ==========================================
  // 1. RRU DRAWING METHODS (Tek Tek Kutu)
  // ==========================================
  addRRU2D(x, y, w, d, operator = 'Turkcell', label = '') {
    let layer = 'EKP_TURKCELL_RRU';
    if (operator === 'Vodafone') layer = 'EKP_VODAFONE_RRU';
    else if (operator === 'Türk Telekom' || operator === 'TT') layer = 'EKP_TURK_TELEKOM_RRU';
    this.setLayer(layer);

    // Outer casing rectangle
    this.d.drawRect(x, y, x + w, y + d);

    // Heatsink rib / bracket offset line
    const ribOffset = Math.min(w, d) * 0.18;
    if (w > d) {
      this.d.drawLine(x, y + ribOffset, x + w, y + ribOffset);
    } else {
      this.d.drawLine(x + ribOffset, y, x + ribOffset, y + d);
    }

    // Center crosshair snap
    const midX = x + w / 2;
    const midY = y + d / 2;
    const ch = Math.min(w, d) * 0.2;
    this.d.drawLine(midX - ch, midY, midX + ch, midY);
    this.d.drawLine(midX, midY - ch, midX, midY + ch);

    // Label
    const textH = Math.min(Math.min(w, d) * 0.28, this.units === 'mm' ? 45 : 0.045);
    const shortOp = operator === 'Turkcell' ? 'TCELL' : (operator === 'Vodafone' ? 'VODA' : 'TT');
    if (textH > 0.01) {
      this.d.drawText(midX, midY + textH * 0.6, textH, 0, label || shortOp, 'center', 'middle');
    }
  }

  addRRU3D(minX, minY, minZ, maxX, maxY, maxZ, operator = 'Turkcell', label = '') {
    let layer = 'EKP_TURKCELL_RRU';
    if (operator === 'Vodafone') layer = 'EKP_VODAFONE_RRU';
    else if (operator === 'Türk Telekom' || operator === 'TT') layer = 'EKP_TURK_TELEKOM_RRU';

    // 1. Main RRU casing box
    this.addSolidBox3D(minX, minY, minZ, maxX, maxY, maxZ, layer);

    // 2. Top handle box
    const w = maxX - minX;
    const d = maxY - minY;
    const h = maxZ - minZ;
    const handleW = w * 0.45;
    const handleH = this.units === 'mm' ? 30 : 0.030;
    const handleD = Math.min(d * 0.4, this.units === 'mm' ? 30 : 0.030);

    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    this.addSolidBox3D(
      midX - handleW / 2, midY - handleD / 2, maxZ,
      midX + handleW / 2, midY + handleD / 2, maxZ + handleH,
      layer
    );

    // 3. Center snap crosshair on top face
    this.addLine3d(midX - w * 0.2, midY, maxZ, midX + w * 0.2, midY, maxZ, layer);
    this.addLine3d(midX, midY - d * 0.2, maxZ, midX, midY + d * 0.2, maxZ, layer);

    // 4. Label text on top
    const textH = Math.min(Math.min(w, d) * 0.28, this.units === 'mm' ? 45 : 0.045);
    const shortOp = operator === 'Turkcell' ? 'TCELL' : (operator === 'Vodafone' ? 'VODA' : 'TT');
    if (textH > 0.01) {
      this.d.drawText(midX, midY + textH * 0.8, textH, 0, label || shortOp, 'center', 'middle');
    }
  }

  // ==========================================
  // 2. RECTIFIER DRAWING METHODS (Dolap, Kapak, Çıkıntılar)
  // ==========================================
  addRectifier2D(x, y, w, d, model = 'ELTEK_20U', label = '') {
    const layer = model.includes('MTS') ? 'EKP_RECTIFIER_MTS9304A' : 'EKP_RECTIFIER_ELTEK_20U';
    this.setLayer(layer);

    // 1. Outer cabinet enclosure box
    this.d.drawRect(x, y, x + w, y + d);

    // 2. Front door protrusion line (front edge + 25mm protrusion)
    const doorProtrusion = this.units === 'mm' ? 25 : 0.025;
    const doorInset = w * 0.05;
    this.d.drawLine(x + doorInset, y - doorProtrusion, x + w - doorInset, y - doorProtrusion);
    this.d.drawLine(x + doorInset, y, x + doorInset, y - doorProtrusion);
    this.d.drawLine(x + w - doorInset, y, x + w - doorInset, y - doorProtrusion);

    // 3. Door lock handle line (40 x 180 mm)
    const handleW = this.units === 'mm' ? 40 : 0.040;
    const handleH = this.units === 'mm' ? 180 : 0.180;
    const handleX = x + w * 0.75;
    const handleY = y - doorProtrusion * 1.5;
    this.d.drawRect(handleX, handleY, handleX + handleW, handleY + handleH * 0.2);

    // 4. Side heat exchanger / cooler protrusion (60mm protrusion on right edge)
    const coolerProtrusion = this.units === 'mm' ? 60 : 0.060;
    const coolerLen = d * 0.6;
    const coolerY = y + (d - coolerLen) / 2;
    this.d.drawRect(x + w, coolerY, x + w + coolerProtrusion, coolerY + coolerLen);
    // 3 ventilation grill lines
    for (let i = 1; i <= 3; i++) {
      const vy = coolerY + i * (coolerLen / 4);
      this.d.drawLine(x + w + coolerProtrusion * 0.2, vy, x + w + coolerProtrusion * 0.8, vy);
    }

    // 5. Plinth / baza base dashed/inner footprint
    const plinthInset = this.units === 'mm' ? 15 : 0.015;
    this.d.drawRect(x + plinthInset, y + plinthInset, x + w - plinthInset, y + d - plinthInset);

    // Center snap crosshair and label
    const midX = x + w / 2;
    const midY = y + d / 2;
    this.d.drawLine(midX - w * 0.15, midY, midX + w * 0.15, midY);
    this.d.drawLine(midX, midY - d * 0.15, midX, midY + d * 0.15);

    const textH = this.units === 'mm' ? 65 : 0.065;
    this.d.drawText(midX, midY, textH, 0, label || (model.includes('MTS') ? 'MTS9304A 12U' : 'ELTEK 20U'), 'center', 'middle');
  }

  addRectifier3D(minX, minY, minZ, maxX, maxY, maxZ, model = 'ELTEK_20U', label = '') {
    const layer = model.includes('MTS') ? 'EKP_RECTIFIER_MTS9304A' : 'EKP_RECTIFIER_ELTEK_20U';

    const w = maxX - minX;
    const d = maxY - minY;
    const totalH = maxZ - minZ;

    const baseH = this.units === 'mm' ? 100 : 0.100;
    const hoodH = this.units === 'mm' ? 80 : 0.080;
    const bodyH = totalH - baseH - hoodH;

    // 1. Dark Base Plinth (Baza - recessed by 15mm)
    const plinthInset = this.units === 'mm' ? 15 : 0.015;
    this.addSolidBox3D(
      minX + plinthInset, minY + plinthInset, minZ,
      maxX - plinthInset, maxY - plinthInset, minZ + baseH,
      layer
    );

    // 2. Main Enclosure Body
    const bodyMinZ = minZ + baseH;
    const bodyMaxZ = bodyMinZ + bodyH;
    this.addSolidBox3D(minX, minY, bodyMinZ, maxX, maxY, bodyMaxZ, layer);

    // 3. Top Rain Hood / Roof Cap (Overhanging by 40mm on all sides)
    const hoodOverhang = this.units === 'mm' ? 40 : 0.040;
    this.addSolidBox3D(
      minX - hoodOverhang, minY - hoodOverhang, bodyMaxZ,
      maxX + hoodOverhang, maxY + hoodOverhang, maxZ,
      layer
    );

    // 4. Protruding Front Door Panel (25mm depth)
    const doorProtrusion = this.units === 'mm' ? 25 : 0.025;
    const doorInset = w * 0.04;
    this.addSolidBox3D(
      minX + doorInset, minY - doorProtrusion, bodyMinZ + baseH * 0.3,
      maxX - doorInset, minY, bodyMaxZ - hoodH * 0.3,
      layer
    );

    // 5. Door Lever Lock Handle
    const handleW = this.units === 'mm' ? 40 : 0.040;
    const handleH = this.units === 'mm' ? 180 : 0.180;
    const handleD = this.units === 'mm' ? 30 : 0.030;
    const handleX = minX + w * 0.8;
    const handleZ = bodyMinZ + bodyH * 0.5;
    this.addSolidBox3D(
      handleX, minY - doorProtrusion - handleD, handleZ - handleH / 2,
      handleX + handleW, minY - doorProtrusion, handleZ + handleH / 2,
      layer
    );

    // 6. Side Heat Exchanger / Cooler Box
    const coolerProtrusion = this.units === 'mm' ? 60 : 0.060;
    const coolerLen = d * 0.55;
    const coolerH = bodyH * 0.65;
    const coolerMinY = minY + (d - coolerLen) / 2;
    const coolerMinZ = bodyMinZ + (bodyH - coolerH) / 2;
    this.addSolidBox3D(
      maxX, coolerMinY, coolerMinZ,
      maxX + coolerProtrusion, coolerMinY + coolerLen, coolerMinZ + coolerH,
      layer
    );

    // Top face label
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    const textH = this.units === 'mm' ? 70 : 0.070;
    this.addText(midX, midY, textH, label || (model.includes('MTS') ? 'MTS9304A 12U' : 'ELTEK 20U'), layer, 0, 'center', 'middle');
  }

  // ==========================================
  // 3. POI CARRIER RACK & POI MODULES (Şase ve Tek Tek POI)
  // ==========================================
  addPoiRackCarrier2D(x, y, w, d, label = '') {
    const layer = 'EKP_POI_TASIYICI_SASE';
    this.setLayer(layer);

    // Outer perimeter
    this.d.drawRect(x, y, x + w, y + d);

    // 4 Corner upright columns (60x60 mm at each corner)
    const colSize = this.units === 'mm' ? 60 : 0.060;
    this.d.drawRect(x, y, x + colSize, y + colSize);
    this.d.drawRect(x + w - colSize, y, x + w, y + colSize);
    this.d.drawRect(x, y + d - colSize, x + colSize, y + d);
    this.d.drawRect(x + w - colSize, y + d - colSize, x + w, y + d);

    // 19" Inner vertical mounting rails (482.6mm clear span)
    const midX = x + w / 2;
    const railSpan = this.units === 'mm' ? 482.6 : 0.4826;
    const railThick = this.units === 'mm' ? 25 : 0.025;
    const railX1 = midX - railSpan / 2;
    const railX2 = midX + railSpan / 2;
    this.d.drawRect(railX1 - railThick, y + colSize, railX1, y + d - colSize);
    this.d.drawRect(railX2, y + colSize, railX2 + railThick, y + d - colSize);

    // Center label
    const midY = y + d / 2;
    const textH = this.units === 'mm' ? 55 : 0.055;
    this.d.drawText(midX, midY, textH, 0, label || 'CANOVATE 19" POI RACK', 'center', 'middle');
  }

  addPoiRackCarrier3D(minX, minY, minZ, maxX, maxY, maxZ, label = '') {
    const layer = 'EKP_POI_TASIYICI_SASE';

    const w = maxX - minX;
    const d = maxY - minY;
    const totalH = maxZ - minZ;

    const baseH = this.units === 'mm' ? 100 : 0.100;
    const capH = this.units === 'mm' ? 60 : 0.060;
    const colSize = this.units === 'mm' ? 60 : 0.060;

    // 1. Base plinth frame (Baza şasesi)
    this.addSolidBox3D(minX, minY, minZ, maxX, maxY, minZ + baseH, layer);

    // 2. Four vertical corner columns (4 dikey dikme kolonu)
    // Front-Left
    this.addSolidBox3D(minX, minY, minZ + baseH, minX + colSize, minY + colSize, maxZ - capH, layer);
    // Front-Right
    this.addSolidBox3D(maxX - colSize, minY, minZ + baseH, maxX, minY + colSize, maxZ - capH, layer);
    // Back-Left
    this.addSolidBox3D(minX, maxY - colSize, minZ + baseH, minX + colSize, maxY, maxZ - capH, layer);
    // Back-Right
    this.addSolidBox3D(maxX - colSize, maxY - colSize, minZ + baseH, maxX, maxY, maxZ - capH, layer);

    // 3. Top canopy crossbar (Üst bağlama şapkası)
    this.addSolidBox3D(minX, minY, maxZ - capH, maxX, maxY, maxZ, layer);

    // 4. Side depth tie braces (Yan derinlik kuşakları)
    const braceH = this.units === 'mm' ? 40 : 0.040;
    const midZ = (minZ + maxZ) / 2;
    [minZ + baseH + braceH, midZ, maxZ - capH - braceH * 1.5].forEach(bz => {
      // Left side brace
      this.addSolidBox3D(minX, minY + colSize, bz, minX + colSize, maxY - colSize, bz + braceH, layer);
      // Right side brace
      this.addSolidBox3D(maxX - colSize, minY + colSize, bz, maxX, maxY - colSize, bz + braceH, layer);
    });

    // 5. 19" Inner vertical mounting rails
    const midX = (minX + maxX) / 2;
    const railSpan = this.units === 'mm' ? 482.6 : 0.4826;
    const railThick = this.units === 'mm' ? 25 : 0.025;
    const railX1 = midX - railSpan / 2;
    const railX2 = midX + railSpan / 2;
    // Front rails
    this.addSolidBox3D(railX1 - railThick, minY + colSize, minZ + baseH, railX1, minY + colSize + railThick, maxZ - capH, layer);
    this.addSolidBox3D(railX2, minY + colSize, minZ + baseH, railX2 + railThick, minY + colSize + railThick, maxZ - capH, layer);
    // Back rails
    this.addSolidBox3D(railX1 - railThick, maxY - colSize - railThick, minZ + baseH, railX1, maxY - colSize, maxZ - capH, layer);
    this.addSolidBox3D(railX2, maxY - colSize - railThick, minZ + baseH, railX2 + railThick, maxY - colSize, maxZ - capH, layer);
  }

  addPoiModule2D(x, y, w, d, label = '') {
    const layer = 'EKP_POI_MODULLERI';
    this.setLayer(layer);

    // Module boundary rectangle
    this.d.drawRect(x, y, x + w, y + d);

    // Front connector face plate & port dots
    const portInset = Math.min(w, d) * 0.15;
    if (w > d) {
      this.d.drawLine(x, y + portInset, x + w, y + portInset);
    } else {
      this.d.drawLine(x + portInset, y, x + portInset, y + d);
    }

    // Center crosshair snap
    const midX = x + w / 2;
    const midY = y + d / 2;
    const ch = Math.min(w, d) * 0.18;
    this.d.drawLine(midX - ch, midY, midX + ch, midY);
    this.d.drawLine(midX, midY - ch, midX, midY + ch);

    const textH = Math.min(Math.min(w, d) * 0.25, this.units === 'mm' ? 45 : 0.045);
    if (textH > 0.01) {
      this.d.drawText(midX, midY + textH * 0.6, textH, 0, label || 'POI MODUL', 'center', 'middle');
    }
  }

  addPoiModule3D(minX, minY, minZ, maxX, maxY, maxZ, label = '') {
    const layer = 'EKP_POI_MODULLERI';

    // Module 3D solid box
    this.addSolidBox3D(minX, minY, minZ, maxX, maxY, maxZ, layer);

    // Front face plate accent
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    const textH = Math.min(Math.min(maxX - minX, maxY - minY) * 0.25, this.units === 'mm' ? 45 : 0.045);
    if (textH > 0.01) {
      this.d.drawText(midX, midY, textH, 0, label || 'POI', 'center', 'middle');
    }
  }

  // ==========================================
  // 3B. SİLİNDİR ÜZERİ ÇEMBER SABİTLEMELİ YATAY POI RAFI & PROSE MODÜLLERİ
  // ==========================================
  addCylinderMountedPoiShelf2D(cx, cy, setIndex = 1, label = '') {
    const u = this.units === 'mm' ? 1 : 0.001;
    const cylR = 228.5 * u;
    const shelfL = 720 * u;
    const shelfW = 540 * u;

    // 1. Ø45.7cm Silindir Eksen ve Gövde Çizgileri
    this.setLayer('MONTAJ_BORULARI');
    this.d.drawRect(cx - shelfL / 2 - 80 * u, cy - cylR, cx + shelfL / 2 + 80 * u, cy + cylR);
    this.d.drawLine(cx - shelfL / 2 - 120 * u, cy, cx + shelfL / 2 + 120 * u, cy);

    // 2. Ağır Hizmet Çift Çelik Çember Kelepçeleri (X = -200mm, +200mm)
    this.setLayer('EKP_POI_TASIYICI_SASE');
    const bandW = 70 * u;
    [-200 * u, 200 * u].forEach(bx => {
      this.d.drawRect(cx + bx - bandW / 2, cy - cylR - 12 * u, cx + bx + bandW / 2, cy + cylR + 12 * u);
      // Sıkma Kulakları ve Cıvata Merkezleri
      this.d.drawRect(cx + bx - bandW / 2, cy - cylR - 35 * u, cx + bx + bandW / 2, cy - cylR - 12 * u);
      this.d.drawRect(cx + bx - bandW / 2, cy + cylR + 12 * u, cx + bx + bandW / 2, cy + cylR + 35 * u);
      this.d.drawCircle(cx + bx, cy - cylR - 23 * u, 6 * u);
      this.d.drawCircle(cx + bx, cy + cylR + 23 * u, 6 * u);
    });

    // 3. Yatay Raf Taşıyıcı Şasi (720 x 540 mm)
    this.setLayer('EKP_POI_TASIYICI_SASE');
    this.d.drawRect(cx - shelfL / 2, cy - shelfW / 2, cx + shelfL / 2, cy + shelfW / 2);
    // Havalandırma ve Taban Izgara Sacı Çizgileri
    for (let lx = -shelfL / 2 + 60 * u; lx < shelfL / 2; lx += 90 * u) {
      this.d.drawLine(cx + lx, cy - shelfW / 2 + 20 * u, cx + lx, cy + shelfW / 2 - 20 * u);
    }
    // Kedi Yoluna Bakan Tel Örgü Kablo Kanalı (+Y tarafı)
    this.d.drawRect(cx - shelfL / 2 + 25 * u, cy + shelfW / 2 - 60 * u, cx + shelfL / 2 - 25 * u, cy + shelfW / 2 - 10 * u);
    // Bakır Topraklama Barası
    this.d.drawRect(cx - 220 * u, cy - shelfW / 2 + 10 * u, cx + 80 * u, cy - shelfW / 2 + 35 * u);

    // 4. İki Adet Yatay Prose POI Modülü (CB-12-POI-64F-A12)
    const poiW = 260 * u;
    const poiD = 400 * u;
    const poi1X = cx - 140 * u;
    const poi2X = cx + 140 * u;

    [
      { px: poi1X, name: `POI-${(setIndex - 1) * 2 + 1}`, sub: 'TCELL & TT 5G' },
      { px: poi2X, name: `POI-${(setIndex - 1) * 2 + 2}`, sub: 'VODAFONE & AUX' }
    ].forEach(poi => {
      this.setLayer('EKP_POI_MODULLERI');
      this.d.drawRect(poi.px - poiW / 2, cy - poiD / 2, poi.px + poiW / 2, cy + poiD / 2);
      // Montaj Kulakları
      this.d.drawRect(poi.px - poiW / 2 - 12 * u, cy - poiD / 2, poi.px - poiW / 2, cy + poiD / 2);
      this.d.drawRect(poi.px + poiW / 2, cy - poiD / 2, poi.px + poiW / 2 + 12 * u, cy + poiD / 2);

      // 12 BTS Portu (-Y yönünde, kablo tavasına bakar)
      const btsY = cy - poiD / 2 + 25 * u;
      this.d.drawLine(poi.px - poiW / 2 + 10 * u, btsY, poi.px + poiW / 2 - 10 * u, btsY);
      for (let p = 0; p < 6; p++) {
        const ptx = poi.px - poiW / 2 + 25 * u + p * (poiW - 50 * u) / 5;
        this.d.drawCircle(ptx, btsY - 10 * u, 5 * u);
        this.d.drawCircle(ptx, btsY + 10 * u, 5 * u);
      }

      // 4 ANT Portu (+Y yönünde, kedi yoluna/antene bakar)
      const antY = cy + poiD / 2 - 25 * u;
      this.d.drawLine(poi.px - poiW / 2 + 10 * u, antY, poi.px + poiW / 2 - 10 * u, antY);
      for (let p = 0; p < 4; p++) {
        const ptx = poi.px - poiW / 2 + 35 * u + p * (poiW - 70 * u) / 3;
        this.d.drawCircle(ptx, antY, 7 * u);
      }

      // Snap Crosshair & Metin
      this.d.drawLine(poi.px - 30 * u, cy, poi.px + 30 * u, cy);
      this.d.drawLine(poi.px, cy - 30 * u, poi.px, cy + 30 * u);
      const textH = 32 * u;
      this.d.drawText(poi.px, cy + 12 * u, textH, 0, poi.name, 'center', 'middle');
      this.d.drawText(poi.px, cy - 12 * u, textH * 0.75, 0, poi.sub, 'center', 'middle');
    });

    // Başlık
    this.setLayer('METIN_BILGI');
    const headerH = 45 * u;
    this.d.drawText(cx, cy - shelfW / 2 - 40 * u, headerH, 0, label || `SILINDIR UZERI YATAY POI SET-${setIndex}`, 'center', 'middle');
  }

  addCylinderMountedPoiShelf3D(cx, cy, cz, setIndex = 1, label = '') {
    const u = this.units === 'mm' ? 1 : 0.001;
    const cylR = 228.5 * u;
    const shelfL = 720 * u;
    const shelfW = 540 * u;
    const shelfH = 350 * u;

    // 1. Ağır Hizmet İkili Çember Kelepçeler (Ø45.7cm Silindiri 360° Sarar)
    const bandOuterR = (228.5 + 13) * u;
    const bandW = 70 * u;
    [-200 * u, 200 * u].forEach(bx => {
      const bX = cx + bx;
      const segs = 16;
      for (let i = 0; i < segs; i++) {
        const a1 = (i / segs) * Math.PI * 2;
        const a2 = ((i + 1) % segs) * Math.PI * 2;
        const y1 = cy + Math.sin(a1) * bandOuterR;
        const z1 = cz + Math.cos(a1) * bandOuterR;
        const y2 = cy + Math.sin(a2) * bandOuterR;
        const z2 = cz + Math.cos(a2) * bandOuterR;
        this.addFace3d(
          bX - bandW / 2, y1, z1,
          bX + bandW / 2, y1, z1,
          bX + bandW / 2, y2, z2,
          bX - bandW / 2, y2, z2,
          'EKP_POI_TASIYICI_SASE'
        );
        this.addLine3d(bX - bandW / 2, y1, z1, bX + bandW / 2, y1, z1, 'EKP_POI_TASIYICI_SASE');
      }
      // Üst ve Alt Sıkma Kulakları
      this.addSolidBox3D(bX - bandW / 2, cy - bandOuterR - 35 * u, cz - 10 * u, bX + bandW / 2, cy - bandOuterR, cz + 10 * u, 'EKP_POI_TASIYICI_SASE');
      this.addSolidBox3D(bX - bandW / 2, cy + bandOuterR, cz - 10 * u, bX + bandW / 2, cy + bandOuterR + 35 * u, cz + 10 * u, 'EKP_POI_TASIYICI_SASE');
    });

    // 2. Yatay Şasi Çerçevesi
    const shelfMinX = cx - shelfL / 2;
    const shelfMaxX = cx + shelfL / 2;
    const shelfMinY = cy - shelfW / 2;
    const shelfMaxY = cy + shelfW / 2;
    const shelfMinZ = cz + cylR;
    const shelfMaxZ = shelfMinZ + shelfH;

    // Taban sacı
    this.addSolidBox3D(shelfMinX, shelfMinY, shelfMinZ, shelfMaxX, shelfMaxY, shelfMinZ + 20 * u, 'EKP_POI_TASIYICI_SASE');
    // Üst kenar çerçevesi
    this.addSolidBox3D(shelfMinX, shelfMinY, shelfMaxZ - 20 * u, shelfMaxX, shelfMaxY, shelfMaxZ, 'EKP_POI_TASIYICI_SASE');
    // 4 Köşe Dikmesi
    this.addSolidBox3D(shelfMinX, shelfMinY, shelfMinZ, shelfMinX + 25 * u, shelfMinY + 25 * u, shelfMaxZ, 'EKP_POI_TASIYICI_SASE');
    this.addSolidBox3D(shelfMaxX - 25 * u, shelfMinY, shelfMinZ, shelfMaxX, shelfMinY + 25 * u, shelfMaxZ, 'EKP_POI_TASIYICI_SASE');
    this.addSolidBox3D(shelfMinX, shelfMaxY - 25 * u, shelfMinZ, shelfMinX + 25 * u, shelfMaxY, shelfMaxZ, 'EKP_POI_TASIYICI_SASE');
    this.addSolidBox3D(shelfMaxX - 25 * u, shelfMaxY - 25 * u, shelfMinZ, shelfMaxX, shelfMaxY, shelfMaxZ, 'EKP_POI_TASIYICI_SASE');

    // 3. İki Adet Yatay Prose POI Modülü (CB-12-POI-64F-A12)
    const poiW = 260 * u;
    const poiD = 400 * u;
    const poiH = 350 * u;
    const poi1X = cx - 140 * u;
    const poi2X = cx + 140 * u;

    [
      { px: poi1X, label: `POI-${(setIndex - 1) * 2 + 1} (TCELL/TT)` },
      { px: poi2X, label: `POI-${(setIndex - 1) * 2 + 2} (VDF/AUX)` }
    ].forEach(poi => {
      this.addSolidBox3D(
        poi.px - poiW / 2, cy - poiD / 2, shelfMinZ + 10 * u,
        poi.px + poiW / 2, cy + poiD / 2, shelfMinZ + 10 * u + poiH,
        'EKP_POI_MODULLERI'
      );
      // Üst yüzey metni
      const textH = 35 * u;
      this.addText(poi.px, cy, textH, poi.label, 'EKP_POI_MODULLERI', 0, 'center', 'middle');
    });
  }

  // ==========================================
  // 3C. KEDİ YOLU / MAKAS DİKMELERİ 20CM OFSETLİ 14 RRU GRUBU
  // ==========================================
  addCatwalkOffsetPipeWithRRUs2D(pipeX, pipeY, isLeft = true, label = '') {
    const u = this.units === 'mm' ? 1 : 0.001;
    const pipeR = 30.15 * u; // 2" boru yarıçapı
    const strutR = 70 * u;   // Ø14cm çapraz dikme

    // 1. Çapraz Dikme Çemberi
    const strutY = pipeY + 200 * u; // 20cm arkada
    this.setLayer('CELIK_KIRIS_KOLON');
    this.d.drawCircle(pipeX, strutY, strutR);

    // 2. 20cm Standoff Konsol Kolu (60x60mm)
    this.setLayer('MONTAJ_BORULARI');
    this.d.drawRect(pipeX - 30 * u, pipeY, pipeX + 30 * u, strutY);

    // 3. 2" Ofset Montaj Borusu ve U-Bolt Kelepçesi
    this.d.drawCircle(pipeX, pipeY, pipeR);
    this.d.drawCircle(pipeX, pipeY, pipeR + 8 * u);

    // 4. Ön Montaj Konsolu (Braket)
    const bracketW = 480 * u;
    this.d.drawRect(pipeX - bracketW / 2, pipeY - 40 * u, pipeX + bracketW / 2, pipeY - 15 * u);

    // 5. RRU Modülleri (Kısa kenarlarından ofset borusuna bağlı)
    const stepX = 165 * u;
    const rruD = 140 * u;
    const rruW = 356 * u;

    [-stepX, 0, stepX].forEach((rx, idx) => {
      const rX = pipeX + rx;
      const rY = pipeY - 40 * u - rruW;

      let layer = 'EKP_VODAFONE_RRU';
      let opText = 'VDF';
      if (idx === 0) {
        layer = isLeft ? 'EKP_TURKCELL_RRU' : 'EKP_TURK_TELEKOM_RRU';
        opText = isLeft ? 'TCELL' : 'TT';
      } else if (idx === 1) {
        layer = isLeft ? 'EKP_TURKCELL_RRU' : 'EKP_TURK_TELEKOM_RRU';
        opText = isLeft ? 'TCELL' : 'TT';
      }

      this.setLayer(layer);
      this.d.drawRect(rX - rruD / 2, rY, rX + rruD / 2, rY + rruW);
      this.d.drawLine(rX - rruD / 2 + 15 * u, rY, rX - rruD / 2 + 15 * u, rY + rruW);
      this.d.drawLine(rX - 25 * u, rY + rruW / 2, rX + 25 * u, rY + rruW / 2);
      this.d.drawLine(rX, rY + rruW / 2 - 25 * u, rX, rY + rruW / 2 + 25 * u);
      const textH = 32 * u;
      this.d.drawText(rX, rY + rruW / 2, textH, 0, opText, 'center', 'middle');
    });

    this.setLayer('METIN_BILGI');
    const lblH = 45 * u;
    this.d.drawText(pipeX, pipeY + strutR + 60 * u, lblH, 0, label || (isLeft ? 'SOL DIREK 7 RRU (4 TCELL + 3 VDF)' : 'SAG DIREK 7 RRU (4 TT + 3 VDF)'), 'center', 'middle');
  }

  // ==========================================
  // 4. TABLA DRAWING METHODS (Montaj Tablası)
  // ==========================================
  addTabla2D(x, y, w, d, label = '') {
    const layer = 'BLOK_OZEL_PLATFORM';
    this.setLayer(layer);

    // Outer frame rectangle
    this.d.drawRect(x, y, x + w, y + d);

    // Stiffener / Grating lines across tabla
    const numDivs = 4;
    for (let i = 1; i < numDivs; i++) {
      const gx = x + i * (w / numDivs);
      this.d.drawLine(gx, y, gx, y + d);
    }
    const numDivsY = 3;
    for (let j = 1; j < numDivsY; j++) {
      const gy = y + j * (d / numDivsY);
      this.d.drawLine(x, gy, x + w, gy);
    }

    // Center label
    const midX = x + w / 2;
    const midY = y + d / 2;
    const textH = this.units === 'mm' ? 75 : 0.075;
    this.d.drawText(midX, midY, textH, 0, label || 'MONTAJ TABLASI', 'center', 'middle');
  }

  addTabla3D(minX, minY, minZ, maxX, maxY, maxZ, label = '') {
    const layer = 'BLOK_OZEL_PLATFORM';
    this.addSolidBox3D(minX, minY, minZ, maxX, maxY, maxZ, layer);

    // Grating pattern lines on top plate
    const w = maxX - minX;
    const d = maxY - minY;
    const numDivs = 4;
    for (let i = 1; i < numDivs; i++) {
      const gx = minX + i * (w / numDivs);
      this.addLine3d(gx, minY, maxZ, gx, maxY, maxZ, layer);
    }
    for (let j = 1; j < 3; j++) {
      const gy = minY + j * (d / 3);
      this.addLine3d(minX, gy, maxZ, maxX, gy, maxZ, layer);
    }

    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    const textH = this.units === 'mm' ? 75 : 0.075;
    this.addText(midX, midY, textH, label || 'MONTAJ TABLASI', layer, 0, 'center', 'middle');
  }

  // ==========================================
  // 5. ANTENNA DRAWING METHODS (Matsing & Panel)
  // ==========================================
  addMatsingAntenna2D(cx, cy, r, label = '') {
    const layer = 'EKP_MATSING_ANTEN';
    this.setLayer(layer);

    // Circular lens body
    this.d.drawCircle(cx, cy, r);

    // Center axis crosshair
    this.d.drawLine(cx - r * 1.15, cy, cx + r * 1.15, cy);
    this.d.drawLine(cx, cy - r * 1.15, cx, cy + r * 1.15);

    // Rear aluminum chassis spine bracket
    const spineW = r * 0.5;
    const spineD = r * 0.25;
    this.d.drawRect(cx - spineW / 2, cy - r - spineD, cx + spineW / 2, cy - r);

    // Mounting pole clamp circle (Ø76mm)
    const clampR = this.units === 'mm' ? 40 : 0.040;
    this.d.drawCircle(cx, cy - r - spineD - clampR, clampR, 'MONTAJ_BORULARI');

    const textH = this.units === 'mm' ? 70 : 0.070;
    this.d.drawText(cx, cy, textH, 0, label || 'MATSING 4-BEAM', 'center', 'middle');
  }

  addMatsingAntenna3D(cx, cy, minZ, maxZ, r, label = '') {
    const layer = 'EKP_MATSING_ANTEN';

    // 8-sided faceted prism representing the spherical lens radome
    const numSides = 8;
    const angleStep = (2 * Math.PI) / numSides;
    const pts = [];
    for (let i = 0; i < numSides; i++) {
      const a = i * angleStep;
      pts.push({
        x: cx + r * Math.cos(a),
        y: cy + r * Math.sin(a)
      });
    }

    // 8 vertical side faces
    for (let i = 0; i < numSides; i++) {
      const next = (i + 1) % numSides;
      this.addFace3d(
        pts[i].x, pts[i].y, minZ,
        pts[next].x, pts[next].y, minZ,
        pts[next].x, pts[next].y, maxZ,
        pts[i].x, pts[i].y, maxZ,
        layer
      );
      this.addLine3d(pts[i].x, pts[i].y, minZ, pts[next].x, pts[next].y, minZ, layer);
      this.addLine3d(pts[i].x, pts[i].y, maxZ, pts[next].x, pts[next].y, maxZ, layer);
      this.addLine3d(pts[i].x, pts[i].y, minZ, pts[i].x, pts[i].y, maxZ, layer);
    }

    // Top and bottom cap faces (fan from center)
    for (let i = 0; i < numSides; i++) {
      const next = (i + 1) % numSides;
      this.addFace3d(cx, cy, minZ, pts[i].x, pts[i].y, minZ, pts[next].x, pts[next].y, minZ, pts[next].x, pts[next].y, minZ, layer);
      this.addFace3d(cx, cy, maxZ, pts[i].x, pts[i].y, maxZ, pts[next].x, pts[next].y, maxZ, pts[next].x, pts[next].y, maxZ, layer);
    }

    // Rear aluminum chassis spine & pole clamp
    const spineW = r * 0.5;
    const spineD = r * 0.25;
    this.addSolidBox3D(
      cx - spineW / 2, cy - r - spineD, minZ + (maxZ - minZ) * 0.1,
      cx + spineW / 2, cy - r, maxZ - (maxZ - minZ) * 0.1,
      layer
    );

    const textH = this.units === 'mm' ? 70 : 0.070;
    this.addText(cx, cy, textH, label || 'MATSING 4-BEAM', layer, 0, 'center', 'middle');
  }

  addPanelAntenna2D(x, y, w, d, label = '') {
    const layer = 'EKP_PANEL_ANTEN';
    this.setLayer(layer);

    // Radome body
    this.d.drawRect(x, y, x + w, y + d);

    // Center crosshair snap
    const midX = x + w / 2;
    const midY = y + d / 2;
    this.d.drawLine(midX - w * 0.2, midY, midX + w * 0.2, midY);
    this.d.drawLine(midX, midY - d * 0.2, midX, midY + d * 0.2);

    // Rear bracket line
    if (w > d) {
      this.d.drawLine(x + w * 0.2, y + d * 0.5, x + w * 0.8, y + d * 0.5);
    } else {
      this.d.drawLine(x + w * 0.5, y + d * 0.2, x + w * 0.5, y + d * 0.8);
    }

    const textH = Math.min(Math.min(w, d) * 0.25, this.units === 'mm' ? 60 : 0.060);
    if (textH > 0.01) {
      this.d.drawText(midX, midY, textH, 0, label || 'PANEL ANT', 'center', 'middle');
    }
  }

  addPanelAntenna3D(minX, minY, minZ, maxX, maxY, maxZ, label = '') {
    const layer = 'EKP_PANEL_ANTEN';
    this.addSolidBox3D(minX, minY, minZ, maxX, maxY, maxZ, layer);

    // Rear tilt mounting bracket
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    const bracketSize = Math.min(maxX - minX, maxY - minY) * 0.4;
    this.addSolidBox3D(
      midX - bracketSize / 2, minY - bracketSize * 0.3, minZ + (maxZ - minZ) * 0.2,
      midX + bracketSize / 2, minY, maxZ - (maxZ - minZ) * 0.2,
      'EKP_ANTEN_TASIYICI_KOL'
    );

    const textH = Math.min(Math.min(maxX - minX, maxY - minY) * 0.25, this.units === 'mm' ? 60 : 0.060);
    if (textH > 0.01) {
      this.addText(midX, midY, textH, label || 'PANEL ANT', layer, 0, 'center', 'middle');
    }
  }

  // ==========================================
  // 5B. 2D ELEVATION / KESIT DRAWING HELPERS
  // ==========================================
  addRectifierElevation(x, baseY, w, h, model = 'ELTEK_20U', label = '') {
    const layer = model.includes('MTS') ? 'EKP_RECTIFIER_MTS9304A' : 'EKP_RECTIFIER_ELTEK_20U';
    this.setLayer(layer);

    const baseH = this.units === 'mm' ? 100 : 0.100;
    const hoodH = this.units === 'mm' ? 80 : 0.080;
    const hoodOverhang = this.units === 'mm' ? 40 : 0.040;
    const plinthInset = this.units === 'mm' ? 15 : 0.015;
    const bodyH = h - baseH - hoodH;

    // 1. Plinth / Baza
    this.d.drawRect(x + plinthInset, baseY, x + w - plinthInset, baseY + baseH);

    // 2. Main Body
    this.d.drawRect(x, baseY + baseH, x + w, baseY + baseH + bodyH);

    // 3. Overhanging Hood
    this.d.drawRect(x - hoodOverhang, baseY + baseH + bodyH, x + w + hoodOverhang, baseY + h);

    // 4. Front door frame & panel
    const doorInset = w * 0.06;
    this.d.drawRect(x + doorInset, baseY + baseH + 20 * (this.units === 'mm' ? 1 : 0.001), x + w - doorInset, baseY + baseH + bodyH - 20 * (this.units === 'mm' ? 1 : 0.001));

    // 5. Door handle
    const handleW = this.units === 'mm' ? 25 : 0.025;
    const handleH = this.units === 'mm' ? 180 : 0.180;
    const handleX = x + w * 0.8;
    const handleY = baseY + baseH + bodyH * 0.45;
    this.d.drawRect(handleX, handleY, handleX + handleW, handleY + handleH);

    // Label
    const midX = x + w / 2;
    const textH = this.units === 'mm' ? 65 : 0.065;
    this.d.drawText(midX, baseY + baseH + bodyH * 0.5, textH, 0, label || (model.includes('MTS') ? 'MTS 12U' : 'ELTEK 20U'), 'center', 'middle');
  }

  addPoiRackElevation(x, baseY, w, h, poiCount = 4, label = '') {
    // 1. Frame
    this.setLayer('EKP_POI_TASIYICI_SASE');
    const baseH = this.units === 'mm' ? 100 : 0.100;
    const capH = this.units === 'mm' ? 60 : 0.060;
    const colW = this.units === 'mm' ? 50 : 0.050;

    // Plinth & Cap
    this.d.drawRect(x, baseY, x + w, baseY + baseH);
    this.d.drawRect(x, baseY + h - capH, x + w, baseY + h);

    // Columns
    this.d.drawRect(x, baseY + baseH, x + colW, baseY + h - capH);
    this.d.drawRect(x + w - colW, baseY + baseH, x + w, baseY + h - capH);

    // 2. Stacked POI Modules inside
    this.setLayer('EKP_POI_MODULLERI');
    const poiW = w - colW * 2 - 20 * (this.units === 'mm' ? 1 : 0.001);
    const poiH = this.units === 'mm' ? 260 : 0.260;
    const stepY = this.units === 'mm' ? 315 : 0.315;
    const startY = baseY + baseH + 15 * (this.units === 'mm' ? 1 : 0.001);

    for (let i = 0; i < poiCount; i++) {
      const my = startY + i * stepY;
      if (my + poiH < baseY + h - capH) {
        this.d.drawRect(x + colW + 10 * (this.units === 'mm' ? 1 : 0.001), my, x + colW + 10 * (this.units === 'mm' ? 1 : 0.001) + poiW, my + poiH);
        // Handle lines
        const mx = x + w / 2;
        const textH = this.units === 'mm' ? 40 : 0.040;
        this.d.drawText(mx, my + poiH * 0.5, textH, 0, `POI-${i + 1}`, 'center', 'middle');
      }
    }
  }

  addRRUPoleElevation(pipeX, baseY, pipeH, rrus = []) {
    // 1. Pipe & Flange
    this.setLayer('MONTAJ_BORULARI');
    const pipeW = this.units === 'mm' ? 60 : 0.060;
    const flangeW = this.units === 'mm' ? 180 : 0.180;
    const flangeH = this.units === 'mm' ? 15 : 0.015;

    this.d.drawRect(pipeX - flangeW / 2, baseY, pipeX + flangeW / 2, baseY + flangeH);
    this.d.drawRect(pipeX - pipeW / 2, baseY + flangeH, pipeX + pipeW / 2, baseY + pipeH);

    // 2. Mounted RRUs
    rrus.forEach(r => {
      let layer = 'EKP_TURKCELL_RRU';
      if (r.operator === 'Vodafone') layer = 'EKP_VODAFONE_RRU';
      else if (r.operator === 'Türk Telekom' || r.operator === 'TT') layer = 'EKP_TURK_TELEKOM_RRU';
      this.setLayer(layer);

      const rruW = r.width || (this.units === 'mm' ? 400 : 0.400);
      const rruH = r.height || (this.units === 'mm' ? 480 : 0.480);
      const rx = (r.side === 'left') ? pipeX - pipeW / 2 - rruW - 20 * (this.units === 'mm' ? 1 : 0.001) : pipeX + pipeW / 2 + 20 * (this.units === 'mm' ? 1 : 0.001);
      const ry = baseY + r.y;

      // Arm collar
      this.setLayer('MONTAJ_BORULARI');
      if (r.side === 'left') {
        this.d.drawRect(rx + rruW, ry + rruH * 0.4, pipeX - pipeW / 2, ry + rruH * 0.6);
      } else {
        this.d.drawRect(pipeX + pipeW / 2, ry + rruH * 0.4, rx, ry + rruH * 0.6);
      }

      // RRU Box
      this.setLayer(layer);
      this.d.drawRect(rx, ry, rx + rruW, ry + rruH);
      // Top handle
      this.d.drawRect(rx + rruW * 0.3, ry + rruH, rx + rruW * 0.7, ry + rruH + 30 * (this.units === 'mm' ? 1 : 0.001));

      // Label
      const textH = this.units === 'mm' ? 45 : 0.045;
      const shortOp = r.operator === 'Turkcell' ? 'TCELL' : (r.operator === 'Vodafone' ? 'VODA' : 'TT');
      this.d.drawText(rx + rruW / 2, ry + rruH * 0.5, textH, 0, shortOp, 'center', 'middle');
    });
  }

  // ==========================================
  // 6. DIMENSIONING & MISC
  // ==========================================
  addDimension(x1, y1, x2, y2, offset, label, layer = 'OLCULER') {
    this.setLayer(layer);
    const isHorizontal = Math.abs(y2 - y1) < Math.abs(x2 - x1);
    const arrowSize = this.units === 'mm' ? 40 : 0.04;
    const textH = this.units === 'mm' ? 60 : 0.06;

    if (isHorizontal) {
      const dimY = y1 + offset;
      this.d.drawLine(x1, y1, x1, dimY + (offset > 0 ? arrowSize : -arrowSize));
      this.d.drawLine(x2, y2, x2, dimY + (offset > 0 ? arrowSize : -arrowSize));
      this.d.drawLine(x1, dimY, x2, dimY);
      const tick = arrowSize * 0.7;
      this.d.drawLine(x1 - tick, dimY - tick, x1 + tick, dimY + tick);
      this.d.drawLine(x2 - tick, dimY - tick, x2 + tick, dimY + tick);
      const midX = (x1 + x2) / 2;
      const textY = dimY + (offset > 0 ? textH * 0.4 : -textH * 1.4);
      this.d.drawText(midX, textY, textH, 0, label, 'center', 'middle');
    } else {
      const dimX = x1 + offset;
      this.d.drawLine(x1, y1, dimX + (offset > 0 ? arrowSize : -arrowSize), y1);
      this.d.drawLine(x2, y2, dimX + (offset > 0 ? arrowSize : -arrowSize), y2);
      this.d.drawLine(dimX, y1, dimX, y2);
      const tick = arrowSize * 0.7;
      this.d.drawLine(dimX - tick, y1 - tick, dimX + tick, y1 + tick);
      this.d.drawLine(dimX - tick, y2 - tick, dimX + tick, y2 + tick);
      const midY = (y1 + y2) / 2;
      const textX = dimX + (offset > 0 ? textH * 0.7 : -textH * 0.7);
      this.d.drawText(textX, midY, textH, 90, label, 'center', 'middle');
    }
  }

  toDxfString() {
    let str = this.d.toDxfString();

    // 1. Ensure DWGCODEPAGE is set to UTF-8 in the HEADER section
    if (!str.includes('$DWGCODEPAGE')) {
      str = str.replace(
        '9\n$ACADVER\n1\nAC1021\n',
        '9\n$ACADVER\n1\nAC1021\n9\n$DWGCODEPAGE\n3\nUTF-8\n'
      );
    }

    // 2. Ensure any legacy 'txt' font in STYLE table is converted to Calibri Bold (calibrib.ttf)
    str = str.replace(/\b3\ntxt\n4\n\n/g, '3\ncalibrib.ttf\n4\n\n1001\nACAD\n1000\nCalibri\n1071\n33554466\n');
    str = str.replace(/\b3\ntxt\.shx\n4\n\n/g, '3\ncalibrib.ttf\n4\n\n1001\nACAD\n1000\nCalibri\n1071\n33554466\n');

    // 3. Remove any remaining unsupported characters (superscripts)
    str = str.replace(/mm²/g, 'mm2');
    str = str.replace(/m²/g, 'm2');
    str = str.replace(/²/g, '2');
    str = str.replace(/³/g, '3');

    return str;
  }
}

module.exports = { DxfBuilder };
