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

  const boxW = 850 * s;
  const boxH = 220 * s;
  const x0 = posX;
  const y0 = posY;

  dxf.addRect(x0, y0, boxW, boxH, 'METIN_BILGI');
  dxf.addLine(x0, y0 + 140 * s, x0 + boxW, y0 + 140 * s, 'METIN_BILGI');
  dxf.addLine(x0, y0 + 70 * s, x0 + boxW, y0 + 70 * s, 'METIN_BILGI');
  dxf.addLine(x0 + 480 * s, y0, x0 + 480 * s, y0 + 140 * s, 'METIN_BILGI');

  dxf.addText(x0 + 20 * s, y0 + 165 * s, 30 * s, 'GALATASARAY STADYUMU GSM ALTYAPI PROJESI', 'METIN_BILGI');
  dxf.addText(x0 + 20 * s, y0 + 95 * s, 24 * s, `PAFTA: ${title} (${areaCode})`, 'METIN_BILGI');
  dxf.addText(x0 + 20 * s, y0 + 28 * s, 20 * s, `OLCEK: ${scaleText} (1:${isMm ? '1 mm' : '1 m'})`, 'METIN_BILGI');
  dxf.addText(x0 + 500 * s, y0 + 95 * s, 18 * s, 'CIZIM: ANTIGRAVITY CAD / BIM', 'METIN_BILGI');
  dxf.addText(x0 + 500 * s, y0 + 28 * s, 18 * s, `TARIH: ${new Date().toISOString().slice(0, 10)}`, 'METIN_BILGI');

  // North Arrow
  const naX = x0 - 150 * s;
  const naY = y0 + 110 * s;
  const r = 80 * s;
  dxf.addCircle(naX, naY, r, 'METIN_BILGI');
  dxf.addLine(naX, naY - r * 0.9, naX, naY + r * 0.9, 'METIN_BILGI');
  dxf.addLine(naX, naY + r * 0.9, naX - 25 * s, naY + 30 * s, 'METIN_BILGI');
  dxf.addLine(naX, naY + r * 0.9, naX + 25 * s, naY + 30 * s, 'METIN_BILGI');
  dxf.addText(naX, naY + r + 20 * s, 30 * s, 'K', 'METIN_BILGI', 0, 'center', 'middle');
}

// =========================================================================
// 1. 500MM KABLO TAVASI İMALAT VE DETAY ÇİZİMLERİ (PLAN, YAN GÖRÜNÜŞ, 3D İZOMETRİK VE MONTAJ DETAYLARI)
// =========================================================================

/**
 * GÖRÜNÜŞ 1: 500mm Ağır Hizmet Tipi Delikli Kablo Tavası Üstten Plan Görünüşü
 */
function draw500mmTrayPlanView(dxf, cx, cy, s, length = 2000, width = 500, trayH = 100) {
  const W = width * s;
  const L = length * s;
  const t = 2 * s;
  const lipW = 15 * s;

  const x1 = cx - L / 2;
  const x2 = cx + L / 2;
  const y1 = cy - W / 2;
  const y2 = cy + W / 2;
  const yLip1 = y1 - lipW;
  const yLip2 = y2 + lipW;

  dxf.setLayer('TAVA_PROFILI');

  // Dış flanş sınırları
  dxf.addLine(x1, yLip1, x2, yLip1);
  dxf.addLine(x1, yLip2, x2, yLip2);
  dxf.addLine(x1, yLip1, x1, yLip2);
  dxf.addLine(x2, yLip1, x2, yLip2);

  // İç taban sınırları (2mm sac kalınlığı)
  dxf.addLine(x1, y1, x2, y1);
  dxf.addLine(x1, y2, x2, y2);
  dxf.addLine(x1, y1 + t, x2, y1 + t);
  dxf.addLine(x1, y2 - t, x2, y2 - t);

  // Taban Delikli Perforasyon Deseni (Oval Drenaj ve Havalandırma Slotları)
  dxf.setLayer('TAVA_DETAY_DELIK');
  const rowYs = [-180, -90, 0, 90, 180];
  const slotLen = 35 * s;
  const slotW = 8 * s;

  for (let x = -length / 2 + 80; x <= length / 2 - 80; x += 100) {
    rowYs.forEach(ry => {
      const sx = cx + x * s;
      const sy = cy + ry * s;
      dxf.addLine(sx - slotLen / 2 + 4 * s, sy - slotW / 2, sx + slotLen / 2 - 4 * s, sy - slotW / 2);
      dxf.addLine(sx - slotLen / 2 + 4 * s, sy + slotW / 2, sx + slotLen / 2 - 4 * s, sy + slotW / 2);
      dxf.addCircle(sx - slotLen / 2 + 4 * s, sy, 4 * s);
      dxf.addCircle(sx + slotLen / 2 - 4 * s, sy, 4 * s);
    });
  }

  // Enine Kablo Bağlama Yarıkları (Transversal Cable Tie Slots - Her 250mm'de bir)
  const tieSlotLen = 45 * s;
  for (let x = -length / 2 + 200; x <= length / 2 - 150; x += 250) {
    [-135, 135].forEach(ty => {
      const tx = cx + x * s;
      const tyPos = cy + ty * s;
      dxf.addRect(tx - 4 * s, tyPos - tieSlotLen / 2, 8 * s, tieSlotLen);
    });
  }

  // Tavanın Ek Yeri ve Birleşim Plakası (Splice Joint at X = cx + 350mm)
  const jx = cx + 350 * s;
  dxf.setLayer('TAVA_PROFILI');
  dxf.addLine(jx, yLip1, jx, yLip2); // Ek kesim hattı

  // Ek Plakası (Splice Plate: 200mm boyunda, tabana alttan vidalanan plaka)
  dxf.setLayer('TAVA_KONSOL');
  dxf.addRect(jx - 100 * s, y1 + 15 * s, 200 * s, W - 30 * s);

  // 8 Adet M6 Bağlantı Cıvatası ve Pulu
  const boltXs = [-50, 50];
  const boltYs = [-180, -60, 60, 180];
  boltXs.forEach(bx => {
    boltYs.forEach(by => {
      const bX = jx + bx * s;
      const bY = cy + by * s;
      dxf.addCircle(bX, bY, 7 * s); // Pul
      dxf.addCircle(bX, bY, 4.5 * s); // M6 cıvata başı
      dxf.addLine(bX - 8 * s, bY, bX + 8 * s, bY);
      dxf.addLine(bX, bY - 8 * s, bX, bY + 8 * s);
    });
  });

  // Topraklama Köprüsü (Earthing Bonding Jumper - 16 mm2 Bakır Örgü)
  dxf.setLayer('KBL_ETIKET_BAG');
  dxf.addRect(jx - 80 * s, cy + 215 * s, 160 * s, 16 * s);
  dxf.addCircle(jx - 60 * s, cy + 223 * s, 5 * s);
  dxf.addCircle(jx + 60 * s, cy + 223 * s, 5 * s);
  dxf.addText(jx, cy + 242 * s, 14 * s, 'TOPRAKLAMA KOPRUSU (16 mm2 BAKIR FLEX ILETKEN)', 'METIN_BILGI', 0, 'center');

  // Ölçülendirme ve Notlar
  dxf.setLayer('OLCULER');
  dxf.addDimension(x1, yLip2 + 45 * s, x2, yLip2 + 45 * s, 35 * s, '2000 mm (STANDART TAVA BOYU)');
  dxf.addDimension(x1 - 40 * s, y1, x1 - 40 * s, y2, -35 * s, '500 mm (IC GENISLIK)');
  dxf.addDimension(x1 - 90 * s, yLip1, x1 - 90 * s, yLip2, -35 * s, '530 mm (DIS GENISLIK)');
  dxf.addDimension(x1, yLip1 - 45 * s, jx, yLip1 - 45 * s, -30 * s, '1350 mm');
  dxf.addDimension(jx, yLip1 - 45 * s, x2, yLip1 - 45 * s, -30 * s, '650 mm');

  dxf.setLayer('METIN_BILGI');
  dxf.addText(cx, yLip2 + 115 * s, 24 * s, 'GORUNUS 1: 500 MM AGIR HIZMET DELIKLI KABLO TAVASI (USTTEN PLAN GORUNUSU)', 'METIN_BILGI', 0, 'center');
  dxf.addText(cx, yLip1 - 95 * s, 16 * s, 'TS EN 61537 Standardinda 2.0 mm Sicak Daldirma Galvaniz Sac - Drenaj/Havalandirma Perfore Delikli', 'METIN_BILGI', 0, 'center');
}

