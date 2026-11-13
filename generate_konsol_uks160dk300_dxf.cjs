/**
 * generate_konsol_uks160dk300_dxf.cjs
 *
 * PAFTA 15: UKS-160 DK 300.20 DUVAR KONSOLU (tava montaj aparatı) + 200x40 kapaklı tava montaj görünüşü
 *
 * Kullanıcı isteği: tava montaj konsolu, katalog tablosundan "L 300 uzunluk olan".
 *
 * KATALOG (kullanıcının gönderdiği tablo): h = 160 mm, s = 2.0 mm, L = 300 mm, 0.775 kg/ad, F = 1.7 kN
 * (F/2 + F/2 yük, L/2 aralıkla).
 * Katalogda OLMAYAN ölçüler (kol yüksekliği, genişlikler, kanal ve delik ölçüleri) ürün görselindeki
 * oranlardan alınmıştır, aşağıdaki P bloğunda "VARSAYIM" olarak işaretli. Sac alanından hesaplanan
 * ağırlık katalog ağırlığıyla karşılaştırılıp ekrana yazılır.
 *
 * Görünüşler (1 birim = 1 mm, ölçek 1:1):
 *   A) Yan görünüş       B) Üst görünüş       C) Ön görünüş (uçtan duvara bakış)
 *   D) Kesit A-A (kol ortası)   E) Montaj: konsol + 200x40 kapaklı tava kesiti
 *
 * Çalıştırma: node generate_konsol_uks160dk300_dxf.cjs
 * Çıktı:      DXF_Ciktilari/Milimetre/15_KONSOL_UKS_160_DK_300_20_mm.dxf
 */

const fs = require('fs');
const path = require('path');
const { DxfBuilder } = require('./dxf_engine.cjs');

const P = {
  // KATALOG
  h: 160, s: 2.0, L: 300, kg: 0.775, F: 1.7,
  // VARSAYIM (görsel oranları)
  plateW: 60,              // duvar plakası genişliği
  armW: 45,                // kol üst yüz genişliği (ters U dış)
  armRootH: 75,            // kol yüksekliği, duvar dibinde
  armTipH: 12,             // kol yüksekliği, uçta
  armTopY: 125,            // kol üst yüzü, plaka alt kenarından
  armSlotL: 35, armSlotW: 9, armSlotX: [70, 155, 240],  // kol üstü kanallar (duvardan merkez)
  holeL: 18, holeW: 9, holeX: 16, holeY: [20, 140],     // plaka delikleri (düşey oval, merkezler)
  // Tava (Pafta 14 ile aynı)
  trayW: 200, trayH: 40, trayT: 1.0, lip: 8, coverW: 203, coverT: 1.0, skirt: 10, gap: 0.5,
  trayX0: 20,              // tavanın plakaya uzaklığı (montaj görünüşü)
};

const FILE_BASE = '15_KONSOL_UKS_160_DK_300_20';
const DIR_MM = path.join(__dirname, 'DXF_Ciktilari', 'Milimetre');

// Kol yüksekliği x konumunda (x: duvar yüzünden, plaka dış yüzü x = 0)
const armH = (x) => P.armRootH + (P.armTipH - P.armRootH) * ((x - P.s) / (P.L - P.s));

