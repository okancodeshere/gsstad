/**
 * generate_tava_200x40_kapakli_dxf.cjs
 *
 * PAFTA 14: 200 x 40 PERFORE KABLO TAVASI + KAPAK (sade geometri, antetsiz)
 *
 * Kullanıcı isteği:
 *   "bana 200mm genişlik, 40mm yükseklik olan bir tava autocadi çizeceğim" (üst + yan görünüş, yalnızca DXF)
 *   "tavaya kapak da ekle ve üst görünüm ver"
 *
 * Görünüşler (1 birim = 1 mm, ölçek 1:1):
 *   A) Üst görünüş - kapaksız (perfore taban, iç dönüş dudakları, ek delikleri)
 *   B) Üst görünüş - kapaklı (kapak görünür, tava duvarları gizli çizgi)
 *   C) Yan görünüş - kapaklı (yan duvar perforesi, kapak eteği)
 *   D) Enine kesit - kapaklı (tava U profili + kapak)
 *
 * ÖNEMLİ: Perfore ölçüleri, sac kalınlıkları, dudak ve etek ölçüleri ÜRETİCİ VERİSİ DEĞİL,
 * tipik değerlerdir. Katalog gelince aşağıdaki PARAMETRELER bloğunu güncelleyip betiği yeniden çalıştırın:
 *   node generate_tava_200x40_kapakli_dxf.cjs
 *
 * Çıktı: DXF_Ciktilari/Milimetre/14_TAVA_200x40_KAPAKLI_mm.dxf
 */

const fs = require('fs');
const path = require('path');
const { DxfBuilder } = require('./dxf_engine.cjs');

// ---------------------------------------------------------------------------
// PARAMETRELER (mm)
// ---------------------------------------------------------------------------
const P = {
  L: 2500,          // tava ve kapak boyu
  W: 200,           // tava dış genişlik
  H: 40,            // tava dış yükseklik
  t: 1.0,           // tava sac kalınlığı
  lip: 8,           // üst kenar iç dönüş dudağı
  // Taban perforesi: boyuna oval delik, 3 sıra, sıralar yarım adım kaydırmalı
  baseSlotL: 30, baseSlotW: 7, baseSlotPitch: 50, baseSlotRows: [-60, 0, 60],
  // Yan duvar perforesi: boyuna oval delik, duvar ortasında tek sıra
  sideSlotL: 20, sideSlotW: 7, sideSlotPitch: 50,
  // Ek (birleştirme) delikleri: her uçta yan duvarda 2 x Ø7, tabanda 2 x Ø7
  jointHoleD: 7, jointHoleX: [15, 40],
  // Kapak
  tc: 1.0,          // kapak sac kalınlığı
  gap: 0.5,         // kapak eteği ile tava duvarı arası boşluk (her yan)
  skirt: 10,        // kapak eteği yüksekliği
};
P.Wc = P.W + 2 * (P.gap + P.tc); // kapak dış genişliği (203)

const FILE_BASE = '14_TAVA_200x40_KAPAKLI';
const DIR_MM = path.join(__dirname, 'DXF_Ciktilari', 'Milimetre');