/**
 * GÖRÜNÜŞ 2: 500mm Ağır Hizmet Tipi Kablo Tavası Boyuna Yan Görünüşü
 */
function draw500mmTraySideElevation(dxf, cx, cy, s, length = 2000, trayH = 100) {
  const L = length * s;
  const H = trayH * s;
  const t = 2 * s;
  const lipW = 15 * s;
  const lipH = 8 * s;

  const x1 = cx - L / 2;
  const x2 = cx + L / 2;
  const yBot = cy;
  const yTop = cy + H;

  dxf.setLayer('TAVA_PROFILI');

  // Yan sac gövde ve kıvrımlar
  dxf.addLine(x1, yBot, x2, yBot);
  dxf.addLine(x1, yBot + t, x2, yBot + t);
  dxf.addLine(x1, yTop, x2, yTop);
  dxf.addLine(x1, yTop - lipH, x2, yTop - lipH);
  dxf.addLine(x1, yBot, x1, yTop);
  dxf.addLine(x2, yBot, x2, yTop);

  // Yan Havalandırma ve Kablo Çıkış Delikleri (Oval slotlar her 100mm'de bir)
  dxf.setLayer('TAVA_DETAY_DELIK');
  const sideSlotH = 22 * s;
  const sideSlotL = 36 * s;
  for (let x = -length / 2 + 75; x <= length / 2 - 75; x += 100) {
    const sx = cx + x * s;
    const sy = yBot + H / 2;
    dxf.addLine(sx - sideSlotL / 2 + 4 * s, sy - sideSlotH / 2, sx + sideSlotL / 2 - 4 * s, sy - sideSlotH / 2);
    dxf.addLine(sx - sideSlotL / 2 + 4 * s, sy + sideSlotH / 2, sx + sideSlotL / 2 - 4 * s, sy + sideSlotH / 2);
    dxf.addCircle(sx - sideSlotL / 2 + 4 * s, sy, 4 * s);
    dxf.addCircle(sx + sideSlotL / 2 - 4 * s, sy, 4 * s);
  }

  // Tavanın Yan Ek Sacı (Splice Plate at X = cx + 350mm)
  const jx = cx + 350 * s;
  dxf.setLayer('TAVA_PROFILI');
  dxf.addLine(jx, yBot, jx, yTop);

  dxf.setLayer('TAVA_KONSOL');
  const spH = H - 24 * s;
  dxf.addRect(jx - 90 * s, yBot + 12 * s, 180 * s, spH);
  // 4 Adet cıvata
  [-45, 45].forEach(bx => {
    [yBot + 25 * s, yTop - 25 * s].forEach(by => {
      const bX = jx + bx * s;
      dxf.addCircle(bX, by, 6 * s);
      dxf.addCircle(bX, by, 3.5 * s);
    });
  });

  // Alt Destek Askı Konsolları (C-Profil ve Tijler - Her 1200mm'de bir)
  const consoleXLocs = [cx - 600 * s, cx + 600 * s];
  consoleXLocs.forEach(csx => {
    // C-profil yatay konsol kolu
    dxf.setLayer('TAVA_ASKI_KONSOL');
    dxf.addRect(csx - 25 * s, yBot - 40 * s, 50 * s, 40 * s);
    // M10 tij askı mili
    dxf.addLine(csx, yBot - 120 * s, csx, yBot - 40 * s);
    dxf.addLine(csx + 4 * s, yBot - 120 * s, csx + 4 * s, yBot - 40 * s);
    // Alt somun & pul
    dxf.addRect(csx - 8 * s, yBot - 55 * s, 20 * s, 15 * s);
    // Tava kenar tespit çenesi (Hold-down clamp)
    dxf.addRect(csx - 12 * s, yBot, 24 * s, 12 * s);
  });

  // Ölçülendirmeler
  dxf.setLayer('OLCULER');
  dxf.addDimension(x1 - 40 * s, yBot, x1 - 40 * s, yTop, -30 * s, `${trayH} mm (YAN YUKSEKLIK)`);
  dxf.addDimension(x1, yTop + 35 * s, x2, yTop + 35 * s, 25 * s, '2000 mm (BOYUNA ACIKLIK)');
  dxf.addDimension(consoleXLocs[0], yBot - 80 * s, consoleXLocs[1], yBot - 80 * s, -25 * s, '1200 mm (MAKSIMUM KONSOL MESAFESI)');

  dxf.setLayer('METIN_BILGI');
  dxf.addText(cx, yTop + 85 * s, 24 * s, 'GORUNUS 2: 500 MM KABLO TAVASI BOYUNA YAN GORUNUSU (ELEVATION)', 'METIN_BILGI', 0, 'center');
  dxf.addText(cx, yBot - 150 * s, 16 * s, 'H=100mm Kenar Yuksekligi, Yan Havalandirma Slotlari ve C-Profil Tasiyici Konsol Araliklari', 'METIN_BILGI', 0, 'center');
}

/**
 * GÖRÜNÜŞ 3: 500mm Kablo Tavası 3D İzometrik Montaj Görünüşü
 */
