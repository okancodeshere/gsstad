/**
 * generate_konsol_dik_L200_dxf.cjs
 *
 * PAFTA 18: UKS-160 DK TİPİ KONSOL — DİK KONUM, L = 200 mm — boyuna ve enine kesit
 *
 * Kullanıcı isteği: (UKS-160 DK görseli) "bunun kesitini çiz, dik duracak, uzunluğu 200 mm olsun".
 * Soru yanıtları: konsol dik dursun (taban plakası yerde, kol yukarı), L = 200; boyuna + enine kesit.
 *
 * Ölçüler:
 *   L = 200 (kullanıcı). h = 160, s = 2.0: UKS-160 DK serisi (katalog). Katalogda L 200 standart model
 *   UKS-120 DK 200.15'tir (h 120, s 1.5); kullanıcı "bunun" dediği için 160 serisi korunmuştur.
 *   Kol yüksekliği 75 / 12, kol genişliği 45, plaka genişliği 60, kanal 35x9, plaka delikleri 18x9:
 *   Pafta 15 ile aynı VARSAYIM (görsel oranı).
 *
 * Görünüşler (1 birim = 1 mm):
 *   A) Boyuna kesit A-A (kol orta düzleminden, 1:1)   B) Enine kesit B-B (kol ortası, 2:1)
 *   C) Taban plakası alt görünüşü (1:1)
 *
 * Çalıştırma: node generate_konsol_dik_L200_dxf.cjs
 * Çıktı:      DXF_Ciktilari/Milimetre/18_KONSOL_UKS160DK_DIK_L200_KESIT_mm.dxf
 */
const fs = require('fs');
const path = require('path');
const { DxfBuilder } = require('./dxf_engine.cjs');

const P = {
  L: 200, h: 160, s: 2.0,
  plateW: 60, armW: 45, armRootH: 75, armTipH: 12, armFaceX: 125,   // kol dış yüzü (web) plakanın 125 mm'sinde
  slotL: 35, slotW: 9, slotY: [55, 110, 165],                        // kol kanalları (zeminden merkez)
  holeL: 18, holeW: 9, holeX: 16, holePos: [20, 140],                // plaka delikleri
};
// Kol yüksekliği (web'den dışa) y konumunda; y = zeminden
const armH = (y) => P.armRootH + (P.armTipH - P.armRootH) * ((y - P.s) / (P.L - P.s));

const FILE_BASE = '18_KONSOL_UKS160DK_DIK_L200_KESIT';
const DIR_MM = path.join(__dirname, 'DXF_Ciktilari', 'Milimetre');

