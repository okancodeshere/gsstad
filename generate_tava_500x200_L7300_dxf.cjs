/**
 * generate_tava_500x200_L7300_dxf.cjs
 *
 * PAFTA 22: 500 x 200 PERFORE KABLO TAVASI, L = 7300 (sade geometri, antetsiz, kapaksız)
 *
 * Kullanıcı isteği (2026-11-15): "boyu 730cm genişliği 50cm olan bir tava üst ve yan kesiti çiz";
 * kenar yüksekliği sorusuna yanıt: 200 mm.
 *
 * Görünüşler (1 birim = 1 mm):
 *   A) Üst görünüş (perfore taban, iç dönüş dudakları)
 *   B) Yan görünüş (yan duvar perforesi)
 *   C) Enine kesit (U profil)
 *
 * ÖNEMLİ: Perfore ölçüleri, sac kalınlığı ve dudak ölçüsü ÜRETİCİ VERİSİ DEĞİL, tipik değerlerdir
 * (Pafta 14 ile aynı delik düzeni). Tava tek parça 7300 olarak çizildi; ek yerleri gösterilmedi.
 *   node generate_tava_500x200_L7300_dxf.cjs
 *
 * Çıktı: DXF_Ciktilari/Milimetre/22_TAVA_500x200_L7300_mm.dxf
 */

const fs = require('fs');
const path = require('path');
const { DxfBuilder } = require('./dxf_engine.cjs');

const P = {
  L: 7300, W: 500, H: 200,
  t: 1.5,           // sac kalınlığı
  lip: 10,          // üst kenar iç dönüş dudağı
  baseSlotL: 30, baseSlotW: 7, baseSlotPitch: 50,
  baseSlotRows: [-200, -150, -100, -50, 0, 50, 100, 150, 200], // eksenden
  sideSlotL: 20, sideSlotW: 7, sideSlotPitch: 50, sideSlotRows: [60, 140], // tabandan
  jointHoleD: 7, jointHoleX: [15, 40],
};

const FILE_BASE = '22_TAVA_500x200_L7300';
const DIR_MM = path.join(__dirname, 'DXF_Ciktilari', 'Milimetre');