function draw500mmTrayIsometricView(dxf, cx, cy, s) {
  dxf.setLayer('TAVA_PROFILI');

  const cos30 = Math.cos(Math.PI / 6); // ~0.866
  const sin30 = Math.sin(Math.PI / 6); // ~0.500

  // 3D Boyutlar
  const W = 450 * s; // Genişlik
  const L = 750 * s; // Boy
  const H = 90 * s;  // Yükseklik

  // İzometrik Projeksiyon Dönüştürücü: (x, y_long, z_up) -> (X2D, Y2D)
  function iso(ix, iy, iz) {
    return {
      x: cx - ix * cos30 + iy * cos30,
      y: cy - ix * sin30 - iy * sin30 + iz
    };
  }

  // Taban Sacı Dörtgeni
  const pB1 = iso(0, 0, 0);
  const pB2 = iso(W, 0, 0);
  const pB3 = iso(W, L, 0);
  const pB4 = iso(0, L, 0);

  dxf.addLine(pB1.x, pB1.y, pB2.x, pB2.y);
  dxf.addLine(pB2.x, pB2.y, pB3.x, pB3.y);
  dxf.addLine(pB3.x, pB3.y, pB4.x, pB4.y);
  dxf.addLine(pB4.x, pB4.y, pB1.x, pB1.y);

  // Sol Yan Duvar (ix = 0)
  const pTL1 = iso(0, 0, H);
  const pTL4 = iso(0, L, H);
  dxf.addLine(pB1.x, pB1.y, pTL1.x, pTL1.y);
  dxf.addLine(pB4.x, pB4.y, pTL4.x, pTL4.y);
  dxf.addLine(pTL1.x, pTL1.y, pTL4.x, pTL4.y);

  // Sağ Yan Duvar (ix = W)
  const pTR2 = iso(W, 0, H);
  const pTR3 = iso(W, L, H);
  dxf.addLine(pB2.x, pB2.y, pTR2.x, pTR2.y);
  dxf.addLine(pB3.x, pB3.y, pTR3.x, pTR3.y);
  dxf.addLine(pTR2.x, pTR2.y, pTR3.x, pTR3.y);

  // Üst Emniyet Flanş Kıvrımları (15mm dışa)
  const lip = 20 * s;
  const pLipL1 = iso(-lip, 0, H);
  const pLipL4 = iso(-lip, L, H);
  dxf.addLine(pTL1.x, pTL1.y, pLipL1.x, pLipL1.y);
  dxf.addLine(pTL4.x, pTL4.y, pLipL4.x, pLipL4.y);
  dxf.addLine(pLipL1.x, pLipL1.y, pLipL4.x, pLipL4.y);

  const pLipR2 = iso(W + lip, 0, H);
  const pLipR3 = iso(W + lip, L, H);
  dxf.addLine(pTR2.x, pTR2.y, pLipR2.x, pLipR2.y);
  dxf.addLine(pTR3.x, pTR3.y, pLipR3.x, pLipR3.y);
  dxf.addLine(pLipR2.x, pLipR2.y, pLipR3.x, pLipR3.y);

  // İzometrik Taban Perforasyon Slotları
  dxf.setLayer('TAVA_DETAY_DELIK');
  for (let iy = 100 * s; iy <= L - 100 * s; iy += 140 * s) {
    [W * 0.25, W * 0.5, W * 0.75].forEach(ix => {
      const s1 = iso(ix - 12 * s, iy - 25 * s, 0);
      const s2 = iso(ix + 12 * s, iy - 25 * s, 0);
      const s3 = iso(ix + 12 * s, iy + 25 * s, 0);
      const s4 = iso(ix - 12 * s, iy + 25 * s, 0);
      dxf.addLine(s1.x, s1.y, s2.x, s2.y);
      dxf.addLine(s2.x, s2.y, s3.x, s3.y);
      dxf.addLine(s3.x, s3.y, s4.x, s4.y);
      dxf.addLine(s4.x, s4.y, s1.x, s1.y);
    });
  }

  // Alt C-Profil Taşıyıcı Konsol (İzometrik)
  dxf.setLayer('TAVA_ASKI_KONSOL');
  const cY = L * 0.45;
  const cB1 = iso(-lip - 30 * s, cY, -35 * s);
  const cB2 = iso(W + lip + 30 * s, cY, -35 * s);
  const cT1 = iso(-lip - 30 * s, cY, 0);
  const cT2 = iso(W + lip + 30 * s, cY, 0);

  dxf.addLine(cB1.x, cB1.y, cB2.x, cB2.y);
  dxf.addLine(cT1.x, cT1.y, cT2.x, cT2.y);
  dxf.addLine(cB1.x, cB1.y, cT1.x, cT1.y);
  dxf.addLine(cB2.x, cB2.y, cT2.x, cT2.y);

  // Tij askı milleri
  dxf.addLine(cT1.x, cT1.y, cT1.x, cT1.y + 160 * s);
  dxf.addLine(cT2.x, cT2.y, cT2.x, cT2.y + 160 * s);

  dxf.setLayer('METIN_BILGI');
  dxf.addText(cx, cy + 280 * s, 20 * s, 'GORUNUS 3: 500 MM KABLO TAVASI 3D IZOMETRIK MONTAJ GORUNUMU', 'METIN_BILGI', 0, 'center');
  dxf.addText(cx, cy - 320 * s, 14 * s, 'U-Sac Govde, 15mm Emniyet Flans Dudaklari ve Alttan C-Profil Konsol Oturusu', 'METIN_BILGI', 0, 'center');
}

/**
 * GÖRÜNÜŞ 4 & 5: Askı Konsolu ve Ek Plakası Detayları (1:5 Büyütülmüş Zoom Çizimleri)
 */