function generate() {
  const dxf = new DxfBuilder('mm');
  const d = dxf.d;
  dxf.addLayer('KONSOL', 30, 'CONTINUOUS');
  dxf.addLayer('TARAMA', 8, 'CONTINUOUS');
  dxf.addLayer('DELIK', 3, 'CONTINUOUS');
  dxf.addLayer('ZEMIN', 9, 'CONTINUOUS');
  dxf.addLayer('GIZLI', 8, 'DASHED');
  dxf.addLayer('EKSEN', 1, 'DASHED');
  dxf.addLayer('OLCU', 2, 'CONTINUOUS');
  dxf.addLayer('METIN', 7, 'CONTINUOUS');

  const L = (x1, y1, x2, y2, layer) => dxf.addLine(x1, y1, x2, y2, layer);
  const R = (x, y, w, h, layer) => dxf.addRect(x, y, w, h, layer);
  const T = (x, y, h, s, align = 'left', rot = 0) => dxf.addText(x, y, h, s, 'METIN', rot, align, 'baseline');
  const PL = (pts, layer) => { dxf.setLayer(layer); d.drawPolyline(pts, true); };
  const slotV = (cx, cy, len, w, layer = 'DELIK') => {   // düşey oval
    dxf.setLayer(layer); const r = w / 2, a = (len - w) / 2;
    d.drawLine(cx - r, cy - a, cx - r, cy + a); d.drawLine(cx + r, cy - a, cx + r, cy + a);
    d.drawArc(cx, cy + a, r, 0, 180); d.drawArc(cx, cy - a, r, 180, 360);
  };
  const TH = 6, TK = 2;
  const dimH = (x1, x2, yRef, yDim, label) => {
    dxf.setLayer('OLCU'); const sg = yDim > yRef ? 1 : -1;
    d.drawLine(x1, yRef + sg * 2, x1, yDim + sg * 2); d.drawLine(x2, yRef + sg * 2, x2, yDim + sg * 2);
    d.drawLine(x1, yDim, x2, yDim);
    d.drawLine(x1 - TK, yDim - TK, x1 + TK, yDim + TK); d.drawLine(x2 - TK, yDim - TK, x2 + TK, yDim + TK);
    d.drawText((x1 + x2) / 2, yDim + 1.5, TH, 0, label, 'center', 'baseline');
  };
  const dimV = (y1, y2, xRef, xDim, label) => {
    dxf.setLayer('OLCU'); const sg = xDim > xRef ? 1 : -1;
    d.drawLine(xRef + sg * 2, y1, xDim + sg * 2, y1); d.drawLine(xRef + sg * 2, y2, xDim + sg * 2, y2);
    d.drawLine(xDim, y1, xDim, y2);
    d.drawLine(xDim - TK, y1 - TK, xDim + TK, y1 + TK); d.drawLine(xDim - TK, y2 - TK, xDim + TK, y2 + TK);
    d.drawText(xDim - 1.5, (y1 + y2) / 2, TH, 90, label, 'center', 'baseline');
  };
  // 45° tarama, dikdörtgen içinde, kenarlı
  const hatchRect = (x0, y0, w, h, step = 3) => {
    R(x0, y0, w, h, 'KONSOL');
    dxf.setLayer('TARAMA');
    for (let k = -h; k < w; k += step) {
      let ax = x0 + k, ay = y0, bx = x0 + k + h, by = y0 + h;
      if (ax < x0) { ay += x0 - ax; ax = x0; }
      if (bx > x0 + w) { by -= bx - (x0 + w); bx = x0 + w; }
      if (bx > ax) d.drawLine(ax, ay, bx, by);
    }
  };

  const { L: Lk, h, s, plateW, armW, armFaceX: xf } = P;

  // =========================================================================
  // A) BOYUNA KESİT A-A (kol orta düzlemi; plaka yerde, kol yukarı)   orijin: plaka sol ucu / zemin
  // =========================================================================
  {
    // Zemin
    L(-40, 0, h + 40, 0, 'ZEMIN');
    for (let x = -40; x < h + 40; x += 8) L(x, 0, x - 6, -6, 'ZEMIN');
    // Taban plakası (kesit, taramalı)
    hatchRect(0, 0, h, s);
    // Dübel eksenleri (delikler kesit düzleminin ±16 mm yanında: eksen çizgisi)
    P.holePos.forEach((x) => L(x, -15, x, s + 15, 'EKSEN'));
    // Kol web'i (kesit, taramalı) — kanal boşlukları kesik
    const cuts = P.slotY.map((y) => [y - P.slotL / 2, y + P.slotL / 2]);
    let y0 = s;
    cuts.forEach(([a, b]) => { hatchRect(xf - s, y0, s, a - y0); y0 = b; });
    hatchRect(xf - s, y0, s, Lk - y0);
    // Kanal yerlerinde arkadaki yan duvar kenarı görünür
    cuts.forEach(([a, b]) => { L(xf - s, a, xf - s, b, 'KONSOL'); L(xf, a, xf, b, 'GIZLI'); });
    // Arkadaki yan duvar (görünüş): konik kenar + uç kenarı
    const xRoot = xf - P.armRootH, xTip = xf - P.armTipH;
    L(xRoot, s, xTip, Lk, 'KONSOL');
    L(xTip, Lk, xf - s, Lk, 'KONSOL');
    L(xRoot, s, xf - s, s, 'KONSOL');
    // Kesit B-B işareti
    const yb = Lk / 2;
    L(xf - armH(yb) - 15, yb, xf - armH(yb) - 3, yb, 'EKSEN'); L(xf + 3, yb, xf + 15, yb, 'EKSEN');
    T(xf - armH(yb) - 22, yb + 2, 7, 'B'); T(xf + 16, yb + 2, 7, 'B');

    dimV(0, Lk, h, h + 25, `L = ${Lk}`);
    dimH(0, h, 0, -22, `h = ${h}`);
    dimH(xRoot, xf, s, -10, `${P.armRootH}`);
    dimH(xTip, xf, Lk, Lk + 12, `${P.armTipH}`);
    dimH(xf, h, Lk, Lk + 12, `${h - xf}`);
    P.slotY.forEach((y, i) => dimV(i === 0 ? 0 : P.slotY[i - 1], y, xf, xf + 12, `${i === 0 ? y : y - P.slotY[i - 1]}`));
    dimV(P.slotY[0] - P.slotL / 2, P.slotY[0] + P.slotL / 2, xf - s, xf - s - 10, `${P.slotL}`);
    T(0, Lk + 45, 10, 'A) BOYUNA KESIT A-A  (DIK KONUM, 1:1)');
    T(0, Lk + 33, 6, `Plaka zemine ${2 * P.holePos.length} x M8 dubel ile. Kol web'i ve plaka kesitte taramali; arkadaki yan duvar gorunus.`);
  }

  // =========================================================================
  // B) ENİNE KESİT B-B (kol ortası, y = L/2) — üstten bakış, 2:1
  // =========================================================================
  {
    const sc = 2, ox = 340, oy = 80;             // web dış yüzü ox'ta, profil ekseni oy'de
    const hh = armH(Lk / 2);
    const w = armW * sc, t = s * sc, hs = hh * sc;
    // web (düşey şerit) + iki yan duvar (yatay şeritler, web'den sola)
    hatchRect(ox - t, oy - w / 2, t, w, 3);
    hatchRect(ox - hs, oy + w / 2 - t, hs - t, t, 3);
    hatchRect(ox - hs, oy - w / 2, hs - t, t, 3);
    L(ox + 10, oy, ox - hs - 10, oy, 'EKSEN');
    dimV(oy - w / 2, oy + w / 2, ox, ox + 14, `${armW}`);
    dimH(ox - hs, ox, oy + w / 2, oy + w / 2 + 12, `${hh.toFixed(1)}`);
    dimH(ox - t, ox, oy - w / 2, oy - w / 2 - 10, `s=${s}`);
    T(ox - hs, oy + w / 2 + 40, 10, 'B) ENINE KESIT B-B (2:1)');
    T(ox - hs, oy + w / 2 + 28, 6, `Kol ortasi, zeminden ${Lk / 2} mm. Ters U profil, s = ${s}.`);
  }

  // =========================================================================
  // C) TABAN PLAKASI ALT GÖRÜNÜŞÜ (1:1)
  // =========================================================================
  {
    const ox = 0, oy = -140;                   // plaka sol-alt köşesi; yatay = h, düşey = genişlik
    R(ox, oy, h, plateW, 'KONSOL');
    P.holePos.forEach((x) => [-1, 1].forEach((sg) => {
      // delikler h yönünde uzun (kataloğun düşey ovali, plaka yatayken h boyunca)
      dxf.setLayer('DELIK');
      const cx = ox + x, cy = oy + plateW / 2 + sg * P.holeX, r = P.holeW / 2, a = (P.holeL - P.holeW) / 2;
      d.drawLine(cx - a, cy - r, cx + a, cy - r); d.drawLine(cx - a, cy + r, cx + a, cy + r);
      d.drawArc(cx + a, cy, r, -90, 90); d.drawArc(cx - a, cy, r, 90, 270);
    }));
    // Kol izi (plakanın üstünde, alttan gizli)
    R(ox + xf - P.armRootH, oy + plateW / 2 - armW / 2, P.armRootH, armW, 'GIZLI');
    L(ox - 10, oy + plateW / 2, ox + h + 10, oy + plateW / 2, 'EKSEN');
    dimH(ox, ox + h, oy, oy - 14, `${h}`);
    dimV(oy, oy + plateW, ox, ox - 14, `${plateW}`);
    dimH(ox + P.holePos[0], ox + P.holePos[1], oy + plateW, oy + plateW + 10, `${P.holePos[1] - P.holePos[0]}`);
    dimV(oy + plateW / 2 - P.holeX, oy + plateW / 2 + P.holeX, ox + h, ox + h + 14, `${2 * P.holeX}`);
    T(ox, oy + plateW + 30, 10, 'C) TABAN PLAKASI ALT GORUNUS (1:1)');
    T(ox, oy + plateW + 20, 6, `4 x ${P.holeL}x${P.holeW} oval delik. Kol izi gizli cizgi.`);
  }

  T(0, -200, 9, `PAFTA 18 : UKS-160 DK TIPI KONSOL - DIK KONUM, L = ${Lk} mm - h ${h} / s ${s}  -  1 birim = 1 mm`);
  T(0, -212, 6, 'L kullanici; h ve s UKS-160 DK serisi (katalogda L 200 standardi UKS-120 DK 200.15: h 120, s 1.5). Kol 75/12, genislik 45, plaka 60, kanal 35x9, delik 18x9 GORSEL ORANINDAN VARSAYIM.');
  T(0, -222, 6, 'Katmanlar: KONSOL, TARAMA, DELIK, ZEMIN, GIZLI, EKSEN, OLCU, METIN.');
  return dxf.toDxfString();
}

if (!fs.existsSync(DIR_MM)) fs.mkdirSync(DIR_MM, { recursive: true });
const out = path.join(DIR_MM, `${FILE_BASE}_mm.dxf`);
const str = generate();
if (/NaN/.test(str)) { console.error('HATA: DXF icinde NaN var'); process.exit(1); }
fs.writeFileSync(out, str, 'utf8');
console.log('Yazildi:', out, `(${(str.length / 1024).toFixed(0)} KB)`);