function generate() {
  const dxf = new DxfBuilder('mm');
  const d = dxf.d;
  dxf.addLayer('KONSOL', 30, 'CONTINUOUS');   // turuncu
  dxf.addLayer('TAVA', 6, 'CONTINUOUS');
  dxf.addLayer('KAPAK', 4, 'CONTINUOUS');
  dxf.addLayer('DELIK', 3, 'CONTINUOUS');
  dxf.addLayer('GIZLI', 8, 'DASHED');
  dxf.addLayer('EKSEN', 1, 'DASHED');
  dxf.addLayer('TARAMA', 8, 'CONTINUOUS');
  dxf.addLayer('DUVAR', 9, 'CONTINUOUS');
  dxf.addLayer('OLCU', 2, 'CONTINUOUS');
  dxf.addLayer('METIN', 7, 'CONTINUOUS');

  const L = (x1, y1, x2, y2, layer) => dxf.addLine(x1, y1, x2, y2, layer);
  const R = (x, y, w, h, layer) => dxf.addRect(x, y, w, h, layer);
  const T = (x, y, h, s, align = 'left', rot = 0) => dxf.addText(x, y, h, s, 'METIN', rot, align, 'baseline');
  const PL = (pts, layer) => { dxf.setLayer(layer); d.drawPolyline(pts, true); };
  const slot = (cx, cy, len, w, vertical = false, layer = 'DELIK') => {
    dxf.setLayer(layer);
    const r = w / 2, a = (len - w) / 2;
    if (!vertical) {
      d.drawLine(cx - a, cy - r, cx + a, cy - r); d.drawLine(cx - a, cy + r, cx + a, cy + r);
      d.drawArc(cx + a, cy, r, -90, 90); d.drawArc(cx - a, cy, r, 90, 270);
    } else {
      d.drawLine(cx - r, cy - a, cx - r, cy + a); d.drawLine(cx + r, cy - a, cx + r, cy + a);
      d.drawArc(cx, cy + a, r, 0, 180); d.drawArc(cx, cy - a, r, 180, 360);
    }
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
  // 45° tarama (dikdörtgen içinde)
  const hatchRect = (x0, y0, w, h, step = 4) => {
    dxf.setLayer('TARAMA');
    for (let k = -h; k < w; k += step) {
      let ax = x0 + k, ay = y0, bx = x0 + k + h, by = y0 + h;
      if (ax < x0) { ay += x0 - ax; ax = x0; }
      if (bx > x0 + w) { by -= bx - (x0 + w); bx = x0 + w; }
      if (bx > ax) d.drawLine(ax, ay, bx, by);
    }
  };

  const { h, s, Lk = P.L, plateW, armW, armTopY } = P;
  const armBot = (x) => armTopY - armH(x);

  // Konsol yan görünüşü (ortak çizim; A ve E'de kullanılır), orijin = plaka dış yüzü / plaka alt kenarı
  const drawSide = (ox, oy, withWall) => {
    if (withWall) {
      dxf.setLayer('DUVAR');
      d.drawLine(ox, oy - 20, ox, oy + h + 20);
      for (let y = oy - 20; y < oy + h + 20; y += 10) d.drawLine(ox, y, ox - 10, y + 10);
    }
    R(ox, oy, s, h, 'KONSOL');                                       // plaka (kesit kalınlığı)
    PL([[ox + s, oy + armTopY], [ox + Lk, oy + armTopY], [ox + Lk, oy + armBot(Lk)], [ox + s, oy + armBot(s)]], 'KONSOL');
    L(ox + s, oy + armTopY - s, ox + Lk - s, oy + armTopY - s, 'GIZLI');  // üst levha iç yüzü
    P.holeY.forEach((y) => L(ox - 4, oy + y, ox + s + 4, oy + y, 'EKSEN'));
    P.armSlotX.forEach((x) => L(ox + x, oy + armTopY + 4, ox + x, oy + armTopY - 6, 'EKSEN'));
  };

  // =========================================================================
  // A) YAN GÖRÜNÜŞ
  // =========================================================================
  {
    const ox = 0, oy = 0;
    drawSide(ox, oy, true);
    dimH(ox, ox + Lk, oy + armTopY, oy + armTopY + 30, `L = ${Lk}`);
    dimV(oy, oy + h, ox, ox - 25, `h = ${h}`);
    dimV(oy + armBot(s), oy + armTopY, ox + s, ox + 30, `${P.armRootH}`);
    dimV(oy + armBot(Lk), oy + armTopY, ox + Lk, ox + Lk + 15, `${P.armTipH}`);
    dimV(oy, oy + armTopY, ox + Lk, ox + Lk + 32, `${armTopY}`);
    P.armSlotX.forEach((x, i) => { if (i === 0) dimH(ox, ox + x, oy + armTopY, oy + armTopY + 15, `${x}`); else dimH(ox + P.armSlotX[i - 1], ox + x, oy + armTopY, oy + armTopY + 15, `${x - P.armSlotX[i - 1]}`); });
    T(ox, oy + h + 45, 10, 'A) YAN GORUNUS');
  }

  // =========================================================================
  // B) ÜST GÖRÜNÜŞ   (yatay = koldan uca, düşey = genişlik)
  // =========================================================================
  {
    const ox = 0, oy = -150;                                         // eksen y = oy
    R(ox, oy - plateW / 2, s, plateW, 'KONSOL');
    R(ox + s, oy - armW / 2, Lk - s, armW, 'KONSOL');
    L(ox + s, oy - armW / 2 + s, ox + Lk - s, oy - armW / 2 + s, 'GIZLI');
    L(ox + s, oy + armW / 2 - s, ox + Lk - s, oy + armW / 2 - s, 'GIZLI');
    L(ox + Lk - s, oy - armW / 2 + s, ox + Lk - s, oy + armW / 2 - s, 'GIZLI');
    L(ox - 10, oy, ox + Lk + 10, oy, 'EKSEN');
    P.armSlotX.forEach((x) => slot(ox + x, oy, P.armSlotL, P.armSlotW));
    dimH(ox, ox + Lk, oy + plateW / 2, oy + plateW / 2 + 15, `${Lk}`);
    dimV(oy - armW / 2, oy + armW / 2, ox + Lk, ox + Lk + 15, `${armW}`);
    dimV(oy - plateW / 2, oy + plateW / 2, ox, ox - 15, `${plateW}`);
    dimH(ox + P.armSlotX[0] - P.armSlotL / 2, ox + P.armSlotX[0] + P.armSlotL / 2, oy - armW / 2, oy - armW / 2 - 12, `${P.armSlotL}x${P.armSlotW}`);
    T(ox, oy + plateW / 2 + 35, 10, 'B) UST GORUNUS');
  }

  // =========================================================================
  // C) ÖN GÖRÜNÜŞ (uçtan duvara bakış)   x: 420 bölgesi, y alt = 0
  // =========================================================================
  {
    const cx = 450, oy = 0;
    R(cx - plateW / 2, oy, plateW, h, 'KONSOL');
    P.holeY.forEach((y) => [-1, 1].forEach((sg) => slot(cx + sg * P.holeX, oy + y, P.holeL, P.holeW, true)));
    // Kol: dipteki siluet (plaka önünde görünür) + uçtaki ters U
    R(cx - armW / 2, oy + armBot(s), armW, P.armRootH, 'KONSOL');
    PL([[cx - armW / 2, oy + armBot(Lk)], [cx - armW / 2 + s, oy + armBot(Lk)], [cx - armW / 2 + s, oy + armTopY - s],
        [cx + armW / 2 - s, oy + armTopY - s], [cx + armW / 2 - s, oy + armBot(Lk)], [cx + armW / 2, oy + armBot(Lk)],
        [cx + armW / 2, oy + armTopY], [cx - armW / 2, oy + armTopY]], 'KONSOL');
    L(cx, oy - 10, cx, oy + h + 10, 'EKSEN');
    dimH(cx - plateW / 2, cx + plateW / 2, oy, oy - 15, `${plateW}`);
    dimH(cx - P.holeX, cx + P.holeX, oy + h, oy + h + 12, `${2 * P.holeX}`);
    dimV(oy, oy + h, cx + plateW / 2, cx + plateW / 2 + 15, `${h}`);
    dimV(oy + P.holeY[0], oy + P.holeY[1], cx - plateW / 2, cx - plateW / 2 - 15, `${P.holeY[1] - P.holeY[0]}`);
    T(cx - 40, oy + h + 45, 10, 'C) ON GORUNUS');
    T(cx - 40, oy + h + 32, 6, `Plaka delikleri 4 x ${P.holeL}x${P.holeW} oval`);
  }

  // =========================================================================
  // D) KESİT A-A (kol ortası, x = L/2)   ölçek 2:1
  // =========================================================================
  {
    const sc = 2, cx = 450, oy = -200, xa = Lk / 2;
    const hh = armH(xa) * sc, w = armW * sc, t = s * sc;
    const pts = [[-w / 2, 0], [-w / 2 + t, 0], [-w / 2 + t, hh - t], [w / 2 - t, hh - t], [w / 2 - t, 0], [w / 2, 0], [w / 2, hh], [-w / 2, hh]]
      .map(([x, y]) => [cx + x, oy + y]);
    PL(pts, 'KONSOL');
    hatchRect(cx - w / 2, oy, t, hh - t, 3); hatchRect(cx + w / 2 - t, oy, t, hh - t, 3); hatchRect(cx - w / 2, oy + hh - t, w, t, 3);
    L(cx, oy - 8, cx, oy + hh + 8, 'EKSEN');
    dimH(cx - w / 2, cx + w / 2, oy + hh, oy + hh + 12, `${armW}`);
    dimV(oy, oy + hh, cx - w / 2, cx - w / 2 - 12, `${armH(xa).toFixed(1)}`);
    dimV(oy + hh - t, oy + hh, cx + w / 2, cx + w / 2 + 12, `s=${s}`);
    T(cx - 45, oy + hh + 32, 10, 'D) KESIT A-A (2:1)');
    T(cx - 45, oy + hh + 22, 6, `Kol ortasi, x = ${xa} mm. Ters U profil.`);
    // Kesit hattı A-A yan görünüşte
    L(xa, armTopY + 10, xa, armBot(xa) - 10, 'EKSEN');
    T(xa + 2, armBot(xa) - 16, 7, 'A');
    T(xa + 2, armTopY + 6, 7, 'A');
  }

  // =========================================================================
  // E) MONTAJ: konsol + 200x40 kapaklı tava (tava enine kesit)
  // =========================================================================
  {
    const ox = 0, oy = -450;
    drawSide(ox, oy, true);
    const tx = ox + P.trayX0, ty = oy + armTopY;                     // tava tabanı = kol üst yüzü
    const { trayW: W, trayH: H, trayT: t, lip } = P;
    PL([[tx, ty], [tx + W, ty], [tx + W, ty + H], [tx + W - lip - t, ty + H], [tx + W - lip - t, ty + H - t],
        [tx + W - t, ty + H - t], [tx + W - t, ty + t], [tx + t, ty + t], [tx + t, ty + H - t], [tx + lip + t, ty + H - t],
        [tx + lip + t, ty + H], [tx, ty + H]], 'TAVA');
    const cx0 = tx - P.gap - P.coverT, cy = ty + H, ct = P.coverT;
    PL([[cx0, cy + ct - P.skirt], [cx0 + ct, cy + ct - P.skirt], [cx0 + ct, cy], [cx0 + P.coverW - ct, cy],
        [cx0 + P.coverW - ct, cy + ct - P.skirt], [cx0 + P.coverW, cy + ct - P.skirt], [cx0 + P.coverW, cy + ct], [cx0, cy + ct]], 'KAPAK');
    // Tava tabanı - kol kanalı cıvatası (M8, ilk iki kanalda)
    P.armSlotX.filter((x) => x > P.trayX0 + 15 && x < P.trayX0 + W - 15).forEach((x) => {
      R(ox + x - 4, ty - 8, 8, 8 + t + 6, 'GIZLI');
      L(ox + x, ty - 12, ox + x, ty + 14, 'EKSEN');
    });
    dimH(ox, tx, ty + H + 2, ty + H + 22, `${P.trayX0}`);
    dimH(tx, tx + W, ty + H + 2, ty + H + 22, `${W}`);
    dimV(ty, ty + H + ct, tx + P.coverW, tx + P.coverW + 15, `${H + ct}`);
    T(ox, oy + h + 40, 10, 'E) MONTAJ - UKS-160 DK 300.20 KONSOL + 200x40 KAPAKLI TAVA');
    T(ox, oy + h + 28, 6, `Tava tabani kol kanallarina M8 civata + rondela ile (gizli cizgi). Calisma yuku F = ${P.F} kN (F/2 + F/2, L/2 aralik).`);
  }

  // Genel not
  T(0, -560, 9, `PAFTA 15 : DUVAR KONSOLU UKS-160 DK 300.20  -  h ${P.h} / s ${P.s} / L ${P.L} mm, ${P.kg} kg/ad, F ${P.F} kN  -  1 birim = 1 mm`);
  T(0, -573, 6, 'Katalog olculeri: h, s, L, agirlik, calisma yuku. Kol yuksekligi (75/12), kol genisligi 45, plaka genisligi 60, kanal 35x9, plaka delikleri 18x9 urun gorselinden ORAN ile alinmistir; uretici cizimi ile dogrulanmalidir.');
  T(0, -584, 6, 'Katmanlar: KONSOL, TAVA, KAPAK, DELIK, GIZLI, EKSEN, TARAMA, DUVAR, OLCU, METIN.');

  return dxf.toDxfString();
}

// Ağırlık kontrolü (sac alanı x s x 7850 kg/m3, delikler düşülür)
function weightCheck() {
  const { s, h, L, plateW, armW, armRootH, armTipH } = P;
  const slotA = (l, w) => (l - w) * w + Math.PI * w * w / 4;
  const plateA = h * plateW - 4 * slotA(P.holeL, P.holeW);
  const top = (L - s) * armW - 3 * slotA(P.armSlotL, P.armSlotW);
  const sides = 2 * (armRootH + armTipH) / 2 * (L - s);
  const area = plateA + top + sides; // mm²
  return { area, kg: area * s * 7.85e-6 };
}

if (!fs.existsSync(DIR_MM)) fs.mkdirSync(DIR_MM, { recursive: true });
const out = path.join(DIR_MM, `${FILE_BASE}_mm.dxf`);
const str = generate();
if (/NaN/.test(str)) { console.error('HATA: DXF icinde NaN var'); process.exit(1); }
fs.writeFileSync(out, str, 'utf8');
const w = weightCheck();
console.log('Yazildi:', out, `(${(str.length / 1024).toFixed(0)} KB)`);
console.log(`Agirlik kontrolu: sac alani ${Math.round(w.area)} mm2 -> ${w.kg.toFixed(3)} kg (katalog ${P.kg} kg)`);