function drawTrayMountingDetails(dxf, cx1, cy1, cx2, cy2, s) {
  // -------------------------------------------------------------
  // DETAY A: C-PROFİL ASKI KONSOLU VE TİJ MONTAJ DETAYI
  // -------------------------------------------------------------
  dxf.setLayer('METIN_BILGI');
  dxf.addRect(cx1 - 220 * s, cy1 - 200 * s, 440 * s, 400 * s);
  dxf.addText(cx1, cy1 + 170 * s, 18 * s, 'DETAY A: C-PROFIL ASKI KONSOLU VE TIJ BAGLANTISI', 'METIN_BILGI', 0, 'center');

  // C-Profil Kesiti (41x41mm Unistrut Kanalı)
  dxf.setLayer('TAVA_ASKI_KONSOL');
  const cW = 140 * s;
  const cH = 140 * s;
  const cX = cx1 - cW / 2;
  const cY = cy1 - 40 * s;
  dxf.addRect(cX, cY, cW, cH);
  dxf.addRect(cX + 12 * s, cY + 12 * s, cW - 24 * s, cH - 24 * s);
  dxf.addRect(cX + cW / 2 - 35 * s, cY + cH - 14 * s, 70 * s, 16 * s); // Üst kanal açıklığı

  // M10 Dişli Tij Askı Mili
  dxf.addLine(cx1 - 10 * s, cy1 - 180 * s, cx1 - 10 * s, cy1 + 140 * s);
  dxf.addLine(cx1 + 10 * s, cy1 - 180 * s, cx1 + 10 * s, cy1 + 140 * s);
  // Yaylı Kanal Somunu (Unistrut Spring Nut)
  dxf.addRect(cx1 - 30 * s, cY + cH - 30 * s, 60 * s, 20 * s);
  // Alt Emniyet Somunu ve Rondela
  dxf.addRect(cx1 - 25 * s, cY - 24 * s, 50 * s, 18 * s);
  dxf.addRect(cx1 - 32 * s, cY - 6 * s, 64 * s, 6 * s);

  // Tava Kenarını Kilitleyen Z-Çenesi (Hold-Down Clamp)
  dxf.setLayer('TAVA_PROFILI');
  dxf.addRect(cX - 30 * s, cY + cH, 60 * s, 35 * s);
  dxf.addLine(cX - 30 * s, cY + cH + 35 * s, cX + 15 * s, cY + cH + 35 * s);

  dxf.setLayer('METIN_BILGI');
  dxf.addText(cx1, cy1 - 100 * s, 13 * s, '41x41x2.5mm TS EN 10346 C-Profil', 'METIN_BILGI', 0, 'center');
  dxf.addText(cx1, cy1 - 130 * s, 13 * s, 'M10 8.8 Galvaniz Tij Askisi + Cift Somun', 'METIN_BILGI', 0, 'center');
  dxf.addText(cx1, cy1 - 160 * s, 13 * s, 'Tava Kilitleme Z-Cenesi (Hold-Down Clamp)', 'METIN_BILGI', 0, 'center');

  // -------------------------------------------------------------
  // DETAY B: TAVA EK PLAKASI VE TOPRAKLAMA KÖPRÜSÜ DETAYI
  // -------------------------------------------------------------
  dxf.setLayer('METIN_BILGI');
  dxf.addRect(cx2 - 220 * s, cy2 - 200 * s, 440 * s, 400 * s);
  dxf.addText(cx2, cy2 + 170 * s, 18 * s, 'DETAY B: TAVA EKLEME VE TOPRAKLAMA KOPRUSU', 'METIN_BILGI', 0, 'center');

  // Tava Kesit Birleşimi (İki tavanın uç uca geldiği 2mm genleşme boşluğu)
  dxf.setLayer('TAVA_PROFILI');
  dxf.addRect(cx2 - 180 * s, cy2 - 10 * s, 175 * s, 40 * s);
  dxf.addRect(cx2 + 5 * s, cy2 - 10 * s, 175 * s, 40 * s);

  // Yan Ek Sacı (Splice Plate - 200x80x2mm)
  dxf.setLayer('TAVA_KONSOL');
  dxf.addRect(cx2 - 140 * s, cy2 - 25 * s, 280 * s, 70 * s);

  // M6 Mantar Başlı Kare Boyunlu Cıvatalar (DIN 603)
  [-90, -30, 30, 90].forEach(bx => {
    dxf.addCircle(cx2 + bx * s, cy2 + 10 * s, 12 * s); // Mantar baş
    dxf.addCircle(cx2 + bx * s, cy2 + 10 * s, 6 * s);  // M6 gövde
    dxf.addLine(cx2 + (bx - 12) * s, cy2 + 10 * s, cx2 + (bx + 12) * s, cy2 + 10 * s);
    dxf.addLine(cx2 + bx * s, cy2 - 2 * s, cx2 + bx * s, cy2 + 22 * s);
  });

  // Topraklama Örgü Köprüsü (Earth Bonding Braid Jumper)
  dxf.setLayer('KBL_ETIKET_BAG');
  dxf.addRect(cx2 - 110 * s, cy2 + 65 * s, 220 * s, 20 * s);
  dxf.addCircle(cx2 - 90 * s, cy2 + 75 * s, 7 * s);
  dxf.addCircle(cx2 + 90 * s, cy2 + 75 * s, 7 * s);

  dxf.setLayer('METIN_BILGI');
  dxf.addText(cx2, cy2 - 80 * s, 13 * s, '200x80x2.0mm Galvaniz Ek Sac Plakasi', 'METIN_BILGI', 0, 'center');
  dxf.addText(cx2, cy2 - 110 * s, 13 * s, 'M6x16 DIN 603 Mantar Basli Civata + Flansli Somun', 'METIN_BILGI', 0, 'center');
  dxf.addText(cx2, cy2 - 140 * s, 13 * s, '16 mm2 Bakir Orgulu Esnek Topraklama Seridi', 'METIN_BILGI', 0, 'center');
}

// =========================================================================
// 2. 500MM CABLE TRAY CROSS-SECTION PROFILE DRAWER (KABLO DOLULUK KESİTLERİ İÇİN)
// =========================================================================

/**
 * Draw 500mm heavy duty perforated cable tray profile with support bracket,
 * threaded rods, flange lips, and optional separator plate.
 * Inner Width = 500mm, Side Height = 100mm, Sheet Metal t = 2mm.
 */
function draw500mmTrayProfile(dxf, cx, cy, s, trayH = 100, hasSeparator = false, sepOffsetFromCenter = 0, sepLabel = 'SEPERATOR') {
  const W = 500 * s;
  const H = trayH * s;
  const t = 2 * s;
  const lipW = 15 * s;
  const lipH = 8 * s;

  dxf.setLayer('TAVA_PROFILI');

  const xL = cx - W / 2;
  const xR = cx + W / 2;
  const yBot = cy;
  const yTop = cy + H;

  // Outer profile lines
  // Bottom plate
  dxf.addLine(xL, yBot, xR, yBot);
  dxf.addLine(xL - t, yBot - t, xR + t, yBot - t);

  // Left vertical wall
  dxf.addLine(xL, yBot, xL, yTop);
  dxf.addLine(xL - t, yBot - t, xL - t, yTop);

  // Right vertical wall
  dxf.addLine(xR, yBot, xR, yTop);
  dxf.addLine(xR + t, yBot - t, xR + t, yTop);

  // Left top safety return lip (flange)
  dxf.addLine(xL, yTop, xL - lipW, yTop);
  dxf.addLine(xL - lipW, yTop, xL - lipW, yTop - lipH);
  dxf.addLine(xL - lipW, yTop - lipH, xL - t, yTop - lipH);

  // Right top safety return lip (flange)
  dxf.addLine(xR, yTop, xR + lipW, yTop);
  dxf.addLine(xR + lipW, yTop, xR + lipW, yTop - lipH);
  dxf.addLine(xR + lipW, yTop - lipH, xR + t, yTop - lipH);

  // Perforated drainage slots along bottom (symbolic dashed slots)
  dxf.setLayer('TAVA_DETAY_DELIK');
  const numSlots = 9;
  const slotW = 30 * s;
  const slotSpacing = (W - 60 * s) / (numSlots - 1);
  for (let i = 0; i < numSlots; i++) {
    const sx = (xL + 30 * s) + i * slotSpacing;
    dxf.addLine(sx - slotW / 2, yBot - t * 0.5, sx + slotW / 2, yBot - t * 0.5);
  }

  // 2. Galvanized Separator Partition (if required to isolate RF Feeder and DC Power)
  if (hasSeparator) {
    dxf.setLayer('TAVA_SEPERATOR');
    const sepX = cx + sepOffsetFromCenter * s;
    const sepH = (trayH - 20) * s;
    dxf.addRect(sepX - 1 * s, yBot, 2 * s, sepH);
    dxf.addLine(sepX - 15 * s, yBot, sepX + 15 * s, yBot);
    dxf.addCircle(sepX, yBot + 10 * s, 3 * s);
    dxf.addText(sepX, yBot + sepH + 12 * s, 16 * s, sepLabel, 'TAVA_SEPERATOR', 0, 'center', 'bottom');
  }

  // 3. Under-Tray Support Console & M10 Threaded Suspension Rods (C-Profil Konsol)
  dxf.setLayer('TAVA_ASKI_KONSOL');
  const consoleW = 580 * s;
  const consoleH = 35 * s;
  const consoleY = yBot - t - consoleH;
  dxf.addRect(cx - consoleW / 2, consoleY, consoleW, consoleH);
  dxf.addRect(cx - consoleW / 2 + 10 * s, consoleY + 8 * s, consoleW - 20 * s, 14 * s);

  // Left Threaded Rod (M10 tij)
  const rodXL = cx - 270 * s;
  dxf.addLine(rodXL, consoleY - 20 * s, rodXL, yTop + 80 * s);
  dxf.addLine(rodXL + 8 * s, consoleY - 20 * s, rodXL + 8 * s, yTop + 80 * s);
  dxf.addRect(rodXL - 4 * s, consoleY - 14 * s, 16 * s, 10 * s);
  dxf.addRect(rodXL - 6 * s, consoleY - 4 * s, 20 * s, 4 * s);

  // Right Threaded Rod (M10 tij)
  const rodXR = cx + 262 * s;
  dxf.addLine(rodXR, consoleY - 20 * s, rodXR, yTop + 80 * s);
  dxf.addLine(rodXR + 8 * s, consoleY - 20 * s, rodXR + 8 * s, yTop + 80 * s);
  dxf.addRect(rodXR - 4 * s, consoleY - 14 * s, 16 * s, 10 * s);
  dxf.addRect(rodXR - 6 * s, consoleY - 4 * s, 20 * s, 4 * s);

  // Tray Dimensions
  dxf.setLayer('OLCULER');
  dxf.addDimension(xL, yTop + 25 * s, xR, yTop + 25 * s, 25 * s, '500 mm (IC GENISLIK)');
  dxf.addDimension(xL - lipW - 15 * s, yBot, xL - lipW - 15 * s, yTop, -25 * s, `${trayH} mm`);
}