function generate() {
  const dxf = new DxfBuilder('mm');
  const d = dxf.d;
  dxf.addLayer('TAVA', 6, 'CONTINUOUS');      // magenta
  dxf.addLayer('KAPAK', 4, 'CONTINUOUS');     // cyan
  dxf.addLayer('PERFORE', 3, 'CONTINUOUS');   // yeşil
  dxf.addLayer('GIZLI', 8, 'DASHED');         // gri, kesik
  dxf.addLayer('EKSEN', 1, 'DASHED');         // kırmızı, kesik
  dxf.addLayer('OLCU', 2, 'CONTINUOUS');      // sarı
  dxf.addLayer('METIN', 7, 'CONTINUOUS');     // beyaz

  const L = (x1, y1, x2, y2, layer) => dxf.addLine(x1, y1, x2, y2, layer);
  const R = (x, y, w, h, layer) => dxf.addRect(x, y, w, h, layer);
  const C = (x, y, r, layer) => dxf.addCircle(x, y, r, layer);
  const T = (x, y, h, s, align = 'left', rot = 0) => dxf.addText(x, y, h, s, 'METIN', rot, align, 'baseline');
  const PL = (pts, layer) => { dxf.setLayer(layer); d.drawPolyline(pts, true); };

  // Oval delik (uzun ekseni X boyunca)
  const slot = (cx, cy, len, w, layer = 'PERFORE') => {
    dxf.setLayer(layer);
    const r = w / 2, a = (len - w) / 2;
    d.drawLine(cx - a, cy - r, cx + a, cy - r);
    d.drawLine(cx - a, cy + r, cx + a, cy + r);
    d.drawArc(cx + a, cy, r, -90, 90);
    d.drawArc(cx - a, cy, r, 90, 270);
  };

  // Sade ölçü çizgisi (yatay/düşey), metin yüksekliği 7 mm
  const TH = 7, TK = 2.5;
  const dimH = (x1, x2, yRef, yDim, label) => {
    dxf.setLayer('OLCU');
    const s = yDim > yRef ? 1 : -1;
    d.drawLine(x1, yRef + s * 2, x1, yDim + s * 2);
    d.drawLine(x2, yRef + s * 2, x2, yDim + s * 2);
    d.drawLine(x1, yDim, x2, yDim);
    d.drawLine(x1 - TK, yDim - TK, x1 + TK, yDim + TK);
    d.drawLine(x2 - TK, yDim - TK, x2 + TK, yDim + TK);
    d.drawText((x1 + x2) / 2, yDim + 2, TH, 0, label, 'center', 'baseline');
  };
  const dimV = (y1, y2, xRef, xDim, label) => {
    dxf.setLayer('OLCU');
    const s = xDim > xRef ? 1 : -1;
    d.drawLine(xRef + s * 2, y1, xDim + s * 2, y1);
    d.drawLine(xRef + s * 2, y2, xDim + s * 2, y2);
    d.drawLine(xDim, y1, xDim, y2);
    d.drawLine(xDim - TK, y1 - TK, xDim + TK, y1 + TK);
    d.drawLine(xDim - TK, y2 - TK, xDim + TK, y2 + TK);
    d.drawText(xDim - 2, (y1 + y2) / 2, TH, 90, label, 'center', 'baseline');
  };

  const { W, H, t, lip, Wc, tc, gap, skirt } = P;
  const Lt = P.L;

  // Taban perfore konumları (uçlarda ek delikleri için 60 mm boş)
  const basePositions = (row) => {
    const out = [];
    const off = row % 2 ? P.baseSlotPitch / 2 : 0;
    for (let x = 75 + off; x <= Lt - 75; x += P.baseSlotPitch) out.push(x);
    return out;
  };
  const sidePositions = () => {
    const out = [];
    for (let x = 75; x <= Lt - 75; x += P.sideSlotPitch) out.push(x);
    return out;
  };
  const jointXs = () => P.jointHoleX.flatMap((e) => [e, Lt - e]);

  // =========================================================================
  // A) ÜST GÖRÜNÜŞ - KAPAKSIZ   (y: 0 .. W, tava ekseni y = W/2)
  // =========================================================================
  {
    const y0 = 0, yc = y0 + W / 2;
    R(0, y0, Lt, W, 'TAVA');                         // dış hat (duvar üst kenarı dahil)
    L(0, y0 + lip + t, Lt, y0 + lip + t, 'TAVA');    // dudak iç kenarı (alt yan)
    L(0, y0 + W - lip - t, Lt, y0 + W - lip - t, 'TAVA');
    L(0, y0 + t, Lt, y0 + t, 'GIZLI');               // duvar iç yüzü (dudak altında)
    L(0, y0 + W - t, Lt, y0 + W - t, 'GIZLI');
    L(-20, yc, Lt + 20, yc, 'EKSEN');
    P.baseSlotRows.forEach((dy, i) => {
      basePositions(i).forEach((x) => slot(x, yc + dy, P.baseSlotL, P.baseSlotW));
    });
    // Taban ek delikleri (her uçta 2 adet, eksenden ±30)
    [15, Lt - 15].forEach((x) => [-30, 30].forEach((dy) => C(x, yc + dy, P.jointHoleD / 2, 'PERFORE')));

    dimH(0, Lt, y0 + W, y0 + W + 25, `${Lt}`);
    dimV(y0, y0 + W, 0, -25, `${W}`);
    dimV(y0, y0 + lip + t, Lt, Lt + 18, `${lip + t}`);
    dimH(75, 75 + P.baseSlotPitch, y0, y0 - 18, `${P.baseSlotPitch}`);
    T(0, y0 + W + 55, 12, 'A) UST GORUNUS - KAPAKSIZ  (200 x 40 perfore kablo tavasi, L = ' + Lt + ' mm)');
    T(0, y0 + W + 40, 7, `Taban perforesi ${P.baseSlotL}x${P.baseSlotW} oval, adim ${P.baseSlotPitch}, 3 sira (eksen, +-${Math.abs(P.baseSlotRows[0])}), sira kaydirmali. Uclarda ek delikleri O${P.jointHoleD}.`);
  }

  // =========================================================================
  // B) ÜST GÖRÜNÜŞ - KAPAKLI   (y: -400 .. -400 + Wc)
  // =========================================================================
  {
    const y0 = -400, yc = y0 + Wc / 2;
    R(0, y0, Lt, Wc, 'KAPAK');                       // kapak dış hat
    L(0, y0 + tc, Lt, y0 + tc, 'GIZLI');             // kapak eteği iç yüzü
    L(0, y0 + Wc - tc, Lt, y0 + Wc - tc, 'GIZLI');
    const ty0 = yc - W / 2;                          // tava dış yüzü (gizli)
    L(0, ty0, Lt, ty0, 'GIZLI');
    L(0, ty0 + W, Lt, ty0 + W, 'GIZLI');
    L(0, ty0 + lip + t, Lt, ty0 + lip + t, 'GIZLI');
    L(0, ty0 + W - lip - t, Lt, ty0 + W - lip - t, 'GIZLI');
    L(-20, yc, Lt + 20, yc, 'EKSEN');

    dimH(0, Lt, y0 + Wc, y0 + Wc + 25, `${Lt}`);
    dimV(y0, y0 + Wc, 0, -25, `${Wc}`);
    dimV(ty0, ty0 + W, Lt, Lt + 22, `${W} (tava)`);
    T(0, y0 + Wc + 55, 12, 'B) UST GORUNUS - KAPAKLI  (kapak gorunur, tava duvarlari ve dudaklar gizli cizgi)');
    T(0, y0 + Wc + 40, 7, `Kapak ${Wc} x ${Lt}, sac ${tc} mm, etek ${skirt} mm, tava duvarina ${gap} mm bosluk.`);
  }

  // =========================================================================
  // C) YAN GÖRÜNÜŞ - KAPAKLI   (y: -700 tava tabanı)
  // =========================================================================
  {
    const yb = -700;
    const yTop = yb + H;                             // tava üst kenarı
    const yCovTop = yTop + tc;                       // kapak üstü (dudağa oturur)
    const ySkirt = yCovTop - skirt;                  // kapak eteği alt kenarı
    // Tava yan duvarı: eteğin altında görünür, üstü gizli
    L(0, yb, Lt, yb, 'TAVA');
    L(0, yb, 0, ySkirt, 'TAVA');
    L(Lt, yb, Lt, ySkirt, 'TAVA');
    L(0, ySkirt, 0, yTop, 'GIZLI');
    L(Lt, ySkirt, Lt, yTop, 'GIZLI');
    L(0, yTop, Lt, yTop, 'GIZLI');
    // Kapak eteği
    R(0, ySkirt, Lt, yCovTop - ySkirt, 'KAPAK');
    // Yan duvar perforesi (duvar ortası)
    const ySlot = yb + H / 2 - 3;                    // eteğin altında kalsın
    sidePositions().forEach((x) => slot(x, ySlot, P.sideSlotL, P.sideSlotW));
    jointXs().forEach((x) => C(x, ySlot, P.jointHoleD / 2, 'PERFORE'));

    dimH(0, Lt, yb, yb - 22, `${Lt}`);
    dimV(yb, yTop, Lt, Lt + 18, `${H}`);
    dimV(yb, yCovTop, Lt, Lt + 38, `${H + tc}`);
    dimV(ySkirt, yCovTop, 0, -18, `${skirt}`);
    dimH(P.jointHoleX[0], P.jointHoleX[1], yb, yb - 10, `${P.jointHoleX[1] - P.jointHoleX[0]}`);
    T(0, yCovTop + 40, 12, 'C) YAN GORUNUS - KAPAKLI');
    T(0, yCovTop + 25, 7, `Yan duvar perforesi ${P.sideSlotL}x${P.sideSlotW} oval, adim ${P.sideSlotPitch}. Ek delikleri O${P.jointHoleD}, uctan ${P.jointHoleX.join(' / ')} mm.`);
  }

  // =========================================================================
  // D) ENİNE KESİT - KAPAKLI   (ölçek 1:1, x: -450 bölgesi)
  // =========================================================================
  {
    const ox = -450, oy = -700;                      // tava tabanı sol-alt dış köşe
    // Tava U profili + iç dudaklar (sac kesiti kapalı çokgen)
    PL([
      [ox, oy], [ox + W, oy], [ox + W, oy + H], [ox + W - lip - t, oy + H],
      [ox + W - lip - t, oy + H - t], [ox + W - t, oy + H - t], [ox + W - t, oy + t],
      [ox + t, oy + t], [ox + t, oy + H - t], [ox + lip + t, oy + H - t],
      [ox + lip + t, oy + H], [ox, oy + H],
    ], 'TAVA');
    // Kapak (üst levha + iki etek)
    const cx0 = ox - gap - tc, cy = oy + H;
    PL([
      [cx0, cy + tc - skirt], [cx0 + tc, cy + tc - skirt], [cx0 + tc, cy],
      [cx0 + Wc - tc, cy], [cx0 + Wc - tc, cy + tc - skirt], [cx0 + Wc, cy + tc - skirt],
      [cx0 + Wc, cy + tc], [cx0, cy + tc],
    ], 'KAPAK');
    L(ox + W / 2, oy - 15, ox + W / 2, cy + tc + 15, 'EKSEN');

    dimH(ox, ox + W, oy, oy - 18, `${W}`);
    dimH(cx0, cx0 + Wc, cy + tc, cy + tc + 18, `${Wc}`);
    dimV(oy, oy + H, ox, ox - 20, `${H}`);
    dimV(cy + tc - skirt, cy + tc, ox + W, ox + W + 18, `${skirt}`);
    T(ox, cy + tc + 55, 12, 'D) ENINE KESIT - KAPAKLI (1:1)');
    T(ox, cy + tc + 40, 7, `Tava sac ${t} mm, dudak ${lip} mm ice donuk. Kapak sac ${tc} mm.`);
  }

  // Genel not
  T(0, -820, 10, 'PAFTA 14 : 200 x 40 PERFORE KABLO TAVASI + KAPAK  -  1 birim = 1 mm');
  T(0, -836, 7, 'NOT: Perfore, sac kalinligi, dudak ve etek olculeri tipik degerdir; uretici katalogu ile dogrulanmalidir (generate_tava_200x40_kapakli_dxf.cjs icindeki P blogu).');
  T(0, -850, 7, 'Katmanlar: TAVA, KAPAK, PERFORE, GIZLI, EKSEN, OLCU, METIN.');

  return dxf.toDxfString();
}

if (!fs.existsSync(DIR_MM)) fs.mkdirSync(DIR_MM, { recursive: true });
const out = path.join(DIR_MM, `${FILE_BASE}_mm.dxf`);
const str = generate();
if (/NaN/.test(str)) { console.error('HATA: DXF icinde NaN var'); process.exit(1); }
fs.writeFileSync(out, str, 'utf8');
console.log('Yazildi:', out, `(${(str.length / 1024).toFixed(0)} KB)`);
