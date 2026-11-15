/**
 * generate_tava_300x100_kesit6_7_dxf.cjs
 *
 * PAFTA 25: 300 x 100 mm KABLO TAVASI KESİT 6 VE KESİT 7 KABLO DOLULUK KESİTLERİ
 *
 * Kullanıcı isteği:
 *   "08_500MM_KABLO_TAVASI_TUM_ALANLAR_KABLO_DOLULUK_KESITLERI_mm.dxf dosyası var.
 *    D:\yedek programlar\agentprojerleri\stad\DXF_Ciktilari\Milimetre dizininde
 *    Bundaki KESIT 6 ve KESIT 7 Yİ 300MM GENİŞLİK 100MM derinlik olan bir tavada kesit çiz.
 *    Görsellerde mevcuttakilere sadık kal şablon degiştirme"
 *
 * Kesitler (1 birim = 1 mm):
 *   - KESİT 6: Alan 2 (Scoreboard) — 13 adet 2x25 mm2 DC Enerji + 3x Fiberoptik (Seperatörlü 300x100 Tava)
 *   - KESİT 7: Alan 4 (Köşe Tribün) — 8 adet 7/8" Feeder Kablo (Tek Sıra Klipsli 300x100 Tava)
 *
 * Çalıştırma: node generate_tava_300x100_kesit6_7_dxf.cjs
 * Çıktı:      DXF_Ciktilari/Milimetre/25_300x100_KABLO_TAVASI_KESIT_6_VE_7_mm.dxf
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { DxfBuilder } = require('./dxf_engine.cjs');

const DIR_MM = path.join(__dirname, 'DXF_Ciktilari', 'Milimetre');
const FILE_BASE = '25_300x100_KABLO_TAVASI_KESIT_6_VE_7';
const ACCORE = 'C:\\Program Files\\Autodesk\\AutoCAD 2023\\accoreconsole.exe';

// Orantılı Ölçülendirme Yardımcıları
function addDimH(dxf, x1, x2, yRef, yDim, label, textH = 15, tick = 5) {
  dxf.setLayer('OLCULER');
  const d = dxf.d;
  const sg = yDim >= yRef ? 1 : -1;
  d.drawLine(x1, yRef + sg * 4, x1, yDim + sg * 4);
  d.drawLine(x2, yRef + sg * 4, x2, yDim + sg * 4);
  d.drawLine(x1, yDim, x2, yDim);
  d.drawLine(x1 - tick, yDim - tick, x1 + tick, yDim + tick);
  d.drawLine(x2 - tick, yDim - tick, x2 + tick, yDim + tick);
  d.drawText((x1 + x2) / 2, yDim + (sg > 0 ? 5 : -textH - 5), textH, 0, label, 'center', 'baseline');
}

function addDimV(dxf, y1, y2, xRef, xDim, label, textH = 15, tick = 5) {
  dxf.setLayer('OLCULER');
  const d = dxf.d;
  const sg = xDim >= xRef ? 1 : -1;
  d.drawLine(xRef + sg * 4, y1, xDim + sg * 4, y1);
  d.drawLine(xRef + sg * 4, y2, xDim + sg * 4, y2);
  d.drawLine(xDim, y1, xDim, y2);
  d.drawLine(xDim - tick, y1 - tick, xDim + tick, y1 + tick);
  d.drawLine(xDim - tick, y2 - tick, xDim + tick, y2 + tick);
  d.drawText(xDim + (sg > 0 ? 6 : -6), (y1 + y2) / 2, textH, 90, label, 'center', 'baseline');
}

// 300x100 Tava Profili
function drawTrayProfile(dxf, cx, cy, width = 300, trayH = 100, hasSeparator = false, sepOffsetFromCenter = 0, sepLabel = 'SEPERATOR') {
  const W = width;
  const H = trayH;
  const t = 2;
  const lipW = 15;
  const lipH = 8;

  dxf.setLayer('TAVA_PROFILI');

  const xL = cx - W / 2;
  const xR = cx + W / 2;
  const yBot = cy;
  const yTop = cy + H;

  // Dış profil hatları
  // Taban sacı
  dxf.addLine(xL, yBot, xR, yBot);
  dxf.addLine(xL - t, yBot - t, xR + t, yBot - t);

  // Sol dikey yanak
  dxf.addLine(xL, yBot, xL, yTop);
  dxf.addLine(xL - t, yBot - t, xL - t, yTop);

  // Sağ dikey yanak
  dxf.addLine(xR, yBot, xR, yTop);
  dxf.addLine(xR + t, yBot - t, xR + t, yTop);

  // Sol üst emniyet dudağı
  dxf.addLine(xL, yTop, xL - lipW, yTop);
  dxf.addLine(xL - lipW, yTop, xL - lipW, yTop - lipH);
  dxf.addLine(xL - lipW, yTop - lipH, xL - t, yTop - lipH);

  // Sağ üst emniyet dudağı
  dxf.addLine(xR, yTop, xR + lipW, yTop);
  dxf.addLine(xR + lipW, yTop, xR + lipW, yTop - lipH);
  dxf.addLine(xR + lipW, yTop - lipH, xR + t, yTop - lipH);

  // Taban drenaj ve havalandırma perfore slotları
  dxf.setLayer('TAVA_DETAY_DELIK');
  const numSlots = 5;
  const slotW = 30;
  const slotSpacing = (W - 60) / (numSlots - 1);
  for (let i = 0; i < numSlots; i++) {
    const sx = (xL + 30) + i * slotSpacing;
    dxf.addLine(sx - slotW / 2, yBot - t * 0.5, sx + slotW / 2, yBot - t * 0.5);
  }

  // İzolasyon Seperatörü
  if (hasSeparator) {
    dxf.setLayer('TAVA_SEPERATOR');
    const sepX = cx + sepOffsetFromCenter;
    const sepH = trayH - 20;
    dxf.addRect(sepX - 1, yBot, 2, sepH);
    dxf.addLine(sepX - 15, yBot, sepX + 15, yBot);
    dxf.addCircle(sepX, yBot + 10, 3);
    dxf.addText(sepX, yBot + sepH + 8, 13, sepLabel, 'TAVA_SEPERATOR', 0, 'center', 'bottom');
  }

  // Alt Destek C-Profil Konsolu ve M10 Tijler
  dxf.setLayer('TAVA_ASKI_KONSOL');
  const consoleW = width + 80; // 380 mm
  const consoleH = 35;
  const consoleY = yBot - t - consoleH;
  dxf.addRect(cx - consoleW / 2, consoleY, consoleW, consoleH);
  dxf.addRect(cx - consoleW / 2 + 10, consoleY + 8, consoleW - 20, 14);

  // Sol M10 Tij
  const rodXL = cx - (width / 2 + 20); // cx - 170
  dxf.addLine(rodXL, consoleY - 20, rodXL, yTop + 60);
  dxf.addLine(rodXL + 8, consoleY - 20, rodXL + 8, yTop + 60);
  dxf.addRect(rodXL - 4, consoleY - 14, 16, 10);
  dxf.addRect(rodXL - 6, consoleY - 4, 20, 4);

  // Sağ M10 Tij
  const rodXR = cx + (width / 2 + 12); // cx + 162
  dxf.addLine(rodXR, consoleY - 20, rodXR, yTop + 60);
  dxf.addLine(rodXR + 8, consoleY - 20, rodXR + 8, yTop + 60);
  dxf.addRect(rodXR - 4, consoleY - 14, 16, 10);
  dxf.addRect(rodXR - 6, consoleY - 4, 20, 4);

  // Ölçülendirme (Tijlerle çakışmayacak temiz ofsetler)
  addDimH(dxf, xL, xR, yTop, yTop + 25, `${width} mm (IC GENISLIK)`, 15, 5);
  addDimV(dxf, yBot, yTop, xL - lipW, xL - lipW - 48, `${trayH} mm`, 15, 5);
}

// Feeder Kablo Kesiti
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

// Power Kablo Kesiti (2x25 mm2 DC)
function drawPowerCableCrossSection(dxf, x, y, r, label = '') {
  dxf.setLayer('KBL_ENERJI_DC');

  dxf.addCircle(x, y, r);
  dxf.addCircle(x, y, r * 0.88);

  const cOff = r * 0.42;
  const cr = r * 0.38;

  dxf.addCircle(x - cOff, y, cr);
  dxf.addCircle(x - cOff, y, cr * 0.8);
  dxf.addCircle(x + cOff, y, cr);
  dxf.addCircle(x + cOff, y, cr * 0.8);

  if (label) {
    dxf.setLayer('METIN_BILGI');
    dxf.addText(x, y + r + 4, 10, label, 'METIN_BILGI', 0, 'center', 'bottom');
  }
}

// Fiber Kablo Kesiti
function drawFiberCableCrossSection(dxf, x, y, r, label = '') {
  dxf.setLayer('KBL_FIBER_OPTIK');

  dxf.addCircle(x, y, r);
  dxf.addCircle(x, y, r * 0.82);

  const fOff = r * 0.45;
  dxf.addCircle(x - fOff, y, r * 0.12);
  dxf.addCircle(x + fOff, y, r * 0.12);
  dxf.addCircle(x, y - fOff, r * 0.12);
  dxf.addCircle(x, y + fOff, r * 0.12);

  if (label) {
    dxf.setLayer('METIN_BILGI');
    dxf.addText(x, y + r + 4, 10, label, 'METIN_BILGI', 0, 'center', 'bottom');
  }
}

function generate() {
  const dxf = new DxfBuilder('mm');

  // Kablo Yarıçapları
  const r78 = 14;   // 7/8" Feeder (OD 28mm)
  const r12 = 8;    // 1/2" Feeder (OD 16mm)
  const rPwr = 10.5;// 2x25 mm2 DC Power (OD 21mm)
  const rFib = 6;   // Fiber Optic (OD 12mm)

  // =======================================================================
  // PAFTA ÇERÇEVESİ VE BAŞLIK ŞERİDİ
  // =======================================================================
  const frameX = -880, frameY = -340, frameW = 1760, frameH = 1250;
  dxf.setLayer('METIN_BILGI');
  dxf.addRect(frameX, frameY, frameW, frameH, 'METIN_BILGI');
  dxf.addRect(frameX + 10, frameY + 10, frameW - 20, frameH - 20, 'METIN_BILGI');

  // Üst Başlık Bannerı
  dxf.addRect(frameX + 25, frameY + frameH - 95, frameW - 50, 75, 'METIN_BILGI');
  dxf.addText(0, frameY + frameH - 45, 26, '300 x 100 MM KABLO TAVASI LOKASYON BAZLI KABLO DOLULUK KESITLERI', 'METIN_BILGI', 0, 'center', 'middle');
  dxf.addText(0, frameY + frameH - 74, 15, 'KESIT 6: ALAN 2 (SCOREBOARD) & KESIT 7: ALAN 4 (KOSE TRIBUN) - 300x100 MM TAVA UYGULAMASI', 'METIN_BILGI', 0, 'center', 'middle');

  // Kolon Merkezleri
  const col1X = -420; // Kesit 6 (Sol)
  const col2X = 420;  // Kesit 7 (Sağ)
  const secY = 500;   // Kesit taban kotu

  // =======================================================================
  // KESİT 6: ALAN 2 (SCOREBOARD) — 300x100 MM TAVA
  // 13 ADET 2x25 mm2 DC ENERJİ + 3x FİBEROPTİK (SEPERATÖRLÜ)
  // =======================================================================
  drawTrayProfile(dxf, col1X, secY, 300, 100, true, 35, 'IZOLASYON SEPERATORU');

  // DC Enerji Kabloları (Sol Bölme: 13 adet, 2 katman: 7 altta + 6 üstte)
  const k6PwrStartX = col1X - 128;
  const k6PwrSpacingX = 24.5;
  const k6PwrSpacingY = 24;
  let k6PwrCount = 0;
  for (let t = 0; t < 2; t++) {
    for (let c = 0; c < 7; c++) {
      if (k6PwrCount >= 13) break;
      const px = k6PwrStartX + c * k6PwrSpacingX;
      const py = secY + rPwr + t * k6PwrSpacingY;
      drawPowerCableCrossSection(dxf, px, py, rPwr);
      k6PwrCount++;
    }
  }

  // Fiberoptik Kablolar (Sağ Bölme: 3 adet, tek sıra)
  const k6FibStartX = col1X + 65;
  const k6FibSpacingX = 28;
  for (let f = 0; f < 3; f++) {
    const fx = k6FibStartX + f * k6FibSpacingX;
    const fy = secY + rFib;
    drawFiberCableCrossSection(dxf, fx, fy, rFib);
  }

  dxf.setLayer('METIN_BILGI');
  dxf.addText(col1X - 55, secY + 76, 14, '13 ADET 2x25 mm2', 'METIN_BILGI', 0, 'center');
  dxf.addText(col1X - 55, secY + 58, 14, 'DC ENERJI', 'METIN_BILGI', 0, 'center');
  dxf.addText(col1X + 95, secY + 30, 14, '3x FIBER', 'METIN_BILGI', 0, 'center');

  dxf.addText(col1X, secY - 80, 20, 'KESIT 6: ALAN 2 (SCOREBOARD) - DC ENERJI VE FIBER HATTI', 'METIN_BILGI', 0, 'center');
  dxf.addText(col1X, secY - 106, 15, '13x 2x25 mm2 DC Enerji + 3x Fiberoptik (300x100 mm Tava - Doluluk: %16.2)', 'METIN_BILGI', 0, 'center');

  // =======================================================================
  // KESİT 7: ALAN 4 (KÖŞE TRİBÜN) — 300x100 MM TAVA
  // 8 ADET 7/8" FEEDER KABLO (TEK SIRA YAN YANA KLİPSLİ)
  // =======================================================================
  drawTrayProfile(dxf, col2X, secY, 300, 100, false);

  const k7Cols = 8;
  const k7StartX = col2X - 115.5;
  const k7SpacingX = 33;

  for (let c = 0; c < k7Cols; c++) {
    const cx = k7StartX + c * k7SpacingX;
    const cy = secY + r78;
    drawFeederCrossSection(dxf, cx, cy, r78, '7/8');
    dxf.setLayer('KBL_ETIKET_BAG');
    dxf.addLine(cx - 10, cy + r78 + 3, cx + 10, cy + r78 + 3);
  }

  dxf.setLayer('METIN_BILGI');
  dxf.addText(col2X, secY + 66, 15, '8 ADET 7/8" FEEDER KABLO', 'METIN_BILGI', 0, 'center');
  dxf.addText(col2X, secY + 48, 13, '(TEK SIRA KLIPSLI DIZILIM)', 'METIN_BILGI', 0, 'center');

  dxf.addText(col2X, secY - 80, 20, 'KESIT 7: ALAN 4 (KOSE TRIBUN) - CATI BESLEME HATTI', 'METIN_BILGI', 0, 'center');
  dxf.addText(col2X, secY - 106, 15, '8 Adet 7/8" Feeder Kablo Kesiti (300x100 mm Tava - Doluluk: %16.4)', 'METIN_BILGI', 0, 'center');

  // =======================================================================
  // KABLO DOLULUK VE KAPASİTE TABLOSU
  // =======================================================================
  const tblX = -810;
  const tblY = 180;
  const tblW = 1620;

  dxf.setLayer('METIN_BILGI');
  dxf.addRect(tblX, tblY, tblW, 115, 'METIN_BILGI');
  dxf.addText(0, tblY + 92, 18, 'KABLO DOLULUK ORANLARI VE REZERV KAPASITE TABLOSU (300 x 100 MM TAVA UYGULAMASI)', 'METIN_BILGI', 0, 'center');

  const cols = [
    { title: 'KESIT NO', x: tblX },
    { title: 'LOKASYON / BOLGE', x: tblX + 150 },
    { title: 'KABLO TIPI VE ADEDI', x: tblX + 440 },
    { title: 'KABLO ALANI', x: tblX + 920 },
    { title: 'DOLULUK ORANI', x: tblX + 1120 },
    { title: 'DURUM VE STANDART UYGUNLUGU', x: tblX + 1330 }
  ];

  cols.forEach((col, idx) => {
    if (idx > 0) dxf.addLine(col.x, tblY, col.x, tblY + 80, 'METIN_BILGI');
    dxf.addText(col.x + 8, tblY + 58, 13, col.title, 'METIN_BILGI');
  });
  dxf.addLine(tblX, tblY + 50, tblX + tblW, tblY + 50, 'METIN_BILGI');

  const rowData = [
    { no: 'KESIT 6', loc: 'Alan 2 (Scoreboard)', cables: '13x 2x25 mm2 DC Enerji + 3x Fiberoptik', area: '4,845 mm2', fill: '%16.2 (Limit: %50)', status: 'UYGUN (Seperatorlu Ayrim, %83.8 Rezerv)' },
    { no: 'KESIT 7', loc: 'Alan 4 (Kose Tribun)', cables: '8 Adet 7/8" Feeder Kablo', area: '4,926 mm2', fill: '%16.4 (Limit: %50)', status: 'UYGUN (Tek Sira Klipsli, %83.6 Rezerv)' }
  ];

  const rowH = 24;
  rowData.forEach((row, rIdx) => {
    const ry = tblY + 26 - rIdx * rowH;
    dxf.addLine(tblX, ry, tblX + tblW, ry, 'METIN_BILGI');
    dxf.addText(cols[0].x + 8, ry + 6, 12, row.no, 'METIN_BILGI');
    dxf.addText(cols[1].x + 8, ry + 6, 12, row.loc, 'METIN_BILGI');
    dxf.addText(cols[2].x + 8, ry + 6, 12, row.cables, 'METIN_BILGI');
    dxf.addText(cols[3].x + 8, ry + 6, 12, row.area, 'METIN_BILGI');
    dxf.addText(cols[4].x + 8, ry + 6, 12, row.fill, 'METIN_BILGI');
    dxf.addText(cols[5].x + 8, ry + 6, 12, row.status, 'METIN_BILGI');
  });

  // =======================================================================
  // KABLO TİPLERİ, ÇAPLARI VE LEJANT BİLGİ KUTUSU (Sol Alt)
  // =======================================================================
  const detX = -460;
  const detY = -120;
  dxf.setLayer('METIN_BILGI');
  dxf.addRect(detX - 320, detY - 90, 640, 195, 'METIN_BILGI');
  dxf.addText(detX, detY + 75, 17, 'KABLO TIPLERI, CAPLARI VE LEJANT BILGILERI', 'METIN_BILGI', 0, 'center');

  // 4 Kablo (Daha geniş aralık ve iki satırlı etiketler)
  const legCols = [
    { x: detX - 220, fn: () => drawFeederCrossSection(dxf, detX - 220, detY + 15, r78, '7/8'), t1: '7/8" Feeder', t2: '(OD 28mm)' },
    { x: detX - 75,  fn: () => drawPowerCableCrossSection(dxf, detX - 75, detY + 15, rPwr),     t1: '2x25 mm2 DC', t2: '(OD 21mm)' },
    { x: detX + 75,  fn: () => drawFiberCableCrossSection(dxf, detX + 75, detY + 15, rFib),    t1: 'Fiberoptik',  t2: '(OD 12mm)' },
    { x: detX + 220, fn: () => drawFeederCrossSection(dxf, detX + 220, detY + 15, r12, '1/2'), t1: '1/2" Feeder', t2: '(OD 16mm)' }
  ];

  legCols.forEach(c => {
    c.fn();
    dxf.setLayer('METIN_BILGI');
    dxf.addText(c.x, detY - 22, 12, c.t1, 'METIN_BILGI', 0, 'center');
    dxf.addText(c.x, detY - 38, 11, c.t2, 'METIN_BILGI', 0, 'center');
  });

  dxf.addText(detX, detY - 68, 11, 'Not: 300x100 mm tavada net alan 30,000 mm2 olup azami doluluk limiti %50\'dir.', 'METIN_BILGI', 0, 'center');

  // =======================================================================
  // ANTET / TITLE BLOCK (Sağ Alt)
  // =======================================================================
  const antetX = 40;
  const antetY = -210;
  const boxW = 760;
  const boxH = 200;

  dxf.addRect(antetX, antetY, boxW, boxH, 'METIN_BILGI');
  dxf.addLine(antetX, antetY + 130, antetX + boxW, antetY + 130, 'METIN_BILGI');
  dxf.addLine(antetX, antetY + 65, antetX + boxW, antetY + 65, 'METIN_BILGI');
  dxf.addLine(antetX + 490, antetY, antetX + 490, antetY + 130, 'METIN_BILGI');

  dxf.addText(antetX + 20, antetY + 155, 22, 'GALATASARAY STADYUMU GSM ALTYAPI PROJESI', 'METIN_BILGI');
  dxf.addText(antetX + 20, antetY + 98, 15, 'PAFTA: 300x100 MM KABLO TAVASI KESITLERI', 'METIN_BILGI');
  dxf.addText(antetX + 20, antetY + 77, 13, 'KESIT 6 (SCOREBOARD) & KESIT 7 (KOSE TRIBUN)', 'METIN_BILGI');
  dxf.addText(antetX + 20, antetY + 25, 15, 'OLCEK: 1:1 mm (CAD Model Alani)', 'METIN_BILGI');
  dxf.addText(antetX + 510, antetY + 90, 14, 'CIZIM: ANTIGRAVITY CAD/BIM', 'METIN_BILGI');
  dxf.addText(antetX + 510, antetY + 25, 14, `TARIH: ${new Date().toISOString().slice(0, 10)}`, 'METIN_BILGI');

  // Kuzey Oku (Antetin solunda)
  const naX = antetX - 70;
  const naY = antetY + 100;
  const r = 48;
  dxf.addCircle(naX, naY, r, 'METIN_BILGI');
  dxf.addLine(naX, naY - r * 0.9, naX, naY + r * 0.9, 'METIN_BILGI');
  dxf.addLine(naX, naY + r * 0.9, naX - 16, naY + 20, 'METIN_BILGI');
  dxf.addLine(naX, naY + r * 0.9, naX + 16, naY + 20, 'METIN_BILGI');
  dxf.addText(naX, naY + r + 15, 20, 'K', 'METIN_BILGI', 0, 'center', 'middle');

  return dxf.toDxfString();
}

if (!fs.existsSync(DIR_MM)) fs.mkdirSync(DIR_MM, { recursive: true });
const outDxf = path.join(DIR_MM, `${FILE_BASE}_mm.dxf`);
const str = generate();

if (/NaN/.test(str)) {
  console.error('HATA: DXF icinde NaN tespit edildi!');
  process.exit(1);
}

fs.writeFileSync(outDxf, str, 'utf8');
console.log('DXF basariyla yazildi:', outDxf, `(${(str.length / 1024).toFixed(1)} KB)`);

// AutoCAD accoreconsole ile DWG ve PDF önizleme üretimi
if (fs.existsSync(ACCORE)) {
  const outDwg = path.join(DIR_MM, `${FILE_BASE}_mm.dwg`);
  const outPdf = path.join(DIR_MM, `${FILE_BASE}_onizleme.pdf`);
  const scrPath = path.join(DIR_MM, `${FILE_BASE}_convert.scr`);

  if (fs.existsSync(outDwg)) fs.unlinkSync(outDwg);
  if (fs.existsSync(outPdf)) fs.unlinkSync(outPdf);

  const scrContent = [
    '_.FILEDIA', '0',
    '_.CMDECHO', '0',
    '_.ZOOM', '_E',
    '_.SAVEAS', '2018', `"${outDwg}"`,
    '-PLOT', 'Y', 'Model', 'DWG To PDF.pc3', 'ISO full bleed A1 (841.00 x 594.00 MM)',
    'M', 'L', 'N', 'E', 'F', 'C', 'Y', 'monochrome.ctb', 'Y', 'A', `"${outPdf}"`, 'N', 'Y',
    '_.QUIT'
  ].join('\r\n') + '\r\n';

  fs.writeFileSync(scrPath, scrContent, 'latin1');

  try {
    console.log('AutoCAD accoreconsole DWG ve PDF olusturuyor...');
    execFileSync(ACCORE, ['/i', outDxf, '/s', scrPath, '/l', 'en-US'], {
      stdio: 'ignore',
      timeout: 30000,
      cwd: DIR_MM
    });
  } catch (err) {
    // accoreconsole exit handling
  }

  if (fs.existsSync(scrPath)) fs.unlinkSync(scrPath);

  if (fs.existsSync(outDwg)) {
    console.log('DWG basariyla olusturuldu:', outDwg);
  }
  if (fs.existsSync(outPdf)) {
    console.log('PDF onizleme basariyla olusturuldu:', outPdf);
  }
}