function generate() {
  const dxf = new DxfBuilder('mm');
  const d = dxf.d;
  dxf.addLayer('TAVA', 6, 'CONTINUOUS');
  dxf.addLayer('PERFORE', 3, 'CONTINUOUS');
  dxf.addLayer('GIZLI', 8, 'DASHED');
  dxf.addLayer('EKSEN', 1, 'DASHED');
  dxf.addLayer('OLCU', 2, 'CONTINUOUS');
  dxf.addLayer('METIN', 7, 'CONTINUOUS');

  const L = (x1, y1, x2, y2, layer) => dxf.addLine(x1, y1, x2, y2, layer);
  const R = (x, y, w, h, layer) => dxf.addRect(x, y, w, h, layer);
  const C = (x, y, r, layer) => dxf.addCircle(x, y, r, layer);
  const T = (x, y, h, s, align = 'left', rot = 0) => dxf.addText(x, y, h, s, 'METIN', rot, align, 'baseline');
  const PL = (pts, layer) => { dxf.setLayer(layer); d.drawPolyline(pts, true); };
  const slot = (cx, cy, len, w, layer = 'PERFORE') => {
    dxf.setLayer(layer);
    const r = w / 2, a = (len - w) / 2;
    d.drawLine(cx - a, cy - r, cx + a, cy - r);
    d.drawLine(cx - a, cy + r, cx + a, cy + r);
    d.drawArc(cx + a, cy, r, -90, 90);
    d.drawArc(cx - a, cy, r, 90, 270);
  };
  const TH = 20, TK = 7;
  const dimH = (x1, x2, yRef, yDim, label) => {
    dxf.setLayer('OLCU');
    const s = yDim > yRef ? 1 : -1;
    d.drawLine(x1, yRef + s * 5, x1, yDim + s * 5);
    d.drawLine(x2, yRef + s * 5, x2, yDim + s * 5);
    d.drawLine(x1, yDim, x2, yDim);
    d.drawLine(x1 - TK, yDim - TK, x1 + TK, yDim + TK);
    d.drawLine(x2 - TK, yDim - TK, x2 + TK, yDim + TK);
    d.drawText((x1 + x2) / 2, yDim + 6, TH, 0, label, 'center', 'baseline');
  };
  const dimV = (y1, y2, xRef, xDim, label) => {
    dxf.setLayer('OLCU');
    const s = xDim > xRef ? 1 : -1;
    d.drawLine(xRef + s * 5, y1, xDim + s * 5, y1);
    d.drawLine(xRef + s * 5, y2, xDim + s * 5, y2);
    d.drawLine(xDim, y1, xDim, y2);
    d.drawLine(xDim - TK, y1 - TK, xDim + TK, y1 + TK);
    d.drawLine(xDim - TK, y2 - TK, xDim + TK, y2 + TK);
    d.drawText(xDim - 6, (y1 + y2) / 2, TH, 90, label, 'center', 'baseline');
  };

  const { W, H, t, lip } = P;
  const Lt = P.L;
  const xsBase = (row) => { const out = []; const off = row % 2 ? P.baseSlotPitch / 2 : 0; for (let x = 75 + off; x <= Lt - 75; x += P.baseSlotPitch) out.push(x); return out; };
  const xsSide = (row) => { const out = []; const off = row % 2 ? P.sideSlotPitch / 2 : 0; for (let x = 75 + off; x <= Lt - 75; x += P.sideSlotPitch) out.push(x); return out; };

  // A) ÜST GÖRÜNÜŞ (y: 0 .. W)
  {
    const y0 = 0, yc = y0 + W / 2;
    R(0, y0, Lt, W, 'TAVA');
    L(0, y0 + lip + t, Lt, y0 + lip + t, 'TAVA');
    L(0, y0 + W - lip - t, Lt, y0 + W - lip - t, 'TAVA');
    L(0, y0 + t, Lt, y0 + t, 'GIZLI');
    L(0, y0 + W - t, Lt, y0 + W - t, 'GIZLI');
    L(-60, yc, Lt + 60, yc, 'EKSEN');
    P.baseSlotRows.forEach((dy, i) => xsBase(i).forEach((x) => slot(x, yc + dy, P.baseSlotL, P.baseSlotW)));
    [15, Lt - 15].forEach((x) => [-150, 0, 150].forEach((dy) => C(x, yc + dy, P.jointHoleD / 2, 'PERFORE')));
    dimH(0, Lt, y0 + W, y0 + W + 70, `${Lt}`);
    dimV(y0, y0 + W, 0, -70, `${W}`);
    dimV(y0, y0 + lip + t, Lt, Lt + 50, `${lip + t}`);
    T(0, y0 + W + 170, 35, `A) UST GORUNUS  (${W} x ${H} perfore kablo tavasi, L = ${Lt} mm)`);
    T(0, y0 + W + 125, 20, `Taban perforesi ${P.baseSlotL}x${P.baseSlotW} oval, adim ${P.baseSlotPitch}, ${P.baseSlotRows.length} sira (eksenden +-${Math.abs(P.baseSlotRows[0])}), sira kaydirmali. Uclarda ek delikleri O${P.jointHoleD}.`);
  }

  // B) YAN GÖRÜNÜŞ (taban y = -700)
  {
    const yb = -700, yTop = yb + H;
    R(0, yb, Lt, H, 'TAVA');
    L(0, yb + t, Lt, yb + t, 'GIZLI');           // taban sacı üst yüzü
    L(0, yTop - t, Lt, yTop - t, 'GIZLI');       // dudak alt yüzü
    P.sideSlotRows.forEach((dy, i) => xsSide(i).forEach((x) => slot(x, yb + dy, P.sideSlotL, P.sideSlotW)));
    P.jointHoleX.flatMap((e) => [e, Lt - e]).forEach((x) => P.sideSlotRows.forEach((dy) => C(x, yb + dy, P.jointHoleD / 2, 'PERFORE')));
    dimH(0, Lt, yb, yb - 70, `${Lt}`);
    dimV(yb, yTop, 0, -70, `${H}`);
    T(0, yTop + 105, 35, 'B) YAN GORUNUS');
    T(0, yTop + 60, 20, `Yan duvar perforesi ${P.sideSlotL}x${P.sideSlotW} oval, adim ${P.sideSlotPitch}, 2 sira (tabandan ${P.sideSlotRows.join(' / ')}). Ek delikleri O${P.jointHoleD}, uctan ${P.jointHoleX.join(' / ')} mm.`);
  }

  // C) ENİNE KESİT (sol tarafta)
  {
    const ox = -1100, oy = -700;
    PL([
      [ox, oy], [ox + W, oy], [ox + W, oy + H], [ox + W - lip - t, oy + H],
      [ox + W - lip - t, oy + H - t], [ox + W - t, oy + H - t], [ox + W - t, oy + t],
      [ox + t, oy + t], [ox + t, oy + H - t], [ox + lip + t, oy + H - t],
      [ox + lip + t, oy + H], [ox, oy + H],
    ], 'TAVA');
    L(ox + W / 2, oy - 40, ox + W / 2, oy + H + 40, 'EKSEN');
    dimH(ox, ox + W, oy, oy - 70, `${W}`);
    dimV(oy, oy + H, ox, ox - 70, `${H}`);
    T(ox - 80, oy + H + 105, 35, 'C) ENINE KESIT');
    T(ox - 80, oy + H + 60, 20, `Sac ${t} mm, dudak ${lip} mm ice donuk.`);
  }

  T(0, -900, 28, `PAFTA 22 : ${W} x ${H} PERFORE KABLO TAVASI, L = ${Lt}  -  1 birim = 1 mm`);
  T(0, -940, 20, 'NOT: Perfore, sac kalinligi ve dudak olculeri tipik degerdir; uretici katalogu ile dogrulanmalidir. Tava tek parca cizildi, ek yerleri gosterilmedi.');
  T(0, -975, 20, 'Katmanlar: TAVA, PERFORE, GIZLI, EKSEN, OLCU, METIN.');
  return dxf.toDxfString();
}

if (!fs.existsSync(DIR_MM)) fs.mkdirSync(DIR_MM, { recursive: true });
const out = path.join(DIR_MM, `${FILE_BASE}_mm.dxf`);
const str = generate();
if (/NaN/.test(str)) { console.error('HATA: DXF icinde NaN var'); process.exit(1); }
fs.writeFileSync(out, str, 'utf8');
console.log('Yazildi:', out, `(${(str.length / 1024).toFixed(0)} KB)`);