// =========================================================================
// 3. HIGH-FIDELITY CABLE CROSS-SECTION DRAWING ROUTINES
// =========================================================================

function drawFeederCrossSection(dxf, x, y, r, type = '7/8', label = '') {
  const layer = type === '7/8' ? 'KBL_FEEDER_7_8' : 'KBL_FEEDER_1_2';
  dxf.setLayer(layer);

  dxf.addCircle(x, y, r);
  dxf.addCircle(x, y, r * 0.88);
  dxf.addCircle(x, y, r * 0.72);
  dxf.addCircle(x, y, r * 0.35);
  dxf.addCircle(x, y, r * 0.22);

  dxf.addLine(x - r * 0.25, y, x + r * 0.25, y);
  dxf.addLine(x, y - r * 0.25, x, y + r * 0.25);

  if (label) {
    dxf.setLayer('METIN_BILGI');
    dxf.addText(x, y, r * 0.45, label, 'METIN_BILGI', 0, 'center', 'middle');
  }
}

function drawPowerCableCrossSection(dxf, x, y, r, label = '') {
  dxf.setLayer('KBL_ENERJI_2X25');

  dxf.addCircle(x, y, r);
  dxf.addCircle(x, y, r * 0.90);

  const condR = r * 0.36;
  const offX = r * 0.38;

  dxf.addCircle(x - offX, y, condR);
  dxf.addCircle(x - offX, y, condR * 0.70);
  dxf.addCircle(x + offX, y, condR);
  dxf.addCircle(x + offX, y, condR * 0.70);

  if (label) {
    dxf.setLayer('METIN_BILGI');
    dxf.addText(x, y + r + 4 * (r / 10.5), 10 * (r / 10.5), label, 'METIN_BILGI', 0, 'center', 'bottom');
  }
}

function drawFiberCableCrossSection(dxf, x, y, r, label = '') {
  dxf.setLayer('KBL_FIBER_OPTIK');

  dxf.addCircle(x, y, r);
  dxf.addCircle(x, y, r * 0.85);
  dxf.addCircle(x, y, r * 0.65);
  dxf.addCircle(x, y, r * 0.28);

  const fOff = r * 0.45;
  dxf.addCircle(x - fOff, y, r * 0.12);
  dxf.addCircle(x + fOff, y, r * 0.12);
  dxf.addCircle(x, y - fOff, r * 0.12);
  dxf.addCircle(x, y + fOff, r * 0.12);

  if (label) {
    dxf.setLayer('METIN_BILGI');
    dxf.addText(x, y + r + 4 * (r / 6), 10 * (r / 6), label, 'METIN_BILGI', 0, 'center', 'bottom');
  }
}

// =========================================================================
// 4. MASTER GENERATOR FOR 500MM CABLE TRAY PAFTA (TAVA İMALAT ÇİZİMLERİ + 7 ADET KESİT)
// =========================================================================
function generateCableTraySections2D(units = 'mm') {
  const isMm = units === 'mm';
  const s = isMm ? 1 : 0.001;
  const dxf = new DxfBuilder(units);

  // =======================================================================
  // BÖLÜM 1: 500 MM AĞIR HİZMET DELİKLİ KABLO TAVASI İMALAT VE DETAY ÇİZİMLERİ
  // =======================================================================
  dxf.setLayer('METIN_BILGI');
  dxf.addRect(-1150 * s, 4700 * s, 2300 * s, 100 * s);
  dxf.addText(0, 4745 * s, 34 * s, 'BOLUM 1: 500 MM AGIR HIZMET DELIKLI KABLO TAVASI IMALAT VE MONTAJ DETAY CIZIMLERI', 'METIN_BILGI', 0, 'center');

  // GÖRÜNÜŞ 1: 500mm Kablo Tavası Üstten Plan Görünüşü (L = 2000mm, W = 500mm)
  draw500mmTrayPlanView(dxf, 0, 4150 * s, s, 2000, 500, 100);

  // GÖRÜNÜŞ 2: 500mm Kablo Tavası Boyuna Yan Görünüşü (L = 2000mm, H = 100mm)
  draw500mmTraySideElevation(dxf, 0, 3350 * s, s, 2000, 100);

  // GÖRÜNÜŞ 3: 500mm Kablo Tavası 3D İzometrik Montaj Görünümü
  draw500mmTrayIsometricView(dxf, -600 * s, 2600 * s, s);

  // DETAY A & B: Askı Konsolu ve Ek Plakası 1:5 Zoom Detayları
  drawTrayMountingDetails(dxf, 50 * s, 2600 * s, 600 * s, 2600 * s, s);

  // =======================================================================
  // BÖLÜM 2: 500 MM KABLO TAVASI LOKASYON BAZLI KABLO DOLULUK KESİTLERİ
  // =======================================================================
  dxf.setLayer('METIN_BILGI');
  dxf.addRect(-1150 * s, 2080 * s, 2300 * s, 90 * s);
  dxf.addText(0, 2120 * s, 32 * s, 'BOLUM 2: 500 MM KABLO TAVASI LOKASYON BAZLI KABLO DOLULUK KESITLERI (7 FARKLI KESIT)', 'METIN_BILGI', 0, 'center');

  // Radii
  const r78 = 14 * s;    // 7/8" Feeder (OD 28mm)
  const r12 = 8 * s;     // 1/2" Feeder (OD 16mm)
  const rPwr = 10.5 * s; // 2x25 mm2 DC Power (OD 21mm)
  const rFib = 6 * s;    // Fiber Optic (OD 12mm)

  // Spacing parameters for vertical pafta layout (Two columns)
  const col1X = -550 * s;
  const col2X = 550 * s;

  // -----------------------------------------------------------------------
  // KESİT 1: ALAN 1 & 3
  // 40 TANE 7/8" FEEDER + 13 TANE 2x25 ENERJİ KABLOSU + 3 TANE FİBEROPTİK
  // -----------------------------------------------------------------------
  const k1Y = 1750 * s;
  draw500mmTrayProfile(dxf, col1X, k1Y, s, 120, true, 80, 'EMC SEPERATOR SACI');

  const k1FeedCols = 10;
  const k1FeedTiers = 4;
  const k1FeedStartX = col1X - 225 * s;
  const k1FeedSpacingX = 30 * s;
  const k1FeedSpacingY = 28 * s;

  for (let c = 0; c < k1FeedCols; c++) {
    const cx = k1FeedStartX + c * k1FeedSpacingX;
    for (let t = 0; t < k1FeedTiers; t++) {
      const cy = k1Y + r78 + t * k1FeedSpacingY;
      drawFeederCrossSection(dxf, cx, cy, r78, '7/8');
    }
  }

  const k1PwrStartX = col1X + 105 * s;
  const k1PwrSpacingX = 23 * s;
  const k1PwrSpacingY = 22 * s;
  let pwrCount = 0;
  for (let t = 0; t < 4; t++) {
    for (let c = 0; c < 4; c++) {
      if (pwrCount >= 13) break;
      const px = k1PwrStartX + c * k1PwrSpacingX;
      const py = k1Y + rPwr + t * k1PwrSpacingY;
      drawPowerCableCrossSection(dxf, px, py, rPwr);
      pwrCount++;
    }
  }

  const k1FibStartX = col1X + 205 * s;
  const k1FibSpacingX = 14 * s;
  for (let f = 0; f < 3; f++) {
    const fx = k1FibStartX + f * k1FibSpacingX;
    const fy = k1Y + rFib;
    drawFiberCableCrossSection(dxf, fx, fy, rFib);
  }

  dxf.setLayer('METIN_BILGI');
  dxf.addText(col1X - 90 * s, k1Y + 125 * s, 18 * s, '40 ADET 7/8" FEEDER (10x4 KATMAN)', 'METIN_BILGI', 0, 'center');
  dxf.addText(col1X + 140 * s, k1Y + 95 * s, 16 * s, '13x 2x25 mm2', 'METIN_BILGI', 0, 'center');
  dxf.addText(col1X + 220 * s, k1Y + 30 * s, 14 * s, '3x FIBER', 'METIN_BILGI', 0, 'center');

  dxf.addText(col1X, k1Y - 70 * s, 26 * s, 'KESIT 1: ALAN 1 & 3 - ANA BESLEME VE OMURGA HATTI', 'METIN_BILGI', 0, 'center');
  dxf.addText(col1X, k1Y - 100 * s, 18 * s, '40x 7/8" Feeder + 13x 2x25 mm2 Enerji + 3x Fiberoptik (Doluluk: %58.2)', 'METIN_BILGI', 0, 'center');

  // -----------------------------------------------------------------------
  // KESİT 2: ALAN 1 & 3
  // 40 TANE 7/8" FEEDER + 10 TANE 1/2" FEEDER
  // -----------------------------------------------------------------------
  const k2Y = 1250 * s;
  draw500mmTrayProfile(dxf, col1X, k2Y, s, 120, false);

  for (let c = 0; c < k1FeedCols; c++) {
    const cx = k1FeedStartX + c * k1FeedSpacingX;
    for (let t = 0; t < k1FeedTiers; t++) {
      const cy = k2Y + r78 + t * k1FeedSpacingY;
      drawFeederCrossSection(dxf, cx, cy, r78, '7/8');
    }
  }

  const k2Feed12StartX = col1X + 110 * s;
  const k2Feed12SpacingX = 18 * s;
  const k2Feed12SpacingY = 18 * s;
  let feed12Count = 0;
  for (let t = 0; t < 2; t++) {
    for (let c = 0; c < 5; c++) {
      if (feed12Count >= 10) break;
      const fx = k2Feed12StartX + c * k2Feed12SpacingX;
      const fy = k2Y + r12 + t * k2Feed12SpacingY;
      drawFeederCrossSection(dxf, fx, fy, r12, '1/2');
      feed12Count++;
    }
  }

  dxf.setLayer('METIN_BILGI');
  dxf.addText(col1X - 90 * s, k2Y + 125 * s, 18 * s, '40 ADET 7/8" FEEDER (10x4 KATMAN)', 'METIN_BILGI', 0, 'center');
  dxf.addText(col1X + 155 * s, k2Y + 50 * s, 16 * s, '10 ADET 1/2" FEEDER (5x2)', 'METIN_BILGI', 0, 'center');

  dxf.addText(col1X, k2Y - 70 * s, 26 * s, 'KESIT 2: ALAN 1 & 3 - FEEDER DAGITIM HATTI', 'METIN_BILGI', 0, 'center');
  dxf.addText(col1X, k2Y - 100 * s, 18 * s, '40x 7/8" Feeder + 10x 1/2" Feeder Kablo Kesiti (Doluluk: %44.4)', 'METIN_BILGI', 0, 'center');

  // -----------------------------------------------------------------------
  // KESİT 3: ALAN 1 & 3
  // 20 TANE 1/2" FEEDER + 58 TANE 1/2" FEEDER (TOPLAM: 78 ADET 1/2" FEEDER)
  // -----------------------------------------------------------------------
  const k3Y = 750 * s;
  draw500mmTrayProfile(dxf, col1X, k3Y, s, 100, true, -100, 'BOLUM AYIRICI SAC');

  // Sol Grup (20 Adet 1/2" Feeder: 5 Sütun x 4 Katman = 20 Adet)
  const k3LeftCols = 5;
  const k3LeftTiers = 4;
  const k3LeftStartX = col1X - 220 * s;
  const k3LeftSpacingX = 20 * s;
  const k3LeftSpacingY = 18 * s;

  for (let c = 0; c < k3LeftCols; c++) {
    const cx = k3LeftStartX + c * k3LeftSpacingX;
    for (let t = 0; t < k3LeftTiers; t++) {
      const cy = k3Y + r12 + t * k3LeftSpacingY;
      drawFeederCrossSection(dxf, cx, cy, r12, '1/2');
    }
  }

  // Sağ Grup (58 Adet 1/2" Feeder: 15 Sütun x 4 Katman = 60 Kapasite, 58 Dolu)
  const k3RightCols = 15;
  const k3RightStartX = col1X - 70 * s;
  const k3RightSpacingX = 20 * s;
  let count58 = 0;
  for (let t = 0; t < 4; t++) {
    for (let c = 0; c < k3RightCols; c++) {
      if (count58 >= 58) break;
      const cx = k3RightStartX + c * k3RightSpacingX;
      const cy = k3Y + r12 + t * k3LeftSpacingY;
      drawFeederCrossSection(dxf, cx, cy, r12, '1/2');
      count58++;
    }
  }

  dxf.setLayer('METIN_BILGI');
  dxf.addText(col1X - 180 * s, k3Y + 85 * s, 17 * s, '20x 1/2" (GRUP A)', 'METIN_BILGI', 0, 'center');
  dxf.addText(col1X + 70 * s, k3Y + 85 * s, 17 * s, '58x 1/2" (GRUP B)', 'METIN_BILGI', 0, 'center');

  dxf.addText(col1X, k3Y - 70 * s, 26 * s, 'KESIT 3: ALAN 1 & 3 - COKLU 1/2" FEEDER HATTI', 'METIN_BILGI', 0, 'center');
  dxf.addText(col1X, k3Y - 100 * s, 18 * s, 'Toplam 78 Adet 1/2" Feeder (20 Adet + 58 Adet Ayrik Deste, Doluluk: %31.4)', 'METIN_BILGI', 0, 'center');

  // -----------------------------------------------------------------------
  // KESİT 4: ALAN 1 & 3
  // 40 ADET 7/8" FEEDER KABLO
  // -----------------------------------------------------------------------
  const k4Y = 250 * s;
  draw500mmTrayProfile(dxf, col1X, k4Y, s, 120, false);

  for (let c = 0; c < k1FeedCols; c++) {
    const cx = k1FeedStartX + c * k1FeedSpacingX;
    for (let t = 0; t < k1FeedTiers; t++) {
      const cy = k4Y + r78 + t * k1FeedSpacingY;
      drawFeederCrossSection(dxf, cx, cy, r78, '7/8');
    }
  }

  dxf.setLayer('METIN_BILGI');
  dxf.addText(col1X, k4Y + 125 * s, 20 * s, '40 ADET 7/8" FEEDER KABLO (10 SUTUN x 4 KATMAN DUZENI)', 'METIN_BILGI', 0, 'center');

  dxf.addText(col1X, k4Y - 70 * s, 26 * s, 'KESIT 4: ALAN 1 & 3 - MARATON TRİBÜNÜ ANA FEEDER HATTI', 'METIN_BILGI', 0, 'center');
  dxf.addText(col1X, k4Y - 100 * s, 18 * s, '40 Adet 7/8" Feeder Kablo Kesiti (Doluluk: %41.0 - %59.0 Rezerv Alan)', 'METIN_BILGI', 0, 'center');

  // -----------------------------------------------------------------------
  // KESİT 5: ALAN 2 (SCOREBOARD)
  // 20 ADET 1/2" FEEDER KABLO
  // -----------------------------------------------------------------------
  const k5Y = 1750 * s;
  draw500mmTrayProfile(dxf, col2X, k5Y, s, 100, false);

  const k5Cols = 10;
  const k5Tiers = 2;
  const k5StartX = col2X - 200 * s;
  const k5SpacingX = 44 * s;
  const k5SpacingY = 25 * s;

  for (let t = 0; t < k5Tiers; t++) {
    for (let c = 0; c < k5Cols; c++) {
      const cx = k5StartX + c * k5SpacingX;
      const cy = k5Y + r12 + t * k5SpacingY;
      drawFeederCrossSection(dxf, cx, cy, r12, '1/2');
    }
  }

  dxf.setLayer('METIN_BILGI');
  dxf.addText(col2X, k5Y + 65 * s, 18 * s, '20 ADET 1/2" FEEDER (10x2 DUZENI - GENIS REZERV ALANLI)', 'METIN_BILGI', 0, 'center');

  dxf.addText(col2X, k5Y - 70 * s, 26 * s, 'KESIT 5: ALAN 2 (SCOREBOARD) - POI BESLEME FEEDER HATTI', 'METIN_BILGI', 0, 'center');
  dxf.addText(col2X, k5Y - 100 * s, 18 * s, '20 Adet 1/2" Feeder Kablo Kesiti (Doluluk: %8.0 - %92.0 Genisleme Rezervi)', 'METIN_BILGI', 0, 'center');

  // -----------------------------------------------------------------------
  // KESİT 6: ALAN 2 (SCOREBOARD)
  // 13 TANE 2x25 ENERJİ KABLOSU + 3 TANE FİBEROPTİK
  // -----------------------------------------------------------------------
  const k6Y = 1250 * s;
  draw500mmTrayProfile(dxf, col2X, k6Y, s, 100, true, 40, 'IZOLASYON SEPERATORU');

  const k6PwrStartX = col2X - 210 * s;
  const k6PwrSpacingX = 32 * s;
  const k6PwrSpacingY = 26 * s;
  let k6PwrCount = 0;
  for (let t = 0; t < 2; t++) {
    for (let c = 0; c < 7; c++) {
      if (k6PwrCount >= 13) break;
      const px = k6PwrStartX + c * k6PwrSpacingX;
      const py = k6Y + rPwr + t * k6PwrSpacingY;
      drawPowerCableCrossSection(dxf, px, py, rPwr);
      k6PwrCount++;
    }
  }

  const k6FibStartX = col2X + 110 * s;
  const k6FibSpacingX = 35 * s;
  for (let f = 0; f < 3; f++) {
    const fx = k6FibStartX + f * k6FibSpacingX;
    const fy = k6Y + rFib;
    drawFiberCableCrossSection(dxf, fx, fy, rFib);
  }

  dxf.setLayer('METIN_BILGI');
  dxf.addText(col2X - 100 * s, k6Y + 65 * s, 18 * s, '13 ADET 2x25 mm2 DC ENERJI', 'METIN_BILGI', 0, 'center');
  dxf.addText(col2X + 150 * s, k6Y + 30 * s, 16 * s, '3x FIBER', 'METIN_BILGI', 0, 'center');

  dxf.addText(col2X, k6Y - 70 * s, 26 * s, 'KESIT 6: ALAN 2 (SCOREBOARD) - DC ENERJI VE FIBER HATTI', 'METIN_BILGI', 0, 'center');
  dxf.addText(col2X, k6Y - 100 * s, 18 * s, '13x 2x25 mm2 DC Enerji + 3x Fiberoptik Kablo Kesiti (Doluluk: %9.7)', 'METIN_BILGI', 0, 'center');

  // -----------------------------------------------------------------------
  // KESİT 7: ALAN 4 (ÇAPRAZ KÖŞE TRİBÜN)
  // 8 TANE 7/8" FEEDER KABLO
  // -----------------------------------------------------------------------
  const k7Y = 750 * s;
  draw500mmTrayProfile(dxf, col2X, k7Y, s, 100, false);

  const k7Cols = 8;
  const k7StartX = col2X - 210 * s;
  const k7SpacingX = 60 * s;

  for (let c = 0; c < k7Cols; c++) {
    const cx = k7StartX + c * k7SpacingX;
    const cy = k7Y + r78;
    drawFeederCrossSection(dxf, cx, cy, r78, '7/8');
    dxf.setLayer('KBL_ETIKET_BAG');
    dxf.addLine(cx - 10 * s, cy + r78 + 3 * s, cx + 10 * s, cy + r78 + 3 * s);
  }

  dxf.setLayer('METIN_BILGI');
  dxf.addText(col2X, k7Y + 45 * s, 18 * s, '8 ADET 7/8" FEEDER (TEK SIRA YAN YANA KLIPSLI DIZILIM)', 'METIN_BILGI', 0, 'center');

  dxf.addText(col2X, k7Y - 70 * s, 26 * s, 'KESIT 7: ALAN 4 (KOSE TRIBUN) - CATI BESLEME HATTI', 'METIN_BILGI', 0, 'center');
  dxf.addText(col2X, k7Y - 100 * s, 18 * s, '8 Adet 7/8" Feeder Kablo Kesiti (Doluluk: %9.8 - %90.2 Rezerv Alan)', 'METIN_BILGI', 0, 'center');

  // -----------------------------------------------------------------------
  // BÖLÜM 3: KABLO TİPLERİ, ÇAPLARI VE LEJANT BİLGİLERİ
  // -----------------------------------------------------------------------
  const detY = 250 * s;
  dxf.setLayer('METIN_BILGI');
  dxf.addRect(col2X - 280 * s, detY - 40 * s, 560 * s, 190 * s, 'METIN_BILGI');
  dxf.addText(col2X, detY + 120 * s, 22 * s, 'KABLO TIPLERI, CAPLARI VE LEJANT BILGILERI', 'METIN_BILGI', 0, 'center');

  drawFeederCrossSection(dxf, col2X - 180 * s, detY + 45 * s, r78, '7/8');
  dxf.addText(col2X - 180 * s, detY + 5 * s, 14 * s, '7/8" Feeder (OD 28mm)', 'METIN_BILGI', 0, 'center');

  drawFeederCrossSection(dxf, col2X - 60 * s, detY + 45 * s, r12, '1/2');
  dxf.addText(col2X - 60 * s, detY + 5 * s, 14 * s, '1/2" Feeder (OD 16mm)', 'METIN_BILGI', 0, 'center');

  drawPowerCableCrossSection(dxf, col2X + 60 * s, detY + 45 * s, rPwr);
  dxf.addText(col2X + 60 * s, detY + 5 * s, 14 * s, '2x25mm2 DC (OD 21mm)', 'METIN_BILGI', 0, 'center');

  drawFiberCableCrossSection(dxf, col2X + 180 * s, detY + 45 * s, rFib);
  dxf.addText(col2X + 180 * s, detY + 5 * s, 14 * s, 'Fiber Optik (OD 12mm)', 'METIN_BILGI', 0, 'center');

  dxf.addText(col2X, detY - 25 * s, 15 * s, 'Agir Hizmet Sicak Daldirma Galvaniz (TS EN 61537) - 2.0mm Sac Kalinligi', 'METIN_BILGI', 0, 'center');

  // =======================================================================
  // BÖLÜM 4: TAVA DOLULUK ORANI VE KABLO HESAP CETVELİ (TABLE)
  // =======================================================================
  const tblX = -750 * s;
  const tblY = -350 * s;
  const tblW = 1500 * s;
  const tblH = 200 * s;

  dxf.addRect(tblX, tblY, tblW, tblH, 'METIN_BILGI');
  dxf.addLine(tblX, tblY + 160 * s, tblX + tblW, tblY + 160 * s, 'METIN_BILGI');
  dxf.addLine(tblX, tblY + 120 * s, tblX + tblW, tblY + 120 * s, 'METIN_BILGI');

  dxf.addText(tblX + 20 * s, tblY + 172 * s, 22 * s, '500 MM KABLO TAVASI DOLULUK ORANI VE TEKNIK UYGUNLUK CETVELI', 'METIN_BILGI');

  const cols = [
    { x: tblX, w: 90 * s, title: 'KESIT NO' },
    { x: tblX + 90 * s, w: 220 * s, title: 'LOKASYON / ALAN' },
    { x: tblX + 310 * s, w: 460 * s, title: 'KABLO KOMBINASYONU VE SAYISI' },
    { x: tblX + 770 * s, w: 220 * s, title: 'TOPLAM KABLO ALANI' },
    { x: tblX + 990 * s, w: 240 * s, title: 'TAVA DOLULUK ORANI (%)' },
    { x: tblX + 1230 * s, w: 270 * s, title: 'STANDART UYGUNLUGU' }
  ];

  cols.forEach((col, idx) => {
    if (idx > 0) dxf.addLine(col.x, tblY, col.x, tblY + 160 * s, 'METIN_BILGI');
    dxf.addText(col.x + 10 * s, tblY + 133 * s, 15 * s, col.title, 'METIN_BILGI');
  });

  const rowData = [
    { no: 'KESIT 1', loc: 'Alan 1 & 3 (Maraton)', cables: '40x 7/8" Feeder + 13x 2x25 mm2 Enerji + 3x Fiber', area: '29,468 mm2', fill: '%58.9 (Limit: %60)', status: 'UYGUN (Maksimum Verim)' },
    { no: 'KESIT 2', loc: 'Alan 1 & 3 (Maraton)', cables: '40x 7/8" Feeder + 10x 1/2" Feeder', area: '26,644 mm2', fill: '%44.4 (Limit: %60)', status: 'UYGUN (Genisleme Payi Var)' },
    { no: 'KESIT 3', loc: 'Alan 1 & 3 (Maraton)', cables: '20x 1/2" Feeder + 58x 1/2" Feeder (Toplam: 78)', area: '15,683 mm2', fill: '%31.4 (Limit: %50)', status: 'UYGUN (Homojen Dagilim)' },
    { no: 'KESIT 4', loc: 'Alan 1 & 3 (Maraton)', cables: '40 Adet 7/8" Feeder Kablo', area: '24,630 mm2', fill: '%41.0 (Limit: %60)', status: 'UYGUN (Standart 4 Katman)' },
    { no: 'KESIT 5', loc: 'Alan 2 (Skorboard)', cables: '20 Adet 1/2" Feeder Kablo', area: '4,021 mm2', fill: '%8.0 (Limit: %50)', status: 'UYGUN (%92 Rezerv Alan)' },
    { no: 'KESIT 6', loc: 'Alan 2 (Skorboard)', cables: '13x 2x25 mm2 Enerji + 3x Fiberoptik', area: '4,845 mm2', fill: '%9.7 (Limit: %50)', status: 'UYGUN (Seperatorlu Ayrim)' },
    { no: 'KESIT 7', loc: 'Alan 4 (Kose Tribun)', cables: '8 Adet 7/8" Feeder Kablo', area: '4,926 mm2', fill: '%9.8 (Limit: %50)', status: 'UYGUN (Tek Sira Klipsli)' }
  ];

  const rowH = 16 * s;
  rowData.forEach((row, rIdx) => {
    const ry = tblY + 104 * s - rIdx * rowH;
    dxf.addLine(tblX, ry, tblX + tblW, ry, 'METIN_BILGI');
    dxf.addText(cols[0].x + 10 * s, ry + 3 * s, 12 * s, row.no, 'METIN_BILGI');
    dxf.addText(cols[1].x + 10 * s, ry + 3 * s, 12 * s, row.loc, 'METIN_BILGI');
    dxf.addText(cols[2].x + 10 * s, ry + 3 * s, 12 * s, row.cables, 'METIN_BILGI');
    dxf.addText(cols[3].x + 10 * s, ry + 3 * s, 12 * s, row.area, 'METIN_BILGI');
    dxf.addText(cols[4].x + 10 * s, ry + 3 * s, 12 * s, row.fill, 'METIN_BILGI');
    dxf.addText(cols[5].x + 10 * s, ry + 3 * s, 12 * s, row.status, 'METIN_BILGI');
  });

  // Title Block
  addTitleBlock(dxf, '500MM KABLO TAVASI IMALAT VE KABLO DOLULUK KESITLERI', 'TAVA IMALAT VE UYGULAMA DETAYI', isMm ? '1:1 mm' : '1:1 m', units, -425 * s, -600 * s);

  return dxf.toDxfString();
}

// Module Exports
module.exports = {
  generateCableTraySections2D
};

if (require.main === module) {
  console.log('Generating 500mm Cable Tray Complete DXFs (Manufacturing Drawings + 7 Sections)...');
  const trayTasks = [
    { name: '08_500MM_KABLO_TAVASI_TUM_ALANLAR_KABLO_DOLULUK_KESITLERI', fn: generateCableTraySections2D }
  ];

  trayTasks.forEach(t => {
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
  console.log('500mm Cable Tray DXF generation completed.');
}
